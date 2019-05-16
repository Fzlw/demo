/* 
 * 创建人：Coding Farmer_2203
 * 创建内容：开始直播
 * 创建时间：2019-02-18
 * 创建版本: 1.1.0

func=group_beginLive

账号=18475632518
随机码=542af7076a411f892c08a284eeea6852
直播类型=培训直播
直播标题=dasda
封面图片=http://qqsdg.oss-cn-shenzhen.aliyuncs.com/sj-test/707105D4-D9B6-4E77-8BD0-88444730759142883349.jpg

 */

var share = require('./public/share.js');
var pgdb = require('../func/pgdb.js');
var redisdb = require('../func/redisdb.js');
var config = require('../func/config.js');
var crypto = require('crypto');
var md5 = require('md5');
var message_remind = require('../groupchat/message_remind.js');
var operation_group = require('../groupchat/operation_group.js');

module.exports.run = function(body, pg, mo,redis){
	
	let sql = '';
	let result = '';
	
	let data = {
		'状态':'成功'
	};
    
	f = body.receive;
	
	middle(pg,f,body,data,redis);
	
	sql = `insert into 日志_非钱表(账号,时间,ip,类别,状态,录入人,录入时间,备注)values('${f.账号}','${body.date}','${body.ip}','开始直播','数据提交','系统','${body.date}','入参：${JSON.stringify(body)} 返回参数：${JSON.stringify(data)}')`;
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
	
	if(!f.直播类型){
		data.状态 = "直播类型不能为空";
		return data;
	}
	
	if(f.直播类型 != '培训直播' && f.直播类型 != '娱乐直播'){
		data.状态 = "直播类型异常";
		return data;
	}
	
	if(!f.直播标题){
		data.状态 = "直播标题不能为空";
		return data;
	}
	
	if(!f.群id){
		data.状态 = "群id不能为空";
		return data;
	}
	
	if(f.直播标题.length > 20){
		data.状态 = "标题限制20字以内";
		return data;
	}
	
	if(!f.封面图片){
		f.封面图片 = 'https://qqsdg.oss-cn-shenzhen.aliyuncs.com/manage/2019042315314925257.png';
	}


	
   //处理图片链接
   var url = f.封面图片;
   if(url.indexOf('https:')==-1){
	   url= url.replace('http:','https:');
   }
   f.封面图片 = url;
	  //头部验证
    f.top = share.top(f.账号, f.随机码, pg);
    if (f.top.状态 != '成功') {
        data.状态 = f.top.状态;
        return data;
	} 
	

	var group_arr = {};
	sql = "SELECT 名称,直播状态 FROM 群_类型表";
    result = pgdb.query(pg,sql);
    if(result.状态 != '成功'){
    	data.状态 = '网络异常010';
    	return data;
    }
	else if(result.数据.length != 0){
		result.数据.forEach(function (s){
			group_arr[s.名称] = s.直播状态;
		})
		
	}


	sql = "select 群类型 from 群_群信息表 where 群id = $1";
	result = pgdb.query(pg,sql,[f.群id]);
	if(result.状态 != '成功'){
		data.状态 = "网络异常，请稍后再试010";
		return data;
	}
	else if(result.数据.length == 0){
		data.状态 = "无此群号";
		return data;
	}
	else if(group_arr[result.数据[0].群类型] != '是'){
		data.状态 = "此群无法直播";
		return data;
	}


    
     //这里使用redis防止 单用户 并发处理   往队列中插入一条数据 设置2秒有效时间
	let redis_meg = redis_time(redis, 1, 'beginLive' + f.账号);
	if (redis_meg.状态 != '成功') {
		data.状态 = "请不要重复点击";
		return data;
	}
	
	sql = "select id,状态,直播间id from 群_直播间表 where 主播id = $1";
	result = pgdb.query(pg,sql,[f.账号]);
	if(result.状态 != '成功'){
		data.状态 = "网络异常，请稍后再试";
		return data;
	}
	
	if(result.数据.length == 0) {
		
		let uuid = (((1+Math.random())*0x10000)|0).toString(16).substring(1);  
	
		//获取直播间表自增id
		sql = "SELECT nextval('群_直播间表_id_seq') as 直播id";
		result = pgdb.query(pg,sql);
		if(result.状态 != '成功'){
			data.状态 = "网络异常，请稍后再试";
			return data;
		}
		if(result.数据.length != 0) {
			f.直播id = result.数据[0].直播id;
		}else{
			data.状态 = "网络异常，请稍后再试";
			return data;
		}
		
		f.直播间id = uuid + '_' + f.直播id;
		
		sql = "INSERT INTO  群_直播间表 ( ID, 直播间id, 主播id, 直播标题, 直播分类, 封面图片, 类别, 状态, 录入人, 录入时间, 备注 ) VALUES ( $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,'');"
		result = pgdb.query(pg,sql,[f.直播id,f.直播间id,f.账号,f.直播标题,f.直播类型,f.封面图片,'群直播','直播中','系统',body.date]);
		if(result.状态 != '成功'){
			data.状态 = "网络异常，请稍后再试";
			return data;
		}
		
	}else{
		if(result.数据[0].状态 == '直播中'){
			data.状态 = '您有直播间未正常关闭，请先去关闭';
			return data;
		}
		
		f.直播间id = result.数据[0].直播间id;
		
		sql = "update 群_直播间表 set 直播标题 = $1, 直播分类 = $2, 封面图片 = $3,状态 ='直播中' where 主播id = $4 "
		result = pgdb.query(pg,sql,[f.直播标题,f.直播类型,f.封面图片,f.账号]);
		if(result.状态 != '成功'){
			data.状态 = "网络异常，请稍后再试";
			return data;
		}
		
		
		
		//判断推流回调是否多余数据
		sql = "update 群_推流回调记录表 set 状态 = '已处理' where 直播间id = $1 and 回调状态 = '断流' and 状态 = '未处理'";
		result = pgdb.query(pg,sql,[f.直播间id]);
		if(result.状态 != '成功'){
			data.状态 = "网络异常，请稍后再试";
			return data;
		}
	}
	sql = "INSERT INTO 群_直播间记录表 (直播间id, 主播id, 开始时间, 结束时间, 直播时长, 在线观看人数, 最高人数, 获得赞, 获得礼物, 类别, 状态, 录入人, 录入时间, 备注,直播群id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,$15) returning id ;"
	result = pgdb.query(pg,sql,[f.直播间id,f.账号,body.date,'','',0,0,0,0,'','直播中','系统',body.date,'',f.群id]);
	if(result.状态 != '成功'){
		data.状态 = "网络异常，请稍后再试";
		return data;
	}
	
	data.直播间id = f.直播间id;
	data.开播时间 = body.date;
	data.直播间记录id = result.数据[0].id;
	
	//获取推流地址
	let live = config.get('live');
	let date1 = Math.round(AddHours(new Date(),1).getTime()/1000);
	let sj = guid();
	
	let a = '/' + live.appName + '/' + f.直播间id + '-' + date1 + '-' + sj + '-0-' + live.推流密钥;
	
	var crypto = require('crypto');
	var md5 = require('md5');

	let r = 'rtmp://push.' + live.域名 + '/' + live.appName + '/' + f.直播间id + '?auth_key=';
	var md5 = crypto.createHash('md5');
    let cryptostr = md5.update(a).digest('hex');
    r = r + date1 + '-'+ sj + '-0-' + cryptostr;
    
    data.推流地址 = r;
    
	
	let m = {
		'直播状态':'直播中',
		'直播间id':f.直播间id,
		'群id':f.群id,
		'用户账号':f.账号,
		'直播间记录id':data.直播间记录id,
	}
	message_remind.run(m, pg, redis, '直播提醒');
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