// Stufe 1 (17.10.2026): Kombi-Deal-Rechner – Summe, Wareneinsatz, drei Stufen auf 50 Cent, nie unter Wareneinsatz, Break-even-Mehrmenge,
// Richtwert-Warnung (eigene Quote vor Branchen-Richtwert), Teilen-Text, ungültige Auswahl, automatische Vorschläge im Beispiel-Laden.
import test from "node:test";
import assert from "node:assert/strict";
const st = await import("../js/store.js");
const d = await import("../js/deal.js");
const { RICHTWERT_WARENEINSATZ, tagPlus } = await import("../js/engine.js");
const { beispielLaden } = await import("../js/beispiel.js");
const i18n = await import("../js/i18n.js");
i18n.setzeSprache("de");

const H = "2026-10-17";
const nah = (x, y, eps = 1e-6) => assert.ok(Math.abs(x - y) <= eps, `${x} ≠ ${y}`);

// Döner 8,00 € (7 %, Fleisch 200 g), Pommes 3,50 € (7 %, 200 g), Ayran 2,00 € (19 %, 1 Stück), Cola 2,50 €, Salat 5,00 €
function laden({ fleischJeKg = 10 } = {}) {
  const s = st.leererBetrieb(); s.phase = "app";
  s.gerichte = [
    { id: "d", name: "Döner", preis: 8, klasse: "haupt", steuer: 0.07, zutaten: [{ name: "Fleisch", menge: 200, einheit: "g" }] },
    { id: "p", name: "Pommes frites (Beilage)", preis: 3.5, klasse: "kleinigkeit", steuer: 0.07, zutaten: [{ name: "Pommes", menge: 200, einheit: "g" }] },
    { id: "a", name: "Ayran", preis: 2, klasse: "getraenk", steuer: 0.19, zutaten: [{ name: "Ayran", menge: 1, einheit: "stk" }] },
    { id: "c", name: "Cola", preis: 2.5, klasse: "getraenk", steuer: 0.19, zutaten: [{ name: "Cola", menge: 1, einheit: "stk" }] },
    { id: "s", name: "Salat", preis: 5, klasse: "haupt", steuer: 0.07, zutaten: [{ name: "Salat", menge: 300, einheit: "g" }] },
    { id: "x", name: "Ohne Rezept", preis: 4, klasse: "haupt", steuer: 0.07, zutaten: [] },
  ];
  s.artikel = [
    { name: "Fleisch", gruppe: "fleisch", einheit: "kg", packung: { menge: 1, einheit: "kg" }, preis: fleischJeKg, preisBasis: "netto" },
    { name: "Pommes", gruppe: "gemuese", einheit: "kg", packung: { menge: 1, einheit: "kg" }, preis: 2, preisBasis: "netto" },
    { name: "Ayran", gruppe: "getraenk", einheit: "stk", packung: { menge: 20, einheit: "stk" }, preis: 9, preisBasis: "netto" },
    { name: "Cola", gruppe: "getraenk", einheit: "stk", packung: { menge: 24, einheit: "stk" }, preis: 12, preisBasis: "netto" },
    { name: "Salat", gruppe: "gemuese", einheit: "kg", packung: { menge: 1, einheit: "kg" }, preis: 3, preisBasis: "netto" },
  ];
  return st.migrierenBetrieb(s);
}

test("Kombi: Summe, Wareneinsatz, drei Stufen (5/10/15 %) auf 50 Cent, Rohertrag, Break-even-Mehrmenge", () => {
  const s = laden(); const k = d.kombiRechnen(s, ["d", "p", "a"]);
  assert.equal(k.ungueltig, false); nah(k.summe, 13.5); nah(k.waren, 2 + 0.4 + 0.45);
  const Snet = 8 / 1.07 + 3.5 / 1.07 + 2 / 1.19; nah(k.summeNetto, Snet); nah(k.rohertrag, Snet - 2.85); nah(k.quoteEinzeln, 2.85 / Snet);
  assert.deepEqual(k.stufen.map((x) => x.stufe), ["vorsichtig", "normal", "stark"]);
  assert.deepEqual(k.stufen.map((x) => x.preis), [13, 12, 11.5]); // 12,825 → 13,00 · 12,15 → 12,00 · 11,475 → 11,50
  for (const x of k.stufen) {
    nah(x.rabatt, 13.5 - x.preis); nah(x.rabattProzent, (13.5 - x.preis) / 13.5);
    nah(x.netto, x.preis * Snet / 13.5); nah(x.rohertrag, x.preis * Snet / 13.5 - 2.85); nah(x.rohertragWeniger, k.rohertrag - x.rohertrag);
    nah(x.mehrAnteil, (k.rohertrag - x.rohertrag) / x.rohertrag); assert.equal(x.jeZehn, Math.ceil(10 * x.mehrAnteil - 1e-9));
    assert.equal(x.warnung, null, "26 % < 32 %"); assert.equal(x.amBoden, false);
  }
  assert.equal(k.stufen[1].jeZehn, 2); // (9,578 − 8,197) / 8,197 = 16,8 % → je 10 Verkäufe 2 Kombis mehr
  assert.ok(k.stufen[0].rohertrag > k.stufen[1].rohertrag && k.stufen[1].rohertrag > k.stufen[2].rohertrag);
  assert.deepEqual(d.RABATT_STUFEN.map((x) => x.rabatt), [0.05, 0.1, 0.15]);
});

test("Kombi: nie unter Wareneinsatz – Preis am Boden oder Stufe nicht möglich", () => {
  const teuer = d.kombiRechnen(laden({ fleischJeKg: 55 }), ["d", "p", "a"]); // Ware 11,85 € netto → mindestens 13,00 €
  assert.deepEqual(teuer.stufen.map((x) => x.preis), [13, 13, 13]); assert.deepEqual(teuer.stufen.map((x) => x.amBoden), [false, true, true]);
  for (const x of teuer.stufen) assert.ok(x.netto >= teuer.waren - 1e-9, "netto ≥ Ware");
  const zuTeuer = d.kombiRechnen(laden({ fleischJeKg: 60 }), ["d", "p", "a"]);
  assert.ok(zuTeuer.stufen.every((x) => x.moeglich === false), JSON.stringify(zuTeuer.stufen));
  for (const kg of [5, 10, 20, 30, 40, 50]) for (const x of d.kombiRechnen(laden({ fleischJeKg: kg }), ["d", "p", "a"]).stufen) if (x.moeglich) {
    assert.ok(x.netto >= (2 + 0.4 + 0.45 - 2) + kg * 0.2 - 1e-9, `${kg}: ${x.preis}`); assert.ok(x.preis <= 13.0 + 1e-9, "mindestens 50 Cent Rabatt");
    assert.ok(Math.abs(x.preis * 2 - Math.round(x.preis * 2)) < 1e-9, "50-Cent-Stufe");
  }
});

test("Kombi: Warnung über dem Richtwert des Ladens – eigene Quote vor Branchen-Richtwert (≈ 32 %)", () => {
  const s = laden({ fleischJeKg: 18 }); // Ware 4,45 € → Quote je Stufe über 32 %
  const k = d.kombiRechnen(s, ["d", "p", "a"]);
  assert.deepEqual(k.grenze, { quote: RICHTWERT_WARENEINSATZ.quote, quelle: "richtwert", geschaetzt: true });
  const w = k.stufen.find((x) => x.warnung); assert.ok(w, JSON.stringify(k.stufen.map((x) => x.quote)));
  assert.equal(w.warnung.grenze, 0.32); assert.ok(w.warnung.quote > 0.32);
  s.verkauf.warenQuote = 0.5; const eigen = d.kombiRechnen(s, ["d", "p", "a"]);
  assert.equal(eigen.grenze.quelle, "eigen"); assert.ok(eigen.stufen.every((x) => x.warnung === null));
  s.verkauf.warenQuote = 0.2; assert.ok(d.kombiRechnen(laden(), ["d", "p", "a"]).stufen.every((x) => x.warnung === null));
  const streng = laden(); streng.verkauf.warenQuote = 0.2; assert.ok(d.kombiRechnen(streng, ["d", "p", "a"]).stufen.every((x) => x.warnung && x.warnung.quelle === "eigen"));
});

test("Kombi: Teilen-Text, Klammerzusatz weg; ungültige Auswahl; Gerichte ohne Preis/Rezept zählen nicht", () => {
  const s = laden(); const k = d.kombiRechnen(s, ["d", "p", "a"]);
  assert.equal(d.kombiText(k, k.stufen[1]), "Döner + Pommes frites + Ayran nur 12,00 €");
  assert.equal(d.kombiRechnen(s, ["d"]).ungueltig, true); assert.equal(d.kombiRechnen(s, ["d", "p", "a", "c", "s"]).ungueltig, true);
  const mitX = d.kombiRechnen(s, ["d", "x"]); assert.equal(mitX.ungueltig, true); assert.deepEqual(mitX.fehlt, ["x"]);
  const vier = d.kombiRechnen(s, ["d", "p", "a", "x", "c"]); assert.equal(vier.ungueltig, false); assert.deepEqual(vier.fehlt, ["x"]); assert.equal(vier.teile.length, 4);
  assert.equal(d.kombiRechnen(s, ["d", "d", "p"]).teile.length, 2, "doppelt zählt einmal");
});

test("Vorschläge: Renner (Haupt + Beilage + Getränk), mit Abverkaufs-Ware, ohne Kombis über 50 % Ware – Beispiel-Laden an jedem Wochentag", () => {
  for (let i = 0; i < 7; i++) {
    const h = tagPlus(H, i); const s = beispielLaden(h); const v = d.kombiVorschlaege(s, { heuteTag: h });
    assert.ok(v.length >= 2 && v.length <= 3, `${h}: ${v.length}`);
    assert.equal(v[0].grund, "renner"); assert.deepEqual(v[0].kombi.teile.map((x) => x.name), ["Döner Kebab", "Pommes frites (Beilage)", "Cola 0,33 l"]);
    const ab = v.find((x) => x.grund === "abverkauf"); assert.ok(ab, h); assert.equal(ab.ware, "Ayran 0,25 l"); assert.ok(ab.kombi.teile.some((x) => x.name === "Ayran 0,25 l"));
    for (const x of v) { const n = x.kombi.stufen.find((y) => y.stufe === "normal"); assert.ok(n.rohertrag > 0 && n.quote < 0.5, JSON.stringify(n)); }
    assert.ok(!v.some((x) => x.kombi.teile.some((y) => y.name === "Adana-Spieß")), "Ladenhüter mit 90 % Ware lohnt nicht");
    assert.equal(new Set(v.map((x) => x.ids.slice().sort().join())).size, v.length, "keine doppelten Vorschläge");
  }
  const s = beispielLaden(H); const ab = d.kombiVorschlaege(s, { heuteTag: H }).find((x) => x.grund === "abverkauf");
  assert.equal(d.kombiText(ab.kombi, ab.kombi.stufen[1]), "Döner Kebab + Pommes frites + Ayran 0,25 l nur 12,00 €");
  assert.deepEqual(d.kombiVorschlaege(laden(), { heuteTag: H }).map((x) => x.grund).slice(0, 1), ["renner"], "eigener Laden ohne Verkäufe: Rang nach Karte");
});
