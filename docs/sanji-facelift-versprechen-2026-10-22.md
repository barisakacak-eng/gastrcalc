# GastroCalc Facelift 1.0 – Nutzenversprechen und UI-Vertrag (22.10.2026)
**Status:** Vorbereitung für Zoro, keine produktive Implementierung. **Freigabe:** Designrichtung Facelift 1.0, keine Freigabe der neuen Funktionen.
**Source of truth:** ausdrückliche Kapitänsentscheidung vom 22.10.2026, vor dem veralteten `bruecke/stand.md` (16.10.) und `visual-vertrag.md` (14.10.); PR #5 ist die aktuelle optische Ausgangsbasis.

## 1. Produktversprechen = Abnahmekriterium
1. **Geld:** Du siehst jeden Tag, ob du Geld verdienst – und an welchem Gericht nicht. → L1 Heute, L5 Karte/Margen-Ampel, L6 Tag abschließen.
2. **Weniger Ware/Müll:** Du wirfst weniger weg und hast weniger Geld im Lager liegen. → L2 Müll + Station, B1 Inventur und Lager.
3. **Weniger Papier:** Dein Papierkram ist fertig, ohne dass du ihn machst. → B1 Büro/Ordner. Achtung: keine automatische Einreichung behaupten, die der Code nicht leistet.

**Erste Betriebe:** Döner UND Burger. Reihenfolge der Bauarbeiten: L1 → L2 inkl. Station → L5 → L6 → B1/Ordner/Inventur → L3 → L4 → P1.
**Geparkt:** Menütafel, Aktionen, Kasse, Getränke-Feinheiten, zusätzliche Sprachen, DATEV. Keine visuellen Aufträge dafür beginnen.

## 2. Neue Datenfelder (NEU – Felder lt. Zoro 22.10.)
```js
nutzen = {
  summe: Number, // Euro, vom Rechenkern, NUR gemessene und belegbare Werte
  posten: [{
    art: "muell" | "preis" | "lager" | "papier",
    euro: Number,
    gemessen: Boolean,
    quelle: String
  }],
  ab: String // Datum des Messbeginns
}
hinweis = {
  titel: String,
  satz: String, // max. 25 Wörter
  quelle: String, // konkrete Rechtssource, vom geprüften Inhalt
  knopf: "Belege bereitlegen",
  status: "neu" | "erledigt" | "später"
}
```
Die Oberfläche rechnet `summe` nicht selbst, verändert keine Rechenregeln und zeigt keine unbelegten Ersparnisse.

## 3. L1 Heute: zwei baubare UI-Richtungen – Empfehlung A
- **A empfohlen – Zähler ersetzt die vier Einzelkacheln**: vorhandene Monatskarte (Gewinnorientierung) bleibt oben; darunter eine einzige weiße, 76–90px hohe Nutzen-Karte mit Eurobetrag bzw. leerem Zustand. Die bestehende „Jetzt dran“-Karte bleibt als einzige dominierende Aktion. Die neue Karte öffnet auf Tippen ein flaches Blatt mit Messposten/Quellen; kein zweiter oranger Hauptknopf. Der Nutzen-Zähler erscheint **nicht zusätzlich** zu den vier Kacheln. UI-Quelle: `nutzen`; keine Demo-Eurozahl in produktivem Code.
- **B – Zähler ersetzt die gesamte Zielkarte**: mehr Platz, aber der Kunde sieht nicht mehr zuerst den Monatsstand; fachlich schlechter für Versprechen 1.
- **Exakte Vollüberschrift** im Nutzen-Detail: „Das hat dir GastroCalc diesen Monat gebracht“. In der 15-Wörter-Ladenansicht muss die Kurzzeile auf der Karte durch den Wortzähler getestet werden. Vorläufige Kurzzeile: „GastroCalc gebracht“ (2 Wörter); diese Kürzung ist **noch nicht final freigegeben**. Falls der vollständige Wortlaut unbedingt auf L1 sichtbar sein muss, müssen weitere Inhalte einschließlich Beschriftungen entfallen, statt die 15-Wörter-Regel still zu brechen.
- Wenn **kein** `posten.gemessen === true`: keine Eurozahl und keine Nullersparnis. Nur „Messung läuft seit <ab>“. Fehlt auch `ab`, keine erfundene Datumsangabe.
- Sobald Messungen existieren: große Summe aus dem Rechenkern; Detailzeilen `art`, `euro`, `quelle`, Status. Nur gemessene Posten sind in der Summe. Nicht gemessene Posten zeigen `≈` und graue Schrift, **niemals in `summe`**.
- Auf UI und in Übersetzungen DE/TR/EN achten; 360/390 px, echte längere Aufgabenbezeichnungen, maximal 15 sichtbare Wörter **einschließlich unterer Navigation**.
- **Besonderer Wahrheitscheck an Zoro:** „Lagerwert freigesetzt“ ist nicht automatisch Gewinn. Zeitersparnis ist nicht automatisch ausgezahltes Geld. Nur tatsächlich gemessene und überschneidungsfrei belegte Effekte in die Euro-Summe; ansonsten als graue Information außerhalb der Summe. Brutto-/Netto-Bezug und Doppelzählungen klären. Die Darstellung macht keinerlei eigene Wertung.

## 4. B1 Büro: geprüfte Steuer-Hinweiskarte – zwei Richtungen
- **A empfohlen – kleine Aufgabenkarte unter den drei Ordnern**: Kopf `hinweis.titel`, genau ein kurzer Satz (`hinweis.satz`, max. 25 Wörter), Quellenkürzel `hinweis.quelle`, Statuspunkt, eine 56px-Haupthandlung `hinweis.knopf` „Belege bereitlegen“. Darunter immer der sichtbare Pflichtsatz in ruhigem kleinen Text: „Allgemeiner Hinweis, keine Steuerberatung – mit deinem Steuerberater klären.“
- **B – Hinweis direkt in „Offen“-Liste**: weniger Platz, aber Quelle und Pflichtsatz schlechter lesbar.
- **Keine Karte ohne von Franky geprüften Inhalt.** Platzhalter werden nicht mit frei erfundenen Normen oder Euro-Effekten gefüllt. Franky liefert Quellen, Zoro übernimmt nur geprüfte steuerliche Inhalte, Sanji gestaltet. Kein „KI-Steuerberater“; beim echten Chat-Einstieg lautet der erste Satz: „Ich bin ein KI-Assistent.“
- Status `neu` = neutraler Hinweis, `erledigt` = klarer Haken, `später` = zurückhaltend grau. Kein roter Alarm für bloße Tipps; keine eigene Rechtsprüfung im UI.

## 5. Burger-Piktogramme – Doppelarbeit vermeiden
Im Repo bereits vorhanden und weiterverwenden: `bilder/g-burger.svg`, `bilder/g-pommes.svg`, `bilder/laden-burger.svg`, `bilder/selbst-patty.svg`, `bilder/w-brot.svg`, `bilder/w-hack.svg`.
Fehlen im abgestimmten Benennungsschema: `bilder/r-patty.svg`, `bilder/r-burgerbroetchen.svg`, `bilder/r-cheddar.svg`, `bilder/r-sauce.svg`. Erst bei tatsächlichem Einbau anlegen (SVG inline im Entwurf, im Work-Branch als eigene SVG-Dateien), 64×64, gleicher line-SVG-Stil wie `bilder/g-burger.svg`, keine externen Bilder/Marken.

## 6. Geplante Freitag-Integration: keine Doppelarbeit
- **Zoro** liefert valide `nutzen`- und `hinweis`-Daten, schützt Messlogik vor Doppelzählung, verlegt Test-Code/PIN hinter temporären Schalter, lässt DATEV draußen.
- **Franky** liefert die fachlich geprüften Steueraussagen mit konkreten Quellen und Gültigkeitsstand; Sanji recherchiert das nicht noch einmal.
- **Sanji** übernimmt Umsetzung/Styling der Nutzen- und Hinweis-Karten nach finaler Formfreigabe. Bis dahin **keine erfundenen Summen, keine Änderung der Steuer- oder Rechenlogik**.
- **Technikschutz:** `main` unverändert; PR #5 enthält bisher nur Facelift 1.0 Paket 1–6. SW/Fassung nur beim Einbau und Abgleich mit Zoro ändern.

## 7. Versprechen-Abgleich (für Freitag; Status am 22.10.)
| Bildschirm | Versprechen | In einem Blick? | Befund / nächster Schritt |
| --- | --- | --- | --- |
| L1 Heute | 1 + neuer gemessener Nutzen aus 1/2/3 | **teilweise** | Monatsstand sichtbar; neuer Nutzen-Zähler noch ohne Rechenkern |
| L2 Müll + Station | 2 | **teilweise** | Erfassen möglich; direkt belegte Einsparung noch nicht sichtbar |
| L5 Karte | 1 | **teilweise** | echte Preise/Ampel nur wenn Gerichte vorhanden; leerer Zustand zeigt Fotoknopf |
| L6 Tag abschließen | 1 | **teilweise** | Tagescheck vorhanden; klare Nutzenwirkung/Tagvergleich prüfen |
| B1 Büro + Ordner | 3 | **teilweise** | Ordner sichtbar; Steuer-Hinweiskarte noch nicht mit geprüften Inhalten gespeist |
| Inventur/Lager | 2 | **teilweise** | Datenwege bestehen; „freies Kapital“ darf nicht mit Gewinn verwechselt werden |
| L3 Kühlung | unterstützend zu 3 | **ja** | Rundgang als Handlung sichtbar |
| L4 Putzen | unterstützend zu 3 | **ja** | Aufgaben abhaken sichtbar |
| P1 Personal | 2 + 3 | **teilweise** | kein Euro, klare Aktionen; PIN-Testschalter von Zoro ausstehend |

## 8. Offene Aufgaben vor produktiver Freigabe
1. Neues Datenformat muss von Zoro getestet vorliegen; Quelle/Gemessen/Ersparniskategorien eindeutig.
2. Der Konflikt „volle Nutzen-Überschrift“ ↔ 15-Wörter-Regel auf L1 ist noch **nicht** final entschieden; Empfehlung Kurzlabel auf L1, Vollwortlaut im Detail.
3. Wirkliches Abschalten von PIN/Codes für die Testphase muss Zoro im Rechenkern/Modus umsetzen; Sanji gestaltet keine neuen PIN-Abfragen.
4. Fotos aus bestehenden 230 WebP nutzen; **keine KI-Food-Fotos** generieren.
5. Vor Merge: Browserregeln 360/390, DE/TR/EN, Offline und alle Fachtests; ausdrückliches Go des Kapitäns.
