// Eigentümer-Ebene (18.10.2026): zwei erfundene Läden mit verschiedenen Zahlen (aus dem Beispiel-Laden abgeleitet, deterministisch),
// ein leerer dritter Laden und der Beispiel-Laden. Geprüft: Zeitraum, Kennzahlen, Rang, Abstand, Trend, Satz-Priorität (Pflichten vor Geld
// vor Lager), Markierung unvollständiger Daten, Beispiel-Laden draußen (und nur als Ersatz drin), Druck/CSV ohne NaN/undefined und ohne
// vertrauliche Felder (Büro-Code, Kundennummer, Kontakt), Personal-Modus gesperrt, Bildschirm zeichnet ohne zu schreiben.
import test, { mock } from "node:test";
// Feste Uhr (Sonntag 18.10.2026, 12 Uhr): Der Beispiel-Laden hat einen Ruhetag, sonst hängen „6 Tage“ und der Trend vom Wochentag ab.
mock.timers.enable({ apis: ["Date"], now: new Date("2026-10-18T12:00:00") });
import assert from "node:assert/strict";
import { leereWurzel, leererBetrieb } from "../js/store.js";
import { beispielLaden } from "../js/beispiel.js";
import { heute, heuteGeschaeft } from "../js/util.js";
import { tagPlus } from "../js/engine.js";
import { ordnerAmt } from "../js/export_amt.js";
import { aufgabenFuer } from "../js/putzplan.js";
import { lieferantAnlegen } from "../js/lieferant.js";
import { personalGesperrt, ansichtErlaubt } from "../js/modus.js";
import * as E from "../js/eigentuemer.js";

const i18n = await import("../js/i18n.js"); i18n.setzeSprache("de");
const H = heuteGeschaeft(), K = heute();
const WOCHE = { art: "woche" };

// Zwei Läden: „Laden Eins“ wie das Beispiel; „Laden Zwei“ mit 20 % weniger Umsatz, in den letzten 7 Tagen nur die Hälfte (Trend runter),
// eigener Wareneinsatz 40 % (statt ≈ 33 % aus der Karte), zwei Kühltage ohne Messung, ein Lieferant mit Kundennummer und Kontakt.
function laden(name, id, f) {
  const s = beispielLaden(H); s.beispiel = false; s.id = id; s.betrieb.name = name;
  for (const j of ["schwund", "tagesnotizen", "messungen", "rundgaenge", "putzlog", "lieferungen", "inventuren", "belehrungen", "verkaeufe"]) for (const e of s[j]) e.id = id + "-" + e.id;
  if (f) f(s); return s;
}
function zwei() {
  return laden("Laden Zwei", "b", (s) => {
    const woche = tagPlus(H, -6);
    for (const n of s.tagesnotizen) n.umsatz = Math.round(n.umsatz * (n.datum >= woche ? 0.4 : 0.8));
    s.verkauf.warenQuote = 0.4;
    const tage = new Set([tagPlus(K, -2), tagPlus(K, -3)]);
    s.messungen = s.messungen.filter((m) => !tage.has(m.datum)); s.rundgaenge = s.rundgaenge.filter((r) => !tage.has(r.datum));
    const r = lieferantAnlegen(s, { name: "Großhandel Nord", kundennummer: "KD-998877", kontakt: "0151 2345678", notiz: "Rabatt 3 %" }); assert.ok(r.ok, JSON.stringify(r));
  });
}
function wurzelMit(...laeden) { const w = leereWurzel(); w.betriebe = laeden; w.aktiv = laeden[0].id; w.bueroPin = "pbkdf2$600000$salzsalz$ffeeddccbbaa99887766554433221100"; return w; }
const leer = (name, id) => { const s = leererBetrieb(); s.id = id; s.phase = "app"; s.betrieb.name = name; return s; };
// Putz-Lücken schließen, damit der Satz zu den Geld-Punkten kommt
function putzFuellen(s, z) {
  const o = ordnerAmt(s, { art: "frei", von: z.von, bis: z.bis }, { datum: K });
  for (const d of o.teile.putz.luecken) for (const a of aufgabenFuer(s.putzplan).filter((x) => x.takt === "tag")) s.putzlog.push({ id: `${s.id}-pf-${d}-${a.id}`, aufgabe: a.id, datum: d, zeit: "20:00", erfasst: d + "T20:00:00.000Z", von: null, storniert: false });
}

test("Zeitraum: Woche, Monat, frei (verdreht geordnet, Zukunft gekappt), Vorzeitraum gleich lang davor", () => {
  const w = E.eigentuemerZeitraum(WOCHE, "2026-10-18");
  assert.deepEqual([w.von, w.bis, w.tage], ["2026-10-12", "2026-10-18", 7]); assert.deepEqual([w.vorher.von, w.vorher.bis], ["2026-10-05", "2026-10-11"]);
  const m = E.eigentuemerZeitraum({ art: "monat" }, "2026-10-18"); assert.deepEqual([m.von, m.bis, m.tage], ["2026-10-01", "2026-10-18", 18]); assert.equal(m.vorher.von, "2026-09-13");
  const f = E.eigentuemerZeitraum({ art: "frei", von: "2026-10-30", bis: "2026-10-03" }, "2026-10-18"); assert.deepEqual([f.von, f.bis], ["2026-10-03", "2026-10-18"]);
  assert.equal(E.eigentuemerZeitraum({ art: "unsinn" }, "2026-10-18").art, "woche");
  assert.equal(E.eigentuemerZeitraum({ art: "frei", von: "x", bis: null }, "2026-10-18").von, "2026-10-01");
});

test("Kennzahlen je Laden: Umsatz mit Herkunft und Vollständigkeit, Wareneinsatz mit Quelle, Müll, Pflichten, Bis null, Lager, Aktionen", () => {
  const a = laden("Laden Eins", "a"), b = zwei();
  const ue = E.eigentuemerUebersicht(wurzelMit(a, b), WOCHE, { H, K });
  assert.equal(ue.laeden.length, 2); const [la, lb] = ue.laeden;
  assert.ok(la.umsatz.summe > lb.umsatz.summe && la.umsatz.tage === 6 && la.umsatz.vollstaendig, JSON.stringify(la.umsatz));
  assert.equal(la.umsatz.herkunft.notiz, 6); assert.ok(la.umsatz.herkunft.kasse + la.umsatz.herkunft.hand > 0, "Verkäufe mit Herkunft");
  assert.equal(la.ware.quelle, "karte"); assert.equal(la.ware.geschaetzt, true, "Richtpreise im Beispiel → ≈"); assert.ok(la.ware.quote > 0.3 && la.ware.quote < 0.36);
  assert.equal(lb.ware.quelle, "eigen"); assert.equal(lb.ware.quote, 0.4); assert.equal(lb.ware.basis, "karte");
  assert.ok(la.muell.wert > 0 && la.muell.anzahl > 0 && la.muell.portionen > 0); assert.ok(la.muell.anteil > 0 && la.muell.anteil < 0.1);
  assert.ok(la.personal.anzahl >= 1 && la.personal.svev > 0);
  assert.ok(la.schwund && la.schwund.von < la.schwund.bis, "Schwund-Verdacht zwischen zwei Inventuren");
  assert.equal(la.pflichten.kuehlFehlt, 0); assert.equal(lb.pflichten.kuehlFehlt, 2); assert.equal(lb.pflichten.basis, "voll");
  assert.equal(typeof la.bisNull.stand, "number"); assert.equal(la.bisNull.keinUmsatz, false);
  assert.equal(la.lager.ohneInventur, false); assert.ok(la.lager.wert > 0 && typeof la.lager.bestellenJetzt === "number");
  assert.equal(la.aktionen.laufend, 1);
  assert.deepEqual(la.fehlt, ["richtpreise"]); assert.equal(la.vollstaendig, false);
  // Summen ohne Beispiel, Zeitraum 7 Tage
  assert.equal(ue.summe.laeden, 2); assert.ok(Math.abs(ue.summe.umsatz - (la.umsatz.summe + lb.umsatz.summe)) < 0.01);
});

test("Vergleich: Rang je Kennzahl, Abstand zum besten, nur gleiche Datenbasis", () => {
  const a = laden("Laden Eins", "a"), b = zwei(), c = leer("Laden Drei", "c");
  const ue = E.eigentuemerUebersicht(wurzelMit(a, b, c), WOCHE, { H, K }); const v = ue.vergleich;
  assert.equal(v.umsatz.vergleichbar, true); assert.equal(v.umsatz.bester, "a");
  assert.equal(v.umsatz.je.a.rang, 1); assert.equal(v.umsatz.je.b.rang, 2); assert.ok(v.umsatz.je.b.abstand < 0 && Math.abs(v.umsatz.je.b.abstand - (ue.laeden[1].umsatz.summe - ue.laeden[0].umsatz.summe)) < 0.01);
  assert.equal(v.umsatz.je.c.rang, null); assert.equal(v.umsatz.je.c.grund, "fehlt");
  assert.equal(v.ware.je.a.rang, 1); assert.equal(v.ware.je.b.rang, 2); assert.ok(v.ware.je.b.abstand > 6 && v.ware.je.b.abstand < 7.5, "Abstand in Prozentpunkten: " + v.ware.je.b.abstand);
  assert.equal(v.pflichten.je.a.rang, 1); assert.equal(v.pflichten.je.b.rang, 2); assert.equal(v.pflichten.je.b.abstand, 2); assert.equal(v.pflichten.je.c.grund, "fehlt");
  assert.equal(v.bisNull.vergleichbar, true); assert.equal(v.bisNull.je.c.rang, null);
  // Rang-Text
  assert.match(E.rangText(v, "umsatz", "a"), /Platz 1 von 2/); assert.match(E.rangText(v, "umsatz", "b"), /Platz 2 von 2 · .*€ hinter dem besten/); assert.equal(E.rangText(v, "umsatz", "c"), "keine Daten");
  // andere Datenbasis: Laden mit Richtwert (keine Karte, keine eigene Quote) ist beim Wareneinsatz nicht vergleichbar
  const d = laden("Laden Vier", "d", (s) => { s.gerichte = []; s.artikel = []; s.verkaeufe = []; });
  const v2 = E.eigentuemerUebersicht(wurzelMit(a, b, d), WOCHE, { H, K }).vergleich;
  assert.equal(v2.ware.je.d.rang, null); assert.equal(v2.ware.je.d.grund, "fehlt"); assert.equal(v2.ware.anzahl, 2);
  // nur ein Laden mit Basis: nicht vergleichbar, Grund „zu wenig“
  const v3 = E.eigentuemerUebersicht(wurzelMit(a, c), WOCHE, { H, K }).vergleich;
  assert.equal(v3.umsatz.vergleichbar, false); assert.equal(v3.umsatz.je.a.grund, "zuWenig"); assert.equal(v3.umsatz.je.c.grund, "fehlt");
});

test("Trend gegenüber dem Vorzeitraum: Laden Zwei hat die letzte Woche halbiert", () => {
  const a = laden("Laden Eins", "a"), b = zwei();
  const ue = E.eigentuemerUebersicht(wurzelMit(a, b), WOCHE, { H, K });
  const ta = ue.laeden[0].trend, tb = ue.laeden[1].trend;
  assert.equal(ta.umsatz.richtung, "gleich", JSON.stringify(ta.umsatz)); // das Beispiel wiederholt sich wöchentlich
  assert.equal(tb.umsatz.richtung, "runter"); assert.ok(tb.umsatz.aenderung < -0.45 && tb.umsatz.aenderung > -0.55, String(tb.umsatz.aenderung));
  assert.match(E.trendText(tb.umsatz), /^−50 % zum Vorzeitraum$/); assert.equal(E.trendText(ta.umsatz), "wie im Vorzeitraum");
  assert.equal(E.trendText(null), "kein Vorzeitraum"); assert.equal(E.trendText({ richtung: "hoch", aenderung: null }), "neu, vorher nichts");
  const c = leer("Laden Drei", "c"); assert.equal(E.eigentuemerUebersicht(wurzelMit(c), WOCHE, { H, K }).laeden[0].trend.umsatz.richtung, null);
});

test("Satz: Pflichten vor Geld vor Lager, höchstens ein Satz, Ziel = der Laden", () => {
  const a = laden("Laden Eins", "a"), b = zwei();
  // 1. Pflicht: Kühlrundgänge fehlen in Laden Zwei
  let s = E.eigentuemerUhrzeit(wurzelMit(a, b), WOCHE, { H, K });
  assert.equal(s.art, "kuehl"); assert.equal(s.laden, "b"); assert.equal(s.text, "Laden Zwei: 2 Kühlrundgänge fehlen"); assert.equal(s.ton, "rot"); assert.deepEqual(s.ziel, { aktion: "laden-wechseln", id: "b" });
  // Belehrung fällig schlägt die Kühlung
  const a2 = laden("Laden Eins", "a", (x) => { x.belehrungen = []; for (const p of x.personen) p.belehrungen = []; });
  s = E.eigentuemerUhrzeit(wurzelMit(a2, b), WOCHE, { H, K }); assert.equal(s.art, "belehrung"); assert.equal(s.laden, "a"); assert.match(s.text, /^Laden Eins: 2 Belehrungen fällig$/);
  // 2. ohne Pflicht-Lücken: Geld – Wareneinsatz über dem besten Laden (≥ 3 Punkte)
  const b2 = laden("Laden Zwei", "b", (x) => { x.verkauf.warenQuote = 0.4; });
  const z = E.eigentuemerZeitraum(WOCHE, H); putzFuellen(a, z); putzFuellen(b2, z);
  s = E.eigentuemerUhrzeit(wurzelMit(a, b2), WOCHE, { H, K });
  assert.equal(s.art, "ware", JSON.stringify(s)); assert.equal(s.laden, "b"); assert.match(s.text, /^Laden Zwei: Wareneinsatz 7 Punkte über Laden Eins ≈$/);
  // 3. gleiche Quote: Minus bis null kommt vor dem Lager
  const b3 = laden("Laden Zwei", "b", (x) => { for (const n of x.tagesnotizen) n.umsatz = Math.round(n.umsatz * 0.3); }); putzFuellen(b3, z);
  s = E.eigentuemerUhrzeit(wurzelMit(a, b3), WOCHE, { H, K });
  assert.equal(s.art, "minus", JSON.stringify(s)); assert.equal(s.laden, "b"); assert.match(s.text, /^Laden Zwei: ≈ .*€ bis null$/);
  // 4. Lager: ohne Inventur, aber mit Umsatz
  const a4 = laden("Laden Eins", "a", (x) => { x.inventuren = []; x.lieferungen = []; x.verkaeufe = []; x.aktionen = []; }); putzFuellen(a4, z);
  s = E.eigentuemerUhrzeit(wurzelMit(a4), WOCHE, { H, K });
  assert.ok(["inventur", "minus", "umsatzFehlt"].includes(s.art), JSON.stringify(s));
  if (s.art === "inventur") assert.equal(s.text, "Laden Eins: noch keine Inventur");
  // 5. nichts offen: leerer Laden ohne Umsatz → „kein Umsatz im Zeitraum“; ohne Läden null
  s = E.eigentuemerUhrzeit(wurzelMit(leer("Laden Drei", "c")), WOCHE, { H, K }); assert.equal(s.art, "umsatzKeiner"); assert.equal(s.text, "Laden Drei: kein Umsatz im Zeitraum");
  assert.equal(E.eigentuemerUhrzeit(leereWurzel(), WOCHE, { H, K }), null);
});

test("Ehrlichkeit: unvollständige Läden sind markiert, Zellen sagen „fehlt“ oder „≈“, nie geraten", () => {
  const a = laden("Laden Eins", "a"), c = leer("Laden Drei", "c");
  const ue = E.eigentuemerUebersicht(wurzelMit(a, c), WOCHE, { H, K }); const lc = ue.laeden[1];
  assert.equal(lc.vollstaendig, false);
  for (const f of ["umsatz", "verkaeufe", "pflichten", "kosten", "inventur"]) assert.ok(lc.fehlt.includes(f), f + " in " + lc.fehlt);
  const z = E.ladenZellen(lc);
  assert.equal(z.umsatz, "fehlt"); assert.equal(z.bisNull, "fehlt"); assert.equal(z.lager, "keine Inventur"); assert.equal(z.schwund, "braucht 2 Inventuren"); assert.equal(z.pflichten, "nicht eingerichtet"); assert.equal(z.muell, "fehlt");
  assert.match(z.fehlt, /^Unvollständig: /); assert.match(z.wareQuelle, /Richtwert/); assert.match(z.ware, /^≈ 32 %$/);
  const za = E.ladenZellen(ue.laeden[0]);
  assert.match(za.ware, /^≈ 3\d %$/, "Richtpreise → ≈"); assert.match(za.umsatzTage, /^6 von 6 Tagen eingetragen · Notiz/); assert.equal(za.fehlt, "Unvollständig: Richtpreise");
  // Umsatz nur an einem Teil der Tage: Vollständigkeit ehrlich
  const b = laden("Laden Zwei", "b", (s) => { s.tagesnotizen = s.tagesnotizen.filter((n) => n.datum < tagPlus(H, -2)); });
  const lb = E.eigentuemerUebersicht(wurzelMit(b), WOCHE, { H, K }).laeden[0];
  assert.equal(lb.umsatz.vollstaendig, false); assert.ok(lb.fehlt.includes("umsatzTage")); assert.equal(lb.umsatz.basis, "teil");
});

test("Beispiel-Laden: draußen, sobald ein eigener Laden Daten hat; drin mit Kennzeichnung, wenn nur leere eigene Läden da sind", () => {
  const bsp = beispielLaden(H); const a = laden("Laden Eins", "a"); const c = leer("Laden Drei", "c");
  let ue = E.eigentuemerUebersicht(wurzelMit(a, bsp), WOCHE, { H, K });
  assert.deepEqual(ue.laeden.map((l) => l.id), ["a"]); assert.equal(ue.beispielZeigen, false); assert.deepEqual(ue.uebrige, [bsp.id]); assert.equal(ue.summe.laeden, 1);
  ue = E.eigentuemerUebersicht(wurzelMit(c, bsp), WOCHE, { H, K });
  assert.equal(ue.beispielZeigen, true); assert.deepEqual(ue.laeden.map((l) => l.id), [bsp.id, "c"]); assert.equal(ue.laeden[0].beispiel, true);
  assert.equal(ue.summe.laeden, 1, "Summen zählen den Beispiel-Laden nie"); assert.equal(ue.summe.umsatzLaeden, 0);
  assert.ok(ue.satz.text.startsWith("Beispiel-Döner: "), ue.satz.text);
  const dok = E.eigentuemerDokument(ue); assert.equal(dok.beispiel, "BEISPIEL – keine echten Daten"); assert.match(dok.abschnitte[0].zeilen[0].zellen[0], /\(Beispiel\)$/);
  // Laden in der Einrichtung zählt nicht
  const o = leererBetrieb(); o.id = "o"; ue = E.eigentuemerUebersicht(wurzelMit(a, o), WOCHE, { H, K }); assert.deepEqual(ue.laeden.map((l) => l.id), ["a"]); assert.deepEqual(ue.uebrige, ["o"]);
});

test("Druck und CSV: ohne NaN/undefined, mit ≈ und Vollständigkeits-Hinweis, ohne Büro-Code, Kundennummer, Kontakt, Notiz", () => {
  const a = laden("Laden Eins", "a"), b = zwei(), c = leer("Laden Drei", "c");
  const w = wurzelMit(a, b, c); const ue = E.eigentuemerUebersicht(w, { art: "monat" }, { H, K });
  const html = E.eigentuemerHtml(ue); const csv = E.eigentuemerCsv(ue);
  for (const text of [html, csv.text]) {
    assert.ok(!/NaN|undefined|(?<![\p{L} ])null(?!\p{L})/u.test(text), "NaN/undefined/null im Export"); // „Bis null“ ist ein Wort, kein Fehler
    assert.ok(text.includes("≈"), "≈ fehlt"); assert.ok(text.includes("Unvollständig"), "Vollständigkeits-Hinweis fehlt"); assert.ok(text.includes("fehlt"));
    for (const geheim of ["pbkdf2", "salzsalz", "ffeeddcc", "KD-998877", "0151 2345678", "Rabatt 3 %", "bueroPin", "kundennummer"]) assert.ok(!text.includes(geheim), "vertraulich im Export: " + geheim);
    assert.ok(text.includes("Laden Eins") && text.includes("Laden Zwei") && text.includes("Laden Drei"));
  }
  assert.match(html, /^<!doctype html>/); assert.ok(html.includes("Eigentümer-Bericht") && html.includes("Kennzahlen je Laden") && html.includes("Platz 1 von 2"));
  assert.ok(html.includes("Trend zum Vorzeitraum") && html.includes("Datenbasis"));
  assert.match(csv.name, /^Eigentuemer_\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}\.csv$/);
  const zeilen = csv.text.split("\r\n").filter(Boolean); assert.equal(zeilen.length, 2 + 3, "Titel, Kopf, drei Läden"); assert.equal(zeilen[1].split(";").length, 14);
  assert.equal(zeilen[2].split(";")[0], "Laden Eins"); assert.equal(zeilen[4].split(";")[1], "fehlt");
  const dok = E.eigentuemerDokument(ue); assert.equal(dok.beispiel, null); assert.equal(dok.abschnitte.length, 4); assert.equal(dok.abschnitte[0].kopf.length, 9);
  for (const ab of dok.abschnitte) for (const z of ab.zeilen) for (const zelle of (z.zellen || z)) assert.equal(typeof zelle, "string", ab.titel);
});

test("Alle 18 Sprachen: Sätze und Zellen liefern Text, keine verbotenen Wörter", async () => {
  const a = laden("Laden Eins", "a"), b = zwei(); const w = wurzelMit(a, b);
  const VERBOTEN = ["revolutionär", "disruptiv", "Marktführer", "GoBD-konform", "betriebsprüfungsfest", "steuersicher", "rechtssicher"];
  for (const code of i18n.SPRACHEN) {
    await i18n.ladeSprache(code); i18n.setzeSprache(code);
    const ue = E.eigentuemerUebersicht(w, WOCHE, { H, K });
    assert.ok(ue.satz && ue.satz.text.length > 5, code);
    const html = E.eigentuemerHtml(ue); const csv = E.eigentuemerCsv(ue).text;
    assert.ok(!/NaN|undefined/.test(html + csv), code);
    for (const v of VERBOTEN) assert.ok(!(html + csv).toLowerCase().includes(v.toLowerCase()), code + ": " + v);
    for (const l of ue.laeden) for (const [k, v] of Object.entries(E.ladenZellen(l))) assert.equal(typeof v, "string", code + " " + k);
  }
  i18n.setzeSprache("de");
});

test("Personal-Modus: Ebene nicht erreichbar, eig-Handlungen gesperrt; Bildschirm zeichnet ohne zu schreiben", async () => {
  assert.equal(ansichtErlaubt({ modus: "personal" }, "laeden"), false); assert.equal(ansichtErlaubt({ modus: "buero" }, "laeden"), true);
  for (const n of ["eig-zeit", "eig-druck", "eig-csv"]) assert.equal(personalGesperrt(n, "woche", H), true, n);
  const a = laden("Laden Eins", "a"), b = zwei(); const w = wurzelMit(a, b);
  const { navKontext } = await import("../js/screens/nav.js"); navKontext(a, w, "laeden");
  const L = await import("../js/screens/laeden.js"); L.laedenZuruecksetzen();
  const vorher = JSON.stringify(w); const html = L.laedenView(w);
  assert.equal(JSON.stringify(w), vorher, "Zeichnen schreibt nicht");
  assert.ok(html.includes('data-eig-satz="kuehl"') && html.includes("Laden Zwei: 2 Kühlrundgänge fehlen"));
  assert.ok(html.includes('data-a="eig-zeit" data-wert="monat"') && html.includes('data-a="eig-druck"') && html.includes('data-a="eig-csv"'));
  assert.equal((html.match(/data-eig-laden=/g) || []).length, 2); assert.ok(html.includes('data-a="laden-wechseln" data-id="b"'), "Tipp auf Laden Zwei wechselt");
  assert.ok(!/NaN|undefined/.test(html));
  // Zeitraum-Wahl: Monat, dann frei mit Datum
  assert.equal(await L.laedenAktion("eig-zeit", { dataset: { wert: "monat" } }, w), true); assert.ok(L.laedenView(w).includes('data-wert="monat" aria-pressed="true"'));
  assert.equal(L.laedenEingabe("eig-von", tagPlus(H, -20)), true); assert.ok(L.laedenView(w).includes('data-wert="frei" aria-pressed="true"'));
  assert.equal(L.laedenEingabe("eig-von", "kein datum"), false);
  assert.equal(await L.laedenAktion("laden-neu", { dataset: {} }, w), false);
  L.laedenZuruecksetzen(); assert.ok(L.laedenView(w).includes('data-wert="woche" aria-pressed="true"'));
});
