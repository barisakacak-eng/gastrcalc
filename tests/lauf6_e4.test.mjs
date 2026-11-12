// Lauf 6, Etappe 4: Zeit und Geld aus je einer Quelle – Tests zu den behobenen Fehlern (Teil A: Uhr, Schicht, Eingangsprüfung; Teil B: Geld).
// Läuft in TZ=UTC und TZ=Europe/Berlin mit demselben Ergebnis. Quelltext-Suchen stehen NICHT hier, sondern in quelltext_waechter.test.mjs.
import test, { mock } from "node:test"; import assert from "node:assert/strict";
globalThis.document ??= { documentElement: {} };
import { berlinZeitpunkt, isoTag } from "../js/zeit.js";
import { heute, heuteGeschaeft } from "../js/util.js";
import { leereWurzel } from "../js/store.js";
import { offenImBuero } from "../js/offen.js";
import { waageVorschlagGesehen } from "../js/stamm.js";
import { homeHinweisGesehen } from "../js/homebildschirm.js";
import { schichtStunden, schichtZaehler, eintragStunden } from "../js/schichten.js";
import { liquiditaet } from "../js/liquiditaet.js";
import { ruhetageSetzen, ruhetagUmschalten } from "../js/engine.js";
const { beispielLaden } = await import("../js/beispiel.js");

// ───── Teil A ─────
test("Waage-Hinweis: nach „gesehen“ kommt er am selben Ladentag nicht wieder – auch nicht zwischen 00:00 und 04:00 (Geschäftstag statt UTC-Datum)", (ctx) => {
  ctx.after(() => mock.timers.reset());
  for (const [tag, h, m] of [["2026-11-12", 0, 30], ["2026-11-12", 3, 30], ["2026-07-15", 0, 30], ["2026-07-15", 3, 30], ["2026-11-12", 19, 0]]) {
    const jetzt = berlinZeitpunkt(tag, h, m); mock.timers.enable({ apis: ["Date"], now: jetzt });
    const s = beispielLaden("2026-11-10"); const w = leereWurzel(); w.betriebe.push(s); w.aktiv = s.id;
    assert.ok(offenImBuero(s, w, { jetzt }).some((x) => x.id === "waage"), `${tag} ${h}:${m}: Hinweis steht zuerst da`);
    waageVorschlagGesehen(s, heuteGeschaeft()); // genau das tut die Oberfläche beim Tipp auf „Ansehen“
    assert.ok(!offenImBuero(s, w, { jetzt }).some((x) => x.id === "waage"), `${tag} ${h}:${m}: nach „gesehen“ nicht noch einmal`);
    const h2 = homeHinweisGesehen; const wz = {}; h2(wz); assert.equal(wz.homeHinweisGesehen, heuteGeschaeft(), "Home-Hinweis: Marke = Geschäftstag");
    mock.timers.reset();
  }
  // um 04:30 beginnt ein neuer Ladentag: der Hinweis darf wieder kommen
  const s = beispielLaden("2026-11-10"); const w = leereWurzel(); w.betriebe.push(s); w.aktiv = s.id;
  const spaet = berlinZeitpunkt("2026-11-12", 3, 30); mock.timers.enable({ apis: ["Date"], now: spaet }); waageVorschlagGesehen(s, heuteGeschaeft());
  assert.ok(offenImBuero(s, w, { jetzt: berlinZeitpunkt("2026-11-12", 4, 30) }).some((x) => x.id === "waage"));
});

test("Schicht über die Zeitumstellung: echte Dauer in Berlin (25.10.2026 = 9 h, 29.03.2026 = 7 h), sonst unverändert", () => {
  assert.equal(schichtStunden("22:00", "06:00", "2026-10-24"), 9); // Nacht zum 25.10.2026: 25-Stunden-Tag
  assert.equal(schichtStunden("22:00", "06:00", "2026-03-28"), 7); // Nacht zum 29.03.2026: 23-Stunden-Tag
  assert.equal(schichtStunden("22:00", "06:00", "2026-11-12"), 8); assert.equal(schichtStunden("22:00", "06:00"), 8, "ohne Datum Wanduhr wie bisher");
  assert.equal(schichtStunden("09:00", "17:30", "2026-10-25"), 8.5, "Schicht am Umstellungstag nach der Umstellung: normal");
  assert.equal(eintragStunden({ datum: "2026-10-24", von: "22:00", bis: "06:00" }), 9);
  const a = schichtZaehler("2026-10-24", "22:00", "06:00"); assert.equal(a.gesamt, 9); assert.equal(a.sonntag, 7, "Sonntag 0–6 Uhr: 7 echte Stunden"); assert.equal(a.nacht40, 5, "0–4 Uhr: 5 echte Stunden"); assert.equal(a.nacht25, 4);
  const b = schichtZaehler("2026-03-28", "22:00", "06:00"); assert.equal(b.gesamt, 7); assert.equal(b.sonntag, 5); assert.equal(b.nacht40, 3); assert.equal(b.nacht25, 4);
  const n = schichtZaehler("2026-11-11", "22:00", "06:00"); assert.deepEqual([n.gesamt, n.nacht25, n.nacht40, n.sonntag], [8, 4, 4, 0]);
});

test("Eingangsprüfung: Liquidität überspringt Posten ohne Zahl; Ruhetage nie alle sieben", () => {
  const ok = liquiditaet({ start: 1000, ab: "2026-11-12", posten: [{ betrag: -100, datum: "2026-11-13" }] });
  const mit = liquiditaet({ start: 1000, ab: "2026-11-12", posten: [{ betrag: -100, datum: "2026-11-13" }, { betrag: "abc", datum: "2026-11-14" }, { betrag: NaN, tagImMonat: 15 }, { betrag: undefined, wochentage: [1] }, null] });
  assert.equal(mit.uebersprungen, 4); assert.equal(ok.uebersprungen, 0);
  assert.deepEqual(mit.tage, ok.tage); assert.ok(Number.isFinite(mit.ende) && mit.ende === 900 && mit.tiefster.betrag === 900);
  const s = { kuehl: { takt: 1, ruhetage: [0], eingerichtet: true, seit: null } };
  assert.equal(ruhetageSetzen(s, [0, 1, 2, 3, 4, 5, 6], "2026-11-12"), null, "sieben Ruhetage werden abgelehnt"); assert.deepEqual(s.kuehl.ruhetage, [0]); assert.equal(s.kuehl.ruhetageVerlauf, undefined, "nichts gespeichert");
  assert.deepEqual(ruhetageSetzen(s, [0, 1, 2, 3, 4, 5], "2026-11-12"), [0, 1, 2, 3, 4, 5], "sechs sind erlaubt");
  assert.equal(ruhetagUmschalten(s, 6, "2026-11-12"), false);
});

test("Uhr 23:00 bis 04:30 Berliner Zeit: heute() und heuteGeschaeft() aus util.js wechseln um 00:00 / 04:00 – in jeder Rechner-Zeitzone gleich", (ctx) => {
  ctx.after(() => mock.timers.reset());
  mock.timers.enable({ apis: ["Date"], now: berlinZeitpunkt("2026-11-12", 23, 0) });
  const ist = [], soll = [];
  for (let min = 23 * 60; min <= 28 * 60 + 30; min += 30) { // 23:00 … 04:30 am Folgetag
    const folge = min >= 1440; const uhr = min % 1440; mock.timers.setTime(berlinZeitpunkt(folge ? "2026-11-13" : "2026-11-12", Math.floor(uhr / 60), uhr % 60).getTime());
    ist.push([heute(), heuteGeschaeft()]); soll.push([folge ? "2026-11-13" : "2026-11-12", folge && uhr >= 240 ? "2026-11-13" : "2026-11-12"]);
  }
  assert.deepEqual(ist, soll);
  // Sommerzeit und Umstellungsnacht
  for (const [tag, h, m, k, g] of [["2026-07-15", 0, 30, "2026-07-15", "2026-07-14"], ["2026-07-15", 3, 59, "2026-07-15", "2026-07-14"], ["2026-07-15", 4, 0, "2026-07-15", "2026-07-15"], ["2026-10-25", 3, 30, "2026-10-25", "2026-10-24"], ["2026-03-29", 3, 30, "2026-03-29", "2026-03-28"]]) {
    mock.timers.setTime(berlinZeitpunkt(tag, h, m).getTime()); assert.deepEqual([heute(), heuteGeschaeft()], [k, g], `${tag} ${h}:${m}`);
  }
  assert.equal(heute(new Date("2026-11-12T23:30:00+01:00")), "2026-11-12"); assert.equal(heute(new Date("2026-11-13T00:30:00+01:00")), "2026-11-13");
  assert.equal(isoTag(new Date("2026-11-12T23:30:00Z")), "2026-11-13", "23:30 UTC ist in Berlin schon der nächste Tag");
});
