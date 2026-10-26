# FÜR ZORO: SmashIt-Referenzen und fotografischer Produktbereich

Stand: 26.10.2026. Auftrag des Kapitäns: Piktogrammrichtungen A/B verwerfen, fotografische Produktdarstellung nach SmashIt Heidelberg, zuordenbare Referenzen sichern, Produkte/Zutaten ergänzen, Änderungen und Restarbeit vollständig übergeben.

## Ergebnis

- Eigener Prüfbranch `sanji/2026-10-26-produktfotos` auf `work/facelift-integration-2026-10-22`, Ausgangsstand `b040c25`. Kein Merge nach main und kein Deployment.
- 38 eindeutige Menüeinträge und 35 Bilddateien gesichert: acht echte Website-Galeriebilder und 27 Menübilder. Zu jeder dieser 35 Bilddateien gibt es einen eigenen Browser-Screenshot; zusätzlich Website- und Menüübersicht.
- Website und Liefermenü wurden über dasselbe Unternehmen im Impressum und dieselbe Betriebsanschrift zugeordnet. Keine Zuordnung zu einem ähnlich benannten anderen Burgerladen. Ein eigener Instagram-Account wurde nicht zuverlässig verifiziert und deshalb nicht als Quelle ausgegeben.
- 30 zusätzliche Gericht-/Beilagen-/Dip-/Smoothie-Vorlagen, insgesamt 150 Vorlagen im Prüfstand. 26 tatsächlich neue Einkaufsartikel; sechs weitere Menüartikel verwenden bereits vorhandene Katalognamen. Der Katalog enthält jetzt 461 eindeutige Artikel.
- 41 neue lokale WebP-Motive: 29 Gerichtmotive und zwölf Zutatenmotive. Die neue Pommes-Vorlage nutzt das bereits vorhandene passende Pommesfoto. Alle neuen Menüvorlagen und alle zugehörigen Zutaten haben eine lokale Fotozuordnung.
- Acht schon vorhandene passende Artikelbilder aktiviert. Rinderspeck und Rinderhack zeigen nicht mehr fälschlich den Dönerspieß; neue Burgervarianten werden vor pauschalen Cheeseburger-/Smash-Regeln zugeordnet. Eigene Fotos des Wirts behalten Vorrang.
- DE/TR/EN für neue Artikel- und Vorlagennamen sowie den Rezept-Hinweis. Türkische und englische Suchbegriffe ergänzt. Gespeicherte Namen und Exporte bleiben Deutsch. Die übrigen 15 Sprachen verwenden beim neuen Hinweis vorläufig Englisch und bleiben als Übersetzung offen.
- Schreibweise vereinheitlicht: Ananas, Pfirsich, Chili, Acai-Püree, Käsesauce und Knoblauch-Mayonnaise. Originalbezeichnungen und Originaltexte bleiben in der Quellenliste erhalten.

## Wichtige Unterscheidung bei den Bildern

Die unveränderten Originale liegen unter `originale/`, die Browseraufnahmen unter `screenshots/`. Diese Originale wurden nicht durch Retuschen überschrieben und nicht in den öffentlichen App-Bildordner kopiert.

Viele Wolt-Motive tragen ausdrücklich den Aufdruck „Beispielfoto“. Sie beweisen weder das tatsächliche Aussehen eines SmashIt-Gerichts noch die genaue Zutatenmenge. Die acht Website-Galeriebilder sind die vom Kapitän bestätigte authentische Bildrichtung.

**Die 41 neuen App-Motive sind KI-bearbeitete beziehungsweise KI-erzeugte fotografische Visualisierungen. Sie sind keine unveränderten Originalfotos des Betriebs.** Perspektive, Ausschnitt, Licht und Hintergrund wurden an die vorhandenen App-Bilder angepasst. Es wurde kein fotografischer Nachweis für ein nicht fotografiertes Gericht erfunden. `bildherkunft.json` nennt für jedes neue Motiv Pfad, Größe, SHA-256 und Erzeugungsart. Es enthält keine Freigabe als unverändertes Betriebsfoto.

Ausgabe: WebP, 520 × 390 px, 4:3, Qualität 75, lokale Dateien. Kein CDN, kein Online-Bildabruf in der App, keine Markenlogos und keine Personen in den neuen Motiven. Kleine Motive bleiben bewusst kleiner als 25 KB, statt Dateien künstlich aufzublähen. Originale und neue Motive sind im Paket getrennt prüfbar.

## Daten und Mengen: was belegt ist

Quelle: öffentliche Menübeschreibung. Sie belegt Zutatenbezeichnungen, explizite Portions-Stückzahlen und die Smoothie-Verkaufsgröße 0,4 l. Sie veröffentlicht keine vollständigen Grammrezepte, Einkaufspreise, Zubereitungszeiten oder Gewichte der Smash-Patties.

- Fehlende Mengen sind `null`, niemals 0 und niemals ein vermeintlich gemessener Branchenwert.
- Neuer Artikel „Smash-Patty (Gewicht offen)“ statt einer erfundenen 150-g-Festlegung. Anzahl und Gewicht bleiben offen, wo sie die Quelle nicht nennt.
- Rinderspeck bleibt Rinderspeck. Keine Umdeutung zu Schweine-Bacon.
- Nashville hat Chicken Tenders, Krautsalat, Burgersauce und Bun; keine still übernommenen Rindfleisch-/Zwiebelzutaten. Die restliche Zusammensetzung ist noch am echten Rezept zu bestätigen.
- „Frischer Salat“ wird nicht als sicherer Eisbergsalat ausgegeben. Neuer neutraler Artikel „Blattsalat (Sorte offen)“.
- Vier nur knapp benannte Special-Fries-Varianten bleiben vorläufig als fertige Komponenten mit offener Menge erhalten. Es wird keine geheime Sauce aus einem Foto abgeleitet.
- Muffin-Sorte und Füllung bleiben offen; das Bild ist ein Sortenbeispiel, keine Rezeptangabe.
- Sämtliche Verkaufs- und Einkaufspreise im Betrieb bleiben ungesetzt. Öffentliche Kartenpreise sind ausschließlich in `quellen/produkte_38.csv` dokumentiert.
- Zeiten bleiben `null`; der Rezept-Editor zeigt dafür „–“ und fordert zur Prüfung von Mengen, Zeit und vollständigem Rezept auf.

**Prüfpunkt für Zoro:** Der bestehende Kern behandelt eine fehlende Zubereitungszeit rechnerisch wie keine zusätzliche Zeit. Daran wurde nichts geändert. Vor Freigabe als fertig kalkuliertes Rezept muss die Zubereitungszeit geprüft werden. Dies gilt besonders für zugekaufte Artikel mit belegter Stückzahl, sobald der Wirt Einkaufspreise ergänzt. Die Oberfläche weist auf diese offenen Angaben hin; eine neue fachliche Sperrregel wurde nicht erfunden.

## Was in der App geändert wurde

| Bereich | Datei | Zweck |
|---|---|---|
| Quellgestützte Ergänzung | `js/data/burger_ergaenzung.js` | 30 Vorlagen, Artikel, Herkunft, präzise Bildaliasse |
| Katalog | `js/data/katalog.js` | Vorlagen und neue Artikel an bestehende Strukturen anbinden |
| Datenregister | `js/data/register.js` | Quelle, Datum, Laden-Art und offener Mengenstatus |
| Fotoauswahl | `js/bilder.js`, `js/data/fotos.js` | Exakte neue Motive, Vorrang eigener Fotos bleibt |
| Sprache/Suche | `js/data/artikelnamen.js`, `js/data/suchnamen.js`, `js/lang/*.js` | Artikel- und Gerichtübersetzungen getrennt, DE/TR/EN, Rückfall der 15 weiteren Sprachen |
| Rezept-Editor | `js/screens/karte.js` | Übersetzte Vorlagenbezeichnung und ehrliche Leeranzeige/Hinweis |
| Bilder | `foto/*.webp` | 41 neue Motive; Herkunft unter `design-handoffs/sanji/fotos-2026-10-26/` |
| Inventar/Prüfung | `tools/menue_bildstand.mjs`, `tests/burger_ergaenzung.test.mjs`, `tests/menue_fotos_browser.py` | Vollständigkeit, richtige Motive, Offline, keine falschen Grammwerte |
| Teststabilität | `tests/speicher.test.mjs` | Zwei bereits im Ausgangsstand scheiternde Zeitannahmen durch Warten auf tatsächlichen Abschluss ersetzt; fachliche Assertions bleiben erhalten |
| Offline | `sw.js`, `js/fassung.js` | Ausschließlich über `python3 tools/sw_liste.py` erzeugt |

Keine Änderung an `engine.js`, `store.js`, Nutzen-/Hinweis-Rechenwerk, Steuerregeln, Architektur oder Login. Keine 70/30-Menüregel. Neue Produkte werden bestehenden Betrieben nicht ungefragt in ihre persönliche Karte geschrieben; sie stehen als wählbare Vorlagen bereit.

## Echte Prüfung und Prüfnachweise

Die ausführlichen Laufprotokolle liegen unter `pruefung/`. Der finale Ergebnisstand wird zusätzlich in `PRUEFUNGEN.md` festgehalten. Keine Einzelprüfung wird als komplette Abnahme ausgegeben.

- Alle 276 lokalen WebP-Dateien wurden vollständig dekodiert. Ein beim Export leer gebliebenes Pfirsichbild wurde neu und atomar geschrieben; der Offline-Katalog wurde danach neu erzeugt.
- Neue Menüprüfung: 30 Gerichte sowie Zutatenbilder in DE/TR/EN bei 390×844 und 360×780, nach Offline-Neustart; identische Bildzuordnungen, dekodierbare Dateien und keine erfundenen Gewinnwerte ohne Preise.
- Bestehender Work-Pilotdurchlauf: Döner/Burger × DE/TR/EN × 390/360, zusätzlich Nutzenzustände.
- Mobile Regelprüfung 390/360 und strukturelle Sprachprüfung.
- Node-Prüfungen UTC/Berlin, finale Zahlen siehe `PRUEFUNGEN.md`.

Die zwei Speichertests scheiterten auch unverändert im separaten Ausgangsstand. Ursache ihrer unzuverlässigen Abnahme: Die erste Leerlaufprüfung wurde nach pauschal 50 ms als fertig angenommen; außerdem wurden Schreibvorgänge nach pauschal 1,4 beziehungsweise 4,5 Sekunden erwartet. Auf diesem langsameren Rechner waren die Arbeitspakete zu diesem Zeitpunkt noch nicht abgeschlossen. Der Test wartet nun auf den tatsächlichen Abschluss der ersten Prüfung und auf den erwarteten Monatsschreibvorgang. Inhaltliche Speicher-Assertions wurden nicht entfernt und `store.js` bleibt bytegleich zum Sockel.

## Noch offen und nächster Auftrag

1. **Echte Grammrezepte:** Pattygewicht/-anzahl, Käse, Saucen, Gemüse, Pommesportionen, Smoothie-Mischungsverhältnisse, Arbeitsschritte und Zeiten vom Betrieb bestätigen und als eigene Werte eintragen. Aus Bildern keine Grammwerte ableiten.
2. **Drei Wahlmenüs:** 2 Single Burger + Pommes + Dip; 2 Double Burger + Pommes + Dip; 1 Double Burger + Pommes + Dip. Sie stehen in der Quellenliste, aber nicht als frei erfundene Zutatenrezepte im Standardkatalog. Zoro muss die Auswahl über den vorhandenen Menü-/Kombivertrag anbinden.
3. **Fünf Markengetränke:** in der Quellenliste erfasst. Die vorhandene markenneutrale Getränkearchitektur bleibt bestehen; keine Markenlogos aus Quellenbildern in die App kopieren.
4. **Authentische zusätzliche Betriebsfotos:** Für im Liefermenü nicht bebilderte Varianten und für vollständig originalgetreue Winkel sind echte zusätzliche Aufnahmen nötig. Aktuelle App-Motive bleiben als Visualisierung dokumentiert.
5. **Übrige 15 Sprachen:** den neuen Rezept-Hinweis fachlich übersetzen; englischer Rückfall ist kenntlich gemacht.
6. **Appweiter Rest:** `noch_ohne_foto_artikel.csv` und `noch_ohne_foto_gerichte.csv` nennen die verbleibenden reinen Piktogramme. `appweite_einzelmotiv_liste.csv` unterscheidet fehlende individuelle Motive von bereits funktionierenden Familienbildern. Diese Lieferung ist keine Behauptung, dass die gesamte App jetzt für jeden Artikel ein eigenes Originalfoto besitzt.
7. **Alte lokale Fotos:** 80 vorhandene Dateien sind weiterhin nicht im aktiven Fotoregister. Vor Aktivierung Motiv und richtige Zuordnung einzeln prüfen; alte falsche Döner-/Wrap-Zuordnungen nicht wieder einschalten.
8. **Separater Vorauftrag:** Product-Readiness bleibt im eigenen lokalen Branch `sanji/product-readiness-auf-sockel-2026-10-26` mit Übergabe `bruecke/an-zoro/2026-10-26_product_readiness.md`. Die dortige L3-Arbeit wurde nicht unbemerkt in diesen Bildauftrag gemischt.

## Dateien im Übergabepaket

- Diese Übergabe und `PRUEFUNGEN.md` zuerst lesen.
- `Sanji_2026-10-26_Produktbilder.html`: offline öffnende Einzelansicht, ein Produkt pro Ansicht, mit Zutaten und offenen Mengen.
- `app_dateien/`: fertig bearbeitete Dateien in den echten Repo-Pfaden; `aenderungen.patch` für die nachvollziehbare Änderung am Sockel.
- `originale/`, `screenshots/`, `quellen_manifest.json`: unveränderte Quellbilder, Browserbelege, URLs, Datum und SHA-256.
- `bildherkunft.json`: Erzeugungsart und SHA-256 jedes neuen App-Motivs.
- `appweiter_bildstand_*.csv`, `noch_ohne_foto_*.csv`, `appweite_einzelmotiv_liste.csv`: vollständige Rest- und Zuordnungslisten.
- `pruefung/`: tatsächliche App-Screenshots, Prüfprotokolle und Kontaktafeln.

## Quellen, gelesen am 26.10.2026

- https://smash-it-burgers.de/ – bestätigte Bildrichtung, acht Galerie-Motive.
- https://smash-it-burgers.de/impressum/ – Abgleich der Betriebsidentität; Kontaktdaten nicht als App-Inhalte übernommen.
- https://wolt.com/de/deu/heidelberg/restaurant/smash-it-burger-heidelberg – 38 Menüeinträge, Zutatenbeschreibungen, Portionsangaben, 27 ausdrücklich beispielhafte Menübilder.
- Zoros Work-Sockel `b040c25`, `docs/vertraege.md`, `bruecke/stand.md`, Bildauftrag 17.10. und bestehendes Datenregister – Struktur und Grenzen der Umsetzung.

## ÜBERGABE AN ZORO

Aufgabe: Fotografischer Burgerbereich nach SmashIt-Referenzen, ersetzt Piktogrammrichtungen A/B.

Ergebnis: 30 neue Vorlagen, 26 neue Einkaufsartikel, 41 neue lokale Bildmotive, Quellen-/Screenshot-Sammlung, Änderungen im Prüfbranch, Einzelbild-Vorschau und vollständige Restlisten.

Empfehlung: Die konsistente fotografische Richtung übernehmen. Originalreferenzen und KI-Visualisierungen weiter klar unterscheiden; Rezepte erst nach Bestätigung ihrer Mengen und Zeiten als fertig kalkuliert behandeln.

Offene Fragen: Echte Grammrezepte, vollständige Special-Fries-Zusammensetzung, Muffinsorte, Wahlmenü-Anbindung, zusätzliche authentische Betriebsaufnahmen und 15 Übersetzungen.

Hinweise für den Code: Keine eigenen Finanzformeln. Vorlagenwerte bewusst `null`, vorhandene Preise nicht überschreiben, eigene Fotos bevorzugen. Erst exakte Menüzuordnung, dann Familienbild. Neue Dateien offline gelistet; Prüfstand nicht mit Veröffentlichung verwechseln.

Quellen: Die vier oben genannten Primär-/Projektquellen; URLs, Datum und unveränderte Originaldateien liegen im Paket.
