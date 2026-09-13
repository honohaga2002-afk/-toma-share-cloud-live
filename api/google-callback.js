const { google } = require('googleapis');
const crypto=require('crypto');
const {saveGoogleRefreshToken}=require('./google-drive-token');

function cookie(req,name){
  const part=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(`${name}=`));
  return part?decodeURIComponent(part.slice(name.length+1)):'';
}

function validState(req,state){
  const [timestamp,nonce,signature]=String(state||'').split('.');
  if(!timestamp||!nonce||!signature||cookie(req,'toma_google_oauth')!==nonce)return false;
  if(Math.abs(Date.now()-Number(timestamp))>10*60*1000)return false;
  const expected=crypto.createHmac('sha256',String(process.env.GOOGLE_CLIENT_SECRET||''))
    .update(`${timestamp}.${nonce}`).digest('base64url');
  try{return crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(expected));}catch(e){return false;}
}

module.exports = async (req, res) => {
  try {
    const code = req.query.code;

    if (!code) {
      return res.status(400).send('認証コードがありません');
    }

    if(!validState(req,req.query.state)){
      return res.status(400).send('認証の有効期限が切れました。アプリからもう一度接続してください。');
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'https://toma-share-cloud-live.vercel.app/api/google-callback'
    );

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return res.status(400).send(
        'Refresh Tokenを取得できませんでした。Googleアカウントのアクセス許可を一度解除して、もう一度認証してください。'
      );
    }

    await saveGoogleRefreshToken(tokens.refresh_token);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    return res.status(200).send(`
      <!doctype html>
      <html lang="ja">
        <head>
          <meta name="viewport" content="width=device-width,initial-scale=1">
          <title>TOMA SHARE</title>
        </head>
        <body style="font-family:sans-serif;padding:24px">
          <h2>Google Driveとの接続に成功しました</h2>
          <p>新しい認証情報を安全に保存しました。</p>
          <p><a href="/?open=drive&drive=connected" style="display:inline-block;padding:14px 20px;border-radius:10px;background:#0b76d1;color:#fff;text-decoration:none;font-weight:700">共有ドライブへ戻る</a></p>
        </body>
      </html>
    `);
  } catch (e) {
    console.error(e);
    return res.status(500).send('Google認証エラー: ' + e.message);
  }
};
