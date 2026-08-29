const { google } = require('googleapis');

module.exports = async (req, res) => {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'https://toma-share-cloud-live.vercel.app/api/google-callback'
    );

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
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
