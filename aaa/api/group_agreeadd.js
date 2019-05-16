/*
 * 创建人：Coding Farmer_1206
 * 创建内容：同意加群
 * 创建时间：2019-04-16
 * 创建版本: 1.1.0

func=group_agreeFlock

账号=555555
随机码=f797dad1126dd2de00d606232324d280
群id=22920000
群成员账号=147258
群成员昵称=ads
 */

var pgdb = require('../func/pgdb.js');
var share = require('./public/share.js');
var logs = require('../func/logs.js');
var redisdb = require('../func/redisdb.js');
var config = require('../func/config.js');
var request = require('../func/request.js');
var operation_group = require('../groupchat/operation_group.js');
var message_remind = require('../groupchat/message_remind.js');

module.exports.run = function(body, pg, mo, redis, pg2) {
	
    let data = {};
    data.状态 = '成功';
   
    let f = {};
    f = body.receive;
    
    let sql = '';
    let result = '';
    
    middle(pg,f,data,body,redis);
    
	sql = `insert into 日志_钱表(账号,时间,ip,类别,状态,录入人,录入时间,备注)values('${f.账号}','${body.date}','${body.ip}','同意好友申请','数据提交','系统','${body.date}','入参：${JSON.stringify(body)} 返回参数：${JSON.stringify(data)}')`;
	result = pgdb.query(pg, sql);
	if (result.状态 != '成功') {
		data.状态 = "网络异常，请稍后再试";
		return data;
	}
	data.群名称 = f.群名称;
    return data;    
}

function middle(pg,f,data,body,redis){
	let sql = '';
	let result = '';
	
    
    if(!f.群id){
    	data.状态 = '群id不能为空';
    	return data;
    }
    
    if(!f.账号){
    	data.状态 = '账号不能为空';
    	return data;
    }
    
    if(!f.随机码){
    	data.状态 = '随机码不能为空';
    	return data;
    }
    
    //这里使用redis防止 单用户 并发处理   往队列中插入一条数据 设置1秒有效时间
	let redis_meg = redis_time(redis, 1, 'group_agreeFlock_' + f.账号);
	if (redis_meg.状态 != '成功') {
		data.状态 = '请不要重复操作';
		return data;
	}
	
//	redisdb.destroy(redis);
	
	//头部验证
    f.top = share.top(f.账号, f.随机码, pg);
    if (f.top.状态 != '成功') {
        data.状态 = f.top.状态;
        return data;
    } else if (f.top.会.出账 != '是') {
        data.状态 = '经系统检测到您有异常操作行为，功能暂停使用';
        return data;
    }
    
    f.昵称=f.top.会.昵称;
    
    
    sql = "SELECT 是否禁言,群主id,群名称,群简介 from 群_群信息表  where 群id=$1 and 状态='正常'";
	result = pgdb.query(pg,sql,[f.群id]);
	if(result.状态 != '成功'){
		data.状态 = '网络异常，请稍后再试';
		return data;
	}
	if (result.数据.length == 0) {
		data.状态 = '群信息不存在，或者已解散';
		return data;
	}
	f.是否禁言= result.数据[0].是否禁言;
	f.群主id=result.数据[0].群主id;
	f.群名称=result.数据[0].群名称;
	f.群简介 = result.数据[0].群简介;

    //群_群信息表
    sql = "update 群_群信息表 set 群人数 = 群人数 + 1 where 群id = $1 and 群人数 < 上限人数 ";
	result = pgdb.query(pg,sql,[f.群id]);
	if(result.状态 != '成功' || result.影响行数  == 0){
		data.状态 = '群人数已达上限';
		pgdb.query(pg,'RollBack');
		return data;
	}
	
    //操作群_群成员表
    sql = "SELECT id from 群_群成员表 where 用户账号 = $1 and 群id = $2";
	result = pgdb.query(pg,sql,[f.账号,f.群id]);
	if(result.状态 != '成功'){
		data.状态 = 'sql出错';
		return data;
	}
	if (result.数据.length > 0) {
		let id = result.数据[0].id;
		sql = "update 群_群成员表 set 状态 = '正常',类别 = '群员'where id = '"+id+"'";
		result = pgdb.query(pg, sql);
		if (result.状态 != '成功') {
			data.状态 = "网络异常，请稍后再试";
			return data;
		}
	}else{
    	sql = "INSERT INTO 群_群成员表 (群id, 用户账号, 群昵称, 免打扰, 消息置顶, 类别, 状态, 录入人, 录入时间, 备注,是否禁言) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,$11);"
	    result = pgdb.query(pg, sql,[f.群id,f.账号,f.昵称,'否','否','群员','正常','系统',body.date,'',f.是否禁言]);
		if (result.状态 != '成功') {
			data.状态 = "网络异常，请稍后再试";
			return data;
		}
		
	}

	var  str =  f.群简介 || '发布的各种信息（包括言论，所发图片及资源）严禁涉及谣言谣传、侮辱诽谤他人或团体，严禁涉及政治，封建迷信。严重血腥暴力、反动思想，否则后果自负';
	var m = {
		'用户账号':f.群主id,
		'好友用户账号':f.账号,
		'消息内容': str,
		'id':f.群id
	}
	message_remind.run(m, pg, redis, '加群简介提示');
	str = '您已加入该群聊，快和大家打个招呼吧~';
	m = {
		'用户账号':f.群主id,
		'好友用户账号':f.账号,
		'消息内容': str,
		'id':f.群id
	}
	message_remind.run(m, pg, redis, '群聊提醒');
	operation_group.run(f.账号,f.群id, redis,'入群');	
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
	r.func = 'p_add_cashredpacket';  //func号
	r.onlyID = onlyID; 			
	r.integration = integration; 		
	r.pay_type = pay_type; 		
	r.explain = explain; 		
	r.pay_detail = pay_detail; 		
	r.related_id = related_id; 		
	let result = request.post(url, r);
	logs.write('group_agreeFlock','同意好友申请 ,func= '+func+",参数: "+JSON.stringify(r) + " ,result:" + JSON.stringify(result)+' , 时间: '+body.date);
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


