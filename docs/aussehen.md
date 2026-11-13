# Aussehen „Salbei & Papier“ – Zeki und Bühne

Stand 13.11.2026. Grundlage: Übergabe „Rebranding Salbei & Papier“ (12.11.2026), Abschnitt 4 (Regeln), 5 (Zeki einbauen), 7 (zwölf Bauarten). Dieses Dokument beschreibt das Fundament aus neuen Dateien; verdrahtet ist noch nichts (`css/neu-tokens.css` und `css/neu-optik.css` ersetzen `tokens.css`/`optik.css` erst in einem späteren Schritt).

## 1. Dateien

- `js/zeki_figur.js` – ruhende Haltung (`buehnenBild`, `figurHtml`), Mienen (`mienenBild`), Folgen (`folge`, `folgeFuer`), Zuordnung Ansicht → Bühnen-Bild (`ZEKI_ANSICHT`, `buehnenSchluessel`), Abspieler (`zekiSpielen`, `zekiEreignis`).
- `js/buehne.js` – der gemeinsame Kopf „Bühne“ als HTML-Text (`buehneHtml`).
- `assets/brand/zeki-buehne/` (24 ruhende Haltungen, 512 × 354, `zuordnung.json`, `haltebild.json`), `assets/brand/zeki-klein/` (25 Folgen, Raster 5 × 5, Zelle 256 × 318), `assets/brand/zeki-mienen/` (12 Mienen), `assets/brand/zeki/ablauf.json`, `assets/brand/zeki-gelenke.json`, `design/zeki.svg`.
- `fonts/NotoSans-*.woff2`, `fonts/NotoSansArabic-*.woff2`, `fonts/zeichen.json`; erzeugt von `tools/schrift_teilmenge.py`, geprüft von `tests/schrift.test.mjs`.
- `tools/zeki-quelle/` – die Werkstatt, aus der Zeki gebaut ist (neue Bewegung = ein Eintrag in `bewegungen.py`, dann `build.py`). `tools/zeki_deckung.py` misst die Deckung von Bühnen-Bild und Folge an den echten Bildern.

## 2. Wie Bild und Folge zusammenpassen

Das Bühnen-Bild ist der obere Teil der Zelle der großen Folgen (512 × 636) und liegt oben links bündig auf ihr: gleicher Maßstab, 512 Pixel für 420 Figur-Einheiten (Filmfenster `-80 -45 420 521.71875`). Bei 116 px Darstellungsbreite ist das Bild 116 × 80,2 px; die Bühnenkante liegt bei Figur-Koordinate y 245. Die Folge wird mit derselben Breite gezeigt (Raster 580 × 720,5 px, Zelle 116 × 144,1 px) und oben links auf das Bild gelegt; die Höhe des Bildes schneidet die Beine ab. Gleiche Figur-Koordinate gibt gleiche Bildschirm-Position (Abweichung unter 1 px, `tests/zeki_figur.test.mjs`; an den echten Bildern gemessen: Überdeckung der Umrisse 0,998, Verschiebung 0/0, `tools/zeki_deckung.py`).

**Wichtig:** Das Bühnen-Bild einer Haltung ist die *gehaltene Pose* (z. B. Hand oben), nicht die Ruhe. Bild 0 und Bild 24 jeder Folge zeigen die Ruhe. Nur bei der Haltung „warten“ (Büro, Intro, Blatt/Sperre) sind beide gleich. Darum spielt `zekiEreignis` bei einer Ankunft nur bis zur Pose (`HALTEBILD`, z. B. Bild 9 bei `hand`) und tauscht dann unsichtbar gegen das Bühnen-Bild; bei Lob, Erfolg, Warnung geht Zeki erst aus der Pose in die Ruhe (Folge rückwärts), spielt die Bewegung und geht wieder in die Pose. Der Leerlauf (`warten`) läuft nur über der Ruhe-Haltung; über einer gehaltenen Pose bleibt Zeki stehen.

## 3. Regeln als Code

Leerlauf ist immer `warten`, nie `zwinkern`. `zwinkern` gibt es nur über `folgeFuer("lob")`. Warnung → `kopfschuetteln`, Fehler → `pruefen`, nie grinsen, jubeln, zwinkern, daumen, nicken. Kein ruhendes Bild trägt Zwinkern oder Grinsen. Bei „Bewegung reduzieren“ (`prefers-reduced-motion`) bewegt sich nichts: `zekiSpielen` und `zekiEreignis` geben `null` zurück, es bleibt das ruhende Bild mit passender Miene. Ereignisse: `ankommen:<haltung>`, `erfolg` (nicken), `lob` (zwinkern), `tagGeschafft` (jubeln), `warnung`, `fehler`.

## 4. Ansicht → Bauart → Bühnen-Bild

Ein Schlüssel mit Doppelpunkt ist ein Zustand der Ansicht (`buehnenSchluessel(ansicht, { schritt })`); der Schlüssel ohne Doppelpunkt gilt im Normalfall. `start` hängt an der Tageszeit (Berliner Zeit): vor 11 Uhr `heute-morgen`, 11 bis 17 Uhr `heute-mittendrin`, ab 18 Uhr `heute-abend`; ohne Stunde `start`. Einrichtungs-Schritte heißen `einrichtung:<Kennung aus js/screens/onboarding.js>`. Unbekannte Ansichten fallen auf `intro` (ruhige Haltung) zurück, nie auf „keine Figur“. Bauart „II“ = Bild aus Tafel II ohne eigene der zwölf Bauarten.

| Ansicht | Bauart | Bühnen-Bild |
|---|---|---|
| `start` | 1 | `start` |
| `muell` | 2 | `foto-auswahl` |
| `muell:station` | 2 | `foto-auswahl` |
| `personal` | 2 | `foto-auswahl` |
| `muell:eingabe` | 3 | `zahl-eingeben` |
| `kuehl` | 3 | `zahl-eingeben` |
| `portion` | 3 | `zahl-eingeben` |
| `ware:zaehlen` | 3 | `zahl-eingeben` |
| `verkauf:hand` | 3 | `zahl-eingeben` |
| `kuehl:rundgang` | 4 | `rundgang` |
| `inventur` | 4 | `rundgang` |
| `kuehl:einrichtung` | 4 | `kuehlgeraete` |
| `putzplan` | 5 | `abhak-liste` |
| `abschluss` | 5 | `abhak-liste` |
| `abschluss:bilanz` | 6 | `geschafft` |
| `buero` | 7 | `buero` |
| `karte` | 8 | `eintragsliste` |
| `kartebuero` | 8 | `eintragsliste` |
| `getraenke` | 8 | `eintragsliste` |
| `lieferanten` | 8 | `eintragsliste` |
| `bestand` | 8 | `eintragsliste` |
| `ware` | 8 | `eintragsliste` |
| `kuehlware` | 8 | `eintragsliste` |
| `laeden` | 8 | `eintragsliste` |
| `listen` | 8 | `eintragsliste` |
| `aktionen` | 8 | `eintragsliste` |
| `einstellungen` | 9 | `eintrag-aendern` |
| `kartefoto` | 9 | `karte-fotografieren` |
| `umsatz` | 10 | `zahlen-verlauf` |
| `umsatzheute` | 10 | `zahlen-verlauf` |
| `vergleich` | 10 | `zahlen-verlauf` |
| `verkauf` | 10 | `zahlen-verlauf` |
| `preisrunde` | 10 | `zahlen-verlauf` |
| `geld3` | 10 | `zahlen-verlauf` |
| `hinweise` | 11 | `papier-aushang` |
| `ordner-amt` | 11 | `papier-aushang` |
| `ordner-steuer` | 11 | `papier-aushang` |
| `ordner-buch` | 11 | `papier-aushang` |
| `beleg` | 11 | `papier-aushang` |
| `tafel` | 11 | `papier-aushang` |
| `blatt` | 12 | `blatt-sperre` |
| `sperre` | 12 | `blatt-sperre` |
| `hilfe` | 12 | `blatt-sperre` |
| `sprache-blatt` | 12 | `blatt-sperre` |
| `schloss-personal` | 12 | `blatt-sperre` |
| `intro` | II | `intro` |
| `fuehrung` | II | `fuehrung` |
| `menue-blatt` | II | `menue-blatt` |
| `einrichtung:sprache` | II | `sprache` |
| `einrichtung:format` | II | `laden` |
| `einrichtung:kueche` | II | `laden` |
| `einrichtung:betrieb` | 9 | `eintrag-aendern` |
| `einrichtung:team` | 3 | `zahl-eingeben` |
| `einrichtung:lohn` | 3 | `zahl-eingeben` |
| `einrichtung:kosten-intro` | II | `kosten` |
| `einrichtung:kosten-miete` | II | `kosten` |
| `einrichtung:kosten-energie` | II | `kosten` |
| `einrichtung:kosten-versicherung` | II | `kosten` |
| `einrichtung:kosten-vertraege` | II | `kosten` |
| `einrichtung:kosten-kredite` | II | `kosten` |
| `einrichtung:kosten-entsorgung` | II | `kosten` |
| `einrichtung:kosten-gebuehren` | II | `kosten` |
| `einrichtung:kosten-beratung` | II | `kosten` |
| `einrichtung:kosten-werbung` | II | `kosten` |
| `einrichtung:kosten-sonstiges` | II | `kosten` |
| `einrichtung:reinigung` | 9 | `eintrag-aendern` |
| `einrichtung:kanaele` | 9 | `eintrag-aendern` |
| `einrichtung:kuehlstellen` | II | `kuehlgeraete` |
| `einrichtung:karte` | 2 | `foto-auswahl` |
| `einrichtung:rezepte` | 9 | `eintrag-aendern` |
| `einrichtung:preise` | 9 | `eintrag-aendern` |
| `einrichtung:verkauf` | 9 | `eintrag-aendern` |
| `einrichtung:ergebnis` | II | `fertig` |
| `einrichtung:schloss` | 9 | `eintrag-aendern` |
| `einrichtung:laden-schnell` | II | `laden` |
| `einrichtung:karte-foto` | II | `karte-fotografieren` |
| `einrichtung:kuehl-schnell` | II | `kuehlgeraete` |
| `einrichtung:geld` | II | `kosten` |
| `einrichtung:fertig-schnell` | II | `fertig` |

Bauarten: 1 Start · 2 Auswahl mit Fotos · 3 Eine Zahl eingeben · 4 Rundgang Schritt für Schritt · 5 Abhak-Liste · 6 Geschafft · 7 Büro-Übersicht · 8 Liste mit Einträgen · 9 Eintrag ansehen und ändern · 10 Zahlen und Verlauf · 11 Hinweis, Papier und Aushang · 12 Blatt von unten und Sperre · II Tafel II (Einrichtung, Intro, Führung, Menü).

Zusätzlich tragen `heute-morgen`, `heute-mittendrin`, `heute-abend` den Laden-Start (Bauart 1).

## 5. Wo die Bauart nicht eindeutig war (nächstliegende genommen)

- `muell`: Foto-Raster (Bauart 2); das Detail `muell:eingabe` ist Bauart 3.
- `kuehl`: Übergabe nennt „Kühlung“ (3) und „Kühl-Rundgang“ (4). Normalfall 3, `kuehl:rundgang` 4, `kuehl:einrichtung` 4 mit dem Bild `kuehlgeraete` (Tafel II).
- `ware`: „Ware“ steht in Bauart 8, „Ware zählen“ in 3. Die Büro-Seite `ware` ist 8, `ware:zaehlen` ist 3.
- `verkauf`: „Verkauf“ in 10, „Verkauf von Hand“ in 3. Normalfall 10, `verkauf:hand` 3.
- `umsatzheute`: in der Übergabe unter 10 genannt, obwohl es eine Zahl-Eingabe ist; 10 genommen.
- `geld3` (Geld & Finanzamt, aufklappbare Karten mit je einer Zahl): in der Übergabe nicht genannt, 10 oder 11 möglich; 10 genommen.
- `kartefoto`: Übergabe nennt „Kartenfoto“ unter 9 (`eintrag-aendern`); gewählt ist das Tafel-II-Bild `karte-fotografieren` (Zeki mit Kamera), weil es genau diesen Schirm meint.
- `abschluss`: Abhaken ist 5; die Bilanz am Ende (`abschluss:bilanz`) ist 6 „Geschafft“.
- `personal`: Personal-Start gehört zu Bauart 2.
- Einrichtung: `schloss` (Büro-Code, kein Bild in Tafel II) → 9 `eintrag-aendern`; `kanaele`, `reinigung`, `rezepte`, `preise`, `verkauf`, `betrieb` → 9; `team`, `lohn` (Zahlen) → 3; `karte` (Gerichte aus Vorlagen wählen) → 2.
- `blatt`, `sperre`, `hilfe`, `sprache-blatt`, `schloss-personal`: Bauart 12; die Haltung `blatt-sperre` hat die Miene „warnung“, das passt zur Sperre, weniger zum freundlichen Hilfe-Blatt.
