// P1 (20.10.2026): Eigenverbrauch im Jahr neben dem Pauschbetrag 2026 im Steuer-Ordner
import { test } from "node:test";
import assert from "node:assert/strict";
import { PAUSCHBETRAG_EIGEN_2026 } from "../js/engine.js";
import { schwund } from "../js/export_steuer.js";
test("Pauschbetrag 2026 Gaststätte warm und kalt = 4.001 € netto (3.173 + 828)", () => { assert.equal(PAUSCHBETRAG_EIGEN_2026, 3173 + 828); });
test("schwund() liefert Eigenverbrauch des Kalenderjahres bis Zeitraum-Ende", () => {
  const stand = { gerichte: [], artikel: [], schwund: [] };
  const s = schwund(stand, { von: "2026-03-01", bis: "2026-03-31" });
  assert.equal(s.jahr, "2026"); assert.equal(s.eigenJahr, 0);
});
