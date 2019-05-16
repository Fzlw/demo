var pgdb =  require('../func/pgdb.js');
// var web_im = require('../func/web_im.js');
var moment = require('moment');
var cipher = require('../func/cipher.js');

module.exports.run = function(body,pg,mo,redis,pg2){
    var p = {};
    var f = body;	//获取传输的数据
    // console.log(f);
//  f.状态 = "不知道";
    f.old_psd =cipher.md5(f.old_psd);
    f.new_psd =cipher.md5(f.new_psd);
    f.sure_psd =cipher.md5(f.sure_psd);
    p.状态 ='成功';
//  f.old_psd;
//  f.new_psd;
//  f.sure_psd;
//  f.account = '99' ;
    var sql ="select id,密码 from 客_客服表 where 账号='"+f.account+"'";
    var result = pgdb.query(pg,sql);
    if (result.状态 != '成功') {
    	p.状态 = f.状态;
    	return p;
    }
    if(result.数据[0] == ''||result.数据[0] == null||result.数据[0] == undefined){
      p.状态 = '账号不存在！';
      return p;
    }
    if (result.数据[0].密码 != f.old_psd) {
    	p.状态 = '原密码错误！';
    	return p;
    }
    if(f.new_psd != f.sure_psd ) {
     	p.状态 = '原密码与新密码不一致！';
    	return p;   	
    }
    var sqla = "update 客_客服表 set 密码 = '"+f.sure_psd+"' where 账号='"+f.account+"' ";
    var resulta = pgdb.query(pg,sqla); 
    if (resulta.状态!='成功') {
    	p.状态 = f.状态;
    	return p;
    }

    return p;
}
