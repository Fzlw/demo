// const crypto = require('crypto')
// const path = require('path')
// const fs = require('fs')
// const key = fs.readFileSync(path.resolve(__dirname, './key.pem'), 'ascii');

// const signStr = "merKey=aef012a260f54ac9bae0c4204ff59073&orderDesc=test&orderNo=20180116202928&respCode=0000&respDesc=交易成功&serialNo=20180116202928&status=SUCCESS&transAmt=10.00&transDate=20180116&transId=EBANK_PC_PAY&transInfo=transInfo&transTime=20180116202928&trxNo=77772018011610442691";
// const signed = "0TAo2ay8iJTz6IOB7Lnn8xuMLxKZoDViPdYQ5uUYLrKlrzTOyzOYbpPyP9tL0+f4WFy8nblY83Q698rO5UsS5zBorlLNYwmgQCVy2JVdopJf4o/qr+/HECN2fWfSliSpzY6lpm6SlH66W4gxqd10m+F24MB6vmEM6LcWCUG+VdU=";


// const str = {
//     respDesc: '报文验签失败',
//     sign: '5AF6DB5146D353BBBD403C3B2D3D555F',
//     respCode: 'T005'
// }
// const verifier = crypto.createVerify();
// verifier.update(signStr);
// const res = verifier.verify(key, '5AF6DB5146D353BBBD403C3B2D3D555F');

// console.log(res);





// function getStr(options) {
//     const signArr = [];
//     Object.keys(options).sort().forEach(key => {
//         const data = typeof options[key] === 'object' ?
//             JSON.stringify(options[key]) : options[key];
//         // sign字段和空值的不参与签名
//         if (key !== 'sign' && data) {
//             signArr.push(`${key}=${data}`);
//         }
//     });
//     return signArr.join('&');
// }