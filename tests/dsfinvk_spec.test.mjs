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

const HIER = path.dirname(fileURLToPath(import.meta.url));
const spec = JSON.parse(fs.readFileSync(path.join(HIER, "daten", "dsfinvk_spec", "felder.json"), "utf8"));
const quelltext = fs.readFileSync(path.join(HIER, "..", "js", "verkauf.js"), "utf8");

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

test("DSFinV-K: die Liste VERWENDET stimmt mit dem Quelltext von verkauf.js überein", () => {
  for (const [datei, spalten] of Object.entries(VERWENDET)) {
    assert.ok(quelltext.includes(datei), "Dateiname fehlt in verkauf.js: " + datei);
    for (const s of spalten) assert.ok(new RegExp("\\b" + s + "\\b").test(quelltext), "Spalte fehlt in verkauf.js: " + s);
  }
  // Keine Spalte in verkauf.js lesen, die hier nicht gepflegt ist: alle r.GROSSBUCHSTABEN-Zugriffe im Leser müssen in VERWENDET stehen.
  const alle = new Set(Object.values(VERWENDET).flat());
  const zugriffe = [...quelltext.matchAll(/\b(?:r|bon)\??\.([A-Z][A-Z0-9_]{2,})\b/g)].map((m) => m[1]);
  for (const z of new Set(zugriffe)) assert.ok(alle.has(z), "verkauf.js liest eine Spalte, die nicht in VERWENDET gepflegt ist: " + z);
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
  assert.ok(/VERTEILEN = new Set\(\["rabatt", "aufschlag"\]\)/.test(quelltext), "verkauf.js verteilt „Rabatt“/„Aufschlag“ auf die Umsatz-Zeilen des Bons (Prüfung 18.10.2026, Abweichung 2)");
  // verkauf.js vergleicht klein geschrieben („beleg“, „umsatz“) – lax, aber die Spec-Werte sind dadurch sicher abgedeckt.
  assert.ok(/toLowerCase\(\) !== "beleg"/.test(quelltext) && /gvKlein = gv\.toLowerCase\(\)/.test(quelltext) && /gvKlein !== "umsatz"/.test(quelltext));
});

test("DSFinV-K: Storno-Kennzeichen „1“ und negative MENGE (Abschnitt 4.2, S. 35–38)", { skip: nurOriginal ? false : "keine Originalquelle" }, () => {
  const regeln = spec.wertelisten.STORNO.regeln.join(" ");
  assert.ok(/BON_STORNO = „1“/.test(regeln) && /P_STORNO = „1“/.test(regeln));
  assert.ok(/r\.P_STORNO === "1"/.test(quelltext), "verkauf.js prüft P_STORNO auf „1“");
  assert.ok(/BON_STORNO === "1"/.test(quelltext), "verkauf.js prüft BON_STORNO auf „1“");
  assert.ok(/negiertem Vorzeichen/.test(regeln), "Spec: Positionsstorno auch als Zeile mit negativer MENGE – verkauf.js summiert MENGE vorzeichengerecht");
});

test("DSFinV-K: Felder MENGE, FAKTOR, EINHEIT (S. 17) werden alle drei gelesen (Prüfung 18.10.2026, Abweichung 1)", { skip: nurOriginal ? false : "keine Originalquelle" }, () => {
  const l = specFelder("lines.csv");
  for (const f of ["MENGE", "FAKTOR", "EINHEIT"]) { assert.ok(l.includes(f)); assert.ok(VERWENDET["lines.csv"].includes(f), "VERWENDET ohne " + f); assert.ok(new RegExp("r\\." + f + "\\b").test(quelltext), "verkauf.js liest " + f + " nicht"); }
  assert.equal(spec.felder.find((x) => x.datei === "lines.csv" && x.feld === "FAKTOR").beschreibung, "Faktor, z. B. Gebindegrößen");
  assert.match(spec.felder.find((x) => x.datei === "lines.csv" && x.feld === "EINHEIT").beschreibung, /kg, Liter oder Stück/);
});

test("DSFinV-K: Kopfkommentar behauptet keine Formatvorgabe mehr – Zeichensatz/Trenner kommen aus der index.xml (GoBD), sonst Erkennung (Abweichung 3)", { skip: nurOriginal ? false : "keine Originalquelle" }, () => {
  assert.match(spec.format.befund, /legt Zeichensatz, Spaltentrenner, Textbegrenzer und Dezimalzeichen NICHT fest/);
  const kopf = quelltext.split("\nimport ")[0];
  assert.ok(!/Format laut Beschreibung \(index\.xml\)/.test(kopf), "alter Satz (Formatvorgabe) steht noch im Kopfkommentar");
  assert.ok(/legt die DSFinV-K selbst NICHT fest/.test(kopf) && /index\.xml/.test(kopf) && /GoBD/.test(kopf) && /Erkennung/.test(kopf), "Kopfkommentar nennt index.xml (GoBD) und den Rückfall auf Erkennung nicht");
  assert.ok(/indexXmlLesen/.test(quelltext) && /trennerErkennen/.test(quelltext), "Leser liest index.xml und erkennt sonst");
});

test("DSFinV-K: Stornobeleg ohne erzwungenes Minus – Vorzeichen wie geliefert (4.2.2, Anhang B S. 46; Abweichung 4)", { skip: nurOriginal ? false : "keine Originalquelle" }, () => {
  assert.match(spec.wertelisten.BON_TYP.anmerkung, /nicht die negative Darstellung eines Beleges/);
  assert.match(spec.wertelisten.STORNO.regeln.join(" "), /Stornobeleg ist ein separater Beleg/);
  assert.ok(!/-Math\.abs\(/.test(quelltext), "verkauf.js erzwingt beim Stornobeleg noch ein Minus (-Math.abs)");
  assert.ok(/stornoRueck/.test(quelltext), "stornierte Rücknahmen (positive Menge im Stornobeleg) werden im Bericht gezählt");
});
