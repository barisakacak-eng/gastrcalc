// Betriebsmittel: wird verbraucht, aber nicht verkauft (Putzmittel, Müllbeutel, Handschuhe, Folie …).
// EINE Regel für Zähler, Reinigungszeile und Inventur (Review 15.10.: zwei Regeln widersprachen sich).
// Nach dem Namen, weil der Katalog solche Artikel bisher unter Verpackung führt. Ohne Abhängigkeiten, damit jeder sie importieren kann.
const RE = /reinig|sp[üu]lmittel|sp[üu]lmaschin|desinf|schwamm|lappen|m[üu]llbeutel|m[üu]llsack|abfallbeutel|handschuh|frischhalte|backpapier|k[üu]chenrolle|putz|wischtuch|reinigungstuch|seife|entkalk|fettl[öo]ser|scheuer|glasreiniger|grillreiniger|klarsp[üu]l|tabs\b/i;
export const istBetriebsmittel = (name) => RE.test(String(name || ""));
// Netto-Summe einer Lieferung ohne Betriebsmittel-Zeilen (Wareneinsatz) bzw. nur Betriebsmittel
export function lieferungTeile(l) {
  const zeilen = l.zeilen || []; let bm = 0;
  for (const z of zeilen) if (typeof z.netto === "number" && istBetriebsmittel(z.artikel || z.name)) bm += z.netto;
  const gesamt = typeof l.summeNetto === "number" ? l.summeNetto : zeilen.reduce((s, z) => s + (Number(z.netto) || 0), 0);
  return { ware: Math.max(0, gesamt - bm), betriebsmittel: bm };
}
