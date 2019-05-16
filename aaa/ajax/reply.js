/**
 * Created by he on 2017/7/15.
 */
/**
 * Created by 贺文焱 on 2017/7/15
 * 创建内容:快捷回复  增删改查
 *
 func=reply
 账号=789
 随机码=e8eb3b3c-b2eb-403d-afb9-fca818bd16a1
 快捷回复内容=您好
 客服id=13
 状态=1
 类别=自定义
 行为=添加
 */
var pgdb =  require('../func/pgdb.js');
// var web_im = require('../func/web_im.js');
var moment = require('moment');

module.exports.run = function(body,pg,mo,redis,pg2){
    var p = {};
    var f = body;	//获取传输的数据
    // console.log(f);
    f.状态 = "不知道";


    if(f.账号 == "" || f.账号 == undefined){
        p.状态 = '账号不能为空';
        return p;
    }
    if(f.随机码 == "" || f.随机码 == undefined){
        p.状态 = '随机码不能为空';
        return p;
    }
    f.时间 = moment().format('YYYY-MM-DD HH:mm:ss');

    var userInfo = this.selUserInfo(f,pg,mo,redis,pg2);
    if (userInfo.数据.length > 0) {
        f.客服id = userInfo.数据[0].id;
        f.录入人 =  userInfo.数据[0].昵称;
    }else{
        p.状态 = '数据异常：随机码错误或账号不存在';
        return p;
    }


    this.toDo(f,p,pg);
    return p;
}

module.exports.toDo = function(f,p,pg,mo,redis,pg2) {
    switch (f.行为)
    {
        case "添加":
            if(f.快捷回复内容 == "" || f.快捷回复内容 == undefined){
                p.状态 = '快捷回复内容不能为空';
                return p;
            }
            var result = this.reply_into(f,pg,mo,redis,pg2);
            if(result.影响行数 < 1 ){
                p.状态 = '添加失败';
                return p;
            }

            var result1 = this.sel_id(f,pg,mo,redis,pg2);
            if(result1.状态!='成功' || result1.数据.length < 1){
                p.状态 = '查询id失败';
                return p;
            }
            p.id = result1.数据[0].id - 1;
            console.log(p);
            break;
        case "删除":
            var result = this.reply_delete(f,pg,mo,redis,pg2);
            if(result.影响行数 < 1 ){
                p.状态 = '删除失败';
                return p;
            }
            break;
        case "修改":
            if(f.快捷回复内容 == "" || f.快捷回复内容 == undefined){
                p.状态 = '快捷回复内容不能为空';
                return p;
            }
            var result = this.reply_update(f,pg,mo,redis,pg2);
            if(result.影响行数 < 1 ){
                p.状态 = '修改失败';
                return p;
            }
            break;
        case "查询":
            var result = this.reply_sel(f,pg,mo,redis,pg2);
            if(result.状态 != "成功"){
                p.状态 = '查询系统快捷语失败';
                return p;
            }
            p.系统 = result.数据;

            var result2 = this.reply_sel2(f,pg,mo,redis,pg2);
            if(result2.状态 != "成功"){
                p.状态 = '查询自定义快捷语失败';
                return p;
            }
            p.自定义 = result2.数据;
            break;
        default:
            p.状态 = "行为不正确";
            return p;
    }


    p.状态 = "成功";
    return p;
}

//修改客服表状态
module.exports.reply_sel = function(f,pg,mo,redis,pg2){
    var sql ="select * from 客_快捷回复消息表 where 类别= '系统' order by id";
    var result = pgdb.query(pg,sql);
    return result;
}

module.exports.reply_sel2 = function(f,pg,mo,redis,pg2){
    var sql ="select * from 客_快捷回复消息表 where 类别= '自定义' and 客服id = '"+f.客服id +"' order by id";
    var result = pgdb.query(pg,sql);
    return result;
}


module.exports.reply_into = function(f,pg,mo,redis,pg2){
    // var sql ="insert into 客_快捷回复消息表(快捷回复内容,创建时间,客服id,录入人,录入时间,状态,类别)"
    // + "values('"+f.快捷回复内容+"','"+f.时间+"','"+f.客服id+"','"+f.录入人+"','"+f.时间+"','"+f.状态+"','"+f.类别+"') RETURNING id";
    var sql ="insert into 客_快捷回复消息表(快捷回复内容,创建时间,客服id,录入人,录入时间,状态,类别)"
        + "values('"+f.快捷回复内容+"','"+f.时间+"','"+f.客服id+"','"+f.录入人+"','"+f.时间+"','"+f.状态+"','"+f.类别+"')";
    // console.log(sql);
    var result = pgdb.query(pg,sql);
    // console.log(result);
    return result;
}

module.exports.sel_id = function(f,pg,mo,redis,pg2){
    var sql = "SELECT nextval('客_快捷回复消息表_id_seq') as id";
    var result = pgdb.query(pg,sql);
    return result;
}


module.exports.reply_update = function(f,pg,mo,redis,pg2){
    var sql ="update 客_快捷回复消息表 set 快捷回复内容 ='"+f.快捷回复内容+"',录入时间 ='"+f.时间+"'  where id='"+f.id+"'";
    // console.log(sql);
    var result = pgdb.query(pg,sql);
    return result;
}

module.exports.reply_delete = function(f,pg,mo,redis,pg2){
    var sql ="delete from 客_快捷回复消息表 where id ='"+f.id+"'";
    // console.log(sql);
    var result = pgdb.query(pg,sql);
    return result;
}
// 根据账号随机码查询客服信息
module.exports.selUserInfo = function(f,pg,mo,redis,pg2) {
    var sql = "SELECT id,昵称 FROM 客_客服表 where 账号 = '" + f.账号 + "' and 随机码 = '"+f.随机码 +"'";
    var result = pgdb.query(pg,sql);
    return result;
}