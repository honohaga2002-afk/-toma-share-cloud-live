(()=>{
'use strict';

const BUDGET_URL='https://toma-budget-preview.hagajyo.chatgpt.site/?utm_source=chatgpt.com';

function makeCard(){
  const b=document.createElement('button');
  b.className='card';
  b.type='button';
  b.setAttribute('data-budget-go','1');
  b.innerHTML='<div class="ico">💰</div><div class="ct">予算管理</div><div class="meta">予算書・収支・年度管理</div>';
  b.onclick=()=>{ window.location.href=BUDGET_URL; };
  return b;
}

function inject(container){
  if(!container)return false;
  const grid=container.querySelector('.grid');
  if(!grid)return false;

  if(grid.querySelector('[data-budget-go]'))return true;

  const existing=grid.querySelector('[data-finance-go]');
  if(existing){
    existing.replaceWith(makeCard());
    return true;
  }

  const old=[...grid.querySelectorAll('button.card')].find(el=>/イベント収支管理/.test(el.textContent||''));
  if(old){
    old.replaceWith(makeCard());
    return true;
  }

  grid.appendChild(makeCard());
  return true;
}

function apply(){
  const a=inject(document.getElementById('home'));
  const b=inject(document.getElementById('more'));
  return a||b;
}

document.addEventListener('DOMContentLoaded',apply);
apply();

let tries=0;
const timer=setInterval(()=>{
  tries++;
  apply();
  if(tries>=40)clearInterval(timer);
},500);
})();
