// 27.10.2026 (Baris): „Bis null“ ist fest + beweglich und bewegt sich jeden Tag; Laden und Büro zeigen dieselbe Rechnung.
import test from "node:test";
import assert from "node:assert/strict";
import { beispielLaden } from "../js/beispiel.js";
import { zaehler, monatsZiel } from "../js/zaehler.js";
import { heuteZiel } from "../js/laden_zahlen.js";
import { teamTagSetzen } from "../js/stamm.js";
import { tagesnotizSetzen } from "../js/engine.js";

test("Mitarbeiter heute bewegt bis null (Brutto × Arbeitgeberanteil)", () => {
  const s = beispielLaden("2026-10-26"); const H = "2026-10-26";
  const vor = monatsZiel(s, zaehler(s, { datum: H }), H).nullpunkt;
  teamTagSetzen(s, H, [{ person: null, name: "X", stunden: 16, satz: 20, art: "angestellt" }]);
  const z = zaehler(s, { datum: H }); const nach = monatsZiel(s, z, H).nullpunkt;
  assert.ok(z.lohnEchtTage === 1);
  assert.notEqual(Math.round(vor), Math.round(nach));
});

test("Laden-Stufe = Monatsziel-Stufe (keine zwei Wahrheiten)", () => {
  const s = beispielLaden("2026-10-26");
  for (const H of ["2026-10-05", "2026-10-15", "2026-10-22", "2026-10-26"]) {
    const z = zaehler(s, { datum: H }); const m = monatsZiel(s, z, H); const w = heuteZiel(s, z, H);
    assert.equal(w.stufe, m.stufe, H);
    if (w.stufe === "bisNull") assert.ok(Math.abs(w.zahl - m.fehltNull) < 1e-6, H);
  }
});

test("Vergessene erste Tage sparen keine festen Kosten", () => {
  const s = beispielLaden("2026-10-26"); s.angelegt = "2026-09-01T08:00:00Z";
  const mit = zaehler(s, { datum: "2026-10-20" });
  s.tagesnotizen = s.tagesnotizen.filter((x) => x.datum > "2026-10-05");
  const ohne = zaehler(s, { datum: "2026-10-20" });
  assert.equal(ohne.start, "2026-10-01");
  assert.ok(Math.abs(ohne.kosten - mit.kosten) < 1e-6);
});

test("Umsatz senkt bis null", () => {
  const s = beispielLaden("2026-10-26"); const H = "2026-10-08";
  const a = monatsZiel(s, zaehler(s, { datum: H }), H).fehltNull;
  tagesnotizSetzen(s, H, 5000); // der Tag war ≈ 900 €, jetzt deutlich mehr
  const b = monatsZiel(s, zaehler(s, { datum: H }), H).fehltNull;
  assert.ok(a > 0 && b < a);
});
