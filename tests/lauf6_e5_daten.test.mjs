// Lauf 6, Etappe 5 (13.11.2026): Funde aus dem Technik-Audit P2/P3 zu Abgleich, Einlesen, Sicherung. Jeder Fund hat einen eigenen Test, der Name nennt ihn.
import { test } from "node:test";
import assert from "node:assert/strict";
import { idbAttrappe } from "./hilfe/idb_attrappe.mjs";
import { jahresStand } from "./hilfe/jahr.mjs";
const st = await import("../js/store.js");
const af = await import("../js/abgleich_felder.js");
const stamm = await import("../js/stamm.js");
const sch = await import("../js/schichten.js");
const w3 = await import("../js/welle3.js");
const { beispielLaden } = await import("../js/beispiel.js");

const J = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
const JETZT = Date.parse("2026-11-12T12:00:00Z");
const laden = (id = "L1") => { const b = st.leererBetrieb(); b.id = id; b.phase = "app"; b.betrieb.name = "Nord"; b.personen = [{ id: "p1", kuerzel: "AB", aktiv: true, entfernt: false }]; return b; };
const wurzelMit = (...laeden) => { const w = st.leereWurzel(); w.betriebe = laeden; w.aktiv = laeden[0]?.id ?? null; return w; };
const ohneAbgleichSpuren = (b) => { const o = J(b); delete o.abgleich; delete o.abgleichHinweis; return o; };
const A1_FELDER = ["teamTage", "lieferTage", "abwesend", "preisRunden", "zekiLog", "schichten", "chef", "liquiditaet"];

// ---------- P2 A1: Abgleich verliert Felder ----------
test("P2 A1: Registertest – jedes Feld eines voll benutzten Ladens hat ein Verfahren (Bereich, Journal, FELD_ABGLEICH, eigene Regel oder NUR_LOKAL mit Grund)", () => {
  const b = beispielLaden("2026-11-03");
  const jahr = jahresStand(40).betriebe[0];
  // einmal jede Setz-Funktion für die Felder, die kein Bereich und kein Journal sind
  stamm.teamTagSetzen(b, "2026-11-01", [{ person: "bsp-p-ab", name: "AB", stunden: 6, satz: 14 }]);
  sch.schichtEintragen(b, { datum: "2026-11-01", person: b.personen[0].id, von: "10:00", bis: "18:00" });
  stamm.abwesendSetzen(b, "2026-11-30", [{ person: b.personen[0].id, name: "AB", tage: 2, satz: 14 }]);
  stamm.lieferTagSetzen(b, "2026-11-01", 120);
  stamm.preisRundeUebernehmen(b, { gericht: b.gerichte[0].id, alt: 7, neu: 7.5, mwst: 0.07, mengeMonat: 100, datum: "2026-11-02" });
  w3.chefStundenSetzen(b, 200); w3.geldHeuteSetzen(b, 1000, "2026-11-03");
  stamm.zekiLogAnhaengen(b, { art: "frage" });
  const alle = new Set([...Object.keys(b), ...Object.keys(jahr), ...Object.keys(st.leererBetrieb())]);
  for (const k of A1_FELDER) assert.ok(alle.has(k), `Testladen trägt ${k}`);
  const inBereich = new Set(Object.values(st.BEREICHE).flat());
  const ohne = [...alle].filter((k) => !inBereich.has(k) && !st.JOURNALE.includes(k) && af.FELD_VERFAHREN(k) === null);
  assert.deepEqual(ohne, [], `Felder ohne Abgleich-Verfahren: ${ohne.join(", ")} – in BEREICHE, JOURNALE, FELD_ABGLEICH, IN_VERSCHMELZEN oder NUR_LOKAL (mit Grund) eintragen`);
  for (const [k, grund] of [...Object.entries(af.NUR_LOKAL), ...Object.entries(af.IN_VERSCHMELZEN)]) assert.ok(typeof grund === "string" && grund.length > 10, `Grund für ${k}`);
  for (const k of Object.keys(af.NUR_LOKAL)) assert.ok(!inBereich.has(k) && !st.JOURNALE.includes(k) && !(k in af.FELD_ABGLEICH), `${k} hat nur ein Verfahren`);
});
test("P2 A1: Abnahme – zwei Handys mit Schichten und Stunden auf beiden Seiten: nach A←B und B←A ist alles da, Ergebnis gleich, doppelt einlesen ändert nichts", () => {
  const a = laden(), b = laden();
  stamm.teamTagSetzen(a, "2027-01-02", [{ person: "p1", name: "A", stunden: 6, satz: 14 }]);
  stamm.teamTagSetzen(b, "2027-01-03", [{ person: "p1", name: "A", stunden: 4, satz: 14 }]);
  sch.schichtEintragen(a, { datum: "2027-01-02", person: "p1", von: "10:00", bis: "18:00", jetzt: "2027-01-02T18:01:00.000Z" });
  sch.schichtEintragen(b, { datum: "2027-01-03", person: "p1", von: "11:00", bis: "19:00", jetzt: "2027-01-03T19:01:00.000Z" });
  const wa = wurzelMit(a), wb = wurzelMit(b);
  const vonA = J(wa), vonB = J(wb);
  st.zusammenfuehren(wa, vonB, { jetzt: JETZT }); st.zusammenfuehren(wb, vonA, { jetzt: JETZT });
  for (const w of [wa, wb]) { const l = w.betriebe[0]; assert.deepEqual(l.teamTage.map((x) => x.datum), ["2027-01-02", "2027-01-03"]); assert.deepEqual(l.schichten.map((x) => x.datum), ["2027-01-02", "2027-01-03"]); }
  for (const f of A1_FELDER) assert.deepEqual(J(wa.betriebe[0][f]), J(wb.betriebe[0][f]), `${f} auf beiden Handys gleich`);
  const vorher = J(wa.betriebe[0]); st.zusammenfuehren(wa, J(wb), { jetzt: JETZT });
  for (const f of A1_FELDER) assert.deepEqual(J(wa.betriebe[0][f]), vorher[f] ?? undefined, `${f}: doppelt einlesen ändert nichts`);
});
test("P2 A1: fremderStand (zwei Tabs) nutzt zusammenfuehren – Stunden des anderen Tabs gehen nicht verloren", () => {
  const a = laden(), b = laden(); stamm.teamTagSetzen(a, "2027-01-02", [{ person: "p1", name: "A", stunden: 6 }]); stamm.teamTagSetzen(b, "2027-01-03", [{ person: "p1", name: "A", stunden: 5 }]);
  const neu = wurzelMit(b); st.zusammenfuehren(neu, wurzelMit(a), { jetzt: JETZT }); // genau der Aufruf in fremderStand
  assert.equal(neu.betriebe[0].teamTage.length, 2);
});
test("P2 A1/C5: kaputte Einträge (teamTage: [{ datum: 5 }]) werden beim Laden und Einlesen verworfen und gezählt, nichts wirft", () => {
  const roh = { schema: 6, aktiv: "x", betriebe: [{ id: "x", phase: "app", teamTage: [{ datum: 5 }, { datum: "2027-01-02", eintraege: [{ person: "p1", stunden: 6 }, 7] }, null, "x"], lieferTage: [{ datum: "kaputt", betrag: 5 }, { datum: "2027-01-02", betrag: 5 }],
    schichten: [{ datum: 3 }], abwesend: "nein", chef: 5, liquiditaet: { betrag: "x" }, preisRunden: [{ datum: "2027-01-02", gericht: "g" }, { gericht: "g" }], zekiLog: [{ t: "2027-01-01T00:00:00Z" }, { art: "x" }] }] };
  let w; assert.doesNotThrow(() => { w = st.migrierenWurzel(J(roh)); });
  const b = w.betriebe[0];
  assert.deepEqual(b.teamTage, [{ datum: "2027-01-02", eintraege: [{ person: "p1", stunden: 6 }] }]);
  assert.equal(b.lieferTage.length, 1); assert.deepEqual(b.schichten, []); assert.equal(b.abwesend, undefined); assert.equal(b.chef, undefined); assert.equal(b.liquiditaet, undefined);
  assert.equal(b.preisRunden.length, 1); assert.equal(b.zekiLog.length, 1);
  assert.doesNotThrow(() => st.verschmelzen(b, J(b), { jetzt: JETZT }));
});
test("P2 A1: Rundreise – Stand → Sicherung → einlesen in leeres Handy → Sicherung ist exakt gleich", async () => {
  idbAttrappe(); await st.laden();
  const b = laden(); stamm.teamTagSetzen(b, "2027-01-02", [{ person: "p1", name: "A", stunden: 6, satz: 14 }]);
  sch.schichtEintragen(b, { datum: "2027-01-02", person: "p1", von: "10:00", bis: "18:00", jetzt: "2027-01-02T18:01:00.000Z" });
  stamm.abwesendSetzen(b, "2027-01-30", [{ person: "p1", name: "A", tage: 2, satz: 14 }]); stamm.lieferTagSetzen(b, "2027-01-02", 80);
  w3.chefStundenSetzen(b, 200); w3.geldHeuteSetzen(b, 900, "2027-01-02"); stamm.zekiLogAnhaengen(b, { art: "frage" });
  stamm.preisRundeUebernehmen(b, { gericht: "g1", alt: 7, neu: 7.5, mwst: 0.07, mengeMonat: 100, datum: "2027-01-02" });
  const w1 = wurzelMit(b);
  const s1 = await st.exportDatei(w1, { mitAblage: false }); const r1 = await st.importSicherung(s1.blob);
  const leer = st.leereWurzel(); const bericht = st.zusammenfuehren(leer, r1.wurzel, { jetzt: JETZT });
  assert.equal(bericht.neu, 1);
  const s2 = await st.exportDatei(leer, { mitAblage: false }); const r2 = await st.importSicherung(s2.blob);
  const norm = (w) => { const o = ohneAbgleichSpuren(w.betriebe[0]); delete o.geaendert; return o; };
  assert.deepEqual(norm(r2.wurzel), norm(r1.wurzel), "Laden nach der Rundreise exakt gleich");
  for (const f of A1_FELDER) assert.deepEqual(r2.wurzel.betriebe[0][f], b[f], f);
});
