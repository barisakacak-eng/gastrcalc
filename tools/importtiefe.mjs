// Importtiefe und Start-Kern (Etappe 10 „Schneller Start“).
// Importtiefe = die längste Kette nacheinander entdeckter Module ab js/app.js: ein Browser erfährt von einem Import erst, wenn er das
// importierende Modul geladen und gelesen hat (je Stufe ein Rundlauf zum Server). Gezählt wird der kürzeste Entdeckungsweg je Modul,
// der längste davon ist die Tiefe. Nachgeladene Module (import("…") im Code) zählen nicht: sie gehören nicht zum Start.
// <link rel="modulepreload"> in index.html macht Module schon aus dem HTML bekannt: sie haben Tiefe 0, nur nicht vorgeladene zählen mit.
// Aufruf: node tools/importtiefe.mjs  (zeigt Tiefe ohne und mit Vorladen, Anzahl Module und Bytes des Start-Kerns)
// Als Funktion: import { startGraph, tiefe, vorgeladenAusIndex } from "./importtiefe.mjs".
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RE = /(?:import|export)\s[^"';]*?from\s*["']([^"']+)["']|(?:^|[\n;])\s*import\s*["']([^"']+)["']/g;

// Der statische Graph ab js/app.js: { module: [Liste der Module, die es importiert] } (Pfade wie „js/store.js“)
export function startGraph(wurzel = WURZEL, start = "js/app.js") {
  const g = {}; const warte = [start];
  while (warte.length) {
    const f = warte.pop(); if (g[f]) continue; g[f] = [];
    const s = fs.readFileSync(path.join(wurzel, f), "utf8"); RE.lastIndex = 0; let m;
    while ((m = RE.exec(s))) {
      const sp = m[1] || m[2]; if (!sp.startsWith(".")) continue;
      const ziel = path.posix.normalize(path.posix.join(path.posix.dirname(f), sp));
      if (!g[f].includes(ziel)) g[f].push(ziel); warte.push(ziel);
    }
  }
  return g;
}

// Entdeckungstiefe je Modul (Breitensuche); vorgeladen: Menge von Modulen, die index.html schon nennt (Tiefe 0, zusammen mit app.js).
export function tiefen(g, vorgeladen = new Set(), start = "js/app.js") {
  const t = { [start]: 0 }; let rand = [start];
  for (const v of vorgeladen) if (g[v] && t[v] === undefined) { t[v] = 0; rand.push(v); }
  while (rand.length) {
    const neu = [];
    for (const f of rand) for (const d of g[f] || []) if (t[d] === undefined) { t[d] = t[f] + 1; neu.push(d); }
    rand = neu;
  }
  return t;
}
export const tiefe = (g, vorgeladen = new Set()) => Math.max(0, ...Object.values(tiefen(g, vorgeladen)));

// Zum Vergleich mit dem Audit (Ausgang „Importtiefe 19“): die längste Kette im Graphen, auch über Wege, die ein Browser gar nicht nacheinander gehen muss.
export function laengsteKette(g, vorgeladen = new Set(), start = "js/app.js") {
  const memo = {}; const weg = new Set();
  const lauf = (f) => {
    if (memo[f] !== undefined) return memo[f]; if (weg.has(f)) return 0; weg.add(f);
    let m = 0; for (const d of g[f] || []) if (!vorgeladen.has(d)) m = Math.max(m, lauf(d) + 1);
    weg.delete(f); return (memo[f] = m);
  };
  return lauf(start);
}

// Die vorgeladenen Module aus index.html (zwischen den Markierungen, die tools/sw_liste.py schreibt)
export function vorgeladenAusIndex(wurzel = WURZEL) {
  const html = fs.readFileSync(path.join(wurzel, "index.html"), "utf8");
  const i = html.indexOf("<!-- modulepreload:anfang"), j = html.indexOf("<!-- modulepreload:ende");
  if (i < 0 || j < 0) return new Set();
  return new Set([...html.slice(i, j).matchAll(/<link rel="modulepreload" href="([^"]+)"/g)].map((m) => m[1]));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const g = startGraph(); const mods = Object.keys(g); const vor = vorgeladenAusIndex();
  const bytes = mods.reduce((a, f) => a + fs.statSync(path.join(WURZEL, f)).size, 0);
  console.log(`Start-Kern: ${mods.length} Module, ${bytes} Bytes`);
  console.log(`Importtiefe ohne Vorladen: ${tiefe(g)}`);
  console.log(`Importtiefe mit Vorladen (${vor.size} Links in index.html): ${tiefe(g, vor)}`);
  console.log(`Längste Kette im Graphen (wie im Audit gezählt): ohne Vorladen ${laengsteKette(g)}, mit Vorladen ${laengsteKette(g, vor)}`);
}
