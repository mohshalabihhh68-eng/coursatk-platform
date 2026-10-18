/* ============ State ============ */
const state = {
  view: "years",
  year: null,
  subject: null,
  teacher: null,
  data: {},
  searchQuery: "",
};

const appEl = document.getElementById("app");
const searchInput = document.getElementById("search-input");
const themeToggle = document.getElementById("theme-toggle");

/* ============ Theme ============ */
function initTheme() {
  const saved = localStorage.getItem("theme");
  if (saved) document.documentElement.setAttribute("data-theme", saved);
}
themeToggle.addEventListener("click", () => {
  const cur = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", cur);
  localStorage.setItem("theme", cur);
});
initTheme();

/* ============ Search ============ */
searchInput.addEventListener("input", (e) => {
  state.searchQuery = e.target.value.trim().toLowerCase();
  if (state.searchQuery) renderSearch();
  else render();
});

/* ============ Helpers ============ */
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
));

function renderCrumbs() {
  const parts = [`<span class="link" onclick="goHome()">الرئيسية</span>`];
  if (state.year) parts.push(`<span class="separator">/</span><span class="link" onclick="goYear('${esc(state.year.id)}')">${esc(state.year.name)}</span>`);
  if (state.subject) parts.push(`<span class="separator">/</span><span class="link" onclick="goSubject('${esc(state.subject.id)}')">${esc(state.subject.name)}</span>`);
  if (state.teacher) parts.push(`<span class="separator">/</span><span>${esc(state.teacher.name)}</span>`);
  return `<div class="crumbs">${parts.join("")}</div>`;
}

/* ============ Render ============ */
function render() {
  appEl.innerHTML = `<div class="loading">جاري التحميل...</div>`;

  // ⚠️ عدّل الرابط ده لـ API بتاعك
  fetch("/api/content")
    .then(r => { if (!r.ok) throw new Error("فشل التحميل"); return r.json(); })
    .then(data => {
      state.data = data;
      renderCurrent();
    })
    .catch(err => {
      appEl.innerHTML = `<div class="error">⚠️ ${esc(err.message)}</div>`;
    });
}

function renderCurrent() {
  if (state.view === "years") return renderYears();
  if (state.view === "subjects") return renderSubjects();
  if (state.view === "teachers") return renderTeachers();
  if (state.view === "lectures") return renderLectures();
}

function renderYears() {
  const years = state.data.years || [];
  appEl.innerHTML = `
    <h1>اختر السنة الدراسية</h1>
    <div class="grid">
      ${years.map(y => `
        <div class="card" onclick="goYear('${esc(y.id)}')">
          <img src="${esc(y.image || '')}" alt="${esc(y.name)}" loading="lazy" onerror="this.style.background='linear-gradient(135deg,#1e293b,#334155)'"/>
          <div class="body">
            <div class="title">${esc(y.name)}</div>
            <div class="meta">📚 ${y.subjects?.length || 0} مواد</div>
          </div>
        </div>
      `).join("")}
    </div>`;
}

function renderSubjects() {
  const subs = state.year?.subjects || [];
  appEl.innerHTML = `
    ${renderCrumbs()}
    <h1>مواد ${esc(state.year.name)}</h1>
    <div class="grid">
      ${subs.map(s => `
        <div class="card" onclick="goSubject('${esc(s.id)}')">
          <img src="${esc(s.image || '')}" alt="${esc(s.name)}" loading="lazy"/>
          <div class="body">
            <div class="title">${esc(s.name)}</div>
            <div class="meta">👨‍🏫 ${s.teachers?.length || 0} مدرسين</div>
          </div>
        </div>
      `).join("")}
    </div>`;
}

function renderTeachers() {
  const ts = state.subject?.teachers || [];
  appEl.innerHTML = `
    ${renderCrumbs()}
    <h1>مدرسو ${esc(state.subject.name)}</h1>
    <div class="grid">
      ${ts.map(t => `
        <div class="card" onclick="goTeacher('${esc(t.id)}')">
          <img src="${esc(t.image || '')}" alt="${esc(t.name)}" loading="lazy"/>
          <div class="body">
            <div class="title">${esc(t.name)}</div>
            <div class="meta">🎬 ${t.lectures?.length || 0} محاضرة</div>
          </div>
        </div>
      `).join("")}
    </div>`;
}

function renderLectures() {
  const ls = state.teacher?.lectures || [];
  if (!ls.length) {
    appEl.innerHTML = `${renderCrumbs()}<div class="empty">لا توجد محاضرات بعد</div>`;
    return;
  }
  appEl.innerHTML = `
    ${renderCrumbs()}
    <h1>محاضرات ${esc(state.teacher.name)}</h1>
    <div class="list">
      ${ls.map(l => `
        <div class="list-item" onclick="openPlayer('${esc(l.id)}')">
          <img src="${esc(l.thumbnail || '')}" alt="" loading="lazy"/>
          <div>
            <div class="title">${esc(l.title)}</div>
            <div class="meta">${l.duration ? '⏱ ' + esc(l.duration) : ''}</div>
          </div>
        </div>
      `).join("")}
    </div>`;
}

function renderSearch() {
  const q = state.searchQuery;
  const results = [];
  (state.data.years || []).forEach(y => {
    if (y.name.toLowerCase().includes(q)) results.push({ type: "سنة", name: y.name, action: `goYear('${y.id}')` });
    (y.subjects || []).forEach(s => {
      if (s.name.toLowerCase().includes(q)) results.push({ type: "مادة", name: s.name, action: `goYear('${y.id}')` });
      (s.teachers || []).forEach(t => {
        if (t.name.toLowerCase().includes(q)) results.push({ type: "مدرس", name: t.name, action: `goYear('${y.id}')` });
        (t.lectures || []).forEach(l => {
          if (l.title.toLowerCase().includes(q)) results.push({ type: "محاضرة", name: l.title, action: `openPlayer('${l.id}')` });
        });
      });
    });
  });

  appEl.innerHTML = `
    <h1>نتائج البحث: "${esc(state.searchQuery)}"</h1>
    ${results.length ? `<div class="list">
      ${results.map(r => `
        <div class="list-item" onclick="${r.action}">
          <div><div class="title">${esc(r.name)}</div><div class="meta">${r.type}</div></div>
        </div>
      `).join("")}
    </div>` : `<div class="empty">لا توجد نتائج</div>`}
  `;
}

/* ============ Navigation ============ */
function goHome() {
  state.view = "years"; state.year = state.subject = state.teacher = null;
  searchInput.value = ""; state.searchQuery = "";
  render();
}
function goYear(id) {
  const y = (state.data.years || []).find(x => x.id === id);
  if (!y) return;
  state.year = y; state.view = "subjects"; renderSubjects();
}
function goSubject(id) {
  const s = (state.year?.subjects || []).find(x => x.id === id);
  if (!s) return;
  state.subject = s; state.view = "teachers"; renderTeachers();
}
function goTeacher(id) {
  const t = (state.subject?.teachers || []).find(x => x.id === id);
  if (!t) return;
  state.teacher = t; state.view = "lectures"; renderLectures();
}

/* ============ Player ============ */
let hls = null;
function openPlayer(lectureId) {
  // ابحث عن المحاضرة
  let lecture = null;
  (state.data.years || []).forEach(y => (y.subjects || []).forEach(s => (s.teachers || []).forEach(t => (t.lectures || []).forEach(l => {
    if (l.id === lectureId) lecture = l;
  }))));
  if (!lecture) return;

  const modal = $("#player-modal");
  $("#player-title").textContent = lecture.title || "";
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  const video = $("#video");
  const status = $("#player-status");
  const quality = $("#quality-select");

  const url = lecture.videoUrl;
  status.textContent = "جاري التحميل...";
  status.classList.remove("hidden");

  if (hls) { hls.destroy(); hls = null; }

  if (url.endsWith(".m3u8") && window.Hls && Hls.isSupported()) {
    hls = new Hls();
    hls.loadSource(url);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
      quality.innerHTML = `<option value="-1">تلقائي</option>` +
        data.levels.map((lv, i) => `<option value="${i}">${lv.height}p</option>`).join("");
      video.play().catch(() => {});
      status.classList.add("hidden");
    });
    hls.on(Hls.Events.ERROR, (_, d) => {
      if (d.fatal) status.textContent = "خطأ في التشغيل";
    });
  } else if (video.canPlayType("application/vnd.apple.mpegurl") && url.endsWith(".m3u8")) {
    video.src = url;
    video.play().catch(() => {});
    status.classList.add("hidden");
  } else {
    video.src = url;
    video.play().catch(() => {});
    status.classList.add("hidden");
  }
}

function closePlayer() {
  const modal = $("#player-modal");
  modal.classList.add("hidden");
  document.body.style.overflow = "";
  const video = $("#video");
  video.pause();
  video.removeAttribute("src");
  video.load();
  if (hls) { hls.destroy(); hls = null; }
  $("#player-status").classList.add("hidden");
}
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closePlayer();
});

/* ============ Speed & Quality ============ */
document.addEventListener("click", e => {
  if (e.target.matches("#speed-btns button")) {
    const sp = parseFloat(e.target.dataset.speed);
    $("#video").playbackRate = sp;
    document.querySelectorAll("#speed-btns button").forEach(b => b.classList.toggle("active", b === e.target));
  }
});
document.addEventListener("change", e => {
  if (e.target.id === "quality-select" && hls) {
    const v = parseInt(e.target.value, 10);
    hls.currentLevel = v === -1 ? -1 : v;
  }
});

/* ============ Start ============ */
render();
