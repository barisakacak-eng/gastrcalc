// Vorab-Prüfung 03.11.2026, C6: „50 % bleibt übrig. Weniger vorbereiten.“ bei allen Gerichten der Prüfdaten.
// Nachgestellt: ohne Verkaufsmengen rechnet die App mit 1 Stück je Tag (Platzhalter); 1 Portion Müll je Tag → 1 ÷ (1 + 1) = 50 %.
// Goldwert von Hand: Döner 10 am Tag verkauft, an 3 Tagen je 2 Portionen übrig → 6 ÷ (10 × 3 + 6) = 16,7 % (> 15 %, Setzung) → Hinweis „17 %“.
import { test } from "node:test";
import assert from "node:assert/strict";
import { zuVielVorbereitet } from "../js/ware.js";
const S = await import("../js/store.js");
const laden = (mengeTag) => { const b = S.leererBetrieb(); b.betrieb.tageProWoche = 6; b.gerichte = [{ id: "d", name: "Döner", preis: 7.5, klasse: "haupt", zutaten: [], ...(mengeTag ? { mengeTag } : {}) }];
  for (const [d, m] of [["2026-11-02", 2], ["2026-11-03", 2], ["2026-11-04", 2]]) b.schwund.push({ id: d, datum: d, art: "nichtverkauft", ref: { typ: "gericht", id: "d" }, menge: m, erfasst: d + "T20:00:00Z" });
  return b; };
test("C6: mit echter Verkaufsmenge 10/Tag → 16,7 %; ohne Menge (Platzhalter 1/Tag) keine Aussage", () => {
  const r = zuVielVorbereitet(laden(10), "2026-11-04"); assert.equal(r.length, 1); assert.ok(Math.abs(r[0].anteil - 6 / 36) < 1e-9);
  assert.deepEqual(zuVielVorbereitet(laden(null), "2026-11-04"), [], "Platzhalter-Menge → kein „bleibt übrig“");
});
