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
const data = everyPeriodSchedule_V4({
    totalAmount: 70000,
    start: moment('2019-04-19').valueOf(),
    end: moment('2019-04-29').valueOf(),
    min: 100,
    max: 1000,
    everyMaxCount: 6,
    bond: 0,
    repayFee: 0.5,
    selfCostFee: 0.2,
    diffDays: 10,
    userRate: 0.1,
    couponAmount: 100,
    redisData
})
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
        selfCostFee,
        userRate,
        couponAmount, // 优惠金额
        redisData
    } = options;
    const selfCostRate = Caculator.sub(1, selfCostFee, 5), // 实际可还比例
        minRate = Caculator.sub(1, userRate, 5),
        maxCostAmount = Caculator.div(totalAmount, selfCostRate), // 实际最大消费金额
        count = getCostCountByLimit(options), // 获取消费次数
        consumeLastIndex = ConsumeTypeNames.length - 1;
    let timeObj = {},
        costArr = [],
        consumeArr = [],
        _count = count,
        gatherCostAmount = 0,
        diff = maxCostAmount;
    const start_1 = Date.now()
    while (_count > 0 && diff > min) {
        const stamp = Random.randomRangeInt(start, end),
            date = moment(stamp).format('YYYYMMDD');
        timeObj[date] = timeObj[date] || {};
        timeObj[date]['count'] = timeObj[date]['count'] || 0;
        timeObj[date]['times'] = timeObj[date]['times'] || [];
        if (timeObj[date]['count'] < everyMaxCount) {
            const amount = Random.randomRange(min, max, 1),
                index = Random.randomRangeInt(0, consumeLastIndex);
            costArr.push(-amount);
            timeObj[date]['times'].push(stamp);
            consumeArr.push(ConsumeTypeNames[index]['name']);

            gatherCostAmount = Caculator.add(gatherCostAmount, amount);
            diff = Caculator.sub(maxCostAmount, gatherCostAmount);
            timeObj[date]['count'] += 1;
            _count--;
        }
    }
    console.log(`1-----------------${Date.now() - start_1}ms`)
    // 处理diff,和消费总额相等
    let changeIndex = -1;
    if (diff >= 0) {
        changeIndex = costArr.indexOf(Math.max(...costArr))
    } else {
        changeIndex = costArr.indexOf(Math.min(...costArr))
    }
    costArr[changeIndex] = Caculator.sub(costArr[changeIndex], diff);
    const timeObjKeys = Object.keys(timeObj),
        result = [];
    let recordCount = 0, // 总执行次数
        handlingFee = 0, // 总手续费 
        actualHandlingFee = 0, // 实际所需手续费
        coupon = couponAmount, // 剩余优惠金额
        startIndex = 0;
    const start_2 = Date.now()
    timeObjKeys.forEach(key => {
        const curTimes = timeObj[key]['times'],
            endIndex = startIndex + curTimes.length,
            curCost = costArr.slice(startIndex, endIndex),
            curConsume = consumeArr.slice(startIndex, endIndex);
        const {
            recordList,
            restCouponAmount,
            actualFee,
            allFee
        } = cacuCurCostAndRepay_V4({
            curTimes,
            curCost,
            curConsume,
            coupon,
            selfCostRate,
            minRate,
            repayFee,
            max
        });
        result.push(recordList);
        coupon = restCouponAmount;
        actualHandlingFee = Caculator.add(actualHandlingFee, actualFee);
        handlingFee = Caculator.add(handlingFee, allFee);
        recordCount += recordList.length;
        startIndex = endIndex;
    })
    console.log(`函数调用总时间:${Date.now() - start_2}ms`)
    // 检查剩余优惠金额是否为0  优惠金额不大，暂不用使用递归
    redisData['scheduleList'] = result;
    redisData['count'] = recordCount;
    redisData['fee'] = handlingFee;
    redisData['actualFee'] = actualHandlingFee;
    redisData['coupon'] = Caculator.sub(couponAmount, coupon);
    redisData['userRate'] = Caculator.mul(userRate, 100, 2);
    redisData['userFee'] = repayFee;
    return true;
}

function cacuCurCostAndRepay_V4(options) {
    const {
        curTimes,
        curCost,
        curConsume,
        coupon,
        selfCostRate,
        minRate,
        repayFee,
        max
    } = options;
    // 生成还款时间并排序
    const repayTime = Random.randomRangeInt(
        moment(curTimes[0]).startOf('days').valueOf(),
        moment(curTimes[0]).endOf('days').valueOf()
    )
    curTimes.push(repayTime);
    curTimes.sort();

    let lastIndex = curTimes.length - 1,
        restCouponAmount = coupon, // 剩余优惠券金额
        recordList = [],
        isAddRepayFee = false,
        repayAmount = 0,
        allFee = 0,
        actualFee = 0;
    recordList = curCost.map((amount, index) => {
        let amountAbs = Math.abs(amount),
            actualRepay = Caculator.mul(amountAbs, selfCostRate); // 实际还款金额
        if (!isAddRepayFee) {
            const expectRepay = Caculator.add(actualRepay, repayFee),
                actualCost = Caculator.div(expectRepay, selfCostRate);
            if (actualCost <= max) {
                amountAbs = actualCost;
                isAddRepayFee = true;
            }
        }
        // 计算总手续费
        const fee = Caculator.sub(amountAbs, actualRepay);
        allFee = Caculator.add(allFee, fee);

        if (restCouponAmount && restCouponAmount > 0) {
            let expectMinCost = Caculator.div(actualRepay, minRate),
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
        actualFee
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