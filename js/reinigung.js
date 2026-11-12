// Reinigung & Betriebsmittel (Etappe 6, Punkt 5 – Entscheidung Baris 15.10.2026, 12:43: Onboarding B1, Zeile im Kostenzähler BZ).
// Grundsatz wie überall: keine erfundenen Branchenwerte. Die Zahl hat eine von drei ehrlichen Stufen:
//   offen      – nichts bekannt (der Zähler zeigt „noch offen“)
//   schaetzung – der Wirt hat einen Monatsbetrag geschätzt (≈)
//   beleg      – aus eingelesenen Belegen mit Putzmitteln, Müllbeuteln, Handschuhen …
//   inventur   – Einkauf minus Bestand aus zwei Inventuren (genauer geht es nicht; kommt mit Punkt 3)
// Eigene Putzzeit ist KEIN Geld vom Konto: Teamlohn steckt schon im Personal, Inhaberzeit kostet kein Geld. Sie wird nur als Einsicht gezeigt.
import { heute } from "./util.js";
import { oeffnungstage } from "./engine.js"; // Lauf 6 (P1 C3): dieselbe Öffnungstage-Regel wie im Zähler (inkl. „an Feiertagen zu“); Kreisimport ist unschädlich, weil nur zur Laufzeit aufgerufen
// Paket 3 (16.10.2026), M1: Kleinunternehmer bekommen keine Vorsteuer zurück – der Bruttobetrag zählt, wie er ist.
// Sonst gilt der Regelsatz (Regelwerk mwst_voll) für Dienstleistung und Putzmittel, am Tag des Vorgangs.
const vorsteuer = (stand, tag = heute()) => (stand.betrieb?.kleinunternehmer ? 0 : mwst("voll", tag));
import { istBetriebsmittel } from "./betriebsmittel.js";
import { plusTage } from "./zeit.js";
import { nettoVonBrutto, mwst } from "./geld.js";
export { istBetriebsmittel };

export const REINIGUNG_LEER = { wer: null, firmaBetrag: null, minutenTag: 45, durch: "team", mittelSchaetzung: null };
export const reinigungVon = (stand) => ({ ...REINIGUNG_LEER, ...(stand.betrieb?.reinigung || {}) });


// Öffnungstage in einem Monat (30 Kalendertage ab heute rückwärts, gewichtet wie im Zähler)
export function oeffnungstageMonat(stand, datum = heute()) {
  return oeffnungstage(stand, plusTage(datum, -29), datum);
}

// Putzmittel & Co. aus Belegen: Summe der letzten 60 Tage, auf 30 Tage umgerechnet.
export function mittelAusBelegen(stand, datum = heute()) {
  const von = plusTage(datum, -59); let summe = 0; const belege = new Set();
  for (const l of stand.lieferungen || []) {
    if (l.storniert || l.datum < von || l.datum > datum) continue;
    for (const z of l.zeilen || []) if (typeof z.netto === "number" && z.netto > 0 && istBetriebsmittel(z.artikel || z.name)) { summe += z.netto; belege.add(l.id); }
  }
  return belege.size ? { jeMonat: summe / 2, belege: belege.size } : null;
}

// Die Zeile im Kostenzähler. null = Reinigung wurde nie gefragt (alte Läden): dann gibt es die Zeile nicht.
// inventurMittel: optionaler Verbrauch je Monat aus zwei Inventuren (Punkt 3), wird vom Aufrufer übergeben.
// Lauf 6 (P1 B2): nur Inventuren bis zum Rechentag – sonst rechnet ein vergangener Monat mit einer Inventur aus der Zukunft.
const ausInventur = (stand, datum = heute()) => { const f = (stand.inventuren || []).filter((i) => i.abgeschlossen && typeof i.betriebsmittelJeMonat === "number" && !(typeof i.datum === "string" && i.datum > datum)).sort((a, b) => a.datum.localeCompare(b.datum)).pop(); return f ? f.betriebsmittelJeMonat : null; };
export function reinigungMonat(stand, { datum = heute(), inventurMittel = ausInventur(stand, datum) } = {}) {
  const r = stand.betrieb?.reinigung; if (!r || !r.wer) return null;
  // Eingaben stehen meist brutto auf der Rechnung (Review 15.10.): wie die anderen Kosten auf netto umrechnen (19 %), Schalter je Feld.
  const netto = (x) => (r.basis === "netto" ? x : nettoVonBrutto(x, vorsteuer(stand, datum))); // Paket 3, M1
  const firma = r.wer === "selbst" ? 0 : (typeof r.firmaBetrag === "number" ? netto(r.firmaBetrag) : null);
  const schaetzung = typeof r.mittelSchaetzung === "number" ? netto(r.mittelSchaetzung) : null;
  let mittel = null, stufe = "offen", belege = 0;
  if (typeof inventurMittel === "number") { mittel = inventurMittel; stufe = "inventur"; }
  else { const b = mittelAusBelegen(stand, datum);
    // Lieber zu rot als zu grün: ein kleiner Beleg drückt die eigene Schätzung nicht (Review 15.10.)
    if (b && (schaetzung === null || b.jeMonat >= schaetzung)) { mittel = b.jeMonat; stufe = "beleg"; belege = b.belege; }
    else if (schaetzung !== null) { mittel = schaetzung; stufe = "schaetzung"; } }
  const betrag = firma === null && mittel === null ? null : (firma || 0) + (mittel || 0);
  return { firma, mittel, stufe, belege, betrag, firmaOffen: firma === null };
}

// Einsicht „Ihr putzt 45 Min. am Tag, das sind rund X € Lohn im Monat“ – nur wenn der Stundenlohn aus dem Team ableitbar ist.
export function putzzeitMonat(stand, datum = heute()) {
  const r = reinigungVon(stand); if (!r.wer || r.wer === "firma") return null;
  const min = Number(r.minutenTag) || 0; if (min <= 0) return null;
  const stunden = min * oeffnungstageMonat(stand, datum) / 60;
  const t = stand.team || {}; const std = (Number(t.personen) || 0) * (Number(t.stundenProPerson) || 0);
  const stundenlohn = r.durch === "team" && std > 0 && Number(t.lohnkosten) > 0 ? Number(t.lohnkosten) / std : null;
  return { stunden, euro: stundenlohn !== null ? stunden * stundenlohn : null, durch: r.durch };
}
