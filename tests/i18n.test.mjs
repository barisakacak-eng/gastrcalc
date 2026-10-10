// Jede Sprache muss alle Schlüssel der Leitsprache haben.
import { test } from "node:test";
import assert from "node:assert/strict";
globalThis.document = { documentElement: {} };
const { fehlendeSchluessel, SPRACHEN } = await import("../js/i18n.js");
for (const s of SPRACHEN) {
  test(`Sprachtabelle ${s} vollständig`, () => {
    const f = fehlendeSchluessel(s);
    assert.deepEqual(f, [], `fehlen in ${s}: ${f.join(", ")}`);
  });
}
