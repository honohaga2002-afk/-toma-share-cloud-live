const { Pool } = require('pg');
const { google } = require('googleapis');
const { Readable } = require('stream');
const webpush = require('web-push');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});


function send(res,status,obj){
  return res.status(status).json(obj);
}


/* ==============================
   日本語ヘッダー復元
============================== */

function decodeHeader(value){

  const v =
    String(value || '');

  if(!v){
    return '';
  }

  try{
    return decodeURIComponent(v);
  }catch(e){
    return v;
  }
}


/* ==============================
   Cookie
============================== */

function readCookie(req,name){

  const raw =
    String(
      req.headers.cookie || ''
    );

  const parts =
    raw.split(';');

  for(const part of parts){

    const p =
      part.trim();

    const index =
      p.indexOf('=');

    if(index < 0){
      continue;
    }

    const key =
      p.slice(
        0,
        index
      );

    const value =
      p.slice(
        index + 1
      );

    if(key !== name){
      continue;
    }

    try{
      return decodeURIComponent(
        value
      );
    }catch(e){
      return value;
    }
  }

  return '';
}


/* ==============================
   Google Drive
============================== */

function driveClient(){

  const auth =
    new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

  const refreshToken =
    String(
      process.env.GOOGLE_REFRESH_TOKEN ||
      ''
    ).replace(
      /\s+/g,
      ''
    );

  if(!refreshToken){

    throw new Error(
      'GOOGLE_REFRESH_TOKEN が未設定です'
    );
  }

  auth.setCredentials({
    refresh_token:
      refreshToken
  });

  return google.drive({
    version:'v3',
    auth
  });
}


/* ==============================
   Office → Google形式
============================== */

function googleMime(name=''){

  const n =
    String(name)
      .toLowerCase();

  if(
    n.endsWith('.xlsx') ||
    n.endsWith('.xls') ||
    n.endsWith('.csv')
  ){

    return (
      'application/vnd.google-apps.spreadsheet'
    );
  }

  if(
    n.endsWith('.docx') ||
    n.endsWith('.doc')
  ){

    return (
      'application/vnd.google-apps.document'
    );
  }

  if(
    n.endsWith('.pptx') ||
    n.endsWith('.ppt')
  ){

    return (
      'application/vnd.google-apps.presentation'
    );
  }

  return null;
}


/* ==============================
   Google形式 → Office形式
============================== */

function exportMime(
  googleMimeType,
  name=''
){

  const n =
    String(name)
      .toLowerCase();

  if(
    googleMimeType ===
    'application/vnd.google-apps.spreadsheet'
  ){

    if(
      n.endsWith('.csv')
    ){
      return 'text/csv';
    }

    return (
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  }


  if(
    googleMimeType ===
    'application/vnd.google-apps.document'
  ){

    return (
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  }


  if(
    googleMimeType ===
    'application/vnd.google-apps.presentation'
  ){

    return (
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    );
  }


  if(
    googleMimeType ===
    'application/vnd.google-apps.drawing'
  ){

    return (
      'application/pdf'
    );
  }

  return null;
}


/* ==============================
   JSON content
============================== */

function parseContent(value){

  if(!value){
    return {};
  }

  if(
    typeof value ===
    'object'
  ){

    return value;
  }

  try{

    return JSON.parse(
      value
    );

  }catch(e){

    return {};
  }
}


/* ==============================
   ファイル名
   日本語・英語両対応
============================== */

function safeFilename(name){

  const original =
    String(
      name ||
      'file'
    );


  /*
    filename="" 用

    HTTPヘッダーには
    ASCIIだけを入れる。

    日本語、中国語、韓国語、
    絵文字などは _ にする。
  */

  let ascii =
    original
      .normalize('NFKD')
      .replace(
        /[^\x20-\x7E]/g,
        '_'
      )
      .replace(
        /["\\;\r\n]/g,
        '_'
      );


  if(
    !ascii ||
    !ascii.trim()
  ){

    ascii =
      'file';
  }


  /*
    filename*=UTF-8'' 用

    本来の日本語・英語名を
    UTF-8エンコードして保持
  */

  const utf8 =
    encodeURIComponent(
      original
    ).replace(
      /['()*]/g,
      char =>
        '%' +
        char
          .charCodeAt(0)
          .toString(16)
          .toUpperCase()
    );


  return {
    original,
    ascii,
    utf8
  };
}


/* ==============================
   ワークスペース
============================== */

async function workspace(code){

  if(!code){
    return null;
  }

  const q =
    await pool.query(
      `
      select
        id,
        name,
        invite_code
      from workspaces
      where upper(invite_code)=upper($1)
      limit 1
      `,
      [
        code
      ]
    );

  return (
    q.rows[0] ||
    null
  );
}


/* ==============================
   オンライン表示
============================== */

async function ensurePresenceTable(){

  await pool.query(
    `
    create table if not exists workspace_presence
    (
      workspace_id uuid not null,

      member_name text not null,

      last_seen timestamptz
        not null
        default now(),

      primary key
      (
        workspace_id,
        member_name
      )
    )
    `
  );
}


async function touchPresence(
  workspaceId,
  memberName
){

  const name =
    String(
      memberName ||
      ''
    ).trim();

  if(!name){
    return;
  }

  await ensurePresenceTable();

  await pool.query(
    `
    insert into workspace_presence
    (
      workspace_id,
      member_name,
      last_seen
    )

    values
    (
      $1,
      $2,
      now()
    )

    on conflict
    (
      workspace_id,
      member_name
    )

    do update

    set
      last_seen=now()
    `,
    [
      workspaceId,
      name
    ]
  );
}


async function getOnlineMembers(
  workspaceId
){

  await ensurePresenceTable();

  const q =
    await pool.query(
      `
      select
        member_name,
        last_seen

      from workspace_presence

      where workspace_id=$1

        and last_seen >
          now() -
          interval '2 minutes'

      order by
        member_name
      `,
      [
        workspaceId
      ]
    );

  return q.rows;
}



/* ==============================
   Driveリンク共有
============================== */

async function allowAnyoneToEdit(fileId){
  if(!fileId)return false;
  const drive=driveClient();
  const result=await drive.permissions.list({
    fileId,
    fields:'permissions(id,type,role)'
  });
  const anyone=(result.data.permissions||[]).find(x=>x.type==='anyone');
  if(anyone){
    if(anyone.role!=='writer'){
      await drive.permissions.update({
        fileId,
        permissionId:anyone.id,
        requestBody:{role:'writer'}
      });
    }
    return true;
  }
  await drive.permissions.create({
    fileId,
    requestBody:{type:'anyone',role:'writer'}
  });
  return true;
}

async function shareWorkspaceDriveFiles(workspaceId){
  const q=await pool.query(
    `select id,item_type,content from shared_items
     where workspace_id=$1
       and item_type in ('file','folder')
       and trashed=false`,
    [workspaceId]
  );
  let shared=0;
  const failed=[];
  for(const item of q.rows){
    const content=parseContent(item.content);
    const fileId=content.driveFileId||content.driveFolderId;
    if(!fileId)continue;
    try{
      await allowAnyoneToEdit(fileId);
      shared++;
    }catch(e){
      console.error('Drive sharing failed:',item.id,e.message);
      failed.push(item.id);
    }
  }
  return {shared,failed:failed.length};
}

let fiscalYearReady=null;

function ensureFiscalYearColumns(){
  if(!fiscalYearReady){
    fiscalYearReady=(async()=>{
      const tables=[
        'shared_items',
        'schedules',
        'minutes',
        'reviews',
        'permits',
        'workspace_tasks',
        'workspace_activity'
      ];

      for(const table of tables){
        await pool.query(
          `alter table ${table}
           add column if not exists fiscal_year integer not null default 2026`
        );
      }
    })().catch(error=>{
      fiscalYearReady=null;
      throw error;
    });
  }

  return fiscalYearReady;
}


/* ==============================
   やることリスト
============================== */

async function ensureTasksTable(){
  await pool.query(
    `create table if not exists workspace_tasks
     (
       id bigserial primary key,
       workspace_id uuid not null,
       title text not null,
       due_at timestamptz,
       assignee text,
       notes text,
       completed boolean not null default false,
       created_by text,
       created_at timestamptz not null default now(),
       updated_at timestamptz not null default now()
     )`
  );
  await pool.query(
    `create index if not exists workspace_tasks_workspace_idx
     on workspace_tasks(workspace_id,completed,due_at)`
  );
  await pool.query(
    `alter table workspace_tasks
     add column if not exists deleted_at timestamptz`
  );
  await pool.query(
    `alter table schedules
     add column if not exists deleted_at timestamptz`
  );
}

async function ensureActivityTable(){
  await pool.query(
    `create table if not exists workspace_activity
     (
       id bigserial primary key,
       workspace_id uuid not null,
       action text not null,
       item_kind text,
       item_id text,
       detail text,
       member_name text,
       created_at timestamptz not null default now()
     )`
  );
  await pool.query(
    `create index if not exists workspace_activity_workspace_idx
     on workspace_activity(workspace_id,created_at desc)`
  );
}

/* ==============================
   Driveフォルダ作成
============================== */

async function createDriveFolder(
  name
){

  const drive =
    driveClient();

  const result =
    await drive.files.create({

      requestBody:{

        name,

        mimeType:
          'application/vnd.google-apps.folder'
      },

      fields:
        'id,name,mimeType,webViewLink'
    });

  await allowAnyoneToEdit(
    result.data.id
  );

  return (
    result.data
  );
}


/* ==============================
   保存先フォルダ取得
============================== */

async function getDriveFolder(
  workspaceId,
  parentId,
  by
){

  if(!parentId){
    return null;
  }

  const q =
    await pool.query(
      `
      select *

      from shared_items

      where id=$1

        and workspace_id=$2

        and item_type='folder'

        and trashed=false

      limit 1
      `,
      [
        parentId,
        workspaceId
      ]
    );


  const folder =
    q.rows[0];


  if(!folder){

    throw new Error(
      '保存先フォルダが見つかりません'
    );
  }


  const content =
    parseContent(
      folder.content
    );


  if(
    content.driveFolderId
  ){

    return (
      content.driveFolderId
    );
  }


  const driveFolder =
    await createDriveFolder(
      folder.name
    );


  const newContent = {

    ...content,

    driveFolderId:
      driveFolder.id,

    webViewLink:
      driveFolder.webViewLink ||
      null,

    googleMimeType:
      driveFolder.mimeType
  };


  await pool.query(
    `
    update shared_items

    set

      content=$1,

      file_data=$2,

      updated_by=$3,

      updated_at=now()

    where id=$4

      and workspace_id=$5
    `,
    [

      JSON.stringify(
        newContent
      ),

      driveFolder.webViewLink ||
      null,

      by,

      folder.id,

      workspaceId
    ]
  );


  return (
    driveFolder.id
  );
}


/* ==============================
   Driveへアップロード
============================== */

async function uploadToDrive(
  name,
  mimeType,
  data,
  driveFolderId=null
){

  const match =
    String(
      data ||
      ''
    ).match(
      /^data:([^;]+);base64,(.+)$/s
    );


  if(!match){

    throw new Error(
      'ファイルデータを読み込めません'
    );
  }


  const buffer =
    Buffer.from(
      match[2],
      'base64'
    );


  const targetMime =
    googleMime(
      name
    );


  const drive =
    driveClient();


  const requestBody = {
    name
  };


  /*
    Excel / Word / PowerPointは
    Google形式に変換して保存
  */

  if(targetMime){

    requestBody.mimeType =
      targetMime;
  }


  if(driveFolderId){

    requestBody.parents = [
      driveFolderId
    ];
  }


  const result =
    await drive.files.create({

      requestBody,

      media:{

        mimeType:
          mimeType ||
          match[1] ||
          'application/octet-stream',

        body:
          Readable.from(
            buffer
          )
      },

      fields:
        'id,name,mimeType,webViewLink,parents,modifiedTime'
    });


  await allowAnyoneToEdit(
    result.data.id
  );


  return (
    result.data
  );
}


/* ==============================
   Google Drive編集 → バージョン同期
============================== */

async function syncDriveVersions(workspaceId,by){

  const q=await pool.query(
    `select id,content from shared_items
     where workspace_id=$1
       and item_type='file'
       and trashed=false`,
    [workspaceId]
  );

  const drive=driveClient();
  let updated=0;

  for(const item of q.rows){

    const content=parseContent(item.content);
    if(!content.driveFileId)continue;

    try{
      const result=await drive.files.get({
        fileId:content.driveFileId,
        fields:'id,modifiedTime'
      });

      const modifiedTime=result.data?.modifiedTime||null;
      if(!modifiedTime)continue;

      const previous=content.driveModifiedTime||null;
      const changed=Boolean(
        previous &&
        new Date(modifiedTime).getTime()>
          new Date(previous).getTime()
      );

      await pool.query(
        `update shared_items
         set content=$1,
             version=version+$2,
             updated_by=case when $2=1 then $3 else updated_by end,
             updated_at=case when $2=1 then now() else updated_at end
         where id=$4 and workspace_id=$5`,
        [
          JSON.stringify({...content,driveModifiedTime:modifiedTime}),
          changed?1:0,
          by||'Google Drive',
          item.id,
          workspaceId
        ]
      );

      if(changed)updated++;

    }catch(e){
      console.error('Drive version sync:',item.id,e.message);
    }
  }

  return updated;
}


/* ==============================
   TOMA SHARE経由ファイル表示
============================== */

async function streamFile(
  req,
  res,
  ws,
  fileId
){

  const q =
    await pool.query(
      `
      select

        id,

        name,

        mime_type,

        content

      from shared_items

      where id=$1

        and workspace_id=$2

        and item_type='file'

        and trashed=false

      limit 1
      `,
      [
        fileId,
        ws.id
      ]
    );


  const item =
    q.rows[0];


  if(!item){

    return send(
      res,
      404,
      {
        error:
          'ファイルが見つかりません'
      }
    );
  }


  const content =
    parseContent(
      item.content
    );


  const driveFileId =
    content.driveFileId;


  if(!driveFileId){

    return send(
      res,
      404,
      {
        error:
          'Google Drive上のファイル情報がありません'
      }
    );
  }


  const drive =
    driveClient();


  /*
    Drive上のファイル形式確認
  */

  const metaResult =
    await drive.files.get({

      fileId:
        driveFileId,

      fields:
        'id,name,mimeType,size'
    });


  const meta =
    metaResult.data ||
    {};


  const googleMimeType =

    meta.mimeType ||

    content.googleMimeType ||

    item.mime_type ||

    'application/octet-stream';


  const convertedMime =
    exportMime(
      googleMimeType,
      item.name
    );


  let result;

  let contentType;


  /*
    Google Sheets
    Google Docs
    Google Slides
  */

  if(convertedMime){

    result =
      await drive.files.export(

        {

          fileId:
            driveFileId,

          mimeType:
            convertedMime
        },

        {

          responseType:
            'stream'
        }
      );


    contentType =
      convertedMime;

  }else{

    /*
      PDF
      JPG
      PNG
      その他
    */

    result =
      await drive.files.get(

        {

          fileId:
            driveFileId,

          alt:
            'media'
        },

        {

          responseType:
            'stream'
        }
      );


    contentType =

      item.mime_type ||

      googleMimeType ||

      'application/octet-stream';
  }


  /*
    日本語・英語対応ファイル名
  */

  const filename =
    safeFilename(
      item.name
    );


  res.setHeader(
    'Cache-Control',
    'private, no-store'
  );


  res.setHeader(
    'X-Content-Type-Options',
    'nosniff'
  );


  res.setHeader(
    'Content-Type',
    contentType
  );


  /*
    重要

    filenameにはASCIIのみ。

    filename*には
    UTF-8の日本語・英語名。

    これでVercelの

    Invalid character in
    Content-Disposition

    を回避する。
  */

  res.setHeader(
    'Content-Disposition',

    `${
      req.query?.download==='1'
        ?'attachment'
        :'inline'
    }; filename="${filename.ascii}"; filename*=UTF-8''${filename.utf8}`
  );


  result.data.on(
    'error',
    err => {

      console.error(
        'TOMA SHARE FILE STREAM ERROR:',
        err
      );


      if(
        !res.headersSent
      ){

        return send(
          res,
          500,
          {
            error:
              'ファイルを取得できませんでした'
          }
        );
      }


      res.end();
    }
  );


  return result.data.pipe(
    res
  );
}



/* ==============================
   ログイン通知
============================== */

async function ensureNotificationTables(){

  await pool.query(
    `
    create table if not exists workspace_notification_keys
    (
      workspace_id uuid primary key,
      public_key text not null,
      private_key text not null,
      created_at timestamptz not null default now()
    )
    `
  );

  await pool.query(
    `
    create table if not exists workspace_push_subscriptions
    (
      endpoint text primary key,
      workspace_id uuid not null,
      member_name text not null,
      subscription jsonb not null,
      updated_at timestamptz not null default now()
    )
    `
  );

  await pool.query(
    `
    create index if not exists workspace_push_subscriptions_workspace_idx
    on workspace_push_subscriptions(workspace_id)
    `
  );

  await pool.query(
    `
    create table if not exists workspace_login_events
    (
      id bigserial primary key,
      workspace_id uuid not null,
      member_name text not null,
      created_at timestamptz not null default now()
    )
    `
  );

  await pool.query(
    `
    create index if not exists workspace_login_events_workspace_idx
    on workspace_login_events(workspace_id,created_at desc)
    `
  );
}


async function notificationKeys(workspaceId){

  await ensureNotificationTables();

  let q=await pool.query(
    `
    select public_key,private_key
    from workspace_notification_keys
    where workspace_id=$1
    limit 1
    `,
    [workspaceId]
  );

  if(q.rows[0]){
    return q.rows[0];
  }

  const keys=
    webpush.generateVAPIDKeys();

  await pool.query(
    `
    insert into workspace_notification_keys
    (workspace_id,public_key,private_key)
    values($1,$2,$3)
    on conflict(workspace_id) do nothing
    `,
    [
      workspaceId,
      keys.publicKey,
      keys.privateKey
    ]
  );

  q=await pool.query(
    `
    select public_key,private_key
    from workspace_notification_keys
    where workspace_id=$1
    limit 1
    `,
    [workspaceId]
  );

  return q.rows[0];
}


async function sendLoginPush(
  workspaceId,
  memberName,
  eventId
){

  const keys=
    await notificationKeys(
      workspaceId
    );

  webpush.setVapidDetails(
    'https://toma-share-cloud-live.vercel.app',
    keys.public_key,
    keys.private_key
  );

  const q=await pool.query(
    `
    select endpoint,subscription
    from workspace_push_subscriptions
    where workspace_id=$1
      and member_name<>$2
    `,
    [
      workspaceId,
      memberName
    ]
  );

  const payload=JSON.stringify({
    title:'TOMA SHARE',
    body:`${memberName}さんがログインしました`,
    url:'/',
    eventId
  });

  const results=
    await Promise.allSettled(
      q.rows.map(
        row=>
          webpush.sendNotification(
            row.subscription,
            payload
          )
      )
    );

  const expired=[];

  results.forEach(
    (result,index)=>{

      if(
        result.status==='rejected' &&
        (
          result.reason?.statusCode===404 ||
          result.reason?.statusCode===410
        )
      ){
        expired.push(
          q.rows[index].endpoint
        );
      }
    }
  );

  if(expired.length){

    await pool.query(
      `
      delete from workspace_push_subscriptions
      where endpoint=any($1::text[])
      `,
      [expired]
    );
  }

  return results.filter(
    result=>result.status==='fulfilled'
  ).length;
}


/* ==============================
   API
============================== */

module.exports =
async(req,res)=>{


  res.setHeader(
    'Cache-Control',
    'no-store'
  );


  if(
    !process.env.DATABASE_URL
  ){

    return send(
      res,
      500,
      {
        error:
          'DATABASE_URL が未設定です'
      }
    );
  }


  /*
    通常APIアクセスはヘッダー。

    ファイルを新しいタブで開く時は
    Cookieから共有コードを取得。
  */

  const headerCode =
    req.headers[
      'x-workspace-code'
    ];


  const cookieCode =
    readCookie(
      req,
      'toma_ws'
    );


  const code =

    headerCode ||

    cookieCode;


  try{


    const ws =
      await workspace(
        code
      );


    if(!ws){

      return send(
        res,
        401,
        {
          error:
            '共有コードが正しくありません'
        }
      );
    }

    await ensureTasksTable();
    await ensureActivityTable();
    await ensureFiscalYearColumns();


    /*
      TOMA SHAREログイン済み情報

      30日保存
    */

    if(headerCode){

      res.setHeader(

        'Set-Cookie',

        `toma_ws=${encodeURIComponent(headerCode)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`
      );
    }


    /* ==============================
       ファイルを開く
    ============================== */

    if(
      req.method === 'GET' &&

      req.query &&

      req.query.file
    ){

      return await streamFile(
        req,
        res,
        ws,
        String(
          req.query.file
        )
      );
    }


    /* ==============================
       通常GET
    ============================== */

    if(
      req.method ===
      'GET'
    ){


      const memberName =
        decodeHeader(
          req.headers[
            'x-member-name'
          ]
        );


      if(memberName){

        await touchPresence(
          ws.id,
          memberName
        );
      }

      await ensureNotificationTables();

      await ensureTasksTable();
      await ensureActivityTable();


      const [

        schedules,

        items,

        minutes,

        reviews,

        permits,

        tasks,

        online,

        loginEvents

      ] =
      await Promise.all([


        pool.query(
          `
          select *

          from schedules

          where workspace_id=$1
            and deleted_at is null

          order by

            starts_at
              nulls last,

            created_at desc
          `,
          [
            ws.id
          ]
        ),


        pool.query(
          `
          select child.*

          from shared_items child

          where child.workspace_id=$1

            and child.trashed=false

            and
            (
              child.item_type<>'file'
              or child.parent_id is null
              or exists
              (
                select 1
                from shared_items parent
                where parent.id=child.parent_id
                  and parent.workspace_id=child.workspace_id
                  and parent.item_type='folder'
                  and parent.trashed=false
              )
            )

          order by
            child.item_type,
            child.name
          `,
          [
            ws.id
          ]
        ),


        pool.query(
          `
          select *

          from minutes

          where workspace_id=$1

          order by

            meeting_date
              desc
              nulls last,

            created_at desc
          `,
          [
            ws.id
          ]
        ),


        pool.query(
          `
          select *

          from reviews

          where workspace_id=$1

          order by
            created_at desc
          `,
          [
            ws.id
          ]
        ),


        pool.query(
          `
          select *

          from permits

          where workspace_id=$1

          order by
            created_at desc
          `,
          [
            ws.id
          ]
        ),


        pool.query(
          `
          select *
          from workspace_tasks
          where workspace_id=$1
            and deleted_at is null
          order by completed,due_at nulls last,created_at desc
          `,
          [
            ws.id
          ]
        ),


        getOnlineMembers(
          ws.id
        ),

        pool.query(
          `
          select id,member_name,created_at
          from workspace_login_events
          where workspace_id=$1
            and created_at > now() - interval '10 minutes'
          order by id
          `,
          [
            ws.id
          ]
        )
      ]);


      const [
        trashedItems,
        trashedSchedules,
        trashedTasks,
        activities
      ]=await Promise.all([
        pool.query(
          `select id,item_type,name,updated_by,updated_at
           from shared_items
           where workspace_id=$1
             and trashed=true
             and updated_at>now()-interval '30 days'
             and item_type in ('file','folder')
           order by updated_at desc`,
          [ws.id]
        ),
        pool.query(
          `select id,title,updated_by,deleted_at
           from schedules
           where workspace_id=$1
             and deleted_at is not null
             and deleted_at>now()-interval '30 days'
           order by deleted_at desc`,
          [ws.id]
        ),
        pool.query(
          `select id,title,created_by,deleted_at
           from workspace_tasks
           where workspace_id=$1
             and deleted_at is not null
             and deleted_at>now()-interval '30 days'
           order by deleted_at desc`,
          [ws.id]
        ),
        pool.query(
          `select id,action,item_kind,item_id,detail,member_name,created_at
           from workspace_activity
           where workspace_id=$1
           order by created_at desc
           limit 100`,
          [ws.id]
        )
      ]);

      const trash=[
        ...trashedItems.rows.map(x=>({
          ...x,
          kind:'item',
          title:x.name,
          deleted_at:x.updated_at
        })),
        ...trashedSchedules.rows.map(x=>({
          ...x,
          kind:'schedule'
        })),
        ...trashedTasks.rows.map(x=>({
          ...x,
          kind:'task',
          updated_by:x.created_by
        }))
      ].sort(
        (a,b)=>
          new Date(b.deleted_at)-
          new Date(a.deleted_at)
      );


      /*
        TOMA SHARE自身のURLを作成
      */

      const host =
        String(
          req.headers.host ||
          ''
        );


      const proto =
        String(
          req.headers[
            'x-forwarded-proto'
          ] ||
          'https'
        )
        .split(',')[0]
        .trim();


      /*
        Drive URLをユーザーへ渡さず

        TOMA SHARE経由URLへ変更
      */

      const sharedItems =
        items.rows.map(
          x => {


            if(
              x.item_type !==
              'file'
            ){

              return x;
            }


            const proxyUrl =

              `${proto}://${host}/api/data?file=${encodeURIComponent(x.id)}`;


            const content =
              parseContent(
                x.content
              );


            return {

              ...x,


              /*
                app.jsは
                file_dataがURLなら
                そのまま開くため
                TOMA SHARE URLを入れる
              */

              file_data:
                proxyUrl,


              content:
                JSON.stringify({

                  ...content,

                  /*
                    「編集」は元のGoogle Drive画面を開く。
                    「開く」はTOMA SHARE経由で閲覧する。
                  */
                  googleEditLink:
                    content.googleEditLink ||
                    content.webViewLink ||
                    null,

                  webViewLink:
                    proxyUrl
                })
            };
          }
        );


      const messages =
        sharedItems.filter(
          x =>
            x.item_type ===
            'message'
        );


      return send(
        res,
        200,
        {

          workspace:
            ws,


          schedules:
            schedules.rows,


          items:
            sharedItems.filter(
              x =>
                x.item_type !==
                'message'
            ),


          messages,


          minutes:
            minutes.rows,


          reviews:
            reviews.rows,


          permits:
            permits.rows,


          tasks:
            tasks.rows,


          onlineMembers:
            online,


          loginEvents:
            loginEvents.rows,

          trash,

          activities:
            activities.rows
        }
      );
    }


    /* ==============================
       POST以外拒否
    ============================== */

    if(
      req.method !==
      'POST'
    ){

      return send(
        res,
        405,
        {
          error:
            'Method not allowed'
        }
      );
    }


    const b =
      req.body ||
      {};


    const by =
      b.by ||
      'メンバー';

    const fiscalYear=
      [2026,2027].includes(
        Number(b.year)
      )
        ?Number(b.year)
        :2026;


    await touchPresence(
      ws.id,
      by
    );

    await ensureTasksTable();
    await ensureActivityTable();


    switch(
      b.action
    ){


      /* ==============================
         オンライン
      ============================== */

      case 'presence':

        break;


      /* ==============================
         プッシュ通知設定
      ============================== */

      case 'push_config':{

        const keys=
          await notificationKeys(
            ws.id
          );

        return send(
          res,
          200,
          {
            ok:true,
            publicKey:
              keys.public_key
          }
        );
      }


      case 'push_subscribe':{

        const subscription=
          b.subscription;

        const endpoint=
          String(
            subscription?.endpoint ||
            ''
          );

        if(
          !endpoint ||
          !subscription?.keys?.p256dh ||
          !subscription?.keys?.auth
        ){

          return send(
            res,
            400,
            {
              error:
                '通知登録情報が正しくありません'
            }
          );
        }

        await ensureNotificationTables();

        await pool.query(
          `
          insert into workspace_push_subscriptions
          (
            endpoint,
            workspace_id,
            member_name,
            subscription,
            updated_at
          )
          values($1,$2,$3,$4,now())
          on conflict(endpoint)
          do update set
            workspace_id=excluded.workspace_id,
            member_name=excluded.member_name,
            subscription=excluded.subscription,
            updated_at=now()
          `,
          [
            endpoint,
            ws.id,
            by,
            JSON.stringify(
              subscription
            )
          ]
        );

        return send(
          res,
          200,
          {
            ok:true
          }
        );
      }


      case 'login_notify':{

        await ensureNotificationTables();

        const recent=
          await pool.query(
            `
            select id
            from workspace_login_events
            where workspace_id=$1
              and member_name=$2
              and created_at > now() - interval '20 seconds'
            limit 1
            `,
            [
              ws.id,
              by
            ]
          );

        if(recent.rows[0]){

          return send(
            res,
            200,
            {
              ok:true,
              duplicate:true
            }
          );
        }

        const event=
          await pool.query(
            `
            insert into workspace_login_events
            (workspace_id,member_name)
            values($1,$2)
            returning id,member_name,created_at
            `,
            [
              ws.id,
              by
            ]
          );

        const sent=
          await sendLoginPush(
            ws.id,
            by,
            event.rows[0].id
          );

        return send(
          res,
          200,
          {
            ok:true,
            event:event.rows[0],
            sent
          }
        );
      }


      /* ==============================
         Google Drive変更同期
      ============================== */

      case 'drive_sync':{

        const updated=
          await syncDriveVersions(
            ws.id,
            by
          );

        return send(
          res,
          200,
          {
            ok:true,
            updated
          }
        );
      }


      case 'drive_share_all':{
        const result=await shareWorkspaceDriveFiles(ws.id);
        return send(res,200,{ok:true,...result});
      }


      /* ==============================
         フォルダ
      ============================== */

      case 'folder':{


        const name =
          String(
            b.name ||
            ''
          ).trim();


        if(!name){

          return send(
            res,
            400,
            {
              error:
                'フォルダ名を入力してください'
            }
          );
        }


        const driveFolder =
          await createDriveFolder(
            name
          );


        const content = {

          driveFolderId:
            driveFolder.id,

          webViewLink:
            driveFolder.webViewLink ||
            null,

          googleMimeType:
            driveFolder.mimeType
        };


        await pool.query(
          `
          insert into shared_items
          (
            workspace_id,

            item_type,

            name,

            mime_type,

            file_data,

            content,

            updated_by,

            fiscal_year
          )

          values
          (
            $1,

            'folder',

            $2,

            $3,

            $4,

            $5,

            $6,

            $7
          )
          `,
          [

            ws.id,

            name,

            'application/vnd.google-apps.folder',

            driveFolder.webViewLink ||
            null,

            JSON.stringify(
              content
            ),

            by,

            fiscalYear
          ]
        );


        break;
      }


      /* ==============================
         ファイル追加
      ============================== */

      case 'file':{


        const driveFolderId =

          await getDriveFolder(

            ws.id,

            b.parent_id ||
            null,

            by
          );


        const driveFile =

          await uploadToDrive(

            b.name,

            b.mime_type,

            b.data,

            driveFolderId
          );


        const content = {

          size:
            b.size ||
            null,

          driveFileId:
            driveFile.id,

          webViewLink:
            driveFile.webViewLink ||
            null,

          googleMimeType:
            driveFile.mimeType,

          driveModifiedTime:
            driveFile.modifiedTime ||
            null,

          driveFolderId:
            driveFolderId ||
            null
        };


        await pool.query(
          `
          insert into shared_items
          (
            workspace_id,

            parent_id,

            item_type,

            name,

            mime_type,

            file_data,

            content,

            updated_by,

            fiscal_year
          )

          values
          (
            $1,

            $2,

            'file',

            $3,

            $4,

            $5,

            $6,

            $7,

            $8
          )
          `,
          [

            ws.id,

            b.parent_id ||
            null,

            b.name,

            b.mime_type ||
            null,

            driveFile.webViewLink ||
            null,

            JSON.stringify(
              content
            ),

            by,

            fiscalYear
          ]
        );


        break;
      }


      /* ==============================
         更新版
      ============================== */

      case 'version':{


        const old =
          await pool.query(
            `
            select *

            from shared_items

            where id=$1

              and workspace_id=$2

              and item_type='file'

            limit 1
            `,
            [
              b.id,
              ws.id
            ]
          );


        if(
          !old.rows[0]
        ){

          return send(
            res,
            404,
            {
              error:
                'ファイルが見つかりません'
            }
          );
        }


        const x =
          old.rows[0];


        await pool.query(
          `
          insert into item_versions
          (
            item_id,

            version,

            file_data,

            content,

            updated_by
          )

          values
          (
            $1,
            $2,
            $3,
            $4,
            $5
          )
          `,
          [

            x.id,

            x.version,

            x.file_data,

            x.content,

            by
          ]
        );


        const parentId =

          b.parent_id !==
          undefined

            ? b.parent_id

            : x.parent_id;


        const driveFolderId =

          await getDriveFolder(

            ws.id,

            parentId ||
            null,

            by
          );


        const driveFile =

          await uploadToDrive(

            b.name,

            b.mime_type,

            b.data,

            driveFolderId
          );


        const content = {

          size:
            b.size ||
            null,

          driveFileId:
            driveFile.id,

          webViewLink:
            driveFile.webViewLink ||
            null,

          googleMimeType:
            driveFile.mimeType,

          driveModifiedTime:
            driveFile.modifiedTime ||
            null,

          driveFolderId:
            driveFolderId ||
            null
        };


        await pool.query(
          `
          update shared_items

          set

            parent_id=$1,

            name=$2,

            mime_type=$3,

            file_data=$4,

            content=$5,

            version=
              version+1,

            updated_by=$6,

            updated_at=
              now()

          where id=$7

            and workspace_id=$8
          `,
          [

            parentId ||
            null,

            b.name,

            b.mime_type ||
            null,

            driveFile.webViewLink ||
            null,

            JSON.stringify(
              content
            ),

            by,

            b.id,

            ws.id
          ]
        );


        break;
      }


      /* ==============================
         ファイル削除
      ============================== */

      case 'item_delete':


        await pool.query(
          `
          update shared_items

          set

            trashed=true,

            updated_by=$1,

            updated_at=now()

          where workspace_id=$3

            and
            (
              id=$2
              or parent_id=$2
            )
          `,
          [

            by,

            b.id,

            ws.id
          ]
        );


        break;


      /* ==============================
         メッセージ
      ============================== */

      case 'message':{
        const text=String(b.text||'').trim();
        const imageData=String(b.image_data||'');

        if(!text&&!imageData){
          return send(res,400,{error:'メッセージか画像を入力してください'});
        }

        if(imageData&&!/^data:image\/(?:jpeg|png|webp|gif);base64,/i.test(imageData)){
          return send(res,400,{error:'画像形式が正しくありません'});
        }

        if(imageData.length>1800000){
          return send(res,413,{error:'画像が大きすぎます'});
        }

        await pool.query(
          `insert into shared_items
           (workspace_id,item_type,name,mime_type,file_data,updated_by,fiscal_year)
           values($1,'message',$2,$3,$4,$5,$6)`,
          [
            ws.id,
            text||'画像',
            imageData?(imageData.match(/^data:([^;]+)/)?.[1]||'image/jpeg'):null,
            imageData||null,
            by,
            fiscalYear
          ]
        );
        break;
      }


      /* ==============================
         メッセージ取消
      ============================== */

      case 'message_delete':{


        const q =
          await pool.query(
            `
            select

              id,

              updated_by

            from shared_items

            where id=$1

              and workspace_id=$2

              and item_type='message'

              and trashed=false

            limit 1
            `,
            [

              b.id,

              ws.id
            ]
          );


        if(
          !q.rows[0]
        ){

          return send(
            res,
            404,
            {
              error:
                'メッセージが見つかりません'
            }
          );
        }


        if(
          q.rows[0]
            .updated_by !==
          by
        ){

          return send(
            res,
            403,
            {
              error:
                '自分のメッセージだけ取り消せます'
            }
          );
        }


        await pool.query(
          `
          update shared_items

          set

            trashed=true,

            updated_at=now()

          where id=$1

            and workspace_id=$2
          `,
          [

            b.id,

            ws.id
          ]
        );


        break;
      }


      /* ==============================
         スケジュール
      ============================== */

      case 'schedule':


        await pool.query(
          `
          insert into schedules
          (
            workspace_id,

            title,

            starts_at,

            ends_at,

            place,

            memo,

            updated_by,

            fiscal_year
          )

          values
          (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8
          )
          `,
          [

            ws.id,

            b.title,

            b.starts_at ||
            null,

            b.ends_at ||
            null,

            b.place ||
            null,

            b.memo ||
            null,

            by,

            fiscalYear
          ]
        );


        break;


      /* ==============================
         スケジュール削除
      ============================== */

      case 'schedule_delete':


        await pool.query(
          `
          update schedules
          set deleted_at=now()
          where id=$1
            and workspace_id=$2
          `,
          [
            b.id,
            ws.id
          ]
        );


        break;


      /* ==============================
         議事録
      ============================== */

      case 'minute':


        await pool.query(
          `
          insert into minutes
          (
            workspace_id,

            title,

            meeting_date,

            body,

            action_items,

            updated_by,

            fiscal_year
          )

          values
          (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7
          )
          `,
          [

            ws.id,

            b.title,

            b.meeting_date ||
            null,

            b.body ||
            null,

            b.action_items ||
            null,

            by,

            fiscalYear
          ]
        );


        break;


      /* ==============================
         反省点
      ============================== */

      case 'review':


        await pool.query(
          `
          insert into reviews
          (
            workspace_id,

            title,

            category,

            body,

            updated_by,

            fiscal_year
          )

          values
          (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6
          )
          `,
          [

            ws.id,

            b.title,

            b.category ||
            null,

            b.body ||
            null,

            by,

            fiscalYear
          ]
        );


        break;


      /* ==============================
         許可・申請
      ============================== */

      case 'permit':


        await pool.query(
          `
          insert into permits
          (
            workspace_id,

            title,

            organization,

            contact,

            body,

            updated_by,

            fiscal_year
          )

          values
          (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7
          )
          `,
          [

            ws.id,

            b.title,

            b.organization ||
            null,

            b.contact ||
            null,

            b.body ||
            null,

            by,

            fiscalYear
          ]
        );


        break;


      /* ==============================
         やることリスト
      ============================== */

      case 'task':{
        const title=String(b.title||'').trim();
        if(!title)return send(res,400,{error:'やることを入力してください'});
        await ensureTasksTable();
        await pool.query(
          `insert into workspace_tasks
           (workspace_id,title,due_at,assignee,notes,created_by,fiscal_year)
           values($1,$2,$3,$4,$5,$6,$7)`,
          [
            ws.id,
            title,
            b.due_at||null,
            String(b.assignee||'').trim()||null,
            String(b.notes||'').trim()||null,
            by,
            fiscalYear
          ]
        );
        break;
      }

      case 'task_toggle':{
        await ensureTasksTable();
        await pool.query(
          `update workspace_tasks set completed=$1,updated_at=now()
           where id=$2 and workspace_id=$3`,
          [Boolean(b.completed),b.id,ws.id]
        );
        break;
      }

      case 'task_delete':{
        await ensureTasksTable();
        await pool.query(
          `update workspace_tasks
           set deleted_at=now(),updated_at=now()
           where id=$1 and workspace_id=$2`,
          [b.id,ws.id]
        );
        break;
      }


      case 'trash_restore':{
        const kind=String(b.kind||'');
        if(kind==='item'){
          await pool.query(
            `update shared_items
             set trashed=false,updated_by=$1,updated_at=now()
             where workspace_id=$3
               and (id=$2 or parent_id=$2)`,
            [by,b.id,ws.id]
          );
        }else if(kind==='schedule'){
          await pool.query(
            `update schedules
             set deleted_at=null,updated_at=now(),updated_by=$1
             where id=$2 and workspace_id=$3`,
            [by,b.id,ws.id]
          );
        }else if(kind==='task'){
          await pool.query(
            `update workspace_tasks
             set deleted_at=null,updated_at=now()
             where id=$1 and workspace_id=$2`,
            [b.id,ws.id]
          );
        }else{
          return send(res,400,{error:'復元対象が不正です'});
        }
        break;
      }


      /* ==============================
         記録削除
      ============================== */

      case 'record_delete':{


        const table = {

          minute:
            'minutes',

          review:
            'reviews',

          permit:
            'permits'

        }[
          b.kind
        ];


        if(!table){

          return send(
            res,
            400,
            {
              error:
                '種類が不正です'
            }
          );
        }


        await pool.query(
          `
          delete from ${table}

          where id=$1

            and workspace_id=$2
          `,
          [

            b.id,

            ws.id
          ]
        );


        break;
      }


      default:


        return send(
          res,
          400,
          {
            error:
              '操作が不正です'
          }
        );
    }


    const auditable=[
      'folder','file','version','item_delete',
      'message','message_delete','schedule',
      'schedule_delete','minute','review','permit',
      'task','task_toggle','task_delete',
      'record_delete','trash_restore'
    ];

    if(auditable.includes(b.action)){
      const detail=
        String(
          b.title||
          b.name||
          b.text||
          ''
        ).trim()||
        null;

      await pool.query(
        `insert into workspace_activity
         (workspace_id,action,item_kind,item_id,detail,member_name,fiscal_year)
         values($1,$2,$3,$4,$5,$6,$7)`,
        [
          ws.id,
          b.action,
          b.kind||null,
          b.id?String(b.id):null,
          detail,
          by,
          fiscalYear
        ]
      );
    }


    return send(
      res,
      200,
      {
        ok:true
      }
    );


  }catch(e){


    console.error(
      'TOMA SHARE API error:',

      e?.response?.data ||

      e?.message ||

      'unknown'
    );


    if(
      !res.headersSent
    ){

      return send(
        res,
        500,
        {
          error:
            'サーバーエラー: ' +
            (
              e?.response
                ?.data
                ?.error_description ||

              e?.message ||

              '不明なエラー'
            )
        }
      );
    }


    return res.end();
  }
};
