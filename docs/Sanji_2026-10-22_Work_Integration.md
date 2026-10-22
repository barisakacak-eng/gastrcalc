# Work-Integration vom 22.10.2026

Ausgangspunkt: `75760f22d6cab7de3dae36360f6a11a718d0c9de`, PR #5, Branch `sanji/facelift-1-0-integration`.
Arbeitsbranch: `work/facelift-integration-2026-10-22`. Ziel des neuen PR: ausschließlich der Facelift-Branch. Kein Merge, kein Live-Deploy.

## Verifizierte Ausgangslage

- `main`: `ffc016018a10e3e7af831555d072e59c1289091a`.
- `sanji/protokoll`: `3e9dfe4a472b83ea8d75267224d1df7f9bdde353`.
- Die exakte Datei `GastroCalc_Bruecke_Sanji.md` fehlt in allen drei untersuchten Branches. Vollständig gelesen wurden der verfügbare `bruecke/stand.md`, die Chatwechsel-Übergabe, das Nutzenversprechen und das Sanji-Protokoll. Die Brücke vom 16.10. ist veraltet; Kapitänsentscheidungen vom 21./22.10. und dieser ausdrückliche Integrationsauftrag haben Vorrang.
- PR #5: 156 Commits, 38 geänderte Dateien, keine Diskussion oder Reviews mit weiteren Auflagen. Commit-Liste und kumulativer Code-Diff geprüft. Seit L6-Browserabnahme bei `894692c` kam nur `75760f2` mit Cache-Fingerprint und Rückkehr zum optionalen Zusatztest hinzu; keine weitere L6-UI-Änderung.
- Offene PRs #2 (L2), #4 (L3) und #3 (Protokoll) sind eigenständige Lieferungen. Nicht blind zusätzlich zu #5 übernehmen: L2 überschneidet sich, L3 ist noch ein gesonderter Prüfstand, #3 enthält die neueren Entscheidungen.

| Bereich | Tatsächlich vorhanden | Grenze |
| --- | --- | --- |
| L1 Heute | Monatsziel, bestehende Zahlen, priorisierte nächste Handlung, Döner-/Burger-Hero | `nutzen` ist noch nicht implementiert |
| L2 Müll / Station | Erfassen, Mengen, Suche, Rückgängig, dieselben gespeicherten Einträge | Keine Waage, keine bewiesene Einsparung |
| L5 Karte | Vier fiktive Gerichte je Pilot prüfbar; Premium-Fotos, Preis, Euro-/Prozentanzeige aus dem vorhandenen Kern | Güte hängt von den eingegebenen Daten ab |
| L6 Tagesabschluss | Bereits abgenommen, Checkliste und Bilanz aus vorhandenem Kern | Kalkulatorischer Monatsstand, kein Kontostand |
| B1 / Ordner | Echte Statuswerte, Vorschau, Druck/PDF, CSV und Sicherung | Keine automatische Sortierung oder Einreichung |
| Inventur / Lager | Zählen, Pausieren, Fortsetzen, vorhandene Bestandsdarstellung | Lagerkapital ist kein Gewinn |
| Kühlung / Putzen / Personal | Bestehende Arbeitswege; zusätzliche L3-Fassung in PR #4 | Nicht parallel neu entwickelt |

## Die drei roten Tests: Ursache statt Vermutung

Unverändertes `main` und unveränderter Facelift-Head zeigen dieselben drei Fehler. Kein Rechenfehler wurde nachgewiesen. Alle drei sind **C: veraltete Testannahmen** mit laufender Systemuhr; die Beispieldaten und Erwartungen sind auf feste Tage datiert.

| Test | Reproduzierbare Ursache | Änderung |
| --- | --- | --- |
| `aktion_plan.test.mjs: Bildschirm Aktionen & Haltbarkeit` | Beispiel vom 18.10.; Bildschirm und `akt-tafel` suchen am tatsächlichen Tag. Abgelaufene Ware wird korrekt nicht mehr vorgeschlagen. | Nur innerhalb dieses Tests Date auf den 18.10. mittags setzen |
| `lieferanten.test.mjs: Zweitlieferant` | Kernprüfung erhält explizit Montag 19.10.; `bestandView` benutzt dagegen die Rechneruhr und zeigt eine spätere Lieferwoche. | Nur innerhalb dieses Tests Date auf Montag 19.10. mittags setzen |
| `tafel.test.mjs: Oberfläche Büro-Kachel` | Abverkaufs-Knopf wird für das Beispiel vom 18.10. erwartet, die Oberfläche beurteilt jedoch das aktuelle Haltbarkeitsdatum. | Nur innerhalb dieses Tests Date auf den 18.10. mittags setzen |

Die Testuhr wird vom Node-Testkontext automatisch zurückgesetzt. Assertions, fachliche Erwartungen und Produktcode bleiben erhalten. Alle 35 Prüfungen dieser drei Dateien bestehen auch mit Node 22 (CI-Version). Kein paralleler Rechenkern und keine Lockerung der Haltbarkeit.

## Umgesetzte Oberfläche

- L1: `Schätzung` steht sichtbar neben dem vorhandenen ≈-Betrag. Die Tempo-Prognose bleibt in der zugänglichen Beschreibung der Monatskarte; die doppelte Überzeile „Jetzt dran“ entfällt. Vier Zahlenfelder und eine priorisierte Hauptaktion bleiben erhalten. Kein neuer Nutzenbetrag, keine erfundene Messung. Kurzes englisches Break-even-Label für das Wortbudget.
- B1: Einstellungen und Sicherung sind direkt erreichbare große Zeilen außerhalb der eingeklappten Verwaltungsbereiche. Bestehende Aktionen werden weiterverwendet, doppelte Einstiege entfernt.
- Einstellungen: derselbe Büro-Rahmen, eindeutiger Rückweg und direkter Sprung zur Sicherung mit vorhandener Navigation, ohne zusätzliche Browser-Hashroute. Vorhandene Status- und Fehlermeldungen bleiben erhalten.
- Ordner: wichtige Export-, Zeitraum- und Vorschauknöpfe mindestens 56 px; lange Texte können umbrechen. „Drucken / PDF“ beschreibt den tatsächlichen Druckweg. Bei einer leeren Prüfliste kein falsches „Alles vollständig“.
- Premium-Fotos, Piktogramme, Mapping und lokale Schriften sind bytegleich zur Ausgangsfassung. Keine neuen Food-Fotos. Eigene Wirtsfotos behalten Vorrang; zusätzlicher Regressionstest für beide Piloten.
- Workflow: PRs gegen den Facelift-Branch erhalten Prüfungen. Der Deploy-Job ist zusätzlich ausdrücklich auf `refs/heads/main` begrenzt, auch bei manuellem Workflowstart. Diese Sitzung startet keinen Deploy.

## Geänderte Dateien (gegenüber dem Ausgangs-Commit)

- Oberfläche: `css/facelift-v1.css`, `js/screens/home.js`, `js/screens/buero.js`, `js/screens/ordner.js`, `js/lang/en.js`.
- Offline/Prüfablauf: `sw.js`, `js/fassung.js`, `.github/workflows/pages.yml`.
- Tests: `tests/aktion_plan.test.mjs`, `tests/lieferanten.test.mjs`, `tests/tafel.test.mjs`, `tests/pilotbilder.test.mjs`, `tests/work_integration_browser.py`.
- Übergabe: `docs/Sanji_2026-10-22_Work_Integration.md`, `docs/sanji-protokoll.md` (vollständige bisherige Fassung plus neuer Abschnitt).

## Prüfstand

- `TZ=UTC npx --yes --package=node@22 node --test tests/*.mjs`: 644 Tests, **639 bestanden, 0 fehlgeschlagen, 5 übersprungen**.
- Derselbe vollständige Lauf mit `TZ=Europe/Berlin`: **639 bestanden, 0 fehlgeschlagen, 5 übersprungen**.
- `node tools/sprachpruefung.mjs`: alle 18 Tabellen strukturell vollständig. Keine neue Sprache; DE/TR/EN im Browser geprüft, keine Muttersprachlerfreigabe aller 18 behauptet.
- `python3 tests/regeln.py`: 390×844 / 360×780, **0 neue und 0 bekannte Verstöße**.
- `python3 tests/durchlauf_personal.py`: bestanden.
- `python3 tests/work_integration_browser.py`: **12/12 Pilot-/Sprach-/Größenkombinationen bestanden**, jeweils offline: Döner und Smash Burger × DE/TR/EN × beide Größen. Ohne die frühere Testhilfe, welche Büro-Gruppen automatisch öffnet.
- Zusätzlich je Pilot: Umsatz speichern, Müll erfassen und zurücknehmen, Inventur zählen/pausieren, Tagesabschluss ausführen, vollständige ZIP herunterladen und in einem zweiten frischen Browserkontext wiederherstellen. Ungültiger ZIP-Import lässt die Fachdaten unverändert. Anschließender Offline-Neustart behält Gerichte, Artikel, Tagesnotiz, Müll, Inventur und Abschluss.
- Nach dem Neustart ergänzte Rezeptfamilien und Schema-Standardfelder sind reguläre Startnormalisierung, kein Datenverlust. Die Testvorbereitung verwendet dieselbe Rezept-Zuordnung; die verglichenen Fachdaten werden nicht weggefiltert.
- Geprüft: geladene korrekte Premium-Gerichtsfotos und Margenanzeige, horizontales Überlaufen, kurze L1 einschließlich Navigation (Daten wie Ladenname/Datum ausgenommen), genau eine Hauptaktion, Hauptknopf oberhalb der Navigation, Ordner-/Einstellungsknöpfe ≥56 px, Vorschauen, echte CSV-Downloads, Rückwege und JavaScript-Fehler.
- Offline-Fassung **2026-10-22.13**, Fingerabdruck **fc719c902e7b**, 270 App-Dateien / 235 unveränderte Fotos. Manifest mit `tools/sw_liste.py` erzeugt; `git diff --check` bestanden.

Prüfartefakte sind echte Browseraufnahmen mit ausschließlich fiktiven Beispieldaten und werden nicht als Produktdateien eingecheckt.

## Gmail: 39 Meldungen, gruppierte Ursachen

Alle 39 aktuellen GitHub-Fehlermeldungen der letzten zehn Tage gelesen und den zugehörigen Actions-Jobs zugeordnet. Keine Mail geändert, markiert, archiviert oder gelöscht. Keine Mailinhalte, Adressen oder Benachrichtigungstokens im Repository gespeichert.

- Wiederkehrende drei Datumsannahmen: z.B. [Facelift-Head 39779434869](https://github.com/barisakacak-eng/gastrcalc/actions/runs/39779434869), [Protokoll 39846787895](https://github.com/barisakacak-eng/gastrcalc/actions/runs/39846787895). Im Work-Branch durch begrenzte Testuhren behoben; auf den unveränderten alten Branches bleiben die Meldungen nachvollziehbar.
- Bereits behobene Zwischenstände: fehlender SW-Fingerprint/Fassungsnummer, frühere Schriftgrößen und Heute-Reihenfolge. Die aktuellen vollständigen Prüfungen kontrollieren dieselben Schutzregeln weiter.
- Bereits behobener Facelift-Überlauf: [39686033179](https://github.com/barisakacak-eng/gastrcalc/actions/runs/39686033179), Müll 859 statt 844 px. Aktuelle Regelprüfung ohne neue Verstöße.
- Testumgebung/Artefakt: [39668202691](https://github.com/barisakacak-eng/gastrcalc/actions/runs/39668202691), unzulässiger relativer Upload-Pfad. Der Facelift-Head verwendet bereits einen vorbereiteten Artefaktordner.
- Separater L3-Branch: [39580453198](https://github.com/barisakacak-eng/gastrcalc/actions/runs/39580453198), veralteter SW-Fingerprint und Timeout im Personal-Durchlauf. Nicht als neuen Work-Fehler zählen. Vor eigenständiger Übernahme von PR #4 erneut prüfen; der aktuelle Work-Personal-Durchlauf besteht.
- Ältere main-Fehler (Büro-Code, Inventur am selben Tag, fehlende Offline-Dateien) werden durch die aktuellen Tests nicht reproduziert. Zwei alte Fehlermails gehören inzwischen zu erfolgreichen Wiederholungen: [39138817054](https://github.com/barisakacak-eng/gastrcalc/actions/runs/39138817054), [39035508773](https://github.com/barisakacak-eng/gastrcalc/actions/runs/39035508773). Eine historische Timeout-Meldung ist durch spätere grüne Browserläufe überholt.

## Integration und offene Verträge

1. Diesen PR zuerst in `sanji/facelift-1-0-integration` prüfen und übernehmen. Noch nicht nach main mergen.
2. Protokollfortsetzung enthält unverändert den Stand aus `sanji/protokoll` plus diesen Abschluss. Beim späteren Zusammenführen neuere Einträge erhalten.
3. PR #2/#4 nicht pauschal darüber mergen; Überschneidungen und SW-Manifest getrennt vergleichen. Nach einer bewussten Integration `python3 tools/sw_liste.py` einmal ausführen und die vollständigen Prüfungen wiederholen.
4. Zoro liefert `nutzen` mit belegten Messungen, ohne Doppelzählung, einschließlich sauberer Trennung von Lagerkapital und Gewinn. Schema im aktuellen Produktcode noch nicht vorhanden; kein Ersatz-Rechenmodell gebaut.
5. Franky liefert geprüfte Steuertexte und Quellen für `hinweis`; bis dahin keine Steuerkarte und keine Rechtsbehauptung. PIN-Testschalter und DATEV unverändert zurückgestellt.
6. Erst nach Review, grünem Gesamtcheck und ausdrücklichem Kapitäns-Go ist eine spätere Veröffentlichung zu entscheiden.
