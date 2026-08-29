const { google } = require('googleapis');

module.exports = async (req, res) => {
  try {
    const code = req.query.code;

    if (!code) {
      return res.status(400).send('認証コードがありません');
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'https://toma-share-cloud-live.vercel.app/api/google/callback'
    );

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return res.status(400).send(
        'Refresh Tokenを取得できませんでした。Googleアカウントのアクセス許可を一度解除して、もう一度認証してください。'
      );
    }

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
          <p>次のRefresh TokenをVercelの環境変数に登録します。</p>
          <textarea style="width:100%;height:160px">${tokens.refresh_token}</textarea>
          <p>この値は他人に見せないでください。</p>
        </body>
      </html>
    `);
  } catch (e) {
    console.error(e);
    return res.status(500).send('Google認証エラー: ' + e.message);
  }
};
