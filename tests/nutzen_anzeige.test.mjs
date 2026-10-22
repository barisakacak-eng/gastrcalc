import test from "node:test";
import assert from "node:assert/strict";
import { nutzenAnzeige } from "../js/nutzen_anzeige.js";

test("Nutzen-Anschluss: ohne Daten keine scheinbar gemessene Null oder erfundenes Startdatum", () => {
  for (const x of [undefined, null, {}, { summe: 0, ab: "2026-02-31" }]) {
    const a = nutzenAnzeige(x);
    assert.equal(a.status, "nicht-verfuegbar"); assert.equal(a.ab, null);
    assert.deepEqual(a.posten, []); assert.equal(a.summeAnzeigbar, false);
  }
});
test("Nutzen-Anschluss: gemessen, geschätzt und fehlend getrennt; Lagerkapital bleibt gesondert", () => {
  const daten = { summe: 123, ab: "2026-10-01", posten: [
    { art: "muell", euro: 12, gemessen: true, quelle: "Fiktiver Testnachweis A" },
    { art: "preis", euro: 45, gemessen: false, quelle: "Fiktive Testschätzung" },
    { art: "lager", euro: 900, gemessen: true, quelle: "Fiktive Inventur" },
    { art: "papier", euro: 66, gemessen: true, quelle: "" },
  ] };
  const vorher = structuredClone(daten), a = nutzenAnzeige(daten);
  assert.deepEqual(daten, vorher, "Lesen verändert keinen Quelldatensatz");
  assert.deepEqual(a.posten.map((p) => p.status), ["gemessen", "schaetzung", "gemessen", "nicht-verfuegbar"]);
  assert.equal(a.posten[2].bereich, "lagerkapital"); assert.equal(a.posten[3].euro, null);
  assert.equal(a.summeVomKern, 123, "keine eigene Addition, auch nicht von Lagerkapital");
  assert.equal(a.summeAnzeigbar, false, "ohne belegte Kernregeln keine Summe aktivieren");
});
test("Nutzen-Anschluss: keine Umdeutung ungültiger Zahlen/Status, keine unbekannten Arten", () => {
  for (const euro of ["12", NaN, Infinity, -1, undefined]) {
    const a = nutzenAnzeige({ summe: euro, posten: [{ art: "muell", euro, gemessen: true, quelle: "Test" }] });
    assert.equal(a.posten[0].status, "nicht-verfuegbar"); assert.equal(a.summeVomKern, null);
  }
  assert.equal(nutzenAnzeige({ posten: [{ art: "muell", euro: 0, gemessen: "true", quelle: "Test" }] }).posten[0].euro, null);
  assert.deepEqual(nutzenAnzeige({ posten: [null, { art: "gewinn", euro: 99 }] }).posten, []);
});
