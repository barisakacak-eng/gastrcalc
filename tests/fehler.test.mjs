// Fehler-Rucksack (Pilotfest E3, 30.10.2026): höchstens 50 Einträge, keine Zahlen, keine Namen, Text zum Teilen.
import test from "node:test";
import assert from "node:assert/strict";
import { anonym, fehlerMerken, fehlerLesen, fehlerText, fehlerLeeren, fehlerSammlerStarten, FEHLER_MAX, FEHLER_KEY } from "../js/fehler.js";
const speicher = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };

test("anonym: Zahlen und Namen raus, Fehlerklassen und Pfade bleiben", () => {
  const t = anonym("TypeError: Cannot read properties of undefined (reading 'preis') bei Döner Kebab 7,50 € für Mustafa Yilmaz, Tel 0176 1234567 https://example.org/gastrcalc/index.html");
  assert.ok(t.includes("TypeError") && t.includes("Cannot"), t);
  assert.ok(!/\d/.test(t), "keine Ziffer: " + t);
  assert.ok(!t.includes("Mustafa") && !t.includes("Yilmaz") && !t.includes("Döner"), "keine Namen: " + t);
  assert.ok(!t.includes("example.org"), "keine Adresse: " + t);
});
test("merken: 50 Einträge, gleiche Fehler zählen hoch, Ort bleibt", () => {
  const sp = speicher();
  for (let i = 0; i < 70; i++) fehlerMerken(sp, { text: `Fehler Nr ${i}`, fassung: "t", ansicht: "start", ort: `js/app.js:${i}`, zeit: 1000 + i });
  const l = fehlerLesen(sp); assert.equal(l.length, FEHLER_MAX);
  assert.ok(l[0].text.startsWith("Fehler Nr #") && l[0].text.includes("@ js/app.js:20"), l[0].text);
  fehlerMerken(sp, { text: "gleich", ansicht: "karte" }); fehlerMerken(sp, { text: "gleich", ansicht: "karte" }); fehlerMerken(sp, { text: "gleich", ansicht: "karte" });
  const l2 = fehlerLesen(sp); assert.equal(l2[l2.length - 1].n, 3); assert.equal(l2.length, FEHLER_MAX);
  assert.ok(fehlerText(sp, { fassung: "2026-10-30.7", sprache: "de" }).startsWith("GastroCash 2026-10-30.7 · de"));
  assert.ok(fehlerText(sp, {}).includes("3×"));
  fehlerLeeren(sp); assert.equal(fehlerLesen(sp).length, 0); assert.ok(fehlerText(sp, {}).includes("Keine Fehler"));
});
test("Sammler: window.error und unhandledrejection landen im Speicher, Abmelden geht", () => {
  const sp = speicher(); const hoerer = {};
  const win = { localStorage: sp, addEventListener: (n, f) => { hoerer[n] = f; }, removeEventListener: (n) => { delete hoerer[n]; } };
  const ab = fehlerSammlerStarten(win, { fassung: "x", ansichtJetzt: () => "buero" });
  hoerer.error({ error: new Error("kaputt 42"), filename: "http://h/js/screens/buero.js", lineno: 17 });
  hoerer.unhandledrejection({ reason: "Promise kaputt" });
  const l = fehlerLesen(sp); assert.equal(l.length, 2); assert.equal(l[0].ansicht, "buero"); assert.ok(l[0].text.includes("@ screens/buero.js:17"), l[0].text); assert.ok(l[1].text.startsWith("Promise:"));
  ab(); assert.deepEqual(Object.keys(hoerer), []);
  assert.equal(FEHLER_KEY, "gc-fehler");
});
