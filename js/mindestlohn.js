// Mindestlohn-Vorschau (Masterauftrag „Gehirn“ 1.1, 28.10.2026): Was kostet die nächste Erhöhung dein Team im Monat,
// und wie viel Umsatz brauchst du dafür mehr? Reine Rechnung, keine Oberfläche.
//
// Rechenweg je Person mit bekanntem Stundenlohn (aus „Mitarbeiter heute“, stand.teamTage, letzte 28 Tage):
//   Stunden im Monat ≈ Stunden der letzten 28 Tage × 30,4 / 28
//   mehr je Stunde = max(0, neuer Mindestlohn − bisheriger Stundenlohn)
//   mehr im Monat  = Stunden im Monat × mehr je Stunde × (1 + Arbeitgeberanteil der Art, js/data/lohnkosten.js)
// Ohne Stundenzettel, aber mit Teamgröße und Stunden je Person (Einrichtung): Annahme „alle bekommen heute Mindestlohn“,
//   mehr im Monat = Personen × Stunden je Person × (neu − alt) × (1 + Arbeitgeberanteil angestellt) → Obergrenze, immer ≈.
// Feste Monatslöhne (lohnModell "monat") ohne Stunden: Stundenlohn unbekannt → nicht gerechnet, als „offen“ gezählt.
// Umsatz dafür: mehr im Monat ÷ (1 − Warenquote) × (1 + Umsatzsteuersatz) – dieselbe Logik wie „bis null“ (Brutto).
import { MINDESTLOHN, mindestlohnAm, naechsteErhoehung } from "./data/mindestlohn.js";
import { kostenJeStunde } from "./data/lohnkosten.js";
import { warenQuote } from "./zaehler.js";
import { umsatzSteuerSatz, tagPlus } from "./engine.js";

export const MONATSTAGE = 30.4; // Durchschnitt 365 / 12 ≈ 30,42 Tage, gerundet
export const VORSCHAU_TAGE_VORHER = 92; // Setzung 28.10.2026: Karte ab ≈ 3 Monate vor der Erhöhung
export const VORSCHAU_TAGE_NACHHER = 31; // Setzung 28.10.2026: und noch einen Monat danach („seit Januar …“)

// Stunden und letzter Stundenlohn je Person aus den Tageseinträgen der letzten 28 Tage (je Datum gilt der jüngste Eintrag)
function personenStunden(stand, datum) {
  const von = tagPlus(datum, -27); const jeTag = new Map();
  for (const e of stand?.teamTage || []) if (e.datum >= von && e.datum <= datum) jeTag.set(e.datum, e);
  const out = new Map();
  for (const e of [...jeTag.values()].sort((a, b) => (a.datum < b.datum ? -1 : 1))) {
    if (e.keine) continue;
    for (const x of e.eintraege || []) {
      if (!(x.satz > 0) || !(x.stunden > 0)) continue;
      const k = x.person || "name:" + (x.name || "?");
      const p = out.get(k) || { person: x.person || null, name: x.name || "", stunden: 0, satz: x.satz, art: x.art === "minijob" ? "minijob" : "angestellt" };
      p.stunden += x.stunden * (x.kompakt ? Math.max(1, Number(x.personen) || 1) : 1); p.satz = x.satz; p.art = x.art === "minijob" ? "minijob" : "angestellt";
      out.set(k, p);
    }
  }
  return [...out.values()];
}

// Ergebnis: null, wenn keine Erhöhung ansteht. Sonst
// { ab, alt, neu, minijobAlt, minijobNeu, grundlage: "stunden"|"team"|"keine", geschaetzt, mehrMonat, umsatzMehrMonat, personen: [...], offen }
export function mindestlohnVorschau(stand, datum) {
  const n = naechsteErhoehung(datum);
  if (!n) return null;
  const a = mindestlohnAm(datum);
  const out = { ab: n.ab, alt: a.satz, neu: n.satz, minijobAlt: a.minijob, minijobNeu: n.minijob, grundlage: "keine", geschaetzt: true, mehrMonat: 0, umsatzMehrMonat: 0, personen: [], offen: 0 };
  const ps = personenStunden(stand, datum);
  if (ps.length) {
    out.grundlage = "stunden";
    for (const p of ps) {
      const stundenMonat = p.stunden * MONATSTAGE / 28;
      const mehrStunde = Math.max(0, n.satz - p.satz);
      const mehr = stundenMonat * (kostenJeStunde(p.satz + mehrStunde, p.art) - kostenJeStunde(p.satz, p.art));
      out.personen.push({ person: p.person, name: p.name, satz: p.satz, art: p.art, stundenMonat, mehrStunde, mehrMonat: mehr });
      out.mehrMonat += mehr;
    }
  } else if (Number(stand?.team?.personen) > 0 && Number(stand?.team?.stundenProPerson) > 0) {
    out.grundlage = "team";
    const std = Number(stand.team.personen) * Number(stand.team.stundenProPerson);
    out.mehrMonat = std * (kostenJeStunde(n.satz) - kostenJeStunde(a.satz));
  }
  out.offen = (stand?.personen || []).filter((p) => !p.entfernt && p.aktiv !== false && p.lohnModell === "monat" && !ps.some((x) => x.person === p.id)).length;
  // ≈ immer: Arbeitgeberanteil „angestellt“ ist selbst ein Richtwert (ohne Berufsgenossenschaft), Stunden sind hochgerechnet
  const q = warenQuote(stand).quote; const st = umsatzSteuerSatz(stand).satz;
  out.umsatzMehrMonat = out.mehrMonat > 0 ? out.mehrMonat / (1 - q) * (1 + st) : 0;
  return out;
}

// Soll die Karte heute erscheinen? Ab VORSCHAU_TAGE_VORHER vor der Erhöhung, bis VORSCHAU_TAGE_NACHHER danach; nur mit Wirkung > 0.
export function mindestlohnKarteZeigen(stand, datum) {
  const alle = mindestlohnAlle(datum);
  for (const ab of alle) {
    const tage = Math.round((Date.parse(ab + "T12:00:00Z") - Date.parse(datum + "T12:00:00Z")) / 864e5);
    if (tage > 0 && tage <= VORSCHAU_TAGE_VORHER) { const v = mindestlohnVorschau(stand, datum); return v && v.mehrMonat > 0 ? v : null; }
    // Pilotfest P5 (30.10.2026): am Stichtag selbst gilt der neue Satz schon → „seit“ (vorher fehlte die Karte genau an diesem Tag)
    if (tage <= 0 && -tage <= VORSCHAU_TAGE_NACHHER) { const v = mindestlohnVorschau(stand, tagPlus(ab, -1)); return v && v.mehrMonat > 0 ? { ...v, seit: true } : null; }
  }
  return null;
}
const mindestlohnAlle = () => MINDESTLOHN.slice(1).map((x) => x.ab);
