// 23.10.2026: Der Service Worker bricht die Installation ab, wenn eine Datei der Vorab-Liste auf der Seite fehlt (404).
// Jeder Ordner aus sw.js muss deshalb im Deploy-Schritt (.github/workflows/pages.yml) mitkopiert werden.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Deploy kopiert jeden Ordner, den sw.js vorab lädt", () => {
  const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
  const liste = JSON.parse(sw.match(/const DATEIEN = (\[.*?\]);/s)[1]);
  const yml = readFileSync(new URL("../.github/workflows/pages.yml", import.meta.url), "utf8");
  const cp = yml.match(/cp -r (.+?) \/tmp\/seite\//)[1].split(/\s+/);
  const fehlt = [...new Set(liste.filter((f) => f !== "./").map((f) => f.split("/")[0]))].filter((top) => !cp.includes(top));
  assert.deepEqual(fehlt, [], "diese Ordner/Dateien fehlen im Deploy-Schritt: " + fehlt.join(", "));
});
