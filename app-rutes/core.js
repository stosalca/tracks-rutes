// Petjada · app de rutes: biblioteca, importació de GPX, model del terreny, plans B i Claude.
// Tot s'executa al mòbil. Les dades de cada ruta es desen al navegador (localStorage).
"use strict";
(function(){
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rad=d=>d*Math.PI/180;
const hav=(a,b)=>{const R=6371000,p1=rad(a[0]),p2=rad(b[0]),dp=p2-p1,dl=rad(b[1]-a[1]);const x=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;return 2*R*Math.asin(Math.min(1,Math.sqrt(x)));};
const hores=(km,up,dn)=>km<=0?0:Math.max(km/3.5,up/300+dn/400)*1.2;
const wpx=(lat,lon,z)=>{const s=256*2**z,x=(lon+180)/360*s,sn=Math.sin(rad(lat));return [x,(0.5-Math.log((1+sn)/(1-sn))/(4*Math.PI))*s];};
const unwpx=(x,y,z)=>{const s=256*2**z,lon=x/s*360-180,n=Math.PI-2*Math.PI*y/s;return [180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))),lon];};
const fetchT=async(u,ms,opt={})=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{return await fetch(u,{...opt,signal:c.signal});}finally{clearTimeout(t);}};
const DS=['dg','dl','dt','dc','dj','dv','ds'];

// ---------- emmagatzematge ----------
const LIB='petjada-rutes-lib', ACT='petjada-ruta-activa', CONFK='petjada-rutes-conf';
const llegeix=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}};
const escriu=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const lib=()=>llegeix(LIB,[]);
const carregaRuta=id=>llegeix('petjada-ruta-'+id,null);
function desaRuta(r){
  escriu('petjada-ruta-'+r.id,r);
  const L=lib().filter(x=>x.id!==r.id); L.push({id:r.id,nom:r.nom,dies:r.dies.map(d=>({titol:d.titol,data:d.data})),creat:r.creat}); escriu(LIB,L);
}
// rutes publicades (preparades per Claude) que l'usuari ha esborrat del mòbil: no es tornen a baixar soles
const AMAG='petjada-rutes-amagades', amagades=()=>llegeix(AMAG,[]);
function esborraRuta(id){ const r0=carregaRuta(id); if(r0&&r0.publicada&&!amagades().some(x=>x.id===id)) escriu(AMAG,amagades().concat([{id,nom:r0.nom}]));
  localStorage.removeItem('petjada-ruta-'+id); ['st','meteo','serveis','serveis2','wiki'].forEach(k=>localStorage.removeItem('petjada-ruta-'+k+'-'+id)); escriu(LIB,lib().filter(x=>x.id!==id)); if(localStorage.getItem(ACT)===JSON.stringify(id)) localStorage.removeItem(ACT); }
window.CONF=llegeix(CONFK,{});

// ---------- GPX ----------
function llegeixGPX(text,nomFitxer){
  const x=new DOMParser().parseFromString(text.replace(/<extensions>[\s\S]*?<\/extensions>/g,''),'application/xml');
  if(x.querySelector('parsererror')) throw new Error(nomFitxer+': no és un GPX vàlid');
  const num=(el,t)=>{const e=el.getElementsByTagName(t)[0];return e?parseFloat(e.textContent):null;};
  const txt=(el,t)=>{const e=el.getElementsByTagName(t)[0];return e?e.textContent.trim():'';};
  const trks=[...x.getElementsByTagName('trk')].map((t,i)=>({nom:txt(t,'name')||nomFitxer.replace(/\.gpx$/i,''),
    pts:[...t.getElementsByTagName('trkpt')].map(p=>[+p.getAttribute('lat'),+p.getAttribute('lon'),num(p,'ele')])}))
    .filter(t=>t.pts.length>1);
  if(!trks.length){ // sense track: fem servir la ruta (rte)
    const r=[...x.getElementsByTagName('rtept')].map(p=>[+p.getAttribute('lat'),+p.getAttribute('lon'),num(p,'ele')]);
    if(r.length>1) trks.push({nom:nomFitxer.replace(/\.gpx$/i,''),pts:r});
  }
  const wpts=[...x.getElementsByTagName('wpt')].map(p=>({lat:+p.getAttribute('lat'),lon:+p.getAttribute('lon'),ele:num(p,'ele'),nom:txt(p,'name'),desc:txt(p,'desc')||txt(p,'cmt')}));
  return {trks,wpts};
}
function aprima(p,minD){ const o=[p[0]]; for(let i=1;i<p.length-1;i++) if(hav(o[o.length-1],p[i])>=minD) o.push(p[i]); o.push(p[p.length-1]); return o; }

// ---------- model del terreny (teselles Terrarium, obertes, a AWS) ----------
const DEMZ=13, DEM={};
async function carregaDEM(S,W,N,E,log){
  const [xa,ya]=wpx(N,W,DEMZ),[xb,yb]=wpx(S,E,DEMZ), tl=[];
  for(let x=Math.floor(xa/256);x<=Math.floor(xb/256);x++) for(let y=Math.floor(ya/256);y<=Math.floor(yb/256);y++) if(!DEM[x+'/'+y]) tl.push([x,y]);
  let fet=0, i=0, errors=0;
  const cv=document.createElement('canvas'); cv.width=cv.height=256; const cx=cv.getContext('2d',{willReadFrequently:true});
  const work=async()=>{ while(i<tl.length){ const [x,y]=tl[i++];
    try{ const r=await fetchT(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${DEMZ}/${x}/${y}.png`,20000); if(!r.ok) throw 0;
      const bm=await createImageBitmap(await r.blob()); cx.drawImage(bm,0,0); const d=cx.getImageData(0,0,256,256).data, a=new Float32Array(65536);
      for(let k=0;k<65536;k++) a[k]=d[k*4]*256+d[k*4+1]+d[k*4+2]/256-32768;
      DEM[x+'/'+y]=a; }catch(e){ errors++; }
    fet++; log&&log(`Model del terreny: ${fet}/${tl.length} teselles`); } };
  await Promise.all([work(),work(),work(),work()]);
  if(errors&&errors===tl.length) throw new Error('no s\'ha pogut descarregar el model del terreny');
}
function alt(lat,lon){ // interpolació bilineal
  const [px,py]=wpx(lat,lon,DEMZ), fx=px-0.5, fy=py-0.5, x0=Math.floor(fx), y0=Math.floor(fy), tx=fx-x0, ty=fy-y0;
  const v=(X,Y)=>{const a=DEM[Math.floor(X/256)+'/'+Math.floor(Y/256)]; return a?a[((Y%256)+256)%256*256+((X%256)+256)%256]:NaN;};
  const a=v(x0,y0),b=v(x0+1,y0),c=v(x0,y0+1),d=v(x0+1,y0+1);
  return (a*(1-tx)+b*tx)*(1-ty)+(c*(1-tx)+d*tx)*ty;
}
function pendentOrientacio(lat,lon){ // pendent (%) i orientació (cap on mira el vessant, graus)
  const h=45, dl=h/110540, dn=h/(111320*Math.cos(rad(lat)));
  const zx=(alt(lat,lon+dn)-alt(lat,lon-dn))/(2*h), zy=(alt(lat+dl,lon)-alt(lat-dl,lon))/(2*h);
  if(isNaN(zx)||isNaN(zy)) return null;
  return {sl:Math.round(Math.hypot(zx,zy)*100), asp:(Math.atan2(-zx,-zy)*180/Math.PI+360)%360};
}
const DIRS=['N','NE','E','SE','S','SO','O','NO'];
function vessantsDe(pts){
  const cd=[0]; for(let i=1;i<pts.length;i++) cd.push(cd[i-1]+hav(pts[i-1],pts[i]));
  const out=[]; let j=0;
  for(let d0=0; d0<cd[cd.length-1]; d0+=200){
    while(j<pts.length-1&&cd[j]<d0+100) j++;
    const p=pendentOrientacio(pts[j][0],pts[j][1]); if(!p) continue;
    const k=Math.round(p.asp/45)%8, dir=DIRS[k];
    const c=p.sl<8?'pla':['N','NE','NO'].includes(dir)?'obaga':['S','SE','SO'].includes(dir)?'solell':dir==='E'?'llevant':'ponent';
    const last=out[out.length-1];
    if(last&&last.c===c){ last.d1=Math.min(d0+200,cd[cd.length-1]); last.n++; last.sx+=Math.sin(rad(p.asp)); last.cx+=Math.cos(rad(p.asp)); last.ss+=p.sl; }
    else out.push({d0,d1:Math.min(d0+200,cd[cd.length-1]),c,n:1,sx:Math.sin(rad(p.asp)),cx:Math.cos(rad(p.asp)),ss:p.sl});
  }
  return out.map(s=>{const asp=(Math.atan2(s.sx,s.cx)*180/Math.PI+360)%360; return {d0:Math.round(s.d0),d1:Math.round(s.d1),c:s.c,dir:DIRS[Math.round(asp/45)%8],asp:Math.round(asp),sl:Math.round(s.ss/s.n)};});
}

// ---------- waypoints sobre el track ----------
function situaWaypoints(pts,wpts){
  const cd=[0]; for(let i=1;i<pts.length;i++) cd.push(cd[i-1]+hav(pts[i-1],pts[i]));
  const cand=[];
  wpts.forEach((w,wi)=>{ // mínims locals de distància (< 150 m): cada pas pel lloc
    let best=null;
    for(let i=0;i<pts.length;i++){ const d=hav([w.lat,w.lon],pts[i]);
      if(d<150){ if(!best||d<best.d) best={i,d}; }
      else if(best&&cd[i]-cd[best.i]>250){ cand.push({wi,...best}); best=null; } }
    if(best) cand.push({wi,...best}); });
  cand.sort((a,b)=>a.i-b.i);
  const ass=new Map(), usats=new Set();
  for(const c of cand){ if(ass.has(c.wi)) continue;
    if([...usats].some(i=>Math.abs(cd[i]-cd[c.i])<60)&&cand.some(o=>o.wi===c.wi&&o.i>c.i)) continue; // ja hi ha un punt en aquest pas: espera el següent pas
    ass.set(c.wi,c.i); usats.add(c.i); }
  let wp=[...ass.entries()].map(([wi,i])=>({i,w:wpts[wi]})).sort((a,b)=>a.i-b.i);
  if(!wp.length||cd[wp[0].i]>150) wp.unshift({i:0,w:{nom:'Inici'}}); else wp[0].i=0;
  const n=pts.length-1;
  if(cd[n]-cd[wp[wp.length-1].i]>150) wp.push({i:n,w:{nom:'Final'}}); else wp[wp.length-1].i=n;
  const codi=nm=>{ const m=nm.match(/^([A-Z]{1,3}\d{1,3}[a-z]?)[\s·.:\-–]+(.+)$/); return m?[m[1],m[2]]:[nm.length<=7?nm:'',nm]; };
  const explicits=new Set(wp.map(x=>codi((x.w.nom||'').trim())[0]).filter(Boolean)), usatsK=new Set(); let np=0;
  return wp.map((x,ix)=>{ const nm=(x.w.nom||'').trim(); let [k,nom]=codi(nm);
    if(k&&usatsK.has(k)){ let s2='b'; while(usatsK.has(k+s2)) s2=String.fromCharCode(s2.charCodeAt(0)+1); k=k+s2; }
    if(!k){ if(ix===0) k='Inici'; else if(ix===wp.length-1) k='Final'; else { do{ k='P'+(++np); }while(explicits.has(k)||usatsK.has(k)); } }
    usatsK.add(k);
    const n=(nom&&nom!==k?k+' · '+nom:k)+(x.w.desc&&x.w.desc!==nm?' · '+x.w.desc:'');
    return {i:x.i,k,n,desc:x.w.desc||''}; });
}

// ---------- punts automàtics (track sense waypoints) ----------
// Cims, colls, refugis i fonts d'OpenStreetMap a tocar del track; peu i dalt de les pujades i baixades fortes;
// punts de descans perquè cap tram passi de ~1 h 15 de marxa. Es tornen com a waypoints (lat, lon, nom, desc).
const TIPUS_POI={peak:'Cim',saddle:'Coll',hut:'Refugi',spring:'Font',view:'Mirador'};
function tipusPOI(cl,sub,nom){ const s=(cl+' '+sub).toLowerCase(), n=(nom||'').toLowerCase();
  if(/alpine_hut|wilderness_hut|shelter|hut/.test(s)||/refug|cabana|cabaña|xalet|abric|bivac/.test(n)) return 'hut';
  if(/spring|drinking_water|water_point/.test(s)||/^(font|fuente|fontaine)\b/.test(n)) return 'spring';
  if(/viewpoint/.test(s)) return 'view';
  return null; }
function puntsAuto(pts,pois){
  const st=estat(pts), n=pts.length, cd=st.cd, z=pts.map(p=>p[2]), out=[];
  const hT=(a,b)=>hores((cd[b]-cd[a])/1000,st.cu[b]-st.cu[a],st.cn[b]-st.cn[a]);
  const idxD=d=>{ let lo=0,hi=n-1; while(lo<hi){const m=(lo+hi)>>1; if(cd[m]<d) lo=m+1; else hi=m;} return lo; };
  // 1) llocs d'OpenStreetMap a menys de 80 m del track
  for(const q of pois||[]){ let b=-1,bd=80; for(let i=0;i<n;i+=1){ const d=hav([q.lat,q.lon],pts[i]); if(d<bd){bd=d;b=i;} }
    if(b<0) continue; const t=TIPUS_POI[q.t]||'';
    const nom=q.nom?(q.nom.toLowerCase().startsWith(t.toLowerCase())||q.t==='peak'||q.t==='saddle'?q.nom:t+' '+q.nom):t;
    out.push({i:b,pri:q.t==='hut'?5:q.t==='peak'||q.t==='saddle'?4:q.t==='spring'?3:2,nom,desc:q.t==='spring'?'Font: comprova si raja abans de comptar-hi':q.ele?Math.round(q.ele)+' m':''}); }
  // 2) pujades i baixades fortes (≥ 150 m de desnivell amb pendent mitjà ≥ 12 %)
  // trams drets: on els 400 m següents guanyen (o perden) ≥ 15 %; s'ajunten els consecutius i es queden els de ≥ 100 m de desnivell
  const trams=sg=>{ const y=z.map(v=>v*sg), L=[]; let j=0, bl=null;
    for(let i=0;i<n;i++){ while(j<n-1&&cd[j]-cd[i]<400) j++; const dret=cd[j]-cd[i]>=200&&(y[j]-y[i])/(cd[j]-cd[i])>=0.15;
      if(dret){ if(!bl) bl={s:i,f:j}; else bl.f=Math.max(bl.f,j); }
      else if(bl&&i>bl.f&&cd[i]-cd[bl.f]>300){ L.push(bl); bl=null; } }
    if(bl) L.push(bl);
    return L.map(b=>{ let e=b.s; for(let k=b.s;k<=b.f;k++) if(y[k]>y[e]) e=k; return {s:b.s,e,g:Math.round(y[e]-y[b.s]),d:cd[e]-cd[b.s]}; }).filter(c=>c.g>=100&&c.d>0); };
  for(const c of trams(1)){ const pc=Math.round(c.g/c.d*100);
    out.push({i:c.s,pri:3,nom:'Peu de pujada forta',desc:`+${c.g} m en ${(c.d/1000).toFixed(1).replace('.',',')} km (${pc} %): treure capa, beure i agrupar`});
    if(c.g>=150) out.push({i:c.e,pri:2,nom:'Dalt de la pujada',desc:'Agrupar el grup i abrigar-se si fa vent'}); }
  for(const c of trams(-1)){ const pc=Math.round(c.g/c.d*100);
    out.push({i:c.s,pri:2,nom:'Inici de baixada forta',desc:`−${c.g} m en ${(c.d/1000).toFixed(1).replace('.',',')} km (${pc} %): bastons, ritme pautat`}); }
  // 3) treure repetits (< 250 m): es queda el de més prioritat
  out.sort((a,b)=>b.pri-a.pri); const sel=[];
  for(const c of out){ if(c.i<=0||c.i>=n-1) continue; if(cd[c.i]<200||cd[n-1]-cd[c.i]<200) continue;
    if(sel.some(s=>Math.abs(cd[s.i]-cd[c.i])<250)) continue; sel.push(c); }
  sel.sort((a,b)=>a.i-b.i);
  // 4) punts de descans: cap tram de més de 1 h 15 de marxa (es parteix cap a la meitat, en un lloc poc dret)
  const talls=[0,...sel.map(s=>s.i),n-1]; let canvi=true, guard=0;
  while(canvi&&guard++<40){ canvi=false;
    for(let k=0;k<talls.length-1;k++){ const a=talls[k], b=talls[k+1], h=hT(a,b); if(h<=1.25) continue;
      const parts=Math.ceil(h/1.0); let best=-1, bs=1e9;
      for(let i=a+1;i<b;i++){ const f=hT(a,i)/h; if(Math.abs(f-1/parts)>0.12) continue;
        const j=idxD(cd[i]+60), sl=Math.abs(z[Math.min(j,n-1)]-z[i])/Math.max(1,cd[Math.min(j,n-1)]-cd[i]); const sc=sl+Math.abs(f-1/parts);
        if(sc<bs){bs=sc;best=i;} }
      if(best<0) best=idxD(cd[a]+(cd[b]-cd[a])/parts);
      sel.push({i:best,pri:1,nom:'Punt de descans',desc:`Parada curta: ${hm0(hT(0,best))} de marxa des de l'inici`}); talls.splice(k+1,0,best); canvi=true; break; } }
  sel.sort((a,b)=>a.i-b.i);
  return sel.map(s=>({lat:pts[s.i][0],lon:pts[s.i][1],nom:s.nom,desc:s.desc,auto:true}));
}
const hm0=h=>{ const t=Math.round(h*60); return Math.floor(t/60)+' h '+String(t%60).padStart(2,'0'); };
// cruïlles del pla A amb camins que en surten (per buscar-hi plans B), una cada 400 m com a molt
function cruillesTrack(G,tn,pts){ const st=estat(pts), out=[], tset=new Set(tn); let last=-1e9;
  tn.forEach((v,i)=>{ if(i<2||i>pts.length-3) return;
    const surt=G.adj[v].some(([u])=>!tset.has(u)&&G.adj[u].filter(([,,t])=>t!==5).length>=3);
    if(!surt||st.cd[i]-last<400) return; out.push(i); last=st.cd[i]; });
  return out; }

// ---------- camins d'OpenStreetMap (teselles vectorials d'OpenFreeMap) ----------
function llegeixMVT(buf){
  const u=new Uint8Array(buf); let p=0;
  const vint=()=>{let r=0,m=1,b; do{b=u[p++]; r+=(b&127)*m; m*=128;}while(b&128); return r;};
  const salta=t=>{ if(t===0) vint(); else if(t===1) p+=8; else if(t===2){const l=vint(); p+=l;} else if(t===5) p+=4; };
  const str=(a,b)=>new TextDecoder().decode(u.subarray(a,b));
  const packed=()=>{const l=vint(),e=p+l,o=[]; while(p<e) o.push(vint()); return o;};
  const layers=[];
  while(p<u.length){ const k=vint(), f=k>>3, t=k&7;
    if(f===3&&t===2){ const l=vint(), e=p+l, L={name:'',keys:[],vals:[],feats:[],extent:4096};
      while(p<e){ const k2=vint(), f2=k2>>3, t2=k2&7;
        if(f2===1){const l2=vint(); L.name=str(p,p+l2); p+=l2;}
        else if(f2===3){const l2=vint(); L.keys.push(str(p,p+l2)); p+=l2;}
        else if(f2===5) L.extent=vint();
        else if(f2===4){ const l2=vint(), e2=p+l2; let v=null;
          while(p<e2){ const k3=vint(), f3=k3>>3, t3=k3&7;
            if(f3===1){const l3=vint(); v=str(p,p+l3); p+=l3;} else if(t3===0){ const r=vint(); v=f3===6?((r%2)?-(r+1)/2:r/2):r; } else salta(t3); }
          L.vals.push(v); }
        else if(f2===2){ const l2=vint(), e2=p+l2, F={tags:[],type:0,geom:[]};
          while(p<e2){ const k3=vint(), f3=k3>>3, t3=k3&7;
            if(f3===2) F.tags=packed(); else if(f3===3) F.type=vint(); else if(f3===4) F.geom=packed(); else salta(t3); }
          L.feats.push(F); }
        else salta(t2);
      }
      layers.push(L);
    } else salta(t);
  }
  return layers;
}
function liniesMVT(g){ const out=[]; let x=0,y=0,i=0,cur=null; const zz=n=>(n>>>1)^-(n&1);
  while(i<g.length){ const c=g[i++], cmd=c&7, n=c>>3;
    for(let j=0;j<n;j++){ if(cmd===7) continue; x+=zz(g[i++]); y+=zz(g[i++]); if(cmd===1){ cur=[x,y]; out.push(cur); } else cur.push(x,y); } }
  return out; }
// 0 carretera principal, 1 carretera local/camí asfaltat, 2 pista, 3 corriol, 4 escales
function tipusOFM(cl,sub){
  if(/^(motorway|trunk|primary|secondary|tertiary)$/.test(cl)) return 0;
  if(cl==='minor'||cl==='service') return 1;
  if(cl==='track') return 2;
  if(cl==='path') return sub==='steps'?4:3;
  return -1;
}
async function camins(S,W,N,E,log){
  const tj=await (await fetchT('https://tiles.openfreemap.org/planet',20000)).json();
  const tpl=tj.tiles[0], Z=14, [xa,ya]=wpx(N,W,Z), [xb,yb]=wpx(S,E,Z), tls=[];
  for(let x=Math.floor(xa/256);x<=Math.floor(xb/256);x++) for(let y=Math.floor(ya/256);y<=Math.floor(yb/256);y++) tls.push([x,y]);
  const ways=[], pois=[]; let fet=0, i=0; ways.pois=pois;
  const work=async()=>{ while(i<tls.length){ const [tx,ty]=tls[i++];
    const r=await fetchT(tpl.replace('{z}',Z).replace('{x}',tx).replace('{y}',ty),20000); if(!r.ok) throw new Error('tesella '+r.status);
    for(const L of llegeixMVT(await r.arrayBuffer())){
      if(L.name==='mountain_peak'||L.name==='poi'){ // cims, colls, refugis, fonts
        const tag=(F,k)=>{ const ki=L.keys.indexOf(k); if(ki<0) return ''; for(let j=0;j<F.tags.length;j+=2) if(F.tags[j]===ki) return L.vals[F.tags[j+1]]; return ''; };
        for(const F of L.feats){ if(F.type!==1) continue; const cl=String(tag(F,'class')||''), sub=String(tag(F,'subclass')||''), nom=String(tag(F,'name')||tag(F,'name:latin')||'');
          const t=L.name==='mountain_peak'?(/saddle/.test(cl)?'saddle':/peak|volcano/.test(cl)?'peak':null):tipusPOI(cl,sub,nom); if(!t) continue;
          for(const pt of liniesMVT(F.geom)){ const s2=256/L.extent, [lat,lon]=unwpx((tx*L.extent+pt[0])*s2,(ty*L.extent+pt[1])*s2,Z); pois.push({t,nom,lat,lon,ele:+tag(F,'ele')||null}); } }
        continue; }
      if(L.name!=='transportation') continue;
      const ki=L.keys.indexOf('class'), si=L.keys.indexOf('subclass');
      for(const F of L.feats){ if(F.type!==2) continue; let cl='',sub='';
        for(let j=0;j<F.tags.length;j+=2){ if(F.tags[j]===ki) cl=L.vals[F.tags[j+1]]; else if(F.tags[j]===si) sub=L.vals[F.tags[j+1]]; }
        const t=tipusOFM(cl,sub); if(t<0) continue;
        for(const ln of liniesMVT(F.geom)){ const g=[]; // coordenades globals enteres (reixa de 4096 per tesella): els nodes compartits coincideixen
          for(let k=0;k<ln.length;k+=2) g.push(tx*L.extent+ln[k], ty*L.extent+ln[k+1]);
          if(g.length>=4) ways.push({t,g,ext:L.extent}); } } }
    fet++; log&&log(`Camins d'OpenStreetMap: ${fet}/${tls.length} teselles`); } };
  await Promise.all([work(),work(),work()]);
  return ways;
}

// ---------- graf de camins i plans B ----------
function nouGraf(){ return {id:new Map(), ll:[], z:[], adj:[], t:[]}; }
function node(G,key,lat,lon){ let i=G.id.get(key); if(i==null){ i=G.ll.length; G.id.set(key,i); G.ll.push([lat,lon]); G.z.push(alt(lat,lon)); G.adj.push([]); } return i; }
function aresta(G,a,b,t){ if(a===b) return; const d=Math.max(0.5,hav(G.ll[a],G.ll[b])); G.adj[a].push([b,d,t]); G.adj[b].push([a,d,t]); }
const FT=[3,1.05,1,1.03,1.25,1]; // penalització per tipus (0 carretera principal … 5 track del pla A)
function cost(G,a,b,d,t){ const dz=(G.z[b]-G.z[a])||0, up=Math.max(0,dz), dn=Math.max(0,-dz), g=Math.abs(dz)/d;
  return Math.max(d/3500, up/300+dn/400)*FT[t]*(g>0.45?2:g>0.3?1.3:1); }
function dijkstra(G,src,stop,pen){ // stop(i) → true per aturar-se en aquell node
  const n=G.ll.length, D=new Float64Array(n).fill(Infinity), P=new Int32Array(n).fill(-1), T=new Int8Array(n).fill(-1), H=[[0,src]]; D[src]=0;
  const push=(x)=>{H.push(x); let i=H.length-1; while(i>0){const p=(i-1)>>1; if(H[p][0]<=H[i][0]) break; [H[p],H[i]]=[H[i],H[p]]; i=p;}};
  const pop=()=>{const r=H[0], l=H.pop(); if(H.length){H[0]=l; let i=0; for(;;){const a=2*i+1,b=a+1; let m=i; if(a<H.length&&H[a][0]<H[m][0]) m=a; if(b<H.length&&H[b][0]<H[m][0]) m=b; if(m===i) break; [H[m],H[i]]=[H[i],H[m]]; i=m;}} return r;};
  while(H.length){ const [d,u]=pop(); if(d>D[u]) continue; if(stop&&stop(u)) return {D,P,T,fi:u};
    for(const [v,len,t] of G.adj[u]){ const nd=d+cost(G,u,v,len,t)*(pen&&pen.has(u<v?u+','+v:v+','+u)?4:1); if(nd<D[v]){ D[v]=nd; P[v]=u; T[v]=t; push([nd,v]); } } }
  return {D,P,T,fi:-1};
}
function cami(R,dst){ const o=[]; for(let v=dst; v!==-1; v=R.P[v]) o.push(v); return o.reverse(); }
function estat(pts){ const cd=[0],cu=[0],cn=[0]; let ref=pts[0][2];
  for(let i=1;i<pts.length;i++){ cd.push(cd[i-1]+hav(pts[i-1],pts[i])); cu.push(cu[i-1]); cn.push(cn[i-1]); const e=pts[i][2];
    if(e-ref>=5){cu[i]+=e-ref;ref=e}else if(ref-e>=5){cn[i]+=ref-e;ref=e} }
  return {cd,cu,cn}; }
function hA(st,i0,i1){ return hores((st.cd[i1]-st.cd[i0])/1000,st.cu[i1]-st.cu[i0],st.cn[i1]-st.cn[i0]); }

// Criteris dels plans B, apresos amb les valoracions d'en Sergi (vegeu CRITERIS-PLANS-B.md)
const CRIT_PB={
  maxPerDia:4, minPerDia:2, // entre 2 i 4 plans B per dia, els millors
  pendentMax:60,         // un pla B no pot tenir trams de més del 60 % de pendent (camí dret o perillós; el model del terreny exagera a prop dels cingles)
  stravaMin:0.5,         // el tram fora del pla A ha de ser almenys la meitat de transitat que el pla A (intensitat mitjana del heatmap de Strava)
  accesProper:1/3,       // si pel mateix pla A hi ha un poble o carretera a ≤ 20 min, en aquesta cruïlla no cal pla B
  dreceraMinH:0.5,       // una drecera ha d'estalviar ≥ 30 min…
  dreceraMinFrac:0.2,    // …i ≥ 20 % del que queda
  refugiSiAccesH:1,      // refugi només si l'accés amb vehicle (pel pla A o per un pla B) és a més d'1 h
  vehicleMinGuany:0.5    // sortida a vehicle: ha de ser ≥ 30 min més ràpida que arribar a un accés pel pla A
};
// ---------- Strava: és un camí transitat? ----------
// teselles públiques del heatmap (fins al zoom 12, ~30 m per píxel). Al mòbil el navegador no deixa llegir-ne els píxels (CORS);
// la tasca de GitHub les baixa des del servidor (window.__stravaTile) i al mòbil es prova directament i, si no es pot, no es comprova.
const STV={}; let STZ=12;
async function stravaTile(x,y){ const k=x+'/'+y; if(k in STV) return STV[k];
  STV[k]=(async()=>{ try{ let blob;
      if(window.__stravaTile){ const b64=await window.__stravaTile(STZ,x,y); if(!b64) return null; blob=await (await fetch('data:image/png;base64,'+b64)).blob(); }
      else { const a=stravaClaus(); const u=a?`https://heatmap-external-a.strava.com/tiles-auth/all/hot/${STZ}/${x}/${y}.png?px=256&Key-Pair-Id=${a.k}&Policy=${a.p}&Signature=${a.s}`:`https://heatmap-external-a.strava.com/tiles/all/hot/${STZ}/${x}/${y}.png?px=256`;
        const r=await fetchT(u,15000,{mode:'cors'}); if(!r.ok) return null; blob=await r.blob(); }
      const bm=await createImageBitmap(blob), cv=new OffscreenCanvas(256,256), cx=cv.getContext('2d'); cx.drawImage(bm,0,0,256,256);
      return cx.getImageData(0,0,256,256).data; }catch(e){ return null; } })();
  return STV[k]; }
function stravaClaus(){ try{ const o=JSON.parse(localStorage.getItem('petjada-strava')); return o&&o.k&&o.p&&o.s?o:null; }catch(e){ return null; } }
async function stravaZoom(){ // amb claus de Strava (mòbil o tasca de GitHub) es mira de prop (zoom 15, ~4 m per píxel)
  if(window.__stravaAuth? await window.__stravaAuth() : stravaClaus()) STZ=15; else STZ=12; }
async function stravaPunt(lat,lon){ const n=2**STZ, X=(lon+180)/360*n, s=Math.sin(lat*Math.PI/180), Y=(0.5-Math.log((1+s)/(1-s))/(4*Math.PI))*n;
  const tx=Math.floor(X), ty=Math.floor(Y), px=Math.floor((X-tx)*256), py=Math.floor((Y-ty)*256); const d=await stravaTile(tx,ty); if(!d) return null;
  let m=0; const R=STZ>=15?2:0; for(let a=-R;a<=R;a++) for(let b=-R;b<=R;b++){ const xx=Math.min(255,Math.max(0,px+a)), yy=Math.min(255,Math.max(0,py+b)); m=Math.max(m,d[(yy*256+xx)*4+3]); } return m/255; }
// fracció del tram (cada ~60 m) amb passades a Strava; null si no es pot comprovar
async function stravaTram(pts){ let n=0,ok=0,acc=0; for(let i=0;i<pts.length;i++){ if(i&&i<pts.length-1&&hav(pts[i],pts[Math.max(0,i-1)])<60&&i%3) continue;
    const v=await stravaPunt(pts[i][0],pts[i][1]); if(v==null) return null; n++; if(v>0.05) ok++; acc+=v; } return n?{f:ok/n,m:acc/n}:null; }

async function plansBDia(G,dia,trackNodes,extra={}){
  const pts=dia.pts, n=pts.length, st=estat(pts), fi=trackNodes[n-1], ini=trackNodes[0];
  // per cada punt de la ruta: el node del graf més proper (els nodes del track hi són sempre)
  const prop=i=>trackNodes[i];
  const GC=0.0006, grid=new Map(); pts.forEach((p,i)=>{ const k=Math.floor(p[0]/GC)+','+Math.floor(p[1]/GC); (grid.get(k)||grid.set(k,[]).get(k)).push(i); });
  const aprop=(ll,maxD,minI=-1)=>{ let b=-1,bd=maxD; const ci=Math.floor(ll[0]/GC), cj=Math.floor(ll[1]/GC);
    for(let a=-1;a<=1;a++) for(let c=-1;c<=1;c++) for(const i of grid.get((ci+a)+','+(cj+c))||[]){ if(i<minI) continue; const d=hav(ll,pts[i]); if(d<bd){bd=d;b=i;} } return b; };
  // punts del pla A a tocar d'una carretera o camí asfaltat (pobles, accessos): inici i final inclosos
  const AC=0.0006, acg=new Map(); G.ll.forEach((p,u)=>{ if(!G.adj[u].some(([,,t])=>t<=1)) return; const k=Math.floor(p[0]/AC)+','+Math.floor(p[1]/AC); (acg.get(k)||acg.set(k,[]).get(k)).push(p); });
  const acces=[]; for(let i=0;i<n;i+=3){ const p=pts[i], ci=Math.floor(p[0]/AC), cj=Math.floor(p[1]/AC); let ok=false;
    for(let a=-1;a<=1&&!ok;a++) for(let c2=-1;c2<=1&&!ok;c2++) for(const q of acg.get((ci+a)+','+(cj+c2))||[]) if(hav(p,q)<80){ok=true;break;} if(ok) acces.push(i); }
  if(!acces.includes(0)) acces.unshift(0); if(!acces.includes(n-1)) acces.push(n-1);
  const accesPlaA=i0=>Math.min(...acces.map(j=>j>=i0?hA(st,i0,j):hores((st.cd[i0]-st.cd[j])/1000,st.cn[i0]-st.cn[j],st.cu[i0]-st.cu[j])));
  const cands=[];
  const decisions=dia.wp.filter(w=>w.i>0&&w.i<n-1).map(w=>w.i);
  for(const i of extra.cruilles||[]) if(!decisions.some(j=>Math.abs(st.cd[j]-st.cd[i])<150)) decisions.push(i);
  decisions.sort((a,b)=>a-b);
  if(decisions.length<2){ for(let i=1;i<6;i++) decisions.push(Math.round(i*(n-1)/6)); }
  // refugis a prop però fora del track: possibles destinacions de pla B (per fer-hi nit o protegir-se)
  const refs=[]; { const C=0.0008, cell=new Map(); G.ll.forEach((p,i)=>{ if(!G.adj[i].length) return; const k=Math.floor(p[0]/C)+','+Math.floor(p[1]/C); (cell.get(k)||cell.set(k,[]).get(k)).push(i); });
    for(const q of (extra.pois||[]).filter(q=>q.t==='hut')){ if(aprop([q.lat,q.lon],200)>=0) continue;
      let b=-1,bd=80; const ci=Math.floor(q.lat/C), cj=Math.floor(q.lon/C);
      for(let a=-1;a<=1;a++) for(let c=-1;c<=1;c++) for(const u of cell.get((ci+a)+','+(cj+c))||[]){ const d=hav([q.lat,q.lon],G.ll[u]); if(d<bd){bd=d;b=u;} }
      if(b>=0&&!refs.some(r=>hav([r.q.lat,r.q.lon],[q.lat,q.lon])<300)) refs.push({q,node:b}); } }
  for(const i0 of decisions){
    const hRest=hA(st,i0,n-1); if(hRest<0.75) continue; // a menys de ~45 min del final no cal pla B
    const hAcc=accesPlaA(i0), aProp=hAcc<=CRIT_PB.accesProper; // al costat d'un poble o carretera: poc valor (només si no n'hi ha de millors)
    let hVehAqui=Infinity;
    // 1) cap al final de la ruta pel camí més ràpid · 2) cap a la carretera/pista asfaltada més propera (accés amb vehicle)
    const R1=dijkstra(G,prop(i0));

    const opcions=[];
    if(R1.D[fi]<Infinity){ const c1=cami(R1,fi); opcions.push({tipus:'final',nodes:c1});
      // segona alternativa: penalitzem el camí trobat (i el pla A) i tornem a buscar
      // penalitzem tot el que passa a menys de 20 m del tros del primer camí que surt del pla A
      const fora=c1.filter(v=>aprop(G.ll[v],25)<0), PC=0.00025, pg=new Map(); fora.forEach(v=>{ const p=G.ll[v], k=Math.floor(p[0]/PC)+','+Math.floor(p[1]/PC); (pg.get(k)||pg.set(k,[]).get(k)).push(p); });
      const aProp=p=>{ const ci=Math.floor(p[0]/PC), cj=Math.floor(p[1]/PC); for(let a=-1;a<=1;a++) for(let c=-1;c<=1;c++) for(const q of pg.get((ci+a)+','+(cj+c))||[]) if(hav(p,q)<20) return true; return false; };
      const pen=new Set(); if(fora.length) G.adj.forEach((ed,u)=>{ if(!aProp(G.ll[u])) return; for(const [v] of ed) if(aProp(G.ll[v])) pen.add(u<v?u+','+v:v+','+u); });
      const R1b=dijkstra(G,prop(i0),null,pen); if(R1b.D[fi]<Infinity) opcions.push({tipus:'final',nodes:cami(R1b,fi)}); }
    if(hav(pts[0],pts[n-1])>300&&R1.D[ini]<Infinity) opcions.push({tipus:'inici',nodes:cami(R1,ini)});
    const R2=dijkstra(G,prop(i0),u=>G.adj[u].some(([,,t])=>t<=1)&&aprop(G.ll[u],150)<0);
    if(R2.fi>=0) opcions.push({tipus:'vehicle',nodes:cami(R2,R2.fi)});
    { const rr=refs.filter(r=>R1.D[r.node]<Infinity).sort((a,b)=>R1.D[a.node]-R1.D[b.node])[0];
      if(rr) opcions.push({tipus:'refugi',nodes:cami(R1,rr.node),ref:rr.q.nom?(/refug|cabana|cabaña|xalet|abric/i.test(rr.q.nom)?rr.q.nom:'Refugi '+rr.q.nom):'refugi o cabana (sense nom a OpenStreetMap)'}); }
    for(const o of opcions){
      const ll=o.nodes.map(v=>[G.ll[v][0],G.ll[v][1],Math.round(G.z[v])]);
      // on es separa del pla A i, si hi torna, on hi torna
      const onA=ll.map(p=>{ const j=aprop(p,25); return j; });
      let s=0; while(s<onA.length-1&&onA[s+1]>=0&&onA[s+1]>=i0-5) s++;
      let e=onA.length-1, ib=null;
      if(o.tipus==='final'){ const onB=ll.map(p=>aprop(p,25,i0+1)); // on torna al pla A (després de la cruïlla)
        while(e>s&&onB[e-1]>=0) e--; ib=onB[e]>=0?onB[e]:n-1; if(o.nodes[o.nodes.length-1]===fi&&e===onA.length-1) ib=n-1; }
      const ia=Math.max(i0,onA[s]>=0?onA[s]:i0);
      const DBG=window.__dbg?(m=>console.log('PB '+dia.key+' i0='+i0+' '+o.tipus+' '+m)):()=>{};
      DBG(`nodes=${ll.length} s=${s} e=${e} ia=${ia} ib=${ib} onA0=${onA[0]} onAend=${onA[onA.length-1]}`);
      const tram=ll.slice(s,e+1); if(tram.length<3) {DBG('curt');continue;}
      const S=estat(tram), km=S.cd[S.cd.length-1]/1000, up=S.cu[S.cu.length-1], dn=S.cn[S.cn.length-1];
      if(km<0.15) {DBG('km');continue;}
      const hB=hores(km,up,dn)+(ib!=null?hA(st,ib,n-1):0), hAr=hA(st,ia,n-1);
      DBG(`hB=${hB.toFixed(2)} hAr=${hAr.toFixed(2)} km=${km.toFixed(2)}`);
      if(o.tipus==='final'&&(ib==null||ib<=ia+3)) continue;
      if(o.tipus==='final'&&!(hAr-hB>=CRIT_PB.dreceraMinH&&hAr-hB>=CRIT_PB.dreceraMinFrac*hAr)) continue; // ha d'estalviar temps de veritat
      const kmA=(st.cd[n-1]-st.cd[ia])/1000, upA=st.cu[n-1]-st.cu[ia];
      const kmB=km+(ib!=null?(st.cd[n-1]-st.cd[ib])/1000:0), upB=up+(ib!=null?st.cu[n-1]-st.cu[ib]:0);
      if((o.tipus==='final'||o.tipus==='inici')&&(kmB>kmA||upB>upA+20)) continue; // ni més llarg ni més desnivell que seguir el pla A
      const hO=hores(km,up,dn);
      if(o.tipus==='vehicle'){ hVehAqui=Math.min(hVehAqui,hO); if(!(hO<hAr*0.8&&hAcc-hO>=CRIT_PB.vehicleMinGuany)) continue; }
      if(o.tipus==='refugi'&&!(hO<hAr*0.9&&hO<3&&Math.min(hAcc,hVehAqui)>CRIT_PB.refugiSiAccesH)) continue;
      if(o.tipus==='inici'&&!(hO<=hAr-CRIT_PB.dreceraMinH)) continue; // tornar enrere val si és clarament millor que seguir
      // composició del camí i pendent màxima
      const mix=[0,0,0,0,0,0]; let pmax=0;
      for(let k=s+1;k<=e;k++){ const a=o.nodes[k-1], b=o.nodes[k], ed=G.adj[a].find(x=>x[0]===b); const d=hav(G.ll[a],G.ll[b]); if(ed) mix[ed[2]]+=d; }
      for(let k=0,j=0;k<tram.length;k++){ while(j<tram.length-1&&S.cd[j]-S.cd[k]<60) j++; const d=S.cd[j]-S.cd[k]; if(d>40) pmax=Math.max(pmax,Math.abs(tram[j][2]-tram[k][2])/d*100); }
      const tot=mix.reduce((a,b)=>a+b,0)||1, mid=tram[Math.floor(tram.length/2)];
      if(pmax>CRIT_PB.pendentMax&&o.tipus!=='refugi') {DBG('massa dret');continue;}
      cands.push({tipus:o.tipus,ref:o.ref,ia,ib:o.tipus==='final'?ib:null,pts:tram.map(p=>[+p[0].toFixed(6),+p[1].toFixed(6),p[2]]),km:+km.toFixed(3),up:Math.round(up),dn:Math.round(dn),
        estalvi:hAr-hB,valor:(o.tipus==='final'?hAr-hB:o.tipus==='vehicle'?hAcc-hO:o.tipus==='refugi'?Math.min(hAr-hO,2):hAr-hO)*(aProp?0.3:1),fora:tram.filter(p=>aprop(p,30)<0),q:{pista:Math.round((mix[1]+mix[2])/tot*100),corriol:Math.round((mix[3]+mix[4])/tot*100),carretera:Math.round(mix[0]/tot*100),plaA:Math.round(mix[5]/tot*100),pmax:Math.round(pmax),
        strava:`https://www.strava.com/maps/global-heatmap?sport=Run&style=standard#15/${mid[0].toFixed(5)}/${mid[1].toFixed(5)}`}});
    }
  }
  // treure repetits: mateix destí i traçat semblant → ens quedem el de la cruïlla més tardana
  const sem=(a,b)=>{ if(a.tipus!==b.tipus||a.ref!==b.ref) return false; let c=0; for(const p of a.pts){ if(b.pts.some(q=>hav(p,q)<30)) c++; } return c/a.pts.length>0.6; };
  cands.sort((a,b)=>b.ia-a.ia);
  const tri=[]; for(const c of cands) if(!tri.some(t=>sem(c,t)||sem(t,c))) tri.push(c);
  // camí transitat (Strava): el tram fora del pla A ha de tenir passades
  await stravaZoom();
  const svA=await stravaTram(pts.filter((p,i)=>i%2===0));
  for(const t of tri){ const sv=t.fora.length>=2?await stravaTram(t.fora):null; t.sv=sv; t.transit=sv&&svA?Math.min(1,sv.m/(svA.m||1)):null; t.q.strava_pct=t.transit==null?null:Math.round(t.transit*100); }
  console.log(`PB: ${dia.key} strava z${STZ} pla A f=${svA&&svA.f.toFixed(2)} m=${svA&&svA.m.toFixed(3)}`);
  tri.forEach(t=>console.log(`PB: ${dia.key} ${t.tipus} ia=${t.ia} valor=${t.valor.toFixed(2)} km=${t.km} transitat=${t.transit==null?'?':Math.round(t.transit*100)+'%'} f=${t.sv&&t.sv.f.toFixed(2)} m=${t.sv&&t.sv.m.toFixed(3)}`));
  const bo=tri.filter(t=>t.transit==null||t.transit>=CRIT_PB.stravaMin);
  // els més bons: més temps guanyat; com a molt un de cada tipus a la mateixa cruïlla; entre 2 i 4
  bo.sort((a,b)=>(b.valor+(b.transit||0)*0.2)-(a.valor+(a.transit||0)*0.2)); const sel=[]; for(const t of bo){ if(sel.length>=CRIT_PB.maxPerDia) break; if(sel.some(s=>s.ia===t.ia&&s.tipus===t.tipus)) continue; sel.push(t); }
  tri.length=0; tri.push(...sel);
  tri.sort((a,b)=>a.ia-b.ia);
  const nomP=i=>{ const w=[...dia.wp].reverse().find(x=>x.i<=i); const d=st.cd[i]-st.cd[w.i]; return d<80?w.k:`${w.k} + ${(d/1000).toFixed(1).replace('.',',')} km`; };
  return nomenaPB(tri.slice(0,CRIT_PB.maxPerDia).map((c,j)=>({id:'B'+(j+1),tipus:c.tipus,ia:c.ia,ib:c.ib,pts:c.pts,km:c.km,up:c.up,dn:c.dn,q:c.q,ref:c.ref})),dia);
}
function nomenaPB(L,dia){ const st=estat(dia.pts);
  const nomP=i=>{ const w=[...dia.wp].reverse().find(x=>x.i<=i); const d=st.cd[i]-st.cd[w.i]; return d<80?w.k:`${w.k} + ${(d/1000).toFixed(1).replace('.',',')} km`; };
  return L.map(c=>({...c,
    fi:c.tipus==='final'?undefined:c.tipus==='inici'?'Inici':c.tipus==='refugi'?c.ref:'Accés amb vehicle',
    nom:c.tipus==='final'?`Drecera des de ${nomP(c.ia)}`:c.tipus==='inici'?`Tornada a l'inici des de ${nomP(c.ia)}`:c.tipus==='refugi'?`Desviament al ${c.ref} des de ${nomP(c.ia)}`:`Sortida a pista o carretera des de ${nomP(c.ia)}`,
    desc:c.tipus==='final'?`Camí més ràpid fins al final que surt del pla A a ${nomP(c.ia)} i hi torna a ${nomP(c.ib)}.`:
      c.tipus==='inici'?`Camí més ràpid per tornar al punt d'inici des de ${nomP(c.ia)}.`:
      c.tipus==='refugi'?`Camí fins al refugi per fer-hi nit o protegir-se si es fa fosc o es gira el temps. Comprova si és guardat i truca-hi per avisar.`:
      `Camí més ràpid fins a una carretera o camí asfaltat on pot arribar un vehicle (comprova'n l'accés).`})); }

// ---------- processar una ruta nova ----------
async function creaRuta(nom,dies,opc,log){
  const t0=Date.now(), L=[]; const lg=m=>{ L.push(m); log(L.join('\n')); }, lgu=m=>{ L[L.length-1]=m; log(L.join('\n')); };
  let S=90,W=180,N=-90,E=-180;
  for(const d of dies) for(const p of d.pts){S=Math.min(S,p[0]);N=Math.max(N,p[0]);W=Math.min(W,p[1]);E=Math.max(E,p[1]);}
  const mg=0.018;
  let demOk=false;
  lg('Model del terreny…');
  try{ await carregaDEM(S-mg,W-mg*1.35,N+mg,E+mg*1.35,lgu); demOk=true; lgu('Model del terreny: fet'); }catch(e){ lgu('Model del terreny: no disponible ('+e.message+'). Es fan servir les alçades del GPX.'); }
  for(const d of dies){
    d.pts=aprima(d.pts,8);
    if(demOk&&(opc.dem||d.pts.some(p=>p[2]==null))) d.pts=d.pts.map(p=>{const z=alt(p[0],p[1]); return [p[0],p[1],isNaN(z)?p[2]:Math.round(z*10)/10];});
    if(d.pts.some(p=>p[2]==null)) throw new Error('El GPX no té alçades i no s\'ha pogut descarregar el model del terreny.');
    d.pts=d.pts.map(p=>[+p[0].toFixed(6),+p[1].toFixed(6),+(+p[2]).toFixed(1)]);
    d.auto=!(d.wpts||[]).length; d.wp=situaWaypoints(d.pts,d.auto?puntsAuto(d.pts,[]):d.wpts); delete d.wpts;
    d.ves=demOk?vessantsDe(d.pts):[];
    lg(`${d.titol}: ${(estat(d.pts).cd.at(-1)/1000).toFixed(1).replace('.',',')} km, ${d.wp.length} punts${d.auto?' (automàtics: el GPX no en porta)':''}`);
  }
  if(opc.pb&&demOk){
    try{
      lg('Camins d\'OpenStreetMap…');
      const ways=await camins(S-mg,W-mg*1.35,N+mg,E+mg*1.35,lgu); lgu(`Camins d'OpenStreetMap: ${ways.length} trams`);
      lg('Dissenyant plans B…'); await new Promise(r=>setTimeout(r,30));
      const G=nouGraf(), Z=14;
      for(const w of ways){ let prev=-1; for(let k=0;k<w.g.length;k+=2){ const gx=w.g[k], gy=w.g[k+1], s=256/w.ext, [lat,lon]=unwpx(gx*s,gy*s,Z);
        const v=node(G,gx+','+gy,lat,lon); if(prev>=0) aresta(G,prev,v,w.t); prev=v; } }
      { // extrems de camí solts (cruïlles mal dibuixades o tallades): els unim amb el node més proper a menys de 12 m
        const C=0.0003, cell=new Map(); G.ll.forEach((p,i)=>{ const k=Math.floor(p[0]/C)+','+Math.floor(p[1]/C); (cell.get(k)||cell.set(k,[]).get(k)).push(i); });
        G.ll.forEach((p,i)=>{ if(G.adj[i].length!==1) return; const ci=Math.floor(p[0]/C), cj=Math.floor(p[1]/C), veí=G.adj[i][0][0]; let b=-1,bd=12;
          for(let a=-1;a<=1;a++) for(let c=-1;c<=1;c++) for(const u of cell.get((ci+a)+','+(cj+c))||[]){ if(u===i||u===veí||!G.adj[u].length||G.adj[veí].some(x=>x[0]===u)) continue; const dd=hav(p,G.ll[u]); if(dd<bd){bd=dd;b=u;} }
          if(b>=0){ aresta(G,i,b,G.adj[i][0][2]); if(window.__dbg) console.log('PB join '+i+'→'+b+' '+bd.toFixed(1)); } });
        if(window.__dbg) console.log('PB graf nodes='+G.ll.length+' solts='+G.ll.filter((p,i)=>G.adj[i].length===1).length); }
      for(const d of dies){
        // el track del pla A també és camí; l'enllacem amb el node de camí més proper (< 20 m)
        const tn=d.pts.map((p,i)=>node(G,'A'+d.key+':'+i,p[0],p[1]));
        tn.forEach((v,i)=>{ if(i) aresta(G,tn[i-1],v,5); });
        const tset=new Set(tn), cell=new Map(), C=0.0004; G.ll.forEach((p,i)=>{ if(tset.has(i)) return; const k=Math.floor(p[0]/C)+','+Math.floor(p[1]/C); (cell.get(k)||cell.set(k,[]).get(k)).push(i); });
        tn.forEach(v=>{ const p=G.ll[v], ci=Math.floor(p[0]/C), cj=Math.floor(p[1]/C); let b=-1,bd=20;
          for(let a=-1;a<=1;a++) for(let c=-1;c<=1;c++) for(const u of cell.get((ci+a)+','+(cj+c))||[]){ const dd=hav(p,G.ll[u]); if(dd<bd){bd=dd;b=u;} }
          if(b>=0) aresta(G,v,b,5); });
        if(d.auto){ d.autoW=puntsAuto(d.pts,ways.pois); d.wp=situaWaypoints(d.pts,d.autoW); }
        d.plansb=await plansBDia(G,d,tn,{pois:ways.pois,cruilles:d.auto?cruillesTrack(G,tn,d.pts):[]});
        if(d.auto&&d.plansb.length){ // un punt de pas a cada cruïlla de pla B
          const cdA=estat(d.pts).cd, W=d.autoW.slice();
          for(const b of d.plansb) if(!d.wp.some(w=>Math.abs(cdA[w.i]-cdA[b.ia])<150)) W.push({lat:d.pts[b.ia][0],lon:d.pts[b.ia][1],nom:'Cruïlla del '+b.id,desc:'Punt de decisió: '+(b.tipus==='refugi'?'desviament al '+b.ref:b.tipus==='final'?'drecera':b.tipus==='inici'?'tornada a l\'inici':'sortida a pista o carretera'),auto:true});
          d.wp=situaWaypoints(d.pts,W); d.plansb=nomenaPB(d.plansb,d); }
        delete d.autoW;
        lgu(`Plans B · ${d.titol}: ${d.plansb.length}`); await new Promise(r=>setTimeout(r,10));
      }
    }catch(e){ lg('Plans B: no s\'han pogut calcular ('+e.message+'). Torna-ho a provar amb connexió.'); dies.forEach(d=>d.plansb=d.plansb||[]); }
  } else dies.forEach(d=>d.plansb=[]);
  // punts per a la meteo: el més baix, un de mig i el més alt
  const tots=dies.flatMap(d=>d.pts.map((p,i)=>({p,d,i}))).sort((a,b)=>a.p[2]-b.p[2]);
  const nomA=o=>{ const w=o.d.wp.reduce((b,w)=>{const dd=hav(o.p,o.d.pts[w.i]); return dd<b.d?{w,d:dd}:b;},{d:600}).w; return w?(w.n.split(' · ')[1]||w.n.split(' · ')[0]).slice(0,22):null; };
  const tria=[tots[0],tots[Math.floor(tots.length/2)],tots[tots.length-1]];
  const metPts=tria.map((o,i)=>({n:nomA(o)||['Punt baix','Punt mig','Punt alt'][i],lat:+o.p[0].toFixed(4),lon:+o.p[1].toFixed(4),e:Math.round(o.p[2])}));
  if(metPts[1].e<=metPts[0].e) metPts[1].e=metPts[0].e+1; if(metPts[2].e<=metPts[1].e) metPts[2].e=metPts[1].e+1;
  const c=[(S+N)/2,(W+E)/2];
  const r={id:opc.id||('r'+Date.now().toString(36)),nom,creat:new Date().toISOString(),dem:demOk,catalunya:c[0]>40.4&&c[0]<42.95&&c[1]>0.1&&c[1]<3.4,metPts,
    dies:dies.map(d=>({key:d.key,titol:d.titol,data:d.data,sortida:d.sortida,objectiu:d.objectiu,pts:d.pts,wp:d.wp,auto:!!d.auto,ves:d.ves,plansb:d.plansb})),info:{},tels:[]};
  desaRuta(r);
  lg(`Fet en ${Math.round((Date.now()-t0)/1000)} s.`);
  return r;
}

// ---------- Claude (clau de l'usuari) ----------
async function cridaClaude(messages,tools,maxTok){
  const key=(CONF.key||'').trim(); if(!key) throw new Error('Falta la clau d\'API (pestanya Rutes → Claude).');
  const res=await fetchT('https://api.anthropic.com/v1/messages',300000,{method:'POST',headers:{'content-type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
    body:JSON.stringify({model:CONF.model||'claude-sonnet-5-5',max_tokens:maxTok||8000,messages,tools})});
  const j=await res.json().catch(()=>({}));
  if(!res.ok){ const m=(j.error&&j.error.message)||res.statusText;
    throw new Error(res.status===401?'La clau d\'API no és vàlida.':res.status===429?'Massa peticions o límit de despesa: torna-ho a provar d\'aquí una estona.':res.status===400&&/credit/i.test(m)?'El compte de l\'API no té saldo.':'Error de l\'API ('+res.status+'): '+m); }
  return j;
}
function peticioClaude(r){
  const dades=r.dies.map(d=>{ const s=estat(d.pts); return {dia:d.key,titol:d.titol,data:d.data,sortida:d.sortida,objectiu:d.objectiu,
    punts:d.wp.map(w=>({codi:w.k,nom:w.n,lat:d.pts[w.i][0],lon:d.pts[w.i][1],alcada:Math.round(d.pts[w.i][2]),km:+(s.cd[w.i]/1000).toFixed(2)})),
    plansB:(d.plansb||[]).map(b=>({id:b.id,nom:b.nom,km:b.km,dPos:b.up,dNeg:b.dn,composicio:b.q,inici:[b.pts[0][0],b.pts[0][1]],final:[b.pts.at(-1)[0],b.pts.at(-1)[1]]}))}; });
  const prompt=`Ets un guia de muntanya expert que prepara una sortida de senderisme amb clients. Escriu en català.
Ruta: ${r.nom}. Dades (JSON):
${JSON.stringify(dades)}

Busca informació fiable a la web i torna NOMÉS un objecte JSON (sense text abans ni després) amb aquesta forma:
{"zona":{"titol":"nom de la zona o de l'espai natural","punts":["4 a 6 frases d'informació d'interès de la zona: espai protegit i normativa d'ús, geografia i geologia, història, patrimoni, flora i fauna, restriccions d'accés vigents"]},
 "fils":{"<id curt>":{"nom":"títol del fil conductor (pot ser una pregunta)","col":"color hex fosc","intro":"2 o 3 frases que presenten el fil i com el seguirem al llarg de la ruta"}},
 "filDia":{"<dia>":"<id del fil principal d'aquell dia>"},
 "punts":{"<dia>":{"<codi>":{"titol":"nom del lloc","fil":["<id del fil o fils que es treballen en aquest punt>"],"punts":["3 a 5 frases curtes d'interpretació per explicar als clients: història, patrimoni, geologia, flora i fauna, paisatge; lligades al fil conductor quan escaigui"],"pregunta":"una pregunta per fer al grup en aquest punt (opcional)"}}},
 "tels":[{"nom":"servei (hospital, CAP amb horari d'urgències del cap de setmana, taxi, policia local, refugi, oficina de turisme…)","tel":"número","nota":"horari o detall curt"}],
 "acces":"una frase: punts on pot arribar un vehicle o ambulància",
 "notaTels":"una frase sobre on anar en cas d'urgència segons el dia de la setmana de la sortida",
 "plansB":{"<dia>":{"<id>":"una frase de valoració del pla B (estat del camí, perills, si és una bona alternativa)"}}}
Fils conductors: tria 1 o 2 temes que travessin tota la ruta (per exemple el paisatge i com l'ha transformat l'aigua, o la vida a la muntanya abans i ara) i fes que cada punt hi aporti una peça; si hi ha 2 dies, pot haver-hi un fil per dia. Regles: no t'inventis res; si no trobes un nom o un fet, posa-ho com a «a confirmar». Només telèfons trobats en fonts fiables (webs oficials). Fes servir els noms de lloc reals propers a les coordenades.`;
  return prompt;
}
function aplicaResposta(r,text,extra){
  const a=text.indexOf('{'), b=text.lastIndexOf('}'); if(a<0||b<a) throw new Error('La resposta no conté el JSON esperat.');
  let o; try{ o=JSON.parse(text.slice(a,b+1)); }catch(e){ throw new Error('El JSON de la resposta no és vàlid (copia-la sencera).'); }
  r.info=o.punts||{}; r.tels=Array.isArray(o.tels)?o.tels.filter(t=>t&&t.tel):[]; r.acces=o.acces||''; r.notaTels=o.notaTels||'';
  r.fils=(o.fils&&typeof o.fils==='object')?o.fils:{}; r.filDia=o.filDia||{}; r.zona=(o.zona&&Array.isArray(o.zona.punts))?o.zona:null;
  for(const d of r.dies) for(const pb of d.plansb||[]){ const c=((o.plansB||{})[d.key]||{})[pb.id]; if(c) pb.coment=c; }
  r.claude={...(extra||{}),data:new Date().toISOString()};
  desaRuta(r);
  return r;
}
async function generaGuio(r,log){
  const prompt=peticioClaude(r);
  let messages=[{role:'user',content:prompt}], j=null;
  for(let k=0;k<4;k++){
    log(k?'Claude continua buscant…':'Claude està buscant informació i redactant (pot trigar un o dos minuts)…');
    j=await cridaClaude(messages,[{type:'web_search_20250305',name:'web_search',max_uses:12,user_location:{type:'approximate',country:'ES',timezone:'Europe/Madrid'}}],16000);
    if(j.stop_reason!=='pause_turn') break;
    messages=[...messages,{role:'assistant',content:j.content}];
  }
  const text=(j.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('');
  return aplicaResposta(r,text,{via:'API',model:CONF.model||'claude-sonnet-5-5',cerques:(j.usage&&j.usage.server_tool_use&&j.usage.server_tool_use.web_search_requests)||null});
}

// fitxers GPX [{name,text}] → dies (un per track) amb els seus waypoints
function preparaDies(fitxers){
  const pend=[]; let wpts=[];
  for(const f of fitxers){ const g=llegeixGPX(f.text,f.name); g.trks.forEach(t=>pend.push({titol:t.nom,pts:t.pts,src:f.name})); wpts=wpts.concat(g.wpts.map(w=>({...w,src:f.name}))); }
  if(!pend.length) throw new Error('Els fitxers no tenen cap track.');
  const norm=x=>x.toLowerCase().replace(/\.gpx$/,''), afin=(a,b)=>{ a=norm(a); b=norm(b); if(a===b) return 1e3; let k=0; while(k<a.length&&a[k]===b[k]) k++; return k; };
  const aprop=(w,d)=>d.pts.some((p,k)=>k%3===0&&hav([w.lat,w.lon],p)<200);
  wpts.forEach(w=>{ const ds=pend.filter(d=>aprop(w,d)); if(!ds.length) return; const mx=Math.max(...ds.map(d=>afin(w.src,d.src)));
    ds.filter(d=>afin(w.src,d.src)===mx).forEach(d=>(d.wpts=d.wpts||[]).push(w)); });
  const avui=new Date(); avui.setDate(avui.getDate()+1);
  pend.forEach((d,i)=>{ d.key='dia'+(i+1); d.wpts=d.wpts||[];
    const dd=new Date(avui); dd.setDate(avui.getDate()+i); d.data=dd.toISOString().slice(0,10); d.sortida='09:00'; d.objectiu='17:00';
    if(pend.length>1&&!/dia/i.test(d.titol)) d.titol='Dia '+(i+1)+' · '+d.titol; });
  pend.nWpts=wpts.length;
  return pend;
}
// rutes publicades al repositori (rutes/index.json): les preparo jo (Claude) a partir dels GPX que m'envies
async function sincronitzaPublicades(){
  if(!navigator.onLine) return 0;
  let idx; try{ const r=await fetchT('rutes/index.json?t='+Date.now(),15000,{cache:'no-store'}); if(!r.ok) return 0; idx=await r.json(); }catch(e){ return 0; }
  let n=0;
  for(const e of idx.rutes||[]){
    if(amagades().some(x=>x.id===e.id)) continue;
    const loc=carregaRuta(e.id);
    if(loc&&loc.actualitzat===e.actualitzat) continue;
    try{ const r=await (await fetchT('rutes/'+e.fitxer+'?v='+encodeURIComponent(e.actualitzat),30000,{cache:'no-store'})).json();
      r.publicada=true; r.actualitzat=e.actualitzat;
      if(loc&&loc.horesLocals) r.dies.forEach((d,i)=>{ const l=loc.dies[i]; if(l){ d.data=l.data; d.sortida=l.sortida; d.objectiu=l.objectiu; } });
      desaRuta(r); n++; }catch(err){}
  }
  return n;
}

// ---------- interfície de la biblioteca ----------
let pendents=null; // dies llegits del GPX abans de crear la ruta
function pintaLib(){
  const act=llegeix(ACT,null), L=lib();
  $('lib-llista').innerHTML=L.length?L.slice().reverse().map(x=>`<div class="lr ${x.id===act?'on':''}"><h3>${esc(x.nom)}${(carregaRuta(x.id)||{}).publicada?' <small class="pub">preparada per Claude</small>':''}</h3>
    <p class="nota">${x.dies.map(d=>esc(d.titol)+(d.data?' · '+new Date(d.data+'T12:00').toLocaleDateString('ca-ES',{weekday:'short',day:'numeric',month:'short'}):'')).join(' / ')}</p>
    <div class="botons" style="margin-top:6px"><button class="btn s" data-obre="${x.id}">${x.id===act?'Obrir':'Fer servir aquesta ruta'}</button>
    <button class="btn s" data-xat="${x.id}">Guió amb Claude (xat)</button>${(CONF.key||'').trim()?`<button class="btn s" data-guio="${x.id}">Guió amb Claude (API)</button>`:''}<button class="btn s" data-hores="${x.id}">Dates i hores</button><button class="btn s" data-esb="${x.id}">Esborrar</button></div>
    <pre class="log" id="lg-${x.id}"></pre><div id="ed-${x.id}"></div></div>`).join(''):'<p class="nota">Encara no hi ha cap ruta. Crea\'n una a sota amb el GPX.</p>';
  const A=amagades();
  if(A.length) $('lib-llista').innerHTML+=`<details class="det" style="margin-top:8px"><summary>Rutes preparades per Claude que has esborrat (${A.length})</summary><p class="nota">No es tornen a baixar soles. Si en vols recuperar una, toca «Tornar a baixar».</p>`+
    A.map(x=>`<div class="lr"><h3>${esc(x.nom||x.id)}</h3><div class="botons"><button class="btn s" data-rec="${esc(x.id)}">Tornar a baixar</button></div></div>`).join('')+'</details>';
  document.querySelectorAll('[data-rec]').forEach(b=>b.onclick=async()=>{ escriu(AMAG,amagades().filter(x=>x.id!==b.dataset.rec)); b.disabled=true; b.textContent='Baixant…';
    const n=await sincronitzaPublicades(); if(!n){ b.textContent='Cal cobertura: torna-ho a provar'; b.disabled=false; escriu(AMAG,amagades().concat([{id:b.dataset.rec,nom:b.closest('.lr').querySelector('h3').textContent}])); return; }
    if(!llegeix(ACT,null)) escriu(ACT,b.dataset.rec); location.reload(); });
  document.querySelectorAll('[data-obre]').forEach(b=>b.onclick=()=>{ escriu(ACT,b.dataset.obre); location.reload(); });
  document.querySelectorAll('[data-esb]').forEach(b=>b.onclick=()=>{ if(b.dataset.c){ esborraRuta(b.dataset.esb); location.reload(); } else { b.dataset.c=1; b.textContent='Toca per confirmar'; } });
  document.querySelectorAll('[data-guio]').forEach(b=>b.onclick=async()=>{ const id=b.dataset.guio, lg=m=>$('lg-'+id).textContent=m;
    if(!(CONF.key||'').trim()){ lg('Primer posa la teva clau d\'API a l\'apartat Claude, a sota.'); return; }
    b.disabled=true; try{ const r=await generaGuio(carregaRuta(id),lg); lg(`Fet: guió de ${Object.values(r.info).reduce((a,x)=>a+Object.keys(x).length,0)} punts i ${r.tels.length} telèfons.`+(llegeix(ACT,null)===id?' Recarregant…':''));
      if(llegeix(ACT,null)===id) setTimeout(()=>location.reload(),1200); }catch(e){ lg('No s\'ha pogut fer: '+e.message); } b.disabled=false; });
  document.querySelectorAll('[data-xat]').forEach(b=>b.onclick=async()=>{ const id=b.dataset.xat, r=carregaRuta(id), el=$('ed-'+id), txt=peticioClaude(r);
    let copiat=false; try{ await navigator.clipboard.writeText(txt); copiat=true; }catch(e){}
    el.innerHTML=`<div class="xat"><p class="nota"><b>1.</b> ${copiat?'Petició copiada.':'Copia aquesta petició:'} Obre un xat nou a Claude (millor amb la cerca web activada), enganxa-la i envia-la.</p>
      <textarea id="xp-${id}" readonly rows="3">${esc(txt)}</textarea>
      <div class="botons"><button class="btn s" id="xc-${id}">Tornar a copiar</button><a class="btn s" href="https://claude.ai/new" target="_blank" rel="noopener" style="text-decoration:none;text-align:center">Obrir Claude ↗</a></div>
      <p class="nota" style="margin-top:8px"><b>2.</b> Quan Claude acabi, copia tota la resposta i enganxa-la aquí:</p>
      <textarea id="xr-${id}" rows="5" placeholder="Enganxa aquí la resposta de Claude"></textarea>
      <div class="botons"><button class="btn" id="xa-${id}">Aplicar la resposta</button></div></div>`;
    $('xc-'+id).onclick=async()=>{ try{ await navigator.clipboard.writeText(txt); $('xc-'+id).textContent='Copiat ✓'; }catch(e){ $('xp-'+id).select(); document.execCommand('copy'); $('xc-'+id).textContent='Copiat ✓'; } };
    $('xa-'+id).onclick=()=>{ const lg=m=>$('lg-'+id).textContent=m;
      try{ const r2=aplicaResposta(carregaRuta(id),$('xr-'+id).value,{via:'xat'});
        lg(`Fet: guió de ${Object.values(r2.info).reduce((a,x)=>a+Object.keys(x).length,0)} punts i ${r2.tels.length} telèfons.`+(llegeix(ACT,null)===id?' Recarregant…':'')); el.innerHTML='';
        if(llegeix(ACT,null)===id) setTimeout(()=>location.reload(),1200); }catch(e){ lg('No s\'ha pogut aplicar: '+e.message); } };
  });
  document.querySelectorAll('[data-hores]').forEach(b=>b.onclick=()=>{ const id=b.dataset.hores, r=carregaRuta(id), el=$('ed-'+id);
    el.innerHTML=r.dies.map((d,i)=>formDia(d,i,'e'+id)).join('')+`<div class="botons"><button class="btn s" id="sv-${id}">Desar</button></div>`;
    $('sv-'+id).onclick=()=>{ r.dies.forEach((d,i)=>llegeixFormDia(d,i,'e'+id)); r.horesLocals=true; desaRuta(r); el.innerHTML='<p class="nota">Desat.</p>'; if(llegeix(ACT,null)===id) location.reload(); }; });
}
function formDia(d,i,p){ return `<div class="dia-f"><b>${esc(d.titol)}</b>
  <label>Data<input type="date" id="${p}-d${i}" value="${d.data||''}"></label>
  <label>Sortida<input type="time" id="${p}-s${i}" value="${d.sortida||'09:00'}"></label>
  <label>Arribada al final<input type="time" id="${p}-o${i}" value="${d.objectiu||'17:00'}"></label></div>`; }
function llegeixFormDia(d,i,p){ d.data=$(p+'-d'+i).value; d.sortida=$(p+'-s'+i).value||'09:00'; d.objectiu=$(p+'-o'+i).value||'17:00'; }
function iniciaLib(){
  $('c-key').value=CONF.key||''; $('c-model').value=CONF.model||'claude-sonnet-5-5'; $('c-gnom').value=CONF.guiaNom||''; $('c-gtel').value=CONF.guiaTel||'';
  const dc=()=>{ const tenia=!!(CONF.key||'').trim(); CONF.key=$('c-key').value.trim(); CONF.model=$('c-model').value; CONF.guiaNom=$('c-gnom').value.trim(); CONF.guiaTel=$('c-gtel').value.trim(); escriu(CONFK,CONF); if(tenia!==!!CONF.key) pintaLib(); };
  ['c-key','c-model','c-gnom','c-gtel'].forEach(id=>$(id).onchange=dc);
  $('n-gpx').onchange=async()=>{
    try{ pendents=preparaDies(await Promise.all([...$('n-gpx').files].map(async f=>({name:f.name,text:await f.text()})))); }
    catch(e){ $('n-log').textContent=e.message; pendents=null; return; }
    const wpts={length:pendents.nWpts};
    if(!$('n-nom').value) $('n-nom').value=pendents[0].titol.replace(/^Dia \d+ · /,'').replace(/[_-]?(dia|day|d)\s*\d+$/i,'').replace(/_/g,' ').trim();
    $('n-dies').innerHTML='<p class="nota">Per a cada dia: la data, l\'hora de sortida i l\'hora a què voleu arribar al punt final (serveix per calcular les hores límit).</p>'+pendents.map((d,i)=>formDia(d,i,'n')).join('')+
      `<p class="nota">${wpts.length} waypoints al GPX.</p>`;
    $('n-fes').disabled=false; };
  $('n-fes').onclick=async()=>{
    if(!pendents) return; $('n-fes').disabled=true;
    pendents.forEach((d,i)=>llegeixFormDia(d,i,'n'));
    try{ const r=await creaRuta($('n-nom').value.trim()||pendents[0].titol,pendents,{dem:$('n-dem').checked,pb:$('n-pb').checked},m=>$('n-log').textContent=m);
      escriu(ACT,r.id);
      if((CONF.key||'').trim()&&navigator.onLine){ try{ await generaGuio(r,m=>$('n-log').textContent+='\n'+m); $('n-log').textContent+='\nGuió fet.'; }catch(e){ $('n-log').textContent+='\nEl guió amb Claude no s\'ha pogut fer ara ('+e.message+'); ho pots repetir a la ruta.'; } }
      $('n-log').textContent+='\nObrint la ruta…'; setTimeout(()=>location.reload(),800); }
    catch(e){ $('n-log').textContent+='\nError: '+e.message; $('n-fes').disabled=false; } };
  pintaLib();
}
function mostraVista(v){
  document.querySelectorAll('nav.vistes button').forEach(x=>x.classList.toggle('on',x.dataset.v===v));
  for(const id of ['vruta','vguio','vbri','vmet','v112','vlib']) { const e=$(id); if(e) e.hidden=id!==v; }
  const t=document.querySelector('header .tabs'); if(t) t.style.display=v==='vruta'?'':'none';
  window.scrollTo(0,0);
}

// ---------- arrencada ----------
window.arrencaApp=function(){
  iniciaLib();
  sincronitzaPublicades().then(n=>{ if(!n) return; const act=llegeix(ACT,null);
    if(!act||!carregaRuta(act)){ const L=lib(); escriu(ACT,L[L.length-1].id); location.reload(); return; }
    pintaLib(); const b=document.querySelector('nav.vistes button[data-v="vlib"]'); if(b) b.classList.add('nou');
    if(window.RUTA&&carregaRuta(act).actualitzat!==RUTA.actualitzat) location.reload(); });
  document.querySelector('nav.vistes button[data-v="vlib"]').addEventListener('click',()=>{ mostraVista('vlib'); pintaLib(); });
  const id=llegeix(ACT,null), r=id&&carregaRuta(id);
  if(!r){ // sense ruta: només la biblioteca
    document.querySelectorAll('nav.vistes button').forEach(b=>{ if(b.dataset.v!=='vlib') b.disabled=true; });
    mostraVista('vlib'); if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{}); return;
  }
  window.RUTA=r; window.DIES=r.dies.map(d=>d.key); window.RUTES={}; window.INFO={}; window.VESSANTS={}; window.PLANSB={}; window.LIMIT={}; window.DATES={};
  r.dies.forEach((d,i)=>{ const dt=d.data?new Date(d.data+'T12:00'):null;
    RUTES[d.key]={titol:d.titol,curt:'Dia '+(i+1)+(dt?' · '+DS[dt.getDay()]+' '+dt.getDate():''),sortida:d.sortida||'09:00',pts:d.pts,wp:d.wp};
    INFO[d.key]=(r.info||{})[d.key]||{}; VESSANTS[d.key]=d.ves||[]; PLANSB[d.key]=d.plansb||[]; LIMIT[d.key]={h:d.objectiu||'17:00',txt:'hora objectiu'}; DATES[d.key]=d.data||''; });
  const ds=Object.values(DATES).filter(Boolean).sort(); const fi=ds.length?new Date(ds[ds.length-1]+'T12:00'):new Date(); fi.setDate(fi.getDate()+1);
  window.DATA_FI=fi.toISOString().slice(0,10);
  $('nom-ruta').textContent=r.nom; document.title='Petjada · '+r.nom;
  $('tabs-dies').innerHTML=r.dies.length>1?DIES.map(k=>`<button data-d="${k}">${esc(RUTES[k].curt)}</button>`).join(''):'';
  const s=document.createElement('script'); s.src='app.js'; document.body.appendChild(s);
};
// per a les proves
window.__core={esborraRuta,puntsAuto,cruillesTrack,nomenaPB,camins,carregaDEM,alt,camins,nouGraf,node,aresta,dijkstra,cami,estat,hores,hav,unwpx,cost,preparaDies,sincronitzaPublicades,peticioClaude,aplicaResposta,llegeixGPX,situaWaypoints,vessantsDe,estat,creaRuta,generaGuio,carregaRuta,desaRuta};
})();
