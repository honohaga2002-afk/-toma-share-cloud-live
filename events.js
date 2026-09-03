(()=>{
'use strict';

const EVENTS=[
  {date:'9/3(木)',time:'時間は公式ページ確認',title:'はじめての森あそび「森の子ひろば」',place:'苫小牧市内',tag:'親子・自然',url:'https://www.city.tomakomai.hokkaido.jp/calendar/'},
  {date:'9/5(土)',time:'時間は公式ページ確認',title:'青少年のための科学の祭典 苫小牧大会2026',place:'苫小牧市科学センター',tag:'科学・子ども',url:'https://www.city.tomakomai.hokkaido.jp/calendar/'},
  {date:'9/5(土)',time:'時間は公式ページ確認',title:'ふれあいセンターまつり',place:'苫小牧市内',tag:'地域イベント',url:'https://www.city.tomakomai.hokkaido.jp/calendar/'},
  {date:'9/8(火)〜9/13(日)',time:'時間は公式ページ確認',title:'手織りサークルゆのみ 第17回作品展「小さい手織りとの出会い」',place:'苫小牧市内',tag:'小規模・展示',url:'https://www.city.tomakomai.hokkaido.jp/calendar/'},
  {date:'9/9(水)',time:'10:00〜',title:'ベビープラネタリウム',place:'苫小牧市科学センター',tag:'親子・無料',url:'https://www.city.tomakomai.hokkaido.jp/kagaku/event/school/R0809.html'},
  {date:'9/9(水)',time:'14:30〜15:30／16:00〜17:00',title:'プレスクール工作体験「ゆらゆらひかるおばけをつくろう」',place:'苫小牧市科学センター',tag:'未就学児',url:'https://www.city.tomakomai.hokkaido.jp/kagaku/event/school/R0809.html'},
  {date:'9/11(金)',time:'16:30〜17:30',title:'星空観望会「天文台で欠けた金星を見よう」',place:'苫小牧市科学センター',tag:'天文・小規模',url:'https://www.city.tomakomai.hokkaido.jp/kagaku/event/school/R0809.html'},
  {date:'9/12(土)〜9/13(日)',time:'9:30〜20:00（予定）',title:'とまこまいミライフェスト2026',place:'キラキラ公園',tag:'大型イベント',url:'https://www.city.tomakomai.hokkaido.jp/calendar/'},
  {date:'9/12(土)',time:'時間は公式ページ確認',title:'苫小牧バレエ研究所 創立52周年記念公演 TWINS☆★BALLET',place:'苫小牧市民文化ホール',tag:'舞台',url:'https://www.city.tomakomai.hokkaido.jp/kyoiku/shogaigakushu/bunka/bunkageijutsu/shinkojoseijigyo/jigyoitiran.html'},
  {date:'9/19(土)〜11/23(月・祝)',time:'9:30〜17:00（入館16:30まで）',title:'特別展「棟方志功―北方への祈り」',place:'苫小牧市美術博物館',tag:'展示',url:'https://www.city.tomakomai.hokkaido.jp/hakubutsukan/tenrankai/munakata.html'},
  {date:'9/19(土)',time:'11:00〜12:00',title:'棟方志功記念館学芸員による講演会',place:'苫小牧市美術博物館 研修室',tag:'講演・無料',url:'https://www.city.tomakomai.hokkaido.jp/hakubutsukan/tenrankai/munakata.html'},
  {date:'9/22(火・祝)',time:'18:00〜18:40',title:'夜の上映会「彫る～棟方志功の世界」',place:'苫小牧市美術博物館 研修室',tag:'上映会・無料',url:'https://www.city.tomakomai.hokkaido.jp/hakubutsukan/tenrankai/munakata.html'},
  {date:'9/26(土)',time:'10:00〜12:30',title:'公園の「なぜ？」を見つけ隊！',place:'出光カルチャーパーク・中央図書館',tag:'自然・子ども',url:'https://www.city.tomakomai.hokkaido.jp/calendar/'},
  {date:'9/26(土)',time:'時間は公式ページ確認',title:'パラスポーツ体験教室（ボッチャ）',place:'苫小牧市内スポーツ施設',tag:'スポーツ',url:'https://www.city.tomakomai.hokkaido.jp/calendar/'},
  {date:'9/26(土)',time:'時間は公式ページ確認',title:'ウォーキングフェスティバル（駅前まちなかオレンジウォークコース）',place:'苫小牧駅前・まちなか',tag:'健康・スポーツ',url:'https://www.city.tomakomai.hokkaido.jp/calendar/'},
  {date:'9/26(土)',time:'時間は公式ページ確認',title:'ハルナギFES2026',place:'苫小牧市文化交流センター',tag:'音楽・地域',url:'https://www.city.tomakomai.hokkaido.jp/kyoiku/shogaigakushu/bunka/bunkageijutsu/shinkojoseijigyo/jigyoitiran.html'},
  {date:'10/3(土)',time:'10:00〜12:00',title:'科学ふれあい教室「回転の科学！フシギなコマを作ろう」',place:'苫小牧市科学センター',tag:'科学・小規模',url:'https://www.city.tomakomai.hokkaido.jp/kagaku/event/school/r8list.html'},
  {date:'10/3(土)',time:'13:30〜16:50',title:'市民交流将棋大会',place:'苫小牧市民文化ホール ART CUBES ルーム5',tag:'文化・小規模',url:'https://www.city.tomakomai.hokkaido.jp/kyoiku/shogaigakushu/bunka/eventannai/siminbunkasai.html'},
  {date:'10/3(土)〜10/4(日)',time:'時間は公式ページ確認',title:'市民文化祭 総合展示発表',place:'苫小牧市民文化ホール',tag:'市民文化祭',url:'https://www.city.tomakomai.hokkaido.jp/kyoiku/shogaigakushu/bunka/eventannai/siminbunkasai.html'},
  {date:'10/5(月)',time:'9:00〜15:00',title:'勇払地区文化祭',place:'勇払公民館',tag:'地域・小規模',url:'https://www.city.tomakomai.hokkaido.jp/kyoiku/shogaigakushu/bunka/eventannai/siminbunkasai.html'},
  {date:'10/10(土)',time:'14:00〜15:30',title:'ギャラリートーク＋ワークショップ「裏彩色体験」',place:'苫小牧市美術博物館 企画展示室・研修室',tag:'美術・体験',url:'https://www.city.tomakomai.hokkaido.jp/hakubutsukan/tenrankai/munakata.html'},
  {date:'10/18(日)',time:'12:00〜16:00',title:'市民川柳大会',place:'苫小牧市立中央図書館 2階講堂',tag:'文化・小規模',url:'https://www.city.tomakomai.hokkaido.jp/kyoiku/shogaigakushu/bunka/eventannai/siminbunkasai.html'},
  {date:'10/25(日)',time:'10:00〜12:00／13:30〜15:30',title:'わくわくさんすう教室',place:'苫小牧市科学センター',tag:'子ども・小規模',url:'https://www.city.tomakomai.hokkaido.jp/kagaku/event/school/r8list.html'},
  {date:'10/25(日)',time:'14:00〜16:00',title:'苫小牧市主催 婚活パーティー',place:'苫小牧市民文化ホール ART CUBES アートスペース',tag:'交流',url:'https://www.city.tomakomai.hokkaido.jp/shisei/shisei/shiseihoshin/sonohoka/tomakon.html'},
  {date:'10/25(土)〜10/26(日)',time:'25日9:00〜21:00／26日9:00〜17:00',title:'沼ノ端地区文化祭',place:'沼ノ端コミュニティセンター',tag:'地域・小規模',url:'https://www.city.tomakomai.hokkaido.jp/kyoiku/shogaigakushu/bunka/eventannai/siminbunkasai.html'},
  {date:'10/25(土)〜10/26(日)',time:'25日14:00〜20:00／26日9:00〜15:00',title:'植苗地区文化祭',place:'植苗ファミリーセンター',tag:'地域・小規模',url:'https://www.city.tomakomai.hokkaido.jp/kyoiku/shogaigakushu/bunka/eventannai/siminbunkasai.html'},
  {date:'10/31(土)',time:'10:30〜11:30',title:'宇宙ステーション「ミール」ガイド「コックピットとトイレのひみつ」',place:'苫小牧市科学センター',tag:'科学・小規模',url:'https://www.city.tomakomai.hokkaido.jp/kagaku/event/school/r8list.html'},
  {date:'10/31(土)',time:'11:00〜11:30／13:30〜14:00',title:'担当学芸員によるギャラリートーク',place:'苫小牧市美術博物館 企画展示室',tag:'美術・解説',url:'https://www.city.tomakomai.hokkaido.jp/hakubutsukan/tenrankai/munakata.html'},
  {date:'11/10(火)',time:'時間は公式ページ確認',title:'ルーランド・デュイ チェロリサイタル',place:'苫小牧信用金庫本店2階 市民サロン',tag:'音楽・小規模',url:'https://www.city.tomakomai.hokkaido.jp/kyoiku/shogaigakushu/bunka/bunkageijutsu/shinkojoseijigyo/jigyoitiran.html'},
  {date:'11/15(日)',time:'時間は公式ページ確認',title:'NHKのど自慢',place:'苫小牧市内',tag:'音楽・公開番組',url:'https://www.city.tomakomai.hokkaido.jp/calendar/'},
  {date:'11/20(金)',time:'18:00〜18:40',title:'夜の上映会「彫る～棟方志功の世界」',place:'苫小牧市美術博物館 研修室',tag:'上映会・無料',url:'https://www.city.tomakomai.hokkaido.jp/hakubutsukan/tenrankai/munakata.html'},
  {date:'11/20(金)',time:'時間は公式ページ確認',title:'夜会シリーズ vol.14',place:'苫小牧信用金庫本店2階 市民サロン',tag:'音楽・小規模',url:'https://www.city.tomakomai.hokkaido.jp/kyoiku/shogaigakushu/bunka/bunkageijutsu/shinkojoseijigyo/jigyoitiran.html'},
  {date:'11/28(土)',time:'時間は公式ページ確認',title:'縄文時代に関する講演会',place:'ホテルウイングインターナショナル苫小牧',tag:'講演・小規模',url:'https://www.city.tomakomai.hokkaido.jp/kyoiku/shogaigakushu/bunka/bunkageijutsu/shinkojoseijigyo/jigyoitiran.html'},
  {date:'12月〜',time:'詳細発表待ち',title:'冬季の市内イベント',place:'苫小牧市内',tag:'随時更新',url:'https://www.city.tomakomai.hokkaido.jp/calendar/'},
  {date:'2027年1〜3月（予定）',time:'日時詳細は公式発表待ち',title:'OrgofA（オルオブエー）「異邦人の庭」',place:'旧すえくに医院',tag:'舞台・小規模',url:'https://www.city.tomakomai.hokkaido.jp/kyoiku/shogaigakushu/bunka/bunkageijutsu/shinkojoseijigyo/jigyoitiran.html'},
  {date:'2027/1/31(日)',time:'時間は公式ページ確認',title:'向井バレエシアター45周年＆向井美賀子追悼公演',place:'苫小牧市民文化ホール',tag:'舞台',url:'https://www.city.tomakomai.hokkaido.jp/kyoiku/shogaigakushu/bunka/bunkageijutsu/shinkojoseijigyo/jigyoitiran.html'},
  {date:'2027/2/27(土)',time:'時間は公式ページ確認',title:'アール・ブリュット in 苫小牧 2027',place:'苫小牧市文化交流センター',tag:'文化・福祉',url:'https://www.city.tomakomai.hokkaido.jp/kyoiku/shogaigakushu/bunka/bunkageijutsu/shinkojoseijigyo/jigyoitiran.html'},
  {date:'2027/3/20(土)〜3/24(水)',time:'時間は公式ページ確認',title:'第3回 U-20 若者美術展',place:'苫小牧市美術博物館',tag:'美術・若者',url:'https://www.city.tomakomai.hokkaido.jp/kyoiku/shogaigakushu/bunka/bunkageijutsu/shinkojoseijigyo/jigyoitiran.html'},
  {date:'2027/3/22(月・祝)',time:'時間は公式ページ確認',title:'苫小牧ウインド・アンサンブル創団40周年記念演奏会',place:'苫小牧市民文化ホール',tag:'音楽',url:'https://www.city.tomakomai.hokkaido.jp/kyoiku/shogaigakushu/bunka/bunkageijutsu/shinkojoseijigyo/jigyoitiran.html'}
];

function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function renderEvents(){
  const page=document.getElementById('events');
  if(!page || page.classList.contains('hidden')) return;
  const mount=page.querySelector('#tomakomaiEventsMount');
  if(!mount) return;
  const old=page.querySelector('#tomakomaiEventList'); if(old) old.remove();
  const box=document.createElement('div'); box.id='tomakomaiEventList';
  box.innerHTML=`<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px"><div><div class="title" style="font-size:19px">🎪 苫小牧イベント情報</div><div class="meta">小規模な地域行事・教室・展示も掲載／2027年3月まで公開済み情報を掲載</div></div><span class="pill">${EVENTS.length}件</span></div><div style="display:grid;gap:9px">${EVENTS.map(e=>`<a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer" style="display:block;text-decoration:none;color:inherit;border:1px solid #dbe8ef;border-radius:12px;padding:12px;background:#fff"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><strong style="font-size:15px;line-height:1.4">${esc(e.title)}</strong><span class="pill" style="white-space:nowrap">${esc(e.tag)}</span></div><div style="margin-top:7px;font-weight:800;color:#0b76a8">📅 ${esc(e.date)}　⏰ ${esc(e.time)}</div><div class="meta" style="margin-top:5px">📍 ${esc(e.place)}　› 公式情報</div></a>`).join('')}</div><a class="btn" href="https://www.city.tomakomai.hokkaido.jp/calendar/" target="_blank" rel="noopener noreferrer" style="display:block;text-align:center;margin-top:12px;text-decoration:none">苫小牧市 行事カレンダーを確認</a>`;
  mount.replaceChildren(box);
}
const observer=new MutationObserver(()=>setTimeout(renderEvents,0)); observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']}); document.addEventListener('click',()=>setTimeout(renderEvents,0)); window.addEventListener('load',()=>setTimeout(renderEvents,300));
})();