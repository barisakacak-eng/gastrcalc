// Etappe 10 „Schneller Start“: die Importtiefe des Start-Kerns bleibt ≤ 6, die Vorlade-Zeilen in index.html decken den Start-Kern genau ab.
import test from "node:test";
import assert from "node:assert/strict";
import { startGraph, tiefe, vorgeladenAusIndex } from "../tools/importtiefe.mjs";

const g = startGraph();
const vor = vorgeladenAusIndex();

test("Importtiefe ohne Vorladen ≤ 6, mit Vorladen aus index.html ≤ 6", () => {
  assert.ok(tiefe(g) <= 6, "Tiefe ohne Vorladen: " + tiefe(g));
  assert.ok(tiefe(g, vor) <= 6, "Tiefe mit Vorladen: " + tiefe(g, vor));
});

test("modulepreload in index.html = statischer Start-Kern", () => {
  const kern = Object.keys(g).sort();
  assert.deepEqual([...vor].sort(), kern);
});

test("kein Büro-Modul und keine Nicht-Start-Sprache im Start-Kern", () => {
  for (const m of ["js/screens/buero.js", "js/screens/ordner.js", "js/data/namen_mehr.js", "js/data/zeki_mehrsprachig.js", "js/lang/tr.js", "js/lang/en.js", "js/bedienung/paket_buero.js"])
    assert.ok(!g[m], "gehört nicht in den Start-Kern: " + m);
});
