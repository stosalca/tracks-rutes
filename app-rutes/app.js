
"use strict";
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const ST_KEY='petjada-ruta-st-'+RUTA.id;
let st=load();
let dia=DIES.includes(st.dia)?st.dia:DIES[0];
let provaHora=null, INI=null, provaManual=null;
let R=null, pos=null, gpsWatch=null, lastFix=null, wake=null, prova=false;

function load(){try{return JSON.parse(localStorage.getItem(ST_KEY))||{}}catch(e){return {}}}
function save(){try{localStorage.setItem(ST_KEY,JSON.stringify(st))}catch(e){}}
function ds(){st[dia]=st[dia]||{};return st[dia]}

// ---------- Preparació del track ----------
const rad=x=>x*Math.PI/180;
function hav(a,b){const R=6371000,p1=rad(a[0]),p2=rad(b[0]),dp=p2-p1,dl=rad(b[1]-a[1]);
  return 2*R*Math.asin(Math.sqrt(Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2));}
function prepara(key){
  const r=RUTES[key], p=r.pts, n=p.length;
  const cd=new Float64Array(n), cu=new Float64Array(n), cn=new Float64Array(n);
  for(let i=1;i<n;i++) cd[i]=cd[i-1]+hav(p[i-1],p[i]);
  // desnivell amb filtre de 5 m, aplicat tram a tram (com a la fitxa)
  const wp=r.wp; let U=0,D=0;
  const inf=(typeof INFO!=='undefined'&&INFO[key])||{};
  wp.forEach(w=>{ const t=inf[w.k]; w.info=t||null; if(t) w.n=(w.k==='X'?'':w.k+' · ')+t.titol; });
  for(let w=0;w<wp.length-1;w++){
    const a=wp[w].i,b=wp[w+1].i; let ref=p[a][2],u=0,d=0;
    for(let i=a;i<=b;i++){
      const e=p[i][2];
      if(e-ref>=5){u+=e-ref;ref=e}else if(ref-e>=5){d+=ref-e;ref=e}
      if(i===b){ if(e>ref)u+=e-ref; else d+=ref-e; }
      cu[i]=U+u; cn[i]=D+d;
    }
    U+=u;D+=d;
  }
  const lat0=rad(p[0][0]);
  const xy=p.map(q=>[ (q[1]-p[0][1])*111320*Math.cos(lat0), (q[0]-p[0][0])*110540 ]);
  const trams=[]; for(let w=0;w<wp.length-1;w++){const a=wp[w].i,b=wp[w+1].i;
    trams.push({de:wp[w].n,a:wp[w+1].n,ia:a,ib:b,km:(cd[b]-cd[a])/1000,up:cu[b]-cu[a],dn:cn[b]-cn[a]});}
  trams.forEach(t=>t.h=hores(t.km,t.up,t.dn));
  const pb=((typeof PLANSB!=='undefined'&&PLANSB[key])||[]).filter(b=>b.pts.length>1).map(b=>{
    const q=b.pts, m=q.length, bd=new Float64Array(m), bu=new Float64Array(m), bn=new Float64Array(m); let ref=q[0][2];
    for(let i=1;i<m;i++){ bd[i]=bd[i-1]+hav(q[i-1],q[i]); const e=q[i][2]; bu[i]=bu[i-1]; bn[i]=bn[i-1];
      if(e-ref>=5){bu[i]+=e-ref;ref=e}else if(ref-e>=5){bn[i]+=ref-e;ref=e} }
    return {...b,m,bd,bu,bn,xy:q.map(z=>[(z[1]-p[0][1])*111320*Math.cos(lat0),(z[0]-p[0][0])*110540])}; });
  return {key,r,p,n,cd,cu,cn,xy,wp,trams,lat0,lon0:p[0][1],lat00:p[0][0],pb};
}
function hores(km,up,dn){ if(km<=0) return 0; return Math.max(km/3.5, up/300+dn/400)*1.2; }

// ---------- Parades previstes (editables, per dia; es desen al mòbil) ----------
function paradesDia(){ st.par=st.par||{};
  if(!st.par[dia]){ const w=R.wp.length>2?R.wp[1]:null; st.par[dia]=w?{[w.k]:{m:10,t:'Primera parada: beure aigua i treure capes si escau'}}:{}; save(); }
  return st.par[dia]; }
// hores de parada previstes entre la distància d0 (m) i l'índex i1 del track (no compta la parada del punt i1)
function paradesEntre(d0,i1){ const P=paradesDia(); let m=0;
  for(const w of R.wp){ const p=P[w.k]; if(!p||!p.m) continue; if(R.cd[w.i]>=d0-30&&w.i<i1&&w.i>0) m+=+p.m; } return m/60; }
function textParades(){ const P=paradesDia(); const L=R.wp.filter(w=>P[w.k]&&P[w.k].m>0).map(w=>`${w.k} ${P[w.k].m} min${P[w.k].t?' ('+P[w.k].t+')':''}`); return L.length?L.join(' · '):'cap'; }

// ---------- Situar la posició sobre el track ----------
function toXY(lat,lon){return [(lon-R.lon0)*111320*Math.cos(R.lat0),(lat-R.lat00)*110540];}
// temps de marxa previst (h) entre dues distàncies del track, sumant per trams com a la fitxa
function horesEntre(i0,i1){
  if(i1<=i0) return 0; let h=0;
  for(const x of R.trams){ const a=Math.max(i0,x.ia), b=Math.min(i1,x.ib); if(b<=a) continue;
    h+=hores((R.cd[b]-R.cd[a])/1000, R.cu[b]-R.cu[a], R.cn[b]-R.cn[a]); }
  return h;
}
function locate(lat,lon){
  const P=toXY(lat,lon), s=ds(), last=s.seg||0;
  // hores des de l'última posició bona (p. ex. si has dut el mòbil bloquejat)
  const gap=s.lastTs?Math.max(0,(Date.now()-s.lastTs)/3600e3):0;
  const segs=[];
  for(let i=0;i<R.n-1;i++){
    const A=R.xy[i],B=R.xy[i+1],dx=B[0]-A[0],dy=B[1]-A[1],L=dx*dx+dy*dy;
    let t=L?((P[0]-A[0])*dx+(P[1]-A[1])*dy)/L:0; t=Math.max(0,Math.min(1,t));
    const X=A[0]+t*dx,Y=A[1]+t*dy; segs.push({i,t,d:Math.hypot(P[0]-X,P[1]-Y)});
  }
  // candidats: llocs del track a menys de 50 m (n'hi pot haver més d'un on el camí es repeteix,
  // com el Xalet: P3 i P6). Agrupem per trossos i ens quedem el millor de cada tros.
  const cands=[]; let cur=null;
  segs.forEach(g=>{ if(g.d<50){ if(cur&&g.i-cur.last<=3){ cur.last=g.i; if(g.d<cur.b.d) cur.b=g; } else { cur={last:g.i,b:g}; cands.push(cur); } } });
  // venim d'un pla B: ens quedem amb el lloc on el pla B torna al pla A
  if(s.b){ const pb=R.pb.find(x=>x.id===s.b.id); if(pb&&pb.ib!=null){ const c=cands.map(c=>c.b).find(c=>Math.abs(c.i-pb.ib)<60); if(c) return c; } }
  const fwd=cands.map(c=>c.b).filter(c=>c.i>=last-40);
  if(fwd.length){
    // el més llunyà que s'hagi pogut caminar en el temps passat (marge 1,3×); si cap, el més proper endavant
    const possibles=fwd.filter(c=>horesEntre(last,c.i)<=gap*1.3+0.1);
    return possibles.length?possibles[possibles.length-1]:fwd[0];
  }
  // fora del track: el punt més proper, preferint no tornar enrere
  let best=null;
  segs.forEach(g=>{ const sc=g.d+(g.i<last-40?250:0); if(!best||sc<best.sc) best={...g,sc}; });
  return best;
}
// posició sobre algun track de pla B (el més proper)
function locateB(lat,lon){
  const P=toXY(lat,lon); let best=null;
  for(const b of R.pb) for(let i=0;i<b.m-1;i++){
    const A=b.xy[i],B=b.xy[i+1],dx=B[0]-A[0],dy=B[1]-A[1],L=dx*dx+dy*dy;
    let t=L?((P[0]-A[0])*dx+(P[1]-A[1])*dy)/L:0; t=Math.max(0,Math.min(1,t));
    const d=Math.hypot(P[0]-A[0]-t*dx,P[1]-A[1]-t*dy); if(!best||d<best.d) best={b,i,t,d};
  }
  return best;
}
function estatB(b,i,t){ const j=Math.min(i+1,b.m-1), L=a=>a[i]+(a[j]-a[i])*t;
  return {d:L(b.bd),u:L(b.bu),n:L(b.bn),lat:b.pts[i][0]+(b.pts[j][0]-b.pts[i][0])*t,lon:b.pts[i][1]+(b.pts[j][1]-b.pts[i][1])*t}; }
function estatEn(seg,t){ // valors acumulats a la posició (segment seg, fracció t)
  const i=seg, j=Math.min(seg+1,R.n-1);
  const lerp=(a)=>a[i]+(a[j]-a[i])*t;
  return {d:lerp(R.cd),u:lerp(R.cu),n:lerp(R.cn),e:R.p[i][2]+(R.p[j][2]-R.p[i][2])*t,
    lat:R.p[i][0]+(R.p[j][0]-R.p[i][0])*t, lon:R.p[i][1]+(R.p[j][1]-R.p[i][1])*t};
}

// ---------- Format ----------
const km=m=>(m/1000).toLocaleString('ca-ES',{minimumFractionDigits:m<10000?2:1,maximumFractionDigits:m<10000?2:1});
const mts=m=>Math.round(m).toLocaleString('ca-ES')+' m';
function hm(h){ if(!isFinite(h)) return '–'; const t=Math.round(h*60), H=Math.floor(t/60), M=t%60; return H?`${H} h ${String(M).padStart(2,'0')}`:`${M} min`; }
function rel(d){return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}
function hora(str){const [h,m]=str.split(':').map(Number);return h+m/60;}
const $=id=>document.getElementById(id);
function set(id,html){$(id).innerHTML=html}

// ---------- Pintar ----------
function render(){
  const s=ds(), now=prova&&provaHora?+provaHora:Date.now();
  INI=prova&&provaHora?+sortidaPrevista(provaHora):s.inici; // en mode prova, sortida a l'hora prevista del dia
  document.querySelectorAll('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.d===dia));
  $('b-inici').textContent=s.inici?'Inici: '+rel(new Date(s.inici))+' (tocar per canviar)':'Iniciar ruta';
  $('sortida').textContent='sortida prevista '+R.r.sortida;
  set('final-nom',R.wp[R.wp.length-1].n.split(' · ')[0]);
  const BB=pos?pos.b:s.b, PB=BB?R.pb.find(x=>x.id===BB.id):null;
  const seg=PB?Math.min(PB.ia,R.n-2):pos?pos.seg:(s.seg||0), t=PB?(PB.ia>=R.n-1?1:0):pos?pos.t:(s.t||0);
  const E=estatEn(seg,t), tot=R.cd[R.n-1];
  let EB=null; if(PB){ EB=estatB(PB,BB.i,BB.t); E.lat=EB.lat; E.lon=EB.lon; }
  const DV=(!PB&&s.desv)||null; // pla B ja fet: correcció del que s'ha caminat
  // punt següent
  let w=R.wp.findIndex(x=>x.i>seg);
  if(w<0) w=R.wp.length-1;
  const nx=R.wp[w], trIdx=Math.max(0,w-1), tr=R.trams[trIdx];
  const dSeg=Math.max(0,R.cd[nx.i]-E.d), uSeg=Math.max(0,R.cu[nx.i]-E.u), nSeg=Math.max(0,R.cn[nx.i]-E.n);
  const hSeg=hores(dSeg/1000,uSeg,nSeg);
  set('seg-nom',nx.n); set('tram',`tram ${tr.de.split(' ·')[0]} → ${tr.a.split(' ·')[0]}`);
  set('seg-km',km(dSeg)+'<small>km</small>'); set('seg-t',hm(hSeg));
  set('seg-up','+'+mts(uSeg)); set('seg-dn','−'+mts(nSeg));
  set('seg-hora',`Arribada prevista: <b>${rel(new Date(now+hSeg*3600e3))}</b> · ${nx.n.split(' · ')[0]} a ${mts(R.p[nx.i][2])}`);
  // fet
  set('f-km',km(E.d)+'<small>km</small>');
  set('f-t',INI?hm((now-INI)/3600e3):'–');
  set('f-up','+'+mts(E.u)); set('f-dn','−'+mts(E.n));
  const pct=E.d/tot*100; $('barra').style.width=pct.toFixed(1)+'%'; set('pct',Math.round(pct)+' %');
  // fins al final
  let hRest=hSeg; for(let k=w;k<R.trams.length;k++) hRest+=R.trams[k].h;
  const dR=tot-E.d, uR=R.cu[R.n-1]-E.u, nR=R.cn[R.n-1]-E.n;
  const pRest=paradesEntre(E.d,R.n-1);
  set('r-km',km(dR)+'<small>km</small>'); set('r-t',hm(hRest+pRest));
  set('r-up','+'+mts(uR)); set('r-dn','−'+mts(nR));
  const arr=new Date(now+(hRest+pRest)*3600e3), lim=LIMIT[dia];
  const limD=new Date(now); limD.setHours(...lim.h.split(':').map(Number),0,0);
  const marge=(limD-arr)/3600e3;
  set('r-hora',`Arribada prevista <b>${rel(arr)}</b> (${hm(hRest)} de marxa + ${hm(pRest)} de parades previstes) · ${lim.txt} ${lim.h} → `+
    (marge>=0?`<b style="color:var(--ok)">marge ${hm(marge)}</b>`:`<b style="color:var(--ter)">vas ${hm(-marge)} tard</b>`));
  // ritme respecte a la fitxa
  let hFet=0; for(let k=0;k<trIdx;k++) hFet+=R.trams[k].h;
  hFet+=Math.max(0,tr.h-hSeg); hFet+=paradesEntre(0,Math.max(1,R.wp[w].i));
  if(INI && E.d>300){
    const real=(now-INI)/3600e3, dif=real-hFet;
    set('ritme',`Segons la fitxa hauries trigat ${hm(hFet)} (amb les parades previstes): `+
      (Math.abs(dif)<5/60?'<b>vas al ritme previst</b>':dif>0?`<b class="up">${hm(dif)} més</b>`:`<b style="color:var(--ok)">${hm(-dif)} menys</b>`));
  } else set('ritme', INI?'':'Toca «Iniciar ruta» per comptar el temps.');
  if(PB) pintaModeB(PB,EB,E,now);
  else if(DV){ // després d'un pla B: el fet inclou el pla B i no el tros de pla A saltat
    const fk=E.d+DV.km, tt=tot+DV.km; set('f-km',km(fk)+'<small>km</small>'); set('f-up','+'+mts(E.u+DV.u)); set('f-dn','−'+mts(E.n+DV.n));
    $('barra').style.width=(fk/tt*100).toFixed(1)+'%'; set('pct',Math.round(fk/tt*100)+' %');
    if(INI&&E.d>300){ const pbx=R.pb.find(x=>x.id===DV.id), real=(now-INI)/3600e3, hf=hFet+DV.h-(pbx&&pbx.ib!=null?paradesEntre(R.cd[pbx.ia]+40,pbx.ib):0), dif=real-hf;
      set('ritme',`Segons la fitxa (amb el pla ${DV.id}) hauries trigat ${hm(hf)} (amb les parades previstes): `+
        (Math.abs(dif)<5/60?'<b>vas al ritme previst</b>':dif>0?`<b class="up">${hm(dif)} més</b>`:`<b style="color:var(--ok)">${hm(-dif)} menys</b>`)); }
  }
  // trams
  const base=INI?new Date(INI):(()=>{const d=new Date();const [h,m]=R.r.sortida.split(':');d.setHours(+h,+m,0,0);return d})();
  let acc=0, rows=''; const PAR=paradesDia();
  R.trams.forEach((x,k)=>{acc+=x.h; const real=(s.pas||{})[k], salt=(s.salt||{})[k], wk=R.wp[k+1], pm=(PAR[wk.k]&&+PAR[wk.k].m)||0, arrP=+base+(acc+paradesEntre(0,x.ib))*3600e3;
    rows+=`<tr class="${k<trIdx?'fet':k===trIdx?'act':''}"><td>${x.a.split(' · ')[0]}</td><td>${x.km.toFixed(2).replace('.',',')}<br><small class="acu">${(R.cd[x.ib]/1000).toFixed(2).replace('.',',')}</small></td><td>${Math.round(x.up)}<br><small class="acu">${Math.round(R.cu[x.ib])}</small></td><td>${Math.round(x.dn)}<br><small class="acu">${Math.round(R.cn[x.ib])}</small></td><td>${hm(x.h)}<br><small class="acu">${hm(acc)}</small></td><td>${rel(new Date(arrP))}${pm&&k<R.trams.length-1?`<br><small>+${pm} min</small>`:''}</td><td${salt?' style="color:#C55A11;font-weight:700"':''}${real&&real>limitEn(R.wp[k+1].i,real)?' style="color:var(--ter);font-weight:700"':''}>${salt?'pla '+salt:real?((s.est||{})[k]?'≈':'')+rel(new Date(real)):''}</td><td>${rel(new Date(limitEn(R.wp[k+1].i,now)))}</td></tr>`;});
  let H=R.trams.reduce((a,x)=>a+x.h,0), HP=paradesEntre(0,R.n-1);
  rows+=`<tr><td><b>Total</b></td><td><b>${(tot/1000).toFixed(2).replace('.',',')}</b></td><td><b>${Math.round(R.cu[R.n-1])}</b></td><td><b>${Math.round(R.cn[R.n-1])}</b></td><td><b>${hm(H)}</b></td><td><b>${rel(new Date(+base+(H+HP)*3600e3))}</b></td><td></td><td></td></tr>`+
    `<tr><td colspan="8" class="nota">Marxa ${hm(H)} + parades ${hm(HP)} = <b>${hm(H+HP)}</b>. Parades: ${esc(textParades())}.</td></tr>`;
  set('trams',rows);
  dibuixaPerfil(E); dibuixaMapa(E);
  pintaGuio(E,w); pintaVessant(E); pintaPlansB(E,seg,now); pintaFinsA(E,now,PB);
}


// ---------- Fins a un punt (el que triïs) ----------
function pintaFinsA(E,now,PB){ const el=$('fa-sel'); if(!el||!E) return; const s=ds();
  if(el.dataset.k!==dia){ el.dataset.k=dia; el.innerHTML=R.wp.map(w=>`<option value="${esc(w.k)}">${esc(w.n)}</option>`).join('');
    el.onchange=()=>{ ds().fa=el.value; save(); render(); }; }
  let w=R.wp.find(x=>x.k===s.fa);
  if(!w){ w=R.wp.find(x=>R.cd[x.i]>E.d+20)||R.wp[R.wp.length-1]; }
  el.value=w.k;
  const passat=R.cd[w.i]<=E.d+20;
  if(passat){ // tornant enrere pel mateix camí: la pujada feta es baixa i al revés
    const d=E.d-R.cd[w.i], up=Math.max(0,E.n-R.cn[w.i]), dn=Math.max(0,E.u-R.cu[w.i]), h=hores(d/1000,up,dn);
    set('fa-km',km(d)+'<small>km</small>'); set('fa-t',hm(h)); set('fa-up','+'+mts(up)); set('fa-dn','−'+mts(dn));
    set('fa-hora',`<b style="color:#C55A11">Tornant enrere</b> pel mateix camí: arribada prevista <b>${rel(new Date(now+h*3600e3))}</b> (${hm(h)} de marxa, sense parades) · ${esc(w.k)} a ${mts(R.p[w.i][2])}`+
      ((s.pas||{})[R.wp.indexOf(w)-1]?` · hi vau passar a les ${rel(new Date(s.pas[R.wp.indexOf(w)-1]))}`:'')+
      (PB?'<br><span class="nota">Calculat sobre el pla A des de la cruïlla del pla B.</span>':'')); return; }
  const d=R.cd[w.i]-E.d, up=Math.max(0,R.cu[w.i]-E.u), dn=Math.max(0,R.cn[w.i]-E.n), h=horesDesE(E,w.i), p=paradesEntre(E.d,w.i);
  set('fa-km',km(d)+'<small>km</small>'); set('fa-t',hm(h+p)); set('fa-up','+'+mts(up)); set('fa-dn','−'+mts(dn));
  const arr=new Date(now+(h+p)*3600e3), lim=limitEn(w.i,now);
  set('fa-hora',`Arribada prevista <b>${rel(arr)}</b> (${hm(h)} de marxa`+(p?` + ${hm(p)} de parades`:'')+`) · ${esc(w.k)} a ${mts(R.p[w.i][2])}`+
    (w.i<R.n-1?` · límit ${rel(new Date(lim))} → `+(+arr<=lim?`<b style="color:var(--ok)">a temps</b>`:`<b style="color:var(--ter)">${hm((arr-lim)/3600e3)} tard</b>`):'')+
    (PB?'<br><span class="nota">Calculat pel pla A des de la cruïlla del pla B.</span>':''));
}

$('trams').addEventListener('click',e=>{ const tr=e.target.closest('tr'); if(!tr) return; const k=[...$('trams').children].indexOf(tr); if(k<0||k>=R.trams.length) return;
  ds().fa=R.wp[k+1].k; save(); render(); $('fa').scrollIntoView({behavior:'smooth',block:'center'}); });
// ---------- Plans B i hores límit ----------
// quan caminem per un pla B: següent punt = enllaç amb el pla A (o final), fet i fins al final pel pla B
function nomEnllac(i){ const w=R.wp.find(x=>x.i>=i)||R.wp[R.wp.length-1], d=R.cd[w.i]-R.cd[i];
  return d<60?nomPunt(w.k):`${km(d)} km abans de ${nomPunt(w.k)}`; }
function pintaModeB(b,EB,E,now){
  const s=ds(), fi=b.ib!=null?'Enllaç amb el pla A · '+nomEnllac(b.ib):(b.fi||'final');
  const dB=b.bd[b.m-1]-EB.d, uB=Math.max(0,b.bu[b.m-1]-EB.u), nB=Math.max(0,b.bn[b.m-1]-EB.n), hB=hores(dB/1000,uB,nB);
  set('seg-nom',fi); set('tram',`pla ${b.id} · ${esc(b.nom)}`);
  set('seg-km',km(dB)+'<small>km</small>'); set('seg-t',hm(hB)); set('seg-up','+'+mts(uB)); set('seg-dn','−'+mts(nB));
  const zf=b.pts[b.m-1][2];
  set('seg-hora',`Arribada prevista: <b>${rel(new Date(now+hB*3600e3))}</b> · ${b.ib!=null?'enllaç':esc(b.fi||'')} a ${mts(zf)}`);
  const fk=E.d+EB.d, fu=E.u+EB.u, fn=E.n+EB.n;
  const kA=b.ib!=null?R.cd[R.n-1]-R.cd[b.ib]:0, uA=b.ib!=null?R.cu[R.n-1]-R.cu[b.ib]:0, nA=b.ib!=null?R.cn[R.n-1]-R.cn[b.ib]:0, hA=b.ib!=null?horesEntre(b.ib,R.n-1):0;
  const tt=fk+dB+kA;
  set('f-km',km(fk)+'<small>km</small>'); set('f-up','+'+mts(fu)); set('f-dn','−'+mts(fn));
  $('barra').style.width=(fk/tt*100).toFixed(1)+'%'; set('pct',Math.round(fk/tt*100)+' %');
  set('final-nom',b.fi||R.wp[R.wp.length-1].n.split(' · ')[0]);
  const pA=b.ib!=null?paradesEntre(R.cd[b.ib],R.n-1):0;
  set('r-km',km(dB+kA)+'<small>km</small>'); set('r-t',hm(hB+hA+pA)); set('r-up','+'+mts(uB+uA)); set('r-dn','−'+mts(nB+nA));
  const arr=new Date(now+(hB+hA+pA)*3600e3), lim=LIMIT[dia], limD=new Date(now); limD.setHours(...lim.h.split(':').map(Number),0,0);
  const marge=(limD-arr)/3600e3;
  set('r-hora',`Pla ${b.id} · arribada prevista <b>${rel(arr)}</b> · ${lim.txt} ${lim.h} → `+
    (marge>=0?`<b style="color:var(--ok)">marge ${hm(marge)}</b>`:`<b style="color:var(--ter)">vas ${hm(-marge)} tard</b>`));
  if(INI){ const hf=horesEntre(0,b.ia)+paradesEntre(0,b.ia+1)+hores(EB.d/1000,EB.u,EB.n), dif=(now-INI)/3600e3-hf;
    set('ritme',`Segons la fitxa (amb el pla ${b.id}) hauries trigat ${hm(hf)} (amb les parades previstes): `+
      (Math.abs(dif)<5/60?'<b>vas al ritme previst</b>':dif>0?`<b class="up">${hm(dif)} més</b>`:`<b style="color:var(--ok)">${hm(-dif)} menys</b>`)); }
}
function plansB(){ return (typeof PLANSB!=='undefined'&&PLANSB[dia])||[]; }
function sortidaPrevista(ref){ const d=new Date(ref); const [h,m]=R.r.sortida.split(':'); d.setHours(+h,+m,0,0); return d; }
function objectiu(ref){ const d=new Date(ref); const [h,m]=LIMIT[dia].h.split(':'); d.setHours(+h,+m,0,0); return d; }
// marge de l'hora límit: 1 h 30, o menys si amb aquest retard no s'arriba a l'hora objectiu
function margeLimit(ref){ const arr=+sortidaPrevista(ref)+(horesEntre(0,R.n-1)+paradesEntre(0,R.n-1))*3600e3; return Math.max(0,Math.min(1.5*3600e3,+objectiu(ref)-arr)); }
function limitEn(i,ref){ return +sortidaPrevista(ref)+(horesEntre(0,i)+paradesEntre(0,i))*3600e3+margeLimit(ref); }
// temps de marxa des de la posició actual (E) fins a l'índex i1 del track, per trams
function horesDesE(E,i1){ let h=0;
  for(const x of R.trams){ const b=Math.min(i1,x.ib); if(R.cd[b]<=E.d) continue;
    const a=E.d>R.cd[x.ia]?E:{d:R.cd[x.ia],u:R.cu[x.ia],n:R.cn[x.ia]};
    h+=hores((R.cd[b]-a.d)/1000,Math.max(0,R.cu[b]-a.u),Math.max(0,R.cn[b]-a.n)); }
  return h; }
const nomPunt=k=>k;
function nomCruilla(i){ if(i>=R.n-1) return nomPunt(R.wp[R.wp.length-1].k);
  const w=[...R.wp].reverse().find(x=>x.i<=i), d=R.cd[i]-R.cd[w.i], nm=nomPunt(w.k);
  return d<60?nm:`${nm} + ${km(d)} km`; }
// ---------- plans B visibles al mapa (un a un; es desa per ruta i dia) ----------
const PBOFF_KEY='petjada-rutes-pboff-'+RUTA.id;
function pbOff(){ try{ return (JSON.parse(localStorage.getItem(PBOFF_KEY))||{})[dia]||[]; }catch(e){ return []; } }
function pintaPbChips(){ const el=$('c-pbs'); if(!el) return; const L=plansB(), off=pbOff();
  el.hidden=M.pb===false||!L.length;
  el.innerHTML=L.map(b=>`<label class="pbchip${off.includes(b.id)?' off':''}"><input type="checkbox" value="${b.id}" ${off.includes(b.id)?'':'checked'}>${b.id}</label>`).join('')+
    (L.length>1?`<button class="pbtots" type="button">${off.length?'Tots':'Cap'}</button>`:'');
  const desa=o=>{ let all={}; try{ all=JSON.parse(localStorage.getItem(PBOFF_KEY))||{}; }catch(e){} all[dia]=o; try{localStorage.setItem(PBOFF_KEY,JSON.stringify(all))}catch(e){} pintaPbChips(); dibuixaMapa(); };
  el.querySelectorAll('input').forEach(i=>i.onchange=()=>desa([...el.querySelectorAll('input:not(:checked)')].map(x=>x.value)));
  const bt=el.querySelector('.pbtots'); if(bt) bt.onclick=()=>desa(off.length?[]:L.map(b=>b.id)); }

// ---------- GPX per descarregar ----------
function gpxURL(nom,pts){ const x=`<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Petjada" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>${esc(nom)}</name><trkseg>`+
  pts.map(p=>`<trkpt lat="${p[0]}" lon="${p[1]}">${p[2]!=null?`<ele>${Math.round(p[2])}</ele>`:''}</trkpt>`).join('')+`</trkseg></trk></gpx>`;
  return URL.createObjectURL(new Blob([x],{type:'application/gpx+xml'})); }
const nomFitxer=t=>(RUTA.nom+'_'+t).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z0-9]+/g,'_')+'.gpx';
const GPXU={};
function trkLink(b,txt){ const nm=RUTES[dia].curt+(b?' '+b.id:' pla A'), k=dia+'|'+nm;
  if(!GPXU[k]) GPXU[k]=gpxURL(nm,b?b.pts:R.p);
  return `<a class="trk" href="${GPXU[k]}" download="${nomFitxer(nm)}">⬇ ${esc(txt)} (GPX)</a>`; }

// Un pla B només es recomana si, saltant-se'l, ni amb el pla A ni amb un pla B posterior s'arriba a l'hora objectiu.
function pintaPlansB(E,seg,now){
  if($('trk-dia')&&$('trk-dia').dataset.k!==dia){ $('trk-dia').dataset.k=dia; $('trk-dia').innerHTML=trkLink(null,'Track del dia · pla A'); }
  const L=plansB(); const el=$('pb-llista'); if(!el) return;
  if(!L.length){ el.innerHTML='<p class="nota">Sense plans B per a aquest dia.</p>'; return; }
  const objTxt='les '+LIMIT[dia].h; set('pb-obj','objectiu: arribar abans de les '+LIMIT[dia].h);
  const fiA=R.n-1, fiNom=nomPunt(R.wp[R.wp.length-1].k), obj=+objectiu(now), S=ds();
  const enRuta=!!(pos||prova||S.inici), ATUR=5/60;
  const tPlaA=i=>({km:(R.cd[fiA]-R.cd[i])/1000,up:R.cu[fiA]-R.cu[i],dn:R.cn[fiA]-R.cn[i],h:horesEntre(i,fiA)+paradesEntre(R.cd[i],fiA)});
  const tAmbB=b=>{ const hB=hores(b.km,b.up,b.dn); if(b.ib==null) return {km:b.km,up:b.up,dn:b.dn,h:hB};
    const t=tPlaA(b.ib); return {km:b.km+t.km,up:b.up+t.up,dn:b.dn+t.dn,h:hB+t.h}; };
  const tAmbBm=b=>{ const hB=hores(b.km,b.up,b.dn); if(b.ib==null) return {km:b.km,up:b.up,dn:b.dn,h:hB};
    const i=b.ib; return {km:b.km+(R.cd[fiA]-R.cd[i])/1000,up:b.up+R.cu[fiA]-R.cu[i],dn:b.dn+R.cn[fiA]-R.cn[i],h:hB+horesEntre(i,fiA)}; };
  const acabaAlFinal=b=>b.ib!=null||(!!b.fi&&b.fi===fiNom);
  // cadena de decisions: plans B que acaben al final de la ruta
  const chain=L.filter(b=>!b.limitPropi&&acabaAlFinal(b)).sort((x,y)=>x.ia-y.ia);
  const trajecte=(i,j)=>horesEntre(i,j)+paradesEntre(R.cd[i],j);
  const alt=i=>{ let best={h:tPlaA(i).h,via:'el pla A'};
    for(const c of chain) if(c.ia>i){ const h=trajecte(i,c.ia)+ATUR+tAmbB(c).h; if(h<best.h) best={h,via:'el '+c.id}; } return best; };
  const passat=b=>!(S.b&&S.b.id===b.id)&&seg>=b.ia&&b.ia<fiA&&!(b.ia===0&&E.d<100);
  const eta=i=>now+(horesDesE(E,i)+paradesEntre(E.d,i))*3600e3;
  let rec='', recId=null;
  if(enRuta){
    const arrA=eta(fiA);
    if(S.b) rec=`<div class="pbrec ok">Feu el <b>${S.b.id}</b>.</div>`;
    else if(arrA<=obj){ const nx=chain.find(b=>!passat(b));
      rec=`<div class="pbrec ok">Amb el pla A arribeu cap a les <b>${rel(new Date(arrA))}</b>, abans de ${objTxt}: <b>seguiu el pla A</b>.`+
        (nx?` Propera cruïlla: <b>${nomCruilla(nx.ia)}</b> (${nx.id}), cap a les ${rel(new Date(eta(nx.ia)))}.`:'')+`</div>`; }
    else{
      const op=L.filter(b=>!passat(b)&&!b.limitPropi).map(b=>{ const e=eta(b.ia); return {b,eta:e,arr:e+(ATUR+tAmbB(b).h)*3600e3,fi:acabaAlFinal(b)}; });
      const ok=op.filter(o=>o.arr<=obj&&o.fi).sort((x,y)=>y.b.ia-x.b.ia);
      const ara=o=>o.eta-now<3*60e3;
      if(ok.length){ const o=ok[0]; recId=o.b.id;
        rec=`<div class="pbrec">Amb el pla A arribaríeu a les <b>${rel(new Date(arrA))}</b>, després de ${objTxt}. `+(ara(o)?`Agafeu el <b>${o.b.id}</b> ara (${nomCruilla(o.b.ia)}): arribada <b>${rel(new Date(o.arr))}</b>.`:
          `Podeu seguir fins a <b>${nomCruilla(o.b.ia)}</b> (cap a les ${rel(new Date(o.eta))}) i agafar el <b>${o.b.id}</b>: arribada <b>${rel(new Date(o.arr))}</b>.`+(ok.length>1?` <span style="opacity:.85">Abans d'aquesta cruïlla no cal desviar-se.</span>`:''))+`</div>`; }
      else{ const o2=op.filter(o=>o.arr<=obj).sort((x,y)=>x.arr-y.arr)[0];
        if(o2){ recId=o2.b.id; rec=`<div class="pbrec">Amb el pla A arribaríeu a les <b>${rel(new Date(arrA))}</b>. Cap pla B fins al final hi arriba a temps; el <b>${o2.b.id}</b> us porta a <b>${esc(o2.b.fi||'')}</b> a les ${rel(new Date(o2.arr))} (cal transport des d'allà).</div>`; }
        else if(op.length){ const o=op.sort((x,y)=>x.arr-y.arr)[0]; recId=o.b.id;
          rec=`<div class="pbrec">Amb el pla A arribaríeu a les <b>${rel(new Date(arrA))}</b>. Cap pla B us fa arribar abans de ${objTxt}; el que arriba abans és el <b>${o.b.id}</b> (${rel(new Date(o.arr))}). Escurceu parades, valoreu-ho amb el grup i, si cal, truqueu al 112.</div>`; }
        else rec=`<div class="pbrec">Amb el pla A arribaríeu a les <b>${rel(new Date(arrA))}</b>, després de ${objTxt}, i ja no queden plans B per davant: escurceu parades i, si cal, truqueu al 112.</div>`; }
    }
  }
  const fila=(n,t,arr)=>`<tr><td>${n}</td><td>${km(t.km*1000)}</td><td>${Math.round(t.up)}</td><td>${Math.round(t.dn)}</td><td>${hm(t.h)}</td>${arr!==undefined?`<td>${arr}</td>`:''}</tr>`;
  el.innerHTML=rec+L.map(b=>{
    const alFinal=acabaAlFinal(b), fi=alFinal?fiNom:(b.fi||fiNom), tB=tAmbBm(b), enC=S.b&&S.b.id===b.id, fet=S.desv&&S.desv.id===b.id, ps=passat(b);
    const pas=+sortidaPrevista(now)+(horesEntre(0,b.ia)+paradesEntre(0,b.ia))*3600e3, enCadena=chain.includes(b);
    let dec, lim;
    if(!enCadena){ lim=obj-(ATUR+tAmbB(b).h)*3600e3; dec=`pas previst ${rel(new Date(pas))} · per arribar a ${esc(fi)} abans de ${objTxt}, cal agafar-lo abans de les <b>${rel(new Date(lim))}</b>`; }
    else{ const a=alt(b.ia); lim=obj-a.h*3600e3;
      dec=`pas previst ${rel(new Date(pas))} · <b class="lim">decisió ${rel(new Date(lim))}</b><br><span class="nota">Si hi passeu més tard, agafeu el ${b.id}; abans, saltant-vos-el encara arribeu a temps amb ${a.via}.</span>`; }
    const viu=enRuta&&!ps&&!enC&&!fet, base=viu?eta(b.ia):null;
    const arrB=viu?rel(new Date(base+(ATUR+tAmbB(b).h)*3600e3)):undefined, tA=alFinal?tPlaA(b.ia):null;
    const tAm=tA?{km:tA.km,up:tA.up,dn:tA.dn,h:horesEntre(b.ia,fiA)}:null, arrA=viu&&tA?rel(new Date(base+tA.h*3600e3)):undefined;
    const cls=enC?'ok':fet||ps?'passat':recId===b.id?'alerta':'', st=enC?'en curs':fet?'fet':ps?'cruïlla passada':recId===b.id?'recomanat':'';
    return `<div class="pb ${cls}"><div class="pb-h"><span class="id">${b.id}</span>${esc(b.nom)}${st?`<span class="st">${st}</span>`:''}</div>
      <div class="nota">${esc(b.desc)}</div>
      <div class="sub" style="margin-top:4px">Cruïlla: <b>${nomCruilla(b.ia)}</b> · ${dec}</div>
      <table><thead><tr><th>De la cruïlla a ${esc(fi)}</th><th>km</th><th>D+</th><th>D−</th><th>Marxa</th>${viu?'<th>Arribada</th>':''}</tr></thead><tbody>
      ${fila('Amb el '+b.id,tB,arrB)}${tAm?fila('Seguint el pla A',tAm,arrA):''}</tbody></table>
      ${viu?'':`<div class="nota" style="margin-top:4px">Si l'agafeu a les ${rel(new Date(lim))}: a ${esc(fi)} a les <b>${rel(new Date(lim+(ATUR+tAmbB(b).h)*3600e3))}</b>.</div>`}
      ${b.q?`<div class="pbq">${b.q.corriol?`<span>corriol ${b.q.corriol}%</span>`:''}${b.q.pista?`<span>pista ${b.q.pista}%</span>`:''}${b.q.carretera?`<span>carretera ${b.q.carretera}%</span>`:''}${b.q.plaA?`<span>pla A ${b.q.plaA}%</span>`:''}<span>pendent màx. ${b.q.pmax}%</span><a href="${b.q.strava}" target="_blank" rel="noopener">Heatmap Strava ↗</a></div>`:''}${b.coment?`<p class="nota" style="margin-top:4px">🤖 ${esc(b.coment)}</p>`:''}
      <div style="margin-top:6px">${trkLink(b,'Track '+b.id)}</div></div>`;
  }).join('')+`<p class="nota" style="margin-top:6px">Un pla B només es recomana si, saltant-vos-el, ni amb el pla A ni amb un pla B posterior arribaríeu abans de ${objTxt}. «Decisió» = hora més tardana per passar per la cruïlla i saltar-vos-el, comptant les parades previstes i 5 min d'aturada quan s'agafa un pla B. Taules: temps de marxa; «Arribada» des d'on sou ara, amb parades.</p>`;
}


// ---------- Pestanya 112 ----------
const TELS=[
  ['Emergències',[['Emergències (sanitat, bombers, policia)','112',1]]],
  ...((RUTA.tels&&RUTA.tels.length)?[['Telèfons de la zona (generats amb Claude: verifica\'ls)',RUTA.tels.map(t=>[t.nom+(t.nota?' · '+t.nota:''),String(t.tel).replace(/[^0-9+]/g,'')])]]:[]),
  ...(CONF.guiaTel?[['Guia',[[CONF.guiaNom||'Guia',CONF.guiaTel.replace(/[^0-9+]/g,'')]]]]:[])
];
const fmtTel=t=>/^\d{9}$/.test(t)?t.replace(/(\d{3})(\d{2})(\d{2})(\d{2})/,'$1 $2 $3 $4'):t;
function pintaTels(){
  let ext={}; try{ext=JSON.parse(localStorage.getItem('petjada-rutes-ext')||'{}')}catch(e){}
  let h=''; TELS.forEach(([g,ll])=>{ h+=`<tr class="grup"><td colspan="2">${esc(g)}</td></tr>`;
    ll.forEach(([n,t,u])=>{ h+=`<tr><td>${esc(n)}</td><td><a class="${u?'urg':''}" href="tel:${esc(t)}">${esc(fmtTel(t))}</a></td></tr>`; }); });
  if(ext.tel) h+=`<tr class="grup"><td colspan="2">Contacte extern</td></tr><tr><td>${esc(ext.nom||'')}</td><td><a href="tel:${esc(ext.tel.replace(/\s/g,''))}">${esc(ext.tel)}</a></td></tr>`;
  
  $('e-tels').innerHTML=h; $('e-acces').innerHTML=''; if(RUTA.acces){ $('e-acces').innerHTML='<b>Accés amb vehicle:</b> '; $('e-acces').append(RUTA.acces); } $('e-nota-tels').textContent=RUTA.notaTels||''; $('e-ext').value=ext.tel||''; $('e-ext-nom').value=ext.nom||'';
}
// WGS84 → UTM (fus 31N); ETRS89 i WGS84 coincideixen a efectes pràctics
function utm(lat,lon,zona=31){
  const a=6378137,f=1/298.257223563,k0=0.9996,e2=f*(2-f),ep2=e2/(1-e2),r=Math.PI/180;
  const l0=((zona-1)*6-180+3)*r,ph=lat*r,la=lon*r,N=a/Math.sqrt(1-e2*Math.sin(ph)**2),T=Math.tan(ph)**2,C=ep2*Math.cos(ph)**2,A=Math.cos(ph)*(la-l0);
  const M=a*((1-e2/4-3*e2*e2/64-5*e2**3/256)*ph-(3*e2/8+3*e2*e2/32+45*e2**3/1024)*Math.sin(2*ph)+(15*e2*e2/256+45*e2**3/1024)*Math.sin(4*ph)-(35*e2**3/3072)*Math.sin(6*ph));
  const x=k0*N*(A+(1-T+C)*A**3/6+(5-18*T+T*T+72*C-58*ep2)*A**5/120)+500000;
  const y=k0*(M+N*Math.tan(ph)*(A*A/2+(5-T+9*C+4*C*C)*A**4/24+(61-58*T+T*T+600*C-330*ep2)*A**6/720));
  return [Math.round(x),Math.round(y)];
}
function gms(v,p,n){ const s=v<0?n:p; v=Math.abs(v); const g=Math.floor(v), m=Math.floor((v-g)*60), sg=((v-g)*60-m)*60; return `${g}°${String(m).padStart(2,'0')}'${sg.toFixed(1).padStart(4,'0')}"${s}`; }
function puntsTots(){ const L=[]; for(const k of DIES){ const r=RUTES[k]; r.wp.forEach(w=>{ const p=r.pts[w.i];
  if(L.some(x=>Math.abs(x.lat-p[0])<2e-4&&Math.abs(x.lon-p[1])<2e-4&&x.k===w.k)) return;
  const t=((INFO[k]||{})[w.k]||{}).titol||w.n.split(' · ').slice(1).join(' · ')||w.n; L.push({k:w.k,n:t.split(' · ')[0].replace(/\s*\((≈|sortida|arribada)\)/g,'').trim(),lat:p[0],lon:p[1],z:p[2],dia:k}); }); } return L; }
function textCoord(){ if(!lastFix) return ''; const [x,y]=utm(lastFix.lat,lastFix.lon), pr=puntMesProper();
  return `Som a ${lastFix.lat.toFixed(5)}, ${lastFix.lon.toFixed(5)} (UTM 31N ${x} ${y})`+(lastFix.alt!=null?`, ${Math.round(lastFix.alt)} m`:'')+(pr?`. A ${pr.d<1000?Math.round(pr.d)+' m':km(pr.d)+' km'} de ${pr.p.k} ${pr.p.n}`:'')+`. Ruta: ${RUTA.nom}.`; }
function puntMesProper(){ if(!lastFix) return null; let b=null; for(const p of puntsTots()){ const d=hav([lastFix.lat,lastFix.lon],[p.lat,p.lon]); if(!b||d<b.d) b={p,d}; } return b; }
function pinta112(){
  if($('v112').hidden) return;
  const el=$('e-on');
  if(!lastFix){ el.innerHTML='<p class="nota">Activa el GPS per veure les coordenades (funciona sense cobertura).</p>'; }
  else{ const [x,y]=utm(lastFix.lat,lastFix.lon), pr=puntMesProper(), edat=Math.round((Date.now()-lastFix.ts)/60000);
    el.innerHTML=`<div class="coord">${lastFix.lat.toFixed(5)}, ${lastFix.lon.toFixed(5)}<small>Graus decimals (WGS84)</small></div>
      <div class="coord" style="margin-top:6px">${gms(lastFix.lat,'N','S')} ${gms(lastFix.lon,'E','O')}<small>Graus, minuts i segons</small></div>
      <div class="coord" style="margin-top:6px">31T ${x} ${y}<small>UTM fus 31N (X, Y)</small></div>
      <p class="sub" style="margin-top:8px">${lastFix.alt!=null?'Alçada GPS '+Math.round(lastFix.alt)+' m · ':''}precisió ±${Math.round(lastFix.acc)} m · ${edat<1?'ara mateix':'fa '+edat+' min'}</p>`+
      (pr?`<p class="sub">Punt més proper: <b>${pr.p.k} ${esc(pr.p.n)}</b> a ${pr.d<1000?Math.round(pr.d)+' m':km(pr.d)+' km'}</p>`:'');
    $('e-sms').href='sms:?body='+encodeURIComponent(textCoord()); }
  if(!$('e-punts').dataset.ok){ $('e-punts').dataset.ok=1;
    $('e-punts').innerHTML='<table class="punts112"><thead><tr><th>Codi</th><th>Punt</th><th>WGS84</th><th>UTM 31N</th><th>Cota</th></tr></thead><tbody>'+
      puntsTots().map(p=>{const [x,y]=utm(p.lat,p.lon); return `<tr><td><b>${p.k}</b></td><td>${esc(p.n)}</td><td>${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}</td><td>${x} ${y}</td><td>${Math.round(p.z)} m</td></tr>`;}).join('')+'</tbody></table>'; }
}
document.querySelectorAll('nav.vistes button').forEach(b=>b.onclick=()=>{
  const v=b.dataset.v;
  document.querySelectorAll('nav.vistes button').forEach(x=>x.classList.toggle('on',x===b));
  if(v==='vlib') return; for(const id of ['vruta','vbri','vmet','v112','vlib']) $(id).hidden=id!==v;
  document.querySelector('header .tabs').style.display=v==='vruta'?'':'none';
  window.scrollTo(0,0); if(v==='vbri') pintaBriefing(); if(v==='v112'){ pinta112(); pintaCob(); } if(v==='vmet') try{pintaMeteo()}catch(e){} });
$('e-gps').onclick=()=>{ gpsOn(); };
$('e-copia').onclick=async()=>{ const t=textCoord(); if(!t){ $('e-copia').textContent='Encara no hi ha posició'; return; }
  try{ await navigator.clipboard.writeText(t); $('e-copia').textContent='Copiat ✓'; }catch(e){ prompt('Copia aquest text:',t); }
  setTimeout(()=>$('e-copia').textContent='Copiar coordenades',2500); };
$('e-sms').onclick=e=>{ if(!lastFix){ e.preventDefault(); gpsOn(); } };
const desaExt=()=>{ try{localStorage.setItem('petjada-rutes-ext',JSON.stringify({nom:$('e-ext-nom').value.trim(),tel:$('e-ext').value.trim()}))}catch(e){} pintaTels(); };
$('e-ext').onchange=desaExt; $('e-ext-nom').onchange=desaExt;
pintaTels();

// ---------- Briefing (guió per a l'inici, a partir de les dades de la ruta) ----------
const BRI_KEY='petjada-ruta-bri-'+RUTA.id;
function briDades(){ try{return JSON.parse(localStorage.getItem(BRI_KEY))||{}}catch(e){return {}} }
function briDesa(d){ try{localStorage.setItem(BRI_KEY,JSON.stringify(d))}catch(e){} }
// sortida i posta del sol (hora local del mòbil) per a una data i un lloc
function solHores(dataStr,lat,lon){ if(!dataStr) return null; const d=new Date(dataStr+'T12:00');
  const N=Math.floor((d-new Date(d.getFullYear(),0,0))/864e5), r=Math.PI/180, lh=lon/15;
  const calc=rise=>{ const t=N+((rise?6:18)-lh)/24, M=0.9856*t-3.289; let L=(M+1.916*Math.sin(M*r)+0.020*Math.sin(2*M*r)+282.634)%360;
    let RA=(Math.atan(0.91764*Math.tan(L*r))/r+360)%360; RA=(RA+Math.floor(L/90)*90-Math.floor(RA/90)*90)/15;
    const sd=0.39782*Math.sin(L*r), cd=Math.cos(Math.asin(sd)), ch=(Math.cos(90.833*r)-sd*Math.sin(lat*r))/(cd*Math.cos(lat*r));
    if(ch>1||ch<-1) return null; let H=(rise?360-Math.acos(ch)/r:Math.acos(ch)/r)/15;
    const UT=((H+RA-0.06571*t-6.622-lh)%24+24)%24, x=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate(),0,0)+UT*3600e3);
    return rel(x); };
  return {surt:calc(true),posta:calc(false)}; }
function resumDia(k){ const q=prepara(k), keep=dia; dia=k; const keepR=R; R=q;
  const h=horesEntre(0,q.n-1), hp=paradesEntre(0,q.n-1), tp=textParades(); R=keepR; dia=keep;
  let zmax=-1e9, imax=0; q.wp.forEach(w=>{ const z=q.p[w.i][2]; if(z>zmax){zmax=z; imax=w.i;} });
  const top=q.wp.find(w=>w.i===imax);
  return {km:q.cd[q.n-1]/1000,up:q.cu[q.n-1],dn:q.cn[q.n-1],h,hp,tp,ini:q.wp[0],fi:q.wp[q.wp.length-1],top,zmax,q,sortida:RUTES[k].sortida}; }
function sumaHora(hh,h){ const [a,b]=hh.split(':').map(Number), t=Math.round(a*60+b+h*60); return Math.floor(t/60)%24+':'+String(t%60).padStart(2,'0'); }
function pintaBriefing(){ const el=$('bri'); if(!el) return; const B=briDades(), E=B.fet||{};
  const guia=CONF.guiaNom||'el vostre guia', tel=(CONF.guiaTel||'').trim();
  const dies=DIES.map((k,j)=>({k,j,r:resumDia(k)}));
  const nomW=w=>{ const p=(w.n||w.k).split(' · '); return esc(p[1]||p[0]); };
  const sec=(n,id,tit,cos)=>`<section class="card${E[id]?' fet':''}" data-s="${id}"><h2><span><i>${n}</i>${tit}</span><label><input type="checkbox" ${E[id]?'checked':''}>fet</label></h2>${cos}</section>`;
  const ta=(id,ph,rows=3)=>`<textarea class="bri-t" data-f="${id}" rows="${rows}" placeholder="${ph}">${esc(B[id]||'')}</textarea>`;
  const r0=dies[0].r, p0=r0.ini;
  el.innerHTML=`<p class="nota" style="margin:2px 2px 10px">Guió per al briefing abans de començar a caminar (≈ 10–15 min). Punts per dir amb les teves paraules, no per llegir. Els camps de text es desen en aquest mòbil.</p>`+
  sec(1,'jo','Em presento',`<ul><li>Sóc ${CONF.guiaNom?`en/na <b>${esc(guia)}</b>`:'el vostre guia'}, guia de muntanya.</li>
    ${tel?`<li>El meu telèfon: <a href="tel:${esc(tel.replace(/[^0-9+]/g,''))}"><b>${esc(tel)}</b></a>. Guardeu-lo ara al mòbil.</li>`:'<li class="nota">Posa el teu nom i telèfon a la pestanya Rutes → configuració.</li>'}
    <li>Avui fem: <b>${esc(RUTA.nom)}</b>${DIES.length>1?` (${DIES.length} dies)`:''}.</li></ul>`)+
  sec(2,'grup','Es presenta el grup',`<ul><li><b>Nom</b> i experiència prèvia en rutes semblants.</li><li>Alguna <b>molèstia, lesió</b>, al·lèrgia o medicació que hagi de saber? <span class="nota">(Qui ho prefereixi, m'ho pot dir a part.)</span></li></ul>${ta('notes','Notes del grup')}`)+
  sec(3,'on','On som, què ens envolta i on anem',`<p class="bri-s">On som (de més general a més concret)</p>
    <p class="nota">Som a <b>${nomW(p0)}</b>, a ${Math.round(r0.q.p[p0.i][2])} m.</p>${ta('on','País, serralada, comarca, municipi, espai protegit…')}
    <p class="bri-s">Què ens envolta</p><div class="rosa">${['N','E','S','O'].map(c=>`<b>${c}</b><input class="bri-t" data-f="r${c}" value="${esc(B['r'+c]||'')}" placeholder="què hi ha cap al ${({N:'nord',E:'est',S:'sud',O:'oest'})[c]}">`).join('')}</div>
    <p class="bri-s">On anem</p><ul>${dies.map(({r,j})=>`<li>${DIES.length>1?`<b>Dia ${j+1}:</b> `:''}de ${nomW(r.ini)} a ${nomW(r.fi)} passant per ${r.q.wp.slice(1,-1).map(nomW).join(', ')||'—'}. Punt més alt: <b>${nomW(r.top)}</b> (${Math.round(r.zmax)} m).</li>`).join('')}</ul>`)+
  sec(4,'det','Detalls de la ruta',`<div class="xif">${dies.map(({k,j,r})=>{ const sol=solHores(DATES[k],r.q.p[0][0],r.q.p[0][1]);
      return `<div><strong>${esc(RUTES[k].curt)}</strong><span>${r.km.toFixed(1).replace('.',',')} km · +${Math.round(r.up)} / −${Math.round(r.dn)} m</span>
      <span>Marxa: <b>${hm(r.h)}</b> · amb parades: <b>${hm(r.h+r.hp)}</b></span><span>Sortida ${r.sortida} → arribada ≈ ${sumaHora(r.sortida,r.h+r.hp)}</span>
      <span class="nota">Objectiu: arribar abans de les ${LIMIT[k].h}${sol&&sol.posta?` · sol: ${sol.surt}–${sol.posta}`:''}</span><span class="nota">Parades: ${esc(r.tp)}</span>
      <span class="nota">Plans B previstos: ${(PLANSB[k]||[]).length}</span></div>`; }).join('')}</div>
    <ul><li>Els horaris són orientatius: si anem tard o el temps canvia, tenim alternatives (plans B) i les decideixo jo.</li></ul>${ta('aigua','Aigua i fonts, punts d\'interès, el que cal destacar…',2)}`)+
  sec(5,'mat','Repàs del material',`<p style="margin-bottom:6px">Encara som als cotxes: si falta alguna cosa, ara és el moment.</p><ul>
    <li><b>Roba per capes:</b> samarreta tècnica, folre, jaqueta impermeable i tallavents, gorra o gorro, guants si fa fred.</li>
    <li><b>Peus:</b> botes de muntanya; bastons si en feu servir.</li>
    <li><b>Aigua</b> (mínim 1,5–2 L) i menjar per a tot el dia.</li>
    <li><b>Frontal</b>, medicació pròpia, crema solar i ulleres de sol.</li>
    <li>DNI i targeta sanitària; mòbil carregat.</li></ul>${ta('mat','Material específic d\'aquesta ruta (corda, arnès, sac…)',2)}`)+
  sec(6,'fun','Funcionament del grup',`<ul><li>Jo vaig <b>davant</b> i marco el ritme. Ningú m'avança.</li>
    <li>Anem <b>junts</b>. Una persona va l'última i m'avisa si algú es despenja.</li>
    <li>Primera parada curta al primer punt per beure i treure capes; després, parades previstes. Si necessiteu parar, digueu-ho de seguida.</li>
    <li>Les instruccions dels trams delicats les donaré quan toqui. Els canvis d'itinerari els decideixo jo i us explicaré el perquè.</li>
    <li>Si algú es perd de vista: es queda quiet i em truca${tel?` (${esc(tel)})`:''}. Sense cobertura, el 112.</li>
    <li>No deixem rastre: les deixalles, a la motxilla. Dubtes? … Som-hi!</li></ul>`)+
  `<div class="botons"><button class="btn s" id="bri-reset">Desmarcar-ho tot</button></div>`;
  el.querySelectorAll('section[data-s] h2 input').forEach(c=>c.onchange=()=>{ const s=c.closest('section'), d=briDades(); d.fet=d.fet||{}; d.fet[s.dataset.s]=c.checked; s.classList.toggle('fet',c.checked); briDesa(d); });
  el.querySelectorAll('.bri-t').forEach(t=>t.oninput=()=>{ const d=briDades(); d[t.dataset.f]=t.value; briDesa(d); });
  $('bri-reset').onclick=()=>{ const d=briDades(); d.fet={}; briDesa(d); pintaBriefing(); };
}

// ---------- Cobertura del 112 (captura del mapa i resum, per ruta) ----------
const COB_KEY='petjada-ruta-cob-'+RUTA.id;
function pintaCob(){ const el=$('cob'); if(!el) return; let c={}; try{c=JSON.parse(localStorage.getItem(COB_KEY))||{}}catch(e){}
  el.innerHTML=(c.img?`<a href="${c.img}" target="_blank"><img src="${c.img}" style="width:100%;border-radius:8px;border:1px solid #d9d3c6" alt="Mapa de cobertura de la ruta"></a>`:'<p class="nota">Encara no hi ha cap mapa de cobertura per a aquesta ruta.</p>')+
    `<div class="botons" style="margin-top:8px"><label class="btn s" style="text-align:center">${c.img?'Canviar la captura':'Afegir captura del mapa'}<input type="file" accept="image/*" id="cob-f" hidden></label>${c.img?'<button class="btn s" id="cob-x">Treure-la</button>':''}</div>
    <textarea id="cob-t" rows="3" placeholder="Trams amb senyal i sense (p. ex. «amb senyal: carena P3–P5; sense: obaga P1–P2»)" style="width:100%;margin-top:8px;font:inherit;border:1px solid #d9d3c6;border-radius:8px;padding:8px">${esc(c.txt||'')}</textarea>
    <p class="nota" style="margin-top:6px">Fes la captura a casa amb el mapa de cobertura teòrica del 112 (dades obertes de la Generalitat) i dibuixa-hi la ruta. Queda desada al mòbil i es veu sense cobertura. <a href="https://analisi.transparenciacatalunya.cat/Urbanisme-infraestructures/Cobertura-m-bil-112/4tqz-ha5q" target="_blank" rel="noopener">Dades de cobertura del 112 ↗</a></p>`;
  const desa=o=>{ try{localStorage.setItem(COB_KEY,JSON.stringify(o)); return true}catch(e){ alert('No hi cap: prova amb una captura més petita.'); return false} };
  $('cob-t').oninput=()=>{ c.txt=$('cob-t').value; desa(c); };
  if($('cob-x')) $('cob-x').onclick=()=>{ delete c.img; desa(c); pintaCob(); };
  $('cob-f').onchange=e=>{ const f=e.target.files[0]; if(!f) return; const im=new Image(), u=URL.createObjectURL(f);
    im.onload=()=>{ const k=Math.min(1,1400/Math.max(im.width,im.height)), cv=document.createElement('canvas'); cv.width=Math.round(im.width*k); cv.height=Math.round(im.height*k);
      cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height); c.img=cv.toDataURL('image/jpeg',0.75); URL.revokeObjectURL(u); if(desa(c)) pintaCob(); };
    im.src=u; };
}

// ---------- Obaga / solell, sol i confort del grup ----------
const DIRNOM={N:'nord',NE:'nord-est',E:'est',SE:'sud-est',S:'sud',SO:'sud-oest',O:'oest',NO:'nord-oest'};
const VTIPUS={
  obaga:{nom:'Obaga',col:'#3d6c86'}, solell:{nom:'Solell',col:'#C8553D'},
  llevant:{nom:'Vessant de llevant',col:'#b7791f'}, ponent:{nom:'Vessant de ponent',col:'#8a6d3b'},
  pla:{nom:'Pla o carena',col:'#6b7478'}
};
function vessants(){ return (typeof VESSANTS!=='undefined'&&VESSANTS[dia])||[]; }
function vessantA(d){ const v=vessants(); return v.find(s=>d>=s.d0&&d<s.d1)||v[v.length-1]; }
// Posició del sol (fórmula astronòmica simplificada, precisió d'1°)
function solPos(date,lat,lon){const r=Math.PI/180,d=(date-Date.UTC(2000,0,1,12))/864e5;const g=(357.529+0.98560028*d)*r,q=280.459+0.98564736*d,L=(q+1.915*Math.sin(g)+0.020*Math.sin(2*g))*r,e=(23.439-0.00000036*d)*r;
  const RA=Math.atan2(Math.cos(e)*Math.sin(L),Math.cos(L)),dec=Math.asin(Math.sin(e)*Math.sin(L));const GMST=((18.697374558+24.06570982441908*d)%24+24)%24;const H=(GMST*15+lon)*r-RA;const f=lat*r;
  const el=Math.asin(Math.sin(f)*Math.sin(dec)+Math.cos(f)*Math.cos(dec)*Math.cos(H));const az=Math.atan2(-Math.sin(H),Math.tan(dec)*Math.cos(f)-Math.sin(f)*Math.cos(H));return {el:el/r,az:((az/r)+360)%360};}
// Llum directa que rep el vessant (sense comptar l'ombra de muntanyes veïnes ni del bosc)
function solVessant(sg,date,lat,lon){
  const p=solPos(date,lat,lon); if(p.el<=0) return {k:'nit',el:p.el};
  const s=Math.atan((sg.sl||0)/100), r=Math.PI/180;
  const ci=Math.cos(s)*Math.sin(p.el*r)+Math.sin(s)*Math.cos(p.el*r)*Math.cos((p.az-(sg.asp||0))*r);
  return {k: ci<0.12?'ombra':ci<0.3?'feble':'sol', ci, el:p.el};
}
const SOLTXT={sol:'☀ al sol',feble:'⛅ sol feble (de biaix)',ombra:"🌑 a l'ombra",nit:'🌙 sense sol'};
function idxA(d){ let lo=0,hi=R.n-1; while(lo<hi){const m=(lo+hi)>>1; if(R.cd[m]<d) lo=m+1; else hi=m;} return lo; }
function pintaVessant(E){
  const v=vessants(); if(!v.length){$('vess').hidden=true;return}
  const now=prova&&provaHora?provaHora:new Date();
  const sg=vessantA(E.d), t=VTIPUS[sg.c], sol=solVessant(sg,now,E.lat,E.lon);
  const met=meteoEn(now,E.e);
  const tapat=met&&met.cc>=75;
  $('vess').style.setProperty('--vc',t.col);
  set('vess-nom',`${t.nom} · cara ${DIRNOM[sg.dir]} · ${tapat&&sol.k!=='nit'?'☁ cel tapat':SOLTXT[sol.k]}`);
  const nx=v[v.indexOf(sg)+1];
  set('vess-seg', nx?`en ${km(Math.max(0,nx.d0-E.d))} km → ${VTIPUS[nx.c].nom.toLowerCase()}`:'');
  set('conf-met', met?`Ara aquí (≈${mts(E.e)}): <b>${tC(met.t)} °C</b>, sensació <b>${tC(met.at)} °C</b> · vent ${met.ws.toFixed(0)} km/h (ratxes ${met.wg.toFixed(0)}) · núvols ${met.cc.toFixed(0)} %`
    :'<span class="nota">Sense previsió desada: actualitza la meteo amb cobertura per tenir temperatura i vent.</span>');
  const c=[];
  const fred=met?met.at<3:null, vent=met?met.wg>=35:false;
  // on som
  if(sol.k==='sol'&&!tapat) c.push(met&&met.wg>=30?'Al sol però amb vent: per parar, busca recer (bosc o fondalada).':'Al sol: <b>bon lloc per parar</b> i reagrupar.');
  else if(sol.k==='feble'&&!tapat) c.push('Sol de biaix: parada curta, s\'hi està bé si no fa vent.');
  else if(sol.k==='ombra'||tapat) c.push(fred?'<b>Ombra i fred</b> ('+tC(met.at)+' °C de sensació): evita parades llargues; si cal parar, capa d\'abric posada <i>abans</i> de refredar-se.':'A l\'ombra: aquí es refreda ràpid en parar; millor seguir fins a un lloc assolellat.');
  // què ve: pujades i baixades del proper km
  const i0=idxA(E.d), i1=idxA(Math.min(E.d+1000,R.cd[R.n-1]));
  const up=R.cu[i1]-R.cu[i0], dn=R.cn[i1]-R.cn[i0];
  const sgN=vessantA(Math.min(E.d+500,R.cd[R.n-1]));
  const solN=solVessant(sgN,new Date(+now+horesEntre(i0,idxA(Math.min(E.d+500,R.cd[R.n-1])))*3600e3),E.lat,E.lon);
  if(up>=70) c.push(`Ve una pujada (+${Math.round(up)} m el proper km)${solN.k==='sol'&&!tapat?' al sol':''}: <b>treure una capa abans de començar</b> per no suar.`);
  else if(dn>=70) c.push(`Ve una baixada (−${Math.round(dn)} m el proper km)${solN.k!=='sol'||tapat?" per l'ombra":''}: <b>posar-se una capa abans de baixar</b>.`);
  // vent als colls i carenes propers
  const wpN=R.wp.find(x=>R.cd[x.i]>E.d && R.cd[x.i]-E.d<800 && /coll|collada|carena|cim|moreneta|pilota|devesa/i.test(x.n));
  if(wpN&&met&&met.wg>=25) c.push(`A ${wpN.n.split(' ·')[0]} (${km(R.cd[wpN.i]-E.d)} km) serà més exposat al vent (ratxes ≈${met.wg.toFixed(0)} km/h): <b>tallavent a mà</b>.`);
  if(met&&met.pp>=40) c.push(`Probabilitat de precipitació ${met.pp.toFixed(0)} %: impermeable a punt.`);
  set('conf-cons',c.map(x=>`<li>${x}</li>`).join(''));
  // propera parada idònia (al sol i sense gaire vent), en els propers 4 km
  let par='';
  if(!(sol.k==='sol'&&!tapat)){
    let ventos=null;
    for(let d=E.d+200; d<=Math.min(E.d+4000,R.cd[R.n-1]); d+=100){
      const i=idxA(d), eta=new Date(+now+horesEntre(i0,i)*3600e3), sgx=vessantA(d), q=R.p[i];
      const sx=solVessant(sgx,eta,q[0],q[1]), mx=meteoEn(eta,q[2]);
      if(sx.k!=='sol' || (mx&&mx.cc>=60)) continue;
      const txt=`en ${km(d-E.d)} km (≈${rel(eta)}), ${VTIPUS[sgx.c].nom.toLowerCase()} cara ${DIRNOM[sgx.dir]}`;
      if(!mx||mx.wg<40){ par=`<b>Propera parada al sol:</b> ${txt}.`; break; }
      if(!ventos) ventos=`<b>Propera zona al sol:</b> ${txt}, però amb ratxes d'uns ${Math.round(mx.wg)} km/h: parada curta o a recer.`;
    }
    if(!par) par=ventos||'En els propers 4 km no hi ha cap tram al sol: per parar, busca recer del vent (bosc dens o fondalada).';
  }
  set('conf-parada',par);
}
function pintaResumVessants(){
  const v=vessants(); if(!v.length) return '';
  const T=R.cd[R.n-1];
  return `<details class="det"><summary>Obaga i solell al llarg de la ruta</summary><ul>`+v.filter(s=>s.d1-s.d0>=300).map(s=>`<li>km ${km(s.d0)}–${km(Math.min(s.d1,T))}: ${VTIPUS[s.c].nom.toLowerCase()} (cara ${DIRNOM[s.dir]})</li>`).join('')+`</ul>`+
    `<p class="nota">Orientació i pendent: model del terreny (Copernicus 90 m). El sol es calcula per a l'hora i el pendent, però no compta l'ombra de muntanyes veïnes ni del bosc.</p></details>`;
}

// ---------- Meteo (Open-Meteo), desada per anar sense cobertura ----------
const tC=x=>String(Math.round(x)||0);
const MET_KEY='petjada-ruta-meteo-'+RUTA.id;
const MET_PTS=RUTA.metPts;
let MET=null; try{ MET=JSON.parse(localStorage.getItem(MET_KEY)); }catch(e){}
let metDia=null;
const WMO={0:'serè',1:'poc núvol',2:'mig núvol',3:'tapat',45:'boira',48:'boira gebradora',51:'plugim',53:'plugim',55:'plugim fort',56:'plugim gelant',57:'plugim gelant',61:'pluja feble',63:'pluja',65:'pluja forta',66:'pluja gelant',67:'pluja gelant',71:'neu feble',73:'neu',75:'neu forta',77:'neu granulada',80:'ruixats',81:'ruixats',82:'ruixats forts',85:'ruixats de neu',86:'ruixats de neu',95:'tempesta',96:'tempesta i calamarsa',99:'tempesta i calamarsa'};
function diaSortida(){ const d=new Date(), k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); return Object.values(DATES).includes(k); }
function maxEdat(){ return (diaSortida()?1:3)*3600e3; }
setInterval(()=>{ if(navigator.onLine) carregaMeteo(false); }, 10*60e3);
window.addEventListener('online',()=>carregaMeteo(false));
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') carregaMeteo(false); });
async function carregaMeteo(manual){
  const vell=!MET||Date.now()-MET.ts>maxEdat();
  if(!manual&&!vell) return pintaMeteo();
  if(!navigator.onLine){ pintaMeteo(); return; }
  const v='temperature_2m,apparent_temperature,precipitation_probability,precipitation,snowfall,wind_speed_10m,wind_gusts_10m,wind_direction_10m,cloud_cover,weather_code,freezing_level_height';
  const u='https://api.open-meteo.com/v1/forecast?latitude='+MET_PTS.map(p=>p.lat).join(',')+'&longitude='+MET_PTS.map(p=>p.lon).join(',')+'&elevation='+MET_PTS.map(p=>p.e).join(',')+
    '&hourly='+v+'&daily=sunrise,sunset&timezone=Europe%2FMadrid&forecast_days=16&wind_speed_unit=kmh';
  $('met-act').textContent='actualitzant…';
  try{ const r=await fetchT(u,25000); if(!r.ok) throw 0; const j=await r.json(); const arr=Array.isArray(j)?j:[j];
    MET={ts:Date.now(),pts:arr.map(x=>({h:x.hourly,d:x.daily}))};
    try{ localStorage.setItem(MET_KEY,JSON.stringify(MET)); }catch(e){}
  }catch(e){ $('met-act').textContent='no s\'ha pogut actualitzar'; }
  pintaMeteo(); render();
}
function hIdx(date){ if(!MET) return -1; const h=MET.pts[0].h.time; const k=date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0')+'T'+String(date.getHours()).padStart(2,'0')+':00'; return h.indexOf(k); }
// condicions a una hora i alçada (interpolades entre els tres punts de previsió)
function meteoEn(date,alt){
  const i=hIdx(date); if(i<0) return null;
  const P=MET.pts, E=MET_PTS.map(p=>p.e);
  let a=0,b=1; if(alt>E[1]){a=1;b=2;}
  const f=Math.max(0,Math.min(1,(alt-E[a])/(E[b]-E[a])));
  const g=k=>{const x=P[a].h[k][i], y=P[b].h[k][i]; return (x==null||y==null)?(x??y??0):x+(y-x)*f;};
  return {t:g('temperature_2m'),at:g('apparent_temperature'),ws:g('wind_speed_10m'),wg:g('wind_gusts_10m'),cc:g('cloud_cover'),pp:g('precipitation_probability'),pr:g('precipitation'),code:P[b].h.weather_code[i]};
}
function diesMeteo(){
  if(!MET) return [];
  const d0=MET.pts[0].d.time, avui=new Date(), kd=x=>x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');
  const DS=['dg','dl','dt','dc','dj','dv','ds'];
  return d0.filter(k=>k>=kd(avui)&&k<=DATA_FI).map(k=>{const x=new Date(k+'T12:00:00');
    return {k,n:(k===kd(avui)?'Avui':DS[x.getDay()]+' '+x.getDate())+(DIES.filter(d=>DATES[d]===k).map(d=>' · '+RUTES[d].curt).join(''))};});
}
// direcció del vent: d'on bufa (graus) → punt cardinal, nom català i fletxa cap on va
const VENTS=[['N','tramuntana'],['NE','gregal'],['E','llevant'],['SE','xaloc'],['S','migjorn'],['SO','garbí'],['O','ponent'],['NO','mestral']];
function ventDir(g){ if(g==null||isNaN(g)) return null; const k=Math.round(((g%360)+360)%360/45)%8; return {c:VENTS[k][0],n:VENTS[k][1],g}; }
function fletxa(g,mida){ return `<span class="fv" style="transform:rotate(${(g+180)%360}deg);${mida?'font-size:'+mida+'px':''}" title="bufa de ${Math.round(g)}°">↑</span>`; }
function dirMitjana(a){ let x=0,y=0; a.forEach(([g,w])=>{ if(g==null) return; x+=Math.sin(g*Math.PI/180)*(w||1); y+=Math.cos(g*Math.PI/180)*(w||1); }); return (x||y)?(Math.atan2(x,y)*180/Math.PI+360)%360:null; }
function pintaMeteo(){
  const A=MET_PTS[2], c=`${A.lat.toFixed(3)}N${A.lon.toFixed(3)}E${Math.round(A.e)}`, cat=RUTA.catalunya;
  set('met-links',[
    ...(cat?[['Meteocat · predicció','https://www.meteo.cat/prediccio/general'],['Meteocat · Pirineu','https://www.meteo.cat/prediccio/pirineu'],['MeteoMuntanya','https://meteomuntanya.cat/']]:[]),
    [`Meteoblue · ${A.n} (${Math.round(A.e)} m)`,`https://www.meteoblue.com/en/weather/week/${c}`],
    ['Meteoblue · multimodel',`https://www.meteoblue.com/en/weather/forecast/multimodel/${c}`],
    ['Windy',`https://www.windy.com/${A.lat.toFixed(3)}/${A.lon.toFixed(3)}?${A.lat.toFixed(3)},${A.lon.toFixed(3)},12`],
    ['AEMET · muntanya','https://www.aemet.es/ca/eltiempo/prediccion/montana']
  ].map(([t,u])=>`<a href="${u}" target="_blank" rel="noopener">${esc(t)}</a>`).join(''));
  set('met-nota',`Previsió per hores d'Open-Meteo a tres alçades de la ruta (${MET_PTS.map(p=>esc(p.n)+' '+Math.round(p.e)+' m').join(', ')}), desada per consultar-la sense cobertura. S\'actualitza sola quan hi ha cobertura: cada hora els dies de la sortida i cada 3 hores la resta. Contrasta-la amb el servei meteorològic oficial; els llindars de decisió són els de la fitxa. Cota de neu ≈ isoterma de 0 °C − 300 m.`);
  if(!MET){ set('met-act','sense dades'); set('met-dies',''); set('met-resum','<p class="nota">Toca «Actualitzar previsió» amb connexió.</p>'); set('met-hores',''); set('met-avisos',''); return; }
  const fa=Math.round((Date.now()-MET.ts)/60000);
  set('met-act', 'actualitzada '+(fa<60?`fa ${fa} min`:fa<1440?`fa ${Math.round(fa/60)} h`:new Date(MET.ts).toLocaleDateString('ca-ES')));
  const dies=diesMeteo(); if(!dies.length){ set('met-resum','<p class="nota">La previsió desada ja no cobreix els propers dies: actualitza-la.</p>'); return; }
  if(!metDia||!dies.find(x=>x.k===metDia)) metDia=(dies.find(x=>x.k===DATES[dia])||dies[0]).k;
  set('met-dies',dies.map(x=>`<button data-k="${x.k}" class="${x.k===metDia?'on':''}">${x.n}</button>`).join(''));
  document.querySelectorAll('#met-dies button').forEach(b=>b.onclick=()=>{metDia=b.dataset.k;pintaMeteo();});
  const H=MET.pts.map(p=>p.h), T=H[0].time;
  const ix=T.map((t,i)=>t.startsWith(metDia)?i:-1).filter(i=>i>=0);
  const dM=DIES.find(d=>DATES[d]===metDia), finestra=dM?[+RUTES[dM].sortida.slice(0,2),Math.min(23,+LIMIT[dM].h.slice(0,2)+1)]:[7,19];
  const hores=ix.filter(i=>{const h=+T[i].slice(11,13);return h>=finestra[0]&&h<=finestra[1];});
  // resum per alçades (en hores de marxa)
  const mn=(a)=>Math.min(...a), mx=(a)=>Math.max(...a);
  let res='<div class="mres"><span></span>'+MET_PTS.map(p=>`<b>${esc(p.n)}</b>`).join('');
  const fila=(nom,f)=>{res+=`<span>${nom}</span>`+H.map(h=>`<span>${f(h)}</span>`).join('');};
  fila('Temp.',h=>`${tC(mn(hores.map(i=>h.temperature_2m[i])))} / ${tC(mx(hores.map(i=>h.temperature_2m[i])))} °C`);
  fila('Sensació mín.',h=>`${tC(mn(hores.map(i=>h.apparent_temperature[i])))} °C`);
  fila('Vent dominant',h=>{ const d=ventDir(dirMitjana(hores.map(i=>[h.wind_direction_10m[i],h.wind_speed_10m[i]]))); return d?`${fletxa(d.g)} ${d.c} <small>${d.n}</small>`:'–'; });
  fila('Ratxa màx.',h=>`${mx(hores.map(i=>h.wind_gusts_10m[i])).toFixed(0)} km/h`);
  fila('Prob. precip.',h=>`${mx(hores.map(i=>h.precipitation_probability[i]??0)).toFixed(0)} %`);
  res+='</div>';
  const iso=mn(hores.map(i=>H[1].freezing_level_height[i]));
  const dd=MET.pts[1].d, di=dd.time.indexOf(metDia);
  res+=`<p class="nota">Hores de marxa ${finestra[0]}–${finestra[1]} h · cota de neu ≈ ${Math.max(0,Math.round((iso-300)/100)*100)} m · sol: ${dd.sunrise[di].slice(11)}–${dd.sunset[di].slice(11)}</p>`;
  set('met-resum',res);
  // avisos orientatius
  const av=[];
  const gmax=mx(hores.map(i=>H[2].wind_gusts_10m[i])), atmin=mn(hores.map(i=>H[2].apparent_temperature[i])), pmax=mx(hores.map(i=>H[1].precipitation_probability[i]??0));
  if(gmax>=60) av.push(['r',`Ratxes fins a ${gmax.toFixed(0)} km/h a les parts altes: valora evitar carenes i cims.`]); else if(gmax>=40) av.push(['',`Ratxes de ${gmax.toFixed(0)} km/h a les parts altes: tallavent i parades a recer.`]);
  if(atmin<=-5) av.push(['r',`Sensació tèrmica de ${tC(atmin)} °C a les parts altes: guants, gorra i capa d'abric a la motxilla de tothom.`]); else if(atmin<=0) av.push(['',`Sensació tèrmica sota zero a les parts altes (${tC(atmin)} °C).`]);
  if(pmax>=50) av.push(['r',`Probabilitat de precipitació fins al ${pmax.toFixed(0)} %.`]); else if(pmax>=25) av.push(['',`Probabilitat de precipitació fins al ${pmax.toFixed(0)} %.`]);
  if(iso-300<1700) av.push(['',`Cota de neu prop de ${Math.max(0,Math.round((iso-300)/100)*100)} m: possible neu o gebre a les parts altes.`]);
  { const dM2=DIES.find(d=>DATES[d]===metDia), seg=dM2&&DIES[DIES.indexOf(dM2)+1];
    if(seg&&DATES[seg]){ const d2=DATES[seg];
      const nit=T.map((t,i)=>i).filter(i=>(T[i].startsWith(metDia)&&+T[i].slice(11,13)>=18)||(T[i].startsWith(d2)&&+T[i].slice(11,13)<=8));
      if(nit.length) av.push(['',`Nit abans del ${RUTES[seg].curt}: mínima ${tC(mn(nit.map(i=>H[1].temperature_2m[i])))} °C (sensació ${tC(mn(nit.map(i=>H[1].apparent_temperature[i])))} °C) a ${MET_PTS[1].e} m.`]); } }
  if(!av.length) av.push(['ok','Sense avisos destacables en les hores de marxa.']);
  set('met-avisos',av.map(([c,t])=>`<div class="mav ${c}">${t}</div>`).join(''));
  // taula per hores: temperatura a dues alçades, vent i precipitació
  let tb=`<table><thead><tr><th>Hora</th><th>Cel</th><th>${esc(MET_PTS[1].n)}<br>T (sens.)</th><th>${esc(MET_PTS[2].n)}<br>T (sens.)</th><th>Vent<br>km/h / ratxa</th><th>Precip.<br>mm (prob.)</th></tr></thead><tbody>`;
  hores.forEach(i=>{ const x=H[1], m=H[2], pr=x.precipitation[i]||0, sn=x.snowfall?x.snowfall[i]||0:0;
    tb+=`<tr><td>${T[i].slice(11,16)}</td><td>${WMO[x.weather_code[i]]||''}</td><td>${tC(x.temperature_2m[i])} (${tC(x.apparent_temperature[i])})</td><td>${tC(m.temperature_2m[i])} (${tC(m.apparent_temperature[i])})</td><td style="white-space:nowrap">${(d=>d?fletxa(d.g)+' '+d.c+' ':'')(ventDir(m.wind_direction_10m[i]))}${Math.round(x.wind_speed_10m[i])} / ${Math.round(m.wind_gusts_10m[i])}</td><td>${pr?pr.toFixed(1):'0'}${sn?' ❄':''} (${x.precipitation_probability[i]??0} %)</td></tr>`; });
  tb+='</tbody></table><p class="nota">Temperatures en °C. Vent: la fletxa indica cap on bufa i la lletra d\'on ve (N tramuntana, NE gregal, E llevant, SE xaloc, S migjorn, SO garbí, O ponent, NO mestral); direcció i ratxa al punt més alt, vent mitjà a l\'alçada mitjana. ❄ = previsió de neu.</p>';
  set('met-hores',tb);
}

// ---------- Guió per als clients ----------
function pintaGuio(E,w){
  // si acabes de passar un punt (< 250 m), mostra'n el guió; si no, el del punt següent
  const prev=R.wp[w-1], nx=R.wp[w];
  let p=nx, tag='Al proper punt', dist=`a ${km(Math.max(0,R.cd[nx.i]-E.d))} km`;
  if(prev && E.d-R.cd[prev.i]<250){ p=prev; tag='Ets aquí'; dist=''; }
  if(R.cd[nx.i]-E.d<150){ p=nx; tag='Ets aquí'; dist=''; }
  const inf=p.info;
  set('guio-tag',tag); set('guio-dist',dist); set('guio-nom',esc(p.n));
  set('guio-punts', inf? inf.punts.map(x=>`<li>${esc(x)}</li>`).join('') : '<li>Sense notes per a aquest punt.</li>');
  set('guio-preg', inf&&inf.pregunta? '❓ '+esc(inf.pregunta):'');
  document.querySelectorAll('#guio-tots details').forEach(d=>d.classList.toggle('act',d.dataset.k===p.k));
}
function pintaGuioTots(){
  set('guio-tots', R.wp.filter(x=>x.info).map(x=>
    `<details class="det" data-k="${x.k}"><summary>${esc(x.n)} · ${mts(R.p[x.i][2])}</summary><ul>${x.info.punts.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>${x.info.pregunta?`<p class="preg">❓ ${esc(x.info.pregunta)}</p>`:''}</details>`).join('')+
    '<p class="nota" style="margin-top:8px">(≈) Topònim situat sobre el mapa per coordenades: confirma\'l al reconeixement.</p>');
}
function pintaFlora(){
  if(typeof FLORA==='undefined') return;
  set('flora', `<details class="det"><summary>${esc(FLORA.titol)}</summary><p>${esc(FLORA.intro)}</p><ul>`+
    FLORA.factors.map(([t,x])=>`<li><b>${esc(t)}:</b> ${esc(x)}</li>`).join('')+`</ul><p><b>Com reconèixer-los</b></p><ul>${FLORA.reconeixer.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><p class="nota">${esc(FLORA.fonts)}</p></details>`+
    `<div id="resum-vess">${pintaResumVessants()}</div>`);
}

function dibuixaPerfil(E){
  const W=600,H=170,l=34,r=8,t=18,b=22, tot=R.cd[R.n-1];
  let mn=1e9,mx=-1e9; R.p.forEach(q=>{mn=Math.min(mn,q[2]);mx=Math.max(mx,q[2])});
  mn=Math.floor((mn-20)/100)*100; mx=Math.ceil((mx+20)/100)*100;
  const X=d=>l+(W-l-r)*d/tot, Y=e=>t+(H-t-b)*(1-(e-mn)/(mx-mn));
  let all='',done='';
  for(let i=0;i<R.n;i++){const s=`${X(R.cd[i]).toFixed(1)},${Y(R.p[i][2]).toFixed(1)} `; all+=s; if(R.cd[i]<=E.d) done+=s;}
  done+=`${X(E.d).toFixed(1)},${Y(E.e).toFixed(1)}`;
  let g='';
  for(let e=mn;e<=mx;e+=100){g+=`<line x1="${l}" x2="${W-r}" y1="${Y(e)}" y2="${Y(e)}" stroke="#eee7da"/>`; if((e/100)%2===0||mx-mn<=400) g+=`<text x="${l-4}" y="${Y(e)+4}" font-size="11" text-anchor="end" fill="#6b7478">${e}</text>`;}
  R.wp.forEach(w=>{const x=X(R.cd[w.i]); g+=`<line x1="${x}" x2="${x}" y1="${t-4}" y2="${H-b}" stroke="#d9d3c6" stroke-dasharray="3 3"/><text x="${x}" y="${t-6}" font-size="10" text-anchor="middle" fill="#1E2A2E" font-weight="700">${w.n.split(' ·')[0]}</text>`;});
  const base=`${X(0)},${H-b} ${all} ${X(tot)},${H-b}`;
  g+=`<polygon points="${base}" fill="#1E2A2E" opacity=".08"/><polyline points="${all}" fill="none" stroke="#1E2A2E" stroke-width="2"/><polyline points="${done}" fill="none" stroke="#C8553D" stroke-width="3.5"/>`;
  vessants().forEach(s=>{ g+=`<rect x="${X(s.d0)}" y="${H-b+1}" width="${Math.max(0,X(Math.min(s.d1,tot))-X(s.d0))}" height="6" fill="${VTIPUS[s.c].col}"/>`; });
  g+=`<circle cx="${X(E.d)}" cy="${Y(E.e)}" r="6.5" fill="#C8553D" stroke="#fff" stroke-width="2.5"/>`;
  for(let k=0;k<=tot/1000;k+=2) g+=`<text x="${X(k*1000)}" y="${H-6}" font-size="11" text-anchor="middle" fill="#6b7478">${k} km</text>`;
  $('perfil').innerHTML=g;
}
// ---------- Mapa topogràfic ICGC (teselles) ----------
// Mapes base: es poden activar i desactivar; s'apilen en aquest ordre (el primer, a sota). Per afegir-ne un, una línia aquí.
const IGN=(srv,capa,fmt)=>`https://www.ign.es/wmts/${srv}?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${capa}&STYLE=default&TILEMATRIXSET=GoogleMapsCompatible&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=${fmt}`;
const MAPES=[
  {id:'pnoa',nom:'Ortofoto PNOA (Espanya)',curt:'Ortofoto',url:IGN('pnoa-ma','OI.OrthoimageCoverage','image/jpeg'),zmax:17,attr:'© IGN · PNOA'},
  {id:'ignbase',nom:'Mapa base IGN (Espanya)',curt:'IGN base',url:IGN('ign-base','IGNBaseTodo','image/png'),zmax:17,attr:'© IGN'},
  {id:'mtn',nom:'Topogràfic IGN · MTN (Espanya)',curt:'IGN MTN',url:IGN('mapa-raster','MTN','image/jpeg'),zmax:16,attr:'© IGN · MTN'},
  {id:'icgc',nom:'Topogràfic ICGC (Catalunya)',curt:'ICGC',url:'https://geoserveis.icgc.cat/servei/catalunya/mapa-base/wmts/topografic/MON3857NW/{z}/{x}/{y}.png',zmax:16,attr:'© ICGC CC BY 4.0'}];
const TZMAX=16, ZMIN=12, ZMAX=18;
const MAPES_KEY='petjada-rutes-mapes-on';
// a Catalunya, l'ICGC; a la resta, el topogràfic de l'IGN
function aCatalunya(lat,lon){ return lat>40.5&&lat<42.9&&lon>0.15&&lon<3.35&&!(lat<41.0&&lon<0.6); }
function mapesOn(){ let m=null; try{ m=JSON.parse(localStorage.getItem(MAPES_KEY)); }catch(e){}
  if(!Array.isArray(m)||!m.length){ const p=RUTES[DIES[0]].pts[0]; m=[aCatalunya(p[0],p[1])?'icgc':'mtn']; }
  return MAPES.filter(x=>m.includes(x.id)); }
function desaMapes(ids){ try{localStorage.setItem(MAPES_KEY,JSON.stringify(ids))}catch(e){} }
const M={z:15,cx:null,cy:null,follow:true,imgs:new Map(),E:null,ptrs:new Map(),pinch:null};
function wpx(lat,lon,z){const s=256*2**z, la=rad(lat); return [(lon+180)/360*s,(1-Math.log(Math.tan(la)+1/Math.cos(la))/Math.PI)/2*s];}
function tileUrl(z,x,y,L){return (L||mapesOn()[0]||MAPES[3]).url.replace('{z}',z).replace('{x}',x).replace('{y}',y);}
function dibuixaMapa(E){
  if(E) M.E=E; E=M.E; if(!E) return;
  const el=$('tmap'), W=el.clientWidth, H=el.clientHeight; if(!W) return;
  if(M.follow||M.cx==null) [M.cx,M.cy]=wpx(E.lat,E.lon,M.z);
  const x0=M.cx-W/2, y0=M.cy-H/2, keep=new Set(), cont=$('tiles'), ON=mapesOn();
  ON.forEach((L,li)=>{ const tz=Math.min(M.z,L.zmax), ts=256*2**(M.z-tz), n=2**tz;
  for(let tx=Math.floor(x0/ts);tx<=Math.floor((x0+W)/ts);tx++) for(let ty=Math.floor(y0/ts);ty<=Math.floor((y0+H)/ts);ty++){
    if(ty<0||ty>=n) continue;
    const key=L.id+'/'+tz+'/'+tx+'/'+ty; keep.add(key);
    let img=M.imgs.get(key);
    if(!img){ img=new Image(); img.alt=''; img.decoding='async'; img.onerror=()=>{img.style.visibility='hidden'}; img.src=tileUrl(tz,tx,ty,L); cont.appendChild(img); M.imgs.set(key,img); }
    img.style.zIndex=li+1; if(li>0) img.style.opacity=.85;
    img.style.left=(tx*ts-x0)+'px'; img.style.top=(ty*ts-y0)+'px'; img.style.width=img.style.height=ts+'px';
  } });
  if($('m-attr')) $('m-attr').textContent=[...ON.map(L=>L.attr),'© OpenStreetMap ODbL'].join(' · ');
  for(const [k,img] of M.imgs) if(!keep.has(k)){ img.remove(); M.imgs.delete(k); }
  dibuixaOSM(x0,y0,W,H);
  // capa del track
  const P=(lat,lon)=>{const [x,y]=wpx(lat,lon,M.z);return [x-x0,y-y0]};
  let all='',done='';
  for(let i=0;i<R.n;i++){const [a,b]=P(R.p[i][0],R.p[i][1]); const s=a.toFixed(1)+','+b.toFixed(1)+' '; all+=s; if(R.cd[i]<=E.d) done+=s;}
  const [cx,cy]=P(E.lat,E.lon); done+=cx.toFixed(1)+','+cy.toFixed(1);
  let g=`<polyline points="${all}" fill="none" stroke="#fff" stroke-width="7" stroke-linejoin="round" opacity=".8"/>`+
        `<polyline points="${all}" fill="none" stroke="#7a3cc8" stroke-width="4" stroke-linejoin="round"/>`+
        `<polyline points="${done}" fill="none" stroke="#C8553D" stroke-width="5" stroke-linejoin="round"/>`;
  const PBOFF=pbOff(); if(M.pb!==false) plansB().forEach(b=>{ if(b.pts.length<2||PBOFF.includes(b.id)) return; let ps=''; b.pts.forEach(q=>{const [a,c]=P(q[0],q[1]); ps+=a.toFixed(1)+','+c.toFixed(1)+' ';});
    g+=`<polyline points="${ps}" fill="none" stroke="#fff" stroke-width="6" opacity=".7"/><polyline points="${ps}" fill="none" stroke="#C55A11" stroke-width="3.5" stroke-dasharray="8 6"/>`;
    const m=b.pts[Math.floor(b.pts.length/2)], [a,c]=P(m[0],m[1]);
    g+=`<text x="${a+6}" y="${c+14}" font-size="13" font-weight="800" fill="#C55A11" paint-order="stroke" stroke="#fff" stroke-width="4">${b.id}</text>`; });
  const etq=[];
  R.wp.forEach(w=>{const [a,b]=P(R.p[w.i][0],R.p[w.i][1]); if(a<-50||a>W+50||b<-50||b>H+50) return;
    const lab=w.k, ja=etq.find(e=>Math.hypot(e.a-a,e.b-b)<18);
    if(ja){ if(!ja.l.includes(lab)) ja.l.push(lab); } else etq.push({a,b,l:[lab]}); });
  etq.forEach(e=>{ g+=`<circle cx="${e.a}" cy="${e.b}" r="6" fill="#fff" stroke="#1E2A2E" stroke-width="2.5"/><text x="${e.a+9}" y="${e.b-7}" font-size="14" font-weight="800" fill="#1E2A2E" paint-order="stroke" stroke="#fff" stroke-width="4">${e.l.join(' / ')}</text>`; });
  const mpp=156543.03*Math.cos(rad(E.lat))/2**M.z;
  if(lastFix&&!prova){const [a,b]=P(lastFix.lat,lastFix.lon); g+=`<circle cx="${a}" cy="${b}" r="${Math.max(8,Math.min(150,lastFix.acc/mpp))}" fill="#3d6c86" opacity=".18"/><circle cx="${a}" cy="${b}" r="6" fill="#3d6c86" stroke="#fff" stroke-width="2.5"/>`;}
  g+=`<circle cx="${cx}" cy="${cy}" r="9" fill="#C8553D" stroke="#fff" stroke-width="3"/>`;
  const bar=[50,100,200,500,1000,2000].find(m=>m/mpp>=70)||2000;
  g+=`<line x1="10" x2="${10+bar/mpp}" y1="${H-24}" y2="${H-24}" stroke="#1E2A2E" stroke-width="3"/><text x="10" y="${H-29}" font-size="12" font-weight="700" fill="#1E2A2E" paint-order="stroke" stroke="#fff" stroke-width="3">${bar>=1000?bar/1000+' km':bar+' m'}</text>`;
  const sv=$('tover'); sv.setAttribute('viewBox',`0 0 ${W} ${H}`); sv.innerHTML=g;
  $('m-seg').classList.toggle('on',M.follow);
}
function zoomMapa(dz,fx,fy){
  const z=Math.max(ZMIN,Math.min(ZMAX,M.z+dz)); if(z===M.z||M.cx==null) return;
  const el=$('tmap'), W=el.clientWidth, H=el.clientHeight, f=2**(z-M.z);
  // manté fix el punt sota el dit (fx,fy) o el centre
  const px=(fx??W/2)-W/2, py=(fy??H/2)-H/2;
  M.cx=(M.cx+px)*f-px; M.cy=(M.cy+py)*f-py; M.z=z; dibuixaMapa();
}
(function(){
  const el=$('tmap');
  el.addEventListener('pointerdown',e=>{el.setPointerCapture(e.pointerId); M.ptrs.set(e.pointerId,[e.clientX,e.clientY]); if(M.ptrs.size===2){const [a,b]=[...M.ptrs.values()]; M.pinch=Math.hypot(a[0]-b[0],a[1]-b[1]);}});
  el.addEventListener('pointermove',e=>{ if(!M.ptrs.has(e.pointerId)) return;
    const prev=M.ptrs.get(e.pointerId); M.ptrs.set(e.pointerId,[e.clientX,e.clientY]);
    if(M.ptrs.size===1){ M.cx-=e.clientX-prev[0]; M.cy-=e.clientY-prev[1]; M.follow=false; dibuixaMapa(); }
    else if(M.ptrs.size===2&&M.pinch){ const [a,b]=[...M.ptrs.values()], d=Math.hypot(a[0]-b[0],a[1]-b[1]), r=el.getBoundingClientRect();
      const fx=(a[0]+b[0])/2-r.left, fy=(a[1]+b[1])/2-r.top;
      if(d/M.pinch>1.45){zoomMapa(1,fx,fy);M.pinch=d;} else if(d/M.pinch<0.69){zoomMapa(-1,fx,fy);M.pinch=d;} }});
  const up=e=>{M.ptrs.delete(e.pointerId); if(M.ptrs.size<2) M.pinch=null;};
  el.addEventListener('pointerup',up); el.addEventListener('pointercancel',up);
  el.addEventListener('dblclick',e=>{const r=el.getBoundingClientRect(); zoomMapa(1,e.clientX-r.left,e.clientY-r.top);});
  el.addEventListener('wheel',e=>{e.preventDefault(); const r=el.getBoundingClientRect(); zoomMapa(e.deltaY<0?1:-1,e.clientX-r.left,e.clientY-r.top);},{passive:false});
  $('m-in').onclick=e=>{e.stopPropagation();zoomMapa(1)}; $('m-out').onclick=e=>{e.stopPropagation();zoomMapa(-1)};
  $('m-seg').onclick=e=>{e.stopPropagation();M.follow=true;dibuixaMapa();};
  ['m-in','m-out','m-seg'].forEach(id=>$(id).addEventListener('pointerdown',e=>e.stopPropagation()));
  window.addEventListener('resize',()=>dibuixaMapa());
})();

// ---------- Camins d'OpenStreetMap (dades vectorials, desades per anar sense cobertura) ----------
const OSM_KEY='https://petjada.local/osm-camins-'+RUTA.id+'.json';  // clau interna a la memòria cau
const OVERPASS=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
const OSM={ways:null,on:true};
// estils: 0 carretera, 1 camí asfaltat/secundari, 2 pista, 3 corriol, 4 escales
const OSTY=[
  {c:'#555',w:6,cw:'#fff',iw:4},
  {c:'#777',w:4.5,cw:'#fff',iw:2.5},
  {c:'#8b5a2b',w:2.6,d:'7 4'},
  {c:'#d0342c',w:2.4,d:'4 3'},
  {c:'#d0342c',w:3,d:'1.5 2.5'}];
function tipusOSM(h){
  if(/^(motorway|trunk|primary|secondary|tertiary)/.test(h)) return 0;
  if(/^(unclassified|residential|service|living_street|road)$/.test(h)) return 1;
  if(h==='track') return 2;
  if(h==='steps') return 4;
  if(/^(path|footway|bridleway|cycleway|pedestrian)$/.test(h)) return 3;
  return -1;
}
function bboxRutes(){
  let s=90,w=180,n=-90,e=-180;
  for(const k of DIES) for(const p of RUTES[k].pts){s=Math.min(s,p[0]);n=Math.max(n,p[0]);w=Math.min(w,p[1]);e=Math.max(e,p[1]);}
  return [s-0.0135,w-0.018,n+0.0135,e+0.018].map(v=>+v.toFixed(5));
}
// Lector mínim de teselles vectorials (Mapbox Vector Tile / protobuf)
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
            if(f3===1){const l3=vint(); v=str(p,p+l3); p+=l3;} else if(t3===0){v=vint();} else salta(t3); }
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
function liniesMVT(g){ // ordres de geometria → llistes de punts (coordenades de la tesella)
  const out=[]; let x=0,y=0,i=0,cur=null;
  const zz=n=>(n>>>1)^-(n&1);
  while(i<g.length){ const c=g[i++], cmd=c&7, n=c>>3;
    for(let j=0;j<n;j++){
      if(cmd===7){ continue; }
      x+=zz(g[i++]); y+=zz(g[i++]);
      if(cmd===1){ cur=[x,y]; out.push(cur); } else cur.push(x,y);
    } }
  return out;
}
function tipusOFM(cl,sub){
  if(/^(motorway|trunk|primary|secondary|tertiary)$/.test(cl)) return 0;
  if(cl==='minor'||cl==='service') return 1;
  if(cl==='track') return 2;
  if(cl==='path') return sub==='steps'?4:3;
  return -1;
}
async function fetchT(u,ms){ const c=new AbortController(), t=setTimeout(()=>c.abort(),ms); try{ return await fetch(u,{signal:c.signal}); } finally{ clearTimeout(t); } }
async function descarregaOFM(){
  const tj=await (await fetchT('https://tiles.openfreemap.org/planet',20000)).json();
  const tpl=tj.tiles[0], Z=14, [S,W,N,E]=bboxRutes();
  const [xa,ya]=wpx(N,W,Z), [xb,yb]=wpx(S,E,Z), tls=[];
  for(let x=Math.floor(xa/256);x<=Math.floor(xb/256);x++) for(let y=Math.floor(ya/256);y<=Math.floor(yb/256);y++) tls.push([x,y]);
  const ways=[]; let fet=0, i=0;
  const worker=async()=>{ while(i<tls.length){ const [tx,ty]=tls[i++];
    const r=await fetchT(tpl.replace('{z}',Z).replace('{x}',tx).replace('{y}',ty),20000); if(!r.ok) throw new Error('tesella '+r.status);
    for(const L of llegeixMVT(await r.arrayBuffer())){ if(L.name!=='transportation') continue;
      const ki=L.keys.indexOf('class'), si=L.keys.indexOf('subclass');
      for(const F of L.feats){ if(F.type!==2) continue; let cl='',sub='';
        for(let j=0;j<F.tags.length;j+=2){ if(F.tags[j]===ki) cl=L.vals[F.tags[j+1]]; else if(F.tags[j]===si) sub=L.vals[F.tags[j+1]]; }
        const t=tipusOFM(cl,sub); if(t<0) continue;
        for(const ln of liniesMVT(F.geom)){ const xy=[];
          for(let k=0;k<ln.length;k+=2) xy.push(+((tx+ln[k]/L.extent)/2**Z*256).toFixed(7), +((ty+ln[k+1]/L.extent)/2**Z*256).toFixed(7));
          if(xy.length>=4) ways.push({t,xy}); } } }
    fet++; $('osm-estat').textContent=`Descarregant camins d'OpenStreetMap… ${fet}/${tls.length}`; } };
  await Promise.all([worker(),worker(),worker()]);
  return {font:'OpenFreeMap',ways};
}
async function descarregaOverpass(){
  const [S,W,N,E]=bboxRutes();
  const q=`[out:json][timeout:50];way["highway"](${S},${W},${N},${E});out geom;`;
  for(const u of OVERPASS){
    try{ const res=await fetchT(u+'?data='+encodeURIComponent(q),180000); if(!res.ok) throw 0;
      const j=await res.json(), ways=[];
      for(const el of j.elements||[]){ if(el.type!=='way'||!el.geometry||!el.tags) continue;
        const t=tipusOSM(el.tags.highway||''); if(t<0) continue;
        const xy=[]; for(const g of el.geometry){const [x,y]=wpx(g.lat,g.lon,0); xy.push(x,y);} ways.push({t,xy}); }
      return {font:'Overpass',ways};
    }catch(e){}
  }
  throw new Error('overpass');
}
function preparaWays(d){
  const ways=d.ways.map(w=>{ let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
    for(let i=0;i<w.xy.length;i+=2){x0=Math.min(x0,w.xy[i]);x1=Math.max(x1,w.xy[i]);y0=Math.min(y0,w.xy[i+1]);y1=Math.max(y1,w.xy[i+1]);}
    return {t:w.t,xy:w.xy,bb:[x0,y0,x1,y1]}; });
  ways.sort((a,b)=>a.t-b.t);
  return ways;
}
async function carregaOSM(forcar){
  if(!('caches' in window)) return;
  const c=await caches.open(TILE_CACHE);
  let r=forcar?null:await c.match(OSM_KEY);
  if(!r){
    if(!navigator.onLine){ $('osm-estat').textContent='Camins OSM: cal connexió per descarregar-los.'; return; }
    $('osm-estat').textContent='Descarregant camins d\'OpenStreetMap…';
    let d=null;
    try{ d=await descarregaOFM(); }catch(e){ d=null; }
    if(!d||!d.ways.length){ try{ $('osm-estat').textContent='Provant un altre servidor d\'OSM (pot trigar un parell de minuts)…'; d=await descarregaOverpass(); }catch(e2){ d=null; } }
    if(!d||!d.ways.length){ $('osm-estat').innerHTML='No s\'han pogut descarregar els camins OSM. <a href="#" id="osm-retry">Torna-ho a provar</a>';
      const a=$('osm-retry'); if(a) a.onclick=ev=>{ev.preventDefault();carregaOSM(true)}; return; }
    d.desat=new Date().toISOString();
    await c.put(OSM_KEY,new Response(JSON.stringify(d),{headers:{'Content-Type':'application/json'}}));
    r=await c.match(OSM_KEY);
  }
  try{
    const d=await r.json();
    if(!d.ways){ await c.delete(OSM_KEY); return carregaOSM(true); } // format antic
    OSM.ways=preparaWays(d);
    const n={}; OSM.ways.forEach(w=>n[w.t]=(n[w.t]||0)+1);
    $('osm-estat').textContent=`Camins OSM desats: ${n[3]||0} corriols, ${n[2]||0} pistes, ${(n[0]||0)+(n[1]||0)} carreteres i camins asfaltats`+(d.desat?` (${new Date(d.desat).toLocaleDateString('ca-ES')}, ${d.font})`:'')+'.';
    dibuixaMapa();
  }catch(e){ $('osm-estat').textContent='Error llegint els camins OSM.'; }
}
function dibuixaOSM(x0,y0,W,H){
  const sv=$('tosm'); sv.setAttribute('viewBox',`0 0 ${W} ${H}`);
  if(!OSM.on||!OSM.ways){ sv.innerHTML=''; return; }
  const f=2**M.z, m=20, ds=['','','','',''];
  const bx0=(x0-m)/f, by0=(y0-m)/f, bx1=(x0+W+m)/f, by1=(y0+H+m)/f;
  for(const w of OSM.ways){
    const b=w.bb; if(b[2]<bx0||b[0]>bx1||b[3]<by0||b[1]>by1) continue;
    let d='M';
    for(let i=0;i<w.xy.length;i+=2) d+=(i?'L':'')+(w.xy[i]*f-x0).toFixed(1)+','+(w.xy[i+1]*f-y0).toFixed(1);
    ds[w.t]+=d;
  }
  const amp=M.z>=16?1.25:M.z<=13?0.7:1;
  let g='';
  OSTY.forEach((s,t)=>{ if(!ds[t]) return;
    if(s.cw){ g+=`<path d="${ds[t]}" fill="none" stroke="${s.c}" stroke-width="${s.w*amp}" stroke-linecap="round" stroke-linejoin="round"/><path d="${ds[t]}" fill="none" stroke="${s.cw}" stroke-width="${s.iw*amp}" stroke-linecap="round" stroke-linejoin="round"/>`; }
    else g+=`<path d="${ds[t]}" fill="none" stroke="#fff" stroke-width="${(s.w+2)*amp}" stroke-opacity=".7" stroke-linejoin="round"/><path d="${ds[t]}" fill="none" stroke="${s.c}" stroke-width="${s.w*amp}" stroke-dasharray="${s.d}" stroke-linejoin="round"/>`;
  });
  sv.innerHTML=g;
}
(function(){
  { const el=$('c-mapes'), on=mapesOn().map(L=>L.id);
    el.innerHTML=MAPES.slice().reverse().map(L=>`<label><input type="checkbox" value="${L.id}" ${on.includes(L.id)?'checked':''}> ${esc(L.nom)}</label>`).join('');
    el.querySelectorAll('input').forEach(i=>i.onchange=()=>{ let ids=[...el.querySelectorAll('input:checked')].map(x=>x.value);
      if(!ids.length){ i.checked=true; ids=[i.value]; }
      desaMapes(ids); for(const [k,img] of M.imgs){ img.remove(); } M.imgs.clear(); dibuixaMapa(); estatMapes(); }); }
  try{ const c=JSON.parse(localStorage.getItem('petjada-rutes-capes')||'{}'); if(c.osm===false) OSM.on=false; if(c.pb===false) M.pb=false; if(c.op!=null) $('c-op').value=c.op; }catch(e){}
  const desa=()=>{try{localStorage.setItem('petjada-rutes-capes',JSON.stringify({osm:OSM.on,pb:M.pb!==false,op:+$('c-op').value}))}catch(e){}};
  const op=()=>{ $('tiles').style.opacity=$('c-op').value/100; $('c-opv').textContent=$('c-op').value+' %'; };
  $('c-osm').checked=OSM.on; op();
  $('c-pb').checked=M.pb!==false; $('c-pb').onchange=()=>{M.pb=$('c-pb').checked; desa(); pintaPbChips(); dibuixaMapa();};
  pintaPbChips();
  $('c-osm').onchange=()=>{OSM.on=$('c-osm').checked; desa(); dibuixaMapa();};
  $('c-op').oninput=()=>{op(); desa();};
})();

// ---------- Descàrrega de mapes per anar sense cobertura ----------
const TILE_CACHE='petjada-rutes-mapes-v1';
function llistaTeselles(){
  const BUF={12:1500,13:1500,14:1200,15:800,16:500,17:400}, set=new Set(), ON=mapesOn(), zmaxOn=Math.max(...ON.map(L=>L.zmax),ZMIN);
  for(const k of DIES){ const p=RUTES[k].pts;
    for(let i=0;i<p.length;i+=2){ const [lat,lon]=p[i];
      for(let z=ZMIN;z<=TZMAX;z++){ if(z>zmaxOn) continue; const b=BUF[z], dl=b/110540, dn=b/(111320*Math.cos(rad(lat))), s=256*2**z;
        const [xa,ya]=wpx(lat+dl,lon-dn,z), [xb,yb]=wpx(lat-dl,lon+dn,z);
        for(let x=Math.floor(xa/256);x<=Math.floor(xb/256);x++) for(let y=Math.floor(ya/256);y<=Math.floor(yb/256);y++) set.add(z+'/'+x+'/'+y);
      }}}
  const out=[]; for(const k of set){ const [z,x,y]=k.split('/'); for(const L of ON) if(+z<=L.zmax) out.push(tileUrl(z,x,y,L)); } return out;
}
async function estatMapes(){
  try{ if(!('caches' in window)) return; const c=await caches.open(TILE_CACHE), ks=await c.keys(), tot=llistaTeselles().length;
    const n=Math.min(ks.length,tot);
    const ks2=new Set(ks.map(r=>r.url)), fet=llistaTeselles().filter(u=>ks2.has(u)).length, nm=mapesOn().map(L=>L.curt).join(' + ');
    $('mapa-estat').textContent= fet>=tot?'✓ '+nm+' sense cobertura':(fet?`${nm} · ${fet}/${tot} desades`:nm+' · cal cobertura');
    $('b-desc').textContent=fet>=tot?'Mapes descarregats ✓ (tornar a descarregar)':'Descarregar mapes per anar sense cobertura';
  }catch(e){}
}
$('b-desc').onclick=async()=>{
  if(!('caches' in window)){ $('desc-txt').textContent='Aquest navegador no permet desar mapes.'; return; }
  const b=$('b-desc'); if(b.dataset.on) return; b.dataset.on=1;
  try{ if(navigator.storage&&navigator.storage.persist) await navigator.storage.persist(); }catch(e){}
  const urls=llistaTeselles(), c=await caches.open(TILE_CACHE);
  let fet=0, err=0, bytes=0; $('desc-barra').hidden=false;
  const pinta=()=>{ $('desc-i').style.width=(fet/urls.length*100).toFixed(0)+'%';
    $('desc-txt').textContent=`Descarregant mapes: ${fet}/${urls.length}`+(bytes?` · ${(bytes/1048576).toFixed(1)} MB`:'')+(err?` · ${err} errors`:''); };
  let i=0;
  const worker=async()=>{ while(i<urls.length){ const u=urls[i++];
    try{ if(!(await c.match(u))){ let r;
        try{ r=await fetch(u,{mode:'cors'}); if(!r.ok) throw 0; const bl=await r.clone().blob(); bytes+=bl.size; }
        catch(e){ r=await fetch(u,{mode:'no-cors'}); }
        await c.put(u,r); }
    }catch(e){ err++; }
    fet++; pinta(); } };
  await Promise.all([worker(),worker(),worker(),worker()]);
  await carregaOSM(true);
  delete b.dataset.on;
  $('desc-txt').textContent= err?`Fet, però ${err} teselles han fallat: torna-ho a provar amb bona connexió.`:'Mapes desats: ja pots fer servir el mapa sense cobertura.';
  estatMapes();
};

// ---------- GPS ----------
function onFix(p){
  const c=p.coords; lastFix={lat:c.latitude,lon:c.longitude,acc:c.accuracy,alt:c.altitude,ts:p.timestamp}; try{pinta112()}catch(e){}
  $('prec').hidden=false; $('prec').textContent='± '+Math.round(c.accuracy)+' m';
  $('gps').className='pill ok'; $('gps').textContent='GPS actiu';
  if(prova) return;
  if(c.accuracy>100){ $('gps').className='pill av'; $('gps').textContent='GPS poc precís'; render(); return; }
  aplica(locate(c.latitude,c.longitude));
}
function aplica(b){
  const s=ds();
  if(lastFix&&!prova&&R.pb.length){
    const q=(b.d>40||s.b)?locateB(lastFix.lat,lastFix.lon):null;
    if(q&&q.d<=50&&(b.d>60||(s.b&&q.d+5<b.d))) return aplicaB(q);
  }
  pos={seg:b.i,t:b.t,d:b.d};
  const fora=b.d>60;
  $('track').className='pill '+(fora?'ko':'ok'); $('track').textContent=fora?`Fora del track ${Math.round(b.d)} m`:'Sobre el track';
  const av=$('avis'); av.classList.toggle('on',b.d>120); av.textContent=`Atenció: ets a ${Math.round(b.d)} m del track. Les dades es calculen des del punt del track més proper.`;
  if(!fora){
    const now=Date.now(); let prevSeg=s.seg||0; const prevTs=s.lastTs||now;
    s.pas=s.pas||{}; s.est=s.est||{}; s.salt=s.salt||{};
    if(s.b){ // tornem al pla A
      const pb=R.pb.find(x=>x.id===s.b.id);
      if(pb&&pb.ib!=null&&Math.abs(b.i-pb.ib)<60){
        R.trams.forEach((x,k)=>{ if(x.ib>pb.ia&&x.ib<=pb.ib&&s.pas[k]==null) s.salt[k]=pb.id; });
        s.desv={id:pb.id,km:pb.bd[pb.m-1]-(R.cd[pb.ib]-R.cd[pb.ia]),u:pb.bu[pb.m-1]-(R.cu[pb.ib]-R.cu[pb.ia]),n:pb.bn[pb.m-1]-(R.cn[pb.ib]-R.cn[pb.ia]),
          h:hores(pb.bd[pb.m-1]/1000,pb.bu[pb.m-1],pb.bn[pb.m-1])-horesEntre(pb.ia,pb.ib)};
        prevSeg=pb.ib;
      }
      delete s.b;
    }
    const bi=b.i+(b.t>0.5?1:0);
    R.trams.forEach((x,k)=>{ if(bi>=x.ib && s.pas[k]==null && s.salt[k]==null){
      // si hi has passat amb el mòbil bloquejat, estimem l'hora repartint el temps segons la fitxa
      const tot=horesEntre(prevSeg,bi), fins=horesEntre(prevSeg,x.ib);
      if(now-prevTs>5*60e3 && tot>0){ s.pas[k]=Math.round(prevTs+(now-prevTs)*fins/tot); s.est[k]=1; }
      else s.pas[k]=now;
    }});
    s.seg=b.i; s.t=b.t; s.lastTs=now;
    save();
  }
  render();
}
function aplicaB(q){
  const s=ds(), b=q.b, now=Date.now();
  if(!s.b||s.b.id!==b.id){ // entrem al pla B: el pla A queda fet fins a la cruïlla
    s.pas=s.pas||{}; s.salt=s.salt||{};
    R.trams.forEach((x,k)=>{ if(b.ia>=x.ib&&s.pas[k]==null&&s.salt[k]==null) s.pas[k]=now; });
    delete s.desv; }
  s.b={id:b.id,i:q.i,t:q.t}; s.seg=Math.min(b.ia,R.n-2); s.t=b.ia>=R.n-1?1:0; s.lastTs=now; save();
  pos={seg:s.seg,t:s.t,d:0,b:s.b};
  $('track').className='pill ok'; $('track').textContent='Sobre el pla '+b.id+(q.d>25?` (${Math.round(q.d)} m)`:'');
  $('avis').classList.remove('on');
  render();
}
function onErr(e){ $('gps').className='pill ko'; $('gps').textContent=e.code===1?'Permís de GPS denegat':'Sense senyal GPS'; }
function gpsOn(){
  if(!('geolocation' in navigator)){onErr({code:2});return}
  if(gpsWatch!=null) return;
  $('gps').className='pill av'; $('gps').textContent='Buscant GPS…';
  gpsWatch=navigator.geolocation.watchPosition(onFix,onErr,{enableHighAccuracy:true,maximumAge:5000,timeout:30000});
  $('b-gps').textContent='GPS actiu'; st.gps=true; save();
}

// ---------- Controls ----------
function canviaDia(d){dia=d; st.dia=d; save(); R=prepara(d); pos=null; pintaParades(); pintaPbChips(); pintaGuioTots(); metDia=null; if(MET) pintaMeteo(); if($('resum-vess')) set('resum-vess',pintaResumVessants()); if(lastFix&&!prova) aplica(locate(lastFix.lat,lastFix.lon)); else render(); if(prova) mouProva(); }
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>canviaDia(b.dataset.d));
$('b-gps').onclick=gpsOn;
$('b-inici').onclick=()=>{const s=ds();
  if(!s.inici){s.inici=Date.now();save();render();gpsOn();return}
  editaInici();};
function editaInici(){
  const s=ds(), inp=document.createElement('input'); inp.type='time'; inp.value=rel(new Date(s.inici));
  inp.style.cssText='font-size:20px;padding:8px;border-radius:10px;border:1px solid #ccc;margin-top:8px;width:100%';
  const box=$('b-inici').parentElement; if(box.querySelector('input[type=time]'))return; box.appendChild(inp); inp.focus();
  inp.onchange=()=>{const [h,m]=inp.value.split(':').map(Number);const d=new Date(s.inici);d.setHours(h,m,0,0);if(d>Date.now())d.setDate(d.getDate()-1);s.inici=+d;save();inp.remove();render();};
  inp.onblur=()=>setTimeout(()=>inp.remove(),300);
}
$('b-reset').onclick=()=>{const b=$('b-reset'); if(b.dataset.c){delete st[dia];save();pos=null;b.textContent='Reiniciar aquest dia';delete b.dataset.c;render();}
  else{b.dataset.c=1;b.textContent='Toca un altre cop per esborrar inici i hores';setTimeout(()=>{if(b.dataset.c){delete b.dataset.c;b.textContent='Reiniciar aquest dia'}},4000);}};
$('b-prova').onclick=()=>{prova=!prova;$('prova').classList.toggle('on',prova);$('b-prova').textContent=prova?'Sortir del mode prova':'Mode prova';
  if(prova)mouProva(); else{pos=null; if(lastFix)aplica(locate(lastFix.lat,lastFix.lon)); else render();}};
function mouProva(){const f=$('slider').value/1000, d=f*R.cd[R.n-1]; let i=0; while(i<R.n-2&&R.cd[i+1]<d)i++;
  const L=R.cd[i+1]-R.cd[i], t=L?(d-R.cd[i])/L:0; pos={seg:i,t,d:0};
  const [hh,mm]=R.r.sortida.split(':').map(Number); const dt=new Date((DATES[dia]||new Date().toISOString().slice(0,10))+'T00:00:00'); dt.setHours(hh,mm,0,0);
  const prev=new Date(+dt+(horesEntre(0,i)+paradesEntre(0,i+1))*3600e3);
  if(provaManual!=null){ provaHora=new Date(dt); provaHora.setHours(Math.floor(provaManual/60),provaManual%60,0,0); } else provaHora=prev;
  const dif=Math.round((provaHora-prev)/60000), dTxt=provaManual==null?'(hora prevista)':(Math.abs(dif)<3?"(a l'hora prevista)":dif>0?`(${hm(dif/60)} tard)`:`(${hm(-dif/60)} avançats)`);
  $('prova-h').value=rel(provaHora);
  $('track').className='pill av'; $('track').textContent='Mode prova · '+RUTES[dia].curt+' a les '+rel(provaHora)+' '+dTxt; $('avis').classList.remove('on'); render();}
$('slider').oninput=mouProva;
$('prova-h').onchange=()=>{ const v=$('prova-h').value; if(!v) return; const [h,m]=v.split(':').map(Number); provaManual=h*60+m; mouProva(); };
$('prova-ara').onclick=()=>{ const d=new Date(); provaManual=d.getHours()*60+d.getMinutes(); mouProva(); };
$('prova-prev').onclick=()=>{ provaManual=null; mouProva(); };

// ---------- Editor de parades ----------
function pintaParades(){ const P=paradesDia(), el=$('par-ed'); if(!el) return;
  el.innerHTML=R.wp.slice(1,-1).map(w=>{ const p=P[w.k]||{}; return `<div class="pared"><b>${esc(w.n.split(' · ')[0])}</b><input type="number" min="0" step="5" data-k="${esc(w.k)}" data-f="m" value="${p.m||''}" placeholder="0"><span>min</span><input data-k="${esc(w.k)}" data-f="t" value="${esc(p.t||'')}" placeholder="motiu (aigua, menjar, explicació…)"></div>`; }).join('');
  el.querySelectorAll('input').forEach(i=>i.onchange=()=>{ const k=i.dataset.k, P=paradesDia(); P[k]=P[k]||{};
    if(i.dataset.f==='m') P[k].m=Math.max(0,+i.value||0); else P[k].t=i.value.trim();
    if(!P[k].m&&!P[k].t) delete P[k]; save(); render(); }); }

async function llum(){try{wake=await navigator.wakeLock.request('screen');$('b-llum').textContent='Pantalla encesa ✓';st.llum=true;save();
  wake.addEventListener('release',()=>{$('b-llum').textContent='Pantalla sempre encesa'});}catch(e){$('b-llum').textContent='No disponible'}}
$('b-llum').onclick=()=>{ if(wake){wake.release();wake=null;st.llum=false;save();} else llum(); };
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible'){ if(st.llum) llum(); render(); }});
setInterval(()=>{$('rellotge').textContent=rel(new Date()); if(R) render();},20000);
$('rellotge').textContent=rel(new Date());

R=prepara(dia); pintaParades(); pintaGuioTots(); pintaFlora(); render(); estatMapes(); carregaOSM(false); carregaMeteo(false);
$('b-met').onclick=()=>carregaMeteo(true);
if(st.gps) gpsOn();
if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
