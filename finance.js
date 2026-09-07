(()=>{
'use strict';

const STORAGE_PREFIX='tomaFinanceV1-';
const DEFAULT_ACCOUNTS=[
  {id:'sales',name:'売上',type:'income'},
  {id:'sponsor',name:'協賛金',type:'income'},
  {id:'fee',name:'参加費・出店料',type:'income'},
  {id:'other_income',name:'その他収入',type:'income'},
  {id:'venue',name:'会場費',type:'expense'},
  {id:'food',name:'飲食・材料費',type:'expense'},
  {id:'supplies',name:'消耗品費',type:'expense'},
  {id:'printing',name:'印刷・制作費',type:'expense'},
  {id:'advertising',name:'広告宣伝費',type:'expense'},
  {id:'rental',name:'レンタル・備品費',type:'expense'},
  {id:'transport',name:'交通・運搬費',type:'expense'},
  {id:'labor',name:'人件費',type:'expense'},
  {id:'insurance',name:'保険料',type:'expense'},
  {id:'fee_expense',name:'手数料',type:'expense'},
  {id:'other_expense',name:'その他経費',type:'expense'}
];

let activeTab='quick';
let editingId='';

const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const yen=value=>new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY',maximumFractionDigits:0}).format(Number(value)||0);
const today=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Tokyo'});

function currentYear(){
  const selected=Number($('workspaceYear')?.value||window.TOMA_SELECTED_YEAR||2026);
  return Number.isInteger(selected)?selected:2026;
}

function key(year=currentYear()){
  return STORAGE_PREFIX+year;
}

function emptyData(){
  return {
    accounts:DEFAULT_ACCOUNTS.map(x=>({...x})),
    budgets:{},
    transactions:[],
    openingBalance:0,
    eventName:'',
    updatedAt:null
  };
}

function loadData(year=currentYear()){
  try{
    const parsed=JSON.parse(localStorage.getItem(key(year))||'null');
    if(!parsed)return emptyData();
    return {
      ...emptyData(),
      ...parsed,
      accounts:Array.isArray(parsed.accounts)&&parsed.accounts.length?parsed.accounts:DEFAULT_ACCOUNTS.map(x=>({...x})),
      budgets:parsed.budgets||{},
      transactions:Array.isArray(parsed.transactions)?parsed.transactions:[]
    };
  }catch(e){
    return emptyData();
  }
}

function saveData(data,year=currentYear()){
  data.updatedAt=new Date().toISOString();
  localStorage.setItem(key(year),JSON.stringify(data));
}

function account(data,id){
  return data.accounts.find(x=>x.id===id)||{id,name:'未分類',type:'expense'};
}

function totals(data){
  const income=data.transactions.filter(x=>x.type==='income').reduce((s,x)=>s+Number(x.amount||0),0);
  const expense=data.transactions.filter(x=>x.type==='expense').reduce((s,x)=>s+Number(x.amount||0),0);
  const opening=Number(data.openingBalance||0);
  return {income,expense,opening,balance:opening+income-expense};
}

function budgetTotals(data){
  let income=0,expense=0;
  data.accounts.forEach(a=>{
    const value=Number(data.budgets[a.id]||0);
    if(a.type==='income')income+=value; else expense+=value;
  });
  return {income,expense,balance:Number(data.openingBalance||0)+income-expense};
}

function ensureStyle(){
  if($('tomaFinanceStyle'))return;
  const style=document.createElement('style');
  style.id='tomaFinanceStyle';
  style.textContent=`
    #finance{padding-bottom:96px}.finHead{display:flex;align-items:center;gap:10px;margin-bottom:12px}.finBack{border:0;background:#eef6fb;color:#125a83;border-radius:12px;padding:10px 13px;font-weight:900;font-size:15px}.finTitle{font-size:22px;font-weight:900;color:#17364d;flex:1}.finYear{font-size:13px;font-weight:800;color:#68889b}.finSummary{display:grid;grid-template-columns:repeat(2,1fr);gap:9px;margin-bottom:12px}.finStat{background:#fff;border-radius:16px;padding:14px;box-shadow:0 4px 18px rgba(26,72,98,.07)}.finStatLabel{font-size:12px;color:#6d8796;font-weight:800}.finStatValue{font-size:20px;font-weight:900;color:#17364d;margin-top:4px}.finStatValue.plus{color:#087944}.finStatValue.minus{color:#b42318}.finTabs{display:flex;gap:7px;overflow-x:auto;padding:2px 0 10px;scrollbar-width:none}.finTabs::-webkit-scrollbar{display:none}.finTab{border:0;border-radius:999px;background:#eaf3f8;color:#355f77;padding:9px 13px;white-space:nowrap;font-size:13px;font-weight:900}.finTab.on{background:#0b76d1;color:#fff}.finPanel{background:#fff;border-radius:16px;padding:15px;margin-bottom:12px;box-shadow:0 4px 18px rgba(26,72,98,.07)}.finPanelTitle{font-size:17px;font-weight:900;color:#17364d;margin-bottom:10px}.finGrid2{display:grid;grid-template-columns:1fr 1fr;gap:9px}.finField{margin-bottom:10px}.finField label{display:block;font-size:12px;color:#627f90;font-weight:800;margin-bottom:5px}.finField input,.finField select,.finField textarea{width:100%;box-sizing:border-box}.finBtn{border:0;border-radius:12px;background:#0b76d1;color:#fff;padding:12px 14px;font-size:15px;font-weight:900}.finBtn.light{background:#eaf3f8;color:#245b79}.finBtn.danger{background:#fff0f0;color:#a51d1d}.finBtn.wide{width:100%}.finActions{display:flex;gap:8px;flex-wrap:wrap}.finTableWrap{overflow:auto}.finTable{width:100%;border-collapse:collapse;min-width:620px}.finTable th,.finTable td{padding:10px 8px;border-bottom:1px solid #e6eef3;text-align:left;font-size:13px}.finTable th{font-size:12px;color:#627f90;background:#f7fbfd;position:sticky;top:0}.finTable td.num,.finTable th.num{text-align:right;white-space:nowrap}.finBadge{display:inline-block;border-radius:999px;padding:4px 8px;font-size:11px;font-weight:900}.finBadge.income{background:#e8fff2;color:#087944}.finBadge.expense{background:#fff0f0;color:#a51d1d}.finEmpty{text-align:center;color:#7892a1;padding:24px 8px}.finRowCard{border:1px solid #e4edf2;border-radius:13px;padding:12px;margin-bottom:8px}.finRowTop{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.finRowAmount{font-size:17px;font-weight:900;white-space:nowrap}.finMeta{font-size:12px;color:#728c9b;margin-top:4px}.finVariance.good{color:#087944;font-weight:900}.finVariance.bad{color:#b42318;font-weight:900}.finBatchRow{display:grid;grid-template-columns:120px 105px 1fr 130px 120px 42px;gap:6px;margin-bottom:6px}.finBatchRow input,.finBatchRow select{min-width:0}.finDeleteTiny{border:0;border-radius:9px;background:#fff0f0;color:#a51d1d;font-weight:900}.finNote{background:#f0f9ff;border-radius:12px;padding:10px;font-size:12px;color:#456c82;line-height:1.55;margin-bottom:10px}@media(max-width:680px){.finSummary{grid-template-columns:1fr 1fr}.finStatValue{font-size:17px}.finGrid2{grid-template-columns:1fr}.finBatchRow{grid-template-columns:1fr 1fr}.finBatchRow>*:nth-child(3),.finBatchRow>*:nth-child(4),.finBatchRow>*:nth-child(5){grid-column:span 2}.finBatchRow>*:last-child{grid-column:2;justify-self:end;width:42px;height:42px}.finTable{min-width:560px}}
  `;
  document.head.appendChild(style);
}

function ensureSection(){
  if($('finance'))return;
  const section=document.createElement('section');
  section.id='finance';
  section.className='hidden';
  document.querySelector('main')?.appendChild(section);
}

function injectCards(){
  const add=(container,label)=>{
    if(!container||container.querySelector('[data-finance-go]'))return;
    const grid=container.querySelector('.grid');
    if(!grid)return;
    const b=document.createElement('button');
    b.className='card';
    b.type='button';
    b.setAttribute('data-finance-go','1');
    b.innerHTML=`<div class="ico">💰</div><div class="ct">イベント収支管理</div><div class="meta">予算・売上・経費・決算</div>`;
    b.onclick=openFinance;
    grid.appendChild(b);
  };
  add($('home'),'home');
  add($('more'),'more');
}

function openFinance(){
  ensureSection();
  document.querySelectorAll('main>section').forEach(s=>s.classList.add('hidden'));
  $('finance').classList.remove('hidden');
  document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('on',n.dataset.p==='more'));
  renderFinance();
  window.scrollTo({top:0,behavior:'smooth'});
}

function closeFinance(){
  const home=document.querySelector('.nav[data-p="home"]');
  if(home)home.click();
  else location.reload();
}

function summaryHtml(data){
  const t=totals(data);
  return `<div class="finSummary">
    <div class="finStat"><div class="finStatLabel">売上・収入</div><div class="finStatValue plus">${yen(t.income)}</div></div>
    <div class="finStat"><div class="finStatLabel">経費</div><div class="finStatValue minus">${yen(t.expense)}</div></div>
    <div class="finStat"><div class="finStatLabel">繰越・開始残高</div><div class="finStatValue">${yen(t.opening)}</div></div>
    <div class="finStat"><div class="finStatLabel">現在残高</div><div class="finStatValue ${t.balance<0?'minus':'plus'}">${yen(t.balance)}</div></div>
  </div>`;
}

const tabs=[
  ['quick','かんたん入力'],['batch','連続入力'],['transactions','取引一覧'],['budget','予算書'],['sales','売上集計'],['expenses','経費集計'],['variance','予実管理'],['closing','決算書'],['accounts','勘定科目']
];

function renderFinance(){
  ensureStyle();
  ensureSection();
  const data=loadData();
  const el=$('finance');
  el.innerHTML=`
    <div class="finHead"><button class="finBack" id="finBack" type="button">← 戻る</button><div class="finTitle">💰 イベント収支管理</div><div class="finYear">${currentYear()}年</div></div>
    ${summaryHtml(data)}
    <div class="finTabs">${tabs.map(([id,label])=>`<button type="button" class="finTab ${activeTab===id?'on':''}" data-fin-tab="${id}">${label}</button>`).join('')}</div>
    <div id="finBody"></div>`;
  $('finBack').onclick=closeFinance;
  el.querySelectorAll('[data-fin-tab]').forEach(b=>b.onclick=()=>{activeTab=b.dataset.finTab;editingId='';renderFinance();});
  renderTab(data);
}

function accountOptions(data,type,value=''){
  return data.accounts.filter(a=>!type||a.type===type).map(a=>`<option value="${esc(a.id)}" ${a.id===value?'selected':''}>${esc(a.name)}</option>`).join('');
}

function renderTab(data){
  const body=$('finBody');
  if(!body)return;
  if(activeTab==='quick')return renderQuick(body,data);
  if(activeTab==='batch')return renderBatch(body,data);
  if(activeTab==='transactions')return renderTransactions(body,data);
  if(activeTab==='budget')return renderBudget(body,data);
  if(activeTab==='sales')return renderAggregate(body,data,'income');
  if(activeTab==='expenses')return renderAggregate(body,data,'expense');
  if(activeTab==='variance')return renderVariance(body,data);
  if(activeTab==='closing')return renderClosing(body,data);
  if(activeTab==='accounts')return renderAccounts(body,data);
}

function renderQuick(body,data){
  const editing=editingId?data.transactions.find(x=>x.id===editingId):null;
  const type=editing?.type||'expense';
  body.innerHTML=`<div class="finPanel"><div class="finPanelTitle">${editing?'取引を修正':'1件ずつ入力'}</div>
    <div class="finGrid2">
      <div class="finField"><label>日付</label><input id="finDate" type="date" value="${esc(editing?.date||today())}"></div>
      <div class="finField"><label>区分</label><select id="finType"><option value="income" ${type==='income'?'selected':''}>売上・収入</option><option value="expense" ${type==='expense'?'selected':''}>経費・支出</option></select></div>
      <div class="finField"><label>勘定科目</label><select id="finAccount">${accountOptions(data,type,editing?.accountId||'')}</select></div>
      <div class="finField"><label>金額</label><input id="finAmount" type="number" inputmode="numeric" min="0" step="1" value="${esc(editing?.amount||'')}" placeholder="0"></div>
      <div class="finField"><label>内容</label><input id="finDescription" value="${esc(editing?.description||'')}" placeholder="例：金券売上、会場レンタル"></div>
      <div class="finField"><label>支払・入金方法</label><select id="finPayment"><option ${editing?.payment==='現金'?'selected':''}>現金</option><option ${editing?.payment==='振込'?'selected':''}>振込</option><option ${editing?.payment==='カード'?'selected':''}>カード</option><option ${editing?.payment==='電子決済'?'selected':''}>電子決済</option><option ${editing?.payment==='その他'?'selected':''}>その他</option></select></div>
    </div>
    <div class="finField"><label>メモ</label><textarea id="finMemo" rows="2" placeholder="任意">${esc(editing?.memo||'')}</textarea></div>
    <div class="finActions"><button class="finBtn" id="finSave" type="button">${editing?'修正を保存':'保存して取引一覧へ反映'}</button>${editing?'<button class="finBtn light" id="finCancelEdit" type="button">キャンセル</button>':''}</div>
  </div>`;
  const refreshAccount=()=>{$('finAccount').innerHTML=accountOptions(data,$('finType').value,editing?.accountId||'');};
  $('finType').onchange=refreshAccount;
  if($('finCancelEdit'))$('finCancelEdit').onclick=()=>{editingId='';renderFinance();};
  $('finSave').onclick=()=>{
    const amount=Number($('finAmount').value);
    const description=$('finDescription').value.trim();
    if(!amount||amount<0)return alert('金額を入力してください');
    if(!description)return alert('内容を入力してください');
    const item={
      id:editing?.id||`tx-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      date:$('finDate').value||today(),type:$('finType').value,accountId:$('finAccount').value,
      amount,description,payment:$('finPayment').value,memo:$('finMemo').value.trim(),updatedAt:new Date().toISOString()
    };
    if(editing){data.transactions=data.transactions.map(x=>x.id===editing.id?item:x);}else data.transactions.push(item);
    saveData(data);editingId='';activeTab='transactions';renderFinance();
  };
}

function batchRow(data,index){
  return `<div class="finBatchRow" data-batch-row="${index}">
    <input type="date" data-f="date" value="${today()}">
    <select data-f="type"><option value="expense">経費</option><option value="income">収入</option></select>
    <input data-f="description" placeholder="内容">
    <select data-f="accountId">${accountOptions(data,'expense')}</select>
    <input data-f="amount" type="number" inputmode="numeric" min="0" placeholder="金額">
    <button type="button" class="finDeleteTiny" data-batch-del>×</button>
  </div>`;
}

function renderBatch(body,data){
  body.innerHTML=`<div class="finPanel"><div class="finPanelTitle">何件もまとめて入力</div><div class="finNote">入力した行を最後にまとめて保存します。空の行は無視されます。</div><div id="finBatchRows"></div><div class="finActions"><button class="finBtn light" id="finAddBatch" type="button">＋ 行を追加</button><button class="finBtn" id="finSaveBatch" type="button">まとめて保存</button></div></div>`;
  const rows=$('finBatchRows');
  for(let i=0;i<5;i++)rows.insertAdjacentHTML('beforeend',batchRow(data,i));
  const bind=()=>{
    rows.querySelectorAll('[data-batch-row]').forEach(row=>{
      const type=row.querySelector('[data-f="type"]');
      const acc=row.querySelector('[data-f="accountId"]');
      type.onchange=()=>{acc.innerHTML=accountOptions(data,type.value);};
      row.querySelector('[data-batch-del]').onclick=()=>row.remove();
    });
  };
  bind();
  $('finAddBatch').onclick=()=>{rows.insertAdjacentHTML('beforeend',batchRow(data,Date.now()));bind();};
  $('finSaveBatch').onclick=()=>{
    const items=[...rows.querySelectorAll('[data-batch-row]')].map(row=>{
      const get=f=>row.querySelector(`[data-f="${f}"]`)?.value||'';
      return {date:get('date')||today(),type:get('type'),description:get('description').trim(),accountId:get('accountId'),amount:Number(get('amount'))};
    }).filter(x=>x.description&&x.amount>0);
    if(!items.length)return alert('保存できる入力がありません');
    data.transactions.push(...items.map(x=>({...x,id:`tx-${Date.now()}-${Math.random().toString(16).slice(2)}`,payment:'現金',memo:'',updatedAt:new Date().toISOString()})));
    saveData(data);activeTab='transactions';renderFinance();
  };
}

function sortedTransactions(data,filter='all'){
  return data.transactions.filter(x=>filter==='all'||x.type===filter).sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
}

function renderTransactions(body,data){
  const rows=sortedTransactions(data);
  body.innerHTML=`<div class="finPanel"><div class="finPanelTitle">取引一覧</div>
    <div class="finActions" style="margin-bottom:10px"><button class="finBtn light" id="finExportCsv" type="button">CSV出力</button><button class="finBtn light" id="finAddNew" type="button">＋ 新規入力</button></div>
    ${rows.length?rows.map(x=>`<div class="finRowCard"><div class="finRowTop"><div><span class="finBadge ${x.type}">${x.type==='income'?'収入':'経費'}</span> <strong>${esc(x.description)}</strong><div class="finMeta">${esc(x.date)}｜${esc(account(data,x.accountId).name)}｜${esc(x.payment||'')}</div>${x.memo?`<div class="finMeta">${esc(x.memo)}</div>`:''}</div><div class="finRowAmount ${x.type==='income'?'finVariance good':'finVariance bad'}">${x.type==='income'?'+':'-'}${yen(x.amount)}</div></div><div class="finActions" style="margin-top:9px"><button class="finBtn light" data-edit-tx="${esc(x.id)}" type="button">修正</button><button class="finBtn danger" data-del-tx="${esc(x.id)}" type="button">削除</button></div></div>`).join(''):'<div class="finEmpty">まだ取引がありません</div>'}
  </div>`;
  $('finAddNew').onclick=()=>{activeTab='quick';renderFinance();};
  body.querySelectorAll('[data-edit-tx]').forEach(b=>b.onclick=()=>{editingId=b.dataset.editTx;activeTab='quick';renderFinance();});
  body.querySelectorAll('[data-del-tx]').forEach(b=>b.onclick=()=>{if(!confirm('この取引を削除しますか？'))return;data.transactions=data.transactions.filter(x=>x.id!==b.dataset.delTx);saveData(data);renderFinance();});
  $('finExportCsv').onclick=()=>exportCsv(data);
}

function exportCsv(data){
  const head=['日付','区分','勘定科目','内容','金額','方法','メモ'];
  const q=v=>`"${String(v??'').replace(/"/g,'""')}"`;
  const lines=[head,...sortedTransactions(data).map(x=>[x.date,x.type==='income'?'収入':'経費',account(data,x.accountId).name,x.description,x.amount,x.payment,x.memo])];
  const blob=new Blob(['\ufeff'+lines.map(r=>r.map(q).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`TOMA_SHARE_収支_${currentYear()}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

function renderBudget(body,data){
  const bt=budgetTotals(data);
  body.innerHTML=`<div class="finPanel"><div class="finPanelTitle">${currentYear()}年 予算書</div>
    <div class="finField"><label>イベント名・事業名</label><input id="finEventName" value="${esc(data.eventName||'')}" placeholder="例：第4回とまこまい氷夏フェス"></div>
    <div class="finField"><label>繰越・開始残高</label><input id="finOpening" type="number" value="${esc(data.openingBalance||0)}"></div>
    <div class="finTableWrap"><table class="finTable"><thead><tr><th>区分</th><th>勘定科目</th><th class="num">予算額</th></tr></thead><tbody>${data.accounts.map(a=>`<tr><td><span class="finBadge ${a.type}">${a.type==='income'?'収入':'経費'}</span></td><td>${esc(a.name)}</td><td class="num"><input type="number" inputmode="numeric" min="0" data-budget="${esc(a.id)}" value="${esc(data.budgets[a.id]||'')}" style="max-width:160px;text-align:right"></td></tr>`).join('')}</tbody></table></div>
    <div class="finSummary" style="margin-top:12px"><div class="finStat"><div class="finStatLabel">収入予算</div><div class="finStatValue plus">${yen(bt.income)}</div></div><div class="finStat"><div class="finStatLabel">経費予算</div><div class="finStatValue minus">${yen(bt.expense)}</div></div></div>
    <div class="finActions"><button class="finBtn" id="finSaveBudget" type="button">予算を保存</button><button class="finBtn light" id="finCarryPrev" type="button">前年決算残高を繰越</button></div></div>`;
  $('finSaveBudget').onclick=()=>{data.eventName=$('finEventName').value.trim();data.openingBalance=Number($('finOpening').value||0);body.querySelectorAll('[data-budget]').forEach(i=>data.budgets[i.dataset.budget]=Number(i.value||0));saveData(data);renderFinance();};
  $('finCarryPrev').onclick=()=>{
    const prev=loadData(currentYear()-1);const pt=totals(prev);data.openingBalance=pt.balance;saveData(data);renderFinance();
  };
}

function renderAggregate(body,data,type){
  const groups=data.accounts.filter(a=>a.type===type).map(a=>{
    const total=data.transactions.filter(x=>x.type===type&&x.accountId===a.id).reduce((s,x)=>s+Number(x.amount||0),0);
    return {...a,total};
  }).filter(x=>x.total||Number(data.budgets[x.id]||0));
  const total=groups.reduce((s,x)=>s+x.total,0);
  body.innerHTML=`<div class="finPanel"><div class="finPanelTitle">${type==='income'?'売上・収入集計':'経費集計'}</div><div class="finStat" style="margin-bottom:12px"><div class="finStatLabel">合計</div><div class="finStatValue ${type==='income'?'plus':'minus'}">${yen(total)}</div></div><div class="finTableWrap"><table class="finTable"><thead><tr><th>勘定科目</th><th class="num">件数</th><th class="num">合計</th></tr></thead><tbody>${groups.map(g=>`<tr><td>${esc(g.name)}</td><td class="num">${data.transactions.filter(x=>x.type===type&&x.accountId===g.id).length}</td><td class="num">${yen(g.total)}</td></tr>`).join('')||'<tr><td colspan="3">まだデータがありません</td></tr>'}</tbody></table></div></div>`;
}

function renderVariance(body,data){
  body.innerHTML=`<div class="finPanel"><div class="finPanelTitle">予算と実績の比較</div><div class="finTableWrap"><table class="finTable"><thead><tr><th>区分</th><th>勘定科目</th><th class="num">予算</th><th class="num">実績</th><th class="num">差額</th></tr></thead><tbody>${data.accounts.map(a=>{
    const budget=Number(data.budgets[a.id]||0);const actual=data.transactions.filter(x=>x.type===a.type&&x.accountId===a.id).reduce((s,x)=>s+Number(x.amount||0),0);const diff=a.type==='expense'?budget-actual:actual-budget;return `<tr><td><span class="finBadge ${a.type}">${a.type==='income'?'収入':'経費'}</span></td><td>${esc(a.name)}</td><td class="num">${yen(budget)}</td><td class="num">${yen(actual)}</td><td class="num finVariance ${diff<0?'bad':'good'}">${diff>=0?'+':''}${yen(diff)}</td></tr>`;}).join('')}</tbody></table></div><div class="finNote" style="margin-top:10px">経費は「予算 − 実績」で残予算を表示。収入は「実績 − 予算」で達成差額を表示します。</div></div>`;
}

function renderClosing(body,data){
  const t=totals(data),bt=budgetTotals(data);
  body.innerHTML=`<div class="finPanel"><div class="finPanelTitle">${currentYear()}年 決算書</div><div class="finNote">${data.eventName?`対象：${esc(data.eventName)}`:'予算書でイベント名を登録できます。'}</div>
    <div class="finTableWrap"><table class="finTable"><tbody><tr><th>繰越・開始残高</th><td class="num">${yen(t.opening)}</td></tr><tr><th>収入合計</th><td class="num finVariance good">${yen(t.income)}</td></tr><tr><th>経費合計</th><td class="num finVariance bad">${yen(t.expense)}</td></tr><tr><th>最終残高</th><td class="num"><strong>${yen(t.balance)}</strong></td></tr><tr><th>予算上の予定残高</th><td class="num">${yen(bt.balance)}</td></tr><tr><th>予算比</th><td class="num ${t.balance-bt.balance<0?'finVariance bad':'finVariance good'}">${yen(t.balance-bt.balance)}</td></tr></tbody></table></div>
    <div class="finActions" style="margin-top:12px"><button class="finBtn light" id="finCloseCsv" type="button">取引CSVを出力</button><button class="finBtn" id="finNextCarry" type="button">${currentYear()+1}年へ残高を繰越</button></div></div>`;
  $('finCloseCsv').onclick=()=>exportCsv(data);
  $('finNextCarry').onclick=()=>{const nextYear=currentYear()+1;const next=loadData(nextYear);next.openingBalance=t.balance;saveData(next,nextYear);alert(`${nextYear}年の開始残高へ ${yen(t.balance)} を繰り越しました`);};
}

function renderAccounts(body,data){
  body.innerHTML=`<div class="finPanel"><div class="finPanelTitle">勘定科目</div><div class="finNote">必要な科目を追加できます。使用中の科目を削除すると過去取引が未分類になるため、使用中の科目は削除できません。</div><div id="finAccountList">${data.accounts.map(a=>`<div class="finRowCard"><div class="finRowTop"><div><span class="finBadge ${a.type}">${a.type==='income'?'収入':'経費'}</span> <strong>${esc(a.name)}</strong></div><button class="finBtn danger" data-del-account="${esc(a.id)}" type="button">削除</button></div></div>`).join('')}</div></div>
    <div class="finPanel"><div class="finPanelTitle">＋ 科目を追加</div><div class="finGrid2"><div class="finField"><label>区分</label><select id="finNewAccountType"><option value="expense">経費</option><option value="income">収入</option></select></div><div class="finField"><label>科目名</label><input id="finNewAccountName" placeholder="例：警備費"></div></div><button class="finBtn" id="finAddAccount" type="button">追加</button></div>`;
  body.querySelectorAll('[data-del-account]').forEach(b=>b.onclick=()=>{const id=b.dataset.delAccount;if(data.transactions.some(x=>x.accountId===id))return alert('この科目は取引で使用中のため削除できません');data.accounts=data.accounts.filter(x=>x.id!==id);delete data.budgets[id];saveData(data);renderFinance();});
  $('finAddAccount').onclick=()=>{const name=$('finNewAccountName').value.trim();if(!name)return alert('科目名を入力してください');data.accounts.push({id:`acc-${Date.now()}`,name,type:$('finNewAccountType').value});saveData(data);renderFinance();};
}

function watch(){
  ensureStyle();ensureSection();injectCards();
  const observer=new MutationObserver(()=>injectCards());
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('toma-year-change',()=>{if(!$('finance')?.classList.contains('hidden'))renderFinance();});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch);else watch();
})();