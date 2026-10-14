// Etappe 6, Punkt 7: Stempel, Waage-Check, Familie lernt mit, Branchenwerte
import test from "node:test";
import assert from "node:assert/strict";
import { leererBetrieb } from "../js/store.js";
import { vorschlaegeAusText, vorschlaegeUebernehmen } from "../js/karte_lesen.js";
import { artikelAusGerichten } from "../js/engine.js";
import { rezeptStempel, waageFragen, familieAnpassen, geldSatz, branchenwerteAnwenden, branchenwerteZuruecknehmen, wareneinsatzSicherheit, schnellwahl, quelleVon } from "../js/rezept_quelle.js";

const KARTE = "Döner Kebab ⋯ 7,50\nDöner (groß) mit Salat, Soße ⋯ 8,50\nDürüm Döner ⋯ 8,00\nDöner Box ⋯ 7,00\nDöner-Teller mit Reis oder Pommes ⋯ 12,00\nPide mit Dönerfleisch ⋯ 10,00\nLahmacun mit Dönerfleisch ⋯ 8,00\nFalafel Dürüm ⋯ 7,00";
const laden = () => { const s = leererBetrieb(); s.ladenArt = "doener"; s.betrieb.format = "imbiss"; s.betrieb.kuechen = ["doener"];
  vorschlaegeUebernehmen(s, vorschlaegeAusText(KARTE, s).map((v) => ({ ...v, an: true }))); s.artikel = artikelAusGerichten(s); return s; };
const fleisch = (g) => g.zutaten.find((z) => z.name === "Dönerspieß Kalb/Pute");

test("Startwerte: Stempel geschätzt, nie grün", () => {
  const s = laden();
  for (const g of s.gerichte) assert.equal(rezeptStempel(g).stufe, "schaetzung", g.name);
  assert.equal(wareneinsatzSicherheit(s).unsicher, true);
});

test("Waage-Check: Fleisch zuerst, höchstens 3 Fragen, Schnellwahl um den Startwert", () => {
  const s = laden(); const g = s.gerichte.find((x) => x.name === "Döner Kebab");
  const f = waageFragen(s, g); assert.ok(f.length >= 1 && f.length <= 3); assert.equal(f[0].name, "Dönerspieß Kalb/Pute");
  const chips = schnellwahl(180, "g"); assert.equal(chips.length, 4); assert.ok(chips.every((c) => c !== 180));
});

test("Ein gewogener Wert gilt für die ganze Familie, Eigenes wird nie überschrieben", () => {
  const s = laden(); const d = s.gerichte.find((x) => x.name === "Döner Kebab"); const gross = s.gerichte.find((x) => /groß/.test(x.name));
  const alt = fleisch(gross).menge; const start = fleisch(d).menge;
  // Dürüm vorher selbst gewogen
  const duerum = s.gerichte.find((x) => x.name === "Dürüm Döner"); fleisch(duerum).menge = 170; fleisch(duerum).quelle = "eigen";
  const r = familieAnpassen(s, { gerichtId: d.id, zutat: "Dönerspieß Kalb/Pute", wert: 160, datum: "2026-10-14" });
  assert.equal(fleisch(d).menge, 160); assert.equal(fleisch(d).quelle, "eigen");
  assert.equal(fleisch(gross).menge, Math.round(alt * 160 / start / 5) * 5); assert.equal(fleisch(gross).quelle, "eigen-abgeleitet");
  assert.equal(fleisch(duerum).menge, 170, "Eigenes bleibt");
  assert.ok(r.geaendert.length >= 4, String(r.geaendert.length));
  assert.equal(rezeptStempel(d).stufe, "eigen"); assert.equal(rezeptStempel(gross).stufe, "eigen-abgeleitet");
});

test("Geld-Satz nur mit Einkaufspreis", () => {
  const s = laden();
  assert.equal(geldSatz(s, "Dönerspieß Kalb/Pute", 180, 160, "g"), null);
  const a = s.artikel.find((x) => x.name === "Dönerspieß Kalb/Pute"); a.preis = 90; a.packung = { menge: 10, einheit: "kg" }; a.preisBasis = "netto";
  assert.ok(Math.abs(geldSatz(s, "Dönerspieß Kalb/Pute", 180, 160, "g") - 0.18) < 1e-9);
});

test("Branchenwerte: Schätzung wird ersetzt, Eigenes bleibt, Ausreißer abgelehnt, Rückgängig", () => {
  const s = laden(); const d = s.gerichte.find((x) => x.name === "Döner Kebab"); const gross = s.gerichte.find((x) => /groß/.test(x.name));
  fleisch(gross).quelle = "eigen"; const eigenWert = fleisch(gross).menge; const vorher = fleisch(d).menge;
  const r = branchenwerteAnwenden(s, [
    { familie: "doener", zutat: "Dönerspieß Kalb/Pute", menge: 150, min: 120, max: 200, quellen: ["a", "b"], stufe: "branche" },
    { familie: "doener", zutat: "Eisbergsalat", menge: 900, quellen: ["a", "b"], stufe: "branche" },
    { familie: "doener", zutat: "Tomaten", menge: 30, quellen: ["a"], stufe: "branche" },
  ], { datum: "2026-10-14" });
  assert.equal(fleisch(d).menge, 150); assert.equal(fleisch(d).quelle, "branche"); assert.equal(rezeptStempel(d).stufe, "branche");
  assert.equal(fleisch(gross).menge, eigenWert); assert.ok(r.uebersprungenEigen >= 1);
  assert.deepEqual(r.abgelehnt.map((x) => x.grund).sort(), ["ausreisser", "zuWenigQuellen"]);
  assert.ok(branchenwerteZuruecknehmen(s, { datum: "2026-10-20" }) >= 1); assert.equal(fleisch(d).menge, vorher); assert.equal(quelleVon(fleisch(d), d), "schaetzung");
});

test("Pilotwert ersetzt keinen Branchenwert", () => {
  const s = laden(); const d = s.gerichte.find((x) => x.name === "Döner Kebab");
  branchenwerteAnwenden(s, [{ familie: "doener", zutat: "Dönerspieß Kalb/Pute", menge: 150, quellen: ["a", "b"], stufe: "branche" }]);
  branchenwerteAnwenden(s, [{ familie: "doener", zutat: "Dönerspieß Kalb/Pute", menge: 200, quellen: ["pilot"], stufe: "pilot" }]);
  assert.equal(fleisch(d).menge, 150);
});
