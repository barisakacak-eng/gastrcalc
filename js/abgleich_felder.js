// Abgleich zweier Handys für Felder, die weder „Bereich“ (Stammdaten mit Zeitstempel, store.js BEREICHE) noch Journal (store.js JOURNALE) sind.
// Vor Lauf 6 blieb bei diesen Feldern einfach der Stand des eigenen Handys stehen – Stunden, Schichten und Abwesenheiten des anderen
// Handys gingen still verloren (Audit P2 A1). Regel jetzt: nichts geht verloren, beide Handys kommen zum selben Ergebnis, egal wer zuerst einliest.
// Jedes Feld hat genau ein Verfahren. tests/abgleich_felder.test.mjs prüft, dass JEDES Feld eines Ladens ein Verfahren hat (Registertest).
import { gueltigerTag } from "./zeit.js";
const istObjekt = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const text = (x) => JSON.stringify(x, Object.keys(x).sort());
// Zwei Protokoll-Listen vereinigen: gleicher Inhalt zählt einmal, Reihenfolge nach Zeit (danach nach Inhalt, damit sie auf beiden Handys gleich ist).
// Die App liest bei diesen Listen „der letzte Eintrag je Tag/Monat gilt“ – durch die Zeit-Reihenfolge gilt auf beiden Handys derselbe.
function protokoll(a, b, zeit) {
  const m = new Map();
  for (const x of [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]) if (istObjekt(x)) { const k = text(x); if (!m.has(k)) m.set(k, structuredClone(x)); }
  return [...m.entries()].sort(([ka, xa], [kb, xb]) => { const za = String(zeit(xa) ?? ""), zb = String(zeit(xb) ?? ""); return za < zb ? -1 : za > zb ? 1 : ka < kb ? -1 : ka > kb ? 1 : 0; }).map(([, x]) => x);
}
// Schichten: gleiche Schicht (Tag, Person, Beginn, Ende, Zeitpunkt der Eingabe) zählt einmal; „zurückgenommen“ gewinnt.
// Die Kennung wird aus dem Inhalt neu gebildet – die alte Kennung zählte nur die Länge der Liste und war auf zwei Handys gleich.
// Danach gilt je Tag und Person nur die jüngste Eingabe, ältere werden zurückgenommen (dieselbe Regel wie beim Eintragen).
export const schichtKennung = (x) => `s-${x.datum}-${x.person}-${String(x.erfasst).replace(/[^0-9]/g, "")}`;
function schichten(a, b) {
  const m = new Map();
  for (const x of [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]) {
    if (!istObjekt(x) || typeof x.datum !== "string") continue;
    const k = [x.datum, x.person, x.von, x.bis, x.erfasst].join("|"); const da = m.get(k);
    if (!da) m.set(k, { ...structuredClone(x), id: schichtKennung(x) });
    else if (x.storniert && (!da.storniert || String(x.storniert) < String(da.storniert))) da.storniert = x.storniert;
  }
  const liste = [...m.values()].sort((x, y) => (String(x.erfasst) < String(y.erfasst) ? -1 : String(x.erfasst) > String(y.erfasst) ? 1 : x.id < y.id ? -1 : 1));
  const juengste = new Map(); for (const x of liste) if (!x.storniert) juengste.set(x.datum + "|" + x.person, x);
  for (const x of liste) if (!x.storniert && juengste.get(x.datum + "|" + x.person) !== x) x.storniert = juengste.get(x.datum + "|" + x.person).erfasst;
  return liste;
}
// Einzelwert mit Zeit: der jüngere gewinnt; bei gleicher Zeit (E11, B2) der größere Inhalt – auf beiden Handys derselbe (früher blieb „der eigene“ und die Handys blieben verschieden).
function juengererWert(lokal, fremd) {
  if (!istObjekt(fremd)) return istObjekt(lokal) ? structuredClone(lokal) : lokal;
  if (!istObjekt(lokal)) return structuredClone(fremd);
  const zl = String(lokal.geaendert ?? ""), zf = String(fremd.geaendert ?? "");
  if (zf !== zl) return structuredClone(zf > zl ? fremd : lokal);
  return structuredClone(text(fremd) > text(lokal) ? fremd : lokal);
}
// „Geld heute“ (E11, B2): der jüngere Tag gilt; am selben Tag die spätere Erfassungszeit (`erfasst`, ISO) – auf beiden Handys dasselbe. Fehlt die Zeit (alte Daten) oder ist sie gleich,
// gilt vorsichtig der kleinere Betrag (auf beiden Handys derselbe). Haben beide am selben Tag verschiedene Beträge, steht das im Bericht (`unterschiede`, Bereich „liquiditaet“).
function geldHeute(a, b, _lokal, _fremd, bericht) {
  if (!istObjekt(b)) return a ?? null; if (!istObjekt(a)) return structuredClone(b);
  const da = String(a.datum ?? ""), db = String(b.datum ?? "");
  if (da !== db) return structuredClone(db > da ? b : a);
  if (a.betrag === b.betrag) return structuredClone(String(b.erfasst ?? "") > String(a.erfasst ?? "") ? b : a);
  const ea = String(a.erfasst ?? ""), eb = String(b.erfasst ?? "");
  const sieger = ea !== eb ? (eb > ea ? b : a) : ((Number(b.betrag) < Number(a.betrag)) ? b : a);
  if (bericht) bericht.unterschiede.push({ bereich: "liquiditaet", lokal: `betrag ${a.betrag}`, fremd: `betrag ${b.betrag}`, gilt: sieger === b ? "fremd" : "lokal" });
  return structuredClone(sieger);
}

// Feld → Verfahren (lokal, fremd) → Ergebnis. Fehlt ein Feld auf beiden Seiten, bleibt es weg.
export const FELD_ABGLEICH = {
  teamTage: (a, b) => protokoll(a, b, (x) => x.erfasst || x.datum),       // „Waren heute Mitarbeiter da?“ – je Tag gilt der jüngste Eintrag
  lieferTage: (a, b) => protokoll(a, b, (x) => x.erfasst || x.datum),     // „davon Lieferdienst“ – je Tag gilt der jüngste Eintrag
  abwesend: (a, b) => protokoll(a, b, (x) => x.erfasst || x.datum || x.monat), // Urlaub/krank je Monat – der jüngste Eintrag gilt
  preisRunden: (a, b) => protokoll(a, b, (x) => x.datum),                 // Preisänderungen (für „Gespart“)
  // Zeki-Verlauf (gedeckelt wie beim Anhängen). Hat ein Handy den Verlauf gelöscht (Datenschutz), kommen ältere Einträge nicht zurück.
  zekiLog: (a, b, lokal, fremd) => { const g = [lokal?.zekiLogGeloescht, fremd?.zekiLogGeloescht].filter((x) => typeof x === "string").sort().pop() || ""; return protokoll(a, b, (x) => x.t).filter((x) => String(x.t ?? "") > g).slice(-1000); },
  zekiLogGeloescht: (a, b) => [a, b].filter((x) => typeof x === "string").sort().pop(),
  schichten,
  chef: juengererWert,                                                    // Stunden des Chefs im Monat
  // Version der eingespielten Branchenwerte: die kleinere gilt – das Handy mit der älteren Version spielt die neuen Werte beim Start noch einmal ein
  // (sie ersetzen nur Schätzungen, eigene Werte bleiben); so geht keine Branchenwert-Änderung verloren.
  branchenVersion: (a, b) => { const n = Math.min(Number(a) || 0, Number(b) || 0); return n > 0 ? n : undefined; },
  liquiditaet: geldHeute, // „Geld heute“: der jüngere Tag gilt, am selben Tag die spätere Erfassung
};
export function felderVerschmelzen(basis, lokal, fremd, bericht = null) {
  for (const [feld, f] of Object.entries(FELD_ABGLEICH)) {
    if (lokal[feld] === undefined && fremd[feld] === undefined) continue;
    const r = f(lokal[feld], fremd[feld], lokal, fremd, bericht); if (r === undefined) delete basis[feld]; else basis[feld] = r;
  }
  return basis;
}

// ---------- Felder ohne Abgleich, mit Grund (Lauf 6, E5, A1-Registertest) ----------
// Jedes Feld eines Ladens hat GENAU EIN Verfahren: Bereich (store.js BEREICHE), Journal (store.js JOURNALE), FELD_ABGLEICH (oben),
// eine eigene Regel in `verschmelzen` (IN_VERSCHMELZEN) oder es bleibt bewusst am eigenen Handy (NUR_LOKAL, mit Grund).
// tests/lauf6_e5_daten.test.mjs zählt alle Felder eines voll benutzten Ladens auf und wird rot, wenn eines in keiner Liste steht.
export const IN_VERSCHMELZEN = {
  geaendert: "jüngere der beiden Zeiten (gekappt), in verschmelzen",
  phase: "app gewinnt: ist ein Handy schon eingerichtet, gilt das, in verschmelzen",
  rueckkehr: "wird mit phase zurückgesetzt, in verschmelzen",
  stammZeit: "Zeitstempel je Bereich, folgt dem Sieger-Bereich, in verschmelzen",
  abgleich: "Merkzettel des Abgleichs je Bereich (abgleichMerken), in verschmelzen",
  abgleichHinweis: "Hinweis im Büro, wird in verschmelzen fortgeschrieben",
  feldZeit: "Änderungszeit je Feld (ms), je Pfad die spätere, nur lebende Pfade, in zeitenVereinen (E11, B1)",
  monatsabschluesse: "monatsabschluesseVereinigen: gleicher Abschluss einmal, der frühere gilt, in verschmelzen",
};
export const NUR_LOKAL = {
  id: "Kennung des Ladens: auf beiden Handys gleich, sonst wären es zwei Läden",
  angelegt: "Anlagezeit des Ladens: auf beiden Handys gleich",
  schritt: "Position in der Einrichtung dieses Handys, kein Datenbestand",
  schrittId: "wie schritt: Bildschirm der Einrichtung auf diesem Handy",
  weg: "Einrichtungsweg (schnell/genau) dieses Handys; die Einrichtung ist mit phase abgeglichen",
  schnellErgebnis: "Zwischenstand der Schnell-Einrichtung auf diesem Handy, wird nach der Einrichtung gelöscht",
  karteWeg: "Wunsch „Aus Vorlagen wählen“ bis zum Ende der Einrichtung dieses Handys",
  pinFestlegen: "Merker: auf diesem Handy muss noch ein Büro-Code gesetzt werden",
  einrichtungFertig: "Einrichtung dieses Handys abgeschlossen; die Daten kommen über phase und die Bereiche",
  branchenMeldung: "Meldung „Branchenwerte geändert“ für diesen Laden auf diesem Handy, wird quittiert",
  branchenUndo: "Rückgängig-Merker der Branchenwerte auf diesem Handy",
  waageVorschlag: "Tag, an dem dieses Handy den Waage-Vorschlag gesehen hat",
  neuAus: "Hinweis „Neu seit …“ gesehen auf diesem Handy",
  fuehrung: "Stand der Führung (Rundgang durch die App) auf diesem Handy",
  beispiel: "Beispiel-Laden: Merkmal bleibt am Laden, der Laden wird nie abgeglichen",
  ladeFehler: "Lade-Probleme dieses Handys (Wurzel, nicht Laden)",
};
export const FELD_VERFAHREN = (feld) => (feld in FELD_ABGLEICH ? "feld" : feld in IN_VERSCHMELZEN ? "verschmelzen" : feld in NUR_LOKAL ? "lokal" : null);

// ---------- Grobe Prüfung beim Laden und Einlesen (Audit C5) ----------
// Kaputte Einträge (zum Beispiel teamTage: [{ datum: 5 }]) werden verworfen statt später einen TypeError in der Anzeige zu werfen.
// Gültige Einträge bleiben unverändert (dasselbe Objekt, dieselbe Reihenfolge) – die Rundreise ändert nichts.
// zaehle(n) bekommt die Zahl verworfener Einträge (bericht.ungueltig).
const zahl01 = (x, max = 1e7) => typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= max;
const MONAT_RE = /^\d{4}-\d{2}$/;
const pruefungen = {
  teamTage: (x) => gueltigerTag(x.datum) && Array.isArray(x.eintraege),
  lieferTage: (x) => gueltigerTag(x.datum) && zahl01(x.betrag),
  abwesend: (x) => typeof x.monat === "string" && MONAT_RE.test(x.monat) && Array.isArray(x.eintraege),
  preisRunden: (x) => gueltigerTag(x.datum),
  zekiLog: (x) => typeof x.t === "string",
  schichten: (x) => gueltigerTag(x.datum),
};
export function felderSauber(b, zaehle = () => {}) {
  if (!istObjekt(b)) return b;
  for (const [feld, ok] of Object.entries(pruefungen)) {
    if (b[feld] === undefined) continue;
    if (!Array.isArray(b[feld])) { zaehle(1); delete b[feld]; continue; }
    const liste = b[feld].filter((x) => { const gut = istObjekt(x) && ok(x); if (!gut) zaehle(1); return gut; });
    if (feld === "teamTage" || feld === "abwesend") for (const x of liste) if (x.eintraege.some((e) => !istObjekt(e))) { zaehle(x.eintraege.filter((e) => !istObjekt(e)).length); x.eintraege = x.eintraege.filter(istObjekt); }
    if (feld === "teamTage") for (const x of liste) for (const e of x.eintraege) if (!zahl01(e.stunden)) { zaehle(1); e.stunden = 0; } // E11 (C5): Stunden sind eine Zahl ≥ 0, sonst 0 und gezählt
    if (liste.length !== b[feld].length) b[feld] = liste;
  }
  if (b.chef !== undefined && !istObjekt(b.chef)) { zaehle(1); delete b.chef; }
  if (b.liquiditaet !== undefined && b.liquiditaet !== null && !(istObjekt(b.liquiditaet) && Number.isFinite(b.liquiditaet.betrag) && typeof b.liquiditaet.datum === "string")) { zaehle(1); delete b.liquiditaet; }
  if (b.zekiLogGeloescht !== undefined && typeof b.zekiLogGeloescht !== "string") delete b.zekiLogGeloescht;
  return b;
}
