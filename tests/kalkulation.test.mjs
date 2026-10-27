// Tests für die Kartenkalkulation (Etappe 2). Beispiel: Dönerladen mit zwei Gerichten.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../js/engine.js";

const nah = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

const artikel = [
  { name: "Dönerspieß Kalb/Pute", gruppe: "fleisch", einheit: "kg", packung: { menge: 10, einheit: "kg" }, preis: 74.5, status: "bekannt", garverlust: { wert: 0.15 } },
  { name: "Dönerbrot / Fladen", gruppe: "teig", einheit: "stk", packung: { menge: 100, einheit: "stk" }, preis: 41, status: "bekannt" },
  { name: "Dönertüte", gruppe: "verpackung", einheit: "stk", packung: { menge: 1000, einheit: "stk" }, preis: 29, status: "bekannt" },
  { name: "Cola 0,33 l", gruppe: "getraenk", einheit: "stk", packung: { menge: 24, einheit: "stk" }, preis: 14.4, status: "bekannt" },
];
const stand = () => ({
  betrieb: { tageProWoche: 6, monate: 12 },
  team: { personen: 3, stundenProPerson: 160, lohnkosten: 6000, eigenerLohn: null, eigenerLohnStatus: "offen" }, // eigener Lohn offen: die Zahlen unten rechnen ohne ihn
  kosten: [ { kategorie: "miete", betrag: 2000, status: "bekannt", periode: "monat" } ],
  kanaele: { portale: [ { name: "Lieferando", provision: 30, basis: "unbekannt" } ] },
  verkauf: { zielgewinn: 10, bestellungenTag: 200 },
  artikel: structuredClone(artikel),
  gerichte: [
    { id: "d", name: "Döner", klasse: "haupt", zeit: 4, preis: 7.5, mengeTag: 150, zutaten: [ { name: "Dönerspieß Kalb/Pute", menge: 180, einheit: "g" }, { name: "Dönerbrot / Fladen", menge: 1, einheit: "stk" }, { name: "Dönertüte", menge: 1, einheit: "stk" } ] },
    { id: "c", name: "Cola", klasse: "getraenk", zeit: 0.5, preis: 2.5, zutaten: [ { name: "Cola 0,33 l", menge: 1, einheit: "stk" } ] },
  ],
});

test("preisJeBasis: Packung auf Basiseinheit", () => {
  nah(E.preisJeBasis(artikel[0]), 74.5 / 10000); // € je Gramm
  nah(E.preisJeBasis(artikel[1]), 0.41);
  assert.equal(E.preisJeBasis({ preis: null, packung: { menge: 1, einheit: "kg" } }), null);
  assert.equal(E.preisJeBasis({ preis: 5, packung: { menge: null, einheit: "kg" } }), null);
});

test("Garverlust: Messung schlägt Schätzung, nie in den Schwund", () => {
  assert.deepEqual(E.garverlustAnteil({ garverlust: { wert: 0.15 } }), { wert: 0.15, status: "geschaetzt" });
  const g = E.garverlustAnteil({ garverlust: { wert: 0.15, roh: 10, gar: 8 } });
  assert.equal(g.status, "gemessen"); nah(g.wert, 0.2);
  assert.equal(E.garverlustAnteil({}).status, "keiner");
});

test("warenGericht: Rohmenge mit Garverlust, fehlende Preise werden gemeldet", () => {
  const idx = Object.fromEntries(artikel.map((a) => [a.name, a]));
  const w = E.warenGericht(stand().gerichte[0], idx);
  const erwartet = (180 / 0.85) * (74.5 / 10000) + 0.41 + 0.029;
  nah(w.waren, erwartet); assert.equal(w.vollstaendig, true); assert.equal(w.geschaetzt, true);
  const w2 = E.warenGericht({ zutaten: [ { name: "Gibt es nicht", menge: 1, einheit: "stk" } ] }, idx);
  assert.equal(w2.vollstaendig, false); assert.deepEqual(w2.fehlt, ["Gibt es nicht"]);
});

test("mengenJeMonat: Bestseller mit Tageszahl, Rest teilt sich den Rest", () => {
  const s = stand(); const m = E.mengenJeMonat(s);
  const tage = 6 * 52 / 12;
  nah(m.mengen.d, 150 * tage); nah(m.mengen.c, 50 * tage); assert.equal(m.geschaetzt, true);
  s.gerichte[1].mengeTag = 50; assert.equal(E.mengenJeMonat(s).geschaetzt, false);
});

test("kalkulation: Selbstkosten, Zielpreis, Portalpreis, Ampel", () => {
  const s = stand(); const k = E.kalkulation(s);
  const d = k.zeilen.find((z) => z.id === "d"), c = k.zeilen.find((z) => z.id === "c");
  // Fixkosten + Lohn = 8000 im Monat, verteilt nach Äquivalenzziffern (1,0 und 0,3) über die Mengen
  const tage = 26; const nenner = 150 * tage * 1.0 + 50 * tage * 0.3;
  nah(d.fix, 8000 / nenner * 1.0); nah(c.fix, 8000 / nenner * 0.3);
  nah(d.fix * 150 * tage + c.fix * 50 * tage, 8000, 1e-6); // alles verteilt
  // Zeitzuschlag: Σ q·z = 0
  nah(d.zeit * 150 * tage + c.zeit * 50 * tage, 0, 1e-6);
  // Selbstkosten und Zielpreis
  // 27.10.2026 (F2): Anteile summieren sich genau auf die Monatskosten, auch wenn ein Gericht unten bei 0 abgeschnitten wird
  nah((d.sk - d.waren) * 150 * tage + (c.sk - c.waren) * 50 * tage, 8000, 1e-6); assert.ok(d.sk <= d.waren + d.fix + d.zeit + 1e-9); nah(d.zielNetto, d.sk / 0.9); nah(d.zielBrutto, E.aufrunden10Cent(d.zielNetto * 1.07).gerundet); assert.ok(d.zielAufschlag >= 0 && d.zielAufschlag < 0.1);
  assert.equal(d.mwst, 0.07); assert.equal(c.mwst, 0.19);
  // Portal: Basis unbekannt -> brutto, 30 %: netto = SK / (1 − 0,1 − 0,3·1,07)
  nah(d.portalBrutto, d.sk / (1 - 0.1 - 0.3 * 1.07) * 1.07); assert.equal(d.portalName, "Lieferando");
  // Ampel gegen heutigen Preis
  assert.ok(["gruen", "gelb", "rot"].includes(d.ampel));
  s.gerichte[0].preis = 1; assert.equal(E.kalkulation(s).zeilen[0].ampel, "rot");
  s.gerichte[0].preis = 100; assert.equal(E.kalkulation(s).zeilen[0].ampel, "gruen");
  s.gerichte[0].preis = null; assert.equal(E.kalkulation(s).zeilen[0].ampel, "grau");
  // Fehlender Einkaufspreis -> grau, Gericht meldet die Zutat
  s.gerichte[0].preis = 7.5; s.artikel[1].preis = null;
  const z = E.kalkulation(s).zeilen[0]; assert.equal(z.ampel, "grau"); assert.deepEqual(z.warenFehlt, ["Dönerbrot / Fladen"]);
});

test("artikelAusGerichten: ein Artikel je Zutat, Garverlust-Start nur für Fleisch und Fisch, Preise bleiben", () => {
  const s = stand(); s.artikel = [ { name: "Dönerbrot / Fladen", gruppe: "teig", einheit: "stk", packung: { menge: 100, einheit: "stk" }, preis: 41, status: "bekannt" } ];
  const a = E.artikelAusGerichten(s);
  assert.equal(a.length, 4);
  assert.equal(a.find((x) => x.name === "Dönerbrot / Fladen").preis, 41);
  assert.deepEqual(a.find((x) => x.name === "Dönerspieß Kalb/Pute").garverlust, { wert: 0.15 });
  assert.equal(a.find((x) => x.name === "Dönertüte").garverlust, undefined);
  assert.equal(a.find((x) => x.name === "Dönertüte").gruppe, "verpackung");
});

test("Gericht ohne Rezept bleibt grau, nicht grün mit 0 €", () => {
  const s = stand(); s.gerichte.push({ id: "x", name: "Leer", klasse: "haupt", zeit: 5, preis: 9, zutaten: [] });
  const z = E.kalkulation(s).zeilen.find((q) => q.id === "x");
  assert.equal(z.ampel, "grau"); assert.deepEqual(z.warenFehlt, ["rezept"]);
});

test("Review Etappe 2: Menge fehlt oder Einheit passt nicht -> Zutat fehlt, kein 0-€-Posten", () => {
  const idx = Object.fromEntries(artikel.map((a) => [a.name, a]));
  assert.deepEqual(E.warenGericht({ zutaten: [ { name: "Cola 0,33 l", menge: null, einheit: "stk" } ] }, idx).fehlt, ["Cola 0,33 l"]);
  assert.deepEqual(E.warenGericht({ zutaten: [ { name: "Dönerbrot / Fladen", menge: 100, einheit: "g" } ] }, idx).fehlt, ["Dönerbrot / Fladen"]);
});
test("Review Etappe 2: Selbstkosten nie unter dem Wareneinsatz (Befund 1 Untergrenze)", () => {
  const s = stand(); s.gerichte[1].zeit = 0.1; s.gerichte[0].zeit = 30; // Cola bekommt stark negativen Zeitzuschlag
  const c = E.kalkulation(s).zeilen.find((z) => z.id === "c");
  assert.ok(c.sk >= c.waren - 1e-9, `${c.sk} < ${c.waren}`);
});
test("Review Etappe 2: Ziel ab 85 % -> kein Zielpreis, Ampel grau, Stufe Sperre", () => {
  const s = stand(); s.verkauf.zielgewinn = 90;
  const k = E.kalkulation(s); assert.equal(k.zielStufe, "sperre");
  assert.equal(k.zeilen[0].zielBrutto, null); // 19.10.2026: Ampel hängt am Gewinn nach allen Kosten, nicht am Zielpreis
  s.verkauf.zielgewinn = 70; assert.equal(E.kalkulation(s).zielStufe, "warnung");
});
test("Ampel (19.10.2026): Gewinn nach allen Kosten – rot unter 10 %, gelb 10 bis unter 19 %, grün ab 19 %", () => {
  const s = stand(); const d0 = E.kalkulation(s).zeilen[0];
  const skCent = Math.round(d0.sk * 100) / 100; // preisAmpel rechnet auf den Cent (27.10.2026: Selbstkosten nicht mehr glatt)
  const preisFuer = (q) => Math.ceil((skCent / (1 - q) + 0.005) * (1 + d0.mwst) * 100) / 100; // kleinster Bruttopreis mit Gewinnquote ≥ q
  assert.equal(E.preisAmpel(d0, preisFuer(0.19)).ampel, "gruen");
  assert.equal(E.preisAmpel(d0, preisFuer(0.19) - 0.02).ampel, "gelb");
  assert.equal(E.preisAmpel(d0, preisFuer(0.10)).ampel, "gelb");
  assert.equal(E.preisAmpel(d0, preisFuer(0.10) - 0.02).ampel, "rot");
  assert.equal(E.preisAmpel(d0, preisFuer(0) - 0.05).ampel, "rot", "unter Selbstkosten");
  s.gerichte[0].preis = preisFuer(0.25); assert.equal(E.kalkulation(s).zeilen[0].ampel, "gruen", "Kalkulation nutzt dieselbe Ampel");
  const t = E.preisAufteilung(d0, E.kalkulation(s).last, preisFuer(0.25));
  const summe = t.ware + t.personal + t.miete + t.neben + t.steuer + t.gewinn;
  assert.ok(Math.abs(summe - preisFuer(0.25)) < 0.02, "Teile ergeben den Preis: " + summe);
  assert.ok(t.ware > 0 && t.gewinn > 0 && t.steuer > 0);
});
test("Review Etappe 2: Einheit wechseln rechnet um", () => {
  nah(E.mengeUmrechnen(180, "g", "kg"), 0.18); nah(E.mengeUmrechnen(10, "kg", "g"), 10000); nah(E.mengeUmrechnen(0.5, "l", "ml"), 500);
  assert.equal(E.mengeUmrechnen(null, "g", "kg"), null); assert.equal(E.mengeUmrechnen(3, "stk", "stk"), 3);
});
test("Review Etappe 2: eingetragene Preise überleben das Löschen eines Gerichts", () => {
  const s = stand(); s.gerichte = [s.gerichte[0]]; // Cola weg
  const a = E.artikelAusGerichten(s);
  const cola = a.find((x) => x.name === "Cola 0,33 l"); assert.equal(cola.preis, 14.4); assert.equal(cola.benutzt, false);
  assert.equal(a.find((x) => x.name === "Dönertüte").benutzt, true);
});
test("Review Etappe 2: Steuersatz hängt am Gericht, nicht an der Klasse", () => {
  const s = stand(); s.gerichte[1].steuer = 0.19; s.gerichte[1].klasse = "kleinigkeit";
  assert.equal(E.kalkulation(s).zeilen.find((z) => z.id === "c").mwst, 0.19);
  assert.equal(E.steuersatzAusZutaten([{ name: "Cola 0,33 l" }]), 0.19); assert.equal(E.steuersatzAusZutaten([{ name: "Tomaten" }]), 0.07);
});
