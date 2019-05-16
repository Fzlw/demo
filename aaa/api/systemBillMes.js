var pgdb = require('../func/pgdb.js');
var moment = require("moment");
var uuid = require('uuid');
var utils = require('./utils');

var config = require('../func/config.js');
var conf = config.get('app');
var web_im = require('../func/web_im.js');
var redisdb = require('../func/redisdb.js');
/*
 * 创建人：丁文强
 * 创建内容：发送账单通知(积分充值、积分转让、红利提现、商品购物).
 * 创建时间：2017/07/12
 {
 msgid:uuid,
 sendid:system,
 receiveid:账号,
 sessiontype:system,
 msgtype:imgText,
 message:
 {
 mes.title:标题,
 mes.integral:积分,
 mes.img:图片,
 mes.id:id,
 mes.type:类型
 }
 meg.pushData:通知内容
 meg.sendTime:发送时间
 }
 
 修改人：yehx
修改内容：新增商城收益提取账单通知
修改时间：2017-11-10 10:27:40
 账号=
 type='支付宝扫码充值';
 */

/**
 * 修改人：@曾陈伟
 * 修改时间：2017-09-07 17:54:16
 * 修改内容：修改发送账单消息方法，以下业务代码照搬以前，对错与老子无关
 */
module.exports.run = function(body, pg, mo, redis, pg2) {
    var req = {};
    var data = {};
    data.状态 = '成功';
    var sub = '';
    var sql = '';
    var da = '';
    var f = {};
    req = body.receive;

    req.time = moment().format('YYYY-MM-DD HH:mm:ss');

    console.log('账单消息通知知知知知知知知知知知知知知知知知知知知知知知:'+JSON.stringify(req));

    if(req.type == '支付宝扫码充值') {
        sql = "select id,支付宝交易号,总金额 from 平_支付宝积分充值表 where 支付宝交易号 = '" +req.交易单号+ "' ";
        var a = pgdb.query(pg, sql);
        if(a.数据.length == 0){
            data.状态 = '无该交易号';
            return data;
        }
        req.id = a.数据[0].id;

        sql = "select id,账号,姓名,积分,余额,关联id,录入时间,说明,备注 from 平_账户表 where 账号 = '" +req.账号+ "' and 关联id = '" +req.id+ "'";
        var res = pgdb.query(pg, sql);
        console.log(res);
        if(res.数据.length != 0) {
            var name = res.数据[0];

            var mesg = '';
            var mess = '';
            //消息内容
            var mes = {};
            var meg = {};
            mes.title = "[账单通知]您已充值" +Number(name.积分).toFixed(2)+ "积分";
            mes.integral = Number(name.积分).toFixed(2);
            mes.img = "http://qqwlw.oss-cn-shenzhen.aliyuncs.com/manage/2017080910385844918.png";
            mes.id = req.id;
            mes.type = '支付宝充值';

            //消息体
            var uniqueid = uuid.v4()+'1';
            meg.msgId = uniqueid; // uuid
            meg.sendId = '003';
            meg.receiveId = name.账号;
            meg.sessionType = '账单通知';
            meg.msgType = '图文';

            meg.pushData = "[账单通知]您已充值" +Number(name.积分).toFixed(2)+ "积分";
            meg.sendTime = req.time;
            meg.message = mes;

            // da = meg;
            mess = JSON.stringify(mes);

            // var send = web_im.send_pryivte(da.receiveId, mesg);
            // console.log(send);
            // if(send.code == '-1') {
            //     console.log('未发送');
            //     var join = "('" + uniqueid + "', '003', '系统', '" + da.receiveId + "', '" + name.姓名 + "', '系统消息', '文本', '" + mess + "', '" + mesg + "','" + da.pushData + "', '', '', '0', '未接收', '系统', '" + req.time + "')";
            //     sql = "INSERT INTO im_聊天信息表 (消息id, 发送者, 发送者名称, 接收者, 接收者名称, 会话类型, 消息类型, 消息内容, 消息体, 通知内容, 发送时间, 接收时间, 签收id, 状态, 录入人, 录入时间) VALUES " + join;
            //     sub = pgdb.query(pg, sql);
            // } else {
            //     console.log('已发送');
            //     var join = "('" + uniqueid + "', '003', '系统', '" +da.receiveId + "', '" + name.姓名 + "', '系统消息', '文本', '" + mess + "', '" + mesg + "', '" + da.pushData + "', '" + req.time + "', '" + req.time + "', '" + da.msgId + "', '已接收', '系统', '" + req.time + "')";
            //     sql = "INSERT INTO im_聊天信息表 (消息id, 发送者, 发送者名称, 接收者, 接收者名称, 会话类型, 消息类型, 消息内容, 消息体, 通知内容, 发送时间, 接收时间, 签收id, 状态, 录入人, 录入时间) VALUES " + join;
            //     sub = pgdb.query(pg, sql);
            // }

            //########################################Update By 曾陈伟####################################
            //发送消息 返回：已接收/未接收
            let status = sendMessage(req, redis, meg);
            //数据入库
            let insertSQL = `INSERT INTO im_系统消息账单表 (消息id,接收者账号,接收者名称,会话类型,账单类型,消息类型,推送标题,消息内容,发送时间,接收时间,状态) 
                   VALUES ('${uniqueid}', '${req.账号}', '${name.姓名}', '${meg.sessionType}', '${req.type}', '${meg.msgType}', '${meg.pushData}', '${mess}', '${req.time}', '${status.time}', '${status.status}')`;
            let result = pgdb.query(pg, insertSQL).影响行数 || undefined;
            if (!result) {
                data.状态 = '发送失败';
            } else {
                data.状态 = '成功';
            }
            //########################################Update By 曾陈伟####################################

            return data;
        } else {
            data.状态 = '无支付宝交易记录';
            return data;
        }
    }else if(req.type == '积分充值') {
        var mesg = '';
        var mess = '';
        sql = "select id,账号,姓名,积分,类别,状态,录入时间,商户订单号 from 平_积分充值订单表 where 账号 = '" +req.账号+ "' and 商户订单号 = '" +req.商户订单号+ "'";
        console.log(sql);
        var res = pgdb.query(pg, sql);
        console.log(res);
        if(res.数据.length != 0) {
            var name = res.数据[0];
            f.商户订单号 = name.商户订单号;

            sql = "select id,商户号,商品名,商户订单号,支付订单号,总金额,账号,姓名,状态,录入时间,说明 from 平_支付订单表 where 商户订单号 = '" + f.商户订单号 + "'";
            var zf = pgdb.query(pg, sql);
            if(zf.数据.length != 0) {
                f.zf_id = zf.数据[0].id;
                f.zt = zf.数据[0].状态;
            }
            //消息内容
            var mes = {};
            var meg = {};

            if(f.zt == '待支付') {
                mes.title = "[账单通知]您已提交一笔订单";
            } else if (f.zt == '已支付') {
                mes.title = "[账单通知]您已充值" +Number(name.积分).toFixed(2)+ "积分";
            }
            mes.integral = Number(name.积分).toFixed(2);
            mes.img = "http://qqwlw.oss-cn-shenzhen.aliyuncs.com/manage/2017080910385844918.png";
            mes.id = f.zf_id;
            mes.type = '积分充值';

            var uniqueid = uuid.v4();
            meg.msgId = uniqueid;	//uuid
            meg.sendId = '003';
            meg.receiveId = name.账号;
            meg.sessionType = '账单通知';
            meg.msgType = '图文';

            if(req.审批状态 == '待支付') {
                meg.pushData = "[账单通知]您已提交一笔订单";
            }else if(req.审批状态 == '已支付') {
                meg.pushData = "[账单通知]您已充值" +Number(name.积分).toFixed(2)+ "积分";
            } else {
                data.状态 = '审批状态异常!';
                return data;
            }

            meg.message = mes;
            meg.sendTime = req.time;
            // da = meg;
            mess = JSON.stringify(mes);
            // var send = web_im.send_pryivte(name.账号, mesg);
            // console.log(send);
            // if(send.code == '-1') {
            //     console.log('未发送');
            //     var join = "('" + uniqueid + "', '003', '系统', '" + name.账号 + "', '" + name.姓名 + "', '系统消息', '文本', '" + mess + "', '" + mesg + "', '" + da.pushData + "', '', '', '0', '未接收', '系统', '" + req.time + "')";
            //     sql = "INSERT INTO im_聊天信息表 (消息id, 发送者, 发送者名称, 接收者, 接收者名称, 会话类型, 消息类型, 消息内容, 消息体, 通知内容, 发送时间, 接收时间, 签收id, 状态, 录入人, 录入时间) VALUES " + join;
            //     sub = pgdb.query(pg, sql);
            // } else {
            //     console.log('已发送');
            //     var join = "('" + uniqueid + "', '003', '系统', '" + name.账号 + "', '" + name.姓名 + "', '系统消息', '文本', '" + mess + "', '" + mesg + "', '" + da.pushData + "', '" + req.time + "', '" + req.time + "', '" + da.msgId + "', '已接收', '系统', '" + req.time + "')";
            //     sql = "INSERT INTO im_聊天信息表 (消息id, 发送者, 发送者名称, 接收者, 接收者名称, 会话类型, 消息类型, 消息内容, 消息体, 通知内容, 发送时间, 接收时间, 签收id, 状态, 录入人, 录入时间) VALUES " + join;
            //     sub = pgdb.query(pg, sql);
            // }
            // data.状态 = '成功';

            //########################################Update By 曾陈伟####################################
            //发送消息 返回：已接收/未接收
            let status = sendMessage(req, redis, meg);
            //数据入库
            let insertSQL = `INSERT INTO im_系统消息账单表 (消息id,接收者账号,接收者名称,会话类型,账单类型,消息类型,推送标题,消息内容,发送时间,接收时间,状态) 
                   VALUES ('${uniqueid}', '${req.账号}', '${name.姓名}', '${meg.sessionType}', '${req.type}', '${meg.msgType}', '${meg.pushData}', '${mess}', '${req.time}', '${status.time}', '${status.status}')`;
            let result = pgdb.query(pg, insertSQL).影响行数 || undefined;
            if (!result) {
                data.状态 = '发送失败';
            } else {
                data.状态 = '成功';
            }
            //########################################Update By 曾陈伟####################################


            return data;
        } else {
            data.状态 = '无积分充值记录';
            return data;
        }
    }else if(req.type == '转让积分') {
        var mesg = '';
        var mess = '';
        sql = "select id,账号,姓名,积分,转让方式,出入账号,出入姓名,录入时间  from 平_转让明细表 where 账号 = '" +req.账号+ "' and 出入账号 = '" +req.收方账号+ "' and 录入时间 = '" +req.我方录入时间+ "' and 状态 = '转让成功'";
        var res = pgdb.query(pg, sql);
        if(res.数据.length != 0) {
            f.我方账号 = res.数据[0].账号;
            f.出入账号 = res.数据[0].出入账号;
            f.录入时间 = res.数据[0].录入时间;
            sql = "select id,账号,姓名,积分,出入账号,出入姓名,录入时间,转让方式 from 平_转让明细表 where 账号 = '" +f.我方账号+ "' and 录入时间 = '" +f.录入时间+ "'";
            var wf = pgdb.query(pg, sql);
            if(wf.数据.length > 0) {
                f.我方id = wf.数据[0].id;
                f.我方账号1 = wf.数据[0].账号;
                f.我方录入时间1 = wf.数据[0].录入时间;
                f.转让方式 = wf.数据[0].转让方式;
            }

            sql = "select id,账号,姓名,积分,关联id,说明,交易账户,商户号,备注,录入时间 from 平_账户表 where 账号 = '" + f.我方账号1 + "' and 关联id = '" + f.我方id + "'";
            var account1 = pgdb.query(pg, sql);
            if(account1.数据.length > 0) {
                f.jf_id = account1.数据[0].id;
                f.zh = account1.数据[0].账号;
                f.xm = account1.数据[0].姓名;
                f.jf = account1.数据[0].积分;
                f.sm = account1.数据[0].说明;
            }
            //消息内容1
            var mes = {};
            var meg = {};
            mes.title = "[账单通知:]" +f.xm + f.sm;
            mes.integral = Number(f.jf).toFixed(2);
            mes.img = "http://qqwlw.oss-cn-shenzhen.aliyuncs.com/manage/2017080910385844918.png";
            mes.id = f.jf_id;
            mes.type = '积分转让';

            var uniqueid = uuid.v4();
            meg.msgId = uniqueid; //uuid
            meg.sendId = '003';
            meg.receiveId = f.zh;
            meg.sessionType = '账单通知';
            meg.msgType = '图文';

            meg.pushData = "[账单通知:]" +f.xm + f.sm;
            meg.message = mes;
            meg.sendTime = req.time;
            // da = meg;
            mess = JSON.stringify(mes);

            // var send = web_im.send_pryivte(mes.account, mesg);
            // console.log(send);
            // if(send.code == '-1') {
            //     console.log('未发送');
            //     var join = "('" + uniqueid + "', '003', '系统', '" + f.zh + "', '" + f.xm + "', '系统消息', '文本', '" + mess + "', '" + mesg + "', '" + da.pushData + "', '', '', '0', '未接收', '系统', '" + req.time + "')";
            //     sql = "INSERT INTO im_聊天信息表 (消息id, 发送者, 发送者名称, 接收者, 接收者名称, 会话类型, 消息类型, 消息内容, 消息体, 通知内容, 发送时间, 接收时间, 签收id, 状态, 录入人, 录入时间) VALUES " + join;
            //     sub = pgdb.query(pg, sql);
            // } else {
            //     console.log('已发送');
            //     var join = "('" + uniqueid + "', '003', '系统', '" + f.zh + "', '" + f.xm + "', '系统消息', '文本', '" + mess + "', '" + mesg + "', '" + da.pushData + "', '" + req.time + "', '" + req.time + "', '" + da.msgId + "', '已接收', '系统', '" + req.time + "')";
            //     sql = "INSERT INTO im_聊天信息表 (消息id, 发送者, 发送者名称, 接收者, 接收者名称, 会话类型, 消息类型, 消息内容, 消息体, 通知内容, 发送时间, 接收时间, 签收id, 状态, 录入人, 录入时间) VALUES " + join;
            //     sub = pgdb.query(pg, sql);
            // }

            //########################################Update By 曾陈伟####################################
            //发送消息 返回：已接收/未接收
            let status = sendMessage(req, redis, meg);
            //数据入库
            let insertSQL = `INSERT INTO im_系统消息账单表 (消息id,接收者账号,接收者名称,会话类型,账单类型,消息类型,推送标题,消息内容,发送时间,接收时间,状态) 
                   VALUES ('${uniqueid}', '${meg.receiveId}', '${f.xm}', '${meg.sessionType}', '${req.type}', '${meg.msgType}', '${meg.pushData}', '${mess}', '${req.time}', '${status.time}', '${status.status}')`;
            let result = pgdb.query(pg, insertSQL).影响行数 || undefined;
            //########################################Update By 曾陈伟####################################

            sql = "select id,账号,姓名,积分,关联id,说明,交易账户,商户号,备注,录入时间 from 平_账户表 where 账号 = '" + f.出入账号 + "' and 关联id = '" + f.我方id + "'";
            var account2 = pgdb.query(pg, sql);
            if(account2.数据.length > 0) {
                f.jf_id2 = account2.数据[0].id;
                f.zh2 = account2.数据[0].账号;
                f.xm2 = account2.数据[0].姓名;
                f.jf2 = account2.数据[0].积分;
                f.sm2 = account2.数据[0].说明;
            }

            //消息内容2
            var mes2 = {};
            var meg2 = {};

            mes2.title = "[转让积分消息:]" + f.xm2 + "您已获得" + f.sm2;
            mes2.integral = Number(f.jf2).toFixed(2);
            mes2.img = "http://qqwlw.oss-cn-shenzhen.aliyuncs.com/manage/2017080910385844918.png";
            mes2.id = f.jf_id2;
            mes2.type = '积分转让';

            var uniqueid = uuid.v4();
            meg2.msgId = uniqueid;	//uuid
            meg2.sendId = '003';
            meg2.receiveId = f.zh2;
            meg2.sessionType = '账单通知';
            meg2.msgType = '图文';

            meg2.pushData = "[账单通知:]" + f.xm2 + "已获得" + f.sm2;
            meg2.message = mes2;
            meg2.sendTime = req.time;
            // da = meg2;
            var mess2 = JSON.stringify(mes2);

            // var send = web_im.send_pryivte(mes2.account, mesg2);
            // console.log(send);
            // if(send.code == '-1') {
            //     console.log('未发送');
            //     var join = "('" + uniqueid + "', '003', '系统', '" + f.zh2 + "', '" + f.xm2 + "', '系统消息', '文本', '" + mess2 + "', '" + mesg2 + "', '" + da.pushData + "', '', '', '0', '未接收', '系统', '" + req.time + "')";
            //     sql = "INSERT INTO im_聊天信息表 (消息id, 发送者, 发送者名称, 接收者, 接收者名称, 会话类型, 消息类型, 消息内容, 消息体, 通知内容, 发送时间, 接收时间, 签收id, 状态, 录入人, 录入时间) VALUES " + join;
            //     sub = pgdb.query(pg, sql);
            // } else {
            //     console.log('已发送');
            //     var join = "('" + uniqueid + "', '003', '系统', '" + f.zh2 + "', '" + f.xm2 + "', '系统消息', '文本', '" + mess2 + "', '" + mesg2 + "', '" + da.pushData + "', '" + req.time + "', '" + req.time + "', '" + da.msgId + "', '已接收', '系统', '" + req.time + "')";
            //     sql = "INSERT INTO im_聊天信息表 (消息id, 发送者, 发送者名称, 接收者, 接收者名称, 会话类型, 消息类型, 消息内容, 消息体, 通知内容, 发送时间, 接收时间, 签收id, 状态, 录入人, 录入时间) VALUES " + join;
            //     sub = pgdb.query(pg, sql);
            // }
            // data.状态 = '成功';

            //########################################Update By 曾陈伟####################################
            //发送消息 返回：已接收/未接收
            let status2 = sendMessage(req, redis, meg2);
            //数据入库
            let insertSQL2 = `INSERT INTO im_系统消息账单表 (消息id,接收者账号,接收者名称,会话类型,账单类型,消息类型,推送标题,消息内容,发送时间,接收时间,状态) 
                   VALUES ('${uniqueid}', '${f.zh2}', '${f.xm2}', '${meg2.sessionType}', '${req.type}', '${meg.msgType}', '${meg.pushData}', '${mess2}', '${req.time}', '${status2.time}', '${status2.status}')`;
            let result2 = pgdb.query(pg, insertSQL2).影响行数 || undefined;
            if (result2 && result) {
                data.状态 = '成功';
            } else {
                data.状态 = '发送失败';
            }
            //########################################Update By 曾陈伟####################################
            return data;
        }else{
            data.状态 = '无转让积分记录';
            return data;
        }
    }else if(req.type == '商城收益兑换') {
        var mesg = '';
        var mess = '';
        sql = "select id,账号,名称,积分,类别,转入银行,录入时间 from 商_收益兑换表  where 账号 = '" +req.账号+ "' and 录入时间 = '" +req.录入时间+ "'";
        console.log(sql);
        var res = pgdb.query(pg, sql);
//		console.log(res);
        if(res.数据.length != 0) {
            var name = res.数据[0];
            //消息内容
            var mes = {};
            var meg = {};

            if(req.审批状态 == '转款失败(已退积分)') {
                name.explain = '商城收益提现失败，已退还到收益积分';
                mes.title = "[账单通知:]" +name.explain;
            }else if(req.审批状态 == '转银行卡失败') {
                name.explain = '商城收益,转银行卡失败！';
                mes.title = "[账单通知:]" +name.explain;
            }else if(req.审批状态 == '已转银行卡') {
                name.explain = '商城收益提现成功';
                mes.title = "[账单通知:]您已提现" +Number(name.积分).toFixed(2)+ "元";
            }else if(req.审批状态 == '银行处理中') {
                name.explain = '正在处理中';
                mes.title = "[账单通知:]" +name.explain;
            }else{
                data.状态 = '提现异常！';
                return data;
            }

            mes.integral = Number(name.积分).toFixed(2);
            mes.img = "http://qqwlw.oss-cn-shenzhen.aliyuncs.com/manage/2017080910385844918.png";
            mes.id = name.id;
            mes.type = '商城收益兑换';

            var uniqueid = uuid.v4();
            meg.msgId = uniqueid;	//uuid
            meg.sendId = '003';
            meg.receiveId = name.账号 + '_商家';
            meg.sessionType = '账单通知';
            meg.msgType = '图文';

            meg.message = mes;
            meg.pushData = "[账单通知:]" +name.explain;
            meg.sendTime = req.time;
            // da = meg;
            mess = JSON.stringify(mes);

            // var send = web_im.send_pryivte(name.账号, mesg);
            // console.log(send);
            // if(send.code == '-1') {
            //     console.log('未发送');
            //     var join = "('" + uniqueid + "', '003', '系统', '" + name.账号 + "', '" + name.名称 + "', '系统消息', '文本', '" + mess + "', '" + mesg + "', '" + da.pushData + "', '', '', '0', '未接收', '系统', '" + req.time + "')";
            //     sql = "INSERT INTO im_聊天信息表 (消息id, 发送者, 发送者名称, 接收者, 接收者名称, 会话类型, 消息类型, 消息内容, 消息体, 通知内容, 发送时间, 接收时间, 签收id, 状态, 录入人, 录入时间) VALUES " + join;
            //     sub = pgdb.query(pg, sql);
            // } else {
            //     console.log('已发送');
            //     var join = "('" + uniqueid + "', '003', '系统', '" + name.账号 + "', '" + name.名称 + "', '系统消息', '文本', '" + mess + "', '" + mesg + "', '" + da.pushData + "', '" + req.time + "', '" + req.time + "', '" + da.msgId + "', '已接收', '系统', '" + req.time + "')";
            //     sql = "INSERT INTO im_聊天信息表 (消息id, 发送者, 发送者名称, 接收者, 接收者名称, 会话类型, 消息类型, 消息内容, 消息体, 通知内容, 发送时间, 接收时间, 签收id, 状态, 录入人, 录入时间) VALUES " + join;
            //     sub = pgdb.query(pg, sql);
            // }
            // data.状态 = '成功';

            //########################################Update By 曾陈伟####################################
            //发送消息 返回：已接收/未接收
            let status = sendMessage(req, redis, meg);
            //数据入库
            let insertSQL = `INSERT INTO im_系统消息账单表 (消息id,接收者账号,接收者名称,会话类型,账单类型,消息类型,推送标题,消息内容,发送时间,接收时间,状态) 
                   VALUES ('${uniqueid}', '${meg.receiveId}', '${name.名称}', '${meg.sessionType}', '${req.type}', '${meg.msgType}', '${meg.pushData}', '${mess}', '${req.time}', '${status.time}', '${status.status}')`;
            let result = pgdb.query(pg, insertSQL).影响行数 || undefined;
            if (!result) {
                data.状态 = '发送失败';
            } else {
                data.状态 = '成功';
            }
            //########################################Update By 曾陈伟####################################

            return data;
        }else{
            data.状态 = '商城收益兑换记录';
            return data;
        }
    }else if(req.type == '商城收益提现支付宝') {
        var mesg = '';
        var mess = '';
        sql = "select id,账号,名称,积分,类别,转入支付宝姓名,录入时间 from 商_收益提现支付宝表  where 账号 = '" +req.账号+ "' and 录入时间 = '" +req.录入时间+ "'";
        console.log(sql);
        var res = pgdb.query(pg, sql);
//		console.log(res);
        if(res.数据.length != 0) {
            var name = res.数据[0];
            //消息内容
            var mes = {};
            var meg = {};

            if(req.审批状态 == '转款失败(已退积分)') {
                name.explain = '商城收益提现失败，已退还到收益积分';
                mes.title = "[账单通知:]" +name.explain;
            }else if(req.审批状态 == '转支付宝失败') {
                name.explain = '商城收益,转支付宝失败！';
                mes.title = "[账单通知:]" +name.explain;
            }else if(req.审批状态 == '已转支付宝') {
                name.explain = '商城收益提现成功';
                mes.title = "[账单通知:]您已提现" +Number(name.积分).toFixed(2)+ "元";
            }else if(req.审批状态 == '支付宝处理中') {
                name.explain = '正在处理中';
                mes.title = "[账单通知:]" +name.explain;
            }else{
                data.状态 = '提现异常！';
                return data;
            }

            mes.integral = Number(name.积分).toFixed(2);
            mes.img = "http://qqwlw.oss-cn-shenzhen.aliyuncs.com/manage/2017080910385844918.png";
            mes.id = name.id;
            mes.type = '商城收益提现支付宝';

            var uniqueid = uuid.v4();
            meg.msgId = uniqueid;	//uuid
            meg.sendId = '003';
            meg.receiveId = name.账号 + '_商家';
            meg.sessionType = '账单通知';
            meg.msgType = '图文';

            meg.message = mes;
            meg.pushData = "[账单通知:]" +name.explain;
            meg.sendTime = req.time;
            // da = meg;
            mess = JSON.stringify(mes);

            let status = sendMessage(req, redis, meg);
            //数据入库
            let insertSQL = `INSERT INTO im_系统消息账单表 (消息id,接收者账号,接收者名称,会话类型,账单类型,消息类型,推送标题,消息内容,发送时间,接收时间,状态) 
                   VALUES ('${uniqueid}', '${meg.receiveId}', '${name.名称}', '${meg.sessionType}', '${req.type}', '${meg.msgType}', '${meg.pushData}', '${mess}', '${req.time}', '${status.time}', '${status.status}')`;
            let result = pgdb.query(pg, insertSQL).影响行数 || undefined;
            if (!result) {
                data.状态 = '发送失败';
            } else {
                data.状态 = '成功';
            }
            //########################################Update By 曾陈伟####################################

            return data;
        }else{
            data.状态 = '商城收益提现支付宝';
            return data;
        }
    }else if(req.type == '红利兑换') {
        var mesg = '';
        var mess = '';
        sql = "select id,账号,名称,积分,类别,转入银行,录入时间 from 平_兑换表 where 账号 = '" +req.账号+ "' and 录入时间 = '" +req.录入时间+ "'";
        console.log(sql);
        var res = pgdb.query(pg, sql);
//		console.log(res);
        if(res.数据.length != 0) {
            var name = res.数据[0];
            //消息内容
            var mes = {};
            var meg = {};

            if(req.审批状态 == '转款失败(已退积分)') {
                name.explain = '红利提现失败！';
                mes.title = "[账单通知:]" +name.explain;
            }else if(req.审批状态 == '转银行卡失败') {
                name.explain = '红利提现,转银行卡失败！';
                mes.title = "[账单通知:]" +name.explain;
            }else if(req.审批状态 == '已转银行卡') {
                name.explain = '红利提现成功';
                mes.title = "[账单通知:]您已提现" +Number(name.积分).toFixed(2)+ "元";
            }else if(req.审批状态 == '银行处理中') {
                name.explain = '正在处理中';
                mes.title = "[账单通知:]" +name.explain;
            }else{
                data.状态 = '提现异常！';
                return data;
            }

            mes.integral = Number(name.积分).toFixed(2);
            mes.img = "http://qqwlw.oss-cn-shenzhen.aliyuncs.com/manage/2017080910385844918.png";
            mes.id = name.id;
            mes.type = '红利兑换';

            var uniqueid = uuid.v4();
            meg.msgId = uniqueid;	//uuid
            meg.sendId = '003';
            meg.receiveId = name.账号;
            meg.sessionType = '账单通知';
            meg.msgType = '图文';

            meg.message = mes;
            meg.pushData = "[账单通知:]" +name.explain;
            meg.sendTime = req.time;
            // da = meg;
            mess = JSON.stringify(mes);

            // var send = web_im.send_pryivte(name.账号, mesg);
            // console.log(send);
            // if(send.code == '-1') {
            //     console.log('未发送');
            //     var join = "('" + uniqueid + "', '003', '系统', '" + name.账号 + "', '" + name.名称 + "', '系统消息', '文本', '" + mess + "', '" + mesg + "', '" + da.pushData + "', '', '', '0', '未接收', '系统', '" + req.time + "')";
            //     sql = "INSERT INTO im_聊天信息表 (消息id, 发送者, 发送者名称, 接收者, 接收者名称, 会话类型, 消息类型, 消息内容, 消息体, 通知内容, 发送时间, 接收时间, 签收id, 状态, 录入人, 录入时间) VALUES " + join;
            //     sub = pgdb.query(pg, sql);
            // } else {
            //     console.log('已发送');
            //     var join = "('" + uniqueid + "', '003', '系统', '" + name.账号 + "', '" + name.名称 + "', '系统消息', '文本', '" + mess + "', '" + mesg + "', '" + da.pushData + "', '" + req.time + "', '" + req.time + "', '" + da.msgId + "', '已接收', '系统', '" + req.time + "')";
            //     sql = "INSERT INTO im_聊天信息表 (消息id, 发送者, 发送者名称, 接收者, 接收者名称, 会话类型, 消息类型, 消息内容, 消息体, 通知内容, 发送时间, 接收时间, 签收id, 状态, 录入人, 录入时间) VALUES " + join;
            //     sub = pgdb.query(pg, sql);
            // }
            // data.状态 = '成功';

            //########################################Update By 曾陈伟####################################
            //发送消息 返回：已接收/未接收
            let status = sendMessage(req, redis, meg);
            //数据入库
            let insertSQL = `INSERT INTO im_系统消息账单表 (消息id,接收者账号,接收者名称,会话类型,账单类型,消息类型,推送标题,消息内容,发送时间,接收时间,状态) 
                   VALUES ('${uniqueid}', '${req.账号}', '${name.名称}', '${meg.sessionType}', '${req.type}', '${meg.msgType}', '${meg.pushData}', '${mess}', '${req.time}', '${status.time}', '${status.status}')`;
            let result = pgdb.query(pg, insertSQL).影响行数 || undefined;
            if (!result) {
                data.状态 = '发送失败';
            } else {
                data.状态 = '成功';
            }
            //########################################Update By 曾陈伟####################################

            return data;
        }else{
            data.状态 = '无红利兑换记录';
            return data;
        }
    }else if(req.type == '红利兑换支付宝') {
        var mesg = '';
        var mess = '';
		if (req.id == null || req.id == ''){
			data.状态 = '红利提现表id不能为空';
			return data;
		}
		if (req.账号 == null || req.账号 == ''){
			data.状态 = '账号不能为空';
			return data;
		}
		if (req.审批状态 == null || req.审批状态 == ''){
			data.状态 = '审批状态不能为空';
			return data;
		}
		// 需要参数是红利提现表的账号和录入时间 
        sql = "select id,积分,账号,姓名 from 平_红利提现表 where 账号 = '" +req.账号+ "' and id = " + req.id;
        console.log(sql);
        var res = pgdb.query(pg, sql);
//		console.log(res);
        if(res.数据.length != 0) {
            var name = res.数据[0];
            //消息内容
            var mes = {};
            var meg = {};

            if(req.审批状态 == '转款失败(已退积分)') {
                name.explain = '红利提现失败！';
                mes.title = '提现失败';
            }else if(req.审批状态 == '转支付宝失败') {
                name.explain = '红利提现,转支付宝失败！';
                mes.title = name.explain;
            }else if(req.审批状态 == '已转支付宝') {
                name.explain = '红利提现成功';
                mes.title = "提现" +Number(name.积分).toFixed(2)+ "元已到账";
            }else if(req.审批状态 == '审核中') {
                name.explain = '您已提现' + Number(name.积分).toFixed(2)+ '元';
                mes.title = name.explain;
            }else{
                data.状态 = '提现异常！';
                return data;
            }

            mes.integral = Number(name.积分).toFixed(2);
            mes.img = "http://qqwlw.oss-cn-shenzhen.aliyuncs.com/manage/2017080910385844918.png";
            mes.id = name.id;
            mes.type = '红利兑换支付宝';

            var uniqueid = uuid.v4();
            meg.msgId = uniqueid;	//uuid
            meg.sendId = '003';
            meg.receiveId = name.账号;
            meg.sessionType = '账单通知';
            meg.msgType = '图文';

            meg.message = mes;
            meg.pushData = "[账单通知]" +name.explain;
            meg.sendTime = req.time;
            // da = meg;
            mess = JSON.stringify(mes);
            let status = sendMessage(req, redis, meg);
            //数据入库
            let insertSQL = `INSERT INTO im_系统消息账单表 (消息id,接收者账号,接收者名称,会话类型,账单类型,消息类型,推送标题,消息内容,发送时间,接收时间,状态) 
                   VALUES ('${uniqueid}', '${req.账号}', '${name.姓名}', '${meg.sessionType}', '${req.type}', '${meg.msgType}', '${meg.pushData}', '${mess}', '${req.time}', '${status.time}', '${status.status}')`;
            let result = pgdb.query(pg, insertSQL).影响行数 || undefined;
            if (!result) {
                data.状态 = '发送失败';
            } else {
                data.状态 = '成功';
            }
            //########################################Update By 曾陈伟####################################

            return data;
        }else{
            data.状态 = '无红利兑换支付宝记录';
            return data;
        }
    }else if(req.type == '商品购物') {
        var mesg = '';
        var mess = '';
        var minP = '';
        var commodity;
        if(req.状态 == '待支付'){
            sql = "select id,账号,姓名,商品id,状态,实付金额,录入时间,商户订单号 from 商_订单销售表 where 商户订单号 = '" +req.商户订单号+ "' and 状态 = '等待买家付款'";
        }else if(req.状态 == '已支付'){
            sql = "select id,账号,姓名,商品id,状态,实付金额,录入时间,商户订单号 from 商_订单销售表 where 商户订单号 = '" +req.商户订单号+ "' and 状态 = '买家已付款'";
        }
        var res = pgdb.query(pg, sql);
        if(res.数据.length != 0) {
            var name = res.数据;
            name.forEach(function(name, key) {
                f.商户订单号 = name.商户订单号;
                f.商品id = name.商品id;
                f.账号 = name.账号;
                sql = "select id,缩略图 from 商_商品表 where id = '" +f.商品id+ "'";
                console.log(sql);
                sql = pgdb.query(pg, sql);
                if(sql.数据.length != 0){
                    commodity = sql.数据;
                    commodity.forEach(function(name, key) {
                        if(name.缩略图 == '' || name.缩略图 == null) {
                            name.缩略图 = '';
                        }else{
                            var tut = utils.filterPhoto(name.缩略图);
                            var h = tut.substr(0,1);
                            if(h == 'h') {
                                minP = tut;
                            } else {
                                minP = utils.zeroPhoto(tut);
                                if(minP == undefined || minP == '' || minP == null) {
                                    minP = '';
                                }
                            }
                        }
                    })
                }
            })

            console.log('======================1=====================');
            sql = "select id,账号,商户号,商户名,姓名,商品名,商户订单号,支付订单号,一层金额 as 总金额,账号,姓名,状态,录入时间,说明,一层支付方式,二层支付方式,备注 from 平_支付订单表 where 商户订单号 = '" + f.商户订单号 + "'";
            var zf = pgdb.query(pg, sql);
            if(zf.数据.length != 0) {
                f.zf_id = zf.数据[0].id;
                f.账号 = zf.数据[0].账号;
                f.姓名 = zf.数据[0].姓名;
                f.zt = zf.数据[0].状态;
                f.总金额 = zf.数据[0].总金额;
            }
            //消息内容
            var mes = {};
            var meg = {};
            console.log('======================2=====================');
            if(req.状态 == '待支付') {
                mes.title = "[账单通知]您已提交一笔购物订单";
            } else if (req.状态 == '已支付') {
                mes.title = "[账单通知]您已支付" +Number(f.总金额).toFixed(2)+ "元";
            }
            mes.integral = Number(f.总金额).toFixed(2);
            mes.img = minP;

            //##################################Update By 曾陈伟 改掉这破东西##############################
            // if(req.状态 == '待支付') {
            //     mes.id = f.zf_id;
            //     mes.type = '商品购物待支付';
            // } else if (req.状态 == '已支付'){
            //     sql = "select * from 平_账户表 where 关联id = '" +f.zf_id+ "'";
            //     sql = pgdb.query(pg, sql);
            //     if(sql.数据.length > 0){
            //         f.id = sql.数据[0].id;
            //     }
            //     mes.id = f.id;
            //     mes.type = '商品购物';
            // }
            mes.id = f.zf_id;
            mes.type = '商品购物';


            var uniqueid = uuid.v4();
            meg.msgId = uniqueid;	//uuid
            meg.sendId = '003';
            meg.receiveId = f.账号;
            meg.sessionType = '账单通知';
            meg.msgType = '图文';
            console.log('======================3=====================');
            if(req.状态 == '待支付') {
                meg.pushData = "[账单通知]您已提交一笔购物订单";
            }else if(req.状态 == '已支付') {
                meg.pushData = "[账单通知]您已支付" +Number(f.总金额).toFixed(2)+ "元";
            } else {
                data.状态 = '状态异常!';
                return data;
            }

            meg.message = mes;
            meg.sendTime = req.time;
            // da = meg;
            mess = JSON.stringify(mes);
            // var send = web_im.send_pryivte(f.账号, mesg);
            // console.log(send);
            // if(send.code == '-1') {
            //     console.log('未发送');
            //     var join = "('" + uniqueid + "', '003', '系统', '" + f.账号 + "', '" + f.姓名 + "', '系统消息', '文本', '" + mess + "', '" + mesg + "', '" + da.pushData + "', '', '', '0', '未接收', '系统', '" + req.time + "')";
            //     sql = "INSERT INTO im_聊天信息表 (消息id, 发送者, 发送者名称, 接收者, 接收者名称, 会话类型, 消息类型, 消息内容, 消息体, 通知内容, 发送时间, 接收时间, 签收id, 状态, 录入人, 录入时间) VALUES " + join;
            //     sub = pgdb.query(pg, sql);
            // } else {
            //     console.log('已发送');
            //     var join = "('" + uniqueid + "', '003', '系统', '" + f.账号 + "', '" + f.姓名 + "', '系统消息', '文本', '" + mess + "', '" + mesg + "', '" + da.pushData + "', '" + req.time + "', '" + req.time + "', '" + da.msgId + "', '已接收', '系统', '" + req.time + "')";
            //     sql = "INSERT INTO im_聊天信息表 (消息id, 发送者, 发送者名称, 接收者, 接收者名称, 会话类型, 消息类型, 消息内容, 消息体, 通知内容, 发送时间, 接收时间, 签收id, 状态, 录入人, 录入时间) VALUES " + join;
            //     sub = pgdb.query(pg, sql);
            // }
            // data.状态 = '成功';

            console.log('发送商品购物账单消息的参数11111111111：', meg);
            //########################################Update By 曾陈伟####################################
            //发送消息 返回：已接收/未接收
            let status = sendMessage(req, redis, meg);
            //数据入库
            let insertSQL = `INSERT INTO im_系统消息账单表 (消息id,接收者账号,接收者名称,会话类型,账单类型,消息类型,推送标题,消息内容,发送时间,接收时间,状态) 
                   VALUES ('${uniqueid}', '${f.账号}', '${f.姓名}', '${meg.sessionType}', '${req.type}', '${meg.msgType}', '${meg.pushData}', '${mess}', '${req.time}', '${status.time}', '${status.status}')`;
            let result = pgdb.query(pg, insertSQL).影响行数 || undefined;
            if (!result) {
                data.状态 = '发送失败';
            } else {
                data.状态 = '成功';
            }
            //########################################Update By 曾陈伟####################################

            return data;
        } else {
            data.状态 = '无购物订单记录！';
            return data;
        }
    }
}


/**
 * 发送系统消息
 * @param f
 * @param redis
 * @param message 消息内容
 * @returns {string|string} 返回 已接收/未接收
 */
let sendMessage = (f, redis, message) => {

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
        console.log(message.receiveId, '用户在线发送账单消息');

    } else { //=========离线===========
        res.status = '未接收';  // PS:生产环境下这里肯定不会执行，因为是自己触发该接口说明本人肯定是在线的
        res.time = '';
        console.log(message.receiveId, '用户不在线发送账单离线消息');
    }

    return res;
};