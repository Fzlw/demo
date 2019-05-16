/**
func=auth
userid=123
random=1
 */

var web_im = require('../func/web_im.js');
var cipher = require('../func/cipher.js');
var config = require('../func/config.js');
var mongo = require('../func/mongo.js');
var redisdb = require('../func/redisdb.js');
var pgdb = require('../func/pgdb.js');
var moment = require("moment");
var uuid = require('uuid');

var conf = config.get('app');

module.exports.run = function(body, pg, mo, redis, pg2) {

    let res = {};

	try{
		var data = body.receive;
		body.userid = data.userid;
		body.random = data.random;
	}catch(e){
        res.msg = '数据错误';
		return res;
	}


	//##############################业务代码###############################

	//用户账号和随机码正确则设置认证成功，放入redis数据库设置为在线用户
    let sql = `select 随机码 from 平_会员表 where 账号 = '${body.userid}'`;
	let record = pgdb.query(pg, sql).数据 || undefined;
    if (!record || record.length != 1) {
        res.code = -1;
        res.msg = '账号或随机码不正确';
        return res;
    }

    if (body.random != record[0].随机码){
        res.code = -2;
        res.msg = '随机码不正确';
        return res;
    }

    //##############################业务代码###############################



	//socket对象设置
	body.socket.userid = body.userid;
	body.socket.random = body.random;



	//设置在线状态    ---- 最后的60为客户端与服务60无心跳进行断线操作。
    let time = moment().format('YYYY-MM-DD HH:mm:ss');

	var result = web_im.set_online(redis,body.userid,body.socket.id,'认证时间：'+time,60);

    //回复客户端
	if (result.code == 1) {

	    //查询离线消息
        let record = queryOffLineMes(pg, body);
        //发送离线消息
        sendOffLineMes(pg, body.socket, record);

        res.code = 1;
        res.msg = body.userid+'认证成功';
	} else {
        res.code = -3;
        res.msg = body.userid+'认证出错';
    }
	return res;

}


/**
 * 发送离线消息
 * @param record
 */
sendOffLineMes = (pg, socket, record) => {
    //循环发送离线消息
    record.forEach(item => {
        let meg = {};
        if(item.消息类型 == '文本'){
            meg.pushData = item.消息内容.replace(/'/g,"''");
        }else if(item.消息类型 == '图片'){
            meg.pushData = '[图片]';
        }else if(item.消息类型 == '语音'){
            meg.pushData = '[语音]';
        }
        meg.msgId = 消息id; 	// 前台数据库id
        meg.sendId = item.发送者; // 发送人
        meg.receiveId = item.接收者; // 接收人
        meg.sessionType = '单聊'; // 类别
        meg.msgType = item.消息类型; // 例如：图文/文本
        meg.sendTime = moment().format('YYYY-MM-DD HH:mm:ss'); //当前时间
        meg.message = item.消息内容; //消息内容
        //发送离线消息
        let megStr = JSON.stringify(meg);
        web_im.send_message(socket, megStr);
        finishSendMes(pg, item.消息id);
    });
}


/**
 * 查询所有离线消息
 * @param pg
 * @param body
 * @returns {*|undefined}
 */
queryOffLineMes = (pg,body) => {
    let sql = `SELECT 消息id, 发送者, 发送者名称, 接收者, 接收者名称, 会话类型, 消息类型, 消息内容, 发送时间, 接收时间, 签收id, 状态
               FROM im_单聊表
               WHERE 接收者 = '${body.userid}' AND 状态 = '未接收'`;
    let record = pgdb.query(pg, sql).数据 || undefined;
    return record;
}

/**
 * 接受完离线消息
 * @param msid
 * @returns {*|undefined}
 */
finishSendMes = (pg,msid) => {
    let sql = `UPDATE im_单聊表 SET 状态 = '已接收'
               WHERE 消息id = '${msid}'`;
    let record = pgdb.query(pg, sql).影响行数 || undefined;
    return record;
}