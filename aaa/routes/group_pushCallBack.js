/*
 * 创建人:Coding Farmer_2203
 * 创建时间：2018-06-220
 * 内容：推流回调
 * 版本：1.1.0
 * 

func=y_selectOilDetails
account=17665476893
random=fd4dd77ca9865e9ed571d4144988d406
pumpID=油品id
*/
var pgdb = require('../func/pgdb.js');

module.exports.run = function(body, pg, redis) {
	
	
	var f = {};
	f = body.arg;
	let result = '';
	let sql = '';
	
	var data = {};
	data.状态 = '成功';
	data._isRander = 'SUCCESS';
	middle(pg,f,body,data);
			
	sql = `insert into 日志_非钱表(账号,时间,ip,类别,状态,录入人,录入时间,备注)values('${f.id}','${body.date}','${body.ip}','推流回调','数据提交','系统','${body.date}','入参：${JSON.stringify(body)} 返回参数：${JSON.stringify(data)}')`;
	result = pgdb.query(pg, sql);
	if (result.状态 != '成功') {
		data.状态 = "网络异常，请稍后再试";
		return data;
	}
	return data;
}

function middle(pg,f,body,data){
	
	let result = '';
	let sql = '';
	
	sql = "select id from 群_推流回调记录表 where 直播间id = $1 and 回调状态 = '断流' and 状态 = '未处理' order by id desc";
	result = pgdb.query(pg,sql,[f.id]);
	if (result.状态 != '成功') {
		data.状态 = "网络异常，请稍后再试";
		return data;
	}
	
	let num = 0;
	let id = 0;
	if(result.数据.length == 0){
		num = 0;
	}else{
		num = 1;
		id = result.数据[0].id;
	}
	
	if(num == 0 && f.action == 'publish_done'){
		sql = "INSERT INTO 群_推流回调记录表 (直播间id, 回调时间, 回调状态, 状态, 回调内容, 录入人, 录入时间, 备注) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);"
		result = pgdb.query(pg,sql,[f.id,body.date,'断流','未处理',JSON.stringify(body),'系统',body.date,'']);
		if (result.状态 != '成功') {
			data.状态 = "网络异常，请稍后再试";
			return data;
		}
	}
	
	
	if(num == 1 && f.action == 'publish'){
		
		sql = "update 群_推流回调记录表 set 回调状态 = '推流',状态 = '已处理' where id = $1"
		result = pgdb.query(pg,sql,[id]);
		if (result.状态 != '成功') {
			data.状态 = "网络异常，请稍后再试";
			return data;
		}
	}
}


