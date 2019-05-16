/**
 * 创建人:Coding Farmer_2207
 * 创建时间 2018-12-3 10:15:13
 * 创建内容：私聊消息发送 (私聊/加群通知/好友通知)
 * 
 */

var web_im = require('../func/web_im.js');
var pgdb = require('../func/pgdb.js');
var moment = require("moment");
var uuid = require('uuid');

module.exports.run = function (body, pg, redis, msg_type) {
    console.log("message_user message_user message_user message_user message_user");
    let f = {};
    let data = { "状态": "正常" };
    if (!msg_type) {
        data.状态 = '消息类型不能为空';
        return data;
    } else if (msg_type == '好友通知' || msg_type == '群通知') {
        /***************************************好友申请通知/群通知*****************************************/
        f.sendId = body.用户账号;
        f.receiveId = body.好友用户账号;
        f.message = body.消息内容;
        f.text = body.验证消息 || '';
        f.msgType = '文本';
        f.time = moment().format('YYYY-MM-DD HH:mm:ss');
        f.msgId = uuid.v4();
        f.msg_type = msg_type;
        f.extra = {'id':body.好友操作id};
        //获取用户昵称、头像信息
        let resdata = selUserInfo(pg, f);
        if (resdata.状态 != '成功') {
            data.状态 = '网络异常,请稍后再试1';
            return data;
        }

        let message = spliceMessage(f);  //封装消息体
        let message_s = JSON.parse(JSON.stringify(message));
        message_s.sendId = f.sendId;
        let resOffLineMessage = offLineMessage(pg, message_s,msg_type);
        //消息录入数据库失败 
        if (!resOffLineMessage || resOffLineMessage != 1) {
            data.状态 = '发送失败';
            return data;
        }

        //检查聊天对象是否在线
        let online = web_im.get_online(redis, f.receiveId);
        if (online.code == 1) {
            let socket = web_im.find_socket(online.socketid);
            let messageStr = JSON.stringify(message);
            if (socket) {
                //发送私聊消息
                var result = web_im.send_system_user(socket, messageStr);
                if (result.code != -1) {
                    let msid = message.msgId;
                    let time = moment().format('YYYY-MM-DD HH:mm:ss');
                    let sql = `UPDATE 群_单聊消息表 SET 消息签收 = '是', 接收时间 = '${time}'
                            WHERE 消息id = '${msid}'`;
                    let record = pgdb.query(pg, sql).影响行数 || undefined;
                }
            }
        }
        /***************************************好友申请通知/群通知end*****************************************/
    } else {
        data.状态 = '消息类型不正确';
        return data;
    }
    return data;
}

/**
 * 发送离线消息
 * @param pg
 * @param f
 * @returns {*|undefined}
 */
let offLineMessage = (pg, f,msg_type) => {
    console.log('+++++++++++++++++++++++++');
    console.log(f);
    console.log(msg_type);
    let message = JSON.stringify(f.message);
    let sql = `INSERT INTO 群_单聊消息表 (消息id, 消息类型, 会话类型, 发送账号, 发送时间, 消息内容, 接收账号, 接收时间, 状态, 消息签收, 录入人, 录入时间) 
        VALUES ('${f.msgId}','${f.msgType}','${msg_type}','${f.sendId}','${f.sendTime}','${message}','${f.receiveId}','','正常','否','系统','${f.sendTime}')`;
    let res = pgdb.query(pg, sql).影响行数 || undefined;
    return res;
}



//消息对象封装
let spliceMessage = f => {
    // 处理消息体内容(文本/图片/语音)
    let mes = {};
    // 消息体
    let meg = {};
    if (f.msgType == '文本') {
        mes.text = f.text.replace(/'/g, "''");
        mes.pushData = f.message.replace(/'/g, "''");
        meg.pushData = (mes.pushData).replace(/'/g, "''");
    } else {
        mes = f.message;
        meg.pushData = '[' + f.msgType + ']';
    }
    
    meg.msgId = f.msgId; 	//新消息id
    if(f.msg_type == "群通知"){
        meg.sendId = "notice_group"; // 发送人
    }else if(f.msg_type == "好友通知"){
        meg.sendId = "notice_friend"; // 发送人
    }
    
    meg.receiveId = f.receiveId; // 接收人
    meg.sessionType = f.msg_type; // 类别
    meg.msgType = f.msgType; // 例如：图文/文本
    meg.sendTime = f.time; //当前时间
    meg.message = mes; //消息内容
    meg.sendName = f.sendName || ''; //发送者名称
    meg.portrait = f.portrait || ''; //发送者头像
    meg.receiveName = f.receiveName || ''; //接收者名称
    meg.receivePortrait = f.receivePortrait || ''; //接收者头像
    meg.extra = f.extra || ''; //附加内容-备用
    return meg;
}


/**
 * 根据账号查询发送人和接收人信息（主要为PC客户端使用）
 * @param pg
 * @param message
 * @returns {*}
 */
let selUserInfo = (pg, f) => {
    let sel_data = { "状态": "成功" };
    //昵称、头像信息（
    let sql = '', record = {};
    //-----发送者------


    sql = `SELECT T1.昵称, T2.头像 FROM 会员表 T1 LEFT JOIN 会员资料表 T2 ON T1.账号 = T2.账号 WHERE T1.账号 = '${f.sendId}'`;
    let res = pgdb.query(pg, sql);
    if (res.状态 != '成功') {
        sel_data.状态 = '网络异常,请稍后再试12';
        return sel_data;
    }
    record = res.数据 || undefined;
    if (record && record.length === 1) {
        f.sendName = record[0].昵称;
        f.portrait = record[0].头像;
    }



    //-----接收者------

    sql = `SELECT T1.昵称, T2.头像 FROM 会员表 T1 LEFT JOIN 会员资料表 T2 ON T1.账号 = T2.账号 WHERE T1.账号 = '${f.receiveId}'`;
    let res_js = pgdb.query(pg, sql);
    if (res_js.状态 != '成功') {
        sel_data.状态 = '网络异常,请稍后再试15';
        return sel_data;
    }
    record = res_js.数据 || undefined;
    if (record && record.length === 1) {
        f.receiveName = record[0].昵称;
        f.receivePortrait = record[0].头像;
    }

    return sel_data;
}