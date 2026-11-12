// Zeit: Geschäftstag bis 4 Uhr, Zeitumstellung, Jahreswechsel, Schaltjahr. Aufruf mit TZ=UTC oder TZ=Europe/Berlin.
// Ortszeit wird mit new Date(J, M, T, h, m) gebaut (Wanduhr des Geräts) und mit UTC-Zeitpunkten (echte Instanten) verglichen.
import { heute, heuteGeschaeft, geschaeftstag } from "../js/util.js";
import * as E from "../js/engine.js";
import { zaehler, monatsGrenzen, tagGewicht } from "../js/zaehler.js";
const TZ = process.env.TZ || "(Systemstandard)"; let fehler = 0;
const ok = (name, ist, soll) => { const g = JSON.stringify(ist) === JSON.stringify(soll); if (!g) fehler++; console.log(`${g ? "ok  " : "FAIL"} ${name}: ${JSON.stringify(ist)}${g ? "" : "  erwartet " + JSON.stringify(soll)}`); };
console.log("TZ =", TZ, " Offset jetzt:", new Date().getTimezoneOffset());
const L = (j, m, t, h, mi) => new Date(j, m - 1, t, h, mi); // Wanduhr
// 1. Grenze 03:59 / 04:00 (Wanduhr)
ok("Geschäftstag 03:59 am 11.11.2026", heuteGeschaeft(L(2026, 11, 11, 3, 59)), "2026-11-10");
ok("Geschäftstag 04:00 am 11.11.2026", heuteGeschaeft(L(2026, 11, 11, 4, 0)), "2026-11-11");
ok("Geschäftstag 00:00 am 11.11.2026", heuteGeschaeft(L(2026, 11, 11, 0, 0)), "2026-11-10");
ok("Geschäftstag 23:59", heuteGeschaeft(L(2026, 11, 11, 23, 59)), "2026-11-11");
// 2. Monats-/Jahreswechsel/Schaltjahr
ok("Monatswechsel 01.12. 03:59", heuteGeschaeft(L(2026, 12, 1, 3, 59)), "2026-11-30");
ok("Silvester -> Neujahr 01.01.2027 03:59", heuteGeschaeft(L(2027, 1, 1, 3, 59)), "2026-12-31");
ok("Neujahr 01.01.2027 04:00", heuteGeschaeft(L(2027, 1, 1, 4, 0)), "2027-01-01");
ok("Schaltjahr 01.03.2028 03:59", heuteGeschaeft(L(2028, 3, 1, 3, 59)), "2028-02-29");
ok("Schaltjahr 29.02.2028 12:00", heuteGeschaeft(L(2028, 2, 29, 12, 0)), "2028-02-29");
ok("Kein Schalttag 01.03.2027 03:59", heuteGeschaeft(L(2027, 3, 1, 3, 59)), "2027-02-28");
ok("monatsGrenzen Feb 2028", [monatsGrenzen("2028-02-10").von, monatsGrenzen("2028-02-10").bis], ["2028-02-01", "2028-02-29"]);
ok("monatsGrenzen Feb 2027", monatsGrenzen("2027-02-10").bis, "2027-02-28");
ok("tagPlus über Schalttag", [E.tagPlus("2028-02-28", 1), E.tagPlus("2028-02-28", 2), E.tagPlus("2027-12-31", 1)], ["2028-02-29", "2028-03-01", "2028-01-01"]);
// 3. Zeitumstellung: echte Instanten (UTC) -> erwarteter Geschäftstag NUR bei Zeitzone Europe/Berlin sinnvoll
if (TZ === "Europe/Berlin") {
  for (const [tag, zeiten] of [["2026-03-29", [["2026-03-29T00:30:00Z", "2026-03-28"], ["2026-03-29T01:59:00Z", "2026-03-28"], ["2026-03-29T02:01:00Z", "2026-03-29"]]],
    ["2026-10-25", [["2026-10-24T23:30:00Z", "2026-10-24"], ["2026-10-25T01:30:00Z", "2026-10-24"], ["2026-10-25T02:59:00Z", "2026-10-24"], ["2026-10-25T03:00:00Z", "2026-10-25"]]],
    ["2027-03-28", [["2027-03-28T00:30:00Z", "2027-03-27"], ["2027-03-28T01:59:00Z", "2027-03-27"], ["2027-03-28T02:00:00Z", "2027-03-28"]]]])
    for (const [iso, soll] of zeiten) ok(`Umstellung ${tag}: echter Zeitpunkt ${iso}`, heuteGeschaeft(new Date(iso)), soll);
}
// 4. Tage rechnen über die Umstellung: tagPlus/wochentag/heute() dürfen keinen Tag überspringen oder doppeln
{ let d = "2026-03-20", n = 0, doppelt = 0, luecke = 0; const seen = new Set(); while (d < "2026-04-05") { if (seen.has(d)) doppelt++; seen.add(d); const nx = E.tagPlus(d, 1); const diff = Math.round((Date.parse(nx + "T12:00:00Z") - Date.parse(d + "T12:00:00Z")) / 864e5); if (diff !== 1) luecke++; d = nx; n++; } ok("tagPlus 20.03.-05.04.2026 (Umstellung 29.03.): Tage, Lücken, Doppelte", [n, luecke, doppelt], [16, 0, 0]); }
{ let luecke = 0; for (const start of ["2026-10-20", "2027-03-22", "2028-03-20", "2028-10-25"]) { let d = start; for (let i = 0; i < 20; i++) { const nx = E.tagPlus(d, 1); if (Math.round((Date.parse(nx + "T12:00:00Z") - Date.parse(d + "T12:00:00Z")) / 864e5) !== 1) luecke++; d = nx; } } ok("tagPlus um 4 weitere Umstellungsfenster", luecke, 0); }
// 5. Funktionen mit festem "jetzt" (Date überschreiben): Zeiträume, Nacherfasst-Marke, Tagesabschluss
const RealDate = Date; let JETZT = null;
class FakeDate extends RealDate { constructor(...a) { if (a.length === 0 && JETZT !== null) super(JETZT); else super(...a); } static now() { return JETZT !== null ? JETZT : RealDate.now(); } }
globalThis.Date = FakeDate;
const jetzt = (j, m, t, h, mi) => { JETZT = new RealDate(j, m - 1, t, h, mi).getTime(); };
jetzt(2026, 11, 1, 3, 30);   ok("zeitraumTage(7) um 03:30 am 01.11.2026", E.zeitraumTage(7), { von: "2026-10-25", bis: "2026-10-31" });
ok("monatsZeitraum um 03:30 am 01.11.2026 (gehört noch zum Oktober)", E.monatsZeitraum(), { von: "2026-10-01", bis: "2026-10-31" });
jetzt(2026, 11, 1, 4, 0);    ok("monatsZeitraum um 04:00 am 01.11.2026", E.monatsZeitraum(), { von: "2026-11-01", bis: "2026-11-01" });
jetzt(2027, 1, 1, 3, 59);    ok("zeitraumTage(1) 01.01.2027 03:59", E.zeitraumTage(1), { von: "2026-12-31", bis: "2026-12-31" });
jetzt(2028, 3, 1, 2, 0);     ok("zeitraumTage(3) 01.03.2028 02:00 über Schalttag", E.zeitraumTage(3), { von: "2028-02-27", bis: "2028-02-29" });
jetzt(2026, 10, 26, 3, 59);  ok("zeitraumTage(3) 26.10.2026 03:59 (Tag nach Umstellung)", E.zeitraumTage(3), { von: "2026-10-23", bis: "2026-10-25" });
jetzt(2026, 3, 30, 3, 59);   ok("zeitraumTage(3) 30.03.2026 03:59 (Tag nach Umstellung)", E.zeitraumTage(3), { von: "2026-03-27", bis: "2026-03-29" });
{ const s = { tagesnotizen: [], team: {}, betrieb: {}, kosten: [], verkauf: {} };
  jetzt(2026, 11, 11, 2, 30); const e = E.tagesnotizLoeschen({ tagesnotizen: [{ id: "a", datum: "2026-11-10", umsatz: 500, erfasst: "2026-11-10T20:00:00Z", storniert: false, geraet: null }] }, "2026-11-10", null);
  ok("Eintrag um 02:30 für den Geschäftstag 10.11. gilt NICHT als nacherfasst", e?.nacherfasst, false); }
// 6. UTC-Datum statt Ortsdatum (Befunde aus der Quelle): app.js:732, app.js:1234, homebildschirm.js:19
jetzt(2026, 7, 15, 0, 30);
ok("new Date().toISOString().slice(0,10) um 00:30 Ortszeit am 15.07.2026 (Muster app.js:732/1234, homebildschirm.js:19)", new Date().toISOString().slice(0, 10), heute());
jetzt(2026, 11, 15, 0, 30);
ok("dasselbe Muster im Winter 00:30 am 15.11.2026", new Date().toISOString().slice(0, 10), heute());
jetzt(2026, 11, 15, 12, 0);
// 7. zaehler(default datum) um 01:30 in der Nacht auf den 1. -> Vormonat
{ const s = { betrieb: { tageProWoche: 6, monate: 12 }, team: { personen: 1, lohnkosten: 1000 }, kosten: [{ id: "m", posten: "miete", kategorie: "miete", betrag: 600, status: "bekannt", periode: "monat", basis: "netto", satz: 19 }], tagesnotizen: [{ id: "u", datum: "2026-10-31", umsatz: 800, erfasst: "2026-10-31T20:00:00Z", storniert: false }], verkauf: { zielgewinn: 10 }, gerichte: [], artikel: [], lieferungen: [], schwund: [], abschluesse: [] };
  jetzt(2026, 11, 1, 1, 30); const z = zaehler(s); ok("zaehler() ohne Datum um 01:30 am 01.11.: Datum und Monat", [z.datum, z.monat.monat], ["2026-10-31", 10]); }
globalThis.Date = RealDate;
console.log(fehler ? `GESAMT ${TZ}: ${fehler} FAIL` : `GESAMT ${TZ}: alles ok`);
