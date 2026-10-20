const express = require("express");
const fetch = require("node-fetch");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

const STUDENT_TOKEN =
  process.env.COURSATK_TOKEN ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo3NTEwMiwicm9sZSI6InN0dWRlbnQiLCJ1dWlkIjoiNzUzYzY2MWI0NWMxZDg1ZTdlNDEzNWQ0YWU3MGEyNTIifQ.1lJvhhxz4zz6AXjRcRmRRqb68cdaG0gVmFoe3ULH2uY";

const API = "https://api.coursatk.online";
const SW = "https://api.stream-weave.com";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// --- دوال مساعدة ---
function headers() {
  return {
    Authorization: "Bearer " + STUDENT_TOKEN,
    Accept: "application/json",
    Origin: "https://coursatk.online",
    Referer: "https://coursatk.online/",
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  };
}

function browserHeaders(extra) {
  return Object.assign({
      Origin: "https://coursatk.online",
      Referer: "https://coursatk.online/",
      Accept: "*/*",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    }, extra || {}
  );
}

function b64urlEncode(value) {
  var buf = Buffer.isBuffer(value) ? value : Buffer.from(String(value));
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function b64urlDecode(value) {
  var s = String(value).replace(/ /g, "+").replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Buffer.from(s, "base64").toString("utf8");
}
function joinRel(base, rel) {
  var q = ""; var relPath = String(rel); var qi = relPath.indexOf("?");
  if (qi !== -1) { q = relPath.slice(qi); relPath = relPath.slice(0, qi); }
  var stack = String(base || "").split("/");
  if (stack.length && stack[stack.length - 1] !== "" && /\.[a-z0-9]+$/i.test(stack[stack.length - 1])) { stack.pop(); }
  if (stack.length && stack[stack.length - 1] === "") stack.pop();
  relPath.split("/").forEach(function (part) {
    if (!part || part === ".") return;
    if (part === "..") stack.pop(); else stack.push(part);
  });
  return stack.join("/") + q;
}
async function fetchFollow(url, hdrs, left) {
  if (left == null) left = 5;
  var res = await fetch(url, { headers: hdrs, redirect: "manual" });
  if ([301, 302, 303, 307, 308].indexOf(res.status) !== -1 && left > 0) {
    var loc = res.headers.get("location"); if (!loc) return res;
    try { if (res.body && res.body.cancel) await res.body.cancel(); else await res.arrayBuffer(); } catch (e) {}
    var next = new URL(loc, url).href; var nextHeaders = Object.assign({}, hdrs);
    if (new URL(next).host !== new URL(url).host) delete nextHeaders.Authorization;
    return fetchFollow(next, nextHeaders, left - 1);
  }
  return res;
}
function pipeUpstream(res, upstream, buf) {
  var ct = upstream.headers.get("content-type") || "application/octet-stream";
  res.set("Content-Type", ct); res.set("Access-Control-Allow-Origin", "*");
  res.set("Accept-Ranges", upstream.headers.get("accept-ranges") || "bytes");
  var cr = upstream.headers.get("content-range"); if (cr) res.set("Content-Range", cr);
  res.status(upstream.status).send(buf);
}
async function proxyJson(url, opts) {
  opts = opts || {};
  try {
    const res = await fetch(url, { method: opts.method || "GET", headers: Object.assign({}, headers(), opts.headers || {}), body: opts.body });
    const text = await res.text();
    try { return { status: res.status, body: JSON.parse(text) }; } 
    catch (e) { return { status: res.status, body: { error: "Invalid JSON from API" } }; }
  } catch (e) { return { status: 500, body: { error: e.message } }; }
}

// ==================== المسارات الأساسية ====================
app.get("/api/years", async (req, res) => { const r = await proxyJson(API + "/api/v1/user/years"); res.status(r.status).json(r.body); });
app.get("/api/subjects/:id", async (req, res) => { const r = await proxyJson(API + "/api/v1/user/subjects/" + req.params.id); res.status(r.status).json(r.body); });
app.get("/api/subjects/:id/teachers", async (req, res) => { const r = await proxyJson(API + "/api/v1/user/subjects/" + req.params.id + "/teachers"); res.status(r.status).json(r.body); });
app.get("/api/teachers/:id/chapters", async (req, res) => { const r = await proxyJson(API + "/api/v1/user/teachers/" + req.params.id + "/chapters"); res.status(r.status).json(r.body); });
app.get("/api/chapters/:id/lectures", async (req, res) => { const r = await proxyJson(API + "/api/v1/user/chapters/" + req.params.id + "/lectures"); res.status(r.status).json(r.body); });
app.get("/api/lectures/:id/content", async (req, res) => { const r = await proxyJson(API + "/api/v1/user/lectures/" + req.params.id + "/content"); res.status(r.status).json(r.body); });
app.get("/api/profile", async (req, res) => { const r = await proxyJson(API + "/api/v1/user/profile"); res.status(r.status).json(r.body); });

// ==================== مسار الفيديو (مهم جداً) ====================
app.get("/api/video/:lectureId/session", async function (req, res) {
  const lectureId = req.params.lectureId;
  const token = req.query.token || STUDENT_TOKEN; 
  try {
    const playRes = await fetch(API + "/api/v1/video/" + lectureId + "/stream-weave/play", {
      method: "POST",
      headers: { "Content-Length": "0", "Authorization": "Bearer " + token },
      body: "",
    });
    const data = await playRes.json();
    if (!data.success) return res.status(400).json(data);
    res.json(data.data);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

app.get("/api/stream", async function (req, res) {
  try {
    var swPath = (req.query.path || "").replace(/^\/+/, "");
    var token = req.query.t;
    if (!token || !swPath) return res.status(400).json({ error: "missing path or token" });
    var url = SW + "/api/v1/" + swPath;
    var hdrs = browserHeaders({ Authorization: "Bearer " + token });
    if (req.headers.range) hdrs.Range = req.headers.range;
    var upstream = await fetchFollow(url, hdrs);
    var ct = upstream.headers.get("content-type") || "application/octet-stream";
    var isM3u8 = ct.indexOf("mpegurl") !== -1 || ct.indexOf("m3u8") !== -1 || swPath.indexOf(".m3u8") !== -1;

    if (isM3u8) {
      var text = await upstream.text();
      var base = swPath.indexOf("/") !== -1 ? swPath.substring(0, swPath.lastIndexOf("/") + 1) : "";
      text = text.split("\n").map(function (line) {
          var s = line.trim(); if (!s) return line;
          if (s.charAt(0) === "#") {
            return s.replace(/URI="([^"]+)"/g, function (_m, uri) {
              if (uri.indexOf("http") === 0) return 'URI="/api/cdn?u=' + b64urlEncode(uri) + '"';
              var clean = uri.charAt(0) === "/" ? uri.slice(1) : uri;
              clean = clean.replace(/^api\/v1\//, "");
              if (clean.indexOf("videos/") !== 0) clean = joinRel(base, clean);
              return 'URI="/api/stream?path=' + encodeURIComponent(clean) + "&t=" + encodeURIComponent(token) + '"';
            });
          }
          if (s.indexOf("http") === 0) return "/api/cdn?u=" + b64urlEncode(s);
          return "/api/stream?path=" + encodeURIComponent(joinRel(base, s)) + "&t=" + encodeURIComponent(token);
        }).join("\n");
      res.set("Content-Type", "application/vnd.apple.mpegurl");
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Cache-Control", "no-store");
      return res.status(upstream.status).send(text);
    }
    var buf = Buffer.from(await upstream.arrayBuffer());
    res.set("Cache-Control", "no-store");
    pipeUpstream(res, upstream, buf);
  } catch (e) { res.status(502).json({ error: e.message }); }
});

app.get("/api/cdn", async function (req, res) {
  try {
    var target = req.query.url || "";
    if (req.query.u) target = b64urlDecode(String(req.query.u));
    if (!target) return res.status(400).send("missing url");
    var hdrs = browserHeaders();
    if (req.headers.range) hdrs.Range = req.headers.range;
    var upstream = await fetchFollow(target, hdrs);
    var buf = Buffer.from(await upstream.arrayBuffer());
    res.set("Cache-Control", "public, max-age=30");
    pipeUpstream(res, upstream, buf);
  } catch (e) { res.status(502).send("cdn error: " + e.message); }
});

// ==================== شبكة الأمان (عشان متجيبش HTML بدل JSON) ====================
app.use("/api", function (req, res) {
  res.status(404).json({ error: "API Route Not Found", path: req.originalUrl });
});

// ==================== توجيه الواجهة ====================
app.get("*", function (req, res) {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const server = app.listen(PORT, function () { console.log("Server running on port " + PORT); });
process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000);
});
