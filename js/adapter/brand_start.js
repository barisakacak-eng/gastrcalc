// Startet die Folgen von Zeki, sobald ein Element mit data-zeki-start erscheint (und für das, was schon da ist).
// Nur angeforderte Bewegungen (js/gastrocash-brand.js mascotMarkup); keine fachliche Ereigniszuordnung. Die Folge wird erst jetzt geladen, nicht vorher.
// Bei „Bewegung reduzieren“ passiert nichts: die Figur bleibt als ruhendes Bild stehen.
import { zekiSpielen } from "../zeki_figur.js";

if (typeof document !== "undefined" && typeof MutationObserver !== "undefined") {
  const start = (root) => {
    for (const el of root.querySelectorAll("[data-zeki-vorn][data-zeki-start]")) {
      const name = el.getAttribute("data-zeki-start"); el.removeAttribute("data-zeki-start");
      if (name && el.isConnected) zekiSpielen(el, name);
    }
  };
  new MutationObserver((records) => { for (const r of records) for (const n of r.addedNodes) if (n.nodeType === 1) start(n.parentElement || document); })
    .observe(document.documentElement, { childList: true, subtree: true });
  start(document);
}
