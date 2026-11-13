// Öffnungstage: welche Tage hat der Laden offen (Ruhetage mit Gültig-ab-Verlauf, „an Feiertagen zu“, Tage je Woche)?
// Aus engine.js herausgelöst, damit js/reinigung.js dieselbe Regel nutzen kann, ohne die Engine zu importieren (kein Importkreis).
import { plusTage, wochentag } from "./zeit.js";
import { feiertagZu } from "./feiertage.js";

const vgl = (a, b) => { a = String(a); b = String(b); return a < b ? -1 : a > b ? 1 : 0; }; // schneller als localeCompare, für ISO-Daten gleich

// W2-H (p03 K2): Ruhetage mit Gültig-ab. stand.kuehl.ruhetageVerlauf = [{ ab: "JJJJ-MM-TT" | "", tage, erfasst }]; ab "" = von Anfang an.
// Eine Änderung gilt ab heute; frühere Lücken bleiben Lücken. Ohne Verlauf (alte Daten) gelten die heutigen Ruhetage wie bisher.
export const verlaufVon = (v) => (Array.isArray(v) ? v : []).filter((e) => e && typeof e.ab === "string" && Array.isArray(e.tage)).slice().sort((a, b) => vgl(a.ab, b.ab));
export const ruhetageVerlauf = (stand) => verlaufVon(stand.kuehl?.ruhetageVerlauf);
export function ruhetageAm(stand, datum) {
  const v = verlaufVon(stand.kuehl?.ruhetageVerlauf);
  if (!v.length) return stand.kuehl?.ruhetage || [];
  let x = v[0]; for (const e of v) { if (e.ab <= datum) x = e; else break; }
  return x.tage;
}
// Lauf 6 (P1 C3): EINE Regel für „ist der Laden an diesem Tag offen“ – vorher baute js/reinigung.js sie nach und kannte „an Feiertagen zu“ nicht
// (22 Öffnungstage im Zähler, 25 in der Reinigung). Gewicht eines Kalendertags: 0 an Feiertagen, wenn der Wirt „an Feiertagen zu“ gewählt hat; 1 oder 0
// nach den Ruhetagen mit Gültig-ab-Verlauf; ohne bekannte Ruhetage tageProWoche/7. Zähler, Reinigung, Eigentümer, Bestand rufen diese Funktion.
export function tagGewicht(stand, datum) {
  if (feiertagZu(stand, datum)) return 0; // Feiertage: nur wenn der Wirt „an Feiertagen zu“ gewählt hat (Standard: wie ein normaler Wochentag)
  const ruhetage = ruhetageAm(stand, datum);
  if (ruhetage.length) return ruhetage.includes(wochentag(datum)) ? 0 : 1;
  const t = Math.min(7, Math.max(1, Number(stand.betrieb?.tageProWoche) || 6));
  return t / 7;
}
// Öffnungstage von–bis (beide Tage eingeschlossen), gewichtet wie tagGewicht. Die einzige Summe über Tage: Kalendermonat im Zähler, 30 Tage in der Reinigung.
export function oeffnungstage(stand, von, bis) {
  let g = 0; for (let d = von; d <= bis; d = plusTage(d, 1)) g += tagGewicht(stand, d);
  return g;
}
