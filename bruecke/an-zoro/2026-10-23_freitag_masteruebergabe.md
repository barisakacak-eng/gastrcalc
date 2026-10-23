# FÜR ZORO – FREITAG MASTERÜBERGABE SANJI + WORK
Stand: 23.10.2026
Status: verbindliche Sammelübergabe aus Sanji-Chat, GitHub-Arbeit und ChatGPT Work
Kapitän: Baris
Repository: barisakacak-eng/gastrcalc

## 0. Zweck dieser Datei

Diese Datei ist die Freitag-Sammelübergabe. Sie soll verhindern, dass Entscheidungen aus den letzten zwei Tagen, Work-Ergebnisse, Designfreigaben oder offene technische Fehler beim Zusammenführen verloren gehen.

WICHTIG:
- Nichts aus dieser Datei ungeprüft nach main mergen.
- Öffentliche Live-App nicht verändern, bevor Baris ausdrücklich Go gibt.
- Keine Rechenregel nur wegen einer Gestaltung ändern.
- Wenn ältere Brücke, ältere Chats oder ältere PR-Texte dieser Übergabe widersprechen, gilt die jüngere ausdrücklich dokumentierte Kapitänsentscheidung.
- Die exakte Datei GastroCalc_Bruecke_Sanji.md war in den von Work untersuchten Branches nicht vorhanden. bruecke/stand.md ist Stand 16.10. und damit veraltet. Nach Integration bitte die Brücke/stand.md auf den wirklichen Stand bringen.

## 1. Aktueller GitHub-Stammbaum

main:
- SHA: ffc016018a10e3e7af831555d072e59c1289091a
- unverändert seit 20.10.
- keine Sanji-/Work-/GastroCash-Änderung ist veröffentlicht.

PR #2 – Sanji L2 Müll v2
- Branch: sanji/L2-muell
- Head: c5a0a6511e41ffbf6b5446036b1c9e14f6eaecb5
- Base: main
- Draft, offen
- NICHT blind mergen: die wesentlichen L2-Teile sind später in PR #5 weiterentwickelt/übernommen worden.

PR #3 – Sanji Protokoll
- Branch: sanji/protokoll
- Head vor dieser Übergabe: 3e9dfe4a472b83ea8d75267224d1df7f9bdde353
- Base: main
- Draft, offen
- enthält Entscheidungen/Protokolle, keine produktive App-Integration.
- Achtung: docs/sanji-protokoll.md existiert auch im Work-Branch; später Add/Add bzw. Inhaltskonflikt möglich. Inhalte zusammenführen, keine Version blind verwerfen.
- Diese Masterübergabe liegt in diesem Branch unter bruecke/an-zoro/2026-10-23_freitag_masteruebergabe.md.

PR #4 – Sanji L3 Kühlung v2
- Branch: sanji/L3-kuehlung
- Head: ded7685a33f6aa10cc9603876a063d50677a9980
- Base: main
- Draft, offen
- gesonderter Kühlungsstand. Nicht blind auf PR #5/#6 legen. Erst Diff gegen die inzwischen weiterentwickelte App prüfen und nur fehlende, fachlich noch gültige Teile übernehmen.

PR #5 – Facelift 1.0
- Branch: sanji/facelift-1-0-integration
- Head: 75760f22d6cab7de3dae36360f6a11a718d0c9de
- Base: main
- offen, nicht gemerged
- 156 Commits / 38 geänderte Dateien
- dies ist die große Facelift-Grundlage B + C.

PR #6 – Work Integration
- Branch: work/facelift-integration-2026-10-22
- Base: sanji/facelift-1-0-integration
- aktueller Head: 1fef138ec4c48f903f0a0d4daee422f255cdc695
- Produktstand 5de3a476f98fd10f14b40537a67d5cf29c13a174 war vollständig grün in Actions Run 39858736807.
- Der danach hinzugekommene Commit 1fef138... erweitert nur den CI-Trigger, damit gestapelte PRs gegen den Work-Branch geprüft werden können; kein Produktfeature.
- Dies ist der bislang sicherste Integrationsstand vor GastroCash.

PR #7 – GastroCash B
- Branch: sanji/gastrocash-brand-b-2026-10-23
- Base: work/facelift-integration-2026-10-22
- aktueller Head: 03d90e6e47151483f2e06f14e683ea1b479bc6b2
- Draft, offen
- 65 Commits / 41 geänderte Dateien
- deutlich weiter als der alte PR-Beschreibungstext.
- NOCH NICHT MERGEFERTIG. Letzter Run 39878380598 ist rot. Ursachen unten exakt dokumentiert.

## 2. Verbindliche Produkt- und Designrichtung

### 2.1 Zielgruppe
GastroCash richtet sich zuerst gleichwertig an:
- Dönerläden
- Smash-Burger-Läden

Der ältere Projekttext nennt kleine Betriebe mit 1–10 Leuten; die neue Markenunterlage vom 23.10. nennt 1–15 Mitarbeiter. Bitte daraus aktuell keine Logik ableiten. Wenn die Zahl öffentlich vermarktet werden soll, Baris entscheiden lassen.

### 2.2 Drei Kernversprechen
Die Produktarbeit wurde auf drei verständliche Nutzenachsen ausgerichtet:
1. Geld: Der Inhaber sieht täglich seinen Fortschritt zur Kostendeckung und was Gerichte nach Kosten übrig lassen.
2. Müll: Verschwendung wird schnell erfasst und in Portionen/Euro sichtbar, soweit echte Preise vorhanden sind.
3. Papier/Büro: vorhandene Daten werden geordnet, vorbereitet und exportierbar gemacht.

Grenze:
- Nicht behaupten, die App beweise echten Bank-/Kontogewinn.
- Nicht behaupten, jeder Müll-Eintrag sei eine bereits realisierte Ersparnis.
- Nicht behaupten, Papierkram/Steuern seien automatisch erledigt, solange die Funktion das nicht wirklich tut.
- Keine Steuerbehauptung ohne Frankys geprüfte Quelle/Freigabe.
- Kalkulatorische/geschätzte Werte sichtbar als solche kennzeichnen.

### 2.3 Facelift-Entscheidung B + C
Baris hat Facelift 1.0 freigegeben:
- Design B „Waste zu Gewinn“ = Bildsprache und Bedienbasis im Laden.
- Design C „Chef-Autopilot“ = nur Ergänzung für Büro, Ordner und Einstellungen.
- Keine Fantasie-Automationen aus Konzeptbildern übernehmen.

Achtung Begriffskollision:
- „Design C“ oben ist die bereits freigegebene Büro-Erweiterung.
- „Variante C“ beim neuen Mascot bedeutet etwas anderes: der spätere interaktive Finanz-Chat. Dieser Chat ist NOCH NICHT zu bauen.

## 3. Was Sanji in PR #5 tatsächlich gebaut hat

### L1 Heute / Cockpit
- Premium-Facelift auf vorhandener Rechenlogik.
- Monatsziel/Abstand zur Kostendeckung.
- eine priorisierte Haupthandlung.
- Döner- oder Burger-Hero anhand echter Ladenart.
- keine neue Finanzformel.

### L2 Müll / Müllstation
- normale Müllansicht plus echte Vollbild-Müllstation.
- fünf häufige Waren + Andere.
- dieselben gespeicherten Müll-Daten wie die normale Erfassung, kein zweiter Datenbestand.
- Suche, Mengenblatt und Rückgängig.
- Station ohne Euroanzeige.
- Waage bleibt inaktiv als „— kg“; keine erfundene Waagenmessung.
- Weinrot bleibt exklusiver Müll-Cockpit-Ton.

### L5 Karte
- größere lokale Premium-Gerichtsfotos.
- Verkaufspreis, Restbetrag, Prozent/Margen-Ampel aus vorhandener Engine.
- keine neue Kennzahl erfunden.
- Dönerteller/Döner Box Bildzuordnung wurde korrigiert.
- Pilottestdaten sind ausdrücklich fiktiv und gehören nicht in Kundenstände.

### L6 Tag abschließen
- drei anklickbare Statusbereiche vor Abschluss: Umsatz, Müll, Kühlung.
- nach Abschluss echte Zählerbewegung gestern/heute aus tagesBilanz().
- negativer Zähler wird psychologisch korrekt als „Bis null fehlen X €“ ohne Minuszeichen dargestellt.
- über null +X €.
- Hinweis „kalkulatorisch, kein Kontostand“ bleibt.
- Fixkosten, Müll, Kühlung unter „Mehr“ erreichbar.
- Vergleich mit gleichem Wochentag der Vorwoche ist Umsatzvergleich, nicht automatisch Gewinnvergleich.
- echter Browserlauf 39778827930 hat die finale Wortwahl bei 390×844 und 360×780 geprüft.

### B1 Büro / Ordner
- ruhiger C-Stil für Büro/Einstellungen.
- echte Ordnerstatus, Vorschau, CSV/Druck/PDF-Wege.
- keine automatische Einreichung oder Steuerautomatik vorgespiegelt.

## 4. Freigegebene Premium-Fotos – NICHT neu erzeugen

Die zwölf freigegebenen 520×390 WebP in PR #5 sind verbindlich und dürfen nicht durch neue KI-Fotos ersetzt werden:

Gerichte:
- foto/g-doener.webp
- foto/g-doener-teller.webp
- foto/g-burger.webp
- foto/g-cheeseburger.webp
- foto/g-double-smash-burger.webp
- foto/g-burger-menue.webp

Rohwaren:
- foto/r-fladenbrot.webp
- foto/r-burger-bun.webp
- foto/r-patty.webp
- foto/r-cheddar.webp
- foto/r-burgersauce.webp
- foto/r-pickles.webp

Regel:
- Eigene vom Wirt hochgeladene Fotos behalten Vorrang.
- Keine externen Bildserver.
- Keine neue Food-Bildwelt ohne neues Go von Baris.

## 5. Work-Sitzung – was sie wirklich erledigt hat

Quell-Dokument:
docs/Sanji_2026-10-22_Work_Integration.md
Branch: work/facelift-integration-2026-10-22

Work hat NICHT nur analysiert, sondern Code und Tests geliefert.

### 5.1 Drei alte rote Tests aufgeklärt
Die drei damaligen Fehler Aktionen/Haltbarkeit, Zweitlieferant und Büro-Menütafel waren auf main und Facelift reproduzierbar und beruhten auf festen Beispieldaten vom 18./19.10., die mit der laufenden Rechneruhr vermischt wurden.

Work hat ausschließlich die Testuhr in den jeweiligen Tests begrenzt.
- Assertions blieben.
- Rechenkern blieb.
- Haltbarkeitslogik wurde nicht gelockert.

### 5.2 L1/B1 nachgebessert
- L1 zeigt „Schätzung“ sichtbar.
- doppelte Überzeile entfernt.
- eine Hauptaktion erhalten.
- Büro: Einstellungen und Sicherung direkter erreichbar.
- Einstellungen: Rahmen, Abstände, Zeilentrenner, lange Werte.
- Ordner: wichtige Buttons ≥56 px; lange Texte umbrechen; „Drucken / PDF“ beschreibt den tatsächlichen Druckweg.

### 5.3 Vollständiger Prüfstand des grünen Work-Stands
Actions Run: 39858736807
Head: 5de3a476f98fd10f14b40537a67d5cf29c13a174

- Node 22 UTC: 639 bestanden / 5 übersprungen / 0 Fehler.
- Node 22 Europe/Berlin: 639 bestanden / 5 übersprungen / 0 Fehler.
- alle 18 Sprachtabellen strukturell vollständig.
- Browser-Regelprüfung 390×844 / 360×780 ohne Verstöße.
- Personal-Durchlauf bestanden.
- 12/12 echte Browserkombinationen:
  Döner + Smash × DE/TR/EN × 390×844/360×780.
- offline geprüft.
- richtige Premium-Fotos geprüft.
- Kalkulationsdarstellung geprüft.
- Navigation/Touchflächen geprüft.
- drei Ordner geprüft.
- echte Vorschau/CSV geprüft.
- je Pilot Umsatz speichern.
- Müll speichern und rückgängig.
- Inventur zählen/pausieren.
- L6 benutzen.
- ZIP-Sicherung herunterladen.
- in frischem Browserkontext wiederherstellen.
- ungültigen Import abweisen.
- Fachdaten nach Offline-Neustart erhalten.

Fassung damals: 2026-10-22.14
Fingerprint: d25c46e104b9

### 5.4 Gmail/GitHub-Meldungen
Work hat insgesamt 57 GitHub-Benachrichtigungen mit Actions-Jobs abgeglichen.
Ergebnis:
- viele rote Mails waren Wiederholungen derselben Datumsannahmen oder bereits behobene Zwischenstände.
- alte SW-/Layout-Fehler wurden von aktuellen grünen Prüfungen überholt.
- keine Mail wurde verändert, archiviert oder gelöscht.

## 6. Noch offene Produktverträge aus Work

### Für Zoro
1. nutzen-Schema/Messlogik:
   nutzen = { summe, posten:[{ art, euro, gemessen, quelle }], ab }
   Ziel: ausschließlich belegte, gemessene Werte. Keine Doppelzählung. Lagerkapital != Gewinn.
   Wenn noch keine belastbare Messung: lieber „Messung läuft seit …“ als erfundene Summe.

2. hinweis-Schema:
   hinweis = { titel, satz, quelle, knopf, status }
   Steuer-/Rechtstext erst mit geprüfter Quelle.
   Bisher kein Ersatzmodell von Sanji bauen.

3. PIN-Testschalter:
   kontrollierter Testweg weiterhin offen.

### Für Franky
- geprüfte Steuertexte/Quellen.
- rechtliche/markenrechtliche Prüfung von GastroCash vor öffentlicher Veröffentlichung.
- keine unbestätigte Steuerkarte.

## 7. Neue Marke – GastroCash

### 7.1 Beschluss
Aus dem Arbeitsnamen GastroCalc wird intern/gestalterisch GastroCash.
GastroCash ist für die weitere Produktgestaltung freigegeben.
Markenrechtliche Verfügbarkeit ist noch NICHT als geprüft anzusehen.

### 7.2 Wortmarke
- „Gastro“ regular/leicht.
- „Cash“ deutlich fett/geerdet.
- Tinte auf Papier.
- Systemschrift/local only; keine externen Webfonts für die Marke nötig.

### 7.3 Palette für neue Markenassets
Neue GastroCash-Markenassets sollen sich an diese freigegebene Palette halten:
- Papier #F5EDE2
- Tinte #22301F
- Salbei #4C6B55
- Glut #E8763A
- Holz #E2CDB2
- Weinrot #8B3A2E ausschließlich Müll

Keine breitflächige Recolor-Aktion des gesamten bereits freigegebenen B+C-Facelifts in demselben Integrationsschritt. Bestehende UI zuerst erhalten; Markenassets sauber an die Tokens anbinden.

## 8. Mascot „Der Klassiker“ – verbindliche Richtung

Der Schürzen-Bot ist GastroCash-Markenbuddy/Küchenhelfer.

### Grundidee
- kein futuristischer Sci-Fi-Roboter.
- bodenständiger digitaler Küchenhelfer.
- Schürze = packt mit an.
- orange Münze in der Fronttasche = Geld/Nutzen.
- freundlich, nahbar, verlässlich.

### Wichtigstes Feedback von Baris
Der Bot darf NICHT überall dasselbe Zwinker-Gesicht haben.
An schlechten Tagen gibt es nichts zu grinsen.
Widersprüchliche Gesichtskombinationen sind verboten – ausdrücklich Beispiel: zwinkerndes Auge + Mundwinkel nach unten wirkt unverständlich.

### Emotionen
Mindestens:
- neutral
- freundlich
- nachdenklich
- ernst
- Erfolg

Regeln:
- Default = neutral, zwei offene Augen.
- schlechter Zustand = ernst/aufmerksam, kein Lächeln, kein Zwinkern.
- unter null, aber Verbesserung = nachdenklich/unterstützend, nicht feiern.
- über null / bestätigter Erfolg = klares Erfolgsgesicht, Daumen möglich.
- fehlende/unvollständige Daten = neutral oder nachdenklich, nie Erfolg vortäuschen.

### Bewegung getrennt von Emotion
Der Bot soll später deutlich animierbar sein:
- idle/leichte Bewegung
- Blinzeln
- Daumen hoch
- Kopf/Körper drehen
- kurze Feier/Erleichterung
- später ggf. zeigen/gehen/Chat öffnen

Bewegung darf nie eine falsche Emotion erzeugen.
Reduced Motion respektieren.
Keine Daueranimation bei wichtigen Eingaben.

### Chat
Baris möchte die spätere Interaktion bereits als visuelle Richtung mitdenken.
Entscheidung:
- Variante B JETZT: Marke, Mascot, Hilfs-/Statuszustände.
- Variante C SPÄTER: richtiger interaktiver Finanz-Chat.
- In PR #7 ist bewusst KEIN Finanz-Chat implementiert.
- Keinen schwebenden Chatbutton oder erfundene Antworten vorziehen, bis Daten-/Funktionsvertrag steht.

## 9. PR #7 – tatsächlich umgesetzter GastroCash-Stand

Quell-Dokument:
docs/Sanji_2026-10-23_GastroCash_B_Arbeitsstand.md
Branch: sanji/gastrocash-brand-b-2026-10-23

Aktuell umgesetzt:
- GastroCash in HTML/Manifest.
- sichtbare Markenbezüge in allen 18 Sprachdateien.
- Teilen/Diagnose auf GastroCash.
- Sicherungshinweise auf GastroCash.
- äußerer Sicherungs-Dateiname wurde auf gastrocash-… umgestellt; internes Format/Schema soll kompatibel bleiben.
- Wort-/Bildmarke:
  assets/brand/gastrocash-logo.svg
  assets/brand/mascot-classic.svg
  icons/logo.svg
  icons/logo-zeichen.svg
- PWA-Icons:
  icons/icon-180.png
  icons/icon-192.png
  icons/icon-512.png
  icons/icon-maskable-512.png
- Navigation rendert Marke direkt in js/screens/nav.js.
- keine nachträgliche DOM-Injektion.
- Mascot-Logik in js/gastrocash-brand.js.
- Marken-CSS wurde in den aktuellen Stand von css/optik.css integriert.
- Mascot wird an echten Stellen benutzt:
  Hilfe-Blatt in js/screens/ebene.js
  Tagesabschluss in js/screens/abschluss.js.
- Tagesabschluss-Reaktion kommt aus vorhandenen Ergebniswerten, nicht aus neuer Rechenlogik.
- Tests in tests/gastrocash-brand.test.mjs.
- Version aktuell 2026-10-23.1.

Wichtig für Abwärtskompatibilität:
- keine internen Speicherkeys, Schemas, Ereigniskennungen oder Datenformate blind umbenennen.
- alte Sicherungen müssen lesbar bleiben.
- äußerer Dateiname darf GastroCash heißen; Inhalt/Import-Kompatibilität nicht brechen.

## 10. PR #7 ist aktuell ROT – exakter letzter Befund

Letzter Run:
https://github.com/barisakacak-eng/gastrcalc/actions/runs/39878380598
Head:
03d90e6e47151483f2e06f14e683ea1b479bc6b2

Node:
- 653 Tests
- 642 bestanden
- 6 fehlgeschlagen
- 5 übersprungen
- Berlin-Lauf wurde nach UTC-Fehler übersprungen.

Die sechs Fehler:

1. tests/aktion_plan.test.mjs
   Fehler: „Klasse ohne CSS: gc-bot--neutral“
   Der allgemeine Klassenwächter sieht die vom Mascot erzeugte neutrale Klasse, findet aber keine passende CSS-Regel.
   Kein nachgewiesener Fachfehler der Aktionen.

2. tests/fassung.test.mjs
   Service-Worker-Fingerabdruck veraltet.
   sw.js wurde nach weiteren Markenänderungen nicht final mit tools/sw_liste.py regeneriert.
   Im Run: gespeicherter alter Wert d25c46e104b9 vs. berechneter aktueller Stand 01a48d0d7846.
   NICHT einfach 01a48… von Hand eintragen, wenn vorher noch Dateien geändert werden. Nach finalen Änderungen tools/sw_liste.py ausführen.

3. tests/gastrocash-brand.test.mjs
   Der Test enthält aktuell eine falsche Negativ-Assertion auf css/gastrocash-brand.css.
   Gleichzeitig verweist index.html noch auf css/gastrocash-brand.css.
   Diese Datei existiert am aktuellen Head nicht mehr; die Markenregeln wurden nach css/optik.css verschoben.
   Sauber lösen: stale <link> aus index.html entfernen und den Markentest auf die endgültige CSS-Quelle ausrichten.

4. tests/getraenke.test.mjs
   ebenfalls „Klasse ohne CSS: gc-bot--neutral“.
   Kein nachgewiesener Getränke-Fachfehler.

5. tests/speicher.test.mjs
   Produktcode liefert bereits gastrocash-test-doner-YYYY-MM-DD.zip,
   Test erwartet noch gastrocalc-test-doner-YYYY-MM-DD.zip.
   Entscheidung ist Markenwechsel des äußeren Dateinamens. Test anpassen, Import-/Formatkompatibilität unbedingt erhalten.

6. tests/tafel.test.mjs
   ebenfalls „Klasse ohne CSS: gc-bot--neutral“.
   Kein nachgewiesener Menütafel-Fachfehler in diesem Run.

Browser-Regeljob:
- eigentliche Regelmessung: 0 neue Verstöße.
- Job trotzdem rot wegen 4 Browser-Konsolenfehlern „404 File not found“.
- Mindestens einer ist sehr wahrscheinlich der stale index-Link auf css/gastrocash-brand.css, weil diese Datei am Head fehlt und die CSS-Regeln bereits in css/optik.css stehen.
- Die übrigen 404 NICHT raten: Logs/Artefakt prüfen und konkret auflösen.
- Pilot-/Offline- und Personal-Schritte wurden wegen vorherigem Fehler übersprungen.
- deploy wurde korrekt übersprungen.

Positiv im selben roten Run:
- 18 Sprachdateien tragen GastroCash.
- Manifest/Vektorlogos Markenprüfung bestand.
- PWA-Icon-Test bestand.
- fünf Mascot-Gesichter/two-open-eyes-Prüfung bestand.
- unbekannter Mascot-Zustand fällt neutral zurück.
- die eigentlichen Bildschirmregelwerte 390/360 zeigten 0 Regelverletzungen.

## 11. Konkrete Integrationsreihenfolge für Freitag

Bitte nicht alles in einem unkontrollierten Merge zusammenschieben.

### Schritt 1 – PR #6 als technische Basis
- PR #6 gegen PR #5 reviewen.
- Work-Produktstand 5de3a... ist vollständig grün.
- aktuellen zusätzlichen CI-Commit 1fef138... mitnehmen, falls der gestapelte PR-Workflow weiter gebraucht wird.
- danach vollständigen Testlauf.
- noch nicht main.

### Schritt 2 – PR #7 auf die aktuelle PR-#6-Basis bringen
- Branch aktualisieren/rebasen oder gezielt integrieren.
- keine Änderungen aus PR #7 verlieren.
- insbesondere alle 18 Sprachmarken, PWA-Icons, Vektorassets, Mascot-Logik, Hilfe/Abschluss-Einsatz und Sicherungsnamen prüfen.

### Schritt 3 – die sechs bekannten roten Punkte beheben
Reihenfolge:
A. stale css/gastrocash-brand.css-Link entfernen / endgültige CSS-Quelle festlegen.
B. gc-bot--neutral Klassenwächter sauber machen (entweder Klasse nur ausgeben, wenn sie gebraucht/styled ist, oder bewusst definieren; keine Testausnahme verstecken).
C. Sicherungsnamen-Test auf GastroCash aktualisieren, Format rückwärtskompatibel lassen.
D. alle 404 identifizieren und beseitigen.
E. tools/sw_liste.py erst NACH allen Dateiänderungen ausführen.
F. Node UTC + Berlin, Regelbrowser, Personal, Pilot/Offline erneut komplett grün fahren.

### Schritt 4 – echte mobile Markenprüfung
390×844 und 360×780:
- Laden-Kopf
- Personal-Kopf
- Büro-Rückwege
- Hilfe-Blatt mit Mascot
- Tagesabschluss mit neutral/nachdenklich/ernst/Erfolg
- DE/TR/EN, insbesondere lange türkische Texte
- keine Überlagerung Monatszahl / CTA / Navigation
- Reduced Motion
- PWA installieren
- App-Icon korrekt
- Offline-Neustart
- alte Sicherung importieren
- neue Sicherung exportieren und wieder importieren

### Schritt 5 – PR #2/#4/#3 separat aufräumen
- PR #2 nicht zusätzlich mergen, wenn Inhalt bereits in #5 steckt.
- PR #4 L3 diff-basiert prüfen, nur tatsächlich fehlende Teile übernehmen.
- PR #3 ist Protokollquelle. docs/sanji-protokoll.md manuell mit dem Work-/aktuellen Stand zusammenführen.
- diese Masterübergabe erhalten.

### Schritt 6 – erst danach Kandidat für main
Vor main müssen gelten:
- vollständige CI grün.
- keine 404.
- keine neue Datenmigration ohne Test.
- alte Sicherungen weiter importierbar.
- keine Premium-Fotos verändert.
- keine Rechenregel still geändert.
- Baris sieht den echten Browserstand und gibt ausdrücklich Go.
- GastroCash-Markenrecht vor öffentlicher Veröffentlichung separat geprüft bzw. bewusst entschieden.

## 12. Was NICHT verloren gehen darf

- B + C bleibt Grundlage.
- Döner und Smash gleich priorisieren.
- zwölf Premium-Fotos unverändert.
- „Bis null fehlen X €“ statt irreführendem negativen Hauptwert.
- Schätzung klar kennzeichnen.
- kalkulatorisch != Kontostand.
- Lagerkapital != Gewinn.
- Müll-Erfassung != bewiesene Ersparnis.
- keine erfundene Waage.
- eigene Wirtsfotos haben Vorrang.
- genau eine wichtigste Handlung pro Bildschirm.
- 56px wichtige Touchflächen im aktuellen Facelift/Work-Ziel.
- Offline ohne CDN/Webfonts/Bildserver.
- Mascot nicht überall winkend/zwinkernd.
- schlechte Lage: kein Grinsen.
- Animation getrennt von Emotion.
- Variante B jetzt, Finanz-Chat Variante C später.
- keine Veröffentlichung ohne Kapitäns-Go.

## 13. Relevante Dateien und Links

### PRs
- PR #5 Facelift: https://github.com/barisakacak-eng/gastrcalc/pull/5
- PR #6 Work: https://github.com/barisakacak-eng/gastrcalc/pull/6
- PR #7 GastroCash: https://github.com/barisakacak-eng/gastrcalc/pull/7
- PR #3 Protokoll: https://github.com/barisakacak-eng/gastrcalc/pull/3
- PR #2 L2 alt: https://github.com/barisakacak-eng/gastrcalc/pull/2
- PR #4 L3: https://github.com/barisakacak-eng/gastrcalc/pull/4

### Work-Übergabe
Branch work/facelift-integration-2026-10-22:
- docs/Sanji_2026-10-22_Work_Integration.md
- docs/sanji-protokoll.md

### GastroCash-Übergabe
Branch sanji/gastrocash-brand-b-2026-10-23:
- docs/Sanji_2026-10-23_GastroCash_B_Arbeitsstand.md
- assets/brand/gastrocash-logo.svg
- assets/brand/mascot-classic.svg
- tests/gastrocash-brand.test.mjs

### Freitag-Masterübergabe
Branch sanji/protokoll:
- bruecke/an-zoro/2026-10-23_freitag_masteruebergabe.md

### wichtige Actions
- Work komplett grün: https://github.com/barisakacak-eng/gastrcalc/actions/runs/39858736807
- PR #7 letzter roter Diagnose-Run: https://github.com/barisakacak-eng/gastrcalc/actions/runs/39878380598
- L6 Browserabnahme: https://github.com/barisakacak-eng/gastrcalc/actions/runs/39778827930
- Doppelpilot-Karte: https://github.com/barisakacak-eng/gastrcalc/actions/runs/39760842660

## 14. Arbeitsauftrag an Zoro

Zoro, übernimm ab hier wieder die technische Führung.

Dein Ziel ist NICHT, neue Ideen zu sammeln, sondern aus PR #5 + #6 + #7 einen sauberen, grünen, reviewbaren Integrationsstand zu machen.

1. Lies diese Masterübergabe vollständig.
2. Lies Work-Integration und GastroCash-Arbeitsstand.
3. Prüfe die echten Diffs, nicht nur PR-Beschreibungen.
4. Nimm PR #6 als sicheren Ausgangspunkt.
5. Repariere PR #7 fachlich minimal und sauber.
6. Keine Rechenregeln ändern, nur weil Marken-/UI-Tests rot sind.
7. Rückwärtskompatibilität der Sicherungen erhalten.
8. Danach vollständige Tests und Browserdurchläufe.
9. PR #2/#4/#3 nicht blind mergen.
10. Erstelle einen finalen Integrationsbericht mit:
   - übernommen
   - bewusst nicht übernommen
   - Konflikte
   - Tests
   - verbleibende Risiken
   - konkrete Entscheidung, die Baris vor main noch treffen muss.
11. Kein Merge nach main und keine Veröffentlichung ohne ausdrückliches Go von Baris.

## ÜBERGABE AN ZORO

Aufgabe: Freitag-Masterintegration Sanji + Work + GastroCash
Ergebnis: Vollständige Sammelübergabe mit Branch-/PR-Hierarchie, freigegebenem Facelift, Work-Prüfstand, GastroCash/Mascot-Beschlüssen, aktuellem roten PR-#7-Befund und Integrationsreihenfolge. Datei: bruecke/an-zoro/2026-10-23_freitag_masteruebergabe.md
Empfehlung: PR #6 als grünen Integrationssockel verwenden und PR #7 darauf technisch bereinigen. PR #2/#4 nicht blind zusätzlich mergen. Erst nach vollständig grünem Teststand und echter mobiler Sichtprüfung überhaupt einen main-Kandidaten vorbereiten.
Offene Fragen: Markenrecht GastroCash; finale visuelle Abnahme des Mascot; späterer Chat-Vertrag Variante C; nutzen-/hinweis-Schema und PIN-Testschalter.
Hinweise für den Code: Keine stille Rechenlogikänderung; alte Sicherungen importierbar halten; äußeren Sicherungsnamen GastroCash erlauben; Brand-CSS aktuell in optik.css, stale index-Link entfernen; final tools/sw_liste.py; 390×844 + 360×780; DE/TR/EN; Offline/PWA; Premium-Fotos unverändert.
Quellen: PR #5, PR #6, PR #7, Actions 39858736807, 39878380598, 39778827930, 39760842660 sowie die oben verlinkten Work-/GastroCash-Dokumente.


## 15. Work-Abschluss 23.10.2026 – ergänzt, ursprüngliche Übergabe erhalten

Der rote Diagnose-Stand aus Abschnitt 10 ist historisch und durch die Reparaturen im aktuellen PR #7 ersetzt. Ausgangs-Markenhead `03d90e6`; Abschlussbranch `work/gastrocash-completion-2026-10-23`. Der vorherige Work-L3-Block (`2e31d9f`) wurde mit der Marke verbunden, nicht neu begonnen oder verworfen. Finale SHAs und Actions-Abnahme stehen im aktualisierten PR #7. Kein Merge, main/Live unverändert.

- Stale CSS-Link entfernt; Markenregeln endgültig in `css/optik.css`, Test auf diese Architektur ausgerichtet.
- Unbenutzte Zustandsklassen entfernt, Emotion/Bewegung separat als Datenattribute erhalten. Fünf Gesichter/zwei offene Augen; keine Testausnahme für `gc-bot--neutral`.
- Sicherungsname im Test auf GastroCash, internes Format/Schema unverändert. Alte echte PR-6-Sicherung im Browser importiert; neue GastroCash-ZIP mit eigenem Foto in frischem Kontext wiederhergestellt, Zustand und Foto-Hash gleich. Ungültige/beschädigte Datei abgewiesen.
- Alle vier alten 404 anhand unverändertem Head reproduziert: vier Aufrufe von `/css/gastrocash-brand.css`. Neue Browserläufe ohne HTTP-/JS-Fehler. Zusätzlich `assets` in das spätere Pages-Paket aufgenommen. Kein Deploy.
- L3 aus #4 integriert: bestätigte Station/Abschluss sofort gesichert, Abschlussereignis bei stiller Meldung erhalten; richtiger Rückweg zur Ware; leerer Personal-Rundgang erzwingt keine Korrekturübersicht. Bestätigte Stationen im offenen Rundgang bleiben korrigierbar.
- L3 nennt Nicht-Messungen „dokumentiert“, zeigt Grund/Datum. Zoro muss die übrigen Kern-Statuskarten weiter fachlich zwischen Messung/Nicht-Messung unterscheiden; keine stillen Kernregeln geändert.
- Reiner Nutzen-Anschluss mit getrennten gemessenen/geschätzten/nicht verfügbaren Posten, Lagerkapital gesondert. Keine Summe aktiv; Vergleichs-/Nachweis-/Doppelzählungsregeln fehlen weiterhin bei Zoro. Kein Chat und keine Steuerkarte.

Lokaler Endstand: Node 22 UTC und Berlin jeweils **660 gesamt, 655 bestanden, 0 Fehler, 5 bestehende Fixture-Auslassungen**; 18 Sprachtabellen vollständig. Browser-Regeln ohne Verstöße, unveränderter Personal-Test bestanden. Vollständige Döner-/Smash-Arbeitstage mit Versionswechsel, ganzem Offline-Browserneustart, Tagesabschluss, L3 und Foto-/ZIP-Wiederherstellung bestanden. Die bestehende 12er-Matrix erneut grün. GastroCash-Markenprüfung DE/TR/EN × 390×844/360×780 für Heute/Müll/Karte/Kühlung/Abschluss/Büro/Hilfe/Personal bestanden; Reduced Motion, Manifest/Icons/SVGs, Chromium-Installierbarkeit und genau ein aktueller App-Cache geprüft. Keine manuelle iPhone-Installation behauptet.

Übergaben aktualisiert: `docs/Sanji_2026-10-23_GastroCash_B_Arbeitsstand.md`, `docs/Sanji_2026-10-23_Produktreife.md`, `docs/sanji-protokoll.md`, `bruecke/stand.md` sowie diese Ergänzung. Das vollständige ursprüngliche Protokoll und die Übergabedokumente bleiben erhalten; Add/Add-Protokollkonflikt und Integrationsherkunft sind dokumentiert. Die vorherige Reihenfolge für einen separaten neuen Work-PR wird durch den ausdrücklichen Auftrag ersetzt, den bestehenden PR #7 fertigzustellen.

FÜR ZORO: PR #7 als zusammenhängenden Integrationsstand reviewen; L3-Rückgabestatus/sofortige Sicherung erhalten. Nicht-Messungen fachlich klären, Nutzen-Vertrag liefern; Kern unverändert.
FÜR FRANKY: GastroCash-Markenrecht, konkrete Hygiene-/Aufbewahrungs-/Datenschutzfragen und spätere Nutzen-/Steuertexte prüfen; Quellen mit Datum/Sicherheit im Produktreife-Dokument.
FÜR SANJI: Nur visuelle Kapitänsabnahme der vorhandenen SVG-Figur/L3, keine neue Bildwelt.
FÜR DEN KAPITÄN: integrierten B/C-/GastroCash-Stand prüfen. Merge und Veröffentlichung bleiben gesondert ausdrücklich freizugeben; kein automatischer main-Kandidat durch grünes CI.

Technischer Abschluss-Commit: [`e3fa3c5`](https://github.com/barisakacak-eng/gastrcalc/commit/e3fa3c5467fbf26a9177a77852e82a1dc9c91312). Die Dokumentationsfortsetzung ist ein separater nachfolgender Commit; endgültiger CI-/Head-Link im PR #7.
