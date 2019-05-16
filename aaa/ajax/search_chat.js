
var config = require('../func/config.js');
var pgdb =  require('../func/pgdb.js');
var moment = require('moment');
var singleChat = require('../api/singleChat.js')
var uuid = require('uuid');
module.exports.run = function(body,pg,mo,redis,pg2){
    var p = {};
    p.状态 = '成功';
    var f = body;	//获取传输的数据
    if(f.账号 == "" || f.账号 == undefined){
        p.状态 = '账号不能为空';
        return p;
    }
    var sql ="select id,头像 from 会员资料表 where 账号 ='"+f.sender+"'";
    var result = pgdb.query(pg,sql);
    if(result.数据.length < 1){
        p.状态 = '搜索账号不存在';
        return p;
    }
    var sql ="select id,昵称,随机码 from 会员表 where 账号 ='"+f.sender+"'";
    var result1 = pgdb.query(pg,sql);
    if(result1.数据.length < 1){
        p.状态 = '搜索账号不存在';
        return p;
    }
    f.昵称 = result1.数据[0].昵称;
    f.随机码 = result1.数据[0].随机码;
    f.portrait = result.数据[0].头像;
    var userid = f.账号+'_service';
    var curtime = moment().format('YYYY-MM-DD HH:mm:ss');
	var meg = {};
	meg.receiveId = userid; // 接收人
	meg.sendId = f.sender;
	meg.message = '【系统消息】:已找到该用户';
	meg.msgType = '文本'; // 例如：图文/文本
	meg.random = f.随机码;
	meg.msgIdFse = '111';
    body.receive = meg;
	var send = singleChat.run(body, pg, mo, redis, pg2);
	if(send.msg != '发送成功'){
		p.状态 ==send.msg;
		return p;
	}

    return p;
    
}
