// Vorab-Prüfung 03.11.2026, C5: Personal-Modus Kühlung „1 offen“ – der Rundgang begann bei einer heute schon gemessenen Stelle statt bei der offenen.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../js/engine.js";
import { kuehlNaechsteStelle } from "../js/laden_zahlen.js";
import { heute } from "../js/util.js";
const S = await import("../js/store.js");
test("C5: Stelle 1 heute gemessen, Stelle 2 offen → neuer Rundgang beginnt bei Stelle 2", () => {
  const b = S.leererBetrieb(); b.phase = "app"; const H = heute();
  b.kuehlstellen = [{ id: "k1", name: "Theke", art: "kuehl", max: 7, reihe: 0 }, { id: "k2", name: "Tiefkühler", art: "tk", max: -18, reihe: 1 }]; b.kuehl = { takt: 1, ruhetage: [], eingerichtet: true };
  const r1 = E.rundgangStarten(b, { datum: H, einzel: "k1" }); E.stationEintragen(r1, b.kuehlstellen[0], { wert: 4 }); E.rundgangAbschliessen(b, r1, () => 1);
  assert.equal(E.kuehlStatus(b).heuteGemessen, 1);
  const r2 = E.rundgangStarten(b, { datum: H });
  assert.equal(kuehlNaechsteStelle(b, r2), "k2");
  E.stationEintragen(r2, b.kuehlstellen[1], { wert: -19 });
  assert.equal(kuehlNaechsteStelle(b, r2), "k1", "danach wie bisher die übrigen Stellen des Rundgangs");
});
