// E7 (17.10.2026): Verkauf je Gericht. Reine Funktionen, keine Oberfläche, keine Speicherung, kein Netz.
// Kreislauf Einkauf → Lager → Verkauf → Ergebnis: Verkäufe kommen aus dem Kassen-Export (DSFinV-K) oder von Hand (Z-Bon-Artikelbericht
// abgelesen) und liegen im Journal stand.verkaeufe (nur anhängen, Rücknahme = storniert). Daraus: Rang je Gericht, Soll-Verbrauch je Ware
// (über die Rezepte, Selbstgemachtes auf Rohware heruntergerechnet), Abgleich mit zwei Inventuren (Schwund-Verdacht), Ladenhüter, totes Lager.
//
// DSFinV-K (Digitale Schnittstelle der Finanzverwaltung für Kassensysteme), Version 2.4 vom Januar 2024 (inhaltlich gleich 2.3), BZSt:
// https://www.bzst.de/DE/Unternehmen/Aussenpruefungen/DigitaleSchnittstelleFinV/digitaleschnittstellefinv_node.html
// Genutzte Dateien und Felder (Spaltennamen der Spezifikation):
//   lines.csv (Bonpos): Z_KASSE_ID, Z_ERSTELLUNG, Z_NR, BON_ID, POS_ZEILE, ARTIKELTEXT, GV_TYP, P_STORNO, ART_NR, MENGE, STK_BR
//   transactions.csv (Bonkopf): Z_KASSE_ID, Z_ERSTELLUNG, Z_NR, BON_ID, BON_TYP, BON_STORNO, BON_START, BON_ENDE
//   cashpointclosing.csv (Stamm_Abschluss): Z_KASSE_ID, Z_ERSTELLUNG, Z_NR, Z_BUCHUNGSTAG
//   lines_vat.csv (Bonpos_USt, wenn vorhanden): Z_KASSE_ID, Z_ERSTELLUNG, Z_NR, BON_ID, POS_ZEILE, POS_BRUTTO
//   index.xml (wenn vorhanden): DecimalSymbol, ColumnDelimiter, TextEncapsulator
// Format laut Beschreibung (index.xml): Spalten mit Semikolon, Dezimalkomma, Text in Anführungszeichen, Kopfzeile mit Spaltennamen, UTF-8.
// Gelesen wird trotzdem vorsichtig: Trennzeichen aus der Kopfzeile erkannt, Punkt oder Komma als Dezimalzeichen, BOM und Windows-1252 als Rückfall.
import { normalisieren, suchRang } from "./data/suchnamen.js";
import { EINHEITEN, inBasis } from "./data/katalog.js";
import { garverlustAnteil, rohmengeFuer, preisJeBasis, preisGeschaetzt, preisNettoGebinde, istRichtpreis, tagPlus, SCHWUND_ARTEN } from "./engine.js";
import { inventurenFertig, inventurVorher, lagerortFuer, mengeSauber } from "./inventur.js";
import { uid, heute, heuteGeschaeft, geschaeftstag } from "./util.js";
import { zipLesen, istZip } from "./zip.js";

export const HERKUNFT = ["hand", "zbon", "dsfinvk", "kasse"];
// Gibt es für einen Tag Kassendaten und Handeingabe, zählt die Kasse (genauer als abgelesen).
const RANG = { dsfinvk: 3, kasse: 3, zbon: 2, hand: 1 };

// ---------- Schalter (Entwurf, nur versteckt sichtbar) ----------
// Der Eigentümer gibt jede sichtbare Änderung erst nach einem Entwurf frei: der Büro-Einstieg „Verkauf“ erscheint nur mit ?verkauf=1
// (wird im Gerät gemerkt, ?verkauf=0 nimmt ihn weg) oder im Beispiel-Laden.
export const SCHALTER_KEY = "gc-verkauf";
export function verkaufSchalter({ suche = globalThis.location?.search || "", speicher } = {}) {
  let wert = null; try { wert = new URLSearchParams(suche).get("verkauf"); } catch (_) { wert = null; }
  try {
    const sp = speicher === undefined ? globalThis.localStorage : speicher;
    if (sp) { if (wert === "1") sp.setItem(SCHALTER_KEY, "1"); else if (wert === "0") sp.removeItem(SCHALTER_KEY); return sp.getItem(SCHALTER_KEY) === "1"; }
  } catch (_) { /* ohne Speicher gilt nur die Adresse */ }
  return wert === "1";
}
// E7 (17.10.2026, abends): Baris – Inhalt vor Optik, Büro-Funktionen sichtbar, sobald geprüft. Schalter bleibt für Tests erhalten.
export const verkaufSichtbar = (stand) => !!stand;

// ---------- CSV lesen ----------
function kurzHash(str) { let a = 5381, b = 0x811c9dc5; for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); a = (Math.imul(a, 33) + c) | 0; b = Math.imul(b ^ c, 16777619); } return (a >>> 0).toString(36) + (b >>> 0).toString(36); }

// Bytes → Text: UTF-8 (mit oder ohne BOM); ist es kein gültiges UTF-8, Windows-1252 (ältere Kassen).
export function textAusBytes(bytes) {
  try { return { text: new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^﻿/, ""), kodierung: "utf-8" }; }
  catch (_) { return { text: new TextDecoder("windows-1252").decode(bytes), kodierung: "windows-1252" }; }
}

// Trennzeichen aus der Kopfzeile: das häufigste von ; , Tab außerhalb von Anführungszeichen (Vorgabe Semikolon).
export function trennerErkennen(text, quote = '"') {
  const z = []; let im = false;
  for (let i = 0; i < text.length && i < 4000; i++) { const c = text[i]; if (c === quote) im = !im; else if (!im && (c === "\n" || c === "\r")) break; else if (!im) z.push(c); }
  const n = (c) => z.filter((x) => x === c).length;
  const kandidaten = [[";", n(";")], [",", n(",")], ["\t", n("\t")]].sort((a, b) => b[1] - a[1]);
  return kandidaten[0][1] > 0 ? kandidaten[0][0] : ";";
}

// RFC-4180-artig: Felder in Anführungszeichen dürfen Trennzeichen und Zeilenumbrüche enthalten, "" ist ein Anführungszeichen.
export function csvLesen(text, { trenner = null, quote = '"' } = {}) {
  const t = String(text || "").replace(/^﻿/, "");
  const sep = trenner || trennerErkennen(t, quote);
  const zeilen = []; let feld = "", zeile = [], im = false, i = 0;
  while (i < t.length) {
    const c = t[i];
    if (im) {
      if (c === quote) { if (t[i + 1] === quote) { feld += quote; i += 2; continue; } im = false; i += 1; continue; }
      feld += c; i += 1; continue;
    }
    if (c === quote && feld === "") { im = true; i += 1; continue; }
    if (c === sep) { zeile.push(feld); feld = ""; i += 1; continue; }
    if (c === "\r" || c === "\n") { zeile.push(feld); feld = ""; if (zeile.length > 1 || zeile[0] !== "") zeilen.push(zeile); zeile = []; i += c === "\r" && t[i + 1] === "\n" ? 2 : 1; continue; }
    feld += c; i += 1;
  }
  if (feld !== "" || zeile.length) { zeile.push(feld); if (zeile.length > 1 || zeile[0] !== "") zeilen.push(zeile); }
  if (!zeilen.length) return { kopf: [], daten: [], trenner: sep };
  const kopf = zeilen[0].map((k) => k.trim().toUpperCase());
  const daten = zeilen.slice(1).map((z) => { const o = {}; kopf.forEach((k, j) => { o[k] = (z[j] ?? "").trim(); }); return o; });
  return { kopf, daten, trenner: sep };
}

// Zahl aus dem Export: Dezimalzeichen laut index.xml (Vorgabe Komma); steht nur das andere Zeichen da, gilt es als Dezimalzeichen.
export function zahlLesen(s, dezimal = null) {
  let x = String(s ?? "").trim().replace(/\s/g, ""); if (!x) return null;
  const neg = /^-/.test(x) || /-$/.test(x); x = x.replace(/^[-+]|-$/g, "");
  if (!/^[0-9.,]+$/.test(x)) return null;
  const k = x.lastIndexOf(","), p = x.lastIndexOf(".");
  let dez = dezimal;
  if (k >= 0 && p >= 0) dez = k > p ? "," : ".";
  else if (k >= 0) dez = ",";
  else if (p >= 0) dez = (x.match(/\./g) || []).length > 1 ? "," : ".";
  const tausend = dez === "," ? "." : ",";
  x = x.split(tausend).join(""); if (dez === ",") x = x.replace(",", ".");
  const n = Number(x); return Number.isFinite(n) ? (neg ? -n : n) : null;
}

function indexXmlLesen(text) {
  const hol = (tag) => { const m = new RegExp(`<${tag}>([^<]*)</${tag}>`, "i").exec(text || ""); return m ? m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#9;/g, "\t") : null; };
  const d = hol("DecimalSymbol"), c = hol("ColumnDelimiter"), q = hol("TextEncapsulator");
  return { dezimal: d === "," || d === "." ? d : null, trenner: c && c.length === 1 ? c : null, quote: q && q.length === 1 ? q : null };
}

// Welche Tabelle ist eine Datei? Erst nach dem Namen, sonst nach den Spalten (Kassen benennen Dateien manchmal anders).
const TABELLEN = {
  lines: (n, k) => n === "lines.csv" || (k.includes("POS_ZEILE") && k.includes("ARTIKELTEXT") && k.includes("MENGE")),
  lines_vat: (n, k) => n === "lines_vat.csv" || (k.includes("POS_ZEILE") && k.includes("POS_BRUTTO") && !k.includes("ARTIKELTEXT")),
  transactions: (n, k) => n === "transactions.csv" || (k.includes("BON_TYP") && k.includes("BON_ID") && !k.includes("POS_ZEILE")),
  cashpointclosing: (n, k) => n === "cashpointclosing.csv" || k.includes("Z_BUCHUNGSTAG"),
};
const basisName = (n) => String(n || "").split(/[\\/]/).pop().toLowerCase();

// Datei(en) des Nutzers → [{ name, bytes }]. ZIP wird ausgepackt (auch gepackte Einträge, js/zip.js), CSV/XML einzeln.
export async function dateienLesen(dateien) {
  const out = []; const fehler = [];
  for (const d of dateien || []) {
    try {
      if (await istZip(d)) {
        for (const e of await zipLesen(d, { gepackt: true })) {
          const n = basisName(e.name); if (!/\.(csv|xml)$/.test(n)) continue;
          try { out.push({ name: n, bytes: await e.bytes() }); } catch (x) { fehler.push({ datei: n, grund: x?.grund === "gepackt" ? "gepackt" : "lesen" }); }
        }
      } else out.push({ name: basisName(d.name || "lines.csv"), bytes: new Uint8Array(await d.arrayBuffer()) });
    } catch (x) { fehler.push({ datei: basisName(d?.name), grund: x?.grund === "format" ? "zip" : "lesen" }); }
  }
  return { dateien: out, fehler };
}

const bonSchluessel = (r) => [r.Z_KASSE_ID, r.Z_ERSTELLUNG, r.Z_NR, r.BON_ID].join("|");
const abschlussSchluessel = (r) => [r.Z_KASSE_ID, r.Z_ERSTELLUNG, r.Z_NR].join("|");
const DATUM = /^(\d{4}-\d{2}-\d{2})/;
// Zeitstempel (ISO 8601 mit Zone) → Geschäftstag des Geräts (bis 4 Uhr = Vortag, wie überall in der App)
function geschaeftstagVon(iso) {
  if (typeof iso !== "string" || !iso) return null;
  const ms = Date.parse(iso); if (!Number.isFinite(ms)) { const m = DATUM.exec(iso); return m ? m[1] : null; }
  if (!/T\d/.test(iso)) { const m = DATUM.exec(iso); return m ? m[1] : null; }
  return heute(geschaeftstag(new Date(ms)));
}

// Der Export (Liste {name, bytes}) → Summen je Geschäftstag und Kassenartikel plus Bericht über alles, was nicht gezählt wurde.
export function dsfinvkLesen(dateien) {
  const bericht = { dateien: [], kodierung: [], zeilen: 0, bons: 0, gezaehlt: 0, bonTyp: {}, stornoBons: 0, stornoZeilen: 0, positionsStorno: 0,
    nichtArtikel: {}, ohneMenge: 0, ohneDatum: 0, ohneBonkopf: false, datumQuelle: { abschluss: 0, bon: 0, erstellung: 0 }, punktStattKomma: false, fehler: [] };
  const xml = (dateien || []).find((d) => d.name.endsWith(".xml"));
  const fmt = xml ? indexXmlLesen(textAusBytes(xml.bytes).text) : { dezimal: null, trenner: null, quote: null };
  const tab = {};
  for (const d of dateien || []) {
    if (!d.name.endsWith(".csv")) continue;
    const { text, kodierung } = textAusBytes(d.bytes);
    const csv = csvLesen(text, { trenner: fmt.trenner, quote: fmt.quote || '"' });
    const art = Object.keys(TABELLEN).find((k) => TABELLEN[k](d.name, csv.kopf));
    bericht.dateien.push({ name: d.name, tabelle: art || null, zeilen: csv.daten.length, trenner: csv.trenner }); bericht.kodierung.push(kodierung);
    if (art && !tab[art]) tab[art] = csv.daten;
  }
  bericht.kodierung = [...new Set(bericht.kodierung)];
  if (!tab.lines) { bericht.fehler.push("keineLines"); return { positionen: [], tage: [], bericht, fingerabdruck: null }; }
  const dez = fmt.dezimal || ",";
  const zahl = (s) => { const n = zahlLesen(s, dez); if (n !== null && dez === "," && /\./.test(s) && !/,/.test(s)) bericht.punktStattKomma = true; return n; };
  const tagAbschluss = new Map(); for (const r of tab.cashpointclosing || []) { const m = DATUM.exec(r.Z_BUCHUNGSTAG || ""); if (m) tagAbschluss.set(abschlussSchluessel(r), m[1]); }
  const bons = new Map(); for (const r of tab.transactions || []) bons.set(bonSchluessel(r), r);
  bericht.ohneBonkopf = !tab.transactions; bericht.bons = bons.size;
  for (const r of bons.values()) { const typ = r.BON_TYP || "?"; bericht.bonTyp[typ] = (bericht.bonTyp[typ] || 0) + 1; if (r.BON_STORNO === "1") bericht.stornoBons += 1; }
  const brutto = new Map(); for (const r of tab.lines_vat || []) { const v = zahl(r.POS_BRUTTO); if (v !== null) { const k = bonSchluessel(r) + "|" + r.POS_ZEILE; brutto.set(k, (brutto.get(k) || 0) + v); } }
  const summen = new Map();
  for (const r of tab.lines) {
    bericht.zeilen += 1;
    const bon = bons.get(bonSchluessel(r)) || null;
    // Nur echte Verkaufsbelege: Training, Abbruch, Bestellung, Transfer, Sachbezug, Rechnung und Sonstiges zählen nicht als Verkauf
    if (tab.transactions && (!bon || String(bon.BON_TYP || "").toLowerCase() !== "beleg")) { const k = "bonTyp:" + (bon?.BON_TYP || "?"); bericht.nichtArtikel[k] ??= { zeilen: 0, betrag: 0 }; bericht.nichtArtikel[k].zeilen += 1; continue; }
    if (r.P_STORNO === "1") { bericht.positionsStorno += 1; continue; }
    const gv = r.GV_TYP || "Umsatz";
    const menge0 = zahl(r.MENGE); const stk = zahl(r.STK_BR);
    if (gv.toLowerCase() !== "umsatz") { bericht.nichtArtikel[gv] ??= { zeilen: 0, betrag: 0 }; bericht.nichtArtikel[gv].zeilen += 1; bericht.nichtArtikel[gv].betrag += (menge0 ?? 1) * (stk ?? 0); continue; }
    if (menge0 === null) { bericht.ohneMenge += 1; continue; }
    let datum = tagAbschluss.get(abschlussSchluessel(r)) || null, quelle = "abschluss";
    if (!datum) { datum = geschaeftstagVon(bon?.BON_ENDE) || geschaeftstagVon(bon?.BON_START); quelle = "bon"; }
    if (!datum) { datum = geschaeftstagVon(r.Z_ERSTELLUNG); quelle = "erstellung"; }
    if (!datum) { bericht.ohneDatum += 1; continue; }
    bericht.datumQuelle[quelle] += 1;
    const storno = bon?.BON_STORNO === "1"; // Storno-Beleg hebt einen früheren Beleg auf: immer abziehen
    let menge = menge0, umsatz = brutto.has(bonSchluessel(r) + "|" + r.POS_ZEILE) ? brutto.get(bonSchluessel(r) + "|" + r.POS_ZEILE) : stk !== null ? stk * menge0 : null;
    if (storno) { menge = -Math.abs(menge); if (umsatz !== null) umsatz = -Math.abs(umsatz); bericht.stornoZeilen += 1; }
    const plu = r.ART_NR || null; const text = (r.ARTIKELTEXT || "").slice(0, 120);
    const kasse = r.Z_KASSE_ID ? String(r.Z_KASSE_ID).slice(0, 50) : null; // Prüfgremium 17.10.2026 (5): zwei Kassen = zwei getrennte Stände je Tag
    const k = datum + "|" + (kasse || "") + "|" + (plu || "") + "|" + normKasse(text);
    const s = summen.get(k) || { datum, kasse, plu, text, menge: 0, umsatzBrutto: 0, umsatzFehlt: false, zeilen: 0 };
    s.menge += menge; if (umsatz === null) s.umsatzFehlt = true; else s.umsatzBrutto += umsatz; s.zeilen += 1; summen.set(k, s);
    bericht.gezaehlt += 1;
  }
  const positionen = [...summen.values()].map((s) => ({ datum: s.datum, kasse: s.kasse, plu: s.plu, text: s.text, menge: rund(s.menge, 3), umsatzBrutto: s.umsatzFehlt ? null : rund(s.umsatzBrutto, 2), zeilen: s.zeilen }))
    .filter((p) => Math.abs(p.menge) > 1e-9 || (p.umsatzBrutto !== null && Math.abs(p.umsatzBrutto) > 0.004))
    .sort((a, b) => a.datum.localeCompare(b.datum) || String(a.kasse || "").localeCompare(String(b.kasse || "")) || a.text.localeCompare(b.text, "de"));
  for (const v of Object.values(bericht.nichtArtikel)) v.betrag = rund(v.betrag, 2);
  const tage = [...new Set(positionen.map((p) => p.datum))].sort();
  return { positionen, tage, bericht, fingerabdruck: "imp-" + kurzHash(positionen.map((p) => [p.datum, p.kasse || "", p.plu, p.text, p.menge, p.umsatzBrutto].join("|")).join("\n")) };
}
const rund = (x, n) => { const f = 10 ** n; return Math.round(x * f) / f; };

// Alles in einem Schritt für die Oberfläche: Dateien → Ergebnis mit Bericht
export async function exportEinlesen(dateien) {
  const { dateien: liste, fehler } = await dateienLesen(dateien);
  const r = dsfinvkLesen(liste); r.bericht.fehler.push(...fehler.map((f) => "datei:" + f.grund));
  return r;
}

// ---------- Zuordnung Kassentext → Gericht ----------
export const normKasse = (s) => normalisieren(s).replace(/[^\p{L}\p{N}]+/gu, " ").trim();
// Reihenfolge: Artikelnummer (plu) → gelernter Kassentext → genau gleicher Name. Mehrdeutig oder unbekannt: nicht zugeordnet, nie geraten.
export function zuordnen(stand, { plu = null, text = "" } = {}) {
  const gerichte = stand.gerichte || []; const q = normKasse(text);
  const eins = (liste) => (liste.length === 1 ? liste[0] : null);
  if (plu) { const g = eins(gerichte.filter((x) => x.plu && x.plu === String(plu))); if (g) return { gericht: g.id, weg: "plu", vorschlaege: [] }; }
  if (q) {
    const g = eins(gerichte.filter((x) => (x.kassenNamen || []).some((n) => normKasse(n) === q))); if (g) return { gericht: g.id, weg: "gelernt", vorschlaege: [] };
    const h = eins(gerichte.filter((x) => normKasse(x.name) === q)); if (h) return { gericht: h.id, weg: "name", vorschlaege: [] };
  }
  return { gericht: null, weg: null, vorschlaege: vorschlaege(stand, text) };
}
// Vorschläge für die Chips: Gerichte, deren Name im Kassentext steckt oder umgekehrt (vorhandene Suche), höchstens vier
export function vorschlaege(stand, text) {
  const q = normKasse(text); if (!q) return [];
  const woerter = q.split(" ").filter((w) => w.length >= 3);
  const rang = (g) => { const n = normKasse(g.name); if (n.includes(q) || q.includes(n)) return 0; if (suchRang(g.name, q) >= 0) return 1; return woerter.some((w) => n.includes(w)) ? 2 : -1; };
  return (stand.gerichte || []).map((g) => [g, rang(g)]).filter(([, r]) => r >= 0).sort((a, b) => a[1] - b[1] || a[0].name.localeCompare(b[0].name, "de")).slice(0, 4).map(([g]) => g.id);
}
// Lernen: der Kassentext gehört ab jetzt zu diesem Gericht (bei keinem anderen mehr). gerichtId null = Zuordnung vergessen.
// Hat die Position eine Artikelnummer, die noch kein Gericht trägt, und das Gericht noch keine, wird sie mitgemerkt.
export function zuordnungLernen(stand, { text = "", plu = null } = {}, gerichtId) {
  const q = normKasse(text); if (!q && !plu) return false;
  for (const g of stand.gerichte || []) {
    if (Array.isArray(g.kassenNamen)) { g.kassenNamen = g.kassenNamen.filter((n) => normKasse(n) !== q); if (!g.kassenNamen.length) delete g.kassenNamen; }
    if (plu && g.plu === String(plu) && g.id !== gerichtId) delete g.plu;
  }
  if (!gerichtId) return true;
  const g = (stand.gerichte || []).find((x) => x.id === gerichtId); if (!g) return false;
  if (q && normKasse(g.name) !== q) g.kassenNamen = [...(g.kassenNamen || []), String(text).trim().slice(0, 120)];
  if (plu && !g.plu && !(stand.gerichte || []).some((x) => x.plu === String(plu))) g.plu = String(plu).slice(0, 50);
  return true;
}
// Gericht eines gespeicherten Eintrags: gespeicherte Kennung (wenn es das Gericht noch gibt), sonst mit der heutigen Zuordnung
export function gerichtVon(stand, e) {
  if (e.gericht && (stand.gerichte || []).some((g) => g.id === e.gericht)) return e.gericht;
  return zuordnen(stand, { plu: e.plu, text: e.text || e.name }).gericht;
}

// ---------- Vorschau und Übernehmen ----------
const aktiv = (stand) => (stand.verkaeufe || []).filter((v) => !v.storniert);
// Prüfgremium 17.10.2026 (5): Kassen-ID (Z_KASSE_ID) gehört zum Ersetzungsschlüssel. Dieselbe Kasse und derselbe Tag ersetzt, eine andere Kasse addiert.
// Einträge von vor dieser Änderung tragen kein Feld „kasse“: sie gelten als derselbe Stand wie die neue Datei (Verhalten wie bisher, kein Doppeltzählen).
export const kasseVon = (p) => (typeof p?.kasse === "string" && p.kasse ? p.kasse : null);
const gleicheKasse = (v, k) => !("kasse" in v) || kasseVon(v) === k;
const kassenGruppen = (pos) => { const m = new Map(); for (const p of pos) { const k = kasseVon(p); if (!m.has(k)) m.set(k, []); m.get(k).push(p); } return m; };
const abdruck = (liste) => liste.map((p) => [p.plu || "", normKasse(p.text || p.name), rund(p.menge, 3), p.umsatzBrutto ?? ""].join("|")).sort().join("\n");
export function importVorschau(stand, ergebnis, { herkunft = "dsfinvk" } = {}) {
  const pos = (ergebnis?.positionen || []).map((p) => ({ ...p, ...zuordnen(stand, p) }));
  const offen = new Map();
  for (const p of pos) if (!p.gericht) { const k = (p.plu || "") + "|" + normKasse(p.text); const o = offen.get(k) || { text: p.text, plu: p.plu, menge: 0, umsatzBrutto: 0, tage: new Set(), vorschlaege: p.vorschlaege }; o.menge += p.menge; o.umsatzBrutto += p.umsatzBrutto || 0; o.tage.add(p.datum); offen.set(k, o); }
  const tage = ergebnis?.tage || [];
  const jeTag = tage.map((d) => { const neuTag = pos.filter((p) => p.datum === d); const staende = [];
    for (const [k, neu] of kassenGruppen(neuTag)) { const alt = aktiv(stand).filter((v) => v.datum === d && v.herkunft === herkunft && gleicheKasse(v, k)); staende.push(!alt.length ? "neu" : abdruck(alt) === abdruck(neu) ? "gleich" : "ersetzt"); }
    return { datum: d, positionen: neuTag.length, stand: staende.includes("ersetzt") ? "ersetzt" : staende.every((x) => x === "gleich") ? "gleich" : "neu" }; });
  const summe = (f) => pos.filter(f).reduce((s, p) => s + p.menge, 0);
  const umsatz = (f) => pos.filter(f).reduce((s, p) => s + (p.umsatzBrutto || 0), 0);
  return { positionen: pos, tage, von: tage[0] || null, bis: tage[tage.length - 1] || null, zugeordnet: pos.filter((p) => p.gericht).length, offenAnzahl: pos.filter((p) => !p.gericht).length,
    mengeZugeordnet: summe((p) => p.gericht), mengeOffen: summe((p) => !p.gericht), umsatzZugeordnet: rund(umsatz((p) => p.gericht), 2), umsatzOffen: rund(umsatz((p) => !p.gericht), 2),
    offen: [...offen.values()].map((o) => ({ ...o, menge: rund(o.menge, 3), umsatzBrutto: rund(o.umsatzBrutto, 2), tage: o.tage.size })).sort((a, b) => b.menge - a.menge),
    jeTag, gleich: jeTag.filter((t) => t.stand === "gleich").length, ersetzt: jeTag.filter((t) => t.stand === "ersetzt").length, bericht: ergebnis?.bericht || null };
}

// Übernehmen: je Tag ersetzt der neue Stand den alten derselben Herkunft (alter wird storniert, ersetzt = neue Import-Kennung).
// Ist der Tag schon genau so da (gleicher Abdruck), passiert nichts – dieselbe Datei zweimal zählt nie doppelt.
// Nicht zugeordnete Positionen werden mit gericht: null gespeichert (die Auswertung weist sie aus; spätere Zuordnungen gelten rückwirkend).
export function importUebernehmen(stand, ergebnis, { herkunft = "dsfinvk", jetzt = new Date().toISOString(), geraet = null } = {}) {
  if (!HERKUNFT.includes(herkunft) || herkunft === "hand") throw new Error("herkunft");
  stand.verkaeufe ??= [];
  const importId = (ergebnis?.fingerabdruck || "imp-" + kurzHash(jetzt)) + "-" + kurzHash(jetzt);
  const namen = new Map((stand.gerichte || []).map((g) => [g.id, g.name]));
  let neu = 0, ersetzt = 0, gleich = 0, tageNeu = 0;
  const allePos = ergebnis?.positionen || [];
  for (const d of ergebnis?.tage || []) {
    let geaendert = false;
    for (const [k, pos] of kassenGruppen(allePos.filter((p) => p.datum === d))) {
      const alt = aktiv(stand).filter((v) => v.datum === d && v.herkunft === herkunft && gleicheKasse(v, k));
      if (alt.length && abdruck(alt) === abdruck(pos)) { gleich += 1; continue; }
      for (const v of alt) { v.storniert = true; v.storniertZeit = jetzt; v.ersetzt = importId; ersetzt += 1; }
      for (const p of pos) { const z = zuordnen(stand, p); const i = allePos.indexOf(p);
        stand.verkaeufe.push({ id: `${importId}-${d}-${i}`, datum: d, gericht: z.gericht, name: z.gericht ? namen.get(z.gericht) : p.text, text: p.text, plu: p.plu || null, kasse: k, menge: p.menge,
          umsatzBrutto: p.umsatzBrutto, herkunft, importId, erfasst: jetzt, geraet, storniert: false }); neu += 1; }
      geaendert = true;
    }
    if (geaendert) tageNeu += 1;
  }
  return { importId, neu, ersetzt, gleich, tage: tageNeu };
}
// Einen ganzen Import zurücknehmen (alle seine Einträge storniert). Ersetzte Vorgänger bleiben storniert: wer zurück will, liest neu ein.
export function importZuruecknehmen(stand, importId, { jetzt = new Date().toISOString() } = {}) {
  let n = 0; for (const v of stand.verkaeufe || []) if (v.importId === importId && !v.storniert) { v.storniert = true; v.storniertZeit = jetzt; n += 1; }
  return n;
}
export function verkaufStornieren(stand, id, { jetzt = new Date().toISOString() } = {}) {
  const v = (stand.verkaeufe || []).find((x) => x.id === id && !x.storniert); if (!v) return false;
  v.storniert = true; v.storniertZeit = jetzt; return true;
}
// Eingelesene Importe (neueste zuerst): Kennung, Herkunft, Tage, Positionen, wann
export function importe(stand) {
  const m = new Map();
  for (const v of stand.verkaeufe || []) { if (!v.importId || v.storniert) continue; const x = m.get(v.importId) || { importId: v.importId, herkunft: v.herkunft, erfasst: v.erfasst, tage: new Set(), positionen: 0 }; x.tage.add(v.datum); x.positionen += 1; m.set(v.importId, x); }
  return [...m.values()].map((x) => ({ ...x, tage: [...x.tage].sort() })).sort((a, b) => String(b.erfasst).localeCompare(String(a.erfasst)));
}

// ---------- Handeingabe ----------
// „Verkauf für Tag X: Gericht → Menge“ (z. B. vom Z-Bon-Artikelbericht abgelesen). Ersetzt den vorigen Hand-Eintrag desselben Tags und Gerichts.
// Menge 0 oder leer nimmt den Eintrag zurück. Umsatz bleibt leer (abgelesen ist nur die Stückzahl).
export function handVerkaufSetzen(stand, datum, gerichtId, menge, { jetzt = new Date().toISOString(), geraet = null } = {}) {
  const g = (stand.gerichte || []).find((x) => x.id === gerichtId); if (!g || !/^\d{4}-\d{2}-\d{2}$/.test(String(datum))) return null;
  stand.verkaeufe ??= [];
  const n = typeof menge === "number" && Number.isFinite(menge) && menge > 0 ? Math.round(menge * 1000) / 1000 : null;
  const alt = aktiv(stand).filter((v) => v.herkunft === "hand" && v.datum === datum && v.gericht === gerichtId);
  if (n === null) { for (const v of alt) { v.storniert = true; v.storniertZeit = jetzt; } return alt.length ? { geloescht: alt.length } : null; }
  if (alt.length === 1 && alt[0].menge === n) return alt[0];
  const e = { id: uid(), datum, gericht: gerichtId, name: g.name, plu: g.plu || null, menge: n, umsatzBrutto: null, herkunft: "hand", importId: null, erfasst: jetzt, geraet, storniert: false };
  for (const v of alt) { v.storniert = true; v.storniertZeit = jetzt; v.ersetzt = e.id; }
  stand.verkaeufe.push(e); return e;
}
export function handTag(stand, datum) {
  const out = {}; for (const v of aktiv(stand)) if (v.herkunft === "hand" && v.datum === datum && v.gericht) out[v.gericht] = (out[v.gericht] || 0) + v.menge;
  return out;
}

// ---------- Auswertung ----------
// Verkäufe im Zeitraum: je Tag zählt nur die beste Herkunft (Kasse vor Z-Bon vor Hand), damit nichts doppelt zählt.
export function verkaeufeImZeitraum(stand, { von, bis }) {
  const jeTag = new Map();
  for (const v of aktiv(stand)) { if (v.datum < von || v.datum > bis) continue; const l = jeTag.get(v.datum) || []; l.push(v); jeTag.set(v.datum, l); }
  const out = []; let doppelt = 0;
  for (const [, l] of jeTag) { const best = Math.max(...l.map((v) => RANG[v.herkunft] || 0)); if (l.some((v) => (RANG[v.herkunft] || 0) < best)) doppelt += 1; out.push(...l.filter((v) => (RANG[v.herkunft] || 0) === best)); }
  return { eintraege: out, tage: jeTag.size, doppelt };
}

// (a) Verkäufe je Gericht mit Rang
export function verkaufJeGericht(stand, z) {
  const { eintraege, tage, doppelt } = verkaeufeImZeitraum(stand, z);
  const je = new Map((stand.gerichte || []).map((g) => [g.id, { gericht: g.id, name: g.name, menge: 0, umsatz: 0, umsatzTeile: 0, preis: typeof g.preis === "number" ? g.preis : null }]));
  const ohne = { menge: 0, umsatz: 0, texte: new Map() }; let menge = 0, umsatz = 0, mitUmsatz = 0;
  for (const v of eintraege) {
    const id = gerichtVon(stand, v); menge += v.menge; if (v.umsatzBrutto !== null) { umsatz += v.umsatzBrutto; mitUmsatz += 1; }
    const r = id ? je.get(id) : null;
    if (!r) { ohne.menge += v.menge; ohne.umsatz += v.umsatzBrutto || 0; const t = v.text || v.name; ohne.texte.set(t, (ohne.texte.get(t) || 0) + v.menge); continue; }
    r.menge += v.menge; if (v.umsatzBrutto !== null) { r.umsatz += v.umsatzBrutto; r.umsatzTeile += 1; }
  }
  const zeilen = [...je.values()].map((r) => ({ ...r, menge: rund(r.menge, 3), umsatz: r.umsatzTeile ? rund(r.umsatz, 2) : null, anteil: menge > 0 ? r.menge / menge : 0 }))
    .sort((a, b) => b.menge - a.menge || a.name.localeCompare(b.name, "de"));
  let rang = 0, vorher = null; zeilen.forEach((r, i) => { if (r.menge !== vorher) { rang = i + 1; vorher = r.menge; } r.rang = r.menge > 0 ? rang : null; });
  return { zeilen, tage, doppelt, menge: rund(menge, 3), umsatz: mitUmsatz ? rund(umsatz, 2) : null,
    ohneZuordnung: { menge: rund(ohne.menge, 3), umsatz: rund(ohne.umsatz, 2), texte: [...ohne.texte.entries()].map(([text, m]) => ({ text, menge: rund(m, 3) })).sort((a, b) => b.menge - a.menge) } };
}

// Bedarf einer Portion an gekaufter Ware (Basiseinheit g/ml/Stück). Wie warenGericht: Garverlust auf die Rohware (rohmengeFuer);
// selbst gemachte Teile über ihr Rezept anteilig auf die Rohstoffe (wie zwischenpreis: eine Stufe, ohne Garverlust).
// probleme: Zutaten, die sich nicht rechnen lassen (unbekannt, Menge fehlt, Einheit passt nicht, kein Rezept).
// Menge eines selbst gemachten Teils (Teig, Soße …) → Rohware über sein Rezept, anteilig zur Ausbeute (eine Stufe, ohne Garverlust).
// Prüfgremium 17.10.2026 (6): gemeinsame Rechnung für den Soll-Verbrauch (bedarfGericht) und den Müll (schwundVerbrauch).
// Rückgabe { bedarf: [{ name, menge, basis, ueber }], probleme } – ohne Rezept: null.
export function selbstAufRohware(a, menge, einheit, idx) {
  const r = a?.herkunft === "selbst" ? a.rezept : null; if (!r) return null;
  const out = []; const probleme = [];
  const aus = r.ausbeute; const bA = EINHEITEN[aus?.einheit]?.basis; const bZ = EINHEITEN[einheit]?.basis;
  if (!(aus?.menge > 0) || !bZ || bA !== bZ) return { bedarf: out, probleme: [{ name: a.name, grund: "einheit" }] };
  const anteil = inBasis(menge, einheit) / inBasis(aus.menge, aus.einheit);
  for (const rz of r.zutaten || []) {
    const ra = idx[rz.name]; const bR = EINHEITEN[rz.einheit]?.basis;
    if (!ra || ra.herkunft === "selbst") { probleme.push({ name: rz.name, grund: "unbekannt", ueber: a.name }); continue; }
    if (!(Number(rz.menge) > 0) || !bR) { probleme.push({ name: rz.name, grund: "menge", ueber: a.name }); continue; }
    const bRa = EINHEITEN[ra.packung?.einheit || ra.einheit]?.basis; if (bRa && bRa !== bR) { probleme.push({ name: rz.name, grund: "einheit", ueber: a.name }); continue; }
    out.push({ name: rz.name, menge: inBasis(rz.menge, rz.einheit) * anteil, basis: bR, ueber: a.name });
  }
  return { bedarf: out, probleme };
}
export function bedarfGericht(g, idx) {
  const out = []; const probleme = [];
  if (!(g?.zutaten || []).length) return { bedarf: out, probleme: [{ name: null, grund: "rezept" }] };
  for (const z of g.zutaten) {
    const a = idx[z.name]; const bZ = EINHEITEN[z.einheit]?.basis;
    if (!a) { probleme.push({ name: z.name, grund: "unbekannt" }); continue; }
    if (!(Number(z.menge) > 0) || !bZ) { probleme.push({ name: z.name, grund: "menge" }); continue; }
    if (a.herkunft === "selbst" && a.rezept) { const s = selbstAufRohware(a, z.menge, z.einheit, idx); out.push(...s.bedarf); probleme.push(...s.probleme); continue; }
    const bA = EINHEITEN[a.packung?.einheit || a.einheit]?.basis;
    if (bA && bA !== bZ) { probleme.push({ name: z.name, grund: "einheit" }); continue; }
    const roh = rohmengeFuer(inBasis(z.menge, z.einheit), garverlustAnteil(a).wert);
    if (roh === null) { probleme.push({ name: z.name, grund: "menge" }); continue; }
    out.push({ name: z.name, menge: roh, basis: bZ });
  }
  return { bedarf: out, probleme };
}
const artikelIndex = (stand) => Object.fromEntries((stand.artikel || []).map((a) => [a.name, a]));

// (b) Soll-Verbrauch je Ware = Σ Menge × Rezeptzutat (in g/ml/Stück) und in Euro (Einkaufspreis netto; Richtpreis = Schätzung).
// mengen: { gerichtId: Portionen }. Rückgabe: artikel {name: {menge, basis, wert, geschaetzt, ohnePreis, ueber:[…]}}, ohneRezept, probleme.
export function sollVerbrauch(stand, mengen, idx = artikelIndex(stand)) {
  const artikel = {}; const ohneRezept = []; const probleme = [];
  for (const [id, m] of Object.entries(mengen || {})) {
    if (!(m > 0)) continue;
    const g = (stand.gerichte || []).find((x) => x.id === id); if (!g) continue;
    const b = bedarfGericht(g, idx);
    if (b.probleme.some((p) => p.grund === "rezept")) { ohneRezept.push({ gericht: id, name: g.name, menge: m }); continue; }
    for (const p of b.probleme) probleme.push({ ...p, gericht: id, gerichtName: g.name, menge: m });
    for (const x of b.bedarf) { const z = artikel[x.name] ??= { name: x.name, menge: 0, basis: x.basis, ueber: [] }; z.menge += x.menge * m; if (x.ueber && !z.ueber.includes(x.ueber)) z.ueber.push(x.ueber); }
  }
  for (const z of Object.values(artikel)) { const a = idx[z.name]; const pj = a ? preisJeBasis(a) : null; z.wert = pj === null ? null : z.menge * pj; z.ohnePreis = pj === null; z.geschaetzt = !!a && preisGeschaetzt(a); }
  return { artikel, ohneRezept, probleme };
}

// Verbrauch aus erfasstem Müll und Personalessen (Schwund-Journal) je Ware – damit er nicht als Schwund-Verdacht doppelt zählt.
// Teller → über das Rezept, Rohware → direkt. Eimer (nur gewogen) lässt sich keiner Ware zuordnen: eigener Posten in kg.
export function schwundVerbrauch(stand, { von, bis }, idx = artikelIndex(stand)) {
  const muell = {}, personal = {}; let eimerKg = 0, eintraege = 0; const ohne = [];
  const dazu = (ziel, name, menge, basis) => { const z = ziel[name] ??= { menge: 0, basis }; z.menge += menge; };
  for (const e of stand.schwund || []) {
    if (e.storniert || typeof e.datum !== "string" || e.datum < von || e.datum > bis) continue;
    const vorgang = SCHWUND_ARTEN[e.art] || 1; const ziel = vorgang === 1 ? muell : personal; eintraege += 1;
    if (e.art === "eimer") { eimerKg += Number(e.menge) || 0; continue; }
    if (e.ref?.typ === "artikel") { const b = EINHEITEN[e.einheit]?.basis; if (!b) { ohne.push(e.id); continue; }
      // Prüfgremium 17.10.2026 (6): Selbstgemachtes (Teig, Soße …) über sein Rezept auf die Rohware – wie der Soll-Verbrauch
      const s = selbstAufRohware(idx[e.ref.name], Number(e.menge) || 0, e.einheit, idx);
      if (s) { if (!s.bedarf.length) { ohne.push(e.id); continue; } for (const x of s.bedarf) dazu(ziel, x.name, x.menge, x.basis); continue; }
      dazu(ziel, e.ref.name, inBasis(e.menge, e.einheit), b); continue; }
    if (e.ref?.typ === "gericht") {
      const g = (stand.gerichte || []).find((x) => x.id === e.ref.id); if (!g) { ohne.push(e.id); continue; }
      const b = bedarfGericht(g, idx); if (!b.bedarf.length) { ohne.push(e.id); continue; }
      for (const x of b.bedarf) dazu(ziel, x.name, x.menge * (Number(e.menge) || 0), x.basis);
      continue;
    }
    ohne.push(e.id);
  }
  return { muell, personal, eimerKg, eintraege, ohneZuordnung: ohne.length };
}

// Inhalt eines Gebindes in der Basiseinheit (Inventur zählt Gebinde). null = Gebinde-Inhalt unbekannt.
const inhaltBasis = (a) => (a && a.packung?.menge > 0 && EINHEITEN[a.packung.einheit] ? inBasis(a.packung.menge, a.packung.einheit) : null);
const basisVon = (a) => EINHEITEN[a?.packung?.einheit || a?.einheit]?.basis || null;
// Einkauf je Ware aus den Belegen im Zeitraum (nicht storniert): Gebinde × Inhalt; „je kg“ ohne Inhalt = Menge in kg.
export function einkaufMengen(stand, { von, bis }) {
  const out = {};
  for (const l of stand.lieferungen || []) {
    if (l.storniert || typeof l.datum !== "string" || l.datum < von || l.datum > bis) continue;
    for (const z of l.zeilen || []) {
      if (!z.artikel) continue; const o = out[z.artikel] ??= { menge: 0, basis: null, zeilen: 0, unklar: 0 }; o.zeilen += 1;
      const n = Number(z.menge);
      if (!Number.isFinite(n)) { o.unklar += 1; continue; }
      if (z.inhaltMenge > 0 && EINHEITEN[z.inhaltEinheit]) { const b = EINHEITEN[z.inhaltEinheit].basis; if (o.basis && o.basis !== b) { o.unklar += 1; continue; } o.basis = b; o.menge += n * inBasis(z.inhaltMenge, z.inhaltEinheit); }
      else if (z.jeKg) { if (o.basis && o.basis !== "g") { o.unklar += 1; continue; } o.basis = "g"; o.menge += n * 1000; }
      else o.unklar += 1;
    }
  }
  return out;
}

// Grenze, ab der eine Differenz auffällt: gezählt wird in Vierteln eines Gebindes (zweimal gezählt → ¼ Gebinde Spielraum),
// Rezepte sind Durchschnitte (5 % der erwarteten Menge). Annahme E7 (17.10.2026), im Bericht e7.md beschrieben.
export const TOLERANZ_GEBINDE = 0.25, TOLERANZ_ANTEIL = 0.05;

// (c) Abgleich mit der Inventur: Ist-Verbrauch = Anfang + Einkauf − Ende (zwischen zwei abgeschlossenen Inventuren, Zeitraum wie inventurVergleich:
// Tag nach der vorigen Inventur bis einschließlich Tag dieser). Erwartet = Soll aus Verkäufen + erfasster Müll + Personalessen.
// Differenz Ist − Erwartet in Menge und Euro: > Toleranz = Schwund-Verdacht; < −Toleranz = weniger verbraucht als erwartet (oder Einkauf ohne Beleg).
export function abgleichInventur(stand, inv = null, vorher = null) {
  const fertig = inventurenFertig(stand);
  inv ??= fertig[fertig.length - 1] || null; vorher ??= inv ? inventurVorher(stand, inv) : null;
  if (!inv || !vorher) return null;
  const von = tagPlus(vorher.datum, 1), bis = inv.datum; if (bis < von) return { von, bis, zeilen: [], gleicherTag: true };
  const idx = artikelIndex(stand);
  const vk = verkaufJeGericht(stand, { von, bis });
  const mengen = Object.fromEntries(vk.zeilen.filter((r) => r.menge > 0).map((r) => [r.gericht, r.menge]));
  const soll = sollVerbrauch(stand, mengen, idx);
  const sw = schwundVerbrauch(stand, { von, bis }, idx);
  const ek = einkaufMengen(stand, { von, bis });
  // Nur Waren, die in einem Rezept der Karte stehen (direkt oder über Selbstgemachtes): Putzmittel & Co. haben kein Soll
  const rezeptWaren = new Set(); for (const g of stand.gerichte || []) for (const x of bedarfGericht(g, idx).bedarf) rezeptWaren.add(x.name);
  const namen = new Set([...Object.keys(soll.artikel), ...[...Object.keys(inv.posten || {}), ...Object.keys(vorher.posten || {})].filter((n) => rezeptWaren.has(n))]);
  const zeilen = [];
  for (const name of namen) {
    const a = idx[name] || null; const jetzt = inhaltBasis(a);
    // E7 (17.10.2026): bei der Inventur gespeicherter Packungsinhalt gewinnt (Gebinde kann sich seitdem geändert haben)
    const iA = vorher.inhalte?.[name] > 0 ? vorher.inhalte[name] : jetzt, iE = inv.inhalte?.[name] > 0 ? inv.inhalte[name] : jetzt; const inhalt = iE; const basis = basisVon(a) || soll.artikel[name]?.basis || null;
    const mA = mengeSauber(vorher.posten?.[name]), mE = mengeSauber(inv.posten?.[name]);
    const s = soll.artikel[name]?.menge || 0, mu = sw.muell[name]?.menge || 0, pe = sw.personal[name]?.menge || 0;
    const erwartet = s + mu + pe; const e = ek[name] || { menge: 0, basis: null, zeilen: 0, unklar: 0 };
    const pj = a ? preisJeBasis(a) : null;
    const z = { name, basis, inhalt, soll: s, muell: mu, personal: pe, erwartet, einkauf: e.menge, belegZeilen: e.zeilen, anfang: null, ende: null, ist: null, diff: null, diffWert: null, toleranz: null,
      preisJeBasis: pj, geschaetzt: !!a && preisGeschaetzt(a), ueber: soll.artikel[name]?.ueber || [], status: "ok" };
    if (mA === null || mE === null) z.status = "nichtGezaehlt";
    else if (inhalt === null || iA === null || (e.basis && basis && e.basis !== basis) || e.unklar) z.status = "unklar";
    else {
      z.anfang = mA * (iA ?? inhalt); z.ende = mE * inhalt; z.ist = z.anfang + e.menge - z.ende; z.diff = z.ist - erwartet;
      z.toleranz = Math.max(TOLERANZ_GEBINDE * inhalt, TOLERANZ_ANTEIL * erwartet);
      z.diffWert = pj === null ? null : z.diff * pj;
      if (z.diff > z.toleranz) z.status = "schwund";
      else if (z.diff < -z.toleranz) z.status = e.zeilen ? "weniger" : "einkaufFehlt";
    }
    zeilen.push(z);
  }
  const ordnung = { schwund: 0, einkaufFehlt: 1, weniger: 2, unklar: 3, nichtGezaehlt: 4, ok: 5 };
  zeilen.sort((x, y) => ordnung[x.status] - ordnung[y.status] || (y.diffWert ?? 0) - (x.diffWert ?? 0) || x.name.localeCompare(y.name, "de"));
  const schwund = zeilen.filter((x) => x.status === "schwund");
  return { von, bis, vorherDatum: vorher.datum, datum: inv.datum, zeilen, verkaufTage: vk.tage, eimerKg: sw.eimerKg,
    schwund: { anzahl: schwund.length, wert: schwund.reduce((t, x) => t + (x.diffWert || 0), 0), ohneWert: schwund.filter((x) => x.diffWert === null).length, geschaetzt: schwund.some((x) => x.geschaetzt) },
    zaehl: Object.fromEntries(Object.keys(ordnung).map((k) => [k, zeilen.filter((x) => x.status === k).length])), soll, verkauf: vk };
}

// (d) Ladenhüter: Gerichte ohne Verkauf oder mit sehr wenig (unter 10 % des Durchschnitts der verkauften Gerichte) im Zeitraum.
// Totes Lager: Ware im Bestand der letzten Inventur, die kein verkauftes Gericht braucht – mit gebundenem Geld (Bestand × Preis der Inventur).
export const WENIG_ANTEIL = 0.1;
export function ladenhueter(stand, z, vk = verkaufJeGericht(stand, z)) {
  if (!(vk.menge > 0)) return { gerichte: [], totesLager: [], gebunden: 0, ohneDaten: true };
  const verkauft = vk.zeilen.filter((r) => r.menge > 0); const schnitt = verkauft.reduce((s, r) => s + r.menge, 0) / verkauft.length;
  const gerichte = vk.zeilen.filter((r) => r.menge <= 0 || r.menge < WENIG_ANTEIL * schnitt).map((r) => ({ gericht: r.gericht, name: r.name, menge: r.menge, art: r.menge <= 0 ? "keinVerkauf" : "wenig", schnitt }));
  const idx = artikelIndex(stand); const gebraucht = new Set();
  for (const r of verkauft) { const g = (stand.gerichte || []).find((x) => x.id === r.gericht); if (g) for (const x of bedarfGericht(g, idx).bedarf) gebraucht.add(x.name); }
  const inv = inventurenFertig(stand).filter((i) => i.datum <= z.bis).pop() || null;
  const totesLager = [];
  if (inv) for (const [name, roh] of Object.entries(inv.posten || {})) {
    const m = mengeSauber(roh); if (!(m > 0) || gebraucht.has(name) || (inv.ausgeblendet || []).includes(name)) continue;
    const a = idx[name] || null; if (lagerortFuer(a || { name }) === "reinigung") continue; // Putzmittel & Co. braucht kein Gericht
    const p = inv.preise && typeof inv.preise[name] === "number" ? inv.preise[name] : a ? preisNettoGebinde(a) : null;
    const richt = Array.isArray(inv.richtpreise) ? inv.richtpreise.includes(name) : !!a && istRichtpreis(a);
    totesLager.push({ name, menge: m, gebinde: a?.gebinde?.art || "packung", wert: p === null ? null : m * p, geschaetzt: richt, inventur: inv.datum });
  }
  totesLager.sort((a, b) => (b.wert ?? -1) - (a.wert ?? -1) || a.name.localeCompare(b.name, "de"));
  return { gerichte, totesLager, gebunden: totesLager.reduce((s, x) => s + (x.wert || 0), 0), geschaetzt: totesLager.some((x) => x.geschaetzt && x.wert !== null), inventur: inv?.datum || null, ohneDaten: false };
}

// (e) Ehrlichkeit: was fehlt, damit die Zahlen stimmen – ausdrücklich, nie still.
export function ehrlichkeit(stand, z, vk = verkaufJeGericht(stand, z)) {
  const mengen = Object.fromEntries(vk.zeilen.filter((r) => r.menge > 0).map((r) => [r.gericht, r.menge]));
  const soll = sollVerbrauch(stand, mengen);
  const ohnePreis = Object.values(soll.artikel).filter((a) => a.ohnePreis).map((a) => a.name);
  const geschaetzt = Object.values(soll.artikel).filter((a) => a.geschaetzt).map((a) => a.name);
  const umsatzMit = vk.umsatz; const tageUmsatz = new Set((stand.tagesnotizen || []).filter((n) => !n.storniert && typeof n.umsatz === "number" && n.datum >= z.von && n.datum <= z.bis).map((n) => n.datum));
  const tageVerkauf = new Set(verkaeufeImZeitraum(stand, z).eintraege.map((v) => v.datum));
  return {
    mengeOhneZuordnung: vk.ohneZuordnung.menge, anteilMengeOhne: vk.menge > 0 ? vk.ohneZuordnung.menge / vk.menge : 0,
    umsatzOhneZuordnung: vk.ohneZuordnung.umsatz, anteilUmsatzOhne: umsatzMit > 0 ? vk.ohneZuordnung.umsatz / umsatzMit : null,
    texteOhne: vk.ohneZuordnung.texte, ohneRezept: soll.ohneRezept, probleme: soll.probleme, ohnePreis, geschaetzt,
    tageOhneVerkauf: [...tageUmsatz].filter((d) => !tageVerkauf.has(d)).sort(), tageDoppelt: vk.doppelt,
  };
}

// Zeitraum der Auswertung: zwischen den letzten zwei Inventuren, sonst die letzten 30 Geschäftstage bis gestern.
export function auswertungZeitraum(stand, { heuteTag = heuteGeschaeft() } = {}) {
  const f = inventurenFertig(stand);
  if (f.length >= 2) { const inv = f[f.length - 1], vor = inventurVorher(stand, inv); if (vor && inv.datum >= tagPlus(vor.datum, 1)) return { von: tagPlus(vor.datum, 1), bis: inv.datum, quelle: "inventur" }; }
  return { von: tagPlus(heuteTag, -30), bis: tagPlus(heuteTag, -1), quelle: "tage" };
}
export function verkaufAuswertung(stand, z = auswertungZeitraum(stand)) {
  const vk = verkaufJeGericht(stand, z);
  return { zeitraum: z, verkauf: vk, ladenhueter: ladenhueter(stand, z, vk), ehrlich: ehrlichkeit(stand, z, vk), abgleich: z.quelle === "inventur" ? abgleichInventur(stand) : null };
}
