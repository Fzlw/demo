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
 
/**
 * 修改人：龙骑
 * 修改时间：2018-01-03 14:36:00
 * 修改内容：再次修改发送账单消息，因为代码我看不懂，连注释都不给一个
 */

/* 
	红利兑换支付宝传值
	"type": "红利兑换支付宝",
    "账号": "15680800517",
    "录入时间": "2018-1-3 10:01:21",
    "审批状态": "123",
    "id": "69",
    "func": "systemBillMes"
*/
module.exports.run = function(body, pg, mo, redis, pg2) {
	// 传值提取
	let reqData = body.receive;
	// 返回响应
	let resData = new SendMessage(reqData, pg, redis);
	console.log(resData)
	return resData;
}

class SendMessage {
	constructor (reqData, pg, redis) {
		reqData == null ? this.reqData = {} : this.reqData = reqData;
		pg == null ? this.pg = {} : this.pg = pg;
		redis == null ? this.redis = {} : this.redis = redis;
		// 通用的sql语句变量
		this.sql = "";
		// 通用查询结果变量
		this.result = "";
		// 通用图片变量
		this.img = "http://qqwlw.oss-cn-shenzhen.aliyuncs.com/manage/2017080910385844918.png";
		// 通用时间
		this.reqData.time = moment().format('YYYY-MM-DD HH:mm:ss');
		this.resData = {};
		this.resData.状态 = '成功';
		console.log(reqData.type);

		switch (reqData.type) {
			case '支付宝扫码充值' :
				return this.alipayScanCodePay();
				break;
			case '积分充值' :
				return this.integralPay();
				break;
			case '转让积分' :
				return this.transferIntergral();
				break;
			case '商城收益兑换' :
				return this.shopEarnExchange();
				break;
			case '商城收益提现支付宝' :
				return this.shopEarnToAlipay();
				break;
			case '红利兑换' :
				return this.bonusExchange();
				break;
			case '红利兑换支付宝' :
				return this.bonusExchangeToAlipay();
				break;
			case '商品购物' :
				return this.shopping();
				break;
			case '' || null || undefined :
				return this.error();
				break;
			default:
				return this.usual();
				break;
		}	
	}
	
	// 方法
	error() {
		this.resData.状态 = 'type不能为空';
		return this.resData;
	}
	
	// 暂时返回错误
	usual() {
		this.resData.状态 = 'type错误';
		return this.resData;
	}
	
	// 支付宝扫码充值后给用户发一条系统消息
	alipayScanCodePay() {
		// 1 加入限制
		this.reqData.交易单号 || (this.resData.状态 = '交易单号不能为空');
		this.reqData.账号 || (this.resData.状态 = '账号不能为空');
		// this.reqData.id || (this.resData.状态 = 'id不能为空');
		if(this.resData.状态 != '成功'){
			return this.resData;
		}

		// 2 查询支付宝交易
		this.sql = "select id,支付宝交易号,总金额 from 平_支付宝积分充值表 where 支付宝交易号 = '" + this.reqData.交易单号 + "'";
		let alipayDeal = pgdb.query(this.pg, this.sql);
		alipayDeal.状态 == '成功' || (this.resData.状态 = '支付宝积分充值数据错误');
		alipayDeal.状态 != '成功' || alipayDeal.数据.length > 0 || (this.resData.状态 = '支付宝积分充值无此交易单号');
		if(this.resData.状态 != '成功'){
			return this.resData;
		}

		// 3 查询账户记录
		this.sql = "select id,账号,姓名,积分,余额,关联id,录入时间,说明,备注 from 平_账户表 where 账号 = '" + this.reqData.账号 + "' and 关联id = '" + alipayDeal.数据[0].id + "'";
		let accountData = pgdb.query(this.pg, this.sql);
		accountData.状态 == '成功' || (this.resData.状态 = '账户表数据错误');
		accountData.状态 != '成功' || accountData.数据.length > 0 || (this.resData.状态 = '账户表无此交易记录');
		if(this.resData.状态 != '成功'){
			return this.resData;
		}
		
		// 4 组成发送消息格式
		// 消息内容
		let messageContent = {};
		messageContent.title = '[账单通知]您已充值' + Number(accountData.数据[0].积分).toFixed(2) + '积分';
		messageContent.integral = Number(accountData.数据[0].积分).toFixed(2);
		messageContent.img = this.img;
		messageContent.id = alipayDeal.数据[0].id;
        messageContent.type = '支付宝充值';
		// 消息格式
		let messageFormat = {};
		messageFormat.msgId = uuid.v4() + '1';
		messageFormat.sendId = '003';
		messageFormat.receiveId = this.reqData.账号;
		messageFormat.sessionType = '账单通知';
        messageFormat.msgType = '图文';
		messageFormat.pushData = "[账单通知]您已充值" +Number(accountData.数据[0].积分).toFixed(2)+ "积分";
        messageFormat.sendTime = this.reqData.time;
		messageFormat.message = messageContent;
		// 内容转字符串
		messageContent = JSON.stringify(messageContent);
		
		// 5 发消息
		let sendStatus = sendMessage(this.reqData, this.redis, messageFormat);
		
		// 6 消息存入账单表中
		this.sql = `INSERT INTO im_系统消息账单表 (消息id,接收者账号,接收者名称,会话类型,账单类型,消息类型,推送标题,消息内容,发送时间,接收时间,状态) VALUES ('${messageFormat.msgId}', '${messageFormat.receiveId}', '${accountData.数据[0].姓名}', '账单通知', '支付宝充值', '图文', '${messageFormat.pushData}', '${messageContent}', '${this.reqData.time}', '${sendStatus.time}', '${sendStatus.status}')`;
        this.result = pgdb.query(this.pg, this.sql);
        this.result.状态 == '成功' || (this.resData.状态 = '系统消息账单数据错误');
		this.result.状态 != '成功' || this.result.影响行数 || (this.resData.状态 = '系统消息账单增加失败');
		return this.resData;
	}

	// 积分充值后给用户发一条系统消息
	integralPay() {
		// 1 加入限制
		this.reqData.商户订单号 || (this.resData.状态 = '商户订单号不能为空');
		this.reqData.账号 || (this.resData.状态 = '账号不能为空');
		// this.reqData.id || (this.resData.状态 = 'id不能为空');
		if(this.resData.状态 != '成功'){
			return this.resData;
		}

		// 2 查询积分充值数据
		this.sql = `select a.姓名,a.积分,b.id,b.状态 from 平_积分充值订单表 a left join 平_支付订单表 b on a.商户订单号 = b.商户订单号 where a.账号 = '${this.reqData.账号}' and a.商户订单号 = '${this.reqData.商户订单号}'`;
		let dealData = pgdb.query(this.pg, this.sql);
		dealData.状态 == '成功' || (this.resData.状态 = '积分充值数据错误');
		dealData.状态 != '成功' || dealData.数据.length == 1 || (this.resData.状态 = '积分充值无此商户订单号');
		if(this.resData.状态 != '成功'){
			return this.resData;
		}

		// 3 组成发送消息格式
		// 消息内容
		let messageContent = {};
		messageContent.integral = Number(dealData.数据[0].积分).toFixed(2);
		messageContent.img = this.img;
		messageContent.id = dealData.数据[0].id;
		messageContent.type = '积分充值';
		if(dealData.数据[0].状态 == '待支付') {
			messageContent.title = messageContent.pushData = '[账单通知]您已提交一笔订单';
		} else if (dealData.数据[0].状态 == '已支付') {
			messageContent.title = messageContent.pushData = "[账单通知]您已充值" + Number(dealData.数据[0].积分).toFixed(2) + "积分";
		} else {
			this.resData.状态 = '积分充值订单状态异常';
			return this.resData;
		}

		// 消息格式
		let messageFormat = {};
		messageFormat.msgId = uuid.v4();
		messageFormat.sendId = '003';
		messageFormat.receiveId = this.reqData.账号;
		messageFormat.sessionType = '账单通知';
        messageFormat.msgType = '图文';
		messageFormat.pushData = "[账单通知]您已充值" +Number(dealData.数据[0].积分).toFixed(2)+ "积分";
        messageFormat.sendTime = this.reqData.time;
		messageFormat.message = messageContent;
		// 内容转字符串
		messageContent = JSON.stringify(messageContent);

		// 4 发消息
		let sendStatus = sendMessage(this.reqData, this.redis, messageFormat);
		
		// 5 消息存入账单表中
		this.sql = `INSERT INTO im_系统消息账单表 (消息id,接收者账号,接收者名称,会话类型,账单类型,消息类型,推送标题,消息内容,发送时间,接收时间,状态) VALUES ('${messageFormat.msgId}', '${messageFormat.receiveId}', '${dealData.数据[0].姓名}', '${messageFormat.sessionType}', '$(messageContent.type)', '图文', '${messageFormat.pushData}', '${messageContent}', '${this.reqData.time}', '${sendStatus.time}', '${sendStatus.status}')`;
        this.result = pgdb.query(this.pg, this.sql);
        this.result.状态 == '成功' || (this.resData.状态 = '系统消息账单数据错误');
		this.result.状态 != '成功' || this.result.影响行数 || (this.resData.状态 = '系统消息账单增加失败');
		return this.resData;
	}

	// 转让积分
	transferIntergral() {
		// 1 加入限制
		this.reqData.收方账号 || (this.resData.状态 = '收方账号不能为空');
		this.reqData.我方录入时间 || (this.resData.状态 = '我方录入时间不能为空');
		this.reqData.账号 || (this.resData.状态 = '账号不能为空');
		if(this.resData.状态 != '成功'){
			return this.resData;
		}

		// 2 转让明细表数据
		this.sql = `select id,账号,姓名,积分,转让方式,出入账号,出入姓名,转让方式,录入时间 from 平_转让明细表 where 账号 = '${this.reqData.账号}' and 出入账号 = '${this.reqData.收方账号}' and 录入时间 = '${this.reqData.我方录入时间}' and 状态 = '转让成功'`;
		let transferData = pgdb.query(this.pg, this.sql);
		transferData.状态 == '成功' || (this.resData.状态 = '转让明细数据错误');
		transferData.状态 != '成功' || transferData.数据.length == 1 || (this.resData.状态 = '转让明细无此记录');
		//console.log(transferData);
		if(this.resData.状态 != '成功'){
			return this.resData;
		}

		// 3 查相应账户表记录
		this.sql = `select id,积分,关联id,说明,交易账户,商户号,备注,录入时间 from 平_账户表 where 账号 ='${this.reqData.账号}' and 关联id = '${transferData.数据[0].id}' and 交易类别='转让积分'`;
		let accountData = pgdb.query(this.pg, this.sql);
		accountData.状态 == '成功' || (this.resData.状态 = '账户表数据错误');
		accountData.状态 != '成功' || accountData.数据.length == 1 || (this.resData.状态 = '账户表无此记录');
		if(this.resData.状态 != '成功'){
			return this.resData;
		}
		
		// 4 组成发送消息格式
		let messageContent = {};
		messageContent.title = '[账单通知]' + transferData.数据[0].姓名 + accountData.数据[0].说明;
		messageContent.integral = Number(accountData.数据[0].积分).toFixed(2);
		messageContent.img = this.img;
		messageContent.id = transferData.数据[0].id;
        messageContent.type = '积分转让';
		
		let messageFormat = {};
		messageFormat.msgId = uuid.v4();
		messageFormat.sendId = '003';
		messageFormat.receiveId = this.reqData.账号;
		messageFormat.sessionType = '账单通知';
        messageFormat.msgType = '图文';
		messageFormat.pushData = '[账单通知]' + transferData.数据[0].姓名 + accountData.数据[0].说明;
        messageFormat.sendTime = this.reqData.time;
		messageFormat.message = messageContent;
		// 内容转字符串
		messageContent = JSON.stringify(messageContent);
		
		// 5 发消息
		let sendStatus = sendMessage(this.reqData, this.redis, messageFormat);
		
		// 6 消息存入账单表中
        this.sql = `INSERT INTO im_系统消息账单表 (消息id,接收者账号,接收者名称,会话类型,账单类型,消息类型,推送标题,消息内容,发送时间,接收时间,状态) VALUES ('${messageFormat.msgId}', '${messageFormat.receiveId}', '${transferData.数据[0].姓名}', '${messageFormat.sessionType}', '$(reqData.type)', '图文', '${messageFormat.pushData}', '${messageContent}', '${this.reqData.time}', '${sendStatus.time}', '${sendStatus.status}')`;
		this.result = pgdb.query(this.pg, this.sql);
        this.result.状态 == '成功' || (this.resData.状态 = '系统消息账单数据错误');
		this.result.状态 != '成功' || this.result.影响行数 || (this.resData.状态 = '系统消息账单增加失败');
		if(this.resData.状态 != '成功'){
			return this.resData;
		}
    
		// 7 出入账号是什么鬼哦，两个人相互转账的
		this.sql = `select id,积分,姓名,关联id,说明,交易账户,商户号,备注,录入时间 from 平_账户表 where 账号 ='${this.reqData.收方账号}' and 关联id = '${transferData.数据[0].id}' and 交易类别='转让积分'`;
		console.log(this.sql);
		let accountDataToSend = pgdb.query(this.pg, this.sql);
		accountDataToSend.状态 == '成功' || (this.resData.状态 = '账户表数据错误');
		accountDataToSend.状态 != '成功' || accountDataToSend.数据.length == 1 || (this.resData.状态 = '账户表无此记录');
		if(this.resData.状态 != '成功'){
			return this.resData;
		}
		
		// 7 给收钱的人发消息
		messageContent = {};
		messageContent.title = '[账单通知]' + accountDataToSend.数据[0].姓名 + "已获得" + accountDataToSend.数据[0].说明;
		messageContent.integral = Number(accountDataToSend.数据[0].积分).toFixed(2);
		messageContent.img = this.img;
		messageContent.id = transferData.数据[0].id;
        messageContent.type = '积分转让';
		
		messageFormat = {};
		messageFormat.msgId = uuid.v4();
		messageFormat.sendId = '003';
		messageFormat.receiveId = this.reqData.收方账号;
		messageFormat.sessionType = '账单通知';
        messageFormat.msgType = '图文';
		messageFormat.pushData = '[账单通知]' + accountDataToSend.数据[0].姓名 + "已获得" + accountDataToSend.数据[0].说明;
        messageFormat.sendTime = this.reqData.time;
		messageFormat.message = messageContent;
		// 内容转字符串
		messageContent = JSON.stringify(messageContent);
		
		// 8 发消息
		sendStatus = sendMessage(this.reqData, this.redis, messageFormat);
		
		// 9 消息存入账单表中
        this.sql = `INSERT INTO im_系统消息账单表 (消息id,接收者账号,接收者名称,会话类型,账单类型,消息类型,推送标题,消息内容,发送时间,接收时间,状态) VALUES ('${messageFormat.msgId}', '${messageFormat.receiveId}', '${accountDataToSend.数据[0].姓名}', '${messageFormat.sessionType}', '$(reqData.type)', '图文', '${messageFormat.pushData}', '${messageContent}', '${this.reqData.time}', '${sendStatus.time}', '${sendStatus.status}')`;
		this.result = pgdb.query(this.pg, this.sql);
        this.result.状态 == '成功' || (this.resData.状态 = '系统消息账单数据错误');
		this.result.状态 != '成功' || this.result.影响行数 || (this.resData.状态 = '系统消息账单增加失败');
		
		return this.resData;
	}
	
	// 商城收益兑换
	shopEarnExchange() {
		// 1 加入限制
		this.reqData.审批状态 || (this.resData.状态 = '审批状态不能为空');
		this.reqData.录入时间 || (this.resData.状态 = '录入时间不能为空');
		this.reqData.账号 || (this.resData.状态 = '账号不能为空');
		if(this.resData.状态 != '成功'){
			return this.resData;
		}
		
		// 2 收益兑换数据
		this.sql = `select id,账号,名称,积分,类别,转入银行 from 商_收益兑换表 where 账号 = '${this.reqData.账号}' and 录入时间 = '${this.reqData.录入时间}'`;
		let exchangeData = pgdb.query(this.pg, this.sql);
		exchangeData.状态 == '成功' || (this.resData.状态 = '收益兑换数据错误');
		exchangeData.状态 != '成功' || exchangeData.数据.length == 1 || (this.resData.状态 = '收益兑换数据无此记录');
		if(this.resData.状态 != '成功'){
			return this.resData;
		}
		
		// 3 组消息
		let messageContent = {};
		let messageFormat = {};
		
		if(this.reqData.审批状态 == '转款失败(已退积分)' ) {
			messageContent.title = '[账单通知]商城收益提现失败，已退还到收益积分';
			messageFormat.pushData = '[账单通知]商城收益提现失败，已退还到收益积分';
		}else if(this.reqData.审批状态 == '转银行卡失败') {
			messageContent.title = '[账单通知]商城收益转银行卡失败';
			messageFormat.pushData = '[账单通知]商城收益转银行卡失败';
		}else if(this.reqData.审批状态 == '已转银行卡') {
			messageContent.title = '[账单通知]您已提现' +Number(exchangeData.数据[0].积分).toFixed(2)+ '元';
			messageFormat.pushData = '商城收益提现成功';	
		}else if(this.reqData.审批状态 == '银行处理中') {
			messageContent.title = '[账单通知]正在处理中';
			messageFormat.pushData = '[账单通知]正在处理中';
		}else{
			this.resData.状态 = '审批状态异常';
			return this.resData;
		}
		
		messageContent.integral = Number(exchangeData.数据[0].积分).toFixed(2);
		messageContent.img = this.img;
		messageContent.id = exchangeData.数据[0].id;
        messageContent.type = '商城收益兑换';
		messageFormat.msgId = uuid.v4();
		messageFormat.sendId = '003';
		messageFormat.receiveId = this.reqData.账号 + '_商家';
		messageFormat.sessionType = '账单通知';
        messageFormat.msgType = '图文';
        messageFormat.sendTime = this.reqData.time;
		messageFormat.message = messageContent;
		// 内容转字符串
		messageContent = JSON.stringify(messageContent);
		
		// 4 发消息
		let sendStatus = sendMessage(this.reqData, this.redis, messageFormat);
		
		// 5 存系统消息账单
		this.sql = `INSERT INTO im_系统消息账单表 (消息id,接收者账号,接收者名称,会话类型,账单类型,消息类型,推送标题,消息内容,发送时间,接收时间,状态) VALUES ('${messageFormat.msgId}', '${messageFormat.receiveId}', '${exchangeData.数据[0].名称}', '${messageFormat.sessionType}', '$(reqData.type)', '图文', '${messageFormat.pushData}', '${messageContent}', '${this.reqData.time}', '${sendStatus.time}', '${sendStatus.status}')`;
		this.result = pgdb.query(this.pg, this.sql);
        this.result.状态 == '成功' || (this.resData.状态 = '系统消息账单数据错误');
		this.result.状态 != '成功' || this.result.影响行数 || (this.resData.状态 = '系统消息账单增加失败');
		
		return this.resData;
	}
	
	// 商城收益提现支付宝
	shopEarnToAlipay() {
		// 1 加入限制
		this.reqData.审批状态 || (this.resData.状态 = '审批状态不能为空');
		this.reqData.录入时间 || (this.resData.状态 = '录入时间不能为空');
		this.reqData.账号 || (this.resData.状态 = '账号不能为空');
		if(this.resData.状态 != '成功'){
			return this.resData;
		}
		
		// 2 收益兑换数据
		this.sql = `select id,账号,名称,积分,类别,转入支付宝姓名,录入时间 from 商_收益提现支付宝表 where 账号 = '${this.reqData.账号}' and 录入时间 = '${this.reqData.录入时间}'`;
		let exchangeData = pgdb.query(this.pg, this.sql);
		exchangeData.状态 == '成功' || (this.resData.状态 = '收益提现支付宝数据错误');
		exchangeData.状态 != '成功' || exchangeData.数据.length == 1 || (this.resData.状态 = '收益提现支付宝数据无此记录');
		if(this.resData.状态 != '成功'){
			return this.resData;
		}
		
		// 3 组消息
		let messageContent = {};
		let messageFormat = {};
		
		if(this.reqData.审批状态 == '转款失败(已退积分)' ) {
			messageContent.title = '[账单通知]商城收益提现失败，已退还到收益积分';
			messageFormat.pushData = '[账单通知]商城收益提现失败，已退还到收益积分';
		}else if(this.reqData.审批状态 == '转支付宝失败') {
			messageContent.title = '[账单通知]商城收益,转支付宝失败';
			messageFormat.pushData = '[账单通知]商城收益,转支付宝失败';
		}else if(this.reqData.审批状态 == '已转支付宝') {
			messageContent.title = '[账单通知]您已提现' +Number(exchangeData.数据[0].积分).toFixed(2)+ '元';
			messageFormat.pushData = '商城收益提现成功';	
		}else if(this.reqData.审批状态 == '审批同意') {
			messageFormat.pushData = '[账单通知]你已提现';
			messageContent.title = '[账单通知]你已提现' + Number(exchangeData.数据[0].积分).toFixed(0) + '元';
        }else{
			this.resData.状态 = '审批状态异常';
			return this.resData;
		}
		
		messageContent.integral = Number(exchangeData.数据[0].积分).toFixed(2);
		messageContent.img = this.img;
		messageContent.id = exchangeData.数据[0].id;
        messageContent.type = '商城收益提现支付宝';
		messageFormat.msgId = uuid.v4();
		messageFormat.sendId = '003';
		messageFormat.receiveId = this.reqData.账号 + '_商家';
		messageFormat.sessionType = '账单通知';
        messageFormat.msgType = '图文';
        messageFormat.sendTime = this.reqData.time;
		messageFormat.message = messageContent;
		// 内容转字符串
		messageContent = JSON.stringify(messageContent);
		
		// 4 发消息
		let sendStatus = sendMessage(this.reqData, this.redis, messageFormat);
		
		// 5 存系统消息账单
		this.sql = `INSERT INTO im_系统消息账单表 (消息id,接收者账号,接收者名称,会话类型,账单类型,消息类型,推送标题,消息内容,发送时间,接收时间,状态) VALUES ('${messageFormat.msgId}', '${messageFormat.receiveId}', '${exchangeData.数据[0].名称}', '${messageFormat.sessionType}', '$(reqData.type)', '图文', '${messageFormat.pushData}', '${messageContent}', '${this.reqData.time}', '${sendStatus.time}', '${sendStatus.status}')`;
		this.result = pgdb.query(this.pg, this.sql);
        this.result.状态 == '成功' || (this.resData.状态 = '系统消息账单数据错误');
		this.result.状态 != '成功' || this.result.影响行数 || (this.resData.状态 = '系统消息账单增加失败');
		
		return this.resData;
	}
	
	// 红利兑换
	bonusExchange() {
		// 1 加入限制
		this.reqData.审批状态 || (this.resData.状态 = '审批状态不能为空');
		this.reqData.录入时间 || (this.resData.状态 = '录入时间不能为空');
		this.reqData.账号 || (this.resData.状态 = '账号不能为空');
		if(this.resData.状态 != '成功'){
			return this.resData;
		}
		
		// 2 红利兑换数据
		this.sql = `select id,名称,积分,类别,转入银行 from 平_兑换表 where 账号 = '${this.reqData.账号}' and 录入时间 = '${this.reqData.录入时间}'`;
		let exchangeData = pgdb.query(this.pg, this.sql);
		exchangeData.状态 == '成功' || (this.resData.状态 = '兑换表数据错误');
		exchangeData.状态 != '成功' || exchangeData.数据.length == 1 || (this.resData.状态 = '兑换表无此记录');
		if(this.resData.状态 != '成功'){
			return this.resData;
		}
		
		// 3 组消息
		let messageContent = {};
		let messageFormat = {};
		
		if(this.reqData.审批状态 == '转款失败(已退积分)' ) {
			messageContent.title = '红利提现失败';
			messageFormat.pushData = '[账单通知]红利提现失败';
		}else if(this.reqData.审批状态 == '转银行卡失败') {
			messageContent.title = '红利提现,转银行卡失败';
			messageFormat.pushData = '[账单通知]红利提现,转银行卡失败';
		}else if(this.reqData.审批状态 == '已转银行卡') {
			messageContent.title = '[账单通知]您已提现' + Number(exchangeData.数据[0].积分).toFixed(2)+ '元';
			messageFormat.pushData = '红利提现成功';	
		}else if(this.reqData.审批状态 == '银行处理中') {
			messageFormat.pushData = '[账单通知]正在处理中';
			messageContent.title = '正在处理中';
        }else{
			this.resData.状态 = '审批状态异常';
			return this.resData;
		}
		
		messageContent.integral = Number(exchangeData.数据[0].积分).toFixed(2);
		messageContent.img = this.img;
		messageContent.id = exchangeData.数据[0].id;
        messageContent.type = '红利兑换';
		messageFormat.msgId = uuid.v4();
		messageFormat.sendId = '003';
		messageFormat.receiveId = this.reqData.账号;
		messageFormat.sessionType = '账单通知';
        messageFormat.msgType = '图文';
        messageFormat.sendTime = this.reqData.time;
		messageFormat.message = messageContent;
		// 内容转字符串
		messageContent = JSON.stringify(messageContent);
		
		// 4 发消息
		let sendStatus = sendMessage(this.reqData, this.redis, messageFormat);
		
		// 5 存系统消息账单
		this.sql = `INSERT INTO im_系统消息账单表 (消息id,接收者账号,接收者名称,会话类型,账单类型,消息类型,推送标题,消息内容,发送时间,接收时间,状态) VALUES ('${messageFormat.msgId}', '${messageFormat.receiveId}', '${exchangeData.数据[0].名称}', '${messageFormat.sessionType}', '$(reqData.type)', '图文', '${messageFormat.pushData}', '${messageContent}', '${this.reqData.time}', '${sendStatus.time}', '${sendStatus.status}')`;
		this.result = pgdb.query(this.pg, this.sql);
        this.result.状态 == '成功' || (this.resData.状态 = '系统消息账单数据错误');
		this.result.状态 != '成功' || this.result.影响行数 || (this.resData.状态 = '系统消息账单增加失败');
		
		return this.resData;
	}
	
	// 红利兑换支付宝
	bonusExchangeToAlipay() {
		// 1 加入限制
		this.reqData.审批状态 || (this.resData.状态 = '审批状态不能为空');
		this.reqData.id || (this.resData.状态 = '红利提现表id不能为空');
		this.reqData.账号 || (this.resData.状态 = '账号不能为空');
		if(this.resData.状态 != '成功'){
			return this.resData;
		}
		
		// 2 红利兑换支付宝数据
		this.sql = `select id,积分,账号,姓名 from 平_红利提现表 where 账号 = '${this.reqData.账号}' and id = '${this.reqData.id}'`;
		let exchangeData = pgdb.query(this.pg, this.sql);
		exchangeData.状态 == '成功' || (this.resData.状态 = '红利提现表数据错误');
		exchangeData.状态 != '成功' || exchangeData.数据.length == 1 || (this.resData.状态 = '无红利兑换支付宝记录');
		if(this.resData.状态 != '成功'){
			return this.resData;
		}
		
		// 3 组消息
		let messageContent = {};
		let messageFormat = {};
		
		if(this.reqData.审批状态 == '转款失败(已退积分)' ) {
			messageContent.title = '红利提现失败';
			messageFormat.pushData = '[账单通知]红利提现失败';
		}else if(this.reqData.审批状态 == '转支付宝失败') {
			messageContent.title = '红利提现,转支付宝失败';
			messageFormat.pushData = '[账单通知]红利提现,转支付宝失败';
		}else if(this.reqData.审批状态 == '已转支付宝') {
			messageContent.title = '[账单通知]您已提现' + Number(exchangeData.数据[0].积分).toFixed(2)+ '元';
			messageFormat.pushData = '红利提现成功';	
		}else if(this.reqData.审批状态 == '审核中') {
			messageFormat.pushData = '[账单通知]正在处理中';
			messageContent.title = '正在处理中';
        }else{
			this.resData.状态 = '审批状态异常';
			return this.resData;
		}
		
		messageContent.integral = Number(exchangeData.数据[0].积分).toFixed(2);
		messageContent.img = this.img;
		messageContent.id = exchangeData.数据[0].id;
        messageContent.type = '红利兑换支付宝';
		messageFormat.msgId = uuid.v4();
		messageFormat.sendId = '003';
		messageFormat.receiveId = this.reqData.账号;
		messageFormat.sessionType = '账单通知';
        messageFormat.msgType = '图文';
        messageFormat.sendTime = this.reqData.time;
		messageFormat.message = messageContent;
		// 内容转字符串
		messageContent = JSON.stringify(messageContent);
		
		// 4 发消息
		let sendStatus = sendMessage(this.reqData, this.redis, messageFormat);
		
		// 5 存系统消息账单
		this.sql = `INSERT INTO im_系统消息账单表 (消息id,接收者账号,接收者名称,会话类型,账单类型,消息类型,推送标题,消息内容,发送时间,接收时间,状态) VALUES ('${messageFormat.msgId}', '${messageFormat.receiveId}', '${exchangeData.数据[0].名称}', '${messageFormat.sessionType}', '$(reqData.type)', '图文', '${messageFormat.pushData}', '${messageContent}', '${this.reqData.time}', '${sendStatus.time}', '${sendStatus.status}')`;
		this.result = pgdb.query(this.pg, this.sql);
        this.result.状态 == '成功' || (this.resData.状态 = '系统消息账单数据错误');
		this.result.状态 != '成功' || this.result.影响行数 || (this.resData.状态 = '系统消息账单增加失败');
		
		return this.resData;
		
	}
	
	// 商品购物
	shopping() {
		// 1 加入限制
		this.reqData.状态 || (this.resData.状态 = '状态不能为空');
		this.reqData.商户订单号 || (this.resData.状态 = '商户订单号不能为空');
		if(this.resData.状态 != '成功'){
			return this.resData;
		}
		
		// 2 订单销售数据
		if(req.状态 == '待支付'){
            this.sql = `select id,账号,姓名,商品id,状态,实付金额,录入时间,商户订单号 from 商_订单销售表 where 商户订单号 = '${this.reqData.商户订单号}' and 状态 = '等待买家付款'`;
        }else if(req.状态 == '已支付'){
            this.sql = `select id,账号,姓名,商品id,状态,实付金额,录入时间,商户订单号 from 商_订单销售表 where 商户订单号 = '${this.reqData.商户订单号}' and 状态 = '买家已付款'`;
        }else{
			this.resData.状态 = '状态错误';
			return this.resData;
		}
		
		let saleData = pgdb.query(this.pg, this.sql);
		saleData.状态 == '成功' || (this.resData.状态 = '订单销售数据错误');
		saleData.状态 != '成功' || saleData.数据.length > 0 || (this.resData.状态 = '无订单销售记录');
		if(this.resData.状态 != '成功'){
			return this.resData;
		}
		
		let minP = '';
        let commodity;
		
		(saleData.数据).forEach(function(value) {
			this.sql = `select 缩略图 from 商_商品表 where id = '${value.商品id}'`;
			let pic = pgdb.query(this.pg, this.sql);
			if(pic.数据.length != 0){
				(pic.数据).forEach(function(name) {
					if(name.缩略图 == '' || name.缩略图 == null) {
						name.缩略图 = '';
					}else{
						var tut = utils.filterPhoto(name.缩略图);
						console.log(tut);
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
		
		// 3 组消息
		let messageContent = {};
		let messageFormat = {};
		
		if(this.reqData.审批状态 == '转款失败(已退积分)' ) {
			messageContent.title = '红利提现失败';
			messageFormat.pushData = '[账单通知]红利提现失败';
		}else if(this.reqData.审批状态 == '转支付宝失败') {
			messageContent.title = '红利提现,转支付宝失败';
			messageFormat.pushData = '[账单通知]红利提现,转支付宝失败';
		}else if(this.reqData.审批状态 == '已转支付宝') {
			messageContent.title = '[账单通知]您已提现' + Number(exchangeData.数据[0].积分).toFixed(2)+ '元';
			messageFormat.pushData = '红利提现成功';	
		}else if(this.reqData.审批状态 == '审核中') {
			messageFormat.pushData = '[账单通知]正在处理中';
			messageContent.title = '正在处理中';
        }else{
			this.resData.状态 = '审批状态异常';
			return this.resData;
		}
		
		messageContent.integral = Number(exchangeData.数据[0].积分).toFixed(2);
		messageContent.img = this.img;
		messageContent.id = exchangeData.数据[0].id;
        messageContent.type = '红利兑换支付宝';
		messageFormat.msgId = uuid.v4();
		messageFormat.sendId = '003';
		messageFormat.receiveId = this.reqData.账号;
		messageFormat.sessionType = '账单通知';
        messageFormat.msgType = '图文';
        messageFormat.sendTime = this.reqData.time;
		messageFormat.message = messageContent;
		// 内容转字符串
		messageContent = JSON.stringify(messageContent);
		
		// 4 发消息
		let sendStatus = sendMessage(this.reqData, this.redis, messageFormat);
		
		// 5 存系统消息账单
		this.sql = `INSERT INTO im_系统消息账单表 (消息id,接收者账号,接收者名称,会话类型,账单类型,消息类型,推送标题,消息内容,发送时间,接收时间,状态) VALUES ('${messageFormat.msgId}', '${messageFormat.receiveId}', '${exchangeData.数据[0].名称}', '${messageFormat.sessionType}', '$(reqData.type)', '图文', '${messageFormat.pushData}', '${messageContent}', '${this.reqData.time}', '${sendStatus.time}', '${sendStatus.status}')`;
		this.result = pgdb.query(this.pg, this.sql);
        this.result.状态 == '成功' || (this.resData.状态 = '系统消息账单数据错误');
		this.result.状态 != '成功' || this.result.影响行数 || (this.resData.状态 = '系统消息账单增加失败');
		
		return this.resData;
		
	}
}

module.exports.run2 = function(body, pg, mo, redis, pg2) {
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

    if(req.type == '商品购物') {
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

let sendFormatting = (f, redis, message) => {

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