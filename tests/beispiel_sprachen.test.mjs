// 27.10.2026 (Persona-Test Türkisch): Beispiel-Laden stürzte in jeder Sprache außer Deutsch ab (Suche über deutsche Gerichtsnamen).
import test from "node:test";
import assert from "node:assert/strict";
import { setzeSprache, ladeSprache, SPRACHEN } from "../js/i18n.js";
import { beispielLaden } from "../js/beispiel.js";

// Die Karte des Beispiel-Ladens hängt nicht von der Sprache ab: gleiche Gerichte (gleiche ids, gleiche Preise, gleiche Reihenfolge) in jeder Sprache.
// Genau das ging am 27.10.2026 kaputt (Suche über deutsche Gerichtsnamen). Vergleichswert ist der deutsche Laden.
setzeSprache("de");
const de = beispielLaden("2026-10-27");
const GERICHTE_DE = de.gerichte.map((g) => [g.id, g.preis]);

for (const code of SPRACHEN) {
  test(`Beispiel-Laden entsteht auf ${code}`, async () => {
    await ladeSprache(code); setzeSprache(code);
    const s = beispielLaden("2026-10-27");
    assert.ok(s.gerichte.length > 10);
    assert.deepEqual(s.gerichte.map((g) => [g.id, g.preis]), GERICHTE_DE);
    setzeSprache("de");
  });
}
