/**
 * 创建人 : @Coding Farmer_3201
 * 创建内容 : 公用头部
 * 创建时间 :2018-04-04 10:10:10
 * 创建版本 :1.0.0
 * 更新内容:添加特殊业务 只加 或减
 * 更新时间：2018-05-18
 * 更新内容:去除商支付密码的查询
 * 更新时间：2018-06-13
 *
 * 更新时间：2018-06-25
 * 更新内容：防止负数
 *
 * 更新时间：2018-07-03
 * 更新内容：账户增加代金券操作
 *
 * 更新时间：2018-07-04
 * 更新内容：加钱不判断出账
 **/
var pgdb = require('../../func/pgdb.js');
var moment = require("moment");
var md5 = require('MD5');
var logs = require('../../func/logs.js');


class  shareClass{
    constructor(f, pg) {
        this.f = f ? f : {};
        this.pg = pg ? pg : {};
        this.sql = "";
        this.时间 = moment().format('YYYY-MM-DD HH:mm:ss');
    }

    /***
     * 判断入参
     */
    validateEntry(validate,type){
        var data={};
        data.状态 = "成功";
        for (let item in validate) {
            if (!this.f[validate[item]]) {
                data.状态 = `${validate[item]}不能为空`;
                break;
            }
        }
        if (data.状态 !='成功'){
            return data ;
        }
        if (Number(this.f.integration) <= 0){
            data.状态 = 'integration积分错误';
            return data ;
        }
		if (isNaN(this.f.integration)){
            data.状态 = 'integration必须为数字';
            return data ;
        }
		
        if (type == '个人'){
            var total_pay_data = this.f.total_pay_data ;
            if(typeof (total_pay_data) !='object'){
                data.状态 = "总账户出错了";
                return data ;
            }
            if(total_pay_data.length <= 0){
                data.状态 = "总账户出错了002";
                return data ;
            }
            for (let item in total_pay_data) {
                if (!total_pay_data[item].total_pay_type || !total_pay_data[item].total_onlyId || !total_pay_data[item].total_pay_money || Number(total_pay_data[item].total_pay_money)<=0) {
                    data.状态 = "总帐户入参错误";
                    break;
                }
            }
            if (data.状态 !='成功'){
                return data ;
            }
        }
        return data;
    }
    /**
     *
     * @param funcName  执行funcName方法
     * @param params  funcname 的入参
     * @returns {{}}
     */
    init(funcName,params){
        let data ={};
        let index = 0;
        if (!funcName){
            data.状态 ='查询方法错误:'+funcName;
            return data;
        }
        switch (funcName){  //eval() 效率问题
            case 'validateEntry' :
                data = this.validateEntry(params);
                break;
            case 'queryTrans' :
                data = this.queryTrans();
                break;
            case 'queryPayType' :
                data =this.queryPayType();
                break;
            case 'queryUserInfo' :
                data =this.queryUserInfo(params);
                break;
            case 'payUserMoney' :
                data =this.payUserMoney(params);

                break;
            case 'addUserMoney' :
                data =this.addUserMoney(params);

                break;
            case 'insertBill' :
                data =this.insertBill(params);

                break;
            case 'selBillType' :
                data =this.selBillType();
                break;
            case 'insertAccLog' :
                data =this.insertAccLog(params);

                break;
            default :
                data.状态 ='查询方法错误';
                break;
        }

        if (data.状态 != '成功'){
            //日志
            pgdb.query(this.pg, "ROLLBACK");
            logs.write('share_log',this.f.onlyId+'在'+ this.时间 +'调用头部发送错误，\n*******'+ JSON.stringify(data)+'**********\n');
        }

        return data ;
    }

    /**
     * 查询支付类别
     * @returns {{}}
     */
    queryTrans(){
        let  data ={};
        data.状态 = '成功';
        let sql = "SELECT ID FROM 交易类别表 WHERE 交易类别 = '" + this.f.pay_detail + "'";
        let r_detail = pgdb.query(this.pg,sql);
        if (r_detail.状态 !='成功'){
            data.状态 = '交易类别查询失败';
            return data;
        }
        if(r_detail.数据.length != 1) {
            data.状态 = '交易类别不存在';
            return data;
        }
        return data ;
    }

    /**
     * 查询支付方式
     * @returns {*}
     */
    queryPayType(){
        let  data ={};
        data.状态 = '成功';
        let pay_type = this.f.pay_type.replace(/(^\s*)|(\s*$)/g, ""); //去空格
        let sql ="SELECT ID FROM 支付方式表 where 支付方式 = '"+pay_type+"'";
        var payTypeResu = pgdb.query(this.pg, sql);
        if (payTypeResu.状态 != '成功'){
            data.状态 = '交易方式查询失败';
            return data;
        }
        if (payTypeResu.数据.length != 1){
            data.状态 = '支付方式错误';
            return data;
        }
        return data ;
    }

    /**
     * 查询会员信息  f.query_type == '个人' //总账户
     */
    queryUserInfo(f){
        let  data ={};
        data.状态 = '成功';
        if (f.query_type == '个人'){
            let sql = "SELECT 账号,昵称, "+f.pay_type+" as balance,状态,出账 FROM  会员表  WHERE  唯一id='" + f.onlyId + "'";
            let s_vip = pgdb.query(this.pg, sql);
            if(s_vip.状态 !='成功') {
                data.状态 = '账号有误0001';
                return data;
            }
            if(s_vip.数据.length !=1) {
                data.状态 = '账号有误0002';
                return data;
            }

            if(s_vip.数据[0].状态 != '正常') {
                data.状态 = '账号已' + s_vip.数据[0].状态;
                return data;
            }
            //加钱不要判断出账
            if (f.func !='payback'){
                if(s_vip.数据[0].出账 != '是') {
                    data.状态 = '账号已禁止出账';
                    return data;
                }
            }
            data.info = s_vip.数据[0];
            data.info.name= (data.info.昵称.replace(/"/g,"‘")).replace(/'/g,"’");
            return data ;
        }else if(f.query_type == '总账户'){
            let get_sql = "select 账号,昵称,唯一id,"+ f.total_pay_type+" as balance from 存钱表 where 唯一id='"+f.total_onlyId+"'";
            let get_data = pgdb.query(this.pg,get_sql);
            if(get_data.状态 != "成功"){
                data.状态 = "获取总账户余额失败001";
                return data;
            }
            if(get_data.数据.length != 1 ){
                data.状态 = "获取总账户余额失败002";
                return data;
            }

            data.totalInfo = get_data.数据[0];
            return data ;

        }else{
            data.状态 = '查询会员错误';
            return data;
        }


    }

    /**
     * 减 会员/存钱表余额
     */
    payUserMoney(f){
        let  data ={};
        data.状态 = '成功';
        let tableName = '会员表';
        f.update_type = f.update_type || "个人" ;
        if(f.update_type == '总账户'){
            tableName = '存钱表' ;
        }
        let sql = "UPDATE  "+tableName+"  SET  " + f.pay_type + "  =  " + f.pay_type + "  -  " + f.integration + "    WHERE  "+f.pay_type+" - " + f.integration + " >=0  and  账号='" + f.account + "' returning "+f.pay_type+" as balance ";

        let u_vip = pgdb.query(this.pg, sql);
        if(u_vip.状态 !='成功') {
            data.状态 = f.update_type+'更新余额失败001';
            return data;
        }
        if(u_vip.影响行数 != 1){
            data.状态 = f.update_type+ '更新余额失败002';
            return data;
        }

        data.balance =  u_vip.数据[0].balance ;//计算当前余额
        return data ;
    }

    /**
     * 加 会员/存钱表余额
     */
    addUserMoney(f){
        let  data ={};
        data.状态 = '成功';
        let tableName = '会员表';
        f.update_type = f.update_type || "" ;
        if(f.update_type == '总账户'){
            tableName = '存钱表' ;
        }

        let sql = "UPDATE  "+tableName+"  SET  " + f.pay_type + "  =  " + f.pay_type + "  +  " + f.integration + "    WHERE    账号='" + f.account + "' returning "+f.pay_type+" as balance ";

        let u_vip = pgdb.query(this.pg, sql);

        if(u_vip.状态 !='成功') {
            data.状态 = f.update_type+'添加余额失败001';

            return data;
        }
        if(u_vip.影响行数 != 1){
            data.状态 = f.update_type+ '添加余额失败002';
            return data;
        }

        data.balance =  u_vip.数据[0].balance ;//计算当前余额
        return data ;
    }



    /**
     * 插入账单
     * @param f
     * @returns {{}}
     */
    insertBill(f){
        let date_now = moment().format('YYYY-MM-DD HH:mm:ss');
        let  data ={};
        data.状态 = '成功';
        let payOrAdd = '';
        if(f.pay_or_add =='add'){
            payOrAdd =f.integration ;
        }else if (f.pay_or_add =='pay'){
            payOrAdd = -Number(f.integration) ;
        }else{
            data.状态 = '执行账单添加or支付类型失败';
            return data;
        }

        //插入账单表
        let sql = "insert into 账单表(账号,金额,交易类别,交易类别id,状态,录入人,录入时间,备注,账单分类) "
                + " select '"+f.account+"','"+payOrAdd+"','"+f.pay_detail+"',交易类别id,'正常','系统','"+date_now+"','"+f.remarks+"',账单分类 from 账单类型表 where 交易类别 = '"+f.pay_detail+"'  returning id,账单分类" ;

        var costList = pgdb.query(this.pg, sql);

        if(costList.状态 !='成功') {
            data.状态 = '账单插入失败001';
            return data;
        }
        if(costList.影响行数 != 1){
            data.状态 = '账单插入失败002';
            return data;
        }
        data.账单id =costList.数据[0].id ; //获取账单id
        data.账单分类 =costList.数据[0].账单分类 ; //获取账单id
        return data ;

    }
    /**
     * 查询账单分类
     * @returns {*}
     */
    selBillType(){
        let  data ={};
        data.状态 = '成功';
        let sql ="SELECT 账单分类 FROM 账单类型表 where 交易类别 = '"+this.f.pay_detail+"'";
        let resu = pgdb.query(this.pg, sql);
        if (resu.状态 != '成功'){
            data.状态 = '账单分类查询失败';
            return data;
        }
        if (resu.数据.length != 1){
            data.状态 = '账单分类查询失败002';
            return data;
        }
        data.账单分类 = resu.数据[0].账单分类;
        return data ;
    }

    /**
     * 插入账户记录
     */
    insertAccLog(f){
        let date_now = moment().format('YYYY-MM-DD HH:mm:ss');
        let  data ={};
        data.状态 = '成功';
        let payOrAdd = '';
        if(f.pay_or_add =='add'){
            payOrAdd =f.integration ;
        }else if (f.pay_or_add =='pay'){
            payOrAdd = -Number(f.integration) ;
        }else{
            data.状态 = '执行账单添加or支付类型失败';
            return data;
        }

        let sql = "INSERT  INTO  账户记录表(账号,昵称,交易金额,账户余额,交易账户,账单id,订单id,说明,状态,录入人,录入时间,备注,账单分类)"
                +  " values('" + f.account + "','" + f.nickName + "','" + payOrAdd + "','" + f.newBalance + "','"+f.pay_type+"','"+f.账单id+"','" + f.related_id + "','" + f.explain + "','正常','系统','" + date_now + "','" + f.remarks + "','" + f.账单分类 + "')";
        var i_log = pgdb.query(this.pg, sql);
        if(i_log.状态 !='成功') {
            data.状态 = '账户记录失败001';
            return data;
        }
        if( i_log.影响行数 != 1) {
            data.状态 = '账户记录失败002';
            return data;
        }
        return data ;
    }




}


/**
 * 减钱 个人  必须操作  total_pay_data 也扣除相关总账户
 * @param f   var validate=['onlyId','integration','pay_type','related_id','explain','pay_detail','total_pay_data'];
 *       total_pay_data =[{'total_onlyId':'','total_pay_type':'ge','total_pay_money':f.integration}];
 * @param pg
 * @param special_money = 特使业务  不走总账户 否则  不传
 */
module.exports.pay = function(f, pg,special_money) {

    f.时间 = moment().format('YYYY-MM-DD HH:mm:ss');
    let data = {};
    data.状态 = '成功';
    let share = new shareClass(f, pg);
    let  validate =[] ;  //这么写是为啥？
    validate=['onlyId','integration','pay_type','related_id','explain','pay_detail','total_pay_data'];

    if (special_money == '特殊业务'){
        validate.pop();
    }


    let vali =share.init('validateEntry',validate,'个人');  //验证 非空
    if (vali.状态 != '成功'){
        return vali ;
    }

    f.pay_type = f.pay_type.replace(/(^\s*)|(\s*$)/g, ""); //去空格
    f.remarks = f.remarks || '';
    let trans =share.init('queryTrans');  //验证 交易类别
    if (trans.状态 != '成功'){
        return trans ;
    }

    let payResu =share.init('queryPayType');  //验证 支付方式
    if (payResu.状态 != '成功'){
        return payResu ;
    }

    var userParam ={};
    userParam.query_type = '个人';
    userParam.pay_type = f.pay_type;
    userParam.onlyId = f.onlyId;
    let userInfoResu =share.init('queryUserInfo',userParam);  //验证 会员
    if (userInfoResu.状态 != '成功'){
        return userInfoResu ;
    }


    let userInfo =userInfoResu.info ;  //会员信息
    if(Number(userInfo.balance) < 0 ) {
        data.状态 = '个人余额不足001';
        return data;
    }
	
	
    if(Number(f.integration) < 0 ) {
        data.状态 = '金额不正确003';
        return data;
    }
    let now_balance = userInfo.balance ; //当前会员余额
    if( Number(now_balance) < Number(f.integration) ) {
        data.状态 = '个人余额不足002';
        return data;
    }

    f.account = userInfo.账号; //账号
    f.nickName = userInfo.name; //昵称

    //开始修改余额
    let upUser = share.init('payUserMoney',f);
    if (upUser.状态 != '成功'){
        return upUser ;
    }

    f.newBalance = upUser.balance ; //计算后的余额 ;

    f.pay_or_add ='pay';  //参数 决定 加  还是  减   很重要

    let billResu = share.init('insertBill',f);   //查询账单id  //执行了查询账单类型 并插入 账单
    if (billResu.状态 != '成功'){
        return billResu ;
    }

    f.账单id = billResu.账单id ;
    f.账单分类 = billResu.账单分类  ;

    let accLog = share.init('insertAccLog',f); //插入个人账户日志表
    if (accLog.状态 != '成功'){
        return accLog ;
    }

    if (special_money=='特殊业务'){
        //不要操作总账户
        return data ;
    }


    //开始操作总账户。可多个总账户
    var  init_number = 0 ;
    for (let i=0;i<f.total_pay_data.length;i++){
        let item = [];
        item =f.total_pay_data[i];
        item.onlyId = item.total_onlyId ;
        item.integration = item.total_pay_money;
        item.pay_type = item.total_pay_type ;
        item.explain = f.explain ;
        item.账单id =item.账单id;
        item.related_id =f.related_id ;
        item.pay_detail = f.pay_detail;
        item.账单id =f.账单id ;
        item.账单分类 = f.账单分类;
        let  resu = this.totalAddMoney(item, pg,'pay'); //给总账户
        if (resu.状态 != '成功'){
            pgdb.query(pg, 'ROLLBACK') ;  //这个回滚很重要
            data.状态 = resu.状态 ;
            break ;
        }
        //执行条数
        init_number++ ;

    }

    if (init_number !=0 && init_number ==Number(f.total_pay_data.length) && data.状态 == '成功'){
        return  data ;
    }else{
        // logs.write('share_log',f.onlyId+'在'+ f.时间 +'调用头部发送错误，\n*******'+JSON.stringify(data)+'**********\n');
        return  data ;
    }


};




/**
 * 加钱 个人  必须操作  total_pay_data 扣除相关总账户
 * @param f   var validate=['onlyId','integration','pay_type','related_id','explain','pay_detail','total_pay_data'];
 *         total_pay_data ==>[{'total_onlyId':'','total_pay_type':'','total_pay_money':200}];
 * @param pg
 */
module.exports.payback = function(f, pg) {

    f.时间 = moment().format('YYYY-MM-DD HH:mm:ss');
    let data = {};
    data.状态 = '成功';
    let share = new shareClass(f, pg);
    let  validate =[] ;  //这么写是为啥？
    validate=['onlyId','integration','pay_type','related_id','explain','pay_detail','total_pay_data'];


    let vali =share.init('validateEntry',validate,'个人');  //验证 非空
    if (vali.状态 != '成功'){
        return vali ;
    }

    f.pay_type = f.pay_type.replace(/(^\s*)|(\s*$)/g, ""); //去空格
    f.remarks = f.remarks || '';

    //防止加钱负数
    if (Number(f.integration) <0){
        data.状态 = '金额不正确002' ;
        return data;
    }


    let trans =share.init('queryTrans');  //验证 交易类别
    if (trans.状态 != '成功'){
        return trans ;
    }

    let payResu =share.init('queryPayType');  //验证 支付方式
    if (payResu.状态 != '成功'){
        return payResu ;
    }

    var userParam ={};
    userParam.query_type = '个人';
    userParam.pay_type = f.pay_type;
    userParam.onlyId = f.onlyId;
    userParam.func = 'payback';
    let userInfoResu =share.init('queryUserInfo',userParam);  //验证 会员
    if (userInfoResu.状态 != '成功'){
        return userInfoResu ;
    }
    userParam.func = '';


    let userInfo =userInfoResu.info ;  //会员信息
    // if(Number(userInfo.balance) < 0 ) {
    //     data.状态 = '余额不足001';
    //     return data;
    // }

    f.account = userInfo.账号; //账号
    f.nickName = userInfo.name; //昵称

    for (let i=0;i<f.total_pay_data.length;i++){
        //获取总账户会员信息
        let item =[];
        item = f.total_pay_data[i];
        item.query_type = '总账户';
        item.total_pay_type = item.total_pay_type ;
        item.total_onlyId = item.total_onlyId ;
        let totalInfoResu =share.init('queryUserInfo',item);  //验证总 会员
        if (totalInfoResu.状态 != '成功'){
            data.状态 =totalInfoResu.状态;
            break ;
        }

        let totalInfo =totalInfoResu.totalInfo;

        if(totalInfo.balance <=0){
            data.状态 =item.total_pay_type+'账户小于0';
            break ;
        }
        if(Number(totalInfo.balance) < Number(f.integration)){
            data.状态 =item.total_pay_type+'账户余额不足';
            break ;
        }
    }

    //判断总账金额是否够  没办法


    if (data.状态 !='成功'){
        pgdb.query(pg, 'ROLLBACK') ;
        return data ;
    }

    //开始修改余额
    let upUser = share.init('addUserMoney',f);
    if (upUser.状态 != '成功'){
        return upUser ;
    }

    f.newBalance = upUser.balance ; //计算后的余额 ;

    f.pay_or_add ='add';  //参数 决定 加  还是  减   很重要

    let billResu = share.init('insertBill',f);   //查询账单id  //执行了查询账单类型 并插入 账单
    if (billResu.状态 != '成功'){
        return billResu ;
    }

    f.账单id = billResu.账单id ;
    f.账单分类 = billResu.账单分类 ;
    let accLog = share.init('insertAccLog',f); //插入个人账户日志表
    if (accLog.状态 != '成功'){
        return accLog ;
    }

    //开始操作总账户

    var  init_number = 0 ;
    for (let i=0;i<f.total_pay_data.length;i++){
        let item = [];
        item =f.total_pay_data[i];
        item.onlyId = item.total_onlyId ;
        item.integration = item.total_pay_money;
        item.pay_type = item.total_pay_type ;
        item.explain = f.explain ;
        item.账单id =item.账单id;
        item.related_id =f.related_id ;
        item.pay_detail = f.pay_detail;
        item.账单id =f.账单id ;
        item.账单分类 = f.账单分类;
        let  resu = this.totalLoseMoney(item, pg,'pay'); //给总账户
        if (resu.状态 != '成功'){
            pgdb.query(pg, 'ROLLBACK') ;  //这个回滚 很重要
            data.状态 = resu.状态 ;
            break ;
        }
        //执行条数
        init_number++ ;

    }

    if (init_number !=0 && init_number !=Number(f.total_pay_data.length) && data.状态 != '成功'){
        //  logs.write('share_log',f.onlyId+'在'+ f.时间 +'调用头部发送错误，\n*******'+JSON.stringify(data)+'**********\n');
        return  data ;
    }
    return  data ;
};





/**
 * /*给总账户加钱
 * @param f  'onlyId','integration','pay_type','related_id','explain','pay_detail'
 *
 *@fromfunc  是否是上面 个人传入  pay（）  or payback（） 调用 此方法  单独操作总账户不用传
 * @returns {{}}
 */
module.exports.totalAddMoney = function(f, pg,fromfunc){

    f.时间 = moment().format('YYYY-MM-DD HH:mm:ss');
    let data = {};
    data.状态 = '成功';
    let share = new shareClass(f, pg);
    let  validate=['onlyId','integration','pay_type','related_id','explain','pay_detail'];
    let vali =share.init('validateEntry',validate);  //验证 非空
    if (vali.状态 != '成功'){
        return vali ;
    }

    f.pay_type = f.pay_type.replace(/(^\s*)|(\s*$)/g, ""); //去空格
    f.remarks = f.remarks || '';
    f.update_type = '';
    f.账单id = f.账单id || 0 ; // 总账户不要账单
    //开始操作总账户
    var 总账户类型 = ['总收益','总现金红包','总外部支付','总油费','游戏币','金豆','总奖金池','总代金券','总赏金币','总多汇币'];/*[ 总收益, 总账户, 个人账户总账户, 奖金池,总代金券 ]*/

    if(总账户类型.indexOf(f.pay_type) < 0 ){
        data.状态 = "总账户类型错误003";
        return data ;
    }

    //防止加钱负数
    if (Number(f.integration) <0){
        data.状态 = '金额不正确004' ;
        return data;
    }

    //是否判断支付类别
    if(fromfunc != 'pay' || fromfunc != 'payback'){
        //直接调用的总账户加钱方法 需要判断
        let trans =share.init('queryTrans');  //验证 交易类别
        if (trans.状态 != '成功'){
            return trans ;
        }
    }


    //获取总账户会员信息
    let totalParam ={};
    totalParam.query_type = '总账户';
    totalParam.total_pay_type =  f.pay_type;
    totalParam.total_onlyId = f.onlyId;
    let totalInfoResu =share.init('queryUserInfo',totalParam);  //验证总 会员
    if (totalInfoResu.状态 != '成功'){
        data.状态 =totalInfoResu.状态;
        return totalInfoResu;
    }
    let totalInfo =totalInfoResu.totalInfo;

    /*  if(totalInfo.balance <=0){
     data.状态 =totalParam.total_pay_type+'账户小于0';

     }
     if(Number(totalInfo.balance) < Number(f.integration)){
     data.状态 =totalParam.total_pay_type+'账户余额不足';

     }*/

    f.nickName =totalInfo.昵称 ;
    f.update_type = '总账户';
    f.account =  totalInfo.账号;
    f.pay_or_add = 'add';

    let upTotalResu =share.init('addUserMoney',f);  //更新总账户余额
    if (upTotalResu.状态 != '成功'){
        data.状态 =upTotalResu.状态;
        return data ;
    }

    f.newBalance = upTotalResu.balance ;  //更新后的余额
    //账单分类
    if (!f.账单分类){
        let bResu =share.init('selBillType',f);  //更新总账户余额
        if (bResu.状态 != '成功'){
            data.状态 =bResu.状态;
            return data ;
        }
        f.账单分类 =  bResu.账单分类;
    }
    //插入账单日志表
    let totalLog = share.init('insertAccLog',f); //插入账户日志表

    if (totalLog.状态 != '成功'){
        data.状态 =totalLog.状态 ;
    }

    if( data.状态 == '成功'){
        return data;

    }else{
        logs.write('share_log',f.onlyId+'在'+ f.时间 +'调用头部总账户'+f.pay_type+'发送错误，\n*******'+JSON.stringify(data)+'**********\n');
        // pgdb.query(pg, 'ROLLBACK') ;
        data.状态 = '执行失败' ;
        return data ;
    }

};


/**
 * /*给总账户  减钱
 * @param f  'onlyId','integration','pay_type','related_id','explain','pay_detail'
 *
 *@fromfunc  是否是上面个人传入  pay（）  or payback（） 调用 此方法  单独操作总账户不用传
 * @returns {{}}
 */
module.exports.totalLoseMoney = function(f, pg,fromfunc){

    f.时间 = moment().format('YYYY-MM-DD HH:mm:ss');
    let data = {};
    data.状态 = '成功';
    let share = new shareClass(f, pg);
    let  validate=['onlyId','integration','pay_type','related_id','explain','pay_detail'];
    let vali =share.init('validateEntry',validate);  //验证 非空
    if (vali.状态 != '成功'){
        return vali ;
    }

    f.pay_type = f.pay_type.replace(/(^\s*)|(\s*$)/g, ""); //去空格
    f.remarks = f.remarks || '';
    f.update_type = '';
    f.账单id = f.账单id || 0 ; // 总账户不要账单
    //开始操作总账户
    var 总账户类型 = ['总收益','总现金红包','总外部支付','总油费','游戏币','金豆','总奖金池','总代金券','总赏金币','总多汇币'];/*[ 总收益, 总账户, 个人账户总账户, 奖金池,总代金券 ]*/
    if(总账户类型.indexOf(f.pay_type) < 0 ){

        data.状态 = "总账户类型错误003";
        return data ;
    }

    if(Number(f.integration) < 0 ) {
        data.状态 = '金额不正确004';
        return data;
    }

    //是否判断支付类别
    if(fromfunc != 'pay' || fromfunc != 'payback'){

        //直接调用的总账户加钱方法 需要判断
        let trans =share.init('queryTrans');  //验证 交易类别
        if (trans.状态 != '成功'){
            return trans ;
        }


    }

    //获取总账户会员信息
    let totalParam ={};
    totalParam.query_type = '总账户';
    totalParam.total_pay_type =  f.pay_type;
    totalParam.total_onlyId = f.onlyId;
    let totalInfoResu =share.init('queryUserInfo',totalParam);  //验证总 会员
    if (totalInfoResu.状态 != '成功'){
        data.状态 =totalInfoResu.状态;
        return totalInfoResu;
    }

    let totalInfo =totalInfoResu.totalInfo;

    if(totalInfo.balance <=0){
        data.状态 =totalParam.total_pay_type+'账户小于0';
        return data ;
    }

    if(Number(totalInfo.balance) < Number(f.integration)){
        data.状态 =totalParam.total_pay_type+'账户余额不足';
        return data ;
    }

    f.nickName =totalInfo.昵称 ;
    f.update_type = '总账户';
    f.account =  totalInfo.账号;

    f.pay_or_add = 'pay'; //控制加钱减钱

    let upTotalResu =share.init('payUserMoney',f);  //更新总账户余额
    if (upTotalResu.状态 != '成功'){
        data.状态 =upTotalResu.状态;
        return upTotalResu;
    }

    f.newBalance = upTotalResu.balance ;  //更新后的余额
    //账单分类
    if (!f.账单分类){
        let bResu =share.init('selBillType',f);  //更新总账户余额
        if (bResu.状态 != '成功'){
            data.状态 =bResu.状态;
            return data ;
        }
        f.账单分类 =  bResu.账单分类;
    }
    //插入账单日志表
    let totalLog = share.init('insertAccLog',f); //插入账户日志表
    if (totalLog.状态 != '成功'){
        data.状态 =totalLog.状态 ;
    }

    if( data.状态 == '成功'){
        return data;
    }else{

        logs.write('share_log',f.onlyId+'在'+ f.时间 +'调用头部总账户'+f.pay_type+'发送错误，\n*******'+JSON.stringify(data)+'**********\n');
        data.状态 = '执行失败' ;
        //  pgdb.query(pg, 'ROLLBACK') ;
        return data ;
    }

};

/**
 * 查询会员
 * @param onlyID
 * @param random
 * @param pg
 * @param is_random
 * @returns {{}}
 */
module.exports.top = function(accout, random, pg) {
    var data = {};
    data.状态 = '成功';
    if(!accout) {
        data.状态 = '账号不能为空';
        return data ;
    }
    if(!random) {
        data.状态 = '随机码不能为空';
        return data ;
    }

    var sql = "select id,账号,唯一id,手机号,昵称,现金红包,商家收益,油费账户,金豆,登录密码,支付密码,推荐人账号,推荐人姓名,随机码,商随机码,出账,token,角色权限,手机id,状态,录入人,录入时间,备注,商家权限,多汇币,赏金币 from 会员表 where 账号 = '" + accout + "'";
	var vipRo = pgdb.query(pg, sql);
    if (vipRo.状态 != '成功'){
        data.状态 = '查询会员失败001';
        return data;
    }
    if(vipRo.数据.length != 1) {
        data.状态 = '新用户请先进行注册';
        return data;
    }

    var 会 = vipRo.数据[0];

    if(!会.登录密码) {
        data.状态 = '您还未设置密码';
        return data;
    } else if(会.状态 != '正常') {
        data.状态 = '账号已' + 会.状态;
        return data;
    } else if(会.随机码 != random ) {
        data.状态 = '随机码不正确';
        return data;
    } else if(会.出账 != '是') {
        data.状态 = '经系统检测到您有异常操作行为，功能暂停使用';
        return data;
    } else {
        //昵称处理
        if(会.昵称){
            会.昵称 =(会.昵称.replace(/"/g,"‘")).replace(/'/g,"’");
        }
        data.会 = 会;
    }

    return data;

};


//body为所传参数，type为参与签名参数
module.exports.server = function(body, pg, mo, type) {
    var f = {};
    f.状态 = '成功';

    if(!body.appid ) {
        f.状态 = 'appid不能为空';
        return f;
    } else if(!body.sign) {
        f.状态 = 'sign不能为空';
        return f;
    }

    var row = pgdb.query(pg, "select id,有效期,密钥,商户名,商户号,类别 from 服务号表 where 服务账号id = '" + body.appid + "'");
    if(row.状态 != '成功') {
        f.状态 = '数据异常';
    } else if(row.数据.length == 0) {
        f.状态 = 'appid异常';
    }else if(body.date > row.数据[0].有效期) {
        f.状态 = '公众号已过期';
    } else if(row.数据[0].密钥 == null || row.数据[0].密钥 == '') {
        f.状态 = '密钥异常';
    } else if(body.sign != this.sign(body, type, row.数据[0].密钥)) {
        console.log('签名==================='+this.sign(body, type, row.数据[0].密钥));
        f.状态 = '签名错误';
    }
    if(f.状态 != '成功'){
        return f;
    }

    f.公 = row.数据[0];
    return f;
};


/*[签名
 param.appid  例如:appid
 type  为数组,填写为满足条件的数据 例如type = ['appid']
 app_key   为密钥
 */
module.exports.sign = function(param, type, app_key) {
    var querystring = Object.keys(param).filter(function(key) {
            if(type == null || type == '')
                return param[key] !== undefined && param[key] !== '' && ['sign', 'key'].indexOf(key) < 0;
            else {
                return param[key] !== undefined && param[key] !== '' && ['sign', 'key'].indexOf(key) < 0 && type.indexOf(key) >= 0;
            }
        }).sort().map(function(key) {
            return key + '=' + param[key];
        }).join("&") + "&key=" + app_key;
    return md5(querystring).toUpperCase();
}
/*]签名*/