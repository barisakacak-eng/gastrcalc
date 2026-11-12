// Lauf 3, Phase 6: Erinnerung auf Heute 5 Tage vor einem Pflichttermin, ein Satz ≤ 15 Wörter
import test from "node:test";
import assert from "node:assert/strict";
import { fristErinnerungHeute } from "../js/welle3.js";
import { fristSatz } from "../js/data/frist_texte.js";

const s = { betrieb: { ustRhythmus: "monat", rechtsform: "einzel", estBescheid: true }, personen: [] };
test("Erinnerung ab 5 Tage vorher bis zum Termin, davor und danach keine", () => {
  assert.equal(fristErinnerungHeute(s, "2026-12-04"), null);
  assert.deepEqual(fristErinnerungHeute(s, "2026-12-05"), { datum: "2026-12-10", arten: ["est", "ust"] });
  assert.equal(fristErinnerungHeute(s, "2026-12-10").datum, "2026-12-10");
  assert.equal(fristErinnerungHeute(s, "2026-12-11"), null);
});
test("ohne Rhythmus keine USt; mit Personal Lohnsteuer dabei", () => {
  assert.deepEqual(fristErinnerungHeute({ betrieb: { rechtsform: "einzel", estBescheid: true }, personen: [] }, "2026-12-05").arten, ["est"]);
  assert.equal(fristErinnerungHeute({ betrieb: {}, personen: [] }, "2026-12-05"), null); // ohne Bescheid und ohne Rhythmus: kein Termin, keine Erinnerung
  assert.ok(fristErinnerungHeute({ betrieb: { ustRhythmus: "monat", lstRhythmus: "monat" }, personen: [{ id: "p" }] }, "2026-12-05").arten.includes("lohnsteuer"));
  assert.ok(!fristErinnerungHeute({ betrieb: { ustRhythmus: "monat" }, personen: [{ id: "p" }] }, "2026-12-05").arten.includes("lohnsteuer")); // Lohnsteuer-Rhythmus nicht gewählt: nie geraten
});
test("Satz ≤ 15 Wörter in de/tr/en/ar, ohne Zahlen gezählt", () => {
  for (const sp of ["de", "tr", "en", "ar"]) {
    const x = fristSatz(sp, "USt-Voranmeldung, ESt-Vorauszahlung, Lohnsteuer-Anmeldung", "10.12.");
    assert.ok(x.split(/\s+/).filter((w) => /\p{L}/u.test(w) && !/\p{N}/u.test(w)).length <= 15, sp + ": " + x);
  }
});
