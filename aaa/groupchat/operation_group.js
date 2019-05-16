/**
 * 创建人:Coding Farmer_2207
 * 创建时间 2018-12-3 10:15:13
 * 创建内容：群操作
 * 
 */

var web_im = require('../func/web_im.js');
var pgdb = require('../func/pgdb.js');
var moment = require("moment");
var uuid = require('uuid');

module.exports.run = function(userid,groupid, redis,ope_type) {
    let data = {"状态":"成功"};
	if(!userid){
        data.状态 = "用户id不能为空";
        return data;
    }
    if(!groupid){
        data.状态 = "群id不能为空";
        return data;
    }
    //检查聊天对象是否在线
    let online = web_im.get_online(redis, userid);
    if (online.code == 1) {
        let socket = web_im.find_socket(online.socketid);
        if(ope_type == '入群'){
            socket.join(groupid);
        }else if(ope_type == '退群'){
			console.log(userid);
			console.log(groupid);
			console.log("退群了================================");
            socket.leave(groupid);
        }
    }
    return data;
}