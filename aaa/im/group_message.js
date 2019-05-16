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
    let res = {};
    let data = {};
    console.log(body.data);
    try{
        //乱码 手机端传值是加编码的 
        data = JSON.parse(decodeURIComponent(body.data));
	}catch(e){
		return;
	}

    //业务代码 逻辑执行
    let sql = `select 随机码 from 会员表 where 账号 = '${data.userid}'`;
	let record = pgdb.query(pg, sql).数据 || undefined;
    if (!record || record.length != 1) {
        return;
    }else{
        if (data.random != record[0].随机码){
            return;
        }
    }
    data.time = moment().format('YYYY-MM-DD HH:mm:ss');
    sql = `select id from im_系统消息接收表 where 消息id = '${data.msgid}' and 接收者账号 = '${data.userid}'`;
    let mesg_data = pgdb.query(pg, sql).数据 || undefined;
    if (!mesg_data || mesg_data.length != 1) {
        sql = `select 消息类型,会话类型 from im_系统消息内容表 where 消息id = '${data.msgid}'`;
        let message = pgdb.query(pg, sql).数据 || undefined;
         sql = `INSERT INTO im_系统消息接收表 (接收者账号, 会话类型, 消息类型, 消息id, 状态, 接收时间,录入人,录入时间)
                    VALUES ('${data.userid}', '系统群发', '${message[0].消息类型}', '${data.msgid}', '已接收', '${data.time }','系统','${data.time}')`;
        let result = pgdb.query(pg, sql);
    }
    return;

}
