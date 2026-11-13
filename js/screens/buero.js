// Büro – Startseite (Drei Ebenen, 15.10.2026, Vorschau-Rahmen „Büro“): alles Rechnen, Einrichten und Abgeben an einem Ort.
// Blöcke: Offen (Chips, statt Meldungen im Laden) · Ordner zum Abgeben · Zahlen · Karte & Einkauf · Laden einrichten.
// Büro-Code: ein Code für alles (modus.js, wurzel.bueroPin, Zifferntastatur in ebene.js) – er schützt den Eintritt ins Büro, nicht diese Seite. Optik: css/buero.css (Klassen mit „b-“).
import { t } from "../i18n.js";
import { bsym, bueroKopf } from "./buero_kopf.js"; // Kopf und Symbole liegen in einer eigenen kleinen Datei (Einstellungen brauchen sie im Laden)
export { bsym, bueroKopf };
const kopf = bueroKopf;
import { esc, fmtEuro, fmtZahl, heute, heuteGeschaeft } from "../util.js";
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
import { aktionUhrzeit } from "../aktion_plan.js";
import { heuteZiel } from "../laden_zahlen.js"; // Masterauftrag 0.1: Büro-Start zeigt dieselbe Hauptzahl wie Heute
import { mindestlohnKarteZeigen } from "../mindestlohn.js"; // Masterauftrag 1.1
import { preisDrift } from "../preisdrift.js"; // Masterauftrag 1.4
import { HEBEL_MIN_EURO } from "../hebel.js"; // Setzung: unter 1 € im Monat keine Karte
import { fmtEuroGeschaetzt } from "../util.js"; // Aktion planen (18.10.2026): Satz zur laufenden Aktion


// Trennung (17.10.2026): Ring und zielAttr wohnen in ./bausteine.js (Büro-Ausgabe wie bisher: zielAttr ohne anker/offen)
const ring = bueroRing;
const zielAttr = (z) => zielAttrAlle(z, { zusatz: false });

// ---------- Kopf ----------

export function bueroView(stand, wurzel, extra = {}) {
  const H = heute();
  const offen = offenImBuero(stand, wurzel, { aktualisierung: !!extra.aktualisierung }); // W2-D: Update-Hinweis als Chip
  const bel = belehrungen(stand, { datum: H });
  if (bel.zaehl.bald + bel.zaehl.ueberfaellig) offen.push({ id: "belehrung", text: t("buero.offen.belehrung", bel.zaehl.bald + bel.zaehl.ueberfaellig), farbe: bel.zaehl.ueberfaellig ? "rot" : "gelb", ziel: { aktion: "nav", wert: "ordner-amt" } });
  const chip = (o) => `<button type="button" class="b-chip" ${zielAttr(o.ziel)}>${typeof o.prozent === "number" ? ring(o.prozent) : `<i class="b-punkt ${o.farbe === "rot" ? "rot" : "gelb"}" aria-hidden="true"></i>`}<span>${esc(o.text)}${typeof o.prozent === "number" ? ` <b class="zahl">${o.prozent} %</b>` : ""}</span></button>`;
  const k = ordnerKachelStand(stand, { datum: H });
  // Büro ruhig (Baris 26.10.2026 23:56, Zwiebel + Uhrwerk): eine einheitliche Liste, eine Farbe, Status als leiser Satz.
  const ordnerZeile = (id, symbol, s) => `<button type="button" class="b-zeile" data-a="nav" data-wert="ordner-${id}"><span class="b-zs">${bsym(symbol)}</span><span class="b-zt"><b>${esc(t(`ordner.${id}.kachel`))}</b><small class="${s.farbe === "rot" ? "rot" : ""}">${esc(s.text)}</small></span>${bsym("chevron-right", "b-pfeil")}</button>`;
  const kachel = (id, symbol, s) => `<button type="button" class="karte b-ordnerkachel" data-a="nav" data-wert="ordner-${id}"><span class="b-ks ${id}">${bsym(symbol)}</span><b>${esc(t(`ordner.${id}.kachel`))}</b><small><i class="b-punkt ${s.farbe}" aria-hidden="true"></i>${esc(s.text)}</small></button>`;
  const HG = heuteGeschaeft(); const z = zaehlerImTakt(stand, HG); // K1 Runde 2 (01.11.2026): Monatsname zur Geld-Zeile nach Geschäftstag, sonst steht nach Mitternacht „November“ über Oktober-Zahlen // W2-D; Paket 3, M7: Zähler nach Geschäftstag, Belehrungen/Ordner (H) nach Kalender
  const inv = inventurenFertig(stand).pop();
  const zeile = (ziel, symbol, titel, unter, wert = "") => `<button type="button" class="b-zeile" ${zielAttr(ziel)}><span class="b-zs">${bsym(symbol)}</span><span class="b-zt"><b>${esc(titel)}</b>${unter ? `<small>${esc(unter)}</small>` : ""}</span>${wert}${bsym("chevron-right", "b-pfeil")}</button>`;
  const monatWert = z.keinUmsatz ? "" : `<span class="b-wert zahl ${z.stand >= 0 ? "plus" : "minus"}" title="${esc(t("gehirn.ausblick"))}" aria-label="${esc(t("gehirn.ausblick"))}">${z.stand >= 0 ? "+ " : "− "}${esc(fmtEuro(Math.abs(z.stand)))}</span>`;
  const e = einrichtungImTakt(stand, wurzel); // W2-D
  const codeAn = pinGesetzt(wurzel);
  // Entrümpelung Punkt 3 (19.10.2026, freigegeben 18.10.): 3 Ordner + 4 Bereiche statt 27 Einträge. Jeder Bereich zeigt nur seine „Uhrzeit“,
  // aufgeklappt (details/summary, ohne eigenen Zustand) alle Wege wie bisher. Oben nur der wichtigste offene Punkt, der Rest hinter „+ n“.
  const bu = bestandUhrzeit(stand); const ware = bu || lieferUhrzeit(stand);
  const karteSatz = haltbarUhrzeit(stand) || aktionUhrzeit(stand);
  const bereich = (id, symbol, titel, satz, rot, inhalt, wert = "") => `<details class="b-bereich" data-bereich="${id}"><summary class="b-zeile b-bereichkopf"><span class="b-zs">${bsym(symbol)}</span><span class="b-zt"><b>${esc(titel)}</b>${satz ? `<small class="${rot ? "rot" : ""}">${esc(satz)}</small>` : ""}</span>${wert}${bsym("chevron-right", "b-pfeil")}</summary><div class="karte b-liste">${inhalt}</div></details>`;
  const [erster, ...rest] = offen;
  // Masterauftrag „Gehirn“ 0.1 (28.10.2026): eine Wahrheit – oben steht dieselbe Zahl wie auf Heute; das Monatsergebnis ist „Ausblick“.
  let hz = null; try { hz = heuteZiel(stand, z, HG); } catch { hz = null; }
  const hauptzahl = !hz ? "" : hz.fehlt
    ? `<button type="button" class="karte b-hauptzahl" ${zielAttr(hz.fehlt === "miete" ? { aktion: "bearbeiten", schritt: "kosten-miete", bis: "kosten-miete" } : { aktion: "bearbeiten", schritt: "lohn" })} aria-label="${esc(t("nutzen.stufe.bisNull"))}"><b>?</b><span class="b-hauptzahl-knopf">${esc(t("heute.fehlt." + hz.fehlt))}</span></button>`
    : hz.zahl === null ? "" : `<button type="button" class="karte b-hauptzahl" data-a="nav" data-wert="umsatz"><small>${esc(t("nutzen.stufe." + hz.stufe))} · ${esc(monatName(HG))}</small><b class="zahl">${esc((hz.m.geschaetzt ? "≈ " : "") + (hz.stufe === "ueberZiel" ? "+" : "") + fmtEuro(hz.zahl))}</b></button>`;
  // Masterauftrag 1.1: Mindestlohn-Karte ≈ 3 Monate vorher bis 1 Monat danach, nur mit Wirkung
  let ml = null; try { ml = mindestlohnKarteZeigen(stand, HG); } catch { ml = null; }
  const mlDatum = ml ? datumLesbar(ml.ab) : "";
  const mindestlohnKarte = !ml ? "" : `<div class="karte b-mindestlohn">
      <b>${esc(t(ml.seit ? "gehirn.mindestlohn.titelSeit" : "gehirn.mindestlohn.titel", mlDatum, fmtEuro(ml.neu, { dezimal: 2 })))}</b>
      <p>${esc(t("gehirn.mindestlohn.satz", fmtEuro(ml.mehrMonat), fmtEuro(ml.umsatzMehrMonat)))}</p>
      ${ml.grundlage === "team" ? `<small>${esc(t("gehirn.mindestlohn.annahme"))}</small>` : ""}${ml.offen ? `<small>${esc(t("gehirn.mindestlohn.offen", ml.offen))}</small>` : ""}
      <button type="button" class="knopf zweit" data-a="nav" data-wert="preisrunde">${esc(t("gehirn.mindestlohn.knopf"))}</button>
      <small class="b-quelle">${esc(t("gehirn.mindestlohn.quelle"))}</small>
    </div>`;
  // Masterauftrag 1.4: Preisdrift – die teuerste Preiserhöhung einer Zutat in Euro im Monat; nur eine Karte oben (Mindestlohn hat Vorrang)
  let dr = null; if (!ml) { try { dr = preisDrift(stand, { datum: HG }); } catch { dr = null; } }
  const dz = dr?.zutaten.find((x) => x.prozent > 0 && x.euroMonat >= HEBEL_MIN_EURO); const dg = dr?.gerutscht[0];
  const driftKarte = !dz ? "" : `<div class="karte b-mindestlohn b-drift">
      <b>${esc(t("gehirn.drift.titel", dz.name, "+" + fmtZahl(dz.prozent * 100, 0) + " %"))}</b>
      <p>${esc(t("gehirn.drift.satz", fmtEuroGeschaetzt(dz.euroMonat, true)))}</p>
      ${dg ? `<p class="minus">${esc(t("gehirn.drift.rot", dg.name, fmtEuroGeschaetzt(dg.zielBrutto, dg.geschaetzt, { dezimal: 2 })))}</p>` : ""}
      <button type="button" class="knopf zweit" data-a="nav" data-wert="preisrunde"${dg ? ` data-id="${esc(dg.id)}" data-cent="${Math.max(10, Math.ceil(((dg.zielBrutto || 0) - (dg.preisBrutto || 0)) * 10) * 10)}"` : ""}>${esc(t("gehirn.drift.knopf"))}</button>
    </div>`;
  return `<div class="buero b-ruhig">${kopf({ ziel: "start", text: t("buero.zurueck") }, t("buero.titel"))}
    <div class="b-inhalt">
      ${erster ? `<button type="button" class="zeki-zeile b-zeki ${erster.farbe === "rot" ? "a-rot" : ""}" ${zielAttr(erster.ziel)}>${esc(erster.text)}</button>${rest.length ? `<details class="b-offen-mehr"><summary class="b-mehr-zeile">${esc(t("buero.ruhig.mehr", rest.length))}</summary><div class="b-offen">${rest.map(chip).join("")}</div></details>` : ""}` : ""}
      ${hauptzahl}${mindestlohnKarte}${driftKarte}
      <div class="b-gruppe" aria-hidden="true"></div>
      <div class="karte b-liste b-ordnerliste">${ordnerZeile("amt", "shield-check", k.amt)}${ordnerZeile("steuer", "calculator", k.steuer)}${ordnerZeile("buch", "receipt", k.buch)}</div>
      <div class="b-gruppe" aria-hidden="true"></div>
      <div class="b-bereiche">
      ${bereich("geld", "trending-up", t("buero.abschnitt.geld"), t("buero.zahlen.monatUnter", monatName(HG)), false, `
        ${zeile({ aktion: "nav", wert: "umsatz" }, "trending-up", t("buero.zahlen.monat"), `${t("buero.zahlen.monatUnter", monatName(HG))}${z.quoteQuelle === "richtwert" || z.quoteRichtpreis ? ` · ${t("buero.zahlen.richtwert")}` : ""}${wareneinsatzWarnung(z.quote) ? ` · ${t("zaehler.quoteHoch", Math.round(z.quote * 100))}` : ""}`, monatWert)}
        ${zeile({ aktion: "nav", wert: "vergleich" }, "chart-column", t("buero.zahlen.vergleich"), t("buero.zahlen.vergleichUnter"))}
        ${verkaufSichtbar(stand) ? zeile({ aktion: "nav", wert: "verkauf" }, "receipt", t("verkaeufe.einstieg"), t("verkaeufe.einstiegUnter")) : ""}
        ${zeile({ aktion: "nav", wert: "listen" }, "file-text", t("buero.zahlen.listen"), t("buero.zahlen.listenUnter"))}
        ${zeile({ aktion: "nav", wert: "hinweise" }, "lightbulb", t("hinweise.einstieg"), hinweiseAnzahl(stand) ? t("hinweise.einstiegNeu", hinweiseAnzahl(stand)) : t("hinweise.einstiegUnter"))}
        ${zeile({ aktion: "nav", wert: "geld3" }, "wallet", t("w3.titel"), "")}`, monatWert)}
      ${bereich("ware", "package", t("buero.abschnitt.ware"), ware?.text || (inv ? t("buero.zahlen.inventurUnter", datumLesbar(inv.datum)) : t("buero.zahlen.inventurNie")), bu?.ton === "rot", `
        ${zeile({ aktion: "nav", wert: "ware" }, "scale", t("gehirn.ware.titel"), "")}
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
        ${zeile({ aktion: "kuehl-blatt-oeffnen" }, "clipboard-list", t("kuehl.blatt"), t("kuehl.blattKurz"))}
        ${zeile({ aktion: "nav", wert: "putzplan" }, "spray-can", t("buero.einrichten.putzplan"), "")}
        ${zeile({ aktion: "bearbeiten", schritt: "kosten-miete", bis: "kosten-sonstiges" }, "calculator", t("buero.karte.kosten"), "")}
        ${zeile({ aktion: "nav", wert: "laeden" }, "store", t("buero.einrichten.laeden"), "")}
        ${zeile({ aktion: "pin-setzen" }, "lock", t("buero.einrichten.code"), "", `<span class="b-wert ${codeAn ? "plus" : ""}">${esc(t(codeAn ? "buero.einrichten.codeAn" : "buero.einrichten.codeAus"))}</span>`)}
        `)}
      </div>
      <div class="b-werkzeuge b-leise">
        ${zeile({ aktion: "nav", wert: "einstellungen" }, "settings", t("buero.einrichten.einstellungen"), "")}
        ${zeile({ aktion: "export" }, "download", t("buero.einrichten.sicherung"), "")}
      </div>
    </div></div>`;
}

// ---------- Aktionen ----------
// Rückgabe: false (nicht meine) | true (neu zeichnen) | { speichern: true, meldung? }
export async function bueroAktion() { return false; } // Code-Aktionen laufen über app.js (pin-setzen / pin-entfernen)
export function bueroEingabe() { return false; }
