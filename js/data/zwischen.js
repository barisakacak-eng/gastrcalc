// Eigene Herstellung (Etappe 6, Punkt 2 – Baris 12.10. und 14.10.2026, 18:13): „Unsere Ressourcen machen wir selber."
// Ein selbst gemachtes Teil (Teig, Brot, Soße, Patty) ist ein Artikel mit eigenem Rezept, ein Zwischenprodukt.
// Die Gerichte benutzen immer denselben Artikelnamen. Ob er gekauft oder selbst gemacht ist, entscheidet nur der Artikel:
// Wechselt der Laden, bleiben die Gerichte gleich, nur der Preis des Artikels ändert sich.
//
// Alle Mengen sind STARTWERTE (geschätzt, gelb). Der Wirt passt sie an (Punkt 7: „Aus einem Sack Mehl – wie viele Brote?").
// Wasser kostet nichts und steht nicht in der Zutatenliste, es steckt aber in der Ausbeute.
// Belegt (Sanji, Lauf 2): Pizza- und Seele-Teig 280 g je Stück, Patty 150 g. Pide-Teig 250 g ist eine Schätzung.

const Z = (name, menge, einheit = "g") => ({ name, menge, einheit });

// name = Artikelname (steht so im Katalog und in den Gerichten). ausbeute = was eine Ansatz-Menge ergibt.
export const ZWISCHENREZEPTE = [
  { name: "Pizzateig", kachel: "teig", einheit: "g", ausbeute: { menge: 1650, einheit: "g" }, arbeitMin: 20,
    zutaten: [Z("Pizzamehl Typ 00", 1000), Z("Frischhefe", 20), Z("Salz", 20), Z("Olivenöl", 30, "ml")], hinweis: "1 kg Mehl + 600 ml Wasser" },
  { name: "Pide-Teig", kachel: "teig", einheit: "g", ausbeute: { menge: 1650, einheit: "g" }, arbeitMin: 20,
    zutaten: [Z("Weizenmehl Typ 550", 1000), Z("Frischhefe", 20), Z("Salz", 20), Z("Sonnenblumenöl", 30, "ml")], hinweis: "1 kg Mehl + 600 ml Wasser" },
  { name: "Lahmacun-Teig", kachel: "lahmacun", einheit: "g", ausbeute: { menge: 1600, einheit: "g" }, arbeitMin: 20,
    zutaten: [Z("Weizenmehl Typ 550", 1000), Z("Frischhefe", 10), Z("Salz", 20), Z("Sonnenblumenöl", 20, "ml")], hinweis: "1 kg Mehl + 550 ml Wasser" },
  { name: "Dönerbrot / Fladen", kachel: "brot", einheit: "stk", ausbeute: { menge: 7, einheit: "stk" }, arbeitMin: 30,
    zutaten: [Z("Weizenmehl Typ 550", 1000), Z("Frischhefe", 20), Z("Salz", 20), Z("Sonnenblumenöl", 30, "ml")], hinweis: "1 kg Mehl + 600 ml Wasser, etwa 240 g Teig je Brot" },
  { name: "Knoblauchsauce", kachel: "sossen", einheit: "g", ausbeute: { menge: 1050, einheit: "g" }, arbeitMin: 10,
    zutaten: [Z("Joghurt natur", 600), Z("Mayonnaise", 400), Z("Knoblauch", 40), Z("Salz", 10)] },
  { name: "Kräutersauce", kachel: "sossen", einheit: "g", ausbeute: { menge: 1040, einheit: "g" }, arbeitMin: 10,
    zutaten: [Z("Joghurt natur", 700), Z("Mayonnaise", 300), Z("Petersilie", 30), Z("Salz", 10)] },
  { name: "Rinderpatty 150 g", kachel: "patty", einheit: "stk", ausbeute: { menge: 6, einheit: "stk" }, arbeitMin: 10,
    zutaten: [Z("Rinderhack", 900), Z("Salz", 9), Z("Pfeffer schwarz", 3)], hinweis: "6 × 150 g" },
  { name: "Pizzasoße", kachel: "tomatensosse", einheit: "g", ausbeute: { menge: 2585, einheit: "g" }, arbeitMin: 10,
    zutaten: [Z("Pizzatomaten (Dose)", 2500), Z("Olivenöl", 50, "ml"), Z("Oregano getrocknet", 10), Z("Salz", 25)] },
  // Adana selbst aus Lammhack (Baris 20.10.2026: „Selbst aus Lammhack“, Startwerte recherchiert). Mengen je 1 kg Hack = Median aus 7 Rezepten,
  // Abruf 20.10.2026: yemek.com/tarif/adana-kebap, yemek.com/tarif/evde-adana-kebap-2, cumhuriyet.com.tr (MasterChef Adana), rewe.de/rezepte/adana-kebab,
  // turkgun.com (Kurban etinden Adana), themediterraneandish.com/adana-kebabs, giverecipe.com/turkish-adana-kebab. Nur Zutaten aus ≥ 4 von 7 Rezepten.
  // Löffelmaße umgerechnet (TL Salz ≈ 6–8 g, TL Gewürz ≈ 2 g) – deshalb Startwerte (≈). Schwanzfett (Median ≈ 190 g/kg) fehlt im Katalog:
  // wer es zugibt, trägt es als Zutat ein. Spieß ≈ 104 g = Median aus Portionsangaben (4 Rezepte), nirgends direkt angegeben. Arbeit: nicht belegt (0).
  { name: "Adana-Spieß", kachel: "adana", einheit: "stk", ausbeute: { menge: 1421, einheit: "g" }, arbeitMin: 0, stueck: { masse: 1421, gewicht: 104, anzahl: 13 },
    zutaten: [Z("Lammhackfleisch", 1000), Z("Zwiebeln", 200), Z("Paprika", 200), Z("Chiliflocken", 6), Z("Salz", 10), Z("Pfeffer schwarz", 2.7), Z("Kreuzkümmel", 2.4)],
    hinweis: "je 1 kg Lammhack, ≈ 13 Spieße à 104 g" },
];

export const zwischenrezept = (name) => ZWISCHENREZEPTE.find((r) => r.name === name) || null;

// Kacheln der Onboarding-Frage „Was macht ihr selbst?" (Bildname bilder/selbst-<id>.svg, siehe visual-vertrag.md).
// vor = bei diesen Laden-Arten schon angetippt. Nur Kacheln mit Zwischenrezept – weitere kommen mit Sanjis Daten.
export const SELBST_KACHELN = [
  { id: "teig", vor: ["doener", "pizza", "baeckerei"] },
  { id: "brot", vor: ["doener", "baeckerei"] },
  { id: "lahmacun", vor: ["doener"] },
  { id: "sossen", vor: ["doener", "imbiss"] },
  { id: "patty", vor: ["imbiss"] },
  { id: "tomatensosse", vor: ["pizza"] },
  // still = ohne eigene Kachel in der Einrichtungsfrage (noch kein Bild); Vorauswahl wirkt trotzdem, umschaltbar im Büro („Kaufen wir doch fertig“)
  { id: "adana", vor: ["doener"], still: true },
];

// Welche Kacheln eine Laden-Art überhaupt sieht (Reihenfolge = Anzeige). Foodtruck und „Etwas anderes": alle.
export const KACHELN_JE_ART = {
  doener: ["teig", "brot", "lahmacun", "sossen", "patty", "tomatensosse"],
  imbiss: ["patty", "sossen", "brot", "teig"],
  pizza: ["teig", "tomatensosse", "sossen"],
  asia: ["sossen", "teig"],
  baeckerei: ["teig", "brot", "sossen"],
  cafe: ["teig", "brot", "sossen"],
};
export const kachelnFuer = (art) => (KACHELN_JE_ART[art] || SELBST_KACHELN.filter((k) => !k.still).map((k) => k.id)).map((id) => SELBST_KACHELN.find((k) => k.id === id));
export const vorauswahlFuer = (art) => SELBST_KACHELN.filter((k) => k.vor.includes(art)).map((k) => k.id);
