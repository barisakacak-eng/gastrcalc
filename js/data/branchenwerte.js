// Branchenwerte für Portionen (Punkt 7.4). Quelle: Sanji-Lieferungen über die Brücke, von Zoro geprüft (Link je Zeile, Plausibilität, Median je Familie und Zutat).
// Stand 14.10.2026: noch leer. Sanjis Lauf 2 lieferte Produktgewichte (Teigling, Patty, Falafel), aber keine Portionen mit mindestens 2 Gastro-Quellen.
// Diese stecken als Startwerte im Baukasten. Neue Werte: Version hochzählen – die App spielt sie einmal ein, ersetzt nur Schätzungen und meldet es.
export const BRANCHENWERTE = { version: 0, stand: null, werte: [] }; // werte: [{ familie, zutat, menge, min, max, quellen: [url], stufe: "branche" | "pilot" }]
