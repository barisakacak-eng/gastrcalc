// Euro-Zähler (Vertrag docs/vertraege.md Abschnitt 1): nur Gemessenes zählt, nichts wird erfunden.
import test from "node:test";
import assert from "node:assert/strict";
import { leererBetrieb } from "../js/store.js";
import { nutzenStand, messbeginn, postenMuell, AUSGANGSWERT_TAGE } from "../js/nutzen.js";

const tag = (basis, n) => { const [j, m, d] = basis.split("-").map(Number); const x = new Date(j, m - 1, d + n); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
const AB = "2026-10-01";
let n = 0;
const muell = (stand, datum, wert, extra = {}) => stand.schwund.push({ id: "m" + (++n), datum, art: "rohware", ref: { typ: "artikel", name: "Tomaten" }, menge: 1, einheit: "kg", wert, erfasst: datum + "T20:00:00.000Z", ...extra });
function laden() { const b = leererBetrieb(); b.betrieb = { name: "Test", format: "imbiss" }; return b; }

test("leerer Laden: kein Messbeginn, leer, Summe 0, vier Posten mit ehrlichem Stand", () => {
  const s = laden(); const z = nutzenStand(s, "2026-10-23");
  assert.equal(z.ab, null); assert.equal(z.leer, true); assert.equal(z.summe, 0); assert.equal(z.tage, 0);
  assert.deepEqual(z.posten.map((p) => p.art), ["muell", "preis", "lager", "papier"]);
  for (const p of z.posten) { assert.equal(p.euro, null); assert.equal(p.gemessen, false); assert.ok(["fehlt", "laeuft"].includes(p.stand)); }
});

test("Messbeginn ist der früheste Müll-Eintrag oder Tagesabschluss; stornierte zählen nicht", () => {
  const s = laden(); muell(s, "2026-10-05", 2); muell(s, "2026-10-02", 1, { storniert: true });
  assert.equal(messbeginn(s), "2026-10-05");
  s.abschluesse.push({ id: "a1", datum: "2026-10-03" }); assert.equal(messbeginn(s), "2026-10-03");
});

test("Ausgangswert läuft: in den ersten 13 Tagen kein Euro, Quelle nennt den Tag", () => {
  const s = laden(); muell(s, AB, 5);
  const p = postenMuell(s, tag(AB, 6), AB);
  assert.equal(p.euro, null); assert.equal(p.gemessen, false); assert.equal(p.stand, "laeuft"); assert.match(p.quelle, /Tag 7 von 14/);
  assert.equal(nutzenStand(s, tag(AB, 6)).leer, true);
});

test("nach 14 Tagen ohne Vergleichswoche: Ausgangswert bekannt, aber noch nicht gemessen", () => {
  const s = laden(); for (let i = 0; i < 14; i++) muell(s, tag(AB, i), 10); // 140 € in 14 Tagen = 70 € je Woche
  const p = postenMuell(s, tag(AB, 13), AB);
  assert.equal(p.gemessen, false); assert.equal(p.stand, "laeuft"); assert.match(p.quelle, /70 € je Woche/);
});

test("gemessen: Ausgangswert 70 € je Woche, letzte Woche 30 € → Nutzen 40 €, Summe 40 €", () => {
  const s = laden(); for (let i = 0; i < 14; i++) muell(s, tag(AB, i), 10);
  for (let i = 14; i < 21; i++) muell(s, tag(AB, i), i < 19 ? 5 : 2.5); // 5×5 + 2×2,5 = 30 € in der dritten Woche
  const H = tag(AB, 20); const z = nutzenStand(s, H); const p = z.posten.find((x) => x.art === "muell");
  assert.equal(p.gemessen, true); assert.equal(p.stand, "gemessen"); assert.equal(p.euro, 40); assert.equal(z.summe, 40); assert.equal(z.leer, false); assert.equal(z.tage, 21);
});

test("mehr Müll als am Anfang: Nutzen nie negativ, bleibt 0 und gemessen", () => {
  const s = laden(); for (let i = 0; i < 14; i++) muell(s, tag(AB, i), 2); for (let i = 14; i < 21; i++) muell(s, tag(AB, i), 9);
  const p = postenMuell(s, tag(AB, 20), AB); assert.equal(p.euro, 0); assert.equal(p.gemessen, true);
});

test("Vergleichswoche ohne Einträge: nicht gemessen (keine Erfassung ist kein Erfolg)", () => {
  const s = laden(); for (let i = 0; i < 14; i++) muell(s, tag(AB, i), 10);
  const p = postenMuell(s, tag(AB, 30), AB); assert.equal(p.gemessen, false); assert.equal(p.euro, null);
});

test("unbewertete Einträge (wert null) zählen als Erfassung, aber nicht in Euro", () => {
  const s = laden(); for (let i = 0; i < 14; i++) muell(s, tag(AB, i), 7); for (let i = 14; i < 21; i++) muell(s, tag(AB, i), null);
  const p = postenMuell(s, tag(AB, 20), AB); assert.equal(p.gemessen, true); assert.equal(p.euro, 49);
});

test("Papierkram: ohne Vorher-Schätzung fehlt, mit Schätzung ≈-Posten ohne Einfluss auf die Summe", () => {
  const s = laden(); assert.equal(nutzenStand(s, "2026-10-23").posten.find((p) => p.art === "papier").stand, "fehlt");
  s.betrieb.nutzen = { papierMinutenVorher: 120, stundensatz: 15 };
  const z = nutzenStand(s, "2026-10-23"); const p = z.posten.find((x) => x.art === "papier");
  assert.equal(p.euro, 30); assert.equal(p.gemessen, false); assert.equal(p.stand, "geschaetzt"); assert.equal(z.summe, 0); assert.equal(z.geschaetzt, 30);
});

test("Lager: unter zwei fertigen Inventuren fehlt; Preis-Posten ehrlich „fehlt“", () => {
  const s = laden(); const z = nutzenStand(s, "2026-10-23");
  assert.equal(z.posten.find((p) => p.art === "lager").stand, "fehlt");
  assert.equal(z.posten.find((p) => p.art === "preis").stand, "fehlt");
});

test("Konstante: Ausgangswert sind 14 Tage (Baris 21.10.2026)", () => assert.equal(AUSGANGSWERT_TAGE, 14));
