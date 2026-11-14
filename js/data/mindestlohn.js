// Gesetzlicher Mindestlohn und Minijob-Grenze nach Datum. Die Werte (mit Quelle, Gültigkeit, Abrufdatum) stehen NUR im Regelwerk
// (js/data/regelwerk.js: mindestlohn, minijob_grenze); hier wird nur gelesen. Die App führt Werte ab 2025-01-01. Vor dem ersten Eintrag gibt es keinen
// Wert: mindestlohnAm liefert dann den ersten Eintrag mit vorErstem: true (Lauf 6, E11 C5: kein stilles Weiterrechnen mit 2026er Werten; wer es genau
// braucht, prüft das Feld). Nach dem letzten Eintrag rechnet die App mit dem letzten Wert weiter (Regelwerk meldet das als veraltet).
import { REGELN } from "./regelwerk.js";

// Liste je Stichtag, an dem Mindestlohn UND Minijob-Grenze gelten: { ab, satz, minijob }, aufsteigend.
export const MINDESTLOHN = REGELN.mindestlohn
  .map((m) => { const g = REGELN.minijob_grenze.find((x) => x.ab === m.ab); return g ? { ab: m.ab, satz: m.wert, minijob: g.wert } : null; })
  .filter(Boolean);

// Eintrag, der an diesem Tag gilt (JJJJ-MM-TT). Vor dem ersten Eintrag (oder ohne gültigen Tag): der erste Eintrag, gekennzeichnet mit vorErstem: true.
export function mindestlohnAm(datum) {
  let e = null;
  const tag = typeof datum === "string" && /^\d{4}-\d{2}-\d{2}/.test(datum) ? datum : null; // Text, der kein Datum ist, vergleicht sich sonst „größer“ als jede Zahl
  for (const x of MINDESTLOHN) if (tag !== null && tag >= x.ab) e = x;
  return e || { ...MINDESTLOHN[0], vorErstem: true };
}
// Nächste Erhöhung nach diesem Tag, oder null
export const naechsteErhoehung = (datum) => MINDESTLOHN.find((x) => typeof datum === "string" && x.ab > datum) || null;
