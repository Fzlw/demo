/**
 * 创建人:@anime
 * 创建时间：2018-5-8 15:36:17
 * 创建内容：用户断开连接
 */

var pgdb = require('../func/pgdb.js');
var web_im = require('../func/web_im.js');
var moment = require("moment");
var uuid = require('uuid');
// var redisdb = require('../func/redisdb.js');

module.exports.run = function (body, pg, mo, redis, pg2) {
	let f = body;	//获取传输的数据
	let data = { "状态": "成功" };
	let time_break = f.time || '0';

	let service = web_im.get_online(redis, f.services + '_service');
	if (service.code == 1) {
		let socket = web_im.find_socket(service.socketid);
		let messageStr = JSON.stringify({ "userid": f.userid });
		//发送私聊消息提醒用户已断开
		web_im.user_break(socket, messageStr);
	}
	if (time_break == '1') {
		console.log("saassssssssssssssssssssssssssssssssssssss");
		let user_service = web_im.get_online(redis, f.userid);
		if (user_service.code == 1) {
			let user_socket = web_im.find_socket(user_service.socketid);
			// 消息体
			let meg = {};
			meg.pushData = '由于您长时间未进行回复,客服服务已自动断开,如果有问题请重新发送消息等待客服回复,给您带来的不便敬请谅解。'; //消息提示
			meg.msgId = uuid.v4(); 	//新消息id
			meg.sendId = f.z_service+'_service'; // 发送人
			meg.receiveId = f.userid; // 接收人
			meg.sessionType = '单聊'; // 类别
			meg.msgType = '文本'; // 例如：图文/文本
			meg.sendTime = moment().format('YYYY-MM-DD HH:mm:ss'); //当前时间
			meg.message = { 'text': '由于您长时间未进行回复,客服服务已自动断开,如果有问题请重新发送消息等待客服回复,给您带来的不便敬请谅解。' }; //消息内容
			meg.extra = ''; //附加内容-备用
			meg.sendName = ''; //发送者名称
			meg.portrait = ''; //发送者头像
			meg.receiveName = ''; //接收者名称
			meg.receivePortrait = ''; //接收者头像
			let messageStr = JSON.stringify(meg);
			//发送私聊消息提醒用户已断开
			web_im.send_message(user_socket, messageStr);
		}
	}

	return data;
}