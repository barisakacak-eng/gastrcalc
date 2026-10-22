# Sanji – Arbeitsprotokoll

## 21.10.2026

| Bildschirm | Fassung | Branch / PR | Baris |
| --- | --- | --- | --- |
| L2 Müll: Laden und Station | v2 | [sanji/L2-muell](https://github.com/barisakacak-eng/gastrcalc/tree/sanji/L2-muell) · [PR #2](https://github.com/barisakacak-eng/gastrcalc/pull/2) | Ja/Kritik offen |
| L3 Kühlung | v2 | [sanji/L3-kuehlung](https://github.com/barisakacak-eng/gastrcalc/tree/sanji/L3-kuehlung) · [PR #4](https://github.com/barisakacak-eng/gastrcalc/pull/4) | Ja/Kritik offen |

- L2-Commit: `c5a0a6511e41ffbf6b5446036b1c9e14f6eaecb5`. Technische Prüfung durch Zoro bestätigt; keine Gestaltungsfreigabe vorweggenommen.
- L3-Commit: `ded7685a33f6aa10cc9603876a063d50677a9980`. Messung, Maßnahme, ggf. Ware und Nachkontrolle als kurze Schritte. Korrektur im offenen Rundgang und Fortsetzen bleiben möglich; Personal-Einstieg übernimmt die echte Schicht-Person.
- Main unverändert: `ffc016018a10e3e7af831555d072e59c1289091a`. Alle Bildschirm-Branches stammen von diesem main; kein Merge durch Sanji.
- Keine Nachricht an Zoro je Schritt. Der vollständige FÜR-ZORO-Block mit Quellen je Element steht in den Bildschirm-PRs.

### Prüfungen

- L2 damals: Node jeweils UTC/Berlin: 629 bestanden, 5 übersprungen, 2 bekannte Fehler. GitHub-UI-Regelprüfung bei 360/390 px und Personal-Durchlauf bestanden.
- L3 aktuell: `TZ=UTC node --test tests/*.mjs` und `TZ=Europe/Berlin node --test tests/*.mjs`: jeweils **636 Tests, 628 bestanden, 5 übersprungen, 3 fehlgeschlagen**. Keine zusätzlichen L3-Fehler im Node-Lauf.
- L3: 548 tatsächliche Render-Zustände in allen 18 Sprachen; bis 15 Wörter einschließlich sichtbarer Navigation, Namen und Platzhalter (Zahlen sind keine Wörter). Umfangreiche frei gewählte Namen können die Zahl erhöhen. Eigene Interaktionsprüfung: Eintragen, leere/abweichende Werte ohne Maßnahme sperren, Korrektur ohne Doppelung, Unterbrechen/Fortsetzen, Einzelmessung, Nachkontrolle, Müll erst bei Abschluss, fehlender Preis bleibt offen, Personal ohne Euro und mit richtiger Schicht-Person.
- `node tools/sprachpruefung.mjs`: alle 18 strukturell ok; `git diff --check`: ok.
- L3 v1: Browser-Regelprüfung 360/390 px und Personal-Durchlauf bestanden, [Lauf 39579461913](https://github.com/barisakacak-eng/gastrcalc/actions/runs/39579461913).
- L3 endgültiger v2-Commit: [Lauf 39580453198](https://github.com/barisakacak-eng/gastrcalc/actions/runs/39580453198), Browser-Ergebnis wird nach Abschluss ergänzt.
- Offline Ansichtsdatei und einzelne neue Mess-Unterseiten im Browser: **nicht geprüft**. Keine gemalten Mockups, keine neuen Bilder.

### FEHLT gesammelt

1. **Service-Worker-Version muss erhöht werden**: Zoro beim Mergen. Sanji ändert SW und Fassungsdatei nicht.
2. Bekannter Lieferanten-Test bleibt rot, laut Zoro bereits auf main; Bearbeitung bei Zoro.
3. **Zusätzlich heute rot auf unverändertem main:** `tests/aktion_plan.test.mjs:232`, „Aktionen & Haltbarkeit“. Ende im Test ist fest 2026-10-20, Vorschlag beginnt am tatsächlichen Tag 2026-10-21; `bis < von` wird abgewiesen. Im unveränderten Basis-Worktree bei ffc0160 reproduziert, betroffene Dateien sind unverändert. Nicht als L3-Fehler versteckt. Da Tests/Rechenwerk für Sanji gesperrt sind, hier nicht repariert.
4. Wegen Punkt 3 ist der Teststand insgesamt rot. Nach der Regel „jeder andere rote Test vor dem Weitergehen beheben“ beginnt L4 noch nicht. Keine stillschweigende zusätzliche Ausnahme angenommen.
5. L3: `kuehlStatus.heuteGemessen` zählt auch protokollierte Nicht-Messungen; bestehende Bezeichnung übernommen, Rechenwerk nicht verändert.
6. L3: vorhandene app.js-Meldung bei ungültiger Temperatur bleibt. Abschlussmeldung im Laden entfällt durch bestehenden allgemeinen Speichern-Pfad (900 ms, sofort beim Verlassen); damit entfällt dort auch das an den Abschluss-String gebundene Ereignis `rundgang-fertig`. Dieses Verhalten bei der Codeprüfung beachten.
7. L2 Müll-Station: nur flüchtiger Modus, kein dauerhafter Kiosk und keine Waagen-Anbindung. Gewicht bleibt inaktiv.
8. Neue Texte: DE/TR/EN geprüft; übrige 15 Sprachen: **Muttersprachliche Prüfung offen**.
9. Eigene CSS-Abschnitte pro Bildschirm und Sprachdateien können beim späteren Zusammenführen Anpassungen brauchen. Keine Sammeländerung auf main.

### Tagesmappe und nächste Arbeit

- Tagesmappe bei der Abendmeldung: L2 v2 (Laden + Station) und L3 v2. Nur derselbe Branch-Code mit eingebetteten Beispieldaten und Ressourcen, offline, je Bildschirm 390 px. Noch keine Tagesmappe ausgeliefert.
- Baris hat zu den Bildschirmfassungen noch kein Ja und keine Kritik gegeben. Technische Korrekturen vor der ersten Tagesmappe sind keine abgelehnten Entwürfe.
- Nach Auflösung des zusätzlichen Testhindernisses: L4 Putzen, L5 Karte, L6 Tag abschließen, P1 Personal-Start; danach ggf. B1 Büro-Start und B3 Listen.
- Für Freitag: PR-Liste mit Freigabe/Kritik/zurückgestellt sowie diese FEHLT-Liste und Risiken fortschreiben. Freigaben nur nach tatsächlichem Ja von Baris eintragen.

### IDEE – NICHT IM ENTWURF

Keine.


## 22.10.2026 – drei Nutzenversprechen und Freitag-Umsteuerung

- **Kapitän bestätigt neue Produktrichtung:** Geld pro Tag/Gericht, weniger Müll und gebundenes Lagergeld, Papierkram vorbereiten. **Döner- und Burgerläden zuerst**.
- **Priorität:** L1 → L2/Station → L5 → L6 → B1/Ordner/Inventur → L3 → L4 → P1.
- **NEU – Felder lt. Zoro 22.10.:** `nutzen` (nur gemessene, belegte Summen; sonst „Messung läuft seit …“) und `hinweis` (geprüfte Steueraussage, Fundstelle, 25 Wörter, Disclaimer). Keine eigenen Berechnungen oder Steuerbehauptungen durch Sanji.
- **PIN/Codes testweise aus** baut Zoro. **DATEV, Menütafel, Aktionen, Kasse, Getränke-Feinheiten, weitere Sprachen** bleiben geparkt.
- **Visual-Vertrag aktualisiert durch Kapitänsentscheidungen 21./22.10.:** aktuelle fünf Facelift-1.0-Referenzen und die drei Nutzenversprechen haben bei Widerspruch Vorrang vor altem Stand/Design B. Kein Merge ohne Go.
- **Bestehende Piktogramme wiederverwenden**, Burger-Rohwaren ergänzen; keine externen KI-Food-Fotos.
- **Keine Doppelrecherche**: Franky prüft Steuern, Zoro Rechenkern, Sanji UI.
- **Entscheidungsvorlage und Versprechen-Abgleich:** [docs/sanji-facelift-versprechen-2026-10-22.md](sanji-facelift-versprechen-2026-10-22.md). Enthält zwei umsetzbare Ansätze für L1 und B1, Zoro-Schnittstellen, Wortbudget-Konflikt und Freigabebedingungen.
- **PR #5** bleibt produktiver Facelift-Branch, dieser Protokoll-Branch archiviert nur Entscheidungen; keine App-Funktionsänderung vom 22.10. implementiert.


## 22.10.2026 – Facelift B/C freigegeben

- **Design 1.0 freigegeben:** B „Waste zu Gewinn“ als BILDSPRACHE UND BEDIENBASIS, C „Chef-Autopilot“ nur als Ordner-/Büro-/Einstellungs-Erweiterung. Maßstab ist die von Baris bestätigte Kombination aus B + C. Keine fiktiven Papier-Automationen, Steueransprüche oder Fantasie-Ersparnisse aus den KI-Konzeptbildern übernehmen.
- **Direkt implementiert:** `sanji/facelift-1-0-integration`, [PR #5](https://github.com/barisakacak-eng/gastrcalc/pull/5). In `css/facelift-v1.css`: L2 mit grünem Tageswert und 3 Premium-Fotospalten; Mengen in den echten Rohwaren-/Gerichtskacheln (früheres Paket 7); B1 mit 3 echten Ordner-Statuszeilen, vier bestehenden Funktionsbereichen und übersichtlicheren Einstellungs-/Inventur-Karten. Handlungen bleiben gleich. Die Marge in L5 ist ebenfalls bereits direkt aus dem Rechenkern sichtbar.
- **Werbepsychologie:** Das grüne Hero signalisiert Kontrolle, aber **niemals fiktive Einsparungen**. L2 vermittelt „Erfassen verhindert Blindflug“; L5 „was nach Kosten bleibt“; B1 „ich finde meine Unterlagen“. Zoros Nutzen-Schema und Frankys Steuerhinweise kommen später, nicht heute erfunden.
- **Praxischeck:** echte Playwright-Browseraufnahme aus GitHub Actions, Handy 390x844 und 360x780. Ein Screenshot für den Kapitän, kein ständiges ZIP. Foto- und Piktogramm-Dateien sind lokal, keine Online-Dienste. Schrift DM Serif bereits OFL-lokal.
- **Freitag:** Kein Direktauftrag an Zoro. PR-Files und dieser Protokollpunkt reichen als Sammelstand, nur finalen Teststatus/Fassung nach CI eintragen. Kein Merge auf `main` ohne Go.


## 22.10.2026 – Pilotgalerie: reale Bildzuordnung korrigiert

- **Direkte Umsetzung:** PR #5 im Branch `sanji/facelift-1-0-integration`. `js/data/fotos.js` aktiviert 5 vorhandene, visuell kontrollierte Pilotfotos: Burger-Bun, Vollkorn-Bun, Eisbergsalat, Salatgurke, Pide-Brot. Die 229 echten Bilder im Offlinekatalog sind nicht automatisch gleichbedeutend mit freigegebener Bildsprache; übrige Altbilder nicht blind freischalten.
- **Motiv-Schutz:** `js/bilder.js` vermeidet Wrap-Foto für „Döner Kebab“; Burgerbun bekommt das passende Foto; Cheddar, Burgersoße und Pickles bekommen erkennbare SVG statt falscher Pizzakäse-/Flaschen-Fotos. `bilder/r-pickles.svg` ergänzt. `css/facelift-v1.css` nutzt für den Heute-Hero ein Döner-im-Brot-Foto, nicht den irreführend beschrifteten Dürüm.
- **Tests:** `tests/pilotbilder.test.mjs` schützt Bildwahl und Existenz der lokalen Assets; der Offline-Fingerabdruck und Service Worker wurden angeglichen. **Keine Rechenlogik und keine neuen Kennzahlen.**
- **Noch OFFEN:** Die vom Kapitän zuletzt bestätigten korrigierten Foto-Originalmotive für Döner, Teller und die Smash-Burger-Produkte sind bisher nicht als eigenständige WebP im GitHub-Branch enthalten. Die aktuellen vorhandenen Familienfotos sind nur ein fachlich passender Zwischenstand, nicht als 1:1-Übernahme der Referenz ausgeben. Dafür Ziel-Dateien `foto/g-doener.webp`, `foto/g-doener-teller.webp`, `foto/g-smash-burger.webp`, `foto/r-fladenbrot.webp` aus freigegebenen Einzelmotiven ersetzen/ergänzen; danach Bilddateien und `js/data/fotos.js`/`sw.js` prüfen. Keine weiteren Konzepttafeln.
- **GitHub-Aufräumen:** `main` bleibt unverändert. Die neue Bild-UI wird nicht veröffentlicht, solange fachliche Tests rot sind; Zoro bekommt vor Freitag keinen Auftrag.
