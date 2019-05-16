/**
 * 创建人:Coding Farmer_2207
 * 创建时间：2018-5-7 11:43:10
 * 创建内容：物流消息 （用户下单付款成功）

消息类型 = 订单消息
消息内容 = [{接收账号:'',接收姓名:'',订单编号:'',金额:'',商户类别:'',商品名称:'',订单id:'',订单销售id:''}]

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
    // f.消息类型 = "物流消息";
    // f.消息内容 =  [{'接收账号':'18327430511','接收姓名':'嗯嗯嗯','消息图标':'http://qqsdg.oss-cn-shenzhen.aliyuncs.com/manage/2018060115063612382.png','消息标题':'订单已发货','消息内容':'[薰衣草]薰衣草母鸡母鸡母鸡母鸡母鸡母鸡母鸡','商户类别':'商城','接收用户':'用户','订单id':'123123213213213'}];
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
    f.消息内容.forEach(mesdata => {
        /***************************************拼装消息体 start **************************************/
        //消息内容
        let mes = {};
        mes.title = mesdata.消息标题 || '';
        mes.content = mesdata.消息内容 || '';
        mes.integral = '';
        mes.img = mesdata.消息图标 || '';
        mes.id = mesdata.订单id ||'';
        mes.sellid = mesdata.订单销售id ||'';
        mes.type = f.消息类型 || '';
        mes.shop_type = mesdata.商户类别 || '';
        //消息体
        let meg = {};
        meg.msgId = uuid.v4() + '1';
        meg.sendId = '002';
        if (mesdata.接收用户 == '商家') {
            meg.receiveId = mesdata.接收账号 + '_商家';
        } else {
            meg.receiveId = mesdata.接收账号;
        }
        meg.sessionType = '物流消息';
        meg.msgType = '图文';
        meg.pushData = mesdata.消息标题 || '';
        meg.sendTime = f.time;
        meg.message = mes;
        /***************************************拼装消息体 end **************************************/
        //统一发送消息 返回：已接收/未接收
        let status = sendTradeMessage(f, redis, meg);
        //只有在消息未接收的情况下 才能判断是否失败 并返回给调用者    如果报错  计入异常日志文件
        let insertSQL = `INSERT INTO im_系统消息物流表 (消息id,接收者账号,接收者名称,会话类型,消息类型,推送标题,消息内容,发送时间,接收时间,状态,录入人,录入时间) 
                VALUES ('${meg.msgId}', '${meg.receiveId}', '${mesdata.接收姓名}', '${meg.sessionType}', '${meg.msgType}', '${meg.pushData}', '${JSON.stringify(mes)}', '${f.time}', '${status.time}', '${status.status}', 'admin', '${f.time}')`;
        let result = pgdb.query(pg, insertSQL).影响行数 || undefined;
        if (!result) {
            //计入文本日志
            logs.write('im_message_error', '消息插入物流消息表有误，消息内容:' + JSON.stringify(mes));
        }
    });
    data.状态 = '成功';
    return data;
}

/**
 * 发送订单系统消息
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