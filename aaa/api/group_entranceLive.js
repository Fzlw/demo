/* 
 * 创建人：Coding Farmer_2203
 * 创建内容：进入直播间
 * 创建时间：2019-02-18
 * 创建版本: 1.1.0

func=group_entranceLive
账号=555555
随机码=730872854bc74d33a250c8a1efbc7972
直播间id=d31c_2
直播间记录id=4
 */

var share = require('./public/share.js');
var pgdb = require('../func/pgdb.js');
var redisdb = require('../func/redisdb.js');
var config = require('../func/config.js');
var crypto = require('crypto');
var md5 = require('md5');
var message_live_remind = require('../groupchat/message_live_remind.js');
var operation_group = require('../groupchat/operation_group.js');


module.exports.run = function(body, pg, mo,redis){
	
	let sql = '';
	let result = '';
	
	f = body.receive;
	let data = {
		'状态':'成功'
	};
	
	middle(pg,f,body,data,redis);
	
	sql = `insert into 日志_非钱表(账号,时间,ip,类别,状态,录入人,录入时间,备注)values('${f.账号}','${body.date}','${body.ip}','进入直播间','数据提交','系统','${body.date}','入参：${JSON.stringify(body)} 返回参数：${JSON.stringify(data)}')`;
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
	
	if(!f.群id){
		data.状态 = "群id不能为空";
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
	let redis_meg = redis_time(redis, 1, 'entranceLive' + f.账号);
	if (redis_meg.状态 != '成功') {
		data.状态 = "请不要重复点击";
		return data;
	}
	
	sql = "select a.状态,a.类别,a.主播id,b.在线观看人数,b.最高人数 from 群_直播间表 a join 群_直播间记录表 b on a.直播间id = $1 and a.直播间id = b.直播间id and b.id = $2";
	result = pgdb.query(pg,sql,[f.直播间id,f.直播间记录id]);
	if(result.状态 != '成功'){
		data.状态 = "网络异常";
		return data;
	}
	
	if(result.数据.length == 0){
		data.状态 = "该直播间不存在";
		return data;
	}
	
	if(result.数据[0].状态 == '未直播'){
		data.状态 = "主播暂未开播";
		return data;
	}
	
	f.主播id = result.数据[0].主播id;
	f.在线观看人数 = result.数据[0].在线观看人数;
	f.最高人数 = result.数据[0].最高人数;
	
	//生成随机人数
	let sjsNum = Math.floor(Math.random()*10+1)
	f.在线观看人数 = Number(f.在线观看人数) + Number(sjsNum);
	f.最高人数 = Number(f.最高人数) + Number(sjsNum);
	
	//主播昵称
	sql = "select a.群昵称,b.头像 from 群_群成员表 a,会员资料表 b  where a.群id = $1 and a.用户账号 = $2 and a.用户账号 = b.账号";
	result = pgdb.query(pg,sql,[f.群id,f.主播id]);
	if(result.状态 != '成功'){
		data.状态 = "网络异常";
		return data;
	}
	
	if(result.数据.length == 0){
		data.状态 = "该主播不存在";
		return data;
	}
	
	f.主播昵称 = result.数据[0].群昵称;
	f.头像 = result.数据[0].头像;
	
	sql = "select 群昵称 from 群_群成员表 where 用户账号 = $1 and 群id = $2";
	result = pgdb.query(pg,sql,[f.账号,f.群id]);
	if(result.状态 != '成功'){
		data.状态 = "网络异常";
		return data;
	}
	f.用户群昵称 = result.数据[0].群昵称;
	
	sql = "select id,是否点赞,是否签到 from 群_直播间观众表 where 直播间id = $1 and 主播id = $2 and 观众id = $3 and 直播间记录id = $4";
	result = pgdb.query(pg,sql,[f.直播间id,f.主播id,f.账号,f.直播间记录id]);
	if(result.状态 != '成功'){
		data.状态 = "网络异常";
		return data;
	}
	
	if (result.数据.length == 0) {
		sql = "INSERT INTO 群_直播间观众表 (直播间id, 主播id, 观众id, 状态, 类别, 录入人, 录入时间, 备注,直播间记录id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);"
		result = pgdb.query(pg,sql,[f.直播间id,f.主播id,f.账号,'观看中','正常','系统',body.date,'',f.直播间记录id]);
		if(result.状态 != '成功'){
			data.状态 = "网络异常";
			return data;
		}
		
		f.是否点赞 = '否';
		f.是否签到 = '否';
	}else{
		f.是否点赞 = result.数据[0].是否点赞;
		f.是否签到 = result.数据[0].是否签到;
		sql = "update 群_直播间观众表 set 状态 = '观看中' where 直播间id = $1  and 观众id = $2 and 直播间记录id = $3;"
		result = pgdb.query(pg,sql,[f.直播间id,f.账号,f.直播间记录id]);
		if(result.状态 != '成功'){
			data.状态 = "网络异常";
			return data;
		}
	}
	
	sql = "update 群_直播间记录表 set 在线观看人数 = $1,最高人数 = $2 where 直播间id = $3 and 状态 = '直播中'";
	result = pgdb.query(pg,sql,[f.在线观看人数,f.最高人数,f.直播间id]);
	if(result.状态 != '成功'){
		data.状态 = "网络异常";
		return data;
	}
	
	//判断群_用户直播表存不存在
	sql = "select id,是否关注 from 群_用户直播表 where 账号 = $1 and 直播间id = $2";
	result = pgdb.query(pg,sql,[f.账号,f.直播间id]);
	if(result.状态 != '成功'){
		data.状态 = "网络异常";
		return data;
	}
	if (result.数据.length == 0) {
		sql = "INSERT INTO 群_用户直播表 (账号, 直播间id, 是否关注, 连续签到次数, 状态, 录入人, 录入时间, 备注) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);"
		result = pgdb.query(pg,sql,[f.账号,f.直播间id,'否',0,'正常','系统',body.date,'']);
		if(result.状态 != '成功'){
			data.状态 = "网络异常";
			return data;
		}
		f.关注 = '否';
	}else{
		f.关注 = result.数据[0].是否关注;
	}
	
	
	//获取播流地址
	let live = config.get('live');
	let date1 = Math.round(AddHours(new Date(),1).getTime()/1000);
	let sj = guid();
	
	let a = '/' + live.appName + '/' + f.直播间id + '-' + date1 + '-' + sj + '-0-' + live.播流密钥;
	
	var crypto = require('crypto');
	var md5 = require('md5');

	let r = 'rtmp://play.' + live.域名 + '/' + live.appName + '/' + f.直播间id + '?auth_key=';
	var md5 = crypto.createHash('md5');
    let cryptostr = md5.update(a).digest('hex');
    r = r + date1 + '-'+ sj + '-0-' + cryptostr;
    
    data.播流地址 = r;
    data.关注 = f.关注;
    data.主播昵称 = f.主播昵称;
    data.主播头像 = f.头像;
    data.在线观看人数 = f.在线观看人数;
    data.是否点赞 = f.是否点赞;
    data.是否签到 = f.是否签到;
    
    let m = {
		'直播间id':f.直播间id,
		'主播id':f.主播id,
		'消息内容':f.用户群昵称 + ' 进入直播间',
		'用户账号':f.账号,
		'人气值':f.在线观看人数
	}
	message_live_remind.run(m, pg, redis, '');
	operation_group.run(f.账号,f.直播间id, redis,'入群');
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