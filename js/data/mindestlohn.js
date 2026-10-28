// Gesetzlicher Mindestlohn und Minijob-Grenze nach Datum (Masterauftrag „Gehirn“ 1.1, 28.10.2026).
// 2026: 13,90 €/Std, Minijob-Grenze 603 €/Monat. 2027: 14,60 €/Std, Minijob-Grenze 633 €/Monat.
//   Grundlage: Fünfte Mindestlohnanpassungsverordnung (Beschluss Mindestlohnkommission 27.06.2025).
//   Minijob-Grenze = Mindestlohn × 130 / 3, aufgerundet auf volle Euro (§ 8 Abs. 1a SGB IV): 14,60 × 130 / 3 = 632,67 → 633 €.
//   Quellen (Abruf 28.10.2026): https://www.haufe.de/id/beitrag/gesetzesradar-310-mindestlohn-geringfuegigkeitsgrenze-HI17118617.html
//                               https://www.lohndialog.de/minijob-grenze-2027/
//   Vor 2028 neu prüfen: Für 2028 gibt es noch keinen Beschluss; die App rechnet nach 2027 mit dem Wert 2027 weiter.
export const MINDESTLOHN = [
  { ab: "2026-01-01", satz: 13.90, minijob: 603 },
  { ab: "2027-01-01", satz: 14.60, minijob: 633 },
];

// Eintrag, der an diesem Tag gilt (JJJJ-MM-TT). Vor 2026 gilt der Wert 2026 (ältere Werte führt die App nicht).
export function mindestlohnAm(datum) {
  let e = MINDESTLOHN[0];
  for (const x of MINDESTLOHN) if (typeof datum === "string" && datum >= x.ab) e = x;
  return e;
}
// Nächste Erhöhung nach diesem Tag, oder null
export const naechsteErhoehung = (datum) => MINDESTLOHN.find((x) => typeof datum === "string" && x.ab > datum) || null;
