/* 
 * 创建人：@钟俊浩
 * 创建内容：文件工具类
 * 更新时间：2017/01-18
 * 更新内容：存储mongo连接表
 * 更新版本：2.2.0
 */

var fs= require("fs");
var path = require('path');
var config = require('../func/config.js');
var request = require('../func/request.js');
var server = config.get('server');
var Fiber = require('fibers');


exports.mongoConName = function(data) {
	var arr = new Array();
	arr['mongo_Name'] = 'scjfzs';
	return arr[data];
}

/*//判断是否为空值返回状态
var a1 = utils.rejson(f.userID,'id不能为空');
var as = [a1];
var a = utils.judge(as);
if (a != 'noNull') {
	data.状态 = a;
	return data;
}*/
//返回json
exports.rejson = function(data, str) {
	
	var obj = {};
	obj.data = data;
	obj.str = str;
	return obj;
}

//判断是否为空
exports.judge = function(arr) {
	for(var i = 0; i < arr.length; i++) {
		var cur = arr[i];
		if(cur.data == '' || cur.data == null || cur.data == undefined) {
			return cur.str;
		}
	}
	return 'noNull';
}

//写入文件
exports.files = function(path, con) {
	var arr = {};
	arr.path_arr = path.split('/');
	arr.path_sum = (arr.path_arr).length;
	arr.con = con;
	if(arr.path_sum > 1) {
		arr.path_con = '';
		arr.path_num = Number(arr.path_sum) - 1;
		arr.i = 0;
		path_file(arr);
		return '文件写入成功';
	} else {
		return '目录异常';
	}
}


function path_file(arr) {
	if(arr.i < arr.path_sum) {
		if(arr.path_arr[arr.i] != '.' && arr.path_arr[arr.i] != '') {
			if(arr.path_con == '') {
				arr.path_con = './' + arr.path_arr[arr.i];
			} else {
				arr.path_con += '/' + arr.path_arr[arr.i];
			}

			if(arr.path_num != arr.i) {
				fs.mkdir(arr.path_con, function(err) {
					arr.i++;
					path_file(arr);
				});
			} else {

				fs.appendFile(arr.path_con, arr.con, function(err) {
					arr.i++;
					path_file(arr);
				});
			}
		} else {
			arr.i++;
			path_file(arr);
		}
	}
}

/*]获取范围内的随机数 
调用方法:
min:最小数
max:最大数
*/
exports.sjs = function(min, max) {
	var num = Math.floor(min + Math.random() * (max - min));
	return String(num);
}

/*获取下月最后天数*/
exports.getMonth = function (date) {
	var t = '';
	var arr = date.split('-');
	var year = arr[0];
	var month = arr[1];
	var day = arr[2];
	var days = new Date(year, month, 0);
	days = days.getDate(); 
	var year2 = year;
	var month2 = parseInt(month) + 1;
	if(month2 == 13) {
		year2 = parseInt(year2) + 1;
		month2 = 1;
	}
	var day2 = day;
	var days2 = new Date(year2, month2, 0);
	days2 = days2.getDate();
	if(day2 > days2) {
		day2 = days2;
	}
	if(month2 < 10) {
		month2 = '0' + month2;
	}
	t = year2 + '-' + month2 + '-' + day2;
	return t;
}


/*缩略图获取第一个图片*/
exports.zeroPhoto = function(data){
	var tut = JSON.parse(data);
	tut = tut[0].图片;
	return tut;
}

/*图片清除标签*/
exports.filterPhoto = function(data){
	var t = new RegExp("&quot;", "g");
	var b = data.replace(t, '"');
	var t = new RegExp("<p>", "g");
	b = b.replace(t, '');
	t = new RegExp("</p>", "g");
	b = b.replace(t, '');
	return b;
}

/*清除异常字符*/
exports.outPrint = function(data){
	var str = '';
	var regex = /[^\u4e00-\u9fa5\w]/g;
	str =data.replace(regex,"");
	return str.replace(/\d+/g,''); 
}

/*清除异常字符不包括数字,下划线,字母,中文*/
exports.cleCharacter = function(data){
  var str = '';
  var regex = /[^\u4e00-\u9fa5\w]/gi;
  str =data.replace(regex,"");
  return str; 
}

/*去查询字符串可选反斜杠*/
exports.trims = function(data){
	var str = '';
	var regex = /\/?(?:\?.*)?$/;
	str =data.replace(regex,"");
	return str; 
}

/*去重取唯一值*/
exports.filterOne = function (data, str) {
	var sort = {};
	for(var i = 0; i < data.length; ++i) {
		if(sort[data[i].str] !== undefined) {
			sort[data[i].str] = sort[data[i].str];
		} else {
			sort[data[i].str] = data[i];
		}
	}
	var result = [];
	for(var po in sort) {
		result.push(sort[po]);
	}
	return result;
}

/*创建文件*/
exports.mkdir = function (dirpath, dirname) {
    //是否是第一次调用  
    if(typeof dirname === "undefined") {
        if(fs.existsSync(dirpath)) {  
            return;  
        } else {  
            mkdir(dirpath, path.dirname(dirpath));  
        }  
    } else {  
        //第二个参数是否正常，避免调用时传入错误参数  
        if(dirname !== path.dirname(dirpath)) {   
            mkdir(dirpath);  
            return;  
        }  
        if(fs.existsSync(dirname)) {  
            fs.mkdirSync(dirpath)  
        } else {  
            mkdir(dirname, path.dirname(dirname));  
            fs.mkdirSync(dirpath);  
        }  
    }  
}
function mkdir(dirpath, dirname) {
    //是否是第一次调用  
    if(typeof dirname === "undefined") {   
        if(fs.existsSync(dirpath)) {  
            return;  
        } else {  
            mkdir(dirpath, path.dirname(dirpath));  
        }  
    } else {  
        //第二个参数是否正常，避免调用时传入错误参数  
        if(dirname !== path.dirname(dirpath)) {   
            mkdir(dirpath);  
            return;  
        }  
        if(fs.existsSync(dirname)) {  
            fs.mkdirSync(dirpath)  
        } else {  
            mkdir(dirname, path.dirname(dirname));  
            fs.mkdirSync(dirpath);  
        }  
    }  
}
//调用接口
exports.connect =function(url,func,data){
  	config.readfile();
    var server = config.get('server');
    var re = request.server(url,func,data);
   // console.log(re);
     var s = JSON.parse(re.信息);
	  return s;
}
//快递查询
exports.xto = function (id, company) {
	var result = {};
	var state = ['在途中', '已发货', '疑难件', '已签收', '已退货', '派送中', '退回中', '无'];
	var fiber = Fiber.current;
	var xto = require("xto");
	xto.query(id, company, function(status, msg) {
		result = msg;
		fiber.run();
		
	});
	Fiber.yield();
	return result;
}

/*获取当前时间到上个月的当前时间*/
exports.oandtDate = function(){
    var daysOfMonth = [];
        var fullYear = new Date().getFullYear(); //当前年
        var fullYearTwo = new Date().getFullYear()-1; //去年
        var month = new Date().getMonth()+1; //当前月
        var months = '';
        var DayOfMonths = '';
        var monthTwo = new Date().getMonth(); //上个月
        var lastDayOfMonth = new Date(fullYear, monthTwo, 0).getDate();//上个月最后一天
        var DayOfMonth = new Date().getDate(); //当前日
        for (var i = 0; i <= DayOfMonth; i++) {
          if(parseInt(month)<10){
            months=''+0+month;
          }else{
            months = month;
          }
          if(parseInt(i)<10){
            DayOfMonths=''+0+i;
          }else{
            DayOfMonths = i;
          }
          daysOfMonth[i] = fullYear + '-' + months + '-' + DayOfMonths;
            
        };
        if(month != 1){
          for (var j = DayOfMonth+1; j <= lastDayOfMonth; j++) {
            if(parseInt(monthTwo)<10){
              months=''+0+monthTwo;
            }else{
              months = monthTwo;
            }
            if(parseInt(j)<10){
              DayOfMonths=''+0+j;
            }else{
              DayOfMonths = j;
            }
              daysOfMonth[j] = fullYear + '-' + months + '-' + DayOfMonths;
              
          };  
        }else{
          for (var j = DayOfMonth+1; j <= lastDayOfMonth; j++) {
            if(parseInt(j)<10){
              DayOfMonths=''+0+j;
            }else{
              DayOfMonths = j;
            }
              daysOfMonth[j] = fullYearTwo + '-' + 12 + '-' + DayOfMonths;
          };
        }
    return daysOfMonth; 
}
/*筛选商户号*/
exports.filterMchid = function(value) {
	var len = '';
	var zero = ['000000000000','00000000000','0000000000','000000000','00000000','0000000','000000','00000','0000','000','00','0'];
	if(value.length < 12) {
		for(var item = 0; item < zero.length; item++) {
			if(value.length == item) {
				len = zero[item];
			}
		}
	}
	return len + value;
}

