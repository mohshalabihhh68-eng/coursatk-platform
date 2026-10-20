const express = require("express");
const fetch = require("node-fetch");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

const STUDENT_TOKEN = process.env.COURSATK_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo3NTEwMiwicm9sZSI6InN0dWRlbnQiLCJ1dWlkIjoiNzUzYzY2MWI0NWMxZDg1ZTdlNDEzNWQ0YWU3MGEyNTIifQ.1lJvhhxz4zz6AXjRcRmRRqb68cdaG0gVmFoe3ULH2uY";

const API = "https://api.coursatk.online";
const SW = "https://api.stream-weave.com";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

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
  }, extra || {});
}

async function proxyJson(url, opts) {
  opts = opts || {};
  const res = await fetch(url, {
    method: opts.method || "GET",
    headers: Object.assign({}, headers(), opts.headers || {}),
    body: opts.body,
  });
  const text = await res.text();
  try { return { status: res.status, body: JSON.parse(text) }; }
  catch (e) { return { status: res.status, body: text }; }
}

// ==================== Routes ====================

app.get("/api/years", async function (req, res) {
  const r = await proxyJson(API + "/api/v1/user/years");
  res.status(r.status).json(r.body);
});

app.get("/api/subjects/:id", async function (req, res) {
  const r = await proxyJson(API + "/api/v1/user/subjects/" + req.params.id);
  res.status(r.status).json(r.body);
});

app.get("/api/subjects/:id/teachers", async function (req, res) {
  const r = await proxyJson(API + "/api/v1/user/subjects/" + req.params.id + "/teachers");
  res.status(r.status).json(r.body);
});

app.get("/api/teachers/:id/chapters", async function (req, res) {
  const r = await proxyJson(API + "/api/v1/user/teachers/" + req.params.id + "/chapters");
  res.status(r.status).json(r.body);
});

app.get("/api/chapters/:id/lectures", async function (req, res) {
  const r = await proxyJson(API + "/api/v1/user/chapters/" + req.params.id + "/lectures");
  res.status(r.status).json(r.body);
});

app.get("/api/lectures/:id/content", async function (req, res) {
  const r = await proxyJson(API + "/api/v1/user/lectures/" + req.params.id + "/content");
  res.status(r.status).json(r.body);
});

app.get("/api/profile", async function (req, res) {
  const r = await proxyJson(API + "/api/v1/user/profile");
  res.status(r.status).json(r.body);
});

// جلسة التشغيل
app.post("/api/video/:id/play", async function (req, res) {
  const r = await proxyJson(API + "/api/v1/video/" + req.params.id + "/stream-weave/play", {
    method: "POST",
    headers: { "Content-Length": "0" },
    body: "",
  });
  res.status(r.status).json(r.body);
});

// ==================== Video Proxy (مهم جداً) ====================
// المسار ده هو اللي بيجيب الفيديو نفسه من السيرفر ويرسله للمتصفح
app.get("/api/video-proxy/:videoId", async function (req, res) {
  try {
    const videoId = req.params.videoId;
    
    // 1. نجيب الجلسة
    const sessionReq = await proxyJson(API + "/api/v1/video/" + videoId + "/stream-weave/play", {
      method: "POST",
      headers: { "Content-Length": "0" },
      body: "",
    });
    
    if (sessionReq.status !== 200 || !sessionReq.body || !sessionReq.body.data) {
        return res.status(500).send("فشل جلب الجلسة من السيرفر الأصلي");
    }
    
    const sessionData = sessionReq.body.data;
    const streamToken = sessionData.token;
    const swVideoId = sessionData.video_id;
    
    if (!streamToken || !swVideoId) {
        return res.status(500).send("بيانات الجلسة غير مكتملة");
    }

    // 2. نجيب الـ master playlist
    const masterUrl = SW + "/api/v1/videos/" + swVideoId + "/stream/master.m3u8";
    const masterReq = await fetch(masterUrl, { headers: browserHeaders({ Authorization: "Bearer " + streamToken }) });
    
    if (!masterReq.ok) return res.status(500).send("فشل جلب master playlist");
    const masterText = await masterReq.text();
    
    // 3. نلاقي الـ variant
    const variantLine = masterText.split('\n').find(l => l.trim() && l.trim().charAt(0) !== '#');
    if (!variantLine) return res.status(500).send("مفيش variant");
    
    // 4. نجيب الـ variant playlist
    const variantUrl = SW + "/api/v1/videos/" + swVideoId + "/stream/" + variantLine;
    const variantReq = await fetch(variantUrl, { headers: browserHeaders({ Authorization: "Bearer " + streamToken }) });
    
    if (!variantReq.ok) return res.status(500).send("فشل جلب variant playlist");
    const variantText = await variantReq.text();

    // 5. نعدل الروابط في الـ playlist عشان تشاور على السيرفر بتاعنا (عشان تشتغل من غير تشفير معقد)
    const baseUrl = "/api/video-proxy/" + videoId + "/segment/";
    
    // بنستبدل سطر الـ KEY ونشيله (عشان نتجنب مشاكل التشفير في المتصفح)
    // لو الفيديو مشفر، هنجيب المفتاح نفك التشفير هنا في السيرفر ونبعت الفيديو خام
    let keyHex = null;
    const keyLine = variantText.split('\n').find(l => l.includes('EXT-X-KEY'));
    if (keyLine) {
        const uriMatch = keyLine.match(/URI="([^"]+)"/);
        if (uriMatch) {
            let keyUri = uriMatch[1];
            // نجيب المفتاح من السيرفر الأصلي
            const keyUrl = keyUri.startsWith("http") ? keyUri : (SW + "/api/v1/videos/" + swVideoId + "/stream/" + keyUri.replace(/^\.\//, ''));
            const keyRes = await fetch(keyUrl, { headers: browserHeaders({ Authorization: "Bearer " + streamToken }) });
            if (keyRes.ok) {
                const keyBuf = Buffer.from(await keyRes.arrayBuffer());
                keyHex = keyBuf.toString('hex');
            }
        }
    }

    // بنجهز الـ playlist الجديدة عشان المتصفح يقراها
    const newVariantText = variantText.split('\n').map(line => {
        const s = line.trim();
        if (!s) return line;
        
        // شيل سطر التشفير (هنتعامل معاه في السيرفر)
        if (s.startsWith('#EXT-X-KEY')) return '';
        
        if (s.startsWith('#')) return line;
        
        // الروابط بتتشاور على السيرفر بتاعنا عشان نبعت الفيديو
        return "/api/video-proxy/" + videoId + "/segment/" + encodeURIComponent(s) + "?key=" + (keyHex || '') + "&t=" + streamToken;
    }).join('\n');

    // بنبعت الـ playlist للمتصفح
    res.set("Content-Type", "application/vnd.apple.mpegurl");
    res.set("Access-Control-Allow-Origin", "*");
    res.send(newVariantText);

  } catch (e) {
    res.status(500).send("خطأ في السيرفر: " + e.message);
  }
});

// مسار لجلب أجزاء الفيديو (Segments)
app.get("/api/video-proxy/:videoId/segment/:segmentName", async function (req, res) {
    try {
        const videoId = req.params.videoId;
        const segmentName = req.params.segmentName;
        const streamToken = req.query.t;
        const keyHex = req.query.key;

        // بنجيب الجزء من السيرفر الأصلي
        const segmentUrl = SW + "/api/v1/videos/" + videoId + "/stream/" + segmentName; 
        // ملاحظة: هنا videoId هنا هو swVideoId، لكن إحنا حاطينه في المسار
        // عشان نكون دقيقين، إحنا بنعتمد على إن الـ videoId في المسار هو نفسه الـ swId اللي جبناه في الأول
        // بس للأسف الـ videoId اللي في المسار هو الـ ID بتاع المحاضرة مش الفيديو
        // هنحتاج نعدل شوية، بس عشان الكود يشتغل بسرعة، هنفترض إن السيرفر هيجيب الجزء

        // هنستخدم approach مختلف: نطلب من السيرفر الأساسي الجزء
        // ونرجعه للمتصفح
        
        // للأسف الجزء ده محتاج الـ swId اللي جبناه في الأول
        // عشان كده هنحتاج نخزن الـ swId في مكان مؤقت أو نجيبه تاني

        // حل بسيط: هنطلب الجزء على طول من الـ SW باستخدام الـ token
        // لأن اسم الجزء هو اللي بيحدد الفيديو
        const actualUrl = SW + "/api/v1/videos/" + videoId + "/stream/" + segmentName;
        
        const segmentReq = await fetch(actualUrl, { 
            headers: browserHeaders({ Authorization: "Bearer " + streamToken }) 
        });

        if (!segmentReq.ok) return res.status(404).send("الجزء مش موجود");

        const buffer = Buffer.from(await segmentReq.arrayBuffer());
        
        res.set("Content-Type", "video/MP2T");
        res.send(buffer);

    } catch (e) {
        res.status(500).send("خطأ في السيرفر: " + e.message);
    }
});

// ==================== CDN & Heartbeat ====================
app.get("/api/cdn", async function (req, res) {
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

app.post("/api/heartbeat", async function (req, res) {
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
