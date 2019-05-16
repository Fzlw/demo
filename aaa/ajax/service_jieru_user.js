/**
 * 创建人:@anime
 * 创建时间：2018-5-8 15:36:17
 * 创建内容：客服接入用户
 */

var pgdb = require('../func/pgdb.js');
var web_im = require('../func/web_im.js');
var moment = require("moment");
// var redisdb = require('../func/redisdb.js');

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

	let sql = `select id,客服接入状态,类别 from 客_客服接入表 where 类别 = '${kf_data.数据[0].类别}' and 状态 = '正常' and 客服接入状态 = '未接入' and 发送者 = $1 and 录入时间 like '%${moment().format('YYYY-MM-DD')}%'`;
	let res = pgdb.query(pg,sql,[f.userid]);
	if (res.状态 != '成功') {
		data.状态 = '网络异常'
		return data;
	}
	if(!res.数据 || res.数据.length == 0){
		data.状态 = '用户已被其他客服接入'
		return data;
	}

	sql = `update 客_客服接入表 set 客服接入状态 = '已接入' ,接入客服=$1,接入时间='${moment().format('YYYY-MM-DD HH:mm:ss')}' where 状态 = '正常' and 发送者 = $2 and 客服接入状态 = '未接入' and 录入时间 like '%${moment().format('YYYY-MM-DD')}%'`
	let resup = pgdb.query(pg,sql,[f.services,f.userid]);
	if (resup.状态 != '成功') {
		data.状态 = '网络异常'
		return data;
	}
	if(resup.影响行数 == 0){
		data.状态 = '用户已被其他客服接入'
		return data;
	}
	sql = `select 消息内容,消息类型 from 客_客服接入消息记录表 where 接入id = ${res.数据[0].id} order by id`
	let res_sel = pgdb.query(pg,sql);
	if (res.状态 != '成功') {
		data.状态 = '网络异常'
		return data;
	}
	data.页数 = f.页数;
	data.数据 = res_sel.数据;

	let pj_sql = `INSERT INTO public.客_客服评价表(用户账号, 客服账号, 客服类型, 评价星级, 是否解决, 状态, 录入人, 录入时间, 备注, 是否评价) VALUES 
	($1, $2, '${res.数据[0].类别}', '', '', '正常', 'admin', '${moment().format("YYYY-MM-DD HH:mm:ss")}', '评价客服', '否');`;
	let pj_sel = pgdb.query(pg,pj_sql,[f.userid,f.services]);
	if (pj_sel.状态 != '成功') {
		data.状态 = '网络异常'
		return data;
	}

	//给其他客服发送消息 我已经接入这个客户了
	let sql_kf = `select 账号 from 客_客服表 where 类别 = '${res.数据[0].类别}' and 账号 != $1`
	let res_kf = pgdb.query(pg,sql_kf,[f.services]);
	if (res_kf.状态 != '成功') {
		data.状态 = '网络异常'
		return data;
	}
	res_kf.数据.forEach(element => {
		let service = web_im.get_online(redis, element.账号+'_service');
		//给所有在线客服发消息
        if(service.code == 1){
            //封装消息体
            let socket = web_im.find_socket(service.socketid);
            let messageStr = JSON.stringify({"userid":f.userid});
            //发送私聊消息
            web_im.jieru_user(socket, messageStr);
        }
	});
	
	return data;
}