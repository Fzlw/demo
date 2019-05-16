/*
创建人:中报审
创建时间:2017-11-27 16:09:10
创建内容:订单详情通用api
 */

var pgdb = require('../func/pgdb.js');
var moment = require("moment");


class Bill {
	constructor(type, f, pg) {
		f == null ? this.f = {} : this.f = f;
		pg == null ? this.pg = {} : this.pg = pg;
		this.sql = "";
		this.result = '';
		this.return = {};
		this.data = {};
		this.a = [];
		this.b = {};
		this.c = {};
		this.d = {};
		console.log('type', type);
		switch (type) {
			case '查询交易类别':
				return this.checkType();
			case '查询充值中心':
				return this.checkRechargecenter();
			case '查询积分转让':
				return this.checkIntegral();
			case '查询积分充值':
				return this.checkIntegralRe();
			case '查询提现红利兑换':
				return this.checkWithdrawals();
			case '查询积分宝商金币':
				return this.checkshopconBao();
			case '查询油费':
				return this.checkOil();
			case '查询商品购物':
				return this.checkShop();
			case '查询商品购物待支付':
				return this.commodity_Unpaid_Bill();
			case '查询超级商家':
				return this.receivables_Details();
			case '查询抵扣':
				return this.dikou();
			case '查询全部':
				return this.checkAll();
			case '异常':
				return this.error();
			case '其他通用':
				return this.usual();
			case 'END':
				return this.end();
		}
	}
	error() {
		this.return.状态 = '无此记录';
		return this.return;
	}
	checkType() {
		this.sql = `select id,状态,交易类别 from 平_交易类别表 where 交易类别 = '${this.f.交易类别}'`;
		return pgdb.query(this.pg, this.sql);
	}
	checkRechargecenter() {
		this.sql = `select 充值类型,支付订单号,状态,说明,备注,round(总支付金额,2) as 消费金额,录入时间,
		一层支付方式 as 内部支付方式,二层支付方式 as 外部支付方式 from 平_话费流量支付表 where id = '${this.f.id}';`;
		this.result = pgdb.query(this.pg, this.sql);
		this.result.状态 != '成功'
			? this.return.状态 = this.result.状态
			: this.return.状态 = '成功'
		if (this.return.状态 != '成功') {
			return this.return;
		}
		if (this.result.数据.length == 0) {
			this.return.状态 = '无此记录';
			return this.return;
		}

		this.data = this.result.数据[0];

		this.b.业务名 = this.data.充值类型;
		this.b.金额 = this.data.消费金额;

		this.data.状态 == '已支付'
			? this.b.交易状态 = '交易成功'
			: this.b.交易状态 = this.data.状态

		!this.data.说明
			? this.c.说明 = ''
			: this.c.说明 = this.data.说明

		this.c.订单号 = this.data.支付订单号;

		!this.data.内部支付方式
			? this.c.支付方式 = ''
			: this.c.支付方式 = this.data.内部支付方式;

		!this.data.外部支付方式
			? this.c.支付方式 = ''
			: this.c.支付方式 = this.c.支付方式 + "+" + this.data.外部支付方式;

		this.c.时间 = this.result.数据[0].录入时间;
		this.d.状态 = '成功';
		let data = {
			状态: this.d.状态,
			列表: [{
				业务名: this.b.业务名,
				金额: this.b.金额,
				交易状态: this.b.交易状态
			},
			{
				说明: this.c.说明,
				订单号: this.c.订单号,
				备注: this.c.备注,
				支付方式: this.c.支付方式,
				时间: this.c.时间
			}]
		};
		this.return = data;
		console.log(this.return);
		return this.return;

	}
	checkIntegral() {
		this.sql = `select round(a.积分,2) as 转金额,a.交易类别,a.交易账户,a.说明,a.录入时间,a.备注,a.状态 as 交易状态, b.出入账号
		 from 平_账户表 as a LEFT JOIN 平_转让明细表 as b on a.关联id=b.id where a.关联id = '${this.f.id}' and a.账号 = '${this.f.账号}'`;
		this.result = pgdb.query(this.pg, this.sql);
		console.log(this.result);
		this.result.状态 != '成功'
			? this.return.状态 = this.result.状态
			: this.return.状态 = '成功'
		if (this.return.状态 != '成功') {
			return this.return;
		}
		if (this.result.数据.length == 0) {
			this.return.状态 = '无此记录';
			return this.return;
		}

		this.data = this.result.数据[0];

		this.b.业务名 = '转让积分';
		this.b.金额 = this.data.转金额;
		this.b.交易状态 = '交易成功';

		!this.data.说明
			? this.c.说明 = ''
			: this.c.说明 = this.data.说明;

		this.c.支付方式 = this.data.交易账户;
		this.c.入账账户 = this.data.出入账号;

		!this.data.备注
			? this.c.备注 = ''
			: this.c.备注 = this.data.备注;

		this.c.时间 = this.data.录入时间;
		this.d.状态 = '成功';
		let data = {
			状态: this.d.状态,
			列表: [{
				业务名: this.b.业务名,
				金额: this.b.金额,
				交易状态: this.b.交易状态
			},
			{
				入账账户: this.c.入账账户,
				说明: this.c.说明,
				备注: this.c.备注,
				支付方式: this.c.支付方式,
				时间: this.c.时间
			}]
		};
		this.return = data;
		console.log(this.return);
		return this.return;

	}
	checkIntegralRe() {
		this.sql = `select b.类别,b.赠送积分,round(b.积分, 2) AS 充值金额,A .状态,A .说明,A .支付订单号,
		A .一层支付方式 AS 内部支付方式,A .二层支付方式 AS 外部支付方式,a.备注,A .录入时间 AS 购买时间 
		from 平_支付订单表 a inner join 平_积分充值订单表 b on a.商户订单号 = b.商户订单号 where a.id='${this.f.id}'`;
		this.result = pgdb.query(this.pg, this.sql);
		this.result.状态 != '成功'
			? this.return.状态 = this.result.状态
			: this.return.状态 = '成功'
		if (this.return.状态 != '成功') {
			return this.return;
		}
		if (this.result.数据.length == 0) {
			this.return.状态 = '无此记录';
			return this.return;
		}

		this.data = this.result.数据[0];
		this.b.业务名 = '积分充值';
		this.b.金额 = this.data.充值金额;

		this.data.状态 == '已支付'
			? this.b.交易状态 = '交易成功'
			: this.b.交易状态 = this.data.状态;

		!this.data.说明
			? this.c.说明 = ''
			: this.c.说明 = this.data.说明

		this.c.订单号 = this.data.支付订单号;

		!this.data.赠送积分
			? this.c.赠送积分 = ''
			: this.c.赠送积分 = Number(this.data.赠送积分).toFixed(2);

		!this.data.内部支付方式
			? this.c.支付方式 = ''
			: this.c.支付方式 = this.data.内部支付方式;

		!this.data.外部支付方式
			? this.c.支付方式 = this.c.支付方式
			: this.c.支付方式 = this.c.支付方式 + "+" + this.data.外部支付方式

		this.c.时间 = this.data.购买时间;
		let data = {
			状态: this.d.状态,
			列表: [{
				业务名: this.b.业务名,
				金额: this.b.金额,
				交易状态: this.b.交易状态
			},
			{
				说明: this.c.说明,
				订单号: this.c.订单号,
				备注: this.c.备注,
				支付方式: this.c.支付方式,
				时间: this.c.时间
			}]
		};
		this.return = data;
		console.log(this.return);
		return this.return;

	}
	checkWithdrawals() {
		this.sql = `select a.id,b.交易类别,round(b.积分, 2) AS 提现金额,a.审批状态,b .说明,a.转入银行 as 银行名称,a.转入银行账号 as 银行账户,a.备注,a .录入时间
		   from 平_兑换表 a inner join 平_账户表 b on a.账号 = b.账号 where a.id = b.关联id and a.id='${this.f.id}'`;
		this.result = pgdb.query(this.pg, this.sql);
		console.log(this.result);
		this.result.状态 != '成功'
			? this.return.状态 = this.result.状态
			: this.return.状态 = '成功'
		if (this.return.状态 != '成功') {
			return this.return;
		}
		if (this.result.数据.length == 0) {
			this.return.状态 = '无此记录';
			return this.return;
		}

		this.data = this.result.数据[0];

		this.b.业务名 = this.f.交易类别;
		this.b.金额 = this.data.提现金额;
		this.b.交易状态 = this.data.审批状态;

		!this.data.审批状态
			? this.c.说明 = ''
			: this.c.说明 = this.data.说明;

		this.c.订单号 = '';
		this.c.备注 = '';
		this.c.支付方式 = '红利';
		this.c.时间 = this.data.录入时间;
		this.d.状态 = '成功';
		let data = {
			状态: this.d.状态,
			列表: [{
				业务名: this.b.业务名,
				金额: this.b.金额,
				交易状态: this.b.交易状态
			},
			{
				银行名称: this.data.银行名称,
				银行账户: this.formatBankNumber(this.data.银行账户),
				说明: this.c.说明,
				订单号: this.c.订单号,
				备注: this.c.备注,
				支付方式: this.c.支付方式,
				时间: this.c.时间
			}]
		};
		this.return = data;
		console.log(this.return);
		return this.return;

	}
	checkshopconBao() {
		this.sql = `select Round(积分,2) as 提现金额, 交易类别, 交易账户, 说明,
		 录入时间, 备注, 状态 as 交易状态 from 平_账户表 where id = '${this.f.id}'`;
		this.result = pgdb.query(this.pg, this.sql);
		this.result.状态 != '成功'
			? this.return.状态 = this.result.状态
			: this.return.状态 = '成功'
		if (this.return.状态 != '成功') {
			return this.return;
		}
		if (this.result.数据.length == 0) {
			this.return.状态 = '无此记录';
			return this.return;
		}

		this.data = this.result.数据[0];

		!this.data.说明
			? this.b.业务名 = this.f.交易类别
			: this.b.业务名 = this.data.说明;

		!this.data.说明
			? this.c.说明 = ''
			: this.c.说明 = this.data.说明;

		this.b.金额 = this.data.提现金额;
		this.b.交易状态 = '交易成功';
		this.c.支付方式 = this.data.交易账户;

		!this.data.备注
			? this.c.备注 = ''
			: this.c.备注 = this.data.备注;

		this.c.时间 = this.data.录入时间;
		this.c.订单号 = '';
		this.d.状态 = '成功';
		let data = {
			状态: this.d.状态,
			列表: [{
				业务名: this.b.业务名,
				金额: this.b.金额,
				交易状态: this.b.交易状态
			},
			{
				说明: this.c.说明,
				订单号: this.c.订单号,
				备注: this.c.备注,
				支付方式: this.c.支付方式,
				时间: this.c.时间
			}]
		};
		this.return = data;
		console.log(this.return);
		return this.return;


	}
	checkOil() {
		this.sql = `select Round(a.积分,2) as 积分, a.余额, a.交易账户, a.说明, a.录入时间, a.备注, a.状态, b.一层支付方式 as 内部支付方式,
		 b.二层支付方式 as 外部支付方式, b.支付订单号, b.状态, b.总金额 from 平_账户表 a left join 平_支付订单表 b on a.关联id=b.id where a.id='${this.f.id}'`;
		this.result = pgdb.query(this.pg, this.sql);
		this.result.状态 != '成功'
			? this.return.状态 = this.result.状态
			: this.return.状态 = '成功'
		if (this.return.状态 != '成功') {
			return this.return;
		}
		if (this.result.数据.length == 0) {
			this.return.状态 = '无此记录';
			return this.return;
		}

		this.data = this.result.数据[0];

		this.b.业务名 = this.data.说明;
		this.b.金额 = this.data.积分;
		this.b.交易状态 = '交易成功';
		this.c.说明 = this.data.说明;

		!this.data.内部支付方式
			? this.c.支付方式 = ''
			: this.c.支付方式 = this.data.外部支付方式

		!this.data.外部支付方式
			? this.c.支付方式 = this.c.支付方式
			: this.c.支付方式 = this.data.外部支付方式

		!this.data.内部支付方式 && !this.data.外部支付方式
			? this.c.支付方式 = this.data.交易账户
			: this.c.支付方式 = ''

		!this.data.备注
			? this.c.备注 = ''
			: this.c.备注 = this.data.备注;

		!this.data.支付订单号
			? this.c.订单号 = ''
			: this.c.订单号 = this.data.支付订单号;

		this.c.时间 = this.data.录入时间;
		this.d.状态 = '成功';
		let data = {
			状态: this.d.状态,
			列表: [{
				业务名: this.b.业务名,
				金额: this.b.金额,
				交易状态: this.b.交易状态
			},
			{
				说明: this.c.说明,
				订单号: this.c.订单号,
				备注: this.c.备注,
				支付方式: this.c.支付方式,
				时间: this.c.时间
			}]
		};
		this.return = data;
		console.log(this.return);
		return this.return;

	}
	checkShop() {
		this.sql = `SELECT Round(a.积分,2) AS 总金额, b.状态, b.说明, b.一层支付方式, b.二层支付方式, b.支付订单号,
		 b.录入时间, b.备注 FROM 平_账户表 a left join 平_支付订单表 b on a.关联id = b.id WHERE a.关联id = '${this.f.id}'`;
		this.result = pgdb.query(this.pg, this.sql);
		this.result.状态 != '成功'
			? this.return.状态 = this.result.状态
			: this.return.状态 = '成功'
		if (this.return.状态 != '成功') {
			return this.return;
		}
		if (this.result.数据.length == 0) {
			this.return.状态 = '无此记录';
			return this.return;
		}

		this.data = this.result.数据[0];

		this.b.业务名 = '商品购物';
		this.b.金额 = Number(this.data.总金额).toFixed(2);
		this.result.状态 == '已支付'
			? this.b.交易状态 = '交易成功'
			: this.b.交易状态 = this.result.状态;

		!this.data.说明
			? this.c.说明 = ''
			: this.c.说明 = this.data.说明;

		!this.data.一层支付方式
			? this.c.支付方式 = ''
			: this.c.支付方式 = this.data.一层支付方式;

		!this.data.二层支付方式
			? this.c.支付方式 = this.c.支付方式
			: this.c.支付方式 = this.data.二层支付方式;

		!this.data.备注
			? this.c.备注 = ''
			: this.c.备注 = this.data.备注;

		!this.data.支付订单号
			? this.c.订单号 = ''
			: this.c.订单号 = this.data.支付订单号;

		this.c.时间 = this.data.录入时间;
		this.d.状态 = '成功';
		let data = {
			状态: this.d.状态,
			列表: [{
				业务名: this.b.业务名,
				金额: this.b.金额,
				交易状态: this.b.交易状态
			},
			{
				说明: this.c.说明,
				订单号: this.c.订单号,
				备注: this.c.备注,
				支付方式: this.c.支付方式,
				时间: this.c.时间
			}]
		};
		this.return = data;
		console.log(this.return);
		return this.return;
	}
	commodity_Unpaid_Bill() {
		this.sql = `SELECT Round(a.积分,2) AS 总金额, b.状态, b.说明, b.一层支付方式, b.二层支付方式, b.支付订单号,
		b.录入时间, b.备注 FROM 平_账户表 a left join 平_支付订单表 b on a.关联id = b.id WHERE a.关联id = '${this.f.id}'`;
		this.result = pgdb.query(this.pg, this.sql);
		this.result.状态 != '成功'
			? this.return.状态 = this.result.状态
			: this.return.状态 = '成功'
		if (this.return.状态 != '成功') {
			return this.return;
		}
		if (this.result.数据.length == 0) {
			this.return.状态 = '无此记录';
			return this.return;
		}

		this.data = this.result.数据[0];
		this.b.业务名 = '商品购物';
		this.b.金额 = Number(this.data.总金额).toFixed(2);
		this.b.交易状态 = this.result.状态;

		!this.data.说明
			? this.c.说明 = ''
			: this.c.说明 = this.data.说明;

		!this.data.一层支付方式
			? this.c.支付方式 = ''
			: this.c.支付方式 = this.data.一层支付方式;

		!this.data.二层支付方式
			? this.c.支付方式 = this.c.支付方式
			: this.c.支付方式 = this.data.二层支付方式;

		!this.data.备注
			? this.c.备注 = ''
			: this.c.备注 = this.data.备注;

		!this.data.支付订单号
			? this.c.订单号 = ''
			: this.c.订单号 = this.data.支付订单号;

		this.c.时间 = this.data.录入时间;
		this.d.状态 = '成功';
		let data = {
			状态: this.d.状态,
			列表: [{
				业务名: this.b.业务名,
				金额: this.b.金额,
				交易状态: this.b.交易状态
			},
			{
				说明: this.c.说明,
				订单号: this.c.订单号,
				备注: this.c.备注,
				支付方式: this.c.支付方式,
				时间: this.c.时间
			}]
		};
		this.return = data;
		console.log(this.return);
		return this.return;
	}
	checkAll() {
		this.sql = `SELECT Round(a.积分,2) AS 总金额, b.状态, b.说明, b.一层支付方式, b.二层支付方式, b.支付订单号,
		b.录入时间, b.备注 FROM 平_账户表 a left join 平_支付订单表 b on a.关联id = b.id WHERE a.关联id = '${this.f.id}'`;
		this.result = pgdb.query(this.pg, this.sql);
		console.log(this.result);
		this.result.状态 != '成功'
			? this.return.状态 = this.result.状态
			: this.return.状态 = '成功'
		if (this.return.状态 != '成功') {
			return this.return;
		}
		if (this.result.数据.length == 0) {
			this.return.状态 = '无此记录';
			return this.return;
		}
		this.data = this.result.数据[0];

		for (var value of Object.keys(this.data)) {
			console.log(this.data[value]);
			if (this.data[value] == null) {
				this.data[value] = ''
			}
		}

		console.log(this.data);

		if (this.data.说明 == '扫码支付') {
			this.b.业务名 = '支付宝充值';
			this.b.交易状态 = '已支付';
			this.c.说明 = '支付宝扫码充值';
			this.c.支付方式 = '支付宝';
			this.c.备注 = '支付宝扫码充值';
			this.c.订单号 = this.data.支付订单号;
		} else {
			this.b.业务名 = this.data.说明;
			this.b.交易状态 = '交易成功';
			this.c.说明 = this.data.说明;
		}

		this.b.金额 = Number(this.data.总金额).toFixed(2);

		!this.data.一层支付方式
			? this.c.支付方式 = ''
			: this.c.支付方式 = this.data.一层支付方式

		!this.data.二层支付方式
			? this.c.支付方式 = this.c.支付方式
			: this.c.支付方式 = this.c.支付方式 + "+" + this.data.二层支付方式

		!this.data.一层支付方式 && !this.data.二层支付方式
			? this.c.支付方式 = this.data.交易账户
			: this.c.支付方式 = this.c.支付方式;

		!this.data.备注
			? this.c.备注 = ''
			: this.c.备注 = this.data.备注;

		!this.data.支付订单号
			? this.c.订单号 = ''
			: this.c.订单号 = this.data.支付订单号;

		this.c.时间 = this.data.录入时间;
		this.d.状态 = '成功';
		console.log(this.b);
		let data = {
			状态: this.d.状态,
			列表: [{
				业务名: this.b.业务名,
				金额: this.b.金额,
				交易状态: this.b.交易状态
			},
			{
				说明: this.c.说明,
				订单号: this.c.订单号,
				备注: this.c.备注,
				支付方式: this.c.支付方式,
				时间: this.c.时间
			}]
		};
		this.return = data;
		console.log(this.return);
		return this.return;


	}
	receivables_Details() {
		this.sql = `"select round(a.收款金额,2) as 收款金额,a.收款唯一id,a.支付平台 as 支付平台,a.说明,a.录入时间,a.收款备注,a.转账订单号,
		a.支付订单号,a.状态 as 交易状态,b.唯一id,Round(b.红利账户,2) as 红利账户,Round(b.积分账户,2) as 积分账户
		 from 平_收款记录表 a inner join 平_会员表 b on a.收款唯一id = b.唯一id where a.关联id  = '${this.f.id}'`;
		this.result = pgdb.query(this.pg, this.sql);
		this.result.状态 != '成功'
			? this.return.状态 = this.result.状态
			: this.return.状态 = '成功'
		if (this.return.状态 != '成功') {
			return this.return;
		}
		if (this.result.数据.length == 0) {
			this.return.状态 = '无此记录';
			return this.return;
		}

		this.data = this.result.数据[0];

		this.b.业务名 = this.data.支付平台;
		this.b.金额 = this.data.收款金额;

		this.result.状态 == '已支付'
			? this.b.交易状态 = '交易成功'
			: this.b.交易状态 = this.result.状态;

		!this.data.说明
			? this.c.说明 = ''
			: this.c.说明 = this.data.说明;

		!this.data.红利账户
			? this.c.入账账户 = '红利账户'
			: this.c.入账账户 = this.c.入账账户;

		!this.data.积分账户
			? this.c.入账账户 = '积分账户'
			: this.c.入账账户 = this.c.入账账户;

		!this.data.收款备注
			? this.c.备注 = ''
			: this.c.备注 = this.data.收款备注;

		!this.data.支付订单号
			? this.c.订单号 = ''
			: this.c.订单号 = this.data.支付订单号;

		this.c.时间 = this.data.录入时间;
		this.d.状态 = '成功';
		let data = {
			状态: this.d.状态,
			列表: [{
				业务名: this.b.业务名,
				金额: this.b.金额,
				交易状态: this.b.交易状态
			},
			{
				说明: this.c.说明,
				订单号: this.c.订单号,
				备注: this.c.备注,
				支付方式: this.c.支付方式,
				时间: this.c.时间
			}]
		};
		this.return = data;
		console.log(this.return);
		return this.return;
	}
	usual() {
		this.sql = `SELECT Round(a.积分,2) AS 总金额, b.状态, b.说明, b.一层支付方式, b.二层支付方式, b.支付订单号,
		b.录入时间, b.备注 FROM 平_账户表 a left join 平_支付订单表 b on a.关联id = b.id WHERE a.关联id = '${this.f.id}'`;
		this.result = pgdb.query(this.pg, this.sql);
		this.result.状态 != '成功'
			? this.return.状态 = this.result.状态
			: this.return.状态 = '成功'
		if (this.return.状态 != '成功') {
			return this.return;
		}
		if (this.result.数据.length == 0) {
			this.return.状态 = '无此记录';
			return this.return;
		}

		this.data = this.result.数据[0];

		this.b.业务名 = this.f.交易类别;
		this.b.金额 = this.data.总金额;
		this.b.交易状态 = this.data.状态;

		!this.data.说明
			? this.c.说明 = ''
			: this.c.说明 = this.data.说明;

		!this.data.一层支付方式
			? this.c.支付方式 = ''
			: this.c.支付方式 = this.data.一层支付方式;

		!this.data.二层支付方式
			? this.c.支付方式 = this.c.支付方式
			: this.c.支付方式 = this.data.二层支付方式;

		!this.data.备注
			? this.c.备注 = ''
			: this.c.备注 = this.data.备注;

		!this.data.支付订单号
			? this.c.订单号 = ''
			: this.c.订单号 = this.data.支付订单号;

		this.c.时间 = this.data.录入时间;
		this.d.状态 = '成功';
		let data = {
			状态: this.d.状态,
			列表: [{
				业务名: this.b.业务名,
				金额: this.b.金额,
				交易状态: this.b.交易状态
			},
			{
				说明: this.c.说明,
				订单号: this.c.订单号,
				备注: this.c.备注,
				支付方式: this.c.支付方式,
				时间: this.c.时间
			}]
		};
		this.return = data;
		console.log(this.return);
		return this.return;

	}
	dikou() {
		this.sql = `SELECT Round(a.积分,2) AS 总金额, b.执行状态 as 状态, b.说明, b.商户订单号 as 支付订单号,b.交易类别,b.交易账户,
		b.录入时间, b.备注 FROM 平_账户表 a left join 平_服务号订单表 b on a.关联id = b.id WHERE a.关联id = '${this.f.id}'`;
		this.result = pgdb.query(this.pg, this.sql);
		this.result.状态 != '成功'
			? this.return.状态 = this.result.状态
			: this.return.状态 = '成功'
		if (this.return.状态 != '成功') {
			return this.return;
		}
		if (this.result.数据.length == 0) {
			this.return.状态 = '无此记录';
			return this.return;
		}

		this.data = this.result.数据[0];

		this.b.业务名 = this.data.交易类别;
		this.b.金额 = this.data.总金额;
		this.b.交易状态 = this.data.状态;

		!this.data.说明
			? this.c.说明 = ''
			: this.c.说明 = this.data.说明;

		!this.data.备注
			? this.c.备注 = ''
			: this.c.备注 = this.data.备注;

		!this.data.支付订单号
			? this.c.订单号 = ''
			: this.c.订单号 = this.data.支付订单号;

		this.c.时间 = this.data.录入时间;
		this.d.状态 = '成功';
		let data = {
			状态: this.d.状态,
			列表: [{
				业务名: this.b.业务名,
				金额: this.b.金额,
				交易状态: this.b.交易状态
			},
			{
				说明: this.c.说明,
				订单号: this.c.订单号,
				备注: this.c.备注,
				支付方式: this.data.交易账户,
				时间: this.c.时间
			}]
		};
		this.return = data;
		console.log(this.return);
		return this.return;

	}
	formatBankNumber(bankNumber) {
		return bankNumber.substr(0, 4) + "********" + bankNumber.substr(-4);
	}
	end() {
		this.return = this.f;
		return this.return;
	}
}

module.exports.run = function (body, pg, mo, redis) {
	console.log(body);
	var data = {};
	var p = {};
	var f = body.receive;
	f.时间 = moment().format('YYYY-MM-DD HH:mm:ss');
	f.is_having = false; //是否有记录在交易类别表

	var ResultA = new Bill('查询交易类别', f, pg);
	if (ResultA.数据.length == 0) {
		f.业务名 = f.交易类别;
	} else {
		f.业务名 = ResultA.数据[0].交易类别;
	}

	console.log(f.业务名);

	switch (f.业务名) {
		case '充值中心':
			return new Bill("查询充值中心", f, pg);
			break;
		case '积分转让':
			return new Bill("查询积分转让", f, pg);
			break;
		case '积分充值':
			return new Bill("查询积分充值", f, pg);
			break;
		case '提现':
			return new Bill("查询提现红利兑换", f, pg);
			break;
		case '红利兑换':
			return new Bill("查询提现红利兑换", f, pg);
			break;
		case '积分宝':
			return new Bill("查询积分宝商金币", f, pg);
			break;
		case '商金币':
			return new Bill("查询积分宝商金币", f, pg);
			break;
		case '油费':
			return new Bill("查询油费", f, pg);
			break;
		case '商品购物':
			return new Bill("查询商品购物", f, pg);
			break;
		case '商品购物待支付':
			return new Bill("查询商品购物待支付", f, pg);
			break;
		case '抵扣':
			return new Bill("查询抵扣", f, pg);
			break;
		case '全部':
			return new Bill("查询全部", f, pg);
			break;
		case '超级商家':
			return new Bill("查询超级商家", f, pg);
			break;
		case '' || null || undefined:
			return new Bill("异常", f, pg);
			break;
		default:
			return new Bill("其他通用", f, pg);
			break;
	}

}


