/**
 * Thanawya upstream relay — وسيط بسيط لتجاوز حظر Cloudflare على IP الاستضافة
 * متوافق مع UPSTREAM_RELAY_URL في server.js الأصلي
 *
 * تشغيل محلي: node server.js
 * المتغير الاختياري: RELAY_SECRET (نفس القيمة في Vercel)
 */
import http from "node:http";

const PORT = Number(process.env.PORT || 8080);
const SECRET = (process.env.RELAY_SECRET || "").trim();
const MAX_TIMEOUT = 55_000;

function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS,GET",
    "Access-Control-Allow-Headers": "Content-Type,X-Relay-Secret"
  });
  res.end(body);
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST,OPTIONS,GET",
      "Access-Control-Allow-Headers": "Content-Type,X-Relay-Secret"
    });
    return res.end();
  }

  if (req.method === "GET" && (req.url === "/" || req.url === "/health")) {
    return send(res, 200, { ok: true, service: "thanawya-relay", now: new Date().toISOString() });
  }

  if (req.method !== "POST") {
    return send(res, 405, { error: "POST only" });
  }

  if (SECRET) {
    const got = String(req.headers["x-relay-secret"] || "");
    if (got !== SECRET) return send(res, 401, { error: "invalid relay secret" });
  }

  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    return send(res, 400, { error: "invalid json body" });
  }

  const targetUrl = String(payload.url || "");
  if (!/^https:\/\//i.test(targetUrl)) {
    return send(res, 400, { error: "url must be https" });
  }

  // أمان أساسي: اسمح بـ Coursatk / Firebase / Thanawica فقط
  let host = "";
  try { host = new URL(targetUrl).hostname; } catch {
    return send(res, 400, { error: "bad url" });
  }
  const allowed =
    host === "api.coursatk.online" ||
    host.endsWith(".coursatk.online") ||
    host.endsWith(".firebaseio.com") ||
    host.endsWith(".firebasedatabase.app") ||
    host.endsWith(".googleapis.com") ||
    host.includes("thanawica") ||
    host.includes("stream-weave");
  if (!allowed) {
    return send(res, 403, { error: "host not allowed: " + host });
  }

  const method = String(payload.method || "GET").toUpperCase();
  const headers = { ...(payload.headers || {}) };
  delete headers["host"];
  delete headers["content-length"];

  let body;
  if (payload.bodyBase64 && method !== "GET" && method !== "HEAD") {
    body = Buffer.from(payload.bodyBase64, "base64");
  }

  const timeout = Math.min(Number(payload.timeout) || 20_000, MAX_TIMEOUT);

  try {
    const r = await fetch(targetUrl, {
      method,
      headers,
      body,
      signal: AbortSignal.timeout(timeout),
      redirect: "follow"
    });
    const buf = Buffer.from(await r.arrayBuffer());
    const outHeaders = {};
    r.headers.forEach((v, k) => { outHeaders[k] = v; });
    return send(res, 200, {
      status: r.status,
      bodyBase64: buf.toString("base64"),
      headers: outHeaders,
      contentType: r.headers.get("content-type") || "application/octet-stream"
    });
  } catch (e) {
    return send(res, 502, { error: e.message || "relay fetch failed" });
  }
});

server.listen(PORT, () => {
  console.log(`[thanawya-relay] :${PORT} secret=${SECRET ? "yes" : "no"}`);
});
