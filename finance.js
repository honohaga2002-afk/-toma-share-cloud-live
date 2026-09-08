(()=>{
'use strict';

const $=id=>document.getElementById(id);
const PREFIX='tomaBudgetNativeV2-';
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
  {id:'other_expense',name:'その他経費',type:'expense'}
];
let tab='dashboard';

function year(){return Number($('workspaceYear')?.value||window.TOMA_SELECTED_YEAR||2026)||2026;}
function key(y=year()){return PREFIX+y;}
function fresh(){return {opening:0,eventName:'',budgets:{},accounts:DEFAULT_ACCOUNTS.map(x=>({...x})),transactions:[]};}
function load(y=year()){
  try{
    const d=JSON.parse(localStorage.getItem(key(y))||'null');
    return d?{...fresh(),...d,accounts:Array.isArray(d.accounts)&&d.accounts.length?d.accounts:DEFAULT_ACCOUNTS.map(x=>({...x})),transactions:Array.isArray(d.transactions)?d.transactions:[]}:fresh();
  }catch(e){return fresh();}
}
function save(d,y=year()){localStorage.setItem(key(y),JSON.stringify(d));}
function yen(v){return new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY',maximumFractionDigits:0}).format(Number(v)||0);}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function today(){return new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Tokyo'});}
function totals(d){
  const income=d.transactions.filter(x=>x.type==='income').reduce((s,x)=>s+Number(x.amount||0),0);
  const expense=d.transactions.filter(x=>x.type==='expense').reduce((s,x)=>s+Number(x.amount||0),0);
  return {income,expense,balance:Number(d.opening||0)+income-expense};
}
function account(d,id){return d.accounts.find(x=>x.id===id)||{name:'未分類',type:'expense'};}

function style(){
  if($('tomaBudgetStyle'))return;
  const s=document.createElement('style');s.id='tomaBudgetStyle';s.textContent=`
  #budgetNative{padding-bottom:100px}.tbHead{display:flex;gap:10px;align-items:center;margin:6px 0 12px}.tbBack{border:0;background:#eaf3f8;color:#245b79;border-radius:12px;padding:10px 13px;font-weight:900}.tbTitle{font-size:22px;font-weight:900;color:#17364d;flex:1}.tbYear{font-size:13px;color:#68889b;font-weight:800}.tbSummary{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:12px}.tbStat{background:#fff;border-radius:16px;padding:14px;box-shadow:0 4px 18px rgba(26,72,98,.07)}.tbLabel{font-size:12px;color:#6d8796;font-weight:800}.tbValue{font-size:20px;font-weight:900;color:#17364d;margin-top:4px}.tbTabs{display:flex;gap:7px;overflow-x:auto;padding:2px 0 10px}.tbTab{border:0;border-radius:999px;background:#eaf3f8;color:#355f77;padding:9px 13px;white-space:nowrap;font-weight:900}.tbTab.on{background:#0b76d1;color:#fff}.tbPanel{background:#fff;border-radius:16px;padding:15px;margin-bottom:12px;box-shadow:0 4px 18px rgba(26,72,98,.07)}.tbPanel h3{margin:0 0 12px;color:#17364d}.tbGrid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.tbField{margin-bottom:10px}.tbField label{display:block;font-size:12px;color:#627f90;font-weight:800;margin-bottom:5px}.tbField input,.tbField select,.tbField textarea{width:100%;box-sizing:border-box}.tbBtn{border:0;border-radius:12px;background:#0b76d1;color:#fff;padding:12px 14px;font-weight:900}.tbBtn.light{background:#eaf3f8;color:#245b79}.tbBtn.danger{background:#fff0f0;color:#a51d1d}.tbTableWrap{overflow:auto}.tbTable{width:100%;border-collapse:collapse;min-width:620px}.tbTable th,.tbTable td{padding:10px 8px;border-bottom:1px solid #e6eef3;text-align:left;font-size:13px}.tbTable th{background:#f7fbfd;color:#627f90}.num{text-align:right!important;white-space:nowrap}.tbBadge{display:inline-block;padding:4px 8px;border-radius:999px;font-size:11px;font-weight:900;background:#eef6fb}.tbRow{display:flex;gap:8px;align-items:center;margin-bottom:8px}.tbRow>*{flex:1}.tbTiny{flex:0 0 auto!important}.tbNote{background:#f0f9ff;border-radius:12px;padding:10px;font-size:12px;color:#456c82;line-height:1.5}.tbCardBtn{cursor:pointer}@media(max-width:680px){.tbGrid2{grid-template-columns:1fr}.tbValue{font-size:17px}.tbTable{min-width:560px}}
  `;document.head.appendChild(s);
}
function ensureSection(){
  let s=$('budgetNative');
  if(!s){s=document.createElement('section');s.id='budgetNative';s.className='hidden';document.querySelector('main')?.appendChild(s);}return s;
}
function makeCard(){
  const b=document.createElement('button');b.className='card tbCardBtn';b.type='button';b.setAttribute('data-budget-native','1');
  b.innerHTML='<div class="ico">💰</div><div class="ct">予算管理</div><div class="meta">予算書・収支・年度管理</div>';
  b.addEventListener('click',openBudget);return b;
}
function inject(container){
  const grid=container?.querySelector('.grid');if(!grid)return;
  if(grid.querySelector('[data-budget-native]'))return;
  const old=grid.querySelector('[data-finance-go],[data-budget-go]')||[...grid.querySelectorAll('button.card')].find(x=>/イベント収支管理|予算管理/.test(x.textContent||''));
  if(old)old.replaceWith(makeCard());else grid.appendChild(makeCard());
}
function injectAll(){inject($('home'));inject($('more'));}
function openBudget(){
  style();ensureSection();document.querySelectorAll('main>section').forEach(x=>x.classList.add('hidden'));$('budgetNative').classList.remove('hidden');
  document.querySelectorAll('.nav').forEach(n=>n.classList.remove('on'));render();window.scrollTo({top:0,behavior:'smooth'});
}
function closeBudget(){const h=document.querySelector('.nav[data-p="home"]');if(h)h.click();else location.reload();}

function summary(d){const t=totals(d);return `<div class="tbSummary"><div class="tbStat"><div class="tbLabel">収入</div><div class="tbValue">${yen(t.income)}</div></div><div class="tbStat"><div class="tbLabel">支出</div><div class="tbValue">${yen(t.expense)}</div></div><div class="tbStat"><div class="tbLabel">繰越・開始残高</div><div class="tbValue">${yen(d.opening)}</div></div><div class="tbStat"><div class="tbLabel">現在残高</div><div class="tbValue">${yen(t.balance)}</div></div></div>`;}
const tabs=[['dashboard','概要'],['quick','かんたん入力'],['transactions','取引一覧'],['budget','予算書'],['accounts','勘定科目'],['carry','年度繰越']];
function render(){
  const d=load();const s=ensureSection();s.innerHTML=`<div class="tbHead"><button id="tbBack" class="tbBack">← 戻る</button><div class="tbTitle">💰 予算管理</div><div class="tbYear">${year()}年</div></div>${summary(d)}<div class="tbTabs">${tabs.map(([id,l])=>`<button class="tbTab ${tab===id?'on':''}" data-tbtab="${id}">${l}</button>`).join('')}</div><div id="tbBody"></div>`;
  $('tbBack').onclick=closeBudget;s.querySelectorAll('[data-tbtab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tbtab;render();});renderTab(d);
}
function opts(d,type,val=''){return d.accounts.filter(a=>!type||a.type===type).map(a=>`<option value="${esc(a.id)}" ${a.id===val?'selected':''}>${esc(a.name)}</option>`).join('');}
function renderTab(d){const b=$('tbBody');if(tab==='dashboard')dashboard(b,d);else if(tab==='quick')quick(b,d);else if(tab==='transactions')transactions(b,d);else if(tab==='budget')budget(b,d);else if(tab==='accounts')accounts(b,d);else carry(b,d);}
function dashboard(b,d){
  const t=totals(d);const budIncome=d.accounts.filter(a=>a.type==='income').reduce((s,a)=>s+Number(d.budgets[a.id]||0),0);const budExpense=d.accounts.filter(a=>a.type==='expense').reduce((s,a)=>s+Number(d.budgets[a.id]||0),0);
  b.innerHTML=`<div class="tbPanel"><h3>年度概要</h3><div class="tbGrid2"><div class="tbField"><label>イベント・事業名</label><input id="tbEventName" value="${esc(d.eventName)}" placeholder="例：氷夏フェス"></div><div class="tbField"><label>開始残高</label><input id="tbOpening" type="number" value="${Number(d.opening||0)}"></div></div><button id="tbOverviewSave" class="tbBtn">保存</button></div><div class="tbPanel"><h3>予算と実績</h3><div class="tbTableWrap"><table class="tbTable"><tr><th></th><th class="num">予算</th><th class="num">実績</th><th class="num">差額</th></tr><tr><td>収入</td><td class="num">${yen(budIncome)}</td><td class="num">${yen(t.income)}</td><td class="num">${yen(t.income-budIncome)}</td></tr><tr><td>支出</td><td class="num">${yen(budExpense)}</td><td class="num">${yen(t.expense)}</td><td class="num">${yen(budExpense-t.expense)}</td></tr></table></div></div>`;
  $('tbOverviewSave').onclick=()=>{d.eventName=$('tbEventName').value.trim();d.opening=Number($('tbOpening').value||0);save(d);render();};
}
function quick(b,d){
  b.innerHTML=`<div class="tbPanel"><h3>1件ずつ入力</h3><div class="tbGrid2"><div class="tbField"><label>日付</label><input id="tbDate" type="date" value="${today()}"></div><div class="tbField"><label>区分</label><select id="tbType"><option value="expense">支出</option><option value="income">収入</option></select></div><div class="tbField"><label>勘定科目</label><select id="tbAccount">${opts(d,'expense')}</select></div><div class="tbField"><label>金額</label><input id="tbAmount" type="number" inputmode="numeric" placeholder="0"></div><div class="tbField"><label>内容</label><input id="tbDesc" placeholder="例：会場レンタル"></div><div class="tbField"><label>支払・入金方法</label><select id="tbPay"><option>現金</option><option>振込</option><option>カード</option><option>電子決済</option><option>その他</option></select></div></div><div class="tbField"><label>メモ</label><textarea id="tbMemo" rows="2"></textarea></div><button id="tbAdd" class="tbBtn">保存して反映</button></div>`;
  $('tbType').onchange=()=>{$('tbAccount').innerHTML=opts(d,$('tbType').value);};
  $('tbAdd').onclick=()=>{const amount=Number($('tbAmount').value||0);if(!amount){alert('金額を入力してください');return;}d.transactions.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2),date:$('tbDate').value,type:$('tbType').value,accountId:$('tbAccount').value,amount,description:$('tbDesc').value.trim(),payment:$('tbPay').value,memo:$('tbMemo').value.trim()});save(d);tab='transactions';render();};
}
function transactions(b,d){
  const rows=[...d.transactions].sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  b.innerHTML=`<div class="tbPanel"><h3>取引一覧</h3>${rows.length?`<div class="tbTableWrap"><table class="tbTable"><tr><th>日付</th><th>区分</th><th>科目</th><th>内容</th><th>方法</th><th class="num">金額</th><th></th></tr>${rows.map(x=>`<tr><td>${esc(x.date)}</td><td><span class="tbBadge">${x.type==='income'?'収入':'支出'}</span></td><td>${esc(account(d,x.accountId).name)}</td><td>${esc(x.description||'')}</td><td>${esc(x.payment||'')}</td><td class="num">${yen(x.amount)}</td><td><button class="tbBtn danger" data-del="${esc(x.id)}">削除</button></td></tr>`).join('')}</table></div>`:'<div class="tbNote">まだ取引はありません。</div>'}</div>`;
  b.querySelectorAll('[data-del]').forEach(btn=>btn.onclick=()=>{if(!confirm('この取引を削除しますか？'))return;d.transactions=d.transactions.filter(x=>x.id!==btn.dataset.del);save(d);render();});
}
function budget(b,d){
  b.innerHTML=`<div class="tbPanel"><h3>予算書</h3><div class="tbNote">勘定科目ごとに年度予算を入力します。</div><div class="tbTableWrap"><table class="tbTable"><tr><th>区分</th><th>勘定科目</th><th class="num">予算額</th><th class="num">実績</th><th class="num">残額</th></tr>${d.accounts.map(a=>{const actual=d.transactions.filter(x=>x.accountId===a.id).reduce((s,x)=>s+Number(x.amount||0),0);const bud=Number(d.budgets[a.id]||0);return `<tr><td>${a.type==='income'?'収入':'支出'}</td><td>${esc(a.name)}</td><td class="num"><input style="max-width:130px;text-align:right" type="number" data-budget="${esc(a.id)}" value="${bud}"></td><td class="num">${yen(actual)}</td><td class="num">${yen(a.type==='expense'?bud-actual:actual-bud)}</td></tr>`;}).join('')}</table></div><button id="tbBudgetSave" class="tbBtn" style="margin-top:12px">予算を保存</button></div>`;
  $('tbBudgetSave').onclick=()=>{b.querySelectorAll('[data-budget]').forEach(i=>d.budgets[i.dataset.budget]=Number(i.value||0));save(d);render();};
}
function accounts(b,d){
  b.innerHTML=`<div class="tbPanel"><h3>勘定科目</h3>${d.accounts.map(a=>`<div class="tbRow"><input data-aname="${esc(a.id)}" value="${esc(a.name)}"><select data-atype="${esc(a.id)}"><option value="income" ${a.type==='income'?'selected':''}>収入</option><option value="expense" ${a.type==='expense'?'selected':''}>支出</option></select><button class="tbBtn danger tbTiny" data-adel="${esc(a.id)}">削除</button></div>`).join('')}<div class="tbRow"><input id="tbNewAccount" placeholder="新しい科目名"><select id="tbNewType"><option value="expense">支出</option><option value="income">収入</option></select><button id="tbNewAdd" class="tbBtn tbTiny">追加</button></div><button id="tbAccSave" class="tbBtn">変更を保存</button></div>`;
  $('tbAccSave').onclick=()=>{d.accounts.forEach(a=>{a.name=b.querySelector(`[data-aname="${CSS.escape(a.id)}"]`)?.value.trim()||a.name;a.type=b.querySelector(`[data-atype="${CSS.escape(a.id)}"]`)?.value||a.type;});save(d);render();};
  $('tbNewAdd').onclick=()=>{const name=$('tbNewAccount').value.trim();if(!name)return;d.accounts.push({id:'a_'+Date.now().toString(36),name,type:$('tbNewType').value});save(d);render();};
  b.querySelectorAll('[data-adel]').forEach(x=>x.onclick=()=>{const id=x.dataset.adel;if(d.transactions.some(t=>t.accountId===id)){alert('取引で使用中の科目は削除できません');return;}d.accounts=d.accounts.filter(a=>a.id!==id);delete d.budgets[id];save(d);render();});
}
function carry(b,d){
  const prev=load(year()-1);const pt=totals(prev);
  b.innerHTML=`<div class="tbPanel"><h3>年度繰越</h3><div class="tbNote">前年の最終残高を今年の開始残高へ引き継げます。</div><div class="tbTableWrap"><table class="tbTable"><tr><th>前年</th><th class="num">前年最終残高</th><th class="num">今年開始残高</th></tr><tr><td>${year()-1}年</td><td class="num">${yen(pt.balance)}</td><td class="num">${yen(d.opening)}</td></tr></table></div><button id="tbCarry" class="tbBtn" style="margin-top:12px">前年残高を繰り越す</button></div>`;
  $('tbCarry').onclick=()=>{if(!confirm(`${yen(pt.balance)} を ${year()}年の開始残高に設定しますか？`))return;d.opening=pt.balance;save(d);render();};
}

document.addEventListener('toma-year-change',()=>{if(!$('budgetNative')?.classList.contains('hidden'))render();});
document.addEventListener('DOMContentLoaded',()=>{style();ensureSection();injectAll();});
style();ensureSection();injectAll();
let tries=0;const timer=setInterval(()=>{tries++;injectAll();if(tries>40)clearInterval(timer);},500);
})();