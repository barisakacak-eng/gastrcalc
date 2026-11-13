// js/data/kuehl_namen.js ist ein Auszug aus den Sprachdateien (damit der Start nicht de, tr und en ganz laden muss): hier der Abgleich.
import test from "node:test";
import assert from "node:assert/strict";
import de from "../js/lang/de.js";
import tr from "../js/lang/tr.js";
import en from "../js/lang/en.js";
import { KUEHL_ARTEN, KUEHL_ALT } from "../js/data/kuehl_namen.js";

test("Kühl-Namen: der Auszug stimmt mit den Sprachdateien überein", () => {
  const arten = {};
  for (const typ of ["getraenke", "kuehlschrank", "saladette", "tiefkuehler", "warmhalter", "eistheke"]) arten[typ] = [de, tr, en].map((L) => L.schnell2?.arten?.[typ]).filter(Boolean);
  assert.deepEqual(KUEHL_ARTEN, arten);
  const alt = { kuehlschrank: [], tiefkuehler: [], warmhalter: [] };
  for (const L of [de, tr, en]) {
    const k = L.kuehl || {};
    if (typeof k.obName === "function") alt.kuehlschrank.push(String(k.obName("")).trim());
    if (k.obNameTk) alt.tiefkuehler.push(k.obNameTk);
    if (k.obNameWarm) alt.warmhalter.push(k.obNameWarm);
  }
  assert.deepEqual(KUEHL_ALT, alt);
});
