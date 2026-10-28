import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { INTRO_AN, INTRO_SCHLUESSEL, INTRO_AUFTRETEN_MS, INTRO_WINKEN_MS, introErlaubt, introGesehen, introMerken } from '../js/intro.js';
import { BEWEGUNGEN } from '../js/zeki-puppe.js';

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
test('Dauer höchstens 2,5 s, Puppe kann auftreten und winken (keine Bildfolge mehr)', () => {
  assert.ok(INTRO_AUFTRETEN_MS + INTRO_WINKEN_MS + 100 <= 2500);
  assert.ok(BEWEGUNGEN.auftreten && BEWEGUNGEN.winken);
  assert.ok(!fs.existsSync(new URL('../assets/brand/zeki/auftreten.webp', import.meta.url)));
  const intro = fs.readFileSync(new URL('../js/intro.js', import.meta.url), 'utf8');
  assert.match(intro, /zekiSpielen\(knopf, "auftreten", INTRO_AUFTRETEN_MS\)/);
  assert.match(intro, /zekiSpielen\(knopf, "winken", INTRO_WINKEN_MS\)/);
});
test('Gruß in allen 18 Sprachen, de/en/tr wie freigegeben', () => {
  const dir = new URL('../js/lang/', import.meta.url); const dat = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
  assert.equal(dat.length, 18);
  for (const f of dat) assert.match(fs.readFileSync(new URL(f, dir), 'utf8'), /heute: \{ introGruss: "[^"]+",/, f);
  const g = (f) => fs.readFileSync(new URL(f, dir), 'utf8').match(/introGruss: "([^"]+)"/)[1];
  assert.equal(g('de.js'), 'Hallo, Chef!'); assert.equal(g('en.js'), 'Hello, boss!'); assert.equal(g('tr.js'), 'Merhaba, şef!');
  assert.doesNotMatch(g('de.js'), /Selam/);
});
