import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { INTRO_AN, INTRO_SCHLUESSEL, INTRO_AUFTRETEN_MS, INTRO_WINKEN_MS, introErlaubt, introGesehen, introMerken } from '../js/intro.js';

test('Schalter, Reduced-Motion und Sitzung entscheiden', () => {
  assert.equal(INTRO_AN, true);
  assert.equal(introErlaubt({}), true);
  assert.equal(introErlaubt({ an: false }), false);
  assert.equal(introErlaubt({ reduziert: true }), false);
  assert.equal(introErlaubt({ gesehen: true }), false);
});
test('Sitzungsmerker: höchstens einmal, ohne Speicher kein Absturz', () => {
  const m = new Map(); const sp = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
  assert.equal(introGesehen(sp), false); introMerken(sp); assert.equal(m.get(INTRO_SCHLUESSEL), '1'); assert.equal(introGesehen(sp), true);
  const kaputt = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } };
  assert.equal(introGesehen(kaputt), false); assert.doesNotThrow(() => introMerken(kaputt));
  assert.equal(introGesehen(null), false); assert.doesNotThrow(() => introMerken(undefined));
});
test('Dauer höchstens 2,5 s, keine Bildfolge-Datei mehr',()=>{
  assert.equal(INTRO_AUFTRETEN_MS + INTRO_WINKEN_MS + 100 <= 2500, true);
  assert.ok(!fs.existsSync(new URL('../assets/brand/zeki/auftreten.webp', import.meta.url)));
});
test('Gruß in allen 18 Sprachen, de/en/tr wie freigegeben', async () => {
  const dir = new URL('../js/lang/', import.meta.url); const dat = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
  assert.equal(dat.length, 18);
  const gruss = {};
  for (const f of dat) {
    const gruss1 = (await import('../js/lang/' + f)).default.heute?.introGruss;
    assert.equal(typeof gruss1, 'string', f); assert.ok(gruss1.length > 0, f);
    gruss[f] = gruss1;
  }
  assert.equal(gruss['de.js'], 'Hallo, Chef!'); assert.equal(gruss['en.js'], 'Hello, boss!'); assert.equal(gruss['tr.js'], 'Merhaba, şef!');
  assert.doesNotMatch(gruss['de.js'], /Selam/);
});
