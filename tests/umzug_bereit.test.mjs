// Umzug bereit (Pilotfest E5, 30.10.2026): die App darf unter jeder Adresse laufen (github.io/gastrcalc/ heute, eigene Domain später).
// Dafür: manifest start_url/scope relativ, Service Worker relativ registriert, keine absolute Pfad- oder Hostangabe in App-Dateien.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const WURZEL = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const lies = (p) => fs.readFileSync(path.join(WURZEL, p), "utf8");
const alleDateien = (ordner, endungen) => { const out = []; const geh = (d) => { for (const e of fs.readdirSync(path.join(WURZEL, d), { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) geh(p); else if (endungen.some((x) => e.name.endsWith(x))) out.push(p); } }; geh(ordner); return out; };

test("manifest: start_url und scope relativ", () => {
  const m = JSON.parse(lies("manifest.webmanifest"));
  assert.equal(m.start_url, "./"); assert.equal(m.scope, "./");
  for (const i of m.icons) assert.ok(!i.src.startsWith("/"), i.src);
});
test("index.html und sw.js: relative Pfade, SW relativ registriert", () => {
  const html = lies("index.html");
  for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) assert.ok(!m[1].startsWith("/") && !/^https?:/.test(m[1]), "absolut in index.html: " + m[1]);
  assert.match(lies("js/app.js"), /serviceWorker\.register\("sw\.js"/);
  const sw = lies("sw.js");
  for (const d of sw.match(/const DATEIEN = \[([^\]]+)\]/)[1].split(",").map((x) => x.trim().replace(/^"|"$/g, ""))) assert.ok(!d.startsWith("/"), "absolut in sw.js: " + d);
});
test("keine Host- oder Repo-Pfade in js/ und css/ (außer Tests und Kommentaren)", () => {
  const dateien = [...alleDateien("js", [".js"]), ...alleDateien("css", [".css"])];
  for (const d of dateien) {
    const ohneKommentar = lies(d).replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map((l) => l.replace(/(^|[\s;,)}{])\/\/.*$/, "$1")).join("\n");
    assert.ok(!/["'`]\/gastrcalc\//.test(ohneKommentar), "Repo-Pfad in " + d);
    assert.ok(!/barisakacak-eng\.github\.io/.test(ohneKommentar), "Host in " + d);
    assert.ok(!/url\(\s*["']?\/(?!\/)/.test(ohneKommentar), "absolute url() in " + d);
  }
});
