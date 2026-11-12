#!/usr/bin/env node
// Mutationsprobe (Lauf 6, Etappe 2): 20 absichtliche Rechenfehler. Jeder muss von den genannten Testdateien bemerkt werden.
// Aufruf: node tools/mutation.mjs            → alle 20, Ende mit „20/20“ oder Fehlercode 1
//         node tools/mutation.mjs M03 M14    → nur diese
// So geht es: js/ und tests/ werden in einen Temp-Ordner kopiert (der Arbeitsbaum bleibt unberührt), dort wird je Mutation
// genau eine Stelle ersetzt und die genannten Testdateien laufen in TZ=UTC. Rot heißt: Stelle nicht (genau einmal) gefunden
// ODER die Tests bleiben trotz Fehler grün. tests/fassung.test.mjs zählt nie als Entdecker.
import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const MUTATIONEN = [
/*LISTE*/
];

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
function kopie() {
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), "mutation-"));
  for (const e of fs.readdirSync(wurzel)) {
    if (e === ".git" || e === "node_modules" || e === ".claude") continue;
    if (e === "js" || e === "tests") fs.cpSync(path.join(wurzel, e), path.join(ziel, e), { recursive: true });
    else fs.symlinkSync(path.join(wurzel, e), path.join(ziel, e));   // Bilder, CSS, index.html: nur gelesen
  }
  return ziel;
}
function pruefe(ziel, m) {
  const f = path.join(ziel, m.datei);
  if (!fs.existsSync(f)) return { ok: false, grund: "Datei fehlt: " + m.datei };
  const orig = fs.readFileSync(f, "utf8"); const n = orig.split(m.such).length - 1;
  if (n !== 1) return { ok: false, grund: `Stelle ${n}× gefunden (muss genau 1× sein)` };
  const tests = m.tests.filter((t) => t !== "fassung.test.mjs");
  if (!tests.length) return { ok: false, grund: "keine Testdatei genannt" };
  const fehlt = tests.filter((t) => !fs.existsSync(path.join(ziel, "tests", t)));
  if (fehlt.length) return { ok: false, grund: "Testdatei fehlt: " + fehlt.join(", ") };
  fs.writeFileSync(f, orig.replace(m.such, () => m.ersatz));
  try {
    const r = spawnSync(process.execPath, ["--test", ...tests.map((t) => "tests/" + t)], { cwd: ziel, env: { ...process.env, TZ: "UTC" }, encoding: "utf8", maxBuffer: 1 << 28 });
    return r.status === 0 ? { ok: false, grund: "Tests bleiben grün: " + tests.join(", ") } : { ok: true };
  } finally { fs.writeFileSync(f, orig); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const nur = process.argv.slice(2); const liste = nur.length ? MUTATIONEN.filter((m) => nur.includes(m.id)) : MUTATIONEN;
  const start = Date.now(); const ziel = kopie(); let gut = 0;
  try {
    for (const m of liste) {
      const r = pruefe(ziel, m); if (r.ok) gut++;
      console.log(`${r.ok ? "entdeckt " : "ROT      "} ${m.id}  ${m.verhalten}${r.ok ? "" : "  → " + r.grund}`);
    }
  } finally { fs.rmSync(ziel, { recursive: true, force: true }); }
  console.log(`${gut}/${liste.length} entdeckt · ${((Date.now() - start) / 1000).toFixed(1)} s`);
  process.exit(gut === liste.length ? 0 : 1);
}
