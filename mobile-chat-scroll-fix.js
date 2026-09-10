(()=>{
'use strict';

function isMobile(){
  return document.body.classList.contains('ui-mobile') || window.innerWidth < 700;
}

function headerHeight(){
  const header=document.querySelector('header,.top');
  return Math.ceil(header?.getBoundingClientRect().height||0);
}

function injectStyle(){
  if(document.getElementById('mobileChatScrollFixStyle'))return;
  const style=document.createElement('style');
  style.id='mobileChatScrollFixStyle';
  style.textContent=`
    @media(max-width:699px){
      html,body{height:auto!important;min-height:100%!important;overflow-y:auto!important;overscroll-behavior-y:auto!important;-webkit-overflow-scrolling:touch!important;scroll-padding-top:220px!important}
      body.ui-mobile main{height:auto!important;max-height:none!important;overflow:visible!important}
      body.ui-mobile #chat{height:auto!important;max-height:none!important;min-height:calc(100dvh - 180px)!important;overflow:visible!important;padding-top:18px!important;padding-bottom:calc(130px + env(safe-area-inset-bottom))!important;scroll-margin-top:220px!important}
      body.ui-mobile #chat .panel,
      body.ui-mobile #chat .card,
      body.ui-mobile #chat [style*="overflow-y"],
      body.ui-mobile #chat [style*="overflow:"]{
        max-height:none!important;
        height:auto!important;
        overflow-y:visible!important;
      }
      body.ui-mobile #chat [data-message-delete]{
        position:sticky!important;
        top:calc(220px + 8px)!important;
        z-index:20!important;
        min-width:82px!important;
        flex:0 0 auto!important;
      }
      #chatTopButton{
        position:fixed;
        right:14px;
        bottom:calc(88px + env(safe-area-inset-bottom));
        z-index:50;
        border:0;
        border-radius:999px;
        padding:10px 13px;
        background:#17364d;
        color:#fff;
        font-weight:900;
        box-shadow:0 4px 14px rgba(0,0,0,.22);
      }
    }
  `;
  document.head.appendChild(style);
}

function refreshHeaderOffset(){
  if(!isMobile())return;
  const h=headerHeight();
  const style=document.getElementById('mobileChatDynamicOffset');
  const css=`@media(max-width:699px){html,body{scroll-padding-top:${h+12}px!important}body.ui-mobile #chat{scroll-margin-top:${h+12}px!important}body.ui-mobile #chat [data-message-delete]{top:${h+8}px!important}}`;
  if(style){style.textContent=css;return;}
  const el=document.createElement('style');
  el.id='mobileChatDynamicOffset';
  el.textContent=css;
  document.head.appendChild(el);
}

function scrollChatToTop(){
  document.querySelectorAll('#chat *').forEach(el=>{
    try{if(el.scrollTop>0)el.scrollTop=0;}catch(e){}
  });
  const chat=document.getElementById('chat');
  const header=document.querySelector('header,.top');
  const top=(chat?.getBoundingClientRect().top||0)+window.scrollY-(header?.getBoundingClientRect().height||0)-12;
  try{window.scrollTo({top:Math.max(0,top),behavior:'smooth'});}catch(e){window.scrollTo(0,Math.max(0,top));}
}

function syncButton(){
  let btn=document.getElementById('chatTopButton');
  const chat=document.getElementById('chat');
  const visible=isMobile() && chat && !chat.classList.contains('hidden');
  if(!visible){if(btn)btn.remove();return;}
  if(!btn){
    btn=document.createElement('button');
    btn.id='chatTopButton';
    btn.type='button';
    btn.textContent='↑ 先頭';
    btn.setAttribute('aria-label','メッセージの先頭へ戻る');
    btn.onclick=scrollChatToTop;
    document.body.appendChild(btn);
  }
}

function apply(){
  injectStyle();
  refreshHeaderOffset();
  syncButton();
}

document.addEventListener('DOMContentLoaded',apply);
window.addEventListener('resize',apply,{passive:true});
window.addEventListener('orientationchange',()=>setTimeout(apply,150),{passive:true});
new MutationObserver(apply).observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['class']});
setTimeout(apply,300);
setTimeout(apply,1200);
})();
