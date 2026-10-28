// Korrekturauftrag K1–K3 (Abnahme Welle 0, 28.10.2026): Standard-Kühlgrenzen mit Quelle, Grenzen je Ware, Speiseeis-Theke.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../js/engine.js";

test("K1: Standard kühl ≤ 7, tief ≤ −18, warm ≥ 60 (BfR 2020), jeweils mit Quelle", () => {
  assert.equal(E.grenzenVon({ art: "kuehl" }).max, 7);
  assert.equal(E.grenzenVon({ art: "tk" }).max, -18);
  assert.equal(E.grenzenVon({ art: "warm" }).min, 60);
  for (const a of E.KUEHL_ARTEN) assert.ok(E.GRENZEN_QUELLE[a], a);
  assert.equal(E.abweichung({ art: "warm" }, 62), false); // 62 °C war mit 65 °C eine Abweichung
  assert.equal(E.abweichung({ art: "warm" }, 58), true);
});

test("K2: Grenze je Ware; loses Hack ohne Wert", () => {
  assert.equal(E.grenzenVon({ art: "kuehl", ware: "gefluegel" }).max, 4);
  assert.equal(E.grenzenVon({ art: "kuehl", ware: "fisch" }).max, 2);
  assert.equal(E.grenzenVon({ art: "kuehl", ware: "hack_sb" }).max, 2);
  assert.equal(E.grenzenVon({ art: "kuehl", ware: "hack" }).wareOhneGrenze, true);
});

test("K3: Speiseeis-Theke ≤ −10 °C", () => {
  assert.ok(E.KUEHL_ARTEN.includes("eis"));
  assert.equal(E.grenzenVon({ art: "eis" }).max, -10);
});

test("K4: Stoßzeiten je Laden, Standard wie bisher", async () => {
  const { istHauptzeit } = await import("../js/offen.js");
  const { ruhezeitSetzen } = await import("../js/stamm.js");
  const s = { betrieb: {} };
  assert.equal(istHauptzeit(12, s), true); assert.equal(istHauptzeit(15, s), false); assert.equal(istHauptzeit(18, s), true);
  ruhezeitSetzen(s, 0, "von", "12:00"); ruhezeitSetzen(s, 0, "bis", "13:30");
  assert.deepEqual(s.betrieb.ruhezeiten, [[12, 13.5], [17.5, 20.5]]);
  assert.equal(istHauptzeit(11.75, s), false); assert.equal(istHauptzeit(13, s), true);
  ruhezeitSetzen(s, 1, "von", ""); // zweite Zeile leer → entfällt
  assert.deepEqual(s.betrieb.ruhezeiten, [[12, 13.5]]);
  assert.equal(istHauptzeit(18, s), false);
});
