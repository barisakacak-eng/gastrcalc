// Etappe 5: das Cockpit (Startseite) – eine große Zahl, drei kleine, „Jetzt dran", die Woche, die Türen. Dazu „Mehr" und die Karte.
// Jede Eingabe endet wieder hier. Alles, was hier steht, kommt aus dem Rechenwerk (engine, zaehler); die Oberfläche rechnet nicht selbst.
import { t, SPRACHEN, sprache } from "../i18n.js";
import { esc, fmtEuro, fmtZahl, heute, wertAnzeige } from "../util.js";
import { monatsLast, kalkulation, schwundAuswertung, umsatzEintrag, kuehlStatus, offeneNachkontrollen, schwundOhneWert, umsatzKonflikte, umsatzSteuerSatz } from "../engine.js";
import { zaehler, wochenVergleich, abschlussVon, warenQuote } from "../zaehler.js";
import { ergebnisView } from "./karte.js";
import { nav, sicherungStufe } from "./nav.js";
import { einrichtungStand } from "../einrichtung.js";
import { sym } from "../symbole.js";
import { muellWoche } from "../muell.js";
import { wareneinsatzSicherheit } from "../rezept_quelle.js";
import { eintraegeZaehlen } from "../store.js";
import { datumLesbar, monatName, tagLesbar, zeitKurz } from "./tag.js";

// Etappe 6, Punkt 4 (Baris 13.10., 12:57) und Punkt 6 (14.10., 16:35): Cockpit = Einrichtungskarte (bis 100 %), dunkle Zählerkarte mit
// Monatskurve, vier Instrumente (Umsatz Woche, Tonne Woche, Wareneinsatz, Kühlung heute), „Jetzt dran". Türen, „Noch offen",
// Sicherungskarte, Wochenkarte und der große Abschluss-Knopf sind weg (Menü, Zahlen im Menü, „Jetzt dran").
export function startView(stand, extra = {}) {
  const H = heute(); const z = zaehler(stand, { datum: H }); const ks = kuehlStatus(stand); const nk = offeneNachkontrollen(stand);
  const ab = abschlussVon(stand, H); const e = einrichtungStand(stand, extra.wurzel);
  const dran = naechsteHandlung(stand, z, ks, nk, ab, e, extra.wurzel);
  const unter = [stand.betrieb.format ? t("format." + stand.betrieb.format)[0] : "", ...stand.betrieb.kuechen.map((k) => t("kueche." + k))].filter(Boolean).join(", ");
  return `
    <div class="kopfband">
      <h1>${esc(stand.betrieb.name || t("menue.deinLaden"))}<span class="abzeichen">${esc(t("app.entwurf"))}</span></h1>
      <div class="unter">${esc(tagLesbar(H))}${unter ? ` · ${esc(unter)}` : ""}</div>
    </div>
    <div class="inhalt cockpit">
      ${extra.aktualisierung ? `<div class="karte hinweisgelb"><h2>${esc(t("start.neueFassung"))}</h2><div>${esc(t("start.neueFassungText"))}</div><button type="button" class="knopf" data-a="aktualisieren">${esc(t("start.jetztUebernehmen"))}</button></div>` : ""}
      ${stand.branchenMeldung ? `<div class="karte hinweisgruen"><div>${esc(t("cockpit.branchenMeldung", stand.branchenMeldung.geaendert))}</div><button type="button" class="knopf zweit" data-a="branchen-ok">${esc(t("einrichtung.ok"))}</button></div>` : ""}
      ${einrichtungKarte(stand, e, { kompakt: !!stand.einrichtungFertig })}
      ${bandView(z, H)}
      ${zaehlerKarte(z, H)}
      <div class="instrumente">${umsatzInstrument(stand, H)}${tonneInstrument(stand, H)}${wareneinsatzInstrument(stand, z)}${kuehlInstrument(ks)}</div>
      <button type="button" class="jetzt" data-a="${esc(dran.aktion)}" ${dran.attr || ""}><span><small>${esc(t("cockpit.jetztDran"))}</small><b>${esc(dran.text[0])}</b><small>${esc(dran.text[1])}</small></span><span class="pfeil">›</span></button>
    </div>
    ${nav("start")}`;
}

// ---------- Einrichtungskarte (Punkt 6, Mischung A + B) ----------
const zielAttr = (z) => z.aktion === "nav" ? `data-a="nav" data-wert="${z.wert}"` : z.aktion === "bearbeiten" ? `data-a="bearbeiten" data-schritt="${z.schritt}"${z.bis ? ` data-bis="${z.bis}"` : ""}` : `data-a="${z.aktion}"`;
function listeZu() { try { return localStorage.getItem("gc-einrichtung-zu") === "1"; } catch { return false; } }
export function ring(prozent, klein = false) {
  const r = 26, u = 2 * Math.PI * r;
  return `<svg class="ring ${klein ? "klein" : ""}" viewBox="0 0 64 64" role="img" aria-label="${prozent} %"><circle class="ring-grund" cx="32" cy="32" r="${r}"/><circle class="ring-wert" cx="32" cy="32" r="${r}" stroke-dasharray="${(u * prozent / 100).toFixed(1)} ${u.toFixed(1)}" transform="rotate(-90 32 32)"/><text x="32" y="37" text-anchor="middle">${prozent}</text></svg>`;
}
export function einrichtungKarte(stand, e, { kompakt = false } = {}) {
  if (e.prozent >= 100) return stand.einrichtungFertig ? "" : `<div class="karte einrichtung fertig"><h2>${esc(t("einrichtung.fertig"))}</h2><div>${esc(t("einrichtung.fertigText"))}</div><button type="button" class="knopf zweit" data-a="einrichtung-fertig-ok">${esc(t("einrichtung.ok"))}</button></div>`;
  const zu = kompakt || listeZu(); const n = e.naechster;
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

// „Jetzt dran": die eine nächste Handlung aus Uhrzeit und Stand. Reihenfolge = Dringlichkeit.
// Solange die Einrichtung unter 100 % ist, steht hier nur Tagesgeschäft – die Einrichtungsschritte zeigt die Karte darüber (nichts doppelt).
function naechsteHandlung(stand, z, ks, nk, ab, e, wurzel) {
  const jetzt = new Date(); const h = jetzt.getHours() + jetzt.getMinutes() / 60; const H = heute();
  const mk = (key, aktion, attr = "") => ({ text: t("cockpit.dran." + key), aktion, attr });
  const einrichtung = e.prozent < 100;
  if (ks.eingerichtet && ks.offenerRundgang) return mk("rundgangWeiter", "kuehl-rundgang-start", 'data-offen="0"');
  if (nk.length) return mk("nachkontrolle", "nav", 'data-wert="kuehl"');
  if (ks.eingerichtet && ks.heuteGemessen < ks.stellen) return mk(h < 15 ? "kuehlMorgen" : "kuehlAbend", "kuehl-rundgang-start", 'data-offen="0"');
  if (h >= 17 && !umsatzEintrag(stand, H)) return mk("umsatz", "nav", 'data-wert="umsatz"');
  if (sicherungStufe(wurzel)?.stufe === "rot") return mk("sicherung", "export");
  if (!einrichtung && z.unvollstaendig) return z.last.fix.offen ? mk("kosten", "bearbeiten", 'data-schritt="kosten-miete" data-bis="kosten-sonstiges"') : mk("kosten", "bearbeiten", 'data-schritt="lohn"');
  if (h >= 18 && !ab) return mk("abschluss", "nav", 'data-wert="abschluss"');
  // Waage-Vorschlag (Punkt 7): höchstens einmal am Tag, nicht in der Hauptzeit (11:30–14:00, 17:30–20:30)
  const hauptzeit = (h >= 11.5 && h < 14) || (h >= 17.5 && h < 20.5);
  if (!einrichtung && !hauptzeit && stand.waageVorschlag !== H && wareneinsatzSicherheit(stand).zaehl.schaetzung > 0) return mk("waage", "waage-vorschlag");
  if (!einrichtung && stand.gerichte.length && kalkulation(stand).zaehl.grau) return mk("karte", "nav", 'data-wert="karte"');
  return mk("nichts", "nav", 'data-wert="umsatz"');
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
        <label class="knopf zweit mitte">${esc(t("einstellungen.importieren"))}<input type="file" accept="application/json,.json" data-f="import" class="versteckt"></label>
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
