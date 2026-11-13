import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { INTRO_AN, INTRO_SCHLUESSEL, INTRO_AUFTRETEN_MS, INTRO_ZURUECK_MS, INTRO_GRUSS_AB_MS, introErlaubt, introGesehen, introMerken } from '../js/intro.js';
import { ZEKI_FOLGEN } from '../js/zeki_figur.js';

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
test('Dauer: auftreten (aus ablauf.json) plus Zurücktreten, Gruß mittendrin, kein Ausflug in andere Folgen',()=>{
  assert.equal(INTRO_AUFTRETEN_MS, ZEKI_FOLGEN.auftreten.dauerMs, 'dieselbe Zeit wie die Folge');
  assert.equal(INTRO_AUFTRETEN_MS + INTRO_ZURUECK_MS + 50 <= 3000, true, 'höchstens ≈ 3 s');
  assert.ok(INTRO_GRUSS_AB_MS > 0 && INTRO_GRUSS_AB_MS < INTRO_AUFTRETEN_MS, 'der Gruß steht, solange Zeki noch ankommt');
  assert.equal(ZEKI_FOLGEN.auftreten.beginntInRuhe, false); assert.equal(ZEKI_FOLGEN.auftreten.endetInRuhe, true);
  assert.ok(fs.existsSync(new URL('../assets/brand/zeki-klein/auftreten.webp', import.meta.url)));
  assert.ok(!fs.existsSync(new URL('../assets/brand/zeki/auftreten.webp', import.meta.url)), 'die alte Bildfolge ist weg');
});
test('Intro: Zeki tritt vor (Hülle über der Bühnen-Figur, keine Blase), „Hallo, Chef!“ in der Bühne, Tipp beendet sofort, danach nichts übrig',async()=>{
  const { introStarten } = await import('../js/intro.js');
  const q=fs.readFileSync(new URL('../js/intro.js', import.meta.url),'utf8').replace(/\/\/.*$/gm,'');
  assert.doesNotMatch(q,/blase/i); assert.match(q,/pointerdown/); assert.match(q,/zekiSpielen\(.*"auftreten"\)/);
  // Ohne Fenster oder ohne Bühne passiert nichts
  assert.equal(introStarten({ defaultView: null }), false);
  const doc={ defaultView:{ matchMedia:()=>({matches:false}), sessionStorage:null }, querySelector:()=>null };
  assert.equal(introStarten(doc,{speicher:null}), false, 'ohne Bühnen-Figur kein Auftritt');
  const reduziert={ defaultView:{ matchMedia:()=>({matches:true}) }, querySelector:()=>{ throw new Error('darf nicht gefragt werden'); } };
  assert.equal(introStarten(reduziert,{speicher:null}), false, 'Bewegung reduzieren: gar nicht');
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
