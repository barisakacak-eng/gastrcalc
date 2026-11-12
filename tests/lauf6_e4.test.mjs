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

// ───── Teil B ─────
import { leererBetrieb } from "../js/store.js";
import { steuerTopf } from "../js/steuertopf.js";
import * as Geld from "../js/geld.js";
import * as Engine from "../js/engine.js";
import { teamStundenlohnSetzen } from "../js/stamm.js";
import { satzStandard } from "../js/data/kosten.js";
import { STEUER_JE_GRUPPE } from "../js/data/katalog.js";

function zufall(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

test("Steuer-Topf: ust7 + ust19 ergeben genau ust (1.000 Fälle mit festem Zufall)", () => {
  const r = zufall(20261113); let ungleichVorher = 0;
  for (let i = 0; i < 1000; i++) {
    const s = leererBetrieb(); s.phase = "app";
    s.betrieb.steuerSatz = 0.07 + Math.floor(r() * 13) / 100; // 7 … 19 %
    const tage = 1 + Math.floor(r() * 28);
    for (let d = 1; d <= tage; d++) s.tagesnotizen.push({ id: "n" + d, datum: `2026-10-${String(d).padStart(2, "0")}`, umsatz: Math.floor(r() * 300000) / 100, storniert: false, erfasst: "2026-10-31T10:00:00+01:00" });
    const t = steuerTopf(s, "2026-10"); assert.ok(t, "Topf vorhanden");
    const c = (x) => Math.round(x * 100);
    assert.equal(c(t.ust7) + c(t.ust19), c(t.ust), `Fall ${i}: ${t.ust7} + ${t.ust19} ≠ ${t.ust}`);
    assert.equal(c(t.zahllast), c(t.ust) - c(t.vorsteuer) , "Zahllast bleibt ust − Vorsteuer"); // Vorsteuer 0 in diesem Aufbau
    assert.equal(t.tage.reduce((x, z) => x + c(z.ust), 0), c(t.ust), "Summe der Tageszeilen = ust (wie bisher)");
  }
});

test("Geld aus einer Quelle: eine Rundung, ein nettoVonBrutto, Sätze aus dem Regelwerk – Speicherformat unverändert", () => {
  const s = { team: {} }; teamStundenlohnSetzen(s, 1.005); assert.equal(s.team.stundenlohn, 1.01, "kaufmännisch: 1,005 → 1,01 (Math.round(x * 100) / 100 gab 1)");
  assert.equal(Engine.nettoVonBrutto, Geld.nettoVonBrutto, "die Engine reicht dieselbe Funktion weiter");
  assert.equal(Engine.nettoVonBrutto(107, 0.07), Geld.nettoVonBrutto(107, 0.07));
  assert.equal(Engine.VORSTEUER, 0.19); assert.deepEqual(Engine.VORSTEUER_SAETZE, [19, 7, 0], "Posten speichern Prozent als Zahl wie bisher");
  assert.equal(satzStandard("miete"), 19); assert.equal(satzStandard("wasser"), 7);
  assert.deepEqual(STEUER_JE_GRUPPE, { getraenk: "voll", spirituose: "voll" });
  assert.equal(Engine.steuersatzGericht({ klasse: "getraenk" }), 0.19); assert.equal(Engine.steuersatzGericht({ klasse: "haupt" }), 0.07);
  assert.equal(Engine.steuersatzArtikel({ gruppe: "getraenk" }), 0.19); assert.equal(Engine.steuersatzArtikel({ gruppe: "verpackung" }), 0.19); assert.equal(Engine.steuersatzArtikel({ gruppe: "fleisch" }), 0.07);
  const b = beispielLaden("2026-11-10"); assert.ok(b.gerichte.every((g) => g.steuer === 0.07 || g.steuer === 0.19), "Beispiel-Laden speichert Sätze als Zahl");
  assert.ok(b.kosten.every((k) => [19, 7, 0].includes(k.satz) || k.satz === undefined), "Kostensätze als Prozent-Zahl");
});
