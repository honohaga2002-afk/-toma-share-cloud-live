(()=>{
'use strict';

/* =========================================================
   TOMA SHARE
   Excel / CSV Editor
========================================================= */

const XLSX_URL=
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';

let xlsxPromise=null;

let current=null;


/* ==============================
   基本情報
============================== */

function getCode(){

  return 'TOMA-2026';
}


function getName(){

  try{

    return String(
      localStorage.getItem(
        'tomaName'
      )||
      'メンバー'
    ).trim()||
    'メンバー';

  }catch(e){

    return 'メンバー';
  }
}


/* ==============================
   API
============================== */

async function api(
  method='GET',
  body=null
){

  const headers={
    'Content-Type':
      'application/json',

    'x-workspace-code':
      getCode(),

    'x-member-name':
      encodeURIComponent(
        getName()
      )
  };

  const options={
    method,
    headers,
    cache:'no-store',
    credentials:'same-origin'
  };

  if(body){

    options.body=
      JSON.stringify(
        body
      );
  }

  const response=
    await fetch(
      '/api/data',
      options
    );

  const text=
    await response.text();

  let json={};

  try{

    json=
      text
        ?JSON.parse(text)
        :{};

  }catch(e){}

  if(!response.ok){

    throw new Error(
      json.error||
      `通信エラー (${response.status})`
    );
  }

  return json;
}


/* ==============================
   SheetJS
============================== */

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

        const script=
          document.createElement(
            'script'
          );

        script.src=
          XLSX_URL;

        script.async=
          true;

        script.onload=
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

        script.onerror=
          ()=>{

            reject(
              new Error(
                'Excel編集機能を読み込めませんでした'
              )
            );
          };

        document.head
          .appendChild(
            script
          );
      }
    );

  return xlsxPromise;
}


/* ==============================
   CSS
============================== */

function ensureStyle(){

  if(
    document.getElementById(
      'tomaEditorStyle'
    )
  ){

    return;
  }

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
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

#tomaEditor .topbar{
  display:flex;
  align-items:center;
  gap:8px;
  padding:
    max(10px,env(safe-area-inset-top))
    10px
    10px;
  background:#fff;
  border-bottom:1px solid #ddd;
}

#tomaEditor .title{
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

#tomaEditor .back{
  background:#e9eef3;
  color:#111;
}

#tomaEditor .save{
  background:#0879d1;
  color:#fff;
}

#tomaEditor .tabs{
  display:flex;
  gap:6px;
  padding:8px;
  overflow-x:auto;
  background:#fff;
  border-bottom:1px solid #ddd;
}

#tomaEditor .tabs button{
  white-space:nowrap;
  background:#edf2f7;
  color:#222;
}

#tomaEditor .tabs button.on{
  background:#0879d1;
  color:#fff;
}

#tomaEditor .grid{
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
  background:#fff;
  color:#111;
  font-size:16px;
}

#tomaEditor input:focus{
  box-shadow:
    inset 0 0 0 2px
    #0879d1;
}

#tomaEditor .status{
  padding:
    8px
    10px
    max(
      8px,
      env(safe-area-inset-bottom)
    );
  border-top:1px solid #ddd;
  background:#fff;
  color:#555;
  font-size:12px;
}

`;

  document.head
    .appendChild(
      style
    );
}


/* ==============================
   セル関連
============================== */

function colName(index){

  let result='';
  let num=index+1;

  while(num>0){

    const r=
      (num-1)%26;

    result=
      String.fromCharCode(
        65+r
      )+
      result;

    num=
      Math.floor(
        (num-1)/26
      );
  }

  return result;
}


function getCellText(cell){

  if(!cell){

    return '';
  }

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


function setCell(
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

  const point=
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
      point.r
    );

  range.e.c=
    Math.max(
      range.e.c,
      point.c
    );

  sheet['!ref']=
    XLSX.utils
      .encode_range(
        range
      );
}


/* ==============================
   状態
============================== */

function setStatus(
  text=''
){

  const el=
    document.querySelector(
      '#tomaEditor .status'
    );

  if(!el)return;

  if(text){

    el.textContent=
      text;

    return;
  }

  el.textContent=
    current?.dirty
      ?'未保存の変更があります'
      :'保存済み';
}


/* ==============================
   表
============================== */

function renderGrid(){

  if(!current)return;

  const XLSX=
    window.XLSX;

  const sheet=
    current.workbook
      .Sheets[
        current.sheetName
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
      '#tomaEditor .grid'
    );

  wrap.innerHTML='';

  const table=
    document.createElement(
      'table'
    );

  const thead=
    document.createElement(
      'thead'
    );

  const head=
    document.createElement(
      'tr'
    );

  const corner=
    document.createElement(
      'th'
    );

  corner.className=
    'rowHead';

  head.appendChild(
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
      colName(c);

    head.appendChild(
      th
    );
  }

  thead.appendChild(
    head
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

    const rowHead=
      document.createElement(
        'th'
      );

    rowHead.className=
      'rowHead';

    rowHead.textContent=
      String(r+1);

    tr.appendChild(
      rowHead
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

      input.type=
        'text';

      input.autocomplete=
        'off';

      input.spellcheck=
        false;

      input.value=
        getCellText(
          sheet[address]
        );

      input.oninput=
        ()=>{

          setCell(
            sheet,
            address,
            input.value
          );

          current.dirty=
            true;

          setStatus();
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

  setStatus();
}


/* ==============================
   タブ
============================== */

function renderTabs(){

  const wrap=
    document.querySelector(
      '#tomaEditor .tabs'
    );

  wrap.innerHTML='';

  current.workbook
    .SheetNames
    .forEach(
      name=>{

        const button=
          document.createElement(
            'button'
          );

        button.type=
          'button';

        button.textContent=
          name;

        if(
          name===
          current.sheetName
        ){

          button.className=
            'on';
        }

        button.onclick=
          ()=>{

            current.sheetName=
              name;

            renderTabs();

            renderGrid();
          };

        wrap.appendChild(
          button
        );
      }
    );
}


/* ==============================
   Base64
============================== */

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


/* ==============================
   保存
============================== */

async function save(){

  if(!current)return;

  try{

    setStatus(
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
          .encode(
            csv
          );

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

    const base64=
      bytesToBase64(
        output
      );

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
          current.file.name,

        mime_type:
          mime,

        size:
          output.byteLength,

        data:
          `data:${mime};base64,${base64}`,

        by:
          getName()
      }
    );

    current.dirty=
      false;

    setStatus(
      '保存しました'
    );

    setTimeout(
      ()=>{
        location.reload();
      },
      700
    );

  }catch(error){

    console.error(
      error
    );

    setStatus(
      '保存に失敗しました'
    );

    alert(
      '保存できませんでした。\n\n'+
      error.message
    );
  }
}


/* ==============================
   閉じる
============================== */

function close(){

  if(
    current?.dirty
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

  current=
    null;
}


/* ==============================
   ファイルを開く
============================== */

async function openFile(
  file
){

  try{

    if(!file){

      throw new Error(
        'ファイル情報がありません'
      );
    }

    const name=
      String(
        file.name||
        ''
      ).toLowerCase();

    if(
      !name.endsWith('.xlsx') &&
      !name.endsWith('.xls') &&
      !name.endsWith('.csv')
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
              getCode()
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
      await response.arrayBuffer();

    const workbook=
      window.XLSX.read(
        buffer,
        {
          type:'array',
          cellDates:true
        }
      );

    if(
      !workbook.SheetNames ||
      workbook.SheetNames.length===
      0
    ){

      throw new Error(
        'シートがありません'
      );
    }

    current={
      file,
      workbook,
      sheetName:
        workbook.SheetNames[0],
      dirty:false
    };

    ensureStyle();

    document
      .getElementById(
        'tomaEditor'
      )
      ?.remove();

    const editor=
      document.createElement(
        'div'
      );

    editor.id=
      'tomaEditor';

    editor.innerHTML=`

      <div class="topbar">

        <button
          class="back"
          id="teBack"
          type="button"
        >
          ← 戻る
        </button>

        <div class="title"></div>

        <button
          class="save"
          id="teSave"
          type="button"
        >
          保存
        </button>

      </div>

      <div class="tabs"></div>

      <div class="grid"></div>

      <div class="status">
        読み込み完了
      </div>
    `;

    document.body
      .appendChild(
        editor
      );

    editor.querySelector(
      '.title'
    ).textContent=
      '✏️ '+
      file.name;

    $('teBack');

    document
      .getElementById(
        'teBack'
      )
      .onclick=
        close;

    document
      .getElementById(
        'teSave'
      )
      .onclick=
        save;

    renderTabs();

    renderGrid();

  }catch(error){

    console.error(
      error
    );

    alert(
      '編集画面を開けません。\n\n'+
      error.message
    );
  }
}


/* ==============================
   app.jsから呼べるように公開
============================== */

window.TomaEditor={
  openFile
};

})();
