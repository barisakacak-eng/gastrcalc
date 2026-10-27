import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { INTRO_AN, INTRO_SCHLUESSEL, INTRO_AUFTRETEN_MS, INTRO_WINKEN_MS, introErlaubt, introGesehen, introMerken } from '../js/intro.js';
import { ZEKI_BILDER } from '../js/zeki-bilder.js';

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
test('Dauer höchstens 2,5 s, Bogen auftreten vorhanden', () => {
  assert.ok(INTRO_AUFTRETEN_MS + INTRO_WINKEN_MS + 150 <= 2500);
  assert.equal(ZEKI_BILDER.auftreten.datei, 'auftreten.webp');
  assert.ok(fs.existsSync(new URL('../assets/brand/zeki/auftreten.webp', import.meta.url)));
  const css = fs.readFileSync(new URL('../css/zeki.css', import.meta.url), 'utf8');
  const kf = css.match(/@keyframes zeki3d-auftreten\{([^@]*?)\}\n/)[1];
  assert.equal((kf.match(/translate\(/g) || []).length, 19, 'nur Felder 7–25');
  assert.ok(!kf.includes('translate(0px,0px)'), 'Feld 1 nicht dabei');
});
test('Gruß in allen 18 Sprachen, de/en/tr wie freigegeben', () => {
  const dir = new URL('../js/lang/', import.meta.url); const dat = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
  assert.equal(dat.length, 18);
  for (const f of dat) assert.match(fs.readFileSync(new URL(f, dir), 'utf8'), /heute: \{ introGruss: "[^"]+",/, f);
  const g = (f) => fs.readFileSync(new URL(f, dir), 'utf8').match(/introGruss: "([^"]+)"/)[1];
  assert.equal(g('de.js'), 'Hallo, Chef!'); assert.equal(g('en.js'), 'Hello, boss!'); assert.equal(g('tr.js'), 'Merhaba, şef!');
  assert.doesNotMatch(g('de.js'), /Selam/);
});
