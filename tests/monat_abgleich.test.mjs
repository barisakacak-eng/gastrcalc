// Lauf 3, Phase 6: Abgleich zweier Handys – Monatsabschlüsse dürfen beim Zusammenführen nicht still verloren gehen (Rundreise über JSON)
import test from "node:test";
import assert from "node:assert/strict";
import { leererBetrieb, verschmelzen } from "../js/store.js";

const laden = () => { const b = leererBetrieb(); b.id = "L1"; b.betrieb = { name: "T", format: "imbiss" }; return b; };
const ab = (monat, eingefroren, umsatz) => ({ monat, eingefroren, umsatzBrutto: umsatz, umsatzNetto: umsatz / 1.07, ware: 0, quote: null, personal: 0, personalQuote: null, ergebnis: 0, geschaetzt: false });

test("Handy B hat November abgeschlossen, Handy A Oktober: nach dem Abgleich hat jedes beide", () => {
  const a = laden(); a.monatsabschluesse = [ab("2026-10", "2026-11-02T10:00:00.000Z", 9000)];
  const b = JSON.parse(JSON.stringify(laden())); b.monatsabschluesse = [ab("2026-11", "2026-12-01T10:00:00.000Z", 9500)];
  const m1 = verschmelzen(a, JSON.parse(JSON.stringify(b)));
  assert.deepEqual(m1.monatsabschluesse.map((x) => x.monat).sort(), ["2026-10", "2026-11"]);
  const m2 = verschmelzen(b, JSON.parse(JSON.stringify(a)));
  assert.deepEqual(m2.monatsabschluesse.map((x) => x.monat).sort(), ["2026-10", "2026-11"]);
  const rund = verschmelzen(JSON.parse(JSON.stringify(m1)), JSON.parse(JSON.stringify(m2)));
  assert.equal(rund.monatsabschluesse.length, 2, "Rundreise: keine Dopplung");
});

test("beide Handys haben denselben Monat abgeschlossen: der frühere bleibt gültig, der spätere steht als ersetzt da (nichts still weg)", () => {
  const a = laden(); a.monatsabschluesse = [ab("2026-11", "2026-12-01T10:00:00.000Z", 9500)];
  const b = laden(); b.monatsabschluesse = [ab("2026-11", "2026-12-02T09:00:00.000Z", 9600)];
  for (const m of [verschmelzen(a, structuredClone(b)), verschmelzen(b, structuredClone(a))]) {
    const g = m.monatsabschluesse.filter((x) => x.monat === "2026-11" && !x.ersetzt);
    assert.equal(g.length, 1); assert.equal(g[0].umsatzBrutto, 9500);
    assert.equal(m.monatsabschluesse.length, 2);
  }
});
