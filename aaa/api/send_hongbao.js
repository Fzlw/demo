/**
 * 创建人:Coding Farmer_3207
 * 创建时间 2019年3月5日 15:54:10
 * 创建内容：发红包
 * 版本：1.9.4
 */

var pgdb = require('../func/pgdb.js');
var redisdb = require('../func/redisdb.js');
var moment = require("moment");
const uuid = require('uuid');
const share = require('./public/share.js');

module.exports.run = function (body, pg, mongo, redis) {
    var p = {};
    var send_run = this.send_run(pg, redis, body);
    //插入日志
    var res = this.add_log(pg, body.receive.onlyID, body.receive, body, send_run.状态);
    if (res.状态 != '成功') {
        p.状态 = '日志插入错误';
        return p;
    }
    return send_run;
}


module.exports.send_run = function (pg, redis, body) {
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

    if (!f.onlyID && !f.随机码) {
        p.状态 = '发送人账号不能为空';
        return p;
    }


    if (!f.groupid) {
        p.状态 = '接收人不能为空';
        return p;
    }

    if (!f.sendType) {
        p.状态 = '红包类型不能为空';
        return p;
    }

    if (!f.money || isNaN(f.money)) {
        p.状态 = '红包金额异常';
        return p;
    }
    if (Number(f.money) < 0.01) {
        p.状态 = '金额最低不能少于0.01元';
        return p;
    }

    if (f.explain) {
        f.explain = (f.explain).replace(/\+/g, " ");
        var reg1 = /[艹草贱傻婊]{1}/g;
        var reg2 = /(日尼玛)|(日你妈)|(日你玛)|(尼玛)|(你妈)|(你玛)|(sb)|(SB)|(Sb)|(sB)|(滚你妈)|(垃圾)|(傻b)|(傻B)|(婊子)|(你大爷)|(小姐)|(屌丝)|(妈卖批)|(脑残)|(你妹)/g;
        if (reg1.test(f.explain) || reg2.test(f.explain)) {
            p.状态 = '您输入了非法字符！';
            return p;
        }
        //var reg = (f.explain).replace(reg1, "***");
        //f.explain = reg.replace(reg2, "***");
    }

    if (f.sendType == '群红包') {
        if (!f.num || isNaN(f.num)) {
            p.状态 = '红包数量异常';
            return p;
        }
        if (Number(f.num) < 1) {
            p.状态 = '红包个数不能少于1个';
            return p;
        }

        if (f.packetsType == '拼手气红包') {
            if (Number(f.money) < 0.01) {
                p.状态 = '单个红包金额不能少于0.01元';
                return p;
            }
            if (Number(f.money) > 200) {
                p.状态 = '单个红包金额不能高于200元';
                return p;
            }
        } else if (f.packetsType == '普通红包') {
            var money = Number(f.money) / Number(f.num);
            if (money < 0.01) {
                p.状态 = '单个红包金额不能少于0.01元';
                return p;
            }
            if (Number(money) > 200) {
                p.状态 = '单个红包金额不能高于200元';
                return p;
            }
        }
    } else if (f.sendType == '个人红包') {
        f.num = 1;
        if (Number(f.money) > 200) {
            p.状态 = '单个红包金额不能高于200元';
            return p;
        }
    } else {
        p.状态 = 'packetsType is anomaly';
        return p;
    }


    //获取会员信息
    var user = this.user(pg, f.onlyID);
    if (user.状态 != '成功') {
        p.状态 = '获取账号信息异常';
        return p;
    }
    f.账号 = user.数据[0].账号;
    f.发送账户 = '多汇币';

    //扣钱
    var Lose_money = this.Lose_money(pg, f);
    if (Lose_money.状态 != '成功') {
        p.状态 = Lose_money.状态;
        return p;
    }



    f.红包id = uuid.v1();
    //数据生成
    if (f.sendType == '群红包' && f.packetsType == '拼手气红包') {
        var red_random = this.red_random(f.num, f.money);
        for (let item of red_random) {
            f.剩余金额 = Number(f.money) - Number(item);
            var insert_packets = this.insert_packets(pg, redis, f, item);
            if (insert_packets.状态 != '成功') {
                p.状态 = insert_packets.状态;
                return p;
            }
        }

    } else if (f.sendType == '群红包' && f.packetsType == '普通红包') {
        for (var i = 1; i <= Number(f.num); i++) {
            let money = Number(f.money) / Number(f.num);
            f.剩余金额 = Number(f.money) - (Number(money) * i);
            var insert_packets = this.insert_packets(pg, redis, f, money);
            if (insert_packets.状态 != '成功') {
                p.状态 = insert_packets.状态;
                return p;
            }
        }

    } else {
        f.剩余金额 = Number(f.money) - Number(f.money);
        var insert_packets = this.insert_packets(pg, redis, f, f.money);
        if (insert_packets.状态 != '成功') {
            p.状态 = insert_packets.状态;
            return p;
        }
    }



    p.状态 = '成功';
    p.红包id = f.红包id;
    return p;
}

/**
 * 商户订单号
 * @param {*} pg 
 * @param {*} f 
 */
module.exports.select_nextval = (pg, f) => {
    sql = `select nextval('群_红包发送记录表_id_seq')  as id`;
    field = pgdb.query(pg, sql).数据[0];
    return field;
}


/**
 * 插入红包记录
 */
module.exports.insert_packets = function (pg, redis, f, item) {
    var 时间 = moment().format('YYYY-MM-DD HH:mm:ss');
    var p = {};
    var select_nextval = this.select_nextval(pg, f);
    f.id = select_nextval.id;
    sql = `insert into 群_红包发送记录表(id, 红包id, 红包类型, 发送账户, 发送人id, 发送人账号, 红包金额, 领取金额, 剩余金额, 红包个数, 接收人id, 接收人账号, 接收状态, 接收时间, 状态, 类别, 录入人, 录入时间, 备注)values
    ( $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) `;
    var all_sql = [select_nextval.id, f.红包id, f.groupid, f.发送账户, f.onlyID, f.账号, f.money, item, f.剩余金额, f.num, '', '', '未领取', '', '成功', f.sendType, '系统', 时间, f.packetsType];
    field = pgdb.query(pg, sql, all_sql);
    if (field.状态 != '成功') {
        p.状态 = '数据异常';
        return p;
    }

    let redis_packets = this.redis_packets(pg, redis, f, item);
    if (redis_packets.状态 != '成功') {
        p.状态 = redis_packets.状态;
        return p;
    }

    p.状态 = '成功';
    return p;

}

/**
 * redis队列
 */
module.exports.redis_packets = function (pg, redis, f, item) {
    var p = {};
    let lsit = { "红包类型": f.groupid, "红包金额": item, "红包id": f.id };
    let relist = redisdb.rpush(redis, f.红包id, lsit);
    if (!relist) {
        p.状态 = '网络异常，请稍后再试';
        return p;
    }
    p.状态 = '成功';
    return p;
}

/**
 * 减钱（个人减，总账户加）
 */
module.exports.Lose_money = function (pg, f) {
    var r = {};
    var p = {};
    //先扣除打赏人个人金额
    r.onlyId = f.onlyID;     //唯一id
    r.pay_type = f.发送账户;  //账户类别
    r.integration = f.money;  //金额
    if(f.sendType == '群红包'){
        if(f.packetsType == '拼手气红包'){
            r.explain = '群发拼手气红包';  //说明
        }else{
            r.explain = '群发普通红包';  //说明
        }
    }else{
        r.explain = '个人发普通红包';  //说明
    }
    r.related_id = f.groupid;  //关联id
    r.pay_detail = f.sendType;  // 交易类别
    r.total_pay_data = [];
    var result = share.pay(r, pg);
    if (result.状态 != '成功') {
        p.状态 = '网络异常，请稍后再试！';
        return p;
    }
    p.状态 = '成功';
    return p;

}
/**
 * 获账号信息
 */
module.exports.user = function (pg, onlyID) {
    var sql = `select 账号 from 会员表 where 唯一id= '${onlyID}' limit 1`;
    var field = pgdb.query(pg, sql);
    return field;
}


//日志添加
module.exports.add_log = function (pg, onlyID, data, body, state) {
    var 时间 = moment().format('YYYY-MM-DD HH:mm:ss');
    var user = this.user(pg, onlyID);
    var sql = `insert into 日志_钱表(账号, 录入时间, ip, 类别, 状态, 内容, 备注, 录入人) values ($1,$2,$3,$4,$5,$6,$7,$8)`;
    var arr_sql = [user.数据[0].账号, 时间, body.ip, body.receive.sendType, state, data, '', '系统'];
    field = pgdb.query(pg, sql, arr_sql);
    return field;
}


/**
 * red_num: 红包个数
 * red_money: 金额
 */
module.exports.red_random = function (red_num, red_money) {
    var new_money = (red_money - 0.01 * red_num) * 100;
    var red_arr = [];
    for (var i = 0; i < red_num; i++) {
        red_arr[i] = 0.01;
        if (new_money > 0) {
            if (i == red_num - 1) {
                var a_m = new_money;
            } else {
                var a_m = parseInt(Math.random() * new_money, 10) + 1;
                new_money = new_money - a_m;
            }

            red_arr[i] = (Number(red_arr[i]) + Number(a_m) / 100).toFixed(2);
        }

    }
    var t;
    for (var i = 0; i < red_arr.length; i++) {
        var rand = parseInt(Math.random() * red_arr.length);
        t = red_arr[rand];
        red_arr[rand] = red_arr[i];
        red_arr[i] = t;
    }
    return red_arr;
}
