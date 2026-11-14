// Startet die Darstellungsbewegungen von Zeki, sobald ein Element mit data-zeki-start erscheint (und für das, was schon da ist).
// Nur angeforderte Bewegungen; keine fachliche Ereigniszuordnung. „none“ beim Erscheinen nicht abspielen – es brach sonst eine
// gerade gestartete Bewegung ab.
import { zekiSpielen } from "../gastrocash-brand.js";

if (typeof document !== "undefined" && typeof MutationObserver !== "undefined") {
  const start = (root) => {
    for (const s of root.querySelectorAll(".zeki[data-zeki-start]")) {
      const m = s.dataset.zekiStart; s.removeAttribute("data-zeki-start"); if (m && m !== "none") zekiSpielen(s, m);
    }
  };
  new MutationObserver((records) => { for (const r of records) for (const n of r.addedNodes) if (n.nodeType === 1) start(n.parentElement || document); })
    .observe(document.documentElement, { childList: true, subtree: true });
  start(document);
}
