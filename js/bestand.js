// Bestand (17.10.2026): Laufender Bestand und Bestellvorschlag. Reine Funktionen, keine Oberfläche, keine Speicherung, kein Netz.
// Innen rechnet alles zusammen (Inventur, Einkauf, Verkauf × Rezept, Müll, Personalessen), außen steht nur ein Satz (bestandUhrzeit).
// Umrechnungen kommen aus js/verkauf.js (sollVerbrauch, schwundVerbrauch, einkaufMengen) und js/inventur.js (gespeicherter Packungsinhalt) –
// hier gibt es keine zweite Umrechnungslogik.
//
// Bestand heute = letzte abgeschlossene Inventur (Gebinde × Inhalt bei der Zählung) + Einkauf seit der Inventur (Belege)
//               − Soll-Verbrauch aus Verkäufen seit der Inventur − erfasster Müll und Personalessen seit der Inventur.
// Zeitraum „seit der Inventur“: Tag nach dem Zähltag bis heute (gezählt wird nach Ladenschluss, wie inventurVergleich).
// Nie negativ: fällt die Rechnung unter null, gilt 0 und der Hinweis „Einkauf fehlt wohl oder Inventur zu alt“.
import { EINHEITEN, inBasis } from "./data/katalog.js";
import { preisJeBasis, preisGeschaetzt, tagPlus, wochentag, ruhetageAm } from "./engine.js";
import { inventurenFertig, inventurVorher, mengeSauber } from "./inventur.js";
import { verkaeufeImZeitraum, gerichtVon, sollVerbrauch, schwundVerbrauch, einkaufMengen, bedarfGericht } from "./verkauf.js";
import { tagGewicht } from "./zaehler.js";
import { heuteGeschaeft } from "./util.js";
import { t, artikelText } from "./i18n.js";
import { imTakt } from "./takt.js";

// Bestand (17.10.2026): Standard je Laden – bestellen für 7 Tage, 2 Tage Puffer. Annahme, kein Branchenwert; im Büro einstellbar.
export const LAGER_STANDARD = { tage: 7, puffer: 2 };
export const LAGER_GRENZEN = { tage: [1, 60], puffer: [0, 30] };
export const SICHER_GUT_TAGE = 14;     // Inventur höchstens so alt für „gut“ (Auftrag 17.10.2026)
export const SICHER_GROB_TAGE = 28;    // älter: „grob“ (Annahme Bestand 17.10.2026)
export const FENSTER_TAGE = 28;        // Ø aus den letzten 28 Öffnungstagen
export const WOCHENTAG_MIN = 4;        // Wochentage erst ab 4 Werten je Wochentag (≈ 4 Wochen Verkaufsdaten)
const HORIZONT = 120;                  // weiter schaut die Reichweite nicht (Tage)
const FEHLTAGE_MITTEL = 2;             // bis zu 2 Öffnungstage ohne Verkauf: „mittel“, mehr: „grob“

const ganzzahl = (v, [min, max], std) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= min && n <= max ? n : std; };
export function lagerEinstellungen(stand) {
  const l = stand?.lager || {};
  return { tage: ganzzahl(l.tage, LAGER_GRENZEN.tage, LAGER_STANDARD.tage), puffer: ganzzahl(l.puffer, LAGER_GRENZEN.puffer, LAGER_STANDARD.puffer) };
}
// Mindestbestand je Ware in Gebinden (Viertel), null = keiner
export const mindestbestandVon = (a) => (typeof a?.mindestbestand === "number" && a.mindestbestand > 0 ? Math.round(a.mindestbestand * 4) / 4 : null);

const artikelIndex = (stand) => Object.fromEntries((stand.artikel || []).map((a) => [a.name, a]));
const inhaltJetzt = (a) => (a && a.packung?.menge > 0 && EINHEITEN[a.packung.einheit] ? inBasis(a.packung.menge, a.packung.einheit) : null);
const basisVon = (a) => EINHEITEN[a?.packung?.einheit || a?.einheit]?.basis || null;
const viertel = (x) => Math.round(x * 4) / 4;
const tageZwischen = (von, bis) => Math.round((Date.parse(bis + "T12:00:00Z") - Date.parse(von + "T12:00:00Z")) / 86400e3);
const ruhetageBekannt = (stand, d) => ruhetageAm(stand, d).length > 0;

// Verkäufe im Zeitraum je Tag als { gerichtId: Portionen } (beste Herkunft je Tag, wie verkaufJeGericht)
function verkaufJeTag(stand, z) {
  const out = new Map();
  for (const v of verkaeufeImZeitraum(stand, z).eintraege) {
    const m = out.get(v.datum) || {}; const id = gerichtVon(stand, v); if (id) m[id] = (m[id] || 0) + v.menge; out.set(v.datum, m);
  }
  return out;
}
const summeMengen = (jeTag) => { const s = {}; for (const m of jeTag.values()) for (const [id, n] of Object.entries(m)) s[id] = (s[id] || 0) + n; return s; };

// Öffnungstage ohne Verkaufsdaten von `von` bis `bis`. Mit bekannten Ruhetagen genau (Datum), sonst nur als Anzahl über dem,
// was die Tage je Woche erwarten lassen (ein Tag ohne Verkauf kann dann auch ein Ruhetag sein).
export function verkaufsLuecken(stand, { von, bis }, tage = null) {
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
    const z = { von: tagPlus(vor.datum, 1), bis: inv.datum }; const ek = einkaufMengen(stand, z);
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

// Lieferant einer Ware: aus dem jüngsten Beleg mit dieser Ware (nicht storniert), sonst null
export function lieferantVon(stand, name) {
  let best = null;
  for (const l of stand.lieferungen || []) {
    if (l.storniert || typeof l.datum !== "string" || !(l.zeilen || []).some((z) => z.artikel === name)) continue;
    if (!best || l.datum > best.datum || (l.datum === best.datum && String(l.erfasst || "") > String(best.erfasst || ""))) best = l;
  }
  const n = best && typeof best.lieferant === "string" ? best.lieferant.trim() : "";
  return n || null;
}

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
  const von = tagPlus(inv.datum, 1), bis = heuteTag; const seit = bis >= von;
  const jeTag = seit ? verkaufJeTag(stand, { von, bis }) : new Map();
  const soll = sollVerbrauch(stand, summeMengen(jeTag), idx);
  const sw = seit ? schwundVerbrauch(stand, { von, bis }, idx) : { muell: {}, personal: {} };
  const ek = seit ? einkaufMengen(stand, { von, bis }) : {};
  const alter = tageZwischen(inv.datum, heuteTag);
  const luecke = seit ? verkaufsLuecken(stand, { von, bis: tagPlus(heuteTag, -1) }, new Set(jeTag.keys())) : { tage: [], anzahl: 0 };
  const vs = verbrauchSchnitt(stand, { heuteTag, idx, inv });
  // Rechnung ab heute, wenn heute noch nichts gezählt und nichts verkauft ist; sonst ab morgen
  const start = inv.datum >= heuteTag || jeTag.has(heuteTag) ? tagPlus(heuteTag, 1) : heuteTag;
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
  const ohneGericht = seit ? verkaeufeImZeitraum(stand, { von, bis }).eintraege.filter((v) => !gerichtVon(stand, v)).reduce((s, v) => s + v.menge, 0) : 0;
  if (ohneGericht > 0) hinweise.push({ art: "ohneGericht", menge: ohneGericht });
  return { heute: heuteTag, inventur: { id: inv.id, datum: inv.datum, alter }, ohneInventur: false, einstellungen, start, wochentage: vs.wochentage, datenTage: vs.datenTage.length,
    verkaufLuecke: luecke, waren, hinweise };
}

// ---------- 2. Bestellvorschlag ----------
// Menge = Bedarf für (Tage + Puffer) Öffnungstage − Bestand, aufgerundet auf ganze Gebinde (ohne Gebinde: 100 g / 100 ml / 1 Stück).
// Mindestbestand (Gebinde) gewinnt, wenn er mehr verlangt. Ohne Verbrauch kein Vorschlag (außer der Mindestbestand ist unterschritten).
// bestellenAm: letzter Tag, an dem noch der Puffer übrig ist; liegt er heute oder davor → „jetzt“.
export const SCHRITT_OHNE_GEBINDE = { g: 100, ml: 100, stk: 1 };
export function bestellVorschlag(stand, { heuteTag = heuteGeschaeft(), bs = bestandStand(stand, { heuteTag }) } = {}) {
  const { tage, puffer } = bs.einstellungen; const morgen = tagPlus(heuteTag, 1);
  const zeilen = [];
  for (const w of bs.waren) {
    if (w.bestand === null) continue;
    const s = { schnitt: w.schnitt, jeWochentag: w.jeWochentag };
    const bedarf = w.schnitt > 0 ? bedarfTage(stand, s, tage + puffer, bs.start) : 0;
    const mindest = w.mindestbestand && w.inhalt ? w.mindestbestand * w.inhalt : 0;
    const ziel = Math.max(bedarf, mindest);
    const fehlt = ziel - w.bestand;
    if (!(fehlt > 1e-6)) continue;
    if (!(w.schnitt > 0) && !(mindest > w.bestand)) continue;
    let gebinde = null, menge;
    if (w.inhalt) { gebinde = Math.ceil(fehlt / w.inhalt - 1e-9); menge = gebinde * w.inhalt; }
    else { const sch = SCHRITT_OHNE_GEBINDE[w.basis] || 1; menge = Math.ceil(fehlt / sch - 1e-9) * sch; }
    let bestellenAm = null;
    if (w.schnitt > 0 && w.reichweite !== null && !w.lange) { const k = Math.floor(w.reichweite - puffer + 1e-9); bestellenAm = k < 0 ? heuteTag : (w.offen[k] || heuteTag); if (bestellenAm < heuteTag) bestellenAm = heuteTag; }
    else if (mindest > w.bestand) bestellenAm = heuteTag;
    const dringend = w.bestand <= 0 ? "leer" : bestellenAm && bestellenAm <= heuteTag ? "jetzt" : bestellenAm === morgen ? "morgen" : "spaeter";
    zeilen.push({ name: w.name, basis: w.basis, gebinde, gebindeArt: w.gebinde, inhalt: w.inhalt, menge, bestand: w.bestand, bedarf, mindestGewinnt: mindest > bedarf,
      reichweite: w.reichweite, leerAm: w.leerAm, bestellenAm, dringend, wert: w.preisJeBasis !== null ? menge * w.preisJeBasis : null, geschaetzt: w.geschaetzt,
      sicherheit: w.sicherheit, lieferant: lieferantVon(stand, w.name) });
  }
  const ordnung = { leer: 0, jetzt: 1, morgen: 2, spaeter: 3 };
  zeilen.sort((a, b) => ordnung[a.dringend] - ordnung[b.dringend] || (a.reichweite ?? 1e9) - (b.reichweite ?? 1e9) || a.name.localeCompare(b.name, "de"));
  const gruppen = new Map();
  for (const z of zeilen) { const k = z.lieferant || ""; const g = gruppen.get(k) || { lieferant: z.lieferant, zeilen: [], wert: 0, ohneWert: 0, geschaetzt: false }; g.zeilen.push(z); if (z.wert === null) g.ohneWert += 1; else g.wert += z.wert; if (z.geschaetzt) g.geschaetzt = true; gruppen.set(k, g); }
  const liste = [...gruppen.values()].sort((a, b) => (a.lieferant === null) - (b.lieferant === null) || ordnung[a.zeilen[0].dringend] - ordnung[b.zeilen[0].dringend] || String(a.lieferant).localeCompare(String(b.lieferant), "de"));
  return { heute: heuteTag, tage, puffer, gruppen: liste, zeilen, zaehl: { leer: zeilen.filter((z) => z.dringend === "leer").length, jetzt: zeilen.filter((z) => z.dringend === "jetzt").length, morgen: zeilen.filter((z) => z.dringend === "morgen").length } };
}

// ---------- Text zum Teilen (WhatsApp/SMS) ----------
// In der Sprache des Lieferanten = Deutsch (Auftrag 17.10.2026), unabhängig von der Sprache der App. Artikelnamen wie gespeichert (deutsch).
const GEBINDE_DE = { karton: ["Karton", "Kartons"], kiste: ["Kiste", "Kisten"], beutel: ["Beutel", "Beutel"], packung: ["Packung", "Packungen"], kanister: ["Kanister", "Kanister"],
  eimer: ["Eimer", "Eimer"], sack: ["Sack", "Säcke"], flasche: ["Flasche", "Flaschen"], dose: ["Dose", "Dosen"] };
const WT_DE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const zahlDe = (n) => String(Math.round(n * 100) / 100).replace(".", ",");
export function mengeDeutsch(z) {
  if (z.gebinde !== null && z.gebindeArt !== "lose" && GEBINDE_DE[z.gebindeArt]) return `${z.gebinde} ${GEBINDE_DE[z.gebindeArt][z.gebinde === 1 ? 0 : 1]}`;
  const m = z.menge;
  if (z.basis === "g") return m >= 1000 ? `${zahlDe(m / 1000)} kg` : `${zahlDe(m)} g`;
  if (z.basis === "ml") return m >= 1000 ? `${zahlDe(m / 1000)} l` : `${zahlDe(m)} ml`;
  return `${zahlDe(m)} Stück`;
}
export const datumKurzDe = (iso) => { const [, m, d] = iso.split("-"); return `${WT_DE[wochentag(iso)]} ${d}.${m}.`; };
export function bestellText(stand, gruppe, { datum = heuteGeschaeft(), laden = stand?.betrieb?.name || "" } = {}) {
  const posten = (gruppe?.zeilen || []).map((z) => `${mengeDeutsch(z)} ${z.name}`);
  return `Bestellung${laden ? " " + laden : ""}, ${datumKurzDe(datum)}: ${posten.join(", ")}`;
}

// ---------- 3. „Die Uhrzeit“ ----------
// Höchstens EIN kurzer Satz plus eine Handlung – für den Büro-Hinweis (und später den Laden, wenn der Eigentümer ihn freigibt).
// null, wenn alles reicht oder noch keine Inventur da ist (dann gibt es nichts Verlässliches zu sagen).
export function bestandUhrzeit(stand, { heuteTag = heuteGeschaeft() } = {}) {
  const bs = bestandStand(stand, { heuteTag }); if (bs.ohneInventur) return null;
  const v = bestellVorschlag(stand, { heuteTag, bs });
  const ziel = { aktion: "nav", wert: "bestand" };
  const jetzt = v.zeilen.filter((z) => z.dringend === "leer" || z.dringend === "jetzt");
  if (jetzt.length === 1) { const z = jetzt[0]; const tg = Math.floor(z.reichweite ?? 0);
    return { id: "bestand", art: "jetzt", anzahl: 1, ton: "rot", text: z.dringend === "leer" || tg < 1 ? t("bestand.uhr.fastAlle", artikelText(z.name)) : t("bestand.uhr.reicht", artikelText(z.name), tg), knopf: t("bestand.uhr.knopf"), ziel }; }
  if (jetzt.length > 1) return { id: "bestand", art: "jetzt", anzahl: jetzt.length, ton: "rot", text: t("bestand.uhr.heute", jetzt.length), knopf: t("bestand.uhr.knopf"), ziel };
  const morgen = v.zeilen.filter((z) => z.dringend === "morgen");
  if (morgen.length) return { id: "bestand", art: "morgen", anzahl: morgen.length, ton: "gelb", text: t("bestand.uhr.morgen", morgen.length), knopf: t("bestand.uhr.knopf"), ziel };
  return null;
}

// ---------- Einstellungen ändern (Büro) ----------
export function lagerSetzen(stand, feld, wert) {
  if (!["tage", "puffer"].includes(feld)) return false;
  const n = Math.round(Number(wert)); const [min, max] = LAGER_GRENZEN[feld];
  if (!Number.isFinite(n) || n < min || n > max) return false;
  stand.lager = { ...lagerEinstellungen(stand), [feld]: n }; return true;
}
export function mindestbestandSetzen(stand, name, wert) {
  const a = (stand.artikel || []).find((x) => x.name === name); if (!a) return false;
  if (wert === null || wert === "" || wert === undefined || Number(wert) === 0) { delete a.mindestbestand; return true; }
  const n = Number(wert); if (!Number.isFinite(n) || n < 0 || n > 9999) return false;
  a.mindestbestand = Math.round(n * 4) / 4; return true;
}
