// Datenregister und Laden-Profile (Etappe 6, Punkt 9 – Baris 14.10.2026, 17:54).
// Ein Dönerladen sieht Döner-Relevantes zuerst, ein Burgerladen Burger. Nichts wird versteckt: „Weitere“ bleibt über Suche und Aufklappen erreichbar.
// Jedes Datenpaket der App steht hier mit Herkunft, Stufe und Laden-Arten. Ein Test schlägt fehl, wenn etwas ohne Zuordnung dazukommt.

// Laden-Profile: Kern = immer sichtbar, Oft = eigene Überschrift darunter, alles andere = „Weitere“.
// Grundzutaten, Verpackung und alkoholfreie Getränke braucht jeder Laden (GRUNDBEDARF).
export const GRUNDBEDARF = ["grundzutaten", "verpackung", "alkoholfrei"];

export const PROFILE = {
  doener: { kern: ["doener", "beilagen", "salat"], oft: ["pizza", "burger"] },
  imbiss: { kern: ["burger", "beilagen", "currywurst"], oft: ["salat", "fingerfood"] },
  pizza: { kern: ["pizza", "salat"], oft: ["doener", "beilagen", "fleischgericht"] },
  asia: { kern: ["asia", "suppe"], oft: ["salat", "beilagen"] },
  foodtruck: { kern: ["burger", "beilagen"], oft: ["currywurst", "doener", "asia"] },
  cafe: { kern: ["kaffee", "kuchen", "fruehstueck"], oft: ["salat", "suppe", "fingerfood"] },
  baeckerei: { kern: ["fruehstueck", "kuchen", "kaffee"], oft: ["fingerfood", "salat"] },
  anders: { kern: [], oft: [] }, // die Karte bestimmt das Profil
};

// Bereiche, die bewusst in keinem Nischen-Profil stehen (nur „Etwas anderes“ oder genaue Einrichtung mit anderem Format).
export const NUR_ANDERE = ["bar", "bier", "eis"];

// Alte Einrichtung (Format + Küche) → Laden-Art, damit auch „genau“ eingerichtete Läden ein Profil bekommen.
export const ART_JE_KUECHE = { doener: "doener", burger: "imbiss", pizza: "pizza", asiatisch: "asia", fruehstueck: "baeckerei", bistro: "cafe" };
export const ART_JE_FORMAT = { foodtruck: "foodtruck", cafe: "cafe", baeckerei: "baeckerei" };

// Ab diesem Anteil der Gerichte rückt ein Bereich aus der Karte in „Oft dabei“ (bei „Etwas anderes“ in den Kern).
export const KARTE_SCHWELLE = 0.1;

// Für welche Laden-Arten ein Bereich gilt (aus den Profilen abgeleitet).
export function ladenArtenFuer(bereich) {
  if (GRUNDBEDARF.includes(bereich)) return ["alle"];
  const arten = Object.entries(PROFILE).filter(([, p]) => p.kern.includes(bereich) || p.oft.includes(bereich)).map(([a]) => a);
  return arten.length ? arten : NUR_ANDERE.includes(bereich) ? ["anders"] : [];
}

// Datenpakete. stufe: beleg (nachgewiesen) | branche (Branchenwert) | pilot (im Pilotladen gewogen) | schaetzung (Startwert)
// sichtbarkeit: oeffentlich (im Repo und in der App) | privat (nur lokal bei Baris/Zoro, nie im Repo, nie in der App)
export const PAKETE = [
  { id: "katalog", titel: "Produktkatalog (Zutaten, Getränke, Verpackung)", art: "katalog", laden_arten: ["alle"], quelle: "Zoro-Zusammenstellung", stand: "2026-10-14", pruefung: null, stufe: "schaetzung", sichtbarkeit: "oeffentlich", datei: "js/data/katalog.js" },
  { id: "vorlagen", titel: "Gericht-Vorlagen mit Startmengen", art: "vorlagen", laden_arten: ["alle"], quelle: "Zoro-Schätzung", stand: "2026-10-14", pruefung: null, stufe: "schaetzung", sichtbarkeit: "oeffentlich", datei: "js/data/katalog.js" },
  { id: "baukasten", titel: "Rezept-Baukasten (Grundrezepte, Beläge, Größen)", art: "baukasten", laden_arten: ["doener", "imbiss", "pizza", "asia", "foodtruck"], quelle: "Zoro-Schätzung, Produktgewichte aus Sanji-Lauf 2", stand: "2026-10-14", pruefung: "Zoro 14.10.", stufe: "schaetzung", sichtbarkeit: "oeffentlich", datei: "js/rezept_baukasten.js" },
  { id: "zwischenrezepte", titel: "Selbst gemachte Teile: Teig, Brot, Soßen, Patty, Pizzasoße (Start-Rezepte mit Ausbeute)", art: "baukasten", laden_arten: ["doener", "imbiss", "pizza", "asia", "baeckerei", "cafe", "foodtruck"], quelle: "Zoro-Schätzung; Teigling 280 g und Patty 150 g aus Sanji-Lauf 2", stand: "2026-10-14", pruefung: null, stufe: "schaetzung", sichtbarkeit: "oeffentlich", datei: "js/data/zwischen.js" },
  { id: "branchenwerte", titel: "Portionen mit Beleg (Branchenwerte)", art: "branchenwerte", laden_arten: ["doener", "imbiss", "pizza", "asia"], quelle: "Sanji-Auftrag 2026-10-15_portionen_gastro", stand: null, pruefung: null, stufe: "branche", sichtbarkeit: "oeffentlich", datei: "js/data/branchenwerte.js" },
  { id: "kosten", titel: "Kostenposten je Format", art: "katalog", laden_arten: ["alle"], quelle: "Zoro-Zusammenstellung", stand: "2026-10-13", pruefung: null, stufe: "schaetzung", sichtbarkeit: "oeffentlich", datei: "js/data/kosten.js" },
  { id: "marktzahlen", titel: "Marktzahlen DACH (DEHOGA, WKO, GastroSuisse)", art: "marktzahlen", laden_arten: ["alle"], quelle: "Sanji-Auftrag 14.10.", stand: "2026-10-14", pruefung: "Zoro 14.10. (DE 2019–2023 geprüft)", stufe: "beleg", sichtbarkeit: "oeffentlich", datei: "bruecke/an-zoro/" },
  { id: "produktgewichte", titel: "Produktgewichte Hersteller (Pommes, Falafel, Patty, Teigling, Lahmacun)", art: "branchenwerte", laden_arten: ["doener", "imbiss", "pizza", "foodtruck"], quelle: "Sanji-Auftrag 14.10., Lauf 2", stand: "2026-10-14", pruefung: "Zoro 14.10.", stufe: "branche", sichtbarkeit: "oeffentlich", datei: "bruecke/an-zoro/" },
  { id: "haushaltsrezepte", titel: "Haushaltsrezepte (nur Plausibilitätsgrenzen)", art: "branchenwerte", laden_arten: ["alle"], quelle: "Sanji-Auftrag 14.10.", stand: "2026-10-14", pruefung: "Zoro 14.10.", stufe: "schaetzung", sichtbarkeit: "oeffentlich", datei: "bruecke/an-zoro/" },
  { id: "karten-stichprobe", titel: "Öffentliche Speisekarten (Stichprobe Mannheim und DACH)", art: "testdaten", laden_arten: ["doener", "imbiss", "pizza", "asia"], quelle: "Sanji-Auftrag 14.10.", stand: "2026-10-14", pruefung: "Zoro 14.10.", stufe: "beleg", sichtbarkeit: "privat", datei: null },
  { id: "pilot-karte", titel: "Speisekarte des Pilotladens (Fotos und Soll-Liste)", art: "testdaten", laden_arten: ["doener"], quelle: "Pilot", stand: "2026-10-14", pruefung: "Zoro 14.10.", stufe: "pilot", sichtbarkeit: "privat", datei: null },
  { id: "pilot-waage", titel: "Gewogene Portionen im Pilotladen", art: "pilotwerte", laden_arten: ["doener"], quelle: "Pilot", stand: null, pruefung: null, stufe: "pilot", sichtbarkeit: "privat", datei: null },
];

export const STUFEN = ["beleg", "branche", "pilot", "schaetzung"];

// Sanji-Lieferungen schreiben „burger“ (bruecke/LIESMICH.md); in der App heißt die Laden-Art „imbiss“ (Imbiss, Burger, Pommes).
export const LADEN_ART_ALIAS = { burger: "imbiss" };
export const ladenArtAusLieferung = (x) => LADEN_ART_ALIAS[x] || x;
