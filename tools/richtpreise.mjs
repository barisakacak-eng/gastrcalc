// Richtpreise (17.10.2026): erzeugt js/data/richtpreise.js aus der Recherche-CSV, damit die Testdaten reproduzierbar sind.
// Start: node tools/richtpreise.mjs [pfad/zur/richtpreise.csv]   (Standard: ../audit/preise/richtpreise.csv neben dem Repo)
// Spalten: name;einheit;richtpreis_netto;spanne_min;spanne_max;methode;quellen;abruf;vermerk – Dezimalpunkt, Quellen mit „ | “ getrennt.
// Zeilen ohne Preis (methode „keine Quelle“) werden nicht übernommen.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HIER = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HIER, "..");
const QUELLE = path.resolve(process.argv[2] || path.join(REPO, "..", "audit", "preise", "richtpreise.csv"));
const ZIEL = path.join(REPO, "js", "data", "richtpreise.js");
export const STAND = "2026-10-17";

// CSV mit „;“, Felder dürfen in Anführungszeichen stehen ("" = ein Anführungszeichen)
export function csvLesen(text) {
  const zeilen = []; let feld = "", zeile = [], inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) { if (c === '"') { if (text[i + 1] === '"') { feld += '"'; i++; } else inQ = false; } else feld += c; continue; }
    if (c === '"') inQ = true;
    else if (c === ";") { zeile.push(feld); feld = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; zeile.push(feld); feld = ""; if (zeile.some((x) => x !== "")) zeilen.push(zeile); zeile = []; }
    else feld += c;
  }
  if (feld !== "" || zeile.length) { zeile.push(feld); if (zeile.some((x) => x !== "")) zeilen.push(zeile); }
  const [kopf, ...rest] = zeilen;
  return rest.map((z) => Object.fromEntries(kopf.map((k, i) => [k.trim(), (z[i] ?? "").trim()])));
}

const zahl = (s) => (s === "" ? null : Number(s));

export function richtpreiseAusCsv(text) {
  return csvLesen(text).filter((r) => r.richtpreis_netto !== "").map((r) => {
    const preis = zahl(r.richtpreis_netto);
    if (!(preis > 0)) throw new Error(`Preis ungültig: ${r.name}`);
    if (!["kg", "l", "stk"].includes(r.einheit)) throw new Error(`Einheit unbekannt: ${r.name} (${r.einheit})`);
    return { name: r.name, einheit: r.einheit, preis, min: zahl(r.spanne_min), max: zahl(r.spanne_max), methode: r.methode,
      quellen: r.quellen.split("|").map((q) => q.trim()).filter(Boolean), abruf: r.abruf };
  });
}

function schreiben() {
  const liste = richtpreiseAusCsv(fs.readFileSync(QUELLE, "utf8"));
  const kopf = `// Richtpreise (17.10.2026) – ERZEUGT von tools/richtpreise.mjs aus der Recherche-CSV (audit/preise/richtpreise.csv). Nicht von Hand ändern.
// Testdaten/Richtwerte, keine Angebote: Einkaufspreise netto je Einheit (kg, l, Stück), Abruf ${STAND}, Region Deutschland (Online-Funde).
// Methode „Großhandel“ = Mittel der Großhandelsfunde; „Einzelhandel −15 %“ = Mittel der Einzelhandelsfunde minus 15 % als Annäherung an
// den Großhandel (Vorgabe des Eigentümers 17.10.2026). min/max = Spanne der Funde laut CSV. Artikel ohne Fund sind nicht enthalten.
// In der App gelten sie immer als Schätzung (≈, Herkunft „Richtpreis“); ein eigener Preis des Wirts gewinnt immer.
export const STAND = ${JSON.stringify(STAND)};
export const RICHTPREISE = [
${liste.map((r) => "  " + JSON.stringify(r) + ",").join("\n")}
];
export const RICHTPREIS_INDEX = Object.fromEntries(RICHTPREISE.map((r) => [r.name, r]));
`;
  fs.writeFileSync(ZIEL, kopf);
  console.log(`${liste.length} Richtpreise → ${path.relative(REPO, ZIEL)}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) schreiben();
