/* ============================================================
   الحالة الأصلية — متطابقة مع ملفك الأصلي
   ============================================================ */
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
let currentPlaylistData = null; // للبحث بدون إعادة تحميل

/* ============================================================
   API Helper — كما هو
   ============================================================ */
async function api(path, opts) {
  opts = opts || {};
  const res = await fetch(path, opts);
  const data = await res.json();
  if (!res.ok || data.success === false) {
    throw new Error(data.error || data.message || "HTTP " + res.status);
  }
  return data.data !== undefined ? data.data : data;
}

/* ============================================================
   Crypto Loader — كما هو
   ============================================================ */
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
      if (
        obj &&
        typeof obj === "object" &&
        typeof obj.decryptPlaybackKey === "function"
      ) {
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
        if (c) { clearInterval(t); resolve(c); }
        else if (++tries > 40) { clearInterval(t); reject(new Error("timeout crypto")); }
      }, 150);
      return;
    }
    var s = document.createElement("script");
    s.src = "https://player.stream-weave.com/assets/player.js?v=1.1.1";
    s.onload = function () {
      var tries = 0;
      var t = setInterval(function () {
        var c = findCrypto();
        if (c) { clearInterval(t); resolve(c); }
        else if (++tries > 40) { clearInterval(t); reject(new Error("crypto not found")); }
      }, 150);
    };
    s.onerror = function () { reject(new Error("failed to load player.js")); };
    document.head.appendChild(s);
  });
}

/* ============================================================
   Navigation — كما هو + إضافات
   ============================================================ */
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

/* ============================================================
   Theme Toggle (جديد)
   ============================================================ */
(function initTheme() {
  const saved = localStorage.getItem("theme");
  if (saved) document.documentElement.setAttribute("data-theme", saved);
})();

function toggleTheme() {
  const cur = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", cur);
  localStorage.setItem("theme", cur);
  const icon = document.getElementById("theme-icon");
  if (icon) icon.textContent = cur === "light" ? "☀️" : "🌙";
}

/* ============================================================
   Escape HTML (جديد للأمان)
   ============================================================ */
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

/* ============================================================
   Render الرئيسي — كما هو
   ============================================================ */
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
    else if (state.view === "search") await renderSearch();
  } catch (e) {
    appEl.innerHTML = '<div class="error">خطأ: ' + esc(e.message) + "</div>";
  }
}

/* ============================================================
   Render Years — كما هو
   ============================================================ */
async function renderYears() {
  var years = await api("/api/years");
  currentPlaylistData = { years };
  var html = "<h1>السنوات الدراسية</h1><div class='grid'>";
  for (var i = 0; i < years.length; i++) {
    var y = years[i];
    html +=
      "<div class='card' onclick='setView(\"subjects\"," +
      JSON.stringify({ year: y }) +
      ")'><img src='" +
      esc(y.image_url || "") +
      "' onerror=\"this.style.display='none'\"/><div class='body'><div class='title'>" +
      esc(y.name) +
      "</div></div></div>";
  }
  html += "</div>";
  appEl.innerHTML = html;
}

/* ============================================================
   Render Subjects — كما هو
   ============================================================ */
async function renderSubjects() {
  var subjects = await api("/api/subjects/" + state.year.id);
  var html =
    "<div class='crumbs'><span class='link' onclick='goHome()'>الرئيسية</span> / " +
    esc(state.year.name) +
    "</div><h1>المواد</h1><div class='grid'>";
  for (var i = 0; i < subjects.length; i++) {
    var s = subjects[i];
    html +=
      "<div class='card' onclick='setView(\"teachers\"," +
      JSON.stringify({ subject: s }) +
      ")'><img src='" +
      esc(s.image_url || "") +
      "' onerror=\"this.style.display='none'\"/><div class='body'><div class='title'>" +
      esc(s.name) +
      "</div></div></div>";
  }
  html += "</div>";
  appEl.innerHTML = html;
}

/* ============================================================
   Render Teachers — كما هو
   ============================================================ */
async function renderTeachers() {
  var data = await api("/api/subjects/" + state.subject.id + "/teachers");
  var teachers = data.teachers || [];
  var html =
    "<div class='crumbs'><span class='link' onclick='goHome()'>الرئيسية</span> / " +
    esc(state.year.name) + " / " + esc(state.subject.name) +
    "</div><h1>المدرسين</h1><div class='grid'>";
  for (var i = 0; i < teachers.length; i++) {
    var t = teachers[i];
    html +=
      "<div class='card' onclick='setView(\"chapters\"," +
      JSON.stringify({ teacher: t }) +
      ")'><img src='" +
      esc(t.image_url || "") +
      "' onerror=\"this.style.display='none'\"/><div class='body'><div class='title'>" +
      esc(t.name) +
      "</div><div class='meta'>" +
      (t.chapter_count || 0) +
      " فصل</div></div></div>";
  }
  html += "</div>";
  appEl.innerHTML = html;
}

/* ============================================================
   Render Chapters — كما هو
   ============================================================ */
async function renderChapters() {
  var chapters = await api("/api/teachers/" + state.teacher.id + "/chapters");
  var html =
    "<div class='crumbs'><span class='link' onclick='goHome()'>الرئيسية</span> / " +
    esc(state.subject.name) + " / " + esc(state.teacher.name) +
    "</div><h1>الفصول</h1><div class='list'>";
  for (var i = 0; i < chapters.length; i++) {
    var c = chapters[i];
    html +=
      "<div class='list-item' onclick='setView(\"lectures\"," +
      JSON.stringify({ chapter: c }) +
      ")'><img src='" +
      esc(c.image_url || "") +
      "' onerror=\"this.style.opacity=0.3\"/><div><div class='title'>" +
      esc(c.name) +
      "</div><div class='meta'>" +
      (c.lecture_count || 0) +
      " محاضرة</div></div></div>";
  }
  html += "</div>";
  appEl.innerHTML = html;
}

/* ============================================================
   Render Lectures — كما هو
   ============================================================ */
async function renderLectures() {
  var lectures = await api("/api/chapters/" + state.chapter.id + "/lectures");
  var html =
    "<div class='crumbs'><span class='link' onclick='goHome()'>الرئيسية</span> / " +
    esc(state.teacher.name) + " / " + esc(state.chapter.name) +
    "</div><h1>المحاضرات</h1><div class='list'>";
  for (var i = 0; i < lectures.length; i++) {
    var l = lectures[i];
    html +=
      "<div class='list-item' onclick='setView(\"content\"," +
      JSON.stringify({ lecture: l }) +
      ")'><img src='" +
      esc(l.image_url || "") +
      "' onerror=\"this.style.opacity=0.3\"/><div><div class='title'>" +
      esc(l.name) +
      "</div><div class='meta'>" +
      (l.video_count || 0) +
      " فيديو</div></div></div>";
  }
  html += "</div>";
  appEl.innerHTML = html;
}

/* ============================================================
   Render Content — كما هو
   ============================================================ */
async function renderContent() {
  var content = await api("/api/lectures/" + state.lecture.id + "/content");
  var videos = content.videos || [];
  var pdfs = content.pdfs || [];
  var html =
    "<div class='crumbs'><span class='link' onclick='goHome()'>الرئيسية</span> / " +
    esc(state.lecture.name) +
    "</div><h1>" +
    esc(state.lecture.name) +
    "</h1><h3>الفيديوهات</h3>";
  for (var i = 0; i < videos.length; i++) {
    var v = videos[i];
    var title = String(v.title).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    html +=
      "<button class='btn' onclick=\"playVideo(" +
      v.id +
      ",'" +
      title +
      "')\"><span>▶</span><span>" +
      esc(v.title) +
      "</span></button>";
  }
  html += "<h3>الملفات</h3>";
  for (var j = 0; j < pdfs.length; j++) {
    var p = pdfs[j];
    html +=
      "<a class='btn' href='" +
      esc(p.url) +
      "' target='_blank' rel='noopener'><span>📄</span><span>" +
      esc(p.title) +
      "</span></a>";
  }
  appEl.innerHTML = html;
}

/* ============================================================
   Search (جديد) — يبحث في المحتوى المحمّل
   ============================================================ */
async function renderSearch() {
  const q = (document.getElementById("search-input")?.value || "").trim().toLowerCase();
  if (!q) { goHome(); return; }
  if (!currentPlaylistData) {
    appEl.innerHTML = '<div class="empty">لا يوجد محتوى محمّل للبحث</div>';
    return;
  }
  const results = [];
  const years = currentPlaylistData.years || [];
  for (const y of years) {
    if (y.name.toLowerCase().includes(q)) results.push({ type: "سنة", name: y.name, action: `setView("subjects",${JSON.stringify({ year: y })})` });
  }
  if (!results.length) {
    appEl.innerHTML = `<h1>نتائج البحث: "${esc(q)}"</h1><div class="empty">لا توجد نتائج في الصفحة الحالية. تنقل للفصول أولاً.</div>`;
    return;
  }
  appEl.innerHTML = `
    <h1>نتائج البحث: "${esc(q)}"</h1>
    <div class="list">
      ${results.map(r => `
        <div class="list-item" onclick='${r.action}'>
          <div><div class="title">${esc(r.name)}</div><div class="meta">${r.type}</div></div>
        </div>
      `).join("")}
    </div>`;
}

/* ============================================================
   Player Helpers — كما هي بالحرف
   ============================================================ */
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
  if (stack.length && stack[stack.length - 1] !== "" && /\.[a-z0-9]+$/i.test(stack[stack.length - 1])) {
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
  return location.origin + "/api/stream?path=" +
    encodeURIComponent(joinRel(variantBasePath || "", uri)) +
    "&t=" + encodeURIComponent(streamToken);
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

/* ============================================================
   Main Play Function — كما هي بالحرف
   ============================================================ */
async function playVideo(videoId, title) {
  var modal = document.getElementById("player-modal");
  var video = document.getElementById("video");
  var status = document.getElementById("player-status");
  document.getElementById("player-title").textContent = title;
  status.textContent = "جاري فتح الجلسة...";
  status.classList.remove("hidden");
  modal.classList.remove("hidden");
  stopPlayback();

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
      "&t=" + encodeURIComponent(streamToken);

    var masterRes = await fetch(masterUrl);
    if (!masterRes.ok) throw new Error("master.m3u8 → HTTP " + masterRes.status);
    var masterText = await masterRes.text();

    var variantRel = masterText
      .split("\n")
      .map(function (l) { return l.trim(); })
      .find(function (l) { return l && l.charAt(0) !== "#"; });

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
        "&t=" + encodeURIComponent(streamToken);
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

    var keyUrl = "/api/stream?path=" + encodeURIComponent(keyPath) + "&t=" + encodeURIComponent(streamToken);
    var keyRes = await fetch(keyUrl);
    if (!keyRes.ok) throw new Error("key → HTTP " + keyRes.status);
    var wrappedKey = new Uint8Array(await keyRes.arrayBuffer());

    var keyResult = await cryptoUtils.decryptPlaybackKey(wrappedKey, swVideoId);
    var aesKey = keyResult && keyResult.key;
    if (!aesKey || aesKey.byteLength !== 16) {
      throw new Error("المفتاح غير صالح (مش 16 بايت)");
    }

    var keyBytes = aesKey instanceof ArrayBuffer
      ? aesKey
      : aesKey.buffer.slice(aesKey.byteOffset, aesKey.byteOffset + aesKey.byteLength);

    var keyBlob = new Blob([keyBytes], { type: "application/octet-stream" });
    currentKeyBlobUrl = URL.createObjectURL(keyBlob);

    var fixedVariant = rewritePlaylist(
      variantText,
      streamToken,
      currentKeyBlobUrl,
      variantBasePath,
      variantFileUrl
    );

    if (fixedVariant.indexOf("#EXTM3U") !== 0) {
      fixedVariant = "#EXTM3U\n" + fixedVariant.replace(/^#EXTM3U\s*/m, "");
    }
    if (fixedVariant.indexOf("EXT-X-KEY") === -1) {
      var ivPart = ivHex ? ",IV=0x" + ivHex : "";
      fixedVariant =
        '#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="' +
        currentKeyBlobUrl +
        '"' + ivPart + "\n" +
        fixedVariant.replace(/^#EXTM3U\s*/m, "");
    }

    var playlistBlob = new Blob([fixedVariant], { type: "application/vnd.apple.mpegurl" });
    currentPlaylistBlobUrl = URL.createObjectURL(playlistBlob);

    status.textContent = "جاري التشغيل...";

    // Heartbeat كل 25 ثانية
    hbTimer = setInterval(function () {
      fetch("/api/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: hbUrl, token: streamToken }),
      }).catch(function () {});
    }, 25000);

    if (window.Hls && Hls.isSupported()) {
      hls = new Hls({
        enableWorker: false,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });
      hls.loadSource(currentPlaylistBlobUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, function () {
        status.textContent = "";
        status.classList.add("hidden");
        video.play().catch(function () {
          status.textContent = "اضغط Play يدويًا";
          status.classList.remove("hidden");
        });
      });
      hls.on(Hls.Events.ERROR, function (_, data) {
        console.error("HLS error:", data);
        if (!data.fatal) return;
        var msg = data.type + (data.details ? " / " + data.details : "");
        if (data.response && data.response.code) msg += " HTTP " + data.response.code;
        status.textContent = "خطأ HLS: " + msg;
        status.classList.remove("hidden");
      });
    } else {
      status.textContent = "المتصفح لا يدعم HLS.js";
      status.classList.remove("hidden");
    }
  } catch (e) {
    console.error(e);
    status.textContent = "فشل: " + (e.message || e);
    status.classList.remove("hidden");
  }
}

/* ============================================================
   Stop Playback — كما هو
   ============================================================ */
function stopPlayback() {
  if (hbTimer) { clearInterval(hbTimer); hbTimer = null; }
  if (hls) { hls.destroy(); hls = null; }
  if (currentKeyBlobUrl) { URL.revokeObjectURL(currentKeyBlobUrl); currentKeyBlobUrl = null; }
  if (currentPlaylistBlobUrl) { URL.revokeObjectURL(currentPlaylistBlobUrl); currentPlaylistBlobUrl = null; }
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

/* ============================================================
   Speed & Quality Controls (جديد)
   ============================================================ */
document.addEventListener("click", function (e) {
  if (e.target.matches("#speed-btns button")) {
    const sp = parseFloat(e.target.dataset.speed);
    const video = document.getElementById("video");
    if (video) video.playbackRate = sp;
    document.querySelectorAll("#speed-btns button").forEach(function (b) {
      b.classList.toggle("active", b === e.target);
    });
  }
});

document.addEventListener("change", function (e) {
  if (e.target.id === "quality-select" && hls) {
    const v = parseInt(e.target.value, 10);
    hls.currentLevel = v === -1 ? -1 : v;
  }
});

/* ============================================================
   Modal close on ESC (جديد)
   ============================================================ */
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") closePlayer();
});

/* ============================================================
   Search Input Binding (جديد)
   ============================================================ */
document.addEventListener("DOMContentLoaded", function () {
  const si = document.getElementById("search-input");
  if (si) {
    si.addEventListener("input", function (e) {
      const q = e.target.value.trim().toLowerCase();
      if (q) {
        state.view = "search";
        renderSearch();
      } else {
        goHome();
      }
    });
  }
});

/* ============================================================
   Init
   ============================================================ */
loadPlayerScript()
  .then(function (c) { cryptoUtils = c; })
  .catch(function () {});

render();
