// Preisdrift in Euro (1.4) und Extras/Bündel (1.6) – Goldwerte von Hand (28.10.2026).
import { test } from "node:test";
import assert from "node:assert/strict";
import { preisDrift } from "../js/preisdrift.js";
import { extraRechnen, buendelRechnen } from "../js/extras.js";
const nah = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);
const art = (name, preisKg, hist) => ({ name, einheit: "g", preis: preisKg, preisBasis: "netto", packung: { menge: 1000, einheit: "g" }, gruppe: "fleisch",
  preisDatum: "2026-10-01", preisHistorie: hist || [] });
const ger = (id, name, preis, gramm, mengeTag, extra = {}) => ({ id, name, preis, klasse: "haupt", mengeTag, zutaten: [{ name: "Fleisch", menge: gramm, einheit: "g" }], ...extra });
const stand = (artikel, gerichte) => ({ betrieb: { tageProWoche: 6, monate: 12 }, team: { lohnkosten: 0, eigenerLohn: 0, eigenerLohnStatus: "eigen" }, kosten: [], verkauf: {}, artikel, gerichte });
const acht = [{ datum: "2026-10-01", preis: 8, menge: 1000, einheit: "g", basis: "netto" }];

test("1.4 Fleisch 8 → 10 €/kg, 100 g × 40 am Tag: +25 %, ≈ 208 € im Monat", () => {
  // Verbrauch 100 g × 40 × 6 × 52 / 12 = 104.000 g; Mehrpreis 0,002 €/g → 208 €
  const d = preisDrift(stand([art("Fleisch", 10, acht)], [ger("d", "Döner", 7.5, 100, 40)]), { datum: "2026-10-28" });
  assert.equal(d.zutaten.length, 1); nah(d.zutaten[0].prozent, 0.25); nah(d.zutaten[0].euroMonat, 208);
  assert.deepEqual(d.gerutscht, []);
});

test("1.4 gerutscht: Preis 1,05 € deckt 0,80 € Ware, aber nicht 1,00 €", () => {
  const d = preisDrift(stand([art("Fleisch", 10, acht)], [ger("d", "Döner", 1.05, 100, 40)]), { datum: "2026-10-28" });
  assert.equal(d.gerutscht.length, 1); assert.equal(d.gerutscht[0].id, "d"); assert.ok(d.gerutscht[0].zielBrutto > 1.05);
});

test("1.4 schweigt: älter als 3 Monate, unter 3 %, Richtpreis, kein Verlauf", () => {
  const alt = [{ datum: "2026-07-01", preis: 8, menge: 1000, einheit: "g", basis: "netto" }];
  const klein = [{ datum: "2026-10-01", preis: 9.8, menge: 1000, einheit: "g", basis: "netto" }];
  const rp = [{ datum: "2026-10-01", preis: 8, menge: 1000, einheit: "g", basis: "netto", herkunft: "richtpreis" }];
  for (const h of [alt, klein, rp, []]) assert.equal(preisDrift(stand([art("Fleisch", 10, h)], [ger("d", "Döner", 7.5, 100, 40)]), { datum: "2026-10-28" }).zutaten.length, 0);
});

test("1.6 Extra Käse: 1,00 € brutto, 20 g à 10 €/kg → bringt 0,7346 €", () => {
  const g = ger("d", "Döner", 7.5, 100, 40, { extras: [{ id: "x1", name: "Extra Käse", preis: 1, zutaten: [{ name: "Fleisch", menge: 20, einheit: "g" }] }] });
  const r = extraRechnen(stand([art("Fleisch", 10)], [g]), "d", "x1");
  nah(r.ware, 0.2); nah(r.bringt, 1 / 1.07 - 0.2);
  assert.equal(extraRechnen(stand([art("Fleisch", 10)], [g]), "d", "fehlt"), null);
});

test("1.6 Menü: 7,50 + 3,50 als Menü 10,00 € → Rabatt 1,00 €, du verdienst 7,8458 €", () => {
  // Σ brutto 11,00; Σ netto 11 / 1,07 = 10,280374; Menü netto 10 × 10,280374 / 11 = 9,345794; Ware 1,00 + 0,50 → 7,845794
  const s = stand([art("Fleisch", 10)], [ger("a", "Döner", 7.5, 100, 40), ger("b", "Pommes", 3.5, 50, 40)]);
  const b = buendelRechnen(s, ["a", "b"], 10);
  nah(b.rabatt, 1); nah(b.verdienst, 10 / 1.07 - 1.5); assert.equal(b.lohntNie, false);
});
