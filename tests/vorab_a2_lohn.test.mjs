// Vorab-Prüfung 03.11.2026, A2: „Personal“ als Monatsbetrag (5.800 €) plus Tageslöhne im Umsatz (2 × 8 h × 14 €).
// Befund nachgestellt: Der Tagesabschluss zeigte „Tagesfixkosten“ MIT dem anteiligen Monatslohn (5.800 € ÷ ≈ 25,71 Tage ≈ 225,55 €) und darunter
// „Löhne heute“ – der Lohn sah doppelt aus. Gerechnet (Zähler) wurde richtig: Tageslohn ERSETZT den Monatsbetrag.
// Goldwert von Hand: Tageslohn 2 × 8 h × 14,00 € = 224,00 € brutto × (1 + AG-Anteil angestellt) ≈ 279,73 €;
// Tagesfixkosten ohne Lohn = eigener Lohn (geschätzt) und feste Kosten je Öffnungstag; Kosten des Tages = Fix ohne Lohn + Tageslohn.
import { test } from "node:test";
import assert from "node:assert/strict";
const i18n = await import("../js/i18n.js"); i18n.setzeSprache("de");
const S = await import("../js/store.js"); const { zaehler } = await import("../js/zaehler.js");
const { teamTagSetzen } = await import("../js/stamm.js"); const { heute } = await import("../js/util.js");
const { kostenJeStunde } = await import("../js/data/lohnkosten.js");
const A = await import("../js/screens/abschluss.js");
const r2 = (x) => Math.round(x * 100) / 100;

test("A2: Monatslohn 5.800 € + Tageslöhne → Tagesabschluss zeigt Fixkosten OHNE Monatslohn, Tageslohn einmal", () => {
  const b = S.leererBetrieb(); b.phase = "app"; b.betrieb.tageProWoche = 6; const H = heute(); b.team = { ...b.team, lohnkosten: 5800 };
  b.tagesnotizen.push({ id: "t", datum: H, umsatz: 1000, erfasst: new Date().toISOString() });
  teamTagSetzen(b, H, [{ name: "A", stunden: 8, satz: 14 }, { name: "B", stunden: 8, satz: 14 }]);
  const z = zaehler(b, { datum: H }); const tag = z.tage.find((x) => x.datum === H);
  assert.equal(r2(tag.lohn), r2(2 * kostenJeStunde(14, "angestellt") * 8), "Tageslohn = 2 × 8 h × Kosten je Stunde");
  assert.ok(Math.abs(tag.lohn - 279.73) < 0.01, "≈ 279,73 €");
  assert.ok(z.tageskosten - z.tageskostenFest > 200, "tageskosten enthält den anteiligen Monatslohn (≈ 225,55 €), tageskostenFest nicht");
  assert.ok(Math.abs((z.tageskosten - z.tageskostenFest) - 5800 / z.gewichtMonat) < 0.01);
  A.abschlussAktion("abschluss-fertig", null, b, null);
  const h = A.abschlussView(b); A.abschlussZuruecksetzen();
  const fix = i18n.t("abschluss.fixTag"); const m = h.match(new RegExp(fix + "</span><span class=\"wert\">− ([^<]+)<"));
  assert.ok(!m[1].includes(String(Math.round(z.tageskosten))), `zeigt nicht mehr ${z.tageskosten}`);
  assert.ok(m[1].replace(/\D/g, "").startsWith(String(Math.round(z.tageskostenFest))), `zeigt ${z.tageskostenFest} (${m[1]})`);
});
