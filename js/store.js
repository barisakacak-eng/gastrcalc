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
import { pinWertGueltig, sperreSauber } from "./modus.js"; // W2-S: Prüfwert und Fehlversuch-Zähler des Büro-Codes

export const SCHEMA = 5;
export const APP_FASSUNG = "etappe6a";
const DB_NAME = "gastrocalc";
const DB_VERSION = 2; // 2 (Stresstest 15.10.): Speicher "teile" für die Journale in Monatsteilen
const EREIGNISSE_MAX = 2000;

// Alle Sprachen der App (i18n.js SPRACH_NAMEN); hier als Liste, damit store.js ohne i18n auskommt
const SPRACH_CODES = ["de", "tr", "en", "ar", "fa", "ku", "pl", "ro", "bg", "ru", "uk", "sq", "bs", "el", "it", "es", "fr", "vi"];
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
      if (!d.objectStoreNames.contains("teile")) d.createObjectStore("teile"); // Fassung 2: Journale in Monatsteilen
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

// Eine Transaktion über einen oder mehrere Speicher. fn bekommt die Transaktion; Rückgabe: Anfrage, Liste von Anfragen oder Wert.
// Erst wenn die Transaktion ganz durch ist, gilt sie (alles oder nichts).
function txMehr(stores, mode, fn) {
  return new Promise((res, rej) => {
    const t = db.transaction(stores, mode);
    const out = fn(t);
    const ergebnis = (x) => (typeof IDBRequest !== "undefined" && x instanceof IDBRequest ? x.result : x);
    t.oncomplete = () => res(Array.isArray(out) ? out.map(ergebnis) : ergebnis(out));
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  });
}
const tx = (store, mode, fn) => txMehr(store, mode, (t) => fn(t.objectStore(store)));

const fehlerNeuer = () => { const e = new Error("Stand stammt aus einer neueren Fassung"); e.grund = "neuer"; return e; };

export async function laden() {
  try {
    db = await openDb();
    grundlageVerwerfen(); altModus = false;
    const [kopf, alt] = await tx("stand", "readonly", (st) => [st.get("kopf"), st.get("main")]);
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    await ereignisseDeckeln();
    if (kopf) {
      if (Number(kopf.schema) > SCHEMA) throw fehlerNeuer();
      const teile = await tx("teile", "readonly", (st) => st.getAll());
      let roh = null;
      try { roh = zusammensetzen(kopf, teile); }
      catch (e) {
        console.warn("Geteilter Stand unvollständig:", e);
        if (!alt) throw e;
        // Der alte Gesamt-Datensatz ist noch da (Umzug nicht bestätigt): von ihm aus neu umziehen
      }
      if (roh) { const w = migrierenWurzel(roh); grundlageSetzen(w, teile); return w; }
    }
    if (alt) {
      if (Number(alt.schema) > SCHEMA) throw fehlerNeuer();
      const w = migrierenWurzel(alt);
      await umziehen(w);
      return w;
    }
    return leereWurzel();
  } catch (e) {
    if (e.grund === "neuer") throw e;
    console.warn("Speicher nicht verfügbar, Daten nur in dieser Sitzung:", e);
    verfuegbar = false;
    return leereWurzel();
  }
}

// Einmaliger Umzug vom alten Gesamt-Datensatz ("main") in Kopf + Monatsteile. Der alte Datensatz bleibt,
// bis der neue Stand zurückgelesen und als gleich bestätigt ist. Klappt das nicht, bleibt alles beim alten Format.
async function umziehen(w) {
  grundlageVerwerfen();
  const ok = await schreibenJetzt(w, { stempel: false });
  try {
    if (!ok) throw new Error("Umzug: Schreiben fehlgeschlagen");
    const [kopf] = await tx("stand", "readonly", (st) => [st.get("kopf")]);
    const teile = await tx("teile", "readonly", (st) => st.getAll());
    if (JSON.stringify(zusammensetzen(kopf, teile)) !== JSON.stringify(w)) throw new Error("Umzug: Rücklesen weicht ab");
    await tx("stand", "readwrite", (st) => st.delete("main"));
    ereignis("speicher-umzug", { teile: teile.length });
  } catch (e) {
    console.warn("Umzug in Monatsteile nicht bestätigt, Speicher bleibt im alten Format:", e);
    altModus = true; grundlageVerwerfen();
    await txMehr(["stand", "teile"], "readwrite", (t) => { t.objectStore("stand").delete("kopf"); t.objectStore("teile").clear(); }).catch(() => {});
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
  // Stresstest 15.10.: abgeschlossene Rundgänge tragen keine doppelte Kopie ihrer Messungen mehr (stehen vollständig im Journal)
  s.rundgaenge = s.rundgaenge.map((r) => (rundeDoppelt(r, s) ? { ...r, messungen: [] } : r));
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
    out.sprache = SPRACH_CODES.includes(w.sprache) ? w.sprache : null;
    const alt = Number(w.schema) < 4;
    const vor6 = Number(w.schema) < 5;
    out.betriebe = w.betriebe.map((b) => { if (vor6 && !b.weg) b.weg = "genau"; return migrierenBetrieb(b, { alt }); });
    out.aktiv = out.betriebe.some((b) => b.id === w.aktiv) ? w.aktiv : (out.betriebe[0]?.id ?? null);
    if (typeof w.geraet === "string" && w.geraet) out.geraet = w.geraet;
    out.lfd = Math.max(0, Number(w.lfd) || 0);
    out.letzteSicherung = typeof w.letzteSicherung === "string" ? w.letzteSicherung : null;
    out.sicherungZaehler = Number(w.sicherungZaehler) || 0;
    if (["laden", "personal", "buero"].includes(w.modus)) out.modus = w.modus; // Drei Ebenen: Modus je Handy
    if (pinWertGueltig(w.bueroPin)) out.bueroPin = w.bueroPin; else if (w.bueroPin === null) out.bueroPin = null; // nur der Prüfwert, nie die Ziffern (W2-S: auch PBKDF2 mit Salz)
    { const sp = sperreSauber(w.pinSperre); if (sp) out.pinSperre = sp; } // W2-S: Fehlversuche übersteht den Neustart
    return out;
  }
  // Schema 1: der alte Einzelbetrieb. Er hatte keine Kennung; sie wird aus Anlagezeit und Namen abgeleitet,
  // damit dieselbe Altdatei beim zweiten Einlesen denselben Laden ersetzt statt einen zweiten anzulegen.
  if (typeof w.id !== "string" || !w.id) w.id = "alt-" + kurzHash(String(w.angelegt || "") + "|" + String(w.betrieb?.name || ""));
  const b = migrierenBetrieb(w, { alt: true });
  const out = leereWurzel();
  out.sprache = SPRACH_CODES.includes(w.sprache) ? w.sprache : null;
  out.betriebe = [b]; out.aktiv = b.id;
  return out;
}

export const speicherVerfuegbar = () => verfuegbar;

function stempeln(wurzel) {
  const b = wurzel.betriebe.find((x) => x.id === wurzel.aktiv); if (b) b.geaendert = new Date().toISOString();
}

// ---------- Geteilte Speicherung (Stresstest 15.10.) ----------
// Ein Jahr Daten sind ~4,7 MB. Bis 15.10. wurde bei jedem Speichern alles kopiert und geschrieben (~200 ms Hänger bei langsamem Handy).
// Jetzt: ein kleiner Kopf (Wurzel + Läden ohne Journale) unter "kopf" im Speicher "stand" und die Journale in Monatsteilen
// im Speicher "teile", Schlüssel "ladenId|journal|JJJJ-MM". Geschrieben wird nur, was sich seit dem letzten Speichern geändert hat –
// Kopf und geänderte Teile in EINER Transaktion, also nie halb. Beim Laden entsteht genau dieselbe Form wie vorher.
//
// Wie Änderungen erkannt werden, ohne alles zu lesen (keine andere Datei muss etwas melden):
//  1. je Journal und Stelle: ist es noch dasselbe Objekt? Neu, entfernt, umsortiert → betroffene Monate neu schreiben.
//  2. alte Einträge: die Felder storniert und erfasst (Storno setzt storniert, Neu-Erfassen setzt erfasst).
//  3. in dieser Sitzung angelegte Einträge (die man noch bearbeiten darf) und offene Rundgänge/Inventuren: ganz verglichen.
//  4. im Leerlauf und beim Verlassen der App wird jedes Teil ganz verglichen – das fängt auch tiefe Änderungen an alten Einträgen.
// Für alle, die Journale anfassen: Einträge nur anhängen; ein gespeicherter Eintrag wird nur über storniert/erfasst geändert
// (oder durch ein neues Objekt ersetzt) – dann ist die Änderung sofort gespeichert, sonst erst bei 4.
export const JOURNALE = ["schwund", "tagesnotizen", "messungen", "lieferungen", "abschluesse", "kostenbelege", "putzlog", "rundgaenge", "inventuren", "uploads"];
const JOURNAL_SET = new Set(JOURNALE);
// Stammdaten, die groß werden (Waren mit Preisverlauf, Gerichte mit Zutaten): je Laden ein eigenes Teil "ladenId|artikel|alle",
// bei jedem Speichern ganz verglichen (Text gegen Text) und nur geschrieben, wenn anders. So bleibt der Kopf klein.
const STAMM_SET = new Set(["artikel", "gerichte"]);
const STAMM = "alle";
const FORMAT_GETEILT = 2;
const PLATZHALTER = 0;          // hält im Kopf die Stelle des Felds frei, damit die Reihenfolge der Felder gleich bleibt
const NF = 2;                   // beobachtete Felder je alten Eintrag: storniert und erfasst – alle späteren Änderungen an
                                // gespeicherten Einträgen setzen eines davon (Storno, neu erfasst). Feste Namen sind auf dem Handy am schnellsten.
const FRISCH_MAX = 600;         // so viele frische/offene Einträge werden ganz verglichen
const FRISCH_SCHUB = 50;        // kommen mehr neue Einträge auf einmal (Einlesen einer Sicherung), gelten sie gleich als alt
const LEERLAUF_ABSTAND = 60e3;  // höchstens einmal je Minute im Leerlauf ganz prüfen
const LEER = {};

let journale = new Map();       // "ladenId|journal" → { j, arr, b, refs, monate, flags, texte, lauf } – Stand beim letzten Speichern
let teileH = new Map();         // Schlüssel → Prüfsumme des gespeicherten Teils
let stammText = new Map();      // "ladenId|artikel|alle" → zuletzt gespeicherter Text
let frischZahl = 0;             // wie viele Einträge ganz verglichen werden (je Journal in texte[i])
let zwang = new Set();          // Teile, die beim nächsten Speichern sicher neu geschrieben werden
let loeschenOffen = new Set();  // gespeicherte Teile ohne Einträge (nach dem Laden gefunden)
let bekanntGueltig = false;     // false → nächstes Speichern schreibt alles neu (erster Start, nach einem Fehler)
let kopfAlt = null, ordnungAlt = null, stempelAlt = null;
let altModus = false;           // Rückfall, wenn der Umzug nicht bestätigt wurde: ein Gesamt-Datensatz wie bis 15.10.
let letzteWurzel = null, leerlaufZuletzt = 0, leerlaufGeplant = false, tiefZuletzt = 0;
function grundlageVerwerfen() { journale = new Map(); teileH = new Map(); stammText = new Map(); frischZahl = 0; zwang = new Set(); loeschenOffen = new Set(); bekanntGueltig = false; kopfAlt = null; ordnungAlt = null; stempelAlt = null; }

function monatVon(e) {
  const d = e && typeof e === "object" ? (typeof e.datum === "string" ? e.datum : typeof e.erfasst === "string" ? e.erfasst : "") : "";
  return d.length >= 7 && d.charCodeAt(4) === 45 ? d.slice(0, 7) : "ohne";
}
function flaggen(F, i, x) { const o = i * NF; F[o] = x.storniert; F[o + 1] = x.erfasst; }
const flaggenGleich = (F, i, x) => { const o = i * NF; return x.storniert === F[o] && x.erfasst === F[o + 1]; };
const offen = (j, e) => (j === "rundgaenge" || j === "inventuren") && !!e && typeof e === "object" && !e.abgeschlossen;
function laeufe(M) {
  const lauf = []; let letzt = null, n = 0;
  for (let i = 0; i < M.length; i++) { const m = M[i]; if (m === letzt) n += 1; else { if (letzt !== null) lauf.push([letzt, n]); letzt = m; n = 1; } }
  if (letzt !== null) lauf.push([letzt, n]);
  return lauf;
}

// Prüfsumme eines Teils (zwei 32-Bit-Hashes + Länge): nur zum Erkennen von Änderungen, kein Schutz gegen Absicht
function hash(s) {
  let a = 5381, b = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); a = (Math.imul(a, 33) + c) | 0; b = Math.imul(b ^ c, 16777619); }
  return (a >>> 0).toString(36) + "." + (b >>> 0).toString(36) + "." + s.length;
}

// Abgeschlossene Rundgänge: ihre Messungen stehen 1:1 im Journal messungen (mit rundgang = Rundgang-Kennung) und
// „weggeworfene Ware" als Schwund mit messung = Messungs-Kennung. Die Kopie im Rundgang liest niemand (Monatsblatt und
// Nachkontrollen lesen das Journal) – sie wird nicht mehr gespeichert, wenn jede Messung dort vollständig vorhanden ist.
const messIndexCache = new WeakMap();
function messIndex(b) {
  const ms = Array.isArray(b.messungen) ? b.messungen : [], sw = Array.isArray(b.schwund) ? b.schwund : [];
  let ix = messIndexCache.get(b);
  if (!ix || ix.ms !== ms || ix.nm !== ms.length || ix.sw !== sw || ix.ns !== sw.length) {
    const mess = new Map(); for (const m of ms) if (m && typeof m.id === "string") mess.set(m.id, m);
    const weg = new Set(); for (const e of sw) if (e && typeof e.messung === "string") weg.add(e.messung);
    ix = { ms, nm: ms.length, sw, ns: sw.length, mess, weg }; messIndexCache.set(b, ix);
  }
  return ix;
}
export function rundeDoppelt(r, b) {
  if (!r || !r.abgeschlossen || !Array.isArray(r.messungen) || !r.messungen.length) return false;
  const ix = messIndex(b);
  return r.messungen.every((m) => { const j = m && ix.mess.get(m.id);
    return !!j && j.rundgang === r.id && j.stelle === m.stelle && j.wert === (typeof m.wert === "number" ? m.wert : null) && (!(Array.isArray(m.weg) && m.weg.length) || ix.weg.has(m.id)); });
}
const teilText = (j, liste, b) => JSON.stringify(j === "rundgaenge" ? liste.map((r) => (rundeDoppelt(r, b) ? { ...r, messungen: [] } : r)) : liste);

// Einträge der genannten Monate eines Journals einsammeln, Text bilden und – nur wenn anders als gespeichert – zum Schreiben vormerken
function monateSchreiben(jk, st, sid, j, monate, out) {
  if (!monate.size) return;
  const gruppen = new Map(); for (const m of monate) gruppen.set(m, []);
  const A = st.arr; let off = 0; // über die Lauflängen: nur die Einträge der betroffenen Monate anfassen
  for (const [m, n] of st.lauf) { const g = gruppen.get(m); if (g) for (let k = off; k < off + n; k++) g.push(A[k]); off += n; }
  for (const [m, liste] of gruppen) {
    const key = jk + "|" + m;
    if (!liste.length) { if (teileH.has(key)) { teileH.delete(key); out.loeschen.push(key); } continue; }
    const t = teilText(j, liste, st.b); const h = hash(t);
    if (teileH.get(key) === h) continue; // Inhalt gleich geblieben
    teileH.set(key, h); out.schreiben.push({ key, wert: { s: sid, j, m, n: liste.length, h, t } });
  }
}

// Ein Journal gegen den zuletzt gespeicherten Stand prüfen; liefert die Reihenfolge der Monate (Lauflängen)
function journalPruefen(b, sid, j, arr, tief, out) {
  const jk = sid + "|" + j; out.gesehen.add(jk);
  let st = journale.get(jk);
  if (!st) { st = { j, arr, b, refs: [], monate: [], flags: [], texte: [], lauf: [] }; journale.set(jk, st); }
  st.arr = arr; st.b = b;
  const R = st.refs, M = st.monate, F = st.flags, T = st.texte, ohneFelder = j === "rundgaenge" || j === "inventuren"; const altN = R.length, n = arr.length;
  const dirty = new Set(); let umgestellt = false;
  for (let i = 0; i < n; i++) {
    const e = arr[i]; const x = e !== null && typeof e === "object" ? e : LEER;
    if (i < altN && e === R[i]) {
      const t = T[i];
      if (t !== undefined) {
        const nt = JSON.stringify(e);
        if (nt !== t) { T[i] = nt; dirty.add(M[i]); flaggen(F, i, x); const m = monatVon(e); if (m !== M[i]) { M[i] = m; dirty.add(m); umgestellt = true; } }
      } else if (tief) {
        const m = monatVon(e); if (m !== M[i]) { dirty.add(M[i]); M[i] = m; dirty.add(m); umgestellt = true; }
        if (!flaggenGleich(F, i, x)) { flaggen(F, i, x); dirty.add(M[i]); }
      } else if (!ohneFelder && !flaggenGleich(F, i, x)) { flaggen(F, i, x); dirty.add(M[i]); } // abgeschlossene Rundgänge/Inventuren ändern sich nicht mehr
      continue;
    }
    // neu oder an dieser Stelle ein anderes Objekt
    umgestellt = true;
    if (i < altN) dirty.add(M[i]);
    const m = monatVon(e); R[i] = e; M[i] = m; T[i] = undefined; flaggen(F, i, x); dirty.add(m); out.neu.push([st, i, e]);
  }
  if (n < altN) { umgestellt = true; for (let i = n; i < altN; i++) dirty.add(M[i]); R.length = n; M.length = n; T.length = n; F.length = n * NF; }
  if (umgestellt || !st.lauf.length) st.lauf = laeufe(M);
  if (tief) for (const [m] of st.lauf) dirty.add(m); // ganz vergleichen: jedes Teil
  if (zwang.size) for (const k of zwang) if (k.startsWith(jk + "|")) dirty.add(k.slice(jk.length + 1));
  monateSchreiben(jk, st, sid, j, dirty, out);
  return st.lauf;
}

function stammPruefen(sid, j, liste, out) {
  const key = sid + "|" + j + "|" + STAMM; out.stamm.add(key);
  const t = JSON.stringify(liste);
  if (stammText.get(key) === t && teileH.has(key)) return;
  stammText.set(key, t); const h = hash(t);
  if (teileH.get(key) === h) return;
  teileH.set(key, h); out.schreiben.push({ key, wert: { s: sid, j, m: STAMM, n: liste.length, h, t } });
}

// Beim Verlassen der App (versteckt) ganz vergleichen – höchstens alle 5 s, denn auf „versteckt" folgt oft gleich „pagehide"
const seiteVersteckt = () => typeof document !== "undefined" && document.visibilityState === "hidden" && Date.now() - tiefZuletzt > 5000;

// Speichern läuft nacheinander: solange eine Transaktion offen ist, wartet das nächste Speichern auf sie.
let kette = Promise.resolve(), laufend = 0;
function schreiben(wurzel, opt) {
  if (!verfuegbar || !db) return Promise.resolve(false);
  const los = () => schreibenJetzt(wurzel, opt);
  const p = laufend ? kette.then(los) : los();
  laufend += 1; kette = p.then(() => { laufend -= 1; });
  return p;
}

function schreibenJetzt(wurzel, { stempel = true, tief = seiteVersteckt() } = {}) {
  if (!verfuegbar || !db) return Promise.resolve(false);
  letzteWurzel = wurzel;
  if (altModus) {
    if (stempel) stempeln(wurzel);
    return tx("stand", "readwrite", (st) => st.put(wurzel, "main")).then(() => true, (e) => speicherFehler(e));
  }
  const voll = !bekanntGueltig;
  if (voll) grundlageVerwerfen();
  if (tief) tiefZuletzt = Date.now();
  // Zeitstempel vorläufig setzen; ändert sich sonst nichts, wird er zurückgenommen und nichts geschrieben
  const aktiv = stempel ? wurzel.betriebe.find((x) => x.id === wurzel.aktiv) : null;
  const stempelVorher = aktiv ? aktiv.geaendert : undefined;
  if (aktiv) aktiv.geaendert = new Date().toISOString();
  const out = { schreiben: [], loeschen: [...loeschenOffen], neu: [], gesehen: new Set(), stamm: new Set() };
  const ordnung = [], ids = [], stempelListe = [], schonSid = new Set();
  const betriebe = wurzel.betriebe.map((b, i) => {
    let sid = String(b?.id ?? ""); if (schonSid.has(sid)) sid += "~" + i; schonSid.add(sid); ids.push(sid);
    const k = {}; const ord = {}; stempelListe[i] = null;
    for (const key in b) {
      const v = b[key];
      if (key === "geaendert") { k[key] = PLATZHALTER; stempelListe[i] = v ?? null; }
      else if (JOURNAL_SET.has(key) && Array.isArray(v)) { k[key] = PLATZHALTER; ord[key] = journalPruefen(b, sid, key, v, tief, out); }
      else if (STAMM_SET.has(key) && Array.isArray(v)) { k[key] = PLATZHALTER; ord[key] = STAMM; stammPruefen(sid, key, v, out); }
      else k[key] = v;
    }
    ordnung.push(ord);
    return k;
  });
  // Läden oder Journale, die es nicht mehr gibt: ihre Teile löschen
  for (const jk of [...journale.keys()]) if (!out.gesehen.has(jk)) {
    journale.delete(jk);
    for (const key of [...teileH.keys()]) if (key.startsWith(jk + "|")) { teileH.delete(key); out.loeschen.push(key); }
  }
  for (const key of [...stammText.keys()]) if (!out.stamm.has(key)) { stammText.delete(key); if (teileH.delete(key)) out.loeschen.push(key); }
  // frische Einträge (einzeln angelegt) und offene Rundgänge/Inventuren künftig ganz vergleichen
  for (const [st, i, e] of out.neu) {
    if (!e || typeof e !== "object") continue;
    if (offen(st.j, e) || (out.neu.length <= FRISCH_SCHUB && frischZahl < FRISCH_MAX)) { st.texte[i] = JSON.stringify(e); frischZahl += 1; }
  }
  const kopfText = JSON.stringify({ ...wurzel, betriebe });
  const stempelText = JSON.stringify(stempelListe);
  const ordnungText = JSON.stringify(ordnung) + "\n" + ids.join("|");
  zwang = new Set(); loeschenOffen = new Set();
  if (!voll && !out.schreiben.length && !out.loeschen.length && kopfText === kopfAlt && ordnungText === ordnungAlt && (aktiv || stempelText === stempelAlt)) {
    if (aktiv) aktiv.geaendert = stempelVorher; // nichts geändert: nichts schreiben, Zeitstempel bleibt
    leerlaufPlanen(); return Promise.resolve(true);
  }
  const teile = Object.fromEntries(teileH);
  const kopf = { format: FORMAT_GETEILT, schema: Number(wurzel.schema) || SCHEMA, gespeichert: new Date().toISOString(), wurzel: kopfText, stempel: stempelText, ids, ordnung, teile };
  // Die neue Grundlage gilt sofort (das nächste Speichern wartet ohnehin auf diese Transaktion); schlägt sie fehl, wird sie verworfen
  bekanntGueltig = true; kopfAlt = kopfText; ordnungAlt = ordnungText; stempelAlt = stempelText;
  return txMehr(["stand", "teile"], "readwrite", (t) => {
    const tl = t.objectStore("teile");
    if (voll) tl.clear();
    for (const x of out.schreiben) tl.put(x.wert, x.key);
    for (const k of out.loeschen) tl.delete(k);
    t.objectStore("stand").put(kopf, "kopf");
  }).then(() => { leerlaufPlanen(); return true; }, (e) => { grundlageVerwerfen(); return speicherFehler(e); });
}
function speicherFehler(e) { console.warn("Speichern fehlgeschlagen:", e); if (fehlerMelder) fehlerMelder("speichern", e); return false; }

// Kopf + Teile → Wurzel in genau der Form, wie sie gespeichert wurde. Wirft, wenn ein Teil fehlt oder nicht passt.
function zusammensetzen(kopf, teile) {
  if (!istObjekt(kopf) || kopf.format !== FORMAT_GETEILT || typeof kopf.wurzel !== "string") throw new Error("Kopf unbekannt");
  const nachSchluessel = new Map();
  for (const v of teile || []) if (istObjekt(v)) nachSchluessel.set(v.s + "|" + v.j + "|" + v.m, v);
  for (const [key, h] of Object.entries(kopf.teile || {})) { const v = nachSchluessel.get(key); if (!v || v.h !== h) throw new Error("Teil fehlt oder veraltet: " + key); }
  const w = JSON.parse(kopf.wurzel); const stempel = JSON.parse(kopf.stempel || "[]");
  (w.betriebe || []).forEach((b, i) => {
    if ("geaendert" in b) b.geaendert = stempel[i] ?? null;
    const ord = kopf.ordnung?.[i] || {}; const sid = kopf.ids[i];
    for (const j of Object.keys(ord)) {
      if (ord[j] === STAMM) {
        const v = nachSchluessel.get(sid + "|" + j + "|" + STAMM); if (!v) throw new Error("Teil fehlt: " + sid + "|" + j);
        const liste = JSON.parse(v.t); if (!Array.isArray(liste) || liste.length !== v.n) throw new Error("Teil unvollständig"); b[j] = liste; continue;
      }
      const liste = []; const zeiger = new Map();
      for (const [m, n] of ord[j]) {
        let z = zeiger.get(m);
        if (!z) {
          const v = nachSchluessel.get(sid + "|" + j + "|" + m); if (!v) throw new Error("Teil fehlt: " + sid + "|" + j + "|" + m);
          z = { e: JSON.parse(v.t), i: 0 }; if (z.e.length !== v.n) throw new Error("Teil unvollständig"); zeiger.set(m, z);
        }
        for (let k = 0; k < n; k++) { if (z.i >= z.e.length) throw new Error("Teil zu kurz"); liste.push(z.e[z.i++]); }
      }
      for (const z of zeiger.values()) if (z.i !== z.e.length) throw new Error("Teil zu lang");
      b[j] = liste;
    }
  });
  return w;
}

// Nach dem Laden: Grundlage = die geladene (gehobene) Wurzel, Prüfsummen von den gespeicherten Teilen.
// Was die Hebung verändert hat, findet die erste ganze Prüfung (Leerlauf/Verlassen) und schreibt es einmal nach.
function grundlageSetzen(w, teile) {
  grundlageVerwerfen();
  const gespeichert = new Map(), texte = new Map(); for (const v of teile) if (istObjekt(v)) { const key = v.s + "|" + v.j + "|" + v.m; gespeichert.set(key, v.h); if (v.m === STAMM) texte.set(key, v.t); }
  const schonSid = new Set(); const da = new Set();
  w.betriebe.forEach((b, i) => {
    let sid = String(b?.id ?? ""); if (schonSid.has(sid)) sid += "~" + i; schonSid.add(sid);
    for (const j of STAMM_SET) {
      const key = sid + "|" + j + "|" + STAMM; if (!Array.isArray(b[j]) || !gespeichert.has(key)) continue;
      da.add(key); teileH.set(key, gespeichert.get(key)); stammText.set(key, texte.get(key)); // weicht der gehobene Stand ab, schreibt das nächste Speichern ihn
    }
    for (const j of JOURNALE) {
      const arr = b[j]; if (!Array.isArray(arr)) continue;
      const jk = sid + "|" + j; const st = { j, arr, b, refs: arr.slice(), monate: arr.map(monatVon), flags: new Array(arr.length * NF), texte: new Array(arr.length).fill(undefined), lauf: [] };
      for (let k = 0; k < arr.length; k++) { const e = arr[k]; flaggen(st.flags, k, e !== null && typeof e === "object" ? e : LEER); if (offen(j, e)) st.texte[k] = JSON.stringify(e); }
      st.lauf = laeufe(st.monate); journale.set(jk, st);
      for (const [m] of st.lauf) { const key = jk + "|" + m; da.add(key); if (gespeichert.has(key)) teileH.set(key, gespeichert.get(key)); else zwang.add(key); }
    }
  });
  for (const key of gespeichert.keys()) if (!da.has(key)) loeschenOffen.add(key);
  bekanntGueltig = true; letzteWurzel = w;
}

// Leerlauf-Prüfung: jedes Teil ganz vergleichen (fängt Änderungen tief in alten Einträgen, die die Felder aus 2. nicht sehen).
// Läuft in kleinen Stücken, wenn das Handy nichts zu tun hat; findet sie etwas, wird normal (verzögert) gespeichert.
function leerlaufPlanen() {
  const ric = globalThis.requestIdleCallback;
  if (typeof ric !== "function" || leerlaufGeplant || Date.now() - leerlaufZuletzt < LEERLAUF_ABSTAND) return;
  leerlaufGeplant = true;
  ric(() => {
    const w = letzteWurzel;
    const aufgaben = [];
    for (const [jk, st] of journale) for (const [m] of st.lauf) aufgaben.push([jk, st, m]);
    let i = 0, gefunden = false;
    const stueck = (frist) => {
      while (i < aufgaben.length && frist.timeRemaining() > 4) {
        const [jk, st, m] = aufgaben[i++]; const key = jk + "|" + m;
        if (journale.get(jk) !== st || !teileH.has(key)) continue; // inzwischen neu gespeichert oder ohnehin vorgemerkt
        const liste = []; let off = 0; for (const [lm, n] of st.lauf) { if (lm === m) for (let k = off; k < off + n; k++) liste.push(st.arr[k]); off += n; }
        if (hash(teilText(st.j, liste, st.b)) !== teileH.get(key)) { zwang.add(key); gefunden = true; }
      }
      if (i < aufgaben.length) { ric(stueck, { timeout: 5000 }); return; }
      leerlaufGeplant = false; leerlaufZuletzt = Date.now();
      if (gefunden && w && letzteWurzel === w && bekanntGueltig) speichern(w);
    };
    stueck({ timeRemaining: () => 10 });
  }, { timeout: 10000 });
}

export const speichern = debounce((wurzel) => { schreiben(wurzel, { stempel: true }); }, 900); // Stresstest 15.10.: seltener schreiben; beim Verlassen der App wird sofort gesichert

export function sofortSpeichern(wurzel, { stempel = true } = {}) {
  return schreiben(wurzel, { stempel });
}
export const speichernAbbrechen = () => speichern.abbrechen();

// Nur für Tests: wie viele Teile kennt die Speicherung gerade?
export const _speicherInnen = () => ({ teile: teileH.size, gueltig: bekanntGueltig, altModus, frisch: frischZahl });

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

async function sha256Hex(daten) { // daten: Text oder schon kodierte Bytes
  if (!globalThis.crypto?.subtle) return null; // unsicherer Kontext (http im LAN): ohne Prüfsumme statt gar nicht
  const buf = await crypto.subtle.digest("SHA-256", typeof daten === "string" ? new TextEncoder().encode(daten) : daten);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function exportDatei(wurzel) {
  await ereignis("export", { betriebe: wurzel.betriebe.length });
  const ereignisse = await alleEreignisse();
  // Stresstest 15.10.: einmal in Text, einmal in Bytes – Prüfsumme und Datei entstehen aus denselben Bytes
  const { bueroPin: _pin, pinSperre: _sperre, ...ohneCode } = wurzel; // W2-S (p07 M3): der Büro-Code wandert nicht in die Sicherung (das Einlesen übernimmt ihn ohnehin nicht)
  const bytes = new TextEncoder().encode(JSON.stringify({ exportiert: new Date().toISOString(), geraet: wurzel.geraet, fassung: APP_FASSUNG, wurzel: ohneCode, ereignisse }));
  const sha = await sha256Hex(bytes);
  const kopf = JSON.stringify({ typ: "gastrocalc-sicherung", schema: SCHEMA, sha256: sha });
  const blob = new Blob([kopf + "\n", bytes], { type: "application/json" });
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
    return { wurzel: ohneCode(migrierenWurzel(d.wurzel)), ereignisse: Array.isArray(d.ereignisse) ? d.ereignisse.filter(istObjekt) : [], pruefsumme }; // W2-S
  }
  try { d = JSON.parse(text); } catch (_) { throw fehler("format"); }
  if (!istObjekt(d) || d.typ !== "gastrocalc-sicherung" || !(istObjekt(d.wurzel) || istObjekt(d.stand))) throw fehler("format");
  if (Number(d.schema) > SCHEMA) throw fehler("neuer");
  return { wurzel: ohneCode(migrierenWurzel(d.wurzel || d.stand)), ereignisse: Array.isArray(d.ereignisse) ? d.ereignisse.filter(istObjekt) : [], pruefsumme: "fehlt" }; // W2-S
}
// W2-S (p07 M3): Code und Fehlversuche aus einer Datei gelten nie – jedes Handy behält seinen eigenen Büro-Code
function ohneCode(w) { delete w.bueroPin; delete w.pinSperre; return w; }

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
  if (lokal.belehrungen || fremd.belehrungen) basis.belehrungen = journalVereinigen(lokal.belehrungen || [], fremd.belehrungen || []).sort(sortErfasst); // Belehrungen (Ordner Amt) gehen beim Zusammenführen nicht verloren
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
  await txMehr(["stand", "teile", "ereignisse"], "readwrite", (t) => { for (const n of ["stand", "teile", "ereignisse"]) t.objectStore(n).clear(); });
  grundlageVerwerfen(); altModus = false; letzteWurzel = null;
}
