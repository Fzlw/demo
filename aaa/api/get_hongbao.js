/**
 * 创建人:Coding Farmer_3207
 * 创建时间 2019年3月5日 15:54:10
 * 创建内容：抢红包功能
 * 版本：1.9.4
 */

const pgdb = require('../func/pgdb.js');
const redisdb = require('../func/redisdb.js');
const moment = require("moment");
const share = require('./public/share.js');
const message_remind = require('../groupchat/message_remind.js');

module.exports.run = function (body, pg, mongo, redis) {
    var p = {};
    var send_run = this.send_run(pg, redis, body);
    //插入日志
    var res = this.add_log(pg, body.receive.账号, body.receive, body, send_run.状态);
    if (res.状态 != '成功') {
        p.状态 = '日志插入错误';
        return p;
    }
    if (send_run.状态 == '成功') {
        p.状态 = '成功';
        p.红包状态 = '已抢到';
        p.信息 = send_run.状态;
    } else if (send_run.状态 == '已超时') {
        p.状态 = '成功';
        p.红包状态 = '已超时';
        p.信息 = send_run.状态;
    } else {
        p.状态 = '成功';
        p.红包状态 = '未抢到';
        p.信息 = send_run.状态;
    }
    return p;

}


module.exports.send_run = (pg, redis, body) => {
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
        p.状态 = '发送人账号不能为空';
        return p;
    }

    if (!f.sendType) {
        p.状态 = '红包类型不能为空';
        return p;
    }

    if (!f.groupid) {
        p.状态 = '接收人不能为空';
        return p;
    }

    if (!f.packetsid) {
        p.状态 = '红包id不能为空';
        return p;
    }

    sql = `select id from 群_红包发送记录表 where 红包id = '${f.packetsid}' and  接收状态 = '已退款' `;
    field = pgdb.query(pg, sql);
    if (field.状态 != '成功') {
        p.状态 = '手慢了，红包派完了';
        return p;
    }
    if (field.数据.length > 0) {
        p.状态 = '已超时';
        return p;
    }

    //验证是否领取过
    sql = `select  id from 群_红包发送记录表 where 红包id = '${f.packetsid}'  and  接收人id = '${f.onlyID}' and 接收状态 = '已领取' `;
    field = pgdb.query(pg, sql);
    if (field.数据.length > 0) {
        p.状态 = '该红包你已经领取过了';
        return p;
    }


    //验证红包id是否存在
    sql = `select 红包id, 接收状态 from 群_红包发送记录表 where  红包id = '${f.packetsid}' and  红包类型 ='${f.groupid}' and 接收状态 = '未领取'`;
    field = pgdb.query(pg, sql);
    if (field.数据.length == 0) {
        p.状态 = '手慢了，红包派完了';
        return p;
    }

    f.最后红包 = field.数据.length;


    //队列取红包
    var redis_packets = this.redis_packets(pg, redis, f);
    if (!redis_packets) {
        p.状态 = '手慢了，红包派完了!';
        return p;
    } else {
        redis_packets = JSON.parse(redis_packets);
        f.id = redis_packets.红包id;
        f.红包金额 = redis_packets.红包金额;
    }

    sql = `select  发送账户,发送人id,发送人账号,领取金额,类别,备注 from 群_红包发送记录表 where id = '${f.id}'`;
    field = pgdb.query(pg, sql);
    if (field.状态 != '成功' && field.数据.length == 0) {
        p.状态 = '手慢了，红包派完了!!!';
        return p;
    }

    if (Number(f.红包金额) != Number(field.数据[0].领取金额)) {
        p.状态 = '红包金额领取异常';
        return p;
    }

    f.发红包人id = field.数据[0].发送人id;
    f.发送账户 = field.数据[0].发送账户;
    f.sendType = field.数据[0].类别;
    f.发送人账号 = field.数据[0].发送人账号;
    f.类别 = field.数据[0].类别;
    f.备注 = field.数据[0].备注;

    var user = this.user(pg, f.发红包人id);
    if (user.状态 != '成功') {
        p.状态 = '获取会员信息失败';
        return p;
    }
    f.会员id = user.数据[0].id;

    //修改
    var update_packets = this.update_packets(pg, f);
    if (update_packets.状态 != '成功') {
        p.状态 = '网络异常，请稍后再试';
        return p;
    }
    //加钱
    var Lose_money = this.Lose_money(pg, f);
    if (Lose_money.状态 != '成功') {
        p.状态 = '网络异常，请稍后再试';
        return p;
    }


    if (f.sendType == '群红包') {
        if (f.onlyID != f.发红包人id) {

            if (Number(f.最后红包) == 1) {  //最后一个红包
                this.msg_gr_packets(pg, redis, f);
            } else {
                this.msg_packets(pg, redis, f);
            }
        } else {
            this.msg_ger(pg, redis, f);
        }

    } else {
        this.msg_group(pg, redis, f);
    }


    p.状态 = '成功';
    p.金额 = f.红包金额;
    return p;
}

/**
 * 修改
 */
module.exports.update_packets = (pg, f) => {
    var 时间 = moment().format('YYYY-MM-DD HH:mm:ss');
    var user = this.user(pg, f.onlyID);
    sql = `update 群_红包发送记录表 set 接收人id = '${f.onlyID}', 接收人账号= '${user.数据[0].账号}',接收时间 = '${时间}',接收状态 = '已领取' where id = '${f.id}' and  接收状态 = '未领取'`;
    field = pgdb.query(pg, sql);
    return field;
}

/**
 * redis队列-取第一条
 */
module.exports.redis_packets = function (pg, redis, f) {
    let relist = redisdb.blpop(redis, f.packetsid, 1);
    return relist;
}

/**
 * 减钱（个人减，总账户加）
 */
module.exports.Lose_money = function (pg, f) {

    var r = {};
    var p = {};
    r.onlyId = f.onlyID;     //唯一id
    r.pay_type = f.发送账户;  //账户类别
    r.integration = f.红包金额;  //金额
    if (f.类别 == '群红包') {
        if (f.备注 == '拼手气红包') {
            r.explain = '群领取拼手气红包';  //说明
        } else {
            r.explain = '群领取普通红包';  //说明
        }
        r.related_id = f.groupid + '000' + f.会员id;  //关联id  --传
    } else {
        r.explain = '个人领取普通红包';  //说明
        r.related_id = f.发送人账号;  //关联id  --传
    }

    r.pay_detail = f.sendType;  // 交易类别
    r.total_pay_data = [];
    var result = share.payback(r, pg);
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
    sql = `select id,账号,昵称 from 会员表 where 唯一id= '${onlyID}' limit 1`;
    field = pgdb.query(pg, sql);
    return field;
}


//日志添加
module.exports.add_log = function (pg, onlyID, data, body, state) {
    var 时间 = moment().format('YYYY-MM-DD HH:mm:ss');
    sql = `insert into 日志_钱表(账号, 录入时间, ip, 类别, 状态, 内容, 备注, 录入人) values ($1,$2,$3,$4,$5,$6,$7,$8)`;
    var arr_sql = [onlyID, 时间, body.ip, body.receive.sendType, state, data, '', '系统'];
    field = pgdb.query(pg, sql, arr_sql);
    return field;
}

/**
 *  个人
 */
module.exports.msg_group = (pg, redis, f) => {
    var user = this.user(pg, f.发红包人id);
    var p = {};
    var sql = `select 备注名称 from  群_好友表  where 用户账号 = '${f.账号}' and 好友账号 = '${f.发送人账号}' `;
    var field = pgdb.query(pg, sql);
    if (field.状态 != '成功') {
        p.状态 = '获取好友备注失败';
        return p;
    }
    if (!field.数据[0].备注名称) {
        var name = user.数据[0].昵称;
    } else {
        var name = field.数据[0].备注名称;
    }
    let r = {
        '用户账号': user.数据[0].账号,
        '好友用户账号': f.账号,
        '消息内容': `你领取了${name}的红包`,
        'id': ''
    };
    message_remind.run(r, pg, redis, '私聊提醒');
    this.msg_group2(pg, redis, f);
}

module.exports.msg_group2 = (pg, redis, f) => {
    var users = this.user(pg, f.onlyID);
    var p = {};
    var sql = `select 备注名称 from  群_好友表  where 用户账号 = '${f.发送人账号}' and 好友账号 = '${f.账号}' `;
    var field = pgdb.query(pg, sql);
    if (field.状态 != '成功') {
        p.状态 = '获取好友备注失败';
        return p;
    }
    if (!field.数据[0].备注名称) {
        var name = users.数据[0].昵称;
    } else {
        var name = field.数据[0].备注名称;
    }

    let a = {
        '用户账号': f.账号,
        '好友用户账号': f.发送人账号,
        '消息内容': `${name}领取了我的红包`,
        'id': ''
    };
    message_remind.run(a, pg, redis, '私聊提醒');
}

/**
 *  群消息
 */
module.exports.msg_packets = (pg, redis, f) => {
    var user = this.user(pg, f.发红包人id);
    var p = {};
    var sql = `select 群昵称 from 群_群成员表 where 群id = '${f.groupid}' and 用户账号 = '${f.发送人账号}'`;
    var field = pgdb.query(pg, sql);
    if (field.状态 != '成功') {
        p.状态 = '获取群昵称失败1';
        return p;
    }
    if (!field.数据[0].群昵称) {
        var name = user.数据[0].昵称;
    } else {
        var name = field.数据[0].群昵称;
    }
    let r = {
        '用户账号': user.数据[0].账号,
        '好友用户账号': f.账号,
        '消息内容': `你领取了${name}的红包`,
        'id': f.groupid
    };
    message_remind.run(r, pg, redis, '群聊提醒');
    this.msg_packets2(pg, redis, f);
}

module.exports.msg_packets2 = (pg, redis, f) => {
    var users = this.user(pg, f.onlyID);
    var p = {};
    var sql = `select 群昵称 from 群_群成员表 where 群id = '${f.groupid}' and 用户账号 = '${f.账号}'`;
    var field = pgdb.query(pg, sql);
    if (field.状态 != '成功') {
        p.状态 = '获取群昵称失败2';
        return p;
    }
    if (!field.数据[0].群昵称) {
        var name = users.数据[0].昵称;
    } else {
        var name = field.数据[0].群昵称;
    }
    let s = {
        '用户账号': f.账号,
        '好友用户账号': f.发送人账号,
        '消息内容': `${name}领取了我的红包`,
        'id': f.groupid
    };
    message_remind.run(s, pg, redis, '群聊提醒');
}

//最后一个红包的消息
module.exports.msg_gr_packets = (pg, redis, f) => {
    var user = this.user(pg, f.发红包人id);
    var p = {};
    var sql = `select 群昵称 from 群_群成员表 where 群id = '${f.groupid}' and 用户账号 = '${f.发送人账号}'`;
    var field = pgdb.query(pg, sql);
    if (field.状态 != '成功') {
        p.状态 = '获取群昵称失败1';
        return p;
    }
    if (!field.数据[0].群昵称) {
        var name = user.数据[0].昵称;
    } else {
        var name = field.数据[0].群昵称;
    }

    let r = {
        '用户账号': user.数据[0].账号,
        '好友用户账号': f.账号,
        '消息内容': `你领取了${name}的红包`,
        'id': f.groupid
    };
    message_remind.run(r, pg, redis, '群聊提醒');
    this.msg_gr_packets1(pg, redis, f);
}

module.exports.msg_gr_packets1 = (pg, redis, f) => {
    var users = this.user(pg, f.onlyID);
    var p = {};
    var sql = `select 群昵称 from 群_群成员表 where 群id = '${f.groupid}' and 用户账号 = '${f.账号}'`;
    var field = pgdb.query(pg, sql);
    if (field.状态 != '成功') {
        p.状态 = '获取群昵称失败2';
        return p;
    }
    if (!field.数据[0].群昵称) {
        var name = users.数据[0].昵称;
    } else {
        var name = field.数据[0].群昵称;
    }
    let s = {
        '用户账号': f.账号,
        '好友用户账号': f.发送人账号,
        '消息内容': `${name}领取了我的红包,该红包已被领完`,
        'id': f.groupid
    };
    message_remind.run(s, pg, redis, '群聊提醒');

}

//个人红包
module.exports.msg_ger = (pg, redis, f) => {
    let s = {
        '用户账号': f.发送人账号,
        '好友用户账号': f.发送人账号,
        '消息内容': `你领取了自己的红包`,
        'id': f.groupid
    };
    message_remind.run(s, pg, redis, '群聊提醒');
}