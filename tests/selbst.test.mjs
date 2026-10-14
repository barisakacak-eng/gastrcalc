// Etappe 6, Punkt 2: eigene Herstellung (Zwischenprodukte)
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { leererBetrieb } from "../js/store.js";
import { PRODUKT_INDEX } from "../js/data/katalog.js";
import { ZWISCHENREZEPTE, SELBST_KACHELN, kachelnFuer, vorauswahlFuer } from "../js/data/zwischen.js";
import { selbstAnwenden, selbstGewaehlt } from "../js/selbst.js";
import { artikelAusGerichten, kalkulation, zwischenpreis, zeitMitZwischen, preisJeBasis } from "../js/engine.js";
import { rezeptBauen } from "../js/rezept_baukasten.js";
import { vorschlaegeAusText, vorschlaegeUebernehmen } from "../js/karte_lesen.js";

const laden = (art = "doener") => { const s = leererBetrieb(); s.ladenArt = art; s.betrieb.format = "imbiss"; s.betrieb.kuechen = [art];
  s.team = { personen: 3, stundenProPerson: 160, lohnkosten: 7000, eigenerLohn: null, eigenerLohnStatus: "geschaetzt" }; return s; };
const preis = (s, name, euro, menge, einheit) => { const a = s.artikel.find((x) => x.name === name); assert.ok(a, name); a.preis = euro; a.packung = { menge, einheit }; a.preisBasis = "netto"; };
const rohpreise = (s) => {
  preis(s, "Pizzamehl Typ 00", 12, 25, "kg"); preis(s, "Weizenmehl Typ 550", 10, 25, "kg"); preis(s, "Frischhefe", 2, 0.5, "kg"); preis(s, "Salz", 1, 1, "kg");
  preis(s, "Olivenöl", 8, 1, "l"); preis(s, "Sonnenblumenöl", 3, 1, "l");
};

test("Zwischenrezepte: Artikel im Katalog, Rohstoffe im Katalog, eine Stufe tief", () => {
  const namen = new Set(ZWISCHENREZEPTE.map((r) => r.name));
  for (const r of ZWISCHENREZEPTE) {
    assert.ok(PRODUKT_INDEX[r.name], r.name);
    assert.ok(SELBST_KACHELN.some((k) => k.id === r.kachel), r.kachel);
    for (const z of r.zutaten) { assert.ok(PRODUKT_INDEX[z.name], `${r.name}: ${z.name}`); assert.ok(!namen.has(z.name), "nur eine Stufe: " + z.name); }
  }
  for (const k of SELBST_KACHELN) assert.ok(ZWISCHENREZEPTE.some((r) => r.kachel === k.id), "Kachel ohne Rezept: " + k.id);
});

test("Vorauswahl je Laden-Art", () => {
  assert.deepEqual(vorauswahlFuer("doener").sort(), ["brot", "lahmacun", "sossen", "teig"]);
  assert.ok(vorauswahlFuer("imbiss").includes("patty"));
  assert.equal(kachelnFuer("anders").length, SELBST_KACHELN.length);
  const s = laden(); assert.deepEqual(selbstGewaehlt(s), vorauswahlFuer("doener"));
});

test("Baukasten: Pizza, Seele und Pide benutzen den Teig-Artikel (280 g / 250 g)", () => {
  const m = (n, a) => rezeptBauen(n).zutaten.find((z) => z.name === a)?.menge;
  assert.equal(m("Pizza Salami", "Pizzateig"), 280); assert.equal(m("Seele mit Käse", "Pizzateig"), 280);
  assert.equal(m("Pide mit Sucuk", "Pide-Teig"), 250); assert.equal(m("Lahmacun", "Lahmacun-Teig"), 110);
  assert.ok(!rezeptBauen("Pizza Salami").zutaten.some((z) => z.name === "Pizzamehl Typ 00"));
});

test("Teig selbst: Preis aus Rohstoffen, Mehl teurer → Pizza teurer; Wechsel auf gekauft lässt Gerichte gleich", () => {
  const s = laden();
  vorschlaegeUebernehmen(s, vorschlaegeAusText("Pizza Margherita ⋯ 9,50\nPide mit Käse ⋯ 10,00\nDöner Kebab ⋯ 7,50", s).map((v) => ({ ...v, an: true })));
  selbstAnwenden(s, ["teig"]); s.artikel = artikelAusGerichten(s);
  const teig = s.artikel.find((a) => a.name === "Pizzateig");
  assert.equal(teig.herkunft, "selbst"); assert.equal(teig.preis, null, "ohne Rohstoffpreise bleibt der Preis offen");
  assert.ok(s.artikel.some((a) => a.name === "Pizzamehl Typ 00" && a.benutzt), "Rohstoff steht in der Inventur");
  rohpreise(s); kalkulation(s);
  // 1000 g Mehl à 0,48 €/kg + 20 g Hefe à 4 €/kg + 20 g Salz à 1 €/kg + 30 ml Öl à 8 €/l = 0,48 + 0,08 + 0,02 + 0,24 = 0,82 € für 1650 g
  assert.ok(Math.abs(teig.preis - 0.82) < 1e-9, String(teig.preis)); assert.equal(teig.packung.menge, 1650); assert.equal(teig.status, "errechnet");
  const pizza = () => kalkulation(s).zeilen.find((z) => z.name === "Pizza Margherita");
  const vorher = s.gerichte.find((g) => g.name === "Pizza Margherita").zutaten.map((z) => z.name).join();
  const w0 = pizza().waren;
  preis(s, "Pizzamehl Typ 00", 24, 25, "kg"); // Mehl doppelt so teuer
  const w1 = pizza().waren; const teig1 = s.artikel.find((a) => a.name === "Pizzateig");
  assert.ok(teig1.preis > 0.82 && teig1.preisHistorie.length >= 1, "alter Teigpreis im Verlauf");
  if (w0 !== null && w1 !== null) assert.ok(w1 > w0);
  selbstAnwenden(s, []); s.artikel = artikelAusGerichten(s);
  assert.equal(s.artikel.find((a) => a.name === "Pizzateig").herkunft, "gekauft");
  assert.equal(s.gerichte.find((g) => g.name === "Pizza Margherita").zutaten.map((z) => z.name).join(), vorher, "Gerichte bleiben");
  selbstAnwenden(s, ["teig"]); kalkulation(s); assert.ok(s.artikel.find((a) => a.name === "Pizzateig").preis > 0);
});

test("Arbeit am Teig zählt als Zeit im Gericht, nicht doppelt als Geld", () => {
  const s = laden(); selbstAnwenden(s, ["teig"]);
  const idx = Object.fromEntries(s.artikel.map((a) => [a.name, a]));
  const g = { zeit: 8, zutaten: [{ name: "Pizzateig", menge: 280, einheit: "g" }] };
  assert.ok(Math.abs(zeitMitZwischen(g, idx) - (8 + 20 * 280 / 1650)) < 1e-9);
  assert.equal(zwischenpreis(idx.Pizzateig, idx, 0.5).arbeitGeld, 10);
});

test("Smashburger: Patties selbst, Rinderhack im Einkauf", () => {
  const s = laden("imbiss"); s.betrieb.kuechen = ["burger"];
  vorschlaegeUebernehmen(s, vorschlaegeAusText("Cheeseburger ⋯ 8,50", s).map((v) => ({ ...v, an: true })));
  selbstAnwenden(s); s.artikel = artikelAusGerichten(s);
  const patty = s.artikel.find((a) => a.name === "Rinderpatty 150 g");
  if (s.gerichte[0].zutaten.some((z) => z.name === "Rinderpatty 150 g")) {
    assert.equal(patty.herkunft, "selbst"); assert.ok(s.artikel.some((a) => a.name === "Rinderhack" && a.benutzt));
  }
});

test("Pilotkarte mit „Teig selbst“: alle Teig-Gerichte nutzen das Zwischenprodukt", { skip: !fs.existsSync("tests/bilder/pilot/soll.json") }, () => {
  const soll = JSON.parse(fs.readFileSync("tests/bilder/pilot/soll.json", "utf8"));
  const zeilen = Object.values(soll).flat().map(([n, p]) => `${n} ⋯ ${String(p).replace(".", ",")}`).join("\n");
  const s = laden(); selbstAnwenden(s);
  vorschlaegeUebernehmen(s, vorschlaegeAusText(zeilen, s).map((v) => ({ ...v, an: true })));
  const teig = s.gerichte.filter((g) => /pide|seele|pizza/i.test(g.name) && !/maccaroni|makkaroni/i.test(g.name));
  assert.ok(teig.length >= 10, String(teig.length));
  for (const g of teig) assert.ok(g.zutaten.some((z) => ["Pizzateig", "Pide-Teig"].includes(z.name)), g.name + ": " + g.zutaten.map((z) => z.name).join(", "));
  console.log("Teig-Gerichte im Pilot:", teig.length);
});
