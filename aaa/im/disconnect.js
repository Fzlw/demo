var cipher = require('../func/cipher.js');
var moment = require("moment");
var redisdb = require('../func/redisdb.js');

var web_im = require('../func/web_im.js');

module.exports.run = function(body,pg,mo,redis,pg2){

	var data = {};

	if(body.socket.userid == undefined){
		console.log('用户未认证');
		return data;
	}
	



	//设置在线状态    ---- 最后的0 代表客户已断开。

    let time = moment().format('YYYY-MM-DD HH:mm:ss');
	// body.socket.userid 是传过来的值，除此之外还传了什么？
	//console.log(body.socket.id);
	let redata = redisdb.get(redis,body.socket.userid);
	redata = JSON.parse(redata);
	//确保是同一个socket请求断开的，因为会出现redis中socketid是不同值
	console.log("客户端断开连接啦！！！！！！！！！！");
	console.log(redata);
	if(redata){
		if(redata.socketid == body.socket.id){
			var result = web_im.set_online(redis,body.socket.userid,body.socket.id,'断开时间：'+time,0);
			if (result.code == 1) {
				console.log(body.socket.userid + '用户下线');
			}
			delete body.socket.userid;
			delete body.socket.random;
		}else{
			console.log('===================================')
			console.log('没有断开');
			// 这里是断线的那个socket还没有退出，当退出的时候调用disconnect，这时传来的是同一个账号，会把正常在线的挤下来，其实应该自己掉了
		}
	}else{
		console.log('===================================')
		console.log('数据库里没有值');
	}
	

	// return data;

}