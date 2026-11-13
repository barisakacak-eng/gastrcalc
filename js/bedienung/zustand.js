// Der Zustand der Bedienschicht an EINER Stelle: was die App gerade zeigt, wer getippt hat, was auf eine Antwort wartet.
// Alle Dateien in js/bedienung/ und js/app.js lesen und setzen Z.<name>; es gibt keine verstreuten Modulvariablen.
// Die Daten des Ladens selbst (Wurzel, Läden) sind hier nur eingehängt (Z.wurzel, Z.stand) – geschrieben wird über das Rechenwerk.
// haken: Rückrufe, die js/app.js beim Start einträgt, damit tiefere Dateien nach oben rufen können, ohne einander zu importieren
// (sonst entstünde ein Importkreis; tests/importkreise.test.mjs).

export const Z = {
  // Anker und Daten
  root: typeof document !== "undefined" ? document.getElementById("app") : null, // der Bildschirm (#app)
  wurzel: null,            // alle Läden dieses Handys
  stand: null,             // der aktive Laden (ein Eintrag aus wurzel.betriebe)
  ansicht: "start",        // in Phase "app": start | karte | muell | kuehl | umsatz | listen | laeden | beleg | abschluss | einstellungen | inventur …
  herkunft: null,          // vorige Ansicht (für die Zurück-Geste aus Listen und Beleg)
  bueroWeg: [],            // besuchte Büro-Bildschirme, damit „Zurück“ eine Ebene zurück führt (höchstens 12)
  notfall: false,          // die Fehlerseite ist da (Rettung)
  // Zeichnen
  letzterSchirm: "",       // damit ein Neuzeichnen desselben Bildschirms die Scrollposition behält
  gezeichneterTag: null,   // Geschäftstag + Kalendertag des letzten Bildes (Tageswechsel, js/bedienhilfe.js)
  wechselt: false,         // Sperre gegen Doppeltipp auf Weiter / Kacheln der Einrichtung
  ereignisAnzahl: 0,       // Zähler für „Verlauf“ in den Einstellungen
  // Tippen (Doppeltipp-Schutz, js/bedienhilfe.js)
  ruheBis: 0, tippX: -99, tippY: -99, tippZeit: 0, tippEl: null, tippSchutz: false,
  eingabeNr: 0,            // zählt Tipps und Zurück (eine Meldung überlebt den Tipp, der sie auslöst)
  meldungUhr: null, meldungNr: -1,
  // Speichern, Sicherung, Update
  speicherProblem: null,   // "speichern" | "voll" | "fassung" | "ablage" – Banner
  einleseDatei: null, einleseErsetzen: false, rueckholInfo: null,
  dauerhaftVersucht: false,
  aktualisierung: null,    // wartender Service Worker (neue Fassung liegt bereit)
  aktualisierungKlick: false, fremdeFassung: false, swGestartet: false,
  offlineStand: "laedt",   // "laedt" | "bereit" | "keinSw"
  zuletztBedient: Date.now(),
  installAufforderung: null, // Android/Chrome: „beforeinstallprompt“ für den Knopf „Installieren“
  // Ebenen
  bueroOffenBis: 0, versteckt: 0, // Büro einmal aufgeschlossen = 15 Min. offen; nach > 5 Min. im Hintergrund wieder zu
  // Rundgang (Übungsmodus)
  uebung: null, uebungLog: [], rezeptVorher: null, rezeptNeu: null,
  // Eingabe und Zeki
  zeigerAufFeld: null,
  zekiGerade: null,        // { key, t }: die Blase, die gerade läuft
};

export const haken = {
  fuehrungStarten: null,   // js/bedienung/rundgang.js: Führung auf Heute starten (von zeichne aufgerufen)
};
