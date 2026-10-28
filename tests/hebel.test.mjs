// Euro-Hebel und Renner/Penner (Masterauftrag 1.3/1.5) – Goldwerte von Hand.
import { test } from "node:test";
import assert from "node:assert/strict";
import { hebelJeGericht, rennerPenner } from "../js/hebel.js";
const nah = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);
// Kleiner Stand ohne Rezept-Ware: Ware über waren-Feld nicht möglich, darum Zutat mit eigenem Artikelpreis.
const art = (name, preisKg) => ({ name, einheit: "g", preis: preisKg, preisBasis: "netto", packung: { menge: 1000, einheit: "g" }, gruppe: "fleisch" });
const ger = (id, name, preis, gramm, mengeTag) => ({ id, name, preis, klasse: "haupt", mengeTag, zutaten: [{ name: "Fleisch", menge: gramm, einheit: "g" }] });
function stand(gerichte) {
  return { betrieb: { tageProWoche: 6, monate: 12 }, team: { lohnkosten: 0, eigenerLohn: 0, eigenerLohnStatus: "eigen" }, kosten: [], verkauf: {},
    artikel: [art("Fleisch", 10)], gerichte };
}

test("1.3 Hebel: +0,30 € brutto bei 7 % und 40 am Tag, 6 Tage/Woche", () => {
  const r = hebelJeGericht(stand([ger("d", "Döner", 7.5, 100, 40)]));
  // Menge im Monat 40 × 6 × 52 / 12 = 1.040; 0,30 / 1,07 × 1.040 = 291,588785
  nah(r[0].mengeMonat, 1040); nah(r[0].euroMonat, 291.588785);
});

test("1.5 Renner/Penner: vier Felder nach Mittelwerten", () => {
  const s = stand([ger("a", "Stern", 9, 100, 50), ger("b", "Pferd", 6, 300, 50), ger("c", "Rätsel", 10, 100, 10), ger("d", "Hund", 5, 300, 10)]);
  // Ware 0,10 €/g × Gramm: a 1,00 · b 3,00 · c 1,00 · d 3,00 (Fleisch 10 €/kg)
  // DB netto: a 9/1,07−1 = 7,411215 · b 6/1,07−3 = 2,607477 · c 10/1,07−1 = 8,345794 · d 5/1,07−3 = 1,672897
  const r = rennerPenner(s);
  const feld = Object.fromEntries(r.gerichte.map((x) => [x.name, x.feld]));
  assert.deepEqual(feld, { Stern: "stern", Pferd: "pferd", "Rätsel": "raetsel", Hund: "hund" });
  nah(r.gerichte.find((x) => x.name === "Stern").db, 9 / 1.07 - 1);
});

test("1.5 ohne eingetragene Mengen: kein Urteil", () => {
  assert.equal(rennerPenner(stand([ger("a", "A", 9, 100, 0), ger("b", "B", 6, 300, 0)])).ohneMengen, true);
});
