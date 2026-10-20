// Richtpreise (17.10.2026): Testdaten für Einkaufspreise, damit man die App mit realistischen Zahlen durchspielen kann.
// Rein rechnend, keine Oberfläche. Ein Richtpreis ist nie still: Status „richtpreis“, Marke am Artikel, Eintrag im Preisverlauf
// mit herkunft „richtpreis“ – überall als Schätzung (≈). Ein eigener Preis des Wirts wird nie angefasst und ersetzt den Richtpreis.
import { RICHTPREIS_INDEX as ERZEUGT, STAND } from "./data/richtpreise.js";
import { RICHTPREIS_NACHTRAG, RICHTPREIS_ALIAS } from "./data/richtpreise_nachtrag.js";
// 20.10.2026: erzeugte Daten + Nachtrag (von Hand, mit Quellen) + Aliasse für gleiche Ware unter anderem Katalognamen
const RICHTPREIS_INDEX = { ...ERZEUGT, ...Object.fromEntries(RICHTPREIS_NACHTRAG.map((r) => [r.name, r])) };
for (const [kat, ziel] of Object.entries(RICHTPREIS_ALIAS)) if (!RICHTPREIS_INDEX[kat] && RICHTPREIS_INDEX[ziel]) RICHTPREIS_INDEX[kat] = RICHTPREIS_INDEX[ziel];
export const richtpreisFuer = (name) => RICHTPREIS_INDEX[name] || null;
import { EINHEITEN, inBasis } from "./data/katalog.js";
import { preisJeBasis, istRichtpreis } from "./engine.js";
import { heute } from "./util.js";

export { istRichtpreis };
export const RICHTPREIS_STAND = STAND;
const rund4 = (x) => Math.round(x * 10000) / 10000;

// Hat der Artikel einen eigenen Preis? Errechnete Teile (selbst gemacht) und ein Preis ohne Packungsinhalt zählen als eigen:
// den Preis hat der Wirt getippt, nur die Menge fehlt – lieber nichts überschreiben.
const eigenerPreis = (a) => !istRichtpreis(a) && (a.herkunft === "selbst" || preisJeBasis(a) !== null || (typeof a.preis === "number" && a.preis > 0));

// Setzt für jeden Artikel ohne eigenen Preis den Richtpreis ein. Packung: die vorhandene (gleiche Basis, z. B. 10 kg Karton → Preis × 10),
// sonst 1 × Einheit des Richtpreises (1 kg, 1 l, 1 Stück). Basis netto. Rückgabe { gesetzt, uebersprungenEigen, ohneRichtpreis: [namen], schonRichtpreis }.
export function richtpreiseEinsetzen(stand, { datum = heute() } = {}) {
  const out = { gesetzt: 0, uebersprungenEigen: 0, ohneRichtpreis: [], schonRichtpreis: 0 };
  for (const a of stand.artikel || []) {
    if (istRichtpreis(a)) { out.schonRichtpreis += 1; continue; }
    if (eigenerPreis(a)) { out.uebersprungenEigen += 1; continue; }
    const r = RICHTPREIS_INDEX[a.name];
    const basisArtikel = EINHEITEN[a.packung?.einheit || a.einheit]?.basis, basisRp = r ? EINHEITEN[r.einheit]?.basis : null;
    if (!r || !basisRp || (basisArtikel && basisArtikel !== basisRp)) { out.ohneRichtpreis.push(a.name); continue; } // kg gegen Stück: nicht raten
    const vorher = { packung: a.packung ? { ...a.packung } : null, preis: a.preis ?? null, preisBasis: a.preisBasis || "netto", status: a.status ?? null };
    const packung = a.packung?.menge > 0 && EINHEITEN[a.packung.einheit]?.basis === basisRp ? { menge: a.packung.menge, einheit: a.packung.einheit } : { menge: 1, einheit: r.einheit };
    const preis = rund4(r.preis * inBasis(packung.menge, packung.einheit) / inBasis(1, r.einheit));
    a.packung = packung; a.preis = preis; a.preisBasis = "netto"; a.status = "richtpreis";
    a.richtpreis = { preis, menge: packung.menge, einheit: packung.einheit, stand: STAND, methode: r.methode, gesetzt: datum, vorher };
    a.preisHistorie ??= [];
    a.preisHistorie.push({ datum, preis, menge: packung.menge, einheit: packung.einheit, basis: "netto", herkunft: "richtpreis" });
    if (a.preisHistorie.length > 24) a.preisHistorie.splice(0, a.preisHistorie.length - 24);
    out.gesetzt += 1;
  }
  return out;
}

// Nimmt nur Richtpreise zurück, die der Wirt seitdem nicht geändert hat. Geänderte bleiben (sein Preis), nur die Marke geht.
export function richtpreiseEntfernen(stand) {
  const out = { entfernt: 0, behalten: 0 };
  for (const a of stand.artikel || []) {
    if (!a.richtpreis) continue;
    if (istRichtpreis(a)) {
      const v = a.richtpreis.vorher || {};
      a.preis = null; a.packung = v.packung || { menge: null, einheit: a.einheit }; a.preisBasis = v.preisBasis || "netto"; a.status = "offen";
      a.preisHistorie = (a.preisHistorie || []).filter((h) => h.herkunft !== "richtpreis");
      out.entfernt += 1;
    } else out.behalten += 1;
    delete a.richtpreis;
  }
  return out;
}

export const richtpreiseAktiv = (stand) => (stand.artikel || []).filter(istRichtpreis).length;
// Gibt es Artikel ohne Preis, für die ein Richtpreis bereitliegt?
export const richtpreiseMoeglich = (stand) => (stand.artikel || []).filter((a) => !eigenerPreis(a) && !istRichtpreis(a) && RICHTPREIS_INDEX[a.name]).length;
