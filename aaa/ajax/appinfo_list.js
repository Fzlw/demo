
var pgdb = require('../func/pgdb.js');
// var moment = require("moment");

module.exports.run = function(body, pg, mo) {
	var f ={};
	f.状态 = '成功';
	f.接收者 =  body.account+'_service';
	f.oid = body.oid;

	sql = "select 类别,昵称,权限  from 客_客服表 where id =" + f.oid;
	var sqla = pgdb.query(pg, sql);
	if(sqla.状态 != '成功'){
		f.状态 = '数据异常';
		return f;
	}
	if(!sqla.数据 || sqla.数据.length == 0){
		f.状态 = '数据异常';
		return f;
	}
	f.类别=sqla.数据[0].类别;
	f.权限=sqla.数据[0].权限;
	f.昵称=sqla.数据[0].昵称;
	sql = "select 账号,组名,昵称 from 客_客服表 where id not in(" + f.oid + ") and 类别 != '技术人员'";
	var sqlc = pgdb.query(pg, sql);
	if(sqlc.状态 != '成功'){
		f.状态 = '数据异常';
		return f;
	}

	sql = "select 账号,组名,昵称 from 客_客服表 where id not in(" + f.oid + ") and 类别 = '技术人员'";
	var sqlc2 = pgdb.query(pg, sql);
	if(sqlc2.状态 != '成功'){
		f.状态 = '数据异常';
		return f;
	}

	f.linkman = sqlc.数据;
	f.linkman2 = sqlc2.数据;
	return f;
}