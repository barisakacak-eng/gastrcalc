FÜR ZORO:

Stand 24.10.2026: Baris hat die Korrekturen und die weitere Umsetzung im Chat freigegeben. PR #15 bleibt ein Vorschlag gegen main; kein Merge durch Sanji.

Fertig: Laden-Vorlage im bestätigten Heute-Stil; „Weniger Verlust · 84 €“ statt einer unbelegten Spar-Aussage. Alle zehn Markensatz-Platzhalter nennen eine Handlung, Frage oder konkrete Prüfung. Die endgültigen 40 Sätze bleiben Frankys Aufgabe.

Die Designtexte sind aus de.js, tr.js und en.js entfernt und liegen nur noch unter design/schablone-texte.js. Die App und ihre Offline-Liste laden diese Vorschautexte nicht. Andere Sprachschlüssel und Fachlogik bleiben erhalten.

Prüfungen: Offline-Liste neu erzeugt; UTC und Europe/Berlin jeweils 690 bestanden, fünf bestehende optionale Prüfungen ausgelassen, kein Fehler. Alle 18 Sprachtabellen, Bildschirm-Regelprüfung (0 Verstöße) und Personal-Durchlauf grün.

App-Umsetzung, bearbeitbare 3D-Quelle und Zeki-Mimik folgen in PR #16. Bei gemeinsamer Übernahme beider PRs Sprachdateien und generierte Offline-Liste zusammenführen und tools/sw_liste.py erneut laufen lassen. Nie eine der alten Designtext-Tabellen zurück in js/lang übernehmen.
