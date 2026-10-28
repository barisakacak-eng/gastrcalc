// Preisrunden-Rechner (Masterauftrag 1.2): Goldwert von Hand.
import { test } from "node:test";
import assert from "node:assert/strict";
import { preisRunde } from "../js/preisrunde.js";
const nah = (a, b, eps = 1e-4) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);

test("Goldwert 7,11 € → 7,61 €, 7 % USt, Ware 32 % vom Netto: Schwelle 9,37 %", () => {
  // Netto alt 7,11 / 1,07 = 6,644860; Ware 0,32 × 6,644860 = 2,126355; DB alt 4,518505
  // Netto neu 7,61 / 1,07 = 7,112150; DB neu 4,985795; Schwelle 1 − 4,518505 / 4,985795 = 0,093725
  const ware = 0.32 * 7.11 / 1.07;
  const r = preisRunde({ preisAlt: 7.11, preisNeu: 7.61, mwst: 0.07, ware });
  nah(r.schwelle, 0.093725); assert.equal(Math.round(r.schwelle * 10000) / 100, 9.37);
  nah(r.mehrJeStueck, 0.5 / 1.07);
});

test("Preissenkung: wie viele Gäste mehr nötig; ungültige Eingaben", () => {
  const r = preisRunde({ preisAlt: 7.5, preisNeu: 7, mwst: 0.07, ware: 2.5 });
  // DB alt 7,009346 − 2,5 = 4,509346; DB neu 6,542056 − 2,5 = 4,042056; mehr nötig 4,509346 / 4,042056 − 1 = 0,115607
  assert.equal(r.schwelle, null); nah(r.mehrGaesteNoetig, 0.115607);
  assert.equal(preisRunde({ preisAlt: 0, preisNeu: 7 }), null);
  assert.equal(preisRunde({ preisAlt: 3, preisNeu: 2, ware: 2.5 }).schwelle, null); // neuer Preis deckt die Ware nicht
});
