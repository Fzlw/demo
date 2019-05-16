/**
 * 创建人：Coding Farmer_2203
 * 创建内容：客服详情
 * 创建时间：2018-11-05
 * 创建版本：1.0.0
	
店铺类别=
开始日期=2018-05-11
结束日期=2018-11-11
 */

var pgdb =  require('../func/pgdb.js');

module.exports.run = function(body,pg,mo,redis,pg2){
    var data = {};
    var f = JSON.parse(body.data);			//获取传输的数据
    let sql = '';
    let result = '';
    
    data.状态 = '成功'
    if(!f.页数){
    	data.状态 = '页数不能为空';
    	return data;
    }
    
    if(!f.店铺类别){
    	data.状态 = '店铺类别不能为空';
    	return data;
    }
    
    if(!f.开始日期){
    	data.状态 = '开始日期不能为空';
    	return data;
    }
    
    if(!f.结束日期){
    	data.状态 = '结束日期不能为空';
    	return data;
    }
    
    sql = "SELECT DISTINCT 客服账号  FROM 客_客服评价表 WHERE substr(录入时间, 0, 11) >= $1 AND substr(录入时间, 0, 11) <= $2 AND 状态 = '正常' AND 客服类型 = $3 ";
    result = pgdb.query(pg,sql,[f.开始日期,f.结束日期,f.店铺类别]);
    if (result.状态 != '成功') {
    	data.状态 = '网络异常';
    	return data;
    }
    
    if(result.数据.length == 0){
    	f.总页数 = 0 ;
    }else{
    	f.总页数 =  result.数据.length;
    }
    
    f.总页数 = Math.ceil(f.总页数/5);


	sql = "SELECT 客服账号, COALESCE(round( SUM ( CASE WHEN ( 客服类型 = $1 AND 是否评价 = '是' ) THEN CAST (评价星级 AS NUMERIC) END ) / COUNT (CASE WHEN ( 客服类型 = $1 AND 是否评价 = '是' ) THEN CAST (评价星级 AS NUMERIC) END )),0) AS 评价星级, COUNT ( CASE WHEN (客服类型 = $1) THEN 客服类型 END ) AS 接待数量, COUNT ( CASE WHEN ( 客服类型 = $1 AND 是否解决 = '未解决' ) THEN 客服类型 END ) AS 未解决, COUNT ( CASE WHEN ( 客服类型 = $1 AND 是否解决 = '已解决' ) THEN 客服类型 END ) AS 已解决, COUNT ( CASE WHEN ( 客服类型 = $1 AND 是否评价 = '否' ) THEN 客服类型 END ) AS 未评价 FROM 客_客服评价表 WHERE substr(录入时间, 0, 11) >= $2 AND substr(录入时间, 0, 11) <= $3 AND 状态 = '正常' AND 客服类型 = $1 GROUP BY 客服账号 limit 5 OFFSET $4 ";
//  sql = "SELECT 客服账号, COALESCE(round( SUM ( CASE WHEN ( 客服类型 = '"+f.店铺类别+"' AND 是否评价 = '是' ) THEN CAST (评价星级 AS NUMERIC) END ) / COUNT (CASE WHEN ( 客服类型 = '"+f.店铺类别+"' AND 是否评价 = '是' ) THEN CAST (评价星级 AS NUMERIC) END )),0) AS 评价星级, COUNT ( CASE WHEN (客服类型 = '"+f.店铺类别+"') THEN 客服类型 END ) AS 接待数量, COUNT ( CASE WHEN ( 客服类型 = '"+f.店铺类别+"' AND 是否解决 = '未解决' ) THEN 客服类型 END ) AS 未解决, COUNT ( CASE WHEN ( 客服类型 = '"+f.店铺类别+"' AND 是否解决 = '已解决' ) THEN 客服类型 END ) AS 已解决, COUNT ( CASE WHEN ( 客服类型 = '"+f.店铺类别+"' AND 是否评价 = '否' ) THEN 客服类型 END ) AS 未评价 FROM 客_客服评价表 WHERE substr(录入时间, 0, 11) >= '"+f.开始日期+"' AND substr(录入时间, 0, 11) <= '"+f.结束日期+"' AND 状态 = '正常' AND 客服类型 = '"+f.店铺类别+"' GROUP BY 客服账号 limit 5 OFFSET 0 ";
    result = pgdb.query(pg,sql,[f.店铺类别,f.开始日期,f.结束日期,(f.页数 - 1)*5]);
//  result = pgdb.query(pg,sql);
  
    if (result.状态 != '成功') {
    	data.状态 = '网络异常';
    	return data;
    }
    
    if(result.数据.length == 0){
    	f.list = [] ;
    }else{
    	f.list =  result.数据;
    }
    
    
    if(result.数据.length > 0){
    	result = result.数据;
    	let keFuList = [];
    	for(let i in result){
    		keFuList.push(result[i].客服账号)
    	}
    	sql = "SELECT a.客服账号,COUNT (A.评价星级) 总评价, COUNT ( CASE WHEN (A.评价星级 = 1) THEN A.评价星级 END ) AS 一星评价, COUNT ( CASE WHEN (A.评价星级 = 2) THEN A.评价星级 END ) AS 二星评价, COUNT ( CASE WHEN (A.评价星级 = 3) THEN A.评价星级 END ) AS 三星评价, COUNT ( CASE WHEN (A.评价星级 = 4) THEN A.评价星级 END ) AS 四星评价, COUNT ( CASE WHEN (A.评价星级 = 5) THEN A.评价星级  END ) AS 五星评价 FROM ( SELECT round( CAST (评价星级 AS NUMERIC)) AS 评价星级,客服账号 FROM 客_客服评价表 WHERE substr(录入时间, 0, 11) >= $1 AND substr(录入时间, 0, 11) <= $2 AND 状态 = '正常' AND 客服账号 =any($3::varchar[]) AND 客服类型 = $4 AND 是否评价 = '是') A GROUP BY 客服账号";
//  	sql = "SELECT a.客服账号,COUNT (A.评价星级) 总评价, COUNT ( CASE WHEN (A.评价星级 = 1) THEN A.评价星级 END ) AS 一星评价, COUNT ( CASE WHEN (A.评价星级 = 2) THEN A.评价星级 END ) AS 二星评价, COUNT ( CASE WHEN (A.评价星级 = 3) THEN A.评价星级 END ) AS 三星评价, COUNT ( CASE WHEN (A.评价星级 = 4) THEN A.评价星级 END ) AS 四星评价, COUNT ( CASE WHEN (A.评价星级 = 5) THEN A.评价星级  END ) AS 五星评价 FROM ( SELECT round( CAST (评价星级 AS NUMERIC)) AS 评价星级,客服账号 FROM 客_客服评价表 WHERE substr(录入时间, 0, 11) >= $1 AND substr(录入时间, 0, 11) <= $2 AND 状态 = '正常' AND 客服账号  in ('"+keFuList+"') AND 客服类型 = $3 AND 是否评价 = '是') A GROUP BY 客服账号";
    	
	    let result1 = pgdb.query(pg,sql,[f.开始日期,f.结束日期,keFuList,f.店铺类别]);
//	    let result1 = pgdb.query(pg,sql,[f.开始日期,f.结束日期,f.店铺类别]);
	    if (result1.状态 != '成功') {
	    	data.状态 = '网络异常';
	    	return data;
	    }
	    let pinjia = '';
	    if(result1.数据.length == 0){
    		pinjia = [] ;
	    }else{
	    	pinjia =  result1.数据;
	    }
	    
	    for(let i in f.list){
	    	
	    	if(pinjia.length > 0){
	    		let count = 0;
		    	for(let j in pinjia){
		    		if(f.list[i].客服账号 == pinjia[j].客服账号){
		    			count ++;
		    			f.list[i].评价 = pinjia[j];
		    			break;
		    		}
		    		if(count == 0){
		    			f.list[i].评价 = {
		    				'总评价':0,
		    				'一星评价':0,
		    				'二星评价':0,
		    				'三星评价':0,
		    				'四星评价':0,
		    				'五星评价':0,
		    			}
		    		}
		    	}
	    	}else{
	    		f.list[i].评价 = {
    				'总评价':0,
    				'一星评价':0,
    				'二星评价':0,
    				'三星评价':0,
    				'四星评价':0,
    				'五星评价':0,
    			}
	    	}
	    	
	    }
	    
    }
    
    data.list = f.list;
    data.总页数 = f.总页数;
	return data;
}
