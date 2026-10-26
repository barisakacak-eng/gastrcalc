// Drei Ebenen, Punkt 8 + 9 (15.10.2026): Müll mit einem Tipp und Personal-Modus ohne Euro
import test from "node:test";
import { navKontext } from "../js/screens/nav.js";
import assert from "node:assert/strict";
globalThis.document ??= { documentElement: {} };
import { leererBetrieb } from "../js/store.js";
import { standardMenge, muellTippEintragen, muellStornieren, tippsHeute, muellHeute, rohwareWeg, haeufigsteMuell } from "../js/muell.js";
import { muellView, muellTipp, muellTippZurueck, muellAktion, muellZuruecksetzen, _muellZustand } from "../js/screens/muell.js";
import { personalView, personalKontext, vonNachtragen, schichtPersonSetzen, schichtPerson, personalVon } from "../js/screens/personal.js";
import { modus, modusSetzen } from "../js/modus.js";
import { heute } from "../js/util.js";

const laden = () => {
  const s = leererBetrieb(); s.phase = "app"; s.betrieb.name = "Döner Çağrı";
  s.gerichte = [{ id: "d", name: "Döner Kebab", klasse: "haupt", preis: 7.5, steuer: 0.07, zutaten: [{ name: "Dönerfleisch", menge: 150, einheit: "g" }, { name: "Fladenbrot", menge: 1, einheit: "stk" }] }];
  s.artikel = [
    { name: "Dönerfleisch", gruppe: "fleisch", einheit: "kg", packung: { menge: 10, einheit: "kg" }, preis: 90, preisBasis: "netto", benutzt: true },
    { name: "Fladenbrot", gruppe: "brot", einheit: "stk", packung: { menge: 20, einheit: "stk" }, preis: 8, preisBasis: "netto", benutzt: true },
    { name: "Knoblauchsauce", gruppe: "sosse", einheit: "l", packung: { menge: 5, einheit: "l" }, preis: 15, preisBasis: "netto", benutzt: true }];
  s.personen = [{ id: "p1", kuerzel: "Ayşe", aktiv: true, entfernt: false }];
  return s;
};
// Kachel-Element für die Aktionen (wie im DOM: data-typ, data-id, data-name)
const kachel = (typ, id, name) => ({ dataset: { typ, id: id || "", name } });

test("Übliche Menge: Gericht 1 Portion, Rohware nach Einheit, danach die zuletzt eingetragene Menge", () => {
  const s = laden();
  assert.deepEqual(standardMenge(s, { typ: "gericht", id: "d", name: "Döner Kebab" }), { menge: 1, einheit: "portion" });
  assert.deepEqual(standardMenge(s, { typ: "artikel", name: "Dönerfleisch" }), { menge: 250, einheit: "g" });
  assert.deepEqual(standardMenge(s, { typ: "artikel", name: "Fladenbrot" }), { menge: 1, einheit: "stk" });
  assert.deepEqual(standardMenge(s, { typ: "artikel", name: "Knoblauchsauce" }), { menge: 100, einheit: "ml" });
  rohwareWeg(s, s.artikel[0], { menge: 0.4, einheit: "kg" });
  assert.deepEqual(standardMenge(s, { typ: "artikel", name: "Dönerfleisch" }), { menge: 0.4, einheit: "kg" });
});

test("Ein Tipp trägt sofort ein, mit Wert; Zähler je Kachel; Rückgängig storniert (löscht nie)", () => {
  const s = laden();
  const e1 = muellTippEintragen(s, { typ: "artikel", name: "Dönerfleisch" });
  assert.equal(e1.menge, 250); assert.equal(e1.einheit, "g"); assert.ok(Math.abs(e1.wert - 2.25) < 1e-9); assert.equal(e1.tipp, true);
  const e2 = muellTippEintragen(s, { typ: "gericht", id: "d", name: "Döner Kebab" });
  muellTippEintragen(s, { typ: "gericht", id: "d", name: "Döner Kebab" });
  assert.equal(e2.art, "gericht"); assert.equal(e2.menge, 1);
  assert.deepEqual(tippsHeute(s), { "a:Dönerfleisch": 1, "g:d": 2 });
  assert.equal(muellStornieren(s, e2.id), 1); assert.equal(s.schwund.length, 3); assert.ok(s.schwund.find((x) => x.id === e2.id).storniert);
  assert.deepEqual(tippsHeute(s), { "a:Dönerfleisch": 1, "g:d": 1 });
  assert.equal(muellHeute(s).anzahl, 2);
  assert.equal(muellStornieren(s, e2.id), 0, "zweimal stornieren zählt nicht");
});

test("Raster: getippte Ware wandert nach vorne; 8 Kacheln + „Andere“", () => {
  const s = laden();
  for (let i = 0; i < 3; i++) muellTippEintragen(s, { typ: "artikel", name: "Knoblauchsauce" });
  assert.equal(haeufigsteMuell(s, { max: 8 })[0].name, "Knoblauchsauce");
  personalKontext({ modus: "laden" }); muellZuruecksetzen();
  const h = muellView(s);
  // 27.10.2026: Lebensmittel zuerst – der erste Reiter zeigt nur Waren (3 Artikel), Gerichte stehen unter „Personalessen“ und „Ganze Gerichte“
  assert.ok(h.includes('data-a="muell-andere"')); assert.equal((h.match(/data-a="muell-tipp"/g) || []).length, 3);
  assert.ok(h.includes('data-a="muell-grund"') && h.includes("zeki-zeile"));
  assert.ok(h.includes("3×"), "Zähler an der Kachel");
  assert.ok(!h.includes("Çöp gir") && !h.includes("Add waste") && !h.includes(" · Waste"), "keine dreisprachigen Untertitel");
});

test("Bildschirm-Tipp und Rückgängig über die Aktionen", () => {
  const s = laden(); personalKontext({ modus: "laden" }); muellZuruecksetzen();
  const r = muellTipp(kachel("artikel", "", "Fladenbrot"), s);
  assert.ok(r.eintrag); assert.equal(s.schwund.length, 1);
  assert.ok(muellView(s).includes("muelltoast"), "Hinweis mit Rückgängig sichtbar");
  assert.equal(muellTipp(kachel("artikel", "", "Fladenbrot"), s), false, "Doppeltipp zählt einmal");
  assert.equal(muellTippZurueck(s, r.eintrag.id), 1); assert.ok(s.schwund[0].storniert);
  assert.equal(_muellZustand().zuletzt, null);
  // Lang drücken / „…" öffnet das Detail mit vorbelegter Menge
  assert.ok(muellAktion("muell-detail", kachel("artikel", "", "Dönerfleisch"), s));
  assert.equal(_muellZustand().ansicht, "eingabe"); assert.equal(_muellZustand().wahl.menge, 250);
  assert.ok(muellView(s).includes('data-a="muell-weg-damit"'));
  // „Andere" öffnet die Suche mit Eimer
  muellZuruecksetzen(); muellAktion("muell-andere", kachel(), s);
  const h = muellView(s); assert.ok(h.includes('data-f="muell-suche"') && h.includes('data-typ="eimer"'));
});

test("Laden zeigt Euro, Personal-Modus zeigt keinen einzigen Euro (Müll-Raster, Detail, Start)", () => {
  const s = laden(); muellZuruecksetzen();
  personalKontext({ modus: "laden" });
  muellTipp(kachel("artikel", "", "Dönerfleisch"), s);
  assert.ok(muellView(s).includes("€"), "Laden: Tageswert in Euro");
  const w = { modus: "personal" }; personalKontext(w); navKontext(s, w, "muell");
  muellZuruecksetzen(); muellTipp(kachel("gericht", "d", "Döner Kebab"), s);
  const raster = muellView(s);
  assert.ok(!raster.includes("€") && !/EUR/.test(raster), "Raster ohne Euro");
  assert.ok(raster.includes("2×"), "Kopfzahl als Anzahl");
  assert.ok(raster.includes('data-a="schloss"'), "Schloss oben rechts (Kopf aus nav.js)");
  muellAktion("muell-detail", kachel("gericht", "d", "Döner Kebab"), s); muellAktion("muell-personal", {}, s);
  const detail = muellView(s); assert.ok(!detail.includes("€"), "Detail ohne Euro, auch beim Personalessen");
  const start = personalView(s); assert.ok(!start.includes("€"));
  personalKontext({ modus: "laden" });
});

test("Personal-Modus: Person einmal je Schicht wählen; Einträge tragen von", () => {
  const s = laden(); const w = { modus: "personal" }; personalKontext(w);
  assert.ok(personalView(s).includes('data-a="personal-wer"'), "erst: Wer arbeitet?");
  schichtPersonSetzen(s, "p1");
  assert.equal(schichtPerson(s), "p1"); assert.equal(schichtPerson(s, "2099-01-01"), null, "neue Schicht = neu wählen");
  const h = personalView(s);
  assert.ok(h.includes("Ayşe") && h.includes('data-wert="muell"') && h.includes('data-wert="kuehl"') && h.includes('data-wert="putzplan"'));
  assert.ok(h.includes("m-eimer-foto") && h.includes("k-getraenke-foto"));
  muellZuruecksetzen(); const r = muellTipp(kachel("artikel", "", "Fladenbrot"), s);
  assert.equal(r.eintrag.von, "p1");
  assert.equal(personalVon(s), "p1");
  // Kühlrundgang und Putzhaken ohne Person bekommen die Schicht-Person nachgetragen
  const jetzt = new Date().toISOString();
  s.rundgaenge.push({ id: "r", datum: heute(), von: null, gestartet: jetzt, messungen: [{ stelle: "k", erfasst: jetzt }] });
  s.putzlog ??= []; s.putzlog.push({ id: "x", aufgabe: "R01", datum: heute(), erfasst: jetzt, von: null });
  s.putzlog.push({ id: "y", aufgabe: "R02", datum: heute(), erfasst: jetzt, von: "andere" });
  assert.equal(vonNachtragen(s, "p1", "2000-01-01"), 3);
  assert.equal(s.rundgaenge[0].von, "p1"); assert.equal(s.putzlog[0].von, "p1"); assert.equal(s.putzlog[1].von, "andere", "fremde Person bleibt");
  personalKontext({ modus: "laden" }); assert.equal(personalVon(s), null, "im Laden-Modus kein von");
});

test("Ebenen-Stub", () => {
  const w = {}; assert.equal(modus(w), "laden"); modusSetzen(w, "personal"); assert.equal(modus(w), "personal"); modusSetzen(w, "quatsch"); assert.equal(modus(w), "personal");
});
