// Rezept-Baukasten – jedes Gericht von der Karte bekommt sofort ein Rezept mit Mengen (Grammatur). Pilot 14.10.2026, Baris:
// „Es darf nicht sein, dass nach dem Onboarding und dem Hochladen immer noch eine leere App da ist."
//
// Prinzip: Gericht = Grundrezept (aus dem Namen erkannt: Pide, Lahmacun, Döner, Teller, Seele …) + Belag (aus „mit X, Y, Z")
//          + Größe (klein/groß) + Abwandlung (vegetarisch/vegan, Reis oder Pommes).
// Teig und Soßen stehen als eigene Artikel drin (Pizzateig, Pide-Teig, Lahmacun-Teig, Pizzasoße, Punkt 2): ob gekauft oder selbst
// gemacht, entscheidet der Artikel (js/data/zwischen.js). Pizza- und Seele-Teig 280 g je Stück (Sanji, Lauf 2: Teigling 250–300 g für 30 cm).
// Die Mengen sind STARTWERTE: übliche Portionsgrößen in Imbissbetrieben, als Schätzung gekennzeichnet (rezeptQuelle "baukasten").
// Der Wirt passt sie im Rezept an; später ersetzen belegte Branchenwerte (Sanji-Recherche) die Zahlen. Keine Zahl ist „gemessen".

const Z = (name, menge, einheit = "g") => ({ name, menge, einheit });

// Grundrezepte. reihenfolge zählt: das erste passende Muster gewinnt (Spezielles vor Allgemeinem).
// fleisch: Name der Hauptfleisch-Zutat (fällt bei vegetarisch/vegan weg, Belag „mit Dönerfleisch" ersetzt sie nicht doppelt)
// Bereich (für Klasse und Rechenwerk) je Familie
export const BEREICH_JE_FAMILIE = { extra: "doener", portion: "beilagen", "doener-teller": "doener", "doener-box": "doener", "falafel-teller": "doener", teller: "doener",
  "doener-salat": "doener", salat: "salat", lahmacun: "doener", pide: "doener", nudeln: "pizza", seele: "pizza", pizza: "pizza", "falafel-wrap": "doener", falafel: "doener",
  wrap: "doener", "haehnchen-doener": "doener", doener: "doener", boerek: "doener", cevapi: "doener", burger: "burger", currywurst: "currywurst", "asia-nudeln": "asia", "asia-reis": "asia", pommes: "beilagen",
  sosse: "beilagen", fingerfood: "fingerfood", auflauf: "doener", gemuese: "beilagen", iskender: "doener", "pad-thai": "asia", pho: "asia", teigtaschen: "asia",
  gyros: "doener", shawarma: "doener", pljeskavica: "doener", koefte: "doener", schaschlik: "currywurst", wurst: "currywurst" };

export const GRUNDREZEPTE = [
  { id: "extra", muster: /^(extra|zusätzlich|zusaetzlich|aufpreis)\b/i, zeit: 0, zutaten: [], nurBelag: true, belagFaktor: 0.6 },
  { id: "portion", muster: /^(portion|beilage)\b/i, zeit: 1, zutaten: [Z("Menüschale 1-teilig", 1, "stk")], nurBelag: true, belagFaktor: 3 },
  // Punkt 8 (Sanjis Karten Mannheim und DACH): Soße/Dip als Extra, Fingerfood mit Stückzahl, Auflauf, Gemüse, Wurst und Grill, Balkan, Vietnam/Thai, Teigtaschen
  { id: "sosse", muster: /^(?:extra\s+|portion\s+)?(?![^]*\b(?:mit|und|im|in)\b)[\p{L}\s-]{0,24}(so(ß|ss)e|sauce|dip|mayo(nnaise)?|ketchup|aioli)$/iu, zeit: 0, zutaten: [Z("Dressingbecher", 1, "stk")], sosse: true },
  { id: "fingerfood", muster: /nuggets?|onion\s?rings?|zwiebelringe|chicken\s?wings?|\bwings\b|mozzarella.?sticks?|frikandel|chicken\s?strips?|crispy\s?chicken/i, zeit: 4, zutaten: [Z("Fingerfood-Schale", 1, "stk")], stueck: true },
  { id: "auflauf", muster: /auflauf|[üu]berbacken/i, zeit: 8, fleisch: "Dönerspieß Kalb/Pute",
    zutaten: [Z("Dönerspieß Kalb/Pute", 150), Z("Pommes frites", 150), Z("Sahnesauce", 60), Z("Pizzakäse gerieben", 60), Z("Menüschale 1-teilig", 1, "stk")] },
  { id: "gemuese", muster: /gebratene?s?\s+gem[üu]se|gem[üu]sepfanne/i, zeit: 5,
    zutaten: [Z("Paprika", 60), Z("Zucchini", 60), Z("Champignons", 40), Z("Zwiebeln", 30), Z("Sonnenblumenöl", 10, "ml"), Z("Menüschale 1-teilig", 1, "stk")] },
  { id: "iskender", muster: /[İi]skender/iu, zeit: 7, fleisch: "Dönerspieß Kalb/Pute",
    zutaten: [Z("Dönerspieß Kalb/Pute", 200), Z("Pide-Brot", 1, "stk"), Z("Joghurt natur", 80), Z("Pizzatomaten (Dose)", 60), Z("Butter", 15), Z("Menüschale 1-teilig", 1, "stk")] },
  { id: "pad-thai", muster: /pad\s?thai|ph[ởo]\s?x[àa]o|reisbandnudeln|gebratene\s+reisnudeln/iu, zeit: 7,
    zutaten: [Z("Reisnudeln", 130), Z("Eier", 1, "stk"), Z("Sojasprossen", 30), Z("Frühlingszwiebeln", 10), Z("Erdnusssauce", 20), Z("Asia-Box", 1, "stk")] },
  { id: "pho", muster: /\bph[ởo]\b|\bb[úu]n\b|nudelsuppe/iu, zeit: 6,
    zutaten: [Z("Reisnudeln", 120), Z("Rinderbrühe Pulver", 10), Z("Sojasprossen", 30), Z("Frühlingszwiebeln", 10), Z("Suppenbecher 0,4 l", 1, "stk")] },
  { id: "teigtaschen", muster: /sambosa|samosa|dumplings?|gyoza|wan\s?tan|teigtasche|fr[üu]hlingsroll/i, zeit: 3, zutaten: [Z("Süß-Sauer-Sauce", 30), Z("Fingerfood-Schale", 1, "stk")], stueck: true },
  { id: "doener-teller", muster: /(d[öo]ner|keba[bp])\s?-?teller|teller.*(d[öo]ner|keba[bp])/i, zeit: 8, fleisch: "Dönerspieß Kalb/Pute",
    zutaten: [Z("Dönerspieß Kalb/Pute", 220), Z("Eisbergsalat", 50), Z("Tomaten", 40), Z("Zwiebeln", 20), Z("Weißkohl", 30), Z("Knoblauchsauce", 50), Z("Menüschale 3-teilig", 1, "stk")], beilage: true },
  { id: "doener-box", muster: /d[öo]ner.?box|box/i, zeit: 4, fleisch: "Dönerspieß Kalb/Pute",
    zutaten: [Z("Dönerspieß Kalb/Pute", 120), Z("Pommes frites", 150), Z("Knoblauchsauce", 30), Z("Pommesschale", 1, "stk")] },
  { id: "falafel-teller", muster: /falafel.?teller/i, zeit: 7,
    zutaten: [Z("Falafelbällchen", 7, "stk"), Z("Eisbergsalat", 50), Z("Tomaten", 40), Z("Salatgurke", 30), Z("Kräutersauce", 50), Z("Menüschale 3-teilig", 1, "stk")], beilage: true },
  { id: "teller", muster: /teller/i, zeit: 8, fleisch: "Dönerspieß Kalb/Pute",
    zutaten: [Z("Dönerspieß Kalb/Pute", 200), Z("Eisbergsalat", 50), Z("Tomaten", 40), Z("Knoblauchsauce", 50), Z("Menüschale 3-teilig", 1, "stk")], beilage: true },
  { id: "doener-salat", muster: /d[öo]ner.?salat/i, zeit: 5, fleisch: "Dönerspieß Kalb/Pute",
    zutaten: [Z("Dönerspieß Kalb/Pute", 150), Z("Eisbergsalat", 80), Z("Weißkohl", 40), Z("Rotkohl", 40), Z("Tomaten", 40), Z("Zwiebeln", 20), Z("Joghurtdressing", 50), Z("Salatschale", 1, "stk")] },
  { id: "salat", muster: /salat\b|salad/i, zeit: 4,
    zutaten: [Z("Eisbergsalat", 120), Z("Tomaten", 50), Z("Salatgurke", 50), Z("Zwiebeln", 20), Z("Joghurtdressing", 50), Z("Salatschale", 1, "stk")] },
  { id: "lahmacun", muster: /lahmacun|lahmacun/i, zeit: 4, fleisch: "Lammhackfleisch",
    zutaten: [Z("Lahmacun-Teig", 110), Z("Lammhackfleisch", 80), Z("Zwiebeln", 30), Z("Tomaten", 30), Z("Petersilie", 10), Z("Dönergewürz", 3), Z("Alufolie-Bogen", 1, "stk")] },
  { id: "pide", muster: /\bpide\b|etli\s?ekmek/i, zeit: 8,
    zutaten: [Z("Pide-Teig", 250), Z("Sonnenblumenöl", 10, "ml"), Z("Pizzakarton 30 cm", 1, "stk")] },
  { id: "asia-nudeln", muster: /gebratene?\s+nudeln|\bmie\b|\bmi\s?x[àa]o|bami|udon|chow\s?mein/i, zeit: 6, zutaten: [Z("Mie-Nudeln", 150), Z("Möhren", 30), Z("Sojasprossen", 30), Z("Frühlingszwiebeln", 10), Z("Sojasauce", 15, "ml"), Z("Asia-Box", 1, "stk")] },
  { id: "nudeln", muster: /maccaroni|makkaroni|macaroni|penne|spaghetti|nudel|pasta|tortellini|rigatoni/i, zeit: 10,
    zutaten: [Z("Penne", 130), Z("Pizzatomaten (Dose)", 120), Z("Pizzakäse gerieben", 60), Z("Pastabox", 1, "stk")] },
  { id: "seele", muster: /seele|calzone/i, zeit: 9,
    zutaten: [Z("Pizzateig", 280), Z("Pizzasoße", 60), Z("Pizzakäse gerieben", 80), Z("Pizzakarton 30 cm", 1, "stk")] },
  { id: "pizza", muster: /pizza/i, zeit: 8,
    zutaten: [Z("Pizzateig", 280), Z("Pizzasoße", 90), Z("Pizzakäse gerieben", 100), Z("Olivenöl", 5, "ml"), Z("Pizzakarton 30 cm", 1, "stk")] },
  { id: "falafel-wrap", muster: /falafel.*(yufka|d[üu]r[üu]m|wrap)|(yufka|d[üu]r[üu]m|wrap).*falafel/i, zeit: 5,
    zutaten: [Z("Falafelbällchen", 6, "stk"), Z("Dürüm-Wrap", 1, "stk"), Z("Eisbergsalat", 40), Z("Tomaten", 30), Z("Kräutersauce", 40), Z("Alufolie-Bogen", 1, "stk")] },
  { id: "falafel", muster: /falafel/i, zeit: 4,
    zutaten: [Z("Falafelbällchen", 5, "stk"), Z("Dönerbrot / Fladen", 1, "stk"), Z("Eisbergsalat", 40), Z("Tomaten", 30), Z("Kräutersauce", 40), Z("Dönertüte", 1, "stk")] },
  { id: "wrap", muster: /yufka|d[üu]r[üu]m|wrap|gerollt/i, zeit: 5, fleisch: "Dönerspieß Kalb/Pute",
    zutaten: [Z("Dönerspieß Kalb/Pute", 180), Z("Dürüm-Wrap", 1, "stk"), Z("Eisbergsalat", 40), Z("Tomaten", 30), Z("Zwiebeln", 20), Z("Kräutersauce", 40), Z("Alufolie-Bogen", 1, "stk")] },
  { id: "haehnchen-doener", muster: /h[äa]hnchen.?d[öo]ner|chicken.?d[öo]ner/i, zeit: 4, fleisch: "Hähnchenspieß",
    zutaten: [Z("Hähnchenspieß", 180), Z("Dönerbrot / Fladen", 1, "stk"), Z("Eisbergsalat", 50), Z("Tomaten", 40), Z("Zwiebeln", 20), Z("Joghurtsauce", 40), Z("Dönertüte", 1, "stk")] },
  { id: "doener", muster: /d[öo]ner|kebab|kebap/i, zeit: 4, fleisch: "Dönerspieß Kalb/Pute",
    zutaten: [Z("Dönerspieß Kalb/Pute", 180), Z("Dönerbrot / Fladen", 1, "stk"), Z("Eisbergsalat", 50), Z("Tomaten", 40), Z("Zwiebeln", 20), Z("Weißkohl", 40), Z("Knoblauchsauce", 40), Z("Dönertüte", 1, "stk")] },
  { id: "gyros", muster: /gyros/i, zeit: 4, fleisch: "Gyrosfleisch",
    zutaten: [Z("Gyrosfleisch", 180), Z("Dönerbrot / Fladen", 1, "stk"), Z("Zwiebeln", 20), Z("Tomaten", 30), Z("Joghurtsauce", 40), Z("Dönertüte", 1, "stk")] },
  { id: "shawarma", muster: /sc?hawarma/i, zeit: 4, fleisch: "Hähnchenspieß",
    zutaten: [Z("Hähnchenspieß", 180), Z("Dürüm-Wrap", 1, "stk"), Z("Salatgurke", 20), Z("Knoblauchsauce", 40), Z("Alufolie-Bogen", 1, "stk")] },
  { id: "pljeskavica", muster: /pljeskavic|balkan.?burger/i, zeit: 8, zutaten: [Z("Hackfleisch gemischt", 250), Z("Zwiebeln", 40), Z("Ajvar", 40), Z("Dönerbrot / Fladen", 1, "stk"), Z("Menüschale 1-teilig", 1, "stk")] },
  { id: "koefte", muster: /k[öo]fte|kofte|frikadellenteller/i, zeit: 8, zutaten: [Z("Lammhackfleisch", 200), Z("Zwiebeln", 30), Z("Tomaten", 40), Z("Menüschale 3-teilig", 1, "stk")], beilage: true },
  { id: "schaschlik", muster: /schaschlik/i, zeit: 6, zutaten: [Z("Schweinegeschnetzeltes", 150), Z("Zwiebeln", 30), Z("Paprika", 30), Z("Currysauce", 60), Z("Menüschale 3-teilig", 1, "stk")], beilage: true },
  { id: "wurst", muster: /bratwurst|krakauer|rindswurst|bockwurst|grillwurst|wiener|frikadelle|manta.?platte|malocher/i, zeit: 4, zutaten: [Z("Senf", 15), Z("Pommesschale", 1, "stk")], wurst: true },
  { id: "boerek", muster: /b[öo]rek|burek/i, zeit: 3, zutaten: [Z("Yufka-Teigblatt", 1, "stk"), Z("Hirtenkäse / Feta", 60), Z("Eier", 0.3, "stk"), Z("Alufolie-Bogen", 1, "stk")] },
  { id: "cevapi", muster: /[čćc]evap|qebap/i, zeit: 8, stueckGramm: { name: "Hackfleisch gemischt", g: 40 }, zutaten: [Z("Hackfleisch gemischt", 200), Z("Zwiebeln", 40), Z("Ajvar", 40), Z("Menüschale 3-teilig", 1, "stk")], beilage: true },
  { id: "burger", muster: /burger/i, zeit: 6, fleisch: "Rinderpatty 150 g",
    zutaten: [Z("Rinderpatty 150 g", 1, "stk"), Z("Burger-Bun", 1, "stk"), Z("Eisbergsalat", 20), Z("Tomaten", 25), Z("Burgersauce", 25), Z("Burgerbox", 1, "stk")] },
  { id: "currywurst", muster: /currywurst/i, zeit: 4, zutaten: [Z("Currywurst", 1, "stk"), Z("Currysauce", 60), Z("Currypulver", 1), Z("Currywurstschale", 1, "stk")] },
  { id: "asia-reis", muster: /gebratener?\s+reis|nasi|curry|wok|ente|\bca\s?ri\b/i, rubrikMuster: /^reis(gerichte)?\b|reisgerichte/i, zeit: 6, zutaten: [Z("Jasminreis", 100), Z("Paprika", 30), Z("Möhren", 30), Z("Sojasauce", 15, "ml"), Z("Asia-Box", 1, "stk")] },
  { id: "pommes", muster: /pommes|fritten|fries/i, zeit: 3, zutaten: [Z("Pommes frites", 200), Z("Pommesschale", 1, "stk")] },
];

// Belag: Wort im Namen → Zutat und Menge je Portion (für ein Hauptgericht; „extra" und „Portion" skalieren über belagFaktor)
export const BELAEGE = [
  [/putenbrustschinken|putenschinken|schinken/i, Z("Putenbrustschinken", 50)],
  [/truthahnsalami|putensalami|salami/i, Z("Truthahnsalami", 40)],
  [/d[öo]nerfl|d[öo]ner(?!.?(teller|box|salat))|drehspie(ß|ss)|kalbfleisch|keba[bp]fleisch/i, Z("Dönerspieß Kalb/Pute", 80)],
  [/h[äa]hnchen|chicken|h[üu]hner|h[üu]hnchen|gefl[üu]gel/i, Z("Hähnchenbrust", 100)],
  [/rindfleisch|\brind\b|beef(?!burger)/i, Z("Rindergeschnetzeltes", 100)],
  [/tofu/i, Z("Tofu", 100)],
  [/garnele|krabbe|shrimp|scampi/i, Z("Garnelen", 80)],
  [/bacon/i, Z("Bacon", 30)],
  [/cheese|cheddar/i, Z("Cheddar-Scheiben", 1, "stk")],
  [/jalape/i, Z("Jalapeños", 15)],
  [/hackfleisch|hack\b/i, Z("Hackfleisch gemischt", 80)],
  [/sucuk|knoblauchwurst/i, Z("Sucuk", 50)],
  [/thunfisch|tonno/i, Z("Thunfisch (Dose)", 60)],
  [/weichk[äa]se|schafsk[äa]se|hirtenk[äa]se|feta/i, Z("Hirtenkäse / Feta", 50)],
  [/edamer|gouda|mozzarella|(?<!weich|schafs|hirten)k[äa]se/i, Z("Pizzakäse gerieben", 50)],
  [/spinat/i, Z("Babyspinat", 50)],
  [/eiern?\b|\bei\b/i, Z("Eier", 1, "stk")],
  [/champignon|pilz/i, Z("Champignons", 40)],
  [/ananas/i, Z("Ananas (Dose)", 40)],
  [/oliven/i, Z("Oliven", 20)],
  [/mais/i, Z("Mais aus der Dose", 30)],
  [/peperoni|pfefferoni/i, Z("Peperoni eingelegt", 20)],
  [/paprika/i, Z("Paprika", 30)],
  [/zwiebel/i, Z("Zwiebeln", 25)],
  [/tomate/i, Z("Tomaten", 30)],
  [/gurke/i, Z("Salatgurke", 40)],
  [/kichererbse/i, Z("Kichererbsen", 70)],
  [/(?<!gebratene?r?\s)reis/i, Z("Langkornreis", 70)],
  [/pommes/i, Z("Pommes frites", 70)],
  [/salat/i, Z("Eisbergsalat", 40)],
  [/so(ß|ss)e|sauce/i, Z("Knoblauchsauce", 30)],
  [/sahne/i, Z("Sahnesauce", 40)],
  [/tomatenso(ß|ss)e/i, Z("Pizzatomaten (Dose)", 60)],
  [/joghurt/i, Z("Joghurtsauce", 30)],
];

// Beilage bei Tellern/Platten: „mit Reis oder Pommes" → erste Wahl (der Wirt kann tauschen)
const BEILAGEN = [[/reis/i, Z("Langkornreis", 150)], [/pommes|fritten/i, Z("Pommes frites", 180)], [/bulgur/i, Z("Bulgur", 150)], [/brot/i, Z("Dönerbrot / Fladen", 1, "stk")]];
// Größen (Punkt 8.2): Classic/Normal ×1, Big/Groß ×1,25, Mega/XXL ×1,5, Klein/Kinder ×0,75. Pizza nach Durchmesser: (cm/30)².
const GROESSE = [[/(?<!\p{L})(xxl|mega)(?!\p{L})/iu, 1.5], [/(?<!\p{L})(klein|kleine|small|kids?|kinder|mini)(?!\p{L})/iu, 0.75], [/(?<!\p{L})(gro(ß|ss)e?|big|xl|maxi|jumbo|large)(?!\p{L})/iu, 1.25]];
const CM_FAMILIEN = ["pizza", "seele"];
// Soße als Extra: Wort → Artikel (50 g im Dressingbecher)
const SOSSEN = [[/knoblauch|garlic|aioli/i, "Knoblauchsauce"], [/cocktail/i, "Cocktailsauce"], [/bbq|barbecue/i, "BBQ-Sauce"], [/kr[äa]uter|herb/i, "Kräutersauce"],
  [/cheese|k[äa]se/i, "Käsesauce"], [/scharf|chili|hot|samurai/i, "Scharfe Sauce"], [/joghurt|tzatziki|cacik/i, "Joghurtsauce"], [/burger/i, "Burgersauce"], [/curry/i, "Currysauce"],
  [/mayo/i, "Mayonnaise"], [/ketchup/i, "Ketchup"], [/s[üu](ß|ss).?sauer/i, "Süß-Sauer-Sauce"]];
// Fingerfood und Teigtaschen: Wort → Artikel, Gramm je Stück (stk-Artikel: 1) und übliche Stückzahl, wenn der Name keine nennt
const STUECKWARE = [[/nuggets?/i, "Hähnchen-Nuggets", 20, 6], [/onion\s?rings?|zwiebelringe/i, "Onion Rings TK", 15, 8], [/wings?/i, "Chicken Wings", 40, 6],
  [/mozzarella.?sticks?/i, "Mozzarella-Sticks TK", 25, 6], [/frikandel/i, "Frikandel TK", 1, 1], [/strips?|crispy/i, "Hähnchen-Nuggets", 30, 5],
  [/fr[üu]hlingsroll/i, "Frühlingsrolle", 1, 2], [/sambosa|samosa|dumplings?|gyoza|wan\s?tan|teigtasche/i, "Teigtaschen TK", 1, 4]];
const WUERSTE = [[/krakauer/i, "Krakauer"], [/frikadelle/i, "Frikadelle"], [/bockwurst|wiener/i, "Bockwurst"], [/manta|malocher/i, "Currywurst"], [/.*/, "Bratwurst"]];
const stueckzahl = (n) => { const m = String(n).match(/(\d{1,2})\s*(?:stk\.?|st[üu]ck|pcs|tlg|er\b)/i); return m ? Number(m[1]) : null; };

const istFleisch = (n) => /spie(ß|ss)|fleisch|hack|sucuk|schinken|salami|patty|wurst|h[äa]hnchen|lamm|rind|pute|thunfisch/i.test(n);
const istKaese = (n) => /k[äa]se|feta|mozzarella|cheddar/i.test(n);
const runde = (x) => (x >= 20 ? Math.round(x / 5) * 5 : Math.round(x * 10) / 10);

// Gericht → { familie, zutaten, zeit, hinweise[] } oder null (Name passt zu nichts)
// rubrik (Punkt 8.1): Überschrift auf der Karte („Pizza 32 cm", „Gebratener Reis") – bestimmt die Familie, wenn der Name keine hat
// („Salami" unter „Pizza 32 cm" → Pizza Salami, „Hühnerfleisch" unter „Gebratener Reis" → gebratener Reis mit Huhn).
const TRAEGER = ["pizza", "seele", "pide", "lahmacun", "asia-reis", "asia-nudeln", "pad-thai", "pho", "burger", "nudeln", "wrap"];
const familieFuer = (text, familien) => {
  const kopf = text.split(/\s(?:mit|im|in|auf)\s/i)[0];
  return familien.find((r) => r.muster.test(kopf))
    || familien.map((r) => ({ r, i: text.search(r.muster) })).filter((x) => x.i >= 0).sort((a, b) => a.i - b.i)[0]?.r || null;
};
export function rezeptBauen(name, { rubrik = null } = {}) {
  const n = String(name || "").replace(/\s+/g, " ").trim(); if (!n) return null;
  const rub = String(rubrik || "").replace(/\s+/g, " ").trim();
  // Familie aus dem Kopf (Teil vor „mit"/„im"), sonst aus dem ganzen Namen: „Döner mit Salat" ist ein Döner, kein Salat
  const extra = /^(extra|zusätzlich|zusaetzlich|aufpreis|portion|beilage)\b/i.test(n) && !/seele|pizza|pide|teller|box|burger|wrap|yufka|d[üu]r[üu]m|lahmacun|\bsalat\b|so(ß|ss)e|sauce|dip/i.test(n.replace(/^\S+\s*/, ""));
  const familien = GRUNDREZEPTE.filter((r) => extra ? r.nurBelag : !r.nurBelag);
  // im Kopf das erste passende Muster; sonst die Familie, deren Wort am weitesten vorne steht („Kichererbsen im Yufka mit Salat" → Yufka)
  let g = familieFuer(n, familien);
  // Rubrik: Familie, wenn der Name keine hat – oder wenn die Rubrik ein Träger ist (Pizza, Reis, Nudeln) und der Name nur ein Belag („Drehspieß" unter „Pizza")
  const gr = rub && !extra ? (familieFuer(rub, familien) || familien.find((r) => r.rubrikMuster?.test(rub)) || null) : null;
  const ausRubrik = !!gr && (!g || (TRAEGER.includes(gr.id) && !TRAEGER.includes(g.id) && n.split(" ").length <= 3 && !g.sosse));
  if (ausRubrik) g = gr;
  if (!g) return null;
  // Belag: alles außer dem Wort, das die Familie bestimmt hat („Schinken Seele" → Schinken, „Pide mit Spinat" → Spinat)
  const ohneFamilie = ausRubrik ? n : n.replace(g.muster, " ");
  const [mitOhneOder, oderTeil] = ohneFamilie.split(/\boder\b/i);
  const mitTeil = n.match(/\bmit\b(.*)$/i)?.[1] || "";
  const hinweise = ausRubrik ? ["rubrik"] : [];
  let zutaten = g.zutaten.map((z) => ({ ...z }));
  // Soße als Extra, Fingerfood/Teigtaschen mit Stückzahl, Wurst: der Artikel kommt aus dem Namen
  if (g.sosse) zutaten.unshift(Z((SOSSEN.find(([re]) => re.test(n)) || [null, "Knoblauchsauce"])[1], 50));
  if (g.stueck) {
    const [, art, gramm, std] = STUECKWARE.find(([re]) => re.test(n)) || [null, "Teigtaschen TK", 1, 4];
    const k = stueckzahl(n) || std;
    zutaten.unshift(gramm === 1 ? Z(art, k, "stk") : Z(art, k * gramm));
  }
  if (g.wurst) {
    zutaten.unshift(Z(WUERSTE.find(([re]) => re.test(n))[1], /doppel|2\s?x/i.test(n) ? 2 : 1, "stk"));
    if (/platte|teller|pommes|fritten/i.test(n)) zutaten.push(Z("Pommes frites", 180)); else zutaten.push(Z("Brötchen", 1, "stk"));
  }
  if (g.stueckGramm) { const k = stueckzahl(n); if (k) zutaten = zutaten.map((z) => (z.name === g.stueckGramm.name ? { ...z, menge: k * g.stueckGramm.g } : z)); }
  const vegan = /\bvegan/i.test(n), vegetarisch = vegan || /vegetari|veggie/i.test(n);
  const belag = [];
  for (const [re, z] of BELAEGE) {
    if (!re.test(mitOhneOder)) continue;
    if (/tomatenso(ß|ss)e/i.test(mitOhneOder) && z.name === "Knoblauchsauce") continue;
    if (g.beilage && BEILAGEN.some(([b]) => b.test(mitOhneOder) && b.test(z.name.toLowerCase()))) continue;
    if (g.fleisch && z.name === g.fleisch) continue; // „Döner Box": das Fleisch steckt schon im Grundrezept
    belag.push({ ...z, menge: z.einheit === "stk" ? z.menge : z.menge * (g.belagFaktor || 1) });
  }
  // Beilage: aus „mit Reis oder Pommes" die erste; ohne Angabe bei Tellern Pommes
  if (g.beilage) {
    const text = mitTeil || "";
    const treffer = BEILAGEN.map(([re, z]) => ({ z, i: text.search(re) })).filter((x) => x.i >= 0).sort((a, b) => a.i - b.i);
    const b = treffer[0]?.z || Z("Pommes frites", 180);
    zutaten.push({ ...b });
    if (oderTeil || treffer.length > 1) hinweise.push("wahl");
  }
  // vegetarisch/vegan: Fleisch raus (Belag-Fleisch auch), vegan auch Käse und Joghurt/Knoblauch-Saucen → Kräutersauce
  // Ohne Fleischwort, aber mit Ersatz („Kichererbsen im Yufka", „Yufka mit Reis und Salat" auf der veganen Seite) → ohne Fleisch
  const fleischWort = /d[öo]ner|fleisch|h[äa]hnchen|chicken|hack|sucuk|kebap|kebab|schinken|salami|lamm|rind|pute|thunfisch|tonno|wurst/i.test(n);
  const ersatz = /kichererbse|falafel|gem[üu]se|\breis\b|halloumi|tofu/i.test(n);
  if (!fleischWort && ersatz && g.fleisch) { zutaten = zutaten.filter((z) => z.name !== g.fleisch); hinweise.push("ohneFleisch"); }
  if (vegetarisch) {
    zutaten = zutaten.filter((z) => !istFleisch(z.name)); for (let i = belag.length - 1; i >= 0; i--) if (istFleisch(belag[i].name)) belag.splice(i, 1);
    if (!zutaten.some((z) => /falafel|kichererbse/i.test(z.name)) && !belag.some((z) => /falafel|kichererbse|k[äa]se|spinat|ei/i.test(z.name)) && !g.nurBelag) zutaten.push(Z("Paprika", 40));
  }
  if (vegan) {
    zutaten = zutaten.filter((z) => !istKaese(z.name) && z.name !== "Eier"); for (let i = belag.length - 1; i >= 0; i--) if (istKaese(belag[i].name) || belag[i].name === "Eier") belag.splice(i, 1);
    zutaten = zutaten.map((z) => (/knoblauchsauce|joghurt/i.test(z.name) ? { ...z, name: "Kräutersauce" } : z));
  }
  // Belag mit gleichem Artikel wie das Grundrezept: Menge erhöhen statt doppelt aufführen
  for (const b of belag) {
    const da = zutaten.find((z) => z.name === b.name);
    if (da) { if (g.nurBelag || !(g.fleisch && b.name === g.fleisch)) da.menge += b.menge * (g.nurBelag ? 1 : 0.5); } else zutaten.push(b);
  }
  if (g.nurBelag && !belag.length) return null; // „extra …" ohne erkennbare Zutat
  // Burger vegetarisch: Veggie-Patty statt Fleisch
  if (vegetarisch && g.id === "burger" && !zutaten.some((z) => /patty/i.test(z.name))) zutaten.unshift(Z("Veggie-Patty", 1, "stk"));
  // Größe: Pizza nach Durchmesser (Name oder Rubrik, Teig 280 g gilt für etwa 30 cm), sonst nach Größenwort
  const cm = CM_FAMILIEN.includes(g.id) ? Number((n.match(/(\d{2})\s?cm/i) || rub.match(/(\d{2})\s?cm/i) || [])[1]) : 0;
  const faktor = cm >= 20 && cm <= 60 ? (cm / 30) ** 2 : (GROESSE.find(([re]) => re.test(n)) || [null, 1])[1];
  if (faktor !== 1) zutaten = zutaten.map((z) => (z.einheit === "stk" ? z : { ...z, menge: z.menge * faktor }));
  if (cm >= 36) zutaten = zutaten.map((z) => (z.name === "Pizzakarton 30 cm" ? { ...z, name: "Pizzakarton 40 cm" } : z));
  zutaten = zutaten.map((z) => ({ ...z, menge: runde(z.menge) })).filter((z) => z.menge > 0);
  return { familie: g.id, zutaten, zeit: g.zeit, hinweise, quelle: "baukasten" };
}

// Fehlende Rezepte im Laden ergänzen (Gerichte mit leerer Zutatenliste, die der Wirt nicht bewusst leer gelassen hat).
export function fehlendeRezepteErgaenzen(stand) {
  let n = 0;
  for (const g of stand.gerichte || []) {
    // Familie merken, auch bei Vorlagen-Rezepten (Punkt 7: Waage-Check und Branchenwerte wirken je Familie)
    if (!g.rezeptFamilie && g.klasse !== "getraenk") { const f = rezeptBauen(g.name, { rubrik: g.rubrik })?.familie; if (f) g.rezeptFamilie = f; }
    if ((g.zutaten || []).length || g.rezeptBewusstLeer || g.klasse === "getraenk") continue;
    const r = rezeptBauen(g.name, { rubrik: g.rubrik }); if (!r) continue;
    g.zutaten = r.zutaten.map((z) => ({ name: z.name, menge: z.menge, einheit: z.einheit }));
    g.zeit = r.zeit || g.zeit; g.rezeptQuelle = "baukasten"; g.rezeptFamilie = r.familie; n += 1;
  }
  return n;
}

