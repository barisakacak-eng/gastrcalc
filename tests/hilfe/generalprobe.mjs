// Generalprobe P5 (30.10.2026): 14 Geschäftstage, zwei Läden auf EINEM Handy (eine Wurzel), Weihnachten bis Neujahr 2026/27.
// Vorbild: tests/hilfe/sim30.mjs (feste Uhr, fester Zufall, IndexedDB-Attrappe, Befund-Mechanik). Nur Rechenwerk (js/*.js) + Speicherung (js/store.js), keine Bildschirme.
// Aufruf:  TZ=Europe/Berlin node tests/hilfe/generalprobe.mjs [--leise] [--json=pfad]      Exit 1 bei Befunden.
// Befund-Klassen: A = falsche Zahl / Datenverlust · B = Ablauf kaputt · C = Lücke · D = Schönheit.
// Setzungen 30.10.2026 (alle im Kommentar „Setzung 30.10.2026“ genannt):
//  - Zeitraum Tag 1 = 2026-12-19 (Sa) bis Tag 14 = 2027-01-01 (Fr); beide Läden an allen 14 Tagen offen (tageProWoche 7, keine Ruhetage, Feiertage zählen als Öffnungstage).
//  - Laden-Arten wie js/screens/onboarding.js:367-368 (doener: imbiss/doener; foodtruck: foodtruck/burger); Küche „grill“ kommt für A über stamm.kuecheUmschalten dazu.
//  - Küche „grill“ gibt es in der App nicht (js/data/kuechen.js:4-13; store.js:267 verwirft unbekannte Küchen beim Laden) → zweite Küche von A ist „pizza“, gesetzt über stamm.kuecheUmschalten.
//  - Wurzel-Vergleich (Tag 7, jeden Tag nach Speichern/Laden, Profil 2): nur namentlich genannte Unterschiede sind ausgenommen, s. wurzelVergleich(); alles andere ist ein Befund.
//  - Sprache: global „tr“ (Laden A) von Anfang an; Laden B und beide Läden werden für die Zahlen-Stichprobe in de/tr/en gerechnet (Zahlen sprachunabhängig).
//  - Mindestlohn/Minijob nur aus js/data/mindestlohn.js:9-10: 13,90 €/603 € bis 31.12.2026, 14,60 €/633 € ab 01.01.2027 (der Auftrag nannte 556 € für 2026 – im Code stehen 603 €).
//  - Minijob-Kraft in A arbeitet an 13 von 14 Tagen 3 Std (Dez 39 Std × 13,90 = 542,10 € ≤ 603 €; Jan 3 Std × 14,60 = 43,80 € ≤ 633 €).
//  - Laden B bekommt seine Karte am Tag 1 per Foto-Text, A am Tag 2 wie im Auftrag. B kauft nichts per Beleg (Stufe 2).
//  - Nacht-Tage (Tag 2, 8, 13): Umsatz um 01:30 und Müll um 03:40 des Folgetags, müssen beim Vortag stehen (Geschäftstag bis 4 Uhr, js/util.js:61-67).
//  - Tag 7 „Sicherung schicken–löschen–einlesen“ wie die App (app.js): exportDatei → allesLoeschen → neue leere Wurzel → importSicherung → zusammenfuehren. Das Gerät
//    bekommt dabei eine neue Kennung; die laufende Nummer beginnt je Gerät neu (store.js zusammenfuehren) – darum sind genau root.geraet und root.lfd ausgenommen.
//  - Preis von Hand (Tag 6): Pommes-Rohware „Pommes frites“ +10 % über karte_daten.artikelFeldSetzen (setzt preisQuelle „hand“, W2-K2).
//  - Kein Goldwert erfunden: 3,944 € und 0,018 € stammen aus tests/goldwert.test.mjs (Teil A bzw. B5).
process.env.TZ = "Europe/Berlin";
import fs from "node:fs";
const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const LEISE = !!ARG.leise;

// ---------- feste Uhr und fester Zufall ----------
const RealDate = Date; let JETZT = RealDate.parse("2026-12-19T06:00:00Z");
class FakeDate extends RealDate { constructor(...a) { if (a.length === 0) super(JETZT); else super(...a); } static now() { return JETZT; } }
globalThis.Date = FakeDate;
const uhr = (datum, h, m = 0) => { const [j, mo, d] = datum.split("-").map(Number); JETZT = new RealDate(j, mo - 1, d, h, m).getTime(); return new RealDate(JETZT).toISOString(); };
let saat = 20261230; Math.random = () => { saat |= 0; saat = (saat + 0x6D2B79F5) | 0; let t = Math.imul(saat ^ (saat >>> 15), 1 | saat); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const zufall = (() => { let s = 11; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })(); // eigener Strom für das Szenario

const R = new URL("../../js/", import.meta.url).href;
const { idbAttrappe } = await import(new URL("./idb_attrappe.mjs", import.meta.url).href);
const attA = idbAttrappe(); const idbA = globalThis.indexedDB; const reqA = globalThis.IDBRequest; // Profil 1
const i18n = await import(R + "i18n.js"); i18n.setzeSprache("tr");
const st = await import(R + "store.js");
const E = await import(R + "engine.js");
const stamm = await import(R + "stamm.js");
const KD = await import(R + "karte_daten.js");
const KL = await import(R + "karte_lesen.js");
const RB = await import(R + "rezept_baukasten.js");
const SE = await import(R + "selbst.js");
const RP = await import(R + "richtpreise.js");
const LF = await import(R + "lieferung.js");
const BL = await import(R + "beleg.js");
const MU = await import(R + "muell.js");
const PU = await import(R + "putzplan.js");
const ZA = await import(R + "zaehler.js");
const LZ = await import(R + "laden_zahlen.js");
const HB = await import(R + "hebel.js");
const PD = await import(R + "preisdrift.js");
const WA = await import(R + "ware.js");
const MW = await import(R + "mindestlohn.js");
const ES = await import(R + "export_steuer.js");
const EA = await import(R + "export_amt.js");
const OT = await import(R + "ordner_text.js");
const { MINDESTLOHN, mindestlohnAm } = await import(R + "data/mindestlohn.js");
const { kostenJeStunde, LOHN_AUFSCHLAG } = await import(R + "data/lohnkosten.js");
const { EINHEITEN, inBasis } = await import(R + "data/katalog.js");
const { heuteGeschaeft, heute } = await import(R + "util.js");

// ---------- Befunde ----------
const befunde = []; let TAG = "-"; const gesehen = new Set();
function befund(klasse, id, text, daten = null) {
  const erst = !gesehen.has(id); gesehen.add(id); befunde.push({ klasse, id, tag: TAG, text, daten });
  if (erst && !LEISE) console.log(`  [${klasse}] ${TAG} ${id}: ${text}${daten ? " · " + JSON.stringify(daten).slice(0, 500) : ""}`);
}
const log = (...a) => { if (!LEISE) console.log(...a); };
const r2 = (x) => Math.round(x * 100) / 100;
const nah = (a, b, eps = 0.001) => typeof a === "number" && typeof b === "number" && Math.abs(a - b) <= eps;
function scan(obj, wo, pfad = "", tiefe = 0, seen = new Set()) { // NaN/Infinity/„undefined“-Text in Ausgaben (wie sim30)
  if (tiefe > 9 || obj === null || obj === undefined) return;
  if (typeof obj === "number") { if (!Number.isFinite(obj)) befund("A", "nan:" + wo + pfad.replace(/\[\d+\]/g, "[]"), `${wo}${pfad} = ${obj}`); return; }
  if (typeof obj === "string") { if (/\b(NaN|undefined|Infinity|null)\b/.test(obj) && !/^[\w-]+$/.test(obj)) befund("D", "text:" + wo + pfad.replace(/\[\d+\]/g, "[]"), `${wo}${pfad} enthält „${obj.match(/\b(NaN|undefined|Infinity|null)\b/)[0]}“: ${obj.slice(0, 100)}`); return; }
  if (typeof obj !== "object" || seen.has(obj)) return; seen.add(obj);
  if (obj instanceof Map) { for (const [k, v] of obj) scan(v, wo, `${pfad}.${k}`, tiefe + 1, seen); return; }
  if (obj instanceof Set) return;
  for (const [k, v] of Object.entries(obj)) if (typeof v !== "function") scan(v, wo, Array.isArray(obj) ? `${pfad}[${k}]` : `${pfad}.${k}`, tiefe + 1, seen);
}
const kanon = (x) => JSON.stringify(x, (k, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((q) => [q, v[q]])) : v));
function diffPfade(a, b, pfad = "", out = []) { // alle Pfade, an denen zwei JSON-Werte verschieden sind
  if (kanon(a) === kanon(b)) return out;
  if (a && b && typeof a === "object" && typeof b === "object" && Array.isArray(a) === Array.isArray(b)) {
    if (Array.isArray(a) && a.length !== b.length) { out.push(`${pfad}.length ${a.length}→${b.length}`); return out; }
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diffPfade(a[k], b[k], `${pfad}.${k}`, out);
  } else out.push(`${pfad}: ${JSON.stringify(a)?.slice(0, 40)}→${JSON.stringify(b)?.slice(0, 40)}`);
  return out;
}

// ---------- Kalender ----------
const START = "2026-12-19"; // Samstag, Tag 1
const TAGE = []; for (let i = 0; i < 14; i++) TAGE.push(E.tagPlus(START, i));
const NACHT = new Set([TAGE[1], TAGE[7], TAGE[12]]); // Tag 2, 8, 13: Einträge um 01:30 / 03:40 des Folgetags
const gtErwartet = (d) => (d.getHours() < 4 ? heute(new RealDate(d.getFullYear(), d.getMonth(), d.getDate() - 1)) : heute(d)); // eigene Rechnung, nicht util.js
{ uhr("2026-12-20", 3, 59); if (heuteGeschaeft() !== "2026-12-19") befund("B", "gt-0359", "03:59 gehört noch zum Vortag", heuteGeschaeft());
  uhr("2026-12-20", 4, 0); if (heuteGeschaeft() !== "2026-12-20") befund("B", "gt-0400", "04:00 gehört zum neuen Tag", heuteGeschaeft());
  uhr("2027-01-01", 1, 30); if (heuteGeschaeft() !== "2026-12-31") befund("B", "gt-neujahr", "01:30 am 01.01.2027 gehört zum 31.12.2026", heuteGeschaeft()); }

// ---------- Wurzel und zwei Läden ----------
TAG = START; uhr(START, 8, 0);
let w = st.leereWurzel(); w.sprache = "tr";
const ART_DOENER = { id: "doener", format: "imbiss", kuechen: ["doener"] }, ART_TRUCK = { id: "foodtruck", format: "foodtruck", kuechen: ["burger"] }; // onboarding.js:367-368
function ladenBauen({ name, art, miete, strom = null, lohnkosten, personen, kuerzel, takt, stellen }) {
  const s = st.leererBetrieb(); s.phase = "app"; s.weg = "genau"; s.schritt = 5;
  stamm.ladenArtSetzen(s, art); stamm.betriebNameSetzen(s, name); s.betrieb.tageProWoche = 7; // Setzung: alle 7 Tage offen
  stamm.kostenSchnellSetzen(s, "miete", "miete", miete); stamm.kostenBasisSetzen(s, "miete", "miete", "netto");
  if (strom) stamm.kostenSchnellSetzen(s, "strom", "energie", strom);
  s.team = { personen, stundenProPerson: 100, lohnkosten, eigenerLohn: null, eigenerLohnStatus: "geschaetzt" }; // Zielgewinn bleibt Default (10 %)
  SE.selbstStandard(s);
  s.kostenKategorienGeprueft = ["miete", "energie"];
  const ks = stellen.map(([n, a, typ]) => stamm.kuehlstelleAnlegen(s, { name: n, art: a, typ })); stamm.kuehlEingerichtetSetzen(s); stamm.kuehlTaktSetzen(s, takt); E.ruhetageSetzen(s, [], START);
  const ps = kuerzel.map((k) => stamm.personAnlegen(s, k));
  return { s, ks, ps };
}
// Setzung 30.10.2026: „grill“ ist keine Küche der App (js/data/kuechen.js:4-13, „doener“ heißt dort „Döner und Grill“); store.js:267 verwirft unbekannte Küchen beim Laden.
// Darum kommt als zweite Küche „pizza“ dazu (Lahmacun/Pide) – derselbe Weg: stamm.kuecheUmschalten.
const KUECHE_2 = "pizza";
const baueA = ladenBauen({ name: "Döner-Grill (Probe)", art: ART_DOENER, miete: 1500, strom: 595, lohnkosten: 2400, personen: 2, kuerzel: ["BA", "MK"], takt: 2, stellen: [["Kühlschrank", "kuehl", "kuehlschrank"], ["Tiefkühler", "tk", "tiefkuehler"]] });
stamm.kuecheUmschalten(baueA.s, KUECHE_2);
const baueB = ladenBauen({ name: "Burger-Truck (Probe)", art: ART_TRUCK, miete: 900, lohnkosten: 1200, personen: 1, kuerzel: ["TK"], takt: 1, stellen: [["Kühlschrank", "kuehl", "kuehlschrank"], ["Saladette", "kuehl", "saladette"]] });
const sA = st.migrierenBetrieb(baueA.s), sB = st.migrierenBetrieb(baueB.s); const idA = sA.id, idB = sB.id;
w.betriebe.push(sA, sB); w.aktiv = idA;
const SH = { A: { id: idA, name: "A", sprache: "tr", ks: baueA.ks.map((k) => k.id), ps: baueA.ps.map((p) => p.id) }, B: { id: idB, name: "B", sprache: "en", ks: baueB.ks.map((k) => k.id), ps: baueB.ps.map((p) => p.id) } };
const shop = (X) => w.betriebe.find((b) => b.id === SH[X].id);
const umschalten = (X) => { w.aktiv = SH[X].id; if (w.aktiv !== SH[X].id || w.betriebe.find((b) => b.id === w.aktiv) !== shop(X)) befund("B", "umschalten", `Umschalten auf ${X} über die Wurzel schlägt fehl`); return shop(X); };
if (!(sA.betrieb.kuechen.includes("doener") && sA.betrieb.kuechen.includes(KUECHE_2))) befund("B", "kueche-zwei", `Zweite Küche ${KUECHE_2} kommt nicht zu doener dazu`, sA.betrieb.kuechen);
if (sA.ladenArt !== "doener" || sB.ladenArt !== "foodtruck") befund("B", "laden-art", "Laden-Art falsch", [sA.ladenArt, sB.ladenArt]);
const stromA = sA.kosten.find((k) => k.posten === "strom");
if (!nah(E.betragJeMonat(stromA, sA.betrieb), 500)) befund("A", "strom-netto", "Strom 595 € brutto (19 %) ≠ 500,00 € netto (Goldwert B4)", E.betragJeMonat(stromA, sA.betrieb));
if (!nah(E.fixkosten(sA).gesamt, 2000)) befund("A", "fixkosten-A", "Miete 1.500 + Strom 500 netto ≠ 2.000 € (Goldwert B4)", E.fixkosten(sA).gesamt);
await st.laden(); await st.sofortSpeichern(w);
const stR = await import(R + "store.js?leser"); // eigene Modul-Kopie nur zum Nachlesen aus Profil 1 (stört den Schreiber nicht)

// ---------- Speisekarten ----------
const TEXT_A = "Döner Kebab ⋯ 7,50\nDürüm Döner ⋯ 8,00\nLahmacun ⋯ 6,50\nAdana Grill Teller ⋯ 13,90\nPommes ⋯ 3,50\nAyran ⋯ 2,00";
const TEXT_B = "Cheeseburger ⋯ 8,50\nClassic Smash ⋯ 9,90\nFries ⋯ 3,50\nCola 0,33 l ⋯ 2,50";
function karteFoto(s, text, datum) { // wie screens/foto.js karteUebernehmen + Einkaufspreise (Richtpreise)
  const v = KL.vorschlaegeAusText(text, s); v.forEach((x) => { x.an = true; }); const r = KL.vorschlaegeUebernehmen(s, v);
  RB.fehlendeRezepteErgaenzen(s); KD.artikelAbgleichen(s); RP.richtpreiseEinsetzen(s, { datum }); E.zwischenpreiseRechnen(s);
  if (r.neu !== v.length) befund("B", "foto-uebernehmen:" + s.betrieb.name, `Foto-Karte: ${r.neu} von ${v.length} Gerichten übernommen`, r);
  return r;
}
const G = (s, n) => s.gerichte.find((g) => g.name === n);
const Ar = (s, n) => s.artikel.find((a) => a.name === n);
const waren = (s, n) => E.kalkulation(s).zeilen.find((z) => z.name === n)?.waren ?? null;

// ---------- Beleg (wie sim30 belegBuchen, gekürzt) ----------
const LIEFER_A = { // [Kürzel, Inhaltstext, Inhalt (Basis), Basis, netto je Gebinde, Steuer] – Beispielpreise nahe an den Richtpreisen, keine Branchenwerte
  "Dönerspieß Kalb/Pute": ["KT", "15 kg", 15000, "g", 235.0, "A"], "Eisbergsalat": ["KI", "5 kg", 5000, "g", 14.1, "A"], "Tomaten": ["KI", "6 kg", 6000, "g", 12.6, "A"],
  "Zwiebeln": ["SA", "10 kg", 10000, "g", 6.43, "A"], "Dürüm-Wrap": ["KT", "100 Stk", 100, "stk", 52.9, "A"], "Pommes frites": ["KT", "4x2,5kg", 10000, "g", 25.4, "A"], "Dönertüte": ["KT", "1000 Stk", 1000, "stk", 14.9, "B"] };
const fmt = (x) => x.toFixed(2).replace(".", ",");
function belegBuchen(s, D, posten, nr, preise = {}) {
  const art = {}; let netto = 0, stA = 0, stB = 0; const zeilen = []; let n = 400000;
  for (const [name, anz] of posten) { const l = LIEFER_A[name]; const p = preise[name] ?? l[4]; const ges = r2(anz * p); netto += ges; if (l[5] === "A") stA += ges * 0.07; else stB += ges * 0.19; art[name] = p;
    zeilen.push(`${n++} ${name} ${l[0]} ${l[1]} ${anz} ${fmt(p)} ${fmt(ges)} ${l[5]}`); }
  const text = ["Großmarkt Rhein-Neckar (Probe)", `Rechnung Nr. ${nr}  Datum ${D.slice(8, 10)}.${D.slice(5, 7)}.${D.slice(0, 4)}`, "Art.-Nr. Bezeichnung Menge Einzelpreis Gesamt", ...zeilen,
    `Summe Netto ${fmt(r2(netto))}`, `MwSt A 7 % ${fmt(r2(stA))}`, `MwSt B 19 % ${fmt(r2(stB))}`, `Brutto ${fmt(r2(netto + stA + stB))}`].join("\n");
  const beleg = BL.belegZerlegen(text, { bekannt: s.artikel.filter((a) => a.herkunft !== "selbst").map((a) => a.name) });
  const vorb = LF.belegZeilenVorbereiten(s, beleg);
  const fertig = vorb.map((z, i) => { const nm = posten[i]?.[0]; const x = { ...z, bekannt: z.bekannt || z.vorschlag || null, frage: null };
    if (!nm) return x; if (x.bekannt !== nm) befund("C", "beleg-zuordnung:" + nm, `Belegzeile „${nm}“ wird „${x.bekannt || "–"}“ zugeordnet`);
    if (z.menge !== posten[i][1]) befund("A", "beleg-menge:" + nm, `Belegzeile ${nm}: Menge ${z.menge} statt ${posten[i][1]}`);
    const [, , soll, basis] = LIEFER_A[nm]; const jz = LF.journalZeile(x, "netto"); const ist = jz.inhaltMenge > 0 && EINHEITEN[jz.inhaltEinheit] ? inBasis(jz.inhaltMenge, jz.inhaltEinheit) : null;
    if (ist !== soll || EINHEITEN[jz.inhaltEinheit]?.basis !== basis) { befund("C", "beleg-inhalt:" + nm, `Belegzeile ${nm} („${LIEFER_A[nm][1]}“): Inhalt ${ist} ${EINHEITEN[jz.inhaltEinheit]?.basis} statt ${soll} ${basis}; Wirt korrigiert in der Beleg-Prüfung`);
      x.inhalt = basis === "stk" ? { anzahl: soll, groesse: null, einheit: "stk" } : { anzahl: 1, groesse: soll / 1000, einheit: basis === "g" ? "kg" : "l" }; }
    return x; });
  if (LF.lieferungDoppelt(s, beleg, D)) befund("B", "beleg-doppelt:" + nr, `Beleg ${nr} gilt zu Unrecht als doppelt`);
  const l = LF.lieferungAnlegen(s, beleg, { zeilen: fertig, datum: D, geraet: w.geraet });
  if (!nah(l.summeNetto ?? 0, r2(netto), 0.02)) befund("A", "beleg-summe:" + nr, `Beleg ${nr}: summeNetto ${l.summeNetto} statt ${r2(netto)}`);
  const aend = LF.preiseUebernehmen(s, l); E.zwischenpreiseRechnen(s); return { l, aend };
}

// ---------- Kühlung ----------
const rundgang = (s, D, h, m, von, werte) => { uhr(D, h, m); const r = E.rundgangStarten(s, { von, datum: heute() });
  for (const k of E.aktiveStellen(s)) { const v = werte[k.id]; if (v === undefined) continue; uhr(D, h, m + 1); const ab = E.abweichung(k, v); E.stationEintragen(r, k, { wert: v, massnahmen: ab ? ["tuer", "eingestellt"] : [], nachkontrolle: ab ? "h1" : null }); }
  uhr(D, h, m + 3); E.rundgangAbschliessen(s, r, () => st.naechsteLfd(w), w.geraet); return r; };
const werteNormal = (s, ids) => Object.fromEntries(E.aktiveStellen(s).map((k, i) => [k.id, k.art === "tk" ? r2(-20 + zufall() * 1.5) : r2(3.6 + zufall() * 1.6)]));

// ---------- Buchführung des Szenarios (unabhängig vom Rechenwerk) ----------
const L = { A: { umsatz: new Map(), muell: [], mess: 0, putz: 0, team: new Map(), abschl: 0 }, B: { umsatz: new Map(), muell: [], mess: 0, putz: 0, team: new Map(), abschl: 0 } };
const JOURNALE = st.JOURNALE; const letzteZahl = {}; // je Laden/Journal: Zähler darf nie sinken
const summeMonat = (X, H) => r2([...L[X].umsatz].filter(([d]) => d.slice(0, 7) === H.slice(0, 7) && d <= H).reduce((a, [, v]) => a + v, 0));
const umsatzBetrag = (X, i) => (X === "A" ? 900 + Math.round(zufall() * 700) : 500 + Math.round(zufall() * 400)) + (i % 2 ? 0.5 : 0); // A 900–1600, B 500–900

// ---------- Tageswerk eines Ladens ----------
function umsatzBuchen(X, D) {
  const s = shop(X); const b = umsatzBetrag(X, TAGE.indexOf(D)); const soll = gtErwartet(new Date()); // Geschäftstag laut eigener Rechnung
  if (soll !== D) befund("B", "gt-umsatz", `Umsatz ${X}: erwarteter Geschäftstag ${soll} ≠ Szenario-Tag ${D}`);
  const e = LZ.umsatzHeuteSpeichern(s, b, { geraet: w.geraet });
  if (!e || e.datum !== D || e.umsatz !== b) befund("A", "umsatz-datum", `Umsatz ${X} um ${new Date().toTimeString().slice(0, 5)}: Eintrag ${e?.datum}/${e?.umsatz} statt ${D}/${b}`);
  L[X].umsatz.set(D, b);
}
function muellBuchen(X, D, i, anzahl) {
  const s = shop(X); const soll = gtErwartet(new Date()); const gs = s.gerichte.filter((g) => g.klasse !== "getraenk"); const ar = s.artikel.filter((a) => a.herkunft !== "selbst" && a.preis !== null && a.gruppe !== "getraenk");
  for (let k = 0; k < anzahl; k++) {
    if (!gs.length || !ar.length) { const e = MU.eimerEintragen(s, { kg: 1 + 0.5 * k, name: "Küche" }); L[X].muell.push({ datum: D, id: e.id }); if (e.datum !== D) befund("A", "muell-datum", `Müll ${X}: Eintrag ${e.datum}, erwartet ${D}`); continue; } // Tag 1 von A: noch keine Karte → Eimer
    const e = (k + i) % 2 === 0 ? MU.gerichtWeg(s, gs[(i + k) % gs.length], { anzahl: 1 + ((i + k) % 2) }) : MU.rohwareWeg(s, ar[(i * 3 + k) % ar.length], { menge: 300 + 100 * ((i + k) % 4), einheit: "g" });
    if (!e) { befund("B", "muell-null", `Müll-Eintrag ${X} ${D} nicht angelegt`); continue; }
    if (e.datum !== D || soll !== D) befund("A", "muell-datum", `Müll ${X}: Eintrag ${e.datum}, erwartet Geschäftstag ${D} (Uhr ${new Date().toTimeString().slice(0, 5)}, util sagt ${heuteGeschaeft()})`);
    L[X].muell.push({ datum: D, id: e.id });
  }
}
function putzen(X, D, i) {
  const s = shop(X); const K = heute(); if (PU.planSicherstellen(s, K) && !PU.planVon(s)?.aktiv) befund("B", "putzplan-start", "Putzplan nicht aktiv nach planSicherstellen");
  const faellig = PU.aufgabenStand(s, K).filter((a) => a.takt !== "nach" && (a.status === "faellig" || a.status === "ueberfaellig"));
  for (const a of faellig) { PU.abhaken(s, a.id, { datum: K, von: SH[X].ps[0] }); L[X].putz += 1; }
  const g = PU.planGruppen(s, K); if (g.offen !== 0) befund("B", "putzplan-offen", `Putzplan ${X} ${K}: nach dem Abhaken noch ${g.offen} offen`, { gesamt: g.gesamt, erledigt: g.erledigt });
  if (i === 0 && faellig.length === 0) befund("C", "putzplan-leer", `Putzplan ${X} hat am ersten Tag nichts Fälliges`);
}
function personal(X, D, i) {
  const s = shop(X); const sz = mindestlohnAm(D).satz; const ps = SH[X].ps; const e = [{ person: ps[0], name: "BA", stunden: X === "A" ? 8 : 6, satz: sz, art: "angestellt" }];
  if (X === "A" && i % 5 !== 4) e.push({ person: ps[1], name: "MK", stunden: 3, satz: sz, art: "minijob" });
  stamm.teamTagSetzen(s, D, e); L[X].team.set(D, e);
  const t = stamm.teamTag(s, D); if (!t || t.eintraege.length !== e.length) befund("A", "team-tag", `teamTagSetzen ${X} ${D}: ${t?.eintraege.length} statt ${e.length} Einträge`);
}
function kuehlRunden(X, D, i, ums) {
  const s = shop(X); const dev = (X === "A" && i === 5) || (X === "B" && i === 10); const ks = E.aktiveStellen(s);
  const w0 = werteNormal(s); if (dev) w0[ks[0].id] = 9.8;
  rundgang(s, D, 9, 30, SH[X].ps[0], w0); L[X].mess += ks.length;
  if (dev) { const nk = E.offeneNachkontrollen(s); if (nk.length !== 1) befund("B", "nachkontrolle-offen", `Offene Nachkontrollen ${nk.length} statt 1`);
    uhr(D, 10, 35); const r = E.rundgangStarten(s, { von: SH[X].ps[0], datum: heute(), einzel: ks[0].id }); E.stationEintragen(r, ks[0], { wert: 5.2 }); uhr(D, 10, 36); E.rundgangAbschliessen(s, r, () => st.naechsteLfd(w), w.geraet); L[X].mess += 1;
    if (E.offeneNachkontrollen(s).length) befund("B", "nachkontrolle-zu", "Nachkontrolle bleibt offen nach guter Messung"); }
  if (s.kuehl.takt === 2) { rundgang(s, D, 21, 30, SH[X].ps[1], werteNormal(s)); L[X].mess += ks.length; }
}

// ---------- Prüfungen je Laden und Tag ----------
function zahlenSatz(s, H, K) { // alle Zahlen, die geprüft und zwischen Profilen/Sprachen verglichen werden
  const z = ZA.zaehler(s, { datum: H });
  return { zaehler: z, heuteZiel: LZ.heuteZiel(s, z, H), kacheln: LZ.heuteKachelZahlen(s, E.kuehlStatus(s), H, K), bilanz: LZ.tagesBilanz(s, H, K), wq: ZA.wareneinsatzQuote(s, z),
    hebel: HB.hebelJeGericht(s), renner: HB.rennerPenner(s), drift: PD.preisDrift(s, { datum: H }), muellRang: WA.muellRangliste(s, H), muellWoche: MU.muellWoche(s, H), muellHeute: MU.muellHeute(s, H),
    mindest: MW.mindestlohnVorschau(s, H), mindestKarte: MW.mindestlohnKarteZeigen(s, H), steuerPaket: ES.monatsPaket(s, ES.jahrVon(H.slice(0, 4), H), "steuer"), buchPaket: ES.monatsPaket(s, ES.monatVon(H), "buch"),
    amt: EA.ordnerAmt(s, EA.zeitraumFuer("monat", { datum: H }), { datum: K }) };
}
const alsJson = (o) => JSON.parse(JSON.stringify(o)); // Funktionen fallen weg
const ledgerSumme = (X, von, bis) => r2([...L[X].umsatz].filter(([d]) => d >= von && d <= bis).reduce((a, [, v]) => a + v, 0));
function pruefenTag(X, H, K, i) {
  const s = shop(X); const wo = X + " " + H; const zs = zahlenSatz(s, H, K); scan(zs, wo); const z = zs.zaehler; const M = z.monat;
  if (!nah(z.umsatzBrutto, summeMonat(X, H), 0.005)) befund("A", "monat-umsatz", `${wo}: Zähler-Umsatz Monat ${r2(z.umsatzBrutto)} ≠ Σ Tagesumsätze (Geschäftstag) ${summeMonat(X, H)}`);
  const uz = E.umsatzZeitraum(s, { von: M.von, bis: H }); if (!nah(uz.summe, summeMonat(X, H), 0.005)) befund("A", "umsatz-zeitraum", `${wo}: umsatzZeitraum ${uz.summe} ≠ ${summeMonat(X, H)}`);
  if (Math.abs(z.umsatzNetto - z.ware - z.muell - z.kosten - z.stand - (z.schwund || 0) - (z.provision || 0)) > 0.01) befund("A", "zaehler-summe", `${wo}: Stand ${r2(z.stand)} ≠ Netto − Ware − Müll − Kosten`);
  let un = 0; for (let d = z.start; d <= H; d = E.tagPlus(d, 1)) { const e = E.umsatzEintrag(s, d); if (e) un += e.umsatz / (1 + z.steuer); }
  if (!nah(un, z.umsatzNetto, 0.01)) befund("A", "zaehler-umsatz-netto", `${wo}: Netto ${r2(z.umsatzNetto)} ≠ nachgerechnet ${r2(un)}`);
  // Lohn: jeder Tag hat einen Eintrag → Lohn echt = Σ Stunden × Satz × Aufschlag, nur Tage ab Beginn des Monats bis H
  let lohn = 0; for (let d = z.start; d <= H; d = E.tagPlus(d, 1)) for (const x of L[X].team.get(d) || []) lohn += x.stunden * kostenJeStunde(x.satz, x.art);
  if (!nah(z.lohn, lohn, 0.01)) befund("A", "lohn-summe", `${wo}: Zähler-Lohn ${r2(z.lohn)} ≠ Σ Stunden × Satz × Aufschlag ${r2(lohn)} (Monat ${M.von.slice(0, 7)})`);
  const mw = zs.muellWoche; const sw = E.schwundAuswertung(s, { von: M.von, bis: H });
  if (!(sw.muellwert >= 0) || !(mw.summe >= 0) || !(zs.muellHeute.wert >= 0)) befund("A", "muell-negativ", `${wo}: Müll-Euro negativ`, { monat: sw.muellwert, woche: mw.summe, heute: zs.muellHeute.wert });
  const erwM = L[X].muell.filter((e) => e.datum >= M.von && e.datum <= H).length; if (sw.anzahl !== erwM) befund("A", "muell-anzahl", `${wo}: Müll-Einträge im Monat ${sw.anzahl} ≠ Buch ${erwM}`);
  const erwH = L[X].muell.filter((e) => e.datum === H).length; if (zs.muellHeute.anzahl !== erwH) befund("A", "muell-heute", `${wo}: Müll heute ${zs.muellHeute.anzahl} ≠ Buch ${erwH}`);
  if (erwH < 2 || erwH > 4) befund("C", "muell-2-4", `${wo}: ${erwH} Müll-Einträge am Geschäftstag (Szenario verlangt 2–4)`);
  const tt = LZ.tagesBilanz(s, H, K); if (!nah(tt.nach, z.stand, 0.01)) befund("A", "bilanz-nach", `${wo}: Tagesbilanz nach ${tt.nach} ≠ Zähler ${z.stand}`);
  const messN = s.messungen.length; if (messN !== L[X].mess) befund("A", "messungen-buch", `${wo}: Messungen ${messN} ≠ Buch ${L[X].mess}`);
  if (s.putzlog.filter((e) => !e.storniert).length !== L[X].putz) befund("A", "putz-buch", `${wo}: Putz-Haken ${s.putzlog.length} ≠ Buch ${L[X].putz}`);
  if (s.abschluesse.filter((e) => !e.storniert && e.datum === H).length < 1) befund("B", "abschluss-fehlt", `${wo}: Tagesabschluss fehlt`);
  for (const j of JOURNALE) { const n = (s[j] || []).length, k = X + j; if (letzteZahl[k] !== undefined && n < letzteZahl[k]) befund("A", "journal-schrumpft:" + j, `${wo}: Journal ${j} ${letzteZahl[k]}→${n}`); letzteZahl[k] = n; }
  const lfds = [...w.betriebe.flatMap((b) => b.messungen.filter((m) => m.geraet === w.geraet))].map((m) => m.lfd).sort((a, b) => a - b);
  if (new Set(lfds).size !== lfds.length || lfds.some((v, q) => q && v !== lfds[q - 1] + 1)) befund("A", "lfd-luecke", `${wo}: laufende Nummern (Gerät ${w.geraet}) nicht lückenlos/eindeutig`, lfds.slice(0, 12));
  const e4 = ES.monatsPaket(s, ES.monatVon(H), "buch").umsatz; if (H === M.bis && !nah(e4.summe.brutto, summeMonat(X, H), 0.005)) befund("A", "paket-umsatz", `${wo}: Buchhalter-Paket Umsatz ${e4.summe.brutto} ≠ ${summeMonat(X, H)}`);
  return zs;
}
// Vergleich zweier Wurzeln (ein Handy vorher/nachher): Normalisierung nur für drei NAMENTLICH genannte Unterschiede, alles andere ist ein Befund.
//  (1) tagesnotizen[].sitzung: Kennung des App-Starts (util.js:4 SITZUNG), wird nicht gespeichert – nur im Speicher.
//  (2) rundgaenge[].messungen bei abgeschlossenen Rundgängen: Kopie der Messungen wird beim Speichern geleert, wenn sie im Journal „messungen“ steht (store.js rundeDoppelt) – nur wenn das stimmt.
//  (3) Felder, die migrierenBetrieb erst beim Laden ergänzt (artikel[].gebinde, artikel[].getraenk, gerichte[].getraenk): Klasse D „Normalisierung“, kein Verlust.
//  Beim Einlesen (Tag 7) zusätzlich ausgenommen: root.geraet, root.lfd (s. Setzung oben), betriebe[].geaendert (Zeitstempel des Speicherns) und betriebe[].abgleich
//  (Merge-Grundlage mit Prüfsummen je Bereich, die store.js abgleichGrundlage() für neu eingelesene Läden anlegt – kein Nutzerdatum).
const NORMAL_D = [/\.artikel\.\d+\.gebinde: undefined→/, /\.artikel\.\d+\.getraenk: undefined→/, /\.gerichte\.\d+\.getraenk: undefined→/];
function wurzelVergleich(vor, nach, { wurzelAusnahmen = [] } = {}) {
  const norm = (r) => { const c = alsJson(r); for (const b of c.betriebe || []) { for (const n of b.tagesnotizen || []) delete n.sitzung; b.rundgaenge = (b.rundgaenge || []).map((x) => (st.rundeDoppelt(x, b) ? { ...x, messungen: [] } : x)); } return c; };
  const alle = diffPfade(norm(vor), norm(nach)).filter((p) => !wurzelAusnahmen.some((re) => re.test(p)));
  return { echt: alle.filter((p) => !NORMAL_D.some((re) => re.test(p))), normalisiert: alle.filter((p) => NORMAL_D.some((re) => re.test(p))) };
}
async function speicherRund(H) { // eigene Modul-Kopie liest Profil 1 frisch aus der Datenbank
  await st.sofortSpeichern(w); globalThis.indexedDB = idbA; const geladen = await stR.laden();
  const v = wurzelVergleich(w, geladen);
  if (v.echt.length) befund("A", "speichern-rund", `Wurzel nach Speichern/Laden verschieden (${H}): ${v.echt.length} Pfade`, v.echt.slice(0, 6));
  if (v.normalisiert.length) befund("D", "laden-normalisiert", `Beim Laden werden Felder ergänzt, die vorher fehlten (${[...new Set(v.normalisiert.map((p) => p.replace(/\.\d+\./g, ".#.").split(":")[0]))].join(", ")}) – Wurzel nicht byte-gleich`, { anzahl: v.normalisiert.length, beispiel: v.normalisiert[0] });
  else if (JSON.stringify(w) !== JSON.stringify(geladen) && !v.echt.length && false) befund("D", "reihenfolge", "nur Reihenfolge");
}

// ---------- Der Ablauf ----------
let wB = null, stB = null, attB = null; const vorDez = {};
const zahlenKern = (s, H, K) => { const z = ZA.zaehler(s, { datum: H }); const hz = LZ.heuteZiel(s, z, H); return { stand: z.stand, umsatz: z.umsatzBrutto, kosten: z.kosten, ware: z.ware, muell: z.muell, lohn: z.lohn, zahl: hz.zahl, stufe: hz.stufe, nullpunkt: hz.m.nullpunkt, ziel: hz.m.ziel, m: hz.m.umsatz, anz: LZ.heuteKachelZahlen(s, E.kuehlStatus(s), H, K).muell }; };
function sprachProbe(H, K) { // Zahlen sind sprachunabhängig: de/tr/en liefern dasselbe
  for (const X of ["A", "B"]) { const s = shop(X); const je = {};
    for (const c of ["de", "tr", "en"]) { i18n.setzeSprache(c); if (i18n.sprache() !== c) befund("C", "sprache-" + c, `Sprache ${c} nicht geladen`); je[c] = alsJson(zahlenKern(s, H, K)); }
    i18n.setzeSprache("tr");
    if (kanon(je.de) !== kanon(je.tr) || kanon(je.de) !== kanon(je.en)) befund("A", "sprache-zahlen:" + X, `${X} ${H}: Zahlen in de/tr/en verschieden`, diffPfade(je.de, je.tr).concat(diffPfade(je.de, je.en)).slice(0, 5)); }
  if (i18n.t("allgemein.stueck") === "allgemein.stueck" || !(kanon(i18n.tIn("tr", "allgemein.stueck")) !== kanon(i18n.tIn("de", "allgemein.stueck")))) befund("C", "sprache-tr-text", "tr-Text für allgemein.stueck fehlt oder gleich de");
}
for (const [i, D] of TAGE.entries()) {
  TAG = D; log(`\n== Tag ${i + 1} ${D}`);

  // Tag 2 (A): Speisekarte per Foto; Tag 1 (B): Karte per Foto-Text
  if (i === 0) { umschalten("B"); uhr(D, 9, 0); karteFoto(shop("B"), TEXT_B, D); }
  for (const X of ["A", "B"]) {
    uhr(D, 9, 20); umschalten(X); const s = shop(X);
    kuehlRunden(X, D, i, null);
    if (X === "A" && i === 1) { // Tag 2: Foto-Karte
      uhr(D, 10, 0); const r = karteFoto(s, TEXT_A, D); log(`  Foto-Karte A: ${JSON.stringify(r)}`);
      const dk = waren(s, "Döner Kebab"); log(`  Gold: Döner Kebab Ware ${dk.toFixed(6)} € (Soll 3,94415)`); if (!nah(dk, 3.94415, 0.001) || Math.round(dk * 1000) / 1000 !== 3.944) befund("A", "gold-schnellstart", "Wareneinsatz Döner Kebab nach Schnellstart Döner ≠ 3,944 € (Goldwert A, tests/goldwert.test.mjs)", dk);
      const klon = (preis) => { const c = structuredClone(s); const sp = Ar(c, "Dönerspieß Kalb/Pute"); sp.preis = preis; sp.packung = { menge: 10, einheit: "kg" }; sp.preisBasis = "netto"; sp.status = "bekannt"; delete sp.richtpreis; return c; };
      const c0 = klon(85), c1 = klon(85.85); const d1 = waren(c1, "Döner Kebab") - waren(c0, "Döner Kebab"), d2 = waren(c1, "Dürüm Döner") - waren(c0, "Dürüm Döner");
      if (!nah(d1, 0.018, 0.001) || !nah(waren(c1, "Pommes"), waren(c0, "Pommes"), 1e-9)) befund("A", "gold-b5", "1 % Drift beim Dönerspieß (85 € je 10 kg) ≠ +0,018 € beim Döner (Goldwert B5)", { doener: d1, pommesGleich: waren(c1, "Pommes") === waren(c0, "Pommes") });
      log(`  Gold B5: +1 % Spieß → Döner +${d1.toFixed(6)} €, Dürüm +${d2.toFixed(6)} € (Soll 0,018)`);
      if (!nah(d2, 0.018, 0.001)) befund("A", "gold-b5-dueruem", "1 % Drift Spieß beim Dürüm (180 g wie Döner) ≠ +0,018 €", d2);
    }
    if (X === "A" && i === 2) { // Tag 3: Nebenzutat im Dürüm +20 g
      const g = G(s, "Dürüm Döner"); const idx = g.zutaten.findIndex((x) => x.name === "Eisbergsalat"); const z0 = g.zutaten[idx]; const dB = waren(s, "Dürüm Döner"), kB = waren(s, "Döner Kebab").toFixed(6);
      uhr(D, 10, 0); KD.zutatMengeSetzen(s, g.id, idx, z0.menge + 20, D); E.zwischenpreiseRechnen(s);
      const dA = waren(s, "Dürüm Döner"), kA = waren(s, "Döner Kebab").toFixed(6); const a = Ar(s, "Eisbergsalat"); const erw = E.preisJeBasis(a) * E.rohmengeFuer(20, E.garverlustAnteil(a).wert);
      log(`  Nebenzutat: Dürüm Ware ${dB.toFixed(6)} → ${dA.toFixed(6)} (erwartet +${erw.toFixed(6)}), Döner ${kB} → ${kA}`);
      if (!(dA > dB) || !nah(dA - dB, erw, 1e-6)) befund("A", "rezept-nebenzutat", `Dürüm: Ware ${dB.toFixed(6)}→${dA.toFixed(6)}, erwartet +${erw.toFixed(6)} für +20 g Eisbergsalat`);
      if (kB !== kA) befund("A", "rezept-doener-unveraendert", `Döner Kebab Ware ${kB} → ${kA}, muss gleich bleiben (nur Dürüm-Rezept geändert)`);
      if (G(s, "Döner Kebab").zutaten.find((x) => x.name === "Eisbergsalat").menge !== 50) befund("A", "rezept-doener-menge", "Döner-Rezept hat sich mitgeändert");
    }
    if (X === "A" && (i === 3 || i === 8)) { // Tag 4 und Tag 9: Lieferung mit Beleg
      uhr(D, 10, 30);
      const posten = i === 3 ? [["Dönerspieß Kalb/Pute", 3], ["Eisbergsalat", 2], ["Tomaten", 2], ["Zwiebeln", 1], ["Dürüm-Wrap", 2], ["Pommes frites", 2], ["Dönertüte", 1]] : [["Dönerspieß Kalb/Pute", 2], ["Tomaten", 1]];
      const preise = i === 8 ? { "Dönerspieß Kalb/Pute": r2(235 * 1.08) } : {}; const { l, aend } = belegBuchen(s, D, posten, "RN-" + D, preise);
      const sp = Ar(s, "Dönerspieß Kalb/Pute"); if (sp.preisQuelle !== "beleg") befund("B", "preisquelle-beleg", `Spieß-Preis nach Beleg: preisQuelle ${sp.preisQuelle}`);
      if (i === 3 && PD.preisDrift(s, { datum: D }).zutaten.length) befund("A", "drift-tag4", "Erster Beleg nach Richtpreis zeigt Drift", PD.preisDrift(s, { datum: D }).zutaten.map((x) => x.name));
      if (i === 8) { const d = PD.preisDrift(s, { datum: D }); const x = d.zutaten.find((y) => y.name === "Dönerspieß Kalb/Pute"); scan(d, "preisDrift"); log(`  Drift Tag 9: ${d.zutaten.map((y) => y.name + " " + (y.prozent * 100).toFixed(2) + " % (" + r2(y.euroMonat) + " €/Monat)").join("; ") || "–"}`);
        if (!x || !nah(x.prozent, 0.08, 0.0005) || !(x.euroMonat > 0)) befund("A", "drift-spiess", "preisDrift zeigt den um 8 % teureren Dönerspieß nicht (+8 %, Euro im Monat > 0)", x || d.zutaten.map((y) => y.name));
        if (d.zutaten.some((y) => y.name === "Pommes frites")) befund("A", "drift-hand", "preisDrift zeigt den von Hand geänderten Pommes-Preis als Drift (W2-K2)");
        const pa = LF.preisAenderungen(s, { datum: D }).find((p) => p.name === "Dönerspieß Kalb/Pute"); if (!pa || !nah(pa.prozent, 0.08, 0.0005)) befund("A", "preisaenderung-spiess", "preisAenderungen zeigt Spieß nicht als +8 %", pa); }
      log(`  Beleg ${D}: ${l.zeilen.length} Zeilen, Netto ${l.summeNetto}, Änderungen ${aend.length}`);
    }
    if (X === "A" && i === 5) { // Tag 6: Preis von Hand (Pommes-Rohware +10 %)
      uhr(D, 11, 0); const a = Ar(s, "Pommes frites"); const alt = a.preis; KD.artikelFeldSetzen(s, a.name, "preis", r2(alt * 1.1), D); E.zwischenpreiseRechnen(s);
      if (a.preisQuelle !== "hand" || !nah(a.preis, r2(alt * 1.1), 1e-9)) befund("A", "hand-preis", `Pommes: preisQuelle ${a.preisQuelle}, Preis ${a.preis} (alt ${alt})`);
      if (PD.preisDrift(s, { datum: D }).zutaten.some((y) => y.name === a.name)) befund("A", "drift-hand-sofort", "Handpreis +10 % erscheint sofort als Drift (W2-K2)");
      stamm.spiessSpeichern(s, { datum: D, rohKg: 15, preisKg: 15.67, restKg: 1.2, portionen: 70, lieferant: "Großmarkt (Probe)" }); // Welle-2-Daten sollen die Sicherung überleben
      stamm.portionMessungSpeichern(s, { datum: D, gericht: G(s, "Döner Kebab").id, zutat: "Dönerspieß Kalb/Pute", soll: 180, ist: 195, einheit: "g" });
    }
    if (X === "A" && i === 4) stamm.wochenZaehlungSpeichern(s, { datum: D, posten: { "Dönerspieß Kalb/Pute": 6.5, Tomaten: 3 }, jetzt: new Date().toISOString() });
    uhr(D, 15, 0); muellBuchen(X, D, i, NACHT.has(D) ? 1 : 2 + ((i + (X === "A" ? 0 : 1)) % 3));   // 2–4 Einträge am Geschäftstag; an Nacht-Tagen 1 am Nachmittag + 2 nach Mitternacht
    uhr(D, 16, 0); putzen(X, D, i);
    uhr(D, 22, 30); personal(X, D, i);
    if (!NACHT.has(D)) { uhr(D, 22, 45); umsatzBuchen(X, D); uhr(D, 23, 10); const ab = ZA.tagAbschliessen(s, { datum: D, geraet: w.geraet }); L[X].abschl += 1; scan(ab, "tagAbschliessen"); }
  }
  // Nacht-Tage: nach Mitternacht gehört alles noch zum Geschäftstag D (Umsatz 01:30, Müll 03:40, Abschluss 03:45)
  if (NACHT.has(D)) { const D1 = E.tagPlus(D, 1);
    for (const X of ["A", "B"]) { uhr(D1, 1, X === "A" ? 30 : 31); umschalten(X); umsatzBuchen(X, D); }
    for (const X of ["A", "B"]) { uhr(D1, 3, X === "A" ? 40 : 41); umschalten(X); muellBuchen(X, D, i + 7, 2); const ab = ZA.tagAbschliessen(shop(X), { datum: D, geraet: w.geraet }); L[X].abschl += 1; scan(ab, "tagAbschliessen"); } }
  // Prüfungen: Tag ist fertig (bei Nacht-Tagen um 03:50 des Folgetags, Geschäftstag bleibt D)
  const uhrPruef = NACHT.has(D) ? [E.tagPlus(D, 1), 3, 50] : [D, 23, 40]; uhr(...uhrPruef); const Kp = heute(); const zs = {};
  if (heuteGeschaeft() !== D) befund("B", "gt-pruef", `Prüfzeit ${new Date().toTimeString().slice(0, 5)}: Geschäftstag ${heuteGeschaeft()} statt ${D}`);
  for (const X of ["A", "B"]) { umschalten(X); zs[X] = pruefenTag(X, D, Kp, i); }
  if (i === 5) log(`  Zähler A ${r2(zs.A.zaehler.stand)} · B ${r2(zs.B.zaehler.stand)}`);
  await speicherRund(D);

  // Tag 7: Sicherung schicken – löschen – einlesen
  if (i === 6) {
    uhr(D, 23, 50); const vorher = alsJson(w); const zVor = { A: alsJson(zahlenSatz(shop("A"), D, D)), B: alsJson(zahlenSatz(shop("B"), D, D)) };
    const { blob } = await st.exportDatei(w); const geleert = await st.allesLoeschen(); if (!geleert) befund("B", "alles-loeschen", "allesLoeschen meldet false");
    if ((attA.speicher("gastrocalc", "teile")?.size || 0) !== 0) befund("A", "loeschen-rest", "Nach allesLoeschen liegen noch Teile in der Datenbank", attA.speicher("gastrocalc", "teile").size);
    const w2 = st.leereWurzel(); const imp = await st.importSicherung(blob); if (imp.pruefsumme !== "ok") befund("A", "sicherung-pruefsumme", `Prüfsumme der Sicherung: ${imp.pruefsumme}`);
    st.zusammenfuehren(w2, imp.wurzel); await st.sofortSpeichern(w2);
    const AUSNAHMEN = [[/^\.geraet:/, "neue Gerätekennung der frischen Wurzel (leereWurzel)"], [/^\.lfd:/, "laufende Nummer beginnt je Gerät neu (store.js zusammenfuehren)"], [/^\.betriebe\.\d+\.geaendert:/, "Zeitstempel des Speicherns"], [/^\.betriebe\.\d+\.abgleich:/, "Merge-Grundlage (abgleichGrundlage)"]];
    const vg = wurzelVergleich(vorher, w2, { wurzelAusnahmen: AUSNAHMEN.map(([re]) => re) }); const d = vg.echt;
    if (d.length) befund("A", "sicherung-wurzel", `Wurzel nach Schicken–Löschen–Einlesen ≠ vorher (ausgenommen nur root.geraet, root.lfd, betriebe[].geaendert, betriebe[].abgleich, sitzung, Rundgangs-Kopie, ergänzte Standardfelder): ${d.length} Pfade`, d.slice(0, 8));
    if (vg.normalisiert.length) befund("D", "laden-normalisiert", "Beim Einlesen werden Standardfelder ergänzt (gebinde, getraenk)", { anzahl: vg.normalisiert.length });
    w = w2; for (const X of ["A", "B"]) { const s = shop(X); const zN = alsJson(zahlenSatz(s, D, D)); const dz = diffPfade(zVor[X], zN).filter((p) => !/\.sitzung:/.test(p)); if (dz.length) befund("A", "sicherung-zahlen:" + X, `${X}: Zahlen nach dem Einlesen verschieden`, dz.slice(0, 6)); }
    if (shop("A").spiesse?.length !== 1 || shop("A").portionMessungen?.length !== 1 || shop("A").wochenZaehlungen?.length !== 1) befund("A", "sicherung-welle2", "Spieß-Bilanz/Portionsmessung/Wochenzählung nach dem Einlesen nicht mehr da", { spiesse: shop("A").spiesse?.length, portion: shop("A").portionMessungen?.length, woche: shop("A").wochenZaehlungen?.length });
    log(`  Sicherung: ${blob.size} Byte, ${d.length} Abweichungen, Prüfsumme ${imp.pruefsumme}`); }

  // Tag 10: Einlesen auf zweitem Browser-Profil (zweite Attrappe), alle Zahlen vergleichen
  if (i === 9) { uhr(D, 23, 55); const { blob } = await st.exportDatei(w); await profilZwei(blob, D, "Tag 10"); }
  if (i === 7) { sprachProbe(D, heute()); }
  if (i === 12) { for (const X of ["A", "B"]) vorDez[X] = alsJson(zahlenKern(shop(X), D, heute())); sprachProbe(D, heute()); }
}

// ---------- Profil 2 (zweites Browser-Profil) ----------
async function profilZwei(blob, H, wann) {
  attB = idbAttrappe(); const idbB = globalThis.indexedDB; const reqB = globalThis.IDBRequest; globalThis.IDBRequest = class { static [Symbol.hasInstance](x) { return x instanceof reqA || x instanceof reqB; } };
  stB = await import(R + "store.js?profilZwei" + wann.replace(/\W/g, "")); await stB.laden(); wB = stB.leereWurzel();
  const imp = await stB.importSicherung(blob); stB.zusammenfuehren(wB, imp.wurzel); await stB.sofortSpeichern(wB);
  const stB2 = await import(R + "store.js?profilZweiNeu" + wann.replace(/\W/g, "")); const geladen = await stB2.laden(); globalThis.indexedDB = idbA; // frisch aus Profil 2 gelesen
  const K = heute();
  for (const X of ["A", "B"]) { const s1 = shop(X); const s2 = geladen.betriebe.find((b) => b.id === SH[X].id); if (!s2) { befund("A", "profil2-laden:" + X, `${wann}: Laden ${X} fehlt in Profil 2`); continue; }
    const z1 = zahlenSatz(s1, E.tagPlus(H, 0), K), z2 = zahlenSatz(s2, H, K); scan(z2, `Profil2 ${X}`); const d = diffPfade(alsJson(z1), alsJson(z2)).filter((p) => !/\.sitzung:/.test(p)); // sitzung: Kennung des App-Starts, wird nicht gespeichert
    if (d.length) befund("A", `profil2-zahlen:${X}:${wann}`, `${wann}: Zahlen Laden ${X} in Profil 1 ≠ Profil 2 (${d.length} Pfade)`, d.slice(0, 8));
    for (const j of JOURNALE) if ((s1[j] || []).length !== (s2[j] || []).length) befund("A", `profil2-journal:${X}:${j}`, `${wann}: Journal ${j} Laden ${X}: ${(s1[j] || []).length} in Profil 1, ${(s2[j] || []).length} in Profil 2`); }
  if (geladen.betriebe.length !== 2) befund("A", "profil2-anzahl", `${wann}: ${geladen.betriebe.length} statt 2 Läden in Profil 2`);
  log(`  ${wann}: Profil 2 liest ${geladen.betriebe.length} Läden, Zahlen verglichen`);
}

// ---------- Stichtage: Dezember ↔ Januar ----------
TAG = "Stichtag"; uhr("2027-01-01", 23, 50);
{ const D1 = "2026-12-31", J1 = "2027-01-01"; const K = heute();
  for (const X of ["A", "B"]) { umschalten(X); const s = shop(X); const zD = ZA.zaehler(s, { datum: D1 }), zJ = ZA.zaehler(s, { datum: J1 }); const wo = `${X} Stichtag`;
    if (!nah(zD.umsatzBrutto, ledgerSumme(X, "2026-12-01", D1), 0.005)) befund("A", "dez-umsatz", `${wo}: Dezember-Zähler ${r2(zD.umsatzBrutto)} ≠ Σ 19.–31.12. ${ledgerSumme(X, "2026-12-01", D1)}`);
    if (!nah(zJ.umsatzBrutto, ledgerSumme(X, J1, J1), 0.005) || zJ.gewichtBisHeute !== 1) befund("A", "jan-umsatz", `${wo}: Januar-Zähler ${r2(zJ.umsatzBrutto)} (Tage ${zJ.gewichtBisHeute}) ≠ nur 01.01. ${ledgerSumme(X, J1, J1)}`);
    if (zD.monat.bis !== D1 || zJ.monat.von !== J1) befund("A", "monatsgrenzen", `${wo}: Monatsgrenzen ${zD.monat.von}–${zD.monat.bis} / ${zJ.monat.von}`);
    const dezNeu = alsJson(zahlenKern(s, D1, K)); const dezAlt = vorDez[X]; const dd = diffPfade({ ...dezAlt, anz: 0 }, { ...dezNeu, anz: 0 }).filter((p) => !/\.anz/.test(p));
    if (dd.length) befund("A", "dez-stabil", `${wo}: Dezember-Zahlen haben sich durch Januar-Einträge verändert`, dd.slice(0, 6));
    const swD = E.schwundAuswertung(s, { von: "2026-12-01", bis: D1 }), swJ = E.schwundAuswertung(s, { von: J1, bis: "2027-01-31" });
    if (swD.anzahl !== L[X].muell.filter((e) => e.datum <= D1).length || swJ.anzahl !== L[X].muell.filter((e) => e.datum >= J1).length) befund("A", "muell-monat", `${wo}: Müll Dezember ${swD.anzahl} / Januar ${swJ.anzahl} ≠ Buch`);
    const hz = LZ.heuteZiel(s, zJ, J1); if (!nah(hz.m.umsatz, ledgerSumme(X, J1, J1), 0.005)) befund("A", "jan-ziel", `${wo}: Monatsziel Januar zählt Umsatz ${hz.m.umsatz} statt ${ledgerSumme(X, J1, J1)}`);
    const pD = ES.monatsPaket(s, ES.monatVon(D1), "buch"), pJ = ES.monatsPaket(s, ES.monatVon(J1), "buch");
    if (!nah(pD.umsatz.summe.brutto, ledgerSumme(X, "2026-12-01", D1), 0.005) || !nah(pJ.umsatz.summe.brutto, ledgerSumme(X, J1, J1), 0.005)) befund("A", "paket-monat", `${wo}: Monatspaket Umsatz Dez ${pD.umsatz.summe.brutto} / Jan ${pJ.umsatz.summe.brutto}`);
    const pj = ES.monatsPaket(s, ES.jahrVon("2026", K), "steuer"), pj2 = ES.monatsPaket(s, ES.jahrVon("2027", K), "steuer"); scan([pj, pj2], wo + " Jahrespaket");
    const ao = EA.ordnerAmt(s, EA.zeitraumFuer("monat", { datum: D1 }), { datum: K }), aj = EA.ordnerAmt(s, EA.zeitraumFuer("monat", { datum: J1 }), { datum: K }); scan([ao, aj], wo + " Amt");
    if (ao.zeitraum.bis !== D1 || aj.zeitraum.von !== J1) befund("A", "amt-zeitraum", `${wo}: Amt-Zeitraum Dez ${ao.zeitraum.von}–${ao.zeitraum.bis}, Jan ${aj.zeitraum.von}`);
    const mD = s.messungen.filter((m) => m.datum >= "2026-12-01" && m.datum <= D1).length, mJ = s.messungen.filter((m) => m.datum >= J1).length; // Kalendertag
    if (ao.teile.kuehl.zeilen && ao.teile.kuehl.zeilen.length !== mD && ao.teile.kuehl.zeilen.filter((z) => z && z.datum).length !== mD) befund("A", "amt-kuehl-dez", `${wo}: Kühlprotokoll Dezember ${ao.teile.kuehl.zeilen.length} Zeilen, ${mD} Messungen im Dezember`);
    if (mD + mJ !== s.messungen.length) befund("A", "messung-monat", `${wo}: Messungen Dez ${mD} + Jan ${mJ} ≠ ${s.messungen.length}`);
    // Mindestlohn: Vorschau am 31.12. kennt 14,60 € / 633 € ab 01.01.2027
    const mv = MW.mindestlohnVorschau(s, D1); const m26 = MINDESTLOHN[0], m27 = MINDESTLOHN[1];
    if (m26.satz !== 13.9 || m26.minijob !== 603 || m27.satz !== 14.6 || m27.minijob !== 633 || m27.ab !== J1) befund("A", "mindestlohn-tabelle", "Mindestlohn-Tabelle (js/data/mindestlohn.js:9-10) ≠ 13,90/603 und 14,60/633 ab 2027-01-01", MINDESTLOHN);
    if (Math.ceil(m27.satz * 130 / 3) !== 633 || Math.ceil(m26.satz * 130 / 3) !== 603) befund("A", "minijob-formel", "Minijob-Grenze ≠ Mindestlohn × 130 / 3 aufgerundet");
    if (!mv || mv.neu !== 14.6 || mv.alt !== 13.9 || mv.minijobNeu !== 633 || mv.minijobAlt !== 603 || mv.ab !== J1) befund("A", "mindestlohn-vorschau", `${wo}: Vorschau 31.12. ≠ 13,90→14,60 / 603→633 ab 01.01.2027`, mv && { ab: mv.ab, alt: mv.alt, neu: mv.neu, minijob: [mv.minijobAlt, mv.minijobNeu] });
    else { let erw = 0; const von = E.tagPlus(D1, -27); const je = {}; for (let d = von; d <= D1; d = E.tagPlus(d, 1)) for (const x of L[X].team.get(d) || []) { const k = x.person; je[k] = je[k] || { std: 0, art: x.art, satz: x.satz }; je[k].std += x.stunden; je[k].satz = x.satz; }
      for (const p of Object.values(je)) erw += p.std * MW.MONATSTAGE / 28 * (kostenJeStunde(m27.satz, p.art) - kostenJeStunde(p.satz, p.art));
      if (!nah(mv.mehrMonat, erw, 0.01)) befund("A", "mindestlohn-mehr", `${wo}: Mehrkosten durch 14,60 € im Monat ${r2(mv.mehrMonat)} ≠ nachgerechnet ${r2(erw)}`);
      if (mv.grundlage !== "stunden" || mv.personen.length !== Object.keys(je).length) befund("A", "mindestlohn-personen", `${wo}: Vorschau Grundlage ${mv.grundlage}, ${mv.personen.length} Personen statt ${Object.keys(je).length}`); }
    if (MW.mindestlohnVorschau(s, J1) !== null) befund("A", "mindestlohn-nach", `${wo}: Vorschau am 01.01.2027 zeigt noch eine kommende Erhöhung`);
    const kT = ["2026-12-31", J1, "2027-01-02"].map((d) => MW.mindestlohnKarteZeigen(s, d)); if (!kT[0] || !kT[1] || !kT[2]?.seit) befund("C", "mindestlohn-karte-lueckentag", `${wo}: Mindestlohn-Karte (js/mindestlohn.js mindestlohnKarteZeigen) am 31.12. / 01.01. / 02.01.: ${kT.map((k) => (k ? (k.seit ? "seit" : "vorher") : "fehlt")).join(" / ")} – Erwartung: an jedem der drei Tage sichtbar`);
    // Lohnkosten Januar mit 14,60: Zähler-Lohn am 01.01. = Σ Stunden × 14,60 × Aufschlag
    const lJ = (L[X].team.get(J1) || []).reduce((a, x) => a + x.stunden * kostenJeStunde(14.6, x.art), 0); if (!nah(zJ.lohn, lJ, 0.01) || (L[X].team.get(J1) || []).some((x) => x.satz !== 14.6)) befund("A", "lohn-jan", `${wo}: Januar-Lohn ${r2(zJ.lohn)} ≠ ${r2(lJ)} (Stunden × 14,60 € × Aufschlag)`);
    const tJ = stamm.teamTag(s, J1); if (!tJ || tJ.eintraege.some((x) => x.satz !== 14.6)) befund("A", "team-satz-jan", `${wo}: Teamtag 01.01. nicht mit 14,60 €`);
    const mk = (s.personen || []).find((p) => p.lohnArt === "minijob"); if (mk) { const dez = [...L[X].team].filter(([d]) => d <= D1).reduce((a, [, es]) => a + es.filter((x) => x.art === "minijob").reduce((b, x) => b + x.stunden * x.satz, 0), 0), jan = (L[X].team.get(J1) || []).filter((x) => x.art === "minijob").reduce((b, x) => b + x.stunden * x.satz, 0);
      if (dez > m26.minijob || jan > m27.minijob) befund("C", "minijob-grenze", `${wo}: Minijob-Lohn Dez ${r2(dez)} (Grenze ${m26.minijob}) / Jan ${r2(jan)} (Grenze ${m27.minijob})`); if (mk.stundenlohn !== 14.6) befund("A", "person-stundenlohn", `Minijob-Person trägt Stundenlohn ${mk.stundenlohn} statt 14,60`); }
    log(`  ${wo}: Dez ${r2(zD.umsatzBrutto)} € · Jan ${r2(zJ.umsatzBrutto)} €, Lohn Jan ${r2(zJ.lohn)} €, Vorschau ${mv ? r2(mv.mehrMonat) : "–"} €/Monat`); } }

// ---------- Ende: Sicherung am Schluss in Profil 2, Texte in tr, Speichern rund ----------
TAG = "Ende"; uhr("2027-01-01", 23, 58);
{ const { blob } = await st.exportDatei(w); await profilZwei(blob, "2027-01-01", "Ende"); await speicherRund("2027-01-01");
  for (const X of ["A", "B"]) { const s = shop(X); try { const doks = {};
    for (const c of [SH[X].sprache, "de"]) { i18n.setzeSprache(c); const o = EA.ordnerAmt(s, EA.zeitraumFuer("monat", { datum: "2026-12-31" }), { datum: "2027-01-01" }); const p = ES.monatsPaket(s, ES.monatVon("2026-12-31"), "buch");
      doks[c] = { amt: alsJson(OT.amtDokument(s, o)), paket: alsJson(OT.paketDokument(s, p)), zahl: alsJson({ o, p }) }; scan(doks[c], `Dokument ${X} ${c}`); }
    const sp = SH[X].sprache; if (kanon(doks[sp].amt) === kanon(doks.de.amt) || kanon(doks[sp].paket) === kanon(doks.de.paket)) befund("C", "dokument-sprache:" + X, `Ordner-Dokument ${X} in ${sp} ist textgleich mit Deutsch`);
    if (kanon(doks[sp].zahl) !== kanon(doks.de.zahl)) befund("A", "dokument-zahlen:" + X, `Ordner-Zahlen ${X} in ${sp} ≠ de`, diffPfade(doks.de.zahl, doks[sp].zahl).slice(0, 4)); } catch (e) { befund("B", "dokument-fehler:" + X, `Ordner-Dokument ${X}: ${e.message}`); } }
  i18n.setzeSprache("tr"); }

// ---------- Zusammenfassung ----------
const jeId = new Map(); for (const b of befunde) { const x = jeId.get(b.id) || { ...b, n: 0, tage: new Set() }; x.n += 1; x.tage.add(b.tag); jeId.set(b.id, x); }
const eintraege = (X) => Object.fromEntries(JOURNALE.map((j) => [j, (shop(X)[j] || []).length]).filter(([, n]) => n));
console.log(`\n==== Zusammenfassung Generalprobe: ${TAGE.length} Tage (${TAGE[0]} bis ${TAGE[13]}), 2 Läden, ${jeId.size} verschiedene Befunde (${befunde.length} Treffer)`);
for (const X of ["A", "B"]) console.log(`Einträge ${X} ${shop(X).betrieb.name}: ${JSON.stringify(eintraege(X))}; Teamtage ${shop(X).teamTage?.length || 0}; Umsatz ${r2([...L[X].umsatz.values()].reduce((a, v) => a + v, 0))} €`);
for (const kl of ["A", "B", "C", "D"]) { const l = [...jeId.values()].filter((y) => y.klasse === kl); console.log(`Klasse ${kl}: ${l.length}`); for (const x of l) console.log(`[${x.klasse}] ${x.id} – erstmals ${x.tag}, ${x.n}×: ${x.text}${x.daten ? " · " + JSON.stringify(x.daten).slice(0, 400) : ""}`); }
if (ARG.json) fs.writeFileSync(ARG.json, JSON.stringify([...jeId.values()].map((x) => ({ ...x, tage: [...x.tage] })), null, 1));
// Rot nur bei A–C. Klasse D (Schönheit, z. B. ergänzte Standardfelder beim Laden) wird gemeldet, hält den Wächter aber nicht auf (Fable 30.10.2026).
process.exitCode = [...jeId.values()].some((x) => x.klasse !== "D") ? 1 : 0;
