// Lauf 6, Etappe 5 (13.11.2026): Bedienschicht – A Doppeltipp, B Tageswechsel, C Speicher, D Personalessen nur als Summe,
// E Wurzel als Parameter, F Personal-Modus als Positivliste, G Büro-Code hart gesperrt. Browser-Teile: tests/doppeltipp_browser.py, tests/echt_browser.py.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const S = await import("../js/store.js");
const i18n = await import("../js/i18n.js"); i18n.setzeSprache("de");
const H = await import("../js/bedienhilfe.js");
const M = await import("../js/modus.js");
const R = await import("../js/rettung.js");
const { l6z, L6Z } = await import("../js/data/l6z_texte.js");

// ───── A: Doppeltipp ─────
test("A: Sperre – dieselbe Aktion startet nicht noch einmal, solange sie läuft; andere Aktionen und andere Werte gehen", async () => {
  const sp = H.aktionsSperre(); const k = H.aktionsSchluessel("abschluss-fertig", undefined, undefined);
  assert.equal(sp.belegen(k), true); assert.equal(sp.belegen(k), false, "zweiter Tipp binnen der Laufzeit"); assert.equal(sp.laeuft(k), true);
  assert.equal(sp.belegen(H.aktionsSchluessel("inventur-fertig")), true, "andere Aktion");
  assert.equal(sp.belegen(H.aktionsSchluessel("hm-status", "erledigt", "a")), true); assert.equal(sp.belegen(H.aktionsSchluessel("hm-status", "erledigt", "b")), true, "andere Kennung");
  sp.freigeben(k); assert.equal(sp.belegen(k), true, "nach dem Ende wieder möglich");
  // wie in app.js: Aktion mit await, fünf Tipps im Abstand von 1 ms
  const sp2 = H.aktionsSperre(); let ausgefuehrt = 0;
  const tipp = async () => { const key = H.aktionsSchluessel("abschluss-fertig"); if (!sp2.belegen(key)) return; try { await new Promise((r) => setTimeout(r, 20)); ausgefuehrt += 1; } finally { sp2.freigeben(key); } };
  const alle = []; for (let i = 0; i < 5; i++) { alle.push(tipp()); await new Promise((r) => setTimeout(r, 1)); }
  await Promise.all(alle); assert.equal(ausgefuehrt, 1); assert.equal(sp2.anzahl, 0);
});
test("A: abschlussAktion – für einen Geschäftstag mit aktivem Abschluss gibt es keinen zweiten", async () => {
  const { abschlussAktion, tagSchonAbgeschlossen, abschlussZuruecksetzen } = await import("../js/screens/abschluss.js");
  const { heuteGeschaeft } = await import("../js/util.js");
  const stand = S.leererBetrieb(); const D = heuteGeschaeft();
  assert.equal(tagSchonAbgeschlossen(stand, D), false);
  assert.equal(abschlussAktion("abschluss-fertig", null, stand, { geraet: "g" }), "abgeschlossen");
  assert.equal(stand.abschluesse.length, 1); assert.equal(tagSchonAbgeschlossen(stand, D), true);
  assert.equal(abschlussAktion("abschluss-fertig", null, stand, { geraet: "g" }), "schon", "zweiter Tipp");
  assert.equal(stand.abschluesse.length, 1, "kein zweiter Eintrag");
  assert.equal(tagSchonAbgeschlossen(stand, "2020-01-01"), false, "ein anderer Tag ist unberührt");
  stand.abschluesse[0].storniert = true; assert.equal(tagSchonAbgeschlossen(stand, D), false, "ein stornierter Abschluss zählt nicht");
  assert.equal(abschlussAktion("abschluss-fertig", null, stand, {}), "abgeschlossen"); assert.equal(stand.abschluesse.length, 2);
  assert.equal(abschlussAktion("anderes", null, stand, {}), false); abschlussZuruecksetzen();
});

// ───── B: Tageswechsel ─────
test("B: tagGewechselt – Kalendertag um 00:00, Geschäftstag um 04:00 (Berlin), nicht dazwischen", () => {
  const st = (iso) => H.tagStand(new Date(iso));
  // 22:30 Berlin (21:30 UTC, Winterzeit) → 07:30 Folgetag
  assert.equal(H.tagGewechselt(st("2026-11-13T21:30:00Z"), st("2026-11-14T06:30:00Z")), true);
  assert.equal(H.tagGewechselt(st("2026-11-13T21:30:00Z"), st("2026-11-13T22:30:00Z")), false, "gleicher Kalender- und Geschäftstag");
  assert.equal(H.tagGewechselt(st("2026-11-13T22:59:00Z"), st("2026-11-13T23:01:00Z")), true, "00:01 Berlin: Kalendertag wechselt");
  assert.equal(H.tagGewechselt(st("2026-11-13T23:30:00Z"), st("2026-11-14T02:59:00Z")), false, "00:30 bis 03:59: weder Kalender- noch Geschäftstag");
  assert.equal(H.tagGewechselt(st("2026-11-14T02:59:00Z"), st("2026-11-14T03:00:00Z")), true, "04:00 Berlin: Geschäftstag wechselt");
  assert.equal(H.tagGewechselt(null, st("2026-11-14T03:00:00Z")), false, "noch nichts gezeichnet");
  // Sommerzeit
  assert.equal(H.tagGewechselt(st("2026-07-10T20:30:00Z"), st("2026-07-11T05:30:00Z")), true);
});
test("B: Ein Feld mit Text hält das Neuzeichnen zurück, ein leeres Feld nicht", () => {
  assert.equal(H.feldMitText({ aktiv: true, value: "12,5" }), true);
  assert.equal(H.feldMitText({ aktiv: true, value: "  " }), false);
  assert.equal(H.feldMitText({ aktiv: true, value: "" }), false);
  assert.equal(H.feldMitText(null), false);
});

// ───── C: Speicher ─────
test("C: Speicher voll wird erkannt (Fehler, Ereignis, Meldungstext) und bekommt den eigenen Satz", () => {
  assert.equal(H.istSpeicherVoll({ name: "QuotaExceededError" }), true);
  assert.equal(H.istSpeicherVoll({ target: { error: { name: "QuotaExceededError" } } }), true);
  assert.equal(H.istSpeicherVoll({ error: { name: "QuotaExceededError" } }), true);
  assert.equal(H.istSpeicherVoll({ name: "NS_ERROR_DOM_QUOTA_REACHED" }), true);
  assert.equal(H.istSpeicherVoll({ message: "The quota has been exceeded." }), true);
  assert.equal(H.istSpeicherVoll({ name: "AbortError" }), false); assert.equal(H.istSpeicherVoll(undefined), false);
  assert.equal(H.speicherProblemArt("speichern", { name: "QuotaExceededError" }), "voll");
  assert.equal(H.speicherProblemArt("speichern", new Error("x")), "speichern");
  assert.equal(H.speicherProblemArt("fassung"), "fassung");
  assert.equal(L6Z.speicherVoll.de, "Speicher voll. Bitte jetzt sichern und Platz schaffen.");
  for (const k of ["speicherVoll", "schlossEhrlich", "nurRettung"]) for (const s of ["de", "tr", "ar", "en"]) assert.ok(L6Z[k][s]?.length > 5, k + " " + s);
  assert.equal(l6z("pl", "speicherVoll"), L6Z.speicherVoll.en, "andere Sprachen fallen auf Englisch");
  assert.equal(l6z("tr", "speicherVoll"), L6Z.speicherVoll.tr);
});
test("C: Das Banner geht nach einem erfolgreichen Schreiben weg – außer „fassung“ und „ablage“", () => {
  assert.equal(H.problemNachErfolg("speichern"), null); assert.equal(H.problemNachErfolg("voll"), null);
  assert.equal(H.problemNachErfolg("fassung"), "fassung"); assert.equal(H.problemNachErfolg("ablage"), "ablage"); assert.equal(H.problemNachErfolg(null), null);
});
test("C: Dauerhafter Speicher wird bei jedem Start neu angefragt, solange er nicht bewilligt ist", () => {
  assert.equal(H.dauerhaftFaellig({}), true); assert.equal(H.dauerhaftFaellig({ persistGefragt: false }), true);
  assert.equal(H.dauerhaftFaellig({ persistGefragt: true }), false); assert.equal(H.dauerhaftFaellig(null), false);
});

// ───── D: Personalessen nur als Summe ─────
test("D: Steuerberater- und Buchhalter-Paket zeigen das Personalessen nur als Summe, ohne Kürzel", async () => {
  const St = await import("../js/export_steuer.js"); const { paketDokument, csvDateien } = await import("../js/ordner_text.js"); const { druckHtml } = await import("../js/export_amt.js");
  const s = S.leererBetrieb(); s.betrieb.name = "Test";
  s.personen = [{ id: "a", kuerzel: "Ayşe", aktiv: true, entfernt: false }, { id: "b", kuerzel: "Borabey", aktiv: true, entfernt: false }, { id: "c", kuerzel: "Zeynep", aktiv: false, entfernt: true, ausgeschieden: "2026-09-20" }];
  const e = (id, datum, von, menge = 1, mahlzeit = "mittag") => ({ id, datum, art: "personal", menge, mahlzeit, ref: { name: "Döner" }, wert: 2, von, storniert: false });
  s.schwund = [e("1", "2026-09-02", "a"), e("2", "2026-09-02", "b"), e("3", "2026-09-02", "c", 2), e("4", "2026-09-03", "a", 1, "fruehstueck")];
  const z = St.monatVon("2026-09-01");
  for (const art of ["steuer", "buch"]) {
    const p = St.monatsPaket(s, z, art);
    assert.equal(p.personal.zeilen.length, 4, "der Laden-Stand behält die Zeilen (Prüfung „Essen ohne Person“)");
    assert.equal(p.personal.tage.length, 2, "Summe je Tag und Mahlzeit: 2.9. Mittag und 3.9. Frühstück");
    assert.equal(p.personal.tage[0].menge, 4); assert.equal(p.personal.tage[0].mahlzeit, "mittag"); assert.equal(p.personal.jePerson, undefined);
    assert.ok(!JSON.stringify(p.personal.tage).match(/Ayşe|Borabey|Zeynep/), "keine Kürzel in den Summen");
    const html = druckHtml(paketDokument(s, p));
    assert.match(html, /Personalessen/); for (const k of ["Ayşe", "Borabey", "Zeynep"]) assert.ok(!html.includes(k), `${art}: ${k} steht in der Personalessen-Tabelle`);
    const csv = St.teilCsv(p, "personal", ["Datum", "Person", "Gericht", "Mahlzeit", "Anzahl", "Sachbezug je €", "Sachbezug €", "Warenwert €"], { mahlzeit: (m) => m });
    const zeilen = csv.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
    assert.equal(zeilen.length, 3, "Kopf + 2 Summenzeilen"); assert.ok(!/Person|Gericht|Ayşe|Borabey|Zeynep|Döner/.test(csv), "kein Kürzel, kein Gericht in der CSV");
    assert.equal(zeilen[0].split(";").length, 6, "sechs Spalten");
  }
  // alle CSV-Dateien des Buchhalter-Pakets: kein Kürzel
  const p = St.monatsPaket(s, z, "buch"); assert.ok(p.personal.tage.length);
});
test("D: personalKopf lässt Person und Gericht weg, andere Köpfe bleiben", async () => {
  const St = await import("../js/export_steuer.js");
  assert.deepEqual(St.personalKopf(["D", "P", "G", "M", "A", "J", "S", "W"]), ["D", "M", "A", "J", "S", "W"]);
  assert.deepEqual(St.personalKopf(["a", "b"]), ["a", "b"]);
});

// ───── E: Wurzel als Parameter ─────
test("E: Schloss-Schritt und Fertig-Seite lesen die Wurzel aus dem Parameter, nicht aus dem Debug-Objekt", async () => {
  const { SCHRITTE } = await import("../js/screens/onboarding.js");
  const schloss = SCHRITTE.find((x) => x.id === "schloss") || (await import("../js/screens/onboarding.js")).schritteFuer(S.leererBetrieb()).find((x) => x.id === "schloss");
  const fertig = SCHRITTE.find((x) => x.id === "fertig-schnell") || (await import("../js/screens/onboarding.js")).schritteFuer(S.leererBetrieb()).find((x) => x.id === "fertig-schnell");
  const stand = S.leererBetrieb(); delete globalThis.__gastrocalc;
  const mit = { bueroPin: "salz$5000$" + "a".repeat(32) + "$" + "b".repeat(64) };
  assert.match(schloss.view(stand, mit), /s2schloss-zeile an/, "Code gesetzt: Haken sichtbar"); assert.doesNotMatch(schloss.view(stand, {}), /s2schloss-zeile an/);
  assert.doesNotMatch(fertig.view(stand, mit), /data-pin="1"/, "Code gesetzt: kein zweites Angebot"); assert.match(fertig.view(stand, {}), /data-pin="1"/);
  assert.match(fertig.view(stand, undefined), /data-pin="1"/, "ohne Wurzel: wie ohne Code");
  // Das Debug-Objekt darf keine Rolle spielen
  globalThis.__gastrocalc = { wurzel: mit }; try { assert.doesNotMatch(schloss.view(stand, {}), /s2schloss-zeile an/); } finally { delete globalThis.__gastrocalc; }
});

// ───── F: Personal-Modus als Positivliste ─────
function aktionsNamen() {
  const namen = new Set(); const dir = path.join(WURZEL, "js", "screens");
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".js"))) {
    const q = fs.readFileSync(path.join(dir, f), "utf8");
    for (const m of q.matchAll(/data-a=\\?"([a-z0-9][a-z0-9-]*)"/g)) namen.add(m[1]);
    for (const m of q.matchAll(/data-a="\$\{[^}]*\}"/g)) for (const n of m[0].matchAll(/"([a-z0-9][a-z0-9-]*)"/g)) namen.add(n[1]); // data-a="${a ? "x" : "y"}"
    for (const m of q.matchAll(/aktion:\s*"([a-z0-9][a-z0-9-]*)"/g)) namen.add(m[1]);
  }
  return namen;
}
const HEUTE = "2026-11-13";
test("F: Für jeden data-a-Namen aus js/screens gilt im Personal-Modus: erlaubt nur, wenn er in der Positivliste steht", () => {
  const namen = aktionsNamen(); assert.ok(namen.size > 150, "Namen gesammelt: " + namen.size);
  for (const n of namen) {
    if (n === "nav" || n === "tag-datum") continue; // hängen am Ziel bzw. am Datum, eigene Prüfung unten
    assert.equal(M.personalErlaubt(n, undefined, HEUTE), M.PERSONAL_ERLAUBT.has(n) && !M.PERSONAL_NIE.has(n), n);
    assert.equal(M.personalGesperrt(n, undefined, HEUTE), !M.PERSONAL_ERLAUBT.has(n), n);
  }
  // Ein Name, den es noch gar nicht gibt, ist gesperrt
  assert.equal(M.personalGesperrt("neue-aktion-xyz", undefined, HEUTE), true);
  assert.equal(M.personalGesperrt("testphase-code", undefined, HEUTE), true, "Audit P3 C2: stand nicht in der Sperrliste");
  assert.equal(M.personalGesperrt("modus", "buero", HEUTE), true);
  assert.equal(M.personalGesperrt("nav", "muell", HEUTE), false); assert.equal(M.personalGesperrt("nav", "buero", HEUTE), true); assert.equal(M.personalGesperrt("nav", "einstellungen", HEUTE), true); assert.equal(M.personalGesperrt("nav", "umsatzheute", HEUTE), true);
  assert.equal(M.personalGesperrt("tag-datum", HEUTE, HEUTE), false); assert.equal(M.personalGesperrt("tag-datum", "2026-11-12", HEUTE), true);
});
test("F: Die Positivliste öffnet nichts mit Euro, Büro oder Einstellungen – und jeder Eintrag kommt im Code vor", () => {
  const namen = aktionsNamen(); const app = fs.readFileSync(path.join(WURZEL, "js", "app.js"), "utf8");
  for (const n of M.PERSONAL_ERLAUBT) {
    assert.ok(!M.PERSONAL_NIE.has(n) && !M.PERSONAL_NIE_VORSILBEN.test(n), "in der Gegenliste: " + n);
    assert.ok(!/euro|buero|einstell|umsatz|export|sprache|pin-setzen|pin-entfernen|loeschen|einricht|stelle|person-|kosten|karte|lohn|preis|ordner|laden-|testphase|modus|menue|abschluss-fertig/.test(n) || /^(personal-|muell-personal)/.test(n), "verdächtiger Name: " + n);
    assert.ok(namen.has(n) || app.includes(`"${n}"`), "steht nirgends im Code (veralteter Eintrag?): " + n);
  }
  assert.ok(M.personalErlaubt("pp-haken", undefined, HEUTE) && M.personalErlaubt("muell-tipp", undefined, HEUTE) && M.personalErlaubt("station-speichern", undefined, HEUTE) && M.personalErlaubt("schloss", undefined, HEUTE));
});

// ───── G: Büro-Code nach 10 Fehlversuchen ─────
test("G: Nach 10 Fehlversuchen geht nur noch der Rettungscode – auch bei zwei Tage vorgestellter Uhr; der Rettungscode setzt den Zähler zurück", async () => {
  const w = {}; await M.pinSetzen(w, "1234"); const rettung = await R.rettungAnlegen(w); assert.ok(rettung);
  const t0 = Date.parse("2026-11-13T10:00:00Z"); const TAG = 86400000;
  for (let i = 1; i <= 9; i++) M.fehlversuch(w, t0);
  assert.equal(M.hartGesperrt(w), false, "9 Fehlversuche: nur Wartezeit"); assert.ok(M.sperreRest(w, t0 + 2 * TAG) === 0, "Wartezeit läuft nach zwei Tagen ab");
  M.fehlversuch(w, t0); assert.equal(M.hartGesperrt(w), true);
  for (const dt of [0, 60e3, 2 * TAG, 30 * TAG]) assert.ok(M.sperreRest(w, t0 + dt) > 0, `Uhr +${dt} ms: weiter gesperrt`);
  assert.ok(M.sperreRest(w, t0 - 5 * TAG) > 0, "auch bei zurückgestellter Uhr");
  assert.equal(await M.pinPruefen(w, "1234"), false, "der richtige Büro-Code zählt nicht mehr"); assert.equal(await M.pinPruefen(w, "0000"), false);
  assert.equal(w.pinSperre.fehler, 10, "pinPruefen selbst zählt nicht (das tut die Code-Abfrage)");
  // Rettungscode: Uhr zwei Tage vorgestellt, richtiger Code öffnet und setzt zurück
  const r = await R.rettungVersuch(w, rettung, { jetzt: t0 + 2 * TAG }); assert.deepEqual(r, { ok: true });
  assert.equal(w.pinSperre, undefined); assert.equal(M.hartGesperrt(w), false); assert.equal(M.sperreRest(w, t0 + 2 * TAG), 0);
  assert.equal(await M.pinPruefen(w, "1234"), true, "danach geht der Büro-Code wieder");
});
test("G: Ein richtiger Büro-Code setzt den Zähler zurück; ohne Rettungscode bleibt es bei der Wartezeit (sonst käme niemand mehr hinein)", async () => {
  const w = {}; await M.pinSetzen(w, "1234"); // kein Rettungscode
  for (let i = 0; i < 12; i++) M.fehlversuch(w, 0);
  assert.equal(M.hartGesperrt(w), false, "ohne Rettungscode keine harte Sperre"); assert.equal(M.sperreRest(w, 3 * 86400000), 0, "die Wartezeit läuft ab");
  assert.equal(await M.pinPruefen(w, "1234"), true); M.sperreLoesen(w); assert.equal(w.pinSperre, undefined);
  await R.rettungAnlegen(w); for (let i = 0; i < 4; i++) M.fehlversuch(w, 0); M.sperreLoesen(w); for (let i = 0; i < 9; i++) M.fehlversuch(w, 0);
  assert.equal(M.hartGesperrt(w), false, "der Zähler zählte nach dem Zurücksetzen neu");
});
test("G: falscher Rettungscode bei harter Sperre zählt weiter und bremst über die Uhr", async () => {
  const w = {}; await M.pinSetzen(w, "1234"); await R.rettungAnlegen(w); const t0 = 1e12;
  for (let i = 0; i < 10; i++) M.fehlversuch(w, t0);
  const r = await R.rettungVersuch(w, "AAAA-BBBB-CCCC", { jetzt: t0 + 1e9 }); assert.equal(r.fehler, true); assert.equal(w.pinSperre.fehler, 11); assert.ok(r.dauer > 0);
  assert.ok((await R.rettungVersuch(w, "AAAA-BBBB-CCCC", { jetzt: t0 + 1e9 + 1000 })).gesperrt > 0, "kurz danach: Wartezeit");
  assert.equal(M.hartGesperrt(w), true);
});
