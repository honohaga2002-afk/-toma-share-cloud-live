(()=>{'use strict';

const $=id=>document.getElementById(id);

const loginEl=$('login');
const codeEl=$('code');
const memberNameEl=$('memberName');
const enterEl=$('enter');
const statusEl=$('loginStatus');
const navEl=$('nav');
const toastEl=$('toast');

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


/* =================================
   基本
================================= */

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

function say(t){
  if(!toastEl)return;

  toastEl.textContent=t;
  toastEl.classList.remove('hidden');

  setTimeout(()=>{
    toastEl.classList.add('hidden');
  },1800);
}

async function api(method='GET',body){
  const headers={
    'Content-Type':'application/json',
    'x-workspace-code':C
  };

  /*
   * GETのたびに現在利用中の名前を
   * サーバーへ送る
   */
  if(N){
    headers['x-member-name']=N;
  }

  const r=await fetch('/api/data',{
    method,
    headers,
    body:body
      ?JSON.stringify(body)
      :undefined,
    cache:'no-store'
  });

  const j=await r.json().catch(()=>({
    error:'通信エラー'
  }));

  if(!r.ok){
    throw new Error(
      j.error||'通信エラー'
    );
  }

  return j;
}

async function load(){
  const data=await api();

  state={
    schedules:data.schedules||[],
    messages:data.messages||[],
    items:data.items||[],
    minutes:data.minutes||[],
    reviews:data.reviews||[],
    permits:data.permits||[],
    onlineMembers:
      data.onlineMembers||[]
  };
}


/* =================================
   ログイン
================================= */

async function doLogin(){
  C=codeEl.value.trim().toUpperCase();
  N=memberNameEl.value.trim()||'メンバー';

  if(!C){
    statusEl.className='err';
    statusEl.textContent=
      '共有コードを入力してください。';
    return;
  }

  enterEl.disabled=true;

  statusEl.className='meta';
  statusEl.textContent='接続中…';

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

    loginEl.classList.add('hidden');
    navEl.classList.remove('hidden');

    go('home');

    startPresence();

    say('ログインしました');

  }catch(e){
    statusEl.className='err';
    statusEl.textContent=
      'ログインできません：'+
      e.message;
  }finally{
    enterEl.disabled=false;
  }
}

if(enterEl){
  enterEl.addEventListener(
    'click',
    doLogin
  );
}

if(memberNameEl){
  memberNameEl.addEventListener(
    'keydown',
    e=>{
      if(e.key==='Enter'){
        doLogin();
      }
    }
  );
}

if(codeEl){
  codeEl.value=
    localStorage.getItem(
      'tomaCode'
    )||
    'TOMA-2026';
}

if(memberNameEl){
  memberNameEl.value=
    localStorage.getItem(
      'tomaName'
    )||
    '';
}


/* =================================
   オンライン状態
================================= */

function startPresence(){
  if(presenceTimer){
    clearInterval(
      presenceTimer
    );
  }

  /*
   * 30秒ごとにオンライン状態を更新
   */
  presenceTimer=setInterval(
    async()=>{
      if(!C||!N)return;

      try{
        await load();

        /*
         * 今見ている画面だけ
         * 再描画
         */
        render();

      }catch(e){
        console.error(
          'presence:',
          e
        );
      }
    },
    30000
  );
}

function onlineNames(){
  return (
    state.onlineMembers||[]
  ).map(x=>
    x.member_name
  ).filter(Boolean);
}


/* =================================
   ファイル関連
================================= */

function dataUrlToBlob(dataUrl){
  const m=String(
    dataUrl||''
  ).match(
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

  const bytes=m[2]
    ?Uint8Array.from(
        atob(raw),
        c=>c.charCodeAt(0)
      )
    :new TextEncoder().encode(
        decodeURIComponent(raw)
      );

  return new Blob(
    [bytes],
    {type:mime}
  );
}

function isPreviewable(f){
  const mime=
    (f.mime_type||'')
      .toLowerCase();

  const name=
    (f.name||'')
      .toLowerCase();

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
    /^https?:\/\//i.test(
      f.file_data
    )
  ){
    return f.file_data;
  }

  let content=f.content;

  if(
    typeof content==='string'
  ){
    try{
      content=
        JSON.parse(content);
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


/* =================================
   ファイルを開く
================================= */

function openFile(f){
  try{
    if(!f){
      alert(
        'ファイルが見つかりません'
      );
      return;
    }

    const url=driveUrl(f);

    if(url){
      /*
       * SafariのTOMA SHAREを残して
       * Google Drive側を開く
       */
      const a=
        document.createElement('a');

      a.href=url;
      a.target='_blank';
      a.rel='noopener noreferrer';
      a.style.display='none';

      document.body.appendChild(a);
      a.click();
      a.remove();

      return;
    }

    if(!f.file_data){
      alert(
        'ファイルデータがありません'
      );
      return;
    }

    const blob=
      dataUrlToBlob(
        f.file_data
      );

    const blobUrl=
      URL.createObjectURL(blob);

    if(isPreviewable(f)){
      const a=
        document.createElement('a');

      a.href=blobUrl;
      a.target='_blank';
      a.rel='noopener noreferrer';
      a.style.display='none';

      document.body.appendChild(a);
      a.click();
      a.remove();

    }else{
      const a=
        document.createElement('a');

      a.href=blobUrl;
      a.download=
        f.name||'download';

      a.style.display='none';

      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    setTimeout(()=>{
      URL.revokeObjectURL(
        blobUrl
      );
    },120000);

  }catch(e){
    alert(
      'ファイルを開けません：'+
      e.message
    );
  }
}


/* =================================
   ファイル選択
================================= */

function pickFile(id){
  const input=
    document.createElement(
      'input'
    );

  input.type='file';

  input.accept=
    '.xlsx,.xls,.csv,.doc,.docx,.ppt,.pptx,.pdf,image/*';

  input.onchange=()=>{
    const f=
      input.files?.[0];

    if(!f)return;

    if(f.size>2500000){
      alert(
        '現在は1ファイル2.5MB以下でアップロードしてください'
      );
      return;
    }

    selectedUploadFile=f;
    selectedVersionId=
      id||null;

    if(id){
      const old=
        state.items.find(
          x=>x.id===id
        );

      selectedFolderId=
        old?.parent_id||'';

    }else{
      selectedFolderId='';
    }

    go('drive');
  };

  input.click();
}


/* =================================
   ファイル保存
================================= */

async function saveSelectedFile(){
  const f=
    selectedUploadFile;

  if(!f){
    alert(
      'ファイルを選択してください'
    );
    return;
  }

  const btn=
    $('saveSelectedFile');

  try{
    if(btn){
      btn.disabled=true;
      btn.textContent=
        '保存中…';
    }

    say(
      'Google Driveへ保存中…'
    );

    const data=
      await new Promise(
        (resolve,reject)=>{
          const fr=
            new FileReader();

          fr.onload=()=>{
            resolve(
              fr.result
            );
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
    console.error(e);

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


/* =================================
   ホーム
================================= */

function homeR(){
  const el=$('home');

  if(!el)return;

  const online=
    onlineNames();

  el.innerHTML=`
    <div class="panel">

      <div class="ok">
        🟢 クラウド接続中｜
        ${esc(N)}
      </div>

      <div
        class="item"
        style="margin-top:12px"
      >
        <div class="title">
          👥 オンライン
          ${online.length}人
        </div>

        <div class="meta">
          ${
            online.length
              ?online
                .map(
                  x=>esc(x)
                )
                .join('・')
              :'現在オンラインのメンバーはいません'
          }
        </div>
      </div>

    </div>

    <div class="grid">

      <button
        class="card"
        data-go="drive"
      >
        <div class="ico">📁</div>
        <div class="ct">
          共有ドライブ
        </div>
        <div class="meta">
          ${
            state.items.filter(
              x=>
                x.item_type===
                'file'
            ).length
          }資料
        </div>
      </button>

      <button
        class="card"
        data-go="chat"
      >
        <div class="ico">💬</div>
        <div class="ct">
          メッセージ
        </div>
        <div class="meta">
          ${state.messages.length}件
        </div>
      </button>

      <button
        class="card"
        data-go="cal"
      >
        <div class="ico">📅</div>
        <div class="ct">
          スケジュール
        </div>
        <div class="meta">
          ${state.schedules.length}件
        </div>
      </button>

      <button
        class="card"
        data-go="more"
      >
        <div class="ico">📝</div>
        <div class="ct">
          議事録
        </div>
        <div class="meta">
          ${state.minutes.length}件
        </div>
      </button>

      <button
        class="card"
        data-go="more"
      >
        <div class="ico">💡</div>
        <div class="ct">
          反省点・改善
        </div>
        <div class="meta">
          ${state.reviews.length}件
        </div>
      </button>

      <button
        class="card"
        data-go="more"
      >
        <div class="ico">✅</div>
        <div class="ct">
          許可・申請
        </div>
        <div class="meta">
          ${state.permits.length}件
        </div>
      </button>

      <button
        class="card"
        data-go="more"
      >
        <div class="ico">🎪</div>
        <div class="ct">
          苫小牧イベント
        </div>
        <div class="meta">
          年間行事
        </div>
      </button>

      <button
        class="card"
        data-go="home"
      >
        <div class="ico">👥</div>
        <div class="ct">
          共有メンバー
        </div>
        <div class="meta">
          オンライン
          ${online.length}人
        </div>
      </button>

    </div>
  `;

  document
    .querySelectorAll(
      '[data-go]'
    )
    .forEach(b=>{
      b.onclick=()=>{
        go(
          b.dataset.go
        );
      };
    });
}


/* =================================
   ファイル行
================================= */

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
            ${esc(
              file.updated_by||''
            )}
            ${
              isDrive
                ?'｜Google Drive'
                :''
            }
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


/* =================================
   共有ドライブ
================================= */

function driveR(){
  const el=$('drive');

  if(!el)return;

  const folders=
    state.items.filter(
      x=>
        x.item_type===
        'folder'
    );

  const files=
    state.items.filter(
      x=>
        x.item_type===
        'file'
    );

  let uploadBox='';

  if(selectedUploadFile){
    const kb=
      (
        selectedUploadFile.size/
        1024
      ).toFixed(1);

    const folderOptions=
      folders.map(f=>`
        <option
          value="${esc(f.id)}"
          ${
            selectedFolderId===
            f.id
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
            ${esc(
              selectedUploadFile.name
            )}
          </div>

          <div class="meta">
            ${kb} KB
          </div>

        </div>

        <label
          class="fieldLabel"
        >
          保存先フォルダ
        </label>

        <select
          id="folderSelect"
        >
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

      ${
        folders.length
          ?folders.map(folder=>{

            const folderFiles=
              files.filter(
                file=>
                  file.parent_id===
                  folder.id
              );

            return `
              <div class="item">

                <div class="row">

                  <div
                    style="flex:1"
                  >

                    <div class="title">
                      📂
                      ${esc(folder.name)}
                    </div>

                    <div class="meta">
                      ${folderFiles.length}
                      ファイル
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
                      .map(
                        file=>
                          fileRow(file)
                      )
                      .join('')
                    :'<div class="empty">このフォルダは空です</div>'
                }

              </div>
            `;
          }).join('')
          :'<div class="empty">まだフォルダがありません</div>'
      }

    </div>

    <div class="panel">

      <div class="title">
        📄 共有ドライブ直下
      </div>

      ${
        files.filter(
          file=>!file.parent_id
        ).length
          ?files
            .filter(
              file=>
                !file.parent_id
            )
            .map(
              file=>fileRow(file)
            )
            .join('')
          :'<div class="empty">ファイルはありません</div>'
      }

    </div>
  `;

  const refresh=
    $('refreshD');

  if(refresh){
    refresh.onclick=
      async()=>{
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
    newF.onclick=
      async()=>{
        const name=
          prompt(
            'フォルダ名'
          );

        if(!name)return;

        try{
          await api(
            'POST',
            {
              action:'folder',
              name:
                name.trim(),
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

  const sheet=
    $('openSheet');

  if(sheet){
    sheet.onclick=()=>{
      const a=
        document.createElement(
          'a'
        );

      a.href=SHEET_URL;
      a.target='_blank';
      a.rel=
        'noopener noreferrer';

      a.style.display='none';

      document.body
        .appendChild(a);

      a.click();
      a.remove();
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
    .querySelectorAll(
      '[data-open]'
    )
    .forEach(b=>{
      b.onclick=()=>{
        const f=
          files.find(
            x=>
              x.id===
              b.dataset.open
          );

        openFile(f);
      };
    });

  document
    .querySelectorAll(
      '[data-ver]'
    )
    .forEach(b=>{
      b.onclick=()=>{
        pickFile(
          b.dataset.ver
        );
      };
    });

  document
    .querySelectorAll(
      '[data-del]'
    )
    .forEach(b=>{
      b.onclick=
        async()=>{
          if(
            !confirm(
              '削除しますか？'
            )
          ){
            return;
          }

          try{
            await api(
              'POST',
              {
                action:
                  'item_delete',

                id:
                  b.dataset.del,

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


/* =================================
   メッセージ
================================= */

function chatR(){
  const el=$('chat');

  if(!el)return;

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
        state.messages.length
          ?state.messages
            .map(x=>{

              const mine=
                x.updated_by===N;

              return `
                <div class="item">

                  <div class="row">

                    <div
                      style="flex:1"
                    >

                      <div>
                        ${esc(x.name)}
                      </div>

                      <div class="meta">
                        ${esc(
                          x.updated_by||
                          ''
                        )}
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
            })
            .join('')
          :'<div class="empty">まだありません</div>'
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

  $('refreshC').onclick=
    async()=>{
      await load();
      go('chat');
    };

  $('send').onclick=
    async()=>{
      const text=
        $('msg')
          .value
          .trim();

      if(!text)return;

      try{
        await api(
          'POST',
          {
            action:
              'message',

            text,

            by:N
          }
        );

        await load();
        go('chat');

        say(
          '送信しました'
        );

      }catch(e){
        alert(
          '送信できません：'+
          e.message
        );
      }
    };

  document
    .querySelectorAll(
      '[data-msgdel]'
    )
    .forEach(b=>{

      b.onclick=
        async()=>{

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
                action:
                  'message_delete',

                id:
                  b.dataset.msgdel,

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


/* =================================
   スケジュール
================================= */

function calR(){
  const el=$('cal');

  if(!el)return;

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
        state.schedules.length
          ?state.schedules
            .map(x=>{

              const d=
                x.starts_at
                  ?new Date(
                      x.starts_at
                    )
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
                        hour:
                          '2-digit',
                        minute:
                          '2-digit'
                      }
                    )
                  :'';

              return `
                <div class="item row">

                  <div
                    style="flex:1"
                  >

                    <div class="title">
                      ${esc(x.title)}
                    </div>

                    <div class="meta">
                      ${when}

                      ${
                        x.place
                          ?'｜'+
                            esc(x.place)
                          :''
                      }

                      ${
                        x.memo
                          ?'｜'+
                            esc(x.memo)
                          :''
                      }
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
            })
            .join('')
          :'<div class="empty">まだありません</div>'
      }

      <label
        class="fieldLabel"
      >
        日付
      </label>

      <input
        id="sdate"
        type="date"
      >

      <label
        class="fieldLabel"
      >
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

  $('refreshS').onclick=
    async()=>{
      await load();
      go('cal');
    };

  $('addS').onclick=
    async()=>{
      const date=
        $('sdate').value;

      const time=
        $('stime').value||
        '09:00';

      const title=
        $('ttl')
          .value
          .trim();

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

      await api(
        'POST',
        {
          action:
            'schedule',

          title,

          starts_at:
            `${date}T${time}:00+09:00`,

          ends_at:null,

          place:
            $('pl').value,

          memo:
            $('sm').value,

          by:N
        }
      );

      await load();
      go('cal');

      say(
        '予定を保存しました'
      );
    };

  document
    .querySelectorAll(
      '[data-sdel]'
    )
    .forEach(b=>{

      b.onclick=
        async()=>{

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
              action:
                'schedule_delete',

              id:
                b.dataset.sdel,

              by:N
            }
          );

          await load();
          go('cal');
        };
    });
}


/* =================================
   議事録等
================================= */

function rec(x,k){
  const detail=
    k==='minute'
      ?`${x.meeting_date||''} ${x.body||''} ${x.action_items||''}`
      :k==='review'
      ?`${x.category||''} ${x.body||''}`
      :`${x.organization||''} ${x.contact||''} ${x.body||''}`;

  return `
    <div class="item row">

      <div
        style="flex:1"
      >

        <div class="title">
          ${esc(x.title)}
        </div>

        <div class="meta">
          ${esc(detail)}
        </div>

        <div class="meta">
          更新：
          ${esc(
            x.updated_by||''
          )}
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
              x=>rec(
                x,
                'minute'
              )
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
              x=>rec(
                x,
                'review'
              )
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
              x=>rec(
                x,
                'permit'
              )
            )
            .join('')
          :'<div class="empty">まだ
