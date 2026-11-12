// Hinweis-Motor (Lauf 3, Phase 5, 09.11.2026): je Hinweis Auslöser an/aus, Text, Quelle; Gesamtprüfung; Takt; Laden-Zeile; Migration + Rundreise.
import test from "node:test";
import assert from "node:assert/strict";
import { leererBetrieb, migrierenBetrieb } from "../js/store.js";
import { HM_HINWEISE, HM_WEGGELASSEN, HM_PFLICHT, hmAusgeloest, hmFuerBuero, hmPruefen, hmStatusSetzen, hmFrageSetzen, hmGezeigtMerken,
  hmLadenZeile, hmLadenGezeigt, hmOffeneFragen, hmAngaben, hmAngabenSauber, monatsLohn, hmErledigtZahl, hmMitId, hmFeld } from "../js/hinweis_motor.js";

const TAG = "2027-01-01";
function laden() {
  const b = leererBetrieb(); b.betrieb = { name: "Test", format: "imbiss" };
  b.kanaele = { vorOrt: true, abholung: false, eigeneLieferung: false, portale: [] }; // ohne Außer-Haus, sonst greift LUCID immer
  return b;
}
const person = (id, extra = {}) => ({ id, kuerzel: id.toUpperCase(), aktiv: true, entfernt: false, ...extra });
const an = (s, id, datum = TAG) => hmAusgeloest(s, { datum }).some((h) => h.id === id);

test("Gesamt: jeder Hinweis hat Quelle mit https-Adresse und Abrufdatum, Satz ≤ 25 Wörter, Pflichtsatz, keine verbotenen Wörter", () => {
  assert.equal(HM_HINWEISE.length, 13, "Top 15 minus 2 ohne belegte Quelle");
  assert.equal(new Set(HM_HINWEISE.map((h) => h.id)).size, HM_HINWEISE.length);
  for (const h of HM_HINWEISE) {
    assert.deepEqual(hmPruefen(h), [], h.id);
    assert.ok(h.satz.endsWith(HM_PFLICHT), h.id);
    assert.doesNotMatch(JSON.stringify({ t: h.titel, s: h.satz, g: h.genau, e: h.euro }), /revolutionär|disruptiv|marktführer|gobd-konform|betriebsprüfungsfest|steuersicher|rechtssicher|absetzen|sparst/i, h.id);
  }
  assert.deepEqual(HM_WEGGELASSEN.map((x) => x.katalog).sort(), ["B_indexmiete", "B_mehrweg"]);
});

test("Prüfer erkennt Verstöße (fehlende Quelle, zu lang, verbotenes Wort, fehlender Pflichtsatz)", () => {
  const h = { ...HM_HINWEISE[0] };
  assert.ok(hmPruefen({ ...h, url: "" }).includes("quelle"));
  assert.ok(hmPruefen({ ...h, satz: "Du darfst das absetzen. " + HM_PFLICHT }).includes("verboten:satz"));
  assert.ok(hmPruefen({ ...h, satz: "wort ".repeat(30) + HM_PFLICHT }).includes("satz>25"));
  assert.ok(hmPruefen({ ...h, satz: "Kurz." }).includes("pflichtsatz"));
  assert.ok(hmPruefen({ ...h, abruf: "gestern" }).includes("abruf"));
});

test("leerer Laden: kein Hinweis", () => { assert.deepEqual(hmAusgeloest(laden(), { datum: TAG }), []); });

test("hm_u2 Mutterschutz: an nur mit Angabe „schwanger: ja“ und Personal", () => {
  const s = laden(); s.personen = [person("p1")];
  assert.equal(an(s, "hm_u2"), false);
  assert.equal(hmFrageSetzen(s, "schwanger", true), true); assert.equal(an(s, "hm_u2"), true);
  hmFrageSetzen(s, "schwanger", false); assert.equal(an(s, "hm_u2"), false);
  assert.match(hmMitId("hm_u2").satz, /100 %/); assert.match(hmMitId("hm_u2").quelle, /Haufe/);
});

test("hm_u1 Krankheit: an mit Abwesenheit in den letzten 3 Monaten, aus bei älterer oder ab 31 Personen", () => {
  const s = laden(); s.personen = [person("p1")];
  assert.equal(an(s, "hm_u1"), false);
  s.abwesend = [{ monat: "2026-12", datum: "2026-12-28", eintraege: [{ person: "p1", tage: 3, stundenTag: 8, satz: 14, art: "angestellt" }] }];
  assert.equal(an(s, "hm_u1"), true);
  assert.equal(an(s, "hm_u1", "2027-04-01"), false, "Dezember ist im April älter als 3 Monate");
  s.personen = Array.from({ length: 31 }, (_, i) => person("p" + i)); assert.equal(an(s, "hm_u1"), false, "U1 nur bis 30 Beschäftigte");
  assert.match(hmMitId("hm_u1").satz, /80 %/); assert.match(hmMitId("hm_u1").genau, /42 Tage/); assert.match(hmMitId("hm_u1").genau, /28 Tagen/);
});

test("hm_vz Vorauszahlung: an bei zwei Minus-Monaten und Einzelunternehmen, aus bei GmbH oder einem Monat", () => {
  const s = laden(); s.betrieb.rechtsform = "einzel";
  s.monatsabschluesse = [{ monat: "2026-11", umsatzBrutto: 10000, ergebnis: -500, eingefroren: "x" }, { monat: "2026-12", umsatzBrutto: 9000, ergebnis: -200, eingefroren: "x" }];
  assert.equal(an(s, "hm_vz"), true);
  s.betrieb.rechtsform = "gmbh"; assert.equal(an(s, "hm_vz"), false, "nur Personen-Rechtsformen");
  s.betrieb.rechtsform = "einzel"; s.monatsabschluesse[0].ergebnis = 100; assert.equal(an(s, "hm_vz"), false);
  assert.match(hmMitId("hm_vz").quelle, /§ 37 Abs\. 3 EStG/);
});

test("hm_arbeitszeit: an bei Eintrag ohne Beginn/Ende, aus wenn alle Zeiten stehen", () => {
  const s = laden(); s.personen = [person("p1")];
  s.teamTage = [{ datum: "2026-12-30", eintraege: [{ person: "p1", stunden: 6, satz: 14 }], erfasst: "2026-12-30T20:00:00.000Z" }];
  assert.equal(an(s, "hm_arbeitszeit"), true);
  s.teamTage[0].eintraege[0].von = "10:00"; s.teamTage[0].eintraege[0].bis = "16:00"; assert.equal(an(s, "hm_arbeitszeit"), false);
  assert.equal(hmMitId("hm_arbeitszeit").euro, "Bußgeld bis {bussgeld_arbeitszeit} €", "Rohform mit Platzhalter");
  assert.equal(hmFeld(hmMitId("hm_arbeitszeit"), "euro", TAG), "Bußgeld bis 50.000 €"); assert.match(hmMitId("hm_arbeitszeit").quelle, /§ 17 Abs\. 1, § 21 Abs\. 1 Nr\. 8 und Abs\. 3 MiLoG/);
  assert.equal(hmMitId("hm_arbeitszeit").url, "https://www.gesetze-im-internet.de/milog/__21.html"); assert.equal(hmMitId("hm_arbeitszeit").abruf, "2026-11-12");
  assert.match(hmFeld(hmMitId("hm_arbeitszeit"), "satz", TAG), /spätestens am 7\. Tag/); assert.match(hmFeld(hmMitId("hm_arbeitszeit"), "genau", TAG), /2 Jahre aufheben/);
});

test("hm_sofortmeldung und hm_ausweis: je neue Person; „erledigt“ gilt für die heutigen Personen, eine neue löst neu aus", () => {
  for (const id of ["hm_sofortmeldung", "hm_ausweis"]) {
    const s = laden(); assert.equal(an(s, id), false);
    s.personen = [person("p1")]; assert.equal(an(s, id), true);
    hmStatusSetzen(s, id, "erledigt", { datum: TAG }); assert.equal(an(s, id), false, id + " quittiert");
    s.personen.push(person("p2")); const h = hmAusgeloest(s, { datum: TAG }).find((x) => x.id === id);
    assert.ok(h, id + " neue Person"); assert.equal(h.status, "offen");
  }
  assert.equal(hmFeld(hmMitId("hm_sofortmeldung"), "euro", TAG), "Bußgeld bis 25.000 €"); assert.equal(hmFeld(hmMitId("hm_ausweis"), "euro", TAG), "Bußgeld bis 5.000 €");
  assert.match(hmMitId("hm_ausweis").quelle, /§ 2a/);
});

test("hm_midijob: an ab 90 % der Minijob-Grenze des Datums (2027: 633 €), Satz nennt die Grenze", () => {
  const s = laden(); s.personen = [person("p1", { lohnArt: "minijob", stundenlohn: 14.6 })];
  const tage = (n) => Array.from({ length: n }, (_, i) => ({ datum: `2027-01-${String(i + 1).padStart(2, "0")}`, person: "p1", von: "10:00", bis: "14:00", erfasst: "2027-01-01T20:00:00.000Z" }));
  s.schichten = tage(9); // 36 h × 14,60 = 525,60 € < 569,70 €
  assert.equal(monatsLohn(s, s.personen[0], "2027-01"), 525.6);
  assert.equal(an(s, "hm_midijob"), false);
  s.schichten = tage(10); // 40 h × 14,60 = 584 € ≥ 569,70 €
  assert.equal(an(s, "hm_midijob"), true);
  assert.match(hmAusgeloest(s, { datum: TAG }).find((h) => h.id === "hm_midijob").satz, /633 €/);
  assert.match(hmFeld(hmMitId("hm_midijob"), "genau", TAG, s), /bis 2\.000 € im Monat\. Grenze heute: 633 €\.$/, "ab 2027: keine spätere Grenze");
  assert.match(hmFeld(hmMitId("hm_midijob"), "genau", "2026-11-12", s), /Grenze heute: 603 €, ab 01\.01\.2027: 633 €\.$/, "2026: die nächste mit Datum");
  s.personen[0].lohnArt = "angestellt"; assert.equal(an(s, "hm_midijob"), false, "nur Minijobber");
});

test("hm_gema: an nur mit Angabe „Musik: ja“; Tarif aus der Quelle", () => {
  const s = laden(); assert.equal(an(s, "hm_gema"), false);
  hmFrageSetzen(s, "musik", true); assert.equal(an(s, "hm_gema"), true);
  hmFrageSetzen(s, "musik", false); assert.equal(an(s, "hm_gema"), false);
  assert.match(hmFeld(hmMitId("hm_gema"), "euro", TAG), /395,90 € netto/); assert.match(hmMitId("hm_gema").quelle, /GEMA Tarifübersicht Gaststätten 2026/);
});

test("hm_rundfunk: an ab 9 Personen ohne Minijob, Minijobber zählen nicht", () => {
  const s = laden(); s.personen = Array.from({ length: 8 }, (_, i) => person("a" + i));
  assert.equal(an(s, "hm_rundfunk"), false);
  s.personen.push(person("m1", { lohnArt: "minijob" })); assert.equal(an(s, "hm_rundfunk"), false, "Minijobber zählt nicht");
  s.personen.push(person("a9")); assert.equal(an(s, "hm_rundfunk"), true);
  assert.match(hmFeld(hmMitId("hm_rundfunk"), "euro", TAG), /18,36 € statt 6,12 €/); assert.match(hmFeld(hmMitId("hm_rundfunk"), "genau", TAG), /Stufe 0 bis 8 Beschäftigte: 6,12 € im Monat, 9 bis 19: 18,36 €/);
});

test("hm_lucid: an bei Abholung, Lieferung oder Portal; aus nur vor Ort", () => {
  const s = laden(); assert.equal(an(s, "hm_lucid"), false);
  s.kanaele.abholung = true; assert.equal(an(s, "hm_lucid"), true);
  s.kanaele.abholung = false; s.kanaele.portale = [{ id: "x", name: "Portal", provision: 0.3 }]; assert.equal(an(s, "hm_lucid"), true);
  assert.equal(hmMitId("hm_lucid").euro, undefined, "Bußgeld im VerpackDG nicht belegt, darum kein Betrag");
});

test("hm_belehrung: an wenn eine Person ohne gültige Belehrung, aus wenn alle ok", () => {
  const s = laden(); s.personen = [person("p1")]; assert.equal(an(s, "hm_belehrung"), true, "fehlt");
  s.personen[0].belehrungen = [{ datum: "2026-06-01", art: "erst" }]; assert.equal(an(s, "hm_belehrung"), false);
  s.personen[0].belehrungen = [{ datum: "2025-01-15", art: "erst" }]; assert.equal(an(s, "hm_belehrung"), true, "fällig");
});

test("hm_allergene: an mit mindestens einem Gericht", () => {
  const s = laden(); assert.equal(an(s, "hm_allergene"), false);
  s.gerichte = [{ id: "g1", name: "Döner", preis: 7.5, zutaten: [] }]; assert.equal(an(s, "hm_allergene"), true);
});

test("hm_elektro: an mit Personal ohne Prüfdatum oder älter als 6 Monate", () => {
  const s = laden(); assert.equal(an(s, "hm_elektro"), false, "ohne Personal nur Empfehlung");
  s.personen = [person("p1")]; assert.equal(an(s, "hm_elektro"), true);
  assert.equal(hmFrageSetzen(s, "elektroGeprueft", "2026-09-01", { bisHeute: TAG }), true); assert.equal(an(s, "hm_elektro"), false);
  assert.equal(an(s, "hm_elektro", "2027-03-01"), true, "6 Monate vorbei");
  assert.equal(hmFrageSetzen(s, "elektroGeprueft", "2027-05-01", { bisHeute: TAG }), false, "Datum in der Zukunft abgelehnt");
  assert.equal(hmFrageSetzen(s, "elektroGeprueft", "nie"), true); assert.equal(an(s, "hm_elektro"), true, "noch nie geprüft");
  assert.ok(!hmOffeneFragen(s).includes("elektroGeprueft"), "Frage beantwortet");
});

test("Büro: höchstens 3, nach Nutzen; Takt ein neuer Nicht-Frist-Hinweis je 7 Tage, Fristen sofort", () => {
  const s = laden(); s.personen = [person("p1")]; s.gerichte = [{ id: "g1", name: "X", zutaten: [] }]; hmFrageSetzen(s, "musik", true); hmFrageSetzen(s, "schwanger", true);
  // ausgelöst: u2 (1), sofortmeldung (5, Frist), ausweis (6, Frist), gema (8), belehrung (11), allergene (12), elektro (13)
  const r1 = hmFuerBuero(s, { datum: TAG });
  assert.deepEqual(r1.karten.map((h) => h.id), ["hm_u2", "hm_sofortmeldung", "hm_ausweis"]);
  hmGezeigtMerken(s, r1.neu, TAG);
  hmStatusSetzen(s, "hm_u2", "erledigt", { datum: TAG }); hmStatusSetzen(s, "hm_sofortmeldung", "erledigt", { datum: TAG });
  const r2 = hmFuerBuero(s, { datum: "2027-01-03" });
  assert.deepEqual(r2.karten.map((h) => h.id), ["hm_ausweis"], "u2 wurde vor 2 Tagen zum ersten Mal gezeigt: Takt sperrt GEMA");
  const r3 = hmFuerBuero(s, { datum: "2027-01-08" });
  assert.deepEqual(r3.karten.map((h) => h.id), ["hm_ausweis", "hm_gema"], "nach 7 Tagen kommt genau einer dazu");
  assert.equal(hmErledigtZahl(s), 2);
});

test("Fragen: nur offene, Schwangerschaft und Elektro nur mit Personal", () => {
  const s = laden(); assert.deepEqual(hmOffeneFragen(s), ["musik"]);
  s.personen = [person("p1")]; assert.deepEqual(hmOffeneFragen(s), ["musik", "schwanger", "elektroGeprueft"]);
  hmFrageSetzen(s, "musik", false); assert.deepEqual(hmOffeneFragen(s), ["schwanger", "elektroGeprueft"]);
  assert.equal(hmFrageSetzen(s, "musik", "ja"), false, "nur true/false/null"); assert.equal(hmFrageSetzen(s, "unbekannt", true), false);
});

test("Laden-Zeile: nur außerhalb der Stoßzeit, höchstens einmal je 7 Tage, Geld-Text nur bei Geld-Hinweis", () => {
  const s = laden(); s.personen = [person("p1")]; hmStatusSetzen(s, "hm_sofortmeldung", "erledigt", { datum: TAG }); hmStatusSetzen(s, "hm_ausweis", "erledigt", { datum: TAG });
  s.personen[0].belehrungen = [{ datum: "2026-06-01", art: "erst" }]; hmFrageSetzen(s, "elektroGeprueft", "2026-12-01", { bisHeute: TAG });
  assert.equal(hmLadenZeile(s, { jetzt: new Date(2027, 0, 1, 16, 0) }), null, "nichts offen");
  hmFrageSetzen(s, "schwanger", true);
  assert.equal(hmLadenZeile(s, { jetzt: new Date(2027, 0, 1, 12, 30) }), null, "Mittags-Stoßzeit (Standard 11:30–14:00)");
  assert.equal(hmLadenZeile(s, { jetzt: new Date(2027, 0, 1, 16, 0) }), "hm.zeki.geld");
  hmLadenGezeigt(s, TAG);
  assert.equal(hmLadenZeile(s, { jetzt: new Date(2027, 0, 5, 16, 0) }), null, "schon diese Woche");
  assert.equal(hmLadenZeile(s, { jetzt: new Date(2027, 0, 8, 16, 0) }), "hm.zeki.geld");
  hmFrageSetzen(s, "schwanger", false); hmFrageSetzen(s, "musik", true);
  assert.equal(hmLadenZeile(s, { jetzt: new Date(2027, 0, 8, 16, 0) }), "hm.zeki.pflicht", "GEMA ist kein Geld-Hinweis");
});

test("Migration: kaputte Angaben werden gesäubert, unbekannte Kennungen fallen weg; Rundreise über JSON bleibt gleich", () => {
  const roh = { musik: "ja", schwanger: true, elektroGeprueft: "01.02.2026", status: { hm_gema: { status: "erledigt", datum: TAG }, fremd: { status: "erledigt" }, hm_u1: { status: "kaputt" } },
    quittiert: { hm_ausweis: ["p1", "p1", 3], fremd: ["x"] }, gezeigt: { hm_gema: TAG, hm_u2: "morgen" }, ladenZuletzt: 5 };
  const a = hmAngabenSauber(roh);
  assert.deepEqual(a, { musik: null, schwanger: true, elektroGeprueft: null, status: { hm_gema: { status: "erledigt", datum: TAG } }, quittiert: { hm_ausweis: ["p1"] }, gezeigt: { hm_gema: TAG }, ladenZuletzt: null });
  const s = laden(); s.betrieb.hmAngaben = roh; migrierenBetrieb(s);
  assert.deepEqual(s.betrieb.hmAngaben, a, "store.migrierenBetrieb säubert");
  const zurueck = JSON.parse(JSON.stringify(s)); migrierenBetrieb(zurueck);
  assert.deepEqual(zurueck.betrieb.hmAngaben, s.betrieb.hmAngaben, "Rundreise");
  const ohne = laden(); migrierenBetrieb(ohne); assert.equal(ohne.betrieb.hmAngaben, undefined, "alte Stände bekommen kein neues Feld");
  assert.deepEqual(hmAngaben({}), hmAngabenSauber(undefined), "fehlender Betrieb wirft nicht");
});

test("kaputte Daten werfen nicht, der Hinweis bleibt dann aus", () => {
  const s = laden(); s.personen = [person("p1")]; s.teamTage = [{ datum: 5 }]; s.schichten = [null, { datum: "2027-01-01" }]; s.abwesend = [null, { monat: 7 }];
  assert.doesNotThrow(() => hmAusgeloest(s, { datum: TAG }));
});
