(()=>{
'use strict';

const $=id=>document.getElementById(id);

function ensureSection(){
  let section=$('budgetNative');
  if(section)return section;
  section=document.createElement('section');
  section.id='budgetNative';
  section.className='hidden budgetSheetHost';
  section.innerHTML='<iframe class="budgetSheetFrame" title="TOMA SHARE 予算管理" src="/budget-sheet/"></iframe>';
  document.querySelector('main')?.appendChild(section);
  return section;
}

function addStyles(){
  if($('tomaBudgetIntegrationStyle'))return;
  const style=document.createElement('style');
  style.id='tomaBudgetIntegrationStyle';
  style.textContent='.budgetSheetHost{position:fixed;inset:0 0 calc(67px + env(safe-area-inset-bottom)) 0;z-index:4;padding:0;background:#f3f3f3}.budgetSheetFrame{display:block;width:100%;height:100%;border:0;background:#f3f3f3}.budgetCard{cursor:pointer}';
  document.head.appendChild(style);
}

function makeCard(){
  const button=document.createElement('button');
  button.className='card budgetCard';
  button.type='button';
  button.setAttribute('data-budget-native','1');
  button.innerHTML='<div class="ico">💰</div><div class="ct">予算管理</div><div class="meta">Excel風の予算・決算シート</div>';
  button.onclick=openBudget;
  return button;
}

function inject(container){
  const grid=container?.querySelector('.grid');
  if(!grid||grid.querySelector('[data-budget-native]'))return;
  const old=grid.querySelector('[data-finance-go],[data-budget-go]')||
    [...grid.querySelectorAll('button.card')].find(x=>/イベント収支管理|予算管理/.test(x.textContent||''));
  if(old)old.replaceWith(makeCard());
  else grid.appendChild(makeCard());
}

function injectAll(){
  inject($('home'));
  inject($('more'));
}

function openBudget(){
  addStyles();
  const section=ensureSection();
  document.querySelectorAll('main>section').forEach(x=>x.classList.add('hidden'));
  section.classList.remove('hidden');
  document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('on',n.hasAttribute('data-budget-nav')));
  window.scrollTo(0,0);
}

function bind(){
  addStyles();
  ensureSection();
  injectAll();
  const nav=document.querySelector('[data-budget-nav]');
  if(nav)nav.onclick=openBudget;
}

function watchForRenders(){
  const observer=new MutationObserver(()=>injectAll());
  [$('home'),$('more')].filter(Boolean).forEach(section=>{
    observer.observe(section,{childList:true});
  });
}

document.addEventListener('DOMContentLoaded',bind);
bind();
watchForRenders();
let tries=0;
const timer=setInterval(()=>{tries++;injectAll();if(tries>40)clearInterval(timer);},500);
})();
