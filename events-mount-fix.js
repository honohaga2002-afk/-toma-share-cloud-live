(()=>{
'use strict';
function moveEventsIntoMount(){
  const mount=document.getElementById('tomakomaiEventsMount');
  const list=document.getElementById('tomakomaiEventList');
  if(!mount||!list)return;
  if(mount.contains(list))return;
  mount.innerHTML='';
  mount.appendChild(list);
}
function run(){requestAnimationFrame(moveEventsIntoMount);}
document.addEventListener('DOMContentLoaded',run);
document.addEventListener('click',()=>setTimeout(run,0),true);
window.addEventListener('load',()=>setTimeout(run,350));
new MutationObserver(run).observe(document.documentElement,{subtree:true,childList:true});
})();
