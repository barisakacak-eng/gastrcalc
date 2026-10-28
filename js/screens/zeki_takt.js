// Zeki lebt (Baris 26.10.2026, 23:14 nachgeschärft): natürlich wie ein Mensch.
// – Erstes Lebenszeichen nach ≈ 1 s (Blinzeln), danach Blinzeln in unregelmäßigen Abständen (2,5–6 s, manchmal doppelt).
//   Blinzeln läuft nur im Vektor (Lider), kein Wechsel auf die Bildfolge → kein Flackern.
// – Gesten (Bildfolge) selten: alle 14–22 s eine ruhige Geste. Zwinkern NIE im Leerlauf, nur gezielt (Sprechblase, Erfolg).
// – Ruht, wenn die App im Hintergrund ist; bei „reduzierte Bewegung“ weder Blinzeln noch Gesten.
// Nur Anzeige. Bei Warnung (zustand warnung/fehler) keine fröhlichen Gesten (Maskottchen-Regel vom 23.10.2026).
import { zekiSpielen } from "../gastrocash-brand.js";

const FOLGE = { ruhig: ["nicken", "winken", "nachdenken", "zeigen-unten", "freuen"], ernst: ["nachdenken", "nicken"] }; // 28.10.2026 Puppe: mehr Abwechslung, nie zweimal dieselbe
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

// Zekis Stimme (Baris 27.10.2026, 02:05): Was Zeki sagt, steht direkt neben ihm im Kopf – keine Sprechblase, kein Kasten,
// nie über dem Inhalt. Der Kopf ist Zekis Ebene: links Menü, in der Mitte sein Satz (statt Logo), rechts Zeki selbst.
function stimmePlatz(root) {
  const kopf = root?.querySelector?.(".appleiste .zeki-knopf"); if (!kopf) return null;
  const leiste = kopf.closest(".appleiste");
  let platz = leiste.querySelector(".zeki-stimme");
  if (!platz) { platz = root.ownerDocument.createElement("div"); platz.setAttribute("class", "zeki-stimme"); platz.setAttribute("aria-live", "polite"); leiste.insertBefore(platz, kopf); }
  return { kopf, leiste, platz };
}
// Der feste Satz eines Bildschirms (.zeki-zeile / .kl-zeki) wandert aus dem Inhalt neben Zeki. Rückgabe: true, wenn Zeki spricht.
export function zekiStimmeEinsetzen(root) {
  const satz = [...(root?.querySelectorAll?.(".zeki-zeile, .kl-zeki") || [])].find((el) => !el.closest(".zeki-stimme, .appleiste")); if (!satz) return false;
  const p = stimmePlatz(root); if (!p) return false;
  p.platz.replaceChildren(satz); p.leiste.classList.add("spricht");
  if (satz.classList.contains("a-rot")) p.leiste.classList.add("spricht-ernst");
  return true;
}
// Flüchtiger Satz (Lage des Tages): steht ≈ 7 s neben Zeki, dann kommt das Logo zurück. Antippen schließt sofort.
export function zekiSprechblase(root, moment, { restMs = 7000, bewegen = true } = {}) {
  if (!moment?.text) return false;
  const p = stimmePlatz(root); if (!p) return false;
  const satz = root.ownerDocument.createElement("p");
  const ernst = moment.ausloeser === "kuehl_abweichung" || moment.ausloeser === "muell_hoch";
  satz.setAttribute("class", "zeki-sprech" + (ernst ? " zeki-sprech--ernst" : ""));
  satz.setAttribute("role", "status"); satz.style.setProperty("--zeki-rest", Math.max(0, Math.round(restMs)) + "ms");
  satz.append(moment.text);
  const weg = () => { satz.remove(); if (!p.platz.childElementCount) p.leiste.classList.remove("spricht", "spricht-ernst"); };
  satz.addEventListener("click", weg); satz.addEventListener("animationend", (e) => { if (e.animationName === "zekiBlaseAus") weg(); });
  p.platz.replaceChildren(satz); p.leiste.classList.add("spricht"); if (ernst) p.leiste.classList.add("spricht-ernst");
  if (bewegen && moment.bewegung && moment.bewegung !== "keine") zekiSpielen(p.kopf, moment.bewegung);
  return true;
}

