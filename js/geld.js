// Geld aus einer Quelle. Regel: An den Schnittstellen (Eingabe, Speichern, Summen, Anzeige) wird in ganzen Cent gerechnet;
// Euro-Kommazahlen sind nur Zwischenwerte. Es gibt genau EINE Rundung (cent) – kaufmännisch, halbe Cent nach oben.
//   Eingabe → Cent:  cent(12.345)  = 1235
//   Cent → Anzeige:  euro(1235)    = 12.35
//   rund2(x) = euro(cent(x)) – ein Euro-Betrag auf den Cent genau.
// Umsatzsteuer: Die Sätze kommen aus dem Regelwerk (mwst). Brutto teilt sich so in Netto und Steuer, dass die Teile zusammen
// immer genau das Ganze ergeben (aufteilen): Netto wird gerundet, die Steuer ist der Rest.
import { wert } from "./data/regelwerk.js";

// Euro (Kommazahl) → ganze Cent. toPrecision(15) entfernt den Rechenrest der Kommazahl (1.005 × 100 = 100.49999999999999 → 100.5 → 101).
export function cent(eur) {
  const n = Number(eur); if (!Number.isFinite(n)) return 0;
  const c = Number((Math.abs(n) * 100).toPrecision(15)); const r = Math.floor(c + 0.5);
  return n < 0 ? -r : r;
}
export const euro = (c) => c / 100;
export const rund2 = (eur) => euro(cent(eur));
// Summe von Euro-Beträgen, auf den Cent genau (jeder Posten wird zuerst zu Cent)
export const summe = (liste) => euro(liste.reduce((s, x) => s + cent(x), 0));

// Umsatzsteuer-Satz am Tag: "voll" (19 %) oder "ermaessigt" (7 %)
export const mwst = (art, tag) => wert(art === "ermaessigt" ? "mwst_ermaessigt" : "mwst_voll", tag);
// Netto aus Brutto als Kommazahl (Zwischenwert, ungerundet – gerundet wird erst an der Schnittstelle)
export const nettoVonBrutto = (betrag, satz) => (Number(betrag) || 0) / (1 + (Number(satz) || 0));
export const bruttoVonNetto = (betrag, satz) => (Number(betrag) || 0) * (1 + (Number(satz) || 0));
// Brutto (Cent) in Netto und Steuer (Cent) teilen: netto + ust = brutto, immer.
export function aufteilen(bruttoCent, satz) { const netto = cent(nettoVonBrutto(bruttoCent, satz) / 100); return { netto, ust: bruttoCent - netto }; }
// Einen Betrag (Cent) nach Gewichten auf Teile verteilen, ohne dass ein Cent verloren geht (größter Rest bekommt den Rest-Cent)
export function verteilen(betragCent, gewichte) {
  const g = gewichte.map((x) => (x > 0 ? x : 0)); const sum = g.reduce((a, b) => a + b, 0); if (!sum) return g.map(() => 0);
  const roh = g.map((x) => betragCent * x / sum); const teile = roh.map((x) => Math.floor(x)); let rest = betragCent - teile.reduce((a, b) => a + b, 0);
  const reihen = roh.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let k = 0; rest > 0; k++, rest--) teile[reihen[k % reihen.length][1]] += 1;
  return teile;
}
