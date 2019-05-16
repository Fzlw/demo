/*
 * 创建人：Coding Farmer_2203
 * 创建内容：查询我的好友
 * 创建时间：2018-11-13
 * 创建版本: 1.1.0

func=group_selectAddedFriend

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
    
      //头部验证
    f.top = share.top(f.账号, f.随机码, pg);
    if (f.top.状态 != '成功') {
        data.状态 = f.top.状态;
        return data;
    } else if (f.top.会.出账 != '是') {
        data.状态 = '经系统检测到您有异常操作行为，功能暂停使用';
        return data;
    }
    
    if(f.条件){
    	sql = "SELECT '' as 省,'' as 市,'' as 区,A .好友账号, A .备注名称, b.昵称, C .头像,a.免打扰,a.消息置顶,c.个性签名 FROM 群_好友表 A, 会员表 b, 会员资料表 C WHERE A .用户账号 = $1 AND  A .状态 = '正常' and (A .好友账号 = $2 OR A .备注名称 LIKE $3 ) AND A .好友账号 = C .账号 AND b.账号 = C .账号 ;";
    	result = pgdb.query(pg,sql,[f.账号,f.条件,'%'+f.条件+'%']);
    }else{
    	sql = "SELECT '' as 省,'' as 市,'' as 区,A .好友账号, A .备注名称, b.昵称, C .头像,a.免打扰,a.消息置顶,c.个性签名 FROM 群_好友表 A, 会员表 b, 会员资料表 C WHERE A .用户账号 = $1 AND A .状态 = '正常' AND A .好友账号 = b.账号 AND A .好友账号 = C .账号 AND b.账号 = C .账号 ;";
    	result = pgdb.query(pg,sql,[f.账号]);
    }
    
    
    if(result.状态 != '成功'){
    	data.状态 = '网络异常';
    	return data;
    }
    
    if(result.数据.length == 0){
    	f.list = [];
    }else{
    	f.list = result.数据;
    	for(let i in f.list){
//  		if (!f.list[i].备注名称) {
//  			f.list[i].备注名称 = f.list[i].昵称;
//  			if (!f.list[i].备注名称) {
//  				f.list[i].备注名称 = '#'
//  			}
//  		}
    		
    		f.list[i].地区 = f.list[i].省 + f.list[i].市 + f.list[i].区;
    		
    		if (f.list[i].地区) {
    			f.list[i].地区 = f.list[i].地区.replace(/\s*/g,"");
    		}
    		
    		if (f.list[i].免打扰 == '是') {
    			f.list[i].免打扰 = true;
    		}else{
    			f.list[i].免打扰 = false;
    		}
    		
    		if (f.list[i].消息置顶 == '是') {
    			f.list[i].消息置顶 = true;
    		}else{
    			f.list[i].消息置顶 = false;
    		}
    		
    	}
    }
    
    data.list = f.list;
    
    return data;
    
}

/*
{"状态":"成功","list":[{"好友账号":"333333","备注名称":"sv_22108","昵称":"sv_22108","头像":"http://qqsdg.oss-cn-shenzhen.aliyuncs.com/Userimage_test/pic2018112119063875.jpg"}]}
 * */