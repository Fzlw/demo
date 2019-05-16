/**
 * 创建人:Coding Farmer_2207
 * 创建时间 2018-12-3 10:15:13
 * 创建内容：群聊消息回调
 * 
 */

var web_im = require('../func/web_im.js');
var pgdb = require('../func/pgdb.js');
var moment = require("moment");
var uuid = require('uuid');

module.exports.run = function(body, pg, redis) {
    let res = {};
    let f = {};
    try {
        if (typeof body.data == 'string') {
            f = JSON.parse(body.data);
        } else {
            f = body.data;
        }
    } catch (e) {
        res.msg = '参数有误';
        body.ack(res);
        return;
    }
    if (!f.receiveId) {
        res.msg = '接收人账号不能为空';
        body.ack(res);
        return;
    }
    if (!f.maxid) {
        res.msg = '消息id不能为空';
        body.ack(res);
        return;
    }
    //记录最新的消息id
    let sql_up = `update 会员表 set 群消息id = $1 where 账号 = $2 and 群消息id < $1`;
    let res_up = pgdb.query(pg, sql_up,[f.maxid,f.receiveId]);
    if (res_up.状态 != '成功') {
        res.msg = '网络异常，处理失败';
        body.ack(res);
        return;
    }
}