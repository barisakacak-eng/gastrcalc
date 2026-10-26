// Büro – Startseite (Drei Ebenen, 15.10.2026, Vorschau-Rahmen „Büro“): alles Rechnen, Einrichten und Abgeben an einem Ort.
// Blöcke: Offen (Chips, statt Meldungen im Laden) · Ordner zum Abgeben · Zahlen · Karte & Einkauf · Laden einrichten.
// Büro-Code: ein Code für alles (modus.js, wurzel.bueroPin, Zifferntastatur in ebene.js) – er schützt den Eintritt ins Büro, nicht diese Seite. Optik: css/buero.css (Klassen mit „b-“).
import { t } from "../i18n.js";
import { hilfeKnopf } from "./nav.js"; // Zeki als Begleiter (26.10.2026)
import { esc, fmtEuro, heute, heuteGeschaeft } from "../util.js";
import { sym } from "../symbole.js";
import { bueroRing, zielAttr as zielAttrAlle } from "./bausteine.js"; // Trennung (17.10.2026)
import { zaehler } from "../zaehler.js";
import { wareneinsatzWarnung } from "../engine.js"; // Paket 3 (16.10.2026), M4: gemeinsame Warnschwelle, auch im Büro „Monat & Zähler“
import { inventurenFertig } from "../inventur.js";
import { einrichtungStand } from "../einrichtung.js";
import { offenImBuero, zaehlerImTakt, einrichtungImTakt } from "../offen.js"; // W2-D: Zwischenspeicher je Bild
import { pinGesetzt } from "../modus.js";
import { belehrungen } from "../export_amt.js";
import { ordnerKachelStand } from "../ordner_text.js"; // Trennung 2 (17.10.2026)
import { hinweiseAnzahl } from "../hinweis.js"; // Hinweis-Karten (23.10.2026)
import { monatName, datumLesbar } from "./tag.js";
import { verkaufSichtbar } from "../verkauf.js"; // E7 (17.10.2026): Einstieg „Verkauf je Gericht“ nur mit Schalter oder im Beispiel-Laden
import { bestandUhrzeit, lieferUhrzeit } from "../bestand.js"; // Lieferanten (18.10.2026): lieferUhrzeit als Unterzeile „Lieferanten“ // Bestand (17.10.2026): Einstieg „Lager & Bestellen“, Unterzeile = die Uhrzeit
import { haltbarUhrzeit } from "../haltbar.js"; // Stufe 1 (17.10.2026): Einstieg „Aktionen & Haltbarkeit“, Unterzeile = die Uhrzeit
import { aktionUhrzeit } from "../aktion_plan.js"; // Aktion planen (18.10.2026): Satz zur laufenden Aktion

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
  "tv": '<rect width="20" height="15" x="2" y="7" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/>', // Menütafel (18.10.2026)
  "lightbulb": '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>', // Hinweise (23.10.2026)
  "cup-soda": '<path d="m6 8 1.75 12.28a2 2 0 0 0 2 1.72h4.54a2 2 0 0 0 2-1.72L18 8"/><path d="M5 8h14"/><path d="M7 15a6.47 6.47 0 0 1 5 0 6.47 6.47 0 0 0 5 0"/><path d="m12 8 1-6h2"/>', // Getränke (18.10.2026)
};
export const bsym = (name, klasse = "") => EXTRA[name] ? `<svg class="sym ${klasse}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${EXTRA[name]}</svg>` : sym(name, klasse);

// Trennung (17.10.2026): Ring und zielAttr wohnen in ./bausteine.js (Büro-Ausgabe wie bisher: zielAttr ohne anker/offen)
const ring = bueroRing;
const zielAttr = (z) => zielAttrAlle(z, { zusatz: false });

// ---------- Kopf ----------
// Gleiche Leiste wie alle Büro-Bildschirme (nav.js): Ziel „start" heißt zurück in den Laden.
export const bueroEntsperren = () => {}; export function bueroZuruecksetzen() {} export function bueroSperren() {}
const kopf = (zurueck, titel) => `<header class="appleiste ebene-kopf buero">${zurueck.ziel === "start"
    ? `<button type="button" class="zurueckzeile" data-a="modus" data-wert="laden">${bsym("chevron-left")}<span>${esc(t("ebene.zumLaden"))}</span></button>`
    : `<button type="button" class="zurueckzeile" data-a="nav" data-wert="${esc(zurueck.ziel)}">${bsym("chevron-left")}<span>${esc(zurueck.text)}</span></button>`}<span class="kopftitel">${esc(titel)}</span>${hilfeKnopf()}</header>`;
export const bueroKopf = kopf;

export function bueroView(stand, wurzel, extra = {}) {
  const H = heute();
  const offen = offenImBuero(stand, wurzel, { aktualisierung: !!extra.aktualisierung }); // W2-D: Update-Hinweis als Chip
  const bel = belehrungen(stand, { datum: H });
  if (bel.zaehl.bald + bel.zaehl.ueberfaellig) offen.push({ id: "belehrung", text: t("buero.offen.belehrung", bel.zaehl.bald + bel.zaehl.ueberfaellig), farbe: bel.zaehl.ueberfaellig ? "rot" : "gelb", ziel: { aktion: "nav", wert: "ordner-amt" } });
  const chip = (o) => `<button type="button" class="b-chip" ${zielAttr(o.ziel)}>${typeof o.prozent === "number" ? ring(o.prozent) : `<i class="b-punkt ${o.farbe === "rot" ? "rot" : "gelb"}" aria-hidden="true"></i>`}<span>${esc(o.text)}${typeof o.prozent === "number" ? ` <b class="zahl">${o.prozent} %</b>` : ""}</span></button>`;
  const k = ordnerKachelStand(stand, { datum: H });
  const kachel = (id, symbol, s) => `<button type="button" class="karte b-ordnerkachel" data-a="nav" data-wert="ordner-${id}"><span class="b-ks ${id}">${bsym(symbol)}</span><b>${esc(t(`ordner.${id}.kachel`))}</b><small><i class="b-punkt ${s.farbe}" aria-hidden="true"></i>${esc(s.text)}</small></button>`;
  const z = zaehlerImTakt(stand, heuteGeschaeft()); // W2-D; Paket 3, M7: Zähler nach Geschäftstag, Belehrungen/Ordner (H) nach Kalender
  const inv = inventurenFertig(stand).pop();
  const zeile = (ziel, symbol, titel, unter, wert = "") => `<button type="button" class="b-zeile" ${zielAttr(ziel)}><span class="b-zs">${bsym(symbol)}</span><span class="b-zt"><b>${esc(titel)}</b>${unter ? `<small>${esc(unter)}</small>` : ""}</span>${wert}${bsym("chevron-right", "b-pfeil")}</button>`;
  const monatWert = z.keinUmsatz ? "" : `<span class="b-wert zahl ${z.stand >= 0 ? "plus" : "minus"}">${z.stand >= 0 ? "+ " : "− "}${esc(fmtEuro(Math.abs(z.stand)))}</span>`;
  const e = einrichtungImTakt(stand, wurzel); // W2-D
  const codeAn = pinGesetzt(wurzel);
  // Entrümpelung Punkt 3 (19.10.2026, freigegeben 18.10.): 3 Ordner + 4 Bereiche statt 27 Einträge. Jeder Bereich zeigt nur seine „Uhrzeit“,
  // aufgeklappt (details/summary, ohne eigenen Zustand) alle Wege wie bisher. Oben nur der wichtigste offene Punkt, der Rest hinter „+ n“.
  const bu = bestandUhrzeit(stand); const ware = bu || lieferUhrzeit(stand);
  const karteSatz = haltbarUhrzeit(stand) || aktionUhrzeit(stand);
  const bereich = (id, symbol, titel, satz, rot, inhalt, wert = "") => `<details class="b-bereich" data-bereich="${id}"><summary class="b-zeile b-bereichkopf"><span class="b-zs">${bsym(symbol)}</span><span class="b-zt"><b>${esc(titel)}</b>${satz ? `<small class="${rot ? "rot" : ""}">${esc(satz)}</small>` : ""}</span>${wert}${bsym("chevron-right", "b-pfeil")}</summary><div class="karte b-liste">${inhalt}</div></details>`;
  const [erster, ...rest] = offen;
  return `<div class="buero">${kopf({ ziel: "start", text: t("buero.zurueck") }, t("buero.titel"))}
    <div class="b-inhalt">
      ${erster ? `<div class="b-offen">${chip(erster)}${rest.length ? `<details class="b-offen-mehr"><summary class="b-chip b-mehr">+ ${rest.length}</summary><div class="b-offen">${rest.map(chip).join("")}</div></details>` : ""}</div>` : ""}
      <div class="b-ordner">${kachel("amt", "shield-check", k.amt)}${kachel("steuer", "calculator", k.steuer)}${kachel("buch", "receipt", k.buch)}</div>
      <div class="b-werkzeuge">
        ${zeile({ aktion: "nav", wert: "einstellungen" }, "settings", t("buero.einrichten.einstellungen"), "")}
        ${zeile({ aktion: "export" }, "download", t("buero.einrichten.sicherung"), "")}
      </div>
      <div class="b-bereiche">
      ${bereich("geld", "trending-up", t("buero.abschnitt.geld"), t("buero.zahlen.monatUnter", monatName(H)), false, `
        ${zeile({ aktion: "nav", wert: "umsatz" }, "trending-up", t("buero.zahlen.monat"), `${t("buero.zahlen.monatUnter", monatName(H))}${z.quoteQuelle === "richtwert" || z.quoteRichtpreis ? ` · ${t("buero.zahlen.richtwert")}` : ""}${wareneinsatzWarnung(z.quote) ? ` · ${t("zaehler.quoteHoch", Math.round(z.quote * 100))}` : ""}`, monatWert)}
        ${zeile({ aktion: "nav", wert: "vergleich" }, "chart-column", t("buero.zahlen.vergleich"), t("buero.zahlen.vergleichUnter"))}
        ${verkaufSichtbar(stand) ? zeile({ aktion: "nav", wert: "verkauf" }, "receipt", t("verkaeufe.einstieg"), t("verkaeufe.einstiegUnter")) : ""}
        ${zeile({ aktion: "nav", wert: "listen" }, "file-text", t("buero.zahlen.listen"), t("buero.zahlen.listenUnter"))}
        ${zeile({ aktion: "nav", wert: "hinweise" }, "lightbulb", t("hinweise.einstieg"), hinweiseAnzahl(stand) ? t("hinweise.einstiegNeu", hinweiseAnzahl(stand)) : t("hinweise.einstiegUnter"))}`, monatWert)}
      ${bereich("ware", "package", t("buero.abschnitt.ware"), ware?.text || (inv ? t("buero.zahlen.inventurUnter", datumLesbar(inv.datum)) : t("buero.zahlen.inventurNie")), bu?.ton === "rot", `
        ${zeile({ aktion: "nav", wert: "bestand" }, "package", t("bestand.einstieg"), bu?.text || t("bestand.einstiegUnter"))}
        ${zeile({ aktion: "nav", wert: "inventur" }, "clipboard-list", t("buero.zahlen.inventur"), inv ? t("buero.zahlen.inventurUnter", datumLesbar(inv.datum)) : t("buero.zahlen.inventurNie"))}
        ${zeile({ aktion: "nav", wert: "lieferanten" }, "truck", t("lieferanten.einstieg"), lieferUhrzeit(stand)?.text || t("lieferanten.einstiegUnter"))}
        ${zeile({ aktion: "bearbeiten", schritt: "preise" }, "shopping-cart", t("buero.karte.preise"), "")}
        ${zeile({ aktion: "nav", wert: "beleg" }, "camera", t("buero.karte.belege"), "")}
        ${zeile({ aktion: "nav", wert: "getraenke" }, "cup-soda", t("getraenke.einstieg"), "")}`)}
      ${bereich("karte", "utensils-crossed", t("buero.abschnitt.kartePreise"), karteSatz?.text || "", karteSatz?.ton === "rot", `
        ${zeile({ aktion: "nav", wert: "kartebuero" }, "utensils-crossed", t("menue.karte"), "")}
        ${zeile({ aktion: "bearbeiten", schritt: "rezepte" }, "chef-hat", t("buero.karte.rezepte"), "")}
        ${zeile({ aktion: "bearbeiten", schritt: "verkauf" }, "wallet", t("buero.karte.verkauf"), "")}
        ${zeile({ aktion: "nav", wert: "kartefoto" }, "file-text", t("buero.karte.kartefoto"), "")}
        ${zeile({ aktion: "nav", wert: "aktionen" }, "target", t("aktionen.einstieg"), haltbarUhrzeit(stand)?.text || aktionUhrzeit(stand)?.text || t("aktionen.einstiegUnter"))}
        ${zeile({ aktion: "nav", wert: "tafel" }, "tv", t("tafel.einstieg"), "")}`)}
      ${bereich("laden", "store", t("buero.abschnitt.einrichten"), `${t("buero.einrichten.einrichtung")} ${e.prozent} %`, false, `
        ${zeile(e.naechster ? e.naechster.ziel : { aktion: "nav", wert: "buero" }, "store", t("buero.einrichten.einrichtung"), "", `<span class="b-wert zahl">${e.prozent} %</span>`)}
        ${zeile({ aktion: "kuehl-einrichtung-oeffnen" }, "snowflake", t("buero.einrichten.kuehl"), "")}
        ${zeile({ aktion: "nav", wert: "kuehl" }, "clipboard-list", t("kuehl.blatt"), t("kuehl.blattKurz"))}
        ${zeile({ aktion: "nav", wert: "putzplan" }, "spray-can", t("buero.einrichten.putzplan"), "")}
        ${zeile({ aktion: "bearbeiten", schritt: "kosten-miete", bis: "kosten-sonstiges" }, "calculator", t("buero.karte.kosten"), "")}
        ${zeile({ aktion: "nav", wert: "laeden" }, "store", t("buero.einrichten.laeden"), "")}
        ${zeile({ aktion: "pin-setzen" }, "lock", t("buero.einrichten.code"), "", `<span class="b-wert ${codeAn ? "plus" : ""}">${esc(t(codeAn ? "buero.einrichten.codeAn" : "buero.einrichten.codeAus"))}</span>`)}
        `)}
      </div>
    </div></div>`;
}

// ---------- Aktionen ----------
// Rückgabe: false (nicht meine) | true (neu zeichnen) | { speichern: true, meldung? }
export async function bueroAktion() { return false; } // Code-Aktionen laufen über app.js (pin-setzen / pin-entfernen)
export function bueroEingabe() { return false; }
export const bueroCodeFeld = () => "";
