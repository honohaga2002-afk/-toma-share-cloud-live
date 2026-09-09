(()=>{
'use strict';
const KEY='tomaViewMode';
const BREAKPOINT=900;
const qs=s=>document.querySelector(s);
function saved(){try{return localStorage.getItem(KEY)||'auto'}catch(e){return'auto'}}
function resolved(mode=saved()){
  if(mode==='desktop'||mode==='mobile')return mode;
  return window.innerWidth>=BREAKPOINT?'desktop':'mobile';
}
function apply(mode=saved()){
  const r=resolved(mode);
  document.body.classList.toggle('ui-desktop',r==='desktop');
  document.body.classList.toggle('ui-mobile',r==='mobile');
  document.body.dataset.viewMode=mode;
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
