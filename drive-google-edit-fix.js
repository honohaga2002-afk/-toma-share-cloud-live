(()=>{
'use strict';

const OFFICE_RE=/\.(?:xlsx?|csv|docx?|pptx?)$/i;

function parseContent(value){
  if(!value)return null;
  if(typeof value==='object')return value;
  if(typeof value!=='string')return null;
  try{return JSON.parse(value);}catch(e){return null;}
}

function editUrl(file){
  const content=parseContent(file?.content)||{};
  const candidates=[
    content.googleEditLink,
    content.webViewLink,
    typeof file?.file_data==='string' ? file.file_data : ''
  ];
  return candidates.find(url=>typeof url==='string'&&/^https?:\/\//i.test(url))||'';
}

function canGoogleEdit(file){
  return OFFICE_RE.test(String(file?.name||''))&&!!editUrl(file);
}

let cachedItems=[];
let loading=false;

async function loadItems(){
  if(loading)return;
  loading=true;
  try{
    const response=await fetch('/api/data',{
      headers:{'x-workspace-code':'TOMA-2026'},
      cache:'no-store',
      credentials:'same-origin'
    });
    if(!response.ok)return;
    const data=await response.json();
    cachedItems=Array.isArray(data.items)?data.items:[];
    apply();
  }catch(e){
    console.error('Google edit button fix:',e);
  }finally{
    loading=false;
  }
}

function apply(){
  document.querySelectorAll('.fileItem').forEach(row=>{
    const open=row.querySelector('[data-open]');
    const actions=row.querySelector('.fileActions');
    if(!open||!actions)return;

    const id=String(open.dataset.open||'');
    const file=cachedItems.find(item=>String(item.id)===id);
    if(!file||!canGoogleEdit(file))return;

    // Keep only one Google edit button.
    const existing=[...actions.querySelectorAll('[data-edit],[data-google-drive-edit]')];
    existing.slice(1).forEach(button=>button.remove());

    let button=existing[0];
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.className='btn';
      button.dataset.googleDriveEdit=id;
      button.style.background='#16864f';
      button.style.color='#fff';
      const update=actions.querySelector('[data-ver]');
      actions.insertBefore(button,update||null);
    }

    button.textContent='Googleドライブで編集';
    button.onclick=event=>{
      event.preventDefault();
      event.stopPropagation();
      const url=editUrl(file);
      if(!url)return;
      window.open(url,'_blank','noopener,noreferrer');
    };
  });
}

const observer=new MutationObserver(()=>{
  apply();
  if(document.querySelector('.fileItem')&&!cachedItems.length)loadItems();
});

function start(){
  observer.observe(document.body,{childList:true,subtree:true});
  loadItems();
  apply();
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',start,{once:true});
}else{
  start();
}
})();
