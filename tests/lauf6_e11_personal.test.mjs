// Lauf 6, Etappe 11: Personal-Modus – Wartezeit des Codes, Eingaben, Fotos, Kachel-Ziele, Hilfe.
// Browser-Teil: tests/personal_haertung_browser.py
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lesenQ = (p) => fs.readFileSync(path.join(WURZEL, p), "utf8");
const S = await import("../js/store.js");
const i18n = await import("../js/i18n.js"); i18n.setzeSprache("de");
const M = await import("../js/modus.js");
const R = await import("../js/rettung.js");
const { Z } = await import("../js/bedienung/zustand.js");

// ───── 1: Wartezeit und Uhr ─────
const T0 = Date.parse("2026-11-13T10:00:00Z"); const MIN = 60000; const TAG = 86400000;
test("1: Uhr vorgestellt, fünf Fehlversuche, Uhr zurück – die Wartezeit endet spätestens nach 15 min + 1 s", async () => {
  const w = {}; await M.pinSetzen(w, "1234");
  const vor = T0 + 3 * TAG; // Handy-Uhr drei Tage vorgestellt
  for (let i = 0; i < 5; i++) M.fehlversuch(w, vor);
  assert.ok(w.pinSperre.bis > vor, "Sperre läuft in der Zukunft");
  assert.ok(M.sperreRest(w, T0) > 0 && M.sperreRest(w, T0) <= M.SPERRE_MAX_MS, "Anzeige gekappt");
  assert.ok(w.pinSperre.bis - T0 <= M.SPERRE_MAX_MS, "gespeichert gekappt, nicht nur die Anzeige");
  assert.equal(w.pinSperre.fehler, 5, "der Zähler bleibt");
  assert.ok(M.sperreRest(w, T0 + 14 * MIN) > 0);
  assert.equal(M.sperreRest(w, T0 + 15 * MIN + 1000), 0, "nach 15 min + 1 s vorbei");
  assert.equal(M.sperreRestUhr(w, T0 + 15 * MIN + 1000), 0);
});
test("1: Auch eine später gelesene Sperre (neues Laden) wird gekürzt und über den Haken gespeichert; Zähler der 10 Fehlversuche unberührt", async () => {
  const w = {}; await M.pinSetzen(w, "1234"); w.pinSperre = { fehler: 8, bis: T0 + 40 * TAG };
  let gespeichert = 0; M.sperreKappenHaken(() => { gespeichert += 1; });
  try {
    assert.ok(M.sperreKappen(w, T0)); assert.equal(w.pinSperre.bis, T0 + M.SPERRE_MAX_MS); assert.equal(w.pinSperre.fehler, 8); assert.equal(gespeichert, 1);
    assert.equal(M.sperreKappen(w, T0 + 1000), false, "zweites Lesen ändert nichts mehr"); assert.equal(gespeichert, 1);
  } finally { M.sperreKappenHaken(null); }
  assert.equal(M.sperreRest(w, T0 + M.SPERRE_MAX_MS + 1000), 0);
  const normal = {}; M.fehlversuch(normal, T0); const bis = normal.pinSperre.bis; // 0 s Fehlerzahl <5 → bis 0
  assert.equal(normal.pinSperre.bis, bis); assert.equal(M.sperreKappen(normal, T0), false);
  const echt = {}; for (let i = 0; i < 5; i++) M.fehlversuch(echt, T0); assert.equal(M.sperreRest(echt, T0 + 1000), 30000 - 1000, "eine echte Wartezeit bleibt unverkürzt");
});
test("1: Rettungscode – eine Zukunfts-Sperre blockiert nie länger als die Höchstdauer; bei harter Sperre bleibt er offen", async () => {
  const w = {}; await M.pinSetzen(w, "1234"); const code = await R.rettungAnlegen(w);
  for (let i = 0; i < 5; i++) M.fehlversuch(w, T0 + 5 * TAG); // Uhr vorgestellt, dann zurück
  const r1 = await R.rettungVersuch(w, code, { jetzt: T0 }); assert.ok(r1.gesperrt > 0 && r1.gesperrt <= M.SPERRE_MAX_MS, "kurz danach: gesperrt, höchstens 15 min");
  const r2 = await R.rettungVersuch(w, code, { jetzt: T0 + 15 * MIN + 1000 }); assert.deepEqual(r2, { ok: true }, "nach der Höchstdauer geht der Rettungscode");
  assert.equal(w.pinSperre, undefined);
  // harte Sperre (10 Fehlversuche) mit Zukunfts-Datum: der Büro-Code bleibt zu, der Rettungscode wird nur von der gekappten Uhr gebremst
  const h = {}; await M.pinSetzen(h, "1234"); const hc = await R.rettungAnlegen(h);
  for (let i = 0; i < 10; i++) M.fehlversuch(h, T0 + 9 * TAG);
  assert.equal(M.hartGesperrt(h), true); assert.ok(M.sperreRest(h, T0 + 30 * TAG) > 0, "Büro-Code bleibt hart gesperrt");
  assert.equal(h.pinSperre.fehler, 10);
  const r3a = await R.rettungVersuch(h, hc, { jetzt: T0 }); assert.ok(r3a.gesperrt > 0 && r3a.gesperrt <= M.SPERRE_MAX_MS, "höchstens 15 min, obwohl „bis“ neun Tage voraus lag");
  const r3 = await R.rettungVersuch(h, hc, { jetzt: T0 + 16 * MIN }); assert.deepEqual(r3, { ok: true });
});

// ───── 4: Felder ─────
test("4: PERSONAL_FELDER – gesperrt sind Sprache, Euro-Nachträge, Einrichtung und alles Fremde", () => {
  for (const f of ["sprache-wahl", "wert:abc", "stelle-name:k1", "stelle-max:k1", "stelle-min:k1", "stelle-neu", "person-neu", "umsatz", "kw-name", "kw-menge", "fv-preis:x", "passwort", "eigenes", "buero-code", "", undefined, null]) {
    assert.equal(M.personalFeldErlaubt(f), false, String(f)); assert.equal(M.personalFeldGesperrt(f), true, String(f));
  }
  for (const f of ["muell-menge", "muell-suche", "muell-foto", "station-wert", "station-notiz", "weg-name", "weg-menge", "rettungscode"]) assert.equal(M.personalFeldErlaubt(f), true, f);
  assert.ok(!M.PERSONAL_FELDER.has("sprache-wahl") && ![...M.PERSONAL_FELDER].some((f) => f.startsWith("wert:")));
});

const laden = () => {
  const s = S.leererBetrieb(); s.phase = "app"; s.betrieb.name = "Test";
  s.artikel = [{ name: "Burgerbrötchen", gruppe: "brot", einheit: "stk", packung: { menge: 10, einheit: "stk" }, preis: 3, benutzt: true }];
  s.gerichte = [{ id: "b1", name: "Smash Burger", klasse: "haupt", preis: 9, zutaten: [] }];
  s.kuehlstellen = [{ id: "k1", name: "Kühlschrank", art: "kuehl", min: 0, max: 7, reihe: 0, archiviert: false }];
  s.kuehl = { ...s.kuehl, eingerichtet: true, seit: "2026-01-01" };
  s.personen = [{ id: "p1", kuerzel: "BA", aktiv: true }];
  return s;
};
const felderIn = (html) => [...String(html).matchAll(/data-f="([^"]+)"/g)].map((m) => m[1]);

test("4: Registertest – jedes data-f, das eine Personal-Ansicht zeichnet, steht in PERSONAL_FELDER", async () => {
  const { personalKontext, personalView } = await import("../js/screens/personal.js");
  const MU = await import("../js/screens/muell.js"); const KU = await import("../js/screens/kuehl.js"); const PP = await import("../js/screens/putzplan.js");
  const s = laden(); const w = S.leereWurzel(); w.betriebe = [s]; w.aktiv = s.id; w.modus = "personal";
  personalKontext(w);
  const alle = new Set(); const sammeln = (html) => felderIn(html).forEach((f) => alle.add(f));
  const el = (dataset = {}) => ({ dataset });
  sammeln(personalView(s));
  // Müll: Start, Station, Mengenblatt, Suche („Andere“)
  MU.muellZuruecksetzen(); sammeln(MU.muellView(s));
  MU.muellAktion("muell-station-auf", el(), s); sammeln(MU.muellView(s)); MU.muellAktion("muell-station-zu", el(), s);
  MU.muellAktion("muell-andere", el(), s); sammeln(MU.muellView(s)); MU.muellAktion("muell-auswahl", el(), s); sammeln(MU.muellView(s));
  MU.muellAktion("muell-kachel", el({ typ: "artikel", id: "", name: "Burgerbrötchen" }), s); sammeln(MU.muellView(s));
  for (const g of ["roh", "personal", "bruch"]) { MU.muellZuruecksetzen(); MU.muellAktion("muell-grund", el({ wert: g }), s); sammeln(MU.muellView(s)); }
  MU.muellZuruecksetzen();
  // Kühlung: Start, Rundgang mit Messfeld, Abweichung mit Maßnahme „weggeworfen“, Nicht-gemessen
  KU.kuehlZuruecksetzen(); sammeln(KU.kuehlView(s));
  assert.equal(KU.kuehlAktion("kuehl-rundgang-los", el(), s, w), true); sammeln(KU.kuehlView(s));
  KU.kuehlEingabe("station-wert", "12", s); sammeln(KU.kuehlView(s));
  KU.kuehlAktion("massnahme", el({ wert: "weggeworfen" }), s, w); sammeln(KU.kuehlView(s));
  KU.kuehlAktion("station-nk-auf", el(), s, w); sammeln(KU.kuehlView(s));
  KU.kuehlEingabe("weg-name", "Bur", s); sammeln(KU.kuehlView(s));
  KU.kuehlZuruecksetzen();
  // Putzplan
  PP.putzplanZuruecksetzen(); sammeln(PP.putzplanView(s));
  // Schloss und Rettung zeichnen in der Blatt-Hülle (Browser-Test); hier der Quelltext
  const rettung = lesenQ("js/screens/ebene.js").match(/data-f="rettungscode"/);
  assert.ok(rettung); alle.add("rettungscode");
  assert.ok(alle.size >= 5, "die Ansichten wurden wirklich gezeichnet: " + [...alle].join(","));
  for (const f of alle) assert.ok(M.PERSONAL_FELDER.has(f), `Personal-Ansicht zeichnet data-f="${f}", das nicht in PERSONAL_FELDER steht`);
  for (const f of ["muell-menge", "muell-suche", "station-wert", "station-notiz", "weg-name"]) assert.ok(alle.has(f), "wurde gezeichnet: " + f);
});
test("4: Quelltext – jede data-f-Zeile der Personal-Bildschirme (Müll, Kühl-Rundgang, Putzplan, Personal) steht in der Liste, außer den Einrichtungs- und Büro-Feldern", () => {
  const nurBuero = /^(stelle-|person-neu$)/;
  for (const datei of ["js/screens/muell.js", "js/screens/putzplan.js", "js/screens/personal.js", "js/screens/kuehl.js"]) {
    for (const f of felderIn(lesenQ(datei))) { const name = f.replace(/\$\{[^}]*\}/g, ""); const roh = name.replace(/:$/, "");
      if (nurBuero.test(roh)) continue;
      assert.ok(M.PERSONAL_FELDER.has(roh), `${datei}: data-f="${f}" steht nicht in PERSONAL_FELDER (und ist kein Einrichtungsfeld)`); }
  }
});

// Eingabe-Weiche: fremde Felder bewirken im Personal-Modus nichts
function dokumentAttrappe() {
  const melder = { textContent: "", classList: { add() {}, remove() {} } };
  globalThis.document = { querySelector: () => melder, createElement: () => melder, body: { appendChild() {} }, activeElement: null, addEventListener() {} };
  Z.root = { querySelector: () => null, querySelectorAll: () => [] };
}
async function weiche() {
  dokumentAttrappe();
  const E = await import("../js/bedienung/eingabe.js");
  const s = laden(); const w = S.leereWurzel(); w.betriebe = [s]; w.aktiv = s.id; w.modus = "personal"; w.sprache = "de";
  Z.wurzel = w; Z.stand = s; Z.ansicht = "kuehl";
  return { E, s, w };
}
const ereignisFuer = (f, value = "x", extra = {}) => { const el = { dataset: { f }, value, type: "text", getAttribute: () => null, closest() { return this; }, ...extra }; return { target: el, key: "" }; };
test("4: aufEingabe und aufFeldVerlassen – im Personal-Modus bewirken sprache-wahl, wert:*, stelle-* und Fremdes nichts", async () => {
  const { E, s, w } = await weiche();
  const e1 = { id: "e1", datum: "2026-11-13", art: "roh", menge: 1, wert: null, wertOffen: true, ref: { name: "Burgerbrötchen" }, storniert: false }; s.schwund = [e1];
  E.aufEingabe(ereignisFuer("sprache-wahl", "tr")); assert.equal(w.sprache, "de", "Sprache bleibt");
  E.aufFeldVerlassen(ereignisFuer("wert:e1", "5,00", { getAttribute: () => "decimal" })); assert.equal(e1.wert, null, "kein Euro-Nachtrag"); assert.equal(e1.wertOffen, true);
  E.aufEingabe(ereignisFuer("stelle-name:k1", "Hacked")); assert.equal(s.kuehlstellen[0].name, "Kühlschrank");
  E.aufEingabe(ereignisFuer("stelle-max:k1", "99")); assert.equal(s.kuehlstellen[0].max, 7);
  E.aufEingabe(ereignisFuer("irgendwas", "1")); E.aufFeldVerlassen(ereignisFuer("irgendwas", "1,2,3", { getAttribute: () => "decimal" }));
  // Gegenprobe: im Laden-Modus wirkt dasselbe Feld (der Test prüft also wirklich die Weiche)
  w.modus = "laden"; Z.ansicht = "karte"; E.aufFeldVerlassen(ereignisFuer("wert:e1", "5,00", { getAttribute: () => "decimal" })); assert.equal(e1.wert, 5, "im Laden wird nachgetragen");
});
test("4: aufEingabe – Felder der Positivliste kommen im Personal-Modus durch (Messwert)", async () => {
  const { E, s, w } = await weiche();
  const KU = await import("../js/screens/kuehl.js"); const el = (dataset = {}) => ({ dataset });
  KU.kuehlZuruecksetzen(); KU.kuehlAktion("kuehl-rundgang-los", el(), s, w);
  const z = (await import("../js/screens/personal.js")); z.personalKontext(w);
  const vor = KU.kuehlFormGueltig(); assert.equal(vor, false);
  E.aufEingabe(ereignisFuer("station-wert", "4")); assert.equal(KU.kuehlFormGueltig(), true, "Messwert wurde übernommen");
});

// ───── 3: Fotos ─────
test("3: aufAenderung – im Personal-Modus geht nur muell-foto; alles andere wird nicht einmal gelesen", async () => {
  const F = await import("../js/bedienung/fotos.js");
  const s = laden(); const w = S.leereWurzel(); w.betriebe = [s]; w.aktiv = s.id; w.modus = "personal"; Z.wurzel = w; Z.stand = s; Z.ansicht = "muell";
  const aufgerufen = []; const alt = { ...F.AENDERUNG };
  for (const k of Object.keys(F.AENDERUNG)) F.AENDERUNG[k] = async (el, d) => { aufgerufen.push(k); };
  try {
    const datei = { name: "a.png", type: "image/png", size: 3 };
    const ev = (f, extra = {}) => ({ target: { files: [datei], value: "x", dataset: { f, ...extra } } });
    for (const f of ["import", "verkauf-datei", "zbon-foto", "gericht-foto", "foto"]) await F.aufAenderung(ev(f, { zweck: "speisekarte" }));
    await F.aufAenderung(ev("irgendwas")); assert.deepEqual(aufgerufen, [], "nichts davon im Personal-Modus");
    await F.aufAenderung(ev("muell-foto")); assert.deepEqual(aufgerufen, ["muell-foto"]);
    w.modus = "laden"; aufgerufen.length = 0;
    for (const f of ["import", "verkauf-datei", "zbon-foto", "gericht-foto", "foto", "muell-foto"]) await F.aufAenderung(ev(f)); assert.equal(aufgerufen.length, 6, "außerhalb von Personal laufen alle");
  } finally { Object.assign(F.AENDERUNG, alt); }
});
test("3: Müll-Foto – nur Bilddateien (image/*); anderes wird still abgewiesen, nichts abgelegt", async () => {
  const F = await import("../js/bedienung/fotos.js");
  const s = laden(); const w = S.leereWurzel(); w.betriebe = [s]; w.aktiv = s.id; w.modus = "personal"; Z.wurzel = w; Z.stand = s; Z.ansicht = "muell";
  const vorher = JSON.stringify(s.uploads || []);
  const warn = console.warn; let gewarnt = 0; console.warn = () => { gewarnt += 1; };
  try {
    for (const type of ["application/pdf", "text/plain", "", "application/octet-stream", "text/html"]) {
      const roh = { target: { files: [{ name: "x." + type.split("/")[1], type, size: 5 }], value: "x", dataset: { f: "muell-foto" } } };
      await F.aufAenderung(roh);
    }
  } finally { console.warn = warn; }
  assert.equal(JSON.stringify(s.uploads || []), vorher, "nichts abgelegt"); assert.equal(gewarnt, 0, "nicht einmal ein Ablage-Versuch (kein Fehlerpfad)");
  const q = lesenQ("js/bedienung/fotos.js"); assert.match(q, /\^image\\\//, "Typ-Prüfung steht im Müll-Foto-Weg");
});

// ───── C1, C4 ─────
test("C1: personal-ziel – nur muell, kuehl, putzplan; sonst passiert nichts", async () => {
  const P = await import("../js/bedienung/personal.js");
  const s = laden(); const w = S.leereWurzel(); w.betriebe = [s]; w.aktiv = s.id; w.modus = "personal"; Z.wurzel = w; Z.stand = s; Z.ansicht = "personal"; Z.herkunft = null;
  assert.deepEqual(M.PERSONAL_ZIELE, ["muell", "kuehl", "putzplan"]);
  for (const f of ["buero", "start", "einstellungen", "umsatz", "karte", "personal", "", undefined, "__proto__", "muell ", "MUELL"]) {
    await P.personalKlick("personal-ziel", { dataset: { wert: f } }); assert.equal(Z.ansicht, "personal", String(f)); assert.equal(Z.herkunft, null);
  }
  assert.equal(M.personalZielErlaubt("buero"), false); assert.equal(M.personalZielErlaubt("muell"), true);
});
test("C4: hilfe-mehr im Personal-Modus – nur Hilfe-Einträge der Personal-Ansichten", async () => {
  const B = await import("../js/bedienung/ebene.js");
  const s = laden(); const w = S.leereWurzel(); w.betriebe = [s]; w.aktiv = s.id; Z.wurzel = w; Z.stand = s;
  assert.deepEqual(M.PERSONAL_HILFE, ["personal", "muell", "kuehl", "putzplan"]);
  for (const f of ["buero", "abschluss", "karte", "start", "laeden", "allgemein", "", undefined]) assert.equal(M.personalHilfeErlaubt(f), false, String(f));
  for (const f of ["personal", "muell", "kuehl", "putzplan"]) assert.equal(M.personalHilfeErlaubt(f), true, f);
  // Die Klick-Tabelle: im Personal-Modus mit fremdem Wert kein Blatt (hilfeZeigen würde auf die Hülle zugreifen)
  w.modus = "personal";
  const r = await B.KLICK["hilfe-mehr"]({ dataset: { wert: "buero" } }); assert.equal(r, undefined);
  const q = lesenQ("js/bedienung/ebene.js"); assert.match(q, /"hilfe-mehr": \(el\) => \{ if \(modus\(Z\.wurzel\) === "personal" && !personalHilfeErlaubt/);
});
