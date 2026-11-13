// Zeki-Auftritt beim App-Start. Nur Anzeige, keine Rechen- oder Speicherlogik.
// Ablauf: Zeki tritt vor die Bühne (Folge „auftreten“, ganze Figur über der Bühnen-Figur, die solange leer ist), „Hallo, Chef!“ steht in der Bühne neben ihm,
// danach tritt er zurück hinter die Kante und die ruhende Bühnen-Figur steht wieder da. Keine Sprechblase.
// Höchstens einmal pro App-Start (sessionStorage), nie bei „reduzierte Bewegung“, jeder Tipp beendet ihn sofort.
// Er fängt keine Eingaben ab (pointer-events: none): Die Seite ist von der ersten Sekunde an bedienbar.
import { zekiSpielen, vornHtml } from "./zeki_figur.js";
import { t } from "./i18n.js";

// SCHALTER: false = Auftritt ganz aus. (Häufigkeit ist noch offen – hier stellt Baris es um.)
export const INTRO_AN = true;
export const INTRO_SCHLUESSEL = "gastrocash-intro-gesehen";
export const INTRO_AUFTRETEN_MS = 2400; // Dauer der Folge „auftreten“ (assets/brand/zeki/ablauf.json)
export const INTRO_ZURUECK_MS = 300;    // Zeki tritt hinter die Kante zurück (CSS .zeki-intro.hinein)
export const INTRO_GRUSS_AB_MS = 1200;  // ab hier steht „Hallo, Chef!“

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
  const r = knopf.getBoundingClientRect(); if (!(r.width > 1 && r.height > 1)) return false;
  gestartet = true; introMerken(sp);
  let aus = false; const zeiten = []; let lauf = null;
  const huelle = doc.createElement("div"); huelle.setAttribute("class", "zeki-intro"); huelle.setAttribute("aria-hidden", "true");
  if (knopf.querySelector(".gc-figur[data-gespiegelt]")) huelle.setAttribute("data-gespiegelt", "1"); // Arabisch, Persisch: wie die Bühne gespiegelt
  huelle.style.cssText = `left:${Math.round(r.left)}px;top:${Math.round(r.top)}px;width:${Math.round(r.width)}px`;
  huelle.innerHTML = vornHtml({ miene: "hilfe" });
  const text = leiste.querySelector(".gc-buehne-text");
  let gruss = null;
  const ende = () => {
    if (aus) return; aus = true; zeiten.forEach(clearTimeout); lauf?.abbrechen?.();
    doc.removeEventListener("pointerdown", ende, true); doc.removeEventListener("keydown", ende, true);
    gruss?.remove(); leiste.classList.remove("gc-spricht-kurz"); huelle.remove();
  };
  doc.addEventListener("pointerdown", ende, true); doc.addEventListener("keydown", ende, true); // nur lauschen, nichts abfangen
  doc.body.appendChild(huelle);
  lauf = zekiSpielen(huelle.querySelector("[data-zeki-vorn]"), "auftreten");
  if (!lauf) { ende(); return false; }
  zeiten.push(setTimeout(() => { // Gruß: eine Zeile in der Bühne neben Zeki
    if (aus || !text) return;
    gruss = doc.createElement("div"); gruss.setAttribute("class", "zeki-stimme"); gruss.setAttribute("aria-hidden", "true");
    const p = doc.createElement("p"); p.setAttribute("class", "zeki-sprech"); p.textContent = t("heute.introGruss"); gruss.append(p);
    text.append(gruss); leiste.classList.add("gc-spricht-kurz");
  }, INTRO_GRUSS_AB_MS));
  lauf.fertig.then((g) => {
    if (aus) return; if (g !== "ende") return ende();
    huelle.classList.add("hinein"); zeiten.push(setTimeout(ende, INTRO_ZURUECK_MS + 50)); // zurück hinter die Kante
  });
  return true;
}
