/**
 * Created by he on 2017/7/15.
 */
/**
 * Created by Coding Farmer_2207 on 2017/7/15
 * 创建内容:常见问题
 *
 func=faq_reply
 账号=789
 随机码=e8eb3b3c-b2eb-403d-afb9-fca818bd16a1
 id=
 问题=您好
 答案=
 行为=添加
 */
var pgdb = require('../func/pgdb.js');
// var web_im = require('../func/web_im.js');
// var moment = require('moment');

module.exports.run = function (body, pg, mo, redis, pg2) {
    var p = {};
    var f = body;	//获取传输的数据
    // console.log(f);
    // console.log(f);
    p.状态 = "成功";


    if (!f.账号) {
        p.状态 = '账号不能为空';
        return p;
    }
    if (!f.随机码) {
        p.状态 = '随机码不能为空';
        return p;
    }
    if (!f.行为) {
        p.状态 = '操作无效';
        return p;
    }
    f.时间 = body.date;
    switch (f.行为) {
        case '添加':
            if (!f.问题) {
                p.状态 = '关键字不能为空';
                return p;
            }
            if (!f.回答) {
                p.状态 = '快捷回复不能为空';
                return p;
            }
            add_faq(f, p, pg);
            break;
        case '删除':
            if (!f.id) {
                p.状态 = '请选择需要操作的关键字';
                return p;
            }
            del_faq(f, p, pg);
            break;
        case '修改':
            if (!f.问题) {
                p.状态 = '关键字不能为空';
                return p;
            }
            if (!f.回答) {
                p.状态 = '快捷回复不能为空';
                return p;
            }
            if (!f.id) {
                p.状态 = '请选择需要操作的关键字';
                return p;
            }
            upd_faq(f, p, pg);
            break;
        case '查询':
            sel_faq(f, p, pg);
            break;
    }

    return p;
}
let add_faq = function (f, p, pg) {
    let sql = `insert into 客_常见问题回复表(关键字,回复内容,状态,录入人,录入时间) values('${f.问题}','${f.回答}','正常','${f.账号}','${f.时间}') RETURNING id;`;
    let sql_data = pgdb.query(pg,sql);
    if(sql_data.状态 != '成功'){
        p.状态 = '网络异常';
        return p;
    }
    p.id = sql_data.数据[0].id;
}
let upd_faq = function (f, p, pg) {
    let sql = `update  客_常见问题回复表 set 关键字 = '${f.问题}',回复内容 = '${f.回答}' where id = '${f.id}';`;
    let sql_data = pgdb.query(pg,sql);
    if(sql_data.状态 != '成功'){
        p.状态 = '网络异常';
        return p;
    }
}
let del_faq = function (f, p, pg) {
    let sql = `delete from 客_常见问题回复表  where id = '${f.id}';`;
    let sql_data = pgdb.query(pg,sql);
    if(sql_data.状态 != '成功'){
        p.状态 = '网络异常';
        return p;
    }
}
let sel_faq = function (f, p, pg) {
    let sql = `select id,关键字,回复内容 from 客_常见问题回复表  group by id;`;
    let sql_data = pgdb.query(pg,sql);
    if(sql_data.状态 != '成功'){
        p.状态 = '网络异常';
        return p;
    }
    p.list = sql_data.数据;
}
