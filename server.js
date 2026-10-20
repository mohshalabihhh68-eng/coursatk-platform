const express = require("express");
const fetch = require("node-fetch");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

const API = "https://api.coursatk.online";
const SW = "https://api.stream-weave.com";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function browserHeaders(extra) {
  return Object.assign({
    Origin: "https://coursatk.online",
    Referer: "https://coursatk.online/",
    Accept: "application/json, text/plain, */*",
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  }, extra || {});
}

// 1. مسار تسجيل الدخول (بياخد كود الطالب ويجيب التوكن الحقيقي)
app.post("/api/login", async function (req, res) {
  try {
    const code = String((req.body && req.body.code) || "").trim();
    if (!/^\d{7}$/.test(code)) {
      return res.status(400).json({ success: false, message: "اكتب كود صحيح 7 أرقام" });
    }

    // بنبعت الكود لـ API بتاع coursatk عشان يجيب التوكن
    const response = await fetch(API + "/api/v1/user/login-with-code", {
      method: "POST",
      headers: browserHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ code: code }),
    });

    const data = await response.json();

    if (!response.ok || data.success === false) {
      return res.status(401).json({ success: false, message: data.message || "الكود غير صحيح أو منتهي" });
    }

    // بنرجع التوكن للطالب
    res.json({ success: true, token: data.data ? data.data.token : data.token });
  } catch (e) {
    res.status(500).json({ success: false, message: "خطأ في السيرفر: " + e.message });
  }
});

// 2. دالة مساعدة عشان تبعت طلبات الـ API بالتوكن بتاع الطالب
async function proxyJson(url, req, opts) {
  opts = opts || {};
  
  // بنجيب التوكن من الهيدر اللي جاي من المتصفح
  let userToken = "";
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    userToken = req.headers.authorization.replace("Bearer ", "");
  }

  const res = await fetch(url, {
    method: opts.method || "GET",
    headers: browserHeaders({
      Authorization: "Bearer " + userToken, // بنستخدم توكن الطالب
      ...(opts.headers || {})
    }),
    body: opts.body,
  });

  const text = await res.text();
  try {
    return { status: res.status, body: JSON.parse(text) };
  } catch (e) {
    return { status: res.status, body: text };
  }
}

// 3. باقي المسارات (بتاخد الـ req عشان تجيب التوكن)
app.get("/api/years", async (req, res) => {
  const r = await proxyJson(API + "/api/v1/user/years", req);
  res.status(r.status).json(r.body);
});

app.get("/api/subjects/:id", async (req, res) => {
  const r = await proxyJson(API + "/api/v1/user/subjects/" + req.params.id, req);
  res.status(r.status).json(r.body);
});

app.get("/api/subjects/:id/teachers", async (req, res) => {
  const r = await proxyJson(API + "/api/v1/user/subjects/" + req.params.id + "/teachers", req);
  res.status(r.status).json(r.body);
});

app.get("/api/teachers/:id/chapters", async (req, res) => {
  const r = await proxyJson(API + "/api/v1/user/teachers/" + req.params.id + "/chapters", req);
  res.status(r.status).json(r.body);
});

app.get("/api/chapters/:id/lectures", async (req, res) => {
  const r = await proxyJson(API + "/api/v1/user/chapters/" + req.params.id + "/lectures", req);
  res.status(r.status).json(r.body);
});

app.get("/api/lectures/:id/content", async (req, res) => {
  const r = await proxyJson(API + "/api/v1/user/lectures/" + req.params.id + "/content", req);
  res.status(r.status).json(r.body);
});

app.get("/api/profile", async (req, res) => {
  const r = await proxyJson(API + "/api/v1/user/profile", req);
  res.status(r.status).json(r.body);
});

// 4. مسار تشغيل الفيديو (بياخد التوكن بتاع الطالب)
app.post("/api/video/:id/play", async (req, res) => {
  const r = await proxyJson(API + "/api/v1/video/" + req.params.id + "/stream-weave/play", req, {
    method: "POST",
    headers: { "Content-Length": "0" },
    body: "",
  });
  res.status(r.status).json(r.body);
});

// 5. المسارات الخاصة بالفيديو (stream, cdn, heartbeat)
app.get("/api/cdn", async (req, res) => {
  try {
    var target = req.query.url || "";
    if (req.query.u) target = Buffer.from(String(req.query.u).replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    if (!target) return res.status(400).send("missing url");
    var hdrs = browserHeaders();
    if (req.headers.range) hdrs.Range = req.headers.range;
    var upstream = await fetch(target, { headers: hdrs });
    var buf = Buffer.from(await upstream.arrayBuffer());
    res.set("Content-Type", upstream.headers.get("content-type") || "application/octet-stream");
    res.set("Access-Control-Allow-Origin", "*");
    res.status(upstream.status).send(buf);
  } catch (e) { res.status(502).send("cdn error"); }
});

app.get("/api/stream", async (req, res) => {
  try {
    var swPath = (req.query.path || "").replace(/^\/+/, "");
    var token = req.query.t;
    if (!token || !swPath) return res.status(400).json({ error: "missing path or token" });
    var url = SW + "/api/v1/" + swPath;
    var hdrs = browserHeaders({ Authorization: "Bearer " + token });
    if (req.headers.range) hdrs.Range = req.headers.range;
    var upstream = await fetch(url, { headers: hdrs });
    var buf = Buffer.from(await upstream.arrayBuffer());
    res.set("Content-Type", upstream.headers.get("content-type") || "application/octet-stream");
    res.set("Access-Control-Allow-Origin", "*");
    res.status(upstream.status).send(buf);
  } catch (e) { res.status(502).json({ error: e.message }); }
});

app.post("/api/heartbeat", async (req, res) => {
  try {
    var url = req.body && req.body.url;
    var token = req.body && req.body.token;
    if (!url || !token) return res.status(400).json({ error: "url+token required" });
    var upstream = await fetch(url, {
      method: "POST",
      headers: browserHeaders({ Authorization: "Bearer " + token, "Content-Type": "application/json" }),
      body: "{}",
    });
    res.status(upstream.status).json(await upstream.json());
  } catch (e) { res.status(502).json({ error: e.message }); }
});

app.get("*", function (req, res) {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, function () {
  console.log("✅ Server running on port " + PORT);
});
