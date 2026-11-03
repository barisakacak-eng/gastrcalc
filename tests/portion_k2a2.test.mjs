// K2 A2 (Klicker K2 Runde 2, 01.11.2026; Auftrag 02.11.2026): „Portion prüfen“ +50 g. Der Klicker sah „≈ 11.467 € im Jahr“ und konnte es nicht nachrechnen.
// Hier mit festen Eingaben, Erwartung von Hand gerechnet:
//   Döner mit 200 g Dönerfleisch laut Rezept, gewogen 250 g → +50 g = 0,050 kg je Portion.
//   Fleisch 12,00 €/kg netto (Packung 1 kg), kein Garverlust eingetragen → 0,050 kg × 12,00 € = 0,60 € je Portion.
//   Verkauf 60 Döner am Tag, 6 Tage die Woche → im Monat 60 × 6 × 52 / 12 = 1.560 Portionen.
//   Im Jahr: 0,60 € × 1.560 × 12 = 11.232,00 €.   (Gegenprobe: 0,60 € × 60 × 6 × 52 = 11.232,00 €.)
// Die 11.467 € aus dem Klicker-Lauf hingen von dessen Daten ab (Fleischpreis, Menge je Tag); sie sind hier nicht nachgestellt, geprüft wird die Rechenregel.
import { test } from "node:test";
import assert from "node:assert/strict";
import { portionEuro } from "../js/ware.js";
const nah = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b}`);
const stand = {
  betrieb: { tageProWoche: 6, monate: 12 }, team: { lohnkosten: 0, eigenerLohn: 0, eigenerLohnStatus: "eigen" }, kosten: [], verkauf: {}, schwund: [], lieferungen: [],
  artikel: [{ name: "Dönerfleisch", einheit: "g", preis: 12, preisBasis: "netto", packung: { menge: 1000, einheit: "g" }, gruppe: "fleisch" }],
  gerichte: [{ id: "d", name: "Döner", preis: 8, klasse: "haupt", mengeTag: 60, zutaten: [{ name: "Dönerfleisch", menge: 200, einheit: "g" }] }],
};

test("K2 A2: Portion 250 g statt 200 g Dönerfleisch à 12 €/kg, 60 am Tag, 6 Tage → 0,60 € je Portion, 11.232,00 € im Jahr", () => {
  const r = portionEuro(stand, "d", "Dönerfleisch", 250);
  assert.equal(r.diff, 50); nah(r.jePortion, 0.60); nah(r.mengeMonat, 1560); nah(r.jahr, 11232);
});

test("K2 A2: −50 g ist dasselbe mit Minus; genau 200 g ist 0 €", () => {
  nah(portionEuro(stand, "d", "Dönerfleisch", 150).jahr, -11232);
  nah(portionEuro(stand, "d", "Dönerfleisch", 200).jahr, 0);
});
