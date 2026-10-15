// Blätter über dem Bildschirm (15.10.2026, Entwickler A): Menü-Blatt mit vier Kacheln, Sprache, Laden wechseln, Hilfe „?", Büro-Code.
// Leistung (Stresstest 15.10.): Die Blätter wohnen in einer eigenen Hülle außerhalb von #app. Öffnen und Schließen zeichnet den
// Bildschirm darunter NICHT neu; teure Zahlen werden erst beim Öffnen gerechnet.
// Platzhalter für „personal" und „buero" stehen unten – sie werden beim Zusammenführen durch die Ansichten von D und C ersetzt.
import { t, sprache, SPRACHEN, SPRACH_NAMEN } from "../i18n.js";
import { esc } from "../util.js";
import { sym } from "../symbole.js";
import { ladenArtVon } from "../profil.js";
import { pinGesetzt, pinPruefen, pinSetzen, pinGueltig } from "../modus.js";
import { nav, sicherungStufe } from "./nav.js";

let huelle = null;
let offen = null;     // "menue" | "sprache" | "laeden" | "hilfe" | "pin"
let pin = null;       // { zweck: "buero" | "personal" | "setzen", ziel, eingabe, erste, meldung, fehler }

// Die Hülle hängt direkt am <body>; app.js hängt seine Klick-Weiche auch hier ein.
export function ebeneHuelle() {
  if (!huelle && typeof document !== "undefined") {
    huelle = document.getElementById("ebene-huelle");
    if (!huelle) { huelle = document.createElement("div"); huelle.id = "ebene-huelle"; document.body.appendChild(huelle); }
  }
  return huelle;
}
export const blattOffen = () => offen;
export const pinOffen = () => offen === "pin";

function zeigen(art, html) {
  const h = ebeneHuelle(); const neu = offen !== art && !offen;
  h.innerHTML = `<div class="ebene-dimmer" data-a="blatt-zu"></div><div class="ebene-blatt blatt-${art}${neu ? " rein" : ""}" role="dialog" aria-modal="true" aria-label="${esc(art === "pin" ? t("ebene.pin.titel") : art === "hilfe" ? t("ebene.hilfeAuf") : t("ebene.menueAuf"))}"><div class="griff" aria-hidden="true"></div>${html}</div>`;
  h.classList.add("da"); document.body.classList.add("blatt-da"); offen = art;
  h.querySelector(".ebene-blatt button")?.focus({ preventScroll: true });
}
export function blattSchliessen() {
  if (!huelle || !offen) return false;
  huelle.classList.remove("da"); huelle.innerHTML = ""; document.body.classList.remove("blatt-da"); offen = null; pin = null;
  return true;
}

const ladenBild = (stand) => { const art = ladenArtVon(stand); return `bilder/laden-${["doener", "pizza", "burger", "asia", "baeckerei", "cafe", "foodtruck"].includes(art) ? art : "anders"}.svg`; };

// ---------- Menü-Blatt (Laden) ----------
export function menueZeigen(stand, wurzel) {
  const mehrere = (wurzel?.betriebe || []).filter((b) => b.phase === "app").length > 1;
  const punktBuero = sicherungStufe(wurzel)?.stufe === "rot"; // erst beim Öffnen gerechnet
  const kachel = (a, wert, symName, text, klasse = "", extra = "") => `<button type="button" class="karte grosskachel ${klasse}" data-a="${a}"${wert ? ` data-wert="${wert}"` : ""}><span class="ks">${sym(symName)}${extra}</span><b>${esc(text)}</b></button>`;
  zeigen("menue", `
    <div class="blattkopf"><img class="ladenbild" src="${ladenBild(stand)}" alt=""><div><b>${esc(stand?.betrieb?.name || t("ebene.deinLaden"))}</b><small>${esc(t("ebene.deinLaden"))}</small></div>
      <button type="button" class="ikonknopf zu" data-a="blatt-zu" aria-label="${esc(t("ebene.schliessen"))}">${sym("x")}</button></div>
    <div class="grosskacheln${mehrere ? "" : " drei"}">
      ${kachel("nav", "abschluss", "moon", t("ebene.abschluss"), "dunkel")}
      ${kachel("modus", "personal", "users", t("ebene.personal"), "k-personal")}
      ${kachel("modus", "buero", "lock", t("ebene.buero"), "k-buero", punktBuero ? '<i class="punkt" aria-hidden="true"></i>' : "")}
      ${mehrere ? kachel("blatt-laeden", "", "store", t("ebene.ladenWechseln"), "k-laeden") : ""}
    </div>
    <button type="button" class="karte sprachzeile" data-a="blatt-sprache">${sym("languages")}<span class="sz-text">${esc(t("ebene.sprache"))}</span><span class="sz-wert">${esc(SPRACH_NAMEN[sprache()] || sprache())}${sym("chevron-right")}</span></button>`);
}

export function spracheZeigen() {
  zeigen("sprache", `<div class="blattkopf nur"><button type="button" class="ikonknopf" data-a="menue-zurueck" aria-label="${esc(t("allgemein.zurueck"))}">${sym("chevron-left")}</button><b>${esc(t("ebene.sprache"))}</b></div>
    <div class="blattliste">${SPRACHEN.map((c) => `<button type="button" class="blattzeile ${sprache() === c ? "an" : ""}" data-a="sprache" data-wert="${c}" lang="${c}"><span>${esc(SPRACH_NAMEN[c] || c)}</span>${sprache() === c ? sym("check") : ""}</button>`).join("")}</div>`);
}

export function laedenZeigen(wurzel) {
  zeigen("laeden", `<div class="blattkopf nur"><button type="button" class="ikonknopf" data-a="menue-zurueck" aria-label="${esc(t("allgemein.zurueck"))}">${sym("chevron-left")}</button><b>${esc(t("ebene.ladenWechseln"))}</b></div>
    <div class="blattliste">${wurzel.betriebe.filter((b) => b.phase === "app").map((b) => `<button type="button" class="blattzeile laden ${b.id === wurzel.aktiv ? "an" : ""}" data-a="laden-wechseln" data-id="${esc(b.id)}"><img src="${ladenBild(b)}" alt=""><span>${esc(b.betrieb.name || t("ebene.deinLaden"))}</span>${b.id === wurzel.aktiv ? sym("check") : ""}</button>`).join("")}</div>`);
}

// ---------- Hilfe „?" ----------
const HILFE = ["start", "muell", "kuehl", "putzplan", "karte", "abschluss", "laeden", "personal", "buero"];
export function hilfeZeigen(ansicht) {
  const k = HILFE.includes(ansicht) ? ansicht : "allgemein";
  const titel = ["start", "muell", "kuehl", "putzplan", "karte"].includes(k) ? t("ebene.tabs." + k) : k === "abschluss" ? t("ebene.abschluss") : k === "personal" ? t("ebene.personal") : k === "buero" ? t("ebene.buero") : k === "laeden" ? t("ebene.ladenWechseln") : t("ebene.hilfeAuf");
  zeigen("hilfe", `<div class="hilfe-inhalt"><span class="ks">${sym("circle-help")}</span><b>${esc(titel)}</b><p>${esc(t("ebene.hilfeText." + k))}</p></div>
    <button type="button" class="knopf" data-a="blatt-zu">OK</button>`);
}

// ---------- Büro-Code (4 Ziffern) ----------
// zweck "buero": Laden → Büro. zweck "personal": Personal → Laden. zweck "setzen": neuen Code wählen (zweimal).
export function pinStarten(zweck, ziel = null) { pin = { zweck, ziel, eingabe: "", erste: null, meldung: null, fehler: false }; pinZeichnen(); }
function pinZeichnen() {
  const p = pin; const titel = p.zweck === "setzen" ? t(p.erste ? "ebene.pin.nochmal" : "ebene.pin.neu") : t("ebene.pin.titel");
  const taste = (z) => `<button type="button" class="pintaste" data-a="pin-taste" data-wert="${z}">${z}</button>`;
  zeigen("pin", `<div class="pin-kopf"><span class="ks">${sym("lock")}</span><b>${esc(titel)}</b><small class="pin-meldung${p.fehler ? " fehler" : ""}" role="status" aria-live="polite">${esc(p.meldung || "")}</small></div>
    <div class="pin-punkte${p.fehler ? " wackeln" : ""}" aria-hidden="true">${[0, 1, 2, 3].map((i) => `<i class="${i < p.eingabe.length ? "voll" : ""}"></i>`).join("")}</div>
    <div class="pin-tasten">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(taste).join("")}<button type="button" class="pintaste leer" data-a="blatt-zu">${esc(t("allgemein.abbrechen"))}</button>${taste(0)}<button type="button" class="pintaste weg" data-a="pin-weg" aria-label="${esc(t("ebene.pin.loeschen"))}">${sym("delete")}</button></div>`);
}

// Eine Taste. Rückgabe: null (weiter tippen) oder { zweck, ziel } wenn der Code stimmt / gesetzt ist.
export async function pinTaste(wert, wurzel) {
  if (!pin) return null;
  if (wert === "weg") { pin.eingabe = pin.eingabe.slice(0, -1); pin.fehler = false; pinZeichnen(); return null; }
  if (pin.eingabe.length >= 4 || !/^[0-9]$/.test(wert)) return null;
  pin.eingabe += wert; pin.fehler = false; pin.meldung = null; pinZeichnen();
  if (pin.eingabe.length < 4) return null;
  const p = pin; const e = p.eingabe;
  if (p.zweck === "setzen") {
    if (!p.erste) { p.erste = e; p.eingabe = ""; pinZeichnen(); return null; }
    if (p.erste !== e || !pinGueltig(e)) { p.erste = null; p.eingabe = ""; p.fehler = true; p.meldung = t("ebene.pin.ungleich"); pinZeichnen(); return null; }
    await pinSetzen(wurzel, e); blattSchliessen(); return { zweck: "setzen" };
  }
  if (await pinPruefen(wurzel, e)) { blattSchliessen(); return { zweck: p.zweck, ziel: p.ziel }; }
  if (pin !== p) return null; // inzwischen geschlossen
  p.eingabe = ""; p.fehler = true; p.meldung = t("ebene.pin.falsch"); pinZeichnen(); return null;
}

// Karte „Büro-Code" für Büro-Start und Einstellungen
export function bueroCodeKarte(wurzel) {
  const da = pinGesetzt(wurzel);
  return `<div class="karte buerocode"><h2>${sym("lock")} ${esc(t("ebene.pin.titel"))}</h2><p class="hinweis">${esc(t(da ? "ebene.pin.mit" : "ebene.pin.ohne"))}</p>
    <button type="button" class="knopf zweit" data-a="pin-setzen">${esc(t(da ? "ebene.pin.aendern" : "ebene.pin.setzen"))}</button>
    ${da ? `<button type="button" class="leise" data-a="pin-entfernen">${esc(t("ebene.pin.entfernen"))}</button>` : ""}</div>`;
}

// ---------- Platzhalter (bis D „personal" und C „buero" liefern) ----------
export function personalPlatzhalter(stand) {
  const kachel = (z, s) => `<button type="button" class="karte riesenkachel-platz" data-a="nav" data-wert="${z}"><span class="ks">${sym(s)}</span><b>${esc(t("ebene.tabs." + z))}</b></button>`;
  return `<div class="inhalt ebene-personal">${kachel("muell", "trash-2")}${kachel("kuehl", "snowflake")}${kachel("putzplan", "spray-can")}</div>${nav("personal")}`;
}
export function bueroPlatzhalter(stand, wurzel) {
  const zeile = (wert, text, s, a = "nav", extra = "") => `<button type="button" class="zeileknopf" data-a="${a}"${wert ? ` data-wert="${wert}"` : ""}${extra}>${sym(s)}<b>${esc(text)}</b><span class="pfeil">›</span></button>`;
  return `<div class="inhalt ebene-buero">
      <div class="karte">${zeile("umsatz", t("menue.umsatz"), "trending-up")}${zeile("vergleich", t("menue.vergleich"), "chart-column")}${zeile("listen", t("menue.listen"), "file-text")}</div>
      <div class="karte">${zeile("", t("start.rezepteAendern"), "chef-hat", "bearbeiten", ' data-schritt="rezepte"')}${zeile("karte", t("menue.karte"), "utensils-crossed")}${zeile("beleg", t("menue.beleg"), "receipt")}${zeile("inventur", t("inventur.menue"), "package")}${zeile("kartefoto", t("foto.karteKnopf"), "camera")}</div>
      <div class="karte">${zeile("", t("menue.kosten"), "wallet", "bearbeiten", ' data-schritt="kosten-miete" data-bis="kosten-sonstiges"')}${zeile("kuehl", t("menue.kuehl"), "snowflake")}${zeile("putzplan", t("menue.putzplan"), "spray-can")}${zeile("laeden", t("menue.laeden"), "store")}${zeile("einstellungen", t("menue.einstellungen"), "settings")}</div>
      ${bueroCodeKarte(wurzel)}
    </div>${nav("buero")}`;
}
