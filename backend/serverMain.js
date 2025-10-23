const express = require("express");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

const app = express();
const ROOT = __dirname;
const FRONT = path.join(ROOT, "../frontend");
const DATA = path.join(ROOT, "data");
const PORT = 3000;
const HOST = "0.0.0.0";

// Глобальные обработчики ошибок
process.on('uncaughtException', (error) => {
  console.error('Непойманное исключение:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Непойманный промис:', promise, 'причина:', reason);
});

app.set("trust proxy", 1);

// Очередь для операций записи
const writeQueue = new Map();
const writeFileWithLock = async (path, data) => {
  if (writeQueue.has(path)) {
    await writeQueue.get(path);
  }
  const promise = fsp.writeFile(path, JSON.stringify(data, null, 2));
  writeQueue.set(path, promise);
  await promise;
  writeQueue.delete(path);
};

// Инициализация
(async () => {
  await fsp.mkdir(DATA, { recursive: true });
  await fsp.mkdir(path.join(FRONT, "media", "audio"), { recursive: true });
  await fsp.mkdir(path.join(FRONT, "media", "images"), { recursive: true });
  await fsp.mkdir(path.join(FRONT, "media", "video"), { recursive: true });

  const s = path.join(DATA, "settings.json");
  if (!fs.existsSync(s)) {
    const next = new Date(new Date().getFullYear() + 1, 0, 1, 0, 0, 0);
    await writeFileWithLock(s, {
      projectName: "New Year CountDown",
      github: "https://github.com/Ivan2812446/newyear-countdown",
      targetISO: next.toISOString(),
      theme: "glass",
      glassTimer: true,
      volume: 0.7,
      requireClick: true,
      showSoundPrompt: true,
      shuffle: true,
      snow: { density: 180, fall: 1.4 },
      tz: { mode: "auto", fixed: "Europe/Helsinki" },
      exact2355: { enabled: true, media: "/frontend/media/audio/chimes.mp3", hideTimer: true },
      version: String(Date.now())
    });
  }
  
  const a = path.join(DATA, "about.txt");
  if (!fs.existsSync(a)) await fsp.writeFile(a, "Проект New Year CountDown\nАвтор: вы.");
  
  const adm = path.join(DATA, "admin.json");
  if (!fs.existsSync(adm)) {
    const pepper = crypto.randomBytes(8).toString("hex");
    const pass = "Admin123";
    const h = crypto.createHash("sha256").update(pepper + pass).digest("hex");
    await writeFileWithLock(adm, { passwordHash: h, pepper });
  }
  
  if (!fs.existsSync(path.join(DATA, "stats.json"))) await writeFileWithLock(path.join(DATA, "stats.json"), { total: 0, unique: 0, byDate: {}, uids: {} });
  if (!fs.existsSync(path.join(DATA, "playlist.json"))) await writeFileWithLock(path.join(DATA, "playlist.json"), { order: [] });
})();

// ВАЖНО: Убираем ВСЕ проблемные заголовки безопасности
app.disable("x-powered-by");

// Простые заголовки без security ограничений
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-client-nonce");
  
  // Убираем проблемные заголовки
  res.removeHeader('Cross-Origin-Opener-Policy');
  res.removeHeader('Origin-Agent-Cluster');
  res.removeHeader('Content-Security-Policy');
  res.removeHeader('Cross-Origin-Embedder-Policy');
  res.removeHeader('Cross-Origin-Resource-Policy');
  
  next();
});

app.use(express.json({ limit: "1mb" }));

// Обработчик ошибок JSON
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ error: "Invalid JSON" });
  }
  next();
});

// Статические файлы БЕЗ кэширования для разработки
app.use("/frontend", express.static(FRONT, {
  extensions: ["html"],
  etag: false,
  lastModified: false,
  setHeaders: (res, path) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
}));

// Favicon
app.get("/favicon.ico", (_, res) => {
  res.sendFile(path.join(FRONT, "favicon.ico"));
});

app.get("/", (_, res) => res.redirect("/frontend/index.html"));

// Конечная точка проверки работоспособности
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

const J = async (p, d) => {
  try {
    return JSON.parse(await fsp.readFile(p, "utf8"));
  } catch {
    return d;
  }
};

app.get("/api/settings", async (_req, res) => {
  const s = await J(path.join(DATA, "settings.json"), {});
  res.json(s);
});

app.get("/api/about", async (_req, res) => {
  try {
    res.type("text/plain").send(await fsp.readFile(path.join(DATA, "about.txt"), "utf8"));
  } catch {
    res.type("text/plain").send("—");
  }
});

app.get("/api/media", async (_req, res) => {
  try {
    const L = async (dir) => {
      try {
        const files = await fsp.readdir(dir);
        return files.filter(f => !f.startsWith("."));
      } catch {
        return [];
      }
    };

    const [audio, images, video] = await Promise.all([
      L(path.join(FRONT, "media", "audio")),
      L(path.join(FRONT, "media", "images")),
      L(path.join(FRONT, "media", "video"))
    ]);

    res.json({ audio, images, video });
  } catch (error) {
    console.error('Media error:', error);
    res.json({ audio: [], images: [], video: [] });
  }
});

app.post("/api/stat/visit", async (req, res) => {
  try {
    const p = path.join(DATA, "stats.json");
    const s = await J(p, { total: 0, unique: 0, byDate: {}, uids: {} });
    const { uid, page } = req.body || {};

    s.total++;
    const day = new Date().toISOString().slice(0, 10);
    s.byDate[day] = (s.byDate[day] || 0) + 1;

    if (uid && !s.uids[uid]) {
      s.uids[uid] = { first: new Date().toISOString(), pages: {} };
      s.unique++;
    }

    await writeFileWithLock(p, s);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false });
  }
});

app.delete("/api/stats", async (_req, res) => {
  try{
    await writeFileWithLock(path.join(DATA, "stats.json"), { 
      total: 0, 
      unique: 0, 
      byDate: {},
      uids: {},
      lastTZ: 'Europe/Helsinki'
    });
    res.json({ok: true});
  } catch {
    res.json({ok: false});
  }
});

app.get("/api/stats", async (_req, res) => {
  const s = await J(path.join(DATA, "stats.json"), { 
    total: 0, 
    unique: 0, 
    byDate: {} 
  });
  const today = new Date().toISOString().slice(0, 10);
  let tracks = 0;
  try {
    tracks = (await fsp.readdir(path.join(FRONT, "media", "audio"))).length;
  } catch { }
  res.json({ total: s.total, unique: s.unique, today: s.byDate[today] || 0, tracks });
});

let TOKENS = new Map();
const ADM = path.join(DATA, "admin.json");
const passOk = async p => {
  const { passwordHash, pepper } = await J(ADM, { passwordHash: "", pepper: "" });
  const h = crypto.createHash("sha256").update((pepper || "") + p).digest("hex");
  return h === (passwordHash || "");
};
const TOKEN_TTL_MS = 45 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map();

function cleanExpiredTokens() {
  const now = Date.now();
  for (let [token, data] of TOKENS.entries()) {
    if (now > data.exp) TOKENS.delete(token);
  }

  for (let [ip, attempt] of attempts.entries()) {
    if (attempt.until && now > attempt.until) attempts.delete(ip);
  }
}

// Очистка каждые 5 минут
setInterval(cleanExpiredTokens, 5 * 60 * 1000);

function ipOf(req) { return (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() || req.socket.remoteAddress || "local"; }
function uaOf(req) { return (req.headers["user-agent"] || "").slice(0, 200); }
function mkToken(ip, ua) { const t = crypto.randomBytes(32).toString("hex"); TOKENS.set(t, { ip, ua, exp: Date.now() + TOKEN_TTL_MS }); return t; }
function validToken(t, ip, ua) {
  const r = TOKENS.get(t);
  if (!r) return false;
  if (r.ip !== ip || r.ua !== ua) return false;
  if (Date.now() > r.exp) {
    TOKENS.delete(t);
    return false;
  }
  return true;
}
function rotate(t) {
  const r = TOKENS.get(t);
  if (!r) return null;
  TOKENS.delete(t);
  const nt = crypto.randomBytes(32).toString("hex");
  TOKENS.set(nt, { ip: r.ip, ua: r.ua, exp: Date.now() + TOKEN_TTL_MS });
  return nt;
}
function locked(ip) {
  const a = attempts.get(ip);
  if (!a) return false;
  if (a.until && Date.now() < a.until) return true;
  if (a.until && Date.now() >= a.until) {
    attempts.delete(ip);
    return false;
  }
  return false;
}
function fail(ip) {
  const a = attempts.get(ip) || { count: 0, until: 0 };
  a.count++;
  if (a.count >= MAX_ATTEMPTS) {
    a.until = Date.now() + WINDOW_MS;
    a.count = 0;
  }
  attempts.set(ip, a);
}
function okLogin(ip) { attempts.delete(ip); }

// Упрощенная авторизация без nonce требований
const auth = (req, res, next) => {
  const h = req.headers.authorization || "";
  const t = h.startsWith("Bearer ") ? h.slice(7) : null;
  const ip = ipOf(req), ua = uaOf(req);
  
  if (validToken(t, ip, ua)) {
    const nt = rotate(t);
    res.setHeader("X-Refreshed-Token", nt);
    return next();
  }
  res.status(401).json({ ok: false });
};

app.post("/api/admin/login", async (req, res) => {
  const ip = ipOf(req);
  if (locked(ip)) return res.json({ ok: false });
  const pwd = (req.body && req.body.password) || "";
  
  if (await passOk(pwd)) {
    okLogin(ip);
    const t = mkToken(ip, uaOf(req));
    res.json({ ok: true, token: t, expiresIn: Math.floor(TOKEN_TTL_MS / 1000) });
  } else {
    fail(ip);
    res.json({ ok: false });
  }
});

app.post("/api/admin/logout", auth, (_req, res) => res.json({ ok: true }));
app.post("/api/admin/password", auth, async (req, res) => {
  try {
    const np = (req.body && req.body.newPassword) || "";
    if (!np || np.length < 6) return res.json({ ok: false });
    const pepper = crypto.randomBytes(8).toString("hex");
    const h = crypto.createHash("sha256").update(pepper + np).digest("hex");
    await writeFileWithLock(ADM, { passwordHash: h, pepper });
    TOKENS = new Map();
    res.json({ ok: true });
  } catch {
    res.json({ ok: false });
  }
});

app.post("/api/admin/settings", auth, async (req, res) => {
  try {
    const p = path.join(DATA, "settings.json");
    const cur = await J(p, {});
    const n = { ...cur };
    ["projectName", "github", "targetISO", "theme", "glassTimer", "volume", "requireClick", "showSoundPrompt", "snow", "shuffle", "tz", "exact2355", "version"].forEach(k => {
      if (req.body[k] !== undefined) n[k] = req.body[k];
    });
    if (typeof n.volume === "number") n.volume = Math.max(0, Math.min(1, n.volume));
    n.version = String(Date.now());
    await writeFileWithLock(p, n);
    res.json({ ok: true });
  } catch {
    res.json({ ok: false });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const t = (req.query.type || "audio").toString();
    const dir = t === "image" ? path.join(FRONT, "media", "images") : t === "video" ? path.join(FRONT, "media", "video") : path.join(FRONT, "media", "audio");
    cb(null, dir);
  },
  filename: (_req, file, cb) => cb(null, (file.originalname || "file").replace(/[^a-zA-Z0-9._-]+/g, "_"))
});

const upload = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024 * 5000,
    files: 5000
  }
});

app.post("/api/admin/upload", auth, upload.array("files"), (req, res) => {
  res.json({ ok: true, files: (req.files || []).map(f => f.filename) });
});

app.get("/api/admin/playlist", auth, async (_req, res) => res.json(await J(path.join(DATA, "playlist.json"), { order: [] })));
app.post("/api/admin/playlist", auth, async (req, res) => {
  try {
    const order = Array.isArray(req.body.order) ? req.body.order : [];
    await writeFileWithLock(path.join(DATA, "playlist.json"), { order });
    res.json({ ok: true });
  } catch {
    res.json({ ok: false });
  }
});

app.get("/api/share", async (req, res) => {
  const s = await J(path.join(DATA, "settings.json"), { version: String(Date.now()) });
  const host = req.headers["x-forwarded-host"] || req.headers.host || `localhost:${PORT}`;
  const proto = "http"; // Принудительно HTTP
  const base = `${proto}://${host}/frontend/`;
  res.json({
    base,
    index: base + `index.html?v=${s.version}`,
    timer: base + `timer.html?v=${s.version}`,
    admin: base + `admin.html?v=${s.version}`,
    version: s.version
  });
});

// Запуск сервера
app.listen(PORT, HOST, () => {
  console.log('🎄 New Year CountDown Server запущен!');
  console.log('📍 Локальный доступ: http://localhost:3000');
  console.log('⚡ Все security headers отключены для работы по HTTP');
});

// Мониторинг памяти
setInterval(() => {
  const used = process.memoryUsage();
  console.log('💾 Память:', Math.round(used.heapUsed / 1024 / 1024) + 'MB');
}, 10 * 60 * 1000);
