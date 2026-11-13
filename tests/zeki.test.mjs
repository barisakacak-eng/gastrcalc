import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {mascotMarkup} from '../js/gastrocash-brand.js';
import {vornHtml,VORN_BREITE,VORN_HOEHE,ZELLE_KLEIN,zekiSpielen} from '../js/zeki_figur.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Zeki vorn: Maße = Zelle der Folgen (256 × 318), Bild und Behälter, keine Blase',()=>{
  assert.equal(VORN_HOEHE,Math.round(VORN_BREITE*ZELLE_KLEIN[1]/ZELLE_KLEIN[0]));
  const h=vornHtml({miene:'warnung',start:'kopfschuetteln',klasse:'x y'});
  assert.match(h,/^<span class="gc-zeki-vorn x y" data-zeki-vorn="1" data-zeki-start="kopfschuetteln"><img class="gc-zeki" src="assets\/brand\/zeki-mienen\/zeki-warnung\.webp" alt="" width="128" height="159" decoding="async"><\/span>$/);
  assert.doesNotMatch(h,/blase/i);
  assert.doesNotMatch(vornHtml({miene:'gibt-es-nicht',start:'gibt-es-nicht'}),/data-zeki-start|zeki-gibt/,'unbekannte Miene → neutral, unbekannte Folge startet nicht');
  assert.doesNotMatch(vornHtml({klasse:'"><script>'}),/<script/);
});
test('Zeki: Zustands- und Bewegungseingaben sind strikt begrenzt',()=>{
  for(const invalid of ['__proto__','constructor','<img src=x onerror=alert(1)>',{},null,42]){
    assert.equal(mascotMarkup(invalid),mascotMarkup());
    assert.equal(mascotMarkup('neutral',invalid),mascotMarkup());
  }
  assert.equal(zekiSpielen(null,'hand'),null);
  assert.equal(zekiSpielen({},'gibt-es-nicht'),null);
  for(const motion of ['hand','nicken','kopfschuetteln','pruefen','preis','nachdenken','auftreten'])
    assert.ok(mascotMarkup('neutral',motion).includes('data-zeki-start="'+motion+'"'),motion);
});
test('Zeki: CSS wird lokal geladen, der Offline-Speicher kennt die neue Technik und nicht mehr die alte',()=>{
  assert.match(read('index.html'),/href="css\/zeki.css"/);
  const sw=read('sw.js');
  for(const p of ['css/zeki.css','js/zeki_figur.js','js/gastrocash-brand.js','js/adapter/brand_start.js','assets/brand/zeki-mienen/zeki-hilfe.webp','assets/brand/zeki-buehne/start.webp'])assert.ok(sw.includes('"'+p+'"'),p);
  for(const p of ['js/zeki-svg.js','js/zeki-puppe.js','assets/brand/zeki.svg','assets/brand/mascot-classic.svg','assets/brand/zeki/hand.webp'])assert.ok(!sw.includes('"'+p+'"'),p+' gehört nicht mehr in den Offline-Speicher');
  assert.ok(existsSync(new URL('../assets/brand/zeki.svg',import.meta.url)),'zeki.svg bleibt als Entwurf im Repo');
  assert.ok(sw.includes('"assets/brand/zeki-klein/'),'die Folgen (3,5 MB) stehen im Nachlade-Cache, nicht in der Startliste');
  assert.ok(!/"assets\/brand\/zeki-klein\/[^"]+"(?=[^\]]*\])/.test(sw.match(/const DATEIEN = \[[^\]]*\]/)[0]),'keine Folge in der Start-Liste');
});
test('Zeki: css/zeki.css – keine Kreise, keine Sprechblase, nur Tokens, Animationen nur transform/opacity',()=>{
  const css=read('css/zeki.css').replace(/\/\*[\s\S]*?\*\//g,'');
  assert.doesNotMatch(css,/@import|https?:\/\//);
  assert.doesNotMatch(css,/#[0-9a-fA-F]{3,8}\b|rgba?\(/,'Farben nur über var(--token)');
  assert.doesNotMatch(css,/border-radius:\s*50%/,'kein Kreis um Zeki');
  assert.doesNotMatch(css,/\.gc-zeki-vorn[^{]*\{[^}]*(border|background|box-shadow)/,'Zeki vorn hat keinen Rahmen und keinen Hintergrund');
  assert.match(css,/\.rg-blase\{[^}]*background:none/); assert.match(css,/\.s2zeki-blase\{[^}]*background:none/);
  assert.match(css,/\.rg-blase::before\{display:none/);
  for(const part of css.matchAll(/@keyframes [^{]+\{([\s\S]*?)(?=\n@|\n\.|\n\/\*|$)/g))
    assert.doesNotMatch(part[1],/\b(?:width|height|top|left|margin|padding|filter|stroke|fill):/,'Animation verändert nur transform/opacity');
});
