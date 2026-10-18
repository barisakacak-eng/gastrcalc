// Lieferanten (18.10.2026): Lieferanten als Stammdaten. Bis hierher war der Lieferant nur ein Text am Beleg (lieferung.lieferant).
// Reine Funktionen, keine Oberfläche, kein Netz. Geschrieben wird nur über die Funktionen unten (Anlegen, Ändern, Entfernen, Zuordnen,
// Abgleich aus den Belegen) – Bildschirme rufen sie auf (tests/trennung.test.mjs).
//
// Datenart stand.lieferanten = [{ id, name, namen[], art, modus, tage[], schluss, lieferzeit, mindestwert, weg, kontakt, kundennummer, notiz,
//   erfasst, geaendert, entfernt, entferntZeit?, auto? }]
//   namen        Händlernamen, wie sie auf Belegen stehen (Abgleich: ein umbenannter Lieferant findet seine Belege weiter)
//   art          grosshandel | lieferdienst | supermarkt | getraenke | baeckerei | sonstiges
//   modus        lieferung (der Lieferant bringt die Ware) | abholung (der Wirt fährt selbst hin)
//   tage         Wochentage 0 = So … 6 = Sa – an diesen Tagen wird geliefert bzw. abgeholt; leer = keine festen Tage (dann rechnet der
//                Bestellvorschlag wie bisher mit „Tage + Puffer“)
//   schluss      { uhr: "HH:MM" | null, tageVorher: 0–7 } Bestellschluss, z. B. am Vortag 18 Uhr; null = keiner bekannt
//   lieferzeit   Tage von der Bestellung bis zur Lieferung (0–14) | null. Gilt ohne Bestellschluss als „so viele Tage vorher bestellen“
//                und ohne feste Liefertage als Vorlauf im Bestellvorschlag.
//   mindestwert  Mindestbestellwert in Euro netto | null
//   weg          whatsapp | telefon | mail | webshop | vorort | null – Bestellweg
//   kontakt      Nummer, Mail- oder Webshop-Adresse zum Bestellweg (frei, höchstens 80 Zeichen)
//   kundennummer frei, höchstens 30 Zeichen
//   notiz        frei, höchstens 200 Zeichen
//   entfernt     wird nicht gelöscht, nur gekennzeichnet (Zusammenführen zweier Handys: entfernt gewinnt; der Abgleich legt ihn nicht neu an)
//   auto         aus einem Beleg-Namen angelegt und noch nie bearbeitet
//
// DATENSCHUTZ: kontakt, kundennummer und notiz können personenbezogene Daten des Lieferanten sein (Handynummer des Fahrers, Name des
// Ansprechpartners). Sie bleiben NUR auf dem Gerät – im Speicher des Handys und in der Sicherungsdatei, die der Wirt selbst macht.
// Sie stehen in keinem Export für Amt, Steuerberater oder Buchhalter, gehen nie über das Netz und nie ins öffentliche Repo
// (der Beispiel-Laden hat keine Nummer). Nur der WhatsApp-Link beim Teilen einer Bestellung trägt die Nummer – auf Tipp des Wirts.
//
// Artikel: lieferantId (Hauptlieferant) und lieferant2Id (Zweitlieferant), beide optional. Ohne lieferantId gilt der Lieferant des
// letzten Belegs mit dieser Ware (wie bisher), danach der freie Lieferant am Getränke-Artikel (js/getraenk_feld.js).
import { heute } from "./util.js";
import { tagPlus, wochentag, ruhetageAm } from "./engine.js";
import { getraenkArtikelVon } from "./getraenk_feld.js";
import { feiertagImLaden, feiertagZu } from "./feiertage.js"; // Feiertage (18.10.2026)

export const LIEFERANT_ARTEN = ["grosshandel", "lieferdienst", "supermarkt", "getraenke", "baeckerei", "sonstiges"];
export const LIEFER_MODI = ["lieferung", "abholung"];
export const BESTELLWEGE = ["whatsapp", "telefon", "mail", "webshop", "vorort"];
export const WOCHE = [1, 2, 3, 4, 5, 6, 0]; // Reihenfolge für Auswahl und Anzeige: Montag zuerst
export const VORHER_WAHL = [0, 1, 2, 3];
export const LIEFERANT_GRENZEN = { tageVorher: [0, 7], lieferzeit: [0, 14], mindestwert: [0, 100000] };
const HORIZONT = 35; // so weit schaut die Suche nach Liefertagen (5 Wochen)

const istObj = (x) => !!x && typeof x === "object" && !Array.isArray(x);
const text = (v, max) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
const ganz = (v, [min, max]) => { const n = Number(v); return v !== null && v !== "" && v !== undefined && Number.isInteger(n) && n >= min && n <= max ? n : null; };
const UHR_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;
// "18", "18 Uhr", "18.30", "18:30" → "18:00" / "18:30"; null bei ungültig, "" bei leer
export function uhrLesen(v) {
  const s = String(v ?? "").trim().toLowerCase().replace(/\s*uhr$/, "").replace(".", ":"); if (!s) return "";
  const m = /^\d{1,2}$/.test(s) ? [null, s, "00"] : UHR_RE.exec(s); if (!m) return null;
  const h = Number(m[1]); if (h > 23) return null; return `${String(h).padStart(2, "0")}:${m[2]}`;
}
// Vergleichsform eines Händlernamens: klein, ohne Akzente und Satzzeichen („Großhandel (Beispiel)“ = „grosshandelbeispiel“)
export const lieferantNorm = (s) => String(s ?? "").toLowerCase().replace(/ß/g, "ss").normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "");
function hash36(s) { let a = 5381, b = 0x811c9dc5; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); a = (Math.imul(a, 33) + c) | 0; b = Math.imul(b ^ c, 16777619); } return (a >>> 0).toString(36) + (b >>> 0).toString(36).slice(0, 4); }
// Kennung aus dem Namen: auf jedem Handy gleich – derselbe Beleg-Name ergibt nach dem Zusammenführen keinen doppelten Lieferanten
export const lieferantKennung = (name) => "lf-" + hash36(lieferantNorm(name) || "leer");
// Art aus allgemeinen Wörtern im Namen erraten (keine Markennamen); sonst „sonstiges“
export function artRaten(name) {
  const n = lieferantNorm(name);
  if (/getrank|getraenk|brauerei|wasser/.test(n)) return "getraenke";
  if (/backer|baecker|backwaren|backerei/.test(n)) return "baeckerei";
  if (/grosshandel|grossmarkt|cashcarry|cash|gastro/.test(n)) return "grosshandel";
  if (/lieferdienst|lieferservice/.test(n)) return "lieferdienst";
  if (/supermarkt|discount|markt/.test(n)) return "supermarkt";
  return "sonstiges";
}

// ---------- Prüfen (Laden, Sicherung, Zusammenführen) ----------
function schlussSauber(x) {
  if (!istObj(x)) return null;
  const uhr = typeof x.uhr === "string" && UHR_RE.test(x.uhr) ? uhrLesen(x.uhr) : null;
  const tageVorher = ganz(x.tageVorher, LIEFERANT_GRENZEN.tageVorher);
  if (uhr === null && tageVorher === null) return null;
  return { uhr, tageVorher: tageVorher ?? 1 };
}
export function lieferantSauber(x) {
  if (!istObj(x) || typeof x.id !== "string" || !x.id.trim()) return null;
  const name = text(x.name, 40); if (!name) return null;
  const tage = [...new Set((Array.isArray(x.tage) ? x.tage : []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => WOCHE.indexOf(a) - WOCHE.indexOf(b));
  const mw = typeof x.mindestwert === "number" && Number.isFinite(x.mindestwert) && x.mindestwert > 0 && x.mindestwert <= LIEFERANT_GRENZEN.mindestwert[1] ? Math.round(x.mindestwert * 100) / 100 : null;
  return { id: x.id.trim().slice(0, 60), name, namen: [...new Set((Array.isArray(x.namen) ? x.namen : []).map((n) => text(n, 60)).filter(Boolean))].slice(0, 12),
    art: LIEFERANT_ARTEN.includes(x.art) ? x.art : "sonstiges", modus: x.modus === "abholung" ? "abholung" : "lieferung", tage,
    schluss: schlussSauber(x.schluss), lieferzeit: ganz(x.lieferzeit, LIEFERANT_GRENZEN.lieferzeit), mindestwert: mw,
    weg: BESTELLWEGE.includes(x.weg) ? x.weg : null, kontakt: text(x.kontakt, 80), kundennummer: text(x.kundennummer, 30), notiz: text(x.notiz, 200),
    erfasst: typeof x.erfasst === "string" ? x.erfasst : null, geaendert: typeof x.geaendert === "string" ? x.geaendert : null,
    entfernt: x.entfernt === true, ...(typeof x.entferntZeit === "string" ? { entferntZeit: x.entferntZeit } : {}), ...(x.auto === true ? { auto: true } : {}),
    ...(x.entfernt === true && typeof x.doppelt === "string" && x.doppelt ? { doppelt: x.doppelt.slice(0, 60) } : {}) };
}
export function lieferantenSauber(liste) {
  const m = new Map();
  for (const x of Array.isArray(liste) ? liste : []) { const l = lieferantSauber(x); if (l && !m.has(l.id)) m.set(l.id, l); }
  return [...m.values()];
}

// ---------- Abgleich aus den Belegen (Migration und nach jedem neuen Beleg) ----------
// Jeder Händlername auf einem (nicht zurückgenommenen) Beleg, den noch kein Lieferant kennt (auch kein entfernter), wird ein Lieferant.
// Alles daran folgt aus den Belegen (Kennung aus dem Namen, erfasst = erster Beleg) – zwei Handys legen denselben Lieferanten gleich an.
// Rückgabe: Zahl der neu angelegten.
export function lieferantenAusBelegen(stand) {
  if (!stand) return 0;
  if (!Array.isArray(stand.lieferanten)) stand.lieferanten = [];
  const bekannt = new Set(); for (const l of stand.lieferanten) { bekannt.add(lieferantNorm(l.name)); for (const n of l.namen || []) bekannt.add(lieferantNorm(n)); }
  const neu = new Map();
  const belege = (stand.lieferungen || []).filter((l) => l && !l.storniert && typeof l.lieferant === "string" && l.lieferant.trim())
    .slice().sort((a, b) => String(a.erfasst || a.datum || "").localeCompare(String(b.erfasst || b.datum || "")));
  for (const l of belege) {
    const name = text(l.lieferant, 40); const k = lieferantNorm(name); if (!k || bekannt.has(k) || neu.has(k)) continue;
    let id = lieferantKennung(name); while (stand.lieferanten.some((x) => x.id === id)) id += "x";
    neu.set(k, { id, name, namen: [name], art: artRaten(name), modus: "lieferung", tage: [], schluss: null, lieferzeit: null, mindestwert: null, weg: null,
      kontakt: "", kundennummer: "", notiz: "", erfasst: typeof l.erfasst === "string" ? l.erfasst : l.datum + "T00:00:00.000Z", geaendert: null, entfernt: false, auto: true });
  }
  for (const x of neu.values()) stand.lieferanten.push(x);
  return neu.size;
}

// ---------- Doppelte zusammenlegen (Prüfgremium 18.10.2026, N3) ----------
// Handy A benennt „Metro“ in „Großmarkt“ um, Handy B legt „Großmarkt“ neu an: nach dem Zusammenführen zwei Lieferanten mit gleichem Namen
// (verschiedene Kennungen). Gleicher Vergleichsname (lieferantNorm) unter den nicht entfernten = ein Lieferant. Es bleibt der zuerst angelegte
// (bei gleicher Zeit die kleinere Kennung); Leeres an ihm füllt der andere auf (Liefertage, Bestellschluss, Kontakt …), Beleg-Namen werden vereinigt.
// Der andere gilt als entfernt (doppelt = Kennung des bleibenden); Haupt- und Zweitlieferant an den Waren zeigen danach auf den bleibenden.
// Rein aus den Daten – beide Handys rechnen gleich; ein zweiter Lauf ändert nichts. Rückgabe: Zahl der zusammengelegten.
const LEER = { tage: (v) => !v?.length, schluss: (v) => !v, lieferzeit: (v) => v === null || v === undefined, mindestwert: (v) => v === null || v === undefined, weg: (v) => !v, kontakt: (v) => !v, kundennummer: (v) => !v, notiz: (v) => !v };
export function lieferantenEntdoppeln(stand) {
  if (!stand || !Array.isArray(stand.lieferanten)) return 0;
  const gruppen = new Map();
  for (const l of stand.lieferanten) if (l && !l.entfernt) { const k = lieferantNorm(l.name); if (!k) continue; if (!gruppen.has(k)) gruppen.set(k, []); gruppen.get(k).push(l); }
  const ersatz = new Map(); const neu = new Map(); let n = 0;
  for (const g of gruppen.values()) {
    if (g.length < 2) continue;
    g.sort((x, y) => String(x.erfasst || "").localeCompare(String(y.erfasst || "")) || String(x.id).localeCompare(String(y.id)));
    const [bleibt, ...rest] = g; const b = { ...bleibt, namen: [...(bleibt.namen || [])] };
    for (const x of rest) {
      for (const [f, leer] of Object.entries(LEER)) if (leer(b[f]) && !leer(x[f])) b[f] = structuredClone(x[f]);
      for (const nm of [...(x.namen || []), x.name]) if (nm && nm !== b.name && !b.namen.includes(nm)) b.namen.push(nm);
      if (b.auto && !x.auto) delete b.auto;
      ersatz.set(x.id, b.id); neu.set(x, { ...x, entfernt: true, entferntZeit: x.geaendert || x.erfasst || b.erfasst || "", doppelt: b.id }); n += 1;
    }
    b.namen = b.namen.slice(0, 12); neu.set(bleibt, b);
  }
  if (!n) return 0;
  stand.lieferanten = stand.lieferanten.map((l) => neu.get(l) || l);
  for (const a of stand.artikel || []) {
    for (const k of ["lieferantId", "lieferant2Id"]) if (ersatz.has(a[k])) a[k] = ersatz.get(a[k]);
    if (a.lieferant2Id && a.lieferant2Id === a.lieferantId) delete a.lieferant2Id;
  }
  return n;
}

// ---------- Lesen ----------
export const lieferantenAlle = (stand) => (Array.isArray(stand?.lieferanten) ? stand.lieferanten : []);
export const lieferantenAktiv = (stand) => lieferantenAlle(stand).filter((l) => !l.entfernt).slice().sort((a, b) => a.name.localeCompare(b.name, "de"));
export const lieferantMitId = (stand, id) => (id ? lieferantenAlle(stand).find((l) => l.id === id && !l.entfernt) || null : null);
// Lieferant zu einem Beleg-Namen (Name oder einer der Beleg-Namen); entfernte zählen nicht
export function lieferantZuName(stand, name) {
  const k = lieferantNorm(name); if (!k) return null;
  return lieferantenAlle(stand).find((l) => !l.entfernt && (lieferantNorm(l.name) === k || (l.namen || []).some((n) => lieferantNorm(n) === k))) || null;
}
// Lieferant einer Ware laut Beleg: aus dem jüngsten Beleg mit dieser Ware (nicht storniert), sonst null (vorher js/bestand.js, dort weiter exportiert)
export function lieferantVon(stand, name) {
  let best = null;
  for (const l of stand.lieferungen || []) {
    if (l.storniert || typeof l.datum !== "string" || !(l.zeilen || []).some((z) => z.artikel === name)) continue;
    if (!best || l.datum > best.datum || (l.datum === best.datum && String(l.erfasst || "") > String(best.erfasst || ""))) best = l;
  }
  const n = best && typeof best.lieferant === "string" ? best.lieferant.trim() : "";
  return n || null;
}
const artikelVon = (stand, name) => (stand.artikel || []).find((a) => a.name === name) || null;
// Hauptlieferant einer Ware: { id (null ohne Stammdaten), name, lf (Datensatz | null), quelle: "artikel" | "beleg" | "getraenk" } oder null
export function hauptLieferant(stand, name) {
  const a = artikelVon(stand, name);
  const lf = lieferantMitId(stand, a?.lieferantId); if (lf) return { id: lf.id, name: lf.name, lf, quelle: "artikel" };
  for (const [quelle, n] of [["beleg", lieferantVon(stand, name)], ["getraenk", getraenkArtikelVon(a)?.lieferant || null]]) {
    if (!n) continue; const x = lieferantZuName(stand, n);
    return x ? { id: x.id, name: x.name, lf: x, quelle } : { id: null, name: n, lf: null, quelle };
  }
  return null;
}
export function zweitLieferant(stand, name) {
  const a = artikelVon(stand, name); const lf = lieferantMitId(stand, a?.lieferant2Id); if (!lf) return null;
  const h = hauptLieferant(stand, name); return h?.id === lf.id ? null : { id: lf.id, name: lf.name, lf };
}
// Waren, deren Hauptlieferant dieser ist (nur gekaufte, nicht Selbstgemachtes)
export const lieferantWaren = (stand, id) => (stand.artikel || []).filter((a) => a.herkunft !== "selbst" && hauptLieferant(stand, a.name)?.id === id).map((a) => a.name);
export const lieferantZweitWaren = (stand, id) => (stand.artikel || []).filter((a) => a.herkunft !== "selbst" && zweitLieferant(stand, a.name)?.id === id).map((a) => a.name);

// ---------- Liefertermine ----------
const ruhetag = (stand, d) => ruhetageAm(stand, d).includes(wochentag(d)) || feiertagZu(stand, d);
// Feiertage (18.10.2026): An gesetzlichen Feiertagen (bundesweit und, wenn eingestellt, im Bundesland des Ladens; js/feiertage.js) liefert kein
// Lieferant und der Großmarkt hat zu – der Bestellvorschlag springt zum nächsten Liefertag. Bestellschluss bleibt der des Liefertags.
const feiertag = (stand, d) => !!feiertagImLaden(stand, d);
// Wie viele Tage vor dem Liefertag ist Bestellschluss, bis wann? Abholung: am Tag selbst, ohne Uhrzeit.
export function bestellFrist(lf) {
  if (lf.modus === "abholung") return { tageVorher: 0, uhr: null };
  if (lf.schluss) return { tageVorher: lf.schluss.tageVorher, uhr: lf.schluss.uhr };
  return { tageVorher: lf.lieferzeit ?? 1, uhr: null };
}
// Die nächsten erreichbaren Liefer- bzw. Abholtage ab jetzt: [{ tag, schlussTag, uhr }]. Erreichbar = Bestellschluss noch nicht vorbei.
// Lieferung an einem Ruhetag des Ladens zählt nicht (niemand nimmt die Ware an); Abholen geht auch am Ruhetag. null ohne Liefertage.
export function liefertermine(stand, lf, { jetzt = new Date(), anzahl = 3 } = {}) {
  if (!lf || !lf.tage?.length) return null;
  const J = jetzt instanceof Date ? jetzt : new Date(jetzt); const { tageVorher, uhr } = bestellFrist(lf); const abholung = lf.modus === "abholung";
  const out = [];
  for (let i = 0, d = heute(J); i < HORIZONT && out.length < anzahl; i++, d = tagPlus(d, 1)) {
    if (!lf.tage.includes(wochentag(d)) || (!abholung && ruhetag(stand, d)) || feiertag(stand, d)) continue;
    const schlussTag = tagPlus(d, -tageVorher);
    if (new Date(`${schlussTag}T${uhr || "23:59"}:00`) <= J) continue;
    out.push({ tag: d, schlussTag, uhr });
  }
  return out;
}
// Kommt dieser Lieferant an diesem Kalendertag (bzw. ist Abholung)? Unabhängig vom Bestellschluss.
export const liefertAm = (stand, lf, d) => !!lf?.tage?.includes(wochentag(d)) && (lf.modus === "abholung" || !ruhetag(stand, d)) && !feiertag(stand, d);

// ---------- Schreiben ----------
const fehler = (grund) => ({ ok: false, grund });
// Felder aus der Eingabe prüfen. f: { name, art, modus, tage, uhr, tageVorher, lieferzeit, mindestwert, weg, kontakt, kundennummer, notiz } (alles optional
// beim Ändern). Zahlen kommen als Zahl oder null; uhr als Text ("18:00", "18", leer). Rückgabe { ok, werte } | { ok:false, grund }.
function felderPruefen(stand, f, alt = null) {
  const w = {};
  if ("name" in f || !alt) { const n = text(f.name, 40); if (!n) return fehler("name");
    const k = lieferantNorm(n); if (lieferantenAlle(stand).some((l) => !l.entfernt && l.id !== alt?.id && lieferantNorm(l.name) === k)) return fehler("doppelt"); w.name = n; }
  if ("art" in f) { if (!LIEFERANT_ARTEN.includes(f.art)) return fehler("art"); w.art = f.art; }
  if ("modus" in f) { if (!LIEFER_MODI.includes(f.modus)) return fehler("modus"); w.modus = f.modus; }
  if ("tage" in f) { if (!Array.isArray(f.tage) || f.tage.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) return fehler("tage"); w.tage = [...new Set(f.tage)].sort((a, b) => WOCHE.indexOf(a) - WOCHE.indexOf(b)); }
  if ("uhr" in f || "tageVorher" in f) {
    const uhr = "uhr" in f ? uhrLesen(f.uhr) : alt?.schluss?.uhr ?? "";
    if (uhr === null) return fehler("uhr");
    const tv = "tageVorher" in f ? (f.tageVorher === null || f.tageVorher === "" ? null : ganz(f.tageVorher, LIEFERANT_GRENZEN.tageVorher)) : alt?.schluss?.tageVorher ?? null;
    if ("tageVorher" in f && f.tageVorher !== null && f.tageVorher !== "" && tv === null) return fehler("tageVorher");
    w.schluss = uhr || tv !== null ? { uhr: uhr || null, tageVorher: tv ?? 1 } : null;
  }
  if ("lieferzeit" in f) { const v = f.lieferzeit === null || f.lieferzeit === "" ? null : ganz(f.lieferzeit, LIEFERANT_GRENZEN.lieferzeit); if (v === null && f.lieferzeit !== null && f.lieferzeit !== "") return fehler("lieferzeit"); w.lieferzeit = v; }
  if ("mindestwert" in f) { const v = f.mindestwert; if (v === null || v === "" || v === 0) w.mindestwert = null; else { const n = Number(v); if (!Number.isFinite(n) || n < 0 || n > LIEFERANT_GRENZEN.mindestwert[1]) return fehler("mindestwert"); w.mindestwert = Math.round(n * 100) / 100; } }
  if ("weg" in f) { if (f.weg !== null && f.weg !== "" && !BESTELLWEGE.includes(f.weg)) return fehler("weg"); w.weg = f.weg || null; }
  for (const [k, max] of [["kontakt", 80], ["kundennummer", 30], ["notiz", 200]]) if (k in f) w[k] = text(f[k], max);
  return { ok: true, werte: w };
}
export function lieferantAnlegen(stand, f, { jetzt = new Date().toISOString() } = {}) {
  const p = felderPruefen(stand, f); if (!p.ok) return p;
  if (!Array.isArray(stand.lieferanten)) stand.lieferanten = [];
  // Name schon als entfernter Lieferant bekannt → wieder aufnehmen (gleiche Kennung, Beleg-Namen bleiben)
  const weg = stand.lieferanten.find((l) => l.entfernt && lieferantNorm(l.name) === lieferantNorm(p.werte.name));
  let id = weg ? null : lieferantKennung(p.werte.name); if (id) while (stand.lieferanten.some((x) => x.id === id)) id += "x";
  const basis = weg ? { ...weg, entfernt: false } : { id, name: p.werte.name, namen: [], art: artRaten(p.werte.name), modus: "lieferung", tage: [], schluss: null, lieferzeit: null, mindestwert: null, weg: null, kontakt: "", kundennummer: "", notiz: "", erfasst: jetzt, entfernt: false };
  delete basis.entferntZeit; delete basis.auto;
  const l = lieferantSauber({ ...basis, ...p.werte, geaendert: jetzt });
  if (weg) stand.lieferanten = stand.lieferanten.map((x) => (x === weg ? l : x)); else stand.lieferanten.push(l);
  return { ok: true, lieferant: l };
}
// Ändern: neues Objekt an derselben Stelle (Speicher erkennt die Änderung am Bereich „lieferanten“). Alter Name wandert in namen (Belege finden ihn weiter).
export function lieferantSetzen(stand, id, f, { jetzt = new Date().toISOString() } = {}) {
  const i = lieferantenAlle(stand).findIndex((l) => l.id === id && !l.entfernt); if (i < 0) return fehler("unbekannt");
  const alt = stand.lieferanten[i]; const p = felderPruefen(stand, f, alt); if (!p.ok) return p;
  const namen = p.werte.name && p.werte.name !== alt.name ? [...new Set([...(alt.namen || []), alt.name])] : alt.namen;
  const { auto: _a, ...rest } = alt;
  const l = lieferantSauber({ ...rest, ...p.werte, namen, geaendert: jetzt }); stand.lieferanten = stand.lieferanten.map((x, k) => (k === i ? l : x));
  return { ok: true, lieferant: l };
}
export function lieferantEntfernen(stand, id, { jetzt = new Date().toISOString() } = {}) {
  const i = lieferantenAlle(stand).findIndex((l) => l.id === id && !l.entfernt); if (i < 0) return false;
  stand.lieferanten = stand.lieferanten.map((x, k) => (k === i ? { ...x, entfernt: true, entferntZeit: jetzt } : x)); return true;
}
// Haupt- und Zweitlieferant einer Ware. haupt/zweit: Kennung | null (haupt null = wie letzter Beleg, zweit null = keiner); undefined = bleibt.
export function artikelLieferantSetzen(stand, name, { haupt, zweit } = {}) {
  const a = artikelVon(stand, name); if (!a || a.herkunft === "selbst") return false;
  const ok = (id) => id === null || id === "" || !!lieferantMitId(stand, id);
  if ((haupt !== undefined && !ok(haupt)) || (zweit !== undefined && !ok(zweit))) return false;
  if (haupt !== undefined) { if (haupt) a.lieferantId = haupt; else delete a.lieferantId; }
  if (zweit !== undefined) { if (zweit) a.lieferant2Id = zweit; else delete a.lieferant2Id; }
  if (a.lieferant2Id && hauptLieferant(stand, name)?.id === a.lieferant2Id) delete a.lieferant2Id; // Zweit = Haupt hat keinen Sinn
  return true;
}
// Prüfen einer Kennung am Artikel (Migration): Text oder weg
export function artikelLieferantSauber(a) {
  for (const k of ["lieferantId", "lieferant2Id"]) if (!(typeof a[k] === "string" && /^[\w-]{1,60}$/.test(a[k]))) delete a[k];
  if (a.lieferant2Id && a.lieferant2Id === a.lieferantId) delete a.lieferant2Id;
  return a;
}

// ---------- Teilen: WhatsApp nur mit gepflegter Nummer ----------
// Nummer für wa.me: nur Ziffern, international ohne „+“. 0151… → 49151… (Deutschland, Start nur in Deutschland), 0049… → 49…. null = keine gültige Nummer.
export function whatsappNummer(s) {
  let v = String(s ?? "").trim(); if (!v) return null;
  const plus = v.startsWith("+"); v = v.replace(/\D/g, "");
  if (!plus) { if (v.startsWith("00")) v = v.slice(2); else if (v.startsWith("0")) v = "49" + v.slice(1); }
  return v.length >= 8 && v.length <= 15 ? v : null;
}
export const whatsappLink = (nummer, text) => `https://wa.me/${nummer}?text=${encodeURIComponent(text)}`;
