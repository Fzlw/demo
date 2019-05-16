/**
 * 创建人:@anime
 * 创建时间：2018-5-8 15:36:17
 * 创建内容：用户接入客服消息列表
 */

var pgdb = require('../func/pgdb.js');
var moment = require("moment");

module.exports.run = function (body, pg, mo, redis, pg2) {
	let f = body;	//获取传输的数据
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

	let sql = `select id,客服接入状态 from 客_客服接入表 where 类别 = '${kf_data.数据[0].类别}' and 状态 = '正常' and 发送者 = $1 and 录入时间 like '%${moment().format('YYYY-MM-DD')}%'`;
	let res = pgdb.query(pg,sql,[f.userid]);
	if (res.状态 != '成功') {
		data.状态 = '网络异常'
		return data;
	}
	sql = `select 消息内容,消息类型,录入时间 from 客_客服接入消息记录表 where 接入id = ${res.数据[0].id} order by id`
	let res_sel = pgdb.query(pg,sql);
	if (res.状态 != '成功') {
		data.状态 = '网络异常'
		return data;
	}
	data.页数 = f.页数;
	data.数据 = res_sel.数据;
	return data;
}