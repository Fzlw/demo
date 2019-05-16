/* 
 * 创建人：Coding Farmer_2203
 * 创建内容：结束直播
 * 创建时间：2019-02-18
 * 创建版本: 1.1.0

func=group_endLive

账号=18475632518
随机码=01c1b5f4cb75937bbee3571ef32a3715
直播间id=5678_1
直播间记录id=4
直播时长=2
 */

var share = require('./public/share.js');
var pgdb = require('../func/pgdb.js');
var redisdb = require('../func/redisdb.js');
var operation_group = require('../groupchat/operation_group.js');
var message_remind = require('../groupchat/message_remind.js');

module.exports.run = function(body, pg, mo,redis){
	
	let sql = '';
	let result = '';
	
	let data = {
		'状态':'成功'
	};
    
	f = body.receive;
	
	middle(pg,f,body,data,redis);
	
	sql = `insert into 日志_非钱表(账号,时间,ip,类别,状态,录入人,录入时间,备注)values('${f.账号}','${body.date}','${body.ip}','结束直播','数据提交','系统','${body.date}','入参：${JSON.stringify(body)} 返回参数：${JSON.stringify(data)}')`;
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
	
	if(!f.开播时间){
		data.状态 = "开播时间不能为空";
		return data;
	}
	
	if (f.请求方式 != '定时') {
		  //头部验证
    f.top = share.top(f.账号, f.随机码, pg);
    if (f.top.状态 != '成功') {
        data.状态 = f.top.状态;
        return data;
    } 
	}
	
    
     //这里使用redis防止 单用户 并发处理   往队列中插入一条数据 设置2秒有效时间
	let redis_meg = redis_time(redis, 1, 'endLive' + f.账号);
	if (redis_meg.状态 != '成功') {
		data.状态 = "请不要重复点击";
		return data;
	}
	
	let 相差秒数 = parseInt((new Date(body.date).getTime() - new Date(f.开播时间).getTime())/1000);
	let 直播小时 = parseInt(相差秒数/60/60);
	let 直播分钟 = parseInt((相差秒数 - 直播小时*60*60)/60);
	let 直播秒 = parseInt(相差秒数 - 直播小时*60*60 - 直播分钟 * 60);
	
	let h = 直播小时 > 10 ? 直播小时 : '0' + 直播小时 
    let m = 直播分钟 > 10 ? 直播分钟 : '0' + 直播分钟  
    let s = 直播秒 > 10 ? 直播秒 : '0' + 直播秒;

	f.直播时长 = h + ':' + m + ':' + s;
	
	sql = "update 群_直播间记录表 set 结束时间 = $1,直播时长 = $2,状态 = '直播结束'  where 直播间id = $3 and id = $4 returning 在线观看人数,获得赞,获得礼物";
	result = pgdb.query(pg,sql,[body.date,f.直播时长,f.直播间id,f.直播间记录id]);
	if(result.状态 != '成功'){
		data.状态 = "网络异常";
		return data;
	}
	
	data.在线观看人数 = result.数据[0].在线观看人数;
	data.获得赞 = result.数据[0].获得赞;
	data.直播时长 = f.直播时长;
	data.获得礼物 = result.数据[0].获得礼物;
	
	sql = "update 群_直播间表 set 状态 ='未直播' where 主播id = $1 and 直播间id = $2";
	result = pgdb.query(pg,sql,[f.账号,f.直播间id]);
	if(result.状态 != '成功'){
		data.状态 = "网络异常，请稍后再试";
		return data;
	}
//	console.log(f.直播间记录id);
	sql = "update 群_直播间观众表 set 状态 ='已离开' where 主播id = $1 and 直播间id = $2 and 状态 = '观看中' and 直播间记录id = $3  returning 观众id";
	result = pgdb.query(pg,sql,[f.账号,f.直播间id,f.直播间记录id]);
	if(result.状态 != '成功'){
		data.状态 = "网络异常，请稍后再试";
		return data;
	}
	
	let 观众id = result.数据;
	观众id = 观众id.concat([{'观众id':f.账号}])
	
	for(let i in 观众id){
		operation_group.run(观众id[i].观众id,f.直播间id, redis,'退群');
	}
	
	let n = {
		'直播状态':'未直播',
		'直播间id':f.直播间id,
		'群id':f.群id,
		'用户账号':f.账号,
		'直播间记录id':f.直播间记录id,
	}
	message_remind.run(n, pg, redis, '直播提醒');
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