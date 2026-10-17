// Rettung (17.10.2026): Rettungscode für den Büro-Code (nur Prüfwert gespeichert, gleiche Bremse) und „Sicherung ersetzt alles“ auf der Fehlerseite.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const M = await import("../js/modus.js");
const R = await import("../js/rettung.js");
const S = await import("../js/store.js");
const i18n = await import("../js/i18n.js"); i18n.setzeSprache("de");

test("Rettungscode: 12 Zeichen, drei Blöcke, keine verwechselbaren Zeichen, echter Zufall", () => {
  assert.equal(R.RETTUNG_ZEICHEN.length, 31);
  for (const c of "0O1lIL") assert.ok(!R.RETTUNG_ZEICHEN.includes(c), "verwechselbar: " + c);
  const alle = new Set();
  for (let i = 0; i < 400; i++) {
    const c = R.rettungscodeErzeugen(); alle.add(c);
    assert.match(c, /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{12}$/);
    assert.match(R.rettungBloecke(c), /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  }
  assert.equal(alle.size, 400, "keine Wiederholung");
  // ohne Modulo-Schieflage: Werte ab 248 werden verworfen
  let n = 0; const zufall = (k) => Uint8Array.from({ length: k }, () => (n++ % 2 ? 255 : 0));
  assert.equal(R.rettungscodeErzeugen(zufall), "222222222222");
});

test("Eingabe: Kleinbuchstaben, Leerzeichen und Striche gehen; falsche Zeichen nicht", () => {
  assert.equal(R.rettungNormal(" abcd-efgh jkmn "), "ABCDEFGHJKMN");
  assert.equal(R.rettungGueltig("abcd efgh jkmn"), true);
  assert.equal(R.rettungGueltig("ABCD-EFGH-JKM0"), false, "0 gibt es nicht");
  assert.equal(R.rettungGueltig("ABCD-EFGH-JKM"), false, "zu kurz");
});

test("Gespeichert wird nur der PBKDF2-Abdruck, nie der Klartext", async () => {
  const w = {}; assert.equal(await R.rettungAnlegen(w), null, "ohne Büro-Code kein Rettungscode");
  await M.pinSetzen(w, "4711"); const code = await R.rettungAnlegen(w);
  assert.match(w.rettungPin, /^pbkdf2\$600000\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
  const text = JSON.stringify(w);
  assert.ok(!text.includes(code) && !text.includes(R.rettungBloecke(code)), "Klartext steht nirgends");
  assert.equal(R.rettungGesetzt(w), true); assert.equal(R.rettungFehlt(w), false);
  const zweiter = await R.rettungAnlegen(w); assert.notEqual(zweiter, code);
  assert.deepEqual(await R.rettungVersuch(w, code), { fehler: true, dauer: 0 }, "alter Rettungscode gilt nach dem neuen nicht mehr");
  assert.deepEqual(await R.rettungVersuch(w, zweiter.toLowerCase()), { ok: true });
});

test("Rettung: neuer Büro-Code und neuer Rettungscode, der alte Rettungscode ist danach wertlos", async () => {
  const w = {}; await M.pinSetzen(w, "4711"); const alt = await R.rettungAnlegen(w);
  w.pinSperre = { fehler: 3, bis: 0 };
  assert.deepEqual(await R.rettungVersuch(w, R.rettungBloecke(alt)), { ok: true });
  assert.equal(w.pinSperre, undefined, "richtiger Rettungscode löst die Bremse");
  await M.pinSetzen(w, "2580"); assert.equal(w.rettungPin, undefined, "neuer Büro-Code: alter Rettungscode weg");
  const neu = await R.rettungAnlegen(w);
  assert.equal(await M.pinPruefen(w, "2580"), true); assert.equal(await M.pinPruefen(w, "4711"), false);
  assert.equal((await R.rettungVersuch(w, alt)).fehler, true);
  assert.equal((await R.rettungVersuch(w, neu)).ok, true);
  await M.pinSetzen(w, null); assert.equal(w.rettungPin, undefined, "Code entfernt: Rettungscode auch");
});

test("Falscher Rettungscode scheitert und bremst – derselbe Zähler wie beim Büro-Code", async () => {
  const w = {}; await M.pinSetzen(w, "4711"); const code = await R.rettungAnlegen(w); const t0 = 1_800_000_000_000;
  for (let i = 1; i < M.SPERRE_AB; i++) assert.deepEqual(await R.rettungVersuch(w, "ZZZZ-ZZZZ-ZZZZ", { jetzt: t0 }), { fehler: true, dauer: 0 });
  assert.deepEqual(await R.rettungVersuch(w, "Unsinn", { jetzt: t0 }), { fehler: true, dauer: M.SPERRE_START_MS }, "auch Unsinn zählt");
  assert.deepEqual(await R.rettungVersuch(w, code, { jetzt: t0 + 1000 }), { gesperrt: M.SPERRE_START_MS - 1000 }, "während der Wartezeit wird nicht geprüft");
  assert.equal(M.sperreRest(w, t0 + 1000), M.SPERRE_START_MS - 1000, "Büro-Code-Abfrage sieht dieselbe Wartezeit");
  assert.equal((await R.rettungVersuch(w, "ZZZZ-ZZZZ-ZZZZ", { jetzt: t0 + M.SPERRE_START_MS })).dauer, M.SPERRE_START_MS * 2, "Wartezeit verdoppelt");
  assert.equal(w.pinSperre.fehler, M.SPERRE_AB + 1);
  assert.deepEqual(await R.rettungVersuch(w, code, { jetzt: t0 + 10 * 60000 }), { ok: true });
  // ohne angelegten Rettungscode: jeder Versuch scheitert (und zählt)
  const v = {}; await M.pinSetzen(v, "4711"); assert.equal((await R.rettungVersuch(v, code)).fehler, true); assert.equal(v.pinSperre.fehler, 1);
});

test("Alte Läden mit Büro-Code ohne Rettungscode: Hinweis „Rettungscode anlegen“ im Büro", async () => {
  const O = await import("../js/offen.js");
  const w = S.leereWurzel(); const b = S.leererBetrieb(); b.phase = "app"; w.betriebe = [b]; w.aktiv = b.id;
  assert.ok(!O.offenImBuero(b, w).some((o) => o.id === "rettung"), "ohne Büro-Code kein Hinweis");
  await M.pinSetzen(w, "4711");
  const h = O.offenImBuero(b, w).find((o) => o.id === "rettung");
  assert.ok(h, "Hinweis da"); assert.deepEqual(h.ziel, { aktion: "rettung-neu" }); assert.equal(h.text, i18n.t("rettung.offen"));
  await R.rettungAnlegen(w);
  assert.ok(!O.offenImBuero(b, w).some((o) => o.id === "rettung"), "nach dem Anlegen weg");
});

test("Personal-Modus: „Code vergessen?“ nur am Schloss, sonst kein Zugriff auf Rettung und Code-Änderung", async () => {
  for (const a of ["rettung-neu", "pin-setzen", "pin-entfernen"]) assert.equal(M.personalGesperrt(a, undefined, "2026-10-17"), true, a);
  const w = {}; await M.pinSetzen(w, "4711");
  assert.equal(R.rettungErlaubt(w, "buero"), false, "ohne Rettungscode kein „Code vergessen?“");
  await R.rettungAnlegen(w);
  assert.equal(R.rettungErlaubt(w, "buero"), true); assert.equal(R.rettungErlaubt(w, "loeschen"), true); assert.equal(R.rettungErlaubt(w, "setzen"), false);
  w.modus = "personal";
  assert.equal(R.rettungErlaubt(w, "personal"), true, "am Personal-Schloss erlaubt: wer den Zettel hat, ist der Chef");
  for (const z of ["buero", "loeschen", "ladenLoeschen", "setzen", undefined]) assert.equal(R.rettungErlaubt(w, z), false, "im Personal-Modus sonst gesperrt: " + z);
  // gleiche Bremse wie überall
  for (let i = 0; i < M.SPERRE_AB; i++) await R.rettungVersuch(w, "ZZZZ-ZZZZ-ZZZZ", { jetzt: 1e12 });
  assert.ok(M.sperreRest(w, 1e12) > 0, "Bremse greift auch vom Schloss aus");
  const src = fs.readFileSync(new URL("../js/screens/ebene.js", import.meta.url), "utf8");
  assert.match(src, /rettungErlaubt\(p\.wurzel, p\.zweck\)/, "Blatt nutzt die Regel aus rettung.js");
});

test("Migration und Sicherung: Abdruck übersteht den Neustart, geht nie in die Sicherung, Einlesen übernimmt ihn nicht", async () => {
  const w = S.leereWurzel(); w.betriebe = [S.leererBetrieb()]; w.aktiv = w.betriebe[0].id; await M.pinSetzen(w, "4711"); await R.rettungAnlegen(w);
  const m = S.migrierenWurzel(JSON.parse(JSON.stringify(w)));
  assert.equal(m.rettungPin, w.rettungPin, "bleibt beim Laden");
  assert.equal(S.migrierenWurzel({ betriebe: [], rettungPin: "unsinn" }).rettungPin, undefined, "kaputter Wert fällt weg");
  assert.equal(S.migrierenWurzel({ betriebe: [], rettungPin: "a".repeat(64) }).rettungPin, undefined, "ungesalzene Werte gibt es hier nicht");
  const { blob } = await S.exportDatei(w); const Z = await import("../js/zip.js");
  const text = new TextDecoder().decode(await (await Z.zipLesen(blob)).find((e) => e.name === S.SICHERUNG_JSON).bytes());
  assert.ok(!text.includes("rettungPin") && !text.includes("pbkdf2$"), "nicht in der Sicherung");
  const zeilen = text.split("\n"); const d = JSON.parse(zeilen[1]); d.wurzel.rettungPin = w.rettungPin;
  const { wurzel } = await S.importDatei(zeilen[0] + "\n" + JSON.stringify(d)); assert.equal(wurzel.rettungPin, undefined, "Einlesen übernimmt keinen fremden Rettungscode");
});

test("Fehlerseite: Sicherung ersetzt den Stand, Büro-Code und Rettungscode des Handys bleiben", async () => {
  const alt = S.leereWurzel(); const a = S.leererBetrieb(); a.betrieb.name = "Kaputt"; alt.betriebe = [a]; alt.aktiv = a.id; alt.geraet = "g-handy"; alt.lfd = 40; alt.modus = "buero";
  await M.pinSetzen(alt, "4711"); await R.rettungAnlegen(alt); alt.pinSperre = { fehler: 2, bis: 0 };
  const imp = S.leereWurzel(); const b = S.leererBetrieb(); b.betrieb.name = "Döner Eck"; b.phase = "app"; imp.betriebe = [b]; imp.aktiv = "weg"; imp.geraet = "g-alt"; imp.lfd = 12; imp.ladeFehler = [{ journal: "kopf" }];
  const n = R.wurzelErsetzen(alt, imp);
  assert.deepEqual(n.betriebe.map((x) => x.betrieb.name), ["Döner Eck"], "nur die Läden der Sicherung");
  assert.equal(n.aktiv, b.id); assert.equal(n.bueroPin, alt.bueroPin); assert.equal(n.rettungPin, alt.rettungPin); assert.deepEqual(n.pinSperre, { fehler: 2, bis: 0 });
  assert.equal(n.geraet, "g-handy"); assert.equal(n.lfd, 40); assert.equal(n.ladeFehler, undefined);
  assert.equal(n.modus, "laden", "mit Code geht es in den Laden, nicht offen ins Büro");
  assert.equal(await M.pinPruefen(n, "4711"), true);
  const ohne = R.wurzelErsetzen({ modus: "personal" }, imp); assert.equal(ohne.bueroPin, undefined); assert.equal(ohne.modus, "laden", "Personal nur mit Code");
  assert.equal(R.wurzelErsetzen(null, imp).aktiv, b.id);
});

test("Texte: in allen 18 Sprachen, ohne verbotene Wörter", async () => {
  const dir = new URL("../js/lang/", import.meta.url); const codes = fs.readdirSync(dir).map((f) => f.replace(".js", ""));
  assert.equal(codes.length, 18);
  const verboten = /revolution|disrupt|marktführer|gobd-konform|betriebsprüfungsfest|steuersicher|rechtssicher/i;
  const de = (await import("../js/lang/de.js")).default.rettung;
  for (const c of codes) {
    const r = (await import(`../js/lang/${c}.js`)).default.rettung;
    assert.deepEqual(Object.keys(r), Object.keys(de), c);
    for (const [k, v] of Object.entries(r)) { const s = typeof v === "function" ? v("Döner Eck") : v; assert.ok(s.trim(), c + "." + k); assert.ok(!verboten.test(s), c + "." + k); }
    assert.ok(r.ersetzenFrage("Döner Eck").includes("Döner Eck"), c);
  }
});
