// Sanji 26.10.2026: öffentliche Menüreferenz, keine gewogenen Betriebsrezepte.
// Die Karte belegt Zutatenbezeichnungen/Stückzahlen, niemals fehlende Grammwerte oder Zeiten.
export const MENUE_QUELLE = {
  datum: "2026-10-26", laden_art: "burger", stufe: "beleg",
  web: "https://smash-it-burgers.de/",
  karte: "https://wolt.com/de/deu/heidelberg/restaurant/smash-it-burger-heidelberg",
  grammmengen: "offen", zeit: "offen", einkaufspreise: "offen"
};
const z = (name, einheit = "g", menge = null) => [name, menge, einheit];
const basis = () => [z("Smash-Patty (Gewicht offen)", "stk"), z("Burger-Bun", "stk", 1), z("Cheddar-Scheiben"), z("Gewürzgurken"), z("Zwiebeln")];
const burger = (name, foto, tr, en, extra) => ({name, foto, tr, en, bereich:"burger", zutaten:[...basis(), ...extra]});
const gericht = (name, foto, tr, en, zutaten, bereich="beilagen") => ({name, foto, tr, en, bereich, zutaten});
export const MENUE_GERICHTE = [
  burger("Classic Smash Burger", "g-classic-smash-burger", "Klasik smash burger", "Classic smash burger", [z("Ketchup"),z("Senf")]),
  burger("Bacon Cheeseburger", "g-bacon-cheeseburger", "Dana bacon cheeseburger", "Beef bacon cheeseburger", [z("Rinderspeck"),z("Ketchup"),z("Senf")]),
  burger("Chili Cheeseburger", "g-chili-cheeseburger", "Acılı cheeseburger", "Chili cheeseburger", [z("Cheddarcreme"),z("Jalapeños"),z("Ketchup"),z("Senf")]),
  burger("Super Smash Burger", "g-super-smash-burger", "Salatalı smash burger", "Super smash burger", [z("Burgersauce"),z("Blattsalat (Sorte offen)"),z("Tomaten")]),
  gericht("Nashville Burger", "g-nashville-burger", "Nashville tavuk burger", "Nashville chicken burger", [z("Burger-Bun","stk",1),z("Chicken Tenders"),z("Krautsalat"),z("Burgersauce")], "burger"),
  burger("Oklahoma Smash Burger", "g-oklahoma-smash-burger", "Oklahoma smash burger", "Oklahoma smash burger", [z("Ketchup"),z("Senf")]),
  gericht("Pommes frites", "g-pommes", "Patates kızartması", "French fries", [z("Pommes frites")]),
  gericht("Süßkartoffel-Pommes", "g-suesskartoffel-pommes", "Tatlı patates kızartması", "Sweet potato fries", [z("Süßkartoffel-Pommes")]),
  gericht("Curly Fries", "g-curly-fries", "Spiral patates", "Curly fries", [z("Curly Fries TK")]),
  gericht("Wedges", "g-wedges", "Elma dilim patates", "Potato wedges", [z("Kartoffel-Wedges TK")]),
  gericht("Halloumi-Sticks (6 Stück)", "g-halloumi-sticks-6-stueck", "Hellim çubukları (6 adet)", "Halloumi sticks (6 pieces)", [z("Halloumi-Sticks","stk",6)]),
  gericht("Chili-Cheese-Nuggets (6 Stück)", "g-chili-cheese-nuggets-6-stueck", "Acılı peynir topları (6 adet)", "Chili cheese nuggets (6 pieces)", [z("Chili-Cheese-Nuggets","stk",6)]),
  gericht("Onion Rings (5 Stück)", "g-onion-rings-5-stueck", "Soğan halkaları (5 adet)", "Onion rings (5 pieces)", [z("Onion Rings TK (Stück)","stk",5)]),
  gericht("Chicken Tenders (5 Stück)", "g-chicken-tenders-5-stueck", "Tavuk şeritleri (5 adet)", "Chicken tenders (5 pieces)", [z("Chicken Tenders (Stück)","stk",5)]),
  gericht("Coleslaw", "g-coleslaw", "Lahana salatası", "Coleslaw", [z("Krautsalat")]),
  // Bei nur im Namen benannten Komponenten ist die vollständige Zusammensetzung noch offen.
  gericht("Knoblauch-Parmesan-Pommes", "g-knoblauch-parmesan-pommes", "Sarımsaklı parmesanlı patates", "Garlic parmesan fries", [z("Knoblauch-Parmesan-Pommes (fertig)")]),
  gericht("Chili-Cheese-Pommes", "g-chili-cheese-pommes", "Acılı peynir soslu patates", "Chili cheese fries", [z("Chili-Cheese-Pommes (fertig)")]),
  gericht("Chicken-Pommes", "g-chicken-pommes", "Tavuklu patates", "Chicken fries", [z("Chicken-Pommes (fertig)")]),
  gericht("Trüffel-Pommes", "g-trueffel-pommes", "Trüflü patates", "Truffle fries", [z("Trüffel-Pommes (fertig)")]),
  gericht("Ketchup-Dip", "g-ketchup-dip", "Ketçap sos", "Ketchup dip", [z("Ketchup")]),
  gericht("Mayonnaise-Dip", "g-mayonnaise-dip", "Mayonez sos", "Mayonnaise dip", [z("Mayonnaise")]),
  gericht("BBQ-Dip", "g-bbq-dip", "Barbekü sos", "BBQ dip", [z("BBQ-Sauce")]),
  gericht("Trüffel-Mayonnaise-Dip", "g-trueffel-mayonnaise-dip", "Trüflü mayonez", "Truffle mayonnaise dip", [z("Trüffel-Mayonnaise")]),
  gericht("Käsesauce-Dip", "g-kaesesauce-dip", "Peynir sosu", "Cheese sauce dip", [z("Käsesauce")]),
  gericht("Joppie-Dip", "g-joppie-dip", "Joppie sos", "Joppie dip", [z("Joppie-Sauce")]),
  gericht("Knoblauch-Mayonnaise-Dip", "g-knoblauch-mayonnaise-dip", "Sarımsaklı mayonez", "Garlic mayonnaise dip", [z("Knoblauch-Mayonnaise")]),
  gericht("Muffin (Sorte offen)", "g-muffin-sorte-offen", "Muffin (çeşit seçilecek)", "Muffin (choose variety)", [z("Muffin (Sorte offen)","stk",1)], "kuchen"),
  gericht("Detox Smoothie 0,4 l", "g-detox-smoothie-0-4-l", "Detoks smoothie 0,4 l", "Detox smoothie 0.4 l", [z("Ananas (Smoothie)"),z("Bananen"),z("Spinat"),z("Mango")], "alkoholfrei"),
  gericht("Sunshine Smoothie 0,4 l", "g-sunshine-smoothie-0-4-l", "Sunshine smoothie 0,4 l", "Sunshine smoothie 0.4 l", [z("Pfirsich"),z("Passionsfrucht"),z("Mango")], "alkoholfrei"),
  gericht("Acai Smoothie 0,4 l", "g-acai-smoothie-0-4-l", "Acai smoothie 0,4 l", "Acai smoothie 0.4 l", [z("Erdbeeren"),z("Blaubeeren"),z("Mango"),z("Acai-Püree")], "alkoholfrei")
];
// Neue Einkaufsartikel bleiben ohne Preise und ohne behauptetes Stückgewicht.
export const MENUE_ARTIKEL = [
  ["Smash-Patty (Gewicht offen)","stk","fleisch"], ["Cheddarcreme","kg","sauce"], ["Blattsalat (Sorte offen)","kg","gemuese"],
  ["Rinderspeck","kg","fleisch"], ["Zwiebeln","kg","gemuese"],
  ["Chicken Tenders","kg","fleisch"], ["Chicken Tenders (Stück)","stk","fleisch"],
  ["Curly Fries TK","kg","teig"], ["Kartoffel-Wedges TK","kg","teig"],
  ["Halloumi-Sticks","stk","kaese"], ["Chili-Cheese-Nuggets","stk","kaese"], ["Onion Rings TK (Stück)","stk","teig"],
  ["Knoblauch-Parmesan-Pommes (fertig)","kg","teig"], ["Chili-Cheese-Pommes (fertig)","kg","teig"],
  ["Chicken-Pommes (fertig)","kg","fleisch"], ["Trüffel-Pommes (fertig)","kg","teig"],
  ["Käsesauce","kg","sauce"], ["Trüffel-Mayonnaise","kg","sauce"], ["Joppie-Sauce","kg","sauce"], ["Knoblauch-Mayonnaise","kg","sauce"],
  ["Krautsalat","kg","gemuese"], ["Süßkartoffel-Pommes","kg","teig"], ["Muffin (Sorte offen)","stk","suess"],
  ["Ananas (Smoothie)","kg","gemuese"], ["Bananen","kg","gemuese"], ["Spinat","kg","gemuese"], ["Mango","kg","gemuese"],
  ["Pfirsich","kg","gemuese"], ["Passionsfrucht","kg","gemuese"], ["Erdbeeren","kg","gemuese"], ["Blaubeeren","kg","gemuese"], ["Acai-Püree","kg","gemuese"]
];
// Exakte, sachlich passende Bilder statt irreführender Familien-Regeln (z. B. Rinderspeck ≠ Dönerspieß).
export const MENUE_WAREN_FOTO = {
  "Smash-Patty (Gewicht offen)":"r-patty", "Cheddarcreme":"g-kaesesauce-dip", "Blattsalat (Sorte offen)":"r-salat",
  "Rinderhack":"r-hack", "Rinderspeck":"r-rinderspeck", "Zwiebeln":"r-zwiebeln",
  "Chicken Tenders":"g-chicken-tenders-5-stueck", "Chicken Tenders (Stück)":"g-chicken-tenders-5-stueck",
  "Curly Fries TK":"r-curly-fries", "Kartoffel-Wedges TK":"r-wedges",
  "Halloumi-Sticks":"g-halloumi-sticks-6-stueck", "Chili-Cheese-Nuggets":"g-chili-cheese-nuggets-6-stueck",
  "Onion Rings TK (Stück)":"r-onion-rings-tk", "Knoblauch-Parmesan-Pommes (fertig)":"g-knoblauch-parmesan-pommes",
  "Chili-Cheese-Pommes (fertig)":"g-chili-cheese-pommes", "Chicken-Pommes (fertig)":"g-chicken-pommes", "Trüffel-Pommes (fertig)":"g-trueffel-pommes",
  "Ketchup":"g-ketchup-dip", "Senf":"r-senf", "Mayonnaise":"g-mayonnaise-dip", "BBQ-Sauce":"g-bbq-dip", "Käsesauce":"g-kaesesauce-dip",
  "Trüffel-Mayonnaise":"g-trueffel-mayonnaise-dip", "Joppie-Sauce":"g-joppie-dip", "Knoblauch-Mayonnaise":"g-knoblauch-mayonnaise-dip",
  "Krautsalat":"r-krautsalat", "Süßkartoffel-Pommes":"r-suesskartoffel-pommes", "Muffin (Sorte offen)":"g-muffin-sorte-offen",
  "Ananas (Smoothie)":"r-ananas", "Bananen":"r-bananen", "Spinat":"r-spinat", "Mango":"r-mango", "Pfirsich":"r-pfirsich",
  "Passionsfrucht":"r-passionsfrucht", "Erdbeeren":"r-erdbeeren", "Blaubeeren":"r-blaubeeren", "Acai-Püree":"r-acai-pueree"
};
