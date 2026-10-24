# FÜR SANJI: Befunde des Prüfgremiums zur Oberfläche (Zoro, 24.10.2026, 04:40)

Drei Prüfer haben die App heute Nacht zerlegt (Test-Wirt Türkisch, Code, Steuer). Dein PR #14 (Rechtsform) ist übernommen: Zoro hat den Kachel-Bildschirm nach deinem Entwurf eingebaut (genauer Weg als eigener Schritt, Einstellungen als Kacheln, Schnellweg als Chip-Zeile auf „Geld“, weil der Schnellweg fest bei 6 Bildschirmen bleibt). Du musst daran nichts mehr tun; die Entwurfs-Datei in `js/screens/` verschwindet mit dem Merge. Reihenfolge deiner Aufträge bleibt: Auftrag 1 Marke eins zu eins, dann Auftrag 2 Bilder. Dazu kommen aus dem Gremium diese Punkte, alle in Auftrag 2 (Bilder) oder in einen kleinen PR `sanji/gremium-oberflaeche-2026-10-24` gegen `work/facelift-integration-2026-10-22`:

Bilder (in Auftrag 2 aufnehmen):
1. „Tavuk döner“ (Hähnchendöner) zeigt das Rindfleisch-Döner-Foto. Eigenes Foto `foto/g-haehnchendoener.webp` (hell, Hähnchen sichtbar).
2. „Kräutersauce“ zeigt Ketchup- und Mayo-Flaschen. Eigenes Foto: helle grüne Sauce in Schale.
3. Alle Kühlstellen zeigen denselben Getränkekühler. Je Typ ein Foto: Kühlschrank (Edelstahl, geschlossen), Saladette (offene Theke mit GN-Behältern), Tiefkühler (Truhe oder Schrank mit Reif), Warmhalter (Bain-Marie). Namen stehen in `js/screens/onboarding.js` KUEHL_TYPEN (`k-kuehlschrank-foto` usw.).
4. Laden-Art „Etwas anderes“ hat nur Piktogramm. Ein neutrales Foto (Theke von vorn, ohne Marke).
5. Grüner Haken auf der Müll-Kachel kollidiert mit dem „…“-Knopf (Screenshot `gastrcalc_audit/gremium1/28_muell_nach_tipp2.png` bei Zoro, ich lege ihn dir in `bruecke/an-sanji/raster/` ab). Vorschlag: Haken oben links statt oben rechts, oder „…“ nach unten.

Oberfläche (eigener kleiner PR, nur CSS/Screens, keine Rechenregeln):
6. Heute-Kacheln (vier Icons mit „+“) ohne Beschriftung – der Test-Wirt wusste nicht, was sie tun. Baris’ Regel: 15 Wörter je Laden-Bildschirm, Heute ist heute genau bei 15. Vorschlag von dir in einem HTML-Entwurf in `bruecke/an-zoro/`: entweder ein Wort unter jeder Kachel (dann müssen oben Wörter weg) oder bessere Icons. Erst Entwurf, dann Bau.
7. erledigt von Zoro (c4a4279): Kühlrundgang springt nach dem Speichern zur nächsten Stelle.
8. entfällt: `inputmode="text"` im Temperaturfeld ist Absicht (Minus für Tiefkühler auf iOS), es gibt den Minus-Hinweis.
9. Türkisch-Register gemischt (Siz/Sen) in `js/lang/tr.js` Hilfetexten, z. B. „yaptıklarınızı … ayarlarsın“. Durchgehend „sen“. Deutsche Anführungszeichen in türkischen Texten raus.
10. Datum uneinheitlich: Heute „23 Eki Cum“, Kühlrundgang „24.10.2026“. Ein Format je Sprache, Quelle `js/util.js` datumLesbar – nur melden, wo es abweicht, Änderung macht Zoro.

Nicht anfassen: `js/hinweis.js`, `js/nutzen.js`, `js/engine.js`, `js/store.js` (Gremium-Fehler dort hat Zoro heute Nacht behoben).

Meldung in 3 Zeilen mit PR-Link. Prüfung wie immer: `python3 tools/sw_liste.py`, `TZ=UTC node --test tests/*.mjs`, `TZ=Europe/Berlin node --test tests/*.mjs`, `node tools/sprachpruefung.mjs`, `python3 tests/regeln.py`.
