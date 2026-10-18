// Etappe 3: „Läden" – alle Betriebe auf diesem Handy, Wechsel, neuer Laden, und die Übersicht für den Eigentümer.
// Eigentümer-Ebene (18.10.2026): oben ein Satz (Pflichten vor Geld vor Lager), dann Zeitraum (7 Tage, Monat, frei), je Laden eine Karte
// mit Kennzahlen, Pflichten, Rang und Trend; Tipp auf die Karte wechselt den Laden. Bericht als Druck (wie die Ordner) und CSV.
// Rechnet nichts selbst: alles aus js/eigentuemer.js (rein). Nur vorhandene CSS-Klassen. Nur im Büro erreichbar (modus.js), Personal gesperrt.
// Keine Ampel auf Umsatz und Abfall: dafür gibt es noch keine belegte Schwelle (offener Punkt im Protokoll). Nur Zahlen nebeneinander.
// Alles rechnet nur mit dem, was auf diesem Gerät liegt. Zahlen anderer Handys kommen über die Sicherungsdatei (Einlesen = Zusammenführen).
import { t } from "../i18n.js";
import { esc, fmtEuro, fmtZahl } from "../util.js";
import { ladenUebersicht } from "../engine.js";
import { datumDe } from "../export_steuer.js";
import { eigentuemerUebersicht, ladenZellen, rangText, trendText, eigentuemerHtml, eigentuemerCsv } from "../eigentuemer.js";
import { nav } from "./nav.js";
import { dateienTeilen } from "./bausteine.js";
import { drucken } from "./ordner.js";

// ---------- Zustand ----------
let zeit = { art: "woche", von: null, bis: null }; // Zeitraum-Wahl der Eigentümer-Ebene (Modulzustand, kein Laden-Datum)
export function laedenZuruecksetzen() { zeit = { art: "woche", von: null, bis: null }; }

export function laedenView(wurzel) {
  const ue = eigentuemerUebersicht(wurzel, zeit);
  const z = ue.zeitraum;
  const aktiv = wurzel.betriebe.find((b) => b.id === wurzel.aktiv);
  const uebrige = wurzel.betriebe.filter((b) => ue.uebrige.includes(b.id)).map(ladenUebersicht);
  const seg = (art, text) => `<button type="button" class="${z.art === art ? "an" : ""}" data-a="eig-zeit" data-wert="${art}" aria-pressed="${z.art === art}">${esc(text)}</button>`;
  const ton = ue.satz ? (ue.satz.ton === "rot" ? "hinweisrot" : ue.satz.ton === "gelb" ? "hinweisgelb" : "gruenrand") : "";
  const s = ue.summe;
  return `
    <div class="kopfband"><h1>${esc(t("laeden.titel"))}</h1><div class="unter">${esc(t("laeden.unter", wurzel.betriebe.length))}</div></div>
    <div class="inhalt">
      ${ue.satz ? `<div class="karte ${ton}" ${ue.satz.ziel ? `data-a="laden-wechseln" data-id="${esc(ue.satz.ziel.id)}" role="button"` : ""} data-eig-satz="${esc(ue.satz.art)}"><b>${esc(ue.satz.text)}</b></div>` : ""}
      ${ue.laeden.length ? `
      <div class="seg klein" role="group" aria-label="${esc(t("eigentuemer.titel"))}">${seg("woche", t("eigentuemer.zeit.woche"))}${seg("monat", t("eigentuemer.zeit.monat"))}${seg("frei", t("eigentuemer.zeit.frei"))}</div>
      ${z.art === "frei" ? `<div class="b-frei"><label><span>${esc(t("eigentuemer.zeit.von"))}</span><input type="date" class="textfeld" data-f="eig-von" value="${esc(z.von)}" max="${esc(z.bis)}"></label><label><span>${esc(t("eigentuemer.zeit.bis"))}</span><input type="date" class="textfeld" data-f="eig-bis" value="${esc(z.bis)}"></label></div>` : ""}
      ${s.laeden > 1 ? `
      <div class="karte dunkel">
        <h2>${esc(z.art === "woche" ? t("laeden.alle") : `${t("eigentuemer.titel")} · ${datumDe(z.von)} – ${datumDe(z.bis)}`)}</h2>
        <div class="zahlenraster">
          <div><small>${esc(t("eigentuemer.kennzahl.umsatz"))}</small><b>${s.umsatzLaeden ? fmtEuro(s.umsatz) : "–"}</b></div>
          <div><small>${esc(t("eigentuemer.kennzahl.muell"))}</small><b>${fmtEuro(s.muell, { dezimal: 2 })}</b></div>
          <div><small>${esc(t("eigentuemer.kennzahl.pflichten"))}</small><b>${s.pflichten}</b></div>
          <div><small>${esc(t("laeden.portionen"))}</small><b>${portionenSumme(ue.laeden)}</b></div>
        </div>
        <span class="marke hell">${esc(t("laeden.alleHinweis", s.umsatzLaeden, s.laeden))}</span>
      </div>` : ""}
      <div class="liste">
        ${ue.laeden.map((l) => eigKarte(l, ue, l.id === wurzel.aktiv)).join("")}
        ${uebrige.map((u) => ladenKarte(u, u.id === wurzel.aktiv)).join("")}
      </div>
      ${ue.laeden.length > 1 ? "" : `<p class="hinweis">${esc(t("eigentuemer.vergleichAb"))}</p>`}
      <div class="dreier"><button type="button" class="knopf zweit" data-a="eig-druck">${esc(t("eigentuemer.drucken"))}</button><button type="button" class="knopf zweit" data-a="eig-csv">${esc(t("eigentuemer.csv"))}</button></div>` : `
      <div class="liste">${uebrige.map((u) => ladenKarte(u, u.id === wurzel.aktiv)).join("")}</div>`}
      <button type="button" class="knopf zweit" data-a="laden-neu">${esc(t("laeden.neu"))}</button>
      <p class="hinweis">${esc(t("laeden.hinweis"))}</p>
      ${aktiv?.beispiel ? `<button type="button" class="knopf weich warn" data-a="beispiel-loeschen">${esc(t("beispiel.loeschen"))}</button>` // Beispiel-Laden (17.10.2026)
        : `<button type="button" class="knopf zweit" data-a="beispiel-anlegen">${esc(t("beispiel.anlegen"))}</button><p class="hinweis">${esc(t("beispiel.satz"))}</p>`}
    </div>
    ${nav("laeden")}`;
}

function portionenSumme(laeden) {
  const mit = laeden.filter((l) => !l.beispiel && l.muell.portionen !== null);
  if (!mit.length) return "–";
  const p = mit.reduce((a, l) => a + l.muell.portionen, 0);
  return "≈ " + fmtZahl(p, p < 10 ? 1 : 0);
}

// Eigentümer-Karte: Kennzahlen des Zeitraums, Rang je Kennzahl, Trend, Pflichten, Vollständigkeit. Tipp = Laden wechseln.
function eigKarte(l, ue, aktiv) {
  const c = ladenZellen(l); const v = ue.vergleich; const tr = l.trend;
  const feld = (titel, wert, unter) => `<div><small>${esc(titel)}</small><b>${esc(wert)}</b>${unter ? `<small>${esc(unter)}</small>` : ""}</div>`;
  const mehrere = ue.laeden.length > 1;
  const rang = (kz) => (mehrere && v[kz].je[l.id]?.grund !== "zuWenig" ? rangText(v, kz, l.id) : ""); // „Vergleich ab zwei Läden“ steht einmal unter der Liste, nicht in jeder Zelle
  const zeile = [c.pflichten, l.personal.anzahl ? `${t("eigentuemer.kennzahl.personal")} ${c.personal}` : "", c.aktionen, l.aktionen.satz || ""].filter(Boolean).join(" · ");
  return `
    <div class="karte laden ${aktiv ? "aktiv" : ""}" ${aktiv ? "" : `data-a="laden-wechseln" data-id="${esc(l.id)}" role="button"`} data-eig-laden="${esc(l.id)}">
      <div class="oben">
        <div><div class="name">${esc(l.name)}${aktiv ? ` <span class="abzeichen">${esc(t("laeden.aktiv"))}</span>` : ""}${l.beispiel ? ` <span class="abzeichen">${esc(t("eigentuemer.beispiel"))}</span>` : ""}</div><small>${esc(c.umsatzTage)}</small></div>
        ${aktiv ? "" : `<button type="button" class="knopf schmal" data-a="laden-wechseln" data-id="${esc(l.id)}">${esc(t("laeden.oeffnen"))}</button>`}
      </div>
      <div class="zahlenraster">
        ${feld(t("eigentuemer.kennzahl.umsatz"), c.umsatz, [rang("umsatz"), trendText(tr?.umsatz)].filter(Boolean).join(" · "))}
        ${feld(t("eigentuemer.kennzahl.ware"), c.ware, [c.wareQuelle, rang("ware")].filter(Boolean).join(" · "))}
        ${feld(t("eigentuemer.kennzahl.muell"), c.muell, [c.muellPortionen, rang("muell"), trendText(tr?.muell)].filter(Boolean).join(" · "))}
        ${feld(t("eigentuemer.kennzahl.schwund"), c.schwund, c.schwundZeitraum)}
        ${feld(t("eigentuemer.kennzahl.bisNull"), c.bisNull, rang("bisNull"))}
        ${feld(t("eigentuemer.kennzahl.lager"), c.lager, c.bestellen)}
      </div>
      <div class="hinweis">${esc(zeile)}</div>
      ${c.fehlt ? `<span class="marke geschaetzt">${esc(c.fehlt)}</span>` : ""}
    </div>`;
}

// Karte eines Ladens außerhalb der Eigentümer-Ebene (nicht eingerichtet; der Beispiel-Laden neben eigenen Läden mit Daten)
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

// ---------- Aktionen und Eingaben ----------
// Rückgabe: false | true (neu zeichnen) | { meldung }
export async function laedenAktion(name, el, wurzel) {
  if (name === "eig-zeit") { const z = eigentuemerUebersicht(wurzel, zeit).zeitraum; zeit = { art: el.dataset.wert, von: zeit.von || z.von, bis: zeit.bis || z.bis }; return true; }
  if (name === "eig-druck") { drucken(eigentuemerHtml(eigentuemerUebersicht(wurzel, zeit))); return { meldung: t("ordner.knopf.druckHinweis") }; }
  if (name === "eig-csv") { const d = eigentuemerCsv(eigentuemerUebersicht(wurzel, zeit)); const r = await dateienTeilen([d], t("eigentuemer.bericht")); return r === "abgebrochen" ? false : { meldung: t("eigentuemer.geteilt") }; }
  return false;
}
export function laedenEingabe(feld, wert) {
  if ((feld === "eig-von" || feld === "eig-bis") && /^\d{4}-\d{2}-\d{2}$/.test(wert)) { zeit = { ...zeit, art: "frei", [feld === "eig-von" ? "von" : "bis"]: wert }; return true; }
  return false;
}
