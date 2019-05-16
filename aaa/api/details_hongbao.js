/**
 * 创建人:Coding Farmer_3207
 * 创建时间 2019年3月5日 15:54:10
 * 创建内容：红包详情
 * 版本：1.9.4
 */

const pgdb = require('../func/pgdb.js');
const moment = require("moment");
const common = require('../func/common.js');

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

    if (!f.packetsid) {
        p.状态 = '红包id不能为空';
        return p;
    }


    var sql = `select 红包类型, 发送人id, 发送人账号, 红包金额,领取金额, 接收人id, 接收人账号, 红包个数, 接收时间, 接收状态, 类别,备注 from 群_红包发送记录表 where 红包id = '${f.packetsid}' `;
    var field = pgdb.query(pg, sql);
    if (field.数据.length == 0) {
        p.状态 = '红包id不存在';
        return p;
    }

    f.红包个数 = field.数据[0].红包个数;
    f.红包类别 = field.数据[0].类别;
    f.群号 = field.数据[0].红包类型;
    f.发送人账号 = field.数据[0].发送人账号;
    f.发送人id = field.数据[0].发送人id;
    f.红包金额 = field.数据[0].红包金额;
    f.类别 = field.数据[0].备注;

    //获取红包是否全部领完
    var sql = `select id from 群_红包发送记录表 where 红包id = '${f.packetsid}' and 接收状态 = '已领取'`;
    var fielda = pgdb.query(pg, sql);
    if (fielda.状态 != '成功') {
        p.状态 = '网络异常，请稍后再试5';
        return p;
    }

    if (Number(f.红包个数) == Number(fielda.数据.length)) {  //已领取完

        var sql = `select  接收时间,录入时间 from 群_红包发送记录表 where 红包id = '${f.packetsid}'  order by 接收时间 desc`;
        var fields = pgdb.query(pg, sql);
        if (fields.状态 != '成功') {
            p.状态 = '网络异常，请稍后再试6';
            return p;
        }
        f.time = common.timeSecond(fields.数据[0].接收时间, fields.数据[0].录入时间);
    } else {
        f.time = 0;
    }


    //遍历领取过红包人的昵称和头像
    var lists = [];
    var sum = 0;
    var paih = 0; //排行最高金额
    for (var item of field.数据) {
        if (item.接收状态 == '已领取') { //领取红包人的头像昵称金额

            var user = this.user(pg, item.接收人id);
            if (user.状态 != '成功') {
                p.状态 = '获取红包数据失败！！！';
                return p;
            }


            if (f.红包类别 == '群红包') {
                var sql = `select 群昵称  from 群_群成员表 where 群id = '${f.群号}' and 用户账号 = '${item.接收人账号}'`;
                var field = pgdb.query(pg, sql);
                if (field.状态 != '成功') {
                    p.状态 = '网络异常，请稍后再试1';
                    return p;
                }

                if (!field.数据[0].群昵称) {
                    let r = {};
                    r.头像 = user.头像;
                    r.昵称 = user.昵称;
                    r.金额 = item.领取金额;
                    r.领取时间 = item.接收时间;
                    if (item.领取金额 > paih) {
                        paih = item.领取金额;
                    }
                    r.类别 = f.类别;
                    r.红包类别 = f.红包类别;
                    r.排行 = '';
                    lists.push(r);
                } else {
                    let r = {};
                    r.头像 = user.头像;
                    r.昵称 = field.数据[0].群昵称;
                    r.金额 = item.领取金额;
                    r.领取时间 = item.接收时间;
                    if (item.领取金额 > paih) {
                        paih = item.领取金额;
                    }
                    r.类别 = f.类别;
                    r.红包类别 = f.红包类别;
                    r.排行 = '';
                    lists.push(r);

                }
                sum = Number(sum) + Number(item.领取金额);//统计领取金额


            } else { //个人领取情况

                if (f.账号 == f.发送人账号) {  //发红包人给领取红包人设置的备注
                    sql = `select 备注名称 from 群_好友表 where 用户账号 = '${f.发送人账号}' and  好友账号 = '${item.接收人账号}' `;
                    field = pgdb.query(pg, sql);
                    if (field.状态 != '成功') {
                        p.状态 = '网络异常，请稍后再试3';
                        return p;
                    }
                    let r = {};
                    r.头像 = user.头像;
                    if (!field.数据[0].备注名称) {
                        r.昵称 = user.昵称;
                    } else {
                        r.昵称 = field.数据[0].备注名称;
                    }

                    r.金额 = item.领取金额;
                    r.领取时间 = item.接收时间;
                    if (item.领取金额 > paih) {
                        paih = item.领取金额;
                    }
                    r.类别 = f.类别;
                    r.红包类别 = f.红包类别;
                    r.排行 = '';
                    lists.push(r);


                } else {  //领红包人给发红包人设置的备注
                    sql = `select 备注名称 from 群_好友表 where 用户账号 = '${f.账号}' and  好友账号 = '${f.发送人账号}' `;
                    field = pgdb.query(pg, sql);
                    if (field.状态 != '成功') {
                        p.状态 = '网络异常，请稍后再试3';
                        return p;
                    }

                    let r = {};
                    r.头像 = user.头像;
                    if (!field.数据[0].备注名称) {
                        r.昵称 = user.昵称;
                    } else {
                        r.昵称 = field.数据[0].备注名称;
                    }

                    r.金额 = item.领取金额;
                    r.领取时间 = item.接收时间;
                    if (item.领取金额 > paih) {
                        paih = item.领取金额;
                    }
                    r.类别 = f.类别;
                    r.红包类别 = f.红包类别;
                    r.排行 = '';
                    lists.push(r);

                }



            }


        } else {
            lists.push();
        }
    }


    var list = []; //重组
    var sf =  '否';
    //最高金额
    for (let item of lists) {

        if(item.红包类别 == '个人红包'){
            let r = {};
            r.头像 = item.头像;
            r.昵称 = item.昵称;
            r.金额 = item.金额;
            r.领取时间 = item.领取时间;
            r.排行 = '';
            list.push(r);
        }else{

            if (item.类别 == '普通红包') {
                let r = {};
                r.头像 = item.头像;
                r.昵称 = item.昵称;
                r.金额 = item.金额;
                r.领取时间 = item.领取时间;
                r.排行 = '';
                list.push(r);
            } else {
                if (Number(item.金额) ==  Number(paih) && sf == '否') {
                    sf = '是';
                    let r = {};
                    r.头像 = item.头像;
                    r.昵称 = item.昵称;
                    r.金额 = item.金额;
                    r.领取时间 = item.领取时间;
                    r.排行 = '手气最佳';
                    list.push(r);
                } else {
                    let r = {};
                    r.头像 = item.头像;
                    r.昵称 = item.昵称;
                    r.金额 = item.金额;
                    r.领取时间 = item.领取时间;
                    r.排行 = '';
                    list.push(r);
                }
            }

        }

    }

    //判断该id有没有领取过红包
    sql = `select  接收人账号, 类别, 领取金额 from 群_红包发送记录表 where 红包id = '${f.packetsid}' and  接收人id = '${f.onlyID}' and 接收状态 = '已领取'`;
    field = pgdb.query(pg, sql);
    if (field.状态 != '成功') {
        p.状态 = '获取红包数据失败';
        return p;
    }

    var data = {};
    //未领取 获取发红包人的群昵称
    if (field.数据.length == 0) {
        var user = this.user(pg, f.发送人id);
        if (user.状态 != '成功') {
            p.状态 = '获取红包数据失败！！！';
            return p;
        }

        if (f.红包类别 == '群红包') { //显示发红包人头像和昵称

            var sql = `select 群昵称  from 群_群成员表 where 群id = '${f.群号}' and 用户账号 = '${f.发送人账号}'`; //获取群昵称
            var fields = pgdb.query(pg, sql);
            if (fields.状态 != '成功') {
                p.状态 = '获取红包数据失败！！';
                return p;
            }
            if (!fields.数据[0].群昵称) {
                data.头像 = user.头像;
                data.昵称 = user.昵称;
                data.金额 = 0;
                data.类别 = f.类别;
            } else {
                data.头像 = user.头像;
                data.昵称 = fields.数据[0].群昵称;
                data.金额 = 0;
                data.类别 = f.类别;
            }

        } else { //显示发红包人头像和昵称（我给发送人设置的备注）

            if (f.账号 == f.发送人账号) { //判断进来的是否是发红包人账号
                data.头像 = user.头像;
                data.昵称 = user.昵称;
                data.金额 = 0;
                data.类别 = f.类别;
            } else { //领取人给发红包设置的备注
                var sql = `select 备注名称 from 群_好友表 where 用户账号 = '${f.账号}' and  好友账号 = '${f.发送人账号}' `;
                var fields = pgdb.query(pg, sql);
                if (fields.状态 != '成功') {
                    p.状态 = '获取红包数据失败！！';
                    return p;
                }
                data.头像 = user.头像;
                data.金额 = 0;
                data.类别 = f.类别;
                if (!fields.数据[0].备注名称) {
                    data.昵称 = user.昵称;
                } else {
                    data.昵称 = fields.数据[0].备注名称;
                }


            }


        }

    } else { //已领取

        if (f.红包类别 == '群红包') { //显示发红包的头像，昵称 ，我的领取金额
            var user = this.user(pg, f.发送人id);
            if (user.状态 != '成功') {
                p.状态 = '获取红包数据失败！！！';
                return p;
            }
            data.头像 = user.头像;
            data.金额 = field.数据[0].领取金额; //显示我领取的金额
            //获取群昵称
            sql = `select 群昵称  from 群_群成员表 where 群id = '${f.群号}' and 用户账号 = '${f.发送人账号}'`;
            fields = pgdb.query(pg, sql);
            if (fields.状态 != '成功') {
                p.状态 = '获取红包数据失败！！';
                return p;
            }
            if (!fields.数据[0].群昵称) {  //发送人昵称为空 取会员表昵称
                sql = `select  昵称  from 会员表 where  账号 = '${f.发送人账号}' `;
                fielda = pgdb.query(pg, sql);
                if (fielda.状态 != '成功') {
                    p.状态 = '网络异常';
                    return p;
                }
                data.昵称 = fielda.数据[0].昵称;
            } else {
                data.昵称 = fields.数据[0].群昵称;
            }
            data.类别 = f.类别;

        } else {  //显示发红包人的头像和我给发红包人设置的备注
            var user = this.user(pg, f.发送人id);
            if (user.状态 != '成功') {
                p.状态 = '获取红包数据失败！！！';
                return p;
            }

            if (f.账号 == f.发送人账号) { //进来的账号等于发红包人账号
                data.头像 = user.头像;
                data.昵称 = user.昵称;
                data.金额 = 0;
                data.类别 = f.类别;
            } else {  //我给发红包人设置的备注

                var sql = `select 备注名称 from  群_好友表  where 用户账号 = '${f.账号}' and 好友账号 = '${f.发送人账号}' `;
                var fieldv = pgdb.query(pg, sql);
                if (fieldv.状态 != '成功') {
                    p.状态 = '获取好友备注失败';
                    return p;
                }
                data.头像 = user.头像;
                data.金额 = field.数据[0].领取金额;
                data.类别 = f.类别;

                if (!fieldv.数据[0].备注名称) {
                    data.昵称 = user.昵称;
                } else {
                    data.昵称 = fieldv.数据[0].备注名称;
                }

            }

        }
    }



    p.状态 = '成功';
    p.data = data;
    p.time = f.time;
    p.红包个数 = f.红包个数;
    p.已领个数 = list.length;
    p.红包金额 = f.红包金额;
    p.已领金额 = Number(sum).toFixed(2);
    if (Number(lists.length) == Number(f.红包个数)) {
        p.list = list;
    } else {
        p.list = lists;
    }

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