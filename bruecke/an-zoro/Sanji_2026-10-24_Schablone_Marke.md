FÜR ZORO:

ÜBERGABE AN ZORO
Aufgabe: Lieferung 1 – Schablone und Marken-Blatt.
Ergebnis: `design/schablone.html`, `design/schablone-abnahme.png`, `assets/brand/heute-icons.svg`, unveränderte Bildreferenz unter `design/referenz/zeki-brand-2026.jpeg`. Drei Muster mit jeweils 390 × 844 px: Laden, Büro, Blatt. Marken-Blatt mit Originalfigur, Originalwortmarke, Original-App-Icon, aktueller Token-Palette, Schrift, Abständen und zehn Beispielsätzen. Fünf geforderte Icons plus Heute für die untere Leiste.
Empfehlung: Diese eine Schablone verwenden. Die bewährte Bildkarte mit Döner und Kurve bleibt der Anker; Beschriftungen unter jedem Icon machen den Weg verständlich.
Offene Fragen: Einmaliges Ja von Baris zu Schablone und Marke. Erst danach Lieferung 3. Keine weitere Variante, kein Umbau der App durch diesen PR.
Hinweise für den Code: Farben, Ecken und Schrift kommen direkt aus `css/tokens.css`, keine Facelift-Farbduplikate. Laden: 15 Wörter inklusive unterer Leiste in DE/TR/EN, ohne Wortmarke und Zahlen. Hauptknopf 64 px, andere Knöpfe mindestens 56 px. Der Standard-Token enthält Inter lokal mit Systemschrift als Rückfall. Icons 24 × 24, Strich 1.8, currentColor, runde Enden. Ein Hauptknopf; vier klar beschriftete Kurzwahlkacheln. Alle Vorschauzahlen und Kurven sind Beispiele. Die Vorlage speichert nichts und nutzt keinen Rechenkern. Zeki und Wortmarke im Marken-Blatt sind Ausschnitte der unveränderten Referenz; die bewegliche SVG-Fassung ist Lieferung 2. Textexporte `sanjiDesign` sind ausschließlich Vorschau-Texte in de/tr/en, die bestehenden App-Sprachtabellen bleiben unverändert. Die direkte Nutzung der Vorlage benötigt einen lokalen Webserver (ES-Module); `design/` wird bewusst nicht veröffentlicht. Bildvorschau in der PR.

Prüfstand 24.10.2026:
- `python3 tools/sw_liste.py`: erfolgreich; Icon-Satz offline gelistet.
- `TZ=UTC node --test tests/*.mjs`: 690 bestanden, 5 bestehende ausgelassen, 0 fehlgeschlagen.
- `TZ=Europe/Berlin node --test tests/*.mjs`: ebenso.
- `node tools/sprachpruefung.mjs`: alle 17 weiteren Sprachen grün.
- `python3 tests/regeln.py`: 0 neue und 0 bestehende Verletzungen.
- `python3 tests/durchlauf_personal.py`: grün.
- Browser-Sichtprüfung der Schablone in DE/TR/EN: kein Überlauf im Laden, Knopfhöhen 56/64/88 px, keine JavaScript-Fehler.

Branch: `sanji/schablone-marke-2026-10-27`, Basis `main` bei eafbc30. Kein Merge und keine Veröffentlichung. Die numerischen Termine/Branch-Namen des Auftrags werden beibehalten; 27.10.2026 ist Dienstag, 31.10.2026 Samstag.
