import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const SECHS = ["#F5EDE2", "#22301F", "#4C6B55", "#E8763A", "#E2CDB2", "#8B3A2E"];
const RGB = ["245,237,226", "34,48,31", "76,107,85", "232,118,58", "226,205,178", "139,58,46"];

// Ausnahmeliste "Farben außerhalb der Tokens": Dokument-Stilblöcke in JS.
const AUSNAHMEN = ["js/export_amt.js", "js/ordner_text.js", "js/tafel.js"];

test("Ausnahmeliste: nur die sechs Farben", () => {
  for (const f of AUSNAHMEN) {
    const t = readFileSync(f, "utf8");
    for (const m of t.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      assert.ok(SECHS.includes(m[0].toUpperCase()), `${f}: ${m[0]}`);
    }
    for (const m of t.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)) {
      assert.ok(RGB.includes(`${m[1]},${m[2]},${m[3]}`), `${f}: ${m[0]}`);
    }
  }
});

test("s-buero.css: keine Farbwerte, kein !important", () => {
  const t = readFileSync("css/s-buero.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(t));
  assert.ok(!/rgba?\(/.test(t));
  assert.ok(!/!important/.test(t));
});
