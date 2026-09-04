'use strict';

self.addEventListener('push',event=>{

  let data={};

  try{
    data=event.data
      ?event.data.json()
      :{};
  }catch(e){
    data={};
  }

  event.waitUntil(
    self.clients.matchAll({
      type:'window',
      includeUncontrolled:true
    })
    .then(clients=>{

      const visible=
        clients.find(
          client=>
            client.visibilityState==='visible'
        );

      if(visible){
        visible.postMessage({
          type:'workspace-notification',
          title:data.title||'TOMA SHARE',
          body:data.body||'新しい更新があります',
          url:data.url||'/',
          eventType:data.eventType||'update',
          eventId:data.eventId||0
        });

        return;
      }

      return self.registration
        .showNotification(
          data.title||'TOMA SHARE',
          {
            body:
              data.body||
              '新しい更新があります',
            icon:'/icon-192.png',
            badge:'/icon-192.png',
            tag:
              data.tag||
              `toma-${data.eventType||'update'}`,
            renotify:true,
            data:{
              url:data.url||'/',
              eventType:
                data.eventType||'update',
              eventId:data.eventId||0
            }
          }
        );
    })
  );
});

self.addEventListener(
  'notificationclick',
  event=>{

    event.notification.close();

    const target=
      event.notification.data?.url||
      '/';

    event.waitUntil(
      self.clients.matchAll({
        type:'window',
        includeUncontrolled:true
      })
      .then(clients=>{

        const existing=
          clients[0];

        if(existing){

          existing.navigate(target);

          return existing.focus();
        }

        return self.clients
          .openWindow(target);
      })
    );
  }
);


function openShareInbox(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open('toma-share-inbox',1);
    request.onupgradeneeded=()=>{
      if(!request.result.objectStoreNames.contains('shares')){
        request.result.createObjectStore('shares',{keyPath:'id'});
      }
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}

self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(url.pathname!=='/share-target'||event.request.method!=='POST')return;
  event.respondWith((async()=>{
    try{
      const form=await event.request.formData();
      const files=form.getAll('files').filter(value=>value instanceof File&&value.size);
      let file=files[0]||null;
      if(!file){
        const sharedText=[form.get('title'),form.get('text'),form.get('url')].filter(Boolean).join('\n');
        if(sharedText)file=new File([sharedText],'共有リンク.txt',{type:'text/plain'});
      }
      if(file){
        const db=await openShareInbox();
        await new Promise((resolve,reject)=>{
          const tx=db.transaction('shares','readwrite');
          tx.objectStore('shares').put({id:'latest',file,name:file.name,type:file.type,receivedAt:Date.now()});
          tx.oncomplete=resolve;
          tx.onerror=()=>reject(tx.error);
        });
        db.close();
      }
      return Response.redirect('/?open=drive&shared=1',303);
    }catch(e){
      return Response.redirect('/?open=drive&shareError=1',303);
    }
  })());
});
