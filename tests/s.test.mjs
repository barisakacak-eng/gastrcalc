// W2-S (15.10.2026 Abend): Büro-Code mit PBKDF2 und Salz, alte Werte umstellen, Wartezeit, Sperrliste Personal, Code nicht in der Sicherung.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const M = await import("../js/modus.js");

test("PBKDF2: zufälliges Salz, gleicher Code ergibt verschiedene Prüfwerte", async () => {
  const a = {}, b = {}; await M.pinSetzen(a, "4711"); await M.pinSetzen(b, "4711");
  assert.match(a.bueroPin, /^pbkdf2\$600000\$[0-9a-f]{32}\$[0-9a-f]{64}$/); assert.notEqual(a.bueroPin, b.bueroPin);
  assert.equal(await M.pinPruefen(a, "4711"), true); assert.equal(await M.pinPruefen(a, "4712"), false);
});

test("Alter SHA-256-Wert wird beim richtigen Code umgestellt, beim falschen nicht", async () => {
  const alt = createHash("sha256").update("gastrocalc-buero:1234").digest("hex");
  const w = { bueroPin: alt }; assert.equal(M.pinGesetzt(w), true);
  assert.equal(await M.pinPruefen(w, "0000"), false); assert.equal(w.bueroPin, alt);
  assert.equal(await M.pinPruefen(w, "1234"), true); assert.ok(w.bueroPin.startsWith("pbkdf2$"));
  assert.equal(await M.pinPruefen(w, "1234"), true);
});

test("Ersatz ohne crypto.subtle: gesalzen, prüfbar", async () => {
  const echt = globalThis.crypto;
  Object.defineProperty(globalThis, "crypto", { value: { getRandomValues: (x) => echt.getRandomValues(x) }, configurable: true });
  try {
    const w = {}; await M.pinSetzen(w, "9876"); assert.match(w.bueroPin, /^salz\$\d+\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
    assert.equal(await M.pinPruefen(w, "9876"), true); assert.equal(await M.pinPruefen(w, "9875"), false);
  } finally { Object.defineProperty(globalThis, "crypto", { value: echt, configurable: true }); }
});

test("Wartezeit: ab 5 Fehlern 30 s, dann doppelt, höchstens 15 min", () => {
  assert.equal(M.sperreDauer(4), 0); assert.equal(M.sperreDauer(5), 30000); assert.equal(M.sperreDauer(6), 60000); assert.equal(M.sperreDauer(20), 15 * 60000);
  const w = {}; const t0 = 1e12;
  for (let i = 0; i < 4; i++) assert.equal(M.fehlversuch(w, t0), 0);
  assert.equal(M.sperreRest(w, t0), 0);
  assert.equal(M.fehlversuch(w, t0), 30000); assert.equal(M.sperreRest(w, t0 + 1000), 29000); assert.equal(M.sperreRest(w, t0 + 30000), 0);
  w.pinSperre.bis = t0 + 10 * 3600000; assert.equal(M.sperreRest(w, t0), 15 * 60000, "Uhr verstellt: nie mehr als 15 min");
  M.sperreLoesen(w); assert.equal(w.pinSperre, undefined);
  assert.equal(M.restText(30000), "0:30"); assert.equal(M.restText(61000), "1:01");
  assert.deepEqual(M.sperreSauber({ fehler: "7", bis: 5 }), { fehler: 7, bis: 5 }); assert.equal(M.sperreSauber({ fehler: 0 }), undefined); assert.equal(M.sperreSauber("x"), undefined);
});

test("Neuer Code löscht den Fehlerzähler", async () => {
  const w = { pinSperre: { fehler: 9, bis: Date.now() + 60000 } }; await M.pinSetzen(w, "1357"); assert.equal(w.pinSperre, undefined);
});

test("Sperrliste im Personal-Modus", () => {
  const H = "2026-10-15";
  for (const a of ["kuehl-einrichtung", "stelle-neu", "stelle-archiv", "person-neu", "person-weg", "rundgang-verwerfen", "start-datum", "pp-uebernehmen", "pp-geraet", "sprache", "pin-entfernen", "muell1-nachtragen"])
    assert.equal(M.personalGesperrt(a, undefined, H), true, a);
  assert.equal(M.personalGesperrt("pp-ansicht", "einrichten", H), true); assert.equal(M.personalGesperrt("pp-ansicht", "nachweis", H), false);
  assert.equal(M.personalGesperrt("tag-datum", "2026-10-14", H), true); assert.equal(M.personalGesperrt("tag-datum", H, H), false);
  for (const a of ["muell-tipp", "station", "station-speichern", "rundgang-abschluss", "pp-haken", "schloss", "pin-taste", "loeschen"]) assert.equal(M.personalGesperrt(a, undefined, H), false, a);
  assert.equal(M.personalFeldGesperrt("stelle-max:k1"), true); assert.equal(M.personalFeldGesperrt("person-neu"), true); assert.equal(M.personalFeldGesperrt("station-wert"), false);
});

test("Alter Spiegel im localStorage wird übernommen und gelöscht", () => {
  const mem = new Map(); const alt = createHash("sha256").update("gastrocalc-buero:4444").digest("hex"); mem.set("gc-buero-pin", alt);
  globalThis.localStorage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  try {
    const w = {}; M.ebeneWiederherstellen(w); assert.equal(w.bueroPin, alt); assert.equal(mem.has("gc-buero-pin"), false);
    const v = { bueroPin: null }; mem.set("gc-buero-pin", alt); M.ebeneWiederherstellen(v); assert.equal(v.bueroPin, null, "entfernter Code kommt nicht zurück"); assert.equal(mem.has("gc-buero-pin"), false);
  } finally { delete globalThis.localStorage; }
});

test("Sicherung: Code und Zähler gehen nicht mit, Einlesen übernimmt sie nicht", async () => {
  const S = await import("../js/store.js");
  const w = S.leereWurzel(); w.betriebe = [S.leererBetrieb()]; w.aktiv = w.betriebe[0].id; await M.pinSetzen(w, "4711"); w.pinSperre = { fehler: 3, bis: 0 };
  const { blob } = await S.exportDatei(w); const Z = await import("../js/zip.js"); const text = new TextDecoder().decode(await (await Z.zipLesen(blob)).find((e) => e.name === S.SICHERUNG_JSON).bytes()); // Sicherung ist seit W2-D eine ZIP
  assert.ok(!text.includes("bueroPin") && !text.includes("pinSperre") && !text.includes("pbkdf2$"));
  const zeilen = text.split("\n"); const d = JSON.parse(zeilen[1]); d.wurzel.bueroPin = "a".repeat(64); d.wurzel.pinSperre = { fehler: 99, bis: 9e15 };
  const { wurzel } = await S.importDatei(zeilen[0] + "\n" + JSON.stringify(d)); assert.equal(wurzel.bueroPin, undefined); assert.equal(wurzel.pinSperre, undefined);
  const r = S.migrierenWurzel({ betriebe: [], bueroPin: w.bueroPin, pinSperre: { fehler: 6, bis: 7 } }); assert.equal(r.bueroPin, w.bueroPin); assert.deepEqual(r.pinSperre, { fehler: 6, bis: 7 });
});
