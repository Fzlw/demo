

var pgdb = require('../func/pgdb.js');
var moment = require("moment");

module.exports.run = function (body, pg, mo, redis, pg2) {
	let f = body;	//获取传输的数据
	let data = { "状态": "成功" };
	if (!f.页数) {
		f.页数 = 1;
	}

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

	//接入记录
	let sql = `select 发送者,消息类型,消息内容,状态 from 客_客服接入表 where 类别 = '${kf_data.数据[0].类别}' and 客服接入状态 = '未接入' and 录入时间 like '%${moment().format('YYYY-MM-DD')}%' and 状态 = '正常' order by id desc LIMIT 9 OFFSET 9*(${f.页数-1}) `;
	let result1 = pgdb.query(pg, sql);
	if (result1.状态 != '成功') {
		data.状态 = '网络异常'
		return data;
	}
	//已接入 还在通话中
	let sqlss = `select 发送者,消息类型,消息内容,状态 from 客_客服接入表 where 接入客服 = $1 and 类别 = '${kf_data.数据[0].类别}' and 客服接入状态 = '已接入' and 录入时间 like '%${moment().format('YYYY-MM-DD')}%' and 状态 = '正常' `;
	let result1ss = pgdb.query(pg, sqlss,[f.services]);
	if (result1ss.状态 != '成功') {
		data.状态 = '网络异常'
		return data;
	}


	//查询总页数
	sql = `select count(id) as num from 客_客服接入表 where 类别 = '${kf_data.数据[0].类别}' and 客服接入状态 = '未接入' and 状态 = '正常' and 录入时间 like '%${moment().format('YYYY-MM-DD')}%'`;
	let num = pgdb.query(pg, sql);
	if (num.状态 != '成功') {
		data.状态 = '网络异常'
		return data;
	}
	if (parseInt(num.数据[0].num) % 9 == 0) {
		data.总页数 = parseInt(parseInt(num.数据[0].num) / 9) || 1;
	} else {
		data.总页数 = parseInt(parseInt(num.数据[0].num) / 9) + 1;
	}

	data.页数 = f.页数;
	data.数据 = result1.数据;
	data.数据s = result1ss.数据;
	return data;
}