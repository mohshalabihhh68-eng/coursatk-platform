/**
 * Backend proxy - pulls from coursatk API
 */
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

function coursatkHeaders() {
  return {
    Authorization: `Bearer ${STUDENT_TOKEN}`,
    Accept: "application/json",
    Origin: "https://coursatk.online",
    Referer: "https://coursatk.online/",
    "User-Agent":
      "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36",
  };
}

async function proxyJson(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { ...coursatkHeaders(), ...(opts.headers || {}) },
  });
  const text = await res.text();
  try {
    return { status: res.status, body: JSON.parse(text) };
  } catch {
    return { status: res.status, body: text };
  }
}

app.get("/api/years", async (_req, res) => {
  const { status, body } = await proxyJson(`${API}/api/v1/user/years`);
  res.status(status).json(body);
});

app.get("/api/subjects/:yearId", async (req, res) => {
  const { status, body } = await proxyJson(
    `\( {API}/api/v1/user/subjects/ \){req.params.yearId}`
  );
  res.status(status).json(body);
});

app.get("/api/subjects/:subjectId/teachers", async (req, res) => {
  const { status, body } = await proxyJson(
    `\( {API}/api/v1/user/subjects/ \){req.params.subjectId}/teachers`
  );
  res.status(status).json(body);
});

app.get("/api/teachers/:teacherId/chapters", async (req, res) => {
  const { status, body } = await proxyJson(
    `\( {API}/api/v1/user/teachers/ \){req.params.teacherId}/chapters`
  );
  res.status(status).json(body);
});

app.get("/api/chapters/:chapterId/lectures", async (req, res) => {
  const { status, body } = await proxyJson(
    `\( {API}/api/v1/user/chapters/ \){req.params.chapterId}/lectures`
  );
  res.status(status).json(body);
});

app.get("/api/lectures/:lectureId/content", async (req, res) => {
  const { status, body } = await proxyJson(
    `\( {API}/api/v1/user/lectures/ \){req.params.lectureId}/content`
  );
  res.status(status).json(body);
});

app.get("/api/profile", async (_req, res) => {
  const { status, body } = await proxyJson(`${API}/api/v1/user/profile`);
  res.status(status).json(body);
});

app.post("/api/video/:videoId/play", async (req, res) => {
  const { status, body } = await proxyJson(
    `\( {API}/api/v1/video/ \){req.params.videoId}/stream-weave/play`,
    { method: "POST", headers: { "Content-Length": "0" } }
  );
  res.status(status).json(body);
});

app.get("/api/stream/*", async (req, res) => {
  const swPath = req.params[0];
  const token = req.query.t;
  if (!token) return res.status(400).json({ error: "missing token" });

  const url = `\( {SW}/api/v1/ \){swPath}`;
  const upstream = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Origin: "https://coursatk.online",
      Referer: "https://coursatk.online/",
      Accept: "*/*",
    },
  });

  const ct = upstream.headers.get("content-type") || "application/octet-stream";
  res.set("Content-Type", ct);
  res.set("Access-Control-Allow-Origin", "*");

  if (ct.includes("mpegurl") || ct.includes("m3u8") || swPath.endsWith(".m3u8")) {
    let text = await upstream.text();
    text = text.replace(/^(?!#)(?!https?:\/\/)(.+)$/gm, (line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith("http")) return trimmed;
      const base = swPath.includes("/")
        ? swPath.substring(0, swPath.lastIndexOf("/") + 1)
        : "";
      return `/api/stream/\( {base} \){trimmed}?t=${encodeURIComponent(token)}`;
    });
    text = text.replace(/URI="([^"]+)"/g, (_m, uri) => {
      if (uri.startsWith("http")) return `URI="${uri}"`;
      const clean = uri.startsWith("/") ? uri.slice(1) : uri;
      const keyPath = clean.replace(/^api\/v1\//, "");
      return `URI="/api/stream/\( {keyPath}?t= \){encodeURIComponent(token)}"`;
    });
    return
