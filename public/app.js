const state = {
  view: "years",
  year: null,
  subject: null,
  teacher: null,
  chapter: null,
  lecture: null,
};

let hls = null;
let hbTimer = null;

async function api(path, opts = {}) {
  const res = await fetch(path, opts);
  const data = await res.json();
  if (!res.ok || data.success === false) {
    throw new Error(data.error || data.message || "HTTP " + res.status);
  }
  return data.data !== undefined ? data.data : data;
}

function goHome() {
  state.view = "years";
  state.year = state.subject = state.teacher = state.chapter = state.lecture = null;
  render();
}

function setView(view, extra) {
  Object.assign(state, extra || {}, { view: view });
  render();
}

const appEl = document.getElementById("app");

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
  const years = await api("/api/years");
  appEl.innerHTML =
    "<h1>السنوات الدراسية</h1><div class='grid'>" +
    years
      .map(function (y) {
        return (
          "<div class='card' onclick='setView(\"subjects\",{year:" +
          JSON.stringify(y) +
          "})'><img src='" +
          (y.image_url || "") +
          "' onerror=\"this.style.display='none'\"/><div class='body'><div class='title'>" +
          y.name +
          "</div></div></div>"
        );
      })
      .join("") +
    "</div>";
}

async function renderSubjects() {
  const subjects = await api("/api/subjects/" + state.year.id);
  appEl.innerHTML =
    "<div class='crumbs'><span class='link' onclick='goHome()'>الرئيسية</span> / " +
    state.year.name +
    "</div><h1>المواد</h1><div class='grid'>" +
    subjects
      .map(function (s) {
        return (
          "<div class='card' onclick='setView(\"teachers\",{subject:" +
          JSON.stringify(s) +
          "})'><img src='" +
          (s.image_url || "") +
          "' onerror=\"this.style.display='none'\"/><div class='body'><div class='title'>" +
          s.name +
          "</div></div></div>"
        );
      })
      .join("") +
    "</div>";
}

async function renderTeachers() {
  const data = await api("/api/subjects/" + state.subject.id + "/teachers");
  const teachers = data.teachers || [];
  appEl.innerHTML =
    "<div class='crumbs'><span class='link' onclick='goHome()'>الرئيسية</span> / " +
    state.subject.name +
    "</div><h1>المدرسين</h1><div class='grid'>" +
    teachers
      .map(function (t) {
        return (
          "<div class='card' onclick='setView(\"chapters\",{teacher:" +
          JSON.stringify(t) +
          "})'><img src='" +
          (t.image_url || "") +
          "' onerror=\"this.style.display='none'\"/><div class='body'><div class='title'>" +
          t.name +
          "</div><div class='meta'>" +
          (t.chapter_count || 0) +
          " فصل</div></div></div>"
        );
      })
      .join("") +
    "</div>";
}

async function renderChapters() {
  const chapters = await api("/api/teachers/" + state.teacher.id + "/chapters");
  appEl.innerHTML =
    "<div class='crumbs'><span class='link' onclick='goHome()'>الرئيسية</span> / " +
    state.teacher.name +
    "</div><h1>الفصول</h1><div class='list'>" +
    chapters
      .map(function (c) {
        return (
          "<div class='list-item' onclick='setView(\"lectures\",{chapter:" +
          JSON.stringify(c) +
          "})'><img src='" +
          (c.image_url || "") +
          "' onerror=\"this.style.opacity=0.3\"/><div><div class='title'>" +
          c.name +
          "</div><div class='meta'>" +
          (c.lecture_count || 0) +
          " محاضرة</div></div></div>"
        );
      })
      .join("") +
    "</div>";
}

async function renderLectures() {
  const lectures = await api("/api/chapters/" + state.chapter.id + "/lectures");
  appEl.innerHTML =
    "<div class='crumbs'><span class='link' onclick='goHome()'>الرئيسية</span> / " +
    state.chapter.name +
    "</div><h1>المحاضرات</h1><div class='list'>" +
    lectures
      .map(function (l) {
        return (
          "<div class='list-item' onclick='setView(\"content\",{lecture:" +
          JSON.stringify(l) +
          "})'><img src='" +
          (l.image_url || "") +
          "' onerror=\"this.style.opacity=0.3\"/><div><div class='title'>" +
          l.name +
          "</div><div class='meta'>" +
          (l.video_count || 0) +
          " فيديو</div></div></div>"
        );
      })
      .join("") +
    "</div>";
}

async function renderContent() {
  const content = await api("/api/lectures/" + state.lecture.id + "/content");
  const videos = content.videos || [];
  const pdfs = content.pdfs || [];
  let html =
    "<div class='crumbs'><span class='link' onclick='goHome()'>الرئيسية</span> / " +
    state.lecture.name +
    "</div><h1>" +
    state.lecture.name +
    "</h1><h3 style='color:#f97316;margin:12px 0'>الفيديوهات</h3>";
  videos.forEach(function (v) {
    html +=
      "<button class='btn' onclick=\"playVideo(" +
      v.id +
      ",'" +
      String(v.title).replace(/'/g, "\\'") +
      "')\"><span>▶</span><span>" +
      v.title +
      "</span></button>";
  });
  html += "<h3 style='color:#f97316;margin:16px 0 8px'>الملفات</h3>";
  pdfs.forEach(function (p) {
    html +=
      "<a class='btn' href='" +
      p.url +
      "' target='_blank'><span>📄</span><span>" +
      p.title +
      "</span></a>";
  });
  appEl.innerHTML = html;
}

async function playVideo(videoId, title) {
  const modal = document.getElementById("player-modal");
  const video = document.getElementById("video");
  const status = document.getElementById("player-status");
  document.getElementById("player-title").textContent = title;
  status.textContent = "جاري فتح الجلسة...";
  modal.classList.remove("hidden");
  stopPlayback();
  try {
    const session = await api("/api/video/" + videoId + "/play", { method: "POST" });
    const streamToken = session.token;
    const swVideoId = session.video_id;
    const hbUrl = session.heartbeat_url;
    const masterUrl =
      "/api/stream/videos/" +
      swVideoId +
      "/stream/master.m3u8?t=" +
      encodeURIComponent(streamToken);
    status.textContent = "جاري التحميل...";
    hbTimer = setInterval(function () {
      fetch("/api/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: hbUrl, token: streamToken }),
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
  const video = document.getElementById("video");
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
