# GastroCalc · Design B „Klar & Modern“ · Bauanleitung

**Status: FREIGEGEBENER VISUELLER ENTWURF, KEIN PRODUKTIVCODE.** Referenz: freigegebenes 10-Screen-Board vom 19.10.2026. Das vorhandene Repository `barisakacak-eng/gastrcalc` enthält bislang „Kräuter & Kupfer“; Zoro führt die Integration aus, ohne Geschäftslogik oder `data-*`-Attribute zu verändern.

## 0. Übergabe, Genauigkeit und Widersprüche

- `screens/01.png` bis `screens/10.png`: jeweils **1170 × 2532 px**. Sie sind **aus dem freigegebenen 1536 × 1024 px großen Gesamtboard ausgeschnitten und hochskaliert**, **nicht** zehn unabhängige Original-Renderings in nativer Auflösung. Die Schrift ist daher kein pixelgenauer Maßstab; verbindlich sind die Maße unten. Die Screens enthalten innerhalb des Bildes bereits die gezeigten Speisefotos; **keine separaten Speisefoto-Dateien** sind enthalten. Die App nutzt ihre eigenen Fotos.
- Die gezeigten Screens enthalten mehr als 15 Wörter; die vom Kapitän gleichzeitig verlangten vollständigen Informationen widersprechen dem 15-Wörter-Ziel. **Zoro soll die freigegebenen Inhalte nicht eigenmächtig streichen**. Das Ziel betrifft die eigentliche Blickführung, nicht die Behauptung, der Bildentwurf halte die Wortgrenze ein.
- Der freigegebene Screen 9 trägt den Wortlaut „Per WhatsApp bestellen“ und damit einen fremden Markennamen. Weil keine neue Marke hinzugefügt werden darf, ist dies als **bestehender Widerspruch in der Vorlage** dokumentiert. Vor der öffentlichen Darstellung/Umsetzung ist vom Kapitän zu entscheiden, ob die neutrale Beschriftung „Bestellung teilen“ zulässig ist. Die Referenzgrafik wurde nicht verändert.
- **Kontrast:** `--akzent` #FF7A3D mit `--text` #0F1720: ca. **6,96:1** (AA). Weiß auf `--primaer`: ca. **12,16:1**. `--rot` #D64545 auf Weiß: ca. **4,38:1**, daher für normalen Text `--rot-text` benutzen; `--rot` nur für Symbole/Flächen und große Akzente. Gelb nicht als normaler Text auf Weiß verwenden; `--gelb-text` benutzen. Kontraste sind für diese Farbkombinationen berechnet, die echte App muss im Browser geprüft werden.
- `--karte`, `--text-leise`, `--linie`, `--rot-hell`, `--rot-text`, `--gelb-hell`, `--gelb-text`, `--gruen-ok` sind **technisch ergänzte, im Board nicht ausdrücklich definierte Farbwerte**. Keine neue Designrichtung, sondern erforderliche Zustandsfarben; vor Einbau gegen Zoros bestehende Tokens prüfen.
- **Schrift:** Manrope, Google Fonts, Gewichte 400/500/600/700/800. Für Offline-Betrieb lokal als WOFF2 mit OFL-Lizenz einbinden; keine Google-Fonts-CDN-Verbindung. Keine Font-Datei in der ZIP.
- **Icons:** ausschließlich Lucide, die unten genannten Namen sind die offiziellen Icon-Namen in kebab-case; lokal bereitstellen, keine CDN-Ladung. SVG-Striche `currentColor`.
- **Raster:** CSS-Referenzbreite 390 px, Höhe 844 px, `box-sizing: border-box`, Safe-Area mit `env(safe-area-inset-*)`, Statusleiste im Bild ist nur eine Illustration; iOS-Web-App rendert die echte Statusleiste selbst. Hauptknöpfe 56 px, sekundäre Touchflächen mindestens 48 px. Eine primäre Handlung je Screen.
- **Navigation:** Die fünf festen Reiter heißen **Heute · Müll · Kühlung · Putzen · Karte**. **Büro nur über ☰ und Code**, nicht in der unteren Leiste. Im Büro und in Arbeitsblättern bleibt der vorhandene Navigationsfluss maßgeblich.

## 1. Grundsystem

Alle Farbwerte, Schriften, Abstände und Maße stehen als Variablen in `tokens.css`; keine zusätzlichen HEX-Werte in den Komponenten festschreiben. `--schrift-zahl` 32/800 mit `--zeile-zahl` 1.10; Titel 20/700 mit 1.25; Text 16/600 oder 16/400 mit 1.45; Metadaten 14/500 mit 1.35; Fußnoten 12/500 mit 1.35. Alle Zahlen `font-variant-numeric: tabular-nums`. Texte in TR/EN bis +40 % Länge testen. Keine harten Höhen für Textbereiche mit Zeilenumbruch, außer dort, wo unten ein Mindestmaß steht.

**Standardseiten:** Hintergrund `--hintergrund`; 16 px seitlicher Abstand; 12 px zwischen normalen Karten; 8 px innerhalb kompakter Listen; 24 px Abstand vor Abschnittswechseln. Karte `--karte`, Rand 1 px `--linie`, Radius `--radius-karte`, Schatten `--schatten-karte`. Icons 20–24 px, Strichstärke 2, niemals Emoji in produktiven UI-Bausteinen.

## 2. Bausteine – verbindliche Maße und Zustände

Maße sind CSS-Pixel bei 390 px Viewport. „Gedrückt“ heißt optisch: Schatten entfernen und `transform: translateY(1px)` (180 ms). „Deaktiviert“ heißt `opacity:.45`, aber Textlesbarkeit und nicht allein Farbe beachten; `disabled`/`aria-disabled` semantisch setzen. Alarm: `--rot-hell` mit `--rot-text` für Text, `--rot` für Icon. Leer: konkrete nächste Aktion, nie ein nacktes „–“.

### Kopfleiste Laden

- **Maße:** 390 × 56, horizontal 16, vertikal 8; Menü- und Hilfe-Touchflächen je 48 × 48; Logo 36 × 36.
- **Farben (nur Tokens):** --hintergrund.
- **Schrift:** 20/700 Titel oder Logo, 14/500 Datumszeile.
- **Lucide:** `menu, circle-help, bell`.
- **Zustände:** Normal: Menü/Logo/Hilfe; gedrückt: Hintergrund --primaer-hell; deaktiviert: Icons ausgegraut; Alarm: nur Alarm-Punkt; leer: Logo bleibt.

### Kopfleiste Büro

- **Maße:** 390 × 56, horizontal 16; Zurückfläche 48 × 48; Titel einzeilig.
- **Farben (nur Tokens):** --hintergrund.
- **Schrift:** 20/700 Titel.
- **Lucide:** `arrow-left, circle-help`.
- **Zustände:** Normal: „Laden · Büro“; gedrückt: Zurückfläche --primaer-hell; deaktiviert: kein Büro ohne Code; Alarm: Hinweis-Chip darunter; leer: gleicher Kopf.

### Hauptzahl-Karte mit Balken

- **Maße:** 358 × 138 Mindesthöhe; Innenabstand 16; Balken 326 × 12, Radius 999; Radius Karte 14.
- **Farben (nur Tokens):** --primaer, --auf-dunkel, --akzent.
- **Schrift:** 14/600 Einleitung, 32/800 Zahl, 12/600 Vergleich.
- **Lucide:** `trending-up`.
- **Zustände:** Normal: Fortschrittsbalken; gedrückt: keine Navigation; deaktiviert: nicht anwendbar; Alarm: Zahl/Status textlich kennzeichnen, nicht nur Farbe; leer: „Umsatz eintragen“ statt fiktiver Null.

### Kachel mit Wert

- **Maße:** 173 × 68 Mindesthöhe; Innenabstand 12; Radius 12.
- **Farben (nur Tokens):** --karte, --linie, --text, --gruen-ok, --rot-text.
- **Schrift:** 12/600 Label, 16/800 Wert.
- **Lucide:** `chart-no-axes-column-increasing, trash-2, snowflake, droplet`.
- **Zustände:** Normal: Wert; gedrückt: --primaer-hell; deaktiviert: .45; Alarm: --rot-hell plus Text; leer: siehe nächste Kachel.

### Kachel leer (erster Handgriff)

- **Maße:** 173 × 62 Mindesthöhe; Innenabstand 12; Radius 12.
- **Farben (nur Tokens):** --karte, --linie, --text-leise.
- **Schrift:** 12/600 Label, 14/600 Handgriff.
- **Lucide:** `trash-2, snowflake, droplet`.
- **Zustände:** Normal/leer: „Müll eintragen“, „Kühlrundgang starten“, „Putzplan einrichten“; gedrückt: --primaer-hell; deaktiviert: .45; Alarm: nicht automatisch rot.

### „Jetzt dran“-Karte

- **Maße:** 358 × 72 Mindesthöhe; Innenabstand 12; Radius 14; eingebetteter CTA 56 × 48.
- **Farben (nur Tokens):** --karte, --linie, --akzent, --aktion-text.
- **Schrift:** 12/600 Kontext, 14/700 Aufgabe, 14/700 CTA.
- **Lucide:** `clipboard-check, arrow-right`.
- **Zustände:** Normal: genau eine Aktion; gedrückt: CTA Schatten weg; deaktiviert: CTA .45; Alarm: Kontext --rot-text; leer: erste Aufgabe.

### Knopf Haupt

- **Maße:** Breite flexibel bis 358; Höhe 56; Innenabstand 16; Radius 12.
- **Farben (nur Tokens):** --akzent, --aktion-text.
- **Schrift:** 16/800, line-height 1.25.
- **Lucide:** `arrow-right, refresh-cw, save`.
- **Zustände:** Normal: orange/dunkel; gedrückt: translateY(1px); deaktiviert: .45; Alarm: Text nennt Aktion; leer: nur aktiv, wenn sinnvoll.

### Knopf zweit

- **Maße:** Breite flexibel; Mindesthöhe 48; Innenabstand 12/16; Radius 12; Rand 1.
- **Farben (nur Tokens):** --karte, --primaer, --linie.
- **Schrift:** 14/700.
- **Lucide:** `chevron-down, arrow-left`.
- **Zustände:** Normal: weiß/dunkelgrün; gedrückt: --primaer-hell; deaktiviert: .45; Alarm: Textwarnung daneben; leer: neutral.

### Leiste unten (5 Reiter)

- **Maße:** 390 × 64 plus safe-area unten; fünf Felder je 78 × 64; Icon 20; Radius oben 12.
- **Farben (nur Tokens):** --karte, --primaer, --text-leise, --linie.
- **Schrift:** 12/600 Label.
- **Lucide:** `house, trash-2, snowflake, droplet, utensils`.
- **Zustände:** Aktiv: --primaer, 700; inaktiv: --text-leise, 500; gedrückt: --primaer-hell; deaktiviert: .45; Alarm: kleiner Punkt plus Text; leer: Reiter bleibt.

### Listenzeile mit Pfeil

- **Maße:** 358 × 64 Mindesthöhe; Innenabstand 12; Radius 12.
- **Farben (nur Tokens):** --karte, --linie, --text.
- **Schrift:** 14/700 Titel, 12/500 Zusatz.
- **Lucide:** `chevron-right`.
- **Zustände:** Normal: Chevron rechts; gedrückt: --primaer-hell; deaktiviert: .45; Alarm: Text --rot-text; leer: nächster Handgriff.

### Messwert-Zeile (OK/zu warm)

- **Maße:** 358 × 82 Mindesthöhe; Innenabstand 12; Radius 14.
- **Farben (nur Tokens):** --karte, --rot-hell, --rot-text, --gruen-ok.
- **Schrift:** 14/700 Name, 20/800 Temperatur, 12/600 Status.
- **Lucide:** `thermometer, snowflake, chevron-right`.
- **Zustände:** Normal/OK: grüner Punkt + „OK“; Alarm: hellrot + „Zu warm“; gedrückt: Hintergrundwechsel; deaktiviert: .45; leer: „Jetzt messen“.

### Abhak-Zeile

- **Maße:** 358 × 60 Mindesthöhe; Innenabstand 12; Radius 8.
- **Farben (nur Tokens):** --karte, --linie, --gruen-ok.
- **Schrift:** 14/700 Aufgabe, 12/500 Uhrzeit.
- **Lucide:** `square, square-check-big`.
- **Zustände:** Normal: leeres Quadrat; gedrückt: Aktivierung; erledigt: grüne Markierung + Zeit; deaktiviert: .45; Alarm: Textwarnung; leer: „Putzplan einrichten“.

### Speisefoto-Kachel mit „+“

- **Maße:** 173 × 130 Mindesthöhe; Bild 173 × 86, object-fit cover; Textbereich 44; Plus-Touchfläche 48 × 48; Radius 12.
- **Farben (nur Tokens):** --karte, --linie, --rot-text.
- **Schrift:** 14/700 Name, 12/500 Portionen.
- **Lucide:** `plus`.
- **Zustände:** Normal: eigenes Gerichtsfoto; gedrückt: --primaer-hell; deaktiviert: .45; Alarm: optional Warntext; leer: vorhandenes Platzhalterbild aus App, keine neue Fotodatei.

### Filter-Chip

- **Maße:** Mindesthöhe 40 visuell, Touchfläche 48; horizontal 12; Radius 999.
- **Farben (nur Tokens):** --primaer-hell, --primaer, --akzent-hell.
- **Schrift:** 12/700.
- **Lucide:** `filter, alert-triangle`.
- **Zustände:** Normal: neutral; aktiv: farbiger Hintergrund + Text; gedrückt: dunkler Rand; deaktiviert: .45; Alarm: Zahl und Wort, nicht nur Rot; leer: 0 anzeigen oder ausblenden nach vorhandener Logik.

### Preis-Blatt (−/+)

- **Maße:** 358 × 270 Mindesthöhe; Innenabstand 16; Radius 18; +/- je 48 × 48; Speichern 56.
- **Farben (nur Tokens):** --karte, --linie, --akzent, --aktion-text.
- **Schrift:** 14/700 Name, 20/800 Deckungsbeitrag, 16/700 Preis.
- **Lucide:** `minus, plus, x, save`.
- **Zustände:** Normal: offenes Blatt; gedrückt: +/- Rückmeldung; deaktiviert: Speichern .45; Alarm: Preiswarnung textlich; leer: kein erfundener Deckungsbeitrag.

### Ordner-Kachel mit Status

- **Maße:** 110 × 104 Mindesthöhe; Innenabstand 8; Radius 12; Icon 28.
- **Farben (nur Tokens):** --karte, --linie, --rot-hell, --gelb-hell, --text-leise.
- **Schrift:** 12/700 Ordnername, 12/700 Status.
- **Lucide:** `folder, folder-open`.
- **Zustände:** Normal: Ordner + Status; gedrückt: --primaer-hell; deaktiviert: .45; Alarm: „0 von 3“ mit --rot-text; leer: „noch leer“ statt „–“.

### Bereichszeile im Büro

- **Maße:** 358 × 60 Mindesthöhe; Innenabstand 12; Radius 12.
- **Farben (nur Tokens):** --karte, --linie, --primaer-hell, --rot-hell.
- **Schrift:** 14/700 Titel, 12/600 Stand.
- **Lucide:** `chart-no-axes-column-increasing, shopping-cart, utensils, store, chevron-right`.
- **Zustände:** Normal: Titel+Stand; gedrückt: --primaer-hell; deaktiviert: .45; Alarm: Waren rot-hell und Text rot-text; leer: ersten Schritt benennen.

### Hinweis-Chip

- **Maße:** 358 × 48 Mindesthöhe; Innenabstand 12; Radius 12.
- **Farben (nur Tokens):** --primaer-hell, --primaer, --linie.
- **Schrift:** 12/600 Text.
- **Lucide:** `lock-keyhole, info`.
- **Zustände:** Normal: ein Hinweis; gedrückt: falls Link --primaer-hell; deaktiviert: .45; Alarm: --rot-hell mit Text; leer: Chip ausblenden.

### Mengen-Zeile (−/+)

- **Maße:** 358 × 64 Mindesthöhe; Innenabstand 8/12; Radius 10; +/- je 48 × 48.
- **Farben (nur Tokens):** --karte, --linie, --text.
- **Schrift:** 14/700 Name, 12/500 Einheit, 16/800 Menge.
- **Lucide:** `minus, plus`.
- **Zustände:** Normal: Menge und Einheit; gedrückt: Rückmeldung; deaktiviert: .45; Alarm: Fehlbestand textlich; leer: „Menge eintragen“ statt fiktiver Zahl.

### Erfolgsbildschirm

- **Maße:** 358 × 360 Mindesthöhe; Innenabstand 20; Erfolgsicon 64; Knopf 358 × 56.
- **Farben (nur Tokens):** --hintergrund, --primaer, --gruen-ok, --akzent.
- **Schrift:** 20/800 Kernaussage, 14/600 Haken, 32/800 Ergebnis.
- **Lucide:** `check, circle-check, trophy`.
- **Zustände:** Normal: drei erledigte Schritte; gedrückt: CTA; deaktiviert: CTA .45; Alarm: nicht als Erfolg darstellen; leer: keine erfundenen Beträge.

## 3. Reihenfolge der zehn Screens

**01 Willkommen:** Statusleiste (nur OS) → Logo (96 × 96, 24 Abstand) → Titel (20/800) → Kurztext (16/400, 16 Abstand) → Sprachfeld als Listenzeile (16 Abstand) → Hauptknopf „Weiter“ (12 Abstand) → Textlink „Sicherungsdatei einlesen“ (16 Abstand). Keine untere Leiste. Hauptaktion: Weiter.

**02 Heute:** Kopfleiste Laden → Datum (8) → Hauptzahl-Karte (12) → Kachel-Raster 2×2, 8 zwischen Kacheln (12) → Jetzt-dran-Karte (12) → Leiste unten am Viewport-Ende. Hauptaktion: Los.

**03 Heute (erster Tag):** Wie 02, aber Raster mit Kachel leer; nicht mit Nullwerten auffüllen. Hauptaktion: Los.

**04 Müll:** Kopfzeile mit Zurück (12) → Summenkarte 358 × 92 (12) → Speisefoto-Kacheln 2 Spalten × 4 Reihen, 8 Lücke (12) → Knopf zweit „Weitere Gerichte“ (8) → Leiste unten. Plus-Tasten sind die Handlung, keine zweite orange CTA.

**05 Kühlung:** Kopfzeile (12) → vier Messwert-Zeilen mit je 8 Abstand (12) → Hauptknopf „Nachmessen“ (12) → Leiste unten. Alarm steht an erster Stelle; kein erfundener neuer Messwert.

**06 Putzen:** Kopfzeile (16) → Fortschrittsring 112 × 112 (16) → Abhak-Zeilen je 0–4 Abstand, Trennlinie (12) → Leiste unten. Haken sind die Handlung.

**07 Karte:** Kopfzeile (12) → Filter-Chips (12) → Gerichte als Listenzeilen (8) → offenes Preis-Blatt (12) → Hauptknopf „Speichern“ innerhalb des Blatts → Leiste unten. Kein zweiter CTA.

**08 Büro:** Kopfleiste Büro (8) → Hinweis-Chip (12) → drei Ordner-Kacheln in einer Reihe, 8 Lücke (12) → vier Bereichszeilen mit 8 Abstand. **Keine Büro-Registerkarte**; Zugang nur über Menü und Code.

**09 Lager & Bestellen:** Kopfzeile (12) → Waren-Summenkarte 358 × 104 (12) → drei Mengen-Zeilen, 8 Abstand (8) → Knopf zweit „+ 3 weitere“ (12) → Hauptknopf „Per WhatsApp bestellen“ laut freigegebenem Bild. Markenfrage vor Veröffentlichung klären.

**10 Tag abschließen:** Kopfzeile (24) → Erfolgsicon 64 (20) → drei Abhak-/Erfolgszeilen mit 8 Abstand (24) → Ergebnis „410 € näher an null“ (24) → Hauptknopf „Zum Cockpit“. Kein zusätzlicher Button.

## 4. Umsetzungs- und Abnahmehinweise an Zoro

1. Bestehende JS-/Rechenlogik, `data-a`, `data-f`, `data-id`, `data-wert`, Klassennamen, Routen und Speichervorgänge nicht ändern. **Alle Zahlen auf dem Board sind illustrative Beispielwerte**, echte Werte kommen aus Zoros Rechenkern.
2. Die bestehende Datei `css/tokens.css` hat andere Token-Namen und eine Inter-Fontdefinition. Diese Lieferung ist eine **Designsystem-Vorlage**, kein direktes Drop-in-Replacement. Token-Namen auf bestehende Klassen mappen, keine Funktion überschreiben. Offline-Manrope lokal bereitstellen.
3. Die Referenz ist ein generiertes Designboard; Screenshots dürfen nicht als Oberfläche eingesetzt werden. Fotos kommen aus dem App-Katalog; keine separaten Bilddateien beigefügt.
4. Responsive: 390 × 844 als Referenz; 320–430 px prüfen, iPhone Safe-Area und Tastatur berücksichtigen; TR/EN auf Überläufe prüfen; Fokuszustand mit sichtbarer Kontur (2 px `--primaer`).
5. Sichtprüfung: Weiß nur auf Dunkelgrün, auf Orange immer `--text`; Warntext nie `--rot` auf Weiß, sondern `--rot-text`. Farbstatus zusätzlich mit Wort und Icon. Hauptknopf 56 px; alle Bedienelemente mindestens 48 px.
6. Der aktuelle Stand der Brücke ist teilweise älter als die Freigabe vom 19.10.2026. **Der neueste Auftrag des Kapitäns gilt für diese Designlieferung.** Kein Push, Merge oder Release ohne ausdrückliches Go.

## 5. Dateien

- `tokens.css` – CSS-Variablen und Werte
- `bauanleitung.md` – dieses Dokument
- `screens/01.png` … `screens/10.png` – einzeln zugeschnittene, hochskalierte Referenzen
- `logo.svg` – farbiges Vektorlogo (Servierhaube, orange Flamme)
- `logo_einfarbig.svg` – einfarbiges Vektorlogo mit `currentColor`

**FÜR ZORO:** Fertig: Freigegebenes Design B als CSS-Tokens, 19 Baustein-Spezifikationen, zehn Screen-Reihenfolgen, zehn Referenzbilder und zwei SVG-Logos. Datei: `gastrocalc_design_b.zip`. Aufgabe: Als Entwurf übernehmen, mit bestehenden App-Strukturen mappen, Kontrast/Wortgrenzen/Markenfrage prüfen, erst nach Kapitän-Go produktiv veröffentlichen.
