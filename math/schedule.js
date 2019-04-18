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



const data = everyPeriodSchedule_V3({
    totalAmount: 3000,
    start: moment('2019-04-19').valueOf(),
    end: moment('2019-04-29').valueOf(),
    min: 100,
    max: 1000,
    everyMaxCount: 6,
    bond: 0,
    repayFee: 0.5,
    costFeePercent: 0.1,
    diffDays: 10
})
let cost = 0,
    re = 0;
data.scheduleList.forEach(data => {
    data.forEach(d => {
        if (d.amount > 0) {
            re = Decimal(re).add(d.amount)
        } else {
            cost = Decimal(cost).add(d.amount)
        }
    })
})
console.log(cost.toNumber(), re.toNumber())
console.log(JSON.stringify(data.scheduleList))




function everyPeriodSchedule_V3(options) {
    let {
        totalAmount,
        start,
        end,
        min,
        max,
        everyMaxCount,
        bond,
        repayFee,
        costFeePercent,
        diffDays
    } = options;
    const costFeeCacu = Caculator.add(costFeePercent, 1); // 消费的总手续费
    totalAmount = Caculator.mul(totalAmount, costFeeCacu);
    max = Caculator.sub(max, 0.9); // 单笔最大消费金额 - 固定单笔还款费用

    const count = getCostCountByLimit({
            totalAmount,
            min,
            max,
            diffDays,
            everyMaxCount
        }),
        timeObj = {},
        costArr = [],
        consumeArr = [],
        _min = 1.2 * min,
        consumeLastIndex = ConsumeTypeNames.length - 1;
    let _count = count,
        gatherCostAmount = 0,
        diff = totalAmount;
    // 生成所有的消费记录
    while (_count > 0 && diff > _min) {
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
            diff = Caculator.sub(totalAmount, gatherCostAmount);
            timeObj[date]['count'] += 1;
            _count--;
        }
    }
    // 对最后一笔消费做处理
    // 对最后一笔消费做处理
    costArr[costArr.length - 1] = Caculator.add(
        costArr[costArr.length - 1],
        -diff
    );
    // console.log(costArr.reduce((t,n) => Caculator.add(t, n)))
    // 根据每笔消费时间生成还款记录
    const result = {},
        timeObjKeys = Object.keys(timeObj);
    let startIndex = 0,
        recordCount = 0, // 总执行次数
        allFee = 0; // 总手续费
    timeObjKeys.forEach((key, index) => {
        result[key] = result[key] || [];
        const date = timeObj[key],
            stamp = Random.randomRangeInt(
                moment(key).startOf('days').valueOf(),
                moment(key).endOf('days').valueOf()
            ),
            endIndex = startIndex + date['count'],
            costTemArr = costArr.slice(startIndex, endIndex),
            _sum = costTemArr.reduce((t, n) => Caculator.add(t, n)), // 负数
            sum = Math.abs(_sum),
            actualRepay = Caculator.div(sum, costFeeCacu), // 当天实际还款金额
            newCost = Caculator.add(actualRepay, repayFee), 
            actualCost = Caculator.mul(newCost, costFeeCacu), // 实际消费总额
            diff = Caculator.sub(sum, actualCost),  // 负数
            curFee = Caculator.sub(actualCost, actualRepay); // 当天消费金额的手续费
        costTemArr[endIndex - startIndex - 1] = Caculator.add(
            costTemArr[endIndex - startIndex - 1], diff
        );
        date['times'].push(stamp); // 添加一项时间作为还款时间
        date['times'].sort(); // 时间排序
        result[key] = costTemArr.map((amount, i) => {
            const time = moment(date['times'][i]);
            return {
                date: time.format('YYYY-MM-DD'),
                time: time.format('HH:ss:mm'),
                amount: amount,
                type: consumeArr[startIndex + i],
                name: '消费'
            }
        });
        // 添加还款记录
        const repayTime = moment(date['times'][date['count']]);
        let repayAmount = actualRepay;
        // 最后一笔还款需要加上保证金
        if (index === timeObjKeys.length - 1 && bond) {
            repayAmount = Caculator.add(repayAmount, bond);
        }
        result[key].push({
            date: repayTime.format('YYYY-MM-DD'),
            time: repayTime.format('HH:ss:mm'),
            amount: repayAmount,
            type: ConsumeTypeNames[consumeLastIndex]['name'],
            name: '还款',
            fee: curFee    // 当天手续费 = 当天总消费金额手续费 + 还款固定每笔手续费
        });

        // 修改变量
        startIndex += date['count'];
        recordCount += result[key].length;
        allFee = Caculator.add(allFee, curFee);
    });
    // 最后一笔
    return {
        scheduleList: Object.values(result),
        count: recordCount,
        fee: allFee
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

