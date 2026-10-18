// ==================== State ====================
const state = { view: "years", year: null, subject: null, teacher: null, chapter: null, lecture: null };
let hls = null;
let hbTimer = null;
let cryptoUtils = null;
let currentKeyBlobUrl = null;
let currentPlaylistBlobUrl = null;

const appEl = document.getElementById("app");
const videoEl = document.getElementById("video");
const playerContainer = document.getElementById("custom-player");
const clickLayer = document.getElementById("click-layer");

// ==================== API & Utils ====================
async function api(path, opts = {}) {
  const res = await fetch(path, opts);
  const data = await res.json();
  if (!res.ok || data.success === false) throw new Error(data.error || data.message || "HTTP " + res.status);
  return data.data !== undefined ? data.data : data;
}

function goHome() {
  state.view = "years"; state.year = null; state.subject = null; state.teacher = null; state.chapter = null; state.lecture = null;
  render();
}
function setView(view, extra) {
  if (extra) Object.assign(state, extra);
  state.view = view;
  render();
  window.scrollTo(0, 0);
}

// ==================== Render Logic ====================
async function render() {
  appEl.innerHTML = '<div class="loading">جاري التحميل...</div>';
  try {
    if (state.view === "years") await renderYears();
    else if (state.view === "subjects") await renderSubjects();
    else if (state.view === "teachers") await renderTeachers();
    else if (state.view === "chapters") await renderChapters();
    else if (state.view === "lectures") await renderLectures();
    else if (state.view === "content") await renderContent();
  } catch (e) {
    appEl.innerHTML = '<div style="color:red;text-align:center;padding:50px;">خطأ: ' + e.message + "</div>";
  }
}

async function renderYears() {
  const years = await api("/api/years");
  let html = `
    <div class="page-title-area">
      <div class="page-badge">📚 مسار علمي علوم</div>
      <h1>المواد الدراسية <span>2027</span></h1>
      <p>اختار المادة اللي عايز تكمل فيها وتابع المحاضرات والواجبات مع أفضل المدرسين.</p>
    </div>
    <div class="grid">`;
  years.forEach(y => {
    html += `
      <div class="card" onclick='setView("subjects", ${JSON.stringify({ year: y })})'>
        <div class="card-img-wrapper">
          <img src="${y.image_url || ''}" onerror="this.style.display='none'" />
          <div class="status-badge">🟢 متاح الان</div>
        </div>
        <div class="card-body">
          <div class="card-header-info">
            <div class="card-year">2027</div>
            <div class="card-title">${y.name}</div>
          </div>
          <div class="meta-row"><span>آخر تحديث: 2027/8/20</span><span>⏱</span></div>
          <button class="btn-gradient">عرض المدرسين ←</button>
        </div>
      </div>`;
  });
  appEl.innerHTML = html + "</div>";
}

async function renderSubjects() {
  const subjects = await api("/api/subjects/" + state.year.id);
  let html = `
    <div class="page-title-area">
      <button class="back-btn-top" onclick="goHome()">← رجوع للسنين</button>
      <div class="page-badge">🗂️ السنة</div>
      <h1>مواد <span>${state.year.name}</span></h1>
      <p>اختار المادة اللي عايز تكمل فيها وتابع المحاضرات.</p>
    </div>
    <div class="grid">`;
  subjects.forEach(s => {
    html += `
      <div class="card" onclick='setView("teachers", ${JSON.stringify({ subject: s })})'>
        <div class="card-img-wrapper">
          <img src="${s.image_url || ''}" onerror="this.style.display='none'" />
          <div class="status-badge">🟢 متاح الان</div>
        </div>
        <div class="card-body">
          <div class="card-header-info">
            <div class="card-year">2027</div>
            <div class="card-title">${s.name}</div>
          </div>
          <div class="meta-row"><span>آخر تحديث: 2027/8/20</span><span>⏱</span></div>
          <button class="btn-gradient">عرض المدرسين ←</button>
        </div>
      </div>`;
  });
  appEl.innerHTML = html + "</div>";
}

async function renderTeachers() {
  const data = await api("/api/subjects/" + state.subject.id + "/teachers");
  const teachers = data.teachers || [];
  let html = `
    <div class="page-title-area">
      <button class="back-btn-top" onclick='setView("subjects", ${JSON.stringify({ year: state.year })})'>← رجوع للمواد</button>
      <div class="page-badge">السنة</div>
      <h1>مدرسين <span>المادة</span></h1>
      <p>اختار المدرس اللي تحب تتابع معاه وشوف الفصول المتاحة.</p>
    </div>
    <div class="grid">`;
  teachers.forEach(t => {
    html += `
      <div class="teacher-card">
        <div class="teacher-top">
          <div class="teacher-info">
            <div class="teacher-role">مدرس المادة</div>
            <div class="teacher-name">${t.name}</div>
          </div>
          <img class="teacher-avatar" src="${t.image_url || ''}" onerror="this.style.display='none'" />
        </div>
        <div class="teacher-stats">
          <span class="count-badge">${t.chapter_count || 0}</span>
          <span>الفصول المتاحة 📚</span>
        </div>
        <button class="btn-gradient" onclick='setView("chapters", ${JSON.stringify({ teacher: t })})'>اكتشف الفصول ←</button>
      </div>`;
  });
  appEl.innerHTML = html + "</div>";
}

async function renderChapters() {
  const chapters = await api("/api/teachers/" + state.teacher.id + "/chapters");
  let html = `
    <div class="page-title-area">
      <button class="back-btn-top" onclick='setView("teachers", ${JSON.stringify({ subject: state.subject })})'>← رجوع للمدرسين</button>
      <div class="page-badge">English</div>
      <h1>فصول <span>${state.teacher.name}</span></h1>
      <p>استكشف الفصول المتاحة، اعرف عدد المحاضرات، وابدأ مذاكرة المنهج.</p>
    </div>
    <div class="grid">`;
  chapters.forEach(c => {
    html += `
      <div class="teacher-card">
        <div class="teacher-top">
          <div class="teacher-info">
            <div class="teacher-role">الفصل ${c.order || ''}</div>
            <div class="teacher-name">${c.name}</div>
            <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;">م. ${state.teacher.name}</div>
          </div>
          <img class="teacher-avatar" src="${c.image_url || ''}" onerror="this.style.opacity=0.3" />
        </div>
        <div class="teacher-stats">
          <span class="count-badge">${c.lecture_count || 0}</span>
          <span>عدد المحاضرات ⏱</span>
        </div>
        <button class="btn-gradient" onclick='setView("lectures", ${JSON.stringify({ chapter: c })})'>مشاهدة المحاضرات ←</button>
      </div>`;
  });
  appEl.innerHTML = html + "</div>";
}

async function renderLectures() {
  const lectures = await api("/api/chapters/" + state.chapter.id + "/lectures");
  let html = `
    <div class="page-title-area">
      <button class="back-btn-top" onclick='setView("chapters", ${JSON.stringify({ teacher: state.teacher })})'>← رجوع للفصول</button>
      <div class="page-badge">${state.teacher.name}</div>
      <h1>${state.chapter.name}</h1>
      <p>دي قائمة المحاضرات اللي في الفصل ده.</p>
    </div>
    <div class="grid">`;
  lectures.forEach((l, idx) => {
    html += `
      <div class="card">
        <div class="card-body">
          <div class="card-header-info">
            <div class="card-year">المحاضرة ${idx + 1}</div>
            <div class="card-title">${l.name}</div>
          </div>
          <div class="content-icon-box">
             <div class="content-icon-item">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
               <span>${l.video_count || 0}</span><small>فيديو</small>
             </div>
             <div class="content-icon-item">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
               <span>${l.pdf_count || 0}</span><small>ملف</small>
             </div>
             <div class="content-icon-item">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
               <span>${l.exam_count || 0}</span><small>امتحان</small>
             </div>
          </div>
          <button class="btn-gradient" onclick='setView("content", ${JSON.stringify({ lecture: l })})'>محتوي المحاضرة ←</button>
        </div>
      </div>`;
  });
  appEl.innerHTML = html + "</div>";
}

async function renderContent() {
  const content = await api("/api/lectures/" + state.lecture.id + "/content");
  const videos = content.videos || [];
  const pdfs = content.pdfs || [];

  let html = `
    <div class="page-title-area" style="text-align:right; margin-bottom:20px;">
      <button class="back-btn-top" style="right:auto;left:0;" onclick='setView("lectures", ${JSON.stringify({ chapter: state.chapter })})'>← رجوع</button>
      <div class="page-badge">المحاضرة #${state.lecture.id}</div>
      <h1>محتوي <span>${state.lecture.name}</span></h1>
      <p>ذاكر المحاضرة كاملة من فيديوهات وملفات.</p>
    </div>
    
    <div class="card" style="padding:24px; margin-bottom:24px; cursor:default;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom:1px solid var(--border); padding-bottom:16px;">
        <h2 style="font-size:1.2rem;">الفيديوهات</h2>
        <span class="page-badge">${videos.length} فيديو متاح</span>
      </div>
      <div class="grid">`;

  videos.forEach((v, i) => {
    const title = String(v.title).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    html += `
      <div class="video-card">
        <div class="video-thumbnail">
          <img src="${v.thumbnail_url || ''}" onerror="this.style.display='none'" />
          <div class="video-num-badge">فيديو #${i + 1}</div>
          <div class="video-duration-badge">⏱ ${v.duration || '00:00'}</div>
          <div class="play-overlay">
            <div class="play-btn-circle">
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M8 5v14l11-7z"/></svg>
            </div>
          </div>
        </div>
        <div style="padding:16px; text-align:center;">
          <h3 style="font-size:1rem; margin-bottom:16px;">${v.title}</h3>
          <button class="btn-gradient" onclick="playVideo(${v.id}, '${title}')">تشغيل الفيديو ▶</button>
        </div>
      </div>`;
  });
  
  html += `</div></div>`;

  if (pdfs.length > 0) {
    html += `
      <div class="card" style="padding:24px; cursor:default;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid var(--border); padding-bottom:16px;">
          <h2 style="font-size:1.2rem;">ملفات الشرح</h2>
          <span class="page-badge">${pdfs.length} ملف متاح</span>
        </div>
        <div class="grid">`;
    pdfs.forEach((p) => {
      html += `
        <div class="card" style="padding:20px; text-align:center; background:var(--bg-card-light); cursor:default;">
          <h3 style="font-size:1rem; margin-bottom:16px;">${p.title}</h3>
          <div style="display:flex; gap:10px;">
            <a href="${p.url}" target="_blank" class="btn-gradient" style="text-decoration:none; flex:1; padding:10px; font-size:0.85rem;">عرض 👁</a>
            <a href="${p.url}" download class="btn-gradient" style="text-decoration:none; flex:1; padding:10px; font-size:0.85rem; background:#3b2a15;">تحميل ⬇</a>
          </div>
        </div>`;
    });
    html += `</div></div>`;
  }

  appEl.innerHTML = html;
}

// ==================== Player Logic (Crypto & Decrypt) ====================
function findCrypto() {
  if (window.DecryptionUtils && typeof window.DecryptionUtils.decryptPlaybackKey === "function") return window.DecryptionUtils;
  var names = Object.getOwnPropertyNames(window);
  for (var i = 0; i < names.length; i++) {
    try {
      var obj = window[names[i]];
      if (obj && typeof obj === "object" && typeof obj.decryptPlaybackKey === "function") return obj;
    } catch (e) {}
  }
  return null;
}

function loadPlayerScript() {
  return new Promise(function (resolve, reject) {
    if (findCrypto()) return resolve(findCrypto());
    var existing = document.querySelector('script[src*="player.stream-weave.com"]');
    if (existing) {
      var tries = 0; var t = setInterval(function () {
        var c = findCrypto();
        if (c) { clearInterval(t); resolve(c); } else if (++tries > 40) { clearInterval(t); reject(new Error("timeout crypto")); }
      }, 150);
      return;
    }
    var s = document.createElement("script");
    s.src = "https://player.stream-weave.com/assets/player.js?v=1.1.1";
    s.onload = function () {
      var tries = 0; var t = setInterval(function () {
        var c = findCrypto();
        if (c) { clearInterval(t); resolve(c); } else if (++tries > 40) { clearInterval(t); reject(new Error("crypto not found")); }
      }, 150);
    };
    s.onerror = function () { reject(new Error("failed to load player.js")); };
    document.head.appendChild(s);
  });
}

function toB64url(str) { return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""); }
function fromB64url(value) { var s = String(value).replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; return decodeURIComponent(escape(atob(s))); }

function joinRel(base, rel) {
  var q = ""; var relPath = String(rel); var qi = relPath.indexOf("?");
  if (qi !== -1) { q = relPath.slice(qi); relPath = relPath.slice(0, qi); }
  var stack = String(base || "").split("/");
  if (stack.length && stack[stack.length - 1] !== "" && /\.[a-z0-9]+$/i.test(stack[stack.length - 1])) stack.pop();
  if (stack.length && stack[stack.length - 1] === "") stack.pop();
  relPath.split("/").forEach(function (part) {
    if (!part || part === ".") return;
    if (part === "..") stack.pop(); else stack.push(part);
  });
  return stack.join("/") + q;
}

function resolveMedia(uri, variantBasePath, streamToken, variantFileUrl) {
  if (/^(blob:|data:)/i.test(uri)) return uri;
  if (uri.indexOf("/api/stream") === 0 || uri.indexOf("/api/cdn") === 0) return location.origin + uri;
  if (/^https?:\/\//i.test(uri)) return location.origin + "/api/cdn?u=" + toB64url(uri);
  if (variantFileUrl) { try { return location.origin + "/api/cdn?u=" + toB64url(new URL(uri, variantFileUrl).href); } catch (e) {} }
  return location.origin + "/api/stream?path=" + encodeURIComponent(joinRel(variantBasePath || "", uri)) + "&t=" + encodeURIComponent(streamToken);
}

function rewritePlaylist(text, streamToken, keyBlobUrl, variantBasePath, variantFileUrl) {
  return text.split("\n").map(function (line) {
    var s = line.trim(); if (!s) return line;
    if (s.charAt(0) === "#") {
      if (s.indexOf("#EXT-X-KEY:") === 0 && keyBlobUrl) return s.replace(/URI="[^"]+"/, 'URI="' + keyBlobUrl + '"');
      return s.replace(/URI="([^"]+)"/g, function (_m, uri) { return 'URI="' + resolveMedia(uri, variantBasePath, streamToken, variantFileUrl) + '"'; });
    }
    return resolveMedia(s, variantBasePath, streamToken, variantFileUrl);
  }).join("\n");
}

async function playVideo(videoId, title) {
  document.getElementById("player-title").textContent = title;
  document.getElementById("player-modal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  
  const status = document.getElementById("player-status");
  status.querySelector('span').textContent = "جاري فتح الجلسة...";
  status.classList.remove("hidden");
  document.getElementById('big-play-btn').classList.add('hidden');
  
  stopPlayback();

  try {
    var session = await api("/api/video/" + videoId + "/play", { method: "POST" });
    var streamToken = session.token, swVideoId = session.video_id, hbUrl = session.heartbeat_url;

    if (!streamToken || !swVideoId) throw new Error("الجلسة ناقصة");

    status.querySelector('span').textContent = "فك التشفير...";
    if (!cryptoUtils) cryptoUtils = await loadPlayerScript();

    var masterUrl = "/api/stream?path=" + encodeURIComponent("videos/" + swVideoId + "/stream/master.m3u8") + "&t=" + encodeURIComponent(streamToken);
    var masterRes = await fetch(masterUrl);
    if (!masterRes.ok) throw new Error("master.m3u8 → HTTP " + masterRes.status);
    var masterText = await masterRes.text();
    
    var variantRel = masterText.split("\n").map(l => l.trim()).find(l => l && l.charAt(0) !== "#");
    if (!variantRel) throw new Error("مفيش variant في الـ master");

    var variantUrl, variantBasePath = "videos/" + swVideoId + "/stream/", variantFileUrl = null;
    if (variantRel.indexOf("/api/stream") === 0 || variantRel.indexOf("/api/cdn") === 0) {
      variantUrl = variantRel;
      try {
        var vu = new URL(variantRel, location.origin);
        if (vu.pathname.indexOf("/api/stream") === 0 && vu.searchParams.get("path")) variantBasePath = vu.searchParams.get("path");
        if (vu.pathname.indexOf("/api/cdn") === 0 && vu.searchParams.get("u")) variantFileUrl = fromB64url(vu.searchParams.get("u"));
      } catch (e) {}
    } else if (variantRel.indexOf("http") === 0) {
      variantFileUrl = variantRel; variantUrl = "/api/cdn?u=" + toB64url(variantRel);
    } else {
      variantBasePath = "videos/" + swVideoId + "/stream/" + variantRel;
      variantUrl = "/api/stream?path=" + encodeURIComponent(variantBasePath) + "&t=" + encodeURIComponent(streamToken);
    }

    var variantRes = await fetch(variantUrl);
    if (!variantRes.ok) throw new Error("variant → HTTP " + variantRes.status);
    var variantText = await variantRes.text();

    status.querySelector('span').textContent = "فك المفتاح...";
    var keyLine = variantText.split("\n").find(l => l.indexOf("EXT-X-KEY") !== -1);
    var keyPath = "videos/" + swVideoId + "/key", ivHex = null;
    if (keyLine) {
      var keyUriMatch = keyLine.match(/URI="([^"]+)"/), ivMatch = keyLine.match(/IV=0x([0-9a-fA-F]+)/i);
      if (ivMatch) ivHex = ivMatch[1];
      if (keyUriMatch) {
        var uri = keyUriMatch[1];
        if (uri.indexOf("/api/stream") === 0 || uri.indexOf(location.origin + "/api/stream") === 0) {
          try { var u = new URL(uri, location.origin); var pth = u.searchParams.get("path"); if (pth) keyPath = pth; } catch (e) {}
        } else if (uri.indexOf("http") !== 0 && uri.indexOf("/api/cdn") !== 0) keyPath = uri.replace(/^\//, "").replace(/^api\/v1\//, "");
      }
    }

    var keyUrl = "/api/stream?path=" + encodeURIComponent(keyPath) + "&t=" + encodeURIComponent(streamToken);
    var keyRes = await fetch(keyUrl);
    if (!keyRes.ok) throw new Error("key → HTTP " + keyRes.status);
    var wrappedKey = new Uint8Array(await keyRes.arrayBuffer());
    var keyResult = await cryptoUtils.decryptPlaybackKey(wrappedKey, swVideoId);
    var aesKey = keyResult && keyResult.key;
    if (!aesKey || aesKey.byteLength !== 16) throw new Error("المفتاح غير صالح");

    var keyBytes = aesKey instanceof ArrayBuffer ? aesKey : aesKey.buffer.slice(aesKey.byteOffset, aesKey.byteOffset + aesKey.byteLength);
    currentKeyBlobUrl = URL.createObjectURL(new Blob([keyBytes], { type: "application/octet-stream" }));

    var fixedVariant = rewritePlaylist(variantText, streamToken, currentKeyBlobUrl, variantBasePath, variantFileUrl);
    if (fixedVariant.indexOf("#EXTM3U") !== 0) fixedVariant = "#EXTM3U\n" + fixedVariant.replace(/^#EXTM3U\s*/m, "");
    if (fixedVariant.indexOf("EXT-X-KEY") === -1) {
      var ivPart = ivHex ? ",IV=0x" + ivHex : "";
      fixedVariant = '#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="' + currentKeyBlobUrl + '"' + ivPart + "\n" + fixedVariant.replace(/^#EXTM3U\s*/m, "");
    }

    currentPlaylistBlobUrl = URL.createObjectURL(new Blob([fixedVariant], { type: "application/vnd.apple.mpegurl" }));
    status.querySelector('span').textContent = "جاري التشغيل...";

    hbTimer = setInterval(function () {
      fetch("/api/heartbeat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: hbUrl, token: streamToken }) }).catch(function () {});
    }, 25000);

    if (window.Hls && Hls.isSupported()) {
      hls = new Hls({ enableWorker: false, maxBufferLength: 30, maxMaxBufferLength: 60 });
      hls.loadSource(currentPlaylistBlobUrl);
      hls.attachMedia(videoEl);
      
      hls.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
        status.classList.add("hidden");
        
        // حل مشكلة الجودات 0p: بنشوف الجودات الحقيقية بس
        const qMenu = document.getElementById('quality-menu');
        let qHtml = `<button onclick="setQuality(-1, this)" class="active">تلقائي</button>`;
        
        data.levels.forEach((level, i) => {
          if (level.height > 0) { 
            qHtml += `<button onclick="setQuality(${i}, this)">${level.height}p</button>`;
          }
        });
        qMenu.innerHTML = qHtml;
        
        videoEl.play().catch(() => {
          document.getElementById('big-play-btn').classList.remove('hidden');
        });
      });

      hls.on(Hls.Events.ERROR, function (_, data) {
        if (!data.fatal) return;
        status.querySelector('span').textContent = "خطأ HLS: " + data.type;
        status.classList.remove('hidden');
      });
    } else {
      videoEl.src = currentPlaylistBlobUrl;
      videoEl.play();
    }

  } catch (e) {
    status.querySelector('span').textContent = "فشل: " + e.message;
    status.classList.remove("hidden");
  }
}

// ==================== Player UI Logic ====================
function toggleDropdown(id) {
  document.querySelectorAll('.dropdown-content').forEach(el => {
    if (el.id !== id) el.classList.add('hidden');
  });
  document.getElementById(id).classList.toggle('hidden');
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.dropdown') && !e.target.closest('.click-layer')) {
    document.querySelectorAll('.dropdown-content').forEach(el => el.classList.add('hidden'));
  }
});

function togglePlay() {
  if (videoEl.paused) videoEl.play();
  else videoEl.pause();
}

videoEl.addEventListener('play', () => {
  document.getElementById('play-icon').classList.add('hidden');
  document.getElementById('pause-icon').classList.remove('hidden');
  document.getElementById('big-play-btn').classList.add('hidden');
  playerContainer.classList.remove('paused');
});

videoEl.addEventListener('pause', () => {
  document.getElementById('play-icon').classList.remove('hidden');
  document.getElementById('pause-icon').classList.add('hidden');
  document.getElementById('big-play-btn').classList.remove('hidden');
  playerContainer.classList.add('paused');
  playerContainer.classList.remove('hide-cursor');
});

function skipTime(seconds) {
  videoEl.currentTime += seconds;
  showSeekIndicator(seconds > 0 ? '+' + seconds + ' ثواني' : seconds + ' ثواني');
}

function showSeekIndicator(text) {
  const el = document.getElementById('seek-indicator');
  el.textContent = text;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 600);
}

function setSpeed(speed, btnElement) {
  videoEl.playbackRate = speed;
  document.getElementById('speed-btn').textContent = speed === 1 ? '1x' : speed + 'x';
  document.querySelectorAll('#speed-menu button').forEach(b => b.classList.remove('active'));
  if (btnElement) btnElement.classList.add('active');
  document.getElementById('speed-menu').classList.add('hidden');
}

function setQuality(levelIndex, btnElement) {
  if (hls) {
    hls.currentLevel = levelIndex;
    const text = levelIndex === -1 ? 'تلقائي' : hls.levels[levelIndex].height + 'p';
    document.getElementById('quality-btn').textContent = text;
    document.querySelectorAll('#quality-menu button').forEach(b => b.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    document.getElementById('quality-menu').classList.add('hidden');
  }
}

function formatTime(sec) {
  if (isNaN(sec)) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

videoEl.addEventListener('timeupdate', () => {
  if (videoEl.duration) {
    const pct = (videoEl.currentTime / videoEl.duration) * 100;
    document.getElementById('progress-filled').style.width = pct + '%';
    document.getElementById('progress-handle').style.right = pct + '%';
    document.getElementById('time-display').textContent = `${formatTime(videoEl.currentTime)} / ${formatTime(videoEl.duration)}`;
  }
});

videoEl.addEventListener('loadedmetadata', () => {
  document.getElementById('time-display').textContent = `00:00 / ${formatTime(videoEl.duration)}`;
});

function seekVideo(e) {
  const bar = document.getElementById('progress-bar');
  const rect = bar.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  let pct = clickX / rect.width;
  if (document.dir === 'rtl') pct = 1 - pct;
  if (videoEl.duration) videoEl.currentTime = pct * videoEl.duration;
}

function toggleMute() {
  videoEl.muted = !videoEl.muted;
  document.getElementById('vol-icon').style.opacity = videoEl.muted ? '0.5' : '1';
}

document.getElementById('volume-slider').addEventListener('input', (e) => {
  videoEl.volume = e.target.value;
  videoEl.muted = e.target.value == 0;
});

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    playerContainer.requestFullscreen().catch(err => console.log(err));
  } else {
    document.exitFullscreen();
  }
}

// ==================== Click Layer Logic (Speed & Seek) ====================
let clickTimer = null;
let pressTimer = null;
let isLongPress = false;
let currentSpeedBeforeHold = 1;

clickLayer.addEventListener('mousedown', handleMouseDown);
clickLayer.addEventListener('touchstart', handleMouseDown, { passive: true });

clickLayer.addEventListener('mouseup', handleMouseUp);
clickLayer.addEventListener('touchend', handleMouseUp);
clickLayer.addEventListener('mouseleave', handleMouseUp);

function handleMouseDown(e) {
  isLongPress = false;
  // لو الفيديو واقف مش بنعمل حاجة
  if (videoEl.paused) return;

  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  
  // بدء مؤقت التسريع (الضغط المطول)
  pressTimer = setTimeout(() => {
    isLongPress = true;
    currentSpeedBeforeHold = videoEl.playbackRate;
    videoEl.playbackRate = 2; // تسريع مؤقت
    document.getElementById('speed-indicator').classList.remove('hidden');
    
    // إلغاء مؤقت النقر القصير عشان ميتنفذش
    clearTimeout(clickTimer);
  }, 400); // 400ms للضغط المطول
  
  // التعامل مع النقر العادي (تقدم / تأخير)
  clickTimer = setTimeout(() => {
    if (!isLongPress) {
      handleTap(clientX, e);
    }
  }, 250); 
}

function handleMouseUp(e) {
  clearTimeout(pressTimer);
  clearTimeout(clickTimer);
  
  if (isLongPress) {
    videoEl.playbackRate = currentSpeedBeforeHold; // إرجاع السرعة العادية
    document.getElementById('speed-indicator').classList.add('hidden');
  }
}

function handleTap(clientX, e) {
  const rect = playerContainer.getBoundingClientRect();
  const relativeX = clientX - rect.left;
  const width = rect.width;
  
  if (relativeX < width * 0.35) {
    // الجانب الأيسر (تأخير 10 ثواني)
    skipTime(-10);
  } else if (relativeX > width * 0.65) {
    // الجانب الأيمن (تقديم 10 ثواني)
    skipTime(10);
  } else {
    // المنتصف (تشغيل / إيقاف)
    togglePlay();
  }
}

// ==================== Auto Hide Cursor ====================
let cursorTimer;
playerContainer.addEventListener('mousemove', () => {
  playerContainer.classList.remove('hide-cursor');
  clearTimeout(cursorTimer);
  if (!videoEl.paused) {
    cursorTimer = setTimeout(() => {
      playerContainer.classList.add('hide-cursor');
    }, 2000);
  }
});

// ==================== Stop & Close ====================
function stopPlayback() {
  if (hbTimer) { clearInterval(hbTimer); hbTimer = null; }
  if (hls) { hls.destroy(); hls = null; }
  if (currentKeyBlobUrl) { URL.revokeObjectURL(currentKeyBlobUrl); currentKeyBlobUrl = null; }
  if (currentPlaylistBlobUrl) { URL.revokeObjectURL(currentPlaylistBlobUrl); currentPlaylistBlobUrl = null; }
  
  // تصفير السرعة عشان ميبوظش الفيديوهات الجديدة
  videoEl.playbackRate = 1;
  document.getElementById('speed-btn').textContent = '1x';
  document.querySelectorAll('#speed-menu button').forEach(b => b.classList.remove('active'));
  document.querySelector('#speed-menu button:nth-child(3)').classList.add('active');

  if (videoEl) { videoEl.removeAttribute("src"); videoEl.load(); }
}

function closePlayer() {
  stopPlayback();
  document.getElementById("player-modal").classList.add("hidden");
  document.body.style.overflow = "";
  document.getElementById('quality-menu').classList.add('hidden');
  document.getElementById('speed-menu').classList.add('hidden');
  document.getElementById('big-play-btn').classList.add('hidden');
  document.getElementById('speed-indicator').classList.add('hidden');
  document.getElementById('seek-indicator').classList.add('hidden');
}

// ==================== Theme Toggle ====================
document.getElementById("theme-toggle").addEventListener("click", () => {
  const cur = document.body.getAttribute("data-theme") === "light" ? "dark" : "light";
  document.body.setAttribute("data-theme", cur);
});

// ==================== Init ====================
loadPlayerScript().then(c => cryptoUtils = c).catch(() => {});
render();
