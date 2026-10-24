FÜR ZORO:

ÜBERGABE AN ZORO
Aufgabe: Lieferung 2 – Zeki aus der verbindlichen Referenz, sechs Animationen.
Ergebnis: `assets/brand/zeki.svg`, unveränderte Referenzdatei `assets/brand/zeki-referenz.jpeg`, `css/zeki.css`, aktualisiertes `js/gastrocash-brand.js`, generierte Inline-Kopie `js/zeki-svg.js`, `design/zeki-abnahme.html`, Vergleichsbild und sechs GIFs unter `design/zeki-animationen/`. Willkommen und Heute sind als echte App-Aufnahmen unter `design/zeki-app-start.png` und `design/zeki-app-heute.png` dokumentiert. App-Icons und die bisherigen Marken-Dateien sind aktualisiert.
Empfehlung: Die Originalbildflächen in SVG-Gruppen verwenden. So bleiben die tatsächliche Figur, ihre Proportionen, Linien, Farben und Oberfläche erhalten. Alle sechs Bewegungen verwenden dieselbe Figur; keine eigene alternative Bot-Zeichnung.
Offene Fragen: Keine neue Entscheidung. Der echte iPhone-Test ist hier nicht durchführbar und bleibt ausdrücklich unbestätigt. Die einmalige Freigabe von Schablone und Marke gehört zu PR #15; Lieferung 3 beginnt erst danach.
Hinweise für den Code:
- Das ist ausdrücklich eine Hybrid-SVG: unveränderte lokale JPEG-Bildflächen innerhalb echter, beweglicher SVG-Gruppen. Keine vollständig aus Pfaden neu gezeichnete Figur; die JPEG-Vorlage enthält keine ursprünglichen Vektorpfade. Keine Bibliothek, kein Lottie, kein Canvas und keine fremde Bildquelle.
- Fester viewBox `0 0 237 328`. Alle geforderten IDs sind in der kanonischen Datei vorhanden: `zeki`, `kopf`, `auge-l`, `auge-r`, `lid-l`, `lid-r`, `mund-neutral`, `mund-grinsen`, `mund-o`, `arm-r`, `hand-r`, `koerper`, `muenze`.
- Inline werden diese Gruppen als `data-zeki-teil` adressiert. Clip-IDs erhalten je Instanz einen eigenen Präfix. Dadurch gibt es auch bei Kopfzeile, Hilfe und Abschluss keine doppelten IDs und kein Übergreifen von Animationen.
- `mascotMarkup(zustand, bewegung)` ist synchron. Die Vorlage wird aus derselben SVG-Datei erzeugt: nach Änderungen `python3 tools/zeki_bauen.py`. Dieser Befehl aktualisiert auch die bisherigen SVG-Markendateien. Lokale Bild-URLs werden über die Modul-URL aufgelöst, deshalb funktionieren App und Abnahmeseite unter beliebigen Unterpfaden.
- Zustände: neutral, freude, nachdenklich, warnung. Kompatibilität bleibt: freundlich/erfolg → freude, ernst → warnung. Die bestehenden Aufrufer funktionieren unverändert. `mascotResultState` bleibt unverändert; keine neue Ergebnisentscheidung.
- Bewegungen: zwinkern 0,7 s (Augenschluss etwa 0,25 s), grinsen 1 s, hand 1,2 s mit zwei Winkbewegungen, nicken 1 s mit zwei Wiederholungen, kopfschuetteln 1 s mit zwei Wiederholungen. Nur atmen läuft endlos und sehr leicht (3,6 s).
- Alte Bewegungsnamen bleiben kompatibel: idle → atmen, thumb/celebrate → hand, turn → kopfschuetteln. Keine dauernd zwinkernden Zustände. Die Abnahmeseite zeigt zunächst ausdrücklich die Referenzpose für den Seitenvergleich; der App-Standard ist neutral mit zwei offenen Augen.
- `zekiSpielen(element, bewegung)` nimmt die SVG oder deren Hülle entgegen, startet auch bei erneutem Tippen neu und entfernt die Klasse nach dem passenden `animationend`. Wechsel beendet den vorherigen Lauf. Ein Zeitlimit fängt entfernte oder verborgene Elemente ab. `none` stoppt die Bewegung. Bei reduzierter Bewegung wird nichts animiert; bei Zwinkern und Grinsen bleibt ein ruhiger Endzustand bis zur nächsten Aktion.
- CSS animiert nur transform und opacity. Kopf dreht am Hals, Arm an der Schulter. Keine Filter-, Größen- oder Positionsanimationen.
- Die PNG-App-Icons sind exakte Ausschnitte der Original-App-Icon-Komposition, keine neue Interpretation. Maskable hat einen eigenen 10-%-Rand. Herstellung und GIF-Aufnahme: `python3 tools/zeki_abnahme.py` (nur Entwicklungswerkzeuge Playwright/ffmpeg).
- Neue Farbwerte für die Gesichtszustände liegen ausschließlich als benannte Zeki-Tokens in `css/tokens.css`. Die eigentliche Referenz bleibt farblich unverändert. Bestehende Bildschirm-Tokens bleiben unverändert.
- `tools/sw_liste.py` berücksichtigt nun auch `.jpeg`, damit genau diese Originaldatei offline verfügbar ist. Service Worker und Fassung wurden ausschließlich durch das Skript erzeugt. Kein manuelles Bearbeiten von sw.js.
- Design-Texte in DE/TR/EN sind identisch mit Lieferung 1. `index.html` lädt lediglich die neue lokale CSS-Datei. Rechenkern, Speicherung, Navigation und die ausdrücklich gesperrten Dateien bleiben unangetastet.

Prüfstand:
- Beide vollständigen Node-Läufe: 693 bestanden, 5 bestehend ausgelassen, 0 Fehler (UTC und Europe/Berlin).
- Alle 18 Sprachtabellen grün.
- Bildschirm-Regelprüfung: keine Verletzung. Personal-Durchlauf grün.
- `python3 tests/zeki_browser.py`: alle sechs CSS-Animationen starten; einmalige Läufe enden; erneutes Tippen, Bewegungswechsel, mehrere Figuren und reduzierte Bewegung sind geprüft.
- Willkommen und Heute im echten Browser aufgenommen; anschließend Heute offline neu geladen, Zeki vollständig vorhanden.
- Vollständiger Work-Durchlauf: 12/12 grün (Döner und Burger, DE/TR/EN, 390 × 844 und 360 × 780; ZIP-Sicherung, Wiederherstellung, Offline und Nutzen-Zustände). Frühere parallele Läufe hatten einen gelegentlichen Timeout im bereits bestehenden Menü-Test nach der Müll-Station. Kein Eingriff in App-Navigation und keine Abschwächung dieses Tests.

Zusammenführen: eigener PR gegen main, kein Merge durch Sanji. Werden PR #15 und dieser PR nacheinander übernommen, danach einmal `python3 tools/sw_liste.py` ausführen, um die gemeinsame Offline-Liste und Fassung neu zu erzeugen. Die beiden generierten Dateien sind die erwarteten Überschneidungen.
