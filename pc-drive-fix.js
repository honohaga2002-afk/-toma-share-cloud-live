(()=>{
'use strict';
function isDesktop(){return document.body.classList.contains('ui-desktop');}
function cleanDrive(){
  if(!isDesktop())return;
  const drive=document.getElementById('drive');
  if(!drive||drive.classList.contains('hidden'))return;
  const pane=drive.querySelector('.pcFolderPane');
  if(pane){
    pane.innerHTML='<div class="pcPaneHead"><b>フォルダ</b><button type="button" aria-label="新規フォルダ">＋</button></div><div class="pcFolder active">▣ すべてのファイル</div>';
  }
}
function run(){cleanDrive();}
document.addEventListener('DOMContentLoaded',()=>setTimeout(run,150));
document.addEventListener('click',()=>setTimeout(run,80));
window.addEventListener('toma:viewmode',()=>setTimeout(run,80));
const mo=new MutationObserver(()=>setTimeout(run,50));
mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
})();
