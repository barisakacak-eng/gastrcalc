// Lauf 6, Etappe 5 – Draht (13.11.2026): Verdrahtung der neuen Fähigkeiten des Rechenwerks in der Oberfläche. Ein Abschnitt je Punkt.
import { test, mock } from "node:test";
import assert from "node:assert/strict";
globalThis.document ??= { documentElement: {} };
import { idbAttrappe } from "./hilfe/idb_attrappe.mjs";
const st = await import("../js/store.js");
const af = await import("../js/abgleich_felder.js");
const stamm = await import("../js/stamm.js");
const w3 = await import("../js/welle3.js");
const { beispielLaden } = await import("../js/beispiel.js");
const l6y = await import("../js/data/l6y_texte.js");

const J = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
const laden = (id = "L1") => { const b = st.leererBetrieb(); b.id = id; b.phase = "app"; b.betrieb.name = "Nord"; return b; };
const wurzelMit = (...laeden) => { const w = st.leereWurzel(); w.betriebe = laeden; w.aktiv = laeden[0]?.id ?? null; return w; };

// ---------- 2: Kostenposten-Verlauf übersteht Laden, Sicherung, Einlesen ----------
test("Draht 2: Kostenposten-verlauf bleibt bei migrierenBetrieb, Sicherung und Einlesen erhalten (Rundreise), Ungültiges fliegt raus", async () => {
  idbAttrappe(); await st.laden();
  const b = laden(); const verlauf = [{ ab: "", wert: 900 }, { ab: "2026-09", wert: 1000 }];
  b.kosten.push({ id: "k1", kategorie: "fix", posten: "Miete", betrag: 1000, status: "bekannt", periode: "monat", basis: "netto", verlauf: J(verlauf) });
  assert.deepEqual(st.migrierenBetrieb(J(b)).kosten[0].verlauf, verlauf, "migrierenBetrieb");
  const w = wurzelMit(b);
  const { blob } = await st.exportDatei(w);
  const r = await st.importSicherung(blob);
  assert.deepEqual(r.wurzel.betriebe[0].kosten[0].verlauf, verlauf, "Sicherung → Einlesen");
  const z = st.zusammenfuehren(wurzelMit(laden("L2")), r.wurzel);
  assert.deepEqual(r.wurzel.betriebe[0].kosten[0].verlauf, verlauf);
  assert.ok(z, "zusammenführen");
  const c = laden(); c.kosten.push({ id: "k2", kategorie: "fix", posten: "Strom", betrag: 100, status: "bekannt", verlauf: [{ ab: "2026-09", wert: 90 }, { ab: "kaputt", wert: 1 }, { ab: "2026-10", wert: "x" }, null, { ab: "2026-10", wert: -5 }] },
    { id: "k3", kategorie: "fix", posten: "Gas", betrag: 100, status: "bekannt", verlauf: "nix" });
  const m = st.migrierenBetrieb(J(c));
  assert.deepEqual(m.kosten[0].verlauf, [{ ab: "2026-09", wert: 90 }], "nur gültige Einträge");
  assert.equal("verlauf" in m.kosten[1], false, "ungültiges Feld fällt weg");
});

// ---------- 3: Zeitstempel für Chef-Stunden und gelöschten Zeki-Verlauf ----------
const warte = (ms = 5) => new Promise((r) => setTimeout(r, ms));
const beideRichtungen = (a, b) => [st.verschmelzen(J(a), J(b)), st.verschmelzen(J(b), J(a))];
test("Draht 3: chefStundenSetzen schreibt geaendert; zwei Handys im Abgleich – beide Richtungen, derselbe, jüngere Wert", async () => {
  const a = laden("L1"), b = laden("L1");
  w3.chefStundenSetzen(a, 100); await warte(); w3.chefStundenSetzen(b, 160);
  assert.match(a.chef.geaendert, /^\d{4}-\d\d-\d\dT/);
  const [ab, ba] = beideRichtungen(a, b);
  assert.equal(ab.chef.stundenMonat, 160); assert.equal(ba.chef.stundenMonat, 160);
  assert.deepEqual(ab.chef, ba.chef);
});
test("Draht 3: zekiLogLoeschen schreibt zekiLogGeloescht; gelöschter Verlauf bleibt beim Abgleich in beide Richtungen leer", async () => {
  assert.ok("zekiLogGeloescht" in af.FELD_ABGLEICH && af.FELD_VERFAHREN("zekiLogGeloescht") !== null, "Verfahren vorhanden");
  const a = laden("L1"), b = laden("L1");
  stamm.zekiLogAnhaengen(a, { art: "frage" }); stamm.zekiLogAnhaengen(a, { art: "antwort" });
  b.zekiLog = J(a.zekiLog); await warte(); stamm.zekiLogLoeschen(b);
  assert.match(b.zekiLogGeloescht, /^\d{4}-\d\d-\d\dT/);
  const [ab, ba] = beideRichtungen(a, b);
  assert.deepEqual(ab.zekiLog, []); assert.deepEqual(ba.zekiLog, []);
  assert.equal(ab.zekiLogGeloescht, ba.zekiLogGeloescht);
  // neuer Eintrag nach dem Löschen bleibt
  await warte(); stamm.zekiLogAnhaengen(a, { art: "neu" });
  const [x, y] = beideRichtungen(a, b); assert.equal(x.zekiLog.length, 1); assert.deepEqual(x.zekiLog, y.zekiLog);
});

// ---------- 5: Blatt „Sicherung teilen“ trägt den Satz ohne Passwort ----------
test("Draht 5: Blatt „Sicherung teilen“ enthält den Satz „Ohne Passwort …“, sichtbar erst bei ausgeschaltetem Passwort", async () => {
  const umschalter = [];
  const kind = (name = "") => ({ addEventListener() {}, focus() {}, setAttribute() {}, value: "", classList: { add() {}, remove() {}, toggle: (k, an) => umschalter.push([name, k, an]) }, querySelector: (s) => kind(s), querySelectorAll: () => [], textContent: "", click() {} });
  const huelle = { ...kind(), innerHTML: "" };
  const dok = globalThis.document; const alt = { gid: dok.getElementById, body: dok.body, qs: dok.querySelector };
  dok.getElementById = () => huelle; dok.body = { classList: { add() {}, remove() {} }, appendChild() {} }; dok.querySelector = () => null;
  const i18n = await import("../js/i18n.js"); i18n.setzeSprache("de");
  try {
    const eb = await import("../js/screens/ebene.js");
    eb.passwortStarten("teilen", { tage: 3 });
    const satz = l6y.l6yText("ohnePasswort", "de");
    assert.ok(satz.length > 20);
    assert.ok(huelle.innerHTML.includes(satz), "Satz steht im Blatt");
    assert.match(huelle.innerHTML, /<p class="hinweis pw-ohne versteckt"/, "zunächst versteckt (Passwort ist vorgewählt)");
    eb.sicherungSchalter("passwort"); // Passwort aus
    assert.ok(umschalter.some(([n, k, an]) => n === ".pw-ohne" && k === "versteckt" && an === false), "Satz wird sichtbar, wenn kein Passwort gewählt ist");
    eb.sicherungSchalter("passwort"); // wieder an
    assert.ok(umschalter.some(([n, k, an]) => n === ".pw-ohne" && k === "versteckt" && an === true), "und wieder versteckt");
    eb.blattSchliessen();
    // Einlesen-Blatt trägt den Satz nicht
    eb.passwortStarten("einlesen"); assert.ok(!huelle.innerHTML.includes(satz)); eb.blattSchliessen();
  } finally { dok.getElementById = alt.gid; dok.body = alt.body; dok.querySelector = alt.qs; }
});

// ---------- 6: Monatsabschluss zeigt „Daten seit Abschluss geändert.“ ----------
test("Draht 6: geld3View zeigt den Satz „Daten seit Abschluss geändert.“ nur bei veraltetem Abschluss des Vormonats", async () => {
  const ma = await import("../js/monatsabschluss.js"); const g = await import("../js/screens/geld3.js");
  const i18n = await import("../js/i18n.js"); i18n.setzeSprache("de");
  const satz = l6y.l6yText("abschlussVeraltet", "de"); assert.equal(satz, "Daten seit Abschluss geändert.");
  mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-11-13T12:00:00Z") });
  try {
    const a = beispielLaden("2026-11-13"); ma.monatEinfrieren(a, "2026-10", { jetzt: "2026-11-02T10:00:00.000Z" });
    const karte = (s) => g.geld3View(s).match(/data-g3="monat"[\s\S]*?<\/details>/)[0];
    assert.ok(!karte(a).includes(satz), "frisch eingefroren: kein Hinweis");
    assert.match(karte(a), /abgeschlossen|Abgeschlossen/i);
    a.tagesnotizen.push({ id: "spaet-1", datum: "2026-10-31", umsatz: 123, erfasst: "2026-11-05T10:00:00.000Z", nacherfasst: true, storniert: false });
    assert.equal(ma.abschlussVeraltet(a, "2026-10"), true);
    assert.ok(karte(a).includes(satz), "nach nachgetragenem Tag: Hinweis steht in der Karte");
  } finally { mock.timers.reset(); }
});
