// DSFinV-K-Abgleich (18.10.2026): Die von js/verkauf.js gelesenen Spaltennamen, Dateinamen und Wertelisten gegen die Spezifikation
// „DSFinV-K Version 2.4“ (BZSt). Die Spec-Liste liegt in tests/daten/dsfinvk_spec/felder.json mit Quelle und Fundstelle je Feld.
// Quellenlage (siehe felder.json, Schlüssel "status"): Original-Text gelesen (PDF-Spiegel, S. 1–49: Abschnitt 3 Feldtabellen S. 17/20/24,
// Anhang B S. 43–47, Anhang C S. 48–49, Stornoregeln 4.2 S. 35–38). Anhang E (Längen, Pflicht, Formate) war nicht lesbar – diese Angaben
// in felder.json sind als „sekundär“ markiert und werden hier NICHT geprüft. Geprüft werden nur Dinge mit Fundstelle im Original.
// Die Liste VERWENDET wird von Hand gepflegt; Quelle je Eintrag: js/verkauf.js, Kopfkommentar Zeilen 9–13 und Leser dsfinvkLesen.
// 18.10.2026: die vier „Abweichungen mit Folge“ aus audit/dsfinvk_pruefung.md sind behoben (FAKTOR/EINHEIT, Rabatt/Aufschlag, Kopfkommentar, Storno-Vorzeichen) – geprüft unten.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dsfinvkLesen } from "../js/verkauf.js";

const HIER = path.dirname(fileURLToPath(import.meta.url));
const spec = JSON.parse(fs.readFileSync(path.join(HIER, "daten", "dsfinvk_spec", "felder.json"), "utf8"));

// Was verkauf.js liest (Datei → Spalten). Quelle: js/verkauf.js Kopfkommentar Z. 9–12; bonSchluessel/abschlussSchluessel Z. 130–131;
// TABELLEN Z. 106–111; dsfinvkLesen Z. 160–185.
const VERWENDET = {
  "lines.csv": ["Z_KASSE_ID", "Z_ERSTELLUNG", "Z_NR", "BON_ID", "POS_ZEILE", "ARTIKELTEXT", "GV_TYP", "P_STORNO", "ART_NR", "MENGE", "FAKTOR", "EINHEIT", "STK_BR"],
  "transactions.csv": ["Z_KASSE_ID", "Z_ERSTELLUNG", "Z_NR", "BON_ID", "BON_TYP", "BON_STORNO", "BON_START", "BON_ENDE"],
  "cashpointclosing.csv": ["Z_KASSE_ID", "Z_ERSTELLUNG", "Z_NR", "Z_BUCHUNGSTAG"],
  "lines_vat.csv": ["Z_KASSE_ID", "Z_ERSTELLUNG", "Z_NR", "BON_ID", "POS_ZEILE", "POS_BRUTTO"],
};
// Tabellennamen laut Kopfkommentar Z. 9–12 (Datei → Name der Spec-Tabelle).
const TABELLEN_KOMMENTAR = { "lines.csv": "Bonpos", "transactions.csv": "Bonkopf", "cashpointclosing.csv": "Stamm_Abschluss", "lines_vat.csv": "Bonpos_USt" };
// Wertelisten, die verkauf.js benutzt: BON_TYP-Liste im Kommentar (als Beleg-Filter), GV_TYP „Umsatz“ (gezählt), „Rabatt“/„Aufschlag“ (auf den Bon verteilt), Storno-Kennzeichen „1“.
const BON_TYP_KOMMENTAR = ["Beleg", "AVTraining", "AVBelegabbruch", "AVBestellung", "AVTransfer", "AVSachbezug", "AVRechnung", "AVSonstige", "AVBelegstorno"];
const GV_TYP_VERWENDET = ["Umsatz", "Rabatt", "Aufschlag"];

const nurOriginal = spec.status === "original" || spec.status === "original_teilweise";
const specFelder = (datei) => spec.felder.filter((f) => f.datei === datei).map((f) => f.feld);

test("DSFinV-K: Prüfdaten stammen aus dem Original (sonst keine Aussage)", { skip: nurOriginal ? false : "felder.json nur aus Sekundärquelle: " + spec.status }, () => {
  assert.ok(spec.quellen.Q1.includes("DSFinV-K Version 2.4"));
  assert.ok(Object.keys(spec.tabellen).length >= 4);
});

// --- Verhalten statt Quelltext: ein Export, gebaut NUR aus den Spalten der Liste VERWENDET (Spaltennamen exakt wie in der Spec), durch den echten Leser.
const csvText = (datei, zeilen, { trenner = ";", punkt = false } = {}) => {
  const alle = [VERWENDET[datei], ...zeilen.map((z) => VERWENDET[datei].map((sp) => z[sp] ?? ""))];
  return alle.map((r) => r.map((x) => (punkt ? String(x).replace(/^(-?\d+),(\d+)$/, "$1.$2") : x)).map((x) => (String(x).includes(trenner) ? '"' + x + '"' : x)).join(trenner)).join("\n") + "\n";
};
const bytes = (name, text) => ({ name, bytes: new TextEncoder().encode(text) });
const KOPF = { Z_KASSE_ID: "K1", Z_ERSTELLUNG: "2026-10-16T01:00:00+02:00", Z_NR: "7" };
const zl = (bon, pos, extra) => ({ ...KOPF, BON_ID: bon, POS_ZEILE: pos, GV_TYP: "Umsatz", FAKTOR: "1,000", EINHEIT: "Stück", ...extra });
const bk = (bon, typ, storno = "0") => ({ ...KOPF, BON_ID: bon, BON_TYP: typ, BON_STORNO: storno, BON_START: "2026-10-15T12:00:00+02:00", BON_ENDE: "2026-10-15T12:05:00+02:00" });
function exportBauen(opt = {}) {
  const lines = [
    zl("1", "1", { ARTIKELTEXT: "Döner", ART_NR: "101", MENGE: "2,000", STK_BR: "8,00" }),                               // POS_BRUTTO aus lines_vat (15,00) geht vor STK_BR × MENGE (16,00)
    zl("1", "2", { ARTIKELTEXT: "Cola 0,33 l", ART_NR: "111", MENGE: "1,000", FAKTOR: "6,000", STK_BR: "2,50" }),         // 6er-Gebinde: Menge 1 × 6 = 6, Umsatz 2,50 × 6 = 15,00
    zl("1", "3", { ARTIKELTEXT: "Rabatt", GV_TYP: "Rabatt", MENGE: "1,000", STK_BR: "-3,00" }),                           // wird auf die drei Umsatz-Zeilen des Bons verteilt
    zl("1", "4", { ARTIKELTEXT: "Döner", ART_NR: "101", MENGE: "5,000", STK_BR: "8,00", P_STORNO: "1" }),                 // Positionsstorno: zählt nicht
    zl("1", "5", { ARTIKELTEXT: "Hackfleisch", ART_NR: "900", MENGE: "1,500", EINHEIT: "kg", STK_BR: "10,00" }),          // andere Einheit als Stück: „nach Menge“
    zl("2", "1", { ARTIKELTEXT: "Döner", ART_NR: "101", MENGE: "1,000", STK_BR: "8,00" }),                                // BON_TYP AVTraining: kein Verkauf
    zl("3", "1", { ARTIKELTEXT: "Döner", ART_NR: "101", MENGE: "-1,000", STK_BR: "8,00" }),                               // Stornobeleg: Vorzeichen wie geliefert
  ];
  const tx = [bk("1", "Beleg"), bk("2", "AVTraining"), bk("3", "Beleg", "1")];
  const abschluss = [{ ...KOPF, Z_BUCHUNGSTAG: "2026-10-15" }];
  const vat = [{ ...KOPF, BON_ID: "1", POS_ZEILE: "1", POS_BRUTTO: "15,00" }];
  const o = { punkt: !!opt.punkt, trenner: opt.trenner || ";" };
  return [bytes("lines.csv", csvText("lines.csv", lines, o)), bytes("transactions.csv", csvText("transactions.csv", tx, o)),
    bytes("cashpointclosing.csv", csvText("cashpointclosing.csv", abschluss, o)), bytes("lines_vat.csv", csvText("lines_vat.csv", vat, o))];
}
// Von Hand gerechnet (Rabatt −3,00 auf je 15,00 / 15,00 / 15,00 → −1,00 je Zeile):
// Cola 6 Stück, 15,00 − 1,00 = 14,00 · Döner (Bon 1) 2 Stück, 15,00 − 1,00 = 14,00, dazu Stornobeleg −1 Stück, −8,00 → 1 Stück, 6,00 · Hackfleisch 1,5 kg, 15,00 − 1,00 = 14,00.
const ERWARTET = [
  { datum: "2026-10-15", kasse: "K1", plu: "111", text: "Cola 0,33 l", menge: 6, umsatzBrutto: 14, zeilen: 1 },
  { datum: "2026-10-15", kasse: "K1", plu: "101", text: "Döner", menge: 1, umsatzBrutto: 6, zeilen: 2 },
  { datum: "2026-10-15", kasse: "K1", plu: "900", text: "Hackfleisch", einheit: "kg", menge: 1.5, umsatzBrutto: 14, zeilen: 1 },
];

test("DSFinV-K: der Leser versteht einen Export, der nur die Spalten aus VERWENDET hat – Summen, Storno, Rabatt, Gebinde, Einheit, Bon-Typ", () => {
  const r = dsfinvkLesen(exportBauen());
  assert.deepEqual(r.bericht.fehler, []);
  assert.deepEqual(r.positionen, ERWARTET);
  assert.deepEqual(r.tage, ["2026-10-15"]);
  const b = r.bericht;
  assert.equal(b.positionsStorno, 1, "P_STORNO = 1 wird übersprungen");
  assert.equal(b.stornoBons, 1); assert.equal(b.stornoZeilen, 1); assert.equal(b.stornoRueck, 0, "negative Menge im Stornobeleg ist keine stornierte Rücknahme");
  assert.deepEqual(b.bonTyp, { Beleg: 2, AVTraining: 1 });
  assert.equal(b.nichtArtikel["bonTyp:AVTraining"].zeilen, 1, "Training zählt nicht als Verkauf");
  assert.equal(b.nichtArtikel.Rabatt.zeilen, 1); assert.equal(b.verteilt, -3);
  assert.equal(b.faktor, 1); assert.equal(b.nachMenge, 1); assert.equal(b.gezaehlt, 4);
  assert.deepEqual(b.datumQuelle, { abschluss: 4, bon: 0, erstellung: 0 }, "Datum aus Z_BUCHUNGSTAG");
});

test("DSFinV-K: Zeichensatz, Trenner und Dezimalzeichen kommen aus der index.xml; ohne sie erkennt der Leser sie (Abweichung 3)", () => {
  const index = '<?xml version="1.0"?><DataSet><Media><Table><VariableLength><DecimalSymbol>.</DecimalSymbol><ColumnDelimiter>|</ColumnDelimiter><TextEncapsulator>&quot;</TextEncapsulator></VariableLength></Table></Media></DataSet>';
  const basis = dsfinvkLesen(exportBauen());
  const ohne = dsfinvkLesen(exportBauen({ punkt: true, trenner: "," }));
  const mit = dsfinvkLesen([...exportBauen({ punkt: true, trenner: "|" }), bytes("index.xml", index)]);
  assert.deepEqual(ohne.positionen, ERWARTET, "Erkennung ohne index.xml (Komma als Trenner, Punkt als Dezimalzeichen)");
  assert.deepEqual(mit.positionen, ERWARTET, "Vorgabe aus index.xml");
  assert.equal(mit.fingerabdruck, basis.fingerabdruck); assert.equal(ohne.fingerabdruck, basis.fingerabdruck);
});

test("DSFinV-K: Stornobeleg ohne erzwungenes Minus – eine positive Menge im Stornobeleg wird addiert und im Bericht gezählt (4.2.2; Abweichung 4)", () => {
  const dat = exportBauen().map((d) => (d.name !== "lines.csv" ? d : { ...d, bytes: new TextEncoder().encode(new TextDecoder().decode(d.bytes).replace("-1,000", "1,000")) }));
  const r = dsfinvkLesen(dat);
  assert.equal(r.bericht.stornoRueck, 1);
  const doener = r.positionen.find((p) => p.text === "Döner");
  assert.equal(doener.menge, 3, "2 + 1: Vorzeichen wie geliefert, kein -Math.abs");
});

test("DSFinV-K: Dateinamen und Tabellennamen (Anhang E Inhaltsverzeichnis S. 66–104)", { skip: nurOriginal ? false : "keine Originalquelle" }, () => {
  for (const [datei, name] of Object.entries(TABELLEN_KOMMENTAR)) {
    assert.ok(spec.tabellen[datei], "Datei nicht in der Spec: " + datei);
    assert.equal(spec.tabellen[datei].name, name, "Tabellenname im Kopfkommentar weicht ab: " + datei);
  }
  assert.ok(specFelder("cashpointclosing.csv").includes("Z_BUCHUNGSTAG"), "Z_BUCHUNGSTAG gehört laut Spec (S. 24) zu Stamm_Abschluss = cashpointclosing.csv");
});

test("DSFinV-K: jede verwendete Spalte steht exakt so (Groß-/Kleinschreibung) in der Spec-Tabelle", { skip: nurOriginal ? false : "keine Originalquelle" }, () => {
  for (const [datei, spalten] of Object.entries(VERWENDET)) {
    const soll = specFelder(datei);
    for (const s of spalten) {
      const treffer = soll.find((x) => x === s);
      const lax = soll.find((x) => x.toUpperCase() === s.toUpperCase());
      assert.ok(treffer, `${datei}: Spalte ${s} nicht in der Spec` + (lax ? ` (Spec schreibt „${lax}“)` : ""));
    }
  }
});

test("DSFinV-K: Spalten, die verkauf.js liest, sind im Original belegt (nicht nur sekundär)", { skip: nurOriginal ? false : "keine Originalquelle" }, () => {
  for (const [datei, spalten] of Object.entries(VERWENDET)) for (const s of spalten) {
    const f = spec.felder.find((x) => x.datei === datei && x.feld === s);
    assert.ok(/Q1 S\. \d+/.test(f.quelle), `${datei}.${s}: keine Fundstelle im Original (${f.quelle})`);
  }
});

test("DSFinV-K: Wertelisten BON_TYP (Anhang B) und GV_TYP (Anhang C) wie in verkauf.js", { skip: nurOriginal ? false : "keine Originalquelle" }, () => {
  const bonTyp = spec.wertelisten.BON_TYP.werte;
  assert.deepEqual([...BON_TYP_KOMMENTAR].sort(), [...bonTyp].sort(), "BON_TYP-Liste in verkauf.js ≠ Anhang B");
  assert.deepEqual(spec.wertelisten.BON_TYP.abschluss_relevant, ["Beleg"], "verkauf.js zählt nur BON_TYP „Beleg“ – laut Spec der einzige abschlussrelevante Typ");
  for (const g of GV_TYP_VERWENDET) assert.ok(spec.wertelisten.GV_TYP.werte.includes(g), "GV_TYP fehlt in Anhang C: " + g);
});

test("DSFinV-K: Storno-Kennzeichen „1“ und negative MENGE (Abschnitt 4.2, S. 35–38)", { skip: nurOriginal ? false : "keine Originalquelle" }, () => {
  const regeln = spec.wertelisten.STORNO.regeln.join(" ");
  assert.ok(/BON_STORNO = „1“/.test(regeln) && /P_STORNO = „1“/.test(regeln));
  assert.ok(/negiertem Vorzeichen/.test(regeln), "Spec: Positionsstorno auch als Zeile mit negativer MENGE – verkauf.js summiert MENGE vorzeichengerecht");
});

test("DSFinV-K: Felder MENGE, FAKTOR, EINHEIT (S. 17) werden alle drei gelesen (Prüfung 18.10.2026, Abweichung 1)", { skip: nurOriginal ? false : "keine Originalquelle" }, () => {
  const l = specFelder("lines.csv");
  for (const f of ["MENGE", "FAKTOR", "EINHEIT"]) { assert.ok(l.includes(f)); assert.ok(VERWENDET["lines.csv"].includes(f), "VERWENDET ohne " + f); }
  assert.equal(spec.felder.find((x) => x.datei === "lines.csv" && x.feld === "FAKTOR").beschreibung, "Faktor, z. B. Gebindegrößen");
  assert.match(spec.felder.find((x) => x.datei === "lines.csv" && x.feld === "EINHEIT").beschreibung, /kg, Liter oder Stück/);
});

test("DSFinV-K: Spec legt Zeichensatz/Trenner nicht fest (Leser-Verhalten dazu: index.xml-Test oben, Abweichung 3)", { skip: nurOriginal ? false : "keine Originalquelle" }, () => {
  assert.match(spec.format.befund, /legt Zeichensatz, Spaltentrenner, Textbegrenzer und Dezimalzeichen NICHT fest/);
});

test("DSFinV-K: Stornobeleg ohne erzwungenes Minus – Vorzeichen wie geliefert (4.2.2, Anhang B S. 46; Abweichung 4)", { skip: nurOriginal ? false : "keine Originalquelle" }, () => {
  assert.match(spec.wertelisten.BON_TYP.anmerkung, /nicht die negative Darstellung eines Beleges/);
  assert.match(spec.wertelisten.STORNO.regeln.join(" "), /Stornobeleg ist ein separater Beleg/);
});
