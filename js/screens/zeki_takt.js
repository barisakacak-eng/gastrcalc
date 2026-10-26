// Zeki lebt (Baris 26.10.2026, 23:14 nachgeschärft): natürlich wie ein Mensch.
// – Erstes Lebenszeichen nach ≈ 1 s (Blinzeln), danach Blinzeln in unregelmäßigen Abständen (2,5–6 s, manchmal doppelt).
//   Blinzeln läuft nur im Vektor (Lider), kein Wechsel auf die Bildfolge → kein Flackern.
// – Gesten (Bildfolge) selten: alle 14–22 s eine ruhige Geste. Zwinkern NIE im Leerlauf, nur gezielt (Sprechblase, Erfolg).
// – Ruht, wenn die App im Hintergrund ist; bei „reduzierte Bewegung“ weder Blinzeln noch Gesten.
// Nur Anzeige. Bei Warnung (zustand warnung/fehler) keine fröhlichen Gesten (Maskottchen-Regel vom 23.10.2026).
import { zekiSpielen } from "../gastrocash-brand.js";

const FOLGE = { ruhig: ["nicken", "hand", "pruefen"], ernst: ["pruefen", "nicken"] };
export const ZEKI_ERSTES_ZEICHEN_MS = 1000;
export const ZEKI_BLINZELN_MS = [2500, 6000];
export const ZEKI_GESTE_MS = [14000, 22000];
export const ZEKI_TAKT_MS = 250; // Prüftakt, keine Bewegung
let uhr = null; let schritt = 0;
const plan = new WeakMap();
const zwischen = ([a, b], r = Math.random()) => a + Math.round((b - a) * r);

export function zekiNaechsteBewegung(zustand, n) {
  const folge = zustand === "warnung" || zustand === "fehler" ? FOLGE.ernst : FOLGE.ruhig;
  return folge[((n % folge.length) + folge.length) % folge.length];
}

export function zekiBlinzeln(svg, doppelt = false) {
  if (!svg || svg.classList.contains("zeki--spielt")) return false;
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
      if (svg.classList.contains("zeki--spielt")) return;
      if (jetzt >= p.geste) {
        schritt++; zekiSpielen(svg, zekiNaechsteBewegung(svg.dataset.zekiZustand || "", schritt));
        plan.set(svg, { geste: jetzt + zwischen(ZEKI_GESTE_MS), blinzeln: Math.max(p.blinzeln, jetzt + 2000) }); return;
      }
      if (jetzt >= p.blinzeln) { zekiBlinzeln(svg, Math.random() < 0.15); plan.set(svg, { ...p, blinzeln: jetzt + zwischen(ZEKI_BLINZELN_MS) }); }
    });
  }, ZEKI_TAKT_MS);
}

// Zeki spricht auf jedem Bildschirm (Baris 26.10.2026): Sprechblase unter dem Zeki oben rechts, ≈ 7 s, dann blendet CSS sie aus.
// Liegt über dem Inhalt (verschiebt nichts) und verschwindet von selbst; Antippen schließt sie sofort.
export function zekiSprechblase(root, moment, { restMs = 7000, bewegen = true } = {}) {
  const kopf = root?.querySelector?.(".appleiste .zeki-knopf"); if (!kopf || !moment?.text) return false;
  const leiste = kopf.closest(".appleiste");
  const blase = root.ownerDocument.createElement("div");
  blase.setAttribute("class", "zeki-sprech" + (moment.ausloeser === "kuehl_abweichung" || moment.ausloeser === "muell_hoch" ? " zeki-sprech--ernst" : ""));
  blase.setAttribute("role", "status"); blase.style.setProperty("--zeki-rest", Math.max(0, Math.round(restMs)) + "ms");
  blase.append(moment.text);
  blase.addEventListener("click", () => blase.remove());
  leiste.appendChild(blase);
  if (bewegen && moment.bewegung && moment.bewegung !== "keine") zekiSpielen(kopf, moment.bewegung);
  return true;
}
