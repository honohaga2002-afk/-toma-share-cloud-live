(()=>{
'use strict';

const BUDGET_URL='https://toma-budget-preview.hagajyo.chatgpt.site/?utm_source=chatgpt.com';

function openBudget(){
  // iPhone/PWAでも認証情報を使いやすいよう、通常のブラウザ遷移で開く。
  window.location.href=BUDGET_URL;
}

function makeCard(){
  const b=document.createElement('button');
  b.className='card';
  b.type='button';
  b.setAttribute('data-budget-go','1');
  b.innerHTML='<div class="ico">💰</div><div class="ct">予算管理</div><div class="meta">予算書・収支・年度管理</div>';
  b.addEventListener('click',openBudget);
  return b;
}

function replaceFinanceCard(container){
  if(!container)return;
  const grid=container.querySelector('.grid');
  if(!grid)return;

  const existingBudget=grid.querySelector('[data-budget-go]');
  if(existingBudget)return;

  const financeCard=grid.querySelector('[data-finance-go]');
  if(financeCard){
    financeCard.replaceWith(makeCard());
    return;
  }

  // finance.jsを読み込まない構成でも、以前の表示文言が残っていれば置換する。
  const cards=[...grid.querySelectorAll('button.card')];
  const old=cards.find(el=>/イベント収支管理/.test(el.textContent||''));
  if(old){
    old.replaceWith(makeCard());
    return;
  }

  grid.appendChild(makeCard());
}

function inject(){
  replaceFinanceCard(document.getElementById('home'));
  replaceFinanceCard(document.getElementById('more'));
}

const observer=new MutationObserver(inject);
observer.observe(document.documentElement,{subtree:true,childList:true});

document.addEventListener('DOMContentLoaded',inject);
setTimeout(inject,0);
setTimeout(inject,500);
setTimeout(inject,1500);

window.openTomaBudget=openBudget;
})();
