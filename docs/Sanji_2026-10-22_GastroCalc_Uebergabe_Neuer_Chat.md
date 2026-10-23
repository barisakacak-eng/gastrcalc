# GASTROCALC – VERBINDLICHE SANJI-ÜBERGABE FÜR NEUEN PROJEKTCHAT
**Stand:** Donnerstag, 22.10.2026, abends (Europe/Berlin) · **Zweck:** Gespräch nahtlos fortsetzen ohne erneute lange Analyse und ohne Verlust der Designentscheidungen.  
**Priorität:** Freigaben des Kapitäns vom 21./22.10.2026 > ältere Brückendokumente (deren `stand.md` ist vom 16.10.!). Vor jeder tatsächlichen Codearbeit den neuesten GitHub-Stand selbst prüfen.  
**Öffentliches Repository:** https://github.com/barisakacak-eng/gastrcalc  
**Live-App (alter Stand, NICHT das Facelift):** https://barisakacak-eng.github.io/gastrcalc/  
**Produktiver Facelift-Entwicklungszweig:** `sanji/facelift-1-0-integration` · [PR #5](https://github.com/barisakacak-eng/gastrcalc/pull/5)  
**Sanji-Protokoll:** `sanji/protokoll`, `docs/sanji-protokoll.md`.

## 1. Wer entscheidet und wer macht was?
- **Kapitän:** Baris. Gastronomie-Experte, möchte Ergebnisse ohne Technikjargon und meist auf dem Handy. Entscheidet über Gestaltung und Freigaben. Nicht ungefragt nach Details fragen, die bereits beschlossen sind.
- **Sanji (ChatGPT):** Gestalter, Bildredaktion, nutzerzentrierte Texte, und nach aktuellem ausdrücklichen Kapitänsauftrag **selbstständiger direkter Einbau des Facelifts in einem GitHub-Branch**. Zoro nicht alle paar Minuten belasten. Keine Änderung von Rechenkern, Steuerlogik oder produktivem `main` ohne Go.
- **Zoro (Claude):** Strategie, Daten/Architektur, Rechenkern, Test- und Merge-Freigabe; sammelt Ergebnisse **am Freitag 23.10.2026**. Keine einzelnen Nachrichten an Zoro bis dahin.
- **Franky (Gemini):** Google-Werkstatt, Video/Dokumentenanalyse, steuerrechtliche Recherche und Gegenprüfung. Seine Fachinhalte nicht parallel neu recherchieren; spätere Einbindung erst mit geprüften Quellen.
- **Kein Slack nötig.** GitHub-PR + Protokoll sind die Übergabewege.
- Es gibt **keine ununterbrochene autonome Arbeit während Chat-Inaktivität**. GitHub Actions können lange laufen. Status immer anhand aktueller Tools prüfen, nicht behaupten, Stunden im Hintergrund gearbeitet zu haben.

## 2. Produkt und die drei Verkaufsversprechen
Offline-fähige Handy-Web-App für kleine inhabergeführte Gastronomie (1–15 Mitarbeiter); **Dönerläden und Smash-Burger-Läden gehen gleichberechtigt gleichzeitig in die Pilotphase**. Keine Kassenanbindung als Voraussetzung. Drei Ebenen LADEN, PERSONAL (ohne Euro) und BÜRO. **Drei sichtbar zu verkaufende Vorteile:**
1. „Du siehst jeden Tag, ob du Geld verdienst – und an welchem Gericht nicht.“
2. „Du wirfst weniger weg und hast weniger Geld im Lager liegen.“
3. „Dein Papierkram ist fertig, ohne dass du ihn machst.“ **Nur das versprechen, was die App tatsächlich umsetzt; keine vorgetäuschte Automatik.**
Entscheidend ist die **Haupthandlung pro Bildschirm**, nicht zusätzliche Werbeabsätze. Für Laden-Bildschirme möglichst höchstens **15 sichtbare Wörter einschließlich Navigation**, große Touch-Ziele, Lesbarkeit bei 390×844 und 360×780, längere türkische Wörter mitdenken.

## 3. VERBINDLICHE DESIGNFREIGABE (nicht wieder 3 neue Stilrichtungen entwickeln)
Baris hat endgültig entschieden: **„B“ („Waste zu Gewinn“) ist die gestalterische Foundation, „C“ („Chef-Autopilot“) nur die geordnete Büro-/Einstellungs-Erweiterung.** Warm, hell, Premium/Editorial, natürliches Kräutergrün, Creme, dezenter Kupferakzent, echte Food-Fotografie, große ruhige Karten, Premium-Serifentitel, klare Zahlen und ruhige Microinteraktionen. Kein dunkles Schwarz, keine schrille Buntheit, kein flaches Tabellengefühl. `css/facelift-v1.css` ist die existierende isolierte Designschicht, **DM Serif Display** liegt mit SIL-OFL-Datei lokal unter `fonts/`. Keine externen Schriften/Bilder/CDNs.
- Die **vom Kapitän ausdrücklich freigegebenen Pilot-Fotobilder** müssen auch wirklich als **einzelne lokale WebP-Dateien** in der App zu sehen sein. Nicht bloß im Mockup. Das ältere Bildset wurde ausdrücklich abgelehnt. Nicht versehentlich „Döner“ mit Gyros/Dürüm verwechseln, Dönerteller mit Salat-Bowl oder Fladenbrot mit Pita.
- Priorität Bildwelt: Döner im türkischen Brot, echter Dönerteller, Dürüm, Dönerbox, Fladenbrot, Smash Burger, Cheeseburger, Doppel-Smash, Burgermenü, Patty, Bun, Cheddar, Sauce, Pickles, Pommes. Gleiches Licht/Bildausschnitt/Qualität, lokal verfügbar, offline getestet.
- **Anforderung des Kapitäns:** Keine unnötigen Bildcollagen, ZIP-Versionen, Füllmaterial oder ständigen Zwischenstände. **Maximal ein echter Browser-Screenshot**, wenn eine Änderung visuell zu zeigen ist, es sei denn, Baris verlangt mehr. Vorschau klar als Browser-Test/Beispieldaten kennzeichnen. Konzepte nicht als echte Live-App ausgeben.
- Von allen neuen Vorschlägen **zwei bis drei Varianten** nur, wenn Baris ausdrücklich neue Designrichtungen zur Wahl will; freigegebene B/C-Fassung ansonsten konsequent weiterbauen.
- Fachliche Rechenwerte nie selbst erfinden oder ändern; Beispielzahlen in Screenshots klar „Beispiel“, geschätzte „≈“, echte Werte aus Engine.

## 4. Reihenfolge und geparkte Themen
**Priorisiert:** L1 Heute → L2 Müll und Müll-Station → L5 Karte/Margen-Ampel → L6 Tag abschließen → B1 Büro/Ordner/Inventur → L3 Kühlung → L4 Putzen → P1 Personal. Wo sinnvoll 2 zusammenhängende Module gemeinsam bearbeiten.
**Geparkt:** Menütafel, Aktionen, Kasse, Getränke-Feinheiten, zusätzliche Sprachen, DATEV. Die App kann bestehende Sprachen weiter unterstützen; nur keine neue Sprachenrunde ohne Anlass.
**Testphase:** PIN/Codes sollen zeitweise ausgeschaltet werden, aber **Zoro** verantwortet den kontrollierten Schalter. Kein eigenmächtiges Abschalten in Sanjis CSS oder UI.

## 5. Was aktuell WIRKLICH im GitHub-Branch steckt (keine falschen Fortschrittsbehauptungen)
Stand geprüft am 22.10. abends: [PR #5](https://github.com/barisakacak-eng/gastrcalc/pull/5) ist **offen**, Head-Commit `75760f22d6cab7de3dae36360f6a11a718d0c9de`, ungefähr **38 geänderte Dateien**. `main` und die öffentliche Live-App wurden **nicht** gemergt/veröffentlicht.
- **L1 Heute:** Premium-Monatszielkarte mit SVG-Kurslinie, natürlichem lokalem Food-Hero, neuer Typografie, vier echten Kennzahlen, danach Jetzt-dran-Karte; Bild je Ladentyp Döner bzw. Burger.
- **L2 Müll:** hochwertiges Foto-/Mengenraster, Tipp-Zähler, Mengenblatt. **Müll-Station** als Vollbild ohne Euro und ohne untere Navigation; inaktive `— kg`-Waage, gleicher Datenbestand/Schnellerfassung/Rückgängig wie normaler Müll. 390/360-Browserprüfung und Station-Test im PR.
- **L5 Karte:** Premium-Gerichtsfotos, echter Verkaufspreis, Restbetrag und Prozent-Marge + bestehende Engine-Ampel. Demo-Karten mit je vier Döner- und vier Smash-Burger-Gerichten wurden als echte Playwright-Bilder überprüft. Fehler „Dönerteller zeigt Brot-Döner“ im Mapping korrigiert und getestet.
- **B1 Büro/Ordner und Inventur:** B/C-Design (drei klare Ordnerstatus-Zeilen; Geld/Waren/Karte/Einrichtung gruppiert). Keine nicht vorhandene Beleg-Automation behaupten.
- **L6 Tag abschließen (wichtiger neuester Stand):** im Laufe des 22.10. **direkt im PR fertiggestellt**: drei Statuskarten und echter Monats-Zähler gestern/heute, der Unterschied wird korrekt positiv formuliert („Bis null fehlen 98 €“ statt irreführendem `−98 €`). Echte Browserabnahme 390/360 bestanden und als einzelner Screenshot `Sanji_2026-10-22_L6_Tagabschluss_Live.png` gezeigt. Rechenkern nicht geändert, kein sicherer Gewinn behauptet. Optionaler Browsertest `SANJI_ABSCHLUSS_BILDER=1`.
- **Lokale Pilotbilder:** über `js/bilder.js`, `js/data/fotos.js`, `foto/*.webp`, `bilder/*.svg`; Fehler in Bildzuordnungen Regressionstests unter `tests/pilotbilder.test.mjs`. Neue SVGs für Patty/Burgerbrötchen/Cheddar/Sauce/Pickles. Keine externe Bildversorgung.
- Browser-Foto-Regressionen nur bewusst auslösen: `SANJI_PILOT_BILDER=1`, Abschluss `SANJI_ABSCHLUSS_BILDER=1`.
- Laut letztem Protokoll **Fassung `2026-10-22.11`**, Service-Worker-Dateifingerabdruck `3f2cee1d3f3e`. **Vor neuer Änderung immer im Branch nachprüfen.**

## 6. Echte Prüfung und drei ROTE Tests – offen lassen, nicht abschalten
Letzter verifizierter GitHub-Actions-Lauf auf PR-Head: [39779434869](https://github.com/barisakacak-eng/gastrcalc/actions/runs/39779434869), 22.10.2026 12:34 UTC:
- Browser-/Regeljob **success**; Deployment **skipped**, weil Testjob rot.
- Node: **643 Tests insgesamt, 635 bestanden, 5 übersprungen, 3 fehlgeschlagen**:
  1. „Aktionen & Haltbarkeit“ – Fachtest (geparktes Thema, Zoro);
  2. „Zweitlieferant“ – Fachtest (Zoro);
  3. „Oberfläche: Büro-Kachel für alle ... Menütafel“ – Fachtest (geparktes Thema, Zoro).
Keinen dieser Fälle still löschen/umdefinieren, um künstlich grün zu werden. Ursache gegen aktuelle `main` prüfen. Ohne vollständig grüne Tests und ausdrückliches Kapitäns-Go **niemals auf `main` mergen**.

## 7. Noch NICHT implementierte, aber beschlossene Datenfelder (Freitag mit Zoro)
**NEU – Felder lt. Zoro 22.10.:**
```js
nutzen = {summe, posten:[{art:"muell"|"preis"|"lager"|"papier", euro, gemessen, quelle}], ab}
hinweis = {titel, satz, quelle, knopf:"Belege bereitlegen", status:"neu"|"erledigt"|"später"}
```
- **L1 „Das hat dir GastroCalc diesen Monat gebracht“**: Nur belegte/gemessene Posten zur Euro-Summe. Ungemessen grau mit `≈`, ohne Messung `Messung läuft seit <ab>`. Diese Karte **ersetzt** Inhalt, sie kommt nicht zusätzlich auf einen schon vollen Ladenschirm. Keine Doppelzählungen, Lagerkapital nicht als Gewinn ausweisen, Zeitersparnis nicht ohne belegte Grundlage zu Euro machen.
- **B1 geprüfte Steuer-Hinweiskarte:** maximal 25 Wörter je Hinweis, konkrete Quelle und datierter Gültigkeitsstand von Franky. Immer sichtbar: „Allgemeiner Hinweis, keine Steuerberatung – mit deinem Steuerberater klären.“ Chat-Anfang wenn Assistent genutzt wird: „Ich bin ein KI-Assistent.“ Nie „KI-Steuerberater“ oder ungeprüfte Sparbeträge behaupten. Frankys Steuerarbeit nicht doppelt erledigen.
- Nutzung, Steuer-Hinweise und PIN-Schalter sind **noch nicht** produktiv implementiert: in neuen Chats nicht fälschlich als fertig melden.

## 8. Gmail-/GitHub-Benachrichtigungen – laufender Auftrag, NICHT abgeschlossen
Baris hat am 22.10. gebeten, die vielen „Gitta“/GitHub-Mails der letzten Tage zu lesen, verständlich zu erklären und unwichtige zu löschen oder als gelesen zu markieren; Projektwarnungen behalten.
- Bereits per Gmail-Suche verifiziert: **55 GitHub-Benachrichtigungen seit 19.10.** (Suchquery `after:2026/10/18 (from:github.com OR from:notifications@github.com) -in:trash -in:spam`). Die meisten Betreffzeilen sind **„PR run failed: Pages“** – automatisch versendete GitHub-Actions-Fehlermeldungen zu unseren zahlreichen PR-/Testläufen. Einige ganz aktuelle Nachrichten sind **UNREAD**.
- **Wichtig:** Bisher nur Metadaten/Snippets recherchiert, **noch nicht alle 55 Volltexte gelesen und keine Mail verändert oder gelöscht.** Diesen Auftrag im neuen Chat als Erstes erledigen. Bei Sicherheitsmeldungen, Abrechnungen, Berechtigungs-/Zugriffsproblemen und echten Entscheidungen nichts löschen/übersehen; wiederholte, bereits verstandene Testnotifikationen kann man nach Prüfung als gelesen markieren, ggf. archivieren. **Löschen nur klar entbehrliche Duplikate und nur wenn die Zuordnung eindeutig ist**; dem Kapitän berichten, was genau erledigt wurde.
- Erklärung für Baris: „Pages / test failed“ = automatische Testprüfung eines neuen Branch-/PR-Commits fehlgeschlagen, **nicht automatisch eine kaputte Live-App**. Jede Code-Änderung hat neue Alerts erzeugt; 55 Mails bedeuten nicht 55 verschiedene echte Bugs.

## 9. Effizienz- und Wahrheitsregeln für den nächsten Chat
- Nicht alles von vorn recherchieren, vorhandene Projektentscheidung respektieren. **Keine unnötigen Dateien/Bilder erzeugen.**
- Erst neuesten `main`-Brückenstand, Sanji-Protokoll, Facelift-PR und GitHub-Actions prüfen. Alte Brückenfassung 16.10. enthält Regeln, die durch Baris' direktere GitHub-Freigabe überholt sind; bei Widersprüchen den späteren Kapitänsentscheid anwenden.
- Neue Codearbeit auf Branch, Test und *einen* echten Screenshot, wenn erwünscht; kein Demo-Foodfoto statt freigegebenem realem Asset. In Bedarfsfällen sichtbare Varianten und Entscheidung vor größeren Stilwechseln.
- Projektinformationen in `sanji/protokoll` und PR #5 festhalten; keine Namen, E-Mails, Gesprächspartner und internen Geschäftsgeheimnisse in öffentliches Repo schreiben. Keine Flut an Einzeldateien/ZIPs.
- Keine wiederkehrende Dauerarbeit behaupten; ohne ausdrücklich eingerichtete Automation gibt es keine selbständige Hintergrundarbeit nach einer Chatantwort.

## 10. Prompt für den neuen Chat – genau diesen Text kopieren
> **SANJI, PROJEKTÜBERNAHME GASTROCALC – 22.10.2026.** Du bist im neuen Chat im selben Projekt. Die verbindliche Übergabe liegt in `docs/Sanji_2026-10-22_GastroCalc_Uebergabe_Neuer_Chat.md` auf GitHub-Branch `sanji/protokoll` und ist diesem Chat gegebenenfalls angehängt. Lies sie zuerst vollständig, dann die neueste `bruecke/`-Datei, `docs/sanji-protokoll.md`, PR #5 und GitHub Actions. Nicht neu bei null anfangen! Freigegeben: B = Premium-Waste-Design, C = geordnetes Büro; Döner + Smash Burger gleichrangige Piloten; die bestätigten lokalen Premiumbilder sind verbindlich. Der jüngste fertige Bildbauschritt ist L6 Tag abschließen; er wurde browsergeprüft. `main` bleibt ohne mein Go unangetastet. Gib mir kurz den tatsächlichen GitHub-Stand und erledige dann zuerst den **offenen Gmail-Auftrag**: alle GitHub-Mails der letzten Tage vollständig durchgehen, wichtig/unwichtig trennen, mir die Bedeutung auf Deutsch erklären und reine wiederholte Prüflaufmeldungen nach Prüfung als gelesen markieren. Wichtige Warnungen behalten; keine unklare Nachricht löschen. Danach arbeite eigenständig und effizient am nächsten sinnvollen GastroCalc-Facelift-Block. Keine ungefragten Collagen, keine Dateienflut, maximal ein echter Screenshot pro Abnahme. Keine neue Steuerrecherche neben Franky, keine Rechenlogik-Arbeit neben Zoro. Alle Änderungen im bestehenden PR, Protokoll aktualisieren, am Freitag gemeinsame Übergabe.**
