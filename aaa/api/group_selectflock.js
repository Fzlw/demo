/*
 * 创建人：Coding Farmer_2203
 * 创建内容：搜索群
 * 创建时间：2018-12-06
 * 创建版本: 1.1.0

func=group_selectflock

账号=555555
随机码=f797dad1126dd2de00d606232324d280
条件=18475632518
 */
var pgdb = require('../func/pgdb.js');
var share = require('./public/share.js');

module.exports.run = function(body, pg, mo, redis, pg2) {
	
    let data = {};
    data.状态 = '成功';
   
    let f = {};
    f = body.receive;
    
    let sql = '';
    let result = '';
    
    if(!f.账号){
    	data.状态 = '账号不能为空';
    	return data;
    }
    
    if(!f.条件){
    	data.状态 = '筛选内容不能为空';
    	return data;
    }
    
     if(f.条件.length > 20){
    	data.状态 = '筛选内容长度不能大于20字';
    	return data;
    }
     
    if(!f.页数){
    	data.状态 = '页数不能为空';
    	return data;
    }
      //头部验证
    f.top = share.top(f.账号, f.随机码, pg);
    if (f.top.状态 != '成功') {
        data.状态 = f.top.状态;
        return data;
    } else if (f.top.会.出账 != '是') {
        data.状态 = '经系统检测到您有异常操作行为，功能暂停使用';
        return data;
    }
    
//	sql = "SELECT A .*,COALESCE (b. ID, 0) AS 加群, COALESCE (C . ID, 0) AS 验证, C .状态 FROM ( SELECT 群id, 群名称, 群头像, 群简介, 群人数 FROM 群_群信息表 WHERE ( 群id = $1 OR 群名称 LIKE $2 ) AND 状态 = '正常' ) A LEFT JOIN 群_群操作记录表 C ON A .群id = C .群id AND C .用户账号 = $3 LEFT JOIN 群_群成员表 b ON A .群id = b.群id AND b.用户账号 = $3 AND b.状态 = '正常' ORDER BY C . ID LIMIT 1";
	sql = "SELECT A .*, COALESCE (b. ID, 0) AS 加群, COALESCE (C . ID, 0) AS 验证, C .状态 FROM ( SELECT 群id, 群名称, 群头像, 群简介, 群人数 FROM 群_群信息表 WHERE ( 群id = $1 OR 群名称 LIKE $2 ) AND 状态 = '正常' ) A LEFT JOIN ( SELECT * FROM ( SELECT ID, 状态, 群id, 用户账号, ROW_NUMBER () OVER ( PARTITION BY 群id ORDER BY ID DESC ) AS new_index FROM 群_群操作记录表 WHERE 用户账号 = $3 ) n WHERE new_index = 1 ) C ON A .群id = C .群id LEFT JOIN 群_群成员表 b ON A .群id = b.群id AND b.用户账号 = $3 AND b.状态 = '正常' limit 10 OFFSET $4";
    result = pgdb.query(pg,sql,[f.条件,'%'+f.条件+'%',f.账号,10*f.页数]);
    
    if(result.状态 != '成功'){
    	data.状态 = '网络异常';
    	return data;
    }
    
    let arr = [];
    if(result.数据.length > 0){
    	result = result.数据;
    
	    for(let i in result){
	    	let n = {
	    		'群名称':result[i].群名称,
	    		'群头像':result[i].群头像,
	    		'群简介':result[i].群简介,
	    		'群人数':result[i].群人数,
	    		'群id':result[i].群id,
	    	};
	    	
	    	if (result[i].加群 > 0) {
		    	n.状态 = '已添加';
	    	}else{
	    		if (result[i].验证 > 0 && result[i].状态 == '待审核') {
	    			n.状态 = '等待验证';
	    		}else{
	    			n.状态 = '添加';
	    		}
	    		
	    	}
	    	arr.push(n);
	    }
    }

    data.页数 = Number(f.页数) + 1;
    data.list = arr;
    
    return data;
    
}

/*
{"状态":"成功","list":[{"群头像":"18475632518","群简介":"1","群人数":2,"群id":"22920000","状态":"未添加"}]}
 * */