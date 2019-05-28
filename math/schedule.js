const moment = require('moment');
const Random = require('./random');
const Decimal = require('decimal.js')
const cc = require('./caculate');
const Caculator = new cc(2);
const ConsumeTypeNames = [{
    value: 1,
    name: '百货'
}, {
    value: 2,
    name: '餐饮'
}, {
    value: 3,
    name: '娱乐'
}, {
    value: 4,
    name: '电器'
}, {
    value: 5,
    name: '商超'
}, {
    value: 99,
    name: '其他'
}]


const redisData = {};
const _start = Date.now()
// const data = everyPeriodSchedule_V4({
//     totalAmount: 3000,
//     start: moment('2019-04-19').valueOf(),
//     end: moment('2019-04-22').valueOf(),
//     min: 100,
//     max: 1000,
//     everyMaxCount: 6,
//     bond: 0,
//     repayFee: 0.5,
//     selfCostFee: 0.9,
//     diffDays: 3,
//     userRate: 0.1,
//     couponAmount: 100,
//     redisData
// })
console.log(`总次数:${redisData['count']},总时间:${Date.now() - _start}ms`)
// let cost = 0,
//     re = 0;
// data.scheduleList.forEach(data => {
//     data.forEach(d => {
//         if (d.amount > 0) {
//             re = Decimal(re).add(d.amount)
//         } else {
//             cost = Decimal(cost).add(d.amount)
//         }
//     })
// })
// console.log(cost.toNumber(), re.toNumber())
// console.log(JSON.stringify(data.scheduleList))




function everyPeriodSchedule_V4(options) {
    const {
        totalAmount,
        start,
        end,
        min,
        max,
        everyMaxCount,
        repayFee,
        userFee,
        selfCostFee,
        userRate,
        couponAmount, // 优惠金额
        redisData
    } = options;
    const costArr = [],
        dayArr = [],
        count = getCostCountByLimit(options); // 获取消费次数
    let _count = count,
        diffAmount = totalAmount;
    while (_count-- > 0 && diffAmount > 0) {
        const amount = Random.randomRangeInt(min, max);
        const day = Random.randomRangeInt(0, options.diffDays);
        diffAmount = Caculator.sub(diffAmount, amount);
        costArr.push(amount);
        dayArr.push(day);
    }
    // 消费 diffAmount
    if (diffAmount !== 0) {
        const index = diffAmount > 0 ?
            costArr.indexOf(Math.min(...costArr)) :
            costArr.indexOf(Math.max(...costArr));
        costArr[index] = Caculator.add(costArr[index], diffAmount);
    }
    // 每笔还款金额分组求和
    let date = [];
    dayArr.forEach((day, index) => {
        date[day] = Caculator.add(date[day] || 0, costArr[index]);
    });
    console.log(date, diffAmount)
    date.forEach((e, i) => console.log(i))
    // 拆分每天的还款金额
    let result = [];
    date.forEach((amount, index) => {
        const days = [];
        // 计算消费金额
        const cost = Decimal(amount).add(repayFee).div(selfCostFee);
        if (cost <= max) {
            days.push({
                amount: cost,
                name: '消费'
            }, {
                amount: amount,
                name: '还款'
            });
            result.push(days);
        } else {

        }
    })
    return;






















    // TODO
    // const selfCostRate = Caculator.sub(1, selfCostFee, 5), // 实际可还比例
    //     minRate = Caculator.sub(1, userRate, 5),
    //     maxCostAmount = Caculator.div(totalAmount, selfCostRate), // 实际最大消费金额
    //     count = getCostCountByLimit(options), // 获取消费次数
    //     consumeLastIndex = ConsumeTypeNames.length - 1;
    // const timeObj = {},
    //     costArr = [],
    //     consumeArr = [];
    // let _count = count,
    //     gatherCostAmount = 0,
    //     diff = maxCostAmount;
    // while (_count > 0 && diff >= min) {
    //     const stamp = Random.randomRangeInt(start, end),
    //         date = moment(stamp).format('YYYYMMDD');
    //     timeObj[date] = timeObj[date] || {};
    //     timeObj[date]['count'] = timeObj[date]['count'] || 0;
    //     timeObj[date]['times'] = timeObj[date]['times'] || [];
    //     if (timeObj[date]['count'] < everyMaxCount) {
    //         const amount = Random.randomRange(min, max, 1),
    //             index = Random.randomRangeInt(0, consumeLastIndex);
    //         costArr.push(-amount);
    //         timeObj[date]['times'].push(stamp);
    //         consumeArr.push(ConsumeTypeNames[index]['name']);

    //         gatherCostAmount = Caculator.add(gatherCostAmount, amount);
    //         diff = Caculator.sub(maxCostAmount, gatherCostAmount);
    //         timeObj[date]['count'] += 1;
    //         _count--;
    //     }
    // }
    // // 处理diff,和消费总额相等
    // for (let i = 0; i < costArr.length; i++) {
    //     // 消费金额(负值)
    //     const amount = costArr[i];
    //     if (diff > 0) {
    //         // 最多还可以消费金额(正值)
    //         const maxDiff = Caculator.add(max, amount);
    //         if (maxDiff >= diff) {
    //             costArr[i] = Caculator.sub(amount, diff);
    //             break;
    //         } else {
    //             costArr[i] = Caculator.sub(amount, maxDiff);
    //             diff = Caculator.sub(diff, maxDiff);
    //         }
    //     } else {
    //         // 最多还可以少消费金额(负值)
    //         const minDiff = Caculator.add(amount, min);
    //         // 负值比较
    //         if (minDiff <= diff) {
    //             costArr[i] = Caculator.sub(amount, diff);
    //             break;
    //         } else {
    //             costArr[i] = Caculator.sub(amount, minDiff);
    //             diff = Caculator.sub(diff, minDiff);
    //         }
    //     }
    // }
    // const timeObjKeys = Object.keys(timeObj),
    //     result = [];
    // let recordCount = 0, // 总执行次数
    //     handlingFee = 0, // 总手续费 
    //     actualHandlingFee = 0, // 实际所需手续费
    //     coupon = couponAmount, // 剩余优惠金额
    //     repay_amount = 0, // 总还款金额
    //     startIndex = 0;
    // let ttt = 0;
    // timeObjKeys.forEach(key => {
    //     const curTimes = timeObj[key]['times'],
    //         endIndex = startIndex + curTimes.length,
    //         curCost = costArr.slice(startIndex, endIndex),
    //         curConsume = consumeArr.slice(startIndex, endIndex);
    //     const {
    //         recordList,
    //         restCouponAmount,
    //         actualFee,
    //         allFee,
    //         curRepayAmount
    //     } = cacuCurCostAndRepay_V4({
    //         curTimes,
    //         curCost,
    //         curConsume,
    //         coupon,
    //         selfCostRate,
    //         minRate,
    //         repayFee,
    //         userFee,
    //         max: options.ThirdMax
    //     });
    //     // TEST
    //     const allCost = curCost.reduce((t, n) => Caculator.add(t,n));
    //     const rrr = Caculator.mul(allCost, selfCostRate);
    //     ttt = Caculator.add(ttt, rrr);
    //     // TEST
    //     result.push(recordList);
    //     coupon = restCouponAmount;
    //     actualHandlingFee = Caculator.add(actualHandlingFee, actualFee);
    //     handlingFee = Caculator.add(handlingFee, allFee);
    //     recordCount += recordList.length;
    //     repay_amount = Caculator.add(repay_amount, curRepayAmount, 5);
    //     startIndex = endIndex;
    // })
    // // 检查剩余优惠金额是否为0  优惠金额不大，暂不用使用递归
    // redisData['scheduleList'] = result;
    // redisData['count'] = recordCount;
    // redisData['fee'] = handlingFee;
    // redisData['actualFee'] = actualHandlingFee;
    // redisData['coupon'] = Caculator.sub(couponAmount, coupon);
    // redisData['userRate'] = Caculator.mul(selfCostFee, 100, 2);
    // redisData['userFee'] = repayFee;
    // redisData['repay_amount'] = Caculator.toNumber(repay_amount, 2);
    // return true;
}

function splitCost(amount) {
    const min = 100,
        eCount = 6,
        max = 1000;
    let diff = amount;
    let res = [];
    while (diff > 0) {
        const c = Random.randomRangeInt(min, max);
        diff = Caculator.sub(diff, c);
        res.push(c);
    }
    let ccc = 0;
    // 消除diff
    while (diff !== 0) {
        const diffSymbol = diff > 0;
        const index = diffSymbol ?
            res.indexOf(Math.min(...res)) :
            res.indexOf(Math.max(...res));
        const rest = diffSymbol ? 
            Caculator.sub(max, res[index]) :
            Caculator.sub(res[index], min);
        if (Math.abs(diff) <= rest) {
            res[index] = Caculator.add(res[index], diff);
            diff = 0;
            break;
        } else {
            res[index] = diffSymbol ? 
                Caculator.add(res[index], rest) :
                Caculator.sub(res[index], rest);
            diff = Caculator.sub(diff, rest);
        }
        ccc ++;
        if (ccc > 33) {
            console.log(diff)
        }
        console.log(diff, '--------')
    }
    // 根据每天最大消费次数限制
    let restRes = res.length > eCount ? (res.splice(eCount)).reduce((t, n) => Caculator.add(t, n)) : 0;
    while (restRes !== 0) {
        const index = res.indexOf(Math.min(...res));
        const _diff = Caculator.sub(max, res[index]);
        if (_diff >= restRes) {
            res[index] = Caculator.add(res[index], restRes);
            restRes = 0;
            break;
        } else {
            res[index] = Caculator.add(res[index], _diff);
            restRes = Caculator.sub(restRes, _diff);
        }
        console.log(restRes, '-----213424---')
    }
    return true;
}


for (let i = 0; i < 20; i++) {
    console.log(splitCost(5000), i)
}

function cacuCurCostAndRepay_V4(options) {
    const {
        curCost,
        curConsume,
        coupon,
        selfCostRate,
        minRate,
        repayFee,
        userFee,
        max
    } = options;
    let curTimes = options.curTimes;
    // 对消费还款时间做区间限制
    const {
        cost: [costStart, costEnd],
        repay: [repayStart, repayEnd]
    } = Utils.dateTool.limitScheduleTime(curTimes[0]);
    // 生成消费还款时间并排序
    curTimes = curTimes.map(() => {
        return Random.randomRangeInt(costStart, costEnd);
    });
    curTimes.push(Random.randomRangeInt(
        repayStart, repayEnd
    ));
    curTimes.sort();

    let lastIndex = curTimes.length - 1,
        restCouponAmount = coupon, // 剩余优惠券金额
        recordList = [],
        isAddRepayFee = false,
        repayAmount = 0,
        allFee = 0,
        curRepayAmount = 0, // 当天还款金额
        actualFee = 0;
    recordList = curCost.map((amount, index) => {
        let amountAbs = Math.abs(amount),
            actualRepay = Caculator.mul(amountAbs, selfCostRate, 5); // 实际还款金额
        curRepayAmount = Caculator.add(curRepayAmount, actualRepay, 5);
        if (!isAddRepayFee) {
            const expectRepay = Caculator.add(actualRepay, repayFee),
                actualCost = Caculator.div(expectRepay, selfCostRate);
            if (actualCost <= max) {
                amountAbs = actualCost;
                isAddRepayFee = true;
            } else {
                // 消费金额必须小于三方限定的
                throw new Error(`${actualCost} must be lte ${max}`);
            }
        }
        // 计算总手续费
        const fee = Caculator.sub(amountAbs, actualRepay);
        allFee = Caculator.add(allFee, fee);
        // 优惠券抵扣
        if (restCouponAmount && restCouponAmount > 0) {
            // 消费额 * (1 - 费率) - 还款固定费用 = 还款金额
            const addMinUserFee = Caculator.add(actualRepay, userFee),
                expectMinCost = Caculator.div(addMinUserFee, minRate),
                diff = Caculator.sub(amountAbs, expectMinCost);
            if (restCouponAmount <= diff) {
                amountAbs = Caculator.sub(amountAbs, restCouponAmount);
                restCouponAmount = 0;
            } else {
                amountAbs = Caculator.sub(amountAbs, diff);
                restCouponAmount = Caculator.sub(restCouponAmount, diff);
            }
        }
        repayAmount = Caculator.add(repayAmount, actualRepay);
        // 计算实际手续费
        const _fee = Caculator.sub(amountAbs, actualRepay);
        actualFee = Caculator.add(actualFee, _fee);
        return {
            date: moment(curTimes[index]).format('YYYY-MM-DD'),
            time: moment(curTimes[index]).format('HH:ss:mm'),
            amount: -amountAbs,
            type: curConsume[index],
            name: '消费'
        }
    })
    recordList.push({
        date: moment(curTimes[lastIndex]).format('YYYY-MM-DD'),
        time: moment(curTimes[lastIndex]).format('HH:ss:mm'),
        amount: repayAmount,
        type: ConsumeTypeNames[ConsumeTypeNames.length - 1]['name'],
        name: '还款',
        fee: actualFee
    });
    return {
        recordList,
        restCouponAmount,
        allFee,
        actualFee,
        curRepayAmount
    }
}


function getCostCountByLimit(options) {
    const {
        totalAmount,
        min,
        max,
        diffDays,
        everyMaxCount
    } = options;
    /**
     * 根据单笔最多最少消费限额计算最多最少消费次数
     * 根据天数计算最多最少消费次数
     */
    const M = Math.floor(totalAmount / min),
        N = Math.ceil(totalAmount / max),
        dM = everyMaxCount * diffDays,
        dN = diffDays;
    // 综合判断最多最少消费次数
    const _min = Math.max(N, dN),
        _max = Math.min(M, dM);
    return Random.randomRangeInt(_min, _max);
}