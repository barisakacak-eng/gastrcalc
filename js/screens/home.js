import { datenschutzText } from "../data/datenschutz.js";
// Etappe 5: das Cockpit (Startseite) – eine große Zahl, drei kleine, „Jetzt dran", die Woche, die Türen. Dazu „Mehr" und die Karte.
// Jede Eingabe endet wieder hier. Alles, was hier steht, kommt aus dem Rechenwerk (engine, zaehler); die Oberfläche rechnet nicht selbst.
import { reinigungZeile } from "./reinigung_zeile.js";
import { t, SPRACHEN, SPRACH_NAMEN, spracheName, sprache, datumText } from "../i18n.js";
import { RECHTSFORMEN, rechtsform } from "../rechtsform.js"; // Rechtsform (23.10.2026)
import { esc, fmtEuro, fmtZahl, heute, heuteGeschaeft, wertAnzeige } from "../util.js"; // Paket 3 (16.10.2026), M7: Zähler und Zielkarte im Laden rechnen mit dem Geschäftstag
import { monatsLast, kuehlStatus, umsatzSteuerSatz } from "../engine.js";
import { jetztDran, ruhezeitenVon } from "../offen.js";
import { zielAttr } from "./bausteine.js"; // Trennung (17.10.2026): ein zielAttr für alle Bildschirme
import { zaehler, warenQuote, zaehlerVerlauf } from "../zaehler.js"; // Trennung (17.10.2026): zaehlerVerlauf aus dem Rechenwerk
import { heuteZiel, heuteKachelZahlen } from "../laden_zahlen.js"; // Trennung 2 (17.10.2026): Zahlen der Zielkarte und Kacheln
import { ergebnisView } from "./karte.js";
import { nav } from "./nav.js";
import { bueroCodeKarte } from "./ebene.js"; // Drei Ebenen (A): Büro-Code in den Einstellungen
import { einrichtungStand } from "../einrichtung.js";
import { sym } from "../symbole.js";
import { datumLesbar, monatName } from "./tag.js";
import { sicherungStufe } from "../sicherung_stufe.js"; // Laden-Umbau (20.10.2026): „Letzte vom Handy weg“
import { bueroKopf } from "./buero.js";
import { nutzenStand } from "../nutzen.js";
import { zekiMoment } from "../zeki.js"; // Zeki auf Heute (26.10.2026)
import { mascotMarkup } from "../gastrocash-brand.js";
import { rezeptFortschritt } from "../rezept_quelle.js"; // Mitmach-Rundgang (28.10.2026): Rezept-Erinnerung auf Heute

// Drei Ebenen (15.10.2026, Entwickler B): Laden „Heute“ – ein Bildschirm ohne Scrollen. Datum, EINE Zielkarte (Bis null / Bis zum Ziel /
// Über dem Ziel) mit Balken, vier Kacheln (Umsatz, Müll, Kühlung, Putzen) und höchstens eine „Jetzt dran“-Karte aus der festen Liste
// in js/offen.js. Einrichtungsring, Kostenlücken und Hinweise wohnen im Büro (offenImBuero). Trennung (17.10.2026): die nie gezeigten Bausteine
// (Spruch, Monatsbalken, Einrichtungskarte, Instrumente, Band) sind entfernt; der Monatsbalken im Büro ist umsatz.js.
export function startView(stand, extra = {}) {
  const H = heuteGeschaeft(); const z = zaehler(stand, { datum: H }); const ks = kuehlStatus(stand); // Kühl-Kachel bleibt am Kalendertag (kuehlStatus intern)
  const dran = jetztDran(stand, extra.wurzel, { jetzt: extra.jetzt || new Date() });
  const nutzen = nutzenStand(stand, H);
  // Nur die Bildwelt folgt der echten Ladenart: Döner und Smash Burger sind beide Pilotbetriebe.
  const burgerPilot = stand.ladenArt === "imbiss" ||
    (stand.ladenArt !== "doener" && Array.isArray(stand.betrieb?.kuechen) && stand.betrieb.kuechen.includes("burger"));

  return `
    <div class="inhalt cockpit heute-laden ${burgerPilot ? "pilot-burger" : "pilot-doener"} hat-nutzen">
      <div class="h-kopf"><div><div class="h-ladenname">${esc(stand.betrieb.name || t("menue.deinLaden"))}</div></div><div class="h-datum">${esc(tagKurz(H))}</div></div>
      ${heuteZielKarte(stand, z, H)}
      ${nutzenKarte(nutzen)}
      <div class="h-kacheln h-reihe">${heuteKachelnLaden(stand, ks, H)}</div>
      ${zekiReihe(stand, H, dran, { ...extra, fehlt: heuteZiel(stand, z, H).fehlt ?? null })}
      ${extra.aktualisierung ? `<button type="button" class="leise" data-a="aktualisieren">${esc(t("heute.offen.fassung"))}</button>` : ""}
    </div>
    ${nav("start", { mascot: nutzen.summe > 0 ? "freundlich" : "neutral" })}`;
}
// Vertrag von Zoro: summe ist bereits ausschließlich gemessen. Schätzungen niemals addieren.
// Ohne Messung auch dann keine Zahl, wenn ein geschätzter Posten vorliegt.
export function nutzenKarte(nutzen) {
  if (nutzen.leer && !nutzen.ab) return ""; // Baris 27.10.2026: „Ab erstem Müll-Eintrag“ entfällt – versteht niemand, kostet Wörter auf Heute
  if (nutzen.leer) return `<section class="karte h-nutzen h-nutzen-leer" aria-label="${esc(t("nutzen.titel"))}"><span data-t="nutzen.laueft">${esc(nutzen.ab ? t("nutzen.laueft", datumLesbar(nutzen.ab)) : t("nutzen.start"))}</span></section>`;
  const symbole = { muell: "trash-2", preis: "receipt", lager: "package", papier: "file-text" };
  const geschaetzte = nutzen.posten.filter((p) => !p.gemessen && typeof p.euro === "number" && p.euro > 0);
  return `<section class="karte h-nutzen ${nutzen.summe > 0 ? "h-nutzen-plus" : "h-nutzen-null"}" aria-label="${esc(t("nutzen.titel"))}" aria-description="${esc(nutzen.posten.filter((p) => p.gemessen).map((p) => p.quelle).join(" · "))}">
    <span class="h-nutzen-titel" data-t="nutzen.titel">${esc(t("nutzen.titel"))}</span>
    <b class="h-nutzen-summe">${esc(fmtEuro(nutzen.summe, { dezimal: 2 }))}</b>
    ${geschaetzte.length ? `<div class="h-nutzen-posten">${geschaetzte.map((p) => `<span class="h-nutzen-geschaetzt" aria-label="${esc(t("nutzen.art." + p.art))}: ≈ ${esc(fmtEuro(p.euro, { dezimal: 2 }))}" aria-description="${esc(p.quelle)}" title="${esc(p.quelle)}">${sym(symbole[p.art])}<span>≈ ${esc(fmtEuro(p.euro, { dezimal: 2 }))}</span></span>`).join("")}</div>` : ""}
  </section>`;
}
const tagKurz = (H) => { const [j, m, d] = H.split("-").map(Number); try { return datumText(new Date(j, m - 1, d), { weekday: "short", day: "numeric", month: "short" }); } catch { return datumLesbar(H); } };

// Zielkarte im Laden: Stufe als Überschrift, eine große Zahl, Balken vom Monatsumsatz bis zur Zielmarke, Tempo als kleine Pille.
// Trennung 2 (17.10.2026): alle Zahlen aus heuteZiel() (js/laden_zahlen.js); hier entsteht nur der Tempo-Satz.
function zielTexte(stand, z, H) {
  const w = heuteZiel(stand, z, H);
  const tempo = !w.tempo ? null : w.tempo.art === "gut" ? { art: "gut", text: t("heute.tempoGut", datumLesbar(w.tempo.am).slice(0, 6)) } : { art: "knapp", text: t("heute.tempoKnapp", fmtEuro(w.tempo.proTag, { dezimal: 0 })) };
  return { ...w, tempo };
}
function heuteZielKarte(stand, z, H) {
  const w = zielTexte(stand, z, H); const { m } = w;
  // Masterauftrag „Gehirn“ 0.1 (28.10.2026): ohne Miete oder Löhne keine Euro-Zahl, sondern der nächste Eintrag
  if (w.fehlt) return `<button type="button" class="karte h-ziel h-ziel-fehlt" ${zielAttr(w.fehlt === "miete" ? { aktion: "bearbeiten", schritt: "kosten-miete", bis: "kosten-miete" } : { aktion: "bearbeiten", schritt: "lohn" })} data-fehlt="${esc(w.fehlt)}">
    <span class="h-riesig leicht" aria-label="${esc(t("nutzen.stufe.bisNull"))}">?</span>
    <span class="h-fehlt-knopf">${esc(t("heute.fehlt." + w.fehlt))}${sym("chevron-right", "h-pfeil")}</span>
  </button>`;
  // Sanji-Entwurf C (Baris 20.10.2026, 19:4x): Lorbeer oben rechts, Kursdiagramm (Monatsumsatz kumuliert, Linie mit Fläche) mit
  // gestrichelter Ziellinie (beschriftet mit dem Betrag, 15-Wörter-Regel) statt Balken; ohne Überzeile „Heute“ (steht schon in der Leiste); das Tempo steht als kleine Zeile unter der großen Zahl.
  return `<button type="button" class="karte h-ziel h-ziel-kurs ${w.stufe === "ueberZiel" ? "plus" : ""}" data-a="nav" data-wert="umsatz" aria-description="${esc([t("cockpit.kalkulatorisch"), w.tempo?.text].filter(Boolean).join(" · "))}">
    ${LORBEER}
    <span class="h-zielkopf"><span data-t="nutzen.stufe.${esc(w.stufe)}">${esc(t("nutzen.stufe." + w.stufe))}</span></span>
    <span class="h-riesig ${m.geschaetzt ? "leicht" : ""}">${w.zahl === null ? "–" : `<bdi dir="ltr">${m.geschaetzt ? "≈ " : ""}${w.stufe === "ueberZiel" ? "+" : ""}${fmtEuro(w.zahl, { dezimal: 0 })}</bdi>`}</span>
    ${w.stufe === "bisNull" && w.bewegung && Math.abs(w.bewegung.betrag) >= 1 ? `<span class="h-bewegung ${w.bewegung.betrag < 0 ? "gut" : "schlecht"}">${esc(t("heute.bewegung", (w.bewegung.betrag < 0 ? "−" : "+") + " " + fmtEuro(Math.abs(w.bewegung.betrag), { dezimal: 0 })))}</span>` : ""}
    ${""/* Baris 24.10.2026: Wort „Schätzung“ entfällt im Laden (≈ vor der Zahl reicht, 15-Wörter-Budget wegen Wörtern unter den Icons) */}
    ${m.ziel === null ? `<span class="h-unter" data-t="nutzen.ohneKosten">${esc(t("nutzen.ohneKosten"))}</span>` : kursDiagramm(m, w.marke, z, w.stufe)}
  </button>`; // Laden-Umbau (20.10.2026): die Zeile „Richtwert · Preise eintragen“ wohnt im Büro (Bereich „Geld“ und „Ware“ → Einkaufspreise)
}

// Kursdiagramm der Zielkarte (Sanji-Entwurf 20.10.2026): x = Tag im Monat, y = Umsatz kumuliert; Ziellinie = Marke (null bzw. Ziel).
// Daten aus monatsZiel (m.tage: kumuliert bis heute) – die Oberfläche rechnet nichts Neues, sie zeichnet nur.
export function kursDiagramm(m, marke, z, stufe = "bisZiel") {
  const alle = z?.tage || []; const n = Math.max(2, alle.length); const ist = (m.tage || []).filter((x) => x.umsatz !== null || x.kumuliert > 0);
  const W = 312, X0 = 4, Y0 = 142, HH = 126;
  const max = Math.max(marke || 0, ...(m.tage || []).map((x) => x.kumuliert || 0), 1) * 1.12;
  const idx = (d) => Math.max(0, alle.findIndex((x) => x.datum === d));
  const X = (i) => (X0 + i / (n - 1) * W).toFixed(1), Y = (v) => (Y0 - v / max * HH).toFixed(1);
  const tage = m.tage || []; const pfad = tage.map((x, i) => `${i ? "L" : "M"}${X(idx(x.datum))},${Y(x.kumuliert || 0)}`).join(" ");
  const letzt = tage[tage.length - 1]; const yz = Y(marke || 0);
  const tag = (d) => (d ? datumLesbar(d).slice(0, 6) : "");
  // Baris 24.10.2026: Texte nicht mehr im gestreckten SVG (preserveAspectRatio none verzerrte Zahlen und Datum), sondern als HTML darüber.
  const zielProzent = ((165 - Number(yz)) / 165 * 100).toFixed(1);
  return `<span class="h-kurswrap"><svg class="h-kurs" viewBox="0 0 320 165" preserveAspectRatio="none" role="img" aria-label="${esc(t("heute.zielLinie"))}">
    <line class="h-kurs-ziel" x1="4" x2="316" y1="${yz}" y2="${yz}"/>
    <line class="h-kurs-achse" x1="4" x2="316" y1="142" y2="142"/>
    ${tage.length && ist.length ? `<path class="h-kurs-flaeche" d="${pfad} L${X(idx(letzt.datum))},142 L${X(idx(tage[0].datum))},142 Z"/><path class="h-kurs-linie" d="${pfad}"/><circle class="h-kurs-punkt" cx="${X(idx(letzt.datum))}" cy="${Y(letzt.kumuliert || 0)}" r="5"/>` : ""}
  </svg><span class="h-kurs-ziellabel" style="bottom:calc(${zielProzent}% + 3px)">${stufe === "bisNull" ? "" : esc(t("heute.zielKurz")) + " "}${esc(fmtEuro(marke || 0, { dezimal: 0 }))}</span><span class="h-kurs-tag links">\u2066${esc(tag(z?.start && z.start > (alle[0]?.datum || "") ? z.start : alle[0]?.datum))}\u2069</span><span class="h-kurs-tag rechts">\u2066${esc(tag(alle[alle.length - 1]?.datum))}\u2069</span></span>`;
}
// Lorbeer und Kupferlinie aus Sanjis Entwurf (inline-SVG, Farben aus den Tokens)
const LORBEER = `<svg class="h-lorbeer" viewBox="0 0 44 60" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 53 C4 40 4 23 14 7"/><path d="M32 53 C40 40 40 23 30 7"/></g><g fill="currentColor"><ellipse cx="8" cy="42" rx="3" ry="7" transform="rotate(-34 8 42)"/><ellipse cx="6" cy="31" rx="3" ry="7" transform="rotate(-12 6 31)"/><ellipse cx="9" cy="20" rx="3" ry="7" transform="rotate(19 9 20)"/><ellipse cx="15" cy="11" rx="2.5" ry="6" transform="rotate(39 15 11)"/><ellipse cx="36" cy="42" rx="3" ry="7" transform="rotate(34 36 42)"/><ellipse cx="38" cy="31" rx="3" ry="7" transform="rotate(12 38 31)"/><ellipse cx="35" cy="20" rx="3" ry="7" transform="rotate(-19 35 20)"/><ellipse cx="29" cy="11" rx="2.5" ry="6" transform="rotate(-39 29 11)"/></g></svg>`;

// Vier Kacheln: Symbol + Zahl. Kühlung zeigt den schlechtesten Wert (rot) oder „OK“ oder „2 offen“; Putzen erledigt/gesamt heute.
// Trennung 2 (17.10.2026): Zahlen und Zustand aus heuteKachelZahlen() (js/laden_zahlen.js); hier entstehen nur die kurzen Texte.
// Laden-Umbau (20.10.2026): eine schmale Reihe aus vier gleich großen Feldern – oben Zahl, Haken oder „+“, darunter ein Wort.
// Kühlung zeigt den schlechtesten Wert (rot), einen Haken (alles gemessen) oder die Zahl offener Stellen; Putzen erledigt/gesamt.
// Trennung 2 (17.10.2026): Zahlen und Zustand aus heuteKachelZahlen() (js/laden_zahlen.js); hier entstehen nur die kurzen Texte.
function kachelTexte(stand, ks, H) {
  const w = heuteKachelZahlen(stand, ks, H);
  const k = w.kuehl;
  const kuehl = !k ? { wert: "–", alarm: false } : k.art === "abweichung" ? { wert: `\u2066${fmtZahl(k.wert, Number.isInteger(k.wert) ? 0 : 1)}\u00a0°C\u2069`, alarm: true }
    : k.art === "ok" ? { wert: sym("check"), alarm: false, html: true } : k.art === "ruhetag" ? { wert: "–", alarm: false } : { wert: String(k.anzahl), alarm: false, offen: true };
  const putz = w.putz ? { wert: `\u2066${w.putz.erledigt}/${w.putz.gesamt}\u2069`, alarm: w.putz.alarm } : { wert: "–", alarm: false };
  return { umsatz: w.umsatz, muell: w.muell, kuehl, putz };
}
function heuteKachelnLaden(stand, ks, H) {
  const w = kachelTexte(stand, ks, H);
  // Leeres Feld zeigt seinen ersten Handgriff („+“ in Orange, Text für Vorlesehilfen) statt „–“ (Entrümpelung Punkt 5, 18.10.2026)
  const symbole = { umsatz: "wallet", muell: "trash-2", kuehl: "snowflake", putz: "spray-can" };
  const feld = (cls, wortKey, wert, ziel, alarm, handgriff, html = false) => `<button type="button" class="karte h-kachel h-feld ${cls} ${alarm ? "alarm" : ""} ${handgriff ? "leer" : ""}" ${ziel} aria-label="${esc(t(wortKey))}: ${esc(handgriff || (html ? (alarm ? wert : t("heute.ok")) : wert))}">${sym(symbole[cls], "h-feld-symbol")}${handgriff ? `<b class="handgriff">${sym("plus")}</b>` : `<b class="zahl">${html ? wert : esc(wert)}</b>`}<small>${esc(t(wortKey))}</small></button>`; // Baris 24.10.2026: ein Wort unter jedem Icon
  return feld("umsatz", "ladenSchirm.umsatz", w.umsatz === null ? "" : fmtEuro(w.umsatz, { dezimal: 0 }), 'data-a="nav" data-wert="umsatzheute"', false, w.umsatz === null && t("schnellknopf.umsatz"))
    + feld("muell", "ebene.tabs.muell", w.muell === null ? "" : fmtEuro(w.muell, { dezimal: w.muell < 10 ? 2 : 0 }), 'data-a="nav" data-wert="muell"', false, w.muell === null && t("schnellknopf.muell"))
    + feld("kuehl", "ebene.tabs.kuehl", w.kuehl.wert, 'data-a="nav" data-wert="kuehl"', w.kuehl.alarm, !ks.eingerichtet && t("schnellknopf.kuehl"), w.kuehl.html || w.kuehl.alarm)
    + feld("putz", "ebene.tabs.putzplan", w.putz.wert, 'data-a="nav" data-wert="putzplan"', w.putz.alarm, w.putz.wert === "–" && t("menue.putzplan"));
}
// Laden-Umbau (20.10.2026): „Jetzt dran“ ist die eine Haupthandlung – ein großer oranger Knopf (ohne eigenen „Los“-Knopf).
// Zeki auf Heute (Baris Ja 26.10.2026): Zeki steht neben dem einen Knopf. Beim ersten Mal am Tag je Lage sagt er seinen Satz
// in einer Blase und macht seine Bewegung; nach ≈ 7 s blendet CSS die Blase aus und den Knopf ein (15-Wörter-Regel im Ruhezustand).
// Welche Lage und welcher Satz: js/zeki.js. Ob schon gesehen: extra.zekiGesehen (Set „auslöser:Tag“, hält app.js im Browser).
const ZEKI_ZUSTAND = { kuehl_abweichung: "warnung", kuehl_offen: "aufmerksam", umsatz_fehlt: "frage", karte_leer: "hilfe", preis_fehlt: "preis", erster_muell: "aufmerksam", muell_hoch: "warnung", ziel_erreicht: "freude", tag_abgeschlossen: "bestaetigt", inventur_faellig: "aufmerksam", sicherung_alt: "warnung", hinweis_neu: "hilfe" };
export function zekiReihe(stand, H, dran, extra = {}) {
  // Baris 26.10.2026 23:42: keine zweite Zeki-Figur auf Heute – Zeki steht oben rechts als eigene Ebene und spricht dort (app.js zekiBildschirm).
  // Mitmach-Rundgang (28.10.2026, 7.3): solange kein Gericht ein eigenes Rezept hat, steht hier fest Zekis Frage mit „Jetzt“ (führt direkt zur
  // Mengenfrage). Sie ersetzt die Zeile (15-Wörter-Regel) und geht der Zeki-Rotation vor; nur ein Kühl-Alarm bleibt wichtiger.
  // Eine Haupthandlung (Gegenprüfung 28.10.2026): fehlt noch Miete oder Personal (heuteZiel().fehlt), kommt das zuerst – das Rezept wartet.
  const r = rezeptFortschritt(stand);
  if (r.gesamt && !r.mit && dran?.id !== "kuehlAlarm" && !extra.fehlt) { const frage = t("heute.rezeptErinnerung.frage"), jetzt = t("heute.rezeptErinnerung.knopf");
    return `<button type="button" class="zeki-zeile h-rezept-text a-gelb" data-a="rezept-direkt" dir="auto">${esc(frage)}</button>
      <div class="h-zeki h-zeki--ohne-figur h-rezept"><button type="button" class="jetzt h-jetzt h-haupt h-rezept-jetzt normal" data-a="rezept-direkt" data-ort="heute" aria-label="${esc(frage)} ${esc(jetzt)}"><span class="ks">${sym("scale")}</span><span class="h-jetzt-text"><b>${esc(jetzt)}</b></span>${sym("chevron-right", "h-pfeil")}</button></div>`; }
  return dran ? `<div class="h-zeki h-zeki--ohne-figur">${jetztKarte(dran)}</div>` : "";
}
function jetztKarte(d) {
  return `<button type="button" class="jetzt h-jetzt h-haupt ${d.ton}" ${zielAttr(d.ziel)} data-dran="${esc(d.id)}" aria-label="${esc(d.titel)}: ${esc(d.knopf)}"><span class="ks">${sym(d.symbol)}</span><span class="h-jetzt-text"><b data-t="nutzen.aktion.${esc(d.id)}">${esc(d.id === "selbst" ? d.titel : t("nutzen.aktion." + d.id))}</b></span>${sym("chevron-right", "h-pfeil")}</button>`;
}

// Schmale Zeile auf anderen Seiten, solange ein offener Schritt die Seite betrifft
export function einrichtungZeile(e, ids) {
  if (e.prozent >= 100 || !e.schritte.some((x) => ids.includes(x.id) && !x.fertig)) return "";
  return `<button type="button" class="einrichtungzeile" data-a="nav" data-wert="start">${esc(t("einrichtung.kurz", e.prozent))}</button>`;
}

export function zaehlerKarte(z, H, { tipp = true, ziel = null } = {}) {
  // 27.10.2026 (Baris: eine Rechnung): Mit „ziel“ (heuteZiel) zeigt das Büro dieselbe große Zahl wie der Laden; der Stand heute steht darunter.
  if (ziel && ziel.zahl !== null && ziel.m?.nullpunkt !== null) return zaehlerKarteMonat(z, H, ziel);
  const vorUmsatz = null;
  const monat = monatName(H);
  const grau = z.keinUmsatz;
  const satz = grau ? t("cockpit.keinUmsatz") : z.imPlus ? (z.kippTag ? t("cockpit.seitArbeitest", datumLesbar(z.kippTag).slice(0, 6)) : "") : z.reichtNicht ? t("cockpit.reichtNicht") : z.nullTag ? t("cockpit.nullAm", datumLesbar(z.nullTag).slice(0, 6)) : "";
  return `<${tipp ? 'button type="button" data-a="nav" data-wert="umsatz"' : "div"} class="karte dunkel zaehler ${grau ? "grau" : z.imPlus ? "plus" : "minus"}">
    <small class="lbl">${esc(z.imPlus ? t("cockpit.verdient", monat) : t("cockpit.bisNull", monat))}</small>
    <span class="riesig">${grau ? (vorUmsatz ? `${vorUmsatz.geschaetzt ? "≈ " : ""}${fmtEuro(vorUmsatz.zahl, { dezimal: 0 })}` : "–") : `${z.imPlus ? "+" : "−"} ${fmtEuro(Math.abs(z.stand))}`}</span>
    ${grau ? "" : monatsKurve(z, H)}
    <small>${esc(satz)}</small>
    ${z.unvollstaendig ? `<small class="warn">${esc(t("cockpit.unvollstaendig"))}</small>` : ""}
    <small class="fein">${esc(t("cockpit.kalkulatorisch"))} · ${esc(t("cockpit.stufe." + z.stufe))}${(!grau || vorUmsatz) && z.start > z.monat.von ? ` · ${esc(t("zaehler.zaehltAb", datumLesbar(z.start).slice(0, 6)))}` : ""}</small>
  </${tipp ? "button" : "div"}>`;
}

function zaehlerKarteMonat(z, H, w) {
  const monat = monatName(H); const g = w.m.geschaetzt ? "≈ " : "";
  const label = w.stufe === "bisNull" ? t("cockpit.bisNull", monat) : w.stufe === "bisZiel" ? t("zaehler.zumZiel", monat) : t("cockpit.verdient", monat);
  const zahl = `${g}${w.stufe === "ueberZiel" ? "+ " : ""}${fmtEuro(w.zahl, { dezimal: 0 })}`;
  // Persona-Test Wirt (27.10.2026): an einem Vortag stand „Heute stehst du bei …“ und „seit gestern“ – jetzt mit Datum, ohne Tagesvergleich.
  const istHeute = H === heuteGeschaeft(); const betrag = `${z.stand >= 0 ? "+" : "−"} ${fmtEuro(Math.abs(z.stand), { dezimal: 0 })}`;
  // Nachtest 27.10.2026: „Heute stehst du bei + 500 €“ neben „bis null fehlen 4.065 €“ verwirrte – eine Zahl (Baris B, 02:13); nur an Vortagen der Stand mit Datum
  const heuteZeile = z.keinUmsatz ? t("cockpit.keinUmsatz") : istHeute ? "" : t("zaehler.standTagZeile", datumLesbar(H).slice(0, 6), betrag);
  const erklaerung = "";
  return `<div class="karte dunkel zaehler ${w.stufe === "bisNull" ? "minus" : "plus"}">
    <small class="lbl">${esc(label)}</small>
    <span class="riesig">${zahl}</span>
    ${istHeute && w.bewegung && Math.abs(w.bewegung.betrag) >= 1 && w.stufe === "bisNull" ? `<small class="h-bewegung ${w.bewegung.betrag < 0 ? "gut" : "schlecht"}">${esc(t("heute.bewegung", (w.bewegung.betrag < 0 ? "−" : "+") + " " + fmtEuro(Math.abs(w.bewegung.betrag), { dezimal: 0 })))}</small>` : ""}
    ${heuteZeile ? `<small>${esc(heuteZeile)}</small>` : ""}${erklaerung}
    ${z.unvollstaendig ? `<small class="warn">${esc(t("cockpit.unvollstaendig"))}</small>` : ""}
    <small class="fein">${esc(t("cockpit.kalkulatorisch"))} · ${esc(t("zaehler.lohnTageZeile", z.lohnEchtTage || 0))}</small>
  </div>`;
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

// Datenschutz im Büro (Baris 27.10.2026: Verantwortlicher als Platzhalter bis zur Firma); Text in js/data/datenschutz.js
function datenschutzKarte() {
  const d = datenschutzText(sprache());
  return `<details class="karte ds-karte" id="datenschutz"><summary><h2>${esc(d.titel)}</h2><small>${esc(d.stand)}</small></summary>
    ${d.abschnitte.map(([k, x]) => `<h3>${esc(k)}</h3><p>${esc(x)}</p>`).join("")}
    <p class="ds-verantwortlich">${esc(d.verantwortlich)}</p>
    <button type="button" class="knopf zweit" data-a="zeki-log-loeschen">${esc(d.zekiLoeschen)}</button></details>`;
}
export function einstellungenView(stand, ereignisAnzahl, wurzel, extra = {}) {
  const m = monatsLast(stand); const q = warenQuote(stand); const st = umsatzSteuerSatz(stand);
  return `
    <div class="buero b-einstellungen">
    ${bueroKopf({ ziel: "buero", text: t("buero.titel") }, t("einstellungen.titel"))}
    <div class="kopfband"><h1>${esc(t("einstellungen.titel"))}</h1><div class="unter">${esc(t("einstellungen.fassung"))}${extra.fassung ? ` · ${esc(extra.fassung)}` : ""}</div></div>
    <div class="inhalt einstellungen-inhalt">
      <button type="button" class="knopf zweit b-sicherung-link" data-a="nav" data-wert="einstellungen" data-anker="sicherung">${sym("download")} ${esc(t("einstellungen.sicherung"))}</button>
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
        <div class="zeile rechtsform"><div class="oben"><div class="name">${esc(t("rechtsform.titel"))}<small>${esc(t("rechtsform.hinweis"))}</small></div></div>
          <div class="kacheln rechtsformwahl" role="group" aria-label="${esc(t("rechtsform.titel"))}">${RECHTSFORMEN.map((r) => `<button type="button" class="kachel ${rechtsform(stand) === r ? "an" : ""}" data-a="rechtsform" data-wert="${r}" aria-pressed="${rechtsform(stand) === r}"><b>${esc(t("rechtsform.namen." + r))}</b></button>`).join("")}</div></div>
      </div>
      ${(() => { const uhr = (h) => (typeof h === "number" ? `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}` : ""); const rz = ruhezeitenVon(stand); const r = [0, 1].map((i) => rz[i] || [null, null]);
        return `<div class="karte b-ruhezeiten"><h2>${esc(t("einstellungen.ruhe.titel"))}</h2><p class="hinweis">${esc(t("einstellungen.ruhe.hinweis"))}</p>
        ${r.slice(0, 2).map(([v, b], i) => `<div class="feldzeile ruhezeile"><label for="ruhe-${i}-von">${esc(t("einstellungen.ruhe.von"))}</label><input type="time" id="ruhe-${i}-von" class="textfeld" data-f="ruhe-${i}-von" value="${uhr(v)}"><label for="ruhe-${i}-bis">${esc(t("einstellungen.ruhe.bis"))}</label><input type="time" id="ruhe-${i}-bis" class="textfeld" data-f="ruhe-${i}-bis" value="${uhr(b)}"></div>`).join("")}</div>`; })()}
      <div class="karte">
        <h2>${esc(t("einstellungen.sprache"))}</h2>
        <div class="chips">${SPRACHEN.map((s) => `<button type="button" class="chip ${sprache() === s ? "an" : ""}" data-a="sprache" data-wert="${s}" lang="${s}">${esc(spracheName(s))}</button>`).join("")}</div>
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
        ${(() => { const tg = sicherungStufe(wurzel)?.tage ?? null; return `<p class="pw-letzte ${tg === null || tg >= 7 ? "rot" : ""}">${esc(tg === null ? t("ladenSchirm.sicherung.nieWeg") : t("ladenSchirm.sicherung.letzteWeg", tg))}</p>`; })()}
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
      ${datenschutzKarte()}
      <div class="karte">
        <button type="button" class="knopf warn" data-a="loeschen">${esc(t("einstellungen.loeschenAlles"))}</button>
      </div>
    </div>
    </div>`;
}
