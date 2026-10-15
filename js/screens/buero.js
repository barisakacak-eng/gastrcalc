// Büro – Startseite (Drei Ebenen, 15.10.2026, Vorschau-Rahmen „Büro“): alles Rechnen, Einrichten und Abgeben an einem Ort.
// Blöcke: Offen (Chips, statt Meldungen im Laden) · Ordner zum Abgeben · Zahlen · Karte & Einkauf · Laden einrichten.
// Der Büro-Code (4 Ziffern) wird nur als Hash auf der Wurzel gehalten (js/buero_code.js). Optik: css/buero.css (Klassen mit „b-“).
import { t } from "../i18n.js";
import { esc, fmtEuro, heute } from "../util.js";
import { sym } from "../symbole.js";
import { zaehler } from "../zaehler.js";
import { inventurenFertig } from "../inventur.js";
import { einrichtungStand } from "../einrichtung.js";
import { offenImBuero } from "../offen.js";
import { codeGesetzt, codeSetzen, codePruefen, codeEntfernen, CODE_RE } from "../buero_code.js";
import { belehrungen } from "../export_amt.js";
import { ordnerKachelStand } from "./ordner.js";
import { monatName, datumLesbar } from "./tag.js";

// Symbole, die es in symbole.js (noch) nicht gibt – Lucide, ISC-Lizenz wie dort. Eigene Liste, damit symbole.js unberührt bleibt.
const EXTRA = {
  "shield-check": '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  "file-text": '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  "share": '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/>',
  "lock": '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  "download": '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  "clipboard-list": '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
  "eye": '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
  "chevron-left": '<path d="m15 18-6-6 6-6"/>',
};
export const bsym = (name, klasse = "") => EXTRA[name] ? `<svg class="sym ${klasse}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${EXTRA[name]}</svg>` : sym(name, klasse);

// Fortschrittsring (SVG), Prozent 0–100
export function ring(prozent, { groesse = 26, dicke = 4, farbe = "var(--salbei-tief)", text = false } = {}) {
  const r = (groesse - dicke) / 2; const u = 2 * Math.PI * r; const p = Math.max(0, Math.min(100, prozent || 0));
  return `<svg class="b-ring" width="${groesse}" height="${groesse}" viewBox="0 0 ${groesse} ${groesse}" aria-hidden="true">
    <circle cx="${groesse / 2}" cy="${groesse / 2}" r="${r}" fill="none" stroke="var(--papier-tief)" stroke-width="${dicke}"/>
    <circle cx="${groesse / 2}" cy="${groesse / 2}" r="${r}" fill="none" stroke="${farbe}" stroke-width="${dicke}" stroke-linecap="round" stroke-dasharray="${(u * p / 100).toFixed(2)} ${u.toFixed(2)}" transform="rotate(-90 ${groesse / 2} ${groesse / 2})"/>
    ${text ? `<text x="50%" y="50%" dy=".35em" text-anchor="middle" font-size="${Math.round(groesse * (p >= 100 ? 0.22 : 0.27))}" font-weight="800" fill="var(--tinte)">${Math.round(p)}%</text>` : ""}</svg>`;
}

// data-Attribute für ein Ziel { aktion, wert?, schritt?, bis? }
export const zielAttr = (z) => `data-a="${esc(z.aktion)}"${z.wert ? ` data-wert="${esc(z.wert)}"` : ""}${z.schritt ? ` data-schritt="${esc(z.schritt)}"` : ""}${z.bis ? ` data-bis="${esc(z.bis)}"` : ""}`;

// ---------- Zustand dieser Ansicht ----------
let entsperrt = false;      // Büro-Code in dieser Sitzung schon eingegeben
let codeForm = null;        // null | { schritt: "neu" | "wiederholen", erster }
let codeEingabe = "";       // aktuelles Feld (nicht gespeichert)
let codeFehler = "";
export const bueroEntsperren = () => { entsperrt = true; }; // für Entwickler A: wer den Code schon geprüft hat, öffnet ohne zweite Frage
export function bueroZuruecksetzen() { codeForm = null; codeEingabe = ""; codeFehler = ""; }
export function bueroSperren() { entsperrt = false; bueroZuruecksetzen(); }

const kopf = (zurueck, titel) => `<header class="b-leiste"><button type="button" class="b-zurueck" data-a="nav" data-wert="${esc(zurueck.ziel)}">${bsym("chevron-left")}<span>${esc(zurueck.text)}</span></button><span class="b-titel">${esc(titel)}</span><span></span></header>`;
export const bueroKopf = kopf;

function sperrSchirm() {
  return `<div class="buero">${kopf({ ziel: "start", text: t("buero.zurueck") }, t("buero.titel"))}
    <div class="b-inhalt b-sperre">
      <span class="b-sperrsym">${bsym("lock")}</span>
      <h1>${esc(t("buero.code.eingeben"))}</h1>
      <input class="b-codefeld" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" data-f="buero-code" aria-label="${esc(t("buero.code.eingeben"))}" value="${esc(codeEingabe)}">
      ${codeFehler ? `<p class="b-fehler" role="alert">${esc(codeFehler)}</p>` : ""}
      <button type="button" class="knopf glut b-haupt" data-a="buero-code-oeffnen">${esc(t("buero.code.oeffnen"))}</button>
    </div></div>`;
}

function codeBlatt(wurzel) {
  if (!codeForm) return "";
  const gesetzt = codeGesetzt(wurzel);
  return `<div class="b-blatt-hinten" data-a="buero-code-zu"></div><div class="b-blatt" role="dialog" aria-label="${esc(t("buero.code.titel"))}">
    <div class="b-griff"></div>
    <h2>${esc(t("buero.code.titel"))}</h2>
    <p class="b-leise">${esc(t("buero.code.text"))}</p>
    <label class="b-feld"><span>${esc(t(codeForm.schritt === "neu" ? "buero.code.neu" : "buero.code.wiederholen"))}</span>
      <input class="b-codefeld" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" data-f="buero-code" value="${esc(codeEingabe)}"></label>
    ${codeFehler ? `<p class="b-fehler" role="alert">${esc(codeFehler)}</p>` : ""}
    <button type="button" class="knopf glut b-haupt" data-a="buero-code-weiter">${esc(t(codeForm.schritt === "neu" ? "allgemein.weiter" : "buero.code.setzen"))}</button>
    ${gesetzt ? `<button type="button" class="knopf zweit" data-a="buero-code-entfernen">${esc(t("buero.code.entfernen"))}</button>` : ""}
    <button type="button" class="leise" data-a="buero-code-zu">${esc(t("allgemein.abbrechen"))}</button>
  </div>`;
}

export function bueroView(stand, wurzel) {
  if (codeGesetzt(wurzel) && !entsperrt) return sperrSchirm();
  const H = heute();
  const offen = offenImBuero(stand, wurzel);
  const bel = belehrungen(stand, { datum: H });
  if (bel.zaehl.bald + bel.zaehl.ueberfaellig) offen.push({ id: "belehrung", text: t("buero.offen.belehrung", bel.zaehl.bald + bel.zaehl.ueberfaellig), farbe: bel.zaehl.ueberfaellig ? "rot" : "gelb", ziel: { aktion: "nav", wert: "ordner-amt" } });
  const chip = (o) => `<button type="button" class="b-chip" ${zielAttr(o.ziel)}>${typeof o.prozent === "number" ? ring(o.prozent) : `<i class="b-punkt ${o.farbe === "rot" ? "rot" : "gelb"}" aria-hidden="true"></i>`}<span>${esc(o.text)}${typeof o.prozent === "number" ? ` <b class="zahl">${o.prozent} %</b>` : ""}</span></button>`;
  const k = ordnerKachelStand(stand, { datum: H });
  const kachel = (id, symbol, s) => `<button type="button" class="karte b-ordnerkachel" data-a="nav" data-wert="ordner-${id}"><span class="b-ks ${id}">${bsym(symbol)}</span><b>${esc(t(`ordner.${id}.kachel`))}</b><small><i class="b-punkt ${s.farbe}" aria-hidden="true"></i>${esc(s.text)}</small></button>`;
  const z = zaehler(stand, { datum: H });
  const inv = inventurenFertig(stand).pop();
  const zeile = (ziel, symbol, titel, unter, wert = "") => `<button type="button" class="b-zeile" ${zielAttr(ziel)}><span class="b-zs">${bsym(symbol)}</span><span class="b-zt"><b>${esc(titel)}</b>${unter ? `<small>${esc(unter)}</small>` : ""}</span>${wert}${bsym("chevron-right", "b-pfeil")}</button>`;
  const monatWert = z.keinUmsatz ? "" : `<span class="b-wert zahl ${z.stand >= 0 ? "plus" : "minus"}">${z.stand >= 0 ? "+ " : "− "}${esc(fmtEuro(Math.abs(z.stand)))}</span>`;
  const mini = (ziel, symbol, titel) => `<button type="button" class="karte b-minikachel" ${zielAttr(ziel)}><span class="b-ks">${bsym(symbol)}</span><b>${esc(titel)}</b></button>`;
  const e = einrichtungStand(stand, wurzel);
  const codeAn = codeGesetzt(wurzel);
  return `<div class="buero">${kopf({ ziel: "start", text: t("buero.zurueck") }, t("buero.titel"))}
    <div class="b-inhalt">
      ${offen.length ? `<h2 class="b-abschnitt">${esc(t("buero.abschnitt.offen"))}</h2><div class="b-offen">${offen.map(chip).join("")}</div>` : ""}
      <h2 class="b-abschnitt">${esc(t("buero.abschnitt.ordner"))}</h2>
      <div class="b-ordner">${kachel("amt", "shield-check", k.amt)}${kachel("steuer", "calculator", k.steuer)}${kachel("buch", "receipt", k.buch)}</div>
      <h2 class="b-abschnitt">${esc(t("buero.abschnitt.zahlen"))}</h2>
      <div class="karte b-liste">
        ${zeile({ aktion: "nav", wert: "umsatz" }, "trending-up", t("buero.zahlen.monat"), t("buero.zahlen.monatUnter", monatName(H)), monatWert)}
        ${zeile({ aktion: "nav", wert: "vergleich" }, "chart-column", t("buero.zahlen.vergleich"), t("buero.zahlen.vergleichUnter"))}
        ${zeile({ aktion: "nav", wert: "listen" }, "file-text", t("buero.zahlen.listen"), t("buero.zahlen.listenUnter"))}
        ${zeile({ aktion: "nav", wert: "inventur" }, "clipboard-list", t("buero.zahlen.inventur"), inv ? t("buero.zahlen.inventurUnter", datumLesbar(inv.datum)) : t("buero.zahlen.inventurNie"))}
      </div>
      <h2 class="b-abschnitt">${esc(t("buero.abschnitt.karte"))}</h2>
      <div class="b-raster3">
        ${mini({ aktion: "bearbeiten", schritt: "rezepte" }, "chef-hat", t("buero.karte.rezepte"))}
        ${mini({ aktion: "bearbeiten", schritt: "preise" }, "shopping-cart", t("buero.karte.preise"))}
        ${mini({ aktion: "nav", wert: "beleg" }, "camera", t("buero.karte.belege"))}
        ${mini({ aktion: "bearbeiten", schritt: "verkauf" }, "wallet", t("buero.karte.verkauf"))}
        ${mini({ aktion: "bearbeiten", schritt: "kosten-miete", bis: "kosten-sonstiges" }, "calculator", t("buero.karte.kosten"))}
        ${mini({ aktion: "nav", wert: "kartefoto" }, "file-text", t("buero.karte.kartefoto"))}
      </div>
      <h2 class="b-abschnitt">${esc(t("buero.abschnitt.einrichten"))}</h2>
      <div class="karte b-liste">
        ${zeile(e.naechster ? e.naechster.ziel : { aktion: "nav", wert: "buero" }, "store", t("buero.einrichten.einrichtung"), "", `<span class="b-wert zahl">${e.prozent} %</span>`)}
        ${zeile({ aktion: "kuehl-einrichtung-oeffnen" }, "snowflake", t("buero.einrichten.kuehl"), "")}
        ${zeile({ aktion: "nav", wert: "putzplan" }, "spray-can", t("buero.einrichten.putzplan"), "")}
        ${zeile({ aktion: "nav", wert: "laeden" }, "store", t("buero.einrichten.laeden"), "")}
        ${zeile({ aktion: "export" }, "download", t("buero.einrichten.sicherung"), "")}
        ${zeile({ aktion: "buero-code-auf" }, "lock", t("buero.einrichten.code"), "", `<span class="b-wert ${codeAn ? "plus" : ""}">${esc(t(codeAn ? "buero.einrichten.codeAn" : "buero.einrichten.codeAus"))}</span>`)}
        ${zeile({ aktion: "nav", wert: "einstellungen" }, "settings", t("buero.einrichten.einstellungen"), "")}
      </div>
    </div>${codeBlatt(wurzel)}</div>`;
}

// ---------- Aktionen ----------
// Rückgabe: false (nicht meine) | true (neu zeichnen) | { speichern: true, meldung? }
export async function bueroAktion(name, el, stand, wurzel) {
  if (name === "buero-code-auf") { codeForm = { schritt: "neu", erster: null }; codeEingabe = ""; codeFehler = ""; return true; }
  if (name === "buero-code-zu") { bueroZuruecksetzen(); return true; }
  if (name === "buero-code-entfernen") { codeEntfernen(wurzel); bueroZuruecksetzen(); return { speichern: true, meldung: t("buero.code.entfernt") }; }
  if (name === "buero-code-weiter") {
    if (!CODE_RE.test(codeEingabe)) { codeFehler = t("buero.code.vier"); return true; }
    if (codeForm?.schritt === "neu") { codeForm = { schritt: "wiederholen", erster: codeEingabe }; codeEingabe = ""; codeFehler = ""; return true; }
    if (codeForm?.erster !== codeEingabe) { codeForm = { schritt: "neu", erster: null }; codeEingabe = ""; codeFehler = t("buero.code.ungleich"); return true; }
    await codeSetzen(wurzel, codeEingabe); entsperrt = true; bueroZuruecksetzen();
    return { speichern: true, meldung: t("buero.code.gesetzt") };
  }
  if (name === "buero-code-oeffnen") {
    if (await codePruefen(wurzel, codeEingabe)) { entsperrt = true; bueroZuruecksetzen(); return true; }
    codeEingabe = ""; codeFehler = t("buero.code.falsch"); return true;
  }
  return false;
}
// Eingaben: nur das Codefeld (Ziffern, höchstens vier). "knopf" = nicht neu zeichnen.
export function bueroEingabe(feld, wert) {
  if (feld !== "buero-code") return false;
  codeEingabe = String(wert || "").replace(/\D/g, "").slice(0, 4); codeFehler = "";
  return "knopf";
}
export const bueroCodeFeld = () => codeEingabe;
