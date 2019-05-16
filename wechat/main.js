let Itchat = require('itchat')
let test = new Itchat()


async function getUuid() {
    try {
        const result = await new Promise((resolve, reject) => {
            test.on('getUuid', (err, uuid) => {
                err && reject(err);
                resolve(uuid)
            })
        })
        console.log(typeof result)
        console.log('000')
    } catch (error) {
        console.log(error)
    }
}
getUuid()