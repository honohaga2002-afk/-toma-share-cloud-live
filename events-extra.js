(()=>{
'use strict';
const EXTRA_EVENTS=[
 {date:'9/19(土)〜11/23(月・祝)',time:'9:30〜17:00（入館16:30まで）※9/22・11/20は20:00まで',title:'特別展「棟方志功―北方への祈り」',place:'苫小牧市美術博物館 企画展示室（第1〜第3展示室）',tag:'美術・展示',url:'https://www.city.tomakomai.hokkaido.jp/hakubutsukan/tenrankai/munakata.html'},
 {date:'9/19(土)',time:'11:00〜12:00',title:'棟方志功記念館学芸員による講演会',place:'苫小牧市美術博物館 研修室',tag:'美術・講演',url:'https://www.city.tomakomai.hokkaido.jp/hakubutsukan/tenrankai/munakata.html'},
 {date:'9/26(土)',time:'10:00〜12:30',title:'公園の「なぜ？」を見つけ隊！〜本といっしょに本物の自然を追いかける一日〜',place:'出光カルチャーパーク・苫小牧市立中央図書館',tag:'自然・体験',url:'https://www.city.tomakomai.hokkaido.jp/shizen/shizenhogo/seibutsu/mituketai.html'},
 {date:'9/30',time:'10:00〜11:30',title:'保育所等入所説明会（第2回）',place:'とまこまい子育て支援センター（教育・福祉センター2階）',tag:'子育て・説明会',url:'https://www.city.tomakomai.hokkaido.jp/kenko/kosodate/torikumi/riyousyasiennjigyou.html'},
 {date:'10/7(水)',time:'10:00〜12:00',title:'ミニ保育体験＆利用者支援員相談会',place:'みその保育園 子育てルーム',tag:'子育て・体験',url:'https://www.city.tomakomai.hokkaido.jp/kenko/kosodate/torikumi/riyousyasiennjigyou.html'},
 {date:'10/27(火)',time:'10:00〜12:00',title:'ミニ保育体験＆利用者支援員相談会',place:'みその保育園 子育てルーム',tag:'子育て・体験',url:'https://www.city.tomakomai.hokkaido.jp/kenko/kosodate/torikumi/riyousyasiennjigyou.html'},
 {date:'9/12(土)〜11/23(月・祝)',time:'9:30〜17:00（美術博物館開館時間）',title:'「空から 海から 地中から」―地層標本で見る噴火・津波・地震―',place:'苫小牧市美術博物館 第一収蔵展示室',tag:'科学・展示',url:'https://www.city.tomakomai.hokkaido.jp/hakubutsukan/gyoji/tisou.html'},
 {date:'11/3(火・祝)',time:'10:00／11:30／13:30／15:00（各回約30分）',title:'地層標本 展示説明会',place:'苫小牧市美術博物館 第一収蔵展示室',tag:'科学・解説',url:'https://www.city.tomakomai.hokkaido.jp/hakubutsukan/gyoji/tisou.html'},
 {date:'11/7(土)',time:'時間は公式ページ確認',title:'パラスポーツ体験教室（モルック）',place:'苫小牧市内スポーツ施設',tag:'スポーツ・体験',url:'https://www.city.tomakomai.hokkaido.jp/calendar/202611.html'},
 {date:'11/8(日)',time:'10:00〜11:30',title:'地層標本の作成体験',place:'苫小牧市美術博物館',tag:'科学・体験',url:'https://www.city.tomakomai.hokkaido.jp/hakubutsukan/gyoji/tisou.html'},
 {date:'11/14(土)',time:'12:00〜17:30予定',title:'NHKのど自慢 予選会',place:'苫小牧市民文化ホール ART CUBES',tag:'音楽・公開イベント',url:'https://www.city.tomakomai.hokkaido.jp/shisei/sonota/shiminhoru/nodojiman.html'},
 {date:'11/15(日)',time:'11:50〜13:20予定（11:00開場）',title:'NHKのど自慢',place:'苫小牧市民文化ホール ART CUBES',tag:'音楽・公開収録',url:'https://www.city.tomakomai.hokkaido.jp/shisei/sonota/shiminhoru/nodojiman.html'},
 {date:'11/21(土)',time:'14:00開演（13:00開場）',title:'Stand up TOMAKOMAI 2026「音楽の絵本 BRASS BATTLE」',place:'苫小牧市民文化ホール ART CUBES グランドホール',tag:'音楽・親子',url:'https://www.city.tomakomai.hokkaido.jp/kyoiku/shogaigakushu/bunka/eventannai/ongakusai/standup.html'}
];
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function add(){
 const box=document.getElementById('tomakomaiEventList');
 if(!box||box.dataset.extra20260919==='1') return;
 const grid=box.querySelector('div[style*="display:grid"]');
 if(!grid) return;
 EXTRA_EVENTS.forEach(e=>{
  if(box.textContent.includes(e.title+' '+e.date)) return;
  const a=document.createElement('a');
  a.href=e.url;a.target='_blank';a.rel='noopener noreferrer';
  a.style.cssText='display:block;text-decoration:none;color:inherit;border:1px solid #dbe8ef;border-radius:12px;padding:12px;background:#fff';
  a.innerHTML=`<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><strong style="font-size:15px;line-height:1.4">${esc(e.title)}</strong><span class="pill" style="white-space:nowrap">${esc(e.tag)}</span></div><div style="margin-top:7px;font-weight:800;color:#0b76a8">📅 ${esc(e.date)}　⏰ ${esc(e.time)}</div><div class="meta" style="margin-top:5px">📍 ${esc(e.place)}　› 公式情報</div>`;
  grid.appendChild(a);
 });
 box.dataset.extra20260919='1';
 const pill=box.querySelector(':scope > div:first-child .pill');
 if(pill){const n=parseInt(pill.textContent,10);if(Number.isFinite(n))pill.textContent=(n+EXTRA_EVENTS.length)+'件';}
}
new MutationObserver(()=>setTimeout(add,0)).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
window.addEventListener('load',()=>setTimeout(add,500));
document.addEventListener('click',()=>setTimeout(add,50));
})();
