// Rundgang mit Zeki (Entwurf 26.10.2026, Baris 23:34): direkt nach der Einrichtung zeigt Zeki die großen Bereiche – ein Satz je Schritt,
// der Rest ist abgedunkelt, man kann nur „Weiter“ tippen. Am Ende: „Chef, alles verstanden?“ – Ja / Nochmal / Frage.
// Nur Anzeige: Schreiben (Log, Abschluss) läuft über die Rückrufe aus app.js → js/stamm.js.
import { t, sprache } from "../i18n.js";
import { esc } from "../util.js";
import { mascotMarkup } from "../gastrocash-brand.js";
import { zekiFragenFuer } from "../data/zeki_fragen.js";

export const RUNDGANG_SCHRITTE = [
  { id: "ziel", ziel: ".h-ziel" },
  { id: "kacheln", ziel: ".h-kacheln" },
  { id: "jetzt", ziel: ".h-jetzt, .h-zeki" },
  { id: "leiste", ziel: ".tableiste" },
  { id: "menue", ziel: ".menueknopf" },
  { id: "zeki", ziel: ".appleiste .zeki-knopf" },
];

let huelle = null;
let nr = 0; let rueck = null;
const fuellen = (el, html) => el.replaceChildren(el.ownerDocument.createRange().createContextualFragment(html)); // nur Anzeige

export const rundgangOffen = () => !!huelle;

export function rundgangStarten(doc, { log, ende } = {}) {
  if (!doc || huelle) return false;
  rueck = { log: log || (() => {}), ende: ende || (() => {}) };
  nr = 0;
  huelle = doc.createElement("div");
  huelle.setAttribute("class", "rg-huelle"); huelle.setAttribute("role", "dialog"); huelle.setAttribute("aria-modal", "true");
  doc.body.appendChild(huelle);
  doc.body.classList.add("rg-aktiv");
  rueck.log({ art: "rundgang", inhalt: "start" });
  zeigen(doc);
  return true;
}

function zeigen(doc) {
  const s = RUNDGANG_SCHRITTE[nr];
  if (!s) return frage(doc);
  const el = [...doc.querySelectorAll(s.ziel)].find((x) => x.getClientRects().length);
  if (!el) { nr++; return zeigen(doc); }
  el.scrollIntoView({ block: "center", behavior: "instant" });
  const r = el.getBoundingClientRect(), h = doc.defaultView.innerHeight;
  const pad = 8, unten = r.top + r.height / 2 < h / 2;
  const punkte = RUNDGANG_SCHRITTE.map((_, i) => `<i class="${i === nr ? "an" : ""}"></i>`).join("");
  fuellen(huelle, `
    <div class="rg-loch" style="top:${Math.round(r.top - pad)}px;left:${Math.round(r.left - pad)}px;width:${Math.round(r.width + 2 * pad)}px;height:${Math.round(r.height + 2 * pad)}px"></div>
    <div class="rg-karte ${unten ? "rg-unten" : "rg-oben"}" style="${unten ? `top:${Math.round(r.bottom + pad + 14)}px` : `bottom:${Math.round(h - r.top + pad + 14)}px`}">
      <span class="rg-zeki zeki-lebt">${mascotMarkup(s.id === "zeki" ? "freude" : "hilfe", s.id === "ziel" ? "hand" : "none")}</span>
      <div class="rg-blase"><p dir="auto">${esc(t("rundgang.schritte." + s.id))}</p>
        <div class="rg-fuss"><span class="rg-punkte" aria-hidden="true">${punkte}</span><button type="button" class="knopf rg-weiter">${esc(t("allgemein.weiter"))}</button></div></div>
    </div>`);
  huelle.querySelector(".rg-weiter").addEventListener("click", () => { nr++; zeigen(doc); });
  huelle.querySelector(".rg-weiter").focus();
}

function frage(doc) {
  fuellen(huelle, `
    <div class="rg-ende">
      <span class="rg-zeki gross zeki-lebt">${mascotMarkup("frage", "none")}</span>
      <h2 dir="auto">${esc(t("rundgang.fertigFrage"))}</h2>
      <button type="button" class="knopf" data-rg="ja">${esc(t("rundgang.ja"))}</button>
      <button type="button" class="knopf zweit" data-rg="nochmal">${esc(t("rundgang.nochmal"))}</button>
      <button type="button" class="knopf zweit" data-rg="frage">${esc(t("rundgang.frage"))}</button>
    </div>`);
  huelle.querySelector('[data-rg="ja"]').addEventListener("click", () => schliessen(doc, "verstanden"));
  huelle.querySelector('[data-rg="nochmal"]').addEventListener("click", () => { rueck.log({ art: "rundgang", inhalt: "nochmal" }); nr = 0; zeigen(doc); });
  huelle.querySelector('[data-rg="frage"]').addEventListener("click", () => fragen(doc));
}

function fragen(doc) {
  const liste = zekiFragenFuer("start", sprache(), 6);
  fuellen(huelle, `
    <div class="rg-ende rg-fragen">
      <span class="rg-zeki zeki-lebt">${mascotMarkup("hilfe", "none")}</span>
      <h2 dir="auto">${esc(t("rundgang.fragenTitel"))}</h2>
      <div class="zeki-fragen">${liste.map((q) => `<details class="zeki-frage" data-id="${esc(q.id)}"><summary>${esc(q.f)}</summary><p>${esc(q.a)}</p></details>`).join("")}</div>
      <textarea class="textfeld rg-text" rows="2" maxlength="300" placeholder="${esc(t("rundgang.fragePlatzhalter"))}" aria-label="${esc(t("rundgang.fragePlatzhalter"))}"></textarea>
      <p class="rg-danke" hidden>${esc(t("rundgang.danke"))}</p>
      <button type="button" class="knopf zweit" data-rg="senden">${esc(t("rundgang.abschicken"))}</button>
      <button type="button" class="knopf" data-rg="fertig">${esc(t("rundgang.schliessen"))}</button>
    </div>`);
  huelle.querySelectorAll("details.zeki-frage").forEach((d) => d.addEventListener("toggle", () => { if (d.open) rueck.log({ art: "frage-katalog", inhalt: d.dataset.id, ort: "rundgang" }); }));
  huelle.querySelector('[data-rg="senden"]').addEventListener("click", () => {
    const feld = huelle.querySelector(".rg-text"); const text = feld.value.trim(); if (!text) { feld.focus(); return; }
    rueck.log({ art: "frage-frei", inhalt: text, ort: "rundgang", sprache: sprache() });
    feld.setRangeText("", 0, feld.value.length, "end"); huelle.querySelector(".rg-danke").hidden = false;
  });
  huelle.querySelector('[data-rg="fertig"]').addEventListener("click", () => schliessen(doc, "frage"));
}

function schliessen(doc, ergebnis) {
  rueck.log({ art: "rundgang", inhalt: ergebnis });
  rueck.ende(ergebnis);
  huelle?.remove(); huelle = null; doc.body.classList.remove("rg-aktiv");
}
