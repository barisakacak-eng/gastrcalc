// Vorab-Prüfung 03.11.2026, C9: Putzplan zeigte „Saladette-Behälter“, obwohl in der Einrichtung keine Saladette gewählt war.
import { test } from "node:test";
import assert from "node:assert/strict";
import { planVorschlag, aufgabenFuer } from "../js/putzplan.js";
const S = await import("../js/store.js");
test("C9: Döner mit Kühlschrank und Tiefkühler, ohne Saladette → keine Saladette-Aufgaben; mit Saladette → da", () => {
  const b = S.leererBetrieb(); b.ladenArt = "doener"; b.ladenArten = ["doener"];
  b.kuehlstellen = [{ id: "a", name: "Kühlschrank", art: "kuehl", typ: "kuehlschrank" }, { id: "b", name: "Tiefkühler", art: "tk", typ: "tiefkuehler" }];
  assert.ok(!planVorschlag(b).geraete.includes("saladette")); assert.ok(!aufgabenFuer(planVorschlag(b)).some((a) => a.gilt === "saladette"));
  b.kuehlstellen.push({ id: "c", name: "Saladette", art: "kuehl", typ: "saladette" });
  assert.ok(planVorschlag(b).geraete.includes("saladette"));
  b.kuehlstellen = []; assert.ok(planVorschlag(b).geraete.includes("saladette"), "ohne Angabe zu Kühlgeräten bleibt der Vorschlag der Ladenart");
});
