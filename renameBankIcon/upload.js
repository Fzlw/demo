const path = require('path')
const fs = require('fs')
const tar = path.resolve(__dirname, '../../../../download/bank_icon');
const OSS = require('ali-oss')
const client = new OSS({
    region: 'oss-cn-shenzhen',
    accessKeyId: 'UFGAZspEqAimC09x',
    accessKeySecret: 'Q6dBhf8XGAmhswPzXULQZS4RoNYdx1',
    bucket: 'uncreditbank'
})

async function put(name, place) {
    return await client.put(name, fs.readFileSync(place))
}

async function putStream(name, file) {
    return await client.put(name, file);
}

async function get(prefix) {
    const res = await client.list({
        "prefix": prefix
    })
    console.log(res)
}

async function main() {
    const files = fs.readdirSync(tar)
    for (let f in files) {
        let file = files[f],
            name = file.replace(/\.svg$/g, ''),
            place = path.resolve(tar, file);

        const res= await put('bank/icon/' + name + '.svg', place);
        console.log(res)
    }
}

async function del() {
    const files = fs.readdirSync(tar)
    const names = files.map(name => {
        return 'bank/icon/' + name.replace(/\.svg$/g, '')
    })
    const res = await client.deleteMulti(names, {
        quite: true
    })
    console.log(res)
}

async function ddd(name) {
    return await client.delete(name)
}

// main()
// get('bank/icon')
// del()

// 上传app程序,流式
(async function uploadApp(fileName) {
    const appPath = path.resolve(__dirname, `../../../../static/${fileName}`);
    const readStream = fs.createReadStream(appPath);
    const name = `/creditcard/v0.0.2/1556261350000/${fileName}`;
    return await putStream(name, readStream);
}) //('appself.plist')
get('creditcard')
// ddd('creditcard/v0.0.2/1556261350000/1556188456277.ipa')