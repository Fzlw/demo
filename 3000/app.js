const express = require('express');
const app = express();


app.post('/user/info', function (req, res) {
    res.send('hello /user/info');
})

app.post('/api/user/info', (req, res) => {
    res.send('hello /api/user/info');
})

app.listen(3000, () => console.log('start server on 3000......'))