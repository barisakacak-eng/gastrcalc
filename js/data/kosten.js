// Kostenfinder: feste Kosten je Monat, in zehn Gruppen.
// Jeder Posten: id, kat (Gruppe), typisch (für welche Formate er vorgeschlagen wird),
// rw (Richtwert je Monat aus dem Format, oder null = kein Richtwert, dann ist "weiß ich nicht" = offen).
// Grundsatz aus der Prüfung Oktober 2026: Richtwerte sichtbar als Schätzung, nie still.
// Versicherungen und Verträge zunächst als ein Betrag (Wunsch Baris 9.10.2026), Aufteilung später.

export const KATEGORIEN = [
  "miete", "energie", "versicherung", "vertraege", "kredite", "entsorgung", "gebuehren", "beratung", "werbung", "sonstiges",
];

const ALLE = "alle";

export const POSTEN = [
  // Miete und Nebenkosten
  { id: "miete",        kat: "miete",        typisch: ALLE, rw: (f) => f?.rw.miete ?? null },
  { id: "nebenkosten",  kat: "miete",        typisch: ALLE, rw: () => null },
  { id: "standgebuehr", kat: "miete",        typisch: ["foodtruck", "catering"], rw: () => null },
  // Energie
  { id: "strom",        kat: "energie",      typisch: ALLE, rw: () => null },
  { id: "gas",          kat: "energie",      typisch: ALLE, rw: () => null },
  { id: "heizung",      kat: "energie",      typisch: ALLE, rw: () => null },
  { id: "wasser",       kat: "energie",      typisch: ALLE, rw: () => null },
  // Versicherungen – ein Betrag
  { id: "versicherungen", kat: "versicherung", typisch: ALLE, rw: () => null },
  // Verträge und Abos – ein Betrag, dazu die zwei, die fast jeder einzeln kennt
  { id: "kasse",        kat: "vertraege",    typisch: ALLE, rw: () => null },
  { id: "internet",     kat: "vertraege",    typisch: ALLE, rw: () => null },
  { id: "vertraege",    kat: "vertraege",    typisch: ALLE, rw: () => null },
  // Kredite, Leasing, Rücklage
  { id: "kredit",       kat: "kredite",      typisch: ALLE, rw: () => null },
  { id: "leasing",      kat: "kredite",      typisch: ALLE, rw: () => null },
  { id: "ruecklage",    kat: "kredite",      typisch: ALLE, rw: () => null },
  // Entsorgung
  { id: "speisereste",  kat: "entsorgung",   typisch: ALLE, rw: () => null },
  { id: "altoel",       kat: "entsorgung",   typisch: ["imbiss", "lieferdienst", "ghost", "foodtruck", "restaurant", "system", "eigen", "biergarten", "kantine", "hotel", "catering"], rw: () => null },
  { id: "muell",        kat: "entsorgung",   typisch: ALLE, rw: () => null },
  // Gebühren
  { id: "gema",         kat: "gebuehren",    typisch: ALLE, rw: () => null },
  { id: "rundfunk",     kat: "gebuehren",    typisch: ALLE, rw: () => null },
  { id: "karte",        kat: "gebuehren",    typisch: ALLE, rw: () => null },
  { id: "bg",           kat: "gebuehren",    typisch: ALLE, rw: () => null },
  // Beratung
  { id: "steuerberater",kat: "beratung",     typisch: ALLE, rw: () => null },
  // Werbung
  { id: "werbung",      kat: "werbung",      typisch: ALLE, rw: () => null },
  // Sonstiges
  { id: "fahrzeug",     kat: "sonstiges",    typisch: ["lieferdienst", "catering", "foodtruck"], rw: () => null },
  { id: "kleidung",     kat: "sonstiges",    typisch: ALLE, rw: () => null },
  { id: "sonstiges",    kat: "sonstiges",    typisch: ALLE, rw: () => null },
];

export const postenJeKategorie = (kat) => POSTEN.filter((p) => p.kat === kat);

export const istTypisch = (p, formatId) => p.typisch === ALLE || (formatId && p.typisch.includes(formatId));
