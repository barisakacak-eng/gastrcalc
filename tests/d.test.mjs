// Welle 2, Entwickler D (15.10.2026): Laden robust, Sicherung als ZIP mit Fotos, Abgleich je Bereich, HACCP-Schutz beim Einlesen,
// eindeutige Belehrungen, zentrale Zurücksetzer, Fassungsnummer.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { idbAttrappe } from "./hilfe/idb_attrappe.mjs";
import { jahresStand } from "./hilfe/jahr.mjs";
const st = await import("../js/store.js");
const zip = await import("../js/zip.js");
const amt = await import("../js/export_amt.js");

const TAG = 86400e3;
let JAHR = null; const jahr = () => (JAHR ??= jahresStand(365));
const laden1 = () => { const b = st.leererBetrieb(); b.phase = "app"; b.betrieb.name = "Nord"; return b; };

// ---------- 1. Laden robust ----------
test("Ein fehlendes Monatsteil: alles andere lädt, gemeldet wird welcher Monat/welches Journal", async () => {
  const a = idbAttrappe(); await st.laden();
  const w = structuredClone(jahr()); await st.sofortSpeichern(w, { stempel: false });
  const teile = a.speicher("gastrocalc", "teile");
  const key = [...teile.keys()].find((k) => k.includes("|messungen|"));
  const weg = teile.get(key).n; teile.delete(key);
  const g = await st.laden();
  assert.equal(st.speicherVerfuegbar(), true, "Speicher bleibt verfügbar");
  assert.equal(g.betriebe.length, 1, "Laden ist da – keine leere Einrichtung");
  assert.equal(g.betriebe[0].messungen.length, w.betriebe[0].messungen.length - weg, "nur die Einträge dieses Monats fehlen");
  assert.equal(g.betriebe[0].schwund.length, w.betriebe[0].schwund.length, "andere Journale vollständig");
  const p = st.ladeProbleme().fehlt; assert.equal(p.length, 1); assert.equal(p[0].journal, "messungen"); assert.equal(p[0].monat, key.split("|")[2]);
  assert.equal(g.ladeFehler.length, 1, "Meldung bleibt in der Wurzel (Büro)");
  // kaputtes Teil (unlesbar) wird übersprungen, aber nicht gelöscht
  const k2 = [...teile.keys()].find((k) => k.includes("|schwund|")); teile.set(k2, { ...teile.get(k2), t: "{kaputt" });
  const g2 = await st.laden(); assert.equal(g2.betriebe.length, 1); assert.ok(st.ladeProbleme().fehlt.some((x) => x.journal === "schwund" && x.grund === "kaputt"));
  await st.sofortSpeichern(g2); assert.ok(teile.has(k2), "kaputtes Teil bleibt liegen");
});

test("Kopf unlesbar: Läden werden aus den Teilen gerettet statt leerer Einrichtung", async () => {
  const a = idbAttrappe(); await st.laden();
  const w = structuredClone(jahr()); await st.sofortSpeichern(w, { stempel: false });
  const stand = a.speicher("gastrocalc", "stand"); stand.set("kopf", { ...stand.get("kopf"), wurzel: "{kaputt" });
  const g = await st.laden();
  assert.equal(g.betriebe.length, 1); assert.equal(g.betriebe[0].id, w.betriebe[0].id);
  assert.equal(g.betriebe[0].messungen.length, w.betriebe[0].messungen.length);
  assert.ok(g.ladeFehler.some((x) => x.journal === "kopf"));
});

test("Alles löschen meldet, ob wirklich gelöscht wurde", async () => {
  idbAttrappe(); await st.laden();
  assert.equal(await st.allesLoeschen(), true);
});

// ---------- 2. ZIP ----------
test("ZIP ohne Kompression: schreiben, lesen, CRC32 prüft", async () => {
  assert.equal(zip.crc32(new TextEncoder().encode("123456789")), 0xcbf43926, "Prüfwert aus der ZIP-Norm");
  const foto = new Blob([new Uint8Array([1, 2, 3, 250])], { type: "image/jpeg" });
  const b = await zip.zipBlob([{ name: "a.json", daten: "{\"x\":1}" }, { name: "ablage/d-1", daten: foto }]);
  assert.equal(await zip.istZip(b), true);
  const e = await zip.zipLesen(b);
  assert.deepEqual(e.map((x) => x.name), ["a.json", "ablage/d-1"]);
  assert.equal(new TextDecoder().decode(await e[0].bytes()), "{\"x\":1}");
  assert.deepEqual([...await e[1].bytes()], [1, 2, 3, 250]); assert.equal(await e[1].crcOk(), true);
  // ein Byte im Foto kippen → CRC falsch
  const roh = new Uint8Array(await b.arrayBuffer()); const i = roh.indexOf(250); roh[i] = 251;
  const e2 = await zip.zipLesen(new Blob([roh])); assert.equal(await e2[1].crcOk(), false);
});

test("Sicherung: ZIP mit JSON und Fotos; Einlesen nimmt ZIP und alte JSON, Fotos zurück in die Ablage", async () => {
  idbAttrappe(); await st.laden();
  const w = st.leereWurzel(); const b = laden1(); w.betriebe.push(b); w.aktiv = b.id;
  const { blob, name, groesse } = await st.exportDatei(w);
  assert.match(name, /\.zip$/); assert.equal(groesse, blob.size);
  const r = await st.importSicherung(blob); assert.equal(r.zip, true); assert.equal(r.pruefsumme, "ok"); assert.equal(r.wurzel.betriebe[0].betrieb.name, "Nord");
  // ZIP mit einem Foto von Hand: zurücklegen, vorhandene überspringen, kaputte zählen
  const json = new TextDecoder().decode(await (await zip.zipLesen(blob)).find((e) => e.name === st.SICHERUNG_JSON).bytes());
  const mitFoto = await zip.zipBlob([{ name: st.SICHERUNG_JSON, daten: json }, { name: "ablage.json", daten: JSON.stringify({ "d-x1": { typ: "image/jpeg" } }) }, { name: "ablage/d-x1", daten: new Uint8Array([9, 9, 9]) }]);
  const r2 = await st.importSicherung(mitFoto); assert.equal(r2.ablage.length, 1); assert.equal(r2.ablage[0].typ, "image/jpeg");
  const abgelegt = new Map(); const zurueck = async (id, bl) => { if (abgelegt.has(id)) return false; abgelegt.set(id, bl); return true; };
  assert.deepEqual(await st.ablageAusSicherung(r2.ablage, zurueck), { neu: 1, kaputt: 0, da: 0 });
  assert.deepEqual(await st.ablageAusSicherung(r2.ablage, zurueck), { neu: 0, kaputt: 0, da: 1 });
  assert.equal(abgelegt.get("d-x1").type, "image/jpeg");
  // alte JSON-Datei geht weiter
  const alt = await st.importSicherung(new Blob([json])); assert.equal(alt.zip, false); assert.equal(alt.pruefsumme, "ok");
});

// ---------- 3. Abgleich je Bereich ----------
test("p10 K1: Miete auf Handy A geändert, Umsatz auf Handy B → beim Zusammenführen bleibt die neue Miete", async () => {
  idbAttrappe(); await st.laden();
  const wA = st.leereWurzel(); const a = laden1(); a.kosten = [{ id: "k1", kategorie: "miete", posten: "miete", betrag: 2000, status: "bekannt", periode: "monat", basis: "netto" }];
  wA.betriebe.push(a); wA.aktiv = a.id; await st.sofortSpeichern(wA); // erster Fingerabdruck
  const wB = st.leereWurzel(); st.zusammenfuehren(wB, structuredClone(wA)); // B holt sich die Datei von A
  a.kosten[0].betrag = 2500; await st.sofortSpeichern(wA);
  assert.ok(a.stammZeit?.kosten, "Kosten-Zeitstempel aus dem Inhalt erkannt");
  assert.equal(a.stammZeit.betrieb, undefined, "andere Bereiche ohne Zeitstempel");
  const b = wB.betriebe[0]; b.tagesnotizen.push({ id: "n1", datum: "2026-10-15", umsatz: 850, erfasst: new Date(Date.now() + 3600e3).toISOString() }); b.geaendert = new Date(Date.now() + 3600e3).toISOString();
  st.zusammenfuehren(wA, structuredClone(wB));
  assert.equal(wA.betriebe[0].kosten[0].betrag, 2500, "Chef-Änderung bleibt");
  assert.equal(wA.betriebe[0].tagesnotizen.length, 1, "Umsatz kommt dazu");
});

test("Abgleich: nur fremd geändert → fremd; beide geändert → eigener Stand + Hinweis; Zeit in der Zukunft zählt als jetzt", () => {
  const jetzt = Date.parse("2026-10-15T12:00:00Z");
  const a = laden1(); a.betrieb.name = "A"; const b0 = structuredClone(a);
  const w = st.leereWurzel(); w.betriebe.push(a); w.aktiv = a.id;
  // erster Abgleich mit gleicher Seite legt die Grundlage
  st.zusammenfuehren(w, { betriebe: [structuredClone(b0)] }, { jetzt });
  const fremd = structuredClone(b0); fremd.betrieb.name = "Fremd"; fremd.stammZeit = { betrieb: "2026-10-15T13:00:00Z" };
  st.zusammenfuehren(w, { betriebe: [structuredClone(fremd)] }, { jetzt });
  assert.equal(w.betriebe[0].betrieb.name, "Fremd", "lokal unverändert → fremde Änderung kommt");
  w.betriebe[0].betrieb.name = "Lokal neu"; const fremd2 = structuredClone(fremd); fremd2.betrieb.name = "Fremd neu";
  const r = st.zusammenfuehren(w, { betriebe: [fremd2] }, { jetzt });
  assert.equal(w.betriebe[0].betrieb.name, "Lokal neu", "beide geändert → eigener Stand bleibt");
  assert.deepEqual(r.bericht.beide, ["betrieb"]); assert.deepEqual(w.betriebe[0].abgleichHinweis.bereiche, ["betrieb"]);
  // dieselbe Datei noch einmal: kein neuer Hinweis, nichts überschrieben
  const r2 = st.zusammenfuehren(w, { betriebe: [structuredClone(fremd2)] }, { jetzt });
  assert.equal(w.betriebe[0].betrieb.name, "Lokal neu"); assert.deepEqual(r2.bericht.beide, []);
  // ohne Grundlage: Uhr im Jahr 2030 gewinnt nicht gegen eine echte jüngere Änderung
  const x = laden1(); x.stammZeit = { kosten: "2026-10-15T11:59:00Z" }; x.kosten = [{ id: "k", kategorie: "miete", posten: "miete", betrag: 1, status: "bekannt", periode: "monat", basis: "netto" }];
  const y = structuredClone(x); y.kosten[0].betrag = 9; y.stammZeit = { kosten: "2030-01-01T00:00:00Z" };
  assert.equal(st.zeitKappen("2030-01-01T00:00:00Z", jetzt), new Date(jetzt).toISOString());
  assert.equal(st.verschmelzen(x, y, { jetzt }).kosten[0].betrag, 9, "Zukunft = jetzt, also jünger als 11:59");
  x.stammZeit.kosten = "2026-10-15T12:00:30Z"; // lokal nach „jetzt“ (innerhalb eines Tages) → lokal ist jünger
  assert.equal(st.verschmelzen(x, y, { jetzt }).kosten[0].betrag, 1);
});

// ---------- 4. HACCP-Einträge ----------
test("Einlesen ändert keine vorhandenen HACCP-Einträge; Zukunftsdaten werden nicht übernommen", () => {
  const jetzt = Date.parse("2026-10-15T12:00:00Z");
  const a = laden1(); a.messungen = [{ id: "m1", stelle: "k", datum: "2026-10-14", zeit: "2026-10-14T06:00:00Z", wert: 4, storniert: false }];
  const f = structuredClone(a); f.messungen[0].wert = 2; // bearbeitete Sicherung
  f.messungen.push({ id: "m2", stelle: "k", datum: "2026-10-20", zeit: "2026-10-20T06:00:00Z", wert: 3 }); // Zukunft
  f.putzlog = [{ id: "p1", aufgabe: "x", datum: "2026-10-15", erfasst: "2026-10-15T08:00:00Z" }];
  const m = st.verschmelzen(a, f, { jetzt });
  assert.equal(m.messungen.find((x) => x.id === "m1").wert, 4, "eigener Wert bleibt");
  const k = m.messungen.find((x) => x.konfliktMit === "m1"); assert.ok(k); assert.equal(k.wert, 2); assert.equal(k.quelle, "sicherung"); assert.equal(k.importiert, true);
  assert.equal(m.messungen.some((x) => x.id === "m2"), false, "Datum in der Zukunft nicht übernommen");
  assert.equal(m.putzlog.length, 1, "neue Einträge kommen dazu");
  assert.deepEqual([m.abgleichHinweis.zukunft, m.abgleichHinweis.konflikte], [1, 1]);
  // erlaubt bleibt: Storno und nachgetragener Wert
  const f2 = structuredClone(a); f2.messungen[0].storniert = true; f2.messungen[0].storniertZeit = "2026-10-15T09:00:00Z";
  const m2 = st.verschmelzen(a, f2, { jetzt }); assert.equal(m2.messungen.length, 1); assert.equal(m2.messungen[0].storniert, true);
  // zweimal dieselbe bearbeitete Datei: nur eine Kopie
  const m3 = st.verschmelzen(m, f, { jetzt }); assert.equal(m3.messungen.filter((x) => x.konfliktMit === "m1").length, 1);
});

// ---------- 5. Belehrungen ----------
test("Belehrung storniert und neu eingetragen am selben Tag: nach dem Zusammenführen weiter ok; alte Doppel-Kennungen werden eindeutig", () => {
  const a = laden1(); a.personen = [{ id: "p1", kuerzel: "BA", aktiv: true, entfernt: false }];
  const e1 = amt.belehrungEintragen(a, "p1", { datum: "2026-10-01", art: "erst", bisHeute: "2026-10-15" });
  amt.belehrungEntfernen(a, "p1", "2026-10-01", "erst");
  const e2 = amt.belehrungEintragen(a, "p1", { datum: "2026-10-01", art: "erst", bisHeute: "2026-10-15" });
  assert.notEqual(e1.id, e2.id);
  const m = st.verschmelzen(a, structuredClone(a));
  assert.equal(amt.belehrungen(m, { datum: "2026-10-15" }).zeilen[0].status, "ok");
  // Schema 5: zwei Einträge mit derselben Kennung → Migration macht sie eindeutig, auf jedem Handy gleich
  const alt = { schema: 5, betriebe: [{ id: "x", belehrungen: [{ id: "bel-p1-2026-10-01-erst", person: "p1", datum: "2026-10-01", art: "erst", storniert: true }, { id: "bel-p1-2026-10-01-erst", person: "p1", datum: "2026-10-01", art: "erst", storniert: false }] }] };
  const w1 = st.migrierenWurzel(structuredClone(alt)), w2 = st.migrierenWurzel(structuredClone(alt));
  const ids = w1.betriebe[0].belehrungen.map((b) => b.id);
  assert.equal(new Set(ids).size, 2); assert.deepEqual(ids, w2.betriebe[0].belehrungen.map((b) => b.id));
  assert.equal(st.SCHEMA, 6); assert.ok(st.JOURNALE.includes("belehrungen"));
});

// ---------- 6./8. Zurücksetzer und Fassung ----------
test("Ladenwechsel: jeder *Zuruecksetzen-Export aus js/screens steht in der zentralen Liste in app.js", () => {
  const app = fs.readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  const liste = app.slice(app.indexOf("const ZURUECKSETZER = ["), app.indexOf("];", app.indexOf("const ZURUECKSETZER = [")));
  const dir = new URL("../js/screens/", import.meta.url); const fehlt = [];
  for (const f of fs.readdirSync(dir)) {
    const src = fs.readFileSync(new URL(f, dir), "utf8");
    for (const m of src.matchAll(/export (?:function|const) (\w+Zuruecksetzen)\b/g)) if (!new RegExp("\\b" + m[1] + "\\b").test(liste)) fehlt.push(f + ":" + m[1]);
  }
  assert.deepEqual(fehlt, []);
  assert.match(app, /if \(stand && stand\.id !== id\) alleZuruecksetzen\(\)/);
});

test("Fassungsnummer: js/fassung.js trägt dieselbe Nummer wie sw.js", async () => {
  const sw = fs.readFileSync(new URL("../sw.js", import.meta.url), "utf8");
  const { FASSUNG } = await import("../js/fassung.js");
  assert.equal(sw.match(/const V = "([^"]+)"/)[1], FASSUNG); assert.equal(st.APP_FASSUNG, FASSUNG);
});

// ---------- 9. Leistung Büro-Start ----------
test("Inventur-Kurzwert wie inventurWert", async () => {
  const S = await import("../js/export_steuer.js"); const I = await import("../js/inventur.js");
  const s = jahr().betriebe[0];
  void S; // Kurzrechnung entfällt: Ordner-Kachel rechnet das volle Paket einmal je Bild (W2-T-Regeln)
  let n = 0;
  for (const inv of I.inventurenFertig(s)) { const w = I.inventurWert(s, inv), k = I.inventurKurz(inv); if (!k) continue; n += 1;
    assert.ok(Math.abs(k.summe - w.summe) < 1e-6); assert.equal(k.gezaehlt, w.gezaehlt); assert.deepEqual([...k.ohnePreis].sort(), [...w.ohnePreis].sort()); }
  assert.ok(n > 0, "Testdaten enthalten abgeschlossene Inventuren");
});

// Gremium 2 (24.10.2026): Hinweis-Status zweier Handys wird je Karte vereinigt, jüngste Zeit gewinnt (Vertrag Abschnitt 2)
test("verschmelzen vereinigt betrieb.hinweise je Karte, auch wenn der Bereich betrieb vom anderen Handy kommt", () => {
  const jetzt = Date.parse("2026-10-24T12:00:00Z");
  const a = laden1(); a.betrieb.hinweise = [{ id: "gwg", status: "erledigt", zeit: "2026-10-24T08:00:00Z" }, { id: "belehrung", status: "spaeter", zeit: "2026-10-24T07:00:00Z" }];
  a.stammZeit = { betrieb: "2026-10-24T08:00:00Z" };
  const b = structuredClone(a); b.betrieb.name = "B"; b.betrieb.hinweise = [{ id: "berufskleidung", status: "erledigt", zeit: "2026-10-24T09:00:00Z" }, { id: "belehrung", status: "erledigt", zeit: "2026-10-24T09:30:00Z" }];
  b.stammZeit = { betrieb: "2026-10-24T09:30:00Z" };
  const m = st.verschmelzen(a, b, { jetzt });
  assert.equal(m.betrieb.name, "B");
  const st2 = Object.fromEntries(m.betrieb.hinweise.map((h) => [h.id, h.status]));
  assert.deepEqual(st2, { belehrung: "erledigt", berufskleidung: "erledigt", gwg: "erledigt" });
  // kaputte Daten beim Laden: migrierenBetrieb räumt auf
  const k = laden1(); k.betrieb.hinweise = "x"; k.betrieb.rechtsform = "ag"; st.migrierenBetrieb(k);
  assert.deepEqual(k.betrieb.hinweise, []); assert.equal(k.betrieb.rechtsform, undefined);
});
