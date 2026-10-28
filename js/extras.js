// Extras, Größen und Menü-Bündel (Masterauftrag „Gehirn“ 1.6, 28.10.2026). Reine Rechnung, keine Oberfläche.
//
// Extra (z. B. Extra-Fleisch, Käse) am Gericht: gericht.extras = [{ id, name, preis (brutto), zutaten: [{ name, menge, einheit }] }]
//   Ware des Extras = dieselbe Rechnung wie beim Gericht (warenGericht: Garverlust, Stückgewicht, Richtpreis = ≈)
//   Extra bringt dir = Preis / (1 + MwSt des Gerichts) − Ware   (Deckungsbeitrag, ohne Fixanteil: das Extra kostet keine Miete extra)
// Größe (z. B. Dürüm groß) ist ein eigenes Gericht der Karte – dafür braucht es kein neues Feld.
// Menü-Bündel: Rechnung aus deal.js (aktionBreakEven), hier nur der Satz „du verdienst x €, Rabatt, den du gibst: y €“.
//   USt-Aufteilung 7/19: Menüpreis netto = Menüpreis × Σ netto einzeln / Σ brutto einzeln (Verhältnis der Einzelpreise, wie in deal.js).
import { warenGericht } from "./engine.js";
import { aktionBreakEven } from "./deal.js";
import { kalkulation } from "./engine.js";

const idx = (stand) => Object.fromEntries((stand.artikel || []).map((a) => [a.name, a]));

// Rückgabe null, wenn Gericht oder Extra fehlt oder kein Preis; sonst { name, preis, netto, ware, bringt, geschaetzt, vollstaendig, fehlt }
export function extraRechnen(stand, gerichtId, extraId) {
  const g = (stand.gerichte || []).find((x) => x.id === gerichtId); if (!g) return null;
  const e = (g.extras || []).find((x) => x.id === extraId); if (!e || !(Number(e.preis) > 0)) return null;
  const z = kalkulation(stand).zeilen.find((x) => x.id === gerichtId); const mwst = z ? z.mwst : 0.07;
  const w = warenGericht({ zutaten: e.zutaten || [], schank: g.schank }, idx(stand));
  const netto = Number(e.preis) / (1 + mwst);
  return { name: e.name, preis: Number(e.preis), netto, ware: w.vollstaendig ? w.waren : null, bringt: w.vollstaendig ? netto - w.waren : null,
    geschaetzt: w.geschaetzt, vollstaendig: w.vollstaendig, fehlt: w.fehlt };
}

// Alle Extras eines Gerichts
export const extrasVon = (stand, gerichtId) => ((stand.gerichte || []).find((x) => x.id === gerichtId)?.extras || []).map((e) => extraRechnen(stand, gerichtId, e.id)).filter(Boolean);

// Menü-Bündel: { verdienst (Rohertrag des Menüs netto), rabatt (brutto, Summe einzeln − Menüpreis), summeEinzeln, mehrAnteil, lohntNie, geschaetzt } oder null
export function buendelRechnen(stand, ids, preis) {
  const r = aktionBreakEven(stand, ids, preis); if (!r) return null;
  return { verdienst: r.rohertragAktion, rabatt: r.summe - preis, summeEinzeln: r.summe, mehrAnteil: r.mehrAnteil, lohntNie: r.lohntNie, geschaetzt: r.geschaetzt };
}
