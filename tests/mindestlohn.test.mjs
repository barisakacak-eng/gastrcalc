// Mindestlohn 2027 (Masterauftrag „Gehirn“ 1.1, 28.10.2026): Werte nach Datum, eigener Lohn als Richtwert, Vorschau mit Goldwerten.
// Goldwerte von Hand: Arbeitgeberanteil angestellt 23,84 % (21,15 % + 2,69 %), Minijob 31,17 % (js/data/lohnkosten.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mindestlohnAm, naechsteErhoehung } from "../js/data/mindestlohn.js";
import { eigenerLohnRichtwert, eigenerLohnJeMonat, monatsLast } from "../js/engine.js";
import { mindestlohnVorschau, mindestlohnKarteZeigen } from "../js/mindestlohn.js";
import { leererBetrieb } from "../js/store.js";

const nah = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);
const tag = (d, eintraege) => ({ datum: d, eintraege, erfasst: d + "T20:00:00Z" });

test("Mindestlohn und Minijob-Grenze nach Datum", () => {
  assert.deepEqual([mindestlohnAm("2026-12-31").satz, mindestlohnAm("2026-12-31").minijob], [13.90, 603]);
  assert.deepEqual([mindestlohnAm("2027-01-01").satz, mindestlohnAm("2027-01-01").minijob], [14.60, 633]);
  assert.equal(mindestlohnAm("2025-06-01").satz, 13.90); // davor: Wert 2026
  assert.equal(naechsteErhoehung("2026-10-28").ab, "2027-01-01");
  assert.equal(naechsteErhoehung("2027-01-01"), null);
  assert.equal(Math.ceil(14.60 * 130 / 3), 633); // § 8 Abs. 1a SGB IV
});

test("eigener Lohn: Richtwert folgt dem Mindestlohn (13,90 × 173 → 2.400; 14,60 × 173 → 2.550)", () => {
  assert.equal(eigenerLohnRichtwert("2026-10-28"), 2400);
  assert.equal(eigenerLohnRichtwert("2027-01-01"), 2550);
  const s = leererBetrieb();
  assert.deepEqual(eigenerLohnJeMonat(s.team, "2026-12-31"), { betrag: 2400, status: "geschaetzt" });
  assert.deepEqual(eigenerLohnJeMonat(s.team, "2027-01-02"), { betrag: 2550, status: "geschaetzt" });
  assert.equal(monatsLast(s, "2027-01-02").eigen.betrag - monatsLast(s, "2026-12-31").eigen.betrag, 150);
  s.team.eigenerLohn = 3000; s.team.eigenerLohnStatus = "eigen";
  assert.equal(eigenerLohnJeMonat(s.team, "2027-01-02").betrag, 3000); // eigener Wert bleibt
});

test("Vorschau mit Stundenzettel: Goldwert", () => {
  const s = leererBetrieb();
  s.teamTage = [];
  // 20 Tage in den letzten 28 Tagen: Ali 8 h zu 13,90 € (angestellt), Sema 2 h zu 13,90 € (Minijob), Kemal 6 h zu 15,00 €
  for (let i = 0; i < 20; i++) {
    const d = new Date(Date.UTC(2026, 9, 28 - i)).toISOString().slice(0, 10);
    s.teamTage.push(tag(d, [{ person: "a", name: "Ali", stunden: 8, satz: 13.9, art: "angestellt" }, { person: "s", name: "Sema", stunden: 2, satz: 13.9, art: "minijob" }, { person: "k", name: "Kemal", stunden: 6, satz: 15, art: "angestellt" }]));
  }
  const v = mindestlohnVorschau(s, "2026-10-28");
  assert.equal(v.ab, "2027-01-01"); assert.equal(v.grundlage, "stunden"); assert.equal(v.geschaetzt, true);
  // Ali: 160 h ÷ 28 × 30,4 = 173,714 h × 0,70 € × 1,2384 = 150,59 €
  nah(v.personen.find((p) => p.name === "Ali").mehrMonat, 150.59);
  // Sema: 40 h ÷ 28 × 30,4 = 43,429 h × 0,70 € × 1,3117 = 39,88 €
  nah(v.personen.find((p) => p.name === "Sema").mehrMonat, 39.88);
  // Kemal verdient schon mehr als 14,60 € → 0 €
  assert.equal(v.personen.find((p) => p.name === "Kemal").mehrMonat, 0);
  nah(v.mehrMonat, 190.47);
  // Umsatz dafür: 190,47 ÷ (1 − 0,32) × 1,07 = 299,71 € (Richtwert Ware 32 %, Standard 7 %)
  nah(v.umsatzMehrMonat, 299.71);
});

test("Vorschau nur mit Teamgröße: alle zum Mindestlohn angenommen (Obergrenze)", () => {
  const s = leererBetrieb(); s.team.personen = 2; s.team.stundenProPerson = 160;
  const v = mindestlohnVorschau(s, "2026-11-15");
  // 320 h × 0,70 € × 1,2384 = 277,40 €; Umsatz 277,40 ÷ 0,68 × 1,07 = 436,50 €
  assert.equal(v.grundlage, "team"); nah(v.mehrMonat, 277.40); nah(v.umsatzMehrMonat, 436.50);
});

test("ohne Team keine Wirkung; Karte nur im Zeitfenster", () => {
  const s = leererBetrieb();
  assert.equal(mindestlohnVorschau(s, "2026-10-28").mehrMonat, 0);
  assert.equal(mindestlohnKarteZeigen(s, "2026-10-28"), null);
  s.team.personen = 1; s.team.stundenProPerson = 100;
  assert.equal(mindestlohnKarteZeigen(s, "2026-09-01"), null); // mehr als 92 Tage vorher
  assert.ok(mindestlohnKarteZeigen(s, "2026-10-28")); // 65 Tage vorher
  assert.equal(mindestlohnKarteZeigen(s, "2027-01-15").seit, true); // im Januar: „seit Januar …“
  assert.equal(mindestlohnKarteZeigen(s, "2027-03-01"), null);
  assert.equal(mindestlohnVorschau(s, "2027-02-01"), null); // keine weitere Erhöhung bekannt
});
