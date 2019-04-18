const fs = require('fs')
const readline = require('readline')
const amap = __dirname + '/AMap.csv'
const save = __dirname + '/cityJson.json'
const city = {};

const read = readline.createInterface({
    input: fs.createReadStream(amap, 'utf-8')
})

read.on('line', line => {
    const info = line.split(',')
    city[info[0].trim()] = info[1]
})

read.on('close', () => {
    fs.writeFileSync(save, JSON.stringify(city))
    read.close();
})