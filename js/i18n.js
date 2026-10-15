// Sprachtabelle. Deutsch ist die Leitsprache; fehlt ein Schlüssel in einer Sprache, fällt die App auf Deutsch zurück.
import de from "./lang/de.js";
import tr from "./lang/tr.js";
import en from "./lang/en.js";

// Deutsch, Türkisch, Englisch sind immer da (Leitsprache + mehrsprachige Hinweise beim Müll). Alle anderen werden erst geladen,
// wenn jemand sie wählt (15.10.2026: 18 Sprachen, die App bleibt trotzdem klein und schnell).
const TABELLEN = { de, tr, en };
export const SPRACH_NAMEN = { de: "Deutsch", tr: "Türkçe", en: "English", ar: "العربية", fa: "فارسی", ku: "Kurdî (Kurmancî)", pl: "Polski", ro: "Română", bg: "Български",
  ru: "Русский", uk: "Українська", sq: "Shqip", bs: "Bosanski · Hrvatski · Srpski", el: "Ελληνικά", it: "Italiano", es: "Español", fr: "Français", vi: "Tiếng Việt" };
export const NACHLADBAR = [];
export const SPRACHEN = ["de", "tr", "en", ...NACHLADBAR];
export const RTL = new Set(["ar", "fa"]);
let aktiv = "de";
export const spracheGeladen = (c) => !!TABELLEN[c];
export async function ladeSprache(code) {
  if (!TABELLEN[code] && NACHLADBAR.includes(code)) { try { TABELLEN[code] = (await import(`./lang/${code}.js`)).default; } catch (e) { console.warn("Sprache", code, e); } }
  return !!TABELLEN[code];
}
// Setzt die Sprache. Ist sie noch nicht geladen, wird sie geladen und danach `danach()` aufgerufen (neu zeichnen).
export function setzeSprache(code, danach) {
  if (!SPRACHEN.includes(code)) code = "de";
  if (!TABELLEN[code]) { ladeSprache(code).then((ok) => { if (ok) { setzeSprache(code); if (danach) danach(); } }); return; }
  aktiv = code;
  if (typeof document !== "undefined") { document.documentElement.lang = aktiv; document.documentElement.dir = RTL.has(aktiv) ? "rtl" : "ltr"; }
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
  return typeof v === "function" ? v(...args) : v;
}

// Alle Sprachen eines Schlüssels (für dreisprachige Kacheln): { de, tr, en }.
export function tAlle(pfad) { const out = {}; for (const c of SPRACHEN) { const v = hole(TABELLEN[c], pfad); out[c] = typeof v === "string" ? v : hole(de, pfad); } return out; }

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
export const einheitLabel = (e) => (e === "stk" ? t("allgemein.stueck") : e === "portion" ? t("tag.portionen") : (e || ""));
