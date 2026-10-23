// Geteilte Speicherung (Stresstest 15.10.): Kopf + Monatsteile, nur Geändertes schreiben, Umzug vom alten Gesamt-Datensatz,
// Sicherungsdatei unverändert. Läuft gegen eine kleine IndexedDB-Attrappe (tests/hilfe/idb_attrappe.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { idbAttrappe } from "./hilfe/idb_attrappe.mjs";
import { jahresStand } from "./hilfe/jahr.mjs";
const st = await import("../js/store.js");
const U = await import("../js/util.js");
const mu = await import("../js/muell.js");
const eng = await import("../js/engine.js");

const json = (x) => JSON.stringify(x);
const erwartet = (w) => st.migrierenWurzel(JSON.parse(json(w))); // so muss der Stand nach dem Laden aussehen
const teile = (a) => a.speicher("gastrocalc", "teile");
const schreibAb = (a) => { const n = a.schreibvorgaenge.length; return () => a.schreibvorgaenge.slice(n); };
const teilPuts = (liste) => liste.filter(([s, art]) => s === "teile" && art === "put").map(([, , k]) => k);

let JAHR = null; const jahr = () => (JAHR ??= jahresStand(365));

test("Ein Jahr Daten: Speichern in Monatsteile und Laden ergibt genau denselben Stand", async () => {
  const a = idbAttrappe();
  assert.equal((await st.laden()).betriebe.length, 0, "leerer Speicher → leere Wurzel");
  const w = structuredClone(jahr());
  assert.equal(await st.sofortSpeichern(w, { stempel: false }), true);
  const t = teile(a);
  assert.ok(t.size > 50, `Monatsteile angelegt (${t.size})`);
  assert.ok([...t.keys()].every((k) => /^[^|]+\|[a-z]+\|(\d{4}-\d{2}|ohne|alle)$/.test(k)), "Schlüssel ladenId|journal|JJJJ-MM");
  const kopf = a.speicher("gastrocalc", "stand").get("kopf");
  assert.ok(kopf.wurzel.length < 20000, `Kopf bleibt klein (${kopf.wurzel.length} Zeichen)`);
  assert.equal(a.speicher("gastrocalc", "stand").has("main"), false, "kein Gesamt-Datensatz mehr");
  const geladen = await st.laden();
  assert.equal(json(geladen), json(erwartet(w)));
  assert.equal(geladen.betriebe[0].schwund.length, w.betriebe[0].schwund.length);
});

test("Rundgänge: abgeschlossene speichern keine doppelte Kopie der Messungen, offene schon", async () => {
  const a = idbAttrappe(); await st.laden();
  const w = structuredClone(jahr()); const b = w.betriebe[0];
  const offen = eng.rundgangStarten(b, { von: b.personen[0].id }); eng.stationEintragen(offen, b.kuehlstellen[0], { wert: 4 });
  await st.sofortSpeichern(w);
  const gespeichert = [...teile(a).values()].filter((v) => v.j === "rundgaenge").flatMap((v) => JSON.parse(v.t));
  assert.ok(gespeichert.filter((r) => r.abgeschlossen).every((r) => r.messungen.length === 0), "abgeschlossen: keine Kopie");
  assert.equal(gespeichert.find((r) => r.id === offen.id).messungen.length, 1, "offener Rundgang behält seine Messung");
  // fehlt eine Messung im Journal, bleibt die Kopie (nichts geht verloren)
  const r0 = b.rundgaenge[0]; const m0 = r0.messungen[0];
  b.messungen = b.messungen.filter((m) => m.id !== m0.id);
  assert.equal(st.rundeDoppelt(r0, b), false);
  const gehoben = st.migrierenWurzel(JSON.parse(json(w)));
  assert.equal(gehoben.betriebe[0].rundgaenge[0].messungen.length, r0.messungen.length, "Kopie bleibt, wenn das Journal sie nicht vollständig hat");
  assert.equal(gehoben.betriebe[0].rundgaenge[1].messungen.length, 0);
  const m = gehoben.betriebe[0].messungen;
  assert.ok(m.length > 0 && m.every((x) => x.rundgang), "Monatsblatt-Daten stehen im Journal");
});

test("Nur geänderte Monatsteile werden geschrieben; ohne Änderung wird gar nicht geschrieben", async () => {
  const a = idbAttrappe(); await st.laden();
  const w0 = structuredClone(jahr()); await st.sofortSpeichern(w0);
  const w = await st.laden(); const b = w.betriebe[0];
  // erstes Speichern nach dem Laden schreibt höchstens Kopf + was die Hebung angeglichen hat
  await st.sofortSpeichern(w);
  let ab = schreibAb(a);
  await st.sofortSpeichern(w);
  assert.deepEqual(ab(), [], "nichts geändert → kein Schreiben");
  // neuer Schwund heute → genau ein Teil (laufender Monat) + Kopf
  ab = schreibAb(a);
  mu.gerichtWeg(b, b.gerichte[0], { datum: U.heute(), anzahl: 1 });
  await st.sofortSpeichern(w);
  assert.deepEqual(teilPuts(ab()), [`${b.id}|schwund|${U.heute().slice(0, 7)}`]);
  // Storno eines alten Eintrags → nur dessen Monat
  ab = schreibAb(a);
  const alt = b.schwund.find((e) => e.datum.slice(0, 7) < U.heute().slice(0, 7) && !e.storniert);
  alt.storniert = true; alt.storniertZeit = new Date().toISOString();
  await st.sofortSpeichern(w);
  assert.deepEqual(teilPuts(ab()), [`${b.id}|schwund|${alt.datum.slice(0, 7)}`]);
  // Ware umbenannt → nur das Stamm-Teil der Waren
  ab = schreibAb(a);
  b.artikel[3].packung.menge = 77;
  await st.sofortSpeichern(w);
  assert.deepEqual(teilPuts(ab()), [`${b.id}|artikel|alle`]);
  // Nur der Ladenname → kein Teil, nur der Kopf
  ab = schreibAb(a);
  b.betrieb.name = "Neu";
  await st.sofortSpeichern(w);
  const nur = ab(); assert.deepEqual(teilPuts(nur), []); assert.ok(nur.some(([s, art, k]) => s === "stand" && k === "kopf"));
  const neu = await st.laden();
  assert.equal(json(neu), json(erwartet(w)));
});

test("Tiefe Änderung an einem alten Eintrag: beim Verlassen der App (versteckt) wird ganz verglichen", async () => {
  const a = idbAttrappe(); await st.laden();
  await st.sofortSpeichern(structuredClone(jahr()));
  const w = await st.laden(); const b = w.betriebe[0];
  let spaeter = 0; const echt = Date.now; // die ganze Prüfung beim Verstecken läuft höchstens alle 5 s
  const versteckt = async () => { spaeter += 6000; Date.now = () => echt() + spaeter; globalThis.document = { visibilityState: "hidden" };
    try { await st.sofortSpeichern(w, { stempel: false }); } finally { delete globalThis.document; Date.now = echt; } };
  await versteckt(); // gleicht einmal an, was die Hebung beim Laden verändert hat (z. B. Tagesnotizen)
  const l = b.lieferungen[2]; l.zeilen[0].menge = 999; // tief im alten Eintrag, kein beobachtetes Feld
  let ab = schreibAb(a); await st.sofortSpeichern(w);
  assert.deepEqual(teilPuts(ab()), [], "normales Speichern sieht das nicht (das ist der Preis der Schnelligkeit)");
  ab = schreibAb(a); await versteckt();
  assert.deepEqual(teilPuts(ab()), [`${b.id}|lieferungen|${l.datum.slice(0, 7)}`]);
  const neu = await st.laden();
  assert.equal(neu.betriebe[0].lieferungen[2].zeilen[0].menge, 999);
});

test("Frische Einträge dieser Sitzung werden ganz verglichen (eigenen Eintrag nachbessern)", async () => {
  const a = idbAttrappe(); await st.laden();
  await st.sofortSpeichern(structuredClone(jahr()));
  const w = await st.laden(); const b = w.betriebe[0]; await st.sofortSpeichern(w);
  const r = mu.eimerEintragen(b, { kg: 2 }); await st.sofortSpeichern(w);
  const e = b.schwund.at(-1); e.menge = 3.5; // in-place, weder storniert noch erfasst
  const ab = schreibAb(a); await st.sofortSpeichern(w);
  assert.ok(r !== undefined);
  assert.deepEqual(teilPuts(ab()), [`${b.id}|schwund|${U.heute().slice(0, 7)}`]);
  assert.equal((await st.laden()).betriebe[0].schwund.at(-1).menge, 3.5);
});

test("Reihenfolge bleibt exakt, auch wenn nachgetragene Einträge alter Monate hinten stehen; entfernte Einträge verschwinden", async () => {
  const a = idbAttrappe(); await st.laden();
  const w = st.leereWurzel(); const b = st.leererBetrieb(); w.betriebe = [b]; w.aktiv = b.id;
  const e = (datum, i) => ({ id: "e" + i, datum, erfasst: datum + "T10:00:00.000Z", art: "verderb", menge: i, einheit: "kg", storniert: false });
  b.schwund = [e("2026-09-01", 1), e("2026-10-02", 2), e("2026-09-15", 3), e("2026-08-30", 4), e("2026-10-03", 5), e("2026-09-02", 6)];
  b.putzlog = [{ id: "p1", erfasst: "2026-10-01T08:00:00Z" }, { id: "p2" }]; // ohne Datum → Teil "ohne"
  await st.sofortSpeichern(w);
  let g = await st.laden();
  assert.deepEqual(g.betriebe[0].schwund.map((x) => x.id), ["e1", "e2", "e3", "e4", "e5", "e6"]);
  assert.deepEqual(g.betriebe[0].putzlog.map((x) => x.id), ["p1", "p2"]);
  // August-Eintrag entfernen → Teil August wird gelöscht
  g.betriebe[0].schwund = g.betriebe[0].schwund.filter((x) => x.id !== "e4");
  await st.sofortSpeichern(g);
  assert.equal(teile(a).has(`${b.id}|schwund|2026-08`), false);
  g = await st.laden();
  assert.deepEqual(g.betriebe[0].schwund.map((x) => x.id), ["e1", "e2", "e3", "e5", "e6"]);
  // Laden entfernen → alle seine Teile weg
  const zweiter = st.leererBetrieb(); zweiter.schwund = [e("2026-10-09", 9)]; g.betriebe.push(zweiter); await st.sofortSpeichern(g);
  assert.ok(teile(a).has(`${zweiter.id}|schwund|2026-10`));
  g.betriebe = g.betriebe.filter((x) => x.id !== zweiter.id); await st.sofortSpeichern(g);
  assert.equal([...teile(a).keys()].some((k) => k.startsWith(zweiter.id)), false);
});

test("Umzug vom alten Gesamt-Datensatz: automatisch, verlustfrei, alter Datensatz erst nach Prüfung weg", async () => {
  const a = idbAttrappe();
  const alt = structuredClone(jahr()); alt.schema = 5;
  const e = a.anlegen("gastrocalc", 1, [["stand", false], ["ereignisse", true]]);
  e.stores.get("stand").daten.set("main", structuredClone(alt));
  const w = await st.laden();
  assert.equal(json(w), json(erwartet(alt)));
  const stand = a.speicher("gastrocalc", "stand");
  assert.equal(stand.has("main"), false, "alter Datensatz nach bestätigtem Umzug gelöscht");
  assert.ok(stand.has("kopf") && teile(a).size > 50);
  assert.equal(json(await st.laden()), json(erwartet(alt)), "zweites Laden aus den Teilen");
  assert.ok([...a.speicher("gastrocalc", "ereignisse").values()].some((x) => x.art === "speicher-umzug"));
});

test("Umzug schlägt fehl → alter Datensatz bleibt und wird weiter beschrieben; nächster Start versucht es neu", async () => {
  const a = idbAttrappe();
  const alt = structuredClone(jahr());
  const e = a.anlegen("gastrocalc", 1, [["stand", false], ["ereignisse", true]]);
  e.stores.get("stand").daten.set("main", structuredClone(alt));
  a.scheitern = 1;
  const w = await st.laden();
  assert.equal(json(w), json(erwartet(alt)));
  const stand = a.speicher("gastrocalc", "stand");
  assert.ok(stand.has("main")); assert.equal(stand.has("kopf"), false); assert.equal(st._speicherInnen().altModus, true);
  w.betriebe[0].betrieb.name = "Nach Fehlschlag"; await st.sofortSpeichern(w);
  assert.equal(stand.get("main").betriebe[0].betrieb.name, "Nach Fehlschlag", "Rückfall schreibt wie bisher den Gesamt-Datensatz");
  const w2 = await st.laden(); // jetzt klappt der Umzug
  assert.equal(stand.has("main"), false); assert.equal(w2.betriebe[0].betrieb.name, "Nach Fehlschlag");
});

test("Fehlgeschlagenes Speichern: nichts halb geschrieben, das nächste Speichern schreibt alles neu", async () => {
  const a = idbAttrappe(); await st.laden();
  const w = structuredClone(jahr()); await st.sofortSpeichern(w);
  const b = w.betriebe[0];
  mu.gerichtWeg(b, b.gerichte[1], { datum: U.heute(), anzahl: 2 });
  a.scheitern = 1;
  assert.equal(await st.sofortSpeichern(w), false);
  assert.equal(st._speicherInnen().gueltig, false);
  const ab = schreibAb(a);
  assert.equal(await st.sofortSpeichern(w), true);
  assert.ok(ab().some(([s, art]) => s === "teile" && art === "clear"), "voll neu geschrieben");
  assert.equal(json(await st.laden()), json(erwartet(w)));
});

test("Sicherungsdatei: gleiches Format, Prüfsumme über die zweite Zeile, Einlesen ergibt denselben Stand", async () => {
  idbAttrappe(); await st.laden();
  const w = structuredClone(jahr()); await st.sofortSpeichern(w);
  const { blob, name, fingerabdruck } = await st.exportDatei(w);
  // W2-D: die Sicherung ist ein ZIP, darin die bisherige zweizeilige Datei
  const { zipLesen } = await import("../js/zip.js"); const z = await zipLesen(blob);
  const text = new TextDecoder().decode(await z.find((e) => e.name === st.SICHERUNG_JSON).bytes());
  const nl = text.indexOf("\n"); const kopf = JSON.parse(text.slice(0, nl)); const inhalt = text.slice(nl + 1);
  assert.deepEqual(Object.keys(kopf), ["typ", "schema", "sha256"]); assert.equal(kopf.typ, "gastrocalc-sicherung"); assert.equal(kopf.schema, st.SCHEMA);
  const sha = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(inhalt)))].map((x) => x.toString(16).padStart(2, "0")).join("");
  assert.equal(kopf.sha256, sha); assert.equal(fingerabdruck, sha.slice(0, 10));
  const d = JSON.parse(inhalt); assert.deepEqual(Object.keys(d), ["exportiert", "geraet", "fassung", "wurzel", "ereignisse"]);
  assert.match(name, /^gastrocash-test-doner-\d{4}-\d{2}-\d{2}\.zip$/);
  const imp = await st.importDatei(text);
  assert.equal(imp.pruefsumme, "ok");
  assert.equal(json(imp.wurzel), json(erwartet(d.wurzel)));
  // Zusammenführen mit sich selbst ändert nichts an den Journalen
  const lokal = await st.laden(); const vorher = lokal.betriebe[0].schwund.length;
  st.zusammenfuehren(lokal, imp.wurzel);
  assert.equal(lokal.betriebe[0].schwund.length, vorher);
  await st.sofortSpeichern(lokal);
  assert.equal((await st.laden()).betriebe[0].schwund.length, vorher);
  // verändertes Byte → Abweichung erkannt
  const kaputt = text.replace('"Test Döner"', '"Test Doener"');
  assert.equal((await st.importDatei(kaputt)).pruefsumme, "abweichung");
});

test("Leerlauf-Prüfung findet tiefe Änderungen an alten Einträgen und speichert sie nach", async () => {
  // Paket 2 (16.10.2026): der Leerlauf wird jetzt auch ohne requestIdleCallback geplant (Rückfall setTimeout), darum steht der
  // Idle-Callback hier vor dem ersten Speichern und die Uhr springt vor der zweiten Prüfung über den Mindestabstand (60 s).
  const a = idbAttrappe(); await st.laden();
  globalThis.requestIdleCallback = (fn) => setTimeout(() => fn({ timeRemaining: () => 50, didTimeout: false }), 0);
  const echt = Date.now;
  try {
    const w = structuredClone(jahr()); await st.sofortSpeichern(w);
    await new Promise((r) => setTimeout(r, 50)); // erste Leerlauf-Prüfung (nichts anders) durchlaufen lassen
    const b = w.betriebe[0]; const l = b.lieferungen[5];
    Date.now = () => echt() + 61e3;
    l.zeilen[1].einzelpreis = 0.01; // tief, kein beobachtetes Feld
    b.betrieb.name = "Anstoß"; // sorgt für ein Speichern, nach dem der Leerlauf geplant wird
    const ab = schreibAb(a);
    await st.sofortSpeichern(w);
    await new Promise((r) => setTimeout(r, 1400)); // Leerlauf-Stücke + verzögertes Speichern (900 ms)
    assert.ok(teilPuts(ab()).includes(`${b.id}|lieferungen|${l.datum.slice(0, 7)}`));
    assert.equal((await st.laden()).betriebe[0].lieferungen[5].zeilen[1].einzelpreis, 0.01);
  } finally { delete globalThis.requestIdleCallback; Date.now = echt; }
});

test("Paket 2: ohne requestIdleCallback (Safari) läuft die Leerlauf-Prüfung über den setTimeout-Rückfall", async () => {
  const a = idbAttrappe(); await st.laden();
  assert.equal(typeof globalThis.requestIdleCallback, "undefined");
  const w = structuredClone(jahr()); await st.sofortSpeichern(w); // plant den Rückfall (erstes Stück nach 1 s)
  const b = w.betriebe[0]; const l = b.lieferungen[7];
  l.zeilen[0].menge = 4321; // tief, kein beobachtetes Feld
  const ab = schreibAb(a);
  await new Promise((r) => setTimeout(r, 4500)); // Rückfall-Stücke (8 ms Budget, alle 200 ms) + verzögertes Speichern
  assert.ok(teilPuts(ab()).includes(`${b.id}|lieferungen|${l.datum.slice(0, 7)}`), "Rückfall hat die tiefe Änderung gefunden und nachgeschrieben");
  assert.equal((await st.laden()).betriebe[0].lieferungen[7].zeilen[0].menge, 4321);
});

test("allesLoeschen leert Kopf, Teile und Ereignisse", async () => {
  const a = idbAttrappe(); await st.laden();
  const w = st.leereWurzel(); const b = st.leererBetrieb(); b.schwund = [{ id: "x", datum: "2026-10-01", erfasst: "2026-10-01T00:00:00Z" }]; w.betriebe = [b]; w.aktiv = b.id;
  await st.sofortSpeichern(w);
  assert.ok(teile(a).size > 0);
  await st.allesLoeschen();
  assert.equal(teile(a).size, 0); assert.equal(a.speicher("gastrocalc", "stand").size, 0);
  assert.equal((await st.laden()).betriebe.length, 0);
});
