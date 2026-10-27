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
// Schema 6 (W2-D, 15.10.2026): putzplan, putzlog und belehrungen gehören zum Laden (belehrungen ist jetzt ein Journal mit eindeutigen
// Kennungen), dazu je Laden stammZeit (Zeitstempel je Bereich; der Fingerabdruck liegt im Speicher-Kopf) und abgleich (Stand des letzten Zusammenführens).
// Schema 1 (Einzelbetrieb), 2 und 3 werden beim Laden gehoben. Eine neuere Datei als diese App wird abgewiesen.

import { debounce, uid, heute, heuteGeschaeft, GESCHAEFTSTAG_BIS_STUNDE } from "./util.js";
import { FORMATE } from "./data/formate.js";
import { KUECHEN } from "./data/kuechen.js";
import { basisStandard, satzStandard } from "./data/kosten.js";
import { GEBINDE_ARTEN, istRichtpreis } from "./engine.js";
import { getraenkGerichtMigrieren, getraenkArtikelMigrieren } from "./getraenk_feld.js"; // Getränke (18.10.2026): Größe, Gebinde, Marke, Pfand, Lieferant
import { lieferantenSauber, lieferantenAusBelegen, artikelLieferantSauber, lieferantenEntdoppeln } from "./lieferant.js"; // Lieferanten (18.10.2026): Stammdaten, aus Beleg-Namen angelegt
import { LAND_CODES } from "./feiertage.js"; // Feiertage (18.10.2026)
import { pinWertGueltig, sperreSauber } from "./modus.js"; // W2-S: Prüfwert und Fehlversuch-Zähler des Büro-Codes
import { FASSUNG } from "./fassung.js"; // W2-D: eine Fassungsnummer für App, Service Worker und Sicherung
import { zipBlob, zipLesen, istZip, crc32 as crc32Pruefen } from "./zip.js";
import { ablageKennungen, ablageLesen } from "./ablage.js";
import { verschluesseln, entschluesseln, istVerschluesselt, SICHERUNG_ENC, LIESMICH_NAME, LIESMICH } from "./schluessel.js"; // E5 (16.10.2026): Passwort für die Sicherung

export const SCHEMA = 6;
export const APP_FASSUNG = FASSUNG;
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
    betrieb: { name: "", format: null, kuechen: [], tageProWoche: 6, monate: 12, steuerSatz: null, kleinunternehmer: false }, // steuerSatz: eigener Mischsatz für den Umsatz (null = aus der Karte oder 7 %); kleinunternehmer (Paket 3, M1): keine Vorsteuer
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
    putzplan: null, putzlog: [], belehrungen: [], // W2-D: Putzplan, Putz-Nachweis und Belehrungen gehören zum Laden (Schema 6)
    verkaeufe: [],              // E7 (17.10.2026): nur anhängen: {id, datum (Geschäftstag), gericht|null, name, text?, plu?, menge, umsatzBrutto|null, herkunft, importId|null, erfasst, storniert} (js/verkauf.js)
    kassenKombis: [],           // Schwadron 18.10.2026, M1: Kombi-Menüs der Kasse {id, name, kassenNamen, plu, teile:[{gericht, menge}]} (js/verkauf.js)
    lager: { tage: 7, puffer: 2 }, // Bestand (17.10.2026): Bestellvorschlag – bestellen für so viele Tage, dazu Puffer in Tagen (js/bestand.js); Artikel dürfen mindestbestand (Gebinde) tragen
    aktionen: [],               // Menütafel (18.10.2026): vom Wirt übernommene Aktionen {id, art: abverkauf|kombi, gerichte:[id], preis (brutto), statt|null, von, bis (Geschäftstage), erfasst, entfernt?, entferntZeit?} (js/tafel.js)
                                // Aktion planen (18.10.2026): dazu ende "datum"|"ware" (bis Ware weg: bis = längstens, darf leer sein), ware? (Abverkaufs-Ware), plan? (Vorschlag mit
                                // Begründung, wie bestätigt), geaendertZeit? (Zeitraum vom Wirt geändert), bilanz? (nach dem Ende, js/aktion_plan.js)
    tafel: { sekunden: 12, gruppen: ["speisen", "beilagen", "getraenke"], aktionen: true, sprache: "de" }, // Menütafel (18.10.2026): Einstellungen der Tafel-Datei
    lieferanten: [],            // Lieferanten (18.10.2026): Stammdaten {id, name, namen[], art, modus, tage[], schluss, lieferzeit, mindestwert, weg, kontakt, kundennummer, notiz, erfasst, geaendert, entfernt} (js/lieferant.js);
                                // kontakt/kundennummer/notiz bleiben nur auf dem Gerät (und in der eigenen Sicherung), nie in Exporten. Artikel dürfen lieferantId/lieferant2Id tragen.
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

// W2-D: was beim letzten Laden nicht ging. gesperrt = Speicher ließ sich nicht öffnen (Daten wahrscheinlich noch da),
// fehlt = übersprungene Teile (der Rest ist geladen). app.js zeigt das; die Liste steht zusätzlich in wurzel.ladeFehler (bleibt im Büro sichtbar).
let ladeBericht = { gesperrt: false, grund: null, fehlt: [] };
export const ladeProbleme = () => ladeBericht;

export async function laden() {
  ladeBericht = { gesperrt: false, grund: null, fehlt: [] };
  try {
    if (typeof indexedDB === "undefined") throw Object.assign(new Error("ohne IndexedDB"), { ohne: true });
    db = await openDb();
    return await standLesen();
  } catch (e) {
    if (e.grund === "neuer") throw e;
    console.warn("Speicher nicht verfügbar, Daten nur in dieser Sitzung:", e);
    verfuegbar = false;
    if (!e.ohne) ladeBericht.gesperrt = true; // Datenbank da, aber nicht zu öffnen: nicht zur Neu-Einrichtung einladen
    ladeBericht.grund = String(e?.message || e);
    return leereWurzel();
  }
}
// Stand aus der offenen Datenbank lesen (Paket 2, 16.10.2026: aus laden() herausgelöst, damit ein fremder Stand ohne neues Öffnen nachgeladen wird)
async function standLesen() {
  {
    ladeBericht = { gesperrt: false, grund: null, fehlt: [] }; bereichH = new Map();
    grundlageVerwerfen(); altModus = false; leerlaufAbbrechen(); speichern.abbrechen(); // Paket 2: alte Planungen gehören zum alten Stand
    const [kopf, alt] = await tx("stand", "readonly", (st) => [st.get("kopf"), st.get("main")]);
    genGelesen = istObjekt(kopf) ? Number(kopf.gen) || 0 : 0; // Paket 2: alte Köpfe ohne gen = 0
    await ereignisseDeckeln().catch(() => {});
    if (kopf && Number(kopf.schema) > SCHEMA) throw fehlerNeuer();
    const teile = kopf || !alt ? await tx("teile", "readonly", (st) => st.getAll()) : [];
    if (kopf) {
      let roh = null; const fehlt = [];
      try { roh = alt ? zusammensetzen(kopf, teile) : zusammensetzen(kopf, teile, fehlt); }
      catch (e) {
        console.warn("Geteilter Stand unvollständig:", e);
        // Der alte Gesamt-Datensatz ist noch da (Umzug nicht bestätigt): von ihm aus neu umziehen
        if (!alt) { try { roh = zusammensetzen(kopf, teile, fehlt); } catch (_) { roh = ausTeilenRetten(teile, fehlt); } }
      }
      if (roh) { const w = migrierenWurzel(roh); ladeFehlerMerken(w, fehlt); grundlageSetzen(w, teile, fehlt); if (istObjekt(kopf.bereiche)) bereichH = new Map(Object.entries(kopf.bereiche).filter(([, v]) => istObjekt(v))); return w; }
    }
    if (alt) {
      if (Number(alt.schema) > SCHEMA) throw fehlerNeuer();
      const w = migrierenWurzel(alt);
      await umziehen(w);
      return w;
    }
    if (teile.length) { const fehlt = []; const roh = ausTeilenRetten(teile, fehlt); if (roh) { const w = migrierenWurzel(roh); ladeFehlerMerken(w, fehlt); grundlageSetzen(w, teile, fehlt); return w; } }
    return leereWurzel();
  }
}
function ladeFehlerMerken(w, fehlt) {
  if (!fehlt.length) return;
  ladeBericht.fehlt = fehlt;
  const jetzt = new Date().toISOString(); const da = new Set((w.ladeFehler || []).map((x) => x.laden + "|" + x.journal + "|" + x.monat));
  w.ladeFehler = [...(w.ladeFehler || []), ...fehlt.filter((x) => !da.has(x.laden + "|" + x.journal + "|" + x.monat)).map((x) => ({ ...x, zeit: jetzt }))].slice(-50);
  ereignis("speicher-teil-fehlt", { anzahl: fehlt.length, teile: fehlt.slice(0, 20).map((x) => [x.journal, x.monat, x.grund].join("|")) });
}

// W2-D: dauerhaften Speicher einmal nach der Einrichtung anfragen (sonst darf der Browser bei Platzmangel räumen). Ergebnis für die Einstellungen.
let speicherDauerhaft = null; // true | false | null (unbekannt)
export const speicherIstDauerhaft = () => speicherDauerhaft;
export async function speicherDauerhaftPruefen({ anfragen = false } = {}) {
  const s = globalThis.navigator?.storage; if (!s) return null;
  try {
    if (anfragen && s.persist) speicherDauerhaft = await s.persist();
    else if (s.persisted) speicherDauerhaft = await s.persisted();
  } catch (_) { /* unbekannt */ }
  return speicherDauerhaft;
}
export async function speicherBelegt() {
  try { const e = await globalThis.navigator?.storage?.estimate?.(); return e ? { belegt: e.usage ?? null, frei: e.quota ?? null } : null; } catch (_) { return null; }
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

// W2-D: Kennung aus dem Inhalt (ohne Storno-Kennzeichen), bei Doppeln mit Zusatz – deterministisch
const ohneStorno = (e) => { const { id, storniert, storniertZeit, ...rest } = e; return JSON.stringify(rest); };
function eindeutigeIds(liste, vor) {
  const da = new Set();
  return liste.map((e) => {
    let id = typeof e.id === "string" && e.id ? e.id : vor + "-" + kurzHash(ohneStorno(e));
    if (da.has(id)) { id = id + "~" + kurzHash(ohneStorno(e)); while (da.has(id)) id += "~"; }
    da.add(id); return id === e.id ? e : { ...e, id };
  });
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
                   basis: k.basis === "brutto" || k.basis === "netto" ? k.basis : (alt ? "netto" : basisStandard(k.posten)),
                   // Paket 3 (16.10.2026), M1: Vorsteuersatz je Posten; alte Daten ohne Feld bekommen den Standard (19, Wasser 7)
                   satz: [19, 7, 0].includes(Number(k.satz)) ? Number(k.satz) : satzStandard(k.posten) }));
  if (typeof s.betrieb.steuerSatz !== "number" || !(s.betrieb.steuerSatz >= 0 && s.betrieb.steuerSatz < 1)) s.betrieb.steuerSatz = null;
  s.betrieb.kleinunternehmer = s.betrieb.kleinunternehmer === true; // Paket 3, M1
  // Gremium 2 (24.10.2026): Hinweis-Status und Rechtsform aus fremden Dateien prüfen (Vertrag docs/vertraege.md Abschnitt 2, js/rechtsform.js)
  s.betrieb.hinweise = hinweiseSauber(s.betrieb.hinweise);
  if (s.betrieb.rechtsform !== undefined && !["einzel", "gbr", "gmbh", "ug", "kg_ohg", "unbekannt"].includes(s.betrieb.rechtsform)) delete s.betrieb.rechtsform;
  if (!LAND_CODES.includes(s.betrieb.bundesland)) delete s.betrieb.bundesland; // Feiertage (18.10.2026): Bundesland des Ladens (optional)
  if (s.betrieb.feiertagOffen !== false) delete s.betrieb.feiertagOffen;      // Standard: an Feiertagen offen wie an einem normalen Wochentag
  if (!["geschaetzt", "eigen", "offen"].includes(s.team.eigenerLohnStatus)) s.team.eigenerLohnStatus = typeof s.team.eigenerLohn === "number" ? "eigen" : "geschaetzt";
  if (typeof s.verkauf.warenQuote !== "number" || !(s.verkauf.warenQuote >= 0 && s.verkauf.warenQuote < 0.9)) s.verkauf.warenQuote = null;
  s.kanaele.portale = s.kanaele.portale.filter(istObjekt).map((p) => ({ id: String(p.id || uid()), name: String(p.name || ""),
    provision: typeof p.provision === "number" ? p.provision : null, basis: ["netto", "brutto", "unbekannt"].includes(p.basis) ? p.basis : "unbekannt" }));
  s.betrieb.name = String(s.betrieb.name || "").slice(0, 40); s.betrieb.kuechen = s.betrieb.kuechen.filter((k) => KUECHEN.some((x) => x.id === k));
  if (!FORMATE.some((f) => f.id === s.betrieb.format)) s.betrieb.format = null; // unbekannte Kennungen aus fremden Dateien
  s.betrieb.tageProWoche = Math.min(7, Math.max(1, Number(s.betrieb.tageProWoche) || 6));
  s.betrieb.monate = Math.min(12, Math.max(1, Number(s.betrieb.monate) || 12));
  s.gerichte = mitId(s.gerichte).map((g) => getraenkGerichtMigrieren(gerichtKasse({ ...g, zutaten: Array.isArray(g.zutaten) ? g.zutaten.filter(istObjekt) : [] }))); // Getränke (18.10.2026): Feld getraenk, Größe aus dem Namen
  s.artikel = s.artikel.filter((a) => istObjekt(a) && typeof a.name === "string").map((a) => ({ ...a,
    gebinde: istObjekt(a.gebinde) && GEBINDE_ARTEN.includes(a.gebinde.art) ? { art: a.gebinde.art, zwischen: istObjekt(a.gebinde.zwischen) && Number(a.gebinde.zwischen.anzahl) > 0 ? { art: String(a.gebinde.zwischen.art || "beutel"), anzahl: Number(a.gebinde.zwischen.anzahl) } : null } : { art: "packung", zwischen: null },
    preisBasis: a.preisBasis === "brutto" ? "brutto" : "netto",
    preisHistorie: (Array.isArray(a.preisHistorie) ? a.preisHistorie : []).filter((h) => istObjekt(h) && typeof h.datum === "string" && typeof h.preis === "number").slice(-24) }));
  for (const a of s.artikel) getraenkArtikelMigrieren(a); // Getränke (18.10.2026)
  for (const a of s.artikel) artikelLieferantSauber(a); // Lieferanten (18.10.2026): Haupt-/Zweitlieferant nur als Kennung
  for (const a of s.artikel) { if (typeof a.mindestbestand === "number" && Number.isFinite(a.mindestbestand) && a.mindestbestand > 0 && a.mindestbestand <= 9999) a.mindestbestand = Math.round(a.mindestbestand * 4) / 4; else delete a.mindestbestand; } // Bestand (17.10.2026)
  { const zahl = (v, min, max, std) => { const n = Math.round(Number(v)); return typeof v === "number" && Number.isFinite(n) && n >= min && n <= max ? n : std; }; // Bestand (17.10.2026): Tage 1–60, Puffer 0–30
    s.lager = { tage: zahl(s.lager.tage, 1, 60, 7), puffer: zahl(s.lager.puffer, 0, 30, 2) }; }
  s.lieferungen = mitId(s.lieferungen).filter((l) => typeof l.datum === "string").map((l) => ({ ...l, zeilen: Array.isArray(l.zeilen) ? l.zeilen.filter(istObjekt).map(haltbarZeile) : [], storniert: !!l.storniert }));
  for (const a of s.artikel) if (!HALTBAR_ARTEN.includes(a.haltbarArt)) delete a.haltbarArt; // Stufe 1 (17.10.2026): nur „mhd“ | „verbrauch“, sonst gilt der Vorschlag (js/haltbar.js)
  s.lieferanten = lieferantenSauber(s.lieferanten); lieferantenAusBelegen(s); lieferantenEntdoppeln(s); // Lieferanten (18.10.2026): vorhandene Beleg-Namen werden Lieferanten (Kennung aus dem Namen, auf jedem Handy gleich); Prüfgremium 18.10.2026 (N3): gleiche Namen zusammenlegen
  s.abschluesse = mitId(s.abschluesse).filter((a) => typeof a.datum === "string");
  s.uploads = mitId(s.uploads).filter((u) => istObjekt(u.datei) && typeof u.datei.id === "string");
  s.kostenbelege = mitId(s.kostenbelege).filter((k) => typeof k.stelle === "string" && typeof k.betrag === "number" && typeof k.ab === "string").map((k) => ({ ...k, storniert: !!k.storniert }));
  // Läden, die schon vor Etappe 6a mitten in der Einrichtung waren, bleiben auf dem genauen Weg
  if (!["schnell", "genau"].includes(s.weg)) s.weg = alt || s.schritt > 0 || s.phase === "app" ? "genau" : "schnell";
  s.schwund = mitId(s.schwund).filter((e) => typeof e.datum === "string");
  s.verkaeufe = verkaeufeEntdoppeln(verkaeufeSauber(s.verkaeufe), { nur: "zbon" }); // E7 (17.10.2026): alte Läden ohne Verkäufe bekommen eine leere Liste; Prüfgremium 18.10.2026 (H2): Z-Bon-Doppel aus älteren Ständen bereinigen
  s.kassenKombis = kombisSauber(s.kassenKombis, s.gerichte); // Schwadron 18.10.2026, M1
  s.aktionen = aktionenEntdoppeln(aktionenSauber(s.aktionen)); s.tafel = tafelSauber(s.tafel); // Menütafel (18.10.2026); Prüfgremium 18.10.2026 (M1): Doppel aus älteren Ständen
  // Tagesnotizen Schema ≤ 2: ein Wert je Datum ohne id → Journal-Einträge
  s.tagesnotizen = s.tagesnotizen.filter((n) => istObjekt(n) && typeof n.datum === "string" && typeof n.umsatz === "number")
    .map((n) => ({ id: typeof n.id === "string" ? n.id : "alt-" + kurzHash(n.datum + "|" + n.umsatz + "|" + (n.geaendert || "")), datum: n.datum, umsatz: n.umsatz,
      erfasst: typeof n.erfasst === "string" ? n.erfasst : (n.geaendert || n.datum + "T00:00:00.000Z"), nacherfasst: !!n.nacherfasst, storniert: !!n.storniert,
      // W2-T: Spur der Korrekturen bleibt beim Laden erhalten (Gerät, Rücknahmezeit, Nachfolger); ein Entwurf ist nach dem Neustart fest
      ...(typeof n.geraet === "string" ? { geraet: n.geraet } : {}), ...(typeof n.storniertZeit === "string" ? { storniertZeit: n.storniertZeit } : {}),
      ...(typeof n.ersetzt === "string" || n.ersetzt === true ? { ersetzt: n.ersetzt } : {}) }));
  s.personen = mitId(s.personen).map((p) => ({ id: p.id, kuerzel: String(p.kuerzel || "").slice(0, 12), aktiv: p.aktiv !== false, entfernt: !!p.entfernt, ...(typeof p.ausgeschieden === "string" ? { ausgeschieden: p.ausgeschieden } : {}), ...(typeof p.stundenlohn === "number" && p.stundenlohn > 0 ? { stundenlohn: p.stundenlohn } : {}), ...(p.lohnArt === "minijob" || p.lohnArt === "angestellt" ? { lohnArt: p.lohnArt } : {}) })); // 27.10.2026: Stundenlohn für „Mitarbeiter heute“ // W2-H: Datum „ausgeschieden“ bleibt
  s.kuehl.takt = s.kuehl.takt === 2 ? 2 : 1; if (typeof s.kuehl.seit !== "string") s.kuehl.seit = null; s.kuehl.ruhetage = (Array.isArray(s.kuehl.ruhetage) ? s.kuehl.ruhetage : []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  s.kuehlstellen = mitId(s.kuehlstellen).map((k, i) => ({ id: k.id, name: String(k.name || "").slice(0, 40), art: ["kuehl", "tk", "warm"].includes(k.art) ? k.art : "kuehl",
    min: typeof k.min === "number" ? k.min : null, max: typeof k.max === "number" ? k.max : null, reihe: Number.isFinite(k.reihe) ? k.reihe : i, archiviert: !!k.archiviert, ...(typeof k.ware === "string" ? { ware: k.ware } : {}),
    ...(["kuehlschrank", "saladette", "tiefkuehler", "warmhalter"].includes(k.typ) ? { typ: k.typ } : {}) })); // Paket 6 (17.10.2026): Typ-Schlüssel bleibt erhalten (Anzeige-Name folgt der Sprache) // W2-H: Datenstelle Grenze je Ware
  s.rundgaenge = mitId(s.rundgaenge).filter((r) => typeof r.datum === "string").map((r) => ({ ...r, messungen: Array.isArray(r.messungen) ? r.messungen.filter(istObjekt) : [] }));
  s.messungen = mitId(s.messungen).filter((m) => typeof m.datum === "string" && typeof m.stelle === "string").map((m) => ({ ...m,
    wert: typeof m.wert === "number" ? m.wert : null, massnahmen: Array.isArray(m.massnahmen) ? m.massnahmen.filter((x) => typeof x === "string") : [],
    notiz: typeof m.notiz === "string" ? m.notiz.slice(0, 200) : "", nachkontrolle: istObjekt(m.nachkontrolle) ? m.nachkontrolle : null, abweichung: !!m.abweichung, zeit: typeof m.zeit === "string" ? m.zeit : m.nacherfasst ? null : m.datum + "T00:00:00.000Z" })); // W2-H: Nachtrag ohne Uhrzeit bleibt ohne
  // Stresstest 15.10.: abgeschlossene Rundgänge tragen keine doppelte Kopie ihrer Messungen mehr (stehen vollständig im Journal)
  s.rundgaenge = s.rundgaenge.map((r) => (rundeDoppelt(r, s) ? { ...r, messungen: [] } : r));
  rundgangDoppelBereinigen(s); // Schwadron 18.10.2026, H3: falsche „Sicherungs-Kopien“ gleicher Rundgänge aus früherem Zusammenführen entfernen
  // Inventuren (Punkt 3): Posten nur Zahlen ≥ 0 oder null, höchstens eine offene (die jüngste bleibt offen)
  s.inventuren = mitId(s.inventuren).filter((i) => typeof i.datum === "string").map((i) => ({ ...i, datum: inventurGeschaeftstag(i),
    begonnen: typeof i.begonnen === "string" ? i.begonnen : i.datum + "T00:00:00.000Z", abgeschlossen: typeof i.abgeschlossen === "string" ? i.abgeschlossen : null,
    posten: Object.fromEntries(Object.entries(istObjekt(i.posten) ? i.posten : {}).map(([n, m]) => [n, typeof m === "number" && Number.isFinite(m) && m >= 0 ? m : null])),
    ausgeblendet: (Array.isArray(i.ausgeblendet) ? i.ausgeblendet : []).filter((n) => typeof n === "string") }));
  { const offen = s.inventuren.filter((i) => !i.abgeschlossen); if (offen.length > 1) s.inventuren = s.inventuren.filter((i) => i.abgeschlossen || i === offen[offen.length - 1]); }
  // W2-D (Schema 6): Putz-Nachweis und Belehrungen – jeder Eintrag braucht eine eigene Kennung (bis Schema 5 trugen „storniert“ und
  // „neu eingetragen“ am selben Tag dieselbe Kennung, beim Zusammenführen gewann dann das Storno). Fehlende oder doppelte Kennungen
  // werden aus dem Inhalt abgeleitet – auf jedem Handy gleich, damit dieselbe Belehrung nach dem Zusammenführen nicht doppelt steht.
  s.putzlog = eindeutigeIds(s.putzlog.filter(istObjekt), "putz");
  s.belehrungen = eindeutigeIds(s.belehrungen.filter(istObjekt), "bel");
  if (s.putzplan !== null && !istObjekt(s.putzplan)) s.putzplan = null;
  for (const k of ["stammZeit", "abgleich"]) if (!istObjekt(s[k])) delete s[k];
  delete s.stammH; // Fingerabdrücke liegen im Kopf des Speichers, nicht im Laden
  if (!istObjekt(s.abgleichHinweis)) delete s.abgleichHinweis;
  if (s.beispiel !== true) delete s.beispiel; // Beispiel-Laden (17.10.2026): Merkmal bleibt beim Einlesen erhalten, nur echtes true
  if (!["onboarding", "app"].includes(s.phase)) s.phase = "onboarding";
  s.schritt = Math.max(0, Number(s.schritt) || 0);
  delete s.schema; // gehört an die Wurzel
  return s;
}

// Stufe 1 (17.10.2026): Haltbarkeit einer Belegzeile – haltbar {art: "mhd"|"verbrauch", datum: JJJJ-MM-TT, erfasst?}; Ungültiges fällt weg
const HALTBAR_ARTEN = ["mhd", "verbrauch"];
function haltbarZeile(z) {
  if (z.haltbar === undefined) return z;
  const h = z.haltbar; const { haltbar: _weg, ...rest } = z;
  if (!istObjekt(h) || !HALTBAR_ARTEN.includes(h.art) || typeof h.datum !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(h.datum)) return rest;
  return { ...rest, haltbar: { art: h.art, datum: h.datum, ...(typeof h.erfasst === "string" ? { erfasst: h.erfasst } : {}) } };
}
// Stufe 1 (17.10.2026): Zusammenführen – derselbe Beleg auf zwei Handys, auf einem die Haltbarkeit nachgetragen: sie geht nicht verloren
// (der Beleg selbst bleibt, wie er war; je Zeile gewinnt die zuletzt eingetragene Haltbarkeit, eine fehlende wird ergänzt).
function haltbarVereinigen(liste, lokal, fremd) {
  const a = new Map((lokal || []).filter((l) => l && typeof l.id === "string").map((l) => [l.id, l])), b = new Map((fremd || []).filter((l) => l && typeof l.id === "string").map((l) => [l.id, l]));
  return liste.map((l) => {
    const x = a.get(l.id), y = b.get(l.id); if (!x || !y || !Array.isArray(l.zeilen)) return l;
    let neu = null;
    l.zeilen.forEach((z, i) => {
      const hx = x.zeilen?.[i]?.haltbar, hy = y.zeilen?.[i]?.haltbar; if (!hx && !hy) return;
      const best = !hx ? hy : !hy ? hx : String(hy.erfasst || "") > String(hx.erfasst || "") ? hy : hx;
      if (JSON.stringify(z.haltbar ?? null) === JSON.stringify(best)) return;
      neu ??= l.zeilen.slice(); neu[i] = { ...z, haltbar: best };
    });
    return neu ? { ...l, zeilen: neu } : l;
  });
}
// Prüfgremium 17.10.2026 (2): Inventuren, die vor der Korrektur nach Mitternacht (0–4 Uhr) abgeschlossen wurden, trugen den Kalendertag.
// Gezählt wurde nach Ladenschluss – der Tag der Zählung ist der Geschäftstag davor. Nur dieser eindeutige Fall wird umgestellt; es ist
// idempotent (danach passt das Datum zum Geschäftstag) und auf jedem Handy gleich.
function inventurGeschaeftstag(i) {
  if (typeof i.abgeschlossen !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(i.datum)) return i.datum;
  const d = new Date(i.abgeschlossen); if (!Number.isFinite(d.getTime()) || d.getHours() >= GESCHAEFTSTAG_BIS_STUNDE) return i.datum;
  return heute(d) === i.datum ? heuteGeschaeft(d) : i.datum;
}
// E7 (17.10.2026): Kassen-Artikelnummer (plu) und gelernte Kassentexte (kassenNamen) je Gericht – nur Text, sonst weg
function gerichtKasse(g) {
  if (typeof g.plu === "string" && g.plu.trim()) g.plu = g.plu.trim().slice(0, 50); else delete g.plu;
  if (Array.isArray(g.kassenNamen)) { const n = [...new Set(g.kassenNamen.filter((x) => typeof x === "string").map((x) => x.trim().slice(0, 120)).filter(Boolean))].slice(0, 40); if (n.length) g.kassenNamen = n; else delete g.kassenNamen; }
  else delete g.kassenNamen;
  return g;
}
// Schwadron 18.10.2026, M1: Kombi-Menüs der Kasse – Kennung, Name, gelernte Kassentexte, Nummer, Teile (Gericht-Kennung × Menge > 0)
function kombisSauber(liste, gerichte) {
  const ids = new Set((gerichte || []).map((g) => g.id));
  return mitId(Array.isArray(liste) ? liste : []).map((k) => ({ id: k.id, name: String(k.name ?? "").slice(0, 120),
    kassenNamen: [...new Set((Array.isArray(k.kassenNamen) ? k.kassenNamen : []).filter((x) => typeof x === "string").map((x) => x.trim().slice(0, 120)).filter(Boolean))].slice(0, 40),
    plu: typeof k.plu === "string" && k.plu.trim() ? k.plu.trim().slice(0, 50) : null,
    teile: (Array.isArray(k.teile) ? k.teile : []).filter((x) => istObjekt(x) && ids.has(x.gericht) && Number(x.menge) > 0).map((x) => ({ gericht: x.gericht, menge: Number(x.menge) })) }));
}
// Menütafel (18.10.2026): übernommene Aktionen – Kennung, Gerichte (Kennungen, 1–4), Preis > 0, von ≤ bis als JJJJ-MM-TT; Ungültiges fällt weg.
// Gerichte, die es nicht mehr gibt, bleiben in der Liste (die Tafel lässt die Aktion dann weg und sagt es im Büro) – so geht beim Zusammenführen nichts verloren.
// Aktion planen (18.10.2026): frei wählbarer Zeitraum – ende "datum" (bis = letzter Tag) oder "ware" (bis Ware weg; bis = längstens, darf fehlen).
// Alte Aktionen (feste Laufzeit) behalten von/bis und bekommen ende "datum". plan und bilanz werden geprüft, nicht neu gerechnet.
const TAG_RE = /^\d{4}-\d{2}-\d{2}$/;
const tagOder = (x) => (typeof x === "string" && TAG_RE.test(x) ? x : null);
const zahlOder = (x, min = -1e9, max = 1e9) => (typeof x === "number" && Number.isFinite(x) && x >= min && x <= max ? x : null);
function planSauber(p) {
  if (!istObjekt(p)) return null;
  const von = tagOder(p.von), bis = tagOder(p.bis); if (!von) return null;
  return { von, bis, ende: p.ende === "ware" ? "ware" : "datum", satz: typeof p.satz === "string" ? p.satz.slice(0, 300) : "", erwartung: zahlOder(p.erwartung, 0, 100), quelle: ["breakEven", "gelernt"].includes(p.quelle) ? p.quelle : "breakEven",
    erstellt: typeof p.erstellt === "string" ? p.erstellt : null };
}
function bilanzSauber(b) {
  if (!istObjekt(b)) return null;
  const tage = zahlOder(b.tage, 0, 10000); if (tage === null) return null;
  return { von: tagOder(b.von), bis: tagOder(b.bis), tage, vergleichbar: zahlOder(b.vergleichbar, 0, 10000) ?? 0, verkauft: zahlOder(b.verkauft, 0), vorher: zahlOder(b.vorher, 0), mehrAnteil: zahlOder(b.mehrAnteil, -1, 1000),
    rohertrag: zahlOder(b.rohertrag), rohertragVorher: zahlOder(b.rohertragVorher), geschaetzt: b.geschaetzt === true, erstellt: typeof b.erstellt === "string" ? b.erstellt : null };
}
// Hinweis-Status: nur gültige Einträge, ein Eintrag je Karte (jüngste Zeit gewinnt) – Gremium 2 (24.10.2026)
function hinweiseSauber(liste) {
  const m = new Map();
  for (const e of Array.isArray(liste) ? liste : []) {
    if (!istObjekt(e) || typeof e.id !== "string" || !["neu", "spaeter", "erledigt"].includes(e.status)) continue;
    const zeit = typeof e.zeit === "string" ? e.zeit : "";
    const alt = m.get(e.id); if (!alt || zeit > alt.zeit) m.set(e.id, { id: e.id, status: e.status, zeit });
  }
  return [...m.values()].sort((x, y) => x.id.localeCompare(y.id));
}
export const hinweiseVereinigen = (a, b) => hinweiseSauber([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]);

function aktionenSauber(liste) {
  return mitId(Array.isArray(liste) ? liste : []).map((a) => {
    const ende = a.ende === "ware" ? "ware" : "datum"; const plan = planSauber(a.plan), bilanz = bilanzSauber(a.bilanz);
    return { id: a.id, art: ["abverkauf", "kombi"].includes(a.art) ? a.art : "kombi",
      gerichte: [...new Set((Array.isArray(a.gerichte) ? a.gerichte : []).filter((x) => typeof x === "string" && x))].slice(0, 4),
      preis: typeof a.preis === "number" && Number.isFinite(a.preis) && a.preis > 0 && a.preis < 10000 ? Math.round(a.preis * 100) / 100 : null,
      statt: typeof a.statt === "number" && Number.isFinite(a.statt) && a.statt > 0 && a.statt < 10000 ? Math.round(a.statt * 100) / 100 : null,
      von: tagOder(a.von), bis: tagOder(a.bis), ende,
      ...(typeof a.ware === "string" && a.ware.trim() ? { ware: a.ware.trim().slice(0, 120) } : {}), ...(plan ? { plan } : {}), ...(typeof a.geaendertZeit === "string" ? { geaendertZeit: a.geaendertZeit } : {}), ...(bilanz ? { bilanz } : {}),
      erfasst: typeof a.erfasst === "string" ? a.erfasst : null, entfernt: a.entfernt === true, ...(typeof a.entferntZeit === "string" ? { entferntZeit: a.entferntZeit } : {}),
      ...(typeof a.doppelt === "string" && a.doppelt ? { doppelt: a.doppelt.slice(0, 60) } : {}) };
  }).filter((a) => a.gerichte.length && a.preis !== null && a.von && (a.bis ? a.von <= a.bis : a.ende === "ware"));
}
// Prüfgremium 18.10.2026 (M1): Dieselbe Aktion auf zwei Handys angelegt (gleiche Art, gleiche Gerichte, gleicher Preis, beide laufend) ist EINE Aktion.
// Die zuerst angelegte bleibt (bei gleicher Zeit die kleinere Kennung); die anderen gelten als beendet (entfernt, doppelt = Kennung der bleibenden,
// keine eigene Bilanz). Ein später geänderter Zeitraum einer Kopie geht auf die bleibende über. Rein aus der Liste – beide Handys rechnen gleich.
export function aktionenEntdoppeln(liste) {
  const l = Array.isArray(liste) ? liste : []; const gruppen = new Map();
  const sch = (a) => `${a.art}|${[...(a.gerichte || [])].sort().join("|")}|${a.preis}`;
  for (const a of l) if (a && !a.entfernt) { const k = sch(a); if (!gruppen.has(k)) gruppen.set(k, []); gruppen.get(k).push(a); }
  const neu = new Map();
  for (const g of gruppen.values()) {
    if (g.length < 2) continue;
    g.sort((x, y) => String(x.erfasst || "").localeCompare(String(y.erfasst || "")) || String(x.id).localeCompare(String(y.id)));
    const [bleibt, ...rest] = g; let b = bleibt;
    const juengster = [...g].filter((x) => x.geaendertZeit).sort((x, y) => String(y.geaendertZeit).localeCompare(String(x.geaendertZeit)))[0];
    if (juengster && juengster !== bleibt && String(juengster.geaendertZeit) > String(bleibt.geaendertZeit || "")) b = { ...bleibt, von: juengster.von, bis: juengster.bis, ende: juengster.ende, geaendertZeit: juengster.geaendertZeit };
    if (b !== bleibt) neu.set(bleibt, b);
    for (const x of rest) neu.set(x, { ...x, entfernt: true, entferntZeit: x.geaendertZeit || x.erfasst || b.erfasst || null, doppelt: bleibt.id });
  }
  return neu.size ? l.map((a) => { const n = neu.get(a); if (!n) return a; if (n.entferntZeit === null) delete n.entferntZeit; return n; }) : l;
}
// Menütafel (18.10.2026): Einstellungen – Seitenwechsel 5–120 s, Gruppen aus der festen Liste (mindestens eine), Aktionen ja/nein, Sprache der Tafel
const TAFEL_GRUPPEN = ["speisen", "beilagen", "getraenke"];
function tafelSauber(x) {
  const t = istObjekt(x) ? x : {}; const sek = Math.round(Number(t.sekunden));
  const gruppen = TAFEL_GRUPPEN.filter((g) => Array.isArray(t.gruppen) && t.gruppen.includes(g));
  return { sekunden: typeof t.sekunden === "number" && sek >= 5 && sek <= 120 ? sek : 12, gruppen: Array.isArray(t.gruppen) && gruppen.length ? gruppen : [...TAFEL_GRUPPEN],
    aktionen: t.aktionen !== false, sprache: SPRACH_CODES.includes(t.sprache) ? t.sprache : "de" };
}
// Menütafel (18.10.2026): Zusammenführen – Aktionen beider Handys bleiben (Vereinigung nach Kennung); „beendet“ gewinnt immer.
function aktionenVereinigen(sieger, verlierer) {
  const m = new Map(); for (const a of sieger || []) if (istObjekt(a) && typeof a.id === "string") m.set(a.id, { ...a });
  for (const a of verlierer || []) {
    if (!istObjekt(a) || typeof a.id !== "string") continue; const s = m.get(a.id);
    if (!s) { m.set(a.id, { ...a }); continue; }
    if (a.entfernt && !s.entfernt) { s.entfernt = true; if (a.entferntZeit) s.entferntZeit = a.entferntZeit; }
    // Aktion planen (18.10.2026): Zeitraum – die zuletzt vom Wirt geänderte Fassung gilt; eine Bilanz geht nie verloren
    if (String(a.geaendertZeit || "") > String(s.geaendertZeit || "")) { s.von = a.von; s.bis = a.bis; s.ende = a.ende; s.geaendertZeit = a.geaendertZeit; }
    if (a.bilanz && (!s.bilanz || String(a.bilanz.erstellt || "") > String(s.bilanz.erstellt || ""))) s.bilanz = a.bilanz;
  }
  return aktionenEntdoppeln([...m.values()].sort((x, y) => String(x.erfasst || "").localeCompare(String(y.erfasst || "")) || x.id.localeCompare(y.id))); // Prüfgremium 18.10.2026 (M1)
}
// E7 (17.10.2026): Verkäufe je Gericht – Datum JJJJ-MM-TT und eine Zahl als Menge sind Pflicht, der Rest wird geprüft
const VERKAUF_HERKUNFT = ["hand", "zbon", "dsfinvk", "kasse"];
function verkaeufeSauber(liste) {
  return mitId(Array.isArray(liste) ? liste : []).map(({ kombi, ...v }) => (typeof kombi === "string" && kombi ? { ...v, kombi } : v)).filter((v) => typeof v.datum === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.datum) && Number.isFinite(Number(v.menge)) && v.menge !== null && v.menge !== "")
    .map((v) => ({ ...v, menge: Number(v.menge), gericht: typeof v.gericht === "string" && v.gericht ? v.gericht : null, name: String(v.name ?? "").slice(0, 120),
      umsatzBrutto: typeof v.umsatzBrutto === "number" && Number.isFinite(v.umsatzBrutto) ? v.umsatzBrutto : null, herkunft: VERKAUF_HERKUNFT.includes(v.herkunft) ? v.herkunft : "hand",
      importId: typeof v.importId === "string" && v.importId ? v.importId : null, erfasst: typeof v.erfasst === "string" ? v.erfasst : v.datum + "T00:00:00.000Z", storniert: !!v.storniert,
      ...(typeof v.plu === "string" && v.plu ? { plu: v.plu.slice(0, 50) } : { plu: null }), ...(typeof v.text === "string" ? { text: v.text.slice(0, 120) } : {}),
      ...(typeof v.kombi === "string" && v.kombi ? { kombi: v.kombi.slice(0, 60) } : {}), // Schwadron 18.10.2026, M1
      ...("kasse" in v ? { kasse: typeof v.kasse === "string" && v.kasse ? v.kasse.slice(0, 50) : null } : {}) })); // Prüfgremium 17.10.2026 (5): Kassen-ID
}

// Prüfgremium 17.10.2026 (1): Nach dem Vereinigen zweier Handys dürfen logisch gleiche Verkäufe nicht doppelt zählen. Die Kennungen sind
// je Handy verschieden (Zeitpunkt, Zufall) – deshalb entscheidet hier der Inhalt, auch für schon gespeicherte Altdaten:
//   Kasse/Z-Bon: je (Tag, Herkunft, Kasse) zählt nur EIN Import (der jüngste nach „erfasst“), die anderen gelten als ersetzt.
//   Hand: je (Tag, Gericht) zählt nur EIN Eintrag (der jüngste).
// Stornos: Hat ein Handy einen Stand zurückgenommen (storniert ohne „ersetzt“) und ist das jünger als der jüngste aktive Stand der
// Gruppe, gilt die Rücknahme für die ganze Gruppe. Ergebnis hängt nur von der vereinigten Liste ab – beide Handys rechnen gleich.
// Geänderte Einträge sind neue Objekte (Journal-Regel); Zeiten sind die aus den Daten, nicht „jetzt“.
// Prüfgremium 18.10.2026 (H2): Z-Bon ohne lesbare Nummer (kasse null oder eigene Kasse ohne Nummer) und ein Z-Bon MIT Nummer am selben Tag sind
// derselbe Abschluss, wenn sie gleich sind: gleiches Foto (upload), gleiche Summe der Positionen oder gleiche Positionen. Dann zählt er zur Gruppe
// der Nummer (der jüngste Stand gilt). Passt er zu keiner oder zu mehreren Nummern, bleibt er für sich (zweite Kasse bleibt möglich).
// nur: "zbon" – nur Z-Bons entdoppeln (beim Laden, idempotent: bereinigt Doppel aus älteren Ständen).
const Z_NR = /^Z-\d/;
function zbonZielGruppen(liste) {
  const imp = new Map();
  for (const v of liste || []) {
    if (!v || v.herkunft !== "zbon" || typeof v.datum !== "string") continue;
    const k = (v.importId || v.id) + "|" + v.datum; const x = imp.get(k) || { datum: v.datum, kasse: typeof v.kasse === "string" && v.kasse ? v.kasse : null, uploads: new Set(), summe: 0, zeilen: [] };
    if (typeof v.upload === "string" && v.upload) x.uploads.add(v.upload);
    x.summe += typeof v.umsatzBrutto === "number" ? v.umsatzBrutto : 0;
    x.zeilen.push([String(v.text || v.name || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim(), Math.round(Number(v.menge) * 1000) / 1000, v.umsatzBrutto ?? ""].join("|"));
    imp.set(k, x);
  }
  const out = new Map(); const liste2 = [...imp.entries()].map(([k, x]) => ({ k, ...x, summe: Math.round(x.summe * 100) / 100, abdruck: x.zeilen.sort().join("\n") }));
  for (const o of liste2) {
    if (o.kasse && Z_NR.test(o.kasse)) continue;
    const ziele = new Set(liste2.filter((n) => n.datum === o.datum && n.kasse && Z_NR.test(n.kasse) && ([...o.uploads].some((u) => n.uploads.has(u)) || (o.summe > 0.004 && Math.abs(n.summe - o.summe) <= 0.005) || n.abdruck === o.abdruck)).map((n) => n.kasse));
    if (ziele.size === 1) out.set(o.k, [...ziele][0]);
  }
  return out;
}
export function verkaeufeEntdoppeln(liste, { nur = null } = {}) {
  const gruppen = new Map(); const zbonZiel = zbonZielGruppen(liste);
  for (const v of liste || []) {
    if (!v || typeof v.datum !== "string") continue;
    if (nur && v.herkunft !== nur) continue;
    const kasse = v.herkunft === "zbon" ? zbonZiel.get((v.importId || v.id) + "|" + v.datum) ?? (typeof v.kasse === "string" ? v.kasse : "") : typeof v.kasse === "string" ? v.kasse : "";
    const k = v.herkunft === "hand" ? `hand|${v.datum}|${v.gericht || (v.kombi ? "k:" + v.kombi : "?" + (v.name || ""))}` : `imp|${v.datum}|${v.herkunft}|${kasse}`;
    if (!gruppen.has(k)) gruppen.set(k, []); gruppen.get(k).push(v);
  }
  const neu = new Map();
  for (const [k, l] of gruppen) {
    const einheit = (v) => (k.startsWith("hand|") ? v.id : v.importId || v.id);
    const aktiv = new Map(); // Einheit → jüngstes „erfasst“
    for (const v of l) if (!v.storniert) { const e = einheit(v); const t = String(v.erfasst || ""); if (!aktiv.has(e) || t > aktiv.get(e)) aktiv.set(e, t); }
    if (!aktiv.size) continue;
    const [sieger, siegerZeit] = [...aktiv.entries()].sort((a, b) => b[1].localeCompare(a[1]) || String(b[0]).localeCompare(String(a[0])))[0];
    const rueck = l.filter((v) => v.storniert && !v.ersetzt && !aktiv.has(einheit(v)) && String(v.storniertZeit || "") > siegerZeit).map((v) => String(v.storniertZeit)).sort().pop();
    if (aktiv.size === 1 && !rueck) continue;
    for (const v of l) {
      if (v.storniert) continue;
      if (rueck) neu.set(v, { ...v, storniert: true, storniertZeit: rueck });
      else if (einheit(v) !== sieger) neu.set(v, { ...v, storniert: true, storniertZeit: siegerZeit, ersetzt: sieger });
    }
  }
  return neu.size ? (liste || []).map((v) => neu.get(v) || v) : liste || [];
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
    // W2-D: Lade-Probleme (fehlende Speicherteile) bleiben gemeldet, bis eine Sicherung eingelesen ist; Speicher-Anfrage nur einmal
    if (Array.isArray(w.ladeFehler) && w.ladeFehler.length) out.ladeFehler = w.ladeFehler.filter(istObjekt).slice(0, 50);
    if (w.persistGefragt === true) out.persistGefragt = true;
    if (typeof w.letzteSicherungGroesse === "number") out.letzteSicherungGroesse = w.letzteSicherungGroesse;
    if (["laden", "personal", "buero"].includes(w.modus)) out.modus = w.modus; // Drei Ebenen: Modus je Handy
    if (pinWertGueltig(w.bueroPin)) out.bueroPin = w.bueroPin; else if (w.bueroPin === null) out.bueroPin = null; // nur der Prüfwert, nie die Ziffern (W2-S: auch PBKDF2 mit Salz)
    { const sp = sperreSauber(w.pinSperre); if (sp) out.pinSperre = sp; } // W2-S: Fehlversuche übersteht den Neustart
    if (pinWertGueltig(w.rettungPin) && w.rettungPin.includes("$")) out.rettungPin = w.rettungPin; // Rettung (17.10.2026): nur der Prüfwert des Rettungscodes
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
//  2. alte Einträge: die Felder storniert, erfasst, wertGesetzt und ersetzt (Storno setzt storniert, Neu-Erfassen setzt erfasst,
//     Wert nachtragen setzt wertGesetzt, Festschreiben einer Tagesnotiz setzt ersetzt am Vorgänger – Paket 2, 16.10.2026).
//  3. in dieser Sitzung angelegte Einträge (die man noch bearbeiten darf) und offene Rundgänge/Inventuren: ganz verglichen.
//  4. im Leerlauf und beim Verlassen der App wird jedes Teil ganz verglichen – das fängt auch tiefe Änderungen an alten Einträgen.
// Für alle, die Journale anfassen: Einträge nur anhängen; ein gespeicherter Eintrag wird nur über die Felder aus 2. geändert
// (oder durch ein neues Objekt ersetzt) – dann ist die Änderung sofort gespeichert, sonst erst bei 4.
export const JOURNALE = ["schwund", "tagesnotizen", "messungen", "lieferungen", "abschluesse", "kostenbelege", "putzlog", "belehrungen", "rundgaenge", "inventuren", "uploads", "verkaeufe"]; // W2-D: belehrungen als Journal (Schema 6); E7 (17.10.2026): verkaeufe
const JOURNAL_SET = new Set(JOURNALE);
// Stammdaten, die groß werden (Waren mit Preisverlauf, Gerichte mit Zutaten): je Laden ein eigenes Teil "ladenId|artikel|alle",
// bei jedem Speichern ganz verglichen (Text gegen Text) und nur geschrieben, wenn anders. So bleibt der Kopf klein.
const STAMM_SET = new Set(["artikel", "gerichte"]);
const STAMM = "alle";
const FORMAT_GETEILT = 2;
const PLATZHALTER = 0;          // hält im Kopf die Stelle des Felds frei, damit die Reihenfolge der Felder gleich bleibt
const NF = 5;                   // beobachtete Felder je alten Eintrag: storniert, erfasst, wertGesetzt, ersetzt, entwurf – alle späteren Änderungen an
                                // gespeicherten Einträgen setzen eines davon (Storno, neu erfasst, Wert nachgetragen, Tagesnotiz festgeschrieben).
                                // Feste Namen sind auf dem Handy am schnellsten. Paket 2 (16.10.2026): vorher nur storniert/erfasst – ein nachgetragener
                                // Schwund-Wert (schwundWertSetzen) und das Festschreiben einer Tagesnotiz wurden erst im Leerlauf gefunden; Safari ohne
                                // requestIdleCallback nie, und bei App-Abbruch war der Wert weg.
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
// Paket 2 (16.10.2026): Generationszähler gegen zwei Fenster derselben Fassung. Der Kopf trägt `gen`; jedes Schreiben zählt hoch
// und prüft in derselben Transaktion, ob die Datenbank noch die zuletzt gelesene Generation hat. Wenn nicht, hat ein anderes
// Fenster geschrieben: nichts überschreiben, Stand neu laden und der App „gc-fremder-stand“ melden. Alte Köpfe ohne gen zählen als 0.
let genGelesen = 0;
const verworfen = new WeakSet(); // Arbeitskopien, die nach einem fremden Stand nicht mehr geschrieben werden dürfen (verzögertes Speichern läuft noch)
export const FREMDER_STAND = "gc-fremder-stand";
export const _generation = () => genGelesen; // nur für Tests
function grundlageVerwerfen() { journale = new Map(); teileH = new Map(); stammText = new Map(); frischZahl = 0; zwang = new Set(); loeschenOffen = new Set(); bekanntGueltig = false; kopfAlt = null; ordnungAlt = null; stempelAlt = null; }

function monatVon(e) {
  const d = e && typeof e === "object" ? (typeof e.datum === "string" ? e.datum : typeof e.erfasst === "string" ? e.erfasst : "") : "";
  return d.length >= 7 && d.charCodeAt(4) === 45 ? d.slice(0, 7) : "ohne";
}
function flaggen(F, i, x) { const o = i * NF; F[o] = x.storniert; F[o + 1] = x.erfasst; F[o + 2] = x.wertGesetzt; F[o + 3] = x.ersetzt; F[o + 4] = x.entwurf; }
const flaggenGleich = (F, i, x) => { const o = i * NF; return x.storniert === F[o] && x.erfasst === F[o + 1] && x.wertGesetzt === F[o + 2] && x.ersetzt === F[o + 3] && x.entwurf === F[o + 4]; };
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
// Schwadron 18.10.2026, H3: Beim Zusammenführen galt jeder Rundgang dieser Sitzung (volle Messungs-Kopie) als Konflikt zur selben Kennung
// aus einer Sicherung (Kopie beim Laden geleert, Zeile oben) und stand danach doppelt (quelle "sicherung", konfliktMit). Beide Seiten werden
// jetzt vor dem Vergleich gleich geleert (rundgangKern). Vorhandene Doppel räumt diese Funktion beim Laden weg – idempotent: eine Kopie
// verschwindet nur, wenn sie bis auf Messungs-Kopie und Sicherungs-Kennzeichen genau dem Rundgang mit der Kennung konfliktMit gleicht.
const rundgangKern = (r, b) => (rundeDoppelt(r, b) ? { ...r, messungen: [] } : r);
function rundgangDoppelBereinigen(s) {
  const nachId = new Map(s.rundgaenge.map((r) => [r.id, r])); let weg = 0;
  const vergleich = (r) => { const o = { ...r }; for (const k of ["id", "quelle", "quelleVorher", "importiert", "konfliktMit", "storniert", "storniertZeit"]) delete o[k]; return stabil(o); };
  s.rundgaenge = s.rundgaenge.filter((r) => {
    if (r.quelle !== "sicherung" || typeof r.konfliktMit !== "string") return true;
    const orig = nachId.get(r.konfliktMit); if (!orig) return true;
    const kopie = rundgangKern({ ...r, id: r.konfliktMit }, s);
    if (vergleich({ ...kopie, ...(r.quelleVorher ? { quelle: r.quelleVorher } : {}) }) !== vergleich({ ...orig, ...(orig.quelle ? { quelle: orig.quelle } : {}) })) return true;
    if (r.storniert && !orig.storniert) { orig.storniert = true; if (r.storniertZeit && !orig.storniertZeit) orig.storniertZeit = r.storniertZeit; }
    weg += 1; return false;
  });
  if (weg && istObjekt(s.abgleichHinweis)) {
    const h = s.abgleichHinweis; h.konflikte = Math.max(0, (Number(h.konflikte) || 0) - weg);
    if (!h.konflikte && !(h.zukunft > 0) && !(Array.isArray(h.bereiche) && h.bereiche.length)) s.abgleichHinweis = null;
  }
  return weg;
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

// ---------- W2-D: Bereiche mit eigenem Zeitstempel (Abgleich zweier Handys) ----------
// Beim Speichern wird je Bereich ein Fingerabdruck des Inhalts gebildet. Ändert er sich, bekommt der Bereich stammZeit[bereich] = jetzt.
// Kein Bildschirm muss etwas melden. Ein Müll- oder Umsatz-Eintrag ändert keinen Bereich. Erster Fingerabdruck (nach dem Update) = kein Zeitstempel.
export const BEREICHE = {
  kosten: ["kosten", "kostenKategorienGeprueft", "team"],
  gerichte: ["gerichte", "selbst", "selbstAutoArt", "adanaBrot"], // 20.10.2026: Antwort auf die Brot-Frage zum Adana
  artikel: ["artikel"],
  betrieb: ["betrieb", "kanaele", "verkauf", "ladenArt"],
  kuehl: ["kuehlstellen", "kuehl"],
  putzplan: ["putzplan", "putzplanSpaeter"],
  personen: ["personen"],
  lager: ["lager"], // Bestand (17.10.2026): eigener Bereich – ältere Stände bekommen dadurch keinen neuen Zeitstempel in „Betrieb“
  kombis: ["kassenKombis"], // Schwadron 18.10.2026, M1: Kombi-Menüs der Kasse – eigener Bereich (wie lager), alte Stände bleiben unberührt
  aktionen: ["aktionen"], // Menütafel (18.10.2026): übernommene Aktionen – eigener Bereich, beim Zusammenführen vereinigt (verschmelzen)
  tafel: ["tafel"],       // Menütafel (18.10.2026): Einstellungen der Tafel
  lieferanten: ["lieferanten"], // Lieferanten (18.10.2026): eigener Bereich, beim Zusammenführen vereinigt (entfernt gewinnt)
};
const BEREICH_NAMEN = Object.keys(BEREICHE);
function bereichText(b, a) { const f = BEREICHE[a]; return f.length === 1 ? JSON.stringify(b[f[0]] ?? null) : JSON.stringify(f.map((k) => b[k] ?? null)); }
export const bereichHash = (b, a) => hash(bereichText(b, a));
const bereichTexte = new WeakMap(); // Betrieb → { bereich: Text beim letzten Speichern } – spart das Hashen, wenn nichts anders ist
// Fingerabdrücke je Laden (Kennung → { bereich: hash }) – gespeichert im Kopf (kopf.bereiche), nicht im Laden selbst
let bereichH = new Map();
const bereichVorgabe = new WeakMap(); // nach dem Zusammenführen: der Stand, der schon als „bekannt“ gilt (kein neuer Zeitstempel)
function bereicheStempeln(b, sid, texte) {
  if (!istObjekt(b)) return;
  let alt = bereichTexte.get(b); if (!alt) { alt = {}; bereichTexte.set(b, alt); }
  const vorgabe = bereichVorgabe.get(b); if (vorgabe) { bereichVorgabe.delete(b); bereichH.set(sid, { ...(bereichH.get(sid) || {}), ...vorgabe }); for (const a of Object.keys(vorgabe)) delete alt[a]; }
  const H = bereichH.get(sid) || {}; let neuH = null, neuZ = null; const jetzt = new Date().toISOString();
  for (const a of BEREICH_NAMEN) {
    const t = bereichText(b, a); if (BEREICHE[a].length === 1 && STAMM_SET.has(BEREICHE[a][0])) texte[BEREICHE[a][0]] = t;
    if (alt[a] === t && H[a] !== undefined) continue;
    alt[a] = t; const h = hash(t); if (H[a] === h) continue;
    neuH ??= { ...H }; const vorher = neuH[a]; neuH[a] = h;
    if (vorher !== undefined) { neuZ ??= { ...(istObjekt(b.stammZeit) ? b.stammZeit : {}) }; neuZ[a] = jetzt; }
  }
  if (neuH) bereichH.set(sid, neuH); if (neuZ) b.stammZeit = neuZ;
}

function stammPruefen(sid, j, liste, out, fertig) {
  const key = sid + "|" + j + "|" + STAMM; out.stamm.add(key);
  const t = fertig ?? JSON.stringify(liste); // W2-D: Text der Waren kommt schon aus dem Bereichs-Fingerabdruck
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

function schreibenJetzt(wurzel, { stempel = true, tief = seiteVersteckt(), zweiter = false } = {}) { // zweiter: Wiederholung nach fremdem Stand (Paket 2)
  if (!verfuegbar || !db) return Promise.resolve(false);
  if (verworfen.has(wurzel)) return Promise.resolve(false); // Paket 2: diese Arbeitskopie ist überholt (fremder Stand geladen)
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
    const texte = {}; bereicheStempeln(b, sid, texte); // W2-D: Zeitstempel je Bereich aus dem Inhalt
    const k = {}; const ord = {}; stempelListe[i] = null;
    for (const key in b) {
      const v = b[key];
      if (key === "geaendert") { k[key] = PLATZHALTER; stempelListe[i] = v ?? null; }
      else if (JOURNAL_SET.has(key) && Array.isArray(v)) { k[key] = PLATZHALTER; ord[key] = journalPruefen(b, sid, key, v, tief, out); }
      else if (STAMM_SET.has(key) && Array.isArray(v)) { k[key] = PLATZHALTER; ord[key] = STAMM; stammPruefen(sid, key, v, out, texte[key]); }
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
  const bereiche = {}; for (const sid of ids) if (bereichH.has(sid)) bereiche[sid] = bereichH.get(sid); // W2-D: Fingerabdrücke je Bereich
  const kopf = { format: FORMAT_GETEILT, schema: Number(wurzel.schema) || SCHEMA, gespeichert: new Date().toISOString(), wurzel: kopfText, stempel: stempelText, ids, ordnung, teile, bereiche };
  // Die neue Grundlage gilt sofort (das nächste Speichern wartet ohnehin auf diese Transaktion); schlägt sie fehl, wird sie verworfen
  bekanntGueltig = true; kopfAlt = kopfText; ordnungAlt = ordnungText; stempelAlt = stempelText;
  let fremd = null; // Paket 2: Generation in der Datenbank, falls sie nicht mehr die gelesene ist
  return txMehr(["stand", "teile"], "readwrite", (t) => {
    const stand = t.objectStore("stand"), tl = t.objectStore("teile");
    // Paket 2 (16.10.2026): erst lesen, dann in DERSELBEN Transaktion schreiben – IndexedDB hält andere Schreiber solange zurück.
    // Hat ein anderes Fenster inzwischen geschrieben (gen ≠ gelesen), bleibt die Transaktion ohne Schreiben; der Stand wird danach neu geladen.
    const r = stand.get("kopf");
    r.onsuccess = () => {
      const genDa = istObjekt(r.result) ? Number(r.result.gen) || 0 : 0;
      if (genDa !== genGelesen) { fremd = genDa; return; }
      kopf.gen = genGelesen + 1;
      if (voll) tl.clear();
      for (const x of out.schreiben) tl.put(x.wert, x.key);
      for (const k of out.loeschen) tl.delete(k);
      stand.put(kopf, "kopf");
    };
  }).then(() => { if (fremd !== null) return fremderStand(wurzel, fremd, { stempel, zweiter }); genGelesen += 1; leerlaufPlanen(); return true; }, (e) => { grundlageVerwerfen(); return speicherFehler(e); });
}
function speicherFehler(e) { console.warn("Speichern fehlgeschlagen:", e); if (fehlerMelder) fehlerMelder("speichern", e); return false; }

// Paket 2 (16.10.2026, Nachtrag Lead): ein anderes Fenster hat geschrieben. Die eigene Arbeitskopie wird nicht weggeworfen, sondern
// in den frischen Stand aus der Datenbank gemischt (zusammenfuehren – derselbe Weg wie beim Einlesen einer Sicherung: Journale nach
// Kennung vereinigt, Bereiche nach Zeitstempel, HACCP-Einträge nie überschrieben) und das Ergebnis einmal erneut geschrieben.
// Meldet das zweite Schreiben wieder eine fremde Generation, wird aufgegeben: frischer Stand geladen, eigene Kopie verworfen.
// In beiden Fällen bekommt die App das Ereignis „gc-fremder-stand“ (detail.wurzel = der Stand, mit dem sie weiterarbeiten muss,
// detail.zusammengefuehrt = true, wenn die eigenen Änderungen drin sind). Die alte Arbeitskopie wird nie mehr geschrieben
// (auch nicht vom noch anstehenden verzögerten Speichern). Rückgabe true = eigene Änderungen liegen in der Datenbank.
const inhaltOffen = (j, e) => j === "rundgaenge" ? (Array.isArray(e.messungen) ? e.messungen.length : 0) : Object.values(istObjekt(e.posten) ? e.posten : {}).filter((m) => m !== null).length;
function offeneBehalten(b, eigen) {
  for (const j of ["rundgaenge", "inventuren"]) {
    const liste = Array.isArray(b[j]) ? b[j] : (b[j] = []);
    for (const e of (Array.isArray(eigen[j]) ? eigen[j] : []).filter((x) => offen(j, x))) {
      const i = liste.findIndex((x) => x && x.id === e.id);
      if (i < 0) liste.push(e); else if (offen(j, liste[i]) && inhaltOffen(j, e) > inhaltOffen(j, liste[i])) liste[i] = e;
    }
  }
}
async function fremderStand(wurzel, genDa, { stempel = true, zweiter = false } = {}) {
  verworfen.add(wurzel); grundlageVerwerfen();
  let neu = null;
  try { neu = await standLesen(); } catch (e) { console.warn("Fremder Stand, Neuladen fehlgeschlagen:", e); }
  let zusammengefuehrt = false, ok = false;
  if (neu && !zweiter) {
    try {
      zusammenfuehren(neu, wurzel); if (neu.betriebe.some((b) => b.id === wurzel.aktiv)) neu.aktiv = wurzel.aktiv; // der hier gewählte Laden bleibt gewählt
      // verschmelzen behält offene Rundgänge/Inventuren nur von der „lokalen“ Seite (hier: Datenbank). Ein in DIESEM Fenster laufender
      // Rundgang darf nicht verschwinden: offene Einträge beider Seiten behalten; dieselbe Kennung auf beiden Seiten → die mit mehr Inhalt.
      for (const b of neu.betriebe) { const eigen = wurzel.betriebe.find((x) => x.id === b.id); if (eigen) offeneBehalten(b, eigen); }
      zusammengefuehrt = true;
    } catch (e) { console.warn("Fremder Stand, Zusammenführen fehlgeschlagen:", e); }
    if (zusammengefuehrt) {
      ok = await schreibenJetzt(neu, { stempel, zweiter: true }); // zweiter Konflikt → gibt auf und meldet selbst (zusammengefuehrt: false)
      if (!ok) return false;
    }
  }
  ereignis("speicher-fremder-stand", { gen: genDa, geladen: !!neu, zusammengefuehrt: ok });
  if (typeof window !== "undefined" && typeof CustomEvent === "function") window.dispatchEvent(new CustomEvent(FREMDER_STAND, { detail: { wurzel: neu, zusammengefuehrt: ok } }));
  return ok;
}

// Kopf + Teile → Wurzel in genau der Form, wie sie gespeichert wurde.
// W2-D: Ein fehlendes oder kaputtes Teil bricht nicht mehr alles ab – nur dieses Teil fehlt, alle anderen Monate laden.
// Was fehlt, landet in `fehlt` ([{ laden, journal, monat, grund }]) und wird im Büro gemeldet. Wirft nur, wenn der Kopf selbst unlesbar ist.
function zusammensetzen(kopf, teile, fehlt = null) {
  if (!istObjekt(kopf) || kopf.format !== FORMAT_GETEILT || typeof kopf.wurzel !== "string") throw new Error("Kopf unbekannt");
  const melden = (sid, j, m, grund) => { if (fehlt) fehlt.push({ laden: String(sid).split("~")[0], journal: j, monat: m, grund }); else throw new Error("Teil " + grund + ": " + sid + "|" + j + "|" + m); };
  const nachSchluessel = new Map();
  for (const v of teile || []) if (istObjekt(v)) nachSchluessel.set(v.s + "|" + v.j + "|" + v.m, v);
  if (!fehlt) for (const [key, h] of Object.entries(kopf.teile || {})) { const v = nachSchluessel.get(key); if (!v || v.h !== h) throw new Error("Teil fehlt oder veraltet: " + key); }
  const lies = (v) => { try { const e = JSON.parse(v.t); return Array.isArray(e) ? e : null; } catch (_) { return null; } };
  const w = JSON.parse(kopf.wurzel); const stempel = JSON.parse(kopf.stempel || "[]");
  (w.betriebe || []).forEach((b, i) => {
    if ("geaendert" in b) b.geaendert = stempel[i] ?? null;
    const ord = kopf.ordnung?.[i] || {}; const sid = kopf.ids?.[i] ?? String(b?.id ?? "");
    for (const j of Object.keys(ord)) {
      if (ord[j] === STAMM) {
        const v = nachSchluessel.get(sid + "|" + j + "|" + STAMM); const liste = v ? lies(v) : null;
        if (!v) melden(sid, j, STAMM, "fehlt"); else if (!liste) melden(sid, j, STAMM, "kaputt");
        b[j] = liste || []; continue;
      }
      const liste = []; const zeiger = new Map();
      for (const [m, n] of ord[j]) {
        let z = zeiger.get(m);
        if (!z) {
          const v = nachSchluessel.get(sid + "|" + j + "|" + m); const e = v ? lies(v) : null;
          if (!v) melden(sid, j, m, "fehlt"); else if (!e) melden(sid, j, m, "kaputt");
          else if (e.length !== v.n) melden(sid, j, m, "unvollstaendig");
          z = { e: e || [], i: 0 }; zeiger.set(m, z);
        }
        for (let k = 0; k < n && z.i < z.e.length; k++) liste.push(z.e[z.i++]);
      }
      for (const [m, z] of zeiger) if (z.i < z.e.length) { if (!fehlt) throw new Error("Teil zu lang"); while (z.i < z.e.length) liste.push(z.e[z.i++]); } // überzählige Einträge nicht wegwerfen
      b[j] = liste;
    }
  });
  return w;
}

// W2-D: Kopf fehlt oder ist unlesbar, aber Teile sind da – Läden aus den Teilen wieder aufbauen (Journale, Waren, Gerichte),
// statt eine leere Einrichtung zu zeigen. Betriebsdaten (Name, Kosten …) sind dann weg; das meldet das Büro.
function ausTeilenRetten(teile, fehlt) {
  const laeden = new Map();
  for (const v of teile || []) {
    if (!istObjekt(v) || typeof v.s !== "string" || typeof v.j !== "string") continue;
    let e; try { e = JSON.parse(v.t); } catch (_) { e = null; } if (!Array.isArray(e)) continue;
    const sid = v.s.split("~")[0]; let b = laeden.get(sid);
    if (!b) { b = leererBetrieb(); b.id = sid; b.phase = "app"; b.weg = "genau"; laeden.set(sid, b); }
    if (STAMM_SET.has(v.j) && v.m === STAMM) b[v.j] = e;
    else if (JOURNAL_SET.has(v.j)) (b["_" + v.j] ??= []).push([v.m, e]);
  }
  if (!laeden.size) return null;
  const w = leereWurzel();
  for (const b of laeden.values()) {
    for (const j of JOURNALE) { const t = b["_" + j]; delete b["_" + j]; if (t) b[j] = t.sort((x, y) => String(x[0]).localeCompare(String(y[0]))).flatMap((x) => x[1]); }
    w.betriebe.push(b);
  }
  w.aktiv = w.betriebe[0].id;
  fehlt.push({ laden: null, journal: "kopf", monat: null, grund: "kaputt" });
  return w;
}

// Nach dem Laden: Grundlage = die geladene (gehobene) Wurzel, Prüfsummen von den gespeicherten Teilen.
// Was die Hebung verändert hat, findet die erste ganze Prüfung (Leerlauf/Verlassen) und schreibt es einmal nach.
function grundlageSetzen(w, teile, fehlt = []) {
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
  const behalten = new Set(fehlt.filter((x) => x.grund !== "fehlt").map((x) => x.laden + "|" + x.journal + "|" + x.monat)); // W2-D: kaputte Teile nicht löschen (vielleicht noch zu retten)
  for (const key of gespeichert.keys()) if (!da.has(key) && !behalten.has(key)) loeschenOffen.add(key);
  bekanntGueltig = true; letzteWurzel = w;
}

// Leerlauf-Prüfung: jedes Teil ganz vergleichen (fängt Änderungen tief in alten Einträgen, die die Felder aus 2. nicht sehen).
// Läuft in kleinen Stücken, wenn das Handy nichts zu tun hat; findet sie etwas, wird normal (verzögert) gespeichert.
// Paket 2 (16.10.2026): Safari/iOS kennt requestIdleCallback nicht – Rückfall auf setTimeout mit festem Zeitbudget je Stück (8 ms),
// damit die Prüfung dort nicht ganz ausfällt. Die Felder aus 2. fangen die bekannten Änderungen sofort; das hier ist das Sicherheitsnetz.
const ricRueckfall = (fn, { timeout = 0 } = {}) => { // erstes Stück nach 1 s (Start nicht stören), weitere alle 200 ms
  const z = setTimeout(() => { const start = Date.now(); fn({ didTimeout: false, timeRemaining: () => Math.max(0, 8 - (Date.now() - start)) }); }, timeout >= 10000 ? 1000 : 200);
  if (z && typeof z.unref === "function") z.unref(); // Node-Tests: hält den Prozess nicht offen
  return z;
};
let leerlaufHandle = null, leerlaufEcht = false; // laufende Planung (zum Abbrechen beim Neuladen des Stands)
function leerlaufAbbrechen() {
  if (leerlaufHandle !== null) { try { if (leerlaufEcht && typeof globalThis.cancelIdleCallback === "function") globalThis.cancelIdleCallback(leerlaufHandle); else clearTimeout(leerlaufHandle); } catch (_) { /* egal */ } }
  leerlaufHandle = null; leerlaufGeplant = false; leerlaufZuletzt = 0;
}
function leerlaufPlanen() {
  leerlaufEcht = typeof globalThis.requestIdleCallback === "function";
  const ric = (fn, opt) => { leerlaufHandle = (leerlaufEcht ? globalThis.requestIdleCallback : ricRueckfall)(fn, opt); };
  if (leerlaufGeplant || Date.now() - leerlaufZuletzt < LEERLAUF_ABSTAND) return;
  leerlaufGeplant = true;
  ric((frist) => {
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
      leerlaufGeplant = false; leerlaufZuletzt = Date.now(); leerlaufHandle = null;
      if (gefunden && w && letzteWurzel === w && bekanntGueltig) speichern(w);
    };
    stueck(frist && typeof frist.timeRemaining === "function" ? frist : { timeRemaining: () => 10 }); // Rückfall: Budget des Stücks einhalten
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
// Beispiel-Laden (17.10.2026): zählt nicht – erfundene Einträge machen keine Sicherung fällig.
// 20.10.2026 (Sicherungs-Test, Fund 3): auch Einrichtungsarbeit zählt – jeder Artikel mit eigenem Preis. Sonst kam die Erinnerung nie,
// solange jemand nur Karte und Preise einträgt (100 Artikel, 0 Journal-Einträge = Stufe null).
const eigenePreise = (b) => (b.artikel || []).filter((a) => typeof a.preis === "number" && a.preis > 0 && !istRichtpreis(a)).length;
export function eintraegeZaehlen(wurzel) {
  return wurzel.betriebe.filter((b) => !b.beispiel).reduce((n, b) => n + eigenePreise(b) + b.schwund.length + b.tagesnotizen.length + b.messungen.length + (b.lieferungen || []).length + (b.abschluesse || []).length + (b.kostenbelege || []).length + (b.putzlog || []).length + (b.inventuren || []).filter((i) => i.abgeschlossen).length + (b.verkaeufe || []).length, 0); // E7 (17.10.2026): Verkäufe zählen mit
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

// W2-D: Die Sicherung ist ein ZIP (ohne Kompression): gastrocalc-sicherung.json (zweizeilig wie bisher, mit Prüfsumme),
// ablage.json (Typ und Größe je Datei) und ablage/<Kennung> – alle Fotos und Belege dieses Geräts. Ein Knopf, ein Dateiname mit Datum.
// letzteSicherung setzt app.js erst, wenn Teilen oder Speichern geklappt hat.
export const SICHERUNG_JSON = "gastrocalc-sicherung.json";
// E5 (16.10.2026): mit passwort wird die fertige ZIP als Ganzes verschlüsselt (schluessel.js) und in eine zweite ZIP gelegt:
// sicherung.enc + LIESMICH.txt, Endung .gcs.zip. Ohne passwort bleibt alles wie bisher (gleiche Bytes, gleicher Name). Das Passwort wird nicht gespeichert.
export async function exportDatei(wurzel, { mitAblage = true, passwort = null } = {}) {
  const r = await exportDateiOffen(wurzel, { mitAblage });
  if (passwort === null || passwort === undefined) return { ...r, verschluesselt: false };
  const enc = await verschluesseln(new Uint8Array(await r.blob.arrayBuffer()), passwort);
  const blob = await zipBlob([{ name: SICHERUNG_ENC, daten: enc }, { name: LIESMICH_NAME, daten: LIESMICH }]);
  return { ...r, blob, groesse: blob.size, name: r.name.replace(/\.zip$/, ".gcs.zip"), verschluesselt: true };
}
async function exportDateiOffen(wurzel, { mitAblage = true } = {}) {
  await ereignis("export", { betriebe: wurzel.betriebe.length });
  const ereignisse = await alleEreignisse();
  // Stresstest 15.10.: einmal in Text, einmal in Bytes – Prüfsumme und Datei entstehen aus denselben Bytes
  const { bueroPin: _pin, pinSperre: _sperre, rettungPin: _rettung, ...ohneCode } = wurzel; // W2-S (p07 M3): der Büro-Code wandert nicht in die Sicherung (das Einlesen übernimmt ihn ohnehin nicht)
  const bytes = new TextEncoder().encode(JSON.stringify({ exportiert: new Date().toISOString(), geraet: wurzel.geraet, fassung: APP_FASSUNG, wurzel: ohneCode, ereignisse }));
  const sha = await sha256Hex(bytes);
  const kopf = new TextEncoder().encode(JSON.stringify({ typ: "gastrocalc-sicherung", schema: SCHEMA, sha256: sha }) + "\n");
  const json = new Uint8Array(kopf.length + bytes.length); json.set(kopf, 0); json.set(bytes, kopf.length);
  const dateien = []; const liste = {};
  if (mitAblage) for (const id of await ablageKennungen()) {
    const d = await ablageLesen(id).catch(() => null); if (!d || !(d.size > 0)) continue;
    dateien.push({ name: "ablage/" + id, daten: d }); liste[id] = { typ: d.type || "", groesse: d.size };
  }
  const blob = await zipBlob([{ name: SICHERUNG_JSON, daten: json }, { name: "ablage.json", daten: JSON.stringify(liste) }, ...dateien]);
  const aktiv = wurzel.betriebe.find((b) => b.id === wurzel.aktiv);
  const stamm = wurzel.betriebe.length > 1 ? `${wurzel.betriebe.length}-laeden` : (aktiv?.betrieb.name || "laden");
  const name = `gastrocash-${stamm.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()}-${heute()}.zip`;
  return { blob, name, fingerabdruck: sha ? sha.slice(0, 10) : null, groesse: blob.size, dateien: dateien.length };
}

// W2-D: Einlesen nimmt das ZIP und die alte JSON-Datei. Rückgabe wie importDatei, dazu ablage: [{ id, typ, eintrag }] (Fotos/Belege, noch nicht abgelegt).
// E5 (16.10.2026): Liegt sicherung.enc in der ZIP, braucht es ein Passwort: ohne → { passwortNoetig: true }; mit → entschlüsseln und
// wie bisher weiter. Falsches Passwort wirft Fehler mit grund "passwort". Unverschlüsselte Dateien laufen ohne Rückfrage.
export async function importSicherung(datei, { passwort = null } = {}) {
  if (await istZip(datei)) {
    let eintraege; try { eintraege = await zipLesen(datei); } catch (_) { throw Object.assign(new Error("format"), { grund: "format" }); }
    const enc = eintraege.find((e) => e.name === SICHERUNG_ENC);
    if (enc) {
      if (passwort === null || passwort === undefined) return { passwortNoetig: true, zip: true, verschluesselt: true };
      const bytes = await enc.bytes();
      if (!istVerschluesselt(bytes)) throw Object.assign(new Error("format"), { grund: "format" });
      const klar = await entschluesseln(bytes, passwort); // wirft grund "passwort"
      const r = await importSicherung(new Blob([klar], { type: "application/zip" }));
      if (r.passwortNoetig) throw Object.assign(new Error("format"), { grund: "format" }); // doppelt verpackt gibt es nicht
      r.verschluesselt = true; return r;
    }
    const j = eintraege.find((e) => e.name === SICHERUNG_JSON);
    if (!j) throw Object.assign(new Error("format"), { grund: "format" });
    const r = await importDatei(new TextDecoder().decode(await j.bytes()));
    if (!(await j.crcOk()) && r.pruefsumme === "ok") r.pruefsumme = "abweichung";
    let liste = {}; const lj = eintraege.find((e) => e.name === "ablage.json");
    if (lj) { try { const x = JSON.parse(new TextDecoder().decode(await lj.bytes())); if (istObjekt(x)) liste = x; } catch (_) { /* ohne Typen */ } }
    r.ablage = eintraege.filter((e) => e.name.startsWith("ablage/") && e.name.length > 7).map((e) => { const id = e.name.slice(7); return { id, typ: typeof liste[id]?.typ === "string" ? liste[id].typ : "", eintrag: e }; });
    r.zip = true; r.verschluesselt = false; return r;
  }
  const r = await importDatei(await datei.text()); r.ablage = []; r.zip = false; r.verschluesselt = false; return r;
}
// Fotos/Belege aus dem ZIP zurück in die Ablage (vorhandene bleiben). zuruecklegen = ablageZuruecklegen aus ablage.js.
export async function ablageAusSicherung(liste, zuruecklegen) {
  let neu = 0, kaputt = 0, da = 0;
  for (const x of liste || []) {
    try {
      const bytes = await x.eintrag.bytes();
      if (crc32Pruefen(bytes) !== x.eintrag.crc) { kaputt += 1; continue; }
      if (await zuruecklegen(x.id, new Blob([bytes], { type: x.typ || "application/octet-stream" }))) neu += 1; else da += 1;
    } catch (_) { kaputt += 1; }
  }
  return { neu, kaputt, da };
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
function ohneCode(w) { delete w.bueroPin; delete w.pinSperre; delete w.rettungPin; return w; } // Rettung (17.10.2026): auch der Rettungscode bleibt am Handy

// ---------- Zusammenführen ----------
// W2-D (15.10.2026): Journale werden vereinigt (wie bisher). Stammdaten gewinnen nicht mehr als ganzer Laden, sondern je Bereich (BEREICHE).
// HACCP-Nachweise (Messungen, Rundgänge, Putz-Nachweis, Belehrungen, Abschlüsse) werden beim Einlesen nie verändert: gleiche Kennung mit
// anderem Inhalt kommt als eigener Eintrag daneben (quelle "sicherung", konfliktMit), Einträge mit Datum in der Zukunft werden nicht übernommen.
const TAG_MS = 86400e3;
const HACCP = new Set(["messungen", "rundgaenge", "putzlog", "belehrungen", "abschluesse"]);
// Zeitstempel aus der Zukunft (mehr als 1 Tag nach jetzt) zählen als jetzt – eine falsch gestellte Handy-Uhr gewinnt sonst jeden Abgleich
export function zeitKappen(t, jetzt = Date.now()) {
  if (typeof t !== "string" || !t) return "";
  const ms = Date.parse(t); if (!Number.isFinite(ms)) return "";
  return ms > jetzt + TAG_MS ? new Date(jetzt).toISOString() : t;
}
function inZukunft(e, jetzt) {
  const grenze = new Date(jetzt + TAG_MS); const tag = heute(grenze); const iso = grenze.toISOString();
  return (typeof e.datum === "string" && e.datum.slice(0, 10) > tag) || ["zeit", "erfasst", "abgeschlossen"].some((k) => typeof e[k] === "string" && e[k].length > 10 && e[k] > iso);
}
// Text mit sortierten Schlüsseln: gleicher Inhalt = gleicher Text, egal in welcher Reihenfolge die Felder stehen
function stabil(x) {
  if (Array.isArray(x)) return "[" + x.map(stabil).join(",") + "]";
  if (x && typeof x === "object") return "{" + Object.keys(x).filter((k) => x[k] !== undefined).sort().map((k) => JSON.stringify(k) + ":" + stabil(x[k])).join(",") + "}";
  return JSON.stringify(x ?? null);
}
const FLAGGEN = new Set(["storniert", "storniertZeit", "importiert", "konfliktMit", "quelleVorher"]);
function kern(e, ohneWert) { const o = {}; for (const k of Object.keys(e)) if (!FLAGGEN.has(k) && !(ohneWert && k === "wert")) o[k] = e[k]; return stabil(o); }

// Journale: Vereinigung nach Kennung, Kennzeichen (storniert, entfernt, archiviert) gewinnen immer.
// schutz (HACCP): vorhandene lokale Einträge ändern sich nur über Kennzeichen (Storno, nachgetragener Wert); bericht zählt Konflikte und Zukunft.
function journalVereinigen(a, b, kennzeichen = ["storniert"], { schutz = false, bericht = null, jetzt = Date.now() } = {}) {
  const m = new Map(); const lokal = new Set();
  for (const e of a || []) if (e && typeof e.id === "string") { m.set(e.id, m.has(e.id) ? vereinige(m.get(e.id), e, kennzeichen) : e); lokal.add(e.id); }
  for (const e of b || []) {
    if (!e || typeof e.id !== "string") continue;
    const alt = m.get(e.id);
    if (!alt) {
      if (schutz && inZukunft(e, jetzt)) { if (bericht) bericht.zukunft += 1; continue; }
      m.set(e.id, e); continue;
    }
    if (schutz && lokal.has(e.id)) {
      const ohneWert = alt.wert === null || e.wert === null;
      if (kern(alt, ohneWert) !== kern(e, ohneWert)) {
        const id = e.id + "~s" + kurzHash(stabil(e));
        if (!m.has(id) && !inZukunft(e, jetzt)) { m.set(id, { ...e, id, quelleVorher: e.quelle ?? null, quelle: "sicherung", importiert: true, konfliktMit: e.id }); if (bericht) bericht.konflikte += 1; }
        continue;
      }
      const neu = { ...alt };
      for (const k of kennzeichen) neu[k] = !!(alt[k] || e[k]);
      if (!alt.storniertZeit && e.storniertZeit) neu.storniertZeit = e.storniertZeit;
      if (alt.wert === null && typeof e.wert === "number") neu.wert = e.wert; // nachgetragener Wert gewinnt über „offen"
      m.set(e.id, neu); continue;
    }
    m.set(e.id, vereinige(alt, e, kennzeichen));
  }
  return [...m.values()];
}
function vereinige(alt, e, kennzeichen) {
  // Bei gleicher Kennung gewinnt der jünger erfasste Eintrag; Kennzeichen (storniert/entfernt) gewinnen immer
  const [aelter, juenger] = String(e.erfasst || "") >= String(alt.erfasst || "") ? [alt, e] : [e, alt];
  const neu = { ...aelter, ...juenger };
  for (const k of kennzeichen) neu[k] = !!(alt[k] || e[k]);
  if (kennzeichen.includes("entfernt") && (alt.entfernt || e.entfernt)) { const q = alt.entfernt ? alt : e; neu.kuerzel = q.kuerzel; neu.aktiv = false; } // Pseudonym bleibt
  if (alt.storniertZeit || e.storniertZeit) neu.storniertZeit = alt.storniertZeit || e.storniertZeit;
  if (alt.wert === null && typeof e.wert === "number") neu.wert = e.wert;
  if (typeof alt.wert === "number" && e.wert === null) neu.wert = alt.wert;
  return neu;
}

// Welche Seite liefert einen Bereich? 1) gleicher Inhalt → lokal. 2) Es gab schon einen Abgleich: kennt dieses Handy den fremden Stand schon →
// lokal; hat sich lokal seitdem nichts geändert → fremd; beide geändert → lokal bleibt (beide: true, Hinweis im Büro).
// 3) Noch kein Abgleich: der jüngere Zeitstempel des Bereichs (gekappt), ohne Zeitstempel der jüngere Laden (wie bis Schema 5).
function bereichWahl(lokal, fremd, a, jetzt) {
  const hL = bereichHash(lokal, a), hF = bereichHash(fremd, a);
  if (hL === hF) return { q: "lokal", hL, hF };
  const ab = istObjekt(lokal.abgleich) ? lokal.abgleich[a] : null;
  if (istObjekt(ab) && typeof ab.zuletzt === "string") {
    if (ab.zuletzt === hF || (Array.isArray(ab.bekannt) && ab.bekannt.includes(hF))) return { q: "lokal", hL, hF };
    if (ab.zuletzt === hL) return { q: "fremd", hL, hF };
    return { q: "lokal", beide: true, hL, hF };
  }
  const tL = zeitKappen(lokal.stammZeit?.[a], jetzt), tF = zeitKappen(fremd.stammZeit?.[a], jetzt);
  if (tL || tF) return { q: tF > tL ? "fremd" : "lokal", hL, hF };
  return { q: zeitKappen(fremd.geaendert, jetzt) >= zeitKappen(lokal.geaendert, jetzt) ? "fremd" : "lokal", hL, hF };
}
// Listen mit Kennung (Kühlstellen, Personen): Liste der gewählten Seite, dazu Einträge, die nur die andere Seite kennt; Kennzeichen gewinnen.
// Kürzel ausgeschiedener Mitarbeiter (18.10.2026): das Datum „ausgeschieden“ geht beim Zusammenführen nicht verloren (das frühere gilt).
// Lieferanten (18.10.2026): dieselbe Vereinigung für die Lieferanten – entfernt gewinnt, die Zeit der Entfernung bleibt (personen: false).
function listeMitKennzeichen(sieger, verlierer, flag, { personen = flag === "entfernt" } = {}) {
  const m = new Map(); for (const x of sieger || []) if (x && typeof x.id === "string") m.set(x.id, { ...x });
  for (const x of verlierer || []) {
    if (!x || typeof x.id !== "string") continue; const s = m.get(x.id);
    if (!s) { m.set(x.id, { ...x }); continue; }
    if (x[flag] && !s[flag]) { s[flag] = true; if (flag === "entfernt" && personen) { s.kuerzel = x.kuerzel; s.aktiv = false; } if (typeof x.entferntZeit === "string") s.entferntZeit = x.entferntZeit; }
    if (personen && typeof x.ausgeschieden === "string" && (typeof s.ausgeschieden !== "string" || x.ausgeschieden < s.ausgeschieden)) s.ausgeschieden = x.ausgeschieden;
  }
  return [...m.values()];
}
function abgleichMerken(b, a, hF) {
  const h = bereichHash(b, a); bereichVorgabe.set(b, { ...(bereichVorgabe.get(b) || {}), [a]: h }); // gilt beim nächsten Speichern als bekannt
  const alt = istObjekt(b.abgleich?.[a]) ? b.abgleich[a] : {};
  const bekannt = [...new Set([...(Array.isArray(alt.bekannt) ? alt.bekannt : []), ...(hF ? [hF] : []), h])].slice(-8);
  b.abgleich = { ...(istObjekt(b.abgleich) ? b.abgleich : {}), [a]: { zuletzt: h, bekannt } };
}
export function abgleichGrundlage(b) { for (const a of BEREICH_NAMEN) abgleichMerken(b, a, null); return b; }

export function verschmelzen(lokal, fremd, { jetzt = Date.now() } = {}) {
  const basis = structuredClone(lokal); // Rest (Einrichtungsstand, Hinweise …) bleibt vom eigenen Handy
  if ((lokal.phase === "app" || fremd.phase === "app") && basis.phase !== "app") { basis.phase = "app"; basis.rueckkehr = null; }
  const bericht = { beide: [], zukunft: 0, konflikte: 0 };
  basis.stammZeit = { ...(istObjekt(lokal.stammZeit) ? lokal.stammZeit : {}) };
  for (const a of BEREICH_NAMEN) {
    const w = bereichWahl(lokal, fremd, a, jetzt);
    const [sieger, verlierer] = w.q === "fremd" ? [fremd, lokal] : [lokal, fremd];
    for (const k of BEREICHE[a]) { if (sieger[k] === undefined) delete basis[k]; else basis[k] = structuredClone(sieger[k]); }
    if (a === "kuehl") basis.kuehlstellen = listeMitKennzeichen(sieger.kuehlstellen, verlierer.kuehlstellen, "archiviert").sort((x, y) => x.reihe - y.reihe);
    if (a === "aktionen") basis.aktionen = aktionenVereinigen(sieger.aktionen, verlierer.aktionen); // Menütafel (18.10.2026)
    if (a === "lieferanten") { basis.lieferanten = listeMitKennzeichen(sieger.lieferanten, verlierer.lieferanten, "entfernt", { personen: false }); // Lieferanten (18.10.2026)
      if (lieferantenEntdoppeln(basis)) abgleichMerken(basis, "artikel", null); } // Prüfgremium 18.10.2026 (N3): umbenannt + neu angelegt = einer; Waren zeigen auf den bleibenden
    if (a === "personen") basis.personen = listeMitKennzeichen(sieger.personen, verlierer.personen, "entfernt").map((p) => ({ ...p, aktiv: p.entfernt ? false : p.aktiv }));
    if (a === "betrieb" && istObjekt(basis.betrieb)) basis.betrieb.hinweise = hinweiseVereinigen(lokal.betrieb?.hinweise, fremd.betrieb?.hinweise); // Vertrag Abschnitt 2: je Karte jüngste Zeit gewinnt (Gremium 2, 24.10.2026)
    const t = zeitKappen(sieger.stammZeit?.[a], jetzt); if (t) basis.stammZeit[a] = t; else delete basis.stammZeit[a];
    if (w.beide) bericht.beide.push(a);
    abgleichMerken(basis, a, w.hF);
  }
  const sortErfasst = (x, y) => String(x.erfasst || x.datum || "").localeCompare(String(y.erfasst || y.datum || ""));
  const opt = (j) => ({ schutz: HACCP.has(j), bericht, jetzt });
  for (const j of ["schwund", "tagesnotizen", "messungen", "lieferungen", "abschluesse", "uploads", "kostenbelege", "putzlog", "belehrungen", "verkaeufe"]) // E7 (17.10.2026): verkaeufe
    basis[j] = journalVereinigen(lokal[j] || [], fremd[j] || [], ["storniert"], opt(j)).sort(sortErfasst);
  basis.verkaeufe = verkaeufeEntdoppeln(basis.verkaeufe); // Prüfgremium 17.10.2026 (1): gleiche Verkäufe von zwei Handys zählen einmal
  basis.lieferungen = haltbarVereinigen(basis.lieferungen, lokal.lieferungen, fremd.lieferungen); // Stufe 1 (17.10.2026)
  // Rundgänge: abgeschlossene vereinigen; ein offener Rundgang bleibt nur vom lokalen Stand
  // Schwadron 18.10.2026, H3: beide Seiten vorher wie beim Laden leeren (Messungs-Kopie, die vollständig im Journal steht) – sonst falscher Konflikt
  const abgeschlossen = journalVereinigen((lokal.rundgaenge || []).filter((r) => r.abgeschlossen).map((r) => rundgangKern(r, lokal)), (fremd.rundgaenge || []).filter((r) => r.abgeschlossen).map((r) => rundgangKern(r, fremd)), ["storniert"], opt("rundgaenge"));
  basis.rundgaenge = [...abgeschlossen, ...(lokal.rundgaenge || []).filter((r) => !r.abgeschlossen)];
  // Inventuren wie Rundgänge: abgeschlossene vereinigen, eine offene nur vom lokalen Stand
  const invFertig = journalVereinigen((lokal.inventuren || []).filter((i) => i.abgeschlossen), (fremd.inventuren || []).filter((i) => i.abgeschlossen));
  const fertigIds = new Set(invFertig.map((i) => i.id)); // lokal offen, in der Datei schon fertig → nur die fertige behalten (Review 15.10.)
  basis.inventuren = [...invFertig, ...(lokal.inventuren || []).filter((i) => !i.abgeschlossen && !fertigIds.has(i.id))];
  basis.geaendert = [zeitKappen(lokal.geaendert, jetzt), zeitKappen(fremd.geaendert, jetzt)].filter(Boolean).sort().pop() || new Date(jetzt).toISOString();
  Object.defineProperty(basis, "_bericht", { value: bericht, enumerable: false, configurable: true }); // nur für zusammenfuehren
  if (bericht.beide.length || bericht.zukunft || bericht.konflikte) {
    const alt = istObjekt(lokal.abgleichHinweis) ? lokal.abgleichHinweis : { bereiche: [], zukunft: 0, konflikte: 0 };
    basis.abgleichHinweis = { zeit: new Date(jetzt).toISOString(), bereiche: [...new Set([...(alt.bereiche || []), ...bericht.beide])], zukunft: (alt.zukunft || 0) + bericht.zukunft, konflikte: (alt.konflikte || 0) + bericht.konflikte };
  }
  return basis;
}

export function zusammenfuehren(wurzel, importiert, { jetzt = Date.now() } = {}) {
  const ids = new Set(wurzel.betriebe.map((b) => b.id));
  let ersetzt = 0, neu = 0;
  const bericht = { beide: [], zukunft: 0, konflikte: 0 };
  for (const b of importiert.betriebe) {
    const i = wurzel.betriebe.findIndex((x) => x.id === b.id);
    if (i >= 0) {
      const m = verschmelzen(wurzel.betriebe[i], b, { jetzt }); const r = m._bericht; delete m._bericht;
      wurzel.betriebe[i] = m; ersetzt += 1;
      bericht.beide.push(...r.beide); bericht.zukunft += r.zukunft; bericht.konflikte += r.konflikte;
    } else {
      // Neuer Laden aus der Datei: Einträge mit Datum in der Zukunft auch hier nicht übernehmen
      const n = { zukunft: 0, konflikte: 0 };
      for (const j of HACCP) if (Array.isArray(b[j])) b[j] = journalVereinigen([], b[j], ["storniert"], { schutz: true, bericht: n, jetzt });
      if (n.zukunft) { b.abgleichHinweis = { zeit: new Date(jetzt).toISOString(), bereiche: [], zukunft: n.zukunft, konflikte: 0 }; bericht.zukunft += n.zukunft; }
      if (istObjekt(b.stammZeit)) for (const a of Object.keys(b.stammZeit)) { const t = zeitKappen(b.stammZeit[a], jetzt); if (t) b.stammZeit[a] = t; else delete b.stammZeit[a]; }
      abgleichGrundlage(b); wurzel.betriebe.push(b); ids.add(b.id); neu += 1;
    }
  }
  if (!wurzel.aktiv || !ids.has(wurzel.aktiv)) wurzel.aktiv = importiert.aktiv || wurzel.betriebe[0]?.id || null;
  if (!wurzel.sprache) wurzel.sprache = importiert.sprache;
  // Laufende Nummer: nie unter die höchste eigene Nummer fallen (Neuinstallation + Import)
  let maxEigen = 0;
  for (const b of wurzel.betriebe) for (const m of b.messungen) if (m.geraet === wurzel.geraet && Number(m.lfd) > maxEigen) maxEigen = Number(m.lfd);
  wurzel.lfd = Math.max(wurzel.lfd, maxEigen, importiert.geraet === wurzel.geraet ? (importiert.lfd || 0) : 0);
  // bericht (nicht aufgezählt, damit die Rückgabe wie bisher { ersetzt, neu } bleibt): beide geändert, Zukunft, abweichende HACCP-Einträge
  return Object.defineProperty({ ersetzt, neu }, "bericht", { value: { beide: [...new Set(bericht.beide)], zukunft: bericht.zukunft, konflikte: bericht.konflikte }, enumerable: false });
}

export async function ereignisseUebernehmen(liste) {
  if (!verfuegbar || !db || !liste.length) return;
  const da = new Set((await alleEreignisse()).map((e) => e.id));
  const neu = liste.filter((e) => typeof e.id === "string" && !da.has(e.id));
  if (!neu.length) return;
  try { await tx("ereignisse", "readwrite", (st) => { for (const e of neu) st.add({ ...e, importiert: true }); }); } catch (_) {}
}

// W2-D: Rückgabe true nur, wenn wirklich gelöscht wurde – nur dann darf app.js auch die Fotos und Belege (Ablage) leeren.
export async function allesLoeschen() {
  if (!verfuegbar || !db) return false;
  try { await txMehr(["stand", "teile", "ereignisse"], "readwrite", (t) => { for (const n of ["stand", "teile", "ereignisse"]) t.objectStore(n).clear(); }); }
  catch (e) { console.warn("Löschen fehlgeschlagen:", e); return false; }
  grundlageVerwerfen(); altModus = false; letzteWurzel = null; bereichH = new Map(); genGelesen = 0; // Paket 2: Kopf ist weg, Zähler beginnt neu
  return true;
}
