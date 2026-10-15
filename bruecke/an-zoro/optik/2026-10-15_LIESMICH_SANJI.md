# Sanji – Optiklieferung „Kräuter & Kupfer“
**Datum:** 15.10.2026  
**Basis:** GitHub `barisakacak-eng/gastrcalc`, `main`, Visual-Vertrag `bruecke/visual-vertrag.md` (aktueller Stand am 15.10.).  
**Freigabe:** Baris hat **Kräuter & Kupfer** als Optikrichtung gewählt. „GastroCalc“ bleibt nur der vorläufige Name; Markenrechte sind **nicht geprüft**.

## Dateien zum Übernehmen
- `css/tokens.css`: vollständige Datei mit allen bisher bestehenden Variablennamen; gewählte Palette Kräuter & Kupfer, Bedeutungsfarben, Radien, Schatten, Systemschrift. **Vollständig ersetzen.**
- `css/optik.css`: **neue** Styleschicht nach `css/app.css`; Erscheinungsbild für Start, Karten, Cockpit, Instrumente, Vergleich, Müll, Foto, Eingabeblatt, Navigation, Schätz-/Eigen-/Branchenwerte. **Neue Datei anlegen.**
- `bilder/*.svg`: **59 originär gezeichnete, lokale Piktogramme**, genau entsprechend der ersten Welle im Visual-Vertrag; je SVG unter 20 KB.
- `icons/logo.svg`, `icons/icon-180.png`, `icons/icon-192.png`, `icons/icon-512.png`: temporäre GastroCalc-Wortmarke, Blattzeichen und drei lokal nutzbare App-Symbole.
- Keine `fonts/`-Dateien: aktuell native **Systemschrift**, keine externen Requests. Eine andere Schrift darf später nur mit nachweislich zulässiger SIL-OFL-Datei ergänzt werden.

## Optische Bedeutung
- **Papier** `#F5EBDD`, **Tinte** `#1F2A24`, **Salbei** `#60734E`, **Salbei tief** `#2E4034`, **Kupfer** `#D28742`.
- **Müll** `#8C2F39` (gedecktes Weinrot); **eigene Werte** `#355F3F` (Grün); **Branchenwerte** `#365D75` (Blau).
- **Schätzwerte** `≈`, gelb gestrichelte Kontur (`#BB871C`) und helles Gelb (`#FFF1D4`); Prognose in der Monatskurve gestrichelt, Ist-Linie durchgezogen.
- Hauptaktionen bleiben an der bestehenden Stelle; Kupfer-Knopf mit **dunkler Schrift** (nicht weiß). Ruhe im Finanzbereich, große Arbeitsflächen in der Küche.
- Digitale Werte mit Tabellenziffern; Mindestschrift für zahlreiche kleine Textklassen auf 15px angehoben; bestehende Kacheln dürfen umbrechen.
- Kleine Übergänge bei Interaktionen, keine dauerhafte animierte Kurve, `prefers-reduced-motion` berücksichtigt.

## Technik / Schutz von Zoros Arbeit
- **Nicht verändert:** `js/`, HTML, `css/app.css`, Klassennamen, data-Attribute, Rechenlogik, Reihenfolge, Datenmodelle, Öffnungszustände und feste Positionen von Menü, Blatt, Schnellknopf.
- CSS überschreibt bestehende Klassen. Es kommt **nicht** zu einem JS-Eingriff oder einer nachträglichen Neuberechnung. Die vorhandene dynamische Zähler-Gradientenlogik bleibt erhalten.
- Auf `main` existiert bereits die Einbindung von `css/optik.css` nach `css/app.css` in App und Baukasten (gelesen am 15.10.); nicht erneut einbinden.

## Prüfungen vor Lieferung
- CSS mit `tinycss2` syntaktisch geprüft; SVG-Dateien mit XML-Parser geprüft; Dateinamen und PNG-Abmessungen geprüft.
- Mathematisch berechnete Kontrastpaare: Text dunkel auf Papier/Weiß, weicher Text auf Weiß, Weiß auf dunklem Salbei/Weinrot, dunkler Text auf Kupfer und gelbem Schätzwertgrund jeweils **mindestens 4,5:1**.
- **Noch nicht durchgeführt:** ein vollständiger Browser-Rundgang durch alle 12 Ansichten mit echtem App-Zustand, tatsächliche Messung aller dort vorhandenen Schriftgrößen, visuelle Prüfung von 40 % längeren Türkisch-Texten und alle automatisierten Tests nach Einbau. Die entsprechenden Aussagen sind daher kein vorgetäuschter Browser-Test.

## Offene Punkte für Zoro
1. Die Dateien in einem eigenen Design-Zweig übernehmen, Tests ausführen, Screenshots im Baukasten für **390px** auf DE/TR/EN kontrollieren, dann als PR zur optischen Freigabe durch Baris vorlegen. **Kein sofortiger Merge/Release.**
2. Zählen weitere Widgets als Touch-Flächen unter 48px? Das kann nur der reale Browser zeigen; Sanji hat viele existierende Klickziele mit `min-height:48px` ausgestattet.
3. Wenn die dynamisch erzeugten Texte bereits „≈“ enthalten, kann der CSS-Präfix an `.stempel-schaetzung` doppelt erscheinen. Bitte in den realen Daten prüfen; gegebenenfalls schlage ich eine rein optische Korrektur vor (Texte/JS nicht selbst ändern).
4. Ist der Schriftgrößenanstieg in den 2-Spalten-Cockpitinstrumenten und bei langen türkischen Gerichten ohne Abschneiden lesbar? Ggf. optische Nachbesserung von Sanji.
5. Name „GastroCalc“ und Zeichen sind vor einer externen Veröffentlichung markenrechtlich noch zu prüfen. Keine Markenfreigabe mit dieser ZIP verbunden.

## Bilddateien (erste Welle, 59 SVG)
- ``bilder/g-asia-nudeln.svg
- ``bilder/g-boerek.svg
- ``bilder/g-box.svg
- ``bilder/g-burger.svg
- ``bilder/g-currywurst.svg
- ``bilder/g-doener.svg
- ``bilder/g-duerum.svg
- ``bilder/g-falafel.svg
- ``bilder/g-lahmacun.svg
- ``bilder/g-nudeln.svg
- ``bilder/g-pide.svg
- ``bilder/g-pizza.svg
- ``bilder/g-pommes.svg
- ``bilder/g-salat.svg
- ``bilder/g-seele.svg
- ``bilder/g-teller.svg
- ``bilder/k-kuehlschrank.svg
- ``bilder/k-theke.svg
- ``bilder/k-tiefkuehler.svg
- ``bilder/kamera.svg
- ``bilder/laden-anders.svg
- ``bilder/laden-asia.svg
- ``bilder/laden-baeckerei.svg
- ``bilder/laden-burger.svg
- ``bilder/laden-cafe.svg
- ``bilder/laden-doener.svg
- ``bilder/laden-foodtruck.svg
- ``bilder/laden-pizza.svg
- ``bilder/m-eimer.svg
- ``bilder/m-tonne.svg
- ``bilder/rechnung.svg
- ``bilder/selbst-ayran.svg
- ``bilder/selbst-brot.svg
- ``bilder/selbst-dumplings.svg
- ``bilder/selbst-lahmacun.svg
- ``bilder/selbst-patty.svg
- ``bilder/selbst-salat.svg
- ``bilder/selbst-sossen.svg
- ``bilder/selbst-spiess.svg
- ``bilder/selbst-teig.svg
- ``bilder/selbst-tomatensosse.svg
- ``bilder/w-brot.svg
- ``bilder/w-doenerfleisch.svg
- ``bilder/w-ei.svg
- ``bilder/w-feta.svg
- ``bilder/w-getraenk.svg
- ``bilder/w-gurke.svg
- ``bilder/w-hack.svg
- ``bilder/w-haehnchen.svg
- ``bilder/w-kaese.svg
- ``bilder/w-kohl.svg
- ``bilder/w-mehl.svg
- ``bilder/w-pommes-tk.svg
- ``bilder/w-salat.svg
- ``bilder/w-sosse.svg
- ``bilder/w-spinat.svg
- ``bilder/w-tomate.svg
- ``bilder/w-zwiebel.svg
- ``bilder/waage.svg
