// Bestand und Verbrauch: laufender Bestand je Ware, Ø-Verbrauch, Reichweite (Teil 1 von js/bestand.js).
// Eigene Datei, damit js/haltbar.js den Bestand lesen kann, ohne dass js/bestand.js (Bestellvorschlag) und js/haltbar.js einander importieren.
import { EINHEITEN, inBasis } from "./data/katalog.js";
import { preisJeBasis, preisGeschaetzt, tagPlus, wochentag, ruhetageAm } from "./engine.js";
import { inventurenFertig, inventurVorher, mengeSauber, inventurAbTag, inventurBisTag, inventurVorVerkauf } from "./inventur.js";
import { verkaeufeImZeitraum, teileVon, sollVerbrauch, schwundVerbrauch, einkaufMengen, bedarfGericht } from "./verkauf.js";
import { tagGewicht } from "./zaehler.js";
import { heuteGeschaeft } from "./util.js";
import { imTakt } from "./takt.js";
import { tageZwischen } from "./zeit.js";


// Bestand (17.10.2026): Standard je Laden – bestellen für 7 Tage, 2 Tage Puffer. Annahme, kein Branchenwert; im Büro einstellbar.
const LAGER_STANDARD = { tage: 7, puffer: 2 };
export const LAGER_GRENZEN = { tage: [1, 60], puffer: [0, 30] };
const SICHER_GUT_TAGE = 14;     // Inventur höchstens so alt für „gut“ (Auftrag 17.10.2026)
const SICHER_GROB_TAGE = 28;    // älter: „grob“ (Annahme Bestand 17.10.2026)
const FENSTER_TAGE = 28;        // Ø aus den letzten 28 Öffnungstagen
const WOCHENTAG_MIN = 4;        // Wochentage erst ab 4 Werten je Wochentag (≈ 4 Wochen Verkaufsdaten)
const HORIZONT = 120;                  // weiter schaut die Reichweite nicht (Tage)
const FEHLTAGE_MITTEL = 2;             // bis zu 2 Öffnungstage ohne Verkauf: „mittel“, mehr: „grob“

const ganzzahl = (v, [min, max], std) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= min && n <= max ? n : std; };
export function lagerEinstellungen(stand) {
  const l = stand?.lager || {};
  return { tage: ganzzahl(l.tage, LAGER_GRENZEN.tage, LAGER_STANDARD.tage), puffer: ganzzahl(l.puffer, LAGER_GRENZEN.puffer, LAGER_STANDARD.puffer) };
}
// Mindestbestand je Ware in Gebinden (Viertel), null = keiner
const mindestbestandVon = (a) => (typeof a?.mindestbestand === "number" && a.mindestbestand > 0 ? Math.round(a.mindestbestand * 4) / 4 : null);

const artikelIndex = (stand) => Object.fromEntries((stand.artikel || []).map((a) => [a.name, a]));
const inhaltJetzt = (a) => (a && a.packung?.menge > 0 && EINHEITEN[a.packung.einheit] ? inBasis(a.packung.menge, a.packung.einheit) : null);
const basisVon = (a) => EINHEITEN[a?.packung?.einheit || a?.einheit]?.basis || null;
const viertel = (x) => Math.round(x * 4) / 4;
const ruhetageBekannt = (stand, d) => ruhetageAm(stand, d).length > 0;

// Verkäufe im Zeitraum je Tag als { gerichtId: Portionen } (beste Herkunft je Tag, wie verkaufJeGericht)
function verkaufJeTag(stand, z) {
  const out = new Map();
  for (const v of verkaeufeImZeitraum(stand, z).eintraege) {
    const m = out.get(v.datum) || {}; for (const x of teileVon(stand, v)) m[x.gericht] = (m[x.gericht] || 0) + v.menge * x.menge; out.set(v.datum, m); // Schwadron 18.10.2026, M1: Menü → Teile
  }
  return out;
}
const summeMengen = (jeTag) => { const s = {}; for (const m of jeTag.values()) for (const [id, n] of Object.entries(m)) s[id] = (s[id] || 0) + n; return s; };

// Öffnungstage ohne Verkaufsdaten von `von` bis `bis`. Mit bekannten Ruhetagen genau (Datum), sonst nur als Anzahl über dem,
// was die Tage je Woche erwarten lassen (ein Tag ohne Verkauf kann dann auch ein Ruhetag sein).
function verkaufsLuecken(stand, { von, bis }, tage = null) {
  if (bis < von) return { tage: [], anzahl: 0 };
  const mit = tage || new Set(verkaeufeImZeitraum(stand, { von, bis }).eintraege.map((v) => v.datum));
  const fehlt = []; let unklar = 0, gewicht = 0;
  for (let d = von; d <= bis; d = tagPlus(d, 1)) {
    if (mit.has(d)) continue;
    if (ruhetageBekannt(stand, d)) { if (tagGewicht(stand, d) > 0) fehlt.push(d); }
    else { unklar += 1; gewicht += 1 - tagGewicht(stand, d); }
  }
  const ueber = Math.max(0, unklar - Math.floor(gewicht + 1e-9));
  return { tage: fehlt, anzahl: fehlt.length + ueber };
}

// Ø-Tagesverbrauch je Ware. Quelle 1: Verkäufe × Rezept (+ erfasster Müll und Personalessen) der letzten 28 Öffnungstage bis gestern,
// gezählt nur an Tagen mit Verkaufsdaten. Ab 4 Werten je Wochentag mit eigenem Wert je Wochentag (Freitag/Samstag stärker).
// Quelle 2 (ohne Verkaufsdaten oder Ware in keinem Rezept): Ist-Verbrauch zwischen den letzten zwei Inventuren je Öffnungstag.
// Sonst: unbekannt (null).
export function verbrauchSchnitt(stand, { heuteTag = heuteGeschaeft(), idx = artikelIndex(stand), inv = null } = {}) {
  const gestern = tagPlus(heuteTag, -1);
  const kandidaten = []; for (let d = gestern, n = 0; n < HORIZONT && kandidaten.length < FENSTER_TAGE; d = tagPlus(d, -1), n++) if (tagGewicht(stand, d) > 0) kandidaten.push(d);
  const von = kandidaten[kandidaten.length - 1] || gestern;
  const jeTag = verkaufJeTag(stand, { von, bis: gestern });
  const datenTage = kandidaten.filter((d) => jeTag.has(d)).sort();
  const reihe = {}; // name → { datum: menge }
  for (const d of datenTage) {
    const soll = sollVerbrauch(stand, jeTag.get(d), idx).artikel; const sw = schwundVerbrauch(stand, { von: d, bis: d }, idx);
    const dazu = (name, m) => { if (!(m > 0)) return; const r = (reihe[name] ??= {}); r[d] = (r[d] || 0) + m; };
    for (const [n, x] of Object.entries(soll)) dazu(n, x.menge);
    for (const [n, x] of Object.entries(sw.muell)) dazu(n, x.menge);
    for (const [n, x] of Object.entries(sw.personal)) dazu(n, x.menge);
  }
  const rezeptWaren = new Set(); for (const g of stand.gerichte || []) for (const x of bedarfGericht(g, idx).bedarf) rezeptWaren.add(x.name);
  const proWt = [0, 0, 0, 0, 0, 0, 0]; for (const d of datenTage) proWt[wochentag(d)] += 1;
  const wtMit = proWt.map((n, w) => [n, w]).filter(([n]) => n > 0);
  const wochentage = datenTage.length >= FENSTER_TAGE * 0.75 && wtMit.length > 0 && wtMit.every(([n]) => n >= WOCHENTAG_MIN);
  // Rückfall: letzte zwei Inventuren
  inv ??= inventurenFertig(stand).filter((i) => i.datum <= heuteTag).pop() || null;
  const vor = inv ? inventurVorher(stand, inv) : null;
  let fallback = null;
  if (inv && vor && inv.datum > vor.datum) {
    const z = { von: inventurAbTag(vor), bis: inventurBisTag(inv) }; const ek = einkaufMengen(stand, z);
    let offen = 0; for (let d = z.von; d <= z.bis; d = tagPlus(d, 1)) offen += tagGewicht(stand, d);
    fallback = { z, ek, offen };
  }
  const out = {};
  const namen = new Set([...Object.keys(reihe), ...rezeptWaren, ...Object.keys(inv?.posten || {})]);
  for (const name of namen) {
    const a = idx[name]; if (!a || a.herkunft === "selbst") continue;
    if (datenTage.length && rezeptWaren.has(name)) {
      const r = reihe[name] || {}; const summe = Object.values(r).reduce((s, x) => s + x, 0);
      const schnitt = summe / datenTage.length;
      let jeWochentag = null;
      if (wochentage) { jeWochentag = [null, null, null, null, null, null, null]; for (const [n, w] of wtMit) { const s = datenTage.filter((d) => wochentag(d) === w).reduce((x, d) => x + (r[d] || 0), 0); jeWochentag[w] = s / n; } }
      out[name] = { schnitt, jeWochentag, quelle: "verkauf", tage: datenTage.length };
      continue;
    }
    if (fallback && fallback.offen >= 1) {
      const mA = mengeSauber(vor.posten?.[name]), mE = mengeSauber(inv.posten?.[name]);
      const iA = vor.inhalte?.[name] > 0 ? vor.inhalte[name] : inhaltJetzt(a), iE = inv.inhalte?.[name] > 0 ? inv.inhalte[name] : inhaltJetzt(a);
      const e = fallback.ek[name];
      if (mA !== null && mE !== null && iA && iE && !(e?.unklar)) {
        const ist = mA * iA + (e?.menge || 0) - mE * iE;
        if (ist >= 0) { out[name] = { schnitt: ist / fallback.offen, jeWochentag: null, quelle: "inventur", tage: Math.round(fallback.offen) }; continue; }
      }
    }
    out[name] = { schnitt: null, jeWochentag: null, quelle: null, tage: 0 };
  }
  return { waren: out, datenTage, wochentage, ruhetage: ruhetageBekannt(stand, heuteTag) };
}

// Bedarf an einem Tag: mit Wochentagen der Wert des Wochentags (Wochentag ohne Verkauf = geschlossen), sonst Ø × Gewicht des Tags
// (Ruhetag 0, ohne bekannte Ruhetage Tage-je-Woche/7 wie im Zähler).
export function bedarfAm(stand, s, d) { // Stufe 1 (17.10.2026): exportiert für js/haltbar.js (Verbrauch bis zum Ablaufdatum) – keine zweite Rechnung
  if (s.jeWochentag) {
    const w = s.jeWochentag[wochentag(d)]; const bekannt = ruhetageBekannt(stand, d); const g = bekannt ? tagGewicht(stand, d) : 1;
    if (w === null) return bekannt && g > 0 ? { menge: s.schnitt * g, gewicht: g } : { menge: 0, gewicht: 0 }; // Wochentag ohne Werte: offen laut Ruhetagen → Ø
    return { menge: w * g, gewicht: w > 0 ? g : 0 };
  }
  const g = tagGewicht(stand, d); return { menge: s.schnitt * g, gewicht: g };
}

// Reichweite ab `start`: wie viele Öffnungstage reicht `bestand`, an welchem Tag ist es leer, Liste der Öffnungstage (für „bestellen bis“).
export function reichweite(stand, s, bestand, start) {
  if (!s || !(s.schnitt > 0) || bestand === null) return { tage: null, leerAm: null, offen: [], lange: false };
  let rest = bestand, tage = 0; const offen = [];
  for (let d = start, n = 0; n < HORIZONT; d = tagPlus(d, 1), n++) {
    const b = bedarfAm(stand, s, d); if (!(b.menge > 0)) continue;
    offen.push(d);
    if (rest >= b.menge) { rest -= b.menge; tage += b.gewicht; continue; }
    tage += b.gewicht * rest / b.menge; return { tage, leerAm: d, offen, lange: false };
  }
  return { tage, leerAm: null, offen, lange: true };
}
// Bedarf für die nächsten n Öffnungstage ab `start`
export function bedarfTage(stand, s, n, start) {
  if (!s || !(s.schnitt > 0) || !(n > 0)) return 0;
  let summe = 0, gezaehlt = 0;
  for (let d = start, i = 0; i < HORIZONT * 2 && gezaehlt < n - 1e-9; d = tagPlus(d, 1), i++) {
    const b = bedarfAm(stand, s, d); if (!(b.gewicht > 0)) continue;
    const anteil = Math.min(1, (n - gezaehlt) / b.gewicht); summe += b.menge * anteil; gezaehlt += b.gewicht * anteil;
  }
  return summe;
}

// Lieferant einer Ware laut Beleg: wohnt seit Lieferanten (18.10.2026) in js/lieferant.js (dort auch Stammdaten und Liefertermine)
export { lieferantVon } from "./lieferant.js";

// ---------- 1. Laufender Bestand ----------
// Rückgabe: { heute, inventur, ohneInventur, einstellungen, start, schnitt, waren: [ … je Ware … ], hinweise }
// Je Ware: name, basis, inhalt (Grundeinheit je Gebinde), gebinde (Art), bestand (Grundeinheit, null = unbekannt), bestandGebinde (¼),
//   wert (€, null ohne Preis), geschaetzt (Richtpreis), schnitt (Ø je Öffnungstag), quelle, reichweite (Öffnungstage), leerAm, lange,
//   sicherheit „gut“ | „mittel“ | „grob“, luecken [{ art, … }], negativ, teile (anfang, einkauf, verkauf, muell, personal).
export function bestandStand(stand, { heuteTag = heuteGeschaeft() } = {}) {
  return imTakt(stand, "bestand:" + heuteTag, () => bestandRechnen(stand, heuteTag));
}
function bestandRechnen(stand, heuteTag) {
  const einstellungen = lagerEinstellungen(stand); const idx = artikelIndex(stand);
  const inv = inventurenFertig(stand).filter((i) => i.datum <= heuteTag).pop() || null;
  if (!inv) return { heute: heuteTag, inventur: null, ohneInventur: true, einstellungen, start: heuteTag, waren: [], hinweise: [] };
  // Schwadron 18.10.2026, M2: morgens vor dem Öffnen gezählt → Verkäufe, Müll und Einkauf des Zähltags zählen ab (sonst ab dem Tag danach)
  const vorVerkauf = inventurVorVerkauf(inv); const von = inventurAbTag(inv), bis = heuteTag; const seit = bis >= von;
  const jeTag = seit ? verkaufJeTag(stand, { von, bis }) : new Map();
  const soll = sollVerbrauch(stand, summeMengen(jeTag), idx);
  const sw = seit ? schwundVerbrauch(stand, { von, bis }, idx) : { muell: {}, personal: {} };
  const ek = seit ? einkaufMengen(stand, { von, bis }) : {};
  const alter = tageZwischen(inv.datum, heuteTag);
  const luecke = seit ? verkaufsLuecken(stand, { von, bis: tagPlus(heuteTag, -1) }, new Set(jeTag.keys())) : { tage: [], anzahl: 0 };
  const vs = verbrauchSchnitt(stand, { heuteTag, idx, inv });
  // Rechnung ab heute, wenn heute noch nichts gezählt und nichts verkauft ist; sonst ab morgen
  const start = (inv.datum >= heuteTag && !vorVerkauf) || jeTag.has(heuteTag) ? tagPlus(heuteTag, 1) : heuteTag;
  const weg = new Set(inv.ausgeblendet || []);
  const namen = new Set([...Object.keys(inv.posten || {}), ...Object.keys(ek), ...Object.keys(soll.artikel),
    ...(stand.artikel || []).filter((a) => mindestbestandVon(a)).map((a) => a.name)].filter((n) => !weg.has(n))); // ausgeblendet = wird nicht geführt
  const probleme = new Set(soll.probleme.map((p) => p.name).filter(Boolean));
  const waren = [];
  for (const name of namen) {
    const a = idx[name]; if (!a || a.herkunft === "selbst") continue; // Selbstgemachtes wird nicht gekauft: steckt in seinen Rohwaren
    const luecken = [];
    const inhaltInv = inv.inhalte?.[name] > 0 ? inv.inhalte[name] : inhaltJetzt(a);
    const m0 = mengeSauber(inv.posten?.[name]);
    const basis = basisVon(a) || soll.artikel[name]?.basis || ek[name]?.basis || null;
    let anfang = null;
    // nicht gezählt: nur wenn seitdem gekauft wurde, rechnet die App ab 0 weiter (grob); sonst ist der Bestand unbekannt
    if (m0 === null) { anfang = ek[name]?.zeilen ? 0 : null; luecken.push({ art: "nichtGezaehlt" }); }
    else if (inhaltInv === null) luecken.push({ art: "gebinde" });
    else anfang = m0 * inhaltInv;
    const e = ek[name] || { menge: 0, basis: null, zeilen: 0, unklar: 0 };
    if (e.unklar || (e.basis && basis && e.basis !== basis)) luecken.push({ art: "einkaufUnklar", anzahl: e.unklar || e.zeilen });
    const vk = soll.artikel[name]?.menge || 0, mu = sw.muell[name]?.menge || 0, pe = sw.personal[name]?.menge || 0;
    if (probleme.has(name)) luecken.push({ art: "rezept" });
    if (alter > SICHER_GUT_TAGE) luecken.push({ art: "inventurAlt", tage: alter });
    if (luecke.anzahl) luecken.push({ art: "verkaufFehlt", anzahl: luecke.anzahl, tage: luecke.tage });
    const ekMenge = luecken.some((l) => l.art === "einkaufUnklar") ? 0 : e.menge;
    let bestand = null, negativ = false;
    if (anfang !== null) { const roh = anfang + ekMenge - vk - mu - pe; negativ = roh < -1e-6; bestand = Math.max(0, roh); if (negativ) luecken.push({ art: "negativ" }); }
    const s = vs.waren[name] || { schnitt: null, jeWochentag: null, quelle: null, tage: 0 };
    if (s.schnitt === null) luecken.push({ art: "verbrauchUnbekannt" });
    const inhalt = inhaltJetzt(a) || inhaltInv;
    const pj = preisJeBasis(a);
    const r = reichweite(stand, s, bestand, start);
    // Sicherheit: „gut“ = Inventur ≤ 14 Tage alt und Verkäufe für alle Öffnungstage seit der Inventur; „grob“ = Lücken, die die Zahl unsicher machen
    const grob = bestand === null || negativ || alter > SICHER_GROB_TAGE || luecke.anzahl > FEHLTAGE_MITTEL || luecken.some((l) => ["nichtGezaehlt", "einkaufUnklar", "gebinde"].includes(l.art));
    const gut = !grob && alter <= SICHER_GUT_TAGE && luecke.anzahl === 0 && !probleme.has(name);
    waren.push({ name, basis, inhalt, gebinde: a.gebinde?.art || "packung", bestand, bestandGebinde: bestand !== null && inhalt ? viertel(bestand / inhalt) : null,
      wert: bestand !== null && pj !== null ? bestand * pj : null, geschaetzt: preisGeschaetzt(a), preisJeBasis: pj,
      schnitt: s.schnitt, jeWochentag: s.jeWochentag, quelle: s.quelle, reichweite: r.tage, leerAm: r.leerAm, lange: r.lange, offen: r.offen,
      sicherheit: grob ? "grob" : gut ? "gut" : "mittel", luecken, negativ, mindestbestand: mindestbestandVon(a),
      teile: { anfang, einkauf: ekMenge, verkauf: vk, muell: mu, personal: pe } });
  }
  waren.sort((x, y) => (x.reichweite ?? 1e9) - (y.reichweite ?? 1e9) || x.name.localeCompare(y.name, "de"));
  const hinweise = [];
  if (soll.ohneRezept.length) hinweise.push({ art: "ohneRezept", namen: soll.ohneRezept.map((x) => x.name) });
  const ohneGericht = seit ? verkaeufeImZeitraum(stand, { von, bis }).eintraege.filter((v) => !teileVon(stand, v).length).reduce((s, v) => s + v.menge, 0) : 0;
  if (ohneGericht > 0) hinweise.push({ art: "ohneGericht", menge: ohneGericht });
  return { heute: heuteTag, inventur: { id: inv.id, datum: inv.datum, alter }, ohneInventur: false, einstellungen, start, wochentage: vs.wochentage, datenTage: vs.datenTage.length,
    verkaufLuecke: luecke, waren, hinweise };
}


const WT_DE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
export const datumKurzDe = (iso) => { const [, m, d] = iso.split("-"); return `${WT_DE[wochentag(iso)]} ${d}.${m}.`; };
