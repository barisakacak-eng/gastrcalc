// Hilfen für tests/lauf6_e11_abgleich.test.mjs: echte Rundreise zweier (dreier) Handys über exportDatei / importSicherung / einlesenSicher.
// Feste Uhr (setzeUhr/plusMin), IndexedDB-Attrappe, jedes Handy = Abbild der Datenbank. Aus den Nachstell-Skripten des Prüfers abgeleitet.
// Gemeinsame Hilfen der Daten-Prüfung (nur Node, ohne Browser). Fester Zufalls-Startwert, feste Uhr, IndexedDB-Attrappe, "Handys" als Speicherabbilder.
import { idbAttrappe } from "./idb_attrappe.mjs";
export const uhr = { ms: Date.parse("2027-01-15T19:00:00Z") };
const Echt = Date;
class D extends Echt { constructor(...a) { if (a.length === 0) super(uhr.ms); else super(...a); } static now() { return uhr.ms; } }
globalThis.Date = D;
export const setzeUhr = (iso) => { uhr.ms = Date.parse(iso); };
export const plusMin = (m) => { uhr.ms += m * 60000; };
let seed = 1;
export function setzeSeed(s) { seed = s >>> 0; }
export function rnd() { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
Math.random = rnd;
export const pick = (a) => a[Math.floor(rnd() * a.length)];
export const rint = (a, b) => a + Math.floor(rnd() * (b - a + 1));
export const att = idbAttrappe();
export const st = await import("../../js/store.js");
export const eng = await import("../../js/engine.js");
export const zl = await import("../../js/zip.js");
export const klon = (x) => structuredClone(x);
export const stabil = (x) => JSON.stringify(x, (k, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([p], [q]) => (p < q ? -1 : 1))) : v));
// Unterschiede zweier Werte als Pfadliste
export function diff(a, b, pfad = "", out = [], max = 60) {
  if (out.length >= max) return out;
  if (stabil(a) === stabil(b)) return out;
  if (a && b && typeof a === "object" && typeof b === "object" && Array.isArray(a) === Array.isArray(b)) {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (!(k in a)) out.push(`+ ${pfad}.${k} (nur rechts) = ${JSON.stringify(b[k])?.slice(0, 70)}`);
      else if (!(k in b)) out.push(`- ${pfad}.${k} (nur links) = ${JSON.stringify(a[k])?.slice(0, 70)}`);
      else diff(a[k], b[k], pfad + "." + k, out, max);
    }
  } else out.push(`~ ${pfad}: ${JSON.stringify(a)?.slice(0, 70)} -> ${JSON.stringify(b)?.slice(0, 70)}`);
  return out;
}
// ---- Handys: jedes Handy = Abbild der IndexedDB ----
const DB = "gastrocalc";
function abbild() { const e = att.dbs.get(DB); if (!e) return null; return { version: e.version, stores: [...e.stores].map(([n, s]) => [n, { auto: s.auto, n: s.n, daten: new Map([...s.daten].map(([k, v]) => [k, structuredClone(v)])) }]) }; }
function einspielen(b) {
  if (!b) { att.dbs.delete(DB); return; }
  att.dbs.set(DB, { version: b.version, stores: new Map(b.stores.map(([n, s]) => [n, { auto: s.auto, n: s.n, daten: new Map([...s.daten].map(([k, v]) => [k, structuredClone(v)])) }])) });
}
export class Handy {
  constructor(name) { this.name = name; this.bild = null; this.w = null; }
  async an() { att.transaktionen.length = 0; att.schreibvorgaenge.length = 0; einspielen(this.bild); this.w = await st.laden(); return this.w; }
  async speichern(opt = {}) { await st.sofortSpeichern(this.w, opt); this.bild = abbild(); }
  // Sicherung dieses Handys (ZIP-Blob)
  async sichern(opt = {}) { await this.an(); const r = await st.exportDatei(this.w, opt); this.bild = abbild(); return r; }
  // fremde Sicherung einlesen (wie die App: importSicherung → einlesenSicher → speichern)
  async einlesen(blob, opt = {}) {
    await this.an(); const r = await st.importSicherung(blob, opt); if (r.passwortNoetig) throw new Error("passwort");
    const e = await st.einlesenSicher(this.w, r.wurzel); await st.sofortSpeichern(this.w); await st.ereignisseUebernehmen(r.ereignisse); this.bild = abbild(); return { r, e };
  }
  async neustart() { await this.an(); return this.w; }
}
export async function leeresHandy(name, geraet) { const h = new Handy(name); einspielen(null); const w = await st.laden(); w.geraet = geraet || name; h.w = w; await st.sofortSpeichern(w, { stempel: false }); h.bild = abbild(); return h; }
export { abbild, einspielen };
export async function inhaltVon(blob) {
  const es = await zl.zipLesen(blob, { gepackt: true }); const j = es.find((e) => e.name === "gastrocalc-sicherung.json");
  const t = new TextDecoder().decode(await j.bytes()); return { text: t, kopf: JSON.parse(t.slice(0, t.indexOf("\n"))), d: JSON.parse(t.slice(t.indexOf("\n") + 1)), es };
}

// ---- ein voll benutzter Laden ----
// Ein voll benutzter Laden: Beispiel-Laden + alle Felder, die das Beispiel nicht füllt (Stunden, Schichten, Abwesenheit, Lieferdienst, Preisrunden, Chef, Geld, Zeki, Monatsabschluss …).
const { beispielLaden } = await import("../../js/beispiel.js");
const stamm = await import("../../js/stamm.js"); const sch = await import("../../js/schichten.js"); const w3 = await import("../../js/welle3.js");
const ma = await import("../../js/monatsabschluss.js"); const engine = await import("../../js/engine.js");
export const ISO = (ms) => new Date(ms).toISOString();
export function vollerLaden(heute = "2027-01-15", { id = "laden-voll", beispiel = false } = {}) {
  const b = beispielLaden(heute); b.id = id; if (!beispiel) delete b.beispiel; b.betrieb.name = "Imbiss Test";
  b.phase = "app";
  const P = b.personen.map((p) => p.id);
  // Stunden (teamTage), Lieferdienst, Abwesenheit, Preisrunden, Schichten, Chef, Geld, Zeki
  const start = Date.parse(heute + "T00:00:00Z");
  b.teamTage = []; b.lieferTage = []; b.schichten = []; b.preisRunden = []; b.abwesend = []; b.zekiLog = [];
  for (let i = 20; i >= 1; i--) {
    const d = new Date(start - i * 86400e3).toISOString().slice(0, 10);
    b.teamTage.push({ datum: d, eintraege: [{ person: P[0], name: "AB", stunden: 6 + (i % 3), satz: 12.5, art: "minijob" }, { person: P[1], name: "CD", stunden: 5, satz: 13, art: "angestellt" }], erfasst: ISO(start - i * 86400e3 + 20 * 3600e3) });
    b.lieferTage.push({ datum: d, betrag: 20 + i * 3, erfasst: ISO(start - i * 86400e3 + 21 * 3600e3) });
    b.schichten.push(...[0, 1].map((k) => { const e = { datum: d, person: P[k], von: "11:00", bis: "21:00", erfasst: ISO(start - i * 86400e3 + 8 * 3600e3 + k), storniert: false }; e.id = `s-${d}-${P[k]}-${e.erfasst.replace(/[^0-9]/g, "")}`; return e; }));
  }
  b.preisRunden.push({ datum: "2027-01-05", gericht: b.gerichte[0].id, alt: 6.5, neu: 7, mwst: 0.07, mengeMonat: 400 });
  b.abwesend.push({ monat: "2026-12", datum: "2026-12-30", eintraege: [{ person: P[0], name: "AB", tage: 2, stundenTag: 8, satz: 12.5, art: "minijob" }], erfasst: "2026-12-30T20:00:00.000Z" });
  b.chef = { stundenMonat: 200, geaendert: "2027-01-03T10:00:00.000Z" };
  b.liquiditaet = { betrag: 4321.5, datum: "2027-01-14" };
  b.zekiLog = [{ t: "2027-01-10T10:00:00.000Z", art: "frage", text: "hallo" }, { t: "2027-01-11T10:00:00.000Z", art: "antwort", text: "x" }];
  b.abschluesse.push({ id: "abs-1", datum: "2027-01-10", erfasst: "2027-01-10T23:00:00.000Z", geraet: "g1", umsatz: 800, muell: 3, kuehl: 4, stand: "ok" });
  b.kostenbelege.push({ id: "kb-1", datum: "2027-01-08", erfasst: "2027-01-08T10:00:00.000Z", stelle: "strom", betrag: 123.45, basis: "brutto", satz: 19, verteilung: "monat", monate: 1, ab: "2027-01", upload: null, lieferant: "Stadtwerke", storniert: false });
  b.wochenZaehlungen = [{ id: "wz-1", datum: "2027-01-04", werte: { a: 1 } }]; b.spiesse = [{ id: "sp-1", datum: "2027-01-05", kg: 30 }]; b.portionMessungen = [{ id: "pm-1", datum: "2027-01-06", gramm: 120 }];
  b.betrieb.hinweise = [{ id: "h1", status: "erledigt", zeit: "2027-01-02T10:00:00.000Z" }];
  b.zukuenftigesFeld = { aus: "neuerer Fassung", n: 5 }; // unbekanntes Feld (neuere Fassung)
  const w = st.leereWurzel(); w.betriebe.push(b); w.aktiv = id; w.sprache = "de"; w.geraet = "gerA";
  const m = st.migrierenWurzel(klon(w)); m.geraet = "gerA";
  ma.monatEinfrieren(m.betriebe[0], "2026-12", { jetzt: "2027-01-01T05:00:00.000Z" });
  return m;
}
