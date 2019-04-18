const path = require('path')
const fs = require('fs')
const bankName = require(path.resolve(__dirname, './bank.json'));
const tar = path.resolve(__dirname, '../../../../download/bank_icon');

fs.readdir(tar, function (err, files) {
    if (err) {
        console.log(err)
    }
    for (let file in files) {
        let f = files[file];
        let name = f.replace(/\.svg$/g, ''),
            code = find(name),
            oldPath = path.resolve(tar, f),
            newPath = path.resolve(tar, code + '.svg');
        // 改名
        fs.renameSync(oldPath, newPath)
    }
})










function find(name, target = bankName) {
    let code = ''
    for (let c in target) {
        const _name = target[c];
        if (_name === name) {
            code = c;
            break;
        }
    }
    return code;
}