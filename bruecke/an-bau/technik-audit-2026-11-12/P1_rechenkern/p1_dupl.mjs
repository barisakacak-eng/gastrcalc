// Doppelte Logik: dieselbe Kennzahl, verschiedene Antworten. Alles mit dem Beispiel-Laden (js/beispiel.js).
import { beispielLaden } from "../js/beispiel.js";
import * as E from "../js/engine.js";
import * as Z from "../js/zaehler.js";
import { kombiGrenze } from "../js/deal.js";
import { monatsPosten } from "../js/steuertopf.js";
import { oeffnungstageMonat } from "../js/reinigung.js";
import { fmtEuro } from "../js/util.js";
const s = beispielLaden("2026-11-11");
console.log("== A. Wareneinsatz-Quote: vier Quellen, vier Antworten (Beispiel-Laden, Karte vollständig)");
const wq = Z.warenQuote(s); const kg = kombiGrenze(s);
console.log(`   zaehler.warenQuote: ${wq.quote.toFixed(4)} (${wq.quelle})   deal.kombiGrenze: ${kg.quote} (${kg.quelle})   Deckel: warenQuote min(0.89) vs QUOTE_MAX ${Z.QUOTE_MAX} vs monatsZiel min(0.9)`);
console.log("== B. Wareneinsatz aus Belegen: Zähler (ohne Putzmittel) gegen 'Was bleibt dir' (mit Putzmittel)");
{ const t = JSON.parse(JSON.stringify(s)); t.lieferungen = [{ id: "L1", datum: "2026-11-05", erfasst: "2026-11-05T10:00:00Z", lieferant: "X", summeNetto: 1000, summeBrutto: 1070, zeilen: [{ name: "Dönerspieß Kalb/Pute", artikel: "Dönerspieß Kalb/Pute", netto: 800, steuersatz: 0.07 }, { name: "Spülmittel", artikel: "Spülmittel", netto: 200, steuersatz: 0.07 }], storniert: false }];
  const z = Z.zaehler(t, { datum: "2026-11-10" }); const p = monatsPosten(t, "2026-11");
  console.log(`   Beleg 1.000 € netto, davon 200 € Putzmittel -> zaehler.belegSumme = ${z.belegSumme} ; steuertopf.monatsPosten.ware = ${p.ware}  (Differenz ${p.ware - z.belegSumme} €)`); }
console.log("== C. Fixkosten je Öffnungstag hängen vom Kalendermonat ab; Kartenrechnung nimmt 52/12 Wochen");
{ const kk = {}; for (const m of ["2027-02-10", "2026-12-10", "2026-11-10", "2026-10-10"]) { const z = Z.zaehler(s, { datum: m }); kk[m.slice(0, 7)] = [Math.round(z.gewichtMonat * 100) / 100, Math.round(z.tageskosten * 100) / 100]; } console.log("   Monat: [Öffnungstage, Tageskosten €]", JSON.stringify(kk));
  const mj = E.mengenJeMonat(s); const tage = (s.betrieb.tageProWoche) * 52 / 12; console.log(`   mengenJeMonat rechnet mit ${tage} Tagen je Monat; Zähler mit 24 bis 26,6; wochenSoll=${E.wochenSoll(s).toFixed(2)} (gesamt*12/52)`); }
console.log("== D. Öffnungstage: zaehler.tagGewicht vs reinigung.oeffnungstageMonat (30 Kalendertage zurück, ohne Feiertagsregel)");
{ const t = JSON.parse(JSON.stringify(s)); t.betrieb.feiertageZu = true; const a = []; let sum = 0; for (let d = "2026-10-12"; d <= "2026-11-10"; d = E.tagPlus(d, 1)) { sum += Z.tagGewicht(t, d); } console.log(`   Zähler-Gewicht 12.10.-10.11.: ${sum.toFixed(2)}  Reinigung: ${oeffnungstageMonat(t, "2026-11-10").toFixed(2)}  (Feiertagsschalter an: ${Object.keys(t.betrieb).filter((k) => /feier/i.test(k))})`); }
console.log("== E. 'Gewinn je Gericht': preisAmpel (nach allen Kosten, Cent) vs Deckungsbeitrag (nur Ware) – zwei Zahlen mit ähnlichem Namen");
{ const k = E.kalkulation(s); const z = k.zeilen[0]; console.log(`   ${z.name}: ampelGewinn ${z.ampelGewinn?.toFixed(2)} (nach Fix+Zeit) vs DB ${(z.preisNetto - z.waren).toFixed(2)} (hebel/preisrunde/vergleich/deal rechnen preisNetto - waren selbst)`); }
{ const t = JSON.parse(JSON.stringify(s)); t.betrieb.feiertagOffen = false; let sum = 0; for (let d = E.tagPlus("2027-01-10", -29); d <= "2027-01-10"; d = E.tagPlus(d, 1)) sum += Z.tagGewicht(t, d); const t0 = JSON.parse(JSON.stringify(s)); let s0 = 0; for (let d = E.tagPlus("2027-01-10", -29); d <= "2027-01-10"; d = E.tagPlus(d, 1)) s0 += Z.tagGewicht(t0, d);
  console.log(`   D2 mit 'an Feiertagen zu' (Zeitraum 12.12.2026-10.01.2027): Zähler ${sum} Öffnungstage, Reinigung ${oeffnungstageMonat(t, "2027-01-10")}  (ohne Schalter: Zähler ${s0})`); }
