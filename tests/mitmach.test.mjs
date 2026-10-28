// Mitmach-Rundgang (28.10.2026): Übungsmodus. Pflicht-Test: nach dem Rundgang ohne „Behalten“ ist der gespeicherte Stand byte-gleich wie vorher
// (JSON-Vergleich; nur das Merkzeichen „Rundgang gesehen“ und der angehängte Zeki-Verlauf kommen dazu). Läuft gegen die IndexedDB-Attrappe.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
globalThis.document ??= { documentElement: {} };
import { idbAttrappe } from "./hilfe/idb_attrappe.mjs";
import { jahresStand } from "./hilfe/jahr.mjs";
const st = await import("../js/store.js");
const stamm = await import("../js/stamm.js");
const mu = await import("../js/muell.js");
const eng = await import("../js/engine.js");
const lz = await import("../js/laden_zahlen.js");
const pp = await import("../js/putzplan.js");
const rq = await import("../js/rezept_quelle.js");
const i18n = await import("../js/i18n.js");

const ohneMerkzeichen = (w) => { const x = structuredClone(w); for (const b of x.betriebe) { delete b.fuehrung; delete b.zekiLog; } return JSON.stringify(x); };
const gespeichert = async () => JSON.stringify(await st.laden());

// Alles, was ein Chef im Rundgang tun kann – mit den echten Funktionen des Rechenwerks
function ueben(w) {
  const b = w.betriebe[0];
  lz.umsatzHeuteSpeichern(b, 800);
  stamm.teamTagSetzen(b, b.tagesnotizen.at(-1)?.datum || "2026-10-28", [{ person: null, name: "3", kompakt: true, personen: 3, stunden: 24, satz: 14, art: "angestellt", modell: "stunde" }]);
  stamm.teamStundenlohnSetzen(b, 14);
  mu.gerichtWeg(b, b.gerichte[0], { anzahl: 1 });
  const r = eng.rundgangStarten(b, { von: b.personen[0]?.id || null }); eng.stationEintragen(r, b.kuehlstellen[0], { wert: 4 });
  pp.planSicherstellen(b); const a = pp.aufgabenStand(b)[0]; if (a) pp.abhaken(b, a.id);
  const g = b.gerichte.find((x) => rq.waageFragen(b, x, 1).length); const f = g && rq.waageFragen(b, g, 1)[0];
  if (f) rq.familieAnpassen(b, { gerichtId: g.id, zutat: f.name, wert: f.menge + 20 });
  stamm.kontaktSetzen(b, "steuer", "steuer@example.com");
  st.naechsteLfd(w); w.modus = "buero"; b.phase = "onboarding"; b.schritt = 3; b.rueckkehr = { von: "rezepte", bis: "rezepte", ansicht: "karte" };
  return { g, f };
}

test("Übungsmodus: nach dem Rundgang ohne „Behalten“ ist der gespeicherte Stand byte-gleich (auch nach dem Neuladen)", async () => {
  idbAttrappe(); await st.laden();
  await st.sofortSpeichern(structuredClone(jahresStand(60)));
  const w = await st.laden(); await st.sofortSpeichern(w); // erstes Speichern nach dem Laden (Hebung) – das ist der Stand „vorher“
  const vorher = await gespeichert(); const wieder = await st.laden(); assert.equal(JSON.stringify(wieder), vorher);
  // Rundgang beginnt: Stand merken, Speichern pausieren
  const gemerkt = stamm.uebungStarten(wieder); st.speichernPausieren(true); const b = wieder.betriebe[0];
  ueben(wieder);
  await st.sofortSpeichern(wieder); st.speichern(wieder); await st.ereignis("schwund-eintrag", { tipp: true });
  assert.equal(await gespeichert(), vorher, "während der Übung wird nichts geschrieben (Abbruch/Neuladen = alter Stand)");
  assert.equal((await st.alleEreignisse()).length, 0, "kein Eintrag im Ereignis-Journal");
  // Ende: zurücklegen (dieselben Objekte), Speichern weiter, Merkzeichen setzen
  st.speichernPausieren(false);
  assert.equal(stamm.uebungZuruecknehmen(wieder, gemerkt), true);
  assert.equal(wieder.betriebe[0], b, "der Laden bleibt dasselbe Objekt (app.js hält es als „stand“)");
  stamm.zekiLogAnhaengen(b, { art: "rundgang", inhalt: "verstanden" }); stamm.rundgangAbschliessen(b, "verstanden");
  await st.sofortSpeichern(wieder, { stempel: false });
  const nachher = await st.laden();
  assert.equal(ohneMerkzeichen(nachher), ohneMerkzeichen(JSON.parse(vorher)), "byte-gleich bis auf Merkzeichen und Zeki-Verlauf");
  assert.equal(nachher.betriebe[0].fuehrung.ergebnis, "verstanden");
  assert.deepEqual(nachher.betriebe[0].zekiLog.slice(0, (JSON.parse(vorher).betriebe[0].zekiLog || []).length), JSON.parse(vorher).betriebe[0].zekiLog || [], "Zeki-Verlauf nur angehängt");
});

test("Ausnahme Station 9: „Behalten“ übernimmt nur das gewogene Rezept, sonst bleibt nichts", async () => {
  idbAttrappe(); await st.laden();
  await st.sofortSpeichern(structuredClone(jahresStand(30)));
  const w = await st.laden(); await st.sofortSpeichern(w); const vorher = JSON.parse(await gespeichert());
  const gemerkt = stamm.uebungStarten(w); st.speichernPausieren(true);
  const { g, f } = ueben(w); assert.ok(g && f, "Beispiel-Laden hat ein Gericht mit Waage-Frage");
  const rezepte = stamm.uebungRezepteMerken(w.betriebe[0]);
  st.speichernPausieren(false); stamm.uebungZuruecknehmen(w, gemerkt);
  assert.equal(stamm.uebungRezepteBehalten(w.betriebe[0], rezepte), true);
  await st.sofortSpeichern(w);
  const b = (await st.laden()).betriebe[0];
  assert.equal(b.gerichte.find((x) => x.id === g.id).zutaten.find((z) => z.name === f.name).quelle, "eigen", "Rezept bleibt");
  assert.equal(b.schwund.length, vorher.betriebe[0].schwund.length, "Müll aus der Übung ist weg");
  assert.equal(b.tagesnotizen.length, vorher.betriebe[0].tagesnotizen.length, "Umsatz aus der Übung ist weg");
  assert.equal(b.betrieb.kontakte?.steuer, vorher.betriebe[0].betrieb.kontakte?.steuer, "Übungs-E-Mail ist weg");
});

test("Rundgang-Texte: jede Blase höchstens 15 Wörter (de, tr, en), kein DATEV, kein HACCP/Gesundheitsstandard", () => {
  const woerter = (s) => s.split(/\s+/).filter((x) => /\p{L}/u.test(x)).length;
  for (const sp of ["de", "tr", "en"]) {
    i18n.setzeSprache(sp);
    const m = i18n.t("rundgang.mitmach");
    for (const [k, v] of Object.entries(m)) {
      const texte = typeof v === "function" ? [v("Döner Kebab")] : Array.isArray(v) ? v : [v];
      for (const x of texte) { assert.ok(woerter(x) <= 15, `${sp} ${k}: ${woerter(x)} Wörter`); assert.ok(!/DATEV|HACCP|Gesundheitsstandard/i.test(x), `${sp} ${k}`); }
    }
    const frage = i18n.t("waage.frage", i18n.mengenText("Dönerspieß Kalb/Pute"), "Döner Kebab", "g") + " " + i18n.t("rundgang.mitmach.s9aNur");
    assert.ok(woerter(frage) <= 15, `${sp} Station 9: ${frage}`);
  }
  i18n.setzeSprache("de");
  const quelle = fs.readFileSync(new URL("../js/screens/rundgang.js", import.meta.url), "utf8");
  assert.ok(!/DATEV/.test(quelle.replace(/\/\/.*$/gm, "")), "kein DATEV im Rundgang");
  assert.match(quelle, /nurZeigen: true, umschlag: true/, "Station 12 zeigt Senden nur, löst es nie aus");
});
