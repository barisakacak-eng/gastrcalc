// Etappe 6, Punkt 6: Einrichtung in Prozent
import test from "node:test";
import assert from "node:assert/strict";
import { leererBetrieb, leereWurzel } from "../js/store.js";
import { einrichtungStand } from "../js/einrichtung.js";
import { vorschlaegeAusText, vorschlaegeUebernehmen } from "../js/karte_lesen.js";
import { artikelAusGerichten } from "../js/engine.js";

const JETZT = Date.parse("2026-10-14T12:00:00Z");
const voll = () => {
  const s = leererBetrieb(); s.ladenArt = "doener";
  vorschlaegeUebernehmen(s, vorschlaegeAusText("Döner Kebab ⋯ 7,50\nAyran 0,25 l ⋯ 2,00", s).map((v) => ({ ...v, an: true }))); s.artikel = artikelAusGerichten(s);
  return s;
};

test("neuer Laden: 0 %, nächster Schritt Speisekarte", () => {
  const e = einrichtungStand(leererBetrieb(), leereWurzel(), { jetzt: JETZT });
  assert.equal(e.prozent, 0); assert.equal(e.naechster.id, "karte"); assert.equal(e.schritte.length, 7);
});

test("Schnellstart mit Karte und Preisen, ohne Rest: Teilwerte, Getränk zählt bei Rezepten", () => {
  const s = voll(); const e = einrichtungStand(s, leereWurzel(), { jetzt: JETZT });
  const r = Object.fromEntries(e.schritte.map((x) => [x.id, x.anteil]));
  assert.equal(r.karte, 1); assert.equal(r.preise, 1); assert.equal(r.rezepte, 1); assert.equal(r.kosten, 0); assert.equal(r.sicherung, 0);
  assert.equal(e.prozent, Math.floor(3 / 7 * 100)); assert.equal(e.naechster.id, "kosten");
});

test("alles erfüllt: 100 %; Sicherung älter als 7 Tage fällt zurück; „haben wir nicht“ zählt", () => {
  const s = voll(); const w = leereWurzel(); w.letzteSicherung = "2026-10-13T10:00:00Z";
  s.kosten = [{ id: "a", kategorie: "miete", posten: "miete", betrag: 1500, status: "bekannt" }, { id: "b", kategorie: "energie", posten: "strom", betrag: null, status: "aus" }];
  s.team = { personen: 2, stundenProPerson: 160, lohnkosten: 5000, eigenerLohn: 2000, eigenerLohnStatus: "eigen" };
  for (const a of s.artikel) { a.preis = 10; a.packung = { menge: 1, einheit: a.einheit === "stk" ? "stk" : "kg" }; }
  s.kuehl.keine = true;
  assert.equal(einrichtungStand(s, w, { jetzt: JETZT }).prozent, 100);
  w.letzteSicherung = "2026-10-01T10:00:00Z";
  const e = einrichtungStand(s, w, { jetzt: JETZT }); assert.equal(e.prozent, 85); assert.equal(e.naechster.id, "sicherung");
});

test("Teilerfüllung: halbe Rezepte", () => {
  const s = voll(); s.gerichte.push({ id: "x", name: "Leer", klasse: "haupt", zutaten: [], preis: 5 });
  const r = einrichtungStand(s, null, { jetzt: JETZT }).schritte.find((x) => x.id === "rezepte");
  assert.equal(r.rest, 1); assert.ok(r.anteil > 0.6 && r.anteil < 0.7);
});
