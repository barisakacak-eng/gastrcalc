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
  const dateien = [...JSON.parse(sw.match(/const DATEIEN = (\[[^\]]*\])/)[1]), ...JSON.parse(sw.match(/const SPAETER = (\[[^\]]*\])/)[1])]; // Start-Liste, dann Nachlade-Liste
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
  const dateien = new Set([...JSON.parse(sw.match(/const DATEIEN = (\[[^\]]*\])/)[1]), ...JSON.parse(sw.match(/const SPAETER = (\[[^\]]*\])/)[1])]);
  const fotos = JSON.parse(sw.match(/const FOTOS_H = (\{[^}]*\})/)[1]);
  const endungen = new Set([".js", ".css", ".png", ".svg", ".webp", ".woff2", ".woff", ".webmanifest"]);
  const aus = new Set(["tests", "tools", "vendor", "design", "design-handoffs", "bruecke", "node_modules"]);
  const fehlt = [];
  const gehe = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith(".")) continue;
      const voll = path.join(dir, e.name); const rel = path.relative(WURZEL, voll).split(path.sep).join("/");
      if (e.isDirectory()) { if (!aus.has(e.name)) gehe(voll); continue; }
      if (!endungen.has(path.extname(e.name)) || e.name === "sw.js") continue;
      if (rel.startsWith("foto/") || rel.startsWith("assets/brand/zeki-klein/")) { if (!(rel in fotos)) fehlt.push(rel); continue; } // Nachlade-Cache (Fotos, Zeki-Folgen)
      if (!dateien.has(rel)) fehlt.push(rel);
    }
  };
  gehe(WURZEL);
  assert.deepEqual(fehlt, [], "Dateien fehlen in sw.js – python3 tools/sw_liste.py ausführen");
});

test("Fassungs-Wächter: die 25 Zeki-Folgen liegen im Nachlade-Cache, nicht in den Listen; Bühnen-Bilder, Mienen und Schriften stehen in Start- oder Nachlade-Liste", () => {
  const start = JSON.parse(sw.match(/const DATEIEN = (\[[^\]]*\])/)[1]);
  const spaeter = JSON.parse(sw.match(/const SPAETER = (\[[^\]]*\])/)[1]);
  const dateien = [...start, ...spaeter];
  const fotos = JSON.parse(sw.match(/const FOTOS_H = (\{[^}]*\})/)[1]);
  assert.deepEqual(dateien.filter((d) => d.startsWith("assets/brand/zeki-klein/")), []);
  assert.equal(Object.keys(fotos).filter((k) => k.startsWith("assets/brand/zeki-klein/")).length, 25);
  assert.equal(dateien.filter((d) => d.startsWith("assets/brand/zeki-buehne/")).length, 24);
  assert.equal(dateien.filter((d) => d.startsWith("assets/brand/zeki-mienen/")).length, 12);
  for (const f of ["NotoSans-Regular", "NotoSans-Bold", "NotoSansArabic-Regular", "NotoSansArabic-Bold"]) assert.ok(dateien.includes(`fonts/${f}.woff2`), f);
  for (const d of dateien) assert.ok(!/^(design|tools|docs)\//.test(d), "nicht offline: " + d);
  assert.match(sw, /const NACHLADE = \["foto\/", "assets\/brand\/zeki-klein\/"\]/);
});

// Etappe 10 „Schneller Start“: zwei Stufen. Die Start-Liste ist klein (Start-Kern), jede Datei hat eine Prüfsumme, der Rest wartet.
test("Fassungs-Wächter: Start-Liste = Start-Kern; jede gelistete Datei hat eine stimmende Prüfsumme; kein Büro-Modul in der Start-Liste", async () => {
  const start = JSON.parse(sw.match(/const DATEIEN = (\[[^\]]*\])/)[1]);
  const spaeter = JSON.parse(sw.match(/const SPAETER = (\[[^\]]*\])/)[1]);
  const hash = JSON.parse(sw.match(/const HASH = (\{[^}]*\})/)[1]);
  assert.deepEqual(start.filter((d) => spaeter.includes(d)), [], "eine Datei steht in beiden Stufen");
  for (const d of [...start, ...spaeter]) {
    if (d === "./") continue;
    const soll = crypto.createHash("sha1").update(fs.readFileSync(path.join(WURZEL, d))).digest("hex").slice(0, 8);
    assert.equal(hash[d], soll, "Prüfsumme in sw.js stimmt nicht: " + d);
  }
  assert.equal(Object.keys(hash).length, start.length - 1 + spaeter.length, "HASH deckt genau beide Listen ab");
  const { startGraph } = await import("../tools/importtiefe.mjs");
  const kern = Object.keys(startGraph());
  for (const m of kern) assert.ok(start.includes(m), "Modul des Start-Kerns fehlt in der Start-Liste: " + m);
  assert.deepEqual(start.filter((d) => d.startsWith("js/") && d.endsWith(".js") && !kern.includes(d) && d !== "js/rahmen.js"), [], "Start-Liste enthält Module außerhalb des Start-Kerns");
  for (const d of ["js/bedienung/paket_buero.js", "js/screens/buero.js", "js/screens/ordner.js", "js/data/namen_mehr.js", "js/data/zeki_mehrsprachig.js", "js/lang/tr.js", "js/lang/en.js"]) assert.ok(spaeter.includes(d), "gehört in die Nachlade-Liste: " + d);
  assert.ok(start.includes("index.html") && start.includes("js/app.js") && start.includes("js/lang/de.js"));
});
test("Fassungs-Wächter: der Service Worker prüft die Prüfsumme bei der Installation und meldet „alles da“", () => {
  assert.match(sw, /holeGeprueft\(u, "reload"\)/, "Installation prüft je Datei");
  assert.match(sw, /catch \(fehler\) \{ await caches\.delete\(NAME\); throw fehler; \}/, "falsche Datei: Installation scheitert, halber Cache weg");
  assert.match(sw, /stand: luecke \? "luecke" : "fertig"/);
  assert.match(sw, /e\.data === "nachladen"/);
});
