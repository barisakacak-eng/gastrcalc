// Etappe 3/5: die Listen (Schwund, Müll je Fraktion, Personalessen) und gemeinsame Helfer für Datum und Einträge.
// Die Eingabe selbst liegt seit Etappe 5 in muell.js (Müll) und umsatz.js (Tagesumsatz). Einträge werden nur angehängt; Rücknahme = storniert.
import { t } from "../i18n.js";
import { esc, parseZahl, fmtEuro, fmtZahl, heuteGeschaeft } from "../util.js"; // Paket 3 (16.10.2026), M7: Umsatz/Müll-Tag ist der Geschäftstag (bis 4 Uhr = Vortag)
import { eintragWert, schwundAuswertung, zeitraumTage, monatsZeitraum, schwundWertSetzen, SVEV_2026, sachbezugWert, schwundEintraege } from "../engine.js"; // Trennung 2 (17.10.2026): Sachbezug, Liste und Wert aus dem Rechenwerk
import { nav } from "./nav.js";
import { muellStornieren } from "../muell.js"; // Trennung (17.10.2026): Storno über das Rechenwerk
import { muellStatistikView } from "./muell.js"; // Drei Ebenen: Müll-Statistik wohnt im Büro unter Listen

let listenZeitraum = "woche"; // "woche" | "monat"
let tagDatum = null;          // gewählter Tag auf „Heute" (null = heute); Vergangenheit = Nacherfassung, gekennzeichnet
export const tagGewaehlt = () => tagDatum || heuteGeschaeft();
export function tagZuruecksetzen() { tagDatum = null; }

// Trennung 2 (17.10.2026): eintragName, eintragMenge, datumLesbar, monatName, tagLesbar, zeitKurz wohnen in js/anzeige_text.js
import { eintragName, eintragMenge, datumLesbar } from "../anzeige_text.js";
export { eintragName, eintragMenge, datumLesbar, monatName, tagLesbar, zeitKurz } from "../anzeige_text.js";
// Was ein Eintrag „wert" ist: Vorgang 1 zum Einkaufspreis, Personalessen zum Sachbezugswert (mit Wareneinsatz als Nebensatz), Eigenverbrauch zum Wareneinsatz.
function eintragBetrag(e, stand) {
  const waren = eintragWert(e, stand); // Trennung 2 (17.10.2026)
  if (e.wertOffen && waren === null && !e.storniert) return `<span class="packung"><input inputmode="decimal" data-f="wert:${esc(e.id)}" placeholder="${esc(t("tag.wertNachtragen"))}" aria-label="${esc(t("tag.wertNachtragen"))}"><span class="einheit">€</span></span>`;
  if (e.art === "personal") return `<b>${fmtEuro(sachbezugWert(e.menge, e.mahlzeit), { dezimal: 2 })}</b><small class="marke">${esc(t("tag.sachbezug"))}${waren !== null ? ` · ${esc(t("tag.warenKurz"))} ${fmtEuro(waren, { dezimal: 2 })}` : ""}</small>`;
  return `<b>${waren === null ? `<span class="marke offen">${esc(t("tag.keinPreis"))}</span>` : fmtEuro(waren, { dezimal: 2 })}</b>`;
}

export function listenView(stand) {
  const z = listenZeitraum === "monat" ? monatsZeitraum() : zeitraumTage(7);
  const a = schwundAuswertung(stand, z);
  const eintraege = schwundEintraege(stand, z);
  return `
    <div class="kopfband"><h1>${esc(t("listen.titel"))}</h1><div class="unter">${esc(stand.betrieb.name)}</div></div>
    <div class="inhalt">
      ${muellStatistikView(stand)}
      <div class="chips"><button type="button" class="chip ${listenZeitraum === "woche" ? "an" : ""}" data-a="listen-zeitraum" data-wert="woche">${esc(t("listen.woche"))}</button><button type="button" class="chip ${listenZeitraum === "monat" ? "an" : ""}" data-a="listen-zeitraum" data-wert="monat">${esc(t("listen.monat"))}</button></div>
      <div class="karte">
        <h2>${esc(t("listen.muell"))}</h2>
        <div class="gross">${fmtEuro(a.muellwert, { dezimal: 2 })}</div>
        ${a.portionen !== null ? `<div class="hinweis">${esc(t("listen.portionen", fmtZahl(a.portionen, a.portionen < 10 ? 1 : 0), fmtEuro(a.dbJePortion, { dezimal: 2 })))}</div>` : `<div class="hinweis">${esc(t("listen.portionenFehlen"))}</div>`}
        ${a.ohneWert ? `<span class="marke offen">${esc(t("listen.ohneWert", a.ohneWert))}</span>` : ""}
        ${Object.keys(a.jeArt).map((k) => `<div class="summenzeile"><span>${esc(t("tag.arten." + k))}</span><span class="wert">${fmtEuro(a.jeArt[k], { dezimal: 2 })}</span></div>`).join("")}
      </div>
      <div class="karte">
        <h2>${esc(t("listen.fraktionen"))}</h2>
        ${Object.keys(a.jeFraktion).length ? Object.keys(a.jeFraktion).map((k) => `<div class="summenzeile"><span>${esc(t("tag.fraktionen." + k))} <span class="marke">(${a.jeFraktion[k].anzahl})</span></span><span class="wert">${fmtEuro(a.jeFraktion[k].wert, { dezimal: 2 })}</span></div>`).join("") : `<div class="hinweis">${esc(t("listen.leer"))}</div>`}
      </div>
      <div class="karte">
        <h2>${esc(t("listen.personal"))}</h2>
        <div class="summenzeile"><span>${esc(t("listen.personalAnzahl"))}</span><span class="wert">${fmtZahl(a.personal.anzahl)}</span></div>
        <div class="summenzeile"><span>${esc(t("listen.personalSvev"))}</span><span class="wert">${fmtEuro(a.personal.svev, { dezimal: 2 })}</span></div>
        <div class="summenzeile"><span>${esc(t("listen.personalWaren"))}</span><span class="wert">${fmtEuro(a.personal.waren, { dezimal: 2 })}</span></div>
        <span class="marke">${esc(t("listen.svevStand", fmtEuro(SVEV_2026.tag, { dezimal: 2 })))}</span>
        ${a.eigen.anzahl ? `<div class="summenzeile"><span>${esc(t("listen.eigen"))}</span><span class="wert">${fmtZahl(a.eigen.anzahl)} · ${fmtEuro(a.eigen.waren, { dezimal: 2 })}</span></div><span class="marke">${esc(t("listen.eigenHinweis"))}</span>` : ""}
      </div>
      <div class="karte">
        <h2>${esc(t("listen.schwundliste"))}</h2>
        ${eintraege.length ? `<div class="liste eng">${eintraege.map((e) => `<div class="zeile ${e.storniert ? "storno" : ""}"><div class="oben"><div class="name">${esc(datumLesbar(e.datum))}<small>${esc(eintragText(e, stand))}</small></div><div style="text-align:right">${eintragBetrag(e, stand)}${e.storniert ? "" : `<button type="button" class="leise klein" data-a="schwund-storno" data-id="${esc(e.id)}">${esc(t("muell.rueckgaengig"))}</button>`}</div></div></div>`).join("")}</div>` : `<div class="hinweis">${esc(t("listen.leer"))}</div>`}
        <span class="marke">${esc(t("listen.amtHinweis"))}</span>
      </div>
    </div>
    ${nav("umsatz")}`;
}

function eintragText(e, stand) {
  const name = eintragName(e, stand); const menge = eintragMenge(e);
  return `${t("tag.arten." + e.art)}${e.art === "eimer" ? "" : ` · ${name}`} · ${menge}${e.storniert ? ` · ${t("tag.storniert")}` : ""}`;
}

// ---------- Aktionen und Eingaben (von app.js aufgerufen) ----------
export function tagAktion(name, el, stand) {
  if (name === "tag-datum") { tagDatum = el.dataset.wert === heuteGeschaeft() ? null : el.dataset.wert; return true; }
  if (name === "listen-zeitraum") { listenZeitraum = el.dataset.wert; return true; }
  if (name === "schwund-storno") {
    const e = stand.schwund.find((x) => x.id === el.dataset.id); if (!e || e.storniert) return false;
    if (!confirm(t("tag.stornoFrage"))) return false;
    return muellStornieren(stand, e.id) > 0; // nie löschen, nur kennzeichnen
  }
  return false;
}

// Wert eines offenen Schwund-Eintrags nachtragen – beim Verlassen des Feldes, einmalig.
export function tagWertUebernehmen(feld, wert, stand) {
  if (!feld.startsWith("wert:")) return false;
  const e = stand.schwund.find((x) => x.id === feld.slice(5)); const n = parseZahl(wert);
  if (e && n !== null && n > 0) return schwundWertSetzen(e, n);
  return false;
}
