// Sprachtabelle. Deutsch ist die Leitsprache; fehlt ein Schlüssel in einer Sprache, fällt die App auf Deutsch zurück.
import de from "./lang/de.js";
import tr from "./lang/tr.js";
import en from "./lang/en.js";

const TABELLEN = { de, tr, en };
export const SPRACHEN = ["de", "tr", "en"];
let aktiv = "de";

export function setzeSprache(code) {
  aktiv = TABELLEN[code] ? code : "de";
  document.documentElement.lang = aktiv;
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
