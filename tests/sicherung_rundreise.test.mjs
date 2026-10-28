// Datensicherung (28.10.2026, Bauplan Prompt 12): sichern → App-Daten weg → einlesen liefert dieselben Cockpit-Zahlen;
// kaputte Datei wird abgewiesen; ein Jahr Daten in unter 3 Sekunden; Vorschau nennt Tage und Zeitraum.
import { test } from "node:test";
import assert from "node:assert/strict";
import { idbAttrappe } from "./hilfe/idb_attrappe.mjs";
import { jahresStand } from "./hilfe/jahr.mjs";
const st = await import("../js/store.js");
const { zaehler, monatsZiel } = await import("../js/zaehler.js");
const { sicherungZeitraum } = await import("../js/sicherung_stufe.js");
const U = await import("../js/util.js");

const cockpit = (b, H) => { const z = zaehler(b, { datum: H }); const m = monatsZiel(b, z, H); return JSON.stringify({ stand: z.stand, kosten: z.kostenMonat ?? null, stufe: m.stufe, fehltNull: m.fehltNull, ziel: m.ziel ?? null, nullpunkt: m.nullpunkt ?? null }); };

test("Sicherung Rundreise: ein Jahr Daten, gleiche Cockpit-Zahlen, unter 3 Sekunden", async () => {
  idbAttrappe(); await st.laden();
  const w = jahresStand(365); const b = w.betriebe[0];
  const tage = [U.heute(), U.heute(new Date(Date.now() - 40 * 86400e3)), U.heute(new Date(Date.now() - 200 * 86400e3))];
  const vorher = tage.map((H) => cockpit(b, H));
  const t0 = Date.now();
  const { blob } = await st.exportDatei(w);
  const r = await st.importSicherung(blob);
  const dauer = Date.now() - t0;
  assert.equal(r.pruefsumme, "ok");
  const b2 = r.wurzel.betriebe.find((x) => x.id === b.id); assert.ok(b2, "Laden in der Sicherung");
  assert.deepEqual(tage.map((H) => cockpit(b2, H)), vorher, "Cockpit nach dem Einlesen identisch");
  assert.ok(dauer < 3000, `sichern + einlesen ${dauer} ms`);
});

test("Sicherung: kaputte Datei wird mit Grund abgewiesen, kein Absturz", async () => {
  idbAttrappe(); await st.laden();
  await assert.rejects(st.importSicherung(new Blob([new Uint8Array([1, 2, 3, 4, 5])])), (e) => !!e);
  await assert.rejects(st.importSicherung(new Blob(['{"hallo":1}'])), (e) => !!e);
});

test("Sicherung: Vorschau nennt Anzahl Tage und Zeitraum", () => {
  const w = jahresStand(30); const z = sicherungZeitraum(w);
  assert.ok(z.tage >= 25 && z.tage <= 31, `tage ${z.tage}`);
  assert.equal(z.bis, U.heute()); assert.ok(z.von < z.bis);
  assert.deepEqual(sicherungZeitraum(st.leereWurzel()), { tage: 0, von: null, bis: null });
  assert.deepEqual(sicherungZeitraum(null), { tage: 0, von: null, bis: null });
});
