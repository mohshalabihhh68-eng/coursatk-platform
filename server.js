const express = require("express");
const fetch = require("node-fetch");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

const STUDENT_TOKEN =
  process.env.COURSATK_TOKEN ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo3NTEwMiwicm9sZSI6InN0dWRlbnQiLCJ1dWlkIjoiNmY4NmViNzVlMGNiYzkyYTQ2MzRmZDM5NzMyZmU1NjUifQ.vtogp7QoIQ8MFhR5MZTSKW-NNWCfYVpJ6ORS6dzPQ_k";

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
    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
  };
}

async function proxyJson(url, opts) {
  opts = opts || {};
  const res = await fetch(url, {
    method: opts.method || "GET",
    headers: Object.assign({}, headers(), opts.headers || {}),
    body: opts.body,
  });
  const text = await res.text();
  try {
    return { status: res.status, body: JSON.parse(text) };
  } catch (e) {
    return { status: res.status, body: text };
  }
}

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

app.post("/api/video/:id/play", async function (req, res) {
  const r = await proxyJson(API + "/api/v1/video/" + req.params.id + "/stream-weave/play", {
    method: "POST",
    headers: { "Content-Length": "0" },
    body: "",
  });
  res.status(r.status).json(r.body);
});

app.get("/api/cdn", async function (req, res) {
  try {
    var target = req.query.url || "";
    if (req.query.u) {
      target = Buffer.from(String(req.query.u), "base64").toString("utf8");
    }
    if (!target) return res.status(400).send("missing url");
    var upstream = await fetch(target, {
      headers: {
        Origin: "https://coursatk.online",
        Referer: "https://coursatk.online/",
        Accept: "*/*",
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      redirect: "follow",
    });
    var ct = upstream.headers.get("content-type") || "application/octet-stream";
    res.set("Content-Type", ct);
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Cache-Control", "public, max-age=30");
    var buf = Buffer.from(await upstream.arrayBuffer());
    res.status(upstream.status).send(buf);
  } catch (e) {
    res.status(502).send("cdn error: " + e.message);
  }
});

app.get("/api/stream", async function (req, res) {
  try {
    var swPath = (req.query.path || "").replace(/^\/+/, "");
    var token = req.query.t;
    if (!token || !swPath) return res.status(400).json({ error: "missing path or token" });

    var url = SW + "/api/v1/" + swPath;
    var upstream = await fetch(url, {
      headers: {
        Authorization: "Bearer " + token,
        Origin: "https://coursatk.online",
        Referer: "https://coursatk.online/",
        Accept: "*/*",
      },
    });

    var ct = upstream.headers.get("content-type") || "application/octet-stream";
    res.set("Content-Type", ct);
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Cache-Control", "no-store");

    var isM3u8 =
      ct.indexOf("mpegurl") !== -1 ||
      ct.indexOf("m3u8") !== -1 ||
      swPath.indexOf(".m3u8") !== -1;

    if (isM3u8) {
      var text = await upstream.text();
      var base =
        swPath.indexOf("/") !== -1
          ? swPath.substring(0, swPath.lastIndexOf("/") + 1)
          : "";

      text = text
        .split("\n")
        .map(function (line) {
          var s = line.trim();
          if (!s) return line;
          if (s.charAt(0) === "#") {
            return s.replace(/URI="([^"]+)"/g, function (_m, uri) {
              if (uri.indexOf("http") === 0) {
                return 'URI="/api/cdn?u=' + Buffer.from(uri).toString("base64") + '"';
              }
              var clean = uri.charAt(0) === "/" ? uri.slice(1) : uri;
              clean = clean.replace(/^api\/v1\//, "");
              return (
                'URI="/api/stream?path=' +
                encodeURIComponent(clean) +
                "&t=" +
                encodeURIComponent(token) +
                '"'
              );
            });
          }
          if (s.indexOf("http") === 0) {
            return "/api/cdn?u=" + Buffer.from(s).toString("base64");
          }
          return (
            "/api/stream?path=" +
            encodeURIComponent(base + s) +
            "&t=" +
            encodeURIComponent(token)
          );
        })
        .join("\n");
      return res.send(text);
    }

    var buf = Buffer.from(await upstream.arrayBuffer());
    res.status(upstream.status).send(buf);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

app.post("/api/heartbeat", async function (req, res) {
  try {
    var url = req.body && req.body.url;
    var token = req.body && req.body.token;
    if (!url || !token) return res.status(400).json({ error: "url+token required" });
    var upstream = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        Origin: "https://coursatk.online",
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    var text = await upstream.text();
    res.status(upstream.status).type("json").send(text);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

app.get("*", function (req, res) {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, function () {
  console.log("Running on port " + PORT);
});
