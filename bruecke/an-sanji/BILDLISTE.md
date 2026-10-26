# BILDLISTE GastroCalc – alle Bilder, die die App braucht
Stand 26.10.2026 · erzeugt aus den App-Daten mit `node tools/bildliste.mjs` (nicht von Hand ändern, neu erzeugen) · gepflegt von Zoro · für Sanji und Baris

Insgesamt **708 Bilder**, davon **212 vorhanden**, **496 fehlen** – 303 davon zeigen bis dahin ein ähnliches Sammelbild (Status „zeigt bis dahin …“), 193 zeigen nur ein Piktogramm. Ein fehlendes Einzelbild ist also nie ein Loch, aber oft ungenau (Beispiel heute: „Dönerspieß Kalb/Pute“ zeigt den Hähnchenspieß).
Fehlend nach Prio: Prio 1 = 114 · Prio 2 = 189 · Prio 3 = 193.
Fehlend je Gruppe: A Laden-Art: 1 · B Bereich: 12 · C Warengruppe: 9 · D Gericht-Familie: 8 · E Gericht: 87 · F Artikel: 369 · G Selbst gemacht: 6 · H Kühlung: 2 · I Müll: 2.
Die gleiche Liste als Tabelle: `bruecke/an-sanji/bildliste.csv` (Spalten: prio;gruppe;datei;name;status;motiv).

## Was drauf soll – was du (Sanji) entscheidest
Zoro sagt je Bild nur, WAS drauf ist (Spalte „Motiv“). WIE es aussieht, entscheidest du mit Baris im Zielbild „Kräuter & Kupfer“ – einmal festlegen, dann für alle gleich.

## Feste technische Regeln (die App hängt daran)
1. Dateiname genau wie in der Spalte „Datei“, plus `.webp`. Nur Kleinbuchstaben, Bindestriche.
2. WebP, 520 × 390 px (4:3), Qualität 70–75, Ziel 25–45 KB je Bild.
3. Keine Schrift, keine Logos, keine Marken, keine erkennbaren Personen, keine Hände mit Ringen/Tattoos.
4. Ein Motiv pro Bild, mittig, mit etwas Rand (die App schneidet bei kleinen Kacheln rund oder quadratisch zu).
5. Gerichte (g-): eine Portion, wie ein Imbiss sie serviert – kein Restaurant-Anrichten. Rohware (r-): so, wie sie geliefert wird. Verpackung (v-): leer. Getränke (d-): neutrales Gebinde.
6. Rechte: Nur selbst erzeugte Bilder (ChatGPT) oder eigene Fotos. Keine Stockfotos ohne geklärte Lizenz.

## Lieferweg (seit 17.10.2026 mit Schreibrecht)
- Eigener Branch: `sanji/2026-10-17-bilder` (oder späteres Datum), nie direkt nach main.
- Ablage nur unter `design-handoffs/sanji/bilder-<datum>/` – fertige `.webp` mit dem Dateinamen aus der Liste, dazu `LIESMICH.md` (welche Bilder, Status ENTWURF / ZUR FREIGABE / VON BARIS FREIGEGEBEN).
- Gerne als Bildbogen-Raster, wenn das schneller ist – dann im LIESMICH die Reihenfolge der Kacheln nennen; Zoro schneidet.
- Zoro prüft (Größe, Format, Name), kopiert nach `foto/`, trägt in `js/data/fotos.js` ein, Tests, Veröffentlichung. Sanji fasst `foto/`, `js/`, `css/`, `sw.js` nicht an.

## Reihenfolge-Vorschlag
Erst Prio 1 (alles, was ein Dönerladen sieht – unser Pilot), innerhalb davon zuerst Gruppe F (Artikel: Müll-Raster und Inventur zeigen sie täglich), dann D/E (Gerichte), dann A–C, G–I. Ein Bogen mit 12 Bildern je Lieferung ist ein guter Takt.

## Die Liste
Prio | Gruppe | Datei | Name in der App | Status | Motiv
--- | --- | --- | --- | --- | ---
1 | A Laden-Art | `laden-anders.webp` | Etwas anderes | fehlt | Außen- oder Thekenansicht eines kleinen, inhabergeführten Ladens: Etwas anderes. Keine Schrift, kein Logo, keine Personen.
1 | A Laden-Art | `laden-asia.webp` | Asia-Imbiss | vorhanden | Außen- oder Thekenansicht eines kleinen, inhabergeführten Ladens: Asia-Imbiss. Keine Schrift, kein Logo, keine Personen.
1 | A Laden-Art | `laden-baeckerei.webp` | Bäckerei & Börek | vorhanden | Außen- oder Thekenansicht eines kleinen, inhabergeführten Ladens: Bäckerei & Börek. Keine Schrift, kein Logo, keine Personen.
1 | A Laden-Art | `laden-cafe.webp` | Café & Bistro | vorhanden | Außen- oder Thekenansicht eines kleinen, inhabergeführten Ladens: Café & Bistro. Keine Schrift, kein Logo, keine Personen.
1 | A Laden-Art | `laden-doener.webp` | Döner & Grill | vorhanden | Außen- oder Thekenansicht eines kleinen, inhabergeführten Ladens: Döner & Grill. Keine Schrift, kein Logo, keine Personen.
1 | A Laden-Art | `laden-foodtruck.webp` | Foodtruck | vorhanden | Außen- oder Thekenansicht eines kleinen, inhabergeführten Ladens: Foodtruck. Keine Schrift, kein Logo, keine Personen.
1 | A Laden-Art | `laden-imbiss.webp` | Imbiss, Burger, Pommes | vorhanden | Außen- oder Thekenansicht eines kleinen, inhabergeführten Ladens: Imbiss, Burger, Pommes. Keine Schrift, kein Logo, keine Personen.
1 | A Laden-Art | `laden-kiosk.webp` | Kiosk mit warmer Küche | vorhanden | Außen- oder Thekenansicht eines kleinen, inhabergeführten Ladens: Kiosk mit warmer Küche. Keine Schrift, kein Logo, keine Personen.
1 | A Laden-Art | `laden-pizza.webp` | Pizza & Pasta | vorhanden | Außen- oder Thekenansicht eines kleinen, inhabergeführten Ladens: Pizza & Pasta. Keine Schrift, kein Logo, keine Personen.
1 | B Bereich | `bereich-alkoholfrei.webp` | Alkoholfreie Getränke | fehlt | Typische Auswahl des Bereichs „Alkoholfreie Getränke“ als Stillleben, 3–5 Dinge, Draufsicht.
1 | B Bereich | `bereich-beilagen.webp` | Beilagen & Sättigung | vorhanden | Typische Auswahl des Bereichs „Beilagen & Sättigung“ als Stillleben, 3–5 Dinge, Draufsicht.
1 | B Bereich | `bereich-doener.webp` | Döner & Kebab | fehlt | Typische Auswahl des Bereichs „Döner & Kebab“ als Stillleben, 3–5 Dinge, Draufsicht.
1 | B Bereich | `bereich-grundzutaten.webp` | Grundzutaten & Gewürze | fehlt | Typische Auswahl des Bereichs „Grundzutaten & Gewürze“ als Stillleben, 3–5 Dinge, Draufsicht.
1 | B Bereich | `bereich-salat.webp` | Salate & Bowls | vorhanden | Typische Auswahl des Bereichs „Salate & Bowls“ als Stillleben, 3–5 Dinge, Draufsicht.
1 | B Bereich | `bereich-verpackung.webp` | Verpackung & Einweg | fehlt | Typische Auswahl des Bereichs „Verpackung & Einweg“ als Stillleben, 3–5 Dinge, Draufsicht.
1 | C Warengruppe | `gruppe-fisch.webp` | Fisch & Meeresfrüchte | vorhanden | Sinnbild der Warengruppe „Fisch & Meeresfrüchte“: 3–4 typische Waren nebeneinander, Draufsicht.
1 | C Warengruppe | `gruppe-fleisch.webp` | Fleisch & Wurst | fehlt | Sinnbild der Warengruppe „Fleisch & Wurst“: 3–4 typische Waren nebeneinander, Draufsicht.
1 | C Warengruppe | `gruppe-gemuese.webp` | Gemüse, Obst & Frisches | fehlt | Sinnbild der Warengruppe „Gemüse, Obst & Frisches“: 3–4 typische Waren nebeneinander, Draufsicht.
1 | C Warengruppe | `gruppe-getraenk.webp` | Getränke | fehlt | Sinnbild der Warengruppe „Getränke“: 3–4 typische Waren nebeneinander, Draufsicht.
1 | C Warengruppe | `gruppe-gewuerz.webp` | Gewürze & Grundzutaten | fehlt | Sinnbild der Warengruppe „Gewürze & Grundzutaten“: 3–4 typische Waren nebeneinander, Draufsicht.
1 | C Warengruppe | `gruppe-kaese.webp` | Käse & Molkerei | fehlt | Sinnbild der Warengruppe „Käse & Molkerei“: 3–4 typische Waren nebeneinander, Draufsicht.
1 | C Warengruppe | `gruppe-sauce.webp` | Saucen, Öl & Dips | fehlt | Sinnbild der Warengruppe „Saucen, Öl & Dips“: 3–4 typische Waren nebeneinander, Draufsicht.
1 | C Warengruppe | `gruppe-spirituose.webp` | Spirituosen & Bar | fehlt | Sinnbild der Warengruppe „Spirituosen & Bar“: 3–4 typische Waren nebeneinander, Draufsicht.
1 | C Warengruppe | `gruppe-suess.webp` | Süßes & Backzutaten | vorhanden | Sinnbild der Warengruppe „Süßes & Backzutaten“: 3–4 typische Waren nebeneinander, Draufsicht.
1 | C Warengruppe | `gruppe-teig.webp` | Teig, Brot & Trockenware | fehlt | Sinnbild der Warengruppe „Teig, Brot & Trockenware“: 3–4 typische Waren nebeneinander, Draufsicht.
1 | C Warengruppe | `gruppe-verpackung.webp` | Verpackung & Einweg | fehlt | Sinnbild der Warengruppe „Verpackung & Einweg“: 3–4 typische Waren nebeneinander, Draufsicht.
1 | D Gericht-Familie | `g-asia-nudeln.webp` | asia-nudeln | vorhanden | Ein typisches Gericht der Familie „asia-nudeln“, fertig serviert wie im Imbiss (sichtbar: Mie-Nudeln, Möhren, Sojasprossen, Frühlingszwiebeln, Sojasauce, Asia-Box). Eine Portion.
1 | D Gericht-Familie | `g-asia-reis.webp` | asia-reis | vorhanden | Ein typisches Gericht der Familie „asia-reis“, fertig serviert wie im Imbiss (sichtbar: Jasminreis, Paprika, Möhren, Sojasauce, Asia-Box). Eine Portion.
1 | D Gericht-Familie | `g-auflauf.webp` | auflauf | vorhanden | Ein typisches Gericht der Familie „auflauf“, fertig serviert wie im Imbiss (sichtbar: Dönerspieß Kalb/Pute, Pommes frites, Sahnesauce, Pizzakäse gerieben, Menüschale 1-teilig). Eine Portion.
1 | D Gericht-Familie | `g-boerek.webp` | boerek | vorhanden | Ein typisches Gericht der Familie „boerek“, fertig serviert wie im Imbiss (sichtbar: Yufka-Teigblatt, Hirtenkäse / Feta, Eier, Alufolie-Bogen). Eine Portion.
1 | D Gericht-Familie | `g-brot.webp` | brot | vorhanden | Ein typisches Gericht der Familie „brot“, fertig serviert wie im Imbiss (sichtbar: Dönerbrot / Fladen, Eisbergsalat, Tomaten, Zwiebeln, Kräutersauce, Dönertüte). Eine Portion.
1 | D Gericht-Familie | `g-burger.webp` | burger | vorhanden | Ein typisches Gericht der Familie „burger“, fertig serviert wie im Imbiss (sichtbar: Rinderpatty 150 g, Burger-Bun, Eisbergsalat, Tomaten, Burgersauce, Burgerbox). Eine Portion.
1 | D Gericht-Familie | `g-cevapi.webp` | cevapi | vorhanden | Ein typisches Gericht der Familie „cevapi“, fertig serviert wie im Imbiss (sichtbar: Hackfleisch gemischt, Zwiebeln, Ajvar, Menüschale 3-teilig). Eine Portion.
1 | D Gericht-Familie | `g-currywurst.webp` | currywurst | vorhanden | Ein typisches Gericht der Familie „currywurst“, fertig serviert wie im Imbiss (sichtbar: Currywurst, Currysauce, Currypulver, Currywurstschale). Eine Portion.
1 | D Gericht-Familie | `g-doener.webp` | doener | vorhanden | Ein typisches Gericht der Familie „doener“, fertig serviert wie im Imbiss (sichtbar: Dönerspieß Kalb/Pute, Dönerbrot / Fladen, Eisbergsalat, Tomaten, Zwiebeln, Weißkohl). Eine Portion.
1 | D Gericht-Familie | `g-doener-box.webp` | doener-box | vorhanden | Ein typisches Gericht der Familie „doener-box“, fertig serviert wie im Imbiss (sichtbar: Dönerspieß Kalb/Pute, Pommes frites, Knoblauchsauce, Pommesschale). Eine Portion.
1 | D Gericht-Familie | `g-doener-salat.webp` | doener-salat | vorhanden | Ein typisches Gericht der Familie „doener-salat“, fertig serviert wie im Imbiss (sichtbar: Dönerspieß Kalb/Pute, Eisbergsalat, Weißkohl, Rotkohl, Tomaten, Zwiebeln). Eine Portion.
1 | D Gericht-Familie | `g-doener-teller.webp` | doener-teller | vorhanden | Ein typisches Gericht der Familie „doener-teller“, fertig serviert wie im Imbiss (sichtbar: Dönerspieß Kalb/Pute, Eisbergsalat, Tomaten, Zwiebeln, Weißkohl, Knoblauchsauce). Eine Portion.
1 | D Gericht-Familie | `g-extra.webp` | extra | fehlt | Ein typisches Gericht der Familie „extra“, fertig serviert wie im Imbiss. Eine Portion.
1 | D Gericht-Familie | `g-falafel.webp` | falafel | vorhanden | Ein typisches Gericht der Familie „falafel“, fertig serviert wie im Imbiss (sichtbar: Falafelbällchen, Dönerbrot / Fladen, Eisbergsalat, Tomaten, Kräutersauce, Dönertüte). Eine Portion.
1 | D Gericht-Familie | `g-falafel-box.webp` | falafel-box | vorhanden | Ein typisches Gericht der Familie „falafel-box“, fertig serviert wie im Imbiss (sichtbar: Falafelbällchen, Pommes frites, Kräutersauce, Pommesschale). Eine Portion.
1 | D Gericht-Familie | `g-falafel-teller.webp` | falafel-teller | vorhanden | Ein typisches Gericht der Familie „falafel-teller“, fertig serviert wie im Imbiss (sichtbar: Falafelbällchen, Eisbergsalat, Tomaten, Salatgurke, Kräutersauce, Menüschale 3-teilig). Eine Portion.
1 | D Gericht-Familie | `g-falafel-wrap.webp` | falafel-wrap | vorhanden | Ein typisches Gericht der Familie „falafel-wrap“, fertig serviert wie im Imbiss (sichtbar: Falafelbällchen, Dürüm-Wrap, Eisbergsalat, Tomaten, Kräutersauce, Alufolie-Bogen). Eine Portion.
1 | D Gericht-Familie | `g-fingerfood.webp` | fingerfood | vorhanden | Ein typisches Gericht der Familie „fingerfood“, fertig serviert wie im Imbiss (sichtbar: Fingerfood-Schale). Eine Portion.
1 | D Gericht-Familie | `g-gemuese.webp` | gemuese | vorhanden | Ein typisches Gericht der Familie „gemuese“, fertig serviert wie im Imbiss (sichtbar: Paprika, Zucchini, Champignons, Zwiebeln, Sonnenblumenöl, Menüschale 1-teilig). Eine Portion.
1 | D Gericht-Familie | `g-gyros.webp` | gyros | vorhanden | Ein typisches Gericht der Familie „gyros“, fertig serviert wie im Imbiss (sichtbar: Gyrosfleisch, Dönerbrot / Fladen, Zwiebeln, Tomaten, Joghurtsauce, Dönertüte). Eine Portion.
1 | D Gericht-Familie | `g-haehnchen-doener.webp` | haehnchen-doener | fehlt | Ein typisches Gericht der Familie „haehnchen-doener“, fertig serviert wie im Imbiss (sichtbar: Hähnchenspieß, Dönerbrot / Fladen, Eisbergsalat, Tomaten, Zwiebeln, Joghurtsauce). Eine Portion.
1 | D Gericht-Familie | `g-iskender.webp` | iskender | vorhanden | Ein typisches Gericht der Familie „iskender“, fertig serviert wie im Imbiss (sichtbar: Dönerspieß Kalb/Pute, Pide-Brot, Joghurt natur, Pizzatomaten (Dose), Butter, Menüschale 1-teilig). Eine Portion.
1 | D Gericht-Familie | `g-koefte.webp` | koefte | vorhanden | Ein typisches Gericht der Familie „koefte“, fertig serviert wie im Imbiss (sichtbar: Lammhackfleisch, Zwiebeln, Tomaten, Menüschale 3-teilig). Eine Portion.
1 | D Gericht-Familie | `g-lahmacun.webp` | lahmacun | vorhanden | Ein typisches Gericht der Familie „lahmacun“, fertig serviert wie im Imbiss (sichtbar: Lahmacun-Teig, Lammhackfleisch, Zwiebeln, Tomaten, Petersilie, Dönergewürz). Eine Portion.
1 | D Gericht-Familie | `g-nudeln.webp` | nudeln | vorhanden | Ein typisches Gericht der Familie „nudeln“, fertig serviert wie im Imbiss (sichtbar: Penne, Pizzatomaten (Dose), Pizzakäse gerieben, Pastabox). Eine Portion.
1 | D Gericht-Familie | `g-pad-thai.webp` | pad-thai | vorhanden | Ein typisches Gericht der Familie „pad-thai“, fertig serviert wie im Imbiss (sichtbar: Reisnudeln, Eier, Sojasprossen, Frühlingszwiebeln, Erdnusssauce, Asia-Box). Eine Portion.
1 | D Gericht-Familie | `g-pho.webp` | pho | vorhanden | Ein typisches Gericht der Familie „pho“, fertig serviert wie im Imbiss (sichtbar: Reisnudeln, Rinderbrühe Pulver, Sojasprossen, Frühlingszwiebeln, Suppenbecher 0,4 l). Eine Portion.
1 | D Gericht-Familie | `g-pide.webp` | pide | vorhanden | Ein typisches Gericht der Familie „pide“, fertig serviert wie im Imbiss (sichtbar: Pide-Teig, Sonnenblumenöl, Pizzakarton 30 cm). Eine Portion.
1 | D Gericht-Familie | `g-pizza.webp` | pizza | vorhanden | Ein typisches Gericht der Familie „pizza“, fertig serviert wie im Imbiss (sichtbar: Pizzateig, Pizzasoße, Pizzakäse gerieben, Olivenöl, Pizzakarton 30 cm). Eine Portion.
1 | D Gericht-Familie | `g-pizzabroetchen.webp` | pizzabroetchen | fehlt | Ein typisches Gericht der Familie „pizzabroetchen“, fertig serviert wie im Imbiss (sichtbar: Pizzateig, Olivenöl, Knoblauch, Kräutersauce, Dressingbecher, Pizzakarton 30 cm). Eine Portion.
1 | D Gericht-Familie | `g-pljeskavica.webp` | pljeskavica | fehlt | Ein typisches Gericht der Familie „pljeskavica“, fertig serviert wie im Imbiss (sichtbar: Hackfleisch gemischt, Zwiebeln, Ajvar, Dönerbrot / Fladen, Menüschale 1-teilig). Eine Portion.
1 | D Gericht-Familie | `g-pommes.webp` | pommes | vorhanden | Ein typisches Gericht der Familie „pommes“, fertig serviert wie im Imbiss (sichtbar: Pommes frites, Pommesschale). Eine Portion.
1 | D Gericht-Familie | `g-portion.webp` | portion | fehlt | Ein typisches Gericht der Familie „portion“, fertig serviert wie im Imbiss (sichtbar: Menüschale 1-teilig). Eine Portion.
1 | D Gericht-Familie | `g-salat.webp` | salat | vorhanden | Ein typisches Gericht der Familie „salat“, fertig serviert wie im Imbiss (sichtbar: Eisbergsalat, Tomaten, Salatgurke, Zwiebeln, Joghurtdressing, Salatschale). Eine Portion.
1 | D Gericht-Familie | `g-schaschlik.webp` | schaschlik | vorhanden | Ein typisches Gericht der Familie „schaschlik“, fertig serviert wie im Imbiss (sichtbar: Schweinegeschnetzeltes, Zwiebeln, Paprika, Currysauce, Menüschale 3-teilig). Eine Portion.
1 | D Gericht-Familie | `g-seele.webp` | seele | vorhanden | Ein typisches Gericht der Familie „seele“, fertig serviert wie im Imbiss (sichtbar: Pizzateig, Pizzasoße, Pizzakäse gerieben, Pizzakarton 30 cm). Eine Portion.
1 | D Gericht-Familie | `g-shawarma.webp` | shawarma | fehlt | Ein typisches Gericht der Familie „shawarma“, fertig serviert wie im Imbiss (sichtbar: Hähnchenspieß, Dürüm-Wrap, Salatgurke, Knoblauchsauce, Alufolie-Bogen). Eine Portion.
1 | D Gericht-Familie | `g-sosse.webp` | sosse | vorhanden | Ein typisches Gericht der Familie „sosse“, fertig serviert wie im Imbiss (sichtbar: Dressingbecher). Eine Portion.
1 | D Gericht-Familie | `g-teigtaschen.webp` | teigtaschen | vorhanden | Ein typisches Gericht der Familie „teigtaschen“, fertig serviert wie im Imbiss (sichtbar: Süß-Sauer-Sauce, Fingerfood-Schale). Eine Portion.
1 | D Gericht-Familie | `g-teller.webp` | teller | fehlt | Ein typisches Gericht der Familie „teller“, fertig serviert wie im Imbiss (sichtbar: Dönerspieß Kalb/Pute, Eisbergsalat, Tomaten, Knoblauchsauce, Menüschale 3-teilig). Eine Portion.
1 | D Gericht-Familie | `g-wrap.webp` | wrap | fehlt | Ein typisches Gericht der Familie „wrap“, fertig serviert wie im Imbiss (sichtbar: Dönerspieß Kalb/Pute, Dürüm-Wrap, Eisbergsalat, Tomaten, Zwiebeln, Kräutersauce). Eine Portion.
1 | D Gericht-Familie | `g-wurst.webp` | wurst | vorhanden | Ein typisches Gericht der Familie „wurst“, fertig serviert wie im Imbiss (sichtbar: Senf, Pommesschale). Eine Portion.
1 | E Gericht | `g-acai-smoothie-0-4-l.webp` | Acai Smoothie 0,4 l | vorhanden | „Acai Smoothie 0,4 l“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Erdbeeren, Blaubeeren, Mango, Acai-Püree.
1 | E Gericht | `g-adana-spiess.webp` | Adana-Spieß | fehlt – zeigt bis dahin g-adana | „Adana-Spieß“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Adana-Spieß, Pide-Brot, Zwiebeln, Petersilie, Joghurtsauce.
1 | E Gericht | `g-apfelschorle-0-3-l.webp` | Apfelschorle 0,3 l | fehlt – zeigt bis dahin d-saft | „Apfelschorle 0,3 l“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Apfelsaft.
1 | E Gericht | `g-bbq-dip.webp` | BBQ-Dip | vorhanden | „BBQ-Dip“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: BBQ-Sauce.
1 | E Gericht | `g-caesar-salad.webp` | Caesar Salad | fehlt – zeigt bis dahin g-salat | „Caesar Salad“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Romanasalat, Hähnchenbrust, Parmesan, Croutons, Caesar-Dressing.
1 | E Gericht | `g-chicken-pommes.webp` | Chicken-Pommes | vorhanden | „Chicken-Pommes“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Chicken-Pommes (fertig).
1 | E Gericht | `g-chicken-tenders-5-stueck.webp` | Chicken Tenders (5 Stück) | vorhanden | „Chicken Tenders (5 Stück)“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Chicken Tenders (Stück).
1 | E Gericht | `g-chili-cheese-nuggets-6-stueck.webp` | Chili-Cheese-Nuggets (6 Stück) | vorhanden | „Chili-Cheese-Nuggets (6 Stück)“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Chili-Cheese-Nuggets.
1 | E Gericht | `g-chili-cheese-pommes.webp` | Chili-Cheese-Pommes | vorhanden | „Chili-Cheese-Pommes“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Chili-Cheese-Pommes (fertig).
1 | E Gericht | `g-cola-0-33-l.webp` | Cola 0,33 l | vorhanden | „Cola 0,33 l“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Cola 0,33 l.
1 | E Gericht | `g-coleslaw.webp` | Coleslaw | vorhanden | „Coleslaw“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Krautsalat.
1 | E Gericht | `g-couscous-salat.webp` | Couscous-Salat | fehlt – zeigt bis dahin g-salat | „Couscous-Salat“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Couscous, Cocktailtomaten, Salatgurke, Kichererbsen, Olivenöl.
1 | E Gericht | `g-curly-fries.webp` | Curly Fries | vorhanden | „Curly Fries“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Curly Fries TK.
1 | E Gericht | `g-detox-smoothie-0-4-l.webp` | Detox Smoothie 0,4 l | vorhanden | „Detox Smoothie 0,4 l“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Ananas (Smoothie), Bananen, Spinat, Mango.
1 | E Gericht | `g-doener-kebab.webp` | Döner Kebab | vorhanden | „Döner Kebab“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Dönerspieß Kalb/Pute, Dönerbrot / Fladen, Eisbergsalat, Tomaten, Zwiebeln, Weißkohl.
1 | E Gericht | `g-doenerteller.webp` | Dönerteller | fehlt – zeigt bis dahin g-doener-teller | „Dönerteller“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Dönerspieß Kalb/Pute, Pommes frites, Eisbergsalat, Tomaten, Knoblauchsauce, Hirtenkäse / Feta.
1 | E Gericht | `g-dueruem-doener.webp` | Dürüm Döner | fehlt – zeigt bis dahin g-duerum | „Dürüm Döner“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Dönerspieß Kalb/Pute, Dürüm-Wrap, Eisbergsalat, Tomaten, Zwiebeln, Kräutersauce.
1 | E Gericht | `g-eistee-0-33-l.webp` | Eistee 0,33 l | fehlt – zeigt bis dahin d-eistee | „Eistee 0,33 l“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Eistee.
1 | E Gericht | `g-energydrink-0-25-l.webp` | Energydrink 0,25 l | fehlt – zeigt bis dahin d-energy | „Energydrink 0,25 l“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Energydrink 0,25 l.
1 | E Gericht | `g-falafel-dueruem.webp` | Falafel-Dürüm | fehlt – zeigt bis dahin g-falafel | „Falafel-Dürüm“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Falafelbällchen, Dürüm-Wrap, Eisbergsalat, Tomaten, Kräutersauce.
1 | E Gericht | `g-gemischter-salat-klein.webp` | Gemischter Salat klein | vorhanden | „Gemischter Salat klein“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Eisbergsalat, Tomaten, Salatgurke, Möhren, Joghurtdressing.
1 | E Gericht | `g-gemischtes-gemuese.webp` | Gemischtes Gemüse | vorhanden | „Gemischtes Gemüse“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Mischgemüse TK, Butter.
1 | E Gericht | `g-griechischer-salat.webp` | Griechischer Salat | vorhanden | „Griechischer Salat“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Eisbergsalat, Tomaten, Salatgurke, Rote Zwiebeln, Oliven, Feta.
1 | E Gericht | `g-haehnchendoener.webp` | Hähnchendöner | fehlt – zeigt bis dahin g-doener | „Hähnchendöner“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Hähnchenspieß, Dönerbrot / Fladen, Eisbergsalat, Tomaten, Zwiebeln, Joghurtsauce.
1 | E Gericht | `g-halloumi-sticks-6-stueck.webp` | Halloumi-Sticks (6 Stück) | vorhanden | „Halloumi-Sticks (6 Stück)“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Halloumi-Sticks.
1 | E Gericht | `g-hausgemachte-limonade-0-4-l.webp` | Hausgemachte Limonade 0,4 l | vorhanden | „Hausgemachte Limonade 0,4 l“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Hausgemachte Limonade, Zitronen, Minze, Trinkhalm.
1 | E Gericht | `g-joppie-dip.webp` | Joppie-Dip | vorhanden | „Joppie-Dip“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Joppie-Sauce.
1 | E Gericht | `g-kaesesauce-dip.webp` | Käsesauce-Dip | vorhanden | „Käsesauce-Dip“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Käsesauce.
1 | E Gericht | `g-kartoffelknoedel-2-stueck.webp` | Kartoffelknödel (2 Stück) | fehlt – zeigt bis dahin g-pommes | „Kartoffelknödel (2 Stück)“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Kartoffelknödel.
1 | E Gericht | `g-kartoffelsalat.webp` | Kartoffelsalat | fehlt – zeigt bis dahin g-salat | „Kartoffelsalat“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Kartoffeln, Zwiebeln, Weinessig, Rapsöl.
1 | E Gericht | `g-ketchup-dip.webp` | Ketchup-Dip | vorhanden | „Ketchup-Dip“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Ketchup.
1 | E Gericht | `g-knoblauch-mayonnaise-dip.webp` | Knoblauch-Mayonnaise-Dip | vorhanden | „Knoblauch-Mayonnaise-Dip“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Knoblauch-Mayonnaise.
1 | E Gericht | `g-knoblauch-parmesan-pommes.webp` | Knoblauch-Parmesan-Pommes | vorhanden | „Knoblauch-Parmesan-Pommes“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Knoblauch-Parmesan-Pommes (fertig).
1 | E Gericht | `g-kroketten-beilage.webp` | Kroketten (Beilage) | fehlt – zeigt bis dahin g-pommes | „Kroketten (Beilage)“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Kroketten.
1 | E Gericht | `g-mayonnaise-dip.webp` | Mayonnaise-Dip | vorhanden | „Mayonnaise-Dip“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Mayonnaise.
1 | E Gericht | `g-mineralwasser-0-25-l.webp` | Mineralwasser 0,25 l | vorhanden | „Mineralwasser 0,25 l“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Mineralwasser 0,25 l.
1 | E Gericht | `g-onion-rings-5-stueck.webp` | Onion Rings (5 Stück) | vorhanden | „Onion Rings (5 Stück)“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Onion Rings TK (Stück).
1 | E Gericht | `g-orangensaft-0-2-l.webp` | Orangensaft 0,2 l | vorhanden | „Orangensaft 0,2 l“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Orangensaft.
1 | E Gericht | `g-poke-bowl-lachs.webp` | Poke Bowl Lachs | fehlt – zeigt bis dahin g-salat | „Poke Bowl Lachs“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Quinoa, Räucherlachs, Avocado, Möhren, Babyspinat.
1 | E Gericht | `g-pommes-frites.webp` | Pommes frites | fehlt – zeigt bis dahin g-pommes | „Pommes frites“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Pommes frites.
1 | E Gericht | `g-pommes-frites-beilage.webp` | Pommes frites (Beilage) | vorhanden | „Pommes frites (Beilage)“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Pommes frites.
1 | E Gericht | `g-reis-beilage.webp` | Reis (Beilage) | vorhanden | „Reis (Beilage)“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Langkornreis.
1 | E Gericht | `g-spaetzle-beilage.webp` | Spätzle (Beilage) | fehlt – zeigt bis dahin g-pommes | „Spätzle (Beilage)“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Spätzle, Butter.
1 | E Gericht | `g-sucuk-sandwich.webp` | Sucuk-Sandwich | fehlt – zeigt bis dahin g-sucuk | „Sucuk-Sandwich“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Sucuk, Dönerbrot / Fladen, Tomaten, Zwiebeln, Scharfe Sauce.
1 | E Gericht | `g-suesskartoffel-pommes.webp` | Süßkartoffel-Pommes | vorhanden | „Süßkartoffel-Pommes“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Süßkartoffel-Pommes.
1 | E Gericht | `g-sunshine-smoothie-0-4-l.webp` | Sunshine Smoothie 0,4 l | vorhanden | „Sunshine Smoothie 0,4 l“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Pfirsich, Passionsfrucht, Mango.
1 | E Gericht | `g-thunfischsalat.webp` | Thunfischsalat | vorhanden | „Thunfischsalat“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Eisbergsalat, Thunfisch (Dose), Mais, Tomaten, Joghurtdressing.
1 | E Gericht | `g-trueffel-mayonnaise-dip.webp` | Trüffel-Mayonnaise-Dip | vorhanden | „Trüffel-Mayonnaise-Dip“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Trüffel-Mayonnaise.
1 | E Gericht | `g-trueffel-pommes.webp` | Trüffel-Pommes | vorhanden | „Trüffel-Pommes“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Trüffel-Pommes (fertig).
1 | E Gericht | `g-wedges.webp` | Wedges | vorhanden | „Wedges“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Kartoffel-Wedges TK.
1 | F Artikel | `d-apfelsaft.webp` | Apfelsaft | vorhanden | Apfelsaft als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
1 | F Artikel | `d-ayran-0-25-l.webp` | Ayran 0,25 l | vorhanden | Ayran 0,25 l als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
1 | F Artikel | `d-ayran-1-0-l.webp` | Ayran 1,0 l | fehlt – zeigt bis dahin g-ayran | Ayran 1,0 l als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
1 | F Artikel | `d-bio-limonade-0-33-l.webp` | Bio-Limonade 0,33 l | vorhanden | Bio-Limonade 0,33 l als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
1 | F Artikel | `d-cola-0-33-l-dose.webp` | Cola 0,33 l Dose | fehlt – zeigt bis dahin d-cola | Cola 0,33 l Dose als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
1 | F Artikel | `d-cola-0-33-l-glas.webp` | Cola 0,33 l Glas | fehlt – zeigt bis dahin d-cola | Cola 0,33 l Glas als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
1 | F Artikel | `d-cola-0-5-l-pet.webp` | Cola 0,5 l PET | fehlt – zeigt bis dahin d-cola | Cola 0,5 l PET als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
1 | F Artikel | `d-cola-1-0-l.webp` | Cola 1,0 l | vorhanden | Cola 1,0 l als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
1 | F Artikel | `d-cola-1-0-l-glas.webp` | Cola 1,0 l Glas | fehlt – zeigt bis dahin d-cola | Cola 1,0 l Glas als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
1 | F Artikel | `d-cola-1-5-l-pet.webp` | Cola 1,5 l PET | fehlt – zeigt bis dahin d-cola | Cola 1,5 l PET als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
1 | F Artikel | `d-cola-bag-in-box-postmix.webp` | Cola Bag-in-Box (Postmix) | fehlt – zeigt bis dahin d-cola | Cola Bag-in-Box (Postmix) als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
1 | F Artikel | `d-eistee.webp` | Eistee | vorhanden | Eistee als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
1 | F Artikel | `d-energydrink-0-25-l.webp` | Energydrink 0,25 l | vorhanden | Energydrink 0,25 l als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
1 | F Artikel | `d-fanta-0-2-l.webp` | Fanta 0,2 l | vorhanden | Fanta 0,2 l als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
1 | F Artikel | `d-hausgemachte-limonade.webp` | Hausgemachte Limonade | vorhanden | Hausgemachte Limonade als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
1 | F Artikel | `d-ingwershot.webp` | Ingwershot | vorhanden | Ingwershot als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
1 | F Artikel | `d-kirschsaft.webp` | Kirschsaft | vorhanden | Kirschsaft als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
1 | F Artikel | `d-kokoswasser.webp` | Kokoswasser | vorhanden | Kokoswasser als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
1 | F Artikel | `d-lassi.webp` | Lassi | vorhanden | Lassi als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
1 | F Artikel | `d-mineralwasser-0-75-l.webp` | Mineralwasser 0,75 l | vorhanden | Mineralwasser 0,75 l als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
1 | F Artikel | `d-rhabarberschorle.webp` | Rhabarberschorle | fehlt – zeigt bis dahin d-saft | Rhabarberschorle als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
1 | F Artikel | `d-sprite-0-2-l.webp` | Sprite 0,2 l | vorhanden | Sprite 0,2 l als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
1 | F Artikel | `r-adana-spiess.webp` | Adana-Spieß | fehlt – zeigt bis dahin r-doenerspiess | Adana-Spieß als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-ajvar.webp` | Ajvar | fehlt – zeigt bis dahin r-ketchup-mayo | Ajvar als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-babyspinat.webp` | Babyspinat | fehlt – zeigt bis dahin r-spinat | Babyspinat als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-balsamico.webp` | Balsamico | fehlt | Balsamico als Rohware, Flasche oder Kanister; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-bandnudeln.webp` | Bandnudeln | vorhanden | Bandnudeln als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-basilikum-getrocknet.webp` | Basilikum getrocknet | fehlt – zeigt bis dahin r-petersilie | Basilikum getrocknet als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-bratensauce.webp` | Bratensauce | fehlt – zeigt bis dahin r-ketchup-mayo | Bratensauce als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-bulgur.webp` | Bulgur | vorhanden | Bulgur als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-caesar-dressing.webp` | Caesar-Dressing | fehlt – zeigt bis dahin r-ketchup-mayo | Caesar-Dressing als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-chiliflocken.webp` | Chiliflocken | fehlt – zeigt bis dahin r-gewuerz | Chiliflocken als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-cocktailsauce.webp` | Cocktailsauce | fehlt – zeigt bis dahin r-ketchup-mayo | Cocktailsauce als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-cocktailtomaten.webp` | Cocktailtomaten | fehlt – zeigt bis dahin r-tomate | Cocktailtomaten als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-couscous.webp` | Couscous | vorhanden | Couscous als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-croutons.webp` | Croutons | fehlt | Croutons als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-doenerbrot-fladen.webp` | Dönerbrot / Fladen | vorhanden | Dönerbrot / Fladen als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-doenergewuerz.webp` | Dönergewürz | fehlt – zeigt bis dahin r-gewuerz | Dönergewürz als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-doenerspiess-kalb-pute.webp` | Dönerspieß Kalb/Pute | vorhanden | Dönerspieß Kalb/Pute als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-dueruem-wrap.webp` | Dürüm-Wrap | vorhanden | Dürüm-Wrap als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-eisbergsalat.webp` | Eisbergsalat | vorhanden | Eisbergsalat als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-falafelbaellchen.webp` | Falafelbällchen | vorhanden | Falafelbällchen als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-feldsalat.webp` | Feldsalat | fehlt – zeigt bis dahin r-salat | Feldsalat als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-feta.webp` | Feta | vorhanden | Feta als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-gyrosfleisch.webp` | Gyrosfleisch | vorhanden | Gyrosfleisch als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-haehnchenspiess.webp` | Hähnchenspieß | vorhanden | Hähnchenspieß als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-halloumi.webp` | Halloumi | fehlt – zeigt bis dahin r-pizzakaese | Halloumi als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-hirtenkaese-feta.webp` | Hirtenkäse / Feta | vorhanden | Hirtenkäse / Feta als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-joghurtdressing.webp` | Joghurtdressing | fehlt – zeigt bis dahin r-knoblauchsauce | Joghurtdressing als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-joghurtsauce.webp` | Joghurtsauce | vorhanden | Joghurtsauce als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-kartoffelgratin.webp` | Kartoffelgratin | fehlt – zeigt bis dahin r-pommes-tk | Kartoffelgratin als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-kartoffelknoedel.webp` | Kartoffelknödel | fehlt – zeigt bis dahin r-pommes-tk | Kartoffelknödel als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-kichererbsen.webp` | Kichererbsen | vorhanden | Kichererbsen als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-kidneybohnen.webp` | Kidneybohnen | vorhanden | Kidneybohnen als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-knoblauchgranulat.webp` | Knoblauchgranulat | fehlt – zeigt bis dahin r-knoblauch | Knoblauchgranulat als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-knoblauchsauce.webp` | Knoblauchsauce | vorhanden | Knoblauchsauce als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-kraeuterbutter.webp` | Kräuterbutter | fehlt – zeigt bis dahin r-petersilie | Kräuterbutter als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-kraeuterquark.webp` | Kräuterquark | fehlt – zeigt bis dahin r-joghurt | Kräuterquark als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-kraeutersauce.webp` | Kräutersauce | vorhanden | Kräutersauce als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-kreuzkuemmel.webp` | Kreuzkümmel | fehlt – zeigt bis dahin r-gewuerz | Kreuzkümmel als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-lahmacun-teig.webp` | Lahmacun-Teig | vorhanden | Lahmacun-Teig als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-lammhackfleisch.webp` | Lammhackfleisch | fehlt – zeigt bis dahin r-doenerspiess | Lammhackfleisch als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-langkornreis.webp` | Langkornreis | vorhanden | Langkornreis als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-mais.webp` | Mais | vorhanden | Mais als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-mischgemuese-tk.webp` | Mischgemüse TK | fehlt | Mischgemüse TK als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-oliven.webp` | Oliven | vorhanden | Oliven als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-oregano.webp` | Oregano | fehlt – zeigt bis dahin r-gewuerz | Oregano als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-paprika-edelsuess.webp` | Paprika edelsüß | fehlt – zeigt bis dahin r-paprika | Paprika edelsüß als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-peperoni-eingelegt.webp` | Peperoni eingelegt | vorhanden | Peperoni eingelegt als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-petersilie.webp` | Petersilie | vorhanden | Petersilie als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-pide-brot.webp` | Pide-Brot | vorhanden | Pide-Brot als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-pide-teig.webp` | Pide-Teig | fehlt – zeigt bis dahin r-mehl | Pide-Teig als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-putenbrustschinken.webp` | Putenbrustschinken | fehlt – zeigt bis dahin r-schinken | Putenbrustschinken als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-putenstreifen.webp` | Putenstreifen | vorhanden | Putenstreifen als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-quinoa.webp` | Quinoa | fehlt | Quinoa als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-raeucherlachs.webp` | Räucherlachs | fehlt | Räucherlachs als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-romanasalat.webp` | Romanasalat | fehlt – zeigt bis dahin r-salat | Romanasalat als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-rotkohl.webp` | Rotkohl | vorhanden | Rotkohl als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-salatgurke.webp` | Salatgurke | vorhanden | Salatgurke als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-sauerkraut.webp` | Sauerkraut | fehlt | Sauerkraut als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-scharfe-sauce.webp` | Scharfe Sauce | vorhanden | Scharfe Sauce als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-semmelknoedel.webp` | Semmelknödel | fehlt | Semmelknödel als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-sonnenblumenoel.webp` | Sonnenblumenöl | fehlt – zeigt bis dahin r-oel | Sonnenblumenöl als Rohware, Flasche oder Kanister; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-spaetzle.webp` | Spätzle | fehlt | Spätzle als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-speisestaerke.webp` | Speisestärke | fehlt | Speisestärke als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-sucuk.webp` | Sucuk | vorhanden | Sucuk als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-suesskartoffeln.webp` | Süßkartoffeln | fehlt – zeigt bis dahin r-pommes-tk | Süßkartoffeln als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-thymian.webp` | Thymian | fehlt – zeigt bis dahin r-gewuerz | Thymian als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-tomaten.webp` | Tomaten | vorhanden | Tomaten als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-truthahnsalami.webp` | Truthahnsalami | fehlt – zeigt bis dahin r-salami | Truthahnsalami als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-weinessig.webp` | Weinessig | fehlt | Weinessig als Rohware, Flasche oder Kanister; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-weisskohl.webp` | Weißkohl | vorhanden | Weißkohl als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-worcestersauce.webp` | Worcestersauce | fehlt – zeigt bis dahin r-ketchup-mayo | Worcestersauce als Rohware, Flasche oder Kanister; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-yufka-teigblatt.webp` | Yufka-Teigblatt | fehlt – zeigt bis dahin r-yufka | Yufka-Teigblatt als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-zwiebelgranulat.webp` | Zwiebelgranulat | fehlt – zeigt bis dahin r-zwiebel | Zwiebelgranulat als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `r-zwiebeln.webp` | Zwiebeln | vorhanden | Zwiebeln als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
1 | F Artikel | `v-alufolie-bogen.webp` | Alufolie-Bogen | fehlt – zeigt bis dahin v-alufolie | Alufolie-Bogen, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
1 | F Artikel | `v-alufolie-rolle.webp` | Alufolie (Rolle) | fehlt – zeigt bis dahin v-alufolie | Alufolie (Rolle), leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
1 | F Artikel | `v-beilagenschale.webp` | Beilagenschale | fehlt | Beilagenschale, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
1 | F Artikel | `v-butterbrotpapier.webp` | Butterbrotpapier | fehlt | Butterbrotpapier, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
1 | F Artikel | `v-dessertbecher.webp` | Dessertbecher | fehlt – zeigt bis dahin v-becher | Dessertbecher, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
1 | F Artikel | `v-doenertuete.webp` | Dönertüte | vorhanden | Dönertüte, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
1 | F Artikel | `v-dressingbecher.webp` | Dressingbecher | vorhanden | Dressingbecher, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
1 | F Artikel | `v-einweghandschuhe.webp` | Einweghandschuhe | fehlt | Einweghandschuhe, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
1 | F Artikel | `v-frischhaltefolie-rolle.webp` | Frischhaltefolie (Rolle) | fehlt – zeigt bis dahin v-alufolie | Frischhaltefolie (Rolle), leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
1 | F Artikel | `v-holzbesteck-set.webp` | Holzbesteck-Set | fehlt | Holzbesteck-Set, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
1 | F Artikel | `v-menueschale.webp` | Menüschale | vorhanden | Menüschale, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
1 | F Artikel | `v-menueschale-1-teilig.webp` | Menüschale 1-teilig | fehlt – zeigt bis dahin v-menueschale | Menüschale 1-teilig, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
1 | F Artikel | `v-menueschale-3-teilig.webp` | Menüschale 3-teilig | fehlt – zeigt bis dahin v-menueschale | Menüschale 3-teilig, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
1 | F Artikel | `v-muellbeutel.webp` | Müllbeutel | fehlt | Müllbeutel, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
1 | F Artikel | `v-reinigungstuch.webp` | Reinigungstuch | fehlt | Reinigungstuch, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
1 | F Artikel | `v-salatschale.webp` | Salatschale | fehlt | Salatschale, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
1 | F Artikel | `v-trinkbecher-0-3-l.webp` | Trinkbecher 0,3 l | fehlt – zeigt bis dahin v-becher | Trinkbecher 0,3 l, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
1 | F Artikel | `v-trinkbecher-0-4-l.webp` | Trinkbecher 0,4 l | fehlt – zeigt bis dahin v-becher | Trinkbecher 0,4 l, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
1 | G Selbst gemacht | `s-adana.webp` | adana | fehlt | Selbstgemachtes „adana“ in der Küche, roh bzw. frisch zubereitet, in einer Edelstahl- oder Kunststoffschale.
1 | G Selbst gemacht | `s-brot.webp` | brot | vorhanden | Selbstgemachtes „brot“ in der Küche, roh bzw. frisch zubereitet, in einer Edelstahl- oder Kunststoffschale.
1 | G Selbst gemacht | `s-lahmacun.webp` | lahmacun | fehlt | Selbstgemachtes „lahmacun“ in der Küche, roh bzw. frisch zubereitet, in einer Edelstahl- oder Kunststoffschale.
1 | G Selbst gemacht | `s-patty.webp` | patty | fehlt | Selbstgemachtes „patty“ in der Küche, roh bzw. frisch zubereitet, in einer Edelstahl- oder Kunststoffschale.
1 | G Selbst gemacht | `s-sossen.webp` | sossen | fehlt | Selbstgemachtes „sossen“ in der Küche, roh bzw. frisch zubereitet, in einer Edelstahl- oder Kunststoffschale.
1 | G Selbst gemacht | `s-teig.webp` | teig | fehlt | Selbstgemachtes „teig“ in der Küche, roh bzw. frisch zubereitet, in einer Edelstahl- oder Kunststoffschale.
1 | G Selbst gemacht | `s-tomatensosse.webp` | tomatensosse | fehlt | Selbstgemachtes „tomatensosse“ in der Küche, roh bzw. frisch zubereitet, in einer Edelstahl- oder Kunststoffschale.
1 | H Kühlung | `k-getraenkekuehler-foto.webp` | Getränkekühlschrank mit Glastür | fehlt | Getränkekühlschrank mit Glastür in einem Imbiss, Gerät gut erkennbar, Tür geschlossen, ohne Marke.
1 | H Kühlung | `k-kuehlraum-foto.webp` | Kühlraum (begehbar) | fehlt | Kühlraum (begehbar) in einem Imbiss, Gerät gut erkennbar, Tür geschlossen, ohne Marke.
1 | H Kühlung | `k-kuehlschrank-foto.webp` | Kühlschrank | vorhanden | Kühlschrank in einem Imbiss, Gerät gut erkennbar, Tür geschlossen, ohne Marke.
1 | H Kühlung | `k-saladette-foto.webp` | Saladette / Kühltheke | vorhanden | Saladette / Kühltheke in einem Imbiss, Gerät gut erkennbar, Tür geschlossen, ohne Marke.
1 | H Kühlung | `k-tiefkuehler-foto.webp` | Tiefkühltruhe | vorhanden | Tiefkühltruhe in einem Imbiss, Gerät gut erkennbar, Tür geschlossen, ohne Marke.
1 | H Kühlung | `k-warmhalter-foto.webp` | Warmhaltetheke / Bain-Marie | vorhanden | Warmhaltetheke / Bain-Marie in einem Imbiss, Gerät gut erkennbar, Tür geschlossen, ohne Marke.
1 | I Müll | `m-biotonne-foto.webp` | Biotonne | vorhanden | Biotonne, sauber fotografiert, nicht eklig.
1 | I Müll | `m-eimer-foto.webp` | Abfalleimer mit Speiseresten | vorhanden | Abfalleimer mit Speiseresten, sauber fotografiert, nicht eklig.
1 | I Müll | `m-frittieroel.webp` | Altöl-Kanister | fehlt | Altöl-Kanister, sauber fotografiert, nicht eklig.
1 | I Müll | `m-personalessen.webp` | Personalessen (Teller am Tresen) | fehlt | Personalessen (Teller am Tresen), sauber fotografiert, nicht eklig.
2 | B Bereich | `bereich-asia.webp` | Asiatisch & Wok | fehlt | Typische Auswahl des Bereichs „Asiatisch & Wok“ als Stillleben, 3–5 Dinge, Draufsicht.
2 | B Bereich | `bereich-burger.webp` | Burger & Grill | fehlt | Typische Auswahl des Bereichs „Burger & Grill“ als Stillleben, 3–5 Dinge, Draufsicht.
2 | B Bereich | `bereich-currywurst.webp` | Currywurst & Pommes | fehlt | Typische Auswahl des Bereichs „Currywurst & Pommes“ als Stillleben, 3–5 Dinge, Draufsicht.
2 | B Bereich | `bereich-fingerfood.webp` | Fingerfood & Catering | vorhanden | Typische Auswahl des Bereichs „Fingerfood & Catering“ als Stillleben, 3–5 Dinge, Draufsicht.
2 | B Bereich | `bereich-fleischgericht.webp` | Fleisch, Fisch & Hauptgang | fehlt | Typische Auswahl des Bereichs „Fleisch, Fisch & Hauptgang“ als Stillleben, 3–5 Dinge, Draufsicht.
2 | B Bereich | `bereich-pizza.webp` | Pizza & Pasta | fehlt | Typische Auswahl des Bereichs „Pizza & Pasta“ als Stillleben, 3–5 Dinge, Draufsicht.
2 | E Gericht | `g-bacon-burger.webp` | Bacon Burger | fehlt – zeigt bis dahin g-burger | „Bacon Burger“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Rinderpatty 150 g, Burger-Bun, Bacon, Cheddar-Scheiben, BBQ-Sauce, Eisbergsalat.
2 | E Gericht | `g-bacon-cheeseburger.webp` | Bacon Cheeseburger | vorhanden | „Bacon Cheeseburger“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Smash-Patty (Gewicht offen), Burger-Bun, Cheddar-Scheiben, Gewürzgurken, Zwiebeln, Rinderspeck.
2 | E Gericht | `g-bratwurst-im-broetchen.webp` | Bratwurst im Brötchen | fehlt – zeigt bis dahin g-wurst | „Bratwurst im Brötchen“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Bratwurst, Brötchen, Ketchup.
2 | E Gericht | `g-canape-lachs.webp` | Canapé Lachs | fehlt – zeigt bis dahin g-fingerfood | „Canapé Lachs“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Canapé-Böden, Lachstatar, Frischkäse.
2 | E Gericht | `g-cheeseburger-classic.webp` | Cheeseburger Classic | fehlt – zeigt bis dahin g-cheeseburger | „Cheeseburger Classic“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Rinderpatty 150 g, Burger-Bun, Cheddar-Scheiben, Eisbergsalat, Tomaten, Rote Zwiebeln.
2 | E Gericht | `g-chicken-nuggets-6-stueck.webp` | Chicken Nuggets (6 Stück) | vorhanden | „Chicken Nuggets (6 Stück)“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Hähnchen-Nuggets, Mayonnaise.
2 | E Gericht | `g-chickenburger.webp` | Chickenburger | fehlt – zeigt bis dahin g-burger | „Chickenburger“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Hähnchenpatty, Brioche-Bun, Eisbergsalat, Tomaten, Mayonnaise.
2 | E Gericht | `g-chili-cheeseburger.webp` | Chili Cheeseburger | vorhanden | „Chili Cheeseburger“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Smash-Patty (Gewicht offen), Burger-Bun, Cheddar-Scheiben, Gewürzgurken, Zwiebeln, Cheddarcreme.
2 | E Gericht | `g-classic-smash-burger.webp` | Classic Smash Burger | vorhanden | „Classic Smash Burger“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Smash-Patty (Gewicht offen), Burger-Bun, Cheddar-Scheiben, Gewürzgurken, Zwiebeln, Ketchup.
2 | E Gericht | `g-currywurst-einzeln.webp` | Currywurst einzeln | fehlt – zeigt bis dahin g-currywurst | „Currywurst einzeln“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Currywurst, Currysauce, Currypulver, Holzgabel.
2 | E Gericht | `g-currywurst-mit-pommes.webp` | Currywurst mit Pommes | vorhanden | „Currywurst mit Pommes“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Currywurst, Currysauce, Pommes frites, Currypulver, Holzgabel.
2 | E Gericht | `g-doppel-cheeseburger.webp` | Doppel-Cheeseburger | fehlt – zeigt bis dahin g-cheeseburger | „Doppel-Cheeseburger“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Rinderpatty 150 g, Burger-Bun, Cheddar-Scheiben, Eisbergsalat, Tomaten, Burgersauce.
2 | E Gericht | `g-ente-knusprig-mit-reis.webp` | Ente knusprig mit Reis | fehlt – zeigt bis dahin g-reis | „Ente knusprig mit Reis“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Entenbrust, Jasminreis, Pak Choi, Sojasauce.
2 | E Gericht | `g-forelle-muellerin.webp` | Forelle Müllerin | fehlt – zeigt bis dahin g-fleischgericht | „Forelle Müllerin“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Forelle ganz, Kartoffeln, Butterschmalz, Zitronen, Petersilie.
2 | E Gericht | `g-frikadelle-im-broetchen.webp` | Frikadelle im Brötchen | fehlt – zeigt bis dahin g-currywurst | „Frikadelle im Brötchen“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Frikadelle, Brötchen, Ketchup.
2 | E Gericht | `g-fruehlingsrollen-3-stueck.webp` | Frühlingsrollen (3 Stück) | fehlt – zeigt bis dahin g-asia-reis | „Frühlingsrollen (3 Stück)“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Frühlingsrolle, Süß-Sauer-Sauce.
2 | E Gericht | `g-garnelen-im-wok.webp` | Garnelen im Wok | fehlt – zeigt bis dahin g-asia-reis | „Garnelen im Wok“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Garnelen, Mie-Nudeln, Zuckerschoten, Ingwer, Sesamöl.
2 | E Gericht | `g-gebratene-nudeln-mit-haehnchen.webp` | Gebratene Nudeln mit Hähnchen | fehlt – zeigt bis dahin g-nudeln | „Gebratene Nudeln mit Hähnchen“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Mie-Nudeln, Hähnchenbrust, Paprika, Möhren, Sojasprossen, Sojasauce.
2 | E Gericht | `g-gebratener-reis-mit-ei.webp` | Gebratener Reis mit Ei | fehlt – zeigt bis dahin g-reis | „Gebratener Reis mit Ei“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Jasminreis, Eier, Möhren, Frühlingszwiebeln, Sojasauce.
2 | E Gericht | `g-gemuesesticks-mit-hummus.webp` | Gemüsesticks mit Hummus | fehlt – zeigt bis dahin g-gemuese | „Gemüsesticks mit Hummus“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Rohkost-Sticks, Hummus.
2 | E Gericht | `g-haehnchenbrust-mit-gemuese.webp` | Hähnchenbrust mit Gemüse | vorhanden | „Hähnchenbrust mit Gemüse“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Hähnchenbrust, Grüne Bohnen, Kartoffeln, Bratenfond, Rapsöl.
2 | E Gericht | `g-haehnchenspiess-mit-dip.webp` | Hähnchenspieß mit Dip | vorhanden | „Hähnchenspieß mit Dip“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Hähnchenspieß, Kräuterdip.
2 | E Gericht | `g-kaesespiess.webp` | Käsespieß | fehlt – zeigt bis dahin g-adana | „Käsespieß“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Käsewürfel, Weintrauben, Cocktailspieß.
2 | E Gericht | `g-lachsfilet-gebraten.webp` | Lachsfilet gebraten | fehlt – zeigt bis dahin g-fleischgericht | „Lachsfilet gebraten“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Lachsfilet, Brokkoli, Kartoffeln, Sauce hollandaise, Butterschmalz.
2 | E Gericht | `g-lasagne.webp` | Lasagne | vorhanden | „Lasagne“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Lasagneplatten, Hackfleisch gemischt, Pizzatomaten (Dose), Sahnesauce, Pizzakäse gerieben.
2 | E Gericht | `g-mini-frikadellen-3-stueck.webp` | Mini-Frikadellen (3 Stück) | fehlt – zeigt bis dahin g-fingerfood | „Mini-Frikadellen (3 Stück)“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Mini-Frikadellen, Kräuterdip.
2 | E Gericht | `g-mini-quiche.webp` | Mini-Quiche | fehlt – zeigt bis dahin g-fingerfood | „Mini-Quiche“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Mini-Quiche.
2 | E Gericht | `g-nashville-burger.webp` | Nashville Burger | vorhanden | „Nashville Burger“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Burger-Bun, Chicken Tenders, Krautsalat, Burgersauce.
2 | E Gericht | `g-oklahoma-smash-burger.webp` | Oklahoma Smash Burger | vorhanden | „Oklahoma Smash Burger“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Smash-Patty (Gewicht offen), Burger-Bun, Cheddar-Scheiben, Gewürzgurken, Zwiebeln, Ketchup.
2 | E Gericht | `g-penne-arrabiata.webp` | Penne Arrabiata | vorhanden | „Penne Arrabiata“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Penne, Pizzatomaten (Dose), Knoblauch, Chiliflocken, Olivenöl.
2 | E Gericht | `g-pizza-funghi.webp` | Pizza Funghi | fehlt – zeigt bis dahin g-pizza | „Pizza Funghi“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Pizzateig, Pizzasoße, Pizzakäse gerieben, Champignons.
2 | E Gericht | `g-pizza-margherita.webp` | Pizza Margherita | vorhanden | „Pizza Margherita“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Pizzateig, Pizzasoße, Pizzakäse gerieben, Olivenöl, Oregano.
2 | E Gericht | `g-pizza-prosciutto.webp` | Pizza Prosciutto | fehlt – zeigt bis dahin g-pizza | „Pizza Prosciutto“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Pizzateig, Pizzasoße, Pizzakäse gerieben, Kochschinken.
2 | E Gericht | `g-pizza-quattro-formaggi.webp` | Pizza Quattro Formaggi | fehlt – zeigt bis dahin g-pizza | „Pizza Quattro Formaggi“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Pizzateig, Pizzasoße, Pizzakäse gerieben, Mozzarella, Gorgonzola, Parmesan.
2 | E Gericht | `g-pizza-salami.webp` | Pizza Salami | vorhanden | „Pizza Salami“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Pizzateig, Pizzasoße, Pizzakäse gerieben, Salami, Olivenöl.
2 | E Gericht | `g-pizza-tonno.webp` | Pizza Tonno | fehlt – zeigt bis dahin g-pizza | „Pizza Tonno“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Pizzateig, Pizzasoße, Pizzakäse gerieben, Thunfisch (Dose), Zwiebeln.
2 | E Gericht | `g-pommes-gross.webp` | Pommes groß | vorhanden | „Pommes groß“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Pommes frites.
2 | E Gericht | `g-pommes-klein.webp` | Pommes klein | fehlt – zeigt bis dahin g-pommes | „Pommes klein“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Pommes frites.
2 | E Gericht | `g-pommes-mit-dip.webp` | Pommes mit Dip | fehlt – zeigt bis dahin g-pommes | „Pommes mit Dip“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Pommes frites, Mayonnaise.
2 | E Gericht | `g-pulled-pork-burger.webp` | Pulled-Pork-Burger | fehlt – zeigt bis dahin g-burger | „Pulled-Pork-Burger“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Pulled Pork, Brioche-Bun, BBQ-Sauce, Rote Zwiebeln.
2 | E Gericht | `g-rinderbraten-mit-kloessen.webp` | Rinderbraten mit Klößen | fehlt – zeigt bis dahin g-fleischgericht | „Rinderbraten mit Klößen“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Rinderbraten, Kartoffelknödel, Rotkohl, Rotweinjus.
2 | E Gericht | `g-rotes-thai-curry.webp` | Rotes Thai-Curry | fehlt – zeigt bis dahin g-asia-reis | „Rotes Thai-Curry“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Hähnchenbrust, Kokosmilch, Currypaste, Paprika, Bambussprossen, Basmatireis.
2 | E Gericht | `g-rumpsteak-mit-beilage.webp` | Rumpsteak mit Beilage | fehlt – zeigt bis dahin g-fleischgericht | „Rumpsteak mit Beilage“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Rumpsteak, Kartoffeln, Brokkoli, Kräuterbutter, Rapsöl.
2 | E Gericht | `g-schnitzel-mit-pommes.webp` | Schnitzel mit Pommes | vorhanden | „Schnitzel mit Pommes“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Schnitzel paniert, Pommes frites, Remoulade.
2 | E Gericht | `g-spaghetti-bolognese.webp` | Spaghetti Bolognese | vorhanden | „Spaghetti Bolognese“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Spaghetti, Hackfleisch gemischt, Pizzatomaten (Dose), Zwiebeln, Parmesan, Olivenöl.
2 | E Gericht | `g-suess-sauer-schwein.webp` | Süß-sauer Schwein | fehlt – zeigt bis dahin g-asia-reis | „Süß-sauer Schwein“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Schweinegeschnetzeltes, Süß-Sauer-Sauce, Paprika, Basmatireis.
2 | E Gericht | `g-super-smash-burger.webp` | Super Smash Burger | vorhanden | „Super Smash Burger“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Smash-Patty (Gewicht offen), Burger-Bun, Cheddar-Scheiben, Gewürzgurken, Zwiebeln, Burgersauce.
2 | E Gericht | `g-veggie-burger.webp` | Veggie-Burger | fehlt – zeigt bis dahin g-burger | „Veggie-Burger“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Veggie-Patty, Vollkorn-Bun, Eisbergsalat, Tomaten, Avocado, Burgersauce.
2 | E Gericht | `g-wiener-schnitzel-mit-pommes.webp` | Wiener Schnitzel mit Pommes | fehlt – zeigt bis dahin g-fleischgericht | „Wiener Schnitzel mit Pommes“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Kalbsschnitzel, Weizenmehl Typ 405, Eier, Kartoffeln, Butterschmalz, Zitronen.
2 | E Gericht | `g-wrap-haeppchen.webp` | Wrap-Häppchen | fehlt – zeigt bis dahin g-duerum | „Wrap-Häppchen“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Weizenwraps, Frischkäse, Serranoschinken, Cocktailtomaten.
2 | F Artikel | `d-cola-0-33-l.webp` | Cola 0,33 l | fehlt – zeigt bis dahin d-cola | Cola 0,33 l als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
2 | F Artikel | `d-mineralwasser-0-5-l.webp` | Mineralwasser 0,5 l | fehlt – zeigt bis dahin d-wasser | Mineralwasser 0,5 l als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
2 | F Artikel | `r-acai-pueree.webp` | Acai-Püree | vorhanden | Acai-Püree als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-aioli.webp` | Aioli | fehlt – zeigt bis dahin r-ketchup-mayo | Aioli als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-ananas-dose.webp` | Ananas (Dose) | fehlt – zeigt bis dahin r-ananas | Ananas (Dose) als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-ananas-smoothie.webp` | Ananas (Smoothie) | fehlt – zeigt bis dahin r-ananas | Ananas (Smoothie) als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-artischockenherzen.webp` | Artischockenherzen | fehlt | Artischockenherzen als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-avocado.webp` | Avocado | fehlt | Avocado als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-bacon.webp` | Bacon | fehlt | Bacon als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-bambussprossen.webp` | Bambussprossen | fehlt | Bambussprossen als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-bananen.webp` | Bananen | vorhanden | Bananen als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-basilikum.webp` | Basilikum | fehlt – zeigt bis dahin r-petersilie | Basilikum als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-basmatireis.webp` | Basmatireis | vorhanden | Basmatireis als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-bbq-sauce.webp` | BBQ-Sauce | fehlt – zeigt bis dahin g-bbq-dip | BBQ-Sauce als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-blattsalat-sorte-offen.webp` | Blattsalat (Sorte offen) | fehlt – zeigt bis dahin r-salat | Blattsalat (Sorte offen) als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-blaubeeren.webp` | Blaubeeren | vorhanden | Blaubeeren als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-blauschimmelkaese.webp` | Blauschimmelkäse | fehlt – zeigt bis dahin r-pizzakaese | Blauschimmelkäse als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-bockwurst.webp` | Bockwurst | fehlt – zeigt bis dahin r-wurst | Bockwurst als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-bratenfond.webp` | Bratenfond | fehlt | Bratenfond als Rohware, Flasche oder Kanister; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-bratwurst.webp` | Bratwurst | fehlt – zeigt bis dahin r-wurst | Bratwurst als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-brioche-bun.webp` | Brioche-Bun | fehlt – zeigt bis dahin r-burger-bun | Brioche-Bun als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-broetchen.webp` | Brötchen | vorhanden | Brötchen als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-brokkoli.webp` | Brokkoli | fehlt | Brokkoli als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-bueffelmozzarella.webp` | Büffelmozzarella | fehlt – zeigt bis dahin r-mozzarella | Büffelmozzarella als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-burger-bun.webp` | Burger-Bun | vorhanden | Burger-Bun als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-burgersauce.webp` | Burgersauce | vorhanden | Burgersauce als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-butterschmalz.webp` | Butterschmalz | fehlt | Butterschmalz als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-canape-boeden.webp` | Canapé-Böden | fehlt | Canapé-Böden als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-champignons.webp` | Champignons | fehlt – zeigt bis dahin r-champignon | Champignons als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-cheddar-scheiben.webp` | Cheddar-Scheiben | fehlt – zeigt bis dahin r-cheddar | Cheddar-Scheiben als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-cheddarcreme.webp` | Cheddarcreme | fehlt – zeigt bis dahin g-kaesesauce-dip | Cheddarcreme als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-chicken-pommes-fertig.webp` | Chicken-Pommes (fertig) | fehlt – zeigt bis dahin g-chicken-pommes | Chicken-Pommes (fertig) als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-chicken-tenders.webp` | Chicken Tenders | fehlt – zeigt bis dahin g-chicken-tenders-5-stueck | Chicken Tenders als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-chicken-tenders-stueck.webp` | Chicken Tenders (Stück) | fehlt – zeigt bis dahin g-chicken-tenders-5-stueck | Chicken Tenders (Stück) als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-chicken-wings.webp` | Chicken Wings | fehlt – zeigt bis dahin r-fingerfood-tk | Chicken Wings als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-chili-cheese-nuggets.webp` | Chili-Cheese-Nuggets | fehlt – zeigt bis dahin g-chili-cheese-nuggets-6-stueck | Chili-Cheese-Nuggets als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-chili-cheese-pommes-fertig.webp` | Chili-Cheese-Pommes (fertig) | fehlt – zeigt bis dahin g-chili-cheese-pommes | Chili-Cheese-Pommes (fertig) als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-cracker.webp` | Cracker | fehlt | Cracker als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-curly-fries-tk.webp` | Curly Fries TK | fehlt – zeigt bis dahin r-curly-fries | Curly Fries TK als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-currypaste.webp` | Currypaste | fehlt | Currypaste als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-currypulver.webp` | Currypulver | fehlt – zeigt bis dahin r-gewuerz | Currypulver als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-currysauce.webp` | Currysauce | vorhanden | Currysauce als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-currywurst.webp` | Currywurst | fehlt – zeigt bis dahin r-wurst | Currywurst als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-currywurst-vegan.webp` | Currywurst vegan | fehlt – zeigt bis dahin r-wurst | Currywurst vegan als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-dorade-ganz.webp` | Dorade ganz | fehlt | Dorade ganz als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-emmentaler.webp` | Emmentaler | fehlt – zeigt bis dahin r-pizzakaese | Emmentaler als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-entenbrust.webp` | Entenbrust | fehlt | Entenbrust als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-erdbeeren.webp` | Erdbeeren | vorhanden | Erdbeeren als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-erdnusssauce.webp` | Erdnusssauce | fehlt – zeigt bis dahin r-ketchup-mayo | Erdnusssauce als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-forelle-ganz.webp` | Forelle ganz | fehlt | Forelle ganz als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-frikadelle.webp` | Frikadelle | vorhanden | Frikadelle als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-frikandel-tk.webp` | Frikandel TK | fehlt – zeigt bis dahin r-fingerfood-tk | Frikandel TK als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-frischhefe.webp` | Frischhefe | fehlt – zeigt bis dahin r-mehl | Frischhefe als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-frittieroel.webp` | Frittieröl | fehlt – zeigt bis dahin r-oel | Frittieröl als Rohware, Flasche oder Kanister; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-fruehlingsrolle.webp` | Frühlingsrolle | fehlt | Frühlingsrolle als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-fruehlingszwiebeln.webp` | Frühlingszwiebeln | fehlt – zeigt bis dahin r-zwiebel | Frühlingszwiebeln als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-garnelen.webp` | Garnelen | vorhanden | Garnelen als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-garnelenspiess.webp` | Garnelenspieß | fehlt – zeigt bis dahin r-doenerspiess | Garnelenspieß als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-gewuerzgurken.webp` | Gewürzgurken | fehlt – zeigt bis dahin r-pickles | Gewürzgurken als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-gnocchi.webp` | Gnocchi | fehlt | Gnocchi als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-gorgonzola.webp` | Gorgonzola | fehlt | Gorgonzola als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-gruene-bohnen.webp` | Grüne Bohnen | fehlt | Grüne Bohnen als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-gurkensalat.webp` | Gurkensalat | fehlt – zeigt bis dahin r-gurke | Gurkensalat als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-hackfleisch-gemischt.webp` | Hackfleisch gemischt | fehlt – zeigt bis dahin r-hack | Hackfleisch gemischt als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-haehnchen-nuggets.webp` | Hähnchen-Nuggets | vorhanden | Hähnchen-Nuggets als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-haehnchenbrust.webp` | Hähnchenbrust | vorhanden | Hähnchenbrust als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-haehnchenpatty.webp` | Hähnchenpatty | fehlt – zeigt bis dahin r-haehnchen | Hähnchenpatty als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-halloumi-sticks.webp` | Halloumi-Sticks | fehlt – zeigt bis dahin g-halloumi-sticks-6-stueck | Halloumi-Sticks als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-hartweizengriess.webp` | Hartweizengrieß | fehlt | Hartweizengrieß als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-hummus.webp` | Hummus | fehlt – zeigt bis dahin r-ketchup-mayo | Hummus als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-ingwer.webp` | Ingwer | fehlt | Ingwer als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-jakobsmuscheln.webp` | Jakobsmuscheln | fehlt | Jakobsmuscheln als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-jalapenos.webp` | Jalapeños | vorhanden | Jalapeños als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-jasminreis.webp` | Jasminreis | fehlt – zeigt bis dahin r-reis | Jasminreis als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-joppie-sauce.webp` | Joppie-Sauce | fehlt – zeigt bis dahin g-joppie-dip | Joppie-Sauce als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-kaesesauce.webp` | Käsesauce | fehlt – zeigt bis dahin g-kaesesauce-dip | Käsesauce als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-kaesewuerfel.webp` | Käsewürfel | fehlt – zeigt bis dahin r-pizzakaese | Käsewürfel als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-kalbsschnitzel.webp` | Kalbsschnitzel | fehlt – zeigt bis dahin r-doenerspiess | Kalbsschnitzel als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-kartoffel-wedges-tk.webp` | Kartoffel-Wedges TK | fehlt – zeigt bis dahin r-wedges | Kartoffel-Wedges TK als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-ketchup.webp` | Ketchup | fehlt – zeigt bis dahin g-ketchup-dip | Ketchup als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-knoblauch.webp` | Knoblauch | vorhanden | Knoblauch als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-knoblauch-mayonnaise.webp` | Knoblauch-Mayonnaise | fehlt – zeigt bis dahin g-knoblauch-mayonnaise-dip | Knoblauch-Mayonnaise als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-knoblauch-parmesan-pommes-fertig.webp` | Knoblauch-Parmesan-Pommes (fertig) | fehlt – zeigt bis dahin g-knoblauch-parmesan-pommes | Knoblauch-Parmesan-Pommes (fertig) als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-kochschinken.webp` | Kochschinken | fehlt – zeigt bis dahin r-schinken | Kochschinken als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-kokosmilch.webp` | Kokosmilch | fehlt | Kokosmilch als Rohware, Flasche oder Kanister; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-kraeuterdip.webp` | Kräuterdip | fehlt – zeigt bis dahin r-ketchup-mayo | Kräuterdip als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-krakauer.webp` | Krakauer | fehlt – zeigt bis dahin r-wurst | Krakauer als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-krautsalat.webp` | Krautsalat | vorhanden | Krautsalat als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-kroketten.webp` | Kroketten | fehlt – zeigt bis dahin r-pommes-tk | Kroketten als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-lachsfilet.webp` | Lachsfilet | fehlt | Lachsfilet als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-lachstatar.webp` | Lachstatar | fehlt | Lachstatar als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-lammkotelett.webp` | Lammkotelett | fehlt – zeigt bis dahin r-doenerspiess | Lammkotelett als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-lasagneplatten.webp` | Lasagneplatten | fehlt – zeigt bis dahin r-nudeln | Lasagneplatten als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-mango.webp` | Mango | vorhanden | Mango als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-matjesfilet.webp` | Matjesfilet | fehlt | Matjesfilet als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-mayonnaise.webp` | Mayonnaise | vorhanden | Mayonnaise als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-mie-nudeln.webp` | Mie-Nudeln | fehlt – zeigt bis dahin r-nudeln | Mie-Nudeln als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-mini-frikadellen.webp` | Mini-Frikadellen | vorhanden | Mini-Frikadellen als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-mini-quiche.webp` | Mini-Quiche | fehlt | Mini-Quiche als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-moehren.webp` | Möhren | vorhanden | Möhren als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-mozzarella.webp` | Mozzarella | vorhanden | Mozzarella als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-mozzarella-kugeln.webp` | Mozzarella-Kugeln | fehlt – zeigt bis dahin r-mozzarella | Mozzarella-Kugeln als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-mozzarella-sticks-tk.webp` | Mozzarella-Sticks TK | vorhanden | Mozzarella-Sticks TK als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-muffin-sorte-offen.webp` | Muffin (Sorte offen) | fehlt – zeigt bis dahin g-muffin-sorte-offen | Muffin (Sorte offen) als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-oliven-schwarz.webp` | Oliven schwarz | fehlt – zeigt bis dahin r-oliven | Oliven schwarz als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-olivenoel.webp` | Olivenöl | fehlt – zeigt bis dahin r-oel | Olivenöl als Rohware, Flasche oder Kanister; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-onion-rings-tk.webp` | Onion Rings TK | vorhanden | Onion Rings TK als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-onion-rings-tk-stueck.webp` | Onion Rings TK (Stück) | fehlt – zeigt bis dahin r-onion-rings-tk | Onion Rings TK (Stück) als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-oregano-getrocknet.webp` | Oregano getrocknet | fehlt – zeigt bis dahin r-gewuerz | Oregano getrocknet als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-pak-choi.webp` | Pak Choi | fehlt | Pak Choi als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-paprika.webp` | Paprika | vorhanden | Paprika als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-parmaschinken.webp` | Parmaschinken | fehlt – zeigt bis dahin r-schinken | Parmaschinken als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-parmesan.webp` | Parmesan | fehlt | Parmesan als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-passionsfrucht.webp` | Passionsfrucht | vorhanden | Passionsfrucht als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-penne.webp` | Penne | vorhanden | Penne als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-peperoni-salami.webp` | Peperoni-Salami | fehlt – zeigt bis dahin r-salami | Peperoni-Salami als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-pesto-genovese.webp` | Pesto Genovese | fehlt – zeigt bis dahin r-ketchup-mayo | Pesto Genovese als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-pfirsich.webp` | Pfirsich | vorhanden | Pfirsich als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-pizzakaese-gerieben.webp` | Pizzakäse gerieben | vorhanden | Pizzakäse gerieben als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-pizzamehl-typ-00.webp` | Pizzamehl Typ 00 | fehlt – zeigt bis dahin r-pizzateig | Pizzamehl Typ 00 als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-pizzasosse.webp` | Pizzasoße | vorhanden | Pizzasoße als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-pizzateig.webp` | Pizzateig | vorhanden | Pizzateig als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-pizzatomaten-dose.webp` | Pizzatomaten (Dose) | fehlt – zeigt bis dahin r-tomate | Pizzatomaten (Dose) als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-pommes-frites.webp` | Pommes frites | vorhanden | Pommes frites als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-pulled-pork.webp` | Pulled Pork | fehlt | Pulled Pork als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-radieschen.webp` | Radieschen | fehlt | Radieschen als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-rapsoel.webp` | Rapsöl | fehlt – zeigt bis dahin r-oel | Rapsöl als Rohware, Flasche oder Kanister; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-reisnudeln.webp` | Reisnudeln | fehlt – zeigt bis dahin r-nudeln | Reisnudeln als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-remoulade.webp` | Remoulade | fehlt – zeigt bis dahin r-ketchup-mayo | Remoulade als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-rinderbraten.webp` | Rinderbraten | fehlt – zeigt bis dahin r-doenerspiess | Rinderbraten als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-rinderfilet.webp` | Rinderfilet | fehlt – zeigt bis dahin r-doenerspiess | Rinderfilet als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-rindergeschnetzeltes.webp` | Rindergeschnetzeltes | fehlt – zeigt bis dahin r-doenerspiess | Rindergeschnetzeltes als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-rinderhack.webp` | Rinderhack | fehlt – zeigt bis dahin r-hack | Rinderhack als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-rinderpatty-150-g.webp` | Rinderpatty 150 g | fehlt – zeigt bis dahin r-doenerspiess | Rinderpatty 150 g als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-rinderspeck.webp` | Rinderspeck | vorhanden | Rinderspeck als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-roesti.webp` | Rösti | fehlt | Rösti als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-rohkost-sticks.webp` | Rohkost-Sticks | fehlt – zeigt bis dahin r-fingerfood-tk | Rohkost-Sticks als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-rosenkohl.webp` | Rosenkohl | fehlt – zeigt bis dahin r-rotkohl | Rosenkohl als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-rosmarin.webp` | Rosmarin | fehlt | Rosmarin als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-rote-zwiebeln.webp` | Rote Zwiebeln | fehlt – zeigt bis dahin r-zwiebel | Rote Zwiebeln als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-rotweinjus.webp` | Rotweinjus | fehlt | Rotweinjus als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-rucola.webp` | Rucola | fehlt – zeigt bis dahin r-salat | Rucola als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-rumpsteak.webp` | Rumpsteak | fehlt | Rumpsteak als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-sahnesauce.webp` | Sahnesauce | fehlt – zeigt bis dahin r-ketchup-mayo | Sahnesauce als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-salami.webp` | Salami | vorhanden | Salami als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-salamiwuerfel.webp` | Salamiwürfel | fehlt – zeigt bis dahin r-salami | Salamiwürfel als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-salz.webp` | Salz | fehlt – zeigt bis dahin r-gewuerz | Salz als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-sardellenfilets.webp` | Sardellenfilets | fehlt | Sardellenfilets als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-sauce-hollandaise.webp` | Sauce hollandaise | fehlt – zeigt bis dahin r-ketchup-mayo | Sauce hollandaise als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-schnitzel-paniert.webp` | Schnitzel paniert | fehlt | Schnitzel paniert als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-schweinefilet.webp` | Schweinefilet | fehlt | Schweinefilet als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-schweinegeschnetzeltes.webp` | Schweinegeschnetzeltes | vorhanden | Schweinegeschnetzeltes als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-schweineschnitzel.webp` | Schweineschnitzel | fehlt | Schweineschnitzel als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-senf.webp` | Senf | vorhanden | Senf als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-serranoschinken.webp` | Serranoschinken | fehlt – zeigt bis dahin r-schinken | Serranoschinken als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-sesamoel.webp` | Sesamöl | fehlt – zeigt bis dahin r-oel | Sesamöl als Rohware, Flasche oder Kanister; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-smash-patty-gewicht-offen.webp` | Smash-Patty (Gewicht offen) | fehlt – zeigt bis dahin r-patty | Smash-Patty (Gewicht offen) als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-sojasauce.webp` | Sojasauce | fehlt – zeigt bis dahin r-ketchup-mayo | Sojasauce als Rohware, Flasche oder Kanister; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-sojasprossen.webp` | Sojasprossen | fehlt | Sojasprossen als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-spaghetti.webp` | Spaghetti | fehlt – zeigt bis dahin r-nudeln | Spaghetti als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-speckwuerfel.webp` | Speckwürfel | fehlt | Speckwürfel als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-spinat.webp` | Spinat | vorhanden | Spinat als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-suess-sauer-sauce.webp` | Süß-Sauer-Sauce | fehlt – zeigt bis dahin r-ketchup-mayo | Süß-Sauer-Sauce als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-suesskartoffel-pommes.webp` | Süßkartoffel-Pommes | vorhanden | Süßkartoffel-Pommes als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-teigtaschen-tk.webp` | Teigtaschen TK | fehlt – zeigt bis dahin r-mehl | Teigtaschen TK als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-thunfisch-dose.webp` | Thunfisch (Dose) | fehlt – zeigt bis dahin r-thunfisch | Thunfisch (Dose) als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-tofu.webp` | Tofu | fehlt | Tofu als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-tomatenmark.webp` | Tomatenmark | fehlt – zeigt bis dahin r-tomate | Tomatenmark als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-trueffel-mayonnaise.webp` | Trüffel-Mayonnaise | fehlt – zeigt bis dahin g-trueffel-mayonnaise-dip | Trüffel-Mayonnaise als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-trueffel-pommes-fertig.webp` | Trüffel-Pommes (fertig) | fehlt – zeigt bis dahin g-trueffel-pommes | Trüffel-Pommes (fertig) als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-veggie-patty.webp` | Veggie-Patty | fehlt – zeigt bis dahin r-patty | Veggie-Patty als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-vollkorn-bun.webp` | Vollkorn-Bun | vorhanden | Vollkorn-Bun als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-wan-tan-blaetter.webp` | Wan-Tan-Blätter | fehlt | Wan-Tan-Blätter als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-weintrauben.webp` | Weintrauben | fehlt | Weintrauben als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-weizenwraps.webp` | Weizenwraps | vorhanden | Weizenwraps als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-zanderfilet.webp` | Zanderfilet | fehlt | Zanderfilet als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-ziegenkaese.webp` | Ziegenkäse | fehlt – zeigt bis dahin r-pizzakaese | Ziegenkäse als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-zucchini.webp` | Zucchini | fehlt | Zucchini als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `r-zuckerschoten.webp` | Zuckerschoten | fehlt | Zuckerschoten als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
2 | F Artikel | `v-asia-box.webp` | Asia-Box | fehlt | Asia-Box, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
2 | F Artikel | `v-burgerbox.webp` | Burgerbox | fehlt | Burgerbox, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
2 | F Artikel | `v-currywurstschale.webp` | Currywurstschale | fehlt | Currywurstschale, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
2 | F Artikel | `v-essstaebchen.webp` | Essstäbchen | fehlt | Essstäbchen, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
2 | F Artikel | `v-fingerfood-schale.webp` | Fingerfood-Schale | fehlt | Fingerfood-Schale, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
2 | F Artikel | `v-holzgabel.webp` | Holzgabel | fehlt | Holzgabel, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
2 | F Artikel | `v-papiertragetasche.webp` | Papiertragetasche | fehlt – zeigt bis dahin v-tragetasche | Papiertragetasche, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
2 | F Artikel | `v-pastabox.webp` | Pastabox | fehlt | Pastabox, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
2 | F Artikel | `v-pizzakarton-30-cm.webp` | Pizzakarton 30 cm | fehlt – zeigt bis dahin v-pizzakarton | Pizzakarton 30 cm, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
2 | F Artikel | `v-pizzakarton-40-cm.webp` | Pizzakarton 40 cm | fehlt – zeigt bis dahin v-pizzakarton | Pizzakarton 40 cm, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
2 | F Artikel | `v-pommesschale.webp` | Pommesschale | vorhanden | Pommesschale, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
2 | F Artikel | `v-serviette.webp` | Serviette | fehlt | Serviette, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
3 | B Bereich | `bereich-bar.webp` | Bar & Cocktails | vorhanden | Typische Auswahl des Bereichs „Bar & Cocktails“ als Stillleben, 3–5 Dinge, Draufsicht.
3 | B Bereich | `bereich-bier.webp` | Bier & Fassgetränke | fehlt | Typische Auswahl des Bereichs „Bier & Fassgetränke“ als Stillleben, 3–5 Dinge, Draufsicht.
3 | B Bereich | `bereich-eis.webp` | Eis & Desserts | vorhanden | Typische Auswahl des Bereichs „Eis & Desserts“ als Stillleben, 3–5 Dinge, Draufsicht.
3 | B Bereich | `bereich-fruehstueck.webp` | Frühstück & Backwaren | fehlt | Typische Auswahl des Bereichs „Frühstück & Backwaren“ als Stillleben, 3–5 Dinge, Draufsicht.
3 | B Bereich | `bereich-kaffee.webp` | Kaffee & Heißgetränke | fehlt | Typische Auswahl des Bereichs „Kaffee & Heißgetränke“ als Stillleben, 3–5 Dinge, Draufsicht.
3 | B Bereich | `bereich-kuchen.webp` | Kuchen & Konditorei | vorhanden | Typische Auswahl des Bereichs „Kuchen & Konditorei“ als Stillleben, 3–5 Dinge, Draufsicht.
3 | B Bereich | `bereich-suppe.webp` | Suppen & Eintöpfe | vorhanden | Typische Auswahl des Bereichs „Suppen & Eintöpfe“ als Stillleben, 3–5 Dinge, Draufsicht.
3 | E Gericht | `g-affogato.webp` | Affogato | fehlt – zeigt bis dahin g-eis | „Affogato“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Eismix Vanille, Espressobohnen, Dessertglas.
3 | E Gericht | `g-alkoholfreies-bier-0-33-l.webp` | Alkoholfreies Bier 0,33 l | fehlt – zeigt bis dahin g-bier | „Alkoholfreies Bier 0,33 l“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Pils alkoholfrei 0,33 l.
3 | E Gericht | `g-aperol-spritz.webp` | Aperol Spritz | vorhanden | „Aperol Spritz“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Aperol, Prosecco 0,75 l, Sodawasser, Orangen.
3 | E Gericht | `g-apfelkuchen-stueck.webp` | Apfelkuchen (Stück) | fehlt – zeigt bis dahin g-kuchen | „Apfelkuchen (Stück)“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Weizenmehl Typ 405, Butter, Zucker, Äpfel.
3 | E Gericht | `g-becher-erdbeere-mit-sahne.webp` | Becher Erdbeere mit Sahne | fehlt – zeigt bis dahin g-eis | „Becher Erdbeere mit Sahne“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Eismix Vanille, Erdbeeren, Sahne, Eislöffel.
3 | E Gericht | `g-belegtes-broetchen-schinken.webp` | Belegtes Brötchen Schinken | fehlt – zeigt bis dahin g-fruehstueck | „Belegtes Brötchen Schinken“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Brötchen, Kochschinken, Butter, Tomaten.
3 | E Gericht | `g-broetchen-mit-kaese.webp` | Brötchen mit Käse | fehlt – zeigt bis dahin g-fruehstueck | „Brötchen mit Käse“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Brötchen, Gouda, Butter.
3 | E Gericht | `g-cappuccino.webp` | Cappuccino | vorhanden | „Cappuccino“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Espressobohnen, Vollmilch, Coffee-to-go 0,3 l.
3 | E Gericht | `g-chai-latte.webp` | Chai Latte | fehlt – zeigt bis dahin g-kaffee | „Chai Latte“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Chai-Pulver, Vollmilch, Coffee-to-go 0,4 l.
3 | E Gericht | `g-croissant.webp` | Croissant | fehlt – zeigt bis dahin g-fruehstueck | „Croissant“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Croissantteigling TK.
3 | E Gericht | `g-cuba-libre.webp` | Cuba Libre | fehlt | „Cuba Libre“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Weißer Rum, Cola 0,2 l, Limetten.
3 | E Gericht | `g-eiskugel-im-becher.webp` | Eiskugel im Becher | fehlt – zeigt bis dahin g-eis | „Eiskugel im Becher“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Eismix Vanille, Eislöffel.
3 | E Gericht | `g-eiswaffel-2-kugeln.webp` | Eiswaffel 2 Kugeln | fehlt – zeigt bis dahin g-eis | „Eiswaffel 2 Kugeln“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Eismix Vanille, Eismix Schokolade, Eiswaffel.
3 | E Gericht | `g-espresso.webp` | Espresso | fehlt – zeigt bis dahin g-kaffee | „Espresso“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Espressobohnen.
3 | E Gericht | `g-filterkaffee.webp` | Filterkaffee | vorhanden | „Filterkaffee“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Filterkaffee gemahlen, Coffee-to-go 0,3 l, Filterpapier.
3 | E Gericht | `g-flat-white-mit-hafermilch.webp` | Flat White mit Hafermilch | fehlt – zeigt bis dahin g-kaffee | „Flat White mit Hafermilch“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Espressobohnen, Hafermilch, Coffee-to-go 0,3 l.
3 | E Gericht | `g-fruehstuecksteller-klein.webp` | Frühstücksteller klein | fehlt – zeigt bis dahin g-fruehstueck | „Frühstücksteller klein“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Brötchen, Gouda, Kochschinken, Marmeladenportion, Butterportion, Eier.
3 | E Gericht | `g-gin-tonic.webp` | Gin Tonic | vorhanden | „Gin Tonic“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Gin, Tonic Water 0,2 l, Limetten.
3 | E Gericht | `g-glas-rotwein-0-2-l.webp` | Glas Rotwein 0,2 l | fehlt | „Glas Rotwein 0,2 l“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Rotwein offen.
3 | E Gericht | `g-glas-weisswein-0-2-l.webp` | Glas Weißwein 0,2 l | fehlt | „Glas Weißwein 0,2 l“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Weißwein offen.
3 | E Gericht | `g-gulaschsuppe.webp` | Gulaschsuppe | fehlt – zeigt bis dahin g-suppe | „Gulaschsuppe“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Suppenfleisch Rind, Kartoffeln, Zwiebeln, Passierte Tomaten, Rinderbrühe Pulver.
3 | E Gericht | `g-heisse-schokolade.webp` | Heiße Schokolade | fehlt – zeigt bis dahin g-kaffee | „Heiße Schokolade“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Kakaopulver, Vollmilch, Coffee-to-go 0,4 l.
3 | E Gericht | `g-helles-0-5-l.webp` | Helles 0,5 l | fehlt – zeigt bis dahin g-bier | „Helles 0,5 l“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Helles vom Fass, Bierdeckel.
3 | E Gericht | `g-huehnersuppe.webp` | Hühnersuppe | fehlt – zeigt bis dahin g-suppe | „Hühnersuppe“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Hähnchenkarkasse, Suppennudeln, Möhren, Petersilie.
3 | E Gericht | `g-kaese-sahne-torte-stueck.webp` | Käse-Sahne-Torte (Stück) | fehlt – zeigt bis dahin g-kuchen | „Käse-Sahne-Torte (Stück)“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Quark, Sahne, Zucker, Löffelbiskuit.
3 | E Gericht | `g-kaesekuchen-stueck.webp` | Käsekuchen (Stück) | vorhanden | „Käsekuchen (Stück)“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Weizenmehl Typ 405, Butter, Zucker, Quark, Eier.
3 | E Gericht | `g-kartoffelsuppe.webp` | Kartoffelsuppe | fehlt – zeigt bis dahin g-suppe | „Kartoffelsuppe“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Kartoffeln, Lauch, Möhren, Speck, Gemüsebrühe Pulver.
3 | E Gericht | `g-kuerbiscremesuppe.webp` | Kürbiscremesuppe | fehlt – zeigt bis dahin g-suppe | „Kürbiscremesuppe“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Kürbis, Sahne, Zwiebeln, Gemüsebrühe Pulver.
3 | E Gericht | `g-latte-macchiato.webp` | Latte Macchiato | fehlt – zeigt bis dahin g-kaffee | „Latte Macchiato“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Espressobohnen, Vollmilch, Coffee-to-go 0,4 l.
3 | E Gericht | `g-laugenbrezel.webp` | Laugenbrezel | fehlt – zeigt bis dahin g-fruehstueck | „Laugenbrezel“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Laugenbrezel, Butter.
3 | E Gericht | `g-linsensuppe-mit-wuerstchen.webp` | Linsensuppe mit Würstchen | fehlt – zeigt bis dahin g-suppe | „Linsensuppe mit Würstchen“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Linsen, Wiener Würstchen, Möhren, Lauch, Rinderbrühe Pulver.
3 | E Gericht | `g-mass-helles-1-0-l.webp` | Maß Helles 1,0 l | fehlt – zeigt bis dahin g-bier | „Maß Helles 1,0 l“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Helles vom Fass, Bierdeckel.
3 | E Gericht | `g-mojito.webp` | Mojito | vorhanden | „Mojito“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Weißer Rum, Limetten, Minze, Zuckersirup, Sodawasser, Trinkhalm.
3 | E Gericht | `g-muesli-mit-joghurt.webp` | Müsli mit Joghurt | fehlt – zeigt bis dahin g-fruehstueck | „Müsli mit Joghurt“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Müsli, Joghurt natur, Bananen.
3 | E Gericht | `g-muffin.webp` | Muffin | vorhanden | „Muffin“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Weizenmehl Typ 405, Zucker, Butter, Eier.
3 | E Gericht | `g-muffin-sorte-offen.webp` | Muffin (Sorte offen) | vorhanden | „Muffin (Sorte offen)“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Muffin (Sorte offen).
3 | E Gericht | `g-pils-0-3-l.webp` | Pils 0,3 l | fehlt – zeigt bis dahin g-bier | „Pils 0,3 l“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Pils vom Fass, Bierdeckel.
3 | E Gericht | `g-pils-0-5-l.webp` | Pils 0,5 l | fehlt – zeigt bis dahin g-bier | „Pils 0,5 l“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Pils vom Fass, Bierdeckel.
3 | E Gericht | `g-prosecco-0-1-l.webp` | Prosecco 0,1 l | fehlt | „Prosecco 0,1 l“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Prosecco 0,75 l.
3 | E Gericht | `g-radler-0-5-l.webp` | Radler 0,5 l | fehlt – zeigt bis dahin g-bier | „Radler 0,5 l“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Radler 0,5 l.
3 | E Gericht | `g-ruehrei-mit-speck.webp` | Rührei mit Speck | fehlt – zeigt bis dahin g-fruehstueck | „Rührei mit Speck“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Eier, Frühstücksspeck, Butter, Brötchen.
3 | E Gericht | `g-schokoladenkuchen-stueck.webp` | Schokoladenkuchen (Stück) | vorhanden | „Schokoladenkuchen (Stück)“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Weizenmehl Typ 405, Butter, Zucker, Kuvertüre zartbitter, Eier.
3 | E Gericht | `g-spaghettieis.webp` | Spaghettieis | fehlt – zeigt bis dahin g-eis | „Spaghettieis“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Eismix Vanille, Sahne, Fruchtpüree Erdbeere, Waffelbruch.
3 | E Gericht | `g-tee.webp` | Tee | vorhanden | „Tee“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Schwarztee, Coffee-to-go 0,3 l.
3 | E Gericht | `g-tiramisu-portion.webp` | Tiramisu (Portion) | vorhanden | „Tiramisu (Portion)“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Mascarpone, Löffelbiskuit, Zucker, Espressobohnen, Dessertglas.
3 | E Gericht | `g-tomatensuppe.webp` | Tomatensuppe | vorhanden | „Tomatensuppe“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Passierte Tomaten, Sahne, Zwiebeln, Gemüsebrühe Pulver.
3 | E Gericht | `g-waffel-mit-eis.webp` | Waffel mit Eis | fehlt – zeigt bis dahin g-eis | „Waffel mit Eis“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Waffelteig, Eismix Vanille, Schokosauce, Dessertglas.
3 | E Gericht | `g-weizen-0-5-l.webp` | Weizen 0,5 l | fehlt – zeigt bis dahin g-bier | „Weizen 0,5 l“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Weizenbier 0,5 l, Zitronen.
3 | E Gericht | `g-whisky-sour.webp` | Whisky Sour | fehlt | „Whisky Sour“, eine Portion fertig serviert, so wie ein Imbiss es über die Theke gibt. Sichtbar: Whisky, Zitronen, Zuckersirup.
3 | F Artikel | `d-ananassaft.webp` | Ananassaft | fehlt – zeigt bis dahin d-saft | Ananassaft als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-aperol.webp` | Aperol | fehlt | Aperol als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-apfelwein.webp` | Apfelwein | fehlt – zeigt bis dahin g-getraenk | Apfelwein als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-bitter-lemon-0-2-l.webp` | Bitter Lemon 0,2 l | fehlt – zeigt bis dahin g-getraenk | Bitter Lemon 0,2 l als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-bockbier.webp` | Bockbier | fehlt – zeigt bis dahin g-getraenk | Bockbier als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-brauner-rum.webp` | Brauner Rum | fehlt | Brauner Rum als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-campari.webp` | Campari | fehlt | Campari als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-chai-pulver.webp` | Chai-Pulver | fehlt – zeigt bis dahin g-getraenk | Chai-Pulver als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-cola-0-2-l.webp` | Cola 0,2 l | fehlt – zeigt bis dahin d-cola | Cola 0,2 l als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-espressobohnen.webp` | Espressobohnen | fehlt – zeigt bis dahin g-getraenk | Espressobohnen als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-fanta-0-33-l.webp` | Fanta 0,33 l | fehlt – zeigt bis dahin d-cola | Fanta 0,33 l als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-fassbrause.webp` | Fassbrause | fehlt – zeigt bis dahin g-getraenk | Fassbrause als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-filterkaffee-gemahlen.webp` | Filterkaffee gemahlen | fehlt – zeigt bis dahin g-getraenk | Filterkaffee gemahlen als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-gin.webp` | Gin | fehlt | Gin als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-ginger-ale-0-2-l.webp` | Ginger Ale 0,2 l | fehlt – zeigt bis dahin g-getraenk | Ginger Ale 0,2 l als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-gruentee.webp` | Grüntee | fehlt – zeigt bis dahin g-getraenk | Grüntee als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-guinness-vom-fass.webp` | Guinness vom Fass | fehlt – zeigt bis dahin g-getraenk | Guinness vom Fass als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-helles-vom-fass.webp` | Helles vom Fass | fehlt – zeigt bis dahin g-getraenk | Helles vom Fass als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-kakaopulver.webp` | Kakaopulver | fehlt – zeigt bis dahin g-getraenk | Kakaopulver als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-koelsch-vom-fass.webp` | Kölsch vom Fass | fehlt – zeigt bis dahin g-getraenk | Kölsch vom Fass als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-korn.webp` | Korn | fehlt | Korn als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-kraeuterlikoer.webp` | Kräuterlikör | fehlt – zeigt bis dahin r-petersilie | Kräuterlikör als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-kraeutertee.webp` | Kräutertee | fehlt – zeigt bis dahin g-getraenk | Kräutertee als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-maracujasaft.webp` | Maracujasaft | fehlt – zeigt bis dahin d-saft | Maracujasaft als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-matcha.webp` | Matcha | fehlt – zeigt bis dahin g-getraenk | Matcha als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-mineralwasser-0-25-l.webp` | Mineralwasser 0,25 l | fehlt – zeigt bis dahin d-wasser | Mineralwasser 0,25 l als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-obstler.webp` | Obstler | fehlt | Obstler als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-orangensaft.webp` | Orangensaft | fehlt – zeigt bis dahin d-limo | Orangensaft als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-pils-alkoholfrei-0-33-l.webp` | Pils alkoholfrei 0,33 l | fehlt – zeigt bis dahin g-getraenk | Pils alkoholfrei 0,33 l als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-pils-vom-fass.webp` | Pils vom Fass | fehlt – zeigt bis dahin g-getraenk | Pils vom Fass als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-prosecco-0-75-l.webp` | Prosecco 0,75 l | fehlt | Prosecco 0,75 l als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-radler-0-5-l.webp` | Radler 0,5 l | fehlt – zeigt bis dahin g-getraenk | Radler 0,5 l als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-rotwein-offen.webp` | Rotwein offen | fehlt | Rotwein offen als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-schwarztee.webp` | Schwarztee | fehlt – zeigt bis dahin g-getraenk | Schwarztee als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-sekt-0-75-l.webp` | Sekt 0,75 l | fehlt | Sekt 0,75 l als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-sodawasser.webp` | Sodawasser | fehlt – zeigt bis dahin d-wasser | Sodawasser als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-spezi-0-33-l.webp` | Spezi 0,33 l | fehlt – zeigt bis dahin g-getraenk | Spezi 0,33 l als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-tequila.webp` | Tequila | fehlt | Tequila als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-tonic-water-0-2-l.webp` | Tonic Water 0,2 l | fehlt – zeigt bis dahin g-getraenk | Tonic Water 0,2 l als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-weisser-rum.webp` | Weißer Rum | fehlt | Weißer Rum als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-weisswein-offen.webp` | Weißwein offen | fehlt | Weißwein offen als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-weizen-alkoholfrei-0-5-l.webp` | Weizen alkoholfrei 0,5 l | fehlt – zeigt bis dahin g-getraenk | Weizen alkoholfrei 0,5 l als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-weizenbier-0-5-l.webp` | Weizenbier 0,5 l | fehlt – zeigt bis dahin g-getraenk | Weizenbier 0,5 l als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-whisky.webp` | Whisky | fehlt | Whisky als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `d-wodka.webp` | Wodka | fehlt | Wodka als neutrales Gebinde (Dose/Flasche/Glas), ohne Marke und ohne Schrift.
3 | F Artikel | `r-aepfel.webp` | Äpfel | fehlt | Äpfel als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-amarenakirschen.webp` | Amarenakirschen | fehlt | Amarenakirschen als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-backpulver.webp` | Backpulver | fehlt – zeigt bis dahin r-gewuerz | Backpulver als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-baguette.webp` | Baguette | vorhanden | Baguette als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-bauernbrot.webp` | Bauernbrot | fehlt – zeigt bis dahin r-fladenbrot | Bauernbrot als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-bergkaese.webp` | Bergkäse | fehlt – zeigt bis dahin r-pizzakaese | Bergkäse als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-blaetterteig.webp` | Blätterteig | fehlt – zeigt bis dahin r-mehl | Blätterteig als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-broetchenteigling-tk.webp` | Brötchenteigling TK | fehlt – zeigt bis dahin r-buns | Brötchenteigling TK als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-bunte-streusel.webp` | Bunte Streusel | fehlt | Bunte Streusel als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-butter.webp` | Butter | fehlt | Butter als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-creme-fraiche.webp` | Crème fraîche | fehlt – zeigt bis dahin r-joghurt | Crème fraîche als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-croissantteigling-tk.webp` | Croissantteigling TK | fehlt – zeigt bis dahin r-mehl | Croissantteigling TK als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-dinkelmehl.webp` | Dinkelmehl | fehlt – zeigt bis dahin r-mehl | Dinkelmehl als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-eier.webp` | Eier | vorhanden | Eier als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-eismix-schokolade.webp` | Eismix Schokolade | fehlt | Eismix Schokolade als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-eismix-vanille.webp` | Eismix Vanille | fehlt | Eismix Vanille als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-eiswaffel.webp` | Eiswaffel | fehlt | Eiswaffel als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-erbsen-tk.webp` | Erbsen TK | fehlt | Erbsen TK als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-frischkaese.webp` | Frischkäse | fehlt – zeigt bis dahin r-pizzakaese | Frischkäse als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-fruchtpueree-erdbeere.webp` | Fruchtpüree Erdbeere | fehlt | Fruchtpüree Erdbeere als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-fruchtpueree-mango.webp` | Fruchtpüree Mango | fehlt | Fruchtpüree Mango als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-fruehstuecksspeck.webp` | Frühstücksspeck | fehlt | Frühstücksspeck als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-gemuesebruehe-pulver.webp` | Gemüsebrühe Pulver | fehlt – zeigt bis dahin r-gewuerz | Gemüsebrühe Pulver als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-gouda.webp` | Gouda | fehlt – zeigt bis dahin r-pizzakaese | Gouda als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-grenadine.webp` | Grenadine | fehlt | Grenadine als Rohware, Flasche oder Kanister; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-haehnchenkarkasse.webp` | Hähnchenkarkasse | fehlt – zeigt bis dahin r-haehnchen | Hähnchenkarkasse als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-hafermilch.webp` | Hafermilch | fehlt | Hafermilch als Rohware, Flasche oder Kanister; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-heidelbeeren.webp` | Heidelbeeren | fehlt | Heidelbeeren als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-honig.webp` | Honig | fehlt | Honig als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-joghurt.webp` | Joghurt | vorhanden | Joghurt als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-joghurt-natur.webp` | Joghurt natur | fehlt – zeigt bis dahin r-joghurt | Joghurt natur als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-karamellsauce.webp` | Karamellsauce | fehlt – zeigt bis dahin r-ketchup-mayo | Karamellsauce als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-kartoffeln.webp` | Kartoffeln | fehlt – zeigt bis dahin r-pommes-tk | Kartoffeln als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-knollensellerie.webp` | Knollensellerie | fehlt | Knollensellerie als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-kuerbis.webp` | Kürbis | fehlt | Kürbis als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-kuvertuere-vollmilch.webp` | Kuvertüre Vollmilch | fehlt | Kuvertüre Vollmilch als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-kuvertuere-zartbitter.webp` | Kuvertüre zartbitter | fehlt | Kuvertüre zartbitter als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-lauch.webp` | Lauch | fehlt | Lauch als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-laugenbrezel.webp` | Laugenbrezel | fehlt | Laugenbrezel als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-leberwurst.webp` | Leberwurst | fehlt – zeigt bis dahin r-wurst | Leberwurst als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-limetten.webp` | Limetten | fehlt – zeigt bis dahin r-zitrone | Limetten als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-linsen.webp` | Linsen | fehlt | Linsen als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-loeffelbiskuit.webp` | Löffelbiskuit | fehlt | Löffelbiskuit als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-lorbeerblaetter.webp` | Lorbeerblätter | fehlt | Lorbeerblätter als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-mandelmehl.webp` | Mandelmehl | fehlt – zeigt bis dahin r-mehl | Mandelmehl als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-mandelmilch.webp` | Mandelmilch | fehlt | Mandelmilch als Rohware, Flasche oder Kanister; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-mandeln-gehobelt.webp` | Mandeln gehobelt | fehlt | Mandeln gehobelt als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-marmelade.webp` | Marmelade | fehlt | Marmelade als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-marzipanrohmasse.webp` | Marzipanrohmasse | fehlt | Marzipanrohmasse als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-mascarpone.webp` | Mascarpone | fehlt | Mascarpone als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-minze.webp` | Minze | fehlt – zeigt bis dahin r-petersilie | Minze als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-muerbeteig.webp` | Mürbeteig | fehlt – zeigt bis dahin r-mehl | Mürbeteig als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-muesli.webp` | Müsli | fehlt | Müsli als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-muskatnuss.webp` | Muskatnuss | fehlt | Muskatnuss als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-nuesse-gehackt.webp` | Nüsse gehackt | fehlt – zeigt bis dahin r-hack | Nüsse gehackt als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-nuss-nougat-creme.webp` | Nuss-Nougat-Creme | fehlt – zeigt bis dahin r-joghurt | Nuss-Nougat-Creme als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-orangen.webp` | Orangen | fehlt | Orangen als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-passierte-tomaten.webp` | Passierte Tomaten | fehlt – zeigt bis dahin r-tomate | Passierte Tomaten als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-pfeffer-schwarz.webp` | Pfeffer schwarz | fehlt – zeigt bis dahin r-gewuerz | Pfeffer schwarz als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-puderzucker.webp` | Puderzucker | fehlt | Puderzucker als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-quark.webp` | Quark | fehlt – zeigt bis dahin r-joghurt | Quark als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-rinderbruehe-pulver.webp` | Rinderbrühe Pulver | fehlt – zeigt bis dahin r-gewuerz | Rinderbrühe Pulver als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-sahne.webp` | Sahne | fehlt – zeigt bis dahin r-joghurt | Sahne als Rohware, Flasche oder Kanister; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-sahnesteif.webp` | Sahnesteif | fehlt – zeigt bis dahin r-joghurt | Sahnesteif als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-sauerkirschen-glas.webp` | Sauerkirschen (Glas) | fehlt | Sauerkirschen (Glas) als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-schokosauce.webp` | Schokosauce | fehlt – zeigt bis dahin r-ketchup-mayo | Schokosauce als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-schokostreusel.webp` | Schokostreusel | fehlt | Schokostreusel als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-sirup-karamell.webp` | Sirup Karamell | fehlt | Sirup Karamell als Rohware, Flasche oder Kanister; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-sirup-vanille.webp` | Sirup Vanille | fehlt | Sirup Vanille als Rohware, Flasche oder Kanister; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-sojamilch.webp` | Sojamilch | fehlt | Sojamilch als Rohware, Flasche oder Kanister; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-speck.webp` | Speck | fehlt | Speck als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-suppenfleisch-rind.webp` | Suppenfleisch Rind | fehlt – zeigt bis dahin r-doenerspiess | Suppenfleisch Rind als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-suppennudeln.webp` | Suppennudeln | fehlt – zeigt bis dahin r-nudeln | Suppennudeln als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-toastbrot.webp` | Toastbrot | fehlt – zeigt bis dahin r-fladenbrot | Toastbrot als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-vanillezucker.webp` | Vanillezucker | fehlt | Vanillezucker als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-vollmilch.webp` | Vollmilch | fehlt | Vollmilch als Rohware, Flasche oder Kanister; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-waffelbecher.webp` | Waffelbecher | fehlt | Waffelbecher als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-waffelbruch.webp` | Waffelbruch | fehlt | Waffelbruch als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-waffelteig.webp` | Waffelteig | fehlt – zeigt bis dahin r-mehl | Waffelteig als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-weisse-bohnen.webp` | Weiße Bohnen | fehlt | Weiße Bohnen als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-weizenmehl-typ-405.webp` | Weizenmehl Typ 405 | fehlt – zeigt bis dahin r-mehl | Weizenmehl Typ 405 als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-weizenmehl-typ-550.webp` | Weizenmehl Typ 550 | fehlt – zeigt bis dahin r-mehl | Weizenmehl Typ 550 als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-wiener-wuerstchen.webp` | Wiener Würstchen | fehlt – zeigt bis dahin r-wurst | Wiener Würstchen als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-zimt.webp` | Zimt | fehlt – zeigt bis dahin r-gewuerz | Zimt als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-zitronen.webp` | Zitronen | fehlt – zeigt bis dahin r-zitrone | Zitronen als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-zucker.webp` | Zucker | fehlt | Zucker als Rohware, lose Ware, eine Handvoll bzw. Portion; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-zuckerportion.webp` | Zuckerportion | fehlt | Zuckerportion als Rohware, ein einzelnes Stück; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `r-zuckersirup.webp` | Zuckersirup | fehlt | Zuckersirup als Rohware, Flasche oder Kanister; so, wie es beim Großhändler oder in der Küche aussieht.
3 | F Artikel | `v-becherdeckel.webp` | Becherdeckel | fehlt – zeigt bis dahin v-becher | Becherdeckel, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
3 | F Artikel | `v-bierdeckel.webp` | Bierdeckel | fehlt | Bierdeckel, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
3 | F Artikel | `v-butterportion.webp` | Butterportion | fehlt | Butterportion, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
3 | F Artikel | `v-co2-flasche.webp` | CO2-Flasche | fehlt | CO2-Flasche, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
3 | F Artikel | `v-cocktailspiess.webp` | Cocktailspieß | fehlt | Cocktailspieß, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
3 | F Artikel | `v-coffee-to-go-0-3-l.webp` | Coffee-to-go 0,3 l | fehlt | Coffee-to-go 0,3 l, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
3 | F Artikel | `v-coffee-to-go-0-4-l.webp` | Coffee-to-go 0,4 l | fehlt | Coffee-to-go 0,4 l, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
3 | F Artikel | `v-dessertglas.webp` | Dessertglas | fehlt | Dessertglas, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
3 | F Artikel | `v-einwegbecher-0-5-l.webp` | Einwegbecher 0,5 l | fehlt – zeigt bis dahin v-becher | Einwegbecher 0,5 l, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
3 | F Artikel | `v-eisbecher.webp` | Eisbecher | fehlt – zeigt bis dahin v-becher | Eisbecher, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
3 | F Artikel | `v-eisloeffel.webp` | Eislöffel | fehlt | Eislöffel, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
3 | F Artikel | `v-filterpapier.webp` | Filterpapier | fehlt | Filterpapier, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
3 | F Artikel | `v-kuchenbox.webp` | Kuchenbox | fehlt | Kuchenbox, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
3 | F Artikel | `v-marmeladenportion.webp` | Marmeladenportion | fehlt | Marmeladenportion, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
3 | F Artikel | `v-pappmanschette.webp` | Pappmanschette | fehlt | Pappmanschette, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
3 | F Artikel | `v-pfandbecher-0-5-l.webp` | Pfandbecher 0,5 l | fehlt – zeigt bis dahin v-becher | Pfandbecher 0,5 l, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
3 | F Artikel | `v-reiniger-zapfanlage.webp` | Reiniger Zapfanlage | fehlt | Reiniger Zapfanlage, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
3 | F Artikel | `v-reinigungstabs-maschine.webp` | Reinigungstabs Maschine | fehlt | Reinigungstabs Maschine, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
3 | F Artikel | `v-ruehrstaebchen.webp` | Rührstäbchen | fehlt | Rührstäbchen, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
3 | F Artikel | `v-suppenbecher-0-4-l.webp` | Suppenbecher 0,4 l | fehlt – zeigt bis dahin v-becher | Suppenbecher 0,4 l, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
3 | F Artikel | `v-tortenkarton.webp` | Tortenkarton | fehlt – zeigt bis dahin v-pizzakarton | Tortenkarton, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
3 | F Artikel | `v-tortenspitze.webp` | Tortenspitze | fehlt | Tortenspitze, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
3 | F Artikel | `v-trinkhalm.webp` | Trinkhalm | fehlt | Trinkhalm, leer, ein Stück bzw. kleiner Stapel, ohne Aufdruck.
