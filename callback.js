const express = require('express');
const axios = require('axios');
const app = express();
const port = 3000; // تأكد أن هذا البورت مفتوح في استضافة Necron

// إعدادات تطبيقك من الصور السابقة
const config = {
    client_id: '6115',
    client_secret: 'egOO4XynHDX9odxw6t5fNc5JjqVXPK S9UuzXTcNn',
    redirect_uri: 'https://code-craft-dhhr.onrender.com/callback' // استبدل your-server-ip برابط الاستضافة أو الـ IP
};

app.get('/callback', async (req, res) => {
    const code = req.query.code;

    if (code) {
        try {
            // تبديل الكود بالتوكن تلقائياً
            const response = await axios.post('https://oauth.zid.sa/oauth/token', {
                grant_type: 'authorization_code',
                client_id: config.client_id,
                client_secret: config.client_secret,
                redirect_uri: config.redirect_uri,
                code: code
            });

            console.log('✅ تم الحصول على التوكن بنجاح:');
            console.log(response.data.access_token);
            
            res.send('<h1>تم الربط بنجاح! افحص الكونسل الآن.</h1>');
        } catch (error) {
            console.error('❌ خطأ في تبديل الكود:', error.response?.data || error.message);
            res.status(500).send('خطأ في عملية الربط');
        }
    } else {
        res.send('لم يتم استلام الكود');
    }
});

app.listen(port, () => {
    console.log(`🚀 سيرفر الـ Callback يعمل على الرابط: ${config.redirect_uri}`);
});
