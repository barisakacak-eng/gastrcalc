// Zekis Kopf (24.10.2026): Lage → Satz → Bewegung. Reihenfolge, einmal je Tag, Platzhalter, Sprachen, Satzregeln.
import test from "node:test";
import assert from "node:assert/strict";
import { leererBetrieb } from "../js/store.js";
import { zekiMoment, ZEKI_PRUEFUNGEN } from "../js/zeki.js";
import { ZEKI_SAETZE, ZEKI_AUSLOESER, ZEKI_ARTEN, ZEKI_BEWEGUNGEN } from "../js/data/zeki_saetze.js";

const H = "2026-10-24";
const laden = () => { const b = leererBetrieb(); b.betrieb = { name: "Test", format: "imbiss" }; b.phase = "app"; return b; };

test("Satzliste hält Frankys Format und die Sprachregeln", () => {
  const verboten = /revolution|disrupt|marktführer|gobd|betriebsprüfungsfest|steuersicher|rechtssicher|gut gemacht|super|toll|sachbezug|vorsteuer|entnahme|rohgewinn/i;
  for (const a of ZEKI_AUSLOESER) assert.ok(ZEKI_SAETZE.some((x) => x.ausloeser === a), "Auslöser ohne Satz: " + a);
  for (const x of ZEKI_SAETZE) {
    assert.ok(ZEKI_AUSLOESER.includes(x.ausloeser) && ZEKI_ARTEN.includes(x.art) && ZEKI_BEWEGUNGEN.includes(x.bewegung), x.id);
    for (const sp of ["de", "tr", "en"]) {
      assert.ok(x[sp], `${x.id} ${sp} fehlt`);
      assert.ok(x[sp].split(/\s+/).length <= 12, `${x.id} ${sp}: ${x[sp].split(/\s+/).length} Wörter`);
      assert.ok(!verboten.test(x[sp]), `${x.id} ${sp}: verbotenes Wort`);
    }
  }
  assert.equal(new Set(ZEKI_SAETZE.map((x) => x.id)).size, ZEKI_SAETZE.length, "ids eindeutig");
});

test("leere Karte: Zeki bittet um die Karte und hebt die Hand", () => {
  const m = zekiMoment(laden(), { H });
  assert.equal(m.ausloeser, "karte_leer"); assert.ok(!/\{/.test(m.text));
});

test("Kühl-Abweichung schlägt alles andere und nennt die Stelle", () => {
  const s = laden();
  s.kuehlstellen = [{ id: "k1", name: "Saladette", art: "kuehl", min: 0, max: 7, reihe: 0, archiviert: false }];
  s.messungen = [{ id: "m1", stelle: "k1", datum: H, zeit: H + "T08:00:00.000Z", wert: 11, min: 0, max: 7, abweichung: true, massnahmen: ["tuer"], nachkontrolle: { faellig: H + "T10:00:00.000Z" } }];
  const m = zekiMoment(s, { H });
  assert.equal(m.ausloeser, "kuehl_abweichung"); assert.ok(ZEKI_SAETZE.some((x) => x.id === m.id && x.bewegung === m.bewegung)); assert.ok(!/\{/.test(m.text));
  const tr = zekiMoment(s, { H, sprache: "tr" }); assert.equal(tr.id, m.id); assert.notEqual(tr.text, m.text);
  const mitStelle = ZEKI_SAETZE.filter((x) => x.ausloeser === "kuehl_abweichung" && x.de.includes("{stelle}")); assert.ok(mitStelle.length >= 2, "Stelle wird genannt");
});

test("einmal je Tag: gesehene Lage wird übersprungen, die nächste kommt", () => {
  const s = laden(); s.gerichte = [{ id: "g1", name: "Dürüm", klasse: "haupt", preis: null, zutaten: [] }];
  const a = zekiMoment(s, { H }); assert.equal(a.ausloeser, "preis_fehlt");
  const b = zekiMoment(s, { H, gesehen: new Set(["preis_fehlt:" + H]) }); assert.notEqual(b?.ausloeser, "preis_fehlt");
  const c = zekiMoment(s, { H: "2026-10-25", gesehen: new Set(["preis_fehlt:" + H]) }); assert.equal(c.ausloeser, "preis_fehlt", "neuer Tag, neue Chance");
});

test("erster Müll zwinkert; Sicherung nur mit Altersangabe", () => {
  const s = laden(); s.gerichte = [{ id: "g1", name: "Döner", klasse: "haupt", preis: 7.5, zutaten: [] }];
  s.schwund = [{ id: "s1", datum: H, art: "rohware", ref: { typ: "frei", name: "Tomaten" }, menge: 1, einheit: "kg", wert: 2, erfasst: H + "T12:00:00.000Z" }];
  const m = zekiMoment(s, { H }); assert.equal(m.ausloeser, "erster_muell");
  assert.equal(ZEKI_PRUEFUNGEN.sicherung_alt(s, H, {}), null);
  assert.deepEqual(ZEKI_PRUEFUNGEN.sicherung_alt(s, H, { sicherungTage: 9 }), { tage: "9" });
});

test("fehlender Platzhalterwert: Satz fällt weg statt „{betrag}“ zu zeigen; kaputte Daten werfen nicht", () => {
  const s = laden(); s.gerichte = null; s.schwund = "x"; s.messungen = {};
  assert.doesNotThrow(() => zekiMoment(s, { H }));
  assert.equal(zekiMoment(null, { H }), null);
});

test("umsatz_fehlt hat ohne Betrag trotzdem einen Satz (Kassenzahl von gestern fehlt)", async () => {
  const { ZEKI_RAUS } = await import("../js/data/zeki_saetze.js");
  assert.ok(ZEKI_SAETZE.some((x) => x.ausloeser === "umsatz_fehlt" && !/\{/.test(x.de)));
  for (const id of Object.keys(ZEKI_RAUS)) assert.ok(!ZEKI_SAETZE.some((x) => x.id === id), "aussortiert: " + id);
});
