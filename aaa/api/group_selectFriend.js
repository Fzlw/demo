/*
 * 创建人：Coding Farmer_2203
 * 创建内容：搜索
 * 创建时间：2018-11-13
 * 创建版本: 1.1.0

func=group_selectFriend

账号=555555
随机码=f797dad1126dd2de00d606232324d280
条件=18475632518
页数=0
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
    
//  sql = "SELECT a.账号,b.个性签名,b.头像,a.昵称 FROM 会员表 a,会员资料表 b where a.手机号 = $1 or a.昵称 like $2";
	sql = "SELECT A .账号 AS 好友账号, b.个性签名, b.头像, A .昵称, COALESCE (C . ID, 0) AS haoyou, C .状态, COALESCE (d. ID, 0) AS yanz, d.状态 AS yzzt FROM 会员表 A JOIN 会员资料表 b ON ( A .手机号 = $1 OR A .账号 = $1 OR A .昵称 LIKE $2 ) AND A .账号 = b.账号 AND A .状态 = '正常' LEFT JOIN ( SELECT * FROM ( SELECT ID, 状态, 用户账号, 好友用户账号, ROW_NUMBER () OVER ( PARTITION BY 好友用户账号 ORDER BY ID DESC ) AS new_index FROM 群_好友操作记录表 WHERE 用户账号 = $3 ) n WHERE new_index = 1 ) d ON A .账号 = d.好友用户账号 LEFT JOIN 群_好友表 C ON A .账号 = C .好友账号 AND A .账号 = C .好友账号 AND C .用户账号 = $3 limit 10 OFFSET $4";
    result = pgdb.query(pg,sql,[f.条件,'%'+f.条件+'%',f.账号,10*f.页数]);
//  console.log(result.数据);
    if(result.状态 != '成功'){
    	data.状态 = '网络异常';
    	return data;
    }
    
    let arr = [];
    if(result.数据.length == 0){
    	arr = [];
    }
    
    result = result.数据;
// console.log(result)
    for(let i in result){
    	let n = {
    		'头像':result[i].头像,
    		'个性签名':result[i].个性签名,
    		'昵称':result[i].昵称,
    		'好友账号':result[i].好友账号,
    		'地区':''
    	};
    	
    	if (result[i].haoyou > 0) {
    		switch (result[i].状态){
		    	case '已删除':
		    		n.状态 = '添加';
		    		break;
		    	case '正常':
		    		n.状态 = '已添加';
		    		break;
		    	default:
		    		data.状态 = '网络异常';
		    		return data;
		    }
    	}else{
    		if (result[i].yanz > 0) {
    			switch (result[i].yzzt){
			    	case '已拒绝':
			    		n.状态 = '添加';
			    		break;
			    	case '待验证':
			    		n.状态 = '待验证';
			    		break;
			    	case '验证通过':
			    		n.状态 = '添加';
			    		break;
			    	default:
			    		data.状态 = '网络异常';
			    		return data;
			    }
    		}else{
    			n.状态 = '添加';
    		}
    		
    	}
    	arr.push(n);
    }
    
    data.list = arr;
    data.页数 = Number(f.页数) + 1;
    return data;
    
}

/*
 {"状态":"成功","list":[{"头像":"","个性签名":"","昵称":"德玛西亚","状态":"未添加"}]}
 * */