/**
 * Created by wirechen on 2017/9/7.
 */
var pgdb = require('../func/pgdb.js');
var moment = require("moment");
var uuid = require('uuid');
var fs = require('fs');

var config = require('../func/config.js');
var conf = config.get('app');
var web_im = require('../func/web_im.js');
var redisdb = require('../func/redisdb.js');
/*
 {
 msgid:uuid,
 sendid:system,//001
 receiveid:买家账号,
 sessiontype:system,
 msgtype:imgText,
 message:{
 title:标题,        //订单已签收      2/订单已付款   0/订单已发货    1
 img:图片,         //缩略图
 content:文本内容, //商品名称
 tradeNum：订单编号,
 },
 pushdata:通知内容
 sendTime:发送时间
 }

 账号=
 商品id=
 id=
 商户订单号=
 订单编号=
 type=


 */
/**
 * 修改人：@曾陈伟
 * 修改时间：2017-09-07 17:55:38
 * 修改内容：修改发送物流消息方法，以下业务代码照搬以前，对错与老子无关
 */
module.exports.run = function(body, pg, mo, redis, pg2) {
    var req = {};
    var data = {};
    data.状态='成功';
    var sub = '';
    var sql = '';
    var da='';
    req = body.receive;
    console.log('systemTradeMessssssssssssss', req);
    req.time = moment().format('YYYY-MM-DD HH:mm:ss');
    var ss;
    if(req.type == '0') {  //商家消息：买家已付款
        if(req.商户订单号==''){
            sql = "select a.商家账号,a.商品id,a.订单id,a.商家姓名,b.缩略图,b.商品名称 from 商_订单销售表 a,商_商品表 b where a.商品id=b.id and a.订单编号 = '"+req.订单编号+"'";
        }else{
            sql = "select a.商家账号,a.商品id,a.订单id,a.商家姓名,b.缩略图,b.商品名称 from 商_订单销售表 a,商_商品表 b where a.商品id=b.id and a.商户订单号  ='"+req.商户订单号+"'";
        }

	
        var res = pgdb.query(pg, sql);
	    console.log(res)
        if(res.数据.length != 0) {
            var ob = res.数据;
            ob.forEach(function(name, key) {

                var mesg='';
                var mess='';

                var mes = {};
                mes.title = '订单已付款';
                var tut = name.缩略图;
                var h = tut.substr(0, 1);
                if(h == 'h') {
                    mes.img = tut;
                } else {
                    tut = JSON.parse(tut);
                    mes.img = tut[0].图片;
                }
                mes.content = name.商品名称;
                mes.tradeNum = name.订单id;
                var meg = {};
                var uniqueid = uuid.v4()+'1';
                meg.msgId = uniqueid; // uuid
                meg.sendId = '002';
                meg.receiveId = name.商家账号+'_商家';
                meg.sessionType = '物流消息';
                meg.msgType = '图文';
                meg.message = mes;
                meg.pushData = "[物流消息]买家已付款" ;
                meg.sendTime = req.time;
                da=meg;
                console.log(da);
                mess = JSON.stringify(mes);
				console.log(mess)


                // var send = web_im.send_pryivte(da.receiveId, mesg);
                // if(send.code == '-1') {
                //     console.log('未发送');
                //     var join = "('" + uniqueid + "', '002', '系统', '" + da.receiveId + "', '" + name.商家姓名 + "', '系统消息', '图文', '" + mess + "', '" + mesg + "','" + da.pushData + "', '', '', '0', '未接收', '系统', '" + req.time + "')";
                //     sql = "INSERT INTO im_聊天信息表 (消息id, 发送者, 发送者名称, 接收者, 接收者名称, 会话类型, 消息类型, 消息内容, 消息体, 通知内容, 发送时间, 接收时间, 签收id, 状态, 录入人, 录入时间) VALUES " + join;
                //     sub = pgdb.query(pg, sql);
                // } else {
                //     console.log('已发送');
                //     var join = "('" + uniqueid + "', '002', '系统', '" +da.receiveId + "', '" + name.商家姓名 + "', '系统消息', '图文', '" + mess + "', '" + mesg + "', '" + da.pushData + "', '" + req.time + "', '" + req.time + "', '" + da.msgId + "', '已接收', '系统', '" + req.time + "')";
                //     sql = "INSERT INTO im_聊天信息表 (消息id, 发送者, 发送者名称, 接收者, 接收者名称, 会话类型, 消息类型, 消息内容, 消息体, 通知内容, 发送时间, 接收时间, 签收id, 状态, 录入人, 录入时间) VALUES " + join;
                //     sub = pgdb.query(pg, sql);
                //     //console.log(sub);
                // }

                //########################################Update By 曾陈伟####################################
                //发送消息 返回：已接收/未接收
                let status = sendTradeMessage(req, redis, meg);

                //数据入库
                let insertSQL = `INSERT INTO im_系统消息物流表 (消息id,接收者账号,接收者名称,会话类型,消息类型,推送标题,消息内容,发送时间,接收时间,状态) 
                   VALUES ('${uniqueid}', '${meg.receiveId}', '${name.商家姓名}', '${meg.sessionType}', '${meg.msgType}', '${meg.pushData}', '${mess}', '${req.time}', '${status.time}', '${status.status}')`;
		console.log(insertSQL)
                let result = pgdb.query(pg, insertSQL).影响行数 || undefined;
                if (!result) {
                    data.状态 = '发送失败';
                } else {
                    data.状态 = '成功';
                }
                //########################################Update By 曾陈伟####################################


            })
        }
    } else if(req.type == '1') { //用户消息：卖家已发货
        var mesg='';
        var mess='';
        sql = "select a.账号,a.商品id,a.订单id,a.姓名,a.快递单号,b.缩略图,b.商品名称 from 商_订单销售表 a,商_商品表 b where a.商品id=b.id and a.订单id='" + req.id + "'";
        var res = pgdb.query(pg, sql);
        if(res.数据.length != 0) {
            var name = res.数据[0];
            var mes = {};
            mes.title = '订单已发货';
            var tut = name.缩略图;
            var h = tut.substr(0, 1);
            if(h == 'h') {
                mes.img = tut;
            } else {
                tut = JSON.parse(tut);
                mes.img = tut[0].图片;
            }
            mes.content = name.商品名称;
            mes.tradeNum = name.订单id;

            var meg = {};
            var uniqueid = uuid.v4();
            meg.msgId = uniqueid; // uuid
            meg.sendId = '002';
            meg.receiveId = name.账号;
            meg.sessionType = '物流消息';
            meg.msgType = '图文';
            meg.message = mes;
            meg.pushData = "[物流消息]订单已发货！";
            meg.sendTime = req.time;
            da=meg;
            mess = JSON.stringify(mes);

            console.log(name.账号);

            // var send = web_im.send_pryivte(name.账号, mesg);
            //
            // console.log(send);
            // if(send.code == '-1') {
            //     console.log('未发送');
            //     var join = "('" + uniqueid + "', '002', '系统', '" + name.账号 + "', '" + name.姓名 + "', '系统消息', '图文', '" + mess + "', '" + mesg + "', '" + da.pushData + "', '', '', '0', '未接收', '系统', '" + req.time + "')";
            //     sql = "INSERT INTO im_聊天信息表 (消息id, 发送者, 发送者名称, 接收者, 接收者名称, 会话类型, 消息类型, 消息内容, 消息体, 通知内容, 发送时间, 接收时间, 签收id, 状态, 录入人, 录入时间) VALUES " + join;
            //     sub = pgdb.query(pg, sql);
            //     //console.log(sub);
            // } else {
            //     console.log('已发送');
            //     var join = "('" + uniqueid + "', '002', '系统', '" + name.账号 + "', '" + name.姓名 + "', '系统消息', '图文', '" + mess + "', '" + mesg + "', '" + da.pushData + "', '" + req.time + "', '" + req.time + "', '" + da.msgId + "', '已接收', '系统', '" + req.time + "')";
            //     sql = "INSERT INTO im_聊天信息表 (消息id, 发送者, 发送者名称, 接收者, 接收者名称, 会话类型, 消息类型, 消息内容, 消息体, 通知内容, 发送时间, 接收时间, 签收id, 状态, 录入人, 录入时间) VALUES " + join;
            //     sub = pgdb.query(pg, sql);
            // }

            //########################################Update By 曾陈伟####################################
            //发送消息 返回：已接收/未接收
            let status = sendTradeMessage(req, redis, meg);
            //数据入库
            let insertSQL = `INSERT INTO im_系统消息物流表 (消息id,接收者账号,接收者名称,会话类型,消息类型,推送标题,消息内容,发送时间,接收时间,状态) 
                   VALUES ('${uniqueid}', '${meg.receiveId}', '${name.姓名}', '${meg.sessionType}', '${meg.msgType}', '${meg.pushData}', '${mess}', '${req.time}', '${status.time}', '${status.status}')`;
            let result = pgdb.query(pg, insertSQL).影响行数 || undefined;
            if (!result) {
                data.状态 = '发送失败';
            } else {
                data.状态 = '成功';
            }
            //########################################Update By 曾陈伟####################################

        }



    } else if(req.type == '2') { //商家消息：订单已签收
        //	console.log("send");
        var mesg='';
        var mess='';
        sql = "select a.商家账号,a.商品id,a.订单id,a.商家姓名,b.缩略图,b.商品名称 from 商_订单销售表 a,商_商品表 b where a.商品id=b.id and a.订单id='" + req.id + "'";
        var res = pgdb.query(pg, sql);
        //console.log(res);
        //console.log(res);
        if(res.数据.length != 0) {
            var name = res.数据[0];
            var mes = {};
            mes.title = '订单已签收';
            var tut = name.缩略图;
            var h = tut.substr(0, 1);
            if(h == 'h') {
                mes.img = tut;
            } else {
                tut = JSON.parse(tut);
                mes.img = tut[0].图片;
            }
            mes.content = name.商品名称;
            mes.tradeNum = name.订单id;

            var meg = {};
            var uniqueid = uuid.v4();
            meg.msgId = uniqueid; // uuid
            meg.sendId = '002';
            meg.receiveId = name.商家账号+'_商家';
            meg.sessionType = '物流消息';
            meg.msgType = '图文';
            meg.message = mes;
            meg.pushData = "[物流消息]订单已签收";
            meg.sendTime = req.time;
            da=meg;
            mess = JSON.stringify(mes);


            // var send = web_im.send_pryivte(da.receiveId, mesg);
            // console.log(send);
            // if(send.code == '-1') {
            //     console.log('未发送');
            //     var join = "('" + da.msgId + "', '002', '系统', '" + da.receiveId + "', '" + name.商家姓名 + "', '系统消息', '图文', '" + mess + "', '" + mesg + "', '" + da.pushData + "', '', '', '0', '未接收', '系统', '" + req.time + "')";
            //     sql = "INSERT INTO im_聊天信息表 (消息id, 发送者, 发送者名称, 接收者, 接收者名称, 会话类型, 消息类型, 消息内容, 消息体, 通知内容, 发送时间, 接收时间, 签收id, 状态, 录入人, 录入时间) VALUES " + join;
            //     sub = pgdb.query(pg, sql);
            // } else {
            //     console.log("send");
            //     console.log('已发送');
            //     var join = "('" + uniqueid + "', '002', '系统', '" + da.receiveId + "', '" + name.商家姓名 + "', '系统消息', '图文', '" + mess + "', '" + mesg + "', '" + da.pushData + "', '" + req.time + "', '" + req.time + "', '" + da.msgId + "', '已接收', '系统', '" + req.time + "')";
            //     sql = "INSERT INTO im_聊天信息表 (消息id, 发送者, 发送者名称, 接收者, 接收者名称, 会话类型, 消息类型, 消息内容, 消息体, 通知内容, 发送时间, 接收时间, 签收id, 状态, 录入人, 录入时间) VALUES " + join;
            //     sub = pgdb.query(pg, sql);
            // }

            //########################################Update By 曾陈伟####################################
            //发送消息 返回：已接收/未接收
            let status = sendTradeMessage(req, redis, meg);
            //数据入库
            let insertSQL = `INSERT INTO im_系统消息物流表 (消息id,接收者账号,接收者名称,会话类型,消息类型,推送标题,消息内容,发送时间,接收时间,状态) 
                   VALUES ('${uniqueid}', '${meg.receiveId}', '${name.商家姓名}', '${meg.sessionType}', '${meg.msgType}', '${meg.pushData}', '${mess}', '${req.time}', '${status.time}', '${status.status}')`;
            let result = pgdb.query(pg, insertSQL).影响行数 || undefined;
            if (!result) {
                data.状态 = '发送失败';
            } else {
                data.状态 = '成功';
            }
            //########################################Update By 曾陈伟####################################
        }

    }



}


/**
 * 发送物流系统消息
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
            console.log('发送系统账单消息');
            web_im.send_system(socket, JSON.stringify(message));
        }
        res.status = '已接收';
        res.time = f.time;
        console.log(message.receiveId, '用户在线发送物流消息');

    } else { //=========离线===========
        res.status = '未接收';  // PS:生产环境下这里肯定不会执行，因为是自己触发该接口说明本人肯定是在线的
        res.time = '';
        console.log(message.receiveId, '用户不在线发送物流离线消息');
    }

    return res;
};