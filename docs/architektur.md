# GastroCash – Architektur (Pilotfest E6, 30.10.2026)

Wer hier etwas ändert, liest zuerst diese Seite. Der Schutz-Test `tests/architektur.test.mjs` prüft, dass jede Datei unter `js/` und `js/screens/` hier mit einem Satz steht und dass die Regeln unten im Code eingehalten werden. Ein neues Modul ohne Eintrag macht den Test rot.

## 1. Die Idee in fünf Sätzen

GastroCash ist eine Handy-Web-App ohne Server: HTML, CSS und JavaScript ohne Bauschritt, offline über einen Service Worker, alle Daten in IndexedDB auf dem Gerät. Innen rechnet ein **Rechenwerk** (`js/*.js`, reine Funktionen), außen zeigen **Bildschirme** (`js/screens/*.js`) nur an. Die **Bedienschicht** (`js/app.js`) hält den Zustand, zeichnet den aktuellen Bildschirm komplett neu (`zeichne()` setzt `root.innerHTML`) und verteilt jeden Tipp über einen einzigen delegierten Klick-Handler (`aufKlick`) nach `data-a`. Texte kommen nur aus `js/i18n.js` + `js/lang/*.js` (Deutsch ist Leitsprache, 18 Sprachen, Beta-Sprachen fallen auf Englisch zurück). Drei Ebenen trennen, wer was sieht: **Laden** (Chef in der Schicht, ≤ 15 Wörter je Bildschirm), **Personal** (ohne Euro, nur mit Büro-Code erreichbar), **Büro** (alles für Amt, Steuerberater, Buchhalter, Einrichtung; ≤ 120 Wörter).

## 2. Regeln, die der Code einhalten muss

1. **Rechenwerk schreibt, Bildschirm zeigt.** Keine Datei in `js/screens/` ändert Laden-Daten (`stand`, `wurzel`, Gerichte, Artikel, Journale) – sie ruft Setzer aus `js/stamm.js`, `js/karte_daten.js`, `js/muell.js` usw. Geprüft in `tests/trennung.test.mjs` (statische Suche + „zeichnen ändert nichts“), Ausnahmen für flüchtigen Bildschirmzustand stehen dort in `AUSNAHMEN`.
2. **Ein Dokument, ein Speicherweg.** `js/store.js` hält die Wurzel (alle Läden eines Handys) in IndexedDB; `speichern` ist gepuffert, `sofortSpeichern` wartet. Fotos und Dateien gehen nur über `js/ablage.js`. Schema-Änderungen bekommen eine Migration in `store.js` (`SCHEMA`) und einen Rundreise-Test (`tests/sicherung_rundreise.test.mjs`).
3. **Texte nur über `t()`.** Kein deutscher Satz in `js/screens/`; `tools/sprachpruefung.mjs` und `tests/i18n.test.mjs` prüfen Schlüssel und Platzhalter in allen Sprachen.
4. **Geschäftstag bis 4 Uhr, Zeitzone Europe/Berlin.** Datum und Tag kommen aus `js/util.js` (`heuteGeschaeft`). Alle Node-Tests laufen in `TZ=UTC` und `TZ=Europe/Berlin` (Wächter).
5. **Zahlen mit Quelle oder „Setzung“.** Richtwerte stehen in `js/data/branchenwerte.js` mit Quelle und Datum; Goldwerte (`tests/goldwert.test.mjs`) frieren bekannte Ergebnisse ein.
6. **Relativ bleiben.** Keine absoluten Pfade, kein Host im Code; `manifest.webmanifest` und `sw.js` sind relativ, der Umzug auf eine eigene Domain ist eine Pages-Einstellung (`tests/umzug_bereit.test.mjs`).
7. **Eine Fassung, ganz oder gar nicht.** `tools/sw_liste.py` schreibt `sw.js` (Dateiliste + Fingerabdruck) und `js/fassung.js`; vor jedem Push ausführen, `tests/fassung.test.mjs` prüft den Fingerabdruck.
8. **Neue sichtbare Oberfläche nur nach Bildpaket und Ja.** Entwürfe laufen hinter einem Schalter (`window.__gc6b`-Muster) bis zur Freigabe; Klassen A/B/C stehen im Projektstand.

## 3. Ablauf eines Tipps

`index.html` → `js/app.js` lädt Wurzel (`store.js`), Sprache (`i18n.js`), registriert `sw.js`, startet den Fehler-Rucksack (`fehler.js`) → `zeichne()` wählt nach `stand.phase` (Einrichtung `screens/onboarding.js` oder App) und `ansicht` den Bildschirm → Bildschirm liefert HTML aus Daten → Tipp landet in `aufKlick` → `data-a` entscheidet: Rechenwerk-Setzer aufrufen, `speichern(wurzel)`, `zeichne()`. Blätter über dem Bildschirm (Menü, Hilfe, Code) leben in `#ebene-huelle` (`screens/ebene.js`). Doppeltipp-Schutz: nur ein zweiter Tipp **an derselben Stelle** innerhalb von 180 ms wird verworfen (`DOPPELTIPP_MS`, Pilotfest U1).

## 4. Module – Rechenwerk (`js/`)

- `ablage.js` – ein Weg für jedes Foto und jede Datei (IndexedDB-Ablage).
- `aktion_plan.js` – Aktion planen: Zeitraum-Vorschlag, Fortschritt, Bilanz.
- `anzeige_text.js` – Texte aus Daten (Datum, Monat, Mengen, Bruchzahlen).
- `app.js` – Einstieg und Bedienschicht: Zustand, Zeichnen, Klick-Verteiler, Service Worker, Rundgang-Start.
- `auswertung.js` – ein Weg vom Foto/PDF zum Text (OCR-Auftrag an den Worker, Zwischenstand „erste Gerichte“ seit P4).
- `beispiel.js` – Beispiel-Laden zum Ausprobieren.
- `beleg.js` – Belegzerleger (Lieferschein/Rechnung → Zeilen).
- `bestand.js` – laufender Bestand und Bestellvorschlag.
- `betriebsmittel.js` – Verbrauchsmaterial, das nicht verkauft wird.
- `bilder.js` – Regeln, welches Foto/Piktogramm zu Gericht oder Ware gehört.
- `deal.js` – Kombi-Deal-Rechner.
- `eigentuemer.js` – Blick über alle Läden eines Handys.
- `einrichtung.js` – Einrichtung in Prozent und „als Nächstes“.
- `engine.js` – Kalkulation: Artikel aus Gerichten, Deckungsbeitrag, Monatsziel, Kühl-Rundgang-Zustand.
- `export_amt.js` – Ordner Gesundheitsamt (Daten, CSV, Druck).
- `export_steuer.js` – Ordner Steuerberater/Buchhalter (Monatspaket, CSV; Tagesumsätze nur als „Notiz – kein Z-Bon“).
- `extras.js` – Extras, Größen, Menü-Bündel.
- `fassung.js` – Fassungsnummer, von `tools/sw_liste.py` geschrieben.
- `fehler.js` – Fehler-Rucksack: letzte 50 Fehler lokal, ohne Namen und Zahlen; Text zum Teilen.
- `feiertage.js` – gesetzliche Feiertage für Liefertermine und Umsatzvergleich.
- `gastrocash-brand.js` – Zeki-Darstellung und Bewegung (Bildfolgen).
- `gerichte_vergleich.js` – Deckungsbeitrag und Marge je Gericht.
- `getraenk.js`, `getraenk_feld.js` – Getränke als Stammdaten und ihre Felder.
- `haltbar.js` – Haltbarkeit und Abverkauf.
- `hebel.js` – Euro-Hebel je Gericht, Renner/Penner.
- `hinweis.js` – Hinweis-Karten im Büro (Vertrag `docs/vertraege.md` Abschnitt 2).
- `i18n.js` – Sprachtabelle, `t()`, Datumsformat, Sprachen laden.
- `intro.js` – Zeki-Auftritt beim Start (nur Anzeige).
- `inventur.js` – Inventur zählen und bewerten.
- `karte_daten.js` – Setzer für Speisekarte, Rezepte, Verkaufs- und Einkaufspreise (Herkunft „hand“).
- `karte_lesen.js` – aus erkanntem Text Gerichte mit Preis, Vorlagen zuordnen.
- `kostenbeleg.js` – Kostenbelege, die keine Ware sind.
- `kuehlname.js` – Kühlstellen-Namen.
- `laden_zahlen.js` – Zahlen für „Heute“ und „Tag abschließen“.
- `lieferant.js`, `lieferung.js` – Lieferanten als Stammdaten; Belege werden Lieferungen (Herkunft „beleg“).
- `mindestlohn.js` – Mindestlohn-Vorschau (14,60 € ab 1.1.2027, Minijob 633 €).
- `modus.js` – drei Ebenen Laden/Personal/Büro, Büro-Code, Zeitfenster.
- `muell.js` – Müll in zwei Tipps, Personalessen.
- `nutzen.js` – Euro-Zähler „Weniger Verlust seit Start“.
- `ocr-worker.js` – Texterkennung (tesseract WASM) im eigenen Faden; meldet im Modus „karte“ nach der ersten Lesart einen Zwischenstand.
- `ocr_layout.js` – aus Wort-Positionen wieder Zeilen.
- `offen.js` – was im Laden melden darf, was im Büro wartet.
- `ordner_text.js` – die drei Ordner als Daten, Druckmodelle, CSV.
- `personal.js` – Zahlen für den Personal-Start (ohne Euro).
- `preisdrift.js` – Preisdrift einer Zutat in Euro je Monat (nur Herkunft „beleg“ zählt als Drift).
- `preisrunde.js` – Preisrunden-Rechner.
- `profil.js` – Laden-Profil (welche Bereiche zuerst).
- `putzplan.js` – Putzplan als Stammdaten, Abhaken als Protokoll.
- `rechtsform.js` – Rechtsform des Betriebs für Steuer-Hinweise.
- `reinigung.js` – Reinigung & Betriebsmittel im Kostenzähler.
- `rettung.js` – Rettungscode und „Sicherung ersetzt alles“.
- `rezept_baukasten.js` – jedes Gericht bekommt sofort ein Rezept mit Mengen (144 Vorlagen).
- `rezept_quelle.js` – woher jede Menge kommt; Mengenfrage im Laden; Branchenwerte anwenden.
- `richtpreise.js` – Richtpreise als Testdaten.
- `schloss_bio.js` – Face ID/Fingerabdruck fürs Büro.
- `schluessel.js` – Passwort für die Sicherungsdatei.
- `selbst.js` – eigene Herstellung in die Artikel übertragen.
- `sicherung_stufe.js` – Sicherungsstufe und Fälligkeit.
- `stamm.js` – Setzer für Stammdaten (Betrieb, Team, Kosten, Kühlstellen, Zählungen, Spieß, Portion, Preisrunde).
- `store.js` – IndexedDB, Wurzel, Schema und Migrationen, Sicherung export/import, Ereignisse.
- `symbole.js` – Linien-Symbole (Lucide, ISC).
- `tafel.js` – Menütafel aus Karte und Aktionen.
- `takt.js` – Zwischenspeicher für ein Bild beim Zeichnen.
- `umsatz_pruefung.js` – Rückfrage bei unplausiblem Tagesumsatz.
- `util.js` – kleine Helfer: `esc`, `parseZahl`, Geschäftstag.
- `verkauf.js` – Verkauf je Gericht (Kassen-Export, Hand, Z-Bon).
- `ware.js` – Welle 2 „Ware und Schwund“: Spieß, Wochenzählung, Zukauf, Portion.
- `zaehler.js` – Break-even-Zähler („bis null plus Zielgewinn“).
- `zbon.js` – Z-Bon per Foto.
- `zeki-bilder.js`, `zeki-puppe.js`, `zeki-svg.js` – Zekis Bilder, Gliederpuppe, Vektorfigur.
- `zeki.js` – Zekis Kopf: welche Lage ist wichtig, welcher Satz passt.
- `zip.js` – kleines ZIP ohne Fremdbibliothek.
- `data/` – Branchenwerte, Vorlagen, Datenschutztext (Daten, keine Logik).
- `lang/` – Sprachtabellen (`de.js` Leitsprache).

## 5. Module – Bildschirme (`js/screens/`)

- `abschluss.js` – Tag abschließen (Laden).
- `aktionen.js` – Büro „Aktionen & Haltbarkeit“.
- `bausteine.js` – gemeinsame Anzeige-Bausteine (Klappen, Zahlfelder, Teilen).
- `beleg.js` – Beleg einlesen (Büro).
- `bestand.js` – Büro „Lager & Bestellen“.
- `buero.js` – Büro-Startseite.
- `ebene.js` – Blätter über dem Bildschirm: Menü, Sprache, Läden, Hilfe, Code, Passwort.
- `foto.js` – Speisekarte fotografieren, Prüfliste (zeigt erste Gerichte vor dem Ende der Erkennung).
- `getraenke.js` – Büro „Getränke“.
- `hinweise.js` – Büro Hinweis-Karten.
- `home.js` – Startseite „Heute“, Einstellungen, Karte (Büro-Sicht).
- `inventur.js` – Inventur (Büro).
- `karte.js` – Einrichtung: Karte wählen, Rezepte prüfen, Preise, Ergebnis; Rezept-Editor (alle Zutaten).
- `karte_laden.js` – Laden „Karte“ mit Mengenfrage und Preis-Blatt.
- `kuehl.js` – Kühlung messen (Laden/Personal).
- `kuehl_ware.js` – Büro „Ware nach Kühl-Abweichung“.
- `laeden.js` – Läden wechseln, anlegen, Eigentümer-Übersicht.
- `lieferanten.js` – Büro „Lieferanten“.
- `muell.js` – Müll mit einem Tipp (Laden/Personal).
- `nav.js` – Kopfleiste und Leiste unten.
- `onboarding.js` – Einrichtung: eine Frage je Bildschirm, Schnellweg und langer Weg.
- `ordner.js` – die drei Ordner zum Abgeben.
- `personal.js` – Personal-Modus.
- `portion.js` – Laden „Portion prüfen“.
- `preisrunde.js` – Preisrunden-Rechner (Büro).
- `putzplan.js` – Putzplan abhaken (Laden) und bearbeiten (Büro).
- `reinigung_zeile.js` – Zeile „Reinigung & Betriebsmittel“ im Kostenzähler.
- `rundgang.js` – Mitmach-Rundgang mit Zeki (12 Stationen).
- `rundgang_kurz.js` – kurzer Rundgang (6b R1, ≤ 5 Stationen).
- `tafel.js` – Büro „Menütafel“.
- `tag.js` – Listen (Schwund, Müll, Personalessen).
- `umsatz.js` – Büro „Umsatz“ und Zähler-Seite.
- `umsatz_laden.js` – Laden „Umsatz heute“.
- `vergleich.js` – Büro „Gerichte im Vergleich“.
- `verkauf.js` – Büro „Verkauf je Gericht“.
- `ware.js` – Büro „Ware & Schwund“.
- `zeki_erst.js` – Zeki beim ersten Tipp (6b R2).
- `zeki_takt.js` – Zeki lebt: Blinzeln, Gesten, Sprechblase.

## 6. Tests und Wächter

- Node: `TZ=UTC node --test tests/*.mjs` und `TZ=Europe/Berlin …` (Rechenwerk, Goldwerte, Trennung, Sprachen, Fassung, Umzug, Architektur).
- Browser (Playwright, Chromium, 390×844 und 360×780): `tests/regeln.py` (Wörter, verbotene Wörter, Knopfhöhen je Bildschirm), `tests/bedienung_browser.py` (Bedienschicht U1–U5), `tests/erststart_alle.py` (Einrichtung jeder Ladenart mit Zeiten), `tests/klickjagd.py` (Crawler: tote Tipps, Hänger, Konsolenfehler), `tests/durchlauf_*.py` (Abläufe je Bereich), `tests/umzug_browser.py`, `tests/sicherung_rundreise.test.mjs`.
- Wächter: `.github/workflows/pages.yml` – Pages veröffentlicht nur, wenn Node-Tests (beide Zeitzonen), Sprachprüfung, Regeln, Funktionstests und kurzer Crawler grün sind. Keine Secrets.
- Vor jedem Push: `python3 tools/sw_liste.py`, Tests, `node tools/sprachpruefung.mjs`, `python3 tests/regeln.py` (dann `git checkout tests/regeln_stand.json`).
