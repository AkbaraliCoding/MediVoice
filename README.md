# 🏥 MediVoice — Shifoxona Fikr-Mulohaza Tizimi

<div align="center">

![MediVoice](https://img.shields.io/badge/MediVoice-Shifoxona%20Tizimi-0a6b5c?style=for-the-badge&logo=heart&logoColor=white)
![HTML](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)

**Bemorlar ovozi — sifat mezoni**

Har bir shifoxona bo'limi uchun QR kod orqali anonim feedback yig'ish tizimi.
Ovozli yoki matnli fikr — AI avtomatik tahlil qilib, adminlarga yetkazadi.

</div>

---

## ✨ Xususiyatlar

- 📱 **QR kod tizimi** — har bir bo'lim uchun alohida QR kod, chop etish imkoniyati
- 🎙️ **Ovozli feedback** — OpenAI Whisper orqali o'zbek tilida ovozni matnga o'girish
- 🤖 **AI tahlil** — GPT-4o-mini yordamida ijobiy/salbiy/neytral tasnif va xulosa
- 💬 **AI chatbot** — bemorlar uchun shifoxona ma'lumotlari bo'yicha yordamchi
- 🔐 **Admin panel** — login/parol himoyasi, statistika, filter va JSON export
- 📊 **Real-time statistika** — jami fikrlar, ijobiy/salbiy nisbati, o'rtacha baho
- 🌐 **WiFi server** — lokal tarmoqda barcha qurilmalardan foydalanish
- 🔒 **Anonim** — bemorlardan hech qanday shaxsiy ma'lumot talab qilinmaydi

---

## 📁 Loyiha tuzilishi

```
medivoice/
├── index.html              ← Bosh sahifa (QR kodlar va statistika)
├── server.py               ← Lokal WiFi server (Python)
├── css/
│   └── style.css           ← Barcha stillar
├── js/
│   ├── app.js              ← Asosiy logika (Whisper, GPT, feedback)
│   └── config.js           ← API kalitlar ⚠️ (.gitignore da!)
├── pages/
│   ├── feedback.html       ← Bemor fikr bildirish sahifasi
│   ├── admin.html          ← Admin boshqaruv paneli
│   └── login.html          ← Admin kirish sahifasi
└── data/
    ├── medvoice_entities.json   ← Bo'limlar ro'yxati
    └── medvoice_feedbacks.json  ← Fikrlar (localStorage dan export)
```

---

## 🚀 Ishga tushirish

### Talablar
- Python 3.7+
- OpenAI API kaliti ([openai.com](https://platform.openai.com) dan oling)

### 1. Reponi klonlash

```bash
git clone https://github.com/USERNAME/medivoice.git
cd medivoice
```

### 2. API kalitni sozlash

`js/config.js` faylini oching va o'z kalitingizni kiriting:

```js
const MEDVOICE_CONFIG = {
  OPENAI_API_KEY: 'sk-proj-...',   // ← shu yerga
  CHAT_MODEL: 'gpt-4o-mini',
  WHISPER_MODEL: 'whisper-1',
  WHISPER_LANG: 'uz',              // O'zbek tili
};
```

### 3. Serverni ishga tushirish

```bash
python server.py
```

**Birinchi marta ishga tushirganda** admin username va parol o'rnatiladi:

```
══════════════════════════════════════════════════════
   🔐  MediVoice — Admin hisob sozlash
══════════════════════════════════════════════════════

  Username: admin
  Parol: ••••••••
  Parolni tasdiqlang: ••••••••

  ✅ Admin hisob muvaffaqiyatli saqlandi!
```

Keyingi safar so'ramasdan ishga tushadi.

### 4. Brauzerda ochish

```
Shu kompyuterdan:   http://localhost:8080
Boshqa qurilmadan:  http://192.168.x.x:8080   (bir xil WiFi)
```

> Boshqa port ishlatish: `python server.py 8081`

---

## 🖥️ Sahifalar

| Sahifa | URL | Tavsif |
|--------|-----|--------|
| Bosh sahifa | `/` | QR kodlar, statistika |
| Feedback | `/pages/feedback.html?id=kardiologiya` | Bemor fikr bildirish |
| Admin kirish | `/pages/login.html` | Login/parol |
| Admin panel | `/pages/admin.html` | Barcha fikrlar, filterlar |

---

## 🏥 Bo'limlar

Tizimda quyidagi bo'limlar oldindan sozlangan:

| Bo'lim | | Bo'lim | |
|--------|--|--------|--|
| 🫀 Kardiologiya | | 🧠 Nevrologiya | |
| 🔪 Jarrohlik | | 💊 Terapiya | |
| 🌸 Ginekologiya | | 👶 Pediatriya | |
| 🦷 Stomatologiya | | 🔬 Laboratoriya | |
| 🩻 Radiologiya | | 🚨 Shoshilinch yordam | |
| 💉 Dorixona | | 🏥 Umumiy fikr | |

---

## 🔐 Xavfsizlik

> ⚠️ **Muhim:** `js/config.js` faylini hech qachon GitHub'ga yuklamang!

`.gitignore` allaqachon himoyalangan:
```
js/config.js
.admin_auth
```

Admin paroli **SHA-256** hash orqali saqlanadi — hech qachon ochiq ko'rinmaydi.

---

## 🛠️ Texnologiyalar

| Texnologiya | Maqsad |
|-------------|--------|
| HTML / CSS / JS | Frontend |
| Python (http.server) | Lokal server |
| OpenAI Whisper | Ovoz → matn (o'zbek tili) |
| OpenAI GPT-4o-mini | Sentiment tahlil, chatbot |
| QRCode.js | QR kod generatsiya |
| localStorage | Ma'lumotlar saqlash |
| SHA-256 (Web Crypto) | Parol xavfsizligi |

---

## 📄 Litsenziya

MIT License — erkin foydalaning, o'zgartiring, tarqating.

---

<div align="center">
  Made with ❤️ for better healthcare in Uzbekistan 🇺🇿
</div>
