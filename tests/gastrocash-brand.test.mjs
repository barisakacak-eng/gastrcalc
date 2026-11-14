import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mascotMarkup, mascotResultState } from '../js/gastrocash-brand.js';

test('Zeki: jeder Zustand ist ein Bild seiner Miene – feste Maße, leeres alt, kein Kreis, keine SVG-Figur',()=>{
  const zustaende=['neutral','freude','frage','import','preis','hilfe','warnung','bestaetigt','aufmerksam','erleichtert','fehler','staunt'];
  const quellen=new Set();
  for(const z of zustaende){
    const h=mascotMarkup(z);
    assert.match(h,/^<span class="gc-zeki-vorn gc-bot gc-bot--[a-z]+ gc-motion--none" data-zeki-vorn="1"><img class="gc-zeki" src="assets\/brand\/zeki-mienen\/zeki-[a-z]+\.webp" alt="" width="\d+" height="\d+" decoding="async"><\/span>$/,z);
    assert.doesNotMatch(h,/<svg|<circle|border-radius|clip-path|style=/);
    const src=h.match(/src="([^"]+)"/)[1]; assert.ok(fs.existsSync(new URL('../'+src,import.meta.url)),src+' fehlt'); quellen.add(src);
  }
  assert.equal(quellen.size,12,'zwölf verschiedene Mienen');
  // alte Namen bleiben benutzbar und landen bei der passenden Miene
  assert.match(mascotMarkup('nachdenklich'),/zeki-import\.webp/); assert.match(mascotMarkup('ernst'),/zeki-warnung\.webp/); assert.match(mascotMarkup('erfolg'),/zeki-freude\.webp/);
});
test('unbekannter Zustand fällt neutral zurück; keine HTML-Injektion',()=>{
  for(const roh of ['<img onerror=alert(1)>','__proto__','constructor',{},null,42]){
    const h=mascotMarkup(roh); assert.ok(!h.includes('onerror')); assert.equal(h,mascotMarkup('neutral'));
    assert.equal(mascotMarkup('neutral',roh),mascotMarkup('neutral'));
  }
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

test('Bewegungen sind von Emotionen getrennt: nur echte Folgen starten beim Erscheinen, unbekannte fallen sicher zurück',()=>{
  assert.match(mascotMarkup('freundlich','thumb'),/gc-motion--thumb" data-zeki-vorn="1" data-zeki-start="daumen"/);
  assert.match(mascotMarkup('hilfe','hand'),/data-zeki-start="hand"/);
  assert.match(mascotMarkup('erfolg','celebrate'),/data-zeki-start="jubeln"/);
  assert.match(mascotMarkup('neutral','irgendwas'),/gc-motion--none/);
  for(const still of ['none','zwinkern','grinsen','laecheln','idle']) assert.doesNotMatch(mascotMarkup('neutral',still),/data-zeki-start/,still+': Zwinkern und Grinsen laufen nie von selbst');
});
test('Die alte Vektorfigur und die Gliederpuppe sind weg, nichts importiert sie mehr',()=>{
  for(const d of ['js/zeki-svg.js','js/zeki-puppe.js','js/zeki-bilder.js','assets/brand/mascot-classic.svg']) assert.ok(!fs.existsSync(new URL('../'+d,import.meta.url)),d);
  const alle=(d)=>fs.readdirSync(new URL('../'+d,import.meta.url),{withFileTypes:true}).flatMap(e=>e.isDirectory()?alle(d+'/'+e.name):e.name.endsWith('.js')?[d+'/'+e.name]:[]);
  for(const f of alle('js')) assert.doesNotMatch(fs.readFileSync(new URL('../'+f,import.meta.url),'utf8'),/zeki-svg|zeki-puppe|zeki-bilder|ZEKI_SVG/,f);
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
