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

// (نفس دوال renderYears, renderSubjects, renderTeachers, renderChapters, renderLectures)
// ... ضعهم هنا زي ما هما في الرد القديم ...

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
  // (باقي كود عرض الـ PDFs)
  appEl.innerHTML = html;
}

// ==================== Player Core Logic ====================
// (نفس دوال فك التشفير زي ما هي، هسيب المساحة بتاعتهم هنا)
function findCrypto() { /* ... */ }
function loadPlayerScript() { /* ... */ }
function toB64url(str){ /* ... */ }
function fromB64url(v){ /* ... */ }
function joinRel(base, rel) { /* ... */ }
function resolveMedia(uri, vBase, tok, vFileUrl) { /* ... */ }
function rewritePlaylist(text, tok, keyBlob, vBase, vFileUrl) { /* ... */ }

function formatTime(sec) {
  if(isNaN(sec)||sec<0) return '00:00';
  const t = Math.floor(sec); const h = Math.floor(t/3600); const m = Math.floor((t%3600)/60); const s = t%60;
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// 🔥 دوال التحكم الجديدة (بتربط الـ DOM بتاع المشغل)
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
function formatTimePlayer(sec) { if (isNaN(sec)) return '0:00'; const m = Math.floor(sec / 60); const s = Math.floor(sec % 60); return `${m}:${s.toString().padStart(2, '0')}`; }
function updateProgress() { 
  const percent = (video.currentTime / video.duration) * 100 || 0; 
  progressFilled.style.width = percent + '%'; 
  currentTimeEl.textContent = formatTimePlayer(video.currentTime); 
}

// (باقي الـ Listeners بتاعة الـ Player وربطها بالـ HLS والـ API)
// ...

// دالة الفتح الأساسية
function openPlayerPage(index) {
  if (index < 0 || index >= state.videosList.length) return;
  document.getElementById("player-page").classList.remove("hidden");
  document.body.style.overflow = "hidden"; 
  buildSidebar();
  playVideo(index);
}

// دالة التشغيل
async function playVideo(index) {
  // ... الكود هنا هو نفس كود التشفير القديم، بس بدل `videoEl` بيستخدم `video` وبيشغل الـ HLS على العنصر الجديد.
}
