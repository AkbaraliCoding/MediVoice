/* =====================================================
   MediVoice — app.js
   Ovoz: OpenAI Whisper API
   ChatBot: OpenAI GPT-4o-mini
   JSON kalitlari:
     medvoice_feedbacks  → foydalanuvchi fikrlari
     medvoice_entities   → bo'limlar ro'yxati
   ===================================================== */

// ─── BO'LIMLAR ────────────────────────────────────────
const DEFAULT_ENTITIES = [
  { id: 'kardiologiya',  icon: '🫀', name: 'Kardiologiya',       desc: 'Yurak kasalliklari bo\'limi',       color: '#e8f5f2' },
  { id: 'nevrologiya',   icon: '🧠', name: 'Nevrologiya',        desc: 'Asab tizimi bo\'limi',               color: '#f0eeff' },
  { id: 'jarrohlik',     icon: '🔪', name: 'Jarrohlik',          desc: 'Operatsiya bo\'limi',                color: '#fff0f0' },
  { id: 'terapiya',      icon: '💊', name: 'Terapiya',           desc: 'Umumiy davolash bo\'limi',           color: '#fff8ee' },
  { id: 'ginekologiya',  icon: '🌸', name: 'Ginekologiya',       desc: 'Ayollar salomatligi bo\'limi',       color: '#ffeef8' },
  { id: 'pediatriya',    icon: '👶', name: 'Pediatriya',         desc: 'Bolalar salomatligi bo\'limi',       color: '#e8f5f2' },
  { id: 'stomatologiya', icon: '🦷', name: 'Stomatologiya',      desc: 'Tish davolash bo\'limi',             color: '#f0faff' },
  { id: 'laboratoriya',  icon: '🔬', name: 'Laboratoriya',       desc: 'Tahlil va tekshirish bo\'limi',      color: '#f5f0ff' },
  { id: 'radiologiya',   icon: '🩻', name: 'Radiologiya',        desc: 'Rentgen va MRI bo\'limi',            color: '#f0f8ff' },
  { id: 'shoshilinch',   icon: '🚨', name: 'Shoshilinch yordam', desc: 'Favqulodda tibbiy yordam',           color: '#fff0f0' },
  { id: 'dorixona',      icon: '💉', name: 'Dorixona',           desc: 'Dori vositalari bo\'limi',           color: '#e8fff0' },
  { id: 'umumiy',        icon: '🏥', name: 'Umumiy fikr',        desc: 'Klinika haqida umumiy baholash',     color: '#f4f2ee' },
];

function getEntities() {
  const stored = localStorage.getItem('medvoice_entities');
  if (!stored) {
    localStorage.setItem('medvoice_entities', JSON.stringify(DEFAULT_ENTITIES));
    return DEFAULT_ENTITIES;
  }
  return JSON.parse(stored);
}

function getFeedbacks() {
  return JSON.parse(localStorage.getItem('medvoice_feedbacks') || '[]');
}

function saveFeedback(fb) {
  const all = getFeedbacks();
  all.unshift(fb);
  localStorage.setItem('medvoice_feedbacks', JSON.stringify(all));
}

function getApiKey() {
  return (typeof MEDVOICE_CONFIG !== 'undefined') ? MEDVOICE_CONFIG.OPENAI_API_KEY : '';
}

// ─── OPENAI WHISPER: OVOZ → MATN ─────────────────────
// MediaRecorder bilan audio yozib olinadi, keyin Whisper API ga yuboriladi

let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

function toggleVoice() {
  isRecording ? stopVoice() : startVoice();
}

async function startVoice() {
  const key = getApiKey();
  if (!key || key.startsWith('sk-XXXX')) {
    showVoiceError('⚠️ config.js da OpenAI API kalitini kiriting');
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];

    // Eng mos format tanlash
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg';

    mediaRecorder = new MediaRecorder(stream, { mimeType });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(audioChunks, { type: mimeType });
      await sendToWhisper(blob, mimeType);
    };

    mediaRecorder.start(200); // har 200ms chunk
    isRecording = true;
    setVoiceBtnState('recording');

  } catch (err) {
    showVoiceError('❌ Mikrofonga ruxsat berilmadi. Brauzer sozlamalarini tekshiring.');
  }
}

function stopVoice() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  isRecording = false;
  setVoiceBtnState('processing');
}

async function sendToWhisper(audioBlob, mimeType) {
  const key = getApiKey();
  const ext = mimeType.includes('webm') ? 'webm' : 'ogg';

  setVoiceStatus('⏳ Ovoz matnga o\'girilmoqda...');

  try {
    const formData = new FormData();
    formData.append('file', audioBlob, `audio.${ext}`);
    formData.append('model', MEDVOICE_CONFIG.WHISPER_MODEL || 'whisper-1');
    if (MEDVOICE_CONFIG.WHISPER_LANG) { formData.append('language', MEDVOICE_CONFIG.WHISPER_LANG); }
    formData.append('response_format', 'json');

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}` },
      body: formData
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'API xatosi');
    }

    const data = await res.json();
    const transcript = data.text?.trim();

    if (transcript) {
      setVoiceTranscript(transcript);
      setVoiceStatus('✅ Ovoz matnga muvaffaqiyatli o\'girildi');
      // Textarea ga avtomatik yoz
      const ta = document.getElementById('fbText');
      if (ta && !ta.value) ta.value = transcript;
    } else {
      setVoiceStatus('⚠️ Ovoz aniqlanmadi, qayta urinib ko\'ring');
    }

  } catch (err) {
    setVoiceStatus('❌ Xato: ' + err.message);
  }

  setVoiceBtnState('idle');
}

function setVoiceBtnState(state) {
  const btn = document.getElementById('voiceBtn');
  const icon = document.getElementById('voiceBtnIcon');
  const text = document.getElementById('voiceBtnText');
  if (!btn) return;

  btn.classList.remove('recording');
  if (state === 'recording') {
    btn.classList.add('recording');
    icon.textContent = '⏹';
    text.textContent = 'To\'xtatish uchun bosing';
  } else if (state === 'processing') {
    icon.textContent = '⏳';
    text.textContent = 'Ishlanmoqda...';
    btn.disabled = true;
  } else {
    icon.textContent = '🎙️';
    text.textContent = 'Ovozli xabar yozish';
    btn.disabled = false;
  }
}

function setVoiceStatus(msg) {
  const el = document.getElementById('voiceStatus');
  const txt = document.getElementById('voiceStatusText');
  if (!el || !txt) return;
  txt.textContent = msg;
  el.classList.add('show');
}

function setVoiceTranscript(text) {
  const el = document.getElementById('voiceTranscript');
  if (!el) return;
  el.textContent = '📝 ' + text;
  el.classList.add('show');
  window._voiceTranscript = text;
}

function showVoiceError(msg) {
  setVoiceStatus(msg);
  setVoiceBtnState('idle');
}

// ─── AI SENTIMENT TAHLIL (OpenAI) ────────────────────
async function analyzeSentiment(text) {
  const key = getApiKey();
  if (!key || key.startsWith('sk-XXXX')) {
    return fallbackSentiment(text);
  }

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: MEDVOICE_CONFIG.CHAT_MODEL || 'gpt-4o-mini',
        max_tokens: 200,
        messages: [
          {
            role: 'system',
            content: 'Sen shifoxona uchun fikr tahlilchisisan. Faqat JSON formatda javob ber, boshqa hech narsa yozma.'
          },
          {
            role: 'user',
            content: `Quyidagi matnni tahlil qil: "${text}"
JSON: {"sentiment": "positive|negative|neutral", "summary": "1 gaplik o'zbekcha xulosa", "tags": ["teglar"]}`
          }
        ]
      })
    });
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || '{}';
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch (e) {
    return fallbackSentiment(text);
  }
}

function fallbackSentiment(text) {
  const lower = text.toLowerCase();
  const pos = ['yaxshi','zo\'r','rahmat','ajoyib','a\'lo','professional','tez','malakali','minnatdor'];
  const neg = ['yomon','shikoyat','sekin','xato','muammo','norozilik','sifatsiz','yoqmadi','kechikdi'];
  const p = pos.filter(w => lower.includes(w)).length;
  const n = neg.filter(w => lower.includes(w)).length;
  return {
    sentiment: p > n ? 'positive' : n > p ? 'negative' : 'neutral',
    summary: text.slice(0, 80) + (text.length > 80 ? '...' : ''),
    tags: []
  };
}

// ─── INDEX SAHIFA ─────────────────────────────────────
function initIndex() {
  const entities = getEntities();
  // QR kod URL: index.html dan pages/feedback.html ga yo'naltirish
  const baseUrl = (window._feedbackBasePath) ||
    window.location.href.replace('index.html', '').replace(/\/$/, '') + '/pages/feedback.html';
  const grid = document.getElementById('deptGrid');

  entities.forEach(e => {
    const url = `${baseUrl}?id=${e.id}`;
    const card = document.createElement('div');
    card.className = 'dept-card';
    card.innerHTML = `
      <div class="dept-icon" style="background:${e.color}">${e.icon}</div>
      <h3>${e.name}</h3>
      <span class="desc">${e.desc}</span>
      <div class="qr-wrap"><div id="qr-${e.id}"></div></div>
      <div class="qr-url">${url.length > 48 ? url.slice(0, 48) + '…' : url}</div>
      <button class="print-btn" onclick="printQR('${e.id}','${e.name}','${url}')">🖨 Chop etish</button>`;
    grid.appendChild(card);

    if (typeof QRCode !== 'undefined') {
      new QRCode(document.getElementById('qr-' + e.id), {
        text: url, width: 140, height: 140,
        colorDark: '#0a6b5c', colorLight: '#f0ede8',
        correctLevel: QRCode.CorrectLevel.H
      });
    }
  });

  document.getElementById('stQrs').textContent = entities.length;
  loadHomeStats();
  // Chatbot faqat feedback.html da — index.html da yo'q
}

function loadHomeStats() {
  const all = getFeedbacks();
  document.getElementById('stTotal').textContent = all.length;
  document.getElementById('stPositive').textContent = all.filter(f => f.sentiment === 'positive').length;
  document.getElementById('stNeg').textContent = all.filter(f => f.sentiment === 'negative').length;
  const rated = all.filter(f => f.rating > 0);
  document.getElementById('stAvg').textContent = rated.length
    ? (rated.reduce((s, f) => s + f.rating, 0) / rated.length).toFixed(1) + '⭐' : '—';
}

function printQR(id, name, url) {
  const win = window.open('', '_blank');
  const canvas = document.querySelector(`#qr-${id} canvas`);
  const img = canvas ? canvas.toDataURL() : '';
  win.document.write(`<!DOCTYPE html><html><head><title>${name} QR</title>
  <style>body{font-family:sans-serif;text-align:center;padding:40px}
  img{width:200px;height:200px;border:2px solid #0a6b5c;border-radius:12px;padding:10px}
  h2{color:#0a6b5c;margin:16px 0 6px;font-size:22px}p{color:#5e706c;font-size:13px}
  .url{font-size:11px;color:#999;margin-top:8px;word-break:break-all}
  @media print{.no-print{display:none}}</style></head><body>
  <img src="${img}"/><h2>${name}</h2>
  <p>QR kodni skanerlang va fikringizni bildiring</p>
  <p class="url">${url}</p>
  <button class="no-print" onclick="window.print()" style="margin-top:20px;padding:10px 28px;background:#0a6b5c;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer">🖨 Chop etish</button>
  </body></html>`);
}

// ─── FEEDBACK SAHIFA ──────────────────────────────────
let selectedRating = 0;

function initFeedback() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id') || 'umumiy';
  const entities = getEntities();
  const entity = entities.find(e => e.id === id) || entities[entities.length - 1];

  document.getElementById('entityIcon').textContent = entity.icon;
  document.getElementById('entityName').textContent = entity.name;
  document.getElementById('entityDesc').textContent = entity.desc;
  document.title = `MediVoice — ${entity.name}`;
  window._currentEntity = entity;
  window._voiceTranscript = '';
  initChat();
}

function setRating(val) {
  selectedRating = val;
  document.querySelectorAll('.star-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i < val);
  });
}

async function submitFeedback() {
  const text = document.getElementById('fbText').value.trim();
  const voice = (window._voiceTranscript || '').trim();
  const finalText = text || voice;

  if (!finalText && selectedRating === 0) {
    alert('Iltimos, baho bering yoki fikr yozing.');
    return;
  }

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Tahlil qilinmoqda...';

  const analysis = finalText ? await analyzeSentiment(finalText) : { sentiment: 'neutral', summary: '', tags: [] };

  const fb = {
    id: Date.now(),
    entityId: window._currentEntity.id,
    entityName: window._currentEntity.name,
    entityIcon: window._currentEntity.icon,
    text: finalText,
    rating: selectedRating,
    sentiment: analysis.sentiment,
    summary: analysis.summary,
    tags: analysis.tags || [],
    hasVoice: !!voice,
    voiceTranscript: voice,
    timestamp: new Date().toISOString(),
    date: new Date().toLocaleString('uz-UZ')
  };

  saveFeedback(fb);
  document.getElementById('fbForm').style.display = 'none';
  document.getElementById('successBox').style.display = 'block';
}

// ─── ADMIN PANEL ──────────────────────────────────────
function initAdmin() {
  renderAdminStats();
  populateFilters();
  renderList();
  // Chatbot faqat feedback.html da — admin.html da yo'q
}

function renderAdminStats() {
  const all = getFeedbacks();
  const rated = all.filter(f => f.rating > 0);
  const avg = rated.length ? (rated.reduce((s, f) => s + f.rating, 0) / rated.length).toFixed(1) : '—';
  document.getElementById('adminStats').innerHTML = `
    <div class="a-stat"><div class="a-stat-num">${all.length}</div><div class="a-stat-lbl">Jami fikrlar</div></div>
    <div class="a-stat"><div class="a-stat-num" style="color:#0a6b3a">${all.filter(f=>f.sentiment==='positive').length}</div><div class="a-stat-lbl">Ijobiy</div></div>
    <div class="a-stat"><div class="a-stat-num" style="color:#c94444">${all.filter(f=>f.sentiment==='negative').length}</div><div class="a-stat-lbl">Salbiy</div></div>
    <div class="a-stat"><div class="a-stat-num">${avg}${avg!=='—'?'⭐':''}</div><div class="a-stat-lbl">O'rt. baho</div></div>
    <div class="a-stat"><div class="a-stat-num" style="color:#c9963a">${all.filter(f=>f.hasVoice).length}</div><div class="a-stat-lbl">Ovozli fikrlar</div></div>`;
}

function populateFilters() {
  const sel = document.getElementById('filterDept');
  getEntities().forEach(e => {
    const opt = document.createElement('option');
    opt.value = e.id; opt.textContent = e.icon + ' ' + e.name;
    sel.appendChild(opt);
  });
}

function renderList() {
  const all = getFeedbacks();
  const search = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const dept   = document.getElementById('filterDept')?.value || '';
  const sent   = document.getElementById('filterSent')?.value || '';
  const type   = document.getElementById('filterType')?.value || '';

  const filtered = all.filter(fb => {
    if (dept && fb.entityId !== dept) return false;
    if (sent && fb.sentiment !== sent) return false;
    if (type === 'voice' && !fb.hasVoice) return false;
    if (type === 'text' && fb.hasVoice) return false;
    if (search && !fb.text?.toLowerCase().includes(search) && !fb.entityName?.toLowerCase().includes(search)) return false;
    return true;
  });

  const list = document.getElementById('feedbackList');
  if (!filtered.length) {
    list.innerHTML = `<div class="empty-state"><div class="icon">📭</div><p>Hozircha fikrlar yo'q</p></div>`;
    return;
  }
  list.innerHTML = filtered.map(fb => `
    <div class="fb-item">
      <div class="fb-item-top">
        <span class="fb-dept-tag">${fb.entityIcon || '🏥'} ${fb.entityName}</span>
        <span class="fb-sentiment sent-${fb.sentiment}">${
          fb.sentiment === 'positive' ? '👍 Ijobiy' :
          fb.sentiment === 'negative' ? '👎 Salbiy' : '➖ Neytral'}</span>
        <span class="fb-time">${fb.date}</span>
      </div>
      ${fb.hasVoice ? '<span class="fb-voice-badge">🎙 Ovozli xabar</span>&nbsp;' : ''}
      ${fb.rating ? `<div class="fb-rating" style="margin-top:6px">${'⭐'.repeat(fb.rating)}${'☆'.repeat(5-fb.rating)} (${fb.rating}/5)</div>` : ''}
      <div class="fb-text" style="margin-top:8px">${fb.text || '<i style="color:var(--muted)">Faqat baho</i>'}</div>
      ${fb.summary ? `<div style="font-size:12px;color:var(--muted);margin-top:6px">🤖 AI xulosa: ${fb.summary}</div>` : ''}
    </div>`).join('');
}

function exportJSON() {
  const blob = new Blob([JSON.stringify(getFeedbacks(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `medvoice_feedbacks_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
}

function clearAll() {
  if (confirm('Barcha fikrlar o\'chirilsinmi? Bu amalni qaytarib bo\'lmaydi.')) {
    localStorage.removeItem('medvoice_feedbacks');
    renderAdminStats();
    renderList();
  }
}

// ─── CHATBOT (GPT-4o-mini) ────────────────────────────
let chatOpen = false;
let chatHistory = [];

const QUICK_QUESTIONS = [
  'Bo\'limlar haqida', 'Qabul vaqtlari', 'Telefon raqamlar',
  'Tahlil narxlari', 'Qanday fikr qoldiraman?',
];

const CHAT_SYSTEM = `Sen MediVoice shifoxonasining AI yordamchisisan. O'zbek tilida samimiy va professional javob berasan. Tibbiy maslahat so'ralsa, albatta mutaxassisga murojaat qilishni tavsiya et.

Shifoxona ma'lumotlari:
- Nomi: MediVoice Shifoxonasi
- Manzil: Toshkent, Yunusobod tumani
- Telefon: +998 71 123 45 67
- Ish vaqti: Dush–Shan 08:00–18:00 | Yakshanba 09:00–15:00
- Shoshilinch: 24/7

Bo'limlar: Kardiologiya 🫀 | Nevrologiya 🧠 | Jarrohlik 🔪 | Terapiya 💊 | Ginekologiya 🌸 | Pediatriya 👶 | Stomatologiya 🦷 | Laboratoriya 🔬 | Radiologiya 🩻 | Shoshilinch yordam 🚨 | Dorixona 💉

Shifokorlar:
- Dr. A. Karimov — Kardiolog, 15 yil tajriba
- Dr. M. Yusupova — Neurolog, 12 yil tajriba
- Dr. B. Toshmatov — Jarroh, 20 yil tajriba
- Dr. S. Rahimova — Ginekolog, 10 yil tajriba
- Dr. N. Xolmatov — Pediatr, 8 yil tajriba

Narxlar: Dastlabki ko'rik 50 000–150 000 so'm | Tahlillar 30 000 dan`;

function toggleChat() {
  chatOpen = !chatOpen;
  document.getElementById('chatbot-panel').classList.toggle('open', chatOpen);
  if (chatOpen && chatHistory.length === 0) {
    addBotMsg('Salom! 👋 Men MediVoice AI yordamchisiman. Shifoxona, bo\'limlar yoki xizmatlar haqida savollaringizga javob berishga tayyorman.');
    renderQuickBtns();
  }
}

function renderQuickBtns() {
  const c = document.getElementById('quickBtns');
  if (!c) return;
  c.innerHTML = QUICK_QUESTIONS.map(q =>
    `<button class="quick-btn" onclick="sendChatMsg('${q}')">${q}</button>`
  ).join('');
}

function addBotMsg(text) {
  const el = document.createElement('div');
  el.className = 'chat-msg bot';
  el.textContent = text;
  document.getElementById('chatMessages').appendChild(el);
  scrollChat();
}

function addUserMsg(text) {
  const el = document.createElement('div');
  el.className = 'chat-msg user';
  el.textContent = text;
  document.getElementById('chatMessages').appendChild(el);
  scrollChat();
}

function showTyping() {
  const el = document.createElement('div');
  el.className = 'chat-typing'; el.id = 'chatTyping';
  el.innerHTML = '<span></span><span></span><span></span>';
  document.getElementById('chatMessages').appendChild(el);
  scrollChat();
  return el;
}

function scrollChat() {
  const m = document.getElementById('chatMessages');
  if (m) m.scrollTop = m.scrollHeight;
}

async function sendChat() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  await sendChatMsg(text);
}

async function sendChatMsg(text) {
  document.getElementById('quickBtns').innerHTML = '';
  addUserMsg(text);
  chatHistory.push({ role: 'user', content: text });

  const typing = showTyping();
  const key = getApiKey();

  try {
    if (!key || key.startsWith('sk-XXXX')) throw new Error('no_key');

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: MEDVOICE_CONFIG.CHAT_MODEL || 'gpt-4o-mini',
        max_tokens: 500,
        messages: [
          { role: 'system', content: CHAT_SYSTEM },
          ...chatHistory
        ]
      })
    });

    if (!res.ok) throw new Error('api_error');
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || 'Javob olinmadi.';

    typing.remove();
    addBotMsg(reply);
    chatHistory.push({ role: 'assistant', content: reply });

  } catch (err) {
    typing.remove();
    if (err.message === 'no_key') {
      addBotMsg('⚠️ config.js da OpenAI API kalitini kiriting, keyin chatbot ishlaydi.');
    } else {
      addBotMsg('Kechirasiz, hozir ulanishda muammo bor. +998 71 123 45 67 ga qo\'ng\'iroq qiling.');
    }
  }

  setTimeout(renderQuickBtns, 400);
}

function initChat() { /* lazy — first open da ishga tushadi */ }