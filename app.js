(()=>{
'use strict';

const $=id=>document.getElementById(id);

let C='';
let N='';
let cur='home';
let presenceTimer=null;
let driveSyncing=false;

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

let xlsxPromise=null;
let editorCurrent=null;

const XLSX_URL=
'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';

const SHEET_URL=
'https://docs.google.com/spreadsheets/d/1wi2FQ7crs8pXmu-43Gu-XdEnyJ_J6SI19N8eDxVSd68/edit';

const TOMAKOMAI_PERMIT_LINKS=[
  {icon:'📝',title:'申請書ダウンロード・電子申請',category:'総合',detail:'苫小牧市の申請書・HARP・マイナポータル手続き一覧',url:'https://www.city.tomakomai.hokkaido.jp/kurashi/sonota/shinseisho-dl/denshishinsei.html'},
  {icon:'🌳',title:'公園の使用・占用許可',category:'イベント',detail:'催し・販売等は5日前、テントやステージ等の占用は10日前まで',url:'https://www.city.tomakomai.hokkaido.jp/shizen/koen/senyo.html'},
  {icon:'🛣️',title:'道路・河川・緑地の使用・占用',category:'イベント',detail:'市管理の道路、河川、行政財産（緑地等）の使用・占用許可',url:'https://www.city.tomakomai.hokkaido.jp/shisei/toshikensetsu/dorokaishu/kyoninka.html'},
  {icon:'🚒',title:'消防の申請書・届出様式',category:'消防',detail:'火災予防、防火管理、消防用設備、危険物などの様式一覧',url:'https://www.city.tomakomai.hokkaido.jp/kurashi/shobo/download/sinnseitodokede.html'},
  {icon:'📱',title:'消防の電子申請（HARP）',category:'消防',detail:'電子申請に対応している消防関係届出の案内',url:'https://www.city.tomakomai.hokkaido.jp/kurashi/shobo/kasaiyobo/dennsisinnsei.html'},
  {icon:'🚚',title:'公園キッチンカー等の出店募集',category:'イベント',detail:'市内公園での移動販売車等の募集条件・申込案内',url:'https://www.city.tomakomai.hokkaido.jp/shizen/koen/midorigaoka.html'},
  {icon:'🏗️',title:'開発行為等の許可申請',category:'事業・建築',detail:'開発許可、変更許可、工事着手届などの申請書類',url:'https://www.city.tomakomai.hokkaido.jp/shisei/toshikensetsu/kaihatsu/kyokashinsei.html'},
  {icon:'🏢',title:'土地取引に必要な届出',category:'事業・土地',detail:'国土利用計画法に基づく土地取引の届出案内',url:'https://www.city.tomakomai.hokkaido.jp/shisei/toshikensetsu/kaihatsu/tochitorihiki.html'},
  {icon:'🏥',title:'苫小牧保健所｜営業許可・営業届出',category:'保健所・食品',detail:'飲食店・食品営業の申請方法、必要書類、各種様式の総合案内',url:'https://www.iburi.pref.hokkaido.lg.jp/hk/tth/155565.html'},
  {icon:'🍜',title:'短期の臨時営業許可申請書（PDF）',category:'保健所・イベント',detail:'イベント等で短期間、飲食物を調理・提供する場合の許可申請書',url:'https://www.iburi.pref.hokkaido.lg.jp/fs/1/3/1/5/0/0/4/5/_/%E8%87%A8%E6%99%82%E5%96%B6%E6%A5%AD%E8%A8%B1%E5%8F%AF%E7%94%B3%E8%AB%8B%E6%9B%B8.pdf'},
  {icon:'📊',title:'短期の臨時営業許可申請書（Excel）',category:'保健所・イベント',detail:'入力して使えるExcel版の申請書',url:'https://www.iburi.pref.hokkaido.lg.jp/fs/1/3/1/5/0/0/3/3/_/%E8%87%A8%E6%99%82%E5%96%B6%E6%A5%AD%E8%A8%B1%E5%8F%AF%E7%94%B3%E8%AB%8B%E6%9B%B8.xlsx'},
  {icon:'📐',title:'臨時営業｜平面図・調理販売方法',category:'保健所・イベント',detail:'会場レイアウト、設備、調理・販売方法を記載する添付様式',url:'https://www.iburi.pref.hokkaido.lg.jp/fs/1/3/1/5/0/0/6/4/_/%E5%B9%B3%E9%9D%A2%E5%9B%B3%E3%80%81%E8%AA%BF%E7%90%86%E8%B2%A9%E5%A3%B2%E6%96%B9%E6%B3%95.pdf'},
  {icon:'🏫',title:'学校祭・バザーの開設届',category:'保健所・イベント',detail:'学校祭やバザーで食品を提供する場合の届出様式',url:'https://www.iburi.pref.hokkaido.lg.jp/fs/1/0/4/5/9/1/0/6/_/%E3%83%90%E3%82%B6%E3%83%BC%E3%81%AE%E9%96%8B%E8%A8%AD%E5%B1%8A.doc'},
  {icon:'🏘️',title:'町内会行事｜飲食物提供施設の開設届',category:'保健所・イベント',detail:'町内会などの地域行事で飲食物を提供する場合の届出様式',url:'https://www.iburi.pref.hokkaido.lg.jp/fs/8/7/4/3/7/1/7/_/%E9%A3%B2%E9%A3%9F%E7%89%A9%E3%82%92%E6%8F%90%E4%BE%9B%E3%81%99%E3%82%8B%E6%96%BD%E8%A8%AD%E3%81%AE%E9%96%8B%E8%A8%AD%E5%B1%8A%28%E7%94%BA%E5%86%85%E4%BC%9A%E5%90%91%E3%81%91%29%E8%8B%AB%E5%B0%8F%E7%89%A7.doc'},
  {icon:'🧪',title:'食品衛生検査の依頼',category:'保健所・検査',detail:'食品・水などの衛生検査を依頼するときの案内と様式',url:'https://www.iburi.pref.hokkaido.lg.jp/hk/tth/155565.html'}
];


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
  return v===null||v===undefined
    ?''
    :String(v);
}


function sameId(a,b){
  return idStr(a)===idStr(b);
}


function say(t){

  const el=$('toast');

  if(!el)return;

  el.textContent=t;

  el.classList.remove(
    'hidden'
  );

  setTimeout(
    ()=>{
      el.classList.add(
        'hidden'
      );
    },
    1800
  );
}


function openExternal(url){

  if(!url)return false;

  const a=
    document.createElement(
      'a'
    );

  a.href=url;

  a.target='_blank';

  a.rel=
    'noopener noreferrer';

  a.style.display=
    'none';

  document.body
    .appendChild(a);

  a.click();

  a.remove();

  return true;
}


function isIOS(){

  return /iPad|iPhone|iPod/.test(
    navigator.userAgent
  ) || (
    navigator.platform==='MacIntel' &&
    navigator.maxTouchPoints>1
  );
}


function formatBytes(value){

  const bytes=Number(value)||0;

  if(bytes<1024)return `${bytes} B`;
  if(bytes<1024*1024)return `${(bytes/1024).toFixed(1)} KB`;

  return `${(bytes/1024/1024).toFixed(1)} MB`;
}


/* =========================================================
   API
========================================================= */

async function api(
  method='GET',
  body=null
){

  const headers={
    'Content-Type':
      'application/json',

    'x-workspace-code':
      C||'TOMA-2026'
  };

  if(N){

    headers[
      'x-member-name'
    ]=
      encodeURIComponent(N);
  }

  const options={
    method,
    headers,
    cache:'no-store',
    credentials:'same-origin'
  };

  if(body){

    options.body=
      JSON.stringify(body);
  }

  try{

    const r=
      await fetch(
        '/api/data',
        options
      );

    const text=
      await r.text();

    let j={};

    try{

      j=
        text
          ?JSON.parse(text)
          :{};

    }catch(e){

      j={
        error:
          'APIから正常なデータが返りませんでした'
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

    if(
      e instanceof TypeError
    ){

      throw new Error(
        'サーバーへ接続できませんでした'
      );
    }

    throw e;
  }
}


async function load(){

  const d=
    await api();

  state={
    schedules:
      d.schedules||[],

    messages:
      d.messages||[],

    items:
      d.items||[],

    minutes:
      d.minutes||[],

    reviews:
      d.reviews||[],

    permits:
      d.permits||[],

    onlineMembers:
      d.onlineMembers||[]
  };
}


async function syncDriveChanges(showMessage=false){

  if(driveSyncing)return 0;

  driveSyncing=true;

  try{
    const result=await api(
      'POST',
      {
        action:'drive_sync',
        by:N||'Google Drive'
      }
    );

    const count=Number(result.updated||0);

    if(showMessage){
      say(count?`${count}件を最新版に更新しました`:'最新の状態です');
    }

    return count;
  }finally{
    driveSyncing=false;
  }
}


/* =========================================================
   ログイン
========================================================= */

async function doLogin(){

  const codeEl=
    $('code');

  const nameEl=
    $('memberName');

  const btn=
    $('enter');

  const status=
    $('loginStatus');

  if(
    !codeEl||
    !btn
  ){

    alert(
      'ログイン画面の読み込みに失敗しました'
    );

    return;
  }

  C='TOMA-2026';

  codeEl.value=C;

  N=
    nameEl
      ?nameEl.value.trim()
      :'';

  if(!N){

    if(status){
      status.className='err';
      status.textContent='名前を入力してください。';
    }

    nameEl?.focus();
    return;
  }

  btn.disabled=true;

  if(status){

    status.className=
      'meta';

    status.textContent=
      '接続中…';
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

    $('login')
      ?.classList
      .add(
        'hidden'
      );

    $('nav')
      ?.classList
      .remove(
        'hidden'
      );

    go('home');

    startPresence();

    say(
      'ログインしました'
    );

  }catch(e){

    console.error(e);

    if(status){

      status.className=
        'err';

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


/* =========================================================
   オンライン
========================================================= */

function startPresence(){

  if(presenceTimer){

    clearInterval(
      presenceTimer
    );
  }

  presenceTimer=
    setInterval(
      async()=>{

        if(
          !C||
          !N
        )return;

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
  .map(
    x=>x.member_name
  )
  .filter(Boolean);
}


/* =========================================================
   ファイル基本
========================================================= */

function dataUrlToBlob(
  dataUrl
){

  const m=
    String(
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

  const raw=
    m[3]||
    '';

  let bytes;

  if(m[2]){

    bytes=
      Uint8Array.from(
        atob(raw),
        c=>c.charCodeAt(0)
      );

  }else{

    bytes=
      new TextEncoder()
      .encode(
        decodeURIComponent(raw)
      );
  }

  return new Blob(
    [bytes],
    {
      type:mime
    }
  );
}


function isPreviewable(f){

  const mime=
    (
      f.mime_type||
      ''
    ).toLowerCase();

  const name=
    (
      f.name||
      ''
    ).toLowerCase();

  return (
    mime.startsWith(
      'image/'
    )||
    mime===
      'application/pdf'||
    name.endsWith(
      '.pdf'
    )
  );
}


function isSpreadsheet(f){

  const name=
    String(
      f?.name||
      ''
    ).toLowerCase();

  return (
    name.endsWith(
      '.xlsx'
    )||
    name.endsWith(
      '.xls'
    )||
    name.endsWith(
      '.csv'
    )
  );
}


function driveUrl(f){

  if(!f)return null;

  if(
    typeof f.file_data===
      'string' &&
    /^https?:\/\//i.test(
      f.file_data
    )
  ){

    return f.file_data;
  }

  let content=
    f.content;

  if(
    typeof content===
      'string'
  ){

    try{

      content=
        JSON.parse(
          content
        );

    }catch(e){}
  }

  if(
    content &&
    typeof content===
      'object' &&
    content.webViewLink
  ){

    return content.webViewLink;
  }

  return null;
}


function googleEditUrl(f){

  if(!f)return null;

  let content=f.content;

  if(typeof content==='string'){
    try{
      content=JSON.parse(content);
    }catch(e){
      return null;
    }
  }

  const url=content?.googleEditLink;

  return typeof url==='string' && /^https?:\/\//i.test(url)
    ?url
    :null;
}


function closeFilePreview(){

  const viewer=
    document.getElementById(
      'tomaFilePreview'
    );

  if(!viewer)return;

  const blobUrl=
    viewer.dataset.blobUrl;

  viewer.remove();

  if(blobUrl){
    URL.revokeObjectURL(blobUrl);
  }
}


function showFilePreview(f,blob){

  closeFilePreview();

  const blobUrl=
    URL.createObjectURL(blob);

  const viewer=
    document.createElement('div');

  viewer.id='tomaFilePreview';
  viewer.dataset.blobUrl=blobUrl;
  viewer.style.cssText=`
    position:fixed;
    inset:0;
    z-index:10000;
    background:#f4f8fb;
    display:flex;
    flex-direction:column;
  `;

  const mime=
    String(f.mime_type||blob.type||'')
      .toLowerCase();

  const content=
    mime.startsWith('image/')
      ?`<img src="${blobUrl}" alt="" style="max-width:100%;max-height:100%;object-fit:contain;margin:auto">`
      :`<iframe src="${blobUrl}" title="${esc(f.name||'ファイル')}" style="width:100%;height:100%;border:0;background:#fff"></iframe>`;

  viewer.innerHTML=`
    <div style="display:flex;align-items:center;gap:12px;padding:12px;background:#fff;border-bottom:1px solid #d8e2e8;padding-top:max(12px,env(safe-area-inset-top))">
      <button type="button" data-close-preview class="btn light">閉じる</button>
      <strong style="min-width:0;overflow-wrap:anywhere">${esc(f.name||'ファイル')}</strong>
    </div>
    <div style="flex:1;min-height:0;display:flex">${content}</div>
  `;

  viewer
    .querySelector('[data-close-preview]')
    .onclick=closeFilePreview;

  document.body.appendChild(viewer);
}


async function openFile(f){

  try{

    if(!f){

      alert(
        'ファイルが見つかりません'
      );

      return;
    }

    const url=
      driveUrl(f);

    if(url){

      if(isSpreadsheet(f)){
        await editFile(f);
        return;
      }

      const response=
        await fetch(url,{
          credentials:'same-origin',
          cache:'no-store'
        });

      if(!response.ok){
        throw new Error(
          `取得エラー（${response.status}）`
        );
      }

      const blob=
        await response.blob();

      if(isPreviewable(f)){
        showFilePreview(f,blob);
        return;
      }

      const blobUrl=
        URL.createObjectURL(blob);

      const a=
        document.createElement('a');

      a.href=blobUrl;
      a.download=f.name||'download';
      document.body.appendChild(a);
      a.click();
      a.remove();

      setTimeout(
        ()=>URL.revokeObjectURL(blobUrl),
        120000
      );

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
      URL.createObjectURL(
        blob
      );

    const a=
      document.createElement(
        'a'
      );

    a.href=
      blobUrl;

    if(
      isPreviewable(f)
    ){

      a.target='_blank';

      a.rel=
        'noopener noreferrer';

    }else{

      a.download=
        f.name||
        'download';
    }

    a.style.display=
      'none';

    document.body
      .appendChild(a);

    a.click();

    a.remove();

    setTimeout(
      ()=>{
        URL.revokeObjectURL(
          blobUrl
        );
      },
      120000
    );

  }catch(e){

    alert(
      'ファイルを開けません：'+
      e.message
    );
  }
}


/* =========================================================
   SheetJS
========================================================= */

async function loadXLSX(){

  if(window.XLSX){

    return window.XLSX;
  }

  if(xlsxPromise){

    return xlsxPromise;
  }

  xlsxPromise=
    new Promise(
      (
        resolve,
        reject
      )=>{

        const s=
          document.createElement(
            'script'
          );

        s.src=
          XLSX_URL;

        s.async=true;

        s.onload=
          ()=>{

            if(window.XLSX){

              resolve(
                window.XLSX
              );

            }else{

              reject(
                new Error(
                  'Excel編集機能を読み込めませんでした'
                )
              );
            }
          };

        s.onerror=
          ()=>{

            reject(
              new Error(
                'Excel編集機能を読み込めませんでした'
              )
            );
          };

        document.head
          .appendChild(s);
      }
    );

  return xlsxPromise;
}


/* =========================================================
   Excel編集 CSS
========================================================= */

function ensureEditorStyle(){

  if(
    document.getElementById(
      'tomaEditorStyle'
    )
  )return;

  const style=
    document.createElement(
      'style'
    );

  style.id=
    'tomaEditorStyle';

  style.textContent=`

#tomaEditor{
 position:fixed;
 inset:0;
 z-index:9999999;
 background:#f5f7fa;
 display:flex;
 flex-direction:column;
 color:#111;
 font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
}

#tomaEditor .teTop{
 display:flex;
 align-items:center;
 gap:8px;
 padding:max(10px,env(safe-area-inset-top)) 10px 10px;
 background:#fff;
 border-bottom:1px solid #ddd;
}

#tomaEditor .teTitle{
 flex:1;
 min-width:0;
 font-size:14px;
 font-weight:700;
 overflow:hidden;
 text-overflow:ellipsis;
 white-space:nowrap;
}

#tomaEditor button{
 border:0;
 border-radius:10px;
 padding:10px 14px;
 font-size:14px;
 font-weight:700;
}

#tomaEditor .teBack{
 background:#e9eef3;
 color:#111;
}

#tomaEditor .teSave{
 background:#0879d1;
 color:#fff;
}

#tomaEditor .teTabs{
 display:flex;
 gap:6px;
 padding:8px;
 overflow-x:auto;
 background:#fff;
 border-bottom:1px solid #ddd;
}

#tomaEditor .teTabs button{
 white-space:nowrap;
 background:#edf2f7;
 color:#222;
}

#tomaEditor .teTabs button.on{
 background:#0879d1;
 color:#fff;
}

#tomaEditor .teGrid{
 flex:1;
 overflow:auto;
 background:#fff;
 -webkit-overflow-scrolling:touch;
}

#tomaEditor table{
 border-collapse:collapse;
 table-layout:fixed;
 min-width:max-content;
}

#tomaEditor th{
 border:1px solid #ccd3da;
 background:#f0f3f6;
 min-width:100px;
 height:32px;
 text-align:center;
 font-size:12px;
 position:sticky;
 top:0;
 z-index:3;
}

#tomaEditor th.rowHead{
 width:44px;
 min-width:44px;
 left:0;
 z-index:4;
}

#tomaEditor tbody th.rowHead{
 top:auto;
}

#tomaEditor td{
 border:1px solid #d6dce2;
 width:100px;
 min-width:100px;
 height:36px;
 padding:0;
}

#tomaEditor input{
 box-sizing:border-box;
 width:100%;
 height:36px;
 border:0;
 border-radius:0;
 outline:none;
 padding:5px 7px;
 font-size:16px;
 background:#fff;
}

#tomaEditor input:focus{
 box-shadow:inset 0 0 0 2px #0879d1;
}

#tomaEditor .teStatus{
 padding:8px 10px max(8px,env(safe-area-inset-bottom));
 background:#fff;
 border-top:1px solid #ddd;
 color:#555;
 font-size:12px;
}

`;

  document.head
    .appendChild(
      style
    );
}


/* =========================================================
   Excelセル
========================================================= */

function columnName(index){

  let result='';

  let number=
    index+1;

  while(number>0){

    const r=
      (
        number-1
      )%26;

    result=
      String.fromCharCode(
        65+r
      )+
      result;

    number=
      Math.floor(
        (
          number-1
        )/26
      );
  }

  return result;
}


function editorCellText(cell){

  if(!cell)return '';

  if(cell.f){

    return '='+cell.f;
  }

  if(
    cell.v===null||
    cell.v===undefined
  ){

    return '';
  }

  return String(
    cell.v
  );
}


function setEditorCell(
  sheet,
  address,
  value
){

  const XLSX=
    window.XLSX;

  const text=
    String(
      value??''
    );

  if(text===''){

    delete sheet[
      address
    ];

  }else if(
    text.startsWith('=')
  ){

    sheet[address]={
      t:'n',
      f:text.slice(1)
    };

  }else if(
    /^[-+]?\d+(?:\.\d+)?$/
      .test(
        text.trim()
      )
  ){

    sheet[address]={
      t:'n',
      v:Number(
        text.trim()
      )
    };

  }else{

    sheet[address]={
      t:'s',
      v:text
    };
  }

  const p=
    XLSX.utils
    .decode_cell(
      address
    );

  let range;

  if(
    sheet['!ref']
  ){

    range=
      XLSX.utils
      .decode_range(
        sheet['!ref']
      );

  }else{

    range={
      s:{
        r:0,
        c:0
      },
      e:{
        r:0,
        c:0
      }
    };
  }

  range.e.r=
    Math.max(
      range.e.r,
      p.r
    );

  range.e.c=
    Math.max(
      range.e.c,
      p.c
    );

  sheet['!ref']=
    XLSX.utils
    .encode_range(
      range
    );
}


function editorStatus(
  text=''
){

  const el=
    document.querySelector(
      '#tomaEditor .teStatus'
    );

  if(!el)return;

  if(text){

    el.textContent=text;

    return;
  }

  el.textContent=
    editorCurrent?.dirty
      ?'未保存の変更があります'
      :'保存済み';
}


/* =========================================================
   Excelシート描画
========================================================= */

function renderEditorGrid(){

  if(!editorCurrent)return;

  const XLSX=
    window.XLSX;

  const sheet=
    editorCurrent.workbook
    .Sheets[
      editorCurrent.sheetName
    ];

  let range={
    s:{
      r:0,
      c:0
    },
    e:{
      r:0,
      c:0
    }
  };

  if(
    sheet['!ref']
  ){

    range=
      XLSX.utils
      .decode_range(
        sheet['!ref']
      );
  }

  const rows=
    Math.min(
      Math.max(
        range.e.r+1,
        30
      ),
      200
    );

  const cols=
    Math.min(
      Math.max(
        range.e.c+1,
        10
      ),
      50
    );

  const wrap=
    document.querySelector(
      '#tomaEditor .teGrid'
    );

  if(!wrap)return;

  wrap.innerHTML='';

  const table=
    document.createElement(
      'table'
    );

  const thead=
    document.createElement(
      'thead'
    );

  const hr=
    document.createElement(
      'tr'
    );

  const corner=
    document.createElement(
      'th'
    );

  corner.className=
    'rowHead';

  hr.appendChild(
    corner
  );

  for(
    let c=0;
    c<cols;
    c++
  ){

    const th=
      document.createElement(
        'th'
      );

    th.textContent=
      columnName(c);

    hr.appendChild(
      th
    );
  }

  thead.appendChild(
    hr
  );

  table.appendChild(
    thead
  );

  const tbody=
    document.createElement(
      'tbody'
    );

  for(
    let r=0;
    r<rows;
    r++
  ){

    const tr=
      document.createElement(
        'tr'
      );

    const rh=
      document.createElement(
        'th'
      );

    rh.className=
      'rowHead';

    rh.textContent=
      String(r+1);

    tr.appendChild(
      rh
    );

    for(
      let c=0;
      c<cols;
      c++
    ){

      const td=
        document.createElement(
          'td'
        );

      const input=
        document.createElement(
          'input'
        );

      const address=
        XLSX.utils
        .encode_cell({
          r,
          c
        });

      input.value=
        editorCellText(
          sheet[address]
        );

      input.autocomplete=
        'off';

      input.spellcheck=
        false;

      input.oninput=
        ()=>{

          setEditorCell(
            sheet,
            address,
            input.value
          );

          editorCurrent.dirty=
            true;

          editorStatus();
        };

      td.appendChild(
        input
      );

      tr.appendChild(
        td
      );
    }

    tbody.appendChild(
      tr
    );
  }

  table.appendChild(
    tbody
  );

  wrap.appendChild(
    table
  );

  editorStatus();
}


function renderEditorTabs(){

  const wrap=
    document.querySelector(
      '#tomaEditor .teTabs'
    );

  if(
    !wrap||
    !editorCurrent
  )return;

  wrap.innerHTML='';

  editorCurrent.workbook
    .SheetNames
    .forEach(
      name=>{

        const b=
          document.createElement(
            'button'
          );

        b.type=
          'button';

        b.textContent=
          name;

        if(
          name===
          editorCurrent.sheetName
        ){

          b.className=
            'on';
        }

        b.onclick=
          ()=>{

            editorCurrent.sheetName=
              name;

            renderEditorTabs();

            renderEditorGrid();
          };

        wrap.appendChild(
          b
        );
      }
    );
}


/* =========================================================
   Excel保存
========================================================= */

function bytesToBase64(
  bytes
){

  let binary='';

  const step=
    0x8000;

  for(
    let i=0;
    i<bytes.length;
    i+=step
  ){

    binary+=
      String.fromCharCode(
        ...bytes.subarray(
          i,
          Math.min(
            i+step,
            bytes.length
          )
        )
      );
  }

  return btoa(
    binary
  );
}


async function saveEditor(){

  if(
    !editorCurrent ||
    editorCurrent.saving
  )return;

  const current=
    editorCurrent;

  current.saving=true;

  const saveButton=
    document.getElementById(
      'teSave'
    );

  if(saveButton){
    saveButton.disabled=true;
    saveButton.textContent='保存中…';
  }

  try{

    editorStatus(
      '保存中…'
    );

    const XLSX=
      window.XLSX;

    const filename=
      current.file.name;

    const lower=
      filename.toLowerCase();

    let output;
    let mime;

    if(
      lower.endsWith(
        '.csv'
      )
    ){

      const csv=
        XLSX.utils
        .sheet_to_csv(
          current.workbook
          .Sheets[
            current.sheetName
          ]
        );

      output=
        new TextEncoder()
        .encode(csv);

      mime=
        'text/csv';

    }else if(
      lower.endsWith(
        '.xls'
      )
    ){

      output=
        new Uint8Array(
          XLSX.write(
            current.workbook,
            {
              type:'array',
              bookType:'xls'
            }
          )
        );

      mime=
        'application/vnd.ms-excel';

    }else{

      output=
        new Uint8Array(
          XLSX.write(
            current.workbook,
            {
              type:'array',
              bookType:'xlsx'
            }
          )
        );

      mime=
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    if(
      output.byteLength>
      2500000
    ){

      throw new Error(
        '編集後のファイルが大きすぎます。現在は約2.5MBまで保存できます。'
      );
    }

    await api(
      'POST',
      {
        action:
          'version',

        id:
          current.file.id,

        parent_id:
          current.file.parent_id||
          null,

        name:
          filename,

        mime_type:
          mime,

        size:
          output.byteLength,

        data:
          `data:${mime};base64,${bytesToBase64(output)}`,

        by:N
      }
    );

    current.dirty=
      false;

    editorStatus(
      '保存しました'
    );

    setTimeout(
      async()=>{

        if(editorCurrent!==current){
          return;
        }

        document
          .getElementById(
            'tomaEditor'
          )
          ?.remove();

        editorCurrent=null;

        await load();

        go('drive');

        say(
          'Excelを保存しました'
        );

      },
      600
    );

  }catch(e){

    current.saving=false;

    if(saveButton){
      saveButton.disabled=false;
      saveButton.textContent='保存';
    }

    console.error(e);

    editorStatus(
      '保存に失敗しました'
    );

    alert(
      '保存できませんでした。\n\n'+
      e.message
    );
  }
}


function closeEditor(){

  if(
    editorCurrent?.dirty
  ){

    if(
      !confirm(
        '保存していない変更があります。\n閉じてもよろしいですか？'
      )
    ){

      return;
    }
  }

  document
    .getElementById(
      'tomaEditor'
    )
    ?.remove();

  editorCurrent=null;
}


/* =========================================================
   Excelを編集で開く
========================================================= */

async function editFile(
  file
){

  try{

    if(!file){

      throw new Error(
        'ファイルが見つかりません'
      );
    }

    if(
      !isSpreadsheet(file)
    ){

      throw new Error(
        '現在はExcel・CSVファイルを編集できます'
      );
    }

    await loadXLSX();

    const response=
      await fetch(
        `/api/data?file=${encodeURIComponent(file.id)}`,
        {
          method:'GET',

          headers:{
            'x-workspace-code':
              C||'TOMA-2026'
          },

          cache:'no-store',

          credentials:
            'same-origin'
        }
      );

    if(!response.ok){

      throw new Error(
        `ファイルを取得できませんでした (${response.status})`
      );
    }

    const buffer=
      await response
      .arrayBuffer();

    const workbook=
      window.XLSX.read(
        buffer,
        {
          type:'array',
          cellDates:true
        }
      );

    if(
      !workbook.SheetNames||
      !workbook.SheetNames.length
    ){

      throw new Error(
        'シートがありません'
      );
    }

    ensureEditorStyle();

    document
      .getElementById(
        'tomaEditor'
      )
      ?.remove();

    editorCurrent={
      file,
      workbook,
      sheetName:
        workbook.SheetNames[0],
      dirty:false
    };

    const editor=
      document.createElement(
        'div'
      );

    editor.id=
      'tomaEditor';

    editor.innerHTML=`

      <div class="teTop">

        <button
          type="button"
          class="teBack"
          id="teBack"
        >
          ← 戻る
        </button>

        <div
          class="teTitle"
        ></div>

        <button
          type="button"
          class="teSave"
          id="teSave"
        >
          保存
        </button>

      </div>

      <div class="teTabs"></div>

      <div class="teGrid"></div>

      <div class="teStatus">
        読み込み完了
      </div>
    `;

    document.body
      .appendChild(
        editor
      );

    editor
      .querySelector(
        '.teTitle'
      )
      .textContent=
        '✏️ '+
        file.name;

    $('teBack').onclick=
      closeEditor;

    $('teSave').onclick=
      saveEditor;

    renderEditorTabs();

    renderEditorGrid();

  }catch(e){

    console.error(e);

    alert(
      '編集画面を開けません。\n\n'+
      e.message
    );
  }
}


/* =========================================================
   アップロード
========================================================= */

function pickFile(
  id=null
){

  const input=
    document.createElement(
      'input'
    );

  input.type=
    'file';

  input.name=
    'toma-share-file';

  input.setAttribute(
    'aria-label',
    '共有するファイルを選択'
  );

  input.accept=
    '.xlsx,.xls,.csv,.doc,.docx,.ppt,.pptx,.pdf,image/*';

  input.style.position=
    'fixed';

  input.style.left=
    '-9999px';

  document.body
    .appendChild(
      input
    );

  let picked=false;

  const cleanup=()=>{
    setTimeout(
      ()=>input.remove(),
      0
    );
  };

  const onReturn=()=>{
    setTimeout(
      ()=>{
        if(!picked && !input.files?.length){
          input.remove();
        }
      },
      800
    );
  };

  window.addEventListener(
    'focus',
    onReturn,
    {once:true}
  );

  input.onchange=
    ()=>{

      picked=true;

      const f=
        input.files?.[0];

      if(!f){

        cleanup();

        return;
      }

      if(
        f.size>
        2500000
      ){

        alert(
          '現在は1ファイル2.5MB以下でアップロードしてください'
        );

        cleanup();

        return;
      }

      selectedUploadFile=f;

      selectedVersionId=
        id||null;

      if(id){

        const old=
          state.items.find(
            x=>sameId(
              x.id,
              id
            )
          );

        selectedFolderId=
          old?.parent_id
            ?idStr(
                old.parent_id
              )
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

    const data=
      await new Promise(
        (
          resolve,
          reject
        )=>{

          const fr=
            new FileReader();

          fr.onload=
            ()=>resolve(
              fr.result
            );

          fr.onerror=
            ()=>reject(
              new Error(
                'ファイルを読み込めませんでした'
              )
            );

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

        name:
          f.name,

        mime_type:
          f.type||
          'application/octet-stream',

        size:
          f.size,

        data,

        by:N
      }
    );

    selectedUploadFile=null;
    selectedVersionId=null;
    selectedFolderId='';

    await load();

    go('drive');

    say(
      '保存しました'
    );

  }catch(e){

    alert(
      '保存できませんでした。\n\n'+
      e.message
    );

    if(btn){

      btn.disabled=false;

      btn.textContent=
        '保存';
    }
  }
}


function cancelSelectedFile(){

  selectedUploadFile=null;
  selectedVersionId=null;
  selectedFolderId='';

  go('drive');
}


/* =========================================================
   ホーム
========================================================= */

function homeR(){

  const el=
    $('home');

  if(!el)return;

  const online=
    onlineNames();

  el.innerHTML=`

    <div class="panel">

      <div class="ok">
        🟢 クラウド接続中｜${esc(N)}
      </div>

      <div
        class="item"
        style="margin-top:12px"
      >

        <div class="title">
          👥 オンライン ${online.length}人
        </div>

        <div class="meta">

          ${
            online.length
              ?online
                .map(
                  x=>esc(x)
                )
                .join('・')
              :'オンラインのメンバーはいません'
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
        <div class="ct">共有ドライブ</div>
        <div class="meta">${state.items.filter(x=>x.item_type==='file').length}資料</div>
      </button>

      <button
        class="card"
        data-go="chat"
      >
        <div class="ico">💬</div>
        <div class="ct">メッセージ</div>
        <div class="meta">${state.messages.length}件</div>
      </button>

      <button
        class="card"
        data-go="cal"
      >
        <div class="ico">📅</div>
        <div class="ct">スケジュール</div>
        <div class="meta">${state.schedules.length}件</div>
      </button>

      <button
        class="card"
        data-go="more"
      >
        <div class="ico">📝</div>
        <div class="ct">議事録</div>
        <div class="meta">${state.minutes.length}件</div>
      </button>

      <button class="card" data-go="more">
        <div class="ico">💡</div>
        <div class="ct">反省点・改善</div>
        <div class="meta">${state.reviews.length}件</div>
      </button>

      <button class="card" data-go="more">
        <div class="ico">✅</div>
        <div class="ct">許可・申請</div>
        <div class="meta">${state.permits.length}件</div>
      </button>

      <button class="card" data-go="more">
        <div class="ico">🎪</div>
        <div class="ct">苫小牧イベント</div>
        <div class="meta">年間行事</div>
      </button>

      <button class="card" data-go="home">
        <div class="ico">👥</div>
        <div class="ct">共有メンバー</div>
        <div class="meta">オンライン ${online.length}人</div>
      </button>

    </div>
  `;

  document
    .querySelectorAll(
      '[data-go]'
    )
    .forEach(
      b=>{

        b.onclick=
          ()=>go(
            b.dataset.go
          );
      }
    );
}


/* =========================================================
   ファイル行
========================================================= */

function fileRow(file){

  const isDrive=
    !!driveUrl(file);

  const editable=
    isSpreadsheet(file) &&
    !!googleEditUrl(file);

  const openLabel=
    isPreviewable(file)
      ?'表示'
      :'保存して開く';

  return `

    <div class="item fileItem">

      <div class="fileInfo">

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

      <div class="fileActions">

        <button
          class="btn light"
          data-open="${esc(file.id)}"
        >
          ${openLabel}
        </button>

        ${
          editable
            ?`
              <button
                class="btn"
                data-edit="${esc(file.id)}"
                style="
                  background:#16864f;
                  color:#fff
                "
              >
                Googleで編集
              </button>
            `
            :''
        }

        <button
          class="btn light"
          data-ver="${esc(file.id)}"
        >
          更新版
        </button>

        <button
          class="btn danger"
          data-del="${esc(file.id)}"
        >
          削除
        </button>

      </div>
    </div>
  `;
}


/* =========================================================
   ドライブ
========================================================= */

function driveR(){

  const el=
    $('drive');

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

  if(
    selectedUploadFile
  ){

    const folderOptions=
      folders
      .map(
        f=>`
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
        `
      )
      .join('');

    uploadBox=`

      <div class="panel">

        <div class="title">
          📤 ファイルを保存
        </div>

        <div class="item">
          <div class="title">${esc(selectedUploadFile.name)}</div>
          <div class="meta">${formatBytes(selectedUploadFile.size)}</div>
        </div>

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
      ?folders
      .map(
        folder=>{

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
                  data-del="${esc(folder.id)}"
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
        }
      )
      .join('')
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
        Excel・CSVは「編集」から直接編集できます。1ファイル2.5MBまで。
      </div>

      ${
        isIOS()
          ?'<div class="iosHint">iPhoneでは「開く」のあと、共有ボタンから“ファイルに保存”もできます。</div>'
          :''
      }

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
          ?rootFiles
            .map(fileRow)
            .join('')
          :'<div class="empty">ファイルはありません</div>'
      }

    </div>
  `;

  $('refreshD').onclick=
    async()=>{

      const button=$('refreshD');
      if(button){
        button.disabled=true;
        button.textContent='確認中…';
      }

      await syncDriveChanges(true);
      await load();

      go('drive');
    };

  $('up').onclick=
    ()=>pickFile();

  $('newF').onclick=
    async()=>{

      const name=
        prompt(
          'フォルダ名'
        );

      if(!name)return;

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
    };

  $('openSheet').onclick=
    ()=>openExternal(
      SHEET_URL
    );

  if(
    $('folderSelect')
  ){

    $('folderSelect').onchange=
      ()=>{
        selectedFolderId=
          $('folderSelect').value;
      };
  }

  if(
    $('saveSelectedFile')
  ){

    $('saveSelectedFile').onclick=
      saveSelectedFile;
  }

  if(
    $('cancelSelectedFile')
  ){

    $('cancelSelectedFile').onclick=
      cancelSelectedFile;
  }

  document
    .querySelectorAll(
      '[data-open]'
    )
    .forEach(
      b=>{

        b.onclick=
          ()=>{

            const f=
              files.find(
                x=>sameId(
                  x.id,
                  b.dataset.open
                )
              );

            openFile(f);
          };
      }
    );

  document
    .querySelectorAll(
      '[data-edit]'
    )
    .forEach(
      b=>{

        b.onclick=
          ()=>{

            const f=
              files.find(
                x=>sameId(
                  x.id,
                  b.dataset.edit
                )
              );

            const url=
              googleEditUrl(f);

            if(!url){
              alert('Googleドライブの編集リンクが見つかりません');
              return;
            }

            openExternal(url);

            /* 編集開始時点のDrive更新日時を記録 */
            syncDriveChanges(false)
              .catch(e=>console.error(e));
          };
      }
    );

  document
    .querySelectorAll(
      '[data-ver]'
    )
    .forEach(
      b=>{

        b.onclick=
          ()=>pickFile(
            b.dataset.ver
          );
      }
    );

  document
    .querySelectorAll(
      '[data-del]'
    )
    .forEach(
      b=>{

        b.onclick=
          async()=>{

            if(
              !confirm(
                '削除しますか？'
              )
            )return;

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
          };
      }
    );
}


/* =========================================================
   メッセージ
========================================================= */

function chatR(){

  const el=
    $('chat');

  if(!el)return;

  const messages=
    state.messages
    .map(
      x=>`
        <div class="item">

          <div>
            ${esc(x.name)}
          </div>

          <div class="meta">
            ${esc(x.updated_by||'')}
          </div>

        </div>
      `
    )
    .join('');

  el.innerHTML=`

    <div class="panel">

      <div class="title">
        💬 メッセージ
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

  $('send').onclick=
    async()=>{

      const text=
        $('msg').value.trim();

      if(!text)return;

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
    };
}


/* =========================================================
   スケジュール
========================================================= */

function calR(){

  const el=
    $('cal');

  if(!el)return;

  const list=
    state.schedules
    .map(
      x=>`

        <div class="item">

          <div class="title">
            ${esc(x.title)}
          </div>

          <div class="meta">
            ${
              x.starts_at
                ?new Date(
                    x.starts_at
                  )
                  .toLocaleString(
                    'ja-JP'
                  )
                :''
            }
          </div>

        </div>
      `
    )
    .join('');

  el.innerHTML=`

    <div class="panel">

      <div class="title">
        📅 スケジュール
      </div>

      ${
        list||
        '<div class="empty">まだありません</div>'
      }

      <input
        id="sdate"
        type="date"
      >

      <input
        id="stime"
        type="time"
        value="09:00"
      >

      <input
        id="ttl"
        placeholder="予定名"
      >

      <button
        class="btn"
        id="addS"
      >
        追加
      </button>

    </div>
  `;

  $('addS').onclick=
    async()=>{

      const date=
        $('sdate').value;

      const time=
        $('stime').value||
        '09:00';

      const title=
        $('ttl').value.trim();

      if(
        !date||
        !title
      )return;

      await api(
        'POST',
        {
          action:'schedule',
          title,
          starts_at:
            `${date}T${time}:00+09:00`,
          ends_at:null,
          place:'',
          memo:'',
          by:N
        }
      );

      await load();

      go('cal');
    };
}


/* =========================================================
   その他
========================================================= */

function recordRow(x,kind){

  let detail='';

  if(kind==='minute'){
    detail=`${x.meeting_date||''} ${x.body||''} ${x.action_items||''}`;
  }else if(kind==='review'){
    detail=`${x.category||''} ${x.body||''}`;
  }else{
    detail=`${x.organization||''} ${x.contact||''} ${x.body||''}`;
  }

  return `
    <div class="item recordItem">
      <div class="recordBody">
        <div class="title">${esc(x.title)}</div>
        <div class="meta">${esc(detail)}</div>
        <div class="meta">更新：${esc(x.updated_by||'')}</div>
      </div>
      <button class="btn danger" data-rdel="${esc(x.id)}" data-kind="${esc(kind)}">削除</button>
    </div>
  `;
}

function officialPermitRows(){
  return TOMAKOMAI_PERMIT_LINKS.map(x=>`
    <a class="officialPermit" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">
      <div class="officialPermitIcon">${x.icon}</div>
      <div class="officialPermitBody">
        <div class="title">${esc(x.title)}</div>
        <div class="meta"><span class="pill">${esc(x.category)}</span>${esc(x.detail)}</div>
      </div>
      <div class="officialPermitArrow">›</div>
    </a>
  `).join('');
}

function moreR(){

  const el=
    $('more');

  if(!el)return;

  el.innerHTML=`

    <div class="panel">
      <div class="panelHeading">📝 議事録</div>
      ${state.minutes.length?state.minutes.map(x=>recordRow(x,'minute')).join(''):'<div class="empty">まだありません</div>'}
      <input id="mt" placeholder="会議名">
      <input id="md" type="date">
      <textarea id="mb" placeholder="議事内容"></textarea>
      <textarea id="ma" placeholder="決定事項・担当"></textarea>
      <button class="btn wide" id="addM">議事録を保存</button>
    </div>

    <div class="panel">
      <div class="panelHeading">💡 反省点・改善</div>
      ${state.reviews.length?state.reviews.map(x=>recordRow(x,'review')).join(''):'<div class="empty">まだありません</div>'}
      <input id="rt" placeholder="タイトル">
      <select id="rc"><option>改善</option><option>反省</option><option>良かった点</option><option>次回対応</option></select>
      <textarea id="rb" placeholder="内容"></textarea>
      <button class="btn wide" id="addR">改善内容を保存</button>
    </div>

    <div class="panel">
      <div class="panelHeading">🏛️ 苫小牧の許可・申請一覧</div>
      <div class="meta permitNotice">苫小牧市・北海道（苫小牧保健所）の公式様式と申請方法を確認できます。保健所：若草町2丁目2-21／0144-34-4168</div>
      <div class="officialPermitList">${officialPermitRows()}</div>
    </div>

    <div class="panel">
      <div class="panelHeading">✅ 自分たちの申請・進捗</div>
      ${state.permits.length?state.permits.map(x=>recordRow(x,'permit')).join(''):'<div class="empty">まだありません</div>'}
      <input id="pt" placeholder="申請名">
      <input id="po" placeholder="申請先・組織">
      <input id="pc" placeholder="連絡先">
      <textarea id="pb" placeholder="内容・期限・進捗"></textarea>
      <button class="btn wide" id="addP">申請情報を保存</button>
    </div>

    <div class="panel">

      <div class="title">
        🎪 苫小牧 年間行事
      </div>

      <div class="item">
        <span class="pill">冬</span>スケート・冬季イベント
      </div>

      <div class="item">
        <span class="pill">春</span>地域行事・新年度イベント
      </div>

      <div class="item">
        <span class="pill">夏</span>港まつり・地域フェス・屋外イベント
      </div>

      <div class="item">
        <span class="pill">秋</span>文化・スポーツ・地域イベント
      </div>

    </div>

    <div class="panel installHelp">
      <div class="panelHeading">📱 ホーム画面に追加</div>
      <div class="meta">${isIOS()?'Safariの共有ボタン →「ホーム画面に追加」で、アプリのように起動できます。':'ブラウザのメニューから「ホーム画面に追加」または「アプリをインストール」を選べます。'}</div>
    </div>
  `;

  $('addM').onclick=async()=>{
    if(!$('mt').value.trim())return alert('会議名を入力してください');
    await api('POST',{action:'minute',title:$('mt').value,meeting_date:$('md').value||null,body:$('mb').value,action_items:$('ma').value,by:N});
    await load(); go('more'); say('議事録を保存しました');
  };

  $('addR').onclick=async()=>{
    if(!$('rt').value.trim())return alert('タイトルを入力してください');
    await api('POST',{action:'review',title:$('rt').value,category:$('rc').value,body:$('rb').value,by:N});
    await load(); go('more'); say('改善内容を保存しました');
  };

  $('addP').onclick=async()=>{
    if(!$('pt').value.trim())return alert('申請名を入力してください');
    await api('POST',{action:'permit',title:$('pt').value,organization:$('po').value,contact:$('pc').value,body:$('pb').value,by:N});
    await load(); go('more'); say('申請情報を保存しました');
  };

  document.querySelectorAll('[data-rdel]').forEach(b=>{
    b.onclick=async()=>{
      if(!confirm('削除しますか？'))return;
      await api('POST',{action:'record_delete',kind:b.dataset.kind,id:b.dataset.rdel,by:N});
      await load(); go('more');
    };
  });
}


/* =========================================================
   画面
========================================================= */

function render(){

  if(
    cur==='home'
  )homeR();

  if(
    cur==='drive'
  )driveR();

  if(
    cur==='chat'
  )chatR();

  if(
    cur==='cal'
  )calR();

  if(
    cur==='more'
  )moreR();
}


function go(p){

  cur=p;

  document
    .querySelectorAll(
      'main>section'
    )
    .forEach(
      s=>s.classList.add(
        'hidden'
      )
    );

  $(p)
    ?.classList
    .remove(
      'hidden'
    );

  document
    .querySelectorAll(
      '.nav'
    )
    .forEach(
      n=>{

        n.classList.toggle(
          'on',
          n.dataset.p===p
        );
      }
    );

  render();
}


/* =========================================================
   起動
========================================================= */

function init(){

  C='TOMA-2026';

  localStorage.setItem(
    'tomaCode',
    C
  );

  const codeEl=
    $('code');

  if(codeEl){

    codeEl.value=C;
  }

  const nameEl=
    $('memberName');

  if(nameEl){

    nameEl.value=
      localStorage.getItem(
        'tomaName'
      )||
      '';

    nameEl.onkeydown=
      e=>{

        if(
          e.key==='Enter'
        ){

          doLogin();
        }
      };
  }

  if(
    $('enter')
  ){

    $('enter').onclick=
      doLogin;
  }

  document
    .querySelectorAll(
      '.nav'
    )
    .forEach(
      n=>{

        n.onclick=
          ()=>go(
            n.dataset.p
          );
      }
    );

  document.addEventListener(
    'visibilitychange',
    async()=>{
      if(
        document.visibilityState!=='visible'||
        cur!=='drive'||
        !C||
        !N
      )return;

      try{
        await syncDriveChanges(false);
        await load();
        go('drive');
      }catch(e){
        console.error(e);
      }
    }
  );
}


if(
  document.readyState===
  'loading'
){

  document.addEventListener(
    'DOMContentLoaded',
    init
  );

}else{

  init();
}

})();
