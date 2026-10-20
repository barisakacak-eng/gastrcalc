# Auftrag an Sanji – 20.10.2026: Heute-Bildschirm als HTML-Entwurf (neues Verfahren)

Warum neu: Gemalte Entwürfe ließen sich nicht 1:1 bauen (Lorbeer wurde zu Strichen, Kursdiagramm zu Balken).
Ab jetzt lieferst du Entwürfe als lauffähiges HTML. Was im Entwurf läuft, läuft auch in der App.

## Lies zuerst (GitHub-Connector, Repo barisakacak-eng/gastrcalc, Branch main)
- css/design-b.css Zeilen 1–60 (Farb- und Form-Tokens, gelten live)
- js/screens/home.js (welche Inhalte der Heute-Bildschirm hat)
- js/lang/de.js, Schlüssel unter "heute", "cockpit", "ladenSchirm" (echte Texte – nichts dazuerfinden)

## Lieferung 1: entwurf-heute.html
- EINE Datei, HTML + CSS + JS darin, keine externen Bibliotheken, keine Web-Schriften außer "Manrope" mit Fallback system-ui.
- Breite 390 px (iPhone), Höhe frei; muss auch bei 360 px ohne waagerechtes Scrollen gehen.
- Nur Farben als CSS-Variablen mit den Namen aus design-b.css (--b-primaer, --b-akzent usw.). Keine neuen Farben ohne eigene Variable + Begründung im Kommentar.
- Inhalt (Laden-Modus, höchstens 15 Wörter sichtbar ohne Zahlen):
  1. Kopfzeile: Ladenname · Tag
  2. Cockpit „Bis null plus Zielgewinn“: große Zahl (Euro fehlen noch diesen Monat), darunter ein KURSDIAGRAMM: Linie mit gefüllter Fläche darunter, Tagesumsatz kumuliert über den Monat, waagerechte Ziellinie „null + Zielgewinn“, heutiger Punkt hervorgehoben. Als inline-SVG, Daten als JS-Array oben in der Datei (30 Tage Beispielzahlen, markiert als Beispiel).
  3. Ein Hauptknopf „Jetzt dran“ (eine Haupthandlung).
  4. Vier kleine Felder: Umsatz, Müll, Kühlung, Putzen.
- Jede Verzierung (z. B. Lorbeer, Kupferlinie, Textur) NICHT mit CSS nachmalen, sondern als eigene Bilddatei einbinden: <img src="verzierung-xyz.png">.

## Lieferung 2: Verzierungsdateien
- PNG mit durchsichtigem Hintergrund (RGBA), Dateiname verzierung-<name>.png, genau in der Größe, in der sie im Entwurf erscheint, mal 2 (für scharfe Handy-Anzeige). Beispiel: im Entwurf 120 × 40 px → Datei 240 × 80 px.
- Prüfe jede Datei per Python/Pillow: Modus RGBA, Ecken durchsichtig, Maße stimmen. Schreib das Ergebnis in die Liste unten.

## Lieferung 3: stempel.md
Für jedes sichtbare Element eine Zeile: Element · „geht genau so“ / „braucht Bilddatei“ / „Vorschlag, unsicher“.

## Abgabe
- Alles in EINE ZIP: entwurf-heute.zip (entwurf-heute.html, verzierung-*.png, stempel.md, ein Bildschirmfoto entwurf-heute.png in 390 px Breite).
- Baris speichert die ZIP in iCloud Drive/Zoro (oder schickt sie in den Zoro-Chat).
- Dazu EIN Kopierblock „FÜR ZORO:“ mit: Dateiliste mit Maßen, Pillow-Prüfergebnis, was du nicht geschafft hast.

## Nicht machen
- Kein Canvas (gibt es nicht mehr).
- Keine Markenlogos, keine Fotos echter Läden.
- Nichts ins Repo schreiben.

Abnahme durch Zoro: Ich baue danach den echten Bildschirm und lege ein Foto der App neben dein Bildschirmfoto. Nur wenn beide gleich aussehen, ist es fertig.
