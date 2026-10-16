// Paket 2 (Audit 16.10.2026): Speicherung – nachgetragene Werte sofort in die Monatsteile, zwei Fenster derselben Fassung
// (Generationszähler), Zurücksetzer beim Ladenwechsel, Sicherungs-Hinweis. Läuft gegen tests/hilfe/idb_attrappe.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { idbAttrappe } from "./hilfe/idb_attrappe.mjs";
import { jahresStand } from "./hilfe/jahr.mjs";
const st = await import("../js/store.js");
const U = await import("../js/util.js");
const mu = await import("../js/muell.js");
const eng = await import("../js/engine.js");

const teile = (a) => a.speicher("gastrocalc", "teile");
const schreibAb = (a) => { const n = a.schreibvorgaenge.length; return () => a.schreibvorgaenge.slice(n); };
const teilPuts = (liste) => liste.filter(([s, art]) => s === "teile" && art === "put").map(([, , k]) => k);
let JAHR = null; const jahr = () => (JAHR ??= jahresStand(120));

// ---------- 1. schwundWertSetzen und tagesnotizFestschreiben schreiben sofort ----------
test("Paket 2 (1): Wert an altem Schwund-Eintrag nachgetragen → im selben Speicherlauf im Monatsteil, ohne visibilitychange und ohne Idle-Callback", async () => {
  const a = idbAttrappe(); await st.laden();
  assert.equal(typeof globalThis.requestIdleCallback, "undefined"); assert.equal(typeof globalThis.document, "undefined");
  const w0 = structuredClone(jahr()); const b0 = w0.betriebe[0];
  // ein alter Eintrag ohne Wert (aus einem früheren Monat, also nach dem Laden sicher nicht „frisch“)
  const e0 = b0.schwund.find((x) => !x.storniert && x.datum.slice(0, 7) < U.heute().slice(0, 7));
  e0.wert = null; e0.wertOffen = true; delete e0.wertGesetzt;
  await st.sofortSpeichern(w0);
  const w = await st.laden(); const b = w.betriebe[0]; await st.sofortSpeichern(w); // Grundlage nach dem Laden: alle Einträge gelten als alt
  const alt = b.schwund.find((x) => x.id === e0.id); assert.equal(alt.wert, null); assert.equal(alt.wertOffen, true);
  const ab = schreibAb(a);
  assert.equal(eng.schwundWertSetzen(alt, 12.5), true);
  await st.sofortSpeichern(w);
  assert.deepEqual(teilPuts(ab()), [`${b.id}|schwund|${alt.datum.slice(0, 7)}`], "genau der Monat des Eintrags, sofort");
  const neu = await st.laden(); // kein visibilitychange, kein Idle-Callback dazwischen
  const g = neu.betriebe[0].schwund.find((x) => x.id === e0.id);
  assert.equal(g.wert, 12.5); assert.equal(g.wertOffen, false); assert.equal(typeof g.wertGesetzt, "string");
});

test("Paket 2 (1): Tagesnotiz festschreiben – Entwurf-Kennzeichen weg und ersetzt am Vorgänger sind sofort gespeichert", async () => {
  const a = idbAttrappe(); await st.laden();
  await st.sofortSpeichern(structuredClone(jahr()));
  const w = await st.laden(); const b = w.betriebe[0]; await st.sofortSpeichern(w);
  const datum = U.heute(); const monat = datum.slice(0, 7);
  const rohNotiz = (id) => JSON.parse(teile(a).get(`${b.id}|tagesnotizen|${monat}`).t).find((n) => n.id === id);
  // Nach dem Laden gilt jeder Eintrag als alt. Ein Entwurf dieser Sitzung an einem alten Eintrag (wie nach „Feld verlassen“ ohne Neuladen):
  const e = b.tagesnotizen.find((n) => n.datum === datum && !n.storniert && typeof n.umsatz === "number"); assert.ok(e);
  e.entwurf = true; e.sitzung = U.SITZUNG; await st.sofortSpeichern(w);
  assert.equal(rohNotiz(e.id).entwurf, true, "entwurf ist ein beobachtetes Feld: sofort im Teil");
  let ab = schreibAb(a);
  assert.equal(eng.tagesnotizFestschreiben(b, datum, null), e); assert.equal(e.entwurf, undefined);
  await st.sofortSpeichern(w);
  assert.deepEqual(teilPuts(ab()), [`${b.id}|tagesnotizen|${monat}`], "Festschreiben: Monat der Notiz sofort geschrieben");
  assert.equal(rohNotiz(e.id).entwurf, undefined);
  // leerer Entwurf (Feld geleert): Vorgänger wird storniert mit ersetzt = Entwurf; Festschreiben entfernt den Entwurf und setzt ersetzt = null
  const leer = eng.tagesnotizLoeschen(b, datum, null); assert.ok(leer && leer.entwurf);
  await st.sofortSpeichern(w);
  assert.equal(rohNotiz(e.id).ersetzt, leer.id);
  ab = schreibAb(a);
  assert.equal(eng.tagesnotizFestschreiben(b, datum, null), null); assert.equal(e.ersetzt, null);
  await st.sofortSpeichern(w);
  assert.ok(teilPuts(ab()).includes(`${b.id}|tagesnotizen|${monat}`));
  const g = (await st.laden()).betriebe[0].tagesnotizen;
  assert.equal(g.find((n) => n.id === leer.id), undefined, "leerer Entwurf ist weg");
  assert.equal(g.find((n) => n.id === e.id).ersetzt, undefined, "ersetzt = null am Vorgänger ist gespeichert (Hebung lässt null weg)");
  assert.equal(rohNotiz(e.id).ersetzt, null);
});

// ---------- 2. Zwei Fenster derselben Fassung ----------
test("Paket 2 (2): zwei Store-Instanzen auf derselben Datenbank – fremde Generation wird erkannt, eigene Änderungen werden hineingemischt, nichts doppelt", async () => {
  const a = idbAttrappe();
  const A = st, B = await import("../js/store.js?fenster=B"); // zweite Modul-Instanz = zweites Fenster, gleiche Attrappe
  const ereignisse = []; const fenster = { listeners: {}, addEventListener(n, f) { (this.listeners[n] ??= []).push(f); }, dispatchEvent(ev) { ereignisse.push(ev); for (const f of this.listeners[ev.type] || []) f(ev); return true; } };
  globalThis.window = fenster; globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init?.detail; } };
  const kopf = () => a.speicher("gastrocalc", "stand").get("kopf");
  const dbStand = async () => { const C = await import("../js/store.js?fenster=C" + Math.random()); return C.laden(); }; // frische Instanz: liest nur
  try {
    const wA = await A.laden(); const b = st.leererBetrieb(); b.phase = "app"; b.betrieb.name = "Laden"; b.gerichte = [{ id: "g1", name: "Döner", zutaten: [] }, { id: "g2", name: "Dürüm", zutaten: [] }]; wA.betriebe = [b]; wA.aktiv = b.id;
    assert.equal(await A.sofortSpeichern(wA), true);
    assert.equal(kopf().gen, 1, "Kopf trägt den Generationszähler");
    const wB = await B.laden(); assert.equal(wB.betriebe[0].betrieb.name, "Laden"); assert.equal(B._generation(), 1);
    // A schreibt einen Müll-Eintrag (gen 2); B hat noch gen 1 gelesen und trägt einen anderen Müll-Eintrag ein
    const eA = mu.gerichtWeg(wA.betriebe[0], wA.betriebe[0].gerichte[0], { datum: U.heute(), anzahl: 1 });
    assert.equal(await A.sofortSpeichern(wA), true); assert.equal(kopf().gen, 2);
    const eB = mu.gerichtWeg(wB.betriebe[0], wB.betriebe[0].gerichte[1], { datum: U.heute(), anzahl: 2 });
    wB.betriebe[0].betrieb.name = "Laden B"; // Bereich „betrieb“ geändert (Zeitstempel beim Speichern)
    assert.equal(await B.sofortSpeichern(wB), true, "B: fremder Stand erkannt, eigene Änderungen hineingemischt und geschrieben");
    assert.equal(kopf().gen, 3, "einmal erneut geschrieben, neue Generation");
    const db = await dbStand(); const sw = db.betriebe[0].schwund;
    assert.deepEqual(sw.map((e) => e.id).sort(), [eA.id, eB.id].sort(), "Datenbank enthält BEIDE Einträge, keiner doppelt");
    assert.equal(sw.find((e) => e.id === eB.id).menge, 2);
    assert.equal(db.betriebe[0].betrieb.name, "Laden B", "Bs jüngere Stammdaten-Änderung gewinnt");
    assert.equal(ereignisse.length, 1); assert.equal(ereignisse[0].type, st.FREMDER_STAND);
    assert.equal(ereignisse[0].detail.zusammengefuehrt, true);
    const neuB = ereignisse[0].detail.wurzel; assert.equal(neuB.betriebe[0].schwund.length, 2, "gelieferter Stand ist das zusammengeführte Ergebnis");
    assert.equal(B._generation(), 3);
    // die alte Arbeitskopie von B wird nicht mehr geschrieben (verzögertes Speichern könnte noch anstehen); mit dem neuen Stand geht es weiter
    assert.equal(await B.sofortSpeichern(wB), false);
    neuB.betriebe[0].betrieb.name = "B weiter"; assert.equal(await B.sofortSpeichern(neuB), true); assert.equal(kopf().gen, 4);
    // jetzt ist A mit altem Stand (gen 2) dran: Storno von Bs Eintrag darf nicht verloren gehen, kein Eintrag doppelt
    assert.equal(await A.sofortSpeichern(wA), true, "A ohne Änderung: nichts zu schreiben, keine Prüfung nötig");
    const eA2 = mu.gerichtWeg(wA.betriebe[0], wA.betriebe[0].gerichte[0], { datum: U.heute(), anzahl: 3 });
    assert.equal(await A.sofortSpeichern(wA), true); assert.equal(kopf().gen, 5);
    const db2 = await dbStand(); assert.deepEqual(db2.betriebe[0].schwund.map((e) => e.id).sort(), [eA.id, eB.id, eA2.id].sort());
    assert.equal(db2.betriebe[0].betrieb.name, "B weiter", "As unveränderter Bereich überschreibt Bs jüngere Änderung nicht");
    assert.equal(ereignisse.length, 2); assert.equal(ereignisse[1].detail.zusammengefuehrt, true);
    assert.ok([...a.speicher("gastrocalc", "ereignisse").values()].some((x) => x.art === "speicher-fremder-stand" && x.zusammengefuehrt === true));
    // offener Kühl-Rundgang in B (Personal-Modus), währenddessen schreibt A (gen 6): der Rundgang darf beim Mischen nicht verschwinden
    const wA2 = await dbStand(); const bA = wA2.betriebe[0]; const C = await import("../js/store.js?fenster=C-rundgang"); await C.laden();
    bA.kuehlstellen = [{ id: "k1", name: "Kühlschrank", art: "kuehl", min: null, max: null, reihe: 0, archiviert: false }]; bA.personen = [{ id: "p1", kuerzel: "BA", aktiv: true, entfernt: false }];
    assert.equal(await C.sofortSpeichern(wA2), true); // gen 6
    const D = await import("../js/store.js?fenster=D-rundgang"); const wD = await D.laden(); const bD = wD.betriebe[0];
    const rg = eng.rundgangStarten(bD, { von: "p1" }); eng.stationEintragen(rg, bD.kuehlstellen[0], { wert: 4 });
    mu.gerichtWeg(bA, bA.gerichte[0], { datum: U.heute(), anzahl: 1 }); assert.equal(await C.sofortSpeichern(wA2), true); // gen 7, D ist jetzt veraltet
    assert.equal(await D.sofortSpeichern(wD), true);
    const db3 = await dbStand(); const r = db3.betriebe[0].rundgaenge.find((x) => x.id === rg.id);
    assert.ok(r && !r.abgeschlossen && r.messungen.length === 1, "offener Rundgang aus dem veralteten Fenster bleibt erhalten");
    assert.equal(db3.betriebe[0].schwund.length, 4);
  } finally { delete globalThis.window; delete globalThis.CustomEvent; }
});

test("Paket 2 (2): zweiter Konflikt in Folge → aufgeben: nichts überschrieben, Arbeitskopie verworfen, zusammengefuehrt: false", async () => {
  const a = idbAttrappe();
  const A = st, B = await import("../js/store.js?fenster=B2");
  const ereignisse = []; globalThis.window = { addEventListener() {}, dispatchEvent(ev) { ereignisse.push(ev); return true; } };
  globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init?.detail; } };
  try {
    const wA = await A.laden(); const b = st.leererBetrieb(); b.phase = "app"; b.betrieb.name = "Laden"; b.gerichte = [{ id: "g1", name: "Döner", zutaten: [] }]; wA.betriebe = [b]; wA.aktiv = b.id;
    await A.sofortSpeichern(wA);
    const wB = await B.laden();
    mu.gerichtWeg(wA.betriebe[0], wA.betriebe[0].gerichte[0], { datum: U.heute(), anzahl: 1 }); await A.sofortSpeichern(wA); // gen 2
    // B schreibt, und WÄHREND B den frischen Stand liest und mischt, schreibt A noch einmal (gen 3) → Bs zweiter Versuch trifft wieder eine fremde Generation
    const stand = a.speicher("gastrocalc", "stand");
    const echtesPut = stand.set.bind(stand); let lesungen = 0;
    mu.gerichtWeg(wB.betriebe[0], wB.betriebe[0].gerichte[0], { datum: U.heute(), anzahl: 5 });
    // Bs Lesefolge: 1. Prüfung in der Schreib-Transaktion (gen 2 ≠ 1), 2. frischen Stand lesen (gen 2), 3. Prüfung beim erneuten Schreiben, 4. frischer Stand nach dem Aufgeben.
    // Zwischen 2. und 3. schreibt „A“ gen 3 – nachgebildet, indem nach der zweiten Lesung der Zähler in der Datenbank hochgeht.
    const origGet = stand.get.bind(stand);
    stand.get = (k) => { const v = origGet(k); if (k === "kopf" && v && ++lesungen === 2) { const k2 = structuredClone(v); k2.gen = 3; k2.wurzel = k2.wurzel.replace('"Laden"', '"Laden A3"'); echtesPut("kopf", k2); } return v; };
    assert.equal(await B.sofortSpeichern(wB), false, "zweiter Konflikt: aufgegeben");
    stand.get = origGet;
    assert.equal(lesungen, 4); // 4.: nach dem Aufgeben wird der frische Stand noch einmal gelesen
    assert.equal(stand.get("kopf").gen, 3, "nichts überschrieben"); assert.ok(stand.get("kopf").wurzel.includes("Laden A3"));
    assert.equal(ereignisse.length, 1); assert.equal(ereignisse[0].detail.zusammengefuehrt, false);
    assert.equal(ereignisse[0].detail.wurzel.betriebe[0].betrieb.name, "Laden A3", "gelieferter Stand = der frische aus der Datenbank"); assert.equal(B._generation(), 3);
    assert.equal(await B.sofortSpeichern(wB), false, "Arbeitskopie bleibt verworfen");
  } finally { delete globalThis.window; delete globalThis.CustomEvent; }
});

test("Paket 2 (2): alter Kopf ohne gen lädt weiter (gen fehlt = 0) und bekommt beim nächsten Schreiben gen 1", async () => {
  const a = idbAttrappe(); await st.laden();
  const w = structuredClone(jahr()); await st.sofortSpeichern(w);
  const stand = a.speicher("gastrocalc", "stand"); const kopf = stand.get("kopf"); delete kopf.gen; stand.set("kopf", kopf);
  const g = await st.laden(); assert.equal(g.betriebe[0].betrieb.name, "Test Döner"); assert.equal(st._generation(), 0);
  g.betriebe[0].betrieb.name = "Gehoben"; assert.equal(await st.sofortSpeichern(g), true);
  assert.equal(stand.get("kopf").gen, 1);
  assert.equal((await st.laden()).betriebe[0].betrieb.name, "Gehoben");
});

// ---------- 3./4. app.js: controllerchange ohne eigenen Tipp, Zurücksetzer ----------
test("Paket 2 (3): controllerchange ohne eigenen „Aktualisieren“-Tipp lädt neu, sobald kein Formular offen ist", () => {
  const app = fs.readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.match(app, /addEventListener\("controllerchange", \(\) => \{ if \(aktualisierungKlick\) location\.reload\(\); else fremdeFassungUebernehmen\(\); \}\)/);
  assert.match(app, /function fremdeFassungUebernehmen\(\)/);
  assert.match(app, /function formularOffen\(\)/);
  assert.match(app, /window\.addEventListener\(FREMDER_STAND/);
});

test("Paket 2 (4): karte.js, vergleich.js und onboarding.js haben Zurücksetzer, die den flüchtigen Zustand leeren", async () => {
  const k = await import("../js/screens/karte.js"); const v = await import("../js/screens/vergleich.js"); const o = await import("../js/screens/onboarding.js");
  assert.equal(typeof k.karteZuruecksetzen, "function"); assert.equal(typeof v.vergleichZuruecksetzen, "function"); assert.equal(typeof o.onboardingZuruecksetzen, "function");
  k.karteZuruecksetzen(); v.vergleichZuruecksetzen(); o.onboardingZuruecksetzen();
  // Vergleich: Modus „marge“ gesetzt → nach dem Zurücksetzen wieder Deckungsbeitrag
  v.vergleichModus("marge"); assert.equal(v.vergleichModusAktuell(), "marge"); v.vergleichZuruecksetzen(); assert.equal(v.vergleichModusAktuell(), "db");
  const app = fs.readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  const liste = app.slice(app.indexOf("const ZURUECKSETZER = ["), app.indexOf("];", app.indexOf("const ZURUECKSETZER = [")));
  for (const n of ["karteZuruecksetzen", "vergleichZuruecksetzen", "onboardingZuruecksetzen"]) assert.ok(liste.includes(n), n + " in ZURUECKSETZER");
});

// ---------- 5. Sicherungs-Hinweis ----------
test("Paket 2 (5): Sicherungs-Hinweis nennt in de/tr/en, dass die Datei nur mit Passwort verschlüsselt ist (E5, 16.10.2026)", async () => {
  for (const [c, wort] of [["de", "nur mit Passwort verschlüsselt"], ["tr", "sadece parolayla şifrelenir"], ["en", "only encrypted with a password"]]) {
    const tab = (await import(`../js/lang/${c}.js`)).default;
    assert.ok(tab.einstellungen.sicherungText.includes(wort), `${c}: ${tab.einstellungen.sicherungText}`);
  }
});
