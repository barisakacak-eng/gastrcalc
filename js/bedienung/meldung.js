// Meldungen: eine kurze Zeile über dem Bildschirm. Eine Uhr je Meldung (eine alte Uhr schließt keine neue Meldung zu früh);
// wechselt der Mensch danach den Bildschirm (Tipp, Zurück), geht sie sofort zu. Eine Meldung, die mit genau dem Tipp kommt,
// der den Bildschirm wechselt, bleibt stehen (Z.eingabeNr zählt Tipps und Zurück).
import { Z } from "../bedienung/zustand.js";

// Zählt jeden Tipp, jede Taste und jedes Zurück.
export function meldungAnmelden() {
  for (const art of ["pointerdown", "keydown"]) document.addEventListener(art, () => { Z.eingabeNr++; }, true);
  window.addEventListener("popstate", () => { Z.eingabeNr++; }, true);
}
export function meldung(text) {
  let m = document.querySelector(".meldung");
  if (!m) { m = document.createElement("div"); m.className = "meldung"; document.body.appendChild(m); }
  m.textContent = text; m.classList.add("da"); Z.meldungNr = Z.eingabeNr;
  clearTimeout(Z.meldungUhr); Z.meldungUhr = setTimeout(() => m.classList.remove("da"), 2600);
}

export function meldungBeiWechsel() {
  if (Z.eingabeNr <= Z.meldungNr) return;
  const m = document.querySelector(".meldung.da"); if (m) { clearTimeout(Z.meldungUhr); m.classList.remove("da"); }
}
