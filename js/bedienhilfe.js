// Lauf 6, Etappe 5 (13.11.2026): kleine reine Helfer der Bedienschicht (js/app.js), damit sie ohne Browser prüfbar sind.
// Keine DOM-Zugriffe, kein Zustand außer der Sperre, die der Aufrufer selbst hält.
import { heute, heuteGeschaeft } from "./util.js";

// ---------- Doppeltipp-Sperre (A) ----------
// Solange eine Aktion mit `await` läuft, wird dieselbe Aktion (Name + Wert + Kennung) nicht noch einmal gestartet.
// Zähl-Tipps (Müll-Kachel, −/+, Code-Ziffern) sind ausgenommen: dort zählt jeder Tipp (app.js, ZAEHL_TIPPS).
export const aktionsSchluessel = (name, wert, id) => `${name}|${wert ?? ""}|${id ?? ""}`;
export function aktionsSperre() {
  const laufend = new Set();
  return {
    // true = darf starten (und ist ab jetzt belegt); false = dieselbe Aktion läuft noch
    belegen(schluessel) { if (laufend.has(schluessel)) return false; laufend.add(schluessel); return true; },
    freigeben(schluessel) { laufend.delete(schluessel); },
    laeuft: (schluessel) => laufend.has(schluessel),
    get anzahl() { return laufend.size; },
  };
}

// ---------- Tageswechsel bei offener App (B) ----------
// Der zuletzt gezeichnete Tag: Geschäftstag (wechselt 04:00) und Kalendertag (wechselt 00:00), beide in Berliner Zeit.
export const tagStand = (d = new Date()) => ({ geschaeft: heuteGeschaeft(d), kalender: heute(d) });
export const tagGewechselt = (gezeichnet, jetzt = tagStand()) => !!gezeichnet && (gezeichnet.geschaeft !== jetzt.geschaeft || gezeichnet.kalender !== jetzt.kalender);
// Ein Feld mit Text hat den Fokus: dann nicht neu zeichnen (der Mensch tippt gerade), sondern beim Verlassen. feld: { aktiv, value } oder null.
export const feldMitText = (feld) => !!feld && feld.aktiv === true && String(feld.value ?? "").trim() !== "";

// ---------- Speicher (C) ----------
// Speicher voll: IndexedDB meldet QuotaExceededError (je nach Browser am Fehler selbst, am Ereignis oder an dessen .error).
export function istSpeicherVoll(e) {
  const namen = [e?.name, e?.target?.error?.name, e?.error?.name, e?.cause?.name];
  if (namen.some((n) => /^QuotaExceededError$|^NS_ERROR_DOM_QUOTA_REACHED$/.test(String(n || "")))) return true;
  return e?.code === 22 || /quota/i.test(String(e?.message || e?.target?.error?.message || ""));
}
// Welche Art Problem zeigt das Banner? "voll" (Speicher voll), "speichern", "fassung" (anderes Fenster), "ablage" (Foto passte nicht)
export const speicherProblemArt = (art, fehler) => (art === "speichern" && istSpeicherVoll(fehler) ? "voll" : art);
// Nach einem erfolgreichen Schreiben verschwindet das Banner – außer „fassung“ (braucht Neuladen) und „ablage“ (das Foto ist trotzdem verloren)
export const problemNachErfolg = (problem) => (problem === "voll" || problem === "speichern" ? null : problem);
// Dauerhaften Speicher anfragen, solange er nicht bewilligt ist (Flag nur bei true)
export const dauerhaftFaellig = (wurzel) => !!wurzel && wurzel.persistGefragt !== true;
