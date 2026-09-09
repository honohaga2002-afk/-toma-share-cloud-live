(()=>{
'use strict';
const KEEP_LABEL='▣ すべてのファイル';
function cleanPcFolders(){
  if(!document.body.classList.contains('ui-desktop')) return;
  const drive=document.getElementById('drive');
  if(!drive) return;
  const pane=drive.querySelector('.pcFolderPane');
  if(!pane) return;
  const head=pane.querySelector('.pcPaneHead');
  const current=[...pane.querySelectorAll('.pcFolder')];
  if(current.length===1 && current[0].textContent.trim()===KEEP_LABEL) return;
  pane.innerHTML='';
  if(head) pane.appendChild(head);
  else pane.insertAdjacentHTML('beforeend','<div class="pcPaneHead"><b>フォルダ</b><button type="button" aria-label="新規フォルダ">＋</button></div>');
  const only=document.createElement('div');
  only.className='pcFolder active';
  only.textContent=KEEP_LABEL;
  pane.appendChild(only);
}
let timer;
function schedule(){
  clearTimeout(timer);
  timer=setTimeout(cleanPcFolders,20);
}
document.addEventListener('DOMContentLoaded',()=>{cleanPcFolders();setTimeout(cleanPcFolders,100);setTimeout(cleanPcFolders,400);});
document.addEventListener('click',()=>{setTimeout(cleanPcFolders,30);setTimeout(cleanPcFolders,150);});
window.addEventListener('toma:viewmode',()=>{setTimeout(cleanPcFolders,50);});
const mo=new MutationObserver(schedule);
mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
setInterval(cleanPcFolders,1000);
})();
