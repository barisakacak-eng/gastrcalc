// Lauf 6, Etappe 3: Lohnsteuer-Anmeldung nach § 41a Abs. 2 EStG (Monat, Vierteljahr, Jahr) und ESt-Vorauszahlung nur mit Bescheid
// und nur bei Einzelunternehmen oder Personengesellschaft. Erwartete Tage von Hand aus dem Kalender 2027 (BW).
import test from "node:test"; import assert from "node:assert/strict";
import { lohnsteuerTermine, lstRhythmusVorschlag, pflichtTermine } from "../js/fristen.js";
import { termineLaden, lstRhythmusSetzen, lstVorjahrSetzen, lstVorschlag, estBescheidUmschalten, estTermineAn } from "../js/welle3.js";
import { geld3View } from "../js/screens/geld3.js";

const tage = (l) => l.map((x) => x.datum);
test("Lohnsteuer monatlich: 12 Termine 2027, je am 10. oder am nächsten Werktag", () => {
  // 10.01.2027 ist ein Sonntag → 11.01.; 10.04. Samstag → 12.04.; 10.07. Samstag → 12.07.; 10.10. Sonntag → 11.10.
  assert.deepEqual(tage(lohnsteuerTermine(2027, { rhythmus: "monat" })), ["2027-01-11", "2027-02-10", "2027-03-10", "2027-04-12", "2027-05-10", "2027-06-10", "2027-07-12", "2027-08-10", "2027-09-10", "2027-10-11", "2027-11-10", "2027-12-10"]);
});
test("Lohnsteuer vierteljährlich: vier Termine nach Quartalsende", () => {
  const l = lohnsteuerTermine(2027, { rhythmus: "quartal" });
  assert.deepEqual(tage(l), ["2027-01-11", "2027-04-12", "2027-07-12", "2027-10-11"]);
  assert.deepEqual(l.map((x) => x.zeitraum), ["2026-Q4", "2027-Q1", "2027-Q2", "2027-Q3"]); assert.ok(l.every((x) => x.art === "lohnsteuer"));
});
test("Lohnsteuer jährlich: ein Termin am 10. Januar für das Vorjahr", () => {
  const l = lohnsteuerTermine(2027, { rhythmus: "jahr" });
  assert.deepEqual(l.map((x) => [x.zeitraum, x.regulaer, x.datum, x.verschoben]), [["2026", "2027-01-10", "2027-01-11", true]]);
});
test("Lohnsteuer ohne gewählten Rhythmus: keine Termine (nie geraten)", () => {
  assert.deepEqual(lohnsteuerTermine(2027, {}), []);
  assert.ok(!pflichtTermine("2027-01-01", "2027-12-31", { personal: true }).some((x) => x.art === "lohnsteuer"));
});
test("Vorschlag aus der Lohnsteuer des Vorjahres: Grenzen 1.080 € und 5.000 € genau", () => {
  const T = "2026-11-12";
  assert.equal(lstRhythmusVorschlag(0, T), "jahr"); assert.equal(lstRhythmusVorschlag(1080, T), "jahr");
  assert.equal(lstRhythmusVorschlag(1080.01, T), "quartal"); assert.equal(lstRhythmusVorschlag(5000, T), "quartal");
  assert.equal(lstRhythmusVorschlag(5000.01, T), "monat"); assert.equal(lstRhythmusVorschlag(NaN, T), null); assert.equal(lstRhythmusVorschlag(-1, T), null);
});
test("ESt-Vorauszahlung: nur Einzelunternehmen/Personengesellschaft UND Bescheid", () => {
  const laden = (rechtsform, estBescheid) => ({ betrieb: { rechtsform, estBescheid }, personen: [] });
  const hatEst = (s) => termineLaden(s, "2027-03-01", 30).some((x) => x.art === "est");
  assert.equal(hatEst(laden("einzel", true)), true); assert.equal(hatEst(laden("gbr", true)), true); assert.equal(hatEst(laden("kg_ohg", true)), true);
  assert.equal(hatEst(laden("einzel", false)), false); assert.equal(hatEst(laden("gmbh", true)), false); assert.equal(hatEst(laden("ug", true)), false);
  assert.equal(hatEst(laden("unbekannt", true)), false); assert.equal(hatEst({ betrieb: {}, personen: [] }), false);
  const s = laden("einzel", false); estBescheidUmschalten(s); assert.equal(estTermineAn(s), true);
  assert.deepEqual(termineLaden(s, "2027-03-01", 30).filter((x) => x.art === "est").map((x) => x.datum), ["2027-03-10"]);
});
test("Einstellen im Laden: Rhythmus und Vorjahreswert; Bildschirm zeigt die Knöpfe nur mit Personal bzw. passender Rechtsform", () => {
  const s = { id: "l", betrieb: { rechtsform: "gmbh" }, personen: [{ id: "p1", name: "A" }], tagesnotizen: [], kosten: [], gerichte: [], artikel: [] };
  lstRhythmusSetzen(s, "jahr"); assert.equal(s.betrieb.lstRhythmus, "jahr"); lstRhythmusSetzen(s, "quatsch"); assert.equal(s.betrieb.lstRhythmus, null);
  lstVorjahrSetzen(s, 3200); assert.equal(lstVorschlag(s, "2026-11-12"), "quartal"); lstVorjahrSetzen(s, NaN); assert.equal(lstVorschlag(s, "2026-11-12"), null);
  let h = geld3View(s);
  assert.equal((h.match(/data-a="g3-lst-rhythmus"/g) || []).length, 3); assert.ok(!h.includes('data-a="g3-est-bescheid"'), "GmbH: kein ESt-Knopf");
  s.betrieb.rechtsform = "einzel"; s.personen = []; h = geld3View(s);
  assert.ok(!h.includes('data-a="g3-lst-rhythmus"'), "ohne Personal keine Lohnsteuer-Frage"); assert.ok(h.includes('data-a="g3-est-bescheid"'));
});
