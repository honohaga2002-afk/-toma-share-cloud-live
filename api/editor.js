(()=>{
'use strict';

/* =========================================================
   TOMA SHARE
   Excel / CSV 簡易編集機能
   Googleアカウント不要
========================================================= */

const XLSX_URL =
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';

let xlsxLoading = null;
let current = null;
let itemCache = [];


/* =========================================================
   ログイン情報
========================================================= */

function getCode(){

  return String(
    localStorage.getItem('tomaCode') ||
    document.getElementById('code')?.value ||
    'TOMA-2026'
  )
  .trim()
  .toUpperCase();
}

function getName(){

  return String(
    localStorage.getItem('tomaName') ||
    document.getElementById('memberName')?.value ||
    'メンバー'
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
      getCode(),

    'x-member-name':
      encodeURIComponent(
        getName()
      )
  };

  const options = {
    method,
    headers,
    cache:'no-store',
    credentials:'same-origin'
  };

  if(body){

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
   Excel / CSV 判定
========================================================= */

function isSpreadsheet(
  file
){

  const name =
    String(
      file?.name || ''
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
   SheetJS 読み込み
========================================================= */

async function loadXLSX(){

  if(window.XLSX){
    return window.XLSX;
  }

  if(xlsxLoading){
    return xlsxLoading;
  }

  xlsxLoading =
    new Promise(
      (resolve,reject)=>{

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
                  '表計算機能を読み込めませんでした'
                )
              );
            }
          };

        script.onerror =
          ()=>{

            reject(
              new Error(
                '表計算機能を読み込めませんでした'
              )
            );
          };

        document.head
          .appendChild(
            script
          );
      }
    );

  return xlsxLoading;
}


/* =========================================================
   CSS
========================================================= */

function ensureStyle(){

  if(
    document.getElementById(
      'tomaEditorStyle'
    )
  ){
    return;
  }

  const style =
    document.createElement(
      'style'
    );

  style.id =
    'tomaEditorStyle';

  style.textContent = `

#tomaEditor{
  position:fixed;
  inset:0;
  z-index:999999;
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

#tomaEditor .teTop{
  padding:
    max(10px, env(safe-area-inset-top))
    10px
    10px;
  background:#fff;
  border-bottom:1px solid #ddd;
  display:flex;
  gap:8px;
  align-items:center;
}

#tomaEditor .teTitle{
  flex:1;
  min-width:0;
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
  background:#0879d1;
  color:#fff;
}

#tomaEditor button.light{
  background:#e8edf3;
  color:#111;
}

#tomaEditor .teTabs{
  background:#fff;
  display:flex;
  gap:6px;
  padding:8px;
  overflow-x:auto;
  border-bottom:1px solid #ddd;
}

#tomaEditor .teTabs button{
  white-space:nowrap;
  background:#edf2f7;
  color:#222;
  padding:8px 12px;
}

#tomaEditor .teTabs button.on{
  background:#0879d1;
  color:#fff;
}

#tomaEditor .teWrap{
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
  border:1px solid #cdd3da;
  min-width:90px;
  height:30px;
  background:#f0f3f6;
  font-size:12px;
  text-align:center;
  position:sticky;
  top:0;
  z-index:3;
}

#tomaEditor th.rowHead{
  min-width:42px;
  width:42px;
  left:0;
  z-index:4;
}

#tomaEditor tbody th.rowHead{
  top:auto;
}

#tomaEditor td{
  border:1px solid #d6dce2;
  min-width:90px;
  width:90px;
  height:34px;
  padding:0;
}

#tomaEditor input.cell{
  box-sizing:border-box;
  border:0;
  border-radius:0;
  outline:none;
  width:100%;
  height:34px;
  padding:5px 7px;
  background:#fff;
  font-size:16px;
}

#tomaEditor input.cell:focus{
  box-shadow:
    inset 0 0 0 2px
    #0879d1;
}

#tomaEditor .teStatus{
  background:#fff;
  border-top:1px solid #ddd;
  padding:
    7px
    10px
    max(7px, env(safe-area-inset-bottom));
  font-size:12px;
  color:#555;
}

.tomaEditBtn{
  margin-left:6px !important;
  background:#16864f !important;
  color:#fff !important;
}

`;

  document.head
    .appendChild(
      style
    );
}


/* =========================================================
   列名
========================================================= */

function columnName(
  index
){

  let result = '';
  let number =
    index + 1;

  while(number > 0){

    const remainder =
      (number - 1) % 26;

    result =
      String.fromCharCode(
        65 + remainder
      ) +
      result;

    number =
      Math.floor(
        (number - 1) / 26
      );
  }

  return result;
}


/* =========================================================
   セル表示
========================================================= */

function cellText(
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
   セル更新
========================================================= */

function setCell(
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
      f:text.slice(1)
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
        text
      )
    };

  }else{

    sheet[address] = {
      t:'s',
      v:text
    };
  }

  const rc =
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
      rc.r
    );

  range.e.c =
    Math.max(
      range.e.c,
      rc.c
    );

  sheet['!ref'] =
    XLSX.utils
      .encode_range(
        range
      );
}


/* =========================================================
   状態表示
========================================================= */

function updateStatus(
  message=''
){

  const status =
    document.querySelector(
      '#tomaEditor .teStatus'
    );

  if(!status){
    return;
  }

  if(message){

    status.textContent =
      message;

    return;
  }

  status.textContent =
    current?.dirty
      ? '未保存の変更があります'
      : '保存済み';
}


/* =========================================================
   シート描画
========================================================= */

function renderSheet(){

  const XLSX =
    window.XLSX;

  const editor =
    document.getElementById(
      'tomaEditor'
    );

  if(
    !editor ||
    !current
  ){
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

  const rowCount =
    Math.min(
      Math.max(
        range.e.r + 1,
        30
      ),
      200
    );

  const columnCount =
    Math.min(
      Math.max(
        range.e.c + 1,
        10
      ),
      50
    );

  const wrap =
    editor.querySelector(
      '.teWrap'
    );

  wrap.innerHTML = '';

  const table =
    document.createElement(
      'table'
    );

  const thead =
    document.createElement(
      'thead'
    );

  const headerRow =
    document.createElement(
      'tr'
    );

  const corner =
    document.createElement(
      'th'
    );

  corner.className =
    'rowHead';

  headerRow.appendChild(
    corner
  );

  for(
    let column=0;
    column<columnCount;
    column++
  ){

    const th =
      document.createElement(
        'th'
      );

    th.textContent =
      columnName(
        column
      );

    headerRow.appendChild(
      th
    );
  }

  thead.appendChild(
    headerRow
  );

  table.appendChild(
    thead
  );

  const tbody =
    document.createElement(
      'tbody'
    );

  for(
    let row=0;
    row<rowCount;
    row++
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
        row + 1
      );

    tr.appendChild(
      rowHead
    );

    for(
      let column=0;
      column<columnCount;
      column++
    ){

      const td =
        document.createElement(
          'td'
        );

      const input =
        document.createElement(
          'input'
        );

      input.className =
        'cell';

      input.autocomplete =
        'off';

      input.spellcheck =
        false;

      const address =
        XLSX.utils
          .encode_cell({
            r:row,
            c:column
          });

      input.dataset.address =
        address;

      input.value =
        cellText(
          sheet[address]
        );

      input.addEventListener(
        'change',
        ()=>{

          setCell(
            sheet,
            address,
            input.value
          );

          current.dirty =
            true;

          updateStatus();
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

  wrap.appendChild(
    table
  );

  if(
    range.e.r + 1 > 200 ||
    range.e.c + 1 > 50
  ){

    updateStatus(
      '大きいシートのため最初の200行×50列を表示しています'
    );

  }else{

    updateStatus();
  }
}


/* =========================================================
   シートタブ
========================================================= */

function renderTabs(){

  const tabs =
    document.querySelector(
      '#tomaEditor .teTabs'
    );

  if(!tabs){
    return;
  }

  tabs.innerHTML = '';

  current.workbook
    .SheetNames
    .forEach(
      sheetName=>{

        const button =
          document.createElement(
            'button'
          );

        button.textContent =
          sheetName;

        if(
          sheetName ===
          current.sheetName
        ){
          button.className =
            'on';
        }

        button.onclick =
          ()=>{

            current.sheetName =
              sheetName;

            renderTabs();
            renderSheet();
          };

        tabs.appendChild(
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
    current?.dirty &&
    !confirm(
      '保存していない変更があります。\n閉じてもよろしいですか？'
    )
  ){
    return;
  }

  const editor =
    document.getElementById(
      'tomaEditor'
    );

  if(editor){
    editor.remove();
  }

  current =
    null;
}


/* =========================================================
   Base64
========================================================= */

function bytesToBase64(
  bytes
){

  let binary = '';

  const step =
    0x8000;

  for(
    let i=0;
    i<bytes.length;
    i+=step
  ){

    binary +=
      String.fromCharCode(
        ...bytes.subarray(
          i,
          Math.min(
            i + step,
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

    updateStatus(
      '保存中…'
    );

    const XLSX =
      window.XLSX;

    const filename =
      current.file.name;

    const lower =
      filename.toLowerCase();

    let output;
    let mimeType;

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

      output =
        new TextEncoder()
          .encode(
            csv
          );

      mimeType =
        'text/csv';

    }else if(
      lower.endsWith(
        '.xls'
      )
    ){

      output =
        new Uint8Array(
          XLSX.write(
            current.workbook,
            {
              bookType:'xls',
              type:'array'
            }
          )
        );

      mimeType =
        'application/vnd.ms-excel';

    }else{

      output =
        new Uint8Array(
          XLSX.write(
            current.workbook,
            {
              bookType:'xlsx',
              type:'array'
            }
          )
        );

      mimeType =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    if(
      output.byteLength >
      2500000
    ){

      throw new Error(
        '編集後のファイルが大きすぎます。\n現在は約2.5MBまで編集保存できます。'
      );
    }

    const base64 =
      bytesToBase64(
        output
      );

    const fileData =
      `data:${mimeType};base64,${base64}`;

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
          mimeType,

        size:
          output.byteLength,

        data:
          fileData,

        by:
          getName()
      }
    );

    current.dirty =
      false;

    updateStatus(
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

    updateStatus(
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

    if(!getCode()){

      throw new Error(
        '先にTOMA SHAREへログインしてください'
      );
    }

    let file =
      itemCache.find(
        item =>
          String(
            item.id
          ) ===
          String(
            id
          )
      );

    if(!file){

      const data =
        await api();

      itemCache =
        data.items ||
        [];

      file =
        itemCache.find(
          item =>
            String(
              item.id
            ) ===
            String(
              id
            )
        );
    }

    if(!file){

      throw new Error(
        'ファイルが見つかりません'
      );
    }

    if(
      !isSpreadsheet(
        file
      )
    ){

      throw new Error(
        '現在の編集機能はExcel・CSVに対応しています'
      );
    }

    await loadXLSX();

    const response =
      await fetch(
        `/api/data?file=${encodeURIComponent(file.id)}`,
        {
          cache:'no-store',
          credentials:'same-origin'
        }
      );

    if(!response.ok){

      throw new Error(
        `ファイルを取得できませんでした (${response.status})`
      );
    }

    const buffer =
      await response.arrayBuffer();

    const workbook =
      window.XLSX.read(
        buffer,
        {
          type:'array',
          cellDates:true
        }
      );

    if(
      !workbook.SheetNames.length
    ){

      throw new Error(
        'シートがありません'
      );
    }

    current = {
      file,
      workbook,
      sheetName:
        workbook.SheetNames[0],
      dirty:false
    };

    ensureStyle();

    const old =
      document.getElementById(
        'tomaEditor'
      );

    if(old){
      old.remove();
    }

    const editor =
      document.createElement(
        'div'
      );

    editor.id =
      'tomaEditor';

    editor.innerHTML = `

<div class="teTop">

  <button
    class="light"
    id="teClose"
  >
    ← 戻る
  </button>

  <div
    class="teTitle"
  ></div>

  <button
    id="teSave"
  >
    保存
  </button>

</div>

<div class="teTabs"></div>

<div class="teWrap"></div>

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
      .textContent =
        '✏️ ' +
        file.name;

    editor
      .querySelector(
        '#teClose'
      )
      .onclick =
        closeEditor;

    editor
      .querySelector(
        '#teSave'
      )
      .onclick =
        saveEditor;

    renderTabs();
    renderSheet();

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
   編集ボタン追加
   親要素を最大6階層まで探す
========================================================= */

function addEditButtons(){

  const openButtons =
    document.querySelectorAll(
      '[data-open]'
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

      const actionArea =
        openButton.parentElement;

      if(!actionArea){
        return;
      }

      if(
        actionArea.querySelector(
          `[data-toma-edit="${id}"]`
        )
      ){
        return;
      }

      let row =
        actionArea;

      let spreadsheetFound =
        false;

      for(
        let i=0;
        i<6 && row;
        i++
      ){

        const rowText =
          String(
            row.textContent || ''
          )
          .trim()
          .toLowerCase();

        if(
          rowText.includes('.xlsx') ||
          rowText.includes('.xls') ||
          rowText.includes('.csv')
        ){

          spreadsheetFound =
            true;

          break;
        }

        row =
          row.parentElement;
      }

      if(
        !spreadsheetFound
      ){
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

      button.dataset.tomaEdit =
        id;

      button.textContent =
        '編集';

      button.style.background =
        '#16864f';

      button.style.color =
        '#ffffff';

      button.onclick =
        function(event){

          event.preventDefault();

          event.stopPropagation();

          openEditor(
            id
          );
        };

      openButton.insertAdjacentElement(
        'afterend',
        button
      );
    }
  );
}


/* =========================================================
   app.js再描画監視
========================================================= */

let timer = null;

function scheduleAddButtons(){

  clearTimeout(
    timer
  );

  timer =
    setTimeout(
      addEditButtons,
      120
    );
}

const observer =
  new MutationObserver(
    function(){

      scheduleAddButtons();

    }
  );

function start(){

  ensureStyle();

  observer.observe(
    document.body,
    {
      childList:true,
      subtree:true
    }
  );

  addEditButtons();

  setTimeout(
    addEditButtons,
    300
  );

  setTimeout(
    addEditButtons,
    700
  );

  setTimeout(
    addEditButtons,
    1200
  );

  setTimeout(
    addEditButtons,
    2000
  );

  setTimeout(
    addEditButtons,
    3500
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
