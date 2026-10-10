// Etappe 3: „Läden" – alle Betriebe auf diesem Handy, Wechsel, neuer Laden, und die Übersicht für den Eigentümer.
// Keine Ampel auf Umsatz und Abfall: dafür gibt es noch keine belegte Schwelle (offener Punkt im Protokoll). Nur Zahlen nebeneinander.
// Alles rechnet nur mit dem, was auf diesem Gerät liegt. Zahlen anderer Handys kommen über die Sicherungsdatei (Einlesen = Zusammenführen).
import { t } from "../i18n.js";
import { esc, fmtEuro, fmtZahl } from "../util.js";
import { ladenUebersicht } from "../engine.js";
import { nav } from "./nav.js";

export function laedenView(wurzel) {
  const ue = wurzel.betriebe.map(ladenUebersicht);
  const fertig = ue.filter((u) => u.eingerichtet);
  const summe = fertig.reduce((s, u) => ({ umsatz: s.umsatz + u.umsatz7, soll: s.soll + u.soll7, abfall: s.abfall + u.abfall7, last: s.last + u.last.gesamt,
    tage: s.tage + (u.tageMitUmsatz ? 1 : 0), ohneWert: s.ohneWert + u.ohneWert7,
    portionen: u.portionen7 === null ? s.portionen : (s.portionen || 0) + u.portionen7 }), { umsatz: 0, soll: 0, abfall: 0, last: 0, tage: 0, ohneWert: 0, portionen: null });
  // Keine Abfallquote: Umsatz ist brutto, Abfall netto zum Einkaufspreis, und nicht jeder Laden trägt beides ein – die Zahl wäre nicht belastbar.
  return `
    <div class="kopfband"><h1>${esc(t("laeden.titel"))}</h1><div class="unter">${esc(t("laeden.unter", wurzel.betriebe.length))}</div></div>
    <div class="inhalt">
      ${fertig.length > 1 ? `
      <div class="karte dunkel">
        <h2>${esc(t("laeden.alle"))}</h2>
        <div class="zahlenraster">
          <div><small>${esc(t("laeden.umsatz7"))}</small><b>${summe.tage ? fmtEuro(summe.umsatz) : "–"}</b></div>
          <div><small>${esc(t("laeden.soll7"))}</small><b>${fmtEuro(summe.soll)}</b></div>
          <div><small>${esc(t("laeden.abfall7"))}</small><b>${fmtEuro(summe.abfall, { dezimal: 2 })}</b></div>
          <div><small>${esc(t("laeden.portionen"))}</small><b>${summe.portionen === null ? "–" : "≈ " + fmtZahl(summe.portionen, summe.portionen < 10 ? 1 : 0)}</b></div>
        </div>
        <span class="marke hell">${esc(t("laeden.alleHinweis", summe.tage, fertig.length))}${summe.ohneWert ? ` · ${esc(t("listen.ohneWert", summe.ohneWert))}` : ""}</span>
      </div>` : ""}
      <div class="liste">
        ${ue.map((u) => ladenKarte(u, u.id === wurzel.aktiv)).join("")}
      </div>
      <button type="button" class="knopf zweit" data-a="laden-neu">${esc(t("laeden.neu"))}</button>
      <p class="hinweis">${esc(t("laeden.hinweis"))}</p>
    </div>
    ${nav("laeden")}`;
}

function ladenKarte(u, aktiv) {
  const unter = [u.format ? t("format." + u.format)[0] : "", ...u.kuechen.map((k) => t("kueche." + k))].filter(Boolean).join(", ");
  return `
    <div class="karte laden ${aktiv ? "aktiv" : ""}">
      <div class="oben">
        <div><div class="name">${esc(u.name || t("start.hallo", ""))}${aktiv ? ` <span class="abzeichen">${esc(t("laeden.aktiv"))}</span>` : ""}</div><small>${esc(unter)}</small></div>
        ${aktiv ? "" : `<button type="button" class="knopf schmal" data-a="laden-wechseln" data-id="${esc(u.id)}">${esc(t("laeden.oeffnen"))}</button>`}
      </div>
      ${u.eingerichtet ? `
      <div class="zahlenraster">
        <div><small>${esc(t("laeden.umsatz7"))}</small><b>${u.tageMitUmsatz ? fmtEuro(u.umsatz7) : "–"}</b><small>${esc(t("laeden.sollKurz"))} ${fmtEuro(u.soll7)}</small></div>
        <div><small>${esc(t("laeden.abfall7"))}</small><b>${u.eintraege7 ? fmtEuro(u.abfall7, { dezimal: 2 }) : "–"}</b><small>${u.portionen7 !== null && u.eintraege7 ? esc(t("laeden.portionenKurz", fmtZahl(u.portionen7, u.portionen7 < 10 ? 1 : 0))) : u.ohneWert7 ? esc(t("listen.ohneWert", u.ohneWert7)) : ""}</small></div>
        <div><small>${esc(t("laeden.karte"))}</small>${u.ampel ? `<b class="ampelmini"><span class="gruen">${u.ampel.gruen}</span><span class="gelb">${u.ampel.gelb}</span><span class="rot">${u.ampel.rot}</span>${u.ampel.grau ? `<span class="grau">${u.ampel.grau}</span>` : ""}</b>` : `<b>–</b>`}<small>${esc(t("laeden.gerichte", u.gerichte))}</small></div>
        <div><small>${esc(t("laeden.last"))}</small><b>${fmtEuro(u.last.gesamt)}</b><small>${u.offen ? esc(t("laeden.offen", u.offen)) : esc(t("start.offenLeer"))}</small></div>
      </div>` : `<div class="hinweis">${esc(t("laeden.nichtFertig"))}</div>`}
    </div>`;
}
