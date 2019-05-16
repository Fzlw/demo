/*
 * 创建人：Coding Farmer_2203
 * 创建内容：查询好友记录
 * 创建时间：2018-11-13
 * 创建版本: 1.1.0

func=group_selectFriendRecord

账号=555555
随机码=f797dad1126dd2de00d606232324d280
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
    
//	sql = "SELECT * FROM ( SELECT A .账号 AS 好友账号, b.个性签名, b.头像, A .昵称, C .状态, C . ID, 0 AS 类别,c.申请信息 FROM 会员表 A, 会员资料表 b, 群_好友操作记录表 C WHERE A .账号 = b.账号 AND A .账号 = C .好友用户账号 AND C .用户账号 = $1 AND C .状态 != '已删除' UNION SELECT A .账号 AS 好友账号, b.个性签名, b.头像, A .昵称, C .状态, C . ID, 1 AS 类别,c.申请信息 FROM 会员表 A, 会员资料表 b, 群_好友操作记录表 C WHERE A .账号 = b.账号 AND A .账号 = C .用户账号 AND C .好友用户账号 = $1 AND C .状态 != '已删除' ) A ORDER BY ID DESC";
//	sql = "SELECT * FROM ( SELECT A .账号 AS 好友账号, b.个性签名, b.头像, A .昵称, C .状态, C . ID, 0 AS 类别, C .申请信息 FROM 会员表 A, 会员资料表 b, 群_好友操作记录表 C, 群_好友群记录操作表 d WHERE A .账号 = b.账号 AND A .账号 = C .好友用户账号 AND C .用户账号 = $1 AND d.操作账号 = $1 AND d.状态 != '已删除' AND C .状态 in ('待验证','验证通过') and d.类别 = '好友' and d.记录id = c.id UNION SELECT A .账号 AS 好友账号, b.个性签名, b.头像, A .昵称, C .状态, C . ID, 1 AS 类别, C .申请信息 FROM 会员表 A, 会员资料表 b, 群_好友操作记录表 C, 群_好友群记录操作表 d WHERE A .账号 = b.账号 AND A .账号 = C .用户账号 AND C .好友用户账号 = $1 AND d.操作账号 = $1 AND d.状态 != '已删除' and d.类别 = '好友' AND C .状态 in ('待验证','验证通过') and d.记录id = c.id ) A ORDER BY ID DESC LIMIT 10 OFFSET $2"
	sql = "SELECT * FROM ( SELECT A .账号 AS 好友账号, b.个性签名, b.头像, A .昵称, C .状态, d. ID, 0 AS 类别, C .申请信息,c.打赏金额 FROM 会员表 A, 会员资料表 b, 群_好友操作记录表 C, 群_好友群记录操作表 d WHERE A .账号 = b.账号 AND A .账号 = C .好友用户账号 AND C .用户账号 = $1 AND d.操作账号 = $1 AND d.状态 != '已删除' AND C .状态 IN ('待验证', '验证通过','已拒绝') AND d.类别 = '好友' AND d.记录id = C . ID UNION SELECT A .账号 AS 好友账号, b.个性签名, b.头像, A .昵称, C .状态, d. ID, 1 AS 类别, C .申请信息,c.打赏金额 FROM 会员表 A, 会员资料表 b, 群_好友操作记录表 C, 群_好友群记录操作表 d WHERE A .账号 = b.账号 AND A .账号 = C .用户账号 AND C .好友用户账号 = $1 AND d.操作账号 = $1 AND d.状态 != '已删除' AND d.类别 = '好友' AND C .状态 IN ('待验证', '验证通过','已拒绝') AND d.记录id = C . ID ) A ORDER BY ID DESC LIMIT 10 OFFSET $2"
	
    result = pgdb.query(pg,sql,[f.账号,10*f.页数]);
    
    if(result.状态 != '成功'){
    	data.状态 = '网络异常';
    	return data;
    }
    
    if(result.数据.length == 0){
    	f.list = [];
    }else{
    	result = result.数据;
	    f.list = [];
	    for(let i in result){
	    	let n = {
	    		'id':result[i].id,
	    		'头像':result[i].头像,
	    		'个性签名':result[i].个性签名,
	    		'昵称':result[i].昵称,
	    		'好友账号':result[i].好友账号,
	    		'申请信息':result[i].申请信息,
	    		'打赏金额':result[i].打赏金额
	    	};
	    	
	    	if (result[i].类别 == 0) {
	    		switch (result[i].状态){
			    	case '验证通过':
			    		n.状态 = '已同意';
			    		break;
			    	case '待验证':
			    		n.状态 = '等待验证';
			    		break;
			    	case '已拒绝':
			    		n.状态 = '被拒绝';
			    		break;
			    	default:
			    		data.状态 = '网络异常';
			    		return data;
			    }
	    	}else{
	    		
	    		switch (result[i].状态){
			    	case '验证通过':
			    		n.状态 = '已添加';
			    		break;
			    	case '待验证':
			    		n.状态 = '添加';
			    		break;
			    	case '已拒绝':
			    		n.状态 = '已拒绝';
			    		break;
			    	default:
			    		data.状态 = '网络异常';
			    		return data;
			    }
	    		
	    		
	    	}
	    	f.list.push(n);
	    }
    }
    
    
    
    data.list = f.list;
    data.页数 = Number(f.页数) + 1;
    
    
    return data;
    
}

/*
 {"状态":"成功","list":[{"头像":"","个性签名":"","昵称":"德玛西亚","状态":"未添加"}]}
 * */