# FÜR ZORO: Euro-Zähler L1 v1 – Variante A

Freigabe: Auftrag vom 23.10.2026, 13:30. Lieferung für Tag 1, 24.10.2026.
Sockel: `zoro/vertraege-nutzen-hinweis`, Commit `314840f6626c8bc7664b286927b743cfef077953` (PR #9 auf PR #8).
Arbeitsbranch: `sanji/euro-zaehler-l1-v1`.

## Ergebnis

- `js/screens/home.js` liest einmal `nutzenStand(stand, H)` und zeigt die freigegebene eigene Karte zwischen Zielkarte und vier Kacheln. Der Kupfertrenner entfällt; die bestehende Kurve und die korrekten Pilotfotos bleiben.
- Ohne Messung (`leer`) ausschließlich `Messung läuft seit <ab>`, keine Überschrift und kein Eurobetrag. Das gilt auch bei bereits vorhandenen Schätzungen. Bei `ab: null` wird kein Datum erfunden: `Messung läuft seit –`.
- Mit Messung steht ausschließlich `summe` groß; nicht gemessene positive Posten bleiben separat grau mit `≈`, passendem Symbol und ihrer gelieferten Quelle als zugänglicher Beschreibung. Keine Addition oder neue Nutzenrechnung im Bildschirm. 0 bleibt 0 und neutral.
- `js/screens/nav.js` nimmt den vom Bildschirm gelieferten Helferzustand an: bei `summe > 0` freundlich, sonst neutral. Auf Heute ohne Augenanimation. Andere Bildschirme behalten ihr bisheriges Verhalten.
- CSS ausschließlich im Abschnitt `/* Euro-Zähler – Sanji */` in `css/optik.css`. Spezifische Selektoren schützen vor den später geladenen CSS-Dateien; keine Änderung der Farbwerte, Pilotbilder oder Schriften.
- Das Wortbudget entsteht durch kurze Ziel-/Handlungstexte und Symbole statt doppelter Kachelnamen. Alle vier Kacheln haben zugängliche Namen; Navigation und Priorität der Hauptaktion bleiben bestehen. Die ausführliche Aufgabenbeschreibung bleibt im zugänglichen Knopfnamen. Der zusätzliche Updateknopf auf Heute entfällt; derselbe Updateweg bleibt im bestehenden Büro-Hinweis erreichbar.
- DE/TR/EN sind ausgearbeitet. Alle 18 Sprachdateien enthalten die neuen Schlüssel. Für `ar, fa, ku, pl, ro, bg, ru, uk, sq, bs, el, it, es, fr, vi` ist die Übersetzung **offen**; neue Texte dort ausdrücklich als deutscher Zwischenstand gekennzeichnet.

## HTML-Tagesmappe

[Sanji_2026-10-24_Tagesmappe_Euro-Zaehler_A.html](2026-10-24_euro-zaehler/Sanji_2026-10-24_Tagesmappe_Euro-Zaehler_A.html)

Eigenständig offline nutzbar: eingebettete Bilder, Schriftdateien und tatsächliche Browser-DOM-Ansichten aus dem lokalen Prüflauf. Auswahl beider Piloten, DE/TR/EN, 390×844 / 360×780, fünf Zustände. Ausschließlich fiktive Testdaten, keine Kundendaten; die eingefrorenen App-Knöpfe speichern nichts. Die Beispielbeträge sind an den aktuellen Vertrag angepasst: keine gemischte Gesamtsumme aus Messung und Schätzung wie im früheren Entwurf.

## Prüfung

- Node 22.23.4, jeweils UTC und Europe/Berlin: **677 Tests, 672 bestanden, 0 Fehler, 5 bestehende Auslassungen**. Keine Assertions abgeschwächt.
- Sprachprüfung: alle 18 Tabellen strukturell vollständig. Das ist ausdrücklich keine Freigabe der 15 offenen Übersetzungen.
- Regelprüfung 390×844 / 360×780: **0 Verstöße, 0 Konsolenfehler**; Personal-Durchlauf bestanden.
- Lokaler Work-Pilotdurchlauf: **12/12 bestanden**, Döner/Burger × DE/TR/EN × 390×844/360×780. Zusätzlich **60/60 Nutzenansichten** im echten App-Durchlauf geprüft: kein Messbeginn, laufende Messung, ausschließlich Schätzungen, positive Messung mit separat geschätztem Posten, gemessene 0. Für jede Ansicht einschließlich Navigation höchstens 15 Wörter, keine verdeckte Hauptaktion, keine seitlichen Überläufe. Zahlunterdrückung und Helferzustand direkt geprüft.
- Die HTML-Tagesmappe separat ohne Netz geöffnet und in allen **60 Kombinationen** geprüft: maximal **13 feste Wörter einschließlich Navigation**, **0 externe Netzaufrufe, 0 JavaScript-Fehler**, beide Handyformate ohne Überlauf oder verdeckte Hauptaktion.
- Neue Regressionen: `tests/nutzen_oberflaeche.test.mjs` prüft insbesondere Zahlunterdrückung vor Messung, Trennung von Summe/Schätzung, Maskierung der Quelle und tatsächliche Bindung an Zoros Kern ohne Datenmutation. `tests/nutzen_browser.py` erweitert den bestehenden Work-Durchlauf um die fünf Zustände.
- Offline-Dateiliste und Fingerabdruck wurden mit `python3 tools/sw_liste.py` erzeugt: Fassung `2026-10-23.5`, Fingerabdruck `8153b0f3da7e`. `sw.js` nicht von Hand geändert.

## Integrationsauftrag

PR zunächst gegen `zoro/vertraege-nutzen-hinweis`, wie ausdrücklich beauftragt. PR #8 und #9 waren beim letzten Abgleich noch offen. Sobald beide nach `work/facelift-integration-2026-10-22` übernommen sind: diesen Branch auf den tatsächlichen Work-Sockel rebasen, PR-Basis umstellen und dort die Prüfungen wiederholen. Keine Übernahme alter paralleler Nutzenanzeigen, kein Merge nach main und keine Veröffentlichung.

Die jetzige Workflow-Datei begrenzt `pull_request.branches` weiterhin auf main, Facelift und Work. Der zusätzliche Zoro-Bedingungsausdruck innerhalb des Pilot-Schritts erweitert diesen Ereignisfilter nicht. Deshalb wird ein lokaler grüner Stand nicht als gelaufene GitHub-CI gegen `zoro/…` ausgegeben; CI-Trigger bleibt bei Zoro.

## ÜBERGABE AN ZORO

Aufgabe: Euro-Zähler L1 v1, freigegebene Variante A.
Ergebnis: `home.js`, `nav.js`, Optikabschnitt, neue Sprachschlüssel, zwei Prüfdateien/Work-Erweiterung und verlinkte HTML-Tagesmappe.
Empfehlung: Variante A übernehmen; Kurve und gemessener Nutzen sind gleichzeitig sichtbar, der Leerzustand behauptet keine Ersparnis.
Offene Fragen: 15 Übersetzungen offen; fehlender Messbeginn erscheint als `–`. Nach PR #8/#9 auf Work umstellen.
Hinweise für den Code: `nutzenStand` bleibt alleinige Quelle; große Zahl nur `summe`, geschätzte Posten getrennt. Datum, 0 und Leerzustand nicht gleichsetzen. Keine Änderung von `js/nutzen.js` oder `docs/vertraege.md`.
