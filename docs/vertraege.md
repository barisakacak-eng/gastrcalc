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
