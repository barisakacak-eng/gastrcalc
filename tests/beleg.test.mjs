// Tests für den Belegzerleger. Teil 1: Testzeilen aus testzeilen_de.txt (synthetisch, je Händlerblock ein Belegtext,
// jede Testzeile ein eigener Fall). Teil 2: eigene Fälle für Fußzeile, Zahlenformen, Umbrüche, Lieferschein, OCR.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { belegZerlegen, zeileAnwenden, preisJeEinheit, GEBINDE_KUERZEL } from "../js/beleg.js";

const PFAD = process.env.BELEG_TESTZEILEN ?? "/tmp/claude-0/-home-claude-gastrcalc/f35adb46-53b0-5ba6-a6cd-306b3654a5dd/scratchpad/belege/testzeilen_de.txt";
const WORT = { karton: "karton", kanister: "kanister", kiste: "kiste", kasten: "kasten", beutel: "beutel", netz: "netz", eimer: "eimer", laib: "laib", tray: "tray", display: "display", palette: "palette", keg: "fass", pack: "packung", sack: "sack", stück: "stueck", flasche: "flasche" };
const nah = (a, b, tol = 0.006) => a !== null && b !== null && Math.abs(a - b) <= tol;

// ---- Testdatei lesen: "# Händler", "#! schwierig", Belegzeilen, "=> Erwartung" --------------------------------------
function testzeilenLesen(pfad) {
  const bloecke = [];
  let block = null, schwierig = false, rohs = [], gestartet = false;
  for (const raw of readFileSync(pfad, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!gestartet) { if (/^# -{10,}/.test(line)) gestartet = true; continue; }
    if (!line) continue;
    if (line.startsWith("#!")) { schwierig = true; continue; }
    if (line.startsWith("# ")) { block = { haendler: line.slice(2).trim(), zeilen: [], erwartungen: [] }; bloecke.push(block); continue; }
    if (line.startsWith("=>")) {
      block.erwartungen.push({ roh: rohs.join("\n"), schwierig, felder: line.slice(2).split("|").map((s) => s.trim()) });
      rohs = []; schwierig = false; continue;
    }
    rohs.push(line); block.zeilen.push(line);
  }
  return bloecke;
}
const deZahl = (s) => { const t = s.replace(/\./g, "").replace(",", "."); const n = Number(t); return Number.isFinite(n) ? n : null; };
// Zahl aus einer Erwartungszelle: "1290 (vermutlich 12,90)" → beide Werte erlaubt, "-3 (Rückgabe)" → -3, "n.a." → null
function zahlen(cell) {
  if (/^n\.a\./i.test(cell)) return { werte: [null], jeKg: false };
  const alle = [...cell.matchAll(/-?\d+(?:\.\d{3})*(?:,\d+)?/g)].map((m) => deZahl(m[0]));
  const werte = /vermutlich/i.test(cell) ? alle : alle.slice(0, 1);
  return { werte, jeKg: /je kg/i.test(cell) };
}
function gebindeErwartet(cell) {
  const w = cell.replace(/\(.*?\)/g, "").trim().split(/\s+/)[0] ?? "";
  if (!w || /^n\.a\./i.test(w)) return undefined;
  return GEBINDE_KUERZEL[w.toUpperCase()] ?? WORT[w.toLowerCase()];
}
function inhaltErwartet(cell) {
  if (/^n\.a\./i.test(cell) || cell.includes("?")) return undefined;
  const klammer = /\(([^)]*)\)/.exec(cell)?.[1] ?? "";
  const s = cell.replace(/\(.*?\)/g, "").trim();
  let m;
  if (/^variabel/i.test(s) && (m = /([\d,]+)\s*kg/.exec(klammer))) return { anzahl: 1, groesse: deZahl(m[1]), einheit: "kg", tol: 0.001 };
  if ((m = /^ca\.?\s*([\d,]+)\s*kg/i.exec(s))) return { anzahl: 1, groesse: deZahl(m[1]), einheit: "kg", tol: 0.03 };
  if ((m = /^(\d+)\s*x\s*([\d,]+)\s*(kg|g|l)\b/.exec(s))) return { anzahl: Number(m[1]), groesse: deZahl(m[2]), einheit: m[3], tol: 0 };
  if ((m = /^(\d+)\s*Stück/.exec(s))) return { anzahl: Number(m[1]), groesse: null, einheit: "stk", tol: 0 };
  if ((m = /^([\d,]+)\s*(kg|g|l)\b/.exec(s))) return { anzahl: 1, groesse: deZahl(m[1]), einheit: m[2], tol: 0 };
  return undefined;
}

// ---- Vergleich einer Erwartung mit dem Ergebnis; liefert { status: "sicher"|"frage", fehler: [] } -------------------
function pruefen(erw, ergebnis, vorherigeWare) {
  const [artikel, gebCell, inhaltCell, mengeCell, einzelCell, gesamtCell, steuerCell] = erw.felder;
  const fehler = [];
  const kern = artikel.toLowerCase().replace(/[()„“"]/g, "").split(/\s+/)[0];
  const menge = zahlen(mengeCell).werte[0], gesamt = zahlen(gesamtCell), einzel = zahlen(einzelCell);
  const steuer = /^n\.a\./i.test(steuerCell) ? null : steuerCell;

  if (/^rabatt/i.test(artikel)) {
    // Regel 8: Rabatt landet auf der Bezugszeile (referenzierte Nummer, sonst vorherige Warenzeile)
    const ref = /\b(\d{4,13})\b/.exec(erw.roh)?.[1];
    const ziel = (ref && ergebnis.zeilen.find((z) => z.artikelnummer === ref)) || vorherigeWare;
    if (!ziel) fehler.push("keine Bezugszeile für Rabatt");
    else if (!nah(ziel.rabatt, gesamt.werte[0])) fehler.push(`Rabatt ${ziel.rabatt} statt ${gesamt.werte[0]} auf „${ziel.name}“`);
    return { status: "sicher", fehler, zeile: null };
  }
  if (/^(pfand|leergut|kastenpfand|flaschenpfand|fass-?pfand)/i.test(artikel)) {
    const p = ergebnis.pfand.find((x) => x.roh === erw.roh);
    if (!p) return { status: "sicher", fehler: ["nicht als Pfand erkannt" + (ergebnis.zeilen.some((z) => z.roh.startsWith(erw.roh)) ? " (als Ware geführt)" : "")], zeile: null };
    if (!/pfand|leergut/i.test(p.text)) fehler.push(`Pfandtext „${p.text}“`);
    if (p.anzahl !== menge) fehler.push(`Pfand-Anzahl ${p.anzahl} statt ${menge}`);
    if (!nah(p.betrag, gesamt.werte[0])) fehler.push(`Pfand-Betrag ${p.betrag} statt ${gesamt.werte[0]}`);
    return { status: "sicher", fehler, zeile: null };
  }

  const z = ergebnis.zeilen.find((x) => x.roh === erw.roh || x.roh.startsWith(erw.roh + "\n"));
  if (!z) return { status: "sicher", fehler: ["Zeile nicht als Ware gefunden" + (ergebnis.pfand.some((p) => p.roh === erw.roh) ? " (als Pfand geführt)" : "")], zeile: null };
  if (!z.name.toLowerCase().includes(kern)) fehler.push(`Name „${z.name}“ ohne Kern „${kern}“`);
  if (z.artikelnummer && z.name.includes(z.artikelnummer)) fehler.push("Artikelnummer im Namen");
  const geb = gebindeErwartet(gebCell);
  if (geb !== undefined && z.gebinde !== geb) fehler.push(`Gebinde ${z.gebinde} statt ${geb}`);
  if (z.menge !== menge) fehler.push(`Menge ${z.menge} statt ${menge}`);
  if (!einzel.werte.some((w) => (w === null ? z.einzelpreis === null : nah(z.einzelpreis, w)))) fehler.push(`Einzelpreis ${z.einzelpreis} statt ${einzelCell}`);
  if (einzel.jeKg !== z.jeKg) fehler.push(`jeKg ${z.jeKg} statt ${einzel.jeKg}`);
  const brutto = z.gesamt === null ? null : z.gesamt - z.rabatt;   // Zeilenwert vor Rabatt (Erwartung nennt den gedruckten Wert)
  if (!gesamt.werte.some((w) => (w === null ? brutto === null : nah(brutto, w)))) fehler.push(`Gesamt ${brutto} statt ${gesamtCell}`);
  if (z.steuer !== steuer) fehler.push(`Steuer ${z.steuer} statt ${steuer}`);
  const inh = inhaltErwartet(inhaltCell);
  if (inh && !z.frage) {
    if (z.inhalt.anzahl !== inh.anzahl || z.inhalt.einheit !== inh.einheit) fehler.push(`Inhalt ${JSON.stringify(z.inhalt)} statt ${inhaltCell}`);
    else if (inh.groesse !== null && !(z.inhalt.groesse !== null && Math.abs(z.inhalt.groesse - inh.groesse) <= inh.tol * Math.max(1, inh.groesse))) fehler.push(`Inhalt-Größe ${z.inhalt.groesse} statt ${inh.groesse}`);
  }
  if (!z.sicher && !z.frage) fehler.push("unsicher, aber ohne Frage");
  if (z.frage && (!z.frage.text || !Array.isArray(z.frage.optionen) || z.frage.optionen.length < 2 || z.frage.optionen.length > 3)) fehler.push("Frage ohne zwei bis drei Antwortmöglichkeiten");
  return { status: z.sicher ? "sicher" : "frage", fehler, zeile: z };
}

// ---- Teil 1: Testzeilen ---------------------------------------------------------------------------------------------
const bilanz = { sicher: 0, frage: 0, falsch: 0, gesamt: 0 };
if (existsSync(PFAD)) {
  for (const block of testzeilenLesen(PFAD)) {
    const ergebnis = belegZerlegen(block.zeilen.join("\n"));
    let vorherigeWare = null;
    for (const erw of block.erwartungen) {
      const r = pruefen(erw, ergebnis, vorherigeWare);
      if (r.zeile) vorherigeWare = r.zeile;
      bilanz.gesamt++;
      if (r.fehler.length) bilanz.falsch++; else bilanz[r.status]++;
      test(`${block.haendler}: ${erw.roh.replace(/\n/g, " ⏎ ")}`, () => {
        assert.deepEqual(r.fehler, [], `Erwartung: ${erw.felder.join(" | ")}`);
      });
    }
  }
  test("Bilanz der Testzeilen: keine falsche Zeile", (t) => {
    t.diagnostic(`Testzeilen: ${bilanz.gesamt} gesamt, ${bilanz.sicher} sicher richtig, ${bilanz.frage} mit Frage, ${bilanz.falsch} falsch`);
    assert.equal(bilanz.falsch, 0);
  });
} else {
  test("Testzeilen-Datei fehlt (BELEG_TESTZEILEN setzen)", { skip: true }, () => {});
}

// ---- Teil 2: eigene Fälle -------------------------------------------------------------------------------------------
const RECHNUNG = [
  "METRO Cash & Carry Deutschland GmbH",
  "Rechnung Nr. 4711-0815  Datum 03.10.2026  Kunden-Nr. 123456",
  "Art.-Nr. Bezeichnung Menge Einzelpreis Gesamt",
  "4001234 METRO Chef Tomaten gehackt KT 6x2,5kg 2 14,90 29,80 B",
  "4022871 aro Sonnenblumenöl 10 l KA 1 18,90 18,90 A",
  "4041100 Eier Gr. M Bodenhaltung 30er KT 4 4,29 17,16 B",
  "PFAND MEHRWEG KASTEN 2 1,50 3,00 A",
  "Summe Netto 65,86",
  "MwSt A 7 % 1,53",
  "MwSt B 19 % 8,92",
  "Brutto 79,31",
  "Zahlungsziel 14 Tage, IBAN DE00 1234 5678",
].join("\n");

test("Fußzeile: Summenprobe netto, Steuerzeichen, Kopf übersprungen", () => {
  const e = belegZerlegen(RECHNUNG, { bekannt: ["Tomaten gehackt", "Sonnenblumenöl", "Eier"] });
  assert.equal(e.lieferant, "Metro");
  assert.equal(e.datum, "2026-10-03");
  assert.equal(e.typ, "rechnung");
  assert.equal(e.zeilen.length, 3);
  assert.equal(e.pfand.length, 1);
  assert.equal(e.zeilenSumme, 65.86);
  assert.equal(e.summeNetto, 65.86);
  assert.equal(e.summeBrutto, 79.31);
  assert.equal(e.summeStimmt, true);
  assert.equal(e.basis, "netto");
  assert.deepEqual(e.steuerzeichen, { A: 0.07, B: 0.19 });
  assert.equal(e.zeilen[0].steuersatz, 0.19);
  assert.equal(e.zeilen[1].steuersatz, 0.07);
  assert.equal(e.zeilen[0].bekannt, "Tomaten gehackt");
  assert.equal(e.zeilen[2].bekannt, "Eier");
  assert.ok(e.zeilen.every((z) => z.sicher && z.frage === null));
  assert.equal(e.uebersprungen, 8);
});

test("Fußzeile: Summe passt nicht → summeStimmt false, Basis unklar", () => {
  const e = belegZerlegen("4001234 Tomaten KT 2 14,90 29,80 B\n4022871 Öl KA 1 18,90 18,90 A\nSumme Netto 60,00\nBrutto 70,00");
  assert.equal(e.summeStimmt, false);
  assert.equal(e.basis, "unklar");
});

test("Fußzeile: Bruttobon (Summe passt zu „Summe“ mit „inkl. MwSt“)", () => {
  const e = belegZerlegen("Famila Markt\nGouda jung 400 g 3,29 B\nKinder Pingui 2 x 1,29 2,58 B\nSUMME EUR 5,87\ninkl. MwSt 7% 0,38");
  assert.equal(e.zeilen.length, 2);
  assert.equal(e.zeilenSumme, 5.87);
  assert.equal(e.summeStimmt, true);
  assert.equal(e.basis, "brutto");
  assert.equal(e.lieferant, "Famila");
});

test("Zahlen: Tausenderpunkt, Punkt als Dezimalzeichen, Euro hinter Zahlen", () => {
  const e = belegZerlegen([
    "4050077 Reis Basmati 20kg SA 40 30,86 1.234,40 B",
    "4001236 Tomaten Cherry KL1 KT 3 kg 2 9.50 19.00 B",
    "Tomaten rund KL1 KT 6 kg 1 x 12,90 € 12,90 €",
  ].join("\n"));
  assert.equal(e.zeilen.length, 3);
  assert.deepEqual(e.zeilen.map((z) => [z.menge, z.einzelpreis, z.gesamt, z.sicher]), [[40, 30.86, 1234.4, true], [2, 9.5, 19, true], [1, 12.9, 12.9, true]]);
  assert.deepEqual(e.zeilen[0].inhalt, { anzahl: 1, groesse: 20, einheit: "kg" });
  assert.equal(e.zeilen[2].steuer, null);
  assert.equal(e.zeilenSumme, 1266.3);
});

test("Zahlen: Preis ohne Komma → Frage, Antwort anwenden", () => {
  const e = belegZerlegen("4001235 Tomaten rund KL1 KT 6 kg 1 1290 1290 B\n4022871 aro Sonnenblumenöl 10 l KA 1 18,90 18,90 A");
  const z = e.zeilen[0];
  assert.equal(z.sicher, false);
  assert.equal(z.frage.art, "preis");
  assert.equal(z.menge, 1);
  assert.equal(z.steuer, "B");
  assert.equal(z.name, "Tomaten rund KL1");
  const neu = zeileAnwenden(z, z.frage.optionen[0].wert);
  assert.equal(neu.einzelpreis, 12.9);
  assert.equal(neu.gesamt, 12.9);
  assert.equal(neu.sicher, true);
  assert.equal(neu.frage, null);
});

test("Zahlen: nachgestelltes Minus (Retoure) → negative Menge", () => {
  const e = belegZerlegen("100877 Eisbergsalat Stück 10 ST 0,89 8,90 7\nRetoure Eisbergsalat Stück 2 ST 0,89 1,78- 7\nSumme Netto 7,12");
  assert.equal(e.zeilen.length, 2);
  assert.deepEqual([e.zeilen[1].menge, e.zeilen[1].einzelpreis, e.zeilen[1].gesamt, e.zeilen[1].sicher], [-2, 0.89, -1.78, true]);
  assert.equal(e.summeStimmt, true);
});

test("Rabattzeile gehört zur vorherigen Zeile, Summe nach Rabatt", () => {
  const e = belegZerlegen("4010456 Pommes Frites 4x2,5kg KT 3 21,45 64,35 B\nAktion Sofortrabatt -3,20 B\n4022871 Öl 10 l KA 1 18,90 18,90 A\nSumme Netto 80,05");
  assert.equal(e.zeilen.length, 2);
  assert.equal(e.zeilen[0].rabatt, -3.2);
  assert.equal(e.zeilen[0].gesamt, 61.15);
  assert.equal(e.zeilen[0].sicher, true);
  assert.equal(e.summeStimmt, true);
});

test("Zeilenumbruch mitten im Artikel, Trennstrich, Zahlen erst in Zeile drei", () => {
  const e = belegZerlegen("1800234 Frittierfett flüssig Palmöl-\nfrei Kanister 10 l\n2 x 24,90 49,80 19\n1204890 Zwiebeln gelb 10 kg Netz 3 x 6,90 20,70 7");
  assert.equal(e.zeilen.length, 2);
  const z = e.zeilen[0];
  assert.ok(z.name.toLowerCase().includes("palmölfrei"), z.name);
  assert.equal(z.gebinde, "kanister");
  assert.deepEqual([z.menge, z.einzelpreis, z.gesamt, z.steuer, z.sicher], [2, 24.9, 49.8, "19", true]);
  assert.deepEqual(z.inhalt, { anzahl: 1, groesse: 10, einheit: "l" });
  assert.equal(z.roh.split("\n").length, 3);
});

test("kg-Ware über zwei Zeilen: Menge 1, Gewicht als Inhalt, Preis je kg", () => {
  const e = belegZerlegen("4035512 Hähnchenbrustfilet o.H. frisch KT\n5,120 kg x 7,49 38,35 B");
  const z = e.zeilen[0];
  assert.deepEqual([z.menge, z.einzelpreis, z.jeKg, z.gesamt, z.gebinde, z.sicher], [1, 7.49, true, 38.35, "karton", true]);
  assert.deepEqual(z.inhalt, { anzahl: 1, groesse: 5.12, einheit: "kg" });
  assert.deepEqual(preisJeEinheit(z), { preis: 7.49, einheit: "kg" });
});

test("Lieferschein ohne Preise: Mengen ja, Preise null, keine Frage", () => {
  const e = belegZerlegen("Lieferschein Nr. 998877 vom 02.10.2026\n482211 Speisekartoffeln festk. 12,5 kg SA 2 SA\n551100 TG Mehl Type 405 10x1kg KT 1 KT\n770120 Mineralwasser still 12x0,75l MW KI 5");
  assert.equal(e.typ, "lieferschein");
  assert.equal(e.datum, "2026-10-02");
  assert.equal(e.zeilen.length, 3);
  assert.deepEqual(e.zeilen.map((z) => z.menge), [2, 1, 5]);
  assert.ok(e.zeilen.every((z) => z.einzelpreis === null && z.gesamt === null && z.frage === null && z.sicher));
  assert.deepEqual(e.zeilen.map((z) => z.gebinde), ["sack", "karton", "kiste"]);
  assert.deepEqual(e.zeilen[1].inhalt, { anzahl: 10, groesse: 1, einheit: "kg" });
  assert.equal(e.summeStimmt, null);
  assert.equal(e.basis, "unklar");
});

test("Zeile ohne Preis in einer Rechnung mit Preisen → Frage art preis", () => {
  const e = belegZerlegen("482211 Speisekartoffeln festk. 12,5 kg SA 2 SA\n660045 Olivenöl Pomace 5 l KA 2 Stk 14,20 28,40 19");
  assert.equal(e.typ, "rechnung");
  assert.equal(e.zeilen[0].sicher, false);
  assert.equal(e.zeilen[0].frage.art, "preis");
  assert.equal(e.zeilen[0].menge, 2);
  assert.equal(e.zeilen[1].sicher, true);
});

test("OCR: O statt 0 im Preis und in der Artikelnummer, Probe heilt es", () => {
  const e = belegZerlegen("4OO1234 Tomaten rund KL1 KT 6 kg 2 12,9O 25,80 B");
  const z = e.zeilen[0];
  assert.equal(z.artikelnummer, "4001234");
  assert.deepEqual([z.menge, z.einzelpreis, z.gesamt, z.sicher], [2, 12.9, 25.8, true]);
});

test("OCR: 1O l im Inhalt lässt sich nicht gegenprüfen → Frage art inhalt", () => {
  const z = belegZerlegen("2200451 Sonnenblumenöl 1O l ka 1 18,90 18,90 B").zeilen[0];
  assert.equal(z.sicher, false);
  assert.equal(z.frage.art, "inhalt");
  assert.equal(z.gebinde, "kanister");
  assert.deepEqual([z.menge, z.einzelpreis, z.gesamt], [1, 18.9, 18.9]);
});

test("Steuerzeichen „A“ nur hinter einem Preis – „Vitamin A“ bleibt im Namen", () => {
  const e = belegZerlegen("4009999 Multivitaminsaft Vitamin A 12x1l KT 2 11,88 23,76\n4009998 Apfelsaft 12x1l KT 1 9,80 9,80 A");
  assert.equal(e.zeilen[0].steuer, null);
  assert.ok(e.zeilen[0].name.includes("Vitamin A"), e.zeilen[0].name);
  assert.equal(e.zeilen[0].menge, 2);
  assert.equal(e.zeilen[1].steuer, "A");
  const l = belegZerlegen("4009999 Multivitaminsaft Vitamin A 12x1l KT 2").zeilen[0];
  assert.equal(l.steuer, null);
  assert.equal(l.menge, 2);
  assert.ok(l.name.includes("Vitamin A"));
});

test("Menge vor dem Gebinde (Hamberger-artig) und Positionsnummer vor der Artikelnummer", () => {
  const e = belegZerlegen("2 KT Hähnchenschenkel TK 4x2,5kg 28,40 56,80 7\n10 482211 Speisekartoffeln festk. 12,5 kg SA 2 9,80 19,60 7");
  assert.deepEqual([e.zeilen[0].menge, e.zeilen[0].gebinde, e.zeilen[0].name, e.zeilen[0].sicher], [2, "karton", "Hähnchenschenkel TK", true]);
  assert.deepEqual([e.zeilen[1].artikelnummer, e.zeilen[1].menge, e.zeilen[1].name], ["482211", 2, "Speisekartoffeln festk."]);
});

test("Pfand und Leergutrückgabe bleiben aus der Zeilensumme, negative Menge bei Rückgabe", () => {
  const e = belegZerlegen("100234 Krombacher Pils 20x0,5l Kasten 5 12,99 64,95 19\nKastenpfand 20er Mehrweg 5 1,50 7,50 19\nLeergutrückgabe Kasten 20x0,5 -5 3,10 -15,50 19\nSumme Netto 56,95");
  assert.equal(e.zeilen.length, 1);
  assert.equal(e.pfand.length, 2);
  assert.deepEqual(e.pfand.map((p) => [p.anzahl, p.betrag]), [[5, 7.5], [-5, -15.5]]);
  assert.equal(e.zeilenSumme, 64.95);
  assert.equal(e.summeStimmt, true);   // Summe Netto enthält hier das Pfand (64,95 + 7,50 − 15,50)
});

test("preisJeEinheit: netto je kg, brutto nur mit bekanntem Steuersatz, Stückware", () => {
  const e = belegZerlegen("4001234 Tomaten gehackt KT 6x2,5kg 2 14,90 29,80 B\n4041100 Eier Gr. M 30er KT 4 4,29 17,16 B\n100877 Eisbergsalat Stück 10 ST 0,89 8,90 7\nMwSt B 7 % 3,29");
  assert.deepEqual(preisJeEinheit(e.zeilen[0]), { preis: 0.99, einheit: "kg" });
  assert.deepEqual(preisJeEinheit(e.zeilen[0], "brutto"), { preis: 0.93, einheit: "kg" });
  assert.deepEqual(preisJeEinheit({ ...e.zeilen[0], steuersatz: null }, "brutto"), { preis: null, einheit: null });
  assert.deepEqual(preisJeEinheit(e.zeilen[1]), { preis: 0.14, einheit: "stk" });
  assert.deepEqual(preisJeEinheit(e.zeilen[2]), { preis: 0.89, einheit: "stk" });
});

test("bekannt: Teilwort, eindeutig; bei mehreren Treffern null", () => {
  const e = belegZerlegen("4001234 Tomaten gehackt KT 6x2,5kg 2 14,90 29,80 B", { bekannt: ["Tomaten gehackt", "Tomaten passiert"] });
  assert.equal(e.zeilen[0].bekannt, "Tomaten gehackt");
  const f = belegZerlegen("4001234 Tomaten KT 6x2,5kg 2 14,90 29,80 B", { bekannt: ["Tomaten gehackt", "Tomaten passiert"] });
  assert.equal(f.zeilen[0].bekannt, null);
});

test("Leerer oder sinnloser Text → leeres Ergebnis ohne Fehler", () => {
  const e = belegZerlegen("");
  assert.deepEqual([e.typ, e.basis, e.zeilen.length, e.pfand.length, e.summeStimmt], ["unklar", "unklar", 0, 0, null]);
  const f = belegZerlegen("Vielen Dank für Ihren Einkauf\nwww.metro.de");
  assert.equal(f.zeilen.length, 0);
  assert.equal(f.lieferant, "Metro");
});
