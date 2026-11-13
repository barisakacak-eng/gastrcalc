// Der gemeinsame Kopf „Bühne“ (Salbei & Papier, Tafel I): oben grün, darin Kopfzeile, Titel, Zekis Satz als Zeile oder kleiner Knopf – und Zeki, der hinter der unteren Kante steht.
// Rein: nur HTML als Text, keine Verdrahtung. Die Klassen stehen in css/optik.css und css/buehne.css (gc-buehne, gc-kopf, gc-buehne-innen, gc-figur). Keine Sprechblase (Übergabe 4.5).
// RTL spiegelt das CSS (dir am Dokument); hier wird kein dir gesetzt.
import { esc } from "./util.js";
import { figurHtml } from "./zeki_figur.js";

// kopf: HTML der Kopfzeile (Menü- oder Zurück-Knopf und Titel) – vom Aufrufer gebaut, dort schon mit esc()
// titel: Text der Überschrift (h1) oder leer · satz: Zekis Satz als Text oder leer · satzAktion: wenn gesetzt, wird der Satz ein kleiner Knopf mit data-a
// schluessel: Bühnen-Bild (zeki_figur.js, buehnenSchluessel) · klasse: zusätzliche Klassen des Kopfes (z. B. gc-muell)
// figurKnopf: { aktion, label, klassen } – dann ist die Figur selbst ein <button data-a="aktion"> (Zeki ist der Hilfe-Knopf); ohne: ruhende Figur ohne Tippfläche
export function buehneHtml({ kopf = "", titel = "", satz = "", satzAktion = "", schluessel, klasse = "", rtl = false, figurKnopf = null } = {}) {
  const hat = !!(titel || satz);
  const satzHtml = !satz ? "" : satzAktion ? `<button type="button" class="gc-satz" data-a="${esc(satzAktion)}">${esc(satz)}</button>` : `<p class="gc-satz">${esc(satz)}</p>`;
  const text = hat ? `<div class="gc-buehne-text">${titel ? `<h1>${esc(titel)}</h1>` : ""}${satzHtml}</div>` : "";
  const klassen = [klasse && String(klasse).trim(), "gc-buehne", hat ? "" : "gc-buehne-niedrig"].filter(Boolean).map(esc).join(" ");
  const figur = figurHtml({ schluessel, rtl });
  const figurMitKnopf = figurKnopf?.aktion ? `<button type="button" class="${esc(figurKnopf.klassen || "gc-figur-knopf")}" data-a="${esc(figurKnopf.aktion)}" aria-label="${esc(figurKnopf.label || "")}">${figur}</button>` : figur;
  return `<header class="${klassen}"><div class="gc-kopf">${kopf}</div><div class="gc-buehne-innen">${text}${figurMitKnopf}</div></header>`;
}
