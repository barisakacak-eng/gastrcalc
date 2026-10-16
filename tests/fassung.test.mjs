// Fassungs-Wächter (16.10.2026, Audit-Befund „Auslieferung HOCH“): Eine geänderte App-Datei ohne neuen Lauf von
// tools/sw_liste.py hätte sw.js unverändert gelassen – kein Gerät bekäme je das Update. Dieser Test bildet denselben
// Fingerabdruck wie das Skript und blockiert im Test-Gate (pages.yml) jede Veröffentlichung mit veralteter Fassung.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const WURZEL = path.resolve(new URL("..", import.meta.url).pathname);
const sw = fs.readFileSync(path.join(WURZEL, "sw.js"), "utf8");

test("Fassungs-Wächter: sw.js trägt den Fingerabdruck der tatsächlich gelisteten Dateien", () => {
  const inhalt = sw.match(/const INHALT = "([0-9a-f]{12})"/)?.[1];
  assert.ok(inhalt, "sw.js hat keinen INHALT-Fingerabdruck – bitte python3 tools/sw_liste.py ausführen");
  const dateien = JSON.parse(sw.match(/const DATEIEN = (\[[^\]]*\])/)[1]);
  const fotos = JSON.parse(sw.match(/const FOTOS_H = (\{[^}]*\})/)[1]);
  const h = crypto.createHash("sha1");
  for (const d of dateien) {
    if (d === "./") continue;
    assert.ok(fs.existsSync(path.join(WURZEL, d)), `gelistete Datei fehlt: ${d}`);
    h.update(d); h.update(fs.readFileSync(path.join(WURZEL, d)));
  }
  for (const k of Object.keys(fotos).sort()) { h.update(k); h.update(fotos[k]); }
  assert.equal(h.digest("hex").slice(0, 12), inhalt,
    "App-Dateien geändert, aber sw.js nicht neu erzeugt – vor dem Push python3 tools/sw_liste.py ausführen");
});

test("Fassungs-Wächter: jede App-Datei auf der Platte steht in der Liste des Service Workers", () => {
  const dateien = new Set(JSON.parse(sw.match(/const DATEIEN = (\[[^\]]*\])/)[1]));
  const fotos = JSON.parse(sw.match(/const FOTOS_H = (\{[^}]*\})/)[1]);
  const endungen = new Set([".js", ".css", ".png", ".svg", ".webp", ".woff2", ".webmanifest"]);
  const aus = new Set(["tests", "tools", "vendor", "design", "bruecke", "node_modules"]);
  const fehlt = [];
  const gehe = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith(".")) continue;
      const voll = path.join(dir, e.name); const rel = path.relative(WURZEL, voll).split(path.sep).join("/");
      if (e.isDirectory()) { if (!aus.has(e.name)) gehe(voll); continue; }
      if (!endungen.has(path.extname(e.name)) || e.name === "sw.js") continue;
      if (rel.startsWith("js/lang/") && !["de", "tr", "en"].includes(path.basename(e.name, ".js"))) continue;
      if (rel.startsWith("foto/")) { if (!(rel in fotos)) fehlt.push(rel); continue; }
      if (!dateien.has(rel)) fehlt.push(rel);
    }
  };
  gehe(WURZEL);
  assert.deepEqual(fehlt, [], "Dateien fehlen in sw.js – python3 tools/sw_liste.py ausführen");
});
