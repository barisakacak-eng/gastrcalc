// Jede Sprache muss alle Schlüssel der Leitsprache haben.
import { test } from "node:test";
import assert from "node:assert/strict";
globalThis.document = { documentElement: {} };
const { fehlendeSchluessel, SPRACHEN, ladeSprache } = await import("../js/i18n.js");
for (const s of SPRACHEN) await ladeSprache(s); // nachladbare Sprachen erst laden
for (const s of SPRACHEN) {
  test(`Sprachtabelle ${s} vollständig`, () => {
    const f = fehlendeSchluessel(s);
    assert.deepEqual(f, [], `fehlen in ${s}: ${f.join(", ")}`);
  });
}
test("Speicher behält jede Sprache der App", async () => {
  const { SPRACH_NAMEN } = await import("../js/i18n.js");
  const src = (await import("node:fs")).readFileSync(new URL("../js/store.js", import.meta.url), "utf8");
  for (const c of Object.keys(SPRACH_NAMEN)) assert.ok(src.includes(`"${c}"`), c);
});
