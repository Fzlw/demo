/* 
 * 创建人：Coding Farmer_2203
 * 创建内容：点赞
 * 创建时间：2019-02-25
 * 创建版本: 1.1.0

func=group_beginLive

账号=18475632518
随机码=542af7076a411f892c08a284eeea6852
直播间记录id=4
直播间id=d31c_2
 */

var share = require('./public/share.js');
var pgdb = require('../func/pgdb.js');
var redisdb = require('../func/redisdb.js');

module.exports.run = function(body, pg, mo,redis){
	
	let sql = '';
	let result = '';
	
	let data = {
		'状态':'成功'
	};
    
	f = body.receive;
	
	middle(pg,f,body,data,redis);
	
	sql = `insert into 日志_非钱表(账号,时间,ip,类别,状态,录入人,录入时间,备注)values('${f.账号}','${body.date}','${body.ip}','直播点赞','数据提交','系统','${body.date}','入参：${JSON.stringify(body)} 返回参数：${JSON.stringify(data)}')`;
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
	
	  //头部验证
    f.top = share.top(f.账号, f.随机码, pg);
    if (f.top.状态 != '成功') {
        data.状态 = f.top.状态;
        return data;
    } 
    
     //这里使用redis防止 单用户 并发处理   往队列中插入一条数据 设置2秒有效时间
	let redis_meg = redis_time(redis, 1, 'beginLive' + f.账号);
	if (redis_meg.状态 != '成功') {
		data.状态 = "请不要重复点击";
		return data;
	}
	
	sql = "select id,状态 from 群_直播间观众表 where 观众id = $1 and 直播间记录id = $2  and 直播间id = $3 and 是否点赞 = '是'";
	result = pgdb.query(pg,sql,[f.账号,f.直播间记录id,f.直播间id]);
	if(result.状态 != '成功'){
		data.状态 = "网络异常，请稍后再试";
		return data;
	}
	if (result.数据.length > 0) {
		data.状态 = "您已经点过赞了";
		return data;
	}else{
		
		sql = "update 群_直播间观众表 set 是否点赞 = '是' where 观众id = $1 and 直播间记录id = $2  and 直播间id = $3";
		result = pgdb.query(pg,sql,[f.账号,f.直播间记录id,f.直播间id]);
		if(result.状态 != '成功'){
			data.状态 = "网络异常，请稍后再试";
			return data;
		}
		
		sql = "update 群_直播间记录表 set 获得赞 = 获得赞 + 1 where  id = $1  and 直播间id = $2";
		result = pgdb.query(pg,sql,[f.直播间记录id,f.直播间id]);
		if(result.状态 != '成功'){
			data.状态 = "网络异常，请稍后再试";
			return data;
		}
	}

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

var AddHours = (date, value) => {
    date.setHours(date.getHours() + value);
    return date;
}


function guid() {
  function S4() {
    return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
  }
  return (S4()+S4()+S4()+S4()+S4()+S4()+S4()+S4());
}