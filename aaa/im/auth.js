/**
 * 创建人:Coding Farmer_2207
 * 创建时间：2018-5-8 15:36:17
 * 创建内容：用户上线认证
 * 
 */
var web_im = require('../func/web_im.js');
var config = require('../func/config.js');
var redisdb = require('../func/redisdb.js');
var pgdb = require('../func/pgdb.js');
var moment = require("moment");
var conf = config.get('app');
/*
    账号和随机码
    账号是xx xx_service xx_商家 xx_异业...
 */

module.exports.run = function (body, pg, mo, redis, pg2) {

    let res = {};
    let data = {};
    try {
        //乱码 手机端传值是加编码的 
        data = JSON.parse(decodeURIComponent(body.data));
    } catch (e) {
        res.msg = '数据错误';
        body.ack(res);
        return;
    }
    if(!data){
        res.msg = '数据错误';
        body.ack(res);
        return;
    }

    //##############################业务代码START###############################


    //用户账号和随机码正确则设置认证成功，放入redis数据库设置为在线用户
    body.userid = data.userid;
    body.random = data.random;
    let userid = body.userid + '_'; //普通用户: 13344445555; 商家用户: 13344445555_商家; 客服: 13344445555_service  油站用户 10000025_油站
    let userids = userid.split("_");
    let table = '';
    let sql = ``;

    // ======================================================添加验证身份====================================================== 

    if (userids[1] == 'service') {
        sql = `select 随机码 from 客_客服表 where 账号 = '${userids[0]}'`;
    } else if (userids[1] == '油站') {
        sql = `select 随机码 from 油站商家表 where 账号 = '${userids[0]}'`;
    } else {
        sql = `select 随机码,商随机码 from 会员表 where 账号 = '${userids[0]}'`;
    }
    let dl_res = pgdb.query(pg, sql);
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
    } else {
        if (userids[1] == '商家' || decodeURIComponent(userids[1]) == '商家') {
            if (body.random != record[0].商随机码) {
                res.code = -1;
                res.msg = '随机码不正确';
                body.ack(res);
                return;
            }
        } else {
            if (body.random != record[0].随机码) {
                res.code = -1;
                res.msg = '随机码不正确';
                body.ack(res);
                return;
            }
        }

    }

    // ======================================================添加验证身份====================================================   

    // 放验证后面，通过了才替换redis
    let online = web_im.get_online(redis, data.userid); // userid是唯一的 存在redis里的值

    // 有值 立马失效 redis中socketid为空，msg值为去屎吧 过期时间为0
    if (online.code == 1) {
        // console.log('============之前redis就存在了，这里判断一下他的socketid是不是同一个终端不停刷认证，是的话随他玩，不是的话就是新的（因为已经验证了随机码，随机码都正确了那一定是新的），杀了前面的并且给前面的发消息让他死！！！！============');
        if (body.socket.id == online.socketid) {
            // console.log('=================刷认证的=====================');
            web_im.set_online(redis, data.userid, '', '去死吧', 0);
        } else {
            // console.log("终端不同 修改获取redis数据")
            var old_data = redisdb.get(redis, data.userid);
            old_data = JSON.parse(old_data);
            if(data.userid == undefined || data.userid == null || data.userid == '' || old_data.userid == undefined || old_data.userid == null || old_data.userid == ''){
                res.code = -1;
                res.msg = '用户id不能为空';
                body.ack(res);
                return;
            }
            try {
                old_data.userid = data.userid + '@离线';
            } catch (error) {
                console.error(old_data);
                console.error(data);
                res.code = -1;
                res.msg = '用户id不能为空';
                body.ack(res);
                return;
            }
            
            old_data = JSON.stringify(old_data);
            let key_name = data.userid + '@离线';
            redisdb.set(redis, key_name, old_data);
            // 给他6分钟的时间发消息 不发就死。
            redisdb.expire(redis, key_name, 360);
            // console.log('==================给他6分钟的时间发消息 不发就死。=============== ');
            let msg = {};
            msg.code = -1; // 双开的标识
            msg.message = '随机码不正确';
            msg.receiveId = key_name;
            let messageStr = JSON.stringify(msg);
            let socket = web_im.find_socket(old_data.socketid);
            if (socket == null) {
                //如果找不到就尝试发布频道从其他进程的中寻找socket对象
                redisdb.publish(redis, conf.redis.web_imChannelList[2], messageStr);
            } else {
                var sss = web_im.connect_status(socket, messageStr);
                web_im.set_online(redis, key_name, '', '去死吧', 0);
            }
            web_im.set_online(redis, data.userid, '', '去死吧', 0);
        }
    }
    //##############################业务代码END###############################


    //socket是长连接 不会断 在服务器中可直接拿到触发事件的socket对象 这里给那个socket赋值
    //socket对象设置
    body.socket.userid = body.userid;
    body.socket.random = body.random;

    let time = moment().format('YYYY-MM-DD HH:mm:ss');

    //设置在线状态    ---- 最后的60为客户端与服务60无心跳进行断线操作。把socketid userid都存在redis里
    let result = web_im.set_online(redis, body.userid, body.socket.id, '认证时间：' + time, 60);

    //=============================回复客户端==============================
    if (result.code == 1) {
        //########################离线单聊消息START#########################     这里的sql执行   无论对错与否  不要返给前端错误消息   用户已经正常在线  大不了下次上线时  再给他发一遍未接收的离线消息

        // 单聊表通过账号查找未接收的私聊信息
        let record1 = queryOffLineMes(pg, body, 'im_单聊表');
        if (record1.length > 0) {
            //发送离线消息 用遍历去一条条发送消息
            sendOffLineMes(pg, body.socket, record1, 'im_单聊表');
        }
        //查询客服离线消息
        let record2 = queryOffLineMes(pg, body, 'im_客服表');
        if (record2.length > 0) {
            //发送离线消息
            sendOffLineMes(pg, body.socket, record2, 'im_客服表');
        }

        //客服不用发系统消息
        if (userids[1] != 'service') {


            //油站 离线群发/单发系统消息
            if (userids[1] == '油站') {
                sendSysOffLineMes_oli(pg, body.socket, body.userid);
            } else {
                //离线群发/单发系统消息
                sendSysOffLineMes(pg, body.socket, body.userid);
            }
            //离线账单系统消息
            sendSysBillMes(pg, body.socket, body.userid);
            //离线订单系统消息
            send_order_shops(pg, body.socket, body.userid);
            //离线物流系统消息
            sendSysTradeMes(pg, body.socket, body.userid);
        }

        //########################离线单聊消息END#########################
        res.code = 1;
        res.msg = body.userid + '认证成功';
    } else {
        res.code = -3;
        res.msg = body.userid + '认证出错';
    }
    body.ack(res);

}


/**
 * 发送单聊离线消息
 * @param record
 */
let sendOffLineMes = (pg, socket, record, table) => {
    let msg_id = ``;
    //循环发送离线消息 一个个的取出 一个个的发消息再把消息的状态改成已读的 去掉了之前的聊天中发给后台的大型json 兼顾三端 这个格式就定了很久 看着太多了
    record.forEach(item => {
        let meg = {};
        if (item.消息类型 == '文本') {
            let 消息内容 = JSON.parse(item.消息内容);
            meg.pushData = (消息内容.text).replace(/'/g, "''");
        } else {
            meg.pushData = '[' + item.消息类型 + ']';
        }
        meg.msgId = item.消息id; 	// 前台数据库id
        msg_id += `'${item.消息id}',`;
        meg.sendId = item.发送者; // 发送人
        meg.receiveId = item.接收者; // 接收人
        meg.sessionType = '单聊'; // 类别
        meg.msgType = item.消息类型; // 例如：图文/文本/语音
        meg.sendTime = moment().format('YYYY-MM-DD HH:mm:ss'); //当前时间
        meg.message = JSON.parse(item.消息内容); //消息内容
        meg.sendName = item.发送者名称; //发送者名称
        meg.receiveName = item.接收者名称; //接收者名称
        meg.portrait = item.发送者头像; //发送者头像
        meg.receivePortrait = item.接收者头像; //接收者头像

        // 发送离线消息
        let megStr = JSON.stringify(meg);

        // 给用户自己发消息 用自己的socket socket一定在线的 只不过说可能有断网的时候
        // 最好这里优化一下 取得回值，有回值就一定是接收到了 当然 也有没回值但收到的情况 在内存溢出的情况下 出现的多 这里就可以接收签收id 返回值有result 是前端传来的签收id
        web_im.send_message(socket, megStr);
    });
    if (msg_id) {
        //修改消息状态
        finishSendMes(pg, msg_id, table);
    }

}


/**
 * 拼接群发/单发系统消息体
 * @param record 数据库里取出的值
 * @param userid
 */
let spliceMessage = (record, userid, msgtype) => {
    let message = {};
    try {
        message = JSON.parse(record.消息内容);
    } catch (e) {
        console.log('数据格式错误', e.message);
    }
    let meg = {
        message: message,
        msgId: record.消息id,
        msgType: record.消息类型,
        sendId: '001',
        receiveId: userid,
        sendTime: record.发送时间,
        sessionType: '系统消息'
    };
    // 商城通知类是text 群发系统消息类是title
    let pushDataInfo = message.text || message.title;
    meg.pushData = '[系统消息]' + pushDataInfo;
    let megStr = JSON.stringify(meg);
    return megStr;
}

/**
 * 油站 发送群发/单发离线系统消息
 * @param data
 * @param pg
 * @param socket
 * @param userid
 */
let sendSysOffLineMes_oli = (pg, socket, userid) => {

    let nowTime = moment().format('YYYY-MM-DD HH:mm:ss');
    //1.查询系统消息接收表是否有系统群发消息遗漏未接收的消息  或者  系统单发也是走的这一步
    let sql = `SELECT A.消息id, B.消息类型, B.消息内容, B.发送时间, B.状态 FROM im_油站系统消息接收表 A 
               LEFT JOIN im_油站系统消息内容表 B ON A.消息id = B.消息id
               WHERE A.接收者账号 = '${userid}' AND A.状态 = '未接收' AND B.状态 = '正常'`;
    let record = pgdb.query(pg, sql).数据 || [];
    if (record.length > 0) {
        let sql2 = `UPDATE im_油站系统消息接收表 SET 状态 = '已接收', 接收时间 = '${nowTime}' WHERE 接收者账号 = '${userid}'  AND 状态 = '未接收'`;
        let message_id = ``;
        for (let i = 0; i < record.length; i++) {
            // 组发系统消息的格式
            let megStr = spliceMessage(record[i], userid, '系统单发');
            // 系统消息没有判断ack 没有管到底有没有接收到
            web_im.send_system(socket, megStr);
            // sql拼接
            if (i == record.length - 1) {
                message_id += `'${record[i].消息id}'`;
            } else {
                message_id += `'${record[i].消息id}',`;
            }
        }
        if (message_id) {
            sql2 += ` AND 消息id in (${message_id})`;
            console.log("系统群发执行的语句:" + sql2);
            pgdb.query(pg, sql2);
        }
    }

    //2.筛选 [系统消息接收表] 对比 [系统消息内容表] 查询未接收的系统消息
    // 从内容表中找到所有群发的数据，再去接收表中查看当前的账号接收了几条群发的数据 有关联的不用管 没有关联的说明还没接收
    // let queryContentSQL = `SELECT 消息id, 消息类型, 消息内容, 发送时间 FROM im_系统消息内容表 WHERE 消息id NOT IN (${receiveArray})`;  //TODO 该SQL效率略低 并且not in有上限个数1000 先暂时这样 后期再做优化
    let queryContentSQL = `SELECT A.消息id, A.消息类型, A.消息内容, A.发送时间, B.接收者账号 FROM im_油站系统消息内容表 A
                           LEFT JOIN 
                           (SELECT * FROM "im_油站系统消息接收表" WHERE 接收者账号 = '${userid}' and 会话类型 = '系统群发') B
                           ON A.消息id = B.消息id
                           WHERE A.会话类型 = '系统群发' AND B.接收者账号 IS NULL`;
    // console.log('======================系统群发========================',queryContentSQL)
    let contentRecord = pgdb.query(pg, queryContentSQL).数据 || [];
    if (contentRecord.length > 0) {
        let sql2 = `INSERT INTO im_油站系统消息接收表(接收者账号, 会话类型, 消息类型, 消息id, 接收时间, 状态,录入人,录入时间) VALUES`;
        let sql3 = ``;
        for (let i = 0; i < contentRecord.length; i++) {
            let rec = contentRecord[i];
            //发送消息
            let megStr = spliceMessage(rec, userid, '系统群发');
            // console.log('-------------------系统消息格式哦----------------------')
            // console.log(megStr);
            web_im.send_system(socket, megStr);
            //插入接收表
            if (i == contentRecord.length - 1) {
                sql3 += `('${userid}', '系统群发', '${rec.消息类型}', '${rec.消息id}', '${nowTime}', '已接收', '系统', '${nowTime}');`;
            } else {
                sql3 += `('${userid}', '系统群发', '${rec.消息类型}', '${rec.消息id}', '${nowTime}', '已接收', '系统', '${nowTime}'),`;
            }
        }
        if (sql3) {
            console.log("系统群发执行的语句:" + sql2 + sql3);
            pgdb.query(pg, sql2 + sql3);
        }
    }
};

/**
 * 发送群发/单发离线系统消息
 * @param data
 * @param pg
 * @param socket
 * @param userid
 */
let sendSysOffLineMes = (pg, socket, userid) => {

    let nowTime = moment().format('YYYY-MM-DD HH:mm:ss');
    //1.查询系统消息接收表是否有系统群发消息遗漏未接收的消息  或者  系统单发也是走的这一步
    let sql = `SELECT A.消息id, B.消息类型, B.消息内容, B.发送时间, B.状态 FROM im_系统消息接收表 A 
               LEFT JOIN im_系统消息内容表 B ON A.消息id = B.消息id
               WHERE A.接收者账号 = '${userid}' AND A.状态 = '未接收' AND B.状态 = '正常'`;
    let record = pgdb.query(pg, sql).数据 || [];
    if (record.length > 0) {
        let sql2 = `UPDATE im_系统消息接收表 SET 状态 = '已接收', 接收时间 = '${nowTime}' WHERE 接收者账号 = '${userid}'  AND 状态 = '未接收'`;
        let message_id = ``;
        for (let i = 0; i < record.length; i++) {
            // 组发系统消息的格式
            let megStr = spliceMessage(record[i], userid, '系统单发');
            // 系统消息没有判断ack 没有管到底有没有接收到
            web_im.send_system(socket, megStr);
            // sql拼接
            if (i == record.length - 1) {
                message_id += `'${record[i].消息id}'`;
            } else {
                message_id += `'${record[i].消息id}',`;
            }
        }
        if (message_id) {
            sql2 += ` AND 消息id in (${message_id})`;
            console.log("系统群发执行的语句:" + sql2);
            pgdb.query(pg, sql2);
        }
    }

    //2.筛选 [系统消息接收表] 对比 [系统消息内容表] 查询未接收的系统消息
    // 从内容表中找到所有群发的数据，再去接收表中查看当前的账号接收了几条群发的数据 有关联的不用管 没有关联的说明还没接收
    // let queryContentSQL = `SELECT 消息id, 消息类型, 消息内容, 发送时间 FROM im_系统消息内容表 WHERE 消息id NOT IN (${receiveArray})`;  //TODO 该SQL效率略低 并且not in有上限个数1000 先暂时这样 后期再做优化
    let queryContentSQL = `SELECT A.消息id, A.消息类型, A.消息内容, A.发送时间, B.接收者账号 FROM im_系统消息内容表 A
                           LEFT JOIN 
                           (SELECT * FROM "im_系统消息接收表" WHERE 接收者账号 = '${userid}' and 会话类型 = '系统群发') B
                           ON A.消息id = B.消息id
                           WHERE A.会话类型 = '系统群发' AND B.接收者账号 IS NULL`;
    // console.log('======================系统群发========================',queryContentSQL)
    let contentRecord = pgdb.query(pg, queryContentSQL).数据 || [];
    if (contentRecord.length > 0) {
        let sql2 = `INSERT INTO im_系统消息接收表(接收者账号, 会话类型, 消息类型, 消息id, 接收时间, 状态,录入人,录入时间) VALUES`;
        let sql3 = ``;
        for (let i = 0; i < contentRecord.length; i++) {
            let rec = contentRecord[i];
            //发送消息
            let megStr = spliceMessage(rec, userid, '系统群发');
            // console.log('-------------------系统消息格式哦----------------------')
            // console.log(megStr);
            web_im.send_system(socket, megStr);
            //插入接收表
            if (i == contentRecord.length - 1) {
                sql3 += `('${userid}', '系统群发', '${rec.消息类型}', '${rec.消息id}', '${nowTime}', '已接收', '系统', '${nowTime}');`;
            } else {
                sql3 += `('${userid}', '系统群发', '${rec.消息类型}', '${rec.消息id}', '${nowTime}', '已接收', '系统', '${nowTime}'),`;
            }
        }
        if (sql3) {
            console.log("系统群发执行的语句:" + sql2 + sql3);
            pgdb.query(pg, sql2 + sql3);
        }

    }
};


/**
 * 拼接物流系统消息体
 * @param record
 * @returns {{msgId: *, sendId: string, receiveId: *, sessionType: *, msgType: *, pushData: *, sendTime: *, message: {}}}
 */
let spliceTradeMessage = record => {

    let message = {};
    try {
        // console.log(record.接收者账号 + '接收离线物流系统消息:', record.消息内容);
        message = JSON.parse(record.消息内容);
    } catch (e) {
        // console.log('数据格式错误', e.message);
    }
    let meg = {
        msgId: record.消息id,
        sendId: '002',
        receiveId: record.接收者账号,
        sessionType: record.会话类型,
        msgType: record.消息类型,
        pushData: record.推送标题,
        sendTime: record.发送时间,
        message: message
    };

    let megStr = JSON.stringify(meg);
    return megStr;


};

/**
 * 发送离线物流系统消息
 * @param pg
 * @param socket
 * @param userid
 */
let sendSysTradeMes = (pg, socket, userid) => {
    let nowTime = moment().format('YYYY-MM-DD HH:mm:ss');
    //1.查询系统消息接收表是否有系统群发消息遗漏未接收的消息  或者  系统单发也是走的这一步
    let sql = `SELECT 消息id, 接收者账号, 会话类型, 消息类型, 推送标题, 消息内容, 发送时间 FROM im_系统消息物流表 WHERE 状态 = '未接收' AND 接收者账号 = '${userid}'`;
    let record = pgdb.query(pg, sql).数据 || [];
    if (record.length > 0) {
        let sql2 = `UPDATE im_系统消息物流表 SET 状态 = '已接收', 接收时间 = '${nowTime}' WHERE 接收者账号 = '${userid}'`;
        let message_id = ``;
        for (let i = 0; i < record.length; i++) {
            //发送消息
            let megStr = spliceTradeMessage(record[i]);
            web_im.send_system(socket, megStr);
            // sql拼接
            if (i == record.length - 1) {
                message_id += `'${record[i].消息id}'`;
            } else {
                message_id += `'${record[i].消息id}',`;
            }
        }
        if (message_id) {
            sql2 += ` AND 消息id in (${message_id})`;
            console.log("物流执行的语句:" + sql2);
            pgdb.query(pg, sql2);
        }
    }
};

/**
 * 拼接订单系统消息体
 * @param record
 * @returns {{msgId: *, sendId: string, receiveId: *, sessionType: *, msgType: *, pushData: *, sendTime: *, message: {}}}
 */
let order_shops_Message = record => {

    let message = {};
    try {
        // console.log(record.接收者账号 + '接收离线账单系统消息:', record.消息内容);
        message = JSON.parse(record.消息内容);
    } catch (e) {
        // console.log('数据格式错误', e.message);
    }
    let meg = {
        msgId: record.消息id,
        sendId: '004',
        receiveId: record.接收者账号,
        sessionType: record.会话类型,
        msgType: record.消息类型,
        pushData: record.推送标题,
        sendTime: record.发送时间,
        message: message
    };

    let megStr = JSON.stringify(meg);
    return megStr;

};

/**
 * 发送订单单离线系统消息
 * @param pg
 * @param socket
 * @param userid
 */
let send_order_shops = (pg, socket, userid) => {

    let nowTime = moment().format('YYYY-MM-DD HH:mm:ss');

    //1.查询系统消息接收表是否有系统群发消息遗漏未接收的消息  或者  系统单发也是走的这一步
    let sql = `SELECT 消息id, 接收者账号, 会话类型, 消息类型, 推送标题, 消息内容, 发送时间 FROM im_系统消息订单表 WHERE 状态 = '未接收' AND 接收者账号 = '${userid}'`;
    let record = pgdb.query(pg, sql).数据 || [];
    if (record.length > 0) {
        let sql2 = `UPDATE im_系统消息订单表 SET 状态 = '已接收', 接收时间 = '${nowTime}' WHERE 接收者账号 = '${userid}'`;
        let message_id = ``;
        for (let i = 0; i < record.length; i++) {
            //发送消息 拼装消息体
            let megStr = order_shops_Message(record[i]);
            web_im.send_system(socket, megStr);
            //消息设置已接收
            // sql拼接
            if (i == record.length - 1) {
                message_id += `'${record[i].消息id}'`;
            } else {
                message_id += `'${record[i].消息id}',`;
            }
        }
        if (message_id) {
            sql2 += ` AND 消息id in (${message_id})`;
            console.log("账单执行的语句:" + sql2);
            pgdb.query(pg, sql2);
        }
    }
};



/**
 * 拼接账单系统消息体
 * @param record
 * @returns {{msgId: *, sendId: string, receiveId: *, sessionType: *, msgType: *, pushData: *, sendTime: *, message: {}}}
 */
let spliceBillMessage = record => {

    let message = {};
    try {
        // console.log(record.接收者账号 + '接收离线账单系统消息:', record.消息内容);
        message = JSON.parse(record.消息内容);
    } catch (e) {
        // console.log('数据格式错误', e.message);
    }
    let meg = {
        msgId: record.消息id,
        sendId: '003',
        receiveId: record.接收者账号,
        sessionType: record.会话类型,
        msgType: record.消息类型,
        pushData: record.推送标题,
        sendTime: record.发送时间,
        message: message
    };

    let megStr = JSON.stringify(meg);
    return megStr;

};

/**
 * 发送账单离线系统消息
 * @param pg
 * @param socket
 * @param userid
 */
let sendSysBillMes = (pg, socket, userid) => {

    let nowTime = moment().format('YYYY-MM-DD HH:mm:ss');

    //1.查询系统消息接收表是否有系统群发消息遗漏未接收的消息  或者  系统单发也是走的这一步
    let sql = `SELECT 消息id, 接收者账号, 会话类型, 账单类型, 消息类型, 推送标题, 消息内容, 发送时间 FROM im_系统消息账单表 WHERE 状态 = '未接收' AND 接收者账号 = '${userid}'`;
    let record = pgdb.query(pg, sql).数据 || [];
    if (record.length > 0) {
        let sql2 = `UPDATE im_系统消息账单表 SET 状态 = '已接收', 接收时间 = '${nowTime}' WHERE 接收者账号 = '${userid}'`;
        let message_id = ``;
        for (let i = 0; i < record.length; i++) {
            //发送消息
            let megStr = spliceBillMessage(record[i]);
            web_im.send_system(socket, megStr);
            //消息设置已接收
            // sql拼接
            if (i == record.length - 1) {
                message_id += `'${record[i].消息id}'`;
            } else {
                message_id += `'${record[i].消息id}',`;
            }
        }
        if (message_id) {
            sql2 += ` AND 消息id in (${message_id})`;
            console.log("账单执行的语句:" + sql2);
            pgdb.query(pg, sql2);
        }
    }
};


/**
 * 查询所有单聊离线消息
 * @param pg
 * @param body
 * @returns {*|undefined}
 */
let queryOffLineMes = (pg, body, table) => {
    let sql = `SELECT 消息id, 发送者, 发送者名称, 接收者, 接收者名称, 会话类型, 消息类型, 消息内容, 发送时间, 接收时间, 签收id, 状态,发送者头像
               FROM ${table}
               WHERE 接收者 = '${body.userid}' AND 状态 = '未接收' ORDER BY 发送时间`;
    let record = pgdb.query(pg, sql).数据 || undefined;
    return record;
}

/**
 * 接受完单聊离线消息 修改消息状态
 * @param msid
 * @returns {*|undefined}
 */
let finishSendMes = (pg, msid, table) => {
    if (msid) {
        msid = msid.slice(0, -1);
        let time = moment().format('YYYY-MM-DD HH:mm:ss');
        let sql = `UPDATE ${table} SET 状态 = '已接收', 接收时间 = '${time}'
                   WHERE 消息id in(${msid})`;
        console.log("单聊执行的语句:" + sql);
        let record = pgdb.query(pg, sql).影响行数 || undefined;
        return record;
    } else {
        return;
    }

}