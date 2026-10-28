// Preisrunden-Rechner (Masterauftrag „Gehirn“ 1.2, 28.10.2026): Lohnt sich ein neuer Preis, auch wenn ein paar Gäste wegbleiben?
// Rechnung über den Deckungsbeitrag (Nettopreis − Ware je Stück, ohne Fixanteil – feste Kosten ändern sich durch den Preis nicht):
//   DB alt = Preis alt / (1 + USt) − Ware,  DB neu = Preis neu / (1 + USt) − Ware
//   Schwelle = 1 − DB alt / DB neu  → so viele von 100 Gästen dürfen wegbleiben, dann verdienst du gleich viel wie vorher.
// Das ist eine Schwelle, keine Vorhersage: wie viele wirklich wegbleiben, weiß niemand vorher.
// Goldwert (Gremium R3, 28.10.2026): 7,11 € brutto, 7 % USt, Ware 32 % vom Nettopreis, +0,50 € → 9,37 %.
import { kalkulation, mengenJeMonat } from "./engine.js";

export function preisRunde({ preisAlt, preisNeu, mwst = 0.07, ware }) {
  const pa = Number(preisAlt), pn = Number(preisNeu), w = Number(ware) || 0;
  if (!(pa > 0) || !(pn > 0)) return null;
  const dbAlt = pa / (1 + mwst) - w, dbNeu = pn / (1 + mwst) - w;
  if (!(dbNeu > 0)) return { schwelle: null, dbAlt, dbNeu, mehrJeStueck: dbNeu - dbAlt };
  const schwelle = pn > pa ? 1 - dbAlt / dbNeu : null; // bei Preissenkung: wie viele Gäste mehr nötig (siehe mehrGaesteNoetig)
  const mehrGaesteNoetig = pn < pa && dbNeu > 0 ? dbAlt / dbNeu - 1 : null;
  return { schwelle, mehrGaesteNoetig, dbAlt, dbNeu, mehrJeStueck: dbNeu - dbAlt };
}

// Für ein Gericht der Karte: Ware aus der Kalkulation, Menge im Monat (geschätzt, wenn nicht eingetragen).
// mehrJahr = Mehr-Deckungsbeitrag im Jahr bei gleicher Menge (obere Grenze, wenn niemand wegbleibt).
export function preisRundeGericht(stand, gerichtId, preisNeu) {
  const z = kalkulation(stand).zeilen.find((x) => x.id === gerichtId);
  if (!z || z.preisBrutto === null || z.waren === null) return null;
  const r = preisRunde({ preisAlt: z.preisBrutto, preisNeu, mwst: z.mwst, ware: z.waren }); if (!r) return null;
  const { mengen, geschaetzt } = mengenJeMonat(stand); const m = mengen[gerichtId] || 0;
  return { ...r, mengeMonat: m, mengeGeschaetzt: geschaetzt, mehrJahr: r.mehrJeStueck * m * 12, geschaetzt: geschaetzt || !!z.warenGeschaetzt || !!z.warenRichtpreis };
}
