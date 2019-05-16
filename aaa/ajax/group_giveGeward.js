/* 
 * 创建人：Coding Farmer_2203
 * 创建内容：打赏消息
 * 创建时间：2019-03-05
 * 创建版本: 1.1.0

func=group_endLive

账号=18475632518
随机码=01c1b5f4cb75937bbee3571ef32a3715
直播间id=5678_1
直播间记录id=4
直播时长=2
 */

var pgdb = require('../func/pgdb.js');
var message_live_remind = require('../groupchat/message_live_remind.js');

module.exports.run = function(body, pg, mo,redis){
	
	let sql = '';
	let result = '';
	
	let data = {
		'状态':'成功'
	};
    
	f = body;
	
	middle(pg,f,body,data,redis);
	
	sql = `insert into 日志_非钱表(账号,时间,ip,类别,状态,录入人,录入时间,备注)values('${f.账号}','${body.date}','${body.ip}','打赏消息','数据提交','系统','${body.date}','入参：${JSON.stringify(body)} 返回参数：${JSON.stringify(data)}')`;
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
	
	if(!f.直播间id){
		data.状态 = "直播间id不能为空";
		return data;
	}
	
	//if(!f.群id){
		//data.状态 = "群id不能为空";
		//return data;
	//}
	
	if(!f.头像){
		data.状态 = "头像不能为空";
		return data;
	}
	
	if(!f.金额){
		data.状态 = "金额不能为空";
		return data;
	}
	
	if(!f.账号){
		data.状态 = "账号不能为空";
		return data;
	}
	
	if(!f.主播id){
		data.状态 = "主播id不能为空";
		return data;
	}
	
	sql = "SELECT 直播群id from 群_直播间记录表 where  直播间id = '"+f.直播间id+"' and 状态 = '直播中' and 主播id = '"+f.主播id+"'";
	result = pgdb.query(pg,sql);
	if(result.状态 != '成功'){
		data.状态 = '网络异常';
		return data;
	}
	
	if(result.数据.length == 0){
		data.状态 = '网络异常';
		return data;
	}
	
	f.群id = result.数据[0].直播群id;
	
	sql = "SELECT 群昵称 from 群_群成员表 where  用户账号 = '"+f.账号+"' and 群id = '"+f.群id+"'";
	result = pgdb.query(pg,sql);
	if(result.状态 != '成功'){
		data.状态 = '网络异常';
		return data;
	}
	
	if(result.数据.length == 0){
		data.状态 = '网络异常';
		return data;
	}
	
	f.昵称 = result.数据[0].群昵称;
	
	sql = "update 群_直播间观众表 set 打赏金额 = '"+f.金额+"'  where  直播间id = '"+f.直播间id+"' and 观众id = '"+f.账号+"' and 状态 = '观看中'";
	result = pgdb.query(pg,sql);
	if(result.状态 != '成功'){
		data.状态 = '网络异常';
		return data;
	}
	
	sql = "update 群_直播间记录表 set 获得礼物 = 获得礼物 + "+Number(f.金额)+"  where  直播间id = '"+f.直播间id+"' and 主播id = '"+f.主播id+"' and 状态 = '直播中'";
	result = pgdb.query(pg,sql);
	if(result.状态 != '成功'){
		data.状态 = '网络异常';
		return data;
	}
	
	console.log(f.群id);
	console.log(f.昵称);
	console.log(f.账号);
	
	
    let m = {
		'直播间id':f.直播间id,
		'主播id':f.主播id,
		'消息内容':f.昵称 + ' 给主播打赏'+ f.金额 +'多汇币',
		'用户账号':f.账号,
		'msg':f.头像,
		'人气值':0
	}
	
	message_live_remind.run(m, pg, redis, '打赏');
	
	return data;
	
}


