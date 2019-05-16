/*
 * 创建人：Coding Farmer_2203
 * 创建内容：查看直播间详情
 * 创建时间：2019-02-22
 * 创建版本: 1.1.0

func=group_liveDetails

账号=555555
随机码=f797dad1126dd2de00d606232324d280
直播间id=3560004
直播间记录id=4
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
    
    if(!f.直播间id){
    	data.状态 = '直播间id不能为空';
    	return data;
    }
    if(!f.直播间记录id){
    	data.状态 = '直播间记录id不能为空';
    	return data;
    }
      //头部验证
    f.top = share.top(f.账号, f.随机码, pg);
    if (f.top.状态 != '成功') {
        data.状态 = f.top.状态;
        return data;
    } 
    
    sql = "SELECT A .直播标题, A .直播分类, A .主播id, C .头像, b.在线观看人数 FROM 群_直播间表 A, 群_直播间记录表 b, 会员资料表 C WHERE A .直播间id = $1 AND A .直播间id = b.直播间id AND A .主播id = C .账号 and b.id = $2"
    result = pgdb.query(pg,sql,[f.直播间id,f.直播间记录id]);
	if(result.状态 != '成功'){
		data.状态 = "网络异常";
		return data;
	}
	
	if(result.数据.length == 0){
		data.状态 = "直播间异常";
		return data;
	}
	
	data.直播间信息 = result.数据[0];
	
	 sql = "SELECT C .头像 FROM 群_直播间观众表 a,会员资料表 C  WHERE A .直播间id = $1 AND a.直播间记录id = $2 AND a.观众id = C .账号 order by a.id desc limit 3"
    result = pgdb.query(pg,sql,[f.直播间id,f.直播间记录id]);
	if(result.状态 != '成功'){
		data.状态 = "网络异常";
		return data;
	}
	
	if(result.数据.length == 0){
		data.观众列表 = [];
	}else{
		data.观众列表 = result.数据;
	}
    
    return data;
    
}

