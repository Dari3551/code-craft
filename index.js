/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║        CodeCraft Systems — WhatsApp AI Assistant         ║
 * ║     Powered by whatsapp-web.js + OpenAI GPT-4o-mini      ║
 * ╚══════════════════════════════════════════════════════════╝
 */

require("dotenv").config();
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const OpenAI = require("openai");
const axios = require("axios");
const cheerio = require("cheerio");
const http = require("http");
const QRCode = require("qrcode");

// ─── QR State ────────────────────────────────────────────────────────────────
let currentQR = null;       // نص الـ QR الخام
let currentQRImage = null;  // صورة QR بصيغة base64
let botStatus = "starting"; // starting | awaiting_qr | ready | disconnected

// ─── OpenAI Client ───────────────────────────────────────────────────────────
const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

// ─── Store Config ────────────────────────────────────────────────────────────
const STORE_URL = "https://smart19.zid.store";
const STORE_NAME = "CodeCraft Systems";
const SUPPORT_NUMBER = process.env.SUPPORT_NUMBER || "966500000000"; // غيّره لرقم الدعم الحقيقي

// ─── In-Memory Conversation History (per user) ───────────────────────────────
const conversations = new Map(); // userId → [{ role, content }]
const MAX_HISTORY = 10; // آخر 10 رسائل للحفاظ على السياق

// ─── Human Handoff Tracking ──────────────────────────────────────────────────
const humanHandoff = new Set(); // مجموعة المستخدمين الذين طلبوا التحويل للبشر

// ─── WhatsApp Client Setup ───────────────────────────────────────────────────
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: "./.wwebjs_auth" }),
  puppeteer: {
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-gpu",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-default-apps",
      "--disable-sync",
      "--disable-translate",
      "--metrics-recording-only",
      "--mute-audio",
      "--no-default-browser-check",
      "--safebrowsing-disable-auto-update",
    ],
  },
});

// ─── System Prompt (Guardrail) ───────────────────────────────────────────────
const SYSTEM_PROMPT = `أنت مساعد ذكي لمتجر "${STORE_NAME}" الإلكتروني المتخصص في المنتجات التقنية.

🎯 مهمتك الوحيدة: مساعدة العملاء في:
- الاستفسار عن المنتجات وأسعارها وتوافرها
- توجيه العملاء لصفحات المنتجات المناسبة
- الإجابة على أسئلة الشحن والدفع والضمان الخاصة بالمتجر
- الترحيب بالعملاء الجدد وتقديم عروض المتجر

🚫 ما لا تفعله أبداً:
- لا تجب على أسئلة خارج نطاق المتجر (سياسة، دين، علوم، ترفيه، إلخ)
- لا تقدم نصائح طبية أو قانونية أو مالية
- لا تتحدث عن منافسين أو متاجر أخرى
- إذا سُئلت عن شيء غير متعلق بالمتجر، أجب بلطف أنك متخصص فقط في خدمة عملاء ${STORE_NAME}

💜 أسلوبك:
- ودود، احترافي، حماسي للمنتجات التقنية
- استخدم الإيموجيات بشكل معتدل (💜 ⚡ 🛒 ✅ 🚀 🎁)
- الردود موجزة وواضحة باللغة العربية
- عند توفر بيانات المنتج من البحث، اعرضها بتنسيق جميل مع السعر والرابط

رابط المتجر: ${STORE_URL}`;

// ─── Web Scraper: Search Products ────────────────────────────────────────────
async function searchProducts(query) {
  try {
    const searchUrl = `${STORE_URL}/search?q=${encodeURIComponent(query)}`;
    const { data } = await axios.get(searchUrl, {
      timeout: 8000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ar,en;q=0.9",
      },
    });

    const $ = cheerio.load(data);
    const products = [];

    // محاولة استخراج المنتجات من هيكل Zid المتجر
    const selectors = [
      ".product-card",
      ".product-item",
      '[class*="product"]',
      ".item-card",
      '[data-product]',
    ];

    for (const selector of selectors) {
      if ($(selector).length > 0) {
        $(selector)
          .slice(0, 5)
          .each((_, el) => {
            const name =
              $(el).find('[class*="name"], [class*="title"], h3, h4').first().text().trim() ||
              $(el).attr("data-name");
            const priceText =
              $(el).find('[class*="price"], .price, [itemprop="price"]').first().text().trim();
            const price = priceText.replace(/[^\d,.]/g, "").trim();
            const link =
              $(el).find("a").first().attr("href") ||
              $(el).closest("a").attr("href");
            const image = $(el).find("img").first().attr("src") || "";

            if (name && name.length > 2) {
              products.push({
                name,
                price: price || "تواصل للسعر",
                currency: priceText.includes("ر.س") ? "ر.س" : "SAR",
                link: link
                  ? link.startsWith("http")
                    ? link
                    : `${STORE_URL}${link}`
                  : searchUrl,
                image,
              });
            }
          });

        if (products.length > 0) break;
      }
    }

    // fallback: أخذ الروابط العامة من الصفحة
    if (products.length === 0) {
      $("a").each((_, el) => {
        const href = $(el).attr("href") || "";
        const text = $(el).text().trim();
        if (
          href.includes("/products/") &&
          text.length > 3 &&
          products.length < 4
        ) {
          products.push({
            name: text,
            price: "تواصل للسعر",
            currency: "",
            link: href.startsWith("http") ? href : `${STORE_URL}${href}`,
            image: "",
          });
        }
      });
    }

    return products;
  } catch (err) {
    console.error("⚠️  Scraping error:", err.message);
    return [];
  }
}

// ─── Format Products for Message ─────────────────────────────────────────────
function formatProducts(products) {
  if (!products || products.length === 0) return null;

  let msg = `🛒 *نتائج البحث في ${STORE_NAME}:*\n\n`;
  products.forEach((p, i) => {
    msg += `*${i + 1}. ${p.name}*\n`;
    if (p.price && p.price !== "تواصل للسعر") {
      msg += `💰 السعر: ${p.price} ${p.currency}\n`;
    } else {
      msg += `💰 السعر: تواصل للاستفسار\n`;
    }
    msg += `🔗 ${p.link}\n\n`;
  });
  msg += `━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📦 تصفح كامل المتجر: ${STORE_URL}`;
  return msg;
}

// ─── OpenAI Reply Generator ───────────────────────────────────────────────────
async function generateReply(userId, userMessage, productsContext = null) {
  // تهيئة تاريخ المحادثة
  if (!conversations.has(userId)) {
    conversations.set(userId, []);
  }
  const history = conversations.get(userId);

  // إضافة سياق المنتجات إذا توفر
  let contextMessage = userMessage;
  if (productsContext && productsContext.length > 0) {
    const productsSummary = productsContext
      .map(
        (p, i) =>
          `${i + 1}. اسم المنتج: ${p.name} | السعر: ${p.price} ${p.currency} | الرابط: ${p.link}`
      )
      .join("\n");
    contextMessage = `سؤال العميل: ${userMessage}\n\nنتائج البحث في المتجر:\n${productsSummary}\n\nقدم هذه المنتجات للعميل بشكل جذاب مع أسعارها وروابطها.`;
  }

  // إضافة رسالة المستخدم للتاريخ
  history.push({ role: "user", content: contextMessage });

  // الحفاظ على حد أقصى للتاريخ
  if (history.length > MAX_HISTORY * 2) {
    history.splice(0, 2);
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
    max_tokens: 500,
    temperature: 0.7,
  });

  const reply = response.choices[0].message.content;

  // إضافة رد البوت للتاريخ
  history.push({ role: "assistant", content: reply });
  conversations.set(userId, history);

  return reply;
}

// ─── Detect Human Handoff Request ────────────────────────────────────────────
function isHumanHandoffRequest(message) {
  const triggers = [
    "خدمة العملاء",
    "موظف",
    "انسان",
    "إنسان",
    "بشر",
    "تحدث مع",
    "اتصل",
    "مشرف",
    "مدير",
    "شكوى",
    "مشكلة",
    "human",
    "agent",
    "support",
    "كلم احد",
    "كلم أحد",
  ];
  return triggers.some((t) => message.toLowerCase().includes(t.toLowerCase()));
}

// ─── Detect Product Search Intent ────────────────────────────────────────────
function isProductQuery(message) {
  const triggers = [
    "سعر",
    "منتج",
    "أبحث",
    "ابحث",
    "عندكم",
    "عندك",
    "متوفر",
    "توفر",
    "كيف",
    "ألعاب",
    "جهاز",
    "كمبيوتر",
    "لابتوب",
    "هاتف",
    "اكسسوار",
    "ذاكرة",
    "شاشة",
    "كيبورد",
    "ماوس",
    "سماعة",
    "شراء",
    "اشتري",
    "طلب",
    "كارت",
    "gpu",
    "cpu",
    "ram",
    "ssd",
    "روتر",
    "شبكة",
  ];
  return triggers.some((t) => message.toLowerCase().includes(t.toLowerCase()));
}

// ─── Welcome Message ──────────────────────────────────────────────────────────
function getWelcomeMessage(name) {
  return `مرحباً ${name ? "يا *" + name + "*" : ""} وأهلاً بك! 💜⚡

أنا *مساعد ${STORE_NAME}* الذكي، هنا لخدمتك!

يمكنني مساعدتك في:
🛒 الاستفسار عن *المنتجات والأسعار*
📦 معرفة *حالة الطلبات والشحن*
🎁 الاطلاع على *العروض والخصومات*
💳 *طرق الدفع* والضمان

فقط اكتب ما تبحث عنه وسأساعدك فوراً! 🚀
━━━━━━━━━━━━━━━━━━━
🌐 متجرنا: ${STORE_URL}`;
}

// ─── Human Handoff Message ────────────────────────────────────────────────────
function getHandoffMessage() {
  return `شكراً لتواصلك معنا 💜

⏳ *يتم تحويلك لفريق خدمة العملاء الآن...*

سيتواصل معك أحد ممثلينا المتخصصين في أقرب وقت ممكن.

⚡ أوقات الدعم البشري:
🕘 السبت – الخميس: 9 ص – 10 م
🕙 الجمعة: 2 م – 10 م

في حال كان استفساركم عاجلاً، يمكنكم مراسلتنا على:
📧 support@smart19.zid.store

نعتذر عن أي تأخير وشكراً على صبركم! 🙏`;
}

// ─── Main Message Handler ─────────────────────────────────────────────────────
client.on("message", async (msg) => {
  // تجاهل الرسائل الجماعية والحالات والرسائل من البوت نفسه
  if (msg.isGroupMsg || msg.fromMe || msg.type === "status") return;

  const userId = msg.from;
  const userMessage = msg.body?.trim();
  if (!userMessage || userMessage.length === 0) return;

  console.log(`📩 [${new Date().toLocaleTimeString("ar-SA")}] رسالة من ${userId}: ${userMessage}`);

  try {
    // ─── 1. تحويل لفريق البشر ────────────────────────────────
    if (isHumanHandoffRequest(userMessage)) {
      humanHandoff.add(userId);
      await msg.reply(getHandoffMessage());
      console.log(`🔀 تم تحويل ${userId} لخدمة العملاء`);
      return;
    }

    // ─── 2. إعادة تفعيل البوت بعد التحويل ──────────────────
    if (humanHandoff.has(userId)) {
      const resumeTriggers = ["بوت", "مساعد", "ابدأ", "start", "مرحبا", "هلا"];
      if (resumeTriggers.some((t) => userMessage.toLowerCase().includes(t))) {
        humanHandoff.delete(userId);
        conversations.delete(userId);
        await msg.reply(getWelcomeMessage(""));
        return;
      }
      // لا نرد إذا كان المستخدم في وضع التحويل البشري
      return;
    }

    // ─── 3. رسالة الترحيب للمستخدمين الجدد ──────────────────
    const history = conversations.get(userId);
    if (!history || history.length === 0) {
      const contact = await msg.getContact();
      const name = contact.pushname || contact.name || "";
      await msg.reply(getWelcomeMessage(name));
      // تهيئة التاريخ
      conversations.set(userId, []);
      // نستمر ليرد البوت على الرسالة الأولى أيضاً إذا كانت سؤالاً
      if (userMessage.length < 4) return;
    }

    // ─── 4. البحث في المتجر إذا بدا السؤال عن منتج ─────────
    let products = [];
    if (isProductQuery(userMessage)) {
      console.log(`🔍 جاري البحث في المتجر: "${userMessage}"`);
      products = await searchProducts(userMessage);
      console.log(`📦 تم إيجاد ${products.length} منتج`);
    }

    // ─── 5. توليد الرد بالذكاء الاصطناعي ───────────────────
    const aiReply = await generateReply(userId, userMessage, products);
    await msg.reply(aiReply);

    // ─── 6. إرسال قائمة المنتجات منفصلة إذا وُجدت ──────────
    if (products.length > 0) {
      const productsMsg = formatProducts(products);
      if (productsMsg) {
        await new Promise((r) => setTimeout(r, 800)); // تأخير بسيط
        await msg.reply(productsMsg);
      }
    }

    console.log(`✅ تم الرد على ${userId}`);
  } catch (error) {
    console.error(`❌ خطأ في معالجة رسالة ${userId}:`, error.message);

    // رسالة خطأ للمستخدم
    await msg
      .reply(
        `عذراً 😔 حدث خطأ مؤقت. يُرجى إعادة المحاولة.\n\nأو تصفح متجرنا مباشرة: ${STORE_URL} 💜`
      )
      .catch(() => {});
  }
});

// ─── Client Events ────────────────────────────────────────────────────────────
client.on("qr", async (qr) => {
  currentQR = qr;
  botStatus = "awaiting_qr";

  // طباعة في اللوق كما كان
  console.log("\n📲 امسح الـ QR Code التالي بتطبيق واتساب:\n");
  qrcode.generate(qr, { small: true });
  console.log(`\n🌐 أو افتح في المتصفح: http://localhost:${PORT}/qr\n`);
  console.log("⚠️  QR Code صالح لمدة 60 ثانية فقط!\n");

  // توليد صورة base64 للعرض في المتصفح
  try {
    currentQRImage = await QRCode.toDataURL(qr, {
      width: 300,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    });
  } catch (e) {
    console.error("خطأ في توليد صورة QR:", e.message);
  }
});

client.on("ready", () => {
  currentQR = null;
  currentQRImage = null;
  botStatus = "ready";
  console.log("\n╔════════════════════════════════════════╗");
  console.log("║  ✅  CodeCraft WhatsApp Bot — READY!   ║");
  console.log(`║  🌐  Store: ${STORE_URL.padEnd(26)}║`);
  console.log("║  💜  Powered by OpenAI + whatsapp-web  ║");
  console.log("╚════════════════════════════════════════╝\n");
});

client.on("auth_failure", (msg) => {
  console.error("🔐 فشل المصادقة:", msg);
  console.log("🔄 يرجى حذف مجلد .wwebjs_auth وإعادة المسح");
});

client.on("disconnected", (reason) => {
  botStatus = "disconnected";
  console.warn("⚠️  تم قطع الاتصال:", reason);
  console.log("🔄 جاري إعادة الاتصال...");
  setTimeout(() => client.initialize(), 5000);
});

// ─── Keep-Alive HTTP Server (Render.com) ─────────────────────────────────────
const PORT = process.env.PORT || 3000;

const QR_PAGE = (imgSrc) => `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>CodeCraft Bot — ربط واتساب</title>
  <meta http-equiv="refresh" content="20"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;background:#0f0f1a;color:#e2e8f0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem}
    .card{background:#1a1a2e;border:1px solid #2d2d4e;border-radius:16px;padding:2.5rem 2rem;text-align:center;max-width:380px;width:100%}
    h1{font-size:1.4rem;color:#a78bfa;margin-bottom:.4rem}
    .sub{font-size:.85rem;color:#64748b;margin-bottom:1.8rem}
    .qr-wrap{background:#fff;border-radius:12px;padding:16px;display:inline-block;margin-bottom:1.5rem}
    .qr-wrap img{display:block;width:260px;height:260px}
    .badge{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:99px;font-size:.8rem;font-weight:500}
    .badge.waiting{background:#1e293b;color:#f59e0b;border:1px solid #f59e0b44}
    .badge.ready{background:#1e293b;color:#22c55e;border:1px solid #22c55e44}
    .steps{text-align:right;margin-top:1.5rem;border-top:1px solid #2d2d4e;padding-top:1.2rem}
    .step{display:flex;gap:10px;align-items:flex-start;margin-bottom:.75rem;font-size:.85rem;color:#94a3b8}
    .num{background:#2d2d4e;color:#a78bfa;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:.75rem;flex-shrink:0;margin-top:1px}
    .timer{font-size:.75rem;color:#64748b;margin-top:.8rem}
    .ready-msg{padding:2rem 1rem}
    .ready-icon{font-size:3rem;margin-bottom:1rem}
    .ready-title{color:#22c55e;font-size:1.1rem;font-weight:600;margin-bottom:.4rem}
    .ready-sub{color:#64748b;font-size:.85rem}
  </style>
</head>
<body>
<div class="card">
  <h1>💜 CodeCraft Systems</h1>
  <p class="sub">WhatsApp AI Bot</p>

  ${imgSrc ? `
  <div class="qr-wrap">
    <img src="${imgSrc}" alt="QR Code واتساب"/>
  </div>
  <div>
    <span class="badge waiting">⏳ في انتظار المسح</span>
  </div>
  <div class="steps">
    <div class="step"><span class="num">١</span><span>افتح واتساب على هاتفك</span></div>
    <div class="step"><span class="num">٢</span><span>اضغط ⋮ ← <b>الأجهزة المرتبطة</b> ← <b>ربط جهاز</b></span></div>
    <div class="step"><span class="num">٣</span><span>وجّه الكاميرا نحو الـ QR أعلاه</span></div>
  </div>
  <p class="timer">🔄 الصفحة تتجدد تلقائياً كل 20 ثانية</p>
  ` : `
  <div class="ready-msg">
    <div class="ready-icon">✅</div>
    <div class="ready-title">البوت متصل ويعمل!</div>
    <div class="ready-sub">لا حاجة لمسح أي QR<br/>الجلسة محفوظة تلقائياً</div>
  </div>
  <div><span class="badge ready">● نشط</span></div>
  `}
</div>
</body>
</html>`;

const server = http.createServer((req, res) => {
  const url = req.url.split("?")[0];

  // ─── /qr  صفحة الربط ──────────────────────────────────
  if (url === "/qr" || url === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(QR_PAGE(currentQRImage));

  // ─── /qr.png  صورة QR مباشرة ──────────────────────────
  } else if (url === "/qr.png") {
    if (!currentQRImage) {
      res.writeHead(404); res.end("QR not ready");
    } else {
      const buf = Buffer.from(currentQRImage.split(",")[1], "base64");
      res.writeHead(200, { "Content-Type": "image/png" });
      res.end(buf);
    }

  // ─── /health  فحص الحالة ──────────────────────────────
  } else if (url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "ok",
      botStatus,
      qrReady: !!currentQRImage,
      uptime: Math.round(process.uptime()),
      activeConversations: conversations.size,
      timestamp: new Date().toISOString(),
    }));

  } else {
    res.writeHead(302, { Location: "/qr" });
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`🌐 HTTP Server يعمل على المنفذ ${PORT}`);
  console.log(`📲 صفحة ربط واتساب: http://localhost:${PORT}/qr`);
  console.log(`🔗 فحص الحالة:       http://localhost:${PORT}/health\n`);
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
process.on("SIGTERM", async () => {
  console.log("\n🛑 إيقاف البوت...");
  await client.destroy();
  server.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("\n🛑 إيقاف البوت (Ctrl+C)...");
  await client.destroy();
  server.close();
  process.exit(0);
});

// ─── Initialize Bot ───────────────────────────────────────────────────────────
console.log("🚀 جاري تشغيل CodeCraft WhatsApp Bot...");
client.initialize();
