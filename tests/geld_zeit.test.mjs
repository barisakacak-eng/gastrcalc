// Lauf 6, Etappe 4: js/geld.js (Cent, eine Rundung) und js/zeit.js (Tage in Europe/Berlin, Geschäftstag bis 04:00).
// Läuft in TZ=UTC und TZ=Europe/Berlin mit demselben Ergebnis – die Zeitzone des Rechners darf nichts ändern.
import test from "node:test"; import assert from "node:assert/strict";
import { cent, euro, rund2, summe, aufteilen, verteilen, nettoVonBrutto, mwst } from "../js/geld.js";
import { berlin, isoTag, geschaeftstag, plusTage, tageZwischen, wochentag, gueltigerTag, monatsLetzter, plusMonate } from "../js/zeit.js";

// kleiner fester Zufall (mulberry32), damit der Test jedes Mal dieselben 10.000 Fälle rechnet
function zufall(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

test("Cent: eine Rundung, halbe Cent nach oben, ohne Rechenrest", () => {
  assert.equal(cent(1.005), 101); assert.equal(cent(2.675), 268); assert.equal(cent(0.1 + 0.2), 30); assert.equal(cent(1234.565), 123457);
  assert.equal(cent(-1.005), -101); assert.equal(cent("abc"), 0); assert.equal(cent(1e7), 1000000000);
  assert.equal(rund2(107.01 / 1.07), 100.01); assert.equal(euro(1235), 12.35);
  assert.equal(summe(Array(1000).fill(0.1)), 100); assert.equal(summe(Array(31).fill(0.1)), 3.1); // vorher 99,9999999999986 und 3,1000000000000014
});
test("Umsatzsteuer-Sätze kommen aus dem Regelwerk", () => {
  assert.equal(mwst("voll", "2026-11-12"), 0.19); assert.equal(mwst("ermaessigt", "2026-11-12"), 0.07);
  assert.equal(nettoVonBrutto(119, 0.19), 100); assert.deepEqual(aufteilen(11900, 0.19), { netto: 10000, ust: 1900 });
  assert.deepEqual(aufteilen(999, 0.07), { netto: 934, ust: 65 }); // 9,99 € / 1,07 = 9,3364… → 9,34 €; Steuer ist der Rest
});
test("Zufall, 10.000 Fälle: Teile ergeben das Ganze; ust7 + ust19 = ust auf den Cent", () => {
  const r = zufall(20261112);
  for (let i = 0; i < 10000; i++) {
    const b7 = Math.floor(r() * 500000), b19 = Math.floor(r() * 500000);
    const a = aufteilen(b7, 0.07), b = aufteilen(b19, 0.19);
    assert.equal(a.netto + a.ust, b7); assert.equal(b.netto + b.ust, b19);
    const ust = a.ust + b.ust; assert.equal(ust, (b7 + b19) - (a.netto + b.netto)); assert.ok(a.ust >= 0 && b.ust >= 0);
    const n = 1 + Math.floor(r() * 6); const gewichte = Array.from({ length: n }, () => Math.floor(r() * 1000)); const betrag = Math.floor(r() * 1000000);
    const teile = verteilen(betrag, gewichte); const gs = gewichte.reduce((x, y) => x + y, 0);
    assert.equal(teile.reduce((x, y) => x + y, 0), gs ? betrag : 0); assert.ok(teile.every((x) => Number.isInteger(x) && x >= 0));
    const eur = Math.floor(r() * 100000000) / 100; assert.equal(cent(euro(cent(eur))), cent(eur)); assert.equal(cent(eur), Math.round(eur * 100 + 1e-7));
  }
});
test("Tage rechnen: plusTage, tageZwischen, wochentag – auch über Zeitumstellung, Schaltjahr, Jahreswechsel", () => {
  assert.equal(plusTage("2026-10-24", 1), "2026-10-25"); assert.equal(plusTage("2026-10-25", 1), "2026-10-26"); // 25.10.2026 hat 25 Stunden
  assert.equal(plusTage("2026-03-28", 1), "2026-03-29"); assert.equal(plusTage("2026-03-29", 1), "2026-03-30"); // 29.03.2026 hat 23 Stunden
  assert.equal(plusTage("2028-02-28", 1), "2028-02-29"); assert.equal(plusTage("2027-02-28", 1), "2027-03-01"); assert.equal(plusTage("2026-12-31", 1), "2027-01-01"); assert.equal(plusTage("2027-01-01", -1), "2026-12-31");
  assert.equal(tageZwischen("2026-10-24", "2026-10-26"), 2); assert.equal(tageZwischen("2026-03-28", "2026-03-30"), 2); assert.equal(tageZwischen("2026-11-12", "2026-11-12"), 0); assert.equal(tageZwischen("2026-11-12", "2026-11-05"), -7);
  assert.equal(tageZwischen("2026-01-01", "2027-01-01"), 365); assert.equal(tageZwischen("2028-01-01", "2029-01-01"), 366);
  assert.equal(wochentag("2026-11-12"), 4); assert.equal(wochentag("2027-01-10"), 0); assert.equal(wochentag("2026-10-25"), 0); // Donnerstag, Sonntag, Sonntag
  assert.equal(gueltigerTag("2027-02-29"), false); assert.equal(gueltigerTag("2028-02-29"), true); assert.equal(gueltigerTag("2027-13-45"), false); assert.equal(gueltigerTag(5), false);
  assert.equal(monatsLetzter("2027-02"), "2027-02-28"); assert.equal(monatsLetzter("2028-02"), "2028-02-29"); assert.equal(plusMonate("2026-12", 1), "2027-01"); assert.equal(plusMonate("2027-01", -1), "2026-12");
});
test("Uhr 23:00 bis 04:30 Berliner Zeit: Kalendertag wechselt um 00:00, Geschäftstag um 04:00 – gleich in jeder Rechner-Zeitzone", () => {
  // Winterzeit: 12.11.2026 23:00 Berlin = 22:00 UTC. In 30-Minuten-Schritten bis 13.11. 04:30 Berlin.
  const start = Date.UTC(2026, 10, 12, 22, 0);
  const erwartet = []; for (let i = 0; i <= 11; i++) { const min = 23 * 60 + i * 30; const amFolgetag = min >= 24 * 60; const uhr = min % (24 * 60);
    erwartet.push([amFolgetag ? "2026-11-13" : "2026-11-12", amFolgetag && uhr >= 4 * 60 ? "2026-11-13" : "2026-11-12"]); }
  const ist = []; for (let i = 0; i <= 11; i++) { const d = new Date(start + i * 30 * 60000); ist.push([isoTag(d), geschaeftstag(d)]); }
  assert.deepEqual(ist, erwartet);
  // Sommerzeit: 15.07.2026 03:59 Berlin = 01:59 UTC → Geschäftstag noch 14.07.; 04:00 Berlin = 02:00 UTC → 15.07.
  assert.equal(geschaeftstag(new Date(Date.UTC(2026, 6, 15, 1, 59))), "2026-07-14"); assert.equal(geschaeftstag(new Date(Date.UTC(2026, 6, 15, 2, 0))), "2026-07-15");
  // Nacht der Zeitumstellung 25.10.2026: 02:30 gibt es zweimal (00:30 UTC Sommerzeit, 01:30 UTC Winterzeit) – beide gehören zum Geschäftstag 24.10.
  assert.equal(geschaeftstag(new Date(Date.UTC(2026, 9, 25, 0, 30))), "2026-10-24"); assert.equal(geschaeftstag(new Date(Date.UTC(2026, 9, 25, 1, 30))), "2026-10-24");
  assert.equal(geschaeftstag(new Date(Date.UTC(2026, 9, 25, 3, 0))), "2026-10-25"); // 04:00 Winterzeit
  // Silvester: 01.01.2027 00:30 Berlin → Kalendertag 01.01., Geschäftstag 31.12.
  const s = new Date(Date.UTC(2026, 11, 31, 23, 30)); assert.equal(isoTag(s), "2027-01-01"); assert.equal(geschaeftstag(s), "2026-12-31");
  assert.deepEqual(berlin(new Date(Date.UTC(2026, 10, 11, 1, 30))), { tag: "2026-11-11", stunde: 2, minute: 30 }); // Audit P1 C7: 01:30 UTC ist in Berlin 02:30 → Geschäftstag 10.11.
  assert.equal(geschaeftstag(new Date(Date.UTC(2026, 10, 11, 1, 30))), "2026-11-10");
});
