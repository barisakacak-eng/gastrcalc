// E5 (16.10.2026): Passwort für die Sicherungsdatei – Rundreise, falsches Passwort, Datei ohne Passwort byteidentisch,
// importSicherung erkennt sicherung.enc. Reine Logik (schluessel.js, store.js), kein DOM.
import { test } from "node:test";
import assert from "node:assert/strict";
import { idbAttrappe } from "./hilfe/idb_attrappe.mjs";
const K = await import("../js/schluessel.js");
const st = await import("../js/store.js");
const zip = await import("../js/zip.js");

const laden1 = () => { const b = st.leererBetrieb(); b.phase = "app"; b.betrieb.name = "Nord"; return b; };
const bytes = async (blob) => new Uint8Array(await blob.arrayBuffer());

test("E5: verschlüsseln → entschlüsseln liefert dieselben Bytes; Kopf GCS1 + Salz 16 + IV 12, jedes Mal anderes Salz", async () => {
  const klar = new TextEncoder().encode("Döner 4,50 € – Umsatz 1234,56");
  const a = await K.verschluesseln(klar, "geheim123"); const b = await K.verschluesseln(klar, "geheim123");
  assert.equal(new TextDecoder().decode(a.subarray(0, 4)), "GCS1");
  assert.equal(a.length, 4 + 16 + 12 + klar.length + 16, "Chiffretext = Klartext + 16 Byte GCM-Anhang");
  assert.notDeepEqual([...a.subarray(4, 20)], [...b.subarray(4, 20)], "Salz zufällig");
  assert.notDeepEqual([...a.subarray(20, 32)], [...b.subarray(20, 32)], "IV zufällig");
  assert.equal(K.istVerschluesselt(a), true); assert.equal(K.istVerschluesselt(klar), false);
  assert.deepEqual([...await K.entschluesseln(a, "geheim123")], [...klar]);
  assert.deepEqual([...await K.entschluesseln(b, "geheim123")], [...klar]);
});

test("E5: falsches Passwort, zu kurzes Passwort, gekippte Bytes → Fehler mit grund, kein Absturz", async () => {
  const klar = new Uint8Array([1, 2, 3, 4, 5]);
  const enc = await K.verschluesseln(klar, "richtig1");
  await assert.rejects(K.entschluesseln(enc, "falsch12"), (e) => e.grund === "passwort");
  await assert.rejects(K.entschluesseln(enc, ""), (e) => e.grund === "passwort");
  await assert.rejects(K.verschluesseln(klar, "kurz"), (e) => e.grund === "zuKurz");
  await assert.rejects(K.entschluesseln(klar, "richtig1"), (e) => e.grund === "format");
  const kaputt = new Uint8Array(enc); kaputt[kaputt.length - 1] ^= 0xff;
  await assert.rejects(K.entschluesseln(kaputt, "richtig1"), (e) => e.grund === "passwort");
  assert.equal(K.passwortGueltig("abcdef"), true); assert.equal(K.passwortGueltig("abcde"), false); assert.equal(K.passwortGueltig(null), false);
});

test("E5: exportDatei ohne Passwort ist byteidentisch mit dem bisherigen Export (ZIP aus JSON + ablage.json, gleicher Name)", async () => {
  idbAttrappe(); await st.laden();
  const w = st.leereWurzel(); const b = laden1(); w.betriebe.push(b); w.aktiv = b.id;
  // Der bisherige Export war genau zipBlob([JSON, ablage.json]) – das bauen wir aus der JSON der Datei nach und vergleichen Byte für Byte.
  // Jeder Export schreibt ein Ereignis, zwei Exporte sind deshalb nie gleich; der ZIP-Kopf trägt die Uhrzeit in 2-s-Schritten (drei Anläufe).
  let gleich = false, alt = null;
  for (let i = 0; i < 3 && !gleich; i++) {
    alt = await st.exportDatei(w);          // Aufruf wie vor E5
    const ea = await zip.zipLesen(alt.blob);
    assert.deepEqual(ea.map((e) => e.name), [st.SICHERUNG_JSON, "ablage.json"]);
    const nachbau = await zip.zipBlob([{ name: st.SICHERUNG_JSON, daten: await ea[0].bytes() }, { name: "ablage.json", daten: "{}" }]);
    gleich = Buffer.compare(Buffer.from(await bytes(alt.blob)), Buffer.from(await bytes(nachbau))) === 0;
  }
  assert.equal(gleich, true, "ohne Passwort: dieselben Bytes wie der Export vor E5");
  assert.equal(alt.verschluesselt, false); assert.match(alt.name, /^gastrocalc-nord-\d{4}-\d{2}-\d{2}\.zip$/);
  const neu = await st.exportDatei(w, { passwort: null }); assert.equal(neu.verschluesselt, false); assert.equal(neu.name, alt.name);
});

test("E5: mit Passwort → ZIP mit genau sicherung.enc und LIESMICH.txt, Endung .gcs.zip; Rundreise über importSicherung", async () => {
  idbAttrappe(); await st.laden();
  const w = st.leereWurzel(); const b = laden1(); w.betriebe.push(b); w.aktiv = b.id;
  const r = await st.exportDatei(w, { passwort: "laden2026" });
  assert.equal(r.verschluesselt, true); assert.match(r.name, /^gastrocalc-nord-\d{4}-\d{2}-\d{2}\.gcs\.zip$/);
  const e = await zip.zipLesen(r.blob);
  assert.deepEqual(e.map((x) => x.name).sort(), ["LIESMICH.txt", "sicherung.enc"]);
  const lies = new TextDecoder().decode(await e.find((x) => x.name === "LIESMICH.txt").bytes());
  assert.ok(lies.includes("GastroCalc") && lies.includes("Passwort") && lies.includes("password") && lies.includes("parola"), "LIESMICH dreisprachig");
  const enc = await e.find((x) => x.name === "sicherung.enc").bytes(); assert.equal(K.istVerschluesselt(enc), true);
  // Klartext darf nirgends in der Datei stehen
  const roh = new TextDecoder("latin1").decode(await bytes(r.blob)); assert.ok(!roh.includes("gastrocalc-sicherung") && !roh.includes("Nord"));
  // ohne Passwort: Erkennung, kein Fehler
  const frage = await st.importSicherung(r.blob); assert.equal(frage.passwortNoetig, true); assert.equal(frage.verschluesselt, true); assert.equal(frage.wurzel, undefined);
  // falsches Passwort → grund "passwort"
  await assert.rejects(st.importSicherung(r.blob, { passwort: "falsch99" }), (e) => e.grund === "passwort");
  // richtiges Passwort → wie bisher (Prüfsumme ok, Laden da)
  const ok = await st.importSicherung(r.blob, { passwort: "laden2026" });
  assert.equal(ok.passwortNoetig, undefined); assert.equal(ok.verschluesselt, true); assert.equal(ok.zip, true); assert.equal(ok.pruefsumme, "ok");
  assert.equal(ok.wurzel.betriebe[0].betrieb.name, "Nord"); assert.deepEqual(ok.ablage, []);
  // unverschlüsselte Datei läuft ohne Passwort wie bisher
  const offen = await st.exportDatei(w); const o = await st.importSicherung(offen.blob);
  assert.equal(o.passwortNoetig, undefined); assert.equal(o.verschluesselt, false); assert.equal(o.pruefsumme, "ok");
});

test("E5: Fotos aus der Ablage überleben die Verschlüsselung (ablage/<id> im inneren ZIP)", async () => {
  idbAttrappe(); await st.laden();
  const w = st.leereWurzel(); const b = laden1(); w.betriebe.push(b); w.aktiv = b.id;
  const innen = await st.exportDatei(w);
  const json = await (await zip.zipLesen(innen.blob)).find((e) => e.name === st.SICHERUNG_JSON).bytes();
  const mitFoto = await zip.zipBlob([{ name: st.SICHERUNG_JSON, daten: json }, { name: "ablage.json", daten: JSON.stringify({ "d-x1": { typ: "image/jpeg" } }) }, { name: "ablage/d-x1", daten: new Uint8Array([9, 9, 9]) }]);
  const enc = await K.verschluesseln(await bytes(mitFoto), "foto-pass");
  const aussen = await zip.zipBlob([{ name: K.SICHERUNG_ENC, daten: enc }, { name: K.LIESMICH_NAME, daten: K.LIESMICH }]);
  const r = await st.importSicherung(aussen, { passwort: "foto-pass" });
  assert.equal(r.ablage.length, 1); assert.equal(r.ablage[0].id, "d-x1"); assert.deepEqual([...await r.ablage[0].eintrag.bytes()], [9, 9, 9]);
});

test("E5: Passwort steht nicht in der Sicherung und nicht in der Wurzel", async () => {
  idbAttrappe(); await st.laden();
  const w = st.leereWurzel(); const b = laden1(); w.betriebe.push(b); w.aktiv = b.id;
  const r = await st.exportDatei(w, { passwort: "nie-speichern" });
  assert.ok(!JSON.stringify(w).includes("nie-speichern"));
  const ok = await st.importSicherung(r.blob, { passwort: "nie-speichern" });
  assert.ok(!JSON.stringify(ok.wurzel).includes("nie-speichern"));
});
