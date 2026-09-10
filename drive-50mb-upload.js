(()=>{
'use strict';

const MAX_SIZE=50*1024*1024;
let pendingVersionId=null;
let pickedFiles=[];
let latestItems=[];
let overlay=null;

function esc(s){
  return String(s??'').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function fmt(bytes){
  const n=Number(bytes)||0;
  if(n<1024)return `${n} B`;
  if(n<1024*1024)return `${(n/1024).toFixed(1)} KB`;
  return `${(n/1024/1024).toFixed(1)} MB`;
}

function headers(){
  const name=localStorage.getItem('tomaName')||'メンバー';
  return {
    'Content-Type':'application/json',
    'x-workspace-code':'TOMA-2026',
    'x-member-name':encodeURIComponent(name)
  };
}

async function getItems(){
  const response=await fetch('/api/data',{
    headers:{
      'x-workspace-code':'TOMA-2026',
      'x-member-name':encodeURIComponent(localStorage.getItem('tomaName')||'メンバー')
    },
    cache:'no-store',
    credentials:'same-origin'
  });
  if(!response.ok)throw new Error(`保存先を取得できません (${response.status})`);
  const data=await response.json();
  latestItems=Array.isArray(data.items)?data.items:[];
  return latestItems;
}

function closeOverlay(){
  overlay?.remove();
  overlay=null;
  pickedFiles=[];
  pendingVersionId=null;
}

async function showOverlay(files){
  pickedFiles=files;
  const items=await getItems();
  const folders=items.filter(x=>x.item_type==='folder');
  const current=pendingVersionId
    ?items.find(x=>String(x.id)===String(pendingVersionId))
    :null;
  const defaultParent=current?.parent_id||'';

  closeExistingOnly();
  overlay=document.createElement('div');
  overlay.id='tomaDirectUpload50';
  overlay.style.cssText='position:fixed;inset:0;z-index:30000;background:rgba(10,30,45,.48);display:grid;place-items:center;padding:16px';
  overlay.innerHTML=`
    <div style="width:min(560px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:18px;padding:18px;box-shadow:0 18px 50px rgba(0,0,0,.28)">
      <div style="font-size:20px;font-weight:900;color:#17364d;margin-bottom:8px">${pendingVersionId?'更新版を保存':'ファイルを保存'}</div>
      <div style="font-size:13px;color:#587386;margin-bottom:14px">Google Driveへ直接保存します。1ファイル50MBまで。</div>
      <div style="display:grid;gap:8px;margin-bottom:14px">
        ${files.map(f=>`<div style="padding:10px 12px;background:#f3f7fa;border-radius:10px"><strong style="display:block;word-break:break-word">${esc(f.name)}</strong><span style="font-size:12px;color:#6b8292">${fmt(f.size)}</span></div>`).join('')}
      </div>
      <label style="display:block;font-weight:800;color:#17364d;margin-bottom:6px">保存先</label>
      <select data-direct-parent style="width:100%;box-sizing:border-box;padding:12px;border:1px solid #cad8e1;border-radius:10px;font-size:16px;margin-bottom:14px">
        <option value="" ${defaultParent?'':'selected'}>共有ドライブ直下</option>
        ${folders.map(f=>`<option value="${esc(f.id)}" ${String(f.id)===String(defaultParent)?'selected':''}>${esc(f.name)}</option>`).join('')}
      </select>
      <div data-direct-status style="min-height:22px;font-size:13px;font-weight:700;color:#587386;margin-bottom:10px"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <button type="button" data-direct-save style="border:0;border-radius:10px;padding:13px;background:#0b76d1;color:#fff;font-size:16px;font-weight:900">保存</button>
        <button type="button" data-direct-cancel style="border:1px solid #cbd8e0;border-radius:10px;padding:13px;background:#fff;color:#17364d;font-size:16px;font-weight:900">キャンセル</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('[data-direct-cancel]').onclick=closeOverlay;
  overlay.querySelector('[data-direct-save]').onclick=saveAll;
}

function closeExistingOnly(){
  document.getElementById('tomaDirectUpload50')?.remove();
}

async function postUpload(body){
  const response=await fetch('/api/drive-upload',{
    method:'POST',
    headers:headers(),
    credentials:'same-origin',
    body:JSON.stringify(body)
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||`アップロードAPIエラー (${response.status})`);
  return data;
}

function putToGoogle(url,file,status,index,total){
  return new Promise((resolve,reject)=>{
    const xhr=new XMLHttpRequest();
    xhr.open('PUT',url,true);
    xhr.setRequestHeader('Content-Type',file.type||'application/octet-stream');
    xhr.upload.onprogress=e=>{
      if(!e.lengthComputable)return;
      const pct=Math.max(0,Math.min(100,Math.round(e.loaded/e.total*100)));
      status.textContent=`${index+1}/${total} ${file.name} をアップロード中… ${pct}%`;
    };
    xhr.onerror=()=>reject(new Error('Google Driveへの通信に失敗しました'));
    xhr.onload=()=>{
      if(xhr.status<200||xhr.status>=300){
        reject(new Error(`Google Driveアップロードエラー (${xhr.status})`));
        return;
      }
      let data={};
      try{data=xhr.responseText?JSON.parse(xhr.responseText):{};}catch(e){}
      resolve(data);
    };
    xhr.send(file);
  });
}

async function uploadOne(file,parentId,replaceId,status,index,total){
  status.textContent=`${index+1}/${total} ${file.name} のアップロードを準備中…`;
  const year=Number(document.getElementById('workspaceYear')?.value)||2026;
  const init=await postUpload({
    action:'init',
    name:file.name,
    mime_type:file.type||'application/octet-stream',
    size:file.size,
    parent_id:parentId||null,
    year
  });

  const uploaded=await putToGoogle(init.uploadUrl,file,status,index,total);
  const driveId=uploaded.id;
  if(!driveId)throw new Error('Google DriveのファイルIDを取得できませんでした');

  status.textContent=`${index+1}/${total} ${file.name} をTOMA SHAREへ登録中…`;
  await postUpload({
    action:'finalize',
    drive_file_id:driveId,
    name:file.name,
    mime_type:file.type||'application/octet-stream',
    size:file.size,
    parent_id:parentId||null,
    replace_id:replaceId||null,
    year
  });
}

async function saveAll(){
  if(!overlay||!pickedFiles.length)return;
  const save=overlay.querySelector('[data-direct-save]');
  const cancel=overlay.querySelector('[data-direct-cancel]');
  const status=overlay.querySelector('[data-direct-status]');
  const parent=overlay.querySelector('[data-direct-parent]').value||'';
  save.disabled=true;
  cancel.disabled=true;

  try{
    for(let i=0;i<pickedFiles.length;i++){
      await uploadOne(
        pickedFiles[i],
        parent,
        i===0?pendingVersionId:null,
        status,
        i,
        pickedFiles.length
      );
    }
    status.textContent='保存しました。画面を更新します…';
    setTimeout(()=>location.reload(),500);
  }catch(e){
    console.error('50MB upload failed:',e);
    status.textContent='保存に失敗しました';
    alert('保存できませんでした。\n\n'+e.message);
    save.disabled=false;
    cancel.disabled=false;
  }
}

// 更新版ボタンを押したファイルIDを覚える。
document.addEventListener('click',event=>{
  const versionButton=event.target.closest?.('[data-ver]');
  if(versionButton){
    pendingVersionId=versionButton.dataset.ver||null;
    return;
  }

  const uploadTrigger=event.target.closest?.('#addFile,#pickFile,#uploadFile,[data-upload],button');
  if(uploadTrigger&&!versionButton){
    const txt=String(uploadTrigger.textContent||'');
    if(/追加|アップロード|ファイルを選択/.test(txt))pendingVersionId=null;
  }
},true);

// app.jsの2.5MB/Base64保存処理より先にファイル選択を受け取り、直接Drive保存へ切り替える。
document.addEventListener('change',event=>{
  const input=event.target;
  if(!(input instanceof HTMLInputElement))return;
  if(input.type!=='file'||input.name!=='toma-share-file')return;

  const files=Array.from(input.files||[]);
  if(!files.length)return;

  event.preventDefault();
  event.stopImmediatePropagation();

  const tooLarge=files.find(file=>file.size>MAX_SIZE);
  if(tooLarge){
    alert(`「${tooLarge.name}」は50MBを超えています。1ファイル50MB以下にしてください。`);
    input.remove();
    pendingVersionId=null;
    return;
  }

  input.remove();
  showOverlay(files).catch(e=>{
    console.error(e);
    alert('保存画面を開けません。\n\n'+e.message);
    pendingVersionId=null;
  });
},true);

})();
