const path = require('path')
const fs = require('fs')
const readline = require('readline');
const bankNameThirdPath = path.resolve(__dirname, '../csv/Book1.csv');
const save = __dirname + '/bank.json';
const result = {};

if (fs.existsSync(save)) {
    fs.writeFileSync(save);
}

const wStream = fs.createWriteStream(save, 'utf8');

const rStream = fs.createReadStream(bankNameThirdPath, 'utf8');
const read = readline.createInterface({
    input: rStream
})

read.on('line', line => {
    const [name, code] = line.split(',');
    if (!name || !code) return;
    result[code] = name.trim();
})

read.on('close', () => {
    wStream.write(JSON.stringify(result))
    wStream.close()
    read.close()
})
