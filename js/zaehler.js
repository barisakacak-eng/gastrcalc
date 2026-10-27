import { teamTag, teamTagKosten, abwesendMonat, abwesendKosten, lieferTag, lieferProvision, lieferKosten } from "./stamm.js";
import { inventurenFertig, inventurVergleich } from "./inventur.js";
// Etappe 5: der Break-even-Zähler (Wunsch Baris 12.10.2026). Reine Funktionen, keine Oberfläche.
// Jeden Tag: alles, was bis heute an Kosten angefallen ist, gegen alles, was bis heute (netto) reingekommen ist.
// Rot im Minus („bis null fehlen"), grün im Plus („verdient diesen Monat"). Kalkulatorisch, kein Kontostand.
//
// Regeln (Umbauliste Etappe 5, Punkt 6):
//  - Wareneinsatz nicht durch 30 teilen: jeder Euro Umsatz bringt nur den Deckungsbeitrag (1 − Warenquote) auf den Zähler.
//  - Drei Stufen: 1 nur feste Kosten + Löhne + eigener Lohn · 2 dazu Ware geschätzt aus der Karte (oder eigene Quote) · 3 echter Einkauf aus Belegen.
//  - Müll schiebt den Zähler ins Rote (Stufe 1 und 2; in Stufe 3 steckt er schon im Einkauf).
//  - Netto rechnen: Tagesumsatz aus der Kasse ist brutto, der Mischsatz kommt aus der Karte oder vom Wirt.
//  - Durch Öffnungstage teilen: Ruhetage (aus der Kühlkontrolle) zählen nicht; ohne Ruhetage gilt der Anteil tageProWoche/7 je Kalendertag.
//  - Unvollständig (Kosten offen, kein Umsatz eingetragen) wird gesagt, nicht erfunden.
import { feiertagZu } from "./feiertage.js"; // Feiertage (18.10.2026)
import { sonderkostenImMonat } from "./kostenbeleg.js";
import { heute, heuteGeschaeft, uid } from "./util.js";
import { lieferungTeile } from "./betriebsmittel.js";
import { monatsLast, umsatzEintrag, umsatzSteuerSatz, kalkulation, SCHWUND_ARTEN, tagPlus, wochentag, schwundAuswertung, kuehlStatus, ruhetageAm, eintragWert, RICHTWERT_WARENEINSATZ } from "./engine.js";

export function monatsGrenzen(datum) {
  const [j, m] = datum.split("-").map(Number);
  const ende = new Date(j, m - 1 + 1, 0);
  return { von: `${datum.slice(0, 8)}01`, bis: heute(ende), jahr: j, monat: m };
}

// Gewicht eines Kalendertags als Öffnungstag: 1 oder 0 bei bekannten Ruhetagen, sonst tageProWoche/7.
// Paket 3 (16.10.2026), M5: Ruhetage mit Gültig-ab-Verlauf (ruhetageAm) – eine Änderung mitten im Monat ändert vergangene Tage nicht.
export function tagGewicht(stand, datum) {
  if (feiertagZu(stand, datum)) return 0; // Feiertage (18.10.2026): nur wenn der Wirt „an Feiertagen zu“ gewählt hat (Standard: wie ein normaler Wochentag)
  const ruhetage = ruhetageAm(stand, datum);
  if (ruhetage.length) return ruhetage.includes(wochentag(datum)) ? 0 : 1;
  const t = Math.min(7, Math.max(1, Number(stand.betrieb?.tageProWoche) || 6));
  return t / 7;
}

// Warenquote (Anteil Wareneinsatz am Nettoumsatz): eigener Wert vor Karte (mengengewichtet über Gerichte mit Preis und vollständigem Rezept).
// Paket 3 (16.10.2026), M15/E2: liefert die Karte keine Quote, gilt der Branchen-Richtwert (RICHTWERT_WARENEINSATZ) als Schätzung –
// quelle "richtwert", geschaetzt true. Vorher stand hier Quote 0 (Ziel zu niedrig). Karte und eigener Wert: geschaetzt false.
export function warenQuote(stand) {
  if (typeof stand.verkauf?.warenQuote === "number") return { quote: stand.verkauf.warenQuote, quelle: "eigen", geschaetzt: false };
  const richtwert = { quote: RICHTWERT_WARENEINSATZ.quote, quelle: "richtwert", geschaetzt: true };
  if (!(stand.gerichte || []).length) return richtwert;
  const k = kalkulation(stand);
  let w = 0, u = 0, richtpreis = false;
  for (const z of k.zeilen) if (z.waren !== null && z.preisNetto !== null && z.preisNetto > 0) { const m = z.menge || 1; w += z.waren * m; u += z.preisNetto * m; if (z.warenRichtpreis) richtpreis = true; }
  if (!(u > 0)) return richtwert;
  // Richtpreise (17.10.2026): steckt in der Karten-Quote ein Richtpreis, ist sie eine Schätzung (≈, Zeile „Richtwert · Preise eintragen“)
  return { quote: Math.min(0.89, w / u), quelle: "karte", geschaetzt: richtpreis, ...(richtpreis ? { richtpreis: true } : {}) };
}

// Müllwert je Tag (Vorgang 1, bewertete Einträge), als Karte datum → €.
function muellJeTag(stand, von, bis) {
  const out = {};
  for (const e of stand.schwund || []) {
    // 27.10.2026 (Baris: Müll, Schwund und Personal bewegen „bis null“): auch Personalessen und Eigenverbrauch kosten Ware ohne Umsatz –
    // ohne Belege (Stufe 1/2) wird die Ware aus dem Umsatz geschätzt, darum zählen diese Einträge hier mit. Mit Belegen (Stufe 3) stecken sie im Einkauf.
    if (e.storniert || typeof e.datum !== "string" || e.datum < von || e.datum > bis) continue;
    const w = eintragWert(e, stand); if (w !== null) out[e.datum] = (out[e.datum] || 0) + w; // Paket 3, M6: Alt-Einträge wie in schwundAuswertung
  }
  return out;
}
// Einkauf je Tag aus eingelesenen Belegen (netto), Stufe 3.
function einkaufJeTag(stand, von, bis) {
  const out = {}; let n = 0;
  for (const l of stand.lieferungen || []) {
    if (l.storniert || typeof l.datum !== "string" || l.datum < von || l.datum > bis) continue;
    const netto = lieferungTeile(l).ware; // Putzmittel & Co. sind kein Wareneinsatz (eigene Zeile „Reinigung & Betriebsmittel“)
    out[l.datum] = (out[l.datum] || 0) + netto; n += 1;
  }
  return { jeTag: out, anzahl: n };
}

// Schwadron 18.10.2026, H1: geglättete Belegquote für die Prognose – Einkauf netto / Umsatz netto der letzten PROGNOSE_FENSTER Kalendertage.
// null, solange der erste Eintrag (Umsatz oder Beleg) jünger ist als das Fenster: dann zählt der Aufbau des Lagers noch als „Ware“.
export const PROGNOSE_FENSTER = 28;
export const QUOTE_MAX = 0.9;
export function belegQuoteFenster(stand, datum, satz) {
  const von = tagPlus(datum, -(PROGNOSE_FENSTER - 1));
  let erster = null;
  for (const n of stand.tagesnotizen || []) if (!n.storniert && typeof n.umsatz === "number" && typeof n.datum === "string" && (erster === null || n.datum < erster)) erster = n.datum;
  for (const l of stand.lieferungen || []) if (!l.storniert && typeof l.datum === "string" && (erster === null || l.datum < erster)) erster = l.datum;
  if (erster === null || erster > von) return null;
  const ek = einkaufJeTag(stand, von, datum); const belege = Object.values(ek.jeTag).reduce((a, b) => a + b, 0);
  let u = 0; for (let d = von; d <= datum; d = tagPlus(d, 1)) { const e = umsatzEintrag(stand, d); if (e) u += e.umsatz / (1 + satz); }
  return u > 0 ? belege / u : null;
}

// Glättung Stufe 3 (27.10.2026): Belegquote über die vorhandenen Tage (weniger als 28), mit Gewicht 0 bis Tag 7, dann linear bis 1 an Tag 28.
export function belegQuoteTeil(stand, datum, satz) {
  let erster = null;
  for (const n of stand.tagesnotizen || []) if (!n.storniert && typeof n.umsatz === "number" && typeof n.datum === "string" && (erster === null || n.datum < erster)) erster = n.datum;
  for (const l of stand.lieferungen || []) if (!l.storniert && typeof l.datum === "string" && (erster === null || l.datum < erster)) erster = l.datum;
  if (erster === null || erster > datum) return null;
  let tage = 0; for (let d = erster; d <= datum && tage < PROGNOSE_FENSTER; d = tagPlus(d, 1)) tage += 1;
  const gewicht = Math.max(0, Math.min(1, (tage - 7) / (PROGNOSE_FENSTER - 7)));
  if (gewicht === 0) return null;
  // ganze Wochen rückwärts ab heute: ein Wocheneinkauf steht so gegen den Umsatz der Woche, die er versorgt (kein Sägezahn am Einkaufstag)
  const von = tagPlus(datum, -(Math.floor(tage / 7) * 7 - 1));
  const ek = einkaufJeTag(stand, von, datum); const belege = Object.values(ek.jeTag).reduce((a, b) => a + b, 0);
  let u = 0; for (let d = von; d <= datum; d = tagPlus(d, 1)) { const e = umsatzEintrag(stand, d); if (e) u += e.umsatz / (1 + satz); }
  return u > 0 ? { quote: belege / u, gewicht, tage } : null;
}

// Der Zähler für den Monat, in dem `datum` liegt, Stand am Abend von `datum`. Paket 3, M7: Standard ist der Geschäftstag (bis 4 Uhr = Vortag).
export function zaehler(stand, { datum = heuteGeschaeft() } = {}) {
  const M = monatsGrenzen(datum);
  const last = monatsLast(stand);
  const steuer = umsatzSteuerSatz(stand);
  const q = warenQuote(stand);
  const einkauf = einkaufJeTag(stand, M.von, M.bis);
  const muell = muellJeTag(stand, M.von, M.bis);
  // 27.10.2026 (Prüfung L3, Baris: Schwund bewegt „bis null“): Was die Inventur als „mehr weg als erwartet, ohne Erklärung“ zeigt, ist echter
  // Wareneinsatz ohne Umsatz. Ohne Belege (Stufe 1/2) zählt er am Zähltag mit; mit Belegen (Stufe 3) steckt er schon im Einkauf.
  const schwund = {};
  try { const fertig = inventurenFertig(stand); for (let i = 1; i < fertig.length; i++) { const v = inventurVergleich(stand, fertig[i], fertig[i - 1]); if (v && v.ohneErklaerung > 0 && v.bis >= M.von && v.bis <= M.bis) schwund[v.bis] = (schwund[v.bis] || 0) + v.ohneErklaerung; } } catch { /* ohne Inventur kein Schwund */ }
  // Beginn der Zählung: der erste Tag des Monats mit Umsatzeintrag (Review Etappe 5, Punkt 10). Wer am 12. anfängt, bekommt nicht elf Tage
  // Kosten ohne Umsatz angerechnet; Tage davor zählen nicht, und das steht im Cockpit („zählt ab dem …").
  let start = null;
  for (let d = M.von; d <= datum && d <= M.bis; d = tagPlus(d, 1)) if (umsatzEintrag(stand, d) || einkauf.jeTag[d]) { start = d; break; } // auch ein Beleg (Ware vor dem Verkauf) startet die Zählung
  if (start === null) start = datum;
  // 27.10.2026 (Prüfung fest/beweglich, Baris: feste Kosten sind fest): Wer die ersten Tage nicht einträgt, spart sich keine Miete.
  // Die Zählung beginnt am Monatsersten bzw. am Tag, an dem der Laden in der App angelegt wurde – nicht erst beim ersten Eintrag.
  const angelegt = typeof stand.angelegt === "string" ? heuteGeschaeft(new Date(stand.angelegt)) : null;
  const startFest = angelegt && angelegt > M.von ? angelegt : M.von;
  if (startFest < start) start = startFest > datum ? datum : startFest;
  // Umsatz netto gesamt vorab, für die Belegquote
  let umsatzNettoGesamt = 0;
  for (let d = start; d <= datum && d <= M.bis; d = tagPlus(d, 1)) { const e = umsatzEintrag(stand, d); if (e) umsatzNettoGesamt += e.umsatz / (1 + steuer.satz); }
  // Stufe 3 nur mit Karte (sonst gibt es keine Schätzung zum Vergleichen) und wenn der Einkauf aus Belegen mindestens so hoch ist wie die
  // Schätzung aus der Karte – ein einzelner Beleg würde den Zähler sonst zu grün machen. Lieber zu rot als zu grün: es zählt die höhere Zahl.
  // Paket 3 (16.10.2026), M15/E2: Stufe 1 = ohne Karte, rechnet jetzt mit dem Branchen-Richtwert (quelle "richtwert") statt mit Quote 0;
  // Stufe 3 weiterhin nur mit Karte (ein Richtwert ist keine Schätzung zum Vergleichen – Entscheidung „Ohne Karte keine Stufe 3“ bleibt).
  const mitKarte = q.quelle !== "richtwert";
  let stufe = mitKarte ? 2 : 1;
  const belegSumme = Object.entries(einkauf.jeTag).filter(([d]) => d <= datum).reduce((a, [, b]) => a + b, 0); // Gegenprüfung 27.10.: nur Belege bis zum gewählten Tag
  if (einkauf.anzahl > 0 && mitKarte && belegSumme > 0 && belegSumme >= umsatzNettoGesamt * q.quote) stufe = 3;
  // 27.10.2026 (Glättung): am Monatsanfang, vor dem ersten Beleg des Monats, fiel der Laden auf Stufe 2 zurück – die Quote sprang auf die
  // Kartenquote und mit dem ersten Beleg wieder hoch. Hat die App schon eine Belegquote aus den letzten Wochen, bleibt Stufe 3.
  if (stufe === 2 && belegSumme === 0) { const f = belegQuoteFenster(stand, datum, steuer.satz) ?? belegQuoteTeil(stand, datum, steuer.satz)?.quote ?? null; if (f !== null && f >= q.quote) stufe = 3; }
  // Quote für Prognose, Tempo und „pro Tag nötig“. Schwadron 18.10.2026, H1: in Stufe 3 NICHT mehr „Belege Monat bis heute / Umsatz bis
  // heute“ – am Einkaufstag und am Monatsersten stand dort der ganze Beleg gegen ein, zwei Tage Umsatz (Quote 95 %, „4.769 € / Tag nötig“).
  // Jetzt: Belegquote über die letzten 28 Kalendertage (über die Monatsgrenze), erst wenn die App so lange Daten hat; davor die Kartenquote
  // (Verbrauch laut Rezept). Nie unter der Kartenquote, höchstens 0,9. Stand, Ware und Monatssumme bleiben echte Belege (unverändert).
  const belegQuoteMonat = umsatzNettoGesamt > 0 ? belegSumme / umsatzNettoGesamt : null;
  const quoteFenster = stufe === 3 ? belegQuoteFenster(stand, datum, steuer.satz) : null;
  // 27.10.2026 (Glättung Stufe 3): bisher sprang die Quote am 28. Tag von der Kartenquote auf die Belegquote. Jetzt gleitet sie: ab Tag 8
  // mit Daten wächst das Gewicht der Belegquote linear, ab Tag 28 gilt sie ganz (wie bisher). Ein Großeinkauf in der ersten Woche zählt nicht.
  const gleitend = stufe === 3 && quoteFenster === null ? belegQuoteTeil(stand, datum, steuer.satz) : null;
  const quoteBeleg = quoteFenster ?? (gleitend ? q.quote + gleitend.gewicht * (Math.max(q.quote, Math.min(QUOTE_MAX, gleitend.quote)) - q.quote) : null);
  const quoteEff = stufe === 3 ? Math.min(QUOTE_MAX, Math.max(q.quote, quoteBeleg ?? q.quote)) : (q.quote ?? 0);
  const belegQuoteZaehlt = stufe === 3 && quoteFenster !== null && quoteFenster !== undefined && quoteFenster >= q.quote;

  // Öffnungstage des Monats (gewichtet) und Tageskosten
  const tage = []; let gewichtMonat = 0;
  for (let d = M.von; d <= M.bis; d = tagPlus(d, 1)) { const w = tagGewicht(stand, d); gewichtMonat += w; tage.push({ datum: d, gewicht: w }); }
  // Sonderkosten des Monats aus Kostenbelegen (einmalig / auf Monate verteilt), Etappe 6a – kommen zur Monatslast dazu
  const sonder = sonderkostenImMonat(stand, M.von.slice(0, 7));
  const tageskosten = gewichtMonat > 0 ? (last.gesamt + sonder.summe) / gewichtMonat : 0;
  // 27.10.2026 (Baris: Mitarbeiter sind bewegliche Kosten): Lohn je Tag aus „Mitarbeiter heute“ (Brutto × Arbeitgeberanteil), sonst die
  // Monatssumme anteilig als Schätzung. Tageskosten ohne Lohn sind die festen Kosten des Tages.
  // Feste Monatslöhne (lohnModell "monat") sind feste Kosten; der Rest der Lohnsumme ist der geschätzte Stundenlohn-Anteil.
  const lohnMonat = last.lohn ?? 0; const festPersonal = last.festPersonal || 0;
  const tageskostenFest = gewichtMonat > 0 ? (last.gesamt - lohnMonat + festPersonal + sonder.summe) / gewichtMonat : 0;
  const lohnStundenMonat = Math.max(0, lohnMonat - festPersonal);
  const lohnAnteilig = gewichtMonat > 0 ? lohnStundenMonat / gewichtMonat : 0;
  // Ein Eintrag zählt nur, wenn bei allen Personen der Stundenlohn da ist – sonst bleibt der Tag beim Anteil (Gegenprüfung 27.10.: fehlender Lohn ≠ 0 €).
  const lohnAm = (d, gewicht) => { const e = teamTag(stand, d); const vollstaendig = e && (e.keine || e.eintraege.every((x) => x.satz > 0));
    return vollstaendig ? { betrag: teamTagKosten(e), echt: true } : { betrag: lohnAnteilig * gewicht, echt: false }; };
  const anteil = (betrag) => gewichtMonat > 0 ? (betrag || 0) / gewichtMonat : 0;

  // Ab Start bis heute: Umsatz, Ware, Müll, Kosten je Tag aufsummieren
  let kosten = 0, umsatzBrutto = 0, umsatzNetto = 0, ware = 0, muellSumme = 0, gewichtBisHeute = 0, tageMitUmsatz = 0, db = 0;
  const prov = lieferProvision(stand); let provisionSumme = 0, lieferBrutto = 0, lieferBasisBrutto = 0; // Lieferdienst (27.10.2026)
  let standGestern = 0, kippTag = null, letzterStand = 0;
  let schwundSumme = 0; let muellNurPrognose = 0; // Gegenprüfung F6: Müll, den die Monatsrechnung braucht, wenn in Stufe 3 die Kartenquote gilt
  let lohnBis = 0, lohnEchtTage = 0, lohnEchtSumme = 0, lohnEchtGewicht = 0, lohnGeschaetztTage = 0, lohnEchtSummeOffen = 0;
  for (const t of tage) {
    if (t.datum > datum) { t.status = "zukunft"; continue; }
    if (t.datum < start) { t.status = "vorher"; t.stand = 0; continue; }
    t.status = t.datum === datum ? "heute" : "vergangen";
    const e = umsatzEintrag(stand, t.datum);
    const ub = e ? e.umsatz : 0; const un = ub / (1 + steuer.satz);
    const w = stufe === 3 ? (einkauf.jeTag[t.datum] || 0) : un * quoteEff; // Paket 3: Stufe 1 schätzt die Ware mit dem Richtwert
    const m = stufe === 3 ? 0 : (muell[t.datum] || 0); // Stufe 3: echte Belege enthalten den weggeworfenen Einkauf schon
    if (stufe === 3 && !belegQuoteZaehlt) muellNurPrognose += muell[t.datum] || 0;
    const lt = lohnAm(t.datum, t.gewicht); t.lohn = lt.betrag; t.lohnEcht = lt.echt;
    if (lt.echt) { lohnEchtTage += 1; lohnEchtSumme += lt.betrag; lohnEchtGewicht += t.gewicht; if (t.gewicht > 0) lohnEchtSummeOffen += lt.betrag; } else if (t.gewicht > 0) lohnGeschaetztTage += 1;
    lohnBis += lt.betrag;
    const ab = abwesendMonat(stand, M.von.slice(0, 7)); if (ab && ab.datum === t.datum) { const k = abwesendKosten(ab); lt.betrag += k; lohnBis += k; } // Urlaub/Krankheit am Tag der Antwort
    kosten += tageskostenFest * t.gewicht + lt.betrag; gewichtBisHeute += t.gewicht;
    const sw = stufe === 3 ? 0 : (schwund[t.datum] || 0); schwundSumme += sw;
    umsatzBrutto += ub; umsatzNetto += un; ware += w; muellSumme += m;
    const lt2 = prov && e ? lieferTag(stand, t.datum) : null; const pv = lt2 ? lieferKosten(Math.min(lt2.betrag, ub), prov, steuer.satz) : 0;
    if (lt2) { lieferBrutto += Math.min(lt2.betrag, ub); lieferBasisBrutto += ub; } provisionSumme += pv;
    if (e) { tageMitUmsatz += 1; db += un * (1 - quoteEff) - m - pv; }
    if (t.datum === datum) standGestern = letzterStand;
    letzterStand = umsatzNetto - ware - muellSumme - schwundSumme - kosten - provisionSumme;
    t.stand = letzterStand; t.umsatz = !!e;
    if (kippTag === null && letzterStand >= 0 && tageMitUmsatz > 0) kippTag = t.datum;
    if (letzterStand < 0) kippTag = null; // wieder unter null: der Kipptag ist der letzte Übergang
  }
  const standHeute = letzterStand;
  const pJB = prov && lieferBasisBrutto > 0 ? lieferKosten(lieferBrutto, prov, steuer.satz) / lieferBasisBrutto : 0; // Provision je Euro Brutto-Umsatz

  // Prognose: Deckungsbeitrag je Tag mit Umsatz, gegen die Tageskosten
  const dbProTag = tageMitUmsatz > 0 ? db / tageMitUmsatz : null;
  // Gegenprüfung 27.10.: künftige Tage immer mit dem anteiligen Monatslohn – ein einzelner Eintrag wird nicht auf den Monat hochgerechnet.
  // Nur ohne Monatssumme (Lohn nie eingetragen) nimmt die Vorhersage den Schnitt der echten Öffnungstage (Ruhetage zählen dort nicht mit).
  const lohnJeGewicht = lohnStundenMonat > 0 ? lohnAnteilig : (lohnEchtGewicht > 0 ? lohnEchtSummeOffen / lohnEchtGewicht : 0);
  const tageskostenPrognose = tageskostenFest + lohnJeGewicht; // je Öffnungstag (Gewicht 1) für die restlichen Tage
  const gewichtZukunft = tage.filter((t) => t.status === "zukunft").reduce((a, t) => a + t.gewicht, 0);
  let nullTag = null, monatsende = null, reichtNicht = false;
  if (dbProTag !== null) {
    let s = standHeute; let gefunden = standHeute >= 0 ? datum : null;
    for (const t of tage) {
      if (t.status !== "zukunft") continue;
      s += (dbProTag - tageskostenPrognose) * t.gewicht; t.stand = s;
      if (gefunden === null && s >= 0) gefunden = t.datum;
    }
    monatsende = s; nullTag = gefunden;
    reichtNicht = standHeute < 0 && nullTag === null;
  }
  const unvollstaendig = last.offen > 0;
  // Paket 3 (16.10.2026), M2/M15: geschätzt, wenn der Mischsatz ohne echte Mengen gewichtet ist, die Quote vom Richtwert kommt oder der
  // eigene Lohn ein Richtwert ist – unter Stufe 3 ist die Ware ohnehin eine Schätzung aus der Karte.
  const lohnGeschaetzt = lohnStundenMonat > 0 && lohnGeschaetztTage > 0;
  const geschaetzt = stufe < 3 || !!steuer.geschaetzt || !!q.geschaetzt || last.eigen.status === "geschaetzt" || last.fix.geschaetzt > 0 || lohnGeschaetzt;
  return {
    datum, monat: M, stufe, quote: q.quote, quoteEff, quoteFenster, quoteGleitend: gleitend, provision: provisionSumme, lieferAnteil: lieferBasisBrutto > 0 ? lieferBrutto / lieferBasisBrutto : 0, provisionJeBrutto: pJB, belegQuoteMonat, quoteQuelle: q.quelle, quoteGeschaetzt: !!q.geschaetzt, quoteRichtpreis: !!q.richtpreis, steuer: steuer.satz, steuerQuelle: steuer.quelle, steuerGeschaetzt: !!steuer.geschaetzt, geschaetzt, start, belegSumme,
    nettoVon: (brutto) => (Number(brutto) || 0) / (1 + steuer.satz), bleibtVon: (brutto) => (Number(brutto) || 0) / (1 + steuer.satz) * (1 - quoteEff) - (Number(brutto) || 0) * pJB, // Lieferdienst (Persona-Test 27.10.): Provision je Euro wie im Tagesschnitt
    stand: standHeute, standGestern, bewegungHeute: standHeute - standGestern, imPlus: standHeute >= 0 && tageMitUmsatz > 0,
    kosten, fix: anteil(last.fixJeOffen) * gewichtBisHeute, lohn: lohnBis, lohnEchtTage, lohnGeschaetzt, tageskostenFest, tageskostenPrognose, gewichtZukunft, eigen: anteil(last.eigen.betrag ?? 0) * gewichtBisHeute, sonderBis: anteil(sonder.summe) * gewichtBisHeute,
    umsatzBrutto, umsatzNetto, ware, muell: muellSumme, muellPrognose: muellNurPrognose, schwund: schwundSumme, tageskosten, gewichtMonat, gewichtBisHeute, tageMitUmsatz,
    dbProTag, noetigProTag: standHeute < 0 && gewichtMonat - gewichtBisHeute > 0 ? tageskostenPrognose + (-standHeute) / (gewichtMonat - gewichtBisHeute) : null,
    nullTag, kippTag, monatsende, reichtNicht, tage, unvollstaendig, keinUmsatz: tageMitUmsatz === 0, last, sonder, belege: einkauf.anzahl,
  };
}

// Sieben Tage bis `datum` gegen die sieben Tage davor (Tagesumsatz brutto), für die Balken im Cockpit.
export function wochenVergleich(stand, datum = heuteGeschaeft()) { // Paket 3, M7
  const diese = [], vorige = [];
  for (let i = 6; i >= 0; i--) {
    const d = tagPlus(datum, -i); const v = tagPlus(datum, -i - 7);
    diese.push({ datum: d, umsatz: umsatzEintrag(stand, d)?.umsatz ?? null });
    vorige.push({ datum: v, umsatz: umsatzEintrag(stand, v)?.umsatz ?? null });
  }
  const summe = (l) => l.reduce((s, x) => s + (x.umsatz || 0), 0);
  const max = Math.max(1, ...diese.map((x) => x.umsatz || 0), ...vorige.map((x) => x.umsatz || 0));
  return { diese, vorige, summeDiese: summe(diese), summeVorige: summe(vorige), tageDiese: diese.filter((x) => x.umsatz !== null).length, tageVorige: vorige.filter((x) => x.umsatz !== null).length, max };
}

// Tag abschließen (Abendritual): ein Journaleintrag je Abschluss mit dem Stand des Zählers. Der jüngste je Datum gilt.
// Paket 3, M7: Abschluss um 01:30 gehört zum Vortag (Geschäftstag); der Kühl-Stand bleibt am Kalendertag (kuehlStatus rechnet mit heute()).
export function tagAbschliessen(stand, { datum = heuteGeschaeft(), geraet = null } = {}) {
  const z = zaehler(stand, { datum }); const sw = schwundAuswertung(stand, { von: datum, bis: datum }); const ks = datum === heuteGeschaeft() ? kuehlStatus(stand) : null;
  const e = { id: uid(), datum, erfasst: new Date().toISOString(), geraet, umsatz: umsatzEintrag(stand, datum)?.umsatz ?? null,
    muell: sw.muellwert, muellOhneWert: sw.ohneWert, kuehl: ks && ks.eingerichtet ? { gemessen: ks.heuteGemessen, stellen: ks.stellen } : null,
    stand: z.stand, standGestern: z.standGestern, stufe: z.stufe, storniert: false };
  stand.abschluesse.push(e); return e;
}
export const abschlussVon = (stand, datum) => (stand.abschluesse || []).filter((a) => a.datum === datum && !a.storniert).sort((x, y) => String(x.erfasst).localeCompare(String(y.erfasst))).pop() || null;

// ---------- Trennung (17.10.2026): aus js/screens/home.js ins Rechenwerk verschoben (unverändert) ----------
// Monatsziel = Umsatz (brutto), bei dem der Monat auf null kommt: (Monatskosten + Sonderkosten) / (1 − Wareneinsatz-Quote) × (1 + Mehrwertsteuer).
// Alles aus dem Rechenwerk (Zähler), nichts geschätzt, was nicht schon geschätzt ist; ohne Kosten gibt es kein Ziel („–").
// Monatsziel (Baris 15.10., 13:35): „bis null plus Zielgewinn“. null = Umsatz, der alle Kosten deckt; ziel = zusätzlich der Zielgewinn
// (Anteil vom Nettoumsatz, wie in der Kalkulation, Feld verkauf.zielgewinn). Beides brutto, wie der Umsatz eingetragen wird.
export function monatsZiel(stand, z, H) {
  // Kosten wie im Zähler (Review 15.10.): nur ab dem ersten Zähltag (z.start) anteilig nach Öffnungstagen, plus eingetragener Müll,
  // damit Karte, Band und Zähler dieselbe Rechnung zeigen.
  // 27.10.2026 (Baris: fest ist fest, beweglich bewegt sich täglich): Kosten des Monats = echte Kosten bis heute (feste Tageskosten, Lohn aus
  // „Mitarbeiter heute“ oder anteilig, Müll und Personalessen) + Prognose für die restlichen Öffnungstage. Laden und Büro nutzen nur diese Zahl.
  const kostenMonat = (z.last?.gesamt || 0) + (z.sonder?.summe || 0);
  const kosten = typeof z.kosten === "number" && z.tageskostenPrognose !== undefined
    ? z.kosten + (z.tageskostenPrognose || 0) * (z.gewichtZukunft || 0) + (z.muell || 0) + (z.muellPrognose || 0) + (z.schwund || 0)
    : kostenMonat + (z.muell || 0);
  const q = Math.min(0.9, Math.max(0, z.quoteEff || 0));
  const g = Math.min(0.5, Math.max(0, (Number(stand.verkauf?.zielgewinn) || 0) / 100));
  const brutto = 1 + (z.steuer || 0);
  // Lieferdienst (27.10.2026): Provision je Euro Brutto-Umsatz (bisheriger Anteil über Lieferdienste × Satz) senkt, was jeder Euro übrig lässt.
  const pS = Math.min(0.3, Math.max(0, z.provisionJeBrutto || 0));
  const nenner = (1 - q) / brutto - pS;
  const nullpunkt = kosten > 0 && nenner > 0.02 ? kosten / nenner : kosten > 0 ? kosten / (1 - q) * brutto : null;
  const nennerZ = (1 - q - g) / brutto - pS;
  const ziel = nullpunkt === null ? null : 1 - q - g > 0.05 && nennerZ > 0.02 ? kosten / nennerZ : nullpunkt;
  const tage = []; let summe = 0;
  for (const x of z.tage) { if (x.datum > H) break; const u = umsatzEintrag(stand, x.datum); summe += u ? u.umsatz : 0; tage.push({ datum: x.datum, umsatz: u ? u.umsatz : null, kumuliert: summe }); }
  // „Null“ heißt überall dasselbe wie im Zähler (Nachtester 15.10.): gerechneter Stand bis heute ≥ 0. Danach zählt das Monatsziel mit Zielgewinn.
  // 27.10.2026: eine Rechnung – „bis null“ heißt überall: Umsatz, der diesen Monat noch fehlt (Nullpunkt − Umsatz bis heute).
  const stufe = nullpunkt === null ? "ohne" : summe < nullpunkt ? "bisNull" : summe < ziel ? "bisZiel" : "ueberZiel";
  const fehltNullZ = nullpunkt === null ? null : Math.max(0, nullpunkt - summe);
  let erreichtAm = null, proTagNoetig = null;
  if (stufe === "bisNull" && !z.keinUmsatz) { erreichtAm = z.nullTag || null; if (!erreichtAm && z.noetigProTag) proTagNoetig = z.noetigProTag / (nenner > 0.02 ? nenner : (1 - q) / brutto); }
  if (stufe === "bisZiel") { // Tempo: Umsatz je Öffnungstag bisher, hochgerechnet auf die restlichen Öffnungstage
    const gBis = (z.tage || []).filter((x) => x.datum <= H && (!z.start || x.datum >= z.start)).reduce((a2, x) => a2 + (x.gewicht || 0), 0);
    if (gBis > 0 && summe > 0) { const tempo = summe / gBis; let s2 = summe;
      for (const x of z.tage) { if (x.datum <= H) continue; s2 += tempo * (x.gewicht || 0); if (s2 >= ziel) { erreichtAm = x.datum; break; } }
      if (!erreichtAm) { const rest = (z.tage || []).filter((x) => x.datum > H).reduce((a2, x) => a2 + (x.gewicht || 0), 0); proTagNoetig = rest > 0 ? (ziel - summe) / rest : null; } } }
  return { ziel, nullpunkt, gewinnAnteil: g, umsatz: summe, stufe, erreichtAm, proTagNoetig,
    fehlt: ziel === null ? null : Math.max(0, ziel - summe), fehltNull: nullpunkt === null ? null : fehltNullZ,
    darueber: ziel === null ? null : Math.max(0, summe - ziel), tage,
    // Paket 3 (16.10.2026), M2/M15/E2: ausdrücklich geschätzt, wenn der eigene Lohn ein Richtwert ist ODER die Warenquote vom Branchen-
    // Richtwert kommt ODER der Mischsatz ohne echte Mengen gewichtet ist (dazu wie bisher: Ware unter Stufe 3, Fixkosten geschätzt).
    geschaetzt: z.stufe < 3 || z.last?.fix?.geschaetzt > 0 || z.last?.eigen?.status === "geschaetzt" || z.quoteQuelle === "richtwert" || !!z.quoteRichtpreis || !!z.steuerGeschaetzt,
    richtwertWare: z.quoteQuelle === "richtwert" || !!z.quoteRichtpreis, richtwertLohn: z.last?.eigen?.status === "geschaetzt" };
}
// Wareneinsatz in % vom Netto-Umsatz: Stufe 3 aus Belegen und Umsatz, Stufe 2 aus Karte oder eigener Quote, sonst (Paket 3, M15/E2)
// der Branchen-Richtwert als Schätzung (geschaetzt: true, quelle "richtwert").
// Schwadron 18.10.2026, N5: Belege gegen wenig Umsatz (Lager wird aufgebaut) ergaben 180 %. Gedeckelt auf QUOTE_MAX; liegt der Rohwert
// darüber, steht unplausibel: true (roh = ungedeckelter Wert) – eine Anzeige zeigt dann keinen Prozentwert, sondern „noch zu wenig Umsatz“.
export function wareneinsatzQuote(stand, z) {
  if (z.stufe === 3 && z.umsatzNetto > 0) { const roh = z.belegSumme / z.umsatzNetto; return roh > QUOTE_MAX ? { quote: QUOTE_MAX, quelle: "belege", geschaetzt: false, unplausibel: true, roh } : { quote: roh, quelle: "belege", geschaetzt: false }; }
  if (z.quote !== null && z.quote !== undefined) return { quote: z.quote, quelle: z.quoteQuelle, geschaetzt: z.quoteQuelle === "richtwert" || !!z.quoteRichtpreis, ...(z.quoteRichtpreis ? { richtpreis: true } : {}) }; // Richtpreise (17.10.2026)
  return { quote: null, quelle: "keine", geschaetzt: false };
}
// Monatskurve in der Zählerkarte: Stand je Tag seit Zählbeginn, Nulllinie, Punkt „heute", gestrichelte Prognose bis Monatsende, Null-Tag markiert
export function zaehlerVerlauf(z) {
  const ist = z.tage.filter((x) => x.status === "vergangen" || x.status === "heute").filter((x) => x.datum >= z.start).map((x) => ({ datum: x.datum, stand: x.stand }));
  const prognose = z.dbProTag !== null ? z.tage.filter((x) => x.status === "zukunft" && typeof x.stand === "number").map((x) => ({ datum: x.datum, stand: x.stand })) : [];
  return { ist, prognose, nullTag: z.nullTag, tage: z.tage.length };
}

// ---------- Trennung 2 (17.10.2026): Zahlen der Seite „Monat & Zähler“ (vorher in js/screens/umsatz.js) ----------
// Kasse ist brutto; wer netto tippt, bekommt es brutto gespeichert. satz = Umsatzsteuer-Satz (z. B. 0,07).
export const umsatzAnzeigeWert = (brutto, basis, satz) => (brutto === null || brutto === undefined ? null : basis === "netto" ? Math.round(brutto / (1 + satz) * 100) / 100 : brutto);
export const umsatzAusEingabe = (betrag, basis, satz) => (basis === "netto" ? Math.round(betrag * (1 + satz) * 100) / 100 : betrag);
// Strecke von „alle Kosten offen“ (links, 0 %) bis Monatsende (rechts): Lage von heute und null in Prozent; bringt = was ein Beispielumsatz übrig lässt.
export function zaehlerStrecke(z, beispiel = 1000) {
  if (z.keinUmsatz) return null;
  const min = -Math.max(z.last.gesamt, 1); const max = Math.max(z.monatsende ?? 0, z.stand, Math.abs(min) * 0.3);
  const pos = (v) => Math.round(Math.min(1, Math.max(0, (v - min) / (max - min))) * 100);
  return { heute: pos(z.stand), null: pos(0), nullTag: z.nullTag, beispiel, bringt: z.bleibtVon(beispiel) };
}
// Monatsstreifen: Zustand eines Tages – "offen" (vor dem Start / ohne Stand) | "frei" (Ruhetag) | "ziel" (im Plus) | "zukunft" | "minus".
export function monatTagStatus(x, z) {
  return x.status === "vorher" ? "offen" : x.gewicht === 0 ? "frei" : x.status === "zukunft" ? (x.stand === undefined ? "offen" : x.stand >= 0 ? "ziel" : "zukunft") : (x.stand >= 0 && !z.keinUmsatz ? "ziel" : "minus");
}
// Spalte (1 = Montag … 7 = Sonntag) des ersten Monatstags im Kalender.
export const wochentagSpalte = (iso) => ((new Date(iso + "T12:00").getDay() + 6) % 7) + 1;
