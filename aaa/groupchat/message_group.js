/**
 * 创建人:Coding Farmer_2207
 * 创建时间 2018-12-3 10:15:13
 * 创建内容：群聊消息发送
 * 
 */

var web_im = require('../func/web_im.js');
var pgdb = require('../func/pgdb.js');
var moment = require("moment");
var uuid = require('uuid');

module.exports.run = function (body, pg, mo, redis, pg2) {
    let res = {};
    let f = {};
    try {
        if (typeof body.data == 'string') {
            f = JSON.parse(body.data);
        } else {
            f = body.data;
        }
    } catch (e) {
        res.msg = '参数有误';
        body.ack(res);
        return;
    }
    if (!f.sendId) {
        res.msg = '发送人账号不能为空';
        body.ack(res);
        return;
    }
    if (!f.random) {
        res.msg = '发送人随机码不能为空';
        body.ack(res);
        return;
    }
    if (!f.msgType) {
        res.msg = '消息类型不能为空';
        body.ack(res);
        return;
    }
    if (!f.message) {
        res.msg = '发送内容不能为空';
        body.ack(res);
        return;
    }
    if (!f.msgIdFse) {
        res.msg = 'msgIdFse不能为空';
        body.ack(res);
        return;
    }
    if (!f.groupid) {
        res.msg = '群id不能为空';
        body.ack(res);
        return;
    }
    console.log(body.socket.userid);
    if (!body.socket.userid) {
        res.msg = '认证已失效,请重新认证';
        body.ack(res);
        return;
    }

    let groupids = f.groupid.split("_");

    //判断发送群是否存在关系
    let sql = `select t1.群昵称,t1.用户账号,t2.头像,t1.是否禁言 from 群_群成员表 t1 left join 会员资料表 T2 on t2.账号 = t1.用户账号  where t1.用户账号 = $1 and t1.群id = $2 and t1.状态 = '正常'`;
    let res_s = pgdb.query(pg, sql,[f.sendId,groupids[0]]);
    if (res_s.状态 != '成功') {
        res.msg = '网络异常,请稍后再试12';
        body.ack(res);
        return;
    }
    if (!res_s.数据 || res_s.数据.length == 0) {
        res.msg = '您不是该群成员，无法发送消息';
        body.ack(res);
        return;
    }
    if(res_s.数据[0].是否禁言 == "是"){
        res.msg = '群主已开启全员禁言';
        body.ack(res);
        return;
    }
    f.msgId = uuid.v4();
    f.time = moment().format('YYYY-MM-DD HH:mm:ss');
    f.sendName = res_s.数据[0].群昵称;
    f.portrait = res_s.数据[0].头像;

    let message = spliceMessage(f);  //封装消息体
    let callParam = {};
    callParam.msg = '发送成功';

    let resOffLineMessage = offLineMessage(pg, message);
    //消息录入数据库失败 
    if (resOffLineMessage.状态 != '成功' || !resOffLineMessage.数据 || resOffLineMessage.数据.length == 0) {
        callParam.msg = '发送失败';
        body.ack(callParam);
        return;
    }
    //记录最新的消息id
    let sql_up = `update 会员表 set 群消息id = ${resOffLineMessage.数据[0].id} where 账号 = '${f.sendId}' and  (群消息id < ${resOffLineMessage.数据[0].id} or 群消息id is null)`;
    let res_up = pgdb.query(pg, sql_up);
    if (res_up.状态 != '成功') {
        callParam.msg = '发送失败';
        body.ack(res);
        return;
    }
    message.maxid = resOffLineMessage.数据[0].id;//最新消息id
    message.groupid = f.groupid; //群id
    let messageStr = JSON.stringify(message);
    //发送群聊消息


    web_im.send_msg_group(body.socket,messageStr,groupids[0]);
    //封装用户发送信息后,回调给前端的参数
    callParam.msgId = f.msgId;
    callParam.sendTime = f.time;
    callParam.groupid = f.groupid; //群id
    callParam.msgIdFse = f.msgIdFse;
    body.ack(callParam);
    return;
}

/**
 * 发送离线消息
 * @param pg
 * @param f
 * @returns {*|undefined}
 */
let offLineMessage = (pg, f) => {
    let message = JSON.stringify(f.message);
    let sql = `INSERT INTO 群_群聊消息表 (消息id,群id, 发送账号, 消息类型, 发送时间, 消息内容, 状态, 录入人, 录入时间) 
        VALUES ('${f.msgId}','${f.groupid.split("_")[0]}','${f.sendId}','${f.msgType}','${f.sendTime}','${message}','正常','系统','${f.sendTime}') returning id`;
    let res = pgdb.query(pg, sql);
    return res;
}

//消息对象封装
let spliceMessage = f => {
    // 处理消息体内容(文本/图片/语音)
    let mes = {};
    // 消息体
    let meg = {};
    if (f.msgType == '文本') {
        mes.text = f.message.replace(/'/g, "''");
        meg.pushData = (mes.text).replace(/'/g, "''");
    } else {
        mes = f.message;
        meg.pushData = '[' + f.msgType + ']';
    }

    
    meg.msgId = f.msgId; 	//新消息id
    meg.sendId = f.sendId; // 发送人
    meg.sessionType = '群聊'; // 类别
    meg.msgType = f.msgType; // 例如：图文/文本
    meg.sendTime = f.time; //当前时间
    meg.message = mes; //消息内容
    meg.groupid = f.groupid; //群id
    meg.sendName = f.sendName || ''; //发送者名称
    meg.portrait = f.portrait || ''; //发送者头像
    meg.extra = f.extra || ''; //附加内容-备用
    return meg;
}
