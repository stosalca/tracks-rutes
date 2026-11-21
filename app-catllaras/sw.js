const CACHE='catllaras-v4';
const TILES='catllaras-mapes-v1';
const FILES=['./','index.html','rutes.js','info.js','vessants.js','manifest.webmanifest','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE&&x!==TILES).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  // teselles del mapa ICGC: primer les desades; si no, xarxa i es desen
  if(url.hostname==='geoserveis.icgc.cat'){
    e.respondWith(caches.open(TILES).then(c=>c.match(e.request.url).then(r=>r||fetch(e.request).then(res=>{
      if(res.ok||res.type==='opaque') c.put(e.request.url,res.clone());
      return res;}).catch(()=>new Response('',{status:504})))));
    return;
  }
  e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request).then(res=>{
    if(res.ok&&url.origin===location.origin){const cp=res.clone();caches.open(CACHE).then(c=>c.put(e.request,cp));}
    return res;}).catch(()=>caches.match('index.html'))));
});
