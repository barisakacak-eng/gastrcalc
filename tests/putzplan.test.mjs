// Putzplan nach HACCP-Empfehlung (15.10.2026)
import test from "node:test";
import assert from "node:assert/strict";
import { AUFGABEN, GERAETE } from "../js/data/putzplan.js";
import { planVorschlag, aufgabenFuer, aufgabenStand, planGruppen, abhaken, zuruecknehmen, nachweis } from "../js/putzplan.js";
import { leererBetrieb } from "../js/store.js";

test("Aufgaben vollständig und gültig", () => {
  const ids = new Set(); for (const a of AUFGABEN) { assert.ok(!ids.has(a.id)); ids.add(a.id);
    assert.ok(["nach", "tag", "woche", "monat", "quartal", "jahr", "zweijahre"].includes(a.takt), a.id); assert.ok(["pflicht", "empfehlung", "praxis"].includes(a.stufe));
    assert.ok(a.gilt === "alle" || GERAETE.includes(a.gilt), a.id); for (const l of ["de", "tr", "en"]) assert.ok(a.text[l]?.length > 5, a.id + l); assert.ok(a.quellen); }
});
test("Dönerladen bekommt Grill und Fritteuse, aber keinen Pizzaofen; Kühlstellen ergänzen Geräte", () => {
  const b = leererBetrieb(); b.ladenArt = "doener"; b.kuehlstellen = [{ name: "Theke vorne", art: "kuehl" }];
  const p = planVorschlag(b); assert.ok(p.geraete.includes("grill_spiess") && p.geraete.includes("saladette")); assert.ok(!p.geraete.includes("pizzaofen"));
  const ids = aufgabenFuer(p).map((a) => a.id); assert.ok(ids.includes("R09") && ids.includes("R11")); assert.ok(!ids.includes("R14")); assert.ok(!ids.includes("R36"));
});
test("Fällig, erledigt, überfällig, zurücknehmen", () => {
  const b = leererBetrieb(); b.ladenArt = "doener"; b.putzplan = { ...planVorschlag(b), aktiv: true, seit: "2026-10-01" };
  let s = aufgabenStand(b, "2026-10-15"); const r16 = s.find((a) => a.id === "R16"); assert.equal(r16.status, "ueberfaellig"); // 14 Tage, nie gemacht
  assert.equal(s.find((a) => a.id === "R02").status, "hinweis");
  abhaken(b, "R16", { datum: "2026-10-15" }); abhaken(b, "R01", { datum: "2026-10-15" });
  s = aufgabenStand(b, "2026-10-15"); assert.equal(s.find((a) => a.id === "R16").status, "erledigt"); assert.equal(s.find((a) => a.id === "R01").status, "erledigt");
  assert.equal(aufgabenStand(b, "2026-10-16").find((a) => a.id === "R01").status, "faellig"); // Tagesaufgabe am nächsten Tag wieder fällig
  assert.equal(aufgabenStand(b, "2026-10-21").find((a) => a.id === "R16").status, "erledigt"); // Woche noch nicht um
  assert.ok(zuruecknehmen(b, "R01", "2026-10-15")); assert.equal(aufgabenStand(b, "2026-10-15").find((a) => a.id === "R01").status, "ueberfaellig"); // seit 14 Tagen nie gemacht
  assert.equal(nachweis(b, "2026-10-01", "2026-10-31").length, 1); assert.equal(b.putzlog.length, 2); // nichts gelöscht
  const g = planGruppen(b, "2026-10-15"); assert.ok(g.gesamt > 15 && g.erledigt === 1);
});
