// „Go beide“ (19.10.2026): Teil 1 selbst gemacht als echtes Unterrezept, Teil 2 Gebinde nach Stückzahl × Stückgewicht.
import test from "node:test";
import assert from "node:assert/strict";
import { leererBetrieb } from "../js/store.js";
import { selbstAnwenden } from "../js/selbst.js";
import { artikelAusGerichten, kalkulation, selbstWerte, stueckGewicht, mengeInBasisVon, preisJeBasis, zwischenpreis } from "../js/engine.js";
import { selbstFeldSetzen, selbstZutatEntfernen, selbstAusbeuteArt, selbstEigenUmschalten, artikelFeldSetzen, packungEinheitSetzen, artikelAbgleichen } from "../js/karte_daten.js";

const laden = () => { const s = leererBetrieb(); s.ladenArt = "doener"; s.betrieb.format = "imbiss"; s.betrieb.kuechen = ["doener"];
  s.team = { personen: 3, stundenProPerson: 160, lohnkosten: 7000, eigenerLohn: null, eigenerLohnStatus: "geschaetzt" }; return s; };
const preis = (s, name, euro, menge, einheit) => { const a = s.artikel.find((x) => x.name === name); assert.ok(a, name); a.preis = euro; a.packung = { menge, einheit }; a.preisBasis = "netto"; };
const art = (s, n) => s.artikel.find((x) => x.name === n);

test("Umrechnung Stück ↔ Gramm nur mit Stückgewicht", () => {
  assert.equal(mengeInBasisVon(2, "stk", "g", 275), 550);
  assert.equal(mengeInBasisVon(550, "g", "stk", 275), 2);
  assert.equal(mengeInBasisVon(1, "stk", "g", null), null);
  assert.equal(mengeInBasisVon(1, "kg", "ml", 5), null); // g gegen ml: nicht raten
});

test("Teil 1: Pizzateig als 6 Ballen à 275 g – Wert je Ballen und je 50 g, Ansatz zählt als eigen", () => {
  const s = laden(); s.gerichte = [{ id: "p", name: "Pizza", klasse: "haupt", zeit: 5, zutaten: [{ name: "Pizzateig", menge: 275, einheit: "g" }], preis: 8, mengeTag: 10, steuer: 0.07 }];
  selbstAnwenden(s, ["teig"]); artikelAbgleichen(s);
  const t = art(s, "Pizzateig"); assert.equal(t.rezept.quelle, "baukasten");
  // eigenen Ansatz eintragen: alle Zutaten weg, dann 1 kg Mehl + 600 ml Wasser… hier: nur Mehl und Salz
  while (t.rezept.zutaten.length) selbstZutatEntfernen(s, "Pizzateig", 0, "2026-10-19");
  selbstFeldSetzen(s, "Pizzateig", "neu", "Pizzamehl Typ 00", "2026-10-19");
  selbstFeldSetzen(s, "Pizzateig", "menge#0", 1000, "2026-10-19");
  selbstAusbeuteArt(s, "Pizzateig", "stueck", "2026-10-19");
  selbstFeldSetzen(s, "Pizzateig", "anzahl", 6, "2026-10-19");
  selbstFeldSetzen(s, "Pizzateig", "gewicht", 275, "2026-10-19");
  assert.equal(t.rezept.quelle, "eigen"); assert.equal(t.rezept.gewogenAm, "2026-10-19");
  assert.deepEqual(t.rezept.ausbeute, { menge: 1650, einheit: "g" });
  artikelAbgleichen(s); preis(s, "Pizzamehl Typ 00", 15, 25, "kg"); artikelAbgleichen(s);
  // 1 kg Mehl = 0,60 € → Ansatz 0,60 €, je Ballen 0,10 €, je 50 g ≈ 0,0182 €
  const w = selbstWerte(art(s, "Pizzateig"));
  assert.ok(Math.abs(w.ansatz - 0.6) < 1e-9); assert.ok(Math.abs(w.jeStueck - 0.1) < 1e-9);
  assert.ok(Math.abs(w.je50 - 0.6 / 1650 * 50) < 1e-9); assert.equal(stueckGewicht(art(s, "Pizzateig")), 275);
  // Neu anwenden überschreibt den eigenen Ansatz nicht
  selbstAnwenden(s, ["teig"]); assert.equal(art(s, "Pizzateig").rezept.quelle, "eigen");
});

test("Teil 1: Gericht mit „1 Stück Pizzateig“ rechnet über das Ballengewicht", () => {
  const s = laden(); selbstAnwenden(s, ["teig"]); s.artikel = artikelAusGerichten(s);
  const t = art(s, "Pizzateig"); t.rezept = { zutaten: [{ name: "Pizzamehl Typ 00", menge: 1, einheit: "kg" }], ausbeute: { menge: 1650, einheit: "g" }, stueck: { anzahl: 6, gewicht: 275 }, arbeitMin: 20, quelle: "eigen" };
  s.gerichte = [{ id: "p", name: "Pizza", klasse: "haupt", zeit: 5, zutaten: [{ name: "Pizzateig", menge: 1, einheit: "stk" }], preis: 8, mengeTag: 10, steuer: 0.07 }];
  s.artikel = artikelAusGerichten(s); preis(s, "Pizzamehl Typ 00", 15, 25, "kg"); s.artikel = artikelAusGerichten(s);
  const z = kalkulation(s).zeilen.find((x) => x.id === "p");
  assert.ok(Math.abs(z.waren - 0.1) < 1e-6, "Ware je Pizza 0,10 €, war " + z.waren);
});

test("Teil 1: Fehlende Mengen zeigen „bisher“, nie einen erfundenen Preis", () => {
  const s = laden(); s.gerichte = []; s.artikel = [{ name: "Knoblauchsauce", gruppe: "sauce", einheit: "g", packung: { menge: null, einheit: "g" }, preis: null, status: "offen" },
    { name: "Joghurt", gruppe: "kaese", einheit: "kg", packung: { menge: 10, einheit: "kg" }, preis: 20, preisBasis: "netto", status: "bekannt" },
    { name: "Knoblauch", gruppe: "gemuese", einheit: "kg", packung: { menge: 1, einheit: "kg" }, preis: null, preisBasis: "netto", status: "offen" }];
  assert.ok(selbstEigenUmschalten(s, "Knoblauchsauce", true));
  selbstFeldSetzen(s, "Knoblauchsauce", "neu", "Joghurt"); selbstFeldSetzen(s, "Knoblauchsauce", "menge#0", 1000);
  selbstFeldSetzen(s, "Knoblauchsauce", "neu", "Knoblauch"); selbstFeldSetzen(s, "Knoblauchsauce", "menge#1", 50);
  selbstFeldSetzen(s, "Knoblauchsauce", "ausbeute", 1050);
  const idx = Object.fromEntries(s.artikel.map((a) => [a.name, a]));
  const z = zwischenpreis(art(s, "Knoblauchsauce"), idx);
  assert.equal(z.preis, null); assert.deepEqual(z.fehlt, ["Knoblauch"]); assert.ok(Math.abs(z.bisher - 2) < 1e-9);
  // zurück auf gekauft: Einkaufspreis wie vorher (leer)
  assert.ok(selbstEigenUmschalten(s, "Knoblauchsauce", false)); assert.equal(art(s, "Knoblauchsauce").herkunft, "gekauft"); assert.equal(art(s, "Knoblauchsauce").preis, null);
});

test("Teil 2: Karton 40 Stück à 250 g – Inhalt in Gramm, Preis je Stück und je kg", () => {
  const s = laden(); s.gerichte = []; s.artikel = [{ name: "Pizzateig", gruppe: "teig", einheit: "g", packung: { menge: null, einheit: "g" }, preis: 30, preisBasis: "netto", status: "offen" }];
  packungEinheitSetzen(s, "Pizzateig", "stk");
  artikelFeldSetzen(s, "Pizzateig", "stk-anzahl", 40, "2026-10-19"); artikelFeldSetzen(s, "Pizzateig", "stk-gewicht", 250, "2026-10-19");
  const a = art(s, "Pizzateig");
  assert.deepEqual(a.packung, { menge: 10000, einheit: "g" }); assert.equal(a.stueckGewicht, 250);
  assert.ok(Math.abs(preisJeBasis(a) * 1000 - 3) < 1e-9); assert.ok(Math.abs(preisJeBasis(a) * a.stueckGewicht - 0.75) < 1e-9);
  // zurück auf kg: Stückangabe weg, Inhalt bleibt umgerechnet
  packungEinheitSetzen(s, "Pizzateig", "kg"); assert.equal(a.gebinde.stueck, undefined); assert.equal(a.packung.einheit, "kg"); assert.equal(a.packung.menge, 10);
});

test("Teil 2: Stück-Ware mit Stückgewicht kann im Rezept in Gramm stehen", () => {
  const s = laden(); s.artikel = [{ name: "Falafelbällchen", gruppe: "fleisch", einheit: "stk", packung: { menge: 50, einheit: "stk" }, preis: 10, preisBasis: "netto", status: "bekannt" }];
  artikelFeldSetzen(s, "Falafelbällchen", "stueckGewicht", 20, "2026-10-19");
  s.gerichte = [{ id: "f", name: "Falafel-Teller", klasse: "haupt", zeit: 5, zutaten: [{ name: "Falafelbällchen", menge: 100, einheit: "g" }], preis: 9, mengeTag: 5, steuer: 0.07 }];
  s.artikel = artikelAusGerichten(s);
  const z = kalkulation(s).zeilen.find((x) => x.id === "f");
  assert.ok(Math.abs(z.waren - 1) < 1e-6, "100 g = 5 Stück à 0,20 € = 1,00 €, war " + z.waren);
});

test("Einrichtung: selbst gemachtes Teil mit Startwerten zählt halb, eigener Ansatz voll", async () => {
  const { einrichtungStand } = await import("../js/einrichtung.js");
  const s = laden(); s.gerichte = [{ id: "p", name: "Pizza", klasse: "getraenk", zeit: 5, zutaten: [{ name: "Pizzateig", menge: 275, einheit: "g" }], preis: 8, mengeTag: 10, steuer: 0.07 }];
  selbstAnwenden(s, ["teig"]); artikelAbgleichen(s);
  let r = einrichtungStand(s).schritte.find((x) => x.id === "rezepte");
  assert.deepEqual(r.selbstOffen, ["Pizzateig"]); assert.equal(r.anteil, 0.75); // Gericht 1 + Teig 0,5 von 2
  selbstFeldSetzen(s, "Pizzateig", "arbeit", 15, "2026-10-19"); artikelAbgleichen(s);
  r = einrichtungStand(s).schritte.find((x) => x.id === "rezepte");
  assert.deepEqual(r.selbstOffen, []); assert.equal(r.anteil, 1);
});

test("Teil 2: Beleg „50x20g“ gibt Stück-Ware ihr Stückgewicht; Stück-Modus bleibt beim Preis-Übernehmen", async () => {
  const { journalZeile, preiseUebernehmen } = await import("../js/lieferung.js");
  const z1 = journalZeile({ name: "Falafel", bekannt: "Falafelbällchen", menge: 1, gesamt: 10, steuersatz: 0.07, inhalt: { anzahl: 50, groesse: null, einheit: "stk" }, inhaltAlt: { anzahl: 50, groesse: 20, einheit: "g" } }, "netto");
  assert.equal(z1.stueckGewicht, 20);
  const s = laden(); s.artikel = [{ name: "Falafelbällchen", gruppe: "fleisch", einheit: "stk", packung: { menge: 50, einheit: "stk" }, preis: 9, preisBasis: "netto", status: "bekannt" },
    { name: "Mozzarella", gruppe: "kaese", einheit: "kg", packung: { menge: 10000, einheit: "g" }, preis: 60, preisBasis: "netto", status: "bekannt", stueckGewicht: 250, gebinde: { art: "karton", zwischen: null, stueck: { anzahl: 40, gewicht: 250 } } }];
  const z2 = journalZeile({ name: "Mozzarella", bekannt: "Mozzarella", menge: 1, gesamt: 66, steuersatz: 0.07, inhalt: { anzahl: 40, groesse: 250, einheit: "g" } }, "netto");
  preiseUebernehmen(s, { datum: "2026-10-19", zeilen: [z1, z2] });
  assert.equal(s.artikel[0].stueckGewicht, 20);
  assert.deepEqual(s.artikel[1].gebinde.stueck, { anzahl: 40, gewicht: 250 }); assert.equal(s.artikel[1].gebinde.zwischen, null); assert.equal(s.artikel[1].preis, 66);
});
