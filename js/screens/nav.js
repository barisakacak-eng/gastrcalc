// Kopfleiste und Leiste unten – drei Ebenen (15.10.2026, Entwickler A). Ersetzt das Menü mit 16 Zeilen und den Schnellknopf „+".
// LADEN: ☰ (öffnet das Menü-Blatt, siehe ebene.js) · Logo · „?" oben, fünf Reiter unten. PERSONAL: Logo und Schloss, keine Leiste.
// BÜRO: „‹ Laden" bzw. „‹ Büro" oben, keine Leiste. Jede Ansicht ruft wie bisher nav(<aktiv>) am Ende ihres HTML auf.
import { t, sprache, RTL } from "../i18n.js";
import { esc } from "../util.js";
import { ladenPunkt } from "../offen.js"; // Trennung (17.10.2026)
import { modus, LADEN_TABS } from "../modus.js";
import { sym } from "../symbole.js";
import { buehneHtml } from "../buehne.js";
import { buehnenSchluessel, berlinStunde, ZEKI_ANSICHT } from "../zeki_figur.js";

let kontext = { stand: null, wurzel: null, ansicht: "start", weg: [] };
export const navKontext = (stand, wurzel, ansicht = "start", weg = []) => { kontext = { stand, wurzel, ansicht, weg }; };
// Baris 01.11.2026 (Klicker K2 Runde 2, B1): „Zurück“ im Büro führt eine Ebene zurück – zum vorigen Büro-Bildschirm, sonst zum Büro-Start.
// weg = Liste der vorher besuchten Büro-Bildschirme (app.js); data-zurueck sagt app.js, dass der Eintrag vom Weg genommen wird.
export function bueroZurueckKnopf() {
  const vorher = kontext.weg?.length ? kontext.weg[kontext.weg.length - 1] : null;
  return vorher && vorher !== "buero"
    ? `<button type="button" class="zurueckzeile" data-a="nav" data-wert="${esc(vorher)}" data-zurueck="1">${sym("chevron-left")}<span>${esc(t("allgemein.zurueck"))}</span></button>`
    : `<button type="button" class="zurueckzeile" data-a="nav" data-wert="buero" data-zurueck="1">${sym("chevron-left")}<span>${esc(t("ebene.zumBuero"))}</span></button>`;
}

// Trennung (17.10.2026): sicherungStufe → js/sicherung_stufe.js, menueZaehler und ladenPunkt → js/offen.js (Rechenwerk).

const TAB_SYM = { start: "house", muell: "trash-2", kuehl: "snowflake", putzplan: "spray-can", karte: "utensils-crossed" };

function tabLeiste(aktiv, stand) {
  const punkt = ladenPunkt(stand);
  return `<nav class="tableiste" aria-label="${esc(t("ebene.leiste"))}">${LADEN_TABS.map((id) => `<button type="button" class="tab ${aktiv === id ? "an" : ""}" data-a="nav" data-wert="${id}"${aktiv === id ? ' aria-current="page"' : ""}><span class="ik">${sym(TAB_SYM[id])}${punkt === id ? '<i class="punkt" aria-hidden="true"></i>' : ""}</span><span class="tabname">${esc(t("ebene.tabs." + id))}</span></button>`).join("")}</nav>`;
}

const logo = () => `<span class="gc-brand" aria-label="GastroCash"><span class="gc-brand-name">Gastro<strong>Cash</strong></span></span>`; // Markenbaustein in der echten Navigationsfunktion
// Die Bühne (Salbei & Papier): gemeinsamer Kopf aller Ansichten – oben die Kopfzeile, darunter der Innenbereich mit Titel und Zekis Satz, rechts (RTL links) EINE Zeki-Figur.
// Zeki steht hinter der unteren Kante und ist selbst der Hilfe-Knopf (data-a="hilfe-auf"). Titel und Satz der Ansicht setzt js/screens/buehne_dom.js nach dem Zeichnen hinein.
const FIGUR_KNOPF = () => ({ aktion: "hilfe-auf", label: t("ebene.hilfeAuf"), klassen: "ikonknopf hilfe zeki-knopf gc-figur-knopf" });
const REST = '<span class="gc-kopf-rest" aria-hidden="true"></span>'; // gleich breit wie der Knopf links, damit die Mitte mittig bleibt
// Welches Bühnen-Bild? Die Ansicht der App (kontext.ansicht); ist sie unbekannt, die Ansicht, die nav() bekommt. schritt = Unterzustand (eingabe, rundgang, bilanz, einrichtung).
function buehnenBildFuer(ansicht, aktiv, schritt) {
  const bekannt = (a) => a === "start" || (a && Object.hasOwn(ZEKI_ANSICHT, a));
  const a = bekannt(ansicht) ? ansicht : bekannt(aktiv) ? aktiv : ansicht;
  return buehnenSchluessel(a, { stunde: a === "start" ? berlinStunde() : undefined, schritt });
}
export function buehne(ebene, kopf, aktiv, { schritt } = {}) {
  const { ansicht } = kontext;
  const muell = (ansicht || aktiv) === "muell"; // Weinrot nur bei Müll
  return buehneHtml({ kopf, klasse: `appleiste ebene-kopf ${ebene}${muell ? " gc-muell" : ""}`, schluessel: buehnenBildFuer(ansicht, aktiv, schritt), rtl: RTL.has(sprache()), figurKnopf: FIGUR_KNOPF() });
}
// Büro-Bildschirme bauen ihren Kopf selbst (js/screens/buero.js) – links Zurück, in der Mitte der Titel, dieselbe Bühne.
export const bueroBuehne = (links, titel = "", schritt) => buehne("buero", `${links}<span class="kopftitel">${esc(titel)}</span>${REST}`, kontext.ansicht, { schritt });

// nav(aktiv): Bühne (+ Leiste unten im Laden). Zweites Argument: { schritt } = Unterzustand für das Bühnen-Bild; { schnell } hat keine Wirkung mehr.
export function nav(aktiv, alt = {}) {
  const { stand, wurzel, ansicht } = kontext; const m = modus(wurzel); const schritt = alt?.schritt;
  if (m === "personal") {
    const zurueck = ansicht !== "personal" ? `<button type="button" class="ikonknopf zurueckknopf" data-a="nav" data-wert="personal" aria-label="${esc(t("allgemein.zurueck"))}">${sym("chevron-left")}</button>` : "<span></span>";
    // W2-S: Personal gibt es nur mit Büro-Code – das Schloss fragt immer nach dem Code (kein 2-Sekunden-Druck mehr)
    const schloss = `<button type="button" class="schlossknopf" data-a="schloss" aria-label="${esc(t("ebene.schlossCode"))}"><svg class="schlossring" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="21"/></svg>${sym("lock")}</button>`;
    return buehne("personal", `${zurueck}${logo()}${schloss}`, aktiv, { schritt });
  }
  if (m === "buero") {
    const start = ansicht === "buero";
    const links = start ? `<button type="button" class="zurueckzeile" data-a="modus" data-wert="laden">${sym("chevron-left")}<span>${esc(t("ebene.zumLaden"))}</span></button>`
      : bueroZurueckKnopf();
    return bueroBuehne(links, start ? t("ebene.buero") : "", schritt);
  }
  const tab = LADEN_TABS.includes(ansicht) ? ansicht : LADEN_TABS.includes(aktiv) ? aktiv : null;
  const menue = `<button type="button" class="ikonknopf menueknopf" data-a="menue-auf" aria-label="${esc(t("ebene.menueAuf"))}" aria-haspopup="dialog">${sym("menu")}</button>`;
  return `${buehne("laden", `${menue}${logo()}${REST}`, aktiv, { schritt })}${tabLeiste(tab, stand)}`;
}
