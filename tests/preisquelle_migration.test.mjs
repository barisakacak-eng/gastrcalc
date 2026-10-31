// Lauf 2, A5 (31.10.2026) – Durchsicht Pilotfest, Fund 6: Bestandsläden von vor W2-K2 (28.10.2026) haben Artikelpreise ohne Herkunft
// (preisQuelle). Preisänderungen und Preisdrift zählen nur Preise „vom Beleg“ – für diese Läden blieben beide Karten still.
// Hier: die Migration trägt die Herkunft nach (Beleg, wenn der Artikel mit Preis auf einer Lieferung steht; sonst Hand), fasst Richtpreise
// und schon gesetzte Herkünfte nicht an, und das Ergebnis überlebt Sicherung → Import (Rundreise) byteidentisch.
import test from "node:test";
import assert from "node:assert/strict";
const i18n = await import("../js/i18n.js"); i18n.setzeSprache("de");
const st = await import("../js/store.js");
const { preisAenderungen } = await import("../js/lieferung.js");

function altLaden() {
  const s = st.leererBetrieb(); s.phase = "app"; s.betrieb.name = "Alt";
  s.artikel = [
    { name: "Dönerspieß Kalb/Pute", preis: 8.5, preisBasis: "netto", packung: { menge: 1, einheit: "kg" }, preisDatum: "2026-10-20", preisHistorie: [{ datum: "2026-10-05", preis: 8.2, menge: 1, einheit: "kg", basis: "netto" }] }, // auf einer Lieferung → beleg
    { name: "Eisbergsalat", preis: 1.2, preisBasis: "netto", packung: { menge: 1, einheit: "stk" }, preisDatum: "2026-10-20" }, // nie geliefert → hand
    { name: "Tomaten", preis: 2.4, preisBasis: "netto", packung: { menge: 1, einheit: "kg" }, richtpreis: true }, // Richtpreis bleibt ohne Quelle
    { name: "Zwiebeln", preis: 1.1, preisBasis: "netto", packung: { menge: 1, einheit: "kg" }, preisQuelle: "hand" }, // schon gesetzt → unverändert
    { name: "Weißkohl", packung: { menge: 1, einheit: "kg" } }, // ohne Preis → nichts
  ];
  s.lieferungen = [{ id: "l1", datum: "2026-10-20", erfasst: "2026-10-20T10:00:00.000Z", lieferant: "Großmarkt", summeNetto: 8.5, summeBrutto: 9.1, zeilen: [{ artikel: "Dönerspieß Kalb/Pute", netto: 8.5, menge: 1, einheit: "kg", steuersatz: 0.07 }], storniert: false }];
  return s;
}

test("A5: Migration trägt preisQuelle nach – Beleg, Hand, Richtpreis und gesetzte Quelle richtig", () => {
  const s = st.migrierenBetrieb(altLaden());
  const q = Object.fromEntries(s.artikel.map((a) => [a.name, a.preisQuelle ?? null]));
  assert.equal(q["Dönerspieß Kalb/Pute"], "beleg");
  assert.equal(q["Eisbergsalat"], "hand");
  assert.equal(q["Tomaten"], null, "Richtpreis bekommt keine Herkunft");
  assert.equal(q["Zwiebeln"], "hand");
  assert.equal(q["Weißkohl"], null, "ohne Preis keine Herkunft");
});

test("A5: Migration ist idempotent und hält sich an die Historie („beleg“ in der Historie reicht)", () => {
  const s = altLaden(); s.lieferungen = []; s.artikel[0].preisHistorie.push({ datum: "2026-10-20", preis: 8.5, menge: 1, einheit: "kg", basis: "netto", herkunft: "beleg" });
  const n1 = st.preisQuelleNachtragen(s); const n2 = st.preisQuelleNachtragen(s);
  assert.equal(n1, 2); assert.equal(n2, 0, "zweiter Lauf ändert nichts");
  assert.equal(s.artikel[0].preisQuelle, "beleg");
});

test("A5: nach der Migration zählt der alte Beleg-Preis wieder in „Preisänderungen“", () => {
  const s = st.migrierenBetrieb(altLaden());
  const vor = preisAenderungen(s, { tage: 30, datum: "2026-10-25" });
  assert.ok(vor.some((x) => x.name === "Dönerspieß Kalb/Pute" || x.artikel === "Dönerspieß Kalb/Pute" || JSON.stringify(x).includes("Dönerspieß")), JSON.stringify(vor));
});

test("A5 Rundreise: Sicherung → Import behält die nachgetragene Herkunft; zweiter Import ist byteidentisch", async () => {
  const { idbAttrappe } = await import("./hilfe/idb_attrappe.mjs"); idbAttrappe(); await st.laden();
  const w = st.leereWurzel(); w.sprache = "de"; w.betriebe = [st.migrierenBetrieb(altLaden())]; w.aktiv = w.betriebe[0].id;
  const { blob } = await st.exportDatei(w);
  const r = await st.importSicherung(blob); assert.equal(r.pruefsumme, "ok");
  const b2 = r.wurzel.betriebe[0];
  assert.deepEqual(Object.fromEntries(b2.artikel.map((a) => [a.name, a.preisQuelle ?? null])), { "Dönerspieß Kalb/Pute": "beleg", "Eisbergsalat": "hand", "Tomaten": null, "Zwiebeln": "hand", "Weißkohl": null });
  const { blob: blob2 } = await st.exportDatei(r.wurzel); const r2 = await st.importSicherung(blob2);
  assert.deepEqual(r2.wurzel.betriebe[0].artikel, b2.artikel, "zweite Rundreise ändert die Artikel nicht mehr");
});
