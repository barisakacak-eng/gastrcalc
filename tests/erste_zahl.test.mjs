// Erste Zahl vertrauenswürdig (Masterauftrag 0.1): ohne Miete / Löhne keine Euro-Zahl; kein rotes Minus aus Startwerten.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ersteZahlFehlt } from "../js/laden_zahlen.js";
import { minusUnsicher } from "../js/rezept_quelle.js";
import { monatsLast } from "../js/engine.js";
import { leererBetrieb } from "../js/store.js";
import { kostenBetragSetzen, kostenPostenUmschalten, lohnkostenSetzen } from "../js/stamm.js";

test("leerer Laden: Miete fehlt, dann Personal, dann nichts", () => {
  const s = leererBetrieb();
  assert.equal(ersteZahlFehlt(s, monatsLast(s)), "miete");
  kostenBetragSetzen(s, "miete", "miete", 1500);
  assert.equal(ersteZahlFehlt(s, monatsLast(s)), "personal");
  lohnkostenSetzen(s, 3000);
  assert.equal(ersteZahlFehlt(s, monatsLast(s)), null);
});

test("Miete ausgeschaltet (keine Miete) und allein im Laden: keine Lücke", () => {
  const s = leererBetrieb();
  kostenPostenUmschalten(s, "miete", "miete", null); // aus → an (offen)
  assert.equal(ersteZahlFehlt(s, monatsLast(s)), "miete"); // „weiß ich nicht“ ist noch eine Lücke
  kostenPostenUmschalten(s, "miete", "miete", null); // an → aus
  s.team.personen = 0;
  assert.equal(ersteZahlFehlt(s, monatsLast(s)), null);
});

test("Foodtruck: Standgebühr zählt als Miete", () => {
  const s = leererBetrieb(); s.team.personen = 0;
  kostenBetragSetzen(s, "standgebuehr", "miete", 400);
  assert.equal(ersteZahlFehlt(s, monatsLast(s)), null);
});

test("Rot aus geschätztem Rezept ist unsicher, aus eigenem Rezept nicht", () => {
  const g = { name: "Döner", vorlage: true, zutaten: [{ name: "Dönerfleisch", menge: 120, einheit: "g" }] };
  assert.equal(minusUnsicher({ ampel: "rot" }, g), true);
  assert.equal(minusUnsicher({ ampel: "gelb" }, g), false);
  const eigen = { name: "Döner", rezeptQuelle: "eigen", zutaten: [{ name: "Dönerfleisch", menge: 120, einheit: "g", quelle: "eigen" }] };
  assert.equal(minusUnsicher({ ampel: "rot" }, eigen), false);
  assert.equal(minusUnsicher({ ampel: "rot", warenRichtpreis: true }, eigen), true); // Preis nur Richtwert
});
