// Speicher-Schema: Hebung von Schema 1, Zusammenführen von Sicherungen, Schutz vor fremden Kennungen.
import { test } from "node:test";
import assert from "node:assert/strict";
globalThis.indexedDB = undefined;
const { migrierenWurzel, zusammenfuehren, importDatei, leererBetrieb, SCHEMA } = await import("../js/store.js");

const alt = () => ({ schema: 1, id: "alt-1", phase: "app", schritt: 21, sprache: "tr",
  betrieb: { name: "Altes Bistro", format: "bistro", kuechen: ["bistro", "quatsch"], tageProWoche: 6, monate: 12 },
  kosten: [{ id: "k1", kategorie: "miete", posten: "miete", betrag: 900, status: "bekannt", periode: "monat" }, { kaputt: true }] });

test("Schema 1 wird zu einer Wurzel mit einem Laden gehoben", () => {
  const w = migrierenWurzel(alt());
  assert.equal(w.schema, SCHEMA); assert.equal(w.sprache, "tr"); assert.equal(w.betriebe.length, 1);
  assert.equal(w.aktiv, "alt-1"); assert.equal(w.betriebe[0].schema, undefined);
  assert.equal(w.betriebe[0].kosten.length, 1, "kaputter Posten fliegt raus");
  assert.equal(w.betriebe[0].betrieb.format, null, "unbekanntes Format wird geleert");
  assert.deepEqual(w.betriebe[0].betrieb.kuechen, ["bistro"], "unbekannte Küche fliegt raus");
  assert.ok(Array.isArray(w.betriebe[0].schwund) && Array.isArray(w.betriebe[0].tagesnotizen));
});

test("Zusammenführen: gleiche Kennung ersetzt, neue kommt dazu, aktiver Laden bleibt", () => {
  const a = leererBetrieb(); a.betrieb.name = "A"; const b = leererBetrieb(); b.betrieb.name = "B";
  const w = { schema: 2, sprache: "de", aktiv: a.id, betriebe: [a, b] };
  const a2 = structuredClone(a); a2.betrieb.name = "A neu"; const c = leererBetrieb(); c.betrieb.name = "C";
  const r = zusammenfuehren(w, { schema: 2, sprache: "en", aktiv: c.id, betriebe: [a2, c] });
  assert.deepEqual(r, { ersetzt: 1, neu: 1 });
  assert.deepEqual(w.betriebe.map((x) => x.betrieb.name), ["A neu", "B", "C"]);
  assert.equal(w.aktiv, a.id); assert.equal(w.sprache, "de", "vorhandene Sprache bleibt");
});

test("Import: alte und neue Dateien, Fremdes wird abgewiesen", async () => {
  const altDatei = JSON.stringify({ typ: "gastrocalc-sicherung", schema: 1, stand: alt(), ereignisse: [{ art: "x" }] });
  const r = await importDatei(altDatei); assert.equal(r.wurzel.betriebe[0].betrieb.name, "Altes Bistro"); assert.equal(r.ereignisse.length, 1); assert.equal(r.pruefsumme, "fehlt");
  await assert.rejects(() => importDatei("kein json"), (e) => e.grund === "format");
  await assert.rejects(() => importDatei(JSON.stringify({ typ: "anders" })), (e) => e.grund === "format");
  await assert.rejects(() => importDatei(JSON.stringify({ typ: "gastrocalc-sicherung", schema: 99, wurzel: {} })), (e) => e.grund === "neuer");
  // Schema 3: zwei Zeilen mit Prüfsumme
  const inhalt = JSON.stringify({ wurzel: { schema: 3, betriebe: [alt()] }, ereignisse: [] });
  const sha = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(inhalt)))].map((b) => b.toString(16).padStart(2, "0")).join("");
  const ok = await importDatei(JSON.stringify({ typ: "gastrocalc-sicherung", schema: 3, sha256: sha }) + "\n" + inhalt);
  assert.equal(ok.pruefsumme, "ok"); assert.equal(ok.wurzel.betriebe[0].betrieb.name, "Altes Bistro");
  const kaputt = await importDatei(JSON.stringify({ typ: "gastrocalc-sicherung", schema: 3, sha256: sha }) + "\n" + inhalt.replace("Altes", "Neues"));
  assert.equal(kaputt.pruefsumme, "abweichung");
  await assert.rejects(() => importDatei(JSON.stringify({ typ: "gastrocalc-sicherung", schema: 9, sha256: sha }) + "\n" + inhalt), (e) => e.grund === "neuer");
});

test("Dieselbe Schema-1-Datei zweimal eingelesen ersetzt, statt zu verdoppeln", async () => {
  const w = migrierenWurzel({ schema: 2, betriebe: [] });
  const r1 = zusammenfuehren(w, (await importDatei(JSON.stringify({ typ: "gastrocalc-sicherung", schema: 1, stand: alt() }))).wurzel);
  const r2 = zusammenfuehren(w, (await importDatei(JSON.stringify({ typ: "gastrocalc-sicherung", schema: 1, stand: alt() }))).wurzel);
  assert.deepEqual([r1, r2], [{ ersetzt: 0, neu: 1 }, { ersetzt: 1, neu: 0 }]); assert.equal(w.betriebe.length, 1);
});

test("Schwund-Einträge ohne Datum fliegen beim Laden raus", () => {
  const s = alt(); s.schwund = [{ id: "e1", datum: "2026-10-01", art: "verderb" }, { id: "e2", art: "verderb" }];
  assert.equal(migrierenWurzel(s).betriebe[0].schwund.length, 1);
});

test("Verschmelzen: Einträge beider Seiten bleiben, Rücknahme gewinnt, jüngerer Stand liefert die Karte", async () => {
  const { verschmelzen } = await import("../js/store.js");
  const a = leererBetrieb(); a.betrieb.name = "Alt"; a.geaendert = "2026-10-01T10:00:00Z";
  a.schwund = [{ id: "e1", datum: "2026-10-01", art: "verderb", menge: 1 }, { id: "e2", datum: "2026-10-01", art: "bruch", menge: 1, storniert: true }];
  a.tagesnotizen = [{ id: "n1", datum: "2026-10-01", umsatz: 100, erfasst: "2026-10-01T20:00:00Z" }];
  const b = structuredClone(a); b.betrieb.name = "Neu"; b.geaendert = "2026-10-05T10:00:00Z";
  b.schwund = [{ id: "e2", datum: "2026-10-01", art: "bruch", menge: 1 }, { id: "e3", datum: "2026-10-03", art: "verderb", menge: 2 }];
  b.tagesnotizen = [{ id: "n1", datum: "2026-10-01", umsatz: 100, erfasst: "2026-10-01T20:00:00Z" }, { id: "n2", datum: "2026-10-03", umsatz: 300, erfasst: "2026-10-03T20:00:00Z" }];
  a.messungen = [{ id: "m1", stelle: "k1", datum: "2026-10-01", zeit: "2026-10-01T06:00:00Z", wert: 4 }];
  b.messungen = [{ id: "m2", stelle: "k1", datum: "2026-10-02", zeit: "2026-10-02T06:00:00Z", wert: 5 }];
  a.personen = [{ id: "p1", kuerzel: "MU", aktiv: true, entfernt: true }]; b.personen = [{ id: "p1", kuerzel: "Murat", aktiv: true, entfernt: false }];
  const m = verschmelzen(a, b);
  assert.equal(m.betrieb.name, "Neu");
  assert.deepEqual(m.schwund.map((e) => e.id).sort(), ["e1", "e2", "e3"]);
  assert.equal(m.schwund.find((e) => e.id === "e2").storniert, true);
  assert.equal(m.tagesnotizen.length, 2, "Notizen vereinigt nach Kennung");
  assert.deepEqual(m.messungen.map((x) => x.id), ["m1", "m2"], "Messungen beider Seiten bleiben");
  assert.equal(m.personen[0].entfernt, true, "Löschmarke gewinnt");
  const m2 = verschmelzen(b, a); assert.equal(m2.betrieb.name, "Neu", "Reihenfolge egal");
});

test("Abnahme Posten 1: Pseudonym bleibt beim Zusammenführen; laufende Nummer fällt nie unter das eigene Maximum; CRLF am Ende", async () => {
  const { verschmelzen, zusammenfuehren, importDatei, leererBetrieb, leereWurzel } = await import("../js/store.js");
  const a = leererBetrieb(); a.personen = [{ id: "p1", kuerzel: "Person 1", aktiv: false, entfernt: true }];
  const b = structuredClone(a); b.personen = [{ id: "p1", kuerzel: "Ayşe", aktiv: true, entfernt: false }]; b.geaendert = "2030-01-01T00:00:00Z";
  assert.equal(verschmelzen(a, b).personen[0].kuerzel, "Person 1"); assert.equal(verschmelzen(b, a).personen[0].kuerzel, "Person 1");
  const w = leereWurzel(); const bb = leererBetrieb(); bb.messungen = [{ id: "m1", stelle: "k", datum: "2026-10-01", zeit: "2026-10-01T06:00:00Z", wert: 4, lfd: 7, geraet: w.geraet }]; w.betriebe.push(bb); w.aktiv = bb.id;
  zusammenfuehren(w, { schema: 3, geraet: "x", lfd: 99, betriebe: [] }); assert.equal(w.lfd, 7);
  const inhalt = JSON.stringify({ wurzel: { schema: 3, betriebe: [] }, ereignisse: [] });
  const sha = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(inhalt)))].map((x) => x.toString(16).padStart(2, "0")).join("");
  const r = await importDatei(JSON.stringify({ typ: "gastrocalc-sicherung", schema: 3, sha256: sha }) + "\r\n" + inhalt + "\r\n\r\n");
  assert.equal(r.pruefsumme, "ok");
});

// ---------- Schwadron 18.10.2026 (30-Tage-Lauf): H3 ----------
test("Schwadron H3: Rundgang dieser Sitzung gegen dieselbe Kennung aus der Sicherung ist kein Konflikt; alte Doppel verschwinden beim Laden", async () => {
  const st = await import("../js/store.js"); const E = await import("../js/engine.js"); const stamm = await import("../js/stamm.js");
  const w = st.leereWurzel(); const s = st.leererBetrieb(); s.phase = "app"; w.betriebe.push(s); w.aktiv = s.id;
  const k = stamm.kuehlstelleAnlegen(s, { name: "Kühlschrank", art: "kuehl" }); stamm.kuehlEingerichtetSetzen(s);
  const heute = E.tagPlus(new Date().toISOString().slice(0, 10), -1);
  const r = E.rundgangStarten(s, { datum: heute }); E.stationEintragen(r, k, { wert: 4.1 }); E.rundgangAbschliessen(s, r, () => st.naechsteLfd(w), w.geraet);
  assert.equal(s.rundgaenge[0].messungen.length, 1, "im Speicher dieser Sitzung: volle Kopie");
  const sicherung = structuredClone(w); st.migrierenBetrieb(sicherung.betriebe[0]); // wie importSicherung: Kopie wird beim Laden geleert
  assert.equal(sicherung.betriebe[0].rundgaenge[0].messungen.length, 0);
  const b = st.zusammenfuehren(w, sicherung).bericht;
  assert.equal(b.konflikte, 0); assert.equal(w.betriebe[0].rundgaenge.length, 1); assert.equal(w.betriebe[0].abgleichHinweis ?? null, null);
  // Altbestand: Doppel mit quelle "sicherung" aus dem früheren Fehler → beim Laden entfernt, Hinweis zurückgezählt, zweimal laden ändert nichts
  const x = w.betriebe[0]; const orig = x.rundgaenge[0];
  x.rundgaenge.push({ ...structuredClone(orig), messungen: [], id: orig.id + "~sabc", quelleVorher: orig.quelle ?? null, quelle: "sicherung", importiert: true, konfliktMit: orig.id });
  x.abgleichHinweis = { zeit: new Date().toISOString(), bereiche: [], zukunft: 0, konflikte: 1 };
  const m1 = st.migrierenBetrieb(structuredClone(x)); assert.equal(m1.rundgaenge.length, 1); assert.equal(m1.abgleichHinweis, undefined);
  const m2 = st.migrierenBetrieb(structuredClone(m1)); assert.deepEqual(m2.rundgaenge, m1.rundgaenge);
  // Ein echter Konflikt (anderer Inhalt) bleibt stehen
  const y = structuredClone(x); y.rundgaenge[1].von = "jemand-anders";
  assert.equal(st.migrierenBetrieb(y).rundgaenge.length, 2);
});
