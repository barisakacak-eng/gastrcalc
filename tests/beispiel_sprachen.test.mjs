// 27.10.2026 (Persona-Test Türkisch): Beispiel-Laden stürzte in jeder Sprache außer Deutsch ab (Suche über deutsche Gerichtsnamen).
import test from "node:test";
import assert from "node:assert/strict";
import { setzeSprache, ladeSprache, SPRACHEN } from "../js/i18n.js";
import { beispielLaden } from "../js/beispiel.js";

for (const code of SPRACHEN) {
  test(`Beispiel-Laden entsteht auf ${code}`, async () => {
    await ladeSprache(code); setzeSprache(code);
    const s = beispielLaden("2026-10-27");
    assert.ok(s.gerichte.length > 10);
    assert.ok((s.personalessen || s.muell || []).length >= 0);
    setzeSprache("de");
  });
}
