# Datenverträge GastroCash (Stand 24.10.2026, Zoro)

Diese Datei ist die einzige Quelle für die Felder, gegen die Oberfläche (Sanji) und Inhalte (Franky) gebaut werden. Änderungen nur durch Zoro, mit Datum. Rechenwerk: `js/nutzen.js`, `js/hinweis.js`; Tests: `tests/nutzen.test.mjs`, `tests/hinweis.test.mjs`.

Leitsatz: Vorne im Laden wird Geld verdient, hinten (Büro) muss das Geld bleiben. Jeder Vertrag nennt seine Spur und sein Versprechen.

## 1. Euro-Zähler (Spur vorne, Versprechen 1–3) – `nutzenStand(stand, H)`

Zeigt, was GastroCash dem Wirt nachweisbar gebracht hat. Nur Gemessenes zählt in die Summe. Nichts wird erfunden.

```js
{
  ab:       "JJJJ-MM-TT" | null,   // Messbeginn: erster Müll-Eintrag oder erster Tagesabschluss
  tage:     number,                // Tage seit Messbeginn (0 ohne ab)
  leer:     boolean,               // true, solange kein Posten gemessen ist → Oberfläche zeigt „Messung läuft seit <ab>“
  summe:    number,                // Euro, nur Posten mit gemessen: true und euro > 0
  geschaetzt: number,              // Euro, Posten mit gemessen: false und euro > 0 – Anzeige mit „≈“, grau
  posten: [{
    art:      "muell" | "preis" | "lager" | "papier",
    euro:     number | null,       // null = noch nicht messbar
    gemessen: boolean,
    quelle:   string,              // kurzer Satz, woher die Zahl kommt (Oberfläche zeigt ihn klein)
    stand:    "laeuft" | "gemessen" | "geschaetzt" | "fehlt"
  }]
}
```

Regeln:
- `muell`: Ausgangswert = Wochenmittel der ersten 14 Tage ab Messbeginn (nur bewertete Müll-Einträge). Gemessen erst, wenn der Ausgangswert voll ist (14 Tage) und die letzte Woche mindestens einen Eintrag hat. Nutzen = Ausgangswert je Woche minus letzte Woche, nie negativ. Vorher: `stand: "laeuft"`, quelle „Ausgangswert läuft, Tag x von 14“.
- `lager`: Differenz zwischen erster und letzter fertiger Inventur (Lagerwert). Gebundenes Geld ist kein Gewinn → immer `gemessen: false`, nie in `summe`.
- `papier`: nur mit Vorher-Schätzung des Wirts (`stand.betrieb.nutzen.papierMinutenVorher`, Minuten pro Monat) und Stundensatz (`stand.betrieb.nutzen.stundensatz`, Euro). Immer `gemessen: false` (Schätzung des Wirts).
- `preis`: erst messbar, wenn die App Preisänderungen je Gericht mit Datum kennt (noch nicht gebaut) → `stand: "fehlt"`, `euro: null`.
- Keine Doppelzählung: ein Euro gehört zu genau einem Posten.

## 2. Hinweis-Karten (Spur hinten, Versprechen 3) – `hinweiseFuer(stand, opt)`

Allgemeine Hinweise aus dem Steuer-Register, ausgelöst durch Daten, die die App ohnehin hat. Keine Einzelfallberatung, keine Berechnung von Ersparnissen, nie das Wort „Steuerberater“ als Name der Funktion.

```js
{
  id:        string,               // z. B. "berufskleidung"
  titel:     string,               // höchstens 4 Wörter
  satz:      string,               // höchstens 25 Wörter, endet sinngemäß mit „mit deinem Steuerberater klären“
  quelle:    string,               // Paragraf, kurz
  gilt_fuer: "doener" | "burger" | "beide",
  spur:      "vorne" | "hinten",
  versprechen: 1 | 2 | 3,
  knopf:     "Belege bereitlegen",
  belege:    string[],             // Stichworte für den Belege-Bildschirm
  status:    "neu" | "erledigt" | "spaeter",
  rechtsformen: "alle" | string[], // z. B. ["gmbh", "ug"]; Karte erscheint nur, wenn stand.betrieb.rechtsform passt (js/rechtsform.js)
  ausloeser: string,               // Schlüssel aus AUSLOESER in js/hinweis.js (mitarbeiter, menue, inventur, abschluesse5, belege, manuell)
  register:  string,               // Nummer im Steuer-Register (Franky)
  geprueft:  boolean,              // true erst nach Quellenprüfung durch Zoro; die App zeigt nur geprüfte Karten
  pruefung:  string                // "JJJJ-MM-TT was gelesen wurde"; Pflicht, wenn geprueft true
}
```

Regeln:
- `hinweiseFuer(stand)` liefert nur Karten mit `geprueft: true`, deren Auslöser zutrifft und deren Status nicht „erledigt“ ist. `{ nurGeprueft: false }` liefert alle (für Tests und Entwürfe).
- Auslöser kommen nur aus vorhandenen App-Daten: `mitarbeiter > 0`, `personalessen vorhanden`, `menue vorhanden` (gelernte Kassen-Menüs), `inventur vorhanden`, `tagesabschluesse >= 5`, `belege` (mindestens eine Lieferung oder ein Kostenbeleg, kein Stichwort-Abgleich), sonst „manuell“.
- Status liegt in `stand.betrieb.hinweise = [{ id, status, zeit }]` (Bereich `betrieb`, wird beim Zusammenführen vereinigt, jüngste Zeit gewinnt). Schreiben nur über `hinweisStatusSetzen(stand, id, status)`.
- Pflichtzeile in der Oberfläche: „Allgemeiner Hinweis, keine Steuerberatung – mit deinem Steuerberater klären.“
- Inhalt kommt aus Frankys Register; jede Karte wird vor `geprueft: true` von Zoro an der Primärquelle geprüft (Quellenprüfung 23./24.10.2026, Gremium 3 am 24.10.2026).

## 3. Verboten in beiden Verträgen
Wörter: rechtssicher, steuersicher, betriebsprüfungsfest, GoBD-konform, revolutionär, disruptiv, Marktführer, KI-Steuerberater, lückenlos, zertifiziert, manipulationssicher, HACCP-konform, „so sparst“ (Liste = VERBOTEN in js/hinweis.js). Keine Wirkungsbehauptung („hat dir gebracht“) ohne Beleg der Ursache. Erfundene Beträge. Rechenregeln außerhalb des Rechenwerks.

## 4. Zahlen und Setzungen aus dem Masterauftrag „Gehirn“ (28.10.2026, Zoro)

Jede Zahl mit Quelle und Abrufdatum; Setzungen sind eigene Schwellen ohne Branchenbeleg.

| Zahl | Wert | Wo | Quelle / Art |
|---|---|---|---|
| Mindestlohn 2026 / ab 01.01.2027 | 13,90 € / 14,60 € je Stunde | `js/data/mindestlohn.js` | Mindestlohnanpassungsverordnung; haufe.de Gesetzesradar, lohndialog.de (Abruf 28.10.2026) |
| Minijob-Grenze 2026 / 2027 | 603 € / 633 € im Monat | `js/data/mindestlohn.js` | § 8 Abs. 1a SGB IV (Mindestlohn × 130 / 3, aufgerundet); lohndialog.de (Abruf 28.10.2026) |
| Richtwert eigener Lohn | Mindestlohn × 173 Std, auf 50 € gerundet (2.400 € / 2.550 €) | `js/engine.js` eigenerLohnRichtwert | Rechnung, ≈ |
| Mindestlohn-Vorschau | Stunden der letzten 28 Tage × 30,4/28 × Differenz × (1 + Arbeitgeberanteil); Umsatz = Mehrkosten ÷ (1 − Warenquote) × (1 + USt) | `js/mindestlohn.js` | Rechnung, immer ≈ (ohne Berufsgenossenschaft) |
| Karte Mindestlohn | ab 92 Tage vorher bis 31 Tage danach | `js/mindestlohn.js` | Setzung |
| Umsatz-Rückfrage | unter 10 % oder über 3× Median der letzten 14 Tage, ab 5 Tagen | `js/umsatz_pruefung.js` | Setzung |
| BGN | ≈ 1,04 % des Bruttoentgelts | `js/data/lohnkosten.js` BGN_ANTEIL | BGN Geschäftszahlen 2025, Register 28.10.2026 |
| Sachbezug 2027 | 2,43 € / 4,70 € (geplant) | `js/engine.js` SVEV_2027 | BR-Drs. 503/26, Register 28.10.2026 |
| Kühlgrenzen Standard | kühl ≤ 7 °C, tief ≤ −18 °C, warm ≥ 60 °C, Speiseeis ≤ −10 °C | `js/engine.js` GRENZEN_STANDARD, GRENZEN_QUELLE | LAVES-Merkblatt MFB 08-002-00 (2022), § 2 Abs. 4 TLMV, BfR 037/2020 (Abruf 28.10.2026) |
| Kühlgrenzen je Ware | Geflügel ≤ 4 °C, Fisch ≤ 2 °C, Hack SB ≤ 2 °C, loses Hack offen | `js/engine.js` GRENZEN_WARE | LAVES-Merkblatt 2022 |
| Stoßzeiten (keine Erinnerungen) | Standard 11:30–14:00, 17:30–20:30, je Laden einstellbar | `js/offen.js` RUHEZEITEN_STANDARD | Setzung |
| Sicherung | Erinnerung: nie gesichert ab 5 Einträgen, nach 7 Tagen, erste 7 Tage im neuen Monat | `js/sicherung_stufe.js` sicherungFaellig | Setzung |
| Erste Zahl | ohne Miete (Gruppe „miete“) oder Löhne keine Euro-Zahl | `js/laden_zahlen.js` ersteZahlFehlt | Regel (Gremium 28.10.2026) |
| Preisrunden-Rechner | Schwelle = 1 − DB alt / DB neu (DB = Preis netto − Ware); Goldwert 7,11 → 7,61 € = 9,37 % | `js/preisrunde.js` | Rechnung (Gremium R3) |
| Euro-Hebel | +0,30 € brutto ÷ (1 + MwSt) × Menge im Monat | `js/hebel.js` HEBEL_CENT | Setzung 0,30 € |
| Preis-Schritt im Rechner | 10 Cent | `js/screens/preisrunde.js` PREIS_STUFE | Setzung |
| Renner & Penner | Grenzen = Mittel der Menge, mengengewichtetes Mittel des Deckungsbeitrags; nur mit eingetragenen Mengen | `js/hebel.js` rennerPenner | Rechnung (Menü-Matrix) |
| Preisdrift | Preis vor 91 Tagen gegen heute je Basis × Verbrauch laut Rezept; nur echte Belege, ab 3 % | `js/preisdrift.js` DRIFT_TAGE, DRIFT_AB | Setzung |
| Extras | Preis ÷ (1 + MwSt des Gerichts) − Ware des Extras | `js/extras.js` | Rechnung |
| Menü-Bündel | Menüpreis netto = Menüpreis × Σ netto ÷ Σ brutto (Verhältnis der Einzelpreise); Rabatt = Σ brutto − Menüpreis | `js/extras.js`, `js/deal.js` | Rechnung, Aufteilung mit dem Steuerberater klären |
| Nutzen-Posten „preis“ | übernommene Preisrunden, Erhöhungen und Senkungen: (neu − alt) ÷ (1 + MwSt) × Menge im Monat × 12/52 je Woche, immer ≈ | `js/nutzen.js` postenPreis | Rechnung, nicht gemessen |
| Hebel-Untergrenze / Liste | unter 1 € im Monat nicht gezeigt; im Rechner die 3 größten | `js/hebel.js` HEBEL_MIN_EURO, HEBEL_LISTE | Setzung |
| Rechner Start / Untergrenze | öffnet mit +0,50 €, kleinster Preis 0,10 € | `js/screens/preisrunde.js` START_AUFSCHLAG, MIN_PREIS | Setzung |
| Vorlagen: Mengenwörter | doppel/double, triple, XXL, groß, klein, Kinder nur auf einer Seite → Ähnlichkeit − 0,25 | `js/karte_lesen.js` MENGENWORT_ABSCHLAG | Setzung (Burger-Test 28.10.2026) |
| Portion in Euro (2.1) | (gewogen − Rezept) → Rohmenge (Garverlust) × Preis je Basis; im Jahr × Menge im Monat × 12 | `js/ware.js` portionEuro | Rechnung, ≈ bei geschätzten Mengen |
| Spieß-Bilanz (2.2) | Kosten = Roh × Preis; je Portion = Kosten ÷ Portionen; Rest × Rohpreis (≈); Garverlust nie vorgegeben | `js/ware.js` spiessBilanz | Rechnung |
| A-Artikel (2.3) | 5–8 teuerste Zutaten im Wochenverbrauch, bis ≈ 80 % des Wertes | `js/ware.js` A_MIN, A_MAX, A_ANTEIL | Setzung (ABC-Analyse) |
| Müll-Rangliste (2.4) | Woche nach Gruppe Fleisch/Brot/Salat/Soße/Sonstiges, Gericht nach Warenwert der Zutaten verteilt; „zu viel vorbereitet“ ab 15 % an mind. 3 von 14 Tagen | `js/ware.js` MUELL_GRUPPEN, UEBRIG_AB, UEBRIG_TAGE, UEBRIG_MIN_TAGE | Setzung (Masterauftrag 2.4: 15 %) |
| Lieferantenvergleich (2.5) | letzter Preis je Basis je Lieferant aus Belegen; nur gleiche Basis und Packung ± 10 % | `js/ware.js` LIEFERANT_INHALT_TOLERANZ | Setzung |
| Selbst oder kaufen (2.6) | (Material + Minuten × Minutensatz) ÷ Ausbeute gegen Zukaufpreis je kg/l/Stück × Jahresverbrauch | `js/ware.js` selbstOderKaufen | Rechnung |
| Einkauf nächste Woche (2.7) | Summe Bestellvorschlag, bestellen in den nächsten 7 Tagen | `js/ware.js` einkaufNaechsteWoche | Rechnung |

Nach Register „Zahlen und Fristen“ 28.10.2026 (ab 16:30 maßgeblich): BGN ≈ 1,04 % des Bruttoentgelts im Arbeitgeber-Aufschlag (angestellt ≈ 24,88 %, Minijob ≈ 32,21 %, immer ≈, hängt an der Krankenkasse); Sachbezug SvEV nach Datum (2026: 2,37/4,57 €; ab 01.01.2027 geplant 2,43/4,70 €); Abgaben des Arbeitgebers auf den Sachbezug der Personalessen der letzten 30 Tage als ≈ Lohnkosten (`sachbezugAbgabenMonat`), die Ware selbst nicht doppelt. Pauschbetrag 2027 nicht vorab eingebaut. Feiertage BW 2026/2027 per Test gegen das Register geprüft (Gründonnerstag kein Feiertag). Aufbewahrung Belege 8 Jahre (Hinweis-Karte).

## 5. Abgleich, Einlesen und Sicherung (Lauf 6, Etappe 5, 13.11.2026, Zoro)

Rechenwerk: `js/store.js`, `js/abgleich_felder.js`, `js/zip.js`, `js/monatsabschluss.js`; Sätze für die Oberfläche: `js/data/l6y_texte.js` (`l6yText(schluessel, sprache)`, `l6ySatz(schluessel, sprache, …)`); Tests: `tests/lauf6_e5_daten.test.mjs`. Leitsatz: Nichts geht beim Abgleich still verloren; zwei Handys kommen zum selben Ergebnis, egal wer zuerst einliest.

**5.1 Jedes Feld eines Ladens hat genau ein Verfahren.** Bereich (`BEREICHE`), Journal (`JOURNALE`), `FELD_ABGLEICH` (Stunden `teamTage`, `lieferTage`, `abwesend`, `preisRunden`, `schichten`, `chef`, `liquiditaet`, `zekiLog`, `zekiLogGeloescht`, `branchenVersion`), eigene Regel in `verschmelzen` (`IN_VERSCHMELZEN`: `geaendert`, `phase`, `rueckkehr`, `stammZeit`, `abgleich`, `abgleichHinweis`, `monatsabschluesse`, `feldZeit`) oder bewusst nur am eigenen Handy (`NUR_LOKAL`, je Feld mit Grund). Ein neues Feld ohne Eintrag macht den Registertest rot.

**5.2 Bericht von `zusammenfuehren` / `zusammenfuehrenSicher` / `einlesenSicher`** (`.bericht`, nicht aufgezählt):
```js
{ beide: [bereich],                          // beide Handys haben den Bereich geändert
  zukunft: number,                           // Einträge mit Datum in der Zukunft: übernommen, mit datumPruefen: true markiert
  konflikte: number,                         // HACCP-Eintrag gleicher Kennung, anderer Inhalt: eigener Eintrag daneben
  eintraege: [{ laden, bereich, kennung, art: "verschieden"|"geloeschtGeaendert", lokal, fremd, behalten: "lokal"|"fremd" }], // B1, beide Werte kurz
  unterschiede: [{ laden, bereich, lokal, fremd, gilt: "lokal"|"fremd" }],  // B1: Bereiche ohne Kennung, beide geändert – die gewählte Seite gilt, beide Werte stehen hier
  umsatzKonflikte: [{ laden, tag, lokal, fremd, gilt }], // B2: derselbe Tag, zwei Handys, verschiedener Betrag; der jüngste gilt weiter still
  ungueltig: number,                         // C5: beim Einlesen übersprungene Einträge (E11: auch ersetzte Listen, Läden ohne Kennung, gekürzte Namen, ungültige Stunden)
  beispielUebersprungen?: number }           // E11 (C1): fremde Beispiel-Läden, die nicht übernommen wurden (nur ein leeres Handy bekommt sie)
```
`stand.abgleichHinweis` trägt dieselben Listen (`eintraege`, `unterschiede`, `umsatzKonflikte`, je höchstens 20) zusätzlich zu `bereiche`, `zukunft`, `konflikte`. Wie je Eintrag und je Feld zusammengeführt wird, steht in 5.10 (seit E11 für alle Stammdaten-Bereiche, nicht mehr nur für Gerichte, Kosten und Waren).

**5.3 Monatsabschluss.** `monatsabschluesse[].abdruck` (Fingerabdruck der Umsatzeinträge des Monats, beim Einfrieren geschrieben); `abschlussVeraltet(stand, monat)` ist wahr, wenn sich die Einträge seitdem geändert haben; alte Abschlüsse ohne `abdruck` sind nie veraltet.

**5.4 Datei aus neuerer Fassung.** Ist `schema` im Kopf ODER in `wurzel` höher als `SCHEMA`, wirft `importDatei` `grund: "neuer"`. Unbekannte Felder an Wurzel, Laden und Einträgen bleiben erhalten (durchgereicht, nicht gedeutet). `SCHEMA` bleibt 6: alle neuen Felder (`datumPruefen`, `abgleich.*.eintraege`, `abdruck`, `rohteile`, `testphase`, `bio`) sind optional; eine ältere App ignoriert sie, eine neuere liest sie.

**5.5 Grenzen beim Einlesen.** Datei höchstens 200 MB, ein entpackter Eintrag oder Text höchstens 50 MB (`grund: "gross"`): ein Jahr Daten ≈ 5 MB (Stresstest 15.10.2026), 50 MB wären rund zehn Jahre in einer Datei; die Foto-Ablage nimmt höchstens 15 MB je Datei, 200 MB tragen mehrere hundert Belegfotos. Beträge endlich, ≥ 0, ≤ `MAX_ZAHL` (1e7); Tage nur echte Daten (`gueltigerTag`); Ladenname höchstens 80 Zeichen (länger: gekürzt auf 40 und gezählt). Ungültige Einträge werden gezählt (`bericht.ungueltig`) und übersprungen.

**5.6 Rückholpunkt.** `einlesenSicher(wurzel, importiert)` führt auf einer Kopie zusammen (Fehler → Wurzel unverändert), merkt die alte Wurzel (`rueckholpunkt`, Speicher `stand`, Schlüssel `rueckhol`, Info unter `rueckhol-info`) und übernimmt dann. `zurueckholen(aktuelleWurzel)` stellt sie wieder her und verbraucht den Punkt (die Bereichszeiten `stammZeit` werden dabei nicht neu gestempelt, E11 C8); `rueckholpunktInfo(wurzel)` liefert `{ zeit, grund, neuSeitdem }` oder `null`. `neuSeitdem` zählt, was seit dem Einlesen eingetragen wurde (Journal-Einträge und Stornos, Stunden/Schichten/Lieferdienst, Chef-Stunden, „Geld heute“, Bereiche der Stammdaten mit Zeit nach dem Punkt; `rueckholNeuSeitdem(wurzel, zeit)` rechnet es synchron); ohne Wurzel ist es `null` (unbekannt). Ein Punkt, der älter als 7 Tage ist, wird beim Start (`laden`) gelöscht.

**5.7 Gerettete Monatsteile.** Ein halb abgeschnittener Journal-Teil wird bis zum letzten vollständigen Eintrag gelesen; `ladeFehler` bekommt `grund: "gerettet"` mit `gerettet: Anzahl`; der Rohtext liegt im Speicher `stand` unter `roh` und geht als `rohteile` in jede Vollsicherung.

**5.8 Ereignisprotokoll.** „app-sichtbar“ höchstens einmal je Stunde; beim Kürzen auf 2000 bleiben `import*`, `export*`, `abgleich*`, `sicherung*`, `speicher*`, `fehler*`, `einlesen*`, `fremde-fassung` bevorzugt.

**5.9 Verdrahtung in der Oberfläche (E5-Draht, 13.11.2026).** `js/app.js`: `vormonatEinfrierenWennNoetig` beim Start und beim Tageswechsel; Einlesen über `einlesenSicher` (Rückholpunkt), Knopf „Einlesen rückgängig machen“ (`data-a="sicherung-zurueckholen"`, Büro → Einstellungen → Sicherung, nur solange `rueckholpunktInfo(wurzel).neuSeitdem === 0`, also nichts Neues eingetragen wurde; `js/bedienung/zeichnen.js` rechnet es bei jedem Zeichnen, `sicherungZurueckholen` prüft es noch einmal); Fehlergründe `neuer` und `gross` mit Sätzen aus `l6y_texte.js`. `js/offen.js`: je Art höchstens drei Zeilen aus `abgleichHinweis` (`eintraege`, `unterschiede`, `umsatzKonflikte`), „… und n weitere“, `zukunft`, gerettete Teile. `js/ablage.js`: `ablegen` wirft bei Schreibfehler der Ablage `grund: "speicher"` (`voll: true` bei Speicher voll) und meldet über `beiAblageFehler(art, fehler)` das Banner. Tests: `tests/lauf6_e5_draht.test.mjs`, `tests/lauf6_e5_draht_ablage.test.mjs`, `tests/rueckhol_browser.py`.

**5.10 Abgleich je Feld und Eintrag (E11, 13.11.2026).** Zwei Handys kommen zum selben Ergebnis, egal wer zuerst einliest; nichts geht still verloren. Rechenwerk: `js/store.js` (`ZELLEN`, `basisFuer`, `bereichWahl`, `zellenVerschmelzen`, `zeitenVereinen`), Tests: `tests/lauf6_e11_abgleich.test.mjs` (echte Rundreise über `exportDatei` / `importSicherung` / `einlesenSicher`).
- **Stand der Gegenseite je Quelle (A1).** `abgleich[bereich].quellen[geraet] = { h, eintraege, zeit, fz }`: Fingerabdruck des Bereichs und je Eintrag (Kennung → Fingerabdruck), wie diese Quelle (Gerätekennung der eingelesenen Datei) ihn beim LETZTEN Einlesen hatte; `zeit` = Uhr dieses Handys dabei, `fz` = späteste Feldzeit der Quelle. `quellen["*"]` = Stand beim Anlegen des Ladens aus einer Datei (für Quellen, die noch nie eingelesen wurden). Alte Läden kennen nur `zuletzt` („alt“): damit wird nie gelöscht. Bis E11 stand dort der Stand NACH dem Zusammenführen; das hielt eigene, der anderen Seite unbekannte Änderungen für „bekannt“ („lokalGleich“) und nahm beim zweiten Einlesen die fremde Liste ganz. `bereichWahl`: gleicher Fingerabdruck → `gleich`; Quelle unverändert → `bekannt` (lokal); dieses Handy gleicht noch dem Stand der Quelle → `lokalGleich` (fremd); sonst `beide`; ohne Stand `zeit`.
- **Änderungszeit je Feld (B1).** `betrieb.feldZeit = { [Pfad]: ms }`, Pfad = Feld, Kennung, Unterfeld (getrennt durch U+001F; Objekte: Feld, Unterfeld; einzelne Werte: Feld). Beim Speichern aus dem Inhalt gestempelt (kein Bildschirm muss etwas melden), vor `exportDatei` und vor dem Einlesen auch für Ungespeichertes nachgezogen (`feldZeitenNachziehen`). Alte Daten ohne Feld zählen als 0; ungültige Werte fallen beim Laden weg; Pfade ohne Eintrag und Zeiten über 200 Tage werden beim Zusammenführen entfernt; je Pfad gilt die spätere Zeit (Zukunft über einen Tag wird gekappt), dadurch gleich auf beiden Handys. Bereiche mit Feldzeit (`ZELLEN`): kosten (Posten, Kategorien, `team`), gerichte (+ `selbst`, `selbstAutoArt`, `adanaBrot`), artikel, betrieb (`betrieb`, `kanaele`, `verkauf`, `ladenArt`), ladenArten, kuehl, putzplan, personen, lager, kombis, tafel, lieferanten. `wochen`, `spiesse`, `portionen` und `aktionen` bleiben beim Vereinigen nach Kennung (nur der Fingerabdruck der Quelle wurde korrigiert).
- **Je Eintrag (Kennung: `id`, Waren `name`).** Gleich → einmal. Nur die Quelle geändert → deren Eintrag; nur dieses Handy → dieser; neu auf einer Seite → übernehmen; auf der anderen Seite gelöscht und hier unverändert → gelöscht; gelöscht und geändert → bleibt (Vermerk `geloeschtGeaendert`). Haben beide geändert (oder ist die Quelle neu), wird JE FELD entschieden: spätere Feldzeit; bei gleicher Zeit die spätere Bereichszeit (ohne: der jüngere Laden); danach ein vorhandener Wert vor einem fehlenden, dann der größere Text – auf beiden Handys dasselbe. `entfernt` / `archiviert` gewinnen immer, bei Personen bleiben Kürzel (der Seite, die entfernt hat) und das frühere `ausgeschieden`.
- **Vermerk (B1).** Haben beide Handys dasselbe Feld seit dem letzten Kontakt geändert (eigene Zeit nach `zeit`, Zeit der Quelle nach `fz`; ohne Zeiten auf beiden Seiten: beide geändert), bleibt der Vermerk mit beiden Werten: Einträge → `bericht.eintraege` (`art: "verschieden"`, `behalten` = die Seite, die mehrheitlich gilt), Felder ohne Kennung (`team`, `betrieb`, `lager` …) → `bericht.unterschiede`; beides steht auch im `abgleichHinweis`. Grenze: hat ein Handy denselben Eintrag nach dem Einlesen der Quelle noch einmal selbst geändert, ohne dass die Quelle ihn kennt, kann ein überflüssiger Vermerk entstehen (der Wert ist dann trotzdem richtig).
- **Storno-Felder (A2).** Jedes Feld, das mit `storniert` beginnt (`storniertZeit`, `storniertVon` …), ist ein Kennzeichen und kein Inhalt (sonst HACCP-Konflikt und Kopie). Haben beide storniert, gilt die frühere Rücknahme mit ihren Begleitfeldern. `datumPruefen` gewinnt (wahr).
- **„Geld heute“ (B2).** `liquiditaet = { betrag, datum, erfasst }`: der jüngere Tag gilt, am selben Tag die spätere Erfassung (`erfasst`, ISO); ohne oder bei gleicher Zeit der kleinere Betrag (vorsichtig); verschiedene Beträge am selben Tag stehen als `unterschiede` mit `bereich: "liquiditaet"`. Chef-Stunden mit gleicher Zeit: der größere Inhalt.
- **Einlesen (C).** Fremde Beispiel-Läden (`beispiel: true`) werden nur auf ein leeres Handy übernommen (`bericht.beispielUebersprungen`), sonst nie (NUR_LOKAL.beispiel); `wurzel.aktiv` zeigt nie auf einen übersprungenen Laden. Eine Liste oder ein Objekt, das durch einen anderen Typ ersetzt wurde, zählt als ungültig (`ergaenze`); Einträge in `betriebe`, die kein Objekt sind, und Läden ohne Kennung werden nicht als Phantom-Laden angelegt, sondern gezählt; Namen von Gericht und Ware höchstens 80 Zeichen (gekürzt und gezählt; Waren-Namen bleiben eindeutig durch „~2“, Zutaten und Inventuren folgen); `teamTage[].eintraege[].stunden` ist eine Zahl ≥ 0, sonst 0 und gezählt.

