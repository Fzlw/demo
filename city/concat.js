const fs = require('fs')
// const uuid = require('uuid/v1')
const readline = require('readline')
const amap = require(__dirname + '/cityJson.json');
const third = __dirname + '/service.csv';
const savePath = __dirname + '/cityinfo.csv';

function getId() {
    function S4() {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    }
    return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}

if (!fs.existsSync(savePath)) {
    fs.writeFileSync(savePath)
}

const wS = fs.createWriteStream(savePath, 'utf-8')

const read = readline.createInterface({
    input: fs.createReadStream(third, 'utf-8')
})

read.on('line', line => {
    const info = line.split(','),
        city = info[2].replace(/\s*/g, ''),
        city_cdoe = info[0].toString().trim();
        // id, province, district, adcode, city_cdoe, 
    const column = `${getId()},${info[1]},${city},${amap[city] || null},${city_cdoe},1,2019/04/11,loadByCsv\n`;
    wS.write(column)
})

read.on('close', () => {
    read.close()
    wS.close()
})