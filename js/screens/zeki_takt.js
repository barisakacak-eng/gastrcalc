// Zeki lebt (Baris 26.10.2026): Jede sichtbare Zeki-Figur mit der Hülle .zeki-lebt bewegt sich alle ≈ 4 s ein wenig.
// Nur Anzeige. Ruht, wenn die App im Hintergrund ist; bei „reduzierte Bewegung“ bleibt zekiSpielen ohnehin still.
// Bei Warnung (zustand warnung/fehler) keine fröhlichen Gesten (Maskottchen-Regel vom 23.10.2026: kein Grinsen an schlechten Tagen).
import { zekiSpielen } from "../gastrocash-brand.js";

const FOLGE = { ruhig: ["zwinkern", "nicken", "hand", "pruefen"], ernst: ["pruefen", "nicken"] };
export const ZEKI_TAKT_MS = 4000;
let uhr = null; let schritt = 0;

export function zekiNaechsteBewegung(zustand, n) {
  const folge = zustand === "warnung" || zustand === "fehler" ? FOLGE.ernst : FOLGE.ruhig;
  return folge[((n % folge.length) + folge.length) % folge.length];
}

export function zekiTaktStarten(doc = typeof document !== "undefined" ? document : null) {
  if (!doc || uhr || typeof setInterval === "undefined") return;
  uhr = setInterval(() => {
    if (doc.hidden) return;
    schritt++;
    doc.querySelectorAll(".zeki-lebt .zeki").forEach((svg, i) => {
      if (svg.classList.contains("zeki--spielt") || !svg.isConnected || !svg.getClientRects().length) return;
      zekiSpielen(svg, zekiNaechsteBewegung(svg.dataset.zekiZustand || "", schritt + i));
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
