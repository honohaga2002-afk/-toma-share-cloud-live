const { Pool } = require('pg');
const { google } = require('googleapis');
const { Readable } = require('stream');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function send(res,status,obj){
  return res.status(status).json(obj);
}

function decodeHeader(value){
  const v=String(value||'');
  if(!v)return '';
  try{return decodeURIComponent(v);}
  catch(e){return v;}
}

function readCookie(req,name){
  const raw=String(req.headers.cookie||'');

  for(const part of raw.split(';')){
    const p=part.trim();
    const i=p.indexOf('=');

    if(i<0)continue;
    if(p.slice(0,i)!==name)continue;

    const v=p.slice(i+1);

    try{
      return decodeURIComponent(v);
    }catch(e){
      return v;
    }
  }

  return '';
}

function driveClient(){

  const auth=new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  const refreshToken=String(
    process.env.GOOGLE_REFRESH_TOKEN||''
  ).replace(/\s+/g,'');

  if(!refreshToken){
    throw new Error(
      'GOOGLE_REFRESH_TOKEN が未設定です'
    );
  }

  auth.setCredentials({
    refresh_token:refreshToken
  });

  return google.drive({
    version:'v3',
    auth
  });
}

function googleMime(name=''){

  const n=String(name).toLowerCase();

  if(
    n.endsWith('.xlsx')||
    n.endsWith('.xls')||
    n.endsWith('.csv')
  ){
    return 'application/vnd.google-apps.spreadsheet';
  }

  if(
    n.endsWith('.docx')||
    n.endsWith('.doc')
  ){
    return 'application/vnd.google-apps.document';
  }

  if(
    n.endsWith('.pptx')||
    n.endsWith('.ppt')
  ){
    return 'application/vnd.google-apps.presentation';
  }

  return null;
}

function exportMime(
  googleMimeType,
  name=''
){

  const n=
    String(name).toLowerCase();

  if(
    googleMimeType===
    'application/vnd.google-apps.spreadsheet'
  ){

    return n.endsWith('.csv')
      ?'text/csv'
      :'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }

  if(
    googleMimeType===
    'application/vnd.google-apps.document'
  ){

    return (
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  }

  if(
    googleMimeType===
    'application/vnd.google-apps.presentation'
  ){

    return (
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    );
  }

  if(
    googleMimeType===
    'application/vnd.google-apps.drawing'
  ){

    return 'application/pdf';
  }

  return null;
}

function parseContent(value){

  if(!value)return {};

  if(
    typeof value==='object'
  ){
    return value;
  }

  try{
    return JSON.parse(value);
  }catch(e){
    return {};
  }
}

function safeFilename(name){

  return String(
    name||'file'
  ).replace(
    /[\r\n"]/g,
    '_'
  );
}

async function workspace(code){

  if(!code)return null;

  const q=
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
      [code]
    );

  return q.rows[0]||null;
}

async function ensurePresenceTable(){

  await pool.query(`
    create table if not exists workspace_presence (
      workspace_id uuid not null,
      member_name text not null,
      last_seen timestamptz not null default now(),
      primary key (
        workspace_id,
        member_name
      )
    )
  `);
}

async function touchPresence(
  workspaceId,
  memberName
){

  const name=
    String(
      memberName||''
    ).trim();

  if(!name)return;

  await ensurePresenceTable();

  await pool.query(
    `
    insert into workspace_presence
    (
      workspace_id,
      member_name,
      last_seen
    )
    values(
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

    set last_seen=now()
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

  const q=
    await pool.query(
      `
      select
        member_name,
        last_seen
      from workspace_presence
      where workspace_id=$1
        and last_seen >
          now() - interval '2 minutes'
      order by member_name
      `,
      [workspaceId]
    );

  return q.rows;
}

async function createDriveFolder(
  name
){

  const drive=
    driveClient();

  const result=
    await drive.files.create({

      requestBody:{
        name,
        mimeType:
          'application/vnd.google-apps.folder'
      },

      fields:
        'id,name,mimeType,webViewLink'
    });

  return result.data;
}

async function getDriveFolder(
  workspaceId,
  parentId,
  by
){

  if(!parentId)return null;

  const q=
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

  const folder=
    q.rows[0];

  if(!folder){

    throw new Error(
      '保存先フォルダが見つかりません'
    );
  }

  const content=
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

  const driveFolder=
    await createDriveFolder(
      folder.name
    );

  const newContent={

    ...content,

    driveFolderId:
      driveFolder.id,

    webViewLink:
      driveFolder.webViewLink||
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

      driveFolder.webViewLink||
      null,

      by,
      folder.id,
      workspaceId
    ]
  );

  return driveFolder.id;
}

async function uploadToDrive(
  name,
  mimeType,
  data,
  driveFolderId=null
){

  const match=
    String(
      data||''
    ).match(
      /^data:([^;]+);base64,(.+)$/s
    );

  if(!match){

    throw new Error(
      'ファイルデータを読み込めません'
    );
  }

  const buffer=
    Buffer.from(
      match[2],
      'base64'
    );

  const targetMime=
    googleMime(name);

  const drive=
    driveClient();

  const requestBody={
    name
  };

  if(targetMime){

    requestBody.mimeType=
      targetMime;
  }

  if(driveFolderId){

    requestBody.parents=[
      driveFolderId
    ];
  }

  const result=
    await drive.files.create({

      requestBody,

      media:{

        mimeType:
          mimeType||
          match[1]||
          'application/octet-stream',

        body:
          Readable.from(
            buffer
          )
      },

      fields:
        'id,name,mimeType,webViewLink,parents'
    });

  return result.data;
}

async function streamFile(
  req,
  res,
  ws,
  fileId
){

  const q=
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

  const item=
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

  const content=
    parseContent(
      item.content
    );

  const driveFileId=
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

  const drive=
    driveClient();

  const metaResult=
    await drive.files.get({

      fileId:
        driveFileId,

      fields:
        'id,name,mimeType,size'
    });

  const meta=
    metaResult.data||{};

  const googleMimeType=

    meta.mimeType||

    content.googleMimeType||

    item.mime_type||

    'application/octet-stream';

  const convertedMime=
    exportMime(
      googleMimeType,
      item.name
    );

  let result;
  let contentType;

  if(convertedMime){

    result=
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

    contentType=
      convertedMime;

  }else{

    result=
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

    contentType=

      item.mime_type||

      googleMimeType||

      'application/octet-stream';
  }

  const filename=
    safeFilename(
      item.name
    );

  const encodedName=
    encodeURIComponent(
      filename
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

  res.setHeader(
    'Content-Disposition',
    `inline; filename="${filename}"; filename*=UTF-8''${encodedName}`
  );

  result.data.on(
    'error',
    err=>{

      console.error(
        'TOMA SHARE FILE STREAM ERROR:',
        err
      );

      if(!res.headersSent){

        send(
          res,
          500,
          {
            error:
              'ファイルを取得できませんでした'
          }
        );

      }else{

        res.end();
      }
    }
  );

  return result.data.pipe(
    res
  );
}

module.exports=
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

  const headerCode=
    req.headers[
      'x-workspace-code'
    ];

  const cookieCode=
    readCookie(
      req,
      'toma_ws'
    );

  const code=
    headerCode||
    cookieCode;

  try{

    const ws=
      await workspace(code);

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

    /*
      TOMA SHAREログイン情報を
      Cookieへ保存
    */
    if(headerCode){

      res.setHeader(

        'Set-Cookie',

        `toma_ws=${encodeURIComponent(headerCode)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`
      );
    }

    /*
      TOMA SHARE経由で
      Google Driveファイルを表示
    */
    if(
      req.method==='GET' &&
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
       GET
    ============================== */

    if(req.method==='GET'){

      const memberName=
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

      const [
        schedules,
        items,
        minutes,
        reviews,
        permits,
        online
      ]=
      await Promise.all([

        pool.query(
          `
          select *
          from schedules
          where workspace_id=$1
          order by
            starts_at nulls last,
            created_at desc
          `,
          [ws.id]
        ),

        pool.query(
          `
          select *
          from shared_items
          where workspace_id=$1
            and trashed=false
          order by item_type,name
          `,
          [ws.id]
        ),

        pool.query(
          `
          select *
          from minutes
          where workspace_id=$1
          order by
            meeting_date desc nulls last,
            created_at desc
          `,
          [ws.id]
        ),

        pool.query(
          `
          select *
          from reviews
          where workspace_id=$1
          order by created_at desc
          `,
          [ws.id]
        ),

        pool.query(
          `
          select *
          from permits
          where workspace_id=$1
          order by created_at desc
          `,
          [ws.id]
        ),

        getOnlineMembers(
          ws.id
        )
      ]);

      const host=
        String(
          req.headers.host||
          ''
        );

      const proto=
        String(
          req.headers[
            'x-forwarded-proto'
          ]||
          'https'
        )
        .split(',')[0]
        .trim();

      /*
        app.js側は変更しない。
        Drive URLを
        TOMA SHARE URLへ差し替える。
      */
      const sharedItems=
        items.rows.map(
          x=>{

            if(
              x.item_type!==
              'file'
            ){

              return x;
            }

            const proxyUrl=

              `${proto}://${host}/api/data?file=${encodeURIComponent(x.id)}`;

            const content=
              parseContent(
                x.content
              );

            return {

              ...x,

              file_data:
                proxyUrl,

              content:
                JSON.stringify({

                  ...content,

                  webViewLink:
                    proxyUrl
                })
            };
          }
        );

      const messages=
        sharedItems.filter(
          x=>
            x.item_type===
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
              x=>
                x.item_type!==
                'message'
            ),

          messages,

          minutes:
            minutes.rows,

          reviews:
            reviews.rows,

          permits:
            permits.rows,

          onlineMembers:
            online
        }
      );
    }

    if(
      req.method!=='POST'
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

    const b=
      req.body||{};

    const by=
      b.by||
      'メンバー';

    await touchPresence(
      ws.id,
      by
    );

    switch(
      b.action
    ){

      case 'presence':

        break;

      case 'folder':{

        const name=
          String(
            b.name||''
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

        const driveFolder=
          await createDriveFolder(
            name
          );

        const content={

          driveFolderId:
            driveFolder.id,

          webViewLink:
            driveFolder.webViewLink||
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
            updated_by
          )
          values(
            $1,
            'folder',
            $2,
            $3,
            $4,
            $5,
            $6
          )
          `,
          [
            ws.id,

            name,

            'application/vnd.google-apps.folder',

            driveFolder.webViewLink||
            null,

            JSON.stringify(
              content
            ),

            by
          ]
        );

        break;
      }

      case 'file':{

        const driveFolderId=
          await getDriveFolder(
            ws.id,
            b.parent_id||
            null,
            by
          );

        const driveFile=
          await uploadToDrive(
            b.name,
            b.mime_type,
            b.data,
            driveFolderId
          );

        const content={

          size:
            b.size||
            null,

          driveFileId:
            driveFile.id,

          webViewLink:
            driveFile.webViewLink||
            null,

          googleMimeType:
            driveFile.mimeType,

          driveFolderId:
            driveFolderId||
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
            updated_by
          )
          values(
            $1,
            $2,
            'file',
            $3,
            $4,
            $5,
            $6,
            $7
          )
          `,
          [
            ws.id,

            b.parent_id||
            null,

            b.name,

            b.mime_type||
            null,

            driveFile.webViewLink||
            null,

            JSON.stringify(
              content
            ),

            by
          ]
        );

        break;
      }

      case 'version':{

        const old=
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

        const x=
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
          values(
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

        const parentId=

          b.parent_id!==undefined

            ?b.parent_id

            :x.parent_id;

        const driveFolderId=

          await getDriveFolder(
            ws.id,
            parentId||
            null,
            by
          );

        const driveFile=
          await uploadToDrive(
            b.name,
            b.mime_type,
            b.data,
            driveFolderId
          );

        const content={

          size:
            b.size||
            null,

          driveFileId:
            driveFile.id,

          webViewLink:
            driveFile.webViewLink||
            null,

          googleMimeType:
            driveFile.mimeType,

          driveFolderId:
            driveFolderId||
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
            version=version+1,
            updated_by=$6,
            updated_at=now()
          where id=$7
            and workspace_id=$8
          `,
          [
            parentId||
            null,

            b.name,

            b.mime_type||
            null,

            driveFile.webViewLink||
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

      case 'item_delete':

        await pool.query(
          `
          update shared_items
          set
            trashed=true,
            updated_by=$1,
            updated_at=now()
          where id=$2
            and workspace_id=$3
          `,
          [
            by,
            b.id,
            ws.id
          ]
        );

        break;

      case 'message':

        await pool.query(
          `
          insert into shared_items
          (
            workspace_id,
            item_type,
            name,
            updated_by
          )
          values(
            $1,
            'message',
            $2,
            $3
          )
          `,
          [
            ws.id,
            b.text,
            by
          ]
        );

        break;

      case 'message_delete':{

        const q=
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
          q.rows[0].updated_by!==
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
            updated_by
          )
          values(
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

            b.starts_at||
            null,

            b.ends_at||
            null,

            b.place||
            null,

            b.memo||
            null,

            by
          ]
        );

        break;

      case 'schedule_delete':

        await pool.query(
          `
          delete from schedules
          where id=$1
            and workspace_id=$2
          `,
          [
            b.id,
            ws.id
          ]
        );

        break;

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
            updated_by
          )
          values(
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

            b.meeting_date||
            null,

            b.body||
            null,

            b.action_items||
            null,

            by
          ]
        );

        break;

      case 'review':

        await pool.query(
          `
          insert into reviews
          (
            workspace_id,
            title,
            category,
            body,
            updated_by
          )
          values(
            $1,
            $2,
            $3,
            $4,
            $5
          )
          `,
          [
            ws.id,
            b.title,

            b.category||
            null,

            b.body||
            null,

            by
          ]
        );

        break;

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
            updated_by
          )
          values(
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

            b.organization||
            null,

            b.contact||
            null,

            b.body||
            null,

            by
          ]
        );

        break;

      case 'record_delete':{

        const table={

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
      e?.response?.data||
      e?.message||
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
            'サーバーエラー: '+
            (
              e?.response?.data
                ?.error_description||
              e?.message||
              '不明なエラー'
            )
        }
      );
    }

    return res.end();
  }
};
