(()=>{
'use strict';
const APPROVED=new Set(['home','drive','events','budgetNative','permit','more']);
let busy=false;
function desktop(){return document.body.classList.contains('ui-desktop');}
function visibleSection(){return [...document.querySelectorAll('main>section')].find(s=>!s.classList.contains('hidden'));}
function repair(){
  if(busy||!desktop())return;
  const sec=visibleSection();
  if(!sec||sec.id==='login')return;
  if(!APPROVED.has(sec.id)){
    const homeBtn=document.querySelector('.desktopSidebar button[data-target="home"]');
    if(homeBtn){busy=true;homeBtn.click();setTimeout(()=>busy=false,50);}
    return;
  }
  const approved=sec.querySelector(':scope > .pcApprovedPage');
  if(!approved){
    sec.removeAttribute('data-pc-page');
    const btn=document.querySelector(`.desktopSidebar button[data-target="${sec.id}"]`);
    if(btn){busy=true;btn.click();setTimeout(()=>busy=false,50);}
  }
}
function cleanupFolders(){
  if(!desktop())return;
  const pane=document.querySelector('#drive .pcFolderPane');
  if(!pane)return;
  const folders=[...pane.querySelectorAll('.pcFolder')];
  folders.forEach((el,i)=>{if(i>0)el.remove();});
  if(folders[0]){folders[0].textContent='▣ すべてのファイル';folders[0].classList.add('active');}
}
function run(){repair();cleanupFolders();}
document.addEventListener('DOMContentLoaded',()=>setTimeout(run,150));
document.addEventListener('click',()=>setTimeout(run,30),true);
window.addEventListener('toma:viewmode',()=>setTimeout(run,50));
let t;new MutationObserver(()=>{clearTimeout(t);t=setTimeout(run,40);}).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
setInterval(run,700);
})();
