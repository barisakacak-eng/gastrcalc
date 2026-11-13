// Nachladen (Etappe 10 „Schneller Start“): das Büro-Paket zeichnet genau die Ansichten, die der Start-Kern nicht kennt; Namen stoßen nicht zusammen.
import test from "node:test";
import assert from "node:assert/strict";
import { BUERO_ANSICHTEN, bueroPaket, bueroPaketLaden, istBueroAnsicht } from "../js/bedienung/nachladen.js";
import { zusammenfuehren } from "../js/bedienung/tabellen.js";

test("Nachladen: das Büro-Paket hat zu jeder Büro-Ansicht eine Zeichen-Funktion", async () => {
  assert.equal(bueroPaket(), null, "vor dem ersten Gebrauch ist nichts geladen");
  const P = await bueroPaketLaden();
  assert.equal(bueroPaket(), P);
  assert.equal(await bueroPaketLaden(), P, "zweimal laden gibt dasselbe Paket");
  assert.deepEqual([...BUERO_ANSICHTEN].sort(), Object.keys(P.VIEW).sort());
  for (const a of BUERO_ANSICHTEN) { assert.ok(istBueroAnsicht(a)); assert.equal(typeof P.VIEW[a], "function", a); }
  assert.ok(!istBueroAnsicht("start") && !istBueroAnsicht("muell") && !istBueroAnsicht("kuehl") && !istBueroAnsicht("putzplan") && !istBueroAnsicht("karte"));
});
test("Nachladen: Namen des Büro-Pakets und des Start-Kerns sind verschieden (ein Name nur in einer Tabelle)", async () => {
  const P = await bueroPaketLaden(); const L = await import("../js/bedienung/laden.js");
  assert.doesNotThrow(() => zusammenfuehren(L.ANSICHT_KLICK, P.ANSICHT_KLICK));
  assert.doesNotThrow(() => zusammenfuehren(L.ANSICHT_EINGABE, P.ANSICHT_EINGABE));
  for (const a of Object.keys(P.ANSICHT_KLICK)) assert.ok(a === "ordner-" || BUERO_ANSICHTEN.has(a), "Klick-Tabelle für eine Ansicht außerhalb des Büros: " + a);
});
