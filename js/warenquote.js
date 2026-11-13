// Warenquote: Anteil Wareneinsatz am Nettoumsatz, mit dem einen Deckel QUOTE_MAX. Aus js/zaehler.js herausgelöst, damit Zähler und Inventur
// dieselbe Regel nutzen, ohne einander zu importieren.
import { kalkulation, RICHTWERT_WARENEINSATZ } from "./engine.js";

// Lauf 6 (P1 C4): EIN Deckel für jede Warenquote (Karte, Belege, Monatsziel, Kombi-Grenze). Vorher: 0,89 in der Karte, 0,9 hier, 0,9 im Monatsziel, 0,9 im Deal.
export const QUOTE_MAX = 0.9;
// Warenquote (Anteil Wareneinsatz am Nettoumsatz): eigener Wert vor Karte (mengengewichtet über Gerichte mit Preis und vollständigem Rezept).
// Paket 3, M15/E2: liefert die Karte keine Quote, gilt der Branchen-Richtwert (RICHTWERT_WARENEINSATZ) als Schätzung –
// quelle "richtwert", geschaetzt true. Vorher stand hier Quote 0 (Ziel zu niedrig). Karte und eigener Wert: geschaetzt false.
export function warenQuote(stand) {
  if (typeof stand.verkauf?.warenQuote === "number") return { quote: Math.min(QUOTE_MAX, stand.verkauf.warenQuote), quelle: "eigen", geschaetzt: false };
  const richtwert = { quote: RICHTWERT_WARENEINSATZ.quote, quelle: "richtwert", geschaetzt: true };
  if (!(stand.gerichte || []).length) return richtwert;
  const k = kalkulation(stand);
  let w = 0, u = 0, richtpreis = false;
  for (const z of k.zeilen) if (z.waren !== null && z.preisNetto !== null && z.preisNetto > 0) { const m = z.menge || 1; w += z.waren * m; u += z.preisNetto * m; if (z.warenRichtpreis) richtpreis = true; }
  if (!(u > 0)) return richtwert;
  // Richtpreise: steckt in der Karten-Quote ein Richtpreis, ist sie eine Schätzung (≈, Zeile „Richtwert · Preise eintragen“)
  return { quote: Math.min(QUOTE_MAX, w / u), quelle: "karte", geschaetzt: richtpreis, ...(richtpreis ? { richtpreis: true } : {}) };
}
