// Prüft, ob Module in js/ einander im Kreis importieren (A importiert B, B importiert A, auch über mehrere Stationen).
// Aufruf: node tools/importkreise.mjs  (Ausgabe: gefundene Kreise; Ausstieg 1, wenn es welche gibt).
// Als Funktion: import { kreise } from "./importkreise.mjs" – gibt eine Liste von Kreisen zurück (je Kreis die Dateien).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const gehe = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? gehe(path.join(d, e.name)) : [path.join(d, e.name)]));

export function importGraph(wurzel = WURZEL) {
  const dateien = gehe(path.join(wurzel, "js")).filter((f) => f.endsWith(".js")).map((f) => path.relative(wurzel, f).split(path.sep).join("/"));
  const g = {};
  // Nachgeladene Module (import("…") mitten im Code) zählen nicht: sie werden erst zur Laufzeit geholt und machen keine Ladereihenfolge (Etappe 10, Nachladen).
  const re = /(?:import|export)\s[^"';]*?from\s*["']([^"']+)["']|import\s*["']([^"']+)["']/g;
  for (const f of dateien) {
    g[f] = new Set();
    const s = fs.readFileSync(path.join(wurzel, f), "utf8");
    let m; re.lastIndex = 0;
    while ((m = re.exec(s))) {
      const sp = m[1] || m[2];
      if (!sp.startsWith(".")) continue;
      g[f].add(path.posix.normalize(path.posix.join(path.posix.dirname(f), sp)));
    }
  }
  return { dateien, g };
}

// Tarjan: starke Zusammenhangskomponenten mit mehr als einer Datei sind Kreise.
export function kreise(wurzel = WURZEL) {
  const { dateien, g } = importGraph(wurzel);
  let idx = 0; const st = [], on = {}, ind = {}, low = {}, out = [];
  const sc = (v) => {
    ind[v] = low[v] = idx++; st.push(v); on[v] = true;
    for (const w of g[v] || []) {
      if (!(w in g)) continue;
      if (ind[w] === undefined) { sc(w); low[v] = Math.min(low[v], low[w]); } else if (on[w]) low[v] = Math.min(low[v], ind[w]);
    }
    if (low[v] === ind[v]) { const c = []; let w; do { w = st.pop(); on[w] = false; c.push(w); } while (w !== v); if (c.length > 1) out.push(c.sort()); }
  };
  for (const v of dateien) if (ind[v] === undefined) sc(v);
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const k = kreise();
  console.log("Importkreise:", k.length); for (const c of k) console.log("  " + c.join(" <-> "));
  process.exit(k.length ? 1 : 0);
}
