// Etappe 6, Punkt 8: Rubrik, Größen, neue Familien, zwei Preise, doppelte Namen, Getränke
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { positionenAusText, vorschlaegeAusText, istGetraenk } from "../js/karte_lesen.js";
import { rezeptBauen } from "../js/rezept_baukasten.js";
import { PRODUKT_INDEX } from "../js/data/katalog.js";
import { leererBetrieb } from "../js/store.js";

const doener = () => { const s = leererBetrieb(); s.ladenArt = "doener"; s.betrieb.format = "imbiss"; s.betrieb.kuechen = ["doener"]; return s; };
const menge = (r, n) => r.zutaten.find((z) => z.name === n)?.menge;

test("Rubrik geht als Hinweis an die Gerichte darunter", () => {
  const p = positionenAusText("Pizza 32 cm\nSalami ⋯ 8,50\nDönergerichte\nYufka ⋯ 8,00");
  assert.deepEqual(p.map((x) => [x.name, x.rubrik]), [["Salami", "Pizza 32 cm"], ["Yufka", "Dönergerichte"]]);
  // zweizeilige Karte: Name ohne Preis darüber ist keine Rubrik
  const q = positionenAusText("Pizza\nDöner Kebab\n7,50");
  assert.equal(q[0].name, "Döner Kebab");
});

test("Rubrik bestimmt die Familie, wenn der Name keine hat; Pizza nach Durchmesser", () => {
  const r = rezeptBauen("Salami", { rubrik: "Pizza 32 cm" });
  assert.equal(r.familie, "pizza"); assert.ok(r.hinweise.includes("rubrik"));
  assert.equal(menge(r, "Pizzateig"), 320); // 280 × (32/30)² ≈ 319 → 320
  assert.ok(r.zutaten.some((z) => z.name === "Truthahnsalami"));
  assert.ok(rezeptBauen("Drehspieß", { rubrik: "Pizza 32 cm" }).zutaten.some((z) => z.name === "Dönerspieß Kalb/Pute"));
  assert.equal(rezeptBauen("Hühnerfleisch", { rubrik: "Gebratener Reis (mit Eiern & Gemüse)" }).familie, "asia-reis");
  assert.equal(rezeptBauen("Tofu", { rubrik: "Phở (Reisbandnudelsuppe)" }).familie, "pho");
  assert.equal(rezeptBauen("Big Kebap", { rubrik: "Kebap" }).familie, "doener"); // Name hat eine Familie, Rubrik ist kein Träger
  assert.equal(rezeptBauen("Salami"), null); // ohne Rubrik kein Rezept
});

test("Größen: Big ×1,25, XXL ×1,5, Klein ×0,75, 26/40 cm", () => {
  const basis = menge(rezeptBauen("Döner Kebab"), "Dönerspieß Kalb/Pute");
  assert.equal(menge(rezeptBauen("Big Kebap"), "Dönerspieß Kalb/Pute"), Math.round(basis * 1.25 / 5) * 5);
  assert.equal(menge(rezeptBauen("Döner XXL"), "Dönerspieß Kalb/Pute"), Math.round(basis * 1.5 / 5) * 5);
  assert.equal(menge(rezeptBauen("Pizza Margherita 26 cm"), "Pizzateig"), Math.round(280 * (26 / 30) ** 2 / 5) * 5);
  const gross = rezeptBauen("Pizza Salami 40 cm"); assert.ok(gross.zutaten.some((z) => z.name === "Pizzakarton 40 cm"));
});

test("Neue Familien: Soße, Fingerfood mit Stückzahl, Wurst, Balkan, Asia, Teigtaschen", () => {
  const f = (n) => rezeptBauen(n)?.familie;
  assert.equal(f("BBQ Soße"), "sosse"); assert.ok(rezeptBauen("Knoblauchsoße").zutaten.some((z) => z.name === "Knoblauchsauce"));
  assert.equal(f("Döner mit Soße"), "doener");
  assert.equal(menge(rezeptBauen("Chili Cheese Nuggets (12 Stk.)"), "Hähnchen-Nuggets"), 240);
  assert.equal(f("Onion Rings (8 Stk.)"), "fingerfood");
  assert.equal(f("Bratwurst / Rindswurst"), "wurst"); assert.ok(rezeptBauen("KRAKAUER vom Grill").zutaten.some((z) => z.name === "Krakauer"));
  assert.equal(menge(rezeptBauen("Qebapa 10 Stück"), "Hackfleisch gemischt"), 400);
  for (const [n, fam] of [["Pljeskavica", "pljeskavica"], ["Gyros im Fladenbrot", "gyros"], ["Iskender", "iskender"], ["Köfte", "koefte"], ["Shawarma", "shawarma"],
    ["Pad Thai", "pad-thai"], ["Ca Ri", "asia-reis"], ["Mi Xao - Gebratene Nudeln", "asia-nudeln"], ["Sambosa (1 Stück)", "teigtaschen"], ["Schaschlik", "schaschlik"],
    ["Etli Ekmek", "pide"], ["Kebab Teller", "doener-teller"], ["Döner-Auflauf", "auflauf"], ["Gebratenes Gemüse", "gemuese"], ["Macaroni Tonno", "nudeln"]]) assert.equal(f(n), fam, n);
  assert.ok(rezeptBauen("Veggie Burger").zutaten.some((z) => z.name === "Veggie-Patty"));
});

test("alle Baukasten-Zutaten stehen im Katalog", () => {
  for (const n of ["BBQ Soße", "Chili Cheese Soße", "Onion Rings", "Chicken Wings", "Krakauer", "Gyros", "Iskender", "Pad Thai", "Pho Bo", "Sambosa", "Frühlingsrolle", "Schaschlik", "Döner-Auflauf", "Gebratenes Gemüse", "Mantaplatte"])
    for (const z of rezeptBauen(n).zutaten) assert.ok(PRODUKT_INDEX[z.name], `${n}: ${z.name}`);
});

test("Zwei Preise ohne Größenwort: höherer Preis, zum Prüfen markiert", () => {
  const [p] = positionenAusText("Döner Kebab ⋯ 6,50 7,50");
  assert.equal(p.preis, 7.5); assert.ok(p.preisPruefen); assert.deepEqual(p.zweiPreise, [6.5, 7.5]);
});

test("Gleicher Name in zwei Rubriken mit anderem Preis: Rubrik kommt in den Namen", () => {
  const v = vorschlaegeAusText("Dönergerichte\nDöner im Fladenbrot ⋯ 7,00\nMittagsangebot\nDöner im Fladenbrot ⋯ 6,00", doener());
  assert.deepEqual(v.map((x) => x.name), ["Döner im Fladenbrot (Dönergerichte)", "Döner im Fladenbrot (Mittagsangebot)"]);
});

test("Getränke: Dose, Flasche, Red Bull, Rubrik Getränke", () => {
  assert.ok(istGetraenk("Cola Dose") && istGetraenk("Wasser Flasche") && istGetraenk("Red Bull"));
  const v = vorschlaegeAusText("Getränke\nUludağ Gazoz ⋯ 2,50\nPfirsich Eistee ⋯ 2,50", doener());
  assert.ok(v.every((x) => x.getraenk));
});

test("Namen 1:1: „Pad Thai“, „BBQ Soße“, „Onion Rings“, „Currywurst + Pommes“, „Ca Ri“", () => {
  const n = (z) => positionenAusText(z)[0]?.name;
  assert.equal(n("Pad Thai ⋯ 8,90"), "Pad Thai"); assert.equal(n("BBQ Soße ⋯ 1,00"), "BBQ Soße"); assert.equal(n("Onion Rings (8 Stk.) ⋯ 5,00"), "Onion Rings (8 Stk.)");
  assert.equal(n("Currywurst + Pommes ⋯ 8,00"), "Currywurst + Pommes"); assert.equal(n("Ca Ri ⋯ 15,90"), "Ca Ri"); assert.equal(n("XL Yufka ⋯ 8,90"), "XL Yufka");
  assert.equal(n("Pizza Menü ⋯ 25,00"), "Pizza Menü");
  // Fotoreste vorne bleiben weg (Pilotkarte)
  assert.equal(n("EM Vegetarische Seele ⋯ 8,00"), "Vegetarische Seele"); assert.equal(n("SUN Portion Kichererbsen ⋯ 4,00"), "Portion Kichererbsen");
});

// Lokal (nicht im Repo): Sanjis Karten, Ziel Mannheim ≥ 100 von 104, DACH ≥ 90 %
const CSV = ["tests/bilder/pilot/sanji_karten_2026-10-14.csv", "tests/bilder/pilot/sanji_karten_dach_2026-10-14.csv"];
test("Sanjis Karten: Rezept-Abdeckung", { skip: !CSV.every((f) => fs.existsSync(f)) }, () => {
  const quote = {};
  for (const f of CSV) {
    const roh = fs.readFileSync(f, "utf8").replace(/^﻿/, "").split(/\r?\n/); const kopf = roh[0].split(";");
    const [iB, iR, iN, iP] = ["betrieb_id", "rubrik", "name", "preis"].map((k) => kopf.indexOf(k));
    const zeilen = roh.slice(1).filter(Boolean).map((z) => z.split(";").map((x) => x.replace(/^"|"$/g, "").replace(/""/g, '"')));
    let n = 0, mit = 0;
    for (const b of new Set(zeilen.map((z) => z[iB]))) {
      const eig = zeilen.filter((z) => z[iB] === b); let text = "", letzte = null;
      for (const z of eig) { if (z[iR] && z[iR] !== letzte) { text += z[iR] + "\n"; letzte = z[iR]; } text += `${z[iN]} ⋯ ${/\d/.test(z[iP] || "") ? z[iP] : "9,90"}\n`; }
      const vs = vorschlaegeAusText(text, doener());
      for (const z of eig) {
        if (/getr[äa]nk/i.test(z[iR])) continue;
        const v = vs.find((x) => x.name === z[iN] || x.name.startsWith(z[iN].slice(0, 12))); if (v?.getraenk) continue;
        n++; if (v && (v.vorlage || v.bau)) mit++;
      }
    }
    quote[f] = { mit, n }; console.log(f.split("/").pop(), mit, "/", n);
  }
  assert.ok(quote[CSV[0]].mit >= quote[CSV[0]].n - 4, "Mannheim: höchstens 4 Speisen ohne Rezept (Ziel 100 von 104)");
  assert.ok(quote[CSV[1]].mit / quote[CSV[1]].n >= 0.9, "DACH ≥ 90 %");
});
