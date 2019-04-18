const express = require('express');
const app = express();


app.post('/user/info', function (req, res) {
    res.send('hello /user/info  3001');
})

app.post('/api/user/info', (req, res) => {
    res.send('hello /api/user/info  3001');
})

app.listen(3001, () => console.log('start server on 3001......'))