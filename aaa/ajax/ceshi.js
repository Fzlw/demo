var cipher = require('../func/cipher.js');
var config = require('../func/config.js');
var pgdb = require('../func/pgdb.js');
var path = require("path");
var fs = require('fs');
var moment = require("moment");
var images = require("images");

module.exports.run = function(body, pg, mo) {
	console.log(1111);
	var f = {};
	f.img_list = "/root/im/www/temp/123123123.png";
	console.log(f.img_list);
	f.widths = 50;
	f.saveurl = '/root/im/www/temp/1231231231111111111.png';
	console.log("第七步开始执行了");
	
	images(f.img_list)                                      //加载图像文件
		.size(f.widths)                          //等比缩放图像到400像素宽
		.save(f.saveurl, {               
		    quality : 50                    //保存图片到文件,图片质量为50
		});
	 console.log("这里执行了吗？");
	fs.unlink(f.img_list, function () {	//fs.unlink 删除用户上传的文件

	});
	console.log("在这个新文件执行第七步1")
}