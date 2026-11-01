// Lauf 2 (31.10.2026), Klicker K1 (Laden/Personal, Türkisch) – nachgestellte Befunde als Tests:
// A1 Kühl-Kachel bleibt nach einer Nachkontrolle im grünen Bereich nicht mehr rot; C2 „1ד auch für Personalessen und Ausgegeben, je Grund.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "../js/engine.js";
import { heute } from "../js/util.js";
import { tippsHeute, personalessen, ausgegeben, gerichtWeg } from "../js/muell.js";
const S = await import("../js/store.js");
const H = heute();
const laden = () => { const b = S.leererBetrieb(); b.phase = "app";
  b.kuehlstellen = [{ id: "k1", name: "Theke", art: "kuehl", min: null, max: 7, reihe: 0, archiviert: false }];
  b.kuehl = { takt: 1, ruhetage: [], eingerichtet: true }; b.personen = []; return b; };
const mess = (b, wert, extra = {}) => { const r = E.rundgangStarten(b, { datum: H }); E.stationEintragen(r, b.kuehlstellen[0], { wert, ...extra }); E.rundgangAbschliessen(b, r, () => 1); };

test("K1 A1: 9 °C mit Maßnahme, dann 5 °C → Kachel nicht mehr rot; die Abweichung bleibt im Tag dokumentiert", () => {
  const b = laden();
  mess(b, 4); assert.equal(E.kuehlSchlimmsteAbweichung(b, H), null);
  mess(b, 9, { massnahmen: ["tuer"], nachkontrolle: "h2" });
  assert.equal(E.kuehlSchlimmsteAbweichung(b, H)?.wert, 9, "direkt nach der Abweichung rot");
  mess(b, 5);
  assert.equal(E.kuehlSchlimmsteAbweichung(b, H), null, "nach der Messung im grünen Bereich nicht mehr rot");
  assert.equal(b.messungen.filter((m) => m.datum === H && m.abweichung).length, 1, "die Abweichung steht weiter im Kontrollblatt");
});

test("K1 A1: offene Rundgang-Messung mit Abweichung zählt weiter", () => {
  const b = laden(); const r = E.rundgangStarten(b, { datum: H }); E.stationEintragen(r, b.kuehlstellen[0], { wert: 11 });
  assert.equal(E.kuehlSchlimmsteAbweichung(b, H)?.wert, 11);
});

test("K1 C2: Zähler je Grund – Personalessen und Ausgegeben bekommen ihr 1×, Rohware zählt nur unter Ware", () => {
  const b = laden(); b.gerichte = [{ id: "g1", name: "Döner", zutaten: [], preis: 7, klasse: "speise" }];
  personalessen(b, b.gerichte[0], { datum: H }); ausgegeben(b, b.gerichte[0], { datum: H }); gerichtWeg(b, b.gerichte[0], { datum: H });
  assert.deepEqual(tippsHeute(b, H, "personal"), { "g:g1": 1 });
  assert.deepEqual(tippsHeute(b, H, "ausgegeben"), { "g:g1": 1 });
  assert.deepEqual(tippsHeute(b, H, "bruch"), { "g:g1": 1 });
  assert.deepEqual(tippsHeute(b, H, "roh"), {});
  assert.equal(tippsHeute(b, H)["g:g1"], 3, "ohne Grund alle Müll-Arten zusammen");
});

test("K1 Runde 2 C4: „Übrig“ zählt nur Übrig-Einträge, die Reiter zählen ohne sie", async () => {
  const { muellTippEintragen } = await import("../js/muell.js");
  const b = laden(); b.gerichte = [{ id: "g1", name: "Döner", zutaten: [], preis: 7, klasse: "speise" }];
  gerichtWeg(b, b.gerichte[0], { datum: H }); gerichtWeg(b, b.gerichte[0], { datum: H });
  muellTippEintragen(b, { typ: "gericht", id: "g1", gericht: b.gerichte[0] }, { datum: H, uebrig: true });
  assert.deepEqual(tippsHeute(b, H, "uebrig"), { "g:g1": 1 });
  assert.deepEqual(tippsHeute(b, H, "bruch"), { "g:g1": 2 });
  assert.equal(tippsHeute(b, H)["g:g1"], 3);
});
