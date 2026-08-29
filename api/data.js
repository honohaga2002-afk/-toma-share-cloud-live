const { Pool } = require('pg');
const { google } = require('googleapis');
const { Readable } = require('stream');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function send(res, status, obj) {
  return res.status(status).json(obj);
}


/* ========================================
   Google Drive
======================================== */

function driveClient() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  const refreshToken = String(
    process.env.GOOGLE_REFRESH_TOKEN || ''
  ).replace(/\s+/g, '');

  if (!refreshToken) {
    throw new Error(
      'GOOGLE_REFRESH_TOKEN が未設定です'
    );
  }

  auth.setCredentials({
    refresh_token: refreshToken
  });

  return google.drive({
    version: 'v3',
    auth
  });
}


/* ========================================
   Office → Google形式
======================================== */

function googleMime(name = '') {
  const n = name.toLowerCase();

  if (
    n.endsWith('.xlsx') ||
    n.endsWith('.xls') ||
    n.endsWith('.csv')
  ) {
    return 'application/vnd.google-apps.spreadsheet';
  }

  if (
    n.endsWith('.docx') ||
    n.endsWith('.doc')
  ) {
    return 'application/vnd.google-apps.document';
  }

  if (
    n.endsWith('.pptx') ||
    n.endsWith('.ppt')
  ) {
    return 'application/vnd.google-apps.presentation';
  }

  return null;
}


/* ========================================
   contentを安全に取得
======================================== */

function parseContent(value) {
  if (!value) return {};

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (e) {
    return {};
  }
}


/* ========================================
   Google Driveフォルダ作成
======================================== */

async function createDriveFolder(name) {
  const drive = driveClient();

  const result = await drive.files.create({
    requestBody: {
      name,
      mimeType:
        'application/vnd.google-apps.folder'
    },

    fields:
      'id,name,mimeType,webViewLink'
  });

  return result.data;
}


/* ========================================
   TOMA SHAREフォルダ取得
   古いフォルダならDrive側も自動作成
======================================== */

async function getDriveFolder(
  workspaceId,
  parentId,
  by
) {
  if (!parentId) {
    return null;
  }

  const q = await pool.query(
    `select *
     from shared_items
     where id=$1
       and workspace_id=$2
       and item_type='folder'
       and trashed=false
     limit 1`,
    [
      parentId,
      workspaceId
    ]
  );

  const folder = q.rows[0];

  if (!folder) {
    throw new Error(
      '保存先フォルダが見つかりません'
    );
  }

  const content =
    parseContent(folder.content);

  if (content.driveFolderId) {
    return content.driveFolderId;
  }

  /*
   * 以前作成したTOMA SHAREフォルダには
   * DriveフォルダIDが無いので
   * 初回使用時にGoogle Drive側へ作る
   */
  const driveFolder =
    await createDriveFolder(folder.name);

  const newContent = {
    ...content,
    driveFolderId: driveFolder.id,
    webViewLink:
      driveFolder.webViewLink || null,
    googleMimeType:
      driveFolder.mimeType
  };

  await pool.query(
    `update shared_items
     set content=$1,
         file_data=$2,
         updated_by=$3,
         updated_at=now()
     where id=$4
       and workspace_id=$5`,
    [
      JSON.stringify(newContent),
      driveFolder.webViewLink || null,
      by,
      folder.id,
      workspaceId
    ]
  );

  return driveFolder.id;
}


/* ========================================
   Google Driveへファイル保存
======================================== */

async function uploadToDrive(
  name,
  mimeType,
  data,
  driveFolderId = null
) {
  const match = String(data || '').match(
    /^data:([^;]+);base64,(.+)$/s
  );

  if (!match) {
    throw new Error(
      'ファイルデータを読み込めません'
    );
  }

  const buffer =
    Buffer.from(match[2], 'base64');

  const targetMime =
    googleMime(name);

  const drive =
    driveClient();

  const requestBody = {
    name
  };

  /*
   * Excel / Word / PowerPointは
   * Google形式へ変換
   */
  if (targetMime) {
    requestBody.mimeType =
      targetMime;
  }

  /*
   * 保存先Google Driveフォルダ
   */
  if (driveFolderId) {
    requestBody.parents = [
      driveFolderId
    ];
  }

  const result =
    await drive.files.create({
      requestBody,

      media: {
        mimeType:
          mimeType ||
          match[1] ||
          'application/octet-stream',

        body:
          Readable.from(buffer)
      },

      fields:
        'id,name,mimeType,webViewLink,parents'
    });

  return result.data;
}


/* ========================================
   ワークスペース
======================================== */

async function workspace(code) {
  if (!code) {
    return null;
  }

  const q = await pool.query(
    `select id,name,invite_code
     from workspaces
     where upper(invite_code)=upper($1)
     limit 1`,
    [code]
  );

  return q.rows[0] || null;
}


/* ========================================
   API
======================================== */

module.exports = async (req, res) => {

  res.setHeader(
    'Cache-Control',
    'no-store'
  );

  if (!process.env.DATABASE_URL) {
    return send(
      res,
      500,
      {
        error:
          'DATABASE_URL が未設定です'
      }
    );
  }

  const code =
    req.headers['x-workspace-code'];

  try {

    const ws =
      await workspace(code);

    if (!ws) {
      return send(
        res,
        401,
        {
          error:
            '共有コードが正しくありません'
        }
      );
    }


    /* =====================================
       読み込み
    ===================================== */

    if (req.method === 'GET') {

      const [
        schedules,
        items,
        minutes,
        reviews,
        permits
      ] = await Promise.all([

        pool.query(
          `select *
           from schedules
           where workspace_id=$1
           order by starts_at nulls last,
                    created_at desc`,
          [ws.id]
        ),

        pool.query(
          `select *
           from shared_items
           where workspace_id=$1
             and trashed=false
           order by item_type,name`,
          [ws.id]
        ),

        pool.query(
          `select *
           from minutes
           where workspace_id=$1
           order by meeting_date desc nulls last,
                    created_at desc`,
          [ws.id]
        ),

        pool.query(
          `select *
           from reviews
           where workspace_id=$1
           order by created_at desc`,
          [ws.id]
        ),

        pool.query(
          `select *
           from permits
           where workspace_id=$1
           order by created_at desc`,
          [ws.id]
        )

      ]);

      const messages =
        items.rows.filter(
          x =>
            x.item_type ===
            'message'
        );

      return send(
        res,
        200,
        {
          workspace: ws,

          schedules:
            schedules.rows,

          items:
            items.rows.filter(
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
            permits.rows
        }
      );
    }


    if (req.method !== 'POST') {
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
      req.body || {};

    const by =
      b.by || 'メンバー';


    /* =====================================
       操作
    ===================================== */

    switch (b.action) {


      /* ===================================
         フォルダ作成
      =================================== */

      case 'folder': {

        const name =
          String(
            b.name || ''
          ).trim();

        if (!name) {
          return send(
            res,
            400,
            {
              error:
                'フォルダ名を入力してください'
            }
          );
        }

        /*
         * Google Driveにも
         * 実フォルダを作成
         */
        const driveFolder =
          await createDriveFolder(name);

        const content = {
          driveFolderId:
            driveFolder.id,

          webViewLink:
            driveFolder.webViewLink ||
            null,

          googleMimeType:
            driveFolder.mimeType
        };

        /*
         * TOMA SHAREにも登録
         */
        await pool.query(
          `insert into shared_items
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
          )`,
          [
            ws.id,
            name,

            'application/vnd.google-apps.folder',

            driveFolder.webViewLink ||
              null,

            JSON.stringify(content),

            by
          ]
        );

        break;
      }


      /* ===================================
         新規ファイル
      =================================== */

      case 'file': {

        if (
          !process.env
            .GOOGLE_REFRESH_TOKEN
        ) {
          return send(
            res,
            500,
            {
              error:
                'GOOGLE_REFRESH_TOKEN が未設定です'
            }
          );
        }

        /*
         * 選択されたTOMA SHAREフォルダから
         * Google DriveフォルダIDを取得
         */
        const driveFolderId =
          await getDriveFolder(
            ws.id,
            b.parent_id || null,
            by
          );

        /*
         * Google Driveへ保存
         */
        const driveFile =
          await uploadToDrive(
            b.name,
            b.mime_type,
            b.data,
            driveFolderId
          );

        const content = {
          size:
            b.size || null,

          driveFileId:
            driveFile.id,

          webViewLink:
            driveFile.webViewLink ||
            null,

          googleMimeType:
            driveFile.mimeType,

          driveFolderId:
            driveFolderId ||
            null
        };

        /*
         * parent_idも保存
         */
        await pool.query(
          `insert into shared_items
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
          )`,
          [
            ws.id,

            b.parent_id ||
              null,

            b.name,

            b.mime_type ||
              null,

            driveFile.webViewLink ||
              null,

            JSON.stringify(content),

            by
          ]
        );

        break;
      }


      /* ===================================
         更新版
      =================================== */

      case 'version': {

        const old =
          await pool.query(
            `select *
             from shared_items
             where id=$1
               and workspace_id=$2
               and item_type='file'
             limit 1`,
            [
              b.id,
              ws.id
            ]
          );

        if (!old.rows[0]) {
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

        /*
         * 古いバージョンを履歴保存
         */
        await pool.query(
          `insert into item_versions
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
          )`,
          [
            x.id,
            x.version,
            x.file_data,
            x.content,
            by
          ]
        );

        /*
         * 更新版は基本的に
         * 今までと同じフォルダへ保存
         */
        const parentId =
          b.parent_id !== undefined
            ?b.parent_id
            :x.parent_id;

        const driveFolderId =
          await getDriveFolder(
            ws.id,
            parentId || null,
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
            b.size || null,

          driveFileId:
            driveFile.id,

          webViewLink:
            driveFile.webViewLink ||
            null,

          googleMimeType:
            driveFile.mimeType,

          driveFolderId:
            driveFolderId ||
            null
        };

        await pool.query(
          `update shared_items
           set parent_id=$1,
               name=$2,
               mime_type=$3,
               file_data=$4,
               content=$5,
               version=version+1,
               updated_by=$6,
               updated_at=now()
           where id=$7
             and workspace_id=$8`,
          [
            parentId || null,

            b.name,

            b.mime_type ||
              null,

            driveFile.webViewLink ||
              null,

            JSON.stringify(content),

            by,

            b.id,

            ws.id
          ]
        );

        break;
      }


      /* ===================================
         ファイル / フォルダ削除
      =================================== */

      case 'item_delete': {

        await pool.query(
          `update shared_items
           set trashed=true,
               updated_by=$1,
               updated_at=now()
           where id=$2
             and workspace_id=$3`,
          [
            by,
            b.id,
            ws.id
          ]
        );

        break;
      }


      /* ===================================
         メッセージ
      =================================== */

      case 'message': {

        await pool.query(
          `insert into shared_items
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
          )`,
          [
            ws.id,
            b.text,
            by
          ]
        );

        break;
      }


      /* ===================================
         スケジュール
      =================================== */

      case 'schedule': {

        await pool.query(
          `insert into schedules
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
            $1,$2,$3,$4,$5,$6,$7
          )`,
          [
            ws.id,
            b.title,
            b.starts_at || null,
            b.ends_at || null,
            b.place || null,
            b.memo || null,
            by
          ]
        );

        break;
      }


      case 'schedule_delete': {

        await pool.query(
          `delete from schedules
           where id=$1
             and workspace_id=$2`,
          [
            b.id,
            ws.id
          ]
        );

        break;
      }


      /* ===================================
         議事録
      =================================== */

      case 'minute': {

        await pool.query(
          `insert into minutes
          (
            workspace_id,
            title,
            meeting_date,
            body,
            action_items,
            updated_by
          )
          values(
            $1,$2,$3,$4,$5,$6
          )`,
          [
            ws.id,
            b.title,
            b.meeting_date ||
              null,
            b.body || null,
            b.action_items ||
              null,
            by
          ]
        );

        break;
      }


      /* ===================================
         反省点
      =================================== */

      case 'review': {

        await pool.query(
          `insert into reviews
          (
            workspace_id,
            title,
            category,
            body,
            updated_by
          )
          values(
            $1,$2,$3,$4,$5
          )`,
          [
            ws.id,
            b.title,
            b.category || null,
            b.body || null,
            by
          ]
        );

        break;
      }


      /* ===================================
         許可・申請
      =================================== */

      case 'permit': {

        await pool.query(
          `insert into permits
          (
            workspace_id,
            title,
            organization,
            contact,
            body,
            updated_by
          )
          values(
            $1,$2,$3,$4,$5,$6
          )`,
          [
            ws.id,
            b.title,
            b.organization ||
              null,
            b.contact ||
              null,
            b.body ||
              null,
            by
          ]
        );

        break;
      }


      /* ===================================
         各種記録削除
      =================================== */

      case 'record_delete': {

        const table = {
          minute:
            'minutes',

          review:
            'reviews',

          permit:
            'permits'
        }[b.kind];

        if (!table) {
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
          `delete from ${table}
           where id=$1
             and workspace_id=$2`,
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
        ok: true
      }
    );


  } catch (e) {

    /*
     * Refresh Tokenなどの秘密情報が
     * Vercelログに大量表示されないようにする
     */
    console.error(
      'TOMA SHARE API error:',
      e?.response?.data ||
      e?.message ||
      'unknown'
    );

    return send(
      res,
      500,
      {
        error:
          'サーバーエラー: ' +
          (
            e?.response?.data?.error_description ||
            e?.message ||
            '不明なエラー'
          )
      }
    );
  }
};
