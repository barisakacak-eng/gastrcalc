// Keine Importkreise in js/: A importiert B und B importiert A (auch über mehrere Stationen) macht Ladereihenfolge und Tests unberechenbar.
// Die Prüfung steht in tools/importkreise.mjs (von Hand: node tools/importkreise.mjs).
import test from "node:test";
import assert from "node:assert/strict";
import { kreise } from "../tools/importkreise.mjs";

test("Importkreise: js/ hat keinen", () => {
  const k = kreise();
  assert.deepEqual(k, [], "Importkreise gefunden:\n" + k.map((c) => "  " + c.join(" <-> ")).join("\n"));
});
