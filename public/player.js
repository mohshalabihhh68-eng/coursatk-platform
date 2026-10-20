(function(){
'use strict';

/* ==================== Config ==================== */
const qs = new URLSearchParams(location.search);
const lectureId = qs.get('lectureId');
const initialVideoId = qs.get('videoId');
const $ = id => document.getElementById(id);
const video = $('video');
const overlay = $('overlay');
const errorOverlay = $('errorOverlay');
const errorText = $('errorText');

const TOKEN_KEY = 'cstk_tok';
let videos = [];
let current = -1;
let hls = null;
let hbTimer = null;
let saveInterval = null;
let ready = false;

if (!localStorage.getItem(TOKEN_KEY)) {
  window.location.href = 'index.html';
}

/* ==================== API Helper ==================== */
async function api(path, opts = {}) {
  try {
    const tok = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || '';
    const headers = Object.assign({}, opts.headers || {});
    if (tok) headers['Authorization'] = 'Bearer ' + tok;
    const res = await fetch(path, Object.assign({}, opts, { headers: headers }));
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch (e) { data = text; }
    if (!res.ok) {
      throw new Error((data && (data.error || data.message)) || 'HTTP ' + res.status);
    }
    return data.data !== undefined ? data.data : data;
  } catch (e) {
    console.error('API Error:', path, e);
    throw e;
  }
}

/* ==================== Storage ==================== */
function progressKey(id) { return 'cstk_w_' + id; }
function getProgress(id) {
  try { return JSON.parse(localStorage.getItem(progressKey(id)) || 'null'); }
  catch (e) { return null; }
}
function saveProgress() {
  if (current < 0 || !ready) return;
  const v = videos[current];
  if (!v) return;
  const dur = video.duration || 0;
  const t = video.currentTime || 0;
  const pct = dur ? Math.min(100, Math.round((t / dur) * 100)) : 0;
  try {
    localStorage.setItem(progressKey(v.id), JSON.stringify({
      videoId: String(v.id),
      title: v.title,
      currentTime: t,
      duration: dur,
      percent: pct,
      watched: pct >= 90,
      updatedAt: Date.now()
    }));
    const st = $('saveStatus');
    if (st) {
      st.textContent = '✅ محفوظ';
      setTimeout(() => { st.textContent = ''; }, 2000);
    }
  } catch (e) {}
}

/* ==================== UI ==================== */
function showLoading(msg) {
  overlay.classList.remove('hidden');
  overlay.innerHTML = `<div class="spinner"></div><p>${msg || 'جاري تجهيز الفيديو...'}</p>`;
}
function hideLoading() { overlay.classList.add('hidden'); }
function showError(msg) {
  hideLoading();
  errorText.textContent = msg || 'حصل خطأ أثناء تشغيل الفيديو';
  errorOverlay.classList.remove('hidden');
}
function hideError() { errorOverlay.classList.add('hidden'); }

function formatTime(sec) {
  if (isNaN(sec) || sec < 0) return '00:00';
  const t = Math.floor(sec);
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

/* ==================== Playlist ==================== */
function renderPlaylist() {
  const body = $('playlistBody');
  const sub = $('playlistSub');
  if (!videos.length) {
    body.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted);">لا توجد فيديوهات</div>';
    return;
  }
  sub.textContent = `${videos.length} فيديو`;
  body.innerHTML = videos.map((v, i) => {
    const prog = getProgress(v.id);
    const isDone = prog && (prog.watched || prog.percent >= 90);
    const isActive = i === current;
    return `
      <div class="playlist-item ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}" onclick="playVideoByIndex(${i})">
        <div class="playlist-num">${isDone ? '✓' : i + 1}</div>
        <div class="playlist-info">
          <div class="playlist-title">${esc(v.title)}</div>
          <div class="playlist-meta">${v.duration ? formatTime(v.duration) : '—'} ${isDone ? '· مكتمل' : ''}</div>
        </div>
      </div>
    `;
  }).join('');
}

/* ==================== Crypto helpers ==================== */
function findCrypto(){
  if (window.DecryptionUtils && typeof window.DecryptionUtils.decryptPlaybackKey === "function") {
    return window.DecryptionUtils;
  }
  for (const n of Object.getOwnPropertyNames(window)) {
    try {
      const o = window[n];
      if (o && typeof o === "object" && typeof o.decryptPlaybackKey === "function") return o;
    } catch (_) {}
  }
  return null;
}

function loadPlayerScript(){
  return new Promise((resolve, reject) => {
    if (findCrypto()) return resolve(findCrypto());
    let s = document.querySelector('script[src*="player.stream-weave.com"]');
    if (s) {
      let tries = 0, t = setInterval(() => {
        const c = findCrypto();
        if (c) { clearInterval(t); resolve(c); }
        else if (++tries > 40) { clearInterval(t); reject(new Error("timeout")); }
      }, 150);
      return;
    }
    s = document.createElement("script");
    s.src = "https://player.stream-weave.com/assets/player.js?v=1.1.1";
    s.onload = () => {
      let tries = 0, t = setInterval(() => {
        const c = findCrypto();
        if (c) { clearInterval(t); resolve(c); }
        else if (++tries > 40) { clearInterval(t); reject(new Error("crypto not found")); }
      }, 150);
    };
    s.onerror = () => reject(new Error("failed to load player.js"));
    document.head.appendChild(s);
  });
}

const b64e = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
const b64d = v => {
  let s = String(v).replace(/-/g,"+").replace(/_/g,"/");
  while (s.length % 4) s += "=";
  return decodeURIComponent(escape(atob(s)));
};

function joinRel(base, rel){
  let q = "", rp = String(rel), qi = rp.indexOf("?");
  if (qi !== -1) { q = rp.slice(qi); rp = rp.slice(0, qi); }
  const st = String(base || "").split("/");
  if (st.length && st[st.length-1] !== "" && /\.[a-z0-9]+$/i.test(st[st.length-1])) st.pop();
  if (st.length && st[st.length-1] === "") st.pop();
  rp.split("/").forEach(p => {
    if (!p || p === ".") return;
    if (p === "..") st.pop();
    else st.push(p);
  });
  return st.join("/") + q;
}

function resolveMedia(uri, varBase, token, varFileUrl){
  if (/^(blob:|data:)/i.test(uri)) return uri;
  if (uri.indexOf("/api/stream") === 0 || uri.indexOf("/api/cdn") === 0) return location.origin + uri;
  if (/^https?:\/\//i.test(uri)) return location.origin + "/api/cdn?u=" + b64e(uri);
  if (varFileUrl) {
    try { return location.origin + "/api/cdn?u=" + b64e(new URL(uri, varFileUrl).href); } catch (_) {}
  }
  return location.origin + "/api/stream?path=" + encodeURIComponent(joinRel(varBase || "", uri)) + "&t=" + encodeURIComponent(token);
}

function rewritePlaylist(text, token, keyBlobUrl, varBase, varFileUrl){
  return text.split("\n").map(line => {
    const s = line.trim();
    if (!s) return line;
    if (s.charAt(0) === "#") {
      if (s.indexOf("#EXT-X-KEY:") === 0 && keyBlobUrl) {
        return s.replace(/URI="[^"]+"/, `URI="${keyBlobUrl}"`);
      }
      return s.replace(/URI="([^"]+)"/g, (_m, uri) => `URI="${resolveMedia(uri, varBase, token, varFileUrl)}"`);
    }
    return resolveMedia(s, varBase, token, varFileUrl);
  }).join("\n");
}

/* ==================== Play Video ==================== */
let cryptoUtils = null;
let currentKeyBlobUrl = null;
let currentPlaylistBlobUrl = null;

async function playVideoByIndex(index) {
  if (index < 0 || index >= videos.length) return;
  saveProgress();

  current = index;
  const v = videos[index];
  ready = false;
  hideError();
  showLoading('جاري تجهيز الفيديو...');

  // Cleanup previous
  if (hbTimer) { clearInterval(hbTimer); hbTimer = null; }
  if (hls) { try { hls.destroy(); } catch (e) {} hls = null; }
  if (currentKeyBlobUrl) { URL.revokeObjectURL(currentKeyBlobUrl); currentKeyBlobUrl = null; }
  if (currentPlaylistBlobUrl) { URL.revokeObjectURL(currentPlaylistBlobUrl); currentPlaylistBlobUrl = null; }
  video.pause();
  video.removeAttribute('src');
  video.load();

  $('videoTitle').textContent = v.title || 'فيديو';
  $('lectureName').textContent = window._lectureName || '';

  renderPlaylist();

  try {
    /* 1) جلسة التشغيل */
    const session = await api('/api/video/' + v.id + '/play', { method: 'POST' });
    const tok = session.token || session.session_token;
    const swId = session.video_id;
    const hbUrl = session.heartbeat_url;

    if (!tok || !swId) throw new Error('جلسة التشغيل ناقصة');

    /* 2) تحميل مكتبة فك التشفير */
    showLoading('جاري تحضير التشغيل...');
    if (!cryptoUtils) cryptoUtils = await loadPlayerScript();

    /* 3) جلب master playlist */
    const masterUrl = '/api/stream?path=' + encodeURIComponent('videos/' + swId + '/stream/master.m3u8') + '&t=' + encodeURIComponent(tok);
    const masterRes = await fetch(masterUrl);
    if (!masterRes.ok) throw new Error('فشل تحميل master playlist (HTTP ' + masterRes.status + ')');
    const masterText = await masterRes.text();
    const variantRel = masterText.split('\n').map(l => l.trim()).find(l => l && l.charAt(0) !== '#');
    if (!variantRel) throw new Error('مفيش variant في الـ master');

    /* 4) تحديد مسار الـ variant */
    let variantUrl, varBase = 'videos/' + swId + '/stream/', varFileUrl = null;
    if (variantRel.indexOf('/api/stream') === 0 || variantRel.indexOf('/api/cdn') === 0) {
      variantUrl = variantRel;
      try {
        const u = new URL(variantRel, location.origin);
        if (u.pathname.indexOf('/api/stream') === 0 && u.searchParams.get('path')) varBase = u.searchParams.get('path');
        if (u.pathname.indexOf('/api/cdn') === 0 && u.searchParams.get('u')) varFileUrl = b64d(u.searchParams.get('u'));
      } catch (_) {}
    } else if (variantRel.indexOf('http') === 0) {
      varFileUrl = variantRel;
      variantUrl = '/api/cdn?u=' + b64e(variantRel);
    } else {
      varBase = 'videos/' + swId + '/stream/' + variantRel;
      variantUrl = '/api/stream?path=' + encodeURIComponent(varBase) + '&t=' + encodeURIComponent(tok);
    }

    /* 5) جلب variant playlist */
    const variantRes = await fetch(variantUrl);
    if (!variantRes.ok) throw new Error('فشل تحميل variant (HTTP ' + variantRes.status + ')');
    const variantText = await variantRes.text();

    /* 6) استخراج المفتاح وفك التشفير */
    showLoading('فك التشفير...');
    const keyLine = variantText.split('\n').find(l => l.indexOf('EXT-X-KEY') !== -1);
    let keyPath = 'videos/' + swId + '/key', ivHex = null;
    if (keyLine) {
      const kum = keyLine.match(/URI="([^"]+)"/), ivm = keyLine.match(/IV=0x([0-9a-fA-F]+)/i);
      if (ivm) ivHex = ivm[1];
      if (kum) {
        const uri = kum[1];
        if (uri.indexOf('/api/stream') === 0 || uri.indexOf(location.origin + '/api/stream') === 0) {
          try {
            const u = new URL(uri, location.origin);
            const pth = u.searchParams.get('path');
            if (pth) keyPath = pth;
          } catch (_) {}
        } else if (uri.indexOf('http') !== 0 && uri.indexOf('/api/cdn') !== 0) {
          keyPath = uri.replace(/^\//, '').replace(/^api\/v1\//, '');
        }
      }
    }

    const keyUrl = '/api/stream?path=' + encodeURIComponent(keyPath) + '&t=' + encodeURIComponent(tok);
    const keyRes = await fetch(keyUrl);
    if (!keyRes.ok) throw new Error('فشل تحميل المفتاح (HTTP ' + keyRes.status + ')');
    const wrappedKey = new Uint8Array(await keyRes.arrayBuffer());
    const keyResult = await cryptoUtils.decryptPlaybackKey(wrappedKey, swId);
    const aesKey = keyResult && keyResult.key;
    if (!aesKey || aesKey.byteLength !== 16) throw new Error('مفتاح التشفير غير صالح');

    const keyBytes = aesKey instanceof ArrayBuffer
      ? aesKey
      : aesKey.buffer.slice(aesKey.byteOffset, aesKey.byteOffset + aesKey.byteLength);
    currentKeyBlobUrl = URL.createObjectURL(new Blob([keyBytes], { type: 'application/octet-stream' }));

    /* 7) إعادة كتابة playlist */
    let fixedVariant = rewritePlaylist(variantText, tok, currentKeyBlobUrl, varBase, varFileUrl);
    if (fixedVariant.indexOf('#EXTM3U') !== 0) {
      fixedVariant = '#EXTM3U\n' + fixedVariant.replace(/^#EXTM3U\s*/m, '');
    }
    if (fixedVariant.indexOf('EXT-X-KEY') === -1) {
      const ivPart = ivHex ? ',IV=0x' + ivHex : '';
      fixedVariant = `#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="${currentKeyBlobUrl}"${ivPart}\n` + fixedVariant.replace(/^#EXTM3U\s*/m, '');
    }
    currentPlaylistBlobUrl = URL.createObjectURL(new Blob([fixedVariant], { type: 'application/vnd.apple.mpegurl' }));

    showLoading('جاري التشغيل...');

    /* 8) Heartbeat كل 25 ثانية */
    if (hbUrl) {
      hbTimer = setInterval(() => {
        fetch('/api/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: hbUrl, token: tok })
        }).catch(() => {});
      }, 25000);
    }

    /* 9) استئناف من المكان المحفوظ */
    const saved = getProgress(v.id);
    const resumeAt = saved && saved.currentTime > 2 && !saved.watched ? saved.currentTime : 0;

    /* 10) التشغيل */
    if (window.Hls && Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        backBufferLength: 15
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        hideLoading();
        ready = true;
        if (resumeAt > 0 && resumeAt < (video.duration || Infinity) - 2) {
          video.currentTime = resumeAt;
        }
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (e, data) => {
        if (!data.fatal) return;
        console.error('HLS Error:', data);
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          showError('مشكلة في الاتصال بالشبكة. حاول تاني.');
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          showError('مشكلة في تشغيل الفيديو. جرب متصفح تاني.');
        } else {
          showError('خطأ في تحميل الفيديو: ' + (data.details || data.type));
        }
      });

      hls.loadSource(currentPlaylistBlobUrl);
      hls.attachMedia(video);

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = currentPlaylistBlobUrl;
      video.addEventListener('loadedmetadata', () => {
        hideLoading();
        ready = true;
        if (resumeAt > 0 && resumeAt < (video.duration || Infinity) - 2) {
          video.currentTime = resumeAt;
        }
        video.play().catch(() => {});
      }, { once: true });
    } else {
      throw new Error('المتصفح لا يدعم HLS');
    }

  } catch (e) {
    console.error('Play error:', e);
    showError(e.message || 'فشل تشغيل الفيديو');
  }
}
window.playVideoByIndex = playVideoByIndex;

/* ==================== Controls ==================== */
function skip(seconds) {
  if (!video.duration) return;
  video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
}
window.skip = skip;

function changeSpeed(val) {
  video.playbackRate = parseFloat(val);
}
window.changeSpeed = changeSpeed;

/* ==================== Events ==================== */
video.addEventListener('play', () => {
  if (saveInterval) clearInterval(saveInterval);
  saveInterval = setInterval(() => { if (!video.paused && ready) saveProgress(); }, 5000);
});
video.addEventListener('pause', saveProgress);
video.addEventListener('ended', () => {
  saveProgress();
  if (current < videos.length - 1) {
    setTimeout(() => playVideoByIndex(current + 1), 1500);
  }
});
video.addEventListener('loadedmetadata', () => { ready = true; });

window.addEventListener('beforeunload', saveProgress);

/* ==================== Init ==================== */
async function init() {
  if (!lectureId) {
    showError('رابط المشغل ناقص رقم المحاضرة');
    return;
  }

  try {
    const data = await api('/api/lectures/' + lectureId + '/content');
    videos = data.videos || (Array.isArray(data) ? data : []);
    window._lectureName = (data.lecture && data.lecture.name) || data.name || 'المحاضرة';

    if (!videos.length) {
      showError('لا توجد فيديوهات في المحاضرة دي');
      return;
    }

    let idx = videos.findIndex(v => String(v.id) === String(initialVideoId));
    if (idx < 0) idx = 0;

    await playVideoByIndex(idx);

  } catch (e) {
    showError(e.message || 'فشل تحميل المحاضرة');
  }
}

/* ==================== Preload crypto library ==================== */
loadPlayerScript().then(c => { cryptoUtils = c; }).catch(() => {});

init();

})();
