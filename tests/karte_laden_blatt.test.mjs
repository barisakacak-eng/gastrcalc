// 27.10.2026 (Baris-Foto 23:49): Beim Tippen des Preises stand „Wohin geht dein Preis?“ dreimal da – app.js ersetzte nur „Bleibt dir“.
import test from "node:test";
import assert from "node:assert/strict";
import { beispielLaden } from "../js/beispiel.js";
import { karteLadenAktion, karteLadenEingabe, karteLadenTeile, karteLadenBlatt, karteLadenZuruecksetzen } from "../js/screens/karte_laden.js";

test("Preis-Blatt: „Bleibt dir“ und „Wohin geht dein Preis?“ stecken in EINER austauschbaren Hülle", () => {
  karteLadenZuruecksetzen();
  const s = beispielLaden("2026-10-26"); const g = s.gerichte.find((x) => typeof x.preis === "number");
  karteLadenAktion("kl-auf", { dataset: { id: g.id } }, s);
  const html = karteLadenBlatt(s);
  assert.equal((html.match(/kl-bleibt-teil/g) || []).length, 1);
  assert.ok((html.match(/class="kl-wohin"/g) || []).length <= 1);
  for (const w of ["5", "5,", "5,5"]) { assert.equal(karteLadenEingabe("kl-preis", w), "teil"); const t = karteLadenTeile(s); assert.ok(t.bleibt.startsWith('<div class="kl-bleibt-teil">'), w); }
  // „app.js tauscht die ganze Hülle aus“ (Verdrahtung): Wächter in tests/quelltext_waechter_teil1.mjs
  karteLadenZuruecksetzen();
});
