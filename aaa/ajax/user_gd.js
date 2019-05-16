/**
 * 创建人:@anime
 * 创建时间：2018-5-8 15:36:17
 * 创建内容：用户挂断
 */

var pgdb = require('../func/pgdb.js');
var moment = require("moment");

module.exports.run = function (body, pg, mo, redis, pg2) {
	let f = body;	//获取传输的数据
	console.log(f)

	
	let data = { "状态": "成功" };

	let kf_sql = `select 类别 from 客_客服表 where 账号 = $1`;
	let kf_data = pgdb.query(pg, kf_sql,[f.services]);
	if (kf_data.状态 != '成功') {
		data.状态 = '网络异常'
		return data;
	}
	if(!kf_data.数据 || kf_data.数据.length == 0){
		data.状态 = '登录账户异常，请重新登录'
		return data;
	}
	
	let sql = `update 客_客服接入表 set 状态 = '已完成' where 类别 = '${kf_data.数据[0].类别}' and 接入客服 = $1 and 发送者 = $2 and 状态 = '正常' and 录入时间 like '%${moment().format('YYYY-MM-DD')}%'`;
	let res = pgdb.query(pg,sql,[f.services,f.userid]);
	if (res.状态 != '成功') {
		data.状态 = '网络异常'
		return data;
	}
	return data;
}