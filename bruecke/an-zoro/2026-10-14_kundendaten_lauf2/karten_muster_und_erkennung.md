# Speisekarten-Muster in Deutschland, Österreich, Schweiz – zweite Runde
**Abruf:** 14.10.2026. **Datenbasis:** 30 Original-Websites von Betrieben, 220 ausgewählte Positionen. Nicht zufällig gezogen, **keine repräsentative Preisstudie**.

## Auffällige Muster für Zoros Erkennung
1. **Menü-Rubrik mitdenken:** „Hühnerfleisch“ unter „Phở“ ist Suppe, unter „Phở Xào“ ein Nudelgericht. Quelle: privat, Karte DACH2-005 (DE).
2. **Doppelte Namen deduplizieren, nicht Preise:** Karte DACH2-010 listet „Falafel Taschenbrot“ teils doppelt; eine zweite Zeile ist kein zweiter Artikel. Quelle: privat, Karte DACH2-010 (CH).
3. **Zwei Preiswelten trennen:** Karte DACH2-011 unterscheidet Preise für Abholung im Laden und Lieferung; nie eine gemischte Preisspanne aus beiden rechnen. Quelle: privat, Karte DACH2-011 (CH).
4. **Rabatte/Vergleichspreise erkennen:** Karte DACH2-014 zeigt Normal-/Rabattpreis parallel; diese vier Beispiele wurden vorsorglich ohne Preis exportiert. Quelle: privat, Karte DACH2-014 (CH).
5. **Unterschiedliche Währungen:** CHF mit Punkt, EUR häufig mit Komma. Keine automatische Währungsumrechnung ohne bewusste Entscheidung und belegten Umrechnungskurs.
6. **Bild-, Text- und PDF-Karten:** Karte DACH2-009 hat Bildkacheln, Karte DACH2-006 ist ein zweispaltiges PDF von 2024. Letzteres nur Strukturtest, niemals aktuelle Preisbehauptung.
7. **Stückzahlen & Größe:** „Chicken Nuggets (6 Stk.)“, „Pizza 33cm“, „Cevapcici in Teller 10 Stk.“. Stückangaben nicht als Gesamtgramm interpretieren.
8. **Kein angezeigter Preis:** Website zeigt Artikel, aber Preis wird dynamisch geladen (etwa PDF-/JavaScript-Menüs). Im Parser „Preis unbekannt“ statt 0,00 €.
9. **Sprachmix & Sonderzeichen:** Phở, Dürüm, Pızza, Etli Ekmek, Cevapcıcı (originale Schreibweise als Trainingsmaterial erhalten).
10. **Ein Betrieb ist kein Zielkunde per se:** Mitarbeiterzahl, Eigentümermitarbeit und Zahl der Filialen wurden nicht unabhängig verifiziert. Diese Sammlung dient der **Kartenerkennung**, nicht der Kaltakquise.

## Kleine, nach Währung getrennte Stichprobe
Die separate `kalkulatorische_preisstichprobe.csv` enthält rein **beobachtete** Min-/Median-/Max-Werte und die Zahl verschiedener Kartenquellen. Die Stichprobe ist willkürlich und zu klein für Marktpreise. Varianten, Aktionspreise und historischer Flyer werden bei unklarer Zuordnung ausgenommen. 

## Folgetests für Zoro
Bild/Scan-Hinweise: Rubrik vor Gericht, Stück-/Größenfelder, aktuelle Preisbasis, Quellenname und Datum als Metadaten, rote/warnende Rückfrage bei widersprüchlichen Preisen. Erkennungsqualität muss Zoro mit seinen Tests messen.
