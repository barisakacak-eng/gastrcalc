// Trennung (17.10.2026): Schreib-Funktionen für Speisekarte, Rezepte, Verkaufspreise und Einkaufspreise (Artikel).
import { gerichtText } from "./i18n.js"; // Perfektionswoche 24.10.2026
// Vorher schrieben js/screens/karte.js, foto.js, beleg.js und karte_laden.js diese Felder selbst. Felder und Regeln sind unverändert.
import { uid } from "./util.js";
import { PRODUKT_INDEX, EINHEITEN, inBasis } from "./data/katalog.js";
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
  return { id: uid(), name: gerichtText(v.name) /* Perfektionswoche 24.10.2026: Name in der aktiven Sprache, vorlageName bleibt deutsch */, vorlageName: v.name, bereich: v.bereich, klasse: klasseFuerBereich(v.bereich), zeit: v.zeit, vorlage: true,
    zutaten, preis: null, mengeTag: null, steuer: steuersatzAusZutaten(zutaten), rezeptFamilie: rezeptBauen(v.name)?.familie || null };
}
export function gerichtAusVorlageAnlegen(stand, v) { const g = gerichtAusVorlage(v); stand.gerichte.push(g); return g; }
// Persona-Test Wirt (27.10.2026): „Classic Smash 9.90“ wurde komplett zum Namen, „Fries 3.50“ zum Hauptgericht (trug Miete wie ein Burger).
// Ein Preis am Ende des Namens wird zum Preis; Pommes/Dips sind Kleinigkeiten, Getränke Getränke (änderbar wie bisher).
const KLEIN_RE = /\b(pommes|fries|wedges|chips|dip|soße|sosse|sauce|nuggets|onion rings|ayran)\b/i;
const GETRAENK_RE = /\b(cola|fanta|sprite|wasser|water|limo|saft|juice|eistee|ice tea|bier|beer|kaffee|coffee|tee|tea|çay|energy)\b/i;
export function nameUndPreis(text) {
  // Nachtest 27.10.2026: nur eindeutige Preise – mit zwei Nachkommastellen („9.90“) oder mit €-Zeichen („12 €“); „Menü 1“, „Pizza 32“, „Cola 0,5“ bleiben Namen
  const roh = String(text || "").trim();
  const m = roh.match(/^(.*?\S)\s+(\d{1,3}[.,]\d{2})\s*€?$/) || roh.match(/^(.*?\S)\s+(\d{1,3}(?:[.,]\d{1,2})?)\s*€$/);
  if (!m) return { name: roh, preis: null };
  const preis = Number(m[2].replace(",", ".")); return preis >= 1 && preis < 200 ? { name: m[1], preis } : { name: roh, preis: null };
}
export function gerichtEigenAnlegen(stand, eingabe) {
  const { name, preis } = nameUndPreis(eingabe);
  const klasse = GETRAENK_RE.test(name) ? "getraenk" : KLEIN_RE.test(name) ? "kleinigkeit" : "haupt";
  const g = { id: uid(), name, bereich: null, klasse, zeit: klasse === "haupt" ? 5 : 2, vorlage: false, zutaten: [], preis, mengeTag: null, steuer: 0.07 };
  stand.gerichte.push(g); startRezept(stand, g); return g;
}
// Persona-Test Wirt (27.10.2026): Ein eigenes Gericht bekam das Start-Rezept aus dem Baukasten erst beim nächsten App-Start –
// bis dahin zeigte der Rezept-Schritt „0 Zutaten“, das Büro später fremde Zutaten. Jetzt sofort, sobald der Name passt.
function startRezept(stand, g) {
  if (!g?.name || String(g.name).trim().length < 4 || (g.zutaten || []).length || g.rezeptBewusstLeer || g.klasse === "getraenk") return false;
  const r = rezeptBauen(g.name, { rubrik: g.rubrik }); if (!r) return false;
  g.zutaten = r.zutaten.map((z) => ({ name: z.name, menge: z.menge, einheit: z.einheit })); g.zeit = r.zeit || g.zeit; g.rezeptQuelle = "baukasten"; g.rezeptFamilie = r.familie;
  stand.artikel = artikelAusGerichten(stand); return true;
}
export function gerichtEntfernen(stand, id) { const vorher = stand.gerichte.length; stand.gerichte = stand.gerichte.filter((x) => x.id !== id); return stand.gerichte.length < vorher; }
const gericht = (stand, id) => stand.gerichte.find((x) => x.id === id) || null;
export function gerichtNameSetzen(stand, id, name) { const g = gericht(stand, id); if (g) { g.name = name; startRezept(stand, g); } }
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
  if (feld === "zwischen") { a.gebinde ??= { art: "packung", zwischen: null }; a.gebinde.zwischen = wert > 0 ? { art: a.gebinde.zwischen?.art || a.gebinde.zwischenArt || "beutel", anzahl: Math.round(wert) } : null; }
  // Gebinde in Stück (19.10.2026, Teil 2): „Karton 40 Stück à 250 g“ – Inhalt bleibt in Gramm (40 × 250 = 10 kg), das Stückgewicht merkt sich der Artikel
  if (feld === "stk-anzahl" || feld === "stk-gewicht") {
    a.gebinde ??= { art: "packung", zwischen: null }; const st = (a.gebinde.stueck ??= { anzahl: null, gewicht: a.stueckGewicht || null });
    st[feld === "stk-anzahl" ? "anzahl" : "gewicht"] = wert > 0 ? wert : null;
    if (st.gewicht > 0) a.stueckGewicht = st.gewicht; else delete a.stueckGewicht;
    const basis = EINHEITEN[a.einheit]?.basis === "ml" ? "ml" : "g";
    a.packung = { menge: st.anzahl > 0 && st.gewicht > 0 ? Math.round(st.anzahl * st.gewicht * 100) / 100 : null, einheit: basis };
  }
  if (feld === "stueckGewicht") { if (wert > 0) a.stueckGewicht = wert; else delete a.stueckGewicht; } // Stück-Ware, die ein Rezept in Gramm braucht
  if (feld === "roh") { a.garverlust ??= {}; a.garverlust.roh = wert; }
  if (feld === "gar") { a.garverlust ??= {}; a.garverlust.gar = wert; }
  statusNeu(a); return true;
}
export function packungEinheitSetzen(stand, name, einheit) {
  const a = artikel(stand, name); if (!a) return false;
  a.packung ??= { menge: null, einheit: a.einheit };
  const artBasis = EINHEITEN[a.einheit]?.basis;
  if (einheit === "stk" && artBasis && artBasis !== "stk") { // Teil 2: Gebinde nach Stückzahl
    a.gebinde ??= { art: "packung", zwischen: null };
    if (!a.gebinde.stueck) { const g = a.stueckGewicht || null; a.gebinde.stueck = { anzahl: g && a.packung.menge > 0 ? Math.round(inBasis(a.packung.menge, a.packung.einheit) / g) : null, gewicht: g }; }
    return true;
  }
  if (a.gebinde?.stueck) { delete a.gebinde.stueck; }
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
// Teil 2 (19.10.2026): Art der inneren Packung (Karton à 4 Beutel / à 6 Dosen). Ohne Anzahl merkt sie sich die Art schon vor.
export function zwischenArtSetzen(stand, name, art) {
  const a = artikel(stand, name); if (!a) return false; a.gebinde ??= { art: "packung", zwischen: null };
  if (a.gebinde.zwischen) a.gebinde.zwischen.art = art; else a.gebinde.zwischenArt = art; return true;
}
export function zwischenEntfernen(stand, name) { const a = artikel(stand, name); if (a?.gebinde) a.gebinde.zwischen = null; return !!a; }
export function garverlustMessenUmschalten(stand, name) { const a = artikel(stand, name); if (!a) return false; a.garverlust ??= {}; a.garverlust.messen = !a.garverlust.messen; return true; }
// Selbst gemachtes Teil an/aus (Kachel aus data/zwischen.js), danach die Artikelliste neu
export function selbstUmschalten(stand, kachel, an) {
  const wahl = new Set(selbstGewaehlt(stand)); if (an) wahl.add(kachel); else wahl.delete(kachel);
  selbstAnwenden(stand, [...wahl]); artikelAbgleichen(stand);
}
// Selbst gemacht als echtes Unterrezept (19.10.2026, „Go beide“ Teil 1): der Wirt trägt seinen Ansatz selbst ein.
// Jede Änderung macht das Rezept zu „eigen“ (selbstAnwenden überschreibt es dann nie mehr); der Preis folgt beim Abgleich (zwischenpreiseRechnen).
const eigenMachen = (r, datum) => { r.quelle = "eigen"; if (datum) r.gewogenAm = datum; };
const basisEinheit = (e) => (e === "kg" || e === "g" ? "g" : e === "l" || e === "ml" ? "ml" : "stk");
// Ausbeute aus Stückzahl × Stückgewicht: 6 Ballen à 275 g = 1650 g. Nur Stückzahl → Ausbeute in Stück.
// 20.10.2026 (Baris): „Wie viel ist die Gesamtmasse, wie schwer ist ein Ballen – daraus der Rest.“ Mit Teig gesamt und Gewicht je Stück
// folgt die Stückzahl (abgerundet, der Rest bleibt Teig). Ausbeute ist dann der ganze Teig, Warenwert je Stück = je Gramm × Ballengewicht.
function stueckAusbeute(r) {
  const s = r.stueck; if (!s) return;
  if (s.masse > 0 && s.gewicht > 0) { s.anzahl = Math.floor(s.masse / s.gewicht + 1e-9) || null; r.ausbeute = { menge: s.masse, einheit: "g" }; return; }
  if (s.anzahl > 0 && s.gewicht > 0) r.ausbeute = { menge: Math.round(s.anzahl * s.gewicht * 100) / 100, einheit: "g" };
  else if (s.anzahl > 0) r.ausbeute = { menge: s.anzahl, einheit: "stk" };
}
export function selbstFeldSetzen(stand, name, feld, roh, datum) {
  const a = artikel(stand, name); const r = a?.herkunft === "selbst" ? a.rezept : null; if (!r) return false;
  const [art, idx] = feld.split("#");
  if (art === "neu") { // Zutat dazu: roh ist der Warenname
    if (!roh || r.zutaten.some((z) => z.name === roh)) return false;
    const kat = PRODUKT_INDEX[roh]; const vorhanden = artikel(stand, roh);
    const e = basisEinheit(vorhanden?.einheit || kat?.e || "g");
    r.zutaten.push({ name: roh, menge: null, einheit: e }); eigenMachen(r, datum); return true;
  }
  const wert = typeof roh === "number" ? roh : null;
  if (art === "menge") { const z = r.zutaten[Number(idx)]; if (!z) return false; z.menge = wert; }
  else if (art === "ausbeute") { r.ausbeute = { menge: wert, einheit: r.ausbeute?.einheit && r.ausbeute.einheit !== "stk" ? r.ausbeute.einheit : basisEinheit(a.einheit) === "ml" ? "ml" : "g" }; delete r.stueck; }
  else if (art === "anzahl" || art === "gewicht" || art === "masse") { r.stueck ??= { anzahl: null, gewicht: null }; r.stueck[art] = wert > 0 ? wert : null; if (art === "anzahl") delete r.stueck.masse; stueckAusbeute(r); }
  else if (art === "arbeit") r.arbeitMin = wert > 0 ? wert : 0;
  else return false;
  eigenMachen(r, datum); return true;
}
// 20.10.2026 (Baris): Zutaten sind austauschbar – „Weizenmehl Typ 550“ ist nur ein Startwert. Menge bleibt, die Einheit folgt der neuen Ware
// (Gramm, Milliliter oder Stück), wenn sie nicht passt.
export function selbstZutatTauschen(stand, name, i, neuName, datum) {
  const r = artikel(stand, name)?.rezept; const z = r?.zutaten?.[i]; if (!z || !neuName || neuName === z.name || neuName === name) return false;
  if (r.zutaten.some((x, j) => j !== i && x.name === neuName)) return false;
  const e = basisEinheit(artikel(stand, neuName)?.einheit || PRODUKT_INDEX[neuName]?.e || "g");
  z.name = neuName; if (basisEinheit(z.einheit) !== e) { z.einheit = e; z.menge = null; }
  eigenMachen(r, datum); return true;
}
export function selbstZutatEntfernen(stand, name, i, datum) {
  const r = artikel(stand, name)?.rezept; if (!r?.zutaten?.[i]) return false;
  r.zutaten.splice(i, 1); eigenMachen(r, datum); return true;
}
// Ausbeute als Gewicht oder als Stück (Pizzaballen, Fladen, Patties). Beim Wechsel bleibt, was schon da ist.
export function selbstAusbeuteArt(stand, name, art, datum) {
  const r = artikel(stand, name)?.rezept; if (!r) return false;
  if (art === "stueck") {
    if (!r.stueck) r.stueck = r.ausbeute?.einheit === "stk" ? { anzahl: r.ausbeute.menge, gewicht: null } : { anzahl: null, gewicht: null };
    stueckAusbeute(r);
  } else { delete r.stueck; if (r.ausbeute?.einheit === "stk") r.ausbeute = { menge: null, einheit: "g" }; }
  eigenMachen(r, datum); return true;
}
// Jede Ware kann selbst gemacht werden (nicht nur die Vorlagen aus data/zwischen.js): leeres eigenes Rezept, Einkaufspreis bleibt für den Rückweg.
export function selbstEigenUmschalten(stand, name, an) {
  const a = artikel(stand, name); if (!a) return false;
  if (an) {
    if (a.herkunft === "selbst") return false;
    a.gekauftVorher = a.preis !== null ? { preis: a.preis, packung: a.packung, preisBasis: a.preisBasis } : a.gekauftVorher || null;
    a.herkunft = "selbst";
    if (!a.rezept) { const e = basisEinheit(a.einheit); a.rezept = { zutaten: [], ausbeute: { menge: null, einheit: e }, arbeitMin: 0, quelle: "eigen" }; if (e === "stk") a.rezept.stueck = { anzahl: null, gewicht: null }; }
  } else {
    if (a.herkunft !== "selbst") return false;
    a.herkunft = "gekauft"; const v = a.gekauftVorher;
    a.preis = v?.preis ?? null; a.packung = v?.packung || { menge: null, einheit: a.einheit }; a.preisBasis = v?.preisBasis || "netto";
    delete a.zwischenFehlt; delete a.zwischenRichtpreis; statusNeu(a);
  }
  return true;
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

// Brot zum Adana-Teller (Baris 20.10.2026: „je nach Betrieb immer unterschiedlich“ → einmal fragen). Die Antwort ersetzt das Brot in jedem Gericht,
// das aus der Vorlage „Adana-Spieß“ stammt, und wird am Stand gemerkt (keine zweite Frage). Wahl: pide | pideHalb | fladen | kein.
export const ADANA_BROT = { pide: { name: "Pide-Brot", menge: 1 }, pideHalb: { name: "Pide-Brot", menge: 0.5 }, fladen: { name: "Dürüm-Wrap", menge: 1 }, kein: null };
const BROTE = new Set(["Pide-Brot", "Dürüm-Wrap", "Dönerbrot / Fladen"]);
export const adanaGerichte = (stand) => (stand.gerichte || []).filter((g) => g.vorlageName === "Adana-Spieß");
export const adanaBrotOffen = (stand) => !stand.adanaBrot && adanaGerichte(stand).length > 0;
export function adanaBrotSetzen(stand, wahl) {
  if (!(wahl in ADANA_BROT)) return false;
  const b = ADANA_BROT[wahl];
  for (const g of adanaGerichte(stand)) {
    g.zutaten = g.zutaten.filter((z) => !BROTE.has(z.name));
    if (b) g.zutaten.push({ name: b.name, menge: b.menge, einheit: "stk" });
  }
  stand.adanaBrot = wahl; return true;
}
