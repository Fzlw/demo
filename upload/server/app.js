const express = require('express');
const app = express();
const fs = require('fs');
const uuid = require('uuid')
const multipart = require('connect-multiparty')();
const OSS = require('ali-oss')
const client = new OSS({
    region: 'oss-cn-shenzhen',
    accessKeyId: 'UFGAZspEqAimC09x',
    accessKeySecret: 'Q6dBhf8XGAmhswPzXULQZS4RoNYdx1',
    bucket: 'uncreditbank'
})


// 测试oss-ali 对象储存
async function test() {
    try {
        let list = await client.put('test/liwei', '../test2.jpg');
        console.log(list)
    } catch (error) {
        throw error;
    }
}
// test()



const cors = function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
}
app.use(cors);

app.post('/upload', multipart, function (req, res) {
    // 写入文件
    // let files = req.files;
    // let resArr = [];
    // for (let _file in files) {
    //     let file = files[_file];
    //     console.log(file)
    //     let format = file.name.substring(file.name.lastIndexOf('.') + 1);
    //     let rs = fs.createReadStream(file.path)
    //     let _path = `./${uuid.v4()}.${format}`;
    //     let ws = fs.createWriteStream(_path);
    //     let send = 0;
    //     rs.on('data', chunk => {
    //         ws.write(chunk);
    //         send += chunk.length;
    //         console.log((send / file.size) * 100 + '%')
    //     })
    //     // rs.pipe(ws)
    //     rs.once('close', () => {
    //         console.log('end..............')
    //         ws.end();
    //         resArr.push(_path)
    //     })
    // }
    console.log(req.body)
    console.log(req.files)
    res.send('ok....')
    res.end()
})

app.listen(7001, () => {
    console.log('http server start port 7001')
})