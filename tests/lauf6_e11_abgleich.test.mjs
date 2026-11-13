// Lauf 6, E11 (13.11.2026): Fehler im Zwei-Handys-Abgleich. Jeder Test ist eine echte Rundreise: Handy A und B schreiben eine Sicherung (exportDatei),
// das andere liest sie ein (importSicherung → einlesenSicher → speichern). Hilfen: tests/hilfe/abgleich_welt.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { st, eng, setzeUhr, plusMin, klon, stabil, leeresHandy, vollerLaden } from "./hilfe/abgleich_welt.mjs";
const putz = await import("../js/putzplan.js");

async function start(namen = ["A", "B"], { vorab = true } = {}) {
  setzeUhr("2027-01-15T08:00:00Z");
  const A0 = await leeresHandy("A0", "gerA"); await A0.an(); A0.w = vollerLaden(); A0.w.geraet = "gerA"; await A0.speichern({ stempel: false });
  const basis = await A0.sichern(); const h = {};
  for (const n of namen) { h[n] = await leeresHandy(n, "ger" + n); await h[n].einlesen(basis.blob); }
  if (vorab) for (const n of namen.slice(1)) { await les(h[namen[0]], h[n]); await les(h[n], h[namen[0]]); } // beide kennen sich schon (Alltag)
  return h;
}
async function les(x, y) { const s = await y.sichern(); const r = await x.einlesen(s.blob); return r.e.bericht; } // x liest die Sicherung von y
async function tu(h, fn) { plusMin(5); const w = await h.an(); fn(w.betriebe[0], w); await h.speichern(); }
const laden = async (h) => (await h.an()).betriebe[0];
// Inhalt ohne handy-eigene Merker (Zeitstempel, Abgleich-Zettel), Listen ohne Reihenfolge
function norm(b) {
  const x = klon(b); for (const k of ["geaendert", "abgleich", "stammZeit", "abgleichHinweis"]) delete x[k];
  const san = (v) => { if (Array.isArray(v)) { const a = v.map(san); if (a.length && a.every((e) => e && typeof e === "object")) a.sort((p, q) => (stabil(p) < stabil(q) ? -1 : 1)); return a; } if (v && typeof v === "object") { const o = {}; for (const k of Object.keys(v)) { if (v[k] === false && ["storniert", "entfernt", "archiviert"].includes(k)) continue; o[k] = san(v[k]); } return o; } return v; };
  return san(x);
}
const gleich = async (a, b, was) => { const x = norm(await laden(a)), y = norm(await laden(b)); assert.equal(stabil(x), stabil(y), was || "beide Handys gleich"); };
// Kreis, bis beide gleich sind (höchstens 4 Runden): gibt die Runden zurück
async function konvergiert(A, B) { for (let i = 1; i <= 4; i++) { await les(A, B); await les(B, A); if (stabil(norm(await laden(A))) === stabil(norm(await laden(B)))) return i; } return 99; }

// ---------- A2: Rücknahme eines Putz-Hakens kommt an ----------
test("A2: B nimmt einen Putz-Haken zurück, A liest B: auf A storniert, keine Kopie, 0 Konflikte – und der Rückweg ebenso", async () => {
  const { A, B } = await start();
  const id = (await laden(B)).putzlog.find((x) => !x.storniert).id;
  await tu(B, (b) => { const e = b.putzlog.find((x) => x.id === id); putz.zuruecknehmen(b, e.aufgabe, e.datum, { von: "p1" }); });
  assert.equal((await laden(B)).putzlog.find((x) => x.id === id).storniertVon, "p1", "Voraussetzung: storniertVon wird gesetzt");
  const r1 = await les(A, B); const a = await laden(A);
  assert.equal(r1.konflikte, 0, "kein HACCP-Konflikt");
  assert.deepEqual(a.putzlog.filter((x) => x.id === id || String(x.id).startsWith(id + "~")).map((x) => !!x.storniert), [true], "ein Eintrag, storniert, keine Kopie");
  assert.equal(a.putzlog.find((x) => x.id === id).storniertVon, "p1");
  const r2 = await les(B, A); assert.equal(r2.konflikte, 0, "Rückweg ohne Konflikt");
  await gleich(A, B);
  // umgekehrt: A nimmt einen anderen Haken zurück, B liest A
  const id2 = (await laden(A)).putzlog.find((x) => !x.storniert).id;
  await tu(A, (b) => { const e = b.putzlog.find((x) => x.id === id2); putz.zuruecknehmen(b, e.aufgabe, e.datum, { von: "p2" }); });
  const r3 = await les(B, A); assert.equal(r3.konflikte, 0);
  assert.equal((await laden(B)).putzlog.filter((x) => String(x.id).startsWith(id2)).length, 1);
  assert.equal((await laden(B)).putzlog.find((x) => x.id === id2).storniert, true);
  await les(A, B); await gleich(A, B);
});
test("A2: beide Handys nehmen denselben Haken zurück (verschiedene Zeit, verschiedene Person): beide landen beim gleichen Storno", async () => {
  const { A, B } = await start();
  const id = (await laden(B)).putzlog.find((x) => !x.storniert).id;
  await tu(A, (b) => { const e = b.putzlog.find((x) => x.id === id); putz.zuruecknehmen(b, e.aufgabe, e.datum, { von: "p1" }); });
  await tu(B, (b) => { const e = b.putzlog.find((x) => x.id === id); putz.zuruecknehmen(b, e.aufgabe, e.datum, { von: "p2" }); });
  const r1 = await les(A, B), r2 = await les(B, A); assert.equal(r1.konflikte + r2.konflikte, 0);
  await gleich(A, B);
});

// ---------- A1: eigene Änderung geht beim zweiten Einlesen nicht verloren ----------
const kette = async (A, B, aenderA, aenderB) => { await tu(A, aenderA); await les(A, B); await tu(B, aenderB); await les(A, B); };
test("A1: A ändert den Preis von Gericht 1, liest B (unverändert), B ändert Gericht 2, A liest B nochmal: beide Änderungen da", async () => {
  const { A, B } = await start();
  await kette(A, B, (b) => { b.gerichte[0].preis = 11.11; }, (b) => { b.gerichte[1].preis = 22.22; });
  const a = await laden(A);
  assert.equal(a.gerichte[0].preis, 11.11, "eigene Änderung bleibt"); assert.equal(a.gerichte[1].preis, 22.22, "fremde kommt dazu");
  await konvergiert(A, B); await gleich(A, B);
  assert.equal((await laden(B)).gerichte[0].preis, 11.11);
});
test("A1: dasselbe mit einer Löschung – das gelöschte Gericht bleibt weg", async () => {
  const { A, B } = await start(); const weg = (await laden(A)).gerichte.at(-1).id;
  await kette(A, B, (b) => { b.gerichte = b.gerichte.filter((g) => g.id !== weg); }, (b) => { b.gerichte[1].preis = 22.22; });
  const a = await laden(A); assert.equal(a.gerichte.some((g) => g.id === weg), false, "Löschung bleibt"); assert.equal(a.gerichte[1].preis, 22.22);
  await konvergiert(A, B); await gleich(A, B); assert.equal((await laden(B)).gerichte.some((g) => g.id === weg), false, "auch auf B gelöscht");
});
test("A1: dasselbe mit Kostenposten und Waren", async () => {
  const { A, B } = await start();
  await kette(A, B, (b) => { b.kosten[0].betrag = 3333; b.artikel[0].preis = 9.99; }, (b) => { b.kosten[1].betrag = 444; b.artikel[1].preis = 8.88; });
  const a = await laden(A);
  assert.deepEqual([a.kosten[0].betrag, a.kosten[1].betrag, a.artikel[0].preis, a.artikel[1].preis], [3333, 444, 9.99, 8.88]);
  await konvergiert(A, B); await gleich(A, B);
});
test("A1: Löschung eines Kostenpostens überlebt das zweite Einlesen", async () => {
  const { A, B } = await start(); const weg = (await laden(A)).kosten.at(-1).id;
  await kette(A, B, (b) => { b.kosten = b.kosten.filter((k) => k.id !== weg); }, (b) => { b.kosten[0].betrag = 777; });
  assert.equal((await laden(A)).kosten.some((k) => k.id === weg), false);
  await konvergiert(A, B); await gleich(A, B);
});
test("A1: längere Kette – drei Runden Einlesen hin und her, jede Änderung bleibt", async () => {
  const { A, B } = await start();
  await tu(A, (b) => { b.gerichte[0].preis = 1.5; }); await les(A, B); await tu(B, (b) => { b.gerichte[1].preis = 2.5; }); await les(A, B);
  await tu(A, (b) => { b.gerichte[2].preis = 3.5; }); await les(A, B); await tu(B, (b) => { b.gerichte[3].preis = 4.5; }); await les(A, B); await les(B, A);
  for (const h of [A, B]) assert.deepEqual((await laden(h)).gerichte.slice(0, 4).map((g) => g.preis), [1.5, 2.5, 3.5, 4.5]);
  await gleich(A, B);
});
test("A1: Betrieb-Bereich (ohne Einträge): zweites Einlesen verliert die eigene Änderung ebenfalls nicht", async () => {
  const { A, B } = await start();
  await kette(A, B, (b) => { b.verkauf.zielgewinn = 33; }, (b) => { b.betrieb.name = "Neuer Imbiss"; });
  const a = await laden(A); assert.equal(a.verkauf.zielgewinn, 33); assert.equal(a.betrieb.name, "Neuer Imbiss");
  await konvergiert(A, B); await gleich(A, B);
});

// ---------- A3: Bereiche ohne Eintrags-Abgleich ----------
const beide = async (A, B, wasA, wasB, lies) => { await tu(A, wasA); await tu(B, wasB); const r1 = await les(A, B); const r2 = await les(B, A); const runden = await konvergiert(A, B); return { r1, r2, runden, a: lies(await laden(A)), b: lies(await laden(B)) }; };
test("A3 (S12): Lohnkosten (team) auf A, Kostenposten auf B – nichts geht verloren", async () => {
  const { A, B } = await start();
  const x = await beide(A, B, (b) => { b.team.lohnkosten = 7777; }, (b) => { b.kosten[0].betrag = 2500; }, (b) => [b.team.lohnkosten, b.kosten[0].betrag]);
  assert.deepEqual(x.a, [7777, 2500]); assert.deepEqual(x.b, [7777, 2500]); await gleich(A, B);
});
test("A3: team je Feld – A ändert lohnkosten, B eigenerLohn: beide Felder gelten", async () => {
  const { A, B } = await start();
  const x = await beide(A, B, (b) => { b.team.lohnkosten = 7777; }, (b) => { b.team.eigenerLohn = 2100; b.team.eigenerLohnStatus = "eigen"; }, (b) => [b.team.lohnkosten, b.team.eigenerLohn, b.team.eigenerLohnStatus]);
  assert.deepEqual(x.a, [7777, 2100, "eigen"]); assert.deepEqual(x.b, [7777, 2100, "eigen"]); await gleich(A, B);
});
test("A3: team – beide ändern dieselbe Zahl: Vermerk mit beiden Werten, beide Handys gleich", async () => {
  const { A, B } = await start();
  const x = await beide(A, B, (b) => { b.team.lohnkosten = 7000; }, (b) => { b.team.lohnkosten = 8000; }, (b) => b.team.lohnkosten);
  assert.equal(x.a, x.b, "dieselbe Zahl auf beiden"); assert.equal(x.a, 8000, "die spätere Änderung gilt");
  const u = [...x.r1.unterschiede, ...x.r2.unterschiede]; assert.ok(u.some((e) => e.bereich === "kosten" && /7000/.test(e.lokal + e.fremd) && /8000/.test(e.lokal + e.fremd)), "beide Werte stehen im Bericht");
  const hin = (await laden(A)).abgleichHinweis; assert.ok(hin && (hin.unterschiede || []).some((e) => /7000/.test(e.lokal + e.fremd) && /8000/.test(e.lokal + e.fremd)), "und im Hinweis fürs Büro");
});
test("A3 (S13): Personen – A ändert Kürzel von Person 2, B den Stundenlohn von Person 1", async () => {
  const { A, B } = await start();
  const x = await beide(A, B, (b) => { b.personen[1].kuerzel = "ZZ"; }, (b) => { b.personen[0].stundenlohn = 15.5; }, (b) => b.personen.map((p) => [p.kuerzel, p.stundenlohn ?? null]));
  assert.equal(x.a[1][0], "ZZ"); assert.equal(x.a[0][1], 15.5); assert.deepEqual(x.a, x.b); await gleich(A, B);
});
test("A3: Personen – neue Person auf A, ausgeschiedene Person auf B: beides gilt", async () => {
  const { A, B } = await start();
  const x = await beide(A, B, (b) => { b.personen.push({ id: "p-neu", kuerzel: "NN", aktiv: true, entfernt: false }); }, (b) => { b.personen[0].entfernt = true; b.personen[0].aktiv = false; }, (b) => [b.personen.some((p) => p.id === "p-neu"), b.personen[0].entfernt]);
  assert.deepEqual(x.a, [true, true]); assert.deepEqual(x.b, [true, true]); await gleich(A, B);
});
test("A3 (S14): Kühlstellen – A benennt Stelle 2 um, B ändert die Grenze von Stelle 1", async () => {
  const { A, B } = await start();
  const x = await beide(A, B, (b) => { b.kuehlstellen[1].name = "Neu2"; }, (b) => { b.kuehlstellen[0].max = 6; }, (b) => b.kuehlstellen.slice(0, 2).map((k) => [k.name, k.max]));
  assert.equal(x.a[1][0], "Neu2"); assert.equal(x.a[0][1], 6); assert.deepEqual(x.a, x.b); await gleich(A, B);
});
test("A3 (S15): Lieferanten – A ändert Notiz von Lieferant 1, B die Lieferzeit von Lieferant 2", async () => {
  const { A, B } = await start();
  const x = await beide(A, B, (b) => { b.lieferanten[0].notiz = "A-Notiz"; }, (b) => { b.lieferanten[1].lieferzeit = 3; }, (b) => b.lieferanten.map((l) => [l.notiz, l.lieferzeit]));
  assert.equal(x.a[0][0], "A-Notiz"); assert.equal(x.a[1][1], 3); assert.deepEqual(x.a, x.b); await gleich(A, B);
});
test("A3: Lieferanten / Kühlstellen – dasselbe Feld desselben Eintrags: Vermerk mit beiden Werten, beide gleich", async () => {
  const { A, B } = await start();
  const x = await beide(A, B, (b) => { b.lieferanten[0].notiz = "von A"; b.kuehlstellen[0].name = "KA"; }, (b) => { b.lieferanten[0].notiz = "von B"; b.kuehlstellen[0].name = "KB"; }, (b) => [b.lieferanten[0].notiz, b.kuehlstellen[0].name]);
  assert.deepEqual(x.a, x.b); assert.deepEqual(x.a, ["von B", "KB"], "später geändert gewinnt");
  const e = [...x.r1.eintraege, ...x.r2.eintraege]; assert.ok(e.some((v) => v.bereich === "lieferanten" && /von A/.test(v.lokal + v.fremd) && /von B/.test(v.lokal + v.fremd)));
  assert.ok(e.some((v) => v.bereich === "kuehl" && /KA/.test(v.lokal + v.fremd) && /KB/.test(v.lokal + v.fremd)));
});

// ---------- B1: Konflikt am selben Eintrag ----------
test("B1: dasselbe Gericht, verschiedene Felder (Preis auf A, Name auf B): beide Änderungen, beide Handys gleich", async () => {
  const { A, B } = await start();
  const x = await beide(A, B, (b) => { b.gerichte[0].preis = 12.34; }, (b) => { b.gerichte[0].name = "Anders"; }, (b) => [b.gerichte[0].preis, b.gerichte[0].name]);
  assert.deepEqual(x.a, [12.34, "Anders"]); assert.deepEqual(x.b, [12.34, "Anders"]); await gleich(A, B);
  assert.equal([...x.r1.eintraege, ...x.r2.eintraege].length, 0, "kein echter Konflikt, kein Vermerk");
});
test("B1: dasselbe Feld – die spätere Änderung gewinnt auf beiden Handys; A←B, B←A, A←B ergibt zweimal dasselbe", async () => {
  const { A, B } = await start();
  await tu(A, (b) => { b.gerichte[0].preis = 5.5; }); await tu(B, (b) => { b.gerichte[0].preis = 6.6; }); // B später
  const r1 = await les(A, B); await les(B, A); await les(A, B);
  assert.equal((await laden(A)).gerichte[0].preis, 6.6); assert.equal((await laden(B)).gerichte[0].preis, 6.6); await gleich(A, B);
  const v = r1.eintraege.find((e) => e.bereich === "gerichte"); assert.ok(v, "Vermerk im Bericht"); assert.match(v.lokal + "|" + v.fremd, /5\.5/); assert.match(v.lokal + "|" + v.fremd, /6\.6/); assert.equal(v.behalten, "fremd");
  const hin = (await laden(A)).abgleichHinweis; assert.ok(hin.eintraege.some((e) => e.bereich === "gerichte"), "Hinweis fürs Büro bleibt");
});
test("B1: andersherum – A ist später: A behält, B übernimmt", async () => {
  const { A, B } = await start();
  await tu(B, (b) => { b.kosten[0].betrag = 111; }); await tu(A, (b) => { b.kosten[0].betrag = 222; });
  await les(A, B); await les(B, A); await les(A, B);
  assert.equal((await laden(A)).kosten[0].betrag, 222); assert.equal((await laden(B)).kosten[0].betrag, 222); await gleich(A, B);
});
test("B1: gleiche Zeit auf beiden Seiten – trotzdem dasselbe Ergebnis auf beiden Handys", async () => {
  const { A, B } = await start();
  const t = "2027-01-15T10:00:00Z";
  setzeUhr(t); { const w = await A.an(); w.betriebe[0].artikel[0].preis = 3.33; await A.speichern(); }
  setzeUhr(t); { const w = await B.an(); w.betriebe[0].artikel[0].preis = 4.44; await B.speichern(); }
  setzeUhr("2027-01-15T11:00:00Z"); await les(A, B); await les(B, A); await les(A, B);
  assert.equal((await laden(A)).artikel[0].preis, (await laden(B)).artikel[0].preis); await gleich(A, B);
});
test("B1: Gericht auf A gelöscht, auf B geändert – bleibt (mit Vermerk) auf beiden", async () => {
  const { A, B } = await start(); const id = (await laden(A)).gerichte[2].id;
  await tu(A, (b) => { b.gerichte = b.gerichte.filter((g) => g.id !== id); }); await tu(B, (b) => { b.gerichte.find((g) => g.id === id).preis = 9.99; });
  const r1 = await les(A, B); const r2 = await les(B, A); await les(A, B);
  assert.ok((await laden(A)).gerichte.some((g) => g.id === id) && (await laden(B)).gerichte.some((g) => g.id === id)); await gleich(A, B);
  assert.ok([...r1.eintraege, ...r2.eintraege].some((e) => e.kennung === id && e.art === "geloeschtGeaendert"));
});
test("B1: Rundreise – die Zeiten je Feld überleben Sicherung und Einlesen, alte Daten ohne Zeit zählen als 0", async () => {
  const { A, B } = await start();
  await tu(A, (b) => { b.gerichte[0].preis = 5.5; });
  const s = await A.sichern(); const r = await st.importSicherung(s.blob); const g = r.wurzel.betriebe[0];
  assert.ok(g.feldZeit && Object.values(g.feldZeit).every((t) => Number.isFinite(t) && t > 0), "feldZeit gespeichert und gelesen");
  const alt = klon(r.wurzel); delete alt.betriebe[0].feldZeit; const m = st.migrierenWurzel(alt); assert.equal(m.betriebe[0].feldZeit, undefined, "ohne Feld bleibt es ohne Feld (= 0)");
  const kaputt = klon(r.wurzel); kaputt.betriebe[0].feldZeit = { x: "a", y: -1, z: 5 }; assert.deepEqual(st.migrierenWurzel(kaputt).betriebe[0].feldZeit, { z: 5 });
});

// ---------- B2: „Geld heute“ am selben Tag verschieden ----------
const w3 = await import("../js/welle3.js");
test("B2: Geld heute am selben Tag auf beiden Handys – die spätere Erfassung gilt auf beiden, Vermerk mit beiden Werten", async () => {
  const { A, B } = await start();
  await tu(A, (b) => { w3.geldHeuteSetzen(b, 1000); }); await tu(B, (b) => { w3.geldHeuteSetzen(b, 2000); }); // B später, derselbe Tag
  const r1 = await les(A, B); const r2 = await les(B, A); await les(A, B);
  assert.equal((await laden(A)).liquiditaet.betrag, 2000); assert.equal((await laden(B)).liquiditaet.betrag, 2000); await gleich(A, B);
  const u = [...r1.unterschiede, ...r2.unterschiede].filter((x) => x.bereich === "liquiditaet"); assert.ok(u.length, "Vermerk im Bericht");
  assert.ok(u.some((x) => /1000/.test(x.lokal + x.fremd) && /2000/.test(x.lokal + x.fremd)), "beide Werte stehen da");
  assert.ok((await laden(A)).abgleichHinweis.unterschiede.some((x) => x.bereich === "liquiditaet"), "und im Hinweis fürs Büro");
});
test("B2: ohne Erfassungszeit (alte Daten) – derselbe Wert auf beiden Handys, vorsichtig der kleinere, mit Vermerk", async () => {
  const { A, B } = await start();
  await tu(A, (b) => { b.liquiditaet = { betrag: 500, datum: "2027-01-15" }; }); await tu(B, (b) => { b.liquiditaet = { betrag: 900, datum: "2027-01-15" }; });
  const r1 = await les(A, B); await les(B, A); await les(A, B);
  assert.equal((await laden(A)).liquiditaet.betrag, 500); assert.equal((await laden(B)).liquiditaet.betrag, 500); await gleich(A, B);
  assert.ok(r1.unterschiede.some((x) => x.bereich === "liquiditaet"));
});
test("B2: anderer Tag – der jüngere Tag gilt wie bisher, ohne Vermerk; derselbe Betrag am selben Tag ist kein Konflikt", async () => {
  const { A, B } = await start();
  await tu(A, (b) => { b.liquiditaet = { betrag: 500, datum: "2027-01-14", erfasst: "2027-01-14T10:00:00.000Z" }; }); await tu(B, (b) => { b.liquiditaet = { betrag: 900, datum: "2027-01-15", erfasst: "2027-01-15T10:00:00.000Z" }; });
  const r = await les(A, B); assert.equal((await laden(A)).liquiditaet.betrag, 900); assert.equal(r.unterschiede.filter((x) => x.bereich === "liquiditaet").length, 0);
  await tu(A, (b) => { b.liquiditaet = { betrag: 900, datum: "2027-01-15", erfasst: "2027-01-15T11:00:00.000Z" }; });
  const r2 = await les(B, A); assert.equal(r2.unterschiede.filter((x) => x.bereich === "liquiditaet").length, 0);
});
test("B2: Chef-Stunden mit gleicher Zeit – auf beiden Handys derselbe Wert", async () => {
  const { A, B } = await start(); const z = "2027-01-15T12:00:00.000Z";
  await tu(A, (b) => { b.chef = { stundenMonat: 100, geaendert: z }; }); await tu(B, (b) => { b.chef = { stundenMonat: 200, geaendert: z }; });
  await les(A, B); await les(B, A); await les(A, B); assert.equal((await laden(A)).chef.stundenMonat, (await laden(B)).chef.stundenMonat);
});

// ---------- B4: Rückholpunkt ----------
test("B4: rueckholpunktInfo liefert { zeit, neuSeitdem } – 0 direkt nach dem Einlesen, danach zählt es Neues (Journal und Stammdaten)", async () => {
  const { A, B } = await start();
  await tu(B, (b) => { b.gerichte[0].preis = 4.2; });
  const s = await B.sichern(); await A.an(); const r = await st.importSicherung(s.blob); await st.einlesenSicher(A.w, r.wurzel); await st.sofortSpeichern(A.w);
  const i0 = await st.rueckholpunktInfo(A.w); assert.equal(typeof i0.zeit, "string"); assert.equal(i0.neuSeitdem, 0, "nichts Neues seit dem Einlesen");
  plusMin(10); const b = A.w.betriebe[0]; eng.tagesnotizSetzen(b, "2027-01-14", 123, { geraet: A.w.geraet }); await st.sofortSpeichern(A.w);
  const i1 = await st.rueckholpunktInfo(A.w); assert.ok(i1.neuSeitdem >= 1, "ein neuer Umsatz-Eintrag zählt"); assert.equal(i1.zeit, i0.zeit);
  plusMin(10); b.gerichte[1].preis = 3.3; await st.sofortSpeichern(A.w);
  const i2 = await st.rueckholpunktInfo(A.w); assert.ok(i2.neuSeitdem > i1.neuSeitdem, "geänderte Stammdaten zählen auch");
  assert.equal((await st.rueckholpunktInfo()).neuSeitdem, null, "ohne Wurzel unbekannt (null) – die Oberfläche zeigt dann nichts an");
});
test("B4: der Rückholpunkt hat einen Zeitstempel; ein Punkt, der älter als 7 Tage ist, wird beim Start gelöscht", async () => {
  const { A, B } = await start(); await tu(B, (b) => { b.gerichte[0].preis = 4.2; });
  const s = await B.sichern(); await A.an(); const r = await st.importSicherung(s.blob); await st.einlesenSicher(A.w, r.wurzel); await st.sofortSpeichern(A.w); A.bild = (await import("./hilfe/abgleich_welt.mjs")).abbild();
  plusMin(6 * 24 * 60); await A.an(); assert.ok(await st.rueckholpunktInfo(A.w), "nach 6 Tagen ist er noch da");
  plusMin(2 * 24 * 60); await A.an(); assert.equal(await st.rueckholpunktInfo(A.w), null, "nach 8 Tagen ist er beim Start gelöscht");
  assert.equal(await st.zurueckholen(A.w), null, "und lässt sich nicht mehr zurückholen");
});
test("B4: Oberfläche – der Knopf „Einlesen rückgängig“ erscheint nur, wenn nichts Neues eingetragen wurde (neuSeitdem === 0)", async () => {
  const { readFile } = await import("node:fs/promises");
  const home = await readFile(new URL("../js/screens/home.js", import.meta.url), "utf8");
  assert.match(home, /extra\.rueckhol\s*&&\s*extra\.rueckhol\.neuSeitdem\s*===\s*0/);
  const z = await readFile(new URL("../js/bedienung/zeichnen.js", import.meta.url), "utf8"); assert.match(z, /rueckholNeuSeitdem/);
});

// ---------- C: Kleinigkeiten ----------
const dateiMit = async (fn) => { const { A } = await start(["A"]); await tu(A, fn); const s = await A.sichern(); return s.blob; };
test("C1: fremder Beispiel-Laden wird nicht als Laden übernommen; auf ein leeres Handy kommt alles (Rundreise vollständig)", async () => {
  const { beispielLaden } = await import("../js/beispiel.js");
  setzeUhr("2027-01-15T08:00:00Z");
  const A = await leeresHandy("A", "gerA"); await A.an(); A.w = vollerLaden(); const bsp = beispielLaden("2027-01-15"); bsp.id = "bsp-fremd"; assert.equal(bsp.beispiel, true); A.w.betriebe.push(bsp); await A.speichern({ stempel: false });
  const sA = await A.sichern();
  const B = await leeresHandy("B", "gerB"); await B.an(); B.w = vollerLaden(undefined, { id: "laden-b" }); B.w.geraet = "gerB"; await B.speichern({ stempel: false });
  const r = await B.einlesen(sA.blob); const wb = await B.an();
  assert.deepEqual(wb.betriebe.map((x) => x.id).sort(), ["laden-b", "laden-voll"], "der fremde Beispiel-Laden ist nicht übernommen"); assert.equal(r.e.bericht.beispielUebersprungen, 1);
  const C = await leeresHandy("C", "gerC"); await C.einlesen(sA.blob); const wc = await C.an();
  assert.deepEqual(wc.betriebe.map((x) => x.id).sort(), ["bsp-fremd", "laden-voll"], "leeres Handy: Rundreise vollständig, mit Beispiel-Laden"); assert.equal(wc.betriebe.find((x) => x.id === "bsp-fremd").beispiel, true);
});
test("C3: eine Liste, die durch ein Objekt (oder Text) ersetzt wurde, zählt als ungültig", async () => {
  const { A } = await start(["A"]); const s = await A.sichern(); const r0 = await st.importSicherung(s.blob);
  const w = klon(r0.wurzel); w.betriebe[0].kosten = { x: 1 }; w.betriebe[0].gerichte = "kaputt"; w.betriebe[0].personen = null;
  const m = st.migrierenWurzel(klon(w)); assert.ok(Array.isArray(m.betriebe[0].kosten) && Array.isArray(m.betriebe[0].gerichte));
  const n = await st.importDatei(JSON.stringify({ typ: "gastrocalc-sicherung", schema: 6, wurzel: w, ereignisse: [] })); assert.ok(n.ungueltig >= 2, "zwei ersetzte Listen gezählt, null ist nur leer: " + n.ungueltig);
});
test("C4: Inventur mit Ware ohne Text als Namen wirft nicht (name.localeCompare)", async () => {
  const inv = await import("../js/inventur.js"); const b = st.leererBetrieb(); b.phase = "app";
  b.artikel = [{ name: "Brot", gruppe: "x", einheit: "kg", preis: 1 }, { name: 5, preis: 2 }, { name: "Apfel", preis: 3 }];
  const i = { id: "i1", datum: "2027-01-10", begonnen: "2027-01-10T10:00:00.000Z", abgeschlossen: null, posten: { Brot: 1, 5: 2, Apfel: 1 }, ausgeblendet: [] };
  assert.doesNotThrow(() => inv.artikelFuerInventur(b, i)); const l = inv.artikelFuerInventur(b, i); assert.ok(l.liste.length >= 2);
});
test("C5: Stunden in teamTage – Zahl, sonst 0 und als ungültig gezählt", async () => {
  const { A } = await start(["A"]); const s = await A.sichern(); const r0 = await st.importSicherung(s.blob);
  const w = klon(r0.wurzel); w.betriebe[0].teamTage = [{ datum: "2027-01-10", eintraege: [{ person: "p", name: "x", stunden: "viel", satz: 12 }, { person: "q", name: "y", stunden: 6, satz: 12 }, { person: "r", name: "z", stunden: -3, satz: 12 }, { person: "s", name: "w", stunden: NaN }], erfasst: "2027-01-10T20:00:00.000Z" }];
  const n = await st.importDatei(JSON.stringify({ typ: "gastrocalc-sicherung", schema: 6, wurzel: JSON.parse(JSON.stringify(w)), ereignisse: [] })); const e = n.wurzel.betriebe[0].teamTage[0].eintraege;
  assert.deepEqual(e.map((x) => x.stunden), [0, 6, 0, 0]); assert.ok(n.ungueltig >= 3, "drei ungültige Stunden gezählt: " + n.ungueltig);
});
test("C6: Läden ohne gültige Kennung und Nicht-Objekte in betriebe werden nicht zu Phantom-Läden, sondern gezählt", async () => {
  const { A } = await start(["A"]); const s = await A.sichern(); const r0 = await st.importSicherung(s.blob);
  const w = klon(r0.wurzel); w.betriebe.push(null, 5, "x", { phase: "app" }, { id: "", betrieb: { name: "o" } }, { id: 7 });
  const n = await st.importDatei(JSON.stringify({ typ: "gastrocalc-sicherung", schema: 6, wurzel: w, ereignisse: [] }));
  assert.deepEqual(n.wurzel.betriebe.map((x) => x.id), ["laden-voll"]); assert.ok(n.ungueltig >= 6, "sechs gezählt: " + n.ungueltig);
});
test("C7: Namen von Gericht und Ware werden beim Einlesen auf 80 Zeichen gekürzt und gezählt; Verweise aus Rezepten folgen", async () => {
  const { A } = await start(["A"]); const s = await A.sichern(); const r0 = await st.importSicherung(s.blob);
  const w = klon(r0.wurzel); const b = w.betriebe[0]; const lang = "W".repeat(120), lang2 = "W".repeat(100) + "X".repeat(50);
  b.gerichte[0].name = "G".repeat(95); b.artikel[0].name = lang; b.artikel[1].name = lang2; b.gerichte[1].zutaten = [{ name: lang, menge: 1, einheit: "kg" }];
  const n = await st.importDatei(JSON.stringify({ typ: "gastrocalc-sicherung", schema: 6, wurzel: w, ereignisse: [] })); const nb = n.wurzel.betriebe[0];
  assert.ok(nb.gerichte.every((g) => g.name.length <= 80) && nb.artikel.every((a) => a.name.length <= 80)); assert.equal(nb.gerichte[0].name.length, 80);
  assert.equal(new Set(nb.artikel.map((a) => a.name)).size, nb.artikel.length, "Waren-Namen bleiben eindeutig (Schlüssel)");
  assert.ok(nb.artikel.some((a) => a.name === nb.gerichte[1].zutaten[0].name), "die Zutat zeigt auf die gekürzte Ware"); assert.ok(n.ungueltig >= 3, "gezählt: " + n.ungueltig);
});
test("C8: Zurückholen stempelt die Bereichszeiten nicht neu", async () => {
  const { A, B } = await start(); await tu(B, (b) => { b.gerichte[0].preis = 4.2; b.verkauf.zielgewinn = 40; });
  const vorher = klon((await laden(A)).stammZeit); const feldVorher = klon((await laden(A)).feldZeit ?? null);
  const s = await B.sichern(); await A.an(); const r = await st.importSicherung(s.blob); plusMin(30); await st.einlesenSicher(A.w, r.wurzel); await st.sofortSpeichern(A.w);
  assert.notDeepEqual(A.w.betriebe[0].stammZeit, vorher, "Voraussetzung: das Einlesen hat sich bemerkbar gemacht (Zeit des Bereichs ist die der Quelle)");
  plusMin(30); const z = await st.zurueckholen(A.w); assert.ok(z);
  assert.deepEqual(z.wurzel.betriebe[0].stammZeit, vorher, "Zeiten wie vor dem Einlesen"); await st.sofortSpeichern(z.wurzel);
  assert.deepEqual(z.wurzel.betriebe[0].stammZeit, vorher, "und auch nach dem Speichern nicht neu gestempelt"); assert.deepEqual(z.wurzel.betriebe[0].feldZeit ?? null, feldVorher);
});
