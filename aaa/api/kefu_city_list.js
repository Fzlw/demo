/**
 * Created by 龙琦 on 2017/10/12
 * 创建内容:客服区域选择相应城市的查询接口
	
账号=13907414820
随机码=c15e24ea2862897882285f5d7898e556
区域id=1
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
		
		if(result.数据.length > 0 && result.数据[0].角色权限 == '') {
			console.log('======== err：角色权限为空 ========');
			p.状态 = '未查找到相应用户';
			return p;
		}
	}

    toDo(f,p,pg,mo,redis,pg2);
    return p;
}

function toDo(f,p,pg,mo,redis,pg2) {

	// 区域id的判断
    var result = sel_city(f,pg,mo,redis,pg2);
	
    if(result.状态 != "成功" ){
        p.状态 = result.状态;
        return p;
    }

	p.列表 = result;
    p.状态 = "成功";

    // console.log(p);
    return p;
}

function sel_city(f,pg,mo,redis,pg2){
	
	if(f.区域id == '' || f.区域id == null || f.区域id == undefined){
		var result = {};
		result.状态 = "区域id不能为空";
		return result;
	}
	

	var sql = "select id , 名称, 省id from 平_市级表 where 省id in (select id from 平_省份表 where 区域id = " + f.区域id + " and 状态 = '显示')";
	
	var cityList = pgdb.query(pg,sql);
	//console.log(cityList.数据);
    //var sql = "select id as 市id, 名称 from 平_市级表 where 省id = '" + f.省份id + "'";
    //console.log(sql);
	
	var sql = "select id,名称 from 平_省份表 where 区域id = " + f.区域id + " and 状态 = '显示'";
    var result = pgdb.query(pg,sql);
	//console.log(result.数据);
	
	//用map去加工那个所有数据
	
	var arr = [];
	result.数据.forEach(function(item){
		var city = [];
		cityList.数据.forEach(function(name, index){
			if(item.id == name.省id){
				city.push({'编号':name.id,'市':name.名称 })
			}
		})
		
		arr.push({'省':item.名称,'市':city});
		//console.log(arr);
	})
	//console.log('11111')
	//console.log(arr)
	arr.状态 = '成功';
	console.log(arr);
    return arr;
}


