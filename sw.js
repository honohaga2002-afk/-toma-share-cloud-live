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
          type:'login-notification',
          memberName:
            String(data.body||'')
              .replace(/さんがログインしました$/,''),
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
              'メンバーがログインしました',
            tag:'toma-login',
            renotify:true,
            data:{
              url:data.url||'/',
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
