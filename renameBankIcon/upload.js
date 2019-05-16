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
async function uploadApp(fileName, name) {
    const appPath = path.resolve(__dirname, `../../../../static/${fileName}`);
    const readStream = fs.createReadStream(appPath);
    // const name = `/creditcard/v0.0.3/${fileName}`;
    return await putStream(name, readStream);
}
// get('app')
// ddd('creditcard/v0.0.2/1556261350000/appself.plist')
// uploadApp('appself.plist')

async function start() {
    await ddd('app/creditcard/creditcard.plist')
    await ddd('app/creditcard/creditcard.v4.ipa')
    await ddd('app/creditcard/wygj1.apk')
    await uploadApp('creditcard.v4.ipa', '/app/creditcard/creditcard.v4.ipa')
    await uploadApp('creditcard.plist', '/app/creditcard/creditcard.plist')
    await uploadApp('wygj1.apk', '/app/creditcard/wygj1.apk')
    let result = await get('app')
    console.log(result)
}

// start()
