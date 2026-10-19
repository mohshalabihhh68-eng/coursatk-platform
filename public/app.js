// ==================== State ====================
const state = { view: "years", year: null, subject: null, teacher: null, chapter: null, lecture: null, videosList: [], currentVideoIndex: -1 };
let hls = null; let hbTimer = null; let cryptoUtils = null; let currentKeyBlobUrl = null; let currentPlaylistBlobUrl = null;
const appEl = document.getElementById("app");

// ==================== Storage Helpers ====================
const getStorageKey = (id) => `coursatk_video_${id}`;
const getWatchedKey = (id) => `coursatk_watched_${id}`;
function markAsWatched(id) { localStorage.setItem(getWatchedKey(id), "true"); }
function isWatched(id) { return localStorage.getItem(getWatchedKey(id)) === "true"; }

// ==================== API & Utils ====================
async function api(path, opts = {}) {
  opts.credentials = opts.credentials || 'include'; opts.headers = opts.headers || {};
  const res  = await fetch(path, opts);
  if (res.status === 403) throw new Error("غير مصرح لك بالوصول (403).");
  const text = await res.text(); let data;
  try { data = JSON.parse(text); } catch (e) { if (!res.ok) throw new Error(`HTTP ${res.status}`); data = text; }
  if (!res.ok || data.success === false) throw new Error(data.error || data.message || "HTTP " + res.status);
  return data.data !== undefined ? data.data : data;
}
function goHome() { Object.assign(state, { view:"years", year:null, subject:null, teacher:null, chapter:null, lecture:null }); render(); }
function setView(view, extra) { if (extra) Object.assign(state, extra); state.view = view; render(); window.scrollTo(0, 0); }

// ==================== Render Pages ====================
async function render() {
  appEl.innerHTML = '<div class="loading">جاري التحميل...</div>';
  try {
    if (state.view === "years") await renderYears(); else if (state.view === "subjects") await renderSubjects(); else if (state.view === "teachers") await renderTeachers(); else if (state.view === "chapters") await renderChapters(); else if (state.view === "lectures") await renderLectures(); else if (state.view === "content") await renderContent();
  } catch (e) { appEl.innerHTML = `<div style="color:#ff3d00;text-align:center;padding:50px;">خطأ: ${e.message}</div>`; }
}

async function renderYears() {
  let years = await api("/api/years");
  years = years.filter(y => { const name = String(y.name); return !name.includes("2024") && !name.includes("2025") && !name.includes("٢٠٢٤") && !name.includes("٢٠٢٥"); });
  let html = `<div class="page-title-area"><div class="page-badge">📚 مسار علمي علوم</div><h1>المواد الدراسية <span>2027</span></h1><p>اختار المادة اللي عايز تكمل فيها وتابع المحاضرات والواجبات مع أفضل المدرسين.</p></div><div class="grid">`;
  years.forEach(y => { html += `<div class="card" onclick='setView("subjects",${JSON.stringify({year:y})})'><div class="card-img-wrapper"><img src="${y.image_url||''}" onerror="this.style.display='none'" /><div class="status-badge">🟢 متاح الان</div></div><div class="card-body"><div class="card-header-info"><div class="card-year">2027</div><div class="card-title">${y.name}</div></div><div class="meta-row"><span>آخر تحديث: 2027/8/20</span><span>⏱</span></div><button class="btn-gradient">عرض المدرسين ←</button></div></div>`; });
  appEl.innerHTML = html + "</div>";
}

async function renderSubjects() {
  const subjects = await api("/api/subjects/" + state.year.id);
  let html = `<div class="page-title-area"><button class="back-btn-top" onclick="goHome()">← رجوع للسنين</button><div class="page-badge">🗂️ السنة</div><h1>مواد <span>${state.year.name}</span></h1><p>اختار المادة اللي عايز تكمل فيها وتابع المحاضرات.</p></div><div class="grid">`;
  subjects.forEach(s => { html += `<div class="card" onclick='setView("teachers",${JSON.stringify({subject:s})})'><div class="card-img-wrapper"><img src="${s.image_url||''}" onerror="this.style.display='none'" /><div class="status-badge">🟢 متاح الان</div></div><div class="card-body"><div class="card-header-info"><div class="card-year">2027</div><div class="card-title">${s.name}</div></div><div class="meta-row"><span>آخر تحديث: 2027/8/20</span><span>⏱</span></div><button class="btn-gradient">عرض المدرسين ←</button></div></div>`; });
  appEl.innerHTML = html + "</div>";
}

async function renderTeachers() {
  const data = await api("/api/subjects/" + state.subject.id + "/teachers"); const teachers = data.teachers || [];
  let html = `<div class="page-title-area"><button class="back-btn-top" onclick='setView("subjects",${JSON.stringify({year:state.year})})'>← رجوع للمواد</button><div class="page-badge">السنة</div><h1>مدرسين <span>المادة</span></h1><p>اختار المدرس اللي تحب تتابع معاه وشوف الفصول المتاحة.</p></div><div class="grid">`;
  teachers.forEach(t => { html += `<div class="teacher-card"><div class="teacher-top"><div class="teacher-info"><div class="teacher-role">مدرس المادة</div><div class="teacher-name">${t.name}</div></div><img class="teacher-avatar" src="${t.image_url||''}" onerror="this.style.display='none'" /></div><div class="teacher-stats"><span class="count-badge">${t.chapter_count||0}</span><span>الفصول المتاحة 📚</span></div><button class="btn-gradient" onclick='setView("chapters",${JSON.stringify({teacher:t})})'>اكتشف الفصول ←</button></div>`; });
  appEl.innerHTML = html + "</div>";
}

async function renderChapters() {
  const chapters = await api("/api/teachers/" + state.teacher.id + "/chapters");
  let html = `<div class="page-title-area"><button class="back-btn-top" onclick='setView("teachers",${JSON.stringify({subject:state.subject})})'>← رجوع للمدرسين</button><div class="page-badge">English</div><h1>فصول <span>${state.teacher.name}</span></h1><p>استكشف الفصول المتاحة، اعرف عدد المحاضرات، وابدأ مذاكرة المنهج.</p></div><div class="grid">`;
  chapters.forEach(c => { html += `<div class="teacher-card"><div class="teacher-top"><div class="teacher-info"><div class="teacher-role">الفصل ${c.order||''}</div><div class="teacher-name">${c.name}</div><div class="teacher-sub">م. ${state.teacher.name}</div></div><img class="teacher-avatar" src="${c.image_url||''}" onerror="this.style.opacity=0.3" /></div><div class="teacher-stats"><span class="count-badge">${c.lecture_count||0}</span><span>عدد المحاضرات ⏱</span></div><button class="btn-gradient" onclick='setView("lectures",${JSON.stringify({chapter:c})})'>مشاهدة المحاضرات ←</button></div>`; });
  appEl.innerHTML = html + "</div>";
}

async function renderLectures() {
  const lectures = await api("/api/chapters/" + state.chapter.id + "/lectures");
  let html = `<div class="page-title-area"><button class="back-btn-top" onclick='setView("chapters",${JSON.stringify({teacher:state.teacher})})'>← رجوع للفصول</button><div class="page-badge">${state.teacher.name}</div><h1>${state.chapter.name}</h1><p>دي قائمة المحاضرات اللي في الفصل ده.</p></div><div class="grid">`;
  lectures.forEach((l, idx) => { html += `<div class="card" style="cursor:default;"><div class="card-body"><div class="card-header-info"><div class="card-year">المحاضرة ${idx+1}</div><div class="card-title">${l.name}</div></div><div class="content-icon-box"><div class="content-icon-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span>${l.video_count||0}</span><small>فيديو</small></div><div class="content-icon-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg><span>${l.pdf_count||0}</span><small>ملف</small></div><div class="content-icon-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg><span>${l.exam_count||0}</span><small>امتحان</small></div></div><button class="btn-gradient" onclick='setView("content",${JSON.stringify({lecture:l})})'>محتوي المحاضرة ←</button></div></div>`; });
  appEl.innerHTML = html + "</div>";
}

async function renderContent() {
  const content = await api("/api/lectures/" + state.lecture.id + "/content"); 
  state.videosList = content.videos || []; 
  const pdfs = content.pdfs || [];
  
  let html = `<div class="page-title-area" style="text-align:right;margin-bottom:20px;"><button class="back-btn-top" style="right:auto;left:0;" onclick='setView("lectures",${JSON.stringify({chapter:state.chapter})})'>← رجوع</button><div class="page-badge">المحاضرة #${state.lecture.id}</div><h1>محتوي <span>${state.lecture.name}</span></h1><p>ذاكر المحاضرة كاملة من فيديوهات وملفات.</p></div><div class="card" style="padding:24px;margin-bottom:24px;cursor:default;"><div class="section-header"><h2>الفيديوهات</h2><span class="page-badge">${state.videosList.length} فيديو متاح</span></div><div class="grid">`;
  
  state.videosList.forEach((v, i) => { 
    const watchedBadge = isWatched(v.id) ? `<div class="watched-badge">✅ تمت المشاهدة</div>` : '';
    
    let actionBtn = `<button class="btn-gradient">تشغيل الفيديو ▶</button>`;
    const savedTime = localStorage.getItem(getStorageKey(v.id));
    if (savedTime && parseFloat(savedTime) > 2) {
       const totalSec = parseInt(v.duration) || 0;
       const remainSec = totalSec - parseFloat(savedTime);
       const pct = totalSec > 0 ? Math.round((parseFloat(savedTime) / totalSec) * 100) : 0;
       actionBtn = `<div class="progress-info-badge"><span>⏱ باقي ${formatTime(remainSec)}</span><span>${pct}% مكتمل</span></div>`;
    }

    html += `<div class="video-card" onclick="openPlayerPage(${i})" style="cursor:pointer;"><div class="video-thumbnail"><img src="${v.thumbnail_url||''}" onerror="this.style.display='none'" />${watchedBadge}<div class="video-num-badge">فيديو #${i+1}</div><div class="video-duration-badge">⏱ ${formatTime(v.duration ? parseInt(v.duration) : 0)}</div><div class="play-overlay"><div class="play-btn-circle"><svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M8 5v14l11-7z"/></svg></div></div></div><div class="video-info"><h3 class="video-title">${v.title}</h3>${actionBtn}</div></div>`; 
  });
  
  html += `</div></div>`;
  if (pdfs.length > 0) {
    html += `<div class="card" style="padding:24px;cursor:default;"><div class="section-header"><h2>ملفات الشرح</h2><span class="page-badge">${pdfs.length} ملف متاح</span></div><div class="grid">`;
    pdfs.forEach(p => { html += `<div class="card" style="padding:20px;text-align:center;background:var(--bg-card-light);cursor:default;"><h3 class="video-title" style="margin-bottom:16px;">${p.title}</h3><div style="display:flex;gap:10px;"><a href="${p.url}" target="_blank" class="btn-gradient" style="text-decoration:none;flex:1;padding:10px;font-size:0.9rem;">عرض 👁</a><a href="${p.url}" download class="btn-gradient" style="text-decoration:none;flex:1;padding:10px;font-size:0.9rem;background:#3b2a15;">تحميل ⬇</a></div></div>`; });
    html += `</div></div>`;
  }
  appEl.innerHTML = html;
}

// ==================== Player Core Logic ====================
function findCrypto() { if (window.DecryptionUtils && typeof window.DecryptionUtils.decryptPlaybackKey === "function") return window.DecryptionUtils; for (var n of Object.getOwnPropertyNames(window)) { try { var o = window[n]; if (o && typeof o === "object" && typeof o.decryptPlaybackKey === "function") return o; } catch(e){} } return null; }
function loadPlayerScript() { return new Promise((resolve, reject) => { if (findCrypto()) return resolve(findCrypto()); var ex = document.querySelector('script[src*="player.stream-weave.com"]'); if (ex) { var tries=0, t=setInterval(()=>{ var c=findCrypto(); if(c){clearInterval(t);resolve(c);} else if(++tries>40){clearInterval(t);reject(new Error("timeout"));} },150); return; } var s=document.createElement("script"); s.src="https://player.stream-weave.com/assets/player.js?v=1.1.1"; s.onload=()=>{ var tries=0, t=setInterval(()=>{ var c=findCrypto(); if(c){clearInterval(t);resolve(c);} else if(++tries>40){clearInterval(t);reject(new Error("not found"));} },150); }; s.onerror=()=>reject(new Error("failed")); document.head.appendChild(s); }); }
function toB64url(str){ return btoa(unescape(encodeURIComponent(str))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,""); }
function fromB64url(v){ var s=String(v).replace(/-/g,"+").replace(/_/g,"/"); while(s.length%4)s+="="; return decodeURIComponent(escape(atob(s))); }
function joinRel(base, rel) { var q="", rp=String(rel), qi=rp.indexOf("?"); if(qi!==-1){q=rp.slice(qi);rp=rp.slice(0,qi);} var st=String(base||"").split("/"); if(st.length&&st[st.length-1]!==""&&/\.[a-z0-9]+$/i.test(st[st.length-1]))st.pop(); if(st.length&&st[st.length-1]==="")st.pop(); rp.split("/").forEach(p=>{if(!p||p===".")return; if(p==="..")st.pop(); else st.push(p);}); return st.join("/")+q; }
function resolveMedia(uri, vBase, tok, vFileUrl) { if(/^(blob:|data:)/i.test(uri)) return uri; if(uri.indexOf("/api/stream")===0||uri.indexOf("/api/cdn")===0) return location.origin+uri; if(/^https?:\/\//i.test(uri)) return location.origin+"/api/cdn?u="+toB64url(uri); if(vFileUrl){try{return location.origin+"/api/cdn?u="+toB64url(new URL(uri,vFileUrl).href);}catch(e){}} return location.origin+"/api/stream?path="+encodeURIComponent(joinRel(vBase||"",uri))+"&t="+encodeURIComponent(tok); }
function rewritePlaylist(text, tok, keyBlob, vBase, vFileUrl) { return text.split("\n").map(line=>{ var s=line.trim(); if(!s) return line; if(s.charAt(0)==="#"){ if(s.indexOf("#EXT-X-KEY:")===0&&keyBlob) return s.replace(/URI="[^"]+"/, 'URI="'+keyBlob+'"'); return s.replace(/URI="([^"]+)"/g,(_m,u)=>'URI="'+resolveMedia(u,vBase,tok,vFileUrl)+'"'); } return resolveMedia(s,vBase,tok,vFileUrl); }).join("\n"); }

function formatTime(sec) {
  if(isNaN(sec)||sec<0) return '00:00';
  const t = Math.floor(sec); const h = Math.floor(t/3600); const m = Math.floor((t%3600)/60); const s = t%60;
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// ==================== Player DOM Elements ====================
const video = document.getElementById('video');
const container = document.getElementById('custom-player');
const bigPlay = document.getElementById('bigPlay');
const playBtn = document.getElementById('playBtn');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');
const progressBar = document.getElementById('progressBar');
const progressFilled = document.getElementById('progressFilled');
const currentTimeEl = document.getElementById('currentTime');
const durationEl = document.getElementById('duration');
const muteBtn = document.getElementById('muteBtn');
const volumeIcon = document.getElementById('volumeIcon');
const muteIcon = document.getElementById('muteIcon');
const volumeSlider = document.getElementById('volumeSlider');
const speedBtn = document.getElementById('speedBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const loader = document.getElementById('loader');
const errorMsg = document.getElementById('errorMsg');
const errorText = document.getElementById('errorText');

const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
let speedIndex = 2; 

function togglePlay() { if (video.paused) video.play(); else video.pause(); }
function updatePlayUI() { 
  if (video.paused) { playIcon.style.display = 'block'; pauseIcon.style.display = 'none'; bigPlay.classList.remove('hidden'); container.classList.add('paused'); } 
  else { playIcon.style.display = 'none'; pauseIcon.style.display = 'block'; bigPlay.classList.add('hidden'); container.classList.remove('paused'); } 
}
function updateProgress() { 
  const percent = (video.currentTime / video.duration) * 100 || 0; 
  progressFilled.style.width = percent + '%'; 
  currentTimeEl.textContent = formatTime(video.currentTime); 
}

// Player Events
bigPlay.addEventListener('click', togglePlay);
playBtn.addEventListener('click', togglePlay);
video.addEventListener('play', updatePlayUI);
video.addEventListener('pause', updatePlayUI);
video.addEventListener('timeupdate', updateProgress);
video.addEventListener('loadedmetadata', () => { durationEl.textContent = formatTime(video.duration); });
video.addEventListener('waiting', () => loader.classList.add('show'));
video.addEventListener('playing', () => loader.classList.remove('show'));

progressBar.addEventListener('click', (e) => {
  const rect = progressBar.getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;
  video.currentTime = percent * video.duration;
});

muteBtn.addEventListener('click', () => {
  video.muted = !video.muted;
  volumeIcon.style.display = video.muted ? 'none' : 'block';
  muteIcon.style.display = video.muted ? 'block' : 'none';
});

volumeSlider.addEventListener('input', () => {
  video.volume = volumeSlider.value;
  video.muted = video.volume === 0;
});

speedBtn.addEventListener('click', () => {
  speedIndex = (speedIndex + 1) % speeds.length;
  video.playbackRate = speeds[speedIndex];
  speedBtn.textContent = speeds[speedIndex] + '×';
  localStorage.setItem("coursatk_speed", speeds[speedIndex]);
});

fullscreenBtn.addEventListener('click', () => {
  if (!document.fullscreenElement) { container.requestFullscreen?.() || container.webkitRequestFullscreen?.(); } 
  else { document.exitFullscreen?.(); }
});

let hideControlsTimeout = null;
function showControls() { container.classList.add('show-controls'); clearTimeout(hideControlsTimeout); hideControlsTimeout = setTimeout(() => { if (!video.paused) container.classList.remove('show-controls'); }, 3000); }
container.addEventListener('mousemove', showControls);
container.addEventListener('touchstart', showControls);

function showLoader() { loader.classList.add('show'); }
function hideLoader() { loader.classList.remove('show'); }
function showError(msg) { errorText.textContent = msg; errorMsg.classList.add('show'); hideLoader(); }
function hideError() { errorMsg.classList.remove('show'); }

// ==================== 🔥 Gestures (Hold & Double Click) 🔥 ====================
let pressTimer = null; let isLongPress = false; let speedBeforeHold = 1;

function startPress(e) {
  isLongPress = false;
  if (video.paused) return; 
  pressTimer = setTimeout(() => {
    isLongPress = true;
    speedBeforeHold = video.playbackRate;
    video.playbackRate = 2;
    if (navigator.vibrate) navigator.vibrate(50);
  }, 300);
}
function endPress(e) {
  clearTimeout(pressTimer);
  if (isLongPress) {
    video.playbackRate = speedBeforeHold;
    isLongPress = false;
  }
}

container.addEventListener('mousedown', startPress);
container.addEventListener('touchstart', startPress, {passive: true});
container.addEventListener('mouseup', endPress);
container.addEventListener('mouseleave', endPress);
container.addEventListener('touchend', endPress);
container.addEventListener('touchcancel', endPress);

container.addEventListener('click', (e) => {
  if (isLongPress) return; 
  if (container.classList.contains('show-controls')) {
    clearTimeout(hideControlsTimeout);
    container.classList.remove('show-controls');
  } else {
    showControls();
  }
});

container.addEventListener('dblclick', (e) => {
  if (isLongPress) return;
  const rect = container.getBoundingClientRect(); 
  const relativeX = e.clientX - rect.left; 
  const width = rect.width;
  if (relativeX > width * 0.65) { video.currentTime += 10; } 
  else if (relativeX < width * 0.35) { video.currentTime -= 10; } 
  else { togglePlay(); }
});

// ==================== Play Page Logic ====================
function openPlayerPage(index) {
  if (index < 0 || index >= state.videosList.length) return;
  document.getElementById("player-page").classList.remove("hidden");
  document.body.style.overflow = "hidden"; 
  buildSidebar();
  playVideo(index);
}

function closePlayer() {
  if (state.videosList[state.currentVideoIndex] && video.currentTime > 0 && video.currentTime < video.duration) {
    localStorage.setItem(getStorageKey(state.videosList[state.currentVideoIndex].id), video.currentTime);
  }
  stopPlayback(); 
  document.getElementById("player-page").classList.add("hidden"); 
  document.body.style.overflow = ""; 
  renderContent(); 
}

function buildSidebar() {
  const listEl = document.getElementById('side-videos-list');
  listEl.innerHTML = '';
  
  let watched = 0;
  state.videosList.forEach(v => { if(isWatched(v.id)) watched++; });
  
  document.getElementById('video-count-tag').textContent = `${state.videosList.length} فيديو`;
  document.getElementById('watched-count-tag').textContent = `${watched} تمت مشاهدته`;
  document.getElementById('side-subtitle').textContent = `${state.videosList.length} فيديو`;
  document.getElementById('video-details-title').textContent = state.videosList[state.currentVideoIndex]?.title || '';

  state.videosList.forEach((v, i) => {
    const isCurrent = i === state.currentVideoIndex;
    const watchedFlag = isWatched(v.id);
    const savedTime = localStorage.getItem(getStorageKey(v.id));
    
    let statusHtml = '';
    if (isCurrent) statusHtml = `<div class="side-status"><span style="color:#ff6b00;">▶ يعمل الآن</span></div>`;
    else if (watchedFlag) statusHtml = `<div class="side-status"><span class="check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> مكتمل</span></div>`;
    else if (savedTime && parseFloat(savedTime) > 2) statusHtml = `<div class="side-status">⏱ باقي ${formatTime((parseInt(v.duration)||0) - parseFloat(savedTime))}</div>`;
    else statusHtml = `<div class="side-status">لم يبدأ بعد</div>`;

    const div = document.createElement('div');
    div.className = `side-item ${isCurrent ? 'active' : ''}`;
    div.onclick = () => playVideo(i);
    div.innerHTML = `
      <div class="side-num">${i + 1}</div>
      <div class="side-info">
        <div class="side-title-row">
          <h4>${v.title}</h4>
          <span class="side-duration">${formatTime(v.duration ? parseInt(v.duration) : 0)}</span>
        </div>
        ${statusHtml}
      </div>
    `;
    listEl.appendChild(div);
  });
}

async function playVideo(index) {
  if (index < 0 || index >= state.videosList.length) return;
  state.currentVideoIndex = index;
  const videoData = state.videosList[index];
  const videoId = videoData.id;

  buildSidebar(); 
  showLoader();
  hideError();
  stopPlayback();
  
  try {
    var sess = await api("/api/video/"+videoId+"/play", {method:"POST"}); 
    var { token: tok, video_id: swId, heartbeat_url: hbUrl } = sess; 
    if(!tok||!swId) throw new Error("الجلسة ناقصة");
    
    if(!cryptoUtils) cryptoUtils = await loadPlayerScript();
    
    var mUrl = "/api/stream?path="+encodeURIComponent("videos/"+swId+"/stream/master.m3u8")+"&t="+encodeURIComponent(tok); 
    var mRes = await fetch(mUrl, { credentials: 'include' }); 
    if(!mRes.ok) throw new Error("master.m3u8 → HTTP "+mRes.status); 
    var mText = await mRes.text();
    var varRel = mText.split("\n").map(l=>l.trim()).find(l=>l&&l.charAt(0)!=="#"); 
    if(!varRel) throw new Error("مفيش variant");
    var varUrl, vBase="videos/"+swId+"/stream/", vFileUrl=null;
    if(varRel.indexOf("/api/stream")===0||varRel.indexOf("/api/cdn")===0){ varUrl=varRel; try{ var vu=new URL(varRel,location.origin); if(vu.pathname.indexOf("/api/stream")===0&&vu.searchParams.get("path")) vBase=vu.searchParams.get("path"); if(vu.pathname.indexOf("/api/cdn")===0&&vu.searchParams.get("u")) vFileUrl=fromB64url(vu.searchParams.get("u")); }catch(e){} } else if(varRel.indexOf("http")===0){ vFileUrl=varRel; varUrl="/api/cdn?u="+toB64url(varRel); } else { vBase="videos/"+swId+"/stream/"+varRel; varUrl="/api/stream?path="+encodeURIComponent(vBase)+"&t="+encodeURIComponent(tok); }
    var vRes = await fetch(varUrl, { credentials: 'include' }); if(!vRes.ok) throw new Error("variant → HTTP "+vRes.status); var vText = await vRes.text();
    var keyLine = vText.split("\n").find(l=>l.indexOf("EXT-X-KEY")!==-1); var keyPath = "videos/"+swId+"/key", ivHex=null;
    if(keyLine){ var km=keyLine.match(/URI="([^"]+)"/), ivm=keyLine.match(/IV=0x([0-9a-fA-F]+)/i); if(ivm) ivHex=ivm[1]; if(km){ var ku=km[1]; if(ku.indexOf("/api/stream")===0||ku.indexOf(location.origin+"/api/stream")===0){ try{var uu=new URL(ku,location.origin);var pp=uu.searchParams.get("path");if(pp)keyPath=pp;}catch(e){} } else if(ku.indexOf("http")!==0&&ku.indexOf("/api/cdn")!==0) keyPath=ku.replace(/^\//,"").replace(/^api\/v1\//,""); } }
    var kRes = await fetch("/api/stream?path="+encodeURIComponent(keyPath)+"&t="+encodeURIComponent(tok), { credentials: 'include' }); if(!kRes.ok) throw new Error("key → HTTP "+kRes.status); var wrapped = new Uint8Array(await kRes.arrayBuffer()); var kr = await cryptoUtils.decryptPlaybackKey(wrapped, swId); var aesKey = kr&&kr.key; if(!aesKey||aesKey.byteLength!==16) throw new Error("المفتاح غير صالح");
    var kb = aesKey instanceof ArrayBuffer ? aesKey : aesKey.buffer.slice(aesKey.byteOffset, aesKey.byteOffset+aesKey.byteLength); currentKeyBlobUrl = URL.createObjectURL(new Blob([kb], {type:"application/octet-stream"}));
    var fixed = rewritePlaylist(vText, tok, currentKeyBlobUrl, vBase, vFileUrl); if(fixed.indexOf("#EXTM3U")!==0) fixed="#EXTM3U\n"+fixed.replace(/^#EXTM3U\s*/m,""); if(fixed.indexOf("EXT-X-KEY")===-1){ var ivp=ivHex?",IV=0x"+ivHex:""; fixed='#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="'+currentKeyBlobUrl+'"'+ivp+"\n"+fixed.replace(/^#EXTM3U\s*/m,""); }
    currentPlaylistBlobUrl = URL.createObjectURL(new Blob([fixed], {type:"application/vnd.apple.mpegurl"})); 
    hbTimer = setInterval(()=>{ fetch("/api/heartbeat",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include", body:JSON.stringify({url:hbUrl,token:tok})}).catch(()=>{}); }, 25000);
    
    if(window.Hls && Hls.isSupported()){
      hls = new Hls({enableWorker:false, maxBufferLength:30, maxMaxBufferLength:60}); hls.loadSource(currentPlaylistBlobUrl); hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, (event, data)=>{ 
        hideLoader(); 
        buildQualityMenu(data.levels); 
        
        const savedSpeed = localStorage.getItem("coursatk_speed");
        if (savedSpeed) { video.playbackRate = parseFloat(savedSpeed); speedBtn.textContent = savedSpeed + '×'; }

        const savedTime = localStorage.getItem(getStorageKey(videoId));
        if (savedTime && parseFloat(savedTime) > 2) {
          video.currentTime = parseFloat(savedTime);
        }
        
        video.play().catch(()=>{});
      });
      hls.on(Hls.Events.ERROR, (_, data)=>{ if(!data.fatal) return; showError("خطأ HLS: "+data.type); });
    } else { video.src = currentPlaylistBlobUrl; video.play(); }
  } catch(e) { showError("فشل: "+e.message); }
}

function playNextVideo() { if (state.currentVideoIndex < state.videosList.length - 1) playVideo(state.currentVideoIndex + 1); }
function playPrevVideo() { if (state.currentVideoIndex > 0) playVideo(state.currentVideoIndex - 1); }

function buildQualityMenu(levels) { const qMenu = document.getElementById('quality-menu'); const items = levels.map((l,i)=>({ index: i, height: l.height||0, bitrate: l.bitrate||0 })).sort((a,b)=> b.height!==a.height ? b.height-a.height : b.bitrate-a.bitrate); let html = `<button onclick="setQuality(-1,this)" class="active">تلقائي</button>`; items.forEach(item=>{ let label = item.height>0 ? item.height+"p" : (item.bitrate>0 ? Math.round(item.bitrate/1000)+"k" : "جودة "+(item.index+1)); html += `<button onclick="setQuality(${item.index},this)">${label}</button>`; }); qMenu.innerHTML = html; }

function toggleDropdown(id) { document.querySelectorAll('.dropdown-content').forEach(el=>{ if(el.id!==id) el.classList.add('hidden'); }); document.getElementById(id).classList.toggle('hidden'); }
document.addEventListener('click', e=>{ if(!e.target.closest('.dropdown')) document.querySelectorAll('.dropdown-content').forEach(el=>el.classList.add('hidden')); });

function setQuality(levelIndex, btn) { if(!hls) return; hls.currentLevel = levelIndex; let text = 'تلقائي'; if(levelIndex!==-1 && hls.levels[levelIndex]){ var l = hls.levels[levelIndex]; text = l.height>0 ? l.height+'p' : (l.bitrate>0 ? Math.round(l.bitrate/1000)+'k' : 'جودة '+(levelIndex+1)); } document.getElementById('qualityBtn').textContent = text; document.querySelectorAll('#quality-menu button').forEach(b=>b.classList.remove('active')); if(btn) btn.classList.add('active'); document.getElementById('quality-menu').classList.add('hidden'); }

let saveTimer = null;
video.addEventListener('timeupdate', () => {
  if (!saveTimer && state.videosList[state.currentVideoIndex]) {
    saveTimer = setTimeout(() => {
      if (video.currentTime > 0) localStorage.setItem(getStorageKey(state.videosList[state.currentVideoIndex].id), video.currentTime);
      saveTimer = null;
    }, 2000);
  }
});

video.addEventListener('ended', () => {
  if (state.videosList[state.currentVideoIndex]) {
    markAsWatched(state.videosList[state.currentVideoIndex].id);
    localStorage.removeItem(getStorageKey(state.videosList[state.currentVideoIndex].id));
    buildSidebar(); 
  }
});

function stopPlayback() { if(hbTimer){clearInterval(hbTimer);hbTimer=null;} if(hls){hls.destroy();hls=null;} if(currentKeyBlobUrl){URL.revokeObjectURL(currentKeyBlobUrl);currentKeyBlobUrl=null;} if(currentPlaylistBlobUrl){URL.revokeObjectURL(currentPlaylistBlobUrl);currentPlaylistBlobUrl=null;} video.playbackRate = 1; video.removeAttribute("src"); video.load(); }

document.getElementById("theme-toggle").addEventListener("click", ()=>{ const cur = document.body.getAttribute("data-theme")==="light"?"dark":"light"; document.body.setAttribute("data-theme", cur); });
loadPlayerScript().then(c=>cryptoUtils=c).catch(()=>{}); render();
