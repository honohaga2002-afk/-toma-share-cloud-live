let selectedUploadFile=null;
let selectedVersionId=null;

function pickFile(id){
  const i=document.createElement('input');
  i.type='file';
  i.accept='.xlsx,.xls,.csv,.doc,.docx,.ppt,.pptx,.pdf,image/*';

  i.onchange=()=>{
    const f=i.files?.[0];
    if(!f)return;

    if(f.size>2500000){
      alert('現在は1ファイル2.5MB以下でアップロードしてください');
      return;
    }

    selectedUploadFile=f;
    selectedVersionId=id||null;

    showUploadConfirm();
  };

  i.click();
}

function showUploadConfirm(){
  const f=selectedUploadFile;
  if(!f)return;

  const old=document.getElementById('uploadConfirm');
  if(old)old.remove();

  const box=document.createElement('div');
  box.id='uploadConfirm';
  box.className='panel';

  const size=(f.size/1024).toFixed(1);

  box.innerHTML=`
    <div class="title">📎 選択したファイル</div>

    <div class="item">
      <div class="title">${esc(f.name)}</div>
      <div class="meta">${size} KB</div>
    </div>

    <div class="row">
      <button class="btn" id="saveSelectedFile">
        保存
      </button>

      <button class="btn light" id="cancelSelectedFile">
        キャンセル
      </button>
    </div>
  `;

  const drive=document.getElementById('drive');
  const firstPanel=drive.querySelector('.panel');

  if(firstPanel){
    firstPanel.insertAdjacentElement('afterend',box);
  }else{
    drive.prepend(box);
  }

  document.getElementById('cancelSelectedFile').onclick=()=>{
    selectedUploadFile=null;
    selectedVersionId=null;
    box.remove();
  };

  document.getElementById('saveSelectedFile').onclick=saveSelectedFile;
}

async function saveSelectedFile(){
  const f=selectedUploadFile;
  const id=selectedVersionId;

  if(!f){
    alert('ファイルを選択してください');
    return;
  }

  const saveBtn=document.getElementById('saveSelectedFile');

  try{
    if(saveBtn){
      saveBtn.disabled=true;
      saveBtn.textContent='保存中…';
    }

    say('Google Driveへアップロード中…');

    const data=await new Promise((resolve,reject)=>{
      const fr=new FileReader();

      fr.onload=()=>resolve(fr.result);

      fr.onerror=()=>reject(
        new Error('ファイルを読み込めませんでした')
      );

      fr.readAsDataURL(f);
    });

    await api('POST',{
      action:id?'version':'file',
      id:id||null,
      name:f.name,
      mime_type:f.type||'application/octet-stream',
      size:f.size,
      data,
      by:N
    });

    selectedUploadFile=null;
    selectedVersionId=null;

    await load();
    go('drive');

    say(
      id
        ?'更新版を保存しました'
        :'Google Driveへ保存しました'
    );

  }catch(e){
    console.error(e);

    alert(
      'アップロードできませんでした。\n\n'+
      e.message
    );

    if(saveBtn){
      saveBtn.disabled=false;
      saveBtn.textContent='保存';
    }
  }
}
