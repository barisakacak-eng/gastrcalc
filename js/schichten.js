// Welle 3, 3.8 Schichtzeiten (Bau-Chat 03.11.2026). Reine Rechnung, keine Oberfläche. Nur Zähler und Listen – ob Zuschläge gezahlt werden,
// entscheiden Vertrag und Lohnbüro. Goldwerte: „GastroCash Prüfpaket Welle 3 Goldwerte 28.10.2026“, Teil D.
//
// Datenmodell (03.11.2026): ein Eintrag in stand.teamTage[].eintraege[] darf zusätzlich { von: "HH:MM", bis: "HH:MM" } tragen.
// Endet die Schicht vor ihrem Beginn, endet sie am Folgetag (22:00–05:00). Alte Einträge ohne Zeiten bleiben gültig (nur Stunden).
//
// Fenster nach § 3b EStG (gesetze-im-internet.de, im Prüfpaket wörtlich geprüft):
//   Nacht 20–6 Uhr 25 %; 0–4 Uhr 40 %, wenn die Arbeit vor 0 Uhr begonnen hat (Abs. 3 Nr. 1)
//   Sonntag 0–24 Uhr 50 %; gesetzlicher Feiertag und 31.12. ab 14 Uhr 125 %; 24.12. ab 14 Uhr, 25./26.12. und 1. Mai 150 %
//   Begann die Arbeit vor 0 Uhr, gelten 0–4 Uhr des Folgetags noch als Sonn- oder Feiertag des Vortags (Abs. 3 Nr. 2).
// Zählregel (Prüfpaket D): jede Stunde zählt in genau einem der Fenster Sonntag / 125 % / 150 %, immer im höchsten; die Nacht zählt zusätzlich.
// Feiertage nach dem Land des Ladens (Standard BW; 31.12. ist in BW kein Feiertag).
import { feiertagAm } from "./feiertage.js";
import { MINDESTLOHN, mindestlohnAm } from "./data/mindestlohn.js";

const z2 = (n) => String(n).padStart(2, "0");
const plus = (tag, n) => { const [j, m, d] = tag.split("-").map(Number); const x = new Date(Date.UTC(j, m - 1, d + n)); return `${x.getUTCFullYear()}-${z2(x.getUTCMonth() + 1)}-${z2(x.getUTCDate())}`; };
const wochentag = (tag) => { const [j, m, d] = tag.split("-").map(Number); return new Date(Date.UTC(j, m - 1, d)).getUTCDay(); };
const minuten = (hhmm) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || "")); if (!m) return null; const h = Number(m[1]), mi = Number(m[2]); return h <= 24 && mi < 60 ? h * 60 + mi : null; };

// Dauer einer Schicht in Stunden (über Mitternacht erlaubt); null, wenn Zeiten fehlen
export function schichtStunden(von, bis) {
  const a = minuten(von), b = minuten(bis); if (a === null || b === null) return null;
  const d = b > a ? b - a : b + 1440 - a; return d > 0 && d <= 1440 ? d / 60 : null;
}
// Stunden eines Eintrags: aus Zeiten, sonst die gespeicherten Stunden (alte Daten)
export const eintragStunden = (x) => schichtStunden(x?.von, x?.bis) ?? (Number(x?.stunden) || 0);

// Sonn-/Feiertagsstufe einer Minute an einem Kalendertag: 0 keine, 50 Sonntag, 125, 150
function stufe(tag, minuteImTag, land) {
  const md = tag.slice(5); const f = feiertagAm(tag, land);
  if (md === "12-25" || md === "12-26" || md === "05-01" || (md === "12-24" && minuteImTag >= 14 * 60)) return 150;
  if (f || (md === "12-31" && minuteImTag >= 14 * 60)) return 125;
  if (wochentag(tag) === 0) return 50;
  return 0;
}

// Zähler einer Schicht in Stunden: { gesamt, nacht25, nacht40, sonntag, feiertag125, feiertag150 }
export function schichtZaehler(datum, von, bis, { land = "BW" } = {}) {
  const a = minuten(von), dauer = schichtStunden(von, bis); const z = { gesamt: 0, nacht25: 0, nacht40: 0, sonntag: 0, feiertag125: 0, feiertag150: 0 };
  if (a === null || dauer === null) return z;
  for (let m = 0; m < Math.round(dauer * 60); m++) { // je Minute: genau, auch bei 23:30
    const abs = a + m; const tagN = Math.floor(abs / 1440); const tag = tagN ? plus(datum, tagN) : datum; const mt = abs % 1440;
    const vorNullBegonnen = tagN > 0; // die Schicht hat vor 0 Uhr dieses Tages begonnen
    // Nacht
    if (vorNullBegonnen && mt < 4 * 60) z.nacht40 += 1; else if (mt >= 20 * 60 || mt < 6 * 60) z.nacht25 += 1;
    // Sonn-/Feiertag: höchste Stufe; 0–4 Uhr nach Beginn vor 0 Uhr zählt auch die Stufe des Vortags (Ende des Vortags)
    let s = stufe(tag, mt, land); if (vorNullBegonnen && mt < 4 * 60) s = Math.max(s, stufe(plus(tag, -1), 1439, land));
    if (s === 150) z.feiertag150 += 1; else if (s === 125) z.feiertag125 += 1; else if (s === 50) z.sonntag += 1;
    z.gesamt += 1;
  }
  for (const k of Object.keys(z)) z[k] = Math.round((z[k] / 60) * 100) / 100;
  return z;
}
// Summe über viele Schichten [{ datum, von, bis }]
export function zaehlerSumme(schichten, opt = {}) {
  const s = { gesamt: 0, nacht25: 0, nacht40: 0, sonntag: 0, feiertag125: 0, feiertag150: 0 };
  for (const x of schichten || []) { const z = schichtZaehler(x.datum, x.von, x.bis, opt); for (const k of Object.keys(s)) s[k] += z[k]; }
  for (const k of Object.keys(s)) s[k] = Math.round(s[k] * 100) / 100;
  return s;
}

// Schichten einer Person aus dem Laden (stand.teamTage, je Datum gilt der jüngste Eintrag), Zeitraum von–bis (JJJJ-MM-TT)
export function schichtenAusLaden(stand, personId, von, bis) {
  const jeTag = new Map(); for (const e of stand?.teamTage || []) if (e.datum >= von && e.datum <= bis) jeTag.set(e.datum, e);
  const out = []; for (const e of [...jeTag.values()].sort((a, b) => (a.datum < b.datum ? -1 : 1))) for (const x of e.eintraege || []) if (x.person === personId && x.von && x.bis) out.push({ datum: e.datum, von: x.von, bis: x.bis });
  return out;
}

// Minijob-Wächter: Stunden bis zur Grenze, abgerundet auf 0,01 h (Prüfpaket D: 43,36 h × 14,60 € = 633,06 € läge schon darüber)
export function minijobGrenzeStunden(datum, satz = null) {
  const m = mindestlohnAm(datum); const s = satz > 0 ? satz : m.satz;
  return Math.floor(Math.round((m.minijob / s) * 1e6) / 1e4) / 100;
}
export const MINIJOB_QUELLE = MINDESTLOHN; // Werte mit Quelle: js/data/mindestlohn.js

// 70-Tage-Zähler kurzfristige Beschäftigung (§ 8 Abs. 1 Nr. 2 SGB IV): Arbeitstage im Kalenderjahr. Nur Zähler, kein Urteil –
// bei 5 oder mehr Tagen je Woche kann statt 70 Tagen die 3-Monats-Grenze gelten (laut Prüfpaket nicht im Original gelesen).
export const KURZFRISTIG_TAGE = 70;
export function tageZaehler(bisherTage, neueTage) {
  const n = (Number(bisherTage) || 0) + new Set(neueTage || []).size;
  return { tage: n, grenze: KURZFRISTIG_TAGE, rest: Math.max(0, KURZFRISTIG_TAGE - n) };
}
// Arbeitszeit-Aufzeichnung Gaststätten (§ 17 MiLoG i. V. m. § 2a SchwarzArbG): Beginn, Ende, Dauer spätestens am 7. Tag, 2 Jahre aufbewahren
export const AUFZEICHNUNG_TAGE = 7, AUFBEWAHRUNG_JAHRE = 2;
export const aufzeichnungFaellig = (arbeitstag) => plus(arbeitstag, AUFZEICHNUNG_TAGE);
