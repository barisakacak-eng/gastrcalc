// Bildpaket E (Baris Ja 03.11.2026): E2 – K1 C5 „Rundgang fortsetzen“ nach dem Tagesabschluss.
// Standard: ein leerer Rundgang zählt nicht, wenn heute alle Stellen gemessen sind; leererRundgangZaehltNicht: false = altes Verhalten.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../js/engine.js";
import { heute } from "../js/util.js";
import { berlinZeitpunkt } from "../js/zeit.js";
import { jetztDran } from "../js/offen.js";
const S = await import("../js/store.js"); const H = heute();
const laden = () => { const b = S.leererBetrieb(); b.phase = "app"; b.beispiel = true;
  b.kuehlstellen = [{ id: "k1", name: "Theke", art: "kuehl", min: null, max: 7, reihe: 0, archiviert: false }]; b.kuehl = { takt: 1, ruhetage: [], eingerichtet: true }; b.personen = []; return b; };
const jetzt = berlinZeitpunkt(heute(), 21); // abends nach dem Abschluss-Fenster (21 Uhr), außerhalb der Stoßzeit egal
test("E2: Stelle gemessen, danach leerer Rundgang angefangen → nichts dran (früher „rundgangOffen“)", () => {
  const b = laden(); const r = E.rundgangStarten(b, { datum: H }); E.stationEintragen(r, b.kuehlstellen[0], { wert: 4 }); E.rundgangAbschliessen(b, r, () => 1);
  E.rundgangStarten(b, { datum: H }); // leer
  assert.equal(jetztDran(b, null, { jetzt, leererRundgangZaehltNicht: false })?.id, "rundgangOffen");
  assert.notEqual(jetztDran(b, null, { jetzt })?.id, "rundgangOffen");
});
test("E2: Rundgang mit Wert bleibt „dran“", () => {
  const b = laden(); const r = E.rundgangStarten(b, { datum: H }); E.stationEintragen(r, b.kuehlstellen[0], { wert: 4 });
  assert.equal(jetztDran(b, null, { jetzt })?.id, "rundgangOffen");
});
