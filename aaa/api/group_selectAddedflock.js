/*
 * 创建人：Coding Farmer_2203
 * 创建内容：查询我的群
 * 创建时间：2018-12-10
 * 创建版本: 1.1.0

func=group_selectAddedflock

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
    
      //头部验证
    f.top = share.top(f.账号, f.随机码, pg);
    if (f.top.状态 != '成功') {
        data.状态 = f.top.状态;
        return data;
    } else if (f.top.会.出账 != '是') {
        data.状态 = '经系统检测到您有异常操作行为，功能暂停使用';
        return data;
    }
	
	
	var group_arr = {};
	sql = "SELECT 名称,直播状态 FROM 群_类型表";
    result = pgdb.query(pg,sql);
    if(result.状态 != '成功'){
    	data.状态 = '网络异常010';
    	return data;
    }
	else if(result.数据.length != 0){
		result.数据.forEach(function (s){
			group_arr[s.名称] = s.直播状态;
		})
		
	}
	
    
//  sql = "SELECT a.账号,b.个性签名,b.头像,a.昵称 FROM 会员表 a,会员资料表 b where a.手机号 = $1 or a.昵称 like $2";
	sql = "SELECT a.录入时间,b.免打扰,b.消息置顶,a.群位置,a.群类型,b.类别,a.群主id,A .群id, A .群名称, A .群头像, A .群简介, A .群人数,a.是否禁言 as 禁言 FROM 群_群信息表 A, 群_群成员表 b WHERE A .状态 = '正常' AND A .群id = b.群id AND b.用户账号 = $1 AND b.状态 = '正常'";
    result = pgdb.query(pg,sql,[f.账号]);
    
    if(result.状态 != '成功'){
    	data.状态 = '网络异常';
    	return data;
    }
    
    if(result.数据.length == 0){
    	f.list = [];
    }else{
    	f.list = result.数据;
    	for(let i in f.list){
    		if (f.list[i].免打扰  == '是') {
    			f.list[i].免打扰 = true;
    		}else{
    			f.list[i].免打扰 = false;
    		}
    		
    		if (f.list[i].消息置顶  == '是') {
    			f.list[i].消息置顶 = true;
    		}else{
    			f.list[i].消息置顶 = false;
    		}
    		
    		if (f.list[i].禁言  == '是') {
    			f.list[i].禁言 = true;
    		}else{
    			f.list[i].禁言 = false;
    		}
			f.list[i].直播 = true;
			if(group_arr[f.list[i].群类型] == '否')
				f.list[i].直播 = false;
    	}
    }
    
    
    
    data.list = f.list;
    
    return data;
    
}

/*
{"状态":"成功","list":[{"类别":"群主","群主id":"555555","群id":"22920000","群名称":"1111","群头像":"18475632518","群简介":"1","群人数":2},{"类别":"群主","群主id":"555555","群id":"16860001","群名称":"sdasd","群头像":"18475632518","群简介":"1","群人数":2},{"类别":"群主","群主id":"555555","群id":"71830002","群名称":"sd","群头像":"18475632518","群简介":"1","群人数":1}]}
 * */