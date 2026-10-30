// Pilotfest P6 (1), 30.10.2026: mehrere Ladenarten zugleich – Rechenwerk (Setzer, Profil, Vorlagen-Enge, Putzplan-Geräte, Sicherung).
import test from "node:test";
import assert from "node:assert/strict";
const i18n = await import("../js/i18n.js"); i18n.setzeSprache("de");
const { ladenArtSetzen, ladenArtUmschalten } = await import("../js/stamm.js");
const { ladenArtVon, ladenArtenVon, profilFuer, vorlagenEngeFuer, vorlagenSortiert } = await import("../js/profil.js");
const { planVorschlag } = await import("../js/putzplan.js");
const { LADEN_ARTEN } = await import("../js/screens/onboarding.js");
const { GERAETE_JE_ART } = await import("../js/data/putzplan.js");
const st = await import("../js/store.js");
const frisch = () => ({ betrieb: { name: "T", format: null, kuechen: [] }, gerichte: [], artikel: [], kuehlstellen: [] });
const art = (id) => LADEN_ARTEN.find((a) => a.id === id);

test("eine Art wie bisher: ladenArt und ladenArten stimmen überein", () => {
  const s = frisch(); ladenArtSetzen(s, art("doener"));
  assert.equal(ladenArtVon(s), "doener"); assert.deepEqual(ladenArtenVon(s), ["doener"]); assert.deepEqual(s.betrieb.kuechen, ["doener"]);
});
test("alter Stand ohne ladenArten: genau die eine ladenArt", () => {
  assert.deepEqual(ladenArtenVon({ ladenArt: "pizza", betrieb: {} }), ["pizza"]);
  assert.deepEqual(ladenArtenVon({ betrieb: { format: "cafe", kuechen: [] } }), ["cafe"]);
});
test("Döner + Pizza: Hauptart Döner, Küchen vereint, Profil vereint, Enge vereint, Putzplan-Geräte vereint", () => {
  const s = frisch(); ladenArtUmschalten(s, art("doener"), LADEN_ARTEN); ladenArtUmschalten(s, art("pizza"), LADEN_ARTEN);
  assert.equal(ladenArtVon(s), "doener"); assert.deepEqual(ladenArtenVon(s), ["doener", "pizza"]);
  assert.deepEqual([...s.betrieb.kuechen].sort(), ["doener", "pizza"]); assert.equal(s.betrieb.format, "imbiss");
  const p = profilFuer(s); for (const b of ["doener", "pizza", "salat", "beilagen"]) assert.ok(p.kern.includes(b), "Kern hat " + b);
  const enge = vorlagenEngeFuer(s); const nurD = vorlagenEngeFuer({ ladenArt: "doener", betrieb: {} }), nurP = vorlagenEngeFuer({ ladenArt: "pizza", betrieb: {} });
  for (const b of Object.keys(enge)) { assert.ok(nurD[b] && nurP[b], "Enge nur, wenn beide Arten eine haben: " + b); for (const n of [...nurD[b], ...nurP[b]]) assert.ok(enge[b].includes(n), n); }
  const g = new Set(planVorschlag(s).geraete); for (const x of [...GERAETE_JE_ART.doener, ...GERAETE_JE_ART.pizza]) assert.ok(g.has(x), "Gerät " + x);
  assert.ok(g.has("grill_spiess") && g.has("pizzaofen"));
  const v = vorlagenSortiert(s); const namen = [...v.kern, ...v.oft].map((x) => x.name);
  assert.ok(namen.some((n) => /Döner/.test(n)) && namen.some((n) => /Pizza/.test(n)), "Vorlagen beider Arten vorn");
});
test("abwählen: zweite Art weg → wieder eine Art; Hauptart weg → nächste rückt nach; alles weg → kein Weiter (ladenArt null)", () => {
  const s = frisch(); ladenArtUmschalten(s, art("doener"), LADEN_ARTEN); ladenArtUmschalten(s, art("asia"), LADEN_ARTEN);
  ladenArtUmschalten(s, art("doener"), LADEN_ARTEN); assert.deepEqual(ladenArtenVon(s), ["asia"]); assert.equal(s.ladenArt, "asia"); assert.deepEqual(s.betrieb.kuechen, ["asiatisch"]);
  ladenArtUmschalten(s, art("asia"), LADEN_ARTEN); assert.equal(s.ladenArt, null); assert.deepEqual(s.ladenArten, []);
});
test("Sicherung: ladenArten überlebt Export und Import (Rundreise)", async () => {
  const { idbAttrappe } = await import("./hilfe/idb_attrappe.mjs"); idbAttrappe(); await st.laden();
  const { jahresStand } = await import("./hilfe/jahr.mjs");
  const w = jahresStand(10); const b = w.betriebe[0];
  for (const id of ["doener", "pizza"]) if (!ladenArtenVon(b).includes(id)) ladenArtUmschalten(b, art(id), LADEN_ARTEN);
  const erwartet = [...ladenArtenVon(b)]; assert.ok(erwartet.length >= 2, erwartet.join());
  const { blob } = await st.exportDatei(w);
  const r = await st.importSicherung(blob); assert.equal(r.pruefsumme, "ok");
  const b2 = r.wurzel.betriebe.find((x) => x.id === b.id);
  assert.deepEqual(b2.ladenArten, erwartet); assert.equal(b2.ladenArt, erwartet[0]);
  assert.deepEqual(planVorschlag(b2).geraete, planVorschlag(b).geraete);
});
