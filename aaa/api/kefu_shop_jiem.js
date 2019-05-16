/**
 * Created by 龙琦 on 2017/10/12
 * 创建内容:客服界面接口
 *
账号=13907414820
随机码=c15e24ea2862897882285f5d7898e556
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

    var db = pgdb.query(pg,"select 随机码 from 商_供货商表 where 账号 = '"+ f.账号 +"'");
	console.log(db);
    if(db.数据.length < 1){
        var power = pgdb.query(pg,"select 商随机码, 角色权限 from 平_会员表 where 账号 = '"+ f.账号 +"'");
		if(power.状态 != '成功' || power.数据.length < 1 || !power.数据[0].角色权限){
			p.状态 = "未查找到相应用户";
			return p;
		}
		if(f.随机码 != power.数据[0].商随机码){
			p.状态 = "随机码不正确";
			return p;
		}
    } else if (f.随机码 != db.数据[0].随机码){
        p.状态 = '随机码不正确';
        return p;
    }
    toDo(f,p,pg,mo,redis,pg2);
    return p;
}

function toDo(f,p,pg,mo,redis,pg2) {
    var 列表 = {};
    var result = sel_tupian(f,pg,mo,redis,pg2);
    if(result.状态 != "成功" ){
        p.状态 = result.状态;
        return p;
    }
    列表.轮播图 = result.数据;

    var result1 = sel_kefuz(f,pg,mo,redis,pg2);
    if(result1.状态 != "成功" ){
        p.状态 = result1.状态;
        return p;
    }
    列表.客服 = result1.数据;

    var result2 = sel_wenti(f,pg,mo,redis,pg2);
    if(result2.状态 != "成功" ){
        p.状态 = result2.状态;
        return p;
    }
    列表.常见问题 = result2.数据;

    p.列表 = 列表;
    p.状态 = "成功";
    // console.log(p);
    // console.log(p.列表);
    return p;
}
function sel_tupian(f,pg,mo,redis,pg2){
    var sql = "select 图片 from 平_二级图片表 where 二级标题 = '客服轮换' and 类别 = '商家版客服' and 状态 = '显示' order by 图片id";
    var result = pgdb.query(pg,sql);
    return result;
}

function sel_kefuz(f,pg,mo,redis,pg2){
    var sql = "select 客服组,图标,状态,区域id from 客_客服组表 where 类别 = '商家' or 类别 = '全部' order by 排序";
    var result = pgdb.query(pg,sql);
    return result;
}

function sel_wenti(f,pg,mo,redis,pg2){
    var sql = "select 标题,跳转网址 from 平_常见问题表 where 类别 = '商家版客服中心'";
    var result = pgdb.query(pg,sql);
    return result;
}