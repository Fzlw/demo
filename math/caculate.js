'use strict';

/**
 * Decimal  计算   相关数学方法
 */
const Decimal = require('decimal.js');
Decimal.set({
    precision: 10,
    rounding: 4
});

 module.exports = class Caculate {

    constructor(fixedLength = 2) {
        if(typeof fixedLength === 'number') {
            this.fixedLength = fixedLength
        }
    }

    /**
     *  转换为数字
     */
    toNumber(a, fixedLength) {
        let result = this.toDecimal(a);
        if(this.fixedLength || typeof fixedLength === 'number') {
            result = new Decimal(result.toFixed((fixedLength ||this.fixedLength))).toNumber();
        }
        return result;
    }

    /**
     * 转换为Deimal对象
     */
    toDecimal(p) {
        if(typeof p  === "string" || typeof p === "number") {
            p = new Decimal(p);
        }
        if(!Decimal.isDecimal(p)) {
            throw new Error("param must be number of Decimal Instance")
        }
        return p;
    }
    /**
     * 两个数相加
     */
    add(a, b, fixedLength) {
        a = this.toDecimal(a);
        b = this.toDecimal(b);
        let result = a.add(b).toNumber();
        if(this.fixedLength || typeof fixedLength === 'number') {
            result = new Decimal(result.toFixed((fixedLength ||this.fixedLength))).toNumber();
        }
        return result;
    }

    /**
     * 两个数相减
     */
    sub(a, b, fixedLength) {
        a = this.toDecimal(a);
        b = this.toDecimal(b);
        let result = a.sub(b).toNumber();
        if(this.fixedLength || typeof fixedLength === 'number') {
            result = new Decimal(result.toFixed((fixedLength ||this.fixedLength))).toNumber();
        }
        return result;
    }

    /**
     * 两数相乘
     */
    mul(a, b, fixedLength = 2) {
        a = this.toDecimal(a);
        b = this.toDecimal(b);
        let result = a.mul(b).toNumber();
        if(typeof fixedLength === 'number') {
            result = new Decimal(result.toFixed((fixedLength ||this.fixedLength))).toNumber();
        }
        return result;
    }

    /**
     * 两数相除
     */
    div(a, b, fixedLength = 2) {
        a = this.toDecimal(a);
        b = this.toDecimal(b);
        let result = a.div(b).toNumber();
        if(typeof fixedLength === 'number') {
            result = new Decimal(result.toFixed((fixedLength ||this.fixedLength))).toNumber();
        }
        return result;
    }

    /**
     * 两个数是否相等
     */
    isEqual(a, b) {
        a = this.toDecimal(a);
        b = this.toDecimal(b);
        let result = a.sub(b).toNumber();
        return result === 0;
    }
 }