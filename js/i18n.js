// Sprachtabelle. Deutsch ist die Leitsprache; fehlt ein Schlüssel in einer Sprache, fällt die App auf Deutsch zurück.
import de from "./lang/de.js";
import { sprachdatenLaden } from "./sprachdaten.js";
import { imBrowser } from "./adapter/umgebung.js";
import { artikelAnzeige, gerichtAnzeige, mengenName } from "./data/artikelnamen.js";
import { fuelleRegeln } from "./regeltext.js";
import { sprachAttribute } from "./adapter/seite.js";

// Deutsch ist immer da (Leitsprache und Rückfall). Jede andere Sprache – auch Türkisch und Englisch – wird im Browser erst geladen,
// wenn jemand sie wählt (ladeSprache); in Node (Tests, Werkzeuge) sind Türkisch und Englisch nach dem Import sofort da.
const TABELLEN = { de };
export const SPRACH_NAMEN = { de: "Deutsch", tr: "Türkçe", en: "English", ar: "العربية", fa: "فارسی", ku: "Kurdî (Kurmancî)", pl: "Polski", ro: "Română", bg: "Български",
  ru: "Русский", uk: "Українська", sq: "Shqip", bs: "Bosanski · Hrvatski · Srpski", el: "Ελληνικά", it: "Italiano", es: "Español", fr: "Français", vi: "Tiếng Việt" };
const WEITERE = ["ar", "fa", "ku", "pl", "ro", "bg", "ru", "uk", "sq", "bs", "el", "it", "es", "fr", "vi"];
const NACHLADBAR = ["tr", "en", ...WEITERE];
export const SPRACHEN = ["de", "tr", "en", ...WEITERE];
export const RTL = new Set(["ar", "fa"]);
// Masterauftrag „Gehirn“ 0.6: Sprachen ohne vollständige Prüfung tragen „Beta“ (de führend, tr/en vollständig gepflegt).
// Kein Muttersprachler hat bisher gegengelesen – das steht im Projektstand, nicht hier.
const SPRACHE_BETA = new Set(WEITERE);
export const spracheName = (c) => (SPRACH_NAMEN[c] || c) + (SPRACHE_BETA.has(c) ? " · Beta" : "");
let aktiv = "de";
export const spracheGeladen = (c) => !!TABELLEN[c];
export async function ladeSprache(code) {
  if (!TABELLEN[code] && NACHLADBAR.includes(code)) { try { TABELLEN[code] = (await import(`./lang/${code}.js`)).default; await sprachdatenLaden(code); } catch (e) { delete TABELLEN[code]; console.warn("Sprache", code, e); } }
  return !!TABELLEN[code];
}
if (!imBrowser) for (const c of ["tr", "en"]) await ladeSprache(c);
// Setzt die Sprache. Ist sie noch nicht geladen, wird sie geladen und danach `danach()` aufgerufen (neu zeichnen).
export function setzeSprache(code, danach) {
  if (!SPRACHEN.includes(code)) code = "de";
  if (!TABELLEN[code]) { ladeSprache(code).then((ok) => { if (ok) { setzeSprache(code); if (danach) danach(); } }); return; }
  aktiv = code;
  sprachAttribute(aktiv, RTL.has(aktiv));
  // (Laden-Test): auch bei schon geladener Sprache neu zeichnen – sonst blieb der Willkommen-Bildschirm deutsch,
  // und „Weiter“ (trägt die Sprache vom letzten Zeichnen) setzte auf Deutsch zurück.
  if (danach) danach();
}
export const sprache = () => aktiv;

function hole(tab, pfad) {
  let o = tab;
  for (const k of pfad.split(".")) { if (o == null) return undefined; o = o[k]; }
  return o;
}

// t("kosten.kategorien.miete") -> Wert aus der aktiven Sprache, sonst Deutsch, sonst der Schlüssel selbst.
export function t(pfad, ...args) {
  let v = hole(TABELLEN[aktiv], pfad);
  if (v === undefined) v = hole(de, pfad);
  if (v === undefined) return pfad;
  return fuelleRegeln(typeof v === "function" ? v(...args) : v); // Fachwerte stehen als {regel_id} im Text und kommen aus dem Regelwerk (js/regeltext.js)
}

// Menütafel: Text in einer bestimmten Sprache (die Sprache der Tafel, nicht die der App). Nicht geladen → Deutsch.
export function tIn(code, pfad, ...args) {
  let v = hole(TABELLEN[code] || de, pfad);
  if (v === undefined) v = hole(de, pfad);
  if (v === undefined) return pfad;
  return fuelleRegeln(typeof v === "function" ? v(...args) : v);
}

// Alle Sprachen eines Schlüssels (für dreisprachige Kacheln): { de, tr, en }.

// Selbstprüfung: fehlende Schlüssel je Sprache (für die Entwicklung, läuft in den Tests).
export function fehlendeSchluessel(code) {
  const out = [];
  const lauf = (ref, ziel, pfad) => {
    for (const k of Object.keys(ref)) {
      const p = pfad ? `${pfad}.${k}` : k;
      if (ziel == null || !(k in ziel)) { out.push(p); continue; }
      if (ref[k] && typeof ref[k] === "object" && !Array.isArray(ref[k])) lauf(ref[k], ziel[k], p);
    }
  };
  lauf(de, TABELLEN[code], "");
  return out;
}

// Einheiten-Beschriftung: "Stück" ist das einzige Wort, die Kürzel g/kg/ml/l sind in allen drei Sprachen gleich.
// Klasse D: Einheiten in der Schrift der Sprache (nur wo der Glossar es vorgibt; sonst g/kg/ml/l wie auf der Packung)
const EINHEIT_SCHRIFT = { ar: { g: "غ", kg: "كغ", ml: "مل", l: "ل" } };
export const einheitLabel = (e) => (e === "stk" ? t("allgemein.stueck") : e === "portion" ? t("tag.portionen") : (EINHEIT_SCHRIFT[aktiv]?.[e] ?? (e || ""))); // Klasse D: Arabisch „غ“ statt „g“

// Paket 6: Katalog-Artikelname in der aktiven Sprache – nur Anzeige, gespeichert bleibt der deutsche Name.
export const artikelText = (name) => artikelAnzeige(name, aktiv);
export const mengenText = (name) => mengenName(name, aktiv); // Mengenfrage: „Dönerfleisch“ statt „Dönerspieß“
export const gerichtText = (name) => gerichtAnzeige(name, aktiv); // Perfektionswoche: Vorlagen-Namen

// Persona-Test Team: Chromium kennt Kurmancî nicht und zeigte Datumstexte deutsch. Eigene Namen für ku, sonst Intl;
// fehlt einer Sprache die Intl-Unterstützung, lieber Englisch als Deutsch.
const KU_TAG = ["yekşem", "duşem", "sêşem", "çarşem", "pêncşem", "în", "şemî"];
const KU_MONAT = ["çile", "sibat", "adar", "nîsan", "gulan", "hezîran", "tîrmeh", "tebax", "îlon", "cotmeh", "mijdar", "berfanbar"];
export function datumText(d, opts = {}) {
  const l = aktiv === "en" ? "en-GB" : aktiv;
  if (aktiv === "ku") {
    const teile = [];
    if (opts.weekday) teile.push(opts.weekday === "short" ? KU_TAG[d.getDay()].slice(0, 3) : KU_TAG[d.getDay()]);
    const rest = [opts.day ? String(d.getDate()) : "", opts.month ? (opts.month === "short" ? KU_MONAT[d.getMonth()].slice(0, 3) : KU_MONAT[d.getMonth()]) : "", opts.year ? String(d.getFullYear()) : ""].filter(Boolean).join(" ");
    if (rest) teile.push(rest); return teile.join(", ");
  }
  try { return d.toLocaleDateString(Intl.DateTimeFormat.supportedLocalesOf([l]).length ? l : "en-GB", opts); } catch { return d.toLocaleDateString("en-GB", opts); }
}
