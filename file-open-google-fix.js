(()=>{
'use strict';

const GOOGLE_RE=/^https:\/\/(?:docs|drive)\.google\.com\//i;
let items=[];
let loading=false;

function parseContent(value){
  if(!value)return {};
  if(typeof value==='object')return value;
  try{return JSON.parse(value);}catch(e){return {};}
}

function isMedia(file){
  const mime=String(file?.mime_type||'').toLowerCase();
  const name=String(file?.name||'').toLowerCase();
  return mime.startsWith('image/')||mime.startsWith('video/')||/\.(?:jpe?g|png|webp|gif|heic|heif|mp4|mov|m4v|webm)$/i.test(name);
}

function googleUrl(file){
  const content=parseContent(file?.content);
  const candidates=[
    content.googleEditLink,
    content.webViewLink,
    file?.googleEditLink,
    file?.webViewLink,
    file?.file_data
  ];
  return candidates.find(url=>typeof url==='string'&&GOOGLE_RE.test(url))||'';
}

async function loadItems(){
  if(loading)return;
  loading=true;
  try{
    const code=localStorage.getItem('tomaCode')||document.getElementById('code')?.value||'TOMA-2026';
    const response=await fetch('/api/data',{
      headers:{'x-workspace-code':code},
      credentials:'same-origin',
      cache:'no-store'
    });
    if(!response.ok)return;
    const data=await response.json();
    items=Array.isArray(data.items)?data.items:[];
  }catch(e){
    console.error('file open fix:',e);
  }finally{
    loading=false;
  }
}

function openGoogle(url){
  try{localStorage.setItem('tomaLastPage','drive');}catch(e){}
  const isiOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  if(isiOS){
    window.location.assign(url);
    return;
  }
  const a=document.createElement('a');
  a.href=url;
  a.target='_blank';
  a.rel='noopener noreferrer';
  a.style.display='none';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

document.addEventListener('click',async event=>{
  const button=event.target.closest?.('[data-open]');
  if(!button)return;
  const id=String(button.dataset.open||'');
  if(!id)return;

  let file=items.find(x=>String(x.id)===id);
  if(!file){
    await loadItems();
    file=items.find(x=>String(x.id)===id);
  }
  if(!file||isMedia(file))return;

  const url=googleUrl(file);
  if(!url)return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  openGoogle(url);
},true);

window.addEventListener('pageshow',()=>{ loadItems(); });
document.addEventListener('DOMContentLoaded',()=>{ loadItems(); },{once:true});
setTimeout(loadItems,500);
})();
