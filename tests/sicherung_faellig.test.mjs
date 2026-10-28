// Sicherung Stufe 1 (Masterauftrag 0.3): Zeki erinnert bei „nie“, nach 7 Tagen und in der ersten Monatswoche.
import { test } from "node:test";
import assert from "node:assert/strict";
import { sicherungFaellig } from "../js/sicherung_stufe.js";
import { leereWurzel, leererBetrieb } from "../js/store.js";
import { zekiMoment } from "../js/zeki.js";

const mitEintraegen = (n) => { const w = leereWurzel(); w.betriebe.push(leererBetrieb()); const b = w.betriebe[0]; b.tagesnotizen = Array.from({ length: n }, (_, i) => ({ datum: `2026-10-${String(i + 1).padStart(2, "0")}`, umsatz: 500, erfasst: "2026-10-01T20:00:00Z" })); return w; };
const t = (iso) => Date.parse(iso);

test("nie gesichert: erst ab 5 Einträgen", () => {
  assert.equal(sicherungFaellig(mitEintraegen(2), t("2026-10-20T12:00:00")), null);
  assert.deepEqual(sicherungFaellig(mitEintraegen(6), t("2026-10-20T12:00:00")), { grund: "nie", tage: null });
});

test("Woche und Monat", () => {
  const w = mitEintraegen(6); w.letzteSicherung = "2026-10-20T10:00:00.000Z"; w.sicherungZaehler = 3;
  assert.equal(sicherungFaellig(w, t("2026-10-24T12:00:00")), null);
  assert.equal(sicherungFaellig(w, t("2026-10-27T12:00:00")).grund, "woche");
  w.letzteSicherung = "2026-10-29T10:00:00.000Z";
  assert.deepEqual(sicherungFaellig(w, t("2026-11-02T12:00:00")), { grund: "monat", tage: 4 });
  assert.equal(sicherungFaellig(w, t("2026-11-09T12:00:00")).grund, "woche"); // 11 Tage
  w.sicherungZaehler = 1e9; w.letzteSicherung = "2026-10-31T10:00:00.000Z";
  assert.equal(sicherungFaellig(w, t("2026-11-02T12:00:00")), null); // nichts Neues seit der Sicherung
});

test("Zeki sagt etwas, auch wenn nie gesichert", () => {
  const w = mitEintraegen(6);
  const m = zekiMoment(w.betriebe[0], { H: "2026-10-20", nur: ["sicherung_alt"], sicherung: { grund: "nie", tage: null } });
  assert.ok(m && m.ausloeser === "sicherung_alt" && !/\{tage\}/.test(m.text), JSON.stringify(m));
});
