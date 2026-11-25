// Idiomes de Petjada: català (original), castellà, anglès, francès i italià.
// Tradueix la interfície al vol (textos sencers i trossos amb dades). El contingut de la ruta (guió, telèfons de Claude) no es toca.
(()=>{
const LANGS={ca:'Català',es:'Castellano',en:'English',fr:'Français',it:'Italiano'};
let L=null; try{ L=localStorage.getItem('petjada-lang'); }catch(e){}
if(!LANGS[L]){ const n=(navigator.language||'ca').slice(0,2).toLowerCase(); L=LANGS[n]?n:'ca'; }
window.LANG=L; window.LANGS=LANGS;
window.LOC={ca:'ca-ES',es:'es-ES',en:'en-GB',fr:'fr-FR',it:'it-IT'}[L];
window.DS_L={ca:['dg','dl','dt','dc','dj','dv','ds'],es:['do','lu','ma','mi','ju','vi','sá'],en:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],fr:['dim','lun','mar','mer','jeu','ven','sam'],it:['dom','lun','mar','mer','gio','ven','sab']}[L];
window.setLang=l=>{ try{ localStorage.setItem('petjada-lang',l); }catch(e){} location.reload(); };
document.documentElement.lang=L;
if(L==='ca'){ window.t=s=>s; return; }
let D={}; try{ const x=new XMLHttpRequest(); x.open('GET','i18n/'+L+'.json',false); x.send(); if(x.status===200) D=JSON.parse(x.responseText); }catch(e){}
const FULL=D.full||{}, rx=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const PAT=Object.entries(FULL).filter(([k])=>k.includes('{}')).map(([k,v])=>[new RegExp('^'+k.split('{}').map(rx).join('(.+?)')+'$','u'),v]);
const GL=Object.entries(D.glossari||{}).sort((a,b)=>b[0].length-a[0].length).map(([k,v])=>[new RegExp('(^|[^\\p{L}])'+rx(k)+'(?![\\p{L}])','gu'),v]);
const cache=new Map();
function tr(s){ const t=s.trim(); if(!t||!/\p{L}/u.test(t)) return s; if(cache.has(s)) return cache.get(s);
  const n=t.replace(/\s+/g,' '); let o=FULL[n];
  if(o==null){ for(const [re,v] of PAT){ const m=n.match(re); if(m){ let i=0; o=v.replace(/\{\}/g,()=>tr(m[++i]||'')); break; } } }
  if(o==null){ o=n; if(n.length<=110) for(const [re,v] of GL) o=o.replace(re,(m,p)=>p+v); }
  const r=o===n?s:s.replace(t,o); cache.set(s,r); return r; }
window.t=tr;
const SKIP='script,style,textarea,[data-noi18n],#nom-ruta';
const fet=new WeakMap();
function txt(n){ const p=n.parentElement; if(!p||p.closest(SKIP)) return; if(fet.get(n)===n.nodeValue) return; const v=tr(n.nodeValue); if(v!==n.nodeValue) n.nodeValue=v; fet.set(n,n.nodeValue); }
function attrs(e){ if(e.closest('script,style,[data-noi18n],#nom-ruta')) return; for(const a of ['placeholder','title','aria-label']){ const v=e.getAttribute&&e.getAttribute(a); if(v){ const t2=tr(v); if(t2!==v) e.setAttribute(a,t2); } } }
function arbre(r){ if(r.nodeType===3){ txt(r); return; } if(r.nodeType!==1) return; attrs(r);
  const w=document.createTreeWalker(r,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT); let n; while(n=w.nextNode()){ if(n.nodeType===3) txt(n); else attrs(n); } }
function inicia(){ arbre(document.body); document.title=tr(document.title);
  new MutationObserver(ms=>{ for(const m of ms){ if(m.type==='characterData') txt(m.target); else if(m.type==='attributes') attrs(m.target); else m.addedNodes.forEach(arbre); } })
    .observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder','title','aria-label']}); }
if(document.body) inicia(); else document.addEventListener('DOMContentLoaded',inicia);
})();
