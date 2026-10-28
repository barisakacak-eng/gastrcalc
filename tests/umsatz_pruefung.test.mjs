// Umsatz-Rückfrage (Masterauftrag 0.1): Median der letzten 14 Tage, erst ab 5 Tagen, unter 10 % oder über 3× (Setzung).
import { test } from "node:test";
import assert from "node:assert/strict";
import { umsatzMedian, umsatzRueckfrage } from "../js/umsatz_pruefung.js";

const stand = (werte) => ({ tagesnotizen: werte.map(([datum, umsatz]) => ({ datum, umsatz, erfasst: datum + "T22:00:00Z", storniert: false })) });

test("zu wenig Verlauf: keine Rückfrage", () => {
  const s = stand([["2026-10-24", 800], ["2026-10-25", 900], ["2026-10-26", 700], ["2026-10-27", 850]]);
  assert.equal(umsatzMedian(s, "2026-10-28"), null);
  assert.equal(umsatzRueckfrage(s, "2026-10-28", 8), null);
});

test("Median und Grenzen", () => {
  const s = stand([["2026-10-21", 600], ["2026-10-22", 800], ["2026-10-23", 1000], ["2026-10-24", 700], ["2026-10-25", 900], ["2026-10-27", 750]]);
  assert.equal(umsatzMedian(s, "2026-10-28"), 775); // 600 700 750 800 900 1000 → (750 + 800) / 2
  assert.deepEqual(umsatzRueckfrage(s, "2026-10-28", 77), { art: "niedrig", median: 775 }); // unter 77,50
  assert.equal(umsatzRueckfrage(s, "2026-10-28", 78), null);
  assert.equal(umsatzRueckfrage(s, "2026-10-28", 2325), null); // genau 3×
  assert.deepEqual(umsatzRueckfrage(s, "2026-10-28", 7750), { art: "hoch", median: 775 });
  assert.equal(umsatzRueckfrage(s, "2026-10-28", 0), null);
});

test("nur die 14 Tage davor zählen, der Tag selbst nicht", () => {
  const s = stand([["2026-10-01", 50000], ["2026-10-20", 800], ["2026-10-21", 800], ["2026-10-22", 800], ["2026-10-23", 800], ["2026-10-24", 800], ["2026-10-28", 90000]]);
  assert.equal(umsatzMedian(s, "2026-10-28"), 800);
});

test("≈ über den gemeinsamen Helfer", async () => {
  const { fmtEuroGeschaetzt, fmtEuro } = await import("../js/util.js");
  assert.equal(fmtEuroGeschaetzt(487, true), "≈ " + fmtEuro(487));
  assert.equal(fmtEuroGeschaetzt(487, false), fmtEuro(487));
  assert.equal(fmtEuroGeschaetzt(null, true), "–");
});

test("Laden-Eingabe fragt bei Ausreißer einmal nach", async () => {
  const { umsatzHeutePruefen } = await import("../js/laden_zahlen.js");
  const s = stand([["2026-10-21", 600], ["2026-10-22", 800], ["2026-10-23", 1000], ["2026-10-24", 700], ["2026-10-25", 900], ["2026-10-27", 750]]);
  assert.equal(umsatzHeutePruefen("80", { stand: s, datum: "2026-10-28" }).status, "ok"); // 80 ≥ 77,50
  assert.equal(umsatzHeutePruefen("7", { stand: s, datum: "2026-10-28" }).status, "rueckfrage");
  assert.equal(umsatzHeutePruefen("7", { stand: s, datum: "2026-10-28", bestaetigt: true }).status, "ok");
  assert.equal(umsatzHeutePruefen("8000", { stand: s, datum: "2026-10-28" }).status, "rueckfrage");
  assert.equal(umsatzHeutePruefen("8000").status, "ok"); // ohne Verlauf nur die alte Grenze
});
