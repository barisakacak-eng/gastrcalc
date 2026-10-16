# Stand der App (gepflegt von Zoro) – 16.10.2026, 16:30

Live: https://barisakacak-eng.github.io/gastrcalc/ · Fassung 2026-10-16.1 · alles bleibt auf dem Handy, keine Cloud, kein Server.

## Rollen seit 16.10.2026
- Baris: Gründer und Eigentümer, entscheidet Vision, Richtung, Optik-Freigaben, Partner.
- Zoro (Claude): einziger operativer Lead – Architektur, Logik, Daten, Tests, GitHub, Veröffentlichung. Integriert freigegebene Gestaltung 1:1.
- Sanji (ChatGPT): Kreativstudio – Designrichtungen, Vorlagen, Farben, Bilder, Grafiken, Bildschirmkonzepte. Keine Änderung an Architektur oder produktivem Code, kein Push nach main. Lieferung als Übergabepaket (siehe LIESMICH.md und visual-vertrag.md); Zoro integriert.

## Nische
Inhabergeführte Döner-, Imbiss-, Asia-, Pizza-Imbiss-Läden, Foodtrucks, türkische und Balkan-Bäckereien, 1–15 Mitarbeiter, Chef arbeitet mit. Keine Ketten. Start nur in Deutschland.

## Gebaut und live (Stand 16.10.2026)
- Drei Ebenen: LADEN (Leiste unten Heute · Müll · Kühlung · Putzen · Karte, Menü-Blatt ☰ mit Tag abschließen · Personal-Modus · Büro · Sprache), PERSONAL (drei Kacheln, kein Euro, nur mit Büro-Code), BÜRO (Offen-Hinweise, Ordner Gesundheitsamt / Steuerberater / Buchhalter, Zahlen, Karte & Einkauf, Laden einrichten).
- Optik „Kräuter & Kupfer“ (Sanjis Vorlage) mit Tokens in css/tokens.css, Inter lokal, Lucide-Symbole, 124 Fotos WebP 520×390.
- Schnellstart in 6 Schritten (Sprache, Laden-Art, Karte fotografieren oder später, Kühlstellen, Kosten mit „Wer putzt?“, Fertig).
- 18 Sprachen (de, tr, en fest; ar, fa, ku, pl, ro, bg, ru, uk, sq, bs, el, it, es, fr, vi nachladbar; ar/fa von rechts nach links).
- Büro-Code mit PBKDF2, Sicherung als ZIP mit Fotos, Abgleich je Bereich, Service Worker mit Fassungs-Wächter im Test-Gate (seit 16.10.).
- 320 automatische Tests, fünf Browser-Durchläufe.

## Befunde aus dem Gesamt-Audit 16.10. (für Sanjis Arbeit relevant)
- Der Reiter Putzen zeigt ohne Plan die ganze Einrichtung im Laden (415 Wörter, 5.400 px). Kühlung mit Stellen 79 Wörter. Soll: höchstens 15 Wörter je Laden-Bildschirm, eine Haupthandlung unten (mindestens 64 px hoch), Erklärung nur hinter „?“.
- Knopfhöhen heute 48–61 px (Soll 64), kleinster Text im Laden 11,5 px.
- Hauptknopf ist durch css/zielbild.css:162 auf #CD8043 gesetzt, Token --glut ist #C97A3E. Zoro räumt die vier CSS-Schichten (app → optik → zielbild → laden/heute/buero) auf; danach gilt nur noch tokens.css + eine Optikdatei.
- Foto-Schirm und eine Büro-Karte nutzen noch Emoji 📷/📄 statt Lucide.
- Türkisch: Katalognamen (Pizzateig, Knoblauchsauce …) und Putzplan-Begründungen sind nur deutsch.

## Offene Aufträge an Sanji (siehe an-sanji/)
1. Entwurf „Laden schlanker“ im Zielbild für Putzen (heute), Kühlung (Rundgang-Start mit Stellen), Müll-Raster – je Bildschirm höchstens 15 Wörter, Hauptknopf unten. Erst Entwurf als Bild, Baris gibt frei, dann Übergabepaket nach Masterprompt-Regeln (HEX/Tokens, Komponenten, Zustände, HTML/CSS-Vorlage, Abnahmekriterien, Status).
2. Erklärbild Zähler und Erklärbild Müll (unverändert offen).
3. Sprüche (Lieferung liegt vor, Einbau durch Zoro offen).

## Nicht ändern (Sanji)
js/**, sw.js, index.html-Struktur, tests/**, tools/**. Farben nur über css/tokens.css vorschlagen, mit Begründung.
