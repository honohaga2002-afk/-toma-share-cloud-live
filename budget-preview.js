(()=>{
'use strict';

const BUDGET_URL='https://toma-budget-preview.hagajyo.chatgpt.site/?utm_source=chatgpt.com';
const $=id=>document.getElementById(id);

function ensureStyle(){
  if($('tomaBudgetPreviewStyle'))return;
  const style=document.createElement('style');
  style.id='tomaBudgetPreviewStyle';
  style.textContent=`
    #budgetPreview{padding-bottom:96px}.bpHead{display:flex;align-items:center;gap:10px;margin-bottom:12px}.bpBack{border:0;background:#eef6fb;color:#125a83;border-radius:12px;padding:10px 13px;font-weight:900;font-size:15px}.bpTitle{font-size:22px;font-weight:900;color:#17364d;flex:1}.bpActions{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}.bpBtn{display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:12px;background:#0b76d1;color:#fff;padding:11px 14px;font-size:14px;font-weight:900;text-decoration:none}.bpBtn.light{background:#eaf3f8;color:#245b79}.bpNote{background:#f0f9ff;border-radius:12px;padding:10px 12px;font-size:12px;color:#456c82;line-height:1.55;margin-bottom:10px}.bpFrameWrap{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 18px rgba(26,72,98,.07);height:calc(100vh - 250px);min-height:520px}.bpFrame{width:100%;height:100%;border:0;background:#fff}@media(max-width:680px){.bpTitle{font-size:19px}.bpFrameWrap{height:calc(100vh - 235px);min-height:500px}}
  `;
  document.head.appendChild(style);
}

function ensureSection(){
  if($('budgetPreview'))return;
  const section=document.createElement('section');
  section.id='budgetPreview';
  section.className='hidden';
  document.querySelector('main')?.appendChild(section);
}

function injectCards(){
  const add=container=>{
    if(!container||container.querySelector('[data-budget-preview-go]'))return;
    const grid=container.querySelector('.grid');
    if(!grid)return;
    const b=document.createElement('button');
    b.className='card';
    b.type='button';
    b.setAttribute('data-budget-preview-go','1');
    b.innerHTML='<div class="ico">📊</div><div class="ct">予算管理</div><div class="meta">Excel風の予算書を開く</div>';
    b.onclick=openBudgetPreview;
    grid.appendChild(b);
  };
  add($('home'));
  add($('more'));
}

function openBudgetPreview(){
  ensureStyle();
  ensureSection();
  document.querySelectorAll('main>section').forEach(s=>s.classList.add('hidden'));
  const el=$('budgetPreview');
  el.classList.remove('hidden');
  document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('on',n.dataset.p==='more'));
  el.innerHTML=`
    <div class="bpHead"><button class="bpBack" id="bpBack" type="button">← 戻る</button><div class="bpTitle">📊 予算管理</div></div>
    <div class="bpActions"><a class="bpBtn" href="${BUDGET_URL}" target="_blank" rel="noopener">Safariで開く</a><button class="bpBtn light" id="bpReload" type="button">再読み込み</button></div>
    <div class="bpNote">TOMA SHARE内で予算書を表示します。認証画面になった場合は「Safariで開く」からログインしてください。</div>
    <div class="bpFrameWrap"><iframe id="bpFrame" class="bpFrame" src="${BUDGET_URL}" title="TOMA Budget Preview" allow="clipboard-read; clipboard-write"></iframe></div>`;
  $('bpBack').onclick=closeBudgetPreview;
  $('bpReload').onclick=()=>{const f=$('bpFrame');if(f)f.src=BUDGET_URL+(BUDGET_URL.includes('?')?'&':'?')+'t='+Date.now();};
  window.scrollTo({top:0,behavior:'smooth'});
}

function closeBudgetPreview(){
  const home=document.querySelector('.nav[data-p="home"]');
  if(home)home.click();
  else location.reload();
}

function retryInject(){
  injectCards();
  let count=0;
  const timer=setInterval(()=>{
    injectCards();
    if(++count>20)clearInterval(timer);
  },300);
}

window.TOMA_openBudgetPreview=openBudgetPreview;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',retryInject);
else retryInject();
})();
