// Grenzen und Rundung: genau auf der Grenze, einen Cent darüber, einen Cent darunter.
// Diese Tests gehören zu den Mutationen in tools/mutation.mjs (M03, M04, M08, M09, M14, M18, M20).
import { test } from "node:test";
import assert from "node:assert/strict";
import { monatsZiel, umsatzAusEingabe, umsatzAnzeigeWert } from "../js/zaehler.js";
import { umsatzRueckfrage } from "../js/umsatz_pruefung.js";
import { liquiditaet, nachfragen, NACHFRAGE_TAGE } from "../js/liquiditaet.js";
import { steuerTopf } from "../js/steuertopf.js";
import { belegZeilenVorbereiten, preisSprungAuffaellig } from "../js/lieferung.js";
import { belegZerlegen } from "../js/beleg.js";

const tag = (datum, umsatz) => ({ id: datum, datum, umsatz, erfasst: datum + "T20:00:00Z", storniert: false });

test("Monatsziel: Umsatz genau am Nullpunkt heißt „über null“, ein Cent darunter „bis null“", () => {
  const z = { last: { gesamt: 1000 }, quoteEff: 0, steuer: 0, tage: [{ datum: "2026-11-02" }] };
  const mit = (u) => monatsZiel({ verkauf: { zielgewinn: 10 }, tagesnotizen: [tag("2026-11-02", u)] }, z, "2026-11-02");
  assert.equal(mit(1000).nullpunkt, 1000);
  assert.equal(mit(1000).stufe, "bisZiel", "genau erreicht: nicht mehr „bis null“");
  assert.equal(mit(999.99).stufe, "bisNull");
  assert.equal(mit(1000).fehltNull ?? 0, 0);
});

test("Umsatz netto getippt: wird auf den Cent als Brutto gespeichert", () => {
  assert.equal(umsatzAusEingabe(100.01, "netto", 0.07), 107.01); // 107,0107 → 107,01
  assert.equal(umsatzAusEingabe(33.33, "netto", 0.19), 39.66);   // 39,6627 → 39,66
  assert.equal(umsatzAusEingabe(107.01, "brutto", 0.07), 107.01);
  assert.equal(umsatzAnzeigeWert(107.01, "netto", 0.07), 100.01);
});

test("Steuer-Topf: Summe der Tageszeilen = Monatszahl, auch wenn die Summe auf einem halben Cent liegt", () => {
  // Tag 1: 106,00 € → USt 6,9345… (gerundet 6,93). Tag 2 so gewählt, dass die Summe bei 96,005 € liegt (gerundet 96,01).
  const stand = { betrieb: { steuerSatz: 0.07 }, gerichte: [], lieferungen: [], kostenbelege: [], tagesnotizen: [tag("2026-11-02", 106), tag("2026-11-03", 1361.5049999999999)] };
  const t = steuerTopf(stand, "2026-11");
  assert.equal(t.ust, 96.01);
  assert.deepEqual(t.tage.map((x) => x.ust), [6.93, 89.08]);
  assert.equal(Math.round(t.tage.reduce((s, x) => s + x.ust, 0) * 100) / 100, t.ust);
});

test("Umsatz-Rückfrage: genau 10 % vom Üblichen fragt nicht, ein Cent darunter fragt", () => {
  const s = { tagesnotizen: ["2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25"].map((d) => ({ datum: d, umsatz: 800, erfasst: d + "T22:00:00Z", storniert: false })) };
  assert.equal(umsatzRueckfrage(s, "2026-10-28", 80), null);
  assert.deepEqual(umsatzRueckfrage(s, "2026-10-28", 79.99), { art: "niedrig", median: 800 });
  assert.equal(umsatzRueckfrage(s, "2026-10-28", 2400), null, "genau das Dreifache fragt nicht");
  assert.equal(umsatzRueckfrage(s, "2026-10-28", 2400.01)?.art, "hoch");
});

test("Preissprung: genau 10 % fragt nicht (rauf wie runter), 10,1 % fragt", () => {
  const art = { id: "a1", name: "Tomaten", einheit: "kg", preis: 10, preisBasis: "netto", packung: { menge: 1, einheit: "kg" }, benutzt: true };
  const frage = (p) => { const z = { ...belegZerlegen(`4001235 Tomaten rund KL1 KT 1 kg 1 ${p} ${p} B`, ["Tomaten"]).zeilen[0], bekannt: "Tomaten" };
    return belegZeilenVorbereiten({ artikel: [art] }, { zeilen: [z], basis: "netto" })[0].frage?.art ?? null; };
  assert.equal(frage("11,00"), null); assert.equal(frage("9,00"), null);
  assert.equal(frage("11,01"), "preis"); assert.equal(frage("8,99"), "preis");
  assert.equal(preisSprungAuffaellig(0.1), false); assert.equal(preisSprungAuffaellig(-0.1), false); assert.equal(preisSprungAuffaellig(0.1001), true);
});

test("Liquidität: tiefster Stand genau 0 € reicht, ein Cent darunter reicht nicht", () => {
  const mit = (b) => liquiditaet({ start: 100, ab: "2027-01-01", wochen: 1, posten: [{ betrag: -b, datum: "2027-01-04" }] });
  assert.equal(mit(100).reicht, true); assert.equal(mit(100).fehlt, 0); assert.equal(mit(100).tiefster.betrag, 0);
  assert.equal(mit(100.01).reicht, false); assert.equal(mit(100.01).fehlt, 1);
});

test("Liquidität: Nachfrage genau am 7. Tag, am 6. noch nicht", () => {
  assert.equal(NACHFRAGE_TAGE, 7);
  assert.equal(nachfragen({ betrag: 500, datum: "2026-11-01" }, "2026-11-07"), false);
  assert.equal(nachfragen({ betrag: 500, datum: "2026-11-01" }, "2026-11-08"), true);
  assert.equal(nachfragen({ betrag: 500, datum: "2026-11-01" }, "2026-11-09"), true);
});
