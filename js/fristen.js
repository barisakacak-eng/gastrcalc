// Welle 3, 3.2 Pflichtenkalender (Bau-Chat 03.11.2026, Auftrag „Hochtouren“). Reine Rechnung, keine Oberfläche, keine Speicherung.
// Goldwerte: „GastroCash Prüfpaket Welle 3 Goldwerte 28.10.2026“, Teil C (Zoro, mit Python nachgerechnet, AOK-Liste 2027 gegengeprüft).
//
// Regeln (Quellen laut Prüfpaket, Abruf 28.10.2026):
// - USt-Voranmeldung und Lohnsteuer-Anmeldung: 10. des Folgemonats (§ 18 Abs. 1 UStG, § 41a Abs. 1 EStG). Fällt der Tag auf Samstag,
//   Sonntag oder einen Feiertag, gilt der nächste Werktag (§ 108 Abs. 3 AO). Gerechnet mit den Feiertagen des Ladens (Standard BW).
// - Dauerfristverlängerung (§ 46 UStDV): jeder USt-Termin einen Monat später. Schalter, nie geraten.
// - Rhythmus monatlich / vierteljährlich wird abgefragt, nie geraten (Gründer-Ausnahme 2027 nicht belegt, Markt-Radar).
// - ESt-Vorauszahlungen: 10.03., 10.06., 10.09., 10.12. (§ 37 Abs. 1 EStG), ebenfalls nach § 108 Abs. 3 AO verschoben. Nur mit Bescheid
//   und nur bei Einzelunternehmen oder Personengesellschaft (einstellung.est).
// - Lohnsteuer-Anmeldung: monatlich, vierteljährlich oder jährlich (§ 41a Abs. 2 EStG), wird abgefragt (einstellung.lstRhythmus).
// - SV-Beiträge: drittletzter Bankarbeitstag des Monats (§ 23 Abs. 1 SGB IV); Beitragsnachweis zwei Bankarbeitstage vorher, 0:00 Uhr.
//   Bankarbeitstag = Mo–Fr ohne bundesweite Feiertage, ohne 24.12. und 31.12., ohne die Feiertage im Land der Krankenkasse.
//   Maßgeblich ist der Sitz der Krankenkasse, nicht der Laden. Unbekannt → der frühere Termin (Prüfpaket C, Mai 2027: 26.05. statt 27.05.).
// - Die Schonfrist von 3 Tagen gilt nur für die Zahlung, nicht für die Abgabe: die App sagt nie „du hast noch 3 Tage“.
// - Erinnerung 5 Tage vor dem Termin (Masterauftrag 3.2, Setzung).
import { feiertagAm, LAND_CODES } from "./feiertage.js";
import { wert } from "./data/regelwerk.js";
import { tagVon, plusTage, wochentag, tageImMonat, plusMonate } from "./zeit.js";

export const ERINNERUNG_TAGE = 5; // Setzung Masterauftrag „Gehirn“ 3.2
const letzterTag = tageImMonat;
const jahrMonatPlus = (j, m, n) => plusMonate(tagVon(j, m, 1).slice(0, 7), n).split("-").map(Number); // → [Jahr, Monat]

// § 108 Abs. 3 AO: Samstag, Sonntag, Feiertag → nächster Werktag
export function werktagAb(tag, land = "BW") {
  let t = tag; while (wochentag(t) === 0 || wochentag(t) === 6 || feiertagAm(t, land)) t = plusTage(t, 1);
  return t;
}
const frist = (art, zeitraum, datum, land) => { const f = werktagAb(datum, land); return { art, zeitraum, regulaer: datum, datum: f, verschoben: f !== datum, erinnerung: plusTage(f, -ERINNERUNG_TAGE) }; };

// USt-Voranmeldungen, die in einem Kalenderjahr fällig werden. rhythmus "monat" | "quartal" | null (null = nicht abgefragt → keine Termine).
export function ustTermine(jahr, { rhythmus = null, dauerfrist = false, land = "BW", kleinunternehmer = false } = {}) {
  if (kleinunternehmer || !rhythmus) return []; // § 19 UStG: keine Voranmeldung; Rhythmus wird nie geraten
  const out = []; const versatz = 1 + (dauerfrist ? 1 : 0);
  for (let zj = jahr - 1; zj <= jahr; zj++) for (let zm = 1; zm <= 12; zm++) {
    if (rhythmus === "quartal" && zm % 3 !== 0) continue;
    const [fj, fm] = jahrMonatPlus(zj, zm, versatz); if (fj !== jahr) continue;
    out.push(frist("ust", rhythmus === "quartal" ? `${zj}-Q${zm / 3}` : tagVon(zj, zm, 1).slice(0, 7), tagVon(fj, fm, 10), land));
  }
  return out;
}
// Lohnsteuer-Anmeldung nach § 41a Abs. 2 EStG: Kalendermonat, Kalendervierteljahr oder Kalenderjahr – je nach Lohnsteuer des Vorjahres.
// rhythmus "monat" | "quartal" | "jahr" | null. null = nicht abgefragt → keine Termine (wie bei der Umsatzsteuer: nie geraten).
// Abgabe immer am 10. nach Ablauf des Zeitraums (§ 41a Abs. 1), verschoben nach § 108 Abs. 3 AO. Keine Dauerfristverlängerung.
export function lohnsteuerTermine(jahr, { rhythmus = null, land = "BW" } = {}) {
  if (!rhythmus) return [];
  if (rhythmus === "jahr") return [frist("lohnsteuer", String(jahr - 1), tagVon(jahr, 1, 10), land)];
  return ustTermine(jahr, { rhythmus, land }).map((x) => ({ ...x, art: "lohnsteuer" }));
}
// Vorschlag für den Rhythmus aus der Lohnsteuer des Vorjahres (Grenzen aus dem Regelwerk). Kein Betrag → kein Vorschlag.
export function lstRhythmusVorschlag(lstVorjahr, tag) {
  if (!Number.isFinite(lstVorjahr) || lstVorjahr < 0) return null;
  return lstVorjahr <= wert("lst_jahr_bis", tag) ? "jahr" : lstVorjahr <= wert("lst_quartal_bis", tag) ? "quartal" : "monat";
}
// Einkommensteuer-Vorauszahlungen (§ 37 Abs. 1 EStG): 10.03., 10.06., 10.09., 10.12. Es gibt sie nur mit Vorauszahlungsbescheid (§ 37 Abs. 3)
// und nur, wenn der Inhaber selbst Einkommensteuer zahlt (Einzelunternehmen, Personengesellschaft). Das entscheidet pflichtTermine.
export function estVorauszahlungen(jahr, { land = "BW" } = {}) {
  return [3, 6, 9, 12].map((m) => frist("est", `${jahr}-Q${m / 3}`, tagVon(jahr, m, 10), land));
}

// Bankarbeitstag für die SV-Fälligkeit. landKasse = Kürzel des Lands, in dem die Krankenkasse sitzt; null = unbekannt.
function bankarbeitstag(tag, landKasse) {
  const w = wochentag(tag); if (w === 0 || w === 6) return false;
  if (tag.slice(5) === "12-24" || tag.slice(5) === "12-31") return false;
  return !feiertagAm(tag, landKasse);
}
function svTerminLand(jahr, monat, landKasse) {
  let t = tagVon(jahr, monat, letzterTag(jahr, monat)); let n = 0;
  for (;;) { if (bankarbeitstag(t, landKasse)) { n += 1; if (n === 3) break; } t = plusTage(t, -1); }
  let nw = t; let k = 0; while (k < 2) { nw = plusTage(nw, -1); if (bankarbeitstag(nw, landKasse)) k += 1; }
  return { faellig: t, nachweis: nw };
}
// SV-Termin eines Monats. Sitz unbekannt → der früheste Termin über alle Länder (Prüfpaket C: „im Zweifel früher“).
export function svTermin(jahr, monat, { landKasse = null } = {}) {
  if (landKasse) return { monat: tagVon(jahr, monat, 1).slice(0, 7), ...svTerminLand(jahr, monat, landKasse), sitzBekannt: true };
  let best = null;
  for (const l of [null, ...LAND_CODES]) { const x = svTerminLand(jahr, monat, l); if (!best || x.faellig < best.faellig) best = x; }
  return { monat: tagVon(jahr, monat, 1).slice(0, 7), ...best, sitzBekannt: false };
}
export const svTermine = (jahr, opt = {}) => Array.from({ length: 12 }, (_, i) => svTermin(jahr, i + 1, opt));

// Alle Pflichttermine zwischen zwei Tagen (einschließlich), nach Datum. einstellung: { rhythmus, dauerfrist, kleinunternehmer, personal, lstRhythmus, est, landKasse, land }
export function pflichtTermine(von, bis, einstellung = {}) {
  const land = einstellung.land || "BW"; const out = [];
  for (let j = Number(von.slice(0, 4)); j <= Number(bis.slice(0, 4)); j++) {
    out.push(...ustTermine(j, { ...einstellung, land })); if (einstellung.est) out.push(...estVorauszahlungen(j, { land }));
    if (einstellung.personal) { out.push(...lohnsteuerTermine(j, { rhythmus: einstellung.lstRhythmus || null, land })); for (const s of svTermine(j, { landKasse: einstellung.landKasse || null })) out.push({ art: "sv", zeitraum: s.monat, regulaer: s.faellig, datum: s.faellig, verschoben: false, nachweis: s.nachweis, erinnerung: plusTage(s.nachweis, -ERINNERUNG_TAGE), sitzBekannt: s.sitzBekannt }); }
  }
  return out.filter((x) => x.datum >= von && x.datum <= bis).sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : a.art.localeCompare(b.art)));
}
// Fällige Erinnerungen an einem Tag: Termine, deren Erinnerung erreicht und deren Datum noch nicht vorbei ist
export const erinnerungenAm = (tag, einstellung = {}) => pflichtTermine(tag, plusTage(tag, 40), einstellung).filter((x) => x.erinnerung <= tag && x.datum >= tag);
