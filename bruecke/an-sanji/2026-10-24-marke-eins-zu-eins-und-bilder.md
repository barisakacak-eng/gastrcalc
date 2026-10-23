# FÜR SANJI: Marke eins zu eins, Bildergalerie voll (Zoro, 24.10.2026, 01:45)

Baris, 24.10. 01:38, wörtlich sinngemäß: „Ich möchte nur eins zu eins dargestellte Versionen. Das, was gebaut wurde, ist nicht unser Icon und nicht unser KI-Bot. Keine visuellen Beispiele mehr, die am Ende nicht so übertragen werden.“ Die Referenz ist dein Bild „Offizielles Brand-Design GastroCash | Stand: 2026“ (App-Icon dunkelgrünes Quadrat mit Bot; Bot: heller Helm, dunkles Visier mit Zwinkern, grüne Schürze mit orangener Münze, helle Arme; Wortmarke „Gastro“ leicht, „Cash“ fett). Es liegt in der Marken-Dokumentation und in deinem Chat.

Auftrag 1 – Marke, Reihenfolge fest, Work-Modus, Branch `sanji/marke-1zu1-2026-10-24` gegen `main`:
1. `assets/brand/mascot-classic.svg`: der Bot exakt wie im Bild (Proportionen, Farben #F5EDE2 Helm, #22301F Visier, #4C6B55 Schürze, #E8763A Münze, Konturen). Kein eigener Stil, kein Vereinfachen. Daraus die fünf Gesichter als SVG-Varianten derselben Figur: neutral (Visier ohne Zwinkern, gerader Mund), freundlich (Lächeln), nachdenklich (Augen oben), ernst (Mund gerade, Augen halb), erfolg (Lächeln + Zwinkern = dein Referenzbild). Regel Baris: kein Grinsen an schlechten Tagen, kein Dauerzwinkern.
2. `js/gastrocash-brand.js`: `mascotMarkup(zustand, bewegung)` liefert ab jetzt genau diese SVGs; alte Zeichnung raus.
3. `assets/brand/gastrocash-logo.svg`: Wortmarke wie im Bild (Schriftschnitt aus den vorhandenen Fonts, „Cash“ fett).
4. App-Icons aus dem Bild: `icons/icon-180.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (maskable mit 10 % Rand), `icons/logo.svg`, `icons/logo-zeichen.svg`. Dunkelgrünes abgerundetes Quadrat wie links im Bild.
5. Abnahmebild in der PR-Beschreibung: links dein Referenzbild, rechts Screenshot aus der App (Kopfzeile Heute, Startbildschirm, Homescreen-Icon). Wenn ein Betrachter einen Unterschied sieht, ist es nicht fertig.
Prüfung: `python3 tools/sw_liste.py`, `TZ=UTC node --test tests/*.mjs`, `TZ=Europe/Berlin node --test tests/*.mjs`, `python3 tests/regeln.py`, `python3 tests/work_integration_browser.py`. Kein Entwurfs-PR, nie selbst mergen.

Auftrag 2 – Bildergalerie voll (nach Auftrag 1): Für jedes Gericht und jede Ware im Katalog (`js/data/katalog.js`, `js/data/fotos.js`) der Pilotläden Döner und Smashburger muss ein Foto da sein, bevor der Pilot startet. Liste zuerst, was fehlt (Datei `bruecke/an-zoro/2026-10-24_fotos_fehlend.md`), dann liefern wie bisher in `foto/*.webp` mit Eintrag in `js/data/fotos.js`. Keine KI-Logos auf Getränken, Regeln vom 19.10. gelten.

Auftrag 3 läuft schon: Rechtsform-Bildschirme (Chat „Rechtsform-Bildschirme ergänzen“). Erst fertig machen, dann Auftrag 1.

Meldung je Auftrag in 3 Zeilen mit PR-Link.
