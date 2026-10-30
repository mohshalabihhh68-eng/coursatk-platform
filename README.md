# Thanawya Relay

وسيط بسيط لأن Cloudflare حاجب IP بتاع Vercel عن Coursatk.

## المطلوب
1. ارفع المجلد ده على أي استضافة Node **IP-ها مش محجوب**
2. خُد الرابط العام، مثال: `https://xxxx.onrender.com`
3. في Vercel → Environment Variables:
   - `UPSTREAM_RELAY_URL` = `https://xxxx.onrender.com`
   - `RELAY_SECRET` = نفس السر لو حطيته هنا
4. Redeploy مشروع Vercel

## استضافات ممكنة (مجاني / رخيص)
- **Render** (Free): لو قدرت تسجّل — الـ Free بينام بعد خمول؛ استخدم UptimeRobot يوقظه
- **Railway** الحد المجاني / رصيد
- **Oracle Cloud Always Free** (VM)
- أي VPS رخيص

## تشغيل محلي للتجربة
```bash
npm start
# أو
RELAY_SECRET=mysecret node server.js
```

## فحص
```
GET  /health  → { ok: true }
POST /        → body: { url, method, headers, bodyBase64, timeout }
```
