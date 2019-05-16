/**
 * Created by 贺文焱 on 2017/6/24
 * 创建内容:客服列表查询接口
	
   修改时间：2017.10.12 龙琦
   
1、客服中心界面下点击直接打开聊天窗口 
账号=13907414820
随机码=c15e24ea2862897882285f5d7898e556
客服组=商城客服

2、位置界面下点击进入聊天窗口
账号=13907414820
随机码=c15e24ea2862897882285f5d7898e556
市id=253
 */

var pgdb =  require('../func/pgdb.js');

module.exports.run = function(body,pg,mo,redis,pg2){
    var p = {};
    var f = body.receive;		//获取传输的数据

    if(f.账号 == '' || f.账号 == null || f.账号 == undefined){
        p.状态 = "账号不能为空";
        return p;
    }
    if(f.随机码 == '' || f.随机码 == null || f.随机码 == undefined){
        p.状态 = "随机码不能为空";
        return p;
    }
	

    var db = pgdb.query(pg,"select 随机码 from 商_供货商表  where 账号 = '"+ f.账号 +"'");
    if(db.状态 != '成功'){
        p.状态 = '数据错误';
        return p;
    }

	if(db.数据.length == 0) {
		result = pgdb.query(pg, "SELECT 随机码,角色权限  FROM 平_会员表 WHERE 账号 = '" + f.账号 + "' ");

		if(result.数据.length == 0 || result.状态 != '成功') {
			console.log('======== err：账号与随机码不匹配 ========');
			p.状态 = '未查找到相应用户';
        	return p;
		}
		
		/*if(result.数据.length > 0 && f.随机码 != result.数据[0].随机码) {
			console.log('======== err：账号与随机码不匹配 ========');
			p.状态 = '账号与随机码不匹配';
			return p;
		}*/
		
		if(result.数据.length > 0 && result.数据[0].角色权限 == '') {
			console.log('======== err：角色权限为空 ========');
			p.状态 = '未查找到相应用户';
			return p;
		}
	}
	
    /*if(db.数据.length > 0 && f.随机码 != db.数据[0].随机码) {
        p.状态 = '随机码不正确';
        return p;
    }*/

    toDo(f,p,pg,mo,redis,pg2);
    return p;
}

/*
感觉设计的有些不合理，用值判断不是很恰当，后期要优化
*/
function toDo(f,p,pg,mo,redis,pg2) {
	
	var result = {};
	// 内部
	if(f.市id){
		result = sel_kefu_city(f,pg,mo,redis,pg2);
	}else{
		result = sel_kefu(f,pg,mo,redis,pg2);
	}
    if(result.状态 != "成功" ){
        p.状态 = result.状态;
        return p;
    }
    p.数据 = result.数据;
    p.状态 = "成功";
    // console.log(p);
    return p;
}

//内部的客服
function sel_kefu(f,pg,mo,redis,pg2){
	
	if(f.客服组 == '' || f.客服组 == null || f.客服组 == undefined){
		var result = {};
		result.状态 = "客服组名称不能为空";
		return result;
	}
	
    var sql = "select concat(账号, '_service') as 账号,昵称,姓名 from 客_客服表 where 组名 = '" + f.客服组 + "'";
    //console.log(sql);
    var result = pgdb.query(pg,sql);
    return result;
}

//外部的客服
function sel_kefu_city(f,pg,mo,redis,pg2){
	
	if(f.市id == '' || f.市id == null || f.市id == undefined){
		var result = {};
		result.状态 = "市id不能为空";
		return result;
	}
	
    var sql = "select concat(账号, '_service') as 账号,昵称,姓名 from 客_客服表 where 市id = '" + f.市id + "'";
    //console.log(sql);
    var result = pgdb.query(pg,sql);
    return result;
}


