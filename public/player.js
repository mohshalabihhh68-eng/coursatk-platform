// ==================== Player Core Logic ====================
let hls = null; let hbTimer = null; let cryptoUtils = null; let currentKeyBlobUrl = null; let currentPlaylistBlobUrl = null;

function findCrypto() { if (window.DecryptionUtils && typeof window.DecryptionUtils.decryptPlaybackKey === "function") return window.DecryptionUtils; for (var n of Object.getOwnPropertyNames(window)) { try { var o = window[n]; if (o && typeof o === "object" && typeof o.decryptPlaybackKey === "function") return o; } catch(e){} } return null; }
function loadPlayerScript() { return new Promise((resolve, reject) => { if (findCrypto()) return resolve(findCrypto()); var ex = document.querySelector('script[src*="player.stream-weave.com"]'); if (ex) { var tries=0, t=setInterval(()=>{ var c=findCrypto(); if(c){clearInterval(t);resolve(c);} else if(++tries>40){clearInterval(t);reject(new Error("timeout"));} },150); return; } var s=document.createElement("script"); s.src="https://player.stream-weave.com/assets/player.js?v=1.1.1"; s.onload=()=>{ var tries=0, t=setInterval(()=>{ var c=findCrypto(); if(c){clearInterval(t);resolve(c);} else if(++tries>40){clearInterval(t);reject(new Error("not found"));} },150); }; s.onerror=()=>reject(new Error("failed")); document.head.appendChild(s); }); }
function toB64url(str){ return btoa(unescape(encodeURIComponent(str))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,""); }
function fromB64url(v){ var s=String(v).replace(/-/g,"+").replace(/_/g,"/"); while(s.length%4)s+="="; return decodeURIComponent(escape(atob(s))); }
function joinRel(base, rel) { var q="", rp=String(rel), qi=rp.indexOf("?"); if(qi!==-1){q=rp.slice(qi);rp=rp.slice(0,qi);} var st=String(base||"").split("/"); if(st.length&&st[st.length-1]!==""&&/\.[a-z0-9]+$/i.test(st[st.length-1]))st.pop(); if(st.length&&st[st.length-1]==="")st.pop(); rp.split("/").forEach(p=>{if(!p||p===".")return; if(p==="..")st.pop(); else st.push(p);}); return st.join("/")+q; }
function resolveMedia(uri, vBase, tok, vFileUrl) { if(/^(blob:|data:)/i.test(uri)) return uri; if(uri.indexOf("/api/stream")===0||uri.indexOf("/api/cdn")===0) return location.origin+uri; if(/^https?:\/\//i.test(uri)) return location.origin+"/api/cdn?u="+toB64url(uri); if(vFileUrl){try{return location.origin+"/api/cdn?u="+toB64url(new URL(uri,vFileUrl).href);}catch(e){}} return location.origin+"/api/stream?path="+encodeURIComponent(joinRel(vBase||"",uri))+"&t="+encodeURIComponent(tok); }
function rewritePlaylist(text, tok, keyBlob, vBase, vFileUrl) { return text.split("\n").map(line=>{ var s=line.trim(); if(!s) return line; if(s.charAt(0)==="#"){ if(s.indexOf("#EXT-X-KEY:")===0&&keyBlob) return s.replace(/URI="[^"]+"/, 'URI="'+keyBlob+'"'); return s.replace(/URI="([^"]+)"/g,(_m,u)=>'URI="'+resolveMedia(u,vBase,tok,vFileUrl)+'"'); } return resolveMedia(s,vBase,tok,vFileUrl); }).join("\n"); }

function formatTime(sec) {
  if(isNaN(sec)||sec<0) return '00:00';
  const t = Math.floor(sec); const h = Math.floor(t/3600); const m = Math.floor((t%3600)/60); const s = t%60;
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// ==================== Player DOM Elements ====================
const videoEl = document.getElementById('video');
const playerContainer = document.getElementById('custom-player');
const clickLayer = document.getElementById('click-layer');
const bigPlayBtn = document.getElementById('bigPlay'); 

const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
let speedIndex = 2; 

function togglePlay() { if (videoEl.paused) videoEl.play(); else videoEl.pause(); }
function updatePlayUI() { 
  if (videoEl.paused) { 
    document.getElementById('playIcon').style.display = 'block'; 
    document.getElementById('pauseIcon').style.display = 'none'; 
    bigPlayBtn.classList.remove('hidden'); 
    playerContainer.classList.add('paused'); 
  } 
  else { 
    document.getElementById('playIcon').style.display = 'none'; 
    document.getElementById('pauseIcon').style.display = 'block'; 
    bigPlayBtn.classList.add('hidden'); 
    playerContainer.classList.remove('paused'); 
  } 
}
function updateProgress() { 
  const percent = (videoEl.currentTime / videoEl.duration) * 100 || 0; 
  document.getElementById('progressFilled').style.width = percent + '%'; 
  document.getElementById('currentTime').textContent = formatTime(videoEl.currentTime); 
}

// Player Events (ربط الأزرار الجديدة بالكود القديم)
bigPlayBtn.addEventListener('click', togglePlay);
document.getElementById('playBtn').addEventListener('click', togglePlay);
videoEl.addEventListener('play', updatePlayUI);
videoEl.addEventListener('pause', updatePlayUI);
videoEl.addEventListener('timeupdate', updateProgress);
videoEl.addEventListener('loadedmetadata', () => { document.getElementById('duration').textContent = formatTime(videoEl.duration); });
videoEl.addEventListener('waiting', () => document.getElementById('loader').classList.add('show'));
videoEl.addEventListener('playing', () => document.getElementById('loader').classList.remove('show'));

document.getElementById('progressBar').addEventListener('click', (e) => {
  const rect = document.getElementById('progressBar').getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;
  videoEl.currentTime = percent * videoEl.duration;
});

document.getElementById('muteBtn').addEventListener('click', () => {
  videoEl.muted = !videoEl.muted;
  document.getElementById('volumeIcon').style.display = videoEl.muted ? 'none' : 'block';
  document.getElementById('muteIcon').style.display = videoEl.muted ? 'block' : 'none';
});

document.getElementById('volumeSlider').addEventListener('input', (e) => {
  videoEl.volume = e.target.value;
  videoEl.muted = videoEl.volume === 0;
});

document.getElementById('speedBtn').addEventListener('click', () => {
  speedIndex = (speedIndex + 1) % speeds.length;
  videoEl.playbackRate = speeds[speedIndex];
  document.getElementById('speedBtn').textContent = speeds[speedIndex] + '×';
  localStorage.setItem("coursatk_speed", speeds[speedIndex]);
});

document.getElementById('fullscreenBtn').addEventListener('click', () => {
  if (!document.fullscreenElement) { playerContainer.requestFullscreen?.() || playerContainer.webkitRequestFullscreen?.(); } 
  else { document.exitFullscreen?.(); }
});

let hideControlsTimeout = null;
function showControls() { playerContainer.classList.add('show-controls'); clearTimeout(hideControlsTimeout); hideControlsTimeout = setTimeout(() => { if (!videoEl.paused) playerContainer.classList.remove('show-controls'); }, 3000); }
playerContainer.addEventListener('mousemove', showControls);
playerContainer.addEventListener('touchstart', showControls);

// ==================== 🔥 Gestures (Mobile Optimized) 🔥 ====================
let pressTimer = null; let isLongPress = false; let speedBeforeHold = 1;
function startPress(e) {
  isLongPress = false;
  if (videoEl.paused) return; 
  pressTimer = setTimeout(() => {
    isLongPress = true;
    speedBeforeHold = videoEl.playbackRate;
    videoEl.playbackRate = 2;
    if (navigator.vibrate) navigator.vibrate(50);
  }, 300);
}
function endPress(e) {
  clearTimeout(pressTimer);
  if (isLongPress) {
    videoEl.playbackRate = speedBeforeHold;
    isLongPress = false;
  }
}
clickLayer.addEventListener('mousedown', startPress);
clickLayer.addEventListener('touchstart', startPress, {passive: true});
clickLayer.addEventListener('mouseup', endPress);
clickLayer.addEventListener('mouseleave', endPress);
clickLayer.addEventListener('touchend', endPress);
clickLayer.addEventListener('touchcancel', endPress);

clickLayer.addEventListener('click', (e) => {
  if (isLongPress) return; 
  if (playerContainer.classList.contains('show-controls')) {
    clearTimeout(hideControlsTimeout);
    playerContainer.classList.remove('show-controls');
  } else {
    showControls();
  }
});

clickLayer.addEventListener('dblclick', (e) => {
  if (isLongPress) return;
  const rect = playerContainer.getBoundingClientRect(); 
  const relativeX = e.clientX - rect.left; 
  const width = rect.width;
  if (relativeX > width * 0.65) { videoEl.currentTime += 10; } 
  else if (relativeX < width * 0.35) { videoEl.currentTime -= 10; } 
  else { togglePlay(); }
});

// ==================== Play Page Logic ====================
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
  renderContent(); 
}

function buildSidebar() {
  const listEl = document.getElementById('side-videos-list');
  listEl.innerHTML = '';
  
  let watched = 0;
  state.videosList.forEach(v => { if(isWatched(v.id)) watched++; });
  
  document.getElementById('video-count-tag').textContent = `${state.videosList.length} فيديو`;
  document.getElementById('watched-count-tag').textContent = `${watched} تمت مشاهدته`;
  document.getElementById('side-subtitle').textContent = `${state.videosList.length} فيديو`;
  document.getElementById('video-details-title').textContent = state.videosList[state.currentVideoIndex]?.title || '';

  state.videosList.forEach((v, i) => {
    const isCurrent = i === state.currentVideoIndex;
    const watchedFlag = isWatched(v.id);
    const savedTime = localStorage.getItem(getStorageKey(v.id));
    
    let statusHtml = '';
    if (isCurrent) statusHtml = `<div class="side-status"><span style="color:#ff6b00;">▶ يعمل الآن</span></div>`;
    else if (watchedFlag) statusHtml = `<div class="side-status"><span class="check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> مكتمل</span></div>`;
    else if (savedTime && parseFloat(savedTime) > 2) statusHtml = `<div class="side-status">⏱ باقي ${formatTime((parseInt(v.duration)||0) - parseFloat(savedTime))}</div>`;
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
}

async function playVideo(index) {
  if (index < 0 || index >= state.videosList.length) return;
  state.currentVideoIndex = index;
  const videoData = state.videosList[index];
  const videoId = videoData.id;

  buildSidebar(); 
  document.getElementById('loader').classList.add('show');
  stopPlayback();
  
  try {
    var sess = await api("/api/video/"+videoId+"/play", {method:"POST"}); 
    var { token: tok, video_id: swId, heartbeat_url: hbUrl } = sess; 
    if(!tok||!swId) throw new Error("الجلسة ناقصة");
    
    if(!cryptoUtils) cryptoUtils = await loadPlayerScript();
    
    var mUrl = "/api/stream?path="+encodeURIComponent("videos/"+swId+"/stream/master.m3u8")+"&t="+encodeURIComponent(tok); 
    var mRes = await fetch(mUrl, { credentials: 'include' }); 
    if(!mRes.ok) throw new Error("master.m3u8 → HTTP "+mRes.status); 
    var mText = await mRes.text();
    var varRel = mText.split("\n").map(l=>l.trim()).find(l=>l&&l.charAt(0)!=="#"); 
    if(!varRel) throw new Error("مفيش variant");
    var varUrl, vBase="videos/"+swId+"/stream/", vFileUrl=null;
    if(varRel.indexOf("/api/stream")===0||varRel.indexOf("/api/cdn")===0){ varUrl=varRel; try{ var vu=new URL(varRel,location.origin); if(vu.pathname.indexOf("/api/stream")===0&&vu.searchParams.get("path")) vBase=vu.searchParams.get("path"); if(vu.pathname.indexOf("/api/cdn")===0&&vu.searchParams.get("u")) vFileUrl=fromB64url(vu.searchParams.get("u")); }catch(e){} } else if(varRel.indexOf("http")===0){ vFileUrl=varRel; varUrl="/api/cdn?u="+toB64url(varRel); } else { vBase="videos/"+swId+"/stream/"+varRel; varUrl="/api/stream?path="+encodeURIComponent(vBase)+"&t="+encodeURIComponent(tok); }
    var vRes = await fetch(varUrl, { credentials: 'include' }); if(!vRes.ok) throw new Error("variant → HTTP "+vRes.status); var vText = await vRes.text();
    var keyLine = vText.split("\n").find(l=>l.indexOf("EXT-X-KEY")!==-1); var keyPath = "videos/"+swId+"/key", ivHex=null;
    if(keyLine){ var km=keyLine.match(/URI="([^"]+)"/), ivm=keyLine.match(/IV=0x([0-9a-fA-F]+)/i); if(ivm) ivHex=ivm[1]; if(km){ var ku=km[1]; if(ku.indexOf("/api/stream")===0||ku.indexOf(location.origin+"/api/stream")===0){ try{var uu=new URL(ku,location.origin);var pp=uu.searchParams.get("path");if(pp)keyPath=pp;}catch(e){} } else if(ku.indexOf("http")!==0&&ku.indexOf("/api/cdn")!==0) keyPath=ku.replace(/^\//,"").replace(/^api\/v1\//,""); } }
    var kRes = await fetch("/api/stream?path="+encodeURIComponent(keyPath)+"&t="+encodeURIComponent(tok), { credentials: 'include' }); if(!kRes.ok) throw new Error("key → HTTP "+kRes.status); var wrapped = new Uint8Array(await kRes.arrayBuffer()); var kr = await cryptoUtils.decryptPlaybackKey(wrapped, swId); var aesKey = kr&&kr.key; if(!aesKey||aesKey.byteLength!==16) throw new Error("المفتاح غير صالح");
    var kb = aesKey instanceof ArrayBuffer ? aesKey : aesKey.buffer.slice(aesKey.byteOffset, aesKey.byteOffset+aesKey.byteLength); currentKeyBlobUrl = URL.createObjectURL(new Blob([kb], {type:"application/octet-stream"}));
    var fixed = rewritePlaylist(vText, tok, currentKeyBlobUrl, vBase, vFileUrl); if(fixed.indexOf("#EXTM3U")!==0) fixed="#EXTM3U\n"+fixed.replace(/^#EXTM3U\s*/m,""); if(fixed.indexOf("EXT-X-KEY")===-1){ var ivp=ivHex?",IV=0x"+ivHex:""; fixed='#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="'+currentKeyBlobUrl+'"'+ivp+"\n"+fixed.replace(/^#EXTM3U\s*/m,""); }
    currentPlaylistBlobUrl = URL.createObjectURL(new Blob([fixed], {type:"application/vnd.apple.mpegurl"})); 
    hbTimer = setInterval(()=>{ fetch("/api/heartbeat",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include", body:JSON.stringify({url:hbUrl,token:tok})}).catch(()=>{}); }, 25000);
    
    if(window.Hls && Hls.isSupported()){
      hls = new Hls({enableWorker:false, maxBufferLength:30, maxMaxBufferLength:60}); hls.loadSource(currentPlaylistBlobUrl); hls.attachMedia(videoEl);
      hls.on(Hls.Events.MANIFEST_PARSED, (event, data)=>{ 
        document.getElementById('loader').classList.remove('show'); 
        buildQualityMenu(data.levels); 
        
        const savedSpeed = localStorage.getItem("coursatk_speed");
        if (savedSpeed) { videoEl.playbackRate = parseFloat(savedSpeed); document.getElementById('speedBtn').textContent = savedSpeed + '×'; }

        const savedTime = localStorage.getItem(getStorageKey(videoId));
        if (savedTime && parseFloat(savedTime) > 2) {
          videoEl.currentTime = parseFloat(savedTime);
        }
        
        videoEl.play().catch(()=>{});
      });
      hls.on(Hls.Events.ERROR, (_, data)=>{ if(!data.fatal) return; });
    } else { videoEl.src = currentPlaylistBlobUrl; videoEl.play(); }
  } catch(e) { document.getElementById('loader').classList.remove('show'); }
}

function playNextVideo() { if (state.currentVideoIndex < state.videosList.length - 1) playVideo(state.currentVideoIndex + 1); }
function playPrevVideo() { if (state.currentVideoIndex > 0) playVideo(state.currentVideoIndex - 1); }

function buildQualityMenu(levels) { const qMenu = document.getElementById('quality-menu'); const items = levels.map((l,i)=>({ index: i, height: l.height||0, bitrate: l.bitrate||0 })).sort((a,b)=> b.height!==a.height ? b.height-a.height : b.bitrate-a.bitrate); let html = `<button onclick="setQuality(-1,this)" class="active">تلقائي</button>`; items.forEach(item=>{ let label = item.height>0 ? item.height+"p" : (item.bitrate>0 ? Math.round(item.bitrate/1000)+"k" : "جودة "+(item.index+1)); html += `<button onclick="setQuality(${item.index},this)">${label}</button>`; }); qMenu.innerHTML = html; }

function toggleDropdown(id) { document.querySelectorAll('.dropdown-content').forEach(el=>{ if(el.id!==id) el.classList.add('hidden'); }); document.getElementById(id).classList.toggle('hidden'); }
document.addEventListener('click', e=>{ if(!e.target.closest('.dropdown')) document.querySelectorAll('.dropdown-content').forEach(el=>el.classList.add('hidden')); });

function setQuality(levelIndex, btn) { if(!hls) return; hls.currentLevel = levelIndex; let text = 'تلقائي'; if(levelIndex!==-1 && hls.levels[levelIndex]){ var l = hls.levels[levelIndex]; text = l.height>0 ? l.height+'p' : (l.bitrate>0 ? Math.round(l.bitrate/1000)+'k' : 'جودة '+(levelIndex+1)); } document.getElementById('qualityBtn').textContent = text; document.querySelectorAll('#quality-menu button').forEach(b=>b.classList.remove('active')); if(btn) btn.classList.add('active'); document.getElementById('quality-menu').classList.add('hidden'); }

let saveTimer = null;
videoEl.addEventListener('timeupdate', () => {
  if (!saveTimer && state.videosList[state.currentVideoIndex]) {
    saveTimer = setTimeout(() => {
      if (videoEl.currentTime > 0) localStorage.setItem(getStorageKey(state.videosList[state.currentVideoIndex].id), videoEl.currentTime);
      saveTimer = null;
    }, 2000);
  }
});

videoEl.addEventListener('ended', () => {
  if (state.videosList[state.currentVideoIndex]) {
    markAsWatched(state.videosList[state.currentVideoIndex].id);
    localStorage.removeItem(getStorageKey(state.videosList[state.currentVideoIndex].id));
    buildSidebar(); 
  }
});

function stopPlayback() { if(hbTimer){clearInterval(hbTimer);hbTimer=null;} if(hls){hls.destroy();hls=null;} if(currentKeyBlobUrl){URL.revokeObjectURL(currentKeyBlobUrl);currentKeyBlobUrl=null;} if(currentPlaylistBlobUrl){URL.revokeObjectURL(currentPlaylistBlobUrl);currentPlaylistBlobUrl=null;} videoEl.playbackRate = 1; videoEl.removeAttribute("src"); videoEl.load(); }
