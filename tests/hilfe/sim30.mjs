// 30-Tage-Simulation der Tester-Schwadron (18.10.2026), seit dem Fix als Regressionstest im Repo. Änderungen (markiert „FIX:“):
//  (1) M1: das Menü wird als Kombi (Döner + Pommes + Cola) gelernt statt nur dem Döner zugeordnet; an Hand-Tagen als Menü-Zeile getippt.
//      Die Umsatzprobe für Menü-Tage vergleicht deshalb den verteilten Kassen-Umsatz (Import) bzw. Teile + Menüpreis (Hand) mit der Kasse.
//  (2) H3: die Rohdaten-Probe „gleiche Kennung, anderer Inhalt“ leert vorher die Messungs-Kopie der Rundgänge wie die App (rundeDoppelt).
// Tester-Schwadron (18.10.2026): 30 Geschäftstage eines eigenen Dönerladens („Imbiss Sonne (Test)“) mit fester Uhr.
// Nutzt nur das Rechenwerk (js/*.js) und die Speicherung (js/store.js mit IndexedDB-Attrappe aus tests/hilfe). Ändert nichts im Repo.
// Aufruf:  TZ=Europe/Berlin node tests/hilfe/sim30.mjs [--leise] [--json=pfad]   (im CI über tests/sim30.test.mjs)
// Ausgabe: Befunde je Tag (Invarianten), am Ende Zusammenfassung; mit --stand=pfad wird der Endstand als Sicherung (.zip) geschrieben (für Weg B).
process.env.TZ = "Europe/Berlin";
import fs from "node:fs";
const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const LEISE = !!ARG.leise;

// ---------- feste Uhr und fester Zufall ----------
const RealDate = Date; let JETZT = RealDate.parse("2026-09-16T06:00:00Z");
class FakeDate extends RealDate { constructor(...a) { if (a.length === 0) super(JETZT); else super(...a); } static now() { return JETZT; } }
globalThis.Date = FakeDate;
const uhr = (datum, h, m = 0) => { const [j, mo, d] = datum.split("-").map(Number); JETZT = new RealDate(j, mo - 1, d, h, m).getTime(); return new RealDate(JETZT).toISOString(); };
let saat = 20261018; Math.random = () => { saat |= 0; saat = (saat + 0x6D2B79F5) | 0; let t = Math.imul(saat ^ (saat >>> 15), 1 | saat); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const zufall = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })(); // eigener Strom für die Simulation

const R = new URL("../../js/", import.meta.url).href;
const { idbAttrappe } = await import(new URL("./idb_attrappe.mjs", import.meta.url).href);
const i18n = await import(R + "i18n.js"); i18n.setzeSprache("de");
const attA = idbAttrappe(); const idbA = globalThis.indexedDB; const reqA = globalThis.IDBRequest; let attB = null;
const st = await import(R + "store.js");
const E = await import(R + "engine.js");
const { VORLAGEN } = await import(R + "data/katalog.js");
const { inBasis, EINHEITEN } = await import(R + "data/katalog.js");
const { vorauswahlFuer } = await import(R + "data/zwischen.js");
const { gerichtAusVorlage } = await import(R + "karte_daten.js");
const { fehlendeRezepteErgaenzen } = await import(R + "rezept_baukasten.js");
const { selbstAnwenden } = await import(R + "selbst.js");
const { richtpreiseEinsetzen } = await import(R + "richtpreise.js");
const stamm = await import(R + "stamm.js");
const LF = await import(R + "lieferung.js");
const BL = await import(R + "beleg.js");
const HB = await import(R + "haltbar.js");
const VK = await import(R + "verkauf.js");
const MU = await import(R + "muell.js");
const IV = await import(R + "inventur.js");
const BS = await import(R + "bestand.js");
const ZA = await import(R + "zaehler.js");
const LZ = await import(R + "laden_zahlen.js");
const OF = await import(R + "offen.js");
const DE = await import(R + "deal.js");
const MO = await import(R + "modus.js");
const RT = await import(R + "rettung.js");
const OT = await import(R + "ordner_text.js");
const EA = await import(R + "export_amt.js");
const ES = await import(R + "export_steuer.js");
const { heuteGeschaeft, heute } = await import(R + "util.js");

// ---------- Befunde ----------
const befunde = []; let TAG = "-"; const gesehen = new Set();
function befund(id, schwere, text, daten = null) {
  const key = id; const erst = !gesehen.has(key); gesehen.add(key);
  befunde.push({ id, schwere, tag: TAG, text, daten });
  if (erst && !LEISE) console.log(`  [${schwere}] ${TAG} ${id}: ${text}${daten ? " · " + JSON.stringify(daten).slice(0, 400) : ""}`);
}
const log = (...a) => { if (!LEISE) console.log(...a); };
const r2 = (x) => Math.round(x * 100) / 100;
// NaN/Infinity/„undefined“-Text in Ausgaben suchen (Funktionen übersprungen)
function scan(obj, wo, pfad = "", tiefe = 0, seen = new Set()) {
  if (tiefe > 8 || obj === null || obj === undefined) return;
  if (typeof obj === "number") { if (!Number.isFinite(obj)) befund("nan:" + wo + pfad.replace(/\[\d+\]/g, "[]"), "hoch", `${wo}${pfad} = ${obj}`); return; }
  if (typeof obj === "string") { if (/\b(NaN|undefined|Infinity|null)\b/.test(obj) && !/^[\w-]+$/.test(obj)) befund("text:" + wo + pfad.replace(/\[\d+\]/g, "[]"), "mittel", `${wo}${pfad} enthält „${obj.match(/\b(NaN|undefined|Infinity|null)\b/)[0]}“: ${obj.slice(0, 120)}`); return; }
  if (typeof obj !== "object" || seen.has(obj)) return; seen.add(obj);
  if (obj instanceof Map) { for (const [k, v] of obj) scan(v, wo, `${pfad}.${k}`, tiefe + 1, seen); return; }
  if (obj instanceof Set) return;
  for (const [k, v] of Object.entries(obj)) if (typeof v !== "function") scan(v, wo, Array.isArray(obj) ? `${pfad}[${k}]` : `${pfad}.${k}`, tiefe + 1, seen);
}

// ---------- Kalender ----------
const START = "2026-09-16"; // Mittwoch
const TAGE = []; for (let i = 0; i < 30; i++) TAGE.push(E.tagPlus(START, i));
const offen = (d) => E.wochentag(d) !== 0; // Sonntag Ruhetag

// ---------- 1. Einrichtung (Tag 0, 08:00) ----------
TAG = START; uhr(START, 8, 0);
const w = st.leereWurzel(); w.geraet = "geraet-A"; w.sprache = "de";
const s0 = st.leererBetrieb();
Object.assign(s0, { phase: "app", weg: "genau", ladenArt: "doener", schritt: 5 });
s0.betrieb = { ...s0.betrieb, name: "Imbiss Sonne (Test)", format: "imbiss", kuechen: ["doener"], tageProWoche: 6 };
s0.team = { personen: 2, stundenProPerson: 150, lohnkosten: 5200, eigenerLohn: 2800, eigenerLohnStatus: "eigen" };
s0.kosten = [
  { id: "k-miete", posten: "miete", kategorie: "miete", betrag: 1900, status: "bekannt", periode: "monat", basis: "netto", satz: 19 },
  { id: "k-strom", posten: "strom", kategorie: "energie", betrag: 430, status: "bekannt", periode: "monat", basis: "brutto", satz: 19 },
  { id: "k-vers", posten: "versicherungen", kategorie: "versicherung", betrag: 120, status: "bekannt", periode: "monat", basis: "netto", satz: 19 },
];
const { KATEGORIEN } = await import(R + "data/kosten.js"); s0.kostenKategorienGeprueft = [...KATEGORIEN];
const vorlage = (n) => { for (const [bereich, liste] of Object.entries(VORLAGEN)) { const v = liste.find((x) => x.name === n); if (v) return { ...v, bereich }; } return null; };
const KARTE = [["Döner Kebab", 7.5, 40], ["Dürüm Döner", 8.5, 18], ["Dönerteller", 13.9, 7], ["Hähnchendöner", 7.0, 9], ["Falafel-Dürüm", 7.0, 5], ["Lahmacun", 5.0, 8],
  ["Sucuk-Sandwich", 6.5, 3], ["Pommes frites (Beilage)", 3.5, 14], ["Cola 0,33 l", 2.5, 18], ["Mineralwasser 0,25 l", 2.0, 8], ["Eistee 0,33 l", 2.5, 5], ["Gemischter Salat klein", 5.5, 3]];
s0.gerichte = KARTE.map(([n, p, m], i) => ({ ...gerichtAusVorlage(vorlage(n)), id: "g" + (i + 1), preis: p, mengeTag: m, plu: String(201 + i) }));
fehlendeRezepteErgaenzen(s0); selbstAnwenden(s0, vorauswahlFuer("doener")); s0.selbstAutoArt = "doener";
s0.artikel = E.artikelAusGerichten(s0);
richtpreiseEinsetzen(s0, { datum: START }); E.zwischenpreiseRechnen(s0);
// Kühlstellen, Ruhetag, Personen
const kA = stamm.kuehlstelleAnlegen(s0, { name: "Kühlschrank", art: "kuehl", typ: "kuehlschrank" });
const kB = stamm.kuehlstelleAnlegen(s0, { name: "Saladette", art: "kuehl", typ: "saladette" });
const kC = stamm.kuehlstelleAnlegen(s0, { name: "Tiefkühler", art: "tk", typ: "tiefkuehler" });
stamm.kuehlEingerichtetSetzen(s0); stamm.kuehlTaktSetzen(s0, 2); E.ruhetageSetzen(s0, [0], START);
const pBA = stamm.personAnlegen(s0, "BA"), pMK = stamm.personAnlegen(s0, "MK");
const s = st.migrierenBetrieb(s0);
w.betriebe.push(s); w.aktiv = s.id;
const G = (n) => s.gerichte.find((g) => g.name === n);
const A = (n) => s.artikel.find((a) => a.name === n);
// Büro-Code + Rettungscode
{ const ok = await MO.pinSetzen(w, "4711"); const code = await RT.rettungAnlegen(w);
  const p1 = await MO.pinPruefen(w, "4711"), p2 = await MO.pinPruefen(w, "1234");
  if (!ok || !p1 || p2) befund("pin", "hoch", "Büro-Code prüft nicht richtig", { ok, p1, p2 });
  const f = await RT.rettungVersuch(w, "AAAA-BBBB-CCCC"); const r = await RT.rettungVersuch(w, code);
  if (!f.fehler || !r.ok) befund("rettung", "hoch", "Rettungscode prüft nicht richtig", { f, r });
  w._code = code; }
scan(E.kalkulation(s), "kalkulation");
await st.laden(); // Datenbank A öffnen (leer)
await st.sofortSpeichern(w);

// ---------- 2. Lieferant: Gebinde und Preise (Beispielwerte, keine Branchenwerte) ----------
// [Artikel, Kürzel, Inhaltstext, Inhalt (Grundeinheit), Basis, Preis netto je Gebinde, Steuer]
const LIEFER = {
  "Dönerspieß Kalb/Pute": ["KT", "15 kg", 15000, "g", 150.0, "A"], "Hähnchenspieß": ["KT", "10 kg", 10000, "g", 79.0, "A"],
  "Eisbergsalat": ["KI", "5 kg", 5000, "g", 9.5, "A"], "Tomaten": ["KI", "6 kg", 6000, "g", 13.2, "A"], "Zwiebeln": ["SA", "10 kg", 10000, "g", 6.5, "A"],
  "Weißkohl": ["KI", "10 kg", 10000, "g", 7.0, "A"], "Dönertüte": ["KT", "1000 Stk", 1000, "stk", 29.0, "B"], "Dürüm-Wrap": ["KT", "100 Stk", 100, "stk", 39.0, "A"],
  "Alufolie-Bogen": ["KT", "500 Stk", 500, "stk", 15.9, "B"], "Pommes frites": ["KT", "4x2,5kg", 10000, "g", 26.0, "A"], "Hirtenkäse / Feta": ["EI", "2 kg", 2000, "g", 11.0, "A"],
  "Menüschale": ["KT", "250 Stk", 250, "stk", 38.0, "B"], "Joghurtsauce": ["EI", "5 kg", 5000, "g", 15.0, "A"], "Falafelbällchen": ["KT", "200 Stk", 200, "stk", 28.0, "A"],
  "Lammhackfleisch": ["KT", "5 kg", 5000, "g", 44.0, "A"], "Petersilie": ["KI", "1 kg", 1000, "g", 4.5, "A"], "Dönergewürz": ["PK", "1 kg", 1000, "g", 18.0, "A"],
  "Sucuk": ["KT", "5 kg", 5000, "g", 60.0, "A"], "Scharfe Sauce": ["EI", "5 kg", 5000, "g", 22.0, "A"], "Beilagenschale": ["KT", "500 Stk", 500, "stk", 18.5, "B"],
  "Cola 0,33 l": ["KI", "24 Stk", 24, "stk", 13.9, "B"], "Mineralwasser 0,25 l": ["KI", "24 Stk", 24, "stk", 7.2, "B"], "Eistee": ["KI", "6x1,5l", 9000, "ml", 8.1, "B"],
  "Trinkbecher 0,3 l": ["KT", "1000 Stk", 1000, "stk", 32.0, "B"], "Salatgurke": ["KI", "5 kg", 5000, "g", 8.5, "A"], "Möhren": ["SA", "10 kg", 10000, "g", 7.9, "A"],
  "Joghurtdressing": ["EI", "5 kg", 5000, "g", 16.0, "A"], "Salatschale": ["KT", "500 Stk", 500, "stk", 37.5, "B"], "Weizenmehl Typ 550": ["SA", "25 kg", 25000, "g", 17.5, "A"],
  "Frischhefe": ["PK", "1 kg", 1000, "g", 3.2, "A"], "Salz": ["SA", "5 kg", 5000, "g", 2.4, "A"], "Sonnenblumenöl": ["KA", "10 l", 10000, "ml", 19.8, "A"],
  "Joghurt natur": ["EI", "10 kg", 10000, "g", 17.5, "A"], "Mayonnaise": ["EI", "10 kg", 10000, "g", 26.0, "A"], "Knoblauch": ["SA", "2 kg", 2000, "g", 6.8, "A"],
};
const SATZ = { A: 0.07, B: 0.19 };
const KORREKTUR = ARG.ohneKorrektur ? false : true; // Wirt korrigiert falsch gelesene Inhalte in der Beleg-Prüfung (Annahme: UI erlaubt es)
let artNr = 300000;
const ARTNR = Object.fromEntries(Object.keys(LIEFER).map((n) => [n, String(artNr++)]));
const fmt = (x) => x.toFixed(2).replace(".", ",");
// Beleg als Text (wie ein Großmarkt-Ausdruck) → belegZerlegen → Prüfung → Lieferung. posten: [[name, anzahl], …]
function belegBuchen(D, posten, { nr, haltbar = {}, colaAlsLiter = false } = {}) {
  const zeilen = []; let netto = 0, stA = 0, stB = 0;
  for (const [n, anz] of posten) {
    const [kz, inh, , , preis, sz] = LIEFER[n]; const ges = r2(anz * preis); netto += ges; if (sz === "A") stA += ges * 0.07; else stB += ges * 0.19;
    const inhText = n === "Cola 0,33 l" && colaAlsLiter ? "24x0,33l" : inh;
    zeilen.push(`${ARTNR[n]} ${n} ${kz} ${inhText} ${anz} ${fmt(preis)} ${fmt(ges)} ${sz}`);
  }
  const text = ["Großmarkt Rhein-Neckar (Test)", `Rechnung Nr. ${nr}  Datum ${D.slice(8, 10)}.${D.slice(5, 7)}.${D.slice(0, 4)}`, "Art.-Nr. Bezeichnung Menge Einzelpreis Gesamt", ...zeilen,
    `Summe Netto ${fmt(r2(netto))}`, `MwSt A 7 % ${fmt(r2(stA))}`, `MwSt B 19 % ${fmt(r2(stB))}`, `Brutto ${fmt(r2(netto + stA + stB))}`].join("\n");
  const beleg = BL.belegZerlegen(text, { bekannt: s.artikel.filter((a) => a.herkunft !== "selbst").map((a) => a.name) });
  const vorb = LF.belegZeilenVorbereiten(s, beleg);
  const ps = BL.belegPruefStand(beleg, vorb, {}, null); scan(ps, "belegPruefStand");
  const fragen = vorb.filter((z) => z.frage);
  // Abgleich: hat der Zerleger jede Zeile so gelesen wie gedruckt?
  posten.forEach(([n, anz], i) => { const z = vorb[i];
    if (!z) { befund("beleg-zeile-fehlt", "hoch", `Belegzeile nicht gelesen: ${n}`); return; }
    const jz = LF.journalZeile({ ...z, bekannt: z.bekannt || z.vorschlag }, "netto");
    const soll = LIEFER[n][2]; const ist = jz.inhaltMenge > 0 && EINHEITEN[jz.inhaltEinheit] ? inBasis(jz.inhaltMenge, jz.inhaltEinheit) : null; const basisIst = EINHEITEN[jz.inhaltEinheit]?.basis;
    if ((z.bekannt || z.vorschlag) !== n) befund("beleg-zuordnung:" + n, "mittel", `Belegzeile „${n}“ wird „${z.bekannt || z.vorschlag || "–"}“ zugeordnet`);
    if (z.menge !== anz) befund("beleg-menge:" + n, "hoch", `Belegzeile ${n}: Menge ${z.menge} statt ${anz}`);
    if (ist === null || Math.abs(ist - soll) > 1e-6 || basisIst !== LIEFER[n][3]) befund("beleg-inhalt:" + n + (colaAlsLiter ? ":liter" : ""), n === "Cola 0,33 l" && colaAlsLiter ? "hoch" : "mittel",
      `Belegzeile ${n} („${LIEFER[n][1]}“${colaAlsLiter && n === "Cola 0,33 l" ? " gedruckt als 24x0,33l" : ""}): Inhalt ${ist} ${basisIst} statt ${soll} ${LIEFER[n][3]} je Gebinde`, { inhalt: z.inhalt, gebinde: z.gebinde });
  });
  if (fragen.length) log(`    Beleg ${nr}: ${fragen.length} Rückfragen (${fragen.map((z) => z.frage?.art + ":" + (z.bekannt || z.vorschlag)).join(", ")}) – Wirt bestätigt`);
  // Wirt bestätigt alle Rückfragen (übernimmt), unbekannte Zeilen ordnet er per Vorschlag zu
  const zeilenFertig = vorb.map((z, i) => { const n = posten[i]?.[0]; const x = { ...z, bekannt: z.bekannt || z.vorschlag || null, frage: null };
    if (n && KORREKTUR) { const [, , soll, basis] = LIEFER[n]; const jz = LF.journalZeile(x, "netto"); const ist = jz.inhaltMenge > 0 && EINHEITEN[jz.inhaltEinheit] ? inBasis(jz.inhaltMenge, jz.inhaltEinheit) : null;
      if (ist !== soll || EINHEITEN[jz.inhaltEinheit]?.basis !== basis) x.inhalt = basis === "stk" ? { anzahl: soll, groesse: null, einheit: "stk" } : { anzahl: 1, groesse: soll / 1000, einheit: basis === "g" ? "kg" : "l" }; }
    return x; });
  const doppelt = LF.lieferungDoppelt(s, beleg, D); if (doppelt) befund("beleg-doppelt-falsch:" + nr, "mittel", `Beleg ${nr} gilt als doppelt zu ${doppelt.id}`);
  const l = LF.lieferungAnlegen(s, beleg, { zeilen: zeilenFertig, datum: D, geraet: w.geraet });
  if (Math.abs((l.summeNetto ?? 0) - r2(netto)) > 0.02) befund("beleg-summe", "mittel", `Beleg ${nr}: summeNetto ${l.summeNetto} statt ${r2(netto)}`);
  const aend = LF.preiseUebernehmen(s, l);
  // Haltbarkeit: { name: [art, tage] }
  const ang = {}; l.zeilen.forEach((z, i) => { const h = haltbar[z.artikel]; if (h) ang[i] = { art: h[0], datum: E.tagPlus(D, h[1]) }; });
  if (Object.keys(ang).length) HB.haltbarSetzen(s, l.id, ang);
  E.zwischenpreiseRechnen(s);
  return { l: s.lieferungen.find((x) => x.id === l.id), aend, fragen, beleg };
}

// ---------- 3. Wahrheit (was physisch im Laden liegt) ----------
const wahr = {}; // Grundeinheit je gekaufter Ware
const idx = () => Object.fromEntries(s.artikel.map((a) => [a.name, a]));
const WARE_WAHR = {}; // Monat → € echter Abgang (Verkauf, Müll, Personal, Schwund) zu aktuellen Einkaufspreisen
function abgang(name, menge) { wahr[name] = (wahr[name] || 0) - menge; const a = s.artikel.find((x) => x.name === name); const pj = a ? E.preisJeBasis(a) : null; const m = TAG.slice(0, 7); WARE_WAHR[m] = (WARE_WAHR[m] || 0) + (pj || 0) * menge; }
function verbrauchWahr(bedarf, faktor, grund) { for (const x of bedarf) abgang(x.name, x.menge * faktor); }
const fehlmengen = [];
function gerichtVerbrauch(g, n) { verbrauchWahr(VK.bedarfGericht(g, idx()).bedarf, n); }
function einkaufWahr(posten) { for (const [n, anz] of posten) wahr[n] = (wahr[n] || 0) + anz * LIEFER[n][2]; }

// ---------- 4. Verkäufe je Tag (fest, Wochentag-Muster) ----------
const WT_FAKTOR = { 1: 0.85, 2: 0.9, 3: 0.95, 4: 1.0, 5: 1.25, 6: 1.4 };
const KOMBI_AB = E.tagPlus(START, 8); let KOMBI = null; // Menü Döner + Pommes + Cola, in der Kasse als eigener Artikel 900
function verkaufTag(D, i) {
  const f = WT_FAKTOR[E.wochentag(D)] || 1; const m = {};
  for (const [n, , basis] of KARTE) { const g = G(n); const x = basis * f * (0.85 + 0.3 * zufall()); m[g.id] = Math.max(0, Math.round(x)); }
  return m;
}

// ---------- 5. DSFinV-K-Export (selbst erzeugt) ----------
const KASSE = "KASSE-SONNE-1"; let zNr = 0;
function dsfinvkDateien(tage, { ohneAbschluss = false } = {}) {
  const L = ["Z_KASSE_ID;Z_ERSTELLUNG;Z_NR;BON_ID;POS_ZEILE;GUTSCHEIN_NR;ARTIKELTEXT;GV_TYP;GV_NAME;INHAUS;P_STORNO;AGENTUR_ID;ART_NR;GTIN;WARENGR_ID;WARENGR;MENGE;FAKTOR;EINHEIT;STK_BR"];
  const T = ["Z_KASSE_ID;Z_ERSTELLUNG;Z_NR;BON_ID;BON_NR;BON_TYP;BON_NAME;BON_STORNO;BON_START;BON_ENDE;BEDIENER_ID;BEDIENER_NAME;UMS_BRUTTO"];
  const C = ["Z_KASSE_ID;Z_ERSTELLUNG;Z_NR;Z_BUCHUNGSTAG;TAXONOMIE_VERSION"];
  for (const t of tage) {
    const z = t.zNr; const morgen = E.tagPlus(t.datum, 1); const ers = `${morgen}T01:30:00+02:00`;
    C.push(`"${KASSE}";${ers};${z};"${t.datum}";"2.4"`);
    let bon = 0;
    const bonDazu = (pos, typ = "Beleg", storno = 0, zeit = "12:00:00", tag = t.datum) => { bon += 1; const b = String(bon);
      let summe = 0; pos.forEach(([text, plu, menge, preis], k) => { summe += menge * preis; L.push(`"${KASSE}";${ers};${z};"${b}";"${k + 1}";"";"${text}";"Umsatz";"";0;0;0;"${plu}";"";"1";"Speisen";${fmt(menge)}0;1,000;"Stück";${preis.toFixed(5).replace(".", ",")}`); });
      T.push(`"${KASSE}";${ers};${z};"${b}";${bon};"${typ}";"";${storno};${tag}T${zeit}+02:00;${tag}T${zeit}+02:00;"B1";"Test";${fmt(summe)}`); };
    for (const [gid, menge] of Object.entries(t.mengen)) { const g = s.gerichte.find((x) => x.id === gid); if (!menge) continue; const preis = t.preise[gid];
      // auf Bons zu höchstens 3 Stück verteilen
      let rest = menge; while (rest > 0) { const q = Math.min(3, rest); bonDazu([[g.name, g.plu, q, preis]]); rest -= q; } }
    if (t.kombi) bonDazu([["Menü Döner+Pommes+Cola", "900", t.kombi, KOMBI.preis]]);
    if (t.nacht) bonDazu([[G("Döner Kebab").name, G("Döner Kebab").plu, t.nacht, t.preise[G("Döner Kebab").id]]], "Beleg", 0, "00:30:00", morgen); // Bon nach Mitternacht, gehört zum Geschäftstag
    bonDazu([[G("Cola 0,33 l").name, G("Cola 0,33 l").plu, 1, t.preise[G("Cola 0,33 l").id]]], "AVBelegabbruch"); // Abbruch: zählt nicht
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?><DataSet><Version>2.4</Version><Media><Name>Test</Name><Table><URL>lines.csv</URL><UTF8/><DecimalSymbol>,</DecimalSymbol><DigitGroupingSymbol>.</DigitGroupingSymbol><VariableLength><ColumnDelimiter>;</ColumnDelimiter><TextEncapsulator>"</TextEncapsulator></VariableLength></Table></Media></DataSet>`;
  const datei = (name, text) => Object.assign(new Blob([text]), { name });
  const out = [datei("index.xml", xml), datei("lines.csv", L.join("\r\n")), datei("transactions.csv", T.join("\r\n"))];
  if (!ohneAbschluss) out.push(datei("cashpointclosing.csv", C.join("\r\n")));
  return out;
}
const kassenTag = new Map(); // Datum → { mengen, kombi, nacht, zNr, summe }

// ---------- 6. Kühlung ----------
let lfdA = () => st.naechsteLfd(w);
function rundgang(stand, D, h, m, von, werte, { lfd = lfdA, geraet = w.geraet, nachkontrolle = null } = {}) {
  uhr(D, h, m);
  const r = E.rundgangStarten(stand, { von, datum: heute() });
  for (const k of E.aktiveStellen(stand)) { const v = werte[k.id]; if (v === undefined) continue; uhr(D, h, m + 1);
    E.stationEintragen(r, k, { wert: v, massnahmen: E.abweichung(k, v) ? ["tuer", "eingestellt"] : [], nachkontrolle: E.abweichung(k, v) ? (nachkontrolle || "h1") : null }); }
  uhr(D, h, m + 3); E.rundgangAbschliessen(stand, r, lfd, geraet);
  return r;
}
const normalWerte = (D, teil) => ({ [kA.id]: r2(3.5 + zufall() * 1.5), [kB.id]: r2(4 + zufall() * 1.5), [kC.id]: r2(-20 + zufall() * 1.5) });

// ---------- 7. Invarianten ----------
const VERLAUF = [];
const toleranzFuer = (name) => { const l = LIEFER[name]; return l ? Math.max(0.25 * l[2], 0.05 * Math.abs(wahr[name] || 0)) + 1e-6 : 1e9; };
let letzteInventur = null; const abweichungGemeldet = new Set();
function pruefen(D, { nachInventur = null } = {}) {
  const H = heuteGeschaeft(); const K = heute();
  const z = ZA.zaehler(s, { datum: D }); scan(z, "zaehler");
  // Zähler: Stand = Netto − Ware − Müll − Kosten
  const rechn = z.umsatzNetto - z.ware - z.muell - z.kosten;
  if (Math.abs(rechn - z.stand) > 0.01) befund("zaehler-summe", "hoch", `Zähler-Stand ${r2(z.stand)} ≠ Netto−Ware−Müll−Kosten ${r2(rechn)}`);
  if (Math.abs(z.kosten - z.tageskosten * z.gewichtBisHeute) > 0.01) befund("zaehler-kosten", "hoch", `Kosten ${z.kosten} ≠ Tageskosten × Tage`);
  if (Math.abs(z.fix + z.lohn + z.eigen + z.sonderBis - z.kosten) > 0.05) befund("zaehler-kostenteile", "mittel", `Kostenteile (fix ${r2(z.fix)} + lohn ${r2(z.lohn)} + eigen ${r2(z.eigen)} + sonder ${r2(z.sonderBis)}) = ${r2(z.fix + z.lohn + z.eigen + z.sonderBis)} ≠ Kosten ${r2(z.kosten)}`, { stufe: z.stufe });
  // unabhängig nachgerechnet: Umsatz netto
  let un = 0; for (let d = z.start; d <= D; d = E.tagPlus(d, 1)) { const e = E.umsatzEintrag(s, d); if (e) un += e.umsatz / (1 + z.steuer); }
  if (Math.abs(un - z.umsatzNetto) > 0.01) befund("zaehler-umsatz", "hoch", `Umsatz netto ${r2(z.umsatzNetto)} ≠ nachgerechnet ${r2(un)}`);
  const wq = ZA.wareneinsatzQuote(s, z); scan(wq, "wareneinsatzQuote");
  if (!(wq.quote >= 0 && wq.quote <= 1)) befund("quote", "niedrig", `wareneinsatzQuote() ${r2(wq.quote * 100)} % (Funktion ungedeckelt, derzeit nirgends angezeigt)`, wq);
  if (E.wareneinsatzWarnung(z.quoteEff) && z.quoteQuelle !== "richtwert") befund("quote-warnung", "mittel", `Monat & Zähler zeigt „Wareneinsatz hoch ${Math.round(z.quoteEff * 100)} %“ (Stufe ${z.stufe}, Belege ${r2(z.belegSumme)} € gegen Umsatz netto ${r2(z.umsatzNetto)} €)`);
  // Wahrheit: Wareneinsatz = Wert des echten Verbrauchs seit Monatsanfang (Wahrheitsbestand zu aktuellen Preisen)
  const hz = LZ.heuteZiel(s, z, D); scan(hz, "heuteZiel");
  VERLAUF.push({ D, stufe: z.stufe, stand: r2(z.stand), ware: r2(z.ware), quoteEff: r2(z.quoteEff), monatsende: z.monatsende === null ? null : r2(z.monatsende), nullTag: z.nullTag, ziel: hz.stufe, tempo: hz.tempo, umsatzNetto: r2(z.umsatzNetto), kosten: r2(z.kosten), muell: r2(z.muell) });
  if (hz.stufe === "bisNull" && z.stand >= 0 && !z.keinUmsatz) befund("ziel-stufe", "mittel", `Zielkarte „bis null“ obwohl Zähler im Plus (${r2(z.stand)})`);
  if (hz.stufe !== "bisNull" && z.stand < 0) befund("ziel-stufe2", "mittel", `Zielkarte „${hz.stufe}“ obwohl Zähler im Minus (${r2(z.stand)})`);
  { const tage = [...kassenTag.values()].filter((t) => t.datum.slice(0, 7) === D.slice(0, 7) && t.datum <= D); const schnitt = tage.length ? tage.reduce((a, t) => a + t.summe, 0) / tage.length : null;
    if (hz.tempo?.art === "knapp" && schnitt && hz.tempo.proTag > 2.5 * schnitt) befund("ziel-protag", "hoch", `Laden „Heute“: „${Math.round(hz.tempo.proTag)} € / Tag nötig“ bei Ø ${Math.round(schnitt)} € Tagesumsatz (Stufe ${z.stufe}, quoteEff ${r2(z.quoteEff)}, Einkauf heute ${einkaufTage.has(D) ? "ja" : "nein"})`); }
  if (hz.anteil < 0 || hz.anteil > 1) befund("ziel-anteil", "mittel", `Balken-Anteil ${hz.anteil}`);
  const tb = LZ.tagesBilanz(s, D, K); scan(tb, "tagesBilanz");
  if (Math.abs(tb.nach - z.stand) > 0.01) befund("bilanz-nach", "hoch", `Tagesbilanz nach ${tb.nach} ≠ Zähler ${z.stand}`);
  if (tb.restTage !== null && z.nullTag && tb.restTage < 0) befund("bilanz-rest", "mittel", `restTage negativ ${tb.restTage}`);
  scan(LZ.heuteKachelZahlen(s, E.kuehlStatus(s), D), "heuteKachelZahlen");
  scan(ZA.zaehlerStrecke(z), "zaehlerStrecke"); scan(ZA.zaehlerVerlauf(z), "zaehlerVerlauf");
  // Kasse: Verkauf × Preis = Kassenumsatz = Tagesnotiz
  for (const kt of kassenTag.values()) { if (!kt.importiert || kt.geprueft) continue; kt.geprueft = true; const KD = kt.datum;
    const vj = VK.verkaufJeGericht(s, { von: KD, bis: KD });
    const summeMenge = vj.zeilen.reduce((a, r) => a + r.menge * (s.gerichte.find((g) => g.id === r.gericht)?.preis || 0), 0);
    const tn = E.umsatzEintrag(s, KD)?.umsatz ?? null;
    const summeMenge2 = vj.zeilen.reduce((a, r) => a + r.menge * (kt.preise[r.gericht] || 0), 0);
    if (kt.herkunft === "dsfinvk") {
      if (vj.umsatz === null || Math.abs(vj.umsatz - kt.summe) > 0.01) befund("kasse-umsatz", "hoch", `${KD}: Import-Umsatz ${vj.umsatz} ≠ Kasse ${r2(kt.summe)}`);
      if (Math.abs(summeMenge2 + vj.ohneZuordnung.umsatz - kt.summe) > 0.01 && !kt.kombi) befund("kasse-menge-preis", "mittel", `${KD}: Σ Menge × Kartenpreis ${r2(summeMenge2)} ≠ Kasse ${r2(kt.summe)}`);
      // FIX (1): mit Menü verteilt die App den Kassen-Umsatz auf die Teile – Σ Umsatz je Gericht muss die Kasse ergeben
      const verteilt = vj.zeilen.reduce((a, r) => a + (r.umsatz || 0), 0) + vj.ohneZuordnung.umsatz;
      if (kt.kombi && Math.abs(verteilt - kt.summe) > 0.05) befund("kombi-umsatz", "mittel", `${KD}: Menü: Σ Umsatz je Gericht ${r2(verteilt)} ≠ Kasse ${r2(kt.summe)}`, { kombi: kt.kombi });
      if (kt.kombi) { const dn = vj.zeilen.find((r) => r.gericht === G("Döner Kebab").id).menge; const soll = (kt.mengen[G("Döner Kebab").id] || 0) + kt.kombi + kt.nacht; if (Math.abs(dn - soll) > 1e-6) befund("kombi-menge", "mittel", `${KD}: Döner ${dn} statt ${soll} (inkl. Menü)`); }
    } else { const mk = kt.handKombi ? kt.handKombi * KOMBI.preis : 0; // FIX (1): Menü-Zeile zum Menüpreis
      const nurGerichte = Object.entries(kt.mengen).reduce((a, [gid, n]) => a + n * (kt.preise[gid] || 0), 0);
      if (Math.abs(nurGerichte + mk - kt.summe) > 0.01) befund(kt.summeKasse ? "kombi-umsatz" : "hand-menge-preis", "mittel", `${KD}: Hand: Σ Menge × Preis ${r2(nurGerichte + mk)} ≠ Z-Bon ${r2(kt.summe)}`); }
    if (tn === null || Math.abs(tn - kt.summe) > 0.01) befund("tagesnotiz", "hoch", `${KD}: Tagesumsatz ${tn} ≠ Kasse ${r2(kt.summe)}`);
    if (vj.ohneZuordnung.menge > 0) befund("ohne-zuordnung", "mittel", `${vj.ohneZuordnung.menge} Kassenpositionen ohne Gericht`, vj.ohneZuordnung.texte);
  }
  // Bestand gegen Wahrheit
  const bs = BS.bestandStand(s, { heuteTag: D }); scan(bs, "bestandStand");
  for (const x of bs.waren) {
    if (x.bestand !== null && x.bestand < 0) befund("bestand-negativ", "hoch", `${x.name}: Bestand ${x.bestand}`);
    if (x.negativ) befund("bestand-rechnung-negativ:" + x.name, "mittel", `${x.name}: gerechneter Bestand unter null (auf 0 gesetzt)`, x.teile);
    let wv = wahr[x.name]; if (wv === undefined || x.bestand === null) continue;
    for (const t of kassenTag.values()) if (!t.importiert && t.datum > (IV.inventurenFertig(s).filter((q) => q.datum <= D).pop()?.datum || "")) wv += t.verbrauch[x.name] || 0; // Verkäufe, die die App noch nicht kennt
    const diff = x.bestand - Math.max(0, wv);
    if (Math.abs(diff) > toleranzFuer(x.name) && !abweichungGemeldet.has(x.name + ":" + (letzteInventur || ""))) {
      abweichungGemeldet.add(x.name + ":" + (letzteInventur || ""));
      befund("bestand-wahr:" + x.name, "mittel", `${x.name}: App-Bestand ${r2(x.bestand)} ${x.basis}, im Laden ${r2(wv)} (Δ ${r2(diff)}; Sicherheit „${x.sicherheit}“)`, { luecken: x.luecken.map((l) => l.art), teile: x.teile });
    }
  }
  if (nachInventur) {
    for (const x of bs.waren) { const m = IV.mengeSauber(nachInventur.posten[x.name]); const inh = nachInventur.inhalte?.[x.name]; if (m === null || !inh) continue;
      if (Math.abs(x.teile.anfang - m * inh) > 1e-6) befund("inventur-anfang:" + x.name, "hoch", `${x.name}: Anfang ${x.teile.anfang} ≠ gezählt ${m}×${inh}`);
      if (bs.start === D && Math.abs(x.bestand - m * inh) > 1e-6 && x.teile.einkauf === 0) befund("inventur-bestand:" + x.name, "hoch", `${x.name}: Bestand nach Inventur ${x.bestand} ≠ gezählt ${m * inh}`, x.teile); }
  }
  // Bestellvorschlag und Uhrzeit-Satz
  const bv = BS.bestellVorschlag(s, { heuteTag: D, bs }); scan(bv, "bestellVorschlag");
  const bu = BS.bestandUhrzeit(s, { heuteTag: D }); scan(bu, "bestandUhrzeit");
  if (bu) {
    const jetzt = bv.zeilen.filter((x) => x.dringend === "leer" || x.dringend === "jetzt");
    const m = /^(.*) reicht noch ≈ (\d+) Tage?$/.exec(bu.text);
    if (m) { const zl = jetzt[0]; if (!zl || Math.floor(zl.reichweite) !== Number(m[2])) befund("uhr-reicht", "mittel", `„${bu.text}“ passt nicht zur Reichweite ${zl?.reichweite}`); }
    if (/fast alle/.test(bu.text) && jetzt[0] && jetzt[0].bestand > 0 && jetzt[0].reichweite >= 1) befund("uhr-fastalle", "niedrig", `„${bu.text}“ bei Reichweite ${r2(jetzt[0].reichweite)}`);
    const n = /Heute bestellen: (\d+)/.exec(bu.text); if (n && Number(n[1]) !== jetzt.length) befund("uhr-anzahl", "mittel", `„${bu.text}“ aber ${jetzt.length} dringende Zeilen`);
  }
  const hs = HB.haltbarStand(s, { heuteTag: D, kalenderTag: K }); scan(hs, "haltbarStand");
  const hu = HB.haltbarUhrzeit(s, { heuteTag: D, kalenderTag: K }); scan(hu, "haltbarUhrzeit");
  if (hu && /verbrauchen/.test(hu.text)) { const x = hs.laeuftAb.find((y) => hu.text.startsWith(i18n.artikelText(y.name)));
    if (x && x.rest !== null && wahr[x.name] !== undefined && wahr[x.name] <= 0) befund("haltbar-leer", "mittel", `„${hu.text}“, obwohl die Ware im Laden schon verbraucht ist (Rest laut App ${r2(x.rest)})`); }
  for (const x of hs.laeuftAb) if (x.status === "vorbei" && wahr[x.name] > 0 && !hu) befund("haltbar-stumm", "hoch", `${x.name}: Verbrauchsdatum vorbei, kein Hinweis`);
  scan(DE.kombiVorschlaege(s, { heuteTag: D }), "kombiVorschlaege");
  scan(OF.offenImBuero(s, w, { jetzt: new Date() }), "offenImBuero");
  scan(OF.jetztDran(s, w, { jetzt: new Date() }), "jetztDran");
  try { scan(OT.ordnerKachelStand(s, { datum: K }), "ordnerKachelStand"); } catch (e) { befund("ordner-kachel-fehler", "hoch", "ordnerKachelStand wirft: " + e.message); }
  scan(VK.verkaufAuswertung(s, VK.auswertungZeitraum(s, { heuteTag: D })), "verkaufAuswertung");
  return { z, bs, bv, bu, hu };
}

// ---------- 8. Der Monat ----------
const einkaufTage = new Set(); const einkaeufe = []; let inv1 = null, inv2 = null;
const handTage = new Set([E.tagPlus(START, 4), E.tagPlus(START, 11), E.tagPlus(START, 19)]); // drei Tage Z-Bon abgelesen
const ohneAbschlussTag = E.tagPlus(START, 13); // ein Import ohne cashpointclosing.csv (Datum aus Bon-Zeit)
const nachtTage = new Set([E.tagPlus(START, 3), E.tagPlus(START, 13), E.tagPlus(START, 24)]); // Bon nach Mitternacht
const abweichungTag = E.tagPlus(START, 9);
const preisTag = E.tagPlus(START, 12);   // Dönerspieß wird teurer
const gebindeTag = E.tagPlus(START, 19); // Cola: Kiste 24 → Kiste 12
const schwundTag = E.tagPlus(START, 10); // 6 Cola verschwinden (nur Wahrheit)
const inv2Tag = E.tagPlus(START, 16);    // Inventur nach Mitternacht (Kalendertag + 1, 01:15)
const geraetBAb = E.tagPlus(START, 21), geraetBBis = E.tagPlus(START, 23);
let wB = null, sB = null, stB = null;
const importPuffer = []; // Tage, die noch nicht importiert sind
let stockouts = 0;

async function importieren(tage, { ohneAbschluss = false } = {}) {
  const dateien = dsfinvkDateien(tage, { ohneAbschluss });
  const erg = await VK.exportEinlesen(dateien); scan(erg.bericht, "dsfinvk-bericht");
  const vs = VK.importVorschau(s, erg); scan(vs, "importVorschau");
  for (const t of tage) { if (!erg.tage.includes(t.datum)) befund("import-tag-fehlt", "hoch", `Import ohne Tag ${t.datum}${ohneAbschluss ? " (ohne cashpointclosing)" : ""}`, erg.tage); }
  if (erg.tage.some((d) => !tage.some((t) => t.datum === d))) befund("import-tag-zuviel", "hoch", `Import erzeugt fremden Tag: ${erg.tage.filter((d) => !tage.some((t) => t.datum === d))}`, { ohneAbschluss });
  for (const o of vs.offen) { // Wirt ordnet das Menü dem Döner zu (einzige Möglichkeit: ein Kassenartikel = ein Gericht)
    const ziel = o.vorschlaege?.[0] && s.gerichte.find((g) => g.id === o.vorschlaege[0]); const dg = G("Döner Kebab");
    if (false) befund("kombi-zuordnung", "mittel", `Kassenartikel „${o.text}“ (Kombi) lässt sich nur EINEM Gericht zuordnen – Vorschläge: ${(o.vorschlaege || []).map((id) => s.gerichte.find((g) => g.id === id)?.name).join(", ")}`);
    // FIX (1): Menü aus mehreren Gerichten lernen (Schwadron-Fix M1)
    const k = VK.kombiLernen(s, { text: o.text, plu: o.plu }, [{ gericht: dg.id, menge: 1 }, { gericht: G("Pommes frites (Beilage)").id, menge: 1 }, { gericht: G("Cola 0,33 l").id, menge: 1 }]);
    if (!k) befund("kombi-lernen", "hoch", `Menü ${o.text} ließ sich nicht lernen`); else KOMBI.id = k.id;
  }
  const r = VK.importUebernehmen(s, erg, { jetzt: new Date().toISOString(), geraet: w.geraet });
  for (const t of tage) t.importiert = true;
  return { erg, vs, r };
}

for (const [i, D] of TAGE.entries()) {
  TAG = D; uhr(D, 9, 0);
  log(`\n== Tag ${i} ${D} (${["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][E.wochentag(D)]})`);
  if (!offen(D)) { uhr(D, 12, 0); pruefen(D); await st.sofortSpeichern(w); continue; }

  // Morgens: Kühl-Rundgang (am Abweichungstag Saladette zu warm, Nachkontrolle 1 h)
  if (D === abweichungTag) {
    rundgang(s, D, 9, 30, pBA.id, { ...normalWerte(D, 0), [kB.id]: 9.8 });
    const nk = E.offeneNachkontrollen(s); if (nk.length !== 1) befund("nachkontrolle-offen", "hoch", `Offene Nachkontrollen ${nk.length} statt 1`);
    const kd = LZ.heuteKachelZahlen(s, E.kuehlStatus(s), D); if (kd.kuehl?.art !== "abweichung") befund("kachel-kuehl", "mittel", "Kühl-Kachel zeigt keine Abweichung", kd.kuehl);
    const jd = OF.jetztDran(s, w, { jetzt: new Date() }); if (jd?.id !== "kuehlAlarm") befund("jetztdran-kuehl", "hoch", "„Jetzt dran“ zeigt keinen Kühlalarm", jd);
    // Nachkontrolle nach 1 Stunde: nur die Saladette
    uhr(D, 10, 35); const r = E.rundgangStarten(s, { von: pBA.id, datum: heute(), einzel: kB.id }); E.stationEintragen(r, kB, { wert: 5.6 }); uhr(D, 10, 36); E.rundgangAbschliessen(s, r, lfdA, w.geraet);
    const nk2 = E.offeneNachkontrollen(s); if (nk2.length) befund("nachkontrolle-zu", "hoch", "Nachkontrolle bleibt offen nach guter Messung", nk2.map((x) => x.status));
    const nkSt = E.nachkontrolleStand(s, s.messungen.find((m) => m.abweichung && m.datum === D)); if (nkSt.status !== "erledigt") befund("nachkontrolle-status", "hoch", `Nachkontrolle Status ${nkSt.status}`);
  } else rundgang(s, D, 9, 30, pBA.id, normalWerte(D, 0));

  // Einkauf: Tag 0 Erstausstattung (von Hand gewählt); dann montags und donnerstags genau nach Vorschlag
  const wt = E.wochentag(D);
  if (i === 0 || wt === 1 || wt === 4) {
    uhr(D, 10, 0);
    let posten;
    if (i === 0) posten = Object.keys(LIEFER).map((n) => [n, ["Dönerspieß Kalb/Pute"].includes(n) ? 3 : ["Cola 0,33 l"].includes(n) ? 6 : ["Mineralwasser 0,25 l"].includes(n) ? 3 : ["Pommes frites", "Dürüm-Wrap", "Eisbergsalat", "Tomaten"].includes(n) ? 2 : 1]);
    else {
      const bv = BS.bestellVorschlag(s, { heuteTag: D });
      posten = bv.zeilen.filter((z) => LIEFER[z.name] && z.gebinde > 0).map((z) => [z.name, z.gebinde]);
      const ohneGebinde = bv.zeilen.filter((z) => !LIEFER[z.name] || !(z.gebinde > 0)); if (ohneGebinde.length) befund("vorschlag-ohne-gebinde", "niedrig", `Vorschlag ohne ganze Gebinde: ${ohneGebinde.map((z) => z.name + " " + z.menge).join(", ")}`);
      log(`  Vorschlag (${bv.zeilen.length} Zeilen): ${posten.map(([n, a]) => a + "×" + n).join(", ")}`);
      // Waren, die vorher gekauft wurden und im Vorschlag fehlen, weil der Verbrauch unbekannt ist
      for (const x of BS.bestandStand(s, { heuteTag: D }).waren) if (x.schnitt === null && LIEFER[x.name] && (wahr[x.name] || 0) > 0) befund("verbrauch-unbekannt:" + x.name, "niedrig", `${x.name}: Ø-Verbrauch unbekannt (${x.luecken.map((l) => l.art).join(", ")}) – nie im Vorschlag`);
    }
    if (D === preisTag) LIEFER["Dönerspieß Kalb/Pute"][4] = 162.0; // +8 %
    if (D === gebindeTag) { LIEFER["Cola 0,33 l"] = ["KI", "12 Stk", 12, "stk", 7.2, "B"]; posten = posten.map(([n, a]) => (n === "Cola 0,33 l" ? [n, a * 2] : [n, a])); }
    const halt = i === 0 ? { "Hähnchenspieß": ["verbrauch", 4], "Joghurtsauce": ["mhd", 6] } : D === E.tagPlus(START, 15) ? { "Hähnchenspieß": ["verbrauch", 2], "Joghurt natur": ["mhd", 5] } : {};
    if (posten.length) {
      const b = belegBuchen(D, posten, { nr: "RN-" + D, haltbar: halt, colaAlsLiter: false });
      einkaufWahr(posten); einkaufTage.add(D); einkaeufe.push({ D, posten });
      if (i === 0) for (const z of E.kalkulation(s).zeilen) if (z.waren === null) befund("karte-grau:" + z.name, "mittel", `Gericht bleibt nach dem ersten Beleg ohne Wareneinsatz: ${z.name}`);
      if (D === preisTag) { const pa = LF.preisAenderungen(s, { datum: D }); const x = pa.find((p) => p.name === "Dönerspieß Kalb/Pute");
        if (!x || Math.abs(x.prozent - 0.08) > 0.001) befund("preis-aenderung", "mittel", `Preisänderung Dönerspieß nicht als +8 % erkannt`, pa.map((p) => [p.name, r2(p.prozent * 100)]));
        scan(pa.map(LF.preisAnzeige), "preisAnzeige");
        const kz = E.kalkulation(s).zeilen.find((z) => z.name === "Döner Kebab"); log(`  Preiswechsel: Döner Wareneinsatz jetzt ${r2(kz.waren)} €`);
        if (inv1 && Math.abs(IV.inventurWert(s, inv1).summe - inv1.wert) > 0.01) befund("inventur-wert-alt", "hoch", "Wert der alten Inventur ändert sich mit neuem Preis"); }
      if (D === gebindeTag) { const a = A("Cola 0,33 l"); if (inBasis(a.packung.menge, a.packung.einheit) !== 12) befund("gebinde-wechsel", "mittel", `Cola-Gebinde nach Beleg ${JSON.stringify(a.packung)}`); }
    }
  }
  // Morgens vor dem Verkauf: reicht die Ware für den Tag? (Bestellvorschlag befolgt → nichts geht aus)
  const mengen = verkaufTag(D, i); let kombi = 0, nacht = 0;
  if (D >= KOMBI_AB) {
    if (!KOMBI) { const k = DE.kombiRechnen(s, [G("Döner Kebab").id, G("Pommes frites (Beilage)").id, G("Cola 0,33 l").id]); scan(k, "kombiRechnen"); KOMBI = { preis: k.stufen.find((x) => x.stufe === "normal").preis }; log(`  Kombi angelegt: ${DE.kombiText(k, k.stufen[1])}`); }
    kombi = 4 + Math.round(zufall() * 4);
  }
  if (nachtTage.has(D)) nacht = 2;
  // Wahrheit: Verbrauch
  const bedarfHeute = {};
  const merk = (g, n) => { for (const x of VK.bedarfGericht(g, idx()).bedarf) bedarfHeute[x.name] = (bedarfHeute[x.name] || 0) + x.menge * n; };
  for (const [gid, n] of Object.entries(mengen)) merk(s.gerichte.find((g) => g.id === gid), n);
  if (kombi) { merk(G("Döner Kebab"), kombi); merk(G("Pommes frites (Beilage)"), kombi); merk(G("Cola 0,33 l"), kombi); }
  if (nacht) merk(G("Döner Kebab"), nacht);
  for (const [n, b] of Object.entries(bedarfHeute)) if (LIEFER[n] && (wahr[n] || 0) < b - 1e-6) { stockouts += 1; fehlmengen.push({ D, n, da: r2(wahr[n] || 0), braucht: r2(b) });
    befund("ware-aus:" + n, i === 0 ? "niedrig" : "hoch", `${n} reicht heute nicht: da ${r2(wahr[n] || 0)}, gebraucht ${r2(b)} (letzter Einkauf nach Vorschlag)`, { einkauf: [...einkaufTage].pop() }); }
  for (const [n, b] of Object.entries(bedarfHeute)) abgang(n, b);
  if (D === schwundTag) abgang("Cola 0,33 l", 6);

  // Mittag: Müll und Personalessen (Gerät A)
  uhr(D, 15, 0);
  if (i % 3 === 1) { const g = G("Döner Kebab"); MU.gerichtWeg(s, g, { datum: D, anzahl: 1 }); gerichtVerbrauch(g, 1); }
  if (i % 4 === 2) { const a = A("Tomaten"); MU.rohwareWeg(s, a, { datum: D, menge: 800, einheit: "g" }); abgang("Tomaten", 800); }
  if (i % 5 === 3) { const a = A("Knoblauchsauce"); const e = MU.rohwareWeg(s, a, { datum: D, menge: 500, einheit: "g" }); // Selbstgemachtes weg
    const roh = VK.selbstAufRohware(a, 500, "g", idx()); for (const x of roh.bedarf) abgang(x.name, x.menge);
    if (e.wert === null) befund("muell-selbst-wert", "mittel", "Müll Selbstgemachtes (Knoblauchsauce) ohne Wert");
    scan(MU.muellFormWerte(s, { typ: "artikel", name: a.name }, D), "muellFormWerte"); }
  if (i % 4 === 0) { const g = G(i % 8 === 0 ? "Dürüm Döner" : "Hähnchendöner"); const e = MU.personalessen(s, g, { datum: D }); e.von = pMK.id; gerichtVerbrauch(g, 1);
    if (e.mahlzeit !== "mittag") befund("personal-mahlzeit", "niedrig", `Personalessen 15:00 als „${e.mahlzeit}“`); }
  scan(MU.muellHeute(s, D), "muellHeute"); scan(MU.muellWoche(s, D), "muellWoche"); scan(MU.muellTonne(MU.muellMonatVergleich(s, D)), "muellTonne");

  // Abends: Kühl-Rundgang
  rundgang(s, D, 21, 30, pMK.id, normalWerte(D, 1));

  // Gerät B (zweites Handy) – gleichzeitige Einträge
  if (D >= geraetBAb && D <= geraetBBis && sB) {
    uhr(D, 16, 10); const g = G("Lahmacun"); MU.gerichtWeg(sB, sB.gerichte.find((x) => x.id === g.id), { datum: D, anzahl: 2 }); gerichtVerbrauch(g, 2);
    const eB = MU.personalessen(sB, sB.gerichte.find((x) => x.id === G("Döner Kebab").id), { datum: D, mahlzeit: "abend" }); eB.von = pBA.id; gerichtVerbrauch(G("Döner Kebab"), 1);
    // B misst abends 21:40 einen zweiten Rundgang (gleiche Stellen, eigenes Gerät)
    rundgang(sB, D, 21, 40, pBA.id, normalWerte(D, 1), { lfd: () => stB.naechsteLfd(wB), geraet: wB.geraet });
    if (D === geraetBAb) { BS.lagerSetzen(sB, "tage", 6); } // B ändert den Bestell-Zeitraum
    if (D === E.tagPlus(geraetBAb, 1)) { G("Sucuk-Sandwich").preis = 6.9; } // A ändert einen Preis
    uhr(D, 21, 50); await stB.sofortSpeichern(wB);
  }

  // 22:45 Kassenschluss: Tagesumsatz, Verkäufe
  uhr(D, 22, 45);
  const hand = handTage.has(D);
  let summe = 0; for (const [gid, n] of Object.entries(mengen)) summe += n * s.gerichte.find((g) => g.id === gid).preis;
  if (kombi) summe += kombi * KOMBI.preis; if (nacht) summe += nacht * G("Döner Kebab").preis;
  summe = r2(summe);
  zNr += 1; kassenTag.set(D, { datum: D, mengen, kombi, nacht, zNr, summe, herkunft: hand ? "hand" : "dsfinvk", preise: Object.fromEntries(s.gerichte.map((g) => [g.id, g.preis])), importiert: hand, verbrauch: bedarfHeute });
  E.tagesnotizSetzen(s, D, summe, { geraet: w.geraet }); E.tagesnotizFestschreiben(s, D, w.geraet);
  if (hand) { // Z-Bon-Artikelbericht abgelesen (Kombi steht dort als eigener Artikel; der Wirt tippt sie als Döner, Nachtbons sind dabei)
    // FIX (1): Menü als eigene Zeile (Kombi-Kennung), Nachtbons beim Döner
    const m = { ...mengen }; m[G("Döner Kebab").id] = (m[G("Döner Kebab").id] || 0) + nacht;
    for (const [gid, n] of Object.entries(m)) VK.handVerkaufSetzen(s, D, gid, n, { jetzt: new Date().toISOString(), geraet: w.geraet });
    if (kombi && KOMBI?.id) VK.handVerkaufSetzen(s, D, KOMBI.id, kombi, { jetzt: new Date().toISOString(), geraet: w.geraet });
    else if (kombi) { m[G("Döner Kebab").id] += kombi; VK.handVerkaufSetzen(s, D, G("Döner Kebab").id, m[G("Döner Kebab").id], { jetzt: new Date().toISOString(), geraet: w.geraet }); }
    kassenTag.get(D).mengen = m; kassenTag.get(D).handKombi = kombi && KOMBI?.id ? kombi : 0; kassenTag.get(D).kombi = 0; kassenTag.get(D).nacht = 0; kassenTag.get(D).summe = summe;
  } else importPuffer.push(kassenTag.get(D));
  // Import: Tag 0–5 täglich; danach alle drei Tage gebündelt (inkl. eines schon eingelesenen Tages); ein Import ohne cashpointclosing
  uhr(D, 23, 0);
  const buendeln = i >= 6 && D !== ohneAbschlussTag && !(i % 3 === 0) && D !== TAGE[TAGE.length - 1];
  if (importPuffer.length && !buendeln) {
    const tage = [...importPuffer]; const nochmal = i >= 9 ? [...kassenTag.values()].filter((t) => t.herkunft === "dsfinvk" && !tage.includes(t) && t.datum < tage[0].datum).pop() : null;
    const r = await importieren(nochmal ? [nochmal, ...tage] : tage, { ohneAbschluss: D === ohneAbschlussTag });
    if (nochmal && r.r.gleich < 1) befund("import-nochmal", "hoch", `Schon eingelesener Tag ${nochmal.datum} nicht als „gleich“ erkannt`, r.r);
    log(`  Import: ${tage.map((t) => t.datum).join(", ")}${nochmal ? " (+ " + nochmal.datum + " erneut)" : ""} → neu ${r.r.neu}, gleich ${r.r.gleich}, ersetzt ${r.r.ersetzt}`);
    importPuffer.length = 0;
  }
  // Hand-Tag: Umsatz auf dem Z-Bon (mit Menü zum Aktionspreis) ≠ Menge × Kartenpreis → Tagesnotiz ist der Z-Bon-Wert
  if (hand && kassenTag.get(D).summeKasse) { kassenTag.get(D).summe = kassenTag.get(D).summeKasse; }

  // 23:10 Tag abschließen
  uhr(D, 23, 10); const ab = ZA.tagAbschliessen(s, { datum: D, geraet: w.geraet }); scan(ab, "tagAbschliessen");

  // Inventur 1 am ersten Abend nach Ladenschluss
  if (i === 0) {
    uhr(D, 23, 20); inv1 = IV.inventurStarten(s, { jetzt: new Date().toISOString() });
    for (const zl of IV.artikelFuerInventur(s, inv1).liste) { const a = A(zl.name); const inh = a?.packung?.menge > 0 ? inBasis(a.packung.menge, a.packung.einheit) : null;
      if (!inh) { befund("inventur-ohne-gebinde:" + zl.name, "niedrig", `Inventur 1: ${zl.name} ohne Packungsinhalt – nicht gezählt`); continue; }
      IV.mengeSetzen(inv1, zl.name, Math.round(Math.max(0, wahr[zl.name] || 0) / inh * 4) / 4); }
    uhr(D, 23, 50); IV.inventurAbschliessen(s, inv1, { jetzt: new Date().toISOString() }); letzteInventur = inv1.id;
    // Wahrheit auf die gezählte Menge setzen (Viertel-Rundung ist die Zählung)
    for (const [n, m] of Object.entries(inv1.posten)) if (m !== null && inv1.inhalte[n]) wahr[n] = m * inv1.inhalte[n];
    scan(IV.inventurListe(s, inv1), "inventurListe");
  }
  uhr(D, 23, 30);
  const p = pruefen(D, { nachInventur: i === 0 ? inv1 : null });
  if (!LEISE) log(`  Zähler ${r2(p.z.stand)} € (Stufe ${p.z.stufe}), Umsatz ${kassenTag.get(D).summe} €, Vorschlag ${p.bv.zeilen.length} Zeilen${p.bu ? " · Büro: " + p.bu.text : ""}${p.hu ? " · " + p.hu.text : ""}`);

  // Inventur 2 nach Mitternacht (Kalendertag + 1, 01:15) – zählt zum Geschäftstag D
  if (D === inv2Tag) {
    const K1 = E.tagPlus(D, 1); uhr(K1, 1, 15);
    if (heuteGeschaeft() !== D) befund("geschaeftstag", "hoch", `Geschäftstag um 01:15 ist ${heuteGeschaeft()} statt ${D}`);
    inv2 = IV.inventurStarten(s, { jetzt: new Date().toISOString() });
    for (const zl of IV.artikelFuerInventur(s, inv2).liste) { const a = A(zl.name); const inh = a?.packung?.menge > 0 ? inBasis(a.packung.menge, a.packung.einheit) : null; if (!inh) continue;
      IV.mengeSetzen(inv2, zl.name, Math.round(Math.max(0, wahr[zl.name] || 0) / inh * 4) / 4); }
    uhr(K1, 1, 40); IV.inventurAbschliessen(s, inv2, { jetzt: new Date().toISOString() }); letzteInventur = inv2.id;
    if (inv2.datum !== D) befund("inventur2-datum", "hoch", `Inventur nach Mitternacht trägt Datum ${inv2.datum} statt ${D}`);
    { const ag0 = VK.abgleichInventur(s); const ehr = VK.verkaufAuswertung(s).ehrlich; const offenTage = importPuffer.map((t) => t.datum);
      if (offenTage.length && ag0.schwund.anzahl) befund("schwund-trotz-luecke", "niedrig", `Inventur ${inv2.datum}: ${ag0.schwund.anzahl} Waren als Schwund-Verdacht (${r2(ag0.schwund.wert)} €), obwohl Verkäufe von ${offenTage.join(", ")} noch fehlen; Hinweis „Tage ohne Verkauf“: ${ehr.tageOhneVerkauf.length}`, ag0.zeilen.filter((x) => x.status === "schwund").slice(0, 4).map((x) => [x.name, r2(x.diff)]));
      if (importPuffer.length) { await importieren([...importPuffer]); importPuffer.length = 0; } }
    const v = IV.inventurVergleich(s, inv2); scan(v, "inventurVergleich");
    const ag = VK.abgleichInventur(s); scan(ag, "abgleichInventur");
    const cola = ag.zeilen.find((x) => x.name === "Cola 0,33 l");
    log(`  Inventur 2 (${inv2.datum}): Verbrauch ${r2(v.verbrauch)} €, echte Quote ${r2(v.echteQuote * 100)} %, Schwund-Verdacht ${ag.schwund.anzahl}: ${ag.zeilen.filter((x) => x.status === "schwund").map((x) => x.name + " " + r2(x.diff)).join(", ")}`);
    // FIX (1): mit richtig gezähltem Menü fehlen nur noch die 6 echten Cola – Verdacht genau dann, wenn 6 Stück über der Toleranz liegen
    if (!cola || (6 > cola.toleranz) !== (cola.status === "schwund")) befund("schwund-cola", "mittel", `Fehlende Cola (6 Stück + Kombi) nicht als Schwund-Verdacht erkannt`, cola && { status: cola.status, diff: cola.diff, toleranz: cola.toleranz });
    if (!(v.echteQuote > 0 && v.echteQuote < 1)) befund("inventur-quote", "hoch", `Echte Quote ${v.echteQuote}`);
    // morgen früh prüfen: Bestand = gezählte Menge
    for (const [n, m] of Object.entries(inv2.posten)) if (m !== null && inv2.inhalte[n]) wahr[n] = m * inv2.inhalte[n];
    TAG = K1; uhr(K1, 8, 0); pruefen(K1, { nachInventur: inv2 }); TAG = D;
  }

  // Zweites Gerät: am Morgen von geraetBAb bekommt B eine Sicherung von A (Neu-Installation, Zusammenführen in leeres Handy)
  if (D === E.tagPlus(geraetBAb, -1)) {
    uhr(D, 23, 55); const { blob } = await st.exportDatei(w);
    attB = idbAttrappe(); { const reqB = globalThis.IDBRequest; globalThis.IDBRequest = class { static [Symbol.hasInstance](x) { return x instanceof reqA || x instanceof reqB; } }; } // zwei Attrappen nebeneinander (nur Testgerüst)
    stB = await import(R + "store.js?geraetB"); await stB.laden();
    wB = stB.leereWurzel(); wB.geraet = "geraet-B";
    const imp = await stB.importSicherung(blob); stB.zusammenfuehren(wB, imp.wurzel); sB = wB.betriebe[0]; wB.aktiv = sB.id;
    if (wB.bueroPin) befund("pin-in-sicherung", "hoch", "Büro-Code kommt über die Sicherung auf das zweite Handy");
    await stB.sofortSpeichern(wB);
    globalThis.indexedDB = idbA;
  }
  // Zusammenführen am Abend von geraetBBis: B → A und A → B
  if (D === geraetBBis && sB) {
    uhr(D, 23, 58);
    const vorA = { muell: E.schwundAuswertung(s, { von: START, bis: D }), umsatz: E.umsatzZeitraum(s, { von: START, bis: D }).summe, vk: VK.verkaufJeGericht(s, { von: START, bis: D }).menge, mess: s.messungen.length };
    const vorB = { muell: E.schwundAuswertung(sB, { von: geraetBAb, bis: D }), mess: sB.messungen.filter((m) => m.geraet === wB.geraet).length };
    const eigeneB = sB.schwund.filter((e) => e.datum >= geraetBAb && !s.schwund.some((x) => x.id === e.id));
    { const stabil = (x) => Array.isArray(x) ? "[" + x.map(stabil).join(",") + "]" : x && typeof x === "object" ? "{" + Object.keys(x).filter((k) => x[k] !== undefined && !["storniert", "storniertZeit", "importiert", "konfliktMit", "quelleVorher"].includes(k)).sort().map((k) => JSON.stringify(k) + ":" + stabil(x[k])).join(",") + "}" : JSON.stringify(x ?? null);
      for (const j of ["messungen", "rundgaenge", "putzlog", "belehrungen", "abschluesse"]) { const mA = new Map((s[j] || []).map((e) => [e.id, e])); let n = 0; const felder = new Set();
        const kern = (x, st0, b0) => (j === "rundgaenge" && st0.rundeDoppelt(x, b0) ? { ...x, messungen: [] } : x); // FIX (2): wie die App vergleichen
        for (const e0 of sB[j] || []) { const a0 = mA.get(e0.id); const a = a0 && kern(a0, st, s), e = kern(e0, stB, sB); if (a && stabil(a) !== stabil(e)) { n += 1; for (const k of new Set([...Object.keys(a), ...Object.keys(e)])) if (stabil(a[k]) !== stabil(e[k])) felder.add(k); } }
        if (n) befund("merge-konflikt:" + j, "hoch", `${n} ${j} mit gleicher Kennung, aber anderem Inhalt auf A und B (nur durch Sicherung übertragen) – Felder: ${[...felder].join(", ")}`); } }
    globalThis.indexedDB = attB ? globalThis.indexedDB : idbA;
    const { blob: bB } = await stB.exportDatei(wB); const iB = await st.importSicherung(bB); const rA = st.zusammenfuehren(w, iB.wurzel);
    const sNeu = w.betriebe.find((b) => b.id === s.id);
    globalThis.indexedDB = idbA; const { blob: bA } = await st.exportDatei(w); const iA = await stB.importSicherung(bA); stB.zusammenfuehren(wB, iA.wurzel); const sBNeu = wB.betriebe[0];
    const nachA = { muell: E.schwundAuswertung(sNeu, { von: START, bis: D }), umsatz: E.umsatzZeitraum(sNeu, { von: START, bis: D }).summe, vk: VK.verkaufJeGericht(sNeu, { von: START, bis: D }).menge, mess: sNeu.messungen.length };
    const erwMuell = vorA.muell.muellwert + eigeneB.filter((e) => e.vorgang === 1 || e.art === "gericht").reduce((a, e) => a + (E.eintragWert(e, sB) || 0), 0);
    if (Math.abs(nachA.umsatz - vorA.umsatz) > 0.01) befund("merge-umsatz", "hoch", `Umsatz nach Zusammenführen ${nachA.umsatz} statt ${vorA.umsatz}`);
    if (Math.abs(nachA.vk - vorA.vk) > 1e-6) befund("merge-verkauf", "hoch", `Verkaufte Menge nach Zusammenführen ${nachA.vk} statt ${vorA.vk}`);
    if (Math.abs(nachA.muell.muellwert - erwMuell) > 0.05) befund("merge-muell", "hoch", `Müllwert nach Zusammenführen ${r2(nachA.muell.muellwert)} statt ${r2(erwMuell)}`);
    if (nachA.mess !== vorA.mess + vorB.mess) befund("merge-messungen", "hoch", `Messungen nach Zusammenführen ${nachA.mess} statt ${vorA.mess + vorB.mess}`);
    // beide Handys gleich?
    for (const j of ["schwund", "tagesnotizen", "messungen", "lieferungen", "verkaeufe", "rundgaenge", "inventuren"]) {
      const a = new Set(sNeu[j].filter((x) => !x.storniert).map((x) => x.id)), b = new Set(sBNeu[j].filter((x) => !x.storniert).map((x) => x.id));
      if (a.size !== b.size || [...a].some((x) => !b.has(x))) befund("merge-ungleich:" + j, "hoch", `Nach beidseitigem Zusammenführen unterschiedlich: ${j} (A ${a.size}, B ${b.size})`);
    }
    const zA = ZA.zaehler(sNeu, { datum: D }), zB = ZA.zaehler(sBNeu, { datum: D });
    if (Math.abs(zA.stand - zB.stand) > 0.01) befund("merge-zaehler", "hoch", `Zähler A ${r2(zA.stand)} ≠ B ${r2(zB.stand)}`);
    if (sNeu.lager?.tage !== 6) befund("merge-lager", "mittel", `Lager-Einstellung von B (6 Tage) nicht übernommen: ${JSON.stringify(sNeu.lager)}`, { stammZeitA: s.stammZeit, stammZeitB: sB.stammZeit });
    if (sNeu.gerichte.find((g) => g.id === G("Sucuk-Sandwich").id).preis !== 6.9) befund("merge-preis", "hoch", `Preisänderung auf A (Sucuk 6,90) beim Zusammenführen verloren`);
    if (sBNeu.gerichte.find((g) => g.id === G("Sucuk-Sandwich").id).preis !== 6.9) befund("merge-preis-b", "mittel", `Preisänderung von A kommt auf B nicht an`, { beide: rA.bericht });
    const bA2 = BS.bestandStand(sNeu, { heuteTag: D }), bB2 = BS.bestandStand(sBNeu, { heuteTag: D });
    for (const x of bA2.waren) { const y = bB2.waren.find((q) => q.name === x.name); if (!y || Math.abs((x.bestand ?? 0) - (y.bestand ?? 0)) > 1e-6) { befund("merge-bestand", "hoch", `Bestand ${x.name} A ${x.bestand} ≠ B ${y?.bestand}`); break; } }
    log(`  Zusammengeführt: Bericht ${JSON.stringify(rA.bericht)}; Lager A ${JSON.stringify(sNeu.lager)}; Müll ${r2(vorA.muell.muellwert)} → ${r2(nachA.muell.muellwert)}`);
    // A arbeitet mit dem zusammengeführten Stand weiter
    Object.keys(s).forEach((k) => delete s[k]); Object.assign(s, sNeu); w.betriebe[w.betriebe.indexOf(sNeu)] = s;
    globalThis.indexedDB = idbA;
  }
  await st.sofortSpeichern(w);
}

// ---------- 9. Ende: Speichern rund, Sicherung rund, Rettung ----------
const ENDE = TAGE[TAGE.length - 1]; TAG = "Ende"; uhr(E.tagPlus(ENDE, 1), 10, 0);
const kennzahlen = (stand, D) => { const z = ZA.zaehler(stand, { datum: D }); const bs = BS.bestandStand(stand, { heuteTag: D });
  return { stand: r2(z.stand), umsatz: r2(z.umsatzBrutto), stufe: z.stufe, ware: r2(z.ware), bestand: bs.waren.map((x) => [x.name, r2(x.bestand ?? -1)]).sort(), schwund: s.schwund.length,
    vk: VK.verkaufJeGericht(stand, { von: START, bis: D }).menge, mess: stand.messungen.length, inv: IV.inventurenFertig(stand).length, lief: stand.lieferungen.length }; };
const vor = JSON.stringify(kennzahlen(s, ENDE));
if (ARG.debug) for (const [n, d] of attA.dbs) { const k = d.stores.get("stand")?.daten; console.log("DB", n, k && [...k.keys()], k && JSON.stringify(k.get("kopf"))?.slice(0, 200)); }
globalThis.indexedDB = idbA;
const geladen = await st.laden(); const nachLaden = JSON.stringify(kennzahlen(geladen.betriebe[0], ENDE));
if (vor !== nachLaden) befund("speichern-rund", "hoch", "Nach Speichern/Laden andere Zahlen", { vor: vor.slice(0, 300), nach: nachLaden.slice(0, 300) });
const { blob } = await st.exportDatei(w, { passwort: "geheim123" });
const imp = await st.importSicherung(blob, { passwort: "geheim123" });
const nachSicherung = JSON.stringify(kennzahlen(imp.wurzel.betriebe[0], ENDE));
if (vor !== nachSicherung) befund("sicherung-rund", "hoch", "Sicherung (verschlüsselt) eingelesen: andere Zahlen", { vor: vor.slice(0, 300), nach: nachSicherung.slice(0, 300) });
if (imp.wurzel.bueroPin || imp.wurzel.rettungPin) befund("sicherung-code", "hoch", "Büro-/Rettungscode steckt in der Sicherung");
// eigene Sicherung in dasselbe Handy zusammenführen: nichts darf sich ändern
const kopie = structuredClone(w); st.zusammenfuehren(kopie, structuredClone(imp.wurzel));
if (JSON.stringify(kennzahlen(kopie.betriebe[0], ENDE)) !== vor) befund("sicherung-selbst", "hoch", "Eigene Sicherung zusammengeführt ändert Zahlen");
// Fehlerseite: Sicherung ersetzt alles, Codes bleiben
const ersetzt = RT.wurzelErsetzen(w, imp.wurzel);
if (ersetzt.bueroPin !== w.bueroPin || ersetzt.rettungPin !== w.rettungPin) befund("ersetzen-code", "hoch", "Codes nach Ersetzen weg");
if (!(await MO.pinPruefen(ersetzt, "4711"))) befund("ersetzen-pin", "hoch", "Büro-Code nach Ersetzen ungültig");
{ const rv = await RT.rettungVersuch(ersetzt, w._code); if (!rv.ok) befund("ersetzen-rettung", "hoch", "Rettungscode nach Ersetzen ungültig"); }
// Rettung: falscher Code 5× → Sperre
{ const t = structuredClone(ersetzt); let gesp = null; for (let k = 0; k < 6; k++) { const r = await RT.rettungVersuch(t, "ZZZZ-ZZZZ-ZZZZ", { jetzt: Date.now() }); if (r.gesperrt) { gesp = k; break; } }
  if (gesp === null) befund("rettung-sperre", "mittel", "Nach 6 falschen Rettungscodes keine Sperre"); }
// Ordner fürs Amt und Steuer: Vormonat September
{ const zr = OT.amtZeitraumVon({ art: "monat" }, "2026-09-30"); try { const o = EA.ordnerAmt(s, zr, { datum: ENDE }); scan(o, "ordnerAmt"); scan(OT.amtDokument(s, o), "amtDokument"); } catch (e) { befund("ordner-amt-fehler", "hoch", e.message); }
  try { const p = ES.monatsPaket(s, OT.paketZeitVon({}, "steuer", ENDE), "steuer"); scan(p, "monatsPaket"); scan(OT.paketDokument(s, p), "paketDokument");
    const csv = OT.csvDateien(s, "ordner-steuer", "umsatz", { paketMonat: {} }); for (const f of csv || []) if (/NaN|undefined/.test(f.text)) befund("csv-nan:" + f.name, "hoch", `CSV ${f.name} enthält NaN/undefined`); } catch (e) { befund("ordner-steuer-fehler", "hoch", e.message + " " + e.stack?.split("\n")[1]); } }
if (ARG.stand) { const { blob: b2 } = await st.exportDatei(w); fs.writeFileSync(ARG.stand, Buffer.from(await b2.arrayBuffer())); log(`\nSicherung für Weg B: ${ARG.stand}`); }

// ---------- Verlauf des Zählers ----------
if (!LEISE || ARG.verlauf) { console.log("\nVerlauf (Tag, Stufe, Stand, Ware lt. App, quoteEff, Prognose Monatsende, Null-Tag, Zielkarte):");
  for (const v of VERLAUF) console.log(`  ${v.D} S${v.stufe} ${v.stand} | Ware ${v.ware} | q ${v.quoteEff} | Ende ${v.monatsende} | null ${v.nullTag} | ${v.ziel} ${v.tempo ? JSON.stringify(v.tempo) : ""}`);
  console.log("Wareneinsatz echt je Monat:", Object.fromEntries(Object.entries(WARE_WAHR).map(([k, v]) => [k, r2(v)]))); }
// ---------- Zusammenfassung ----------
const jeId = new Map(); for (const b of befunde) { const x = jeId.get(b.id) || { ...b, n: 0, tage: new Set() }; x.n += 1; x.tage.add(b.tag); jeId.set(b.id, x); }
console.log(`\n==== Zusammenfassung: ${jeId.size} verschiedene Befunde (${befunde.length} Treffer), Fehlmengen ${stockouts}`);
for (const sch of ["hoch", "mittel", "niedrig"]) for (const x of [...jeId.values()].filter((y) => y.schwere === sch))
  console.log(`[${sch}] ${x.id} – erstmals ${x.tag}, ${x.n}× (${[...x.tage].slice(0, 6).join(", ")}${x.tage.size > 6 ? " …" : ""}): ${x.text}${x.daten ? " · " + JSON.stringify(x.daten).slice(0, 300) : ""}`);
if (ARG.json) fs.writeFileSync(ARG.json, JSON.stringify([...jeId.values()].map((x) => ({ ...x, tage: [...x.tage] })), null, 1));

process.exitCode = (jeId.size || stockouts) ? 1 : 0;
