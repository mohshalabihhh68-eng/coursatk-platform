(function(){
'use strict';

const qs = new URLSearchParams(location.search);
const lectureId = qs.get('lectureId');
const initialVideoId = qs.get('videoId');
const $ = id => document.getElementById(id);
const video = $('video');
const overlay = $('overlay');
const errorOverlay = $('errorOverlay');
const errorText = $('errorText');

let videos = [];
let current = -1;
let hls = null;
let hbTimer = null;
let saveInterval = null;
let ready = false;

// ==================== API Helper ====================
async function api(path, opts = {}) {
  try {
    const res = await fetch(path, opts);
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch(e) { data = text; }
    if (!res.ok || data.success === false) {
      throw new Error(data.error || data.message || "HTTP " + res.status);
    }
    return data.data !== undefined ? data.data : data;
  } catch (e) {
    console.error("API Error:", path, e);
    throw e;
  }
}

// ==================== Storage ====================
function getProgressKey(id) { return 'cstk_w_' + id; }
function getProgress(id) {
  try { return JSON.parse(localStorage.getItem(getProgressKey(id)) || 'null'); }
  catch(e) { return null; }
}
function saveProgress() {
  if (current < 0 || !ready) return;
  const v = videos[current];
  if (!v) return;
  const dur = video.duration || 0;
  const t = video.currentTime || 0;
  const pct = dur ? Math.min(100, Math.round((t / dur) * 100)) : 0;
  try {
    localStorage.setItem(getProgressKey(v.id), JSON.stringify({
      videoId: String(v.id),
      title: v.title,
      currentTime: t,
      duration: dur,
      percent: pct,
      watched: pct >= 90,
      updatedAt: Date.now()
    }));
    $('saveStatus').textContent = '✅ محفوظ';
    setTimeout(() => { $('saveStatus').textContent = ''; }, 2000);
  } catch(e) {}
}

// ==================== UI ====================
function showLoading(msg = 'جاري تجهيز الفيديو...') {
  overlay.classList.remove('hidden');
  overlay.innerHTML = `<div style="text-align:center;">
    <div class="spinner"></div>
    ${msg}
  </div>`;
}
function hideLoading() { overlay.classList.add('hidden'); }
function showError(msg) {
  hideLoading();
  errorText.textContent = msg || 'حصل خطأ أثناء تشغيل الفيديو';
  errorOverlay.classList.remove('hidden');
}
function hideError() { errorOverlay.classList.add('hidden'); }

function formatTime(sec) {
  if (isNaN(sec) || sec < 0) return '00:00';
  const t = Math.floor(sec);
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function skip(seconds) {
  if (!video.duration) return;
  video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
}

function changeSpeed(val) {
  video.playbackRate = parseFloat(val);
}

// ==================== Playlist ====================
function renderPlaylist() {
  const container = $('playlist');
  if (!videos.length) {
    container.innerHTML = '<div style="color:var(--muted); padding:20px; text-align:center;">لا توجد فيديوهات</div>';
    return;
  }
  container.innerHTML = videos.map((v, i) => {
    const prog = getProgress(v.id);
    const isDone = prog && (prog.watched || prog.percent >= 90);
    const isActive = i === current;
    return `
      <div class="playlist-item ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}" onclick="playVideoByIndex(${i})">
        <div class="playlist-num">${isDone ? '✓' : i + 1}</div>
        <div class="playlist-info">
          <div class="playlist-title">${escape(v.title)}</div>
          <div class="playlist-meta">${v.duration ? formatTime(v.duration) : '—'} ${isDone ? '· مكتمل' : ''}</div>
        </div>
      </div>
    `;
  }).join('');
}

// ==================== Play Video ====================
async function playVideoByIndex(index) {
  if (index < 0 || index >= videos.length) return;
  saveProgress();
  
  current = index;
  const v = videos[index];
  ready = false;
  hideError();
  showLoading('جاري تجهيز الفيديو...');
  
  // تنظيف المشغل القديم
  if (hls) { hls.destroy(); hls = null; }
  video.pause();
  video.removeAttribute('src');
  video.load();
  
  $('videoTitle').textContent = v.title || 'فيديو';
  $('lectureName').textContent = window._lectureName || '';
  
  renderPlaylist();
  
  try {
    // جلب جلسة التشغيل من السيرفر بتاعك
    const session = await api('/api/video/' + v.id + '/play', { method: 'POST' });
    const tok = session.token || session.session_token;
    const swId = session.video_id;
    const hbUrl = session.heartbeat_url;
    
    if (!tok || !swId) throw new Error('جلسة التشغيل ناقصة');
    
    // جلب الـ master playlist
    const masterUrl = '/api/stream?path=' + encodeURIComponent('videos/' + swId + '/stream/master.m3u8') + '&t=' + encodeURIComponent(tok);
    const masterRes = await fetch(masterUrl);
    if (!masterRes.ok) throw new Error('فشل تحميل master playlist');
    const masterText = await masterRes.text();
    
    // استخراج variant
    const variantRel = masterText.split('\n').map(l => l.trim()).find(l => l && l.charAt(0) !== '#');
    if (!variantRel) throw new Error('مفيش variant');
    
    const variantBasePath = 'videos/' + swId + '/stream/' + variantRel;
    const variantUrl = '/api/stream?path=' + encodeURIComponent(variantBasePath) + '&t=' + encodeURIComponent(tok);
    
    // قراءة التقدم المحفوظ
    const saved = getProgress(v.id);
    const resumeAt = saved && saved.currentTime > 2 && !saved.watched ? saved.currentTime : 0;
    
    // تشغيل الـ HLS
    if (window.Hls && Hls.isSupported()) {
      hls = new Hls({ enableWorker: false, maxBufferLength: 30 });
      hls.loadSource(variantUrl);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        hideLoading();
        ready = true;
        if (resumeAt > 0) {
          video.currentTime = resumeAt;
          console.log('تم الاستئناف من:', formatTime(resumeAt));
        }
        video.play().catch(() => {});
      });
      
      hls.on(Hls.Events.ERROR, (e, data) => {
        if (!data.fatal) return;
        showError('خطأ في تحميل الفيديو: ' + data.type);
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = variantUrl;
      video.addEventListener('loadedmetadata', () => {
        hideLoading();
        ready = true;
        if (resumeAt > 0) video.currentTime = resumeAt;
        video.play().catch(() => {});
      }, { once: true });
    } else {
      throw new Error('المتصفح لا يدعم HLS');
    }
    
    // heartbeat
    if (hbUrl) {
      if (hbTimer) clearInterval(hbTimer);
      hbTimer = setInterval(() => {
        fetch('/api/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: hbUrl, token: tok })
        }).catch(() => {});
      }, 25000);
    }
    
  } catch (e) {
    showError(e.message || 'فشل تشغيل الفيديو');
  }
}

// ==================== Save Progress ====================
function startSaveInterval() {
  if (saveInterval) clearInterval(saveInterval);
  saveInterval = setInterval(() => {
    if (!video.paused && ready) saveProgress();
  }, 5000);
}

video.addEventListener('play', () => {
  startSaveInterval();
});
video.addEventListener('pause', () => {
  saveProgress();
});
video.addEventListener('ended', () => {
  saveProgress();
  // الانتقال للتالي تلقائياً
  if (current < videos.length - 1) {
    setTimeout(() => playVideoByIndex(current + 1), 1500);
  }
});
video.addEventListener('loadedmetadata', () => {
  ready = true;
});

// حفظ قبل ما يقفل الصفحة
window.addEventListener('beforeunload', () => {
  saveProgress();
});

// ==================== Helpers ====================
function escape(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// expose للـ onclick
window.playVideoByIndex = playVideoByIndex;
window.skip = skip;
window.changeSpeed = changeSpeed;

// ==================== Init ====================
async function init() {
  if (!localStorage.getItem('cstk_tok')) {
    window.location.href = 'index.html';
    return;
  }
  
  if (!lectureId) {
    showError('رابط المشغل ناقص رقم المحاضرة');
    return;
  }
  
  try {
    const data = await api('/api/lectures/' + lectureId + '/content');
    videos = data.videos || (Array.isArray(data) ? data : []);
    window._lectureName = data.lecture?.name || data.name || 'المحاضرة';
    
    if (!videos.length) {
      showError('لا توجد فيديوهات في المحاضرة دي');
      return;
    }
    
    // ابحث عن الفيديو المطلوب
    let idx = videos.findIndex(v => String(v.id) === String(initialVideoId));
    if (idx < 0) idx = 0;
    
    await playVideoByIndex(idx);
    
  } catch (e) {
    showError(e.message || 'فشل تحميل المحاضرة');
  }
}

init();

})();
