// Welle 2 „Ware und Schwund“ (Masterauftrag 2.1–2.7) – Goldwerte von Hand (28.10.2026).
import { test } from "node:test";
import assert from "node:assert/strict";
import { portionEuro, spiessBilanz, spiessVergleich, aArtikel, muellRangliste, lieferantenVergleich, selbstOderKaufen, einkaufNaechsteWoche, zuVielVorbereitet } from "../js/ware.js";
const nah = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);
const art = (name, preisKg, gruppe = "fleisch", extra = {}) => ({ name, einheit: "g", preis: preisKg, preisBasis: "netto", packung: { menge: 1000, einheit: "g" }, gruppe, ...extra });
const ger = (id, name, preis, zutaten, mengeTag) => ({ id, name, preis, klasse: "haupt", mengeTag, zutaten });
const stand = (artikel, gerichte, extra = {}) => ({ betrieb: { tageProWoche: 6, monate: 12 }, team: { lohnkosten: 0, eigenerLohn: 0, eigenerLohnStatus: "eigen" }, kosten: [], verkauf: {}, artikel, gerichte, schwund: [], lieferungen: [], ...extra });
const doener = (mengeTag = 40) => ger("d", "Döner", 7.5, [{ name: "Fleisch", menge: 100, einheit: "g" }], mengeTag);

test("2.1 Portion: 112 g statt 100 g Fleisch à 10 €/kg bei 40 am Tag → 0,12 € je Portion, 1.497,60 € im Jahr", () => {
  const r = portionEuro(stand([art("Fleisch", 10)], [doener()]), "d", "Fleisch", 112);
  nah(r.jePortion, 0.12); nah(r.jahr, 0.12 * 1040 * 12); // 1.040 Portionen im Monat
  nah(portionEuro(stand([art("Fleisch", 10)], [doener()]), "d", "Fleisch", 95).jePortion, -0.05);
});

test("2.2 Spieß: 15 kg à 12 €, Rest 1,2 kg, 128 Portionen → 1,40625 € je Portion, Rest 14,40 €", () => {
  const b = spiessBilanz({ rohKg: 15, preisKg: 12, restKg: 1.2, portionen: 128 });
  nah(b.kosten, 180); nah(b.jePortion, 1.40625); nah(b.restEuro, 14.4); nah(b.grammJePortion, 13800 / 128);
  const v = spiessVergleich({ rohKg: 15, preisKg: 12, restKg: 1.2, portionen: 128 }, { rohKg: 15, preisKg: 11, restKg: 2, portionen: 120 }, 1000);
  nah(v.jePortion, 165 / 120 - 1.40625); assert.equal(v.guenstiger, "b"); nah(v.monat, (165 / 120 - 1.40625) * 1000);
  assert.equal(spiessBilanz({ rohKg: 15, preisKg: 12, restKg: 16, portionen: 10 }), null);
});

test("2.3 A-Artikel: teuerste Zutaten zuerst, höchstens 8", () => {
  const artikel = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"].map((n, i) => art(n, 10 - i));
  const g = ger("x", "Teller", 12, artikel.map((a) => ({ name: a.name, menge: 50, einheit: "g" })), 20);
  const r = aArtikel(stand(artikel, [g]));
  assert.ok(r.artikel.length >= 5 && r.artikel.length <= 8); assert.equal(r.artikel[0].name, "A");
  // Wert A je Woche: 50 g × 0,01 €/g × 20 × 6 = 60 €
  nah(r.artikel[0].wert, 60);
});

test("2.4 Müll-Rangliste: 500 g Fleisch und ein Döner weg → Fleisch vorn", () => {
  const s = stand([art("Fleisch", 10), art("Brot", 4, "teig")], [ger("d", "Döner", 7.5, [{ name: "Fleisch", menge: 100, einheit: "g" }, { name: "Brot", menge: 100, einheit: "g" }], 40)]);
  s.schwund = [{ id: "1", datum: "2026-10-27", art: "rohware", ref: { typ: "artikel", name: "Fleisch" }, menge: 500, einheit: "g", storniert: false },
    { id: "2", datum: "2026-10-26", art: "gericht", ref: { typ: "gericht", id: "d" }, menge: 1, einheit: "stk", storniert: false },
    { id: "3", datum: "2026-10-01", art: "rohware", ref: { typ: "artikel", name: "Brot" }, menge: 1000, einheit: "g", storniert: false }];
  const r = muellRangliste(s, "2026-10-28");
  assert.equal(r.groesste.gruppe, "fleisch");
  // Döner-Ware 1,00 € Fleisch + 0,40 € Brot: Brot-Anteil des Döner-Werts 0,4/1,4
  const brot = r.rang.find((x) => x.gruppe === "brot"); assert.ok(brot && brot.wert > 0);
  nah(brot.wert / (r.summe - 5), 0.4 / 1.4, 1e-6);
});

test("2.5 Lieferanten: 10 kg Fleisch für 100 € gegen 90 € → 1.248 € im Jahr", () => {
  const z = (netto) => [{ artikel: "Fleisch", menge: 1, inhaltMenge: 10, inhaltEinheit: "kg", netto }];
  const s = stand([art("Fleisch", 10)], [doener()], { lieferungen: [{ id: "a", datum: "2026-10-01", lieferant: "Händler A", zeilen: z(100) }, { id: "b", datum: "2026-10-08", lieferant: "Händler B", zeilen: z(90) }] });
  const r = lieferantenVergleich(s);
  assert.equal(r.length, 1); assert.equal(r[0].guenstig.lieferant, "Händler B"); assert.equal(r[0].vergleichbar, true);
  nah(r[0].jahr, 0.001 * 104000 * 12); // Verbrauch 100 g × 1.040 = 104.000 g im Monat
});

test("2.5 Lieferanten: verschiedene Packungsgrößen → kein Sieger", () => {
  const s = stand([art("Fleisch", 10)], [doener()], { lieferungen: [
    { id: "a", datum: "2026-10-01", lieferant: "A", zeilen: [{ artikel: "Fleisch", menge: 1, inhaltMenge: 10, inhaltEinheit: "kg", netto: 100 }] },
    { id: "b", datum: "2026-10-02", lieferant: "B", zeilen: [{ artikel: "Fleisch", menge: 1, inhaltMenge: 2, inhaltEinheit: "kg", netto: 18 }] }] });
  const r = lieferantenVergleich(s); assert.equal(r[0].vergleichbar, false); assert.equal(r[0].jahr, null);
});

test("2.6 Selbst machen: Soße 2,00 € Material + 10 min à 0,30 € je kg gegen Zukauf 6,00 €/kg", () => {
  const sosse = { name: "Soße", einheit: "g", herkunft: "selbst", gruppe: "sauce", packung: { menge: 1000, einheit: "g" },
    rezept: { zutaten: [{ name: "Joghurt", menge: 1000, einheit: "g" }], ausbeute: { menge: 1, einheit: "kg" }, arbeitMin: 10, zukaufPreis: 6 } };
  const s = stand([art("Joghurt", 2, "kaese"), sosse], [ger("d", "Döner", 7.5, [{ name: "Soße", menge: 30, einheit: "g" }], 40)]);
  const r = selbstOderKaufen(s, "Soße", 0.3);
  nah(r.selbstJe, 0.005); nah(r.zukaufJe, 0.006); assert.equal(r.besser, "selbst");
  nah(r.jahr, 0.001 * 30 * 1040 * 12); // 31.200 g im Monat × 0,001 €/g × 12 = 374,40 €
});

test("2.7 Einkauf nächste Woche: nur was bis in 7 Tagen zu bestellen ist", () => {
  const r = einkaufNaechsteWoche({ heute: "2026-10-28", zeilen: [{ bestellenAm: "2026-10-29", wert: 120 }, { bestellenAm: "2026-11-04", wert: 80, geschaetzt: true }, { bestellenAm: "2026-11-10", wert: 999 }, { bestellenAm: null, wert: 5 }] });
  nah(r.summe, 200); assert.equal(r.anzahl, 2); assert.equal(r.geschaetzt, true);
});

test("2.4 zu viel vorbereitet: 3 Tage je 10 Döner übrig bei 40 am Tag → 20 %", () => {
  const s = stand([art("Fleisch", 10)], [doener()]);
  s.schwund = ["2026-10-26", "2026-10-27", "2026-10-28"].map((d, i) => ({ id: "u" + i, datum: d, art: "nichtverkauft", ref: { typ: "gericht", id: "d" }, menge: 10, storniert: false }));
  const r = zuVielVorbereitet(s, "2026-10-28");
  assert.equal(r.length, 1); nah(r[0].anteil, 30 / (40 * 3 + 30));
});
