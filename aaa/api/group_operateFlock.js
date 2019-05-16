/*
 * 创建人：Coding Farmer_2203
 * 创建内容：操作群
 * 创建时间：2018-12-13
 * 创建版本: 1.1.0

func=group_operateFlock

账号=555555
随机码=f797dad1126dd2de00d606232324d280
类别=设置管理员/移除群聊/取消管理员/退群/设置群信息

账号=18475632518
随机码=bf7ad1b2584ad2041e31439fd6e6f9e1
设置备注=大海
消息免打扰=是
置顶聊天=是
群id=82130000
类别=设置群信息

账号=18475632518
随机码=bf7ad1b2584ad2041e31439fd6e6f9e1
群成员账号=18327430511
群id=82130000
类别=设置管理员

账号=18475632518
随机码=bf7ad1b2584ad2041e31439fd6e6f9e1
群成员账号=18327430511
群id=82130000
类别=取消管理员

账号=18475632518
随机码=bf7ad1b2584ad2041e31439fd6e6f9e1
群id=82130000
类别=退群

账号=18475632518
随机码=bf7ad1b2584ad2041e31439fd6e6f9e1
群成员账号=18327430511
群id=82130000
类别=移除群聊
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
    
	sql = `insert into 日志_钱表(账号,时间,ip,类别,状态,录入人,录入时间,备注)values('${f.账号}','${body.date}','${body.ip}','操作群','数据提交','系统','${body.date}','入参：${JSON.stringify(body)} 返回参数：${JSON.stringify(data)}')`;
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
	
	//这里使用redis防止 单用户 并发处理   往队列中插入一条数据 设置1秒有效时间
	let redis_meg = redis_time(redis, 1, 'group_operateFlock' + f.账号);
	if (redis_meg.状态 != '成功') {
		data.状态 = '请不要重复点击';
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
    
	switch (f.类别){
		case '设置群信息':
			setFlock(pg,f,data,body,redis);
			break;
		case '设置管理员':
			setController(pg,f,data,body,redis);
			break;
		case '取消管理员':
			cancelController(pg,f,data,body,redis);
			break;
		case '退群':
			leadingGroup(pg,f,data,body,redis);
			break;	
		case '移除群聊':
			removeGroup(pg,f,data,body,redis);
			break;	
		default:
			data.状态 = '类别异常';
        	return data;
	}
}

function setFlock(pg,f,data,body,redis){
	
	if(!(f.设置备注 || f.消息免打扰 || f.置顶聊天 || f.群头像 || f.群名称 || f.群位置 || f.群简介 || f.禁言||f.互加好友)){
    	data.状态 = '请选择修改类型';
    	return data;
    }
    
    if(!f.群id){
    	data.状态 = '群id不能为空';
    	return data;
    }
    
    let sqldata = [];
    
    if(f.设置备注 || f.消息免打扰 || f.置顶聊天 || f.禁言){
    	if(f.设置备注){
	    	sql = "update 群_群成员表 set 群昵称 = $1 where 用户账号 = $2 and 群id = $3 and 状态 = '正常'";
	    	sqldata = [f.设置备注,f.账号,f.群id];
	    }
	    
	    if(f.消息免打扰){
	    	sql = "update 群_群成员表 set 免打扰 = $1 where 用户账号 = $2 and 群id = $3 and 状态 = '正常'";
	    	sqldata = [f.消息免打扰,f.账号,f.群id];
	    }
	    
	    if(f.置顶聊天){
	    	sql = "update 群_群成员表 set 消息置顶 = $1 where 用户账号 = $2 and 群id = $3 and 状态 = '正常'";
	    	sqldata = [f.置顶聊天,f.账号,f.群id];
	    }
	    
	    if(f.禁言){
//	    	sql = "select id,用户账号 from 群_群成员表  where  群id = $1 and 状态 = '正常' and 类别 in ('管理员','群员')";
//			result = pgdb.query(pg,sql,[f.群id]);
//			if(result.状态 != '成功'){
//				data.状态 = '网络异常';
//				return data;
//			}
//			f.接收账号 = result.数据[0].用户账号;
	
	    	sql = "update 群_群成员表 set 是否禁言 = $1 where  群id = $2 and 状态 = '正常' and 类别 in ('管理员','群员')";
	    	sqldata = [f.禁言,f.群id];
	    	
	    	let sql1 = "update 群_群信息表 set 是否禁言 = $1 where  群id = $2";
	    	result = pgdb.query(pg,sql1,[f.禁言,f.群id]);
//	    	console.log(result);
			if(result.状态 != '成功'){
				data.状态 = '网络异常';
				return data;
			}
			
			let 消息内容 = '';
			if(f.禁言 == '是'){
				消息内容 = '群主已开启全员禁言';
			}else{
				消息内容 = '群主已关闭全员禁言';
			}
			
	    	let m = {
				'用户账号':f.账号,
				'好友用户账号':'',
				'消息内容': 消息内容,
				'id':f.群id
			}
			message_remind.run(m, pg, redis, '群全体提醒');
		
	    }
	    
		result = pgdb.query(pg,sql,sqldata);
		if(result.状态 != '成功'){
			data.状态 = '网络异常';
			return data;
		}
    }
    
    sqldata = [];
    if( f.群头像 || f.群名称 || f.群位置 || f.群简介 || f.群类型 ||f.互加好友){
    	
    	sql = "select id from 群_群成员表  where 用户账号 = $1 and 群id = $2 and 状态 = '正常' and 类别 in ('群主','管理员')";
		result = pgdb.query(pg,sql,[f.账号,f.群id]);
		if(result.状态 != '成功'){
			data.状态 = '网络异常';
			return data;
		}
		
		if (result.数据.length == 0) {
			data.状态 = '您无权修改';
			return data;
		}
    	
    	let num = 0;
    	if(f.群头像){
		   //处理图片链接
		   var url = f.群头像;
		   if(url.indexOf('https:')==-1){
			   url= url.replace('http:','https:');
		   }
		   f.群头像 = url;	
			
    		sql = "update 群_群信息表 set 群头像 = $1";
	    	sqldata = sqldata.concat([f.群头像]);
	    	num ++;
	    }
    	
    	if(f.群名称){
    		if (num > 0) {
    			sql += " ,群名称 = $2";
    		}else{
    			sql = "update 群_群信息表 set 群名称 = $1";
    		}
	    	sqldata = sqldata.concat([f.群名称]);
	    	num ++;
	    }
    	
    	if(f.群位置){
    		if (num > 0) {
    			let  num2 = num + 1;
    			sql += " ,群位置 = $" + num2;
    		}else{
    			sql = "update 群_群信息表 set 群位置 = $1";
    		}
	    	sqldata = sqldata.concat([f.群位置]);
	    	num ++;
	    }
    	
    	if(f.群简介){
    		if (num > 0) {
    			let  num2 = num + 1;
    			sql += " ,群简介 = $" + num2;
    		}else{
    			sql = "update 群_群信息表 set 群简介 = $1";
    		}
	    	sqldata = sqldata.concat([f.群简介]);
	    	num ++;
	    }
    	
    	if(f.群类型){
    		if (num > 0){
    			let num2 = num +1;
    			sql += " ,群类型 = $" + num2
    		}else{
    			sql = "update 群_群信息表 set 群类型 = $1";
    		}
    		sqldata = sqldata.concat([f.群类型]);
    		num ++;
    	}
		if(f.互加好友){
    		if (num > 0){
    			let num2 = num +1;
    			sql += " ,互加好友 = $" + num2
    		}else{
    			sql = "update 群_群信息表 set 互加好友 = $1";
    		}
    		sqldata = sqldata.concat([f.互加好友]);
    		num ++;
    	}
    	
    	num = num + 1;
    	sql += " where  群id = $" + num + " and 状态 = '正常'";
    	sqldata = sqldata.concat([f.群id])
		result = pgdb.query(pg,sql,sqldata);
		if(result.状态 != '成功'){
			data.状态 = '网络异常';
			return data;
		}
    }
    
}

function setController(pg,f,data,body,redis){
    
    if(!f.群id){
    	data.状态 = '群id不能为空';
    	return data;
    }
    
    if(!f.群成员账号){
    	data.状态 = '群成员账号不能为空';
    	return data;
    }
    
    let 群管理数量 = 0;
    sql = "select count(id) as 群管理数量 from 群_群成员表  where 类别 = '管理员' and 群id = $1 and 状态 = '正常'";
	result = pgdb.query(pg,sql,[f.群id]);
	if(result.状态 != '成功'){
		data.状态 = '网络异常';
		return data;
	}
	
	if (result.数据.length == 0) {
		群管理数量 = 0;
	}else{
		群管理数量 = result.数据[0].群管理数量;
	}
	
	if (群管理数量 >= 10) {
		data.状态 = '群管理员数量超出上限';
		return data;
	}
	
    sql = "select id,类别   from 群_群成员表  where 用户账号 = $1 and 群id = $2 and 状态 = '正常'";
	result = pgdb.query(pg,sql,[f.群成员账号,f.群id]);
	if(result.状态 != '成功'){
		data.状态 = '网络异常';
		return data;
	}
	
	if (result.数据.length == 0) {
		data.状态 = '该成员已离群';
		return data;
	}
	
	let 类别 = result.数据[0].类别;
	let id = result.数据[0].id;
	
	if(类别 == '群主'){
		data.状态 = '您不能管理群主';
		return data;
	}
	
	if(类别 == '管理员'){
		data.状态 = '该成员已经是管理员';
		return data;
	}
	
	sql = "select id,类别,群昵称 from 群_群成员表  where 用户账号 = $1 and 群id = $2 and 状态 = '正常'";
	result = pgdb.query(pg,sql,[f.账号,f.群id]);
	if(result.状态 != '成功'){
		data.状态 = '网络异常';
		return data;
	}
	
	if (result.数据.length == 0) {
		data.状态 = '该成员已离群';
		return data;
	}
	
	let 操作人类别 = result.数据[0].类别;
	let 群昵称 = result.数据[0].群昵称;
	
	if(操作人类别 != '群主'){
		data.状态 = '您不是群主，无权设置管理';
		return data;
	}
    
	sql = "update 群_群成员表 set 类别 = '管理员' where id = '"+id+"'";
	result = pgdb.query(pg,sql);
	if(result.状态 != '成功'){
		data.状态 = '网络异常';
		return data;
	}
	
	sql = "SELECT nextval('群_群操作记录表_id_seq') as id";
	result = pgdb.query(pg,sql);
	if(result.状态 != '成功'){
		data.状态 = '网络异常';
		return data;
	}
	
	let 操作id = result.数据[0].id;
	sql = "INSERT INTO 群_群操作记录表 (id, 群id, 用户账号, 申请信息, 打赏金额, 打赏状态, 审核人id, 审核角色, 类别, 状态, 录入人, 录入时间, 备注,审核时间) VALUES ('"+操作id+"', $1, $2,'', 0, '未打赏', $3, $4, '设置管理员', '审核通过', '系统', '"+body.date+"', '',$5);"
    result = pgdb.query(pg, sql,[f.群id,f.群成员账号,f.账号,操作人类别,body.date]);
	if (result.状态 != '成功') {
		data.状态 = "网络异常，请稍后再试";
		return data;
	}
	
	sql = "INSERT INTO 群_好友群记录操作表 (操作账号, 记录id,类别, 状态, 录入人, 录入时间, 备注 ) VALUES ($1,$2,$3,$4,$5,$6,$7);";
	result = pgdb.query(pg,sql,[f.群成员账号,操作id,'群','正常','系统',body.date,'']);
	if(result.状态 != '成功'){
		data.状态 = '网络异常';
		return data;
	}
	
	let p = {
		'用户账号':f.账号,
		'好友用户账号':f.群成员账号,
		'消息内容':群昵称+'已将你设为管理员',
		'好友操作id':id
	};
	message_user.run(p, pg, redis, '群通知');
	
}


function cancelController(pg,f,data,body,redis){
	
    if(!f.群id){
    	data.状态 = '群id不能为空';
    	return data;
    }
    
    if(!f.群成员账号){
    	data.状态 = '群成员账号不能为空';
    	return data;
    }
    
    sql = "select id,类别 from 群_群成员表  where 用户账号 = $1 and 群id = $2 and 状态 = '正常'";
	result = pgdb.query(pg,sql,[f.群成员账号,f.群id]);
	if(result.状态 != '成功'){
		data.状态 = '网络异常';
		return data;
	}
	
	if (result.数据.length == 0) {
		data.状态 = '该成员已离群';
		return data;
	}
	
	let 类别 = result.数据[0].类别;
	let id = result.数据[0].id;
	
	if(类别 == '群主'){
		data.状态 = '您不能管理群主';
		return data;
	}
	
	if(类别 == '群员'){
		data.状态 = '该成员不是管理员';
		return data;
	}
	
	sql = "select id,类别,群昵称 from 群_群成员表  where 用户账号 = $1 and 群id = $2 and 状态 = '正常'";
	result = pgdb.query(pg,sql,[f.账号,f.群id]);
	if(result.状态 != '成功'){
		data.状态 = '网络异常';
		return data;
	}
	
	if (result.数据.length == 0) {
		data.状态 = '该成员已离群';
		return data;
	}
	
	let 操作人类别 = result.数据[0].类别;
	let 群昵称 = result.数据[0].群昵称;
	
	if(操作人类别 != '群主'){
		data.状态 = '您不是群主，无权取消管理';
		return data;
	}
    
	sql = "update 群_群成员表 set 类别 = '群员' where id = '"+id+"'";
	result = pgdb.query(pg,sql);
	if(result.状态 != '成功'){
		data.状态 = '网络异常';
		return data;
	}
	
	sql = "SELECT nextval('群_群操作记录表_id_seq') as id";
	result = pgdb.query(pg,sql);
	if(result.状态 != '成功'){
		data.状态 = '网络异常';
		return data;
	}
	
	let 操作id = result.数据[0].id;
	sql = "INSERT INTO 群_群操作记录表 (id, 群id, 用户账号, 申请信息, 打赏金额, 打赏状态, 审核人id, 审核角色, 类别, 状态, 录入人, 录入时间, 备注,审核时间) VALUES ('"+操作id+"', $1, $2,'', 0, '未打赏', $3, $4, '取消管理员', '审核通过', '系统', '"+body.date+"', '',$5);"
    result = pgdb.query(pg, sql,[f.群id,f.群成员账号,f.账号,操作人类别,body.date]);
	if (result.状态 != '成功') {
		data.状态 = "网络异常，请稍后再试";
		return data;
	}
	
	sql = "INSERT INTO 群_好友群记录操作表 (操作账号, 记录id,类别, 状态, 录入人, 录入时间, 备注 ) VALUES ($1,$2,$3,$4,$5,$6,$7);";
	result = pgdb.query(pg,sql,[f.群成员账号,操作id,'群','正常','系统',body.date,'']);
	if(result.状态 != '成功'){
		data.状态 = '网络异常';
		return data;
	}
	
	let p = {
		'用户账号':f.账号,
		'好友用户账号':f.群成员账号,
		'消息内容':群昵称+'已将你取消管理员',
		'好友操作id':id
	};
	message_user.run(p, pg, redis, '群通知');
	

}

function leadingGroup(pg,f,data,body,redis){
	
    if(!f.群id){
    	data.状态 = '群id不能为空';
    	return data;
    }
    
    sql = "select id,类别,群昵称 from 群_群成员表  where 用户账号 = $1 and 群id = $2 and 状态 = '正常'";
	result = pgdb.query(pg,sql,[f.账号,f.群id]);
	if(result.状态 != '成功'){
		data.状态 = '网络异常';
		return data;
	}
	
	if (result.数据.length == 0) {
		data.状态 = '该成员已离群';
		return data;
	}
	
	let 类别 = result.数据[0].类别;
	let id = result.数据[0].id;
	let 群昵称 = result.数据[0].群昵称;
	
	if(类别 == '群主'){
		sql = "update 群_群成员表 set 状态 = '已解散' where 群id = $1 and 状态 = '正常' returning 用户账号";
		result = pgdb.query(pg,sql,[f.群id]);
		if(result.状态 != '成功'){
			data.状态 = '网络异常';
			return data;
		}
		
		let 群成员 = result.数据;
		
		sql = "update 群_群信息表 set 状态 = '已解散',群人数 = 0 where 群id = $1";
		result = pgdb.query(pg,sql,[f.群id]);
		if(result.状态 != '成功'){
			data.状态 = '网络异常';
			return data;
		}
		
		sql = "INSERT INTO 群_群操作记录表 (群id, 用户账号, 申请信息, 打赏金额, 打赏状态, 审核人id, 审核角色, 类别, 状态, 录入人, 录入时间, 备注,审核时间) VALUES ($1, $2,'', 0, '未打赏', $3, $4, '解散群聊', '审核通过', '系统', '"+body.date+"', '',$5);"
	    result = pgdb.query(pg, sql,[f.群id,f.账号,'','',body.date]);
		if (result.状态 != '成功') {
			data.状态 = "网络异常，请稍后再试";
			return data;
		}
		
		for(let i in 群成员){
			operation_group.run(群成员[i].账号,f.群id, redis,'退群');
		}
		
		let m = {
			'用户账号':f.账号,
			'好友用户账号':'',
			'消息内容': '你已被移除群',
			'id':f.群id
		}

		message_remind.run(m, pg, redis, '群全体提醒');
		
	}else{
		
		
		sql = "update 群_群成员表 set 状态 = '已退群' where id = '"+id+"'";
		result = pgdb.query(pg,sql);
		if(result.状态 != '成功'){
			data.状态 = '网络异常';
			return data;
		}
		
		sql = "update 群_群信息表 set 群人数 = 群人数 - 1 where 群id = $1";
		result = pgdb.query(pg,sql,[f.群id]);
		if(result.状态 != '成功'){
			data.状态 = '网络异常';
			return data;
		}
		
		sql = "SELECT nextval('群_群操作记录表_id_seq') as id";
		result = pgdb.query(pg,sql);
		if(result.状态 != '成功'){
			data.状态 = '网络异常';
			return data;
		}
		
		let 操作id = result.数据[0].id;
		sql = "INSERT INTO 群_群操作记录表 (id,群id, 用户账号, 申请信息, 打赏金额, 打赏状态, 审核人id, 审核角色, 类别, 状态, 录入人, 录入时间, 备注,审核时间) VALUES ('"+操作id+"',$1, $2,'', 0, '未打赏', $3, $4, '退出群聊', '审核通过', '系统', '"+body.date+"', '',$5);"
	    result = pgdb.query(pg, sql,[f.群id,f.账号,'','',body.date]);
		if (result.状态 != '成功') {
			data.状态 = "网络异常，请稍后再试";
			return data;
		}
		
		sql = "select id,用户账号 from 群_群成员表  where  群id = $1 and 状态 = '正常' and 类别 in ('群主','管理员')";
		result = pgdb.query(pg,sql,[f.群id]);
		if(result.状态 != '成功'){
			data.状态 = '网络异常';
			return data;
		}
		if(result.数据.length == 0){
			data.状态 = '网络异常';
			return data;
		}
		
		let 群管 = result.数据;
		for(let i in 群管){
			let m = {
				'用户账号':f.账号,
				'好友用户账号':群管[i].用户账号,
				'消息内容': 群昵称 + '已退出群聊',
				'id':f.群id
			}
			message_remind.run(m, pg, redis, '群聊提醒');
		}
		operation_group.run(f.账号,f.群id, redis,'退群');
		
	}
	
}


function removeGroup(pg,f,data,body,redis){
	 if(!f.群id){
    	data.状态 = '群id不能为空';
    	return data;
    }
    
    if(!f.群成员账号){
    	data.状态 = '群成员账号不能为空';
    	return data;
    }
    
    sql = "select id,类别 from 群_群成员表  where 用户账号 = $1 and 群id = $2 and 状态 = '正常'";
	result = pgdb.query(pg,sql,[f.群成员账号,f.群id]);
	if(result.状态 != '成功'){
		data.状态 = '网络异常';
		return data;
	}
	
	if (result.数据.length == 0) {
		data.状态 = '该成员已离群';
		return data;
	}
	
	let 群员权限 = 0;
	let id = result.数据[0].id;
	
	if(result.数据[0].类别 == '群主'){
		data.状态 = '您不能管理群主';
		return data;
	}
	
	if(result.数据[0].类别  == '管理员'){
		群员权限 = 1;
	}
	
	sql = "select id,类别,群昵称 from 群_群成员表  where 用户账号 = $1 and 群id = $2 and 状态 = '正常'";
	result = pgdb.query(pg,sql,[f.账号,f.群id]);
	if(result.状态 != '成功'){
		data.状态 = '网络异常';
		return data;
	}
	
	if (result.数据.length == 0) {
		data.状态 = '该成员已离群';
		return data;
	}
	
	let 操作人权限 = 0;
	let 群昵称 = result.数据[0].群昵称;
	
	if(result.数据[0].类别 == '群主'){
		操作人权限 = 2;
	}else if(result.数据[0].类别 == '管理员'){
		操作人权限 = 1;
	}else{
		操作人权限 = 0;
	}
	
	let 操作人类别 = result.数据[0].类别;
	
	if (群员权限 >=  操作人权限) {
		data.状态 = '您无权移除此人';
		return data;
	}
    
	sql = "update 群_群成员表 set 状态 = '已退群' where id = '"+id+"'";
	result = pgdb.query(pg,sql);
	if(result.状态 != '成功'){
		data.状态 = '网络异常';
		return data;
	}
	
	sql = "update 群_群信息表 set 群人数 = 群人数 - 1 where 群id = $1";
	result = pgdb.query(pg,sql,[f.群id]);
	if(result.状态 != '成功'){
		data.状态 = '网络异常';
		return data;
	}
	
	sql = "SELECT nextval('群_群操作记录表_id_seq') as id";
	result = pgdb.query(pg,sql);
	if(result.状态 != '成功'){
		data.状态 = '网络异常';
		return data;
	}
	
	let 操作id = result.数据[0].id;
	sql = "INSERT INTO 群_群操作记录表 (id, 群id, 用户账号, 申请信息, 打赏金额, 打赏状态, 审核人id, 审核角色, 类别, 状态, 录入人, 录入时间, 备注,审核时间) VALUES ('"+操作id+"', $1, $2,'', 0, '未打赏', $3, $4, '移除群聊', '审核通过', '系统', '"+body.date+"', '',$5);"
    result = pgdb.query(pg, sql,[f.群id,f.群成员账号,f.账号,操作人类别,body.date]);
	if (result.状态 != '成功') {
		data.状态 = "网络异常，请稍后再试";
		return data;
	}
	
	sql = "INSERT INTO 群_好友群记录操作表 (操作账号, 记录id,类别, 状态, 录入人, 录入时间, 备注 ) VALUES ($1,$2,$3,$4,$5,$6,$7);";
	result = pgdb.query(pg,sql,[f.群成员账号,操作id,'群','正常','系统',body.date,'']);
	if(result.状态 != '成功'){
		data.状态 = '网络异常';
		return data;
	}
	
	let p = {
		'用户账号':f.账号,
		'好友用户账号':f.群成员账号,
		'消息内容':群昵称+'已将你移除群聊',
		'好友操作id':id
	};
	
	message_user.run(p, pg, redis, '群通知');
	
	let m = {
		'用户账号':f.账号,
		'好友用户账号':f.群成员账号,
		'消息内容': '你已被移出群聊',
		'id':f.群id
	}
	message_remind.run(m, pg, redis, '群聊提醒');
			
	operation_group.run(f.群成员账号,f.群id, redis,'退群');
	
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