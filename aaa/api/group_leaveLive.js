/* 
 * 创建人：Coding Farmer_2203
 * 创建内容：离开直播间
 * 创建时间：2019-02-20
 * 创建版本: 1.1.0

func=group_leaveLive
账号=555555
随机码=730872854bc74d33a250c8a1efbc7972
直播间id=d31c_2
直播间记录id=4
 */

var share = require('./public/share.js');
var pgdb = require('../func/pgdb.js');
var redisdb = require('../func/redisdb.js');
var operation_group = require('../groupchat/operation_group.js');

module.exports.run = function(body, pg, mo,redis){
	
	let sql = '';
	let result = '';
	
	f = body.receive;
	let data = {
		'状态':'成功'
	};
	
	middle(pg,f,body,data,redis);
	
	sql = `insert into 日志_非钱表(账号,时间,ip,类别,状态,录入人,录入时间,备注)values('${f.账号}','${body.date}','${body.ip}','离开直播间','数据提交','系统','${body.date}','入参：${JSON.stringify(body)} 返回参数：${JSON.stringify(data)}')`;
	result = pgdb.query(pg, sql);
	if (result.状态 != '成功') {
		data.状态 = "网络异常，请稍后再试";
		return data;
	}

	
	return data;
	
}

function middle(pg,f,body,data,redis){
	
    let sql = '';
	let result = '';
	
	if(!f.直播间id){
		data.状态 = "直播间id不能为空";
		return data;
	}
	
	if(!f.直播间记录id){
		data.状态 = "直播间记录id不能为空";
		return data;
	}
	
	//头部
	f.top = share.top(f.账号, f.随机码, pg);
    if (f.top.状态 != '成功') {
        data.状态 = f.top.状态;
        return data;
    } 
    
    //这里使用redis防止 单用户 并发处理   往队列中插入一条数据 设置2秒有效时间
	let redis_meg = redis_time(redis, 1, 'leaveLive' + f.账号);
	if (redis_meg.状态 != '成功') {
		data.状态 = "请不要重复点击";
		return data;
	}
	
	sql = "select 状态,类别,主播id from 群_直播间表 where 直播间id = $1";
	result = pgdb.query(pg,sql,[f.直播间id]);
	if(result.状态 != '成功'){
		data.状态 = "网络异常";
		return data;
	}
	
	
	f.主播id = result.数据[0].主播id;
	
	sql = "update 群_直播间记录表 set 在线观看人数 = 在线观看人数 - 1 where 直播间id = $1 and id = $2 and 在线观看人数 > 0";
	result = pgdb.query(pg,sql,[f.直播间id,f.直播间记录id]);
	if(result.状态 != '成功'){
		data.状态 = "网络异常";
		return data;
	}
	
	sql = "update 群_直播间观众表 set 状态 = '已离开' where 直播间id = $1 and 主播id = $2 and 观众id = $3 and 直播间记录id = $4;"
	result = pgdb.query(pg,sql,[f.直播间id,f.主播id,f.账号,f.直播间记录id]);
	if(result.状态 != '成功'){
		data.状态 = "网络异常";
		return data;
	}
	operation_group.run(f.账号,f.直播间id, redis,'退群');
	
}


redis_time = (redis, time, values) => {
	let data = { '状态': '成功' };
	//选择子库
	if (redisdb.select(redis, 8) == false) {
		data.状态 = '网络异常';
		return data;
	}
	//插入key
	let add_key = redisdb.setnx(redis, values, values);
	if (add_key != 1) {
		data.状态 = '请勿重复提交';
		return data;
	}
	//给key设置过期时间
	let key_time = redisdb.expire(redis, values, Number(time) * 1);
	if (key_time != 1) {
		data.状态 = '网络异常';
		return data;
	}
	return data;
}