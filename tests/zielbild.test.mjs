// Zielbild 15.10.: Monatsziel im Cockpit, Gerichte im Vergleich, Kiosk-Profil, Symbole
import test from "node:test";
import assert from "node:assert/strict";
globalThis.document ??= { documentElement: {} };
import { leererBetrieb } from "../js/store.js";
import { tagesnotizSetzen } from "../js/engine.js";
import { zaehler } from "../js/zaehler.js";
import { monatsZiel } from "../js/screens/home.js";
import { vergleichView, vergleichModus } from "../js/screens/vergleich.js";
import { sym, SYMBOLE } from "../js/symbole.js";
import { PROFILE } from "../js/data/register.js";
import { LADEN_ARTEN } from "../js/screens/onboarding.js";

const laden = () => {
  const s = leererBetrieb(); s.phase = "app";
  s.kosten = [{ id: "k", kategorie: "miete", posten: "miete", betrag: 2000, status: "bekannt", periode: "monat", basis: "netto" }];
  s.team = { personen: 1, stundenProPerson: 160, lohnkosten: 1000, eigenerLohn: 0, eigenerLohnStatus: "eigen" };
  s.verkauf.warenQuote = 0.3;
  s.gerichte = [
    { id: "a", name: "Döner", klasse: "haupt", zeit: 4, preis: 7.49, steuer: 0.07, zutaten: [{ name: "Dönerspieß Kalb/Pute", menge: 180, einheit: "g" }] },
    { id: "b", name: "Pide", klasse: "haupt", zeit: 8, preis: 10.7, steuer: 0.07, zutaten: [{ name: "Pide-Teig", menge: 250, einheit: "g" }] }];
  s.artikel = [{ name: "Dönerspieß Kalb/Pute", gruppe: "fleisch", einheit: "kg", packung: { menge: 10, einheit: "kg" }, preis: 90, preisBasis: "netto", benutzt: true },
    { name: "Pide-Teig", gruppe: "teig", einheit: "kg", packung: { menge: 1, einheit: "kg" }, preis: 1, preisBasis: "netto", benutzt: true }];
  return s;
};

test("Monatsziel: Kosten / (1 − Quote) × (1 + MwSt), Umsatz und Fehlbetrag passen zusammen", () => {
  const s = laden(); const H = "2026-10-15";
  tagesnotizSetzen(s, "2026-10-02", 500); tagesnotizSetzen(s, "2026-10-14", 700);
  const z = zaehler(s, { datum: H }); const m = monatsZiel(s, z, H);
  const erwartet = (z.last.gesamt + z.sonder.summe) / (1 - z.quoteEff) * (1 + z.steuer);
  assert.ok(Math.abs(m.ziel - erwartet) < 1e-6); assert.equal(m.umsatz, 1200);
  assert.ok(Math.abs(m.fehlt - (m.ziel - 1200)) < 1e-6); assert.equal(m.tage.length, 15); assert.equal(m.tage[14].kumuliert, 1200);
});

test("ohne Kosten kein Ziel", () => {
  const s = leererBetrieb(); s.team.eigenerLohnStatus = "offen"; const z = zaehler(s, { datum: "2026-10-15" }); // ohne Richtwert-Lohn
  assert.equal(monatsZiel(s, z, "2026-10-15").ziel, null);
});

test("Gerichte im Vergleich: Sortierung nach Deckungsbeitrag und nach Marge", () => {
  const s = laden();
  vergleichModus("db"); let h = vergleichView(s);
  assert.ok(h.indexOf("Pide") < h.indexOf("Döner"), "Pide hat den höheren Deckungsbeitrag"); // Pide: 10/1,07 − 0,25 ≈ 9,75; Döner: 7/1,07 − 16,2 < 0
  vergleichModus("marge"); h = vergleichView(s); assert.ok(h.includes("vk-balken"));
  vergleichModus("db");
});

test("Kiosk hat ein Profil, Symbole sind vollständig", () => {
  assert.ok(LADEN_ARTEN.some((a) => a.id === "kiosk") && PROFILE.kiosk);
  for (const n of ["trash-2", "scale", "camera", "chart-column", "shopping-cart", "snowflake", "target", "leaf", "menu", "check"]) assert.ok(SYMBOLE[n], n);
  assert.match(sym("check"), /^<svg class="sym/);
});
