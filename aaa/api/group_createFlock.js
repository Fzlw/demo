/*
 * 创建人：Coding Farmer_2203
 * 创建内容：创建群组
 * 创建时间：2018-12-06
 * 创建版本: 1.1.0

func=group_createFlock

账号=555555
随机码=f797dad1126dd2de00d606232324d280
群头像=http://qqsdg.oss-cn-shenzhen.aliyuncs.com/Userimage_test/pic2018051415371655.jpg
群名称=1111
群类型=培训群
群介绍=1
添加好友=%5B%7B%22%E8%B4%A6%E5%8F%B7%22%3A%20%22aa%22%2C%22%E6%98%B5%E7%A7%B0%22%3A%20%22aa%22%7D%5D
群位置=广东深圳
 */

var pgdb = require('../func/pgdb.js');
var share = require('./public/share.js');
var redisdb = require('../func/redisdb.js');
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
    
	sql = `insert into 日志_非钱表(账号,时间,ip,类别,状态,录入人,录入时间,备注)values('${f.账号}','${body.date}','${body.ip}','创建群组','数据提交','系统','${body.date}','入参：${JSON.stringify(body)} 返回参数：${JSON.stringify(data)}')`;
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

    if(!f.群头像){
    	data.状态 = '群头像不能为空';
    	return data;
    }
	
   //处理图片链接
   var url = f.群头像;
   if(url.indexOf('https:')==-1){
	   url= url.replace('http:','https:');
   }
   f.群头像 = url;
    
    if(!f.群名称){
    	data.状态 = '请设置群名称';
    	return data;
    }
   	
   	if(!f.群名称.length > 20){
    	data.状态 = '群名称20字以内';
    	return data;
    }
    
    if(!f.群类型){
    	data.状态 = '群类型不能为空';
    	return data;
    }
    
    if(!f.群介绍){
    	data.状态 = '群介绍不能为空';
    	return data;
    }
    
    if(!f.群介绍.length > 50){
    	data.状态 = '群介绍50字以内';
    	return data;
    }
    
    if(f.添加好友){

		f.添加好友 = JSON.parse(decodeURIComponent(f.添加好友));


		if (f.添加好友.length > 30) {
			data.状态 = '最多添加30人';
    		return data;
		}
		
	}
    
    if(!f.群位置){
    	data.状态 = '群位置不能为空';
    	return data;
    }
    
      //这里使用redis防止 单用户 并发处理   往队列中插入一条数据 设置1秒有效时间
	let redis_meg = redis_time(redis, 1, 'group_createFlock' + f.账号);
	if (redis_meg.状态 != '成功') {
		data.状态 = '请不要重复点击';
		return data;
	}
	
    sql = "SELECT id from 群_群信息表 where 群主id = $1 and 状态 = '正常'";
	result = pgdb.query(pg,sql,[f.账号]);
	if(result.状态 != '成功'){
		data.状态 = 'sql出错';
		return data;
	}
	
	if (result.数据.length >= 5) {
		data.状态 = '每个人最多创建五个群';
		return data;
	}
	
	/*sql = "SELECT id from 群_群信息表 where 群名称 = $1 and 状态 = '正常'";
	result = pgdb.query(pg,sql,[f.群名称]);
	if(result.状态 != '成功'){
		data.状态 = 'sql出错';
		return data;
	}
	
	if(result.数据.length > 0){
		data.状态 = '该群名称已被使用，请重新取名';
		return data;
	}*/
	  //头部验证
    f.top = share.top(f.账号, f.随机码, pg);
    if (f.top.状态 != '成功') {
        data.状态 = f.top.状态;
        return data;
    } else if (f.top.会.出账 != '是') {
        data.状态 = '经系统检测到您有异常操作行为，功能暂停使用';
        return data;
    }
	
   	//生成群号
   	let q4 = '';
   	for(let i=0;i<4;i++){
		q4 += Math.floor(Math.random()*10);
	}

   	//生成后四位随机数
   	let h4 = '';
   	sql = "select 群id from 群_群信息表 where 状态 = '正常' order by id desc ";
   	result = pgdb.query(pg,sql);
   	if(result.状态 != '成功'){
		data.状态 = 'sql出错';
		return data;
	}
	
	if (result.数据.length == 0) {
		h4 = '0000'
	}else{
		
		h4 = Number(result.数据[0].群id.substring(result.数据[0].群id.length - 4)) + 1;
		
		if (Number(h4) < 10) {
			h4 = '000'+ h4;
		}else if(Number(h4) < 100){
			h4 = '00'+ h4;
		}else if(Number(h4) < 1000){
			h4 = '0'+ h4;
		}else if(Number(h4) < 10000){
			h4 = h4;
		}else{
			h4 = '0000';
		}
	}
	
	let sjs = q4 + h4;
	
	sql = "select id from 群_群信息表 where 状态 = '正常' and 群id = '"+sjs+"'";
	result = pgdb.query(pg,sql);
   	if(result.状态 != '成功'){
		data.状态 = 'sql出错';
		return data;
	}
	if (result.数据.length > 0) {
		data.状态 = '网络异常，请稍后再试';
		return data;
	}
	
	if(f.添加好友){
		f.添加好友.push({
			'账号':f.账号,
			'昵称':f.top.会.昵称,
			'类别':'群主'
		});
	}else{
		f.添加好友 = [{
			'账号':f.账号,
			'昵称':f.top.会.昵称,
			'类别':'群主'
		}];
	}
	
	sql = "INSERT INTO 群_群成员表 ( 群id, 用户账号, 群昵称, 免打扰, 消息置顶, 类别, 状态, 录入人, 录入时间, 备注 ) VALUES";
	let sqldata = [];
	for(let i in f.添加好友){
		sqldata = sqldata.concat([sjs,f.添加好友[i].账号,f.添加好友[i].昵称,'否','否',f.添加好友[i].类别 || '群员','正常','系统',body.date,'']);
	}
	sql = getJoinFullSql(sql,f.添加好友.length);
	result = pgdb.query(pg,sql,sqldata);
	if(result.状态 != '成功'){
		data.状态 = 'sql出错';
		return data;
	}
	
	sql = "INSERT INTO 群_群信息表 ( 群id, 群名称, 群头像, 群二维码, 群主id, 群人数, 群简介, 上限人数, 群类型, 群位置, 类别, 状态, 录入人, 录入时间, 备注) VALUES ( $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15);";
	result = pgdb.query(pg,sql,[sjs,f.群名称,f.群头像,'',f.账号,f.添加好友.length,f.群介绍,200,f.群类型,f.群位置,'正常','正常','系统',body.date,'']);
	if(result.状态 != '成功'){
		data.状态 = 'sql出错';
		return data;
	}
	
    var  str =  f.群介绍 || '发布的各种信息（包括言论，所发图片及资源）严禁涉及谣言谣传、侮辱诽谤他人或团体，严禁涉及政治，封建迷信。严重血腥暴力、反动思想，否则后果自负';
	
	for(let i in f.添加好友){
		var m = {
		'用户账号':f.账号,
		'好友用户账号':f.添加好友[i].账号,
		'消息内容': str,
		'id':sjs
		}
		message_remind.run(m, pg, redis, '加群简介提示');

		var str1 = '您已加入该群聊，快和大家打个招呼吧~';
		m = {
			'用户账号':f.账号,
			'好友用户账号':f.添加好友[i].账号,
			'消息内容': str1,
			'id':sjs
		}

		message_remind.run(m, pg, redis, '群聊提醒');
		operation_group.run(f.添加好友[i].账号,sjs, redis,'入群');
	}
	
	data.群id = sjs;
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