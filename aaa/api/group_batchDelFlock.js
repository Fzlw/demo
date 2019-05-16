/*
 * 创建人：Coding Farmer_2203
 * 创建内容：批量删除群员
 * 创建时间：2019-01-02
 * 创建版本: 1.1.0

func=group_batchDelFlock

账号=999999
随机码=bdbc7344c05ee24eaef055d01753af5b
删除群员=%5B%7B%22%E8%B4%A6%E5%8F%B7%22%3A%20%22555555%22%2C%22%E6%98%B5%E7%A7%B0%22%3A%20%22aa%22%7D%5D
群id=53610006

 */

var pgdb = require('../func/pgdb.js');
var share = require('./public/share.js');
var redisdb = require('../func/redisdb.js');
var message_user = require('../groupchat/message_user.js');
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
    
	sql = `insert into 日志_钱表(账号,时间,ip,类别,状态,录入人,录入时间,备注)values('${f.账号}','${body.date}','${body.ip}','批量删除群员','数据提交','系统','${body.date}','入参：${JSON.stringify(body)} 返回参数：${JSON.stringify(data)}')`;
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
    
      //这里使用redis防止 单用户 并发处理   往队列中插入一条数据 设置1秒有效时间
	let redis_meg = redis_time(redis, 1, 'group_batchDelFlock' + f.账号);
	if (redis_meg.状态 != '成功') {
		data.状态 = '请不要重复点击';
		return data;
	}
	
	if(f.删除群员){
		f.删除群员 = JSON.parse(decodeURIComponent(f.删除群员));
		if (f.删除群员.length > 5) {
			data.状态 = '最多删除5人';
    		return data;
		}
	}else{
		data.状态 = '删除群员不能为空';
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
    
    sql = "SELECT 群昵称,类别 from 群_群成员表 where  用户账号 = $1 and 群id = $2 and 状态 = '正常' ";
	result = pgdb.query(pg,sql,[f.账号,f.群id]);
	if(result.状态 != '成功'){
		data.状态 = '网络异常';
		return data;
	}
	
	if (result.数据.length == 0) {
		data.状态 = "你已被移除该群";
		return data;
	}
	
	f.类别 = result.数据[0].类别;
	let 群昵称 = result.数据[0].群昵称;
	
	let 账号列表 = [];
	for(let i in f.删除群员){
		账号列表.push(f.删除群员[i].账号)
	}
	
	sql = "SELECT 用户账号,类别 from 群_群成员表 where 用户账号 = any($1::varchar[]) and 群id = $2 and 状态 != '正常'";
	result = pgdb.query(pg,sql,[账号列表,f.群id]);
	if(result.状态 != '成功'){
		data.状态 = '网络异常';
		return data;
	}
	if (result.数据.length > 0) {
		let a = '';
		for(let i in result.数据){
			for (let j  in f.删除群员) {
				if (result.数据[i].用户账号 == f.删除群员[j].账号) {
					a += f.删除群员[j].昵称 + ',';
				}
			}
		}
		a = a.substring(0,a.length-1);
		data.状态 =  a + '已经退出群聊';
		return data;
	}
	
	
	if(f.类别 == '群员'){
		data.状态 =  '您已经不是管理员，无权进行此操作';
		return data;
	}else if(f.类别 == '管理员'){
		sql = "SELECT COUNT (ID) AS 操作人数 FROM 群_群操作记录表 WHERE 审核人id = $1 AND 类别 = '移除群聊' AND 群id = $2 AND substr(审核时间, 0, 11) = to_char(now(), 'YYYY-MM-DD')";
		result = pgdb.query(pg,sql,[f.账号,f.群id]);
		if(result.状态 != '成功'){
			data.状态 = '网络异常';
			return data;
		}
		
		if(result.数据.length > 0){
			if (Number(result.数据[0].操作人数) + Number(f.删除群员.length) > 5) {
				data.状态 = '每天删除人数不能超过五人';
				return data;
			}
		}
	}
	
	sql ="update 群_群成员表  set 状态='已退群' where 用户账号 = any($1::varchar[]) and 群id = $2";
	 
	result = pgdb.query(pg,sql,[账号列表,f.群id]);
	//console.log(result);
	if(result.状态 != '成功'){
		data.状态 = '网络异常';
		return data;
	}
	
	sql = "update 群_群信息表 set 群人数 = 群人数 - $1 where 群id = $2";
	result = pgdb.query(pg,sql,[f.删除群员.length,f.群id]);
	if(result.状态 != '成功'){
		data.状态 = '网络异常';
		return data;
	}
	
	sql = "INSERT INTO 群_群操作记录表 (群id, 用户账号, 申请信息, 打赏金额, 打赏状态, 审核人id, 审核角色, 类别, 状态, 录入人, 录入时间, 备注) VALUES ";
    let sqldata = [];
    for(let i in f.删除群员){
		sqldata = sqldata.concat([f.群id,f.删除群员[i].账号,'' ,0,'未打赏',f.账号,f.类别,'移除群聊','审核通过','系统',body.date,'']);
	}
    
    sql = getJoinFullSql(sql,f.删除群员.length);
    sql += ' returning id;';
    result = pgdb.query(pg, sql,sqldata);
	if (result.状态 != '成功') {
		data.状态 = "网络异常，请稍后再试";
		return data;
	}
//		console.log(result.数据);
	let idList = result.数据;
	
	sql = "INSERT INTO 群_好友群记录操作表 (操作账号, 记录id,类别, 状态, 录入人, 录入时间, 备注 ) VALUES";
	sqldata = [];
	for(let i in f.删除群员){
		sqldata = sqldata.concat([f.删除群员[i].账号,idList[i].id,'群','正常','系统',body.date,'']);
	}
	
	sql = getJoinFullSql(sql,f.删除群员.length);
	result = pgdb.query(pg,sql,sqldata);
	if(result.状态 != '成功'){
		data.状态 = '网络异常';
		return data;
	}
	
	for(let i in f.删除群员){
		let p = {
			'用户账号':f.账号,
			'好友用户账号':f.删除群员[i].账号,
			'消息内容':群昵称+'已将你移除群聊',
			'好友操作id':idList[i].id
		};
		
		message_user.run(p, pg, redis, '群通知');
		
		let m = {
			'用户账号':f.账号,
			'好友用户账号':f.删除群员[i].账号,
			'消息内容': '你已被移出群聊',
			'id':f.群id
		}
		message_remind.run(m, pg, redis, '群聊提醒');
	
		operation_group.run(f.删除群员[i].账号,f.群id, redis,'退群');
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



 

