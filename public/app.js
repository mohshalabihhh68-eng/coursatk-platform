// ==================== State ====================
const state = { view: "years", year: null, subject: null, teacher: null, chapter: null, lecture: null };
let hls = null;
let hbTimer = null;
let cryptoUtils = null;
let currentKeyBlobUrl = null;
let currentPlaylistBlobUrl = null;

const appEl = document.getElementById("app");
const videoEl = document.getElementById("video");
const playerContainer = document.getElementById("custom-player");

// ... (باقي دوال الـ API والـ render بتاعتك زي ما هي من الملف اللي فوق) ...
// (استكمل باقي الـ renderYears و renderSubjects وخلافه من الرد السابق)

// ==================== Custom Player Logic ====================

// إظهار/إخفاء القوائم
function toggleDropdown(id) {
  document.querySelectorAll('.dropdown-content').forEach(el => {
    if (el.id !== id) el.classList.add('hidden');
  });
  document.getElementById(id).classList.toggle('hidden');
}
// إغلاق القوائم لو ضغطت في أي حتة تانية
document.addEventListener('click', (e) => {
  if (!e.target.closest('.dropdown')) {
    document.querySelectorAll('.dropdown-content').forEach(el => el.classList.add('hidden'));
  }
});

// تشغيل / إيقاف
function togglePlay() {
  if (videoEl.paused) {
    videoEl.play();
  } else {
    videoEl.pause();
  }
}

// تحديث أيقونات التشغيل
videoEl.addEventListener('play', () => {
  document.getElementById('play-icon').classList.add('hidden');
  document.getElementById('pause-icon').classList.remove('hidden');
  document.getElementById('big-play-btn').classList.add('hidden');
  playerContainer.classList.remove('paused');
});
videoEl.addEventListener('pause', () => {
  document.getElementById('play-icon').classList.remove('hidden');
  document.getElementById('pause-icon').classList.add('hidden');
  document.getElementById('big-play-btn').classList.remove('hidden');
  playerContainer.classList.add('paused');
});

// تقديم وتأخير
function skipTime(seconds) {
  videoEl.currentTime += seconds;
}

// تغيير السرعة
function setSpeed(speed) {
  videoEl.playbackRate = speed;
  document.querySelector('#speed-menu').previousElementSibling.textContent = speed === 1 ? '1x' : speed + 'x';
  document.querySelectorAll('#speed-menu button').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('speed-menu').classList.add('hidden');
}

// تغيير الجودة (HLS)
function setQuality(levelIndex) {
  if (hls) {
    hls.currentLevel = levelIndex;
    // تحديث النص اللي على الزرار
    const text = levelIndex === -1 ? 'تلقائي' : hls.levels[levelIndex].height + 'p';
    document.getElementById('quality-btn').textContent = text;
    document.querySelectorAll('#quality-menu button').forEach(b => b.classList.remove('active'));
    if (event) event.target.classList.add('active');
    document.getElementById('quality-menu').classList.add('hidden');
  }
}

// شريط التقدم
function formatTime(sec) {
  if (isNaN(sec)) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
videoEl.addEventListener('timeupdate', () => {
  if (videoEl.duration) {
    const pct = (videoEl.currentTime / videoEl.duration) * 100;
    document.getElementById('progress-filled').style.width = pct + '%';
    document.getElementById('progress-handle').style.left = pct + '%'; // RTL flex fix
    // في الـ RTL بنعكس الاتجاه
    document.getElementById('progress-filled').style.right = '0';
    document.getElementById('progress-filled').style.left = 'auto';
    document.getElementById('progress-handle').style.left = (100 - pct) + '%';
    
    document.getElementById('time-display').textContent = `${formatTime(videoEl.currentTime)} / ${formatTime(videoEl.duration)}`;
  }
});
videoEl.addEventListener('loadedmetadata', () => {
  document.getElementById('time-display').textContent = `00:00 / ${formatTime(videoEl.duration)}`;
});

function seekVideo(e) {
  const bar = document.getElementById('progress-bar');
  const rect = bar.getBoundingClientRect();
  // حساب النسبة بناءً على اتجاه الشاشة (RTL)
  const clickX = e.clientX - rect.left;
  let pct = clickX / rect.width;
  if (document.dir === 'rtl') pct = 1 - pct; // عكس الحسبة
  if (videoEl.duration) videoEl.currentTime = pct * videoEl.duration;
}

// الصوت
function toggleMute() {
  videoEl.muted = !videoEl.muted;
  document.getElementById('vol-icon').style.opacity = videoEl.muted ? '0.5' : '1';
}
document.getElementById('volume-slider').addEventListener('input', (e) => {
  videoEl.volume = e.target.value;
  videoEl.muted = e.target.value == 0;
});

// ملء الشاشة
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    playerContainer.requestFullscreen().catch(err => console.log(err));
  } else {
    document.exitFullscreen();
  }
}

// ==================== التعديل في دالة playVideo ====================
// هنغيرها عشان نملأ قائمة الجودة لما الفيديو يشتغل
async function playVideo(videoId, title) {
  document.getElementById("player-title").textContent = title;
  document.getElementById("player-modal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  
  const status = document.getElementById("player-status");
  status.querySelector('span').textContent = "جاري فتح الجلسة...";
  status.classList.remove("hidden");
  document.getElementById('big-play-btn').classList.add('hidden');
  
  stopPlayback();

  try {
    var session = await api("/api/video/" + videoId + "/play", { method: "POST" });
    var streamToken = session.token, swVideoId = session.video_id, hbUrl = session.heartbeat_url;

    if (!streamToken || !swVideoId) throw new Error("الجلسة ناقصة");

    status.querySelector('span').textContent = "فك التشفير...";
    if (!cryptoUtils) cryptoUtils = await loadPlayerScript();

    // ... (نفس كود جلب الماستر والـ variant والمفتاح زي ملفك الأصلي) ...
    // (افترض إنك حطيت كود الـ fetch والـ decrypt هنا، لغاية ما توصل للـ playlistBlobUrl)

    // ======== بعد ما تعمل rewrite للـ playlist ========
    status.querySelector('span').textContent = "جاري التشغيل...";
    
    hbTimer = setInterval(function () {
      fetch("/api/heartbeat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: hbUrl, token: streamToken }) }).catch(function () {});
    }, 25000);

    if (window.Hls && Hls.isSupported()) {
      hls = new Hls({ enableWorker: false, maxBufferLength: 30, maxMaxBufferLength: 60 });
      hls.loadSource(currentPlaylistBlobUrl);
      hls.attachMedia(videoEl);
      
      hls.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
        status.classList.add("hidden");
        
        // ملء قائمة الجودة
        const qMenu = document.getElementById('quality-menu');
        qMenu.innerHTML = `<button onclick="setQuality(-1)" class="active">تلقائي</button>`;
        data.levels.forEach((level, i) => {
          qMenu.innerHTML += `<button onclick="setQuality(${i})">${level.height}p</button>`;
        });
        
        videoEl.play().catch(() => {
          document.getElementById('big-play-btn').classList.remove('hidden');
        });
      });

      hls.on(Hls.Events.ERROR, function (_, data) {
        if (!data.fatal) return;
        status.querySelector('span').textContent = "خطأ HLS: " + data.type;
        status.classList.remove("hidden");
      });
    } else {
      // لو المتصفح بيدعم HLS أصلاً (زي سفاري)
      videoEl.src = currentPlaylistBlobUrl;
      videoEl.play();
    }

  } catch (e) {
    status.querySelector('span').textContent = "فشل: " + e.message;
  }
}

// تعديل دالة إغلاق المشغل عشان توقف الفيديو وتخفيه
function closePlayer() {
  stopPlayback();
  document.getElementById("player-modal").classList.add("hidden");
  document.body.style.overflow = "";
  document.getElementById('quality-menu').classList.add('hidden');
  document.getElementById('speed-menu').classList.add('hidden');
  document.getElementById('big-play-btn').classList.add('hidden');
}

// تشغيل التطبيق
loadPlayerScript().then(c => cryptoUtils = c).catch(() => {});
render();
