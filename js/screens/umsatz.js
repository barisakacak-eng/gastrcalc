// Etappe 5: „Umsatz" – Tagesumsatz eintragen und die Zähler-Seite (Strecke, Prognose, Rechnung, Monatsstreifen, Preise).
import { t, sprache, artikelText } from "../i18n.js";
import { esc, parseZahl, fmtEuro, fmtZahl, heuteGeschaeft as heute, wertAnzeige } from "../util.js"; // Paket 3 (16.10.2026), M7: auf dieser Seite ist „heute“ der Geschäftstag (bis 4 Uhr = Vortag)
import { umsatzEintrag, umsatzKonflikte, tagesnotizSetzen, tagesnotizLoeschen, tagesnotizenFestschreiben, umsatzSteuerSatz, schwundAuswertung, wareneinsatzWarnung, RICHTWERT_WARENEINSATZ } from "../engine.js"; // Paket 3 (16.10.2026), M4/M15
import { zaehler, monatsGrenzen, umsatzAnzeigeWert, umsatzAusEingabe, zaehlerStrecke, monatTagStatus, wochentagSpalte } from "../zaehler.js"; // Trennung 2 (17.10.2026)
import { tagPlus } from "../engine.js";
import { preisAenderungen, preisAnzeige } from "../lieferung.js";
import { nav } from "./nav.js";
import { datumLesbar, monatName, tagGewaehlt } from "./tag.js";
import { zaehlerKarte } from "./home.js";

let umsatzBasis = "brutto"; // Schalter am Feld: Kasse ist brutto; wer netto tippt, bekommt es brutto gespeichert (der Zähler rechnet netto)
let mehrTage = false;       // Datumsleiste bis zum Monatsanfang ausgeklappt (Nachtest Etappe 5, Punkt 4)

const letzteTage = (n) => { const out = []; for (let i = 0; i < n; i++) { const d = new Date(); d.setDate(d.getDate() - i); out.push(heute(d)); } return out; }; // Geschäftstage rückwärts
// Chips: die letzten 7 Tage, dazu auf Wunsch alle Tage bis zum Monatsanfang (und der Vormonat ab dem 7. Tag nicht mehr)
function tagChips(D) {
  const H = heute(); const tage = letzteTage(7);
  if (mehrTage) { const M = monatsGrenzen(H); for (let d = tagPlus(tage[tage.length - 1], -1); d >= M.von; d = tagPlus(d, -1)) tage.push(d); }
  return `<div class="chips">${tage.map((d, i) => `<button type="button" class="chip klein ${D === d ? "an" : ""}" data-a="tag-datum" data-wert="${d}">${esc(i === 0 ? t("tag.titel") : i === 1 ? t("tag.gestern") : datumLesbar(d).slice(0, 5))}</button>`).join("")}${mehrTage || tagPlus(tage[tage.length - 1], -1) < monatsGrenzen(H).von ? "" : `<button type="button" class="chip klein" data-a="umsatz-mehr-tage">${esc(t("zaehler.frueher"))}</button>`}</div>`;
}

// Wochentage Mo–So in der App-Sprache (Kalender mit 7 Spalten, Prüfung 15.10.)
const wochentagKopf = () => { const f = new Intl.DateTimeFormat(sprache(), { weekday: "short" }); return Array.from({ length: 7 }, (_, i) => `<span class="wt">${f.format(new Date(2026, 9, 12 + i)).replace(".", "").slice(0, 2)}</span>`).join(""); };
export function umsatzView(stand) {
  const H = heute(); const D = tagGewaehlt(); const nach = D !== H;
  const z = zaehler(stand, { datum: D }); const st = umsatzSteuerSatz(stand);
  const notiz = umsatzEintrag(stand, D); const konflikte = umsatzKonflikte(stand);
  const wert = notiz ? umsatzAnzeigeWert(notiz.umsatz, umsatzBasis, st.satz) : null; // Trennung 2 (17.10.2026)
  const tageBis = Math.round(z.gewichtBisHeute), tageMonat = Math.round(z.gewichtMonat);
  return `
    <div class="kopfband"><h1>${esc(t("zaehler.titel"))}</h1><div class="unter">${esc(t("zaehler.unter", monatName(D), tageBis, tageMonat))}</div></div>
    <div class="inhalt">
      ${tagChips(D)}
      ${nach ? `<div class="tipp">${esc(t("tag.nacherfassenHinweis"))}</div>` : ""}
      ${konflikte.length ? `<div class="karte hinweisgelb"><h2>${esc(t("tag.konfliktTitel"))}</h2><div>${esc(t("tag.konfliktText", konflikte.map(datumLesbar).join(", ")))}</div></div>` : ""}
      <div class="karte">
        <h2>${esc(t("tag.umsatz"))}${nach ? ` <span class="marke">${esc(datumLesbar(D))}</span>` : ""}</h2>
        <div class="zahlfeld klein"><input inputmode="decimal" data-f="umsatz" value="${esc(wertAnzeige(wert))}" placeholder="" aria-label="${esc(t("tag.umsatz"))}"><span class="einheit">€</span>
          <span class="seg">${["brutto", "netto"].map((b) => `<button type="button" class="${umsatzBasis === b ? "an" : ""}" data-a="umsatz-basis" data-wert="${b}">${esc(t("zaehler.umsatzBasis." + b))}</button>`).join("")}</span></div>
        <span class="marke">${esc(umsatzBasis === "netto" && notiz ? t("zaehler.nettoGespeichert", fmtEuro(notiz.umsatz, { dezimal: 2 })) : t("tag.umsatzHinweis"))}</span>
      </div>
      ${zaehlerKarte(z, D, { tipp: false })}
      ${streckeKarte(z, st)}
      ${prognoseKarte(z)}
      ${gesternKarte(stand, z, D)}
      ${rechnungKarte(z)}
      ${monatKarte(z, D)}
      ${preiseKarte(stand, D)}
      <button type="button" class="zeileknopf" data-a="nav" data-wert="listen"><span><b>${esc(t("zaehler.listen"))}</b><small>${esc(t("zaehler.listenKurz"))}</small></span><span class="pfeil">›</span></button>
      <button type="button" class="zeileknopf" data-a="nav" data-wert="beleg"><span><b>${esc(t("beleg.belege"))}</b><small>${esc(t("zaehler.belegeKurz"))}</small></span><span class="pfeil">›</span></button>
      <p class="hinweis">${esc(t("cockpit.kalkulatorischSatz"))}</p>
    </div>
    ${nav("umsatz")}`;
}

// Die Strecke: von „alle Kosten des Monats offen" (links) bis „Monatsende" (rechts), Marke heute und Marke null.
function streckeKarte(z, st) {
  if (z.keinUmsatz) return `<div class="karte"><h2>${esc(t("zaehler.strecke"))}</h2><p class="hinweis">${esc(t("zaehler.nochKeinSchnitt"))}</p></div>`;
  const sk = zaehlerStrecke(z); // Trennung 2 (17.10.2026): Lage in Prozent aus js/zaehler.js
  return `<div class="karte"><h2>${esc(t("zaehler.strecke"))}</h2>
    <div class="strecke" style="--null:${sk.null}%"><i class="heute" style="left:${sk.heute}%" data-l="${esc(t("zaehler.heute"))}"></i><i class="null" style="left:${sk.null}%" data-l="${esc(t("zaehler.null"))}${sk.nullTag ? " · " + esc(datumLesbar(sk.nullTag).slice(0, 6)) : ""}"></i></div>
    <small class="marke">${esc(t("zaehler.jederTag", fmtEuro(sk.beispiel), fmtEuro(sk.bringt)))} ${esc(t("zaehler.legendeStrecke"))}</small></div>`;
}

function prognoseKarte(z) {
  if (z.dbProTag === null) return "";
  const zeile = (k, v) => `<div class="summenzeile"><span>${esc(t("zaehler." + k))}</span><span class="wert">${v}</span></div>`;
  return `<div class="karte"><h2>${esc(t("zaehler.wennSoWeiter"))}</h2>
    ${zeile("nullAm", z.imPlus ? `<span class="gruen">✓</span>` : z.nullTag ? esc(datumLesbar(z.nullTag).slice(0, 6)) : `<span class="rot">${esc(t("zaehler.nieDiesenMonat"))}</span>`)}
    ${zeile("monatsende", `<span class="${z.monatsende >= 0 ? "gruen" : "rot"}">${z.monatsende >= 0 ? "+" : "−"} ${fmtEuro(Math.abs(z.monatsende))}</span>`)}
    ${zeile("tagesschnitt", fmtEuro(z.dbProTag))}
    ${zeile("tageskosten", fmtEuro(z.tageskosten))}
    ${z.noetigProTag !== null && !z.imPlus ? zeile("noetig", fmtEuro(z.noetigProTag)) : ""}
  </div>`;
}

function gesternKarte(stand, z, D) {
  if (z.keinUmsatz || !z.tage.find((x) => x.datum === D)?.umsatz) return "";
  const sw = schwundAuswertung(stand, { von: D, bis: D });
  const vor = z.standGestern;
  return `<div class="karte ${z.bewegungHeute >= 0 ? "gruenrand" : "rotrand"}"><h2>${esc(t("zaehler.gestern"))}</h2>
    <div class="mid ${vor >= 0 ? "gruen" : "rot"}">${vor >= 0 ? "+" : "−"} ${fmtEuro(Math.abs(vor))}</div>
    <small class="marke">${esc(z.bewegungHeute >= 0 ? t("zaehler.naeher", fmtEuro(Math.abs(z.bewegungHeute))) : t("zaehler.weiterWeg", fmtEuro(Math.abs(z.bewegungHeute))))}${sw.muellwert > 0 && z.stufe !== 3 ? " " + esc(t("zaehler.tonneGefressen", fmtEuro(sw.muellwert, { dezimal: 2 }))) : ""}</small></div>`;
}

function rechnungKarte(z) {
  const zeile = (text, v, cls = "") => `<div class="summenzeile"><span>${esc(text)}</span><span class="wert ${cls}">${v}</span></div>`;
  return `<div class="karte"><h2>${esc(t("zaehler.soRechnet"))}</h2>
    ${zeile(t("zaehler.fixBis"), fmtEuro(z.fix))}
    ${zeile(t("zaehler.lohnBis"), z.last.lohnOffen ? `<span class="marke offen">${esc(t("allgemein.offen"))}</span>` : fmtEuro(z.lohn))}
    ${zeile(t("zaehler.eigenBis"), z.last.eigen.betrag === null ? `<span class="marke offen">${esc(t("allgemein.offen"))}</span>` : fmtEuro(z.eigen))}
    ${z.sonderBis > 0 ? zeile(t("zaehler.sonderBis", z.sonder.belege.length), fmtEuro(z.sonderBis)) : ""}
    ${zeile(z.stufe === 3 ? t("zaehler.wareBelege") : z.stufe === 2 ? t("zaehler.wareGeschaetzt", fmtZahl(z.quote * 100, 0)) : t("zaehler.wareRichtwert", fmtZahl(z.quote * 100, 0)), `${z.stufe < 3 ? "≈ " : ""}${fmtEuro(z.ware)}`)}
    ${z.stufe === 3 ? "" : zeile(t("zaehler.muellBis"), fmtEuro(z.muell, { dezimal: z.muell < 100 ? 2 : 0 }))}
    ${zeile(t("zaehler.umsatzBis"), fmtEuro(z.umsatzNetto), "gruen")}
    <small class="marke">${esc(t("zaehler.umsatzBruttoHinweis", fmtEuro(z.umsatzBrutto), fmtZahl(z.steuer * 100, 1)))} · ${esc(t("zaehler.steuerQuelle." + z.steuerQuelle))} · ${esc(t("zaehler.quoteQuelle." + z.quoteQuelle))}${z.start > z.monat.von ? ` · ${esc(t("zaehler.zaehltAb", datumLesbar(z.start).slice(0, 6)))}` : ""}</small>
    ${z.quoteQuelle === "richtwert" ? `<span class="marke geschaetzt">${esc(t("zaehler.richtwertErklaerung", fmtZahl(RICHTWERT_WARENEINSATZ.min * 100, 0), fmtZahl(RICHTWERT_WARENEINSATZ.max * 100, 0), RICHTWERT_WARENEINSATZ.quelle))}</span>` : ""}
    ${wareneinsatzWarnung(z.quoteEff) && z.quoteQuelle !== "richtwert" ? `<span class="marke offen">${esc(t("zaehler.quoteHoch", fmtZahl(z.quoteEff * 100, 0)))}</span>` : ""}
  </div>`;
}

function monatKarte(z, D) {
  return `<div class="karte"><h2>${esc(t("zaehler.monat"))}</h2>
    <div class="monat">${wochentagKopf()}${z.tage.map((x, i) => { const cls = monatTagStatus(x, z); return `<i class="${cls} ${x.datum === D ? "heute" : ""}"${i === 0 ? ` style="grid-column-start:${wochentagSpalte(x.datum)}"` : ""}>${Number(x.datum.slice(8))}</i>`; }).join("")}</div>
    <small class="marke">${esc(t("zaehler.legendeMonat"))}</small></div>`;
}

function preiseKarte(stand, D) {
  const l = preisAenderungen(stand, { datum: D }).slice(0, 8);
  const einheit = (e) => (e === "stk" ? t("allgemein.stueck") : e); // Trennung 2 (17.10.2026): Basis aus preisAnzeige() (js/lieferung.js)
  return `<div class="karte"><h2>${esc(t("zaehler.preise"))}</h2>
    ${l.length ? l.map((x) => { const p = preisAnzeige(x); return `<div class="summenzeile"><span>${esc(artikelText(x.name))}<small class="marke block">${fmtEuro(p.alt, { dezimal: 2 })} → ${fmtEuro(p.neu, { dezimal: 2 })} / ${esc(einheit(p.einheit))}</small></span><span class="wert ${x.prozent > 0 ? "rot" : "gruen"}">${x.prozent > 0 ? "+" : ""}${fmtZahl(x.prozent * 100, 0)} %</span></div>`; }).join("") : `<p class="hinweis">${esc(t("zaehler.preiseLeer"))}</p>`}
  </div>`;
}

// ---------- Aktionen und Eingaben ----------
export function umsatzAktion(name, el) {
  if (name === "umsatz-basis") { umsatzBasis = el.dataset.wert === "netto" ? "netto" : "brutto"; return true; }
  if (name === "umsatz-mehr-tage") { mehrTage = true; return true; }
  return false;
}
export function umsatzEingabe(feld, wert, stand, wurzel) {
  if (feld !== "umsatz") return false;
  const n = parseZahl(wert); const D = tagGewaehlt(); const st = umsatzSteuerSatz(stand);
  if (n === null) tagesnotizLoeschen(stand, D, wurzel?.geraet || null);
  else tagesnotizSetzen(stand, D, umsatzAusEingabe(n, umsatzBasis, st.satz), { // Trennung 2 (17.10.2026)
    nacherfasst: D !== heute(), geraet: wurzel?.geraet || null });
  return false;
}
// W2-T: Feld verlassen = Wert festschreiben. Jede spätere Änderung ist ein neuer Eintrag, der alte bleibt sichtbar (GoBD, Prüfung p04 Nr. 3).
export function umsatzFeldVerlassen(stand) { tagesnotizenFestschreiben(stand); }
export const umsatzZuruecksetzen = () => { umsatzBasis = "brutto"; mehrTage = false; };
