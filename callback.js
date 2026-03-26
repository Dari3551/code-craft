const axios = require('axios');
const express = require('express');
const app = express();

const config = {
    client_id: 'b504fac3-e249-4aef-a5ac-febaacd97e13',
    client_secret: '320232e7adb8f74f35204a5f73d3a00958e26d4688972070e3cd474d04ee0a9a',
    redirect_uri: 'https://code-craft-dhhr.onrender.com/callback'
};

app.get('/callback', async (req, res) => {
    const code = req.query.code;

    try {
        const response = await axios.post('https://accounts.salla.sa/oauth2/token', {
            grant_type: 'authorization_code',
            client_id: config.client_id,
            client_secret: config.client_secret,
            redirect_uri: config.redirect_uri,
            code: code
        });

        console.log('✅ توكن سلة الجديد:', response.data.access_token);
        res.send('تم الربط مع سلة بنجاح!');
    } catch (error) {
        console.error('خطأ:', error.response?.data || error.message);
        res.send('حدث خطأ في الربط');
    }
});

app.listen(process.env.PORT || 3000);
