import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mascotMarkup, mascotResultState } from '../js/gastrocash-brand.js';

test('Zeki: die vier Zustände sehen verschieden aus, Clip-IDs sind eindeutig',()=>{
  // Die Figur selbst (Maße, Teile, Klassennamen) wird neu gezeichnet und ist hier bewusst nicht festgeschrieben.
  const states=['neutral','freude','nachdenklich','warnung'];
  const drawings=new Set();
  for(const state of states){
    const svg=mascotMarkup(state);
    assert.match(svg,/^\s*<svg\b/);
    const ids=[...svg.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(ids.length,new Set(ids).size,'jede Clip-ID ist eindeutig');
    drawings.add(svg);
  }
  assert.equal(drawings.size,4);
});
test('unbekannter Zustand fällt neutral zurück; keine HTML-Injektion',()=>{
  const roh=mascotMarkup('<img onerror=alert(1)>');
  assert.ok(!roh.includes('onerror'));
  assert.equal(roh.replace(/zeki-\d+-clip-/g,'clip-'),mascotMarkup('neutral').replace(/zeki-\d+-clip-/g,'clip-'));
});
test('Markenpaket: index.html lädt das alte Marken-CSS nicht mehr',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.doesNotMatch(html,/css\/gastrocash-brand\.css/);
});


test('sichtbare Kernmarke ist in allen 18 Sprachen GastroCash',async()=>{
  const codes=['de','tr','en','ar','fa','ku','pl','ro','bg','ru','uk','sq','bs','el','it','es','fr','vi'];
  for(const code of codes){
    const mod=await import('../js/lang/'+code+'.js');
    // Manche Texte sind Vorlagen-Funktionen; ihr Text (die Vorlage) zählt mit.
    const txt=JSON.stringify(mod.default,(k,v)=>typeof v==='function'?String(v):v);
    assert.doesNotMatch(txt,/GastroCalc/,'alte Marke in '+code);
    assert.match(txt,/GastroCash/,'neue Marke fehlt in '+code);
  }
  assert.equal(fs.readdirSync(new URL('../js/lang/',import.meta.url)).filter(f=>f.endsWith('.js')).length,codes.length,'jede Sprachdatei ist geprüft');
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

test('Bewegungen sind von Emotionen getrennt und unbekannte Bewegung fällt sicher zurück',()=>{
  assert.match(mascotMarkup('freundlich','thumb'),/gc-motion--thumb/);
  assert.match(mascotMarkup('nachdenklich','turn'),/gc-motion--turn/);
  assert.match(mascotMarkup('erfolg','celebrate'),/gc-motion--celebrate/);
  assert.match(mascotMarkup('neutral','irgendwas'),/gc-motion--none/);
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
