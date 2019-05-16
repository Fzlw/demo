/**
 * 创建人:@anime
 * 创建时间：2018-5-8 15:36:17
 * 创建内容：系统群发/单发消息 油站专属
 */

/**
 * 测试数据
func=systemMessage
title=标题
content=内容
img=图片路径
url=http://192.168.0.210:8080/interface/1499248820629.html 路径
msgType＝文本/图文
group=用户/商家/个人
receiveId=123  接收人账号
 */

var web_im = require('../func/web_im.js');
var pgdb = require('../func/pgdb.js');
var moment = require("moment");
var uuid = require('uuid');
var config = require('../func/config.js');
var conf = config.get('app');

var redisdb = require('../func/redisdb.js');

module.exports.run = function (f, pg, mo, redis, pg2) {
    let data = {};
    data.状态 = '成功';
    if (!f.title) {
        data.状态 = 'title不能为空';
        return data;
    }
    if (!f.msgType) {
        data.状态 = 'msgType不能为空';
        return data;
    }
    if (!f.group) {
        data.状态 = 'group不能为空';
        return data;
    } else if (f.group == '个人' && !f.receiveId) {
        data.状态 = 'receiveId不能为空';
        return data;
    }

    /*
     1.拼接【消息内容】
     */
    let meg = {};
    if (f.msgType == '文本') {
        meg = {
            text: f.title,
            content: f.content
        };
    }
    if (f.msgType == '图文') {
        meg = {
            img: f.img,
            title: f.title,
            content: f.content,
            url: f.url
        };
    }
	if (f.msgType == '购物') {
		meg = {
            img: f.img,
            title: f.title,
            content: f.content,
            explain: f.explain
        };
	}

    try {
        f.megStr = JSON.stringify(meg);
    }catch (e) {
        console.log('数据格式出错', e.message);
    }

    /*
     2.系统消息数据入库
     */
    //新消息id
    f.msgId = uuid.v4();
    //当前时间
    f.time = moment().format('YYYY-MM-DD HH:mm:ss');

    //区别系统消息与系统单发
    let sysFlag = '系统群发';
    if (f.group == '个人') {sysFlag = '系统单发';}
    let sql = `INSERT INTO im_油站系统消息内容表(消息id, 会话类型, 消息类型, 消息内容, 发送时间, 发送群体, 状态, 录入人, 录入时间, 备注)
        VALUES ('${f.msgId}','${sysFlag}','${f.msgType}','${f.megStr}','${f.time}','${f.group}','正常','系统','${f.time}','')`;
    let result = pgdb.query(pg, sql);


    /*
     3.给在线和离线的用户发送系统消息
     */
    if (result.影响行数 != 1) {
        data.状态 = '消息发送失败';
        return data;
    } else {
        let res = {
            sendId: '001',
            msgId: f.msgId,
            sessionType: '系统消息',
            msgType: f.msgType,
            message: meg,
            pushData: '[系统消息]' + f.title,
            sendTime: f.time
        };
        /*
            ###################系统单发#############################
         */
        if (sysFlag == '系统单发') {
            res.receiveId = f.receiveId;
            let receiverOnline = web_im.get_online(redis, f.receiveId);
            //========在线==========
            if (receiverOnline.code == 1) {
                let socket = web_im.find_socket(receiverOnline.socketid);
                if (socket == null) {
                    //如果找不到就尝试发布频道从其他进程的socket中寻找socket对象并发送消息
                    redisdb.publish(redis, conf.redis.web_imChannelList[1], JSON.stringify(res));
                } else {
                    //找到立马发送在线消息
                    web_im.send_system(socket, JSON.stringify(res));
                }
                var isStatus = '已接收';
                var receTime = f.time;
            } else { //=========离线=========
                var isStatus = '未接收';
                var receTime = '';
            }

            //系统消息接收表入库
            let sql = `INSERT INTO im_油站系统消息接收表 (接收者账号, 会话类型, 消息类型, 消息id, 状态, 接收时间,录入人,录入时间)
                       VALUES ('${f.receiveId}', '系统单发', '${f.msgType}', '${f.msgId}', '${isStatus}', '${receTime}','系统','${receTime}')`;
            let result = pgdb.query(pg, sql);
            if (result.影响行数 != 1) {
                data.状态 = '消息发送失败2';
            }

        }
        /*
            ####################系统群发#############################
         */
        if (sysFlag == '系统群发') {
            //获取Redis中目前所有在线的用户socket对象
            let redisKeys = redisdb.getAll(redis);
            let sql = `INSERT INTO im_油站系统消息接收表 (接收者账号, 会话类型, 消息类型, 消息id, 状态, 接收时间,录入人,录入时间) VALUES`;
            let sql2 = ``;
            
            for (let i = 0; i < redisKeys.length; i++) {
                let key = redisKeys[i];
                //筛选group
                let userid = key + '_用户';
                let user = userid.split('_');
                if (f.group != '所有') {
                    if (user[1] != '油站') continue;
                } else {
                    //去除客服
                    if (user[1] == 'service') continue;
                }
                console.log("#############################开始发送#############################");
                let online = web_im.get_online(redis, key);
                //========在线==========
                if (online.code == 1) {
                    //若在线,则查找socket对象
                    let socket = web_im.find_socket(online.socketid);
                    res.receiveId = key;
                    if (socket == null) {
                        //如果找不到就尝试发布频道从其他进程的中寻找socket对象并发送消息
                        redisdb.publish(redis, conf.redis.web_imChannelList[1], JSON.stringify(res));
                    } else {
                        //找到立马发送在线消息
                        web_im.send_system(socket, JSON.stringify(res));
                    }
                    var status = '已接收';
                    var receiveTime = f.time;
                } else { //=========离线,防止期间用户下线===========
                    var status = '未接收';
                    var receiveTime = '';
                }
                //系统消息接收表入库
                sql2 += ` ('${key}', '系统群发', '${f.msgType}', '${f.msgId}', '${status}', '${receiveTime}','系统','${f.time}'),`;
                //sql性能问题解决 防止一次性插入多条数据导致进程卡死 每100条提交一次数据
                if(i%100 == 0){
                    sql2 = sql2.substr(0, sql2.length - 1);
                    let result = pgdb.query(pg, sql+sql2);
                    if(result.状态 != '成功'){
                        console.log('sql语句报错了');
                    }else{
                        sql2 = ``;
                    }
                }
            }
            if(sql2){
                sql2 = sql2.substr(0, sql2.length - 1);
                let result = pgdb.query(pg, sql+sql2);
                if(result.状态 != '成功'){
                    console.log('报错了');
                }else{
                    sql2 = ``;
                }
            }
        }
    }

    return data;

};
