var Fiber = require('fibers');
var fs = require('fs');
var config = require('../func/config.js');
var pgdb = require('../func/pgdb.js');
var mongo = require('../func/mongo.js');
var redisdb = require('../func/redisdb.js');
var logs = require('../func/logs.js');
var async = require('async');

var main = {};

main.index = function(req,res,body){

	if(body.path.length <= 7){
		var data = {};
		data.code = -2;
		data.message = 'page error';
		res.status(200).send(data);
		res.end();
		return;
	}

	var fileName = body.path.substr(1, body.path.length - 7);

	// var file = main.searchfile(fileName);

	var file = fs.existsSync("./routes/"+fileName+'.js');

	if(file){
		body.func = fileName;
	}else{
		var data = {};
		data.code = -3;
		data.message = 'page can not find';
		res.status(200).send(data);
		res.end();
		return;
	}


	var conf = config.get('app');
	var obj = new Object();

	var fiber = Fiber(function (cb){
		/**---------pg-------*/
		if(conf.postgresql.使用 == '是'){
			pgdb.start(obj.pg);//数据库事务开始
		}
		/**---------pg-------*/

		var func = require('./'+body.func+'.js');

		body.send = func.run(body,obj.pg,obj.mongo,obj.redis,obj.pg2);

		/**---------pg-------*/
		if(conf.postgresql.使用 == '是'){
			pgdb.end(obj.pg);//数据库事务结束
		}
		/**---------pg-------*/

		cb(null,'');
	});



	async.waterfall([
		function(cb){
			if(conf.postgresql.使用 != '是'){
				cb(null,'');
				return;
			}
			pgdb.open(function(err,client,done){
				if(err){
					console.log('连接pg数据库失败!');
					logs.write('err','错误:连接PG数据库失败,错误信息:'+err);
					res.status(200).send('{"code":-20005,"message":"postgresql error"}');
					res.end();
				}else{
					client.done = done;
					obj.pg = client;
					cb(null,'');
				}
			});
		},
		function(j,cb){
			if(conf.postgresql_two.使用 != '是'){
				cb(null,'');
				return;
			}
			pgdb.open_two(function(err,client){
				if(err){
					console.log('连接pg2数据库失败!');
					logs.write('err','错误:连接PG2数据库失败,错误信息:'+err);
					res.status(200).send('{"code":-20005,"message":"postgresql two error"}');
					res.end();
				}else{
					obj.pg2 = client;
					cb(null,'');
				}
			});
		},
		function(j,cb){
			if(conf.mongodb.使用 != '是'){
				cb(null,'');
				return;
			}
			mongo.open(function(err,db){
				if(err){
					console.log(err);
					console.log('连接Mongo数据库失败!');
					logs.write('mongodb','错误:连接Mongo数据库失败,错误信息:'+err);
					res.status(200).send('{"code":-20006,"message":"mongodb error"}');
					res.end();
				}else{
					obj.mongo = db;
					cb(null,'');
				}
			});
		},
		function(j,cb){
			if(conf.redis.使用 != '是'){
				cb(null,'');
				return;
			}
			redisdb.create(function(err,client){
				if(err){
					console.log('连接redis数据库失败!');
					logs.write('err','错误:连接redis数据库失败,错误信息:'+err);
				}else{
					obj.redis = client;
					cb(null,'');
				}
			});
		},
		function(j,cb){
			fiber.run(cb);
		}
	], function (err, result) {

			fiber = null;
			// res.status(200).send(body.send);

			// if(body.send._xhtml != null && body.send._xhtml != '')
			// 	body.func = body.send._xhtml;
			// res.render(body.func,body.send);

			if(body.send._isRander == null){
				if(body.send._xhtml != null && body.send._xhtml != '')
					body.func = body.send._xhtml;
       				res.render(body.func,body.send);
       				res.end();
			}else{
				if(body.send._isExcel != null){ //表格的
					res.setHeader('Content-Type', 'application/vnd.openxmlformats');
					res.setHeader("Content-Disposition", "attachment; filename=" + body.date + "_" + body.startTime + ".xlsx"); //默认名 
					res.end(body.send._isExcel, 'binary'); //'binary'值必须 否则excel打不开
				}else{
					res.status(200).send(body.send._isRander);
					res.end();
				}
			}
			
			body.endTime = new Date().getTime();
			body.Time = body.endTime - body.startTime;
			// body.send.Time = body.Time;
			console.log('---------------------------------');
			console.log('ejs接口:'+body.func+'---运行时间:'+body.Time+'毫秒');
			console.log('---------------------------------');

			if(conf.postgresql.使用 == '是'){
				pgdb.close(obj.pg);
			}

			if(conf.postgresql_two.使用 == '是'){
				pgdb.close_two(obj.pg2);
			}

			if(conf.mongodb.使用 == '是'){
				mongo.close(obj.mongo);//连接释放
			}

			if(conf.redis.使用 == '是'){
				redisdb.destroy(obj.redis);//连接释放
			}

			obj = null;


	})

	




}

main.searchfile = function(fileName){

	var js_file = false;
	var mb_file = false;
	var js_files = fs.readdirSync(__dirname);
	for(var i = 0 ; i < js_files.length ; i++){
		if(js_files[i] == fileName+".js"){
			js_file = true;
			break;
		}
	}


	var path = require("path");
	var html_path = path.resolve(__dirname, '..','www');

	var mb_files = fs.readdirSync(html_path);
	
	for(var i = 0 ; i < mb_files.length ; i++){
		if(mb_files[i] == fileName+".ejs"){
			mb_file = true;
			break;
		}
	}

	if(js_file == true && mb_file == true){
		return true;
	}

	return false;
}


module.exports = main;