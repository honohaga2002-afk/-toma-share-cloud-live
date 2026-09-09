(()=>{
'use strict';
const KEY='tomaViewMode';
const BREAKPOINT=900;
const qs=s=>document.querySelector(s);
const qsa=s=>[...document.querySelectorAll(s)];
const desktopLabels={
  home:'<span>🏠</span>ホーム',
  drive:'<span>📁</span>ファイル共有',
  cal:'<span>📅</span>イベント一覧',
  budgetNative:'<span>💰</span>予算管理',
  more:'<span>📄</span>申請・申し込み'
};
function saved(){try{return localStorage.getItem(KEY)||'auto'}catch(e){return'auto'}}
function resolved(mode=saved()){
  if(mode==='desktop'||mode==='mobile')return mode;
  return window.innerWidth>=BREAKPOINT?'desktop':'mobile';
}
function ensurePcSettings(){
  const nav=qs('#nav');
  if(!nav||qs('[data-pc-settings]'))return;
  const b=document.createElement('button');
  b.className='nav pc-settings';
  b.type='button';
  b.dataset.p='more';
  b.dataset.pcSettings='1';
  b.innerHTML='<span>⚙️</span>設定';
  nav.appendChild(b);
}
function decorateNav(r){
  ensurePcSettings();
  qsa('#nav .nav').forEach(b=>{
    if(!b.dataset.mobileHtml)b.dataset.mobileHtml=b.innerHTML;
    const p=b.dataset.p||'';
    b.classList.toggle('pc-hide',r==='desktop'&&(p==='chat'||p==='tasks'));
    if(r==='desktop'&&desktopLabels[p]&&!b.dataset.pcSettings)b.innerHTML=desktopLabels[p];
    if(r==='mobile'&&!b.dataset.pcSettings)b.innerHTML=b.dataset.mobileHtml;
  });
  const settings=qs('[data-pc-settings]');
  if(settings)settings.style.display=r==='desktop'?'flex':'none';
}
function apply(mode=saved()){
  const r=resolved(mode);
  document.body.classList.toggle('ui-desktop',r==='desktop');
  document.body.classList.toggle('ui-mobile',r==='mobile');
  document.body.dataset.viewMode=mode;
  decorateNav(r);
  const sel=qs('#viewModeSelect');
  if(sel&&sel.value!==mode)sel.value=mode;
  window.dispatchEvent(new CustomEvent('toma:viewmode',{detail:{mode,resolved:r}}));
}
function bind(){
  const sel=qs('#viewModeSelect');
  if(sel&&!sel.dataset.bound){
    sel.dataset.bound='1';
    sel.value=saved();
    sel.addEventListener('change',()=>{try{localStorage.setItem(KEY,sel.value)}catch(e){}apply(sel.value)});
  }
  apply();
}
let t;
window.addEventListener('resize',()=>{if(saved()!=='auto')return;clearTimeout(t);t=setTimeout(()=>apply('auto'),120)});
document.addEventListener('DOMContentLoaded',bind);
bind();
})();
