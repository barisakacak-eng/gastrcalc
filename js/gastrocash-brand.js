// GastroCash: eine SVG-Quelle, keine Berechnung, keine Speicherung.
import { ZEKI_SVG } from './zeki-svg.js';
const zekiReferenz=new URL('../assets/brand/zeki-referenz.jpeg',import.meta.url).href;
const states = { neutral:'neutral', freude:'freude', nachdenklich:'nachdenklich', warnung:'warnung', freundlich:'freude', ernst:'warnung', erfolg:'freude' };
const motions = { none:'none', zwinkern:'zwinkern', grinsen:'grinsen', hand:'hand', nicken:'nicken', kopfschuetteln:'kopfschuetteln', atmen:'atmen', idle:'atmen', thumb:'hand', turn:'kopfschuetteln', celebrate:'hand' };
let zekiInstanz=0;
const own = (o, k) => typeof k === 'string' && Object.hasOwn(o, k);

export function mascotMarkup(zustand='neutral', bewegung='none') {
  const state=own(states,zustand)?zustand:'neutral';
  const motion=own(motions,bewegung)?bewegung:'none';
  const prefix=`zeki-${++zekiInstanz}-`;
  // IDs gehören zur Quelldatei. Inline bekommt jede Gruppe ein lokales Datenattribut,
  // damit Kopfzeile, Hilfe und Abschluss auf einer Seite keine doppelten IDs erzeugen.
  return ZEKI_SVG.replaceAll('href="zeki-referenz.jpeg"',`href="${zekiReferenz}"`).replace(/id="([^"]+)"/g,(_,id)=>id.startsWith('clip-')?`id="${prefix}${id}"`:`data-zeki-teil="${id}"`).replaceAll('url(#clip-',`url(#${prefix}clip-`)
    .replace('class="zeki"',`class="gc-bot gc-bot--${state} gc-motion--${motion} zeki zeki--${states[state]}${motions[motion]==='none'?'':` zeki--${motions[motion]}`}" data-zeki-zustand="${states[state]}"`);
}

const bewegungen=['zwinkern','grinsen','hand','nicken','kopfschuetteln','atmen'];
const enden={zwinkern:['auge-r','zeki-auge-zu'],grinsen:['mund-grinsen','zeki-ein'],hand:['arm-r','zeki-winken'],nicken:['kopf','zeki-nicken'],kopfschuetteln:['kopf','zeki-nein']};
const laeufe=new WeakMap();

export function zekiSpielen(element, bewegung='none') {
  const svg=element?.matches?.('.zeki')?element:element?.querySelector?.('.zeki');
  if (!svg || !own(motions,bewegung)) return false;
  laeufe.get(svg)?.();
  bewegungen.forEach(m=>svg.classList.remove('zeki--'+m));
  const motion=motions[bewegung];
  if (motion==='none') return true;
  // Layout nur einmal beim erneuten Tippen: derselbe Knopf kann sofort neu starten.
  void svg.getBoundingClientRect();
  svg.classList.add('zeki--'+motion);
  // Endzustand ohne Bewegung bleibt sichtbar, bis die nächste Aktion ihn ersetzt.
  if (svg.ownerDocument?.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches || motion==='atmen') {
    laeufe.set(svg,()=>{bewegungen.forEach(m=>svg.classList.remove('zeki--'+m));laeufe.delete(svg);});
    return true;
  }
  let timer;
  const cleanup=()=>{clearTimeout(timer);svg.removeEventListener('animationend',ende);svg.removeEventListener('animationcancel',ende);bewegungen.forEach(m=>svg.classList.remove('zeki--'+m));laeufe.delete(svg);};
  const ende=e=>{const [teil,name]=enden[motion];if(e.target?.getAttribute?.('data-zeki-teil')===teil && e.animationName===name) cleanup();};
  svg.addEventListener('animationend',ende);svg.addEventListener('animationcancel',ende);
  // Falls SVG während des Laufs verborgen/entfernt wird, gibt es nicht immer animationend.
  timer=setTimeout(cleanup,1500);
  laeufe.set(svg,cleanup);
  return true;
}

export function mascotResultState({ aboveZero=false, delta=0, incomplete=false }={}) {
  if (incomplete) return 'nachdenklich';
  if (aboveZero) return 'erfolg';
  if (Number(delta) < 0) return 'ernst';
  if (Number(delta) > 0) return 'nachdenklich';
  return 'neutral';
}
