(()=>{
'use strict';

const BUDGET_URL='https://toma-budget-preview.hagajyo.chatgpt.site/?utm_source=chatgpt.com';

function makeCard(){
  const b=document.createElement('button');
  b.className='card';
  b.type='button';
  b.setAttribute('data-finance-go','1');
  b.innerHTML='<div class="ico">💰</div><div class="ct">予算管理</div><div class="meta">予算書・収支・年度管理</div>';
  b.onclick=()=>{ window.location.href=BUDGET_URL; };
  return b;
}

function inject(container){
  if(!container)return;
  const grid=container.querySelector('.grid');
  if(!grid)return;
  const existing=grid.querySelector('[data-finance-go]');
  if(existing){
    existing.replaceWith(makeCard());
    return;
  }
  const old=[...grid.querySelectorAll('button.card')].find(el=>/イベント収支管理/.test(el.textContent||''));
  if(old){ old.replaceWith(makeCard()); return; }
  if(!grid.querySelector('[data-budget-go]')) grid.appendChild(makeCard());
}

function apply(){
  inject(document.getElementById('home'));
  inject(document.getElementById('more'));
}

const observer=new MutationObserver(apply);
observer.observe(document.documentElement,{subtree:true,childList:true});
document.addEventListener('DOMContentLoaded',apply);
setTimeout(apply,0);
setTimeout(apply,500);
setTimeout(apply,1500);
})();
