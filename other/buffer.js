let fs = require('fs')
let path = require('path')

const img = fs.readFileSync(__dirname, path.resolve('./img'), 'utf8');
const rrr = fs.