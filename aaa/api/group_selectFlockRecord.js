/*
 * 创建人：Coding Farmer_2203
 * 创建内容：查询群记录
 * 创建时间：2018-12-11
 * 创建版本: 1.1.0

func=group_selectFlockRecord

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
    
//	sql = "SELECT * FROM ( SELECT a.录入时间,a.审核时间,'' as 审核人,a.审核角色,a.打赏金额,a.打赏状态,b.个性签名,A.状态,A . ID, A .群id, A .用户账号,  C .昵称, b.头像,A .申请信息, '加群' AS 类别,d.群名称 FROM 群_群操作记录表 A, 会员资料表 b, 会员表 C,群_群信息表 d WHERE A .用户账号 = b.账号 AND A .用户账号 = C .账号 AND b.账号 = C .账号 AND 用户账号 = $1 AND A .状态 != '已删除' AND d.群id = a.群id UNION SELECT a.录入时间,a.审核时间,c.群昵称 as 审核人,a.审核角色,a.打赏金额,a.打赏状态,b.群简介 as 个性签名,A.状态,A.ID, A .群id, A .用户账号, b.群名称 AS 昵称, b.群头像 AS 头像, A .申请信息, '管理群' AS 类别,b.群名称 FROM 群_群操作记录表 A, 群_群信息表 b, 群_群成员表 C WHERE A .群id = b.群id AND b.群id = C .群id AND A .群id = C .群id AND C .类别 IN ('群主', '管理员') AND C .用户账号 = $1 AND A .状态 != '已删除') d ORDER BY ID DESC";
	sql = "SELECT * FROM ( SELECT A .录入时间, A .审核时间, C .群昵称 AS 审核人, C .用户账号 AS 审核人账号, A .审核角色, A .打赏金额, A .打赏状态, A .状态, f. ID, A .群id, A .用户账号, A .申请信息, b.群简介 AS 个性签名, b.群名称 AS 昵称, b.群头像 AS 头像, b.群名称, '加群' AS 类别, A .类别 AS 加群类别 FROM 群_群操作记录表 A JOIN 群_群信息表 b ON A .群id = b.群id AND A .用户账号 = $1 JOIN 群_好友群记录操作表 f ON f.操作账号 = $1 AND f.状态 = '正常' AND f.类别 = '群' AND f.记录id = A . ID AND A .类别 IN ( '搜索添加', '邀请添加' ) LEFT JOIN 群_群成员表 C ON A .审核人id = C .用户账号 AND C .群id = b.群id UNION SELECT A .录入时间, A .审核时间, e.群昵称 AS 审核人, e.用户账号 AS 审核人账号, A .审核角色, A .打赏金额, A .打赏状态, A .状态, f. ID, A .群id, A .用户账号, A .申请信息, b.个性签名, C .昵称, b.头像, d.群名称, '管理群' AS 类别, A .类别 AS 加群类别 FROM 群_群操作记录表 A JOIN 会员资料表 b ON A .用户账号 = b.账号 AND A .用户账号 != $1 AND A .类别 IN ( '搜索添加', '邀请添加' ) JOIN 会员表 C ON A .用户账号 = C .账号 AND b.账号 = C .账号 JOIN 群_群信息表 d ON d.群id = A .群id JOIN 群_好友群记录操作表 f ON f.操作账号 = $1 AND f.状态 = '正常' AND f.类别 = '群' AND f.记录id = A . ID LEFT JOIN 群_群成员表 e ON e.用户账号 = A .审核人id AND d.群id = e.群id UNION SELECT A .录入时间, A .审核时间, C .群昵称 AS 审核人, C .用户账号 AS 审核人账号, A .审核角色, A .打赏金额, A .打赏状态, '' AS 状态, f. ID, A .群id, A .用户账号, A .申请信息, b.群简介 AS 个性签名, b.群名称 AS 昵称, b.群头像 AS 头像, b.群名称, A .类别 AS 类别, '' AS 加群类别 FROM 群_群操作记录表 A JOIN 群_群信息表 b ON A .群id = b.群id AND A .用户账号 = $1 JOIN 群_好友群记录操作表 f ON f.操作账号 = $1 AND f.状态 = '正常' AND f.类别 = '群' AND f.记录id = A . ID AND A .类别 IN ( '设置管理员', '取消管理员', '移除群聊' ) LEFT JOIN 群_群成员表 C ON A .审核人id = C .用户账号 AND C .群id = b.群id UNION SELECT A .录入时间, '' AS 审核时间, '' AS 审核人, '' AS 审核角色, '' AS 审核人账号, A .打赏金额, A .打赏状态, '' AS 状态, f. ID, A .群id, A .用户账号, A .申请信息, b.个性签名, C .昵称, d.群头像 AS 头像, d.群名称, '退出群聊' AS 类别, '' AS 加群类别 FROM 群_群操作记录表 A, 会员资料表 b, 会员表 C, 群_群信息表 d, 群_好友群记录操作表 f WHERE A .用户账号 = b.账号 AND A .类别 = '退出群聊' AND A .用户账号 = C .账号 AND b.账号 = C .账号 AND d.群id = A .群id AND f.操作账号 = $1 AND f.状态 = '正常' AND f.类别 = '群' AND f.记录id = A . ID AND A .用户账号 != $1 ) d ORDER BY ID DESC LIMIT 10 OFFSET $2";
	
    result = pgdb.query(pg,sql,[f.账号,f.页数 * 10]);
    
    if(result.状态 != '成功'){
    	data.状态 = '网络异常';
    	return data;
    }
//  console.log(result.数据);
    if(result.数据.length == 0){
    	f.list = [];
    }else{
    	result = result.数据;
	    f.list = [];
	    for(let i in result){
	    	let n = {
	    		'id':result[i].id,
	    		'头像':result[i].头像,
	    		'群id':result[i].群id,
	    		'昵称':result[i].昵称,
	    		'用户账号':result[i].用户账号,
	    		'申请信息':result[i].申请信息,
	    		'类别':result[i].类别,
	    		'个性签名':result[i].个性签名,
	    		'群名称':result[i].群名称,
	    		'打赏金额':result[i].打赏金额,
	    		'打赏状态':result[i].打赏状态,
	    		'审核角色':result[i].审核角色 || '',
	    		'审核人':result[i].审核人 || '',
	    		'录入时间':result[i].录入时间 || '',
	    		'审核人账号':result[i].审核人账号 || '',
	    		'加群类别':result[i].加群类别 || ''
	    	};
	    	
	    	if(result[i].审核时间){
	    		n.审核时间 = result[i].审核时间.substring(0,11);
	    	}else{
	    		n.审核时间 = '';
	    	}
	    	
	    	if (result[i].类别 == '加群') {
	    		switch (result[i].状态){
			    	case '已拒绝':
			    		n.状态 = '被拒绝';
			    		break;
			    	case '待审核':
			    		n.状态 = '待处理';
			    		break;
			    	case '审核通过':
			    		n.状态 = '已同意';
			    		break;
			    	default:
			    		data.状态 = '网络异常';
			    		return data;
			    }
	    	}else{
	    		
	    		switch (result[i].状态){
			    	case '审核通过':
			    		n.状态 = '已同意';
			    		break;
			    	case '待审核':
			    		n.状态 = '待处理';
			    		break;
			    	case '已拒绝':
			    		n.状态 = '已拒绝';
			    		break;
			    	default:
			    		n.状态 = result[i].类别;
			    		break;
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