// Zeki-Auftritt beim App-Start (Variante B, Baris-Freigabe 27.10.2026). Nur Anzeige, keine Rechen- oder Speicherlogik.
// Ablauf (28.10.2026 auf die Gliederpuppe umgestellt): 0–1,0 s Zeki läuft am Kopfplatz herein · 1,0–2,3 s er winkt, unter dem Logo steht klein „Hallo, Chef!“ · danach Ruhe.
// Höchstens einmal pro App-Start (sessionStorage), nie bei „reduzierte Bewegung“, jeder Tipp beendet ihn sofort.
// Er fängt keine Eingaben ab: Die Seite ist von der ersten Sekunde an bedienbar.
import { zekiSpielen } from "./gastrocash-brand.js";
import { t } from "./i18n.js";

// SCHALTER: false = Auftritt ganz aus. (Häufigkeit ist noch offen – hier stellt Baris es um.)
export const INTRO_AN = true;
export const INTRO_SCHLUESSEL = "gastrocash-intro-gesehen";
export const INTRO_AUFTRETEN_MS = 1000;
export const INTRO_WINKEN_MS = 1300; // 1,0 s + 1,3 s = 2,3 s; Gesamtdauer inkl. Aufräumen bleibt unter 2,5 s

// Reine Entscheidung (testbar): läuft der Auftritt jetzt?
export function introErlaubt({ an = INTRO_AN, reduziert = false, gesehen = false } = {}) {
  return !!an && !reduziert && !gesehen;
}
export function introGesehen(speicher) {
  try { return speicher?.getItem(INTRO_SCHLUESSEL) === "1"; } catch { return false; }
}
export function introMerken(speicher) {
  try { speicher?.setItem(INTRO_SCHLUESSEL, "1"); } catch { /* ohne Speicher läuft er eben bei jedem Zeichnen höchstens einmal je Seitenladung */ }
}
let gestartet = false; // Rückfall ohne sessionStorage: wenigstens einmal je Seitenladung

export function introStarten(doc = document, { speicher, an = INTRO_AN } = {}) {
  const win = doc.defaultView; if (!win) return false;
  let sp = speicher; if (sp === undefined) { try { sp = win.sessionStorage; } catch { sp = null; } }
  const reduziert = !!win.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (gestartet || !introErlaubt({ an, reduziert, gesehen: introGesehen(sp) })) return false;
  const knopf = doc.querySelector(".appleiste.ebene-kopf.laden .zeki-knopf, .appleiste.ebene-kopf .zeki-knopf");
  const leiste = knopf?.closest(".appleiste");
  if (!knopf || !leiste || leiste.classList.contains("spricht")) return false; // spricht Zeki schon einen Satz, kein Auftritt
  gestartet = true; introMerken(sp);
  let aus = false; const zeiten = [];
  const gruss = doc.createElement("span"); gruss.setAttribute("class", "intro-gruss"); gruss.setAttribute("aria-hidden", "true"); gruss.textContent = t("heute.introGruss");
  const ende = () => {
    if (aus) return; aus = true; zeiten.forEach(clearTimeout);
    doc.removeEventListener("pointerdown", ende, true); doc.removeEventListener("keydown", ende, true);
    gruss.remove(); if (knopf.isConnected) zekiSpielen(knopf, "none"); // beendet die laufende Bewegung sofort
  };
  doc.addEventListener("pointerdown", ende, true); doc.addEventListener("keydown", ende, true); // nur lauschen, nichts abfangen
  { knopf.classList.add("einlauf"); zeiten.push(setTimeout(() => knopf.classList.remove("einlauf"), INTRO_AUFTRETEN_MS + 50)); } // P6 (3): Einlauf von rechts
  zekiSpielen(knopf, "auftreten", INTRO_AUFTRETEN_MS);
  zeiten.push(setTimeout(() => {
    if (aus || !knopf.isConnected) return ende();
    gruss.style.setProperty("--intro-gruss-dauer", INTRO_WINKEN_MS + "ms"); leiste.append(gruss); zekiSpielen(knopf, "winken", INTRO_WINKEN_MS);
  }, INTRO_AUFTRETEN_MS));
  zeiten.push(setTimeout(ende, INTRO_AUFTRETEN_MS + INTRO_WINKEN_MS + 100));
  return true;
}
// nur für Tests
export const introZuruecksetzen = () => { gestartet = false; };
