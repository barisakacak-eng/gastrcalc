// Sonderauftrag 6b R1 (28.10.2026, ENTWURF – wartet auf Baris' Ja): kurzer Rundgang mit höchstens 5 Stationen.
// Zeigt nur, wo was ist; nichts wird geübt, nichts gespeichert. Jede Station: Lichtkegel auf ein Ziel von „Heute“, ein Satz (≤ 15 Wörter),
// genau eine Handlung („Weiter“ bzw. „Fertig“). „Überspringen“ steht immer oben rechts, weil Zeki später beim ersten Tipp erklärt (R2).
import { t } from "../i18n.js";
import { esc } from "../util.js";
import { mascotMarkup } from "../gastrocash-brand.js";

export const KURZ_STATIONEN = [
  { ziel: "#app .h-ziel, #app .b-hauptzahl", text: "k1" },
  { ziel: '#app [data-a="nav"][data-wert="umsatzheute"]', text: "k2" },
  { ziel: ".tableiste", text: "k3" },
  { ziel: '.tableiste [data-wert="karte"]', text: "k4" },
  { ziel: '[data-a="menue-auf"]', text: "k5" },
];
const M = (k) => t("rundgang.kurz." + k);
let huelle = null, i = 0, fertigRuf = null;
export const kurzOffen = () => !!huelle;

export function kurzStarten(doc, { fertig } = {}) {
  if (!doc || huelle) return false;
  huelle = doc.createElement("div"); huelle.className = "rg-huelle rg-kurz"; huelle.setAttribute("role", "dialog"); huelle.setAttribute("aria-modal", "true");
  doc.body.appendChild(huelle); i = 0; fertigRuf = fertig || null; zeigen(doc); return true;
}
function ende() { huelle?.remove(); huelle = null; const f = fertigRuf; fertigRuf = null; f?.(); }
function zeigen(doc) {
  const st = KURZ_STATIONEN[i]; const el = [...doc.querySelectorAll(st.ziel)].find((x) => x.getClientRects().length);
  if (!el) { if (i < KURZ_STATIONEN.length - 1) { i += 1; return zeigen(doc); } return ende(); }
  el.scrollIntoView({ block: "center", behavior: "instant" });
  const r = el.getBoundingClientRect(); const w = doc.defaultView.innerWidth, h = doc.defaultView.innerHeight; const P = 8;
  const o = { top: Math.max(0, r.top - P), left: Math.max(0, r.left - P), right: Math.min(w, r.right + P), bottom: Math.min(h, r.bottom + P) };
  const letzte = i === KURZ_STATIONEN.length - 1;
  huelle.innerHTML = `<div class="rg-loch" style="top:${Math.round(o.top)}px;left:${Math.round(o.left)}px;width:${Math.round(o.right - o.left)}px;height:${Math.round(o.bottom - o.top)}px"></div>
    <button type="button" class="rg-ueberspringen" data-rk="weg">${esc(t("rundgang.mitmach.ueberspringen"))}</button>
    <div class="rg-karte rk-karte"><span class="rg-zeki">${mascotMarkup("hilfe", "none")}</span>
      <div class="rg-blase"><p dir="auto">${esc(M(st.text))}</p><div class="rg-fuss"><span class="rg-punkte" aria-hidden="true">${KURZ_STATIONEN.map((_, k) => `<i class="${k === i ? "an" : k < i ? "da" : ""}"></i>`).join("")}</span>
      <button type="button" class="knopf rg-weiter" data-rk="weiter">${esc(letzte ? t("allgemein.fertig") : t("allgemein.weiter"))}</button></div></div></div>`;
  const karte = huelle.querySelector(".rk-karte"); const kh = karte.getBoundingClientRect().height || 140;
  const top = h - o.bottom >= kh + 24 ? o.bottom + 14 : o.top >= kh + 24 ? o.top - kh - 14 : Math.max(60, h - kh - 90);
  karte.style.top = Math.round(top) + "px";
  huelle.querySelector('[data-rk="weiter"]').addEventListener("click", () => { if (letzte) ende(); else { i += 1; zeigen(doc); } });
  huelle.querySelector('[data-rk="weg"]').addEventListener("click", ende);
}
