(()=>{
'use strict';
const qs=(s,r=document)=>r.querySelector(s);
const qsa=(s,r=document)=>[...r.querySelectorAll(s)];

function clickLegacy(page){
  const legacy=qs(`#nav .nav[data-p="${page}"]`);
  if(legacy){legacy.click();return true;}
  const sec=document.getElementById(page);
  if(sec){qsa('main>section').forEach(x=>x.classList.add('hidden'));sec.classList.remove('hidden');window.scrollTo(0,0);return true;}
  return false;
}

function syncActive(){
  const visible=qsa('main>section').find(x=>!x.classList.contains('hidden'));
  const id=visible?.id||'home';
  qsa('.desktopSidebar button[data-target]').forEach(b=>b.classList.toggle('active',b.dataset.target===id));
}

function bindSidebar(){
  qsa('.desktopSidebar button[data-target]').forEach(b=>{
    if(b.dataset.bound)return;
    b.dataset.bound='1';
    b.addEventListener('click',()=>{clickLegacy(b.dataset.target);setTimeout(()=>{syncActive();renderDesktopHome();},0);});
  });
}

function enhanceHeader(){
  const left=qs('header.top>div:first-child');
  if(left){
    const meta=qs('.meta',left);
    if(meta)meta.textContent='学生団体の運営を、もっとスマートに';
  }
  const right=qs('header.top>div:nth-child(2)');
  if(right&&!qs('.pcEventSelect',right)){
    const event=document.createElement('select');
    event.className='pcEventSelect';
    event.setAttribute('aria-label','イベント選択');
    event.innerHTML='<option>TOMAフェスティバル2025</option>';
    right.insertBefore(event,right.firstChild);
    const notify=document.createElement('button');
    notify.type='button';notify.className='pcHeaderIcon';notify.setAttribute('aria-label','通知');notify.textContent='♧';
    const profile=document.createElement('button');
    profile.type='button';profile.className='pcHeaderIcon pcProfile';profile.setAttribute('aria-label','プロフィール');profile.textContent='●';
    right.append(notify,profile);
  }
}

function readCount(label){
  const home=document.getElementById('home');
  if(!home)return null;
  const nodes=qsa('.card,.item,.panel',home);
  const n=nodes.find(x=>(x.textContent||'').includes(label));
  if(!n)return null;
  const m=(n.textContent||'').match(/([0-9,]+)\s*件/);
  return m?m[1]:null;
}

function renderDesktopHome(){
  if(!document.body.classList.contains('ui-desktop'))return;
  const home=document.getElementById('home');
  if(!home||home.classList.contains('hidden'))return;
  if(home.dataset.pcApproved==='1')return;

  const files=readCount('共有ドライブ')||readCount('共有ファイル')||'4';
  const events=readCount('イベント')||readCount('予定')||'0';
  const permits=readCount('申請')||'0';

  home.innerHTML=`
    <div class="pcApprovedPage pcHomeApproved">
      <div class="pcPageHead">
        <div>
          <h1>TOMA SHARE</h1>
          <p>みんなでつくる、よりよいイベント運営を。</p>
        </div>
        <div class="pcGreeting">
          <strong>2026年9月9日（水）</strong>
          <span>TOMA SHARE 運営ワークスペース</span>
          <small>今日もよろしくお願いします！</small>
        </div>
      </div>

      <div class="pcKpiGrid">
        <button class="pcKpi pcKpiBlue" data-go="drive"><span class="pcKpiIcon">▣</span><b>共有ファイル</b><strong>${files}<em>件</em></strong><small>共有資料を確認</small></button>
        <button class="pcKpi pcKpiGreen" data-go="events"><span class="pcKpiIcon">▦</span><b>今月のイベント</b><strong>${events}<em>件</em></strong><small>開催予定を確認</small></button>
        <button class="pcKpi pcKpiRed" data-go="permit"><span class="pcKpiIcon">▤</span><b>未対応申請</b><strong>${permits}<em>件</em></strong><small>確認が必要です</small></button>
        <button class="pcKpi pcKpiPurple" data-go="budgetNative"><span class="pcKpiIcon">▥</span><b>予算管理</b><strong class="pcBudgetValue">予算を確認</strong><small>収支・実績を確認</small></button>
      </div>

      <div class="pcHomeColumns">
        <section class="pcRefPanel">
          <div class="pcRefPanelHead"><h2>最近のアクティビティ</h2><button data-go="activity">すべて見る ›</button></div>
          <div class="pcActivityList">
            <div class="pcActivity"><span class="pcActivityIcon blue">▧</span><div><b>共有ファイルを確認できます</b><small>ファイル共有から最新資料を確認</small></div><time>最新</time></div>
            <div class="pcActivity"><span class="pcActivityIcon green">▦</span><div><b>イベント予定を確認できます</b><small>イベント一覧から開催予定を確認</small></div><time>予定</time></div>
            <div class="pcActivity"><span class="pcActivityIcon purple">▥</span><div><b>予算管理を更新できます</b><small>予算・実績・取引明細を管理</small></div><time>管理</time></div>
            <div class="pcActivity"><span class="pcActivityIcon red">▤</span><div><b>申請・申し込みを確認できます</b><small>必要な申請や許可を確認</small></div><time>申請</time></div>
          </div>
        </section>

        <section class="pcRefPanel">
          <div class="pcRefPanelHead"><h2>今後のイベント</h2><button data-go="events">すべて見る ›</button></div>
          <div class="pcEventList">
            <div class="pcEventRow"><span class="pcDateBox"><b>予定</b><small>イベント</small></span><div><b>イベント一覧を確認</b><small>開催日時・会場・内容をまとめて管理</small></div><span class="pcStatus blue">予定</span></div>
            <div class="pcEventRow"><span class="pcDateBox"><b>申請</b><small>期限</small></span><div><b>申請期限を確認</b><small>未提出・確認中の申請を確認</small></div><span class="pcStatus green">確認</span></div>
            <div class="pcEventRow"><span class="pcDateBox"><b>予算</b><small>管理</small></span><div><b>予算の進捗を確認</b><small>収入・支出・実績を確認</small></div><span class="pcStatus red">管理</span></div>
          </div>
        </section>
      </div>
    </div>`;

  home.dataset.pcApproved='1';
  qsa('[data-go]',home).forEach(b=>b.addEventListener('click',()=>clickLegacy(b.dataset.go)));
}

function clearDesktopFlag(){
  const home=document.getElementById('home');
  if(home&&!document.body.classList.contains('ui-desktop'))delete home.dataset.pcApproved;
}

function addHeaderStyle(){
  if(qs('#pcRefRuntimeStyle'))return;
  const s=document.createElement('style');
  s.id='pcRefRuntimeStyle';
  s.textContent='body.ui-desktop .pcEventSelect{height:32px;min-height:32px;width:auto;margin:0;padding:0 28px 0 10px;border-radius:5px;border:1px solid rgba(255,255,255,.10);background:#173f66;color:#fff;font-size:12px;font-weight:700}body.ui-mobile .pcEventSelect,body.ui-mobile .pcHeaderIcon{display:none!important}body.ui-desktop .pcHeaderIcon{width:30px;height:30px;border:0;background:transparent;color:#fff;font-size:16px;padding:0;cursor:pointer}body.ui-desktop .pcProfile{border:2px solid #fff;border-radius:50%;font-size:9px}';
  document.head.appendChild(s);
}

function init(){enhanceHeader();addHeaderStyle();bindSidebar();syncActive();renderDesktopHome();}

document.addEventListener('DOMContentLoaded',()=>setTimeout(init,80));
document.addEventListener('click',()=>setTimeout(()=>{syncActive();renderDesktopHome();},30));
window.addEventListener('toma:viewmode',()=>setTimeout(()=>{clearDesktopFlag();init();},30));

let timer=null;
const mo=new MutationObserver(()=>{
  clearTimeout(timer);
  timer=setTimeout(()=>{syncActive();renderDesktopHome();},60);
});
mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
setTimeout(init,120);
})();
