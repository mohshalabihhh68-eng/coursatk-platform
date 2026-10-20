(function(){
'use strict';

const API = '';
const token = localStorage.getItem('cstk_tok') || sessionStorage.getItem('cstk_tok') || '';
const qs = new URLSearchParams(location.search);
const lectureId = qs.get('lectureId');
const initialVideoId = qs.get('videoId');

const $ = id => document.getElementById(id);
const video = $('video');
const screenEl = $('screen');

const PREF_KEY = 'cstk_player_pref';
function readPref(){try{return JSON.parse(localStorage.getItem(PREF_KEY)||'{}')||{}}catch(e){return {}}}
let prefs = Object.assign({rate:1,autonext:true,volume:1,muted:false}, readPref());
function savePref(){try{localStorage.setItem(PREF_KEY, JSON.stringify(prefs))}catch(e){}}

let videos=[], current=-1, hls=null, lastSaved=0, toastTimer=0, ready=false;
let lectureTitle='المحاضرة', listFilter='all', listQuery='';
let cryptoUtils=null, currentKeyBlobUrl=null, currentPlaylistBlobUrl=null, hbTimer=null;

const storeKey = id => 'cstk_w_' + String(id);
function readProgress(id){try{return JSON.parse(localStorage.getItem(storeKey(id))||'null')}catch(e){return null}}
function saveProgress(){
  if(current<0||!ready)return;
  const v=videos[current];if(!v)return;
  const dur=Number(video.duration)||Number(v.duration)||0;
  const t=Number(video.currentTime)||0;
  const p=dur?Math.min(100,t/dur*100):0;
  try{localStorage.setItem(storeKey(v.id),JSON.stringify({
    videoId:String(v.id),title:v.title,currentTime:t,duration:dur,
    percent:Math.round(p),watched:p>=90,updatedAt:Date.now()
  }))}catch(e){}
  lastSaved=t;
  updateCurrentItemUI();
  renderStats();
}
function updateCurrentItemUI(){
  if(current<0)return;
  const v=videos[current];if(!v)return;
  const p=readProgress(v.id)||{},pct=Math.min(100,+p.percent||0),done=!!p.watched||pct>=90;
  const el=$('videoList').querySelector(`[data-i="${current}"]`);if(!el)return;
  const num=el.querySelector('.num');if(num)num.textContent=done?'✓':current+1;
  const meta=el.querySelector('.itemmeta');if(meta)meta.textContent=done?'تمت المشاهدة':pct?Math.round(pct)+'% مكتمل':'لم يبدأ بعد';
  const mini=el.querySelector('.mini i');if(mini)mini.style.width=pct+'%';
}
function fmt(s){
  s=Math.max(0,Math.floor(Number(s)||0));
  const h=Math.floor(s/3600),m=Math.floor(s%3600/60),sec=s%60;
  return h?`${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`:`${m}:${String(sec).padStart(2,'0')}`;
}
function showToast(t){
  const el=$('toast');
  el.textContent=t;el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove('show'),1900);
}
function setLoading(on,text,buf){
  const l=$('loading');
  l.classList.toggle('show',!!on);
  l.classList.toggle('buf',!!buf);
  if(text)$('loadText').textContent=text;
}
let errAction='retry';
function showError(t,title,action){
  errAction=action||'retry';
  $('errorTitle').textContent=title||'مش قادر أشغّل الفيديو';
  $('errorText').textContent=t||'حصل خطأ أثناء تشغيل الفيديو. جرّب تاني.';
  $('retryBtn').textContent=errAction==='leave'?'العودة لصفحة المواد':'إعادة المحاولة';
  $('skipBtn').style.display=(errAction==='retry'&&current>=0&&current<videos.length-1)?'':'none';
  $('error').classList.add('show');
  setLoading(false);
}
function hideError(){$('error').classList.remove('show')}
async function api(path,opts={}){
  const headers={Accept:'application/json',...(opts.headers||{})};
  if(token)headers.Authorization='Bearer '+token;
  let r;
  try{r=await fetch(API+path,{method:opts.method||'GET',headers,body:opts.body,cache:'no-store'})}
  catch(e){const er=new Error('مفيش اتصال بالسيرفر. اتأكد من النت وجرّب تاني.');er.kind='network';throw er}
  let d={};try{d=await r.json()}catch(e){}
  if(!r.ok){
    const er=new Error(d.message||`السيرفر رجّع خطأ (${r.status})`);
    er.status=r.status;
    if(r.status===401||r.status===403){er.kind='auth';er.message='جلسة الدخول انتهت أو مفيش صلاحية.'}
    throw er;
  }
  return d;
}
function esc(s){
  return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

const b64e = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
const b64d = v => { let s = String(v).replace(/-/g,"+").replace(/_/g,"/"); while(s.length%4) s+="="; return decodeURIComponent(escape(atob(s))) };
function joinRel(base,rel){
  let q="",rp=String(rel),qi=rp.indexOf("?");
  if(qi!==-1){q=rp.slice(qi);rp=rp.slice(0,qi)}
  const st=String(base||"").split("/");
  if(st.length&&st[st.length-1]!==""&&/\.[a-z0-9]+$/i.test(st[st.length-1]))st.pop();
  if(st.length&&st[st.length-1]==="")st.pop();
  rp.split("/").forEach(p=>{if(!p||p===".")return;if(p==="..")st.pop();else st.push(p)});
  return st.join("/")+q;
}
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

const SVG_PLAY='<svg class="f" viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg>';
const SVG_PAUSE='<svg class="f" viewBox="0 0 24 24"><rect x="6.5" y="5" width="3.8" height="14" rx="1"/><rect x="13.7" y="5" width="3.8" height="14" rx="1"/></svg>';
const SVG_REPLAY='<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>';
const SVG_VOL_ON='<svg viewBox="0 0 24 24"><path d="M4 10v4h4l5 4V6l-5 4z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M18.5 6.5a9 9 0 0 1 0 11"/></svg>';
const SVG_VOL_LOW='<svg viewBox="0 0 24 24"><path d="M4 10v4h4l5 4V6l-5 4z"/><path d="M16 9a5 5 0 0 1 0 6"/></svg>';
const SVG_VOL_OFF='<svg viewBox="0 0 24 24"><path d="M4 10v4h4l5 4V6l-5 4z"/><path d="m17 9.5 4 5m0-5-4 5"/></svg>';
const SVG_FS_ON='<svg viewBox="0 0 24 24"><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/></svg>';
const SVG_FS_OFF='<svg viewBox="0 0 24 24"><path d="M3 8h5V3M21 8h-5V3M3 16h5v5M21 16h-5v5"/></svg>';

function renderStats(){
  const done=videos.filter(v=>{const p=readProgress(v.id);return p&&(p.watched||p.percent>=90)}).length;
  const total=videos.length,remaining=total-done;
  $('videoCount').textContent=total+' فيديو';
  $('watchedCount').textContent=done+' تمت مشاهدته';
  $('remainingCount').textContent=remaining+' متبقي';
  $('statDone').textContent=done;
  $('statRemain').textContent=remaining;
  $('statPercent').textContent=(total?Math.round(done/total*100):0)+'%';
  $('listSub').textContent=`${total} فيديو · ${done} مكتمل · ${remaining} متبقي`;
}

function renderList(){
  const list=$('videoList');
  if(!videos.length){
    list.innerHTML='<div class="empty">لا توجد فيديوهات في المحاضرة دي.</div>';
    return;
  }
  const query=listQuery.trim().toLocaleLowerCase();
  const filtered=videos.map((v,i)=>({v,i,p:readProgress(v.id)||{}})).filter(({v,p})=>{
    const done=!!p.watched||(+p.percent||0)>=90;
    const matchQ=!query||String(v.title).toLocaleLowerCase().includes(query);
    const matchF=listFilter==='all'||(listFilter==='done'?done:(!done&&(+p.percent||0)>0));
    return matchQ&&matchF;
  });
  if(!filtered.length){
    list.innerHTML='<div class="empty">مفيش فيديوهات مطابقة للبحث أو التصفية.</div>';
    return;
  }
  list.innerHTML=filtered.map(({v,i,p},j)=>{
    const done=!!p.watched||(+p.percent||0)>=90;
    const active=i===current;
    const percent=Math.min(100,+p.percent||0);
    const th=v.thumbnail?`<img src="${esc(v.thumbnail)}" alt="" loading="lazy" onerror="this.remove()">`:'';
    return `<div class="item ${active?'active':''}" data-i="${i}">
      <div class="num">${done?'✓':i+1}</div>
      <div class="thumb">${th}<span class="duration">${fmt(v.duration)}</span></div>
      <div class="itemtxt">
        <div class="itemtitle">${esc(v.title)}</div>
        <div class="itemmeta">${done?'تمت المشاهدة':percent?Math.round(percent)+'% مكتمل':'لم يبدأ بعد'}</div>
        <div class="mini"><i style="width:${percent}%"></i></div>
      </div>
    </div>`;
  }).join('');
  list.querySelectorAll('[data-i]').forEach(el=>{
    el.addEventListener('click',()=>playIndex(+el.dataset.i,true));
  });
}

const RATES=[.5,.75,1,1.25,1.5,1.75,2,2.5,3];
let rate=RATES.includes(+prefs.rate)?+prefs.rate:1;
const rateLabel=x=>x+'×';
let qualityIdx=-1,menuView='',menuClosedAt=0;
let uiTimer=0,raf=0,scrub=null,playToken=0,hlsRetry={net:0,media:0},lastPtype='mouse',wakeLock=null;
const hold={timer:0,active:false,x:0,y:0,endedAt:0};
const tap={t:0,side:'',timer:0,seekUntil:0};
const seek=$('pseek');
const isOpen=()=>$('pmenu').classList.contains('open');

function showUI(pin){
  if(!screenEl.classList.contains('show-ui')){screenEl.classList.add('show-ui');paintProgress()}
  clearTimeout(uiTimer);
  if(pin||video.paused||isOpen()||scrub||hold.active)return;
  uiTimer=setTimeout(()=>{if(!video.paused&&!isOpen()&&!scrub)hideUI()},3000);
}
function hideUI(){
  screenEl.classList.remove('show-ui');
  clearTimeout(uiTimer);
}
function toggleUI(){
  if(screenEl.classList.contains('show-ui'))hideUI();else showUI();
}
function togglePlay(){
  if(video.paused){
    const p=video.play();
    if(p&&p.catch)p.catch(err=>{if(err&&err.name==='NotAllowedError')showToast('اضغط تشغيل تاني لو سمحت')});
  }else video.pause();
  showUI();
}
function seekBy(d){
  if(!(Number.isFinite(video.duration)&&video.duration>0)){showToast('الفيديو لسه بيجهز');return false}
  video.currentTime=Math.max(0,Math.min(video.duration,(video.currentTime||0)+d));
  return true;
}

function paintProgress(){
  const d=Number(video.duration)||0;
  const t=scrub?scrub.t:(Number(video.currentTime)||0);
  const p=d?Math.max(0,Math.min(100,t/d*100)):0;
  $('pplayed').style.width=p+'%';
  $('pknob').style.left=p+'%';
  $('ptime').textContent=fmt(t)+' / '+fmt(d||videos[current]?.duration||0);
}
function paintBuffered(){
  try{
    const b=video.buffered,d=video.duration,t=video.currentTime||0;
    if(!d||!b.length){$('pbuf').style.width='0%';return}
    let end=t;
    for(let i=0;i<b.length;i++){if(t>=b.start(i)-.3&&t<=b.end(i)+.3){end=b.end(i);break}}
    $('pbuf').style.width=Math.min(100,end/d*100)+'%';
  }catch(e){}
}
function syncAria(){
  const d=Number(video.duration)||0,t=Number(video.currentTime)||0;
  seek.setAttribute('aria-valuemax',String(Math.round(d)));
  seek.setAttribute('aria-valuenow',String(Math.round(t)));
  seek.setAttribute('aria-valuetext',fmt(t)+' من '+fmt(d));
}
function loop(){
  if(screenEl.classList.contains('show-ui'))paintProgress();
  raf=video.paused?0:requestAnimationFrame(loop);
}
function syncPlayState(){
  const icon=video.ended?SVG_REPLAY:video.paused?SVG_PLAY:SVG_PAUSE;
  $('pplay').innerHTML=icon;$('pc').innerHTML=icon;
  const lbl=video.paused?'تشغيل':'إيقاف مؤقت';
  $('pplay').setAttribute('aria-label',lbl);$('pc').setAttribute('aria-label',lbl);
  screenEl.classList.toggle('paused',video.paused);
  if(video.paused){cancelAnimationFrame(raf);raf=0;paintProgress()}
  else if(!raf)raf=requestAnimationFrame(loop);
  updateWakeLock();
}
async function updateWakeLock(){
  try{
    if(!video.paused&&!video.ended&&!wakeLock&&navigator.wakeLock&&document.visibilityState==='visible'){
      wakeLock=await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release',()=>{wakeLock=null});
    }else if(video.paused&&wakeLock){await wakeLock.release();wakeLock=null}
  }catch(e){wakeLock=null}
}
document.addEventListener('visibilitychange',updateWakeLock);

function syncVolume(){
  const off=video.muted||video.volume===0;
  $('pmute').innerHTML=off?SVG_VOL_OFF:(video.volume<.5?SVG_VOL_LOW:SVG_VOL_ON);
  $('pmute').setAttribute('aria-label',off?'تشغيل الصوت':'كتم الصوت');
  const v=off?0:video.volume;
  $('pvol').value=v;
  $('pvol').style.setProperty('--v',(v*100)+'%');
}
video.volume=Math.max(0,Math.min(1,+prefs.volume>=0?+prefs.volume:1));
video.muted=!!prefs.muted;
video.addEventListener('volumechange',()=>{
  syncVolume();
  prefs.volume=video.volume;prefs.muted=video.muted;savePref();
});
$('pvol').addEventListener('input',e=>{
  e.stopPropagation();
  video.muted=false;
  video.volume=+e.target.value;
});
$('pmute').onclick=e=>{
  e.stopPropagation();
  if(video.muted||video.volume===0){video.muted=false;if(video.volume===0)video.volume=.5}
  else video.muted=true;
  showUI();
};

function applyRate(){video.defaultPlaybackRate=rate;video.playbackRate=rate}
function setRate(x,quiet){
  rate=x;applyRate();
  prefs.rate=x;savePref();
  $('pspeed').textContent=rateLabel(x);
  if(!quiet)showToast('سرعة التشغيل '+rateLabel(x));
}
function stepRate(dir){
  let i=RATES.indexOf(rate);if(i<0)i=RATES.indexOf(1);
  i=Math.max(0,Math.min(RATES.length-1,i+dir));
  setRate(RATES[i]);
}

function qualityLevels(){
  if(!hls||!hls.levels||hls.levels.length<2)return null;
  return hls.levels.map((l,i)=>({i,h:l.height||0,b:l.bitrate||0})).sort((a,b)=>(b.h-a.h)||(b.b-a.b));
}
function levelLabel(l){return l.h?l.h+'p':Math.round(l.b/1000)+' kbps'}
function qualityText(){
  const ls=qualityLevels();if(!ls)return '';
  if(qualityIdx>=0){const l=ls.find(x=>x.i===qualityIdx);return l?levelLabel(l):'تلقائي'}
  const cur=ls.find(x=>x.i===hls.currentLevel);
  return cur?'تلقائي ('+levelLabel(cur)+')':'تلقائي';
}
function realQualityText(){
  let h=0;
  if(hls&&hls.levels&&hls.levels.length){
    const i=hls.currentLevel>=0?hls.currentLevel:(hls.loadLevel>=0?hls.loadLevel:0);
    const l=hls.levels[i]||hls.levels[0];
    h=(l&&l.height)||0;
  }
  if(!h)h=video.videoHeight||0;
  return h?h+'p':'جاري التحديد…';
}
function setQuality(i){
  if(!hls)return;
  qualityIdx=i;
  hls.currentLevel=i;
  showToast(i<0?'الجودة: تلقائي':'الجودة: '+levelLabel(qualityLevels().find(x=>x.i===i)));
}
function renderMenu(){
  const m=$('pmenu');
  const head=t=>`<button type="button" class="mhead" data-go="main"><svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg><span>${t}</span></button>`;
  let h='';
  if(menuView==='speed'){
    h=head('سرعة التشغيل')+'<div class="opts">'+RATES.map(x=>
      `<button type="button" data-sp="${x}" class="${x===rate?'on':''}">${x===1?'عادية':rateLabel(x)}</button>`).join('')+'</div>';
  }else if(menuView==='quality'){
    const ls=qualityLevels()||[];
    h=head('الجودة')+`<button type="button" class="mrow ${qualityIdx<0?'on':''}" data-q="-1"><span class="lbl">تلقائي</span><span class="val">${qualityIdx<0?'✓':''}</span></button>`+
      ls.map(l=>`<button type="button" class="mrow ${qualityIdx===l.i?'on':''}" data-q="${l.i}"><span class="lbl">${levelLabel(l)}</span><span class="val">${qualityIdx===l.i?'✓':''}</span></button>`).join('');
  }else{
    h=`<button type="button" class="mrow" data-go="speed"><span class="lbl">سرعة التشغيل</span><span class="val">${rate===1?'عادية':rateLabel(rate)}</span><span class="chev">‹</span></button>`+
      (qualityLevels()?`<button type="button" class="mrow" data-go="quality"><span class="lbl">الجودة</span><span class="val">${qualityText()}</span><span class="chev">‹</span></button>`:`<div class="mrow"><span class="lbl">الجودة</span><span class="val">${realQualityText()}</span></div>`)+
      `<button type="button" class="mrow" data-tg="autonext"><span class="lbl">تشغيل الفيديو التالي تلقائي</span><span class="sw ${prefs.autonext?'on':''}"></span></button>`;
  }
  m.innerHTML=h;
}
function openMenu(view){
  if(isOpen()&&menuView===view){closeMenu();return}
  menuView=view;renderMenu();
  $('pmenu').classList.add('open');
  showUI(true);
}
function closeMenu(silent){
  const m=$('pmenu');
  if(!m.classList.contains('open'))return;
  m.classList.remove('open');menuView='';menuClosedAt=Date.now();
  if(!silent)showUI();
}
$('pmenu').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  e.stopPropagation();
  if(b.dataset.go){menuView=b.dataset.go;renderMenu()}
  else if(b.dataset.sp){setRate(+b.dataset.sp);closeMenu()}
  else if(b.dataset.q!==undefined){setQuality(+b.dataset.q);closeMenu()}
  else if(b.dataset.tg==='autonext'){prefs.autonext=!prefs.autonext;savePref();renderMenu()}
});
$('pset').onclick=e=>{e.stopPropagation();openMenu('main')};
$('pspeed').onclick=e=>{e.stopPropagation();openMenu('speed')};
document.addEventListener('pointerdown',e=>{
  if(isOpen()&&!$('pmenu').contains(e.target)&&!$('pset').contains(e.target)&&!$('pspeed').contains(e.target))closeMenu();
});

function cleanup(){
  endHold();
  closeMenu(true);
  ready=false;
  $('pbuf').style.width='0%';
  $('pplayed').style.width='0%';
  $('pknob').style.left='0%';
  if(hbTimer){clearInterval(hbTimer);hbTimer=null}
  if(hls){try{hls.destroy()}catch(e){}hls=null}
  if(currentKeyBlobUrl){URL.revokeObjectURL(currentKeyBlobUrl);currentKeyBlobUrl=null}
  if(currentPlaylistBlobUrl){URL.revokeObjectURL(currentPlaylistBlobUrl);currentPlaylistBlobUrl=null}
  video.pause();
  video.removeAttribute('src');
  try{video.load()}catch(e){}
  qualityIdx=-1;
}
function updateMediaSession(){
  if(!('mediaSession' in navigator)||current<0)return;
  try{
    const v=videos[current];
    navigator.mediaSession.metadata=new MediaMetadata({
      title:v.title,artist:lectureTitle,album:'ثانوية club',
      artwork:v.thumbnail?[{src:v.thumbnail}]:[]
    });
  }catch(e){}
}
async function playIndex(i,autoplay){
  if(i<0||i>=videos.length)return;
  saveProgress();
  const my=++playToken;
  cleanup();
  current=i;
  hlsRetry={net:0,media:0};
  const item=videos[i];
  $('videoTitle').textContent=item.title;
  $('ptitle').textContent=item.title;
  $('lectureName').textContent=lectureTitle;
  $('prevBtn').disabled=i===0;
  $('nextBtn').disabled=i===videos.length-1;
  $('pnx').disabled=i===videos.length-1;
  hideError();
  setLoading(true,'جاري تجهيز الفيديو…');
  renderList();
  renderStats();
  const lst=$('videoList'),act=lst.querySelector('.item.active');
  if(act)lst.scrollTop=Math.max(0,act.getBoundingClientRect().top-lst.getBoundingClientRect().top+lst.scrollTop-lst.clientHeight/2+act.clientHeight/2);
  history.replaceState(null,'',`?lectureId=${encodeURIComponent(lectureId)}&videoId=${encodeURIComponent(item.id)}`);
  updateMediaSession();
  try{
    // 1) جلسة التشغيل من /api/video/:id/play
    const session=await api('/api/video/'+encodeURIComponent(item.id)+'/play',{method:'POST'});
    if(my!==playToken)return;
    
    // السيرفر بيرجع { token, video_id, heartbeat_url }
    const streamToken=session.token, swVideoId=session.video_id, hbUrl=session.heartbeat_url;
    if(!streamToken||!swVideoId)throw new Error('بيانات تشغيل الفيديو غير مكتملة');

    // 2) تحميل crypto
    setLoading(true,'جاري تحضير التشغيل…');
    if(!cryptoUtils)cryptoUtils=await loadPlayerScript();
    if(my!==playToken)return;

    // 3) master playlist
    const masterUrl='/api/stream?path='+encodeURIComponent('videos/'+swVideoId+'/stream/master.m3u8')+'&t='+encodeURIComponent(streamToken);
    const masterRes=await fetch(masterUrl);
    if(!masterRes.ok)throw new Error('master.m3u8 → HTTP '+masterRes.status);
    const masterText=await masterRes.text();
    const variantRel=masterText.split('\n').map(l=>l.trim()).find(l=>l&&l.charAt(0)!=='#');
    if(!variantRel)throw new Error('لا يوجد variant في الـ master');

    // 4) variant playlist
    let variantUrl,varBase='videos/'+swVideoId+'/stream/',varFileUrl=null;
    if(variantRel.indexOf('/api/stream')===0||variantRel.indexOf('/api/cdn')===0){
      variantUrl=variantRel;
      try{const u=new URL(variantRel,location.origin);if(u.pathname.indexOf('/api/stream')===0&&u.searchParams.get('path'))varBase=u.searchParams.get('path');if(u.pathname.indexOf('/api/cdn')===0&&u.searchParams.get('u'))varFileUrl=b64d(u.searchParams.get('u'))}catch(_){}
    }else if(variantRel.indexOf('http')===0){
      varFileUrl=variantRel;variantUrl='/api/cdn?u='+b64e(variantRel);
    }else{
      varBase='videos/'+swVideoId+'/stream/'+variantRel;
      variantUrl='/api/stream?path='+encodeURIComponent(varBase)+'&t='+encodeURIComponent(streamToken);
    }

    const variantRes=await fetch(variantUrl);
    if(!variantRes.ok)throw new Error('variant → HTTP '+variantRes.status);
    const variantText=await variantRes.text();
    if(my!==playToken)return;

    // 5) فك المفتاح
    setLoading(true,'فك التشفير…');
    const keyLine=variantText.split('\n').find(l=>l.indexOf('EXT-X-KEY')!==-1);
    let keyPath='videos/'+swVideoId+'/key',ivHex=null;
    if(keyLine){
      const kum=keyLine.match(/URI="([^"]+)"/),ivm=keyLine.match(/IV=0x([0-9a-fA-F]+)/i);
      if(ivm)ivHex=ivm[1];
      if(kum){
        const uri=kum[1];
        if(uri.indexOf('/api/stream')===0||uri.indexOf(location.origin+'/api/stream')===0){
          try{const u=new URL(uri,location.origin);const pth=u.searchParams.get('path');if(pth)keyPath=pth}catch(_){}
        }else if(uri.indexOf('http')!==0&&uri.indexOf('/api/cdn')!==0){
          keyPath=uri.replace(/^\//,'').replace(/^api\/v1\//,'');
        }
      }
    }
    const keyUrl='/api/stream?path='+encodeURIComponent(keyPath)+'&t='+encodeURIComponent(streamToken);
    const keyRes=await fetch(keyUrl);
    if(!keyRes.ok)throw new Error('key → HTTP '+keyRes.status);
    const wrappedKey=new Uint8Array(await keyRes.arrayBuffer());
    const keyResult=await cryptoUtils.decryptPlaybackKey(wrappedKey,swVideoId);
    const aesKey=keyResult&&keyResult.key;
    if(!aesKey||aesKey.byteLength!==16)throw new Error('مفتاح التشفير غير صالح');

    const keyBytes=aesKey instanceof ArrayBuffer?aesKey:aesKey.buffer.slice(aesKey.byteOffset,aesKey.byteOffset+aesKey.byteLength);
    currentKeyBlobUrl=URL.createObjectURL(new Blob([keyBytes],{type:'application/octet-stream'}));

    // 6) rewrite playlist
    let fixedVariant=rewritePlaylist(variantText,streamToken,currentKeyBlobUrl,varBase,varFileUrl);
    if(fixedVariant.indexOf('#EXTM3U')!==0)fixedVariant='#EXTM3U\n'+fixedVariant.replace(/^#EXTM3U\s*/m,'');
    if(fixedVariant.indexOf('EXT-X-KEY')===-1){
      const ivPart=ivHex?',IV=0x'+ivHex:'';
      fixedVariant=`#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="${currentKeyBlobUrl}"${ivPart}\n`+fixedVariant.replace(/^#EXTM3U\s*/m,'');
    }
    currentPlaylistBlobUrl=URL.createObjectURL(new Blob([fixedVariant],{type:'application/vnd.apple.mpegurl'}));

    setLoading(true,'جاري التشغيل…');

    // 7) heartbeat
    if(hbUrl){
      hbTimer=setInterval(()=>{
        fetch('/api/heartbeat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:hbUrl,token:streamToken})}).catch(()=>{});
      },25000);
    }

    // 8) resume
    const saved=readProgress(item.id);
    const resumeAt=saved&&saved.currentTime>2&&!saved.watched?+saved.currentTime:0;
    applyRate();

    video.addEventListener('loadedmetadata',()=>{
      if(my!==playToken)return;
      if(resumeAt&&Number.isFinite(video.duration)&&resumeAt<video.duration-2){
        video.currentTime=resumeAt;
        showToast('كمّلنا من '+fmt(resumeAt));
      }
      applyRate();
      ready=true;
      paintProgress();
    },{once:true});

    // 9) تشغيل hls
    if(window.Hls&&Hls.isSupported()){
      hls=new Hls({
        enableWorker:true,maxBufferLength:30,maxMaxBufferLength:60,backBufferLength:15,
        startPosition:resumeAt||-1
      });
      hls.on(Hls.Events.MANIFEST_PARSED,()=>{
        if(my!==playToken)return;
        setLoading(false);
        if(autoplay)video.play().catch(()=>{});
        showUI(true);
      });
      hls.on(Hls.Events.FRAG_BUFFERED,()=>{hlsRetry.net=0});
      hls.on(Hls.Events.ERROR,(_e,d)=>{
        if(my!==playToken||!d||!d.fatal)return;
        if(d.type===Hls.ErrorTypes.NETWORK_ERROR){
          if(hlsRetry.net++<3){
            setLoading(true,'النت ضعيف… بحاول تاني',false);
            setTimeout(()=>{
              if(my!==playToken||!hls)return;
              if(d.details===Hls.ErrorDetails.MANIFEST_LOAD_ERROR||d.details===Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT)hls.loadSource(currentPlaylistBlobUrl);
              else hls.startLoad();
            },700*hlsRetry.net);
          }else showError('النت ضعيف أو مقطوع. اتأكد من الاتصال وجرّب تاني.','مشكلة في الاتصال');
        }else if(d.type===Hls.ErrorTypes.MEDIA_ERROR){
          if(hlsRetry.media++<2)hls.recoverMediaError();
          else showError('الفيديو مش بيشتغل على جهازك أو المتصفح ده. جرّب متصفح تاني.','تعذّر تشغيل الفيديو');
        }else showError('حصلت مشكلة أثناء تحميل الفيديو. جرّب تاني.','تعذّر تحميل الفيديو');
      });
      hls.loadSource(currentPlaylistBlobUrl);
      hls.attachMedia(video);
    }else if(video.canPlayType('application/vnd.apple.mpegurl')){
      video.src=currentPlaylistBlobUrl;
      video.addEventListener('canplay',()=>{
        if(my!==playToken)return;
        setLoading(false);
        if(autoplay)video.play().catch(()=>{});
        showUI(true);
      },{once:true});
      video.load();
    }else{
      throw new Error('المتصفح لا يدعم HLS');
    }
  }catch(e){
    if(my!==playToken)return;
    if(e.kind==='auth')showError(e.message,'انتهت الجلسة','leave');
    else if(e.kind==='network')showError(e.message,'مفيش اتصال');
    else showError(e.message||'فشل تحميل الفيديو','تعذّر تحميل الفيديو');
  }
}

async function init(){
  if(!token){
    showError('جلسة الدخول مش موجودة. ارجع لصفحة المواد وسجّل الدخول من جديد.','محتاج تسجّل دخول','leave');
    return;
  }
  if(!lectureId){
    showError('رابط المشغل ناقصه رقم المحاضرة.','رابط ناقص','leave');
    return;
  }
  try{
    const d=await api('/api/lectures/'+encodeURIComponent(lectureId)+'/content');
    videos=(d.videos||[]).map((v,i)=>({
      id:v.id,
      title:v.title||v.name||`فيديو ${i+1}`,
      duration:+(v.duration||v.duration_seconds||v.length)||0,
      thumbnail:v.thumbnail||v.thumb||v.thumbnail_url||v.image_url||v.poster||''
    }));
    const lectureName=d.lecture?.name||d.name||d.title||'المحاضرة';
    lectureTitle=lectureName;
    $('crumb').textContent='المحتوى / '+lectureName;
    $('lectureName').textContent=lectureName;
    renderStats();
    renderList();
    if(!videos.length){
      setLoading(false);
      $('videoList').innerHTML='<div class="empty">المحاضرة دي مفيهاش فيديوهات مضافة.</div>';
      return;
    }
    let idx=videos.findIndex(v=>String(v.id)===String(initialVideoId));
    if(idx<0)idx=videos.findIndex(v=>{const p=readProgress(v.id);return p&&!p.watched&&p.currentTime>0});
    if(idx<0)idx=0;
    await playIndex(idx,false);
  }catch(e){
    if(e.kind==='auth')showError(e.message,'انتهت الجلسة','leave');
    else showError(e.message||'فشل تحميل المحاضرة','تعذّر تحميل المحاضرة');
  }
}

function fracAt(e){
  const r=seek.getBoundingClientRect();
  return Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
}
function placeTip(x){
  const tip=$('ptip'),w=seek.clientWidth,h=tip.offsetWidth/2;
  tip.style.left=Math.max(h,Math.min(w-h,x*w))+'px';
}
seek.addEventListener('pointerdown',e=>{
  if(!(video.duration>0))return;
  if(e.pointerType==='mouse'&&e.button!==0)return;
  e.stopPropagation();
  try{seek.setPointerCapture(e.pointerId)}catch(_){}
  const x=fracAt(e);
  scrub={t:x*video.duration};
  seek.classList.add('drag');
  $('ptip').textContent=fmt(scrub.t);placeTip(x);
  paintProgress();showUI(true);
});
seek.addEventListener('pointermove',e=>{
  if(!(video.duration>0))return;
  const x=fracAt(e);
  $('ptip').textContent=fmt(x*video.duration);placeTip(x);
  if(scrub){scrub.t=x*video.duration;paintProgress()}
});
seek.addEventListener('pointerup',()=>{
  if(!scrub)return;
  const t=scrub.t;scrub=null;
  seek.classList.remove('drag');
  video.currentTime=t;
  paintProgress();showUI();
});
seek.addEventListener('pointercancel',()=>{
  if(!scrub)return;
  scrub=null;seek.classList.remove('drag');paintProgress();showUI();
});
seek.addEventListener('keydown',e=>{
  if(!(video.duration>0))return;
  let t=video.currentTime;
  if(e.key==='ArrowRight')t+=5;
  else if(e.key==='ArrowLeft')t-=5;
  else if(e.key==='PageUp')t+=30;
  else if(e.key==='PageDown')t-=30;
  else if(e.key==='Home')t=0;
  else if(e.key==='End')t=video.duration;
  else return;
  e.preventDefault();
  e.stopPropagation();
  video.currentTime=Math.max(0,Math.min(video.duration,t));
  showUI();
});

$('pplay').onclick=e=>{e.stopPropagation();togglePlay()};
$('pc').onclick=e=>{e.stopPropagation();togglePlay()};
$('pb').onclick=e=>{e.stopPropagation();seekBy(-10);showUI()};
$('pf').onclick=e=>{e.stopPropagation();seekBy(10);showUI()};
$('pnx').onclick=e=>{e.stopPropagation();if(current<videos.length-1)playIndex(current+1,true)};

if(!(document.pictureInPictureEnabled&&video.requestPictureInPicture))$('ppip').style.display='none';
$('ppip').onclick=async e=>{
  e.stopPropagation();
  try{
    if(document.pictureInPictureElement)await document.exitPictureInPicture();
    else await video.requestPictureInPicture();
  }catch(err){showToast('مش قادر أفتح النافذة العائمة')}
  showUI();
};
video.addEventListener('enterpictureinpicture',()=>$('ppip').classList.add('active'));
video.addEventListener('leavepictureinpicture',()=>$('ppip').classList.remove('active'));

const fsEl=()=>document.fullscreenElement||document.webkitFullscreenElement;
function toggleFs(){
  if(fsEl()){(document.exitFullscreen||document.webkitExitFullscreen)?.call(document);return}
  const req=screenEl.requestFullscreen||screenEl.webkitRequestFullscreen;
  if(req){const p=req.call(screenEl);if(p&&p.catch)p.catch(()=>{})}
  else if(video.webkitEnterFullscreen)video.webkitEnterFullscreen();
}
function onFsChange(){
  const on=!!fsEl();
  $('pfs').innerHTML=on?SVG_FS_OFF:SVG_FS_ON;
  $('pfs').setAttribute('aria-label',on?'خروج من ملء الشاشة':'ملء الشاشة');
  showUI();
}
['fullscreenchange','webkitfullscreenchange'].forEach(ev=>document.addEventListener(ev,onFsChange));
$('pfs').onclick=e=>{e.stopPropagation();toggleFs()};

const goBack=()=>{
  if(history.length>1)history.back();
  else location.href='subjects.html';
};
$('pback').onclick=e=>{e.stopPropagation();goBack()};
$('backBtn').onclick=goBack;

function startHold(e){
  if(e.pointerType==='mouse'&&e.button!==0)return;
  hold.x=e.clientX;hold.y=e.clientY;
  clearTimeout(hold.timer);
  hold.timer=setTimeout(()=>{
    if(video.paused||!(video.duration>0)||isOpen())return;
    hold.active=true;
    video.playbackRate=2;
    hideUI();
    screenEl.classList.add('holding');
    $('holdb').classList.add('show');
    try{navigator.vibrate&&navigator.vibrate(12)}catch(_){}
  },450);
}
function endHold(){
  clearTimeout(hold.timer);
  if(!hold.active)return;
  hold.active=false;hold.endedAt=Date.now();
  applyRate();
  screenEl.classList.remove('holding');
  $('holdb').classList.remove('show');
}
const ptap=$('ptap');
ptap.addEventListener('pointerdown',e=>{lastPtype=e.pointerType||'mouse';startHold(e)});
ptap.addEventListener('pointermove',e=>{
  if(!hold.active&&hold.timer&&Math.hypot(e.clientX-hold.x,e.clientY-hold.y)>12)clearTimeout(hold.timer);
});
['pointerup','pointercancel','pointerleave'].forEach(n=>ptap.addEventListener(n,endHold));
window.addEventListener('blur',endHold);
ptap.addEventListener('contextmenu',e=>e.preventDefault());

const DOUBLE_TAP_DELAY=280;
let fxAcc=0,fxAt=0,fxSide='';
function flashFx(side){
  const now=Date.now();
  if(fxSide!==side||now-fxAt>900)fxAcc=0;
  fxAcc+=10;fxAt=now;fxSide=side;
  const fx=$(side==='left'?'fxl':'fxr');
  fx.textContent=(side==='left'?'−':'+')+fxAcc+' ث';
  fx.classList.remove('go');void fx.offsetWidth;fx.classList.add('go');
}
function doubleSeek(side){
  if(seekBy(side==='left'?-10:10))flashFx(side);
}
ptap.addEventListener('click',e=>{
  const now=Date.now();
  if(now-hold.endedAt<400||now-menuClosedAt<400)return;
  if(lastPtype==='mouse'){
    clearTimeout(tap.timer);
    tap.timer=setTimeout(togglePlay,220);
    return;
  }
  const r=screenEl.getBoundingClientRect();
  const side=(e.clientX-r.left)<r.width/2?'left':'right';
  if(now<tap.seekUntil&&tap.side===side){
    clearTimeout(tap.timer);doubleSeek(side);tap.seekUntil=now+700;return;
  }
  if(tap.side===side&&now-tap.t<DOUBLE_TAP_DELAY){
    clearTimeout(tap.timer);doubleSeek(side);
    tap.seekUntil=now+700;tap.t=0;return;
  }
  tap.t=now;tap.side=side;
  clearTimeout(tap.timer);
  tap.timer=setTimeout(()=>{tap.side='';toggleUI()},DOUBLE_TAP_DELAY);
});
ptap.addEventListener('dblclick',e=>{
  if(lastPtype==='mouse'){clearTimeout(tap.timer);toggleFs()}
});
screenEl.addEventListener('pointermove',e=>{
  if(e.pointerType==='mouse'&&!hold.active)showUI();
});
screenEl.addEventListener('pointerleave',e=>{
  if(e.pointerType==='mouse'&&!video.paused&&!isOpen()&&!scrub)hideUI();
});

['loadedmetadata','resize'].forEach(ev=>video.addEventListener(ev,()=>{if(isOpen()&&menuView==='main')renderMenu()}));
['progress','loadedmetadata','durationchange','seeked'].forEach(ev=>video.addEventListener(ev,()=>{paintBuffered();paintProgress()}));
video.addEventListener('timeupdate',()=>{
  paintProgress();paintBuffered();syncAria();
  if(ready&&Math.abs((video.currentTime||0)-lastSaved)>4)saveProgress();
});
['play','playing','pause','ended'].forEach(ev=>video.addEventListener(ev,syncPlayState));
video.addEventListener('play',()=>showUI());
video.addEventListener('pause',()=>{saveProgress();showUI(true)});
video.addEventListener('waiting',()=>{if(!$('error').classList.contains('show'))setLoading(true,'',true)});
['playing','canplay'].forEach(ev=>video.addEventListener(ev,()=>{if(!$('error').classList.contains('show'))setLoading(false)}));
video.addEventListener('error',()=>{
  if(hls||!video.error||!video.currentSrc)return;
  const code=video.error.code;
  const msg=code===2?'مشكلة في الاتصال أثناء تحميل الفيديو.':
    code===3?'تعذّر فك ترميز الفيديو.':
    code===4?'صيغة الفيديو أو رابط التشغيل مش مدعوم.':
    'حصل خطأ أثناء تشغيل الفيديو.';
  showError(msg,'تعذّر تشغيل الفيديو');
});
video.addEventListener('ended',()=>{
  saveProgress();
  if(prefs.autonext&&current<videos.length-1){
    showToast('خلصت الفيديو ✓ — التالي حالًا');
    const my=playToken;
    setTimeout(()=>{if(my===playToken)playIndex(current+1,true)},1500);
  }else{
    showToast('خلصت الفيديو 👏');
    showUI(true);
  }
});
window.addEventListener('pagehide',saveProgress);
window.addEventListener('offline',()=>showToast('النت اتقطع'));
window.addEventListener('online',()=>{
  if($('error').classList.contains('show')&&errAction==='retry'&&current>=0){hideError();playIndex(current,true)}
  else showToast('النت رجع');
});

if('mediaSession' in navigator){
  const ms=(a,f)=>{try{navigator.mediaSession.setActionHandler(a,f)}catch(e){}};
  ms('play',()=>video.play().catch(()=>{}));
  ms('pause',()=>video.pause());
  ms('seekbackward',()=>seekBy(-10));
  ms('seekforward',()=>seekBy(10));
  ms('previoustrack',()=>{if(current>0)playIndex(current-1,true)});
  ms('nexttrack',()=>{if(current<videos.length-1)playIndex(current+1,true)});
  ms('seekto',d=>{if(d&&Number.isFinite(d.seekTime))video.currentTime=d.seekTime});
}

document.addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  const tag=(e.target.tagName||'').toLowerCase();
  if(tag==='input'||tag==='textarea'||tag==='select')return;
  const c=e.code;
  if(c==='Escape'){closeMenu();return}
  if((c==='Space'||c==='Enter')&&tag==='button')return;
  if(c==='Space'||c==='KeyK'){e.preventDefault();togglePlay()}
  else if(c==='ArrowLeft'){e.preventDefault();seekBy(-5);showUI()}
  else if(c==='ArrowRight'){e.preventDefault();seekBy(5);showUI()}
  else if(c==='KeyJ'){e.preventDefault();seekBy(-10);showUI()}
  else if(c==='KeyL'){e.preventDefault();seekBy(10);showUI()}
  else if(c==='ArrowUp'){e.preventDefault();video.muted=false;video.volume=Math.min(1,video.volume+.1);showToast('الصوت '+Math.round(video.volume*100)+'%')}
  else if(c==='ArrowDown'){e.preventDefault();video.volume=Math.max(0,video.volume-.1);showToast('الصوت '+Math.round(video.volume*100)+'%')}
  else if(c==='KeyM'){e.preventDefault();$('pmute').click()}
  else if(c==='KeyF'){e.preventDefault();toggleFs()}
  else if(c==='KeyP'&&!e.shiftKey){e.preventDefault();$('ppip').click()}
  else if(c==='KeyN'&&e.shiftKey){e.preventDefault();$('pnx').click()}
  else if(c==='KeyP'&&e.shiftKey){e.preventDefault();if(current>0)playIndex(current-1,true)}
  else if(c==='Period'&&e.shiftKey){e.preventDefault();stepRate(1)}
  else if(c==='Comma'&&e.shiftKey){e.preventDefault();stepRate(-1)}
  else if(c==='Home'){e.preventDefault();video.currentTime=0}
  else if(c==='End'){e.preventDefault();if(video.duration)video.currentTime=video.duration}
  else if(/^(Digit|Numpad)[0-9]$/.test(c)&&video.duration>0){e.preventDefault();video.currentTime=video.duration*(+c.slice(-1))/10;showUI()}
});

setRate(rate,true);
syncVolume();
syncPlayState();
$('pfs').innerHTML=SVG_FS_ON;

$('videoSearch').addEventListener('input',e=>{
  listQuery=e.target.value;
  renderList();
});
document.querySelectorAll('[data-filter]').forEach(b=>{
  b.addEventListener('click',()=>{
    listFilter=b.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));
    renderList();
  });
});

$('prevBtn').onclick=()=>{if(current>0)playIndex(current-1,true)};
$('nextBtn').onclick=()=>{if(current<videos.length-1)playIndex(current+1,true)};

$('retryBtn').onclick=()=>{
  if(errAction==='leave'){location.href='subjects.html';return}
  hideError();
  if(current>=0)playIndex(current,true);else init();
};
$('skipBtn').onclick=()=>{
  if(current<videos.length-1){hideError();playIndex(current+1,true)}
};

loadPlayerScript().then(c=>{cryptoUtils=c}).catch(()=>{});
init();

})();
