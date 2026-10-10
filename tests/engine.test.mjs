// Tests für das Rechenwerk. Laufen mit: node --test tests/
// Zahlenbeispiele stammen aus der Prüfung Oktober 2026, damit die App genau das rechnet, was dort festgelegt ist.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../js/engine.js";

const nah = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

test("betragJeMonat: Jahresbetrag wird durch 12 geteilt", () => {
  nah(E.betragJeMonat({ betrag: 1200, periode: "jahr" }), 100);
  nah(E.betragJeMonat({ betrag: 100, periode: "monat" }), 100);
  assert.equal(E.betragJeMonat({ betrag: null }), null);
});

test("fixkosten: trennt bekannt, geschätzt, offen", () => {
  const stand = { kosten: [
    { kategorie: "miete", betrag: 1600, status: "bekannt", periode: "monat" },
    { kategorie: "miete", betrag: 200, status: "geschaetzt", periode: "monat" },
    { kategorie: "energie", betrag: null, status: "offen", periode: "monat" },
    { kategorie: "gebuehren", betrag: 240, status: "bekannt", periode: "jahr" },
  ] };
  const f = E.fixkosten(stand);
  nah(f.gesamt, 1820); nah(f.bekannt, 1620); nah(f.geschaetzt, 200); assert.equal(f.offen, 1);
  nah(f.jeKategorie.miete.summe, 1800); assert.equal(f.jeKategorie.energie.offen, 1);
});

test("Saison: Jahreskosten müssen in den offenen Monaten verdient werden", () => {
  nah(E.fixkostenJeOffenenMonat(1000, 12), 1000);
  nah(E.fixkostenJeOffenenMonat(1000, 6), 2000);
  nah(E.fixkostenJeOffenenMonat(1000, 0), 1000); // Schutz vor Division durch null
});

test("Minutensatz läuft auf Leistungsstunden, nicht auf bezahlten Stunden", () => {
  const team = { personen: 3, stundenProPerson: 160, lohnkosten: 6000 };
  nah(E.lohnMinutensatz(team, 1.0), 6000 / (3 * 160 * 60));
  nah(E.lohnMinutensatz(team, 0.5), 2 * 6000 / (3 * 160 * 60));
  assert.equal(E.lohnMinutensatz({ personen: 0, stundenProPerson: 0, lohnkosten: 1 }), null);
});

test("Zeitzuschlag: mengengewichteter Mittelwert, Summe der Zuschläge ist null (Prüfung Befund 1)", () => {
  const g = [ { zeit: 4, menge: 300 }, { zeit: 8, menge: 50 }, { zeit: 12, menge: 10 } ];
  const t = E.gewichteteZeit(g);
  nah(t, (4 * 300 + 8 * 50 + 12 * 10) / 360);
  const satz = 0.5;
  const summe = g.reduce((s, x) => s + x.menge * E.zeitzuschlag(x, t, satz), 0);
  nah(summe, 0, 1e-9);
  // Ungewichtet wäre t̄ = 8 – das war der Fehler mit 38,6 % Unterdeckung.
  assert.notEqual(Math.round(t * 100), 800);
});

test("Äquivalenzziffern: Fixkosten werden nicht durch die Stückzahl geteilt (Prüfung Befund 3)", () => {
  const g = [ { klasse: "getraenk", menge: 1000 }, { klasse: "haupt", menge: 500 } ];
  const k = E.fixkostenJeGericht(g, 8000);
  const nenner = 1000 * 0.3 + 500 * 1.0;
  nah(k(g[0]), 8000 / nenner * 0.3);
  nah(k(g[1]), 8000 / nenner * 1.0);
  nah(1000 * k(g[0]) + 500 * k(g[1]), 8000); // alles verteilt, nichts verloren
});

test("Schwund und Garverlust: Division im Hundert, Sperre bei 90 %", () => {
  nah(E.mitSchwund(100, 0.05), 100 / 0.95);
  assert.equal(E.mitSchwund(100, 0.9), null);
  nah(E.rohmengeFuer(180, 0.15), 180 / 0.85);
});

test("Preis mit Provision, Zahlenbeispiel der Prüfung (Befund 4): SK 6 €, g 15 %, p 30 %", () => {
  nah(E.nettoPreis(6, 0.15, 0.30).netto, 10.909090909, 1e-6);
  nah(E.nettoPreis(6, 0.15, 0.30, { basis: "brutto", mwst: 0.07 }).netto, 6 / (1 - 0.15 - 0.30 * 1.07), 1e-9);
  nah(E.nettoPreis(6, 0.15, 0.30, { basis: "brutto", mwst: 0.19 }).netto, 6 / (1 - 0.15 - 0.30 * 1.19), 1e-9);
  assert.equal(E.nettoPreis(6, 0.15, 0.30).stufe, "ok");
  assert.equal(E.nettoPreis(6, 0.35, 0.30).stufe, "warnung");
  assert.equal(E.nettoPreis(6, 0.55, 0.30).stufe, "sperre");
  assert.equal(E.nettoPreis(6, 0.55, 0.30).netto, null);
});

test("Aufrundung auf 10 Cent wird ausgewiesen (Prüfung Befund 10)", () => {
  const r = E.aufrunden10Cent(11.34);
  nah(r.gerundet, 11.4); nah(r.aufschlag, 0.06);
  nah(E.aufrunden10Cent(11.4).aufschlag, 0);
});

test("Abfall-Äquivalent über Deckungsbeitrag, nicht über Gewinn (Prüfung Befund 2)", () => {
  nah(E.abfallAequivalent(500, 4.30), 116.279, 1e-3);
  assert.notEqual(Math.round(E.abfallAequivalent(500, 4.30)), 455);
  assert.equal(E.abfallAequivalent(500, 0), null);
});

test("Verbrauchsrechnung (Prüfung Befund 6): Anfang + Einkauf − Ende − Müll − Personal", () => {
  nah(E.verbrauch({ anfang: 200, einkauf: 1000, ende: 150, muell: 20, personal: 30 }), 1000);
  nah(E.portionenAusVerbrauch(1000, 1), 1000);
  assert.equal(E.portionenAusVerbrauch(1000, 0), null);
});

test("Verpackung: Stückpreis aus Gebinde (C7.1)", () => {
  nah(E.stueckpreis(89, 1000), 0.089);
  assert.equal(E.stueckpreis(89, 0), null);
});

test("fixkosten: ausgeschaltete Posten zählen nirgends, auch nicht als offen", () => {
  const f = E.fixkosten({ kosten: [ { kategorie: "miete", betrag: null, status: "aus", periode: "monat" } ] });
  assert.equal(f.offen, 0); nah(f.gesamt, 0);
});
test("monatsLast: Löhne offen bleibt offen, Saison nur auf feste Kosten", () => {
  const stand = { betrieb: { monate: 6 }, team: { lohnkosten: null }, kosten: [ { kategorie: "miete", betrag: 1000, status: "bekannt", periode: "monat" } ] };
  const m = E.monatsLast(stand);
  assert.equal(m.lohnOffen, true); assert.equal(m.offen, 1); nah(m.fixJeOffen, 2000); nah(m.gesamt, 2000);
  stand.team.lohnkosten = 3000;
  nah(E.monatsLast(stand).gesamt, 5000);
});
test("Provision: unbekannte Basis wird vorsichtig (wie brutto) gerechnet", () => {
  assert.equal(E.basisFuerRechnung("unbekannt"), "brutto");
  assert.ok(E.nettoPreis(6, 0.15, 0.30, { basis: "unbekannt", mwst: 0.07 }).netto > E.nettoPreis(6, 0.15, 0.30, { basis: "netto" }).netto);
});
