const OSS = require('ali-oss')
const client = new OSS({
    region: 'oss-cn-shenzhen',
    accessKeyId: 'UFGAZspEqAimC09x',
    accessKeySecret: 'Q6dBhf8XGAmhswPzXULQZS4RoNYdx1',
    bucket: 'uncreditbank'
})
const fs = require('fs');
const path = require('path')


// 测试oss-ali 对象储存
async function test() {
    try {
        let list = await client.put('test/liwei', '../test2.jpg');
        // let list  = await client.deleteMulti([
        //     'b7b07953-93aa-478a-ba52-d43e28aae8e0/back.jpeg',
        //     'b7b07953-93aa-478a-ba52-d43e28aae8e0/unback.jpeg',
        //     'b7b07953-93aa-478a-ba52-d43e28aae8e0/body.jpeg'
        // ])
        // let list = await client.list({
        //     prefix: 'ce28118f-a239-4296-8d42-d2c487a58ed4',
        //     "max-keys": 10
        // })
        // let list = await client.put('ce28118f-a239-4296-8d42-d2c487a58ed4/ttt.jpg', fs.readFileSync(path.resolve(__dirname, '../test.jpg')))
        console.log(list)
    } catch (error) {
        throw error;
    }
}
test()