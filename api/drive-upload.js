const { Pool } = require('pg');
const { google } = require('googleapis');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const MAX_SIZE = 50 * 1024 * 1024;

function send(res,status,obj){
  res.setHeader('Cache-Control','no-store');
  return res.status(status).json(obj);
}

function parseContent(value){
  if(!value)return {};
  if(typeof value==='object')return value;
  try{return JSON.parse(value);}catch(e){return {};}
}

function googleMime(name=''){
  const n=String(name).toLowerCase();
  if(n.endsWith('.xlsx')||n.endsWith('.xls')||n.endsWith('.csv')) return 'application/vnd.google-apps.spreadsheet';
  if(n.endsWith('.docx')||n.endsWith('.doc')) return 'application/vnd.google-apps.document';
  if(n.endsWith('.pptx')||n.endsWith('.ppt')) return 'application/vnd.google-apps.presentation';
  return null;
}

function automaticFileCategory(name='',mime=''){
  const n=String(name).toLowerCase();
  const m=String(mime).toLowerCase();
  if(/\.(xlsx?|csv)$/.test(n))return 'excel';
  if(/\.docx?$/.test(n))return 'word';
  if(/\.pdf$/.test(n)||m==='application/pdf')return 'pdf';
  if(/\.pptx?$/.test(n))return 'powerpoint';
  if(m.startsWith('image/')||m.startsWith('video/')||/\.(jpe?g|png|webp|gif|heic|heif|mp4|mov|m4v|webm)$/.test(n))return 'media';
  return null;
}

function authClient(){
  const auth=new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  const refreshToken=String(process.env.GOOGLE_REFRESH_TOKEN||'').replace(/\s+/g,'');
  if(!refreshToken)throw new Error('GOOGLE_REFRESH_TOKEN が未設定です');
  auth.setCredentials({refresh_token:refreshToken});
  return auth;
}

async function workspace(code){
  if(!code)return null;
  const q=await pool.query(
    `select id,name,invite_code from workspaces where upper(invite_code)=upper($1) limit 1`,
    [code]
  );
  return q.rows[0]||null;
}

async function resolveDriveFolder(workspaceId,parentId,name,mime){
  if(!parentId)return null;
  const q=await pool.query(
    `select id,item_type,content from shared_items where id=$1 and workspace_id=$2 and trashed=false limit 1`,
    [parentId,workspaceId]
  );
  const folder=q.rows[0];
  if(!folder||folder.item_type!=='folder')return null;
  const content=parseContent(folder.content);
  const category=automaticFileCategory(name,mime);
  const auto=category?content.autoFolders?.[category]:null;
  return auto?.driveFolderId||content.driveFolderId||null;
}

async function allowAnyoneToEdit(drive,fileId){
  try{
    const list=await drive.permissions.list({fileId,fields:'permissions(id,type,role)'});
    const anyone=(list.data.permissions||[]).find(x=>x.type==='anyone');
    if(anyone){
      if(anyone.role!=='writer'){
        await drive.permissions.update({fileId,permissionId:anyone.id,requestBody:{role:'writer'}});
      }
    }else{
      await drive.permissions.create({fileId,requestBody:{type:'anyone',role:'writer'}});
    }
  }catch(e){
    console.error('Drive sharing failed:',e.message);
  }
}

module.exports=async(req,res)=>{
  if(req.method!=='POST')return send(res,405,{error:'Method not allowed'});
  if(!process.env.DATABASE_URL)return send(res,500,{error:'DATABASE_URL が未設定です'});

  const code=req.headers['x-workspace-code'];
  const by=decodeURIComponent(String(req.headers['x-member-name']||'メンバー'));

  try{
    const ws=await workspace(code);
    if(!ws)return send(res,401,{error:'共有コードが正しくありません'});

    const b=req.body||{};
    const action=String(b.action||'');

    if(action==='init'){
      const name=String(b.name||'').trim();
      const mime=String(b.mime_type||'application/octet-stream');
      const size=Number(b.size)||0;
      if(!name)return send(res,400,{error:'ファイル名がありません'});
      if(size<=0||size>MAX_SIZE)return send(res,413,{error:'ファイルは50MB以下にしてください'});

      const parentId=b.parent_id||null;
      const driveFolderId=await resolveDriveFolder(ws.id,parentId,name,mime);
      const auth=authClient();
      const tokenResult=await auth.getAccessToken();
      const token=typeof tokenResult==='string'?tokenResult:tokenResult?.token;
      if(!token)throw new Error('Google Drive認証トークンを取得できません');

      const requestBody={name};
      const targetMime=googleMime(name);
      if(targetMime)requestBody.mimeType=targetMime;
      if(driveFolderId)requestBody.parents=[driveFolderId];

      const response=await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,webViewLink,parents,modifiedTime',
        {
          method:'POST',
          headers:{
            Authorization:`Bearer ${token}`,
            'Content-Type':'application/json; charset=UTF-8',
            'X-Upload-Content-Type':mime,
            'X-Upload-Content-Length':String(size)
          },
          body:JSON.stringify(requestBody)
        }
      );

      if(!response.ok){
        const text=await response.text();
        throw new Error(`Google Driveアップロード開始エラー (${response.status}) ${text.slice(0,300)}`);
      }

      const uploadUrl=response.headers.get('location');
      if(!uploadUrl)throw new Error('Google DriveアップロードURLを取得できません');

      return send(res,200,{ok:true,uploadUrl,maxSize:MAX_SIZE});
    }

    if(action==='finalize'){
      const fileId=String(b.drive_file_id||'').trim();
      const name=String(b.name||'').trim();
      const mime=String(b.mime_type||'application/octet-stream');
      const size=Number(b.size)||0;
      const parentId=b.parent_id||null;
      const replaceId=b.replace_id||null;
      const year=Number.isInteger(Number(b.year))?Number(b.year):2026;
      if(!fileId||!name)return send(res,400,{error:'保存情報が不足しています'});
      if(size>MAX_SIZE)return send(res,413,{error:'ファイルは50MB以下にしてください'});

      const auth=authClient();
      const drive=google.drive({version:'v3',auth});
      const result=await drive.files.get({
        fileId,
        fields:'id,name,mimeType,webViewLink,parents,modifiedTime'
      });
      const driveFile=result.data;
      await allowAnyoneToEdit(drive,fileId);

      const content={
        size:size||null,
        driveFileId:fileId,
        webViewLink:driveFile.webViewLink||null,
        googleEditLink:driveFile.webViewLink||null,
        googleMimeType:driveFile.mimeType||null,
        driveModifiedTime:driveFile.modifiedTime||null,
        driveFolderId:Array.isArray(driveFile.parents)?(driveFile.parents[0]||null):null
      };

      if(replaceId){
        const old=await pool.query(
          `select * from shared_items where id=$1 and workspace_id=$2 and item_type='file' limit 1`,
          [replaceId,ws.id]
        );
        if(!old.rows[0])return send(res,404,{error:'更新するファイルが見つかりません'});
        const x=old.rows[0];
        await pool.query(
          `insert into item_versions(item_id,version,file_data,content,updated_by) values($1,$2,$3,$4,$5)`,
          [x.id,x.version,x.file_data,x.content,by]
        );
        await pool.query(
          `update shared_items set parent_id=$1,name=$2,mime_type=$3,file_data=$4,content=$5,version=version+1,updated_by=$6,updated_at=now(),fiscal_year=$7 where id=$8 and workspace_id=$9`,
          [parentId,name,mime,driveFile.webViewLink||null,JSON.stringify(content),by,year,replaceId,ws.id]
        );
        return send(res,200,{ok:true,id:replaceId,versionUpdated:true});
      }

      const inserted=await pool.query(
        `insert into shared_items(workspace_id,parent_id,item_type,name,mime_type,file_data,content,updated_by,fiscal_year) values($1,$2,'file',$3,$4,$5,$6,$7,$8) returning id`,
        [ws.id,parentId,name,mime,driveFile.webViewLink||null,JSON.stringify(content),by,year]
      );
      return send(res,200,{ok:true,id:inserted.rows[0]?.id||null});
    }

    return send(res,400,{error:'actionが正しくありません'});
  }catch(e){
    console.error('Direct Drive upload error:',e);
    return send(res,500,{error:e.message||'アップロードに失敗しました'});
  }
};
