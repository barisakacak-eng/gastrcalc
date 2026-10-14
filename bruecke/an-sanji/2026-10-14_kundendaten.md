# Auftrag: Kundendaten der Nische (Deep Research)
Status: erledigt (Teillieferung, von Zoro geprüft 14.10. 18:15 – siehe an-zoro/2026-10-14_kundendaten_pruefung.md) · von Zoro · 14.10.2026 · Ergebnis bis: heute Abend, spätestens 23:00

Lies zuerst `bruecke/LIESMICH.md` und `bruecke/stand.md`.

## Ziel
Datengrundlage über unsere späteren Kunden: Wie viele gibt es, wie sehen ihre Speisekarten aus, wo finden wir sie. Die Speisekarten-Muster trainieren unsere Kartenerkennung und unsere Rezeptvorlagen.

## Wer in unser Raster fällt (alle Punkte müssen passen)
- Inhabergeführter Einzelbetrieb oder kleine Gruppe mit höchstens 3 Filialen; der Chef steht selbst im Laden.
- 1–15 Mitarbeiter; Theke, Selbstabholung oder Lieferung; einfache Karte (meist 20–80 Gerichte).
- Typen: Dönerladen, Imbiss, Grill, Burger-Imbiss (keine Systemgastronomie), Pizza-Imbiss, Asia-Imbiss (Wok, Sushi-Imbiss, Vietnamesisch, Thai), Falafel und Levante, Balkan-Grill (Ćevapi, Burek), türkische Bäckerei und Börek-Laden, Balkan-Bäckerei, kleine türkische, kurdische oder arabische Restaurants mit Imbisscharakter, Foodtrucks, Kiosk mit warmer Küche, Lahmacun- und Pide-Salons.
- Ergänze weitere Typen, die dazugehören, mit je einem Satz Begründung.

## Wer NICHT hineinfällt (konsequent ausschließen)
- Ketten und Franchise mit eigenem System, zum Beispiel Mangal Döner (Lukas Podolski), Berliner Döner Kebap, Döner-Franchiseketten, McDonald’s, Burger King, Five Guys, Subway, Dean & David, Vapiano, Wok-Ketten, Backwerk, Kamps, Ditsch.
- Systemgastronomie, Kantinen, Hotels, Großrestaurants mit Service und mehr als 15 Mitarbeitern.
- Dönerspieß-Hersteller und Großhändler sind Lieferanten, keine Kunden: eigene kurze Liste mit `rolle=lieferant`.
- Jeder Betrieb mit Hinweis auf ein Kassen- oder Warenwirtschaftssystem einer Kette.

## Teil 1 – Zahlen (Deutschland, Österreich, Schweiz)
- Anzahl der Betriebe je Typ, Umsatzspannen, Mitarbeiterzahl, Gründungen und Schließungen pro Jahr.
- Quellen: Destatis (WZ 56.10.4 Imbissstuben, 56.10.1), Statistik Austria, BFS Schweiz, DEHOGA, IHK, ATDID, Branchenstudien, seriöse Presse.
- Jede Zahl mit Quelle (Link), Jahr und Vertrauensstufe (amtlich / Verband / Presse / Schätzung). Gibt es keine Zahl: „nicht gefunden“.

## Teil 2 – Betriebsliste (Probe Rhein-Neckar: Heidelberg, Mannheim, Rhein-Neckar-Kreis, Weinheim, Schwetzingen, Sinsheim)
- Ziel 100–200 Betriebe, die nachweislich ins Raster fallen.
- Je Betrieb nur öffentliche Geschäftsangaben: Name, Typ, Straße, PLZ, Ort, Website, Geschäftstelefon, Geschäfts-E-Mail (nur wenn auf der eigenen Website oder im Impressum), Quelle (Link), Abrufdatum, Raster-Begründung, Filialanzahl, Lieferplattform ja/nein, eigene Online-Speisekarte ja/nein (mit Link).
- Keine privaten Daten (keine Privatadressen, keine privaten Handynummern, keine Mitarbeiternamen, keine persönlichen Social-Media-Profile). Inhabername nur, wenn er im Impressum steht.
- Pflichtspalte `kontakt_hinweis` = „keine Kaltmail – Ansprache nur persönlich/Brief/nach Einwilligung“ (§ 7 UWG, DSGVO).

## Teil 3 – Speisekarten
- Für mindestens 30 Betriebe aus Teil 2, gemischt über die Typen: Karte von der EIGENEN Website oder als dort verlinktes PDF. Nicht von Lieferando, Wolt, Uber Eats oder Google Maps (deren Bedingungen verbieten das Abgreifen).
- Je Karte: Quelle, Datum und die Gerichte als Tabelle: betrieb_id; rubrik; nummer; name (1:1 wie auf der Karte); beschreibung; preis; groesse; allergene_angegeben.
- Je Typ eine Auswertung: die 30 häufigsten Gerichte mit Preisspanne (min, Median, max), typischer Kartenaufbau (Nummern? Punkte-Leiter? Zutaten in der Zeile darunter? Allergen-Hochzahlen? zwei Spalten? dunkler oder heller Hintergrund?).

## Teil 4 – Rezept-Grundlagen
- Für die 40 häufigsten Gerichte über alle Typen (zum Beispiel Döner, Dürüm, Lahmacun, Pide mit Käse, Pide mit Ei, Börek, Falafel-Teller, Ćevapi, Gebratene Nudeln, Pizza Margherita, Burger, Pommes, Maccaroni-Auflauf, Calzone/Seele) typische Zutaten mit üblicher Portionsmenge in g oder Stück.
- Jede Menge mit Quelle oder als „übliche Spanne, Schätzung“ gekennzeichnet.

## Lieferung
Dateien (CSV mit Semikolon, UTF-8):
1. `zahlen.csv` (thema; land; typ; wert; einheit; jahr; quelle_link; vertrauen)
2. `betriebe.csv`
3. `lieferanten.csv`
4. `karten_gerichte.csv`
5. `karten_auswertung.md`
6. `rezept_grundlagen.csv` (gericht; zutat; menge; einheit; quelle_oder_schaetzung)
7. `bericht.md`: höchstens 2 Seiten in einfacher Sprache, was gefunden wurde, was fehlt, wo du unsicher bist, wie man auf ganz Deutschland erweitern kann, welche Quellen am ergiebigsten waren. Am Ende deine Selbstprüfung: jede Zahl belegt, jede Kette ausgeschlossen, in jeder Zeile von betriebe.csv der kontakt_hinweis.

Ablage:
- **Öffentlich unbedenklich** (darf in `bruecke/an-zoro/2026-10-14_kundendaten/`): `zahlen.csv`, `karten_auswertung.md`, `rezept_grundlagen.csv`, `bericht.md`.
- **Nur privat** (`barisakacak-eng/gastrcalc-daten`, Ordner `kundendaten/2026-10-14/`, oder als ZIP an Baris): `betriebe.csv`, `lieferanten.csv`, `karten_gerichte.csv`.

Danach setz oben `Status: erledigt` und leg `bruecke/an-zoro/2026-10-14_kundendaten_ergebnis.md` mit 5 Zeilen Zusammenfassung an.

## Nachtrag 17:50 (Zoro) – Teil 4 bitte so liefern, damit die App die Werte direkt übernehmen kann
Spalten von `rezept_grundlagen.csv`:
`gericht; familie; zutat; zutat_app; menge; einheit; menge_min; menge_max; quelle_link; art`

- **familie:** eine von `doener, wrap, doener-teller, doener-box, doener-salat, lahmacun, pide, seele, pizza, nudeln, falafel, falafel-wrap, falafel-teller, salat, boerek, cevapi, burger, currywurst, asia-nudeln, asia-reis, pommes` (neue Familie erlaubt, dann kurz begründen).
- **zutat_app:** der passende Name aus unserer Artikelliste, wenn es ihn gibt. Sonst leer lassen, Zoro ordnet zu.
  Unsere Artikelnamen: Menüschale 1-teilig · Dönerspieß Kalb/Pute · Eisbergsalat · Tomaten · Zwiebeln · Weißkohl · Knoblauchsauce · Menüschale 3-teilig · Pommes frites · Pommesschale · Falafelbällchen · Salatgurke · Kräutersauce · Rotkohl · Joghurtdressing · Salatschale · Pide-Brot · Lammhackfleisch · Petersilie · Dönergewürz · Alufolie-Bogen · Pizzamehl Typ 00 · Frischhefe · Sonnenblumenöl · Pizzakarton 30 cm · Penne · Pizzatomaten (Dose) · Pizzakäse gerieben · Pastabox · Olivenöl · Dürüm-Wrap · Dönerbrot / Fladen · Dönertüte · Hähnchenspieß · Joghurtsauce · Yufka-Teigblatt · Hirtenkäse / Feta · Eier · Hackfleisch gemischt · Ajvar · Rinderpatty 150 g · Burger-Bun · Burgersauce · Burgerbox · Currywurst · Currysauce · Currypulver · Currywurstschale · Mie-Nudeln · Möhren · Sojasprossen · Frühlingszwiebeln · Sojasauce · Asia-Box · Jasminreis · Paprika · Putenbrustschinken · Truthahnsalami · Hähnchenbrust · Sucuk · Thunfisch (Dose) · Babyspinat · Champignons · Ananas (Dose) · Oliven · Mais aus der Dose · Peperoni eingelegt · Kichererbsen · Langkornreis · Sahnesauce
- **menge:** typische Portion, roh, je Gericht. Für **menge_min** und **menge_max** gilt die Spanne aus den Quellen.
- **art:** genau einer dieser Werte:
  - `beleg`: Fachbuch, Kalkulationshilfe des Großhandels, Hersteller-Portionsangabe
  - `branche`: mehrere Betriebe oder Branchenportal
  - `schaetzung`: keine Quelle
- **Wichtigste Gerichte zuerst** (sie entscheiden über den Wareneinsatz): Döner im Brot, Dürüm, Döner-Teller, Döner-Box, Lahmacun, Pide mit Käse, Falafel, Pommes. Dabei vor allem die Fleischmenge je Portion.
