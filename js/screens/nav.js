// Kopfleiste und Leiste unten – drei Ebenen (15.10.2026, Entwickler A). Ersetzt das Menü mit 16 Zeilen und den Schnellknopf „+".
// LADEN: ☰ (öffnet das Menü-Blatt, siehe ebene.js) · Logo · „?" oben, fünf Reiter unten. PERSONAL: Logo und Schloss, keine Leiste.
// BÜRO: „‹ Laden" bzw. „‹ Büro" oben, keine Leiste. Jede Ansicht ruft wie bisher nav(<aktiv>) am Ende ihres HTML auf.
import { t } from "../i18n.js";
import { esc } from "../util.js";
import { kuehlStatus, offeneNachkontrollen, schwundOhneWert, kalkulation, rundgangOffen, aktiveStellen, letzteMessung, rundgangAbweichungen } from "../engine.js"; // W2-H: rundgangAbweichungen
import { eintraegeZaehlen } from "../store.js";
import { einrichtungStand } from "../einrichtung.js";
import { planGruppen } from "../putzplan.js";
import { modus, LADEN_TABS, pinGesetzt } from "../modus.js";
import { sym } from "../symbole.js";

let kontext = { stand: null, wurzel: null, ansicht: "start" };
export const navKontext = (stand, wurzel, ansicht = "start") => { kontext = { stand, wurzel, ansicht }; };

// Sicherung: gelb ab 3 Tagen oder 20 neuen Einträgen, rot ab 7 Tagen (wie Etappe 5)
export function sicherungStufe(wurzel, jetzt = Date.now()) {
  if (!wurzel) return null;
  const n = eintraegeZaehlen(wurzel); const neu = n - (wurzel.sicherungZaehler || 0);
  const tage = wurzel.letzteSicherung ? Math.floor((jetzt - Date.parse(wurzel.letzteSicherung)) / 86400e3) : null;
  return { stufe: tage === null ? (n >= 5 ? "rot" : null) : tage >= 7 ? "rot" : (tage >= 3 || neu >= 20) ? "gelb" : null, tage, neu, n };
}

// Zahlen für „Offen im Büro" (rein rechnend). Teuer (Kalkulation): wird nur auf Abruf gerechnet, nie beim Zeichnen des Ladens.
export function menueZaehler(stand, wurzel) {
  if (!stand) return {};
  const ks = kuehlStatus(stand); const nk = offeneNachkontrollen(stand);
  const kuehl = (ks.eingerichtet ? Math.max(0, ks.stellen - ks.heuteGemessen) : 0) + nk.length;
  const karte = stand.gerichte?.length ? kalkulation(stand).zaehl.grau : 0;
  const s = sicherungStufe(wurzel); const e = einrichtungStand(stand, wurzel);
  return { start: e.prozent < 100 ? `${e.prozent} %` : null, kuehl: kuehl || null, karte: karte || null, listen: schwundOhneWert(stand).length || null,
    sicherung: s?.stufe ? "!" : null, punkt: s?.stufe === "rot" || nk.some((m) => m.ueberfaellig) };
}

// Roter Punkt in der Leiste: höchstens einer gleichzeitig, Kühlung vor Putzen (Architektur „Jetzt dran").
// Kühlung: Nachkontrolle offen, letzter Wert einer Stelle außerhalb der Grenze oder Rundgang begonnen und nicht fertig. Putzen: Aufgabe überfällig.
export function ladenPunkt(stand) {
  if (!stand) return null;
  try {
    if (offeneNachkontrollen(stand).length || rundgangOffen(stand)) return "kuehl";
    if (aktiveStellen(stand).some((k) => letzteMessung(stand, k.id)?.abweichung)) return "kuehl";
    if (rundgangAbweichungen(stand).length) return "kuehl"; // W2-H (p01 K3): Abweichung im offenen Rundgang zählt sofort (bleibt rot, auch wenn der offene Rundgang allein später keinen Punkt mehr gibt)
    if (stand.putzplan?.aktiv && planGruppen(stand).ueberfaellig > 0) return "putzplan";
  } catch (e) { console.warn(e); }
  return null;
}

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
    const schloss = `<button type="button" class="schlossknopf" data-a="schloss" aria-label="${esc(t(pinGesetzt(wurzel) ? "ebene.schlossCode" : "ebene.schlossHalten"))}"><svg class="schlossring" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21"/></svg>${sym("lock")}</button>`;
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
