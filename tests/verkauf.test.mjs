// E7 (17.10.2026): Verkauf je Gericht – Parser (DSFinV-K-Beispieldatei), Storno, Doppelimport, Zuordnung mit Lernen, Handeingabe,
// Soll-Verbrauch mit Einheiten und Selbstgemachtem, Abgleich mit der Inventur, Ladenhüter, Ehrlichkeit, Migration, Zusammenführen, Sicherung.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { idbAttrappe } from "./hilfe/idb_attrappe.mjs";
const st = await import("../js/store.js");
const vk = await import("../js/verkauf.js");
const zip = await import("../js/zip.js");
const { beispielLaden } = await import("../js/beispiel.js");
const { inventurenFertig } = await import("../js/inventur.js");

const HIER = path.dirname(fileURLToPath(import.meta.url));
const ORDNER = path.join(HIER, "daten", "beispiel-dsfinvk");
const ZIPDATEI = path.join(HIER, "daten", "beispiel-dsfinvk-export.zip");
const H = "2026-10-17";
const einzeln = () => fs.readdirSync(ORDNER).map((n) => Object.assign(new Blob([fs.readFileSync(path.join(ORDNER, n))]), { name: n }));
const zipBlob = () => new Blob([fs.readFileSync(ZIPDATEI)]);
const pos = (r, datum, text) => r.positionen.find((p) => p.datum === datum && p.text === text);

// kleiner Laden mit Karte (ohne Beispiel-Merkmal)
function laden() {
  const b = st.leererBetrieb(); b.phase = "app"; b.betrieb.name = "Test";
  b.gerichte = [
    { id: "g1", name: "Döner Kebab", plu: "101", preis: 8, klasse: "haupt", zutaten: [{ name: "Fleisch", menge: 150, einheit: "g" }, { name: "Teig", menge: 250, einheit: "g" }, { name: "Box", menge: 1, einheit: "stk" }] },
    { id: "g2", name: "Dürüm Döner", preis: 9, klasse: "haupt", zutaten: [{ name: "Fleisch", menge: 180, einheit: "g" }] },
    { id: "g3", name: "Cola 0,33 l", plu: "111", preis: 2.5, klasse: "getraenk", zutaten: [{ name: "Cola", menge: 1, einheit: "stk" }] },
    { id: "g4", name: "Ayran 0,25 l", preis: 2, klasse: "getraenk", zutaten: [] },
    { id: "g5", name: "Pommes frites (Beilage)", plu: "110", preis: 3.5, klasse: "kleinigkeit", zutaten: [{ name: "Fleisch", menge: 1, einheit: "stk" }] },
  ];
  b.artikel = [
    { name: "Fleisch", gruppe: "fleisch", einheit: "kg", packung: { menge: 10, einheit: "kg" }, preis: 80, preisBasis: "netto", garverlust: { wert: 0.2 } },
    { name: "Mehl", gruppe: "trocken", einheit: "kg", packung: { menge: 25, einheit: "kg" }, preis: 20, preisBasis: "netto" },
    { name: "Hefe", gruppe: "trocken", einheit: "g", packung: { menge: 500, einheit: "g" }, preis: 2, preisBasis: "netto" },
    { name: "Teig", herkunft: "selbst", einheit: "g", packung: { menge: 1600, einheit: "g" }, preis: null, rezept: { zutaten: [{ name: "Mehl", menge: 1000, einheit: "g" }, { name: "Hefe", menge: 20, einheit: "g" }], ausbeute: { menge: 1600, einheit: "g" }, arbeitMin: 20 } },
    { name: "Box", gruppe: "verpackung", einheit: "stk", packung: { menge: 100, einheit: "stk" }, preis: 10, preisBasis: "netto" },
    { name: "Cola", gruppe: "getraenk", einheit: "stk", packung: { menge: 24, einheit: "stk" }, preis: 12, preisBasis: "netto" },
  ];
  return st.migrierenBetrieb(b);
}

test("E7 Parser: Beispiel-Export (CSV einzeln und als gepackte ZIP) – Summen je Tag und Kassenartikel, Datum aus Z_BUCHUNGSTAG", async () => {
  for (const dateien of [einzeln(), [zipBlob()]]) {
    const r = await vk.exportEinlesen(dateien);
    assert.deepEqual(r.tage, ["2026-10-15", "2026-10-16"]);
    assert.equal(r.positionen.length, 7, JSON.stringify(r.positionen));
    assert.deepEqual([pos(r, "2026-10-15", "Döner Kebab").menge, pos(r, "2026-10-15", "Döner Kebab").umsatzBrutto], [2, 16]);
    assert.equal(pos(r, "2026-10-16", "Döner Kebab").menge, 3, "Bon nach Mitternacht gehört zum Buchungstag des Abschlusses");
    assert.equal(pos(r, "2026-10-16", "Döner Kebab").umsatzBrutto, 24, "POS_BRUTTO aus lines_vat.csv");
    assert.equal(pos(r, "2026-10-15", "Cola 0,33 l").plu, "111");
    assert.equal(r.bericht.datumQuelle.abschluss, r.bericht.gezaehlt);
    assert.deepEqual(r.bericht.kodierung, ["utf-8"]);
    assert.ok(r.fingerabdruck.startsWith("imp-"));
  }
  // ohne Abschluss-Datei: Datum aus BON_ENDE (Geschäftstag bis 4 Uhr)
  const ohne = einzeln().filter((b) => b.name !== "cashpointclosing.csv");
  const r2 = await vk.exportEinlesen(ohne); assert.deepEqual(r2.tage, ["2026-10-15", "2026-10-16"]); assert.ok(r2.bericht.datumQuelle.bon > 0);
});

test("E7 Parser: Storno, Abbruch, Training, Positionsstorno, Pfand/Rabatt/Trinkgeld werden nicht als Verkauf gezählt, aber berichtet", async () => {
  const r = await vk.exportEinlesen(einzeln());
  const b = r.bericht;
  assert.equal(pos(r, "2026-10-15", "Cola 0,33 l").menge, 2, "2 verkauft − 1 Storno-Beleg + 1 = 2");
  assert.equal(b.stornoBons, 1); assert.equal(b.stornoZeilen, 1); assert.equal(b.positionsStorno, 1);
  assert.equal(b.nichtArtikel["bonTyp:AVBelegabbruch"].zeilen, 1); assert.equal(b.nichtArtikel["bonTyp:AVTraining"].zeilen, 1);
  assert.equal(b.nichtArtikel.Pfand.betrag, 0.25); assert.equal(b.nichtArtikel.Rabatt.betrag, -1); assert.equal(b.nichtArtikel.TrinkgeldAN.zeilen, 1);
  assert.equal(pos(r, "2026-10-15", "Döner Kebab").menge, 2, "Abbruch (1), Training (3) und Positionsstorno (1) zählen nicht");
  assert.equal(b.zeilen, 15);
});

test("E7 CSV: Trennzeichen, Anführungszeichen, Dezimalzeichen und Kodierung defensiv", () => {
  const c = vk.csvLesen('"A";"B";C\r\n"x;y";"he said ""hi""";1,5\r\n"mehr\nzeilig";2;\n');
  assert.deepEqual(c.kopf, ["A", "B", "C"]); assert.equal(c.daten[0].A, "x;y"); assert.equal(c.daten[0].B, 'he said "hi"'); assert.equal(c.daten[1].A, "mehr\nzeilig");
  assert.equal(vk.trennerErkennen("a,b,c\n1,2,3"), ","); assert.equal(vk.trennerErkennen("a\tb\n"), "\t");
  assert.equal(vk.zahlLesen("1.234,56"), 1234.56); assert.equal(vk.zahlLesen("-2,50000"), -2.5); assert.equal(vk.zahlLesen("12.5"), 12.5); assert.equal(vk.zahlLesen(""), null); assert.equal(vk.zahlLesen("abc"), null);
  const w1252 = new Uint8Array([0x44, 0xf6, 0x6e, 0x65, 0x72]); // „Döner“ in Windows-1252
  assert.deepEqual(vk.textAusBytes(w1252), { text: "Döner", kodierung: "windows-1252" });
  assert.equal(vk.textAusBytes(new TextEncoder().encode("﻿Döner")).text, "Döner");
});

test("E7 ZIP: gepackte Einträge nur mit Option – die Sicherung liest weiter nur ungepackte", async () => {
  const z = zipBlob();
  assert.equal((await zip.zipLesen(z)).length, 0, "ohne Option: gepackte Einträge übersprungen (wie bisher)");
  const e = await zip.zipLesen(z, { gepackt: true }); assert.equal(e.length, 5);
  const lines = e.find((x) => x.name.endsWith("lines.csv")); assert.equal(await lines.crcOk(), true);
  assert.match(new TextDecoder().decode(await lines.bytes()), /^Z_KASSE_ID;/);
});

test("E7 Zuordnung: Artikelnummer → gelernter Text → gleicher Name; Unklares nie geraten; Lernen per Chip", async () => {
  const s = laden(); const r = await vk.exportEinlesen(einzeln());
  const v = vk.importVorschau(s, r);
  assert.equal(v.zugeordnet, 4); assert.deepEqual(v.offen.map((o) => o.text).sort(), ["Ayran", "Döner groß", "Dürüm"]);
  assert.equal(vk.zuordnen(s, { plu: "101", text: "irgendwas" }).weg, "plu");
  assert.equal(vk.zuordnen(s, { text: "DÖNER  kebab" }).weg, "name", "groß/klein und Leerzeichen egal");
  const groß = vk.zuordnen(s, { plu: "9003", text: "Döner groß" }); assert.equal(groß.gericht, null, "nicht geraten"); assert.ok(groß.vorschlaege.includes("g1"));
  // Lernen: Dürüm (Nr. 9001) gehört zu g2 – Text und Nummer werden gemerkt
  vk.zuordnungLernen(s, { text: "Dürüm", plu: "9001" }, "g2");
  assert.deepEqual(s.gerichte.find((g) => g.id === "g2").kassenNamen, ["Dürüm"]); assert.equal(s.gerichte.find((g) => g.id === "g2").plu, "9001");
  assert.equal(vk.zuordnen(s, { text: "dürüm" }).weg, "gelernt");
  assert.equal(vk.importVorschau(s, r).offen.length, 2);
  // umlernen: gleicher Text zu einem anderen Gericht → beim alten weg
  vk.zuordnungLernen(s, { text: "Dürüm" }, "g1");
  assert.equal(s.gerichte.find((g) => g.id === "g2").kassenNamen, undefined); assert.deepEqual(s.gerichte.find((g) => g.id === "g1").kassenNamen, ["Dürüm"]);
  // gelernte Zuordnung übersteht die Migration (Sicherung, Neustart)
  const m = st.migrierenBetrieb(structuredClone(s)); assert.deepEqual(m.gerichte.find((g) => g.id === "g1").kassenNamen, ["Dürüm"]);
});

test("E7 Übernehmen: dieselbe Datei zweimal zählt nicht doppelt; geänderter Tag ersetzt; Zurücknehmen", async () => {
  const s = laden(); const r = await vk.exportEinlesen(einzeln());
  const a = vk.importUebernehmen(s, r, { jetzt: "2026-10-17T10:00:00.000Z" });
  assert.equal(a.neu, 7); assert.equal(a.tage, 2);
  const z = { von: "2026-10-15", bis: "2026-10-16" };
  const vor = vk.verkaufJeGericht(s, z); assert.equal(vor.zeilen.find((x) => x.gericht === "g1").menge, 5);
  const b = vk.importUebernehmen(s, r, { jetzt: "2026-10-17T11:00:00.000Z" });
  assert.deepEqual([b.neu, b.gleich, b.ersetzt], [0, 2, 0]);
  assert.equal(vk.verkaufJeGericht(s, z).zeilen.find((x) => x.gericht === "g1").menge, 5, "nichts doppelt");
  // gleicher Tag mit neuem Stand (eine Position mehr) ersetzt den alten
  const r2 = structuredClone(r); r2.positionen.push({ datum: "2026-10-16", plu: "111", text: "Cola 0,33 l", menge: 4, umsatzBrutto: 10, zeilen: 1 });
  const c = vk.importUebernehmen(s, r2, { jetzt: "2026-10-17T12:00:00.000Z" });
  assert.deepEqual([c.gleich, c.tage, c.ersetzt], [1, 1, 2]);
  assert.equal(vk.verkaufJeGericht(s, z).zeilen.find((x) => x.gericht === "g3").menge, 6);
  assert.ok(s.verkaeufe.filter((v) => v.storniert).every((v) => v.ersetzt === c.importId && v.storniertZeit));
  assert.equal(new Set(s.verkaeufe.map((v) => v.id)).size, s.verkaeufe.length, "eindeutige Kennungen");
  // Zurücknehmen des letzten Imports
  const n = vk.importZuruecknehmen(s, c.importId); assert.equal(n, 3, "drei Positionen des neuen Tags");
  assert.equal(vk.verkaufJeGericht(s, z).zeilen.find((x) => x.gericht === "g3").menge, 2);
});

test("E7 Handeingabe: ersetzt den Eintrag desselben Tags und Gerichts; 0 nimmt zurück; Kasse schlägt Hand am selben Tag", async () => {
  const s = laden();
  const e1 = vk.handVerkaufSetzen(s, "2026-10-10", "g1", 5, { jetzt: "2026-10-10T22:00:00.000Z" });
  const e2 = vk.handVerkaufSetzen(s, "2026-10-10", "g1", 7, { jetzt: "2026-10-10T22:05:00.000Z" });
  assert.equal(s.verkaeufe.filter((v) => !v.storniert).length, 1); assert.equal(e1.storniert, true); assert.equal(e1.ersetzt, e2.id);
  assert.deepEqual(vk.handTag(s, "2026-10-10"), { g1: 7 });
  assert.equal(vk.handVerkaufSetzen(s, "2026-10-10", "g1", 7), e2, "gleiche Zahl: nichts Neues");
  vk.handVerkaufSetzen(s, "2026-10-10", "g1", null); assert.deepEqual(vk.handTag(s, "2026-10-10"), {});
  assert.equal(vk.handVerkaufSetzen(s, "2026-10-10", "unbekannt", 3), null);
  // Hand und Kasse am selben Tag: die Kasse zählt
  vk.handVerkaufSetzen(s, "2026-10-15", "g1", 50);
  vk.importUebernehmen(s, await vk.exportEinlesen(einzeln()));
  const j = vk.verkaufJeGericht(s, { von: "2026-10-15", bis: "2026-10-15" });
  assert.equal(j.zeilen.find((x) => x.gericht === "g1").menge, 2); assert.equal(j.doppelt, 1);
});

test("E7 Soll-Verbrauch: Einheiten, Garverlust und Selbstgemachtes auf Rohware heruntergerechnet; Einheitenfehler wird gemeldet", () => {
  const s = laden();
  const r = vk.sollVerbrauch(s, { g1: 10, g5: 2, g4: 3 });
  const a = r.artikel;
  assert.equal(a.Fleisch.menge, 10 * 150 / 0.8, "Garverlust 20 %: Rohware = 150 g / 0,8");
  assert.ok(Math.abs(a.Mehl.menge - 10 * 250 / 1600 * 1000) < 1e-9, "Teig → Mehl");
  assert.ok(Math.abs(a.Hefe.menge - 10 * 250 / 1600 * 20) < 1e-9, "Teig → Hefe");
  assert.deepEqual(a.Mehl.ueber, ["Teig"]); assert.equal(a.Teig, undefined, "Selbstgemachtes steht nicht selbst im Soll");
  assert.equal(a.Box.menge, 10);
  assert.ok(Math.abs(a.Fleisch.wert - 1875 * 80 / 10000) < 1e-9, "Wert = Menge × Preis je Gramm (80 € / 10 kg)");
  assert.deepEqual(r.ohneRezept.map((x) => x.gericht), ["g4"]);
  assert.ok(r.probleme.some((p) => p.gericht === "g5" && p.name === "Fleisch" && p.grund === "einheit"), "1 Stück gegen kg: nicht gerechnet");
});

test("E7 Abgleich mit der Inventur: Ist = Anfang + Einkauf − Ende, Müll und Personalessen abgezogen, Schwund-Verdacht über der Toleranz", () => {
  const s = laden();
  s.inventuren = [
    { id: "i1", datum: "2026-10-01", begonnen: "2026-10-01T20:00:00.000Z", abgeschlossen: "2026-10-01T21:00:00.000Z", posten: { Fleisch: 2, Cola: 1, Box: 1 }, ausgeblendet: [], preise: { Fleisch: 80, Cola: 12, Box: 10 } },
    { id: "i2", datum: "2026-10-10", begonnen: "2026-10-10T20:00:00.000Z", abgeschlossen: "2026-10-10T21:00:00.000Z", posten: { Fleisch: 1, Cola: 0.5, Box: 0.75 }, ausgeblendet: [], preise: { Fleisch: 80, Cola: 12, Box: 10 } },
  ];
  s.lieferungen = [{ id: "l1", datum: "2026-10-05", zeilen: [{ artikel: "Fleisch", menge: 2, inhaltMenge: 10, inhaltEinheit: "kg", netto: 160 }, { artikel: "Cola", menge: 1, inhaltMenge: 24, inhaltEinheit: "stk", netto: 12 }], storniert: false }];
  // 20 Döner (Fleisch 20 × 187,5 g = 3,75 kg) + 1 Teller Müll + 1 Personalessen, Cola 10 verkauft
  vk.handVerkaufSetzen(s, "2026-10-04", "g1", 20); vk.handVerkaufSetzen(s, "2026-10-04", "g3", 10);
  s.schwund.push({ id: "m1", datum: "2026-10-06", art: "gericht", vorgang: 1, ref: { typ: "gericht", id: "g1" }, menge: 1, einheit: "portion", storniert: false });
  s.schwund.push({ id: "p1", datum: "2026-10-06", art: "personal", vorgang: 2, ref: { typ: "gericht", id: "g1" }, menge: 1, einheit: "portion", storniert: false });
  s.schwund.push({ id: "m2", datum: "2026-10-07", art: "rohware", vorgang: 1, ref: { typ: "artikel", name: "Fleisch" }, menge: 500, einheit: "g", storniert: false });
  s.schwund.push({ id: "m3", datum: "2026-09-20", art: "rohware", vorgang: 1, ref: { typ: "artikel", name: "Fleisch" }, menge: 9000, einheit: "g", storniert: false }); // vor dem Zeitraum
  const a = vk.abgleichInventur(s);
  assert.equal(a.von, "2026-10-02"); assert.equal(a.bis, "2026-10-10");
  const f = a.zeilen.find((x) => x.name === "Fleisch");
  assert.equal(f.ist, 20000 + 20000 - 10000);
  assert.equal(f.soll, 3750); assert.equal(f.muell, 187.5 + 500); assert.equal(f.personal, 187.5);
  assert.equal(f.diff, 30000 - 3750 - 687.5 - 187.5);
  assert.equal(f.status, "schwund"); assert.ok(Math.abs(f.diffWert - f.diff * 0.008) < 1e-9);
  const c = a.zeilen.find((x) => x.name === "Cola"); // 24 + 24 − 12 = 36 weg, 10 erwartet → Schwund
  assert.equal(c.ist, 36); assert.equal(c.status, "schwund");
  const b = a.zeilen.find((x) => x.name === "Box"); // 100 − 75 = 25 weg, 20 erwartet, Toleranz ¼ Karton = 25 → ok
  assert.equal(b.ist, 25); assert.equal(b.toleranz, 25); assert.equal(b.status, "ok");
  assert.ok(a.zeilen.every((x) => x.name !== "Mehl" || x.status === "nichtGezaehlt"), "Mehl nicht gezählt → kein Vergleich");
  assert.equal(a.schwund.anzahl, 2);
  // gleiche Rechnung, Fleisch passend gezählt → kein Verdacht
  s.inventuren[1].posten.Fleisch = 3.5; const a2 = vk.abgleichInventur(s); const f2 = a2.zeilen.find((x) => x.name === "Fleisch");
  assert.equal(f2.ist, 5000); assert.equal(f2.status, "ok");
  // weniger als erwartet ohne Beleg → Einkauf fehlt
  s.lieferungen = []; s.inventuren[1].posten.Cola = 1; const a3 = vk.abgleichInventur(s);
  assert.equal(a3.zeilen.find((x) => x.name === "Cola").status, "einkaufFehlt");
});

test("E7 Beispiel-Laden: Verkäufe passen zum Tagesumsatz, zwei Tage von Hand, genau ein Schwund-Verdacht, ein Ladenhüter mit totem Lager", () => {
  const s = beispielLaden(H);
  const preis = new Map(s.gerichte.map((g) => [g.id, g.preis])); const summe = new Map();
  for (const v of s.verkaeufe) summe.set(v.datum, (summe.get(v.datum) || 0) + v.menge * preis.get(v.gericht));
  const tage = s.tagesnotizen.map((n) => n.datum);
  assert.equal(summe.size, tage.length, "Verkäufe an jedem Tag mit Umsatz");
  for (const n of s.tagesnotizen) assert.ok(Math.abs(summe.get(n.datum) - n.umsatz) <= 1, `${n.datum}: ${summe.get(n.datum)} gegen ${n.umsatz}`);
  const hand = new Set(s.verkaeufe.filter((v) => v.herkunft === "hand").map((v) => v.datum)); assert.equal(hand.size, 2);
  assert.ok(s.verkaeufe.filter((v) => v.herkunft !== "hand").every((v) => v.herkunft === "dsfinvk" && typeof v.umsatzBrutto === "number"));
  assert.ok(s.verkaeufe.every((v) => /^bsp-/.test(v.id))); assert.equal(new Set(s.verkaeufe.map((v) => v.id)).size, s.verkaeufe.length);
  assert.equal(JSON.stringify(beispielLaden(H).verkaeufe), JSON.stringify(s.verkaeufe), "ohne Zufall");
  const a = vk.verkaufAuswertung(s);
  assert.equal(a.zeitraum.quelle, "inventur");
  const verdacht = a.abgleich.zeilen.filter((x) => x.status === "schwund");
  assert.deepEqual(verdacht.map((x) => x.name), ["Cola 0,33 l"]); assert.ok(verdacht[0].diffWert > 30, String(verdacht[0].diffWert));
  assert.deepEqual(Object.entries(a.abgleich.zaehl).filter(([k, n]) => k !== "ok" && k !== "schwund" && n > 0), [], "sonst alles im Rahmen");
  assert.ok(a.ladenhueter.gerichte.some((x) => x.name === "Adana-Spieß" && x.art === "keinVerkauf"));
  assert.ok(a.ladenhueter.totesLager.some((x) => x.name === "Adana-Spieß" && x.wert > 0)); assert.ok(a.ladenhueter.gebunden > 0);
  assert.equal(a.verkauf.zeilen[0].name, "Döner Kebab"); assert.equal(a.verkauf.zeilen[0].rang, 1);
  assert.equal(a.ehrlich.mengeOhneZuordnung, 0); assert.deepEqual(a.ehrlich.ohneRezept, []);
});

test("E7 Ehrlichkeit: Anteil ohne Zuordnung, Gerichte ohne Rezept, Waren ohne Preis werden ausdrücklich genannt", async () => {
  const s = laden(); s.artikel.find((a) => a.name === "Box").preis = null;
  vk.importUebernehmen(s, await vk.exportEinlesen(einzeln()));
  vk.handVerkaufSetzen(s, "2026-10-14", "g4", 3);
  const z = { von: "2026-10-14", bis: "2026-10-16" };
  const e = vk.ehrlichkeit(s, z);
  assert.equal(e.mengeOhneZuordnung, 3); assert.ok(e.anteilMengeOhne > 0 && e.anteilMengeOhne < 1);
  assert.ok(e.anteilUmsatzOhne > 0, "Umsatz ohne Gericht");
  assert.deepEqual(e.texteOhne.map((x) => x.text).sort(), ["Ayran", "Döner groß", "Dürüm"]);
  assert.deepEqual(e.ohneRezept.map((x) => x.name), ["Ayran 0,25 l"]); assert.ok(e.ohnePreis.includes("Box"));
  // Zuordnung später lernen wirkt rückwirkend auf gespeicherte Einträge (gericht: null)
  vk.zuordnungLernen(s, { text: "Dürüm" }, "g2");
  assert.equal(vk.ehrlichkeit(s, z).mengeOhneZuordnung, 2);
});

test("E7 Migration: alte Läden ohne Verkäufe, kaputte Einträge, Kassenfelder am Gericht", () => {
  const alt = st.leererBetrieb(); delete alt.verkaeufe; alt.gerichte = [{ id: "g", name: "X", zutaten: [], plu: 123, kassenNamen: ["a", "a", " ", 5, "b"] }];
  const m = st.migrierenBetrieb(alt);
  assert.deepEqual(m.verkaeufe, []); assert.equal(m.gerichte[0].plu, undefined, "Zahl statt Text: weg"); assert.deepEqual(m.gerichte[0].kassenNamen, ["a", "b"]);
  const b = st.leererBetrieb(); b.verkaeufe = [{ id: "ok", datum: "2026-10-01", gericht: "g", menge: "3", herkunft: "quatsch" }, { id: "x", datum: "1.10.2026", menge: 1 }, { datum: "2026-10-01", menge: 1 }, { id: "y", datum: "2026-10-01", menge: null }];
  const v = st.migrierenBetrieb(b).verkaeufe;
  assert.equal(v.length, 1); assert.equal(v[0].menge, 3); assert.equal(v[0].herkunft, "hand"); assert.equal(v[0].storniert, false); assert.equal(v[0].umsatzBrutto, null);
  // alte Sicherung (Schema 6 ohne verkaeufe) und Schema 3 laufen weiter
  const w = st.migrierenWurzel({ schema: 6, betriebe: [{ ...st.leererBetrieb(), verkaeufe: undefined }] }); assert.deepEqual(w.betriebe[0].verkaeufe, []);
  const w3 = st.migrierenWurzel({ schema: 3, betriebe: [{ id: "a", betrieb: { name: "Alt" }, kosten: [] }] }); assert.deepEqual(w3.betriebe[0].verkaeufe, []);
  assert.ok(st.JOURNALE.includes("verkaeufe"));
});

test("E7 Zusammenführen zweier Fenster/Handys: Verkäufe nach Kennung vereinigt, Storno gewinnt; Sicherungs-Erinnerung zählt Verkäufe", async () => {
  const s = laden(); const wA = st.leereWurzel(); wA.betriebe.push(s); wA.aktiv = s.id;
  vk.handVerkaufSetzen(s, "2026-10-01", "g1", 4);
  const wB = st.leereWurzel(); st.zusammenfuehren(wB, structuredClone(wA));
  const bB = wB.betriebe[0];
  vk.handVerkaufSetzen(bB, "2026-10-02", "g2", 2); // nur auf B
  vk.verkaufStornieren(s, s.verkaeufe[0].id);      // A nimmt den ersten zurück
  st.zusammenfuehren(wA, structuredClone(wB));
  const v = wA.betriebe[0].verkaeufe;
  assert.equal(v.length, 2); assert.equal(v.find((x) => x.datum === "2026-10-01").storniert, true, "Storno gewinnt");
  assert.equal(v.find((x) => x.datum === "2026-10-02").menge, 2);
  assert.equal(st.eintraegeZaehlen(wA), 2);
  assert.equal(st.eintraegeZaehlen({ betriebe: [beispielLaden(H)] }), 0, "Beispiel zählt weiterhin nicht");
});

test("E7 Speicher und Sicherung: Verkäufe überstehen Speichern/Laden (Monatsteile) und Export/Einlesen; Storno wird sofort gespeichert", async () => {
  idbAttrappe(); await st.laden();
  const w = st.leereWurzel(); const s = laden(); w.betriebe.push(s); w.aktiv = s.id;
  vk.importUebernehmen(s, await vk.exportEinlesen(einzeln()));
  await st.sofortSpeichern(w);
  const g = await st.laden(); assert.equal(g.betriebe[0].verkaeufe.length, 7);
  vk.verkaufStornieren(g.betriebe[0], g.betriebe[0].verkaeufe[0].id); await st.sofortSpeichern(g);
  const g2 = await st.laden(); assert.equal(g2.betriebe[0].verkaeufe.filter((x) => x.storniert).length, 1, "Storno-Kennzeichen gespeichert");
  const { blob } = await st.exportDatei(g2);
  const r = await st.importSicherung(blob); assert.equal(r.pruefsumme, "ok");
  assert.deepEqual(r.wurzel.betriebe[0].verkaeufe, g2.betriebe[0].verkaeufe);
  assert.equal(r.wurzel.betriebe[0].gerichte.find((x) => x.id === "g1").plu, "101");
});

test("E7 Schalter: ?verkauf=1 wird gemerkt, ?verkauf=0 nimmt ihn weg; Beispiel-Laden zeigt den Bereich immer; ohne Speicher zählt nur die Adresse", () => {
  const m = new Map(); const sp = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) };
  assert.equal(vk.verkaufSchalter({ suche: "", speicher: sp }), false);
  assert.equal(vk.verkaufSchalter({ suche: "?verkauf=1", speicher: sp }), true);
  assert.equal(vk.verkaufSchalter({ suche: "", speicher: sp }), true, "gemerkt");
  assert.equal(vk.verkaufSchalter({ suche: "?verkauf=0", speicher: sp }), false);
  const kaputt = { getItem() { throw new Error("gesperrt"); }, setItem() { throw new Error("gesperrt"); }, removeItem() {} };
  assert.equal(vk.verkaufSchalter({ suche: "?verkauf=1", speicher: kaputt }), true); assert.equal(vk.verkaufSchalter({ suche: "", speicher: kaputt }), false);
  assert.equal(vk.verkaufSichtbar({ beispiel: true }, false), true); assert.equal(vk.verkaufSichtbar(laden(), false), false);
});

test("E7 Oberfläche: Büro-Einstieg nur mit Schalter; Texte in allen Sprachen ohne verbotene Wörter", async () => {
  const i18n = await import("../js/i18n.js"); if (i18n.setzeSprache) await i18n.setzeSprache("de");
  const { bueroView } = await import("../js/screens/buero.js");
  const w = st.leereWurzel(); const s = laden(); w.betriebe.push(s); w.aktiv = s.id;
  assert.ok(!bueroView(s, w).includes('data-wert="verkauf"'), "eigener Laden ohne Schalter: kein Einstieg");
  const b = beispielLaden(H); w.betriebe.push(b);
  assert.ok(bueroView(b, w).includes('data-wert="verkauf"'), "Beispiel-Laden: Einstieg sichtbar");
  const { verkaufView } = await import("../js/screens/verkauf.js");
  const html = verkaufView(b); assert.match(html, /Cola 0,33 l/); assert.match(html, /Adana-Spieß/); assert.ok(!/undefined|NaN/.test(html), "keine Lücken im Text");
  const VERBOTEN = ["revolutionär", "disruptiv", "Marktführer", "GoBD-konform", "betriebsprüfungsfest", "steuersicher", "rechtssicher"];
  for (const f of ["js/verkauf.js", "js/screens/verkauf.js"]) { const t = fs.readFileSync(path.join(HIER, "..", f), "utf8").toLowerCase(); for (const v of VERBOTEN) assert.ok(!t.includes(v.toLowerCase()), f + ": " + v); }
});
