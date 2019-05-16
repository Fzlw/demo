/**
func=singleChat
receiveId=15680800517
random=1
sendId=123
sendName=name
message={\"text\":\"sadf\"}
msgType=文本
msgIdFse=aaaaaaaaa
 */

var web_im = require('../func/web_im.js');
var pgdb = require('../func/pgdb.js');
var config = require('../func/config.js');
var moment = require("moment");
var uuid = require('uuid');
var conf = config.get('app');

var redisdb = require('../func/redisdb.js');

module.exports.run = function (body, pg, mo, redis, pg2) {

    //##############################业务代码###############################
    let f = body.receive;
    let res = {};
    if (!f.sendId) {
        res.msg = '发送人账号不能为空';
        return res;
    }
    if (!f.random) {
        res.msg = '发送人随机码不能为空';
        return res;
    }
    if (!f.receiveId) {
        res.msg = '接收人账号不能为空';
        return res;
    }
    if (!f.msgType) {
        res.msg = '消息类型不能为空';
        return res;
    }
    if (!f.message) {
        res.msg = '发送内容不能为空';
        return res;
    }

    if(!f.msgIdFse){
        res.msg = 'msgIdFse不能为空';
        return res;
    }
    //新消息id
    f.msgId = uuid.v4();
    //当前时间
    f.time = moment().format('YYYY-MM-DD HH:mm:ss');

    //如果没有认证则先进行认证
    // let result = web_im.set_online(redis,f.sendId,body.socket.id,'认证时间：'+time,60);

    //获取用户昵称、头像信息
    selUserInfo(pg, f);

    //封装消息对象
    let message = spliceMessage(f);
    let messageStr = JSON.stringify(message);



    //##############################业务代码###############################

    //检查聊天对象是否在线
    let online = web_im.get_online(redis, f.receiveId);

    let callParam = {};
    callParam.msg = '发送成功';
    if (online.code == 1) {
	console.log('===================longqi post 单聊====================')
        //若在线,则查找socket对象
        let socket = web_im.find_socket(online.socketid);

        if (socket == null) {

            //如果找不到就尝试发布频道从其他进程的socket中寻找socket对象
            redisdb.publish(redis, conf.redis.web_imChannelList[0], messageStr);

        } else {
            //发送私聊消息
            web_im.send_message(socket, messageStr);

        }

    } else {
        //若不在线,则直接存表
        let sendId = message.sendId + "_"; //普通用户: 13344445555; 商家用户: 13344445555_商家; 客服: 13344445555_service
        let sendIds = sendId.split("_");
        let receiveId = message.receiveId + "_";
        let receiveIds = receiveId.split("_");
        let table = '';
        if (sendIds[1] == 'service' || receiveIds[1] == 'service') { //如果是客服,则从客服表查询离线消息
            table = 'im_客服表';
        } else { //如果是非客服,则从单聊查询离线消息
            table = 'im_单聊表';
        }
        let res = offLineMessage(pg, message, table);
        if (!res || res != 1) {
            callParam.msg = '发送失败';
        }
    }

    //封装用户发送信息后,回调给前端的参数
    callParam.msgId = f.msgId;
    callParam.receiveId = f.receiveId;
    callParam.sendTime = f.time;
    callParam.msgIdFse = f.msgIdFse;
    return callParam;
};

/**
 * 发送离线消息
 * @param pg
 * @param f
 * @returns {*|undefined}
 */
offLineMessage = (pg, f, table) => {

    let message = JSON.stringify(f.message);
    let sql = `INSERT INTO ${table} (消息id, 发送者, 发送者名称, 接收者, 接收者名称, 会话类型, 消息类型, 消息内容, 发送时间, 接收时间, 签收id, 状态, 录入人, 录入时间)
               VALUES ('${f.msgId}','${f.sendId}','${f.sendName}','${f.receiveId}','${f.receiveName}','单聊','${f.msgType}','${message}','${f.sendTime}','','','未接收','系统','${f.sendTime}')`;
    let res = pgdb.query(pg, sql).影响行数 || undefined;

    return res;
}


/**
 * 用户接收消息,拼装消息体回调给前端
 * @param body
 * @returns {{}}
 */
spliceMessage = f => {

    // 处理消息体内容(文本/图片/语音)
    let mes = {};
    if (f.msgType == '文本') {
        mes.text = f.message.replace(/'/g, "''");
    } else if (f.msgType == '图片') {
        let str = f.message;        //var str = {img:"4444",url:"44444",extra:"44444444"};
        let obj = {};
        try {
            obj = eval("(" + str + ")");  //img太长 用JSON.parse()会转Object失败
            mes.url = obj.url;
            mes.img = obj.img;
            mes.extra = obj.extra;
        } catch (e) {
            console.log('图片解析出错：', e.message);
        }

    } else if (f.msgType == '语音') {
        mes.voice = f.message;
    } else {
        let res = {};
        res.code = -2;
        res.msg = '消息类型出错';
        body.ack(res);
        return;
    }

    // 消息体
    let meg = {};
    if(f.msgType == '文本'){
        meg.pushData = f.message.replace(/'/g,"''");
    }else if(f.msgType == '图片'){
        meg.pushData = '[图片]';
    }else if(f.msgType == '语音'){
        meg.pushData = '[语音]';
    }

    meg.msgId = f.msgId; 	//新消息id
    meg.sendId = f.sendId; // 发送人
    meg.receiveId = f.receiveId; // 接收人
    meg.sessionType = '单聊'; // 类别
    meg.msgType = f.msgType; // 例如：图文/文本
    meg.sendTime = f.time; //当前时间
    meg.message = mes; //消息内容
    meg.extra = ''; //附加内容-备用

    meg.sendName = f.sendName; //发送者名称
    meg.portrait = f.portrait; //发送者头像
    meg.receiveName = f.receiveName; //接收者名称
    meg.receivePortrait = f.receivePortrait; //接收者头像


    return meg;

}


/**
 * 根据账号查询发送人和接收人信息（主要为PC客户端使用）
 * @param pg
 * @param message
 * @returns {*}
 */
selUserInfo = (pg, message) => {

    let f = message;

    //昵称、头像信息（客服默认头像）
    let sql = '',record = {};
    //-----发送者------
    let targetSend = f.sendId + '_';  //处理买家用户没有'_'标识
    let sendids =  targetSend.split("_");
    if (sendids[1] == 'service') {  //客服
        sql  = `SELECT 昵称 FROM 客_客服表 WHERE 账号 = '${sendids[0]}'`;
        record = pgdb.query(pg, sql).数据 || undefined;
        if (record && record.length === 1) {
            f.sendName = record[0].昵称;
            f.portrait = '';
        }
    } else if (sendids[1] == '商家') { //商家
        sql = `SELECT 店铺名称, 店铺图标 FROM 商_商家店铺表 WHERE 商家账号 = '${sendids[0]}'`;
        record = pgdb.query(pg, sql).数据 || undefined;
	console.log('====================record===================');
	console.log(record);
        if (record && record.length === 1) {
            f.sendName = record[0].店铺名称;
            f.portrait = record[0].店铺图标;
        }
    } else { //买家或异业商家
        sql = `SELECT T1.角色权限, T1.昵称, T2.头像 FROM 会员表 T1 LEFT JOIN 会员资料表 T2 ON T1.账号 = T2.账号 WHERE T1.账号 = '${sendids[0]}'`;
        record = pgdb.query(pg, sql).数据 || undefined;
        if (record && record.length === 1) {
            if (record[0].角色权限 == '1') { //异业商家-扩展方便以后维护
                f.sendName = record[0].昵称;
                f.portrait = record[0].头像;
            } else {
                f.sendName = record[0].昵称;
                f.portrait = record[0].头像;
            }
        }
    }


    //-----接收者------
    let targetReceive = f.receiveId + '_';  //处理买家用户没有'_'标识
    let receiveids =  targetReceive.split("_");
    if (receiveids[1] == 'service') {  //客服
        sql  = `SELECT 昵称 FROM 客服表 WHERE 账号 = '${receiveids[0]}'`;
        record = pgdb.query(pg, sql).数据 || undefined;
        if (record && record.length === 1) {
            f.receiveName = record[0].昵称;
            f.receivePortrait = '';
        }
    } else if (receiveids[1] == '商家') { //商家
        sql = `SELECT 店铺名称, 店铺图标 FROM 商家店铺表 WHERE 商家账号 = '${receiveids[0]}'`;
        record = pgdb.query(pg, sql).数据 || undefined;
console.log('====================record2===================');
	console.log(record);
        if (record && record.length === 1) {
            f.receiveName = record[0].店铺名称;
            f.receivePortrait = record[0].店铺图标;
        }
    } else { //买家、商家或异业商家
        sql = `SELECT T1.角色权限, T1.昵称, T2.头像 FROM 会员表 T1 LEFT JOIN 会员资料表 T2 ON T1.账号 = T2.账号 WHERE T1.账号 = '${receiveids[0]}'`;
        record = pgdb.query(pg, sql).数据 || undefined;
        if (record && record.length === 1) {
            if (record[0].角色权限 == '1') { //异业商家-扩展方便以后维护
                f.receiveName = record[0].昵称;
                f.receivePortrait = record[0].头像;
            } else {
                f.receiveName = record[0].昵称;
                f.receivePortrait = record[0].头像;
            }
        }
    }


}