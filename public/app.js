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
let cryptoUtils = null;
let currentKeyBlobUrl = null;
let currentPlaylistBlobUrl = null;

async function api(path, opts) {
  opts = opts || {};
  const res = await fetch(path, opts);
  const data = await res.json();
  if (!res.ok || data.success === false) {
    throw new Error(data.error || data.message || "HTTP " + res.status);
  }
  return data.data !== undefined ? data.data : data;
}

function findCrypto() {
  if (
    window.DecryptionUtils &&
    typeof window.DecryptionUtils.decryptPlaybackKey === "function"
  ) {
    return window.DecryptionUtils;
  }
  var names = Object.getOwnPropertyNames(window);
  for (var i = 0; i < names.length; i++) {
    try {
      var obj = window[names[i]];
      if (obj && typeof obj === "object" && typeof obj.decryptPlaybackKey === "function") {
        return obj;
      }
    } catch (e) {}
  }
  return null;
}

function loadPlayerScript() {
  return new Promise(function (resolve, reject) {
    if (findCrypto()) return resolve(findCrypto());
    var existing = document.querySelector('script[src*="player.stream-weave.com"]');
    if (existing) {
      var tries = 0;
      var t = setInterval(function () {
        var c = findCrypto();
        if (c) {
          clearInterval(t);
          resolve(c);
        } else if (++tries > 40) {
          clearInterval(t);
          reject(new Error("timeout crypto"));
        }
      }, 150);
      return;
    }
    var s = document.createElement("script");
    s.src = "https://player.stream-weave.com/assets/player.js?v=1.1.1";
    s.onload = function () {
      var tries = 0;
      var t = setInterval(function () {
        var c = findCrypto();
        if (c) {
          clearInterval(t);
          resolve(c);
        } else if (++tries > 40) {
          clearInterval(t);
          reject(new Error("crypto not found"));
        }
      }, 150);
    };
    s.onerror = function () {
      reject(new Error("failed to load player.js"));
    };
    document.head.appendChild(s);
  });
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
  var html =
    '<div class="page-title">السنوات الدراسية</div>' +
    '<div class="page-desc">اختر السنة الدراسية اللي عايز تذاكر فيها.</div>' +
    '<div class="grid">';
  for (var i = 0; i < years.length; i++) {
    var y = years[i];
    html +=
      '<div class="subject-card" onclick=\'setView("subjects",' +
      JSON.stringify({ year: y }) +
      ")'>" +
      '<div class="img-wrap">' +
      '<img src="' +
      (y.image_url || "") +
      '" onerror="this.style.display=\'none\'"/>' +
      '<span class="badge">متاح الآن</span>' +
      "</div>" +
      '<div class="body">' +
      '<div class="name">' +
      y.name +
      "</div>" +
      '<div class="meta">السنة الدراسية</div>' +
      '<button class="btn-primary">عرض المواد ←</button>' +
      "</div></div>";
  }
  html += "</div>";
  appEl.innerHTML = html;
}

async function renderSubjects() {
  var subjects = await api("/api/subjects/" + state.year.id);
  var html =
    '<button class="back-btn" onclick="goHome()">← رجوع للسنين</button>' +
    '<div class="page-title">المواد الدراسية ' +
    state.year.name +
    "</div>" +
    '<div class="page-desc">اختر المادة اللي عايز تكمل فيها وتابع المحاضرات مع أفضل المدرسين.</div>' +
    '<div class="grid">';
  for (var i = 0; i < subjects.length; i++) {
    var s = subjects[i];
    html +=
      '<div class="subject-card" onclick=\'setView("teachers",' +
      JSON.stringify({ subject: s }) +
      ")'>" +
      '<div class="img-wrap">' +
      '<img src="' +
      (s.image_url || "") +
      '" onerror="this.style.display=\'none\'"/>' +
      '<span class="badge">متاح الآن</span>' +
      "</div>" +
      '<div class="body">' +
      '<div class="name">' +
      s.name +
      "</div>" +
      '<div class="meta">' +
      state.year.name +
      "</div>" +
      '<button class="btn-primary">عرض المدرسين ←</button>' +
      "</div></div>";
  }
  html += "</div>";
  appEl.innerHTML = html;
}

async function renderTeachers() {
  var data = await api("/api/subjects/" + state.subject.id + "/teachers");
  var teachers = data.teachers || data || [];
  var html =
    '<button class="back-btn" onclick=\'setView("subjects",{})\'>← رجوع للمواد</button>' +
    '<div class="page-title">مدرسين المادة</div>' +
    '<div class="page-desc">اختار المدرس اللي تحب تتابع معاه، وشوف الفصول المتاحة وابدأ رحلتك.</div>' +
    '<div class="grid">';
  for (var i = 0; i < teachers.length; i++) {
    var t = teachers[i];
    var chapters = t.chapter_count || 0;
    html +=
      '<div class="card">' +
      '<div class="card-top">' +
      '<div class="card-info">' +
      '<div class="card-label">مدرس المادة</div>' +
      '<div class="card-title">' +
      t.name +
      "</div>" +
      "</div>" +
      '<img class="card-img" src="' +
      (t.image_url || "") +
      '" onerror="this.style.opacity=0.3"/>' +
      "</div>" +
      '<div class="card-stats">' +
      '<div class="stat orange"><div class="stat-num">' +
      chapters +
      '</div><div class="stat-label">الفصول المتاحة</div></div>' +
      "</div>" +
      '<button class="btn-primary" onclick=\'setView("chapters",' +
      JSON.stringify({ teacher: t }) +
      ")'>اكتشف الفصول ←</button>" +
      "</div>";
  }
  html += "</div>";
  appEl.innerHTML = html;
}

async function renderChapters() {
  var chapters = await api("/api/teachers/" + state.teacher.id + "/chapters");
  var html =
    '<button class="back-btn" onclick=\'setView("teachers",{})\'>← رجوع للمدرسين</button>' +
    '<div class="page-title">فصول ' +
    state.teacher.name +
    "</div>" +
    '<div class="page-desc">استكشف الفصول المتاحة، اعرف عدد المحاضرات، وابدأ مذاكرة المنهج بترتيب منظم.</div>' +
    '<div class="grid">';
  for (var i = 0; i < chapters.length; i++) {
    var c = chapters[i];
    var lectures = c.lecture_count || 0;
    html +=
      '<div class="card">' +
      '<div class="card-top">' +
      '<div class="card-info">' +
      '<div class="card-label">الفصل ' +
      (i + 1) +
      "</div>" +
      '<div class="card-title">' +
      c.name +
      "</div>" +
      '<div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px">' +
      state.teacher.name +
      "</div>" +
      "</div>" +
      '<img class="card-img" src="' +
      (c.image_url || "") +
      '" onerror="this.style.opacity=0.3"/>' +
      "</div>" +
      '<div class="card-stats">' +
      '<div class="stat orange"><div class="stat-num">' +
      lectures +
      '</div><div class="stat-label">عدد المحاضرات</div></div>' +
      "</div>" +
      '<button class="btn-primary" onclick=\'setView("lectures",' +
      JSON.stringify({ chapter: c }) +
      ")'>مشاهدة المحاضرات ←</button>" +
      "</div>";
  }
  html += "</div>";
  appEl.innerHTML = html;
}

async function renderLectures() {
  var lectures = await api("/api/chapters/" + state.chapter.id + "/lectures");
  var html =
    '<button class="back-btn" onclick=\'setView("chapters",{})\'>← رجوع للفصول</button>' +
    '<div class="page-title">' +
    state.chapter.name +
    "</div>" +
    '<div class="page-desc">دي قائمة المحاضرات اللي في الفصل ده. هتلاقي فيها الفيديوهات، الملفات، والامتحانات.</div>' +
    '<div class="grid">';
  for (var i = 0; i < lectures.length; i++) {
    var l = lectures[i];
    var videos = l.video_count || 0;
    var pdfs = l.pdf_count || 0;
    var exams = l.exam_count || 0;
    html +=
      '<div class="card">' +
      '<div class="card-top">' +
      '<div class="card-info">' +
      '<div class="card-label">المحاضرة ' +
      (i + 1) +
      "</div>" +
      '<div class="card-title">' +
      l.name +
      "</div>" +
      "</div>" +
      '<img class="card-img" src="' +
      (l.image_url || "") +
      '" onerror="this.style.opacity=0.3"/>' +
      "</div>" +
      '<div class="card-stats">' +
      '<div class="stat blue"><div class="stat-num">' +
      videos +
      '</div><div class="stat-label">فيديو</div></div>' +
      '<div class="stat orange"><div class="stat-num">' +
      pdfs +
      '</div><div class="stat-label">ملف</div></div>' +
      '<div class="stat purple"><div class="stat-num">' +
      exams +
      '</div><div class="stat-label">امتحان</div></div>' +
      "</div>" +
      '<button class="btn-primary" onclick=\'setView("content",' +
      JSON.stringify({ lecture: l }) +
      ")'>محتوى المحاضرة ←</button>" +
      "</div>";
  }
  html += "</div>";
  appEl.innerHTML = html;
}

async function renderContent() {
  var content = await api("/api/lectures/" + state.lecture.id + "/content");
  var videos = content.videos || [];
  var pdfs = content.pdfs || [];

  var html =
    '<button class="back-btn" onclick=\'setView("lectures",{})\'>← رجوع</button>' +
    '<div class="page-title">محتوى ' +
    state.lecture.name +
    "</div>" +
    '<div class="page-desc">ذاكر المحاضرة كاملة من فيديوهات وملفات.</div>';

  html +=
    '<div class="section">' +
    '<div class="section-header">' +
    '<div class="section-title">الفيديوهات</div>' +
    '<div style="font-size:0.85rem;color:var(--text-muted)">' +
    videos.length +
    " فيديو متاح</div>" +
    "</div>" +
    '<div class="video-grid">';

  for (var i = 0; i < videos.length; i++) {
    var v = videos[i];
    var title = String(v.title).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    var duration = v.duration
      ? Math.floor(v.duration / 60) + ":" + String(v.duration % 60).padStart(2, "0")
      : "";
    html +=
      '<div class="video-card">' +
      '<div class="video-thumb">' +
      '<div class="play-icon">▶</div>' +
      (duration ? '<span class="duration">' + duration + "</span>" : "") +
      "</div>" +
      '<div class="video-body">' +
      '<div class="video-title">' +
      v.title +
      "</div>" +
      '<button class="btn-play" onclick="playVideo(' +
      v.id +
      ",'" +
      title +
      "')\">تشغيل الفيديو ▶</button>" +
      "</div></div>";
  }
  html += "</div></div>";

  if (pdfs.length) {
    html +=
      '<div class="section">' +
      '<div class="section-header">' +
      '<div class="section-title">ملفات الشرح</div>' +
      '<div style="font-size:0.85rem;color:var(--text-muted)">' +
      pdfs.length +
      " ملف متاح</div>" +
      "</div>" +
      '<div class="grid">';
    for (var j = 0; j < pdfs.length; j++) {
      var p = pdfs[j];
      html +=
        '<div class="card">' +
        '<div class="card-title" style="font-size:0.95rem">' +
        p.title +
        "</div>" +
        '<div style="display:flex;gap:8px;margin-top:10px">' +
        '<a class="btn-primary" href="' +
        p.url +
        '" target="_blank" rel="noopener" style="flex:1;text-decoration:none">عرض الملف</a>' +
        "</div></div>";
    }
    html += "</div></div>";
  }

  appEl.innerHTML = html;
}

// ==================== Player Helpers ====================

function toB64url(str) {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromB64url(value) {
  var s = String(value).replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return decodeURIComponent(escape(atob(s)));
}

function joinRel(base, rel) {
  var q = "";
  var relPath = String(rel);
  var qi = relPath.indexOf("?");
  if (qi !== -1) {
    q = relPath.slice(qi);
    relPath = relPath.slice(0, qi);
  }
  var stack = String(base || "").split("/");
  if (
    stack.length &&
    stack[stack.length - 1] !== "" &&
    /\.[a-z0-9]+$/i.test(stack[stack.length - 1])
  ) {
    stack.pop();
  }
  if (stack.length && stack[stack.length - 1] === "") stack.pop();
  relPath.split("/").forEach(function (part) {
    if (!part || part === ".") return;
    if (part === "..") stack.pop();
    else stack.push(part);
  });
  return stack.join("/") + q;
}

function resolveMedia(uri, variantBasePath, streamToken, variantFileUrl) {
  if (/^(blob:|data:)/i.test(uri)) return uri;
  if (uri.indexOf("/api/stream") === 0 || uri.indexOf("/api/cdn") === 0) {
    return location.origin + uri;
  }
  if (/^https?:\/\//i.test(uri)) {
    return location.origin + "/api/cdn?u=" + toB64url(uri);
  }
  if (variantFileUrl) {
    try {
      return location.origin + "/api/cdn?u=" + toB64url(new URL(uri, variantFileUrl).href);
    } catch (e) {}
  }
  return (
    location.origin +
    "/api/stream?path=" +
    encodeURIComponent(joinRel(variantBasePath || "", uri)) +
    "&t=" +
    encodeURIComponent(streamToken)
  );
}

function rewritePlaylist(text, streamToken, keyBlobUrl, variantBasePath, variantFileUrl) {
  return text
    .split("\n")
    .map(function (line) {
      var s = line.trim();
      if (!s) return line;
      if (s.charAt(0) === "#") {
        if (s.indexOf("#EXT-X-KEY:") === 0 && keyBlobUrl) {
          return s.replace(/URI="[^"]+"/, 'URI="' + keyBlobUrl + '"');
        }
        return s.replace(/URI="([^"]+)"/g, function (_m, uri) {
          return 'URI="' + resolveMedia(uri, variantBasePath, streamToken, variantFileUrl) + '"';
        });
      }
      return resolveMedia(s, variantBasePath, streamToken, variantFileUrl);
    })
    .join("\n");
}

function setupPlayerControls() {
  var speedBtns = document.querySelectorAll("#speed-btns button");
  speedBtns.forEach(function (btn) {
    btn.onclick = function () {
      var speed = parseFloat(btn.dataset.speed);
      var video = document.getElementById("video");
      if (video) video.playbackRate = speed;
      speedBtns.forEach(function (b) {
        b.classList.remove("active");
      });
      btn.classList.add("active");
    };
  });

  var qualitySelect = document.getElementById("quality-select");
  if (qualitySelect) {
    qualitySelect.onchange = function () {
      if (!hls) return;
      hls.currentLevel = parseInt(qualitySelect.value, 10);
    };
  }
}

function fillQualityOptions() {
  var select = document.getElementById("quality-select");
  if (!select || !hls) return;
  select.innerHTML = '<option value="-1">تلقائي</option>';
  if (hls.levels && hls.levels.length) {
    hls.levels.forEach(function (level, i) {
      var height = level.height || 0;
      var label = height ? height + "p" : "جودة " + (i + 1);
      if (level.bitrate) label += " (" + Math.round(level.bitrate / 1000) + " kbps)";
      var opt = document.createElement("option");
      opt.value = i;
      opt.textContent = label;
      select.appendChild(opt);
    });
  }
}

async function playVideo(videoId, title) {
  var modal = document.getElementById("player-modal");
  var video = document.getElementById("video");
  var status = document.getElementById("player-status");
  document.getElementById("player-title").textContent = title;
  status.textContent = "جاري فتح الجلسة...";
  modal.classList.remove("hidden");
  stopPlayback();

  video.playbackRate = 1;
  document.querySelectorAll("#speed-btns button").forEach(function (b) {
    b.classList.toggle("active", b.dataset.speed === "1");
  });

  try {
    var session = await api("/api/video/" + videoId + "/play", { method: "POST" });
    var streamToken = session.token;
    var swVideoId = session.video_id;
    var hbUrl = session.heartbeat_url;

    if (!streamToken || !swVideoId) {
      throw new Error("الجلسة ناقصة (مفيش token أو video_id)");
    }

    status.textContent = "تحميل أدوات فك التشفير...";
    if (!cryptoUtils) cryptoUtils = await loadPlayerScript();

    status.textContent = "جلب قائمة التشغيل...";
    var masterUrl =
      "/api/stream?path=" +
      encodeURIComponent("videos/" + swVideoId + "/stream/master.m3u8") +
      "&t=" +
      encodeURIComponent(streamToken);

    var masterRes = await fetch(masterUrl);
    if (!masterRes.ok) throw new Error("master.m3u8 → HTTP " + masterRes.status);
    var masterText = await masterRes.text();

    var variantRel = masterText
      .split("\n")
      .map(function (l) {
        return l.trim();
      })
      .find(function (l) {
        return l && l.charAt(0) !== "#";
      });

    if (!variantRel) throw new Error("مفيش variant في الـ master");

    var variantUrl;
    var variantBasePath = "videos/" + swVideoId + "/stream/";
    var variantFileUrl = null;

    if (variantRel.indexOf("/api/stream") === 0 || variantRel.indexOf("/api/cdn") === 0) {
      variantUrl = variantRel;
      try {
        var vu = new URL(variantRel, location.origin);
        if (vu.pathname.indexOf("/api/stream") === 0 && vu.searchParams.get("path")) {
          variantBasePath = vu.searchParams.get("path");
        }
        if (vu.pathname.indexOf("/api/cdn") === 0 && vu.searchParams.get("u")) {
          variantFileUrl = fromB64url(vu.searchParams.get("u"));
        }
      } catch (e) {}
    } else if (variantRel.indexOf("http") === 0) {
      variantFileUrl = variantRel;
      variantUrl = "/api/cdn?u=" + toB64url(variantRel);
    } else {
      variantBasePath = "videos/" + swVideoId + "/stream/" + variantRel;
      variantUrl =
        "/api/stream?path=" +
        encodeURIComponent(variantBasePath) +
        "&t=" +
        encodeURIComponent(streamToken);
    }

    var variantRes = await fetch(variantUrl);
    if (!variantRes.ok) throw new Error("variant → HTTP " + variantRes.status);
    var variantText = await variantRes.text();

    status.textContent = "فك المفتاح...";
    var keyLine = variantText.split("\n").find(function (l) {
      return l.indexOf("EXT-X-KEY") !== -1;
    });

    var keyPath = "videos/" + swVideoId + "/key";
    var ivHex = null;
    if (keyLine) {
      var keyUriMatch = keyLine.match(/URI="([^"]+)"/);
      var ivMatch = keyLine.match(/IV=0x([0-9a-fA-F]+)/i);
      if (ivMatch) ivHex = ivMatch[1];
      if (keyUriMatch) {
        var uri = keyUriMatch[1];
        if (uri.indexOf("/api/stream") === 0 || uri.indexOf(location.origin + "/api/stream") === 0) {
          try {
            var u = new URL(uri, location.origin);
            var pth = u.searchParams.get("path");
            if (pth) keyPath = pth;
          } catch (e) {}
        } else if (uri.indexOf("http") !== 0 && uri.indexOf("/api/cdn") !== 0) {
          keyPath = uri.replace(/^\//, "").replace(/^api\/v1\//, "");
        }
      }
    }

    var keyUrl =
      "/api/stream?path=" +
      encodeURIComponent(keyPath) +
      "&t=" +
      encodeURIComponent(streamToken);

    var keyRes = await fetch(keyUrl);
    if (!keyRes.ok) throw new Error("key → HTTP " + keyRes.status);
    var wrappedKey = new Uint8Array(await keyRes.arrayBuffer());

    var keyResult = await cryptoUtils.decryptPlaybackKey(wrappedKey, swVideoId);
    var aesKey = keyResult && keyResult.key;
    if (!aesKey || aesKey.byteLength !== 16) {
      throw new Error("المفتاح غير صالح (مش 16 بايت)");
    }

    var keyBytes =
      aesKey instanceof ArrayBuffer
        ? aesKey
        : aesKey.buffer.slice(aesKey.byteOffset, aesKey.byteOffset + aesKey.byteLength);

    var keyBlob = new Blob([keyBytes], { type: "app
