// Fachwerte in Texten: Platzhalter {regel_id} (z. B. {gwg_grenze}, {bussgeld_sofortmeldung}) werden beim Anzeigen aus dem Regelwerk gefüllt
// (js/data/regelwerk.js, Wert nach Tag). Zahlenformat deutsch über fmtZahl (Tausenderpunkt, Dezimalkomma). Kein Fachwert steht in diesem Text.
//   {id}        Zahl: ganze Zahl ohne, sonst mit zwei Nachkommastellen (Tausenderpunkt, Dezimalkomma)
//   {id_pct}    Anteil in Prozent ohne Zeichen (0,32 → „32“, 0,0104 → „1,04“)
//   {id|fa}     wie {id}, mit persischen Ziffern (Sprache fa schreibt Ziffern so)
//   {id|en}     wie {id}, im englischen Format (24,500 – nur wo der englische Text so stand)
//   {belehrung_jahre}  abgeleitet: belehrung_monate ÷ 12;  {rundfunk_stufe_bis}  abgeleitet: rundfunk_stufe_ab − 1
// Unbekannte Platzhalter bleiben stehen (andere Texte nutzen {n}, {grenze} usw. selbst).
import { REGELN, regel } from "./data/regelwerk.js";
import { fmtZahl, heute } from "./util.js";

const PERSISCH = "۰۱۲۳۴۵۶۷۸۹";
const persischeZiffern = (s) => String(s).replace(/\d/g, (d) => PERSISCH[d]);
const zahl = (n) => (Number.isInteger(n) ? fmtZahl(n, 0) : fmtZahl(n, 2));
const prozent = (n) => { const p = Math.round(n * 1e4) / 100; return Number.isInteger(p) ? fmtZahl(p, 0) : fmtZahl(p, 2); };
const TAG = /^\d{4}-\d{2}-\d{2}$/;

const enZahl = (n) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, minimumFractionDigits: Number.isInteger(n) ? 0 : 2 }).format(n);
const cache = new Map();
// Alle Platzhalter-Texte für einen Tag: { id: "800", id_pct: "32", … }
function regelZahlen(tag = heute()) {
  const t = TAG.test(tag) ? tag : heute();
  let z = cache.get(t); if (z) return z;
  z = {};
  for (const id of Object.keys(REGELN)) {
    const w = regel(id, t).wert; if (typeof w !== "number") continue;
    z[id] = zahl(w); z[id + "_pct"] = prozent(w); z[id + "|en"] = enZahl(w);
  }
  z.belehrung_jahre = zahl(regel("belehrung_monate", t).wert / 12);
  z.rundfunk_stufe_bis = zahl(regel("rundfunk_stufe_ab", t).wert - 1);
  cache.set(t, z); return z;
}
// Text füllen. tag: JJJJ-MM-TT (Standard: heute). Ohne „{“ im Text kostet das nichts.
export function fuelleRegeln(text, tag) {
  if (typeof text !== "string" || !text.includes("{")) return text;
  const z = regelZahlen(tag);
  return text.replace(/\{([a-z0-9_]+)(\|fa|\|en)?\}/g, (m, k, mod) => (mod === "|en" ? (z[k + mod] ?? m) : k in z ? (mod ? persischeZiffern(z[k]) : z[k]) : m));
}
