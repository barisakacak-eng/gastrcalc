// Welle 3, 3.7 Liquidität 8 Wochen. Reine Rechnung, keine Oberfläche, kein Bankanschluss.
import { plusTage, wochentag } from "./zeit.js";
import { cent } from "./geld.js";
// Goldwerte: „GastroCash Prüfpaket Welle 3 Goldwerte“, Teil B.
// Eine Eingabe von Hand: „Geld auf Konto und Kasse heute“ (stand.liquiditaet = { betrag, datum }). Die Zahl veraltet, deshalb fragt
// die App nach NACHFRAGE_TAGE neu. Gerechnet wird mit dem Stand am Tagesende (alle Einnahmen und Ausgaben des Tages);
// unter der Zahl steht deshalb „Kann am Tag selbst knapper sein.“
const WOCHEN = 8;
export const NACHFRAGE_TAGE = 7; // Prüfpaket B: wöchentlich neu fragen (Setzung)

// posten: [{ betrag (+ Einnahme, − Ausgabe), datum } | { betrag, tagImMonat } | { betrag, wochentage: [1..6] }]
// Rückgabe: Tagesstände, tiefster Stand mit Datum, Endstand, Urteil „reicht“ / „fehlt“ (nur Rechnung, kein Rat)
export function liquiditaet({ start, ab, wochen = WOCHEN, posten = [] }) {
  if (typeof start !== "number" || !Number.isFinite(start) || !/^\d{4}-\d{2}-\d{2}$/.test(ab || "")) return null;
  // Eingangsprüfung: ein Posten ohne Zahl als Betrag (Text, leer, NaN) würde die ganze Prognose NaN machen – er wird übersprungen und gezählt
  const gueltig = posten.filter((p) => p && typeof p.betrag === "number" && Number.isFinite(p.betrag)); const uebersprungen = posten.length - gueltig.length; posten = gueltig;
  const tage = []; let stand = cent(start); let tief = null;
  for (let i = 0; i < wochen * 7; i++) {
    const d = plusTage(ab, i); const w = wochentag(d); const tim = Number(d.slice(8));
    let rein = 0, raus = 0;
    for (const p of posten) {
      const trifft = p.datum ? p.datum === d : p.tagImMonat ? p.tagImMonat === tim : p.wochentage ? p.wochentage.includes(w) : false;
      if (!trifft) continue; const c = cent(p.betrag); if (c >= 0) rein += c; else raus -= c;
    }
    stand += rein - raus; tage.push({ datum: d, rein: rein / 100, raus: raus / 100, stand: stand / 100 });
    if (tief === null || stand < tief.c) tief = { c: stand, datum: d };
  }
  const tiefster = { betrag: tief.c / 100, datum: tief.datum };
  return { start, ab, uebersprungen, bis: tage[tage.length - 1].datum, tage, tiefster, ende: stand / 100, reicht: tief.c >= 0, fehlt: tief.c < 0 ? Math.max(1, Math.round(-tief.c / 100)) : 0 }; // Lauf 4 (P2 C3): gleich gerundet wie der tiefste Stand (vorher ceil: 898 gegen −897)
}
export const nachfragen = (eingabe, heute) => !eingabe || typeof eingabe.betrag !== "number" || !eingabe.datum || plusTage(eingabe.datum, NACHFRAGE_TAGE) <= heute;
