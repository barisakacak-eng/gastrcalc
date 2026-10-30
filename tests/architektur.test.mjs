// Schutz-Test Architektur (Pilotfest E6, 30.10.2026): jedes Modul steht in docs/architektur.md; Kernregeln aus dem Dokument gelten im Code.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const WURZEL = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOK = fs.readFileSync(path.join(WURZEL, "docs", "architektur.md"), "utf8");
const module = (ordner) => fs.readdirSync(path.join(WURZEL, ordner)).filter((f) => f.endsWith(".js"));

test("jedes Modul in js/ und js/screens/ ist in docs/architektur.md beschrieben", () => {
  const fehlt = [];
  for (const f of module("js")) if (!DOK.includes("`" + f + "`") && !DOK.includes(", `" + f + "`")) fehlt.push("js/" + f);
  const teil5 = DOK.slice(DOK.indexOf("## 5."));
  for (const f of module("js/screens")) if (!teil5.includes("`" + f + "`")) fehlt.push("js/screens/" + f);
  assert.deepEqual(fehlt, [], "ohne Eintrag in docs/architektur.md: " + fehlt.join(", "));
});
test("kein Eintrag im Dokument ohne Datei (Karteileichen)", () => {
  const genannt = [...DOK.matchAll(/- `([a-z0-9_-]+\.js)`/g)].map((m) => m[1]);
  const vorhanden = new Set([...module("js"), ...module("js/screens")]);
  const leichen = genannt.filter((n) => !vorhanden.has(n));
  assert.deepEqual(leichen, [], "im Dokument, aber nicht im Code: " + leichen.join(", "));
});
test("Regel 2: Schema-Konstante und Migration im store, Regel 7: Fassung nur über sw_liste", () => {
  const store = fs.readFileSync(path.join(WURZEL, "js", "store.js"), "utf8");
  assert.match(store, /export const SCHEMA\s*=/);
  assert.match(fs.readFileSync(path.join(WURZEL, "js", "fassung.js"), "utf8"), /sw_liste\.py/);
  const sw = fs.readFileSync(path.join(WURZEL, "sw.js"), "utf8");
  assert.equal(sw.match(/const V = "([^"]+)"/)[1], fs.readFileSync(path.join(WURZEL, "js", "fassung.js"), "utf8").match(/FASSUNG = "([^"]+)"/)[1], "sw.js und js/fassung.js nennen dieselbe Fassung");
});
test("Regel 3: Bildschirme importieren t() statt eigener deutscher Sätze (Stichprobe: kein „Bitte“/„Fehler“-Satz im HTML)", () => {
  for (const f of module("js/screens")) {
    const src = fs.readFileSync(path.join(WURZEL, "js", "screens", f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map((l) => l.replace(/(^|[\s;,)}{])\/\/.*$/, "$1")).join("\n");
    assert.ok(!/>\s*(Bitte|Fehler|Achtung)\s[a-zäöü]+[^<]{6,}</.test(src), "deutscher Satz direkt im HTML: js/screens/" + f);
  }
});
