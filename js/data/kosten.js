// Kostenfinder: feste Kosten je Monat, in zehn Gruppen.
// Jeder Posten: id, kat (Gruppe), typisch (für welche Formate er vorgeschlagen wird),
// rw (Richtwert je Monat aus dem Format, oder null = kein Richtwert, dann ist "weiß ich nicht" = offen).
// basis: wie der Betrag auf der Rechnung steht (Etappe 5): "brutto" = mit Mehrwertsteuer (Strom, Telefon, Entsorgung),
// "netto" = ohne oder steuerfrei (Miete an Privat, Versicherung, Kredit, Gebühren). Der Wirt sieht den Schalter und kann ihn umlegen.
// satz (Paket 3, 16.10.2026, M1): Vorsteuersatz in Prozent für brutto eingetragene Posten – fehlt er, gilt 19; Wasser 7.
// Grundsatz aus der Prüfung Oktober 2026: Richtwerte sichtbar als Schätzung, nie still.
// Versicherungen und Verträge zunächst als ein Betrag (Wunsch Baris 9.10.2026), Aufteilung später.

export const KATEGORIEN = [
  "miete", "energie", "versicherung", "vertraege", "kredite", "entsorgung", "gebuehren", "beratung", "werbung", "sonstiges",
];

const ALLE = "alle";

export const POSTEN = [
  // Miete und Nebenkosten
  { id: "miete",        kat: "miete",        typisch: ALLE, basis: "netto", rw: (f) => f?.rw.miete ?? null },
  { id: "nebenkosten",  kat: "miete",        typisch: ALLE, basis: "brutto", rw: () => null },
  { id: "standgebuehr", kat: "miete",        typisch: ["foodtruck", "catering"], basis: "brutto", rw: () => null },
  // Energie
  { id: "strom",        kat: "energie",      typisch: ALLE, basis: "brutto", rw: () => null },
  { id: "gas",          kat: "energie",      typisch: ALLE, basis: "brutto", rw: () => null },
  { id: "heizung",      kat: "energie",      typisch: ALLE, basis: "brutto", rw: () => null },
  { id: "wasser",       kat: "energie",      typisch: ALLE, basis: "brutto", satz: 7, rw: () => null }, // Trinkwasser 7 % (Paket 3, M1)
  // Versicherungen – ein Betrag
  { id: "versicherungen", kat: "versicherung", typisch: ALLE, basis: "netto", rw: () => null },
  // Verträge und Abos – ein Betrag, dazu die zwei, die fast jeder einzeln kennt
  { id: "kasse",        kat: "vertraege",    typisch: ALLE, basis: "brutto", rw: () => null },
  { id: "internet",     kat: "vertraege",    typisch: ALLE, basis: "brutto", rw: () => null },
  { id: "vertraege",    kat: "vertraege",    typisch: ALLE, basis: "brutto", rw: () => null },
  // Kredite, Leasing, Rücklage
  { id: "kredit",       kat: "kredite",      typisch: ALLE, basis: "netto", rw: () => null },
  { id: "leasing",      kat: "kredite",      typisch: ALLE, basis: "brutto", rw: () => null },
  { id: "ruecklage",    kat: "kredite",      typisch: ALLE, basis: "netto", rw: () => null },
  // Entsorgung
  { id: "speisereste",  kat: "entsorgung",   typisch: ALLE, basis: "brutto", rw: () => null },
  { id: "altoel",       kat: "entsorgung",   typisch: ["imbiss", "lieferdienst", "ghost", "foodtruck", "restaurant", "system", "eigen", "biergarten", "kantine", "hotel", "catering"], basis: "brutto", rw: () => null },
  { id: "muell",        kat: "entsorgung",   typisch: ALLE, basis: "brutto", rw: () => null },
  // Gebühren
  { id: "gema",         kat: "gebuehren",    typisch: ALLE, basis: "brutto", rw: () => null },
  { id: "rundfunk",     kat: "gebuehren",    typisch: ALLE, basis: "netto", rw: () => null },
  { id: "karte",        kat: "gebuehren",    typisch: ALLE, basis: "netto", rw: () => null },
  { id: "bg",           kat: "gebuehren",    typisch: ALLE, basis: "netto", rw: () => null },
  // Beratung
  { id: "steuerberater",kat: "beratung",     typisch: ALLE, basis: "brutto", rw: () => null },
  // Werbung
  { id: "werbung",      kat: "werbung",      typisch: ALLE, basis: "brutto", rw: () => null },
  // Sonstiges
  { id: "fahrzeug",     kat: "sonstiges",    typisch: ["lieferdienst", "catering", "foodtruck"], basis: "brutto", rw: () => null },
  { id: "kleidung",     kat: "sonstiges",    typisch: ALLE, basis: "brutto", rw: () => null },
  { id: "sonstiges",    kat: "sonstiges",    typisch: ALLE, basis: "brutto", rw: () => null },
];

export const basisStandard = (postenId) => POSTEN.find((p) => p.id === postenId)?.basis || "brutto";
export const satzStandard = (postenId) => POSTEN.find((p) => p.id === postenId)?.satz ?? 19; // Paket 3, M1

export const postenJeKategorie = (kat) => POSTEN.filter((p) => p.kat === kat);

export const istTypisch = (p, formatId) => p.typisch === ALLE || (formatId && p.typisch.includes(formatId));
