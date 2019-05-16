var Fiber = require('fibers');
var fs = require('fs');
var config = require('../func/config.js');
var pgdb = require('../func/pgdb.js');
var mongo = require('../func/mongo.js');
var redisdb = require('../func/redisdb.js');
var logs = require('../func/logs.js');
var cipher = require('../func/cipher.js');
var async = require('async');

var im = {};

// 这个index外部调用的异步操作有fiber.current 和yield?  
// 没有yield 进去的线程不得切换 
im.index = function(body){


	var conf = config.get('app');
	var obj = new Object();

	// 实例化一个fiber对象 等待执行 这里的线程被控制没有切换直至结束，= = 线程里再开线程 这样大丈夫？
	// 当 run()调用的时候，纤程启动，并为回调函数分配新的堆栈， fn会在这个新的堆栈上运行，直到 fn有返回值return或调用 yield()
	var fiber = Fiber(function (cb){
		/**---------pg-------*/
		if(conf.postgresql.使用 == '是'){
			pgdb.start(obj.pg);//数据库事务开始
		}
		/**---------pg-------*/

		var func = require('./'+body.func+'.js');

		// 来源：入口文件apimain.js 中socket套接字接手ws层中的/socket.io路由，由前端发起socket事件，在func中的web_im中onObject方法接手，调用这个groupchat_main.js
		body.send = func.run(body,obj.pg,obj.redis);
		
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
				}else{
					obj.pg = client;
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
			body.endTime = new Date().getTime();
			body.Time = body.endTime - body.startTime;

			if(body.func != 'time'){
				console.log('---------------------------------');
				console.log('IM接口:'+body.func+'---运行时间:'+body.Time+'毫秒');
				console.log('---------------------------------');
			}


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

im.searchfile = function(fileName){

	var files = fs.readdirSync(__dirname);
	for(var i = 0 ; i < files.length ; i++){
		if(files[i] == fileName+".js"){
			return true;
		}
	}

	return false;
}






module.exports = im;