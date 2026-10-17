// Trennung (17.10.2026): Schreib-Funktionen für Speisekarte, Rezepte, Verkaufspreise und Einkaufspreise (Artikel).
// Vorher schrieben js/screens/karte.js, foto.js, beleg.js und karte_laden.js diese Felder selbst. Felder und Regeln sind unverändert.
import { uid } from "./util.js";
import { PRODUKT_INDEX } from "./data/katalog.js";
import { rezeptBauen } from "./rezept_baukasten.js";
import { klasseFuerBereich, artikelAusGerichten, steuersatzAusZutaten, mengeUmrechnen, preisJeBasis, preisMerken, istRichtpreis } from "./engine.js";
import { selbstAnwenden, selbstGewaehlt } from "./selbst.js";

// ---------- Artikelliste ----------
// Artikelliste aus den Gerichten neu aufbauen und speichern (eingetragene Preise bleiben). Vorher „stand.artikel = artikelAusGerichten(stand)“ an sieben Stellen.
export function artikelAbgleichen(stand) { stand.artikel = artikelAusGerichten(stand); return stand.artikel; }
// Dieselbe Liste nur zum Anzeigen: rechnet auf einer Kopie, schreibt nichts (Einkaufspreise beim Zeichnen; vorher wurde dort gespeichert).
export function artikelVorschau(stand) { return artikelAusGerichten({ ...stand, artikel: structuredClone(stand.artikel || []) }); }

// ---------- Gerichte ----------
export function gerichtAusVorlage(v) { // 17.10.2026 Fehler F1 (vorher screens/karte.js)
  const zutaten = v.zutaten.map(([name, menge, einheit]) => ({ name, menge, einheit }));
  return { id: uid(), name: v.name, vorlageName: v.name, bereich: v.bereich, klasse: klasseFuerBereich(v.bereich), zeit: v.zeit, vorlage: true,
    zutaten, preis: null, mengeTag: null, steuer: steuersatzAusZutaten(zutaten), rezeptFamilie: rezeptBauen(v.name)?.familie || null };
}
export function gerichtAusVorlageAnlegen(stand, v) { const g = gerichtAusVorlage(v); stand.gerichte.push(g); return g; }
export function gerichtEigenAnlegen(stand, name) {
  const g = { id: uid(), name, bereich: null, klasse: "haupt", zeit: 5, vorlage: false, zutaten: [], preis: null, mengeTag: null, steuer: 0.07 };
  stand.gerichte.push(g); return g;
}
export function gerichtEntfernen(stand, id) { const vorher = stand.gerichte.length; stand.gerichte = stand.gerichte.filter((x) => x.id !== id); return stand.gerichte.length < vorher; }
const gericht = (stand, id) => stand.gerichte.find((x) => x.id === id) || null;
export function gerichtNameSetzen(stand, id, name) { const g = gericht(stand, id); if (g) g.name = name; }
export function gerichtKlasseSetzen(stand, id, klasse) { const g = gericht(stand, id); if (g) g.klasse = klasse; }
// Zubereitungszeit in Schritten: ab 5 Minuten 1 Minute, darunter eine halbe
export function gerichtZeitSchritt(stand, id, d) { const g = gericht(stand, id); if (!g) return; const z = Number(g.zeit) || 0; const schritt = (d > 0 ? z >= 5 : z > 5) ? 1 : 0.5; g.zeit = Math.max(0.5, Math.round((z + d * schritt) * 2) / 2); }

// ---------- Rezept (Zutaten) ----------
// Vom Wirt angepasst: ein Baukasten-Rezept wird zum eigenen
export function rezeptAngepasst(stand, id) { const g = gericht(stand, id); if (g && g.rezeptQuelle === "baukasten") g.rezeptQuelle = "eigen"; }
export function zutatMengeSetzen(stand, id, i, menge, datum) {
  const g = gericht(stand, id); const z = g?.zutaten[i]; if (!z) return;
  if (menge !== z.menge) { z.menge = menge; z.quelle = "eigen"; z.quelleInfo = { datum }; }
  if (g.rezeptQuelle === "baukasten") g.rezeptQuelle = "eigen";
}
export function zutatEntfernen(stand, id, i) { const g = gericht(stand, id); if (!g) return; g.zutaten.splice(i, 1); if (!g.zutaten.length) g.rezeptBewusstLeer = true; }
export function zutatEinheitSetzen(stand, id, i, einheit) { const z = gericht(stand, id)?.zutaten[i]; if (z && z.einheit !== einheit) { z.menge = mengeUmrechnen(z.menge, z.einheit, einheit); z.einheit = einheit; } }
// Katalog-Zutat (Einheit aus dem Katalog: kg → g, l → ml) – false, wenn der Name nicht im Katalog steht
export function zutatAusKatalog(stand, id, name) { const g = gericht(stand, id); const p = PRODUKT_INDEX[name]; if (!g || !p) return false; g.zutaten.push({ name: p.n, menge: null, einheit: p.e === "kg" ? "g" : p.e === "l" ? "ml" : p.e }); return true; }
export function zutatFrei(stand, id, name) { const g = gericht(stand, id); if (g) g.zutaten.push({ name, menge: null, einheit: "stk" }); }

// ---------- Verkaufspreise und Mengen ----------
export function verkaufspreisSetzen(stand, id, preis) { const g = gericht(stand, id); if (!g) return null; g.preis = preis; return g; }
export function mengeTagSetzen(stand, id, menge) { const g = gericht(stand, id); if (g) g.mengeTag = menge; }
export const bestellungenTagSetzen = (stand, n) => { stand.verkauf.bestellungenTag = n; };
export function zielgewinnSetzen(stand, n) { stand.verkauf.zielgewinn = n; stand.verkauf.zielgewinnStatus = "eigen"; }

// ---------- Einkaufspreise (Artikel) ----------
const artikel = (stand, name) => (stand.artikel || []).find((x) => x.name === name) || null;
// Richtpreise (17.10.2026): solange Preis und Packung unverändert sind, bleibt es ein Richtpreis; jede Änderung macht ihn zum eigenen
function statusNeu(a) { a.status = preisJeBasis(a) === null ? "offen" : istRichtpreis(a) ? "richtpreis" : "bekannt"; if (a.richtpreis && !istRichtpreis(a)) delete a.richtpreis; }
// feld: "packung" | "preis" | "zwischen" | "roh" | "gar"; wert schon als Zahl (oder null); datum = heute
export function artikelFeldSetzen(stand, name, feld, wert, datum) {
  const a = artikel(stand, name); if (!a) return false;
  if (feld === "packung") { a.packung ??= { menge: null, einheit: a.einheit }; a.packung.menge = wert; }
  if (feld === "preis") { if (wert !== a.preis) { preisMerken(a, datum); a.preis = wert; if (wert !== null) a.preisDatum = datum; } }
  if (feld === "zwischen") { a.gebinde ??= { art: "packung", zwischen: null }; a.gebinde.zwischen = wert > 0 ? { art: a.gebinde.zwischen?.art || "beutel", anzahl: Math.round(wert) } : null; }
  if (feld === "roh") { a.garverlust ??= {}; a.garverlust.roh = wert; }
  if (feld === "gar") { a.garverlust ??= {}; a.garverlust.gar = wert; }
  statusNeu(a); return true;
}
export function packungEinheitSetzen(stand, name, einheit) {
  const a = artikel(stand, name); if (!a) return false;
  a.packung ??= { menge: null, einheit: a.einheit };
  if (a.packung.einheit !== einheit) { a.packung.menge = mengeUmrechnen(a.packung.menge, a.packung.einheit, einheit); a.packung.einheit = einheit; }
  return true;
}
export function gebindeArtSetzen(stand, name, art) { const a = artikel(stand, name); if (!a) return false; a.gebinde ??= { art: "packung", zwischen: null }; a.gebinde.art = art; if (art === "lose") a.gebinde.zwischen = null; return true; }
export function preisBasisSetzen(stand, name, basis) {
  const a = artikel(stand, name); if (!a) return false;
  a.preisBasis = basis === "brutto" ? "brutto" : "netto";
  if (a.richtpreis && !istRichtpreis(a)) { delete a.richtpreis; a.status = preisJeBasis(a) !== null ? "bekannt" : "offen"; }
  return true;
}
export function zwischenEntfernen(stand, name) { const a = artikel(stand, name); if (a?.gebinde) a.gebinde.zwischen = null; return !!a; }
export function garverlustMessenUmschalten(stand, name) { const a = artikel(stand, name); if (!a) return false; a.garverlust ??= {}; a.garverlust.messen = !a.garverlust.messen; return true; }
// Selbst gemachtes Teil an/aus (Kachel aus data/zwischen.js), danach die Artikelliste neu
export function selbstUmschalten(stand, kachel, an) {
  const wahl = new Set(selbstGewaehlt(stand)); if (an) wahl.add(kachel); else wahl.delete(kachel);
  selbstAnwenden(stand, [...wahl]); artikelAbgleichen(stand);
}
// Beleg: neue Ware aus einer Belegzeile anlegen (wenn der Name noch fehlt). Rückgabe: der Name.
export function artikelAusBeleg(stand, { name, gruppe, einheit, gebindeArt }) {
  const a = { name: String(name).slice(0, 60), gruppe, einheit, packung: { menge: null, einheit }, gebinde: { art: gebindeArt, zwischen: null }, preis: null, preisBasis: "netto", preisHistorie: [], status: "offen", benutzt: false };
  if (!stand.artikel.some((x) => x.name === a.name)) stand.artikel.push(a);
  return a.name;
}

// ---------- Eigenes Gerichtfoto (Upload + Verweis am Gericht) ----------
export function gerichtFotoSetzen(stand, id, meta, { geraet = null, jetzt = new Date() } = {}) {
  const g = gericht(stand, id); if (!g) return null;
  stand.uploads.push({ id: "u-" + jetzt.getTime().toString(36), zweck: "gericht", erfasst: jetzt.toISOString(), geraet, status: "abgelegt", datei: meta, ref: g.id });
  g.foto = meta.id; g.fotoMeta = meta; return g;
}
