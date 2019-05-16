/**
 * 创建人:Coding Farmer_2207
 * 创建时间 2018-12-3 10:15:13
 * 创建内容：直播消息推送
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
    if (!f.receiveId) {
        res.msg = '直播间id不能为空';
        body.ack(res);
        return;
    }
    if (!body.socket.userid) {
        res.msg = '认证已失效,请重新认证';
        body.ack(res);
        return;
    }
    let receiveIds = f.receiveId.split("-");
    f.groupid = receiveIds[1];
    f.msgId = uuid.v4();
    f.time = moment().format('YYYY-MM-DD HH:mm:ss');
    //获取用户昵称、头像信息
    let resdata = selUserInfo(pg, f);
    let message = {};
        message.pushData = f.message;
        message.msgId = f.msgId;
        message.sendId = f.sendId;
        message.sessionType = "直播间聊天";
        message.msgType = "文本";
        message.sendTime = f.time;
        message.message = {"text":f.message,"sendName":f.sendName};
        message.groupid = receiveIds[0];
        message.extra = "";
    let callParam = {};
        callParam.msg = '发送成功';
    let messageStr = JSON.stringify(message);
    //发送群聊消息
    web_im.send_msg_live(body.socket,messageStr,receiveIds[0]);
    //封装用户发送信息后,回调给前端的参数
    callParam.msgId = f.msgId;
    callParam.sendTime = f.time;
    callParam.groupid = receiveIds[0]; //群id
    callParam.msgIdFse = f.msgIdFse;
    body.ack(callParam);
    return;
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

    sql = `select t1.群昵称,t1.用户账号,t2.头像,t1.是否禁言 from 群_群成员表 t1 left join 会员资料表 T2 on t2.账号 = t1.用户账号  where t1.用户账号 = $1 and t1.群id = $2 and t1.状态 = '正常'`;
    let res = pgdb.query(pg, sql,[f.sendId,f.groupid]);
    if (res.状态 != '成功') {
        sel_data.状态 = '网络异常,请稍后再试12';
        return sel_data;
    }
    record = res.数据 || undefined;
    if (record && record.length === 1) {
        f.sendName = record[0].群昵称;
    }
    return sel_data;
}



