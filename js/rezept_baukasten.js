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
  wrap: "doener", "haehnchen-doener": "doener", doener: "doener", boerek: "doener", cevapi: "doener", burger: "burger", currywurst: "currywurst", "asia-nudeln": "asia", "asia-reis": "asia", pommes: "beilagen" };

export const GRUNDREZEPTE = [
  { id: "extra", muster: /^(extra|zusätzlich|zusaetzlich|aufpreis)\b/i, zeit: 0, zutaten: [], nurBelag: true, belagFaktor: 0.6 },
  { id: "portion", muster: /^(portion|beilage)\b/i, zeit: 1, zutaten: [Z("Menüschale 1-teilig", 1, "stk")], nurBelag: true, belagFaktor: 3 },
  { id: "doener-teller", muster: /d[öo]ner.?teller|teller.*d[öo]ner/i, zeit: 8, fleisch: "Dönerspieß Kalb/Pute",
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
  { id: "pide", muster: /\bpide\b/i, zeit: 8,
    zutaten: [Z("Pide-Teig", 250), Z("Sonnenblumenöl", 10, "ml"), Z("Pizzakarton 30 cm", 1, "stk")] },
  { id: "nudeln", muster: /maccaroni|makkaroni|penne|spaghetti|nudel|pasta|tortellini|rigatoni/i, zeit: 10,
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
  { id: "boerek", muster: /b[öo]rek|burek/i, zeit: 3, zutaten: [Z("Yufka-Teigblatt", 1, "stk"), Z("Hirtenkäse / Feta", 60), Z("Eier", 0.3, "stk"), Z("Alufolie-Bogen", 1, "stk")] },
  { id: "cevapi", muster: /[čćc]evap/i, zeit: 8, zutaten: [Z("Hackfleisch gemischt", 200), Z("Zwiebeln", 40), Z("Ajvar", 40), Z("Menüschale 3-teilig", 1, "stk")], beilage: true },
  { id: "burger", muster: /burger/i, zeit: 6, fleisch: "Rinderpatty 150 g",
    zutaten: [Z("Rinderpatty 150 g", 1, "stk"), Z("Burger-Bun", 1, "stk"), Z("Eisbergsalat", 20), Z("Tomaten", 25), Z("Burgersauce", 25), Z("Burgerbox", 1, "stk")] },
  { id: "currywurst", muster: /currywurst/i, zeit: 4, zutaten: [Z("Currywurst", 1, "stk"), Z("Currysauce", 60), Z("Currypulver", 1), Z("Currywurstschale", 1, "stk")] },
  { id: "asia-nudeln", muster: /gebratene?\s+nudeln|mie|bami|udon|chow\s?mein/i, zeit: 6, zutaten: [Z("Mie-Nudeln", 150), Z("Möhren", 30), Z("Sojasprossen", 30), Z("Frühlingszwiebeln", 10), Z("Sojasauce", 15, "ml"), Z("Asia-Box", 1, "stk")] },
  { id: "asia-reis", muster: /gebratener?\s+reis|nasi|curry|wok|ente/i, zeit: 6, zutaten: [Z("Jasminreis", 100), Z("Paprika", 30), Z("Möhren", 30), Z("Sojasauce", 15, "ml"), Z("Asia-Box", 1, "stk")] },
  { id: "pommes", muster: /pommes|fritten|fries/i, zeit: 3, zutaten: [Z("Pommes frites", 200), Z("Pommesschale", 1, "stk")] },
];

// Belag: Wort im Namen → Zutat und Menge je Portion (für ein Hauptgericht; „extra" und „Portion" skalieren über belagFaktor)
export const BELAEGE = [
  [/putenbrustschinken|putenschinken|schinken/i, Z("Putenbrustschinken", 50)],
  [/truthahnsalami|putensalami|salami/i, Z("Truthahnsalami", 40)],
  [/d[öo]nerfl|d[öo]ner(?!.?(teller|box|salat))/i, Z("Dönerspieß Kalb/Pute", 80)],
  [/h[äa]hnchen|chicken/i, Z("Hähnchenbrust", 100)],
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
const GROESSE = [[/\b(klein|kleine|small|kids?|kinder)\b/i, 0.75], [/\b(gro(ß|ss)e?|xl|maxi|jumbo|large)\b/i, 1.25]];

const istFleisch = (n) => /spie(ß|ss)|fleisch|hack|sucuk|schinken|salami|patty|wurst|h[äa]hnchen|lamm|rind|pute|thunfisch/i.test(n);
const istKaese = (n) => /k[äa]se|feta|mozzarella|cheddar/i.test(n);
const runde = (x) => (x >= 20 ? Math.round(x / 5) * 5 : Math.round(x * 10) / 10);

// Gericht → { familie, zutaten, zeit, hinweise[] } oder null (Name passt zu nichts)
export function rezeptBauen(name) {
  const n = String(name || "").replace(/\s+/g, " ").trim(); if (!n) return null;
  // Familie aus dem Kopf (Teil vor „mit"/„im"), sonst aus dem ganzen Namen: „Döner mit Salat" ist ein Döner, kein Salat
  const kopf = n.split(/\s(?:mit|im|in|auf)\s/i)[0];
  const extra = /^(extra|zusätzlich|zusaetzlich|aufpreis|portion|beilage)\b/i.test(n) && !/seele|pizza|pide|teller|box|burger|wrap|yufka|d[üu]r[üu]m|lahmacun|\bsalat\b/i.test(n.replace(/^\S+\s*/, ""));
  const familien = GRUNDREZEPTE.filter((r) => extra ? r.nurBelag : !r.nurBelag);
  // im Kopf das erste passende Muster; sonst die Familie, deren Wort am weitesten vorne steht („Kichererbsen im Yufka mit Salat" → Yufka)
  const g = familien.find((r) => r.muster.test(kopf))
    || familien.map((r) => ({ r, i: n.search(r.muster) })).filter((x) => x.i >= 0).sort((a, b) => a.i - b.i)[0]?.r;
  if (!g) return null;
  // Belag: alles außer dem Wort, das die Familie bestimmt hat („Schinken Seele" → Schinken, „Pide mit Spinat" → Spinat)
  const ohneFamilie = n.replace(g.muster, " ");
  const [mitOhneOder, oderTeil] = ohneFamilie.split(/\boder\b/i);
  const mitTeil = n.match(/\bmit\b(.*)$/i)?.[1] || "";
  const hinweise = [];
  let zutaten = g.zutaten.map((z) => ({ ...z }));
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
  // Größe
  const gr = GROESSE.find(([re]) => re.test(n));
  if (gr) zutaten = zutaten.map((z) => (z.einheit === "stk" ? z : { ...z, menge: z.menge * gr[1] }));
  zutaten = zutaten.map((z) => ({ ...z, menge: runde(z.menge) })).filter((z) => z.menge > 0);
  return { familie: g.id, zutaten, zeit: g.zeit, hinweise, quelle: "baukasten" };
}

// Fehlende Rezepte im Laden ergänzen (Gerichte mit leerer Zutatenliste, die der Wirt nicht bewusst leer gelassen hat).
export function fehlendeRezepteErgaenzen(stand) {
  let n = 0;
  for (const g of stand.gerichte || []) {
    if ((g.zutaten || []).length || g.rezeptBewusstLeer || g.klasse === "getraenk") continue;
    const r = rezeptBauen(g.name); if (!r) continue;
    g.zutaten = r.zutaten.map((z) => ({ name: z.name, menge: z.menge, einheit: z.einheit }));
    g.zeit = r.zeit || g.zeit; g.rezeptQuelle = "baukasten"; g.rezeptFamilie = r.familie; n += 1;
  }
  return n;
}

