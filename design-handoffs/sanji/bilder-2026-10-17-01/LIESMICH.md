# Sanji – Bildpaket 01

Datum: 2026-10-17
Etappe: Bildliste, Priorität 1, Gruppe F (Artikel)
Status: VON BARIS FREIGEGEBENER FOTOSTIL / BILDER ZUR PRÜFUNG DURCH ZORO
Lieferweg: ZIP statt Pull Request. GitHub-Branch-Erstellung erneut mit HTTP 403 „Resource not accessible by integration“ abgelehnt.
Quelle: Bereits im Projekt mit ChatGPT erzeugter Getränke-Bildbogen. Keine Stockfotos.

## Reihenfolge der 12 Bilder
1. d-apfelsaft.webp – Apfelsaft
2. d-ayran-0-25-l.webp – Ayran 0,25 l
3. d-bio-limonade-0-33-l.webp – Bio-Limonade 0,33 l
4. d-cola-1-0-l.webp – Cola 1,0 l
5. d-energydrink-0-25-l.webp – Energydrink 0,25 l
6. d-fanta-0-2-l.webp – Orangenlimonade 0,2 l
7. d-hausgemachte-limonade.webp – Hausgemachte Limonade
8. d-ingwershot.webp – Ingwershot
9. d-kirschsaft.webp – Kirschsaft
10. d-kokoswasser.webp – Kokoswasser
11. d-lassi.webp – Lassi
12. d-mineralwasser-0-75-l.webp – Mineralwasser 0,75 l

## Technische Prüfung
- Alle 12 Dateien: WebP, 520 × 390 px, Qualität 73.
- Keine Schrift, Logos, Marken oder Personen auf den Bildern.
- Dateien unter 25 KB: kleinere Dateigrößen durch einfache Hintergründe; nicht künstlich aufgebläht.
- Die Motive sind aus einem gemeinsamen 4 × 3 Bildbogen geschnitten, daher können einzelne Gefäße von der konkreten Größe/Bezeichnung abweichen.
- Vor Einbau unbedingt die 12 Einzelmotive visuell gegen `bruecke/an-sanji/bildliste.csv` prüfen. Besonders: Bio-Limonade, Orangenlimonade und Lassi.

## Integration nur durch Zoro
- ZIP-Pfade unter `design-handoffs/sanji/bilder-2026-10-17-01/` erhalten.
- Zoro übernimmt geprüfte Bilder nach `foto/` und aktualisiert den Datenkatalog.
- Keine Änderungen an `js/`, `css/`, `foto/`, `sw.js`, `index.html`, `tests/` oder `tools/` durch Sanji.
- Nach Prüfung die Bildliste neu erzeugen.

## Offene Punkte
- GitHub-Connector verweigert weiterhin Branch-Erstellung (403). Kein Branch/PR wurde angelegt.
- Sichtprüfung der konkreten Artikelzuordnung durch Zoro vor Freigabe.
