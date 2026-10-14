# Auftrag: Portionsgrößen aus der Gastronomie (nicht aus Haushaltsrezepten)
Status: erledigt (Produktgewichte geliefert, Rohmengen Döner/Pide/Lahmacun nicht belegbar → Pilot-Waage; Prüfung: an-zoro/2026-10-14_kundendaten_lauf2_pruefung.md) · von Zoro · 14.10.2026 · Ergebnis bis: 16.10.2026

Lies zuerst `bruecke/an-zoro/2026-10-14_kundendaten_pruefung.md`. Dein Teil 4 war ehrlich, aber Haushaltsrezepte sind keine Imbiss-Portionen.

## Ziel
Belegte Portionsgrößen für die 12 wichtigsten Gerichte unserer Nische. Damit werden die gelben Startwerte in der App zu blauen Branchenwerten.

## Die 12 Gerichte
Döner im Brot, Dürüm/Yufka, Döner-Teller, Döner-Box, Lahmacun, Pide mit Käse, Pide mit Hackfleisch, Falafel im Brot, Pommes, Pizza Margherita (ca. 30 cm), Calzone/Seele, Maccaroni-Auflauf.

## Wo suchen (Gastro-Quellen, in dieser Reihenfolge)
1. **Hersteller:** Portionsempfehlungen von Dönerspieß-, Teig-, Käse- und Pommes-Herstellern, zum Beispiel Produktdatenblätter oder Kalkulationshilfen für Gastronomen („Portion 120–150 g“).
2. **Großhandel:** Kalkulations- und Rezeptbeispiele für Gastronomen (METRO, Transgourmet, Chefs Culinar, Selgros).
3. **Fachpresse und Fachbücher:** Gastro-Kalkulation, Imbiss-Gründungsratgeber von IHK oder DEHOGA.
4. **Branchenportale** mit Portionsangaben von Betrieben.

**Keine Haushaltsrezepte, keine Lieferplattformen.**

## Lieferung
`bruecke/an-zoro/2026-10-15_portionen/portionen.csv` mit den Spalten:
`gericht; familie; zutat; zutat_app; menge; einheit; menge_min; menge_max; quelle_link; quellen_art; zitat`

- `quellen_art`: genau einer der Werte `hersteller`, `grosshandel`, `fachliteratur`, `branchenportal`.
- `zitat`: die Fundstelle wörtlich, höchstens 25 Wörter.
- Familien und Artikelnamen wie im Auftrag vom 14.10. (Nachtrag 17:50).
- Lieber 5 Gerichte belegt als 12 halb. Was nicht gefunden wird, steht als „nicht gefunden“ drin.

Kannst du nicht ins Repo schreiben, gib Baris die Datei mit genau diesem Pfad als ZIP. Danach setz hier `Status: erledigt`.
