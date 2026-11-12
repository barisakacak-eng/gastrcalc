// Fuzz: Randwerte in Stand-Felder setzen, Rechenkern laufen lassen, NaN/Infinity/Ausnahmen zählen. Seed fest.
import { rng, pick, ri } from "./lib.mjs";
import { beispielLaden } from "../js/beispiel.js";
import { kalkulation, monatsLast, umsatzSteuerSatz, schwundAuswertung, wochenSoll } from "../js/engine.js";
import { zaehler, monatsZiel, warenQuote, tagAbschliessen } from "../js/zaehler.js";
import { heuteZiel } from "../js/laden_zahlen.js";
import { steuerTopf, wasBleibt, prueferBlick } from "../js/steuertopf.js";
import { mindestlohnVorschau } from "../js/mindestlohn.js";
import { monatsZahlen } from "../js/monatsabschluss.js";
import { hebelJeGericht, rennerPenner } from "../js/hebel.js";
import { preisRundeGericht } from "../js/preisrunde.js";

const H = "2026-11-10";
const DOMAIN = process.argv[2] || "gueltig"; // gueltig = was parseZahl durchlässt (>=0, <=1e7, null) | import = kaputte Sicherung (Text, NaN, negativ)
const WERTE = DOMAIN === "gueltig" ? [0, 0.01, 1, 1e7, 9999999.99, null, 0.0001, 100] : ["3,5", "abc", -1, NaN, Infinity, "", {}, undefined];
const FELDER = [
  (s) => [s.team, "personen"], (s) => [s.team, "stundenProPerson"], (s) => [s.team, "lohnkosten"], (s) => [s.team, "eigenerLohn"],
  (s) => [s.betrieb, "tageProWoche"], (s) => [s.betrieb, "monate"], (s) => [s.betrieb, "steuerSatz"],
  (s) => [s.verkauf, "zielgewinn"], (s) => [s.verkauf, "warenQuote"], (s) => [s.verkauf, "bestellungenTag"],
  (s) => [s.kosten[0], "betrag"], (s) => [s.kosten[1], "betrag"],
  (s) => [s.gerichte[0], "preis"], (s) => [s.gerichte[1], "preis"], (s) => [s.gerichte[0], "mengeTag"], (s) => [s.gerichte[0].zutaten[0], "menge"],
  (s) => [s.artikel[0], "preis"], (s) => [s.artikel[0].packung, "menge"], (s) => [s.tagesnotizen[3], "umsatz"], (s) => [s.tagesnotizen[5], "umsatz"],
];
const NAMEN = ["team.personen","team.stundenProPerson","team.lohnkosten","team.eigenerLohn","betrieb.tageProWoche","betrieb.monate","betrieb.steuerSatz","verkauf.zielgewinn","verkauf.warenQuote","verkauf.bestellungenTag","kosten0.betrag","kosten1.betrag","gericht0.preis","gericht1.preis","gericht0.mengeTag","zutat0.menge","artikel0.preis","artikel0.packung.menge","tagesnotiz3.umsatz","tagesnotiz5.umsatz"];
function scan(o, pfad, out, seen = new Set(), tiefe = 0) {
  if (typeof o === "number") { if (!Number.isFinite(o)) out.add(pfad.replace(/\.\d+\./g, ".#.").replace(/\.\d+$/g, ".#").replace(/\[\d+\]/g, "[]").replace(/\.\d{4}-\d{2}-\d{2}/g, ".<datum>")); return; }
  if (!o || typeof o !== "object" || typeof o === "function" || seen.has(o) || tiefe > 6) return; seen.add(o);
  for (const k of Object.keys(o)) scan(o[k], pfad + "." + k, out, seen, tiefe + 1);
}
const rechne = (s) => {
  const r = {}; r.kalk = kalkulation(s); const z = zaehler(s, { datum: H }); r.zaehler = { ...z, tage: z.tage, nettoVon: undefined, bleibtVon: undefined };
  r.ziel = monatsZiel(s, z, H); r.heute = heuteZiel(s, z, H); r.topf = steuerTopf(s, "2026-11"); r.wb = wasBleibt(s, "2026-11"); r.pb = prueferBlick(s, "2026-11");
  r.ml = mindestlohnVorschau(s, H); r.mz = monatsZahlen(s, "2026-11"); r.hebel = hebelJeGericht(s); r.rp = rennerPenner(s); r.pr = preisRundeGericht(s, s.gerichte[0].id, 8.5);
  r.sw = wochenSoll(s); r.sa = schwundAuswertung(s, { von: "2026-11-01", bis: H }); r.wq = warenQuote(s); return r;
};
const VORLAGE = beispielLaden("2026-11-11"); const N = 5000; const r = rng(20261111); const nan = {}; const exc = {}; const trig = {}; let n = 0, mitNaN = 0;
for (let i = 0; i < N; i++) {
  const s = structuredClone(VORLAGE); const gew = []; const k = ri(r, 1, 2);
  for (let j = 0; j < k; j++) { const f = ri(r, 0, FELDER.length - 1); const [o, key] = FELDER[f](s); const w = pick(r, WERTE); o[key] = w; gew.push(NAMEN[f] + "=" + String(typeof w === "object" ? JSON.stringify(w) : w)); }
  try { const out = new Set(); scan(rechne(s), "r", out); if (out.size) { mitNaN++; for (const g of gew) trig[g] = (trig[g] || 0) + 1; } for (const p of out) { nan[p] ??= { n: 0, bsp: gew.join(" & ") }; nan[p].n++; } }
  catch (e) { const key = e.message.slice(0, 70); exc[key] ??= { n: 0, bsp: gew.join(" & ") }; exc[key].n++; }
  n++;
}
console.log(`Bereich=${DOMAIN}, ${n} Fälle (Seed 20261111)`);
console.log("Ausnahmen:", Object.keys(exc).length ? "" : "keine");
for (const [k, v] of Object.entries(exc)) console.log(`  ${v.n}x ${k}   z. B. ${v.bsp}`);
console.log(`Fälle mit mindestens einem NaN/Infinity: ${mitNaN} von ${n}`); console.log("häufigste Auslöser (Feld=Wert, Zahl der Fälle mit NaN):"); for (const [k, v] of Object.entries(trig).sort((a, b) => b[1] - a[1]).slice(0, 14)) console.log(`  ${v}x ${k}`);
console.log("NaN/Infinity-Pfade (Auswahl):", Object.keys(nan).length ? "" : "keine");
for (const [k, v] of Object.entries(nan).sort((a, b) => b[1].n - a[1].n).slice(0, 8)) console.log(`  ${v.n}x ${k}   z. B. ${v.bsp}`);
