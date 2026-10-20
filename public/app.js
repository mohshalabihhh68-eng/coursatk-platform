/* ==================== State ==================== */
const state = {
  view: "years",
  year: null, subject: null, teacher: null, chapter: null, lecture: null
};
let hls = null;
let hbTimer = null;
let cryptoUtils = null;
let currentKeyBlobUrl = null;
let currentPlaylistBlobUrl = null;

const appEl    = document.getElementById("app");
const videoEl  = document.getElementById("video");
const playerWrap  = document.getElementById("player-wrap");
const clickLayer  = document.getElementById("click-layer");

/* ==================== Helpers ==================== */
function svgIcon(path, opts) {
  opts = opts || {};
  var w = opts.w || 18;
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="' + w + '" height="' + w + '">' + path + '</svg>';
}

async function api(path, opts) {
  opts = opts || {};
  const res  = await fetch(path, opts);
  const data = await res.json();
  if (!res.ok || data.success === false)
    throw new Error(data.error || data.message || "HTTP " + res.status);
  return data.data !== undefined ? data.data : data;
}

function goHome() {
  Object.assign(state, { view:"years", year:null, subject:null, teacher:null, chapter:null, lecture:null });
  render();
}
function setView(view, extra) {
  if (extra) Object.assign(state, extra);
  state.view = view;
  render();
  window.scrollTo(0, 0);
}

/* ==================== Render Router ==================== */
async function render() {
  appEl.innerHTML = '<div class="loading-screen"><div class="spinner-ring"></div><span style="color:var(--muted);font-size:13px;font-weight:700">جاري التحميل...</span></div>';
  try {
    if      (state.view === "years")    await renderYears();
    else if (state.view === "subjects") await renderSubjects();
    else if (state.view === "teachers") await renderTeachers();
    else if (state.view === "chapters") await renderChapters();
    else if (state.view === "lectures") await renderLectures();
    else if (state.view === "content")  await renderContent();
  } catch(e) {
    appEl.innerHTML = `<div style="text-align:center;padding:60px;color:var(--red);font-weight:800;">خطأ: ${e.message}</div>`;
  }
}

/* ==================== Pages ==================== */
async function renderYears() {
  const years = await api("/api/years");
  let html = `
    <div class="page-head reveal">
      <div class="eyebrow"><span class="eyebrow-dot"></span> منصة ثانوية club</div>
      <h1>المواد الدراسية <span class="gradient-text">2027</span></h1>
      <p>اختار المادة وتابع محاضراتك مع أفضل المدرسين.</p>
    </div>
    <div class="grid">`;
  years.forEach((y, i) => {
    html += `
      <div class="card reveal" onclick='setView("subjects",${JSON.stringify({year:y})})'>
        <div class="card-thumb">
          <img src="${y.image_url||''}" onerror="this.style.display='none'" />
          <div class="card-thumb-overlay"></div>
          <span class="status-pill">● متاح الآن</span>
        </div>
        <div class="card-body">
          <div class="card-meta">
            <div>
              <div class="card-sub">2027</div>
              <div class="card-title">${y.name}</div>
            </div>
          </div>
          <div class="card-row"><span>آخر تحديث 2027/8/20</span><span>⏱</span></div>
          <button class="btn btn-primary" style="width:100%">عرض المدرسين ${svgIcon('<path d="M15 18l-6-6 6-6"/>')}</button>
        </div>
      </div>`;
  });
  appEl.innerHTML = html + "</div>";
  _observe();
}

async function renderSubjects() {
  const subjects = await api("/api/subjects/" + state.year.id);
  let html = `
    <div class="page-head reveal">
      <button class="back-btn" onclick="goHome()">← رجوع</button>
      <div class="eyebrow"><span class="eyebrow-dot"></span> ${state.year.name}</div>
      <h1>مواد <span class="gradient-text">${state.year.name}</span></h1>
      <p>اختار المادة وابدأ المذاكرة.</p>
    </div>
    <div class="grid">`;
  subjects.forEach(s => {
    html += `
      <div class="card reveal" onclick='setView("teachers",${JSON.stringify({subject:s})})'>
        <div class="card-thumb">
          <img src="${s.image_url||''}" onerror="this.style.display='none'" />
          <div class="card-thumb-overlay"></div>
          <span class="status-pill">● متاح الآن</span>
        </div>
        <div class="card-body">
          <div class="card-meta"><div><div class="card-sub">المادة</div><div class="card-title">${s.name}</div></div></div>
          <div class="card-row"><span>آخر تحديث 2027/8/20</span><span>⏱</span></div>
          <button class="btn btn-primary" style="width:100%">عرض المدرسين ${svgIcon('<path d="M15 18l-6-6 6-6"/>')}</button>
        </div>
      </div>`;
  });
  appEl.innerHTML = html + "</div>";
  _observe();
}

async function renderTeachers() {
  const data     = await api("/api/subjects/" + state.subject.id + "/teachers");
  const teachers = data.teachers || [];
  let html = `
    <div class="page-head reveal">
      <button class="back-btn" onclick='setView("subjects",${JSON.stringify({year:state.year})})'>← رجوع للمواد</button>
      <div class="eyebrow"><span class="eyebrow-dot"></span> ${state.subject.name}</div>
      <h1>مدرسو <span class="gradient-text">${state.subject.name}</span></h1>
      <p>اختار المدرس وشوف الفصول المتاحة.</p>
    </div>
    <div class="grid">`;
  teachers.forEach(t => {
    html += `
      <div class="t-card reveal">
        <div class="t-top">
          <div class="t-info">
            <div class="t-role">مدرس المادة</div>
            <div class="t-name">${t.name}</div>
          </div>
          <img class="t-avatar" src="${t.image_url||''}" onerror="this.style.opacity=.3" />
        </div>
        <div class="t-stats">
          <span class="count-badge">${t.chapter_count||0}</span>
          <span>فصل متاح 📚</span>
        </div>
        <button class="btn btn-primary" style="width:100%" onclick='setView("chapters",${JSON.stringify({teacher:t})})'>اكتشف الفصول ${svgIcon('<path d="M15 18l-6-6 6-6"/>')}</button>
      </div>`;
  });
  appEl.innerHTML = html + "</div>";
  _observe();
}

async function renderChapters() {
  const chapters = await api("/api/teachers/" + state.teacher.id + "/chapters");
  let html = `
    <div class="page-head reveal">
      <button class="back-btn" onclick='setView("teachers",${JSON.stringify({subject:state.subject})})'>← رجوع للمدرسين</button>
      <div class="eyebrow"><span class="eyebrow-dot"></span> ${state.teacher.name}</div>
      <h1>فصول <span class="gradient-text">${state.teacher.name}</span></h1>
      <p>اختار الفصل وشوف المحاضرات المتاحة.</p>
    </div>
    <div class="grid">`;
  chapters.forEach(c => {
    html += `
      <div class="t-card reveal">
        <div class="t-top">
          <div class="t-info">
            <div class="t-role">الفصل ${c.order||''}</div>
            <div class="t-name">${c.name}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:5px">م. ${state.teacher.name}</div>
          </div>
          <img class="t-avatar" src="${c.image_url||''}" onerror="this.style.opacity=.3" />
        </div>
        <div class="t-stats">
          <span class="count-badge">${c.lecture_count||0}</span>
          <span>محاضرة ⏱</span>
        </div>
        <button class="btn btn-primary" style="width:100%" onclick='setView("lectures",${JSON.stringify({chapter:c})})'>مشاهدة المحاضرات ${svgIcon('<path d="M15 18l-6-6 6-6"/>')}</button>
      </div>`;
  });
  appEl.innerHTML = html + "</div>";
  _observe();
}

async function renderLectures() {
  const lectures = await api("/api/chapters/" + state.chapter.id + "/lectures");
  let html = `
    <div class="page-head reveal">
      <button class="back-btn" onclick='setView("chapters",${JSON.stringify({teacher:state.teacher})})'>← رجوع للفصول</button>
      <div class="eyebrow"><span class="eyebrow-dot"></span> ${state.teacher.name}</div>
      <h1>${state.chapter.name}</h1>
      <p>قائمة محاضرات الفصل.</p>
    </div>
    <div class="grid">`;
  lectures.forEach((l, idx) => {
    html += `
      <div class="card reveal">
        <div class="card-body">
          <div class="card-meta"><div><div class="card-sub">المحاضرة ${idx+1}</div><div class="card-title">${l.name}</div></div></div>
          <div class="content-icons">
            <div class="ci-item">
              ${svgIcon('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>')}
              <span>${l.video_count||0}</span><small>فيديو</small>
            </div>
            <div class="ci-item">
              ${svgIcon('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>')}
              <span>${l.pdf_count||0}</span><small>ملف</small>
            </div>
            <div class="ci-item">
              ${svgIcon('<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>')}
              <span>${l.exam_count||0}</span><small>اختبار</small>
            </div>
          </div>
          <button class="btn btn-primary" style="width:100%" onclick='setView("content",${JSON.stringify({lecture:l})})'>محتوى المحاضرة ${svgIcon('<path d="M15 18l-6-6 6-6"/>')}</button>
        </div>
      </div>`;
  });
  appEl.innerHTML = html + "</div>";
  _observe();
}

async function renderContent() {
  const content = await api("/api/lectures/" + state.lecture.id + "/content");
  const videos  = content.videos || [];
  const pdfs    = content.pdfs   || [];

  let html = `
    <div class="page-head reveal" style="text-align:right">
      <button class="back-btn" style="right:auto;left:0" onclick='setView("lectures",${JSON.stringify({chapter:state.chapter})})'>← رجوع</button>
      <div class="eyebrow"><span class="eyebrow-dot"></span> المحاضرة #${state.lecture.id}</div>
      <h1>محتوى <span class="gradient-text">${state.lecture.name}</span></h1>
      <p>فيديوهات وملفات الشرح في مكان واحد.</p>
    </div>

    <div style="background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:24px;margin-bottom:22px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--line)">
        <h2 style="font-size:16px;margin:0;font-weight:900">الفيديوهات</h2>
        <span class="eyebrow" style="margin:0">${videos.length} فيديو</span>
      </div>
      <div class="grid">`;

  videos.forEach((v, i) => {
    const title = String(v.title).replace(/\\/g,"\\\\").replace(/'/g,"\\'");
    html += `
      <div class="v-card reveal">
        <div class="v-thumb">
          <img src="${v.thumbnail_url||''}" onerror="this.style.display='none'" />
          <div class="v-play-overlay"><div class="v-play-btn"><svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M8 5v14l11-7z"/></svg></div></div>
          <span class="v-num">فيديو #${i+1}</span>
          <span class="v-dur">⏱ ${v.duration||'00:00'}</span>
        </div>
        <div class="v-body">
          <div class="v-title">${v.title}</div>
          <button class="btn btn-cyan" style="width:100%" onclick="playVideo(${v.id},'${title}')">تشغيل ▶</button>
        </div>
      </div>`;
  });
  html += `</div></div>`;

  if (pdfs.length) {
    html += `
      <div style="background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:24px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--line)">
          <h2 style="font-size:16px;margin:0;font-weight:900">ملفات الشرح</h2>
          <span class="eyebrow" style="margin:0">${pdfs.length} ملف</span>
        </div>
        <div class="grid">`;
    pdfs.forEach(p => {
      html += `
        <div style="background:var(--panel2);border:1px solid var(--line);border-radius:13px;padding:18px;text-align:center">
          <div style="font-size:14px;font-weight:800;margin-bottom:16px">${p.title}</div>
          <div style="display:flex;gap:8px">
            <a href="${p.url}" target="_blank" class="btn btn-primary" style="flex:1;font-size:12px">عرض 👁</a>
            <a href="${p.url}" download class="btn" style="flex:1;font-size:12px">تحميل ⬇</a>
          </div>
        </div>`;
    });
    html += `</div></div>`;
  }

  appEl.innerHTML = html;
  _observe();
}

/* ==================== Intersection Observer ==================== */
function _observe() {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
    return;
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
  }, { threshold: .06 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
}

/* ==================== Player — Crypto & Decrypt ==================== */
function findCrypto() {
  if (window.DecryptionUtils && typeof window.DecryptionUtils.decryptPlaybackKey === "function") return window.DecryptionUtils;
  for (var n of Object.getOwnPropertyNames(window)) {
    try { var o = window[n]; if (o && typeof o === "object" && typeof o.decryptPlaybackKey === "function") return o; } catch(e){}
  }
  return null;
}
function loadPlayerScript() {
  return new Promise(function(resolve, reject) {
    if (findCrypto()) return resolve(findCrypto());
    var existing = document.querySelector('script[src*="player.stream-weave.com"]');
    if (existing) {
      var tries = 0, t = setInterval(function() {
        var c = findCrypto(); if (c) { clearInterval(t); resolve(c); } else if (++tries > 40) { clearInterval(t); reject(new Error("timeout")); }
      }, 150);
      return;
    }
    var s = document.createElement("script");
    s.src = "https://player.stream-weave.com/assets/player.js?v=1.1.1";
    s.onload = function() {
      var tries = 0, t = setInterval(function() {
        var c = findCrypto(); if (c) { clearInterval(t); resolve(c); } else if (++tries > 40) { clearInterval(t); reject(new Error("crypto not found")); }
      }, 150);
    };
    s.onerror = function() { reject(new Error("failed to load player.js")); };
    document.head.appendChild(s);
  });
}

function toB64url(str) { return btoa(unescape(encodeURIComponent(str))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,""); }
function fromB64url(v) { var s = String(v).replace(/-/g,"+").replace(/_/g,"/"); while (s.length%4) s+="="; return decodeURIComponent(escape(atob(s))); }

function joinRel(base, rel) {
  var q="", relPath=String(rel), qi=relPath.indexOf("?");
  if (qi!==-1){ q=relPath.slice(qi); relPath=relPath.slice(0,qi); }
  var stack=String(base||"").split("/");
  if (stack.length&&stack[stack.length-1]!==""&&/\.[a-z0-9]+$/i.test(stack[stack.length-1])) stack.pop();
  if (stack.length&&stack[stack.length-1]==="") stack.pop();
  relPath.split("/").forEach(function(part){ if(!part||part===".") return; if(part==="..") stack.pop(); else stack.push(part); });
  return stack.join("/")+q;
}

function resolveMedia(uri, varBase, token, varFileUrl) {
  if (/^(blob:|data:)/i.test(uri)) return uri;
  if (uri.indexOf("/api/stream")===0||uri.indexOf("/api/cdn")===0) return location.origin+uri;
  if (/^https?:\/\//i.test(uri)) return location.origin+"/api/cdn?u="+toB64url(uri);
  if (varFileUrl) { try { return location.origin+"/api/cdn?u="+toB64url(new URL(uri,varFileUrl).href); } catch(e){} }
  return location.origin+"/api/stream?path="+encodeURIComponent(joinRel(varBase||"",uri))+"&t="+encodeURIComponent(token);
}

function rewritePlaylist(text, token, keyBlobUrl, varBase, varFileUrl) {
  return text.split("\n").map(function(line) {
    var s=line.trim(); if(!s) return line;
    if (s.charAt(0)==="#") {
      if (s.indexOf("#EXT-X-KEY:")===0&&keyBlobUrl) return s.replace(/URI="[^"]+"/, 'URI="'+keyBlobUrl+'"');
      return s.replace(/URI="([^"]+)"/g, function(_m,uri){ return 'URI="'+resolveMedia(uri,varBase,token,varFileUrl)+'"'; });
    }
    return resolveMedia(s, varBase, token, varFileUrl);
  }).join("\n");
}

async function playVideo(videoId, title) {
  document.getElementById("player-title").textContent = title;
  document.getElementById("player-modal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  const status = document.getElementById("player-status");
  status.querySelector("span").textContent = "جاري فتح الجلسة...";
  status.classList.remove("hidden");
  stopPlayback();

  try {
    var session = await api("/api/video/"+videoId+"/play", { method:"POST" });
    var streamToken=session.token, swVideoId=session.video_id, hbUrl=session.heartbeat_url;
    if (!streamToken||!swVideoId) throw new Error("جلسة ناقصة");

    status.querySelector("span").textContent = "فك التشفير...";
    if (!cryptoUtils) cryptoUtils = await loadPlayerScript();

    var masterUrl="/api/stream?path="+encodeURIComponent("videos/"+swVideoId+"/stream/master.m3u8")+"&t="+encodeURIComponent(streamToken);
    var masterRes=await fetch(masterUrl);
    if (!masterRes.ok) throw new Error("master.m3u8 → HTTP "+masterRes.status);
    var masterText=await masterRes.text();
    var variantRel=masterText.split("\n").map(l=>l.trim()).find(l=>l&&l.charAt(0)!=="#");
    if (!variantRel) throw new Error("مفيش variant");

    var variantUrl, varBase="videos/"+swVideoId+"/stream/", varFileUrl=null;
    if (variantRel.indexOf("/api/stream")===0||variantRel.indexOf("/api/cdn")===0) {
      variantUrl=variantRel;
      try { var vu=new URL(variantRel,location.origin); if (vu.pathname.indexOf("/api/stream")===0&&vu.searchParams.get("path")) varBase=vu.searchParams.get("path"); if (vu.pathname.indexOf("/api/cdn")===0&&vu.searchParams.get("u")) varFileUrl=fromB64url(vu.searchParams.get("u")); } catch(e){}
    } else if (variantRel.indexOf("http")===0) {
      varFileUrl=variantRel; variantUrl="/api/cdn?u="+toB64url(variantRel);
    } else {
      varBase="videos/"+swVideoId+"/stream/"+variantRel;
      variantUrl="/api/stream?path="+encodeURIComponent(varBase)+"&t="+encodeURIComponent(streamToken);
    }

    var variantRes=await fetch(variantUrl);
    if (!variantRes.ok) throw new Error("variant → HTTP "+variantRes.status);
    var variantText=await variantRes.text();

    status.querySelector("span").textContent = "فك المفتاح...";
    var keyLine=variantText.split("\n").find(l=>l.indexOf("EXT-X-KEY")!==-1);
    var keyPath="videos/"+swVideoId+"/key", ivHex=null;
    if (keyLine) {
      var kum=keyLine.match(/URI="([^"]+)"/), ivm=keyLine.match(/IV=0x([0-9a-fA-F]+)/i);
      if (ivm) ivHex=ivm[1];
      if (kum) {
        var uri=kum[1];
        if (uri.indexOf("/api/stream")===0||uri.indexOf(location.origin+"/api/stream")===0) {
          try { var u=new URL(uri,location.origin); var pth=u.searchParams.get("path"); if(pth) keyPath=pth; } catch(e){}
        } else if (uri.indexOf("http")!==0&&uri.indexOf("/api/cdn")!==0) keyPath=uri.replace(/^\//,"").replace(/^api\/v1\//,"");
      }
    }
    var keyUrl="/api/stream?path="+encodeURIComponent(keyPath)+"&t="+encodeURIComponent(streamToken);
    var keyRes=await fetch(keyUrl);
    if (!keyRes.ok) throw new Error("key → HTTP "+keyRes.status);
    var wrappedKey=new Uint8Array(await keyRes.arrayBuffer());
    var keyResult=await cryptoUtils.decryptPlaybackKey(wrappedKey, swVideoId);
    var aesKey=keyResult&&keyResult.key;
    if (!aesKey||aesKey.byteLength!==16) throw new Error("مفتاح غير صالح");

    var keyBytes=aesKey instanceof ArrayBuffer ? aesKey : aesKey.buffer.slice(aesKey.byteOffset, aesKey.byteOffset+aesKey.byteLength);
    currentKeyBlobUrl=URL.createObjectURL(new Blob([keyBytes],{type:"application/octet-stream"}));

    var fixedVariant=rewritePlaylist(variantText, streamToken, currentKeyBlobUrl, varBase, varFileUrl);
    if (fixedVariant.indexOf("#EXTM3U")!==0) fixedVariant="#EXTM3U\n"+fixedVariant.replace(/^#EXTM3U\s*/m,"");
    if (fixedVariant.indexOf("EXT-X-KEY")===-1) {
      var ivPart=ivHex?",IV=0x"+ivHex:"";
      fixedVariant='#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="'+currentKeyBlobUrl+'"'+ivPart+"\n"+fixedVariant.replace(/^#EXTM3U\s*/m,"");
    }
    currentPlaylistBlobUrl=URL.createObjectURL(new Blob([fixedVariant],{type:"application/vnd.apple.mpegurl"}));

    status.querySelector("span").textContent = "جاري التشغيل...";
    hbTimer=setInterval(function(){ fetch("/api/heartbeat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:hbUrl,token:streamToken})}).catch(()=>{}); }, 25000);

    if (window.Hls&&Hls.isSupported()) {
      hls=new Hls({enableWorker:false,maxBufferLength:30,maxMaxBufferLength:60});
      hls.loadSource(currentPlaylistBlobUrl);
      hls.attachMedia(videoEl);
      hls.on(Hls.Events.MANIFEST_PARSED, function(event, data) {
        status.classList.add("hidden");
        const qMenu=document.getElementById("quality-menu");
        let qHtml=`<button onclick="setQuality(-1,this)" class="active">تلقائي</button>`;
        data.levels.forEach((lv,i) => { if(lv.height>0) qHtml+=`<button onclick="setQuality(${i},this)">${lv.height}p</button>`; });
        qMenu.innerHTML=qHtml;
        videoEl.play().catch(()=>{ document.getElementById("big-play-btn")&&document.getElementById("big-play-btn").classList.remove("hidden"); });
      });
      hls.on(Hls.Events.ERROR, function(_,d){ if(!d.fatal)return; status.querySelector("span").textContent="خطأ HLS: "+d.type; status.classList.remove("hidden"); });
    } else {
      videoEl.src=currentPlaylistBlobUrl;
      videoEl.play();
    }
  } catch(e) {
    status.querySelector("span").textContent = "فشل: "+e.message;
    status.classList.remove("hidden");
  }
}

/* ==================== Player UI ==================== */
function toggleDropdown(id) {
  document.querySelectorAll(".dropdown-panel").forEach(el => { if(el.id!==id) el.classList.add("hidden"); });
  document.getElementById(id).classList.toggle("hidden");
}
document.addEventListener("click", e => {
  if (!e.target.closest(".dropdown")) document.querySelectorAll(".dropdown-panel").forEach(el=>el.classList.add("hidden"));
});

function togglePlay() { videoEl.paused ? videoEl.play() : videoEl.pause(); }

videoEl.addEventListener("play",  () => {
  document.getElementById("play-icon").classList.add("hidden");
  document.getElementById("pause-icon").classList.remove("hidden");
  playerWrap.classList.remove("paused");
});
videoEl.addEventListener("pause", () => {
  document.getElementById("play-icon").classList.remove("hidden");
  document.getElementById("pause-icon").classList.add("hidden");
  playerWrap.classList.add("paused");
  playerWrap.classList.remove("hide-cursor");
});

function setSpeed(speed, btn) {
  videoEl.playbackRate = speed;
  document.getElementById("speed-btn").textContent = speed===1 ? "1x" : speed+"x";
  document.querySelectorAll("#speed-menu button").forEach(b=>b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  document.getElementById("speed-menu").classList.add("hidden");
}

function setQuality(idx, btn) {
  if (!hls) return;
  hls.currentLevel = idx;
  document.getElementById("quality-btn").textContent = idx===-1 ? "تلقائي" : hls.levels[idx].height+"p";
  document.querySelectorAll("#quality-menu button").forEach(b=>b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  document.getElementById("quality-menu").classList.add("hidden");
}

function fmtTime(sec) {
  if (isNaN(sec)) return "00:00";
  return String(Math.floor(sec/60)).padStart(2,"0")+":"+String(Math.floor(sec%60)).padStart(2,"0");
}
videoEl.addEventListener("timeupdate", () => {
  if (!videoEl.duration) return;
  const pct=(videoEl.currentTime/videoEl.duration)*100;
  document.getElementById("prog-filled").style.width=pct+"%";
  document.getElementById("time-disp").textContent=fmtTime(videoEl.currentTime)+" / "+fmtTime(videoEl.duration);
});
videoEl.addEventListener("loadedmetadata", () => {
  document.getElementById("time-disp").textContent="00:00 / "+fmtTime(videoEl.duration);
});

function seekVideo(e) {
  const bar=document.getElementById("prog-bar");
  const rect=bar.getBoundingClientRect();
  let pct=(e.clientX-rect.left)/rect.width;
  if (document.dir==="rtl") pct=1-pct;
  if (videoEl.duration) videoEl.currentTime=pct*videoEl.duration;
}
function toggleMute() {
  videoEl.muted=!videoEl.muted;
  document.getElementById("vol-icon").style.opacity=videoEl.muted?.5:1;
}
document.getElementById("volume-slider").addEventListener("input", e=>{
  videoEl.volume=e.target.value;
  videoEl.muted=e.target.value==0;
});
function toggleFullscreen() {
  if (!document.fullscreenElement) playerWrap.requestFullscreen().catch(()=>{});
  else document.exitFullscreen();
}

/* ==================== Click layer (tap zones + long press) ==================== */
let clickTimer=null, pressTimer=null, isLongPress=false, speedBeforeHold=1;
clickLayer.addEventListener("mousedown",  handleDown);
clickLayer.addEventListener("touchstart", handleDown, {passive:true});
clickLayer.addEventListener("mouseup",   handleUp);
clickLayer.addEventListener("touchend",  handleUp);
clickLayer.addEventListener("mouseleave",handleUp);

function handleDown(e) {
  isLongPress=false;
  if (videoEl.paused) return;
  const cx=e.touches?e.touches[0].clientX:e.clientX;
  pressTimer=setTimeout(()=>{ isLongPress=true; speedBeforeHold=videoEl.playbackRate; videoEl.playbackRate=2; clearTimeout(clickTimer); },400);
  clickTimer=setTimeout(()=>{ if(!isLongPress) handleTap(cx); },250);
}
function handleUp() {
  clearTimeout(pressTimer); clearTimeout(clickTimer);
  if (isLongPress) videoEl.playbackRate=speedBeforeHold;
}
function handleTap(cx) {
  const rect=playerWrap.getBoundingClientRect();
  const rx=(cx-rect.left)/rect.width;
  if      (rx<.35) skipTime(-10);
  else if (rx>.65) skipTime(10);
  else             togglePlay();
}
function skipTime(sec) {
  videoEl.currentTime+=sec;
  showSeekIndicator(sec>0?"+10s":"-10s");
}
function showSeekIndicator(txt) {
  const el=document.getElementById("seek-indicator");
  el.textContent=txt; el.classList.remove("hidden");
  el.style.animation="none"; el.offsetHeight; el.style.animation=null;
  setTimeout(()=>el.classList.add("hidden"),650);
}

/* Auto-hide cursor */
let cursorTimer;
playerWrap.addEventListener("mousemove",()=>{
  playerWrap.classList.remove("hide-cursor"); clearTimeout(cursorTimer);
  if (!videoEl.paused) cursorTimer=setTimeout(()=>playerWrap.classList.add("hide-cursor"),2200);
});

/* ==================== Stop & Close ==================== */
function stopPlayback() {
  if (hbTimer) { clearInterval(hbTimer); hbTimer=null; }
  if (hls) { hls.destroy(); hls=null; }
  if (currentKeyBlobUrl) { URL.revokeObjectURL(currentKeyBlobUrl); currentKeyBlobUrl=null; }
  if (currentPlaylistBlobUrl) { URL.revokeObjectURL(currentPlaylistBlobUrl); currentPlaylistBlobUrl=null; }
  videoEl.playbackRate=1;
  videoEl.removeAttribute("src"); videoEl.load();
}
function closePlayer() {
  stopPlayback();
  document.getElementById("player-modal").classList.add("hidden");
  document.body.style.overflow="";
  document.querySelectorAll(".dropdown-panel").forEach(el=>el.classList.add("hidden"));
  document.getElementById("seek-indicator").classList.add("hidden");
}

/* ==================== Theme ==================== */
document.getElementById("theme-toggle").addEventListener("click",()=>{
  const next=document.body.getAttribute("data-theme")==="light"?"dark":"light";
  document.body.setAttribute("data-theme",next);
});

/* ==================== Init ==================== */
loadPlayerScript().then(c=>cryptoUtils=c).catch(()=>{});
render();
