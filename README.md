# Lacey Skincare — متجر إلكتروني

متجر ثابت (HTML/CSS/JS) بثلاث لغات (العربية، الإنجليزية، الكوردية) مع لوحة تحكم، وخادم اختياري على Cloudflare Workers لحفظ الطلبات والعملاء والخصومات.

## الهيكل

```
.
├── index.html        الصفحة الرئيسية
├── style.css         التصميم
├── lang.js           الترجمات (يُحمَّل أولاً)
├── storage.js        الحالة والإعدادات الافتراضية والحفظ في المتصفح
├── script.js         منطق المتجر ولوحة التحكم
└── worker/
    ├── worker.js             خادم Cloudflare Worker + KV
    └── wrangler.toml.example نموذج الإعداد
```

ترتيب تحميل السكربتات مهم: `lang.js` ← `storage.js` ← `script.js`.

## تشغيل الواجهة

افتح `index.html` مباشرة، أو انشرها عبر GitHub Pages (Settings → Pages → Branch: `main` / root).
لوحة التحكم: أضف `#admin` إلى الرابط.

## نشر الخادم (اختياري)

```bash
cd worker
cp wrangler.toml.example wrangler.toml   # ثم ضع معرّف الـ KV
npx wrangler kv namespace create STORE
npx wrangler secret put ADMIN_PASS
npx wrangler deploy
```

ضع رابط الـ Worker في إعدادات المتجر (خانة «رابط وسيط لتلجرام»).

## الأمان

- لا تضع توكن بوت تلجرام أو كلمات المرور في الكود. أدخلها من لوحة التحكم أو كـ secrets في Cloudflare.
- غيّر كلمة المرور الافتراضية (`1234`) قبل النشر.
