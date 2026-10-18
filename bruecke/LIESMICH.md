# Brücke Zoro ⇄ Sanji ⇄ Franky

KI-Trio seit 19.10.2026: Zoro (Claude) führt und baut, Sanji (ChatGPT) gestaltet, Franky (Gemini) recherchiert und prüft gegen. Übergaben als Block „FÜR ZORO:“ / „FÜR SANJI:“ / „FÜR FRANKY:“ mit 1. was fertig ist, 2. echtem Link oder Datei, 3. konkreter Aufgabe.

Dieser Ordner ist der Briefkasten zwischen Zoro (Claude, baut die App) und Sanji (ChatGPT, Recherche und Visuals).
Kapitän Baris soll zwischen uns nicht vermitteln müssen. Jeder liest hier, bevor er anfängt, und schreibt hier, wenn er fertig ist.

## Wer schreibt wohin
- `an-sanji/` – Aufträge von Zoro an Sanji. Eine Datei pro Auftrag: `JJJJ-MM-TT_kurzname.md`.
- `an-zoro/` – Ergebnisse und Rückfragen von Sanji an Zoro. Gleicher Dateiname wie der Auftrag, Endung `_ergebnis.md`.
- `stand.md` – aktueller Stand der App in einfacher Sprache. Pflegt Zoro nach jedem Bauschritt.

## Ablauf
1. Zoro legt einen Auftrag in `an-sanji/` ab (Status oben in der Datei: `offen`).
2. Sanji liest `stand.md` und den Auftrag, arbeitet, legt das Ergebnis in `an-zoro/` ab und setzt im Auftrag `Status: erledigt`.
3. Zoro prüft gegen, übernimmt und vermerkt im Ergebnis `Übernommen am …` oder schreibt eine Rückfrage als neuen Auftrag.
4. Kann Sanji nicht direkt ins Repo schreiben, gibt er Baris eine Datei mit genau dem Dateinamen aus Schritt 2. Baris legt sie nur ab, mehr nicht.

## Was hier NIE hinein darf (das Repo ist öffentlich)
- Pitch-Inhalte, Partner- und Gesprächspartnernamen, Markenfragen, Zahlen aus Gesprächen.
- Betriebslisten mit Kontaktdaten, Inhabernamen, E-Mail-Adressen, Telefonnummern.
- Alles, was Baris als vertraulich bezeichnet.
Solche Daten gehen in das private Repo `barisakacak-eng/gastrcalc-daten` (Ordner `kundendaten/`). Gibt es das noch nicht, als ZIP an Baris.

## Daten gegliedert liefern (seit 14.10.)
- Jede Datenzeile trägt `laden_art`: `doener`, `burger`, `pizza`, `asia`, `foodtruck`, `baeckerei`, `cafe` oder `alle`. Ein Dönerladen bekommt später nur Döner-Relevantes. (`burger` heißt in der App `imbiss`; Zoro übersetzt das beim Einlesen.)
- Jede Zahl trägt eine `stufe` (beleg, branche, pilot, schaetzung) und eine Quelle.
- Zoro trägt jede geprüfte Lieferung ins Datenregister ein. Was dort nicht steht, kommt nicht in die App.

## Regeln für beide
Einfache Sprache. Nichts erfinden, jede Zahl mit Quelle. Keine Änderung an App-Code oder Rechenregeln durch Sanji – nur Vorschläge in `an-zoro/`.
