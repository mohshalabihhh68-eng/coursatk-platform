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

/* ── icon helper ── */
function ic(p,w){w=w||18;return`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="${w}" height="${w}">${p}</svg>`}

/* ── api ── */
async function api(path,opts){
  opts=opts||{};
  /* attach saved token if present */
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

/* ─────────────────────────────────────
   RENDER ROUTER
───────────────────────────────────── */
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

/* ─────────────────────────────────────
   PAGES — server routes from server.js
   GET /api/years
   GET /api/subjects/:id
   GET /api/subjects/:id/teachers
   GET /api/teachers/:id/chapters
   GET /api/chapters/:id/lectures
   GET /api/lectures/:id/content
───────────────────────────────────── */
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

/* ─────────────────────────────────────
   INTERSECTION OBSERVER
───────────────────────────────────── */
function _observe(){
  if(!("IntersectionObserver" in window)){
    document.querySelectorAll(".reveal").forEach(el=>el.classList.add("visible")); return;
  }
  const io=new IntersectionObserver(entries=>{
    entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add("visible");io.unobserve(e.target)}});
  },{threshold:.06});
  document.querySelectorAll(".reveal").forEach(el=>io.observe(el));
}

/* ─────────────────────────────────────
   PLAYER — CRYPTO & DECRYPT
   All routes: POST /api/video/:id/play
               GET  /api/stream?path=&t=
               GET  /api/cdn?u=
               POST /api/heartbeat
───────────────────────────────────── */
function findCrypto(){
  if(window.DecryptionUtils&&typeof window.DecryptionUtils.decryptPlaybackKey==="function")return window.DecryptionUtils;
  for(const n of Object.getOwnPropertyNames(window)){
    try{const o=window[n];if(o&&typeof o==="object"&&typeof o.decryptPlaybackKey==="function")return o}catch(_){}
  }
  return null;
}
function loadPlayerScript(){
  return new Promise((resolve,reject)=>{
    if(findCrypto())return resolve(findCrypto());
    let s=document.querySelector('script[src*="player.stream-weave.com"]');
    if(s){
      let tries=0,t=setInterval(()=>{const c=findCrypto();if(c){clearInterval(t);resolve(c)}else if(++tries>40){clearInterval(t);reject(new Error("timeout"))}},150);
      return;
    }
    s=document.createElement("script");
    s.src="https://player.stream-weave.com/assets/player.js?v=1.1.1";
    s.onload=()=>{let tries=0,t=setInterval(()=>{const c=findCrypto();if(c){clearInterval(t);resolve(c)}else if(++tries>40){clearInterval(t);reject(new Error("crypto not found"))}},150)};
    s.onerror=()=>reject(new Error("failed to load player.js"));
    document.head.appendChild(s);
  });
}
const b64e=s=>btoa(unescape(encodeURIComponent(s))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
const b64d=v=>{let s=String(v).replace(/-/g,"+").replace(/_/g,"/");while(s.length%4)s+="=";return decodeURIComponent(escape(atob(s)))};
function joinRel(base,rel){
  let q="",rp=String(rel),qi=rp.indexOf("?");
  if(qi!==-1){q=rp.slice(qi);rp=rp.slice(0,qi)}
  const st=String(base||"").split("/");
  if(st.length&&st[st.length-1]!==""&&/\.[a-z0-9]+$/i.test(st[st.length-1]))st.pop();
  if(st.length&&st[st.length-1]==="")st.pop();
  rp.split("/").forEach(p=>{if(!p||p===".")return;if(p==="..")st.pop();else st.push(p)});
  return st.join("/")+q;
}
function resolveMedia(uri,varBase,token,varFileUrl){
  if(/^(blob:|data:)/i.test(uri))return uri;
  if(uri.indexOf("/api/stream")===0||uri.indexOf("/api/cdn")===0)return location.origin+uri;
  if(/^https?:\/\//i.test(uri))return location.origin+"/api/cdn?u="+b64e(uri);
  if(varFileUrl){try{return location.origin+"/api/cdn?u="+b64e(new URL(uri,varFileUrl).href)}catch(_){}}
  return location.origin+"/api/stream?path="+encodeURIComponent(joinRel(varBase||"",uri))+"&t="+encodeURIComponent(token);
}
function rewritePlaylist(text,token,keyBlobUrl,varBase,varFileUrl){
  return text.split("\n").map(line=>{
    const s=line.trim();if(!s)return line;
    if(s.charAt(0)==="#"){
      if(s.indexOf("#EXT-X-KEY:")===0&&keyBlobUrl)return s.replace(/URI="[^"]+"/, `URI="${keyBlobUrl}"`);
      return s.replace(/URI="([^"]+)"/g,(_m,uri)=>`URI="${resolveMedia(uri,varBase,token,varFileUrl)}"`);
    }
    return resolveMedia(s,varBase,token,varFileUrl);
  }).join("\n");
}

async function playVideo(videoId,title){
  document.getElementById("player-title").textContent=title;
  document.getElementById("player-modal").classList.remove("hidden");
  document.body.style.overflow="hidden";
  const st=document.getElementById("player-status");
  st.querySelector("span").textContent="جاري فتح الجلسة...";
  st.classList.remove("hidden");
  stopPlayback();
  try{
    /* POST /api/video/:id/play */
    const session=await api("/api/video/"+videoId+"/play",{method:"POST",headers:{"Content-Length":"0"},body:""});
    const streamToken=session.token, swVideoId=session.video_id, hbUrl=session.heartbeat_url;
    if(!streamToken||!swVideoId)throw new Error("جلسة ناقصة");

    st.querySelector("span").textContent="جاري تحضير التشغيل...";
    if(!cryptoUtils)cryptoUtils=await loadPlayerScript();

    /* GET /api/stream — master m3u8 */
    const masterUrl="/api/stream?path="+encodeURIComponent("videos/"+swVideoId+"/stream/master.m3u8")+"&t="+encodeURIComponent(streamToken);
    const masterRes=await fetch(masterUrl);
    if(!masterRes.ok)throw new Error("master.m3u8 → HTTP "+masterRes.status);
    const masterText=await masterRes.text();
    const variantRel=masterText.split("\n").map(l=>l.trim()).find(l=>l&&l.charAt(0)!=="#");
    if(!variantRel)throw new Error("لا يوجد variant في الـ master");

    let variantUrl, varBase="videos/"+swVideoId+"/stream/", varFileUrl=null;
    if(variantRel.indexOf("/api/stream")===0||variantRel.indexOf("/api/cdn")===0){
      variantUrl=variantRel;
      try{const u=new URL(variantRel,location.origin);if(u.pathname.indexOf("/api/stream")===0&&u.searchParams.get("path"))varBase=u.searchParams.get("path");if(u.pathname.indexOf("/api/cdn")===0&&u.searchParams.get("u"))varFileUrl=b64d(u.searchParams.get("u"))}catch(_){}
    }else if(variantRel.indexOf("http")===0){
      varFileUrl=variantRel;variantUrl="/api/cdn?u="+b64e(variantRel);
    }else{
      varBase="videos/"+swVideoId+"/stream/"+variantRel;
      variantUrl="/api/stream?path="+encodeURIComponent(varBase)+"&t="+encodeURIComponent(streamToken);
    }

    const variantRes=await fetch(variantUrl);
    if(!variantRes.ok)throw new Error("variant → HTTP "+variantRes.status);
    const variantText=await variantRes.text();

    st.querySelector("span").textContent="فك التشفير...";
    const keyLine=variantText.split("\n").find(l=>l.indexOf("EXT-X-KEY")!==-1);
    let keyPath="videos/"+swVideoId+"/key",ivHex=null;
    if(keyLine){
      const kum=keyLine.match(/URI="([^"]+)"/),ivm=keyLine.match(/IV=0x([0-9a-fA-F]+)/i);
      if(ivm)ivHex=ivm[1];
      if(kum){
        const uri=kum[1];
        if(uri.indexOf("/api/stream")===0||uri.indexOf(location.origin+"/api/stream")===0){
          try{const u=new URL(uri,location.origin);const pth=u.searchParams.get("path");if(pth)keyPath=pth}catch(_){}
        }else if(uri.indexOf("http")!==0&&uri.indexOf("/api/cdn")!==0)keyPath=uri.replace(/^\//,"").replace(/^api\/v1\//,"");
      }
    }
    const keyUrl="/api/stream?path="+encodeURIComponent(keyPath)+"&t="+encodeURIComponent(streamToken);
    const keyRes=await fetch(keyUrl);
    if(!keyRes.ok)throw new Error("key → HTTP "+keyRes.status);
    const wrappedKey=new Uint8Array(await keyRes.arrayBuffer());
    const keyResult=await cryptoUtils.decryptPlaybackKey(wrappedKey,swVideoId);
    const aesKey=keyResult&&keyResult.key;
    if(!aesKey||aesKey.byteLength!==16)throw new Error("مفتاح التشفير غير صالح");

    const keyBytes=aesKey instanceof ArrayBuffer?aesKey:aesKey.buffer.slice(aesKey.byteOffset,aesKey.byteOffset+aesKey.byteLength);
    currentKeyBlobUrl=URL.createObjectURL(new Blob([keyBytes],{type:"application/octet-stream"}));

    let fixedVariant=rewritePlaylist(variantText,streamToken,currentKeyBlobUrl,varBase,varFileUrl);
    if(fixedVariant.indexOf("#EXTM3U")!==0)fixedVariant="#EXTM3U\n"+fixedVariant.replace(/^#EXTM3U\s*/m,"");
    if(fixedVariant.indexOf("EXT-X-KEY")===-1){
      const ivPart=ivHex?",IV=0x"+ivHex:"";
      fixedVariant=`#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="${currentKeyBlobUrl}"${ivPart}\n`+fixedVariant.replace(/^#EXTM3U\s*/m,"");
    }
    currentPlaylistBlobUrl=URL.createObjectURL(new Blob([fixedVariant],{type:"application/vnd.apple.mpegurl"}));

    st.querySelector("span").textContent="جاري التشغيل...";

    /* POST /api/heartbeat every 25s */
    hbTimer=setInterval(()=>{
      fetch("/api/heartbeat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:hbUrl,token:streamToken})}).catch(()=>{});
    },25000);

    if(window.Hls&&Hls.isSupported()){
      hls=new Hls({enableWorker:false,maxBufferLength:30,maxMaxBufferLength:60});
      hls.loadSource(currentPlaylistBlobUrl);
      hls.attachMedia(videoEl);
      hls.on(Hls.Events.MANIFEST_PARSED,(_,data)=>{
        st.classList.add("hidden");
        const qMenu=document.getElementById("quality-menu");
        let qHtml=`<button onclick="setQuality(-1,this)" class="active">تلقائي</button>`;
        data.levels.forEach((lv,i)=>{if(lv.height>0)qHtml+=`<button onclick="setQuality(${i},this)">${lv.height}p</button>`});
        qMenu.innerHTML=qHtml;
        videoEl.play().catch(()=>{});
      });
      hls.on(Hls.Events.ERROR,(_,d)=>{if(!d.fatal)return;st.querySelector("span").textContent="خطأ HLS: "+d.type;st.classList.remove("hidden")});
    }else{
      videoEl.src=currentPlaylistBlobUrl;
      videoEl.play();
      st.classList.add("hidden");
    }
  }catch(e){
    st.querySelector("span").textContent="فشل: "+e.message;
    st.classList.remove("hidden");
  }
}

/* ─────────────────────────────────────
   PLAYER UI
───────────────────────────────────── */
function toggleDropdown(id){
  document.querySelectorAll(".dropdown-panel").forEach(el=>{if(el.id!==id)el.classList.add("hidden")});
  document.getElementById(id).classList.toggle("hidden");
}
document.addEventListener("click",e=>{if(!e.target.closest(".dropdown"))document.querySelectorAll(".dropdown-panel").forEach(el=>el.classList.add("hidden"))});

function togglePlay(){videoEl.paused?videoEl.play():videoEl.pause()}
videoEl.addEventListener("play",()=>{
  document.getElementById("play-icon").classList.add("hidden");
  document.getElementById("pause-icon").classList.remove("hidden");
  playerWrap.classList.remove("paused");
});
videoEl.addEventListener("pause",()=>{
  document.getElementById("play-icon").classList.remove("hidden");
  document.getElementById("pause-icon").classList.add("hidden");
  playerWrap.classList.add("paused");
  playerWrap.classList.remove("hide-cursor");
});

function setSpeed(speed,btn){
  videoEl.playbackRate=speed;
  document.getElementById("speed-btn").textContent=speed===1?"1x":speed+"x";
  document.querySelectorAll("#speed-menu button").forEach(b=>b.classList.remove("active"));
  if(btn)btn.classList.add("active");
  document.getElementById("speed-menu").classList.add("hidden");
}
function setQuality(idx,btn){
  if(!hls)return;
  hls.currentLevel=idx;
  document.getElementById("quality-btn").textContent=idx===-1?"تلقائي":hls.levels[idx].height+"p";
  document.querySelectorAll("#quality-menu button").forEach(b=>b.classList.remove("active"));
  if(btn)btn.classList.add("active");
  document.getElementById("quality-menu").classList.add("hidden");
}

const fmtT=s=>{if(isNaN(s))return"00:00";return String(Math.floor(s/60)).padStart(2,"0")+":"+String(Math.floor(s%60)).padStart(2,"0")};
videoEl.addEventListener("timeupdate",()=>{
  if(!videoEl.duration)return;
  document.getElementById("prog-filled").style.width=(videoEl.currentTime/videoEl.duration*100)+"%";
  document.getElementById("time-disp").textContent=fmtT(videoEl.currentTime)+" / "+fmtT(videoEl.duration);
});
videoEl.addEventListener("loadedmetadata",()=>{document.getElementById("time-disp").textContent="00:00 / "+fmtT(videoEl.duration)});

function seekVideo(e){
  const bar=document.getElementById("prog-bar");
  const rect=bar.getBoundingClientRect();
  let pct=(e.clientX-rect.left)/rect.width;
  if(document.dir==="rtl")pct=1-pct;
  if(videoEl.duration)videoEl.currentTime=pct*videoEl.duration;
}
function toggleMute(){videoEl.muted=!videoEl.muted;document.getElementById("vol-icon").style.opacity=videoEl.muted?.5:1}
document.getElementById("volume-slider").addEventListener("input",e=>{videoEl.volume=e.target.value;videoEl.muted=+e.target.value===0});
function toggleFullscreen(){!document.fullscreenElement?playerWrap.requestFullscreen().catch(()=>{}):document.exitFullscreen()}

/* click layer — tap zones + long press */
let clickTimer=null,pressTimer=null,isLongPress=false,speedBeforeHold=1;
clickLayer.addEventListener("mousedown",handleDown);
clickLayer.addEventListener("touchstart",handleDown,{passive:true});
clickLayer.addEventListener("mouseup",handleUp);
clickLayer.addEventListener("touchend",handleUp);
clickLayer.addEventListener("mouseleave",handleUp);
function handleDown(e){
  isLongPress=false; if(videoEl.paused)return;
  const cx=e.touches?e.touches[0].clientX:e.clientX;
  pressTimer=setTimeout(()=>{isLongPress=true;speedBeforeHold=videoEl.playbackRate;videoEl.playbackRate=2;clearTimeout(clickTimer)},400);
  clickTimer=setTimeout(()=>{if(!isLongPress)handleTap(cx)},250);
}
function handleUp(){
  clearTimeout(pressTimer);clearTimeout(clickTimer);
  if(isLongPress){videoEl.playbackRate=speedBeforeHold;isLongPress=false}
}
function handleTap(cx){
  const rect=playerWrap.getBoundingClientRect(),rx=(cx-rect.left)/rect.width;
  if(rx<.35)skipTime(-10);else if(rx>.65)skipTime(10);else togglePlay();
}
function skipTime(sec){videoEl.currentTime+=sec;showSeekInd(sec>0?"+10s":"-10s")}
function showSeekInd(txt){
  const el=document.getElementById("seek-indicator");
  el.textContent=txt;el.classList.remove("hidden");
  el.style.animation="none";el.offsetHeight;el.style.animation=null;
  setTimeout(()=>el.classList.add("hidden"),700);
}
let cursorTimer;
playerWrap.addEventListener("mousemove",()=>{
  playerWrap.classList.remove("hide-cursor");clearTimeout(cursorTimer);
  if(!videoEl.paused)cursorTimer=setTimeout(()=>playerWrap.classList.add("hide-cursor"),2500);
});

/* stop & close */
function stopPlayback(){
  if(hbTimer){clearInterval(hbTimer);hbTimer=null}
  if(hls){hls.destroy();hls=null}
  if(currentKeyBlobUrl){URL.revokeObjectURL(currentKeyBlobUrl);currentKeyBlobUrl=null}
  if(currentPlaylistBlobUrl){URL.revokeObjectURL(currentPlaylistBlobUrl);currentPlaylistBlobUrl=null}
  videoEl.playbackRate=1;
  videoEl.removeAttribute("src");videoEl.load();
}
function closePlayer(){
  stopPlayback();
  document.getElementById("player-modal").classList.add("hidden");
  document.body.style.overflow="";
  document.querySelectorAll(".dropdown-panel").forEach(el=>el.classList.add("hidden"));
  document.getElementById("seek-indicator").classList.add("hidden");
}

/* theme */
document.getElementById("theme-toggle").addEventListener("click",()=>{
  const next=document.body.getAttribute("data-theme")==="light"?"dark":"light";
  document.body.setAttribute("data-theme",next);
});

/* init */
loadPlayerScript().then(c=>cryptoUtils=c).catch(()=>{});
render();
