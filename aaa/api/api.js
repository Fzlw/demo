var Fiber = require('fibers');
var fs = require('fs');
var config = require('../func/config.js');
var pgdb = require('../func/pgdb.js');
var mongo = require('../func/mongo.js');
var redisdb = require('../func/redisdb.js');
var logs = require('../func/logs.js');
var async = require('async');

var api = {};

api.index = function(req,res,body){
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
			pgdb.open(function(err,client){
				if(err){
					console.log('连接pg数据库失败!');
					logs.write('err','错误:连接PG数据库失败,错误信息:'+err);
					res.status(200).send('{"code":-20005,"message":"postgresql error"}');
					res.end();
				}else{
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
			res.status(200).send(body.send);
			res.end();
			body.endTime = new Date().getTime();
			body.Time = body.endTime - body.startTime;
			// body.send.Time = body.Time;
			if(body.Time > 1000){
				logs.write('apiLogs','apiRunning_Timeout_func:'+body.func+'---'+body.Time);
			}
			console.log('---------------------------------');
			console.log('api接口:'+body.func+'---运行时间:'+body.Time+'毫秒');
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

api.searchfile = function(fileName){

	var files = fs.readdirSync(__dirname);
	for(var i = 0 ; i < files.length ; i++){
		if(files[i] == fileName+".js"){
			return true;
		}
	}

	return false;
}


module.exports = api;