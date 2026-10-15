// Jede Sprache muss alle Schlüssel der Leitsprache haben.
import { test } from "node:test";
import assert from "node:assert/strict";
globalThis.document = { documentElement: {} };
const { fehlendeSchluessel, SPRACHEN, ladeSprache } = await import("../js/i18n.js");
for (const s of SPRACHEN) await ladeSprache(s); // nachladbare Sprachen erst laden
// Drei Ebenen (Bauvertrag 15.10.2026): neue Blöcke gibt es zuerst nur in de/tr/en; die 15 nachladbaren Sprachen ergänzt danach ein Übersetzer
// (bis dahin fällt t() auf Deutsch zurück). Für diese Sprachen werden nur die neuen Blöcke ausgenommen, alles andere bleibt Pflicht.
const NEUE_BLOECKE = ["ebene", "heute", "kartelaeden", "buero", "ordner", "personal", "muell1", "schnell2"];
for (const s of SPRACHEN) {
  test(`Sprachtabelle ${s} vollständig`, () => {
    const f = fehlendeSchluessel(s).filter((k) => ["de", "tr", "en"].includes(s) || !NEUE_BLOECKE.includes(k.split(".")[0]));
    assert.deepEqual(f, [], `fehlen in ${s}: ${f.join(", ")}`);
  });
}
test("Speicher behält jede Sprache der App", async () => {
  const { SPRACH_NAMEN } = await import("../js/i18n.js");
  const src = (await import("node:fs")).readFileSync(new URL("../js/store.js", import.meta.url), "utf8");
  for (const c of Object.keys(SPRACH_NAMEN)) assert.ok(src.includes(`"${c}"`), c);
});
