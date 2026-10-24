// Etappe 5: Müll in zwei Tipps – „Gericht weg", „Rohware weg", „Eimer gewogen", Personalessen. Reine Funktionen.
// Einträge landen im Schwund-Journal (nur anhängen, Rücknahme = storniert) und werden sofort zum Einkaufspreis bewertet.
// Mülltrennung fragt die App nicht mehr: die Tonne folgt aus der Warengruppe (Verpackung → Verpackung, alles andere → Bio).
import { imTakt } from "./takt.js";
import { uid, heute, heuteGeschaeft, GESCHAEFTSTAG_BIS_STUNDE } from "./util.js";
import { EINHEITEN, inBasis } from "./data/katalog.js";
import { warenGericht, kalkulation, wertEintrag, eintragWert, SCHWUND_ARTEN, mengeUmrechnen, sachbezugWert } from "./engine.js";
import { normalisieren, suchRang } from "./data/suchnamen.js"; // Trennung 2 (17.10.2026): Suche „Andere“
// Paket 3 (16.10.2026), M7: Müll und Personalessen gehören zum Geschäftstag (bis 4 Uhr = Vortag).

// Gewicht eines Gerichts in Gramm aus dem Rezept (g- und ml-Zutaten; Stück-Zutaten wie Brot zählen nicht, die App sagt „≈").
export function gewichtGericht(g) {
  let s = 0;
  for (const z of g.zutaten || []) { const b = EINHEITEN[z.einheit]?.basis; if (b === "g" || b === "ml") s += inBasis(z.menge, z.einheit); }
  return s;
}

// Wareneinsatz je Kilogramm über die Karte, mengengewichtet – damit ein gewogener Eimer einen Euro-Wert bekommt.
export function preisJeKgKarte(stand) {
  if (!(stand.gerichte || []).length) return null;
  const k = kalkulation(stand);
  let w = 0, kg = 0;
  for (const z of k.zeilen) {
    if (z.waren === null) continue;
    const g = stand.gerichte.find((x) => x.id === z.id); const gramm = g ? gewichtGericht(g) : 0;
    if (!(gramm > 0)) continue;
    const m = z.menge || 1; w += z.waren * m; kg += gramm / 1000 * m;
  }
  return kg > 0 ? w / kg : null;
}

export function fraktionFuer(ref, stand) {
  if (ref?.typ === "artikel") { const a = (stand.artikel || []).find((x) => x.name === ref.name); return a?.gruppe === "verpackung" ? "verpackung" : a?.gruppe === "getraenk" ? "glas" : "bio"; }
  return "bio";
}

// Was heute schon als Teller oder Rohware gemeldet wurde, in Kilogramm – wird vom Eimergewicht abgezogen, damit nichts doppelt zählt.
export function gemeldetKg(stand, datum) {
  let kg = 0;
  for (const e of stand.schwund || []) {
    if (e.storniert || e.datum !== datum || (SCHWUND_ARTEN[e.art] || 1) !== 1 || e.art === "eimer") continue;
    if (e.ref?.typ === "gericht") { const g = (stand.gerichte || []).find((x) => x.id === e.ref.id); kg += (g ? gewichtGericht(g) : 0) / 1000 * (Number(e.menge) || 0); }
    else { const b = EINHEITEN[e.einheit]?.basis; if (b === "g" || b === "ml") kg += inBasis(e.menge, e.einheit) / 1000; }
  }
  return kg;
}

export function eimerVerrechnen(stand, datum, kg) {
  const gemeldet = gemeldetKg(stand, datum);
  const rest = Math.max(0, (Number(kg) || 0) - gemeldet);
  const preisJeKg = preisJeKgKarte(stand);
  return { gewogen: Number(kg) || 0, gemeldet, rest, preisJeKg, wert: preisJeKg === null ? null : rest * preisJeKg };
}

// Mahlzeit nach echter Uhrzeit; 00:00–03:59 ist noch „abend“ des Geschäftstags, nicht Frühstück (Paket 3, M7).
export const mahlzeitJetzt = (d = new Date()) => (d.getHours() < GESCHAEFTSTAG_BIS_STUNDE ? "abend" : d.getHours() < 11 ? "fruehstueck" : d.getHours() < 16 ? "mittag" : "abend");

function neu(datum, art, ref, menge, einheit, extra = {}) {
  return { id: uid(), datum, erfasst: new Date().toISOString(), art, vorgang: SCHWUND_ARTEN[art], ref, menge, einheit, nacherfasst: datum !== heuteGeschaeft(), storniert: false, ...extra };
}

// Ein Teller weg: ein Tipp, ein Eintrag (zurücknehmbar). anzahl > 1 für „5 Teller auf einmal".
export function gerichtWeg(stand, gericht, { datum = heuteGeschaeft(), anzahl = 1 } = {}) {
  const e = neu(datum, "gericht", { typ: "gericht", id: gericht.id, name: gericht.name }, anzahl, "portion", { fraktion: "bio", quelle: "muell" });
  e.wert = wertEintrag(e, stand); e.wertOffen = e.wert === null;
  stand.schwund.push(e); return e;
}
export function rohwareWeg(stand, artikel, { datum = heuteGeschaeft(), menge, einheit } = {}) {
  if (!(menge > 0)) return null;
  const ref = { typ: "artikel", name: artikel.name };
  const e = neu(datum, "rohware", ref, menge, einheit || artikel.packung?.einheit || artikel.einheit || "stk", { fraktion: fraktionFuer(ref, stand), quelle: "muell" });
  e.wert = wertEintrag(e, stand); e.wertOffen = e.wert === null;
  stand.schwund.push(e); return e;
}
// Eimer gewogen: nur das Gewicht. Gemeldete Teller des Tages werden abgezogen, nur der Rest wird als „unbekannt" bewertet.
export function eimerEintragen(stand, { datum = heuteGeschaeft(), kg, name = "" } = {}) {
  if (!(kg > 0)) return null;
  const v = eimerVerrechnen(stand, datum, kg);
  const e = neu(datum, "eimer", { typ: "eimer", name }, v.rest, "kg", { fraktion: "bio", quelle: "muell", gewogen: v.gewogen, gemeldet: v.gemeldet, preisJeKg: v.preisJeKg });
  e.wert = v.wert; e.wertOffen = v.wert === null && v.rest > 0;
  stand.schwund.push(e); return e;
}
export function personalessen(stand, gericht, { datum = heuteGeschaeft(), mahlzeit = mahlzeitJetzt() } = {}) {
  const e = neu(datum, "personal", { typ: "gericht", id: gericht.id, name: gericht.name }, 1, "portion", { mahlzeit, quelle: "muell" });
  e.wert = wertEintrag(e, stand);
  stand.schwund.push(e); return e;
}

// Zähler je Gericht für die Kacheln („Döner Teller 4×" heute).
export function heuteJeGericht(stand, datum = heuteGeschaeft(), art = "gericht") {
  const out = {};
  for (const e of stand.schwund || []) if (!e.storniert && e.datum === datum && e.art === art && e.ref?.typ === "gericht") out[e.ref.id] = (out[e.ref.id] || 0) + (Number(e.menge) || 0);
  return out;
}
// Letzter Eintrag eines Gerichts heute (für „Rückgängig" direkt an der Kachel).
export function letzterEintrag(stand, datum, art, gerichtId) {
  const l = (stand.schwund || []).filter((e) => !e.storniert && e.datum === datum && e.art === art && e.ref?.id === gerichtId);
  return l[l.length - 1] || null;
}

// ---------- Etappe 6, Punkt 1: Müll-Zentrale (Baris 13.10., 12:45) ----------
import { schwundAuswertung, preisJeBasis } from "./engine.js";
const tagMinus = (iso, n) => { const [j, m, d] = iso.split("-").map(Number); return heute(new Date(j, m - 1, d - n)); };
const istMuell = (e) => !e.storniert && (SCHWUND_ARTEN[e.art] || 1) === 1;

// Gewicht eines Eintrags in kg (Teller über das Rezept, Rohware über die Einheit, Eimer = Rest-kg). Stück ohne Gewicht: 0.
export function kgEintrag(e, stand) {
  if (e.art === "eimer") return Number(e.menge) || 0;
  if (e.ref?.typ === "gericht") { const g = (stand.gerichte || []).find((x) => x.id === e.ref.id); return (g ? gewichtGericht(g) : 0) / 1000 * (Number(e.menge) || 0); }
  const b = EINHEITEN[e.einheit]?.basis; return b === "g" || b === "ml" ? inBasis(e.menge, e.einheit) / 1000 : 0;
}

// Die letzten 7 Tage bis datum: Summe in Euro (nur bewertete Einträge), kg, Portionen zum Reinholen, je Tag und die drei größten Verursacher.
export function muellWoche(stand, datum = heuteGeschaeft()) {
  const von = tagMinus(datum, 6);
  const tage = []; for (let i = 6; i >= 0; i--) tage.push({ datum: tagMinus(datum, i), wert: 0, kg: 0, anzahl: 0 });
  const je = new Map(); let kg = 0;
  for (const e of stand.schwund || []) {
    if (!istMuell(e) || e.datum < von || e.datum > datum) continue;
    const t = tage.find((x) => x.datum === e.datum); const w = eintragWert(e, stand); const k = kgEintrag(e, stand); // Paket 3, M6
    t.anzahl += 1; t.kg += k; kg += k; if (w !== null) t.wert += w;
    const name = e.art === "eimer" ? "eimer" : (e.ref?.typ === "gericht" ? "g:" + e.ref.id : "a:" + e.ref?.name);
    const x = je.get(name) || { schluessel: name, art: e.art, ref: e.ref, menge: 0, einheit: e.einheit, wert: 0, ohneWert: 0 };
    x.menge += Number(e.menge) || 0; if (w === null) x.ohneWert += 1; else x.wert += w; je.set(name, x);
  }
  const a = schwundAuswertung(stand, { von, bis: datum });
  const top = [...je.values()].sort((x, y) => (y.wert > 0) - (x.wert > 0) || y.wert - x.wert).slice(0, 3);
  return { von, bis: datum, summe: a.muellwert, kg, portionen: a.portionen, ohneWert: a.ohneWert, anzahl: a.anzahl, tage, top, max: Math.max(0, ...tage.map((t) => t.wert)) };
}

// Monat bis heute gegen Vormonat bis zum selben Tag (ohne Einträge im Vormonat: keine Vergleichslinie)
export function muellMonatVergleich(stand, datum = heuteGeschaeft()) {
  const [j, m, d] = datum.split("-").map(Number);
  const vm = new Date(j, m - 2, 1); const vmEnde = new Date(j, m - 1, 0).getDate();
  const vVon = heute(vm); const vBis = heute(new Date(vm.getFullYear(), vm.getMonth(), Math.min(d, vmEnde)));
  const summe = (von, bis) => (stand.schwund || []).filter((e) => istMuell(e) && e.datum >= von && e.datum <= bis).reduce((s, e) => s + (eintragWert(e, stand) ?? 0), 0); // Paket 3, M6
  const hatVormonat = (stand.schwund || []).some((e) => istMuell(e) && e.datum >= vVon && e.datum <= heute(new Date(j, m - 1, 0)));
  return { monat: summe(datum.slice(0, 8) + "01", datum), vormonat: hatVormonat ? summe(vVon, vBis) : null, tag: d };
}

// Die 12 Kacheln „Was ist weg?": nach Häufigkeit der letzten 30 Tage (bei Gleichstand zuletzt benutzt); ohne Verlauf erst Gerichte, dann Artikel.
export function haeufigsteMuell(stand, opts = {}) { return imTakt(stand, "hm:" + JSON.stringify(opts), () => haeufigsteMuellRechnen(stand, opts)); }
function haeufigsteMuellRechnen(stand, { tage = 30, max = 12, datum = heuteGeschaeft(), mischen = false } = {}) {
  if (mischen) return gemischt(stand, haeufigsteMuell(stand, { tage, max: 10000, datum }), { tage, max, datum });
  const von = tagMinus(datum, tage - 1); const zahl = new Map();
  for (const e of stand.schwund || []) {
    if (e.storniert || e.datum < von || e.datum > datum || !e.ref || e.art === "eimer") continue;
    const k = e.ref.typ === "gericht" ? "g:" + e.ref.id : "a:" + e.ref.name;
    const x = zahl.get(k) || { n: 0, zuletzt: "" }; x.n += 1; if (String(e.erfasst) > x.zuletzt) x.zuletzt = String(e.erfasst); zahl.set(k, x);
  }
  const kandidaten = [
    ...(stand.gerichte || []).filter((g) => g.klasse !== "getraenk").map((g) => ({ typ: "gericht", id: g.id, name: g.name, einheit: "portion", gruppe: "speise", k: "g:" + g.id })),
    ...(stand.artikel || []).filter((a) => a.benutzt !== false && a.gruppe !== "verpackung").map((a) => ({ typ: "artikel", name: a.name, einheit: a.packung?.einheit || a.einheit || "stk", gruppe: a.gruppe, k: "a:" + a.name })),
  ];
  const rang = (x) => zahl.get(x.k) || { n: 0, zuletzt: "" };
  return kandidaten.map((x, i) => ({ ...x, i })).sort((a, b) => rang(b).n - rang(a).n || rang(b).zuletzt.localeCompare(rang(a).zuletzt) || a.i - b.i).slice(0, max).map(({ k, i, ...x }) => x);
}

// Foto-Raster (Drei Ebenen): erst was schon weg war (nach Häufigkeit), dann abwechselnd Gericht und Rohware –
// Rohware nach Zahl der Gerichte, die sie brauchen (Fladenbrot, Fleisch, Salat vor Gewürzen). Getränke nicht.
function gemischt(stand, alle, { tage, max, datum }) {
  const von = tagMinus(datum, tage - 1); const benutzt = new Set();
  for (const e of stand.schwund || []) if (!e.storniert && e.datum >= von && e.datum <= datum && e.ref && e.art !== "eimer") benutzt.add(muellSchluessel(e));
  const vorne = alle.filter((x) => benutzt.has(muellSchluessel(x)));
  const rest = alle.filter((x) => !benutzt.has(muellSchluessel(x)) && x.gruppe !== "getraenk");
  const inRezepten = (name) => (stand.gerichte || []).filter((g) => (g.zutaten || []).some((z) => z.name === name)).length;
  const gerichte = rest.filter((x) => x.typ === "gericht");
  const waren = rest.filter((x) => x.typ === "artikel").map((x, i) => ({ x, n: inRezepten(x.name), i })).sort((a, b) => b.n - a.n || a.i - b.i).map((y) => y.x);
  const misch = []; for (let i = 0; misch.length < gerichte.length + waren.length; i++) { if (gerichte[i]) misch.push(gerichte[i]); if (waren[i]) misch.push(waren[i]); }
  return [...vorne, ...misch].slice(0, max);
}

// Vorschau „= 1,92 € in der Tonne" für das Blatt (ohne zu speichern)
export function muellVorschau(stand, wahl, D = heuteGeschaeft()) {
  if (!(wahl?.menge > 0)) return null;
  const e = wahl.typ === "gericht" ? { art: wahl.personal ? "personal" : "gericht", ref: { typ: "gericht", id: wahl.id, name: wahl.name }, menge: wahl.menge, einheit: "portion", datum: D, mahlzeit: mahlzeitJetzt() }
    : { art: "rohware", ref: { typ: "artikel", name: wahl.name }, menge: wahl.menge, einheit: wahl.einheit, datum: D };
  return wertEintrag(e, stand);
}
void preisJeBasis;

// ---------- Drei Ebenen, Punkt 8: Müll mit einem Tipp (15.10.2026) ----------
// Schlüssel einer Kachel: Gericht über die id, Rohware über den Namen (wie haeufigsteMuell).
export const muellSchluessel = (x) => (x.ref ? (x.ref.typ === "gericht" ? "g:" + x.ref.id : "a:" + x.ref.name) : x.typ === "gericht" ? "g:" + x.id : "a:" + x.name);

// Übliche Menge für einen Tipp: Gericht = 1 Portion; Rohware = die zuletzt eingetragene Menge, sonst nach Einheit
// (Gewicht 250 g, Flüssigkeit 100 ml, Stück 1).
export function standardMenge(stand, x) {
  if (x.typ === "gericht") return { menge: 1, einheit: "portion" };
  const l = (stand.schwund || []).filter((e) => !e.storniert && e.art === "rohware" && e.ref?.name === x.name && e.menge > 0);
  if (l.length) { const e = l.reduce((a, b) => (String(b.erfasst) >= String(a.erfasst) ? b : a)); return { menge: Number(e.menge), einheit: e.einheit }; }
  const a = (stand.artikel || []).find((y) => y.name === x.name);
  const basis = EINHEITEN[a?.packung?.einheit || a?.einheit || x.einheit]?.basis || "stk";
  return basis === "g" ? { menge: 250, einheit: "g" } : basis === "ml" ? { menge: 100, einheit: "ml" } : { menge: 1, einheit: "stk" };
}

// Ein Tipp = ein Eintrag mit der üblichen Menge. von = Person (Personal-Modus), sonst ohne.
export function muellTippEintragen(stand, x, { datum = heuteGeschaeft(), von = null, uebrig = false } = {}) { // uebrig: abends nicht Verkauftes (Baris 24.10.2026, ersetzt „Eimer wiegen“)
  let e = null;
  if (x.typ === "gericht") { const g = (stand.gerichte || []).find((y) => y.id === x.id); if (!g) return null; e = gerichtWeg(stand, g, { datum, anzahl: 1 }); }
  else { const a = (stand.artikel || []).find((y) => y.name === x.name); if (!a) return null; const m = standardMenge(stand, x); e = rohwareWeg(stand, a, { datum, menge: m.menge, einheit: m.einheit }); }
  if (!e) return null;
  e.tipp = true; if (von) e.von = von; if (uebrig) e.uebrig = true;
  return e;
}

// Rückgängig: storniert (nie löschen). Gibt die Zahl der stornierten Einträge zurück.
export function muellStornieren(stand, ids) {
  let n = 0;
  for (const id of String(ids || "").split(",")) { const e = (stand.schwund || []).find((x) => x.id === id && !x.storniert); if (e) { e.storniert = true; e.storniertZeit = new Date().toISOString(); n += 1; } }
  return n;
}

// Trennung (17.10.2026): Nachweis an frische Müll-Einträge hängen (vorher screens/muell.js) – Foto-Upload und/oder Person im Personal-Modus.
export function schwundNachweisSetzen(stand, ids, { foto = null, von = null } = {}) {
  for (const id of ids) { const x = (stand.schwund || []).find((y) => y.id === id); if (!x) continue; if (foto) x.foto = foto; if (von) x.von = von; }
}

// Wie oft eine Kachel heute getippt wurde (Zähler „2ד) – Müll-Einträge, nicht Personalessen.
export function tippsHeute(stand, datum = heuteGeschaeft()) {
  const out = {};
  for (const e of stand.schwund || []) if (!e.storniert && e.datum === datum && (e.art === "gericht" || e.art === "rohware")) { const k = muellSchluessel(e); out[k] = (out[k] || 0) + 1; }
  return out;
}

// Kopfzahl „Heute": Euro (Laden) und Zahl der Einträge (Personal, ohne Euro). Personalessen zählt nicht als Müll.
export function muellHeute(stand, datum = heuteGeschaeft()) {
  let wert = 0, anzahl = 0, offen = 0;
  for (const e of stand.schwund || []) {
    if (e.storniert || e.datum !== datum || (SCHWUND_ARTEN[e.art] || 1) !== 1) continue;
    const w = eintragWert(e, stand); anzahl += 1; if (w !== null) wert += w; else offen += 1; // Paket 3, M6: Alt-Einträge wie im Zähler
  }
  return { wert, anzahl, offen };
}

// ---------- Trennung 2 (17.10.2026): Zahlen für die Müll-Bildschirme (vorher in js/screens/muell.js) ----------
// Monatstonne im Büro: Füllstand (0–1) dieses Monats und Linie des Vormonats (0–1 oder null), Maßstab = größerer Wert bzw. Vormonat × 1,25.
export function muellTonne(mv) {
  const fuell = mv.vormonat ? Math.min(1, mv.monat / Math.max(mv.monat, mv.vormonat * 1.25)) : (mv.monat > 0 ? 0.5 : 0);
  const linie = mv.vormonat ? Math.min(1, mv.vormonat / Math.max(mv.monat, mv.vormonat * 1.25)) : null;
  return { fuell, linie };
}
// Suche „Andere“: Gerichte (ohne Getränke) und benutzte Waren, die zur Eingabe passen (auch türkische/englische Suchnamen),
// beste Treffer zuerst, höchstens 24. Ohne Eingabe: die häufigsten Müll-Waren des Ladens.
export function muellSuche(stand, suche, D = heuteGeschaeft()) {
  const q = normalisieren(suche);
  if (!q) return haeufigsteMuell(stand, { datum: D });
  return [...(stand.gerichte || []).filter((g) => g.klasse !== "getraenk").map((g) => ({ typ: "gericht", id: g.id, name: g.name, einheit: "portion", gruppe: "speise" })),
    ...(stand.artikel || []).filter((a) => a.benutzt !== false).map((a) => ({ typ: "artikel", name: a.name, einheit: a.packung?.einheit || a.einheit || "stk", gruppe: a.gruppe }))]
    .filter((x) => suchRang(x.name, q) >= 0).sort((a, b) => suchRang(a.name, q) - suchRang(b.name, q)).slice(0, 24);
}
// Detail-Eingabe: Einheit, Basis, „ganze Packung“, Wert in der Tonne und Sachbezug (Personalessen). personal = Personal-Modus (ohne Euro).
export function muellFormWerte(stand, w, D = heuteGeschaeft(), { personal = false, mahlzeit = mahlzeitJetzt() } = {}) {
  const einheit = !w ? "" : w.typ === "gericht" ? "portion" : w.typ === "eimer" ? "kg" : w.einheit;
  const basis = w ? EINHEITEN[w.einheit]?.basis : null;
  const ganze = w?.typ === "artikel" && w.packung?.menge > 0 ? mengeUmrechnen(w.packung.menge, w.packung.einheit, w.einheit) : null;
  const wert = !w || personal ? null : w.typ === "eimer" ? (w.menge > 0 ? eimerVerrechnen(stand, D, w.menge).wert : null) : muellVorschau(stand, w, D);
  const personalWert = !personal && w?.typ === "gericht" && w.personal ? sachbezugWert(w.menge || 0, mahlzeit) : null;
  return { einheit, basis, ganze, wert, personalWert };
}
