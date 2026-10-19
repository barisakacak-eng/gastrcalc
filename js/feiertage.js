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
//   BE  Senatsverwaltung für Inneres, „Sonn- und Feiertagsrecht“ (Liste nach § 1 FTG Berlin), https://www.berlin.de/sen/inneres/buerger-und-staat/verfassungs-und-verwaltungsrecht/artikel.1435639.php:
//       zusätzlich Internationaler Frauentag (8.3.). Der 8. Mai war nur in Einzeljahren Feiertag (kein Dauerdatum) → nicht in der Liste.
//   BB  Feiertagsgesetz Brandenburg (FTG) § 2 Abs. 1, https://bravors.brandenburg.de/gesetze/ftg_2015 (Gesetz vom 21.03.1991, zuletzt geändert 30.04.2015):
//       zusätzlich Reformationstag (31.10.).
//   HB  Gesetz zur Änderung des Gesetzes über die Sonn- und Feiertage vom 26.06.2018 (Brem.GBl. Nr. 63 vom 28.06.2018, § 2 Abs. 1 Buchst. j),
//       https://www.gesetzblatt.bremen.de/fastmedia/218/2018_06_28_GBl_Nr_0063_signed.pdf: zusätzlich Reformationstag.
//   HE  Hessisches Ministerium des Innern, „Gesetzliche Feiertage“, https://innen.hessen.de/buerger-staat/feiertage (Hessisches Feiertagsgesetz): zusätzlich Fronleichnam.
//   MV  Viertes Gesetz zur Änderung des Feiertagsgesetzes M-V vom 07.07.2022 (GVOBl. M-V Nr. 31/2022, § 2 Abs. 1 Nr. 2 „der Frauentag (8. März)“),
//       https://www.dokumentation.landtag-mv.de/parldok/dokument/53736/gesetz_und_verordnungsblatt_31_2022.pdf: zusätzlich Frauentag.
//       Reformationstag: Wortlaut des MV-Gesetzes nicht abrufbar; belegt über die Landtagsdrucksache Niedersachsen 18/827 (Gesetzentwurf
//       Reformationstag, S. 3: „In Mecklenburg-Vorpommern ist der 31. Oktober bereits ein gesetzlicher Feiertag.“), Abruf 18.10.2026 (Zoro).
//   NI  Niedersächsisches Ministerium für Inneres, „Feiertagsgesetz“ (NFeiertagsG § 2 Abs. 1, Fassung 07.03.1995, zuletzt geändert 22.06.2018),
//       https://www.mi.niedersachsen.de/startseite/themen/allgemeine_angelegenheiten_des_inneren/feiertagsrecht/feiertagsgesetz-61491.html: zusätzlich Reformationstag.
//   RP  Ministerium des Innern und für Sport RLP, „Sonn- und Feiertagsrecht“ (LFtG), https://mdi.rlp.de/themen/buerger-und-staat/verfassung-und-verwaltung/sonn-und-feiertagsrecht:
//       zusätzlich Fronleichnam, Allerheiligen.
//   SN  Gesetz über Sonn- und Feiertage im Freistaat Sachsen (SächsSFG) § 1 Abs. 1, https://revosax.sachsen.de/vorschrift_gesamt/3997.html (Stand 07.05.2025):
//       zusätzlich Reformationstag, Buß- und Bettag. Fronleichnam nur in per Rechtsverordnung bestimmten Regionen → nicht landesweit, NICHT in der Liste.
//       Das Gesetz nennt für den Buß- und Bettag kein Datum; gerechnet wird die übliche Regel „Mittwoch vor dem 23. November“ (Vorgabe des Auftrags).
//   SH  Schleswig-Holsteinischer Landtag, „Reformationstag wird zum Feiertag“ (Beschluss 22.02.2018, Änderung des Gesetzes über Sonn- und Feiertage, gilt ab 2018),
//       https://www.landtag.ltsh.de/nachrichten/18_02_feiertag/: zusätzlich Reformationstag.
//   TH  Thüringer Landtag, Drucksache 6/6163 vom 18.09.2018 (Drittes Gesetz zur Änderung des Thüringer Feier- und Gedenktagsgesetzes, § 2 Abs. 1 – Liste mit
//       Weltkindertag 20.9. und Reformationstag), https://parldok.thueringer-landtag.de/ParlDok/dokument/68329/...pdf: zusätzlich Weltkindertag, Reformationstag.
//       Fronleichnam steht nicht in § 2 Abs. 1 (nur regional) → nicht landesweit.
//   HH, SL, ST (19.10.2026, Zoro): Landesrecht-Portale sperren den Abruf; Wortlaut über die Gesetzestext-Sammlung umwelt-online.de (mit amtlicher
//       Fundstelle im Gesetzblatt), gegengeprüft mit Frankys Recherche vom 19.10.2026 (Gemini, gleiche Listen):
//   HH  Feiertagsgesetz Hamburg § 1 Nr. 8 „31. Oktober“ (Änderung vom 12.03.2018, HmbGVBl. S. 63),
//       https://umwelt-online.de/recht/arbeitss/arbeitsrecht/laender/hh/feiertg.htm: zusätzlich Reformationstag.
//   SL  Gesetz Nr. 1040 über die Sonn- und Feiertage (SFG) § 2 Abs. 1 (Amtsbl. 1976 S. 211, zuletzt geändert 13.10.2015 S. 790),
//       https://www.umwelt-online.de/recht/arbeitss/arbeitsrecht/laender/srl/feiertg.htm: zusätzlich Fronleichnam, Mariä Himmelfahrt (15.8.), Allerheiligen.
//   ST  FeiertG LSA § 2 (GVBl. 2004 S. 538, zuletzt geändert 04.05.2026 S. 178),
//       https://umwelt-online.de/recht/arbeitss/arbeitsrecht/laender/lsa/feiertg.htm: zusätzlich Heilige Drei Könige, Reformationstag.
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
  BE: ["frauentag"],
  BB: ["reformationstag"],
  HB: ["reformationstag"],
  HE: ["fronleichnam"],
  MV: ["frauentag", "reformationstag"],
  NI: ["reformationstag"],
  NW: ["fronleichnam", "allerheiligen"],
  RP: ["fronleichnam", "allerheiligen"],
  SN: ["reformationstag", "bussbettag"],
  SH: ["reformationstag"],
  TH: ["weltkindertag", "reformationstag"],
  HH: ["reformationstag"],
  SL: ["fronleichnam", "mariaehimmelfahrt", "allerheiligen"],
  ST: ["dreikoenige", "reformationstag"],
};
// Alle 16 Länder (Kürzel nach ISO 3166-2:DE); geprueft = landesweite Feiertage hinterlegt. Die Namen sind Eigennamen und bleiben deutsch.
export const BUNDESLAENDER = [
  ["BW", "Baden-Württemberg"], ["BY", "Bayern"], ["BE", "Berlin"], ["BB", "Brandenburg"], ["HB", "Bremen"], ["HH", "Hamburg"], ["HE", "Hessen"],
  ["MV", "Mecklenburg-Vorpommern"], ["NI", "Niedersachsen"], ["NW", "Nordrhein-Westfalen"], ["RP", "Rheinland-Pfalz"], ["SL", "Saarland"],
  ["SN", "Sachsen"], ["ST", "Sachsen-Anhalt"], ["SH", "Schleswig-Holstein"], ["TH", "Thüringen"],
].map(([code, name]) => ({ code, name, geprueft: !!LAND_FEIERTAGE[code] }));
export const LAND_CODES = BUNDESLAENDER.map((l) => l.code);
export const landGeprueft = (code) => !!LAND_FEIERTAGE[code];

// Buß- und Bettag: der Mittwoch vor dem 23. November (also zwischen 16. und 22. November)
export function bussBettag(jahr) {
  const wt = new Date(Date.UTC(jahr, 10, 22)).getUTCDay(); // 0 = So … 3 = Mi
  return iso(jahr, 11, 22 - ((wt - 3 + 7) % 7));
}
function tageImJahr(jahr) {
  const o = ostersonntag(jahr);
  return { neujahr: iso(jahr, 1, 1), dreikoenige: iso(jahr, 1, 6), frauentag: iso(jahr, 3, 8), karfreitag: plusTage(o, -2), ostermontag: plusTage(o, 1), maifeiertag: iso(jahr, 5, 1),
    himmelfahrt: plusTage(o, 39), pfingstmontag: plusTage(o, 50), fronleichnam: plusTage(o, 60), mariaehimmelfahrt: iso(jahr, 8, 15), weltkindertag: iso(jahr, 9, 20), einheit: iso(jahr, 10, 3),
    reformationstag: iso(jahr, 10, 31), allerheiligen: iso(jahr, 11, 1), bussbettag: bussBettag(jahr), weihnachten1: iso(jahr, 12, 25), weihnachten2: iso(jahr, 12, 26) };
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
