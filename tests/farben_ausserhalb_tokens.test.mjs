import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const SECHS = ["#F5EDE2", "#22301F", "#4C6B55", "#E8763A", "#E2CDB2", "#8B3A2E"];
const RGB = ["245,237,226", "34,48,31", "76,107,85", "232,118,58", "226,205,178", "139,58,46"];

// Ausnahmeliste "Farben außerhalb der Tokens": Dokument-Stilblöcke in JS.
// Weitere Ausnahmen: index.html (theme-color) und manifest.webmanifest (theme_color, background_color) – nur Salbei und Papier (Test „Ausnahmen“ unten).
// css/: keine Farben außerhalb von tokens.css – tests/css_palette.test.mjs.
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

test("Ausnahmen: theme-color in index.html und Manifest nur in den sechs Farben", () => {
  const h = readFileSync("index.html", "utf8");
  for (const m of h.matchAll(/#[0-9a-fA-F]{6}\b/g)) assert.ok(SECHS.includes(m[0].toUpperCase()), "index.html " + m[0]);
  const w = readFileSync("manifest.webmanifest", "utf8");
  for (const m of w.matchAll(/#[0-9a-fA-F]{6}\b/g)) assert.ok(SECHS.includes(m[0].toUpperCase()), "manifest " + m[0]);
});
