import { MENUE_GERICHTE, MENUE_WAREN_FOTO } from "./data/burger_ergaenzung.js";
// Trennung 2 (17.10.2026): Bildzuordnung per Regeln – welches Foto/Piktogramm zu einem Gericht oder einer Ware gehört.
// Gibt nur Namen zurück (foto/<name>.webp, bilder/<name>.svg), kein HTML. Vorher in js/screens/vergleich.js und js/screens/muell.js.
import { fotoSlug } from "./util.js";
import { FOTOS } from "./data/fotos.js";

// Bild je Gericht: eigenes Foto (später), sonst Foto der Familie (foto/g-*.webp), sonst Sanjis Piktogramm (bilder/g-*.svg)
const PIKTO = { doener: "g-doener", "haehnchen-doener": "g-doener", wrap: "g-duerum", "falafel-wrap": "g-duerum", "doener-teller": "g-teller", teller: "g-teller", "falafel-teller": "g-teller",
  "doener-box": "g-box", lahmacun: "g-lahmacun", pide: "g-pide", seele: "g-seele", pizza: "g-pizza", nudeln: "g-nudeln", boerek: "g-boerek", falafel: "g-falafel",
  "doener-salat": "g-salat", salat: "g-salat", pommes: "g-pommes", burger: "g-burger", currywurst: "g-currywurst", wurst: "g-currywurst", "asia-nudeln": "g-asia-nudeln", "pad-thai": "g-asia-nudeln", "asia-reis": "g-asia-nudeln" };
export const FOTO = { "haehnchen-doener": "g-doener", "falafel-wrap": "g-falafel", wrap: "g-duerum", teller: "g-doener-teller", "falafel-teller": "g-falafel-teller", "doener-salat": "g-salat",
  shawarma: "g-duerum", pljeskavica: "g-cevapi", sosse: "g-sosse" };
// Fallback nach Name (erste passende Regel) und nach Katalogbereich, wenn die Familie kein Foto hat (Prüfung 15.10.)
const NAME_FOTO = [[/adana|urfa|spie(ß|ss)/i, "g-adana", "g-koefte"], [/lasagne/i, "g-lasagne", "g-auflauf"], [/sucuk/i, "g-sucuk"], [/suppe|[çc]orba/i, "g-suppe"],
  [/reis|pilav/i, "g-reis"], [/gem[üu]se/i, "g-gemuese"], [/schnitzel/i, "g-fleischgericht"], [/fr[üu]hst[üu]ck/i, "g-fruehstueck"], [/kuchen|torte/i, "g-kuchen"],
  [/kaffee|espresso|cappuccino|latte/i, "g-kaffee"], [/eis\b|eisbecher/i, "g-eis"], [/bier|pils|radler/i, "g-bier"], [/ayran/i, "g-ayran"],
  [/cola|fanta|sprite/i, "d-cola", "g-getraenk"], [/wasser|sprudel/i, "d-wasser", "g-getraenk"], [/limo|orange/i, "d-limo", "g-getraenk"], [/eistee|ice ?tea/i, "d-eistee", "g-getraenk"],
  [/[çc]ay|\btee\b/i, "d-tee", "g-getraenk"], [/energy/i, "d-energy", "g-getraenk"], [/saft|schorle/i, "d-saft", "g-getraenk"], [/gazoz/i, "d-gazoz", "g-getraenk"], [/getr[äa]nk/i, "g-getraenk"], [/pommes|fries/i, "g-pommes"], [/falafel/i, "g-falafel"], [/salat/i, "g-salat"],
  [/pizza/i, "g-pizza"], [/burger/i, "g-burger"], [/b[öo]rek/i, "g-boerek"], [/lahmacun/i, "g-lahmacun"], [/pide/i, "g-pide"], [/d[üu]r[üu]m|wrap/i, "g-duerum"],
  [/d[öo]ner/i, "g-doener"], [/currywurst/i, "g-currywurst"], [/wurst/i, "g-wurst"], [/nudel|pasta|spaghetti|penne/i, "g-nudeln"], [/nugget|wings|fingerfood/i, "g-fingerfood"]];
const BEREICH_FOTO = { doener: "g-doener", pizza: "g-pizza", burger: "g-burger", currywurst: "g-currywurst", asia: "g-asia-reis", salat: "g-salat", fingerfood: "g-fingerfood",
  beilagen: "g-pommes", alkoholfrei: "g-getraenk", suppe: "g-suppe", kuchen: "g-kuchen", kaffee: "g-kaffee", fruehstueck: "g-fruehstueck", eis: "g-eis", bier: "g-bier", fleischgericht: "g-fleischgericht" };
export function fotoName(g) {
  g = { ...g, name: g.vorlageName || g.name }; // Perfektionswoche 24.10.2026: Fotos hängen am deutschen Vorlagennamen, auch wenn der Wirt türkisch oder englisch benennt
  const f = g.rezeptFamilie || "";
  const menue = MENUE_GERICHTE.find((v) => v.name === (g.vorlageName || g.name));
  if (menue && FOTOS.has(menue.foto)) return menue.foto;
  // Ein altes Foto namens "Döner Kebab" zeigt in Wirklichkeit einen Wrap/Dürüm.
  // Türkischer Döner im Brot erhält daher immer das fachlich richtige Brot-Motiv.
  const nameFoto = "g-" + fotoSlug(g.name);
  const pilotGericht = [
    [/d[öo]ner[ -]?teller/i, "g-doener-teller"],
    [/d[öo]ner[ -]?box/i, "g-doener-box"],
    [/dopp(?:el|le).*smash|double.*smash/i, "g-double-smash-burger"],
    [/cheese.?burger/i, "g-cheeseburger"],
    [/smash.?burger/i, "g-burger"],
    [/burger.*men[üu]/i, "g-burger-menue"]
  ].find(([re]) => re.test(g.name || ""));
  const kandidaten = [...(pilotGericht ? [pilotGericht[1]] : []),
    nameFoto === "g-doener-kebab" ? "g-doener" : nameFoto]; // 17.10.2026: Einzelbild je Gericht zuerst (Bildliste), dann Familie, Name, Bereich
  if (g.klasse === "getraenk") for (const [re, ...namen] of NAME_FOTO) if (re.test(g.name || "") && namen.some((n) => /ayran|getraenk|^d-/.test(n))) kandidaten.push(...namen); // Getränk nie mit Gerichtfoto
  if (g.klasse === "getraenk") kandidaten.push("g-getraenk");
  if (f) kandidaten.push(FOTO[f] || "g-" + f);
  for (const [re, ...namen] of NAME_FOTO) if (re.test(g.name || "")) { kandidaten.push(...namen); break; }
  if (g.bereich) kandidaten.push(BEREICH_FOTO[g.bereich]);
  if (g.klasse === "getraenk") kandidaten.push("g-getraenk");
  return kandidaten.find((n) => n && FOTOS.has(n)) || null;
}
// Trennung 2 (17.10.2026): Bildquelle eines Gerichts ohne HTML – { eigen } (Ablage-Verweis, Piktogramm als Platzhalter), { foto } oder { pikto }.
export const piktoName = (g) => PIKTO[g.rezeptFamilie || ""] || "g-teller";
export function gerichtBildQuelle(g) {
  const pikto = piktoName(g);
  if (g.foto) return { eigen: g.foto, pikto };
  const name = fotoName(g);
  return name ? { foto: name } : { pikto };
}

// Bild für Rohware, Verpackung und Getränke (Prüfung 15.10.: Reihenfolge zählt, die erste passende Regel gewinnt)
const VERP = [[/handschuh/i, "v-handschuhe"], [/tragetasche|tasche/i, "v-tragetasche"], [/t[üu]te/i, "v-doenertuete"], [/alu|folie/i, "v-alufolie"], [/men[üu]/i, "v-menueschale"],
  [/karton/i, "v-pizzakarton"], [/pommes/i, "v-pommesschale"], [/dressing|so(ß|ss)e|dip|sauce/i, "v-dressingbecher"], [/salat/i, "v-salatschale"], [/burger/i, "v-burgerbox"],
  [/box|asia|nudel/i, "v-asiabox"], [/becher|cup/i, "v-becher"], [/serviette|papier/i, "v-serviette"]];
const WARE = [[/brot|fladen|wrap|yufka|lavash|bun\b|br[öo]tchen|baguette|toast|tortilla/i, "w-brot"], [/onion|stick|nugget|frikandel|fingerfood|wings/i, "w-fingerfood-tk"],
  [/so(ß|ss)e|sauce|mayo|ketchup|dip|dressing|remoulade|aioli|hummus|ajvar|senf|pesto|tzatziki|cac[iı]k/i, "w-sosse"],
  [/gew[üu]rz|salz|pfeffer|oregano|pulver|kreuzk|kumin|flocken|pul biber|sumach|thymian|zimt/i, "w-gewuerz"], [/joghurt|quark|sahne|schmand|cr[eè]me/i, "w-joghurt"],
  [/falafel/i, "w-falafel"], [/sucuk/i, "w-sucuk"], [/salami/i, "w-salami"], [/schinken/i, "w-schinken"], [/patty|hackfleisch/i, "w-hack"], [/d[öo]ner|gyros|kalb|lamm|rind/i, "w-doenerfleisch"], // Patty/Hack vor „rind“ (Sanji-Befund 26.10.2026: „Rinderpatty 150 g“ zeigte den Spieß)
  [/h[äa]hnchen|chicken|pute|truthahn/i, "w-haehnchen"], [/spie(ß|ss)/i, "w-doenerfleisch"], [/hack|patty|k[öo]fte|cevapi/i, "w-hack"], [/wurst|krakauer|wiener/i, "w-wurst"],
  [/feta|hirten|schafsk|wei(ß|ss)k[äa]se/i, "w-feta"], [/k[äa]se|mozzarella|cheddar|gouda|emmentaler|halloumi/i, "w-kaese"], [/thunfisch/i, "w-thunfisch"],
  [/champignon|pilz/i, "w-champignon"], [/peperoni|jalape|chili/i, "w-peperoni"], [/paprika/i, "w-paprika"], [/knoblauch/i, "w-knoblauch"], [/zwiebel/i, "w-zwiebel"],
  [/gurke/i, "w-gurke"], [/tomate/i, "w-tomate"], [/salat|eisberg|rucola|lollo/i, "w-salat"], [/petersilie|basilikum|minze|dill|kr[äa]uter|koriander/i, "w-petersilie"],
  [/kohl/i, "w-kohl"], [/spinat/i, "w-spinat"], [/mais/i, "w-mais"], [/(ö|oe)l(\s|$)|frittier/i, "w-oel"], [/olive/i, "w-oliven"], [/ananas/i, "w-ananas"], [/zitrone|limette/i, "w-zitrone"], [/salatmix|salatmischung/i, "w-salatmix"],
  [/nudel|penne|spaghetti|fusilli|tagliatelle|lasagne/i, "w-nudeln"], [/reis|basmati|bulgur|couscous/i, "w-reis"], [/mehl|teig|hefe/i, "w-mehl"], [/\bei(er)?\b/i, "w-ei"],
  [/pommes|kroketten|wedges|kartoffel/i, "w-pommes-tk"]];
const GETRAENK = [[/ayran/i, "g-ayran"], [/cola|fanta|sprite|dose/i, "d-cola"], [/wasser|sprudel/i, "d-wasser"], [/limo|orange/i, "d-limo"], [/eistee|ice ?tea/i, "d-eistee"],
  [/[çc]ay|\btee\b/i, "d-tee"], [/energy|red ?bull/i, "d-energy"], [/saft|schorle/i, "d-saft"], [/gazoz/i, "d-gazoz"]];
// Echte Fotos (Sanji Welle 3, r-* und v-*), sobald vorhanden; sonst bleibt das Piktogramm
const R_ALIAS = { "w-doenerfleisch": (n) => /h[äa]hnchen|pute/i.test(n) ? "r-haehnchenspiess" : /geschnitten|kg|gegart/i.test(n) ? "r-doener-geschnitten" : "r-doenerspiess",
  "w-kohl": (n) => /wei(ß|ss)/i.test(n) ? "r-weisskohl" : "r-rotkohl", "w-kaese": (n) => /mozzarella/i.test(n) && !/gerieben/i.test(n) ? "r-mozzarella" : "r-pizzakaese",
  "w-ei": () => "r-eier", "w-sosse": (n) => /knoblauch|joghurt|wei(ß|ss)/i.test(n) ? "r-knoblauchsauce" : /scharf|chili|acı/i.test(n) ? "r-scharfe-sosse" : "r-ketchup-mayo",
  "w-brot": (n) => /yufka|wrap|d[üu]r[üu]m|lavash|tortilla/i.test(n) ? "r-yufka" : /vollkorn.*(bun|br[öo]tchen)/i.test(n) ? "r-vollkorn-bun" : /burger.*(bun|br[öo]tchen)|\bbun\b/i.test(n) ? "r-burger-bun" : /br[öo]tchen/i.test(n) ? "r-buns" : "r-fladenbrot",
  "w-falafel": () => "r-falafel-tk", "w-mehl": (n) => /pide/i.test(n) ? "r-pide-teig" : /pizza/i.test(n) ? "r-pizzateig" : /lahmacun/i.test(n) ? "r-lahmacun-teig" : "r-mehl", "w-hack": (n) => /patty/i.test(n) ? "r-patty" : "r-hack" };
const fotoFuer = (n, name) => { const kand = n.startsWith("v-") ? n : R_ALIAS[n] ? R_ALIAS[n](name) : "r-" + n.slice(2); return FOTOS.has(kand) ? kand : null; };
// Trennung 2 (17.10.2026): Bildquelle einer Ware ohne HTML – { foto } (foto/<name>.webp) oder { pikto } (bilder/<name>.svg).
export function wareBildQuelle(x) {
  const menueFoto = MENUE_WAREN_FOTO[x.name];
  if (menueFoto) return FOTOS.has(menueFoto) ? { foto: menueFoto } : { pikto: "w-ware" };
  // 17.10.2026: Einzelbild je Artikel zuerst (Bildliste: r-/v-/d- + fotoSlug(Name)), dann Sammelbild, dann Piktogramm
  const eigen = (x.gruppe === "verpackung" ? "v-" : x.gruppe === "getraenk" || x.gruppe === "spirituose" ? "d-" : "r-") + fotoSlug(x.name);
  if (FOTOS.has(eigen)) return { foto: eigen };
  // PILOTBURGER: ein sachlich falsches Foto ist schlechter als ein klares Piktogramm.
  // Cheddar sind Scheiben (nicht geriebener Pizzakäse); Burgersoße ist keine Ketchup-/Mayoflasche.
  if (/cheddar/i.test(x.name || "")) return FOTOS.has("r-cheddar") ? { foto: "r-cheddar" } : { pikto: "r-cheddar" };
  if (/burger\s*so(ß|ss)e|burger\s*sauce|burgersauce|burgerdressing/i.test(x.name || "")) return FOTOS.has("r-burgersauce") ? { foto: "r-burgersauce" } : { pikto: "r-sauce" };
  if (/pickles|essig\s*gurken|gewürz\s*gurken/i.test(x.name || "")) return FOTOS.has("r-pickles") ? { foto: "r-pickles" } : { pikto: "r-pickles" };
  if (x.gruppe === "getraenk") return { foto: (GETRAENK.find(([re, n]) => re.test(x.name) && FOTOS.has(n)) || [])[1] || "g-getraenk" };
  const liste = x.gruppe === "verpackung" ? VERP : WARE;
  const n = (liste.find(([re]) => re.test(x.name)) || [])[1] || "w-ware";
  const foto = fotoFuer(n, x.name);
  if (foto) return { foto };
  // Facelift 1.0: Burger-Rohwaren erhalten eigene lokale, lizenzfreie Piktogramme,
  // falls der Betrieb noch kein Produktfoto besitzt (bestehende Food-Fotos haben Vorrang).
  const burgerPikto = [
    [/\bpatty\b|burgerfleisch|burger-patty/i, "r-patty"],
    [/burgerbr[öo]tchen|burger[ -]?bun|hamburgerbr[öo]tchen/i, "r-burgerbroetchen"],
    [/cheddar/i, "r-cheddar"],
    [/burgersauce|burger[ -]?so(ß|ss)e|burgerdressing/i, "r-sauce"]
  ].find(([re]) => re.test(x.name || ""));
  return { pikto: burgerPikto ? burgerPikto[1] : /zitrone|salatmix/.test(n) ? "w-ware" : n };
}
