// Pilot Dönerladen 14.10.2026: 36 von 47 Gerichten bekamen kein Rezept. Diese Liste sind GENERISCHE Kartennamen (keine Pilotdaten),
// Deutsch und Türkisch gemischt, Größen und Preise schon abgezogen. Jeder Name muss eine Familie und Zutaten aus dem Katalog bekommen.
import test from "node:test";
import assert from "node:assert/strict";
import { rezeptBauen, BEREICH_JE_FAMILIE } from "../js/rezept_baukasten.js";
import { PRODUKT_INDEX } from "../js/data/katalog.js";

// NAMEN-START (tmp/abdeckung.mjs liest diesen Block)
const NAMEN = [
  "Pide mit Käse", "Peynirli Pide", "Kaşarlı Pide", "Kıymalı Pide", "Kiymali Pide", "Pide mit Hackfleisch",
  "Sucuklu Pide", "Pide mit Sucuk und Käse", "Ispanaklı Pide", "Pide mit Spinat und Feta", "Yumurtalı Pide", "Pide mit Ei",
  "Pide mit Dönerfleisch", "Kuşbaşılı Pide", "Karışık Pide", "Pide gemischt",
  "Seele mit Schinken und Käse", "Seele mit Sucuk", "Steinofen-Seele mit Tomate und Mozzarella",
  "Maccaroni im Ofen", "Makkaroni überbacken mit Hackfleisch", "Nudeln mit Dönerfleisch im Ofen",
  "Falafel Dürüm", "Falafel Box", "Falafel Teller",
  "Vegan Dürüm", "Gemüse-Dürüm", "Halloumi Dürüm", "Halloumi Teller", "Halloumi im Brot",
  "Extra Käse", "Extra Fleisch", "Extra Soße", "Extra Feta", "Extra Pommes", "Extra Sucuk",
  "Lahmacun mit Salat", "Lahmacun mit Dönerfleisch", "Lahmacun mit Käse", "Lahmacun mit Salat und Soße",
  "Pizza-Brötchen", "Pizzabrötchen mit Käse", "Pizzabrötchen 6 Stück",
  "Peynirli Börek", "Ispanaklı Börek", "Kıymalı Börek", "Börek mit Spinat", "Sigara Böreği", "Su Böreği",
];
// NAMEN-ENDE

const hat = (r, re) => r.zutaten.some((z) => re.test(z.name));
const menge = (r, n) => r.zutaten.find((z) => z.name === n)?.menge;

test("Pilot-Namen: jeder bekommt Familie, Bereich und Zutaten aus dem Katalog", () => {
  for (const n of NAMEN) {
    const r = rezeptBauen(n);
    assert.ok(r, `${n}: kein Rezept`);
    assert.ok(r.familie && BEREICH_JE_FAMILIE[r.familie], `${n}: Familie ${r.familie} ohne Bereich`);
    assert.ok(r.zutaten.length, `${n}: leere Zutaten`);
    assert.equal(r.quelle, "baukasten", n); // Startwert, keine Messung
    for (const z of r.zutaten) { assert.ok(PRODUKT_INDEX[z.name], `${n}: ${z.name} fehlt im Katalog`); assert.ok(z.menge > 0, `${n}: ${z.name}`); }
  }
});

test("Pide mit X: Teig + Belag, türkische Schreibweisen", () => {
  for (const n of ["Peynirli Pide", "Kaşarlı Pide", "Pide mit Käse"]) { const r = rezeptBauen(n); assert.equal(r.familie, "pide", n); assert.ok(hat(r, /pizzakäse|feta/i), n); }
  for (const n of ["Kıymalı Pide", "Kiymali Pide", "Pide mit Hackfleisch"]) assert.ok(hat(rezeptBauen(n), /hack/i), n);
  assert.ok(hat(rezeptBauen("Sucuklu Pide"), /^Sucuk$/));
  assert.ok(hat(rezeptBauen("Ispanaklı Pide"), /spinat/i));
  assert.ok(hat(rezeptBauen("Yumurtalı Pide"), /^Eier$/));
  assert.ok(hat(rezeptBauen("Kuşbaşılı Pide"), /kalb|rind|geschnetzelt/i));
  for (const n of ["Karışık Pide", "Pide gemischt"]) { const r = rezeptBauen(n); assert.ok(r.zutaten.filter((z) => /sucuk|hack|dönerspieß|schinken|salami/i.test(z.name)).length >= 2, n); assert.ok(hat(r, /pizzakäse/i), n); }
  for (const n of NAMEN.filter((x) => /pide/i.test(x))) assert.equal(menge(rezeptBauen(n), "Pide-Teig"), 250, n);
});

test("Lahmacun mit X: Grundrezept bleibt, Belag kommt dazu", () => {
  const basis = rezeptBauen("Lahmacun");
  const salat = rezeptBauen("Lahmacun mit Salat"); assert.equal(salat.familie, "lahmacun"); assert.ok(hat(salat, /eisberg/i)); assert.equal(menge(salat, "Lahmacun-Teig"), menge(basis, "Lahmacun-Teig"));
  assert.ok(hat(rezeptBauen("Lahmacun mit Dönerfleisch"), /dönerspieß/i));
  assert.ok(hat(rezeptBauen("Lahmacun mit Käse"), /pizzakäse/i));
});

test("Seele, Nudeln im Ofen, Pizzabrötchen", () => {
  const s = rezeptBauen("Seele mit Sucuk"); assert.equal(s.familie, "seele"); assert.ok(hat(s, /^Sucuk$/));
  for (const n of ["Maccaroni im Ofen", "Makkaroni überbacken mit Hackfleisch", "Nudeln mit Dönerfleisch im Ofen"]) {
    const r = rezeptBauen(n); assert.equal(r.familie, "nudeln", n); assert.ok(hat(r, /penne/i) && hat(r, /pizzakäse/i), n);
  }
  assert.ok(hat(rezeptBauen("Makkaroni überbacken mit Hackfleisch"), /hack/i));
  const pb = rezeptBauen("Pizza-Brötchen"); assert.equal(pb.familie, "pizzabroetchen"); assert.ok(hat(pb, /pizzateig/i));
  assert.equal(menge(pb, "Pizzateig"), 210); // ohne Angabe 6 × 35 g
  assert.equal(menge(rezeptBauen("Pizzabrötchen 8 Stück"), "Pizzateig"), 280);
});

test("Keine Nebenwirkungen: gemischter Salat, Döner-Auflauf, Wörter mit Fleisch", () => {
  assert.equal(rezeptBauen("Gemischter Salat").familie, "salat");
  assert.ok(!hat(rezeptBauen("Gemischter Salat"), /sucuk|hack/i));
  assert.equal(rezeptBauen("Döner-Auflauf").familie, "auflauf");
  assert.ok(hat(rezeptBauen("Hähnchen Auflauf"), /hähnchen/i));
  assert.equal(rezeptBauen("Nudelauflauf").familie, "nudeln");
  assert.equal(rezeptBauen("Pide mit Dönerfleisch").zutaten.filter((z) => z.name === "Dönerspieß Kalb/Pute").length, 1);
  assert.ok(!hat(rezeptBauen("Pizza mit Rindfleisch"), /dönerspieß/i));
});

test("Falafel und vegan: kein Fleisch", () => {
  assert.equal(rezeptBauen("Falafel Dürüm").familie, "falafel-wrap");
  assert.equal(rezeptBauen("Falafel Box").familie, "falafel-box");
  assert.equal(rezeptBauen("Falafel Teller").familie, "falafel-teller");
  for (const n of ["Falafel Box", "Vegan Dürüm", "Gemüse-Dürüm", "Halloumi Dürüm", "Halloumi Teller", "Halloumi im Brot"]) {
    const r = rezeptBauen(n); assert.ok(!hat(r, /spieß|hack|sucuk|fleisch/i), `${n}: Fleisch drin`);
  }
  for (const n of ["Halloumi Dürüm", "Halloumi Teller", "Halloumi im Brot"]) assert.ok(hat(rezeptBauen(n), /^Halloumi$/), n);
  assert.ok(!hat(rezeptBauen("Vegan Dürüm"), /käse|feta|halloumi|joghurt|knoblauch/i));
});

test("Extras: kleine Portion ohne Verpackung", () => {
  const ex = (n) => rezeptBauen(n);
  assert.equal(menge(ex("Extra Käse"), "Pizzakäse gerieben"), 30);
  assert.ok(menge(ex("Extra Fleisch"), "Dönerspieß Kalb/Pute") <= 60);
  assert.ok(hat(ex("Extra Feta"), /feta/i));
  assert.ok(hat(ex("Extra Pommes"), /pommes/i));
  assert.ok(hat(ex("Extra Soße"), /sauce/i));
  for (const n of ["Extra Käse", "Extra Fleisch", "Extra Feta", "Extra Sucuk"]) assert.ok(!hat(ex(n), /tüte|schale|karton|folie/i), n);
});

test("Börek-Varianten: Füllung nach Name", () => {
  for (const n of ["Peynirli Börek", "Ispanaklı Börek", "Kıymalı Börek", "Börek mit Spinat", "Sigara Böreği", "Su Böreği"]) assert.equal(rezeptBauen(n).familie, "boerek", n);
  assert.ok(hat(rezeptBauen("Ispanaklı Börek"), /spinat/i));
  assert.ok(hat(rezeptBauen("Kıymalı Börek"), /hack/i));
  assert.ok(!hat(rezeptBauen("Kıymalı Börek"), /feta/i)); // Füllung ersetzt den Käse
  assert.ok(hat(rezeptBauen("Peynirli Börek"), /feta/i));
});
