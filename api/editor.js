(()=>{
'use strict';

/* =========================================================
   TOMA SHARE Spreadsheet Editor
   Excel / XLS / CSV
========================================================= */

const FIXED_CODE = 'TOMA-2026';

const XLSX_URL =
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';

let xlsxPromise = null;
let current = null;
let filesById = new Map();
let scanTimer = null;


/* =========================================================
   基本情報
========================================================= */

function getCode(){

  try{
    localStorage.setItem(
      'tomaCode',
      FIXED_CODE
    );
  }catch(e){}

  return FIXED_CODE;
}


function getName(){

  let name = '';

  try{
    name =
      localStorage.getItem(
        'tomaName'
      ) || '';
  }catch(e){}

  if(!name){

    name =
      document.getElementById(
        'memberName'
      )?.value || '';
  }

  return String(
    name || 'メンバー'
  ).trim() || 'メンバー';
}


/* =========================================================
   API
========================================================= */

async function api(
  method='GET',
  body=null
){

  const headers = {
    'Content-Type':
      'application/json',

    'x-workspace-code':
      getCode()
  };

  const name =
    getName();

  if(name){

    headers[
      'x-member-name'
    ] =
      encodeURIComponent(
        name
      );
  }

  const options = {
    method,
    headers,
    cache:'no-store',
    credentials:'same-origin'
  };

  if(body !== null){

    options.body =
      JSON.stringify(
        body
      );
  }

  const response =
    await fetch(
      '/api/data',
      options
    );

  const text =
    await response.text();

  let json = {};

  try{

    json =
      text
        ? JSON.parse(text)
        : {};

  }catch(e){}

  if(!response.ok){

    throw new Error(
      json.error ||
      `通信エラー (${response.status})`
    );
  }

  return json;
}


/* =========================================================
   ファイル判定
========================================================= */

function isSpreadsheet(
  file
){

  if(!file){
    return false;
  }

  const name =
    String(
      file.name || ''
    )
    .trim()
    .toLowerCase();

  return (
    name.endsWith('.xlsx') ||
    name.endsWith('.xls') ||
    name.endsWith('.csv')
  );
}


/* =========================================================
   ファイル一覧取得
========================================================= */

async function refreshFileMap(){

  try{

    const data =
      await api(
        'GET'
      );

    const items =
      Array.isArray(
        data.items
      )
        ? data.items
        : [];

    const next =
      new Map();

    items.forEach(
      item=>{

        if(
          item &&
          item.id !== undefined &&
          item.id !== null
        ){

          next.set(
            String(
              item.id
            ),
            item
          );
        }
      }
    );

    filesById =
      next;

    return true;

  }catch(error){

    console.error(
      'TOMA editor file list error:',
      error
    );

    return false;
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

  xlsxPromise =
    new Promise(
      (
        resolve,
        reject
      )=>{

        const script =
          document.createElement(
            'script'
          );

        script.src =
          XLSX_URL;

        script.async =
          true;

        script.onload =
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

        script.onerror =
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


/* =========================================================
   CSS
========================================================= */

function ensureStyles(){

  if(
    document.getElementById(
      'toma-editor-style'
    )
  ){
    return;
  }

  const style =
    document.createElement(
      'style'
    );

  style.id =
    'toma-editor-style';

  style.textContent = `

.tomaEditBtn{
  background:#16864f !important;
  color:#fff !important;
  border:none !important;
}

#tomaEditor{
  position:fixed;
  inset:0;
  z-index:9999999;
  background:#f5f7fa;
  display:flex;
  flex-direction:column;
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  color:#111;
}

#tomaEditor .editorTop{
  display:flex;
  align-items:center;
  gap:8px;
  padding:
    max(10px, env(safe-area-inset-top))
    10px
    10px;
  background:#fff;
  border-bottom:1px solid #d9dfe5;
}

#tomaEditor .editorTitle{
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

#tomaEditor .backBtn{
  background:#e9eef3;
  color:#111;
}

#tomaEditor .saveBtn{
  background:#0879d1;
  color:#fff;
}

#tomaEditor .sheetTabs{
  display:flex;
  gap:6px;
  padding:8px;
  background:#fff;
  border-bottom:1px solid #ddd;
  overflow-x:auto;
}

#tomaEditor .sheetTab{
  background:#edf2f7;
  color:#222;
  white-space:nowrap;
}

#tomaEditor .sheetTab.active{
  background:#0879d1;
  color:#fff;
}

#tomaEditor .gridWrap{
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
  background:#f0f3f6;
  border:1px solid #ccd3da;
  height:30px;
  min-width:90px;
  font-size:12px;
  text-align:center;
}

#tomaEditor .colHead{
  position:sticky;
  top:0;
  z-index:5;
}

#tomaEditor .rowHead{
  position:sticky;
  left:0;
  z-index:4;
  width:42px;
  min-width:42px;
}

#tomaEditor .corner{
  position:sticky;
  left:0;
  top:0;
  z-index:6;
  width:42px;
  min-width:42px;
}

#tomaEditor td{
  width:100px;
  min-width:100px;
  height:36px;
  padding:0;
  border:1px solid #d6dce2;
}

#tomaEditor .cellInput{
  box-sizing:border-box;
  width:100%;
  height:36px;
  padding:5px 7px;
  border:0;
  border-radius:0;
  outline:none;
  background:#fff;
  color:#111;
  font-size:16px;
}

#tomaEditor .cellInput:focus{
  box-shadow:
    inset 0 0 0 2px #0879d1;
}

#tomaEditor .editorStatus{
  padding:
    8px
    10px
    max(8px, env(safe-area-inset-bottom));
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
   列番号 → A B C
========================================================= */

function columnName(
  index
){

  let result = '';
  let number =
    index + 1;

  while(number > 0){

    const remainder =
      (
        number - 1
      ) % 26;

    result =
      String.fromCharCode(
        65 + remainder
      ) +
      result;

    number =
      Math.floor(
        (
          number - 1
        ) / 26
      );
  }

  return result;
}


/* =========================================================
   セル表示
========================================================= */

function cellValue(
  cell
){

  if(!cell){
    return '';
  }

  if(cell.f){
    return '=' + cell.f;
  }

  if(
    cell.v === null ||
    cell.v === undefined
  ){
    return '';
  }

  return String(
    cell.v
  );
}


/* =========================================================
   セル保存
========================================================= */

function writeCell(
  sheet,
  address,
  value
){

  const XLSX =
    window.XLSX;

  const text =
    String(
      value ?? ''
    );

  if(text === ''){

    delete sheet[
      address
    ];

  }else if(
    text.startsWith('=')
  ){

    sheet[address] = {
      t:'n',
      f:text.substring(1)
    };

  }else if(
    /^[-+]?\d+(?:\.\d+)?$/
      .test(
        text.trim()
      )
  ){

    sheet[address] = {
      t:'n',
      v:Number(
        text.trim()
      )
    };

  }else{

    sheet[address] = {
      t:'s',
      v:text
    };
  }

  const decoded =
    XLSX.utils
      .decode_cell(
        address
      );

  let range;

  if(sheet['!ref']){

    range =
      XLSX.utils
        .decode_range(
          sheet['!ref']
        );

  }else{

    range = {
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

  range.e.r =
    Math.max(
      range.e.r,
      decoded.r
    );

  range.e.c =
    Math.max(
      range.e.c,
      decoded.c
    );

  sheet['!ref'] =
    XLSX.utils
      .encode_range(
        range
      );
}


/* =========================================================
   状態
========================================================= */

function setStatus(
  text=''
){

  const el =
    document.querySelector(
      '#tomaEditor .editorStatus'
    );

  if(!el){
    return;
  }

  if(text){

    el.textContent =
      text;

    return;
  }

  el.textContent =
    current?.dirty
      ? '未保存の変更があります'
      : '保存済み';
}


/* =========================================================
   シート表示
========================================================= */

function renderGrid(){

  if(!current){
    return;
  }

  const XLSX =
    window.XLSX;

  const wrap =
    document.querySelector(
      '#tomaEditor .gridWrap'
    );

  if(!wrap){
    return;
  }

  const sheet =
    current.workbook
      .Sheets[
        current.sheetName
      ];

  let range = {
    s:{
      r:0,
      c:0
    },
    e:{
      r:0,
      c:0
    }
  };

  if(sheet['!ref']){

    range =
      XLSX.utils
        .decode_range(
          sheet['!ref']
        );
  }

  const rows =
    Math.min(
      Math.max(
        range.e.r + 1,
        30
      ),
      200
    );

  const cols =
    Math.min(
      Math.max(
        range.e.c + 1,
        10
      ),
      50
    );

  const table =
    document.createElement(
      'table'
    );

  const thead =
    document.createElement(
      'thead'
    );

  const trHead =
    document.createElement(
      'tr'
    );

  const corner =
    document.createElement(
      'th'
    );

  corner.className =
    'corner';

  trHead.appendChild(
    corner
  );

  for(
    let c=0;
    c<cols;
    c++
  ){

    const th =
      document.createElement(
        'th'
      );

    th.className =
      'colHead';

    th.textContent =
      columnName(
        c
      );

    trHead.appendChild(
      th
    );
  }

  thead.appendChild(
    trHead
  );

  table.appendChild(
    thead
  );

  const tbody =
    document.createElement(
      'tbody'
    );

  for(
    let r=0;
    r<rows;
    r++
  ){

    const tr =
      document.createElement(
        'tr'
      );

    const rowHead =
      document.createElement(
        'th'
      );

    rowHead.className =
      'rowHead';

    rowHead.textContent =
      String(
        r + 1
      );

    tr.appendChild(
      rowHead
    );

    for(
      let c=0;
      c<cols;
      c++
    ){

      const td =
        document.createElement(
          'td'
        );

      const input =
        document.createElement(
          'input'
        );

      input.type =
        'text';

      input.className =
        'cellInput';

      input.autocomplete =
        'off';

      input.spellcheck =
        false;

      const address =
        XLSX.utils
          .encode_cell({
            r,
            c
          });

      input.value =
        cellValue(
          sheet[
            address
          ]
        );

      input.addEventListener(
        'input',
        ()=>{

          writeCell(
            sheet,
            address,
            input.value
          );

          current.dirty =
            true;

          setStatus();
        }
      );

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

  wrap.innerHTML =
    '';

  wrap.appendChild(
    table
  );

  if(
    range.e.r + 1 > 200 ||
    range.e.c + 1 > 50
  ){

    setStatus(
      '大きいシートのため最初の200行×50列を表示しています'
    );

  }else{

    setStatus();
  }
}


/* =========================================================
   シートタブ
========================================================= */

function renderTabs(){

  if(!current){
    return;
  }

  const wrap =
    document.querySelector(
      '#tomaEditor .sheetTabs'
    );

  if(!wrap){
    return;
  }

  wrap.innerHTML =
    '';

  current.workbook
    .SheetNames
    .forEach(
      sheetName=>{

        const button =
          document.createElement(
            'button'
          );

        button.type =
          'button';

        button.className =
          'sheetTab';

        if(
          sheetName ===
          current.sheetName
        ){

          button.classList.add(
            'active'
          );
        }

        button.textContent =
          sheetName;

        button.addEventListener(
          'click',
          ()=>{

            current.sheetName =
              sheetName;

            renderTabs();

            renderGrid();
          }
        );

        wrap.appendChild(
          button
        );
      }
    );
}


/* =========================================================
   閉じる
========================================================= */

function closeEditor(){

  if(
    current?.dirty
  ){

    const ok =
      confirm(
        '保存していない変更があります。\n閉じてもよろしいですか？'
      );

    if(!ok){
      return;
    }
  }

  document.getElementById(
    'tomaEditor'
  )?.remove();

  current =
    null;
}


/* =========================================================
   Base64
========================================================= */

function bytesToBase64(
  bytes
){

  let binary =
    '';

  const chunk =
    0x8000;

  for(
    let i=0;
    i<bytes.length;
    i+=chunk
  ){

    binary +=
      String.fromCharCode(
        ...bytes.subarray(
          i,
          Math.min(
            i + chunk,
            bytes.length
          )
        )
      );
  }

  return btoa(
    binary
  );
}


/* =========================================================
   保存
========================================================= */

async function saveEditor(){

  if(!current){
    return;
  }

  try{

    setStatus(
      '保存中…'
    );

    const XLSX =
      window.XLSX;

    const filename =
      String(
        current.file.name ||
        'file.xlsx'
      );

    const lower =
      filename.toLowerCase();

    let bytes;
    let mime;

    if(
      lower.endsWith(
        '.csv'
      )
    ){

      const csv =
        XLSX.utils
          .sheet_to_csv(
            current.workbook
              .Sheets[
                current.sheetName
              ]
          );

      bytes =
        new TextEncoder()
          .encode(
            csv
          );

      mime =
        'text/csv';

    }else if(
      lower.endsWith(
        '.xls'
      )
    ){

      bytes =
        new Uint8Array(
          XLSX.write(
            current.workbook,
            {
              type:'array',
              bookType:'xls'
            }
          )
        );

      mime =
        'application/vnd.ms-excel';

    }else{

      bytes =
        new Uint8Array(
          XLSX.write(
            current.workbook,
            {
              type:'array',
              bookType:'xlsx'
            }
          )
        );

      mime =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    if(
      bytes.byteLength >
      2500000
    ){

      throw new Error(
        '編集後のファイルが大きすぎます。現在は約2.5MBまで保存できます。'
      );
    }

    const dataUrl =
      `data:${mime};base64,${bytesToBase64(bytes)}`;

    await api(
      'POST',
      {
        action:
          'version',

        id:
          current.file.id,

        parent_id:
          current.file.parent_id ||
          null,

        name:
          filename,

        mime_type:
          mime,

        size:
          bytes.byteLength,

        data:
          dataUrl,

        by:
          getName()
      }
    );

    current.dirty =
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
      '保存できませんでした。\n\n' +
      error.message
    );
  }
}


/* =========================================================
   編集画面を開く
========================================================= */

async function openEditor(
  id
){

  try{

    setStatus(
      ''
    );

    let file =
      filesById.get(
        String(
          id
        )
      );

    if(!file){

      await refreshFileMap();

      file =
        filesById.get(
          String(
            id
          )
        );
    }

    if(!file){

      throw new Error(
        'ファイル情報を取得できませんでした'
      );
    }

    if(
      !isSpreadsheet(
        file
      )
    ){

      throw new Error(
        'このファイルは現在の編集機能の対象外です'
      );
    }

    await loadXLSX();

    const response =
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

    const arrayBuffer =
      await response.arrayBuffer();

    const workbook =
      window.XLSX.read(
        arrayBuffer,
        {
          type:'array',
          cellDates:true
        }
      );

    if(
      !Array.isArray(
        workbook.SheetNames
      ) ||
      workbook.SheetNames.length === 0
    ){

      throw new Error(
        'シートが見つかりません'
      );
    }

    current = {
      file,
      workbook,
      sheetName:
        workbook.SheetNames[0],
      dirty:false
    };

    document.getElementById(
      'tomaEditor'
    )?.remove();

    const editor =
      document.createElement(
        'div'
      );

    editor.id =
      'tomaEditor';

    editor.innerHTML = `

      <div class="editorTop">

        <button
          type="button"
          class="backBtn"
          id="tomaEditorBack"
        >
          ← 戻る
        </button>

        <div class="editorTitle"></div>

        <button
          type="button"
          class="saveBtn"
          id="tomaEditorSave"
        >
          保存
        </button>

      </div>

      <div class="sheetTabs"></div>

      <div class="gridWrap"></div>

      <div class="editorStatus">
        読み込み完了
      </div>
    `;

    document.body
      .appendChild(
        editor
      );

    editor.querySelector(
      '.editorTitle'
    ).textContent =
      '✏️ ' +
      file.name;

    document.getElementById(
      'tomaEditorBack'
    ).addEventListener(
      'click',
      closeEditor
    );

    document.getElementById(
      'tomaEditorSave'
    ).addEventListener(
      'click',
      saveEditor
    );

    renderTabs();

    renderGrid();

  }catch(error){

    console.error(
      error
    );

    alert(
      '編集画面を開けません。\n\n' +
      error.message
    );
  }
}


/* =========================================================
   編集ボタン生成
========================================================= */

function createEditButton(
  openButton,
  file
){

  if(
    !openButton ||
    !file ||
    !isSpreadsheet(
      file
    )
  ){
    return;
  }

  const id =
    String(
      file.id
    );

  /*
    すでに存在するなら何もしない
  */

  const actionArea =
    openButton.parentElement;

  if(!actionArea){
    return;
  }

  const existing =
    Array.from(
      actionArea.querySelectorAll(
        '[data-toma-edit]'
      )
    ).find(
      el =>
        String(
          el.getAttribute(
            'data-toma-edit'
          )
        ) === id
    );

  if(existing){
    return;
  }

  const button =
    document.createElement(
      'button'
    );

  button.type =
    'button';

  button.className =
    'btn light tomaEditBtn';

  button.setAttribute(
    'data-toma-edit',
    id
  );

  button.textContent =
    '編集';

  button.addEventListener(
    'click',
    event=>{

      event.preventDefault();

      event.stopPropagation();

      openEditor(
        id
      );
    }
  );

  /*
    「開く」の直後
  */

  openButton.insertAdjacentElement(
    'afterend',
    button
  );
}


/* =========================================================
   ファイル画面をスキャン
========================================================= */

function scanButtons(){

  const openButtons =
    document.querySelectorAll(
      'button[data-open], [data-open]'
    );

  openButtons.forEach(
    openButton=>{

      const id =
        String(
          openButton.getAttribute(
            'data-open'
          ) || ''
        ).trim();

      if(!id){
        return;
      }

      const file =
        filesById.get(
          id
        );

      if(
        file &&
        isSpreadsheet(
          file
        )
      ){

        createEditButton(
          openButton,
          file
        );

        return;
      }

      /*
        APIリスト取得前の保険。
        ファイル行の文字列からExcel判定。
      */

      let node =
        openButton;

      for(
        let i=0;
        i<8 && node;
        i++
      ){

        const text =
          String(
            node.textContent || ''
          ).toLowerCase();

        if(
          text.includes('.xlsx') ||
          text.includes('.xls') ||
          text.includes('.csv')
        ){

          createEditButton(
            openButton,
            {
              id,
              name:
                text.includes('.csv')
                  ? 'file.csv'
                  : (
                    text.includes('.xls') &&
                    !text.includes('.xlsx')
                      ? 'file.xls'
                      : 'file.xlsx'
                  )
            }
          );

          break;
        }

        node =
          node.parentElement;
      }
    }
  );
}


/* =========================================================
   再スキャン予約
========================================================= */

function scheduleScan(){

  clearTimeout(
    scanTimer
  );

  scanTimer =
    setTimeout(
      scanButtons,
      100
    );
}


/* =========================================================
   初期化
========================================================= */

async function start(){

  ensureStyles();

  /*
    まずAPIから実データ取得
  */

  await refreshFileMap();

  /*
    初回スキャン
  */

  scanButtons();

  /*
    app.jsが画面を再描画したら
    編集ボタンを再追加
  */

  const observer =
    new MutationObserver(
      ()=>{
        scheduleScan();
      }
    );

  observer.observe(
    document.body,
    {
      childList:true,
      subtree:true
    }
  );

  /*
    iPhone / Safari用
  */

  setTimeout(
    scanButtons,
    300
  );

  setTimeout(
    scanButtons,
    800
  );

  setTimeout(
    scanButtons,
    1500
  );

  setTimeout(
    scanButtons,
    3000
  );

  setTimeout(
    async ()=>{

      await refreshFileMap();

      scanButtons();

    },
    5000
  );
}


if(
  document.readyState ===
  'loading'
){

  document.addEventListener(
    'DOMContentLoaded',
    start
  );

}else{

  start();
}

})();
