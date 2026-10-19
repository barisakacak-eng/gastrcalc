// Drei Ebenen (15.10.2026, Entwickler B): Laden „Heute“ – „Jetzt dran“ nur aus der festen Liste, alles andere in „Offen im Büro“;
// Preis-Blatt der Laden-Karte rechnet über engine.preisAmpel (gleiche Ampel wie die Kalkulation).
import test from "node:test";
import assert from "node:assert/strict";
globalThis.document ??= { documentElement: {} };
import { leererBetrieb } from "../js/store.js";
import { heute } from "../js/util.js";
import { jetztDran, offenImBuero, istHauptzeit } from "../js/offen.js";
import { zielAttr } from "../js/screens/bausteine.js"; // Trennung (17.10.2026)
import { kalkulation, preisAmpel, tagPlus } from "../js/engine.js";
import { startView } from "../js/screens/home.js";
import { karteLadenView, karteLadenAktion, karteLadenZuruecksetzen, karteLadenEingabe, karteLadenTeile } from "../js/screens/karte_laden.js";
import { navKontext } from "../js/screens/nav.js";

const um = (hh, mm = 0) => { const d = new Date(); d.setHours(hh, mm, 0, 0); return d; };
const H = heute();
const wurzelVon = (s, tage = 1) => ({ betriebe: [s], letzteSicherung: new Date(Date.now() - tage * 86400e3).toISOString(), sicherungZaehler: 0 });
const laden = () => { const s = leererBetrieb(); s.phase = "app"; s.betrieb.name = "Test"; return s; };
const mitKuehlung = (s) => {
  s.kuehlstellen = [{ id: "k1", name: "Saladette", art: "kuehl", min: 0, max: 7, reihe: 0, archiviert: false }, { id: "k2", name: "Kühlschrank", art: "kuehl", min: 0, max: 7, reihe: 1, archiviert: false }];
  s.kuehl = { ...s.kuehl, eingerichtet: true, seit: tagPlus(H, -3) }; return s;
};
const messung = (stelle, wert, { abw = false, datum = H } = {}) => ({ id: stelle + wert + datum, stelle, datum, zeit: `${datum}T08:00:00.000Z`, wert, min: 0, max: 7, abweichung: abw, massnahmen: [], notiz: "",
  nachkontrolle: abw ? { art: "h2", faellig: new Date(Date.now() + 3600e3).toISOString() } : null, erfasst: `${datum}T08:00:00.000Z`, nacherfasst: false, storniert: false, rundgang: "r" });

test("Jetzt dran: ohne Anlass gar keine Karte (kein „Alles erledigt“, keine Einrichtung, kein Kosten-Hinweis)", () => {
  const s = laden(); s.gerichte = [{ id: "a", name: "Döner", klasse: "haupt", preis: null, zutaten: [] }];
  assert.equal(jetztDran(s, wurzelVon(s), { jetzt: um(10) }), null);
  assert.equal(jetztDran(s, wurzelVon(s), { jetzt: um(16) }), null);
});

test("Jetzt dran 1: Kühlwert außerhalb der Grenze → rot, mit Stellenname und „Nachmessen“ – schlägt alles andere", () => {
  const s = mitKuehlung(laden()); s.messungen = [messung("k1", 9, { abw: true }), messung("k2", 4)];
  s.putzplan = { aktiv: true, geraete: [], aus: [], seit: tagPlus(H, -60) }; // überfälliges Putzen wäre auch da
  const d = jetztDran(s, wurzelVon(s, 30), { jetzt: um(19) });
  assert.equal(d.id, "kuehlAlarm"); assert.equal(d.ton, "rot"); assert.match(d.titel, /Saladette/); assert.equal(d.knopf, "Nachmessen");
  assert.deepEqual(d.ziel, { aktion: "nav", wert: "kuehl" });
});

test("Jetzt dran 2: Kühlrundgang offen – angefangen immer, sonst morgens bis 15 Uhr und abends ab 17 Uhr", () => {
  const s = mitKuehlung(laden());
  assert.equal(jetztDran(s, wurzelVon(s), { jetzt: um(9) }).id, "rundgang");
  assert.equal(jetztDran(s, wurzelVon(s), { jetzt: um(16) }), null);
  assert.equal(jetztDran(s, wurzelVon(s), { jetzt: um(17, 30) }).id, "rundgang");
  s.rundgaenge = [{ id: "r", datum: H, abgeschlossen: null, messungen: [] }];
  const d = jetztDran(s, wurzelVon(s), { jetzt: um(16) });
  assert.equal(d.id, "rundgangOffen"); assert.equal(zielAttr(d.ziel), 'data-a="kuehl-rundgang-start" data-offen="0"');
  s.rundgaenge = []; s.messungen = [messung("k1", 4), messung("k2", 5)]; // alle gemessen
  assert.equal(jetztDran(s, wurzelVon(s), { jetzt: um(9) }), null);
});

test("Jetzt dran 3: Putzaufgabe überfällig", () => {
  const s = laden(); s.putzplan = { aktiv: true, geraete: [], aus: [], seit: tagPlus(H, -60) };
  const d = jetztDran(s, wurzelVon(s), { jetzt: um(10) });
  assert.equal(d.id, "putzen"); assert.deepEqual(d.ziel, { aktion: "nav", wert: "putzplan" });
});

test("Jetzt dran 4: Sicherung älter als 7 Tage – nur außerhalb der Hauptzeiten", () => {
  const s = laden(); const w = wurzelVon(s, 9);
  assert.equal(jetztDran(s, w, { jetzt: um(10) }).id, "sicherung");
  assert.equal(jetztDran(s, w, { jetzt: um(12, 15) }), null); // Mittagsgeschäft
  assert.equal(jetztDran(s, w, { jetzt: um(17, 45) }), null); // Abendgeschäft
  assert.equal(jetztDran(s, wurzelVon(s, 4), { jetzt: um(10) }), null); // gelb (3 Tage) meldet nur das Büro
  assert.ok(istHauptzeit(11.5) && istHauptzeit(20.4) && !istHauptzeit(14) && !istHauptzeit(20.5));
});

test("Jetzt dran 5: ab 18 Uhr „Tag abschließen“, danach nicht mehr", () => {
  const s = laden();
  assert.equal(jetztDran(s, wurzelVon(s), { jetzt: um(17, 59) }), null);
  assert.equal(jetztDran(s, wurzelVon(s), { jetzt: um(18, 5) }).id, "abschluss");
  s.abschluesse = [{ id: "a", datum: H, erfasst: new Date().toISOString(), storniert: false }];
  assert.equal(jetztDran(s, wurzelVon(s), { jetzt: um(18, 5) }), null);
});

test("Offen im Büro: Einrichtung, Kosten, graue Karte, Putzplan, Sicherung, neue Fassung – mit Ziel, nichts davon im Laden", () => {
  const s = laden(); s.gerichte = [{ id: "a", name: "Döner", klasse: "haupt", preis: null, zutaten: [] }];
  const w = wurzelVon(s, 4);
  const liste = offenImBuero(s, w, { aktualisierung: true });
  const ids = liste.map((x) => x.id);
  assert.equal(ids[0], "fassung");
  for (const id of ["einrichtung", "kosten", "karteGrau", "putzplan", "sicherung"]) assert.ok(ids.includes(id), id + " fehlt in " + ids);
  for (const x of liste) { assert.equal(typeof x.text, "string"); assert.ok(x.text.length > 3, x.id); assert.ok(x.ziel && x.ziel.aktion, x.id); assert.match(zielAttr(x.ziel), /^data-a="/); }
  assert.deepEqual(liste.find((x) => x.id === "karteGrau").ziel, { aktion: "nav", wert: "kartebuero" });
  assert.match(liste.find((x) => x.id === "sicherung").text, /4/);
  // Was der Laden melden darf, steht nicht doppelt im Büro
  for (const id of ["kuehlAlarm", "rundgang", "putzen", "abschluss"]) assert.ok(!ids.includes(id));
});

test("Laden „Heute“: höchstens eine Jetzt-dran-Karte, kein Ring, kein Spruch, keine Monatskurve, ≤ 15 Wörter", () => {
  const s = mitKuehlung(laden()); s.messungen = [messung("k1", 9, { abw: true })];
  s.kosten = [{ id: "k", kategorie: "miete", posten: "miete", betrag: 2000, status: "bekannt", periode: "monat", basis: "netto" }];
  navKontext(s, wurzelVon(s));
  const html = startView(s, { wurzel: wurzelVon(s), jetzt: um(19) });
  const inhalt = html.slice(0, html.indexOf("</div>\n    <header") > 0 ? html.indexOf("</div>\n    <header") : html.length);
  assert.equal((inhalt.match(/class="jetzt /g) || []).length, 1);
  for (const weg of ["ring", "spruch", "monatkarte", "einrichtung", "abzeichen"]) assert.ok(!inhalt.includes(weg), weg);
  // Paket 3 (16.10.2026), M15/E2: „≈“ vor der großen Zahl ist erlaubt (Richtwert), die Kupferzeile „Richtwert · Preise eintragen ›“ zählt getrennt (≤ 3 Wörter)
  const richtwert = inhalt.match(/<button type="button" class="h-richtwert"[^>]*>(.*?)<\/button>/)?.[1] || "";
  const ohne = inhalt.replace(/<button type="button" class="h-richtwert"[^>]*>.*?<\/button>/, "");
  const zaehlen = (h) => h.replace(/<div class="h-zeitzeile">.*?<\/div>/s, "").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").split(/\s+/).filter((w) => w && !/[0-9€–·%/≈›]/.test(w) && !["Saladette"].includes(w));
  const woerter = zaehlen(ohne);
  assert.ok(woerter.length <= 15, `${woerter.length} Wörter: ${woerter.join(" ")}`);
  assert.ok(zaehlen(richtwert).length <= 3, richtwert);
  assert.ok(inhalt.includes("h-richtwert") && inhalt.includes("≈ "), "ohne Einkaufspreise: Richtwert-Zeile und ≈ vor der Zahl");
});

test("Preis-Blatt: preisAmpel = Ampel und DB der Kalkulation; −/+ in 10-Cent-Schritten; Speichern setzt den Bruttopreis", () => {
  const s = laden();
  s.kosten = [{ id: "k", kategorie: "miete", posten: "miete", betrag: 1500, status: "bekannt", periode: "monat", basis: "netto" }];
  s.team = { personen: 1, stundenProPerson: 160, lohnkosten: 1000, eigenerLohn: 0, eigenerLohnStatus: "eigen" };
  s.gerichte = [{ id: "a", name: "Döner", klasse: "haupt", zeit: 4, preis: 7.5, steuer: 0.07, mengeTag: 60, zutaten: [{ name: "Fleisch", menge: 150, einheit: "g" }] },
    { id: "b", name: "Ayran", klasse: "getraenk", zeit: 0, preis: null, steuer: 0.19, zutaten: [] }];
  s.artikel = [{ name: "Fleisch", gruppe: "fleisch", einheit: "kg", packung: { menge: 1, einheit: "kg" }, preis: 12, preisBasis: "netto", benutzt: true }];
  const z = kalkulation(s).zeilen[0];
  const a = preisAmpel(z, z.preisBrutto); assert.equal(a.ampel, z.ampel); assert.ok(Math.abs(a.db - z.db) < 1e-9);
  assert.equal(preisAmpel(z, Math.ceil(z.sk / 0.8 * (1 + z.mwst) * 100) / 100).ampel, "gruen"); // 20 % Gewinn nach allen Kosten
  assert.equal(preisAmpel(z, 0.5).ampel, "rot");
  assert.equal(preisAmpel({}, 5).ampel, "grau");

  navKontext(s, wurzelVon(s)); karteLadenZuruecksetzen();
  const html = karteLadenView(s);
  assert.equal((html.match(/data-a="kl-auf"/g) || []).length, 2);
  for (const weg of ["Wareneinsatz", "Rezept", "Selbstkosten", "%"]) assert.ok(!html.replace(/<[^>]+>/g, "").includes(weg), weg);
  const el = (d) => ({ dataset: d });
  assert.equal(karteLadenAktion("kl-auf", el({ id: "a" }), s), true);
  assert.equal(karteLadenAktion("kl-plus", el({}), s), "blatt"); karteLadenAktion("kl-plus", el({}), s); karteLadenAktion("kl-minus", el({}), s);
  assert.match(karteLadenView(s), /value="7,60"/);
  assert.equal(karteLadenEingabe("kl-preis", "8,40"), "teil");
  assert.match(karteLadenTeile(s).bleibt, /kl-bleibt a-/);
  const r = karteLadenAktion("kl-speichern", el({}), s);
  assert.equal(r.gespeichert, true); assert.equal(s.gerichte[0].preis, 8.4); assert.equal(r.vorher, 7.5);
  // Gericht ohne Preis: Blatt startet beim Zielpreis (oder 0), Speichern erst mit Preis > 0
  karteLadenAktion("kl-auf", el({ id: "b" }), s); assert.match(karteLadenView(s), /kl-speichern" disabled|disabled>/);
  karteLadenZuruecksetzen();
});

test("Laden-Karte: Filter „Zu billig“ zeigt nur rote Gerichte, lange Karten zeigen zuerst 60 Kacheln", () => {
  const s = laden();
  s.gerichte = Array.from({ length: 75 }, (_, i) => ({ id: "g" + i, name: "Gericht " + i, klasse: "haupt", preis: 5, steuer: 0.07, zutaten: [] }));
  navKontext(s, wurzelVon(s)); karteLadenZuruecksetzen();
  const html = karteLadenView(s);
  assert.equal((html.match(/data-a="kl-auf"/g) || []).length, 60);
  assert.match(html, /data-a="kl-alle"/);
  karteLadenAktion("kl-alle", { dataset: {} }, s);
  assert.equal((karteLadenView(s).match(/data-a="kl-auf"/g) || []).length, 75);
  karteLadenAktion("kl-filter", { dataset: { wert: "billig" } }, s); // keine roten → bleibt bei „Alle“
  assert.equal((karteLadenView(s).match(/data-a="kl-auf"/g) || []).length, 75);
  karteLadenZuruecksetzen();
});

// ---------- Schwadron 18.10.2026 (30-Tage-Lauf): N2 ----------
test("Schwadron N2: am Ruhetag zeigt die Kühl-Kachel „Ruhetag“ statt „3 offen“, „Jetzt dran“ fordert keinen Rundgang", async () => {
  const stamm = await import("../js/stamm.js"); const E = await import("../js/engine.js"); const LZ = await import("../js/laden_zahlen.js");
  const s = leererBetrieb(); s.phase = "app";
  for (const n of ["Kühlschrank", "Saladette", "Tiefkühler"]) stamm.kuehlstelleAnlegen(s, { name: n, art: n === "Tiefkühler" ? "tk" : "kuehl" }); stamm.kuehlEingerichtetSetzen(s);
  const K = heute(); E.ruhetageSetzen(s, [E.wochentag(K)], tagPlus(K, -14)); // heute ist Ruhetag
  assert.deepEqual(LZ.heuteKachelZahlen(s, E.kuehlStatus(s), K, K).kuehl, { art: "ruhetag", alarm: false });
  const morgens = new Date(); morgens.setHours(9, 0, 0, 0);
  assert.notEqual(jetztDran(s, null, { jetzt: morgens })?.id, "rundgang");
  E.ruhetageSetzen(s, [(E.wochentag(K) + 1) % 7], K); // kein Ruhetag mehr: wieder „3 offen“
  assert.equal(LZ.heuteKachelZahlen(s, E.kuehlStatus(s), K, K).kuehl.art, "offen");
  assert.equal(jetztDran(s, null, { jetzt: morgens })?.id, "rundgang");
});
