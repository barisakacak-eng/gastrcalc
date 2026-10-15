// Etappe 5: das Cockpit (Startseite) – eine große Zahl, drei kleine, „Jetzt dran", die Woche, die Türen. Dazu „Mehr" und die Karte.
// Jede Eingabe endet wieder hier. Alles, was hier steht, kommt aus dem Rechenwerk (engine, zaehler); die Oberfläche rechnet nicht selbst.
import { planGruppen } from "../putzplan.js";
import { reinigungZeile } from "./reinigung_zeile.js";
import { t, SPRACHEN, SPRACH_NAMEN, sprache } from "../i18n.js";
import { esc, fmtEuro, fmtZahl, heute, wertAnzeige } from "../util.js";
import { monatsLast, schwundAuswertung, umsatzEintrag, kuehlStatus, umsatzSteuerSatz, aktiveStellen, letzteMessung } from "../engine.js";
import { jetztDran, zielAttr } from "../offen.js";
import { zaehler, wochenVergleich, warenQuote } from "../zaehler.js";
import { ergebnisView } from "./karte.js";
import { nav, sicherungStufe } from "./nav.js";
import { bueroCodeKarte } from "./ebene.js"; // Drei Ebenen (A): Büro-Code in den Einstellungen
import { einrichtungStand } from "../einrichtung.js";
import { sym } from "../symbole.js";
import { muellWoche } from "../muell.js";
import { wareneinsatzSicherheit } from "../rezept_quelle.js";
import { datumLesbar, monatName } from "./tag.js";

// Drei Ebenen (15.10.2026, Entwickler B): Laden „Heute“ – ein Bildschirm ohne Scrollen. Datum, EINE Zielkarte (Bis null / Bis zum Ziel /
// Über dem Ziel) mit Balken, vier Kacheln (Umsatz, Müll, Kühlung, Putzen) und höchstens eine „Jetzt dran“-Karte aus der festen Liste
// in js/offen.js. Einrichtungsring, Kostenlücken, Hinweise, Spruch und Monatskurve wohnen jetzt im Büro (offenImBuero, monatKarte, spruchKarte).
export function startView(stand, extra = {}) {
  const H = heute(); const z = zaehler(stand, { datum: H }); const ks = kuehlStatus(stand);
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
// Rechnung nur aus monatsZiel() – hier wird nichts neu gerechnet außer der Balkenbreite.
export function heuteZielWerte(stand, z, H) {
  const m = monatsZiel(stand, z, H);
  const stufe = m.stufe === "ohne" ? "bisNull" : m.stufe;
  const zahl = m.ziel === null ? null : m.stufe === "bisNull" ? m.fehltNull : m.stufe === "bisZiel" ? m.fehlt : m.darueber;
  // Zielmarke des Balkens: bis null = Umsatz + was bis null fehlt; danach das Monatsziel
  const marke = m.ziel === null ? null : m.stufe === "bisNull" ? m.umsatz + (m.fehltNull || 0) : m.ziel;
  const anteil = marke ? Math.max(0, Math.min(1, m.umsatz / marke)) : 0;
  const tempo = m.erreichtAm ? { art: "gut", text: t("heute.tempoGut", datumLesbar(m.erreichtAm).slice(0, 6)) }
    : m.proTagNoetig ? { art: "knapp", text: t("heute.tempoKnapp", fmtEuro(m.proTagNoetig, { dezimal: 0 })) } : null;
  return { m, stufe, zahl, marke, anteil, tempo };
}
function heuteZielKarte(stand, z, H) {
  const w = heuteZielWerte(stand, z, H); const { m } = w;
  return `<button type="button" class="karte h-ziel ${m.stufe === "ueberZiel" ? "plus" : ""}" data-a="nav" data-wert="umsatz">
    <span class="h-zielkopf"><span>${esc(t("heute.stufe." + w.stufe))}</span>${w.tempo ? `<span class="h-tempo ${w.tempo.art}">${esc(w.tempo.text)}</span>` : `<span class="zielsym">${sym("target")}</span>`}</span>
    <span class="h-riesig ${m.geschaetzt ? "leicht" : ""}">${w.zahl === null ? "–" : `${m.stufe === "ueberZiel" ? "+" : ""}${fmtEuro(w.zahl, { dezimal: 0 })}`}</span>
    ${m.ziel === null ? `<span class="h-unter">${esc(t("heute.ohneKosten"))}</span>`
      : `<span class="h-balken" aria-hidden="true"><i style="width:${Math.round(w.anteil * 100)}%"></i></span><span class="h-balkenzahlen"><span>${fmtEuro(m.umsatz, { dezimal: 0 })}</span><span>${fmtEuro(w.marke, { dezimal: 0 })}</span></span>`}
  </button>`;
}

// Vier Kacheln: Symbol + Zahl. Kühlung zeigt den schlechtesten Wert (rot) oder „OK“ oder „2 offen“; Putzen erledigt/gesamt heute.
export function heuteKachelWerte(stand, ks, H) {
  const u = umsatzEintrag(stand, H); const sw = schwundAuswertung(stand, { von: H, bis: H });
  let kuehl = { wert: "–", alarm: false };
  if (ks.eingerichtet) {
    const abw = (stand.messungen || []).filter((m) => m.datum === H && !m.storniert && m.abweichung && typeof m.wert === "number");
    const stellenAbw = aktiveStellen(stand).map((k) => letzteMessung(stand, k.id)).filter((m) => m && m.abweichung && typeof m.wert === "number");
    const aus = (m) => typeof m.max === "number" && m.wert > m.max ? m.wert - m.max : typeof m.min === "number" && m.wert < m.min ? m.min - m.wert : 0; // wie weit außerhalb der Grenze
    const schlimm = [...stellenAbw, ...abw].sort((a, b) => aus(b) - aus(a))[0];
    if (schlimm) kuehl = { wert: `${fmtZahl(schlimm.wert, Number.isInteger(schlimm.wert) ? 0 : 1)} °C`, alarm: true };
    else if (ks.heuteGemessen >= ks.stellen) kuehl = { wert: t("heute.ok"), alarm: false };
    else kuehl = { wert: t("heute.offenN", ks.stellen - ks.heuteGemessen), alarm: false, offen: true };
  }
  let putz = { wert: "–", alarm: false };
  if (stand.putzplan?.aktiv) { const pg = planGruppen(stand, H); putz = { wert: `${pg.erledigt} / ${pg.gesamt}`, alarm: pg.ueberfaellig > 0 }; }
  return { umsatz: u ? u.umsatz : null, muell: sw.anzahl ? sw.muellwert : null, kuehl, putz };
}
function heuteKachelnLaden(stand, ks, H) {
  const w = heuteKachelWerte(stand, ks, H);
  const kachel = (cls, symbol, key, wert, ziel, alarm) => `<button type="button" class="karte h-kachel ${alarm ? "alarm" : ""}" ${ziel}><span class="ks ${cls}">${sym(symbol)}</span><span><small>${esc(t(key))}</small><b>${wert}</b></span></button>`;
  return kachel("umsatz", "chart-column", "heute.kachel.umsatz", w.umsatz === null ? "–" : fmtEuro(w.umsatz, { dezimal: 0 }), 'data-a="nav" data-wert="umsatz"')
    + kachel("muell", "trash-2", "heute.kachel.muell", w.muell === null ? "–" : fmtEuro(w.muell, { dezimal: w.muell < 10 ? 2 : 0 }), 'data-a="nav" data-wert="muell"')
    + kachel("kuehl", "snowflake", "heute.kachel.kuehlung", esc(w.kuehl.wert), 'data-a="nav" data-wert="kuehl"', w.kuehl.alarm)
    + kachel("putz", "spray-can", "heute.kachel.putzen", esc(w.putz.wert), 'data-a="nav" data-wert="putzplan"', w.putz.alarm);
}
function jetztKarte(d) {
  return `<button type="button" class="jetzt h-jetzt ${d.ton}" ${zielAttr(d.ziel)} data-dran="${esc(d.id)}"><span class="ks">${sym(d.symbol)}</span><span class="h-jetzt-text"><small>${esc(t("heute.jetztDran"))}</small><b>${esc(d.titel)}</b></span><span class="los">${esc(d.knopf)}</span></button>`;
}

// ---------- Zielbild-Cockpit (Sanjis Vorlage 15.10.): Bis null fehlen · Umsatz im Monat gegen Ziel · Heute-Kacheln · Spruch ----------
// Monatsziel = Umsatz (brutto), bei dem der Monat auf null kommt: (Monatskosten + Sonderkosten) / (1 − Wareneinsatz-Quote) × (1 + Mehrwertsteuer).
// Alles aus dem Rechenwerk (Zähler), nichts geschätzt, was nicht schon geschätzt ist; ohne Kosten gibt es kein Ziel („–").
// Monatsziel (Baris 15.10., 13:35): „bis null plus Zielgewinn“. null = Umsatz, der alle Kosten deckt; ziel = zusätzlich der Zielgewinn
// (Anteil vom Nettoumsatz, wie in der Kalkulation, Feld verkauf.zielgewinn). Beides brutto, wie der Umsatz eingetragen wird.
export function monatsZiel(stand, z, H) {
  // Kosten wie im Zähler (Review 15.10.): nur ab dem ersten Zähltag (z.start) anteilig nach Öffnungstagen, plus eingetragener Müll,
  // damit Karte, Band und Zähler dieselbe Rechnung zeigen.
  const gewichtAbStart = (z.tage || []).filter((x) => !z.start || x.datum >= z.start).reduce((s, x) => s + (x.gewicht || 0), 0);
  const kostenMonat = (z.last?.gesamt || 0) + (z.sonder?.summe || 0);
  const kosten = (z.tageskosten && gewichtAbStart ? z.tageskosten * gewichtAbStart : kostenMonat) + (z.muell || 0);
  const q = Math.min(0.9, Math.max(0, z.quoteEff || 0));
  const g = Math.min(0.5, Math.max(0, (Number(stand.verkauf?.zielgewinn) || 0) / 100));
  const brutto = 1 + (z.steuer || 0);
  const nullpunkt = kosten > 0 ? kosten / (1 - q) * brutto : null;
  const ziel = nullpunkt === null ? null : 1 - q - g > 0.05 ? kosten / (1 - q - g) * brutto : nullpunkt;
  const tage = []; let summe = 0;
  for (const x of z.tage) { if (x.datum > H) break; const u = umsatzEintrag(stand, x.datum); summe += u ? u.umsatz : 0; tage.push({ datum: x.datum, umsatz: u ? u.umsatz : null, kumuliert: summe }); }
  // „Null“ heißt überall dasselbe wie im Zähler (Nachtester 15.10.): gerechneter Stand bis heute ≥ 0. Danach zählt das Monatsziel mit Zielgewinn.
  const imMinus = typeof z.stand === "number" && z.stand < 0 && !z.keinUmsatz;
  const stufe = nullpunkt === null ? "ohne" : imMinus || z.keinUmsatz ? "bisNull" : summe < ziel ? "bisZiel" : "ueberZiel";
  const fehltNullZ = imMinus ? -z.stand / (1 - q) * brutto : z.keinUmsatz ? nullpunkt : 0; // Umsatz, der das Minus bis heute ausgleicht
  let erreichtAm = null, proTagNoetig = null;
  if (stufe === "bisNull" && !z.keinUmsatz) { erreichtAm = z.nullTag || null; if (!erreichtAm && z.noetigProTag) proTagNoetig = z.noetigProTag / (1 - q) * brutto; }
  if (stufe === "bisZiel") { // Tempo: Umsatz je Öffnungstag bisher, hochgerechnet auf die restlichen Öffnungstage
    const gBis = (z.tage || []).filter((x) => x.datum <= H && (!z.start || x.datum >= z.start)).reduce((a2, x) => a2 + (x.gewicht || 0), 0);
    if (gBis > 0 && summe > 0) { const tempo = summe / gBis; let s2 = summe;
      for (const x of z.tage) { if (x.datum <= H) continue; s2 += tempo * (x.gewicht || 0); if (s2 >= ziel) { erreichtAm = x.datum; break; } }
      if (!erreichtAm) { const rest = (z.tage || []).filter((x) => x.datum > H).reduce((a2, x) => a2 + (x.gewicht || 0), 0); proTagNoetig = rest > 0 ? (ziel - summe) / rest : null; } } }
  return { ziel, nullpunkt, gewinnAnteil: g, umsatz: summe, stufe, erreichtAm, proTagNoetig,
    fehlt: ziel === null ? null : Math.max(0, ziel - summe), fehltNull: nullpunkt === null ? null : fehltNullZ,
    darueber: ziel === null ? null : Math.max(0, summe - ziel), tage, geschaetzt: z.stufe < 3 || z.last?.fix?.geschaetzt > 0 };
}
function bisNullKarte(stand, z, H) {
  const m = monatsZiel(stand, z, H);
  const erreicht = m.stufe === "ueberZiel";
  const zahl = m.stufe === "bisNull" ? m.fehltNull : m.stufe === "bisZiel" ? m.fehlt : m.darueber;
  const g = Math.round(m.gewinnAnteil * 100);
  return `<button type="button" class="karte zielkarte ${erreicht ? "plus" : m.stufe === "bisZiel" ? "halb" : ""}" data-a="nav" data-wert="umsatz">
    <span class="zielkopf"><small class="lbl">${esc(t("cockpit.zielStufe." + (m.stufe === "ohne" ? "bisNull" : m.stufe), g))}</small><span class="zielsym">${sym("target")}</span></span>
    <span class="riesig">${m.ziel === null ? "–" : `${m.geschaetzt ? "≈ " : ""}${fmtEuro(zahl, { dezimal: 0 })}`}</span>
    <small>${esc(m.ziel === null ? t("cockpit.zielOhneKosten") : t("cockpit.zielSatzStufe." + m.stufe, g))}</small>
    ${m.erreichtAm ? `<span class="zieltempo gut">${esc(t("cockpit.tempoGut", datumLesbar(m.erreichtAm).slice(0, 6)))}</span>` : m.proTagNoetig ? `<span class="zieltempo knapp">${esc(t("cockpit.tempoKnapp", fmtEuro(m.proTagNoetig, { dezimal: 0 })))}</span>` : ""}</button>`;
}
// Monatsbalken (wohnt jetzt im Büro, Entwickler C)
export function monatKarte(stand, z, H) {
  const m = monatsZiel(stand, z, H); if (!m.tage.length) return "";
  const max = Math.max(m.ziel || 0, m.umsatz) || 1; const n = z.tage.length;
  const W = 300, Hh = 110, bw = W / n;
  const balken = m.tage.map((x, i) => { const h = Math.round(x.kumuliert / max * Hh); return `<rect class="${x.datum === H ? "heute" : ""}" x="${(i * bw + bw * 0.18).toFixed(1)}" y="${Hh - h}" width="${(bw * 0.64).toFixed(1)}" height="${h}" rx="1.5"/>`; }).join("");
  const zielY = m.ziel ? Math.round(Hh - m.ziel / max * Hh) : null; const nullY = m.nullpunkt ? Math.round(Hh - m.nullpunkt / max * Hh) : null;
  return `<button type="button" class="karte monatkarte" data-a="nav" data-wert="umsatz">
    <small class="lbl">${esc(t("cockpit.umsatzImMonat"))}</small>
    <span class="monatzahl"><b>${fmtEuro(m.umsatz, { dezimal: 0 })}</b>${m.ziel ? `<small>${esc(t("cockpit.vonZiel", fmtEuro(m.ziel, { dezimal: 0 })))}</small>` : ""}</span>
    <svg class="monatbalken" viewBox="0 -12 ${W} ${Hh + 26}" preserveAspectRatio="none" aria-hidden="true">${balken}
      ${zielY !== null ? `<line class="ziellinie" x1="0" x2="${W}" y1="${zielY}" y2="${zielY}"/><text x="${W}" y="${zielY - 4}" text-anchor="end">${esc(t("cockpit.zielKurz"))}</text>` : ""}
      <text x="0" y="${Hh + 13}">${esc(datumLesbar(z.tage[0].datum).slice(0, 6))}</text><text x="${W}" y="${Hh + 13}" text-anchor="end">${esc(t("zaehler.heute"))}</text></svg></button>`;
}
function heuteKacheln(stand, z, ks, H) {
  const u = umsatzEintrag(stand, H); const sw = schwundAuswertung(stand, { von: H, bis: H });
  const ware = u && z.quoteEff ? u.umsatz / (1 + (z.steuer || 0)) * z.quoteEff : null;
  const werte = (stand.messungen || []).filter((m) => m.datum === H && typeof m.wert === "number" && !m.storniert).map((m) => m.wert);
  const kuehlOk = ks.eingerichtet && ks.heuteGemessen >= ks.stellen && !ks.letzteAbweichung;
  const kachel = (cls, symbol, key, wert, unter, ziel) => `<button type="button" class="instrument klein ${cls}" ${ziel}><span class="kachelsym">${sym(symbol)}</span><span><small>${esc(t(key))}</small><b>${wert}</b>${unter ? `<small>${esc(unter)}</small>` : ""}</span></button>`;
  return kachel("i-umsatz", "chart-column", "cockpit.umsatzHeute", u ? fmtEuro(u.umsatz, { dezimal: 0 }) : "–", "", 'data-a="nav" data-wert="umsatz"')
    + kachel("i-ware", "shopping-cart", "cockpit.wareHeute", ware !== null ? `${z.stufe < 3 ? "≈ " : ""}${fmtEuro(ware, { dezimal: 0 })}` : "–", "", 'data-a="nav" data-wert="vergleich"')
    + kachel("i-tonne", "trash-2", "cockpit.muellHeute", sw.anzahl ? fmtEuro(sw.muellwert, { dezimal: sw.muellwert < 100 ? 2 : 0 }) : "–", "", 'data-a="nav" data-wert="muell"')
    + kachel(`i-kuehl ${ks.ueberfaellig || ks.letzteAbweichung ? "rotrand" : ""}`, "snowflake", "cockpit.kuehlung", !ks.eingerichtet ? "–" : kuehlOk ? "OK" : t("cockpit.nochOffen", ks.stellen - ks.heuteGemessen),
      !ks.eingerichtet ? t("cockpit.einrichten") : werte.length ? `${fmtZahl(Math.min(...werte), 0)}–${fmtZahl(Math.max(...werte), 0)} °C` : "", 'data-a="nav" data-wert="kuehl"');
}
// Spruch-Karte (im Laden weg; Büro / Tagesabschluss dürfen sie zeigen)
export function spruchKarte(H) {
  const liste = t("cockpit.sprueche"); if (!Array.isArray(liste) || !liste.length) return "";
  const tag = Math.floor(Date.parse(H + "T12:00:00") / 86400e3);
  return `<div class="karte spruch"><span class="spruchsym">${sym("leaf")}</span><p>${sprache() === "de" ? "„" : "“"}${esc(liste[tag % liste.length])}${sprache() === "de" ? "“" : "”"}</p></div>`;
}

// ---------- Einrichtungskarte (Punkt 6, Mischung A + B) ----------
// zielAttr kommt aus js/offen.js (gleiche Ausgabe, eine Stelle)
function listeZu() { try { return localStorage.getItem("gc-einrichtung-zu") !== "0"; } catch { return true; } } // Zielbild: Liste standardmäßig zu, Kopf + nächster Schritt reichen
export function ring(prozent, klein = false) {
  const r = 26, u = 2 * Math.PI * r;
  return `<svg class="ring ${klein ? "klein" : ""}" viewBox="0 0 64 64" role="img" aria-label="${prozent} %"><circle class="ring-grund" cx="32" cy="32" r="${r}"/><circle class="ring-wert" cx="32" cy="32" r="${r}" stroke-dasharray="${(u * prozent / 100).toFixed(1)} ${u.toFixed(1)}" transform="rotate(-90 32 32)"/><text x="32" y="37" text-anchor="middle">${prozent}</text></svg>`;
}
export function einrichtungKarte(stand, e, { kompakt = false } = {}) {
  if (e.prozent >= 100) return stand.einrichtungFertig ? "" : `<div class="karte einrichtung fertig"><h2>${esc(t("einrichtung.fertig"))}</h2><div>${esc(t("einrichtung.fertigText"))}</div><button type="button" class="knopf zweit" data-a="einrichtung-fertig-ok">${esc(t("einrichtung.ok"))}</button></div>`;
  const zu = kompakt || listeZu(); const n = e.naechster;
  // Zielbild: zugeklappt als schmale Zeile (kleiner Ring, nächster Schritt) – das Cockpit beginnt gleich mit „Bis null fehlen"
  if (zu && n) return `<div class="einrichtung-zeile"><button type="button" class="ez-haupt" ${zielAttr(n.ziel)}>${ring(e.prozent, true)}<span><b>${esc(t("einrichtung.titel", e.prozent))}</b><small>${esc(t("einrichtung.als"))} ${esc(t("einrichtung.schritte." + n.id))}</small></span>${sym("chevron-right")}</button>${kompakt ? "" : `<button type="button" class="leise ez-mehr" data-a="einrichtung-liste">${esc(t("einrichtung.mehr"))}</button>`}</div>`;
  return `<div class="karte einrichtung">
    <div class="einrichtung-kopf">${ring(e.prozent)}<div><b>${esc(t("einrichtung.titel", e.prozent))}</b><small>${esc(t("einrichtung.rest", e.offen))}</small></div></div>
    ${n ? `<button type="button" class="knopf glut" ${zielAttr(n.ziel)}><small>${esc(t("einrichtung.als"))}</small> ${esc(t("einrichtung.schritte." + n.id))}${n.rest > 0 && n.id !== "karte" && n.id !== "kuehlung" && n.id !== "sicherung" ? ` · ${esc(t("einrichtung.offen." + n.id, n.rest))}` : ""}</button>` : ""}
    ${zu ? "" : `<div class="checkliste">${e.schritte.map((x) => `<div class="schrittzeile ${x.fertig ? "fertig" : x.anteil > 0 ? "halb" : "offen"}">
      ${x.fertig ? `<span class="haken" aria-hidden="true">✓</span><s>${esc(t("einrichtung.schritte." + x.id))}</s>`
        : `<button type="button" class="zeileknopf" ${zielAttr(x.ziel)}><span class="anteil" aria-hidden="true">${x.anteil > 0 ? Math.round(x.anteil * 100) : ""}</span><span><b>${esc(t("einrichtung.schritte." + x.id))}</b><small>${esc(t("einrichtung.offen." + x.id, x.rest))}</small></span><span class="pfeil">›</span></button>${x.id === "kuehlung" ? `<button type="button" class="leise" data-a="kuehl-keine">${esc(t("einrichtung.habenWirNicht"))}</button>` : ""}`}
    </div>`).join("")}</div>`}
    ${kompakt ? "" : `<button type="button" class="leise" data-a="einrichtung-liste">${esc(zu ? t("einrichtung.mehr") : t("einrichtung.weniger"))}</button>`}
  </div>`;
}
// Schmale Zeile auf anderen Seiten, solange ein offener Schritt die Seite betrifft
export function einrichtungZeile(e, ids) {
  if (e.prozent >= 100 || !e.schritte.some((x) => ids.includes(x.id) && !x.fertig)) return "";
  return `<button type="button" class="einrichtungzeile" data-a="nav" data-wert="start">${esc(t("einrichtung.kurz", e.prozent))}</button>`;
}

// ---------- Instrumente (Punkt 4) ----------
function umsatzInstrument(stand, H) {
  const w = wochenVergleich(stand, H);
  const pct = w.tageDiese && w.tageVorige && w.summeVorige > 0 ? Math.round((w.summeDiese / w.summeVorige - 1) * 100) : null;
  return `<button type="button" class="instrument i-umsatz" data-a="nav" data-wert="umsatz"><small class="kopfzeile">${sym("chart-column", "klein")}${esc(t("cockpit.umsatzWoche"))}</small>
    <b>${w.tageDiese ? fmtEuro(w.summeDiese, { dezimal: 0 }) : "–"}</b><small>${pct !== null ? esc(t("cockpit.zurVorwoche", (pct > 0 ? "+" : "") + pct)) : esc(w.tageDiese ? t("cockpit.vorwoche") : t("cockpit.umsatzLeer"))}</small>
    <span class="balken mini">${w.diese.map((d, i) => `<i class="${d.datum === H ? "heute" : ""}"><s style="height:${w.max ? Math.round((w.vorige[i].umsatz || 0) / w.max * 100) : 0}%"></s><b style="height:${w.max ? Math.round((d.umsatz || 0) / w.max * 100) : 0}%"></b></i>`).join("")}</span></button>`;
}
function tonneInstrument(stand, H) {
  const w = muellWoche(stand, H);
  return `<button type="button" class="instrument i-tonne" data-a="nav" data-wert="muell"><small class="kopfzeile">${sym("trash-2", "klein")}${esc(t("cockpit.tonneWoche"))}</small>
    <b>${w.anzahl ? fmtEuro(w.summe, { dezimal: w.summe < 100 ? 2 : 0 }) : "–"}</b><small>${w.anzahl ? (w.portionen !== null ? esc(t("cockpit.portionenKurz", fmtZahl(w.portionen, w.portionen < 10 ? 1 : 0))) : w.ohneWert ? esc(t("listen.ohneWert", w.ohneWert)) : "") : esc(t("cockpit.tonneLeer"))}</small>
    <span class="balken mini muell">${w.tage.map((x) => `<i class="${x.datum === H ? "heute" : ""}"><b style="height:${w.max ? Math.round(x.wert / w.max * 100) : 0}%"></b></i>`).join("")}</span></button>`;
}
// Wareneinsatz in % vom Netto-Umsatz: Stufe 3 aus Belegen und Umsatz, Stufe 2 aus Karte oder eigener Quote, Stufe 1 „–"
export function wareneinsatzQuote(stand, z) {
  if (z.stufe === 3 && z.umsatzNetto > 0) return { quote: z.belegSumme / z.umsatzNetto, quelle: "belege" };
  if (z.quote !== null && z.quote !== undefined) return { quote: z.quote, quelle: z.quoteQuelle };
  return { quote: null, quelle: "keine" };
}
function wareneinsatzInstrument(stand, z) {
  const q = wareneinsatzQuote(stand, z); const ziel = Number(stand.verkauf?.zielWareneinsatz) || 0.33;
  const unsicher = q.quelle === "karte" && wareneinsatzSicherheit(stand).unsicher;
  const farbe = q.quote === null ? "" : q.quote <= ziel ? "gruen" : q.quote <= ziel + 0.05 ? "gelb" : "rot";
  return `<button type="button" class="instrument i-ware ${farbe}" data-a="nav" data-wert="karte"><small class="kopfzeile">${sym("shopping-cart", "klein")}${esc(t("cockpit.wareneinsatz"))}</small>
    <b>${q.quote === null ? "–" : `${unsicher ? "≈ " : ""}${fmtZahl(q.quote * 100, 0)} %`}</b><small>${esc(q.quote === null ? t("cockpit.karteFehlt") : unsicher ? t("cockpit.genauerAbwiegen") : t("cockpit.ziel", fmtZahl(ziel * 100, 0)))}</small>
    <span class="zielbalken"><i style="width:${q.quote === null ? 0 : Math.min(100, Math.round(q.quote / 0.6 * 100))}%"></i><s style="left:${Math.round(ziel / 0.6 * 100)}%"></s></span></button>`;
}
function kuehlInstrument(ks) {
  return `<button type="button" class="instrument i-kuehl ${ks.ueberfaellig ? "rotrand" : ""}" data-a="nav" data-wert="kuehl"><small class="kopfzeile">${sym("snowflake", "klein")}${esc(t("cockpit.kuehlung"))}</small>
    <b>${ks.eingerichtet ? `${ks.heuteGemessen} / ${ks.stellen}` : "–"}</b><small>${esc(ks.eingerichtet ? (ks.heuteGemessen >= ks.stellen ? t("cockpit.alleGemessen") : t("cockpit.nochOffen", ks.stellen - ks.heuteGemessen)) : t("cockpit.einrichten"))}</small>
    ${ks.eingerichtet ? `<span class="kreise">${Array.from({ length: ks.stellen }, (_, i) => `<i class="${i < ks.heuteGemessen ? "gruen" : "gelb"}"></i>`).join("")}</span>` : ""}</button>`;
}

// Das Band oben: nur, wenn der Zustand kippt oder kippen wird.
function bandView(z, H, stand) {
  if (z.keinUmsatz) return "";
  if (z.kippTag === H && z.imPlus) return `<div class="band gruen"><b>${esc(t("cockpit.nullErreicht"))}</b><small>${esc(t("cockpit.nullErreichtText"))}</small></div>`;
  if (z.reichtNicht && !(z.last?.offen > 0)) return `<div class="band rot">${esc(t("cockpit.bandRot"))}</div>`; // erst urteilen, wenn die Kosten feststehen (Nachtester 15.10.)
  const bisNull = z.nullTag ? z.tage.filter((x) => x.datum > H && x.datum <= z.nullTag).reduce((s, x) => s + x.gewicht, 0) : null;
  if (!z.imPlus && bisNull !== null && bisNull <= 2) { const m = stand ? monatsZiel(stand, z, H) : null; // gleiche Zahl wie die Zielkarte (Umsatz bis null)
    return m && m.fehltNull ? `<div class="band gelb">${esc(t("cockpit.bandKnapp", fmtEuro(m.fehltNull)))}</div>` : ""; }
  return "";
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

// Monatskurve in der Zählerkarte: Stand je Tag seit Zählbeginn, Nulllinie, Punkt „heute", gestrichelte Prognose bis Monatsende, Null-Tag markiert
export function zaehlerVerlauf(z) {
  const ist = z.tage.filter((x) => x.status === "vergangen" || x.status === "heute").filter((x) => x.datum >= z.start).map((x) => ({ datum: x.datum, stand: x.stand }));
  const prognose = z.dbProTag !== null ? z.tage.filter((x) => x.status === "zukunft" && typeof x.stand === "number").map((x) => ({ datum: x.datum, stand: x.stand })) : [];
  return { ist, prognose, nullTag: z.nullTag, tage: z.tage.length };
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
      <button type="button" class="knopf glut" data-a="nav" data-wert="kartefoto"><span aria-hidden="true">📷</span> ${esc(t("foto.karteKnopf"))}</button>
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
          <span class="marke">${esc(t("zaehler.quoteHinweis"))} ${esc(t("zaehler.quoteQuelle." + q.quelle))}.</span></div>
        <div class="feldzeile"><label>${esc(t("zaehler.steuer"))}</label>
          <div class="betrag"><input inputmode="decimal" data-f="steuerSatz" value="${esc(typeof stand.betrieb.steuerSatz === "number" ? wertAnzeige(Math.round(stand.betrieb.steuerSatz * 1000) / 10) : "")}" placeholder="${esc(fmtZahl(st.satz * 100, 1))}" aria-label="%"><span class="einheit">%</span></div>
          <span class="marke">${esc(t("zaehler.steuerHinweis"))} ${esc(t("zaehler.steuerQuelle." + st.quelle))}.</span></div>
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
