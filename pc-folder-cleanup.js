(()=>{
'use strict';
function cleanPcFolders(){
  if(!document.body.classList.contains('ui-desktop')) return;
  const pane=document.querySelector('#drive .pcFolderPane');
  if(!pane) return;
  const folders=[...pane.querySelectorAll('.pcFolder')];
  folders.forEach((el,i)=>{ if(i>0) el.remove(); });
  const first=folders[0];
  if(first){ first.textContent='▣ すべてのファイル'; first.classList.add('active'); }
}
function runSoon(){ setTimeout(cleanPcFolders,0); setTimeout(cleanPcFolders,80); }
document.addEventListener('DOMContentLoaded',runSoon);
document.addEventListener('click',runSoon);
window.addEventListener('toma:viewmode',runSoon);
const mo=new MutationObserver(runSoon);
mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
runSoon();
})();
