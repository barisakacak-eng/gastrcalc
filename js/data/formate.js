// 16 Betriebsarten (Format) – übernommen aus dem Prototyp vom 5.10.2026, Richtwerte dort als Startwerte.
// Richtwerte sind Schätzungen. Sie werden in der App IMMER als Schätzung angezeigt, nie still verrechnet.
// miete = Richtwert Miete+Nebenkosten je Monat, monate = Monate im Jahr geöffnet.

export const FORMATE = [
  { id: "restaurant",  gruppe: "haus",    rw: { miete: 3200, monate: 12, personen: 5,  lohn: 11000 } },
  { id: "bar",         gruppe: "haus",    rw: { miete: 2000, monate: 12, personen: 4,  lohn: 7000 } },
  { id: "cafe",        gruppe: "haus",    rw: { miete: 1900, monate: 12, personen: 4,  lohn: 6500 } },
  { id: "system",      gruppe: "haus",    rw: { miete: 6000, monate: 12, personen: 12, lohn: 22000 } },
  { id: "imbiss",      gruppe: "schnell", rw: { miete: 1600, monate: 12, personen: 3,  lohn: 6200 } },
  { id: "baeckerei",   gruppe: "schnell", rw: { miete: 2600, monate: 12, personen: 6,  lohn: 11000 } },
  { id: "lieferdienst",gruppe: "schnell", rw: { miete: 1500, monate: 12, personen: 6,  lohn: 9800 } },
  { id: "ghost",       gruppe: "schnell", rw: { miete: 1200, monate: 12, personen: 4,  lohn: 7000 } },
  { id: "foodtruck",   gruppe: "draussen",rw: { miete: 900,  monate: 9,  personen: 2,  lohn: 3800 } },
  { id: "eisdiele",    gruppe: "draussen",rw: { miete: 1800, monate: 8,  personen: 4,  lohn: 5500 } },
  { id: "biergarten",  gruppe: "draussen",rw: { miete: 2200, monate: 6,  personen: 6,  lohn: 9000 } },
  { id: "club",        gruppe: "draussen",rw: { miete: 4000, monate: 12, personen: 8,  lohn: 9000 } },
  { id: "catering",    gruppe: "gross",   rw: { miete: 1400, monate: 12, personen: 4,  lohn: 7000 } },
  { id: "kantine",     gruppe: "gross",   rw: { miete: 1500, monate: 11, personen: 6,  lohn: 11000 } },
  { id: "hotel",       gruppe: "gross",   rw: { miete: 2500, monate: 12, personen: 5,  lohn: 9000 } },
  { id: "eigen",       gruppe: "gross",   rw: { miete: 1800, monate: 12, personen: 3,  lohn: 6000 } },
];

export const FORMAT_GRUPPEN = ["haus", "schnell", "draussen", "gross"];

export const findeFormat = (id) => FORMATE.find((f) => f.id === id) || null;
