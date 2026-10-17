// Kopfleiste und Leiste unten – drei Ebenen (15.10.2026, Entwickler A). Ersetzt das Menü mit 16 Zeilen und den Schnellknopf „+".
// LADEN: ☰ (öffnet das Menü-Blatt, siehe ebene.js) · Logo · „?" oben, fünf Reiter unten. PERSONAL: Logo und Schloss, keine Leiste.
// BÜRO: „‹ Laden" bzw. „‹ Büro" oben, keine Leiste. Jede Ansicht ruft wie bisher nav(<aktiv>) am Ende ihres HTML auf.
import { t } from "../i18n.js";
import { esc } from "../util.js";
import { ladenPunkt } from "../offen.js"; // Trennung (17.10.2026)
import { modus, LADEN_TABS } from "../modus.js";
import { sym } from "../symbole.js";

let kontext = { stand: null, wurzel: null, ansicht: "start" };
export const navKontext = (stand, wurzel, ansicht = "start") => { kontext = { stand, wurzel, ansicht }; };

// Trennung (17.10.2026): sicherungStufe → js/sicherung_stufe.js, menueZaehler und ladenPunkt → js/offen.js (Rechenwerk).

const TAB_SYM = { start: "house", muell: "trash-2", kuehl: "snowflake", putzplan: "spray-can", karte: "utensils-crossed" };

export function tabLeiste(aktiv, stand) {
  const punkt = ladenPunkt(stand);
  return `<nav class="tableiste" aria-label="${esc(t("ebene.leiste"))}">${LADEN_TABS.map((id) => `<button type="button" class="tab ${aktiv === id ? "an" : ""}" data-a="nav" data-wert="${id}"${aktiv === id ? ' aria-current="page"' : ""}><span class="ik">${sym(TAB_SYM[id])}${punkt === id ? '<i class="punkt" aria-hidden="true"></i>' : ""}</span><span class="tabname">${esc(t("ebene.tabs." + id))}</span></button>`).join("")}</nav>`;
}

const logo = '<img class="logo" src="icons/logo.svg" alt="GastroCalc" height="28">';
const hilfeKnopf = () => `<button type="button" class="ikonknopf hilfe" data-a="hilfe-auf" aria-label="${esc(t("ebene.hilfeAuf"))}">${sym("circle-help")}</button>`;

// nav(aktiv): Kopfleiste (+ Leiste unten im Laden). Zweites Argument nur noch aus Verträglichkeit ({ schnell } hat keine Wirkung mehr).
export function nav(aktiv, _alt = {}) {
  const { stand, wurzel, ansicht } = kontext; const m = modus(wurzel);
  if (m === "personal") {
    const zurueck = ansicht !== "personal" ? `<button type="button" class="ikonknopf zurueckknopf" data-a="nav" data-wert="personal" aria-label="${esc(t("allgemein.zurueck"))}">${sym("chevron-left")}</button>` : "<span></span>";
    // W2-S: Personal gibt es nur mit Büro-Code – das Schloss fragt immer nach dem Code (kein 2-Sekunden-Druck mehr)
    const schloss = `<button type="button" class="schlossknopf" data-a="schloss" aria-label="${esc(t("ebene.schlossCode"))}"><svg class="schlossring" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21"/></svg>${sym("lock")}</button>`;
    return `<header class="appleiste ebene-kopf personal">${zurueck}${logo}${schloss}</header>`;
  }
  if (m === "buero") {
    const start = ansicht === "buero";
    const links = start ? `<button type="button" class="zurueckzeile" data-a="modus" data-wert="laden">${sym("chevron-left")}<span>${esc(t("ebene.zumLaden"))}</span></button>`
      : `<button type="button" class="zurueckzeile" data-a="nav" data-wert="buero">${sym("chevron-left")}<span>${esc(t("ebene.zumBuero"))}</span></button>`;
    return `<header class="appleiste ebene-kopf buero">${links}<span class="kopftitel">${start ? esc(t("ebene.buero")) : ""}</span>${hilfeKnopf()}</header>`;
  }
  const tab = LADEN_TABS.includes(ansicht) ? ansicht : LADEN_TABS.includes(aktiv) ? aktiv : null;
  const menue = `<button type="button" class="ikonknopf menueknopf" data-a="menue-auf" aria-label="${esc(t("ebene.menueAuf"))}" aria-haspopup="dialog">${sym("menu")}</button>`;
  return `<header class="appleiste ebene-kopf laden">${menue}${logo}${hilfeKnopf()}</header>${tabLeiste(tab, stand)}`;
}
