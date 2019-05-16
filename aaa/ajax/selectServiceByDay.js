/**
 * 创建人：Coding Farmer_2203
 * 创建内容：客服每天评价
 * 创建时间：2018-11-05
 * 创建版本：1.0.0
	
客服账号=
店铺类别=
开始日期=2018-05-11
结束日期=2018-11-11
 */

var pgdb =  require('../func/pgdb.js');
var moment = require("moment");

module.exports.run = function(body,pg,mo,redis,pg2){
    var data = {};
    var f = JSON.parse(body.data);			//获取传输的数据
    data.状态 = '成功'
    let sql = '';
    let result = '';
    
    if(!f.开始日期){
    	data.状态 = '开始日期不能为空';
    	return data;
    }
    
    if(!f.结束日期){
    	data.状态 = '结束日期不能为空';
    	return data;
    }
    
    if(!f.客服账号){
    	data.状态 = '客服账号不能为空';
    	return data;
    }
    
    if(!f.店铺类别){
    	data.状态 = '店铺类别不能为空';
    	return data;
    }
    
    let num = parseInt((Date.parse(new Date(f.结束日期)) - Date.parse(new Date(f.开始日期)))/(24*3600*1000)) + 1;
    let sql1 = '';
    let sqldata = '';
    
    if(f.客服账号 == '全部'){
    	sql = "SELECT 0 as 总问题,COUNT ( CASE WHEN ( 客服类型 = $1) THEN 客服类型 END ) AS 已接待,substr(录入时间, 0, 11) as 录入时间 FROM 客_客服评价表 WHERE substr(录入时间, 0, 11) >= $2 AND substr(录入时间, 0, 11) <= $3 AND 状态 = '正常' AND 客服类型 = $1 GROUP BY substr(录入时间, 0, 11) order by substr(录入时间, 0, 11)";
    	sqldata = [f.店铺类别,f.开始日期,f.结束日期];
//  	sql1 = "SELECT COUNT ( CASE WHEN (类别 = '商城') THEN 类别 END ) AS 总问题, substr(录入时间, 0, 11) AS 录入时间 FROM 客_客服接入表 WHERE substr(录入时间, 0, 11) >= '2018-01-01' AND substr(录入时间, 0, 11) <= '2018-12-01' AND 状态 = '正常' AND 类别 = '商城' GROUP BY substr(录入时间, 0, 11) ORDER BY substr(录入时间, 0, 11)";
		sql1 = "SELECT COUNT ( CASE WHEN (类别 = $1) THEN 类别 END ) AS 总问题, substr(录入时间, 0, 11) AS 录入时间 FROM 客_客服接入表 WHERE substr(录入时间, 0, 11) >= $2 AND substr(录入时间, 0, 11) <= $3 AND 类别 = $1 GROUP BY substr(录入时间, 0, 11) ORDER BY substr(录入时间, 0, 11)";
//		sql = "SELECT COUNT ( CASE WHEN (客服类型 = '"+f.店铺类别+"') THEN 客服类型 END ) AS 总问题, COUNT ( CASE WHEN ( 客服类型 = '"+f.店铺类别+"') THEN 客服类型 END ) AS 已接待,substr(录入时间, 0, 11) as 录入时间 FROM 客_客服评价表 WHERE substr(录入时间, 0, 11) >= '"+f.开始日期+"' AND substr(录入时间, 0, 11) <= '"+f.结束日期+"' AND 状态 = '正常' AND 客服类型 = '"+f.店铺类别+"' GROUP BY substr(录入时间, 0, 11)";
    }else{
    	sql = "SELECT 客服账号, 0 AS 总问题, COUNT ( CASE WHEN ( 客服类型 = $1) THEN 客服类型 END ) AS 已接待,substr(录入时间, 0, 11) as 录入时间 FROM 客_客服评价表 WHERE substr(录入时间, 0, 11) >= $2 AND substr(录入时间, 0, 11) <= $3 AND 状态 = '正常' AND 客服类型 = $1 GROUP BY 客服账号,substr(录入时间, 0, 11)  HAVING 客服账号 = $4";
    	sqldata = [f.店铺类别,f.开始日期,f.结束日期,f.客服账号];
    	sql1 = "SELECT 接入客服,COUNT ( CASE WHEN (类别 = $1) THEN 类别 END ) AS 总问题, substr(录入时间, 0, 11) AS 录入时间 FROM 客_客服接入表 WHERE substr(录入时间, 0, 11) >= $2 AND substr(录入时间, 0, 11) <= $3 AND 类别 = $1 GROUP BY 接入客服, substr(录入时间, 0, 11) HAVING 接入客服 = $4";
//  	sql1 = "SELECT 接入客服, COUNT ( CASE WHEN (类别 = '商城') THEN 类别 END ) AS 总问题, substr(录入时间, 0, 11) AS 录入时间 FROM 客_客服接入表 WHERE substr(录入时间, 0, 11) >= '2018-01-01' AND substr(录入时间, 0, 11) <= '2018-11-11' AND 状态 = '正常' AND 类别 = '商城' GROUP BY 接入客服, substr(录入时间, 0, 11) HAVING 接入客服 = 'ma'";
    }
   
    
    result = pgdb.query(pg,sql,sqldata);
//  result = pgdb.query(pg,sql);
    if (result.状态 != '成功') {
    	data.状态 = '网络异常';
    	return data;
    }
    f.list = [] ;
    if(result.数据.length == 0){
    	for(let i = 0;i < num;i++){
    		let n = {
    			"录入时间":moment(f.开始日期).add(i, 'd').format('YYYY-MM-DD'),
    			"总问题":0,
    			"已接待":0
    		};
    		f.list.push(n);
    	}
    }else{
    	for(let i = 0;i < num;i++){
    		let count = 0;
    		for(let j in result.数据){
//  			console.log(result.数据[j].录入时间);
   				if(moment(f.开始日期).add(i, 'd').format('YYYY-MM-DD') == result.数据[j].录入时间){
// 					console.log('a');
					f.list.push(result.数据[j]);
					break;
   				}else{
   					count ++;
   				}
   				if(count == result.数据.length){
// 					console.log('b');
	   				let n = {
		    			"录入时间":moment(f.开始日期).add(i, 'd').format('YYYY-MM-DD'),
		    			"总问题":0,
		    			"已接待":0
		    		};
		    		f.list.push(n);
	   			}
   			}
    	}
    }
    
    result = pgdb.query(pg,sql1,sqldata);
    if (result.状态 != '成功') {
    	data.状态 = '网络异常';
    	return data;
    }
//  console.log(result.数据)
    if(result.数据.length == 0){
    	for(let i in f.list){
    		f.list[i].总问题 = 0;
    	}
    }else{
    	for(let i in f.list){
    		let count = 0;
    		for(let j in result.数据){
//  			console.log(result.数据[j].录入时间);
   				if(f.list[i].录入时间 == result.数据[j].录入时间){
// 					console.log('a');
					f.list[i].总问题 = result.数据[j].总问题;
					break;
   				}else{
   					count ++;
   				}
   				if(count == result.数据.length){
   					f.list[i].总问题 = 0;
	   			}
   			}
    	}
    }
    
    data.list = f.list;
	return data;
}
