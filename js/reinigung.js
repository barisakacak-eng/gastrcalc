// Reinigung & Betriebsmittel (Etappe 6, Punkt 5 – Entscheidung Baris 15.10.2026, 12:43: Onboarding B1, Zeile im Kostenzähler BZ).
// Grundsatz wie überall: keine erfundenen Branchenwerte. Die Zahl hat eine von drei ehrlichen Stufen:
//   offen      – nichts bekannt (der Zähler zeigt „noch offen“)
//   schaetzung – der Wirt hat einen Monatsbetrag geschätzt (≈)
//   beleg      – aus eingelesenen Belegen mit Putzmitteln, Müllbeuteln, Handschuhen …
//   inventur   – Einkauf minus Bestand aus zwei Inventuren (genauer geht es nicht; kommt mit Punkt 3)
// Eigene Putzzeit ist KEIN Geld vom Konto: Teamlohn steckt schon im Personal, Inhaberzeit kostet kein Geld. Sie wird nur als Einsicht gezeigt.
import { heute } from "./util.js";
// Öffnungstag-Gewicht wie im Zähler (zaehler.js tagGewicht), hier nachgebaut, damit engine.js ohne Kreisimport rechnen kann.
const tagGewicht = (stand, datum) => { const ruhe = stand.kuehl?.ruhetage || []; if (ruhe.length) return ruhe.includes(new Date(datum + "T12:00").getDay()) ? 0 : 1;
  return Math.min(7, Math.max(1, Number(stand.betrieb?.tageProWoche) || 6)) / 7; };

// Betriebsmittel: wird verbraucht, aber nicht verkauft (nach Name, weil der Katalog sie bisher unter Verpackung führt).
const BETRIEBSMITTEL = /reinig|spül|spuel|desinf|schwamm|lappen|m[üu]llbeutel|m[üu]llsack|abfallbeutel|handschuh|frischhalte|backpapier|k[üu]chenrolle|putz|wischtuch|seife|entkalk|fettl[öo]ser|scheuer|glasreiniger|grillreiniger|klarsp[üu]l|tabs\b/i;
export const istBetriebsmittel = (name) => BETRIEBSMITTEL.test(String(name || ""));

export const REINIGUNG_LEER = { wer: null, firmaBetrag: null, minutenTag: 45, durch: "team", mittelSchaetzung: null };
export const reinigungVon = (stand) => ({ ...REINIGUNG_LEER, ...(stand.betrieb?.reinigung || {}) });

const tagMinus = (iso, n) => { const d = new Date(iso + "T12:00"); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };

// Öffnungstage in einem Monat (30 Kalendertage ab heute rückwärts, gewichtet wie im Zähler)
export function oeffnungstageMonat(stand, datum = heute()) {
  let s = 0; for (let i = 0; i < 30; i++) s += tagGewicht(stand, tagMinus(datum, i));
  return s;
}

// Putzmittel & Co. aus Belegen: Summe der letzten 60 Tage, auf 30 Tage umgerechnet.
export function mittelAusBelegen(stand, datum = heute()) {
  const von = tagMinus(datum, 59); let summe = 0; const belege = new Set();
  for (const l of stand.lieferungen || []) {
    if (l.storniert || l.datum < von || l.datum > datum) continue;
    for (const z of l.zeilen || []) if (typeof z.netto === "number" && z.netto > 0 && istBetriebsmittel(z.artikel || z.name)) { summe += z.netto; belege.add(l.id); }
  }
  return belege.size ? { jeMonat: summe / 2, belege: belege.size } : null;
}

// Die Zeile im Kostenzähler. null = Reinigung wurde nie gefragt (alte Läden): dann gibt es die Zeile nicht.
// inventurMittel: optionaler Verbrauch je Monat aus zwei Inventuren (Punkt 3), wird vom Aufrufer übergeben.
const ausInventur = (stand) => { const f = (stand.inventuren || []).filter((i) => i.abgeschlossen && typeof i.betriebsmittelJeMonat === "number").sort((a, b) => a.datum.localeCompare(b.datum)).pop(); return f ? f.betriebsmittelJeMonat : null; };
export function reinigungMonat(stand, { datum = heute(), inventurMittel = ausInventur(stand) } = {}) {
  const r = stand.betrieb?.reinigung; if (!r || !r.wer) return null;
  const firma = r.wer === "selbst" ? 0 : (typeof r.firmaBetrag === "number" ? r.firmaBetrag : null);
  let mittel = null, stufe = "offen", belege = 0;
  if (typeof inventurMittel === "number") { mittel = inventurMittel; stufe = "inventur"; }
  else { const b = mittelAusBelegen(stand, datum);
    if (b) { mittel = b.jeMonat; stufe = "beleg"; belege = b.belege; }
    else if (typeof r.mittelSchaetzung === "number") { mittel = r.mittelSchaetzung; stufe = "schaetzung"; } }
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
