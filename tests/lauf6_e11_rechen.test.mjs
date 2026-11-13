// Lauf 6, E11 (13.11.2026): Rechenfehler aus dem Prüfbericht – je Fund ein Test (A1, A2, B1, C1, C2, C4, C5, Rundreise netto/brutto).
// Läuft in TZ=UTC und TZ=Europe/Berlin gleich. Die Hänger-Fälle (C4) laufen in einem Kindprozess mit Frist, damit ein Rückfall den Test nicht blockiert.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { beispielLaden } from "../js/beispiel.js";
import * as Z from "../js/zaehler.js";
import { monatsPosten, wasBleibt, prueferBlick, steuerTopf } from "../js/steuertopf.js";
import { umsatzSteuerSatz } from "../js/engine.js";
import { termineLaden, liquiditaetLaden } from "../js/welle3.js";
import { monatsZahlen, monatEinfrieren, eingefroren, abschlussVeraltet, monatVergleich } from "../js/monatsabschluss.js";
import { cent, euro, rund2, summe, verteilen } from "../js/geld.js";
import { fmtEuro, fmtZahl } from "../js/util.js";
import { berlinZeitpunkt, plusTage } from "../js/zeit.js";
import { schichtStunden, eintragStunden, schichtZaehler, zaehlerSumme, schichtenAusLaden, arbeitszeitListe } from "../js/schichten.js";
import { teamTagSetzen } from "../js/stamm.js";
import { monatsLohn } from "../js/hinweis_motor.js";
import { mindestlohnAm, naechsteErhoehung } from "../js/data/mindestlohn.js";
import { regel } from "../js/data/regelwerk.js";
import { minijobGrenzeStunden } from "../js/schichten.js";
import { ustTermine, lohnsteuerTermine, svTermin, svTermine } from "../js/fristen.js";

const WURZEL = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const H = "2026-11-10";
const laden = () => beispielLaden("2026-11-11");
const klon = (v, f) => { const s = structuredClone(v); f?.(s); return s; };
const euroText = (s) => s.replace(/[  ]/g, " ");

// ───────────── A1 Kleinunternehmer: Umsatz wird nicht um Umsatzsteuer gekürzt ─────────────
test("A1: Kleinunternehmer – die eine Stelle für den Umsatzsteuersatz liefert 0", () => {
  const s = klon(laden(), (x) => { x.betrieb.kleinunternehmer = true; });
  assert.deepEqual(umsatzSteuerSatz(s), { satz: 0, quelle: "kleinunternehmer", geschaetzt: false });
  const o = klon(laden(), (x) => { x.betrieb.kleinunternehmer = true; x.betrieb.steuerSatz = 0.07; }); // ein eigener Mischsatz ändert daran nichts
  assert.equal(umsatzSteuerSatz(o).satz, 0);
  assert.equal(Z.zaehler(s, { datum: H }).steuer, 0);
});
test("A1: Beispiel-Laden mit Schalter an – netto = brutto, Nullpunkt = Wert mit Satz 0", () => {
  const ku = klon(laden(), (x) => { x.betrieb.kleinunternehmer = true; });
  const p = monatsPosten(ku, "2026-11");
  assert.equal(p.umsatzBrutto, 7470); assert.equal(p.umsatzNetto, p.umsatzBrutto); // vorher netto 6.924,40 €
  const nullKu = Z.monatsZiel(ku, Z.zaehler(ku, { datum: H }), H).nullpunkt;
  const satz0 = klon(laden(), (x) => { x.betrieb.kleinunternehmer = true; x.betrieb.steuerSatz = 0; }); // der alte Umweg: Schalter an UND Satz 0 von Hand im Büro
  const nullSatz0 = Z.monatsZiel(satz0, Z.zaehler(satz0, { datum: H }), H).nullpunkt;
  assert.equal(nullKu, nullSatz0); assert.equal(nullKu.toFixed(2), "18491.60"); // vorher 19.965,38 €
  assert.equal(wasBleibt(ku, "2026-11").ergebnis, -3651.77); // vorher -4.197,37 €
  const pb = prueferBlick(ku, "2026-11"); assert.equal(pb.quote, Math.round(p.ware / p.umsatzBrutto * 10000) / 10000); // Wareneinsatz-Quote auf den vollen Umsatz
  assert.equal(steuerTopf(ku, "2026-11"), null); // kein Topf, wie bisher
});
test("A1: ohne Schalter bleibt alles unverändert (Beispiel-Laden, Tag 2026-11-10)", () => {
  const s = laden();
  assert.equal(umsatzSteuerSatz(s).quelle, "karte");
  const p = monatsPosten(s, "2026-11"); assert.equal(p.umsatzBrutto, 7470); assert.equal(p.umsatzNetto, 6924.4);
  assert.equal(Z.monatsZiel(s, Z.zaehler(s, { datum: H }), H).nullpunkt.toFixed(2), "19819.30");
  assert.equal(wasBleibt(s, "2026-11").ergebnis, -4114.34);
});
test("A1: Monatsabschluss – Zahlen für Kleinunternehmer ohne Abzug; eingefrorene Monate bleiben wie gespeichert", () => {
  const ku = klon(laden(), (x) => { x.betrieb.kleinunternehmer = true; });
  const live = monatsZahlen(ku, "2026-11"); assert.equal(live.umsatzNetto, live.umsatzBrutto); assert.equal(live.ergebnis, -3651.77);
  // Oktober wird im Regelbetrieb eingefroren, danach schaltet der Wirt auf Kleinunternehmer: der gespeicherte Monat bleibt, wie er war
  const s = laden(); const alt = monatEinfrieren(s, "2026-10", { jetzt: "2026-11-01T05:00:00.000Z" });
  assert.ok(alt.umsatzNetto < alt.umsatzBrutto);
  const gespeichert = JSON.stringify(eingefroren(s, "2026-10"));
  s.betrieb.kleinunternehmer = true;
  assert.equal(JSON.stringify(eingefroren(s, "2026-10")), gespeichert);
  assert.equal(abschlussVeraltet(s, "2026-10"), false);
  assert.equal(monatVergleich(s, "2026-11").vormonat.umsatzNetto, alt.umsatzNetto);
  // ein Monat ohne Abschluss rechnet live mit dem neuen Satz
  assert.equal(monatsZahlen(s, "2026-10").umsatzNetto, monatsZahlen(s, "2026-10").umsatzBrutto);
});

// ───────────── A2 Liquidität: Quartals-Umsatzsteuer ─────────────
const mitDezember = (rhythmus) => klon(laden(), (s) => {
  s.betrieb.ustRhythmus = rhythmus; s.betrieb.bundesland = "BW";
  for (let d = "2026-12-01"; d <= "2026-12-31"; d = plusTage(d, 1)) s.tagesnotizen.push({ id: "d" + d, datum: d, umsatz: 700, erfasst: d + "T20:00:00Z", storniert: false });
  s.liquiditaet = { betrag: 20000, datum: "2026-12-20" };
});
const ustTag = (s) => { const t = termineLaden(s, "2026-12-20", 56).filter((x) => x.art === "ust")[0]; const l = liquiditaetLaden(s, "2026-12-20"); return { t, tag: l.tage.find((x) => x.datum === t.datum), l }; };
test("A2: Quartals-Termin 2026-Q4 trägt die Zahllast der drei Monate (vorher nur die Ware am Montag)", () => {
  const m = ustTag(mitDezember("monat")); const q = ustTag(mitDezember("quartal"));
  assert.equal(q.t.zeitraum, "2026-Q4"); assert.equal(q.t.datum, "2027-01-11"); assert.equal(m.t.zeitraum, "2026-12");
  const s = mitDezember("quartal"); const drei = rund2(["2026-10", "2026-11", "2026-12"].reduce((a, mo) => a + steuerTopf(s, mo).zahllast, 0));
  const ware = rund2(m.tag.raus - steuerTopf(s, "2026-12").zahllast); // der Montag 2027-01-11 trägt die Wochen-Ware
  assert.equal(ware, 1399.46); assert.ok(drei > 0);
  assert.equal(q.tag.raus, rund2(ware + drei)); assert.equal(q.tag.raus, 4229.27); // vorher 1.399,46 €
  assert.equal(q.l.tiefster.betrag, 14920.03); assert.equal(q.l.tiefster.datum, "2027-02-01"); // vorher 15.724,11 € am 01.01.2027
});
test("A2: Monats-Rhythmus unverändert; Quartal ohne Daten in einzelnen Monaten rechnet mit dem, was da ist; Kleinunternehmer ohne Posten", () => {
  assert.equal(ustTag(mitDezember("monat")).tag.raus, 2984.4);
  const s = mitDezember("quartal"); s.tagesnotizen = s.tagesnotizen.filter((n) => !n.datum.startsWith("2026-10")); // Oktober ohne Umsatz
  const { tag } = ustTag(s); const drei = rund2(["2026-10", "2026-11", "2026-12"].reduce((a, mo) => a + steuerTopf(s, mo).zahllast, 0));
  assert.equal(tag.raus, rund2(1399.46 + (drei > 0 ? drei : 0)));
  const ku = mitDezember("quartal"); ku.betrieb.kleinunternehmer = true;
  assert.equal(termineLaden(ku, "2026-12-20", 56).filter((x) => x.art === "ust").length, 0);
});

// ───────────── B1 Schicht mit gleichem Beginn und Ende ─────────────
test("B1: gleicher Beginn und gleiches Ende = 0 Stunden aus von/bis (vorher 24 h)", () => {
  assert.equal(schichtStunden("08:00", "08:00"), 0); assert.equal(schichtStunden("08:00", "08:00", "2026-11-10"), 0);
  assert.deepEqual(schichtZaehler("2026-11-10", "08:00", "08:00"), { gesamt: 0, nacht25: 0, nacht40: 0, sonntag: 0, feiertag125: 0, feiertag150: 0 });
  assert.equal(schichtStunden("22:00", "06:00"), 8); assert.equal(schichtStunden("08:00", "16:30"), 8.5); assert.equal(schichtStunden("xx", "08:00"), null);
});
test("B1: gespeicherte Stunden gelten bei gleicher Zeit, ohne Zuschlags-Aufteilung", () => {
  assert.equal(eintragStunden({ von: "08:00", bis: "08:00", stunden: 8, datum: "2026-11-10" }), 8);
  assert.equal(eintragStunden({ von: "08:00", bis: "08:00", datum: "2026-11-10" }), 0);
  assert.equal(eintragStunden({ von: "08:00", bis: "16:00", stunden: 99, datum: "2026-11-10" }), 8); // echte Zeiten gehen vor
  assert.equal(eintragStunden({ stunden: 6.5 }), 6.5);
  const s = laden(); const pid = s.personen[0].id; s.teamTage ??= [];
  s.teamTage.push({ datum: "2026-11-10", eintraege: [{ person: pid, name: "A", stunden: 8, von: "08:00", bis: "08:00", satz: 12.82, art: "angestellt" }], keine: false, erfasst: "2026-11-10T20:00:00Z" }); // alter Eintrag
  const z = zaehlerSumme(schichtenAusLaden(s, pid, "2026-11-01", "2026-11-30"));
  assert.equal(z.gesamt, 8); assert.equal(z.nacht25 + z.nacht40 + z.sonntag + z.feiertag125 + z.feiertag150, 0); // vorher gesamt 24 h, Nacht 10 h
  const l = arbeitszeitListe(s, "2026-11-10", "2026-11-10").zeilen.find((r) => r.datum === "2026-11-10"); assert.equal(l.stunden, 8);
});
test("B1: 'Mitarbeiter heute' speichert bei von = bis kein von/bis; Stunden und Lohn bleiben", () => {
  const s = laden(); const pid = s.personen[0].id;
  teamTagSetzen(s, "2026-11-10", [{ person: pid, name: "A", stunden: 8, von: "08:00", bis: "08:00", satz: 12.82, art: "angestellt" }, { person: null, name: "B", stunden: 6, von: "10:00", bis: "16:00", satz: 12.82, art: "angestellt" }]);
  const e = s.teamTage.filter((t) => t.datum === "2026-11-10").pop();
  assert.equal(e.eintraege[0].von, undefined); assert.equal(e.eintraege[0].bis, undefined); assert.equal(e.eintraege[0].stunden, 8);
  assert.equal(e.eintraege[1].von, "10:00"); assert.equal(e.eintraege[1].bis, "16:00");
  const z = zaehlerSumme(schichtenAusLaden(s, pid, "2026-11-01", "2026-11-30")); assert.notEqual(z.gesamt, 24);
});
test("B1: hinweis_motor – Schicht in stand.schichten mit gleicher Zeit zählt 0 Lohn; echte Schichten wie vorher", () => {
  const s = laden(); const p = s.personen[0]; p.stundenlohn = 12; s.teamTage = []; s.schichten = [];
  s.schichten.push({ id: "a", datum: "2026-11-10", person: p.id, von: "08:00", bis: "08:00", erfasst: "2026-11-10T20:00:00Z", storniert: false });
  assert.equal(monatsLohn(s, p, "2026-11"), 0);
  s.schichten.push({ id: "b", datum: "2026-11-11", person: p.id, von: "08:00", bis: "16:00", erfasst: "2026-11-11T20:00:00Z", storniert: false });
  assert.equal(monatsLohn(s, p, "2026-11"), 96);
});

// ───────────── C1 negatives Null ─────────────
test("C1: cent, rund2, euro, summe geben nie −0 zurück; fmtEuro und fmtZahl zeigen nie '-0'", () => {
  const winzig = [-0, -0.004, 0.3 - (0.1 + 0.2), -1e-9, -0.0049];
  for (const x of winzig) { assert.ok(!Object.is(cent(x), -0), "cent " + x); assert.ok(!Object.is(rund2(x), -0), "rund2 " + x); assert.ok(!Object.is(summe([x]), -0), "summe " + x); }
  assert.ok(!Object.is(euro(-0), -0)); assert.ok(!Object.is(euro(cent(-0.004)), -0)); assert.ok(!Object.is(summe([]), -0));
  assert.equal(cent(-1.005), -101); assert.equal(rund2(-0.006), -0.01); assert.equal(summe([-0.1, 0.1]), 0); assert.ok(Number.isNaN(rund2("x")));
  for (const x of [-0, -0.004, -0.4, 0.3 - (0.1 + 0.2)]) { assert.ok(!euroText(fmtEuro(x)).includes("-"), "fmtEuro " + x); assert.ok(!fmtZahl(x).includes("-"), "fmtZahl " + x); }
  assert.ok(!fmtEuro(-0.004, { dezimal: 2 }).includes("-")); assert.equal(euroText(fmtEuro(-0.4)), "0 €");
  assert.equal(euroText(fmtEuro(-1234.5, { dezimal: 2 })), "-1.234,50 €"); assert.equal(euroText(fmtEuro(-1)), "-1 €"); assert.equal(fmtZahl(-0.5, 1), "-0,5");
});

// ───────────── C2 doppelte Stunde ─────────────
test("C2: 25.10.2026 02:30 ist die erste (Sommerzeit-)Stunde = 00:30 UTC; Zeitumstellung in Schichten stimmt weiter", () => {
  assert.equal(berlinZeitpunkt("2026-10-25", 2, 30).toISOString(), "2026-10-25T00:30:00.000Z"); // vorher 01:30Z
  assert.equal(berlinZeitpunkt("2026-10-25", 2, 0).toISOString(), "2026-10-25T00:00:00.000Z");
  assert.equal(berlinZeitpunkt("2026-10-25", 2, 59).toISOString(), "2026-10-25T00:59:00.000Z");
  assert.equal(berlinZeitpunkt("2026-10-25", 1, 59).toISOString(), "2026-10-24T23:59:00.000Z");
  assert.equal(berlinZeitpunkt("2026-10-25", 3, 0).toISOString(), "2026-10-25T02:00:00.000Z");
  assert.equal(berlinZeitpunkt("2026-10-24", 22, 0).toISOString(), "2026-10-24T20:00:00.000Z");
  assert.equal(berlinZeitpunkt("2026-03-29", 2, 30).toISOString(), "2026-03-29T01:30:00.000Z"); // Stunde, die es nicht gibt: eine Stunde später (03:30 Sommerzeit)
  assert.equal(schichtStunden("22:00", "06:00", "2026-10-24"), 9); assert.equal(schichtStunden("22:00", "06:00", "2026-03-28"), 7); assert.equal(schichtStunden("22:00", "06:00", "2026-10-26"), 8);
  assert.equal(schichtZaehler("2026-10-24", "22:00", "06:00").gesamt, 9);
});

// ───────────── C4 Endlosschleifen und Ausnahmen ─────────────
test("C4: absurde Jahre und Beträge hängen nicht (Kindprozess mit Frist) und liefern leere Listen bzw. Nullen", () => {
  const code = `
    const F = await import("./js/fristen.js"); const G = await import("./js/geld.js"); const out = {};
    for (const j of [Infinity, -Infinity, NaN, 1e308, 1e9, 1969, 2201, "2026", null, undefined, 2026.5]) {
      out["ust:" + String(j)] = F.ustTermine(j, { rhythmus: "monat" }).length; out["lst:" + String(j)] = F.lohnsteuerTermine(j, { rhythmus: "quartal" }).length + F.lohnsteuerTermine(j, { rhythmus: "jahr" }).length;
      out["est:" + String(j)] = F.estVorauszahlungen(j).length; out["sv:" + String(j)] = F.svTermin(j, 5) === null && F.svTermine(j).length === 0;
    }
    out.svMonat = [F.svTermin(2026, Infinity), F.svTermin(2026, 0), F.svTermin(2026, 13)].every((x) => x === null);
    const bad = [NaN, Infinity, -Infinity, 1e308, -1e308, "abc", null, undefined, 1e16];
    out.verteilen = []; for (const a of bad) for (const g of [...bad, 1]) out.verteilen.push(JSON.stringify(G.verteilen(a, [g, 1])) );
    out.v2 = JSON.stringify(G.verteilen(1000, [1, 1, 1])); out.v3 = JSON.stringify(G.verteilen(1000, [Infinity, 1])); out.v4 = JSON.stringify(G.verteilen(Infinity, [1, 1]));
    console.log(JSON.stringify(out));`;
  const r = spawnSync("node", ["--input-type=module", "-e", code], { cwd: WURZEL, timeout: 15000, encoding: "utf8" });
  assert.ok(!r.error, "Hänger oder Fehler: " + (r.error && r.error.code) + " " + r.stderr);
  const o = JSON.parse(r.stdout.trim().split("\n").pop());
  for (const [k, v] of Object.entries(o)) if (/^(ust|lst|est):/.test(k) && !/:2026$/.test(k)) assert.equal(v, 0, k);
  assert.equal(o["ust:2026"], 0); // Text als Jahr ist keine Zahl → keine Termine
  for (const k of Object.keys(o)) if (k.startsWith("sv:")) assert.equal(o[k], true, k);
  assert.equal(o.svMonat, true); assert.equal(o.v2, "[334,333,333]"); assert.equal(o.v3, "[0,0]"); assert.equal(o.v4, "[0,0]");
  for (const x of o.verteilen) assert.match(x, /^\[-?\d+,-?\d+\]$/); // immer eine Liste ganzer Zahlen, nie ein Hänger
  assert.equal(JSON.stringify(verteilen(1e308, [1, 1])), "[0,0]");
});
test("C4: normale Jahre und Beträge unverändert", () => {
  assert.equal(ustTermine(2026, { rhythmus: "monat" }).length, 12); assert.equal(ustTermine(2026, { rhythmus: "quartal" }).length, 4);
  assert.equal(lohnsteuerTermine(2026, { rhythmus: "jahr" }).length, 1); assert.equal(svTermine(2026).length, 12); assert.equal(svTermin(2026, 5).monat, "2026-05");
  assert.deepEqual(verteilen(100, [1, 1, 1]), [34, 33, 33]); assert.deepEqual(verteilen(-100, [1, 1, 1]).reduce((a, b) => a + b, 0), -100); assert.deepEqual(verteilen(5, [0, 0]), [0, 0]);
});
test("C4: schichtZaehler mit ungültigem Datum gibt den Null-Zähler statt einer Ausnahme", () => {
  const null0 = { gesamt: 0, nacht25: 0, nacht40: 0, sonntag: 0, feiertag125: 0, feiertag150: 0 };
  for (const d of ["abc", "", null, undefined, "2026-02-30", "1e308-01-01", "2026-13-01", 20261110]) assert.deepEqual(schichtZaehler(d, "08:00", "16:00"), null0, String(d));
  assert.equal(schichtZaehler("2026-11-10", "08:00", "16:00").gesamt, 8);
  assert.equal(zaehlerSumme([{ datum: "abc", von: "08:00", bis: "16:00" }, { datum: "2026-11-10", von: "08:00", bis: "16:00" }]).gesamt, 8);
  assert.equal(zaehlerSumme([null, undefined]).gesamt, 0);
});

// ───────────── C5 Mindestlohn 2025 ─────────────
test("C5: 2025 hat Mindestlohn und Minijob-Grenze mit Quelle; Tage davor rechnen nicht stillschweigend mit 2026", () => {
  assert.deepEqual([mindestlohnAm("2025-06-01").satz, mindestlohnAm("2025-06-01").minijob], [12.82, 556]);
  assert.equal(mindestlohnAm("2025-06-01").vorErstem, undefined);
  const r = regel("minijob_grenze", "2025-06-01"); assert.equal(r.wert, 556); assert.match(r.url, /^https:\/\/\S+$/); assert.match(r.quelle, /§ 8 Abs. 1a SGB IV/); assert.equal(r.abgerufen, "2026-11-13"); assert.equal(r.status, "beschlossen");
  assert.equal(Math.ceil(12.82 * 130 / 3), 556); // die Rechenregel aus dem Gesetz gibt dieselbe Zahl
  assert.equal(minijobGrenzeStunden("2025-06-01"), 43.36);
  assert.deepEqual([mindestlohnAm("2026-01-01").satz, mindestlohnAm("2026-12-31").minijob, mindestlohnAm("2027-01-01").satz], [13.9, 603, 14.6]);
  for (const d of ["2024-12-31", "2020-05-05", undefined, null, "kaputt"]) { const m = mindestlohnAm(d); assert.equal(m.vorErstem, true, String(d)); assert.notEqual(m.satz, 13.9); assert.equal(m.satz, 12.82); }
  assert.equal(naechsteErhoehung("2025-06-01").ab, "2026-01-01"); assert.equal(naechsteErhoehung("2024-06-01").ab, "2025-01-01");
});

// ───────────── Rundreise netto → brutto ─────────────
test("Rundreise: derselbe Netto-Wert wie angezeigt ändert den gespeicherten Brutto-Wert nicht", () => {
  for (const satz of [0.07, 0.19, 0.0797]) for (let c = 1; c <= 120000; c += 1) {
    const b = c / 100; const n = Z.umsatzAnzeigeWert(b, "netto", satz);
    assert.equal(Z.umsatzAusEingabe(n, "netto", satz, b), b, `brutto ${b} @ ${satz}`);
  }
  assert.equal(Z.umsatzAusEingabe(934.64, "netto", 0.07), 1000.06); // ohne gespeicherten Wert wie bisher (Beispiel: brutto 1.000,07 € zeigte netto 934,64 €, zurück kam 1.000,06 €)
  assert.equal(Z.umsatzAusEingabe(934.64, "netto", 0.07, 1000.07), 1000.07); // jetzt: unverändert
  assert.equal(Z.umsatzAusEingabe(100, "netto", 0.07, 1000.07), 107); // ein anderer Netto-Wert rechnet neu
  assert.equal(Z.umsatzAusEingabe(100, "netto", 0.07, null), 107); assert.equal(Z.umsatzAusEingabe(107.01, "brutto", 0.07, 5), 107.01);
  assert.equal(Z.umsatzAusEingabe(100.01, "netto", 0.07), 107.01);
});
