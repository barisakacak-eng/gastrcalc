// W2-U (15.10.2026): Schrift wächst mit der Handy-Einstellung, Kontrast Müll-Knopf, Schrift-Ausweichen für fremde Alphabete
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const CSS = new URL("../css/", import.meta.url);
const dateien = readdirSync(CSS).filter((f) => f.endsWith(".css"));
const lies = (f) => readFileSync(new URL(f, CSS), "utf8");

test("keine festen px-Schriftgrößen mehr in css/", () => {
  const funde = [];
  for (const f of dateien) {
    const text = lies(f).replace(/\/\*[\s\S]*?\*\//g, "");
    for (const m of text.matchAll(/(?<![-\w])(font-size|font|line-height)\s*:\s*([^;}]*)/g)) {
      if (/(?<![\w.])\d+(\.\d+)?px/.test(m[2])) funde.push(`${f}: ${m[0].trim()}`);
    }
  }
  assert.deepEqual(funde, []);
});

test("Grundschrift folgt dem Gerät (106.25 % = 17px), nicht fest 17px", () => {
  const app = lies("app.css");
  assert.match(app, /html\s*\{\s*font-size:\s*106\.25%;\s*\}/);
  assert.doesNotMatch(app, /html\s*\{\s*font-size:\s*\d+px/);
});

test("„Müll eintragen“: Kupfer mit dunkler Schrift, kein Weiß mehr darauf", () => {
  const z = lies("zielbild.css");
  assert.match(z, /\.knopf\.glut, \.fotofeld \.knopf\.glut, \.muellknopf \{ background: var\(--glut\); color: var\(--tinte\); \}/); // 19.10.2026: Farbe über Token (Design B)
  // Kontrast Tinte #1F2A24 auf Kupfer #CD8043 >= 4,5:1
  const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const k = (lum("#CD8043") + 0.05) / (lum("#1F2A24") + 0.05);
  assert.ok(k >= 4.5, `Kontrast ${k.toFixed(2)}`);
});

test("Inter nur für die Zeichen, die sie hat; fremde Alphabete ganz in Systemschrift", () => {
  const t = lies("tokens.css");
  assert.match(t, /unicode-range:\s*U\+20-7E/);
  for (const l of ["pl", "ro", "bs", "vi", "ru", "uk", "bg", "el"]) assert.ok(t.includes(`:lang(${l})`), l);
  assert.doesNotMatch(t, /url\(["']?https?:/, "keine Schrift aus dem Netz");
});

test("Leiste: Name wird ausgeblendet statt mit „…“ gekürzt", () => {
  const l = lies("laden.css");
  assert.match(l, /\.tab \.tabname \{ display: flex; flex-wrap: wrap;/);
  assert.match(l, /\.tab \.tabname::before \{ content: ""; width: 0;/);
});
