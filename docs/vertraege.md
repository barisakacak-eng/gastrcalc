# Datenverträge GastroCash (Stand 23.10.2026, Zoro)

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
  geprueft:  boolean               // true erst nach Quellenprüfung durch Zoro; die App zeigt nur geprüfte Karten
}
```

Regeln:
- `hinweiseFuer(stand)` liefert nur Karten mit `geprueft: true`, deren Auslöser zutrifft und deren Status nicht „erledigt“ ist. `{ nurGeprueft: false }` liefert alle (für Tests und Entwürfe).
- Auslöser kommen nur aus vorhandenen App-Daten: `mitarbeiter > 0`, `personalessen vorhanden`, `menue vorhanden` (gelernte Kassen-Menüs), `inventur vorhanden`, `tagesabschluesse >= 5`, `beleg mit Stichwort`, sonst „manuell“.
- Status liegt in `stand.hinweise = [{ id, status, zeit }]` (Bereich `betrieb`, wird beim Zusammenführen vereinigt, jüngste Zeit gewinnt). Schreiben nur über `hinweisStatusSetzen(stand, id, status)`.
- Pflichtzeile in der Oberfläche: „Allgemeiner Hinweis, keine Steuerberatung – mit deinem Steuerberater klären.“
- Inhalt kommt aus Frankys Register; jede Karte wird vor `geprueft: true` von Zoro an der Primärquelle geprüft (Quellenprüfung 24.10.2026).

## 3. Verboten in beiden Verträgen
Wörter: rechtssicher, steuersicher, betriebsprüfungsfest, GoBD-konform, revolutionär, disruptiv, Marktführer, KI-Steuerberater. Erfundene Beträge. Rechenregeln außerhalb des Rechenwerks.
