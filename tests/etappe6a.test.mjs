// Etappe 6a: Speisekarte → Gerichte → Inventurliste, Kostenbelege mit Verteilung, Zähler mit Sonderkosten, Schema 5, Ablage.
import { test } from "node:test";
import assert from "node:assert/strict";
import { positionenAusText, vorschlaegeAusText, vorschlaegeUebernehmen, aehnlichkeit, inventurVorschau } from "../js/karte_lesen.js";
import { stelleRaten, kostenbelegLesen, kostenbelegAnlegen, anteilImMonat, sonderkostenImMonat, kostenbelegStornieren } from "../js/kostenbeleg.js";
import { zeilenAusTsv } from "../js/ocr_layout.js";
import { zeilenAusTextStuecken } from "../js/auswertung.js";
import { leererBetrieb, migrierenWurzel, verschmelzen, SCHEMA } from "../js/store.js";
import { artikelAusGerichten, monatsLast, tagesnotizSetzen } from "../js/engine.js";
import { zaehler } from "../js/zaehler.js";
import { ablegen, holen, entfernen, ablageOrt } from "../js/ablage.js";

const ladenMit = (kuechen = ["doener"]) => { const s = leererBetrieb(); s.betrieb.format = "imbiss"; s.betrieb.kuechen = kuechen; return s; };

// ---------- Speisekarte ----------
test("Karte: Nummern, Punkte-Leitern, Euro-Zeichen, Telefon und Fußzeile", () => {
  const p = positionenAusText("12. Hähnchen Döner ....... 7,00\nNr. 3) Lahmacun 5,50 €\nTel. 0621 123456\nAlle Preise inkl. MwSt.\nÖffnungszeiten Mo-Sa 11-22");
  assert.deepEqual(p.map((x) => [x.name, x.preis]), [["Hähnchen Döner", 7], ["Lahmacun", 5.5]]);
});
test("Karte: zwei Größen in einer Zeile werden zwei Gerichte", () => {
  const p = positionenAusText("Pommes klein / groß 3,50 4,50");
  assert.deepEqual(p.map((x) => [x.name, x.preis]), [["Pommes klein", 3.5], ["Pommes groß", 4.5]]);
});
test("Karte: Mengenangaben sind keine Preise, OCR-l als 1 oder |", () => {
  const p = positionenAusText("Cola 0,33 | 2,50 €\nAyran 0,25 1 2,00\nMineralwasser 0,5 l 2,50");
  assert.deepEqual(p.map((x) => [x.name, x.preis]), [["Cola 0,33 l", 2.5], ["Ayran 0,25 l", 2], ["Mineralwasser 0,5 l", 2.5]]);
});
test("Karte: Name und Preis in zwei Zeilen", () => {
  const p = positionenAusText("Currywurst mit Pommes\n8,90 €");
  assert.deepEqual(p.map((x) => [x.name, x.preis]), [["Currywurst mit Pommes", 8.9]]);
});
test("Karte: zwei Spalten in einer Zeile ergeben zwei Gerichte", () => {
  const p = positionenAusText("Pizza Salami 9,50 Lasagne 10,90");
  assert.deepEqual(p.map((x) => [x.name, x.preis]).sort(), [["Lasagne", 10.9], ["Pizza Salami", 9.5]].sort());
});
test("Ähnlichkeit: Dönerteller, Dürüm ohne Umlaut, Hähnchen Döner", () => {
  assert.ok(aehnlichkeit("Döner Teller mit Pommes", "Dönerteller") >= 0.75);
  assert.ok(aehnlichkeit("Durum Doner", "Dürüm Döner") >= 0.9);
  assert.ok(aehnlichkeit("Hähnchen Döner", "Hähnchendöner") >= 0.9);
  assert.ok(aehnlichkeit("Falafel Sandwich", "Pizza Margherita") < 0.5);
});
test("Vorschläge → Karte → Inventurliste; Getränk wird Artikel; bestehendes Gericht bekommt nur den Preis", () => {
  const s = ladenMit();
  s.gerichte.push({ id: "g1", name: "Lahmacun", zutaten: [], preis: 5, vorlage: false });
  const v = vorschlaegeAusText("Döner Kebab 7,50\nLahmacun 5,90\nFalafel Sandwich 6,50\nAyran 0,25 l 2,00", s);
  assert.equal(v.find((x) => x.name === "Döner Kebab").sicher, "sicher");
  assert.equal(v.find((x) => x.name === "Falafel Sandwich").sicher, "baukasten"); // Pilot 14.10.: nie ohne Rezept
  const r = vorschlaegeUebernehmen(s, v);
  assert.deepEqual(r, { neu: 3, aktualisiert: 1, ohneRezept: 0 });
  assert.equal(s.gerichte.find((g) => g.name === "Falafel Sandwich").rezeptQuelle, "baukasten");
  assert.equal(s.gerichte.find((g) => g.name === "Lahmacun").preis, 5.9);
  const doener = s.gerichte.find((g) => g.name === "Döner Kebab");
  assert.ok(doener.zutaten.length >= 5 && doener.preis === 7.5 && doener.quelle === "foto");
  const ayran = s.gerichte.find((g) => /Ayran/.test(g.name));
  assert.equal(ayran.klasse, "getraenk"); assert.equal(ayran.steuer, 0.19);
  s.artikel = artikelAusGerichten(s);
  const namen = s.artikel.map((a) => a.name);
  assert.ok(namen.includes("Dönerspieß Kalb/Pute") && namen.includes("Dönerbrot / Fladen") && namen.includes("Ayran 0,25 l"), namen.join(", "));
  assert.equal(inventurVorschau(s).anzahl, s.artikel.length);
});
test("Ausgeschaltete Vorschläge werden nicht übernommen", () => {
  const s = ladenMit(); const v = vorschlaegeAusText("Döner Kebab 7,50\nLahmacun 5,90", s); v[1].an = false;
  vorschlaegeUebernehmen(s, v); assert.deepEqual(s.gerichte.map((g) => g.name), ["Döner Kebab"]);
});

// ---------- Layout aus der Texterkennung ----------
test("TSV: Preisblock rechts wird den Namen links zugeordnet, trotz Schräglage", () => {
  const w = (block, zeile, x, y, text) => ["5", "1", block, "1", zeile, "1", x, y, 60, 20, 90, text].join("\t");
  const tsv = [
    w(1, 1, 10, 100, "Pizza"), w(1, 2, 10, 140, "Margherita"), w(1, 2, 140, 140, ""), w(1, 3, 10, 180, "Salami"),
    w(2, 1, 500, 150, "8,50"), w(2, 2, 500, 190, "9,50"), // um 10 px tiefer (Schräglage)
  ].join("\n");
  assert.equal(zeilenAusTsv(tsv), "Pizza\nMargherita 8,50\nSalami 9,50");
});
test("PDF-Text: Stücke gleicher Höhe werden eine Zeile", () => {
  const it = (s, x, y) => ({ str: s, transform: [1, 0, 0, 1, x, y], height: 10 });
  assert.equal(zeilenAusTextStuecken([it("Döner", 10, 700), it("7,50 €", 300, 700), it("Lahmacun", 10, 680), it("5,50 €", 300, 681)]), "Döner 7,50 €\nLahmacun 5,50 €");
});

// ---------- Kostenbelege ----------
test("Kostenstelle raten", () => {
  assert.equal(stelleRaten("Stadtwerke Heidelberg\nAbschlag Strom 370,00"), "strom");
  assert.equal(stelleRaten("Allianz Versicherung Beitrag Betriebshaftpflicht"), "versicherungen");
  assert.equal(stelleRaten("METRO Cash & Carry Tomaten 6kg"), "ware");
  assert.equal(stelleRaten("Mietvertrag Gewerbe Miete Oktober"), "miete");
  assert.equal(stelleRaten("Hallo Welt"), null);
});
test("Betrag und Datum lesen: Rechnungsbetrag, Nettobetrag, Tausenderpunkt", () => {
  const k = kostenbelegLesen("Rechnungsdatum: 02.10.2026\nNettobetrag 1.250,00 €\nUmsatzsteuer 19 % 237,50 €\nRechnungsbetrag 1.487,50 €");
  assert.deepEqual([k.netto, k.brutto, k.datum, k.satz], [1250, 1487.5, "2026-10-02", 0.19]);
});
test("Kostenbeleg monatlich setzt den Kostenposten; jährlich als Jahresbetrag", () => {
  const s = ladenMit();
  kostenbelegAnlegen(s, { stelle: "miete", betrag: 1500, basis: "netto", datum: "2026-10-01", verteilung: "monatlich" });
  const m = s.kosten.find((k) => k.posten === "miete");
  assert.deepEqual([m.betrag, m.status, m.periode, m.basis], [1500, "bekannt", "monat", "netto"]);
  kostenbelegAnlegen(s, { stelle: "versicherungen", betrag: 1200, basis: "netto", datum: "2026-10-01", verteilung: "jaehrlich" });
  assert.equal(s.kosten.find((k) => k.posten === "versicherungen").periode, "jahr");
  assert.equal(monatsLast(s).fix.gesamt, 1600);
});
test("Kostenbeleg einmalig und verteilt: Anteile je Monat, brutto auf netto mit gelesenem Satz", () => {
  const s = ladenMit();
  const e1 = kostenbelegAnlegen(s, { stelle: "sonstiges", betrag: 119, basis: "brutto", satz: 0.19, datum: "2026-10-05", verteilung: "einmalig" });
  const e2 = kostenbelegAnlegen(s, { stelle: "werbung", betrag: 300, basis: "netto", datum: "2026-10-05", verteilung: "verteilt", monate: 3 });
  assert.equal(anteilImMonat(e1, "2026-10"), 100); assert.equal(anteilImMonat(e1, "2026-11"), 0);
  assert.equal(anteilImMonat(e2, "2026-12"), 100); assert.equal(anteilImMonat(e2, "2027-01"), 0);
  assert.equal(sonderkostenImMonat(s, "2026-10").summe, 200);
  assert.equal(s.kosten.length, 0, "einmalig/verteilt ändern keine festen Posten");
  kostenbelegStornieren(s, e1.id); assert.equal(sonderkostenImMonat(s, "2026-10").summe, 100);
});
test("Zähler: Sonderkosten des Monats machen den Stand genau um ihren Betrag tiefer", () => {
  const s = ladenMit(); s.betrieb.tageProWoche = 7; s.team.eigenerLohnStatus = "offen";
  s.kosten.push({ id: "k", posten: "miete", kategorie: "miete", betrag: 3100, status: "bekannt", periode: "monat", basis: "netto" });
  tagesnotizSetzen(s, "2026-10-01", 1070);
  const ohne = zaehler(s, { datum: "2026-10-31" });
  kostenbelegAnlegen(s, { stelle: "sonstiges", betrag: 310, basis: "netto", datum: "2026-10-03", verteilung: "einmalig" });
  const mit = zaehler(s, { datum: "2026-10-31" });
  assert.ok(Math.abs((ohne.stand - mit.stand) - 310) < 0.01, `${ohne.stand} → ${mit.stand}`);
  assert.equal(mit.sonder.summe, 310);
});
test("Kostenbeleg: unbekannte Stelle und fehlender Betrag werden abgewiesen, Zukunftsdatum gedeckelt", () => {
  const s = ladenMit();
  assert.throws(() => kostenbelegAnlegen(s, { stelle: "ware", betrag: 10 }));
  assert.throws(() => kostenbelegAnlegen(s, { stelle: "miete", betrag: 0 }));
  const e = kostenbelegAnlegen(s, { stelle: "strom", betrag: 50, datum: "2099-01-01", verteilung: "einmalig" });
  assert.ok(e.datum < "2099-01-01");
});

// ---------- Schema 5 ----------
test("Schema 5: neuer Laden startet im Schnellstart, alter Laden (Schema 4) bleibt auf dem genauen Weg", () => {
  assert.equal(SCHEMA, 5);
  assert.equal(leererBetrieb().weg, "schnell");
  const alt = { schema: 4, betriebe: [{ id: "a", phase: "onboarding", schritt: 3, betrieb: { name: "X" } }], aktiv: "a" };
  const w = migrierenWurzel(alt);
  assert.equal(w.betriebe[0].weg, "genau"); assert.deepEqual(w.betriebe[0].uploads, []); assert.deepEqual(w.betriebe[0].kostenbelege, []);
});
test("Zusammenführen: Kostenbelege und Uploads beider Geräte bleiben, Storno gewinnt", () => {
  const a = ladenMit(), b = structuredClone(a);
  const e = kostenbelegAnlegen(a, { stelle: "strom", betrag: 80, datum: "2026-10-02", verteilung: "einmalig" });
  b.kostenbelege.push({ ...structuredClone(e), storniert: true });
  kostenbelegAnlegen(b, { stelle: "gas", betrag: 40, datum: "2026-10-02", verteilung: "einmalig" });
  a.uploads.push({ id: "u1", erfasst: "2026-10-02T10:00:00Z", datei: { id: "d-1", ort: "lokal" } });
  const m = verschmelzen(a, b);
  assert.equal(m.kostenbelege.length, 2); assert.ok(m.kostenbelege.find((x) => x.id === e.id).storniert);
  assert.equal(m.uploads.length, 1);
});

// ---------- Ablage ----------
test("Ablage: ablegen, holen, entfernen über den lokalen Ort (ohne IndexedDB im Speicher)", async () => {
  assert.equal(ablageOrt(), "lokal");
  const meta = await ablegen(new Blob(["Hallo"], { type: "image/jpeg" }), { name: "karte.jpg", zweck: "speisekarte", laden: "x" });
  assert.equal(meta.ort, "lokal"); assert.equal(meta.zweck, "speisekarte"); assert.ok(meta.id.startsWith("d-"));
  assert.equal(await (await holen(meta)).text(), "Hallo");
  await entfernen(meta); assert.equal(await holen(meta), null);
  await assert.rejects(() => ablegen(new Blob([]), {}));
});

// ---------- Nach dem Review ----------
import { kostenbelegDoppelt, postenVorher } from "../js/kostenbeleg.js";
test("Review: Jahreszahl wird nicht Teil des Betrags, 17 % ist nicht 7 %, Rechnungsdatum vor Abrechnungszeitraum", () => {
  const k = kostenbelegLesen("Abrechnungszeitraum 01.01.2025 - 31.12.2025\nRechnungsdatum 05.10.2026\nRechnungsbetrag zahlbar bis 15.11.2026 119,00 €\nVersicherungsteuer 17 %");
  assert.deepEqual([k.brutto, k.datum, k.satz], [119, "2026-10-05", null]);
});
test("Review: Rücknahme stellt den vorherigen festen Betrag wieder her; Dubletten werden erkannt", () => {
  const s = ladenMit();
  s.kosten.push({ id: "k", posten: "strom", kategorie: "energie", betrag: 300, status: "bekannt", periode: "monat", basis: "brutto", sammel: "strom-gas" });
  assert.ok(postenVorher(s, "gas").sammel);
  const e = kostenbelegAnlegen(s, { stelle: "strom", betrag: 480, basis: "brutto", datum: "2026-10-02", verteilung: "monatlich" });
  assert.equal(s.kosten[0].betrag, 480); assert.equal(postenVorher(s, "strom").posten.betrag, 480);
  assert.ok(kostenbelegDoppelt(s, { stelle: "strom", betrag: 480, datum: "2026-10-02" }));
  assert.ok(!kostenbelegDoppelt(s, { stelle: "strom", betrag: 480, datum: "2026-10-03" }));
  kostenbelegStornieren(s, e.id);
  assert.deepEqual([s.kosten[0].betrag, s.kosten[0].sammel, s.kosten[0].beleg], [300, "strom-gas", undefined]);
  assert.ok(!kostenbelegDoppelt(s, { stelle: "strom", betrag: 480, datum: "2026-10-02" }), "stornierte zählen nicht als Dublette");
});

// ---------- Echte Karte aus dem Pilot (Bildschirmfotos des Kapitäns, 14.10.) ----------
import { nameAufbereiten } from "../js/karte_lesen.js";
test("Pilot-Karte: Namen 1:1 – Nummer, Fotoreste, Allergene und Punkte-Leiter weg, Komma und Klammer bleiben", () => {
  const n = (z) => positionenAusText(z).map((p) => p.name)[0];
  // echte Zeilen aus der Texterkennung der Pilot-Karte (14.10.)
  assert.equal(n("/ B a 01. Döner (groß) mit Salat, Soße\", ..,., 7,00 ER"), "Döner (groß) mit Salat, Soße");
  assert.equal(n("i ee SE 1 35, Pide mit Spinat, Weichkäse, Eiern’ .. » » 8,50"), "Pide mit Spinat, Weichkäse, Eiern");
  assert.equal(n("u 33. Pide mit Spinat, Weichkäse* ...... 7,50"), "Pide mit Spinat, Weichkäse");
  assert.equal(n("ua Kichererbsen im Yufka mit Salat‘. . . . . . . 7,00 a."), "Kichererbsen im Yufka mit Salat");
  assert.equal(n("Ira U] Falafel Teller mit Salat & Pommes oder Reis‘ 8,00"), "Falafel Teller mit Salat & Pommes oder Reis");
  assert.equal(n("BE EN 15. Falafel mit Käse““\"............... 6,00 > u"), "Falafel mit Käse");
  assert.equal(n("N ae a 04. Döner Box“... «uns 0222 2..7,00 00"), "Döner Box");
  assert.equal(n("24. Lahmacun mit Dönerfl., Weichkäse\"”\"* 10,00 Pu"), "Lahmacun mit Dönerfl., Weichkäse");
  assert.equal(n("sg a extra Weichkäse® ......».usanss san 4nr..1,00"), "extra Weichkäse");
  assert.equal(n("Döner Vegetarisch mit Käse4,7,A,F,G,K 5,00"), "Döner Vegetarisch mit Käse");
  // Preis ohne Komma hinter der Leiter: übernommen, aber „Preis prüfen"
  const s = positionenAusText("ER a d 44. Schinken Seele“ ..............850 100) AR")[0];
  assert.equal(s.name, "Schinken Seele"); assert.equal(s.preis, 8.5); assert.ok(s.preisPruefen);
  // Nummer und Leiter, Preis unlesbar: Gericht kommt mit „Preis fehlt"
  assert.equal(positionenAusText("ur: 71 18. Pommes ..2uessssssensnenennn 50 | RE")[0]?.preis, null);
  assert.ok(nameAufbereiten("anEXa Seele").pruefen && nameAufbereiten("Vegetarische ReBBu").pruefen && nameAufbereiten("EBENE 5 7 3 re Fig BR").pruefen);
  assert.ok(!nameAufbereiten("Pide mit Döner").pruefen && !nameAufbereiten("XXL Döner").pruefen && !nameAufbereiten("Döner (groß) mit Salat, Soße").pruefen);
  // zwei Lesarten: gleiche Gerichte einmal, fehlender Preis aus der anderen Lesart
  const z = positionenAusText("Portion Reis ...... 5\nPide mit Weichkäse 6,50\n\f\nPortion Reis 5,00\nLahmacun 6,00");
  assert.deepEqual(z.map((x) => `${x.name}|${x.preis}`).sort(), ["Lahmacun|6", "Pide mit Weichkäse|6.5", "Portion Reis|5"]);
});

test("Pilot-Karte: Zutatenzeilen unter dem Gericht werden nie zum Gericht, Preis gehört zum Gericht darüber", async () => {
  const { positionenAusText, istZutatenZeile } = await import("../js/karte_lesen.js");
  const t = "Döner Kebab 7,50\nmit Salat, Tomaten, Zwiebeln und Soße\nDürüm Döner\nmit Salat, Rotkohl 8,00\nLahmacun 5,50\ngefüllt mit Salat\nVom Grill\nAdana Kebab 12,90";
  const p = positionenAusText(t).map((x) => `${x.name}|${x.preis}`);
  assert.deepEqual(p, ["Döner Kebab|7.5", "Dürüm Döner|8", "Lahmacun|5.5", "Adana Kebab|12.9"]);
  assert.equal(istZutatenZeile("mit Salat, Tomaten"), true);
  assert.equal(istZutatenZeile("Salat, Tomaten, Gurken"), true);
  assert.equal(istZutatenZeile("Pide mit Käse"), false);
  assert.equal(istZutatenZeile("Vom Grill"), false);
});

test("Foto-Serie: mehrere Fotos in der Warteschlange, Prüfliste erst nach „Fertig“", async () => {
  const f = await import("../js/screens/foto.js");
  f.fotoZuruecksetzen();
  assert.equal(f.karteModus(), "sammeln");
  f.sammelnBeenden(); // ohne Fotos: bleibt beim Sammeln
  assert.equal(f.karteModus(), "sammeln");
  assert.match(f.karteFussKnopf("OHNE"), /OHNE/);
  f.fotoZuruecksetzen();
});


test("Rezept-Baukasten: jedes Gericht der Pilot-Karte bekommt ein Rezept mit passenden Hauptzutaten", async () => {
  const { rezeptBauen, fehlendeRezepteErgaenzen } = await import("../js/rezept_baukasten.js");
  const { PRODUKT_INDEX } = await import("../js/data/katalog.js");
  const hat = (n, artikel) => rezeptBauen(n)?.zutaten.some((z) => z.name === artikel);
  const menge = (n, artikel) => rezeptBauen(n)?.zutaten.find((z) => z.name === artikel)?.menge;
  // Familie aus dem Kopf: „Döner mit Salat" ist ein Döner, kein Salat
  assert.equal(rezeptBauen("Döner (groß) mit Salat, Soße").familie, "doener");
  assert.ok(menge("Döner (groß) mit Salat, Soße", "Dönerspieß Kalb/Pute") > menge("Döner (klein) mit Salat, Soße", "Dönerspieß Kalb/Pute"));
  // Belag aus „mit …" und aus dem Kopf
  assert.ok(hat("Pide mit Spinat, Weichkäse, Eiern", "Babyspinat") && hat("Pide mit Spinat, Weichkäse, Eiern", "Eier") && hat("Pide mit Spinat, Weichkäse, Eiern", "Hirtenkäse / Feta"));
  assert.ok(hat("Schinken Seele", "Putenbrustschinken") && hat("Salami Seele", "Truthahnsalami") && hat("Tonno Salat mit Eisbergsalat, Zwiebeln", "Thunfisch (Dose)"));
  // vegetarisch/vegan ohne Fleisch, vegan ohne Käse; Ersatz ohne Fleischwort ohne Fleisch
  assert.ok(!hat("Döner Vegetarisch mit Käse", "Dönerspieß Kalb/Pute") && hat("Döner Vegetarisch mit Käse", "Pizzakäse gerieben"));
  assert.ok(!hat("Vegane Pizza", "Pizzakäse gerieben") && !hat("Vegane Lahmacun mit Salat", "Lammhackfleisch"));
  assert.ok(!hat("Kichererbsen im Yufka mit Salat", "Dönerspieß Kalb/Pute") && hat("Kichererbsen im Yufka mit Salat", "Kichererbsen"));
  // Teller: erste Beilage aus „Reis oder Pommes" mit Hinweis; Extras nur die Zutat; Box ohne doppeltes Fleisch
  assert.ok(hat("Döner-Teller mit Reis oder Pommes", "Langkornreis") && rezeptBauen("Döner-Teller mit Reis oder Pommes").hinweise.includes("wahl"));
  assert.deepEqual(rezeptBauen("extra Weichkäse").zutaten.map((z) => z.name), ["Hirtenkäse / Feta"]);
  assert.equal(rezeptBauen("Döner Box").zutaten.filter((z) => z.name === "Dönerspieß Kalb/Pute").length, 1);
  assert.equal(rezeptBauen("Extra Seele").familie, "seele");
  assert.equal(rezeptBauen("Maccaroni Stadt Döner Pizza").familie, "nudeln");
  // alle Zutaten stehen im Katalog (sonst fehlt Warengruppe/Einheit in der Inventurliste)
  const soll = ["Döner (groß) mit Salat, Soße", "Yufka (gerollt) mit Salat, Soße", "Falafel Fladenbrot", "Portion Reis", "Gemischter Salat", "Maccaroni Roma", "Bauernsalat mit Gurken", "Lahmacun mit Dönerfl., Weichkäse"];
  for (const n of soll) { const r = rezeptBauen(n); assert.ok(r && r.zutaten.length >= 2 || /portion/i.test(n), n); for (const z of r.zutaten) assert.ok(PRODUKT_INDEX[z.name], `${n}: ${z.name} fehlt im Katalog`); }
  // ältere Gerichte ohne Rezept werden ergänzt, bewusst leere nicht
  const st = { gerichte: [{ name: "Pide mit Hackfleisch", zutaten: [] }, { name: "Spezial", zutaten: [] }, { name: "Pide mit Käse", zutaten: [], rezeptBewusstLeer: true }] };
  assert.equal(fehlendeRezepteErgaenzen(st), 1);
  assert.equal(st.gerichte[0].rezeptQuelle, "baukasten"); assert.equal(st.gerichte[1].zutaten.length, 0); assert.equal(st.gerichte[2].zutaten.length, 0);
});
