const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

function send(res,status,obj){res.status(status).json(obj)}
async function workspace(code){
  if(!code) return null;
  const q=await pool.query('select id,name,invite_code from workspaces where upper(invite_code)=upper($1) limit 1',[code]);
  return q.rows[0]||null;
}
module.exports = async (req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(!process.env.DATABASE_URL) return send(res,500,{error:'DATABASE_URL が未設定です'});
  const code=req.headers['x-workspace-code'];
  try{
    const ws=await workspace(code);
    if(!ws) return send(res,401,{error:'共有コードが正しくありません'});
    if(req.method==='GET'){
      const [schedules,items,minutes,reviews,permits]=await Promise.all([
        pool.query('select * from schedules where workspace_id=$1 order by starts_at nulls last, created_at desc',[ws.id]),
        pool.query('select * from shared_items where workspace_id=$1 and trashed=false order by item_type,name',[ws.id]),
        pool.query('select * from minutes where workspace_id=$1 order by meeting_date desc nulls last, created_at desc',[ws.id]),
        pool.query('select * from reviews where workspace_id=$1 order by created_at desc',[ws.id]),
        pool.query('select * from permits where workspace_id=$1 order by created_at desc',[ws.id])
      ]);
      const messages=items.rows.filter(x=>x.item_type==='message');
      return send(res,200,{workspace:ws,schedules:schedules.rows,items:items.rows.filter(x=>x.item_type!=='message'),messages,minutes:minutes.rows,reviews:reviews.rows,permits:permits.rows});
    }
    if(req.method!=='POST') return send(res,405,{error:'Method not allowed'});
    const b=req.body||{}, by=b.by||'メンバー';
    switch(b.action){
      case 'folder':
        await pool.query("insert into shared_items(workspace_id,item_type,name,updated_by) values($1,'folder',$2,$3)",[ws.id,b.name,by]); break;
      case 'file':
        await pool.query("insert into shared_items(workspace_id,item_type,name,mime_type,file_data,content,updated_by) values($1,'file',$2,$3,$4,$5,$6)",[ws.id,b.name,b.mime_type||null,b.data,JSON.stringify({size:b.size||null}),by]); break;
      case 'version': {
        const old=await pool.query('select * from shared_items where id=$1 and workspace_id=$2',[b.id,ws.id]);
        if(!old.rows[0]) return send(res,404,{error:'ファイルが見つかりません'});
        const x=old.rows[0];
        await pool.query('insert into item_versions(item_id,version,file_data,content,updated_by) values($1,$2,$3,$4,$5)',[x.id,x.version,x.file_data,x.content,by]);
        await pool.query('update shared_items set name=$1,mime_type=$2,file_data=$3,content=$4,version=version+1,updated_by=$5,updated_at=now() where id=$6',[b.name,b.mime_type||null,b.data,JSON.stringify({size:b.size||null}),by,b.id]); break;
      }
      case 'item_delete':
        await pool.query('update shared_items set trashed=true,updated_by=$1,updated_at=now() where id=$2 and workspace_id=$3',[by,b.id,ws.id]); break;
      case 'message':
        await pool.query("insert into shared_items(workspace_id,item_type,name,updated_by) values($1,'message',$2,$3)",[ws.id,b.text,by]); break;
      case 'schedule':
        await pool.query('insert into schedules(workspace_id,title,starts_at,ends_at,place,memo,updated_by) values($1,$2,$3,$4,$5,$6,$7)',[ws.id,b.title,b.starts_at||null,b.ends_at||null,b.place||null,b.memo||null,by]); break;
      case 'schedule_delete':
        await pool.query('delete from schedules where id=$1 and workspace_id=$2',[b.id,ws.id]); break;
      case 'minute':
        await pool.query('insert into minutes(workspace_id,title,meeting_date,body,action_items,updated_by) values($1,$2,$3,$4,$5,$6)',[ws.id,b.title,b.meeting_date||null,b.body||null,b.action_items||null,by]); break;
      case 'review':
        await pool.query('insert into reviews(workspace_id,title,category,body,updated_by) values($1,$2,$3,$4,$5)',[ws.id,b.title,b.category||null,b.body||null,by]); break;
      case 'permit':
        await pool.query('insert into permits(workspace_id,title,organization,contact,body,updated_by) values($1,$2,$3,$4,$5,$6)',[ws.id,b.title,b.organization||null,b.contact||null,b.body||null,by]); break;
      case 'record_delete': {
        const table={minute:'minutes',review:'reviews',permit:'permits'}[b.kind];
        if(!table) return send(res,400,{error:'種類が不正です'});
        await pool.query(`delete from ${table} where id=$1 and workspace_id=$2`,[b.id,ws.id]); break;
      }
      default: return send(res,400,{error:'操作が不正です'});
    }
    return send(res,200,{ok:true});
  }catch(e){
    console.error(e);
    return send(res,500,{error:'サーバーエラー: '+e.message});
  }
};
