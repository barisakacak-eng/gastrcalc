# Work Mission 2 – Produktreife und L3-Integration

Ausgangspunkt: PR #6, `5de3a476f98fd10f14b40537a67d5cf29c13a174`.
Erster L3-Arbeitsbranch: `work/product-readiness-2026-10-23`, Code dort in `2e31d9f`. Der anschließende ausdrückliche Abschlussauftrag integriert diese Arbeit in GastroCash PR #7; aktueller Arbeitsbranch `work/gastrocash-completion-2026-10-23`, Basis `03d90e6e47151483f2e06f14e683ea1b479bc6b2`. Keine Arbeit aus dem ersten Block verworfen.
Auftragsdatum 23.10.; technische Abrufe beginnen am 22.10.2026 laut Sitzungsuhr. Kein Merge, kein Deploy.

## Delta zu Beginn der Mission 2 und sicherer Integrationsplan

Zu Beginn der Mission 2 entsprachen main und PR #2–#6 dem Abschluss der ersten Work-Sitzung, ohne neue Kommentare oder Reviews. Danach kam auf #6 nur `1fef138` für den gestapelten CI-Trigger hinzu; kein Produktcode. Die jüngere GastroCash-/Freitag-Quelle ist im Abschlussabschnitt unten berücksichtigt. Die frühere Bestandsaufnahme und L6 wurden nicht neu entwickelt.

| Quelle | Enthalten / Überschneidung | Behandlung in dieser Lieferung |
| --- | --- | --- |
| #2 `c5a0a65` | Müll-Schnellmengen, Station ohne Euro, Rücknahme und Rückweg sind im neueren #5/#6 vorhanden. Die alte `l2-*`-CSS und der alte Stationsschalter sind durch das freigegebene Premium-Raster ersetzt. `muell1.station` ist dort nicht mehr verwendet. | Kein Zurückkopieren der alten Oberfläche oder unbenutzter Sprachschlüssel. Aktuelle Station im gesamten Arbeitstag benutzt. |
| #3 `3e9dfe4` | Vier Dokumente. #6 enthält das vollständige ursprüngliche Protokoll plus Fortsetzung; drei Übergabedokumente fehlen. | Drei Dateien bytegleich übernommen; Protokoll ausschließlich ergänzt. Die alten roten Test-/Gmail-Angaben sind historische Einträge und durch die Work-Abschlüsse überholt. |
| #4 `ded7685` | L3 fehlt vollständig: `kuehl.js`, eigener CSS-Abschnitt, `l3`-Texte in 18 Sprachen. Keine Rechenkernänderung. | Den kumulativen Patch gegen main sauber auf #6 angewandt. Danach ausschließlich die unten beschriebenen Integrationskorrekturen. |
| #5 `75760f2` | Verbindlicher B/C-Facelift, Premium-Fotos und fertiger L6; vollständig im Ausgangspunkt #6. | Erhalten. Fotos, Piktogramme, Mapping und Schriften bleiben bytegleich. |
| #6 `5de3a47` | Geprüfte Heute-/Büro-/Ordner-Wege, Sicherung, Offline und korrigierte Testuhren. | Grundlage; keine Rücknahme oder erneute Parallelentwicklung. |

**Add/Add reproduziert:** `git merge-tree --write-tree 5de3a47 origin/sanji/protokoll` meldet genau `docs/sanji-protokoll.md` als Add/Add. Das ist ein echter Textkonflikt, kein Fachkonflikt. Die verwendete Lösung ist die vollständige #6-Fassung mit dem unveränderten #3-Präfix plus neuer Fortsetzung; die drei übrigen Dokumente entsprechen #3. Bei einer später autorisierten Zusammenführung diesen vereinigten Stand behalten, neuere fremde Einträge gegebenenfalls zusätzlich anhängen. Keine pauschale „ours/theirs“-Lösung auf ganze Branches. Es wurde kein Merge-Commit erzeugt und kein PR geschlossen.

Empfohlene spätere Reihenfolge nach Review/Freigabe: diesen PR in #6 prüfen; #6 in den Facelift-Branch integrieren; #3 mit obiger Protokolllösung abgleichen. #2 ist gestalterisch überholt, #4 ist mit nachvollziehbarer Herkunft als Patch enthalten. Ob die alten PRs danach geschlossen werden, entscheidet der Kapitän/Zoro. main erst in einem gesondert freigegebenen Schritt.

## Vorher → nachher

- L3 war ein separater, nicht offline abgenommener Stand. Jetzt ist Wert → Maßnahme → Ware → Nachkontrolle im vorhandenen Facelift verbunden; Büro-Einrichtung und Monatsblatt bleiben erhalten.
- Im L3-Entwurf unterdrückte der stille Abschluss auch sofortige Sicherung und `rundgang-fertig`. Jetzt eigener Rückgabestatus, dasselbe Ereignis und sofortige Sicherung; bestätigte Teilstationen werden ebenfalls sofort gesichert.
- „Heute gemessen“ zählte auch Nicht-Messungen. Jetzt heißt der L3-Zähler „Heute dokumentiert“. Die letzte Dokumentation zeigt Datum und gegebenenfalls den tatsächlichen Grund statt eines alten Temperaturwerts. Das ist eine Anzeigekorrektur, keine Umdefinition der Kernzählung.
- Zurück von der Nachkontrolle führt bei weggeworfener Ware wieder zur Waren-Eingabe. Ein leerer Personal-Rundgang hat keine zusätzliche leere Korrekturübersicht; vorhandene Teilmessungen bleiben korrigierbar.
- L3-Touchflächen mindestens 56 px, Hauptknöpfe 64 px. Lange Namen und türkische Texte umbrechbar. Vorhandene B-Farben, lokale Schriften und Kühlstellenbilder.
- `js/nutzen_anzeige.js` ist ein reiner, noch nicht in L1 aktivierter Adapter. Er trennt `gemessen`, `schaetzung`, `nicht-verfuegbar` und `lagerkapital`. Keine Addition, kein erfundener Messbeginn; ungültige Werte bleiben unverfügbar. `summeVomKern` ist nur Übergabedatum, `summeAnzeigbar` bleibt ausdrücklich false. Die vorhandene L1-Schätzkennzeichnung bleibt sichtbar.

## Tatsächlicher Arbeitsablauf und Eingaben

Beide isolierten Piloten nutzen dieselben bereits freigegebenen Gerichte/Zutaten aus den bestehenden fiktiven Testdaten. Keine realen Geschäftszahlen.

| Schritt | Wirt gibt ein | Wiederverwendete Daten / Ergebnis |
| --- | --- | --- |
| Öffnen und Karte | Keine erneute Einrichtung | Gespeicherte Ladenart, Gerichte, Zutaten, Preise und eigene Fotos bleiben beim Versionswechsel erhalten. Kalkulation weiterhin aus bestehendem Kern. |
| Verkauf | Bekannten Tagesumsatz | Vorhandener Umsatzweg, keine neue Kassen- oder Stückverkaufs-Pflicht. |
| Müllstation | Gericht/Ware antippen; Menge nur bei Bedarf | Bestehende Standardmenge und Zutatenbilder; Rücknahme derselben Buchung. |
| Inventur | Tatsächliche Gebinde zählen | Waren und Packungsgrößen werden übernommen; Pause/Fortsetzen/Abschluss über echte UI. Ungezählte Waren bleiben nach ausdrücklicher Rückfrage offen. |
| Kühlung | Gemessene Temperatur, bei Abweichung getroffene Maßnahme/Nachkontrolle | Kühlstelle und Grenzwerte aus Einrichtung; Personal-Person aus Schicht. Kein vorbelegter Messwert. |
| Putzen | Tatsächlich erledigte Aufgabe abhaken | Vorhandener Plan, Person und Datum; Rücknahme möglich. Keine automatische Bestätigung einer Kontrolle. |
| Tagesabschluss/Büro | Bestehenden Abschluss ausführen; Sicherung speichern | Tagesdaten, Ordner und Export weiterverwendet. Keine zweite Eingabe derselben Zahlen. |

Erkannte verbleibende Reibung: frei erfasste Kühl-Verlustware verlangt weiterhin den Namen; ein vorhandener Warenwähler könnte Tippen reduzieren. Unbestätigte Temperaturentwürfe werden nach Neustart bewusst nicht als Messung gespeichert; bereits bestätigte Stationen sind fortsetzbar. Keine automatische Dokumentensortierung oder Temperaturmessung.

## Prüfung

- Node 22, vollständige Suite UTC und Europe/Berlin: 651 insgesamt, 646 bestanden, 0 Fehler, 5 bestehende Fixture-Auslassungen. Sieben gezielte neue Fälle zu L3 und Nutzen-Vertrag; keine Fachassertion gelockert. Finaler CI-Lauf wird im PR verlinkt.
- Alle 18 Sprachdateien strukturell geprüft; DE/TR/EN im echten Browser. Neue übrige Übersetzungen benötigen weiterhin muttersprachliche Prüfung.
- Browser-Regeln 390×844 und 360×780: 0 Verstöße. Personal-Durchlauf mit unveränderten Erwartungen nach Rückwegkorrektur bestanden.
- Neue Arbeitstage: PR-6-App wirklich starten, gespeicherte Daten und eigenes Gerichtsfoto anlegen, reguläres Service-Worker-Update zur Arbeitsfassung; Zustand vergleichen. Vollständiger Tagesablauf, echte L3-Schritte DE/TR/EN × beide Größen. Gesamter Browser mit eigenem Testprofil wird geschlossen und vor dem Wiederöffnen offline geschaltet. ZIP mit eigenem Foto in frischem Kontext wiederherstellen; SHA-256 des Blobs vergleichen. Beschädigtes ZIP muss mit Meldung abgewiesen werden und alle Fachdaten erhalten.
- Bestehende 12er Work-Matrix bleibt zusätzlich im CI: beide Piloten × DE/TR/EN × beide Größen, Ordner/Vorschau/CSV/ZIP/Offline. Echte Screenshots ausschließlich als lokale/Actions-Prüfartefakte.
- Versionsdateien ausschließlich durch `python3 tools/sw_liste.py`. PR-Zielbranch erhält CI; Deploy bleibt strikt auf main beschränkt.

## FÜR ZORO – offene fachliche Verträge

1. **Nicht-Messungen im Kern:** `engine.js:kuehlStatus` zählt Einträge mit Grund in `heuteGemessen`; `laden_zahlen.js:heuteKachelZahlen` kann damit `art:'ok'` liefern. Reproduktion: frischer Betrieb mit zwei aktiven Stellen; je Stelle `stationEintragen(r,k,{wert:null,grund:'geraetAus'})`, danach `rundgangAbschliessen`. `heuteGemessen === 2`, obwohl kein numerischer Messwert vorliegt. L3 nennt dies jetzt korrekt dokumentiert; Heute-/Personal-/Abschluss-Status muss Zoro fachlich getrennt als dokumentiert/gemessen/betriebsbereit entscheiden. Keine eigenmächtige Kernänderung.
2. **Nutzen:** Datenquellen sind vorhanden, der kausale Nutzen ist nicht belegt. `schwund`: Menge, Wert/offen, Datum, Storno und Quelle; `preisHistorie`/Lieferungen: Einkaufspreise; `inventuren`: Mengen und festgehaltene Preise; `gerichte`: Rezept/Verkaufspreis; `tagesnotizen`: Umsatz. Es fehlen belastbare Vergleichszeiträume, unveränderliche Nachweis-IDs je Posten, Zuordnungsregeln gegen Doppelzählung (insbesondere Kühl-Verlust/Müll und Preis-/Lagerwirkung), Monats-/Währungsbezug und eine freigegebene Summenregel. Erfasster Müll ist keine vermiedene Verschwendung; Preis-/Margenänderung kein automatisch realisierter Gewinn. Lagerkapital getrennt lassen. Für Papier fehlen Messdaten zur Zeit-/Kostenersparnis vollständig. Der Adapter liest nur Zoros Vertrag und aktiviert keine Summe.
3. **Integration:** Neuer L3-Status `eingetragen`/`abgeschlossen-still` muss bei späterer app.js-Arbeit erhalten bleiben: sofort sichern, Abschlussereignis genau einmal; Büromeldung nur beim bisherigen Status. Kein neuer PIN-Testschalter und keine DATEV-Arbeit.

## FÜR FRANKY – gezielte Quellenprüfung

Nur Recherche für vorhandene Ansichten; keine Aussagen daraus ungeprüft in App-Texte übernommen. Abruf je Zeile: **22.10.2026**. „Belegt“ bezeichnet den Quelleninhalt, nicht eine individuelle Freigabe des Betriebs.

| Aussage / genaue Fundstelle | Quelle | Sicherheit und praktische Konsequenz |
| --- | --- | --- |
| HACCP-Verfahren müssen umgesetzt werden; Aufzeichnungen müssen Art/Größe des Betriebs entsprechen. Art. 5 Abs. 1, 2 g, 4 VO (EG) 852/2004. | [Normtext bei der BGN](https://vorschriften.bgn-branchenwissen.de/daten/gv/eg_2004_852/5.htm), Verordnung vom 29.04.2004. EUR-Lex-Abruf war technisch gesperrt. | **Belegt.** Messung, Maßnahme und spätere Kontrolle getrennt halten. Keine pauschale neue Pflicht „jeder Kühlschrank zweimal täglich“ aus dieser Norm ableiten. |
| Geeignete Temperaturhaltung/-überwachung und erforderlichenfalls Registrierung: Anhang II Kap. I Nr. 2 d; Reinigung risikogerecht: Kap. V Nr. 1 a. | [Anhang II bei der BGN](https://vorschriften.bgn-branchenwissen.de/daten/gv/eg_2004_852/anh2.htm). | **Belegt.** Konkrete Kühlgrenzen, Takte und die vorhandenen „Pflicht“-Kennzeichnungen im Reinigungsplan betrieblich/fachlich prüfen; nicht als universell gesetzlich festgelegt ausgeben. |
| Die Verantwortung für das betriebliche HACCP-System liegt beim Inhaber; Dokumentation ersetzt keine Gefahrenanalyse oder wirksame Überwachung. | [BfR: Fragen und Antworten zum HACCP-System](https://www.bfr.bund.de/cm/350/fragen_und_antworten_zum_hazard_analysis_and_critical_control_point__haccp__konzept.pdf), S. 3–4. | **Belegt.** GastroCalc dokumentiert Eingaben. Abhaken ist keine automatische behördliche oder fachliche Freigabe. |
| Art. 5 Abs. 4 c nennt angemessene Aufbewahrung, keine einheitliche Jahresfrist für alle Kühlprotokolle. | [BGN Art. 5](https://vorschriften.bgn-branchenwissen.de/daten/gv/eg_2004_852/5.htm). | **Belegt für diesen Artikel; konkrete Dauer unbestätigt.** Keine automatische Löschfrist; Franky klärt betriebliche/örtliche Anforderungen. |
| AO §147 Abs. 2–4 unterscheidet Unterlagenarten und Anforderungen an Verfügbarkeit/Auswertbarkeit; Abs. 3 nennt grundsätzlich 10/8/6 Jahre, mit Ausnahmen/Verlängerungen. | [Gesetze im Internet: §147 AO](https://www.gesetze-im-internet.de/ao_1977/__147.html). | **Belegt; steuerliche Anwendung offen.** PDF/CSV/ZIP anbieten, daraus keine zugesicherte Archivkonformität ableiten. Franky prüft Zuordnung der konkreten Unterlagen, Originalaufbewahrung und Exportumfang. Kein neuer Steuerhinweis in der App. |
| Eine amtliche App-Handreichung unterscheidet lokale Verarbeitung/Speicherung von Verarbeitung beim Dienstleister und behandelt auch bei lokaler Speicherung Schutz und Sicherung. | [Kultusministerium BW: App-Auswahl](https://it.kultus-bw.de/site/pbs-bw-new/get/params_Dattachment/4695616/Handreichung-Auswahl-Apps.pdf), Stand 03/2018, S. 1–3; ausdrücklich Schulkontext. | **Belegt im Schulkontext; Übertragung auf GastroCalc wahrscheinlich, individuell ungeprüft.** „Nur lokal“ nicht mit „keine Datenschutzpflichten“ gleichsetzen. Franky prüft Beschäftigtenkürzel, Rechtsgrundlage, Information, Geräteschutz und externe Sicherungsziele. Keine Schulvorgaben blind zum Gastro-Gesetz erklären. |
| UWG §5 Abs. 1/2 erfasst irreführende Angaben u.a. zu Vorteilen und zu erwartenden Ergebnissen einer Dienstleistung. | [Gesetze im Internet: §5 UWG](https://www.gesetze-im-internet.de/uwg_2004/__5.html). | **Belegt; konkrete Werbeformulierungen unbestätigt.** Produktfolgerung: nur belegte Nutzenwerte, Schätzungen kenntlich, Zeitraum/Quelle erhalten; keine Garantie bestimmter Einsparungen oder „Papierkram erledigt sich selbst“. Franky prüft spätere Verkaufstexte. |

## Nächste drei Produktverbesserungen / Freigaben

1. Zoro: echte Messung, dokumentierte Nicht-Messung und offene Nachkontrolle in allen Statuskarten fachlich trennen; danach gezielte Kern-/UI-Regressionen.
2. Zoro + Franky: belegbare Nutzen-Posten mit Zeitraum/Nachweis-ID und Summenfreigabe liefern; erst danach vorhandene vier L1-Kacheln gemäß freigegebenem Vertrag ersetzen.
3. Vorhandene Waren bei Kühl-Verlusten direkt auswählbar machen; keine erneute Namenseingabe, Mengen/Einheiten aus dem vorhandenen Katalog. Gestalterisch bei B bleiben.

Kapitän: L3 im integrierten B/C-Stand und die vorgeschlagene Integrationsreihenfolge abnehmen. Eine spätere Zusammenführung/Veröffentlichung benötigt ein gesondertes ausdrückliches Go nach grünen Checks und fachlichem Review. Für Sanji besteht keine offene Entscheidung zu neuen Bildern oder einer neuen Designrichtung.


## 23.10.2026 – Abschluss in GastroCash PR #7

Dieser Abschnitt ergänzt den bisherigen L3-Stand um die jüngere Freitag-Masterübergabe (`sanji/protokoll` bei `20080b2`) und den ausdrücklichen GastroCash-Abschlussauftrag. Die oben vorgeschlagene neue PR-Lieferung wird im **bestehenden PR #7** gebündelt; es ist kein Merge erfolgt. #6 bleibt unveränderter Sockel.

- Alte `css/gastrocash-brand.css`-Referenz entfernt. Marken-CSS bleibt in `css/optik.css`; der Markentest prüft diese positive Verknüpfung. Keine Anwendung an eine veraltete CSS-Datei angepasst.
- Unbenutzte Emotionsklassen (`neutral`, `freundlich`, `erfolg`) und Bewegungsklasse `none` werden nicht mehr ausgegeben. `data-gc-state` und `data-gc-motion` erhalten alle fünf Zustände und die getrennte Animationsschnittstelle. Die beiden tatsächlich gestylten Kopfhaltungen behalten ihre CSS-Klassen. Kein Klassenwächter ausgenommen.
- Alter Sicherungsnamen-Test erwartet jetzt `gastrocash-…zip`. Kopfkennung `gastrocalc-sicherung`, Schema, interne Schlüssel und Datenformat unverändert. Browser erzeugt eine echte alte ZIP mit der unveränderten PR-6-App und importiert sie nach dem regulären Versionswechsel in GastroCash; neue ZIP mit eigenem Foto in frischem Kontext geprüft.
- **Vier 404 exakt aufgeklärt:** unveränderter PR-7-Head `03d90e6` in zwei frischen Browserkontexten reproduziert. Alle vier Antworten kamen von `/css/gastrocash-brand.css` (je Erststart/Service-Worker-Neuladen × zwei Größen), keine vier unabhängigen fehlenden Dateien. Aktueller Browsertest protokolliert HTTP-Fehler jetzt mit URL.
- Zusätzlich den lokalen Ordner `assets` in das spätere Pages-Dateipaket aufgenommen. Sonst wären die neuen Marken-SVGs nach einer späteren Veröffentlichung trotz lokal erfolgreichem Test verloren gegangen. Nur Paketdefinition repariert, kein Deploy ausgeführt.
- Erweiterte Markenprüfung: Heute, Müll, Karte, Kühlung, Abschluss, Büro/Hilfe, Personal; alle sechs Größen-/Sprachkombinationen. Zwei offene Augen, situationsgerechte Zustände, Reduced Motion, Zahl/CTA nicht vom Mascot überlagert, Manifest und lokale Vektor-/PNG-Dateien. Die Wortmarke ersetzt im Wortbudget das frühere Bildlogo; keine Bedien- oder Hilfetexte aus dem Wortbudget entfernt.
- Grenzen: Headless Chromium ist kein echter iPhone-Home-Screen. Manifest/Installierbarkeit und Offline-Funktion werden technisch geprüft; keine behauptete manuelle iOS-Installation. Markenrecht und Kapitäns-Sichtfreigabe bleiben separat.

Code-Dateien gegenüber PR-7-Start: `.github/workflows/pages.yml`, `index.html`, `css/design-b.css`, `css/facelift-v1.css`, `js/app.js`, `js/gastrocash-brand.js`, `js/screens/kuehl.js`, die 18 `js/lang/*.js`, `js/nutzen_anzeige.js`, generierte `sw.js`/`js/fassung.js`. Tests: `gastrocash-brand.test.mjs`, `speicher.test.mjs`, `laden_umbau.test.mjs`, `l3_integration.test.mjs`, `nutzen_anzeige.test.mjs`, `work_integration_browser.py`, `betriebsalltag_browser.py`, `gastrocash_browser.py`. Dokumente: GastroCash-Arbeitsstand, dieser Bericht, fortgesetztes Protokoll, erhaltene Übergaben sowie aktualisierte Brücke/Masterübergabe.

Finale Node-Zählung nach den Markenreparaturen: je UTC und Europe/Berlin **660 insgesamt / 655 bestanden / 0 Fehler / 5 übersprungen**. Die fünf Auslassungen entsprechen den externen/lokalen Fixtures aus #6. Vollständiger endgültiger Actions-Lauf im PR, kein grüner Anspruch aus einem alten Zwischenlauf.

Finale Offline-Fassung: `2026-10-23.2`, Fingerprint `37033063e82a`, 274 App-Dateien / 235 Fotos. Ausschließlich vom Projektwerkzeug erzeugt; kein manuell gesetzter Hash.

Technischer Abschluss-Commit: [`e3fa3c5`](https://github.com/barisakacak-eng/gastrcalc/commit/e3fa3c5467fbf26a9177a77852e82a1dc9c91312). Die Dokumentationsfortsetzung ist ein separater nachfolgender Commit; endgültiger CI-/Head-Link im PR #7.
