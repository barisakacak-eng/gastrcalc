// Laden-Umbau (20.10.2026): höchstens 15 Wörter, eine Haupthandlung je Laden-Bildschirm. Geprüft wird das Verhalten hinter den neuen
// Bildschirmen: „Umsatz heute“ (Rückfrage über 100.000 €, gleiche Speicherung wie das Büro), Sicherung („Nur auf diesem Handy“ zählt nicht,
// „Ohne Fotos“ lässt die Ablage weg), Putzplan ohne Geräte-Auswahl im Laden, Kühl-Rundgang mit vorbelegtem Namen.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
globalThis.document ??= { documentElement: {} };
import { idbAttrappe } from "./hilfe/idb_attrappe.mjs";
const st = await import("../js/store.js");
const zip = await import("../js/zip.js");
const { ablegen } = await import("../js/ablage.js");
const i18n = await import("../js/i18n.js"); i18n.setzeSprache("de");
const { heute, heuteGeschaeft } = await import("../js/util.js");
const { umsatzEintrag, tagPlus } = await import("../js/engine.js");
const LZ = await import("../js/laden_zahlen.js");
const UL = await import("../js/screens/umsatz_laden.js");
const { sicherungStufe, sicherungOrtSetzen } = await import("../js/sicherung_stufe.js");
const { planSicherstellen, planVon } = await import("../js/putzplan.js");
const { GERAETE_JE_ART } = await import("../js/data/putzplan.js");
const { navKontext } = await import("../js/screens/nav.js");

const H = heute();
const laden = () => { const s = st.leererBetrieb(); s.phase = "app"; s.betrieb.name = "Test"; return s; };
const wurzelVon = (s) => { const w = st.leereWurzel(); w.betriebe = [s]; w.aktiv = s.id; w.modus = "laden"; return w; };
const el = (dataset = {}) => ({ dataset });

// ---------- Umsatz heute ----------
test("Umsatz heute: Prüfung – leer, ungültig, normal, über 100.000 € nur mit Bestätigung", () => {
  assert.equal(LZ.UMSATZ_RUECKFRAGE_AB, 100000);
  assert.deepEqual(LZ.umsatzHeutePruefen(""), { status: "leer", betrag: null });
  assert.equal(LZ.umsatzHeutePruefen("abc").status, "ungueltig");
  assert.deepEqual(LZ.umsatzHeutePruefen("1.284,50"), { status: "ok", betrag: 1284.5 });
  assert.deepEqual(LZ.umsatzHeutePruefen("100000"), { status: "ok", betrag: 100000 }, "genau die Grenze: keine Rückfrage");
  assert.deepEqual(LZ.umsatzHeutePruefen("150000"), { status: "rueckfrage", betrag: 150000 });
  assert.deepEqual(LZ.umsatzHeutePruefen("150000", { bestaetigt: true }), { status: "ok", betrag: 150000 });
});

test("Umsatz heute: über 100.000 € fragt der Bildschirm einmal nach (Stimmt das? Ja/Ändern), speichert erst nach „Ja“ – ohne alert()", () => {
  globalThis.alert = () => { throw new Error("alert() darf nicht kommen"); };
  const s = laden(); const w = wurzelVon(s); navKontext(s, w, "umsatzheute"); UL.umsatzLadenZuruecksetzen();
  let html = UL.umsatzLadenView(s);
  assert.ok(html.includes('data-f="ul-umsatz"') && html.includes('inputmode="decimal"'), "großes Zahlfeld"); // 27.10.2026: Untertitel „Aus der Kasse“ entfällt (15-Wörter-Regel)
  assert.ok(!html.includes("umsatz-basis") && !/netto/i.test(html), "brutto/netto-Schalter bleibt im Büro"); // 27.10.2026: „Lohn brutto“ beim Personal ist erlaubt
  assert.equal(UL.umsatzLadenEingabe("ul-umsatz", "150000"), "entwurf");
  assert.equal(UL.umsatzLadenAktion("ul-speichern", el(), s, w), "zeichnen");
  assert.equal(umsatzEintrag(s, heuteGeschaeft()), null, "noch nicht gespeichert");
  html = UL.umsatzLadenView(s);
  assert.ok(html.includes("Stimmt das?") && html.includes("150.000,00") && html.includes('data-a="ul-ja"') && html.includes('data-a="ul-aendern"'));
  assert.ok(!html.includes('data-a="ul-speichern"'), "während der Rückfrage nur Ja/Ändern");
  // „Ändern“: zurück ins Feld, nichts gespeichert
  assert.equal(UL.umsatzLadenAktion("ul-aendern", el(), s, w), "zeichnen"); assert.equal(umsatzEintrag(s, heuteGeschaeft()), null);
  assert.ok(UL.umsatzLadenView(s).includes('value="150000"'), "der getippte Wert bleibt zum Korrigieren");
  // nochmal, dann „Ja“
  assert.equal(UL.umsatzLadenAktion("ul-speichern", el(), s, w), "zeichnen");
  const r = UL.umsatzLadenAktion("ul-ja", el(), s, w);
  assert.equal(r.gespeichert, true); assert.equal(umsatzEintrag(s, heuteGeschaeft()).umsatz, 150000);
  assert.ok(!UL.umsatzLadenView(s).includes("Stimmt das?"), "nur einmal gefragt");
});

test("Umsatz heute: normaler Betrag speichert sofort, am Geschäftstag, festgeschrieben – wie die Eingabe im Büro", () => {
  const s = laden(); const w = wurzelVon(s); w.geraet = "g-1"; UL.umsatzLadenZuruecksetzen();
  UL.umsatzLadenEingabe("ul-umsatz", "1.284,50");
  const r = UL.umsatzLadenAktion("ul-speichern", el(), s, w);
  assert.equal(r.gespeichert, true);
  const e = umsatzEintrag(s, heuteGeschaeft()); assert.equal(e.umsatz, 1284.5); assert.equal(e.datum, heuteGeschaeft());
  assert.equal(e.entwurf, undefined, "festgeschrieben (kein Entwurf mehr)"); assert.equal(e.geraet, "g-1"); assert.equal(e.nacherfasst, false);
  // Korrektur: neuer Eintrag, der alte bleibt sichtbar (storniert, zeigt auf den neuen)
  UL.umsatzLadenEingabe("ul-umsatz", "1300"); UL.umsatzLadenAktion("ul-speichern", el(), s, w);
  assert.equal(umsatzEintrag(s, heuteGeschaeft()).umsatz, 1300); assert.equal(s.tagesnotizen.filter((n) => n.storniert).length, 1);
  // leeres Feld tut nichts, ungültige Zahl meldet sich
  UL.umsatzLadenEingabe("ul-umsatz", ""); assert.ok(UL.umsatzLadenAktion("ul-speichern", el(), s, w).meldung, "Nachtest 27.10.: leeres Feld sagt Bescheid");
  UL.umsatzLadenEingabe("ul-umsatz", "12,3,4"); assert.ok(UL.umsatzLadenAktion("ul-speichern", el(), s, w).meldung);
  // Geschäftstag bis 4 Uhr: umsatzHeuteSpeichern nimmt standardmäßig heuteGeschaeft()
  const s2 = laden(); LZ.umsatzHeuteSpeichern(s2, 500, { datum: tagPlus(H, -1) });
  assert.equal(umsatzEintrag(s2, tagPlus(H, -1)).umsatz, 500);
  assert.equal(heuteGeschaeft(new Date(2026, 9, 21, 2, 30)), "2026-10-20", "02:30 gehört zum Vortag");
});

// ---------- Sicherung ----------
test("Sicherung: „Nur auf diesem Handy“ setzt die Erinnerung NICHT zurück, „Anderes Gerät, Mail, Cloud“ schon", () => {
  const s = laden(); for (let i = 0; i < 6; i++) s.tagesnotizen.push({ id: "n" + i, datum: tagPlus(H, -i), umsatz: 100, erfasst: new Date().toISOString(), storniert: false });
  const w = wurzelVon(s); w.letzteSicherung = new Date(Date.now() - 9 * 86400e3).toISOString(); w.sicherungZaehler = 0;
  const vorher = w.letzteSicherung;
  assert.equal(sicherungStufe(w).stufe, "rot"); assert.equal(sicherungStufe(w).tage, 9);
  assert.equal(sicherungOrtSetzen(w, "handy"), false);
  assert.equal(w.letzteSicherung, vorher, "letzteSicherung unverändert"); assert.equal(w.sicherungZaehler, 0, "Zähler unverändert");
  assert.equal(sicherungStufe(w).stufe, "rot", "Erinnerung läuft weiter");
  assert.equal(sicherungOrtSetzen(w, "irgendwas"), false); assert.equal(w.letzteSicherung, vorher);
  assert.equal(sicherungOrtSetzen(w, "woanders"), true);
  assert.notEqual(w.letzteSicherung, vorher); assert.equal(w.sicherungZaehler, st.eintraegeZaehlen(w));
  assert.equal(sicherungStufe(w).stufe, null, "Erinnerung zurückgesetzt"); assert.equal(sicherungStufe(w).tage, 0);
  // app.js setzt letzteSicherung nur über sicherungOrtSetzen (nicht mehr gleich nach dem Teilen)
  const app = fs.readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  const teilen = app.slice(app.indexOf("async function sicherungTeilen("), app.indexOf("// Einlesen führt zusammen:"));
  assert.ok(!/letzteSicherung\s*=/.test(teilen) && !/sicherungZaehler\s*=/.test(teilen), "Teilen allein zählt nicht als Sicherung");
  assert.ok(teilen.includes("ortFrageZeigen()"), "nach dem Teilen kommt die Frage „Wo liegt sie jetzt?“");
  assert.match(app, /sicherungOrtSetzen\(wurzel, el\.dataset\.wert\)/);
});

test("Sicherung: „Ohne Fotos“ lässt die abgelegten Fotos weg, sonst sind sie drin; app.js reicht mitAblage durch", async () => {
  idbAttrappe(); await st.laden();
  const s = laden(); const w = wurzelVon(s);
  const meta = await ablegen(new Blob([new Uint8Array(2048).fill(7)], { type: "image/jpeg" }), { name: "beleg.jpg", zweck: "rechnung", laden: s.id });
  const mit = await st.exportDatei(w);
  const ohne = await st.exportDatei(w, { mitAblage: false });
  const namen = async (b) => (await zip.zipLesen(b)).map((e) => e.name);
  assert.ok((await namen(mit.blob)).includes("ablage/" + meta.id), "mit Fotos: Foto in der Datei");
  assert.ok(!(await namen(ohne.blob)).some((n) => n.startsWith("ablage/")), "ohne Fotos: keine Ablage-Datei");
  assert.ok(ohne.groesse < mit.groesse, "ohne Fotos ist die Datei kleiner");
  assert.equal(ohne.dateien, 0);
  const r = await st.importSicherung(ohne.blob); assert.equal(r.pruefsumme, "ok", "die kleine Datei lässt sich einlesen");
  // mit Passwort und ohne Fotos zusammen
  const beides = await st.exportDatei(w, { mitAblage: false, passwort: "laden2026" }); assert.equal(beides.verschluesselt, true);
  const app = fs.readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.match(app, /exportDatei\(wurzel, \{ passwort, mitAblage \}\)/, "app.js reicht „Ohne Fotos“ an exportDatei durch");
  assert.match(app, /sicherungTeilen\((p|null), \{ mitAblage: !w\.ohneFotos \}\)/);
});

test("Sicherung: Blatt hat „Mit Passwort“ vorgewählt und „Ohne Fotos“ als Schalter (Texte in allen Sprachen)", () => {
  const eb = fs.readFileSync(new URL("../js/screens/ebene.js", import.meta.url), "utf8");
  assert.match(eb, /pw = \{ zweck, sichtbar: false, mitPasswort: true, ohneFotos: false \}/, "Passwort vorgewählt");
  assert.ok(eb.includes('schalter("sicherung-pw-schalter", true') && eb.includes('schalter("sicherung-fotos-schalter", false'));
  assert.equal(i18n.t("ladenSchirm.sicherung.letzteWeg", 9), "Zuletzt gesichert: vor 9 Tagen");
  assert.equal(i18n.t("ladenSchirm.sicherung.letzteWeg", 1), "Zuletzt gesichert: vor 1 Tag");
});

// ---------- Putzen ----------
test("Putzen im Laden: ohne Plan wird still der Vorschlag nach Laden-Art übernommen, keine Geräte-Auswahl, keine Rechtsgrundlage", async () => {
  const s = laden(); s.ladenArt = "doener"; const w = wurzelVon(s); navKontext(s, w, "putzplan");
  const P = await import("../js/screens/putzplan.js"); P.putzplanZuruecksetzen();
  const leer = P.putzplanView(s);
  assert.ok(!leer.includes('data-a="pp-geraet"') && !leer.includes("852/2004"), "Laden ohne Plan: keine Einrichtung");
  assert.equal(planSicherstellen(s), true);
  const p = planVon(s); assert.equal(p.aktiv, true);
  for (const g of GERAETE_JE_ART.doener) assert.ok(p.geraete.includes(g), g);
  assert.equal(planSicherstellen(s), false, "zweites Mal nichts");
  const html = P.putzplanView(s);
  assert.ok(!html.includes('data-a="pp-geraet"') && !html.includes("Was hast du im Laden") && !html.includes("852/2004"));
  // 27.10.2026 Schablone: kein „0 / 20“ mehr im Titel – Zeki sagt in einem Satz, was heute dran ist
  assert.match(html, /<h1>Putzen<\/h1>/); assert.match(html, /class="zeki-zeile/); assert.ok(html.includes("pbild"), "jede Aufgabe mit Bild");
  assert.ok(!html.includes('data-wert="einrichten"'), "Anpassen nur im Büro");
  const buero = P.putzplanView(s, { buero: true });
  assert.ok(buero.includes('data-wert="einrichten"'), "Büro: Anpassen (Geräte-Auswahl)");
  // im Büro ohne Plan: Einrichtung mit Geräte-Auswahl
  const s2 = laden(); s2.ladenArt = "pizza"; P.putzplanZuruecksetzen();
  assert.ok(P.putzplanView(s2, { buero: true }).includes('data-a="pp-geraet"'));
  // app.js übernimmt den Vorschlag nur im Laden-Modus beim Betreten
  const app = fs.readFileSync(new URL("../js/app.js", import.meta.url), "utf8");
  assert.match(app, /ziel === "putzplan" && modus\(wurzel\) === "laden" && planSicherstellen\(stand\)/);
});

// ---------- Kühlung ----------
test("Kühlung im Laden: „Rundgang starten“ springt mit vorbelegtem Namen direkt zur ersten Stelle; keine Dauerhinweise", async () => {
  const K = await import("../js/screens/kuehl.js");
  const s = laden(); const w = wurzelVon(s); navKontext(s, w, "kuehl");
  s.kuehlstellen = [{ id: "k1", name: "Kühlschrank", art: "kuehl", min: 0, max: 7, reihe: 0, archiviert: false }, { id: "k2", name: "Tiefkühler", art: "tk", max: -18, reihe: 1, archiviert: false }];
  s.kuehl = { ...s.kuehl, eingerichtet: true, seit: tagPlus(H, -10) };
  s.personen = [{ id: "p1", kuerzel: "BA", aktiv: true }, { id: "p2", kuerzel: "CD", aktiv: true }];
  K.kuehlZuruecksetzen();
  let html = K.kuehlView(s);
  for (const weg of ["Eine Stelle antippen", "Heute noch nicht gemessen", "ohne Messung in den letzten 7", "Du bleibst verantwortlich", "kuehl-blatt"]) assert.ok(!html.includes(weg), weg);
  // 27.10.2026 Schablone: Zeki sagt in einem Satz, was zu tun ist (statt „Heute gemessen 0 / 2“)
  assert.ok(html.includes("Noch 2 Geräte messen") && html.includes("zeki-zeile") && html.includes("Rundgang starten") && html.includes('data-a="kuehl-rundgang-los"'));
  assert.ok(!html.includes('<small class="rot">'), "Grenze nur bei Abweichung");
  const bh = K.kuehlView(s, { buero: true }); assert.ok(bh.includes("ohne Messung in den letzten 7") && bh.includes('data-a="kuehl-blatt"'), "Büro: 7-Tage-Lücken und Monatsblatt");
  assert.equal(LZ.kuehlWerVorschlag(s), "p1", "ohne früheren Rundgang: erste Person");
  assert.equal(K.kuehlAktion("kuehl-rundgang-los", el(), s, w), true);
  const r = s.rundgaenge.find((x) => !x.abgeschlossen); assert.equal(r.von, "p1"); assert.equal(r.datum, H);
  html = K.kuehlView(s); assert.ok(html.includes('data-f="station-wert"') && html.includes("Kühlschrank"), "gleich die erste Stelle zum Tippen");
  assert.ok(html.includes('data-a="rg-von"'), "wer misst, mit einem Tipp änderbar");
  assert.equal(K.kuehlAktion("rg-von", el({ id: "p2" }), s, w), true); assert.equal(r.von, "p2");
  // letzter Rundgang mit p2 → Vorschlag p2
  r.abgeschlossen = new Date().toISOString(); assert.equal(LZ.kuehlWerVorschlag(s), "p2");
  // Abweichung: Grenze steht an der Stelle
  s.messungen = [{ id: "m1", stelle: "k1", datum: H, zeit: H + "T08:00:00.000Z", wert: 9, min: 0, max: 7, abweichung: true, massnahmen: [], notiz: "", nachkontrolle: null, erfasst: H + "T08:00:00.000Z", nacherfasst: false, storniert: false, rundgang: r.id }];
  K.kuehlZuruecksetzen(); html = K.kuehlView(s); assert.ok(/<small class="rot">[^<]*≤/.test(html) && html.includes("zeileknopf abw"), "Grenze bei Abweichung sichtbar");
});

test("Kühlung: die Lücken der letzten 7 Tage stehen im Büro (Offen-Chip), nicht im Laden", async () => {
  const { offenImBuero } = await import("../js/offen.js");
  const s = laden(); s.kuehlstellen = [{ id: "k1", name: "Kühlschrank", art: "kuehl", min: 0, max: 7, reihe: 0, archiviert: false }];
  s.kuehl = { ...s.kuehl, eingerichtet: true, seit: tagPlus(H, -20) };
  const w = wurzelVon(s); w.letzteSicherung = new Date().toISOString();
  const chip = offenImBuero(s, w).find((x) => x.id === "kuehlLuecken");
  assert.ok(chip && /ohne Messung in den letzten 7/.test(chip.text)); assert.deepEqual(chip.ziel, { aktion: "nav", wert: "kuehl" });
});

// ---------- Müll und Tag abschließen ----------
test("Müll: rote Summenleiste „Müll heute“, keine Erklärzeile, keine Mengen unter den Fotos", async () => {
  const M = await import("../js/screens/muell.js");
  const s = laden(); s.gerichte = [{ id: "a", name: "Döner", klasse: "haupt", preis: 7, zutaten: [] }]; const w = wurzelVon(s); navKontext(s, w, "muell");
  M.muellZuruecksetzen(); const html = M.muellView(s);
  assert.ok(html.includes('class="heutewert muellsumme"') && html.includes("<h1>Müll heute</h1>"));
  assert.ok(!html.includes("Foto antippen") && !html.includes("muell-anleitung"));
  assert.ok(!/<span class="wt"><b>[^<]*<\/b><small>/.test(html), "keine Mengen-Unterzeile");
});

test("Tag abschließen: drei antippbare Zeilen und ein Knopf, ohne die zwei Erklärsätze", async () => {
  const A = await import("../js/screens/abschluss.js");
  const s = laden(); s.kuehlstellen = [{ id: "k1", name: "Kühlschrank", art: "kuehl", min: 0, max: 7, reihe: 0, archiviert: false }]; s.kuehl = { ...s.kuehl, eingerichtet: true };
  const w = wurzelVon(s); navKontext(s, w, "abschluss"); A.abschlussZuruecksetzen();
  LZ.umsatzHeuteSpeichern(s, 1284.5);
  const html = A.abschlussView(s);
  assert.equal((html.match(/class="zeileknopf ab-zeile/g) || []).length, 3);
  assert.ok(/1\.284,50\s€/.test(html) && html.includes('data-wert="umsatzheute"') && html.includes('data-a="kuehl-rundgang-start"'));
  assert.ok(html.includes('<span class="rot">\u20660 / 1\u2069</span>'), "Kühlung offen = rot");
  for (const weg of [i18n.t("abschluss.hinweis"), i18n.t("abschluss.ohneUmsatz")]) assert.ok(!html.includes(weg), weg);
  assert.equal((html.match(/data-a="abschluss-fertig"/g) || []).length, 1);
});
