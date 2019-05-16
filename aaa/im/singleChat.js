/**
 * 创建人:Coding Farmer_2207
 * 创建时间：2018-5-8 15:36:17
 * 创建内容：消息单聊 （用户<->商家）(用户/商家<->客服)



 */
var web_im = require('../func/web_im.js');
var pgdb = require('../func/pgdb.js');
var config = require('../func/config.js');
var moment = require("moment");
var uuid = require('uuid');
var conf = config.get('app');

var redisdb = require('../func/redisdb.js');

module.exports.run = function (body, pg, mo, redis, pg2) {

    //##############################业务代码###############################
    let f = {};
    let res = {};
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
    if (!f.receiveId) {
        res.msg = '接收人账号不能为空';
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
    if (!body.socket.userid) {
        res.msg = '认证已失效,请重新认证';
        body.ack(res);
        return;
    }

    //新消息id
    f.msgId = uuid.v4();
    //当前时间
    f.time = moment().format('YYYY-MM-DD HH:mm:ss');


    //获取用户昵称、头像信息
    let resdata = selUserInfo(pg, f);
    if (resdata.状态 != '成功') {
        res.msg = '网络异常,请稍后再试1';
        body.ack(res);
        return;
    }

    let receive_id_bd = f.receiveId; //当前接收者账号
    let send_id_bd = f.sendId;      //当前发送者账号


    //#######拦截用户对客服非工作时段及非在线的单聊###########
    let receiveId = f.receiveId + "_";
    let receiveIds = receiveId.split("_");


    //封装消息对象
    let message = spliceMessage(f);
    let noWorkInfo_list = [];
    if (receiveIds[1] == 'service') {//接收对象是客服的时候 
        //自动回复
        let hf_sql = `select 回复内容 from 客_常见问题回复表 where '${f.message}' like '%'||关键字||'%'`;
        let hf_data = pgdb.query(pg, hf_sql);
        if (hf_data.状态 != '成功') {
            res.msg = '网络异常,请稍后再试2';
            body.ack(res);
            return;
        }
        noWorkInfo_list = hf_data.数据 || [];
    }

    let sendId_two = f.sendId + "_"; //普通用户: 13344445555; 商家用户: 13344445555_商家; 客服: 13344445555_service
    let sendIds_two = sendId_two.split("_");

    //判断客户聊天对象
    if (receiveIds[1] == 'service' && f.权限 == '1' && sendIds_two[1] != 'service') {//接收对象为总客服  判断是否接入子客服
        let sql_s11 = `select id,客服接入状态,接入客服,状态 from 客_客服接入表 where 发送者 = '${f.sendId}' and 类别 = '${f.类别}' and 录入时间 like '%${moment().format('YYYY-MM-DD')}%' and 状态 = '正常' order by id desc LIMIT 1`;
        let s11_data = pgdb.query(pg, sql_s11);
        if (s11_data.状态 != '成功') {
            res.msg = '网络异常,请稍后再试3';
            body.ack(res);
            return;
        }
        if (s11_data.数据 && s11_data.数据.length > 0 && s11_data.数据[0].客服接入状态 == '已接入') {
            f.receiveId = s11_data.数据[0].接入客服 + '_service';
            selUserInfo(pg, f);//重新获取头像
            receiveId = f.receiveId + "_";
            receiveIds = receiveId.split("_");
        } else {
            let mm = {};
            if (s11_data.数据 && s11_data.数据.length > 0) {
                mm = waitfor(pg, f, redis, 'upd', s11_data.数据[0].id);
            } else {
                mm = waitfor(pg, f, redis, 'add', '');

                let noWorkInfo = '正在为您接通客服,请稍后...问题越详细,越有助于接通客服哟';
                //反转消息体  自动回复给消息发送者当前的客服状态
                const { sendId: receiveId, sendName: receiveName, portrait: receivePortrait, receiveId: sendId, receiveName: sendName, receivePortrait: portrait, sendTime, msgType, sessionType } = message;
                let revertMsg = { sendId, sendName, portrait, receiveId, receiveName, receivePortrait, sendTime, msgType, sessionType };
                revertMsg.msgType = '文本';
                revertMsg.message = { text: noWorkInfo };
                revertMsg.pushData = noWorkInfo;
                revertMsg.msgId = uuid.v4();
                //等自己的消息发送出去后才让前台触发message事件
                setTimeout(() => {
                    web_im.send_system(body.socket, JSON.stringify(revertMsg));
                }, 500);
            }
            if (mm.状态 != '成功') {
                res.msg = '网络异常,请稍后再试4';
                body.ack(res);
                return;
            }
            if (mm.客服 == '不在线') {
                //2018-08-31 新增自定义快捷回复
                let nowTime = (f.time).substring(11, 19);
                let nowWeekDay = new Date().getDay();
                let noWorkTime = nowWeekDay == 0 || nowTime < '09:00:00' || nowTime > '21:45:00' || (nowTime > '12:00:00' && nowTime < '13:30:00');
                let noWorkInfo = '';
                if (noWorkTime) { //非工作时间
                    noWorkInfo = '您好，非常高兴为您服务！我们的服务时间是：周一至周六，上午9：00~12：00；下午13：30~17：45；请在客服工作时间进行咨询哦~';
                }

                //反转消息体  自动回复给消息发送者当前的客服状态
                const { sendId: receiveId, sendName: receiveName, portrait: receivePortrait, receiveId: sendId, receiveName: sendName, receivePortrait: portrait, sendTime, msgType, sessionType } = message;
                let revertMsg = { sendId, sendName, portrait, receiveId, receiveName, receivePortrait, sendTime, msgType, sessionType };
                revertMsg.msgType = '文本';

                if (noWorkInfo == '' && noWorkInfo_list && noWorkInfo_list.length > 0) {//客服不在线 发送快捷回复
                    noWorkInfo_list.forEach(noWorkInfo_data => {
                        revertMsg.message = { text: noWorkInfo_data.回复内容 };
                        revertMsg.pushData = noWorkInfo_data.回复内容;
                        revertMsg.msgId = uuid.v4();
                        let resmsg = JSON.parse(JSON.stringify(revertMsg)); //对象深拷贝
                        setTimeout(() => {
                            web_im.send_system(body.socket, JSON.stringify(resmsg));
                        }, 500);
                    });
                } else if (noWorkInfo) {
                    revertMsg.message = { text: noWorkInfo };
                    revertMsg.pushData = noWorkInfo;
                    revertMsg.msgId = uuid.v4();
                    //等自己的消息发送出去后才让前台触发message事件
                    setTimeout(() => {
                        web_im.send_system(body.socket, JSON.stringify(revertMsg));
                    }, 500);
                }
                let callBack = {
                    msg: '发送成功',
                    msgId: f.msgId,
                    receiveId: receive_id_bd,
                    sendTime: f.time,
                    msgIdFse: f.msgIdFse
                };
                body.ack(callBack);
                return;

            } else {
                let callParam = {};
                callParam.msg = '发送成功';
                //封装用户发送信息后,回调给前端的参数
                callParam.msgId = f.msgId;
                callParam.receiveId = receive_id_bd;
                callParam.sendTime = f.time;
                callParam.msgIdFse = f.msgIdFse;
                body.ack(callParam);
                return;
            }
        }
    }
    if (sendIds_two[1] == 'service' && receiveIds[1] != 'service') {//如果是客服给用户发消息 那么发送者则成为主客服
        let kf_sql = `select 账号 from 客_客服表 where 类别 = '${f.发送客服类别}' and 权限 = '1'`;
        let kf_data = pgdb.query(pg, kf_sql);
        if (kf_data.状态 != '成功') {
            res.msg = '网络异常,请稍后再试5';
            body.ack(res);
            return;
        }
        //查询用户是否已经结束会话
        let sql_s12 = `select id,状态 from 客_客服接入表 where 发送者 = '${f.receiveId}' and 类别 = '${f.发送客服类别}' and 接入客服 = '${sendIds_two[0]}' and 录入时间 like '%${moment().format('YYYY-MM-DD')}%'  order by id desc LIMIT 1`;
        let s12_data = pgdb.query(pg, sql_s12);
        console.log("****************************************************");
        console.log(s12_data);
        if(s12_data.状态 != '成功'){
            res.msg = '网络异常,请稍后再试5';
            body.ack(res);
            return;
        }
        if(s12_data.数据[0].状态 == '已完成'){
            res.msg = '用户已经断开连接';
            body.ack(res);
            return;
        }
        f.sendId = kf_data.数据[0].账号 + '_service';
    }

    message = spliceMessage(f);

    //##############################业务代码###############################


    //检查聊天对象是否在线
    let online = web_im.get_online(redis, f.receiveId);
    let callParam = {};
    callParam.msg = '发送成功';
    // ----------------lonqqi 修改 先插入表 等前台返状态再更改其接受状态------------
    //若不在线,则直接存表
    let sendId = message.sendId + "_"; //普通用户: 13344445555; 商家用户: 13344445555_商家; 客服: 13344445555_service
    let sendIds = sendId.split("_");
    let table = '';
    if (sendIds[1] == 'service' || receiveIds[1] == 'service') { //如果是客服,则从客服表查询
        table = 'im_客服表';
    } else { //如果是非客服,则从单聊查询
        table = 'im_单聊表';
    }

    let resOffLineMessage = offLineMessage(pg, message, table);
    //消息录入数据库失败 
    if (!resOffLineMessage || resOffLineMessage != 1) {
        callParam.msg = '发送失败';
        body.ack(callParam);
        return;
    }


    if (online.code == 1) {
        //若在线,则查找socket对象
        console.log('===================longqi 单聊==================')
        let socket = web_im.find_socket(online.socketid);
        let messageStr = JSON.stringify(message);
        if (socket == null) {
            //如果找不到就尝试发布频道从其他进程的中寻找socket对象
            redisdb.publish(redis, conf.redis.web_imChannelList[1], messageStr);
        } else {
            //发送私聊消息
            var result = web_im.send_message(socket, messageStr);
            console.log(result);
            if (result.code != -1) {
                console.log('================longqi 单聊回调=====================')
                console.log(result);
                let msid = message.msgId;
                let time = moment().format('YYYY-MM-DD HH:mm:ss');
                let sql = `UPDATE ${table} SET 状态 = '已接收', 接收时间 = '${time}'
                           WHERE 消息id = '${msid}'`;
                let record = pgdb.query(pg, sql).影响行数 || undefined;
                console.log('=======更改状态==========', sql);
            }
            if (receiveIds[1] == 'service' && noWorkInfo_list && noWorkInfo_list.length > 0) {//接收对象为客服 并且有快捷回复的情况

                //反转消息体  自动回复给消息发送者常见问题回复  并且以客服身份给客服发一条
                const { sendId: receiveId, sendName: receiveName, portrait: receivePortrait, receiveId: sendId, receiveName: sendName, receivePortrait: portrait, sendTime, msgType, sessionType } = message;
                let revertMsg = { sendId, sendName, portrait, receiveId, receiveName, receivePortrait, sendTime, msgType, sessionType };
                revertMsg.msgType = '文本';

                let revertMsg_t = JSON.parse(messageStr);
                noWorkInfo_list.forEach(noWorkInfo_data => {
                    revertMsg.message = { text: noWorkInfo_data.回复内容 };
                    revertMsg.pushData = noWorkInfo_data.回复内容;
                    revertMsg.msgId = uuid.v4();
                    let resmsg = JSON.parse(JSON.stringify(revertMsg)); //对象深拷贝
                    resmsg.sendId = receive_id_bd;   //因为前端触发了快捷回复  消息反转了   所以这个时候要把发送人转换为主客服  也就是前端传过来的账号

                    setTimeout(() => {//给用户发
                        web_im.send_system(body.socket, JSON.stringify(resmsg));
                    }, 500);

                    revertMsg_t.message = { text: noWorkInfo_data.回复内容 };
                    revertMsg_t.pushData = noWorkInfo_data.回复内容;
                    revertMsg_t.msgId = uuid.v4();
                    revertMsg_t.zdhf = '1';
                    let resmsg2 = JSON.parse(JSON.stringify(revertMsg_t)); //对象深拷贝
                    web_im.send_system(socket, JSON.stringify(resmsg2));
                });
            }
        }
    }


    //封装用户发送信息后,回调给前端的参数
    callParam.msgId = f.msgId;
    callParam.receiveId = receive_id_bd;
    callParam.sendTime = f.time;
    callParam.msgIdFse = f.msgIdFse;
    body.ack(callParam);
    return;
};


/**
 * 处理用户还未接入客服的情况
 * @param pg
 * @param f
 * @param redis 
 * @returns {*|undefined}
 */
let waitfor = (pg, f, redis, state, id) => {
    let data = { "状态": "成功", "客服": "不在线" };
    //获取当前所有客服的信息
    // let sql = `select 账号 from 客_客服表 where 类别 = '${f.客服类别}'`;
    let sql = `select 账号 from 客_客服表 where 类别 = '${f.类别}'`;
    let res = pgdb.query(pg, sql);
    if (res.状态 != '成功') {
        data.状态 = '网络异常,请稍后再试6';
        return data;
    }
    if (!res.数据 || res.数据.length == 0) {
        data.状态 = '无客服在线';
        return data;
    }
    let mes = JSON.parse(JSON.stringify(f));//对象深拷贝
    let message = spliceMessage(mes);
    for (let i = 0; i < res.数据.length; i++) {
        const ele = res.数据[i];
        let service = web_im.get_online(redis, ele.账号 + '_service');
        //给所有在线客服发消息
        if (service.code == 1) {
            data.客服 = '在线';
            //封装消息体
            message.receiveId = ele.账号 + '_service'; //接收id为各个客服
            let socket = web_im.find_socket(service.socketid);
            let messageStr = JSON.stringify(message);
            //发送私聊消息
            web_im.send_message(socket, messageStr);
        }
    }
    if (state == 'add') {
        sql = `insert into 客_客服接入表(消息id, 发送者, 发送者名称, 消息类型, 消息内容, 客服接入状态, 接入客服, 接入客服名称, 接入时间, 状态,录入时间,类别) values('${f.msgId}','${f.sendId}','${f.sendName}','${f.msgType}','${JSON.stringify(message)}','未接入','','','','正常','${f.time}','${f.类别}') returning id`;
        res = pgdb.query(pg, sql);
        if (res.状态 != '成功') {
            data.状态 = '网络异常,请稍后再试7';
            return data;
        }
        id = res.数据[0].id;
    } else {
        // sql = `update 客_客服接入表 set 消息类型 = '${f.msgType}',消息内容='${JSON.stringify(message)}' where id = ${id}`;
        // res = pgdb.query(pg, sql);
        // if (res.状态 != '成功') {
        //     data.状态 = '网络异常,请稍后再试8';
        //     return data;
        // }
    }
    sql = `insert into 客_客服接入消息记录表 (消息id, 发送者, 发送者名称, 消息类型, 消息内容, 状态, 接入id,录入时间) 
    values('${f.msgId}','${f.sendId}','${f.sendName}','${f.msgType}','${JSON.stringify(message)}','正常',${id},'${f.time}')`;
    res = pgdb.query(pg, sql);
    if (res.状态 != '成功') {
        data.状态 = '网络异常,请稍后再试9';
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
let offLineMessage = (pg, f, table) => {

    let message = JSON.stringify(f.message);
    let sql = `INSERT INTO ${table} (消息id, 发送者, 发送者名称, 接收者, 接收者名称, 会话类型, 消息类型, 消息内容, 发送者头像, 接收者头像, 发送时间, 接收时间, 签收id, 状态, 录入人, 录入时间)
               VALUES ('${f.msgId}','${f.sendId}','${f.sendName}','${f.receiveId}','${f.receiveName}','单聊','${f.msgType}','${message}','${f.portrait}','${f.receivePortrait}','${f.sendTime}','','','未接收','系统','${f.sendTime}')`;
    let res = pgdb.query(pg, sql).影响行数 || undefined;
    return res;
}

/**
 * 常见问题回复消息
 * @param pg
 * @param f
 * @returns {*|undefined}
 */
let offLineMessage_cj = (pg, f, table) => {

    let message = JSON.stringify(f.message);
    let sql = `INSERT INTO ${table} (消息id, 发送者, 发送者名称, 接收者, 接收者名称, 会话类型, 消息类型, 消息内容, 发送者头像, 接收者头像, 发送时间, 接收时间, 签收id, 状态, 录入人, 录入时间)
               VALUES ('${f.msgId}','${f.sendId}','${f.sendName}','${f.receiveId}','${f.receiveName}','单聊','${f.msgType}','${message}','${f.portrait}','${f.receivePortrait}','${f.sendTime}','${f.sendTime}','','已接收','系统','${f.sendTime}')`;
    let res = pgdb.query(pg, sql).影响行数 || undefined;
    return res;
}

/**
 * 用户接收消息,拼装消息体回调给前端
 * @param body
 * @returns {{}}
 */
let spliceMessage = f => {

    // 处理消息体内容(文本/图片/语音)
    let mes = {};

    if (f.msgType == '文本') {
        mes.text = f.message.replace(/'/g, "''");
    } else {
        mes = f.message;
    }

    // 消息体
    let meg = {};
    meg.pushData = f.pushData; //消息提示
    meg.msgId = f.msgId; 	//新消息id
    meg.sendId = f.sendId; // 发送人
    meg.receiveId = f.receiveId; // 接收人
    meg.sessionType = '单聊'; // 类别
    meg.msgType = f.msgType; // 例如：图文/文本
    meg.sendTime = f.time; //当前时间
    meg.message = mes; //消息内容
    meg.extra = ''; //附加内容-备用
    meg.sendName = f.sendName; //发送者名称
    meg.portrait = f.portrait; //发送者头像
    meg.receiveName = f.receiveName; //接收者名称
    meg.receivePortrait = f.receivePortrait; //接收者头像
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
    f.权限 = '0';
    f.类别 = '商城';
    f.发送客服类别 = '商城';
    //昵称、头像信息（客服默认头像）
    let sql = '', record = {};
    //-----发送者------
    let targetSend = f.sendId + '_';  //处理买家用户没有'_'标识
    let sendids = targetSend.split("_");
    if (sendids[1] == 'service') {  //客服
        sql = `SELECT 昵称,权限,类别 FROM 客_客服表 WHERE 账号 = '${sendids[0]}'`;
        let res = pgdb.query(pg, sql);
        if (res.状态 != '成功') {
            sel_data.状态 = '网络异常,请稍后再试10';
            return sel_data;
        }
        record = res.数据 || undefined;
        if (record && record.length === 1) {
            f.sendName = record[0].昵称;
            f.portrait = '';
            f.发送客服类别 = record[0].类别;
        }
    } else if (sendids[1] == '商家') { //商家
        sql = `SELECT t1.店铺名称, t1.店铺图标, T2.头像 FROM 商家店铺表 T1 LEFT JOIN 会员资料表 T2 ON T1.商家账号 = T2.账号 WHERE t1.商家账号 = '${sendids[0]}'`;
        let res = pgdb.query(pg, sql);
        if (res.状态 != '成功') {
            sel_data.状态 = '网络异常,请稍后再试11';
            return sel_data;
        }
        record = res.数据 || undefined;
        if (record && record.length >= 1) {
            f.sendName = record[0].店铺名称;
            f.portrait = record[0].头像;
        }
    } else { //买家或异业商家
        sql = `SELECT T1.角色权限, T1.昵称, T2.头像 FROM 会员表 T1 LEFT JOIN 会员资料表 T2 ON T1.账号 = T2.账号 WHERE T1.账号 = '${sendids[0]}'`;
        let res = pgdb.query(pg, sql);
        if (res.状态 != '成功') {
            sel_data.状态 = '网络异常,请稍后再试12';
            return sel_data;
        }
        record = res.数据 || undefined;
        if (record && record.length === 1) {
            if (record[0].角色权限 == '1') { //异业商家-扩展方便以后维护
                f.sendName = record[0].昵称;
                f.portrait = record[0].头像;
            } else {
                f.sendName = record[0].昵称;
                f.portrait = record[0].头像;
            }
        }
    }


    //-----接收者------
    let targetReceive = f.receiveId + '_';  //处理买家用户没有'_'标识
    let receiveids = targetReceive.split("_");
    if (receiveids[1] == 'service') {  //客服
        sql = `SELECT 昵称,权限,类别 FROM 客_客服表 WHERE 账号 = '${receiveids[0]}'`;
        let res = pgdb.query(pg, sql);
        if (res.状态 != '成功') {
            sel_data.状态 = '网络异常,请稍后再试13';
            return sel_data;
        }
        record = res.数据 || undefined;
        if (record && record.length === 1) {
            f.receiveName = record[0].昵称;
            f.receivePortrait = '';
            f.权限 = record[0].权限;
            f.类别 = record[0].类别;
        }
    } else if (receiveids[1] == '商家') { //商家
        sql = `SELECT t1.店铺名称, t1.店铺图标, T2.头像 FROM 商家店铺表 T1 LEFT JOIN 会员资料表 T2 ON T1.商家账号 = T2.账号 WHERE t1.商家账号 = '${receiveids[0]}'`;
        let res = pgdb.query(pg, sql);
        if (res.状态 != '成功') {
            sel_data.状态 = '网络异常,请稍后再试14';
            return sel_data;
        }
        record = res.数据 || undefined;
        if (record && record.length >= 1) {
            f.receiveName = record[0].店铺名称;
            f.receivePortrait = record[0].头像;
        }
    } else { //用户
        sql = `SELECT T1.角色权限, T1.昵称, T2.头像 FROM 会员表 T1 LEFT JOIN 会员资料表 T2 ON T1.账号 = T2.账号 WHERE T1.账号 = '${receiveids[0]}'`;
        let res = pgdb.query(pg, sql);
        if (res.状态 != '成功') {
            sel_data.状态 = '网络异常,请稍后再试15';
            return sel_data;
        }
        record = res.数据 || undefined;
        if (record && record.length === 1) {
            if (record[0].角色权限 == '1') { //用户
                f.receiveName = record[0].昵称;
                f.receivePortrait = record[0].头像;
            } else {
                f.receiveName = record[0].昵称;
                f.receivePortrait = record[0].头像;
            }
        }
    }
    return sel_data;
}