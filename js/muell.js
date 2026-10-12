// Etappe 5: Müll in zwei Tipps – „Gericht weg", „Rohware weg", „Eimer gewogen", Personalessen. Reine Funktionen.
// Einträge landen im Schwund-Journal (nur anhängen, Rücknahme = storniert) und werden sofort zum Einkaufspreis bewertet.
// Mülltrennung fragt die App nicht mehr: die Tonne folgt aus der Warengruppe (Verpackung → Verpackung, alles andere → Bio).
import { uid, heute } from "./util.js";
import { EINHEITEN, inBasis } from "./data/katalog.js";
import { warenGericht, kalkulation, wertEintrag, SCHWUND_ARTEN } from "./engine.js";

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

export const mahlzeitJetzt = (d = new Date()) => (d.getHours() < 11 ? "fruehstueck" : d.getHours() < 16 ? "mittag" : "abend");

function neu(datum, art, ref, menge, einheit, extra = {}) {
  return { id: uid(), datum, erfasst: new Date().toISOString(), art, vorgang: SCHWUND_ARTEN[art], ref, menge, einheit, nacherfasst: datum !== heute(), storniert: false, ...extra };
}

// Ein Teller weg: ein Tipp, ein Eintrag (zurücknehmbar). anzahl > 1 für „5 Teller auf einmal".
export function gerichtWeg(stand, gericht, { datum = heute(), anzahl = 1 } = {}) {
  const e = neu(datum, "gericht", { typ: "gericht", id: gericht.id, name: gericht.name }, anzahl, "portion", { fraktion: "bio", quelle: "muell" });
  e.wert = wertEintrag(e, stand); e.wertOffen = e.wert === null;
  stand.schwund.push(e); return e;
}
export function rohwareWeg(stand, artikel, { datum = heute(), menge, einheit } = {}) {
  if (!(menge > 0)) return null;
  const ref = { typ: "artikel", name: artikel.name };
  const e = neu(datum, "rohware", ref, menge, einheit || artikel.packung?.einheit || artikel.einheit || "stk", { fraktion: fraktionFuer(ref, stand), quelle: "muell" });
  e.wert = wertEintrag(e, stand); e.wertOffen = e.wert === null;
  stand.schwund.push(e); return e;
}
// Eimer gewogen: nur das Gewicht. Gemeldete Teller des Tages werden abgezogen, nur der Rest wird als „unbekannt" bewertet.
export function eimerEintragen(stand, { datum = heute(), kg, name = "" } = {}) {
  if (!(kg > 0)) return null;
  const v = eimerVerrechnen(stand, datum, kg);
  const e = neu(datum, "eimer", { typ: "eimer", name }, v.rest, "kg", { fraktion: "bio", quelle: "muell", gewogen: v.gewogen, gemeldet: v.gemeldet, preisJeKg: v.preisJeKg });
  e.wert = v.wert; e.wertOffen = v.wert === null && v.rest > 0;
  stand.schwund.push(e); return e;
}
export function personalessen(stand, gericht, { datum = heute(), mahlzeit = mahlzeitJetzt() } = {}) {
  const e = neu(datum, "personal", { typ: "gericht", id: gericht.id, name: gericht.name }, 1, "portion", { mahlzeit, quelle: "muell" });
  e.wert = wertEintrag(e, stand);
  stand.schwund.push(e); return e;
}

// Zähler je Gericht für die Kacheln („Döner Teller 4×" heute).
export function heuteJeGericht(stand, datum = heute(), art = "gericht") {
  const out = {};
  for (const e of stand.schwund || []) if (!e.storniert && e.datum === datum && e.art === art && e.ref?.typ === "gericht") out[e.ref.id] = (out[e.ref.id] || 0) + (Number(e.menge) || 0);
  return out;
}
// Letzter Eintrag eines Gerichts heute (für „Rückgängig" direkt an der Kachel).
export function letzterEintrag(stand, datum, art, gerichtId) {
  const l = (stand.schwund || []).filter((e) => !e.storniert && e.datum === datum && e.art === art && e.ref?.id === gerichtId);
  return l[l.length - 1] || null;
}
