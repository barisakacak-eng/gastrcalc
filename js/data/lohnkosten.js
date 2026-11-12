// Arbeitgeberkosten auf den Brutto-Lohn (Baris 27.10.2026: „15 € brutto bleiben nicht 15 € brutto“). Die Sätze (mit Quelle, Gültigkeit und Abrufdatum)
// stehen NUR im Regelwerk (js/data/regelwerk.js): abgaben_angestellt, umlagen_angestellt, abgaben_minijob, bgn_anteil. Hier wird nur gelesen.
// Angestellt (sozialversicherungspflichtig, auch Übergangsbereich als Näherung) = Abgaben + Umlagen + Berufsgenossenschaft.
// Minijob (gewerblich) = Abgaben + Berufsgenossenschaft.
//   Sachbezug Personalessen (0.5): Die Ware des Essens zählt schon als Wareneinsatz ohne Umsatz (js/zaehler.js, muellJeTag) – nicht doppelt.
//   Zusätzlich zählt der Arbeitgeberanteil der Abgaben auf den Sachbezugswert (Sachbezug ist Arbeitslohn) als ≈ Lohnkosten:
//   js/engine.js sachbezugAbgabenMonat. Ob der Mitarbeiter den Wert selbst zahlt, weiß die App nicht – darum ≈.
// Der Aufschlag hängt an der Krankenkasse (Zusatzbeitrag, U1/U2): darum immer ≈. Er gilt je Tag: lohnAufschlag(art, tag).
import { regel, wert } from "./regelwerk.js";

// Aufschlag einer Lohnart an einem Tag (JJJJ-MM-TT): { satz, geschaetzt, stand } – stand = Jahr der Abgaben-Quelle.
export function lohnAufschlag(art, tag) {
  const bgn = wert("bgn_anteil", tag);
  if (art === "minijob") return { satz: wert("abgaben_minijob", tag) + bgn, geschaetzt: true, stand: regel("abgaben_minijob", tag).ab.slice(0, 4) };
  return { satz: wert("abgaben_angestellt", tag) + wert("umlagen_angestellt", tag) + bgn, geschaetzt: true, stand: regel("abgaben_angestellt", tag).ab.slice(0, 4) };
}
// Stichtag für die alten Namen unten: Ende 2026 (alle Sätze 2026 gelten dann noch; Ergebnisse wie bisher).
export const LOHN_STICHTAG = "2026-12-31";
export const BGN_ANTEIL = wert("bgn_anteil", LOHN_STICHTAG);
export const LOHN_AUFSCHLAG = {
  angestellt: lohnAufschlag("angestellt", LOHN_STICHTAG),
  minijob: lohnAufschlag("minijob", LOHN_STICHTAG),
};
export const LOHN_STANDARD = "angestellt";
// Was dich eine Stunde wirklich kostet: Brutto × (1 + Aufschlag)
export const kostenJeStunde = (brutto, art = LOHN_STANDARD) => (brutto > 0 ? brutto * (1 + (LOHN_AUFSCHLAG[art] || LOHN_AUFSCHLAG[LOHN_STANDARD]).satz) : 0);

// Fester Monatslohn (Baris 27.10.2026, 13:02: „Stunden und Monat … rechnen sich natürlich anders“): Personen mit lohnModell "monat"
// kosten jeden Monat Brutto × (1 + Aufschlag) – unabhängig von „Waren heute Mitarbeiter da?“. Sie gehören zu den festen Kosten.
export const kostenJeMonat = (brutto, art = LOHN_STANDARD) => (brutto > 0 ? brutto * (1 + (LOHN_AUFSCHLAG[art] || LOHN_AUFSCHLAG[LOHN_STANDARD]).satz) : 0);
export const festPersonalMonat = (stand) => (stand?.personen || []).filter((p) => !p.entfernt && p.aktiv !== false && p.lohnModell === "monat" && p.monatsBrutto > 0)
  .reduce((s, p) => s + kostenJeMonat(p.monatsBrutto, p.lohnArt), 0);
