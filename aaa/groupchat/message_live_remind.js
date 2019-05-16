/**
 * 创建人:Coding Farmer_2207
 * 创建时间 2018-12-3 10:15:13
 * 创建内容：直播间提醒
 * 
 */

var web_im = require('../func/web_im.js');
var moment = require("moment");
var uuid = require('uuid');

module.exports.run = function (body, pg, redis, msg_type) {
    let f = {};
    let data = { "状态": "正常" };
        f.live_userid = body.主播id;
        f.msgId = uuid.v4();
        f.sendId = 'notice_live';
        f.message = body.消息内容;
        f.liveid = body.直播间id;
        f.time = moment().format('YYYY-MM-DD HH:mm:ss');
    let message = {};
        message.pushData = f.message;
        message.msgId = f.msgId;
        message.sendId = f.sendId;
        message.sessionType = "直播间聊天";
        message.msgType = msg_type == '打赏'? msg_type : "通知";
        message.sendTime = f.time;
        message.message = {"text":f.message,"sendName":"","msg":body.msg||"","people":body.人气值};
        message.groupid = f.liveid;
        message.extra = '';
    let messageStr = JSON.stringify(message);

    if(msg_type != '打赏'){
        let online = web_im.get_online(redis, body.用户账号);
        if (online.code == 1) {
            let socket = web_im.find_socket(online.socketid);
            //发送群全体 提醒消息
            web_im.send_msg_live(socket,messageStr,body.直播间id);
        }
    }else{
        web_im.send_msg_group_s('',messageStr,body.直播间id);
    }
    

    return data;
}