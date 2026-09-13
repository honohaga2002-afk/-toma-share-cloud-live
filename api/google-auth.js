const { google } = require('googleapis');
const crypto=require('crypto');

module.exports = async (req, res) => {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'https://toma-share-cloud-live.vercel.app/api/google-callback'
    );

    const timestamp=String(Date.now());
    const nonce=crypto.randomBytes(18).toString('base64url');
    const signature=crypto.createHmac('sha256',String(process.env.GOOGLE_CLIENT_SECRET||''))
      .update(`${timestamp}.${nonce}`).digest('base64url');
    const state=`${timestamp}.${nonce}.${signature}`;
    res.setHeader('Set-Cookie',`toma_google_oauth=${encodeURIComponent(nonce)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      state,
      scope: [
        'https://www.googleapis.com/auth/drive'
      ]
    });

    return res.redirect(url);
  } catch (e) {
    console.error(e);
    return res.status(500).send('Google認証エラー: ' + e.message);
  }
};
