/* ==================== Config ==================== */
const state = {
  view: "years",
  year: null,
  subject: null,
  teacher: null,
  chapter: null,
  lecture: null,
};
const container = document.querySelector('main');
const TOKEN_KEY = 'cstk_tok';

if (!localStorage.getItem(TOKEN_KEY)) {
  window.location.href = 'index.html';
}

/* ==================== API Helper ==================== */
async function api(path, opts = {}) {
  try {
    const res = await fetch(path, opts);
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

/* ==================== Navigation ==================== */
function goHome() {
  Object.assign(state, { view: "years", year: null, subject: null, teacher: null, chapter: null, lecture: null });
  render();
}
function setView(view, extra) {
  if (extra) Object.assign(state, extra);
  state.view = view;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function logout() {
  if (!confirm('متأكد إنك عايز تسجّل الخروج؟')) return;
  localStorage.removeItem(TOKEN_KEY);
  window.location.href = 'index.html';
}
window.goHome = goHome;
window.setView = setView;
window.logout = logout;

/* ==================== Helpers ==================== */
function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
function extractArray(data, key) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data[key])) return data[key];
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

/* ==================== Render Router ==================== */
async function render() {
  container.innerHTML = `<div class="loading-screen"><div class="spinner"></div><p>جاري التحميل...</p></div>`;
  try {
    if (state.view === 'years') await renderYears();
    else if (state.view === 'subjects') await renderSubjects();
    else if (state.view === 'teachers') await renderTeachers();
    else if (state.view === 'chapters') await renderChapters();
    else if (state.view === 'lectures') await renderLectures();
    else if (state.view === 'content') await renderContent();
  } catch (e) {
    renderError(e.message);
  }
}

function renderError(msg) {
  container.innerHTML = `
    <div class="error-state">
      <div class="error-state-icon">⚠️</div>
      <h3>حصل خطأ</h3>
      <p>${esc(msg)}</p>
      <button onclick="render()">إعادة المحاولة</button>
    </div>
  `;
}

function renderEmpty(icon, title, desc) {
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">${icon}</div>
      <h3>${esc(title)}</h3>
      <p>${esc(desc || '')}</p>
    </div>
  `;
}

/* ==================== Pages ==================== */

async function renderYears() {
  const data = await api('/api/years');
  const years = extractArray(data, 'years');
  
  if (!years.length) {
    return renderEmpty('📚', 'لا توجد سنوات', 'لسه مفيش بيانات متاحة');
  }
  
  container.innerHTML = `
    <div class="page-header">
      <div class="page-badge">📚 السنة الدراسية</div>
      <h1>اختار <span>سنتك</span></h1>
      <p>هتقدر تشوف المواد والمدرسين والمحاضرات بعد كده</p>
    </div>
    <div class="grid">
      ${years.map(y => `
        <div class="card" onclick='setView("subjects", ${JSON.stringify({ year: y })})'>
          <div class="card-image">📚</div>
          <div class="card-body">
            <div class="card-title">${esc(y.name)}</div>
            <div class="card-meta">
              <span>${y.subjects_count || '—'} مادة</span>
              <span>2027</span>
            </div>
            <div class="card-cta">عرض المواد ←</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

async function renderSubjects() {
  const data = await api('/api/subjects/' + state.year.id);
  const subjects = extractArray(data, 'subjects');
  
  if (!subjects.length) {
    return renderEmpty('📖', 'لا توجد مواد', 'لسه مفيش مواد في السنة دي');
  }
  
  container.innerHTML = `
    ${renderBreadcrumbs([{ label: 'الرئيسية', action: 'goHome()' }, { label: state.year.name, current: true }])}
    <div class="page-header">
      <div class="page-badge">📖 المواد</div>
      <h1>مواد <span>${esc(state.year.name)}</span></h1>
      <p>اختار المادة اللي عايز تبدأ فيها</p>
    </div>
    <div class="grid">
      ${subjects.map(s => `
        <div class="card" onclick='setView("teachers", ${JSON.stringify({ subject: s })})'>
          <div class="card-image">📖</div>
          <div class="card-body">
            <div class="card-title">${esc(s.name)}</div>
            <div class="card-meta">
              <span>${s.teachers_count || '—'} مدرس</span>
              <span>📚</span>
            </div>
            <div class="card-cta">عرض المدرسين ←</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

async function renderTeachers() {
  const data = await api('/api/subjects/' + state.subject.id + '/teachers');
  const teachers = extractArray(data, 'teachers');
  
  if (!teachers.length) {
    return renderEmpty('👨‍🏫', 'لا يوجد مدرسين', 'لسه مفيش مدرسين مضافين للمادة دي');
  }
  
  container.innerHTML = `
    ${renderBreadcrumbs([
      { label: 'الرئيسية', action: 'goHome()' },
      { label: state.year.name, action: `setView("subjects", ${JSON.stringify({ year: state.year })})` },
      { label: state.subject.name, current: true }
    ])}
    <div class="page-header">
      <div class="page-badge">👨‍🏫 المدرسين</div>
      <h1>مدرسين <span>${esc(state.subject.name)}</span></h1>
      <p>اختار المدرس اللي تحب تتابع معاه</p>
    </div>
    <div class="grid">
      ${teachers.map(t => `
        <div class="teacher-card" onclick='setView("chapters", ${JSON.stringify({ teacher: t })})'>
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
          <div class="card-cta">اكتشف الفصول ←</div>
        </div>
      `).join('')}
    </div>
  `;
}

async function renderChapters() {
  const data = await api('/api/teachers/' + state.teacher.id + '/chapters');
  const chapters = extractArray(data, 'chapters');
  
  if (!chapters.length) {
    return renderEmpty('📖', 'لا توجد فصول', 'لسه مفيش فصول متاحة');
  }
  
  container.innerHTML = `
    ${renderBreadcrumbs([
      { label: 'الرئيسية', action: 'goHome()' },
      { label: state.year.name, action: `setView("subjects", ${JSON.stringify({ year: state.year })})` },
      { label: state.subject.name, action: `setView("teachers", ${JSON.stringify({ subject: state.subject })})` },
      { label: state.teacher.name, current: true }
    ])}
    <div class="page-header">
      <div class="page-badge">📖 الفصول</div>
      <h1>فصول <span>${esc(state.teacher.name)}</span></h1>
      <p>اختار الفصل اللي عايز تبدأ فيه</p>
    </div>
    <div class="grid">
      ${chapters.map(c => `
        <div class="teacher-card" onclick='setView("lectures", ${JSON.stringify({ chapter: c })})'>
          <div class="teacher-top">
            <div class="teacher-info">
              <div class="teacher-role">الفصل ${c.order || ''}</div>
              <div class="teacher-name">${esc(c.name)}</div>
              <div style="font-size:0.8rem; color:var(--text-muted);">م. ${esc(state.teacher.name)}</div>
            </div>
            <div class="teacher-avatar">📖</div>
          </div>
          <div class="teacher-stats">
            <span class="count-badge">${c.lecture_count || 0}</span>
            <span>عدد المحاضرات ⏱</span>
          </div>
          <div class="card-cta">مشاهدة المحاضرات ←</div>
        </div>
      `).join('')}
    </div>
  `;
}

async function renderLectures() {
  const data = await api('/api/chapters/' + state.chapter.id + '/lectures');
  const lectures = extractArray(data, 'lectures');
  
  if (!lectures.length) {
    return renderEmpty('📺', 'لا توجد محاضرات', 'لسه مفيش محاضرات متاحة في الفصل ده');
  }
  
  container.innerHTML = `
    ${renderBreadcrumbs([
      { label: 'الرئيسية', action: 'goHome()' },
      { label: state.year.name, action: `setView("subjects", ${JSON.stringify({ year: state.year })})` },
      { label: state.subject.name, action: `setView("teachers", ${JSON.stringify({ subject: state.subject })})` },
      { label: state.teacher.name, action: `setView("chapters", ${JSON.stringify({ teacher: state.teacher })})` },
      { label: state.chapter.name, current: true }
    ])}
    <div class="page-header">
      <div class="page-badge">📺 المحاضرات</div>
      <h1>${esc(state.chapter.name)}</h1>
      <p>اختار المحاضرة اللي عايز تفتحها</p>
    </div>
    <div class="grid">
      ${lectures.map((l, idx) => `
        <div class="lecture-card">
          <div class="lecture-header">
            <div class="lecture-num">المحاضرة ${idx + 1}</div>
            <div class="lecture-title">${esc(l.name)}</div>
          </div>
          <div class="content-stats">
            <div class="content-stat">
              <div class="content-stat-icon">📺</div>
              <div class="content-stat-value">${l.video_count || 0}</div>
              <div class="content-stat-label">فيديو</div>
            </div>
            <div class="content-stat">
              <div class="content-stat-icon">📄</div>
              <div class="content-stat-value">${l.pdf_count || 0}</div>
              <div class="content-stat-label">ملف</div>
            </div>
            <div class="content-stat">
              <div class="content-stat-icon">📝</div>
              <div class="content-stat-value">${l.exam_count || 0}</div>
              <div class="content-stat-label">امتحان</div>
            </div>
          </div>
          <div class="card-cta" onclick='setView("content", ${JSON.stringify({ lecture: l })})'>
            محتوى المحاضرة ←
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

async function renderContent() {
  const data = await api('/api/lectures/' + state.lecture.id + '/content');
  const videos = data.videos || (Array.isArray(data) ? data : []);
  const pdfs = data.pdfs || [];
  
  let html = `
    ${renderBreadcrumbs([
      { label: 'الرئيسية', action: 'goHome()' },
      { label: state.subject.name, action: `setView("teachers", ${JSON.stringify({ subject: state.subject })})` },
      { label: state.teacher.name, action: `setView("chapters", ${JSON.stringify({ teacher: state.teacher })})` },
      { label: state.chapter.name, action: `setView("lectures", ${JSON.stringify({ chapter: state.chapter })})` },
      { label: state.lecture.name, current: true }
    ])}
    <div class="page-header">
      <div class="page-badge">📺 محتوى المحاضرة</div>
      <h1>${esc(state.lecture.name)}</h1>
      <p>اختار الفيديو اللي عايز تشغله أو الملف اللي عايز تفتحه</p>
    </div>
  `;
  
  if (videos.length) {
    html += `
      <h2 style="font-size:1.3rem; font-weight:900; margin:24px 0 16px;">📺 الفيديوهات (${videos.length})</h2>
      <div class="grid">
        ${videos.map((v, i) => `
          <div class="video-card" onclick="openPlayer(${i})">
            <div class="video-thumb">
              📺
              <div class="video-badge">فيديو #${i + 1}</div>
              <div class="video-duration">⏱ ${v.duration || '00:00'}</div>
            </div>
            <div class="video-info">
              <div class="video-title">${esc(v.title)}</div>
              <div class="video-play-btn">▶ تشغيل</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  if (pdfs.length) {
    html += `
      <h2 style="font-size:1.3rem; font-weight:900; margin:32px 0 16px;">📄 الملفات (${pdfs.length})</h2>
      <div class="grid">
        ${pdfs.map(p => `
          <div class="pdf-card">
            <div class="pdf-icon">📄</div>
            <div class="pdf-info">
              <div class="pdf-title">${esc(p.title)}</div>
            </div>
            <a href="${esc(p.url || '#')}" target="_blank" rel="noopener" class="pdf-cta">فتح</a>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  if (!videos.length && !pdfs.length) {
    html += `<div class="empty-state"><div class="empty-state-icon">📭</div><h3>لا يوجد محتوى</h3><p>لسه مفيش محتوى في المحاضرة دي</p></div>`;
  }
  
  container.innerHTML = html;
  
  window._currentVideos = videos;
  window._currentLecture = state.lecture;
}

function openPlayer(index) {
  if (!window._currentVideos || !window._currentVideos[index]) return;
  const v = window._currentVideos[index];
  window.location.href = `player.html?lectureId=${window._currentLecture.id}&videoId=${v.id}`;
}
window.openPlayer = openPlayer;

function renderBreadcrumbs(items) {
  return `<div class="breadcrumbs">${items.map((it, i) => {
    const sep = i > 0 ? '<span class="sep">/</span>' : '';
    if (it.current) return `${sep}<span class="current">${esc(it.label)}</span>`;
    return `${sep}<button onclick="${it.action}">${esc(it.label)}</button>`;
  }).join('')}</div>`;
}

/* ==================== Start ==================== */
render();
