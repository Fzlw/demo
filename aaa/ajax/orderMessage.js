/**
 * 创建人:Coding Farmer_2207
 * 创建时间：2018-5-7 11:43:10
 * 创建内容：账单消息(结算/提现/购物/退款/充值)

消息类型 = (购物结算/商城提现/商城购物/购物退款/提现退款/收益充值/话费充值/油卡充值/优惠套餐/推荐结算)
消息内容=[{接收账号:'',接收姓名:'',消息图标:'',消息标题:'',消息内容:'',商户类别:'',接收用户:'',附加内容:{"订单id":"131232131231"}}}]

 */

var pgdb = require('../func/pgdb.js');
var uuid = require('uuid');
var config = require('../func/config.js');
var conf = config.get('app');
var web_im = require('../func/web_im.js');
var redisdb = require('../func/redisdb.js');
var logs = require('../func/logs.js');

module.exports.run = function (body, pg, mo, redis) {
    var f = {};
    let data = {};
    data.状态 = '成功';
    f = body || {};
    // f.消息类型 = "购物退款";
    // f.消息内容 =  [{'接收账号':'18327430511','接收姓名':'嗯嗯嗯','消息图标':'http://qqsdg.oss-cn-shenzhen.aliyuncs.com/manage/2018060115063612382.png','消息标题':'[商品退款]金额￥12.00','消息内容':'[商品退款]金额￥12.00,点击查看详情','商户类别':'商城','接收用户':'用户','附加内容':{"订单id":"131232131231","类别":"退货","商品id":"184","id":"748"}}];
    // f.消息内容 = JSON.stringify(f.消息内容);
    try {
        f.消息内容 = JSON.parse(f.消息内容);
    } catch (error) {
        data.状态 = '消息内容数据异常';
        return data;
    }
    if (f.消息内容.length <= 0) {
        data.状态 = '消息内容不能为空';
        return data;
    }
    f.time = body.date;
		logs.write("orderMessage",`时间${f.time}====这里请求了一次 请求数据:${JSON.stringify(f.消息内容)}`);
    f.消息内容.forEach(mesdata => {
        /***************************************拼装消息体 start **************************************/
        //消息内容
        let mes = {};
        mes.title = mesdata.消息内容 || '';
        mes.integral = '';
        mes.img = mesdata.消息图标 || '';
        mes.id = '';
        mes.type = f.消息类型 || '';
        mes.shop_type = mesdata.商户类别 || '';
        mes.append = mesdata.附加内容 || '';
        //消息体
        let meg = {};
        meg.msgId = uuid.v4() + '1';
        meg.sendId = '003';
        if (mesdata.接收用户 == '商家') {
            meg.receiveId = mesdata.接收账号 + '_商家';
        } else {
            meg.receiveId = mesdata.接收账号;
        }
        meg.sessionType = '账单通知';
        meg.msgType = '图文';
        meg.pushData = mesdata.消息标题 || '';
        meg.sendTime = f.time;
        meg.message = mes;
        /***************************************拼装消息体 end **************************************/
        //统一发送消息 返回：已接收/未接收
        let status = sendTradeMessage(f, redis, meg);
        //只有在消息未接收的情况下 才能判断是否失败 并返回给调用者    如果报错  计入异常日志文件
        let insertSQL = `INSERT INTO im_系统消息账单表 (消息id,接收者账号,接收者名称,会话类型,消息类型,推送标题,消息内容,发送时间,接收时间,状态,录入人,录入时间,账单类型) 
                VALUES ('${meg.msgId}', '${meg.receiveId}', '${mesdata.接收姓名}', '${meg.sessionType}', '${meg.msgType}', '${meg.pushData}', '${JSON.stringify(mes)}', '${f.time}', '${status.time}', '${status.status}', 'admin', '${f.time}', '${mes.type}')`;
        let result = pgdb.query(pg, insertSQL).影响行数 || undefined;
        if (!result) {
            //计入文本日志
            logs.write('im_message_error', '消息插入账单消息表有误，消息内容:' + JSON.stringify(mes));
        }
    });
    data.状态 = '成功';
    return data;
}

/**
 * 发送账单系统消息
 * @param f
 * @param redis
 * @param message 消息内容
 * @returns {string|string} 返回 已接收/未接收
 */
let sendTradeMessage = (f, redis, message) => {
    let online = web_im.get_online(redis, message.receiveId);
    var res = {};
    //========在线==========
    if (online.code == 1) {
        //若在线,则查找socket对象
        let socket = web_im.find_socket(online.socketid);
        if (socket == null) {
            //如果找不到就尝试发布频道从其他进程的中寻找socket对象并发送消息  PS:生产环境下这里肯定不会执行，因为是自己的socket肯定是在同一个进程
            redisdb.publish(redis, conf.redis.web_imChannelList[1], JSON.stringify(message));
        } else {
            //找到立马发送在线消息
            web_im.send_system(socket, JSON.stringify(message));
        }
        res.status = '已接收';
        res.time = f.time;

    } else { //=========离线===========
        res.status = '未接收';
        res.time = '';
    }
    return res;
};


   // } else if (f.消息类型 == '购物结算' || f.消息类型 == '购物退款') {
    //     //这里主要处理购物结算  以及退款的消息   购物结算消息只会发送给商家   而购物退款消息会发送给用户版和商家版    
    //     f.消息内容.forEach(mesdata => {
    //         /***************************************拼装消息体 start **************************************/
    //         //消息内容
    //         let mes = {};
    //         mes.integral = mesdata.金额;

    //         mes.id = mesdata.订单编号;
    //         mes.shop_type = mesdata.商户类别;
    //         //消息体
    //         let meg = {};
    //         if (f.消息类型 == '购物结算') {//购物结算消息样式
    //             mes.img = "http://qqsdg.oss-cn-shenzhen.aliyuncs.com/manage/2018060115061882911.png";
    //             mes.title = "[商品购物结算]金额￥" + mesdata.金额;
    //             mes.type = '购物结算';
    //             meg.pushData = "[商品购物结算]金额￥" + mesdata.金额 + ",点击查看详情";
    //         } else if (f.消息类型 == '购物退款') {//购物退款消息样式
    //             mes.img = "http://qqsdg.oss-cn-shenzhen.aliyuncs.com/manage/2018060115064576817.png";
    //             mes.title = "[商品退款]金额￥" + mesdata.金额;
    //             mes.type = '购物退款';
    //             meg.pushData = "[商品退款]金额￥" + mesdata.金额 + ",点击查看详情";
    //         }
    //         meg.msgId = uuid.v4() + '1';
    //         meg.sendId = '003';
    //         if (mesdata.接收用户 == '商户') {
    //             meg.receiveId = mesdata.接收账号 + '_商家';
    //         } else {
    //             meg.receiveId = mesdata.接收账号;
    //         }
    //         meg.sessionType = '账单通知';
    //         meg.msgType = '图文';
    //         meg.sendTime = f.time;
    //         meg.message = mes;
    //         /***************************************拼装消息体 end **************************************/

    //         //统一发送消息 返回：已接收/未接收
    //         let status = sendTradeMessage(f, redis, meg);
    //         //只有在消息未接收的情况下 才能判断是否失败 并返回给调用者    如果报错  计入异常日志文件
    //         let insertSQL = `INSERT INTO im_系统消息账单表 (消息id,接收者账号,接收者名称,会话类型,消息类型,推送标题,消息内容,发送时间,接收时间,状态,录入人,录入时间,账单类型) 
    //             VALUES ('${meg.msgId}', '${meg.receiveId}', '${mesdata.接收姓名}', '${meg.sessionType}', '${meg.msgType}', '${meg.pushData}', '${JSON.stringify(mes)}', '${f.time}', '${status.time}', '${status.status}', 'admin', '${f.time}', '${mes.type}')`;
    //         let result = pgdb.query(pg, insertSQL).影响行数 || undefined;
    //         if (!result) {
    //             //计入文本日志
    //             logs.write('im_message_error', '消息插入账单消息表有误，消息内容:' + JSON.stringify(mes));
    //         }
    //     });
    //     data.状态 = '成功';
    //     return data;
    // } else if (f.消息类型 == '商城提现' || f.消息类型 == '提现退款') {
    //     //商城（提现/退款）分为用户（提现/退款）   商家（提现/退款）   这里的消息需要区分用户版和商户版
    //     f.消息内容.forEach(mesdata => {
    //         /***************************************拼装消息体 start **************************************/
    //         let shop_type = mesdata.商户类别;
    //         //消息内容
    //         let mes = {};
    //         mes.integral = mesdata.金额;
    //         mes.img = "http://qqsdg.oss-cn-shenzhen.aliyuncs.com/manage/2018060115063612382.png";
    //         mes.id = mesdata.订单编号;
    //         mes.shop_type = shop_type;
    //         //消息体
    //         let meg = {};

    //         //三种消息  消息提示语不一样   区分开
    //         if (shop_type == '商家') {
    //             if (f.消息类型 == '商城提现') {

    //                 mes.title = "[提现成功提醒]金额￥" + mesdata.金额 + ",已到账至" + qx_tq;
    //                 mes.type = '收益提现';
    //                 meg.pushData = "[提现成功提醒]金额￥" + mesdata.金额 + ",已到账至" + qx_tq + ",点击查看详情";

    //             } else if (f.消息类型 == '提现退款') {

    //                 mes.title = "[提现失败提醒]金额￥" + mesdata.金额;
    //                 mes.type = '收益提现退款';
    //                 meg.pushData = "[提现失败提醒]金额￥" + mesdata.金额 + ",点击查看详情";

    //             }
    //         } else if (shop_type == '油费') {
    //             if (f.消息类型 == '商城提现') {

    //                 mes.title = "[提现成功提醒]金额￥" + mesdata.金额;
    //                 mes.type = '油费提现';
    //                 meg.pushData = "[提现成功提醒]金额￥" + mesdata.金额 + ",已到账至" + qx_tq + ",点击查看详情";

    //             } else if (f.消息类型 == '提现退款') {

    //                 mes.title = "[提现失败提醒]金额￥" + mesdata.金额;
    //                 mes.type = '油费提现退款';
    //                 meg.pushData = "[提现失败提醒]金额￥" + mesdata.金额 + ",点击查看详情";

    //             }
    //         } else if (shop_type == '用户') {
    //             if (f.消息类型 == '商城提现') {

    //                 mes.title = "[提现成功提醒]金额￥" + mesdata.金额;
    //                 mes.type = '现金红包提现';
    //                 meg.pushData = "[提现成功提醒]金额￥" + mesdata.金额 + ",已到账至" + qx_tq + ",点击查看详情";

    //             } else if (f.消息类型 == '提现退款') {

    //                 mes.title = "[提现失败提醒]金额￥" + mesdata.金额;
    //                 mes.type = '现金红包提现退款';
    //                 meg.pushData = "[提现失败提醒]金额￥" + mesdata.金额 + ",点击查看详情";

    //             }
    //         }
    //         meg.msgId = uuid.v4() + '1';
    //         meg.sendId = '003';
    //         if (mesdata.接收用户 == '商户') {//区分消息发送对象
    //             meg.receiveId = mesdata.接收账号 + '_商家';
    //         } else {
    //             meg.receiveId = mesdata.接收账号;
    //         }
    //         meg.sessionType = '账单通知';
    //         meg.msgType = '图文';
    //         meg.sendTime = f.time;
    //         meg.message = mes;
    //         /***************************************拼装消息体 end **************************************/
    //         console.log("=-===================================执行啦0");
    //         //统一发送消息 返回：已接收/未接收
    //         let status = sendTradeMessage(f, redis, meg);
    //         //只有在消息未接收的情况下 才能判断是否失败 并返回给调用者    如果报错  计入异常日志文件
    //         let insertSQL = `INSERT INTO im_系统消息账单表 (消息id,接收者账号,接收者名称,会话类型,消息类型,推送标题,消息内容,发送时间,接收时间,状态,录入人,录入时间,账单类型) 
    //             VALUES ('${meg.msgId}', '${meg.receiveId}', '${mesdata.接收姓名}', '${meg.sessionType}', '${meg.msgType}', '${meg.pushData}', '${JSON.stringify(mes)}', '${f.time}', '${status.time}', '${status.status}', 'admin', '${f.time}', '${mes.type}')`;
    //         let result = pgdb.query(pg, insertSQL).影响行数 || undefined;
    //         if (!result) {
    //             //计入文本日志
    //             logs.write('im_message_error', '消息插入账单消息表有误，消息内容:' + JSON.stringify(mes));
    //         }
    //     })
    //     data.状态 = '成功';
    //     return data;
    // } else if (f.消息类型 == '收益充值' || f.消息类型 == '话费充值' || f.消息类型 == '油卡充值') {
    //     //收益充值   只有商家才会存在的功能 消息只给商家充值
    //     f.消息内容.forEach(mesdata => {
    //         /***************************************拼装消息体 start **************************************/
    //         let shop_type = mesdata.商户类别;
    //         //消息内容
    //         let mes = {};
    //         mes.integral = mesdata.金额;
    //         mes.img = "http://qqsdg.oss-cn-shenzhen.aliyuncs.com/manage/2018060115064722693.png";
    //         mes.id = mesdata.订单编号;
    //         mes.shop_type = shop_type;
    //         //消息体
    //         let meg = {};
    //         if (shop_type == '商家') {
    //             mes.img = "http://qqsdg.oss-cn-shenzhen.aliyuncs.com/manage/2018060115061565937.png";
    //             mes.title = "[充值到账提醒]金额￥" + mesdata.金额 + "，已成功";
    //             mes.type = '收益充值';
    //             meg.pushData = "[充值到账提醒]金额￥" + mesdata.金额 + "，已成功,点击查看详情";
    //         } else if (shop_type == '用户') {
    //             mes.title = "[话费充值]金额￥" + mesdata.金额 + "，已成功";
    //             mes.type = '话费充值';
    //             meg.pushData = "[话费充值]金额￥" + mesdata.金额 + "，已成功,点击查看详情";
    //         } else if (shop_type == '油卡') {
    //             mes.title = "[油卡充值]金额￥" + mesdata.金额 + "，已成功";
    //             mes.type = '油卡充值';
    //             meg.pushData = "[油卡充值]金额￥" + mesdata.金额 + "，已成功,点击查看详情";
    //         }
    //         meg.msgId = uuid.v4() + '1';
    //         meg.sendId = '003';
    //         if (mesdata.接收用户 == '商户') {
    //             meg.receiveId = mesdata.接收账号 + '_商家';
    //         } else {
    //             meg.receiveId = mesdata.接收账号;
    //         }
    //         meg.sessionType = '账单通知';
    //         meg.msgType = '图文';
    //         meg.sendTime = f.time;
    //         meg.message = mes;
    //         /***************************************拼装消息体 end **************************************/

    //         //统一发送消息 返回：已接收/未接收
    //         let status = sendTradeMessage(f, redis, meg);
    //         //只有在消息未接收的情况下 才能判断是否失败 并返回给调用者    如果报错  计入异常日志文件
    //         let insertSQL = `INSERT INTO im_系统消息账单表 (消息id,接收者账号,接收者名称,会话类型,消息类型,推送标题,消息内容,发送时间,接收时间,状态,录入人,录入时间,账单类型) 
    //             VALUES ('${meg.msgId}', '${meg.receiveId}', '${mesdata.接收姓名}', '${meg.sessionType}', '${meg.msgType}', '${meg.pushData}', '${JSON.stringify(mes)}', '${f.time}', '${status.time}', '${status.status}', 'admin', '${f.time}', '${mes.type}')`;
    //         let result = pgdb.query(pg, insertSQL).影响行数 || undefined;
    //         if (!result) {
    //             //计入文本日志
    //             logs.write('im_message_error', '消息插入账单消息表有误，消息内容:' + JSON.stringify(mes));
    //         }
    //     })
    //     data.状态 = '成功';
    //     return data;
    // } else if (f.消息类型 == '油惠套餐') {
    //     //收益充值   只有商家才会存在的功能 消息只给商家充值
    //     f.消息内容.forEach(mesdata => {
    //         /***************************************拼装消息体 start **************************************/
    //         //消息内容
    //         let mes = {};
    //         mes.integral = mesdata.金额;
    //         mes.img = "http://qqsdg.oss-cn-shenzhen.aliyuncs.com/manage/2018060115064722693.png";
    //         mes.id = mesdata.订单编号;
    //         mes.shop_type = mesdata.商户类别;
    //         //消息体
    //         let meg = {};
    //         mes.title = "[账单通知]金额￥" + mesdata.金额;
    //         mes.type = '套餐购买';
    //         meg.pushData = "[账单通知]金额￥" + mesdata.金额 + ",点击查看详情"
    //         meg.msgId = uuid.v4() + '1';
    //         meg.sendId = '003';
    //         if (mesdata.接收用户 == '商户') {
    //             meg.receiveId = mesdata.接收账号 + '_商家';
    //         } else {
    //             meg.receiveId = mesdata.接收账号;
    //         }
    //         meg.sessionType = '账单通知';
    //         meg.msgType = '图文';
    //         meg.sendTime = f.time;
    //         meg.message = mes;
    //         /***************************************拼装消息体 end **************************************/

    //         //统一发送消息 返回：已接收/未接收
    //         let status = sendTradeMessage(f, redis, meg);
    //         //只有在消息未接收的情况下 才能判断是否失败 并返回给调用者    如果报错  计入异常日志文件
    //         let insertSQL = `INSERT INTO im_系统消息账单表 (消息id,接收者账号,接收者名称,会话类型,消息类型,推送标题,消息内容,发送时间,接收时间,状态,录入人,录入时间,账单类型) 
    //             VALUES ('${meg.msgId}', '${meg.receiveId}', '${mesdata.接收姓名}', '${meg.sessionType}', '${meg.msgType}', '${meg.pushData}', '${JSON.stringify(mes)}', '${f.time}', '${status.time}', '${status.status}', 'admin', '${f.time}', '${mes.type}')`;
    //         let result = pgdb.query(pg, insertSQL).影响行数 || undefined;
    //         if (!result) {
    //             //计入文本日志
    //             logs.write('im_message_error', '消息插入账单消息表有误，消息内容:' + JSON.stringify(mes));
    //         }
    //     })
    //     data.状态 = '成功';
    //     return data;
    // }