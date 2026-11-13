// Lauf 6, E5-Draht (8): Schreibfehler der Ablage sind erkennbar. Eigene Datei, weil die Attrappe für indexedDB stehen muss, BEVOR js/ablage.js geladen wird
// (die Ablage merkt sich beim Laden, ob es IndexedDB gibt).
import { test } from "node:test";
import assert from "node:assert/strict";
let schreibversuche = 0;
const quota = () => Object.assign(new Error("The quota has been exceeded."), { name: "QuotaExceededError" });
globalThis.indexedDB = { open() {
  const r = { onsuccess: null, onerror: null, onupgradeneeded: null, result: { objectStoreNames: { contains: () => true }, transaction: () => ({ objectStore: () => ({ put() { schreibversuche += 1; throw quota(); }, get() { throw quota(); }, delete() { throw quota(); }, clear() { throw quota(); }, getAllKeys() { throw quota(); } }) }) } };
  setTimeout(() => r.onsuccess?.(), 0); return r; } };
const A = await import("../js/ablage.js");
const B = await import("../js/bedienhilfe.js");

test("Draht 8: ablegen liefert bei Schreibfehler einen erkennbaren Fehler (grund speicher, voll) und meldet ans Banner – keine Beschreibung mehr", async () => {
  const gemeldet = []; A.beiAblageFehler((art, fehler) => gemeldet.push([art, B.speicherProblemArt(art, fehler)]));
  const blob = new Blob([new Uint8Array(100).fill(1)], { type: "image/jpeg" });
  await assert.rejects(A.ablegen(blob, { name: "x.jpg", zweck: "rechnung", laden: "L1" }), (e) => A.istAblageFehler(e) && e.grund === "speicher" && e.voll === true);
  assert.ok(schreibversuche >= 2, "zweimal versucht (iOS trennt manchmal)");
  assert.deepEqual(gemeldet, [["ablage", "ablageVoll"]], "Bedienschicht bekommt Art und Fehler für das Banner „Speicher voll“");
  assert.equal(B.problemNachErfolg("ablageVoll"), "ablageVoll", "das Banner bleibt, das Foto ist verloren");
  assert.equal(B.speicherProblemArt("ablage", new Error("x")), "ablage");
  assert.equal(await A.ablageLesen("d-gibtesnicht"), null, "nichts liegt still im Arbeitsspeicher");
  // Einlesen einer Sicherung: ein Foto, das nicht geschrieben werden kann, zählt nicht als neu abgelegt
  await assert.rejects(A.ablageZuruecklegen("d-abc", blob), (e) => A.istAblageFehler(e));
});
