# Visual-Vertrag: wer was an der App macht (seit 14.10.2026)

**Entscheidung des Kapitäns, 14.10., 19:24:**
- **Zoro (Claude)** baut Inhalt, Logik, Rechenwerk, Texte, Datenflüsse und Bildschirm-Aufbau.
- **Sanji (ChatGPT)** übernimmt die komplette Optik: Farben, Schrift, Logo, App-Symbol, Bilder und Piktogramme, Abstände, Formen, Diagramm-Stil, Bewegungen.
- Zoro macht ab jetzt keine Optik-Vorschläge mehr.

## Was Sanji ändern darf
| Bereich | Datei/Ort | Regel |
|---|---|---|
| Farben, Schrift, Radien, Schatten | `css/tokens.css`, ab Etappe 6 (bis dahin `:root` oben in `css/app.css`) | frei |
| Aussehen aller Bausteine | **`css/optik.css`** (seit 15.10.: eigene Datei, wird nach `app.css` geladen und überschreibt sie; nur Eigenschaften wie color, background, border, radius, shadow, font, padding, gap, Animation) | frei, solange die Klassennamen bleiben. `app.css` selbst nicht abgeben – dort baut Zoro weiter |
| Bilder und Piktogramme | `bilder/` (SVG, je Motiv eine Datei, Namen siehe Bildliste unten) | frei, nur SVG oder WebP, je Datei unter 20 KB |
| Logo und App-Symbol | `icons/` (icon-180.png, icon-192.png, icon-512.png, logo.svg) | frei |
| Schriften | `fonts/` | nur freie Lizenz (SIL OFL), lokal mitgeliefert, keine Google-Fonts-Verbindung (Datenschutz, offline) |

## Was Sanji NICHT ändert (sonst geht die App kaputt)
- **JavaScript:** alles unter `js/`, auch nicht „nur kurz“.
- **Attribute im HTML der Bildschirme:** `data-a`, `data-f`, `data-id`, `data-wert`. Daran hängen die Knöpfe.
- **Klassennamen:** keine entfernen und keine umbenennen. Neue Klassen nur in Absprache über `an-zoro/`.
- **Texte und Übersetzungen** (`js/lang/`): Vorschläge gehen als Liste nach `an-zoro/`.
- **Rechenwerte, Zahlenformate, Reihenfolge der Bildschirme:** bleiben, wie sie sind.

## Arbeitsweise
1. **Ansehen:** Live-App unter https://barisakacak-eng.github.io/gastrcalc/. Ab Etappe 6 gibt es zusätzlich den Baukasten unter `/design/`, eine Seite mit allen Bausteinen (Knöpfe, Karten, Kacheln, Diagramme, Blätter) und Beispieldaten.
2. **Liefern, je nachdem was geht:**
   - a) ChatGPT/Codex kann ins Repo schreiben: Zweig `design/<datum>-<thema>` und Pull Request. Nie direkt auf `main`.
   - b) Kein Schreibzugriff (Stand 15.10.: ChatGPT liest GitHub nur): **eine ZIP `sanji_optik_JJJJ-MM-TT.zip`** mit genau den Repo-Pfaden (`css/tokens.css`, `css/optik.css`, `bilder/…`, `icons/…`, `fonts/…`) plus `LIESMICH_SANJI.md` (was geändert, welche Variante, offene Fragen). Baris lädt sie zum Herunterladen und legt sie im Chat bei Zoro ab.
   - c) Ausweichweg ohne Chat: Baris lädt die ZIP im Browser in den Brückenordner hoch: https://github.com/barisakacak-eng/gastrcalc/upload/main/bruecke/an-zoro/optik (Zoro prüft den Ordner bei jedem Brückencheck).
3. **Zoro prüft:**
   - Tests und Durchläufe laufen.
   - Keine Klasse und kein `data-`-Attribut ist kaputt.
   - Kontraste liegen bei mindestens 4,5 : 1 für Text.
   - Danach übernimmt Zoro die Änderung und veröffentlicht sie. Ein Bild vorher/nachher bekommt Baris.
4. **Entscheiden:** Über Optik entscheidet nur Baris. Sanji zeigt Varianten, Baris wählt, Sanji setzt um.

## Feste Vorgaben für die Optik (aus Beschlüssen des Kapitäns)
- **Zielgruppe:** Wirte und Aushilfen in Döner-, Imbiss-, Asia- und Pizzaläden. Oft wenig Deutsch, Handschuhe, Stress, grelles Licht oder dunkle Ecke.
- **Mischung:** NEKAVO für Analysen und Diagramme (Cockpit, Zähler, Gerichte im Vergleich), PORSIVO für einfache Darstellung mit Bildern (Onboarding, Müll, Waage, Kamera).
- **Aufbau aus der Vorschau vom 14.10. bleibt** (Baris: „Inhalt und Aufbau sehen gut aus, die Optik nicht“). Die Zoro-Vorschauen sind nur Gerüst, keine Stilvorlage. Die 12 Bildschirme:
  1. Laden-Art
  2. Was macht ihr selbst
  3. Kamera-Serie
  4. Prüfliste
  5. Cockpit mit Einrichtungsring und Monatskurve
  6. Cockpit mit 4 Instrumenten
  7. Gerichte im Vergleich
  8. Menü hinter drei Strichen
  9. Müll-Zentrale
  10. Müll eintragen (Blatt)
  11. Waage-Check
  12. Rezept mit Stempel
- **Pflicht-Bedeutungen:**
  - Geschätzte Werte: gelb-gestrichelt mit „≈“.
  - Eigene Werte: grün.
  - Müll: eigene, gedeckte Farbe (bisher Weinrot).
  - Genau eine Hauptaktion pro Bildschirm.
- **Keine untere Leiste.** Menü über drei Striche oben links, Schnellknopf unten rechts.
- **Touch-Flächen mindestens 48 px.** Schrift für Text mindestens 15 px, Zahlen groß und mit Tabellenziffern.
- **Dreisprachig** DE/TR/EN, später 25–30 Sprachen. Layouts müssen 40 % längere Texte aushalten.
- **App-Name und Marke offen.** MIZAVO, NEKAVO, PORSIVO und GastroCalc sind ungeprüft (Markenrecht, Domain). Bis zur Entscheidung steht „GastroCalc“.

## Bildliste (Piktogramme, erste Welle, Dateiname = Motiv)
- **Laden-Arten:** `laden-doener`, `laden-burger`, `laden-pizza`, `laden-asia`, `laden-baeckerei`, `laden-foodtruck`, `laden-cafe`, `laden-anders`
- **Selbst gemacht:** `selbst-brot`, `selbst-teig`, `selbst-lahmacun`, `selbst-sossen`, `selbst-ayran`, `selbst-salat`, `selbst-spiess`, `selbst-patty`, `selbst-tomatensosse`, `selbst-dumplings`
- **Gerichte:** `g-doener`, `g-duerum`, `g-teller`, `g-box`, `g-lahmacun`, `g-pide`, `g-seele`, `g-pizza`, `g-nudeln`, `g-falafel`, `g-salat`, `g-pommes`, `g-burger`, `g-currywurst`, `g-asia-nudeln`, `g-boerek`
- **Rohwaren:** `w-doenerfleisch`, `w-haehnchen`, `w-hack`, `w-kaese`, `w-feta`, `w-tomate`, `w-salat`, `w-zwiebel`, `w-gurke`, `w-kohl`, `w-mehl`, `w-ei`, `w-spinat`, `w-pommes-tk`, `w-sosse`, `w-brot`, `w-getraenk`
- **Sonstiges:** `k-kuehlschrank`, `k-tiefkuehler`, `k-theke`, `m-tonne`, `m-eimer`, `waage`, `kamera`, `rechnung`
