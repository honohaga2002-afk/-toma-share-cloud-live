(()=>{
  'use strict';

  let busy=false;
  let timer=0;
  let observedHome=null;

  const desktop=()=>document.body.classList.contains('ui-desktop');
  const home=()=>document.getElementById('home');
  const findCard=(cards,label)=>cards.find(card=>(card.textContent||'').includes(label));

  function make(tag,className,text){
    const node=document.createElement(tag);
    node.className=className;
    if(text)node.textContent=text;
    return node;
  }

  function schedule(){
    clearTimeout(timer);
    timer=setTimeout(decorate,40);
  }

  function decorate(){
    const section=home();
    if(busy||!desktop()||!section||section.classList.contains('hidden'))return;
    if(section.dataset.pcHomeReady==='1'&&section.querySelector('.pcHomeStats'))return;
    delete section.dataset.pcHomeReady;

    const cards=[...section.querySelectorAll('button.card')];
    const budget=findCard(cards,'予算管理');
    if(!budget){
      schedule();
      return;
    }

    const drive=findCard(cards,'共有ドライブ');
    const calendar=findCard(cards,'スケジュール');
    const tasks=findCard(cards,'やることリスト');
    if(!drive||!calendar||!tasks)return;

    busy=true;
    try{
      const originalChildren=[...section.children];
      const used=new Set();
      const take=(label)=>{
        const card=findCard(cards,label);
        if(card)used.add(card);
        return card;
      };

      const heading=make('div','pcHomeHeading');
      const title=make('h2','','TOMA SHARE');
      const subtitle=make('p','','みんなでつながる、安心の情報共有ワークスペース');
      heading.append(title,subtitle);

      const presence=make('div','pcHomePresence');
      originalChildren
        .filter(node=>!node.classList.contains('grid'))
        .forEach(node=>presence.appendChild(node));

      const stats=make('div','pcHomeStats');
      [drive,calendar,tasks,budget].forEach((card,index)=>{
        used.add(card);
        card.classList.add('pcHomeStat',`pcHomeStat${index+1}`);
        stats.appendChild(card);
      });

      const columns=make('div','pcHomeColumns');
      const recent=make('div','pcHomePanel');
      const upcoming=make('div','pcHomePanel');
      recent.appendChild(make('div','pcHomePanelTitle','最近のアクティビティ'));
      upcoming.appendChild(make('div','pcHomePanelTitle','今後のイベント・申請'));

      const recentList=make('div','pcHomeList');
      const upcomingList=make('div','pcHomeList');
      ['資料等を検索','メッセージ','議事録','反省点・改善'].forEach(label=>{
        const card=take(label);
        if(card){card.classList.add('pcHomeRow');recentList.appendChild(card);}
      });
      ['苫小牧イベント','許可・申請','共有メンバー'].forEach(label=>{
        const card=take(label);
        if(card){card.classList.add('pcHomeRow');upcomingList.appendChild(card);}
      });
      cards.filter(card=>!used.has(card)).forEach(card=>{
        card.classList.add('pcHomeRow');
        recentList.appendChild(card);
      });

      recent.appendChild(recentList);
      upcoming.appendChild(upcomingList);
      columns.append(recent,upcoming);
      section.replaceChildren(heading,presence,stats,columns);
      section.dataset.pcHomeReady='1';
    }finally{
      busy=false;
    }
  }

  function observe(){
    const section=home();
    if(!section||section===observedHome)return;
    observedHome=section;
    new MutationObserver(()=>{if(!busy)schedule();}).observe(section,{childList:true});
    schedule();
  }

  function restoreMobile(){
    const section=home();
    if(!desktop()&&section?.dataset.pcHomeReady==='1'&&!section.classList.contains('hidden')){
      delete section.dataset.pcHomeReady;
      document.querySelector('#nav .nav[data-p="home"]')?.click();
    }
  }

  document.addEventListener('DOMContentLoaded',observe);
  window.addEventListener('toma:viewmode',()=>desktop()?schedule():restoreMobile());
  observe();
  setTimeout(schedule,250);
})();
