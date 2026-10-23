import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mascotMarkup, mascotResultState } from '../js/gastrocash-brand.js';

test('alle fünf Mascot-Zustände sind ohne Zwinkern unterscheidbar', () => {
  const states=['neutral','freundlich','nachdenklich','ernst','erfolg'];
  const mouths=new Set();
  for(const state of states){
    const svg=mascotMarkup(state);
    assert.match(svg, /viewBox="0 0 160 180"/);
    assert.match(svg, /gc-bot-eyes/);
    const eyeGroup=svg.match(/class="gc-bot-eyes"[^>]*>(.*?)<\/g>/)?.[1] || '';
    assert.equal((eyeGroup.match(/<circle /g)||[]).length,2, state+' braucht zwei offene Augen');
    const mouth=svg.match(/<path d="(M\d+ \d+[^"]*)" stroke="#FFFDF9"/)?.[1];
    assert.ok(mouth, state+' braucht einen Mund');
    mouths.add(mouth);
  }
  assert.equal(mouths.size,5,'alle Zustände brauchen eigene Mundformen');
});
test('unbekannter Zustand fällt neutral zurück; keine HTML-Injektion',()=>{
  assert.equal(mascotMarkup('<img onerror=alert(1)>'),mascotMarkup('neutral'));
});
test('Markenpaket nutzt nur lokale Dateien und respektiert reduzierte Bewegung',()=>{
  const css=fs.readFileSync(new URL('../css/gastrocash-brand.css',import.meta.url),'utf8');
  assert.match(css,/prefers-reduced-motion:no-preference/);
  assert.doesNotMatch(css,/@import|https?:\/\//);
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const nav=fs.readFileSync(new URL("../js/screens/nav.js",import.meta.url),"utf8");
  assert.match(nav,/mascotMarkup/);
  assert.match(html,/css\/gastrocash-brand\.css/);
});


test('sichtbare Kernmarke ist in allen 18 Sprachen GastroCash',()=>{
  const codes=['de','tr','en','ar','fa','ku','pl','ro','bg','ru','uk','sq','bs','el','it','es','fr','vi'];
  for(const code of codes){
    const txt=fs.readFileSync(new URL('../js/lang/'+code+'.js',import.meta.url),'utf8');
    assert.doesNotMatch(txt,/GastroCalc/,'alte Marke in '+code);
    assert.match(txt,/GastroCash/,'neue Marke fehlt in '+code);
  }
});

test('Manifest und Vektorlogos tragen GastroCash',()=>{
  const manifest=JSON.parse(fs.readFileSync(new URL('../manifest.webmanifest',import.meta.url),'utf8'));
  assert.equal(manifest.name,'GastroCash');
  assert.equal(manifest.short_name,'GastroCash');
  for(const p of ['../icons/logo.svg','../icons/logo-zeichen.svg','../assets/brand/gastrocash-logo.svg']){
    const svg=fs.readFileSync(new URL(p,import.meta.url),'utf8');
    assert.match(svg,/GastroCash/);
    assert.doesNotMatch(svg,/GastroCalc/);
  }
});


test('Tagesabschluss: schlechte Lage wird nicht lächelnd dargestellt',()=>{
  assert.equal(mascotResultState({aboveZero:true,delta:10}),'erfolg');
  assert.equal(mascotResultState({aboveZero:false,delta:-10}),'ernst');
  assert.equal(mascotResultState({aboveZero:false,delta:10}),'nachdenklich');
  assert.equal(mascotResultState({aboveZero:false,delta:0,incomplete:true}),'nachdenklich');
  assert.equal(mascotResultState({aboveZero:false,delta:0}),'neutral');
});

test('Küchenhelfer sitzt in vorhandener Hilfe und echtem Tagesabschluss',()=>{
  const hilfe=fs.readFileSync(new URL('../js/screens/ebene.js',import.meta.url),'utf8');
  const abschluss=fs.readFileSync(new URL('../js/screens/abschluss.js',import.meta.url),'utf8');
  assert.match(hilfe,/gc-help-bot/);
  assert.match(abschluss,/gc-ab-mascot/);
  assert.match(abschluss,/mascotResultState/);
});


test('Bewegungen sind von Emotionen getrennt und unbekannte Bewegung fällt sicher zurück',()=>{
  assert.match(mascotMarkup('freundlich','thumb'),/gc-motion--thumb/);
  assert.match(mascotMarkup('nachdenklich','turn'),/gc-motion--turn/);
  assert.match(mascotMarkup('erfolg','celebrate'),/gc-motion--celebrate/);
  assert.match(mascotMarkup('neutral','irgendwas'),/gc-motion--none/);
  const blink=mascotMarkup('neutral','idle');
  const eyes=blink.match(/class="gc-bot-eyes"[^>]*>(.*?)<\/g>/)?.[1]||'';
  assert.equal((eyes.match(/<circle /g)||[]).length,2,'Blinzeln bleibt beidäugig, kein Zwinkern');
});


test('PWA-Icons sind echte GastroCash-PNGs in den erwarteten Größen',()=>{
  const expected=[['icon-180.png',180],['icon-192.png',192],['icon-512.png',512],['icon-maskable-512.png',512]];
  const bufs=[];
  for(const [name,size] of expected){
    const b=fs.readFileSync(new URL('../icons/'+name,import.meta.url));
    assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a',name+' ist kein PNG');
    assert.equal(b.readUInt32BE(16),size,name+' Breite');
    assert.equal(b.readUInt32BE(20),size,name+' Höhe');
    assert.ok(b.length>1000,name+' ist verdächtig leer');
    bufs.push(b);
  }
  assert.notDeepEqual(bufs[2],bufs[3],'Maskable-Icon braucht eigenen Sicherheitsrand');
});
