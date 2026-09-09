(()=>{
'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let cache=null;
let loading=null;
async function loadEvents(){
  if(cache)return cache;
  if(loading)return loading;
  loading=(async()=>{
    try{
      const src=await fetch('/events.js?v=20260903-2',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('events.js '+r.status);return r.text();});
      const m=src.match(/const EVENTS\s*=\s*(\[[\s\S]*?\]);\s*function esc/);
      if(!m)throw new Error('EVENTS data not found');
      const base=Function('"use strict";return ('+m[1]+')')();
      let extra=[];
      try{
        const extraSrc=await fetch('/events-extra.js?v=20260908-1',{cache:'no-store'}).then(r=>r.ok?r.text():'');
        const em=extraSrc.match(/const EXTRA_EVENTS\s*=\s*(\[[\s\S]*?\]);\s*function esc/);
        if(em)extra=Function('"use strict";return ('+em[1]+')')();
      }catch(e){}
      cache=[...base,...extra];
      return cache;
    }finally{loading=null;}
  })();
  return loading;
}
function card(e){
  return `<a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer" style="display:block;text-decoration:none;color:inherit;border:1px solid #dbe8ef;border-radius:12px;padding:12px;background:#fff"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><strong style="font-size:15px;line-height:1.4">${esc(e.title)}</strong><span class="pill" style="white-space:nowrap">${esc(e.tag)}</span></div><div style="margin-top:7px;font-weight:800;color:#0b76a8">📅 ${esc(e.date)}　⏰ ${esc(e.time)}</div><div class="meta" style="margin-top:5px">📍 ${esc(e.place)}　› 公式情報</div></a>`;
}
async function renderDirect(){
  const mount=document.getElementById('tomakomaiEventsMount');
  if(!mount||mount.dataset.eventsRendered==='1')return;
  try{
    const events=await loadEvents();
    if(!document.body.contains(mount))return;
    mount.innerHTML=`<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px"><div><div class="title" style="font-size:19px">🎪 苫小牧イベント情報</div><div class="meta">地域行事・教室・展示・講座・体験会まで掲載</div></div><span class="pill">${events.length}件</span></div><div style="display:grid;gap:9px">${events.map(card).join('')}</div><a class="btn" href="https://www.city.tomakomai.hokkaido.jp/calendar/" target="_blank" rel="noopener noreferrer" style="display:block;text-align:center;margin-top:12px;text-decoration:none">苫小牧市 行事カレンダーを確認</a>`;
    mount.dataset.eventsRendered='1';
  }catch(err){
    if(document.body.contains(mount))mount.innerHTML=`<div class="empty">イベント情報の読み込みに失敗しました。<br><button class="btn" type="button" id="retryTomakomaiEvents" style="margin-top:10px">再読み込み</button></div>`;
  }
}
function moveLegacyList(){
  const mount=document.getElementById('tomakomaiEventsMount');
  const list=document.getElementById('tomakomaiEventList');
  if(!mount||!list||mount.contains(list))return false;
  mount.innerHTML='';
  mount.appendChild(list);
  mount.dataset.eventsRendered='1';
  return true;
}
function run(){
  requestAnimationFrame(()=>{
    if(!moveLegacyList())renderDirect();
  });
}
document.addEventListener('DOMContentLoaded',run);
document.addEventListener('click',e=>{
  if(e.target&&e.target.id==='retryTomakomaiEvents'){
    const mount=document.getElementById('tomakomaiEventsMount');
    if(mount){delete mount.dataset.eventsRendered;cache=null;renderDirect();}
    return;
  }
  setTimeout(run,0);
},true);
window.addEventListener('load',()=>setTimeout(run,100));
let t;
new MutationObserver(()=>{clearTimeout(t);t=setTimeout(run,20);}).observe(document.documentElement,{subtree:true,childList:true});
})();
