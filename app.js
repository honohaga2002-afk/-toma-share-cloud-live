function openFile(f){
  try{
    if(!f){
      alert('ファイルが見つかりません');
      return;
    }

    const url=driveUrl(f);

    if(url){
      /*
       * TOMA SHAREをSafariに残したまま
       * Google Drive / Sheets / Docs / Slidesを開く
       *
       * iPhoneでは編集後、
       * 左上の「◀ Safari」を1回押せば
       * TOMA SHAREへ戻れる
       */
      const a=document.createElement('a');

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
      alert('ファイルデータがありません');
      return;
    }

    const blob=dataUrlToBlob(f.file_data);
    const blobUrl=URL.createObjectURL(blob);

    if(isPreviewable(f)){
      const a=document.createElement('a');

      a.href=blobUrl;
      a.target='_blank';
      a.rel='noopener noreferrer';
      a.style.display='none';

      document.body.appendChild(a);
      a.click();
      a.remove();

    }else{
      const a=document.createElement('a');

      a.href=blobUrl;
      a.download=f.name||'download';
      a.style.display='none';

      document.body.appendChild(a);
      a.click();
      a.remove();
    }

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
