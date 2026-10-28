// Euro-Hebel je Gericht und Renner/Penner (Masterauftrag „Gehirn“ 1.3 und 1.5, 28.10.2026). Reine Rechnung, keine Oberfläche.
// Grundlage: kalkulation() (Ware, Nettopreis, MwSt je Gericht) und mengenJeMonat() (eingetragene Menge je Tag × Öffnungstage, sonst geschätzt).
import { kalkulation, mengenJeMonat } from "./engine.js";

export const HEBEL_MIN_EURO = 1; // Setzung 28.10.2026: Hebel unter 1 € im Monat wird nicht gezeigt
export const HEBEL_LISTE = 3; // Setzung 28.10.2026: im Rechner die drei Gerichte mit dem größten Hebel
export const HEBEL_CENT = 0.30; // Setzung 28.10.2026: Beispiel-Erhöhung brutto, die der Chef sofort versteht
// 1.3: Was bringen +0,30 € brutto bei deiner Menge im Monat? = 0,30 / (1 + MwSt) × Menge im Monat (bei gleicher Menge).
export function hebelJeGericht(stand, { cent = HEBEL_CENT } = {}) {
  const k = kalkulation(stand); const { mengen, geschaetzt } = mengenJeMonat(stand);
  return k.zeilen.filter((z) => z.preisBrutto !== null).map((z) => ({ id: z.id, name: z.name, mengeMonat: mengen[z.id] || 0,
    euroMonat: cent / (1 + z.mwst) * (mengen[z.id] || 0), geschaetzt })).sort((a, b) => b.euroMonat - a.euroMonat);
}

// 1.3 im Laden: Was bringt der neue Preis im Monat bei gleicher Menge? (neu − alt) / (1 + MwSt) × Menge im Monat
export function mehrImMonat(stand, gerichtId, alt, neu) {
  const z = kalkulation(stand).zeilen.find((x) => x.id === gerichtId); const { mengen, geschaetzt } = mengenJeMonat(stand);
  if (!z || !(neu > 0) || !(alt > 0)) return { euro: null, geschaetzt };
  return { euro: (neu - alt) / (1 + z.mwst) * (mengen[gerichtId] || 0), geschaetzt };
}

// 1.5: Menü-Matrix nach Deckungsbeitrag (Nettopreis − Ware, ohne Fixanteil) und Stückzahl.
// Felder: stern (beliebt + viel DB) · pferd (beliebt, wenig DB: Preis oder Portion anpassen) · raetsel (wenig verkauft, viel DB: nach vorn stellen)
//         · hund (wenig verkauft, wenig DB: prüfen). Grenzen = Durchschnitt der Karte (Menge: Mittel; DB: mengengewichtetes Mittel).
// Nur mit eingetragenen Mengen (mengeTag) – geschätzte Gleichverteilung sagt nichts über Beliebtheit → { ohneMengen: true }.
export function rennerPenner(stand) {
  const mit = (stand.gerichte || []).filter((g) => g.mengeTag > 0 && g.klasse !== "getraenk"); // ohne Getränke, wie „Gerichte im Vergleich“ (Burger-Test 28.10.2026)
  if (mit.length < 2) return { ohneMengen: true, gerichte: [] };
  const k = kalkulation(stand); const { mengen } = mengenJeMonat(stand);
  const zeilen = k.zeilen.filter((z) => mit.some((g) => g.id === z.id) && z.preisNetto !== null && z.waren !== null)
    .map((z) => ({ id: z.id, name: z.name, menge: mengen[z.id] || 0, db: z.preisNetto - z.waren, geschaetzt: !!(z.warenGeschaetzt || z.warenRichtpreis) }));
  if (zeilen.length < 2) return { ohneMengen: false, gerichte: [] };
  const summeM = zeilen.reduce((s, x) => s + x.menge, 0);
  const mGrenze = summeM / zeilen.length;
  const dbGrenze = zeilen.reduce((s, x) => s + x.db * x.menge, 0) / summeM;
  for (const x of zeilen) { const viel = x.menge >= mGrenze, gut = x.db >= dbGrenze; x.feld = viel && gut ? "stern" : viel ? "pferd" : gut ? "raetsel" : "hund"; x.dbMonat = x.db * x.menge; }
  return { ohneMengen: false, mGrenze, dbGrenze, gerichte: zeilen };
}
