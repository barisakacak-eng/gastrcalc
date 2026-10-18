// Menütafel (18.10.2026), Stufe 2 ohne Server: Gruppierung, Preisformat, Ausschankmenge (§ 13 PAngV) mit Büro-Hinweis statt Raten,
// Aktion mit Laufzeit, Ausblenden abgelaufener Aktionen durch die EINGEBETTETE Funktion (aus der Datei gelesen und einzeln geprüft),
// Export als eine Datei ohne Verweise nach außen, Sprache der Tafel, Migration/Sicherung/Zusammenführen der Aktionen, Büro und Personal.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { idbAttrappe } from "./hilfe/idb_attrappe.mjs";
globalThis.document ??= { documentElement: {} };
const st = await import("../js/store.js");
const T = await import("../js/tafel.js");
const { beispielLaden } = await import("../js/beispiel.js");
const { GESCHAEFTSTAG_BIS_STUNDE } = await import("../js/util.js");
const i18n = await import("../js/i18n.js");
i18n.setzeSprache("de");
const HIER = path.dirname(fileURLToPath(import.meta.url));
const H = "2026-10-18"; // Sonntag
const JETZT = "2026-10-18T12:30:00.000Z";
const EURO = /^\d{1,3}(\.\d{3})*,\d\d\s€$/; // „8,00 €“ (deutsches Format, geschütztes Leerzeichen)

function laden() {
  const s = st.leererBetrieb(); s.phase = "app"; s.betrieb.name = "Imbiss Ecke";
  s.gerichte = [
    { id: "d1", name: "Döner", preis: 7.5, klasse: "haupt", steuer: 0.07, zutaten: [] },
    { id: "d2", name: "Dürüm", preis: 8, klasse: "haupt", steuer: 0.07, zutaten: [] },
    { id: "p1", name: "Pommes", preis: 3, klasse: "kleinigkeit", steuer: 0.07, zutaten: [] },
    { id: "c1", name: "Cola 0,33 l", preis: 2.5, klasse: "getraenk", steuer: 0.19, zutaten: [] },
    { id: "a1", name: "Ayran", preis: 2, klasse: "getraenk", steuer: 0.19, zutaten: [] },          // Menge fehlt
    { id: "w1", name: "Wasser", ausschank: "0.5l", preis: 2, klasse: "getraenk", steuer: 0.19, zutaten: [] }, // Menge im Feld
    { id: "x1", name: "Lahmacun", preis: null, klasse: "haupt", steuer: 0.07, zutaten: [] },        // ohne Preis
  ];
  return st.migrierenBetrieb(s);
}
const eingebettet = (html) => { const m = html.match(/var sichtbar=([\s\S]*?);var T=/); assert.ok(m, "eingebettete Funktion fehlt"); return new Function("return (" + m[1] + ")")(); };

test("Gruppierung: Speisen, Beilagen, Getränke in fester Reihenfolge; Spalten gleichmäßig; abgewählte Gruppe fehlt", () => {
  const b = T.tafelBeschreibung(laden(), { heuteTag: H, jetzt: JETZT });
  assert.deepEqual(b.gruppen.map((g) => g.gruppe), ["speisen", "beilagen", "getraenke"]);
  assert.deepEqual(b.gruppen.map((g) => g.titel), ["Speisen", "Beilagen & Snacks", "Getränke"]);
  assert.deepEqual(b.gruppen[0].eintraege.map((e) => e.name), ["Döner", "Dürüm"], "ohne Preis nicht auf der Tafel");
  assert.equal(b.seiten.length, 2); assert.deepEqual(b.seiten.map((s) => s.art), ["karte", "karte"]);
  assert.deepEqual(b.seiten[0].spalten.map((s) => s.gruppe), ["speisen", "beilagen"]);
  // Beispiel-Laden: 9 Speisen → 5 + 4, dann Beilagen | Getränke; vorne die Aktion
  const bsp = T.tafelBeschreibung(beispielLaden(H), { heuteTag: H, jetzt: JETZT });
  assert.deepEqual(bsp.seiten.map((s) => s.art === "aktionen" ? "A" + s.aktionen.length : s.spalten.map((x) => x.gruppe[0] + x.eintraege.length).join("|")), ["A1", "s5|s4", "b1|g4"]);
  assert.ok(bsp.seiten.every((s) => s.art !== "karte" || s.spalten.length <= T.SPALTEN_JE_SEITE && s.spalten.every((x) => x.eintraege.length <= T.ZEILEN_JE_SPALTE)));
  const s = laden(); assert.equal(T.tafelSetzen(s, "gruppe", "beilagen"), true);
  assert.deepEqual(T.tafelBeschreibung(s, { heuteTag: H }).gruppen.map((g) => g.gruppe), ["speisen", "getraenke"]);
  T.tafelSetzen(s, "gruppe", "speisen"); T.tafelSetzen(s, "gruppe", "getraenke"); assert.deepEqual(s.tafel.gruppen, ["getraenke"], "die letzte Gruppe bleibt");
  T.tafelSetzen(s, "gruppe", "beilagen"); assert.deepEqual(s.tafel.gruppen, ["beilagen", "getraenke"], "feste Reihenfolge");
  assert.equal(T.tafelSetzen(s, "sekunden", 3), false, "unter 5 s nicht"); T.tafelSetzen(s, "sekunden", 20); assert.equal(s.tafel.sekunden, 20);
});

test("Preise im deutschen Format mit €; Endpreise-Satz (Kleinunternehmer ohne MwSt.); Stand mit Datum und Uhrzeit", () => {
  const b = T.tafelBeschreibung(laden(), { heuteTag: H, jetzt: JETZT });
  for (const g of b.gruppen) for (const e of g.eintraege) assert.match(e.preisText, EURO, e.name);
  assert.equal(b.gruppen[0].eintraege[0].preisText.replace(/\s/, " "), "7,50 €");
  assert.equal(b.endpreise, "Endpreise in Euro inkl. MwSt.");
  assert.match(b.standText, /^Stand: 18\.10\.2026 \d\d:30$/);
  const k = laden(); k.betrieb.kleinunternehmer = true; assert.equal(T.tafelBeschreibung(k, { heuteTag: H }).endpreise, "Endpreise in Euro");
  const html = T.tafelHtml(b, { eingebettet: false, skript: false });
  assert.ok(html.includes("7,50") && html.includes("Endpreise in Euro inkl. MwSt.") && html.includes("Stand: 18.10.2026"));
});

test("Getränke: Ausschankmenge aus Name oder Feld; fehlt sie, Hinweis im Büro statt raten", async () => {
  assert.equal(T.mengeAusText("Cola 0,33 l"), "0,33 l"); assert.equal(T.mengeAusText("Wasser 0.5l"), "0,5 l"); assert.equal(T.mengeAusText("Bier 500 ml"), "500 ml");
  assert.equal(T.mengeAusText("Saft 20 cl"), "20 cl"); assert.equal(T.mengeAusText("Ayran 0,25 Liter"), "0,25 l");
  for (const n of ["Ayran", "Lachs 3 Lagen", "Dürüm XL", "Fanta 0 lecker", "Cola light"]) assert.equal(T.mengeAusText(n), null, n);
  const b = T.tafelBeschreibung(laden(), { heuteTag: H });
  const g = Object.fromEntries(b.gruppen[2].eintraege.map((e) => [e.name, e]));
  assert.equal(g["Cola 0,33 l"].menge, null, "steht schon im Namen"); assert.equal(g.Wasser.menge, "0,5 l", "aus dem Feld, wird dazugeschrieben");
  assert.ok(g.Ayran, "Getränk ohne Menge bleibt auf der Tafel"); assert.equal(g.Ayran.menge, null, "keine geratene Menge");
  assert.deepEqual(b.hinweise.map((h) => `${h.art}:${h.name}`).sort(), ["mengeFehlt:Ayran", "ohnePreis:Lahmacun"]);
  assert.ok(T.tafelHtml(b, { eingebettet: false }).includes('<span class="menge">0,5 l</span>'));
  const { tafelView } = await import("../js/screens/tafel.js");
  const v = tafelView(laden());
  assert.ok(v.includes("Ayran: Menge fehlt (z. B. 0,33 l). Unter „Getränke“ eintragen – Pflicht bei Getränken.") && v.includes("Lahmacun: ohne Preis – fehlt auf der Tafel."), "Hinweise im Büro");
  assert.ok(!T.tafelBeschreibung(beispielLaden(H), { heuteTag: H }).hinweise.length, "Beispiel-Laden: alles vollständig");
});

test("Aktion mit Laufzeit: übernehmen (Kombi: Zeitraum-Vorschlag, ohne Rezept eine Woche – Aktion planen 18.10.2026; Abverkauf bis Ablauf), hervorgehoben vorne, ‚bis‘/‚ab – bis‘, doppelt nicht, beenden", () => {
  const s = laden();
  const a = T.aktionUebernehmen(s, { art: "kombi", gerichte: ["d1", "p1", "c1"], preis: 11.5, statt: 13 }, { heuteTag: H, jetzt: JETZT });
  assert.equal(a.von, H); assert.equal(a.bis, "2026-10-24", "keine feste Laufzeit mehr: ohne Rezept kein Vorschlag rechenbar → eine Woche ab sofort"); assert.equal(a.ende, "datum"); assert.equal(a.statt, 13); assert.equal(s.aktionen.length, 1);
  assert.equal(T.aktionUebernehmen(s, { art: "kombi", gerichte: ["c1", "p1", "d1"], preis: 11.5 }, { heuteTag: H }), a, "gleiche Aktion nicht doppelt"); assert.equal(s.aktionen.length, 1);
  const ab = T.aktionUebernehmen(s, { art: "abverkauf", gerichte: ["a1"], preis: 1.5, statt: 2, bis: "2026-10-20" }, { heuteTag: H }); assert.equal(ab.bis, "2026-10-20");
  assert.equal(T.aktionUebernehmen(s, { art: "kombi", gerichte: ["gibtsnicht"], preis: 5 }, { heuteTag: H }), null);
  const b = T.tafelBeschreibung(s, { heuteTag: H, jetzt: JETZT });
  assert.equal(b.seiten[0].art, "aktionen"); assert.deepEqual(b.aktionen.map((x) => x.name), ["Ayran", "Döner + Pommes + Cola 0,33 l"], "die zuerst endende vorne");
  const kb = b.aktionen[1]; assert.equal(b.aktionen[0].laufText, "bis Di 20.10.");
  assert.equal(kb.laufText, "bis Sa 24.10."); assert.equal(kb.stattText.replace(/\s/g, " "), "statt 13,00 €"); assert.match(kb.preisText, EURO);
  const html = T.tafelHtml(b, { eingebettet: false });
  assert.ok(html.includes('class="aktion" data-von="2026-10-18" data-bis="2026-10-24"') && html.includes('<span class="marke">Aktion</span>') && html.includes("bis Sa 24.10."));
  // kommt erst: „ab – bis“
  const k = laden(); T.aktionUebernehmen(k, { art: "kombi", gerichte: ["d2", "c1"], preis: 9.5, von: "2026-10-20", bis: "2026-10-25" }, { heuteTag: H });
  assert.equal(T.tafelBeschreibung(k, { heuteTag: H }).aktionen[0].laufText, "Di 20.10. – So 25.10.");
  // ausgeschaltet → keine Aktionsseite; beendet → weg; abgelaufen beim Erzeugen → nicht in der Datei
  T.tafelSetzen(s, "aktionen", false); assert.ok(!T.tafelBeschreibung(s, { heuteTag: H }).seiten.some((x) => x.art === "aktionen")); T.tafelSetzen(s, "aktionen", true);
  assert.equal(T.aktionBeenden(s, a.id, { jetzt: JETZT }), true); assert.equal(T.aktionBeenden(s, a.id), false);
  assert.deepEqual(T.tafelBeschreibung(s, { heuteTag: H }).aktionen.map((x) => x.name), ["Ayran"]);
  assert.equal(T.tafelBeschreibung(s, { heuteTag: "2026-10-21" }).aktionen.length, 0, "am 21.10. ist die Abverkaufs-Aktion vorbei");
  // Gericht gelöscht → Aktion nicht auf der Tafel, Hinweis im Büro
  const g = laden(); T.aktionUebernehmen(g, { art: "kombi", gerichte: ["d1", "c1"], preis: 9 }, { heuteTag: H }); g.gerichte = g.gerichte.filter((x) => x.id !== "d1");
  const bg = T.tafelBeschreibung(g, { heuteTag: H }); assert.equal(bg.aktionen.length, 0); assert.ok(bg.hinweise.some((h) => h.art === "aktionOhneGericht"));
  // Beispiel-Laden: eine laufende Aktion
  const bsp = T.tafelBeschreibung(beispielLaden(H), { heuteTag: H });
  assert.equal(bsp.aktionen.length, 1); assert.equal(bsp.aktionen[0].name, "Döner Kebab + Pommes frites + Cola 0,33 l"); assert.equal(bsp.aktionen[0].laufText, "bis Sa 24.10.");
  assert.ok(bsp.aktionen[0].preis < bsp.aktionen[0].statt);
});

test("Abgelaufene Aktion: die in die Datei eingebettete Funktion blendet nach der Uhr des Geräts aus (Geschäftstag bis 4 Uhr)", () => {
  const s = laden(); T.aktionUebernehmen(s, { art: "kombi", gerichte: ["d1", "c1"], preis: 9, von: "2026-10-20", bis: "2026-10-24" }, { heuteTag: H });
  const html = T.tafelHtml(T.tafelBeschreibung(s, { heuteTag: H }), { eingebettet: true });
  const sichtbar = eingebettet(html); const a = { von: "2026-10-20", bis: "2026-10-24" };
  const um = (t, h, m = 0) => new Date(2026, 9, t, h, m).getTime(); // Ortszeit des Anzeigegeräts
  assert.equal(sichtbar(a, um(19, 23)), false, "vor dem Start"); assert.equal(sichtbar(a, um(20, 3, 59)), false, "20.10. 3:59 gehört noch zum 19.");
  assert.equal(sichtbar(a, um(20, 4)), true); assert.equal(sichtbar(a, um(24, 23, 59)), true);
  assert.equal(sichtbar(a, um(25, 3, 30)), true, "Nacht nach dem letzten Tag: bis 4 Uhr"); assert.equal(sichtbar(a, um(25, 4)), false, "abgelaufen");
  assert.equal(sichtbar(a, um(30, 12)), false); assert.equal(sichtbar({ von: null, bis: null }, um(1, 1)), true);
  assert.ok(T.tafelStundeStimmt() && T.TAFEL_STUNDE === GESCHAEFTSTAG_BIS_STUNDE, "gleicher Geschäftstag wie die App");
  // ES5 (alte Fernseh-Browser): keine Pfeile, kein let/const, keine Vorlagen im Skript
  const skript = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  assert.ok(!/=>|\blet\b|\bconst\b|`|\?\.|\?\?/.test(skript), "Skript ist ES5");
  assert.ok(skript.includes("data-sekunden") && skript.includes("setInterval") && skript.includes("requestFullscreen"));
  // Seitenwechsel und Ausblenden im Skript laufen lassen (kleine DOM-Attrappe)
  const seiten = [{ a: "aktionen" }, { a: "karte" }, { a: "karte" }].map((x, i) => { const el = { className: "seite" + (i === 0 ? " an" : ""), attr: { "data-art": x.a }, getAttribute(k) { return this.attr[k] ?? null; }, setAttribute(k, v) { this.attr[k] = v; } }; return el; });
  const aktion = { attr: { "data-von": "2026-10-20", "data-bis": "2026-10-24" }, hidden: false, getAttribute(k) { return this.attr[k]; } };
  seiten[0].querySelector = () => (aktion.hidden ? null : aktion);
  const doc = { getElementById: () => ({ getAttribute: () => "8" }), querySelectorAll: (q) => q === ".aktion" ? [aktion] : q === ".seite" ? seiten : seiten.filter((x) => x.attr["data-art"] === "aktionen"),
    addEventListener() {}, documentElement: {} };
  let tick = null; const uhr = { jetzt: um(22, 12) };
  class Uhr extends Date {} Uhr.now = () => uhr.jetzt; // Uhr des Anzeigegeräts
  new Function("document", "setInterval", "Date", skript)(doc, (f, ms) => { tick = f; assert.equal(ms, 8000); }, Uhr);
  const an = () => seiten.findIndex((x) => /\ban\b/.test(x.className));
  assert.equal(an(), 0, "Aktion läuft: Seite 1"); tick(); assert.equal(an(), 1); tick(); assert.equal(an(), 2); tick(); assert.equal(an(), 0);
  uhr.jetzt = um(26, 12); tick(); assert.equal(aktion.hidden, true, "abgelaufen → ausgeblendet");
  for (let i = 0; i < 4; i++) { tick(); assert.notEqual(an(), 0, "leere Aktionsseite wird übersprungen"); }
});

test("Export: eine einzige HTML-Datei, alles eingebettet, keine Verweise nach außen", async () => {
  const s = beispielLaden(H); s.gerichte[0].foto = "f-1"; s.gerichte[0].fotoMeta = { id: "f-1", ort: "lokal" };
  const b = T.tafelBeschreibung(s, { heuteTag: H, jetzt: JETZT });
  const liste = T.tafelBildListe(b); assert.ok(liste.some((x) => x.schluessel === "eigen:f-1"), "eigenes Foto"); assert.ok(liste.some((x) => x.schluessel.startsWith("foto:")));
  assert.equal(new Set(liste.map((x) => x.schluessel)).size, liste.length, "jedes Bild nur einmal");
  const gelesen = [];
  const bilder = await T.tafelBilder(b, { lesen: async (bild) => { gelesen.push(bild); return bild.foto === "g-pommes" ? null : "data:image/webp;base64,UklGRg=="; } });
  assert.equal(gelesen.length, liste.length); assert.ok(!Object.keys(bilder).includes("foto:g-pommes"));
  const d = T.tafelDatei(b, bilder);
  assert.match(d.name, /^menuetafel-beispiel-doener-\d{4}-\d{2}-\d{2}\.html$/); assert.equal(d.typ, "text/html;charset=utf-8");
  const html = d.text;
  assert.ok(html.startsWith("<!doctype html>") && html.trim().endsWith("</html>")); assert.equal((html.match(/<html/g) || []).length, 1);
  assert.ok(!/<link\b|<script\s+src|<iframe|@import|@font-face/i.test(html), "keine nachgeladenen Teile");
  assert.ok(!/https?:\/\//i.test(html), "keine Adresse ins Netz");
  for (const m of html.matchAll(/\b(?:src|href|poster|data)\s*=\s*"([^"]*)"/gi)) assert.match(m[1], /^data:/, m[0].slice(0, 60));
  for (const m of html.matchAll(/url\(([^)]*)\)/gi)) assert.match(m[1], /^["']?data:/, m[0]);
  assert.ok(!html.includes("foto/") && !html.includes("bilder/"), "keine Pfade der App");
  assert.ok(html.includes('<span class="ohne"></span>'), "fehlendes Bild: Platz bleibt leer");
  assert.ok(/<style>[\s\S]*#tafel[\s\S]*<\/style>/.test(html) && html.includes("system-ui"), "eigenes CSS, Systemschrift");
  for (const farbe of ["#2E4034", "#FFFDF8", "#C97A3E", "#F5EBDD"]) {
    assert.ok(html.includes(farbe), farbe); assert.ok(fs.readFileSync(path.join(HIER, "..", "css", "tokens.css"), "utf8").includes(farbe), "Farbe aus tokens.css: " + farbe);
  }
  assert.ok(html.includes('data-sekunden="12"') && html.includes("BEISPIEL – keine echten Daten"));
  assert.equal((html.match(/<section class="seite/g) || []).length, 3); assert.equal((html.match(/class="seite an"/g) || []).length, 1, "ohne Skript steht die erste Seite");
  // Vorschau einer Seite für das Büro: ohne Skript, Bilder aus der App
  const v = T.tafelHtml(b, { eingebettet: false, skript: false, nurSeite: 1 });
  assert.ok(!v.includes("<script") && v.includes("foto/") && (v.match(/<section/g) || []).length === 1);
});

test("Sprache der Tafel: Inhalt in der gewählten Sprache, Gerichtnamen wie gespeichert, Arabisch von rechts", async () => {
  await i18n.ladeSprache("ar");
  const s = beispielLaden(H); T.tafelSetzen(s, "sprache", "tr");
  const b = T.tafelBeschreibung(s, { heuteTag: H, jetzt: JETZT });
  assert.deepEqual(b.gruppen.map((g) => g.titel), ["Yemekler", "Yan ürünler ve atıştırmalık", "İçecekler"]);
  assert.equal(b.aktionTitel, "Kampanya"); assert.match(b.aktionen[0].laufText, /^Cmt 24\.10\. tarihine kadar$/);
  assert.ok(b.gruppen[0].eintraege.some((e) => e.name === "Döner Kebab"), "Name wie gespeichert"); assert.match(b.gruppen[0].eintraege[0].preisText, EURO, "Preis deutsch");
  assert.equal(i18n.sprache(), "de", "App-Sprache bleibt");
  T.tafelSetzen(s, "sprache", "ar"); const ar = T.tafelHtml(T.tafelBeschreibung(s, { heuteTag: H }));
  assert.ok(ar.includes('<html lang="ar" dir="rtl">') && ar.includes("المشروبات"));
  T.tafelSetzen(s, "sprache", "xx"); assert.equal(s.tafel.sprache, "ar", "unbekannte Sprache wird nicht gesetzt");
  for (const c of i18n.SPRACHEN) { await i18n.ladeSprache(c); assert.deepEqual(i18n.fehlendeSchluessel(c).filter((k) => k.startsWith("tafel")), [], c); }
  i18n.setzeSprache("de");
});

test("Migration: alter Laden ohne Felder bekommt Standard; Ungültiges fällt weg", () => {
  const alt = st.leererBetrieb(); delete alt.aktionen; delete alt.tafel;
  const m = st.migrierenBetrieb(structuredClone(alt));
  assert.deepEqual(m.aktionen, []); assert.deepEqual(m.tafel, { sekunden: 12, gruppen: ["speisen", "beilagen", "getraenke"], aktionen: true, sprache: "de" });
  const kaputt = st.leererBetrieb();
  kaputt.tafel = { sekunden: 999, gruppen: ["quatsch"], aktionen: "ja", sprache: "xx" };
  kaputt.aktionen = [
    { id: "ok", art: "kombi", gerichte: ["g1", "g1", 5], preis: 9.999, statt: "x", von: "2026-10-18", bis: "2026-10-20", erfasst: JETZT },
    { id: "ohne-preis", gerichte: ["g1"], preis: 0, von: "2026-10-18", bis: "2026-10-20" }, { id: "falsch-rum", gerichte: ["g1"], preis: 5, von: "2026-10-21", bis: "2026-10-20" },
    { id: "ohne-datum", gerichte: ["g1"], preis: 5 }, { gerichte: ["g1"], preis: 5, von: "2026-10-18", bis: "2026-10-20" }, "text",
  ];
  const k = st.migrierenBetrieb(kaputt);
  assert.deepEqual(k.tafel, { sekunden: 12, gruppen: ["speisen", "beilagen", "getraenke"], aktionen: true, sprache: "de" });
  assert.deepEqual(k.aktionen, [{ id: "ok", art: "kombi", gerichte: ["g1"], preis: 10, statt: null, von: "2026-10-18", bis: "2026-10-20", ende: "datum", erfasst: JETZT, entfernt: false }]); // Aktion planen (18.10.2026): alte Aktion behält ihre Laufzeit, ende „datum“
  assert.deepEqual(st.migrierenBetrieb(structuredClone(k)), k, "zweimal migrieren ändert nichts");
  assert.deepEqual(st.BEREICHE.aktionen, ["aktionen"]); assert.deepEqual(st.BEREICHE.tafel, ["tafel"]);
});

test("Speichern, Sicherung und Zusammenführen: Aktionen beider Handys bleiben, ‚beendet‘ gewinnt, Einstellungen wie ein Bereich", async () => {
  idbAttrappe(); await st.laden();
  const w = st.leereWurzel(); const s = laden(); w.betriebe.push(s); w.aktiv = s.id;
  const a = T.aktionUebernehmen(s, { art: "kombi", gerichte: ["d1", "c1"], preis: 9 }, { heuteTag: H, jetzt: JETZT }); T.tafelSetzen(s, "sekunden", 20);
  await st.sofortSpeichern(w);
  const g = await st.laden(); assert.deepEqual(g.betriebe[0].aktionen, [a]); assert.equal(g.betriebe[0].tafel.sekunden, 20);
  const { blob } = await st.exportDatei(g); const r = await st.importSicherung(blob); assert.equal(r.pruefsumme, "ok");
  assert.deepEqual(r.wurzel.betriebe[0].aktionen, [a]); assert.equal(r.wurzel.betriebe[0].tafel.sekunden, 20);
  // Handy A beendet die Aktion, Handy B legt eine neue an → beide Wege: beendet + neue
  const handyA = structuredClone(r.wurzel), handyB = structuredClone(r.wurzel);
  T.aktionBeenden(handyA.betriebe[0], a.id, { jetzt: "2026-10-18T13:00:00.000Z" });
  const neu = T.aktionUebernehmen(handyB.betriebe[0], { art: "abverkauf", gerichte: ["a1"], preis: 1.5 }, { heuteTag: H, jetzt: "2026-10-18T13:05:00.000Z" });
  for (const [ziel, fremd] of [[structuredClone(handyA), handyB], [structuredClone(handyB), handyA]]) {
    st.zusammenfuehren(ziel, fremd); const l = ziel.betriebe[0].aktionen;
    assert.deepEqual(l.map((x) => x.id).sort(), [a.id, neu.id].sort()); assert.equal(l.find((x) => x.id === a.id).entfernt, true, "beendet gewinnt");
    assert.deepEqual(T.tafelBeschreibung(ziel.betriebe[0], { heuteTag: H }).aktionen.map((x) => x.id), [neu.id]);
  }
  // Einstellungen: nur auf einem Handy geändert → diese gelten nach dem Zusammenführen
  const c1 = structuredClone(r.wurzel), c2 = structuredClone(r.wurzel); st.abgleichGrundlage(c1.betriebe[0]); st.abgleichGrundlage(c2.betriebe[0]);
  T.tafelSetzen(c2.betriebe[0], "sprache", "en"); st.zusammenfuehren(c1, c2); assert.equal(c1.betriebe[0].tafel.sprache, "en");
});

test("Oberfläche: Büro-Kachel für alle, Bereich mit Vorschau/Einstellungen/Teilen und Kassen-Hinweis; Laden und Personal ohne Tafel", async () => {
  const { bueroView } = await import("../js/screens/buero.js");
  const { tafelView, tafelAktion, tafelEingabe } = await import("../js/screens/tafel.js");
  const { navZiel, ansichtErlaubt, personalGesperrt } = await import("../js/modus.js");
  const s = beispielLaden(H); const w = st.leereWurzel(); w.betriebe.push(s); w.aktiv = s.id;
  assert.ok(bueroView(s, w).includes('data-a="nav" data-wert="tafel"')); const eigen = laden(); assert.ok(bueroView(eigen, { betriebe: [eigen] }).includes('data-wert="tafel"'), "für alle sichtbar");
  const html = tafelView(s);
  for (const x of ["Menütafel", "Vorschau", "3 Seiten", 'data-tafel-vorschau="3"', 'data-a="tf-teilen"', "Tafel-Datei teilen", "Preise auf Tafel und Kasse müssen gleich sein.", "Aktionen auf der Tafel",
    'data-a="tf-aktion-beenden"', 'data-a="tf-sekunden"', 'data-a="tf-gruppe"', 'data-a="tf-aktionen"', 'data-f="tf-sprache"', "Was heißt das?"]) assert.ok(html.includes(x), x);
  assert.equal((html.match(/<iframe/g) || []).length, 3); assert.equal(html.split("Preise auf Tafel und Kasse").length, 2);
  assert.ok(!/undefined|NaN|tafel\.[a-z]/.test(html), html.match(/undefined|NaN|tafel\.[a-z.]+/)?.[0]);
  // nur vorhandene CSS-Klassen im Büro
  const css = ["app", "buero", "zielbild", "optik", "laden", "heute"].map((n) => fs.readFileSync(path.join(HIER, "..", "css", n + ".css"), "utf8")).join("\n");
  const klassen = new Set([...html.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)).filter(Boolean));
  for (const k of klassen) assert.ok(new RegExp("\\." + k.replace(/[-]/g, "\\-") + "(?![\\w-])").test(css), "Klasse ohne CSS: " + k);
  // Handlungen
  assert.deepEqual(await tafelAktion("tf-sekunden", { dataset: { wert: "30" } }, s), { speichern: true }); assert.equal(s.tafel.sekunden, 30);
  assert.deepEqual(await tafelAktion("tf-aktionen", { dataset: {} }, s), { speichern: true }); assert.equal(s.tafel.aktionen, false);
  assert.deepEqual(tafelEingabe("tf-sprache", "en", s), { sprache: "en" }); assert.equal(s.tafel.sprache, "en"); assert.equal(tafelEingabe("tf-sprache", "zz", s), false);
  const r = await tafelAktion("tf-aktion-beenden", { dataset: { wert: "bsp-aktion-1" } }, s); assert.equal(r.speichern, true); assert.equal(s.aktionen[0].entfernt, true);
  // „Auf die Tafel“ im Bereich Aktionen & Haltbarkeit
  const akt = await import("../js/screens/aktionen.js"); akt.aktionenZuruecksetzen();
  const s2 = beispielLaden(H); const vorher = s2.aktionen.length;
  assert.ok(akt.aktionenView(s2).includes('data-a="akt-tafel" data-art="abverkauf"'));
  // Aktion planen (18.10.2026): „Auf die Tafel“ zeigt erst den Vorschlag mit Begründung, „Auf die Tafel“ im Plan übernimmt
  assert.equal(await akt.aktionenAktion("akt-tafel", { dataset: { art: "abverkauf", wert: "0" } }, s2), true); assert.equal(s2.aktionen.length, vorher, "nie automatisch");
  const r2 = await akt.aktionenAktion("akt-plan-ok", { dataset: {} }, s2);
  assert.equal(r2.speichern, true); assert.equal(s2.aktionen.length, vorher + 1); const neu = s2.aktionen.at(-1);
  assert.equal(neu.art, "abverkauf"); assert.equal(neu.preis, 1.5); assert.equal(neu.statt, 2); assert.equal(neu.gerichte.length, 1);
  await akt.aktionenAktion("akt-tafel", { dataset: { art: "abverkauf", wert: "0" } }, s2);
  assert.ok(!(await akt.aktionenAktion("akt-plan-ok", { dataset: {} }, s2)).speichern, "zweimal: nicht doppelt"); akt.aktionenZuruecksetzen();
  // Personal und Laden
  assert.equal(ansichtErlaubt({ modus: "personal" }, "tafel"), false); assert.equal(navZiel({ modus: "personal" }, "tafel").ansicht, "personal");
  assert.equal(navZiel({ modus: "laden" }, "tafel").buero, true); assert.equal(ansichtErlaubt({ modus: "laden" }, "tafel"), false);
  for (const n of ["tf-teilen", "tf-sekunden", "tf-aktion-beenden", "akt-tafel"]) assert.equal(personalGesperrt(n, null, H), true, n);
  // Anzeigen schreibt nicht
  const s3 = beispielLaden(H); const vor = JSON.stringify(s3); tafelView(s3); assert.equal(JSON.stringify(s3), vor);
});

test("Keine verbotenen Wörter in den neuen Dateien", () => {
  const VERBOTEN = ["revolutionär", "disruptiv", "Marktführer", "GoBD-konform", "betriebsprüfungsfest", "steuersicher", "rechtssicher"];
  for (const f of ["js/tafel.js", "js/screens/tafel.js", ...fs.readdirSync(path.join(HIER, "..", "js", "lang")).map((x) => "js/lang/" + x)]) {
    const t = fs.readFileSync(path.join(HIER, "..", f), "utf8").toLowerCase(); for (const v of VERBOTEN) assert.ok(!t.includes(v.toLowerCase()), f + ": " + v);
  }
});
