(()=>{
'use strict';

const $=id=>document.getElementById(id);

let C='';
let N='';
let cur='home';
let presenceTimer=null;

let state={
  schedules:[],
  messages:[],
  items:[],
  minutes:[],
  reviews:[],
  permits:[],
  onlineMembers:[]
};

let selectedUploadFile=null;
let selectedVersionId=null;
let selectedFolderId='';

const SHEET_URL=
'https://docs.google.com/spreadsheets/d/1wi2FQ7crs8pXmu-43Gu-XdEnyJ_J6SI19N8eDxVSd68/edit';

const esc=s=>String(s??'').replace(
  /[&<>"']/g,
  c=>({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[c])
);

function idStr(v){
  return v===null||v===undefined?'':String(v);
}

function sameId(a,b){
  return idStr(a)===idStr(b);
}

function openExternal(url){
  if(!url)return false;

  const a=document.createElement('a');
  a.href=url;
  a.target='_blank';
  a.rel='noopener noreferrer';
  a.style.display='none';

  document.body.appendChild(a);
  a.click();
  a.remove();

  return true;
}

function say(t){
  const el=$('toast');
  if(!el)return;

  el.textContent=t;
  el.classList.remove('hidden');

  setTimeout(()=>{
    el.classList.add('hidden');
  },1800);
}

/* ==============================
   API
============================== */

async function api(method='GET',body=null){

  const headers={
    'Content-Type':'application/json',
    'x-workspace-code':C
  };

  /* iPhone/Safari対策：
     日本語をHTTPヘッダーへ直接入れない */
  if(N){
    headers['x-member-name']=encodeURIComponent(N);
  }

  const options={
    method,
    headers,
    cache:'no-store'
  };

  if(body){
    options.body=JSON.stringify(body);
  }

  try{

    const r=await fetch('/api/data',options);

    const text=await r.text();

    let j={};

    try{
      j=text ? JSON.parse(text) : {};
    }catch(e){
      j={
        error:'APIから正常なデータが返りませんでした'
      };
    }

    if(!r.ok){
      throw new Error(
        j.error||
        `通信エラー (${r.status})`
      );
    }

    return j;

  }catch(e){

    console.error(
      'TOMA SHARE API ERROR:',
      e
    );

    if(e instanceof TypeError){
      throw new Error(
        'サーバーへ接続できませんでした'
      );
    }

    throw e;
  }
}

async function load(){

  const d=await api();

  state={
    schedules:d.schedules||[],
    messages:d.messages||[],
    items:d.items||[],
    minutes:d.minutes||[],
    reviews:d.reviews||[],
    permits:d.permits||[],
    onlineMembers:d.onlineMembers||[]
  };
}


/* ==============================
   ログイン
============================== */

async function doLogin(){

  const codeEl=$('code');
  const nameEl=$('memberName');
  const btn=$('enter');
  const status=$('loginStatus');

  if(!codeEl||!btn){
    alert('ログイン画面の読み込みに失敗しました');
    return;
  }

  C=codeEl.value.trim().toUpperCase();

  N=nameEl
    ?nameEl.value.trim()
    :'';

  if(!N){
    N='メンバー';
  }

  if(!C){

    if(status){
      status.className='err';
      status.textContent=
        '共有コードを入力してください。';
    }

    return;
  }

  btn.disabled=true;

  if(status){
    status.className='meta';
    status.textContent='接続中…';
  }

  try{

    await load();

    localStorage.setItem(
      'tomaCode',
      C
    );

    localStorage.setItem(
      'tomaName',
      N
    );

    const login=$('login');
    const nav=$('nav');

    if(login){
      login.classList.add('hidden');
    }

    if(nav){
      nav.classList.remove('hidden');
    }

    go('home');

    startPresence();

    say('ログインしました');

  }catch(e){

    console.error(e);

    if(status){

      status.className='err';

      status.textContent=
        'ログインできません：'+
        e.message;

    }else{

      alert(
        'ログインできません：'+
        e.message
      );
    }

  }finally{

    btn.disabled=false;
  }
}


/* ==============================
   オンライン
============================== */

function startPresence(){

  if(presenceTimer){
    clearInterval(presenceTimer);
  }

  presenceTimer=setInterval(
    async()=>{

      if(!C||!N)return;

      try{
        await load();
        render();
      }catch(e){
        console.error(e);
      }

    },
    30000
  );
}

function onlineNames(){

  return (
    state.onlineMembers||[]
  )
    .map(x=>x.member_name)
    .filter(Boolean);
}


/* ==============================
   ファイル
============================== */

function dataUrlToBlob(dataUrl){

  const m=String(dataUrl||'').match(
    /^data:([^;,]+)?(;base64)?,(.*)$/s
  );

  if(!m){
    throw new Error(
      'ファイル形式を読み取れません'
    );
  }

  const mime=
    m[1]||
    'application/octet-stream';

  const raw=m[3]||'';

  let bytes;

  if(m[2]){

    bytes=Uint8Array.from(
      atob(raw),
      c=>c.charCodeAt(0)
    );

  }else{

    bytes=new TextEncoder().encode(
      decodeURIComponent(raw)
    );
  }

  return new Blob(
    [bytes],
    {type:mime}
  );
}

function isPreviewable(f){

  const mime=(
    f.mime_type||''
  ).toLowerCase();

  const name=(
    f.name||''
  ).toLowerCase();

  return (
    mime.startsWith('image/')||
    mime==='application/pdf'||
    name.endsWith('.pdf')
  );
}

function driveUrl(f){

  if(!f)return null;

  if(
    typeof f.file_data==='string' &&
    /^https?:\/\//i.test(f.file_data)
  ){
    return f.file_data;
  }

  let content=f.content;

  if(typeof content==='string'){

    try{
      content=JSON.parse(content);
    }catch(e){}
  }

  if(
    content &&
    typeof content==='object' &&
    content.webViewLink
  ){
    return content.webViewLink;
  }

  return null;
}

function openFile(f){

  try{

    if(!f){
      alert('ファイルが見つかりません');
      return;
    }

    const url=driveUrl(f);

    if(url){
      openExternal(url);
      return;
    }

    if(!f.file_data){
      alert('ファイルデータがありません');
      return;
    }

    const blob=dataUrlToBlob(
      f.file_data
    );

    const blobUrl=
      URL.createObjectURL(blob);

    const a=
      document.createElement('a');

    a.href=blobUrl;

    if(isPreviewable(f)){

      a.target='_blank';
      a.rel='noopener noreferrer';

    }else{

      a.download=
        f.name||
        'download';
    }

    a.style.display='none';

    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(()=>{
      URL.revokeObjectURL(blobUrl);
    },120000);

  }catch(e){

    alert(
      'ファイルを開けません：'+
      e.message
    );
  }
}

function pickFile(id=null){

  const input=
    document.createElement('input');

  input.type='file';

  input.accept=
    '.xlsx,.xls,.csv,.doc,.docx,.ppt,.pptx,.pdf,image/*';

  input.style.position='fixed';
  input.style.left='-9999px';
  input.style.top='0';
  input.style.opacity='0';
  input.style.width='1px';
  input.style.height='1px';

  document.body.appendChild(input);

  const cleanup=()=>{

    setTimeout(()=>{

      if(input.parentNode){
        input.remove();
      }

    },0);
  };

  input.onchange=()=>{

    const f=
      input.files &&
      input.files[0];

    if(!f){
      cleanup();
      return;
    }

    if(f.size>2500000){

      alert(
        '現在は1ファイル2.5MB以下でアップロードしてください'
      );

      cleanup();
      return;
    }

    selectedUploadFile=f;
    selectedVersionId=id||null;

    if(id){

      const old=
        state.items.find(
          x=>sameId(x.id,id)
        );

      selectedFolderId=
        old&&old.parent_id
          ?idStr(old.parent_id)
          :'';

    }else{

      selectedFolderId='';
    }

    go('drive');
    cleanup();
  };

  input.click();
}

async function saveSelectedFile(){

  const f=selectedUploadFile;

  if(!f){
    alert('ファイルを選択してください');
    return;
  }

  const btn=$('saveSelectedFile');

  try{

    if(btn){
      btn.disabled=true;
      btn.textContent='保存中…';
    }

    say('Google Driveへ保存中…');

    const data=await new Promise(
      (resolve,reject)=>{

        const fr=new FileReader();

        fr.onload=()=>{
          resolve(fr.result);
        };

        fr.onerror=()=>{
          reject(
            new Error(
              'ファイルを読み込めませんでした'
            )
          );
        };

        fr.readAsDataURL(f);
      }
    );

    await api(
      'POST',
      {
        action:
          selectedVersionId
            ?'version'
            :'file',

        id:
          selectedVersionId||
          null,

        parent_id:
          selectedFolderId||
          null,

        name:f.name,

        mime_type:
          f.type||
          'application/octet-stream',

        size:f.size,

        data,

        by:N
      }
    );

    selectedUploadFile=null;
    selectedVersionId=null;
    selectedFolderId='';

    await load();

    go('drive');

    say('保存しました');

  }catch(e){

    alert(
      '保存できませんでした。\n\n'+
      e.message
    );

    if(btn){
      btn.disabled=false;
      btn.textContent='保存';
    }
  }
}

function cancelSelectedFile(){

  selectedUploadFile=null;
  selectedVersionId=null;
  selectedFolderId='';

  go('drive');
}


/* ==============================
   ホーム
============================== */

function homeR(){

  const el=$('home');

  if(!el)return;

  const online=onlineNames();

  el.innerHTML=`
    <div class="panel">

      <div class="ok">
        🟢 クラウド接続中｜${esc(N)}
      </div>

      <div class="item" style="margin-top:12px">
        <div class="title">
          👥 オンライン ${online.length}人
        </div>

        <div class="meta">
          ${
            online.length
              ?online.map(x=>esc(x)).join('・')
              :'オンラインのメンバーはいません'
          }
        </div>
      </div>

    </div>

    <div class="grid">

      <button class="card" data-go="drive">
        <div class="ico">📁</div>
        <div class="ct">共有ドライブ</div>
        <div class="meta">
          ${
            state.items.filter(
              x=>x.item_type==='file'
            ).length
          }資料
        </div>
      </button>

      <button class="card" data-go="chat">
        <div class="ico">💬</div>
        <div class="ct">メッセージ</div>
        <div class="meta">
          ${state.messages.length}件
        </div>
      </button>

      <button class="card" data-go="cal">
        <div class="ico">📅</div>
        <div class="ct">スケジュール</div>
        <div class="meta">
          ${state.schedules.length}件
        </div>
      </button>

      <button class="card" data-go="more">
        <div class="ico">📝</div>
        <div class="ct">議事録</div>
        <div class="meta">
          ${state.minutes.length}件
        </div>
      </button>

      <button class="card" data-go="more">
        <div class="ico">💡</div>
        <div class="ct">反省点・改善</div>
        <div class="meta">
          ${state.reviews.length}件
        </div>
      </button>

      <button class="card" data-go="more">
        <div class="ico">✅</div>
        <div class="ct">許可・申請</div>
        <div class="meta">
          ${state.permits.length}件
        </div>
      </button>

      <button class="card" data-go="more">
        <div class="ico">🎪</div>
        <div class="ct">苫小牧イベント</div>
        <div class="meta">年間行事</div>
      </button>

      <button class="card" data-go="home">
        <div class="ico">👥</div>
        <div class="ct">共有メンバー</div>
        <div class="meta">
          オンライン ${online.length}人
        </div>
      </button>

    </div>
  `;

  document
    .querySelectorAll('[data-go]')
    .forEach(b=>{

      b.onclick=()=>{
        go(b.dataset.go);
      };
    });
}


/* ==============================
   ファイル行
============================== */

function fileRow(file){

  const isDrive=
    !!driveUrl(file);

  return `
    <div class="item">

      <div class="row">

        <div style="flex:1">

          <div class="title">
            ${isDrive?'☁️':'📎'}
            ${esc(file.name)}
          </div>

          <div class="meta">
            Ver.${file.version||1}
            ｜
            ${esc(file.updated_by||'')}
            ${isDrive?'｜Google Drive':''}
          </div>

        </div>

        <button
          class="btn light"
          data-open="${file.id}"
        >
          開く
        </button>

        <button
          class="btn light"
          data-ver="${file.id}"
        >
          更新版
        </button>

        <button
          class="btn danger"
          data-del="${file.id}"
        >
          削除
        </button>

      </div>

    </div>
  `;
}


/* ==============================
   共有ドライブ
============================== */

function driveR(){

  const el=$('drive');

  if(!el)return;

  const folders=
    state.items.filter(
      x=>x.item_type==='folder'
    );

  const files=
    state.items.filter(
      x=>x.item_type==='file'
    );

  let uploadBox='';

  if(selectedUploadFile){

    const kb=(
      selectedUploadFile.size/1024
    ).toFixed(1);

    const folderOptions=
      folders.map(f=>`
        <option
          value="${esc(f.id)}"
          ${
            sameId(
              selectedFolderId,
              f.id
            )
              ?'selected'
              :''
          }
        >
          ${esc(f.name)}
        </option>
      `).join('');

    uploadBox=`
      <div class="panel">

        <div class="title">
          📤 ファイルを保存
        </div>

        <div class="item">
          <div class="title">
            ${esc(selectedUploadFile.name)}
          </div>
          <div class="meta">
            ${kb} KB
          </div>
        </div>

        <label class="fieldLabel">
          保存先フォルダ
        </label>

        <select id="folderSelect">
          <option value="">
            共有ドライブ直下
          </option>
          ${folderOptions}
        </select>

        <div class="row">
          <button
            class="btn"
            id="saveSelectedFile"
          >
            保存
          </button>

          <button
            class="btn light"
            id="cancelSelectedFile"
          >
            キャンセル
          </button>
        </div>

      </div>
    `;
  }

  const folderHtml=
    folders.length
      ?folders.map(folder=>{

        const folderFiles=
          files.filter(
            f=>sameId(
              f.parent_id,
              folder.id
            )
          );

        return `
          <div class="item">

            <div class="row">
              <div style="flex:1">

                <div class="title">
                  📂 ${esc(folder.name)}
                </div>

                <div class="meta">
                  ${folderFiles.length}ファイル
                </div>

              </div>

              <button
                class="btn danger"
                data-del="${folder.id}"
              >
                削除
              </button>
            </div>

            ${
              folderFiles.length
                ?folderFiles
                  .map(fileRow)
                  .join('')
                :'<div class="empty">このフォルダは空です</div>'
            }

          </div>
        `;
      }).join('')
      :'<div class="empty">まだフォルダがありません</div>';

  const rootFiles=
    files.filter(
      f=>!f.parent_id
    );

  el.innerHTML=`
    <div class="panel">

      <div class="sectionTitle">
        <div class="title">
          📁 共有ドライブ
        </div>

        <button
          class="btn light"
          id="refreshD"
        >
          ↻更新
        </button>
      </div>

      <div class="row">

        <button
          class="btn"
          id="up"
        >
          ＋ファイル
        </button>

        <button
          class="btn light"
          id="newF"
        >
          ＋フォルダ
        </button>

      </div>

      <button
        class="btn sheetBtn"
        id="openSheet"
      >
        Googleスプレッドシート共同編集
      </button>

      <div class="meta">
        ファイルを選んだあと、
        保存先フォルダを選択して
        「保存」を押します。
      </div>

    </div>

    ${uploadBox}

    <div class="panel">

      <div class="title">
        📁 フォルダ
      </div>

      ${folderHtml}

    </div>

    <div class="panel">

      <div class="title">
        📄 共有ドライブ直下
      </div>

      ${
        rootFiles.length
          ?rootFiles.map(fileRow).join('')
          :'<div class="empty">ファイルはありません</div>'
      }

    </div>
  `;

  const refresh=$('refreshD');

  if(refresh){

    refresh.onclick=async()=>{

      await load();
      go('drive');
    };
  }

  const up=$('up');

  if(up){

    up.onclick=()=>{
      pickFile();
    };
  }

  const newF=$('newF');

  if(newF){

    newF.onclick=async()=>{

      const name=
        prompt('フォルダ名');

      if(!name)return;

      try{

        await api(
          'POST',
          {
            action:'folder',
            name:name.trim(),
            by:N
          }
        );

        await load();

        go('drive');

        say(
          'フォルダを作成しました'
        );

      }catch(e){

        alert(
          'フォルダを作成できません：'+
          e.message
        );
      }
    };
  }

  const sheet=$('openSheet');

  if(sheet){

    sheet.onclick=()=>{
      openExternal(SHEET_URL);
    };
  }

  const folderSelect=
    $('folderSelect');

  if(folderSelect){

    folderSelect.onchange=()=>{
      selectedFolderId=
        folderSelect.value;
    };
  }

  const saveBtn=
    $('saveSelectedFile');

  if(saveBtn){
    saveBtn.onclick=
      saveSelectedFile;
  }

  const cancelBtn=
    $('cancelSelectedFile');

  if(cancelBtn){
    cancelBtn.onclick=
      cancelSelectedFile;
  }

  document
    .querySelectorAll('[data-open]')
    .forEach(b=>{

      b.onclick=()=>{

        const f=
          files.find(
            x=>sameId(
              x.id,
              b.dataset.open
            )
          );

        openFile(f);
      };
    });

  document
    .querySelectorAll('[data-ver]')
    .forEach(b=>{

      b.onclick=()=>{
        pickFile(
          b.dataset.ver
        );
      };
    });

  document
    .querySelectorAll('[data-del]')
    .forEach(b=>{

      b.onclick=async()=>{

        if(!confirm('削除しますか？')){
          return;
        }

        try{

          await api(
            'POST',
            {
              action:'item_delete',
              id:b.dataset.del,
              by:N
            }
          );

          await load();
          go('drive');

        }catch(e){

          alert(
            '削除できません：'+
            e.message
          );
        }
      };
    });
}


/* ==============================
   メッセージ
============================== */

function chatR(){

  const el=$('chat');

  if(!el)return;

  const messages=
    state.messages.map(x=>{

      const mine=
        x.updated_by===N;

      return `
        <div class="item">

          <div class="row">

            <div style="flex:1">

              <div>
                ${esc(x.name)}
              </div>

              <div class="meta">
                ${esc(x.updated_by||'')}
                ｜
                ${
                  x.created_at
                    ?new Date(
                        x.created_at
                      ).toLocaleString(
                        'ja-JP'
                      )
                    :''
                }
              </div>

            </div>

            ${
              mine
                ?`
                  <button
                    class="btn danger"
                    data-msgdel="${x.id}"
                  >
                    取消
                  </button>
                `
                :''
            }

          </div>

        </div>
      `;
    }).join('');

  el.innerHTML=`
    <div class="panel">

      <div class="sectionTitle">
        <div class="title">
          💬 メッセージ
        </div>

        <button
          class="btn light"
          id="refreshC"
        >
          ↻更新
        </button>
      </div>

      ${
        messages||
        '<div class="empty">まだありません</div>'
      }

      <textarea
        id="msg"
        placeholder="連絡事項を入力"
      ></textarea>

      <button
        class="btn"
        id="send"
      >
        送信
      </button>

    </div>
  `;

  const refresh=$('refreshC');

  if(refresh){

    refresh.onclick=async()=>{
      await load();
      go('chat');
    };
  }

  const send=$('send');

  if(send){

    send.onclick=async()=>{

      const msg=$('msg');

      if(!msg)return;

      const text=msg.value.trim();

      if(!text)return;

      try{

        await api(
          'POST',
          {
            action:'message',
            text,
            by:N
          }
        );

        await load();
        go('chat');

        say('送信しました');

      }catch(e){

        alert(
          '送信できません：'+
          e.message
        );
      }
    };
  }

  document
    .querySelectorAll('[data-msgdel]')
    .forEach(b=>{

      b.onclick=async()=>{

        if(
          !confirm(
            'このメッセージを取り消しますか？'
          )
        ){
          return;
        }

        try{

          await api(
            'POST',
            {
              action:'message_delete',
              id:b.dataset.msgdel,
              by:N
            }
          );

          await load();
          go('chat');

          say(
            'メッセージを取り消しました'
          );

        }catch(e){

          alert(
            '取り消せません：'+
            e.message
          );
        }
      };
    });
}


/* ==============================
   スケジュール
============================== */

function calR(){

  const el=$('cal');

  if(!el)return;

  const list=
    state.schedules.map(x=>{

      const d=
        x.starts_at
          ?new Date(x.starts_at)
          :null;

      const when=
        d
          ?d.toLocaleDateString(
              'ja-JP'
            )+
            ' '+
            d.toLocaleTimeString(
              'ja-JP',
              {
                hour:'2-digit',
                minute:'2-digit'
              }
            )
          :'';

      return `
        <div class="item row">

          <div style="flex:1">

            <div class="title">
              ${esc(x.title)}
            </div>

            <div class="meta">
              ${when}
              ${x.place?'｜'+esc(x.place):''}
              ${x.memo?'｜'+esc(x.memo):''}
            </div>

          </div>

          <button
            class="btn danger"
            data-sdel="${x.id}"
          >
            削除
          </button>

        </div>
      `;
    }).join('');

  el.innerHTML=`
    <div class="panel">

      <div class="sectionTitle">
        <div class="title">
          📅 スケジュール
        </div>

        <button
          class="btn light"
          id="refreshS"
        >
          ↻更新
        </button>
      </div>

      ${
        list||
        '<div class="empty">まだありません</div>'
      }

      <label class="fieldLabel">
        日付
      </label>

      <input
        id="sdate"
        type="date"
      >

      <label class="fieldLabel">
        開始時刻
      </label>

      <input
        id="stime"
        type="time"
        value="09:00"
      >

      <input
        id="ttl"
        placeholder="予定名"
      >

      <input
        id="pl"
        placeholder="場所"
      >

      <textarea
        id="sm"
        placeholder="メモ"
      ></textarea>

      <button
        class="btn"
        id="addS"
      >
        追加
      </button>

    </div>
  `;

  $('refreshS').onclick=async()=>{
    await load();
    go('cal');
  };

  $('addS').onclick=async()=>{

    const date=$('sdate').value;

    const time=
      $('stime').value||
      '09:00';

    const title=
      $('ttl').value.trim();

    if(!date){

      alert(
        '日付を選んでください'
      );

      return;
    }

    if(!title){

      alert(
        '予定名を入力してください'
      );

      return;
    }

    try{

      await api(
        'POST',
        {
          action:'schedule',
          title,
          starts_at:
            `${date}T${time}:00+09:00`,
          ends_at:null,
          place:$('pl').value,
          memo:$('sm').value,
          by:N
        }
      );

      await load();
      go('cal');

      say(
        '予定を保存しました'
      );

    }catch(e){

      alert(
        '予定を保存できません：'+
        e.message
      );
    }
  };

  document
    .querySelectorAll('[data-sdel]')
    .forEach(b=>{

      b.onclick=async()=>{

        if(
          !confirm(
            '予定を削除しますか？'
          )
        ){
          return;
        }

        await api(
          'POST',
          {
            action:'schedule_delete',
            id:b.dataset.sdel,
            by:N
          }
        );

        await load();
        go('cal');
      };
    });
}


/* ==============================
   議事録・改善・申請
============================== */

function rec(x,k){

  let detail='';

  if(k==='minute'){

    detail=
      `${x.meeting_date||''} ${x.body||''} ${x.action_items||''}`;

  }else if(k==='review'){

    detail=
      `${x.category||''} ${x.body||''}`;

  }else{

    detail=
      `${x.organization||''} ${x.contact||''} ${x.body||''}`;
  }

  return `
    <div class="item row">

      <div style="flex:1">

        <div class="title">
          ${esc(x.title)}
        </div>

        <div class="meta">
          ${esc(detail)}
        </div>

        <div class="meta">
          更新：${esc(x.updated_by||'')}
        </div>

      </div>

      <button
        class="btn danger"
        data-rdel="${x.id}"
        data-kind="${k}"
      >
        削除
      </button>

    </div>
  `;
}

function moreR(){

  const el=$('more');

  if(!el)return;

  el.innerHTML=`
    <div class="panel">

      <div class="title">
        📝 議事録
      </div>

      ${
        state.minutes.length
          ?state.minutes
            .map(
              x=>rec(x,'minute')
            )
            .join('')
          :'<div class="empty">まだありません</div>'
      }

      <input
        id="mt"
        placeholder="会議名"
      >

      <input
        id="md"
        type="date"
      >

      <textarea
        id="mb"
        placeholder="議事内容"
      ></textarea>

      <textarea
        id="ma"
        placeholder="決定事項・担当"
      ></textarea>

      <button
        class="btn"
        id="addM"
      >
        保存
      </button>

    </div>

    <div class="panel">

      <div class="title">
        💡 反省点・改善
      </div>

      ${
        state.reviews.length
          ?state.reviews
            .map(
              x=>rec(x,'review')
            )
            .join('')
          :'<div class="empty">まだありません</div>'
      }

      <input
        id="rt"
        placeholder="タイトル"
      >

      <select id="rc">
        <option>改善</option>
        <option>反省</option>
        <option>良かった点</option>
        <option>次回対応</option>
      </select>

      <textarea
        id="rb"
        placeholder="内容"
      ></textarea>

      <button
        class="btn"
        id="addR"
      >
        保存
      </button>

    </div>

    <div class="panel">

      <div class="title">
        ✅ 許可・申請先
      </div>

      ${
        state.permits.length
          ?state.permits
            .map(
              x=>rec(x,'permit')
            )
            .join('')
          :'<div class="empty">まだありません</div>'
      }

      <input
        id="pt"
        placeholder="申請名"
      >

      <input
        id="po"
        placeholder="申請先・組織"
      >

      <input
        id="pc"
        placeholder="連絡先"
      >

      <textarea
        id="pb"
        placeholder="内容・期限・進捗"
      ></textarea>

      <button
        class="btn"
        id="addP"
      >
        保存
      </button>

    </div>

    <div class="panel">

      <div class="title">
        🎪 苫小牧 年間行事
      </div>

      <div class="item">
        <span class="pill">冬</span>
        スケート・冬季イベント
      </div>

      <div class="item">
        <span class="pill">春</span>
        地域行事・新年度イベント
      </div>

      <div class="item">
        <span class="pill">夏</span>
        港まつり・地域フェス・屋外イベント
      </div>

      <div class="item">
        <span class="pill">秋</span>
        文化・スポーツ・地域イベント
      </div>

    </div>
  `;

  $('addM').onclick=async()=>{

    if(!$('mt').value.trim()){
      return;
    }

    await api(
      'POST',
      {
        action:'minute',
        title:$('mt').value,
        meeting_date:
          $('md').value||
          null,
        body:$('mb').value,
        action_items:$('ma').value,
        by:N
      }
    );

    await load();
    go('more');
  };

  $('addR').onclick=async()=>{

    if(!$('rt').value.trim()){
      return;
    }

    await api(
      'POST',
      {
        action:'review',
        title:$('rt').value,
        category:$('rc').value,
        body:$('rb').value,
        by:N
      }
    );

    await load();
    go('more');
  };

  $('addP').onclick=async()=>{

    if(!$('pt').value.trim()){
      return;
    }

    await api(
      'POST',
      {
        action:'permit',
        title:$('pt').value,
        organization:$('po').value,
        contact:$('pc').value,
        body:$('pb').value,
        by:N
      }
    );

    await load();
    go('more');
  };

  document
    .querySelectorAll('[data-rdel]')
    .forEach(b=>{

      b.onclick=async()=>{

        if(!confirm('削除しますか？')){
          return;
        }

        await api(
          'POST',
          {
            action:'record_delete',
            kind:b.dataset.kind,
            id:b.dataset.rdel,
            by:N
          }
        );

        await load();
        go('more');
      };
    });
}


/* ==============================
   画面切替
============================== */

function render(){

  if(cur==='home'){
    homeR();
  }

  if(cur==='drive'){
    driveR();
  }

  if(cur==='chat'){
    chatR();
  }

  if(cur==='cal'){
    calR();
  }

  if(cur==='more'){
    moreR();
  }
}

function go(p){

  cur=p;

  document
    .querySelectorAll('main>section')
    .forEach(s=>{
      s.classList.add('hidden');
    });

  const target=$(p);

  if(target){
    target.classList.remove('hidden');
  }

  document
    .querySelectorAll('.nav')
    .forEach(n=>{

      n.classList.toggle(
        'on',
        n.dataset.p===p
      );
    });

  render();
}


/* ==============================
   起動
============================== */

function init(){

  const codeEl=$('code');
  const nameEl=$('memberName');
  const enterEl=$('enter');

  if(codeEl){

    codeEl.value=
      localStorage.getItem(
        'tomaCode'
      )||
      'TOMA-2026';
  }

  if(nameEl){

    nameEl.value=
      localStorage.getItem(
        'tomaName'
      )||
      '';
  }

  if(enterEl){
    enterEl.onclick=doLogin;
  }

  if(nameEl){

    nameEl.onkeydown=e=>{

      if(e.key==='Enter'){
        doLogin();
      }
    };
  }

  document
    .querySelectorAll('.nav')
    .forEach(n=>{

      n.onclick=()=>{
        go(n.dataset.p);
      };
    });
}

if(
  document.readyState==='loading'
){

  document.addEventListener(
    'DOMContentLoaded',
    init
  );

}else{

  init();
}

})();
