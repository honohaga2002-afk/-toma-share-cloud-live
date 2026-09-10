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

  // Re-enter automatically when returning from an external Google editor.
  // This keeps the user from being dropped back at the login screen.
  setTimeout(()=>{
    if(!login.classList.contains('hidden')){
      try{enter.click();}catch(e){}
    }
  },120);
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',restore,{once:true});
}else{
  restore();
}

window.addEventListener('pageshow',restore);
})();
