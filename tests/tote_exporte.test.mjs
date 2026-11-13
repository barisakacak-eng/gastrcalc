// Keine toten Exporte: jeder Export in js/ wird in einer anderen Datei, in tests/ oder in tools/ gebraucht.
// Ein Export, den nur die eigene Datei braucht, verliert das Wort „export“. Die Prüfung steht in tools/tote_exporte.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import { toteExporte } from "../tools/tote_exporte.mjs";

test("Tote Exporte: es gibt keine", () => {
  const t = toteExporte();
  assert.deepEqual(t, [], "Exporte ohne Aufrufer (export streichen oder Funktion löschen):\n" + t.map((x) => "  " + x).join("\n"));
});
