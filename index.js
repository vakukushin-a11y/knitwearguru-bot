const express = require("express");
const OpenAI = require("openai");
const app = express();
const session = require("express-session");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: "zavyz-cms-2026", resave: false, saveUninitialized: false, cookie: { maxAge: 86400000 } }));
app.use("/img", express.static(__dirname + "/img"));
app.use("/admin", express.static(__dirname + "/admin"));

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.OPENAI_BASE_URL || "http://127.0.0.1:11434/v1";
const API_KEY = process.env.OPENAI_API_KEY || "";
const AI_MODEL = process.env.AI_MODEL || "qwen2.5:7b";
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const MAX_TOKEN = process.env.MAX_BOT_TOKEN || "";
const HOST = process.env.HOST || `http://localhost:${PORT}`;
const fs = require("fs");

const openai = API_KEY !== 'your-api-key-here' ? new OpenAI({ baseURL: BASE_URL, apiKey: API_KEY || "ollama" }) : null;
const DESIGNER = "Ирина Кукушина";
const PHONE = "+7 922 20 19 19 9";

const RSSParser = require("rss-parser");
const rssParser = new RSSParser({ timeout: 10000 });

const RSS_SOURCES = [
  { name: "ELLE Россия", url: "https://www.elle.ru/rss/" },
  { name: "Vogue Россия", url: "https://www.vogue.ru/rss/" },
];

// Web scraping 
const SCRAPE_SOURCES = [
  { name: "Мода 24/7", url: "https://moda247.ru/news/" },
  { name: "ProFashion", url: "https://profashion.ru/news/" },
  { name: "InterModa", url: "https://www.intermoda.ru/" },
];

const KNITWEAR_KEYWORDS = [
  "трикотаж", "вязан", "пряжа", "свитер", "кардиган", "джемпер", "пуловер",
  "шерсть", "вязк", "спицы", "меринос", "кашемир", "хлопок", "акрил", "вискоза",
  "палантин", "снуд", "плед", "туника", "шарф", "шапк",
  "knit", "knitwear", "yarn", "wool", "sweater", "cardigan", "cashmere", "crochet",
];

// Must match at least 2 knitwear-specific keywords
function isKnitwearArticle(title, text) {
  const combined = (title + " " + text).toLowerCase();
  const matches = KNITWEAR_KEYWORDS.filter(kw => combined.includes(kw));
  return matches.length >= 3;
}

async function scrapeSite(source) {
  try {
    const resp = await fetch(source.url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(10000)
    });
    const html = await resp.text();
    const articles = [];
    
    const linkRegex = /<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>\s*([\s\S]*?)\s*<\/a>/gi;
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];
      let title = match[2];
      // Strip HTML tags inside the link (images, spans, etc)
      title = title.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      // Skip: too short, social links, logos, image-only, JS links
      if (title.length < 30 || title.length > 300) continue;
      if (href.match(/\.(jpg|png|gif|svg|css|js|ico|pdf)/i)) continue;
      if (href.match(/pinterest|twitter|facebook|linkedin|instagram|youtube|vkontakte|t\.me/)) continue;
      
      articles.push({ title, link: href, text: title });
      if (articles.length > 30) break;
    }
    
    return articles.slice(0, 25).map(a => ({ ...a, source: source.name }));
  } catch(e) { return []; }
}

async function fetchLiveNews() {
  const allArticles = [];
  // RSS first
  for (const src of RSS_SOURCES) {
    try {
      const feed = await rssParser.parseURL(src.url);
      for (const item of (feed.items || [])) {
        if (allArticles.length >= 7) break;
        const title = item.title || "";
        const text = (item.contentSnippet || item.content || "").replace(/<[^>]*>/g, "");
        allArticles.push({ date: item.pubDate ? new Date(item.pubDate).toLocaleDateString("ru-RU") : "", title, text: text.slice(0, 200), source: src.name });
      }
    } catch(e) {}
  }
  // Scraping fallback
  for (const src of SCRAPE_SOURCES) {
    if (allArticles.length >= 7) break;
    try {
      const articles = await scrapeSite(src.url);
      for (const a of articles) {
        if (allArticles.length >= 7) break;
        allArticles.push({ date: "", title: a.title, text: a.text.slice(0, 200), source: a.source });
      }
    } catch(e) {}
  }
  return allArticles;
}

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
  { name: "Кардиганы", singular: "Кардиган",   price: "от 6 500 ₽", img: "bot-кардиган.png" },
  { name: "Платья",    singular: "Платье",     price: "от 6 500 ₽", img: "bot-платье.jpg" },
  { name: "Джемперы",  singular: "Джемпер",    price: "от 6 000 ₽", img: "bot-джемпер.png" },
  { name: "Свитеры",   singular: "Свитер",     price: "от 6 000 ₽", img: "bot-свитер.png" },
  { name: "Снуды",     singular: "Снуд",       price: "от 1 200 ₽", img: "bot-снуд.png" },
  { name: "Шарфы и шапки", singular: "Шарфы и шапки", price: "от 1 200 ₽", img: "bot-шарфы.png" },
  { name: "Пледы",     singular: "Плед",       price: "от 2 500 ₽", img: "bot-плед.jpg" },
  { name: "Палантины", singular: "Палантин",   price: "от 3 000 ₽", img: "kb-img-12.jpg" },
  { name: "Туники",    singular: "Туника",     price: "от 6 000 ₽", img: "bot-туника.png" },
  { name: "Косынки",   singular: "Косынка",    price: "от 2 500 ₽", img: "kb-img-15.png" },
];

app.get("/api/products", (_, res) => res.json(PRODUCTS));

// ── Health & API routes ───────────────────────────────────────────────────
app.get("/", (_, res) => res.send("ZAVYAZ Bots OK"));
app.get("/api/health", (_, res) => res.json({ status: "ok" }));
app.get("/api/news", async (_, res) => { const cms = readNews(); if (cms.length > 0) return res.json(cms.slice(0, 9)); const articles = await fetchLiveNews(); res.json(articles); });

// ── CMS ───────────────────────────────────────────────────────────────────
const CMS_PASSWORD = "zavyz2026";
const NEWS_FILE = __dirname + "/news.json";

function readNews() { try { return JSON.parse(fs.readFileSync(NEWS_FILE, "utf8")); } catch { return []; } }
function writeNews(data) { fs.writeFileSync(NEWS_FILE, JSON.stringify(data, null, 2)); }
if (!fs.existsSync(NEWS_FILE)) writeNews([]);

app.post("/api/cms/login", (req, res) => {
  if (req.body.password === CMS_PASSWORD) { req.session.admin = true; return res.json({ ok: true }); }
  res.status(401).json({ ok: false, error: "Неверный пароль" });
});
app.get("/api/cms/check", (req, res) => { res.json({ ok: !!req.session.admin }); });
app.post("/api/cms/logout", (req, res) => { req.session.destroy(); res.json({ ok: true }); });

function requireAdmin(req, res, next) {
  if (!req.session.admin) return res.status(401).json({ error: "Требуется вход" });
  next();
}

app.get("/api/cms/news", requireAdmin, (_, res) => { res.json(readNews()); });

app.post("/api/cms/news", requireAdmin, (req, res) => {
  const { title, text, date } = req.body;
  if (!title || !text) return res.status(400).json({ error: "Заголовок и текст обязательны" });
  const news = readNews();
  const article = { id: Date.now(), title, text, date: date || new Date().toLocaleDateString("ru-RU"), createdAt: new Date().toISOString() };
  news.unshift(article);
  writeNews(news);
  res.json({ ok: true, article });
});

app.put("/api/cms/news/:id", requireAdmin, (req, res) => {
  const news = readNews();
  const idx = news.findIndex(n => n.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: "Не найдено" });
  const { title, text, date } = req.body;
  if (title) news[idx].title = title;
  if (text) news[idx].text = text;
  if (date) news[idx].date = date;
  news[idx].updatedAt = new Date().toISOString();
  writeNews(news);
  res.json({ ok: true, article: news[idx] });
});

app.delete("/api/cms/news/:id", requireAdmin, (req, res) => {
  const news = readNews();
  const filtered = news.filter(n => n.id !== parseInt(req.params.id));
  if (filtered.length === news.length) return res.status(404).json({ error: "Не найдено" });
  writeNews(filtered);
  res.json({ ok: true });
});

// Incoming news from internet — auto-fetched, ready to publish
const INCOMING_FILE = __dirname + "/incoming.json";
function readIncoming() { try { return JSON.parse(fs.readFileSync(INCOMING_FILE, "utf8")); } catch { return []; } }
function writeIncoming(data) { fs.writeFileSync(INCOMING_FILE, JSON.stringify(data, null, 2)); }
if (!fs.existsSync(INCOMING_FILE)) writeIncoming([]);

async function fetchIncomingNews() {
  const existing = readIncoming();
  const existingLinks = new Set(existing.map(n => n.link));
  
  // 1. RSS (Google News, Burdastyle)
  for (const src of RSS_SOURCES) {
    try {
      const feed = await rssParser.parseURL(src.url);
      for (const item of (feed.items || [])) {
        const title = item.title || "";
        const text = (item.contentSnippet || item.content || "").replace(/<[^>]*>/g, "");
        const link = item.link || "";
        if (!link || existingLinks.has(link)) continue;
        const combined = (title + " " + text).toLowerCase();
        if (KNITWEAR_KEYWORDS.some(kw => combined.includes(kw))) {
          existing.push({ id: Date.now() + Math.random(), title, text: text.slice(0, 500), link, source: src.name, date: item.pubDate ? new Date(item.pubDate).toLocaleDateString("ru-RU") : "", status: "incoming", fetchedAt: new Date().toISOString() });
          existingLinks.add(link);
        }
      }
    } catch(e) {}
  }
  
  // 2. Web scraping fallback
  for (const src of SCRAPE_SOURCES) {
    try {
      const articles = await scrapeSite(src.url);
      for (const a of articles) {
        if (!a.link || existingLinks.has(a.link)) continue;
        const combined = (a.title).toLowerCase();
        if (KNITWEAR_KEYWORDS.some(kw => combined.includes(kw))) {
          existing.push({ id: Date.now() + Math.random(), title: a.title, text: a.text.slice(0, 500), link: a.link, source: a.source, date: "", status: "incoming", fetchedAt: new Date().toISOString() });
          existingLinks.add(a.link);
        }
      }
    } catch(e) {}
  }
  
  writeIncoming(existing);
  return existing.filter(n => n.status === "incoming");
}

app.post("/api/cms/incoming/fetch", requireAdmin, async (_, res) => {
  const items = await fetchIncomingNews();
  res.json({ ok: true, count: items.length });
});

app.get("/api/cms/incoming", requireAdmin, (_, res) => {
  res.json(readIncoming().filter(n => n.status === "incoming"));
});

app.post("/api/cms/incoming/publish", requireAdmin, (req, res) => {
  const { id, title, text, source } = req.body;
  const incoming = readIncoming();
  const idx = incoming.findIndex(n => n.id == id);
  if (idx === -1) return res.status(404).json({ error: "Не найдено" });
  const item = incoming[idx];
  incoming[idx].status = "published";
  writeIncoming(incoming);
  const news = readNews();
  news.unshift({ id: Date.now(), title: title || item.title, text: text || item.text, date: new Date().toLocaleDateString("ru-RU"), source: source || item.source, createdAt: new Date().toISOString() });
  writeNews(news);
  res.json({ ok: true });
});

app.delete("/api/cms/incoming/:id", requireAdmin, (req, res) => {
  const incoming = readIncoming();
  const filtered = incoming.filter(n => n.id != req.params.id);
  writeIncoming(filtered);
  res.json({ ok: true });
});

// Public news API — for site and bots
app.get("/api/public/news", (_, res) => {
  const news = readNews();
  res.json(news.slice(0, 20));
});

async function getNews() {
  const cms = readNews();
  return cms.slice(0, 7).map(n => ({ date: n.date, title: n.title, text: (n.text||"").slice(0, 200), source: n.source || "ЗАВЯЗЬ" }));
}

app.get("/api/encyclopedia", (_, res) => res.json(ENCYCLOPEDIA));

// ── Helpers ───────────────────────────────────────────────────────────────
async function askAI(question, isEncyclopedia = false) {
  try {
    if (!openai) {
      return isEncyclopedia ? (findEncyclopediaAnswer(question) || "Задайте вопрос о трикотаже — джемпер, свитер, кашемир, шерсть...") : "Бот работает в офлайн-режиме. API-ключ не настроен.";
    }
    const systemPrompt = isEncyclopedia
      ? "Ты — энциклопедия трикотажа. Отвечай на русском: пряжа, вязание, изделия, уход. Стиль: дружелюбный, экспертный, с эмодзи."
      : "Ты — консультант ателье «ЗАВЯЗЬ». Отвечай кратко, по делу. Ателье вяжет на заказ. Телефон дизайнера Ирины: +7 922 20 19 19 9. Сайт: zavyz.ru";
    const resp = await openai.chat.completions.create({
      model: AI_MODEL,
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

  function menu() { return [[{ text: "📋 Заказать", callback_data: "order" }, { text: "🧶 Энциклопедия", callback_data: "encyclopedia" }], [{ text: "📞 Позвонить", callback_data: "contact" }]]; }
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
          if (cb.data === "contact") { encSessions.delete(cid); await tgSend(cid, DESIGNER + " — дизайнер ателье «ЗАВЯЗЬ»\n\n📞 " + PHONE, menu()); }
          else if (cb.data === "order") { encSessions.delete(cid); await tgSend(cid, "Выберите изделие 👇", catMenu()); }
          else if (cb.data.startsWith("cat:")) { const name = cb.data.slice(4); const p = PRODUCTS.find(x => x.name === name);           if (p) { await tgSendPhoto(cid, __dirname + "/img/" + p.img, `${p.singular || p.name}\n${p.price}\n\n📞 Для заказа: ${PHONE}`); await tgSend(cid, "Что ещё интересует?", menu()); } }
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

  async function mxSend(chatId, text, keyboard) {
    const url = new URL(`${API}/messages`); url.searchParams.set("chat_id", chatId);
    const body = { text };
    if (keyboard) body.attachments = [keyboard];
    await fetch(url.toString(), { method: "POST", headers: { Authorization: MAX_TOKEN, "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch((e) => { console.log("mxSend error:", e.message); });
  }

  function menu() { const rows = [[{ type: "callback", text: "📋 Заказать", payload: "order" }, { type: "callback", text: "🧶 Энциклопедия", payload: "encyclopedia" }], [{ text: "📞 Позвонить", payload: "contact" }]]; return { type: "inline_keyboard", payload: { buttons: rows } }; }
  function encMenu() { return { type: "inline_keyboard", payload: { buttons: [[{ type: "callback", text: "↩️ Меню", payload: "menu" }, { type: "callback", text: "🧶 Спросить ещё", payload: "encyclopedia" }]] } }; }
  function catMenu() { const rows = []; for (let i = 0; i < PRODUCTS.length; i += 2) rows.push(PRODUCTS.slice(i, i + 2).map(p => ({ type: "callback", text: p.name, payload: "cat:" + p.name }))); rows.push([{ type: "callback", text: "↩️ Меню", payload: "menu" }]); return { type: "inline_keyboard", payload: { buttons: rows } }; }

  const encSessions = new Set();
  async function mxSendPhoto(chatId, url) {
    const u = new URL(`${API}/messages`); u.searchParams.set("chat_id", chatId);
    await fetch(u.toString(), { method: "POST", headers: { Authorization: MAX_TOKEN, "Content-Type": "application/json" }, body: JSON.stringify({ attachments: [{ type: "image", payload: { url } }] }) }).catch((e) => { console.log("mxSendPhoto error:", e.message); });
  }

  function getChatId(u) {
    return u.chat_id || u.message?.chat?.id || u.message?.recipient?.chat_id || u.user?.user_id || u.message?.sender?.user_id || "";
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
        const cid = getChatId(u);
        if (!cid) { console.log("MAX: no chat_id in update", JSON.stringify(u).slice(0,200)); continue; }
        if (u.update_type === "message_callback") { console.log("MAX callback:", JSON.stringify(u.callback).slice(0,200)); }
        if (u.update_type === "bot_started" && u.user) {
          await mxSend(cid, "Добро пожаловать в ателье «ЗАВЯЗЬ»! 🧶\n\nЯ помогу с выбором трикотажа, расскажу о пряже. Что интересует?", menu());
        } else if (u.update_type === "message_created" && u.message?.body?.text) {
          const text = u.message.body.text.trim();
          if (text === "/start") {
            await mxSend(cid, "Добро пожаловать в ателье «ЗАВЯЗЬ»! 🧶\n\nЯ помогу с выбором трикотажа, расскажу о пряже. Что интересует?", menu());
          } else if (encSessions.has(cid)) { const a = await askAI(text, true); await mxSend(cid, a, encMenu()); }
          else { const a = await askAI(text); await mxSend(cid, a, menu()); }
        } else if (u.update_type === "message_callback" && u.callback) {
          const p = u.callback.payload || u.callback.data || "";
          if (p === "contact") { encSessions.delete(cid); await mxSend(cid, DESIGNER + " — дизайнер ателье ЗАВЯЗЬ\n\n📞 " + PHONE, menu()); }
          else if (p === "order") { encSessions.delete(cid); await mxSend(cid, "Выберите изделие 👇", catMenu()); }
          else if (p.startsWith("cat:")) { const name = p.slice(4); const prod = PRODUCTS.find(x => x.name === name); if (prod) { await mxSend(cid, `${prod.singular || prod.name}\n${prod.price}\n\n📞 Для заказа: ${PHONE}`); const cdnUrl = "https://cdn.jsdelivr.net/gh/vakukushin-a11y/zavyaz-site@main/" + encodeURIComponent(prod.img); await mxSendPhoto(cid, cdnUrl); await mxSend(cid, "Что ещё интересует?", menu()); } }
          else if (p === "menu" || p === "menu:main") { encSessions.delete(cid); await mxSend(cid, "Главное меню:", menu()); }
          else if (p === "encyclopedia") { encSessions.add(cid); await mxSend(cid, encIntro(), encMenu()); }
        }
      }
    } catch (e) { await new Promise(r => setTimeout(r, 5000)); }
  }
}

app.listen(PORT, () => {
  console.log(`Server on port ${PORT}`);
  const os = require("os");
  const ifaces = os.networkInterfaces();
  console.log("\n📡 Доступ из домашней сети:");
  Object.keys(ifaces).forEach(name => {
    ifaces[name].forEach(iface => {
      if (iface.family === "IPv4" && !iface.internal) {
        console.log(`   http://${iface.address}:${PORT}/admin   ← админка CMS`);
        console.log(`   http://${iface.address}:${PORT}          ← API`);
      }
    });
  });
  console.log(`\n🔑 Пароль CMS: zavyz2026`);
  console.log(`\nЗапуск ботов...\n`);
  telegramBot();
  maxBot();
});
