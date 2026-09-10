(()=>{
'use strict';

const OFFICE_RE=/\.(?:xlsx?|csv|docx?|pptx?)$/i;
const GOOGLE_HOST_RE=/^https:\/\/(?:docs|drive)\.google\.com\//i;

function parseContent(value){
  if(!value)return null;
  if(typeof value==='object')return value;
  if(typeof value!=='string')return null;
  try{return JSON.parse(value);}catch(e){return null;}
}

function derivedGoogleEditUrl(file,content){
  const driveFileId=String(content?.driveFileId||file?.driveFileId||'').trim();
  if(!driveFileId)return '';

  const googleMimeType=String(content?.googleMimeType||file?.googleMimeType||'');
  if(googleMimeType==='application/vnd.google-apps.spreadsheet'){
    return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(driveFileId)}/edit`;
  }
  if(googleMimeType==='application/vnd.google-apps.presentation'){
    return `https://docs.google.com/presentation/d/${encodeURIComponent(driveFileId)}/edit`;
  }
  if(googleMimeType==='application/vnd.google-apps.document'){
    return `https://docs.google.com/document/d/${encodeURIComponent(driveFileId)}/edit`;
  }

  // For non-native Office files let Drive choose the correct editor/viewer.
  return `https://drive.google.com/open?id=${encodeURIComponent(driveFileId)}`;
}

function editUrl(file){
  const content=parseContent(file?.content)||{};
  const candidates=[
    content.googleEditLink,
    content.webViewLink,
    file?.googleEditLink,
    file?.webViewLink
  ];
  const googleUrl=candidates.find(url=>typeof url==='string'&&GOOGLE_HOST_RE.test(url));
  return googleUrl||derivedGoogleEditUrl(file,content);
}

function canGoogleEdit(file){
  return OFFICE_RE.test(String(file?.name||''))&&!!editUrl(file);
}

function isMobile(){
  return document.body.classList.contains('ui-mobile')||/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)||window.innerWidth<700;
}

let cachedItems=[];
let loading=false;

async function loadItems(){
  if(loading)return;
  loading=true;
  try{
    const workspaceCode=localStorage.getItem('tomaCode')||document.getElementById('code')?.value||'TOMA-2026';
    const response=await fetch('/api/data',{
      headers:{'x-workspace-code':workspaceCode},
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

function rememberSession(){
  try{
    localStorage.setItem('tomaLastPage','drive');
    const name=document.getElementById('memberName')?.value||localStorage.getItem('tomaName')||'';
    if(name)localStorage.setItem('tomaName',name);
    localStorage.setItem('tomaCode',localStorage.getItem('tomaCode')||'TOMA-2026');
  }catch(e){}
}

function openGoogleEdit(file){
  const url=editUrl(file);
  if(!url){
    alert('このファイルのGoogle編集リンクを取得できませんでした。');
    return;
  }

  rememberSession();

  // iPhone/iPad/PWA/in-app browsers can block scripted new tabs.
  // On mobile, same-window navigation is the most reliable; session restore handles return.
  if(isMobile()){
    window.location.assign(url);
    return;
  }

  const opened=window.open(url,'_blank');
  if(opened){
    try{opened.opener=null;}catch(e){}
    return;
  }

  window.location.assign(url);
}

function apply(){
  document.querySelectorAll('.fileItem').forEach(row=>{
    const open=row.querySelector('[data-open]');
    const actions=row.querySelector('.fileActions');
    if(!open||!actions)return;

    const id=String(open.dataset.open||'');
    const file=cachedItems.find(item=>String(item.id)===id);

    actions.querySelectorAll('[data-edit]').forEach(button=>button.remove());

    let button=actions.querySelector('[data-google-drive-edit]');
    if(!file||!canGoogleEdit(file)){
      button?.remove();
      return;
    }

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
      openGoogleEdit(file);
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
