// Preisdrift in Euro (Masterauftrag „Gehirn“ 1.4, 28.10.2026): Was kostet dich die Preiserhöhung einer Zutat im Monat,
// und welches Gericht ist dadurch unter Rot gerutscht? Reine Rechnung, keine Oberfläche.
//
// Rechenweg je Zutat (nur echte Einkaufspreise, keine Richtpreise):
//   Preis vor DRIFT_TAGE Tagen = der Preis, der an diesem Tag galt (erster Eintrag im Preisverlauf, der danach ersetzt wurde)
//   Prozent = (Preis heute − Preis damals) / Preis damals, je Basiseinheit (g, ml, Stück)
//   Euro im Monat = (Preis heute − Preis damals) je Basis × Verbrauch im Monat laut Rezept × Menge (sollVerbrauch, mengenJeMonat)
//   ≈, sobald die Menge geschätzt ist (keine Bestseller-Mengen eingetragen).
// Gerutscht: Ampel heute rot, mit den Preisen von damals nicht rot → Gericht mit neuem Zielpreis (zielBrutto der Kalkulation).
// Mindestanzahl: ohne Preisänderung mit echtem Beleg schweigt die Funktion (leere Liste).
import { kalkulation, mengenJeMonat, preisJeBasis, istRichtpreis } from "./engine.js";
import { sollVerbrauch } from "./verkauf.js";

export const DRIFT_TAGE = 91; // Setzung 28.10.2026: „seit 3 Monaten“ ≈ 13 Wochen
export const DRIFT_AB = 0.03; // Setzung 28.10.2026: kleinere Änderungen als 3 % zeigt die App nicht (Rundung, Packungswechsel)

const minusTage = (datum, n) => new Date(Date.parse(datum + "T12:00:00Z") - n * 864e5).toISOString().slice(0, 10);

// Preis je Basis, der am Tag `grenze` galt, oder null (keine Änderung seither, oder nur Richtpreise)
function preisDamals(a, grenze) {
  const h = (a.preisHistorie || []).filter((x) => x.herkunft !== "richtpreis" && typeof x.datum === "string" && x.datum >= grenze);
  if (!h.length) return null;
  const x = h[0];
  return preisJeBasis({ ...a, preis: x.preis, packung: { menge: x.menge, einheit: x.einheit }, preisBasis: x.basis || "netto" });
}

// Rückgabe: { zutaten: [{ name, alt, neu, prozent, euroMonat, geschaetzt }], gerutscht: [{ id, name, zielBrutto, preisBrutto }], geschaetzt }
export function preisDrift(stand, { datum, tage = DRIFT_TAGE } = {}) {
  const grenze = minusTage(datum, tage);
  const { mengen, geschaetzt } = mengenJeMonat(stand);
  const verbrauch = sollVerbrauch(stand, mengen).artikel;
  const zutaten = []; const damals = new Map();
  for (const a of stand.artikel || []) {
    if (istRichtpreis(a)) continue;
    const neu = preisJeBasis(a); const alt = preisDamals(a, grenze);
    if (!(neu > 0) || !(alt > 0)) continue;
    const prozent = (neu - alt) / alt;
    if (Math.abs(prozent) < DRIFT_AB) continue;
    damals.set(a.name, alt);
    const v = verbrauch[a.name]?.menge || 0;
    zutaten.push({ name: a.name, alt, neu, prozent, euroMonat: (neu - alt) * v, geschaetzt });
  }
  zutaten.sort((x, y) => y.euroMonat - x.euroMonat);
  const gerutscht = [];
  if (zutaten.some((z) => z.prozent > 0)) {
    // Gegenprobe: dieselbe Karte mit den Preisen von damals (Preis je Basis zurückgesetzt, Packung unverändert)
    const alt = structuredClone(stand);
    for (const a of alt.artikel || []) {
      const p = damals.get(a.name); if (p === undefined) continue;
      const jetzt = preisJeBasis(a); if (!(jetzt > 0)) continue;
      a.preis = a.preis * p / jetzt;
    }
    const kAlt = new Map(kalkulation(alt).zeilen.map((z) => [z.id, z]));
    for (const z of kalkulation(stand).zeilen) {
      const v = kAlt.get(z.id);
      if (z.ampel === "rot" && v && v.ampel !== "rot") gerutscht.push({ id: z.id, name: z.name, zielBrutto: z.zielBrutto, preisBrutto: z.preisBrutto, geschaetzt: !!(z.warenGeschaetzt || z.warenRichtpreis) || geschaetzt });
    }
  }
  return { zutaten, gerutscht, geschaetzt };
}
