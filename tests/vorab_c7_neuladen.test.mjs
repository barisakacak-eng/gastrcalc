// Vorab-Prüfung 03.11.2026, C7: Ein neuer Laden zeigte am ersten Tag „5 Tage ohne Umsatz-Eintrag“ (Wochen-Zeitraum zählte Tage vor der Anlage).
import { test } from "node:test";
import assert from "node:assert/strict";
const i18n = await import("../js/i18n.js"); i18n.setzeSprache("de");
const S = await import("../js/store.js"); const { ladenKennzahlen, eigentuemerZeitraum } = await import("../js/eigentuemer.js");
test("C7: Laden heute angelegt, heute ein Umsatz → erwartet 1 Tag, nichts fehlt; ältere Läden wie bisher", () => {
  const H = "2026-11-03"; const b = S.leererBetrieb(); b.phase = "app"; b.betrieb.name = "Neu"; b.betrieb.tageProWoche = 7; b.angelegt = H + "T10:00:00.000Z";
  b.tagesnotizen.push({ id: "t", datum: H, umsatz: 500, erfasst: H + "T20:00:00Z" });
  const z = eigentuemerZeitraum({ art: "woche" }, H); const k = ladenKennzahlen(b, z, { H, K: H });
  assert.equal(k.umsatz.erwartet, 1); assert.equal(k.umsatz.vollstaendig, true);
  b.angelegt = "2026-10-01T10:00:00.000Z"; b.tagesnotizen[0].datum = H;
  const k2 = ladenKennzahlen(b, z, { H, K: H }); assert.ok(k2.umsatz.erwartet >= 6, "älterer Laden: ganze Woche erwartet");
});
