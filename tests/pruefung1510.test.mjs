// Prüfung 15.10.2026 (unabhängige Tester): Funde als Tests festhalten
import test from "node:test";
import assert from "node:assert/strict";
import { parseZahl } from "../js/util.js";
import { grenzenVon, abweichung } from "../js/engine.js";
import { belegAbdruck } from "../js/lieferung.js";

test("Dezimalpunkt mit führender Null ist kein Tausenderpunkt", () => {
  assert.equal(parseZahl("0.250"), 0.25); assert.equal(parseZahl("3.600"), 3600); assert.equal(parseZahl("12.5"), 12.5); assert.equal(parseZahl("0,25"), 0.25);
});
test("Kühlgrenzen vertauscht eingegeben gelten als Bereich", () => {
  const k = { art: "kuehl", min: 8, max: 4 };
  assert.deepEqual([grenzenVon(k).min, grenzenVon(k).max], [4, 8]); assert.equal(abweichung(k, 6), false); assert.equal(abweichung(k, 9), true);
});
test("Belegabdruck: gleicher Beleg gleicher Abdruck, andere Zeilen anderer", () => {
  const a = { zeilen: [{ roh: "Tomaten 6kg", gesamt: 19.8 }, { roh: "Öl 10 l", gesamt: 18.9 }] };
  const b = { zeilen: [{ roh: "Öl  10 l", gesamt: 18.9 }, { roh: "tomaten 6kg", gesamt: 19.8 }] };
  assert.equal(belegAbdruck(a), belegAbdruck(b)); assert.notEqual(belegAbdruck(a), belegAbdruck({ zeilen: [{ roh: "Tomaten 6kg", gesamt: 9.9 }] }));
});
