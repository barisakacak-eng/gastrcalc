// Stufe 1 (17.10.2026): Kombi-Deal-Rechner. Reine Funktionen, keine Oberfläche, keine Speicherung, kein Netz.
// Eingabe: 2–4 Gerichte der Karte (z. B. Döner + Pommes + Ayran). Preise, Wareneinsatz und Steuersatz kommen aus kalkulation() (js/engine.js) –
// hier gibt es keine zweite Kalkulation. Die App schlägt vor, der Wirt entscheidet.
//
// Rechnung je Kombi (S = Summe der Kartenpreise brutto, S_netto = Summe netto, W = Summe Wareneinsatz netto):
//   Kombi-Preis netto = Kombi-Preis × S_netto / S   (Annahme: der Preis wird im Verhältnis der Einzelpreise auf die Steuersätze verteilt –
//                                                    wie es im Kassenbon aufgeteilt wird, klärt der Steuerberater)
//   Rohertrag Kombi = Kombi-Preis netto − W;  einzeln = Σ (Preis netto − Wareneinsatz)
//   Break-even-Mehrmenge = (Rohertrag einzeln − Rohertrag Kombi) / Rohertrag Kombi: so viel mehr Kombis braucht es, damit
//   unterm Strich gleich viel Rohertrag bleibt wie beim Einzelverkauf.
import { kalkulation, RICHTWERT_WARENEINSATZ, wareneinsatzWarnung } from "./engine.js";
import { verkaufJeGericht, auswertungZeitraum, ladenhueter } from "./verkauf.js";
import { haltbarStand, preisStufeNah, preisStufeAuf, PREIS_SCHRITT, kurzName } from "./haltbar.js";
import { heuteGeschaeft, fmtEuro } from "./util.js";
import { nameMitMenge } from "./getraenk_feld.js"; // Getränke (18.10.2026): Aushang-Text mit Ausschankmenge (§ 13 PAngV)

export const KOMBI_MIN = 2, KOMBI_MAX = 4;
// Stufe 1 (17.10.2026): Rabatt-Stufen auf die Summe der Einzelpreise. KEINE Branchenzahl – eine Annahme der App, damit der Wirt drei
// Richtungen vergleichen kann: 5 % ist bei 10–15 € Kombi ≈ 50–75 Cent (eine Preisstufe, „kleiner Rabatt“), 10 % ≈ ein Getränk billiger,
// 15 % eine deutliche Ansage. Gerundet wird danach auf 50 Cent (wie die Abverkaufs-Preise, js/haltbar.js).
export const RABATT_STUFEN = [{ stufe: "vorsichtig", rabatt: 0.05 }, { stufe: "normal", rabatt: 0.10 }, { stufe: "stark", rabatt: 0.15 }];
const EPS = 1e-9;
const r2 = (x) => Math.round(x * 100) / 100;

// Grenze für die Warnung: eigene Wareneinsatz-Quote des Ladens (Einstellungen), sonst der Branchen-Richtwert (≈ 32 %, BMF-Richtsatzsammlung 2025)
export function kombiGrenze(stand) {
  const q = stand?.verkauf?.warenQuote;
  if (typeof q === "number" && q > 0 && q < 0.9) return { quote: q, quelle: "eigen", geschaetzt: false };
  return { quote: RICHTWERT_WARENEINSATZ.quote, quelle: "richtwert", geschaetzt: true };
}

// Gerichte, die sich für eine Kombi rechnen lassen: Kartenpreis und vollständiger Wareneinsatz
export function kombiTeile(stand, k = kalkulation(stand)) {
  const gs = new Map((stand.gerichte || []).map((g) => [g.id, g]));
  return k.zeilen.filter((z) => z.preisBrutto > 0 && z.waren !== null).map((z) => ({ id: z.id, name: z.name, klasse: z.klasse, preis: z.preisBrutto, netto: z.preisBrutto / (1 + z.mwst), mwst: z.mwst,
    waren: z.waren, rohertrag: z.preisBrutto / (1 + z.mwst) - z.waren, geschaetzt: !!z.warenGeschaetzt, aushang: nameMitMenge(gs.get(z.id), kurzName(z.name)) }));
}

// Aktion planen (18.10.2026): Break-even-Mehrmenge für EINEN Aktionspreis (Kombi aus 2–4 Gerichten oder ein Gericht im Abverkauf) – dieselbe Rechnung
// wie in kombiRechnen: so viel mehr muss verkauft werden, damit gleich viel Rohertrag bleibt wie zum Kartenpreis. null = nicht rechenbar
// (Gericht ohne Preis/Wareneinsatz); lohntNie = der Aktionspreis deckt die Ware nicht. Grundlage der erwarteten Mehrmenge (js/aktion_plan.js).
export function aktionBreakEven(stand, ids, preis, { k = kalkulation(stand) } = {}) {
  const alle = new Map(kombiTeile(stand, k).map((x) => [x.id, x])); const liste = [...new Set(ids || [])];
  const teile = liste.map((id) => alle.get(id)).filter(Boolean);
  if (!teile.length || teile.length !== liste.length || !(preis > 0)) return null;
  const S = teile.reduce((s, x) => s + x.preis, 0), Snet = teile.reduce((s, x) => s + x.netto, 0), W = teile.reduce((s, x) => s + x.waren, 0);
  const R = Snet - W, Rk = preis * Snet / S - W;
  return { summe: S, rohertragEinzeln: R, rohertragAktion: Rk, mehrAnteil: Rk > EPS ? Math.max(0, (R - Rk) / Rk) : null, lohntNie: !(Rk > EPS), geschaetzt: teile.some((x) => x.geschaetzt), teile };
}

// Kombi aus Gericht-Kennungen rechnen. Rückgabe null bei weniger als 2 oder mehr als 4 rechenbaren Gerichten (fehlt: was sich nicht rechnen ließ).
export function kombiRechnen(stand, ids, { k = kalkulation(stand) } = {}) {
  const alle = new Map(kombiTeile(stand, k).map((x) => [x.id, x]));
  const liste = [...new Set(ids || [])];
  const teile = liste.map((id) => alle.get(id)).filter(Boolean);
  const fehlt = liste.filter((id) => !alle.has(id));
  if (teile.length < KOMBI_MIN || teile.length > KOMBI_MAX) return { teile, fehlt, stufen: [], ungueltig: true };
  const S = teile.reduce((s, x) => s + x.preis, 0), Snet = teile.reduce((s, x) => s + x.netto, 0), W = teile.reduce((s, x) => s + x.waren, 0);
  const R = Snet - W; const faktor = Snet / S; const grenze = kombiGrenze(stand);
  const geschaetzt = teile.some((x) => x.geschaetzt);
  // Untergrenze: netto nie unter dem Wareneinsatz (kein Verkauf unter Einkauf); höchstens S − 50 Cent (sonst ist es kein Angebot)
  const minPreis = r2(preisStufeAuf(W / faktor)); const maxPreis = r2(S - PREIS_SCHRITT);
  const stufen = RABATT_STUFEN.map(({ stufe, rabatt }) => {
    let A = r2(preisStufeNah(S * (1 - rabatt)));
    if (A > maxPreis) A = maxPreis;
    let amBoden = false; if (A < minPreis) { A = minPreis; amBoden = true; }
    if (A > maxPreis + EPS || !(A > 0)) return { stufe, rabattStufe: rabatt, moeglich: false };
    const netto = A * faktor; const Rk = netto - W; const quote = netto > 0 ? W / netto : null;
    const mehrAnteil = Rk > EPS ? Math.max(0, (R - Rk) / Rk) : null;
    return { stufe, rabattStufe: rabatt, moeglich: true, preis: A, rabatt: S - A, rabattProzent: (S - A) / S, netto, rohertrag: Rk, rohertragWeniger: R - Rk,
      mehrAnteil, jeZehn: mehrAnteil === null ? null : Math.ceil(10 * mehrAnteil - EPS), quote, amBoden,
      warnung: quote !== null && quote > grenze.quote + EPS ? { quote, grenze: grenze.quote, quelle: grenze.quelle, stufe: wareneinsatzWarnung(quote) } : null };
  });
  return { teile, fehlt, ungueltig: false, summe: S, summeNetto: Snet, waren: W, rohertrag: R, quoteEinzeln: W / Snet, grenze, geschaetzt, stufen };
}

// Text zum Teilen (Aushang, WhatsApp-Status) – Deutsch wie der Bestelltext: „Döner Kebab + Pommes frites + Ayran nur 11,50 €“
export const kombiText = (kombi, stufe) => `${kombi.teile.map((x) => x.aushang || kurzName(x.name)).join(" + ")} nur ${fmtEuro(stufe.preis, { dezimal: 2 })}`; // Getränke (18.10.2026): mit Ausschankmenge

// ---------- Automatische Vorschläge ----------
// Bis zu 3 Kombis: (1) Renner – meistverkauftes Hauptgericht + Beilage + Getränk; (2) mit einer Abverkaufs-Ware (MHD läuft ab);
// (3) mit einem Ladenhüter; sonst das zweite Hauptgericht. Nur Kombis, deren Rohertrag in der Stufe „normal“ über 0 liegt.
const HAUPT = new Set(["haupt", "gross"]);
export function kombiVorschlaege(stand, { heuteTag = heuteGeschaeft(), k = kalkulation(stand), hs = haltbarStand(stand, { heuteTag }) } = {}) {
  const teile = kombiTeile(stand, k); if (teile.length < KOMBI_MIN) return [];
  const z = auswertungZeitraum(stand, { heuteTag }); const vk = verkaufJeGericht(stand, z);
  const menge = new Map(vk.zeilen.map((r) => [r.gericht, r.menge]));
  const tag = new Map((stand.gerichte || []).map((g) => [g.id, Number(g.mengeTag) || 0]));
  const rang = (a, b) => (menge.get(b.id) || 0) - (menge.get(a.id) || 0) || (tag.get(b.id) || 0) - (tag.get(a.id) || 0) || a.name.localeCompare(b.name, "de");
  const haupt = teile.filter((x) => HAUPT.has(x.klasse)).sort(rang), beilage = teile.filter((x) => x.klasse === "kleinigkeit").sort(rang), getraenk = teile.filter((x) => x.klasse === "getraenk").sort(rang);
  const kandidaten = [];
  const dazu = (grund, liste, extra = {}) => { const ids = liste.filter(Boolean).map((x) => x.id); if (new Set(ids).size >= KOMBI_MIN) kandidaten.push({ grund, ids: [...new Set(ids)], ...extra }); };
  dazu("renner", [haupt[0], beilage[0], getraenk[0]]);
  const ab = (hs.abverkauf || []).find((x) => x.bester && teile.some((y) => y.id === x.bester.gericht));
  if (ab) { const g = teile.find((y) => y.id === ab.bester.gericht); dazu("abverkauf", HAUPT.has(g.klasse) ? [g, beilage[0], getraenk[0]] : [haupt[0], g.klasse === "getraenk" ? beilage[0] : getraenk[0], g], { ware: ab.name, bis: ab.ablauf }); }
  const lh = ladenhueter(stand, z, vk).gerichte.map((x) => teile.find((y) => y.id === x.gericht)).filter(Boolean)[0];
  if (lh) dazu("ladenhueter", HAUPT.has(lh.klasse) ? [lh, getraenk[0]] : [haupt[0], lh]);
  dazu("zweites", [haupt[1], beilage[0], getraenk[0]]);
  const out = []; const gesehen = new Set();
  for (const v of kandidaten) {
    const key = [...v.ids].sort().join("|"); if (gesehen.has(key)) continue; gesehen.add(key);
    const kombi = kombiRechnen(stand, v.ids, { k }); const normal = kombi.stufen.find((s) => s.stufe === "normal");
    // „bringt Rohertrag“: über 0 und Wareneinsatz unter der Warnschwelle der App (50 %, engine.js) – sonst lohnt sich die Kombi nicht
    if (kombi.ungueltig || !normal?.moeglich || !(normal.rohertrag > EPS) || wareneinsatzWarnung(normal.quote)) continue;
    out.push({ ...v, kombi }); if (out.length >= 3) break;
  }
  return out;
}

// Trennung 2 (17.10.2026): Kombi-Teile für die Auswahl-Chips – Hauptgericht, Kleinigkeit, Getränk, dann nach Name (vorher js/screens/aktionen.js).
const ORDNUNG = { haupt: 0, gross: 0, kleinigkeit: 1, getraenk: 2 };
export const kombiTeileSortiert = (stand, k = kalkulation(stand)) => kombiTeile(stand, k).sort((a, b) => (ORDNUNG[a.klasse] ?? 1) - (ORDNUNG[b.klasse] ?? 1) || a.name.localeCompare(b.name, "de"));
// Auswahl ohne Teile, die es nicht mehr gibt (Gericht gelöscht oder ohne Preis).
export const kombiAuswahlBereinigt = (auswahl, teile) => auswahl.filter((id) => teile.some((x) => x.id === id));
