// Gesetzlicher Mindestlohn und Minijob-Grenze nach Datum. Die Werte (mit Quelle, Gültigkeit, Abrufdatum) stehen NUR im Regelwerk
// (js/data/regelwerk.js: mindestlohn, minijob_grenze); hier wird nur gelesen. Vor dem ersten Eintrag mit beiden Werten gilt dieser erste Eintrag
// (die App führt keine älteren Werte). Nach dem letzten Eintrag rechnet die App mit dem letzten Wert weiter (Regelwerk meldet das als veraltet).
import { REGELN } from "./regelwerk.js";

// Liste je Stichtag, an dem Mindestlohn UND Minijob-Grenze gelten: { ab, satz, minijob }, aufsteigend.
export const MINDESTLOHN = REGELN.mindestlohn
  .map((m) => { const g = REGELN.minijob_grenze.find((x) => x.ab === m.ab); return g ? { ab: m.ab, satz: m.wert, minijob: g.wert } : null; })
  .filter(Boolean);

// Eintrag, der an diesem Tag gilt (JJJJ-MM-TT). Vor dem ersten Eintrag gilt der erste (ältere Werte führt die App nicht).
export function mindestlohnAm(datum) {
  let e = MINDESTLOHN[0];
  for (const x of MINDESTLOHN) if (typeof datum === "string" && datum >= x.ab) e = x;
  return e;
}
// Nächste Erhöhung nach diesem Tag, oder null
export const naechsteErhoehung = (datum) => MINDESTLOHN.find((x) => typeof datum === "string" && x.ab > datum) || null;
