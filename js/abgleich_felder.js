// Abgleich zweier Handys für Felder, die weder „Bereich“ (Stammdaten mit Zeitstempel, store.js BEREICHE) noch Journal (store.js JOURNALE) sind.
// Vor Lauf 6 blieb bei diesen Feldern einfach der Stand des eigenen Handys stehen – Stunden, Schichten und Abwesenheiten des anderen
// Handys gingen still verloren (Audit P2 A1). Regel jetzt: nichts geht verloren, beide Handys kommen zum selben Ergebnis, egal wer zuerst einliest.
// Jedes Feld hat genau ein Verfahren. tests/abgleich_felder.test.mjs prüft, dass JEDES Feld eines Ladens ein Verfahren hat (Registertest).
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
// Einzelwert mit Zeit: der jüngere gewinnt; ohne Zeit auf beiden Seiten bleibt der eigene, außer er ist leer.
function juengererWert(lokal, fremd) {
  if (!istObjekt(fremd)) return istObjekt(lokal) ? structuredClone(lokal) : lokal;
  if (!istObjekt(lokal)) return structuredClone(fremd);
  const zl = String(lokal.geaendert ?? ""), zf = String(fremd.geaendert ?? "");
  return structuredClone(zf > zl ? fremd : lokal); // gleiche Zeit: der eigene bleibt
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
  liquiditaet: (a, b) => { if (!istObjekt(b)) return a ?? null; if (!istObjekt(a)) return structuredClone(b); return structuredClone(String(b.datum ?? "") > String(a.datum ?? "") ? b : a); }, // „Geld heute“: der jüngere Tag gilt
};
export function felderVerschmelzen(basis, lokal, fremd) {
  for (const [feld, f] of Object.entries(FELD_ABGLEICH)) {
    if (lokal[feld] === undefined && fremd[feld] === undefined) continue;
    const r = f(lokal[feld], fremd[feld], lokal, fremd); if (r === undefined) delete basis[feld]; else basis[feld] = r;
  }
  return basis;
}
