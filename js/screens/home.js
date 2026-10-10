// Startseite nach dem Onboarding (Etappe 1: Kosten, offene Punkte, Platzhalter für die Karte).
import { t, SPRACHEN, sprache } from "../i18n.js";
import { esc, fmtEuro } from "../util.js";
import { monatsLast, kalkulation } from "../engine.js";
import { ergebnisView } from "./karte.js";
import { nav } from "./nav.js";
import { heute } from "../util.js";
import { schwundAuswertung, umsatzZeitraum, zeitraumTage, wochenSoll, kuehlStatus, offeneNachkontrollen, schwundOhneWert, umsatzKonflikte } from "../engine.js";
import { eintraegeZaehlen } from "../store.js";
import { datumLesbar } from "./tag.js";

export function startView(stand, extra = {}) {
  const m = monatsLast(stand); const fk = m.fix;
  const offen = stand.kosten.filter((k) => k.status === "offen");
  const geschaetzt = stand.kosten.filter((k) => k.status === "geschaetzt");
  const grau = stand.gerichte.length ? kalkulation(stand).zaehl.grau : 0;
  const nk = offeneNachkontrollen(stand); const ohneWert = schwundOhneWert(stand); const konflikte = umsatzKonflikte(stand); const ks = kuehlStatus(stand);
  const nichtsOffen = offen.length === 0 && geschaetzt.length === 0 && !m.lohnOffen && !grau && !nk.length && !ohneWert.length && !konflikte.length;
  const unter = [stand.betrieb.format ? t("format." + stand.betrieb.format)[0] : "", ...stand.betrieb.kuechen.map((k) => t("kueche." + k))].filter(Boolean).join(", ");
  const postenZeile = (k, marke) => `
    <button type="button" class="zeileknopf" data-a="bearbeiten" data-schritt="kosten-${esc(k.kategorie)}">
      <span><b>${esc(t("kosten.posten." + k.posten)[0])}</b><small>${esc(t("kosten.kategorien." + k.kategorie)[0])} ${marke}</small></span>
      <span class="pfeil">›</span>
    </button>`;
  return `
    <div class="kopfband">
      <h1>${esc(t("start.hallo", stand.betrieb.name))}<span class="abzeichen">${esc(t("app.entwurf"))}</span></h1>
      <div class="unter">${esc(unter)}</div>
    </div>
    <div class="inhalt">
      ${extra.aktualisierung ? `<div class="karte hinweisgelb"><h2>${esc(t("start.neueFassung"))}</h2><div>${esc(t("start.neueFassungText"))}</div><button type="button" class="knopf" data-a="aktualisieren">${esc(t("start.jetztUebernehmen"))}</button></div>` : ""}
      ${sicherungKarte(extra.wurzel)}
      <div class="karte ${nichtsOffen ? "leer" : "hinweisgelb"}">
        <h2>${esc(t("start.offenTitel"))}</h2>
        ${nk.length ? `<button type="button" class="zeileknopf" data-a="nav" data-wert="kuehl"><span><b>${esc(t("kuehl.nachkontrollenTitel"))}</b><small>${esc(t("kuehl.nachkontrollenKurz", nk.length))}${nk.some((x) => x.ueberfaellig) ? ` · ${esc(t("kuehl.ueberfaellig"))}` : ""}</small></span><span class="pfeil">›</span></button>` : ""}
        ${ohneWert.length ? `<button type="button" class="zeileknopf" data-a="nav" data-wert="tag"><span><b>${esc(t("tag.wertFehltTitel"))}</b><small>${esc(t("tag.wertFehlt", ohneWert.length))}</small></span><span class="pfeil">›</span></button>` : ""}
        ${konflikte.length ? `<button type="button" class="zeileknopf" data-a="nav" data-wert="tag"><span><b>${esc(t("tag.konfliktTitel"))}</b><small>${esc(konflikte.map(datumLesbar).join(", "))}</small></span><span class="pfeil">›</span></button>` : ""}
        ${nichtsOffen ? `<div>${esc(t("start.offenLeer"))}</div>` : `
          ${offen.length ? `<div>${esc(t("start.offenPosten", offen.length))}</div>` : ""}
          ${geschaetzt.length ? `<div>${esc(t("start.geschaetztPosten", geschaetzt.length))}</div>` : ""}`}
        ${stand.team.lohnkosten === null ? `<button type="button" class="zeileknopf" data-a="bearbeiten" data-schritt="lohn"><span><b>${esc(t("zusammenfassung.loehne"))}</b><small>${esc(t("allgemein.offen"))}</small></span><span class="pfeil">›</span></button>` : ""}
        ${grau ? `<button type="button" class="zeileknopf" data-a="nav" data-wert="karte"><span><b>${esc(t("start.karteTitel"))}</b><small>${esc(t("start.karteOffen", grau))}</small></span><span class="pfeil">›</span></button>` : ""}
        ${offen.map((k) => postenZeile(k, "· " + t("allgemein.offen"))).join("")}
        ${geschaetzt.map((k) => postenZeile(k, "· " + t("allgemein.schaetzung"))).join("")}
      </div>
      <div class="karte">
        <h2>${esc(t("start.kostenTitel"))}</h2>
        <div class="gross">${fmtEuro(m.gesamt)}${m.offen ? `<span class="abzeichen">${esc(t("zusammenfassung.unvollstaendig"))}</span>` : ""}</div>
        <div class="summenzeile"><span>${esc(t("zusammenfassung.fix"))}${stand.betrieb.monate < 12 ? ` <span class="marke">(${esc(t("zusammenfassung.saisonKurz", stand.betrieb.monate))})</span>` : ""}</span><span class="wert">${fmtEuro(m.fixJeOffen)}</span></div>
        <div class="summenzeile"><span>${esc(t("zusammenfassung.loehne"))}</span><span class="wert">${m.lohnOffen ? `<span class="marke offen">${esc(t("allgemein.offen"))}</span>` : fmtEuro(m.lohn)}</span></div>
        <button type="button" class="knopf zweit" data-a="bearbeiten" data-schritt="kosten-miete" data-bis="kosten-sonstiges">${esc(t("start.kostenBearbeiten"))}</button>
      </div>
      ${kuehlKarte(stand, ks)}
      ${karteKarte(stand)}
      ${heuteKarte(stand)}
    </div>
    ${nav("start")}`;
}

function heuteKarte(stand) {
  const H = heute(); const z = zeitraumTage(7);
  const sw = schwundAuswertung(stand, z); const u = umsatzZeitraum(stand, z);
  const heuteNotiz = (stand.tagesnotizen || []).some((n) => n.datum === H); const heuteSchwund = (stand.schwund || []).some((e) => e.datum === H && !e.storniert);
  return `<div class="karte"><h2>${esc(t("tag.titel"))}</h2>
    <div class="summenzeile"><span>${esc(t("tag.wocheAbfall"))}</span><span class="wert">${fmtEuro(sw.muellwert, { dezimal: 2 })}${sw.ohneWert ? ` <span class="marke offen">+${sw.ohneWert}</span>` : ""}</span></div>
    <div class="summenzeile"><span>${esc(t("tag.wocheUmsatz", u.tage))}</span><span class="wert">${u.tage ? fmtEuro(u.summe) : `<span class="marke offen">${esc(t("allgemein.offen"))}</span>`}</span></div>
    ${u.tage ? `<div class="summenzeile"><span>${esc(t("tag.wochenSoll"))}</span><span class="wert">${fmtEuro(wochenSoll(stand))}${monatsLast(stand).offen ? ` <span class="abzeichen">${esc(t("zusammenfassung.unvollstaendig"))}</span>` : ""}</span></div>` : ""}
    <button type="button" class="knopf ${heuteNotiz && heuteSchwund ? "zweit" : "glut"}" data-a="nav" data-wert="tag">${esc(t(heuteNotiz || heuteSchwund ? "tag.oeffnen" : "tag.heuteEintragen"))}</button></div>`;
}

// Sicherung: die einzige Verteidigung gegen Handyverlust und gelöschte Website-Daten. Gelb ab 3 Tagen oder 20 neuen Einträgen, rot ab 7 Tagen.
function sicherungKarte(wurzel) {
  if (!wurzel) return "";
  const n = eintraegeZaehlen(wurzel); const neu = n - (wurzel.sicherungZaehler || 0);
  const tage = wurzel.letzteSicherung ? Math.floor((Date.now() - Date.parse(wurzel.letzteSicherung)) / 86400e3) : null;
  const stufe = tage === null ? (n >= 5 ? "rot" : null) : tage >= 7 ? "rot" : (tage >= 3 || neu >= 20) ? "gelb" : null;
  if (!stufe) return "";
  return `<div class="karte ${stufe === "rot" ? "hinweisrot" : "hinweisgelb"}"><h2>${esc(t("start.sicherungTitel"))}</h2>
    <div>${esc(tage === null ? t("start.sicherungNie", n) : t("start.sicherungAlt", tage, neu))}</div>
    <button type="button" class="knopf ${stufe === "rot" ? "" : "zweit"}" data-a="export">${esc(t("einstellungen.exportieren"))}</button></div>`;
}

function kuehlKarte(stand, ks) {
  if (!ks.eingerichtet) return `<button type="button" class="zeileknopf" data-a="nav" data-wert="kuehl"><span><b>${esc(t("kuehl.titel"))}</b><small>${esc(t("kuehl.nochNicht"))}</small></span><span class="pfeil">›</span></button>`;
  const fertig = ks.heuteGemessen >= ks.stellen;
  return `<div class="karte ${ks.ueberfaellig ? "hinweisrot" : ""}"><h2>${esc(t("kuehl.titel"))}</h2>
    <div class="gross">${ks.heuteGemessen} / ${ks.stellen}</div>
    <div class="hinweis">${esc(t(fertig ? "kuehl.heuteFertig" : ks.heuteGemessen ? "kuehl.heuteTeils" : "kuehl.heuteOffen"))}${ks.fehlt7 ? ` · ${esc(t("kuehl.luecken7", ks.fehlt7))}` : ""}</div>
    <button type="button" class="knopf ${fertig ? "zweit" : "glut"}" data-a="kuehl-rundgang-start" data-offen="${fertig && !ks.offenerRundgang ? "1" : "0"}">${esc(t(ks.offenerRundgang ? "kuehl.weiterRundgang" : fertig ? "kuehl.oeffnen" : "kuehl.starten"))}</button></div>`;
}

function karteKarte(stand) {
  if (!stand.gerichte.length) return `<div class="karte leer"><h2>${esc(t("start.karteTitel"))}</h2><div>${esc(t("start.karteLeer"))}</div>
    <button type="button" class="knopf zweit" data-a="bearbeiten" data-schritt="karte" data-bis="ergebnis">${esc(t("start.karteAnlegen"))}</button></div>`;
  const k = kalkulation(stand);
  return `<div class="karte"><h2>${esc(t("start.karteTitel"))}</h2>
    <div class="ampelzeile">${["gruen", "gelb", "rot", "grau"].map((a) => `<span class="ampel ${a}">${k.zaehl[a]} ${esc(t("ergebnis.ampel." + a))}</span>`).join("")}</div>
    <button type="button" class="knopf zweit" data-a="nav" data-wert="karte">${esc(t("start.karteOeffnen"))}</button></div>`;
}

export function karteView(stand) {
  return `
    <div class="kopfband"><h1>${esc(t("start.karteTitel"))}</h1><div class="unter">${esc(t("start.hallo", stand.betrieb.name))}</div></div>
    <div class="inhalt">
      ${stand.gerichte.length ? ergebnisView(stand, { inApp: true }) : `<div class="karte leer"><div>${esc(t("start.karteLeer"))}</div></div>`}
      <div class="karte">
        <button type="button" class="zeileknopf" data-a="bearbeiten" data-schritt="karte"><b>${esc(t("start.gerichteAendern"))}</b><span class="pfeil">›</span></button>
        <button type="button" class="zeileknopf" data-a="bearbeiten" data-schritt="rezepte"><b>${esc(t("start.rezepteAendern"))}</b><span class="pfeil">›</span></button>
        <button type="button" class="zeileknopf" data-a="bearbeiten" data-schritt="preise"><b>${esc(t("start.preiseAendern"))}</b><span class="pfeil">›</span></button>
        <button type="button" class="zeileknopf" data-a="bearbeiten" data-schritt="verkauf"><b>${esc(t("start.verkaufAendern"))}</b><span class="pfeil">›</span></button>
      </div>
    </div>
    ${nav("karte")}`;
}

export function einstellungenView(stand, ereignisAnzahl, wurzel, extra = {}) {
  return `
    <div class="kopfband"><h1>${esc(t("einstellungen.titel"))}</h1><div class="unter">${esc(t("einstellungen.fassung"))}</div></div>
    <div class="inhalt">
      <div class="karte">
        <h2>${esc(t("einstellungen.sprache"))}</h2>
        <div class="chips">${SPRACHEN.map((s) => `<button type="button" class="chip ${sprache() === s ? "an" : ""}" data-a="sprache" data-wert="${s}">${esc(t("sprache." + s))}</button>`).join("")}</div>
      </div>
      <div class="karte">
        <h2>${esc(t("einstellungen.betrieb"))} <span class="marke">${esc(stand.betrieb.name)}</span></h2>
        ${[["betrieb", "einstellungen.bereichBetrieb"], ["team", "einstellungen.bereichTeam"], ["lohn", "zusammenfassung.loehne"], ["kanaele", "einstellungen.bereichKanaele"]]
          .map(([s, k]) => `<button type="button" class="zeileknopf" data-a="bearbeiten" data-schritt="${s}"><b>${esc(t(k))}</b><span class="pfeil">›</span></button>`).join("")}
        <button type="button" class="knopf zweit" data-a="bearbeiten" data-schritt="format" data-bis="ergebnis">${esc(t("einstellungen.onboardingNeu"))}</button>
        ${wurzel && wurzel.betriebe.length > 1 ? `<button type="button" class="knopf weich warn" data-a="laden-loeschen">${esc(t("einstellungen.ladenLoeschen"))}</button>` : ""}
      </div>
      <div class="karte">
        <h2>${esc(t("kuehl.titel"))}</h2>
        <button type="button" class="zeileknopf" data-a="kuehl-einrichtung-oeffnen"><b>${esc(t("kuehl.einrichtungAendern"))}</b><span class="pfeil">›</span></button>
        <span class="marke">${esc(t("kuehl.personenKurz", stand.personen.filter((p) => !p.entfernt).length))}</span>
      </div>
      <div class="karte">
        <h2>${esc(t("einstellungen.sicherung"))}</h2>
        <p class="hinweis">${esc(t("einstellungen.sicherungText"))}</p>
        <button type="button" class="knopf" data-a="export">${esc(t("einstellungen.exportieren"))}</button>
        <label class="knopf zweit" style="text-align:center">${esc(t("einstellungen.importieren"))}<input type="file" accept="application/json,.json" data-f="import" class="versteckt"></label>
        <span class="marke">${esc(t("einstellungen.ereignisse", ereignisAnzahl))}${wurzel?.letzteSicherung ? ` · ${esc(t("einstellungen.letzteSicherung", datumLesbar(wurzel.letzteSicherung.slice(0, 10))))}` : ""}</span>
        <p class="hinweis">${esc(t("einstellungen.pruefsummeText"))}</p>
      </div>
      <div class="karte">
        <h2>${esc(t("einstellungen.offline"))}</h2>
        <div>${esc(t(extra.offline === "bereit" ? "einstellungen.offlineBereit" : extra.offline === "keinSw" ? "einstellungen.offlineNicht" : "einstellungen.offlineLaedt"))}</div>
        <p class="hinweis">${esc(t("einstellungen.installieren"))}</p>
      </div>
      <div class="karte">
        <button type="button" class="knopf warn" data-a="loeschen">${esc(t("einstellungen.loeschenAlles"))}</button>
      </div>
    </div>
    ${nav("einstellungen")}`;
}
