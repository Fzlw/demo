var cipher = require('../func/cipher.js');
var config = require('../func/config.js');
var pgdb = require('../func/pgdb.js');
var path = require("path");
var fs = require('fs');
var moment = require("moment");
//var images = require("images");
module.exports.run = function (body, pg, mo) {
    var f = body;
    var p = {};
    if (!f.img_list) {
        p.状态 = '图片入参为空';
        return p;
    }
    if (!f.widths) {
        f.widths = 50;
    }
    if (!f.heights) {
        f.heights = 50;
    }
    var type = f.img_list.split('.')[1];
    type = "png";
    var dates = moment().format("YYYYMMDDHHmmss");
    var ran = parseInt(Math.random() * 89999 + 10000);
    var newName = dates + ran;

    f.saveurl = './temp/' + newName + "." + type;

    f.burl = 'http://120.79.224.38:9988/temp/' + newName + "." + type;

    var address = __dirname.replace('ajax', "www/temp");

    f.saveurl = path.normalize(address + "/" + newName + "." + type);;

    var saveAddrs = path.normalize(address + "/" + newName + "." + type);

    // if (f.type == "resize") {
    //     images(f.img_list)                                      //加载图像文件
    //         .size(f.widths)                          //等比缩放图像到400像素宽
    //         .save(f.saveurl, {               
    //             quality : 50                    //保存图片到文件,图片质量为50
    //         });
    //     fs.unlinkSync(f.img_list);
    // } else if (f.type == "drop") {
    //     images(images(f.img_list), Number(f.x), Number(f.y), Number(f.widths), Number(f.heights))   //复制图片 x，y。w h
    //         .save(f.saveurl, {               //保存图片到文件,图片质量为50
    //             quality: 50
    //         });
        fs.unlinkSync(f.img_list);
    // }

    // p.name = saveAddrs;
    p.burl = f.url;
    p.状态 = "成功";
    return p;

};
