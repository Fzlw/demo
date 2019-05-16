

var pgdb = require('../func/alioss.js');
var alioss = require('../func/alioss.js');
var config = require('../func/config.js');
var request = require('../func/request.js');
var http = require('http');
var Fiber = require('fibers');
var yasuo = require('./yasuo.js');
var path = require("path");
var fs = require('fs');
var moment = require("moment");
module.exports.run = function (body, pg, mo, redis, pg2) {
	var dir = path.normalize(__dirname);//路径
	var t = dir.split('ajax')[0];
	var local = t + 'www/temp/';
	if (fs.existsSync(local) == false) {
		fs.mkdirSync(local);
	}
	var variable = config.get('alicloud');
	var client = alioss.init(variable.阿里云参数1.region, variable.阿里云参数1.accessKeyId, variable.阿里云参数1.accessKeySecret);
	var data = {}
	data.状态 = 'aaabb';

	var turl = body.url;


	var obj = turl.split('aliyuncs.com/')[1];
	var type = obj.split('.')[1];
	var ttt = moment().format("YYYYMMDDHHmmss");
	var ran = parseInt(Math.random() * 89999 + 10000);
	var newName = ttt + ran;
	local = local + newName + '.' + type;
	var bbc = alioss.get(client, variable.阿里云参数1.bucket, obj, local);
	body.img_list = local;
	body.type = 'resize';
	var data = yasuo.run(body, pg, mo);

	var fiber = Fiber.current;
	http.get(turl + '?x-oss-process=image/resize,h_400', function (res) {
		var chunks = []; //用于保存网络请求不断加载传输的缓冲数据
		var size = 0;　　 //保存缓冲数据的总长度
		res.on('data', function (chunk) {
			chunks.push(chunk);　 //在进行网络请求时，会不断接收到数据(数据不是一次性获取到的)，
			size += chunk.length;　　//累加缓冲数据的长度
		});
		res.on('end', function (err) {
			var dataimgs = Buffer.concat(chunks, size);　　//Buffer.concat将chunks数组中的缓冲数据拼接起来，返回一个新的Buffer对象赋值给data
			data.img_data = 'data:image/png;base64,'+dataimgs.toString('base64');　　//将Buffer对象转换为字符串并以base64编码格式显示
			fiber.run();
		});
	})
	Fiber.yield();//同步处理
	return data;
}