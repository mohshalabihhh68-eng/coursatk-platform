const state = {
  view: "years",
  year: null,
  subject: null,
  teacher: null,
  chapter: null,
  lecture: null
};

let hls = null;
let hbTimer = null;

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
  state.view = "years";
  state.year = null;
  state.subject = null;
  state.teacher = null;
  state.chapter = null;
  state.lecture = null;
  render();
}

function setView(view, extra) {
  if (extra) {
    for (var k in extra) state[k] = extra[k];
  }
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
    html +=
      "<div class='card' onclick='setView(\"subjects\"," +
      JSON.stringify({ year: y }) +
      ")'><img src='" +
      (y.image_url || "") +
      "' onerror=\"this.style.display='none'\"/><div class='body'><div class='title'>" +
      y.name +
      "</div></div></div>";
  }
  html += "</div>";
  appEl.innerHTML = html;
}

async function renderSubjects() {
  var subjects = await api("/api/subjects/" + state.year.id);
  var html =
    "<div class='crumbs'><span class='link' onclick='goHome()'>الرئيسية</span> / " +
    state.year.name +
    "</div><h1>المواد</h1><div class='grid'>";
  for (var i = 0; i < subjects.length; i++) {
    var s = subjects[i];
    html +=
      "<div class='card' onclick='setView(\"teachers\"," +
      JSON.stringify({ subject: s }) +
      ")'><img src='" +
      (s.image_url || "") +
      "' onerror=\"this.style.display='none'\"/><div class='body'><div class='title'>" +
      s.name +
      "</div></div></div>";
  }
  html += "</div>";
  appEl.innerHTML = html;
}

async function renderTeachers() {
  var data = await api("/api/subjects/" + state.subject.id + "/teachers");
  var teachers = data.teachers || [];
  var html =
    "<div class='crumbs'><span class='link' onclick='goHome()'>الرئيسية</span> / " +
    state.subject.name +
    "</div><h1>المدرسين</h1><div class='grid'>";
  for (var i = 0; i < teachers.length; i++) {
    var t = teachers[i];
    html +=
      "<div class='card' onclick='setView(\"chapters\"," +
      JSON.stringify({ teacher: t }) +
      ")'><img src='" +
      (t.image_url || "") +
      "' onerror=\"this.style.display='none'\"/><div class='body'><div class='title'>" +
      t.name +
      "</div><div class='meta'>" +
      (t.chapter_count || 0) +
      " فصل</div></div></div>";
  }
  html += "</div>";
  appEl.innerHTML = html;
}

async function renderChapters() {
  var chapters = await api("/api/teachers/" + state.teacher.id + "/chapters");
  var html =
    "<div class='crumbs'><span class='link' onclick='goHome()'>الرئيسية</span> / " +
    state.teacher.name +
    "</div><h1>الفصول</h1><div class='list'>";
  for (var i = 0; i < chapters.length; i++) {
    var c = chapters[i];
    html +=
      "<div class='list-item' onclick='setView(\"lectures\"," +
      JSON.stringify({ chapter: c }) +
      ")'><img src='" +
      (c.image_url || "") +
      "' onerror=\"this.style.opacity=0.3\"/><div><div class='title'>" +
      c.name +
      "</div><div class='meta'>" +
      (c.lecture_count || 0) +
      " محاضرة</div></div></div>";
  }
  html += "</div>";
  appEl.innerHTML = html;
}

async function renderLectures() {
  var lectures = await api("/api/chapters/" + state.chapter.id + "/lectures");
  var html =
    "<div class='crumbs'><span class='link' onclick='goHome()'>الرئيسية</span> / " +
    state.chapter.name +
    "</div><h1>المحاضرات</h1><div class='list'>";
  for (var i = 0; i < lectures.length; i++) {
    var l = lectures[i];
    html +=
      "<div class='list-item' onclick='setView(\"content\"," +
      JSON.stringify({ lecture: l }) +
      ")'><img src='" +
      (l.image_url || "") +
      "' onerror=\"this.style.opacity=0.3\"/><div><div class='title'>" +
      l.name +
      "</div><div class='meta'>" +
      (l.video_count || 0) +
      " فيديو</div></div></div>";
  }
  html += "</div>";
  appEl.innerHTML = html;
}

async function renderContent() {
  var content = await api("/api/lectures/" + state.lecture.id + "/content");
  var videos = content.videos || [];
  var pdfs = content.pdfs || [];
  var html =
    "<div class='crumbs'><span class='link' onclick='goHome()'>الرئيسية</span> / " +
    state.lecture.name +
    "</div><h1>" +
    state.lecture.name +
    "</h1><h3 style='color:#f97316;margin:12px 0'>الفيديوهات</h3>";
  for (var i = 0; i < videos.length; i++) {
    var v = videos[i];
    var title = String(v.title).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    html +=
      "<button class='btn' onclick=\"playVideo(" +
      v.id +
      ",'" +
      title +
      "')\"><span>▶</span><span>" +
      v.title +
      "</span></button>";
  }
  html += "<h3 style='color:#f97316;margin:16px 0 8px'>الملفات</h3>";
  for (var j = 0; j < pdfs.length; j++) {
    var p = pdfs[j];
    html +=
      "<a class='btn' href='" +
      p.url +
      "' target='_blank' rel='noopener'><span>📄</span><span>" +
      p.title +
      "</span></a>";
  }
  appEl.innerHTML = html;
}

async function playVideo(videoId, title) {
  var modal = document.getElementById("player-modal");
  var video = document.getElementById("video");
  var status = document.getElementById("player-status");
  document.getElementById("player-title").textContent = title;
  status.textContent = "جاري فتح الجلسة...";
  modal.classList.remove("hidden");
  stopPlayback();
  try {
    var session = await api("/api/video/" + videoId + "/play", { method: "POST" });
    var streamToken = session.token;
    var swVideoId = session.video_id;
    var hbUrl = session.heartbeat_url;

    var masterUrl =
      "/api/stream?path=" +
      encodeURIComponent("videos/" + swVideoId + "/stream/master.m3u8") +
      "&t=" +
      encodeURIComponent(streamToken);

    status.textContent = "جاري التحميل...";

    hbTimer = setInterval(function () {
      fetch("/api/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: hbUrl, token: streamToken })
      }).catch(function () {});
    }, 25000);

    if (window.Hls && Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(masterUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, function () {
        status.textContent = "";
        video.play().catch(function () {});
      });
      hls.on(Hls.Events.ERROR, function (_, data) {
        if (data.fatal) status.textContent = "خطأ: " + data.type;
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = masterUrl;
      video.addEventListener("loadedmetadata", function () {
        status.textContent = "";
        video.play().catch(function () {});
      });
    } else {
      status.textContent = "المتصفح لا يدعم HLS";
    }
  } catch (e) {
    status.textContent = "فشل: " + e.message;
  }
}

function stopPlayback() {
  if (hbTimer) {
    clearInterval(hbTimer);
    hbTimer = null;
  }
  if (hls) {
    hls.destroy();
    hls = null;
  }
  var video = document.getElementById("video");
  if (video) {
    video.removeAttribute("src");
    video.load();
  }
}

function closePlayer() {
  stopPlayback();
  document.getElementById("player-modal").classList.add("hidden");
}

render();
