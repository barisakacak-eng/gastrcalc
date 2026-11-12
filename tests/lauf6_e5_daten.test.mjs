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
const l6y = await import("../js/data/l6y_texte.js");

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

// ---------- P2 B1: Stammdaten laufen auseinander ----------
const synchron = (mk) => { // zwei Handys mit gleichem Anfangsstand, einmal abgeglichen (Grundlage für den Vergleich je Eintrag)
  const a = mk(), b = mk(); const wa = wurzelMit(a), wb = wurzelMit(b);
  const va = J(wa), vb = J(wb); st.zusammenfuehren(wa, vb, { jetzt: JETZT }); st.zusammenfuehren(wb, va, { jetzt: JETZT });
  return [wa, wb];
};
const mitGerichten = () => { const b = laden(); b.gerichte = [{ id: "g1", name: "Döner", zutaten: [], preis: 7 }, { id: "g2", name: "Pizza", zutaten: [], preis: 9 }]; b.artikel = [{ name: "Fleisch", preis: 8, einheit: "kg" }, { name: "Brot", preis: 1, einheit: "stk" }]; b.kosten = [{ id: "k1", kategorie: "miete", posten: "miete", betrag: 1000, status: "bekannt", periode: "monat", basis: "netto", satz: 19 }, { id: "k2", kategorie: "energie", posten: "strom", betrag: 300, status: "bekannt", periode: "monat", basis: "brutto", satz: 19 }]; return b; };
const tauschen = (wa, wb) => { const va = J(wa), vb = J(wb); const r1 = st.zusammenfuehren(wa, vb, { jetzt: JETZT }); const r2 = st.zusammenfuehren(wb, va, { jetzt: JETZT }); return [r1, r2]; };
test("P2 B1: A ändert Preis Gericht 1, B ändert Preis Gericht 2 – nach Austausch in beide Richtungen haben beide Handys beide Änderungen (Gerichte, Waren, Kosten)", () => {
  const [wa, wb] = synchron(mitGerichten);
  wa.betriebe[0].gerichte[0].preis = 7.5; wb.betriebe[0].gerichte[1].preis = 9.5;
  wa.betriebe[0].artikel[0].preis = 8.5; wb.betriebe[0].artikel[1].preis = 1.2;
  wa.betriebe[0].kosten[0].betrag = 1100; wb.betriebe[0].kosten[1].betrag = 350;
  const [r1, r2] = tauschen(wa, wb);
  for (const w of [wa, wb]) { const l = w.betriebe[0];
    assert.deepEqual(l.gerichte.map((g) => [g.id, g.preis]), [["g1", 7.5], ["g2", 9.5]]);
    assert.deepEqual(l.artikel.map((x) => [x.name, x.preis]), [["Fleisch", 8.5], ["Brot", 1.2]]);
    assert.deepEqual(l.kosten.map((k) => [k.id, k.betrag]), [["k1", 1100], ["k2", 350]]); }
  assert.deepEqual(r1.bericht.eintraege, []); assert.deepEqual(r2.bericht.eintraege, [], "keine echten Konflikte, kein Vermerk");
  assert.deepEqual(J(wa.betriebe[0].gerichte), J(wb.betriebe[0].gerichte), "beide Handys gleich");
  // doppelt einlesen ändert nichts
  const vorher = J(wa.betriebe[0].gerichte); st.zusammenfuehren(wa, J(wb), { jetzt: JETZT }); assert.deepEqual(J(wa.betriebe[0].gerichte), vorher);
});
test("P2 B1: derselbe Eintrag auf beiden Handys verschieden – die gewählte Seite gilt, im Bericht steht Bereich, Kennung und beide Werte, im abgleichHinweis ebenso", () => {
  const [wa, wb] = synchron(mitGerichten);
  wa.betriebe[0].gerichte[0].preis = 7.5; wb.betriebe[0].gerichte[0].preis = 8; wb.betriebe[0].gerichte[1].preis = 9.5; // g1 auf beiden verschieden, g2 nur auf B
  const r = st.zusammenfuehren(wa, J(wb), { jetzt: JETZT });
  const l = wa.betriebe[0];
  assert.equal(l.gerichte[0].preis, 7.5, "bereichWahl: bei „beide geändert“ bleibt dieses Handy"); assert.equal(l.gerichte[1].preis, 9.5, "die Änderung nur auf B kommt trotzdem");
  assert.equal(r.bericht.eintraege.length, 1);
  const v = r.bericht.eintraege[0]; assert.equal(v.bereich, "gerichte"); assert.equal(v.kennung, "g1"); assert.match(v.lokal, /7\.5/); assert.match(v.fremd, /\b8\b/); assert.equal(v.behalten, "lokal");
  assert.equal(l.abgleichHinweis.eintraege.length, 1); assert.deepEqual(l.abgleichHinweis.bereiche.includes("gerichte"), true);
  // Löschen auf der einen, Ändern auf der anderen Seite: das Gericht bleibt, mit Vermerk
  const [xa, xb] = synchron(mitGerichten); xa.betriebe[0].gerichte.splice(1, 1); xb.betriebe[0].gerichte[1].preis = 9.9; xb.betriebe[0].gerichte[0].preis = 7.1; xa.betriebe[0].gerichte[0].preis = 7.2;
  const r2 = st.zusammenfuehren(xa, J(xb), { jetzt: JETZT }); assert.deepEqual(xa.betriebe[0].gerichte.map((g) => g.id), ["g1", "g2"]); assert.ok(r2.bericht.eintraege.some((e) => e.kennung === "g2" && e.art === "geloeschtGeaendert"));
  // Löschen auf der einen, unverändert auf der anderen Seite: bleibt gelöscht
  const [ya, yb] = synchron(mitGerichten); ya.betriebe[0].gerichte.splice(1, 1); yb.betriebe[0].gerichte[0].preis = 7.7; ya.betriebe[0].kosten[0].betrag = 1; 
  st.zusammenfuehren(ya, J(yb), { jetzt: JETZT }); assert.deepEqual(ya.betriebe[0].gerichte.map((g) => [g.id, g.preis]), [["g1", 7.7]]);
});
test("P2 B1: Bereiche ohne Kennung (Betrieb): wie bisher gewinnt eine Seite, aber abgleichHinweis trägt beide Werte", () => {
  const [wa, wb] = synchron(mitGerichten);
  wa.betriebe[0].betrieb.name = "Nord A"; wb.betriebe[0].betrieb.name = "Nord B";
  const r = st.zusammenfuehren(wa, J(wb), { jetzt: JETZT });
  assert.equal(wa.betriebe[0].betrieb.name, "Nord A");
  assert.equal(r.bericht.unterschiede.length, 1); const u = r.bericht.unterschiede[0]; assert.equal(u.bereich, "betrieb"); assert.match(u.lokal, /Nord A/); assert.match(u.fremd, /Nord B/);
  assert.deepEqual(wa.betriebe[0].abgleichHinweis.unterschiede.map((x) => x.bereich), ["betrieb"]);
  assert.match(l6y.l6ySatz("bereichUnterschied", "de", "Betrieb", u.lokal, u.fremd), /Nord A/);
});

// ---------- P2 B2: Tagesumsatz ----------
const umsatz = (b, datum, betrag, erfasst, id) => b.tagesnotizen.push({ id, datum, umsatz: betrag, erfasst, nacherfasst: false, storniert: false });
test("P2 B2: derselbe Tag auf beiden Handys mit verschiedenem Umsatz – der jüngere gilt wie bisher, der Konflikt steht im Bericht und im abgleichHinweis", async () => {
  const { umsatzEintrag } = await import("../js/engine.js");
  const a = laden(), b = laden(); umsatz(a, "2026-11-10", 800, "2026-11-10T21:00:00.000Z", "ta1"); umsatz(b, "2026-11-10", 950, "2026-11-10T22:30:00.000Z", "tb1");
  umsatz(a, "2026-11-11", 700, "2026-11-11T21:00:00.000Z", "ta2"); umsatz(b, "2026-11-11", 700, "2026-11-11T21:05:00.000Z", "tb2"); // gleicher Betrag: kein Konflikt
  const wa = wurzelMit(a), wb = wurzelMit(b); const vb = J(wb);
  const r = st.zusammenfuehren(wa, vb, { jetzt: JETZT });
  assert.deepEqual(r.bericht.umsatzKonflikte, [{ laden: "L1", tag: "2026-11-10", lokal: 800, fremd: 950, gilt: "fremd" }]);
  assert.equal(umsatzEintrag(wa.betriebe[0], "2026-11-10").umsatz, 950, "der Wert selbst: jüngster");
  assert.deepEqual(wa.betriebe[0].abgleichHinweis.umsatzKonflikte, [{ tag: "2026-11-10", lokal: 800, fremd: 950, gilt: "fremd" }]);
  const r2 = st.zusammenfuehren(wa, J(vb), { jetzt: JETZT }); assert.deepEqual(r2.bericht.umsatzKonflikte, [], "zweites Einlesen zählt nicht noch einmal");
  assert.equal(wa.betriebe[0].abgleichHinweis.umsatzKonflikte.length, 1);
  // Korrektur auf einem Handy (alter Eintrag dort storniert) ist kein Konflikt
  const c = laden(), d = J(c); umsatz(c, "2026-11-10", 800, "2026-11-10T21:00:00.000Z", "tc1"); const d2 = J(c); d2.tagesnotizen[0].storniert = true; umsatz(d2, "2026-11-10", 820, "2026-11-10T22:00:00.000Z", "tc2");
  const wc = wurzelMit(c); assert.deepEqual(st.zusammenfuehren(wc, wurzelMit(d2), { jetzt: JETZT }).bericht.umsatzKonflikte, []);
  assert.ok(d);
});

// ---------- P2 B3: Monatsabschluss nach dem Abgleich ----------
test("P2 B3: eingefrorener Monat trägt einen Fingerabdruck der Umsatzeinträge; kommen nach dem Abgleich Tage dazu, ist er veraltet; alte Abschlüsse ohne Fingerabdruck nie", async () => {
  const ma = await import("../js/monatsabschluss.js");
  const a = beispielLaden("2026-11-13"); const b = J(a);
  const monat = "2026-10";
  const e = ma.monatEinfrieren(a, monat, { jetzt: "2026-11-02T10:00:00.000Z" });
  assert.equal(typeof e.abdruck, "string"); assert.equal(ma.abschlussVeraltet(a, monat), false);
  assert.equal(ma.abschlussVeraltet(a, "2026-09"), false, "nicht eingefroren: nicht veraltet");
  // das andere Handy hat für den Oktober noch einen Tag eingetragen; der Abgleich bringt ihn herüber
  b.tagesnotizen.push({ id: "spaet-1", datum: "2026-10-31", umsatz: 123, erfasst: "2026-11-05T10:00:00.000Z", nacherfasst: true, storniert: false });
  const m = st.verschmelzen(a, b, { jetzt: JETZT });
  assert.equal(ma.eingefroren(m, monat).umsatzBrutto, e.umsatzBrutto, "der eingefrorene Monat bleibt stehen");
  assert.equal(ma.abschlussVeraltet(m, monat), true, "… wird aber als veraltet erkannt");
  assert.equal(ma.abschlussVeraltet(m, "2026-11"), false);
  // Rundreise über JSON: der Fingerabdruck bleibt am Abschluss
  const w = st.migrierenWurzel({ schema: 6, aktiv: m.id, betriebe: [J(m)] }); assert.equal(ma.eingefroren(w.betriebe[0], monat).abdruck, e.abdruck);
  // alter Abschluss ohne Fingerabdruck
  const alt = J(m); delete ma.eingefroren(alt, monat).abdruck; assert.equal(ma.abschlussVeraltet(alt, monat), false);
});
