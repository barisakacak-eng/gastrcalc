# Prüfung durch Zoro – Auftrag Kundendaten (14.10.2026, 18:15)

**Gesamturteil:** saubere, ehrliche Teillieferung. Keine erfundenen Zahlen, Lücken klar benannt, Datenschutz-Regeln eingehalten. Die Mengenziele (100–200 Betriebe, 30 Karten, 40 Rezepte) wurden nicht erreicht.

## Zahlen
- **Stichprobe gegengeprüft:** Imbissstuben DE 2019: 37.056, 2021: 33.651, 2023: 35.728 (umsatzsteuerpflichtig). Bestätigt im DEHOGA-Zahlenspiegel I/2026, Seite 14.
- **Einschränkung der Quelle:** Gezählt werden nur Unternehmen über 22.000 € Jahresumsatz (vor 2020: 17.500 €).
- **Übernommen als Marktgröße:**
  - Der Oberbegriff „Imbissstuben DE ≈ 35.700 (2023)“ ist die beste amtliche Obergrenze unserer Nische.
  - Asia-Imbiss, Döner und Pizza-Imbiss stecken darin. Bäckereien und Foodtrucks nicht oder nur teilweise.
- **Nicht übernommen:** Nischenscharfe Zahlen gibt es nicht. Sanji hat das korrekt mit „nicht gefunden“ gekennzeichnet.

## Rezept-Grundlagen (rezept_grundlagen.csv)
- **Quelle:** 24 Zeilen aus Haushaltsrezepten (REWE, Oetker), auf Portionen heruntergeteilt.
- **Urteil:** Das sind **keine Gastro-Portionen**, Sanji schreibt das selbst. Deshalb werden sie **nicht als Branchenwert** übernommen.
  - Sie gelten als `schaetzung` (gelb).
  - Sie dienen nur als Plausibilitätsgrenze, zum Beispiel Mehl für Pide pro Stück etwa 125 g im Haushalt, unser Startwert liegt bei 220 g.
- **Folge:** Echte Branchenwerte brauchen Gastro-Quellen oder die Waage im Pilot. Dafür gibt es einen Folgeauftrag in `an-sanji/2026-10-15_portionen_gastro.md`.

## Speisekarten (privat, 108 Zeilen aus 3 Karten)
- **Testlauf:** Die Zeilen liefen durch unseren Rezept-Baukasten. 79 von 104 Speisen bekamen ein Rezept.
- **Was fehlt:**
  - Pizzen, die nur mit dem Belag heißen („Salami“ unter der Rubrik „Pizza 32 cm“): Der Baukasten braucht die **Rubrik** als Hinweis.
  - Soßen und Extras, Fingerfood (Nuggets, Onion Rings).
  - Größen „Classic/Big/Mega“ und „32 cm“.
  - Zwei Preise je Gericht (Aktionspreis und Listenpreis).
- **Umsetzung:** Das wird mit Etappe 6 gebaut (Umbauliste Punkt 8). Die Karten dienen dabei als private Testdaten.

## Betriebsliste (privat)
- 54 Prüfkandidaten, davon 0 nach Raster bestätigt.
- Die Liste bleibt nur beim Kapitän. Sie ist **nicht im Repo**, nicht in der App und nicht im Project.
- Zur Ansprache taugt sie erst nach einer Bestätigung im Gespräch vor Ort.

## Übernommen am 14.10.2026
- zahlen.csv (Marktgröße)
- karten_auswertung.md (Kartenaufbau)
- Testdaten aus den Karten (lokal)

Die Rezeptwerte sind nur als Plausibilitätsgrenze übernommen.
