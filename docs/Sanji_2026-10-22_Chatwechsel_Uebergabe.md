# Sanji – Chatwechsel / Stand 22.10.2026 abends

## Verbindliche Quellen & Stand
- Kapitänsfreigaben dieses Projektchats haben Vorrang vor älteren Dateien: `main/bruecke/stand.md` ist auf 16.10.2026 datiert und für das aktuelle Facelift nicht mehr maßgeblich.
- Tatsächliche Codeänderungen: [PR #5](https://github.com/barisakacak-eng/gastrcalc/pull/5), Branch `sanji/facelift-1-0-integration`. Am 22.10. abends zuletzt geprüft: Head `75760f22d6cab7de3dae36360f6a11a718d0c9de`, **PR offen**, `main`/öffentliche Live-App unverändert.
- Weitere Entscheidungen: [Protokoll](https://github.com/barisakacak-eng/gastrcalc/blob/sanji/protokoll/docs/sanji-protokoll.md), [Nutzenvertrag](https://github.com/barisakacak-eng/gastrcalc/blob/sanji/protokoll/docs/sanji-facelift-versprechen-2026-10-22.md).
- Eine ausführlichere Übergabedatei wurde im vorigen Chat separat zum Herunterladen erstellt: `Sanji_2026-10-22_GastroCalc_Chatwechsel_Uebergabe.md`. Sie ist nicht automatisch in jedem neuen Chat sichtbar – nötigenfalls dort hochladen.

## Freigaben des Kapitäns
- **Facelift 1.0:** Variante **B** als Design-/Bedienbasis (Premium „Waste zu Gewinn“), **C** als zusätzliche Büro-/Einstellungs-/Ordner-Organisation. Keine neuen Stilrichtungen und keine alten abgelehnten Bilder.
- **Pilot gleichzeitig Döner + Smash Burger**. Freigegebene korrigierte Fotos exakt verwenden: Döner im türkischen Fladenbrot (kein Gyros/Pita), Dönerteller mit Fleisch/Beilagen statt Salat-Bowl; hochwertige realistische Smash-Burger-Produkte. Lokale Einzel-WebP, keine externen Fotos/Marken.
- **Drei Versprechen:** 1. täglich erkennen, wie Geld/Kostendeckung und Gerichte laufen; 2. weniger Müll, weniger gebundenes Lagerkapital; 3. weniger Papierkram. Keine unbewiesenen Einsparungen oder automatischen Erledigt-Meldungen.
- **Reihenfolge:** L1 Heute, L2 Müll/Station, L5 Karte, L6 Abschluss, B1 Büro/Ordner/Inventur, danach Kühlung, Putzen, Personal. Geparkt: Menütafel, Aktionen, Kasse, Getränke-Feinheiten, weitere Sprachen, DATEV.
- **Effizienz:** Sanji arbeitet selbstständig in größeren zusammenhängenden Blöcken, direkt auf separatem Branch, mit Tests. Keine Zwischen-Collagen/unnötigen ZIPs, bei Abnahme **ein echter Browser-Screenshot**, keine Fantasie-Demo. Keine Nachricht an Zoro bis Freitag; Franky prüft Steuerrecht, Zoro Rechenkern; keine doppelte Recherche.
- **Striktes Release-Gate:** kein Merge nach `main`, keine Live-App-Änderung ohne ausdrückliches Go und saubere Tests.

## Was bereits gebaut ist
- Premium-Facelift-CSS, lokale SIL-OFL `DM Serif Display`, Kräutergrün/Creme/Kupfer; Hero nach Ladenart.
- 12 bestätigte lokale Premium-WebP für beide Pilotbetriebe und Bildmapping in `js/bilder.js`, `js/data/fotos.js`; Tests schützen Dönerteller, Döner Box, Burgerzutaten.
- Müll-Premiumraster und **Müll-Station Vollbild** ohne Euro/Tab-Leiste, inaktive „— kg“, gleiche gespeicherte Tipp-/Mengen-/Rückgängig-Funktionen.
- Karte mit **beiden befüllten Test-Pilotläden** (4 Gerichte je Pilot, nur als Beispiel), passenden Fotos, Margen-Ampel, Preis, Euro-/Prozentbetrag aus bestehendem Rechenkern; echte Browserabnahme [39760842660](https://github.com/barisakacak-eng/gastrcalc/actions/runs/39760842660).
- Büro/Ordner/Inventur optisch nach C organisiert, echte Statuswerte, keine erdachte Beleg-Automatik.
- **L6 „Tag abschließen“ ist nach diesem Chat nicht mehr offen!** B-Premium-Bilanz umgesetzt und mit echtem Browser geprüft: „Bis null fehlen 98 €“ (Beispieldaten) statt missverständlichem negativen Zähler; Disclaimer „kalkulatorisch, kein Kontostand“. [Browser-Abnahme 39778827930](https://github.com/barisakacak-eng/gastrcalc/actions/runs/39778827930). Version laut aktuellem Protokoll `2026-10-22.11`, Offline-Fingerprint `3f2cee1d3f3e`; beim Neustart live prüfen.
- Laut letztem geprüften GitHub Actions [39779434869](https://github.com/barisakacak-eng/gastrcalc/actions/runs/39779434869) **3 weiterhin rote Fachtests**: Aktionen/Haltbarkeit, Zweitlieferant, Büro-Menütafel; dokumentiert zuletzt 635 Node-Tests bestanden und 5 übersprungen. Nicht behaupten, CI sei vollständig grün.

## Neue Datenverträge – warten auf Zoros Rechenkern / Frankys Quellen
- `nutzen = {summe, posten:[{art:'muell'|'preis'|'lager'|'papier', euro, gemessen, quelle}], ab}`: Summe **nur gemessen und ohne Doppelzählung**; Schätzungen grau/≈, ohne Messung „Messung läuft seit …“. Lagerkapital ist nicht Gewinn; L1 maximal 15 sichtbare Wörter, Nutzen-Karte ersetzt bestehendes Element.
- `hinweis = {titel,satz,quelle,knopf:'Belege bereitlegen',status:'neu'|'erledigt'|'später'}`: erst nach Frankys belegter Steuerprüfung. Immer „Allgemeiner Hinweis, keine Steuerberatung – mit deinem Steuerberater klären.“ Keine „KI-Steuerberater“-Rolle; Assistent erklärt „Ich bin ein KI-Assistent.“
- Codes/PIN nur während Testphase von Zoro kontrolliert abschaltbar, keinen neuen PIN-Screen entwerfen; DATEV ausgeschlossen.

## Offene Nebenaufgabe
Kapitän bat um Durchsicht **GitHub-Benachrichtigungen in Gmail**, Übersetzung in einfaches Deutsch, harmlose Mails markieren und wichtige Meldungen behalten. Die Suche wurde im alten Chat angestoßen, **abschließende Sichtung und Markierung wurden nicht bestätigt**. Beim nächsten passenden Auftrag weiterarbeiten, nicht behaupten erledigt.

## STARTPROMPT NEUER PROJEKTCHAT
Sanji, wir setzen GastroCalc auf Basis der Übergabe vom 22.10.2026 fort. Lies **zuerst diese Datei vollständig**, dann die neueste `main/bruecke/`, `sanji/protokoll/docs/sanji-protokoll.md` und **PR #5** (`sanji/facelift-1-0-integration`). Ältere Brückenstände vom 14.–16.10. gelten bei Widerspruch nicht gegenüber Kapitäns-Freigaben vom 21.–22.10. Die verbindliche Richtung ist B als visuelle Grundlage plus C nur für Büro/Ordnung; Premium-Bildwelt 1:1 für Döner und Smash Burger, beide gleichrangig. **Starte nicht erneut mit L6 – es ist bereits gebaut und browsergeprüft.** Prüfe zuerst letzte Commits/Tests und arbeite dann an der nächsten sinnvollen größeren, vorhandenen Produktaufgabe. Direkt im eigenen Branch, keine Rechenlogik erfinden, keine Steuerbehauptungen ohne Frankys Quelle, kein `main`-Merge/Release ohne mein Go. Zeige höchstens einen realen App-Browser-Screenshot, falls ich danach frage. Keine unnötigen Dateien, Zwischenbilder oder Einzelübergaben an Zoro; Protokoll weiterführen. Gmail-GitHub-Mails sind noch als offene Aufgabe vorgemerkt.
