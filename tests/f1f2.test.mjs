// 17.10.2026 Fehler F1/F2: Vorlagen ohne Kartenfoto übernehmen, Büro „Rezepte“ ohne Gerichte, Inventur ohne Waren.
import test from "node:test";
import assert from "node:assert/strict";
import { leererBetrieb } from "../js/store.js";
import { VORLAGEN, PRODUKT_INDEX } from "../js/data/katalog.js";
import { bearbeitenZiel, schrittIndex } from "../js/screens/onboarding.js";
import { gerichtAusVorlage } from "../js/screens/karte.js";
import { artikelAusGerichten } from "../js/engine.js";
import { rezeptStempel } from "../js/rezept_quelle.js";
import * as I from "../js/inventur.js";

const vorlage = (name) => { for (const [bereich, l] of Object.entries(VORLAGEN)) { const v = l.find((x) => x.name === name); if (v) return { ...v, bereich }; } return null; };
function dönerladen() { const s = leererBetrieb(); s.betrieb.name = "Test"; s.betrieb.format = "imbiss"; s.betrieb.kuechen = ["doener"]; s.ladenArt = "doener"; return s; }

test("F1: „Rezepte“ und „Einkaufspreise“ ohne Gerichte starten bei der Gerichte-Auswahl", () => {
  const s = dönerladen();
  assert.deepEqual(bearbeitenZiel(s, "rezepte", undefined), { von: "karte", bis: "rezepte" });
  assert.deepEqual(bearbeitenZiel(s, "preise", undefined), { von: "karte", bis: "preise" });
  assert.deepEqual(bearbeitenZiel(s, "verkauf", undefined), { von: "verkauf", bis: undefined }, "Verkauf (Tagesmenge, Ziel) geht ohne Gerichte");
  assert.deepEqual(bearbeitenZiel(s, "kosten-miete", "kosten-sonstiges"), { von: "kosten-miete", bis: "kosten-sonstiges" });
  assert.ok(schrittIndex("karte") < schrittIndex("rezepte") && schrittIndex("rezepte") < schrittIndex("preise"), "„bis“ liegt hinter der Auswahl");
  s.gerichte.push(gerichtAusVorlage(vorlage("Döner Kebab")));
  assert.deepEqual(bearbeitenZiel(s, "rezepte", undefined), { von: "rezepte", bis: undefined }, "mit Gerichten wie bisher");
});

test("F1: übernommene Vorlage ist vollständig (Rezept mit Startmengen, Stempel Schätzung, Familie, Bereich)", () => {
  const s = dönerladen();
  for (const n of ["Döner Kebab", "Dürüm Döner", "Dönerteller", "Pommes frites (Beilage)", "Cola 0,33 l"]) s.gerichte.push(gerichtAusVorlage(vorlage(n)));
  s.artikel = artikelAusGerichten(s);
  for (const g of s.gerichte) {
    assert.ok(g.vorlage && g.zutaten.length && g.zutaten.every((z) => z.menge > 0), g.name);
    assert.equal(rezeptStempel(g).stufe, "schaetzung", g.name + ": Startwert muss als Schätzung gekennzeichnet sein");
    assert.ok(g.bereich, g.name);
  }
  assert.equal(s.gerichte.find((g) => g.name === "Döner Kebab").rezeptFamilie, "doener");
  for (const g of s.gerichte) for (const z of g.zutaten) assert.ok(s.artikel.some((a) => a.name === z.name), z.name + " fehlt in den Artikeln");
});

test("F2: alle Vorlagen-Zutaten stehen im Katalog; Cola 0,33 l wird als Cola 0,33 l gezählt", () => {
  for (const l of Object.values(VORLAGEN)) for (const v of l) for (const [z] of v.zutaten) assert.ok(PRODUKT_INDEX[z], `${v.name}: ${z}`);
  assert.deepEqual(vorlage("Cola 0,33 l").zutaten, [["Cola 0,33 l", 1, "stk"]]);
});

test("F2: Inventur ohne Waren wird erkannt, nach übernommenen Vorlagen nicht mehr", () => {
  const s = dönerladen();
  assert.equal(I.inventurOhneWaren(s), true);
  s.gerichte.push(gerichtAusVorlage(vorlage("Döner Kebab")), gerichtAusVorlage(vorlage("Cola 0,33 l")));
  s.artikel = artikelAusGerichten(s);
  assert.equal(I.inventurOhneWaren(s), false);
  const inv = I.inventurStarten(s, { datum: "2026-10-17" });
  assert.equal(I.inventurOhneWaren(s), false, "offene Inventur: nicht leer melden");
  const namen = I.artikelFuerInventur(s, inv).liste.map((z) => z.name);
  for (const n of ["Dönerspieß Kalb/Pute", "Dönertüte", "Cola 0,33 l"]) assert.ok(namen.includes(n), n);
  assert.ok(!namen.includes("Cola 0,2 l"));
  I.mengeSetzen(inv, "Dönerspieß Kalb/Pute", I.anbruchSetzen(I.mengeSchritt(I.mengeSchritt(null, 1), 1), 0.5));
  assert.equal(inv.posten["Dönerspieß Kalb/Pute"], 2.5);
  assert.ok(I.inventurAbschliessen(s, inv, { datum: "2026-10-17" }));
  const w = I.inventurWert(s, inv);
  assert.equal(w.gezaehlt, 1); assert.deepEqual(w.ohnePreis, ["Dönerspieß Kalb/Pute"], "ohne Einkaufspreis: 0 €, aber genannt");
});

test("F2: nur Selbstgemachtes ohne Gerichte (Stand nach Schnellstart) zählt als „keine Waren“", () => {
  const s = dönerladen();
  s.artikel = [{ name: "Pizzateig", gruppe: "teig", einheit: "kg", herkunft: "selbst", rezept: { zutaten: [] }, packung: { menge: null, einheit: "kg" }, gebinde: { art: "packung" }, preis: null }];
  assert.equal(I.inventurOhneWaren(s), true);
});
