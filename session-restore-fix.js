(()=>{
'use strict';

function restore(){
  const name=localStorage.getItem('tomaName')||'';
  const code=localStorage.getItem('tomaCode')||'TOMA-2026';
  const login=document.getElementById('login');
  const enter=document.getElementById('enter');
  const nameEl=document.getElementById('memberName');
  const codeEl=document.getElementById('code');

  if(!name||!login||!enter)return;
  if(login.classList.contains('hidden'))return;

  if(nameEl&&!nameEl.value)nameEl.value=name;
  if(codeEl)codeEl.value=code;

  // Restore the signed-in view immediately before the network refresh finishes.
  // This prevents iOS from showing the login screen when returning from Google.
  login.classList.add('hidden');
  document.getElementById('nav')?.classList.remove('hidden');

  setTimeout(()=>{
    try{
      enter.click();
    }catch(e){
      login.classList.remove('hidden');
    }
  },0);
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',restore,{once:true});
}else{
  restore();
}

window.addEventListener('pageshow',restore);
})();
