# ÜBERGABE AN DEN GASTROCASH-BAU-CHAT · REBRANDING „SALBEI & PAPIER“

Von Zoro (BA ODDERA Zentrale). Stand: 12.11.2026, abends. Freigegeben von Baris zum Bauen auf einem eigenen Zweig. **Live geht nichts ohne Baris’ ausdrückliches Ja.**

## 1. Der Auftrag in drei Sätzen

Die ganze App bekommt das neue Aussehen „Salbei & Papier“: oben auf jedem Schirm eine grüne Bühne, in der Zeki steht, darunter Papier mit ruhigen Karten. Inhalt, Funktion, Reihenfolge und Texte der App bleiben, wie du sie fertig gebaut hast. Du baust in **einem Durchgang über alle Ansichten**, nicht Schirm für Schirm mit Rückfragen.

## 2. Was in diesem Paket liegt

| Pfad | Was es ist | Von wem | Geprüft |
|---|---|---|---|
| `design/Tafel_I_gewaehlt_Salbei_und_Papier.png` | Die Richtung, die Baris gewählt hat | Sanji | von Baris gewählt |
| `design/Sanji_2026-11-12_Tafel_II.png` | Einrichtung, Führung, Start, Menü im neuen Aussehen | Sanji | Aufbau von Baris gesehen |
| `css/tokens.css`, `css/optik.css` | Farben, Schrift, Maße, alle Bausteine | Sanji | von Zoro im Browser geprüft |
| `design/schablone.html` | Bauzeichnung: 158 Musterschirme, 390 × 844, hell, dunkel, rechts-nach-links | Sanji | siehe Abschnitt 6 |
| `fonts/` | Noto Sans und Noto Sans Arabic (SIL OFL) | Sanji | – |
| `bilder/` | 39 Piktogramme, Dateinamen wie im Repo | Sanji | – |
| `assets/brand/zeki.svg` | Zeki als eine Datei, mit allen Mienen | Zoro | ja |
| `assets/brand/zeki/` | 25 Bewegungen, je 5 × 5 Bilder, Zelle 512 × 636 | Zoro | ja |
| `assets/brand/zeki-klein/` | dieselben 25 in halber Größe (Zelle 256 × 318) – **diese aufs Handy** | Zoro | ja |
| `assets/brand/zeki-buehne/` | 24 ruhende Haltungen für die Bühne, 512 × 354, mit `zuordnung.json` | Zoro | ja |
| `assets/brand/zeki-mienen/` | 12 Mienen als ganze Figur | Zoro | ja |
| `assets/brand/zeki-gelenke.json` | Maße und Drehpunkte | Zoro | ja |
| `assets/brand/zeki/ablauf.json` | Dauer und Format jeder Bewegung | Zoro | ja |
| `design/zeki-vorschau.html` | Alle Bewegungen und Haltungen zum Ansehen | Zoro | läuft |
| `design/ZEKI_PRUEFBERICHT.json` | 1879 automatische Prüfungen, 0 Fehler | Zoro | – |
| `design/Zeki_Probeblatt_freigegeben.png` | So hat Baris Zeki freigegeben | Sanji | Maßstab |
| `design/Zeki_aus_dem_Bau.png` | So sieht Zeki aus den echten Dateien aus | Zoro | – |
| `design/GastroCash_Bestandsaufnahme.jpg`, `GastroCash_Einrichtung_und_Start.jpg` | Die App vor dem Umbau: 94 + 16 Aufnahmen | Zoro | – |
| `zeki-quelle/` | Die Werkstatt: aus diesen Skripten ist Zeki gebaut. Neue Bewegung = ein Eintrag in `bewegungen.py`, dann `build.py` | Zoro | – |
| `LIESMICH_SANJI_LAYOUT.md` | Sanjis eigene Notizen zum Layout | Sanji | – |

Sanjis Dateien stammen laut seiner Angabe vom Repo-Stand `8685f09`. Prüfe, ob das noch dein aktueller Stand ist.

## 3. Was fest bleibt

- Inhalt und Funktion: Schirme, Knöpfe, Reihenfolge, Leiste unten (fünf Reiter im Laden), Texte, Zahlen, Rechnungen.
- Der Visual-Vertrag (`bruecke/visual-vertrag.md`): keine `data-a`/`data-f`/`data-id`/`data-wert`, keine Klassen entfernen oder umbenennen, keine Texte in `js/lang/` ändern.
- Die sechs Farben: Papier #F5EDE2 · Tinte #22301F · Salbei #4C6B55 · Glut #E8763A · Holz #E2CDB2 · Weinrot #8B3A2E.
- Das Zielbild vom 27.10.2026 (`design/zielbild-zeki-und-schablone-2026-10-27.md`), außer wo Abschnitt 4 hier ausdrücklich Neues sagt.

## 4. Die Regeln, bei denen früher Fehler passiert sind (Pflicht)

1. **Genau ein Zeki pro Schirm.** Der kleine Zeki oben rechts in der Kopfzeile entfällt überall. Zeki steht in der Bühne.
2. **Zeki ist nicht aufgeklebt.** Er steht hinter der unteren Kante der Bühne wie hinter einer Theke: Hüfte aufwärts, die Kante schneidet ihn ab, weicher Schatten auf der Kante. Kein Kreis, kein Rahmen. Er steht nie über Fotos, Texten oder Knöpfen. Die Bühnen-Bilder sind genau dafür geschnitten (Schnitt bei y 245 der Figur).
3. **Er tritt vor, er verdoppelt sich nicht.** Bei Führung, Hinweis oder Blatt von unten verlässt er die Bühne. Solange er vorn steht, ist die Bühne leer.
4. **Zwei offene Augen im Ruhezustand.** Mimik entsteht nur aus zwei Augen, Mund und Brauen. Blinzeln heißt: beide Augen kurz zu. Zwinkern ist eine einzelne kurze Bewegung bei Lob – nie eine Haltung, nie im Leerlauf, nie auf einem ruhenden Bild.
5. **Keine Chat-Sprechblase.** Sein Satz steht als Zeile oder kleiner Knopf neben ihm.
6. **Nichts doppelt.** Kein Feld, kein Hinweis, kein Blatt zweimal. Immer höchstens ein Blatt offen. Öffnet sich ein Blatt, verschwindet Zekis Satz in der Bühne.
7. **Weinrot nur beim Müll. Glut ist selten:** nur für das eine, das gerade dran ist.
8. **Laden und Personal:** höchstens 15 Wörter, eine Haupthandlung, Tippflächen mindestens 44 px, kein Scrollen auf 390 × 844. **Personal: nie ein Euro-Betrag.**
9. **18 Sprachen, auch rechts-nach-links.** Die Bühne wird gespiegelt (Zeki links, Text rechts). Ziffernfelder werden **nicht** gespiegelt.
10. **„Bewegung reduzieren“:** keine Bewegung, Zeki steht in der ruhenden Haltung mit passender Miene.

## 5. Zeki einbauen

**Was sich ändert.** Die bisherige Figur war eine Vektorzeichnung, die `js/zeki-svg.js` als Text enthält und `js/zeki-puppe.js` an Gelenken bewegt. Der neue Zeki besteht aus gemalten Flächen. Die alte Gliederpuppe schneidet die Vektorformen an festen Linien – das passt auf die neue Figur nicht. Bitte **nicht** versuchen, die neue Figur mit der alten Puppe zu bewegen.

**Wie der neue Zeki gedacht ist.**
- **Ruhend in der Bühne:** das Bild aus `assets/brand/zeki-buehne/` zur jeweiligen Ansicht. Die Zuordnung steht in `zuordnung.json` (Ansicht → Haltung → Miene → Datei).
- **Bewegung:** die passende Folge aus `assets/brand/zeki-klein/` abspielen (Raster 5 × 5, 25 Bilder, Dauer in `ablauf.json`). Jede Folge beginnt und endet in der Ruhe, außer `auftreten` (beginnt außerhalb) und `abgehen` (endet außerhalb). So gibt es keinen Sprung beim Wechsel zwischen Bild und Folge.
- **Leerlauf:** `warten` (atmen, einmal blinzeln, 4,2 s), in unregelmäßigen Abständen wiederholen.
- **Beim Ankommen auf einem Schirm:** einmal die Bewegung, die zur Haltung gehört (zum Beispiel `hand` auf dem Start, `schreiben` bei der Zahl), danach das ruhende Bild.
- **Erfolg:** `nicken`, `daumen` oder `jubeln` (Tag geschafft). **Warnung:** `kopfschuetteln` oder `pruefen`, Miene `warnung`. Kein Grinsen bei Warnungen.
- **Führung und Intro:** `auftreten`, `zeigen-links/-rechts/-oben/-unten`, `schuerze`, `abgehen`.
- **Mienen** stehen einzeln in `assets/brand/zeki-mienen/` und in `zeki.svg` (dort per `data-zeki-zustand` am `<svg>` umschaltbar). Namen wie bisher: neutral, freude, frage, import, preis, hilfe, warnung, bestaetigt, aufmerksam, erleichtert, fehler. Neu dazu: staunt.

**Gleiches Format wie bisher:** Raster 5 × 5, viewBox der Figur 0 0 237 328. **Neu:** das Filmfenster ist `-80 -45 420 521.71875` (die Figur darf die Arme weiter ausstrecken). Die Zelle der großen Fassung ist 512 × 636, die der kleinen 256 × 318.

**Größe.** Kleine Fassung zusammen 3,5 MB, große 7,1 MB. Aufs Handy gehört die kleine. Bitte nur laden, was eine Ansicht braucht, und die Liste für den Offline-Speicher (Service Worker) anpassen.

**Requisiten.** Klemmbrett, Lupe, Diagramm, Papier, Kamera und Karte sind in den Folgen schon enthalten und liegen in Zekis Hand. Nichts davon muss die App selbst zeichnen.

## 6. Was Zoro an Sanjis Layout geprüft und gefunden hat

Gemessen in Chromium an `design/schablone.html`: 158 Musterschirme, alle genau 390 × 844, keiner läuft über, auf keinem stehen zwei Zekis, hell, dunkel und rechts-nach-links werden dargestellt, keine fehlenden Dateien. Fünf Reiter unten, Weinrot nur beim Müll, Bühne leer bei Führung und Menü-Blatt.

Beim Einbau zu beheben:
- **Die Schablone zeigt noch den alten Zeki.** Überall durch die neuen Bühnen-Bilder ersetzen.
- **Zu flach und zu leer gegenüber der gewählten Tafel.** In der Tafel haben die Zeilen Fotos, die Karten Tiefe, das Papier wirkt warm. Bitte mit den echten Fotos der App (`foto/`) und den echten Inhalten füllen und an Tafel I messen, nicht an der Schablone.
- **Rechts-nach-links:** Das Ziffernfeld beim Büro-Code ist in der Schablone gespiegelt (3-2-1). Ziffern bleiben 1-2-3.
- **Sprechblasen-Kästen** auf Tafel I (Schirm 5 und 12) nicht übernehmen, als Zeile oder Knopf lösen.
- Sanji meldet selbst: Seine Browserprüfung lief nicht. Verlass dich auf deine eigenen Tests.

## 7. Die zwölf Bauarten – jede Ansicht gehört zu genau einer

1. **Start:** Laden-Start.
2. **Auswahl mit Fotos:** Müll heute, Lebensmittel auswählen, Übrig geblieben, Personal-Start.
3. **Eine Zahl eingeben:** Müll-Detail, Kühlung, Ware zählen, Portion, Rezept-Gramm, Verkauf von Hand.
4. **Rundgang Schritt für Schritt:** Kühl-Rundgang, Inventur, Kühl-Einrichtung.
5. **Abhak-Liste:** Putzplan (Personal und Büro), Tag abschließen.
6. **Geschafft:** Abschluss fertig.
7. **Büro-Übersicht:** Büro-Start.
8. **Liste mit Einträgen:** Karte, Karte im Büro, Getränke, Lieferanten, Bestand, Ware, Kühlware, Läden, Listen, Aktionen.
9. **Eintrag ansehen und ändern:** alles mit „bearbeiten“, „neu“ und aufgeklappten Einträgen, Rezept, Kartenfoto, Lieferant zuordnen, Mindestbestand, Einstellungen.
10. **Zahlen und Verlauf:** Umsatz, Umsatz heute, Vergleich, Verkauf, Preisrunde.
11. **Hinweis, Papier und Aushang:** Hinweise, Ordner Amt, Ordner Steuer, Vorschau, Belehrung, Beleg, Putz-Nachweis, Tafel, Export.
12. **Blatt von unten und Sperre:** Hilfe, Kühl-Blatt, Müll-Tipp, Personal-Schloss, Sprache wählen.

Dazu aus Tafel II: Intro, Sprache, Laden-Art, Karte fotografieren, Kühlgeräte, Kosten, Fertig, Führung, Heute am Morgen / mittendrin / am Abend, Menü-Blatt.

Trifft eine Ansicht keine Bauart genau: die nächstliegende nehmen und im Bericht nennen. Keine neue Bauart erfinden.

## 8. Reihenfolge

1. Eigener Zweig. Nichts auf `main`, nichts live.
2. Farben, Schrift, Maße (`tokens.css`), dann die Bausteine (`optik.css`).
3. Die Bühne als ein gemeinsamer Kopf für alle Ansichten. Den kleinen Zeki oben rechts entfernen.
4. Zeki neu: Bühnen-Bilder, Abspielen der Folgen, Leerlauf, „Bewegung reduzieren“.
5. Alle Ansichten nach Bauart durchziehen: Einrichtung, Intro, Führung, Laden, Personal, Büro, alle Blätter.
6. Wärme nachziehen: Fotos in den Zeilen, Tiefe der Karten, Papier.
7. Prüfen (Abschnitt 9), dann **ein** Übersichtsbild aller Ansichten an Baris.

## 9. Abnahme – was am Ende stimmen muss

- Deine vorhandenen Tests laufen durch.
- `tools/bildschirm_zaehlung.py` neu laufen lassen: alle Ansichten im neuen Aussehen als Übersichtsbild, dazu Einrichtung, Führung, Start, Menü.
- Gezählt, nicht geschätzt: auf jeder Ansicht höchstens ein Zeki; nirgends der kleine Zeki in der Kopfzeile; höchstens ein offenes Blatt; kein doppeltes Feld.
- Kein Überlauf auf 390 × 844 im Laden und beim Personal.
- Dunkel. Eine Sprache von rechts nach links (Arabisch). Eine lange Sprache (Deutsch oder Türkisch).
- Personal: kein Euro-Zeichen.
- Ruhende Bilder: zwei offene Augen.
- „Bewegung reduzieren“ an: nichts bewegt sich.
- Offline: App startet ohne Netz, Zeki ist da.

Bericht an Baris in einfachen Worten: was gebaut ist, was geprüft wurde und wie, was offen ist. Keine Fachsprache. Zuerst das Bild, dann der Text.

## 10. Was es nicht geben darf

Zwei Zekis auf einem Schirm. Zeki im Kreis oder über Inhalt. Dauerzwinkern. Chat-Sprechblasen. Doppelte Felder. Neue Farben. Geänderte Funktionen, Texte oder Reihenfolgen. Etwas live ohne Baris’ Ja.

## 11. Offen und ehrlich

- Zeki ist aus Sanjis gemalten Teilen gebaut, nicht in jedem Bild neu gemalt. Bei stark gebeugtem Arm sieht man am Ellbogen eine weiche Rundung statt einer gemalten Falte.
- Der Kopf dreht sich nicht wirklich zur Seite. `kopf-drehen` verschiebt Gesicht und Kopf leicht.
- Der Daumen bei `daumen` ist gezeichnet, nicht gemalt.
- `muenze`: Die Münze hebt sich aus der Tasche, Zeki nimmt sie nicht in die Hand.
- Baris hat Zeki auf dem Probeblatt freigegeben. Die Figur aus dem Bau (`design/Zeki_aus_dem_Bau.png`) hat er zum Zeitpunkt dieser Übergabe gesehen, aber das Urteil über die fertige App fällt er am echten Schirm.
