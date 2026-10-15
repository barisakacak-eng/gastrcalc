// Ein Jahr Döner-Laden mit den echten Journal-Funktionen der App (wie der Stresstest vom 15.10., scratchpad/perf/gen.js).
// tage: wie viele Tage rückwärts ab heute; Größe 365 ≈ 4,7 MB JSON.
import * as st from "../../js/store.js";
import * as U from "../../js/util.js";
import * as kat from "../../js/data/katalog.js";
import * as eng from "../../js/engine.js";
import * as rb from "../../js/rezept_baukasten.js";
import * as mu from "../../js/muell.js";
import * as iv from "../../js/inventur.js";
import * as pp from "../../js/putzplan.js";
import * as lf from "../../js/lieferung.js";

export function jahresStand(tage = 365) {
  let seed = 42; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const w = st.leereWurzel(); w.sprache = "de";
  const b = st.leererBetrieb(); b.phase = "app"; b.weg = "schnell"; b.ladenArt = "doener"; b.einrichtungFertig = true;
  Object.assign(b.betrieb, { name: "Test Döner", format: "imbiss", kuechen: ["doener"], tageProWoche: 6 });
  Object.assign(b.team, { personen: 3, stundenProPerson: 40, lohnkosten: 7500 });
  b.kosten = [["miete", "miete", 1800, "netto"], ["energie", "strom", 600, "brutto"]].map(([kategorie, posten, betrag, basis]) => ({ id: U.uid(), kategorie, posten, betrag, status: "bekannt", periode: "monat", basis }));
  const DAY = 86400000, now = Date.now(), tag = (i) => U.heute(new Date(now - i * DAY));
  const tag0 = tag(tage - 1);
  const vl = kat.vorlagenFuer("imbiss", ["doener"]);
  for (let i = 0; i < 60; i++) { const v = vl[i % vl.length]; const name = i < vl.length ? v.name : `${v.name} ${Math.floor(i / vl.length) + 1}`;
    b.gerichte.push({ id: U.uid(), name, vorlageName: v.name, bereich: v.bereich, klasse: v.bereich === "alkoholfrei" ? "getraenk" : "haupt", zeit: v.zeit, vorlage: true,
      zutaten: v.zutaten.map(([n, m, e]) => ({ name: n, menge: m, einheit: e })), preis: Math.round((4 + rnd() * 10) * 10) / 10, mengeTag: Math.round(5 + rnd() * 30), steuer: 0.07 }); }
  rb.fehlendeRezepteErgaenzen(b); b.artikel = eng.artikelAusGerichten(b);
  for (const a of b.artikel) { a.preis = Math.round((1 + rnd() * 20) * 100) / 100; a.packung = { menge: a.packung?.menge || 1, einheit: a.packung?.einheit || a.einheit || "kg" }; a.preisBasis = "netto"; a.status = "bekannt"; }
  b.kuehl = { takt: 2, ruhetage: [], eingerichtet: true, seit: tag0 };
  b.kuehlstellen = [["Kühlschrank 1", "kuehl"], ["Saladette", "kuehl"], ["Tiefkühler", "tk"]].map(([name, art], reihe) => ({ id: U.uid(), name, art, min: null, max: null, reihe, archiviert: false }));
  b.personen = [{ id: U.uid(), kuerzel: "BA", aktiv: true, entfernt: false }, { id: U.uid(), kuerzel: "MK", aktiv: true, entfernt: false }];
  b.putzplan = { ...pp.planVorschlag(b), aktiv: true, seit: tag0 };
  const aufgaben = pp.aufgabenFuer(b.putzplan);
  const ger = b.gerichte.filter((g) => g.klasse !== "getraenk");
  let nSchwund = 0, nPutz = 0, nLief = 0, nInv = 0;
  for (let i = tage - 1; i >= 0; i--) {
    const d = tag(i); const anteil = (tage - i) / tage;
    eng.tagesnotizSetzen(b, d, Math.round(600 + rnd() * 900), { nacherfasst: true });
    for (let r = 0; r < 2; r++) { const rg = eng.rundgangStarten(b, { datum: d, nacherfasst: true, von: b.personen[r].id });
      for (const k of b.kuehlstellen) eng.stationEintragen(rg, k, { wert: k.art === "tk" ? -18 - Math.round(rnd() * 3) : 2 + Math.round(rnd() * 5) });
      eng.rundgangAbschliessen(b, rg, () => st.naechsteLfd(w), w.geraet); }
    const ns = Math.round(5000 * anteil * tage / 365) - nSchwund;
    for (let j = 0; j < ns; j++) { const x = rnd();
      if (x < 0.5) mu.gerichtWeg(b, pick(ger), { datum: d, anzahl: 1 + Math.floor(rnd() * 2) });
      else if (x < 0.8) mu.rohwareWeg(b, pick(b.artikel), { datum: d, menge: 0.1 + rnd(), einheit: "kg" });
      else if (x < 0.95) mu.personalessen(b, pick(ger), { datum: d });
      else mu.eimerEintragen(b, { datum: d, kg: 1 + rnd() * 4 });
      nSchwund++; }
    const np = Math.round(2000 * anteil * tage / 365) - nPutz;
    for (let j = 0; j < np; j++) { pp.abhaken(b, aufgaben[(i + j) % aufgaben.length].id, { datum: d, von: b.personen[0].id }); nPutz++; }
    if (Math.round(150 * anteil * tage / 365) > nLief) { nLief++;
      const zeilen = []; for (let z = 0; z < 15; z++) { const a = pick(b.artikel); const menge = 1 + Math.floor(rnd() * 4); const gr = 1 + Math.floor(rnd() * 10); const ep = Math.round((5 + rnd() * 40) * 100) / 100;
        zeilen.push({ name: a.name.toUpperCase() + " " + gr + "KG", roh: `${a.name} ${gr}kg ${menge} x ${ep}`, bekannt: a.name, menge, gebinde: "karton", inhalt: { anzahl: 1, groesse: gr, einheit: "kg" }, einzelpreis: ep, gesamt: Math.round(ep * menge * 100) / 100, steuersatz: 0.07, sicher: true, jeKg: false }); }
      const summe = zeilen.reduce((s, z) => s + z.gesamt, 0);
      const l = lf.lieferungAnlegen(b, { lieferant: pick(["Metro", "Transgourmet", "Großhandel Yildiz"]), typ: "rechnung", basis: "netto", zeilen, summeNetto: summe, summeStimmt: true, pfand: [] }, { zeilen, datum: d, geraet: w.geraet });
      lf.preiseUebernehmen(b, l);
      b.uploads.push({ id: "u-" + U.uid(), zweck: "rechnung", erfasst: new Date().toISOString(), geraet: w.geraet, status: "gelesen", datei: { id: U.uid(), ort: "opfs", typ: "image/jpeg", groesse: 200000, name: "IMG.jpg", zweck: "rechnung", erstellt: new Date().toISOString() }, auswertung: { quelle: "tesseract", art: "rechnung", dauerMs: 9000, zeichen: 1400 }, ergebnis: { lieferung: l.id } });
    }
    if (i % 30 === 0 && nInv < 12) { const inv = iv.inventurStarten(b, { datum: d }); for (const a of iv.artikelFuerInventur(b, inv).liste) iv.mengeSetzen(inv, a.name, Math.round(rnd() * 20)); iv.inventurAbschliessen(b, inv, { datum: d }); nInv++; }
  }
  w.betriebe = [b]; w.aktiv = b.id;
  return w;
}
