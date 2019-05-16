/*
 * 创建人：Coding Farmer_2203
 * 创建内容：拒绝好友申请
 * 创建时间：2018-12-06
 * 创建版本: 1.1.0

func=group_refuseFriend

账号=138687
随机码=80af5be42c6d72428db65ffff46c1439
好友账号=555555
 */

var pgdb = require('../func/pgdb.js');
var share = require('./public/share.js');
var logs = require('../func/logs.js');
var redisdb = require('../func/redisdb.js');
var config = require('../func/config.js');
var request = require('../func/request.js');
var message_user = require('../groupchat/message_user.js');

module.exports.run = function(body, pg, mo, redis, pg2) {
	
    let data = {};
    data.状态 = '成功';
   
    let f = {};
    f = body.receive;
    
    let sql = '';
    let result = '';
    
    middle(pg,f,data,body,redis);
    
	sql = `insert into 日志_钱表(账号,时间,ip,类别,状态,录入人,录入时间,备注)values('${f.账号}','${body.date}','${body.ip}','拒绝好友申请','数据提交','系统','${body.date}','入参：${JSON.stringify(body)} 返回参数：${JSON.stringify(data)}')`;
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
	
	if(!f.账号){
    	data.状态 = '账号不能为空';
    	return data;
    }
    
    if(!f.好友账号){
    	data.状态 = '好友账号不能为空';
    	return data;
    }
    
      //这里使用redis防止 单用户 并发处理   往队列中插入一条数据 设置1秒有效时间
	let redis_meg = redis_time(redis, 1, 'group_refuseFriend_' + f.账号);
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
	
    sql = "SELECT id,打赏状态,打赏金额,申请信息 from 群_好友操作记录表 where 用户账号 = $1 and 好友用户账号 = $2 and 状态 = '待验证'";
	result = pgdb.query(pg,sql,[f.好友账号,f.账号]);
	if(result.状态 != '成功'){
		data.状态 = 'sql出错';
		return data;
	}
	
	if (result.数据.length == 0) {
		data.状态 = '该申请不存在';
		return data;
	}
	
	f.打赏金额 = result.数据[0].打赏金额;
	f.打赏状态 = result.数据[0].打赏状态;
	f.验证信息 = result.数据[0].申请信息;
	f.id = result.数据[0].id;
	
	
    //群_好友操作记录表   
    if(f.打赏金额  > 0 && f.打赏状态 == '打赏中' ){
    	sql = "update 群_好友操作记录表 set 状态 = '已拒绝',打赏状态 = '已退款' where id = '"+f.id+"'";
    }else{
    	sql = "update 群_好友操作记录表 set 状态 = '已拒绝' where id = '"+f.id+"'";
    }
   
    result = pgdb.query(pg,sql);
	if(result.状态 != '成功'){
		data.状态 = '网络异常，请稍后再试';
		return data;
	}
     
    //操作打赏金额
    if(f.打赏金额  > 0 && f.打赏状态 == '打赏中' ){
    	
	    sql = "select 唯一id from 存钱表 where 账号 = '888888888'";
	    result = pgdb.query(pg, sql);
	    if(result.状态 != '成功'){
	    	data.状态 = '网络异常';
	    	return data;
	    }
	    let zong_唯一id = result.数据[0].唯一id;
	    
	     //公司
	    sql = "select 唯一id from 会员表 where 账号 = $1";
	    result = pgdb.query(pg, sql,[f.好友账号]);
	    if(result.状态 != '成功'){
	    	data.状态 = '网络异常';
	    	return data;
	    }
	    let haoyou_唯一id = result.数据[0].唯一id;
	    
	    //减去总多汇币
	    let p = {};
		p.onlyId = zong_唯一id; 		
		p.integration = f.打赏金额; 		
		p.pay_type = '总多汇币'; 		
		p.explain = '加好友失败-公用账户出账'; 		
		p.pay_detail = '公用账户出账'; 		
		p.related_id = f.id; 		
		result = share.totalLoseMoney(p,pg,'');
		if (result.状态 != '成功') {
			logs.write('group_refuseFriend','加好友 ,func= totalLoseMoney'+",参数: "+JSON.stringify(p) + " ,result:" + JSON.stringify(result)+' , 时间: '+body.date);
			pgdb.query(pg,'RollBack');
			data.状态 = '网络异常3';	
			return data;
		}
  
		
	    //加个人多汇币
	    result = addPerson(haoyou_唯一id,f.打赏金额,'多汇币','加好友失败退回打赏金','加好友失败',f.id,'group_refuseFriend',body);
		if (result.状态  != '成功') {
			data.状态 = '网络异常，请稍后再试';
			pgdb.query(pg,'RollBack');
			return data;
		}

    }
    
    let p = {
		'用户账号':f.账号,
		'好友用户账号':f.好友账号,
		'消息内容':f.验证信息,
		'好友操作id':f.id
	};
	message_user.run(p, pg, redis, '好友通知');
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


function addPerson(onlyID,integration,pay_type,explain,pay_detail,related_id,func,body){
	let data  = {};
	data.状态 = '成功';
	
	
	let server = config.get('friend');
	let url = server.商城.Service_url + "ajax.post?func=p_add_cashredpacket";
	
	let r = {};
	r.func = 'p_add_cashredpacket'; 		//func号
	r.onlyID = onlyID; 			
	r.integration = integration; 		
	r.pay_type = pay_type; 		
	r.explain = explain; 		
	r.pay_detail = pay_detail; 		
	r.related_id = related_id; 		
	let result = request.post(url, r);
	logs.write('group_agreeFriend','同意好友申请 ,func= '+func+",参数: "+JSON.stringify(r) + " ,result:" + JSON.stringify(result)+' , 时间: '+body.date);
	/*请求超时*/
	if(result.信息=='socket hang up'){
		//超时处理
		data.状态 = result.信息;
		return data;
	}

	/*请求失败*/
	if(result.状态 != "成功") {
		data.状态 = result.状态;
		return data;
	}

	r.返回信息 = JSON.parse(result.信息);
	r.数据状态 = r.返回信息.状态;

	if(r.数据状态 != '成功') {
		data.状态 =  r.数据状态;
		return data;
	}else{
		data.order_id=r.返回信息.商户订单号;
	}

	return data;
	
}


