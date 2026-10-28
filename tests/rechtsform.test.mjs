// Rechtsform (Baris 23.10.2026): fünf Formen plus unbekannt; Hinweis-Karten filtern danach; Büro zeigt „Rechtsform eintragen“.
import test from "node:test";
import assert from "node:assert/strict";
import { leererBetrieb } from "../js/store.js";
import { RECHTSFORMEN, PERSONEN, KAPITAL, rechtsform, rechtsformSetzen, rechtsformBekannt, istPersonen, istKapital, passtZurRechtsform } from "../js/rechtsform.js";
import { hinweiseFuer, HINWEISE } from "../js/hinweis.js";
import { offenImBuero } from "../js/offen.js";

function laden() { const b = leererBetrieb(); b.betrieb = { name: "Test", format: "imbiss" }; for (let i = 1; i <= 5; i++) b.abschluesse.push({ id: "a" + i, datum: "2026-10-0" + i }); return b; }

test("sechs Werte, Gruppen überschneiden sich nicht, unbekannt gehört zu keiner", () => {
  assert.equal(RECHTSFORMEN.length, 6);
  for (const p of PERSONEN) assert.ok(!KAPITAL.includes(p));
  assert.ok(!PERSONEN.includes("unbekannt") && !KAPITAL.includes("unbekannt"));
});

test("leerer Laden: unbekannt; setzen nur mit bekannten Werten; gleicher Wert ändert nichts", () => {
  const s = laden(); assert.equal(rechtsform(s), "unbekannt"); assert.equal(rechtsformBekannt(s), false);
  assert.equal(rechtsformSetzen(s, "ag"), false); assert.equal(rechtsform(s), "unbekannt");
  assert.equal(rechtsformSetzen(s, "gmbh"), true); assert.equal(rechtsformSetzen(s, "gmbh"), false);
  assert.equal(istKapital(s), true); assert.equal(istPersonen(s), false);
  rechtsformSetzen(s, "einzel"); assert.equal(istPersonen(s), true);
});

test("Karte Sachentnahme nur für Einzelunternehmen, GbR, KG/OHG – nie für GmbH, UG oder unbekannt", () => {
  const s = laden();
  const ids = () => hinweiseFuer(s).map((h) => h.id);
  assert.ok(!ids().includes("sachentnahme"), "unbekannt");
  rechtsformSetzen(s, "gmbh"); assert.ok(!ids().includes("sachentnahme"), "gmbh");
  rechtsformSetzen(s, "ug"); assert.ok(!ids().includes("sachentnahme"), "ug");
  for (const r of PERSONEN) { rechtsformSetzen(s, r); assert.ok(ids().includes("sachentnahme"), r); }
  assert.ok(ids().includes("steuer_sieben"), "Karten für alle bleiben");
});

test("GmbH-Karten nur für GmbH und UG, nie für Personen oder unbekannt", () => {
  const s = laden(); const ids = () => hinweiseFuer(s).map((h) => h.id);
  const gmbh = ["gmbh_chefessen", "gmbh_bilanz", "gmbh_gewerbesteuer"];
  for (const g of gmbh) assert.ok(!ids().includes(g), g + " unbekannt");
  rechtsformSetzen(s, "einzel"); for (const g of gmbh) assert.ok(!ids().includes(g), g + " einzel");
  for (const r of KAPITAL) { rechtsformSetzen(s, r); for (const g of gmbh) assert.ok(ids().includes(g), g + " " + r); assert.ok(!ids().includes("sachentnahme")); }
});

test("jede Karte nennt rechtsformen; passtZurRechtsform ohne Feld = alle", () => {
  for (const h of HINWEISE) assert.ok(h.rechtsformen === "alle" || Array.isArray(h.rechtsformen), h.id);
  assert.equal(passtZurRechtsform({ titel: "x" }, laden()), true);
});

test("Büro-Chip „Rechtsform eintragen“ nur, solange sie unbekannt ist", () => {
  const s = laden(); const w = { betriebe: [s], aktiv: s.id };
  assert.ok(offenImBuero(s, w).some((o) => o.id === "rechtsform"));
  rechtsformSetzen(s, "einzel"); assert.ok(!offenImBuero(s, w).some((o) => o.id === "rechtsform"));
});

// 28.10.2026 (Einrichtung kürzen): die Rechtsform steht nicht mehr in der Einrichtung – weder im genauen Weg noch im Schnellweg.
// Auswahl im Büro (Einstellungen) und die Erinnerung „Rechtsform fehlt“ (offenImBuero, oben) bleiben; weitere Prüfungen in tests/einrichtung_kurz.test.mjs.
import { SCHRITTE, SCHNELL } from "../js/screens/onboarding.js";
test("Rechtsform ist kein Schritt der Einrichtung mehr (genauer Weg und Schnellweg)", () => {
  assert.ok(!SCHRITTE.some((s) => s.id === "rechtsform"));
  assert.ok(!SCHNELL.some((s) => s.id === "rechtsform"));
  assert.equal(SCHNELL.length, 7); // 27.10.2026: + Schloss (Code/Face ID)
});
