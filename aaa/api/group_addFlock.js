/*
 * 创建人：Coding Farmer_2203
 * 创建内容：添加群
 * 创建时间：2018-12-10
 * 创建版本: 1.1.0

func=group_addFlock

账号=138687
随机码=80af5be42c6d72428db65ffff46c1439
群id=3560004
验证信息=1111
打赏金额=1
 */

var pgdb = require('../func/pgdb.js');
var share = require('./public/share.js');
var logs = require('../func/logs.js');
var redisdb = require('../func/redisdb.js');
var message_user = require('../groupchat/message_user.js');

module.exports.run = function(body, pg, mo, redis, pg2) {
	
    let data = {};
    data.状态 = '成功';
   
    let f = {};
    f = body.receive;
    
    let sql = '';
    let result = '';
    
    middle(pg,f,data,body,redis);
    
	sql = `insert into 日志_钱表(账号,时间,ip,类别,状态,录入人,录入时间,备注)values('${f.账号}','${body.date}','${body.ip}','添加群','数据提交','系统','${body.date}','入参：${JSON.stringify(body)} 返回参数：${JSON.stringify(data)}')`;
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
	
    if(!f.群id){
    	data.状态 = '群id不能为空';
    	return data;
    }
    
    if(!f.验证信息){
    	data.状态 = '验证信息不能为空';
    	return data;
    }
    
    if(f.验证信息.length > 20){
    	data.状态 = '验证信息不能超过20字';
    	return data;
    }
    
    if(!f.打赏金额){
    	data.状态 = '打赏金额不能为空';
    	return data;
    }
    
    f.打赏金额 = Number(f.打赏金额);
    
    if(isNaN(f.打赏金额)){
    	data.状态 = '打赏金额必须为数字';
    	return data;
    }
    
    if(!Number.isInteger(f.打赏金额)){
    	data.状态 = '打赏金额必须为整数';
    	return data;
    }
      //这里使用redis防止 单用户 并发处理   往队列中插入一条数据 设置1秒有效时间
	let redis_meg = redis_time(redis, 1, 'group_addFlock' + f.账号);
	if (redis_meg.状态 != '成功') {
		data.状态 = '请不要重复点击';
		return data;
	}
	
//	redisdb.close(redis);
	
    sql = "SELECT id from 群_群操作记录表 where 用户账号 = $1 and 群id = $2 and 状态 = '待审核'";
	result = pgdb.query(pg,sql,[f.账号,f.群id]);
	if(result.状态 != '成功'){
		data.状态 = 'sql出错';
		return data;
	}
	if (result.数据.length > 0) {
		data.状态 = '您的加群申请已发送，请耐心等待对方通过';
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
	
	sql = "SELECT id from 群_群成员表 where 用户账号 = $1 and 群id = $2 and 状态 = '正常'";
	result = pgdb.query(pg,sql,[f.账号,f.群id]);
	if(result.状态 != '成功'){
		data.状态 = 'sql出错';
		return data;
	}
	
	if (result.数据.length > 0) {
		data.状态 = '您已经是群成员了';
		return data;
	}
	
	
	sql = "SELECT id,群名称 from 群_群信息表 where  群id = $1 and 状态 = '正常'";
	result = pgdb.query(pg,sql,[f.群id]);
	if(result.状态 != '成功'){
		data.状态 = 'sql出错';
		return data;
	}
	if (result.数据.length == 0) {
		data.状态 = '该群不存在';
		return data;
	}
	f.群名称 = result.数据[0].群名称;
	
   	sql = "SELECT nextval('群_群操作记录表_id_seq') as id";
	result = pgdb.query(pg,sql);
	if(result.状态 != '成功'){
		data.状态 = 'sql出错';
		return data;
	}
	let id = result.数据[0].id;
    
    if(f.打赏金额  > 0){
    	f.打赏状态 = '打赏中';
    	sql = "select 最低金额,最高金额 from 群_打赏参数表 where 状态 = '正常' limit 1";
    	result = pgdb.query(pg,sql);
    	if(result.状态 != '成功'){
	    	data.状态 = '网络异常';
	    	return data;
	    }
	    
	    if(result.数据.length == 0){
	    	data.状态 = '参数设置表异常';
	    	return data;
	    }
	    
	    if(f.打赏金额 < result.数据[0].最低金额 || f.打赏金额 > result.数据[0].最高金额){
	    	data.状态 = '打赏金额在'+result.数据[0].最低金额 +'~'+result.数据[0].最高金额+'之间';
	    	return data;
	    }
	    
	    let 多汇币 = f.top.会.多汇币;
	    let 唯一id = f.top.会.唯一id;
	    
	    if(多汇币 <  f.打赏金额){
	    	data.状态 = '多汇币不足';
	    	return data;
	    }
	    
	    sql = "select 唯一id from 存钱表 where 账号 = '888888888'";
	    result = pgdb.query(pg, sql);
	    if(result.状态 != '成功'){
	    	data.状态 = '网络异常';
	    	return data;
	    }
	    let zong_唯一id = result.数据[0].唯一id;
	    
	    //减去个人多汇币
	    let m = {};
		m.onlyId = 唯一id;
		m.pay_type = '多汇币';
		m.explain = '申请加群';
		m.integration = f.打赏金额;
		m.related_id = id;
		m.pay_detail = '加群打赏';
		m.total_pay_data = [];
		result = share.pay(m,pg);
		if(result.状态 != '成功'){
			logs.write('group_addFlock','加好友 ,func= pay'+",参数: "+JSON.stringify(m) + " ,result:" + JSON.stringify(result)+' , 时间: '+body.date);
			pgdb.query(pg,'RollBack');
			data.状态 = '网络异常2';	
			return data;
		}
			
		let p = {};
		p.onlyId = zong_唯一id; 		
		p.integration = f.打赏金额; 		
		p.pay_type = '总多汇币'; 		
		p.explain = '加群打赏-公用账户入账'; 		
		p.pay_detail = '公用账户入账'; 		
		p.related_id = id; 		
		result = share.totalAddMoney(p,pg,'');
		if (result.状态 != '成功') {
			logs.write('group_addFlock','加好友 ,func= totalAddMoney'+",参数: "+JSON.stringify(p) + " ,result:" + JSON.stringify(result)+' , 时间: '+body.date);
			pgdb.query(pg,'RollBack');
			data.状态 = '网络异常3';	
			return data;
		}
	    
    }else{
    	f.打赏状态 = '未打赏';
    }
    
    sql = "INSERT INTO 群_群操作记录表 (id, 群id, 用户账号, 申请信息, 打赏金额, 打赏状态, 审核人id, 审核角色, 类别, 状态, 录入人, 录入时间, 备注) VALUES ('"+id+"', $1, $2, $3, $4, $5, '', '', '搜索添加', '待审核', '系统', '"+body.date+"', '');"
//  sql = "INSERT INTO 群_好友操作记录表 (id,用户账号, 好友用户账号, 打赏金额, 打赏状态, 申请信息, 申请来源, 类别, 状态, 录入人, 录入时间, 备注 ) VALUES ( '"+id+"',$1, $2, $3, $4, $5, '搜索添加', '正常', '待验证', '系统', '"+body.date+"', '' );";
    result = pgdb.query(pg, sql,[f.群id,f.账号,f.验证信息,f.打赏金额,f.打赏状态]);
	if (result.状态 != '成功') {
		data.状态 = "网络异常，请稍后再试";
		pgdb.query(pg,'RollBack');
		return data;
	}
	
	sql = "SELECT 用户账号 from 群_群成员表 where  群id = $1 and 状态 = '正常' and 类别 in ('管理员','群主')";
	result = pgdb.query(pg,sql,[f.群id]);
	if(result.状态 != '成功'){
		data.状态 = 'sql出错';
		return data;
	}
	
	if (result.状态 != '成功') {
		data.状态 = "网络异常，请稍后再试";
		pgdb.query(pg,'RollBack');
		return data;
	}
	
	if (result.数据.length != 0) {
		
		let qun = result.数据;
		
		sql = "INSERT INTO 群_好友群记录操作表 (操作账号, 记录id,类别, 状态, 录入人, 录入时间, 备注 ) VALUES";
		let sqldata = [f.账号,id,'群','正常','系统',body.date,''];
		for(let i in qun){
			sqldata = sqldata.concat([qun[i].用户账号,id,'群','正常','系统',body.date,'']);
		}
		sql = getJoinFullSql(sql,qun.length + 1);
		result = pgdb.query(pg,sql,sqldata);
		if(result.状态 != '成功'){
			data.状态 = '网络异常';
			pgdb.query(pg,'RollBack');
			return data;
		}
		
		for(let i in qun){
			let p = {
				'用户账号':f.账号,
				'好友用户账号':qun[i].用户账号,
				'消息内容':f.top.会.昵称 + '申请加入'+ f.群名称,
				'验证消息':f.验证信息,
				'好友操作id':id
			};
			message_user.run(p, pg, redis, '群通知');
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


function getJoinFullSql(text, int) {
    if (typeof text != 'string') {
        throw new TypeError('text expects is string')
    }
    if (typeof int != 'number') {
        throw new TypeError('int expects an integer')
    }
    let str = '';
    const repval = text.repeat(int);
    const regex = new RegExp(',', 'g');
    const result = repval.match(regex);
    const count = !result ? 0 : (result.length + int);
    const meanVal = count / int;
    for (let i = 0; i < count; i++) {
        str += `, $${i + 1}`;
    }
    let sub = `(${str.substr(2)})`
    for (let i = 0; i < int - 1; i++) {
        const item = (i + 1) * meanVal;
        sub = sub.replace(`$${item},`, `$${item}),(`)
    }
    return `${text}${sub}`;
}