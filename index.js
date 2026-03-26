/**
 * ⚡ CodeCraft Systems - Advanced Enterprise WhatsApp Bot
 * 👨‍💻 Created by: DARI (Made by Dari)
 * 🛡️ Platform: Optimized for Render.com
 * 💠 Version: 4.0.0 (The Ultimate Edition)
 */

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { OpenAI } = require('openai');
const axios = require('axios');
const cheerio = require('cheerio');
const http = require('http');
require('dotenv').config();

// ==========================================
// 1. التكوين الأساسي وهوية المتجر 💠
// ==========================================
const STORE_INFO = {
    NAME: "CodeCraft Systems 💠",
    OWNER: "DARI",
    URL: "https://smart19.zid.store",
    EMAIL: "support@codecraft.com",
    THEME_PURPLE: "💜",
    THEME_BOLT: "⚡",
    THEME_ROCKET: "🚀",
    THEME_BASKET: "🛒",
    CURRENCY: "ر.س"
};

// ==========================================
// 2. قاعدة بيانات السياسات والردود الثابتة
// ==========================================
const STORE_POLICIES = {
    SHIPPING: `📦 *سياسة الشحن والتوصيل:*
نشحن لجميع مدن المملكة العربية السعودية 🇸🇦.
- مدة التوصيل: من 2 إلى 5 أيام عمل.
- التكلفة: تظهر آلياً عند إتمام الطلب حسب مدينتك.
فالك التوفيق! 🚚⚡`,

    WARRANTY: `🛡️ *الضمان والجودة:*
جميع منتجاتنا في ${STORE_INFO.NAME} تخضع لضمان لمدة سنتين ضد العيوب المصنعية.
نضمن لك جودة عالية وخدمة ما بعد البيع تليق بك 💜.`,

    PAYMENT: `💳 *خيارات الدفع المتاحة:*
نوفر لك أسهل وأسرع طرق الدفع:
✅ مدى (Mada)
✅ أبل باي (Apple Pay)
✅ فيزا / ماستركارد
✅ تابي وتمارا (قريباً)
الدفع آمن ومشفر بالكامل عبر المتجر 💠.`,

    HOW_TO_ORDER: `🛒 *خطوات الطلب البسيطة:*
1️⃣ ادخل على الرابط: ${STORE_INFO.URL}
2️⃣ تصفح المنتجات واختر ما يناسبك.
3️⃣ أضف المنتج للسلة واضغط على "إتمام الطلب".
4️⃣ سجل جوالك وأدخل عنوانك.. ومبروك! 🎉🚀`
};

// ==========================================
// 3. كلمات التحويل والتحكم (Keywords)
// ==========================================
const TRIGGERS = {
    START: ['بوت', 'مساعده', 'ابدأ', 'start', 'ستارت', 'يا طويل', 'شغال'],
    HELLO: ['هلا', 'مرحبا', 'السلام', 'سلام', 'يا هلا', 'صباح', 'مساء'],
    HUMAN: ['موظف', 'انسان', 'بشر', 'بشري', 'تحدث مع', 'اتصل', 'مشرف', 'إنسان', 'عملاء', 'خدمة العملاء', 'ابي شخص'],
    STORE: ['متجر', 'رابط', 'موقع', 'وينكم', 'كيف اطلب', 'رابط المتجر'],
    PRICING: ['سعر', 'بكم', 'عندكم', 'بكم هذا', 'قيمة', 'تكلفة']
};

// ==========================================
// 4. نظام أوقات العمل الدقيق (KSA Time)
// ==========================================
function getWorkStatus() {
    const now = new Date();
    // تحويل الوقت لتوقيت السعودية (GMT+3)
    const saudiTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Riyadh" }));
    const day = saudiTime.getDay(); // 0=الأحد, 5=الجمعة
    const hour = saudiTime.getHours();

    let isAvailable = false;
    let message = "";

    if (day === 5) { // يوم الجمعة
        if (hour >= 14 && hour < 22) {
            isAvailable = true;
        } else {
            message = "الجمعة (من 2:00 مساءً إلى 10:00 مساءً)";
        }
    } else { // من السبت إلى الخميس
        if (hour >= 9 && hour < 22) {
            isAvailable = true;
        } else {
            message = "السبت إلى الخميس (من 9:00 صباحاً إلى 10:00 مساءً)";
        }
    }
    return { isAvailable, message };
}

// ==========================================
// 5. محرك البحث الذكي (Zid Store Scraper)
// ==========================================
async function searchProducts(query) {
    try {
        const { data } = await axios.get(`${STORE_INFO.URL}/products?search=${encodeURIComponent(query)}`);
        const $ = cheerio.load(data);
        let results = [];

        $('.product-item').each((i, el) => {
            if (i < 3) {
                results.push({
                    name: $(el).find('.product-title').text().trim(),
                    price: $(el).find('.product-price').text().trim(),
                    link: $(el).find('a').attr('href').startsWith('http') ? 
                          $(el).find('a').attr('href') : STORE_INFO.URL + $(el).find('a').attr('href')
                });
            }
        });
        return results;
    } catch (e) {
        return [];
    }
}

// ==========================================
// 6. تهيئة الذكاء الاصطناعي (OpenAI)
// ==========================================
const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

// ==========================================
// 7. تهيئة عميل الواتساب (إعدادات Render)
// ==========================================
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        // Render يحتاج هذه الإعدادات للعمل في بيئة Linux
        executablePath: '/usr/bin/google-chrome', 
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ],
    }
});

// ==========================================
// 8. معالجة الأحداث والردود (The Logic)
// ==========================================

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log("------------------------------------------");
    console.log("💠 امسح الكود لتشغيل بوت متجر داري:");
    console.log(`🔗 الرابط: https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qr)}&size=300x300`);
    console.log("------------------------------------------");
});

client.on('ready', () => {
    console.log(`✅ ${STORE_INFO.NAME} متصل وجاهز للخدمة!`);
    console.log(`👨‍💻 تم التطوير بواسطة: ${STORE_INFO.OWNER}`);
});

client.on('message', async msg => {
    const chat = await msg.getChat();
    const userMsg = msg.body.toLowerCase().trim();
    const contact = await msg.getContact();

    // ا) ترحيب البداية والاستقبال ✨
    if (TRIGGERS.HELLO.some(k => userMsg.includes(k)) || TRIGGERS.START.some(k => userMsg.includes(k))) {
        return msg.reply(`مرحبا يا هلا واهلا بك! 👋 
أنا مساعد ${STORE_INFO.NAME} الذكي هنا لخدمتك 💠.

أقدر أساعدك في:
📦 البحث عن المنتجات وأسعارها.
🚚 استفسارات الشحن والتوصيل.
👤 التحويل لموظف بشري متخصص.

وش اللي حاب تستفسر عنه اليوم؟ 💜⚡`);
    }

    // ب) التحويل لخدمة العملاء (بشري) 👤
    if (TRIGGERS.HUMAN.some(k => userMsg.includes(k))) {
        const { isAvailable, message } = getWorkStatus();
        let reply = `تواصلنا معنا يسعدنا! 💠 سيتم تحويلك لخدمة العملاء الآن وسيتواصل معك أحد ممثلينا المتخصصين في أقرب وقت ممكن 🚀.

🕒 *أوقات الدعم البشري:*
🗓️ السبت - الخميس: 9:00 ص - 10:00 م
🗓️ الجمعة: 2:00 م - 10:00 م`;

        if (!isAvailable) {
            reply += `\n\n⚠️ *نعتذر جداً عن أي تأخير:* نحن الآن خارج أوقات العمل الرسمية. طلبك مسجل وسنتواصل معك فور عودتنا للعمل. شكراً لصبرك يا غالي! 🙏💜`;
        }
        return msg.reply(reply);
    }

    // ج) البحث عن منتجات المتجر (تلقائي) 🛒
    if (userMsg.length > 2 && (TRIGGERS.PRICING.some(k => userMsg.includes(k)) || userMsg.includes('عندكم'))) {
        const items = await searchProducts(userMsg);
        if (items.length > 0) {
            let res = `بحثت لك ووجدت هذي المنتجات في متجرنا 💠🛒:\n\n`;
            items.forEach(p => {
                res += `🔹 *${p.name}*\n💰 السعر: ${p.price}\n🔗 اطلبه من هنا: ${p.link}\n\n`;
            });
            res += `تبي مساعدة في منتج ثاني؟ 💜⚡`;
            return msg.reply(res);
        }
    }

    // د) سياسات الشحن والدفع 🚚
    if (userMsg.includes('شحن') || userMsg.includes('توصيل')) return msg.reply(STORE_POLICIES.SHIPPING);
    if (userMsg.includes('دفع') || userMsg.includes('ابل باي')) return msg.reply(STORE_POLICIES.PAYMENT);
    if (userMsg.includes('كيف اطلب') || userMsg.includes('طريقة')) return msg.reply(STORE_POLICIES.HOW_TO_ORDER);

    // هـ) الذكاء الاصطناعي (OpenAI) - المحرك الذكي المحمي 🧠
    try {
        const systemPrompt = `
        اسمك: مساعد ${STORE_INFO.NAME} الذكي.
        مهمتك الوحيدة: مساعدة عملاء المتجر في استفسارات المنتجات، الشحن، والضمان.
        
        القيود الصارمة:
        - لا تتحدث في السياسة، الدين، الرياضة، أو أي موضوع خارج المتجر.
        - إذا سئلت عن شيء غير متعلق بالمتجر، اعتذر بلباقة وقل إنك مخصص فقط لخدمة ${STORE_INFO.NAME} 💠.
        - لا تقدم نصائح طبية أو قانونية.
        - استخدم إيموجيات: ⚡, 💠, 🚀, 💜, 🛒 بشكل متوازن.
        - كن لطيفاً جداً وفخوراً بأنك "Made by Dari".
        - رابط المتجر: ${STORE_INFO.URL}.
        `;

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: msg.body }],
            temperature: 0.7
        });

        return msg.reply(completion.choices[0].message.content + "\n\n💠 CodeCraft Systems");
    } catch (e) {
        console.error("AI Error");
        if (userMsg.includes('رابط') || userMsg.includes('موقع')) {
            return msg.reply(`تفضل يا غالي رابط متجرنا الرسمي: ${STORE_INFO.URL} 💠💜`);
        }
    }
});

// ==========================================
// 9. تشغيل السيرفر (Keep Alive) 🚀
// ==========================================
http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot is Active & Optimized for Render! 🚀');
}).listen(process.env.PORT || 8080);

client.initialize();
