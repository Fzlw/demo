'use strict';

/**
 * 一系列产生随机数的方法
 */
const moment = require('moment');
const arr = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

 let Module = {
     /**
      * 生成 0-1 之间的随机数
      */
     random: () => {
         return Math.random();
     },

     /**
      * 生成指定长度的随机整数
      * @param {Number} numLenght
      */
     randomInt: (numLenght = 6) => {
        let int = parseInt(Module.random() * Math.pow(10, numLenght));
        if ((Number(int) + '').length !== numLenght) {
            return Module.randomInt(numLenght);
        }
        return int;
     },

     /**
     * 生成指定范围内的随机数,默认保留0位小数
     * @param {Number} min
     * @param {Number} max
     * @returns {Number}
     */
    randomRange: (min = 0, max, fixedLen = 0) => {
        const res = (Module.random() * (max - min + 1) + min).toFixed(fixedLen);
        return Number(res);
    },

    /**
     * 生成指定范围内的随机整数
     * @param {Number} min
     * @param {Number} max
     * @returns {Number}
     */
    randomRangeInt: (min = 0, max) => {
        return parseInt(Module.random() * (max - min + 1) + min);
    },

    /**
     * 生成指定长度的由 A-Z a-z 0-9 组成的字符串
     */
    randomWord: (len = 10) => {
        let str = '';
        while(len > 0) {
            const _in = Module.randomRangeInt(0, arr.length - 1);
            str += arr[_in];
            len --;
        }
        return str;
    },

    /**
     * 生成时间戳 + 6位随机数组成的订单号
     */
    randomOrderNo: () => {
        return moment().format('YYYYMMDDHHmmss') + '' + Module.randomInt();
    }
 }

 module.exports = Module;