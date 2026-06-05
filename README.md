# 🏥 MediVoice — Shifoxona Fikr Tizimi

Bemor fikrlarini ovozli va matnli yig'ish tizimi. QR kod orqali anonim feedback.

## 📁 Loyiha tuzilishi

```
medivoice/
├── index.html          ← Bosh sahifa (QR kodlar)
├── css/
│   └── style.css       ← Barcha stillar
├── js/
│   ├── app.js          ← Asosiy logika
│   └── config.js       ← API kalitlar (⚠️ yashirin!)
├── pages/
│   ├── feedback.html   ← Bemor fikr sahifasi
│   └── admin.html      ← Admin panel
└── data/
    ├── medvoice_entities.json
    └── medvoice_feedbacks.json
```

## ⚙️ Sozlash

1. `js/config.js` faylini oching
2. `OPENAI_API_KEY` ga o'z kalitingizni yozing
3. `index.html` ni brauzerda oching

## 🔐 Xavfsizlik

- `js/config.js` faylini **hech qachon GitHub'ga yuklamang**
- `.gitignore` da `js/config.js` allaqachon himoyalangan
- Ishlab chiqarish (production) uchun backend yechim ishlating

## 🎙️ O'zbek tili

Ovoz (Whisper) o'zbek tilini tushunishi uchun `config.js` da:
```js
WHISPER_LANG: 'uz',
```
allaqachon sozlangan.
