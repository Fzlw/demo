var web_im = require('../func/web_im.js');
var cipher = require('../func/cipher.js');
var config = require('../func/config.js');
var mongo = require('../func/mongo.js');
var pgdb = require('../func/pgdb.js');
var moment = require("moment");
var redisdb = require('../func/redisdb.js');
var uuid = require('uuid');

var conf = config.get('app');

module.exports.run = function(body, pg, mo, redis, pg2) {

    console.log(body.channel + " channel-----");

    //1.channel： singlechat
    if (body.channel == 'singlechat') {

        //通过频道从其他服务器或者进程推送过来的数据 receiveId
        let message = {};
        try {
            message = JSON.parse(body.message)
        } catch(e) {
            console.log('频道消息解析出错', e.message);
        }

        let online = web_im.get_online(redis, message.receiveId);

        if (online.code == 1) { //在线--->>>查找到当前socket并发送消息

            let socket = web_im.find_socket(online.socketid);
            if (socket) {
                //发送私聊消息
                console.log('你发送的消息socket在我的进程里，我要执行发送消息啦啦啦啦啦啦啦啦啦啦啦啦啦啦啦啦啦啦');
                var result = web_im.send_message(socket, body.message);
                if (result.code != -1) {
                    console.log('================longqi channel单聊回调=====================')
                    console.log(body.message);
                    let message = JSON.parse(body.message) 
                    let sendId = message.sendId + "_";
                    let sendIds = sendId.split("_");
                    let receiveId = message.receiveId + "_";
                        let receiveIds= receiveId.split("_");
                        let table = '';
                    if (sendIds[1] == 'service' || receiveIds[1] == 'service') { //如果是客服,则从客服表查询离线消息
                        table = 'im_客服表';
                    } else { //如果是非客服,则从单聊查询离线消息
                        table = 'im_单聊表';
                    }
                
                    let time = moment().format('YYYY-MM-DD HH:mm:ss');
                    let sql = `UPDATE ${table} SET 状态 = '已接收', 接收时间 = '${time}'
                        WHERE 消息id = '${message.msgId}'`;
                    let record = pgdb.query(pg, sql).影响行数 || undefined;
                    console.log(sql);
                }	
            }

        }
    }


    //2.channel: system
    if (body.channel == 'system') {

        //通过频道从其他服务器或者进程推送过来的数据 receiveId
        let message = {};
        try {
            message = JSON.parse(body.message)
        } catch(e) {
            console.log('频道消息解析出错', e.message);
        }

        let online = web_im.get_online(redis, message.receiveId);

        if (online.code == 1) { //在线--->>>查找到当前socket并发送消息

            let socket = web_im.find_socket(online.socketid);
            if (socket) {
                //发送私聊消息
                console.log('你发送的消息socket在我的进程里，我要执行发送消息啦啦啦啦啦啦啦啦啦啦啦啦啦啦啦啦啦啦');
                web_im.send_system(socket, body.message);
            }

        }

    }
	
	if(body.channel == 'status') {
		let message = {};
        try {
            message = JSON.parse(body.message)
        } catch(e) {
            console.log('频道消息解析出错', e.message);
        }
		
		let online = web_im.get_online(redis, message.receiveId);

        if (online.code == 1) { //在线--->>>查找到当前socket并发送消息
            let socket = web_im.find_socket(online.socketid);
            if (socket) {
                //发送私聊消息
                console.log(message.receiveId + '发送状态啦啦啦啦啦了，我要执行发送消息啦啦啦啦啦啦啦啦啦啦啦啦啦啦啦啦啦啦');
                web_im.connect_status(socket, body.message);
				web_im.set_online(redis,message.receiveId,'','去死吧',0);
				console.log('删除------------------' + message.receiveId);
            }
			
        }
	}


}
