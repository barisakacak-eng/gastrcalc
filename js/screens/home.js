// Etappe 5: das Cockpit (Startseite) – eine große Zahl, drei kleine, „Jetzt dran", die Woche, die Türen. Dazu „Mehr" und die Karte.
// Jede Eingabe endet wieder hier. Alles, was hier steht, kommt aus dem Rechenwerk (engine, zaehler); die Oberfläche rechnet nicht selbst.
import { t, SPRACHEN, sprache } from "../i18n.js";
import { esc, fmtEuro, fmtZahl, heute, wertAnzeige } from "../util.js";
import { monatsLast, kalkulation, schwundAuswertung, umsatzEintrag, kuehlStatus, offeneNachkontrollen, schwundOhneWert, umsatzKonflikte, umsatzSteuerSatz } from "../engine.js";
import { zaehler, wochenVergleich, abschlussVon, warenQuote } from "../zaehler.js";
import { ergebnisView } from "./karte.js";
import { nav } from "./nav.js";
import { eintraegeZaehlen } from "../store.js";
import { datumLesbar, monatName, tagLesbar, zeitKurz } from "./tag.js";

export function startView(stand, extra = {}) {
  const H = heute(); const z = zaehler(stand, { datum: H }); const ks = kuehlStatus(stand); const nk = offeneNachkontrollen(stand);
  const sw = schwundAuswertung(stand, { von: H, bis: H }); const u = umsatzEintrag(stand, H); const ab = abschlussVon(stand, H);
  const dran = naechsteHandlung(stand, z, ks, nk, ab);
  const unter = [stand.betrieb.format ? t("format." + stand.betrieb.format)[0] : "", ...stand.betrieb.kuechen.map((k) => t("kueche." + k))].filter(Boolean).join(", ");
  return `
    <div class="kopfband">
      <h1>${esc(t("start.hallo", stand.betrieb.name))}<span class="abzeichen">${esc(t("app.entwurf"))}</span></h1>
      <div class="unter">${esc(tagLesbar(H))}${unter ? ` · ${esc(unter)}` : ""}</div>
    </div>
    <div class="inhalt cockpit">
      ${extra.aktualisierung ? `<div class="karte hinweisgelb"><h2>${esc(t("start.neueFassung"))}</h2><div>${esc(t("start.neueFassungText"))}</div><button type="button" class="knopf" data-a="aktualisieren">${esc(t("start.jetztUebernehmen"))}</button></div>` : ""}
      ${bandView(z, H)}
      ${zaehlerKarte(z, H)}
      <div class="dreier">
        <button type="button" class="kachel klein" data-a="nav" data-wert="umsatz"><small>${esc(t("cockpit.umsatzHeute"))}</small><b>${u ? fmtEuro(u.umsatz) : "–"}</b></button>
        <button type="button" class="kachel klein" data-a="nav" data-wert="muell"><small>${esc(t("cockpit.tonneHeute"))}</small><b>${sw.anzahl ? fmtEuro(sw.muellwert, { dezimal: sw.muellwert < 100 ? 2 : 0 }) : "–"}</b><small>${sw.portionen !== null && sw.anzahl ? esc(t("cockpit.portionenKurz", fmtZahl(sw.portionen, sw.portionen < 10 ? 1 : 0))) : sw.ohneWert ? esc(t("listen.ohneWert", sw.ohneWert)) : ""}</small></button>
        <button type="button" class="kachel klein ${ks.ueberfaellig ? "rotrand" : ""}" data-a="nav" data-wert="kuehl"><small>${esc(t("cockpit.kuehlung"))}</small><b>${ks.eingerichtet ? `${ks.heuteGemessen} / ${ks.stellen}` : "–"}</b><small>${esc(ks.eingerichtet ? (ks.heuteGemessen >= ks.stellen ? t("cockpit.alleGemessen") : t("cockpit.nochOffen", ks.stellen - ks.heuteGemessen)) : t("cockpit.nichtEingerichtet"))}</small></button>
      </div>
      <button type="button" class="jetzt" data-a="${esc(dran.aktion)}" ${dran.attr || ""}><span><small>${esc(t("cockpit.jetztDran"))}</small><b>${esc(dran.text[0])}</b><small>${esc(dran.text[1])}</small></span><span class="pfeil">›</span></button>
      ${sicherungKarte(extra.wurzel)}
      ${wochenKarte(stand, H)}
      <div class="tueren">
        <button type="button" data-a="nav" data-wert="karte">${esc(t("cockpit.tueren.karte"))}</button>
        <button type="button" data-a="bearbeiten" data-schritt="kosten-miete" data-bis="kosten-sonstiges">${esc(t("cockpit.tueren.kosten"))}</button>
        <button type="button" data-a="nav" data-wert="laeden">${esc(t("cockpit.tueren.laeden"))}</button>
        <button type="button" data-a="nav" data-wert="beleg">${esc(t("cockpit.tueren.belege"))}</button>
        <button type="button" data-a="nav" data-wert="listen">${esc(t("cockpit.tueren.listen"))}</button>
      </div>
      ${offenKarte(stand, z, nk)}
      <button type="button" class="knopf ${ab ? "zweit" : "glut"}" data-a="nav" data-wert="abschluss">${esc(ab ? t("cockpit.tagAbgeschlossen", zeitKurz(ab.erfasst)) : t("cockpit.tagAbschliessen"))}</button>
    </div>
    ${nav("start")}`;
}

// Das Band oben: nur, wenn der Zustand kippt oder kippen wird.
function bandView(z, H) {
  if (z.keinUmsatz) return "";
  if (z.kippTag === H && z.imPlus) return `<div class="band gruen"><b>${esc(t("cockpit.nullErreicht"))}</b><small>${esc(t("cockpit.nullErreichtText"))}</small></div>`;
  if (z.reichtNicht) return `<div class="band rot">${esc(t("cockpit.bandRot"))}</div>`;
  const bisNull = z.nullTag ? z.tage.filter((x) => x.datum > H && x.datum <= z.nullTag).reduce((s, x) => s + x.gewicht, 0) : null;
  if (!z.imPlus && bisNull !== null && bisNull <= 2) return `<div class="band gelb">${esc(t("cockpit.bandKnapp", fmtEuro(-z.stand)))}</div>`;
  return "";
}

export function zaehlerKarte(z, H, { tipp = true } = {}) {
  const monat = monatName(H);
  const grau = z.keinUmsatz;
  const satz = grau ? t("cockpit.keinUmsatz") : z.imPlus ? (z.kippTag ? t("cockpit.seitArbeitest", datumLesbar(z.kippTag).slice(0, 6)) : "") : z.reichtNicht ? t("cockpit.reichtNicht") : z.nullTag ? t("cockpit.nullAm", datumLesbar(z.nullTag).slice(0, 6)) : "";
  return `<${tipp ? 'button type="button" data-a="nav" data-wert="umsatz"' : "div"} class="karte dunkel zaehler ${grau ? "grau" : z.imPlus ? "plus" : "minus"}">
    <small class="lbl">${esc(z.imPlus ? t("cockpit.verdient", monat) : t("cockpit.bisNull", monat))}</small>
    <span class="riesig">${grau ? "–" : `${z.imPlus ? "+" : "−"} ${fmtEuro(Math.abs(z.stand))}`}</span>
    <small>${esc(satz)}</small>
    ${z.unvollstaendig ? `<small class="warn">${esc(t("cockpit.unvollstaendig"))}</small>` : ""}
    <small class="fein">${esc(t("cockpit.kalkulatorisch"))} · ${esc(t("cockpit.stufe." + z.stufe))}${!grau && z.start > z.monat.von ? ` · ${esc(t("zaehler.zaehltAb", datumLesbar(z.start).slice(0, 6)))}` : ""}</small>
  </${tipp ? "button" : "div"}>`;
}

// „Jetzt dran": die eine nächste Handlung aus Uhrzeit und Stand. Reihenfolge = Dringlichkeit.
function naechsteHandlung(stand, z, ks, nk, ab) {
  const h = new Date().getHours(); const H = heute();
  const mk = (key, aktion, attr = "") => ({ text: t("cockpit.dran." + key), aktion, attr });
  if (ks.eingerichtet && ks.offenerRundgang) return mk("rundgangWeiter", "kuehl-rundgang-start", 'data-offen="0"');
  if (nk.length) return mk("nachkontrolle", "nav", 'data-wert="kuehl"');
  if (ks.eingerichtet && ks.heuteGemessen < ks.stellen) return mk(h < 15 ? "kuehlMorgen" : "kuehlAbend", "kuehl-rundgang-start", 'data-offen="0"');
  if (h >= 17 && !umsatzEintrag(stand, H)) return mk("umsatz", "nav", 'data-wert="umsatz"');
  if (z.unvollstaendig) return z.last.fix.offen ? mk("kosten", "bearbeiten", 'data-schritt="kosten-miete" data-bis="kosten-sonstiges"') : mk("kosten", "bearbeiten", 'data-schritt="lohn"');
  if (stand.gerichte.length && kalkulation(stand).zaehl.grau) return mk("karte", "nav", 'data-wert="karte"');
  if (!ks.eingerichtet) return mk("kuehlEinrichten", "kuehl-einrichtung-oeffnen");
  if (h >= 18 && !ab) return mk("abschluss", "nav", 'data-wert="abschluss"');
  return mk("nichts", "nav", 'data-wert="umsatz"');
}

function wochenKarte(stand, H) {
  const w = wochenVergleich(stand, H);
  if (!w.tageDiese && !w.tageVorige) return "";
  const tag = (iso) => t("kuehl.tage." + new Date(iso + "T12:00:00").getDay());
  return `<div class="karte"><h2>${esc(t("cockpit.woche"))}</h2>
    <div class="balken">${w.diese.map((d, i) => `<i class="${d.datum === H ? "heute" : ""}"><s style="height:${Math.round((w.vorige[i].umsatz || 0) / w.max * 100)}%"></s><b style="height:${Math.round((d.umsatz || 0) / w.max * 100)}%"></b></i>`).join("")}</div>
    <div class="tage">${w.diese.map((d) => `<span>${esc(tag(d.datum))}</span>`).join("")}</div>
    <small class="marke">${w.tageDiese && w.tageVorige ? esc(t("cockpit.wocheSumme", fmtEuro(w.summeDiese), fmtEuro(w.summeVorige))) : esc(t("cockpit.vorwoche"))}</small></div>`;
}

// Offene Punkte, nur wenn es welche gibt – kurz, jede Zeile ist eine Tür.
function offenKarte(stand, z, nk) {
  const ohneWert = schwundOhneWert(stand); const konflikte = umsatzKonflikte(stand);
  const grau = stand.gerichte.length ? kalkulation(stand).zaehl.grau : 0;
  const zeilen = [];
  if (z.last.fix.offen) zeilen.push(`<button type="button" class="zeileknopf" data-a="bearbeiten" data-schritt="kosten-miete" data-bis="kosten-sonstiges"><span><b>${esc(t("start.kostenTitel"))}</b><small>${esc(t("start.offenPosten", z.last.fix.offen))}</small></span><span class="pfeil">›</span></button>`);
  if (z.last.lohnOffen || z.last.eigen.betrag === null) zeilen.push(`<button type="button" class="zeileknopf" data-a="bearbeiten" data-schritt="lohn"><span><b>${esc(z.last.lohnOffen ? t("zusammenfassung.loehne") : t("start.eigenerLohn"))}</b><small>${esc(t("allgemein.offen"))}</small></span><span class="pfeil">›</span></button>`);
  if (grau) zeilen.push(`<button type="button" class="zeileknopf" data-a="nav" data-wert="karte"><span><b>${esc(t("start.karteTitel"))}</b><small>${esc(t("start.karteOffen", grau))}</small></span><span class="pfeil">›</span></button>`);
  if (ohneWert.length) zeilen.push(`<button type="button" class="zeileknopf" data-a="nav" data-wert="listen"><span><b>${esc(t("tag.wertFehltTitel"))}</b><small>${esc(t("tag.wertFehlt", ohneWert.length))}</small></span><span class="pfeil">›</span></button>`);
  if (konflikte.length) zeilen.push(`<button type="button" class="zeileknopf" data-a="nav" data-wert="umsatz"><span><b>${esc(t("tag.konfliktTitel"))}</b><small>${esc(konflikte.map(datumLesbar).join(", "))}</small></span><span class="pfeil">›</span></button>`);
  if (!stand.gerichte.length) zeilen.push(`<button type="button" class="zeileknopf" data-a="bearbeiten" data-schritt="karte" data-bis="ergebnis"><span><b>${esc(t("start.karteTitel"))}</b><small>${esc(t("start.karteLeer"))}</small></span><span class="pfeil">›</span></button>`);
  if (!zeilen.length) return "";
  return `<div class="karte hinweisgelb"><h2>${esc(t("start.offenTitel"))}</h2>${zeilen.join("")}</div>`;
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

export function karteView(stand) {
  return `
    <div class="kopfband"><h1>${esc(t("start.karteTitel"))}</h1><div class="unter">${esc(t("start.hallo", stand.betrieb.name))}</div></div>
    <div class="inhalt">
      ${stand.gerichte.length ? ergebnisView(stand, { inApp: true }) : `<div class="karte leer"><div>${esc(t("start.karteLeer"))}</div><button type="button" class="knopf zweit" data-a="bearbeiten" data-schritt="karte" data-bis="ergebnis">${esc(t("start.karteAnlegen"))}</button></div>`}
      <button type="button" class="knopf glut" data-a="nav" data-wert="kartefoto"><span aria-hidden="true">📷</span> ${esc(t("foto.karteKnopf"))}</button>
      <div class="karte">
        <button type="button" class="zeileknopf" data-a="bearbeiten" data-schritt="karte"><b>${esc(t("start.gerichteAendern"))}</b><span class="pfeil">›</span></button>
        <button type="button" class="zeileknopf" data-a="bearbeiten" data-schritt="rezepte"><b>${esc(t("start.rezepteAendern"))}</b><span class="pfeil">›</span></button>
        <button type="button" class="zeileknopf" data-a="bearbeiten" data-schritt="preise"><b>${esc(t("start.preiseAendern"))}</b><span class="pfeil">›</span></button>
        <button type="button" class="zeileknopf" data-a="bearbeiten" data-schritt="verkauf"><b>${esc(t("start.verkaufAendern"))}</b><span class="pfeil">›</span></button>
      </div>
    </div>
    ${nav("start")}`;
}

export function einstellungenView(stand, ereignisAnzahl, wurzel, extra = {}) {
  const m = monatsLast(stand); const q = warenQuote(stand); const st = umsatzSteuerSatz(stand);
  return `
    <div class="kopfband"><h1>${esc(t("einstellungen.titel"))}</h1><div class="unter">${esc(t("einstellungen.fassung"))}</div></div>
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
        <button type="button" class="knopf zweit" data-a="bearbeiten" data-schritt="kosten-miete" data-bis="kosten-sonstiges">${esc(t("start.kostenBearbeiten"))}</button>
        <button type="button" class="zeileknopf" data-a="bearbeiten" data-schritt="lohn"><b>${esc(t("zusammenfassung.loehne"))} · ${esc(t("start.eigenerLohn"))}</b><span class="pfeil">›</span></button>
      </div>
      <div class="karte">
        <h2>${esc(t("zaehler.einstellungen"))}</h2>
        <div class="feldzeile"><label>${esc(t("zaehler.quote"))}</label>
          <div class="betrag"><input inputmode="decimal" data-f="warenQuote" value="${esc(typeof stand.verkauf.warenQuote === "number" ? wertAnzeige(Math.round(stand.verkauf.warenQuote * 1000) / 10) : "")}" placeholder="${esc(q.quote !== null ? fmtZahl(q.quote * 100, 0) : "")}" aria-label="%"><span class="einheit">%</span></div>
          <span class="marke">${esc(t("zaehler.quoteHinweis"))} ${esc(t("zaehler.quoteQuelle." + q.quelle))}.</span></div>
        <div class="feldzeile"><label>${esc(t("zaehler.steuer"))}</label>
          <div class="betrag"><input inputmode="decimal" data-f="steuerSatz" value="${esc(typeof stand.betrieb.steuerSatz === "number" ? wertAnzeige(Math.round(stand.betrieb.steuerSatz * 1000) / 10) : "")}" placeholder="${esc(fmtZahl(st.satz * 100, 1))}" aria-label="%"><span class="einheit">%</span></div>
          <span class="marke">${esc(t("zaehler.steuerHinweis"))} ${esc(t("zaehler.steuerQuelle." + st.quelle))}.</span></div>
      </div>
      <div class="karte">
        <h2>${esc(t("einstellungen.sprache"))}</h2>
        <div class="chips">${SPRACHEN.map((s) => `<button type="button" class="chip ${sprache() === s ? "an" : ""}" data-a="sprache" data-wert="${s}">${esc(t("sprache." + s))}</button>`).join("")}</div>
      </div>
      <div class="karte">
        <h2>${esc(t("einstellungen.betrieb"))} <span class="marke">${esc(stand.betrieb.name)}</span></h2>
        ${[["betrieb", "einstellungen.bereichBetrieb"], ["team", "einstellungen.bereichTeam"], ["kanaele", "einstellungen.bereichKanaele"], ["kuehlstellen", "einstellungen.bereichKuehl"]]
          .map(([s, k]) => `<button type="button" class="zeileknopf" data-a="bearbeiten" data-schritt="${s}"><b>${esc(t(k))}</b><span class="pfeil">›</span></button>`).join("")}
        <button type="button" class="zeileknopf" data-a="kuehl-einrichtung-oeffnen"><b>${esc(t("kuehl.einrichtungAendern"))}</b><small>${esc(t("kuehl.personenKurz", stand.personen.filter((p) => !p.entfernt).length))}</small><span class="pfeil">›</span></button>
        <button type="button" class="knopf zweit" data-a="bearbeiten" data-schritt="format" data-bis="ergebnis">${esc(t("einstellungen.onboardingNeu"))}</button>
        ${wurzel && wurzel.betriebe.length > 1 ? `<button type="button" class="knopf weich warn" data-a="laden-loeschen">${esc(t("einstellungen.ladenLoeschen"))}</button>` : ""}
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
