// Trennung (17.10.2026): Sicherungsstufe aus js/screens/nav.js ins Rechenwerk verschoben – rein rechnend, ohne Oberfläche.
// Sicherung: gelb ab 3 Tagen oder 20 neuen Einträgen, rot ab 7 Tagen (wie Etappe 5)
import { eintraegeZaehlen } from "./store.js";

export function sicherungStufe(wurzel, jetzt = Date.now()) {
  if (!wurzel) return null;
  const n = eintraegeZaehlen(wurzel); const neu = n - (wurzel.sicherungZaehler || 0);
  const tage = wurzel.letzteSicherung ? Math.floor((jetzt - Date.parse(wurzel.letzteSicherung)) / 86400e3) : null;
  return { stufe: tage === null ? (n >= 5 ? "rot" : null) : tage >= 7 ? "rot" : (tage >= 3 || neu >= 20) ? "gelb" : null, tage, neu, n };
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
