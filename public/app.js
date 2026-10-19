const state = { view: "years", year: null, subject: null, teacher: null, chapter: null, lecture: null };
const appEl = document.getElementById("app");

// ==================== API Helper ====================
async function api(path, opts = {}) {
  try {
    const res = await fetch(path, opts);
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch (e) { data = text; }
    if (!res.ok || data.success === false) {
      throw new Error(data.error || data.message || "HTTP " + res.status);
    }
    return data.data !== undefined ? data.data : data;
  } catch (e) {
    console.error("API Error:", path, e);
    throw e;
  }
}

// ==================== Navigation ====================
function goHome() {
  Object.assign(state, { view:"years", year:null, subject:null, teacher:null, chapter:null, lecture:null });
  render();
}
function setView(view, extra) {
  if (extra) Object.assign(state, extra);
  state.view = view;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==================== Render Router ====================
async function render() {
  if (!appEl) return;
  appEl.innerHTML = '<div class="loading-state"><div class="spinner"></div>جاري التحميل...</div>';
  try {
    if (state.view === "years") await renderYears();
    else if (state.view === "subjects") await renderSubjects();
    else if (state.view === "teachers") await renderTeachers();
    else if (state.view === "chapters") await renderChapters();
    else if (state.view === "lectures") await renderLectures();
    else if (state.view === "content") await renderContent();
  } catch (e) {
    appEl.innerHTML = `<div style="color:#ff8a80; text-align:center; padding:50px; font-weight:bold;">
      <div style="font-size:2rem; margin-bottom:12px;">⚠️</div>
      خطأ: ${e.message}
      <div style="margin-top:20px;">
        <button onclick="render()" style="background:var(--orange); color:#fff; border:none; padding:10px 20px; border-radius:10px; cursor:pointer; font-weight:800;">إعادة المحاولة</button>
      </div>
    </div>`;
  }
}

// ==================== Pages ====================
async function renderYears() {
  let years = await api("/api/years");
  // الـ API ممكن يرجّع array مباشرة أو object فيه years
  let list = Array.isArray(years) ? years : (years.years || []);
  
  if (!list.length) {
    appEl.innerHTML = `<div class="page-title-area"><div class="page-badge">📚 السنة الدراسية</div><h1>لا توجد سنوات متاحة</h1></div>`;
    return;
  }

  let html = `
    <div class="page-title-area">
      <div class="page-badge">📚 السنة الدراسية</div>
      <h1>اختار <span>سنتك الدراسية</span></h1>
      <p>هتقدر تشوف المواد والمدرسين والمحاضرات بعد ما تختار.</p>
    </div>
    <div class="grid">`;
  
  list.forEach(y => {
    html += `
      <div class="card" onclick='setView("subjects", ${JSON.stringify({year: y}).replace(/'/g, "&#39;")})'>
        <div class="card-img-wrapper">📚</div>
        <div class="card-body">
          <div class="card-title">${esc(y.name)}</div>
          <div class="card-meta">
            <span>${y.subjects_count || y.subjects?.length || '—'} مادة</span>
            <span>2027</span>
          </div>
          <button class="btn-gradient">عرض المواد ←</button>
        </div>
      </div>`;
  });
  
  appEl.innerHTML = html + "</div>";
}

async function renderSubjects() {
  const data = await api("/api/subjects/" + state.year.id);
  let list = Array.isArray(data) ? data : (data.subjects || []);
  
  if (!list.length) {
    appEl.innerHTML = `
      <div class="page-title-area">
        <button class="back-btn-top" onclick="goHome()">← رجوع</button>
        <div class="page-badge">🗂️ السنة</div>
        <h1>لا توجد مواد متاحة</h1>
        <p>كلم الإدارة عشان تفعّل موادك.</p>
      </div>`;
    return;
  }
  
  let html = `
    <div class="page-title-area">
      <button class="back-btn-top" onclick="goHome()">← رجوع للسنوات</button>
      <div class="page-badge">🗂️ السنة</div>
      <h1>مواد <span>${esc(state.year.name)}</span></h1>
      <p>اختار المادة اللي عايز تبدأ فيها.</p>
    </div>
    <div class="grid">`;
  
  list.forEach(s => {
    html += `
      <div class="card" onclick='setView("teachers", ${JSON.stringify({subject: s}).replace(/'/g, "&#39;")})'>
        <div class="card-img-wrapper">📖</div>
        <div class="card-body">
          <div class="card-title">${esc(s.name)}</div>
          <div class="card-meta">
            <span>${s.teachers_count || s.teachers?.length || '—'} مدرس</span>
            <span>📚</span>
          </div>
          <button class="btn-gradient">عرض المدرسين ←</button>
        </div>
      </div>`;
  });
  
  appEl.innerHTML = html + "</div>";
}

async function renderTeachers() {
  const data = await api("/api/subjects/" + state.subject.id + "/teachers");
  const teachers = data.teachers || (Array.isArray(data) ? data : []);
  
  if (!teachers.length) {
    appEl.innerHTML = `
      <div class="page-title-area">
        <button class="back-btn-top" onclick='setView("subjects", ${JSON.stringify({year: state.year})})'>← رجوع</button>
        <div class="page-badge">السنة</div>
        <h1>لا يوجد مدرسين</h1>
        <p>لسه مفيش مدرسين مضافين للمادة دي.</p>
      </div>`;
    return;
  }
  
  let html = `
    <div class="page-title-area">
      <button class="back-btn-top" onclick='setView("subjects", ${JSON.stringify({year: state.year})})'>← رجوع للمواد</button>
      <div class="page-badge">👨‍🏫 المدرسين</div>
      <h1>مدرسين <span>${esc(state.subject.name)}</span></h1>
      <p>اختار المدرس اللي تحب تتابع معاه.</p>
    </div>
    <div class="grid">`;
  
  teachers.forEach(t => {
    html += `
      <div class="teacher-card" onclick='setView("chapters", ${JSON.stringify({teacher: t}).replace(/'/g, "&#39;")})'>
        <div class="teacher-top">
          <div class="teacher-info">
            <div class="teacher-role">مدرس المادة</div>
            <div class="teacher-name">${esc(t.name)}</div>
          </div>
          <div class="teacher-avatar">👨‍🏫</div>
        </div>
        <div class="teacher-stats">
          <span class="count-badge">${t.chapter_count || 0}</span>
          <span>الفصول المتاحة 📚</span>
        </div>
        <button class="btn-gradient">اكتشف الفصول ←</button>
      </div>`;
  });
  
  appEl.innerHTML = html + "</div>";
}

async function renderChapters() {
  const data = await api("/api/teachers/" + state.teacher.id + "/chapters");
  const chapters = Array.isArray(data) ? data : (data.chapters || []);
  
  if (!chapters.length) {
    appEl.innerHTML = `
      <div class="page-title-area">
        <button class="back-btn-top" onclick='setView("teachers", ${JSON.stringify({subject: state.subject})})'>← رجوع</button>
        <div class="page-badge">📖 الفصول</div>
        <h1>لا توجد فصول</h1>
      </div>`;
    return;
  }
  
  let html = `
    <div class="page-title-area">
      <button class="back-btn-top" onclick='setView("teachers", ${JSON.stringify({subject: state.subject})})'>← رجوع للمدرسين</button>
      <div class="page-badge">📖 الفصول</div>
      <h1>فصول <span>${esc(state.teacher.name)}</span></h1>
      <p>اختار الفصل اللي عايز تبدأ فيه.</p>
    </div>
    <div class="grid">`;
  
  chapters.forEach(c => {
    html += `
      <div class="teacher-card" onclick='setView("lectures", ${JSON.stringify({chapter: c}).replace(/'/g, "&#39;")})'>
        <div class="teacher-top">
          <div class="teacher-info">
            <div class="teacher-role">الفصل ${c.order || ''}</div>
            <div class="teacher-name">${esc(c.name)}</div>
            <div class="teacher-role" style="color: var(--muted);">م. ${esc(state.teacher.name)}</div>
          </div>
          <div class="teacher-avatar">📖</div>
        </div>
        <div class="teacher-stats">
          <span class="count-badge">${c.lecture_count || 0}</span>
          <span>عدد المحاضرات ⏱</span>
        </div>
        <button class="btn-gradient">مشاهدة المحاضرات ←</button>
      </div>`;
  });
  
  appEl.innerHTML = html + "</div>";
}

async function renderLectures() {
  const data = await api("/api/chapters/" + state.chapter.id + "/lectures");
  const lectures = Array.isArray(data) ? data : (data.lectures || []);
  
  if (!lectures.length) {
    appEl.innerHTML = `
      <div class="page-title-area">
        <button class="back-btn-top" onclick='setView("chapters", ${JSON.stringify({teacher: state.teacher})})'>← رجوع</button>
        <h1>لا توجد محاضرات</h1>
      </div>`;
    return;
  }
  
  let html = `
    <div class="page-title-area">
      <button class="back-btn-top" onclick='setView("chapters", ${JSON.stringify({teacher: state.teacher})})'>← رجوع للفصول</button>
      <div class="page-badge">📺 المحاضرات</div>
      <h1>${esc(state.chapter.name)}</h1>
      <p>اختار المحاضرة اللي عايز تفتحها.</p>
    </div>
    <div class="grid">`;
  
  lectures.forEach((l, idx) => {
    html += `
      <div class="lecture-card">
        <div class="lecture-header">
          <div>
            <div class="lecture-year">المحاضرة ${idx + 1}</div>
            <div class="lecture-title">${esc(l.name)}</div>
          </div>
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
        <button class="btn-gradient" onclick='setView("content", ${JSON.stringify({lecture: l}).replace(/'/g, "&#39;")})'>محتوي المحاضرة ←</button>
      </div>`;
  });
  
  appEl.innerHTML = html + "</div>";
}

async function renderContent() {
  const data = await api("/api/lectures/" + state.lecture.id + "/content");
  const videos = data.videos || (Array.isArray(data) ? data : []);
  const pdfs = data.pdfs || [];
  
  let html = `
    <div class="page-title-area" style="text-align:right;">
      <button class="back-btn-top" onclick='setView("lectures", ${JSON.stringify({chapter: state.chapter})})'>← رجوع للمحاضرات</button>
      <div class="page-badge">📺 محتوى المحاضرة</div>
      <h1>${esc(state.lecture.name)}</h1>
      <p>اختار الفيديو اللي عايز تشغله أو الملف اللي عايز تفتحه.</p>
    </div>`;
  
  if (videos.length) {
    html += `
      <div class="section-header">
        <h2>📺 الفيديوهات</h2>
        <span class="page-badge">${videos.length} فيديو</span>
      </div>
      <div class="grid">`;
    
    videos.forEach((v, i) => {
      html += `
        <div class="video-card" onclick="openPlayerPage(${i})">
          <div class="video-thumbnail">
            📺
            <div class="video-num-badge">فيديو #${i + 1}</div>
            <div class="video-duration-badge">⏱ ${v.duration || '00:00'}</div>
          </div>
          <div class="video-info">
            <div class="video-title">${esc(v.title)}</div>
            <button class="btn-gradient">▶ تشغيل</button>
          </div>
        </div>`;
    });
    html += `</div>`;
  }
  
  if (pdfs.length) {
    html += `
      <div class="section-header" style="margin-top:30px;">
        <h2>📄 الملفات</h2>
        <span class="page-badge">${pdfs.length} ملف</span>
      </div>
      <div class="grid">`;
    
    pdfs.forEach(p => {
      const url = p.url || p.link || p.file_url || '';
      html += `
        <div class="lecture-card">
          <div class="lecture-header">
            <div>
              <div class="lecture-year">📄 ملف PDF</div>
              <div class="lecture-title">${esc(p.title || 'ملف')}</div>
            </div>
          </div>
          <a href="${esc(url)}" target="_blank" rel="noopener" class="btn-gradient" style="text-decoration:none;">📥 فتح الملف</a>
        </div>`;
    });
    html += `</div>`;
  }
  
  if (!videos.length && !pdfs.length) {
    html += `<div class="loading-state">لا يوجد محتوى في المحاضرة دي لسه.</div>`;
  }
  
  appEl.innerHTML = html;
  
  window._currentVideosList = videos;
  window._currentLecture = state.lecture;
}

function openPlayerPage(index) {
  if (!window._currentVideosList || !window._currentVideosList[index]) return;
  const v = window._currentVideosList[index];
  window.location.href = `player.html?lectureId=${window._currentLecture.id}&videoId=${v.id}`;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Start
render();
