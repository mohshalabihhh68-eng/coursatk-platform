const state = { view: "years", year: null, subject: null, teacher: null, chapter: null, lecture: null };

// ==================== Storage Helpers ====================
const getStorageKey = (id) => `cstk_w_${id}`;
const getWatchedKey = (id) => `cstk_watched_${id}`;
function markAsWatched(id) { localStorage.setItem(getWatchedKey(id), "true"); }
function isWatched(id) { return localStorage.getItem(getWatchedKey(id)) === "true"; }

// ==================== API & Utils ====================
async function api(path, opts = {}) {
  const res  = await fetch(path, opts);
  if (res.status === 401) { localStorage.removeItem('cstk_tok'); window.location.href = 'index.html'; throw new Error("غير مصرح"); }
  const text = await res.text(); let data;
  try { data = JSON.parse(text); } catch (e) { data = text; }
  if (!res.ok || data.success === false) throw new Error(data.error || data.message || "HTTP " + res.status);
  return data.data !== undefined ? data.data : data;
}

function goHome() { Object.assign(state, { view:"years", year:null, subject:null, teacher:null, chapter:null, lecture:null }); render(); }
function setView(view, extra) { if (extra) Object.assign(state, extra); state.view = view; render(); window.scrollTo(0, 0); }

// ==================== Render ====================
const appEl = document.getElementById("app");

async function render() {
  if (!appEl) return;
  appEl.innerHTML = '<div class="loading" style="text-align:center;padding:60px;">جاري التحميل...</div>';
  try {
    if (state.view === "years") await renderYears();
    else if (state.view === "subjects") await renderSubjects();
    else if (state.view === "teachers") await renderTeachers();
    else if (state.view === "chapters") await renderChapters();
    else if (state.view === "lectures") await renderLectures();
    else if (state.view === "content") await renderContent();
  } catch (e) {
    appEl.innerHTML = `<div style="color:#ff3d00;text-align:center;padding:50px;">خطأ: ${e.message}</div>`;
  }
}

async function renderYears() {
  let years = await api("/api/years");
  if (!Array.isArray(years)) years = years.years || [];
  let html = `
    <div class="page-title-area">
      <div class="page-badge">📚 السنة الدراسية</div>
      <h1>المواد الدراسية <span>2027</span></h1>
      <p>اختار السنة الدراسية اللي عايز تبدأ فيها.</p>
    </div>
    <div class="grid">`;
  years.forEach(y => {
    html += `
      <div class="card" onclick='setView("subjects",${JSON.stringify({year:y})})'>
        <div class="card-img-wrapper"><img src="${y.image_url||''}" onerror="this.style.display='none'" /></div>
        <div class="card-body">
          <div class="card-header-info">
            <div class="card-title">${y.name}</div>
            <div class="card-year">2027</div>
          </div>
          <button class="btn-gradient">عرض المواد ←</button>
        </div>
      </div>`;
  });
  appEl.innerHTML = html + "</div>";
}

async function renderSubjects() {
  const subjects = await api("/api/subjects/" + state.year.id);
  let list = Array.isArray(subjects) ? subjects : (subjects.subjects || []);
  let html = `
    <div class="page-title-area">
      <button class="back-btn-top" onclick="goHome()">← رجوع</button>
      <div class="page-badge">🗂️ السنة</div>
      <h1>مواد <span>${state.year.name}</span></h1>
      <p>اختار المادة اللي عايز تكمل فيها.</p>
    </div>
    <div class="grid">`;
  list.forEach(s => {
    html += `
      <div class="card" onclick='setView("teachers",${JSON.stringify({subject:s})})'>
        <div class="card-img-wrapper"><img src="${s.image_url||''}" onerror="this.style.display='none'" /></div>
        <div class="card-body">
          <div class="card-header-info">
            <div class="card-title">${s.name}</div>
            <div class="card-year">2027</div>
          </div>
          <div class="meta-row"><span>المدرسين</span><span>👨‍🏫</span></div>
          <button class="btn-gradient">عرض المدرسين ←</button>
        </div>
      </div>`;
  });
  appEl.innerHTML = html + "</div>";
}

async function renderTeachers() {
  const data = await api("/api/subjects/" + state.subject.id + "/teachers");
  const teachers = data.teachers || (Array.isArray(data) ? data : []);
  let html = `
    <div class="page-title-area">
      <button class="back-btn-top" onclick='setView("subjects",${JSON.stringify({year:state.year})})'>← رجوع</button>
      <h1>مدرسين <span>${state.subject.name}</span></h1>
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
          <img class="teacher-avatar" src="${t.image_url||''}" onerror="this.style.display='none'" />
        </div>
        <div class="teacher-stats">
          <span class="count-badge">${t.chapter_count||0}</span>
          <span>الفصول المتاحة 📚</span>
        </div>
        <button class="btn-gradient" onclick='setView("chapters",${JSON.stringify({teacher:t})})'>اكتشف الفصول ←</button>
      </div>`;
  });
  appEl.innerHTML = html + "</div>";
}

async function renderChapters() {
  const chapters = await api("/api/teachers/" + state.teacher.id + "/chapters");
  const list = Array.isArray(chapters) ? chapters : (chapters.chapters || []);
  let html = `
    <div class="page-title-area">
      <button class="back-btn-top" onclick='setView("teachers",${JSON.stringify({subject:state.subject})})'>← رجوع</button>
      <h1>فصول <span>${state.teacher.name}</span></h1>
    </div>
    <div class="grid">`;
  list.forEach(c => {
    html += `
      <div class="teacher-card">
        <div class="teacher-top">
          <div class="teacher-info">
            <div class="teacher-role">الفصل ${c.order||''}</div>
            <div class="teacher-name">${c.name}</div>
            <div class="teacher-sub">م. ${state.teacher.name}</div>
          </div>
          <img class="teacher-avatar" src="${c.image_url||''}" onerror="this.style.opacity=0.3" />
        </div>
        <div class="teacher-stats">
          <span class="count-badge">${c.lecture_count||0}</span>
          <span>عدد المحاضرات ⏱</span>
        </div>
        <button class="btn-gradient" onclick='setView("lectures",${JSON.stringify({chapter:c})})'>مشاهدة المحاضرات ←</button>
      </div>`;
  });
  appEl.innerHTML = html + "</div>";
}

async function renderLectures() {
  const lectures = await api("/api/chapters/" + state.chapter.id + "/lectures");
  const list = Array.isArray(lectures) ? lectures : (lectures.lectures || []);
  let html = `
    <div class="page-title-area">
      <button class="back-btn-top" onclick='setView("chapters",${JSON.stringify({teacher:state.teacher})})'>← رجوع</button>
      <h1>${state.chapter.name}</h1>
    </div>
    <div class="grid">`;
  list.forEach((l, idx) => {
    html += `
      <div class="card" style="cursor:default;">
        <div class="card-body">
          <div class="card-header-info">
            <div class="card-year">المحاضرة ${idx+1}</div>
            <div class="card-title">${l.name}</div>
          </div>
          <div class="content-icon-box">
             <div class="content-icon-item">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
               <span>${l.video_count||0}</span><small>فيديو</small>
             </div>
             <div class="content-icon-item">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
               <span>${l.pdf_count||0}</span><small>ملف</small>
             </div>
          </div>
          <button class="btn-gradient" onclick='setView("content",${JSON.stringify({lecture:l})})'>محتوي المحاضرة ←</button>
        </div>
      </div>`;
  });
  appEl.innerHTML = html + "</div>";
}

async function renderContent() {
  const content = await api("/api/lectures/" + state.lecture.id + "/content");
  const videos = content.videos || (Array.isArray(content) ? content : []);
  
  let html = `
    <div class="page-title-area" style="text-align:right;">
      <button class="back-btn-top" style="right:auto;left:0;" onclick='setView("lectures",${JSON.stringify({chapter:state.chapter})})'>← رجوع</button>
      <h1>محتوي <span>${state.lecture.name}</span></h1>
    </div>
    <div class="card" style="padding:24px;cursor:default;">
      <div class="section-header"><h2>الفيديوهات</h2><span class="page-badge">${videos.length} فيديو</span></div>
      <div class="grid">`;
  
  videos.forEach((v, i) => {
    html += `
      <div class="video-card" onclick="openPlayerPage(${i})" style="cursor:pointer;">
        <div class="video-thumbnail">
          <img src="${v.thumbnail_url||''}" onerror="this.style.display='none'" />
          <div class="video-num-badge">فيديو #${i+1}</div>
          <div class="video-duration-badge">⏱ ${v.duration||'00:00'}</div>
          <div class="play-overlay">
            <div class="play-btn-circle">
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M8 5v14l11-7z"/></svg>
            </div>
          </div>
        </div>
        <div class="video-info">
          <h3 style="font-size:1rem;">${v.title}</h3>
          <button class="btn-gradient">تشغيل ▶</button>
        </div>
      </div>`;
  });
  
  html += `</div></div>`;
  appEl.innerHTML = html;
  
  window._currentVideosList = videos;
  window._currentLecture = state.lecture;
}

function openPlayerPage(index) {
  if (!window._currentVideosList || !window._currentVideosList[index]) return;
  const v = window._currentVideosList[index];
  window.location.href = `player.html?lectureId=${window._currentLecture.id}&videoId=${v.id}`;
}

// Init
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("app")) {
    render();
  }
});
