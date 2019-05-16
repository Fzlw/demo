/*
 * 创建人：Coding Farmer_1201
 * 创建内容：群发消息记录
 * 创建时间：2019-5-9
 * 创建版本: 1.1.0

func=group_groupMes
账号=555555
随机码=f797dad1126dd2de00d606232324d280
接收人=
接收人id=1111
消息类型=文本/图片/语音
消息内容=‘’
 */

var pgdb = require('../func/pgdb.js');
var share = require('./public/share.js');
var redisdb = require('../func/redisdb.js');

module.exports.run = function(body, pg, mo, redis, pg2) {
	
    let data = {};
    data.状态 = '成功';
   
    let f = {};
    f = body.receive;
    
    let sql = '';
    let result = '';
    
    middle(pg,f,data,body,redis);
    
	sql = `insert into 日志_非钱表(账号,时间,ip,类别,状态,录入人,录入时间,备注)values('${f.账号}','${body.date}','${body.ip}','群发消息记录','数据提交','系统','${body.date}','入参：${JSON.stringify(body)} 返回参数：${JSON.stringify(data)}')`;
	result = pgdb.query(pg, sql);
	if (result.状态 != '成功') {
		data.状态 = "网络异常，请稍后再试";
		return data;
	}
	
    return data;
    
}

function middle(pg,f,data,body,redis){
	let sql = '';
	let result = '';
  
  //获取时间
  f.时间 = body.date;
  //非空数据处理
    if(!f.账号){
    	data.状态 = '账号不能为空';
    	return data;
    }

    if(!f.随机码){
    	data.状态 = '随机码不能为空';
    	return data;
    }
   	
   	if(!f.接收人){
    	data.状态 = '接收人不能为空';
    	return data;
    }
    
    if(!f.接收人id){
      data.状态 = '接收人id不能为空';
      return data;
    }
    
    if(!f.消息类型){
    	data.状态 = '消息类型不能为空';
    	return data;
    }
    //校验消息是否合法
    var arr = ['文本','图片','语音'];
    if(!arr.includes(f.消息类型)){
      data.状态='该消息类型未被纳入，sorry';
      return data;
    }
    if(!f.消息内容){
    	data.状态 = '消息内容不能为空';
    	return data;
    }
    
    //处理消息类容中文字
    if(f.消息类型== "文本"){
       var reg =f.消息内容;
       reg =reg.replace(/\+/g," ");
       var reg1 = /[艹草贱傻婊日]{1}/g ;
       var reg2 = /(尼玛)|(你妈)|(你玛)|(sb)|(SB)|(Sb)|(sB)|(滚你妈)|(垃圾)|(傻b)|(傻B)|(婊子)|(你大爷)|(小姐)|(屌丝)|(妈卖批)|(脑残)|(你妹)/g ;
       reg =reg.replace(reg1,"***");
       f.消息内容 =reg.replace(reg2,"***");
    }
    //头部验证
    f.top = share.top(f.账号, f.随机码, pg);
    if (f.top.状态 != '成功') {
        data.状态 = f.top.状态;
        return data;
    } else if (f.top.会.出账 != '是') {
        data.状态 = '经系统检测到您有异常操作行为，功能暂停使用';
        return data;
    }  
    
  //这里使用redis防止 单用户 并发处理   往队列中插入一条数据 设置1秒有效时间
	let redis_meg = redis_time(redis, 1, 'group_createFlock' + f.账号);
	if (redis_meg.状态 != '成功') {
		data.状态 = '请不要重复点击';
		return data;
	}
	
	//数据存入数据库作记录
	sql=`INSERT INTO 群_群发消息记录表 ( 账号, 接收人, 接收人id, 消息类型, 消息内容, 状态, 录入人, 录入时间, 备注) VALUES `;
	var  sub = [f.账号,f.接收人,f.接收人id,f.消息类型,f.消息内容,'正常','系统',f.时间,''];
	var  res = pgdb.query(pg,getJoinFullSql(sql, 1),sub);
	if(res.状态 !='成功'){
	  data.状态='数据连接失败，请稍后重试#1';
	  return data;
	}
 
 if(res.影响行数 == 0){
   data.状态='数据记录失败，sorry';
   return data;
 }
	

	return data;


}


redis_time = (redis, time, values) => {
	let data = { '状态': '成功' };
	//选择子库
	if (redisdb.select(redis, 8) == false) {
		data.状态 = '网络异常';
		return data;
	}
	//插入key
	let add_key = redisdb.setnx(redis, values, values);
	if (add_key != 1) {
		data.状态 = '请勿重复提交';
		return data;
	}
	//给key设置过期时间
	let key_time = redisdb.expire(redis, values, Number(time) * 1);
	if (key_time != 1) {
		data.状态 = '网络异常';
		return data;
	}
	return data;
}


function getJoinFullSql(text, int) {
    if (typeof text != 'string') {
        throw new TypeError('text expects is string')
    }
    if (typeof int != 'number') {
        throw new TypeError('int expects an integer')
    }
    let str = '';
    const repval = text.repeat(int);
    const regex = new RegExp(',', 'g');
    const result = repval.match(regex);
    const count = !result ? 0 : (result.length + int);
    const meanVal = count / int;
    for (let i = 0; i < count; i++) {
        str += `, $${i + 1}`;
    }
    let sub = `(${str.substr(2)})`
    for (let i = 0; i < int - 1; i++) {
        const item = (i + 1) * meanVal;
        sub = sub.replace(`$${item},`, `$${item}),(`)
    }
    return `${text}${sub}`;
}