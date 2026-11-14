// Große Sprachdaten, die nur eine andere Sprache als Deutsch braucht: Waren- und Gerichtnamen (data/namen_mehr.js, 300 KB) und
// Zeki-Sätze in den 15 weiteren Sprachen (data/zeki_mehrsprachig.js, 140 KB). Im Browser kommen sie erst mit der gewählten Sprache
// (ladeSprache in i18n.js ruft sprachdatenLaden); wer lesen will, nimmt DATEN.<Name> zum Zeitpunkt des Lesens, nie beim Import.
// In Node (Tests, Werkzeuge) sind sie nach dem Import sofort da.
import { imBrowser } from "./adapter/umgebung.js";

export const DATEN = { NAMEN_MEHR: {}, GERICHT_TR_EN: {}, ZEKI_SAETZE_MEHR: {}, ZEKI_FRAGEN_MEHR: {} };
let namen = null, zeki = null;
const namenLaden = () => (namen ||= import("./data/namen_mehr.js").then((m) => { DATEN.NAMEN_MEHR = m.NAMEN_MEHR; DATEN.GERICHT_TR_EN = m.GERICHT_TR_EN; }, (e) => { namen = null; throw e; }));
const zekiLaden = () => (zeki ||= import("./data/zeki_mehrsprachig.js").then((m) => { DATEN.ZEKI_SAETZE_MEHR = m.ZEKI_SAETZE_MEHR; DATEN.ZEKI_FRAGEN_MEHR = m.ZEKI_FRAGEN_MEHR; }, (e) => { zeki = null; throw e; }));

// Deutsch braucht beides nicht; Türkisch und Englisch brauchen die Namen (Vorlagen), die 15 weiteren Sprachen Namen und Zeki-Sätze.
export async function sprachdatenLaden(code) {
  if (!code || code === "de") return;
  await namenLaden();
  if (code !== "tr" && code !== "en") await zekiLaden();
}
if (!imBrowser) await Promise.all([namenLaden(), zekiLaden()]);
