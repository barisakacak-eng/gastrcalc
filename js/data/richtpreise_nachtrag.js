// Richtpreis-Nachtrag (20.10.2026) – VON HAND gepflegt, ergänzt die erzeugte Datei js/data/richtpreise.js (die bleibt unberührt).
// Anlass: Konkurrenz-Lehren / Laden-Test 20.10.2026. Nach dem Erststart eines Dönerladens hatte der Döner keinen Wareneinsatz, weil Grundzutaten
// der selbst gemachten Teile (Dönerbrot, Knoblauchsauce) keinen Richtpreis hatten. Gleiche Methode wie die erzeugten Daten, jede Zahl mit Quelle und Abruf.
// Bei der nächsten Erzeugung aus der Recherche-CSV gehören diese Zeilen in die CSV; dann wird dieser Nachtrag leer.

// Gleiche Ware, anderer Name im Katalog: der Katalogname bekommt den Richtpreis des vorhandenen Eintrags. Nur echte Gleichheit, nie „ähnlich“.
export const RICHTPREIS_ALIAS = {
  "Joghurt natur": "Joghurt",
};

// Neue Einträge im Format der erzeugten Daten.
// Abruf 20.10.2026, von Zoro an der Quelle nachgeprüft. Nicht belegt und deshalb NICHT enthalten: Frischhefe (nur Bio oder unklare Ware gefunden),
// Eisbergsalat und Romanasalat (nur Stückpreise ohne Gewicht oder alte Großmarktberichte 2022/2023), Weizenmehl Typ 405 (nur ein
// österreichischer Händler und ein Preis vom Juni) – dort bleibt „Preis fehlt“, bis der Wirt seinen Preis einträgt.
export const RICHTPREIS_NACHTRAG = [
  // 25-kg-Säcke, gewerbliche Händler: 28,99 / 29,99 / 31,04 € → 1,1596 / 1,1996 / 1,2416 €/kg, Mittel 1,2003 × 0,85
  {"name":"Weizenmehl Typ 550","einheit":"kg","preis":1.0203,"min":1.16,"max":1.24,"methode":"Einzelhandel −15 %","quellen":["https://www.ebay.de/p/2297136522"],"abruf":"2026-10-20"},
  // 25 kg 29,99 / 33,84 / 34,88 / 40,26 €, 1 kg 1,49 € → Mittel 1,4098 €/kg × 0,85
  {"name":"Pizzamehl Typ 00","einheit":"kg","preis":1.1983,"min":1.20,"max":1.61,"methode":"Einzelhandel −15 %","quellen":["https://www.ebay.de/p/1271304463","https://www.ebay.de/p/20024853060","https://www.knuspr.de/en-DE/118152-friessinger-pizza-flour-type-00"],"abruf":"2026-10-20"},
];
