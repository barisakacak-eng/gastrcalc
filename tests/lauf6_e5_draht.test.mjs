// Lauf 6, Etappe 5 – Draht (13.11.2026): Verdrahtung der neuen Fähigkeiten des Rechenwerks in der Oberfläche. Ein Abschnitt je Punkt.
import { test, mock } from "node:test";
import assert from "node:assert/strict";
globalThis.document ??= { documentElement: {} };
import { idbAttrappe } from "./hilfe/idb_attrappe.mjs";
const st = await import("../js/store.js");
const af = await import("../js/abgleich_felder.js");
const stamm = await import("../js/stamm.js");
const w3 = await import("../js/welle3.js");
const { beispielLaden } = await import("../js/beispiel.js");
const l6y = await import("../js/data/l6y_texte.js");

const J = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
const laden = (id = "L1") => { const b = st.leererBetrieb(); b.id = id; b.phase = "app"; b.betrieb.name = "Nord"; return b; };
const wurzelMit = (...laeden) => { const w = st.leereWurzel(); w.betriebe = laeden; w.aktiv = laeden[0]?.id ?? null; return w; };

// ---------- 2: Kostenposten-Verlauf übersteht Laden, Sicherung, Einlesen ----------
test("Draht 2: Kostenposten-verlauf bleibt bei migrierenBetrieb, Sicherung und Einlesen erhalten (Rundreise), Ungültiges fliegt raus", async () => {
  idbAttrappe(); await st.laden();
  const b = laden(); const verlauf = [{ ab: "", wert: 900 }, { ab: "2026-09", wert: 1000 }];
  b.kosten.push({ id: "k1", kategorie: "fix", posten: "Miete", betrag: 1000, status: "bekannt", periode: "monat", basis: "netto", verlauf: J(verlauf) });
  assert.deepEqual(st.migrierenBetrieb(J(b)).kosten[0].verlauf, verlauf, "migrierenBetrieb");
  const w = wurzelMit(b);
  const { blob } = await st.exportDatei(w);
  const r = await st.importSicherung(blob);
  assert.deepEqual(r.wurzel.betriebe[0].kosten[0].verlauf, verlauf, "Sicherung → Einlesen");
  const z = st.zusammenfuehren(wurzelMit(laden("L2")), r.wurzel);
  assert.deepEqual(r.wurzel.betriebe[0].kosten[0].verlauf, verlauf);
  assert.ok(z, "zusammenführen");
  const c = laden(); c.kosten.push({ id: "k2", kategorie: "fix", posten: "Strom", betrag: 100, status: "bekannt", verlauf: [{ ab: "2026-09", wert: 90 }, { ab: "kaputt", wert: 1 }, { ab: "2026-10", wert: "x" }, null, { ab: "2026-10", wert: -5 }] },
    { id: "k3", kategorie: "fix", posten: "Gas", betrag: 100, status: "bekannt", verlauf: "nix" });
  const m = st.migrierenBetrieb(J(c));
  assert.deepEqual(m.kosten[0].verlauf, [{ ab: "2026-09", wert: 90 }], "nur gültige Einträge");
  assert.equal("verlauf" in m.kosten[1], false, "ungültiges Feld fällt weg");
});

// ---------- 3: Zeitstempel für Chef-Stunden und gelöschten Zeki-Verlauf ----------
const warte = (ms = 5) => new Promise((r) => setTimeout(r, ms));
const beideRichtungen = (a, b) => [st.verschmelzen(J(a), J(b)), st.verschmelzen(J(b), J(a))];
test("Draht 3: chefStundenSetzen schreibt geaendert; zwei Handys im Abgleich – beide Richtungen, derselbe, jüngere Wert", async () => {
  const a = laden("L1"), b = laden("L1");
  w3.chefStundenSetzen(a, 100); await warte(); w3.chefStundenSetzen(b, 160);
  assert.match(a.chef.geaendert, /^\d{4}-\d\d-\d\dT/);
  const [ab, ba] = beideRichtungen(a, b);
  assert.equal(ab.chef.stundenMonat, 160); assert.equal(ba.chef.stundenMonat, 160);
  assert.deepEqual(ab.chef, ba.chef);
});
test("Draht 3: zekiLogLoeschen schreibt zekiLogGeloescht; gelöschter Verlauf bleibt beim Abgleich in beide Richtungen leer", async () => {
  assert.ok("zekiLogGeloescht" in af.FELD_ABGLEICH && af.FELD_VERFAHREN("zekiLogGeloescht") !== null, "Verfahren vorhanden");
  const a = laden("L1"), b = laden("L1");
  stamm.zekiLogAnhaengen(a, { art: "frage" }); stamm.zekiLogAnhaengen(a, { art: "antwort" });
  b.zekiLog = J(a.zekiLog); await warte(); stamm.zekiLogLoeschen(b);
  assert.match(b.zekiLogGeloescht, /^\d{4}-\d\d-\d\dT/);
  const [ab, ba] = beideRichtungen(a, b);
  assert.deepEqual(ab.zekiLog, []); assert.deepEqual(ba.zekiLog, []);
  assert.equal(ab.zekiLogGeloescht, ba.zekiLogGeloescht);
  // neuer Eintrag nach dem Löschen bleibt
  await warte(); stamm.zekiLogAnhaengen(a, { art: "neu" });
  const [x, y] = beideRichtungen(a, b); assert.equal(x.zekiLog.length, 1); assert.deepEqual(x.zekiLog, y.zekiLog);
});

// ---------- 5: Blatt „Sicherung teilen“ trägt den Satz ohne Passwort ----------
test("Draht 5: Blatt „Sicherung teilen“ enthält den Satz „Ohne Passwort …“, sichtbar erst bei ausgeschaltetem Passwort", async () => {
  const umschalter = [];
  const kind = (name = "") => ({ addEventListener() {}, focus() {}, setAttribute() {}, value: "", classList: { add() {}, remove() {}, toggle: (k, an) => umschalter.push([name, k, an]) }, querySelector: (s) => kind(s), querySelectorAll: () => [], textContent: "", click() {} });
  const huelle = { ...kind(), innerHTML: "" };
  const dok = globalThis.document; const alt = { gid: dok.getElementById, body: dok.body, qs: dok.querySelector };
  dok.getElementById = () => huelle; dok.body = { classList: { add() {}, remove() {} }, appendChild() {} }; dok.querySelector = () => null;
  const i18n = await import("../js/i18n.js"); i18n.setzeSprache("de");
  try {
    const eb = await import("../js/screens/ebene.js");
    eb.passwortStarten("teilen", { tage: 3 });
    const satz = l6y.l6yText("ohnePasswort", "de");
    assert.ok(satz.length > 20);
    assert.ok(huelle.innerHTML.includes(satz), "Satz steht im Blatt");
    assert.match(huelle.innerHTML, /<p class="hinweis pw-ohne versteckt"/, "zunächst versteckt (Passwort ist vorgewählt)");
    eb.sicherungSchalter("passwort"); // Passwort aus
    assert.ok(umschalter.some(([n, k, an]) => n === ".pw-ohne" && k === "versteckt" && an === false), "Satz wird sichtbar, wenn kein Passwort gewählt ist");
    eb.sicherungSchalter("passwort"); // wieder an
    assert.ok(umschalter.some(([n, k, an]) => n === ".pw-ohne" && k === "versteckt" && an === true), "und wieder versteckt");
    eb.blattSchliessen();
    // Einlesen-Blatt trägt den Satz nicht
    eb.passwortStarten("einlesen"); assert.ok(!huelle.innerHTML.includes(satz)); eb.blattSchliessen();
  } finally { dok.getElementById = alt.gid; dok.body = alt.body; dok.querySelector = alt.qs; }
});

// ---------- 6: Monatsabschluss zeigt „Daten seit Abschluss geändert.“ ----------
test("Draht 6: geld3View zeigt den Satz „Daten seit Abschluss geändert.“ nur bei veraltetem Abschluss des Vormonats", async () => {
  const ma = await import("../js/monatsabschluss.js"); const g = await import("../js/screens/geld3.js");
  const i18n = await import("../js/i18n.js"); i18n.setzeSprache("de");
  const satz = l6y.l6yText("abschlussVeraltet", "de"); assert.equal(satz, "Daten seit Abschluss geändert.");
  mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-11-13T12:00:00Z") });
  try {
    const a = beispielLaden("2026-11-13"); ma.monatEinfrieren(a, "2026-10", { jetzt: "2026-11-02T10:00:00.000Z" });
    const karte = (s) => g.geld3View(s).match(/data-g3="monat"[\s\S]*?<\/details>/)[0];
    assert.ok(!karte(a).includes(satz), "frisch eingefroren: kein Hinweis");
    assert.match(karte(a), /abgeschlossen|Abgeschlossen/i);
    a.tagesnotizen.push({ id: "spaet-1", datum: "2026-10-31", umsatz: 123, erfasst: "2026-11-05T10:00:00.000Z", nacherfasst: true, storniert: false });
    assert.equal(ma.abschlussVeraltet(a, "2026-10"), true);
    assert.ok(karte(a).includes(satz), "nach nachgetragenem Tag: Hinweis steht in der Karte");
  } finally { mock.timers.reset(); }
});

// ---------- 7: Büro-Hinweis nach dem Abgleich trägt die Zeilen ----------
test("Draht 7: Büro zeigt je Art höchstens drei Zeilen mit den Sätzen aus l6y_texte.js, bei mehr „… und n weitere“; gerettet statt „Teil fehlt“", async () => {
  const { bueroView } = await import("../js/screens/buero.js"); const { fmtEuro } = await import("../js/util.js"); const { datumLesbar } = await import("../js/anzeige_text.js");
  const i18n = await import("../js/i18n.js"); i18n.setzeSprache("de");
  const s = beispielLaden("2026-11-13"); s.id = "L1"; s.beispiel = false; s.kosten = s.kosten.slice(0, 1); const gn = s.gerichte[0].name; s.gerichte[0].id = "g1";
  const eintraege = [0, 1, 2, 3, 4].map((i) => ({ laden: "L1", bereich: i === 0 ? "gerichte" : "kosten", kennung: i === 0 ? "g1" : "k" + i, art: "verschieden", lokal: `preis ${i}`, fremd: `preis ${i + 10}`, behalten: i === 1 ? "fremd" : "lokal" }));
  const unterschiede = [{ laden: "L1", bereich: "betrieb", lokal: "name Nord A", fremd: "name Nord B", gilt: "fremd" }];
  const umsatzKonflikte = [0, 1, 2, 3].map((i) => ({ laden: "L1", tag: `2026-11-0${i + 1}`, lokal: 800 + i, fremd: 900 + i, gilt: "fremd" }));
  s.abgleichHinweis = { zeit: "2026-11-13T10:00:00.000Z", bereiche: [], zukunft: 2, konflikte: 0, eintraege, unterschiede, umsatzKonflikte };
  const w = wurzelMit(s); w.ladeFehler = [{ laden: "L1", journal: "tagesnotizen", monat: "2026-10", grund: "gerettet", gerettet: 17 }, { laden: "L1", journal: "messungen", monat: "2026-09", grund: "kaputt" }];
  const html = bueroView(s, w, {}); const text = html.replace(/<[^>]+>/g, "\n").split("\n").map((x) => x.trim()).filter(Boolean);
  const zeile = (x) => text.filter((z) => z === x);
  // je Art höchstens drei Zeilen + eine „weitere“-Zeile
  const e = (x) => l6y.l6ySatz(x.behalten === "fremd" ? "eintragUnterschiedFremd" : "eintragUnterschied", "de", x.bereich === "gerichte" ? "Gerichte und Rezepte " + gn : "Kosten " + x.kennung, x.lokal, x.fremd);
  for (const x of eintraege.slice(0, 3)) assert.equal(zeile(e(x)).length, 1, e(x));
  assert.equal(text.filter((z) => z.startsWith("Kosten k") || z.startsWith("Gerichte und Rezepte " + gn)).length, 3, "höchstens drei Eintrag-Zeilen");
  assert.equal(zeile("… und 2 weitere").length, 1, "Eintrag: … und 2 weitere");
  assert.equal(zeile("… und 1 weitere").length, 1, "Umsatz: … und 1 weitere");
  assert.equal(zeile(l6y.l6ySatz("bereichUnterschiedFremd", "de", "Betrieb", "name Nord A", "name Nord B")).length, 1, "Bereich: dort gilt");
  assert.equal(text.filter((z) => z.startsWith("Umsatz am ")).length, 3);
  assert.equal(zeile(l6y.l6ySatz("umsatzKonflikt", "de", datumLesbar("2026-11-01"), fmtEuro(800, { dezimal: 2 }), fmtEuro(900, { dezimal: 2 }))).length, 1, "Beträge über fmtEuro");
  assert.equal(zeile(l6y.l6ySatz("zukunftPruefen", "de", 2)).length, 1);
  assert.equal(zeile(l6y.l6ySatz("gerettet", "de", 17)).length, 1, "gerettet");
  assert.ok(!text.some((z) => /Ein Teil fehlt \(Tagesumsätze/.test(z)) && text.some((z) => /^Ein Teil fehlt/.test(z)), "gerettet ersetzt „Teil fehlt“, der kaputte Teil bleibt");
  // „Dieses Handy behält …“ steht nur, wo es stimmt
  assert.ok(!zeile(l6y.l6ySatz("eintragUnterschied", "de", "Kosten k1", "preis 1", "preis 11")).length, "k1: anderes Handy gewinnt → Fremd-Satz");
});
test("Draht 7: verschmelzen merkt, welche Seite bei einem Bereich gilt (unterschiede[].gilt)", () => {
  const a = laden("L1"), b = laden("L1"); a.betrieb.name = "Nord A"; b.betrieb.name = "Nord B";
  a.stammZeit = { betrieb: "2026-11-01T10:00:00.000Z" }; b.stammZeit = { betrieb: "2026-11-02T10:00:00.000Z" };
  const m = st.verschmelzen(a, b, { jetzt: Date.parse("2026-11-13T12:00:00Z") });
  for (const u of m.abgleichHinweis?.unterschiede || []) assert.ok(u.gilt === "lokal" || u.gilt === "fremd");
});

// ---------- 9: Der ehrliche Satz zum Büro-Code steht in den Einstellungen ----------
test("Draht 9: einstellungenView zeigt „Schloss gegen neugierige Blicke, kein Tresor.“ (de), mit und ohne Büro-Code", async () => {
  const { einstellungenView } = await import("../js/screens/home.js");
  const i18n = await import("../js/i18n.js"); i18n.setzeSprache("de");
  const s = beispielLaden("2026-11-13"); const w = wurzelMit(s);
  const text = (h) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  assert.ok(text(einstellungenView(s, 0, w, {})).includes("Schloss gegen neugierige Blicke, kein Tresor."), "ohne Code");
  w.bueroPin = { hash: "x", salz: "y" }; // gesetztes Schloss
  assert.ok(text(einstellungenView(s, 0, w, {})).includes("Schloss gegen neugierige Blicke, kein Tresor."), "mit Code");
  assert.equal(l6y.l6yText("rueckgaengig", "de"), "Einlesen rückgängig machen.");
  assert.ok(einstellungenView(s, 0, w, { rueckhol: { zeit: "2026-11-13T10:00:00.000Z", grund: "einlesen" } }).includes('data-a="sicherung-zurueckholen"'), "Rückgängig-Knopf erscheint mit Info");
  assert.ok(!einstellungenView(s, 0, w, {}).includes('data-a="sicherung-zurueckholen"'), "ohne Info kein Knopf");
});
