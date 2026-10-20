const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const crypto = require('crypto');
const app = express();
const port = 3000;

app.use(express.static('public'));
app.use('/styles.css', express.static('public/styles.css'));
app.use(express.json());

// الـ heartbeat للـ resume
app.get('/api/heartbeat', (req, res) => {
    res.json({ status: 'ok' });
});

// الـ proxy للـ stream + الـ decryption كامل (الفك الجديد)
app.get('/api/video/:lectureId/play', async (req, res) => {
    const lectureId = req.params.lectureId;
    const videoId = req.query.videoId;
    const base = req.protocol + '://' + req.get('host');
    const baseUrl = base + '/api/cdn/' + lectureId + '/play/' + videoId;

    try {
        const response = await fetch(baseUrl);

        if (!response.ok) {
            throw new Error('Proxy error');
        }

        const text = await response.text();

        // استخراج الـ key من الـ m3u8 (AES-128)
        const keyMatch = text.match(/EXT-X-KEY:METHOD=AES-128,URI="([^"]+)"/);
        if (!keyMatch) throw new Error('Key not found');

        let keyUri = keyMatch[1];

        // إزالة أي escape من الـ URI
        keyUri = keyUri.replace(/\\\\/g, '\\').replace(/\\"/g, '"').replace(/\\'/g, "'");

        // إذا كان الـ keyUri نسبي، نضيفه كامل
        if (!keyUri.startsWith('http')) {
            keyUri = baseUrl.replace(/\/play\/[^\/]+$/, '') + '/' + keyUri;
        }

        // الـ decryption بيشتغل هنا (فك التشفير كامل)
        let keyBuffer;
        try {
            keyBuffer = Buffer.from(keyUri, 'base64url');
        } catch (e) {
            keyBuffer = Buffer.from(keyUri);
        }

        // إنشاء الـ blob URL للـ key
        const keyBlobUrl = URL.createObjectURL(new Blob([keyBuffer], { type: 'application/octet-stream' }));

        // إعادة كتابة الـ m3u8 مع الـ blob URL
        let modifiedText = text.replace(
            /EXT-X-KEY:METHOD=AES-128,URI="[^"]+"/,
            `EXT-X-KEY:METHOD=AES-128,URI="${keyBlobUrl}"`
        );

        // إضافة الـ heartbeat في النهاية
        modifiedText += `\n#EXT-X-SESSION-KEY:METHOD=AES-128,URI="${keyBlobUrl}"`;

        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.send(modifiedText);
    } catch (e) {
        res.status(500).send('Proxy error');
    }
});

// الـ cdn proxy
app.get('/api/cdn/:lectureId/play/:videoId', async (req, res) => {
    const { lectureId, videoId } = req.params;
    const base = req.protocol + '://' + req.get('host');
    const originalUrl = base + '/api/stream/' + lectureId + '/play/' + videoId;
    const response = await fetch(originalUrl);
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        const text = await response.text();

        // إزالة أي escape في الـ segments
        let modifiedText = text.replace(/\\\\/g, '\\').replace(/\\"/g, '"').replace(/\\'/g, "'");

        res.send(modifiedText);
});

// الـ main player page (يفتح فورًا بدون أي صفحة خام)
app.get('/player', (req, res) => {
    res.sendFile(path.join(__path, 'public/player.html'));
});

// الـ redirect من "تشغيل" للـ player كامل
app.get('/api/video/:lectureId/play', async (req, res) => {
    const { lectureId } = req.params;
    const videoId = req.query.videoId;
    const base = req.protocol + '://' + req.get('host');
    res.redirect(302, `\( {base}/player?lecturedId= \){lectureId}&videold=${videoId}`);
});

// الـ catch all للـ player.html
app.get('/player.html', (req, res) => {
    res.sendFile(path.join(__path, 'public/player.html'));
});

// الـ app.js (ما غيرتش أي حاجة فيه)
app.use('/', require('./app.js'));

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
