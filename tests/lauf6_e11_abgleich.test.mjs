// Lauf 6, E11 (13.11.2026): Fehler im Zwei-Handys-Abgleich. Jeder Test ist eine echte Rundreise: Handy A und B schreiben eine Sicherung (exportDatei),
// das andere liest sie ein (importSicherung → einlesenSicher → speichern). Hilfen: tests/hilfe/abgleich_welt.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { st, eng, setzeUhr, plusMin, klon, stabil, leeresHandy, vollerLaden } from "./hilfe/abgleich_welt.mjs";
const putz = await import("../js/putzplan.js");

async function start(namen = ["A", "B"], { vorab = true } = {}) {
  setzeUhr("2027-01-15T08:00:00Z");
  const A0 = await leeresHandy("A0", "gerA"); await A0.an(); A0.w = vollerLaden(); A0.w.geraet = "gerA"; await A0.speichern({ stempel: false });
  const basis = await A0.sichern(); const h = {};
  for (const n of namen) { h[n] = await leeresHandy(n, "ger" + n); await h[n].einlesen(basis.blob); }
  if (vorab) for (const n of namen.slice(1)) { await les(h[namen[0]], h[n]); await les(h[n], h[namen[0]]); } // beide kennen sich schon (Alltag)
  return h;
}
async function les(x, y) { const s = await y.sichern(); const r = await x.einlesen(s.blob); return r.e.bericht; } // x liest die Sicherung von y
async function tu(h, fn) { plusMin(5); const w = await h.an(); fn(w.betriebe[0], w); await h.speichern(); }
const laden = async (h) => (await h.an()).betriebe[0];
// Inhalt ohne handy-eigene Merker (Zeitstempel, Abgleich-Zettel), Listen ohne Reihenfolge
function norm(b) {
  const x = klon(b); for (const k of ["geaendert", "abgleich", "stammZeit", "abgleichHinweis"]) delete x[k];
  const san = (v) => { if (Array.isArray(v)) { const a = v.map(san); if (a.length && a.every((e) => e && typeof e === "object")) a.sort((p, q) => (stabil(p) < stabil(q) ? -1 : 1)); return a; } if (v && typeof v === "object") { const o = {}; for (const k of Object.keys(v)) { if (v[k] === false && ["storniert", "entfernt", "archiviert"].includes(k)) continue; o[k] = san(v[k]); } return o; } return v; };
  return san(x);
}
const gleich = async (a, b, was) => { const x = norm(await laden(a)), y = norm(await laden(b)); assert.equal(stabil(x), stabil(y), was || "beide Handys gleich"); };
// Kreis, bis beide gleich sind (höchstens 4 Runden): gibt die Runden zurück
async function konvergiert(A, B) { for (let i = 1; i <= 4; i++) { await les(A, B); await les(B, A); if (stabil(norm(await laden(A))) === stabil(norm(await laden(B)))) return i; } return 99; }

// ---------- A2: Rücknahme eines Putz-Hakens kommt an ----------
test("A2: B nimmt einen Putz-Haken zurück, A liest B: auf A storniert, keine Kopie, 0 Konflikte – und der Rückweg ebenso", async () => {
  const { A, B } = await start();
  const id = (await laden(B)).putzlog.find((x) => !x.storniert).id;
  await tu(B, (b) => { const e = b.putzlog.find((x) => x.id === id); putz.zuruecknehmen(b, e.aufgabe, e.datum, { von: "p1" }); });
  assert.equal((await laden(B)).putzlog.find((x) => x.id === id).storniertVon, "p1", "Voraussetzung: storniertVon wird gesetzt");
  const r1 = await les(A, B); const a = await laden(A);
  assert.equal(r1.konflikte, 0, "kein HACCP-Konflikt");
  assert.deepEqual(a.putzlog.filter((x) => x.id === id || String(x.id).startsWith(id + "~")).map((x) => !!x.storniert), [true], "ein Eintrag, storniert, keine Kopie");
  assert.equal(a.putzlog.find((x) => x.id === id).storniertVon, "p1");
  const r2 = await les(B, A); assert.equal(r2.konflikte, 0, "Rückweg ohne Konflikt");
  await gleich(A, B);
  // umgekehrt: A nimmt einen anderen Haken zurück, B liest A
  const id2 = (await laden(A)).putzlog.find((x) => !x.storniert).id;
  await tu(A, (b) => { const e = b.putzlog.find((x) => x.id === id2); putz.zuruecknehmen(b, e.aufgabe, e.datum, { von: "p2" }); });
  const r3 = await les(B, A); assert.equal(r3.konflikte, 0);
  assert.equal((await laden(B)).putzlog.filter((x) => String(x.id).startsWith(id2)).length, 1);
  assert.equal((await laden(B)).putzlog.find((x) => x.id === id2).storniert, true);
  await les(A, B); await gleich(A, B);
});
test("A2: beide Handys nehmen denselben Haken zurück (verschiedene Zeit, verschiedene Person): beide landen beim gleichen Storno", async () => {
  const { A, B } = await start();
  const id = (await laden(B)).putzlog.find((x) => !x.storniert).id;
  await tu(A, (b) => { const e = b.putzlog.find((x) => x.id === id); putz.zuruecknehmen(b, e.aufgabe, e.datum, { von: "p1" }); });
  await tu(B, (b) => { const e = b.putzlog.find((x) => x.id === id); putz.zuruecknehmen(b, e.aufgabe, e.datum, { von: "p2" }); });
  const r1 = await les(A, B), r2 = await les(B, A); assert.equal(r1.konflikte + r2.konflikte, 0);
  await gleich(A, B);
});
