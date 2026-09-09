(()=>{
'use strict';
const qs=(s,r=document)=>r.querySelector(s);
const qsa=(s,r=document)=>[...r.querySelectorAll(s)];
const map={home:'home',drive:'drive',events:'events',budget:'budgetNative',permit:'permit',settings:'more'};
function clickLegacy(page){
  const legacy=qs(`#nav .nav[data-p="${page}"]`);
  if(legacy){legacy.click();return true;}
  const sec=document.getElementById(page);
  if(sec){qsa('main>section').forEach(x=>x.classList.add('hidden'));sec.classList.remove('hidden');window.scrollTo(0,0);return true;}
  return false;
}
function syncActive(){
  const visible=qsa('main>section').find(x=>!x.classList.contains('hidden'));
  const id=visible?.id||'home';
  qsa('.desktopSidebar button[data-target]').forEach(b=>b.classList.toggle('active',b.dataset.target===id));
}
function bindSidebar(){
  qsa('.desktopSidebar button[data-target]').forEach(b=>{
    if(b.dataset.bound)return;
    b.dataset.bound='1';
    b.addEventListener('click',()=>{clickLegacy(b.dataset.target);setTimeout(syncActive,0);});
  });
}
function enhanceHeader(){
  const left=qs('header.top>div:first-child');
  if(left){const meta=qs('.meta',left);if(meta)meta.textContent='学生団体の運営を、もっとスマートに';}
  const right=qs('header.top>div:nth-child(2)');
  if(right&&!qs('.pcEventSelect',right)){
    const event=document.createElement('select');
    event.className='pcEventSelect';
    event.setAttribute('aria-label','イベント選択');
    event.innerHTML='<option>TOMAフェスティバル2025</option>';
    right.insertBefore(event,right.firstChild);
    const notify=document.createElement('button');notify.type='button';notify.className='pcHeaderIcon';notify.setAttribute('aria-label','通知');notify.textContent='🔔';
    const profile=document.createElement('button');profile.type='button';profile.className='pcHeaderIcon';profile.setAttribute('aria-label','プロフィール');profile.textContent='👤';
    right.append(notify,profile);
  }
}
function addHeaderStyle(){
  if(qs('#pcRefRuntimeStyle'))return;
  const s=document.createElement('style');s.id='pcRefRuntimeStyle';s.textContent='body.ui-desktop .pcEventSelect{height:32px;min-height:32px;width:auto;margin:0;padding:0 28px 0 10px;border-radius:5px;border:1px solid rgba(255,255,255,.10);background:#173f66;color:#fff;font-size:12px;font-weight:700}body.ui-mobile .pcEventSelect,body.ui-mobile .pcHeaderIcon{display:none!important}body.ui-desktop .pcHeaderIcon{width:32px;height:32px;border:0;background:transparent;color:#fff;font-size:15px;padding:0;cursor:pointer}';document.head.appendChild(s);
}
function init(){enhanceHeader();addHeaderStyle();bindSidebar();syncActive();}
document.addEventListener('DOMContentLoaded',init);document.addEventListener('click',()=>setTimeout(syncActive,0));window.addEventListener('toma:viewmode',()=>setTimeout(init,0));
const mo=new MutationObserver(()=>syncActive());mo.observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['class']});
init();
})();
