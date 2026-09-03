(()=>{
'use strict';
const EXTRA_EVENTS=[
 {date:'11/7(土)',time:'時間は公式ページ確認',title:'パラスポーツ体験教室（モルック）',place:'苫小牧市内スポーツ施設',tag:'スポーツ・体験',url:'https://www.city.tomakomai.hokkaido.jp/calendar/202611.html'},
 {date:'11/21(土)',time:'14:00開演（13:00開場）',title:'Stand up TOMAKOMAI 2026「音楽の絵本 BRASS BATTLE」',place:'苫小牧市民文化ホール ART CUBES グランドホール',tag:'音楽・親子',url:'https://www.city.tomakomai.hokkaido.jp/kyoiku/shogaigakushu/bunka/eventannai/ongakusai/standup.html'}
];
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function add(){
 const box=document.getElementById('tomakomaiEventList');
 if(!box||box.dataset.extra20260904==='1') return;
 const grid=box.querySelector('div[style*="display:grid"]');
 if(!grid) return;
 EXTRA_EVENTS.forEach(e=>{
  if(box.textContent.includes(e.title)) return;
  const a=document.createElement('a');
  a.href=e.url;a.target='_blank';a.rel='noopener noreferrer';
  a.style.cssText='display:block;text-decoration:none;color:inherit;border:1px solid #dbe8ef;border-radius:12px;padding:12px;background:#fff';
  a.innerHTML=`<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><strong style="font-size:15px;line-height:1.4">${esc(e.title)}</strong><span class="pill" style="white-space:nowrap">${esc(e.tag)}</span></div><div style="margin-top:7px;font-weight:800;color:#0b76a8">📅 ${esc(e.date)}　⏰ ${esc(e.time)}</div><div class="meta" style="margin-top:5px">📍 ${esc(e.place)}　› 公式情報</div>`;
  grid.appendChild(a);
 });
 box.dataset.extra20260904='1';
 const pill=box.querySelector(':scope > div:first-child .pill');
 if(pill){const n=parseInt(pill.textContent,10);if(Number.isFinite(n))pill.textContent=(n+EXTRA_EVENTS.length)+'件';}
}
new MutationObserver(()=>setTimeout(add,0)).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
window.addEventListener('load',()=>setTimeout(add,500));
document.addEventListener('click',()=>setTimeout(add,50));
})();
