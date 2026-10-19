// Etappe 5: das Cockpit (Startseite) – eine große Zahl, drei kleine, „Jetzt dran", die Woche, die Türen. Dazu „Mehr" und die Karte.
// Jede Eingabe endet wieder hier. Alles, was hier steht, kommt aus dem Rechenwerk (engine, zaehler); die Oberfläche rechnet nicht selbst.
import { reinigungZeile } from "./reinigung_zeile.js";
import { t, SPRACHEN, SPRACH_NAMEN, sprache } from "../i18n.js";
import { esc, fmtEuro, fmtZahl, heute, heuteGeschaeft, wertAnzeige } from "../util.js"; // Paket 3 (16.10.2026), M7: Zähler und Zielkarte im Laden rechnen mit dem Geschäftstag
import { monatsLast, kuehlStatus, umsatzSteuerSatz } from "../engine.js";
import { jetztDran } from "../offen.js";
import { zielAttr } from "./bausteine.js"; // Trennung (17.10.2026): ein zielAttr für alle Bildschirme
import { zaehler, warenQuote, zaehlerVerlauf } from "../zaehler.js"; // Trennung (17.10.2026): zaehlerVerlauf aus dem Rechenwerk
import { heuteZiel, heuteKachelZahlen } from "../laden_zahlen.js"; // Trennung 2 (17.10.2026): Zahlen der Zielkarte und Kacheln
import { ergebnisView } from "./karte.js";
import { nav } from "./nav.js";
import { bueroCodeKarte } from "./ebene.js"; // Drei Ebenen (A): Büro-Code in den Einstellungen
import { einrichtungStand } from "../einrichtung.js";
import { sym } from "../symbole.js";
import { datumLesbar, monatName } from "./tag.js";

// Drei Ebenen (15.10.2026, Entwickler B): Laden „Heute“ – ein Bildschirm ohne Scrollen. Datum, EINE Zielkarte (Bis null / Bis zum Ziel /
// Über dem Ziel) mit Balken, vier Kacheln (Umsatz, Müll, Kühlung, Putzen) und höchstens eine „Jetzt dran“-Karte aus der festen Liste
// in js/offen.js. Einrichtungsring, Kostenlücken und Hinweise wohnen im Büro (offenImBuero). Trennung (17.10.2026): die nie gezeigten Bausteine
// (Spruch, Monatsbalken, Einrichtungskarte, Instrumente, Band) sind entfernt; der Monatsbalken im Büro ist umsatz.js.
export function startView(stand, extra = {}) {
  const H = heuteGeschaeft(); const z = zaehler(stand, { datum: H }); const ks = kuehlStatus(stand); // Kühl-Kachel bleibt am Kalendertag (kuehlStatus intern)
  const dran = jetztDran(stand, extra.wurzel, { jetzt: extra.jetzt || new Date() });
  return `
    <div class="inhalt cockpit heute-laden">
      <div class="h-zeitzeile">${esc(stand.betrieb.name || t("menue.deinLaden"))} · ${esc(tagKurz(H))}</div>
      ${heuteZielKarte(stand, z, H)}
      <div class="h-kacheln">${heuteKachelnLaden(stand, ks, H)}</div>
      ${dran ? jetztKarte(dran) : ""}
      ${extra.aktualisierung ? `<button type="button" class="leise" data-a="aktualisieren">${esc(t("heute.offen.fassung"))}</button>` : ""}
    </div>
    ${nav("start")}`;
}
const tagKurz = (H) => { const [j, m, d] = H.split("-").map(Number); try { return new Date(j, m - 1, d).toLocaleDateString(sprache() === "en" ? "en-GB" : sprache(), { weekday: "short", day: "numeric", month: "short" }); } catch { return datumLesbar(H); } };

// Zielkarte im Laden: Stufe als Überschrift, eine große Zahl, Balken vom Monatsumsatz bis zur Zielmarke, Tempo als kleine Pille.
// Trennung 2 (17.10.2026): alle Zahlen aus heuteZiel() (js/laden_zahlen.js); hier entsteht nur der Tempo-Satz.
function zielTexte(stand, z, H) {
  const w = heuteZiel(stand, z, H);
  const tempo = !w.tempo ? null : w.tempo.art === "gut" ? { art: "gut", text: t("heute.tempoGut", datumLesbar(w.tempo.am).slice(0, 6)) } : { art: "knapp", text: t("heute.tempoKnapp", fmtEuro(w.tempo.proTag, { dezimal: 0 })) };
  return { ...w, tempo };
}
function heuteZielKarte(stand, z, H) {
  const w = zielTexte(stand, z, H); const { m } = w;
  return `<button type="button" class="karte h-ziel ${m.stufe === "ueberZiel" ? "plus" : ""}" data-a="nav" data-wert="umsatz">
    <span class="h-zielkopf"><span>${esc(t("heute.stufe." + w.stufe))}</span>${w.tempo ? `<span class="h-tempo ${w.tempo.art}">${esc(w.tempo.text)}</span>` : `<span class="zielsym">${sym("target")}</span>`}</span>
    <span class="h-riesig ${m.geschaetzt ? "leicht" : ""}">${w.zahl === null ? "–" : `${m.geschaetzt ? "≈ " : ""}${m.stufe === "ueberZiel" ? "+" : ""}${fmtEuro(w.zahl, { dezimal: 0 })}`}</span>
    ${m.ziel === null ? `<span class="h-unter">${esc(t("heute.ohneKosten"))}</span>`
      : `<span class="h-balken" aria-hidden="true"><i style="width:${Math.round(w.anteil * 100)}%"></i></span><span class="h-balkenzahlen"><span>${fmtEuro(m.umsatz, { dezimal: 0 })}</span><span>${fmtEuro(w.marke, { dezimal: 0 })}</span></span>`}
  </button>${m.richtwertWare ? `<button type="button" class="h-richtwert" data-a="nav" data-wert="preise">${esc(t("cockpit.richtwertZeile"))}</button>` : ""}`;
}

// Vier Kacheln: Symbol + Zahl. Kühlung zeigt den schlechtesten Wert (rot) oder „OK“ oder „2 offen“; Putzen erledigt/gesamt heute.
// Trennung 2 (17.10.2026): Zahlen und Zustand aus heuteKachelZahlen() (js/laden_zahlen.js); hier entstehen nur die kurzen Texte.
function kachelTexte(stand, ks, H) {
  const w = heuteKachelZahlen(stand, ks, H);
  const k = w.kuehl;
  const kuehl = !k ? { wert: "–", alarm: false } : k.art === "abweichung" ? { wert: `${fmtZahl(k.wert, Number.isInteger(k.wert) ? 0 : 1)} °C`, alarm: true }
    : k.art === "ok" ? { wert: t("heute.ok"), alarm: false } : k.art === "ruhetag" ? { wert: t("kuehl.status.ruhetag"), alarm: false } : { wert: t("heute.offenN", k.anzahl), alarm: false, offen: true };
  const putz = w.putz ? { wert: `${w.putz.erledigt} / ${w.putz.gesamt}`, alarm: w.putz.alarm } : { wert: "–", alarm: false };
  return { umsatz: w.umsatz, muell: w.muell, kuehl, putz };
}
function heuteKachelnLaden(stand, ks, H) {
  const w = kachelTexte(stand, ks, H);
  // Leere Kachel zeigt ihren ersten Handgriff (+ in Orange, Text für Vorlesehilfen) statt „–“ – 15-Wörter-Regel bleibt (Entrümpelung Punkt 5, freigegeben 18.10.2026; Design B Screen 3)
  const kachel = (cls, symbol, key, wert, ziel, alarm, handgriff) => `<button type="button" class="karte h-kachel ${alarm ? "alarm" : ""} ${handgriff ? "leer" : ""}" ${ziel}${handgriff ? ` aria-label="${esc(t(key))}: ${esc(handgriff)}"` : ""}><span class="ks ${cls}">${sym(symbol)}</span><span><small>${esc(t(key))}</small>${handgriff ? `<b class="handgriff">${sym("plus")}</b>` : `<b>${wert}</b>`}</span></button>`;
  return kachel("umsatz", "chart-column", "heute.kachel.umsatz", w.umsatz === null ? "" : fmtEuro(w.umsatz, { dezimal: 0 }), 'data-a="nav" data-wert="umsatz"', false, w.umsatz === null && t("schnellknopf.umsatz"))
    + kachel("muell", "trash-2", "heute.kachel.muell", w.muell === null ? "" : fmtEuro(w.muell, { dezimal: w.muell < 10 ? 2 : 0 }), 'data-a="nav" data-wert="muell"', false, w.muell === null && t("schnellknopf.muell"))
    + kachel("kuehl", "snowflake", "heute.kachel.kuehlung", esc(w.kuehl.wert), 'data-a="nav" data-wert="kuehl"', w.kuehl.alarm, w.kuehl.wert === "–" && t("schnellknopf.kuehl"))
    + kachel("putz", "spray-can", "heute.kachel.putzen", esc(w.putz.wert), 'data-a="nav" data-wert="putzplan"', w.putz.alarm, w.putz.wert === "–" && t("menue.putzplan"));
}
function jetztKarte(d) {
  return `<button type="button" class="jetzt h-jetzt ${d.ton}" ${zielAttr(d.ziel)} data-dran="${esc(d.id)}"><span class="ks">${sym(d.symbol)}</span><span class="h-jetzt-text"><small>${esc(t("heute.jetztDran"))}</small><b>${esc(d.titel)}</b></span><span class="los">${esc(d.knopf)}</span></button>`;
}

// Schmale Zeile auf anderen Seiten, solange ein offener Schritt die Seite betrifft
export function einrichtungZeile(e, ids) {
  if (e.prozent >= 100 || !e.schritte.some((x) => ids.includes(x.id) && !x.fertig)) return "";
  return `<button type="button" class="einrichtungzeile" data-a="nav" data-wert="start">${esc(t("einrichtung.kurz", e.prozent))}</button>`;
}

export function zaehlerKarte(z, H, { tipp = true } = {}) {
  const monat = monatName(H);
  const grau = z.keinUmsatz;
  const satz = grau ? t("cockpit.keinUmsatz") : z.imPlus ? (z.kippTag ? t("cockpit.seitArbeitest", datumLesbar(z.kippTag).slice(0, 6)) : "") : z.reichtNicht ? t("cockpit.reichtNicht") : z.nullTag ? t("cockpit.nullAm", datumLesbar(z.nullTag).slice(0, 6)) : "";
  return `<${tipp ? 'button type="button" data-a="nav" data-wert="umsatz"' : "div"} class="karte dunkel zaehler ${grau ? "grau" : z.imPlus ? "plus" : "minus"}">
    <small class="lbl">${esc(z.imPlus ? t("cockpit.verdient", monat) : t("cockpit.bisNull", monat))}</small>
    <span class="riesig">${grau ? "–" : `${z.imPlus ? "+" : "−"} ${fmtEuro(Math.abs(z.stand))}`}</span>
    ${grau ? "" : monatsKurve(z, H)}
    <small>${esc(satz)}</small>
    ${z.unvollstaendig ? `<small class="warn">${esc(t("cockpit.unvollstaendig"))}</small>` : ""}
    <small class="fein">${esc(t("cockpit.kalkulatorisch"))} · ${esc(t("cockpit.stufe." + z.stufe))}${!grau && z.start > z.monat.von ? ` · ${esc(t("zaehler.zaehltAb", datumLesbar(z.start).slice(0, 6)))}` : ""}</small>
  </${tipp ? "button" : "div"}>`;
}

function monatsKurve(z, H) {
  const v = zaehlerVerlauf(z); if (!v.ist.length) return "";
  const alle = [...v.ist, ...v.prognose]; const min = Math.min(0, ...alle.map((x) => x.stand)), max = Math.max(0, ...alle.map((x) => x.stand));
  const W = 300, Hh = 80, sp = max - min || 1; const tagIdx = (d) => Number(d.slice(8, 10)) - 1;
  const X = (d) => (tagIdx(d) / Math.max(1, v.tage - 1) * W).toFixed(1), Y = (s) => (Hh - (s - min) / sp * Hh).toFixed(1);
  const pfad = (l) => l.map((x, i) => `${i ? "L" : "M"}${X(x.datum)},${Y(x.stand)}`).join(" ");
  const heute = v.ist[v.ist.length - 1];
  return `<svg class="monatskurve" viewBox="-4 -4 ${W + 8} ${Hh + 8}" preserveAspectRatio="none" aria-hidden="true">
    <line class="nulllinie" x1="0" x2="${W}" y1="${Y(0)}" y2="${Y(0)}"/>
    <path class="ist" d="${pfad(v.ist)}"/>${v.prognose.length ? `<path class="prognose" d="${pfad([heute, ...v.prognose])}"/>` : ""}
    <circle class="heute" cx="${X(heute.datum)}" cy="${Y(heute.stand)}" r="3.5"/>
    ${v.nullTag && v.nullTag > H ? `<circle class="nulltag" cx="${X(v.nullTag)}" cy="${Y(0)}" r="3"/>` : ""}</svg>`;
}

export function karteView(stand) {
  return `
    <div class="kopfband"><h1>${esc(t("start.karteTitel"))}</h1><div class="unter">${esc(t("start.hallo", stand.betrieb.name))}</div></div>
    <div class="inhalt">
      ${einrichtungZeile(einrichtungStand(stand), ["karte", "preise", "rezepte", "einkauf", "kosten"])}
      ${stand.gerichte.length ? ergebnisView(stand, { inApp: true }) : `<div class="karte leer"><div>${esc(t("start.karteLeer"))}</div><button type="button" class="knopf zweit" data-a="bearbeiten" data-schritt="karte" data-bis="ergebnis">${esc(t("start.karteAnlegen"))}</button></div>`}
      <button type="button" class="knopf glut" data-a="nav" data-wert="kartefoto">${sym("camera")} ${esc(t("foto.karteKnopf"))}</button>
      <div class="karte">
        <button type="button" class="zeileknopf" data-a="bearbeiten" data-schritt="karte"><b>${esc(t("start.gerichteAendern"))}</b><span class="pfeil">›</span></button>
        <button type="button" class="zeileknopf" data-a="bearbeiten" data-schritt="rezepte"><b>${esc(t("start.rezepteAendern"))}</b><span class="pfeil">›</span></button>
        <button type="button" class="zeileknopf" data-a="bearbeiten" data-schritt="preise"><b>${esc(t("start.preiseAendern"))}</b><span class="pfeil">›</span></button>
        <button type="button" class="zeileknopf" data-a="bearbeiten" data-schritt="verkauf"><b>${esc(t("start.verkaufAendern"))}</b><span class="pfeil">›</span></button>
      </div>
    </div>
    ${nav("kartebuero")}`;
}

export function einstellungenView(stand, ereignisAnzahl, wurzel, extra = {}) {
  const m = monatsLast(stand); const q = warenQuote(stand); const st = umsatzSteuerSatz(stand);
  return `
    <div class="kopfband"><h1>${esc(t("einstellungen.titel"))}</h1><div class="unter">${esc(t("einstellungen.fassung"))}${extra.fassung ? ` · ${esc(extra.fassung)}` : ""}</div></div>
    <div class="inhalt">
      <div class="karte">
        ${[["karte", "start.karteTitel"], ["laeden", "laeden.titel"], ["listen", "listen.titel"], ["beleg", "beleg.belege"]].map(([a, k]) => `<button type="button" class="zeileknopf" data-a="nav" data-wert="${a}"><b>${esc(t(k))}</b><span class="pfeil">›</span></button>`).join("")}
      </div>
      <div class="karte">
        <h2>${esc(t("start.kostenTitel"))}</h2>
        <div class="gross">${fmtEuro(m.gesamt)}${m.offen ? `<span class="abzeichen">${esc(t("zusammenfassung.unvollstaendig"))}</span>` : ""}</div>
        <div class="summenzeile"><span>${esc(t("zusammenfassung.fix"))}</span><span class="wert">${fmtEuro(m.fixJeOffen)}</span></div>
        <div class="summenzeile"><span>${esc(t("zusammenfassung.loehne"))}</span><span class="wert">${m.lohnOffen ? `<span class="marke offen">${esc(t("allgemein.offen"))}</span>` : fmtEuro(m.lohn)}</span></div>
        <div class="summenzeile"><span>${esc(t("start.eigenerLohn"))}</span><span class="wert">${m.eigen.betrag === null ? `<span class="marke offen">${esc(t("allgemein.offen"))}</span>` : `${fmtEuro(m.eigen.betrag)}${m.eigen.status === "geschaetzt" ? ` <span class="marke geschaetzt">${esc(t("allgemein.schaetzung"))}</span>` : ""}`}</span></div>
        ${reinigungZeile(m.reinigung, { leiter: true })}
        <button type="button" class="knopf zweit" data-a="bearbeiten" data-schritt="kosten-miete" data-bis="kosten-sonstiges">${esc(t("start.kostenBearbeiten"))}</button>
        <button type="button" class="zeileknopf" data-a="bearbeiten" data-schritt="reinigung"><b>${esc(t("reinigung.zeile"))}</b><small>${esc(stand.betrieb.reinigung?.wer ? t("reinigung.wer." + stand.betrieb.reinigung.wer) : t("allgemein.offen"))}</small><span class="pfeil">›</span></button>
        <button type="button" class="zeileknopf" data-a="bearbeiten" data-schritt="lohn"><b>${esc(t("zusammenfassung.loehne"))} · ${esc(t("start.eigenerLohn"))}</b><span class="pfeil">›</span></button>
      </div>
      <div class="karte">
        <h2>${esc(t("zaehler.einstellungen"))}</h2>
        <div class="feldzeile"><label>${esc(t("zaehler.quote"))}</label>
          <div class="betrag"><input inputmode="decimal" data-f="warenQuote" value="${esc(typeof stand.verkauf.warenQuote === "number" ? wertAnzeige(Math.round(stand.verkauf.warenQuote * 1000) / 10) : "")}" placeholder="${esc(q.quote !== null ? fmtZahl(q.quote * 100, 0) : "")}" aria-label="%"><span class="einheit">%</span></div>
          <span class="marke">${esc(t("zaehler.quoteHinweis"))} · ${esc(t("zaehler.quoteQuelle." + q.quelle))}</span></div>
        <div class="feldzeile"><label>${esc(t("zaehler.steuer"))}</label>
          <div class="betrag"><input inputmode="decimal" data-f="steuerSatz" value="${esc(typeof stand.betrieb.steuerSatz === "number" ? wertAnzeige(Math.round(stand.betrieb.steuerSatz * 1000) / 10) : "")}" placeholder="${esc(fmtZahl(st.satz * 100, 1))}" aria-label="%"><span class="einheit">%</span></div>
          <span class="marke">${esc(t("zaehler.steuerHinweis"))} ${esc(t("zaehler.steuerQuelle." + st.quelle))}.</span></div>
        <div class="zeile"><div class="oben"><div class="name">${esc(t("einstellungen.kleinunternehmer"))}<small>${esc(t("einstellungen.kleinunternehmerHinweis"))}</small></div>
          <button type="button" class="schalter ${stand.betrieb.kleinunternehmer ? "an" : ""}" data-a="kleinunternehmer" aria-pressed="${!!stand.betrieb.kleinunternehmer}" aria-label="${esc(t("einstellungen.kleinunternehmer"))}"></button></div></div>
      </div>
      <div class="karte">
        <h2>${esc(t("einstellungen.sprache"))}</h2>
        <div class="chips">${SPRACHEN.map((s) => `<button type="button" class="chip ${sprache() === s ? "an" : ""}" data-a="sprache" data-wert="${s}" lang="${s}">${esc(SPRACH_NAMEN[s] || s)}</button>`).join("")}</div>
      </div>
      ${bueroCodeKarte(wurzel)}
      <div class="karte">
        <h2>${esc(t("einstellungen.betrieb"))} <span class="marke">${esc(stand.betrieb.name)}</span></h2>
        ${[["betrieb", "einstellungen.bereichBetrieb"], ["team", "einstellungen.bereichTeam"], ["kanaele", "einstellungen.bereichKanaele"], ["kuehlstellen", "einstellungen.bereichKuehl"]]
          .map(([s, k]) => `<button type="button" class="zeileknopf" data-a="bearbeiten" data-schritt="${s}"><b>${esc(t(k))}</b><span class="pfeil">›</span></button>`).join("")}
        <button type="button" class="zeileknopf" data-a="kuehl-einrichtung-oeffnen"><b>${esc(t("kuehl.einrichtungAendern"))}</b><small>${esc(t("kuehl.personenKurz", stand.personen.filter((p) => !p.entfernt).length))}</small><span class="pfeil">›</span></button>
        <button type="button" class="knopf zweit" data-a="bearbeiten" data-schritt="format" data-bis="ergebnis">${esc(t("einstellungen.onboardingNeu"))}</button>
        ${wurzel && wurzel.betriebe.length > 1 ? `<button type="button" class="knopf weich warn" data-a="laden-loeschen">${esc(t("einstellungen.ladenLoeschen"))}</button>` : ""}
      </div>
      <div class="karte" id="sicherung">
        <h2>${esc(t("einstellungen.sicherung"))}</h2>
        <p class="hinweis">${esc(t("einstellungen.sicherungText"))}</p>
        <p class="tipp">${esc(t("einstellungen.fotosNichtDrin"))}</p>
        <button type="button" class="knopf" data-a="export">${esc(t("einstellungen.exportieren"))}</button>
        <label class="knopf zweit mitte">${esc(t("einstellungen.importieren"))}<input type="file" accept="application/zip,.zip,application/json,.json" data-f="import" class="versteckt"></label>
        <span class="marke">${esc(t("einstellungen.ereignisse", ereignisAnzahl))}${wurzel?.letzteSicherung ? ` · ${esc(t("einstellungen.letzteSicherung", datumLesbar(wurzel.letzteSicherung.slice(0, 10))))}` : ""}${typeof wurzel?.letzteSicherungGroesse === "number" ? ` · ${esc(t("w2d.groesse", Math.max(0.1, Math.round(wurzel.letzteSicherungGroesse / 104857.6) / 10)))}` : ""}</span>
        <p class="hinweis">${esc(t("einstellungen.pruefsummeText"))}</p>
      </div>
      <div class="karte">
        <h2>${esc(t("einstellungen.offline"))}</h2>
        <div>${esc(t(extra.offline === "bereit" ? "einstellungen.offlineBereit" : extra.offline === "keinSw" ? "einstellungen.offlineNicht" : "einstellungen.offlineLaedt"))}</div>
        <p class="hinweis">${esc(t("einstellungen.installieren"))}</p>
        <div>${esc(t(extra.dauerhaft === true ? "w2d.dauerhaftJa" : extra.dauerhaft === false ? "w2d.dauerhaftNein" : "w2d.dauerhaftUnbekannt"))}</div>
        <button type="button" class="zeileknopf" data-a="diagnose-kopieren"><b>${esc(t("w2d.diagnose"))}</b><small>${esc(t("w2d.diagnoseUnter"))}</small><span class="pfeil">›</span></button>
      </div>
      <div class="karte">
        <button type="button" class="knopf warn" data-a="loeschen">${esc(t("einstellungen.loeschenAlles"))}</button>
      </div>
    </div>
    ${nav("einstellungen")}`;
}
