/*
 * 创建人：Coding Farmer_2203
 * 创建内容：操作好友
 * 创建时间：2018-11-13
 * 创建版本: 1.1.0

func=group_operateFriend

账号=555555
随机码=f797dad1126dd2de00d606232324d280
设置备注=18475632518
消息免打扰=
置顶聊天=
好友账号=
 */

var pgdb = require('../func/pgdb.js');
var share = require('./public/share.js');
var redisdb = require('../func/redisdb.js');

module.exports.run = function(body, pg, mo, redis, pg2) {
	
    let data = {};
    data.状态 = '成功';
   
    let f = {};
    f = body.receive;
    
    let sql = '';
    let result = '';
    
    middle(pg,f,data,body,redis);
    
	sql = `insert into 日志_钱表(账号,时间,ip,类别,状态,录入人,录入时间,备注)values('${f.账号}','${body.date}','${body.ip}','操作好友','数据提交','系统','${body.date}','入参：${JSON.stringify(body)} 返回参数：${JSON.stringify(data)}')`;
	result = pgdb.query(pg, sql);
	if (result.状态 != '成功') {
		data.状态 = "网络异常，请稍后再试";
		return data;
	}
	
    return data;
    
}

function middle(pg,f,data,body,redis){
	let sql = '';
	let result = '';
	
	if(!(f.设置备注 || f.消息免打扰 || f.置顶聊天)){
    	data.状态 = '请选择修改类型';
    	return data;
    }
    
    
    if(!f.好友账号){
    	data.状态 = '好友账号不能为空';
    	return data;
    }
    
      //这里使用redis防止 单用户 并发处理   往队列中插入一条数据 设置1秒有效时间
	let redis_meg = redis_time(redis, 1, 'group_operateFriend' + f.账号);
	if (redis_meg.状态 != '成功') {
		data.状态 = '请不要重复点击';
		return data;
	}
	
	
	  //头部验证
    f.top = share.top(f.账号, f.随机码, pg);
    if (f.top.状态 != '成功') {
        data.状态 = f.top.状态;
        return data;
    } else if (f.top.会.出账 != '是') {
        data.状态 = '经系统检测到您有异常操作行为，功能暂停使用';
        return data;
    }
    
    let sqldata = '';
    if(f.设置备注){
    	sql = "update 群_好友表 set 备注名称 = $1 where 用户账号 = $2 and 好友账号 = $3 and 状态 != '已删除'";
    	sqldata = [f.设置备注];
    }
    
    if(f.消息免打扰){
    	sql = "update 群_好友表 set 免打扰 = $1 where 用户账号 = $2 and 好友账号 = $3 and 状态 != '已删除'";
    	sqldata = [f.消息免打扰];
    }
    
    if(f.置顶聊天){
    	sql = "update 群_好友表 set 消息置顶 = $1 where 用户账号 = $2 and 好友账号 = $3 and 状态 != '已删除'";
    	sqldata = [f.置顶聊天];
    }
    
    sqldata = sqldata.concat([f.账号,f.好友账号])
	result = pgdb.query(pg,sql,sqldata);
	if(result.状态 != '成功'){
		data.状态 = 'sql出错';
		return data;
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