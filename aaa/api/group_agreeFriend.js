/*
 * 创建人：Coding Farmer_2203
 * 创建内容：同意好友申请
 * 创建时间：2018-11-13
 * 创建版本: 1.1.0

func=group_agreeFriend

账号=18475632518
随机码=d0707e2776d11569c9400c785622fc2e
好友账号=555555
省=
市=
区=
 */

var pgdb = require('../func/pgdb.js');
var share = require('./public/share.js');
var logs = require('../func/logs.js');
var redisdb = require('../func/redisdb.js');
var config = require('../func/config.js');
var request = require('../func/request.js');
var message_user = require('../groupchat/message_user.js');
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
    
    if(!f.省){
    	f.省 = '';
    }
    if(!f.市){
    	f.市 = '';
    }
    if(!f.区){
    	f.区 = '';
    }
    
      //这里使用redis防止 单用户 并发处理   往队列中插入一条数据 设置1秒有效时间
	let redis_meg = redis_time(redis, 1, 'group_agreeFriend_' + f.账号);
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
	
	sql = "SELECT id from 群_好友表 where 用户账号 = $1 and 好友账号 = $2 and 状态 = '正常'";
	result = pgdb.query(pg,sql,[f.好友账号,f.账号]);
	if(result.状态 != '成功'){
		data.状态 = 'sql出错';
		return data;
	}
	
	if (result.数据.length > 0) {
		data.状态 = '你们已经是好友了';
		return data;
	}
	
    //群_好友操作记录表   
    if(f.打赏金额  > 0 && f.打赏状态 == '打赏中' ){
    	sql = "update 群_好友操作记录表 set 状态 = '验证通过',打赏状态 = '已打赏' where id = '"+f.id+"'";
    }else{
    	sql = "update 群_好友操作记录表 set 状态 = '验证通过' where id = '"+f.id+"'";
    }
    result = pgdb.query(pg,sql);
	if(result.状态 != '成功'){
		data.状态 = '网络异常，请稍后再试';
		return data;
	}
    
    //操作好友表
	sql = "INSERT INTO 群_好友表 (用户账号, 好友账号, 备注名称, 免打扰, 消息置顶, 类别, 状态, 录入人, 录入时间, 备注 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);";
    result = pgdb.query(pg, sql,[f.好友账号,f.账号,'','否','否','正常','正常','系统',body.date,'']);
	if (result.状态 != '成功') {
		data.状态 = "网络异常，请稍后再试";
		return data;
	}
	
	sql = "select 昵称 from 会员表 where 账号 = $1";
	result = pgdb.query(pg,sql,[f.好友账号]);
	if(result.状态 != '成功'){
		data.状态 = 'sql出错';
		return data;
	}
	
	if (result.数据.length == 0) {
		data.状态 = '该成员不存在';
		return data;
	}
	
	let 好友昵称 = result.数据[0].昵称
	sql = "INSERT INTO 群_好友表 (用户账号, 好友账号, 备注名称, 免打扰, 消息置顶, 类别, 状态, 录入人, 录入时间, 备注 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);";
    result = pgdb.query(pg, sql,[f.账号,f.好友账号,'','否','否','正常','正常','系统',body.date,'']);
	if (result.状态 != '成功') {
		data.状态 = "网络异常，请稍后再试";
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
	    
	    sql = "select 平台扣点 from 平台扣点表 where 平台类别 = '赏金币'";
	    result = pgdb.query(pg, sql);
	    if(result.状态 != '成功'){
	    	data.状态 = '网络异常';
	    	return data;
	    }
	    let 平台扣点 = result.数据[0].平台扣点;
	    if(Number(平台扣点) > 1 || Number(平台扣点) < 0){
	    	data.状态 = '平台扣点异常';
	    	pgdb.query(pg,'RollBack');
	    	return data;
	    }
	    
	     //公司
	    sql = "select 唯一id from 会员表 where 账号 = '99999999999'";
	    result = pgdb.query(pg, sql);
	    if(result.状态 != '成功'){
	    	data.状态 = '网络异常';
	    	return data;
	    }
	    let 公司_唯一id = result.数据[0].唯一id;
	    
	    let 个人赏金币 = Number((1 - 平台扣点) * f.打赏金额).toFixed(2);
		let 公司赏金币 = Number(f.打赏金额 - 个人赏金币).toFixed(2);
		
	    sql = "INSERT INTO 收入表 ( 唯一id, 关联id, 金额, 说明, 录入人, 录入时间, 备注) VALUES ( $1, '"+f.id+"', "+个人赏金币+", '同意加好友申请', '系统', '"+body.date+"', '');"
		result = pgdb.query(pg,sql,[f.top.会.唯一id]);
		if(result.状态 != '成功'){
			data.状态 = '网络异常';
	    	return data;
		}
		
	    //减去总多汇币
	    let p = {};
		p.onlyId = zong_唯一id; 		
		p.integration = f.打赏金额; 		
		p.pay_type = '总多汇币'; 		
		p.explain = '好友打赏-公用账户出账'; 		
		p.pay_detail = '公用账户出账'; 		
		p.related_id = f.id; 		
		result = share.totalLoseMoney(p,pg,'');
		if (result.状态 != '成功') {
			logs.write('group_agreeFriend','加好友 ,func= totalLoseMoney'+",参数: "+JSON.stringify(p) + " ,result:" + JSON.stringify(result)+' , 时间: '+body.date);
			pgdb.query(pg,'RollBack');
			data.状态 = '网络异常3';	
			return data;
		}
		
		//加总赏金币
	    p = {};
		p.onlyId = zong_唯一id; 		
		p.integration = f.打赏金额; 		
		p.pay_type = '总赏金币'; 		
		p.explain = '好友打赏-公用账户入账'; 		
		p.pay_detail = '公用账户入账'; 		
		p.related_id = f.id; 		
		result = share.totalAddMoney(p,pg,'');
		if (result.状态 != '成功') {
			logs.write('group_agreeFriend','加好友 ,func= totalAddMoney'+",参数: "+JSON.stringify(p) + " ,result:" + JSON.stringify(result)+' , 时间: '+body.date);
			pgdb.query(pg,'RollBack');
			data.状态 = '网络异常3';	
			return data;
		}
		
		//减赏金币给公司
	    p = {};
		p.onlyId = zong_唯一id; 		
		p.integration = 公司赏金币; 		
		p.pay_type = '总赏金币'; 		
		p.explain = '群打赏-公用账户出账'; 		
		p.pay_detail = '公用账户出账'; 		
		p.related_id = f.id; 		
		result = share.totalLoseMoney(p,pg,'');
		if (result.状态 != '成功') {
			logs.write('group_agreeFlock','加好友 ,func= totalAddMoney'+",参数: "+JSON.stringify(p) + " ,result:" + JSON.stringify(result)+' , 时间: '+body.date);
			pgdb.query(pg,'RollBack');
			data.状态 = '网络异常3';	
			return data;
		}
//		
//		//加公司
	    result = addPerson(公司_唯一id,公司赏金币,'赏金币','固定账户(好友打赏)','平台扣点',f.id,'group_agreeFriend',body);
		if (result.状态  != '成功') {
			data.状态 = '网络异常，请稍后再试';
			pgdb.query(pg,'RollBack');
			return data;
		}

		//减赏金币给个人
	    p = {};
		p.onlyId = zong_唯一id; 		
		p.integration = 个人赏金币; 		
		p.pay_type = '总赏金币'; 		
		p.explain = '好友打赏-公用账户出账'; 		
		p.pay_detail = '公用账户出账'; 		
		p.related_id = f.id; 		
		result = share.totalLoseMoney(p,pg,'');
		if (result.状态 != '成功') {
			logs.write('group_agreeFriend','加好友 ,func= totalAddMoney'+",参数: "+JSON.stringify(p) + " ,result:" + JSON.stringify(result)+' , 时间: '+body.date);
			pgdb.query(pg,'RollBack');
			data.状态 = '网络异常3';	
			return data;
		}
		
	    //加个人赏金币
	    result = addPerson(f.top.会.唯一id,个人赏金币,'赏金币','同意加好友申请','好友打赏',f.id,'group_agreeFriend',body);
		if (result.状态  != '成功') {
			data.状态 = '网络异常，请稍后再试';
			pgdb.query(pg,'RollBack');
			return data;
		}

    }
    pgdb.query(pg,'COMMIT;');
    pgdb.query(pg,'BEGIN;');
    
    let p = {
		'用户账号':f.账号,
		'好友用户账号':f.好友账号,
		'消息内容':f.top.会.昵称 + '已同意你的好友申请',
		'验证消息':f.验证信息,
		'好友操作id':f.id
	};
	message_user.run(p, pg, redis, '好友通知');
	
	//版本控制
	if (f.版本号 > '1.9.0') {
		let m = {
			'用户账号':f.账号,
			'好友用户账号':f.好友账号,
			'消息内容': '你们已经成为好友了，快和对方打个招呼吧~',
			'id':f.账号
		}
		message_remind.run(m, pg, redis, '私聊提醒');
		
		m = {
			'用户账号':f.好友账号,
			'好友用户账号':f.账号,
			'消息内容': '你们已经成为好友了，快和对方打个招呼吧~',
			'id':f.好友账号
		}
		message_remind.run(m, pg, redis, '私聊提醒');
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


