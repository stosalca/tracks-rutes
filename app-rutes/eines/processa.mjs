// Processa les rutes de rutes/entrada/<carpeta>/ (GPX + ruta.json [+ guio.json]) amb el mateix codi de l'app
// (model del terreny, camins d'OSM i plans B) en un Chrome sense pantalla, i publica rutes/<carpeta>.json i rutes/index.json.
// L'executa la tasca automàtica de GitHub (.github/workflows/rutes.yml) quan hi ha canvis a rutes/entrada/.
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const ARREL=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ENTRADA=path.join(ARREL,'rutes','entrada'), SORTIDA=path.join(ARREL,'rutes');
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.webmanifest':'application/manifest+json'};

function servidor(){ return new Promise(ok=>{ const s=http.createServer((q,r)=>{ const f=path.join(ARREL,decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/,'')||'index.html');
  if(!f.startsWith(ARREL)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){ r.writeHead(404); r.end(); return; }
  r.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'}); fs.createReadStream(f).pipe(r); }).listen(0,'127.0.0.1',()=>ok(s)); }); }

export async function processa({ chromium, preparaCtx, forca=false, log=console.log }={}){
  if(!chromium) ({ chromium } = await import('playwright'));
  if(!fs.existsSync(ENTRADA)){ log('No hi ha rutes/entrada.'); return []; }
  const idxF=path.join(SORTIDA,'index.json'), idx=fs.existsSync(idxF)?JSON.parse(fs.readFileSync(idxF,'utf8')):{rutes:[]};
  const carpetes=fs.readdirSync(ENTRADA).filter(c=>fs.statSync(path.join(ENTRADA,c)).isDirectory());
  const srv=await servidor(), port=srv.address().port;
  const br=await chromium.launch(process.env.CHROME?{executablePath:process.env.CHROME,args:['--no-sandbox']}:{});
  const fetes=[];
  try{
    for(const c of carpetes){
      const dir=path.join(ENTRADA,c), gpx=fs.readdirSync(dir).filter(f=>/\.gpx$/i.test(f)).sort();
      if(!gpx.length){ log(`${c}: sense GPX, la salto.`); continue; }
      const conf=fs.existsSync(path.join(dir,'ruta.json'))?JSON.parse(fs.readFileSync(path.join(dir,'ruta.json'),'utf8')):{};
      const guio=fs.existsSync(path.join(dir,'guio.json'))?fs.readFileSync(path.join(dir,'guio.json'),'utf8'):null;
      const h=crypto.createHash('sha1'); gpx.forEach(f=>h.update(f).update(fs.readFileSync(path.join(dir,f)))); h.update(JSON.stringify(conf)); if(guio) h.update(guio);
      const hash=h.digest('hex').slice(0,12), id='pub-'+c.toLowerCase().replace(/[^a-z0-9]+/g,'-');
      const prev=idx.rutes.find(x=>x.id===id);
      if(prev&&prev.hash===hash&&!forca&&fs.existsSync(path.join(SORTIDA,prev.fitxer))){ log(`${c}: sense canvis.`); continue; }
      log(`${c}: processant ${gpx.join(', ')}…`);
      const ctx=await br.newContext(); if(preparaCtx) await preparaCtx(ctx);
      await ctx.route('**/rutes/index.json*',r=>r.abort()); // que l'app no es posi a baixar rutes publicades i recarregui la pàgina
      // heatmap de Strava des del servidor (al navegador no se'n poden llegir els píxels)
      await ctx.exposeFunction('__stravaTile',async(z,x,y)=>{ try{ const r=await fetch(`https://heatmap-external-a.strava.com/tiles/all/hot/${z}/${x}/${y}.png?px=256`,{headers:{'User-Agent':'Mozilla/5.0 petjada'}}); if(!r.ok){ log(`  [strava] ${z}/${x}/${y}: ${r.status}`); return null; } return Buffer.from(await r.arrayBuffer()).toString('base64'); }catch(e){ log('  [strava] '+e.message); return null; } });
      const pg=await ctx.newPage(); pg.on('console',m=>{ if(m.text().startsWith('PB:')) log('  '+m.text()); if(m.type()==='error'&&!/Failed to load resource/.test(m.text())) log('  [consola] '+m.text()); });
      await pg.goto(`http://127.0.0.1:${port}/index.html`); await pg.waitForFunction(()=>window.__core);
      const fitxers=gpx.map(f=>({name:f,text:fs.readFileSync(path.join(dir,f),'utf8')}));
      const r=await pg.evaluate(async({fitxers,conf,guio,id})=>{
        const C=window.__core, dies=C.preparaDies(fitxers), L=[];
        (conf.dies||[]).forEach((x,i)=>{ const d=dies[i]; if(!d) return; if(x.titol) d.titol=x.titol; if(x.data) d.data=x.data; if(x.sortida) d.sortida=x.sortida; if(x.objectiu) d.objectiu=x.objectiu; });
        let r=await C.creaRuta(conf.nom||dies[0].titol,dies,{dem:conf.dem!==false,pb:conf.plansB!==false,id},m=>{L.length=0;L.push(m);});
        if(guio) r=C.aplicaResposta(r,guio,{via:'Claude (xat)'});
        r.log=L[0]; return r; },{fitxers,conf,guio,id});
      await ctx.close();
      log('  '+(r.log||'').split('\n').join('\n  '));
      delete r.log; r.publicada=true; r.actualitzat=new Date().toISOString(); r.hash=hash;
      const fitxer=id+'.json'; fs.writeFileSync(path.join(SORTIDA,fitxer),JSON.stringify(r));
      idx.rutes=idx.rutes.filter(x=>x.id!==id).concat([{id,nom:r.nom,fitxer,actualitzat:r.actualitzat,hash,dies:r.dies.map(d=>({titol:d.titol,data:d.data}))}]);
      fetes.push(id);
    }
  } finally { await br.close(); srv.close(); }
  fs.writeFileSync(idxF,JSON.stringify(idx,null,1));
  return fetes;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  processa({forca:process.argv.includes('--forca')}).then(f=>console.log(f.length?`Publicades: ${f.join(', ')}`:'Res a publicar.')).catch(e=>{ console.error(e); process.exit(1); });
}
