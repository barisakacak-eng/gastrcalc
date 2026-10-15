// Welle 2, Entwickler H (15.10.2026): Amt-Ordner ehrlich – Nachträge, Rücknahmen, Gültig-ab, Nachkontrolle mit Zeitfenster,
// Lücken „teilweise“/„aus“, Kühlalarm im offenen Rundgang, Ausgeschiedene, Müll, Seitenzahlen, keine erfundenen Grenzen.
import test from "node:test";
import assert from "node:assert/strict";
import { leererBetrieb, migrierenBetrieb } from "../js/store.js";
import * as E from "../js/engine.js";
import * as A from "../js/export_amt.js";
import * as P from "../js/putzplan.js";

function laden({ takt = 1 } = {}) {
  const s = leererBetrieb(); s.phase = "app"; s.betrieb.name = "Test";
  s.kuehl = { takt, ruhetage: [], eingerichtet: true, seit: "2026-09-01" };
  s.kuehlstellen = [{ id: "k", name: "Theke", art: "kuehl", min: null, max: null, reihe: 0, archiviert: false }];
  s.personen = [{ id: "a", kuerzel: "AK", aktiv: true, entfernt: false }, { id: "b", kuerzel: "MZ", aktiv: true, entfernt: false }];
  const m = (datum, uhr, wert, extra = {}) => { const x = { id: `m${datum}${uhr}${wert}`, stelle: "k", datum, zeit: uhr ? `${datum}T${uhr}:00` : null, wert, min: null, max: 7, abweichung: typeof wert === "number" && wert > 7,
    massnahmen: [], nachkontrolle: null, von: "a", nacherfasst: false, storniert: false, grund: null, ...extra }; s.messungen.push(x); return x; };
  return { s, m };
}
const Z = { art: "frei", von: "2026-09-28", bis: "2026-10-04" };

test("Nachtrag: keine ausgedachte Uhrzeit, echter Erfassungszeitpunkt, Kennzeichen im Protokoll", () => {
  const { s } = laden();
  const r = E.rundgangStarten(s, { von: "a", datum: "2026-09-30", nacherfasst: true, quelle: "zettel" });
  E.stationEintragen(r, s.kuehlstellen[0], { wert: 4.5 });
  E.rundgangAbschliessen(s, r, () => 7, "g1");
  const m = s.messungen[0];
  assert.equal(m.zeit, null); assert.equal(m.nacherfasst, true); assert.ok(m.erfasst); assert.equal(m.lfd, 7);
  const k = A.kuehlprotokoll(s, Z, { datum: "2026-10-05" });
  assert.equal(k.zeilen[0].zeit, ""); assert.equal(k.zeilen[0].erfasst, m.erfasst); assert.equal(k.nachgetragen, 1);
  // die Speicher-Migration erfindet keine Uhrzeit nachträglich
  const neu = migrierenBetrieb(structuredClone(s)); assert.equal(neu.messungen[0].zeit, null);
  const csv = A.amtCsv(A.ordnerAmt(s, Z, { datum: "2026-10-05" }), "kuehl", Array(14).fill("x"), { ja: () => "ja" });
  assert.match(csv, /30\.09\.2026;;Theke;4,5;.*;ja;\d\d\.\d\d\.\d{4} \d\d:\d\d;7;/, csv);
});

test("Ruhetage mit Gültig-ab: neuer Ruhetag löscht keine alten Lücken", () => {
  const { s, m } = laden();
  for (const d of ["2026-09-28", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]) m(d, "09:00", 4); // Di 29.09. fehlt
  assert.deepEqual(A.kuehlprotokoll(s, Z, { datum: "2026-10-05" }).luecken, ["2026-09-29"]);
  assert.equal(E.ruhetagUmschalten(s, 2, "2026-10-05"), true); // Dienstag ab 05.10.
  assert.deepEqual(s.kuehl.ruhetage, [2]);
  assert.deepEqual(A.kuehlprotokoll(s, Z, { datum: "2026-10-05" }).luecken, ["2026-09-29"]); // bleibt Lücke
  assert.deepEqual(E.ruhetageAm(s, "2026-09-29"), []); assert.deepEqual(E.ruhetageAm(s, "2026-10-06"), [2]);
  assert.equal(E.monatsblatt(s, "k", { von: "2026-10-06", bis: "2026-10-06" }).tage[0].status, "ruhetag");
  E.ruhetagUmschalten(s, 2, "2026-10-05"); // am selben Tag zurück: kein Verlaufseintrag übrig
  assert.equal(s.kuehl.ruhetageVerlauf.length, 1);
  // Änderung erscheint im Abschnitt „Zurückgenommen / geändert“
  E.ruhetagUmschalten(s, 0, "2026-10-02");
  assert.ok(A.ruecknahmen(s, Z).zeilen.some((x) => x.bereich === "ruhetage" && x.datum === "2026-10-02"));
  // ohne Verlauf (alte Daten): wie bisher die heutigen Ruhetage
  const { s: alt } = laden(); alt.kuehl.ruhetage = [2]; assert.deepEqual(E.ruhetageAm(alt, "2020-01-01"), [2]);
});

test("Putzplan mit Gültig-ab: alte Tage nach altem Plan, Rücknahme mit Person", () => {
  const { s } = laden();
  s.putzplan = { aktiv: true, geraete: ["kuehlschrank"], aus: [], seit: "2026-09-28" };
  const altTag = P.aufgabenFuer(s.putzplan).filter((a) => a.takt === "tag").map((a) => a.id);
  for (const d of ["2026-09-28", "2026-09-29"]) for (const id of altTag) P.abhaken(s, id, { datum: d });
  P.planUebernehmen(s, { ...s.putzplan, geraete: ["kuehlschrank", "fritteuse"] }, "2026-09-30");
  assert.equal(s.putzplan.verlauf.length, 2);
  const neuTag = P.aufgabenFuer(s.putzplan).filter((a) => a.takt === "tag").map((a) => a.id);
  assert.ok(neuTag.length > altTag.length);
  const p = A.putznachweis(s, { art: "frei", von: "2026-09-28", bis: "2026-09-29" }, { datum: "2026-10-05" });
  assert.deepEqual([p.tage, p.tageGesamt, p.luecken], [2, 2, []]); // 28./29. nach altem Plan voll
  assert.equal(P.planAm(s, "2026-09-29").geraete.length, 1); assert.equal(P.planAm(s, "2026-10-01").geraete.length, 2);
  P.abhaken(s, altTag[0], { datum: "2026-10-01", von: "b" });
  assert.equal(P.zuruecknehmen(s, altTag[0], "2026-10-01", { von: "b" }), true);
  const r = A.ruecknahmen(s, Z).zeilen.find((x) => x.bereich === "putz");
  assert.equal(r.von, "MZ"); assert.ok(r.wann);
  assert.ok(A.ruecknahmen(s, Z).zeilen.some((x) => x.bereich === "putzplan" && x.datum === "2026-09-30"));
});

test("Nachkontrolle mit Zeitfenster, „Chef angerufen“ allein = Maßnahme offen, Ware-Entscheidung schließt", () => {
  const { s, m } = laden();
  const a = m("2026-10-02", "09:05", 11, { massnahmen: ["tuer"], nachkontrolle: { art: "h2", faellig: "2026-10-02T11:05:00" } });
  m("2026-10-03", "09:05", 4);
  assert.equal(E.nachkontrolleStand(s, a).status, "verspaetet"); assert.equal(E.nachkontrolleStand(s, a).stunden, 24);
  assert.equal(E.abweichungStand(s, a), "verspaetet");
  m("2026-10-02", "12:00", 5); // innerhalb Fälligkeit + 1 h
  assert.equal(E.nachkontrolleStand(s, a).status, "erledigt"); assert.equal(E.abweichungStand(s, a), "behoben");
  const b = m("2026-10-04", "09:00", 9.5, { massnahmen: ["chef"] }); // ohne spätere Messung
  assert.equal(E.abweichungStand(s, b), "massnahmeOffen");
  const k = A.kuehlprotokoll(s, Z, { datum: "2026-10-05" });
  assert.equal(k.zeilen.find((x) => x.wert === 9.5).behoben, false); assert.equal(k.offen, 1);
  assert.equal(E.wareEntscheiden(s, b.id, "erfunden"), null);
  const neu = E.wareEntscheiden(s, b.id, "umgelagert", { von: "a", jetzt: "2026-10-05T10:00:00Z" });
  assert.notEqual(neu, b); assert.equal(neu.ware.art, "umgelagert"); // neues Objekt → Speicherung sieht es sofort
  assert.equal(E.wareEntscheiden(s, b.id, "weggeworfen"), null); // nur einmal
  assert.equal(E.abweichungStand(s, neu), "behoben");
  assert.equal(E.abweichungStand(s, m("2026-10-01", "09:00", 9, { massnahmen: ["weggeworfen"] })), "behoben");
});

test("Lücken: teilweise (1 von 2) und Gerät aus zählen und erscheinen", () => {
  const { s, m } = laden({ takt: 2 });
  for (const d of ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]) { m(d, "09:00", 4); if (d !== "2026-09-30" && d !== "2026-10-02") m(d, "18:00", 4); }
  s.messungen = s.messungen.filter((x) => x.datum !== "2026-10-02"); m("2026-10-02", "09:00", null, { grund: "geraetAus" });
  const k = A.kuehlprotokoll(s, Z, { datum: "2026-10-05" });
  assert.deepEqual(k.teilweise, ["2026-09-30"]); assert.deepEqual(k.aus, ["2026-10-02"]); assert.deepEqual(k.luecken, []);
  assert.equal(k.vollstaendig, false); assert.equal(k.lueckenAlle.length, 2);
  assert.equal(E.monatsblatt(s, "k", { von: "2026-10-02", bis: "2026-10-02" }).tage[0].status, "aus");
  // heute zählt eine einzelne Messung noch nicht als „teilweise“
  const h = E.tagPlus(E.monatsblatt(s, "k", { von: "2026-10-01", bis: "2026-10-01" }).tage[0].datum, 0);
  assert.equal(h, "2026-10-01");
});

test("Kühlalarm sofort im offenen Rundgang; Rundgang schließt nach der letzten Stelle", async () => {
  const { s } = laden();
  s.kuehlstellen.push({ id: "t", name: "TK", art: "tk", min: null, max: null, reihe: 1, archiviert: false });
  const r = E.rundgangStarten(s, { von: "a" });
  E.stationEintragen(r, s.kuehlstellen[0], { wert: 9, massnahmen: ["chef"] });
  assert.equal(E.rundgangAbweichungen(s).length, 1);
  const ks = E.kuehlStatus(s); assert.equal(ks.letzteAbweichung, 1); assert.equal(ks.abweichungImRundgang, 1);
  const { ladenPunkt } = await import("../js/screens/nav.js"); assert.equal(ladenPunkt(s), "kuehl");
  const { jetztDran } = await import("../js/offen.js"); assert.equal(jetztDran(s, null)?.ton, "rot");
  const { heuteKachelWerte } = await import("../js/screens/home.js"); assert.equal(heuteKachelWerte(s, ks, E.heute ? E.heute() : new Date().toISOString().slice(0, 10)).kuehl.alarm, true);
  assert.equal(E.rundgangVollstaendig(s, r), false);
  E.stationEintragen(r, s.kuehlstellen[1], { wert: -20 });
  assert.equal(E.rundgangVollstaendig(s, r), true);
});

test("Ausgeschiedene: Kürzel bleibt, Belehrung bleibt im Ordner, Migration behält das Datum", () => {
  const { s, m } = laden();
  m("2026-10-01", "09:00", 4, { von: "b" });
  s.belehrungen = [{ id: "x", person: "b", datum: "2025-01-10", art: "erst", storniert: false }];
  Object.assign(s.personen[1], { entfernt: true, aktiv: false, ausgeschieden: "2026-10-03" });
  const o = A.ordnerAmt(s, Z, { datum: "2026-10-05" });
  const z = o.teile.kuehl.zeilen[0]; assert.equal(z.von, "MZ"); assert.equal(z.vonAus, true);
  assert.equal(o.teile.belehrung.zeilen.length, 1); // aktiv nur AK
  assert.equal(o.teile.belehrung.ausgeschieden[0].name, "MZ"); assert.equal(o.teile.belehrung.ausgeschieden[0].status, "ausgeschieden");
  assert.ok(o.teile.rueck.zeilen.some((x) => x.bereich === "person" && x.person === "MZ"));
  assert.equal(migrierenBetrieb(structuredClone(s)).personen[1].ausgeschieden, "2026-10-03");
});

test("Müll im Amt-Ordner ohne Euro; Geräteübersicht ohne Haken; Grenze je Ware nur vorbereitet; Seitenzahlen", () => {
  const { s } = laden();
  s.schwund.push({ id: "w", datum: "2026-10-01", art: "verderb", vorgang: 1, ref: { typ: "frei", name: "Hack" }, menge: 2, einheit: "kg", grund: "Theke", wert: 12, quelle: "kuehl", storniert: false });
  const o = A.ordnerAmt(s, Z, { datum: "2026-10-05" });
  assert.equal(o.teile.muell.zeilen.length, 1); assert.equal(o.teile.muell.zeilen[0].wert, undefined); assert.equal(o.teile.muell.zeilen[0].ausKuehlung, true);
  assert.equal(o.teile.konzept.vollstaendig, null); assert.equal(o.gesamt, 3);
  assert.deepEqual(E.GRENZEN_WARE, {}); // keine Werte ohne Fundstelle
  const g = E.grenzenVon({ art: "kuehl", ware: "hack", min: null, max: null }); assert.equal(g.max, 7); assert.equal(g.wareOhneGrenze, true);
  assert.equal(migrierenBetrieb(structuredClone({ ...s, kuehlstellen: [{ ...s.kuehlstellen[0], ware: "hack" }] })).kuehlstellen[0].ware, "hack");
  const html = A.druckHtml({ titel: "T", laden: 'L"<x>', zeitraum: "Z", seite: ["Seite", "von"], abschnitte: [{ titel: "A", kopf: ["a"], zeilen: [{ zellen: ["1"], klasse: "nach" }] }] });
  assert.match(html, /@bottom-right \{ content: "Seite " counter\(page\) " von " counter\(pages\)/);
  assert.match(html, /<tr class="nach">/); assert.ok(!html.includes('L"<x>'));
});
