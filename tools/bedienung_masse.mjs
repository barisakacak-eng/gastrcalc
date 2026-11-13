// Misst die Bedienschicht (js/app.js und js/bedienung/): Zeilen von app.js, längste Funktion, Zeilen über 400 Zeichen.
// Aufruf: node tools/bedienung_masse.mjs   Als Funktion: import { messen } from "./bedienung_masse.mjs".
// Die Funktionslänge braucht den Parser „acorn“ (npm install acorn oder ein globaler Ordner); ohne ihn zählt nur, was ohne Parser geht
// (Funktionen, die in Spalte 0 beginnen und in Spalte 0 enden) – dann steht in „parser“ false.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const acorn = await import("acorn").catch(() => import("/opt/npm-tools/node_modules/acorn/dist/acorn.mjs")).catch(() => null);

const dateienDerSchicht = () => ["js/app.js", ...fs.readdirSync(path.join(WURZEL, "js/bedienung")).filter((f) => f.endsWith(".js")).sort().map((f) => "js/bedienung/" + f)];
const FUNKTION = new Set(["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"]);

function funktionenMitParser(src) {
  const aus = []; const zeilenVor = (i) => src.slice(0, i).split("\n").length;
  const gehe = (n) => {
    if (!n || typeof n.type !== "string") return;
    if (FUNKTION.has(n.type)) aus.push({ name: n.id?.name || "(anonym)", zeile: zeilenVor(n.start), laenge: zeilenVor(n.end) - zeilenVor(n.start) + 1 });
    for (const k of Object.keys(n)) { const v = n[k]; if (Array.isArray(v)) v.forEach(gehe); else if (v && typeof v.type === "string") gehe(v); }
  };
  gehe(acorn.parse(src, { ecmaVersion: "latest", sourceType: "module" }));
  return aus;
}
function funktionenOhneParser(src) {
  const aus = []; const z = src.split("\n");
  for (let i = 0; i < z.length; i++) {
    const m = /^(?:export )?(?:async )?function (\w+)/.exec(z[i]); if (!m) continue;
    let j = i; while (j < z.length && !/^}/.test(z[j]) && !(j === i && /}\s*$/.test(z[j]))) j++;
    aus.push({ name: m[1], zeile: i + 1, laenge: j - i + 1 });
  }
  return aus;
}

export function messen() {
  const dateien = dateienDerSchicht(); const funktionen = []; const langeZeilen = [];
  for (const f of dateien) {
    const src = fs.readFileSync(path.join(WURZEL, f), "utf8");
    src.split("\n").forEach((z, i) => { if (z.length > 400) langeZeilen.push({ datei: f, zeile: i + 1, zeichen: z.length }); });
    for (const x of acorn ? funktionenMitParser(src) : funktionenOhneParser(src)) funktionen.push({ datei: f, ...x });
  }
  funktionen.sort((a, b) => b.laenge - a.laenge);
  const appZeilen = fs.readFileSync(path.join(WURZEL, "js/app.js"), "utf8").split("\n").length - 1;
  return { parser: !!acorn, dateien: dateien.length - 1, appZeilen, laengsteFunktion: funktionen[0], funktionen, langeZeilen };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const m = messen();
  console.log(`app.js: ${m.appZeilen} Zeilen · Dateien in js/bedienung: ${m.dateien} · Parser: ${m.parser ? "ja" : "nein"}`);
  console.log("längste Funktionen:"); for (const f of m.funktionen.slice(0, 8)) console.log(`  ${f.laenge} Zeilen  ${f.datei}:${f.zeile} ${f.name}`);
  console.log(`Zeilen über 400 Zeichen: ${m.langeZeilen.length}`); for (const l of m.langeZeilen) console.log(`  ${l.datei}:${l.zeile} (${l.zeichen})`);
  if (m.appZeilen > 300 || m.langeZeilen.length || m.laengsteFunktion.laenge > 80) process.exit(1);
}
