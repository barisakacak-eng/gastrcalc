// Unabhängige Diff-Durchsicht Pilotfest (30.10.2026), Funde 1, 4, 5: Ladenart-Abwahl, Bereich „ladenArten“ getrennt vom Betrieb, Welle-2-Listen beim Zusammenführen vereinigt.
import test from "node:test";
import assert from "node:assert/strict";
const i18n = await import("../js/i18n.js"); i18n.setzeSprache("de");
const st = await import("../js/store.js");
const { ladenArtUmschalten, wochenZaehlungSpeichern, spiessSpeichern, portionMessungSpeichern } = await import("../js/stamm.js");
const { LADEN_ARTEN } = await import("../js/screens/onboarding.js");
const art = (id) => LADEN_ARTEN.find((a) => a.id === id);

test("Fund 1: alles abgewählt → kein Format, keine Küchen, keine Art", () => {
  const s = { betrieb: { name: "T", format: null, kuechen: [] } };
  ladenArtUmschalten(s, art("foodtruck"), LADEN_ARTEN); assert.equal(s.betrieb.format, "foodtruck");
  ladenArtUmschalten(s, art("foodtruck"), LADEN_ARTEN);
  assert.equal(s.ladenArt, null); assert.deepEqual(s.ladenArten, []); assert.equal(s.betrieb.format, null); assert.deepEqual(s.betrieb.kuechen, []);
});
test("Fund 4: ladenArten ändert den Fingerabdruck „betrieb“ nicht", () => {
  const b = { betrieb: { name: "T" }, kanaele: [], verkauf: {}, ladenArt: "doener" };
  const h1 = st.bereichHash(b, "betrieb"); b.ladenArten = ["doener", "pizza"]; const h2 = st.bereichHash(b, "betrieb");
  assert.equal(h1, h2); assert.ok(st.BEREICHE.ladenArten);
});
test("Fund 5: Wochenzählungen, Spieße und Portionsmessungen beider Handys bleiben beim Zusammenführen erhalten", () => {
  const mach = () => { const s = structuredClone(st.leereWurzel()); const b = { id: "b1", betrieb: { name: "T" }, phase: "app", gerichte: [], artikel: [], kuehlstellen: [], kosten: [], team: {} }; s.betriebe.push(b); s.aktiv = "b1"; return b; };
  const a = mach(), f = mach();
  wochenZaehlungSpeichern(a, { datum: "2026-12-20", posten: { x: 1 }, jetzt: "2026-12-20T10:00:00Z" }); wochenZaehlungSpeichern(f, { datum: "2026-12-27", posten: { x: 2 }, jetzt: "2026-12-27T10:00:00Z" });
  spiessSpeichern(a, { datum: "2026-12-20", rohKg: 15, preisKg: 12, restKg: 1, portionen: 120, lieferant: "L" }); spiessSpeichern(f, { datum: "2026-12-21", rohKg: 15, preisKg: 12, restKg: 1, portionen: 125, lieferant: "L" });
  portionMessungSpeichern(a, { datum: "2026-12-20", gericht: "g", zutat: "Fleisch", soll: 100, ist: 112, einheit: "g" }); portionMessungSpeichern(f, { datum: "2026-12-22", gericht: "g", zutat: "Fleisch", soll: 100, ist: 98, einheit: "g" });
  const m = st.verschmelzen(a, f);
  assert.equal(m.wochenZaehlungen.length, 2); assert.equal(m.spiesse.length, 2); assert.equal(m.portionMessungen.length, 2);
  assert.deepEqual(m.spiesse.map((x) => x.datum), ["2026-12-20", "2026-12-21"]);
  const m2 = st.verschmelzen(m, f); assert.equal(m2.spiesse.length, 2, "kein Doppel beim zweiten Abgleich");
});
