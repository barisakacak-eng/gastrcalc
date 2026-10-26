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
