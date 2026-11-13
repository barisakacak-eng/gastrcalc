// Zeki lebt (Baris 26.10.2026, 23:14 nachgeschärft): natürlich wie ein Mensch.
// – Erstes Lebenszeichen nach ≈ 1 s (Blinzeln), danach Blinzeln in unregelmäßigen Abständen (2,5–6 s, manchmal doppelt).
//   Blinzeln läuft nur im Vektor (Lider), kein Wechsel auf die Bildfolge → kein Flackern.
// – Gesten (Bildfolge) selten: alle 14–22 s eine ruhige Geste. Zwinkern NIE im Leerlauf, nur gezielt (Sprechblase, Erfolg).
// – Ruht, wenn die App im Hintergrund ist; bei „reduzierte Bewegung“ weder Blinzeln noch Gesten.
// Nur Anzeige. Bei Warnung (zustand warnung/fehler) keine fröhlichen Gesten (Maskottchen-Regel vom 23.10.2026).
import { zekiSpielen } from "../gastrocash-brand.js";
import { buehneEinrichten } from "./buehne_dom.js";

const FOLGE = { ruhig: ["nicken", "winken", "nachdenken", "zeigen-unten", "freuen"], ernst: ["nachdenken", "nicken"] }; // 28.10.2026 Puppe: mehr Abwechslung, nie zweimal dieselbe
export const ZEKI_ERSTES_ZEICHEN_MS = 1000;
export const ZEKI_BLINZELN_MS = [2500, 6000];
export const ZEKI_GESTE_MS = [14000, 22000];
const ZEKI_TAKT_MS = 250; // Prüftakt, keine Bewegung
let uhr = null; let schritt = 0;
const plan = new WeakMap();
const zwischen = ([a, b], r = Math.random()) => a + Math.round((b - a) * r);

export function zekiNaechsteBewegung(zustand, n) {
  const folge = zustand === "warnung" || zustand === "fehler" ? FOLGE.ernst : FOLGE.ruhig;
  return folge[((n % folge.length) + folge.length) % folge.length];
}

function zekiBlinzeln(svg, doppelt = false) {
  if (!svg || svg.classList.contains("zeki--spielt") || svg.classList.contains("zeki--puppe")) return false;
  const win = svg.ownerDocument?.defaultView;
  if (win?.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
  const zu = () => svg.classList.add("zeki--blinzeln"), auf = () => svg.classList.remove("zeki--blinzeln");
  zu(); setTimeout(auf, 130);
  if (doppelt) { setTimeout(zu, 300); setTimeout(auf, 430); }
  return true;
}

export function zekiTaktStarten(doc = typeof document !== "undefined" ? document : null) {
  if (!doc || uhr || typeof setInterval === "undefined") return;
  uhr = setInterval(() => {
    if (doc.hidden) return;
    const jetzt = Date.now();
    doc.querySelectorAll(".zeki-lebt .zeki").forEach((svg) => {
      if (!svg.isConnected || !svg.getClientRects().length) return;
      let p = plan.get(svg);
      if (!p) { p = { blinzeln: jetzt + ZEKI_ERSTES_ZEICHEN_MS - ZEKI_TAKT_MS / 2, geste: jetzt + zwischen([6000, 9000]) }; plan.set(svg, p); }
      if (svg.classList.contains("zeki--spielt") || svg.classList.contains("zeki--puppe")) return;
      if (jetzt >= p.geste) {
        schritt++; zekiSpielen(svg, zekiNaechsteBewegung(svg.dataset.zekiZustand || "", schritt));
        plan.set(svg, { geste: jetzt + zwischen(ZEKI_GESTE_MS), blinzeln: Math.max(p.blinzeln, jetzt + 2000) }); return;
      }
      if (jetzt >= p.blinzeln) { zekiBlinzeln(svg, Math.random() < 0.15); plan.set(svg, { ...p, blinzeln: jetzt + zwischen(ZEKI_BLINZELN_MS) }); }
    });
  }, ZEKI_TAKT_MS);
}

// Zekis Stimme: Was Zeki sagt, steht in der Bühne direkt neben ihm – keine Sprechblase, kein Kasten, nie über dem Inhalt (Salbei & Papier).
// Den festen Satz eines Bildschirms (.zeki-zeile / .kl-zeki) und den Titel holt buehneEinrichten aus dem Inhalt in die Bühne. Rückgabe: true, wenn Zeki spricht.
export function zekiStimmeEinsetzen(root) {
  const r = buehneEinrichten(root);
  return !!(r.satz || root?.querySelector?.(".gc-buehne.spricht"));
}
// Ein flüchtiger Satz (Lage des Tages) ersetzt ≈ 7 s lang Zekis festen Satz in der Bühne (CSS blendet ihn aus, der Titel bleibt), dann ist der feste Satz wieder da. Antippen schließt sofort.
function stimmePlatz(root) {
  const leiste = root?.querySelector?.(".gc-buehne"); const innen = leiste?.querySelector(".gc-buehne-innen"); if (!innen) return null;
  let text = innen.querySelector(".gc-buehne-text"); let neu = false;
  if (!text) { text = root.ownerDocument.createElement("div"); text.setAttribute("class", "gc-buehne-text"); innen.insertBefore(text, innen.firstChild); neu = true; leiste.classList.remove("gc-buehne-niedrig"); }
  let platz = text.querySelector(".zeki-stimme");
  if (!platz) { platz = root.ownerDocument.createElement("div"); platz.setAttribute("class", "zeki-stimme"); platz.setAttribute("aria-live", "polite"); text.append(platz); }
  return { kopf: leiste.querySelector(".zeki-knopf"), leiste, text, platz, neu };
}
export function zekiSprechblase(root, moment, { restMs = 7000, bewegen = true } = {}) {
  if (!moment?.text) return false;
  const p = stimmePlatz(root); if (!p) return false;
  const satz = root.ownerDocument.createElement("p");
  const ernst = moment.ausloeser === "kuehl_abweichung" || moment.ausloeser === "muell_hoch";
  satz.setAttribute("class", "zeki-sprech" + (ernst ? " zeki-sprech--ernst" : ""));
  satz.setAttribute("role", "status"); satz.style.setProperty("--zeki-rest", Math.max(0, Math.round(restMs)) + "ms");
  satz.append(moment.text);
  const weg = () => {
    satz.remove(); if (p.platz.childElementCount) return;
    p.platz.remove(); p.leiste.classList.remove("gc-spricht-kurz");
    if (!p.text.childElementCount) { p.text.remove(); p.leiste.classList.add("gc-buehne-niedrig"); }
  };
  satz.addEventListener("click", weg); satz.addEventListener("animationend", (e) => { if (e.animationName === "zekiBlaseAus") weg(); });
  p.platz.replaceChildren(satz); p.leiste.classList.add("gc-spricht-kurz");
  if (bewegen && moment.bewegung && moment.bewegung !== "keine" && p.kopf) zekiSpielen(p.kopf, moment.bewegung);
  return true;
}
