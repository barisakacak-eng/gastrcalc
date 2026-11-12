// Rückwirkung: Rechnet die App vergangene Zeiträume mit dem Stand von heute?
import { beispielLaden } from "../js/beispiel.js";
import * as E from "../js/engine.js";
import { monatsZahlen, monatVergleich } from "../js/monatsabschluss.js";
const RealDate = Date; let JETZT = null;
class FakeDate extends RealDate { constructor(...a) { if (a.length === 0 && JETZT !== null) super(JETZT); else super(...a); } static now() { return JETZT ?? RealDate.now(); } }
globalThis.Date = FakeDate;
const s = beispielLaden("2026-11-11");
s.lieferungen = [{ id: "L1", datum: "2026-11-05", erfasst: "2026-11-05T10:00:00Z", lieferant: "X", summeNetto: 300, summeBrutto: 357, zeilen: [{ name: "Spülmittel", artikel: "Spülmittel", netto: 300, steuersatz: 0.19 }], storniert: false }];
s.betrieb.reinigung = { wer: "selbst", firmaBetrag: null, minutenTag: 45, durch: "team", mittelSchaetzung: null, basis: "netto" };
JETZT = new RealDate(2026, 10, 12, 12, 0).getTime(); const a = E.monatsLast(s, "2026-03-15");
JETZT = new RealDate(2027, 2, 1, 12, 0).getTime(); const b = E.monatsLast(s, "2026-03-15");
console.log(`A. monatsLast(stand, "2026-03-15").reinigung.betrag: berechnet am 12.11.2026 = ${a.reinigung?.betrag}, berechnet am 01.03.2027 = ${b.reinigung?.betrag}  (gleicher Stichtag, anderer Wert; reinigungMonat(stand) ignoriert 'datum', engine.js:84)`);
JETZT = null; globalThis.Date = RealDate;
const t = beispielLaden("2026-11-11"); const vorher = monatsZahlen(t, "2026-10").ergebnis;
t.kosten.find((k) => k.posten === "miete").betrag = 3000; const nachher = monatsZahlen(t, "2026-10").ergebnis;
console.log(`B. monatsZahlen(stand,"2026-10").ergebnis vor Mieterhöhung heute: ${vorher}, nach: ${nachher}  (Differenz ${(nachher - vorher).toFixed(2)}; Oktober ist nicht eingefroren, Kosten haben kein 'gültig ab')`);
// D. Rechenwerk schreibt beim Rechnen: kalkulation() ändert Artikelpreise und Preisverlauf
{ const u = beispielLaden("2026-11-11"); E.kalkulation(u); const mehl = u.artikel.find((a) => a.herkunft !== "selbst" && E.preisJeBasis(a) !== null && u.artikel.some((b) => b.herkunft === "selbst" && (b.rezept?.zutaten || []).some((z) => z.name === a.name)));
  const selbst = u.artikel.find((b) => b.herkunft === "selbst" && (b.rezept?.zutaten || []).some((z) => z.name === mehl?.name)); const vorher = JSON.stringify({ p: selbst?.preis, h: selbst?.preisHistorie?.length || 0 });
  if (mehl) mehl.preis = mehl.preis * 2; E.kalkulation(u); console.log(`D. kalkulation() schreibt in den Stand: selbst gemachtes Teil "${selbst?.name}" vorher ${vorher}, nach Rohstoffpreis x2 und reinem Rechnen ${JSON.stringify({ p: selbst?.preis, h: selbst?.preisHistorie?.length || 0 })} (engine.js zwischenpreiseRechnen/preisMerken)`); }
