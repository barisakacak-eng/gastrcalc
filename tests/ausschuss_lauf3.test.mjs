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

// P5 A1: Umsatz auf einem eingelesenen Tag überschrieben – der Eintrag des anderen Handys (später erfasst) blieb gültig, Kachel zeigte den alten Wert
test("P5 A1: Korrektur ersetzt den Wert, den der Chef gesehen hat – auch vom anderen Handy", async () => {
  const { tagesnotizSetzen, umsatzEintrag } = await import("../js/engine.js");
  const stand = { tagesnotizen: [{ id: "alt", datum: "2027-01-01", umsatz: 592.5, erfasst: "2099-01-01T21:45:00.000Z", geraet: "anderes", storniert: false }] };
  tagesnotizSetzen(stand, "2027-01-01", 640, { geraet: "dieses" });
  assert.equal(umsatzEintrag(stand, "2027-01-01").umsatz, 640);
  assert.equal(stand.tagesnotizen.find((x) => x.id === "alt").storniert, true, "alter Eintrag bleibt sichtbar als ersetzt");
});

// P2 A1: ohne „Gerichte am Tag“ wurden Miete und Lohn auf 1 Portion je Gericht und Tag verteilt → „Bleibt dir −44,78 €“ beim Döner
test("P2 A1: Mengen ohne Angabe kommen aus dem Umsatz (≈), nicht aus 1 je Gericht und Tag", async () => {
  const { mengenJeMonat, bestellungenAusUmsatz } = await import("../js/engine.js");
  const stand = { betrieb: { tageProWoche: 7 }, verkauf: {}, gerichte: [{ id: "a", preis: 7.5, zutaten: [] }, { id: "b", preis: 7.5, zutaten: [] }],
    tagesnotizen: Array.from({ length: 14 }, (_, i) => ({ id: "t" + i, datum: `2026-12-${String(i + 18).padStart(2, "0")}`, umsatz: 1300, storniert: false })) };
  assert.equal(bestellungenAusUmsatz(stand), 173); // 1.300 € ÷ 7,50 €
  const m = mengenJeMonat(stand, { ausUmsatz: true });
  assert.ok(m.mengen.a > 2500 && m.mengen.a < 2700, String(m.mengen.a)); // ≈ 86,5 je Tag × 30,3 Tage
  assert.equal(m.geschaetzt, true, "bleibt Schätzung");
  assert.equal(bestellungenAusUmsatz({ gerichte: [], tagesnotizen: [] }), 0);
});
