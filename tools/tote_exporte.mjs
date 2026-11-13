// Listet Exporte in js/ (ohne js/lang), die weder in einer anderen Datei unter js/ noch in tests/ oder tools/ vorkommen.
// Aufruf: node tools/tote_exporte.mjs  (Ausstieg 1, wenn es welche gibt). Als Funktion: import { toteExporte } from "./tote_exporte.mjs".
// Die Suche ist bewusst grob (Name als ganzes Wort in irgendeiner anderen Datei zählt als benutzt): lieber ein toter Export zu wenig gemeldet als einer zu viel.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const gehe = (d) => (fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? gehe(path.join(d, e.name)) : [path.join(d, e.name)])) : []);
const rel = (wurzel, f) => path.relative(wurzel, f).split(path.sep).join("/");
const wort = (n) => new RegExp("(?<![A-Za-z0-9_$.])" + n.replace(/\$/g, "\\$") + "(?![A-Za-z0-9_$])");
// In Tests und Werkzeugen zählt auch der Zugriff über ein Modulobjekt (M.name), weil sie Module oft als Ganzes importieren.
const wortAuchPunkt = (n) => new RegExp("(?<![A-Za-z0-9_$])" + n.replace(/\$/g, "\\$") + "(?![A-Za-z0-9_$])");

// Begründete Ausnahme: Rest-Exporte der neuen Zeki-Figur (js/zeki_figur.js), die der nächste Schritt des Aussehens (Etappe Aussehen, Teil 2: Folgen vorladen,
// Start-Bild, Leerlauf) aufruft. Sie sind bereits Teil der dokumentierten Schnittstelle (docs/aussehen.md). Wird einer gebraucht, fällt er hier wieder heraus.
const AUSNAHME = new Set(["js/zeki_figur.js:DARSTELLUNG_BREITE", "js/zeki_figur.js:SPALTEN", "js/zeki_figur.js:ORDNER_BUEHNE", "js/zeki_figur.js:startSchluessel", "js/zeki_figur.js:LEERLAUF_MIN_MS", "js/zeki_figur.js:folgeVorladen"]);

export function toteExporte(wurzel = WURZEL) {
  const dateien = gehe(path.join(wurzel, "js")).filter((f) => f.endsWith(".js") && !rel(wurzel, f).startsWith("js/lang/")).map((f) => rel(wurzel, f));
  const quelle = {};
  for (const f of [...dateien, "js/lang/de.js"]) quelle[f] = fs.readFileSync(path.join(wurzel, f), "utf8");
  const test = [...gehe(path.join(wurzel, "tests")), ...gehe(path.join(wurzel, "tools"))].filter((f) => /\.(mjs|py|js)$/.test(f) && !f.endsWith("tote_exporte.mjs")).map((f) => fs.readFileSync(f, "utf8")).join("\n");
  const tot = [];
  for (const f of dateien) {
    const s = quelle[f]; const namen = new Set(); let m;
    const re = /export\s+(?:async\s+)?(?:function\*?|const|let|class)\s+([A-Za-z0-9_$]+)/g; while ((m = re.exec(s))) namen.add(m[1]);
    const re2 = /export\s*\{([^}]*)\}/g; while ((m = re2.exec(s))) m[1].split(",").forEach((x) => { const n = x.trim().split(/\s+as\s+/).pop(); if (n) namen.add(n); });
    for (const n of namen) {
      const rx = wort(n);
      if (Object.keys(quelle).some((g) => g !== f && rx.test(quelle[g])) || wortAuchPunkt(n).test(test)) continue;
      if (AUSNAHME.has(`${f}:${n}`)) continue;
      const intern = (s.match(new RegExp(wort(n).source, "g")) || []).length > 1;
      tot.push(`${f}:${n}${intern ? " (intern benutzt)" : ""}`);
    }
  }
  return tot;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = toteExporte();
  console.log("Tote Exporte:", t.length); for (const x of t) console.log("  " + x);
  process.exit(t.length ? 1 : 0);
}
