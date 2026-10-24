import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mascotMarkup,zekiSpielen} from '../js/gastrocash-brand.js';
import {ZEKI_SVG} from '../js/zeki-svg.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Zeki: eine kanonische Quelle und alle beweglichen Gruppen',()=>{
  assert.equal(ZEKI_SVG,read('assets/brand/zeki.svg').trim(),'nach SVG-Änderung tools/zeki_bauen.py ausführen');
  for(const id of ['zeki','kopf','auge-l','auge-r','lid-l','lid-r','mund-neutral','mund-grinsen','mund-o','arm-r','hand-r','koerper','muenze'])
    assert.equal((ZEKI_SVG.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
  assert.doesNotMatch(ZEKI_SVG,/<script|<foreignObject|href="https?:/, 'nur lokale Originalpixel und SVG-Gruppen');
  assert.ok(readFileSync(new URL('../assets/brand/zeki-referenz.jpeg',import.meta.url)).equals(readFileSync(new URL('../design/referenz/zeki-brand-2026.jpeg',import.meta.url))),'Originalbild bleibt unverändert');
});
test('Zeki: Zustands- und Bewegungseingaben sind strikt begrenzt',()=>{
  for(const invalid of ['__proto__','constructor','<img src=x onerror=alert(1)>',{},null,42]){
    assert.equal(mascotMarkup(invalid).replace(/zeki-\d+-clip-/g,'clip-'),mascotMarkup().replace(/zeki-\d+-clip-/g,'clip-'));
    assert.equal(mascotMarkup('neutral',invalid).replace(/zeki-\d+-clip-/g,'clip-'),mascotMarkup().replace(/zeki-\d+-clip-/g,'clip-'));
  }
  assert.equal(zekiSpielen(null,'hand'),false);
  assert.equal(zekiSpielen({},'hand'),false);
  for(const motion of ['zwinkern','grinsen','hand','nicken','kopfschuetteln','atmen'])
    assert.ok(mascotMarkup('neutral',motion).includes('zeki--'+motion));
});
test('Zeki: CSS wird lokal geladen und liegt im Offline-Paket',()=>{
  assert.match(read('index.html'),/href="css\/zeki.css"/);
  for(const p of ['assets/brand/zeki.svg','assets/brand/zeki-referenz.jpeg','css/zeki.css','js/zeki-svg.js'])assert.ok(read('sw.js').includes('"'+p+'"'),p);
  const css=read('css/zeki.css');
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(css,/@import|https?:\/\//);
  for(const part of css.matchAll(/@keyframes [^{]+\{([\s\S]*?)(?=\n@|\n\/\*)/g))
    assert.doesNotMatch(part[1],/\b(?:width|height|top|left|margin|padding|filter|stroke|fill):/,'Animation verändert nur transform/opacity');
});
