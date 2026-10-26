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
  // Pfeffer schwarz (20.10.2026, Projektstand „Pfeffer-Richtpreis fehlt“ – Adana zeigte „Preis fehlt“): 1 kg ganze Körner, eBay-Angebote
  // 17,80 / 18,99 / 17,98 € und 12,99 + 4,99 Versand = 17,98 € → Mittel 18,1875 €/kg × 0,85. Gemahlen kostet im Handel ähnlich je kg.
  // Die Angebote stehen als „ähnliche Artikel“ auf der unten verlinkten Seite (deren Hauptartikel ist grüner Pfeffer, ausverkauft).
  {"name":"Pfeffer schwarz","einheit":"kg","preis":15.4594,"min":17.80,"max":18.99,"methode":"Einzelhandel −15 %","quellen":["https://www.ebay.de/p/1250642348"],"abruf":"2026-10-20"},
  // ---- Nachtrag 24.10.2026 (Burger-Küche + Frischhefe), Abruf 2026-10-24, jede Seite von Zoros Preis-Agent geöffnet. ----
  // Rechenweg wie bisher: „Großhandel“ = Mittel der Netto-Preise gewerblicher Lieferanten (food-service-frater.de und edna.de weisen „zzgl. MwSt.“ aus);
  // „Einzelhandel −15 %“ = Mittel der gefundenen Endkundenpreise × 0,85 – ohne Herausrechnen der MwSt., genau wie in richtpreise.js (Sucuk 31,77 × 0,85 = 27,00).
  // Nicht belegt und deshalb NICHT enthalten: Eisbergsalat (nur Stückpreise ohne Gewicht: Frater 1,49 €/Stk, Knuspr 1,19 €/Stk; BLE-Berichte nur je 100 Stück
  // und von 2022), Pide-Teig (nicht als Ware kaufbar, nur fertiges Pide-Brot – das hat schon einen Richtpreis), Vollkorn-Bun (kein Vollkorn-Burgerbrötchen
  // im Handel gefunden, nur Mehrkorn/Roggen bei Edna – keine echte Gleichheit).

  // Rinderpatty 150 g: Großhandel Frater, TK-Hamburger vom Rind je Karton: Salomon 40 × 125 g 59,99 € (12,00 €/kg), Salomon 25 × 180 g 59,99 € (13,33 €/kg),
  // Clare Valley 5 × 200 g 17,99 € (17,99 €/kg) → auf 150 g umgerechnet 1,7997 / 1,9997 / 2,6985 €, Mittel 2,1660. Kein 150-g-Patty im Angebot, deshalb über €/kg × 0,15.
  {"name":"Rinderpatty 150 g","einheit":"stk","preis":2.166,"min":1.7997,"max":2.6985,"methode":"Großhandel","quellen":["https://www.food-service-frater.de/shop/Salomon-Ranch-Master-Hamburger-tiefgefroren-40-x-125-g-p343532280","https://www.food-service-frater.de/shop/Salomon-Ranch-Master-Hamburger-tiefgefroren-25-x-180-g-p343532288","https://www.food-service-frater.de/shop/Clare-Valley-Gold-Australische-Rindfleisch-Burger-tiefgefroren-1-kg-p345089164"],"abruf":"2026-10-24"},
  // Rinderhack: Großhandel Frater, Hackfleisch TK vom Rind (100 % Rind, < 20 % Fett) 1 kg 11,99 € netto. Zum Vergleich Knuspr „Hackfleischzubereitung aus Rindfleisch“ 500 g 5,89 € = 11,78 €/kg brutto.
  {"name":"Rinderhack","einheit":"kg","preis":11.99,"min":11.99,"max":11.99,"methode":"Großhandel","quellen":["https://www.food-service-frater.de/shop/Hackfleisch-tiefgefroren-vom-Rind-1-kg-p345082135"],"abruf":"2026-10-24"},
  // Hähnchenpatty: Großhandel Frater, Crunchy Chik'n Burger TK (paniert, vorgegart, halal) 1,5-kg-Beutel 16,99 € netto = 11,3267 €/kg, 135 g je Stück → 1,5291 €/Stk.
  // Stückzahl steht nicht auf der Seite, nur Stückgewicht und Beutelgewicht (≈ 11 Stück).
  {"name":"Hähnchenpatty","einheit":"stk","preis":1.5291,"min":1.5291,"max":1.5291,"methode":"Großhandel","quellen":["https://www.food-service-frater.de/shop/Crunchy-Chikn-Burger-tiefgefroren-135g-p436712819"],"abruf":"2026-10-24"},
  // Pulled Pork (fertig gegart): nur Versandmetzger gefunden, beide Aktionspreise: Beefbandits 1,2 kg 25,20 € = 21,00 €/kg (regulär 26,00 €/kg), Gourmetfleisch Duroc ca. 400 g
  // 10,57 € = 26,43 €/kg → Mittel 23,715 × 0,85 = 20,1578. Knuspr-Angebote (20,49 / 15,16 €/kg) nicht mehr verfügbar, deshalb nicht gezählt. Großhandelspreis nicht gefunden – Wirt sollte eigenen Preis eintragen.
  {"name":"Pulled Pork","einheit":"kg","preis":20.1578,"min":21.0,"max":26.43,"methode":"Einzelhandel −15 %","quellen":["https://www.beefbandits.de/Beefbandits-BESTES-Pulled-Pork-fix-fertig/500137.6","https://www.gourmetfleisch.de/schwein/duroc-pulled-pork.html"],"abruf":"2026-10-24"},
  // Bacon (Frühstücksspeck, gegart, in Streifen): Food-United 2-kg-Beutel, gewerblicher Händler, 18,99 € brutto auf Kaufland.de und eBay (gleiche Ware, gleicher Preis) = 9,495 €/kg × 0,85.
  // Kleinpackungen (Frater Tulip 125 g 2,99 € netto = 23,92 €/kg; Knuspr Dacello 100 g 24,20 €/kg) nicht gezählt, weil für den Imbiss nicht maßgeblich.
  {"name":"Bacon","einheit":"kg","preis":8.0707,"min":9.495,"max":9.495,"methode":"Einzelhandel −15 %","quellen":["https://www.kaufland.de/product/442978655/","https://www.ebay.de/itm/115508619909"],"abruf":"2026-10-24"},
  // Veggie-Patty: Knuspr planted. Crispy Burger 2 × 90 g 2,99 € → 1,495 €/Stk × 0,85. Andere Packungen (Garden Gourmet 226 g, Green Mountain 230 g) nennen keine Stückzahl.
  {"name":"Veggie-Patty","einheit":"stk","preis":1.2708,"min":1.495,"max":1.495,"methode":"Einzelhandel −15 %","quellen":["https://www.knuspr.de/125405-planted-crispy-burger-2x90g"],"abruf":"2026-10-24"},
  // Burger-Bun: Großhandel Edna (Bäckerei-Großhandel), Burger Sesam 86 g 24er-Karton 14,47 € = 0,603 €/Stk; FF-Gourmet Burger rund 100 g 40er-Karton 26,80 € = 0,67 €/Stk → Mittel 0,6365.
  {"name":"Burger-Bun","einheit":"stk","preis":0.6365,"min":0.603,"max":0.67,"methode":"Großhandel","quellen":["https://www.edna.de/epages/Edna.sf/de_DE/?ObjectPath=/Shops/Edna/Products/2434","https://www.edna.de/epages/Edna.sf/de_DE/?ObjectPath=/Shops/Edna/Products/1600"],"abruf":"2026-10-24"},
  // Brioche-Bun: Großhandel Edna, FF-Glossy Brioche Burger 4-Inch 80 g 60er-Karton 42,18 € = 0,703 €/Stk; BB-Brezel-Brioche Burger Sesam 4-Inch 80 g 60er-Karton 42,54 € = 0,709 €/Stk → Mittel 0,706.
  {"name":"Brioche-Bun","einheit":"stk","preis":0.706,"min":0.703,"max":0.709,"methode":"Großhandel","quellen":["https://www.edna.de/epages/Edna.sf/de_DE/?ObjectPath=/Shops/Edna/Products/2679","https://www.edna.de/epages/Edna.sf/de_DE/?ObjectPath=/Shops/Edna/Products/2682"],"abruf":"2026-10-24"},
  // Cheddar-Scheiben: Großhandel Frater, Schmelzkäse „Chester“ Burgerkäse 88 Scheiben 1,25 kg 14,99 € netto = 11,992 €/kg. Chester ist die Handelsbezeichnung des Cheddar-Burgerkäses;
  // echter Cheddar am Block (Frater Irish Land 500 g 9,99 € = 19,98 €/kg) und Einzelhandels-Scheiben (Knuspr Hochland Cheddar 150 g 2,79 € = 18,60 €/kg brutto) liegen deutlich höher.
  {"name":"Cheddar-Scheiben","einheit":"kg","preis":11.992,"min":11.992,"max":11.992,"methode":"Großhandel","quellen":["https://www.food-service-frater.de/shop/Schmelz-K%C3%A4se-Chester-1-25-kg-p436527626"],"abruf":"2026-10-24"},
  // Rote Zwiebeln: Großhandel Frater, 10-kg-Netz (Frankreich) 16,99 € netto = 1,699 €/kg („Preis kann schwanken“). Frater 1,5-kg-Packung nicht gezählt (Seite nennt 1,5 kg und 1 kg zugleich).
  // Zum Vergleich Knuspr 1-kg-Netz 1,49 € brutto.
  {"name":"Rote Zwiebeln","einheit":"kg","preis":1.699,"min":1.699,"max":1.699,"methode":"Großhandel","quellen":["https://www.food-service-frater.de/shop/Zwiebeln-ROT-10-kg-p335280913"],"abruf":"2026-10-24"},
  // Gewürzgurken (Abtropfgewicht): Knuspr Hengstenberg Knax 360 g 2,99 € = 8,31 €/kg; Kühne Gewürzgurken 190 g 2,39 € = 12,58 €/kg → Mittel 10,445 × 0,85. Großgebinde (Frater 10,2-l-Dosen) ohne Gewichtsangabe, nicht gezählt.
  {"name":"Gewürzgurken","einheit":"kg","preis":8.8782,"min":8.31,"max":12.58,"methode":"Einzelhandel −15 %","quellen":["https://www.knuspr.de/410-hengstenberg-knax-gewuerzgurken","https://www.knuspr.de/2947-kuehne-gewuerzgurken"],"abruf":"2026-10-24"},
  // Jalapeños (eingelegt, Abtropfgewicht): eBay gewerblich Feinkost Dittmann 2,8-kg-Dose, ATG 1,6 kg, 17,85 € = 11,1562 €/kg; Knuspr Kühne Jalapeno 165 g 2,89 € = 17,52 €/kg → Mittel 14,3381 × 0,85.
  {"name":"Jalapeños","einheit":"kg","preis":12.1874,"min":11.1562,"max":17.52,"methode":"Einzelhandel −15 %","quellen":["https://www.ebay.de/itm/235785897579","https://www.knuspr.de/2959-kuehne-jalapeno-feurig-scharf"],"abruf":"2026-10-24"},
  // Avocado: Knuspr Hass essreif (ca. 250 g) 2,79 €/Stk; Avocado angereift (Knuspr-Günstig) 1,39 €/Stk → Mittel 2,09 × 0,85. Frater führt nur TK-Würfel (kg), nicht gezählt.
  {"name":"Avocado","einheit":"stk","preis":1.7765,"min":1.39,"max":2.79,"methode":"Einzelhandel −15 %","quellen":["https://www.knuspr.de/1-avocado-hass-essreif","https://www.knuspr.de/89828-avocado-angereift-1-stk"],"abruf":"2026-10-24"},
  // Burgersauce: Großhandel Frater, Mississippi Original Burger Sauce 2,9 kg 20,95 € netto = 7,2241 €/kg. Salomon/Bull's Eye 2-l-Kanister nicht gezählt (nur Liter, kein Gewicht).
  {"name":"Burgersauce","einheit":"kg","preis":7.2241,"min":7.2241,"max":7.2241,"methode":"Großhandel","quellen":["https://www.food-service-frater.de/shop/Mississippi-Original-Burger-Sauce-2-9-kg-p619074026"],"abruf":"2026-10-24"},
  // Ketchup: Großhandel Frater, 10-kg-Eimer netto: Vierlande Tomaten Ketchup o.K. 24,99 € (2,499 €/kg), Werder 31,49 € (3,149), Vierlande Gourmet 31,49 € (3,149) → Mittel 2,9323.
  {"name":"Ketchup","einheit":"kg","preis":2.9323,"min":2.499,"max":3.149,"methode":"Großhandel","quellen":["https://www.food-service-frater.de/shop/Vierlande-Tomaten-Ketchup-o-K-10-kg-p327456014","https://www.food-service-frater.de/shop/Werder-Tomaten-Ketchup-10-kg-Eimer-p327459104","https://www.food-service-frater.de/shop/Vierlande-Ketchup-Gourmet-10-kg-p327440020"],"abruf":"2026-10-24"},
  // BBQ-Sauce: Großhandel Frater, Heinz Bull's Eye BBQ 2 kg 15,99 € netto (7,995 €/kg), Mississippi Barbecue Sauce 510 g 4,99 € (9,7843 €/kg) → Mittel 8,8897.
  {"name":"BBQ-Sauce","einheit":"kg","preis":8.8897,"min":7.995,"max":9.7843,"methode":"Großhandel","quellen":["https://www.food-service-frater.de/shop/Heinz-Bulls-Eye-BBQ-2-kg-p545039225","https://www.food-service-frater.de/shop/Mississippi-Barbecue-Sauce-510-g-p329232038"],"abruf":"2026-10-24"},
  // Burgerbox (Karton/Papier): Großhandel Edna, Burgerbox „Newspaper“ 11,5 × 11 × 8 cm 500er-Karton 88,00 € = 0,176 €/Stk; Burgerbox „Zeitung“ 13 × 13 × 7,5 cm 200er-Karton 67,40 € = 0,337 €/Stk → Mittel 0,2565.
  {"name":"Burgerbox","einheit":"stk","preis":0.2565,"min":0.176,"max":0.337,"methode":"Großhandel","quellen":["https://www.edna.de/epages/Edna.sf/de_DE/?ObjectPath=/Shops/Edna/Products/99479","https://www.edna.de/epages/Edna.sf/de_DE/?ObjectPath=/Shops/Edna/Products/57555"],"abruf":"2026-10-24"},
  // Frischhefe (Nachtrag auf Zuruf 24.10.2026, blockiert sonst den Wareneinsatz aller Döner-Gerichte über das Dönerbrot-Rezept): Knuspr Dr. Oetker frische Hefe 42-g-Würfel 0,55 € = 13,0952 €/kg × 0,85.
  // 500-g-/1-kg-Blöcke für Bäckereien werden online nicht mit Preis angeboten (Frischware), Frater führt nur Trockenhefe in 21-/28-g-Tütchen. Bio-Würfel (Alnatura, Bioreal) bewusst nicht gezählt.
  {"name":"Frischhefe","einheit":"kg","preis":11.131,"min":13.0952,"max":13.0952,"methode":"Einzelhandel −15 %","quellen":["https://www.knuspr.de/2117-dr-oetker-frische-hefe"],"abruf":"2026-10-24"},
  // Eisbergsalat (Zoro 24.10.2026): Großhandel Frater, nur Stückpreise – Stück 1,49 €, 9er-Kiste 11,95 € (1,3278 €/Stk), Mittel 1,4089 €/Stk.
  // ANNAHME Stückgewicht ≈ 500 g (Großmarktware liegt üblich bei 400–700 g; kein belegtes Gewicht gefunden) → 2,8178 €/kg. Bleibt eine Schätzung,
  // bis ein Lieferant das Gewicht nennt oder der Wirt seinen Preis einträgt. Gremium 1 (24.10.2026): ohne diesen Wert zeigten 19 Döner-Gerichte „–“.
  {"name":"Eisbergsalat","einheit":"kg","preis":2.8178,"min":2.6556,"max":2.98,"methode":"Großhandel (Stückpreis, Gewicht angenommen)","quellen":["https://www.food-service-frater.de/shop/Eisbergsalat-St%C3%BCck-p335284778","https://www.food-service-frater.de/shop/Eisbergsalat-9-er-Kiste-p438642968"],"abruf":"2026-10-24"},
  // Senf (Zoro 26.10.2026, Gastro-Gebinde, gewerbliche Händler): Esmeyer Kühne mittelscharf 875 g 4,70 € netto = 5,3714 €/kg;
  // Kühne mittelscharf Portionsbeutel 150 × 10 g = 1,5 kg 8,54 € (Kaufland-Marktplatz, gewerblicher Verkäufer) = 5,6933 €/kg → Mittel 5,5324.
  {"name":"Senf","einheit":"kg","preis":5.5324,"min":5.3714,"max":5.6933,"methode":"Großhandel","quellen":["https://www.esmeyer-shop.de/en/kuehne-senf-mittelscharf-875g-einzelstueck-1kt-10st","https://www.kaufland.de/product/300589275/"],"abruf":"2026-10-26"},
  // Zoro 26.10.2026 (Recherche Großhandel, Frater-Netto-Preise öffentlich sichtbar, Stichprobe Chili-Cheese-Nuggets nachgeprüft):
  {"name":"Kartoffel-Wedges TK","einheit":"kg","preis":2.516,"min":2.516,"max":2.516,"methode":"Großhandel","quellen":["https://www.food-service-frater.de/shop/Vierlande-Wedges-gew%C3%BCrzt-tiefgefroren-2-5-kg-p343582002"],"abruf":"2026-10-26"},
  // Chili-Cheese-Nuggets: Frater Salomon 1 kg 10,98 € netto; Salomon-Datenblatt 48–53 Stück/kg → Mitte 50,5 Stück → 0,2174 €/Stück (gerechnet).
  {"name":"Chili-Cheese-Nuggets","einheit":"stk","preis":0.2174,"min":0.2072,"max":0.2288,"methode":"Großhandel","quellen":["https://www.food-service-frater.de/shop/Salomon-Chili-&-Cheese-Nuggets-tiefgefroren-1-kg-p345077118","https://www.salomon-foodworld.com/media/pages/media/fa9ff280c5-1760439511/8474800-es.pdf"],"abruf":"2026-10-26"},
  {"name":"Krautsalat","einheit":"kg","preis":4.495,"min":4.495,"max":4.495,"methode":"Großhandel","quellen":["https://www.food-service-frater.de/shop/Wernsing-Coleslaw-Salat-2-kg-p329263697"],"abruf":"2026-10-26"},
  // Cheddar-Käsesauce: MEX-AL 3-kg-Dose 5,72 €/kg brutto (7 %) = 5,3458 netto; Funfoodoase 20 kg 189,75 € netto = 9,4875 → Mittel 7,4167. edna (29,60 € je Dose, Gewicht unklar) nicht gezählt.
  {"name":"Käsesauce","einheit":"kg","preis":7.4167,"min":5.3458,"max":9.4875,"methode":"Großhandel","quellen":["https://www.mex-al.de/de/food/salsas/dipsalsas/84/cheddar-cheese-sauce-3kg-dose","https://www.funfoodoase.de/Nachos/Rostoffe/Cheddar-Cheese-Sauce-5-x-4-kg-Beutel-mit-Schlauch::683.html"],"abruf":"2026-10-26"},
  {"name":"Cheddarcreme","einheit":"kg","preis":7.4167,"min":5.3458,"max":9.4875,"methode":"Großhandel","quellen":["https://www.mex-al.de/de/food/salsas/dipsalsas/84/cheddar-cheese-sauce-3kg-dose","https://www.funfoodoase.de/Nachos/Rostoffe/Cheddar-Cheese-Sauce-5-x-4-kg-Beutel-mit-Schlauch::683.html"],"abruf":"2026-10-26"},
  {"name":"Erdbeeren","einheit":"kg","preis":6.795,"min":5.796,"max":7.79,"methode":"Großhandel","quellen":["https://www.food-service-frater.de/shop/Erdbeeren-tiefgefroren-2-5-kg-p341986773","https://www.food-service-frater.de/shop/METRO-Chef-Erdbeeren-tiefgefroren-1-kg-p342000651"],"abruf":"2026-10-26"},
  {"name":"Mango","einheit":"kg","preis":8.673,"min":5.356,"max":11.99,"methode":"Großhandel","quellen":["https://www.food-service-frater.de/shop/Mango-W%C3%BCrfel-tiefgefroren-2-5-kg-p342000663","https://www.food-service-frater.de/shop/METRO-Chef-Mango-W%C3%BCrfel-tiefgefroren-1-kg-p342037660"],"abruf":"2026-10-26"},
  {"name":"Ananas (Smoothie)","einheit":"kg","preis":5.688,"min":4.396,"max":6.98,"methode":"Großhandel","quellen":["https://www.food-service-frater.de/shop/Ananas-St%C3%BCcke-tiefgefroren-2-5-kg-p342037812","https://www.food-service-frater.de/shop/METRO-Chef-Ananas-St%C3%BCcke-tiefgefroren-1-kg-p342074651"],"abruf":"2026-10-26"},
  {"name":"Blaubeeren","einheit":"kg","preis":8.643,"min":8.49,"max":8.796,"methode":"Großhandel","quellen":["https://www.food-service-frater.de/shop/Heidelbeeren-tiefgefroren-2-5-kg-p342000751","https://www.food-service-frater.de/shop/METRO-Chef-Heidelbeeren-tiefgefroren-1-kg-p342000754"],"abruf":"2026-10-26"},
  {"name":"Spinat","einheit":"kg","preis":1.956,"min":1.956,"max":1.956,"methode":"Großhandel","quellen":["https://www.food-service-frater.de/shop/Blattspinat-portioniert-tiefgefroren-2-5-kg-p342551854"],"abruf":"2026-10-26"},
  // Smash-Patty: Frater Salomon Ranch Master Hamburger 50 × 100 g 59,99 € netto = 1,1998 €/Stück (Rindanteil laut Seite nicht geprüft).
  {"name":"Smash-Patty","einheit":"stk","preis":1.1998,"min":1.1998,"max":1.1998,"methode":"Großhandel","quellen":["https://www.food-service-frater.de/shop/Salomon-Ranch-Master-Hamburger-tiefgefroren-50-x-100-g-p343531309"],"abruf":"2026-10-26"},
];
