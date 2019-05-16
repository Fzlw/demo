/*
 * 开发人员：马博
 * 开发时间：2017-1-11
 * 开发功能：对登入逻辑进行过更改
 */
var cipher = require('../func/cipher.js');
var mongo = require('../func/mongo.js');
var pgdb = require('../func/pgdb.js');
var uuid = require('uuid');

module.exports.run = function(body,pg,mo){
	var f = {};
	f.状态 = '成功';
	f.日期 = (body.date).substring(0, 10);

		f.随机码 = uuid.v4();
		console.log(body)
	if(body.userName == null || body.userName == ''){
		f.状态 = '账号不能为空!';
	}
	else if(body.password == null || body.password == ''){
		f.状态 = '密码不能为空!';
	}
	if(f.状态 != '成功') return f;
	var sql = "select 密码,id,姓名, 账号, 组名 , 随机码 from 客_客服表 where 账号 ='"+body.userName+"'";
	var 客服 = pgdb.query(pg,sql);
	console.log(客服);
	if(客服.状态 != '成功')
		f.状态 = '数据异常!';
	else if((客服.数据).length == 0)
		f.状态 = '账号不存在!';
	else if(客服.数据[0].密码 != body.password)
		f.状态 = '密码错误！';
	if(f.状态 != '成功'){
		return f;
	} 

	sql = "update 客_客服表 set 随机码 = '"+f.随机码+"', 状态 = '在线' where 账号 ='"+body.userName+"'";

	var qu = pgdb.query(pg,sql);
	if(qu.状态 != '成功'){
		f.状态 = '数据异常';
	}

	var kefu_info ={};
	kefu_info.admin_id = 客服.数据[0].id;
	kefu_info.user_name =客服.数据[0].姓名;
	kefu_info.account =客服.数据[0].账号;
	kefu_info.group_name =客服.数据[0].组名;
	body.session.kefu_info = kefu_info;

	f.id = 客服.数据[0].id;
	f.账号 = 客服.数据[0].账号;

return f;
}