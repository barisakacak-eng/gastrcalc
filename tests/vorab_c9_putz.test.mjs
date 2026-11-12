// Vorab-Prüfung 03.11.2026, C9: Putzplan zeigte „Saladette-Behälter“, obwohl in der Einrichtung keine Saladette gewählt war.
import { test } from "node:test";
import assert from "node:assert/strict";
import { planVorschlag, aufgabenFuer } from "../js/putzplan.js";
const S = await import("../js/store.js");
test("C9: Döner mit Kühlschrank und Tiefkühler, ohne Saladette → keine Saladette-Aufgaben; mit Saladette → da", () => {
  const b = S.leererBetrieb(); b.ladenArt = "doener"; b.ladenArten = ["doener"];
  b.kuehlstellen = [{ id: "a", name: "Kühlschrank", art: "kuehl", typ: "kuehlschrank" }, { id: "b", name: "Tiefkühler", art: "tk", typ: "tiefkuehler" }];
  // Von Hand begründet: Ladenart Döner bringt Spieß, Fritteuse, Abzug, Lager und Müll mit; Kühlgeräte kommen aus der Einrichtung (hier Kühlschrank und Tiefkühler) – Saladette gehört nicht dazu.
  assert.deepEqual([...planVorschlag(b).geraete].sort(), ["abzug", "fritteuse", "grill_spiess", "kuehlschrank", "lager", "muell", "tiefkuehler"]);
  assert.ok(!planVorschlag(b).geraete.includes("saladette")); assert.ok(!aufgabenFuer(planVorschlag(b)).some((a) => a.gilt === "saladette"));
  b.kuehlstellen.push({ id: "c", name: "Saladette", art: "kuehl", typ: "saladette" });
  assert.equal(planVorschlag(b).geraete.filter((g) => g === "saladette").length, 1, "genau einmal, nicht doppelt");
  b.kuehlstellen = []; assert.ok(planVorschlag(b).geraete.includes("saladette"), "ohne Angabe zu Kühlgeräten bleibt der Vorschlag der Ladenart");
});
