// Getränke (18.10.2026): Büro „Getränke“ – Übersicht, Felder setzen, neues Getränk anlegen. Reine Funktionen bis auf die Setzer
// (getraenkSetzen, getraenkAnlegen), keine Oberfläche, kein Netz. Felder und Migration: js/getraenk_feld.js.
//
// Wareneinsatz je Glas (offenes Getränk) = Preis je Liter des Großgebindes × Ausschankmenge / (1 − Schankverlust). Das steht als Zutat im Rezept
// (Großgebinde in ml) und läuft damit durch dieselbe Rechnung wie jedes Gericht (engine.js warenGericht, verkauf.js bedarfGericht):
// Kalkulation, Soll-Verbrauch, laufender Bestand und Bestellvorschlag rechnen in Litern mit.
// Pfand: nur Information am Artikel – der Beleg führt Pfand getrennt (js/beleg.js, Regel 7), es zählt nie im Wareneinsatz.
import { EINHEITEN, PRODUKT_INDEX, GETRAENK_VORLAGEN } from "./data/katalog.js";
import { kalkulation, preisJeBasis } from "./engine.js";
import { lieferantVon } from "./bestand.js";
import { uid } from "./util.js";
import { getraenkVon, getraenkArtikelVon, getraenkGerichtSauber, getraenkArtikelSauber, istGetraenkGericht, istGetraenkArtikel, literText,
  GEBINDE_VERKAUF, GEBINDE_EINKAUF, MENGE_GRENZEN, SCHANKVERLUST_MAX, PFAND_MAX } from "./getraenk_feld.js";

export { GETRAENK_VORLAGEN };
const basisVon = (a) => EINHEITEN[a?.packung?.einheit || a?.einheit]?.basis || null;
const index = (stand) => Object.fromEntries((stand.artikel || []).map((a) => [a.name, a]));
const katalogGetraenk = (name) => { const p = PRODUKT_INDEX[name]; return p && (p.g === "getraenk" || p.g === "spirituose"); };
const mengeOk = (l) => typeof l === "number" && Number.isFinite(l) && l >= MENGE_GRENZEN[0] - 1e-9 && l <= MENGE_GRENZEN[1] + 1e-9;

// Der gekaufte Artikel eines Getränks: offen → das Großgebinde (quelle); sonst die erste Zutat aus Getränke/Spirituosen
export function getraenkArtikel(stand, g, idx = index(stand)) {
  const x = getraenkVon(g); if (!x) return null;
  if (x.quelle) return idx[x.quelle] || null;
  const z = (g.zutaten || []).find((z) => (idx[z.name] ? istGetraenkArtikel(idx[z.name]) : katalogGetraenk(z.name)));
  return z ? idx[z.name] || null : null;
}
// Großgebinde zur Auswahl: Getränke-Artikel, die in Litern geführt werden (Flasche 1,0/1,5 l, Bag-in-Box, Fass)
export const grossgebindeWahl = (stand) => (stand.artikel || []).filter((a) => istGetraenkArtikel(a) && basisVon(a) === "ml" && a.herkunft !== "selbst").map((a) => a.name).sort((a, b) => a.localeCompare(b, "de"));

// Übersicht je Getränk der Karte (klasse „getraenk“): Größe, Gebinde, offen/Großgebinde, Marke, Pfand, Lieferant, Wareneinsatz je Glas/Flasche.
export function getraenkeListe(stand, { k = (stand.gerichte || []).length ? kalkulation(stand) : { zeilen: [] } } = {}) {
  const zeilen = new Map(k.zeilen.map((z) => [z.id, z])); const idx = index(stand);
  return (stand.gerichte || []).filter(istGetraenkGericht).map((g) => {
    const x = getraenkVon(g); const a = getraenkArtikel(stand, g, idx); const ax = a ? getraenkArtikelVon(a) : null; const z = zeilen.get(g.id);
    const pj = a ? preisJeBasis(a) : null; const beleg = a ? lieferantVon(stand, a.name) : null;
    return { id: g.id, name: g.name, preis: typeof g.preis === "number" ? g.preis : null, menge: x.menge, mengeText: literText(x.menge), gebinde: x.gebinde,
      offen: !!x.quelle, quelle: x.quelle, schankverlust: x.schankverlust, artikel: a?.name || null, flasche: ax?.menge ?? null, einkauf: ax?.gebinde ?? null,
      marke: ax?.marke || "", pfand: ax?.pfand ?? null, lieferant: ax?.lieferant || beleg || "", lieferantAusBeleg: !ax?.lieferant && !!beleg,
      jeLiter: x.quelle && pj !== null && basisVon(a) === "ml" ? pj * 1000 : null, waren: z?.waren ?? null, warenGeschaetzt: !!z?.warenGeschaetzt,
      fehlt: [...(x.menge ? [] : ["menge"]), ...(x.gebinde === "offen" && !x.quelle ? ["quelle"] : [])] };
  }).sort((p, q) => (q.fehlt.length > 0) - (p.fehlt.length > 0) || p.name.localeCompare(q.name, "de"));
}
// Hinweise fürs Büro: Getränke ohne Größe (Pflicht auf Tafel und Aushang) und „Glas offen“ ohne Großgebinde
export const getraenkHinweise = (liste) => liste.filter((x) => x.fehlt.length).map((x) => ({ id: x.id, name: x.name, fehlt: x.fehlt }));

// ---------- Setzen ----------
// felder (nur, was drinsteht, wird geändert): menge (l | null), gebinde, quelle (Artikelname | null), schankverlust (0–0,5), marke, pfand (€ | null),
// lieferant, flasche (l, Größe der Flasche/Dose am Artikel), einkauf (Gebinde am Artikel). Erst wird alles geprüft, dann geschrieben.
// Rückgabe { ok: true } | { ok: false, grund: "gericht" | "menge" | "quelle" | "quelleEinheit" | "schankverlust" | "pfand" | "flasche" }
export function getraenkSetzen(stand, id, felder = {}) {
  const g = (stand.gerichte || []).find((x) => x.id === id); if (!g || !istGetraenkGericht(g)) return { ok: false, grund: "gericht" };
  const idx = index(stand); const neu = { ...getraenkVon(g) };
  const f = felder || {}; const nein = (grund) => ({ ok: false, grund });
  if ("menge" in f) { if (f.menge !== null && !mengeOk(f.menge)) return nein("menge"); neu.menge = f.menge; }
  if ("gebinde" in f) neu.gebinde = GEBINDE_VERKAUF.includes(f.gebinde) ? f.gebinde : null;
  if ("quelle" in f) neu.quelle = typeof f.quelle === "string" && f.quelle.trim() ? f.quelle.trim() : null;
  if (neu.gebinde && neu.gebinde !== "offen" && neu.gebinde !== "becher") neu.quelle = null; // Dose/Flasche: verkauft wie gekauft
  if ("schankverlust" in f) { const v = f.schankverlust; if (v !== null && !(typeof v === "number" && v >= 0 && v <= SCHANKVERLUST_MAX + 1e-9)) return nein("schankverlust"); neu.schankverlust = v || 0; }
  const qa = neu.quelle ? idx[neu.quelle] : null;
  if (neu.quelle && !qa) return nein("quelle");
  if (qa && basisVon(qa) !== "ml") return nein("quelleEinheit");
  if (neu.quelle && !neu.menge) return nein("menge");
  if ("pfand" in f && f.pfand !== null && !(typeof f.pfand === "number" && f.pfand > 0 && f.pfand <= PFAND_MAX)) return nein("pfand");
  if ("flasche" in f && f.flasche !== null && !mengeOk(f.flasche)) return nein("flasche");
  const sauber = getraenkGerichtSauber(neu);
  // Rezept: offenes Getränk = Großgebinde-Zutat mit der Ausschankmenge (ml). Die bisherige Getränke-Zutat (Flasche, Dose) wird ersetzt, Becher u. Ä. bleiben.
  if (sauber.quelle) {
    const ml = Math.round(sauber.menge * 1000); const neuZ = { name: sauber.quelle, menge: ml, einheit: "ml" };
    const istGetraenkZutat = (z) => z.name === sauber.quelle || (idx[z.name] ? istGetraenkArtikel(idx[z.name]) : katalogGetraenk(z.name));
    const i = g.zutaten.findIndex((z) => z.name === sauber.quelle) >= 0 ? g.zutaten.findIndex((z) => z.name === sauber.quelle) : g.zutaten.findIndex(istGetraenkZutat);
    const alt = JSON.stringify(g.zutaten);
    g.zutaten = i >= 0 ? g.zutaten.map((z, j) => (j === i ? { ...z, ...neuZ } : z)).filter((z, j) => j === i || z.name !== sauber.quelle) : [neuZ, ...g.zutaten];
    if (JSON.stringify(g.zutaten) !== alt && g.rezeptQuelle === "baukasten") g.rezeptQuelle = "eigen";
  }
  // Prüfgremium 18.10.2026 (N2): von „offen“/„Becher“ auf Dose oder Flasche umgestellt – das Rezept zog weiter aus dem Großgebinde ab. Jetzt wie
  // beim Anlegen ohne Großgebinde: die Großgebinde-Zutat wird durch den Stück-Artikel des Getränks ersetzt (gleicher Name, 1 Stück; fehlt er, wird er
  // ohne Preis angelegt – den trägt der Wirt unter „Einkaufspreise“ ein). Bestand und Bestellung zählen dann Dosen/Flaschen.
  const altQuelle = getraenkVon(g)?.quelle || null;
  if (altQuelle && !sauber.quelle) {
    const alt = JSON.stringify(g.zutaten); const stueck = { name: g.name, menge: 1, einheit: "stk" };
    const i = g.zutaten.findIndex((z) => z.name === altQuelle);
    g.zutaten = i >= 0 ? g.zutaten.map((z, j) => (j === i ? stueck : z)).filter((z, j) => j === i || z.name !== g.name) : g.zutaten.some((z) => z.name === g.name) ? g.zutaten : [stueck, ...g.zutaten];
    if (!idx[g.name]) { stand.artikel ??= []; stand.artikel.push(getraenkArtikelNeu(g.name, "getraenk", "stk")); }
    if (JSON.stringify(g.zutaten) !== alt && g.rezeptQuelle === "baukasten") g.rezeptQuelle = "eigen";
  }
  g.getraenk = sauber;
  // Marke, Pfand, Lieferant, Flaschengröße und Einkaufs-Gebinde am gekauften Artikel
  const a = qa || getraenkArtikel(stand, g, idx);
  if (a && ["marke", "pfand", "lieferant", "flasche", "einkauf"].some((x) => x in f)) {
    const ax = getraenkArtikelVon(a) || getraenkArtikelSauber({});
    a.getraenk = getraenkArtikelSauber({ ...ax, ...("marke" in f ? { marke: f.marke } : {}), ...("pfand" in f ? { pfand: f.pfand } : {}), ...("lieferant" in f ? { lieferant: f.lieferant } : {}),
      ...("flasche" in f ? { menge: f.flasche } : {}), ...("einkauf" in f ? { gebinde: GEBINDE_EINKAUF.includes(f.einkauf) ? f.einkauf : null } : {}) });
  }
  return { ok: true };
}

// ---------- Neues Getränk ----------
// { name, preis?, menge, gebinde, quelle?, schankverlust?, marke?, pfand?, lieferant?, vorlage? (Name aus GETRAENK_VORLAGEN: füllt, was fehlt) }.
// Verkauft wie gekauft: Artikel gleichen Namens (Stück) als Zutat. Offen: Großgebinde (Artikel in Litern; aus dem Katalog angelegt, wenn es fehlt).
// Rückgabe { ok, gericht } | { ok: false, grund: "name" | "doppelt" | … wie getraenkSetzen }
export function getraenkAnlegen(stand, angaben = {}) {
  const v = angaben.vorlage ? GETRAENK_VORLAGEN.find((x) => x.name === angaben.vorlage) || null : null;
  const name = String(angaben.name ?? v?.name ?? "").trim().slice(0, 80);
  if (!name) return { ok: false, grund: "name" };
  if ((stand.gerichte || []).some((g) => g.name.toLowerCase() === name.toLowerCase())) return { ok: false, grund: "doppelt" };
  const menge = angaben.menge !== undefined ? angaben.menge : v?.menge ?? null; const gebinde = angaben.gebinde ?? v?.gebinde ?? null;
  const quelle = (angaben.quelle !== undefined ? angaben.quelle : v?.quelle) || null;
  if (menge !== null && !mengeOk(menge)) return { ok: false, grund: "menge" };
  stand.artikel ??= [];
  const idx = index(stand);
  if (quelle && !idx[quelle]) { // Großgebinde aus dem Katalog (Liter) anlegen – ohne Preis, den trägt der Wirt unter „Einkaufspreise“ ein
    const p = PRODUKT_INDEX[quelle]; if (!p || EINHEITEN[p.e]?.basis !== "ml") return { ok: false, grund: "quelle" };
    stand.artikel.push(getraenkArtikelNeu(quelle, p.g, p.e));
  } else if (quelle && basisVon(idx[quelle]) !== "ml") return { ok: false, grund: "quelleEinheit" };
  if (!quelle && !idx[name]) stand.artikel.push(getraenkArtikelNeu(name, "getraenk", "stk"));
  const zutaten = quelle ? [{ name: quelle, menge: Math.round((menge || 0) * 1000) || null, einheit: "ml" }] : [{ name, menge: 1, einheit: "stk" }];
  const preis = typeof angaben.preis === "number" && angaben.preis > 0 && angaben.preis < 1000 ? Math.round(angaben.preis * 100) / 100 : null;
  const g = { id: uid(), name, bereich: "alkoholfrei", klasse: "getraenk", zeit: 1, vorlage: false, zutaten, preis, mengeTag: null, steuer: 0.19, // Getränke in der Gastronomie: 19 %
    getraenk: getraenkGerichtSauber({ menge, gebinde, quelle }) };
  stand.gerichte = [...(stand.gerichte || []), g];
  const rest = {}; for (const k of ["schankverlust", "marke", "pfand", "lieferant", "flasche"]) if (angaben[k] !== undefined) rest[k] = angaben[k];
  if (Object.keys(rest).length) { const r = getraenkSetzen(stand, g.id, rest); if (!r.ok) { stand.gerichte = stand.gerichte.filter((x) => x.id !== g.id); return r; } }
  return { ok: true, gericht: g };
}
function getraenkArtikelNeu(name, gruppe, einheit) {
  const a = { name, gruppe: gruppe === "spirituose" ? "spirituose" : "getraenk", einheit, packung: { menge: null, einheit }, gebinde: { art: "kiste", zwischen: null }, preis: null, preisBasis: "netto", preisHistorie: [], status: "offen" };
  a.getraenk = getraenkArtikelVon(a); return a;
}
