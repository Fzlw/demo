/**
 * 创建人:Coding Farmer_3207
 * 创建时间 2019年3月5日 15:54:10
 * 创建内容：红包记录
 * 版本：1.9.4
 */

const pgdb = require('../func/pgdb.js');
const moment = require("moment");

module.exports.run = function (body, pg, mongo, redis) {
    var f = {};
    var p = {};

    try {
        if (typeof body.receive == 'string') {
            f = JSON.parse(body.receive);
        } else {
            f = body.receive;
        }
    } catch (e) {
        p.状态 = '参数有误';
        return p;
    }

    if (!f.onlyID && !f.随机码 && !f.账号) {
        p.状态 = '账号不能为空';
        return p;
    }

    if (!f.page) {
        f.page = 0;
    }
    f.每页条数 = 10;
    f.开始条数 = Number(f.page) * f.每页条数;


    var sql = `select id from 群_红包发送记录表 where 接收人id = '${f.onlyID}' and 接收状态 = '已领取'`;
    var field = pgdb.query(pg, sql);
    if (field.状态 != '成功') {
        p.状态 = '网络异常，请稍后再试';
        return p;
    }
    f.红包个数 = field.数据.length;


    var sql  =`select sum(领取金额) as 总金额  from 群_红包发送记录表 where 接收人id = '${f.onlyID}' and 接收状态 = '已领取' `;
    var field = pgdb.query(pg, sql);
    if (field.状态 != '成功') {
        p.状态 = '网络异常，请稍后再试';
        return p;
    }
    f.总金额 = field.数据[0].总金额;

    var sql = `select 红包类型, 发送人id, 发送人账号, 红包金额,领取金额, 接收人id, 接收人账号,  接收时间,类别,备注 from 群_红包发送记录表 where 接收人id = '${f.onlyID}' and 接收状态 = '已领取' order by id desc limit ${f.每页条数} offset  ${f.开始条数} `;
    var field = pgdb.query(pg, sql);
    if (field.数据.length > 0) {
        var list = [];
        var sum = 0;
        for (let item of field.数据) {
            var user = this.user(pg, item.发送人id);
            if (user.状态 != '成功') {
                p.状态 = '网络异常，请稍后再试！';
                return p;
            }
            var r = {};
            r.昵称 = user.昵称;
            r.时间 = item.接收时间;
            r.金额 = item.领取金额;
            r.类别 = item.备注;
            list.push(r);
            sum = Number(sum) + Number(item.领取金额);
        }

    } else {
        var list = [];
        var sum = 0;
    }


    p.状态 = '成功';
    p.总金额 = Number(f.总金额).toFixed(2);
    p.红包个数 = Number(f.红包个数);
    p.list = list;
    return p;
}

/**
 * 获账号信息
 */
module.exports.user = function (pg, onlyID) {
    var p = {};
    var sql = `select a.昵称 , a.账号, b.头像 from 会员表 a, 会员资料表 b where  a.账号 = b.账号 and a.唯一id = '${onlyID}'`;
    var field = pgdb.query(pg, sql);
    if (field.状态 != '成功') {
        p.状态 = '获取红包数据失败！';
        return p;
    }
    p.状态 = '成功';
    p.头像 = field.数据[0].头像;
    p.昵称 = field.数据[0].昵称;
    return p;
}