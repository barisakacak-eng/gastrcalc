// Speicherung auf dem Gerät: IndexedDB, EIN Dokument ("Wurzel") mit allen Läden dieses Handys
// plus ein Ereignisprotokoll (nur lokal, Teil der Sicherungsdatei).
// Nichts verlässt das Gerät, außer der Tester exportiert die Datei selbst.
//
// Schema 4 (Etappe 5): Wurzel = { schema, sprache, aktiv, geraet, lfd, letzteSicherung, betriebe: [Betrieb, …] }.
// Neu gegenüber Schema 3: Kostenposten tragen basis (netto/brutto), Artikel tragen Gebinde, Preisbasis und Preisverlauf,
// der eigene Lohn ist eine Kostenzeile, dazu die Journale lieferungen (Belege) und abschluesse (Tag abschließen).
// Journale (schwund, messungen, rundgaenge, tagesnotizen, lieferungen, abschluesse) werden nur angehängt; Rücknahme = storniert.
// Schema 5 (Etappe 6a): dazu uploads (Beschreibung abgelegter Fotos/Dateien – die Datei selbst liegt in der Ablage, nie im Laden),
// kostenbelege (Rechnungen mit Kostenstelle und Verteilung) und weg ("schnell" | "genau") für die Einrichtung.
// Schema 1 (Einzelbetrieb), 2 und 3 werden beim Laden gehoben. Eine neuere Datei als diese App wird abgewiesen.

import { debounce, uid, heute } from "./util.js";
import { FORMATE } from "./data/formate.js";
import { KUECHEN } from "./data/kuechen.js";
import { basisStandard } from "./data/kosten.js";
import { GEBINDE_ARTEN } from "./engine.js";

export const SCHEMA = 5;
export const APP_FASSUNG = "etappe6a";
const DB_NAME = "gastrocalc";
const DB_VERSION = 1;
const EREIGNISSE_MAX = 2000;

export function leererBetrieb() {
  return {
    id: uid(),
    angelegt: new Date().toISOString(),
    geaendert: null,
    phase: "onboarding",        // "onboarding" | "app"
    weg: "schnell",             // Einrichtung: "schnell" (Foto zuerst, Etappe 6a) | "genau" (alle Schritte wie bis Etappe 5)
    schritt: 0,                 // aktueller Onboarding-Schritt
    betrieb: { name: "", format: null, kuechen: [], tageProWoche: 6, monate: 12, steuerSatz: null }, // steuerSatz: eigener Mischsatz für den Umsatz (null = aus der Karte oder 7 %)
    team: { personen: null, stundenProPerson: null, lohnkosten: null, eigenerLohn: null, eigenerLohnStatus: "geschaetzt" }, // eigenerLohn null + geschaetzt = Richtwert gilt
    kosten: [],                 // {id, kategorie, posten, betrag, status, periode, basis: netto|brutto}
    kostenKategorienGeprueft: [],
    kanaele: { vorOrt: true, abholung: true, eigeneLieferung: false, portale: [] },
    verkauf: { zielgewinn: 10, zielgewinnStatus: "vorschlag", bestellungenTag: null, warenQuote: null }, // warenQuote: eigener Wareneinsatz-Anteil 0..1 (null = aus der Karte)
    artikel: [], gerichte: [],  // artikel: {name, gruppe, einheit, packung:{menge,einheit}, gebinde:{art, zwischen:{art,anzahl}|null}, preis, preisBasis, preisHistorie:[{datum,preis,menge,einheit}]}
    lieferungen: [],            // nur anhängen: eingelesene Belege {id, datum, erfasst, lieferant, typ, basis, summeNetto, summeBrutto, zeilen:[…], storniert}
    uploads: [],                // nur anhängen: {id, datei:{id, ort, typ, groesse, name, zweck, erstellt}, zweck, erfasst, status, auswertung:{quelle, art, dauerMs, zeichen}, ergebnis}
    kostenbelege: [],           // nur anhängen: {id, datum, erfasst, stelle, betrag, basis, satz, verteilung, monate, ab, upload, lieferant, storniert}
    abschluesse: [],            // nur anhängen: Tag abschließen {id, datum, erfasst, geraet, umsatz, muell, kuehl, stand}
    schwund: [],                // nur anhängen; Rücknahme = storniert:true
    tagesnotizen: [],           // nur anhängen: {id, datum, umsatz, erfasst, nacherfasst} – der jüngste Eintrag je Datum gilt
    personen: [],               // {id, kuerzel, aktiv, entfernt} – wer misst; Kürzel änderbar (Pseudonymisierung), Einträge zeigen nur die id
    kuehl: { takt: 1, ruhetage: [], eingerichtet: false, seit: null }, // takt: Messungen je Tag (1 oder 2); ruhetage: 0=So … 6=Sa; seit: erster Tag mit Kühlstellen
    kuehlstellen: [],           // {id, name, art: kuehl|tk|warm, min, max, reihe, archiviert}
    rundgaenge: [],             // {id, datum, von, gestartet, abgeschlossen, nacherfasst, quelle, messungen:[…]} – bis zum Abschluss änderbar, danach nur anhängen
    messungen: [],              // abgeschlossene Messungen: {id, lfd, rundgang, stelle, datum, zeit, wert|null, grund, min, max, abweichung, massnahmen, notiz, nachkontrolle, von, erfasst, nacherfasst, quelle}
    inventuren: [],             // Punkt 3: {id, datum, begonnen, abgeschlossen|null, posten:{name: menge|null}, ausgeblendet:[name], preise?, wert?} – offene änderbar, abgeschlossene nur anhängen (js/inventur.js)
  };
}

export function leereWurzel() {
  return { schema: SCHEMA, sprache: null, aktiv: null, geraet: uid(), lfd: 0, letzteSicherung: null, sicherungZaehler: 0, betriebe: [] };
}

// Lückenlose laufende Nummer je Gerät – eine fehlende Nummer in der Sicherung zeigt eine Löschung.
export function naechsteLfd(wurzel) { wurzel.lfd = (Number(wurzel.lfd) || 0) + 1; return wurzel.lfd; }

let db = null;
let verfuegbar = true;
let fehlerMelder = null; // app.js hängt sich hier ein, damit ein fehlgeschlagenes Speichern sichtbar wird
export function beiSpeicherFehler(fn) { fehlerMelder = fn; }

function openDb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains("stand")) d.createObjectStore("stand");
      if (!d.objectStoreNames.contains("ereignisse")) d.createObjectStore("ereignisse", { autoIncrement: true });
    };
    r.onblocked = () => rej(new Error("Speicher blockiert: ein anderes Fenster der App ist noch offen"));
    r.onsuccess = () => {
      const d = r.result;
      d.onversionchange = () => { d.close(); db = null; verfuegbar = false; if (fehlerMelder) fehlerMelder("fassung"); };
      res(d);
    };
    r.onerror = () => rej(r.error);
  });
}

function tx(store, mode, fn) {
  return new Promise((res, rej) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const out = fn(s);
    t.oncomplete = () => res(out instanceof IDBRequest ? out.result : out);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  });
}

export async function laden() {
  try {
    db = await openDb();
    const s = await tx("stand", "readonly", (st) => st.get("main"));
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    if (s && Number(s.schema) > SCHEMA) { const e = new Error("Stand stammt aus einer neueren Fassung"); e.grund = "neuer"; throw e; }
    await ereignisseDeckeln();
    return s ? migrierenWurzel(s) : leereWurzel();
  } catch (e) {
    if (e.grund === "neuer") throw e;
    console.warn("Speicher nicht verfügbar, Daten nur in dieser Sitzung:", e);
    verfuegbar = false;
    return leereWurzel();
  }
}

const istObjekt = (x) => x && typeof x === "object" && !Array.isArray(x);
function kurzHash(str) { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0; return h.toString(36); }

function ergaenze(ziel, vorlage) {
  for (const k of Object.keys(vorlage)) {
    const v = vorlage[k];
    if (Array.isArray(v)) { if (!Array.isArray(ziel[k])) ziel[k] = []; }
    else if (istObjekt(v)) { if (!istObjekt(ziel[k])) ziel[k] = {}; ergaenze(ziel[k], v); }
    else if (ziel[k] === undefined) ziel[k] = v;
  }
  return ziel;
}

const mitId = (liste) => liste.filter((e) => istObjekt(e) && typeof e.id === "string");

// Ein einzelner Betrieb (Schema 1, 2 oder 3) wird geprüft und vervollständigt.
export function migrierenBetrieb(s, { alt = false } = {}) { // alt: Betrieb stammt aus Schema ≤ 3
  if (!istObjekt(s)) return leererBetrieb();
  const leer = leererBetrieb();
  if (typeof s.id !== "string" || !s.id) s.id = leer.id;
  ergaenze(s, leer);
  s.kosten = s.kosten.filter((k) => istObjekt(k) && typeof k.posten === "string" && typeof k.kategorie === "string")
    .map((k) => ({ ...k, betrag: typeof k.betrag === "number" && Number.isFinite(k.betrag) ? k.betrag : null,
                   status: ["aus", "bekannt", "geschaetzt", "offen"].includes(k.status) ? k.status : "offen",
                   periode: k.periode === "jahr" ? "jahr" : "monat",
                   // Schema ≤ 3 kannte keine Basis: eingetragene Zahlen bleiben, wie sie sind (netto = so verrechnen, wie eingetragen)
                   basis: k.basis === "brutto" || k.basis === "netto" ? k.basis : (alt ? "netto" : basisStandard(k.posten)) }));
  if (typeof s.betrieb.steuerSatz !== "number" || !(s.betrieb.steuerSatz >= 0 && s.betrieb.steuerSatz < 1)) s.betrieb.steuerSatz = null;
  if (!["geschaetzt", "eigen", "offen"].includes(s.team.eigenerLohnStatus)) s.team.eigenerLohnStatus = typeof s.team.eigenerLohn === "number" ? "eigen" : "geschaetzt";
  if (typeof s.verkauf.warenQuote !== "number" || !(s.verkauf.warenQuote >= 0 && s.verkauf.warenQuote < 0.9)) s.verkauf.warenQuote = null;
  s.kanaele.portale = s.kanaele.portale.filter(istObjekt).map((p) => ({ id: String(p.id || uid()), name: String(p.name || ""),
    provision: typeof p.provision === "number" ? p.provision : null, basis: ["netto", "brutto", "unbekannt"].includes(p.basis) ? p.basis : "unbekannt" }));
  s.betrieb.name = String(s.betrieb.name || "").slice(0, 40); s.betrieb.kuechen = s.betrieb.kuechen.filter((k) => KUECHEN.some((x) => x.id === k));
  if (!FORMATE.some((f) => f.id === s.betrieb.format)) s.betrieb.format = null; // unbekannte Kennungen aus fremden Dateien
  s.betrieb.tageProWoche = Math.min(7, Math.max(1, Number(s.betrieb.tageProWoche) || 6));
  s.betrieb.monate = Math.min(12, Math.max(1, Number(s.betrieb.monate) || 12));
  s.gerichte = mitId(s.gerichte).map((g) => ({ ...g, zutaten: Array.isArray(g.zutaten) ? g.zutaten.filter(istObjekt) : [] }));
  s.artikel = s.artikel.filter((a) => istObjekt(a) && typeof a.name === "string").map((a) => ({ ...a,
    gebinde: istObjekt(a.gebinde) && GEBINDE_ARTEN.includes(a.gebinde.art) ? { art: a.gebinde.art, zwischen: istObjekt(a.gebinde.zwischen) && Number(a.gebinde.zwischen.anzahl) > 0 ? { art: String(a.gebinde.zwischen.art || "beutel"), anzahl: Number(a.gebinde.zwischen.anzahl) } : null } : { art: "packung", zwischen: null },
    preisBasis: a.preisBasis === "brutto" ? "brutto" : "netto",
    preisHistorie: (Array.isArray(a.preisHistorie) ? a.preisHistorie : []).filter((h) => istObjekt(h) && typeof h.datum === "string" && typeof h.preis === "number").slice(-24) }));
  s.lieferungen = mitId(s.lieferungen).filter((l) => typeof l.datum === "string").map((l) => ({ ...l, zeilen: Array.isArray(l.zeilen) ? l.zeilen.filter(istObjekt) : [], storniert: !!l.storniert }));
  s.abschluesse = mitId(s.abschluesse).filter((a) => typeof a.datum === "string");
  s.uploads = mitId(s.uploads).filter((u) => istObjekt(u.datei) && typeof u.datei.id === "string");
  s.kostenbelege = mitId(s.kostenbelege).filter((k) => typeof k.stelle === "string" && typeof k.betrag === "number" && typeof k.ab === "string").map((k) => ({ ...k, storniert: !!k.storniert }));
  // Läden, die schon vor Etappe 6a mitten in der Einrichtung waren, bleiben auf dem genauen Weg
  if (!["schnell", "genau"].includes(s.weg)) s.weg = alt || s.schritt > 0 || s.phase === "app" ? "genau" : "schnell";
  s.schwund = mitId(s.schwund).filter((e) => typeof e.datum === "string");
  // Tagesnotizen Schema ≤ 2: ein Wert je Datum ohne id → Journal-Einträge
  s.tagesnotizen = s.tagesnotizen.filter((n) => istObjekt(n) && typeof n.datum === "string" && typeof n.umsatz === "number")
    .map((n) => ({ id: typeof n.id === "string" ? n.id : "alt-" + kurzHash(n.datum + "|" + n.umsatz + "|" + (n.geaendert || "")), datum: n.datum, umsatz: n.umsatz,
      erfasst: typeof n.erfasst === "string" ? n.erfasst : (n.geaendert || n.datum + "T00:00:00.000Z"), nacherfasst: !!n.nacherfasst, storniert: !!n.storniert }));
  s.personen = mitId(s.personen).map((p) => ({ id: p.id, kuerzel: String(p.kuerzel || "").slice(0, 12), aktiv: p.aktiv !== false, entfernt: !!p.entfernt }));
  s.kuehl.takt = s.kuehl.takt === 2 ? 2 : 1; if (typeof s.kuehl.seit !== "string") s.kuehl.seit = null; s.kuehl.ruhetage = (Array.isArray(s.kuehl.ruhetage) ? s.kuehl.ruhetage : []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  s.kuehlstellen = mitId(s.kuehlstellen).map((k, i) => ({ id: k.id, name: String(k.name || "").slice(0, 40), art: ["kuehl", "tk", "warm"].includes(k.art) ? k.art : "kuehl",
    min: typeof k.min === "number" ? k.min : null, max: typeof k.max === "number" ? k.max : null, reihe: Number.isFinite(k.reihe) ? k.reihe : i, archiviert: !!k.archiviert }));
  s.rundgaenge = mitId(s.rundgaenge).filter((r) => typeof r.datum === "string").map((r) => ({ ...r, messungen: Array.isArray(r.messungen) ? r.messungen.filter(istObjekt) : [] }));
  s.messungen = mitId(s.messungen).filter((m) => typeof m.datum === "string" && typeof m.stelle === "string").map((m) => ({ ...m,
    wert: typeof m.wert === "number" ? m.wert : null, massnahmen: Array.isArray(m.massnahmen) ? m.massnahmen.filter((x) => typeof x === "string") : [],
    notiz: typeof m.notiz === "string" ? m.notiz.slice(0, 200) : "", nachkontrolle: istObjekt(m.nachkontrolle) ? m.nachkontrolle : null, abweichung: !!m.abweichung, zeit: typeof m.zeit === "string" ? m.zeit : m.datum + "T00:00:00.000Z" }));
  // Inventuren (Punkt 3): Posten nur Zahlen ≥ 0 oder null, höchstens eine offene (die jüngste bleibt offen)
  s.inventuren = mitId(s.inventuren).filter((i) => typeof i.datum === "string").map((i) => ({ ...i,
    begonnen: typeof i.begonnen === "string" ? i.begonnen : i.datum + "T00:00:00.000Z", abgeschlossen: typeof i.abgeschlossen === "string" ? i.abgeschlossen : null,
    posten: Object.fromEntries(Object.entries(istObjekt(i.posten) ? i.posten : {}).map(([n, m]) => [n, typeof m === "number" && Number.isFinite(m) && m >= 0 ? m : null])),
    ausgeblendet: (Array.isArray(i.ausgeblendet) ? i.ausgeblendet : []).filter((n) => typeof n === "string") }));
  { const offen = s.inventuren.filter((i) => !i.abgeschlossen); if (offen.length > 1) s.inventuren = s.inventuren.filter((i) => i.abgeschlossen || i === offen[offen.length - 1]); }
  if (!["onboarding", "app"].includes(s.phase)) s.phase = "onboarding";
  s.schritt = Math.max(0, Number(s.schritt) || 0);
  delete s.schema; // gehört an die Wurzel
  return s;
}

// Wurzel aus dem Speicher oder aus einer Sicherung: Schema 1 wird gehoben, 2 und 3 geprüft.
export function migrierenWurzel(w) {
  if (!istObjekt(w)) return leereWurzel();
  if (Array.isArray(w.betriebe)) {
    const out = leereWurzel();
    out.sprache = ["de", "tr", "en"].includes(w.sprache) ? w.sprache : null;
    const alt = Number(w.schema) < 4;
    const vor6 = Number(w.schema) < 5;
    out.betriebe = w.betriebe.map((b) => { if (vor6 && !b.weg) b.weg = "genau"; return migrierenBetrieb(b, { alt }); });
    out.aktiv = out.betriebe.some((b) => b.id === w.aktiv) ? w.aktiv : (out.betriebe[0]?.id ?? null);
    if (typeof w.geraet === "string" && w.geraet) out.geraet = w.geraet;
    out.lfd = Math.max(0, Number(w.lfd) || 0);
    out.letzteSicherung = typeof w.letzteSicherung === "string" ? w.letzteSicherung : null;
    out.sicherungZaehler = Number(w.sicherungZaehler) || 0;
    return out;
  }
  // Schema 1: der alte Einzelbetrieb. Er hatte keine Kennung; sie wird aus Anlagezeit und Namen abgeleitet,
  // damit dieselbe Altdatei beim zweiten Einlesen denselben Laden ersetzt statt einen zweiten anzulegen.
  if (typeof w.id !== "string" || !w.id) w.id = "alt-" + kurzHash(String(w.angelegt || "") + "|" + String(w.betrieb?.name || ""));
  const b = migrierenBetrieb(w, { alt: true });
  const out = leereWurzel();
  out.sprache = ["de", "tr", "en"].includes(w.sprache) ? w.sprache : null;
  out.betriebe = [b]; out.aktiv = b.id;
  return out;
}

export const speicherVerfuegbar = () => verfuegbar;

function stempeln(wurzel) {
  const b = wurzel.betriebe.find((x) => x.id === wurzel.aktiv); if (b) b.geaendert = new Date().toISOString();
}

async function schreiben(wurzel) {
  if (!verfuegbar || !db) return false;
  try { await tx("stand", "readwrite", (st) => st.put(wurzel, "main")); return true; }
  catch (e) { console.warn("Speichern fehlgeschlagen:", e); if (fehlerMelder) fehlerMelder("speichern", e); return false; }
}

export const speichern = debounce((wurzel) => { stempeln(wurzel); schreiben(wurzel); }, 250);

export async function sofortSpeichern(wurzel, { stempel = true } = {}) {
  if (stempel) stempeln(wurzel);
  return schreiben(wurzel);
}
export const speichernAbbrechen = () => speichern.abbrechen();

// Zahl der Journal-Einträge aller Läden – für die Sicherungs-Erinnerung („20 neue Einträge seit der letzten Sicherung").
export function eintraegeZaehlen(wurzel) {
  return wurzel.betriebe.reduce((n, b) => n + b.schwund.length + b.tagesnotizen.length + b.messungen.length + (b.lieferungen || []).length + (b.abschluesse || []).length + (b.kostenbelege || []).length + (b.putzlog || []).length + (b.inventuren || []).filter((i) => i.abgeschlossen).length, 0);
}

// Ereignisprotokoll: nur lokal. Beantwortet die Testfragen (kommt der Tester durch, kommt er wieder?).
export async function ereignis(art, daten = {}) {
  const e = { id: uid(), zeit: new Date().toISOString(), art, fassung: APP_FASSUNG, ...daten };
  if (!verfuegbar || !db) return e;
  try { await tx("ereignisse", "readwrite", (st) => st.add(e)); } catch (_) {}
  return e;
}

export async function alleEreignisse() {
  if (!verfuegbar || !db) return [];
  return tx("ereignisse", "readonly", (st) => st.getAll());
}

// Deckel: die ältesten Einträge fliegen, sobald es mehr als EREIGNISSE_MAX sind.
async function ereignisseDeckeln() {
  const n = await tx("ereignisse", "readonly", (st) => st.count());
  if (n <= EREIGNISSE_MAX) return;
  let weg = n - EREIGNISSE_MAX;
  await tx("ereignisse", "readwrite", (st) => { const c = st.openCursor(); c.onsuccess = () => { const cur = c.result; if (cur && weg > 0) { cur.delete(); weg -= 1; cur.continue(); } }; });
}

// ---------- Sicherungsdatei ----------
// Zwei Zeilen: Kopf {typ, schema, sha256} und Inhalt (kompakt). Die Prüfsumme läuft über die Bytes der zweiten Zeile.
// Sie erkennt Übertragungs- und Bedienfehler, keine Absicht – wer die Datei ändert, kann sie neu rechnen. Das sagt die App so.

async function sha256Hex(text) {
  if (!globalThis.crypto?.subtle) return null; // unsicherer Kontext (http im LAN): ohne Prüfsumme statt gar nicht
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function exportDatei(wurzel) {
  await ereignis("export", { betriebe: wurzel.betriebe.length });
  const ereignisse = await alleEreignisse();
  const inhalt = JSON.stringify({ exportiert: new Date().toISOString(), geraet: wurzel.geraet, fassung: APP_FASSUNG, wurzel, ereignisse });
  const sha = await sha256Hex(inhalt);
  const kopf = JSON.stringify({ typ: "gastrocalc-sicherung", schema: SCHEMA, sha256: sha });
  const blob = new Blob([kopf + "\n" + inhalt], { type: "application/json" });
  const aktiv = wurzel.betriebe.find((b) => b.id === wurzel.aktiv);
  const stamm = wurzel.betriebe.length > 1 ? `${wurzel.betriebe.length}-laeden` : (aktiv?.betrieb.name || "laden");
  const name = `gastrocalc-${stamm.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()}-${heute()}.json`;
  wurzel.letzteSicherung = new Date().toISOString(); wurzel.sicherungZaehler = eintraegeZaehlen(wurzel);
  return { blob, name, fingerabdruck: sha ? sha.slice(0, 10) : null };
}

// Liest eine Sicherung (Schema 1 bis 4) und liefert {wurzel, ereignisse, pruefsumme: "ok"|"fehlt"|"abweichung"};
// wirft Fehler mit .grund = "format" | "neuer".
export async function importDatei(text) {
  const fehler = (grund) => { const e = new Error(grund); e.grund = grund; return e; };
  let d, pruefsumme = "fehlt";
  const nl = text.indexOf("\n");
  const kopfText = nl > 0 ? text.slice(0, nl).trim() : "";
  if (kopfText.startsWith("{") && kopfText.includes("gastrocalc-sicherung") && !kopfText.includes("\"wurzel\"") && !kopfText.includes("\"stand\"")) {
    let kopf; try { kopf = JSON.parse(kopfText); } catch (_) { throw fehler("format"); }
    if (Number(kopf.schema) > SCHEMA) throw fehler("neuer");
    const inhalt = text.slice(nl + 1).replace(/\s+$/, ""); // Zeilenenden, die ein Editor anhängt
    try { d = JSON.parse(inhalt); } catch (_) { throw fehler("format"); }
    if (typeof kopf.sha256 === "string") { const sha = await sha256Hex(inhalt); pruefsumme = sha === null ? "fehlt" : sha === kopf.sha256 ? "ok" : "abweichung"; }
    if (!istObjekt(d) || !istObjekt(d.wurzel)) throw fehler("format");
    return { wurzel: migrierenWurzel(d.wurzel), ereignisse: Array.isArray(d.ereignisse) ? d.ereignisse.filter(istObjekt) : [], pruefsumme };
  }
  try { d = JSON.parse(text); } catch (_) { throw fehler("format"); }
  if (!istObjekt(d) || d.typ !== "gastrocalc-sicherung" || !(istObjekt(d.wurzel) || istObjekt(d.stand))) throw fehler("format");
  if (Number(d.schema) > SCHEMA) throw fehler("neuer");
  return { wurzel: migrierenWurzel(d.wurzel || d.stand), ereignisse: Array.isArray(d.ereignisse) ? d.ereignisse.filter(istObjekt) : [], pruefsumme: "fehlt" };
}

// ---------- Zusammenführen ----------
// Journale: Vereinigung nach Kennung, Kennzeichen (storniert, entfernt, archiviert) gewinnen immer.
function journalVereinigen(a, b, kennzeichen = ["storniert"]) {
  const m = new Map();
  for (const e of [...(a || []), ...(b || [])]) {
    const alt = m.get(e.id);
    if (!alt) { m.set(e.id, e); continue; }
    // Bei gleicher Kennung gewinnt der jünger erfasste Eintrag; Kennzeichen (storniert/entfernt) gewinnen immer
    const [aelter, juenger] = String(e.erfasst || "") >= String(alt.erfasst || "") ? [alt, e] : [e, alt];
    const neu = { ...aelter, ...juenger };
    for (const k of kennzeichen) neu[k] = !!(alt[k] || e[k]);
    if (kennzeichen.includes("entfernt") && (alt.entfernt || e.entfernt)) { const q = alt.entfernt ? alt : e; neu.kuerzel = q.kuerzel; neu.aktiv = false; } // Pseudonym bleibt
    if (alt.storniertZeit || e.storniertZeit) neu.storniertZeit = alt.storniertZeit || e.storniertZeit;
    if (alt.wert === null && typeof e.wert === "number") neu.wert = e.wert; // nachgetragener Wert gewinnt über „offen"
    if (typeof alt.wert === "number" && e.wert === null) neu.wert = alt.wert;
    m.set(e.id, neu);
  }
  return [...m.values()];
}

export function verschmelzen(lokal, fremd) {
  const juengerFremd = String(fremd.geaendert || "") >= String(lokal.geaendert || "");
  const basis = structuredClone(juengerFremd ? fremd : lokal);
  const sortErfasst = (x, y) => String(x.erfasst || x.datum || "").localeCompare(String(y.erfasst || y.datum || ""));
  basis.schwund = journalVereinigen(lokal.schwund, fremd.schwund).sort(sortErfasst);
  basis.tagesnotizen = journalVereinigen(lokal.tagesnotizen, fremd.tagesnotizen).sort(sortErfasst);
  basis.messungen = journalVereinigen(lokal.messungen, fremd.messungen).sort(sortErfasst);
  basis.lieferungen = journalVereinigen(lokal.lieferungen, fremd.lieferungen).sort(sortErfasst);
  basis.abschluesse = journalVereinigen(lokal.abschluesse, fremd.abschluesse).sort(sortErfasst);
  basis.uploads = journalVereinigen(lokal.uploads, fremd.uploads).sort(sortErfasst);
  basis.kostenbelege = journalVereinigen(lokal.kostenbelege, fremd.kostenbelege).sort(sortErfasst);
  basis.personen = journalVereinigen(lokal.personen, fremd.personen, ["entfernt"]).map((p) => ({ ...p, aktiv: p.entfernt ? false : p.aktiv }));
  // Kühlstellen: Archivierung gewinnt; Name und Grenzen vom jüngeren Stand
  const stellen = new Map();
  for (const k of [...(juengerFremd ? lokal : fremd).kuehlstellen, ...(juengerFremd ? fremd : lokal).kuehlstellen]) {
    const alt = stellen.get(k.id); stellen.set(k.id, alt ? { ...alt, ...k, archiviert: !!(alt.archiviert || k.archiviert) } : k);
  }
  basis.kuehlstellen = [...stellen.values()].sort((x, y) => x.reihe - y.reihe);
  // Rundgänge: abgeschlossene vereinigen; ein offener Rundgang bleibt nur vom lokalen Stand
  const abgeschlossen = journalVereinigen((lokal.rundgaenge || []).filter((r) => r.abgeschlossen), (fremd.rundgaenge || []).filter((r) => r.abgeschlossen));
  const offen = (lokal.rundgaenge || []).filter((r) => !r.abgeschlossen);
  basis.rundgaenge = [...abgeschlossen, ...offen];
  // Inventuren wie Rundgänge: abgeschlossene vereinigen, eine offene nur vom lokalen Stand
  const invFertig = journalVereinigen((lokal.inventuren || []).filter((i) => i.abgeschlossen), (fremd.inventuren || []).filter((i) => i.abgeschlossen));
  const fertigIds = new Set(invFertig.map((i) => i.id)); // lokal offen, in der Datei schon fertig → nur die fertige behalten (Review 15.10.)
  basis.inventuren = [...invFertig, ...(lokal.inventuren || []).filter((i) => !i.abgeschlossen && !fertigIds.has(i.id))];
  // Putzplan-Protokoll ist Nachweis für die Kontrolle: Einträge beider Seiten behalten, Storno gewinnt (Review 15.10.)
  basis.putzlog = journalVereinigen(lokal.putzlog, fremd.putzlog).sort(sortErfasst);
  basis.geaendert = [lokal.geaendert, fremd.geaendert].filter(Boolean).sort().pop() || new Date().toISOString();
  return basis;
}

export function zusammenfuehren(wurzel, importiert) {
  const ids = new Set(wurzel.betriebe.map((b) => b.id));
  let ersetzt = 0, neu = 0;
  for (const b of importiert.betriebe) {
    const i = wurzel.betriebe.findIndex((x) => x.id === b.id);
    if (i >= 0) { wurzel.betriebe[i] = verschmelzen(wurzel.betriebe[i], b); ersetzt += 1; } else { wurzel.betriebe.push(b); ids.add(b.id); neu += 1; }
  }
  if (!wurzel.aktiv || !ids.has(wurzel.aktiv)) wurzel.aktiv = importiert.aktiv || wurzel.betriebe[0]?.id || null;
  if (!wurzel.sprache) wurzel.sprache = importiert.sprache;
  // Laufende Nummer: nie unter die höchste eigene Nummer fallen (Neuinstallation + Import)
  let maxEigen = 0;
  for (const b of wurzel.betriebe) for (const m of b.messungen) if (m.geraet === wurzel.geraet && Number(m.lfd) > maxEigen) maxEigen = Number(m.lfd);
  wurzel.lfd = Math.max(wurzel.lfd, maxEigen, importiert.geraet === wurzel.geraet ? (importiert.lfd || 0) : 0);
  return { ersetzt, neu };
}

export async function ereignisseUebernehmen(liste) {
  if (!verfuegbar || !db || !liste.length) return;
  const da = new Set((await alleEreignisse()).map((e) => e.id));
  const neu = liste.filter((e) => typeof e.id === "string" && !da.has(e.id));
  if (!neu.length) return;
  try { await tx("ereignisse", "readwrite", (st) => { for (const e of neu) st.add({ ...e, importiert: true }); }); } catch (_) {}
}

export async function allesLoeschen() {
  if (!verfuegbar || !db) return;
  await tx("stand", "readwrite", (st) => st.clear());
  await tx("ereignisse", "readwrite", (st) => st.clear());
}
