import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as T from "../js/screens/zeki_takt.js";
import { ZEKI_SAETZE } from "../js/data/zeki_saetze.js";

const q = (p) => fs.readFileSync(new URL("../" + p, import.meta.url), "utf8");

test("Satz → Ereignis: Warnung kopfschütteln, Tag geschafft jubeln, Zwinkern nur beim Lob, „keine“ bleibt stehen", () => {
  const f = T.zekiEreignisFuerMoment;
  assert.equal(f({ ausloeser: "kuehl_abweichung", bewegung: "kopfschuetteln" }), "warnung");
  assert.equal(f({ ausloeser: "muell_hoch", bewegung: "hand" }), "warnung", "Warnung bleibt Warnung, egal welche Geste im Satz steht");
  assert.equal(f({ ausloeser: "muell_hoch", bewegung: "keine" }), null);
  assert.equal(f({ ausloeser: "ziel_erreicht", bewegung: "grinsen" }), "tagGeschafft");
  assert.equal(f({ ausloeser: "tag_abgeschlossen", bewegung: "zwinkern" }), "lob");
  assert.equal(f({ ausloeser: "tag_abgeschlossen", bewegung: "nicken" }), "erfolg");
  assert.equal(f({ ausloeser: "kuehl_offen", bewegung: "zwinkern" }), null, "zwinkern ist Lob, keine Frage");
  assert.equal(f({ ausloeser: "putzen_offen", bewegung: "nicken" }), "erfolg");
  assert.equal(f({ ausloeser: "putzen_offen", bewegung: "hand" }), null);
  assert.equal(f(null), null);
  // jeder echte Satz ergibt ein bekanntes Ereignis oder null – nie ein Grinsen bei Warnung
  for (const s of ZEKI_SAETZE) { const e = f(s); assert.ok(e === null || ["warnung", "tagGeschafft", "lob", "erfolg"].includes(e), s.id); if (T.ERNST_AUSLOESER.includes(s.ausloeser)) assert.ok(e === null || e === "warnung", s.id); }
});
test("Erfolg und Tag geschafft: speichernde Knöpfe merken ein Ereignis vor, es gilt 1,5 s und genau einmal", () => {
  T.zekiVorgemerktes(null, 0); // leeren
  T.zekiAktionMerken("pp-haken", 1000); assert.equal(T.zekiVorgemerktes(null, 1500), null, "ohne Bühne bleibt es beim Vormerken, wird aber verbraucht");
  T.zekiAktionMerken("abschluss-fertig", 2000); T.zekiAktionMerken("muell-tipp", 2100); // zweiter Knopf zählt nicht und überschreibt nichts
  assert.equal(T.zekiVorgemerktes(null, 2000 + T.VORMERKEN_MS + 1), null, "abgelaufen");
  const log = []; const root = { querySelector: () => null };
  T.zekiVormerken("erfolg", 5000); assert.equal(T.zekiVorgemerktes(root, 5100), null);
  assert.ok(T.ERFOLG_AKTIONEN.test("pp-haken") && T.ERFOLG_AKTIONEN.test("station-speichern") && !T.ERFOLG_AKTIONEN.test("nav") && !T.ERFOLG_AKTIONEN.test("hilfe-auf"));
  assert.ok(T.TAG_AKTIONEN.test("abschluss-fertig") && !T.TAG_AKTIONEN.test("abschluss"));
});
// kleine Attrappe einer Bühne: .gc-buehne .gc-figur[data-zeki-buehne] mit Bild
function bauen(schluessel, { reduziert = false } = {}) {
  const bild = { style: {}, getAttribute: (n) => (n === "width" ? "116" : null), setAttribute(n, v) { this[n] = v; } };
  const doc = { defaultView: { matchMedia: () => ({ matches: reduziert }), Image: class { set src(v) { setTimeout(() => this.onload?.(), 0); } } } };
  const attr = { "data-zeki-buehne": schluessel };
  const fig = { isConnected: true, ownerDocument: doc, getAttribute: (n) => attr[n] ?? null, setAttribute: (n, v) => { attr[n] = v; }, appendChild() {}, querySelector: (s) => (s === "img.gc-zeki" ? bild : null) };
  return { fig, bild, attr, root: { querySelector: (s) => (s === ".gc-buehne .gc-figur[data-zeki-buehne]" ? fig : null) } };
}
test("Bewegung reduzieren: weder Ankommen noch Ereignis noch Leerlauf – nichts wird vorgeladen, nichts versteckt", () => {
  const g = bauen("start", { reduziert: true });
  assert.equal(T.zekiAnkommen(g.root), null); assert.equal(T.zekiBewegt(g.root, "erfolg"), null); assert.notEqual(g.bild.style.visibility, "hidden");
});
test("Warnung: das ruhende Bild wechselt zur ernsten Haltung (warten + Miene warnung), nie ein Grinsen", () => {
  const g = bauen("kuehlgeraete"); assert.equal(T.zekiErnst(g.root), true);
  assert.equal(g.attr["data-zeki-buehne"], "blatt-sperre"); assert.match(g.bild.src, /zeki-buehne\/blatt-sperre\.webp/);
  assert.equal(T.zekiErnst({ querySelector: () => null }), false);
});
test("Quelltext: kein Blinzeln im Vektor, kein setInterval-Takt mehr, keine Sprechblase in der Stimme", () => {
  const s = q("js/screens/zeki_takt.js");
  assert.doesNotMatch(s, /setInterval|zeki--blinzeln|zeki--spielt|zekiNaechsteBewegung|gastrocash-brand/);
  assert.match(s, /zekiEreignis/); assert.match(s, /folgeVorladen/);
  assert.match(q("js/bedienung/zeki.js"), /zekiAnkommen/);
});
