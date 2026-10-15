// Punkt 5 – Reinigung & Betriebsmittel (15.10.2026)
import test from "node:test";
import assert from "node:assert/strict";
import { istBetriebsmittel, reinigungMonat, mittelAusBelegen, putzzeitMonat } from "../js/reinigung.js";
import { monatsLast } from "../js/engine.js";
import { leererBetrieb } from "../js/store.js";

const laden = () => { const b = leererBetrieb(); b.betrieb.tageProWoche = 6; return b; };

test("Betriebsmittel nach Name erkannt, Ware nicht", () => {
  for (const n of ["Spülmittel 10 l", "Müllbeutel 120 l", "Einweghandschuhe Nitril", "Reinigungstabs Maschine", "Fettlöser Grill", "Küchenrolle"]) assert.ok(istBetriebsmittel(n), n);
  for (const n of ["Tomaten", "Dönerbrot / Fladen", "Alufolie", "Pizzakarton 32"]) assert.ok(!istBetriebsmittel(n), n);
});

test("Ohne Antwort keine Zeile, alte Läden rechnen wie bisher", () => {
  const b = laden(); assert.equal(reinigungMonat(b), null);
  const vorher = monatsLast(b).gesamt; b.betrieb.reinigung = { wer: null }; assert.equal(monatsLast(b).gesamt, vorher);
});

test("Firma zählt als Geld, eigene Zeit nicht; Stufen offen → Schätzung → Beleg", () => {
  const b = laden(); const vorher = monatsLast(b).gesamt;
  b.betrieb.reinigung = { wer: "beides", firmaBetrag: 280, minutenTag: 30, durch: "team", mittelSchaetzung: null };
  let r = reinigungMonat(b, { datum: "2026-10-15" }); assert.equal(r.stufe, "offen"); assert.equal(r.betrag, 280);
  assert.equal(monatsLast(b).gesamt - vorher, 280);
  b.betrieb.reinigung.mittelSchaetzung = 40; r = reinigungMonat(b, { datum: "2026-10-15" }); assert.equal(r.stufe, "schaetzung"); assert.equal(r.betrag, 320);
  b.lieferungen.push({ id: "l1", datum: "2026-10-01", storniert: false, zeilen: [{ name: "Spülmittel 10 l", netto: 20 }, { name: "Tomaten", netto: 50 }] },
    { id: "l2", datum: "2026-09-20", storniert: false, zeilen: [{ name: "Müllbeutel 120 l", netto: 12 }] },
    { id: "l3", datum: "2026-10-05", storniert: true, zeilen: [{ name: "Spülmittel 10 l", netto: 99 }] });
  r = reinigungMonat(b, { datum: "2026-10-15" }); assert.equal(r.stufe, "beleg"); assert.equal(r.belege, 2); assert.equal(r.mittel, 16); assert.equal(r.betrag, 296);
  assert.equal(mittelAusBelegen(b, "2026-12-31"), null); // außerhalb von 60 Tagen
  r = reinigungMonat(b, { datum: "2026-10-15", inventurMittel: 11 }); assert.equal(r.stufe, "inventur"); assert.equal(r.betrag, 291);
});

test("Nur selbst: keine Firma, Putzzeit als Einsicht (Euro nur mit Teamdaten)", () => {
  const b = laden(); b.betrieb.reinigung = { wer: "selbst", firmaBetrag: 500, minutenTag: 60, durch: "inhaber" };
  assert.equal(reinigungMonat(b).firma, 0);
  let z = putzzeitMonat(b, "2026-10-15"); assert.ok(Math.abs(z.stunden - 30 * 6 / 7) < 0.01); assert.equal(z.euro, null);
  b.betrieb.reinigung.durch = "team"; b.team = { ...b.team, personen: 2, stundenProPerson: 160, lohnkosten: 6400 };
  z = putzzeitMonat(b, "2026-10-15"); assert.ok(Math.abs(z.euro - z.stunden * 20) < 0.01);
  b.betrieb.reinigung.wer = "firma"; assert.equal(putzzeitMonat(b), null);
});
