# Auftrag an Sanji – Bilder für alle Gruppen, Gerichte und Zutaten (17.10.2026)

Von: Zoro (operativer Lead) · Für: Sanji, mit Baris · Status: OFFEN

## Worum es geht
Die App soll für alles, was sie kennt, ein eigenes Bild zeigen: Laden-Arten, Bereiche, Warengruppen, Gericht-Familien, alle 119 Gericht-Vorlagen, alle 429 Katalog-Artikel, Selbstgemachtes, Kühlgeräte, Müll. Heute sind 67 Bilder da; 359 Artikel und Gerichte zeigen ein ungenaues Sammelbild (Beispiel: „Dönerspieß Kalb/Pute“ zeigt den Hähnchenspieß), 219 nur ein Piktogramm.

## Die Liste
`bruecke/an-sanji/BILDLISTE.md` (lesbar) und `bruecke/an-sanji/bildliste.csv` (für Tabellen). Je Bild: Prio, Gruppe, Dateiname, Name in der App, Status, Motiv. Zoro sagt nur WAS drauf ist. WIE es aussieht, entscheidet ihr (Baris und Sanji) im Zielbild „Kräuter & Kupfer“ – einmal festlegen, dann für alle gleich. Die Liste wird von Zoro aus den App-Daten erzeugt (`node tools/bildliste.mjs`) und nach jeder Lieferung neu geschrieben; Status „vorhanden“ zeigt den Fortschritt.

## Feste Regeln (Technik)
WebP, 520 × 390 px (4:3), Qualität 70–75, 25–45 KB. Dateiname exakt wie in der Liste. Keine Schrift, keine Logos, keine Marken, keine erkennbaren Personen. Ein Motiv je Bild, mittig mit Rand. Nur selbst erzeugte Bilder oder eigene Fotos.

## Lieferweg (Sanji hat seit 17.10. Schreibrecht)
1. Branch `sanji/<datum>-bilder-<nr>` von main abzweigen.
2. Bilder nur nach `design-handoffs/sanji/bilder-<datum>-<nr>/` legen, dazu `LIESMICH.md` mit: Liste der Dateien, Status (ENTWURF / ZUR FREIGABE / VON BARIS FREIGEGEBEN), offene Punkte.
3. Pull Request nach main öffnen, Titel „Bilder <datum> Nr. <nr> (<anzahl>)“. Nicht selbst mergen.
4. Zoro prüft Format, Größe, Namen, Motiv gegen die Liste, kopiert nach `foto/`, trägt ein, testet, veröffentlicht und schreibt die Liste neu.
Nicht anfassen: `foto/`, `js/`, `css/`, `sw.js`, `index.html`, `tests/`, `tools/`, `.github/`.

## Reihenfolge
Prio 1 zuerst (162 fehlende Bilder: alles, was ein Dönerladen sieht). Darin zuerst Gruppe F (Artikel – Müll-Raster und Inventur zeigen sie täglich), dann E/D (Gerichte), dann A–C und G–I. Takt: 12 Bilder je Lieferung, gern als Bildbogen-Raster mit Reihenfolge im LIESMICH.

## Erst die Stilprobe
Bevor die Serie läuft: 3 Probebilder (ein Artikel, ein Gericht, eine Verpackung) aus Prio 1 an Baris zur Freigabe. Erst nach seinem Ja die Serie.
