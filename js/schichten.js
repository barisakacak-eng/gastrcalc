// Welle 3, 3.8 Schichtzeiten (Bau-Chat 03.11.2026). Reine Rechnung, keine Oberfläche. Nur Zähler und Listen – ob Zuschläge gezahlt werden,
// entscheiden Vertrag und Lohnbüro. Goldwerte: „GastroCash Prüfpaket Welle 3 Goldwerte 28.10.2026“, Teil D.
//
// Datenmodell (03.11.2026): ein Eintrag in stand.teamTage[].eintraege[] darf zusätzlich { von: "HH:MM", bis: "HH:MM" } tragen.
// Endet die Schicht vor ihrem Beginn, endet sie am Folgetag (22:00–05:00). Alte Einträge ohne Zeiten bleiben gültig (nur Stunden).
//
// Fenster nach § 3b EStG (gesetze-im-internet.de, im Prüfpaket wörtlich geprüft):
//   Nacht (Beginn und Ende der Nacht im Regelwerk: nacht_beginn_uhr, nacht_ende_uhr) mit Zuschlag zuschlag_nacht; 0–4 Uhr zuschlag_nacht_0_4, wenn die Arbeit vor 0 Uhr begonnen hat (Abs. 3 Nr. 1)
//   Sonntag 0–24 Uhr zuschlag_sonntag; gesetzlicher Feiertag und 31.12. ab 14 Uhr zuschlag_feiertag; 24.12. ab 14 Uhr, 25./26.12. und 1. Mai zuschlag_weihnachten
//   Alle Sätze stehen NUR im Regelwerk (js/data/regelwerk.js); hier wird nur gelesen. Die Stufen heißen weiter 50 / 125 / 150 (Prozent), die Zähler nacht25 / nacht40 (Namen der Felder).
//   Begann die Arbeit vor 0 Uhr, gelten 0–4 Uhr des Folgetags noch als Sonn- oder Feiertag des Vortags (Abs. 3 Nr. 2).
// Zählregel (Prüfpaket D): jede Stunde zählt in genau einem der Fenster Sonntag / 125 % / 150 %, immer im höchsten; die Nacht zählt zusätzlich.
// Feiertage nach dem Land des Ladens (Standard BW; 31.12. ist in BW kein Feiertag).
import { feiertagAm } from "./feiertage.js";
import { MINDESTLOHN, mindestlohnAm } from "./data/mindestlohn.js";
import { wert } from "./data/regelwerk.js";
import { plusTage, wochentag, berlin, berlinZeitpunkt } from "./zeit.js";
import { rund2 } from "./geld.js";

const minuten = (hhmm) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || "")); if (!m) return null; const h = Number(m[1]), mi = Number(m[2]); return h <= 24 && mi < 60 ? h * 60 + mi : null; };

// Echte Dauer in Minuten von Beginn a (Minute im Tag) bis Ende b am Tag oder Folgetag: in der Nacht der Zeitumstellung ist die Wanduhr-Rechnung falsch
// (22:00–06:00 am 25.10.2026 sind 9 Stunden, am 29.03.2026 nur 7). Ohne Datum gilt die Wanduhr (wie bisher).
const echteMinuten = (datum, a, b) => {
  const ende = b > a ? datum : plusTage(datum, 1); const von = berlinZeitpunkt(datum, Math.floor(a / 60), a % 60), bis = berlinZeitpunkt(ende, Math.floor(b / 60), b % 60);
  return Math.round((bis.getTime() - von.getTime()) / 60000);
};
// Dauer einer Schicht in Stunden (über Mitternacht erlaubt); null, wenn Zeiten fehlen. Mit `datum` (Tag des Beginns) zählt die echte Dauer in Berlin.
export function schichtStunden(von, bis, datum = null) {
  const a = minuten(von), b = minuten(bis); if (a === null || b === null) return null;
  const d = b > a ? b - a : b + 1440 - a; if (!(d > 0 && d <= 1440)) return null;
  return datum && /^\d{4}-\d{2}-\d{2}$/.test(datum) ? echteMinuten(datum, a, b) / 60 : d / 60;
}
// Stunden eines Eintrags: aus Zeiten, sonst die gespeicherten Stunden (alte Daten); `datum` = Tag der Schicht (Standard: x.datum)
export const eintragStunden = (x, datum = x?.datum) => schichtStunden(x?.von, x?.bis, datum) ?? (Number(x?.stunden) || 0);

// Sonn-/Feiertagsstufe einer Minute an einem Kalendertag: 0 keine, 50 Sonntag, 125, 150
const prozent = (id, tag) => Math.round(wert(id, tag) * 100);
function stufe(tag, minuteImTag, land) {
  const md = tag.slice(5); const f = feiertagAm(tag, land);
  if (md === "12-25" || md === "12-26" || md === "05-01" || (md === "12-24" && minuteImTag >= 14 * 60)) return prozent("zuschlag_weihnachten", tag);
  if (f || (md === "12-31" && minuteImTag >= 14 * 60)) return prozent("zuschlag_feiertag", tag);
  if (wochentag(tag) === 0) return prozent("zuschlag_sonntag", tag);
  return 0;
}

// Zähler einer Schicht in Stunden: { gesamt, nacht25, nacht40, sonntag, feiertag125, feiertag150 }
export function schichtZaehler(datum, von, bis, { land = "BW" } = {}) {
  const a = minuten(von), dauer = schichtStunden(von, bis, datum); const z = { gesamt: 0, nacht25: 0, nacht40: 0, sonntag: 0, feiertag125: 0, feiertag150: 0 };
  if (a === null || dauer === null) return z;
  const nachtAb = wert("nacht_beginn_uhr", datum) * 60, nachtBis = wert("nacht_ende_uhr", datum) * 60; // Nacht nach dem Tag der Schicht
  const sSo = prozent("zuschlag_sonntag", datum), sFt = prozent("zuschlag_feiertag", datum), sWe = prozent("zuschlag_weihnachten", datum);
  const startMs = berlinZeitpunkt(datum, Math.floor(a / 60), a % 60).getTime();
  const umstellung = Math.round(dauer * 60) !== (minuten(bis) > a ? minuten(bis) - a : minuten(bis) + 1440 - a); // nur in der Nacht der Zeitumstellung: Wanduhr je Minute aus dem echten Zeitpunkt
  for (let m = 0; m < Math.round(dauer * 60); m++) { // je Minute: genau, auch bei 23:30
    let tagN, tag, mt;
    if (umstellung) { const bz = berlin(new Date(startMs + m * 60000)); tag = bz.tag; tagN = tag === datum ? 0 : 1; mt = bz.stunde * 60 + bz.minute; }
    else { const abs = a + m; tagN = Math.floor(abs / 1440); tag = tagN ? plusTage(datum, tagN) : datum; mt = abs % 1440; }
    const vorNullBegonnen = tagN > 0; // die Schicht hat vor 0 Uhr dieses Tages begonnen
    // Nacht
    if (vorNullBegonnen && mt < 4 * 60) z.nacht40 += 1; else if (mt >= nachtAb || mt < nachtBis) z.nacht25 += 1;
    // Sonn-/Feiertag: höchste Stufe; 0–4 Uhr nach Beginn vor 0 Uhr zählt auch die Stufe des Vortags (Ende des Vortags)
    let s = stufe(tag, mt, land); if (vorNullBegonnen && mt < 4 * 60) s = Math.max(s, stufe(plusTage(tag, -1), 1439, land));
    if (s === sWe) z.feiertag150 += 1; else if (s === sFt) z.feiertag125 += 1; else if (s === sSo) z.sonntag += 1;
    z.gesamt += 1;
  }
  for (const k of Object.keys(z)) z[k] = rund2((z[k] / 60));
  return z;
}
// Summe über viele Schichten [{ datum, von, bis }]
export function zaehlerSumme(schichten, opt = {}) {
  const s = { gesamt: 0, nacht25: 0, nacht40: 0, sonntag: 0, feiertag125: 0, feiertag150: 0 };
  for (const x of schichten || []) { const z = schichtZaehler(x.datum, x.von, x.bis, opt); for (const k of Object.keys(s)) s[k] += z[k]; }
  for (const k of Object.keys(s)) s[k] = rund2(s[k]);
  return s;
}

// Schichten einer Person aus dem Laden, Zeitraum von–bis (JJJJ-MM-TT). Quellen: stand.schichten (Büro „Schicht eintragen“, W3b 04.11.2026)
// und Beginn/Ende in stand.teamTage (je Datum gilt der jüngste Eintrag). Für denselben Tag und dieselbe Person gilt der Büro-Eintrag.
export function schichtenAusLaden(stand, personId, von, bis) {
  const out = new Map();
  const jeTag = new Map(); for (const e of stand?.teamTage || []) if (e.datum >= von && e.datum <= bis) jeTag.set(e.datum, e);
  for (const e of [...jeTag.values()]) for (const x of e.eintraege || []) if (x.person === personId && x.von && x.bis) out.set(e.datum, { datum: e.datum, von: x.von, bis: x.bis });
  for (const x of stand?.schichten || []) if (!x.storniert && x.person === personId && x.datum >= von && x.datum <= bis) out.set(x.datum, { datum: x.datum, von: x.von, bis: x.bis });
  return [...out.values()].sort((a, b) => (a.datum < b.datum ? -1 : 1));
}
// W3b (04.11.2026): Schicht im Büro eintragen – getrennt von „Mitarbeiter heute“ (Lohnkosten bleiben, wie sie sind; das hier ist die Zeit-Aufzeichnung).
// Gleicher Tag + gleiche Person ersetzt den alten Eintrag (der alte bleibt als storniert stehen). Rückgabe: Eintrag oder null bei ungültigen Zeiten.
const zeitOk = (v) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(v || "").trim()); return m && Number(m[1]) < 24 && Number(m[2]) < 60 ? `${m[1].padStart(2, "0")}:${m[2]}` : null; };
export function schichtEintragen(stand, { datum, person, von, bis, jetzt = new Date().toISOString() }) {
  const a = zeitOk(von), b = zeitOk(bis); if (!/^\d{4}-\d{2}-\d{2}$/.test(datum || "") || !person || !a || !b || schichtStunden(a, b) === null) return null;
  if (!(stand.personen || []).some((p) => p.id === person && !p.entfernt)) return null;
  stand.schichten ??= [];
  for (const x of stand.schichten) if (!x.storniert && x.datum === datum && x.person === person) x.storniert = jetzt;
  const e = { id: `s-${datum}-${person}-${stand.schichten.length}`, datum, person, von: a, bis: b, erfasst: jetzt, storniert: false };
  stand.schichten.push(e); return e;
}
// Minijob-Wächter: Stunden bis zur Grenze, abgerundet auf 0,01 h (Prüfpaket D: 43,36 h zum Satz 2027 läge schon über der Grenze)
export function minijobGrenzeStunden(datum, satz = null) {
  const m = mindestlohnAm(datum); const s = satz > 0 ? satz : m.satz;
  return Math.floor(Math.round((m.minijob / s) * 1e6) / 1e4) / 100;
}
export const MINIJOB_QUELLE = MINDESTLOHN; // Werte mit Quelle: js/data/mindestlohn.js

// 70-Tage-Zähler kurzfristige Beschäftigung (§ 8 Abs. 1 Nr. 2 SGB IV): Arbeitstage im Kalenderjahr. Nur Zähler, kein Urteil –
// bei 5 oder mehr Tagen je Woche kann statt der Tage-Grenze die 3-Monats-Grenze gelten (laut Prüfpaket nicht im Original gelesen).
export const KURZFRISTIG_TAGE = wert("kurzfristig_tage", "2026-12-31"); // Regelwerk: kurzfristig_tage
export function tageZaehler(bisherTage, neueTage) {
  const n = (Number(bisherTage) || 0) + new Set(neueTage || []).size;
  return { tage: n, grenze: KURZFRISTIG_TAGE, rest: Math.max(0, KURZFRISTIG_TAGE - n) };
}
// Arbeitszeit-Aufzeichnung Gaststätten (§ 17 MiLoG i. V. m. § 2a SchwarzArbG): Beginn, Ende, Dauer bis zur Frist, dann aufbewahren (Regelwerk: arbeitszeit_frist_tage, arbeitszeit_aufheben_jahre)
export const AUFZEICHNUNG_TAGE = wert("arbeitszeit_frist_tage", "2026-12-31"), AUFBEWAHRUNG_JAHRE = wert("arbeitszeit_aufheben_jahre", "2026-12-31");
export const aufzeichnungFaellig = (arbeitstag) => plusTage(arbeitstag, wert("arbeitszeit_frist_tage", arbeitstag));

// Arbeitszeit-Liste (W3b, 04.11.2026) für den Buchhalter-Ordner: je Eintrag mit Beginn und Ende eine Zeile. „rechtzeitig“ = spätestens am Tag der Frist
// (arbeitszeit_frist_tage) nach dem Arbeitstag erfasst (§ 17 Abs. 1 MiLoG; Gaststätten nach § 2a SchwarzArbG). Einträge nur mit Stunden zeigen „ohne Zeiten“ – sie zählen,
// erfüllen die Aufzeichnung aber nicht. Nur eine Liste, keine Bewertung.
export function arbeitszeitListe(stand, von, bis) {
  const name = (id, fallback) => { const p = (stand.personen || []).find((q) => q.id === id); return p?.kuerzel || p?.name || fallback || "–"; };
  const zeilen = new Map(); // Schlüssel Datum|Person
  const jeTag = new Map(); for (const e of stand?.teamTage || []) if (e.datum >= von && e.datum <= bis && !e.keine) jeTag.set(e.datum, e);
  for (const e of jeTag.values()) for (const [i, x] of (e.eintraege || []).entries()) {
    const erfasst = typeof e.erfasst === "string" ? e.erfasst.slice(0, 10) : null;
    zeilen.set(`${e.datum}|${x.person || "k" + i}`, { datum: e.datum, wer: name(x.person, x.name), von: x.von || null, bis: x.bis || null, stunden: eintragStunden(x, e.datum), erfasst, kompakt: !!x.kompakt });
  }
  for (const x of stand?.schichten || []) if (!x.storniert && x.datum >= von && x.datum <= bis)
    zeilen.set(`${x.datum}|${x.person}`, { datum: x.datum, wer: name(x.person), von: x.von, bis: x.bis, stunden: schichtStunden(x.von, x.bis, x.datum), erfasst: typeof x.erfasst === "string" ? x.erfasst.slice(0, 10) : null, kompakt: false }); // Lauf 4: alte Schicht ohne „erfasst“ darf nicht abstürzen
  const liste = [...zeilen.values()].map((z) => ({ ...z, rechtzeitig: !z.erfasst || z.erfasst <= aufzeichnungFaellig(z.datum) })).sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : a.wer.localeCompare(b.wer)));
  const ohneZeiten = liste.filter((z) => !z.von || !z.bis).length, spaet = liste.filter((z) => !z.rechtzeitig).length;
  return { zeilen: liste, ohneZeiten, spaet, vollstaendig: liste.length > 0 && ohneZeiten === 0 && spaet === 0 };
}
