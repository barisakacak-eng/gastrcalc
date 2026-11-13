// Salbei & Papier: Jede CSS-Variable, die irgendwo gelesen wird (var(--x)), ist irgendwo definiert – oder hat einen Rückfallwert var(--x, …).
// Gesucht wird in css/*.css und in allen js/**/*.js (Inline-Stile, Strings). Definitionen: „--x:“ in CSS oder JS, style.setProperty("--x", …).
// Die alten Namen (--b-*, --gc-* …) gibt es nicht mehr: der Übergangs-Block in css/tokens.css ist gelöscht.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const W = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const lies = (p) => fs.readFileSync(path.join(W, p), "utf8");
const jsDateien = (d) => fs.readdirSync(path.join(W, d), { withFileTypes: true }).flatMap((e) => e.isDirectory() ? jsDateien(path.join(d, e.name)) : e.name.endsWith(".js") ? [path.join(d, e.name)] : []);
const cssDateien = fs.readdirSync(path.join(W, "css")).filter((f) => f.endsWith(".css")).map((f) => "css/" + f);
const quellen = [...cssDateien, ...jsDateien("js"), "index.html"];

// Kommentare entfernen (CSS und JS grob), damit Hinweise in Kommentaren nichts zählen
const ohneKommentar = (s, datei) => datei.endsWith(".css") ? s.replace(/\/\*[\s\S]*?\*\//g, "") : s;

function sammeln() {
  const benutzt = new Map(), definiert = new Set();
  for (const d of quellen) {
    const s = ohneKommentar(lies(d), d);
    for (const m of s.matchAll(/var\(\s*(--[a-zA-Z0-9_-]+)\s*(,)?/g)) {
      if (m[2]) { definiert.add(m[1]); continue; } // Rückfallwert vorhanden: zählt als definiert
      (benutzt.get(m[1]) || benutzt.set(m[1], new Set()).get(m[1])).add(d);
    }
    for (const m of s.matchAll(/(--[a-zA-Z0-9_-]+)\s*:/g)) definiert.add(m[1]);
    for (const m of s.matchAll(/setProperty\(\s*["'`](--[a-zA-Z0-9_-]+)["'`]/g)) definiert.add(m[1]);
  }
  return { benutzt, definiert };
}

test("kein var(--…) ohne Definition", () => {
  const { benutzt, definiert } = sammeln();
  const fehlt = [...benutzt].filter(([n]) => !definiert.has(n)).map(([n, d]) => `${n}  (${[...d].slice(0, 3).join(", ")})`);
  assert.deepEqual(fehlt, [], "diese Variablen werden gelesen, aber nirgends gesetzt");
});

test("tokens.css: sechs Farben, kein Übergangs-Block mehr, helle und dunkle Palette", () => {
  const t = lies("css/tokens.css");
  for (const f of ["#F5EDE2", "#22301F", "#4C6B55", "#E8763A", "#E2CDB2", "#8B3A2E"]) assert.ok(t.includes(f), f);
  assert.ok(!/ÜBERGANG/.test(t), "der Übergangs-Block ist gelöscht");
  assert.ok(!/--(b|gc)-[a-z-]+\s*:/.test(t), "keine alten Namen (--b-*, --gc-*)");
  assert.match(t, /\[data-theme=dark\]/); assert.match(t, /prefers-color-scheme:\s*dark/);
});

test("index.html: optik.css nach allen anderen Schichten, buehne.css danach; theme-color und Manifest in Salbei", () => {
  const h = lies("index.html");
  const reihe = [...h.matchAll(/href="css\/([a-z0-9-]+)\.css"/g)].map((m) => m[1]);
  const i = reihe.indexOf("optik"); assert.equal(reihe[i + 1], "buehne"); assert.ok(reihe.slice(i + 2).every((x) => x.startsWith("s-")), "nach der Bühne nur noch die Dateien der Ansichten (s-…)"); assert.ok(reihe.slice(0, i).every((x) => !x.startsWith("s-"))); assert.equal(reihe[0], "tokens"); assert.equal(new Set(reihe).size, reihe.length);
  assert.match(h, /<meta name="theme-color" content="#4C6B55">/);
  const m = JSON.parse(lies("manifest.webmanifest")); assert.equal(m.theme_color, "#4C6B55"); assert.equal(m.background_color, "#F5EDE2");
});
