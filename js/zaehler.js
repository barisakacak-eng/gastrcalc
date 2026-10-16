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
  let w = 0, u = 0;
  for (const z of k.zeilen) if (z.waren !== null && z.preisNetto !== null && z.preisNetto > 0) { const m = z.menge || 1; w += z.waren * m; u += z.preisNetto * m; }
  if (!(u > 0)) return richtwert;
  return { quote: Math.min(0.89, w / u), quelle: "karte", geschaetzt: false };
}

// Müllwert je Tag (Vorgang 1, bewertete Einträge), als Karte datum → €.
function muellJeTag(stand, von, bis) {
  const out = {};
  for (const e of stand.schwund || []) {
    if (e.storniert || (SCHWUND_ARTEN[e.art] || 1) !== 1 || typeof e.datum !== "string" || e.datum < von || e.datum > bis) continue;
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

// Der Zähler für den Monat, in dem `datum` liegt, Stand am Abend von `datum`. Paket 3, M7: Standard ist der Geschäftstag (bis 4 Uhr = Vortag).
export function zaehler(stand, { datum = heuteGeschaeft() } = {}) {
  const M = monatsGrenzen(datum);
  const last = monatsLast(stand);
  const steuer = umsatzSteuerSatz(stand);
  const q = warenQuote(stand);
  const einkauf = einkaufJeTag(stand, M.von, M.bis);
  const muell = muellJeTag(stand, M.von, M.bis);
  // Beginn der Zählung: der erste Tag des Monats mit Umsatzeintrag (Review Etappe 5, Punkt 10). Wer am 12. anfängt, bekommt nicht elf Tage
  // Kosten ohne Umsatz angerechnet; Tage davor zählen nicht, und das steht im Cockpit („zählt ab dem …").
  let start = null;
  for (let d = M.von; d <= datum && d <= M.bis; d = tagPlus(d, 1)) if (umsatzEintrag(stand, d) || einkauf.jeTag[d]) { start = d; break; } // auch ein Beleg (Ware vor dem Verkauf) startet die Zählung
  if (start === null) start = datum;
  // Umsatz netto gesamt vorab, für die Belegquote
  let umsatzNettoGesamt = 0;
  for (let d = start; d <= datum && d <= M.bis; d = tagPlus(d, 1)) { const e = umsatzEintrag(stand, d); if (e) umsatzNettoGesamt += e.umsatz / (1 + steuer.satz); }
  // Stufe 3 nur mit Karte (sonst gibt es keine Schätzung zum Vergleichen) und wenn der Einkauf aus Belegen mindestens so hoch ist wie die
  // Schätzung aus der Karte – ein einzelner Beleg würde den Zähler sonst zu grün machen. Lieber zu rot als zu grün: es zählt die höhere Zahl.
  // Paket 3 (16.10.2026), M15/E2: Stufe 1 = ohne Karte, rechnet jetzt mit dem Branchen-Richtwert (quelle "richtwert") statt mit Quote 0;
  // Stufe 3 weiterhin nur mit Karte (ein Richtwert ist keine Schätzung zum Vergleichen – Entscheidung „Ohne Karte keine Stufe 3“ bleibt).
  const mitKarte = q.quelle !== "richtwert";
  let stufe = mitKarte ? 2 : 1;
  const belegSumme = Object.values(einkauf.jeTag).reduce((a, b) => a + b, 0);
  if (einkauf.anzahl > 0 && mitKarte && belegSumme > 0 && belegSumme >= umsatzNettoGesamt * q.quote) stufe = 3;
  // Quote für die Prognose: in Stufe 3 die Belegquote (nie unter der Kartenquote), sonst Karte oder Richtwert
  const quoteEff = stufe === 3 ? Math.min(0.95, Math.max(q.quote, umsatzNettoGesamt > 0 ? belegSumme / umsatzNettoGesamt : q.quote)) : (q.quote ?? 0);

  // Öffnungstage des Monats (gewichtet) und Tageskosten
  const tage = []; let gewichtMonat = 0;
  for (let d = M.von; d <= M.bis; d = tagPlus(d, 1)) { const w = tagGewicht(stand, d); gewichtMonat += w; tage.push({ datum: d, gewicht: w }); }
  // Sonderkosten des Monats aus Kostenbelegen (einmalig / auf Monate verteilt), Etappe 6a – kommen zur Monatslast dazu
  const sonder = sonderkostenImMonat(stand, M.von.slice(0, 7));
  const tageskosten = gewichtMonat > 0 ? (last.gesamt + sonder.summe) / gewichtMonat : 0;
  const anteil = (betrag) => gewichtMonat > 0 ? (betrag || 0) / gewichtMonat : 0;

  // Ab Start bis heute: Umsatz, Ware, Müll, Kosten je Tag aufsummieren
  let kosten = 0, umsatzBrutto = 0, umsatzNetto = 0, ware = 0, muellSumme = 0, gewichtBisHeute = 0, tageMitUmsatz = 0, db = 0;
  let standGestern = 0, kippTag = null, letzterStand = 0;
  for (const t of tage) {
    if (t.datum > datum) { t.status = "zukunft"; continue; }
    if (t.datum < start) { t.status = "vorher"; t.stand = 0; continue; }
    t.status = t.datum === datum ? "heute" : "vergangen";
    const e = umsatzEintrag(stand, t.datum);
    const ub = e ? e.umsatz : 0; const un = ub / (1 + steuer.satz);
    const w = stufe === 3 ? (einkauf.jeTag[t.datum] || 0) : un * quoteEff; // Paket 3: Stufe 1 schätzt die Ware mit dem Richtwert
    const m = stufe === 3 ? 0 : (muell[t.datum] || 0);
    kosten += tageskosten * t.gewicht; gewichtBisHeute += t.gewicht;
    umsatzBrutto += ub; umsatzNetto += un; ware += w; muellSumme += m;
    if (e) { tageMitUmsatz += 1; db += un * (1 - quoteEff) - m; }
    if (t.datum === datum) standGestern = letzterStand;
    letzterStand = umsatzNetto - ware - muellSumme - kosten;
    t.stand = letzterStand; t.umsatz = !!e;
    if (kippTag === null && letzterStand >= 0 && tageMitUmsatz > 0) kippTag = t.datum;
    if (letzterStand < 0) kippTag = null; // wieder unter null: der Kipptag ist der letzte Übergang
  }
  const standHeute = letzterStand;

  // Prognose: Deckungsbeitrag je Tag mit Umsatz, gegen die Tageskosten
  const dbProTag = tageMitUmsatz > 0 ? db / tageMitUmsatz : null;
  let nullTag = null, monatsende = null, reichtNicht = false;
  if (dbProTag !== null) {
    let s = standHeute; let gefunden = standHeute >= 0 ? datum : null;
    for (const t of tage) {
      if (t.status !== "zukunft") continue;
      s += (dbProTag - tageskosten) * t.gewicht; t.stand = s;
      if (gefunden === null && s >= 0) gefunden = t.datum;
    }
    monatsende = s; nullTag = gefunden;
    reichtNicht = standHeute < 0 && nullTag === null;
  }
  const unvollstaendig = last.offen > 0;
  // Paket 3 (16.10.2026), M2/M15: geschätzt, wenn der Mischsatz ohne echte Mengen gewichtet ist, die Quote vom Richtwert kommt oder der
  // eigene Lohn ein Richtwert ist – unter Stufe 3 ist die Ware ohnehin eine Schätzung aus der Karte.
  const geschaetzt = stufe < 3 || !!steuer.geschaetzt || !!q.geschaetzt || last.eigen.status === "geschaetzt" || last.fix.geschaetzt > 0;
  return {
    datum, monat: M, stufe, quote: q.quote, quoteEff, quoteQuelle: q.quelle, quoteGeschaetzt: !!q.geschaetzt, steuer: steuer.satz, steuerQuelle: steuer.quelle, steuerGeschaetzt: !!steuer.geschaetzt, geschaetzt, start, belegSumme,
    nettoVon: (brutto) => (Number(brutto) || 0) / (1 + steuer.satz), bleibtVon: (brutto) => (Number(brutto) || 0) / (1 + steuer.satz) * (1 - quoteEff),
    stand: standHeute, standGestern, bewegungHeute: standHeute - standGestern, imPlus: standHeute >= 0 && tageMitUmsatz > 0,
    kosten, fix: anteil(last.fixJeOffen) * gewichtBisHeute, lohn: anteil(last.lohn ?? 0) * gewichtBisHeute, eigen: anteil(last.eigen.betrag ?? 0) * gewichtBisHeute, sonderBis: anteil(sonder.summe) * gewichtBisHeute,
    umsatzBrutto, umsatzNetto, ware, muell: muellSumme, tageskosten, gewichtMonat, gewichtBisHeute, tageMitUmsatz,
    dbProTag, noetigProTag: standHeute < 0 && gewichtMonat - gewichtBisHeute > 0 ? tageskosten + (-standHeute) / (gewichtMonat - gewichtBisHeute) : null,
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
