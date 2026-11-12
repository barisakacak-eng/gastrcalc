# FÜR ZORO: Salbei & Papier · Gesamtauftrag 12.11.2026

## Lieferstatus – zuerst lesen

**NICHT ABNAHMEFÄHIG. NICHT UNGEPRÜFT EINBAUEN.**
Die gewählte Richtung I ist die einzige Grundlage. Dies ist ein zusammenhängender Arbeitsstand mit den verlangten Pfaden und einem ehrlichen Abnahmeprotokoll, keine Erfolgsmeldung für B1–B8.

## Was konkret vorliegt

- A: `design/Sanji_2026-11-12_Tafel_II.png`, ein Bild, zwölf Ansichten.
- B1: `css/tokens.css`, sechs Grundfarben, daraus Töne und semantische Aliase, Schrift, Maße und Bewegungszeiten. Lokale Noto Sans und Noto Sans Arabic Regular/Bold mit SIL-OFL-Nachweis unter `fonts/`. Noto Sans trägt Türkisch, Kyrillisch und Griechisch; Noto Sans Arabic ergänzt Arabisch/Persisch. Andere Schriften der 18 Sprachen brauchen vollständige Zeichenprüfung.
- B2: `css/optik.css`, visuelle Bausteine für zwölf Bauarten und Einrichtung/Start. Enthält Zustände für Knopf, Feld, Karte, Zeile, Fotoauswahl, Checkbox, Reiter, Blatt, Hinweis, Diagramm, leere Liste und Laden. Hinweis Grün/Gelb/Rot sind **Bedeutungsnamen**, keine zusätzlichen Grundfarben: Salbei; Holz/Glut-Ton; dunkler Glut/Tinte-Ton. Warnungen immer mit Text/Zeichen; Weinrot nur Müll.
- B3: `design/schablone.html`, 24 statische Musterschirme in Hell/Dunkel × LTR/RTL, dazu die Zustandsblätter in allen vier Kombinationen, feste Maße 390 × 844. Offline öffnen nach vollständigem Entpacken. Die Datei ist eine **Bauvorlage, keine funktionsfertige App**. Es gibt keine Rechenlogik und keine App-JavaScript-Dateien im Paket.
- B4: `assets/brand/zeki.svg` hat viewBox und alle verlangten Teile. **Es ist ausdrücklich die unveränderte technische Bestandsfigur, keine gemalte Neufassung.** Elf technische Mienen unter `assets/brand/mienen/`. `zeki-schatten.svg` ist neu.
- B5: alle 25 benannten WebP-Raster vorhanden: 5 × 5 Zellen, 512 × 636, Gesamt 2560 × 3180, RGBA, 4 px transparenter Rand. **Technische Vektor-Proofs, nicht gemalte Endfassung.** Sichtprüfung zeigt abgeschnitten wirkende Gelenke bei Armrotationen. Diese Dateien sind NICHT als Produktionsersatz freigegeben. Insbesondere Daumen/Schürzenkarte/Münzgriff sind noch keine ausgearbeiteten gemalten Gesten.
- B6: 24 zugeordnete transparente Hüftausschnitte, einheitlich 512 × 460, WebP unter 60 KB. **Ebenfalls technische Proofs, gemalte Endfassung offen.** Zuordnung in `design/zeki-zuordnung.json`.
- B7: Zeichen aus dem aktiven Symbolsatz mit einheitlicher Strichstärke, `currentColor`, dazu vorhandene Motiv-Dateinamen. Je SVG unter 20 KB. Bestehende Herkunft/Lizenz unter `bilder/LIZENZEN-SYMBOLE.txt`. Neue separate UI-Dateien ändern die Inline-Symbole in `js/symbole.js` nicht automatisch.
- B8: dieser Bewegungs-/Einbauplan, Herkunft und `design/PRUEFPROTOKOLL.json`.

## FÜR ZORO: offen – mit Grund

1. **B4–B6 gemalter Stil:** Aus einem flachen generierten Bild lässt sich kein sauberer, identischer beweglicher Vektor mit allen geforderten Gelenken/Mienen ableiten, ohne die Figur gezielt neu zu zeichnen und ihre Gelenke zu korrigieren. Die vorliegenden technischen Proofs demonstrieren Format/Zuordnung und bleiben visuell deutlich unter der gewählten Tafel. Ich gebe sie deshalb nicht als fertige Neufassung aus. Alte Farben der Bestandsfigur bleiben im SVG; die Sechs-Farben-Abnahme für diese Figur ist ebenfalls offen.
2. **Vollständige Einbau-Abdeckung:** Die aktuelle App erzeugt Zeki über `js/zeki-svg.js` aus einem eingebetteten SVG-String und nutzt primär `js/zeki-puppe.js`. Das Ersetzen von `assets/brand/zeki.svg` allein ändert den sichtbaren Zeki nicht. Das Paket ändert diese JavaScript-Dateien nicht. Zoro muss die später freigegebene Figur in den bestehenden Einbau überführen.
3. **Bühne/Zeigen/Satz ausblenden:** Die neuen Vorlageklassen `.gc-buehne`, `.gc-buehne-innen`, `.gc-figur`, `.gc-inhalt`, `.gc-screen` sind explizite Einbauvorschläge. Zoro muss vorhandene Renderer damit umschließen und den EINEN Zeki beim Hinweis/Blatt umsetzen, nicht kopieren. Vorhandene Klassen und data-a/data-f/data-id/data-wert bleiben. Keine Pseudoelemente mit erfundenen Texten. Die CSS-Vorlage allein kann die bestehende DOM-Struktur nicht zuverlässig für alle 94 Schirme umbauen.
4. **Browser-Abnahme fehlt:** Chromium startet in dieser Ausführungsumgebung nicht (`socket() failed: Operation not permitted`). Daher keine Behauptung zu überlappungsfreien 390 × 844, tatsächlichem Scrollverhalten, interaktiven Zuständen, RTL-Rendering oder allen 18 Sprachen. Die statische Dateiprüfung ist kein Ersatz dafür.
5. **Inhalte bleiben:** HTML-Muster sind Bausteinbeispiele, KEINE Vorlage zum Überschreiben der App-Texte oder Funktionen. Müll verwendet die bestehende Eingabe, kein neues eigenes Ziffernfeld. Unten gelten fünf Reiter, nicht die drei aus früheren Konzepten. Kosten/Formulare behalten alle bestehenden Felder. Für jede wirkliche Ansicht ist Abgleich gegen den aktuellen Renderer nötig; nicht alle 94 Ansichten sind einzeln abgenommen.
6. **15 Wörter vs. Bestandsinhalt:** Wo heutige Texte/Steuerelemente darüber liegen, kann eine reine Optikdatei das nicht ehrlich beheben. Keine Texte ausblenden/löschen. Zoro muss einen konkreten Konflikt Baris vorlegen, statt still umzuschreiben.
7. **Tafel II:** Generiertes Konzeptbild, keine pixelgenaue Implementierungsvorlage. Beispielzahlen sind keine neuen Rechenregeln. Wortlaut und Funktionsdetails gegen die App prüfen. Das Introbild zeigt nur eine Phase; das vollständige 3–4-s-Storyboard steht unten. Eine Gestalt innerhalb von Tafel II ist keine Abnahme der technischen Vektor-Proofs.

## Einbau-Reihenfolge

1. Auf eigenem Entwurfszweig arbeiten; nicht live veröffentlichen. Quelle dieses Pakets: Repository `barisakacak-eng/gastrcalc`, Commit `8685f0997a4d7a4c62bce503f9a6f2b787417888` (12.11.2026).
2. Alte funktionale Klassen/Attribute/Texte bleiben. Vorhandene Fotos bleiben an ihren Pfaden; die wenigen mitgelieferten Fotos dienen der Offline-Bauzeichnung und stammen unverändert aus dem Repo.
3. Visuelle Ladereihenfolge: bestehende CSS-Strukturschichten, dann diese `tokens.css`, dann diese `optik.css`. Legacy-`:root`-Blöcke dürfen die neuen Tokens nicht danach überschreiben. Kein `app.css` geliefert.
4. Oben eine Salbei-Bühne, Papier darunter. Müll setzt nur im Müllbereich `--buehne:var(--weinrot)`; Hauptknopf bleibt Salbei. Bühne ca. 216 px, abhängig von vorhandenen Texten/Sprachlänge, niemals durch Abschneiden von Text passend machen.
5. Figur steht hinter Unterkante; Hüftausschnitt unten bündig, weicher Kontaktschatten, kein Rahmen/Kreis. Über Fotos, Text oder Tasten steht sie nie. In RTL logische Abstände benutzen: Zeki links, Text rechts. Nicht die Figur horizontal spiegeln, wenn dadurch Gesten/Symbole falsch werden.
6. Ein Blatt offen. Beim Öffnen: vorhandene Figur aus Bühne in die freie Blatt-/Hinweisfläche versetzen, Bühne leer und Bühnensatz verborgen. Bei Schließen zurück. Vorher-/Nachher-Test mit genau einer sichtbaren Figur.
7. Erst wenn B4–B6 neu gezeichnet und Browserprüfung bestanden sind, Referenzbilder und Paket zur Abnahme. Live erst nach Baris’ Ja. Service Worker und js/fassung.js aktualisiert Zoro bei seinem Einbau, nicht dieses reine ZIP.

## Bewegungsplan

- Schirmwechsel: Inhalt 180 ms, 6 px von unten und einblenden, `cubic-bezier(.2,.7,.2,1)`; Navigation bleibt stabil.
- Blatt öffnen: 260 ms von unten, 16 px Einstieg, gleiche Kurve. Abdunklung 180 ms. Kein zweites Blatt und kein zweiter Zeki.
- Knopf drücken: 100–180 ms, 1 px nach unten, ohne Größenpuls. Tastaturfokus bleibt sichtbar.
- Abhaken: 160 ms Haken einblenden; erst nach bestätigter App-Aktion. Keine eigene Logik und keine vorschnelle Erfolgsmeldung.
- Speichern: vorhandenen Ladezustand zeigen; bei bestätigtem Erfolg 220 ms ruhige Bestätigung, Zeki nickt 1.000 ms. Bei Fehler prüfende Miene, keine Erfolgsgeste.
- Tag geschafft: einmal 1.100 ms ruhiges Freuen/Nicken; kein Konfetti, keine Endlosschleife.
- Leerlauf: Atmen 4.200 ms, Gewicht 13.000 ms, sehr klein. Unregelmäßiges Blinzeln 2.500–6.000 ms und gelegentlich doppelt über den **vorhandenen** Taktgeber; kein Zwinkern im Leerlauf. Blick folgt der Aufgabe, nicht zufälligen Bewegungen. Echte Zufallsplanung braucht den bestehenden JS-Taktgeber und ist hier nicht neu eingebaut.
- Bildfolgen: zeilenweise von links oben nach rechts unten, 25 Frames. 1.800 ms je technische Probe, Auftreten/Abgehen 2.400 ms. Native Bildfolgen zeigen keine eingebaute App-Ereignisentscheidung.
- Warnung/Fehler: neutral bis ernst, Blick zur betroffenen Aufgabe, kein Grinsen/Daumen. Bisherige Ausdruckslogik beibehalten.
- Bewegung reduzieren: alle CSS-Animationen/Transitions aus, passende statische Miene bleibt. Das vorhandene App-JS muss Raster und SVG-Gesten ebenfalls nicht starten. Ladezustand bleibt als Text verständlich.

## Intro-Storyboard (keine neue Funktion)

- 0–1.000 ms: leerer Papier-Raum, Zeki tritt von rechts vor, weicher Bodenschatten, Bühne leer.
- 1.000–2.200 ms: Hand an die Schürze, Karte/Sprachfeld wird unten eingeführt.
- 2.200–3.800 ms: Zeki stellt sich vor; bestehende Sprachwahl wird sichtbar. Mit reduzierter Bewegung sofort statisch Sprache zeigen.
- Keine zusätzlichen Pflichtschritte, keine Änderungen an der aktuellen Einrichtung. Das ältere Schloss-Storyboard darf keine heute nicht vorhandenen Schritte erzwingen.

## Zuordnung je Bauart/Ansicht

- start: Ruhe hand; Ankommen nicken (1.000 ms); Erfolg bestaetigt/nicken; Warnung ernst/pruefen, niemals grinsen oder Daumen.
- foto-auswahl: Ruhe zeigen-unten; Ankommen nicken (1.000 ms); Erfolg bestaetigt/nicken; Warnung ernst/pruefen, niemals grinsen oder Daumen.
- zahl-eingeben: Ruhe schreiben; Ankommen nicken (1.000 ms); Erfolg bestaetigt/nicken; Warnung ernst/pruefen, niemals grinsen oder Daumen.
- rundgang: Ruhe pruefen; Ankommen nicken (1.000 ms); Erfolg bestaetigt/nicken; Warnung ernst/pruefen, niemals grinsen oder Daumen.
- abhak-liste: Ruhe zeigen-links; Ankommen nicken (1.000 ms); Erfolg bestaetigt/nicken; Warnung ernst/pruefen, niemals grinsen oder Daumen.
- geschafft: Ruhe jubeln; Ankommen nicken (1.000 ms); Erfolg bestaetigt/nicken; Warnung ernst/pruefen, niemals grinsen oder Daumen.
- buero: Ruhe nachdenken; Ankommen nicken (1.000 ms); Erfolg bestaetigt/nicken; Warnung ernst/pruefen, niemals grinsen oder Daumen.
- eintragsliste: Ruhe suchen; Ankommen nicken (1.000 ms); Erfolg bestaetigt/nicken; Warnung ernst/pruefen, niemals grinsen oder Daumen.
- eintrag-aendern: Ruhe preis; Ankommen nicken (1.000 ms); Erfolg bestaetigt/nicken; Warnung ernst/pruefen, niemals grinsen oder Daumen.
- zahlen-verlauf: Ruhe zahlen-zeigen; Ankommen nicken (1.000 ms); Erfolg bestaetigt/nicken; Warnung ernst/pruefen, niemals grinsen oder Daumen.
- papier-aushang: Ruhe papier-zeigen; Ankommen nicken (1.000 ms); Erfolg bestaetigt/nicken; Warnung ernst/pruefen, niemals grinsen oder Daumen.
- blatt-sperre: Ruhe pruefen; Ankommen nicken (1.000 ms); Erfolg bestaetigt/nicken; Warnung ernst/pruefen, niemals grinsen oder Daumen.
- intro: Ruhe auftreten; Ankommen nicken (1.000 ms); Erfolg bestaetigt/nicken; Warnung ernst/pruefen, niemals grinsen oder Daumen.
- sprache: Ruhe hand; Ankommen nicken (1.000 ms); Erfolg bestaetigt/nicken; Warnung ernst/pruefen, niemals grinsen oder Daumen.
- laden: Ruhe zeigen-links; Ankommen nicken (1.000 ms); Erfolg bestaetigt/nicken; Warnung ernst/pruefen, niemals grinsen oder Daumen.
- karte-fotografieren: Ruhe foto; Ankommen nicken (1.000 ms); Erfolg bestaetigt/nicken; Warnung ernst/pruefen, niemals grinsen oder Daumen.
- kuehlgeraete: Ruhe pruefen; Ankommen nicken (1.000 ms); Erfolg bestaetigt/nicken; Warnung ernst/pruefen, niemals grinsen oder Daumen.
- kosten: Ruhe preis; Ankommen nicken (1.000 ms); Erfolg bestaetigt/nicken; Warnung ernst/pruefen, niemals grinsen oder Daumen.
- fertig: Ruhe jubeln; Ankommen nicken (1.000 ms); Erfolg bestaetigt/nicken; Warnung ernst/pruefen, niemals grinsen oder Daumen.
- fuehrung: Ruhe zeigen-oben; Ankommen nicken (1.000 ms); Erfolg bestaetigt/nicken; Warnung ernst/pruefen, niemals grinsen oder Daumen.
- heute-morgen: Ruhe hand; Ankommen nicken (1.000 ms); Erfolg bestaetigt/nicken; Warnung ernst/pruefen, niemals grinsen oder Daumen.
- heute-mittendrin: Ruhe zeigen-unten; Ankommen nicken (1.000 ms); Erfolg bestaetigt/nicken; Warnung ernst/pruefen, niemals grinsen oder Daumen.
- heute-abend: Ruhe nicken; Ankommen nicken (1.000 ms); Erfolg bestaetigt/nicken; Warnung ernst/pruefen, niemals grinsen oder Daumen.
- menue-blatt: Ruhe zeigen-links; Ankommen nicken (1.000 ms); Erfolg bestaetigt/nicken; Warnung ernst/pruefen, niemals grinsen oder Daumen.

## Abnahme

Automatische Dateikontrollen stehen in `design/PRUEFPROTOKOLL.json`. Rastergröße, Alpha-Rand, Dateigrößen und Schrift-Zeichenbestände sind messbar geprüft. Bewegungsqualität, gemalter Stil, exakte Markenidentität, vollständige Palette der Figur und reale App-Bedienung sind NICHT bestanden. Keine pauschale „alles OK“-Prüfliste.
