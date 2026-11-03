// Vorab-Prüfung 03.11.2026, C10: Buchhalter-Vorschau zeigte „Personalessen/Belege/Reinigungsmittel – liegt bei“, obwohl die Listen leer waren.
import { test } from "node:test";
import assert from "node:assert/strict";
const i18n = await import("../js/i18n.js"); i18n.setzeSprache("de");
const { inhaltAbschnitt } = await import("../js/ordner_text.js");
test("C10: Inhalt-Abschnitt – leere Liste „leer – nichts erfasst“, volle Liste „liegt bei“", () => {
  const dok = { abschnitte: [{ titel: "Personalessen", zeilen: [] }, { titel: "Belege", zeilen: [["1"]] }] };
  const z = inhaltAbschnitt(dok, "buch").zeilen;
  assert.equal(z[0].zellen[3], i18n.t("ordnerC.leer")); assert.equal(z[1].zellen[3], i18n.t("ordnerC.liegtBei"));
});
