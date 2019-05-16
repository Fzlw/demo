﻿/**pg数据库功能
创建时间：2017-05-06
创建人：吕扶美

更新时间
更新内容：
更新人：

*/
var Fiber = require('fibers');
var pg = require('pg');
var config = require('./config.js');
var logs = require('./logs.js');
var io = require('socket.io');
var redisdb = require('./redisdb.js');
var redis = require("redis");

var conf = config.get('app');
var web_im = {};





//找到socket对象
web_im.find_socket = function(id){
    // console.log(web_im.io.sockets.sockets);
	return web_im.io.sockets.sockets[id];
}

//检查在线
web_im.get_online = function(redis,userid){
  	var result = {};

	// 没开启时退出
	if(conf.redis.使用 != '是'){
		result.code = -1;
		return result;
	}

	// 没有相应数据库退出
	if(redisdb.select(redis,conf.redis.web_imDB) != true){
		result.code = -2;
		return result;
	}

	// 查找相应的userid
	var data = redisdb.get(redis,userid);

	// 没有查询到退出
	if(data == null){
		result.code = -3;
		return result;
	}

	// 解析错误
	try{
		result = JSON.parse(data);
	}catch(e){
		result.code = -4;
		return result;
	}

	// 查询到在redis中存在的相应的数据 才返回1
	result.code = 1;

	return result;
}

//设置在线 
web_im.set_online = function(redis,userid,id,msg,outTime){

    var result = {};

	var data = {};
	data.userid = userid;
	// 可能传空值
	data.socketid = id;
	data.msg = msg;


	if(conf.redis.使用 != '是'){
		result.code = -1;
		return result;
	}

	if(redisdb.select(redis,conf.redis.web_imDB) != true){
		result.code = -2;
		return result;
	}

	var save = redisdb.set(redis,userid,JSON.stringify(data));
	if(save != 'OK'){
		result.code = -3;
		return result;
	}

	// redis中 userid数据的过期时间
	var time = redisdb.expire(redis,userid,outTime);

	result.code = time;
	return result;

}
//发送用户已被接入信息
web_im.jieru_user = function(socket,msg){
	console.log('=================接入信息消息开始发送=========================');
	socket.emit('jieru_user_msg',msg);
}

//发送用户已被接入信息
web_im.user_break = function(socket,msg){
	console.log('=================用户中断连接=========================');
	socket.emit('user_break',msg);
}



//发送私聊消息
web_im.send_message = function(socket,msg){
	var reTrue = false;
    var result = {};
    if(socket == null || socket == undefined || typeof(socket) != 'object'){
    	result.code = -1;
    	return result;
    }

    if(typeof(msg) == 'object'){

    	msg = JSON.stringify(msg);
    }

	// 那到当前的纤程
	var fiber = Fiber.current;

	// 事件触发函数
	var EventEmitter = require('events').EventEmitter; 
	var event = new EventEmitter(); 
	
	// 特意开个线程 否则fiber找不到当前的纤程 暂停2秒 触发纤程执行
	setTimeout(function () {
		result.code = -2;
		event.emit('result'); 
	}, 2000);

	event.on('result', function() { 
		// 关闭所有的监听 强行保证执行一次 once似乎更好
		event.removeAllListeners();
		fiber.run();
	}); 

	// 用纤程发送消息后回调完了再归还调度
	socket.emit('message',msg,function(data){
		result.code = 1;
		result.data = data;
		console.log('========================查看ack情况咯==================================',socket.userid)
		console.log(msg)
		console.log('发送私聊消息中-------------', data, socket.userid);

		// 这一步为什么要用到事件？ 可能是存在无法回调或回调错误 那么这里的回调函数本身就不存在了 无法run() 即找不到工作线程或者没有工作线程 这时候为了避免报错 用到了setTimeout开启工作线程 在2秒之类不回调 强行关掉
		event.emit('result'); 
	});
	
	// 中断此纤程 调度完毕之后进线程池
	Fiber.yield();
	console.log('=================查看ack中result情况咯=========================')
	console.log(result);
	console.log('=================查看ack中result情况咯=========================')
	return result;


}



//发送系统消息
web_im.send_system = function(socket,msg){

    if(socket == null || socket == undefined || typeof(socket) != 'object'){
        console.log('error', '发送消息失败没有获取到socket对象');
    }
    if(typeof(msg) == 'object'){
        msg = JSON.stringify(msg);
    }
    socket.emit('message',msg, function (ack) {
        console.log('发送系统消息中----------', ack , socket.userid);
    });

}


//发送聊天通知 (加群，退群，好友申请,私聊消息)  单聊
web_im.send_system_user = function(socket,msg){
    var result = {};
	if(socket == null || socket == undefined || typeof(socket) != 'object'){
        console.log('error', '发送消息失败没有获取到socket对象');
    }
    if(typeof(msg) == 'object'){
        msg = JSON.stringify(msg);
	}
	// 那到当前的纤程
	var fiber = Fiber.current;
	// 事件触发函数
	var EventEmitter = require('events').EventEmitter; 
	var event = new EventEmitter(); 
	// 特意开个线程 否则fiber找不到当前的纤程 暂停2秒 触发纤程执行
	setTimeout(function () {
		result.code = -2;
		event.emit('result'); 
	}, 2000);
	event.on('result', function() { 
		// 关闭所有的监听 强行保证执行一次 once似乎更好
		event.removeAllListeners();
		fiber.run();
	}); 
	// 用纤程发送消息后回调完了再归还调度
	socket.emit('usermessage',msg,function(data){
		result.code = 1;
		result.data = data;
		console.log('========================群聊系统消息回调==================================',socket.userid)
		event.emit('result'); 
	});
	// 中断此纤程 调度完毕之后进线程池
	Fiber.yield();
	return result;
}


//群聊消息发送 
web_im.send_msg_group = function(socket,msg,roomid){
	if(typeof(msg) == 'object'){
        msg = JSON.stringify(msg);
	}
	console.log("========================群聊消息发送============================="+roomid)
	socket.broadcast.to(roomid).emit('groupmessage',msg);
	// web_im.io.to(roomid).emit('groupmessage',msg);
}

//群聊消息发送 广播消息
web_im.send_msg_group_s = function(socket,msg,roomid){
	if(typeof(msg) == 'object'){
        msg = JSON.stringify(msg);
	}
	console.log("========================群聊消息发送（广播消息）============================="+roomid)
	web_im.io.to(roomid).emit('groupmessage',msg);
}

//直播间消息发送 
web_im.send_msg_live = function(socket,msg,roomid){
	if(typeof(msg) == 'object'){
        msg = JSON.stringify(msg);
	}
	console.log(socket.id);
	console.log("========================直播间消息发送============================="+roomid)
	socket.broadcast.to(roomid).emit('livemessage',msg);
}


web_im.connect_status = function(socket,msg){
	// 判断双开情况，发一条消息给之前的终端
	var result = {};
	console.log('================connect_status===============');
	console.log(msg)
    socket.emit('connect_status',msg, function (ack) {
		result.code = -1;
		result.data = ack;
    });
	return result;
}
 


web_im.listen = function(server){
	web_im.io = io.listen(server);
    io(server,{
        "serveClient": true,
        "transports":['websocket']
    });
}


//channel监听
web_im.listen_channel = function(){

	if(conf.redis.使用 != '是'){
		return;
	}

	var client = redis.createClient(conf.redis.port, conf.redis.host, {});
	// 密码
	client.auth(conf.redis.password,function(err){
		if(err){
			console.log(err)
			console.error("监听web_im channel 认证出错!");
		}
	    // 选择数据库，比如第3个数据库，默认是第0个
	    client.select(conf.redis.web_imDB, function() { 
				client.on('message', function (channel, message) {
				    console.log("监听到频道事件 " + channel + ": " + message);
				    var body = {};
					var time = new Date().getTime();
					body.startTime = time;
					body.func = 'channel';
					body.channel = channel;
					body.message = message;
					var main = require('../im/app_im_main.js');
					var bool = main.searchfile(body.func);
					if (bool) {
						main.index(body);
					} else {
						console.log("暂无 im/[ " + body.func + ".js] ... 文件!")
					}

				});

				for (let i = 0; i < conf.redis.web_imChannelList.length; i++) {
                    client.subscribe(conf.redis.web_imChannelList[i]);
                    console.log('订阅channel: '+conf.redis.web_imChannelList[i]+' 成功!');
				}

	    });

	});
}

///socket监听
web_im.onObject = function(socket){

	socket.on('disconnect', function (data) {
		var body = {};
		body.startTime = new Date().getTime();
		body.func = 'disconnect';
		body.socket = socket;
		var main = require('../im/app_im_main.js');
		// 在工程中查找文件是否存在
		var bool = main.searchfile(body.func);
		if (bool) {
			main.index(body);
		} else {
			console.log("暂无 im/[ " + body.func + ".js] ... 文件!")
		}

	})

	socket.on('auth', function (data,ack) {
		var body = {};
		body.startTime = new Date().getTime();
		body.func = 'auth';
		body.data = data;
		// ack 在客户端emit提交调用auth 传递两个参数，ack是其中之一，在结束接口时回调给客户端，相当于响应
		body.ack = ack;
		body.socket = socket;
		console.log("================================================================");
		console.log("本次接口触发的socketid是："+socket.id);
		console.log("================================================================");
		var main = require('../im/app_im_main.js');
		var bool = main.searchfile(body.func);
		if (bool) {
			main.index(body);
		} else {
			console.log("暂无 im/[ " + body.func + ".js] ... 文件!")
		}
	})
	
	//-------------单聊------------------
    socket.on('singleChat', function (data,ack) {
        var body = {};
        body.startTime = new Date().getTime();
        body.func = 'singleChat';
        body.data = data;
        body.ack = ack;
        body.socket = socket;
        var main = require('../im/app_im_main.js');
        var bool = main.searchfile(body.func);
        if (bool) {
            main.index(body);
        } else {
            console.log("暂无 im/[ " + body.func + ".js] ... 文件!")
        }
	})


	socket.on('time', function (data, ack) {
		var body = {};
        var time = new Date().getTime();
        body.startTime = time;
		body.func = 'time';
        body.ack = ack;
		body.socket = socket;
		var main = require('../im/app_im_main.js');
		var bool = main.searchfile(body.func);
		if (bool) {
			main.index(body);
		} else {
			console.log("暂无 im/[ " + body.func + ".js] ... 文件!")
		}
	});


	socket.on('joinChatRoom',function(roomName,ack){
		var body = {};
		var time = new Date().getTime();
		body.startTime = time;
		body.func = 'joinChatRoom';
		body.ack = ack;
		body.roomName = roomName;
		body.userid = socket.userid;
		body.socket = socket;
		var main = require('../im/app_im_main.js');
		var bool = main.searchfile(body.func);
		if (bool) {
			main.index(body);
		} else {
			console.log("暂无 im/[ " + body.func + ".js] ... 文件!")
		}

	});


	socket.on('leaveChatRoom',function(roomName,ack){
		var body = {};
		var time = new Date().getTime();
		body.startTime = time;
		body.func = 'leaveChatRoom';
		body.ack = ack;
		body.roomName = roomName;
		body.userid = socket.userid;
		body.socket = socket;
		var main = require('../im/app_im_main.js');
		var bool = main.searchfile(body.func);
		if (bool) {
			main.index(body);
		} else {
			console.log("暂无 im/[ " + body.func + ".js] ... 文件!")
		}
	});

	socket.on('online', function (data,ack) {
		var body = {};
		body.startTime = new Date().getTime();
		body.func = 'online';
		body.data = data;
		// ack 在客户端emit提交调用online 传递两个参数，ack是其中之一，在结束接口时回调给客户端，相当于响应
		body.ack = ack;
		body.socket = socket;
		console.log("================================================================");
		console.log("本次接口触发的socketid是："+socket.id);
		console.log("================================================================");
		var main = require('../groupchat/groupchat_main.js');
		var bool = main.searchfile(body.func);
		if (bool) {
			main.index(body);
		} else {
			console.log("暂无 groupchat/[ " + body.func + ".js] ... 文件!")
		}
	})

	//群聊消息发送
	socket.on('message_group',function(data,ack){
		var body = {};
		var time = new Date().getTime();
		body.startTime = time;
		body.func = 'message_group';
		body.ack = ack;
		body.data = data;
		body.socket = socket;
		var main = require('../groupchat/groupchat_main.js');
		var bool = main.searchfile(body.func);
		if (bool) {
			main.index(body);
		} else {
			console.log("暂无 groupchat/[ " + body.func + ".js] ... 文件!")
		}
	});

	//群聊消息  回调 用于记录用户聊天id
	socket.on('mgs_group_return',function(data,ack){
		var body = {};
		var time = new Date().getTime();
		body.startTime = time;
		body.func = 'mgs_group_return';
		body.ack = ack;
		body.data = data;
		body.socket = socket;
		var main = require('../groupchat/groupchat_main.js');
		var bool = main.searchfile(body.func);
		if (bool) {
			main.index(body);
		} else {
			console.log("暂无 groupchat/[ " + body.func + ".js] ... 文件!")
		}
	});

	//单聊消息发送
	socket.on('message_user',function(data,ack){
		var body = {};
		var time = new Date().getTime();
		body.startTime = time;
		body.func = 'message_user_send';
		body.ack = ack;
		body.data = data;
		body.socket = socket;
		var main = require('../groupchat/groupchat_main.js');
		var bool = main.searchfile(body.func);
		if (bool) {
			main.index(body);
		} else {
			console.log("暂无 groupchat/[ " + body.func + ".js] ... 文件!")
		}
	});

	//直播间消息发送
	socket.on('message_live',function(data,ack){
		var body = {};
		var time = new Date().getTime();
		body.startTime = time;
		body.func = 'message_live_send';
		body.ack = ack;
		body.data = data;
		body.socket = socket;
		var main = require('../groupchat/groupchat_main.js');
		var bool = main.searchfile(body.func);
		if (bool) {
			main.index(body);
		} else {
			console.log("暂无 groupchat/[ " + body.func + ".js] ... 文件!")
		}
	});
}



//检查用户是否在线  、、、新功能此废弃方法
web_im.checked_online = function(userid){
	for (var i = 0 ; i < web_im.sockets.length ; i++){
		//console.log(userid);
		
		if(web_im.sockets[i].userid == userid){
			
			return web_im.sockets[i]
		}
	}

	return null

}



//发送私聊消息  此方法将废弃
web_im.send_pryivte = function(socket,data){
	var reTrue = false;
    var result = {};
    if(socket == null){
    	result.code = -1;
    	return result;
    }else{
    	var fiber = Fiber.current;

        setTimeout(function () {

    		if(reTrue == false){
    			result.code = -2;
				reTrue = true;
				fiber.run();
    		}

		}, 20000);

        // console.log(socket);
		socket.emit('message',data);
        // ,function(data){
        //     if(reTrue == false){
        //         result.code = 0;
        //         result.data = data;
        //         reTrue = true;
        //         fiber.run();
        //     }
        // }
		
		Fiber.yield();
		return result;
    }


}





module.exports = web_im;







