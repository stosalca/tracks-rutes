const CACHE='petjada-rutes-v53';
const RADAR='petjada-rutes-radar-v1';
const TILES='petjada-rutes-mapes-v1';
const FILES=['./','index.html','core.js','app.js','manifest.webmanifest','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES.map(f=>new Request(f,{cache:'reload'})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>(x.startsWith('petjada-rutes')||x==='rutes-v1')&&x!==CACHE&&x!==TILES&&x!==RADAR).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  // teselles dels mapes (ICGC, IGN): primer les desades; si no, xarxa i es desen
  if(url.hostname==='geoserveis.icgc.cat'||(url.hostname==='www.ign.es'&&url.pathname.startsWith('/wmts/'))||/^heatmap-external-[abc]\.strava\.com$/.test(url.hostname)){
    e.respondWith(caches.open(TILES).then(c=>c.match(e.request.url).then(r=>r||fetch(e.request).then(res=>{
      if(res.ok||res.type==='opaque') c.put(e.request.url,res.clone());
      return res;}).catch(()=>new Response('',{status:504})))));
    return;
  }
  // radar (RainViewer) i mapa de fons (Esri): es desen per veure l'últim radar sense cobertura
  if(url.hostname==='tilecache.rainviewer.com'||url.hostname==='server.arcgisonline.com'){
    e.respondWith(caches.open(RADAR).then(c=>c.match(e.request.url).then(r=>r||fetch(e.request.url,{mode:'no-cors'}).then(res=>{ if(res.ok||res.type==='opaque') c.put(e.request.url,res.clone()); return res; }).catch(()=>new Response('',{status:504})))));
    return;
  }
  // mapes de fronts del Met Office: els GIF no canvien mai (cada passada té la seva URL) → primer el desat; l'índex, primer la xarxa
  if(url.hostname==='data.consumer-digital.api.metoffice.gov.uk'){
    if(url.pathname.endsWith('.gif')) e.respondWith(caches.open(TILES).then(c=>c.match(e.request.url).then(r=>r||fetch(e.request).then(res=>{ if(res.ok||res.type==='opaque') c.put(e.request.url,res.clone()); return res; }).catch(()=>new Response('',{status:504})))));
    else e.respondWith(fetch(e.request).then(res=>{ if(res.ok){const cp=res.clone(); caches.open(TILES).then(c=>c.put(e.request.url,cp));} return res; }).catch(()=>caches.open(TILES).then(c=>c.match(e.request.url)).then(r=>r||new Response('',{status:504}))));
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
