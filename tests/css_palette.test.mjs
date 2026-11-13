// Eine Palette: Farben stehen nur in css/tokens.css. Keine Hex-, rgb()-, hsl()- oder benannten Farbwerte in den anderen CSS-Dateien;
// höchstens 20 !important im Ordner css/ (jedes mit Grund im Kommentar); die sechs alten Schichten sind aufgelöst.
// Ausnahmeliste „Farben außerhalb der Tokens“ (Dokument-Stilblöcke in JS, theme-color, Manifest): tests/farben_ausserhalb_tokens.test.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const W = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dateien = fs.readdirSync(path.join(W, "css")).filter((f) => f.endsWith(".css"));
const lies = (f) => fs.readFileSync(path.join(W, "css", f), "utf8");
const NAMEN = "white|black|red|green|blue|gray|grey|orange|yellow|silver|gold|brown|pink|purple|navy|teal|maroon|olive|lime|aqua|fuchsia|cyan|magenta|ivory|beige|tan|coral|salmon|crimson|khaki|linen|wheat|tomato|peru|sienna|chocolate|bisque|snow|azure|lavender|plum|orchid";

test("keine Farbwerte außerhalb von css/tokens.css", () => {
  const funde = [];
  for (const f of dateien.filter((x) => x !== "tokens.css")) {
    const t = lies(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/url\([^)]*\)/g, "");
    for (const m of t.matchAll(new RegExp(`#[0-9a-fA-F]{3,8}\\b|\\b(?:rgba?|hsla?)\\(|(?<![\\w.#-])(?:${NAMEN})(?![\\w-])`, "g"))) funde.push(`${f}: ${m[0]}`);
  }
  assert.deepEqual(funde.slice(0, 20), []);
});

test("höchstens 20 !important in css/, jedes mit Grund im Kommentar (gleiche Zeile oder Zeile davor)", () => {
  let n = 0; const ohneGrund = [];
  for (const f of dateien) {
    const roh = lies(f), z = roh.split("\n");
    const code = roh.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).split("\n"); // Kommentare ausblenden, Zeilen bleiben
    code.forEach((s, i) => { const k = (s.match(/!important/g) || []).length; if (!k) return; n += k; if (!/\*\//.test(z[i]) && !/\*\//.test(z[i - 1] || "")) ohneGrund.push(`${f}:${i + 1}`); });
  }
  assert.ok(n <= 20, `${n} × !important`);
  assert.deepEqual(ohneGrund, []);
});

test("aufgelöste Schichten existieren nicht mehr und werden nicht geladen", () => {
  const html = fs.readFileSync(path.join(W, "index.html"), "utf8");
  for (const n of ["design-b", "facelift-v1", "zielbild", "laden", "heute", "personal"]) {
    assert.ok(!fs.existsSync(path.join(W, "css", n + ".css")), n + ".css");
    assert.ok(!html.includes(`css/${n}.css`), n);
  }
});

test("css/: nur die vorgesehenen Dateien", () => {
  const erlaubt = new Set(["tokens.css", "app.css", "optik.css", "buehne.css", "zeki.css", "s-laden.css", "s-buero.css", "s-einrichtung.css"]);
  assert.deepEqual(dateien.filter((f) => !erlaubt.has(f)), []);
});
