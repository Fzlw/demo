/*
 * 创建人：Coding Farmer_2203
 * 创建内容：查看好友详情
 * 创建时间：2018-12-10
 * 创建版本: 1.1.0

func=group_selectFriendDetails

账号=555555
随机码=f797dad1126dd2de00d606232324d280
查询账号=
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
    
     if(!f.查询账号){
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
    
    let sqldata = [];
    if(!f.群id){
    	sql = "SELECT  b.昵称, C.头像,c.个性签名 FROM 会员表 b, 会员资料表 C WHERE  b.账号 = $1 AND  b.账号 = C .账号 ;";
    	sqldata = [f.查询账号];
    }else{
    	sql = "SELECT b.昵称, C .头像, C .个性签名, d.群昵称,d.类别 FROM 会员表 b, 会员资料表 C, 群_群成员表 d WHERE b.账号 = $1 AND b.账号 = C .账号 AND b.账号 = d.用户账号 AND C .账号 = d.用户账号 AND d.状态 = '正常' AND d.群id = $2";
    	sqldata = [f.查询账号,f.群id];
    }
    
    result = pgdb.query(pg,sql,sqldata);
    if(result.状态 != '成功'){
    	data.状态 = '网络异常';
    	return data;
    }
    
    if (result.数据.length == 0) {
    	data.状态 = '该成员不存在';
    	return data;
    }
   
    data.昵称 = result.数据[0].昵称;
    data.头像 = result.数据[0].头像;
    data.个性签名 = result.数据[0].个性签名;
    data.群昵称 = result.数据[0].群昵称 || '';
    data.群身份 = result.数据[0].类别 || '';
    
    
    return data;
    
}

/*
 * {"状态":"成功","信息":[{"昵称":"Aaaa","头像":"https://qqsdg.oss-cn-shenzhen.aliyuncs.com/Userimage_test/IMG_20181205_163739_821.jpg","个性签名":"哈哈本来咯魔图118","群昵称":"Aaaa"}]}
 * */