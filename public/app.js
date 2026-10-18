// ==================== State ====================
const state = { view: "years", year: null, subject: null, teacher: null, chapter: null, lecture: null, videosList: [], currentVideoIndex: -1 };
let hls = null; let hbTimer = null; let cryptoUtils = null; let currentKeyBlobUrl = null; let currentPlaylistBlobUrl = null;
const appEl = document.getElementById("app"); const videoEl = document.getElementById("video"); const playerContainer = document.getElementById("custom-player"); const clickLayer = document.getElementById("click-layer"); const centerPlayBtn = document.getElementById("center-play-btn");

// ==================== Storage Helpers ====================
const getStorageKey = (id) => `coursatk_video_${id}`;
const getWatchedKey = (id) => `coursatk_watched_${id}`;
function markAsWatched(id) { localStorage.setItem(getWatchedKey(id), "true"); }
function isWatched(id) { return localStorage.getItem(getWatchedKey(id)) === "true"; }

// ==================== API & Utils ====================
async function api(path, opts = {}) {
  opts.credentials = opts.credentials || 'include'; opts.headers = opts.headers || {};
  const res  = await fetch(path, opts);
  if (res.status === 403) throw new Error("غير مصرح لك بالوصول (403).");
  const text = await res.text(); let data;
  try { data = JSON.parse(text); } catch (e) { if (!res.ok) throw new Error(`HTTP ${res.status}`); data = text; }
  if (!res.ok || data.success === false) throw new Error(data.error || data.message || "HTTP " + res.status);
  return data.data !== undefined ? data.data : data;
}
function goHome() { Object.assign(state, { view:"years", year:null, subject:null, teacher:null, chapter:null, lecture:null }); render(); }
function setView(view, extra) { if (extra) Object.assign(state, extra); state.view = view; render(); window.scrollTo(0, 0); }

// ==================== Render Pages (كما هو) ====================
async function render() {
  appEl.innerHTML = '<div class="loading">جاري التحميل...</div>';
  try {
    if (state.view === "years") await renderYears(); else if (state.view === "subjects") await renderSubjects(); else if (state.view === "teachers") await renderTeachers(); else if (state.view === "chapters") await renderChapters(); else if (state.view === "lectures") await renderLectures(); else if (state.view === "content") await renderContent();
  } catch (e) { appEl.innerHTML = `<div style="color:#ff3d00;text-align:center;padding:50px;">خطأ: ${e.message}</div>`; }
}

// ... (باقي دوال renderYears, renderSubjects, renderTeachers, renderChapters, renderLectures كما هي من الرد السابق) ...
// عشان الكود ميطولش، هحط الجزء المعدل بس
// 🔴🔴 خد بالك: لازم تحط دوال الريندر القديمة (renderYears, renderSubjects, الخ) هنا زي ما هي بالظبط، لأني مش هعيدها في الرد ده لتوفير المساحة.

// دالة عرض المحتوى (اللي هتفتح المشغل الجديد)
async function renderContent() {
  const content = await api("/api/lectures/" + state.lecture.id + "/content"); 
  state.videosList = content.videos || []; 
  const pdfs = content.pdfs || [];
  
  let html = `
    <div class="page-title-area" style="text-align:right;margin-bottom:20px;">
      <button class="back-btn-top" style="right:auto;left:0;" onclick='setView("lectures",${JSON.stringify({chapter:state.chapter})})'>← رجوع</button>
      <div class="page-badge">المحاضرة #${state.lecture.id}</div>
      <h1>محتوي <span>${state.lecture.name}</span></h1>
      <p>ذاكر المحاضرة كاملة من فيديوهات وملفات.</p>
    </div>
    <div class="card" style="padding:24px;margin-bottom:24px;cursor:default;">
      <div class="section-header"><h2>الفيديوهات</h2><span class="page-badge">${state.videosList.length} فيديو متاح</span></div>
      <div class="grid">`;
  
  state.videosList.forEach((v, i) => { 
    const watchedBadge = isWatched(v.id) ? `<div class="watched-badge">✅ تمت المشاهدة</div>` : '';
    html += `<div class="video-card" onclick="openPlayerPage(${i})" style="cursor:pointer;"><div class="video-thumbnail"><img src="${v.thumbnail_url||''}" onerror="this.style.display='none'" />${watchedBadge}<div class="video-num-badge">فيديو #${i+1}</div><div class="video-duration-badge">⏱ ${formatTime(v.duration ? parseInt(v.duration) : 0)}</div><div class="play-overlay"><div class="play-btn-circle"><svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M8 5v14l11-7z"/></svg></div></div></div><div class="video-info"><h3 class="video-title">${v.title}</h3><button class="btn-gradient">تشغيل الفيديو ▶</button></div></div>`; 
  });
  
  html += `</div></div>`;
  if (pdfs.length > 0) {
    html += `<div class="card" style="padding:24px;cursor:default;"><div class="section-header"><h2>ملفات الشرح</h2><span class="page-badge">${pdfs.length} ملف متاح</span></div><div class="grid">`;
    pdfs.forEach(p => { html += `<div class="card" style="padding:20px;text-align:center;background:var(--bg-card-light);cursor:default;"><h3 class="video-title" style="margin-bottom:16px;">${p.title}</h3><div style="display:flex;gap:10px;"><a href="${p.url}" target="_blank" class="btn-gradient" style="text-decoration:none;flex:1;padding:10px;font-size:0.9rem;">عرض 👁</a><a href="${p.url}" download class="btn-gradient" style="text-decoration:none;flex:1;padding:10px;font-size:0.9rem;background:#3b2a15;">تحميل ⬇</a></div></div>`; });
    html += `</div></div>`;
  }
  appEl.innerHTML = html;
}

// ==================== Player Core Logic (الجزء المعدل) ====================

function formatTime(sec) {
  if(isNaN(sec)||sec<0) return '00:00';
  const t = Math.floor(sec); const h = Math.floor(t/3600); const m = Math.floor((t%3600)/60); const s = t%60;
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function openPlayerPage(index) {
  if (index < 0 || index >= state.videosList.length) return;
  document.getElementById("player-page").classList.remove("hidden");
  document.body.style.overflow = "hidden"; 
  buildSidebar();
  playVideo(index);
}

function closePlayer() {
  if (state.videosList[state.currentVideoIndex] && videoEl.currentTime > 0 && videoEl.currentTime < videoEl.duration) {
    localStorage.setItem(getStorageKey(state.videosList[state.currentVideoIndex].id), videoEl.currentTime);
  }
  stopPlayback(); 
  document.getElementById("player-page").classList.add("hidden"); 
  document.body.style.overflow = ""; 
}

// بناء القائمة الجانبية
function buildSidebar() {
  const listEl = document.getElementById('side-videos-list');
  listEl.innerHTML = '';
  
  // تحديث الإحصائيات
  let watched = 0;
  state.videosList.forEach(v => { if(isWatched(v.id)) watched++; });
  const remain = state.videosList.length - watched;
  const pct = state.videosList.length > 0 ? Math.round((watched / state.videosList.length) * 100) : 0;
  
  document.getElementById('stat-completed').textContent = watched;
  document.getElementById('stat-remaining').textContent = remain;
  document.querySelector('.stat-box .stat-val').textContent = pct + '%';
  document.getElementById('video-count-tag').textContent = `${state.videosList.length} فيديو`;
  document.getElementById('watched-count-tag').textContent = `${watched} تمت مشاهدته`;
  document.getElementById('remaining-count-tag').textContent = `${remain} متبقي`;
  document.getElementById('side-subtitle').textContent = `${state.videosList.length} فيديو`;

  // بناء العناصر
  state.videosList.forEach((v, i) => {
    const isCurrent = i === state.currentVideoIndex;
    const watched = isWatched(v.id);
    const savedTime = localStorage.getItem(getStorageKey(v.id));
    
    let statusHtml = '';
    if (isCurrent) statusHtml = `<div class="side-status"><span style="color:#ff6b00;">▶ يعمل الآن</span></div>`;
    else if (watched) statusHtml = `<div class="side-status"><span class="check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> مكتمل</span></div>`;
    else if (savedTime && parseFloat(savedTime) > 2) statusHtml = `<div class="side-status">⏱ متبقي ${formatTime(videoEl.duration || (v.duration?parseInt(v.duration):0))}</div>`;
    else statusHtml = `<div class="side-status">لم يبدأ بعد</div>`;

    const div = document.createElement('div');
    div.className = `side-item ${isCurrent ? 'active' : ''}`;
    div.onclick = () => playVideo(i);
    div.innerHTML = `
      <div class="side-num">${i + 1}</div>
      <div class="side-info">
        <div class="side-title-row">
          <h4>${v.title}</h4>
          <span class="side-duration">${formatTime(v.duration ? parseInt(v.duration) : 0)}</span>
        </div>
        ${statusHtml}
      </div>
    `;
    listEl.appendChild(div);
  });

  // تحديث العنوان الرئيسي
  document.getElementById('video-details-title').textContent = state.videosList[state.currentVideoIndex]?.title || '';
}

async function playVideo(index) {
  if (index < 0 || index >= state.videosList.length) return;
  state.currentVideoIndex = index;
  const videoData = state.videosList[index];
  const videoId = videoData.id;
  const title = videoData.title;

  // تحديث القائمة الجانبية
  buildSidebar();

  const status = document.getElementById("player-status"); 
  status.querySelector('span').textContent = "جاري فتح الجلسة..."; 
  status.classList.remove("hidden"); 
  stopPlayback();
  
  document.getElementById("center-play-icon").classList.remove("hidden");
  document.getElementById("center-replay-icon").classList.add("hidden");
  
  try {
    // ... (كود فك التشفير والـ HLS زي ما هو بالظبط)
    var sess = await api("/api/video/"+videoId+"/play", {method:"POST"}); 
    var { token: tok, video_id: swId, heartbeat_url: hbUrl } = sess; 
    if(!tok||!swId) throw new Error("الجلسة ناقصة");
    
    status.querySelector('span').textContent = "فك التشفير..."; 
    if(!cryptoUtils) cryptoUtils = await loadPlayerScript();
    
    // ... (باقي الكود هنا)
    var mUrl = "/api/stream?path="+encodeURIComponent("videos/"+swId+"/stream/master.m3u8")+"&t="+encodeURIComponent(tok); 
    var mRes = await fetch(mUrl, { credentials: 'include' }); 
    if(!mRes.ok) throw new Error("master.m3u8 → HTTP "+mRes.status); 
    var mText = await mRes.text();
    var varRel = mText.split("\n").map(l=>l.trim()).find(l=>l&&l.charAt(0)!=="#"); 
    if(!varRel) throw new Error("مفيش variant");
    var varUrl, vBase="videos/"+swId+"/stream/", vFileUrl=null;
    if(varRel.indexOf("/api/stream")===0||varRel.indexOf("/api/cdn")===0){ varUrl=varRel; try{ var vu=new URL(varRel,location.origin); if(vu.pathname.indexOf("/api/stream")===0&&vu.searchParams.get("path")) vBase=vu.searchParams.get("path"); if(vu.pathname.indexOf("/api/cdn")===0&&vu.searchParams.get("u")) vFileUrl=fromB64url(vu.searchParams.get("u")); }catch(e){} } else if(varRel.indexOf("http")===0){ vFileUrl=varRel; varUrl="/api/cdn?u="+toB64url(varRel); } else { vBase="videos/"+swId+"/stream/"+varRel; varUrl="/api/stream?path="+encodeURIComponent(vBase)+"&t="+encodeURIComponent(tok); }
    var vRes = await fetch(varUrl, { credentials: 'include' }); if(!vRes.ok) throw new Error("variant → HTTP "+vRes.status); var vText = await vRes.text();
    status.querySelector('span').textContent = "فك المفتاح..."; var keyLine = vText.split("\n").find(l=>l.indexOf("EXT-X-KEY")!==-1); var keyPath = "videos/"+swId+"/key", ivHex=null;
    if(keyLine){ var km=keyLine.match(/URI="([^"]+)"/), ivm=keyLine.match(/IV=0x([0-9a-fA-F]+)/i); if(ivm) ivHex=ivm[1]; if(km){ var ku=km[1]; if(ku.indexOf("/api/stream")===0||ku.indexOf(location.origin+"/api/stream")===0){ try{var uu=new URL(ku,location.origin);var pp=uu.searchParams.get("path");if(pp)keyPath=pp;}catch(e){} } else if(ku.indexOf("http")!==0&&ku.indexOf("/api/cdn")!==0) keyPath=ku.replace(/^\//,"").replace(/^api\/v1\//,""); } }
    var kRes = await fetch("/api/stream?path="+encodeURIComponent(keyPath)+"&t="+encodeURIComponent(tok), { credentials: 'include' }); if(!kRes.ok) throw new Error("key → HTTP "+kRes.status); var wrapped = new Uint8Array(await kRes.arrayBuffer()); var kr = await cryptoUtils.decryptPlaybackKey(wrapped, swId); var aesKey = kr&&kr.key; if(!aesKey||aesKey.byteLength!==16) throw new Error("المفتاح غير صالح");
    var kb = aesKey instanceof ArrayBuffer ? aesKey : aesKey.buffer.slice(aesKey.byteOffset, aesKey.byteOffset+aesKey.byteLength); currentKeyBlobUrl = URL.createObjectURL(new Blob([kb], {type:"application/octet-stream"}));
    var fixed = rewritePlaylist(vText, tok, currentKeyBlobUrl, vBase, vFileUrl); if(fixed.indexOf("#EXTM3U")!==0) fixed="#EXTM3U\n"+fixed.replace(/^#EXTM3U\s*/m,""); if(fixed.indexOf("EXT-X-KEY")===-1){ var ivp=ivHex?",IV=0x"+ivHex:""; fixed='#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="'+currentKeyBlobUrl+'"'+ivp+"\n"+fixed.replace(/^#EXTM3U\s*/m,""); }
    currentPlaylistBlobUrl = URL.createObjectURL(new Blob([fixed], {type:"application/vnd.apple.mpegurl"})); status.querySelector('span').textContent = "جاري التشغيل...";
    hbTimer = setInterval(()=>{ fetch("/api/heartbeat",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include", body:JSON.stringify({url:hbUrl,token:tok})}).catch(()=>{}); }, 25000);
    
    if(window.Hls && Hls.isSupported()){
      hls = new Hls({enableWorker:false, maxBufferLength:30, maxMaxBufferLength:60}); hls.loadSource(currentPlaylistBlobUrl); hls.attachMedia(videoEl);
      hls.on(Hls.Events.MANIFEST_PARSED, (event, data)=>{ 
        status.classList.add("hidden"); 
        buildQualityMenu(data.levels); 
        
        const savedSpeed = localStorage.getItem("coursatk_speed");
        if (savedSpeed) { setSpeed(parseFloat(savedSpeed)); }

        const savedTime = localStorage.getItem(getStorageKey(videoId));
        if (savedTime && parseFloat(savedTime) > 2) {
          videoEl.currentTime = parseFloat(savedTime);
        }
        
        videoEl.play().catch(()=>{ centerPlayBtn.classList.remove('hidden'); });
      });
      hls.on(Hls.Events.ERROR, (_, data)=>{ if(!data.fatal) return; status.querySelector('span').textContent = "خطأ HLS: "+data.type; status.classList.remove('hidden'); });
    } else { videoEl.src = currentPlaylistBlobUrl; videoEl.play(); }
  } catch(e) { status.querySelector('span').textContent = "فشل: "+e.message; status.classList.remove('hidden'); }
}

function playNextVideo() { if (state.currentVideoIndex < state.videosList.length - 1) playVideo(state.currentVideoIndex + 1); }
function playPrevVideo() { if (state.currentVideoIndex > 0) playVideo(state.currentVideoIndex - 1); }

// ... (باقي الكود زي buildQualityMenu, toggleDropdown, إلخ.. والمستمعين بتوع الأحداث.. هتحطهم زي ما هما من الرد اللي فات)
