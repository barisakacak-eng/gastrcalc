// Trennung (17.10.2026): Sicherungsstufe aus js/screens/nav.js ins Rechenwerk verschoben – rein rechnend, ohne Oberfläche.
// Sicherung: gelb ab 3 Tagen oder 20 neuen Einträgen, rot ab 7 Tagen (wie Etappe 5)
import { eintraegeZaehlen } from "./store.js";

export function sicherungStufe(wurzel, jetzt = Date.now()) {
  if (!wurzel) return null;
  const n = eintraegeZaehlen(wurzel); const neu = n - (wurzel.sicherungZaehler || 0);
  const tage = wurzel.letzteSicherung ? Math.floor((jetzt - Date.parse(wurzel.letzteSicherung)) / 86400e3) : null;
  return { stufe: tage === null ? (n >= 5 ? "rot" : null) : tage >= 7 ? "rot" : (tage >= 3 || neu >= 20) ? "gelb" : null, tage, neu, n };
}

// Sicherung Stufe 1 (Masterauftrag „Gehirn“ 0.3, 28.10.2026): Wann erinnert Zeki an „Sicherung schicken“?
//   nie gesichert und schon ≥ 5 Einträge → grund "nie" · letzte Sicherung ≥ 7 Tage alt → "woche"
//   in den ersten 7 Tagen eines Monats, letzte Sicherung vor dem Monatsersten und seitdem neue Einträge → "monat" (Monat ist abgeschlossen)
// Rückgabe: null | { grund, tage } (tage = null bei „nie“). Kalendertage nach Ortszeit des Handys.
export const SICHERUNG_MONAT_TAGE = 7; // Setzung 28.10.2026
export function sicherungFaellig(wurzel, jetzt = Date.now()) {
  const s = sicherungStufe(wurzel, jetzt); if (!s) return null;
  if (s.tage === null) return s.n >= 5 ? { grund: "nie", tage: null } : null;
  if (s.tage >= 7) return { grund: "woche", tage: s.tage };
  const d = new Date(jetzt); const erster = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  if (d.getDate() <= SICHERUNG_MONAT_TAGE && Date.parse(wurzel.letzteSicherung) < erster && s.neu > 0) return { grund: "monat", tage: s.tage };
  return null;
}

// Laden-Umbau (20.10.2026): Nach dem Teilen fragt die App „Wo liegt sie jetzt?“. Nur „woanders“ (anderes Gerät, Mail, Cloud) zählt als
// Sicherung und setzt die Erinnerung zurück. „handy“ (nur auf diesem Handy) zählt NICHT – geht das Handy verloren, ist beides weg
// (Eigentümer-Entscheidung 20.10.2026). Rückgabe: true = als Sicherung gezählt.
export const SICHERUNG_ORTE = ["woanders", "handy"];
export function sicherungOrtSetzen(wurzel, ort, { jetzt = new Date() } = {}) {
  if (!wurzel || !SICHERUNG_ORTE.includes(ort) || ort !== "woanders") return false;
  wurzel.letzteSicherung = jetzt.toISOString(); wurzel.sicherungZaehler = eintraegeZaehlen(wurzel);
  return true;
}

// Datensicherung (28.10.2026, Bauplan Prompt 12): Vorschau vor dem Einlesen – wie viele Tage stecken in der Datei, von wann bis wann.
// Zählt jedes Feld „datum“ (JJJJ-MM-TT) in allen Läden: Umsatz, Müll, Kühlung, Abschlüsse, Lieferungen … Rein rechnend.
export function sicherungZeitraum(wurzel) {
  const tage = new Set(); const RE = /^\d{4}-\d{2}-\d{2}$/;
  const lauf = (x, tiefe) => {
    if (!x || typeof x !== "object" || tiefe > 8) return;
    if (Array.isArray(x)) { for (const y of x) lauf(y, tiefe + 1); return; }
    for (const [k, v] of Object.entries(x)) { if (k === "datum" && typeof v === "string" && RE.test(v)) tage.add(v); else if (v && typeof v === "object") lauf(v, tiefe + 1); }
  };
  for (const b of wurzel?.betriebe || []) lauf(b, 0);
  if (!tage.size) return { tage: 0, von: null, bis: null };
  const s = [...tage].sort(); return { tage: s.length, von: s[0], bis: s[s.length - 1] };
}
