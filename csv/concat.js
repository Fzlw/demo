// 合并json和csv
const readline = require('readline');
const fs = require('fs');
const uuid = require('uuid');
const bankname = require('./bankname');

// 读取文件
const fS = fs.createReadStream('./Book1.csv', 'utf8');

if (!fs.existsSync('./bank.csv')) {
    fs.writeFileSync('./bank.csv')
}
const sW = fs.createWriteStream('./bank.csv', 'utf8')

const read = readline.createInterface({
    input: fS
})

// 读取每一行
read.on('line', (line) => {
    const [name, serviceCode] = line.split(',');
    if (!name || !serviceCode) {
        return;
    }
    const key = getKey(name.trim());
    sW.write(`${uuid.v4()},${name.trim()},${key},${serviceCode},${new Date()},loadByCsv\n`);
})

read.on('close', () => {
    console.log('end.....')
    read.close();
    sW.close()
})


function getKey(name) {
    let res = '';
    for (let key in bankname) {
        const _name = bankname[key];
        if (_name.indexOf(name) !== -1) {
            res = key;
            break;
        }
    }
    return res;
}