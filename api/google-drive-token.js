const crypto=require('crypto');
const {Pool}=require('pg');

const pool=new Pool({
  connectionString:process.env.DATABASE_URL,
  ssl:{rejectUnauthorized:false}
});

let ready=null;

function ensureTable(){
  if(!ready){
    ready=pool.query(
      `create table if not exists app_secure_settings (
         setting_key text primary key,
         encrypted_value text not null,
         updated_at timestamptz not null default now()
       )`
    ).catch(error=>{
      ready=null;
      throw error;
    });
  }
  return ready;
}

function encryptionKey(){
  const secret=String(process.env.GOOGLE_CLIENT_SECRET||'');
  if(!secret)throw new Error('GOOGLE_CLIENT_SECRET が未設定です');
  return crypto.createHash('sha256').update(`toma-share:${secret}`).digest();
}

function encrypt(value){
  const iv=crypto.randomBytes(12);
  const cipher=crypto.createCipheriv('aes-256-gcm',encryptionKey(),iv);
  const body=Buffer.concat([cipher.update(String(value),'utf8'),cipher.final()]);
  const tag=cipher.getAuthTag();
  return [iv,tag,body].map(part=>part.toString('base64url')).join('.');
}

function decrypt(value){
  const [ivText,tagText,bodyText]=String(value||'').split('.');
  if(!ivText||!tagText||!bodyText)throw new Error('保存済みGoogle認証情報が壊れています');
  const decipher=crypto.createDecipheriv(
    'aes-256-gcm',
    encryptionKey(),
    Buffer.from(ivText,'base64url')
  );
  decipher.setAuthTag(Buffer.from(tagText,'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(bodyText,'base64url')),
    decipher.final()
  ]).toString('utf8');
}

async function saveGoogleRefreshToken(token){
  const clean=String(token||'').replace(/\s+/g,'');
  if(!clean)throw new Error('Google Refresh Tokenがありません');
  await ensureTable();
  await pool.query(
    `insert into app_secure_settings(setting_key,encrypted_value,updated_at)
     values('google_drive_refresh_token',$1,now())
     on conflict(setting_key) do update
       set encrypted_value=excluded.encrypted_value,
           updated_at=now()`,
    [encrypt(clean)]
  );
}

async function getGoogleRefreshToken(){
  try{
    await ensureTable();
    const result=await pool.query(
      `select encrypted_value from app_secure_settings
       where setting_key='google_drive_refresh_token' limit 1`
    );
    if(result.rows[0]?.encrypted_value){
      return decrypt(result.rows[0].encrypted_value).replace(/\s+/g,'');
    }
  }catch(error){
    console.error('Stored Google token read failed:',error.message);
  }
  return String(process.env.GOOGLE_REFRESH_TOKEN||'').replace(/\s+/g,'');
}

module.exports={saveGoogleRefreshToken,getGoogleRefreshToken};
