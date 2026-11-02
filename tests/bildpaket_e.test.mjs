// Bildpaket E (Entwurf 02.11.2026, hinter window.__gcE): E2 – K1 C5 „Rundgang fortsetzen“ nach dem Tagesabschluss.
// Ohne Option bleibt alles wie live (angefangener Rundgang ist „dran“); mit Option zählt ein leerer Rundgang nicht, wenn heute alle Stellen gemessen sind.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../js/engine.js";
import { heute } from "../js/util.js";
import { jetztDran } from "../js/offen.js";
const S = await import("../js/store.js"); const H = heute();
const laden = () => { const b = S.leererBetrieb(); b.phase = "app"; b.beispiel = true;
  b.kuehlstellen = [{ id: "k1", name: "Theke", art: "kuehl", min: null, max: 7, reihe: 0, archiviert: false }]; b.kuehl = { takt: 1, ruhetage: [], eingerichtet: true }; b.personen = []; return b; };
const jetzt = new Date(); jetzt.setHours(21, 0, 0, 0); // abends nach dem Abschluss-Fenster (21 Uhr), außerhalb der Stoßzeit egal
test("E2: Stelle gemessen, danach leerer Rundgang angefangen → live „rundgangOffen“, Entwurf nichts", () => {
  const b = laden(); const r = E.rundgangStarten(b, { datum: H }); E.stationEintragen(r, b.kuehlstellen[0], { wert: 4 }); E.rundgangAbschliessen(b, r, () => 1);
  E.rundgangStarten(b, { datum: H }); // leer
  assert.equal(jetztDran(b, null, { jetzt })?.id, "rundgangOffen");
  assert.notEqual(jetztDran(b, null, { jetzt, leererRundgangZaehltNicht: true })?.id, "rundgangOffen");
});
test("E2: Rundgang mit Wert bleibt auch im Entwurf „dran“", () => {
  const b = laden(); const r = E.rundgangStarten(b, { datum: H }); E.stationEintragen(r, b.kuehlstellen[0], { wert: 4 });
  assert.equal(jetztDran(b, null, { jetzt, leererRundgangZaehltNicht: true })?.id, "rundgangOffen");
});
