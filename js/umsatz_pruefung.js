// Umsatz-Rückfrage (Masterauftrag „Gehirn“ 0.1, 28.10.2026): Ein Tippfehler beim Tagesumsatz (80 statt 800, 8000 statt 800) verdirbt
// „bis null“ für den ganzen Monat. Darum fragt die App einmal nach, wenn der Betrag weit vom üblichen Tag abweicht.
// Üblicher Tag = Median der Tagesumsätze (brutto) der letzten 14 Tage vor diesem Tag; erst ab 5 Tagen mit Umsatz.
// Grenzen sind Setzungen (kein Branchenwert): unter 10 % oder über dem Dreifachen des Medians.
import { umsatzEintrag, tagPlus } from "./engine.js";

export const UMSATZ_PRUEFUNG = { fenster: 14, mindestTage: 5, unten: 0.10, oben: 3 }; // Setzung 28.10.2026

export function umsatzMedian(stand, datum) {
  const w = [];
  for (let i = 1; i <= UMSATZ_PRUEFUNG.fenster; i++) { const e = umsatzEintrag(stand, tagPlus(datum, -i)); if (e && e.umsatz > 0) w.push(e.umsatz); }
  if (w.length < UMSATZ_PRUEFUNG.mindestTage) return null;
  w.sort((a, b) => a - b); const m = Math.floor(w.length / 2);
  return w.length % 2 ? w[m] : (w[m - 1] + w[m]) / 2;
}

// null = alles normal (oder zu wenig Verlauf). Sonst { art: "niedrig" | "hoch", median }.
export function umsatzRueckfrage(stand, datum, betrag) {
  const b = Number(betrag); if (!(b > 0)) return null;
  const m = umsatzMedian(stand, datum); if (!m) return null;
  if (b < m * UMSATZ_PRUEFUNG.unten) return { art: "niedrig", median: m };
  if (b > m * UMSATZ_PRUEFUNG.oben) return { art: "hoch", median: m };
  return null;
}
