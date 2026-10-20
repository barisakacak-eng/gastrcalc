// Richtpreis-Nachtrag (20.10.2026) – VON HAND gepflegt, ergänzt die erzeugte Datei js/data/richtpreise.js (die bleibt unberührt).
// Anlass: Konkurrenz-Lehren / Laden-Test 20.10.2026. Nach dem Erststart eines Dönerladens hatte der Döner keinen Wareneinsatz, weil Grundzutaten
// der selbst gemachten Teile (Dönerbrot, Knoblauchsauce) keinen Richtpreis hatten. Gleiche Methode wie die erzeugten Daten, jede Zahl mit Quelle und Abruf.
// Bei der nächsten Erzeugung aus der Recherche-CSV gehören diese Zeilen in die CSV; dann wird dieser Nachtrag leer.

// Gleiche Ware, anderer Name im Katalog: der Katalogname bekommt den Richtpreis des vorhandenen Eintrags. Nur echte Gleichheit, nie „ähnlich“.
export const RICHTPREIS_ALIAS = {
  "Joghurt natur": "Joghurt",
};

// Neue Einträge im Format der erzeugten Daten.
export const RICHTPREIS_NACHTRAG = [
];
