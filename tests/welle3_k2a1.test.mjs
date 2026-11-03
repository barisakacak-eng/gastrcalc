// Welle 3, K2 A1 (Hochtouren 03.11.2026): Liegt der Monat über dem Ziel, ist im Büro (Schalter window.__gcW3) das Netto-Ergebnis am Monatsende
// die große Zahl; der Umsatz über dem Ziel steht darunter. Ohne Schalter bleibt alles wie live.
import { test } from "node:test";
import assert from "node:assert/strict";
const i18n = await import("../js/i18n.js"); i18n.setzeSprache("de");
const { zaehlerKarte } = await import("../js/screens/home.js");
const { fmtEuro } = await import("../js/util.js");
const z = { monatsende: 2345.4, lohnEchtTage: 3, unvollstaendig: false, stand: 900, keinUmsatz: false };
const w = { zahl: 1200, stufe: "ueberZiel", m: { nullpunkt: 9000, geschaetzt: false } };
test("K2 A1: über dem Ziel → mit Schalter Netto-Ergebnis groß, Umsatz über Ziel klein; ohne Schalter wie bisher", () => {
  delete globalThis.__gcW3; const alt = zaehlerKarte(z, "2026-11-20", { tipp: false, ziel: w });
  assert.ok(alt.includes(`+ ${fmtEuro(1200, { dezimal: 0 })}`) && !alt.includes(i18n.t("zaehler.ergebnisMonatsende", "November")));
  globalThis.__gcW3 = true; const neu = zaehlerKarte(z, "2026-11-20", { tipp: false, ziel: w }); delete globalThis.__gcW3;
  assert.match(neu, new RegExp(`<span class="riesig">\\+ ${fmtEuro(2345.4, { dezimal: 0 }).replace(/\./g, "\\.")}</span>`));
  assert.ok(neu.includes(i18n.t("zaehler.ueberZielZeile", fmtEuro(1200, { dezimal: 0 }))));
});
