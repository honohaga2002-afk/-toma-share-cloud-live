(()=>{
'use strict';
const qs=(s,r=document)=>r.querySelector(s);
const qsa=(s,r=document)=>[...r.querySelectorAll(s)];
const PC_PAGES=new Set(['home','drive','events','budgetNative','permit','more']);

function isDesktop(){return document.body.classList.contains('ui-desktop');}
function showSection(id){
  qsa('main>section').forEach(x=>x.classList.add('hidden'));
  const sec=document.getElementById(id);
  if(sec){sec.classList.remove('hidden');window.scrollTo(0,0);}
  syncActive(id);
  renderPage(id);
}
function clickLegacy(page){
  if(isDesktop()&&PC_PAGES.has(page)){showSection(page);return true;}
  const legacy=qs(`#nav .nav[data-p="${page}"]`);
  if(legacy){legacy.click();return true;}
  const sec=document.getElementById(page);
  if(sec){qsa('main>section').forEach(x=>x.classList.add('hidden'));sec.classList.remove('hidden');window.scrollTo(0,0);return true;}
  return false;
}
function syncActive(force){
  const visible=qsa('main>section').find(x=>!x.classList.contains('hidden'));
  const id=force||visible?.id||'home';
  qsa('.desktopSidebar button[data-target]').forEach(b=>b.classList.toggle('active',b.dataset.target===id));
}
function bindSidebar(){
  qsa('.desktopSidebar button[data-target]').forEach(b=>{
    if(b.dataset.bound)return;
    b.dataset.bound='1';
    b.addEventListener('click',e=>{e.preventDefault();showSection(b.dataset.target);});
  });
}
function enhanceHeader(){
  const left=qs('header.top>div:first-child');
  if(left){const meta=qs('.meta',left);if(meta)meta.textContent='学生団体の運営を、もっとスマートに';}
  const right=qs('header.top>div:nth-child(2)');
  if(right&&!qs('.pcEventSelect',right)){
    const event=document.createElement('select');
    event.className='pcEventSelect';event.setAttribute('aria-label','イベント選択');
    event.innerHTML='<option>TOMAフェスティバル2025</option>';
    right.insertBefore(event,right.firstChild);
    const notify=document.createElement('button');notify.type='button';notify.className='pcHeaderIcon';notify.setAttribute('aria-label','通知');notify.textContent='♧';
    const profile=document.createElement('button');profile.type='button';profile.className='pcHeaderIcon pcProfile';profile.setAttribute('aria-label','プロフィール');profile.textContent='●';
    right.append(notify,profile);
  }
}
function bindGo(root){qsa('[data-go]',root).forEach(b=>b.addEventListener('click',e=>{e.preventDefault();showSection(b.dataset.go);}));}
function pageHead(title,desc,action=''){return `<div class="pcPageTitleRow"><div><h1>${title}</h1><p>${desc}</p></div>${action}</div>`;}
function renderHome(sec){
  sec.innerHTML=`<div class="pcApprovedPage">${pageHead('TOMA SHARE','みんなでつくる、よりよいイベント運営を。','<div class="pcGreeting"><strong>2026年9月9日（水）</strong><span>TOMA SHARE 運営ワークスペース</span><small>今日もよろしくお願いします！</small></div>')}
  <div class="pcKpiGrid">
    <button class="pcKpi pcKpiBlue" data-go="drive"><span class="pcKpiIcon">▣</span><b>共有ファイル</b><strong>128<em>件</em></strong><small>前月比 +12件</small></button>
    <button class="pcKpi pcKpiGreen" data-go="events"><span class="pcKpiIcon">▦</span><b>今月のイベント</b><strong>5<em>件</em></strong><small>今月開催 3件</small></button>
    <button class="pcKpi pcKpiRed" data-go="permit"><span class="pcKpiIcon">▤</span><b>未対応申請</b><strong>3<em>件</em></strong><small>確認が必要です</small></button>
    <button class="pcKpi pcKpiPurple" data-go="budgetNative"><span class="pcKpiIcon">▥</span><b>予算管理</b><strong>¥515,000</strong><small>予算残高</small></button>
  </div>
  <div class="pcHomeColumns"><section class="pcRefPanel"><div class="pcRefPanelHead"><h2>最近のアクティビティ</h2><button>すべて見る ›</button></div><div class="pcActivityList">
    <div class="pcActivity"><span class="pcActivityIcon blue">▧</span><div><b>会場レイアウト案.pdf をアップロードしました</b><small>山田 太郎</small></div><time>2時間前</time></div>
    <div class="pcActivity"><span class="pcActivityIcon green">▦</span><div><b>イベント「TOMAフェス2025」を作成しました</b><small>佐藤 花子</small></div><time>5時間前</time></div>
    <div class="pcActivity"><span class="pcActivityIcon purple">▥</span><div><b>予算申請書を提出しました</b><small>鈴木 一郎</small></div><time>1日前</time></div>
    <div class="pcActivity"><span class="pcActivityIcon red">▤</span><div><b>模擬店 出店申請を承認しました</b><small>高橋 健</small></div><time>2日前</time></div>
  </div></section><section class="pcRefPanel"><div class="pcRefPanelHead"><h2>今後のイベント</h2><button data-go="events">すべて見る ›</button></div><div class="pcEventList">
    <div class="pcEventRow"><span class="pcDateBox"><b>5/17</b><small>土</small></span><div><b>TOMAフェス2025 キックオフミーティング</b><small>10:00 - 12:00　1号館301教室</small></div><span class="pcStatus blue">打ち合わせ</span></div>
    <div class="pcEventRow"><span class="pcDateBox"><b>5/24</b><small>土</small></span><div><b>模擬店出店者説明会</b><small>14:00 - 16:00　大会議室</small></div><span class="pcStatus green">説明会</span></div>
    <div class="pcEventRow"><span class="pcDateBox"><b>6/1</b><small>日</small></span><div><b>前夜祭リハーサル</b><small>13:00 - 17:00　体育館</small></div><span class="pcStatus yellow">リハーサル</span></div>
    <div class="pcEventRow"><span class="pcDateBox"><b>6/7</b><small>土</small></span><div><b>TOMAフェス2025（本番）</b><small>10:00 - 18:00　大学グラウンド</small></div><span class="pcStatus red">本番</span></div>
  </div></section></div></div>`;bindGo(sec);
}
function renderDrive(sec){
  sec.innerHTML=`<div class="pcApprovedPage">${pageHead('ファイル共有','イベント運営に関するファイルを共有・管理できます。','<div class="pcTopActions"><button class="pcOutlineBtn">▣ 新規フォルダ</button><button class="pcPrimaryBtn">＋ ファイル追加</button></div>')}
  <div class="pcToolbar"><div class="pcSearch">⌕　ファイル名、キーワードで検索...</div><button>すべてのカテゴリ⌄</button><button>すべての状態⌄</button><div class="pcToolbarSpacer"></div><button>☷</button><button>▦</button></div>
  <div class="pcFileLayout"><section class="pcFolderPane"><div class="pcPaneHead"><b>フォルダ</b><button>＋</button></div><div class="pcFolder active">▣ すべてのファイル</div><div class="pcFolder">⌄ 📁 TOMAフェス2025</div><div class="pcFolder sub">📁 企画部</div><div class="pcFolder sub">📁 広報部</div><div class="pcFolder sub">📁 当日運営</div><div class="pcFolder sub">📁 書類・申請書</div><div class="pcFolder">⌄ 📁 共通資料</div><div class="pcFolder sub">📁 ロゴ・デザイン</div><div class="pcFolder sub">📁 テンプレート</div><div class="pcFolder sub">📁 過去の資料</div><div class="pcFolder">🗑 ゴミ箱</div></section>
  <section class="pcRefPanel pcTablePanel"><table class="pcTable"><thead><tr><th>ファイル名</th><th>カテゴリ</th><th>更新日</th><th>担当</th><th>状態</th><th></th></tr></thead><tbody>
  <tr><td>📕 TOMAフェス2025_企画書.pdf</td><td>企画書</td><td>2025/05/10 14:32</td><td>山田 太郎</td><td><span class="pcStatus green">最新</span></td><td>⋮</td></tr>
  <tr><td>🖼 会場レイアウト案.png</td><td>デザイン</td><td>2025/05/09 11:20</td><td>佐藤 花子</td><td><span class="pcStatus green">最新</span></td><td>⋮</td></tr>
  <tr><td>📗 タイムテーブル_v3.xlsx</td><td>運営資料</td><td>2025/05/08 16:45</td><td>鈴木 一郎</td><td><span class="pcStatus green">最新</span></td><td>⋮</td></tr>
  <tr><td>📗 協賛企業リスト.xlsx</td><td>協賛</td><td>2025/05/07 13:10</td><td>田中 美咲</td><td><span class="pcStatus green">最新</span></td><td>⋮</td></tr>
  <tr><td>📕 模擬店 募集要項.pdf</td><td>申請書</td><td>2025/05/06 10:22</td><td>高橋 健</td><td><span class="pcStatus green">最新</span></td><td>⋮</td></tr>
  <tr><td>🟧 広報用バナー.ai</td><td>デザイン</td><td>2025/05/05 18:30</td><td>伊藤 葵</td><td><span class="pcStatus yellow">更新あり</span></td><td>⋮</td></tr>
  <tr><td>📘 会場使用申請書.docx</td><td>申請書</td><td>2025/05/04 09:15</td><td>中村 涼</td><td><span class="pcStatus green">最新</span></td><td>⋮</td></tr>
  </tbody></table></section></div></div>`;
}
function renderEvents(sec){
  sec.innerHTML=`<div class="pcApprovedPage">${pageHead('イベント一覧','開催予定のイベントを管理できます。')}
  <div class="pcSplitLayout"><section class="pcRefPanel"><div class="pcTabs"><button class="active">開催予定</button><button>過去のイベント</button><button>カレンダー表示</button></div><table class="pcTable"><thead><tr><th>開催日</th><th>イベント名</th><th>会場</th><th>ステータス</th><th>参加予定</th><th></th></tr></thead><tbody>
  <tr><td>2025/05/17（土）</td><td>キックオフミーティング</td><td>1号館301教室</td><td><span class="pcStatus blue">打ち合わせ</span></td><td>25名</td><td>⋮</td></tr><tr><td>2025/05/24（土）</td><td>模擬店出店者説明会</td><td>大会議室</td><td><span class="pcStatus green">説明会</span></td><td>48名</td><td>⋮</td></tr><tr><td>2025/06/01（日）</td><td>前夜祭リハーサル</td><td>体育館</td><td><span class="pcStatus yellow">リハーサル</span></td><td>32名</td><td>⋮</td></tr><tr><td>2025/06/07（土）</td><td>TOMAフェス2025（本番）</td><td>大学グラウンド</td><td><span class="pcStatus red">本番</span></td><td>-</td><td>⋮</td></tr><tr><td>2025/06/15（日）</td><td>反省会</td><td>1号館301教室</td><td><span class="pcStatus gray">予定</span></td><td>-</td><td>⋮</td></tr></tbody></table></section>
  <section class="pcRefPanel"><div class="pcRefPanelHead"><h2>申請・申し込み</h2><button class="pcPrimaryBtn" data-go="permit">＋ 申請書を追加</button></div><div class="pcTabs"><button class="active">すべて</button><button>未提出</button><button>確認中</button><button>提出済み</button></div><table class="pcTable"><thead><tr><th>申請項目</th><th>提出期限</th><th>ステータス</th></tr></thead><tbody><tr><td>模擬店 出店申請</td><td>2025/05/10</td><td><span class="pcStatus green">提出済み</span></td></tr><tr><td>ステージ出演申請</td><td>2025/05/15</td><td><span class="pcStatus yellow">確認中</span></td></tr><tr><td>備品使用申請</td><td>2025/05/20</td><td><span class="pcStatus red">未提出</span></td></tr><tr><td>広報物 掲載申請</td><td>2025/05/20</td><td><span class="pcStatus green">提出済み</span></td></tr><tr><td>火気使用申請</td><td>2025/05/25</td><td><span class="pcStatus red">未提出</span></td></tr></tbody></table><div class="pcInfoBox"><b>ⓘ 申請に関するご案内</b><span>申請書は、各期限までに必ず提出してください。</span></div></section></div></div>`;bindGo(sec);
}
function renderPermit(sec){
  sec.innerHTML=`<div class="pcApprovedPage">${pageHead('申請・申し込み','各種申請書の提出状況を確認できます。','<button class="pcPrimaryBtn">＋ 申請書を追加</button>')}
  <section class="pcRefPanel"><div class="pcTabs"><button class="active">すべて</button><button>未提出</button><button>確認中</button><button>提出済み</button></div><table class="pcTable"><thead><tr><th>申請項目</th><th>提出期限</th><th>ステータス</th><th>担当</th></tr></thead><tbody><tr><td>模擬店 出店申請</td><td>2025/05/10</td><td><span class="pcStatus green">提出済み</span></td><td>山田 太郎</td></tr><tr><td>ステージ出演申請</td><td>2025/05/15</td><td><span class="pcStatus yellow">確認中</span></td><td>佐藤 花子</td></tr><tr><td>備品使用申請</td><td>2025/05/20</td><td><span class="pcStatus red">未提出</span></td><td>鈴木 一郎</td></tr><tr><td>広報物 掲載申請</td><td>2025/05/20</td><td><span class="pcStatus green">提出済み</span></td><td>田中 美咲</td></tr><tr><td>火気使用申請</td><td>2025/05/25</td><td><span class="pcStatus red">未提出</span></td><td>高橋 健</td></tr><tr><td>テント設営申請</td><td>2025/06/01</td><td><span class="pcStatus red">未提出</span></td><td>伊藤 葵</td></tr></tbody></table><div class="pcInfoBox"><b>ⓘ 申請に関するご案内</b><span>申請書は、各期限までに必ず提出してください。不明点がある場合は、運営本部までお問い合わせください。</span></div></section></div>`;
}
function renderBudget(sec){
  sec.classList.remove('budgetSheetHost');
  sec.innerHTML=`<div class="pcApprovedPage">${pageHead('予算管理','イベントの収入と支出を管理し、予算の進捗を確認できます。','<button class="pcPrimaryBtn">＋ 予算項目を追加</button>')}
  <div class="pcKpiGrid"><div class="pcKpi pcKpiGreen"><span class="pcKpiIcon">▣</span><b>収入予算</b><strong>¥12,000,000</strong></div><div class="pcKpi pcKpiRed"><span class="pcKpiIcon">▦</span><b>支出予算</b><strong>¥9,800,000</strong></div><div class="pcKpi pcKpiBlue"><span class="pcKpiIcon">⚖</span><b>予算収支</b><strong>¥2,200,000</strong><small>（収入予算 − 支出予算）</small></div><div class="pcKpi pcKpiPurple"><span class="pcKpiIcon">▥</span><b>実績収支</b><strong>¥1,685,000</strong><small>（実績収入 − 実績支出）</small></div></div>
  <div class="pcBudgetLayout"><section class="pcRefPanel"><div class="pcRefPanelHead"><h2>予算項目一覧</h2></div><table class="pcTable"><thead><tr><th>区分</th><th>項目名</th><th>予算額</th><th>実績額</th><th>差額</th><th>進捗率</th></tr></thead><tbody><tr><td><span class="pcStatus green">収入</span></td><td>チケット収入</td><td>¥5,000,000</td><td>¥4,620,000</td><td class="neg">-¥380,000</td><td>92%</td></tr><tr><td><span class="pcStatus green">収入</span></td><td>協賛金</td><td>¥2,000,000</td><td>¥2,310,000</td><td class="pos">+¥310,000</td><td>116%</td></tr><tr><td><span class="pcStatus green">収入</span></td><td>物販収入</td><td>¥1,000,000</td><td>¥965,000</td><td class="neg">-¥35,000</td><td>97%</td></tr><tr><td><span class="pcStatus red">支出</span></td><td>会場費</td><td>¥2,500,000</td><td>¥2,460,000</td><td class="pos">¥40,000</td><td>98%</td></tr><tr><td><span class="pcStatus red">支出</span></td><td>広報費</td><td>¥1,500,000</td><td>¥1,280,000</td><td class="pos">¥220,000</td><td>85%</td></tr><tr><td><span class="pcStatus red">支出</span></td><td>備品費</td><td>¥800,000</td><td>¥790,000</td><td class="pos">¥10,000</td><td>99%</td></tr></tbody></table></section><section class="pcRefPanel"><div class="pcRefPanelHead"><h2>予算の状況</h2></div><div class="pcDonut"><div><b>実績支出</b><strong>¥8,115,000</strong><small>（予算比 82%）</small></div></div><div class="pcLegend">■ 予算残　¥1,685,000　■ 実績支出　¥8,115,000</div><div class="pcInfoBox"><b>メモ</b><span>今月の広告費が想定より少なく収まっています。今後、ステージ設営費用の追加見込みを確認予定です。</span></div></section></div></div>`;
}
function renderSettings(sec){sec.innerHTML=`<div class="pcApprovedPage">${pageHead('設定','TOMA SHAREの表示・年度・ワークスペース設定を管理します。')}<section class="pcRefPanel"><div class="pcSettingRow"><div><b>表示モード</b><small>自動 / PC / モバイルを切り替えます</small></div><button class="pcOutlineBtn" onclick="document.getElementById('viewModeSelect')?.focus()">表示設定を開く</button></div><div class="pcSettingRow"><div><b>年度</b><small>現在のワークスペース年度を切り替えます</small></div><span>2026年</span></div><div class="pcSettingRow"><div><b>イベント</b><small>現在選択中のイベント</small></div><span>TOMAフェスティバル2025</span></div></section></div>`;}
function renderPage(id){
  if(!isDesktop()||!PC_PAGES.has(id))return;
  const sec=document.getElementById(id);if(!sec)return;
  if(sec.dataset.pcPage===id)return;
  if(id==='home')renderHome(sec);if(id==='drive')renderDrive(sec);if(id==='events')renderEvents(sec);if(id==='permit')renderPermit(sec);if(id==='budgetNative')renderBudget(sec);if(id==='more')renderSettings(sec);
  sec.dataset.pcPage=id;
}
function normalizeVisible(){
  if(!isDesktop())return;
  const visible=qsa('main>section').find(x=>!x.classList.contains('hidden'));
  if(!visible||visible.id==='login')return;
  if(PC_PAGES.has(visible.id)){renderPage(visible.id);syncActive(visible.id);return;}
  // PCでは旧サブ画面を直接見せず、対応する統一画面へ戻す
  if(['chat','cal','tasks','search','trash','activity','minute','review'].includes(visible.id))showSection('home');
}
function addHeaderStyle(){if(qs('#pcRefRuntimeStyle'))return;const s=document.createElement('style');s.id='pcRefRuntimeStyle';s.textContent='body.ui-desktop .pcEventSelect{height:32px;min-height:32px;width:auto;margin:0;padding:0 28px 0 10px;border-radius:5px;border:1px solid rgba(255,255,255,.10);background:#173f66;color:#fff;font-size:12px;font-weight:700}body.ui-mobile .pcEventSelect,body.ui-mobile .pcHeaderIcon{display:none!important}body.ui-desktop .pcHeaderIcon{width:30px;height:30px;border:0;background:transparent;color:#fff;font-size:16px;padding:0;cursor:pointer}body.ui-desktop .pcProfile{border:2px solid #fff;border-radius:50%;font-size:9px}';document.head.appendChild(s);}
function clearFlags(){if(isDesktop())return;qsa('main>section').forEach(s=>delete s.dataset.pcPage);}
function init(){enhanceHeader();addHeaderStyle();bindSidebar();normalizeVisible();syncActive();}
document.addEventListener('DOMContentLoaded',()=>setTimeout(init,100));
document.addEventListener('click',()=>setTimeout(normalizeVisible,40));
window.addEventListener('toma:viewmode',()=>setTimeout(()=>{clearFlags();init();},50));
let timer;const mo=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(normalizeVisible,70);});mo.observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['class']});
setTimeout(init,150);
})();
