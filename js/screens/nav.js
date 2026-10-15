// Menü hinter den drei Strichen und Schnellknopf (Etappe 6, Punkt 4 – Baris 13.10.2026, 12:57). Ersetzt die Leiste unten.
// Menü von links, vier flache Gruppen, Zahlen rechts, wenn dort etwas wartet. Schnellknopf „+" unten rechts mit drei Pillen.
// Optik gehört Sanji (visual-vertrag.md); hier stehen nur Aufbau, Klassen und data-Attribute.
import { t } from "../i18n.js";
import { esc, heute } from "../util.js";
import { kuehlStatus, offeneNachkontrollen, schwundOhneWert, kalkulation } from "../engine.js";
import { eintraegeZaehlen } from "../store.js";
import { einrichtungStand } from "../einrichtung.js";
import { sym } from "../symbole.js";

let menueOffen = false, schnellOffen = false;
let kontext = { stand: null, wurzel: null };
export const navKontext = (stand, wurzel) => { kontext = { stand, wurzel }; };
export const menueIstOffen = () => menueOffen;
export const schnellIstOffen = () => schnellOffen;
export function menueSetzen(an) { menueOffen = !!an; if (an) schnellOffen = false; }
export function schnellSetzen(an) { schnellOffen = !!an; if (an) menueOffen = false; }

// Sicherung: gelb ab 3 Tagen oder 20 neuen Einträgen, rot ab 7 Tagen (wie Etappe 5)
export function sicherungStufe(wurzel, jetzt = Date.now()) {
  if (!wurzel) return null;
  const n = eintraegeZaehlen(wurzel); const neu = n - (wurzel.sicherungZaehler || 0);
  const tage = wurzel.letzteSicherung ? Math.floor((jetzt - Date.parse(wurzel.letzteSicherung)) / 86400e3) : null;
  return { stufe: tage === null ? (n >= 5 ? "rot" : null) : tage >= 7 ? "rot" : (tage >= 3 || neu >= 20) ? "gelb" : null, tage, neu, n };
}

// Zahlen für die Menüpunkte (rein rechnend)
export function menueZaehler(stand, wurzel) {
  if (!stand) return {};
  const ks = kuehlStatus(stand); const nk = offeneNachkontrollen(stand);
  const kuehl = (ks.eingerichtet ? Math.max(0, ks.stellen - ks.heuteGemessen) : 0) + nk.length;
  const karte = stand.gerichte?.length ? kalkulation(stand).zaehl.grau : 0;
  const s = sicherungStufe(wurzel); const e = einrichtungStand(stand, wurzel);
  return { start: e.prozent < 100 ? `${e.prozent} %` : null, kuehl: kuehl || null, karte: karte || null, listen: schwundOhneWert(stand).length || null,
    sicherung: s?.stufe ? "!" : null, punkt: s?.stufe === "rot" || nk.some((m) => m.ueberfaellig) };
}

const GRUPPEN = [
  ["heute", [["start", "menue.cockpit"], ["muell", "menue.muell"], ["kuehl", "menue.kuehl"], ["putzplan", "menue.putzplan"], ["umsatz", "menue.umsatz"], ["abschluss", "menue.abschluss"]]],
  ["kalkulation", [["vergleich", "menue.vergleich"], ["karte", "menue.karte"], ["beleg", "menue.beleg"], ["inventur", "inventur.menue"], ["kosten", "menue.kosten"]]],
  ["auswertung", [["listen", "menue.listen"], ["laeden", "menue.laeden"]]],
  ["einstellungen", [["einstellungen", "menue.einstellungen"], ["sicherung", "menue.sicherung"]]],
];
const ziel = (z) => z === "kosten" ? 'data-a="bearbeiten" data-schritt="kosten-miete" data-bis="kosten-sonstiges"' : z === "sicherung" ? 'data-a="nav" data-wert="einstellungen" data-anker="sicherung"' : `data-a="nav" data-wert="${z}"`;

export function nav(aktiv, { schnell = true } = {}) {
  const { stand, wurzel } = kontext; const z = menueZaehler(stand, wurzel);
  const name = stand?.betrieb?.name || t("menue.deinLaden");
  const knopf = `<button type="button" class="menueknopf" data-a="menue-auf" aria-label="${esc(t("menue.oeffnen"))}" aria-expanded="${menueOffen}">${sym("menu")}${z.punkt ? '<i class="menuepunkt" aria-hidden="true"></i>' : ""}</button>`;
  const menue = !menueOffen ? "" : `<div class="menuehinten" data-a="menue-zu"></div>
    <nav class="menue" aria-label="${esc(t("menue.titel"))}">
      <button type="button" class="menuekopf" data-a="nav" data-wert="laeden"><b>${esc(name)}</b><small>${esc(stand?.betrieb?.format ? t("format." + stand.betrieb.format)[0] : "")} · ${esc(t("app.entwurf"))}</small></button>
      ${GRUPPEN.map(([g, punkte]) => `<div class="menuegruppe"><h2>${esc(t("menue.gruppen." + g))}</h2>${punkte.map(([id, key]) => `<button type="button" class="menuezeile m-${id} ${aktiv === id ? "an" : ""}" ${ziel(id)}><span class="farbe" aria-hidden="true"></span><span>${esc(t(key))}</span>${z[id] ? `<span class="zahl">${esc(String(z[id]))}</span>` : ""}</button>`).join("")}</div>`).join("")}
    </nav>`;
  const fab = !schnell ? "" : `<div class="schnell ${schnellOffen ? "offen" : ""}">
      ${schnellOffen ? `<div class="schnellhinten" data-a="schnell-zu"></div><div class="pillen">
        <button type="button" class="pille p-muell" data-a="schnell-muell">${esc(t("schnellknopf.muell"))}</button>
        <button type="button" class="pille p-kuehl" data-a="kuehl-rundgang-start" data-offen="0">${esc(t("schnellknopf.kuehl"))}</button>
        <button type="button" class="pille p-umsatz" data-a="schnell-umsatz">${esc(t("schnellknopf.umsatz"))}</button></div>` : ""}
      <button type="button" class="fab" data-a="${schnellOffen ? "schnell-zu" : "schnell-auf"}" aria-label="${esc(t(schnellOffen ? "schnellknopf.zu" : "schnellknopf.auf"))}" aria-expanded="${schnellOffen}">${sym(schnellOffen ? "x" : "plus")}</button></div>`;
  // Helle App-Leiste (Zielbild 15.10.): drei Striche und Logo. Steht im HTML am Ende, CSS (order: -1) stellt sie nach oben.
  const leiste = `<header class="appleiste">${knopf}<img class="logo" src="icons/logo.svg" alt="GastroCalc" height="28"><span class="leiste-rechts">${aktiv === "muell" ? sym("trash-2") : ""}</span></header>`;
  return leiste + menue + fab;
}

