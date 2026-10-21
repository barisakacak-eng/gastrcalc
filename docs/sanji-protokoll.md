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
