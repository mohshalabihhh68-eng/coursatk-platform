// ==================== State ====================
const state = { view: "years", year: null, subject: null, teacher: null, chapter: null, lecture: null, videosList: [], currentVideoIndex: -1 };
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

function showContent() {
  document.getElementById('landing-page').classList.add('hidden');
  document.getElementById('main-header').classList.remove('hidden');
  document.getElementById('app').classList.remove('hidden');
  render();
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

document.getElementById("theme-toggle").addEventListener("click", ()=>{ const cur = document.body.getAttribute("data-theme")==="light"?"dark":"light"; document.body.setAttribute("data-theme", cur); });
