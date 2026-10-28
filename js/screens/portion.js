// Laden „Portion prüfen“ (Masterauftrag „Gehirn“ 2.1, 28.10.2026): Chef wiegt die Hauptzutat einer echten Portion, die App sagt in einem Satz,
// was die Abweichung vom eigenen Rezept im Jahr kostet. Das Rezept bleibt unverändert. Gerechnet wird in js/ware.js (portionEuro).
import { t, mengenText } from "../i18n.js";
import { esc, fmtZahl, fmtEuroGeschaetzt } from "../util.js";
import { hauptZutat, portionEuro } from "../ware.js";
import { portionMessungSpeichern } from "../stamm.js";
import { nav } from "./nav.js";

export const PORTION_SCHRITT = 5; // Setzung 28.10.2026: −/+ in 5 g (bzw. 5 ml)
let p = null; // { gid, zutat, soll, einheit, wert, fertig }
export const portionZuruecksetzen = () => { p = null; };
export function portionOeffnen(stand, gid) {
  const g = (stand.gerichte || []).find((x) => x.id === gid); const h = g ? hauptZutat(stand, g) : null;
  p = h ? { gid, zutat: h.name, soll: h.menge, einheit: h.einheit, wert: h.menge, fertig: false } : null; return !!p;
}

export function portionView(stand) {
  const g = p && (stand.gerichte || []).find((x) => x.id === p.gid);
  if (!g) return `<div class="inhalt po"><p>${esc(t("gehirn.portion.leer"))}</p><button type="button" class="knopf" data-a="nav" data-wert="karte">${esc(t("allgemein.zurueck"))}</button></div>${nav("karte")}`;
  if (p.fertig) {
    const r = portionEuro(stand, p.gid, p.zutat, p.wert); const d = p.wert - p.soll;
    const satz = !r || Math.abs(d) < 0.5 ? t("gehirn.portion.genau") : t(d > 0 ? "gehirn.portion.mehr" : "gehirn.portion.weniger", fmtEuroGeschaetzt(Math.abs(r.jahr), true));
    return `<div class="inhalt po"><div class="po-ergebnis ${Math.abs(d) < 0.5 ? "gut" : d > 0 ? "mehr" : "weniger"}">
      <b class="po-gross">${d > 0 ? "+" : d < 0 ? "−" : "±"}${esc(fmtZahl(Math.abs(d)))} ${esc(p.einheit)}</b><p>${esc(satz)}</p></div>
      <button type="button" class="knopf glut" data-a="po-fertig">${esc(t("allgemein.fertig"))}</button></div>${nav("karte")}`;
  }
  return `<div class="inhalt po"><h1 class="frage">${esc(t("gehirn.portion.frage", mengenText(p.zutat), g.name, p.einheit))}</h1>
    <div class="stepper gross"><button type="button" data-a="po-d" data-d="-1" aria-label="−">−</button><div class="wert">${esc(fmtZahl(p.wert))} ${esc(p.einheit)}</div><button type="button" data-a="po-d" data-d="1" aria-label="+">+</button></div>
    <button type="button" class="knopf glut" data-a="po-pruefen">${esc(t("gehirn.portion.pruefen"))}</button></div>${nav("karte")}`;
}

export function portionAktion(name, el, stand, { datum } = {}) {
  if (!p) return null;
  if (name === "po-d") { p.wert = Math.max(0, p.wert + Number(el.dataset.d) * PORTION_SCHRITT); return true; }
  if (name === "po-pruefen") { p.fertig = true; portionMessungSpeichern(stand, { datum, gericht: p.gid, zutat: p.zutat, soll: p.soll, ist: p.wert, einheit: p.einheit }); return { speichern: true }; }
  if (name === "po-fertig") { p = null; return { nav: "karte" }; }
  return null;
}
