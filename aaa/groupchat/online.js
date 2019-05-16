/**
 * 创建人:Coding Farmer_2207
 * 创建时间 2018-12-3 10:15:13
 * 创建内容：离线消息查询
 * 
 */

var pgdb = require('../func/pgdb.js');
var moment = require("moment");

module.exports.run = function (body, pg, redis) {
    let res = {};
    let f = {};
    try {
        //乱码 手机端传值是加编码的 
        f = JSON.parse(decodeURIComponent(body.data));
    } catch (e) {
        res.msg = '数据错误';
        body.ack(res);
        return;
    }
    if (!f) {
        res.msg = '数据错误';
        body.ack(res);
        return;
    }
    if (!f.userid) {
        res.msg = '用户id不能为空';
        body.ack(res);
        return;
    }
    if (!f.random) {
        res.msg = '用户随机码不能为空';
        body.ack(res);
        return;
    }
    let usersql = `select 随机码,商随机码 from 会员表 where 账号 = $1 and 随机码 = $2`;
    let dl_res = pgdb.query(pg, usersql, [f.userid, f.random]);
    if (dl_res.状态 != '成功') {
        res.code = -1;
        res.msg = '网络异常,请稍后再试';
        body.ack(res);
        return;
    }
    let record = dl_res.数据;
    if (!record || record.length != 1) {
        res.code = -1;
        res.msg = '账号或随机码不正确';
        body.ack(res);
        return;
    }

    //获取用户加入的所有群组
    let qz_sql = `select 群id from 群_群成员表 where 用户账号 = $1 and 状态 = '正常'`;
    let res_qz = pgdb.query(pg, qz_sql, [f.userid]);
    if (res_qz.状态 != '成功') {
        res.msg = '网络异常，处理失败';
        body.ack(res);
        return;
    }
    //重新加入群聊房间 
    if (res_qz.数据 && res_qz.数据.length > 0) {
        res_qz.数据.forEach(element => {
            console.log("==========================我加入了" + element.群id + "群聊===========================")
            body.socket.join(element.群id);
        });
    }

    //获取用户的私聊离线消息
    let sql_sl = `select t1.id,t1.消息id,t1.消息类型,t1.会话类型,t1.发送账号,t1.发送时间,t1.消息内容,t2.头像,t4.昵称,t3.备注名称,t1.接收账号 from 群_单聊消息表 t1
    left join 会员资料表 T2 on t2.账号 = t1.发送账号 left join 会员表 T4 on t4.账号 = t1.发送账号 left join 群_好友表 t3 on t1.发送账号 = t3.好友账号 and t1.接收账号 = t3.用户账号 where t1.接收账号 = $1 and t1.消息签收 = '否' and t1.状态 = '正常'`;
    let res_sl = pgdb.query(pg, sql_sl, [f.userid]);
    if (res_sl.状态 != '成功') {
        res.msg = '网络异常，处理失败';
        body.ack(res);
        return;
    }
    let r_list = { "sl_list": [], "ql_list": [], 'msg': '成功' };
    if (res_sl.数据 && res_sl.数据.length > 0) {
        let sl_data = sendOffLineMes(res_sl.数据);
        r_list.sl_list = sl_data.list;
        //记录最新的消息记录
        let sql_up = `update 群_单聊消息表 set 消息签收 = '是',接收时间 = '${moment().format('YYYY-MM-DD HH:mm:ss')}' where id in (${sl_data.data.substr(1)})`;
        let res_up = pgdb.query(pg, sql_up);
        if (res_up.状态 != '成功') {
            res.msg = '网络异常，处理失败';
            body.ack(res);
            return;
        }
    }

    //获取用户的群聊离线消息
    let sql_ql = `select t1.id,t1.消息id,t1.群id,t1.发送账号,t1.消息类型,t1.会话类型,t1.消息内容,t2.群昵称,t3.头像,t1.发送时间 from 群_群聊消息表 t1 left join 群_群成员表 t2 on t1.群id = t2.群id and t1.发送账号 = t2.用户账号 and t2.状态 = '正常'
    left join 会员资料表 t3 on t3.账号 = t1.发送账号 where t2.群id in (select 群id from 群_群成员表 where 用户账号 = $1 and 状态 != '已退群') and t1.id > (select COALESCE(群消息id,0) 群消息id from 会员表 where 账号 = $1)
    and t1.发送账号 != $1 order by t1.id`;
    let res_ql = pgdb.query(pg, sql_ql, [f.userid]);
    if (res_ql.状态 != '成功') {
        res.msg = '网络异常，处理失败';
        body.ack(res);
        return;
    }
    if (res_ql.数据 && res_ql.数据.length > 0) {
        let ql_data = sendOffLineMes_ql(res_ql.数据);
        r_list.ql_list = ql_data.list;
        r_list.live_list = ql_data.list2;
        //记录最新的消息id
        let sql_up = `update 会员表 set 群消息id = ${ql_data.data} where 账号 = $1 and (群消息id < ${ql_data.data} or 群消息id is null)`;
        let res_up = pgdb.query(pg, sql_up, [f.userid]);
        if (res_up.状态 != '成功') {
            res.msg = '网络异常，处理失败';
            body.ack(res);
            return;
        }
    }
    body.ack(r_list);
    return;
}

/**
 * 发送群聊离线消息
 * @param record
 */
let sendOffLineMes_ql = (record) => {
    //循环发送离线消息 一个个的取出 一个个的发消息再把消息的状态改成已读的 去掉了之前的聊天中发给后台的大型json 兼顾三端 这个格式就定了很久 看着太多了
    let ql_list = { "list": [], "data": 0 ,"list2" : []};
    record.forEach(item => {
        let meg = {};
        if(item.消息类型 == '直播提醒'){
            let 消息内容 = JSON.parse(item.消息内容);
            meg.pushData = (消息内容.text).replace(/'/g, "''");
            meg.sendId = "notice_group";
            meg.message = {"liveid":消息内容.直播间id,"liverecordid":消息内容.直播间记录id};
            meg.msgType = '直播提醒';
            meg.sendTime = item.发送时间; //当前时间
            meg.msgId = item.消息id;
            meg.msg_type = "直播提醒";
            meg.groupid = item.群id;
            meg.maxid = item.id;
            meg.sessionType = '直播提醒'; // 类别
            // 发送离线消息
            let megStr = JSON.stringify(meg);
            ql_list.list2.push(megStr);
        }else {
            if (item.消息类型 == '文本' || item.消息类型 == '提醒') {
                let 消息内容 = JSON.parse(item.消息内容);
                meg.pushData = (消息内容.text).replace(/'/g, "''");
            } else {
                meg.pushData = '[' + item.消息类型 + ']';
            }
            meg.msgId = item.消息id; 	// 前台数据库id
            meg.groupid = item.群id + "_group"; 	// 群id
            meg.maxid = item.id; 	// 最新消息id
            if(item.消息类型 == '提醒'){
                meg.sendId = "notice_group"; // 发送人
            }else{
                meg.sendId = item.发送账号; // 发送人
            }
            meg.sessionType = '群聊'; // 类别
            meg.msgType = item.消息类型; // 例如：图文/文本/语音
            meg.sendTime = item.发送时间; //当前时间
            meg.message = JSON.parse(item.消息内容); //消息内容
            meg.sendName = item.群昵称; //发送者名称
            meg.portrait = item.头像; //发送者头像
            // 发送离线消息
            let megStr = JSON.stringify(meg);
            ql_list.list.push(megStr);
        }
        if (Number(item.id) > Number(ql_list.data)) {
            ql_list.data = item.id;
        }
    });
    return ql_list;
}

/**
 * 发送单聊离线消息
 * @param record
 */
let sendOffLineMes = (record) => {
    //循环发送离线消息 一个个的取出 一个个的发消息再把消息的状态改成已读的 去掉了之前的聊天中发给后台的大型json 兼顾三端 这个格式就定了很久 看着太多了
    let sl_list = { "list": [], "data": "" };
    record.forEach(item => {
        let meg = {};
        if (item.消息类型 == '文本' || item.消息类型 == '提醒' || item.消息类型 == '提示') {
            let 消息内容 = JSON.parse(item.消息内容);
            meg.pushData = (消息内容.text).replace(/'/g, "''");
            if(item.消息类型 == '提醒' || item.消息类型 == '提示'){
                meg.groupid = 消息内容.groupid; 	// groupid
            }
        } else {
            meg.pushData = '[' + item.消息类型 + ']';
        }

        if (item.会话类型 == "单聊") {
            meg.sendId = item.发送账号; // 发送人
        } else {
            meg.pushData = JSON.parse(item.消息内容).pushData.replace(/'/g, "''");
            if(item.会话类型 == "群通知" || item.会话类型 == "群聊提醒"){
                meg.sendId = "notice_group"; // 发送人
            }else if(item.会话类型 == "好友通知"){
                meg.sendId = "notice_friend"; // 发送人
            }else{
                meg.sendId = item.发送账号; // 发送人
            }
        }
        
        meg.msgId = item.消息id; 	// 前台数据库id
        meg.receiveId = item.接收账号; // 接收人
        meg.sessionType = item.会话类型; // 类别
        meg.msgType = item.消息类型; // 例如：图文/文本/语音
        meg.sendTime =item.发送时间; //当前时间
        meg.message = JSON.parse(item.消息内容); //消息内容
        meg.sendName = item.备注名称 || item.昵称; //发送者名称
        meg.portrait = item.头像; //发送者头像
        // 发送离线消息
        let megStr = JSON.stringify(meg);
        sl_list.data += ',' + item.id;
        sl_list.list.push(megStr);
    });
    return sl_list;
}