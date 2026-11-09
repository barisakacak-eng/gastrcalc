// Prüfungsausschuss Lauf 3 (09.11.2026): jeder Fund erst als Test nachgestellt, dann behoben.
import test from "node:test";
import assert from "node:assert/strict";
import { schwund } from "../js/export_steuer.js";
import { paketUnter } from "../js/ordner_text.js";
import { fmtEuro } from "../js/util.js";

// P3 A2: Karte im Steuer-Ordner nannte die ungerundete Summe (75,43 €), Vorschau und CSV die Summe der gedruckten Zeilen (75,40 €)
test("P3 A2: Müll-Zeile im Steuer-Ordner = Summe der gedruckten Zeilen", () => {
  const stand = { gerichte: [], artikel: [], schwund: [1, 2, 3].map((i) => ({ id: "s" + i, datum: "2026-12-0" + i, art: "eimer", menge: 1, einheit: "Stk", wert: 0.334, ref: { name: "Brot" } })) };
  const s = schwund(stand, { von: "2026-12-01", bis: "2026-12-31" });
  assert.equal(s.summeMuell, 0.99);
  const zeile = paketUnter("schwund", { schwund: s });
  assert.ok(zeile.includes(fmtEuro(0.99, { dezimal: 2 })), zeile);
});

// P3 A1: Beleg mit Brutto (3,66 €) kleiner als Netto (936,33 €) stand ungewarnt im Buchhalter-Ordner (Lesefehler im Beleg, Prüfdaten)
test("P3 A1: Brutto kleiner als Netto → Hinweis „prüfen“, auch ohne erkannten Steuersatz", async () => {
  const { belege } = await import("../js/export_steuer.js");
  const stand = { lieferungen: [{ id: "l1", datum: "2026-12-22", typ: "rechnung", basis: "netto", summeNetto: 936.33, summeBrutto: 3.66, pfand: 0, zeilen: [{ name: "Dönerspieß", menge: 3, netto: 936.33 }] }], kostenbelege: [] };
  const b = belege(stand, { von: "2026-12-01", bis: "2026-12-31" });
  assert.equal(b.zeilen[0].hinweis, "pruefen");
  const gut = { ...stand, lieferungen: [{ ...stand.lieferungen[0], summeBrutto: 1001.87 }] };
  assert.equal(belege(gut, { von: "2026-12-01", bis: "2026-12-31" }).zeilen[0].hinweis, "ohneSatz", "Brutto über Netto ohne Satz bleibt wie bisher");
});
