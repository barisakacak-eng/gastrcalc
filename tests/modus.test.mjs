// Drei Ebenen (Entwickler A): Modus, Wege je Ebene, Büro-Code als Prüfwert.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const M = await import("../js/modus.js");

test("Modus: Standard Laden, nur bekannte Werte", () => {
  assert.equal(M.modus(null), "laden"); assert.equal(M.modus({}), "laden"); assert.equal(M.modus({ modus: "chef" }), "laden");
  const w = {}; assert.equal(M.modusSetzen(w, "personal"), true); assert.equal(w.modus, "personal");
  assert.equal(M.modusSetzen(w, "personal"), false, "kein Wechsel"); assert.equal(M.modusSetzen(w, "quatsch"), false); assert.equal(w.modus, "personal");
  assert.deepEqual(M.MODI, ["laden", "personal", "buero"]);
});

test("Startbildschirm je Ebene", () => {
  assert.equal(M.startAnsicht({}), "start"); assert.equal(M.startAnsicht({ modus: "personal" }), "personal"); assert.equal(M.startAnsicht({ modus: "buero" }), "buero");
});

test("Leiste unten: genau fünf Reiter in fester Reihenfolge", () => {
  assert.deepEqual(M.LADEN_TABS, ["start", "muell", "kuehl", "putzplan", "karte"]);
});

test("Personal: nur Müll, Kühlung, Putzen – alles andere führt zurück zu den drei Kacheln", () => {
  const w = { modus: "personal" };
  for (const z of ["muell", "kuehl", "putzplan", "personal"]) assert.deepEqual(M.navZiel(w, z), { ansicht: z });
  for (const z of ["start", "karte", "umsatz", "vergleich", "listen", "einstellungen", "buero", "abschluss", "laeden"]) assert.deepEqual(M.navZiel(w, z), { ansicht: "personal" }, z);
  assert.equal(M.ansichtErlaubt(w, "umsatz"), false); assert.equal(M.ansichtErlaubt(w, "kuehl"), true);
});

test("Laden: Reiter und Blatt direkt, Büro-Bildschirme nur über das Büro", () => {
  const w = {};
  for (const z of ["start", "muell", "kuehl", "putzplan", "karte", "abschluss"]) assert.deepEqual(M.navZiel(w, z), { ansicht: z });
  for (const z of ["umsatz", "vergleich", "listen", "beleg", "inventur", "einstellungen", "laeden"]) assert.deepEqual(M.navZiel(w, z), { ansicht: z, buero: true }, z);
  assert.deepEqual(M.navZiel(w, "buero"), { ansicht: "buero", buero: true });
  assert.equal(M.ansichtErlaubt(w, "umsatz"), false); assert.equal(M.ansichtErlaubt(w, "putzplan"), true);
});

test("Büro: alles erreichbar, „Heute“ führt zum Büro-Start", () => {
  const w = { modus: "buero" };
  assert.deepEqual(M.navZiel(w, "start"), { ansicht: "buero" }); assert.deepEqual(M.navZiel(w, "umsatz"), { ansicht: "umsatz" }); assert.deepEqual(M.navZiel(w, "kuehl"), { ansicht: "kuehl" });
  assert.equal(M.ansichtErlaubt(w, "start"), false); assert.equal(M.ansichtErlaubt(w, "einstellungen"), true);
});

test("SHA-256 von Hand stimmt mit node:crypto überein", () => {
  for (const s of ["", "abc", "gastrocalc-buero:1234", "ü".repeat(100), "x".repeat(55), "x".repeat(56), "x".repeat(64)])
    assert.equal(M.sha256Hex(s), createHash("sha256").update(s, "utf8").digest("hex"), JSON.stringify(s.slice(0, 10)));
});

test("Büro-Code: nur 4 Ziffern, gespeichert wird nur der Prüfwert", async () => {
  const w = {};
  assert.equal(M.pinGesetzt(w), false);
  assert.equal(await M.pinSetzen(w, "12a4"), false); assert.equal(await M.pinSetzen(w, "123"), false);
  assert.equal(await M.pinSetzen(w, "4711"), true);
  assert.equal(M.pinGesetzt(w), true); assert.ok(w.bueroPin.startsWith("pbkdf2$")); assert.ok(!w.bueroPin.includes("4711")); // W2-S: PBKDF2 mit Salz
  assert.equal(await M.pinPruefen(w, "4711"), true); assert.equal(await M.pinPruefen(w, "4712"), false); assert.equal(await M.pinPruefen(w, ""), false);
  await M.pinSetzen(w, null); assert.equal(M.pinGesetzt(w), false); assert.equal(await M.pinPruefen(w, "4711"), false);
});

test("Neustart: Büro mit Code geht zurück in den Laden, Personal bleibt", async () => {
  const a = { modus: "buero" }; await M.pinSetzen(a, "1111"); M.ebeneWiederherstellen(a); assert.equal(a.modus, "laden");
  const b = { modus: "buero", bueroPin: null }; M.ebeneWiederherstellen(b); assert.equal(b.modus, "buero");
  const c = { modus: "personal", bueroPin: null }; M.ebeneWiederherstellen(c); assert.equal(c.modus, "laden"); // W2-S: Personal nur mit Code
  const d = { modus: "personal" }; await M.pinSetzen(d, "2222"); M.ebeneWiederherstellen(d); assert.equal(d.modus, "personal");
});
