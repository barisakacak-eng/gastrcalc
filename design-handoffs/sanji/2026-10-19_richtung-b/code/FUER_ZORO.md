# FÜR ZORO: GastroCalc · Design B · HTML/CSS-Übergabe

**Status:** Statische Designvorlage, kein produktiver App-Code. Baris hat die Bildrichtung B freigegeben; die 10 HTML-Seiten bilden diese Richtung als nachbaubare Web-Oberflächen ab. **Nicht behaupten, dass die HTML-Dateien pixelidentisch mit dem KI-generierten Board sind:** Das Board ist ein gerendertes Gesamtbild ohne präzise geometrische Quelldaten. CSS-Maße sind konsistent und nachbaubar, aber Abweichungen zu einzelnen Bildpixeln sind unvermeidbar. Alle Zahlen sind **Beispielwerte**; echte Daten und Rechenlogik kommen ausschließlich von Zoro.

## Dateien

- `screens/01-willkommen.html` bis `screens/10-tag-abschliessen.html`: 10 eigenständige statische Ansichten; Designfläche 390 × 844 CSS-Pixel, iPhone-Statusleiste nur als Mockup.
- `styles.css`: gemeinsame CSS-Klassen, nur lokale Ressourcen, keine Inline-Styles und kein JavaScript. Lädt die lokale `tokens.css`.
- `tokens.css`: Farb-, Typografie-, Abstands- und Maßvariablen.
- `icons/*.svg`: 40 lokale, von Sanji als Linien-SVG nachgezeichnete Lucide-artige Symbole mit Lucide-konformen Dateinamen. **Keine kopierten offiziellen Lucide-Originaldateien**; bei exakter Pfadgleichheit zu Lucide durch die offiziellen OFL/ISC-konformen Icons ersetzen.
- `bilder/logo.svg`, `bilder/logo_einfarbig.svg`, `bilder/kraeuter.svg`, `bilder/pokal.svg`: lokale Vektorgrafiken, ohne Fremdmarken.
- `bilder/platzhalter-*.svg`: 11 grafische Platzhalter, **keine Speisefotos**. In der echten App durch eigene Fotos ersetzen.

## Wichtige technische Hinweise

1. Die Schrift wird in `styles.css` bewusst **ausschließlich lokal** referenziert: `url('../fonts/Manrope-Variable.woff')`. **Die WOFF-Datei ist nicht Bestandteil dieses Pakets.** Zoro muss die frei lizenzierte Manrope-Datei in der passenden relativen Position bereitstellen. Bis dahin greift die Systemschrift; damit ist der Offline-Fallback gewährleistet, nicht die exakte Manrope-Darstellung. Die relative URL bezieht sich auf `styles.css`, nicht auf die einzelnen Screens.
2. `@import url('tokens.css')` ist ein lokaler Import, kein externer Dienst.
3. Die Symbole werden als CSS-Masken eingebunden. Dadurch nehmen sie `currentColor` an, ohne Inline-Styles oder externe Icon-Bibliotheken.
4. **Orange** `--akzent` mit **dunklem Text** `--text`. Warntext auf Weiß: `--rot-text`, nicht `--rot`, da letzteres nicht überall WCAG-AA-Kontrast erreicht. Warn-Pillen mit weißem Text haben `--rot-text` als Hintergrund.
5. Die Screens sind **nicht klickbar**; `span`-Elemente markieren Tasten nur optisch. Zoro verbindet vorhandene Aktionen, Semantik, Datenattribute und Übersetzungen. Keine bestehende Logik ersetzen.
6. Der Mockup-Statusbalken muss in der produktiven iPhone-PWA entfernt werden; das Betriebssystem zeichnet ihn selbst.
7. Die Bildvorlage für Screen 09 enthielt „Per WhatsApp bestellen“, obwohl der Auftrag „keine fremden Marken“ vorgibt. Der HTML-Entwurf verwendet deshalb **„Bestellung teilen“**. Zoro/Baris entscheiden die endgültige Beschriftung.
8. Die freigegebenen Referenzbilder enthalten teils mehr als 15 Wörter je Laden-Screen. Eine 1:1-Übernahme aller Inhalte und die 15-Wörter-Regel sind gleichzeitig nicht vollständig erfüllbar. Texte nicht ohne Freigabe kürzen.
9. Das bisherige Repo nutzt andere CSS-Klassen und Texte. **Kein Ersetzen von `index.html`, `js/`, `sw.js` oder Datenattributen.** Die Vorlagen dienen als Stil- und Bausteinreferenz für Zoros Integration.

## Bausteine: CSS-Klassen

| Baustein | CSS-Klasse(n) |
|---|---|
| Bildschirm 390 × 844 | `.bildschirm`, `.inhalt`, `.inhalt-ohne-leiste`, `.statusleiste` |
| Kopfleiste Laden | `.kopfleiste`, `.kopf-laden`, `.kopf-logo`, `.kopf-taste`, `.datumszeile` |
| Kopfleiste Büro / Arbeitsblatt | `.kopfleiste`, `.kopf-links`, `.kopf-titel`, `.kopf-taste` |
| Hauptzahl-Karte | `.hauptzahl`, `.hauptzahl-label`, `.hauptzahl-wert`, `.hauptzahl-balken`, `.hauptzahl-fortschritt`, `.hauptzahl-fuss` |
| Kachel mit Wert | `.kachel`, `.kachel-titel`, `.kachel-wert`, `.kachel-raster` |
| Kachel leer / erster Handgriff | `.kachel-leer`, `.kachel-handgriff` |
| Jetzt dran | `.jetzt-dran`, `.jetzt-dran-inhalt`, `.jetzt-dran-titel` |
| Hauptknopf | `.knopf-haupt`, `.knopf-voll` |
| Zweitknopf | `.knopf-zweit` |
| Leiste unten | `.leiste-unten`, `.leiste-reiter`, `.leiste-reiter-aktiv` |
| Listenzeile mit Pfeil | `.bereich-zeile`, `.gericht-zeile` |
| Messwert OK/Alarm | `.messwert-zeile`, `.messwert-zeile-alarm`, `.messwert-status`, `.alarm-pille` |
| Abhak-Zeile | `.abhak-zeile`, `.abhak-zeile-erledigt`, `.abhak-titel`, `.abhak-zeit` |
| Speisefoto-Kachel | `.speisefoto-kachel`, `.speisefoto-bild`, `.speisefoto-plus` |
| Filter-Chip | `.filter-chip`, `.filter-chip-aktiv`, `.filter-zeile` |
| Preis-Blatt | `.preis-blatt`, `.preis-blatt-kopf`, `.preis-steller` |
| Ordner-Kachel | `.ordner-kachel`, `.ordner-name`, `.ordner-status` |
| Bereichszeile Büro | `.bereich-zeile`, `.bereich-zeile-gruen`, `.bereich-zeile-rot`, `.bereich-zeile-gelb` |
| Hinweis-Chip | `.hinweis-chip`, `.hinweis-titel`, `.hinweis-text` |
| Mengen-Zeile | `.mengen-zeile`, `.mengen-taste`, `.mengen-zahl` |
| Erfolgsbildschirm | `.erfolg-pokal`, `.erfolg-zeile`, `.erfolg-haken`, `.erfolg-ergebnis` |
| Lokale Lucide-Symbole | `.symbol`, `.icon-{name}` (z. B. `.icon-snowflake`) |

## Screens / vertikaler Aufbau

1. Willkommen: Statusleiste → Logo → Titel → Kurztext → Sprachfeld → Weiter → Sicherungslink → Kräuter-Deko.
2. Heute: Statusleiste → Ladenkopf → Datum → Hauptzahl → 2×2 Kacheln → Jetzt dran → Leiste.
3. Heute erster Tag: wie 2, Kacheln mit ersten Handgriffen statt Werten.
4. Müll: Statusleiste → Kopf → Müll-Betrag → 2×4 Speisefoto-Kacheln → weitere Gerichte → Leiste.
5. Kühlung: Statusleiste → Kopf → vier Messwert-Zeilen → Nachmessen → Leiste.
6. Putzen: Statusleiste → Kopf → Ring → fünf Abhak-Zeilen → Leiste.
7. Karte: Statusleiste → Kopf → Filter-Chips → Gerichte → Preis-Blatt → Leiste.
8. Büro: Statusleiste → Büro-Kopf → Hinweis-Chip → drei Ordner → vier Bereichszeilen. Kein Büro-Reiter.
9. Lager: Statusleiste → Kopf → 6-Waren-Karte → drei Mengen-Zeilen → weitere → Bestellung teilen.
10. Abschluss: Statusleiste → Kopf → Pokal → drei Haken → Ergebnis → Zum Cockpit.

**Freigabe:** Gestaltung freigegeben, Code noch nicht von Zoro integriert/getestet. Es wurden keine Repository-Dateien verändert.
