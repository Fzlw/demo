var web_im = require('../func/web_im.js');
var cipher = require('../func/cipher.js');
var config = require('../func/config.js');
var pgdb = require('../func/pgdb.js');
var moment = require("moment");
var uuid = require('uuid');
var redisdb = require('../func/redisdb.js');


module.exports.run = function(body, pg, mo, redis, pg2) {

    var res = {};

	if(body.socket.userid == undefined){
		//用户未认证;
		body.socket.emit('connectionResult', body.socket.id+'用户未认证11111111111111111111');
        res.code = '-1';
        res.msg = '心跳续时失败：用户未认证';
        body.ack(res);
		return;
	}

    //important!!! 给客户端续时之前先判断是否socketid不一致，若不一致则不进行续时
    let data = redisdb.get(redis,body.socket.userid);
    if (data) {
        let dataObj = JSON.parse(data);
        let socketid = dataObj.socketid || '-1';
        if (socketid == body.socket.id) {
            //设置在线状态    ---- 最后的60为客户端与服务60无心跳进行断线操作。
            let time = moment().format('YYYY-MM-DD HH:mm:ss');
            var result = web_im.set_online(redis,body.socket.userid,body.socket.id,'心跳时间：'+time,60);
            if (result.code == 1) {
                console.log('检测到心跳包,'+body.socket.userid+'延续60s, socketid:'+body.socket.id);
            }
            //给前端返回ack
            res.code = '1';
            res.msg = '心跳续时成功! 用户socketId：' + body.socket.id;
            body.ack(res);
        } else { //数据库socketid和当前socketid不一致说明用户被挤下线
            res.code = '-3';
            res.msg = '心跳续时失败：用户已被挤下线';
            body.ack(res);
        }

    } else { //数据库没有socketid说明用户异常下线
        res.code = '-2';
        res.msg = '心跳续时失败：用户异常下线';
        body.ack(res);
    }


    //
	// if(result.code == 1){
	// 	//成功
	// }
    //
    //
	// //下面是业务代码
    //
    //
    //
    //
    //
    //
	// ///********发送相关代码
    //
    //
	// //查检是否在线
	// var online = web_im.get_online(redis,body.socket.userid);
    //
	// if(online.code == 1){
     //    //查找socket对象
     //    var socket = web_im.find_socket(online.socketid);
    //
	// }
    //
    //
    //
    //
    //
	// if(socket == null){ //如果找不到就尝试发布频道从其他进程的socket中寻找socket对象
    //
    //
	// } else {
	// 	//发送私聊消息
     //    var send = web_im.send_message(socket,'消息内容');
    //
    //
     //    if(send.code == 1 ){
     //        //成功
    //
     //    }
	// }
    //
    //
	// console.log(send);


}