/*
 * 创建人：Coding Farmer_2203
 * 创建内容：查看群详情
 * 创建时间：2018-12-10
 * 创建版本: 1.1.0

func=group_selectflockDetails

账号=555555
随机码=f797dad1126dd2de00d606232324d280
群id=3560004
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
    
    if(!f.群id){
    	data.状态 = '群id不能为空';
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
    
    let qun = {};
//  sql = "SELECT a.账号,b.个性签名,b.头像,a.昵称 FROM 会员表 a,会员资料表 b where a.手机号 = $1 or a.昵称 like $2";
	sql = " SELECT a.群类型,a.群位置,substring(a.录入时间,0,11) as 录入时间,b.免打扰,b.消息置顶,b.类别,a.群主id,A .群id, A .群名称, A .群头像, A .群简介, A .群人数,a.是否禁言 as 禁言,a.互加好友 FROM 群_群信息表 A, 群_群成员表 b WHERE A .状态 = '正常' AND A .群id = b.群id  AND b.状态 = '正常' and a.群id = $1 and b.用户账号 = $2";
    result = pgdb.query(pg,sql,[f.群id,f.账号]);
    
    if(result.状态 != '成功'){
    	data.状态 = '网络异常';
    	return data;
    }
    
    if(result.数据.length == 0){
    	sql = "SELECT a.群类型,a.群位置,substring(a.录入时间,0,11) as 录入时间,a.群主id,A .群id, A .群名称, A .群头像, A .群简介, A .群人数,a.是否禁言 as 禁言,a.互加好友 FROM 群_群信息表 A WHERE A .状态 = '正常' and a.群id = $1";
    	result = pgdb.query(pg,sql,[f.群id]);
	    if(result.状态 != '成功'){
	    	data.状态 = '网络异常';
	    	return data;
	    }
	    if(result.数据.length == 0){
	    	data.状态 = '该群不存在';
	    	return data;
	    }
	    
	    qun.信息 = result.数据[0];
	    qun.信息.免打扰 = false;
	    qun.信息.消息置顶 = false;
		qun.信息.互加好友 = false;
		qun.信息.类别 = '';
		qun.信息.直播 = true;
		if(group_arr[qun.信息.群类型] == '否')
			qun.信息.直播 = false;
	    
    }else{
    	qun.信息 = result.数据[0];
	    if(qun.信息.免打扰 == '是'){
	    	qun.信息.免打扰 = true;
	    }else{
	    	qun.信息.免打扰 = false;
	    	
	    }
	    
	    if(qun.信息.消息置顶 == '是'){
	    	qun.信息.消息置顶 = true;
	    }else{
	    	qun.信息.消息置顶 = false;
	    }
	    
		 if(qun.信息.互加好友 == '是'){
	    	qun.信息.互加好友 = true;
	    }else{
	    	qun.信息.互加好友 = false;
	    }
		
		
	    if(qun.信息.禁言 == '是'){
	    	qun.信息.禁言 = true;
	    }else{
	    	qun.信息.禁言 = false;
		}
		qun.信息.直播 = true;
		if(group_arr[qun.信息.群类型] == '否')
			qun.信息.直播 = false;
    }
    
    

//  sql = "select a.用户账号,a.群昵称,b.头像,a.类别,a.免打扰,a.消息置顶 from 群_群成员表 a,会员资料表 b where a.状态 = '正常' and a.群id = $1 and a.用户账号 = b.账号;"
    sql = "select a.用户账号,a.群昵称,b.头像,a.类别 from 群_群成员表 a,会员资料表 b where a.状态 = '正常' and a.群id = $1 and a.用户账号 = b.账号;"
    result = pgdb.query(pg,sql,[f.群id]);
    
    if(result.状态 != '成功'){
    	data.状态 = '网络异常';
    	return data;
    }
    
    if(result.数据.length == 0){
    	data.状态 = '该群不存在';
    	return data;
    }
    
    qun.群成员 = result.数据;
//  for(let i in qun.群成员){
//  	if(qun.群成员[i].免打扰 == '是'){
//	    	qun.群成员[i].免打扰 = true;
//	    }else{
//	    	qun.群成员[i].免打扰 = false;
//	    }
//	    
//	    if(qun.群成员[i].消息置顶 == '是'){
//	    	qun.群成员[i].消息置顶 = true;
//	    }else{
//	    	qun.群成员[i].消息置顶 = false;
//	    }
//  }
    
    data.信息 = qun.信息;
    data.群成员 = qun.群成员;
    
    
    return data;
    
}

/*
{"状态":"成功","信息":[{"免打扰":"否","消息置顶":"否","类别":"群主","群主id":"555555","群id":"3560004","群名称":"1111","群头像":"18475632518","群简介":"1","群人数":2}],"群成员":[{"用户账号":"555555","群昵称":"86_01c87","头像":"http://qqsdg.oss-cn-shenzhen.aliyuncs.com/Userimage_test/pic2018040810014744.jpg","类别":"群主"},{"用户账号":"138687","群昵称":"ads","头像":"http://qqsdg.oss-cn-shenzhen.aliyuncs.com/Userimage_test/80AFDB78-AABC-42E2-9F74-1C37400857A11221532323.jpg","类别":"群员"}]}
 * */