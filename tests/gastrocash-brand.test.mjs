import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mascotMarkup } from '../js/gastrocash-brand.js';

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
