# 🤖 CodeCraft Systems — WhatsApp Bot

<div align="center">

```
██████╗ ██████╗ ██████╗ ███████╗ ██████╗██████╗  █████╗ ███████╗████████╗
██╔════╝██╔═══██╗██╔══██╗██╔════╝██╔════╝██╔══██╗██╔══██╗██╔════╝╚══██╔══╝
██║     ██║   ██║██║  ██║█████╗  ██║     ██████╔╝███████║█████╗     ██║
██║     ██║   ██║██║  ██║██╔══╝  ██║     ██╔══██╗██╔══██║██╔══╝     ██║
╚██████╗╚██████╔╝██████╔╝███████╗╚██████╗██║  ██║██║  ██║██║        ██║
 ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝        ╚═╝
```

**بوت واتساب احترافي مدعوم بـ OpenAI + Web Scraping**

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![WhatsApp](https://img.shields.io/badge/WhatsApp-Web.js-25D366)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991)
![Render](https://img.shields.io/badge/Hosted-Render.com-46E3B7)

</div>

---

## ✨ المميزات

| الميزة | التفاصيل |
|--------|----------|
| 🕷️ **Web Scraping** | يجلب المنتجات والأسعار تلقائياً من المتجر |
| 🧠 **OpenAI GPT** | ردود ذكية وممتعة بإيموجيات وقلوب 💜 |
| 🛡️ **Guardrails** | جدار حماية يمنع الردود خارج نطاق المتجر |
| 👨‍💼 **تحويل للبشر** | رسالة انتظار فخمة عند طلب خدمة العملاء |
| 💾 **حفظ الجلسة** | LocalAuth لعدم الحاجة لإعادة المسح |
| 🌐 **Keep-Alive** | HTTP server لإبقاء Render نشطاً |

---

## 📁 هيكل المشروع

```
codecraft-whatsapp-bot/
├── index.js          ← الكود الرئيسي
├── package.json      ← المكتبات والإعدادات
├── render.yaml       ← إعدادات Render تلقائية
├── .env              ← المتغيرات السرية (لا ترفعه!)
├── .gitignore        ← ملفات مستثناة من Git
└── README.md         ← هذا الملف
```

---

## 🚀 طريقة التشغيل

### 1️⃣ التشغيل المحلي (للتطوير)

```bash
# 1. نسخ المشروع
git clone https://github.com/YOUR_USERNAME/codecraft-whatsapp-bot.git
cd codecraft-whatsapp-bot

# 2. تثبيت المكتبات
npm install

# 3. إعداد المتغيرات
cp .env .env.local
# ثم افتح .env وأضف OPENAI_KEY الحقيقي

# 4. تشغيل البوت
npm start
```

**بعد التشغيل:**
- ستظهر QR Code في الطرفية
- افتح واتساب على هاتفك
- اذهب لـ **الإعدادات → الأجهزة المقترنة → ربط جهاز**
- امسح QR Code

---

### 2️⃣ النشر على Render.com ☁️

#### الخطوة 1 — رفع الكود على GitHub

```bash
# إنشاء .gitignore أولاً
echo ".env
node_modules/
session_data/
*.log" > .gitignore

# رفع المشروع
git init
git add .
git commit -m "🚀 Initial commit — CodeCraft WhatsApp Bot"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

#### الخطوة 2 — إنشاء الخدمة في Render

1. سجّل دخول على [render.com](https://render.com)
2. اضغط **New → Web Service**
3. اربط مع الـ GitHub repo
4. Render سيكتشف `render.yaml` تلقائياً ✅

#### الخطوة 3 — إضافة المتغيرات السرية

في لوحة Render، اذهب لـ **Environment**:

| المتغير | القيمة |
|---------|--------|
| `OPENAI_KEY` | `sk-xxxx...` |
| `SUPPORT_NUMBER` | `966501234567` |

#### الخطوة 4 — مسح QR Code من السجلات 📱

> **هذه أهم خطوة عند أول تشغيل!**

1. اذهب لـ **Logs** في لوحة Render
2. انتظر ظهور QR Code (سيبدو هكذا):

```
🔐 ══════════════════════════════════════════
   امسح QR Code لتسجيل الدخول لواتساب
══════════════════════════════════════════

█████████████████████████████████████
█ ▄▄▄▄▄ █▀▀▀▀▀▀▀█▄▄██▀▀█ ▄▄▄▄▄ █
█ █   █ █▀▄ ▄▀▀ ▀█▀█ ▀█ █   █ █
...
```

3. افتح واتساب → **الأجهزة المقترنة**
4. اضغط **ربط جهاز** وامسح الكود

> ⚠️ **مهم:** بعد أول مسح، يتم حفظ الجلسة في الـ Disk. لن تحتاج للمسح مرة أخرى!

---

## 💬 كيف يتصرف البوت

```
المستخدم: مرحبا
   البوت: 🎉 مرحبًا بك في CodeCraft Systems!
          أنا كود بوت — مساعدك الذكي...

المستخدم: ابحث عن برنامج محاسبة
   البوت: 🔍 وجدت هذه المنتجات:
          1. برنامج X — 299 ريال 🔗 رابط
          2. برنامج Y — 199 ريال 🔗 رابط...

المستخدم: تحدث مع موظف
   البوت: ⭐ تحويل لخدمة العملاء
          سيتواصل معك أحد ممثلينا خلال دقائق...

المستخدم: من سيفوز في المونديال؟
   البوت: هذا خارج تخصصي! 😅
          أنا هنا فقط لمنتجات CodeCraft Systems 💜
```

---

## 🔧 تخصيص البوت

### تغيير شخصية البوت
في `index.js`، عدّل `SYSTEM_PROMPT`:
```js
const SYSTEM_PROMPT = `أنت "اسم البوت"...`;
```

### إضافة كلمات محظورة
```js
const OFF_TOPIC_KEYWORDS = [
  "سياسة", "دين", ... // أضف ما تريد
];
```

### تغيير نموذج OpenAI
```js
model: "gpt-4o-mini",  // أو "gpt-4o" للجودة الأعلى
```

---

## ⚠️ ملاحظات مهمة

- 📵 **لا ترسل رسائل جماعية** — يخالف شروط واتساب
- 🔒 **لا ترفع `.env`** على GitHub أبدًا
- 💾 **Render Free Plan** ينام بعد 15 دقيقة من عدم النشاط — استخدم UptimeRobot لإبقائه حياً
- 🔄 **إذا انتهت الجلسة:** احذف مجلد `session_data` وأعد مسح QR

---

## 📞 الدعم

- المتجر: [smart19.zid.store](https://smart19.zid.store)
- البريد: support@codecraft.systems

---

<div align="center">
صُنع بـ 💜 لـ <strong>CodeCraft Systems</strong>
</div>
