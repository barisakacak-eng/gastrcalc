// Welle 3 Datenmodell (Bau-Chat 03.11.2026): Schichtzeiten in stand.teamTage (alte Einträge bleiben gültig), Monatsabschluss einfrieren,
// Rundreise durch Sicherung (export → import) ohne Verlust.
import { test } from "node:test";
import assert from "node:assert/strict";
const { idbAttrappe } = await import("./hilfe/idb_attrappe.mjs"); idbAttrappe();
const i18n = await import("../js/i18n.js"); i18n.setzeSprache("de");
const st = await import("../js/store.js");
const { teamTagSetzen, teamTag } = await import("../js/stamm.js");
const { schichtenAusLaden, zaehlerSumme, eintragStunden } = await import("../js/schichten.js");
const { monatEinfrieren, eingefroren, monatVergleich } = await import("../js/monatsabschluss.js");

test("3.8 Datenmodell: Schicht mit Beginn/Ende wird gespeichert, ohne Zeiten bleibt alles wie bisher, Unsinn wird verworfen", () => {
  const s = st.leererBetrieb(); s.personen = [{ id: "a", name: "AB" }];
  teamTagSetzen(s, "2026-12-27", [{ person: "a", name: "AB", stunden: 9, satz: 14, von: "18:00", bis: "3:00" }]);
  teamTagSetzen(s, "2026-12-20", [{ person: "a", name: "AB", stunden: 8, satz: 14 }]);
  teamTagSetzen(s, "2026-12-21", [{ person: "a", name: "AB", stunden: 5, satz: 14, von: "25:00", bis: "x" }]);
  const e = teamTag(s, "2026-12-27").eintraege[0]; assert.equal(e.von, "18:00"); assert.equal(e.bis, "03:00"); assert.equal(eintragStunden(e), 9);
  const alt = teamTag(s, "2026-12-20").eintraege[0]; assert.ok(!("von" in alt)); assert.equal(eintragStunden(alt), 8);
  assert.ok(!("von" in teamTag(s, "2026-12-21").eintraege[0]));
  assert.deepEqual(schichtenAusLaden(s, "a", "2026-12-01", "2026-12-31"), [{ datum: "2026-12-27", von: "18:00", bis: "03:00" }]);
  assert.equal(zaehlerSumme(schichtenAusLaden(s, "a", "2026-12-01", "2026-12-31")).sonntag, 9);
});

test("3.3 Monatsabschluss: einfrieren, Nachtrag ändert ihn nicht, neu: true ersetzt sichtbar; Vergleich zum Vormonat", () => {
  const s = st.leererBetrieb(); s.betrieb.steuerSatz = 0.07; s.betrieb.warenQuote = 0.3;
  for (let d = 1; d <= 10; d++) s.tagesnotizen.push({ id: "o" + d, datum: `2026-10-${String(d).padStart(2, "0")}`, umsatz: 1000, erfasst: "2026-10-31T20:00:00Z" });
  for (let d = 1; d <= 10; d++) s.tagesnotizen.push({ id: "n" + d, datum: `2026-11-${String(d).padStart(2, "0")}`, umsatz: 1070, erfasst: "2026-11-30T20:00:00Z" });
  const okt = monatEinfrieren(s, "2026-10", { jetzt: "2026-11-01T08:00:00Z" });
  assert.equal(okt.umsatzBrutto, 10000);
  s.tagesnotizen.push({ id: "spaet", datum: "2026-10-15", umsatz: 500, erfasst: "2026-11-02T08:00:00Z" });
  assert.equal(eingefroren(s, "2026-10").umsatzBrutto, 10000, "eingefroren bleibt eingefroren");
  assert.equal(monatEinfrieren(s, "2026-10").umsatzBrutto, 10000, "zweiter Aufruf ohne neu: unverändert");
  const neu = monatEinfrieren(s, "2026-10", { neu: true, jetzt: "2026-11-02T09:00:00Z" }); assert.equal(neu.umsatzBrutto, 10500);
  assert.equal(s.monatsabschluesse.filter((x) => x.monat === "2026-10").length, 2, "alter Abschluss bleibt als ersetzt stehen");
  const v = monatVergleich(s, "2026-11"); assert.equal(v.jetzt.umsatzBrutto, 10700); assert.equal(v.zumVormonat.umsatz, 200); assert.equal(v.vorjahr, null);
});

test("Rundreise: Schichtzeiten und Monatsabschlüsse überstehen Sicherung → Einlesen auf leerem Gerät", async () => {
  await st.laden(); const w = st.leereWurzel(); const b = st.leererBetrieb(); b.betrieb.name = "Rundreise"; b.personen = [{ id: "a", name: "AB" }];
  teamTagSetzen(b, "2026-12-31", [{ person: "a", name: "AB", stunden: 10, satz: 14, von: "16:00", bis: "02:00" }]);
  b.tagesnotizen.push({ id: "t1", datum: "2026-11-02", umsatz: 800, erfasst: "2026-11-02T20:00:00Z" }); monatEinfrieren(b, "2026-11", { jetzt: "2026-12-01T08:00:00Z" });
  w.betriebe.push(b); w.aktiv = b.id;
  const datei = await st.exportDatei(w, { mitAblage: false });
  const imp = await st.importSicherung(datei); const w2 = st.leereWurzel(); st.zusammenfuehren(w2, imp.wurzel);
  const b2 = w2.betriebe.find((x) => x.betrieb.name === "Rundreise"); assert.ok(b2);
  assert.deepEqual(schichtenAusLaden(b2, "a", "2026-12-01", "2026-12-31"), [{ datum: "2026-12-31", von: "16:00", bis: "02:00" }]);
  assert.equal(eingefroren(b2, "2026-11").umsatzBrutto, 800);
});
