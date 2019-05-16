/* 
 * 创建人：Coding Farmer_2203
 * 创建内容：群签到
 * 创建时间：2019-02-19
 * 创建版本: 1.1.0

func=group_signRecord

账号=18475632518
随机码=01c1b5f4cb75937bbee3571ef32a3715
群id=93550025
直播间id=
签到方式=群聊/群直播间
群昵称=
 */

var share = require('./public/share.js');
var pgdb = require('../func/pgdb.js');
var redisdb = require('../func/redisdb.js');
var message_remind = require('../groupchat/message_remind.js');

module.exports.run = function(body, pg, mo,redis){
	
	let sql = '';
	let result = '';
	
	let data = {
		'状态':'成功'
	};
    
	f = body.receive;
	
	middle(pg,f,body,data,redis);
	
	sql = `insert into 日志_非钱表(账号,时间,ip,类别,状态,录入人,录入时间,备注)values('${f.账号}','${body.date}','${body.ip}','群签到','数据提交','系统','${body.date}','入参：${JSON.stringify(body)} 返回参数：${JSON.stringify(data)}')`;
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
	
	if(!f.签到方式){
		data.状态 = "签到方式不能为空";
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
	
	//查询群昵称
	sql = "select 群昵称 from 群_群成员表 where 群id = $1 and 用户账号 = $2 ";
	result = pgdb.query(pg,sql,[f.群id,f.账号]);
	if(result.状态 != '成功'){
		data.状态 = "网络异常，请稍后再试";
		return data;
	}
	f.群昵称 = result.数据[0].群昵称;
	
	switch (f.签到方式){
		case '群聊':
			if(!f.群id){
				data.状态 = "群id不能为空";
				return data;
			}
			
			//判断当天是否签到
			sql = "select id from 群_签到记录表 where 群id = $1 and 账号 = $2 and 状态 = '正常' and  签到时间 = to_char(now(), 'YYYY-MM-DD' )";
			result = pgdb.query(pg,sql,[f.群id,f.账号]);
			if(result.状态 != '成功'){
				data.状态 = "网络异常，请稍后再试";
				return data;
			}
			
			if(result.数据.length == 0) {
				//判断昨天是否签到
				sql = "select id from 群_签到记录表 where 群id = $1 and 账号 = $2 and 状态 = '正常' and  签到时间 = to_char( now() + '-1 day', 'YYYY-MM-DD' )";
				result = pgdb.query(pg,sql,[f.群id,f.账号]);
				if(result.状态 != '成功'){
					data.状态 = "网络异常，请稍后再试";
					return data;
				}
				
				let 连续签到天数 = 1;
				if(result.数据.length == 0) {
					sql = "UPDATE 群_群成员表 SET  连续签到天数 = 1 WHERE 群id = $1 and 用户账号 = $2 ";
				}else{
					sql = "UPDATE 群_群成员表 SET 连续签到天数=连续签到天数 + 1 WHERE 群id = $1 and 用户账号 = $2 ";
				}
				
				result = pgdb.query(pg,sql,[f.群id,f.账号]);                           
				if(result.状态 != '成功'){
					data.状态 = "网络异常，请稍后再试";
					return data;
				}
				
				sql = "INSERT INTO 群_签到记录表 (群id, 账号, 签到时间, 状态, 录入人, 录入时间, 备注 ) VALUES ( $1, $2, $3, $4, $5, $6, $7);"
				result = pgdb.query(pg,sql,[f.群id,f.账号,body.date.substring(0,10),'正常','系统',body.date,'']);
				if(result.状态 != '成功'){
					data.状态 = "网络异常，请稍后再试";
					return data;
				}
			}else{
				data.状态 = "您当天已签到！";
				return data;
			}
			break;
		case '群直播间':
			if(!f.直播间id){
				data.状态 = "直播间id不能为空";
				return data;
			}
			
			if(!f.直播间记录id){
				data.状态 = "直播间记录id不能为空";
				return data;
			}
			
			//判断当前直播间是否签到
		
			sql = "select id from 群_直播间观众表 where 直播间id = $1 and 直播间记录id = $2 and 是否签到 = '是' and 观众id = $3";
			result = pgdb.query(pg,sql,[f.直播间id,f.直播间记录id,f.账号]);
			if(result.状态 != '成功'){
				data.状态 = "网络异常，请稍后再试";
				return data;
			}
			
			if(result.数据.length == 0) {
				
				//上次直播记录
				sql = "select id from 群_直播间记录表 where 直播间id = $1 and 状态 = '直播结束' order by id desc limit 1";
				result = pgdb.query(pg,sql,[f.直播间id]);
				if(result.状态 != '成功'){
					data.状态 = "网络异常，请稍后再试";
					return data;
				}
				
				if (result.数据.length != 0) {
					let shangci = result.数据[0].id;
					//判上次直播是否签到
					sql = "select id from 群_直播间观众表 where 直播间id = $1 and 直播间记录id = $2 and 是否签到 = '是' and 观众id = $3";
					result = pgdb.query(pg,sql,[f.直播间id,f.账号,shangci]);
					if(result.状态 != '成功'){
						data.状态 = "网络异常，请稍后再试";
						return data;
					}
					if (result.数据.length == 0) {
						sql = "UPDATE 群_用户直播表 SET  连续签到次数 = 1 WHERE 直播间id = $1 and 账号 = $2 ";
					}else{
						sql = "UPDATE 群_用户直播表 SET 连续签到次数=连续签到次数 + 1 WHERE 直播间id = $1 and 账号 = $2 ";
					}
				}else{
					sql = "UPDATE 群_用户直播表 SET  连续签到次数 = 1 WHERE 直播间id = $1 and 账号 = $2";
				}
				
				result = pgdb.query(pg,sql,[f.直播间id,f.账号]);                           
				if(result.状态 != '成功'){
					data.状态 = "网络异常，请稍后再试";
					return data;
				}
				
				sql = "update 群_直播间观众表 set 是否签到 = '是' where 直播间id = $1 and 直播间记录id = $2 and 观众id = $3";
				result = pgdb.query(pg,sql,[f.直播间id,f.直播间记录id,f.账号]);   
				if(result.状态 != '成功'){
					data.状态 = "网络异常，请稍后再试";
					return data;
				}
				
			}else{
				data.状态 = "此次直播您已签到！";
				return data;
			}
			break;
		default:
			data.状态 = "签到方式异常";
			return data;
		
	}
	let m = {
		'用户账号':f.账号,
		'好友用户账号':'',
		'消息内容': f.群昵称 + '签到成功，来自' + f.签到方式,
		'id':f.群id
	}
	message_remind.run(m, pg, redis, '群全体提醒');
	
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