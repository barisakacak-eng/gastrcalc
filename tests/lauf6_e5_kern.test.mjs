// Lauf 6, E5-X (13.11.2026): Funde aus dem Technik-Audit am Rechenwerk – je Fund ein eigener Test (Name = Fund).
// Gemeinsam: Uhr mocken (mock.timers, Date), Beispiel-Laden und Prüfstand-Läden laden, formatierte Beträge vergleichen.
import test, { mock } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { berlinZeitpunkt } from "../js/zeit.js";
import { leererBetrieb } from "../js/store.js";
import { beispielLaden } from "../js/beispiel.js";

const i18n = await import("../js/i18n.js"); i18n.setzeSprache("de");
const text = (html) => html.replace(/<[^>]+>/g, " ").replace(/[⁦-⁩ ]/g, " ").replace(/\s+/g, " ");
const mitUhr = async (tag, fn, stunde = 12) => { mock.timers.enable({ apis: ["Date"], now: berlinZeitpunkt(tag, stunde) }); try { return await fn(); } finally { mock.timers.reset(); } };

// ---------------------------------------------------------------- P1 B5
test("P1 B5: Schicht mit gleichem Beginn und Ende wird nicht eingetragen (Grund „gleich“), Kennung kommt aus dem Inhalt", async () => {
  const { schichtEintragenMitGrund, schichtEintragen } = await import("../js/schichten.js");
  const { schichtKennung } = await import("../js/abgleich_felder.js");
  const s = leererBetrieb(); s.personen = [{ id: "a", kuerzel: "AB" }];
  const gleich = schichtEintragenMitGrund(s, { datum: "2026-11-03", person: "a", von: "10:00", bis: "10:00" });
  assert.deepEqual(gleich, { eintrag: null, grund: "gleich" }); assert.equal((s.schichten || []).length, 0, "nichts eingetragen");
  assert.equal(schichtEintragen(s, { datum: "2026-11-03", person: "a", von: "10:00", bis: "10:00" }), null);
  assert.equal(schichtEintragenMitGrund(s, { datum: "2026-11-03", person: "a", von: "10:00", bis: "" }).grund, "ungueltig");
  // zwei Handys: gleiche Listenlänge, aber verschiedene Zeitpunkte → verschiedene Kennung
  const x = schichtEintragen(s, { datum: "2026-11-03", person: "a", von: "10:00", bis: "18:00", jetzt: "2026-11-03T19:00:00.000Z" });
  const s2 = leererBetrieb(); s2.personen = [{ id: "a", kuerzel: "AB" }];
  const y = schichtEintragen(s2, { datum: "2026-11-03", person: "a", von: "10:00", bis: "18:00", jetzt: "2026-11-03T19:00:05.000Z" });
  assert.notEqual(x.id, y.id); assert.equal(x.id, schichtKennung(x));
});
test("P1 B5: Büro-Bildschirm zeigt bei Beginn = Ende den Hinweis statt „Eingetragen“", async () => {
  const g = await import("../js/screens/geld3.js");
  await mitUhr("2026-11-10", () => {
    const s = leererBetrieb(); s.betrieb = { name: "T", format: "imbiss", ustRhythmus: "monat", rechtsform: "einzel" }; s.personen = [{ id: "a", kuerzel: "AB", aktiv: true }];
    g.geld3Eingabe("g3-s-von", "09:00", s); g.geld3Eingabe("g3-s-bis", "09:00", s); g.geld3Aktion("g3-schicht", {}, s);
    const t1 = text(g.geld3View(s)); assert.match(t1, /Beginn und Ende sind gleich\. Bitte prüfen\./); assert.equal((s.schichten || []).length, 0);
    g.geld3Eingabe("g3-s-bis", "17:00", s); g.geld3Aktion("g3-schicht", {}, s);
    const t2 = text(g.geld3View(s)); assert.ok(!/Beginn und Ende sind gleich/.test(t2)); assert.equal(s.schichten.length, 1);
  });
});
