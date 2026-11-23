const CACHE='catllaras-v14';
const TILES='catllaras-mapes-v1';
const FILES=['./','index.html','rutes.js','info.js','vessants.js','plansb.js','manifest.webmanifest','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES.map(f=>new Request(f,{cache:'reload'})))).then(()=>self.skipWaiting()))});
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
  // fitxers de l'app: primer la xarxa (així s'actualitza sola); sense cobertura, la còpia desada
  if(url.origin===location.origin){
    e.respondWith(ambTemps(e.request,4000).then(res=>{
      if(res.ok){const cp=res.clone();caches.open(CACHE).then(c=>c.put(e.request,cp));}
      return res;
    }).catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match('index.html'))));
  }
});
// xarxa amb temps màxim: si no respon, s'usa la còpia desada
function ambTemps(req,ms){return new Promise((ok,ko)=>{const t=setTimeout(()=>ko(new Error('temps')),ms);fetch(req.url,{cache:'no-cache'}).then(r=>{clearTimeout(t);ok(r)},e=>{clearTimeout(t);ko(e)})});}
