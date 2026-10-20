/* ==================== State ==================== */
const state = {
  view: "years",
  year: null,
  subject: null,
  teacher: null,
  chapter: null,
  lecture: null,
};

async function api(path, opts) {
  opts = opts || {};
  const res = await fetch(path, opts);
  const data = await res.json();
  if (!res.ok || data.success === false) {
    throw new Error(data.error || data.message || "HTTP " + res.status);
  }
  return data.data !== undefined ? data.data : data;
}

function goHome() {
  Object.assign(state, { view: "years", year: null, subject: null, teacher: null, chapter: null, lecture: null });
  render();
}

function setView(view, extra) {
  if (extra) Object.assign(state, extra);
  state.view = view;
  render();
}

var appEl = document.getElementById("app");

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
    appEl.innerHTML = '<div class="error">خطأ: ' + e.message + "</div>";
  }
}

async function renderYears() {
  var years = await api("/api/years");
  var html = "<h1>السنوات الدراسية</h1><div class='grid'>";
  for (var i = 0; i < years.length; i++) {
    var y = years[i];
    html += "<div class='card' onclick='setView(\"subjects\"," + JSON.stringify({ year: y }) + ")'><img src='" + (y.image_url || "") + "' onerror=\"this.style.display='none'\"/><div class='body'><div class='title'>" + y.name + "</div></div></div>";
  }
  html += "</div>";
  appEl.innerHTML = html;
}

async function renderSubjects() {
  var subjects = await api("/api/subjects/" + state.year.id);
  var html = "<div class='crumbs'><span class='link' onclick='goHome()'>الرئيسية</span> / " + state.year.name + "</div><h1>المواد</h1><div class='grid'>";
  for (var i = 0; i < subjects.length; i++) {
    var s = subjects[i];
    html += "<div class='card' onclick='setView(\"teachers\"," + JSON.stringify({ subject: s }) + ")'><img src='" + (s.image_url || "") + "' onerror=\"this.style.display='none'\"/><div class='body'><div class='title'>" + s.name + "</div></div></div>";
  }
  html += "</div>";
  appEl.innerHTML = html;
}

async function renderTeachers() {
  var data = await api("/api/subjects/" + state.subject.id + "/teachers");
  var teachers = data.teachers || [];
  var html = "<div class='crumbs'><span class='link' onclick='goHome()'>الرئيسية</span> / " + state.subject.name + "</div><h1>المدرسين</h1><div class='grid'>";
  for (var i = 0; i < teachers.length; i++) {
    var t = teachers[i];
    html += "<div class='card' onclick='setView(\"chapters\"," + JSON.stringify({ teacher: t }) + ")'><img src='" + (t.image_url || "") + "' onerror=\"this.style.display='none'\"/><div class='body'><div class='title'>" + t.name + "</div><div class='meta'>" + (t.chapter_count || 0) + " فصل</div></div></div>";
  }
  html += "</div>";
  appEl.innerHTML = html;
}

async function renderChapters() {
  var chapters = await api("/api/teachers/" + state.teacher.id + "/chapters");
  var html = "<div class='crumbs'><span class='link' onclick='goHome()'>الرئيسية</span> / " + state.teacher.name + "</div><h1>الفصول</h1><div class='list'>";
  for (var i = 0; i < chapters.length; i++) {
    var c = chapters[i];
    html += "<div class='list-item' onclick='setView(\"lectures\"," + JSON.stringify({ chapter: c }) + ")'><img src='" + (c.image_url || "") + "' onerror=\"this.style.opacity=0.3\"/><div><div class='title'>" + c.name + "</div><div class='meta'>" + (c.lecture_count || 0) + " محاضرة</div></div></div>";
  }
  html += "</div>";
  appEl.innerHTML = html;
}

async function renderLectures() {
  var lectures = await api("/api/chapters/" + state.chapter.id + "/lectures");
  var html = "<div class='crumbs'><span class='link' onclick='goHome()'>الرئيسية</span> / " + state.chapter.name + "</div><h1>المحاضرات</h1><div class='list'>";
  for (var i = 0; i < lectures.length; i++) {
    var l = lectures[i];
    html += "<div class='list-item' onclick='setView(\"content\"," + JSON.stringify({ lecture: l }) + ")'><img src='" + (l.image_url || "") + "' onerror=\"this.style.opacity=0.3\"/><div><div class='title'>" + l.name + "</div><div class='meta'>" + (l.video_count || 0) + " فيديو</div></div></div>";
  }
  html += "</div>";
  appEl.innerHTML = html;
}

async function renderContent() {
  var content = await api("/api/lectures/" + state.lecture.id + "/content");
  var videos = content.videos || [];
  var pdfs = content.pdfs || [];
  var html = "<div class='crumbs'><span class='link' onclick='goHome()'>الرئيسية</span> / " + state.lecture.name + "</div><h1>" + state.lecture.name + "</h1><h3 style='color:#f97316;margin:12px 0'>الفيديوهات</h3>";
  
  for (var i = 0; i < videos.length; i++) {
    var v = videos[i];
    var title = String(v.title).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    html += "<button class='btn' onclick=\"playVideo(" + v.id + ",'" + title + "')\"><span>▶</span><span>" + v.title + "</span></button>";
  }
  
  html += "<h3 style='color:#f97316;margin:16px 0 8px'>الملفات</h3>";
  for (var j = 0; j < pdfs.length; j++) {
    var p = pdfs[j];
    html += "<a class='btn' href='" + p.url + "' target='_blank' rel='noopener'><span>📄</span><span>" + p.title + "</span></a>";
  }
  
  appEl.innerHTML = html;
}

// ==================== دالة تشغيل الفيديو الجديدة ====================

async function playVideo(videoId, title) {
  // إنشاء نافذة التشغيل (Modal) إذا لم تكن موجودة
  let modal = document.getElementById("my-video-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "my-video-modal";
    modal.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:99999; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:20px; box-sizing:border-box;";
    
    // زر الإغلاق
    let closeBtn = document.createElement("button");
    closeBtn.innerHTML = "✖ إغلاق";
    closeBtn.style.cssText = "position:absolute; top:20px; right:20px; padding:10px 20px; background:#ef4444; color:white; border:none; border-radius:8px; cursor:pointer; font-size:16px; font-weight:bold; z-index:100000;";
    closeBtn.onclick = () => modal.style.display = "none";
    
    // حاوية الفيديو
    let videoContainer = document.createElement("div");
    videoContainer.id = "video-iframe-container";
    videoContainer.style.cssText = "width:100%; max-width:1000px; height:70vh; background:#000; border-radius:12px; overflow:hidden; display:flex; align-items:center; justify-content:center; color:white; font-size:18px;";
    videoContainer.innerHTML = "⏳ جاري تحميل الفيديو...";
    
    modal.appendChild(closeBtn);
    modal.appendChild(videoContainer);
    document.body.appendChild(modal);
  }

  const container = document.getElementById("video-iframe-container");
  container.innerHTML = "⏳ جاري تحميل الفيديو...";
  modal.style.display = "flex";

  try {
    // طلب بيانات الفيديو من السيرفر
    const res = await fetch(`/api/video/${videoId}/play`, { method: "POST" });
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || "فشل جلب رابط الفيديو");
    }

    // استخراج رابط الفيديو (stream_url)
    const streamUrl = data.data.stream_url;
    if (!streamUrl) throw new Error("لم يتم العثور على رابط الفيديو في الرد");

    // وضع الرابط في iframe
    container.innerHTML = "";
    const iframe = document.createElement("iframe");
    iframe.src = streamUrl;
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.allow = "autoplay; fullscreen; encrypted-media";
    iframe.allowFullscreen = true;
    
    container.appendChild(iframe);

  } catch (error) {
    console.error(error);
    container.innerHTML = `<div style="color:#ef4444;">❌ حدث خطأ: ${error.message}</div>`;
  }
}

// ==================== تشغيل الواجهة ====================
render();
