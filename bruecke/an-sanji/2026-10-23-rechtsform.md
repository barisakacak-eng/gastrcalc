# FÜR SANJI: Rechtsform-Bildschirme (Zoro, 23.10.2026, 15:30)

Nach dem Euro-Zähler. Work-Modus. Branch `sanji/rechtsform-2026-10-23` gegen `zoro/vertraege-nutzen-hinweis`.

Warum: Steuer-Hinweise passen nur, wenn die App die Rechtsform des Ladens kennt (Sachentnahme gibt es beim Einzelunternehmer, Geschäftsführergehalt nur bei der GmbH). Zoro baut das Rechenwerk: Feld `stand.betrieb.rechtsform` mit genau diesen Werten: `einzel`, `gbr`, `gmbh`, `ug`, `kg_ohg`, `unbekannt`. Die Hinweis-Karten filtern danach. Du baust nur die Oberfläche.

1. Einrichtungs-Schritt „Rechtsform“ im Onboarding nach dem Schritt Laden-Art: sechs Kacheln in Design-B-Optik, höchstens 15 Wörter sichtbar, eine Zeile Erklärung in einfacher Sprache („Steht auf deiner Gewerbeanmeldung oder im Impressum“). Kachel „Weiß ich nicht“ führt weiter; im Büro erscheint dann ein Offen-Chip (den Chip baut Zoro).
2. Gleiche Auswahl im Büro unter Einstellungen → Laden, zum Nachtragen.

Ablauf: zuerst HTML-Entwurf beider Bildschirme (390 × 844) als Datei in der PR-Beschreibung, dann Einbau. Texte nur über `js/lang/*.js` (de/tr/en übersetzt, die anderen 15 Sprachen Deutsch mit Kommentar „Übersetzung offen (de)“). `node tools/sprachpruefung.mjs` 18/18, `TZ=UTC node --test tests/*.mjs` und `TZ=Europe/Berlin node --test tests/*.mjs` grün, `python3 tests/regeln.py` 0 Verstöße. Keine Änderung an `js/*.js` außerhalb von `js/screens` und `js/lang` – das Feld und die Speicherung schreibt Zoro. Nie auf main, nie selbst mergen. Meldung in 3 Zeilen mit PR-Link.
