// Feiertage (18.10.2026): gesetzliche Feiertage in Deutschland – für Liefertermine (Lieferanten liefern an Feiertagen nicht) und, wenn der Wirt es
// so einstellt, für Tage, an denen der Laden zu hat. Reine Funktionen, keine Oberfläche, kein Netz. Start nur in Deutschland.
//
// Feiertagsrecht ist Ländersache; bundesrechtlich festgelegt ist nur der 3. Oktober (Einigungsvertrag Art. 2 Abs. 2).
// Quelle: Bundesministerium des Innern, „Nationale Feiertage“, https://www.bmi.bund.de/DE/themen/verfassung/staatliche-symbole/nationale-feiertage/nationale-feiertage-node.html
// (abgerufen 18.10.2026). Die übrigen acht Tage in „BUNDESWEIT“ (Neujahr, Karfreitag, Ostermontag, 1. Mai, Christi Himmelfahrt, Pfingstmontag,
// 1. und 2. Weihnachtstag) sind in allen Ländern gesetzliche Feiertage (Vorgabe des Auftrags; gegengeprüft an den drei Landesquellen unten, in denen
// alle acht stehen). Für ein Land ohne Prüfung gelten nur diese neun Tage – lieber ein Feiertag zu wenig als ein erfundener.
//
// Landesweite Feiertage – nur, was gegen eine amtliche Quelle geprüft ist (Abruf 18.10.2026):
//   BW  Innenministerium Baden-Württemberg, „Feiertage“, https://im.baden-wuerttemberg.de/de/service/feiertage
//       (Feiertagsgesetz BW): zusätzlich Erscheinungsfest (6.1.), Fronleichnam, Allerheiligen (1.11.).
//   BY  Bayerisches Feiertagsgesetz Art. 1 Abs. 1 Nr. 1, https://www.gesetze-bayern.de/Content/Document/BayFTG-1: zusätzlich Heilige Drei Könige (6.1.),
//       Fronleichnam, Allerheiligen. Mariä Himmelfahrt (15.8.) gilt nur in Gemeinden mit überwiegend katholischer Bevölkerung (Nr. 2), das Friedensfest
//       (8.8.) nur in Augsburg (Abs. 2) – beides nicht landesweit, darum NICHT in der Liste (die App kennt die Gemeinde nicht).
//   NW  Feiertagsgesetz NW § 2 Abs. 1, https://recht.nrw.de/lrgv/gesetz/01012000-bekanntmachung-der-neufassung-des-gesetzes-ueber-die-sonn-und-feiertage/
//       (Fassung ab 01.01.2000, § 2 Abs. 1 zuletzt geändert 1994): zusätzlich Fronleichnam, Allerheiligen.
//   Die anderen 13 Länder: nicht geprüft (Landesportale ohne abrufbaren Gesetzestext) → nur bundesweit. Nachtragen erst mit amtlicher Quelle.
// Sonntage (Ostersonntag, Pfingstsonntag) stehen nicht in der Liste: sie sind ohnehin Sonntage.

// Ostersonntag nach Gauß in der Fassung von Meeus („Astronomical Algorithms“, Anonymous Gregorian algorithm), gregorianischer Kalender.
export function ostersonntag(jahr) {
  const a = jahr % 19, b = Math.floor(jahr / 100), c = jahr % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monat = Math.floor((h + l - 7 * m + 114) / 31), tag = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(jahr, monat, tag);
}
const z2 = (n) => String(n).padStart(2, "0");
const iso = (j, m, d) => `${j}-${z2(m)}-${z2(d)}`;
// Tage rechnen in UTC – unabhängig von Zeitzone und Sommerzeit des Geräts
const plusTage = (tag, n) => { const [j, m, d] = tag.split("-").map(Number); const x = new Date(Date.UTC(j, m - 1, d + n)); return iso(x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate()); };

// Schlüssel = Text in js/lang/*.js (feiertage.<schluessel>)
export const BUNDESWEIT = ["neujahr", "karfreitag", "ostermontag", "maifeiertag", "himmelfahrt", "pfingstmontag", "einheit", "weihnachten1", "weihnachten2"];
export const LAND_FEIERTAGE = {
  BW: ["dreikoenige", "fronleichnam", "allerheiligen"],
  BY: ["dreikoenige", "fronleichnam", "allerheiligen"],
  NW: ["fronleichnam", "allerheiligen"],
};
// Alle 16 Länder (Kürzel nach ISO 3166-2:DE); geprueft = landesweite Feiertage hinterlegt. Die Namen sind Eigennamen und bleiben deutsch.
export const BUNDESLAENDER = [
  ["BW", "Baden-Württemberg"], ["BY", "Bayern"], ["BE", "Berlin"], ["BB", "Brandenburg"], ["HB", "Bremen"], ["HH", "Hamburg"], ["HE", "Hessen"],
  ["MV", "Mecklenburg-Vorpommern"], ["NI", "Niedersachsen"], ["NW", "Nordrhein-Westfalen"], ["RP", "Rheinland-Pfalz"], ["SL", "Saarland"],
  ["SN", "Sachsen"], ["ST", "Sachsen-Anhalt"], ["SH", "Schleswig-Holstein"], ["TH", "Thüringen"],
].map(([code, name]) => ({ code, name, geprueft: !!LAND_FEIERTAGE[code] }));
export const LAND_CODES = BUNDESLAENDER.map((l) => l.code);
export const landGeprueft = (code) => !!LAND_FEIERTAGE[code];

function tageImJahr(jahr) {
  const o = ostersonntag(jahr);
  return { neujahr: iso(jahr, 1, 1), dreikoenige: iso(jahr, 1, 6), karfreitag: plusTage(o, -2), ostermontag: plusTage(o, 1), maifeiertag: iso(jahr, 5, 1),
    himmelfahrt: plusTage(o, 39), pfingstmontag: plusTage(o, 50), fronleichnam: plusTage(o, 60), einheit: iso(jahr, 10, 3), allerheiligen: iso(jahr, 11, 1),
    weihnachten1: iso(jahr, 12, 25), weihnachten2: iso(jahr, 12, 26) };
}
const cache = new Map();
// Feiertage eines Jahres: [{ datum, schluessel }] nach Datum; land = Kürzel oder null (nur bundesweit)
export function feiertageJahr(jahr, land = null) {
  const k = jahr + "|" + (land || ""); if (cache.has(k)) return cache.get(k);
  const t = tageImJahr(jahr); const liste = [...BUNDESWEIT, ...(LAND_FEIERTAGE[land] || [])].map((schluessel) => ({ datum: t[schluessel], schluessel })).sort((a, b) => a.datum.localeCompare(b.datum));
  cache.set(k, liste); return liste;
}
// Feiertag an diesem Tag? Schlüssel oder null
export function feiertagAm(tag, land = null) {
  if (typeof tag !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(tag)) return null;
  return feiertageJahr(Number(tag.slice(0, 4)), land).find((f) => f.datum === tag)?.schluessel || null;
}
// Aus dem Laden: Bundesland (Einstellung im Büro „Lieferanten“) und ob der Laden an Feiertagen offen hat (Standard: wie ein normaler Wochentag)
export const ladenLand = (stand) => (LAND_CODES.includes(stand?.betrieb?.bundesland) ? stand.betrieb.bundesland : null);
export const feiertagOffen = (stand) => stand?.betrieb?.feiertagOffen !== false;
export const feiertagImLaden = (stand, tag) => feiertagAm(tag, ladenLand(stand));
// Hat der Laden an diesem Tag wegen eines Feiertags zu? (nur, wenn der Wirt „an Feiertagen zu“ gewählt hat)
export const feiertagZu = (stand, tag) => !feiertagOffen(stand) && !!feiertagImLaden(stand, tag);
// Einstellung schreiben: feld "land" (Kürzel | null) oder "offen" (true/false). Rückgabe: geändert?
export function feiertagSetzen(stand, feld, wert) {
  stand.betrieb ??= {};
  if (feld === "land") { const v = LAND_CODES.includes(wert) ? wert : null; if ((stand.betrieb.bundesland ?? null) === v) return false; if (v) stand.betrieb.bundesland = v; else delete stand.betrieb.bundesland; return true; }
  if (feld === "offen") { const v = wert !== false; if (feiertagOffen(stand) === v) return false; if (v) delete stand.betrieb.feiertagOffen; else stand.betrieb.feiertagOffen = false; return true; }
  return false;
}
// Nächster Feiertag ab diesem Tag (einschließlich), höchstens ein Jahr voraus: { datum, schluessel } | null
export function naechsterFeiertag(stand, ab) {
  if (typeof ab !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(ab)) return null; const j = Number(ab.slice(0, 4)); const land = ladenLand(stand);
  return [...feiertageJahr(j, land), ...feiertageJahr(j + 1, land)].find((f) => f.datum >= ab) || null;
}
