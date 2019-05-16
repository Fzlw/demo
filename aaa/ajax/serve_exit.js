/**
 * Created by 贺文焱 on 2017/7/1
 * 创建内容:客服退出接口
 *
 account = 123   (账号)
 */
var pgdb =  require('../func/pgdb.js');
// var web_im = require('../func/web_im.js');
// var moment = require('moment');

module.exports.run = function(body,pg,mo,redis,pg2){
	var p = {};
	var f = body		//获取传输的数据
	// f.时间 = moment().format('YYYY-MM-DD HH:mm:ss');
	if(f.account == "" || f.account == undefined){
		f.状态 = '账号不能为空';
		return f;
	}
	toDo(f,p,pg);
	return p;
}

function toDo(f,p,pg,mo,redis,pg2) {
	var result = upde_kefu(f,pg,mo,redis,pg2);
	// console.log("22222222222222222222");
	// console.log(result);
	if(result.影响行数 < 1 ){
		p.状态 = '修改状态失败';
		return p;
	}
	p.状态 = "成功";
	return p;
}

//修改客服表状态
function upde_kefu(f,pg,mo,redis,pg2){
	var sql ="update 客_客服表 set 状态 ='离线' where 账号='"+f.account+"'";
	// console.log(sql);
	var result = pgdb.query(pg,sql);
	return result;
}
