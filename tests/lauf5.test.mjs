// Lauf 5 (12.11.2026): L15b live, Abgaben-Satz je Mitarbeiterart (Baris 11.11. 23:14)
import { test } from "node:test";
import assert from "node:assert/strict";

// Goldwert von Hand (js/data/lohnkosten.js, Stand 2026):
// Angestellt: 21,15 % + 2,69 % + BGN 1,04 % = 24,88 %   Minijob: 31,17 % + 1,04 % = 32,21 %
// Tag 1: Angestellt 16 h × 14 € = 224 € Brutto → 224 × 0,2488 = 55,7312 €
// Tag 2: Minijob 10 h × 13 € = 130 € Brutto → 130 × 0,3221 = 41,873 €
// gewichtet: (55,7312 + 41,873) / 354 = 97,6042 / 354 = 0,275718… → „≈ 28 %“
test("Abgaben: Angestellte ≈ 25 %, Minijob ≈ 32 %, gemischt gewichtet ≈ 28 %", async () => {
  const { abgabenSatz } = await import("../js/stamm.js");
  const tag = (datum, art, stunden, satz) => ({ datum, keine: false, eintraege: [{ person: null, kompakt: true, personen: 1, stunden, satz, art }] });
  const a = { teamTage: [tag("2026-11-02", "angestellt", 16, 14)] }, m = { teamTage: [tag("2026-11-03", "minijob", 10, 13)] };
  assert.deepEqual([Math.round(abgabenSatz(a, "2026-11-01", "2026-11-30").satz * 100), abgabenSatz(a, "2026-11-01", "2026-11-30").art], [25, "angestellt"]);
  assert.deepEqual([Math.round(abgabenSatz(m, "2026-11-01", "2026-11-30").satz * 100), abgabenSatz(m, "2026-11-01", "2026-11-30").art], [32, "minijob"]);
  const g = abgabenSatz({ teamTage: [...a.teamTage, ...m.teamTage] }, "2026-11-01", "2026-11-30");
  assert.equal(g.art, "gemischt"); assert.ok(Math.abs(g.satz - 97.6042 / 354) < 1e-9); assert.equal(Math.round(g.satz * 100), 28);
  assert.equal(abgabenSatz({ teamTage: [] }, "2026-11-01", "2026-11-30"), null, "nur Monats-Lohnsumme: kein Satz (Abgaben schon drin)");
  assert.equal(abgabenSatz({ teamTage: [tag("2026-10-30", "minijob", 10, 13)] }, "2026-11-01", "2026-11-30"), null, "Vormonat zählt nicht");
});
test("L15b ist Standard: Kühl-Alarm kurz, ohne window-Schalter", async () => {
  delete globalThis.__gcL15b; const { l15b, l15bAn } = await import("../js/data/l15b_texte.js");
  assert.equal(l15bAn(), true); assert.equal(l15b("de", "warm", "Kühlschrank 1"), "Kühlschrank 1 zu warm. Gleich nachsehen.");
  assert.equal(l15b("de", "abgaben", "28", "gemischt"), "Mit ≈ 28 % Abgaben des Arbeitgebers (Angestellte und Minijob, gewichtet).");
});
