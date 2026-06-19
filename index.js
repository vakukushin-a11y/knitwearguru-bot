const express = require("express");
const OpenAI = require("openai");
const app = express();
app.use(express.json());
app.use("/img", express.static(__dirname + "/img"));

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.OPENAI_BASE_URL || "https://routerai.ru/api/v1";
const API_KEY = process.env.OPENAI_API_KEY || "";
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const MAX_TOKEN = process.env.MAX_BOT_TOKEN || "";
const HOST = process.env.HOST || `http://localhost:${PORT}`;
const fs = require("fs");

const openai = new OpenAI({ baseURL: BASE_URL, apiKey: API_KEY });
const DESIGNER = "Ирина Кукушина";
const PHONE = "+7 922 20 19 19 9";

// ── News ─────────────────────────────────────────────────────────────────
const NEWS = [
  { date: "19.06.2026", title: "Тренды лета 2026: трикотаж в центре внимания", text: "Ажурные платья и лёгкие кардиганы ручной вязки становятся главным выбором сезона. Российские дизайнеры делают ставку на натуральные материалы.", source: "Мода 24/7" },
  { date: "16.06.2026", title: "Российские фабрики наращивают выпуск пряжи", text: "По данным Минпромторга, производство пряжи для трикотажа в РФ выросло на 18% за первое полугодие 2026 года.", source: "РИА Новости" },
  { date: "12.06.2026", title: "Московская неделя моды: трикотажные коллекции", text: "На Moscow Fashion Week 2026 более 30% показов включали трикотажные изделия. Свитеры и кардиганы — главные хиты.", source: "Мода 24/7" },
  { date: "08.06.2026", title: "Машинное вязание: новый тренд среди дизайнеров", text: "Всё больше российских дизайнеров приобретают вязальные машины для авторских коллекций малых тиражей.", source: "InterModa" },
  { date: "03.06.2026", title: "Экспорт российского трикотажа: рост на 22%", text: "Российские производители увеличили экспорт в страны СНГ и Азии. Качество и цена делают трикотаж конкурентоспособным.", source: "РИА Новости" },
];

// ── Encyclopedia ──────────────────────────────────────────────────────────
const ENCYCLOPEDIA = {
  "джемпер": "Джемпер — верхнее трикотажное изделие с длинными рукавами без застёжки. Тоньше свитера, без высокого воротника. Материалы: шерсть, меринос, хлопок, акрил. Появился у английских рыбаков XIX века. Для офиса и casual.",
  "свитер": "Свитер — тёплое вязаное изделие с длинными рукавами и высоким воротником. Теплее джемпера. Aran sweater из Ирландии — мировая икона. Материалы: шерсть, меринос, кашемир.",
  "кардиган": "Кардиган — вязаная кофта с застёжкой спереди. Назван в честь лорда Кардигана (Крымская война, 1850-е). Материалы: шерсть, хлопок, акрил, вискоза. Носят круглый год.",
  "кашемир": "Кашемир — пух горной козы, ценнейшая пряжа. С одной козы — 150–200 г в год. Мягкий, тёплый, лёгкий. Уход: ручная стирка 30°C, сушить горизонтально.",
  "меринос": "Меринос — шерсть овцы-мериноса. Тонкое, мягкое волокно, не колется. Одна овца даёт до 10 кг в год. Дышит, согревает во влажном состоянии.",
  "шерсть": "Шерсть — натуральное волокно. Отлично согревает, дышит, отводит влагу. Разлагается в почве за ~5 лет. Требует деликатной стирки при 30°C.",
  "акрил": "Акрил — синтетическое волокно. Лёгкий, не колется, держит форму. В ателье ЗАВЯЗЬ: смесь 50% акрил + 50% шерсть — оптимальный баланс.",
  "вискоза": "Вискоза — искусственное волокно из целлюлозы. Мягкая, блестящая, «летний» материал. Хорошо дышит. Требует деликатного ухода.",
  "хлопок": "Хлопок — натуральное растительное волокно. Гипоаллергенный, дышит. Для чувствительной кожи и лета. В ателье: 50% хлопок + 50% акрил.",
  "стирк": "Стирайте ВРУЧНУЮ при 30°C. Средства для шерсти. Не выкручивайте — отожмите через полотенце. Сушите ГОРИЗОНТАЛЬНО. Храните сложенными!",
  "уход": "Трикотаж: ручная стирка 30°C, сушка горизонтально, хранение сложенным. Кашемир/шерсть — только руками. Акрил/хлопок — деликатный режим.",
  "плать": "Трикотажное платье — цельное изделие от плеч до бёдер. Тянется лучше тканого. Материалы: вискоза, хлопок, шерсть. В моду вошло в 1920-х.",
  "туник": "Туника — длинный вязаный топ, покрывающий бёдра. С леггинсами или как платье. Хлопок, вискоза. Древнейший предмет одежды — ещё в Риме.",
  "палантин": "Палантин — широкий шарф-накидка (~50×200 см). На плечах, шее или как шаль. Шерсть, кашемир. Из Персии, в Европе с XVIII века.",
  "снуд": "Снуд — шарф-труба без концов. Не развязывается, не путается. Шерсть, акрил, мохер. Появился в 1970-х.",
  "плед": "Плед — вязаное полотно для уюта. Украшает интерьер, согревает. Шерсть, акрил, мохер. Из Шотландии (plaid — одеяло), в интерьерах с XIX века.",
};

app.use("/img", express.static(__dirname + "/img"));

// ── Products & Prices ────────────────────────────────────────────────────
const PRODUCTS = [
  { name: "Кардиганы", price: "от 6 500 ₽", img: "kb-img-4.png" },
  { name: "Платья", price: "от 6 500 ₽", img: "kb-img-5.png" },
  { name: "Джемперы", price: "от 6 000 ₽", img: "kb-img-6.png" },
  { name: "Свитеры", price: "от 6 000 ₽", img: "kb-img-7.png" },
  { name: "Туники", price: "от 6 000 ₽", img: "kb-img-10.png" },
  { name: "Палантины", price: "от 3 000 ₽", img: "kb-img-12.jpg" },
  { name: "Пледы", price: "от 2 500 ₽", img: "kb-img-14.png" },
  { name: "Косынки", price: "от 2 500 ₽", img: "kb-img-15.png" },
  { name: "Шарфы и шапки", price: "от 1 200 ₽", img: "kb-img-8.jpg" },
  { name: "Снуды", price: "от 1 200 ₽", img: "kb-img-9.jpg" },
];

app.get("/api/products", (_, res) => res.json(PRODUCTS));

// ── Health & API routes ───────────────────────────────────────────────────
app.get("/", (_, res) => res.send("ZAVYAZ Bots OK"));
app.get("/api/health", (_, res) => res.json({ status: "ok" }));
app.get("/api/news", (_, res) => res.json(NEWS));
app.get("/api/encyclopedia", (_, res) => res.json(ENCYCLOPEDIA));

// ── Helpers ───────────────────────────────────────────────────────────────
async function askAI(question, isEncyclopedia = false) {
  try {
    const systemPrompt = isEncyclopedia
      ? "Ты — энциклопедия трикотажа. Отвечай на русском: пряжа, вязание, изделия, уход. Стиль: дружелюбный, экспертный, с эмодзи."
      : "Ты — консультант ателье «ЗАВЯЗЬ». Отвечай кратко, по делу. Ателье вяжет на заказ. Телефон дизайнера Ирины: +7 922 20 19 19 9. Сайт: zavyz.ru";
    const resp = await openai.chat.completions.create({
      model: "deepseek/deepseek-chat",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: question }],
      max_tokens: isEncyclopedia ? 600 : 400,
    });
    return resp.choices[0]?.message?.content || "Не смог ответить.";
  } catch (e) { console.error("AI:", e.message); return isEncyclopedia ? findEncyclopediaAnswer(question) || "Задайте вопрос о трикотаже — джемпер, свитер, кашемир, шерсть..." : "Ошибка. Попробуйте позже."; }
}

function findEncyclopediaAnswer(q) {
  const lc = q.toLowerCase();
  for (const [key, answer] of Object.entries(ENCYCLOPEDIA)) if (lc.includes(key)) return answer;
  return null;
}

function encIntro() {
  const facts = ["🐑 Овца меринос даёт до 10 кг шерсти в год.", "📍 «Кардиган» — от лорда Кардигана, 1854 г.", "🦙 Кашемир: 150–200 г с козы в год.", "💡 Коко Шанель ввела трикотаж в моду в 1920-х."];
  const fact = facts[Math.floor(Math.random() * facts.length)];
  return `🧶 <b>Энциклопедия трикотажа</b>\n\nЯ расскажу о пряже, изделиях, уходе и истории!\n\n✨ <b>Факт:</b> ${fact}\n\n<b>Что спросить:</b>\n• Чем джемпер отличается от свитера?\n• Что теплее — шерсть или акрил?\n• Как стирать кашемир?\n• Расскажи о кардигане\n• Какой состав лучше для зимы?\n\nПросто напишите вопрос!`;
}

// ── Telegram Bot ──────────────────────────────────────────────────────────
async function telegramBot() {
  if (!TG_TOKEN) { console.log("TG disabled"); return; }
  const API = `https://api.telegram.org/bot${TG_TOKEN}`;
  let offset = 0;

  async function tgSend(chatId, text, keyboard) {
    const body = { chat_id: chatId, text, parse_mode: "HTML" };
    if (keyboard) body.reply_markup = { inline_keyboard: keyboard };
    await fetch(`${API}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
  }

  function menu() { return [[{ text: "📋 Заказать", callback_data: "order" }, { text: "🧶 Энциклопедия", callback_data: "encyclopedia" }], [{ text: "📰 Новости", callback_data: "news" }, { text: "📞 Позвонить", callback_data: "contact" }]]; }
  function encMenu() { return [[{ text: "↩️ Меню", callback_data: "menu" }, { text: "🧶 Спросить ещё", callback_data: "encyclopedia" }]]; }
  function catMenu() { const rows = []; for (let i = 0; i < PRODUCTS.length; i += 2) rows.push(PRODUCTS.slice(i, i + 2).map(p => ({ text: p.name, callback_data: "cat:" + p.name }))); rows.push([{ text: "↩️ Меню", callback_data: "menu" }]); return rows; }

  async function tgSendPhoto(chatId, filePath, caption) {
    const form = new FormData();
    form.append("chat_id", chatId);
    form.append("photo", new Blob([fs.readFileSync(filePath)]), require("path").basename(filePath));
    if (caption) form.append("caption", caption);
    await fetch(`${API}/sendPhoto`, { method: "POST", body: form }).catch(() => {});
  }

  const encSessions = new Set();
  console.log("TG bot started");
  while (true) {
    try {
      const resp = await fetch(`${API}/getUpdates?offset=${offset}&timeout=30`);
      const data = await resp.json();
      if (!data.ok || !data.result) { await new Promise(r => setTimeout(r, 2000)); continue; }
      for (const u of data.result) {
        offset = u.update_id + 1;
        if (u.callback_query) {
          const cb = u.callback_query;
          const cid = cb.message.chat.id;
          await fetch(`${API}/answerCallbackQuery?callback_query_id=${cb.id}`);
          if (cb.data === "news") { encSessions.delete(cid); const t = NEWS.map(n => `📅 ${n.date} · ${n.source}\n<b>${n.title}</b>\n${n.text}`).join("\n\n"); await tgSend(cid, `📰 <b>Новости</b>\n\n${t}`, menu()); }
          else if (cb.data === "contact") { encSessions.delete(cid); await tgSend(cid, `${DESIGNER} — дизайнер ателье «ЗАВЯЗЬ»\n\n📞 ${PHONE}`, menu()); }
          else if (cb.data === "order") { encSessions.delete(cid); await tgSend(cid, "Выберите изделие 👇", catMenu()); }
          else if (cb.data.startsWith("cat:")) { const name = cb.data.slice(4); const p = PRODUCTS.find(x => x.name === name); if (p) { await tgSendPhoto(cid, __dirname + "/img/" + p.img, `${p.name}\n${p.price}\n\n📞 Для заказа: ${PHONE}`); await tgSend(cid, "Что ещё интересует?", menu()); } }
          else if (cb.data === "menu") { encSessions.delete(cid); await tgSend(cid, "Главное меню:", menu()); }
          else if (cb.data === "encyclopedia") { encSessions.add(cid); await tgSend(cid, encIntro(), encMenu()); }
        } else if (u.message?.text) {
          const cid = u.message.chat.id; const text = u.message.text.trim();
          if (text === "/start") { await tgSend(cid, "Добро пожаловать в ателье «ЗАВЯЗЬ»! 🧶\n\nЯ помогу с выбором трикотажа, расскажу о пряже и материалах.", menu()); }
          else if (encSessions.has(cid)) { const a = await askAI(text, true); await tgSend(cid, a, encMenu()); }
          else { const a = await askAI(text); await tgSend(cid, a, menu()); }
        }
      }
    } catch (e) { await new Promise(r => setTimeout(r, 3000)); }
  }
}

// ── MAX Bot ───────────────────────────────────────────────────────────────
async function maxBot() {
  if (!MAX_TOKEN) { console.log("MAX disabled"); return; }
  const API = "https://platform-api.max.ru";
  let marker = null;

  async function mxSend(userId, text, keyboard) {
    const url = new URL(`${API}/messages`); url.searchParams.set("user_id", userId);
    const body = { text };
    if (keyboard) body.attachments = [keyboard];
    await fetch(url.toString(), { method: "POST", headers: { Authorization: MAX_TOKEN, "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
  }

  function menu() { const rows = [[{ type: "callback", text: "📋 Заказать", payload: "order" }, { type: "callback", text: "🧶 Энциклопедия", payload: "encyclopedia" }], [{ type: "callback", text: "📰 Новости", payload: "news" }, { type: "callback", text: "📞 Позвонить", payload: "contact" }]]; return { type: "inline_keyboard", payload: { buttons: rows } }; }
  function encMenu() { return { type: "inline_keyboard", payload: { buttons: [[{ type: "callback", text: "↩️ Меню", payload: "menu" }, { type: "callback", text: "🧶 Спросить ещё", payload: "encyclopedia" }]] } }; }
  function catMenu() { const rows = []; for (let i = 0; i < PRODUCTS.length; i += 2) rows.push(PRODUCTS.slice(i, i + 2).map(p => ({ type: "callback", text: p.name, payload: "cat:" + p.name }))); rows.push([{ type: "callback", text: "↩️ Меню", payload: "menu" }]); return { type: "inline_keyboard", payload: { buttons: rows } }; }

  const encSessions = new Set();
  async function mxSendPhoto(userId, url) {
    const u = new URL(`${API}/messages`); u.searchParams.set("user_id", userId);
    await fetch(u.toString(), { method: "POST", headers: { Authorization: MAX_TOKEN, "Content-Type": "application/json" }, body: JSON.stringify({ attachments: [{ type: "image", payload: { url } }] }) }).catch(() => {});
  }

  // Verify connection first
  const meResp = await fetch(`${API}/me`, { headers: { Authorization: MAX_TOKEN } }).catch(() => null);
  if (!meResp || !meResp.ok) {
    console.log("MAX bot: /me failed - token invalid or API unreachable");
    return;
  }
  const me = await meResp.json().catch(() => null);
  console.log("MAX bot started:", me?.username || me?.name || "OK");
  while (true) {
    try {
      const params = { timeout: 30, limit: 100 }; if (marker !== null) params.marker = marker;
      const qs = Object.entries(params).map(([k,v]) => `${k}=${v}`).join("&");
      const resp = await fetch(`${API}/updates?${qs}`, { headers: { Authorization: MAX_TOKEN } });
      const data = await resp.json();
      if (!data.updates) { console.log("MAX poll: no updates field, response:", JSON.stringify(data).slice(0, 200)); }
      if (data.marker) marker = data.marker;
      for (const u of data.updates || []) {
        if (u.update_type === "message_callback") { console.log("MAX callback FULL:", JSON.stringify(u.callback)); }
        if (u.update_type === "bot_started" && u.user) {
          await mxSend(u.user.user_id, "Добро пожаловать в ателье «ЗАВЯЗЬ»! 🧶\n\nЯ помогу с выбором трикотажа, расскажу о пряже. Что интересует?", menu());
        } else if (u.update_type === "message_created" && u.message?.body?.text) {
          const uid = u.message.sender.user_id; const text = u.message.body.text.trim();
          if (encSessions.has(uid)) { const a = await askAI(text, true); await mxSend(uid, a, encMenu()); }
          else { const a = await askAI(text); await mxSend(uid, a, menu()); }
        } else if (u.update_type === "message_callback" && u.callback) {
          const uid = u.callback.user.user_id; const p = u.callback.payload || u.callback.data || "";
          if (p === "news") { encSessions.delete(uid); const t = NEWS.map(n => `📅 ${n.date} · ${n.source}\n${n.title}\n${n.text}`).join("\n\n"); await mxSend(uid, `📰 Новости\n\n${t}`, menu()); }
          else if (p === "contact") { encSessions.delete(uid); await mxSend(uid, `${DESIGNER} — дизайнер ателье «ЗАВЯЗЬ»\n\n📞 ${PHONE}`, menu()); }
          else if (p === "order") { encSessions.delete(uid); await mxSend(uid, "Выберите изделие 👇", catMenu()); }
          else if (p.startsWith("cat:")) { const name = p.slice(4); const prod = PRODUCTS.find(x => x.name === name); if (prod) { await mxSend(uid, `${prod.name}\n${prod.price}\n\n📞 Для заказа: ${PHONE}`); const cdnUrl = "https://cdn.jsdelivr.net/gh/vakukushin-a11y/zavyaz-site@main/" + prod.img; await mxSendPhoto(uid, cdnUrl); await mxSend(uid, "Что ещё интересует?", menu()); } }
          else if (p === "menu" || p === "menu:main") { encSessions.delete(uid); await mxSend(uid, "Главное меню:", menu()); }
          else if (p === "encyclopedia") { encSessions.add(uid); await mxSend(uid, encIntro(), encMenu()); }
        }
      }
    } catch (e) { await new Promise(r => setTimeout(r, 5000)); }
  }
}

app.listen(PORT, () => { console.log(`Server on ${PORT}`); telegramBot(); maxBot(); });
