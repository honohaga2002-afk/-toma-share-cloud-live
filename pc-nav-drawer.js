(()=>{
  'use strict';

  const desktop=()=>document.body.classList.contains('ui-desktop');
  const nav=()=>document.getElementById('nav');
  const toggle=()=>document.getElementById('desktopMenuToggle');

  function setOpen(open){
    const active=desktop()&&open;
    document.body.classList.toggle('pc-menu-open',active);
    toggle()?.setAttribute('aria-expanded',String(active));
  }

  document.getElementById('desktopMenuToggle')?.addEventListener('click',()=>setOpen(true));
  document.getElementById('desktopMenuClose')?.addEventListener('click',()=>setOpen(false));
  document.getElementById('desktopMenuBackdrop')?.addEventListener('click',()=>setOpen(false));
  document.getElementById('desktopHomeButton')?.addEventListener('click',()=>{
    nav()?.querySelector('.nav[data-p="home"]')?.click();
    setOpen(false);
  });
  nav()?.addEventListener('click',event=>{
    if(event.target.closest('.nav[data-p]'))setOpen(false);
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape')setOpen(false);
  });
  window.addEventListener('toma:viewmode',()=>setOpen(false));
  window.addEventListener('resize',()=>{if(!desktop())setOpen(false)});
  setOpen(false);
})();
