const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { OpenAI } = require('openai');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });
const STORE_URL = "https://smart19.zid.store";

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { 
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        handleSIGINT: false 
    }
});

// وظيفة البحث التلقائي في متجرك 🔍
async function searchStore(query) {
    try {
        const searchUrl = `${STORE_URL}/products?search=${encodeURIComponent(query)}`;
        const { data } = await axios.get(searchUrl);
        const $ = cheerio.load(data);
        
        let products = [];
        $('.product-item').each((i, el) => { 
            const name = $(el).find('.product-title').text().trim();
            const price = $(el).find('.product-price').text().trim();
            const link = $(el).find('a').attr('href');
            if (name) products.push({ name, price, link: STORE_URL + link });
        });
        return products.slice(0, 2); 
    } catch (e) { return []; }
}

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('امسح الكود يا داري من الـ Logs في ريندر ⬇️');
});

client.on('ready', () => { console.log('البوت جاهز وشغال يا وحش 🚀💜'); });

client.on('message', async (msg) => {
    const userMessage = msg.body;

    // 1. نظام التحويل للبشر 👤
    const helpKeywords = ['موظف', 'دعم', 'انسان', 'خدمة العملاء', 'كلمني شخص'];
    if (helpKeywords.some(key => userMessage.includes(key))) {
        return msg.reply('✦ ━━━━━━━━━━━━ ✦\n⏳┇أبشر بسعدك! سيتم تحويلك الآن لموظف الخدمة..\n🎧┇انتظرنا ثواني ونكون معك يا غالي 🌌💠\n✦ ━━━━━━━━━━━━ ✦');
    }

    // 2. البحث في المتجر
    const searchResults = await searchStore(userMessage);
    const context = searchResults.length > 0 
        ? `النتائج من المتجر: ${JSON.stringify(searchResults)}` 
        : "لم يتم العثور على منتج محدد.";

    // 3. الرد الذكي
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { 
                    role: "system", 
                    content: `أنت المساعد الذكي لمتجر CodeCraft Systems 💠. 
                    - معلومات من المتجر: ${context}
                    - رد بأسلوب ممتع مع إيموجيات وقلوب 💜⚡.
                    - إذا وجدت منتج، اذكر سعره ورابطه.
                    - لا تجب عن أي شيء خارج نطاق المتجر نهائياً 🚫.
                    - إذا لم تجد منتج، وجهه لرابط المتجر العام: ${STORE_URL}` 
                },
                { role: "user", content: userMessage }
            ],
        });
        msg.reply(response.choices[0].message.content);
    } catch (err) { console.error("AI Error"); }
});

client.initialize();