// Inventur (Punkt 3): Werte, Viertel, erste gegen zweite Inventur, fehlende Preise, Zeiträume, stornierte Belege.
import test from "node:test";
import assert from "node:assert/strict";
import * as I from "../js/inventur.js";
import { leererBetrieb, migrierenBetrieb, verschmelzen } from "../js/store.js";
import { warenQuote } from "../js/zaehler.js";

const nah = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

function laden() {
  const b = leererBetrieb();
  b.betrieb = { name: "Test", format: "imbiss", kuechen: ["doener"], tageProWoche: 6, monate: 12, steuerSatz: 0.07 };
  b.artikel = [
    { name: "Dönerspieß Kalb/Pute", gruppe: "fleisch", einheit: "kg", packung: { menge: 15, einheit: "kg" }, gebinde: { art: "packung", zwischen: null }, preis: 96, preisBasis: "netto", preisHistorie: [] },
    { name: "Dönerbrot / Fladen", gruppe: "teig", einheit: "stk", packung: { menge: 30, einheit: "stk" }, gebinde: { art: "karton", zwischen: null }, preis: 13.5, preisBasis: "netto", preisHistorie: [] },
    { name: "Tomaten", gruppe: "gemuese", einheit: "kg", packung: { menge: 6, einheit: "kg" }, gebinde: { art: "kiste", zwischen: null }, preis: 10.7, preisBasis: "brutto", preisHistorie: [] }, // brutto 7 % → 10 netto
    { name: "Pommes frites", gruppe: "teig", einheit: "kg", packung: { menge: 10, einheit: "kg" }, gebinde: { art: "karton", zwischen: null }, preis: null, preisBasis: "netto", preisHistorie: [] },
    { name: "Dönertüte", gruppe: "verpackung", einheit: "stk", packung: { menge: 1000, einheit: "stk" }, gebinde: { art: "karton", zwischen: null }, preis: 40, preisBasis: "netto", preisHistorie: [] },
    { name: "Müllbeutel", gruppe: "verpackung", einheit: "stk", packung: { menge: 25, einheit: "stk" }, gebinde: { art: "packung", zwischen: null }, preis: 4, preisBasis: "netto", preisHistorie: [] },
    { name: "Ayran", gruppe: "getraenk", einheit: "l", packung: { menge: 6, einheit: "l" }, gebinde: { art: "karton", zwischen: null }, preis: 9.6, preisBasis: "netto", preisHistorie: [] },
  ];
  b.gerichte = [
    { id: "d", name: "Döner", bereich: "doener", klasse: "haupt", zeit: 3, preis: 7.49, mengeTag: 100, steuer: 0.07,
      zutaten: [{ name: "Dönerspieß Kalb/Pute", menge: 150, einheit: "g" }, { name: "Dönerbrot / Fladen", menge: 1, einheit: "stk" }, { name: "Tomaten", menge: 50, einheit: "g" }] },
    { id: "p", name: "Pommes", bereich: "imbiss", klasse: "kleinigkeit", zeit: 3, preis: 3.5, mengeTag: 20, steuer: 0.07, zutaten: [{ name: "Pommes frites", menge: 200, einheit: "g" }] },
  ];
  b.phase = "app";
  return b;
}
const umsatz = (b, datum, brutto) => b.tagesnotizen.push({ id: "n" + datum, datum, umsatz: brutto, erfasst: datum + "T20:00:00.000Z", storniert: false });
const beleg = (b, datum, netto, extra = {}) => b.lieferungen.push({ id: "l" + b.lieferungen.length, datum, erfasst: datum + "T10:00:00.000Z", lieferant: "Metro", summeNetto: netto, zeilen: [], storniert: false, ...extra });

test("Lagerorte aus Warengruppe und Name, Unklares ins Trockenlager", () => {
  assert.equal(I.lagerortFuer({ name: "Tomaten", gruppe: "gemuese" }), "kuehlhaus");
  assert.equal(I.lagerortFuer({ name: "Dönerspieß Kalb/Pute", gruppe: "fleisch" }), "kuehlhaus");
  assert.equal(I.lagerortFuer({ name: "Erbsen TK", gruppe: "gemuese" }), "tiefkuehler");
  assert.equal(I.lagerortFuer({ name: "Pommes frites", gruppe: "teig" }), "tiefkuehler");
  assert.equal(I.lagerortFuer({ name: "Dönertüte", gruppe: "verpackung" }), "verpackung");
  assert.equal(I.lagerortFuer({ name: "Müllbeutel", gruppe: "verpackung" }), "reinigung");
  assert.equal(I.lagerortFuer({ name: "Reinigungstabs Maschine", gruppe: "verpackung" }), "reinigung");
  assert.equal(I.lagerortFuer({ name: "Ayran", gruppe: "getraenk" }), "trockenlager");
  assert.equal(I.lagerortFuer({ name: "Irgendwas" }), "trockenlager");
  assert.equal(I.lagerortFuer({ name: "Halloumi" }), "kuehlhaus"); // Gruppe aus dem Katalog
});

test("Viertel: Schritte behalten den angebrochenen Teil, ¼ ½ ¾ setzen und nehmen zurück", () => {
  assert.equal(I.mengeSchritt(null, 1), 1); assert.equal(I.mengeSchritt(null, -1), 0);
  assert.equal(I.mengeSchritt(2.5, 1), 3.5); assert.equal(I.mengeSchritt(0.75, -1), 0.75); assert.equal(I.mengeSchritt(1.25, -1), 0.25);
  assert.equal(I.anbruchSetzen(null, 0.25), 0.25); assert.equal(I.anbruchSetzen(2, 0.5), 2.5); assert.equal(I.anbruchSetzen(2.5, 0.75), 2.75);
  assert.equal(I.anbruchSetzen(2.5, 0.5), 2); // derselbe Teil noch einmal: weg
  assert.equal(I.anbruchSetzen(3.75, 0), 3);  // „voll"
  assert.equal(I.mengeSauber(1.3), 1.25); assert.equal(I.mengeSauber(-2), 0); assert.equal(I.mengeSauber(null), null); assert.equal(I.mengeSauber("x"), null);
});

test("Liste: Rezeptzutaten, Belegartikel, Verpackung; gruppiert und sortiert; selbst Gemachtes über Rohstoffe", () => {
  const b = laden();
  b.artikel.push({ name: "Knoblauchsauce", gruppe: "sauce", einheit: "kg", herkunft: "selbst", rezept: { ausbeute: { menge: 1, einheit: "kg" }, zutaten: [{ name: "Joghurt 10 %", menge: 800, einheit: "g" }] }, packung: { menge: 1, einheit: "kg" }, preis: null });
  b.gerichte[0].zutaten.push({ name: "Knoblauchsauce", menge: 30, einheit: "g" });
  beleg(b, "2026-10-02", 50, { zeilen: [{ name: "Salz", artikel: "Salz", netto: 5 }] });
  beleg(b, "2026-10-03", 20, { zeilen: [{ name: "Zucker", artikel: "Zucker", netto: 5 }], storniert: true });
  const inv = I.inventurStarten(b, { datum: "2026-10-15" });
  const { liste } = I.artikelFuerInventur(b, inv);
  const namen = liste.map((z) => z.name);
  assert.ok(namen.includes("Joghurt 10 %") && !namen.includes("Knoblauchsauce"), "selbst gemacht: Rohstoff zählen");
  assert.ok(namen.includes("Salz"), "über Beleg gekauft"); assert.ok(!namen.includes("Zucker"), "stornierter Beleg zählt nicht");
  assert.ok(namen.includes("Dönertüte") && namen.includes("Müllbeutel"), "Verpackung immer");
  assert.ok(!namen.includes("Ayran"), "weder im Rezept noch gekauft");
  const orte = liste.map((z) => I.LAGERORTE.indexOf(z.lagerort)); assert.deepEqual(orte, [...orte].sort((x, y) => x - y));
});

test("Wert: Anzahl × Packungspreis netto, brutto wird bereinigt, Viertel zählen, fehlender Preis ohne Wert", () => {
  const b = laden(); const inv = I.inventurStarten(b, { datum: "2026-10-15" });
  I.mengeSetzen(inv, "Dönerspieß Kalb/Pute", 1.5);  // 144
  I.mengeSetzen(inv, "Dönerbrot / Fladen", 4.25);   // 57,375
  I.mengeSetzen(inv, "Tomaten", 2);                 // 2 × 10 (aus 10,70 brutto)
  I.mengeSetzen(inv, "Pommes frites", 3);           // Preis fehlt
  const w = I.inventurWert(b, inv);
  nah(w.summe, 144 + 57.375 + 20);
  assert.deepEqual(w.ohnePreis, ["Pommes frites"]);
  assert.equal(w.gezaehlt, 4); assert.equal(w.offen, w.anzahl - 4);
  nah(w.jeLagerort.kuehlhaus.summe, 164); nah(w.jeLagerort.trockenlager.summe, 57.375);
  const z = I.artikelFuerInventur(b, inv).liste.find((x) => x.name === "Pommes frites"); assert.equal(z.preis, null); assert.equal(z.wert, null);
});

test("Ausblenden, Dazuholen aus dem Katalog, Pause übersteht Speichern und Laden", () => {
  const b = laden(); const inv = I.inventurStarten(b, { datum: "2026-10-15" });
  I.ausblenden(inv, "Müllbeutel");
  let r = I.artikelFuerInventur(b, inv);
  assert.ok(!r.liste.some((z) => z.name === "Müllbeutel")); assert.equal(r.ausgeblendet[0].name, "Müllbeutel");
  I.hinzufuegen(b, inv, "Halloumi");
  r = I.artikelFuerInventur(b, inv); const h = r.liste.find((z) => z.name === "Halloumi");
  assert.ok(h && h.preis === null && h.lagerort === "kuehlhaus"); assert.ok(b.artikel.some((a) => a.name === "Halloumi" && a.preis === null));
  I.mengeSetzen(inv, "Halloumi", 2.5);
  // Neu laden (Migration): offene Inventur bleibt, Zahlen bleiben
  const neu = migrierenBetrieb(JSON.parse(JSON.stringify(b)));
  const o = I.inventurOffen(neu); assert.ok(o); assert.equal(o.posten.Halloumi, 2.5); assert.deepEqual(o.ausgeblendet, ["Müllbeutel"]);
  assert.equal(I.inventurStarten(neu), o, "keine zweite offene Inventur");
});

test("Alte Stände ohne Inventuren und kaputte Einträge werden sicher migriert", () => {
  const alt = laden(); delete alt.inventuren;
  assert.deepEqual(migrierenBetrieb(JSON.parse(JSON.stringify(alt))).inventuren, []);
  const k = laden(); k.inventuren = [{ id: "a", datum: "2026-09-15", abgeschlossen: "2026-09-15T22:00:00Z", posten: { Tomaten: -1, Brot: "x", Spieß: 2 } }, { kaputt: true }, { id: "o1", datum: "2026-10-01", posten: {} }, { id: "o2", datum: "2026-10-02", posten: {} }];
  const m = migrierenBetrieb(k).inventuren;
  assert.equal(m.length, 2); assert.deepEqual(m[0].posten, { Tomaten: null, Brot: null, Spieß: 2 }); assert.deepEqual(m[0].ausgeblendet, []); assert.equal(m[1].id, "o2");
});

test("Erste Inventur: kein Vergleich; Abschluss hält Preise fest, Verwerfen nur offen", () => {
  const b = laden(); const inv = I.inventurStarten(b, { datum: "2026-09-10" });
  I.mengeSetzen(inv, "Dönerspieß Kalb/Pute", 1);
  assert.equal(I.inventurVergleich(b, inv), null);
  assert.ok(I.inventurAbschliessen(b, inv, { datum: "2026-09-15", jetzt: "2026-09-15T22:00:00.000Z" }));
  assert.equal(inv.datum, "2026-09-15"); assert.equal(inv.wert, 96); assert.equal(inv.preise["Dönerspieß Kalb/Pute"], 96);
  assert.equal(I.inventurVergleich(b, inv), null, "erste Inventur");
  assert.equal(I.inventurVerwerfen(b, inv), false, "abgeschlossen bleibt"); assert.equal(I.mengeSetzen(inv, "Tomaten", 3), false);
  // Preis steigt später: alte Inventur behält ihren Wert
  b.artikel[0].preis = 120; nah(I.inventurWert(b, inv).summe, 96);
  const zwei = I.inventurStarten(b, { datum: "2026-10-01" }); assert.ok(I.inventurVerwerfen(b, zwei)); assert.equal(b.inventuren.length, 1);
});

test("Zweite Inventur: Anfang + Einkauf − Ende, Umsatz netto, echte gegen gerechnete Quote, Lücke mit Müll", () => {
  const b = laden();
  const eins = I.inventurStarten(b, { datum: "2026-09-15" });
  I.mengeSetzen(eins, "Dönerspieß Kalb/Pute", 2); I.mengeSetzen(eins, "Dönerbrot / Fladen", 4); // 192 + 54 = 246
  I.inventurAbschliessen(b, eins, { datum: "2026-09-15", jetzt: "2026-09-15T23:00:00.000Z" });
  // Zeitraum 16.09.–15.10.: Beleg am 15.09. gehört zur ersten Zählung, stornierte zählen nicht, nach dem 15.10. auch nicht
  beleg(b, "2026-09-15", 999); beleg(b, "2026-09-20", 600); beleg(b, "2026-10-05", 400); beleg(b, "2026-10-06", 300, { storniert: true }); beleg(b, "2026-10-16", 777);
  beleg(b, "2026-10-08", null, { zeilen: [{ netto: 30 }, { netto: 20 }] }); // ohne Fußsumme: Zeilen
  umsatz(b, "2026-09-15", 5000); umsatz(b, "2026-09-16", 1070); umsatz(b, "2026-10-15", 2140); umsatz(b, "2026-10-16", 9999);
  b.schwund.push({ id: "s1", datum: "2026-10-01", art: "rohware", ref: { typ: "artikel", name: "Tomaten" }, menge: 1, einheit: "kg", wert: 12.5, storniert: false },
    { id: "s2", datum: "2026-10-02", art: "rohware", ref: { typ: "artikel", name: "Tomaten" }, menge: 1, einheit: "kg", wert: 50, storniert: true },
    { id: "s3", datum: "2026-09-15", art: "rohware", ref: { typ: "artikel", name: "Tomaten" }, menge: 1, einheit: "kg", wert: 70, storniert: false });
  const zwei = I.inventurStarten(b, { datum: "2026-10-15" });
  assert.deepEqual(zwei.ausgeblendet, []);
  I.mengeSetzen(zwei, "Dönerspieß Kalb/Pute", 1.5); I.mengeSetzen(zwei, "Dönerbrot / Fladen", 2); // 144 + 27 = 171
  const offen = I.inventurVergleich(b, zwei); assert.ok(offen, "auch vor dem Abschluss rechenbar");
  I.inventurAbschliessen(b, zwei, { datum: "2026-10-15", jetzt: "2026-10-15T23:00:00.000Z" });
  const v = I.inventurVergleich(b, zwei);
  assert.equal(v.von, "2026-09-16"); assert.equal(v.bis, "2026-10-15"); assert.equal(v.tage, 30);
  nah(v.anfang, 246); nah(v.ende, 171); nah(v.einkauf, 1050); assert.equal(v.belege, 3);
  nah(v.verbrauch, 246 + 1050 - 171);
  nah(v.umsatzNetto, (1070 + 2140) / 1.07); assert.equal(v.umsatzTage, 2);
  nah(v.echteQuote, 1125 / 3000);
  const q = warenQuote(b).quote; assert.ok(q > 0); nah(v.appQuote, q);
  nah(v.luecke, 1125 - 3000 * q);
  nah(v.muell, 12.5); nah(v.eingetragen, 12.5);
  if (v.luecke > 0) { nah(v.erklaert, Math.min(v.luecke, 12.5)); nah(v.ohneErklaerung, Math.max(0, v.luecke - 12.5)); }
  assert.equal(v.vorherDatum, "2026-09-15");
});

test("Lücke negativ (weniger weg als gerechnet) und ohne Umsatz: keine Quote, nichts erfunden", () => {
  const b = laden();
  const eins = I.inventurStarten(b, { datum: "2026-09-01" }); I.mengeSetzen(eins, "Dönerspieß Kalb/Pute", 1); I.inventurAbschliessen(b, eins, { datum: "2026-09-01" });
  const zwei = I.inventurStarten(b, { datum: "2026-09-30" }); I.mengeSetzen(zwei, "Dönerspieß Kalb/Pute", 1); I.inventurAbschliessen(b, zwei, { datum: "2026-09-30" });
  let v = I.inventurVergleich(b, zwei);
  assert.equal(v.umsatzNetto, 0); assert.equal(v.echteQuote, null); assert.equal(v.luecke, null); assert.equal(v.ohneErklaerung, 0);
  umsatz(b, "2026-09-10", 10700);
  v = I.inventurVergleich(b, zwei);
  nah(v.verbrauch, 0); assert.ok(v.luecke < 0); assert.equal(v.ohneErklaerung, 0); assert.equal(v.erklaert, 0);
  // Eigene Quote des Wirts gilt vor der Karte
  b.verkauf.warenQuote = 0.3; v = I.inventurVergleich(b, zwei); assert.equal(v.quoteQuelle, "eigen"); nah(v.sollWare, 3000);
});

test("Zwei Inventuren am selben Tag: leerer Zeitraum, kein Einkauf, kein Umsatz", () => {
  const b = laden(); beleg(b, "2026-10-15", 500); umsatz(b, "2026-10-15", 1000);
  const a = I.inventurStarten(b); I.mengeSetzen(a, "Tomaten", 1); I.inventurAbschliessen(b, a, { datum: "2026-10-15", jetzt: "2026-10-15T10:00:00Z" });
  const c = I.inventurStarten(b); I.mengeSetzen(c, "Tomaten", 1); I.inventurAbschliessen(b, c, { datum: "2026-10-15", jetzt: "2026-10-15T11:00:00Z" });
  const v = I.inventurVergleich(b, c); assert.equal(v.tage, 0); assert.equal(v.einkauf, 0); assert.equal(v.umsatzNetto, 0); assert.equal(v.vorherDatum, "2026-10-15");
  assert.equal(I.inventurVorher(b, a), null); assert.equal(I.inventurVorher(b, c), a);
});

test("Letztes Mal und ausgeblendete Waren werden in die nächste Inventur übernommen", () => {
  const b = laden(); const a = I.inventurStarten(b, { datum: "2026-09-15" });
  I.mengeSetzen(a, "Tomaten", 3); I.hinzufuegen(b, a, "Halloumi"); I.mengeSetzen(a, "Halloumi", 1); I.ausblenden(a, "Dönertüte");
  I.inventurAbschliessen(b, a, { datum: "2026-09-15" });
  b.artikel = b.artikel.filter((x) => x.name !== "Halloumi"); // Artikelverzeichnis wurde aufgeräumt
  const c = I.inventurStarten(b, { datum: "2026-10-15" }); const r = I.artikelFuerInventur(b, c);
  assert.equal(r.liste.find((z) => z.name === "Tomaten").letztes, 3);
  assert.ok(r.liste.some((z) => z.name === "Halloumi"), "letztes Mal gezählt bleibt in der Liste");
  assert.deepEqual(r.ausgeblendet.map((z) => z.name), ["Dönertüte"]);
});

test("Zusammenführen zweier Handys: abgeschlossene Inventuren vereinigt, offene nur lokal", () => {
  const lokal = laden(); const fremd = structuredClone(lokal);
  lokal.inventuren = [{ id: "x", datum: "2026-09-15", begonnen: "", abgeschlossen: "2026-09-15T20:00:00Z", posten: {}, ausgeblendet: [] }, { id: "o", datum: "2026-10-15", begonnen: "", abgeschlossen: null, posten: {}, ausgeblendet: [] }];
  fremd.inventuren = [{ id: "y", datum: "2026-08-15", begonnen: "", abgeschlossen: "2026-08-15T20:00:00Z", posten: {}, ausgeblendet: [] }, { id: "f", datum: "2026-10-14", begonnen: "", abgeschlossen: null, posten: {}, ausgeblendet: [] }];
  const m = verschmelzen(lokal, fremd);
  assert.deepEqual(m.inventuren.map((i) => i.id).sort(), ["o", "x", "y"]);
});

test("Betriebsmittel getrennt vom Wareneinsatz; Monatswert landet in der Reinigungszeile (Stufe aus Inventur)", async () => {
  const { reinigungMonat } = await import("../js/reinigung.js");
  const b = laden(); b.betrieb.reinigung = { wer: "selbst", minutenTag: 30, durch: "team" };
  const i1 = I.inventurStarten(b, { datum: "2026-09-15" }); I.mengeSetzen(i1, "Müllbeutel", 2); I.mengeSetzen(i1, "Dönerspieß Kalb/Pute", 1); I.inventurAbschliessen(b, i1, { datum: "2026-09-15" });
  beleg(b, "2026-10-01", 50, { zeilen: [{ name: "Müllbeutel", artikel: "Müllbeutel", netto: 20 }, { name: "Tomaten", netto: 30 }] });
  const i2 = I.inventurStarten(b, { datum: "2026-10-15" }); I.mengeSetzen(i2, "Müllbeutel", 1); I.mengeSetzen(i2, "Dönerspieß Kalb/Pute", 1); I.inventurAbschliessen(b, i2, { datum: "2026-10-15" });
  const v = I.inventurVergleich(b, i2);
  nah(v.betriebsmittel.verbrauch, 8 + 20 - 4); // 2×4 + 20 − 1×4
  nah(v.verbrauch, 96 + 30 - 96); // nur Ware: Tomaten-Einkauf
  nah(i2.betriebsmittelJeMonat, 24 * 30 / 30);
  const r = reinigungMonat(b, { datum: "2026-10-15" }); assert.equal(r.stufe, "inventur"); nah(r.mittel, 24);
});

// ---------- Prüfgremium 17.10.2026: Regressionstest ----------
test("Prüfgremium (2): Inventur nach Mitternacht (01:30) zählt zum Geschäftstag davor – Bildschirm, Vorgabe, gespeicherte Altdaten", async () => {
  const { inventurAktion } = await import("../js/screens/inventur.js");
  const i18n = await import("../js/i18n.js"); i18n.setzeSprache("de");
  const Echt = globalThis.Date; const fest = new Echt(2026, 9, 18, 1, 30).getTime(); // Sa 18.10. 01:30, Schicht vom Fr 17.10.
  class Fest extends Echt { constructor(...a) { super(...(a.length ? a : [fest])); } static now() { return fest; } }
  const b = laden(); globalThis.Date = Fest;
  try {
    inventurAktion("inv-start", { dataset: {} }, b);
    const offen = I.inventurOffen(b); I.mengeSetzen(offen, "Tomaten", 1);
    assert.equal(inventurAktion("inv-fertig", { dataset: {} }, b, { frage: () => true }), "abgeschlossen");
  } finally { globalThis.Date = Echt; }
  const f = I.inventurenFertig(b); assert.equal(f[f.length - 1].datum, "2026-10-17", "Geschäftstag, nicht Kalendertag");
  // wer den Kalendertag übergibt, bekommt trotzdem den Geschäftstag
  const c = laden(); const i = I.inventurStarten(c, { datum: "2026-10-18", jetzt: new Echt(2026, 9, 17, 22, 0).toISOString() }); I.mengeSetzen(i, "Tomaten", 1);
  I.inventurAbschliessen(c, i, { datum: "2026-10-18", jetzt: new Echt(2026, 9, 18, 1, 30).toISOString() }); assert.equal(i.datum, "2026-10-17");
  // gespeicherte Inventur von vor der Korrektur (Kalendertag 18.10., abgeschlossen 01:30) → beim Laden auf den 17.10.; 23:30 bleibt
  const alt = laden(); alt.inventuren.push({ id: "alt1", datum: "2026-10-18", begonnen: "x", abgeschlossen: new Echt(2026, 9, 18, 1, 30).toISOString(), posten: { Tomaten: 1 } },
    { id: "alt2", datum: "2026-10-20", begonnen: "x", abgeschlossen: new Echt(2026, 9, 20, 23, 30).toISOString(), posten: { Tomaten: 1 } });
  const m = migrierenBetrieb(alt); const d = (id) => m.inventuren.find((x) => x.id === id).datum;
  assert.equal(d("alt1"), "2026-10-17"); assert.equal(d("alt2"), "2026-10-20");
  assert.equal(migrierenBetrieb(m).inventuren.find((x) => x.id === "alt1").datum, "2026-10-17", "zweites Laden ändert nichts mehr");
});
