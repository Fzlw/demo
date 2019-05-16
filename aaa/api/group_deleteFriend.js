/*
 * 创建人：Coding Farmer_2203
 * 创建内容：删除好友
 * 创建时间：2018-12-17
 * 创建版本: 1.1.0

func=group_deleteFriend

账号=555555
随机码=f797dad1126dd2de00d606232324d280
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
    
	sql = `insert into 日志_非钱表(账号,时间,ip,类别,状态,录入人,录入时间,备注)values('${f.账号}','${body.date}','${body.ip}','删除好友','数据提交','系统','${body.date}','入参：${JSON.stringify(body)} 返回参数：${JSON.stringify(data)}')`;
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
	
	if(!f.好友账号){
    	data.状态 = '好友账号不能为空';
    	return data;
    }
    
      //这里使用redis防止 单用户 并发处理   往队列中插入一条数据 设置1秒有效时间
	let redis_meg = redis_time(redis, 1, 'group_deleteFriend_' + f.账号);
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
    
	sql = "SELECT id from 群_好友表 where 用户账号 = $1 and 好友账号 = $2 and 状态 != '已删除'";
	result = pgdb.query(pg,sql,[f.账号,f.好友账号]);
	if(result.状态 != '成功'){
		data.状态 = 'sql出错';
		return data;
	}
	
	if (result.数据.length == 0) {
		data.状态 = '你们还不是好友';
		return data;
	}
	
	let id = [result.数据[0].id];
	
	sql = "SELECT id from 群_好友表 where 用户账号 = $1 and 好友账号 = $2 and 状态 != '已删除'";
	result = pgdb.query(pg,sql,[f.好友账号,f.账号]);
	if(result.状态 != '成功'){
		data.状态 = 'sql出错';
		return data;
	}
	
	if (result.数据.length == 0) {
		data.状态 = '你们还不是好友';
		return data;
	}
	
	id.push(result.数据[0].id);
	
    sql = "delete from 群_好友表   where id in ("+id+")" ;
    result = pgdb.query(pg, sql);
	if (result.状态 != '成功') {
		data.状态 = "网络异常，请稍后再试";
		pgdb.query(pg,'RollBack');
		return data;
	}
	
	sql = "INSERT INTO 群_好友操作记录表 (用户账号, 好友用户账号, 打赏金额, 打赏状态, 申请信息, 申请来源, 类别, 状态, 录入人, 录入时间, 备注 ) VALUES ($1, $2, $3, $4, $5, '', '删除好友', '验证通过', '系统', '"+body.date+"', '' );";
    result = pgdb.query(pg, sql,[f.账号,f.好友账号,0,'未打赏','']);
	if (result.状态 != '成功') {
		data.状态 = "网络异常，请稍后再试";
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