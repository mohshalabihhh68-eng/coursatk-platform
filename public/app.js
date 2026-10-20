/* ==================== State ==================== */
const state = {
  view:"years", year:null, subject:null, teacher:null, chapter:null, lecture:null
};
let hls=null, hbTimer=null, cryptoUtils=null;
let currentKeyBlobUrl=null, currentPlaylistBlobUrl=null;

const appEl       = document.getElementById("app");
const videoEl     = document.getElementById("video");
const playerWrap  = document.getElementById("player-wrap");
const clickLayer  = document.getElementById("click-layer");

function ic(p,w){w=w||18;return`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="${w}" height="${w}">${p}</svg>`}

async function api(path,opts){
  opts=opts||{};
  const tok=(() => { try{return localStorage.getItem("cstk_tok")||sessionStorage.getItem("cstk_tok")||null}catch(_){return null} })();
  if(tok && !opts.noAuth){
    opts.headers=Object.assign({"Authorization":"Bearer "+tok}, opts.headers||{});
  }
  const res=await fetch(path,opts);
  const data=await res.json();
  if(!res.ok||data.success===false) throw new Error(data.error||data.message||"HTTP "+res.status);
  return data.data!==undefined?data.data:data;
}

function goHome(){
  Object.assign(state,{view:"years",year:null,subject:null,teacher:null,chapter:null,lecture:null});
  render(); window.scrollTo(0,0);
}
function setView(v,extra){ if(extra)Object.assign(state,extra); state.view=v; render(); window.scrollTo(0,0) }

async function render(){
  appEl.innerHTML=`<div class="loading-screen">
    <div class="spinner-ring"></div>
    <span style="color:var(--muted);font-size:13px;font-weight:700;margin-top:4px">جاري التحميل...</span>
  </div>`;
  try{
    if     (state.view==="years")    await renderYears();
    else if(state.view==="subjects") await renderSubjects();
    else if(state.view==="teachers") await renderTeachers();
    else if(state.view==="chapters") await renderChapters();
    else if(state.view==="lectures") await renderLectures();
    else if(state.view==="content")  await renderContent();
  }catch(e){
    appEl.innerHTML=`<div style="text-align:center;padding:70px 20px">
      <div style="font-size:42px;margin-bottom:12px">⚠️</div>
      <div style="color:var(--red);font-weight:900;font-size:16px;margin-bottom:8px">حصل خطأ</div>
      <div style="color:var(--muted);font-size:13px">${e.message}</div>
    </div>`;
  }
}

async function renderYears(){
  const years=await api("/api/years");
  let html=`<div class="page-head reveal">
    <div class="eyebrow"><span class="edot"></span> منصة ثانوية club</div>
    <h1>المواد الدراسية <span class="g">2027</span></h1>
    <p>اختار المادة وتابع محاضراتك مع أفضل المدرسين.</p>
  </div><div class="grid">`;
  years.forEach(y=>{
    html+=`<div class="card reveal" onclick='setView("subjects",${JSON.stringify({year:y})})'>
      <div class="card-thumb">
        <img src="${y.image_url||""}" onerror="this.style.display='none'" loading="lazy"/>
        <div class="card-thumb-overlay"></div>
        <span class="status-pill">● متاح</span>
      </div>
      <div class="card-body">
        <div class="card-meta">
          <div><div class="card-sub">2027</div><div class="card-title">${y.name}</div></div>
        </div>
        <div class="card-row"><span style="display:flex;align-items:center;gap:5px">${ic('<circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>')} آخر تحديث 2027</span><span>${ic('<path d="M8 5v14l11-7z"/>')} شاهد الآن</span></div>
        <button class="btn btn-primary" style="width:100%">عرض المدرسين ${ic('<path d="M15 18l-6-6 6-6"/>')}</button>
      </div>
    </div>`;
  });
  appEl.innerHTML=html+"</div>"; _observe();
}

async function renderSubjects(){
  const subs=await api("/api/subjects/"+state.year.id);
  let html=`<div class="page-head reveal">
    <button class="back-btn" onclick="goHome()">← رجوع</button>
    <div class="eyebrow"><span class="edot"></span> ${state.year.name}</div>
    <h1>مواد <span class="g">${state.year.name}</span></h1>
    <p>اختار المادة وابدأ المذاكرة.</p>
  </div><div class="grid">`;
  subs.forEach(s=>{
    html+=`<div class="card reveal" onclick='setView("teachers",${JSON.stringify({subject:s})})'>
      <div class="card-thumb">
        <img src="${s.image_url||""}" onerror="this.style.display='none'" loading="lazy"/>
        <div class="card-thumb-overlay"></div>
        <span class="status-pill">● متاح</span>
      </div>
      <div class="card-body">
        <div class="card-meta"><div><div class="card-sub">مادة دراسية</div><div class="card-title">${s.name}</div></div></div>
        <div class="card-row"><span>${ic('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>')} مناهج كاملة</span><span>${ic('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>')} مدرسين متميزين</span></div>
        <button class="btn btn-primary" style="width:100%">عرض المدرسين ${ic('<path d="M15 18l-6-6 6-6"/>')}</button>
      </div>
    </div>`;
  });
  appEl.innerHTML=html+"</div>"; _observe();
}

async function renderTeachers(){
  const data=await api("/api/subjects/"+state.subject.id+"/teachers");
  const teachers=data.teachers||[];
  let html=`<div class="page-head reveal">
    <button class="back-btn" onclick='setView("subjects",${JSON.stringify({year:state.year})})'>← رجوع للمواد</button>
    <div class="eyebrow"><span class="edot"></span> ${state.subject.name}</div>
    <h1>مدرسو <span class="g">${state.subject.name}</span></h1>
    <p>اختار المدرس وشوف الفصول المتاحة.</p>
  </div><div class="grid">`;
  teachers.forEach(t=>{
    html+=`<div class="t-card reveal">
      <div class="t-top">
        <div class="t-info">
          <div class="t-role">مدرس المادة</div>
          <div class="t-name">${t.name}</div>
        </div>
        <img class="t-avatar" src="${t.image_url||""}" onerror="this.style.opacity=.25" loading="lazy"/>
      </div>
      <div class="t-stats">
        <span class="count-badge">${t.chapter_count||0}</span>
        <span>فصل متاح ${ic('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>')}</span>
      </div>
      <button class="btn btn-primary" style="width:100%" onclick='setView("chapters",${JSON.stringify({teacher:t})})'>اكتشف الفصول ${ic('<path d="M15 18l-6-6 6-6"/>')}</button>
    </div>`;
  });
  appEl.innerHTML=html+"</div>"; _observe();
}

async function renderChapters(){
  const chapters=await api("/api/teachers/"+state.teacher.id+"/chapters");
  let html=`<div class="page-head reveal">
    <button class="back-btn" onclick='setView("teachers",${JSON.stringify({subject:state.subject})})'>← رجوع للمدرسين</button>
    <div class="eyebrow"><span class="edot"></span> ${state.teacher.name}</div>
    <h1>فصول <span class="g">${state.teacher.name}</span></h1>
    <p>اختار الفصل وشوف المحاضرات المتاحة.</p>
  </div><div class="grid">`;
  chapters.forEach(c=>{
    html+=`<div class="t-card reveal">
      <div class="t-top">
        <div class="t-info">
          <div class="t-role">الفصل ${c.order||""}</div>
          <div class="t-name">${c.name}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:5px">م. ${state.teacher.name}</div>
        </div>
        <img class="t-avatar" src="${c.image_url||""}" onerror="this.style.opacity=.2" loading="lazy"/>
      </div>
      <div class="t-stats">
        <span class="count-badge">${c.lecture_count||0}</span>
        <span>محاضرة ${ic('<path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.36a1 1 0 0 1-1.447.89L15 14M3 8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/>')}</span>
      </div>
      <button class="btn btn-primary" style="width:100%" onclick='setView("lectures",${JSON.stringify({chapter:c})})'>مشاهدة المحاضرات ${ic('<path d="M15 18l-6-6 6-6"/>')}</button>
    </div>`;
  });
  appEl.innerHTML=html+"</div>"; _observe();
}

async function renderLectures(){
  const lectures=await api("/api/chapters/"+state.chapter.id+"/lectures");
  let html=`<div class="page-head reveal">
    <button class="back-btn" onclick='setView("chapters",${JSON.stringify({teacher:state.teacher})})'>← رجوع للفصول</button>
    <div class="eyebrow"><span class="edot"></span> ${state.teacher.name}</div>
    <h1>${state.chapter.name}</h1>
    <p>قائمة محاضرات الفصل.</p>
  </div><div class="grid">`;
  lectures.forEach((l,idx)=>{
    html+=`<div class="card reveal">
      <div class="card-body">
        <div class="card-meta">
          <div>
            <div class="card-sub">المحاضرة ${idx+1}</div>
            <div class="card-title">${l.name}</div>
          </div>
        </div>
        <div class="content-icons">
          <div class="ci-item">${ic('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>')}<span>${l.video_count||0}</span><small>فيديو</small></div>
          <div class="ci-item">${ic('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>')}<span>${l.pdf_count||0}</span><small>ملف</small></div>
          <div class="ci-item">${ic('<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>')}<span>${l.exam_count||0}</span><small>اختبار</small></div>
        </div>
        <button class="btn btn-primary" style="width:100%" onclick='setView("content",${JSON.stringify({lecture:l})})'>محتوى المحاضرة ${ic('<path d="M15 18l-6-6 6-6"/>')}</button>
      </div>
    </div>`;
  });
  appEl.innerHTML=html+"</div>"; _observe();
}

async function renderContent(){
  const content=await api("/api/lectures/"+state.lecture.id+"/content");
  const videos=content.videos||[];
  const pdfs=content.pdfs||[];
  const section=(title,count,inner)=>`
    <div style="background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:22px;margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid var(--line)">
        <h2 style="font-size:15px;margin:0;font-weight:900">${title}</h2>
        <span class="eyebrow" style="margin:0">${count}</span>
      </div>
      <div class="grid">${inner}</div>
    </div>`;

  let vidHtml="";
  videos.forEach((v,i)=>{
    const t=String(v.title).replace(/\\/g,"\\\\").replace(/'/g,"\\'");
    vidHtml+=`<div class="v-card reveal">
      <div class="v-thumb">
        <img src="${v.thumbnail_url||""}" onerror="this.style.display='none'" loading="lazy"/>
        <div class="v-play-overlay"><div class="v-play-btn"><svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M8 5v14l11-7z"/></svg></div></div>
        <span class="v-num">فيديو #${i+1}</span>
        <span class="v-dur">⏱ ${v.duration||"00:00"}</span>
      </div>
      <div class="v-body">
        <div class="v-title">${v.title}</div>
        <button class="btn btn-cyan" style="width:100%" onclick="playVideo(${v.id},'${t}')">▶ تشغيل</button>
      </div>
    </div>`;
  });

  let pdfHtml="";
  pdfs.forEach(p=>{
    pdfHtml+=`<div style="background:var(--panel2);border:1px solid var(--line);border-radius:12px;padding:18px;text-align:center" class="reveal">
      <div style="font-size:32px;margin-bottom:8px">📄</div>
      <div style="font-size:14px;font-weight:800;margin-bottom:14px;line-height:1.45">${p.title}</div>
      <div style="display:flex;gap:8px">
        <a href="${p.url}" target="_blank" class="btn btn-primary btn-sm" style="flex:1">عرض 👁</a>
        <a href="${p.url}" download class="btn btn-sm" style="flex:1">تحميل ⬇</a>
      </div>
    </div>`;
  });

  let html=`<div class="page-head reveal" style="text-align:right">
    <button class="back-btn" style="right:auto;left:0" onclick='setView("lectures",${JSON.stringify({chapter:state.chapter})})'>← رجوع</button>
    <div class="eyebrow"><span class="edot"></span> محاضرة #${state.lecture.id}</div>
    <h1>محتوى <span class="g">${state.lecture.name}</span></h1>
    <p>الفيديوهات وملفات الشرح كلها هنا.</p>
  </div>`;

  html+=section("الفيديوهات",`${videos.length} فيديو`,vidHtml||'<div style="color:var(--muted);font-size:13px;padding:20px;text-align:center;grid-column:1/-1">لا توجد فيديوهات في هذه المحاضرة</div>');
  if(pdfs.length) html+=section("ملفات الشرح",`${pdfs.length} ملف`,pdfHtml);

  appEl.innerHTML=html; _observe();
}

function _observe(){
  if(!("IntersectionObserver" in window)){
    document.querySelectorAll(".reveal").forEach(el=>el.classList.add("visible")); return;
  }
  const io=new IntersectionObserver(entries=>{
    entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add("visible");io.unobserve(e.target)}});
  },{threshold:.06});
  document.querySelectorAll(".reveal").forEach(el=>io.observe(el));
}

/* ==================== PLAYER: توجيه لصفحة منفصلة ==================== */
function playVideo(videoId,title){
  const lectureId = state.lecture && state.lecture.id;
  if(!lectureId){
    alert('مفيش محاضرة محددة');
    return;
  }
  window.location.href = 'player.html?lectureId=' + encodeURIComponent(lectureId) + '&videoId=' + encodeURIComponent(videoId);
}

/* ==================== INIT ==================== */
render();
