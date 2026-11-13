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
  st.feldZeitenNachziehen(wa, JETZT + 1000); st.feldZeitenNachziehen(wb, JETZT + 2000); // E11 (B1): jedes Feld trägt seine Änderungszeit, B hat später geändert
  const r = st.zusammenfuehren(wa, J(wb), { jetzt: JETZT });
  const l = wa.betriebe[0];
  assert.equal(l.gerichte[0].preis, 8, "E11 (B1): bei „beide geändert“ gilt die spätere Änderung – nicht mehr „immer dieses Handy“ (die Handys blieben so für immer verschieden)"); assert.equal(l.gerichte[1].preis, 9.5, "die Änderung nur auf B kommt trotzdem");
  assert.equal(r.bericht.eintraege.length, 1);
  const v = r.bericht.eintraege[0]; assert.equal(v.bereich, "gerichte"); assert.equal(v.kennung, "g1"); assert.match(v.lokal, /7\.5/); assert.match(v.fremd, /\b8\b/); assert.equal(v.behalten, "fremd");
  assert.equal(l.abgleichHinweis.eintraege.length, 1); assert.deepEqual(l.abgleichHinweis.bereiche.includes("gerichte"), true);
  // Löschen auf der einen, Ändern auf der anderen Seite: das Gericht bleibt, mit Vermerk
  const [xa, xb] = synchron(mitGerichten); xa.betriebe[0].gerichte.splice(1, 1); xb.betriebe[0].gerichte[1].preis = 9.9; xb.betriebe[0].gerichte[0].preis = 7.1; xa.betriebe[0].gerichte[0].preis = 7.2;
  const r2 = st.zusammenfuehren(xa, J(xb), { jetzt: JETZT }); assert.deepEqual(xa.betriebe[0].gerichte.map((g) => g.id), ["g1", "g2"]); assert.ok(r2.bericht.eintraege.some((e) => e.kennung === "g2" && e.art === "geloeschtGeaendert"));
  // Löschen auf der einen, unverändert auf der anderen Seite: bleibt gelöscht
  const [ya, yb] = synchron(mitGerichten); ya.betriebe[0].gerichte.splice(1, 1); yb.betriebe[0].gerichte[0].preis = 7.7; ya.betriebe[0].kosten[0].betrag = 1; 
  st.zusammenfuehren(ya, J(yb), { jetzt: JETZT }); assert.deepEqual(ya.betriebe[0].gerichte.map((g) => [g.id, g.preis]), [["g1", 7.7]]);
});
test("P2 B1: Bereiche ohne Kennung (Betrieb): die spätere Änderung gewinnt je Feld (E11), abgleichHinweis trägt beide Werte", () => {
  const [wa, wb] = synchron(mitGerichten);
  wa.betriebe[0].betrieb.name = "Nord A"; wb.betriebe[0].betrieb.name = "Nord B";
  st.feldZeitenNachziehen(wa, JETZT + 1000); st.feldZeitenNachziehen(wb, JETZT + 2000); // B später
  const r = st.zusammenfuehren(wa, J(wb), { jetzt: JETZT });
  assert.equal(wa.betriebe[0].betrieb.name, "Nord B", "E11 (B1): vorher blieb immer dieses Handy – die Handys blieben verschieden");
  assert.equal(r.bericht.unterschiede.length, 1); const u = r.bericht.unterschiede[0]; assert.equal(u.bereich, "betrieb"); assert.match(u.lokal, /Nord A/); assert.match(u.fremd, /Nord B/); assert.equal(u.gilt, "fremd");
  assert.deepEqual(wa.betriebe[0].abgleichHinweis.unterschiede.map((x) => x.bereich), ["betrieb"]);
  assert.match(l6y.l6ySatz("bereichUnterschiedFremd", "de", "Betrieb", u.lokal, u.fremd), /Nord B/);
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

// ---------- P2 B4: Zukunftsregel ----------
test("P2 B4: Datei mit 398 Zukunfts-Einträgen in ein leeres Handy – 398 sind da, alle als „Datum prüfen“ markiert, bericht.zukunft zählt weiter", async () => {
  idbAttrappe(); await st.laden();
  const b = laden("Z1"); const jetzt = Date.parse("2026-11-12T12:00:00Z");
  for (let i = 0; i < 398; i++) b.messungen.push({ id: "z" + i, lfd: i + 1, stelle: "k1", datum: "2027-03-" + String((i % 28) + 1).padStart(2, "0"), zeit: "2027-03-01T06:00:00.000Z", wert: 4, erfasst: "2027-03-01T06:00:00.000Z", storniert: false });
  b.messungen.push({ id: "heute", lfd: 999, stelle: "k1", datum: "2026-11-12", zeit: "2026-11-12T06:00:00.000Z", wert: 4, erfasst: "2026-11-12T06:00:00.000Z", storniert: false });
  const { blob } = await st.exportDatei(wurzelMit(b), { mitAblage: false }); const r = await st.importSicherung(blob);
  const leer = st.leereWurzel(); const bericht = st.zusammenfuehren(leer, r.wurzel, { jetzt }).bericht;
  const m = leer.betriebe[0].messungen;
  assert.equal(m.length, 399); assert.equal(m.filter((x) => x.datumPruefen === true).length, 398); assert.equal(m.find((x) => x.id === "heute").datumPruefen, undefined);
  assert.equal(bericht.zukunft, 398); assert.equal(leer.betriebe[0].abgleichHinweis.zukunft, 398);
  // zweites Einlesen derselben Datei: nichts doppelt, nichts neu gezählt
  const r2 = st.zusammenfuehren(leer, (await st.importSicherung(blob)).wurzel, { jetzt }); assert.equal(leer.betriebe[0].messungen.length, 399); assert.equal(r2.bericht.zukunft, 0); assert.equal(r2.bericht.konflikte, 0);
  // Rundreise: die Markierung übersteht Speichern und Laden
  const w2 = st.migrierenWurzel(J(leer)); assert.equal(w2.betriebe[0].messungen.filter((x) => x.datumPruefen === true).length, 398);
  // in ein vorhandenes Handy (verschmelzen): ebenfalls übernommen
  const a = laden("Z1"); const v = st.verschmelzen(a, b, { jetzt }); assert.equal(v.messungen.filter((x) => x.datumPruefen).length, 398);
});

// ---------- P2 B5: Datei aus neuerer Fassung ----------
test("P2 B5: unbekannte Felder an Wurzel, Laden und Einträgen bleiben erhalten (Rundreise über Speichern-Form, Sicherung und Einlesen)", async () => {
  idbAttrappe(); await st.laden();
  const b = mitGerichten();
  b.zukunftsFeld = { x: [1, 2] }; b.gerichte[0].neuesFeld = "g"; b.artikel[0].artikelNeu = 5; b.kosten[0].kostenNeu = true;
  b.personen[0].personNeu = "p"; b.tagesnotizen.push({ id: "t1", datum: "2026-11-10", umsatz: 5, erfasst: "2026-11-10T20:00:00.000Z", nacherfasst: false, storniert: false, notizNeu: 1 });
  b.kuehlstellen = [{ id: "ks1", name: "K", art: "kuehl", min: null, max: null, reihe: 0, archiviert: false, kuehlNeu: "k" }];
  b.lieferanten = [{ id: "li1", name: "Metro", namen: ["Metro"], art: "sonstiges", modus: "lieferung", tage: [], schluss: null, lieferzeit: null, mindestwert: null, weg: null, kontakt: "", kundennummer: "", notiz: "", erfasst: null, geaendert: null, entfernt: false, lieferNeu: 1 }];
  b.kassenKombis = [{ id: "kk1", name: "Menü", kassenNamen: [], plu: null, teile: [], kombiNeu: 1 }];
  b.tafel = { sekunden: 12, gruppen: ["speisen"], aktionen: true, sprache: "de", tafelNeu: 1 }; b.lager = { tage: 7, puffer: 2, lagerNeu: 1 };
  b.betrieb.hinweise = [{ id: "h1", status: "neu", zeit: "2026-11-01T00:00:00.000Z", hinweisNeu: 1 }];
  b.messungen.push({ id: "m1", lfd: 1, stelle: "k1", datum: "2026-11-10", zeit: "2026-11-10T06:00:00.000Z", wert: 4, erfasst: "2026-11-10T06:00:00.000Z", storniert: false, messNeu: [1] });
  const w = wurzelMit(b); w.wurzelNeu = { a: 1 }; w.schema = 6;
  const geladen = st.migrierenWurzel(J(w));
  const pruefen = (g, wo) => { const l = g.betriebe[0];
    if (wo !== "Einlesen") assert.deepEqual(g.wurzelNeu, { a: 1 }, wo + " Wurzel"); // Einlesen: die Wurzel gehört zu diesem Handy, nur die Läden kommen herüber
    assert.deepEqual(l.zukunftsFeld, { x: [1, 2] }, wo + " Laden"); assert.equal(l.gerichte[0].neuesFeld, "g"); assert.equal(l.artikel[0].artikelNeu, 5); assert.equal(l.kosten[0].kostenNeu, true);
    assert.equal(l.personen[0].personNeu, "p"); assert.equal(l.tagesnotizen[0].notizNeu, 1); assert.equal(l.kuehlstellen[0].kuehlNeu, "k"); assert.equal(l.lieferanten[0].lieferNeu, 1); assert.equal(l.kassenKombis[0].kombiNeu, 1);
    assert.equal(l.tafel.tafelNeu, 1); assert.equal(l.lager.lagerNeu, 1); assert.equal(l.betrieb.hinweise[0].hinweisNeu, 1); assert.deepEqual(l.messungen[0].messNeu, [1]); };
  pruefen(geladen, "Laden");
  const s1 = await st.exportDatei(geladen, { mitAblage: false }); const r1 = await st.importSicherung(s1.blob); pruefen(r1.wurzel, "Sicherung");
  const leer = st.leereWurzel(); st.zusammenfuehren(leer, r1.wurzel, { jetzt: JETZT }); pruefen(leer, "Einlesen");
  // speichern → laden (IndexedDB-Attrappe)
  assert.equal(await st.sofortSpeichern(J(geladen), { stempel: false }), true); const aus = await st.laden(); pruefen(aus, "Speicher");
});
test("P2 B5: Schema der Datei höher als das der App wird mit EINEM Grund abgelehnt – Kopf schema 6 mit wurzel.schema 7, Kopf 7, altes Format", async () => {
  const wurzel = J(wurzelMit(laden())); const inhalt = JSON.stringify({ exportiert: "2026-11-12T00:00:00.000Z", geraet: "g", fassung: "x", wurzel: { ...wurzel, schema: st.SCHEMA + 1 }, ereignisse: [] });
  const grund = async (text) => { try { await st.importDatei(text); return null; } catch (e) { return e.grund; } };
  assert.equal(await grund(JSON.stringify({ typ: "gastrocalc-sicherung", schema: st.SCHEMA, sha256: null }) + "\n" + inhalt), "neuer", "Kopf 6, Wurzel 7");
  assert.equal(await grund(JSON.stringify({ typ: "gastrocalc-sicherung", schema: st.SCHEMA + 1, sha256: null }) + "\n" + inhalt), "neuer", "Kopf 7");
  assert.equal(await grund(JSON.stringify({ typ: "gastrocalc-sicherung", schema: st.SCHEMA, wurzel: { ...wurzel, schema: st.SCHEMA + 1 } })), "neuer", "altes Format");
  const gut = { typ: "gastrocalc-sicherung", schema: st.SCHEMA, sha256: null }; assert.equal(await grund(JSON.stringify(gut) + "\n" + JSON.stringify({ wurzel: { ...wurzel, schema: st.SCHEMA }, ereignisse: [] })), null);
  // über die ZIP-Sicherung
  idbAttrappe(); await st.laden(); const zip = await import("../js/zip.js"); const blob = await zip.zipBlob([{ name: st.SICHERUNG_JSON, daten: JSON.stringify({ typ: "gastrocalc-sicherung", schema: st.SCHEMA, sha256: null }) + "\n" + inhalt }]);
  await assert.rejects(st.importSicherung(blob), (e) => e.grund === "neuer");
  assert.match(l6y.l6yText("neuer", "de"), /neueren App.*aktualisieren/); for (const sp of ["tr", "ar", "en", "fr"]) assert.ok(l6y.l6yText("neuer", sp).length > 10, sp);
});
test("P2 B7/C3: testphase.ohneCode und bio.id gehen beim Neustart nicht verloren (Wurzel → Speichern-Form → migrierenWurzel)", async () => {
  const modus = await import("../js/modus.js");
  const w = wurzelMit(laden()); modus.testphaseSetzen(w, true); modus.bioSetzen(w, "bio-123");
  const geladen = st.migrierenWurzel(J(w)); assert.equal(geladen.testphase.ohneCode, true); assert.equal(modus.testphaseOhneCode(geladen), true); assert.equal(geladen.bio.id, "bio-123"); assert.equal(modus.bioKennung(geladen), "bio-123");
  idbAttrappe(); await st.laden(); await st.sofortSpeichern(w, { stempel: false }); const aus = await st.laden(); assert.equal(aus.testphase.ohneCode, true); assert.equal(aus.bio.id, "bio-123");
  // kaputte Werte fallen weg
  const k = st.migrierenWurzel({ schema: 6, betriebe: [], testphase: { ohneCode: "ja" }, bio: { id: 5 } }); assert.equal(k.testphase, undefined); assert.equal(k.bio, undefined);
  // die Sicherung nimmt sie mit, das Einlesen übernimmt sie nicht in ein fremdes Handy (gehört zu diesem Handy: zusammenfuehren ändert die Wurzel nicht)
  const leer = st.leereWurzel(); st.zusammenfuehren(leer, geladen, { jetzt: JETZT }); assert.equal(leer.testphase, undefined);
});

// ---------- P2 B6: kaputter Monatsteil ----------
test("P2 B6: halb abgeschnittener Teil messungen|2026-11 – die Einträge bis zum letzten vollständigen werden gerettet, ladeFehler sagt „gerettet“, der Rohtext geht in die Vollsicherung", async () => {
  const a = idbAttrappe(); await st.laden();
  const b = laden("R1");
  for (let i = 0; i < 20; i++) b.messungen.push({ id: "m" + i, lfd: i + 1, stelle: "k1", datum: "2026-11-" + String(i + 1).padStart(2, "0"), zeit: `2026-11-${String(i + 1).padStart(2, "0")}T06:00:00.000Z`, wert: 4, erfasst: `2026-11-${String(i + 1).padStart(2, "0")}T06:00:00.000Z`, storniert: false, notiz: "mit \"Anführungszeichen\" und } Klammern {" });
  b.messungen.push({ id: "okt", lfd: 99, stelle: "k1", datum: "2026-10-05", zeit: "2026-10-05T06:00:00.000Z", wert: 3, erfasst: "2026-10-05T06:00:00.000Z", storniert: false });
  const w = wurzelMit(b); await st.sofortSpeichern(w, { stempel: false });
  const teil = [...a.speicher("gastrocalc", "teile").values()].find((v) => v.j === "messungen" && v.m === "2026-11"); assert.ok(teil);
  const voll = teil.t; teil.t = voll.slice(0, Math.floor(voll.length * 0.7)); // mitten in einem Eintrag abgeschnitten
  const heil = st.arrayRetten(teil.t); assert.ok(heil.length > 5 && heil.length < 20);
  let geladen; await assert.doesNotReject(async () => { geladen = await st.laden(); });
  const l = geladen.betriebe[0];
  assert.equal(l.messungen.filter((x) => x.datum.startsWith("2026-11")).length, heil.length, "gerettete Zahl");
  assert.equal(l.messungen.filter((x) => x.datum.startsWith("2026-10")).length, 1, "der andere Monat ist heil");
  const f = geladen.ladeFehler.find((x) => x.journal === "messungen" && x.monat === "2026-11"); assert.equal(f.grund, "gerettet"); assert.equal(f.gerettet, heil.length); assert.equal(f.roh, undefined);
  assert.equal(st.ladeProbleme().fehlt.some((x) => x.grund === "gerettet"), true);
  // nach dem nächsten Speichern liegt der gerettete Teil ordentlich im Speicher, der Rohtext aber noch in der Vollsicherung
  await st.sofortSpeichern(geladen, { stempel: false }); const spaeter = [...a.speicher("gastrocalc", "teile").values()].find((v) => v.j === "messungen" && v.m === "2026-11"); assert.equal(JSON.parse(spaeter.t).length, heil.length);
  const s = await st.exportDatei(geladen, { mitAblage: false }); const r = await st.importSicherung(s.blob);
  assert.equal(r.rohteile.length, 1); assert.equal(r.rohteile[0].text, teil.t); assert.equal(r.rohteile[0].journal, "messungen"); assert.equal(r.rohteile[0].monat, "2026-11");
  // noch einmal laden: der Rohtext bleibt, wird nicht doppelt
  await st.laden(); const s2 = await st.importSicherung((await st.exportDatei(geladen, { mitAblage: false })).blob); assert.equal(s2.rohteile.length, 1);
});
test("P2 B6: völlig unlesbarer Teil wirft nichts, wird wie bisher als „kaputt“ gemeldet", async () => {
  const a = idbAttrappe(); await st.laden(); const b = laden("R2"); b.messungen.push({ id: "m1", lfd: 1, stelle: "k1", datum: "2026-11-01", zeit: "2026-11-01T06:00:00.000Z", wert: 4, erfasst: "2026-11-01T06:00:00.000Z", storniert: false });
  await st.sofortSpeichern(wurzelMit(b), { stempel: false }); const teil = [...a.speicher("gastrocalc", "teile").values()].find((v) => v.j === "messungen"); teil.t = "%%%";
  const g = await st.laden(); assert.equal(g.ladeFehler[0].grund, "kaputt"); assert.deepEqual(st.arrayRetten("%%%"), []); assert.deepEqual(st.arrayRetten(undefined), []);
});

// ---------- P2 C4: ZIP von Windows oder mit Ordner ----------
import zlib from "node:zlib";
const crcTab = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcTab[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
// ZIP wie vom Windows-Explorer: Ordner-Einträge, Deflate (Methode 8), Namen mit Ordner; per node:zlib erzeugt, nur im Test
function zipWindows(eintraege, { methode = 8, trenner = "/" } = {}) {
  const teile = [], zentral = []; let off = 0;
  for (const e of eintraege) {
    const name = Buffer.from(e.name.replace(/\//g, trenner)), roh = Buffer.from(e.daten ?? ""); const istOrdner = e.name.endsWith("/");
    const dat = istOrdner ? Buffer.alloc(0) : methode === 8 ? zlib.deflateRawSync(roh) : roh; const m = istOrdner ? 0 : methode;
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(m, 8); h.writeUInt32LE(istOrdner ? 0 : crc(roh), 14); h.writeUInt32LE(dat.length, 18); h.writeUInt32LE(roh.length, 22); h.writeUInt16LE(name.length, 26);
    teile.push(h, name, dat);
    const z = Buffer.alloc(46); z.writeUInt32LE(0x02014b50, 0); z.writeUInt16LE(20, 4); z.writeUInt16LE(20, 6); z.writeUInt16LE(0x0800, 8); z.writeUInt16LE(m, 10); z.writeUInt32LE(istOrdner ? 0 : crc(roh), 16); z.writeUInt32LE(dat.length, 20); z.writeUInt32LE(roh.length, 24); z.writeUInt16LE(name.length, 28); z.writeUInt32LE(off, 42);
    zentral.push(z, name); off += 30 + name.length + dat.length;
  }
  const zg = zentral.reduce((s, x) => s + x.length, 0); const ende = Buffer.alloc(22); ende.writeUInt32LE(0x06054b50, 0); ende.writeUInt16LE(eintraege.length, 8); ende.writeUInt16LE(eintraege.length, 10); ende.writeUInt32LE(zg, 12); ende.writeUInt32LE(off, 16);
  return new Blob([...teile, ...zentral, ende], { type: "application/zip" });
}
test("P2 C4: ZIP mit Deflate (per node:zlib erzeugt, Methode 8) wird gelesen – Node 22 hat DecompressionStream global, derselbe App-Code läuft im Browser", async () => {
  assert.equal(typeof DecompressionStream, "function");
  const zip = await import("../js/zip.js");
  const z = zipWindows([{ name: "a.txt", daten: "Hallo ".repeat(500) }, { name: "b.json", daten: '{"x":1}' }]);
  assert.equal((await zip.zipLesen(z)).length, 0, "ohne Option bleibt es wie bisher (gepackte überspringen, tests/verkauf)");
  const e = await zip.zipLesen(z, { gepackt: true }); assert.deepEqual(e.map((x) => x.name), ["a.txt", "b.json"]);
  assert.equal(new TextDecoder().decode(await e[0].bytes()), "Hallo ".repeat(500)); assert.equal(await e[0].crcOk(), true); assert.equal(e[0].gepackt, true);
  const sicher = zipWindows([{ name: "x.bin", daten: "A".repeat(1000) }]); const x = (await zip.zipLesen(sicher, { gepackt: true }))[0]; assert.equal(await x.crcOk(), true);
});
test("P2 C4: Windows-ZIP einer Sicherung (Deflate, Ordner „gastrocash-sicherung/“, Ordner-Einträge, Rückwärts-Schrägstriche, __MACOSX) wird eingelesen wie das Original", async () => {
  idbAttrappe(); await st.laden();
  const b = laden("W1"); stamm.teamTagSetzen(b, "2027-01-02", [{ person: "p1", name: "A", stunden: 6 }]);
  const orig = await st.exportDatei(wurzelMit(b), { mitAblage: false }); const zip = await import("../js/zip.js");
  const eint = await zip.zipLesen(orig.blob); const json = new TextDecoder().decode(await eint.find((x) => x.name === st.SICHERUNG_JSON).bytes());
  const mitOrdner = (opt) => zipWindows([{ name: "gastrocash-sicherung/" }, { name: "gastrocash-sicherung/" + st.SICHERUNG_JSON, daten: json }, { name: "gastrocash-sicherung/ablage.json", daten: JSON.stringify({ foto1: { typ: "image/jpeg", groesse: 3 } }) },
    { name: "gastrocash-sicherung/ablage/" }, { name: "gastrocash-sicherung/ablage/foto1", daten: "abc" }, { name: "__MACOSX/gastrocash-sicherung/._x", daten: "x" }], opt);
  for (const opt of [{ methode: 8 }, { methode: 0 }, { methode: 8, trenner: "\\" }]) {
    const r = await st.importSicherung(mitOrdner(opt));
    assert.equal(r.pruefsumme, "ok", JSON.stringify(opt)); assert.equal(r.wurzel.betriebe[0].teamTage.length, 1); assert.deepEqual(r.ablage.map((x) => [x.id, x.typ]), [["foto1", "image/jpeg"]]);
    assert.equal(new TextDecoder().decode(await r.ablage[0].eintrag.bytes()), "abc");
  }
  // zwei verschiedene Ordner: nichts wird abgeschnitten
  const zwei = await zip.zipLesen(zipWindows([{ name: "a/x.txt", daten: "1" }, { name: "b/y.txt", daten: "2" }]), { gepackt: true }); assert.deepEqual(zwei.map((x) => x.name), ["a/x.txt", "b/y.txt"]);
  const eins = await zip.zipLesen(zipWindows([{ name: "a/x.txt", daten: "1" }, { name: "y.txt", daten: "2" }]), { gepackt: true }); assert.deepEqual(eins.map((x) => x.name), ["a/x.txt", "y.txt"]);
});

// ---------- P2 C5: Größen- und Wertegrenzen, Einlesen als ein Vorgang, Rückholpunkt ----------
test("P2 C5: Wertegrenzen – unendliche, negative und zu große Beträge, ungültige Daten, zu langer Ladenname werden gezählt und übersprungen (bericht.ungueltig), nie still übernommen", async () => {
  idbAttrappe(); await st.laden();
  const b = laden("V1"); b.betrieb.name = "N".repeat(100);
  b.tagesnotizen = [{ id: "t1", datum: "2026-11-01", umsatz: 500, erfasst: "2026-11-01T20:00:00.000Z", storniert: false }, { id: "t2", datum: "2026-11-02", umsatz: 1e9, erfasst: "x" }, { id: "t3", datum: "2026-02-30", umsatz: 5, erfasst: "x" }, { id: "t4", datum: "2026-11-04", umsatz: -3, erfasst: "x" }, { id: "t5", datum: "2026-11-05", umsatz: 5e6, erfasst: "2026-11-05T20:00:00.000Z" }];
  b.kosten = [{ id: "k1", kategorie: "miete", posten: "miete", betrag: 1000 }, { id: "k2", kategorie: "miete", posten: "x", betrag: -5 }, { id: "k3", kategorie: "miete", posten: "y", betrag: 2e7 }, { id: "k4", kategorie: "miete", posten: "z", betrag: null }];
  b.schwund = [{ id: "s1", datum: "2026-11-01" }, { id: "s2", datum: "gestern" }]; b.kostenbelege = [{ id: "b1", stelle: "x", betrag: Infinity, ab: "2026-11-01" }];
  const text = JSON.stringify({ typ: "gastrocalc-sicherung", schema: st.SCHEMA, sha256: null }) + "\n" + JSON.stringify({ wurzel: { ...J(wurzelMit(b)), betriebe: [JSON.parse(JSON.stringify(b, (k, v) => (v === Infinity ? 1e400 : v)))] }, ereignisse: [] });
  const r = await st.importDatei(text.replace('"betrag":null,"ab"', '"betrag":1e999,"ab"'));
  const l = r.wurzel.betriebe[0];
  assert.deepEqual(l.tagesnotizen.map((x) => x.id), ["t1", "t5"]); assert.deepEqual(l.kosten.map((x) => x.id), ["k1", "k4"]); assert.deepEqual(l.schwund.map((x) => x.id), ["s1"]); assert.equal(l.kostenbelege.length, 0);
  assert.equal(l.betrieb.name.length, 40);
  assert.equal(r.ungueltig, 3 + 2 + 1 + 1 + 1, "t2, t3, t4 · k2, k3 · s2 · Beleg mit unendlichem Betrag · Ladenname > 80"); 
  const leer = st.leereWurzel(); const bericht = st.zusammenfuehren(leer, r.wurzel, { jetzt: JETZT }).bericht; assert.equal(bericht.ungueltig, 8);
  const sauber = await st.importDatei(JSON.stringify({ typ: "gastrocalc-sicherung", schema: st.SCHEMA, wurzel: J(wurzelMit(laden("V2"))) })); assert.equal(sauber.ungueltig, 0);
});
test("P2 C5: Größengrenzen – Datei über 200 MB, Text über 50 MB und eine entpackte Zip-Bombe werden abgelehnt (grund „gross“)", async () => {
  const gross = async (f) => { try { await f(); return null; } catch (e) { return e.grund; } };
  assert.equal(await gross(() => st.importSicherung({ size: 201 * 1024 * 1024 })), "gross");
  assert.equal(await gross(() => st.importDatei("x".repeat(51 * 1024 * 1024))), "gross");
  const zip = await import("../js/zip.js"); assert.equal(zip.ZIP_GESAMT_MAX, 200 * 1024 * 1024); assert.equal(zip.ZIP_EINZEL_MAX, 50 * 1024 * 1024);
  const bombe = zipWindows([{ name: st.SICHERUNG_JSON, daten: Buffer.alloc(51 * 1024 * 1024, 32) }]); assert.ok(bombe.size < 1024 * 1024, "klein gepackt");
  assert.equal(await gross(() => st.importSicherung(bombe)), "gross");
  assert.match(l6y.l6ySatz("zuGross", "de", 200), /200 MB/);
});
test("P2 C5: zusammenfuehren ist ein Vorgang – bei einem Fehler mitten im Einlesen bleibt die Wurzel unverändert (alte und sichere Variante)", async () => {
  const a = laden("L1"), c = laden("L2"); a.betrieb.name = "A-alt"; const w = wurzelMit(a, c); const vorher = JSON.stringify(w);
  const fremdA = J(a); fremdA.betrieb.name = "A-neu"; fremdA.stammZeit = { betrieb: "2030-01-01T00:00:00Z" }; fremdA.teamTage = [{ datum: "2027-01-02", eintraege: [] }];
  const kaputt = { betriebe: [fremdA, null], aktiv: "L1", sprache: "de" }; // der zweite Laden wirft beim Zusammenführen
  assert.throws(() => st.zusammenfuehren(w, kaputt, { jetzt: JETZT })); assert.equal(JSON.stringify(w), vorher, "alte Signatur: nichts halb geändert");
  assert.throws(() => st.zusammenfuehrenSicher(w, kaputt, { jetzt: JETZT })); assert.equal(JSON.stringify(w), vorher, "sichere Variante");
  idbAttrappe(); await st.laden(); await assert.rejects(st.einlesenSicher(w, kaputt, { jetzt: JETZT })); assert.equal(JSON.stringify(w), vorher); assert.equal(await st.rueckholpunktInfo(), null, "kein Rückholpunkt nach Fehler");
  // gutes Einlesen: die sichere Variante gibt eine Kopie zurück, die Wurzel bleibt, bis die App übernimmt
  const gut = { betriebe: [fremdA], aktiv: "L1", sprache: "de" };
  const s = st.zusammenfuehrenSicher(w, gut, { jetzt: JETZT }); assert.equal(JSON.stringify(w), vorher); assert.equal(s.wurzel.betriebe[0].teamTage.length, 1); assert.equal(s.wurzel.betriebe[1], w.betriebe[1], "unberührter Laden bleibt dasselbe Objekt");
  const alt = st.zusammenfuehren(w, gut, { jetzt: JETZT }); assert.equal(alt.ersetzt, 1); assert.equal(alt.neu, 0); assert.equal(w.betriebe[0].teamTage.length, 1); assert.ok(alt.bericht);
});
test("P2 C5: Rückholpunkt – einlesenSicher merkt die alte Wurzel im eigenen Schlüssel „rueckhol“ neben dem Kopf, zurueckholen stellt sie wieder her", async () => {
  const a = idbAttrappe(); await st.laden();
  const l = laden("L1"); stamm.teamTagSetzen(l, "2027-01-02", [{ person: "p1", name: "A", stunden: 6 }]); const w = wurzelMit(l); await st.sofortSpeichern(w, { stempel: false });
  const vorher = JSON.stringify(st.migrierenWurzel(J(w)));
  const fremd = J(l); fremd.teamTage = []; stamm.teamTagSetzen(fremd, "2027-01-05", [{ person: "p1", name: "A", stunden: 3 }]);
  const r = await st.einlesenSicher(w, { betriebe: [fremd], aktiv: "L1" }, { jetzt: JETZT });
  assert.equal(r.rueckhol, true); assert.equal(w.betriebe[0].teamTage.length, 2); const stand = a.speicher("gastrocalc", "stand");
  assert.ok(stand.has("rueckhol") && stand.has("kopf") && stand.has("rueckhol-info"), "eigener Schlüssel neben dem Kopf"); assert.equal(stand.get("rueckhol").wurzel.betriebe[0].teamTage.length, 1);
  const info = await st.rueckholpunktInfo(); assert.equal(info.grund, "einlesen"); assert.ok(info.zeit);
  await st.sofortSpeichern(w, { stempel: false }); // wie die App nach dem Einlesen speichert
  const z = await st.zurueckholen(w); assert.equal(JSON.stringify(z.wurzel), vorher, "Stand von vor dem Einlesen ist zurück");
  assert.equal((await st.laden()).betriebe[0].teamTage.length, 1, "auch im Speicher"); assert.equal(await st.rueckholpunktInfo(), null, "Punkt verbraucht"); assert.equal(stand.has("rueckhol"), false);
  assert.equal(await st.zurueckholen(), null, "nichts mehr da");
  assert.match(l6y.l6yText("rueckgaengig", "de"), /rückgängig/);
});

// ---------- P2 C6: Ereignisprotokoll ----------
test("P2 C6: „app-sichtbar“ wird höchstens einmal je Stunde protokolliert; beim Kürzen auf 2000 bleiben Import, Abgleich, Sicherung und Fehler erhalten", async () => {
  const a = idbAttrappe(); await st.laden();
  for (let i = 0; i < 6; i++) await st.ereignis("app-sichtbar", { phase: "app" });
  assert.equal((await st.alleEreignisse()).filter((e) => e.art === "app-sichtbar").length, 1, "sechs Rückkehr-Meldungen, ein Eintrag");
  await st.ereignis("import", { betriebe: 1 }); assert.equal((await st.alleEreignisse()).filter((e) => e.art === "import").length, 1, "andere Ereignisse nicht gebremst");
  // Speicher bis über den Deckel füllen: die wichtigen stehen ganz vorn (am ältesten)
  const store = a.speicher("gastrocalc", "ereignisse"); store.clear(); let k = 0;
  const wichtig = ["import", "abgleich", "sicherung-ort", "speicher-fremder-stand", "fehler", "export", "einlesen-zurueck", "import-ersetzt"];
  for (const art of wichtig) store.set(++k, { id: "w" + k, zeit: "2026-10-01T00:00:00.000Z", art });
  for (let i = 0; i < 2300; i++) store.set(++k, { id: "x" + k, zeit: "2026-10-02T00:00:00.000Z", art: i % 2 ? "app-sichtbar" : "umsatz-laden" });
  await st.laden(); // Deckel greift beim Laden
  const e = await st.alleEreignisse(); assert.equal(e.length, 2000);
  for (const art of wichtig) assert.ok(e.some((x) => x.art === art), "wichtig bleibt: " + art);
  assert.ok(e.at(-1).id === "x" + k, "die neuesten gewöhnlichen bleiben");
  assert.equal(st.ereignisWichtig("import-pruefsumme"), true); assert.equal(st.ereignisWichtig("app-sichtbar"), false);
});
