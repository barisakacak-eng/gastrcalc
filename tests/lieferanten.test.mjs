// Lieferanten (18.10.2026): Lieferanten als Stammdaten – Migration aus Beleg-Namen, Liefertage/Bestellschluss/Ruhetage, Bedarf bis zur
// übernächsten Lieferung, Mindestbestellwert-Hinweis, Abholung, Uhrzeit-Sätze (nur Büro), Teilen-Text mit Bestellweg, Sicherung und
// Zusammenführen, Oberfläche. Dazu: Kürzel ausgeschiedener Mitarbeiter (Auswahl-Listen, alte Nachweise mit Datum, Hinweis im Büro).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { idbAttrappe } from "./hilfe/idb_attrappe.mjs";
const st = await import("../js/store.js");
const L = await import("../js/lieferant.js");
const b = await import("../js/bestand.js");
const vk = await import("../js/verkauf.js");
const inv = await import("../js/inventur.js");
const { lieferungAnlegen } = await import("../js/lieferung.js");
const { beispielLaden } = await import("../js/beispiel.js");
const B = await import("../js/screens/bestand.js");
const i18n = await import("../js/i18n.js");
i18n.setzeSprache("de");
const HIER = path.dirname(fileURLToPath(import.meta.url));
const MO = "2026-10-19"; // Montag
const nb = (x) => (Array.isArray(x) ? x.map(nb) : String(x).replace(/\s/g, " ")); // Euro-Beträge tragen ein festes Leerzeichen
const um = (tag, h, m = 0) => new Date(`${tag}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);

// Testladen: Sonntag Ruhetag. Fleisch (Karton 10 kg, 80 €) 2 kg je Öffnungstag, Cola (Kiste 24, 12 €) 24 je Öffnungtag (10 Tage Verkauf vor dem 19.10.).
// Inventur So 18.10. abends: Fleisch 0,3 Karton (3 kg), Cola 7 Kisten (168). Beide zuletzt bei „Metro“ gekauft.
function laden({ ruhetage = [0], fleisch = 0.3, cola = 7 } = {}) {
  const s = st.leererBetrieb(); s.phase = "app"; s.betrieb.name = "Testladen"; s.kuehl.ruhetage = ruhetage;
  s.gerichte = [{ id: "g1", name: "Teller", preis: 12, klasse: "haupt", zutaten: [{ name: "Fleisch", menge: 200, einheit: "g" }] },
    { id: "g2", name: "Cola", preis: 2.5, klasse: "getraenk", zutaten: [{ name: "Cola", menge: 1, einheit: "stk" }] }];
  s.artikel = [{ name: "Fleisch", gruppe: "fleisch", einheit: "kg", packung: { menge: 10, einheit: "kg" }, gebinde: { art: "karton", zwischen: null }, preis: 80, preisBasis: "netto" },
    { name: "Cola", gruppe: "getraenk", einheit: "stk", packung: { menge: 24, einheit: "stk" }, gebinde: { art: "kiste", zwischen: null }, preis: 12, preisBasis: "netto" }];
  s.lieferungen.push({ id: "l1", datum: "2026-10-05", erfasst: "2026-10-05T09:00:00.000Z", lieferant: "Metro", zeilen: [{ artikel: "Fleisch", menge: 1, inhaltMenge: 10, inhaltEinheit: "kg", netto: 80 }, { artikel: "Cola", menge: 1, inhaltMenge: 24, inhaltEinheit: "stk", netto: 12 }], storniert: false });
  const m = st.migrierenBetrieb(s);
  for (let i = 1, n = 0; n < 10; i++) { const d = new Date(2026, 9, 18 - i); if (d.getDay() === 0) continue; const iso = `2026-10-${String(d.getDate()).padStart(2, "0")}`; vk.handVerkaufSetzen(m, iso, "g1", 10); vk.handVerkaufSetzen(m, iso, "g2", 24); n++; }
  const i = inv.inventurStarten(m, { datum: "2026-10-18", jetzt: "2026-10-18T19:00:00.000Z" });
  inv.mengeSetzen(i, "Fleisch", fleisch); inv.mengeSetzen(i, "Cola", cola);
  inv.inventurAbschliessen(m, i, { datum: "2026-10-18", jetzt: "2026-10-18T19:30:00.000Z" });
  return m;
}
const metro = (s) => L.lieferantZuName(s, "Metro");
const setze = (s, f) => { const r = L.lieferantSetzen(s, metro(s).id, f, { jetzt: "2026-10-18T10:00:00.000Z" }); assert.equal(r.ok, true, JSON.stringify(r)); return r.lieferant; };
const zeile = (v, n) => v.zeilen.find((z) => z.name === n);

// ---------- Migration ----------
test("Migration: Beleg-Namen werden Lieferanten – eine Kennung je Name (auf jedem Handy gleich), Art geraten, idempotent; storniert zählt nicht", () => {
  const s = st.leererBetrieb();
  s.lieferungen = [{ id: "a", datum: "2026-10-01", erfasst: "2026-10-01T08:00:00Z", lieferant: "Metro", zeilen: [], storniert: false },
    { id: "b", datum: "2026-10-02", erfasst: "2026-10-02T08:00:00Z", lieferant: " metro ", zeilen: [], storniert: false },
    { id: "c", datum: "2026-10-03", erfasst: "2026-10-03T08:00:00Z", lieferant: "Bäckerei Sonne", zeilen: [], storniert: false },
    { id: "d", datum: "2026-10-04", lieferant: "Getränke Nord", zeilen: [], storniert: true }, { id: "e", datum: "2026-10-04", lieferant: "", zeilen: [], storniert: false }];
  const m = st.migrierenBetrieb(structuredClone(s));
  assert.deepEqual(m.lieferanten.map((l) => l.name), ["Metro", "Bäckerei Sonne"]);
  const [me, ba] = m.lieferanten;
  assert.equal(me.id, L.lieferantKennung("Metro")); assert.equal(me.id, L.lieferantKennung(" METRO")); assert.equal(me.auto, true); assert.equal(me.erfasst, "2026-10-01T08:00:00Z");
  assert.equal(ba.art, "baeckerei"); assert.deepEqual(ba.tage, []); assert.equal(ba.schluss, null); assert.equal(ba.kontakt, "");
  assert.equal(JSON.stringify(st.migrierenBetrieb(structuredClone(m)).lieferanten), JSON.stringify(m.lieferanten), "zweimal migrieren ändert nichts");
  assert.equal(JSON.stringify(st.migrierenBetrieb(structuredClone(s)).lieferanten), JSON.stringify(m.lieferanten), "zweites Handy: gleiche Lieferanten");
  // entfernt: kommt nicht wieder; umbenannt: Belege finden ihn über namen
  L.lieferantEntfernen(m, ba.id); assert.equal(st.migrierenBetrieb(structuredClone(m)).lieferanten.filter((l) => !l.entfernt).length, 1);
  L.lieferantSetzen(m, me.id, { name: "Großhandel" }); assert.equal(L.lieferantZuName(m, "METRO").name, "Großhandel"); assert.deepEqual(L.lieferantZuName(m, "Metro").namen, ["Metro"]);
  assert.equal(st.migrierenBetrieb(structuredClone(m)).lieferanten.length, 2, "kein neuer „Metro“");
  // kaputte Einträge fallen weg, Felder werden geprüft
  const k = st.leererBetrieb(); k.lieferanten = [null, { id: "x" }, { id: "y", name: "Y", tage: [9, 2, 2, "1"], schluss: { uhr: "25:00", tageVorher: 1 }, mindestwert: -5, weg: "brief", art: "?" }];
  const y = st.migrierenBetrieb(k).lieferanten; assert.equal(y.length, 1); assert.deepEqual(y[0].tage, [2]); assert.deepEqual(y[0].schluss, { uhr: null, tageVorher: 1 });
  assert.equal(y[0].mindestwert, null); assert.equal(y[0].weg, null); assert.equal(y[0].art, "sonstiges");
  // Artikel: Kennungen nur als Text
  const a = st.leererBetrieb(); a.artikel = [{ name: "A", lieferantId: 3, lieferant2Id: "lf-x" }, { name: "B", lieferantId: "lf-y", lieferant2Id: "lf-y" }];
  const am = st.migrierenBetrieb(a).artikel; assert.ok(!("lieferantId" in am[0])); assert.equal(am[0].lieferant2Id, "lf-x"); assert.ok(!("lieferant2Id" in am[1]));
  // alte Läden ohne Feld
  const alt = st.leererBetrieb(); delete alt.lieferanten; assert.deepEqual(st.migrierenBetrieb(alt).lieferanten, []);
  assert.deepEqual(st.BEREICHE.lieferanten, ["lieferanten"]); assert.equal(i18n.t("w2d.bereich.lieferanten"), "Lieferanten");
});

test("Neuer Beleg mit neuem Händler: Lieferant entsteht sofort (lieferungAnlegen), Hauptlieferant = Lieferant des letzten Belegs", () => {
  const s = laden(); assert.equal(s.lieferanten.length, 1);
  lieferungAnlegen(s, { lieferant: "Frischdienst Süd", typ: "rechnung", basis: "netto", zeilen: [] }, { zeilen: [{ name: "Fleisch", bekannt: "Fleisch", menge: 1, gesamt: 75, inhalt: { anzahl: 1, groesse: 10, einheit: "kg" }, gebinde: "karton" }], datum: "2026-10-18" });
  assert.equal(s.lieferanten.length, 2); assert.equal(L.hauptLieferant(s, "Fleisch").name, "Frischdienst Süd"); assert.equal(L.hauptLieferant(s, "Cola").name, "Metro");
  // fest zugeordnet gewinnt vor dem Beleg; Zweitlieferant = Haupt fällt weg
  assert.equal(L.artikelLieferantSetzen(s, "Fleisch", { haupt: metro(s).id }), true); assert.equal(L.hauptLieferant(s, "Fleisch").quelle, "artikel");
  assert.equal(L.artikelLieferantSetzen(s, "Fleisch", { zweit: metro(s).id }), true); assert.equal(L.zweitLieferant(s, "Fleisch"), null);
  assert.equal(L.artikelLieferantSetzen(s, "Fleisch", { zweit: "lf-gibtsnicht" }), false);
  assert.equal(L.artikelLieferantSetzen(s, "Fleisch", { haupt: null }), true); assert.equal(L.hauptLieferant(s, "Fleisch").name, "Frischdienst Süd");
  // entfernter Hauptlieferant: zurück zum Beleg
  L.artikelLieferantSetzen(s, "Cola", { haupt: L.lieferantZuName(s, "Frischdienst Süd").id }); L.lieferantEntfernen(s, L.lieferantZuName(s, "Frischdienst Süd").id);
  assert.equal(L.hauptLieferant(s, "Cola").name, "Metro");
});

// ---------- Liefertermine ----------
test("Liefertermine: Di/Fr, Bestellschluss am Vortag 18 Uhr – vor/nach 18 Uhr, Ruhetag ohne Lieferung, Abholung auch am Ruhetag, ohne Bestellschluss = Lieferzeit", () => {
  const s = laden(); const lf = setze(s, { tage: [2, 5], uhr: "18:00", tageVorher: 1 });
  const tage = (j) => L.liefertermine(s, lf, { jetzt: j }).map((x) => x.tag);
  assert.deepEqual(tage(um(MO, 17, 59)), ["2026-10-20", "2026-10-23", "2026-10-27"]);
  assert.deepEqual(L.liefertermine(s, lf, { jetzt: um(MO, 12) })[0], { tag: "2026-10-20", schlussTag: "2026-10-19", uhr: "18:00" });
  assert.deepEqual(tage(um(MO, 18, 0)), ["2026-10-23", "2026-10-27", "2026-10-30"], "18:00 vorbei → Dienstag nicht mehr erreichbar");
  assert.deepEqual(tage(um("2026-10-20", 1, 30)), ["2026-10-23", "2026-10-27", "2026-10-30"], "nach Mitternacht");
  // Ruhetag Dienstag: an Ruhetagen keine Lieferung
  const r = laden({ ruhetage: [0, 2] }); const lr = setze(r, { tage: [2, 5], uhr: "18:00", tageVorher: 1 });
  assert.deepEqual(L.liefertermine(r, lr, { jetzt: um(MO, 12) }).map((x) => x.tag), ["2026-10-23", "2026-10-30", "2026-11-06"]);
  // Abholung: am Tag selbst, ohne Uhrzeit, auch am Ruhetag (Sonntag)
  const ab = setze(r, { modus: "abholung", tage: [0, 3], uhr: "18:00", tageVorher: 1 });
  assert.deepEqual(L.liefertermine(r, ab, { jetzt: um(MO, 12) }), [{ tag: "2026-10-21", schlussTag: "2026-10-21", uhr: null }, { tag: "2026-10-25", schlussTag: "2026-10-25", uhr: null }, { tag: "2026-10-28", schlussTag: "2026-10-28", uhr: null }]);
  // ohne Bestellschluss: so viele Tage vorher wie die Lieferzeit (Standard 1), bis Tagesende
  const lz = setze(s, { modus: "lieferung", tage: [3], uhr: "", tageVorher: null, lieferzeit: 2 }); assert.equal(lz.schluss, null);
  assert.deepEqual(L.liefertermine(s, lz, { jetzt: um(MO, 23, 30) })[0], { tag: "2026-10-21", schlussTag: "2026-10-19", uhr: null });
  assert.deepEqual(L.liefertermine(s, lz, { jetzt: um("2026-10-20", 8) })[0].tag, "2026-10-28");
  assert.equal(L.liefertermine(s, setze(s, { tage: [] })), null, "ohne Liefertage keine Termine");
  // Eingaben prüfen
  assert.equal(L.lieferantSetzen(s, metro(s).id, { uhr: "25:00" }).grund, "uhr"); assert.equal(L.lieferantSetzen(s, metro(s).id, { lieferzeit: 30 }).grund, "lieferzeit");
  assert.equal(L.lieferantSetzen(s, metro(s).id, { mindestwert: "x" }).grund, "mindestwert"); assert.equal(L.lieferantSetzen(s, metro(s).id, { name: " " }).grund, "name");
  assert.equal(L.lieferantAnlegen(s, { name: "METRO" }).grund, "doppelt"); assert.equal(L.uhrLesen("18"), "18:00"); assert.equal(L.uhrLesen("7.30"), "07:30"); assert.equal(L.uhrLesen("18 Uhr"), "18:00");
});

// ---------- Bestellvorschlag ----------
test("Bestellvorschlag mit Liefertagen: Bedarf bis zur übernächsten Lieferung + Puffer statt „Tage + Puffer“; ohne Liefertage wie bisher", () => {
  const s = laden();
  const alt = b.bestellVorschlag(s, { heuteTag: MO, jetzt: um(MO, 12) });
  const fa = zeile(alt, "Fleisch"); assert.equal(fa.lieferung, null); assert.equal(fa.gebinde, 2, "7 + 2 Öffnungstage × 2 kg = 18 kg − 3 kg → 2 Kartons"); assert.equal(fa.lieferant, "Metro");
  assert.equal(alt.gruppen[0].termin, null);
  setze(s, { tage: [2, 5], uhr: "18:00", tageVorher: 1 });
  const v = b.bestellVorschlag(s, { heuteTag: MO, jetzt: um(MO, 12) });
  const f = zeile(v, "Fleisch");
  // Mo, Di, Mi, Do bis vor Fr (4 Öffnungstage) + 2 Tage Puffer ab Fr (Fr, Sa) = 12 kg − 3 kg = 9 kg → 1 Karton
  assert.ok(Math.abs(f.bedarf - 12000) < 1e-6, f.bedarf); assert.equal(f.gebinde, 1); assert.equal(f.lieferung, "2026-10-20"); assert.equal(f.bestellenAm, MO);
  assert.equal(f.dringend, "jetzt"); assert.equal(f.grund, "vorLieferung", "1,5 Tage Bestand < 1 Tag bis Lieferung + 2 Tage Puffer");
  assert.deepEqual(v.gruppen[0].termin, { tag: "2026-10-20", schlussTag: MO, uhr: "18:00", naechste: "2026-10-23", abholung: false });
  assert.equal(zeile(v, "Cola"), undefined, "Cola (7 Kisten) reicht bis Fr + Puffer → kommt mit der nächsten Bestellung");
  // nach 18 Uhr: nächste erreichbare ist Fr, danach Di → Bedarf bis vor Di + Puffer (Di, Mi)
  const sp = b.bestellVorschlag(s, { heuteTag: MO, jetzt: um(MO, 19) }); const f2 = zeile(sp, "Fleisch");
  assert.equal(f2.lieferung, "2026-10-23"); assert.ok(Math.abs(f2.bedarf - 2000 * (7 + 2)) < 1e-6, f2.bedarf); // Fr, Sa, Mo … Mo 26. (7 Öffnungstage bis vor Di 27.) + Puffer Di, Mi assert.equal(sp.gruppen[0].termin.naechste, "2026-10-27");
  // genug Bestand: erst bei Bestellschluss morgen/später, nicht heute
  const viel = laden({ fleisch: 0.9 }); setze(viel, { tage: [2, 5], uhr: "18:00", tageVorher: 1 });
  const fv = zeile(b.bestellVorschlag(viel, { heuteTag: "2026-10-20", jetzt: um("2026-10-20", 9) }), "Fleisch");
  assert.equal(fv.lieferung, "2026-10-23"); assert.equal(fv.bestellenAm, "2026-10-22"); assert.equal(fv.dringend, "spaeter"); assert.equal(fv.grund, "liefertag");
  const fm = zeile(b.bestellVorschlag(viel, { heuteTag: "2026-10-21", jetzt: um("2026-10-21", 9) }), "Fleisch"); assert.equal(fm.dringend, "morgen");
});

test("Bestellvorschlag: Ruhetage zählen nicht als Bedarf und nicht als Liefertag; Lieferzeit ohne Liefertage zieht den Bestelltag vor", () => {
  const r = laden({ ruhetage: [0, 2] }); setze(r, { tage: [2, 5], uhr: "18:00", tageVorher: 1 });
  const f = zeile(b.bestellVorschlag(r, { heuteTag: MO, jetzt: um(MO, 12) }), "Fleisch");
  // Di Ruhetag → nächste Lieferung Fr, danach Fr 30.10.; Bedarf Mo, Mi, Do (bis Fr) … bis vor Fr 30.: Mo Mi Do Fr Sa Mo Mi Do = 8 Tage + Puffer Fr, Sa
  assert.equal(f.lieferung, "2026-10-23"); assert.ok(Math.abs(f.bedarf - 2000 * 10) < 1e-6, f.bedarf);
  // Lieferzeit ohne feste Tage: bestellen so viele Tage früher (wie bisher plus Vorlauf)
  const s = laden({ fleisch: 1 }); const ohne = zeile(b.bestellVorschlag(s, { heuteTag: MO, jetzt: um(MO, 12) }), "Fleisch");
  setze(s, { lieferzeit: 2 }); const mit = zeile(b.bestellVorschlag(s, { heuteTag: MO, jetzt: um(MO, 12) }), "Fleisch");
  assert.equal(mit.gebinde, ohne.gebinde); assert.ok(mit.bestellenAm < ohne.bestellenAm, `${mit.bestellenAm} < ${ohne.bestellenAm}`);
});

test("Zweitlieferant: reicht die Ware nicht bis zur Lieferung und kommt der Zweitlieferant früher, steht er dabei", (ctx) => {
  // Bildschirm und Beispieldaten müssen denselben Geschäftstag verwenden.
  ctx.mock.timers.enable({ apis: ["Date"], now: new Date(`${MO}T12:00:00`) });
  const s = laden(); setze(s, { tage: [5], uhr: "18:00", tageVorher: 1 }); // Metro nur Fr
  const z = L.lieferantAnlegen(s, { name: "Markt um die Ecke", art: "supermarkt", modus: "abholung", tage: [2] }).lieferant;
  L.artikelLieferantSetzen(s, "Fleisch", { zweit: z.id });
  const f = zeile(b.bestellVorschlag(s, { heuteTag: MO, jetzt: um(MO, 12) }), "Fleisch");
  assert.equal(f.grund, "vorLieferung"); assert.deepEqual(f.ausweich, { id: z.id, name: "Markt um die Ecke", tag: "2026-10-20" });
  assert.match(B.bestandView(s), /reicht nicht sicher bis zur Lieferung Fr 23\.10\. · Markt um die Ecke kommt Di 20\.10\./);
});

test("Mindestbestellwert: Summe darunter → Hinweis mit Waren desselben Lieferanten, die bald knapp werden (nur Vorschlag)", () => {
  const s = laden(); setze(s, { tage: [2, 5], uhr: "18:00", tageVorher: 1, mindestwert: 100 });
  const v = b.bestellVorschlag(s, { heuteTag: MO, jetzt: um(MO, 12) }); const g = v.gruppen[0];
  assert.equal(g.zeilen.length, 1); assert.ok(Math.abs(g.wert - 80) < 1e-6);
  // Cola: 168 reicht bis Fr + Puffer (144), aber nicht bis zur dritten Lieferung Di 27. + Puffer (9 Tage = 216) → 2 Kisten vorgeschlagen
  assert.ok(Math.abs(g.mindest.fehlt - 20) < 1e-6); assert.equal(g.mindest.wert, 100);
  assert.deepEqual(g.mindest.vorschlaege.map((x) => [x.name, x.gebinde]), [["Cola", 2]]);
  assert.equal(nb(b.mindestSatz(g.mindest)), "Noch 20 € bis Mindestbestellwert – Cola mitbestellen?");
  assert.equal(zeile(v, "Cola"), undefined, "nicht von selbst in der Bestellung");
  // genug Bestand bei Cola → kein Vorschlag, nur der Betrag
  const s2 = laden({ cola: 20 }); setze(s2, { tage: [2, 5], uhr: "18:00", tageVorher: 1, mindestwert: 100 });
  const g2 = b.bestellVorschlag(s2, { heuteTag: MO, jetzt: um(MO, 12) }).gruppen[0]; assert.deepEqual(g2.mindest.vorschlaege, []); assert.equal(nb(b.mindestSatz(g2.mindest)), "Noch 20 € bis Mindestbestellwert");
  // Summe reicht → kein Hinweis; ohne Mindestwert → keiner
  setze(s, { mindestwert: 50 }); assert.equal(b.bestellVorschlag(s, { heuteTag: MO, jetzt: um(MO, 12) }).gruppen[0].mindest, null);
  setze(s, { mindestwert: null }); assert.equal(b.bestellVorschlag(s, { heuteTag: MO, jetzt: um(MO, 12) }).gruppen[0].mindest, null);
});

// ---------- Sätze ----------
test("Uhrzeit-Sätze (Büro): Bestellschluss heute/morgen, Mindestbestellwert, Liefertag heute/morgen, Abholung; höchstens 15 Wörter; nicht im Laden", async () => {
  const s = laden(); setze(s, { tage: [2, 5], uhr: "18:00", tageVorher: 1 });
  const satz = (tag, h) => b.lieferSaetze(s, { heuteTag: tag, jetzt: um(tag, h) }).map((x) => nb(x.text));
  assert.deepEqual(satz(MO, 12), ["Bestellschluss Metro heute 18 Uhr – 1 Ware"]);
  assert.equal(b.lieferUhrzeit(s, { heuteTag: MO, jetzt: um(MO, 12) }).ton, "rot");
  assert.deepEqual(satz("2026-10-18", 12), ["Bestellschluss Metro morgen 18 Uhr – 1 Ware"]);
  assert.deepEqual(satz("2026-10-20", 9), ["Heute kommt Metro"], "Dienstag: Liefertag, nächster Bestellschluss erst Donnerstag");
  setze(s, { uhr: "18:30" }); assert.deepEqual(satz(MO, 12), ["Bestellschluss Metro heute 18:30 Uhr – 1 Ware"]);
  setze(s, { uhr: "", tageVorher: 1 }); assert.deepEqual(satz(MO, 12), ["Bestellschluss Metro heute – 1 Ware"]);
  // Mindestbestellwert (Bestellschluss heute geht vor, morgen: der Mindestwert-Satz)
  setze(s, { uhr: "18:00", mindestwert: 100 });
  assert.deepEqual(satz(MO, 12), ["Bestellschluss Metro heute 18 Uhr – 1 Ware"]);
  assert.deepEqual(satz("2026-10-18", 12), ["Noch 20 € bis Mindestbestellwert – Cola mitbestellen?"]);
  // Morgen kommt …
  const g = L.lieferantAnlegen(s, { name: "Getränke Nord", art: "getraenke", tage: [2], uhr: "12:00", tageVorher: 2 }).lieferant;
  assert.ok(satz(MO, 12).includes("Morgen kommt Getränke Nord"));
  // Abholung
  const a = laden(); setze(a, { modus: "abholung", tage: [3] });
  assert.match(b.lieferSaetze(a, { heuteTag: "2026-10-20", jetzt: um("2026-10-20", 12) }).map((x) => x.text).join(), /^Morgen abholen bei Metro – \d+ Waren?$/);
  assert.match(b.lieferSaetze(a, { heuteTag: "2026-10-21", jetzt: um("2026-10-21", 9) }).map((x) => x.text).join(), /^Heute abholen bei Metro – \d+ Waren?$/);
  for (const x of [...b.lieferSaetze(s, { heuteTag: MO, jetzt: um(MO, 12) }), ...b.lieferSaetze(a, { heuteTag: "2026-10-21", jetzt: um("2026-10-21", 9) })]) assert.ok(x.text.split(/\s+/).length <= 15, x.text);
  // ohne Liefertage: keine Sätze
  assert.deepEqual(b.lieferSaetze(laden(), { heuteTag: MO, jetzt: um(MO, 12) }), []);
  // Büro: Hinweis-Chip; Laden: nichts davon (jetztDran kennt keine Lieferanten, Start zeigt keinen Satz)
  const { offenImBuero, jetztDran } = await import("../js/offen.js");
  const w = { betriebe: [s], aktiv: s.id };
  const chip = offenImBuero(s, w, { jetzt: um(MO, 12) }).find((o) => o.id === "lieferant");
  assert.equal(chip.text, "Bestellschluss Metro heute 18 Uhr – 1 Ware"); assert.equal(chip.farbe, "rot"); assert.deepEqual(chip.ziel, { aktion: "nav", wert: "bestand" });
  assert.ok(!JSON.stringify(jetztDran(s, w, { jetzt: um(MO, 12) }) || {}).includes("Bestellschluss"));
  void g;
});

// ---------- Teilen ----------
test("Teilen: Text mit Liefertag und Kundennummer; WhatsApp-Link nur mit Bestellweg WhatsApp und gültiger Nummer, sonst Teilen wie bisher", () => {
  const s = laden();
  const g0 = b.bestellVorschlag(s, { heuteTag: MO, jetzt: um(MO, 12) }).gruppen[0];
  assert.equal(b.bestellText(s, g0, { datum: MO }), "Bestellung Testladen, Mo 19.10.: 2 Kartons Fleisch, 2 Kisten Cola", "ohne Stammdaten wie bisher");
  setze(s, { tage: [2, 5], uhr: "18:00", tageVorher: 1, kundennummer: "4711", weg: "telefon", kontakt: "0151 23456789" });
  const g = b.bestellVorschlag(s, { heuteTag: MO, jetzt: um(MO, 12) }).gruppen[0];
  const n = b.bestellNachricht(s, g, { datum: MO });
  assert.equal(n.text, "Bestellung Testladen, Mo 19.10.: 1 Karton Fleisch – Lieferung Di 20.10. · Kundennr. 4711"); assert.equal(n.link, null, "Telefon: kein Link"); assert.equal(n.weg, "telefon");
  assert.ok(!n.text.includes("0151"), "Nummer nie im Text");
  setze(s, { weg: "whatsapp" }); const wa = b.bestellNachricht(s, g, { datum: MO });
  assert.equal(wa.link, "https://wa.me/4915123456789?text=" + encodeURIComponent(wa.text));
  setze(s, { kontakt: "" }); assert.equal(b.bestellNachricht(s, g, { datum: MO }).link, null, "ohne Nummer kein Link");
  for (const [ein, aus] of [["0151 234 567 89", "4915123456789"], ["+49 (151) 23456789", "4915123456789"], ["0049 151 23456789", "4915123456789"], ["+43 664 1234567", "436641234567"], ["123", null], ["", null], ["abc", null]]) assert.equal(L.whatsappNummer(ein), aus, ein);
  // Abholung: „– Abholung …“
  setze(s, { modus: "abholung", tage: [3], kundennummer: "" }); const ga = b.bestellVorschlag(s, { heuteTag: MO, jetzt: um(MO, 12) }).gruppen[0];
  assert.match(b.bestellText(s, ga, { datum: MO }), / – Abholung Mi 21\.10\.$/);
});

// ---------- Sicherung, Zusammenführen, Datenschutz ----------
test("Speicher, Sicherung, Zusammenführen: Lieferanten und Zuordnung überstehen Laden/Export/Einlesen; zwei Handys vereinigt, entfernt gewinnt", async () => {
  idbAttrappe(); await st.laden();
  const w = st.leereWurzel(); const s = laden(); w.betriebe.push(s); w.aktiv = s.id;
  setze(s, { tage: [2, 5], uhr: "18:00", tageVorher: 1, weg: "whatsapp", kontakt: "0151 23456789", kundennummer: "4711", notiz: "Hintereingang" });
  const neu = L.lieferantAnlegen(s, { name: "Getränke Nord", art: "getraenke", tage: [3] }).lieferant; L.artikelLieferantSetzen(s, "Cola", { haupt: neu.id, zweit: metro(s).id });
  await st.sofortSpeichern(w);
  const g = await st.laden(); const gb = g.betriebe[0];
  assert.equal(gb.lieferanten.length, 2); assert.equal(L.lieferantZuName(gb, "Metro").kontakt, "0151 23456789"); assert.equal(gb.artikel.find((a) => a.name === "Cola").lieferantId, neu.id);
  const { blob } = await st.exportDatei(g); const r = await st.importSicherung(blob); assert.equal(r.pruefsumme, "ok");
  assert.deepEqual(r.wurzel.betriebe[0].lieferanten, gb.lieferanten); assert.equal(r.wurzel.betriebe[0].artikel.find((a) => a.name === "Cola").lieferant2Id, metro(s).id);
  // zweites Handy: entfernt „Getränke Nord“ und legt „Bäcker“ an; erstes ändert Metro → nach dem Zusammenführen: alle drei, Getränke Nord entfernt
  const fremd = structuredClone(r.wurzel); const fb = fremd.betriebe[0];
  L.lieferantEntfernen(fb, neu.id, { jetzt: "2026-10-18T12:00:00.000Z" }); L.lieferantAnlegen(fb, { name: "Bäcker" }, { jetzt: "2026-10-18T12:00:00.000Z" }); fb.geaendert = new Date(Date.now() + 1000).toISOString();
  setze(gb, { notiz: "Vordereingang" });
  st.zusammenfuehren(g, fremd); const m = g.betriebe[0];
  assert.deepEqual(m.lieferanten.map((l) => l.name).sort(), ["Bäcker", "Getränke Nord", "Metro"]);
  assert.equal(m.lieferanten.find((l) => l.id === neu.id).entfernt, true); assert.equal(m.lieferanten.find((l) => l.id === neu.id).entferntZeit, "2026-10-18T12:00:00.000Z");
  assert.equal(L.hauptLieferant(m, "Cola").name, "Metro", "entfernter Hauptlieferant → Beleg");
  // automatisch angelegte Lieferanten (gleicher Beleg auf zwei Handys) stehen nach dem Zusammenführen nur einmal da
  const a = laden(), c = structuredClone(a); c.lieferungen.push({ id: "l9", datum: "2026-10-17", lieferant: "Metro", zeilen: [], storniert: false });
  const wa = st.leereWurzel(); wa.betriebe.push(a); wa.aktiv = a.id; const wc = st.leereWurzel(); wc.betriebe.push(st.migrierenBetrieb(c)); wc.aktiv = c.id;
  st.zusammenfuehren(wa, wc); assert.equal(wa.betriebe[0].lieferanten.length, 1);
});

test("Datenschutz: Nummer, Kundennummer und Notiz stehen in keinem Export für Amt, Steuer oder Buchhalter", async () => {
  const { csvDateien, dokumentFuer } = await import("../js/ordner_text.js");
  const s = beispielLaden(MO); const lf = s.lieferanten[0];
  L.lieferantSetzen(s, lf.id, { weg: "whatsapp", kontakt: "0151 99988877", kundennummer: "GEHEIM-42", notiz: "Fahrer Herr X" });
  const texte = [];
  for (const a of ["ordner-amt", "ordner-steuer", "ordner-buch"]) { for (const d of csvDateien(s, a)) texte.push(d.text); texte.push(dokumentFuer(s, a)); }
  const alles = texte.join("\n");
  for (const x of ["99988877", "GEHEIM-42", "Fahrer Herr X"]) assert.ok(!alles.includes(x), x);
});

// ---------- Beispiel-Laden ----------
test("Beispiel-Laden: zwei Beispiel-Lieferanten (Großhandel Di/Fr, Bestellschluss Vortag 18 Uhr; Getränkehändler Mi), Sätze sichtbar, keine Nummern", () => {
  const s = beispielLaden(MO);
  assert.deepEqual(s.lieferanten.map((l) => [l.name, l.tage, l.schluss]), [["Großhandel (Beispiel)", [2, 5], { uhr: "18:00", tageVorher: 1 }], ["Getränkehändler (Beispiel)", [3], { uhr: "12:00", tageVorher: 1 }]]);
  assert.ok(s.lieferanten.every((l) => !l.kontakt), "keine Nummer im Beispiel");
  assert.equal(L.hauptLieferant(s, "Cola 0,33 l").name, "Getränkehändler (Beispiel)"); assert.equal(L.zweitLieferant(s, "Cola 0,33 l").name, "Großhandel (Beispiel)");
  const v = b.bestellVorschlag(s, { heuteTag: MO, jetzt: um(MO, 12) });
  assert.deepEqual(v.gruppen.map((g) => g.lieferant), ["Großhandel (Beispiel)", "Getränkehändler (Beispiel)"]);
  assert.ok(v.gruppen.every((g) => g.termin), "beide mit Liefertermin");
  const saetze = b.lieferSaetze(s, { heuteTag: MO, jetzt: um(MO, 12) }).map((x) => x.text);
  assert.ok(saetze.some((x) => /^Bestellschluss Großhandel \(Beispiel\) heute 18 Uhr – \d+ Waren$/.test(x)), saetze.join(" | "));
  // je Wochentag (9 Uhr), wichtigster Satz: Mo Bestellschluss Großhandel heute, Di Bestellschluss Getränkehändler heute 12 Uhr (vor „Großhandel kommt“),
  // Mi Bestellschluss Großhandel morgen, Do Bestellschluss heute, Fr Großhandel kommt, Sa nichts (nächster Bestellschluss erst Mo), So Bestellschluss morgen
  const arten = []; for (let i = 0; i < 7; i++) { const iso = `2026-10-${String(19 + i).padStart(2, "0")}`; arten.push(b.lieferSaetze(beispielLaden(iso), { heuteTag: iso, jetzt: um(iso, 9) }).map((x) => x.art)[0] || null); }
  assert.deepEqual(arten, ["schluss", "schluss", "schlussMorgen", "schluss", "kommtHeute", null, "schlussMorgen"]);
});

// ---------- Oberfläche ----------
test("Oberfläche: Büro-Einstieg, Liste, Bearbeiten, Waren zuordnen, Anzeigen schreibt nicht; Personal gesperrt; Texte in 18 Sprachen ohne verbotene Wörter", async () => {
  const S = await import("../js/screens/lieferanten.js");
  const { bueroView } = await import("../js/screens/buero.js"); const M = await import("../js/modus.js"); const { navKontext } = await import("../js/screens/nav.js");
  const s = beispielLaden(MO); const w = st.leereWurzel(); w.betriebe.push(s); w.aktiv = s.id; navKontext(s, w, "lieferanten");
  assert.ok(bueroView(s, w).includes('data-wert="lieferanten"'), "Büro-Einstieg");
  S.lieferantenZuruecksetzen(); const vorher = JSON.stringify(s);
  let html = S.lieferantenView(s);
  for (const x of ["Lieferanten", "Großhandel (Beispiel)", "Getränkehändler (Beispiel)", "liefert Di, Fr · Bestellschluss am Vortag 18 Uhr", 'data-a="lf-neu"', 'data-a="lf-zuordnen"', 'data-a="lf-auf"', "Was heißt das?"]) assert.ok(html.includes(x), x);
  assert.ok(!/undefined|NaN/.test(html));
  const el = (d) => ({ dataset: d });
  assert.equal(S.lieferantenAktion("lf-auf", el({ wert: "bsp-lf-gross" }), s), true); html = S.lieferantenView(s);
  for (const x of ['data-lf-form="bsp-lf-gross"', 'data-a="lf-tag"', 'data-a="lf-vorher"', 'data-f="lf-uhr"', 'data-a="lf-weg"', 'data-f="lf-kundennummer"', "bleiben nur auf diesem Handy", 'data-a="lf-speichern"', 'data-a="lf-entfernen"']) assert.ok(html.includes(x), x);
  assert.equal(S.lieferantenAktion("lf-zuordnen", el({}), s), true); html = S.lieferantenView(s);
  assert.ok(html.includes('data-f="lf-haupt:Cola 0,33 l"') && html.includes('data-f="lf-zweit:Cola 0,33 l"'));
  assert.equal(JSON.stringify(s), vorher, "Zeichnen schreibt nicht");
  // Bestand: Termin, Mindestwert, Einstieg „Lieferanten“
  const bh = B.bestandView(s); assert.ok(bh.includes("data-best-termin") && bh.includes('data-wert="lieferanten"'), "Bestand zeigt Termin und Einstieg");
  assert.equal(JSON.stringify(s), vorher, "Bestand zeichnen schreibt nicht");
  // Bearbeiten: Mittwoch dazu, Uhrzeit, WhatsApp-Nummer → Speichern
  S.lieferantenAktion("lf-auf", el({ wert: "bsp-lf-gross" }), s); S.lieferantenAktion("lf-tag", el({ wert: "3" }), s); S.lieferantenEingabe("lf-uhr", "17.30", s);
  S.lieferantenAktion("lf-weg", el({ wert: "whatsapp" }), s); S.lieferantenEingabe("lf-kontakt", "0151 23456789", s);
  const r = S.lieferantenAktion("lf-speichern", el({}), s); assert.equal(r.speichern, true);
  const gh = L.lieferantMitId(s, "bsp-lf-gross"); assert.deepEqual(gh.tage, [2, 3, 5]); assert.deepEqual(gh.schluss, { uhr: "17:30", tageVorher: 1 }); assert.equal(gh.kontakt, "0151 23456789");
  assert.ok(B.bestandView(s).includes('data-a="best-wa"'), "WhatsApp-Knopf mit Nummer"); assert.match(B.bestandLink(s, 0), /^https:\/\/wa\.me\/4915123456789\?text=Bestellung/);
  // Fehler: ungültige Uhrzeit → Meldung, nichts gespeichert
  S.lieferantenAktion("lf-auf", el({ wert: "bsp-lf-gross" }), s); S.lieferantenEingabe("lf-uhr", "99", s);
  assert.equal(S.lieferantenAktion("lf-speichern", el({}), s).meldung, "Uhrzeit prüfen, z. B. 18:00."); S.lieferantenAktion("lf-zu", el({}), s);
  // Neu, Zuordnen, Entfernen
  S.lieferantenAktion("lf-neu", el({}), s); S.lieferantenEingabe("lf-name", "Bäckerei Beispiel", s); S.lieferantenAktion("lf-art", el({ wert: "baeckerei" }), s); S.lieferantenAktion("lf-modus", el({ wert: "abholung" }), s); S.lieferantenAktion("lf-tag", el({ wert: "6" }), s);
  assert.equal(S.lieferantenAktion("lf-anlegen", el({}), s).speichern, true); const bk = L.lieferantZuName(s, "Bäckerei Beispiel"); assert.equal(bk.modus, "abholung"); assert.deepEqual(bk.tage, [6]);
  assert.equal(S.lieferantenEingabe("lf-haupt:Cola 0,33 l", bk.id, s), "speichern"); assert.equal(L.hauptLieferant(s, "Cola 0,33 l").name, "Bäckerei Beispiel");
  assert.equal(S.lieferantenEingabe("lf-haupt:Cola 0,33 l", "", s), "speichern"); assert.equal(L.hauptLieferant(s, "Cola 0,33 l").name, "Großhandel (Beispiel)", "zurück auf den letzten Beleg");
  globalThis.confirm = () => true; assert.equal(S.lieferantenAktion("lf-entfernen", el({ wert: bk.id }), s).speichern, true); delete globalThis.confirm;
  assert.equal(L.lieferantMitId(s, bk.id), null);
  // Personal: nicht erreichbar, Handlungen gesperrt; Laden → Büro
  assert.equal(M.ansichtErlaubt({ modus: "personal" }, "lieferanten"), false); assert.equal(M.navZiel({ modus: "personal" }, "lieferanten").ansicht, "personal");
  for (const n of ["lf-neu", "lf-auf", "lf-speichern", "lf-anlegen", "lf-entfernen", "lf-zuordnen", "lf-tag"]) assert.equal(M.personalGesperrt(n, null, MO), true, n);
  assert.deepEqual(M.navZiel({ modus: "laden" }, "lieferanten"), { ansicht: "lieferanten", buero: true });
  // Texte: alle Schlüssel in allen 18 Sprachen, keine verbotenen Wörter
  const de = (await import("../js/lang/de.js")).default; const codes = fs.readdirSync(path.join(HIER, "..", "js", "lang")).filter((f) => f.endsWith(".js")).map((f) => f.slice(0, -3)); assert.equal(codes.length, 18);
  const flach = (o, p = "") => Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" && !Array.isArray(v) ? flach(v, p + k + ".") : [p + k]));
  const hol = (o, k) => k.split(".").reduce((x, y) => x?.[y], o);
  for (const c of codes) { const tab = (await import(`../js/lang/${c}.js`)).default;
    for (const k of flach(de.lieferanten)) assert.ok(hol(tab.lieferanten, k) !== undefined, `${c}: lieferanten.${k}`);
    for (const k of ["ausgeschiedeneListe", "personAltHinweis"]) assert.ok(tab.amtW2[k], `${c}: amtW2.${k}`); }
  const VERBOTEN = ["revolutionär", "disruptiv", "Marktführer", "GoBD-konform", "betriebsprüfungsfest", "steuersicher", "rechtssicher"];
  for (const f of ["js/lieferant.js", "js/bestand.js", "js/screens/lieferanten.js", "js/screens/bestand.js", ...codes.map((c) => `js/lang/${c}.js`)]) { const src = fs.readFileSync(path.join(HIER, "..", f), "utf8"); for (const v of VERBOTEN) assert.ok(!src.includes(v), `${f}: ${v}`); }
  assert.match(fs.readFileSync(path.join(HIER, "..", "js", "app.js"), "utf8"), /lieferantenZuruecksetzen/);
});

// ---------- Kürzel ausgeschiedener Mitarbeiter ----------
test("Kürzel ausgeschiedener Mitarbeiter: nicht mehr in Auswahl-Listen (Schicht, Rundgang, Putzen), alte Einträge und Exporte mit „ausgeschieden am …“, Hinweis im Büro", async () => {
  const { personEntfernen, personenAusgeschieden } = await import("../js/stamm.js");
  const muell = await import("../js/muell.js");
  const E = await import("../js/engine.js"); const A = await import("../js/export_amt.js"); const T = await import("../js/export_steuer.js"); const O = await import("../js/ordner_text.js");
  const s = st.leererBetrieb(); s.phase = "app"; s.betrieb.name = "Test";
  s.kuehl = { takt: 1, ruhetage: [], eingerichtet: true, seit: "2026-10-01" };
  s.kuehlstellen = [{ id: "k", name: "Theke", art: "kuehl", min: null, max: 7, reihe: 0, archiviert: false }];
  s.personen = [{ id: "a", kuerzel: "AK", aktiv: true, entfernt: false }, { id: "m", kuerzel: "MZ", aktiv: true, entfernt: false }];
  s.gerichte = [{ id: "g", name: "Döner", preis: 8, klasse: "haupt", zutaten: [] }];
  s.messungen.push({ id: "m1", stelle: "k", datum: "2026-10-02", zeit: "2026-10-02T09:00:00", wert: 4, min: null, max: 7, abweichung: false, massnahmen: [], nachkontrolle: null, von: "m", nacherfasst: false, storniert: false });
  const pe = muell.personalessen(s, s.gerichte[0], { datum: "2026-10-03", mahlzeit: "mittag" }); pe.von = "m";
  assert.equal(personEntfernen(s, "m", "2026-10-12"), true);
  const p = s.personen.find((x) => x.id === "m"); assert.deepEqual([p.entfernt, p.aktiv, p.ausgeschieden], [true, false, "2026-10-12"]);
  // Auswahl-Listen: Personal-Modus (Schicht), Kühl-Rundgang, Putzen, Belehrung eintragen – nur AK
  const { navKontext } = await import("../js/screens/nav.js"); const w = { betriebe: [s], modus: "buero" }; navKontext(s, w, "kuehl");
  const K = await import("../js/screens/kuehl.js"); K.kuehlAktion("kuehl-rundgang", { dataset: {} }, s, w); const kh = K.kuehlView(s); assert.ok(kh.includes(">AK<") && !kh.includes(">MZ<"), "Rundgang: nur aktive");
  assert.deepEqual(A.aktivePersonen(s).map((x) => x.kuerzel), ["AK"]);
  assert.deepEqual(A.belehrungen(s, { datum: "2026-10-15" }).zeilen.map((x) => x.name), ["AK"]);
  // alte Nachweise: Kühlprotokoll und Personalessen tragen MZ mit Datum
  const z = A.zeitraumFuer("monat", { datum: "2026-10-15" });
  const o = A.ordnerAmt(s, z, { datum: "2026-10-15" }); const NAMEN = { ausgeschieden: (k) => i18n.t("amtW2.ausgeschieden", k), ausgeschiedenAm: (k, d) => i18n.t("amtW2.ausgeschiedenAm", k, d.split("-").reverse().join(".")) };
  assert.match(A.amtCsv(o, "kuehl", ["a"], NAMEN), /MZ \(ausgeschieden am 12\.10\.2026\)/);
  assert.match(A.druckHtml(O.amtDokument(s, o)), /MZ \(ausgeschieden am 12\.10\.2026\)/);
  assert.ok(A.ausgeschiedenePersonen(s).some((x) => x.id === "m"), "steht in Einträgen");
  const paket = T.monatsPaket(s, z, "steuer"); const x = paket.personal.zeilen[0];
  assert.deepEqual([x.person, x.personAus, x.personAusAm], ["MZ", true, "2026-10-12"]);
  assert.match(T.teilCsv(paket, "personal", ["a"], NAMEN), /MZ \(ausgeschieden am 12\.10\.2026\)/);
  assert.match(A.druckHtml(O.paketDokument(s, paket)), /MZ \(ausgeschieden am 12\.10\.2026\)/);
  // nur im Müll/Personalessen benutzt: zählt auch als „steht in Einträgen“
  const s2 = structuredClone(s); s2.messungen = []; assert.ok(A.ausgeschiedenePersonen(s2).some((y) => y.id === "m"));
  // Hinweis im Büro (Kühl-Einrichtung: Personen) – Liste mit Datum und der Satz, dass alte Nachweise bleiben
  assert.deepEqual(personenAusgeschieden(s), [{ id: "m", kuerzel: "MZ", ausgeschieden: "2026-10-12" }]);
  K.kuehlAktion("kuehl-einrichtung", { dataset: {} }, s, w); const eh = K.kuehlView(s);
  assert.ok(eh.includes('data-ausgeschieden="1"') && eh.includes("MZ (ausgeschieden am 12.10.2026)"), "Liste der Ausgeschiedenen");
  assert.ok(eh.includes("Alte Einträge und Nachweise mit dem Kürzel bleiben"), "Hinweis-Text");
  // Zusammenführen: Datum bleibt, auch wenn nur das andere Handy es kennt
  const lokal = structuredClone(s); const lp = lokal.personen.find((y) => y.id === "m"); lp.entfernt = false; lp.aktiv = true; delete lp.ausgeschieden;
  const wl = st.leereWurzel(); wl.betriebe.push(lokal); wl.aktiv = lokal.id; const wf = st.leereWurzel(); const f = structuredClone(s); f.geaendert = "2020-01-01T00:00:00.000Z"; lokal.geaendert = new Date().toISOString(); wf.betriebe.push(f); wf.aktiv = f.id;
  st.zusammenfuehren(wl, wf); const mp = wl.betriebe[0].personen.find((y) => y.id === "m");
  assert.deepEqual([mp.entfernt, mp.aktiv, mp.ausgeschieden], [true, false, "2026-10-12"]);
  void E;
});
