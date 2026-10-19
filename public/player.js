(function(){
'use strict';

const qs = new URLSearchParams(location.search);
const lectureId = qs.get('lectureId');
const initialVideoId = qs.get('videoId');
const $ = id => document.getElementById(id);
const video = $('video');
const screenEl = $('custom-player');

let videos = [], current = -1, hls = null, hbTimer = null, ready = false;
let saveTimer = null;

/* Helpers */
function formatTime(sec) {
  if (isNaN(sec) || sec < 0) return '00:00';
  const t = Math.floor(sec); const h = Math.floor(t / 3600); const m = Math.floor((t % 3600) / 60); const s = t % 60;
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
function getStorageKey(id) { return 'cstk_video_' + id; }

async function api(path, opts = {}) {
  const res = await fetch(path, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch (e) { data = text; }
  if (!res.ok || data.success === false) throw new Error(data.error || data.message || "HTTP " + res.status);
  return data.data !== undefined ? data.data : data;
}

/* UI */
const togglePlay = () => { if (video.paused) video.play(); else video.pause(); };

$('playBtn').addEventListener('click', togglePlay);
$('bigPlay').addEventListener('click', togglePlay);

video.addEventListener('play', () => {
  $('playIcon').style.display = 'none';
  $('pauseIcon').style.display = 'block';
  $('bigPlay').classList.add('hidden');
  screenEl.classList.remove('paused');
});
video.addEventListener('pause', () => {
  $('playIcon').style.display = 'block';
  $('pauseIcon').style.display = 'none';
  $('bigPlay').classList.remove('hidden');
  screenEl.classList.add('paused');
});

video.addEventListener('timeupdate', () => {
  if (!video.duration) return;
  const pct = (video.currentTime / video.duration) * 100;
  $('progressFilled').style.width = pct + '%';
  $('time-display').textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
  
  if (!saveTimer) {
    saveTimer = setTimeout(() => {
      if (video.currentTime > 0 && current >= 0) {
        localStorage.setItem(getStorageKey(videos[current].id), video.currentTime);
      }
      saveTimer = null;
    }, 2000);
  }
});

video.addEventListener('loadedmetadata', () => {
  $('time-display').textContent = `00:00 / ${formatTime(video.duration)}`;
});

$('progressBar').addEventListener('click', (e) => {
  const rect = $('progressBar').getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  video.currentTime = pct * video.duration;
});

$('muteBtn').addEventListener('click', () => {
  video.muted = !video.muted;
  $('volumeIcon').style.opacity = video.muted ? '0.5' : '1';
});

$('volumeSlider').addEventListener('input', (e) => {
  video.volume = e.target.value;
  video.muted = e.target.value == 0;
});

$('fullscreenBtn').addEventListener('click', () => {
  if (!document.fullscreenElement) screenEl.requestFullscreen?.();
  else document.exitFullscreen?.();
});

/* Gestures */
let pressTimer, isLongPress = false, speedBeforeHold = 1;
const clickLayer = $('click-layer');

clickLayer.addEventListener('mousedown', startPress);
clickLayer.addEventListener('touchstart', startPress, { passive: true });
clickLayer.addEventListener('mouseup', endPress);
clickLayer.addEventListener('mouseleave', endPress);
clickLayer.addEventListener('touchend', endPress);
clickLayer.addEventListener('touchcancel', endPress);

function startPress() {
  isLongPress = false;
  if (video.paused) return;
  pressTimer = setTimeout(() => {
    isLongPress = true;
    speedBeforeHold = video.playbackRate;
    video.playbackRate = 2;
  }, 400);
}
function endPress() {
  clearTimeout(pressTimer);
  if (isLongPress) {
    video.playbackRate = speedBeforeHold;
    isLongPress = false;
  }
}

clickLayer.addEventListener('dblclick', (e) => {
  if (isLongPress) return;
  const rect = screenEl.getBoundingClientRect();
  const x = e.clientX - rect.left;
  if (x > rect.width * 0.65) video.currentTime += 10;
  else if (x < rect.width * 0.35) video.currentTime -= 10;
});

/* Show Controls */
let hideTimeout;
screenEl.addEventListener('mousemove', () => {
  screenEl.classList.add('show-controls');
  clearTimeout(hideTimeout);
  hideTimeout = setTimeout(() => {
    if (!video.paused) screenEl.classList.remove('show-controls');
  }, 3000);
});
screenEl.addEventListener('touchstart', () => {
  screenEl.classList.add('show-controls');
  clearTimeout(hideTimeout);
  hideTimeout = setTimeout(() => {
    if (!video.paused) screenEl.classList.remove('show-controls');
  }, 3000);
}, { passive: true });

/* Play Video */
async function playVideo(index) {
  if (index < 0 || index >= videos.length) return;
  current = index;
  const videoData = videos[index];
  const videoId = videoData.id;
  
  $('video-title').textContent = videoData.title;
  $('loader').classList.add('show');
  
  if (hls) { hls.destroy(); hls = null; }
  video.pause(); video.removeAttribute('src'); video.load();
  
  try {
    const sess = await api("/api/video/" + videoId + "/play", { method: "POST" });
    const tok = sess.token || sess.session_token;
    const swId = sess.video_id;
    const hbUrl = sess.heartbeat_url;
    
    if (!tok || !swId) throw new Error("الجلسة ناقصة");
    
    const mUrl = "/api/stream?path=" + encodeURIComponent("videos/" + swId + "/stream/master.m3u8") + "&t=" + encodeURIComponent(tok);
    const mRes = await fetch(mUrl);
    const mText = await mRes.text();
    const varRel = mText.split("\n").map(l => l.trim()).find(l => l && l.charAt(0) !== "#");
    if (!varRel) throw new Error("مفيش variant");
    
    const vBase = "videos/" + swId + "/stream/" + varRel;
    const varUrl = "/api/stream?path=" + encodeURIComponent(vBase) + "&t=" + encodeURIComponent(tok);
    
    if (window.Hls && Hls.isSupported()) {
      hls = new Hls({ enableWorker: false });
      hls.loadSource(varUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        $('loader').classList.remove('show');
        const savedTime = localStorage.getItem(getStorageKey(videoId));
        if (savedTime && parseFloat(savedTime) > 2) video.currentTime = parseFloat(savedTime);
        video.play().catch(() => {});
      });
    } else {
      video.src = varUrl;
      video.addEventListener('loadedmetadata', () => {
        $('loader').classList.remove('show');
        const savedTime = localStorage.getItem(getStorageKey(videoId));
        if (savedTime && parseFloat(savedTime) > 2) video.currentTime = parseFloat(savedTime);
        video.play().catch(() => {});
      }, { once: true });
    }
    
    hbTimer = setInterval(() => {
      fetch("/api/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: hbUrl, token: tok })
      }).catch(() => {});
    }, 25000);
    
  } catch (e) {
    $('loader').classList.remove('show');
    alert("خطأ: " + e.message);
  }
}

/* Init */
async function init() {
  try {
    const content = await api("/api/lectures/" + lectureId + "/content");
    videos = content.videos || (Array.isArray(content) ? content : []);
    if (!videos.length) { alert("لا توجد فيديوهات"); return; }
    let idx = videos.findIndex(v => String(v.id) === String(initialVideoId));
    if (idx < 0) idx = 0;
    await playVideo(idx);
  } catch (e) {
    alert("خطأ: " + e.message);
  }
}
init();

})();
