(()=>{'use strict';
const $=id=>document.getElementById(id);
const loginEl=$('login'),codeEl=$('code'),memberNameEl=$('memberName'),enterEl=$('enter'),statusEl=$('loginStatus'),navEl=$('nav'),toastEl=$('toast');
let C='',N='',cur='home',state={schedules:[],messages:[],items:[],minutes:[],reviews:[],permits:[]};
const SHEET_URL='https://docs.google.com/spreadsheets/d/1wi2FQ7crs8pXmu-43Gu-XdEnyJ_J6SI19N8eDxVSd68/edit';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function say(t){toastEl.textContent=t;toastEl.classList.remove('hidden');setTimeout(()=>toastEl.classList.add('hidden'),1800)}
async function api(method='GET',body){
  const r=await fetch('/api/data',{method,headers:{'Content-Type':'application/json','x-workspace-code':C},body:body?JSON.stringify(body):undefined,cache:'no-store'});
  const j=await r.json().catch(()=>({error:'通信エラー'})); if(!r.ok) throw new Error(j.error||'通信エラー'); return j;
}
async function load(){state=await api();render()}
async function doLogin(){
  C=codeEl.value.trim().toUpperCase();N=memberNameEl.value.trim()||'メンバー';
  if(!C){statusEl.className='err';statusEl.textContent='共有コードを入力してください。';return}
  enterEl.disabled=true;statusEl.className='meta';statusEl.textContent='接続中…';
  try{await load();localStorage.setItem('tomaCode',C);localStorage.setItem('tomaName',N);loginEl.classList.add('hidden');navEl.classList.remove('hidden');go('home');say('ログインしました')}
  catch(e){statusEl.className='err';statusEl.textContent='ログインできません：'+e.message}
  finally{enterEl.disabled=false}
}
enterEl.addEventListener('click',doLogin);
memberNameEl.addEventListener('keydown',e=>{if(e.key==='Enter')doLogin()});
codeEl.value=localStorage.getItem('tomaCode')||'TOMA-2026'; memberNameEl.value=localStorage.getItem('tomaName')||'';

function dataUrlToBlob(dataUrl){
  const m=String(dataUrl||'').match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
  if(!m) throw new Error('ファイル形式を読み取れません');
  const mime=m[1]||'application/octet-stream', raw=m[3]||'';
  const bytes=m[2]?Uint8Array.from(atob(raw),c=>c.charCodeAt(0)):new TextEncoder().encode(decodeURIComponent(raw));
  return new Blob([bytes],{type:mime});
}
function isPreviewable(f){
  const mime=(f.mime_type||'').toLowerCase(), name=(f.name||'').toLowerCase();
  return mime.startsWith('image/')||mime==='application/pdf'||name.endsWith('.pdf');
}
function openFile(f){
  try{
    if(!f?.file_data){alert('ファイルデータがありません');return}
    const blob=dataUrlToBlob(f.file_data);
    const url=URL.createObjectURL(blob);
    if(isPreviewable(f)){
      const w=window.open(url,'_blank');
      if(!w){location.href=url}
      setTimeout(()=>URL.revokeObjectURL(url),120000);
    }else{
      const a=document.createElement('a');a.href=url;a.download=f.name||'download';a.style.display='none';
      document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),120000);
      say('ダウンロードしました。ファイル/Excelアプリから開けます');
    }
  }catch(e){alert('ファイルを開けません：'+e.message)}
}

function homeR(){
  $('home').innerHTML=`<div class="panel"><div class="ok">🟢 クラウド接続中｜${esc(N)}</div></div><div class="grid">${[
    ['drive','📁','共有ドライブ',state.items.filter(x=>x.item_type==='file').length+'資料'],
    ['chat','💬','メッセージ',state.messages.length+'件'],['cal','📅','スケジュール',state.schedules.length+'件'],
    ['more','📝','議事録',state.minutes.length+'件'],['more','💡','反省点・改善',state.reviews.length+'件'],
    ['more','✅','許可・申請',state.permits.length+'件'],['more','🎪','苫小牧イベント','年間行事'],['more','👥','共有メンバー','同じコードで共有']
  ].map(x=>`<button class="card" data-go="${x[0]}"><div class="ico">${x[1]}</div><div class="ct">${x[2]}</div><div class="meta">${x[3]}</div></button>`).join('')}</div>`;
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
}
function driveR(){
  const el=$('drive'),folders=state.items.filter(x=>x.item_type==='folder'),files=state.items.filter(x=>x.item_type==='file');
  el.innerHTML=`<div class="panel"><div class="sectionTitle"><div class="title">📁 共有ドライブ</div><button class="btn light" id="refreshD">↻更新</button></div>
  <div class="row"><button class="btn" id="up">＋ファイル</button><button class="btn light" id="newF">＋フォルダ</button></div>
  <button class="btn sheetBtn" id="openSheet">Googleスプレッドシート共同編集</button>
  <div class="meta">Excel / Word / PowerPoint / PDF / 画像対応。1ファイル約2.5MBまで。OfficeファイルはiPhoneではダウンロード後に対応アプリで開きます。</div></div>
  <div class="panel"><div class="title">フォルダ</div>${folders.map(x=>`<div class="item row"><div style="flex:1">📂 ${esc(x.name)}</div><button class="btn danger" data-del="${x.id}">削除</button></div>`).join('')||'<div class="empty">まだありません</div>'}</div>
  <div class="panel"><div class="title">ファイル</div>${files.map(x=>`<div class="item"><div class="row"><div style="flex:1"><div class="title">📎 ${esc(x.name)}</div><div class="meta">Ver.${x.version||1}｜${esc(x.updated_by||'')}</div></div><button class="btn light" data-open="${x.id}">開く</button><button class="btn light" data-ver="${x.id}">更新版</button><button class="btn danger" data-del="${x.id}">削除</button></div></div>`).join('')||'<div class="empty">まだありません</div>'}</div>`;
  $('refreshD').onclick=async()=>{await load();go('drive')};
  $('newF').onclick=async()=>{const n=prompt('フォルダ名');if(n){await api('POST',{action:'folder',name:n,by:N});await load();go('drive')}};
  $('up').onclick=()=>pickFile();
  $('openSheet').onclick=()=>window.open(SHEET_URL,'_blank');
  document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openFile(files.find(x=>x.id===b.dataset.open)));
  document.querySelectorAll('[data-ver]').forEach(b=>b.onclick=()=>pickFile(b.dataset.ver));
  document.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{if(confirm('削除しますか？')){await api('POST',{action:'item_delete',id:b.dataset.del,by:N});await load();go('drive')}});
}
function pickFile(id){
  const i=document.createElement('input');i.type='file';i.accept='.xlsx,.xls,.doc,.docx,.ppt,.pptx,.pdf,image/*';
  i.onchange=async()=>{const f=i.files[0];if(!f)return;if(f.size>2500000)return alert('2.5MB以下のファイルを選んでください');
    const data=await new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=rej;fr.readAsDataURL(f)});
    say('アップロード中…');await api('POST',{action:id?'version':'file',id,name:f.name,mime_type:f.type,size:f.size,data,by:N});await load();go('drive');say('保存しました')};
  i.click();
}
function chatR(){
  $('chat').innerHTML=`<div class="panel"><div class="sectionTitle"><div class="title">💬 メッセージ</div><button class="btn light" id="refreshC">↻更新</button></div>${state.messages.map(x=>`<div class="item"><div>${esc(x.name)}</div><div class="meta">${esc(x.updated_by||'')}｜${x.created_at?new Date(x.created_at).toLocaleString('ja-JP'):''}</div></div>`).join('')||'<div class="empty">まだありません</div>'}<textarea id="msg" placeholder="連絡事項を入力"></textarea><button class="btn" id="send">送信</button></div>`;
  $('refreshC').onclick=async()=>{await load();go('chat')};$('send').onclick=async()=>{if(!$('msg').value.trim())return;await api('POST',{action:'message',text:$('msg').value.trim(),by:N});await load();go('chat')};
}
function calR(){
  const el=$('cal');
  el.innerHTML=`<div class="panel"><div class="sectionTitle"><div class="title">📅 スケジュール</div><button class="btn light" id="refreshS">↻更新</button></div>${state.schedules.map(x=>{const d=x.starts_at?new Date(x.starts_at):null;const when=d?d.toLocaleDateString('ja-JP')+' '+d.toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}):'';return `<div class="item row"><div style="flex:1"><div class="title">${esc(x.title)}</div><div class="meta">${when}${x.place?'｜'+esc(x.place):''}${x.memo?'｜'+esc(x.memo):''}</div></div><button class="btn danger" data-sdel="${x.id}">削除</button></div>`}).join('')||'<div class="empty">まだありません</div>'}
  <label class="fieldLabel">日付</label><input id="sdate" type="date"><label class="fieldLabel">開始時刻</label><input id="stime" type="time" value="09:00"><input id="ttl" placeholder="予定名"><input id="pl" placeholder="場所"><textarea id="sm" placeholder="メモ"></textarea><button class="btn" id="addS">追加</button></div>`;
  $('refreshS').onclick=async()=>{await load();go('cal')};
  $('addS').onclick=async()=>{const date=$('sdate').value,time=$('stime').value||'09:00',title=$('ttl').value.trim();if(!date)return alert('日付を選んでください');if(!title)return alert('予定名を入力してください');await api('POST',{action:'schedule',title,starts_at:`${date}T${time}:00+09:00`,ends_at:null,place:$('pl').value,memo:$('sm').value,by:N});await load();go('cal');say('予定を保存しました')};
  document.querySelectorAll('[data-sdel]').forEach(b=>b.onclick=async()=>{if(confirm('予定を削除しますか？')){await api('POST',{action:'schedule_delete',id:b.dataset.sdel});await load();go('cal')}});
}
function rec(x,k){const detail=k==='minute'?`${x.meeting_date||''} ${x.body||''} ${x.action_items||''}`:k==='review'?`${x.category||''} ${x.body||''}`:`${x.organization||''} ${x.contact||''} ${x.body||''}`;return `<div class="item row"><div style="flex:1"><div class="title">${esc(x.title)}</div><div class="meta">${esc(detail)}</div><div class="meta">更新：${esc(x.updated_by||'')}</div></div><button class="btn danger" data-rdel="${x.id}" data-kind="${k}">削除</button></div>`}
function moreR(){
  $('more').innerHTML=`<div class="panel"><div class="title">📝 議事録</div>${state.minutes.map(x=>rec(x,'minute')).join('')||'<div class="empty">まだありません</div>'}<input id="mt" placeholder="会議名"><input id="md" type="date"><textarea id="mb" placeholder="議事内容"></textarea><textarea id="ma" placeholder="決定事項・担当"></textarea><button class="btn" id="addM">保存</button></div>
  <div class="panel"><div class="title">💡 反省点・改善</div>${state.reviews.map(x=>rec(x,'review')).join('')||'<div class="empty">まだありません</div>'}<input id="rt" placeholder="タイトル"><select id="rc"><option>改善</option><option>反省</option><option>良かった点</option><option>次回対応</option></select><textarea id="rb" placeholder="内容"></textarea><button class="btn" id="addR">保存</button></div>
  <div class="panel"><div class="title">✅ 許可・申請先</div>${state.permits.map(x=>rec(x,'permit')).join('')||'<div class="empty">まだありません</div>'}<input id="pt" placeholder="申請名"><input id="po" placeholder="申請先・組織"><input id="pc" placeholder="連絡先"><textarea id="pb" placeholder="内容・期限・進捗"></textarea><button class="btn" id="addP">保存</button></div>
  <div class="panel"><div class="title">🎪 苫小牧 年間行事</div><div class="item"><span class="pill">冬</span>スケート・冬季イベント</div><div class="item"><span class="pill">春</span>地域行事・新年度イベント</div><div class="item"><span class="pill">夏</span>港まつり・地域フェス・屋外イベント</div><div class="item"><span class="pill">秋</span>文化・スポーツ・地域イベント</div></div>`;
  $('addM').onclick=async()=>{if(!$('mt').value.trim())return;await api('POST',{action:'minute',title:$('mt').value,meeting_date:$('md').value||null,body:$('mb').value,action_items:$('ma').value,by:N});await load();go('more')};
  $('addR').onclick=async()=>{if(!$('rt').value.trim())return;await api('POST',{action:'review',title:$('rt').value,category:$('rc').value,body:$('rb').value,by:N});await load();go('more')};
  $('addP').onclick=async()=>{if(!$('pt').value.trim())return;await api('POST',{action:'permit',title:$('pt').value,organization:$('po').value,contact:$('pc').value,body:$('pb').value,by:N});await load();go('more')};
  document.querySelectorAll('[data-rdel]').forEach(b=>b.onclick=async()=>{if(confirm('削除しますか？')){await api('POST',{action:'record_delete',kind:b.dataset.kind,id:b.dataset.rdel});await load();go('more')}});
}
function render(){if(cur==='home')homeR();if(cur==='drive')driveR();if(cur==='chat')chatR();if(cur==='cal')calR();if(cur==='more')moreR()}
function go(p){cur=p;document.querySelectorAll('main>section').forEach(s=>s.classList.add('hidden'));$(p).classList.remove('hidden');document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('on',n.dataset.p===p));render()}
document.querySelectorAll('.nav').forEach(n=>n.onclick=()=>go(n.dataset.p));
})();