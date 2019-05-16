/*
 * 创建人：Coding Farmer_1201
 * 创建内容：群发消息记录列表
 * 创建时间：2019-5-9
 * 创建版本: 1.1.0

func=group_groupMes
账号=555555
随机码=f797dad1126dd2de00d606232324d280
页数=0
 */

var pgdb = require('../func/pgdb.js');
var moment = require('moment');
var share = require('./public/share.js');

module.exports.run = function(body, pg, mo, redis, pg2) {
	
    let data = {};
    data.状态 = '成功';
   
    let f = {};
    f = body.receive;
    
    let sql = '';
    let result = '';
    
    middle(pg,f,data,body,redis);
    
	sql = `insert into 日志_非钱表(账号,时间,ip,类别,状态,录入人,录入时间,备注)values('${f.账号}','${body.date}','${body.ip}','群发消息记录获取列表','数据提交','系统','${body.date}','入参：${JSON.stringify(body)} 返回参数：${JSON.stringify(data)}')`;
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
   	
    //头部验证
    f.top = share.top(f.账号, f.随机码, pg);
    if (f.top.状态 != '成功') {
        data.状态 = f.top.状态;
        return data;
    } else if (f.top.会.出账 != '是') {
        data.状态 = '经系统检测到您有异常操作行为，功能暂停使用';
        return data;
    }  
    
   
   if(!f.页数){
     f.页数 = 0;
   }
   //处理分页
   var pagenum = 10;
   var startnum = Number(f.页数)*pagenum;
	//读取数据库中群发记录数据
	sql=`select 接收人, 接收人id, 消息类型, 消息内容, 录入时间  from 群_群发消息记录表 where 账号=$1 and 状态='正常' order by 录入时间  desc offset ${startnum} limit 10`;
  var res = pgdb.query(pg,sql,[f.账号]).数据|| null;
  if(!res){
    data.状态='数据连接失败，请稍后重试';
    return data;
  }
  
  if(res.length !=0){
    for(var item of res){
      //获取消息人数
      var arr = (item.接收人id).split('_____GroupSend_____');
      item.接收人数 = arr.length;
	
      
      //处理显示时间
      item.录入时间 = moment(item.录入时间).format('MM月DD日 HH:mm');
     
    }
    
  }
  
  f.页数 = (Number(f.页数)+1).toString();
  
  data.列表 = res;
  data.页数 = f.页数; 
  
return;
}


