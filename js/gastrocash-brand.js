// Darstellung und Bewegung. Keine Sätze, Ereignisentscheidungen oder Speicherung.
import {ZEKI_SVG} from './zeki-svg.js';
import {ZEKI_BILDER} from './zeki-bilder.js';
const own=(o,k)=>typeof k==='string'&&Object.hasOwn(o,k);
const states={neutral:'neutral',freude:'freude',nachdenklich:'import',warnung:'warnung',freundlich:'freude',ernst:'warnung',erfolg:'freude',frage:'frage',import:'import',preis:'preis',hilfe:'hilfe',bestaetigt:'bestaetigt',aufmerksam:'aufmerksam',erleichtert:'erleichtert',fehler:'fehler'};
const motions={none:'none',idle:'none',atmen:'none',zwinkern:'zwinkern',grinsen:'grinsen',laecheln:'grinsen',hand:'hand',nicken:'nicken',kopfschuetteln:'kopfschuetteln',pruefen:'pruefen',preis:'preis',auftreten:'auftreten',thumb:'hand',celebrate:'grinsen',turn:'pruefen'};
let instance=0;const runs=new WeakMap();
export function mascotMarkup(zustand='neutral',bewegung='none'){
 const s=own(states,zustand)?zustand:'neutral',m=own(motions,bewegung)?bewegung:'none',prefix='zeki-'+(++instance)+'-';
 return ZEKI_SVG.replace(/<style>[\s\S]*?<\/style>/,'').replace(/id="([^"]+)"/g,(_,id)=>id.startsWith('clip-')?'id="'+prefix+id+'"':'data-zeki-teil="'+id+'"').replaceAll('url(#clip-','url(#'+prefix+'clip-').replaceAll('href="#clip-','href="#'+prefix+'clip-').replace('class="zeki"',`class="gc-bot gc-bot--${s} gc-motion--${m} zeki zeki--${states[s]}" data-zeki-start="${motions[m]}"`).replace('data-zeki-zustand="neutral"',`data-zeki-zustand="${states[s]}"`);
}
export function zekiMimik(element,zustand='neutral'){
 const svg=element?.matches?.('.zeki')?element:element?.querySelector?.('.zeki');if(!svg||!own(states,zustand))return false;zekiSpielen(svg,'none');svg.dataset.zekiZustand=states[zustand];return true;
}
export function zekiSpielen(element,bewegung='none',dauerMs){
 const svg=element?.matches?.('.zeki')?element:element?.querySelector?.('.zeki');if(!svg||!own(motions,bewegung))return false;runs.get(svg)?.();const m=motions[bewegung];if(m==='none')return true;
 if(svg.ownerDocument.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches)return true;
 const info0=ZEKI_BILDER[m],info=info0&&{...info0,dauer:dauerMs>0?dauerMs:info0.dauer},film=svg.querySelector('[data-zeki-teil="film"]');if(!info||!film)return false;
 let cancelled=false,timer;const cleanup=()=>{cancelled=true;clearTimeout(timer);film.removeEventListener('animationend',end);film.removeEventListener('animationcancel',end);if(runs.get(svg)===cleanup){svg.classList.remove('zeki--spielt');runs.delete(svg);}};const end=e=>{if(e.target===film)cleanup()};runs.set(svg,cleanup);
 const url=new URL('../assets/brand/zeki/'+info.datei,import.meta.url).href,img=new svg.ownerDocument.defaultView.Image();img.onload=()=>{if(cancelled)return;film.setAttribute('href',url);film.setAttribute('width','1385');film.setAttribute('height','1720');svg.style.setProperty('--zeki-ablauf','zeki3d-'+m);svg.style.setProperty('--zeki-dauer',info.dauer+'ms');film.addEventListener('animationend',end);film.addEventListener('animationcancel',end);const win=svg.ownerDocument.defaultView,los=()=>{if(cancelled)return;void film.getBoundingClientRect();svg.classList.add('zeki--spielt');timer=setTimeout(cleanup,info.dauer+450)};/* 26.10.2026 Flackern: erst wenn das Bild dekodiert und gemalt ist, vom Vektor auf die Bildfolge wechseln (iPhone zeigte sonst kurz eine leere Figur) */(img.decode?img.decode().catch(()=>{}):Promise.resolve()).then(()=>win.requestAnimationFrame(()=>win.requestAnimationFrame(los)))};img.onerror=cleanup;img.src=url;return true;
}
// Nur angeforderte Darstellungsbewegungen starten; keine fachliche Ereigniszuordnung.
if(typeof document!=='undefined'&&typeof MutationObserver!=='undefined'){
 const start=root=>{for(const s of root.querySelectorAll('.zeki[data-zeki-start]')){const m=s.dataset.zekiStart;s.removeAttribute('data-zeki-start');zekiSpielen(s,m)}};
 const observer=new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1)start(n.parentElement||document)});observer.observe(document.documentElement,{childList:true,subtree:true});start(document);
}
export function mascotResultState({ aboveZero=false, delta=0, incomplete=false }={}) {
  if (incomplete) return 'nachdenklich';
  if (aboveZero) return 'erfolg';
  if (Number(delta) < 0) return 'ernst';
  if (Number(delta) > 0) return 'nachdenklich';
  return 'neutral';
}
