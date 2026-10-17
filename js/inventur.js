// Inventur (Punkt 3, Baris 15.10.2026: „A1 + A2, A-E sehr gut mit Erklärung"). Reine Funktionen, keine Oberfläche.
// Gezählt wird in Einkaufseinheiten (Karton, Kiste, Sack …), so wie der Wirt einkauft; angebrochene Packungen als ¼ ½ ¾.
// Wert je Zeile = Anzahl × Einkaufspreis je Packung (netto). Nichts wird erfunden: ohne Preis kein Wert („Preis fehlt noch").
//
// Daten im Laden: stand.inventuren = [{ id, datum, begonnen, abgeschlossen|null, posten: {name: menge|null}, ausgeblendet: [names], preise? }].
// Eine offene Inventur übersteht das Neuladen (Pause). Abgeschlossene werden nie gelöscht (nur anhängen wie die anderen Journale),
// „verwerfen" geht nur für die offene. Beim Abschluss werden die Preise festgehalten (preise), damit eine alte Inventur ihren Wert behält,
// auch wenn später ein neuer Beleg den Preis ändert.
//
// Vergleich (ab der zweiten Inventur): Anfang + Einkauf − Ende = Verbrauch. Zeitraum: nach dem Tag der vorigen Inventur bis einschließlich
// des Tags dieser Inventur (gezählt wird nach Ladenschluss; was am Zähltag geliefert wurde, steckt schon in der vorigen Zählung).
import { imTakt } from "./takt.js";
import { uid, heute } from "./util.js";
import { istBetriebsmittel } from "./betriebsmittel.js";
import { PRODUKT_INDEX, EINHEITEN, inBasis } from "./data/katalog.js";
import { preisNettoGebinde, umsatzZeitraum, umsatzSteuerSatz, schwundAuswertung, tagPlus, istRichtpreis } from "./engine.js";
import { warenQuote } from "./zaehler.js";

export const LAGERORTE = ["kuehlhaus", "tiefkuehler", "trockenlager", "verpackung", "reinigung"];
const KUEHL_GRUPPEN = new Set(["fleisch", "fisch", "kaese", "gemuese"]);
const RE_TK = /\bTK\b|tiefk[üu]hl|gefroren|pommes|kroketten|wedges|onion rings|nuggets/i;

// Lagerort aus Warengruppe und Name. Unklar → Trockenlager.
export function lagerortFuer(a) {
  const name = String(a?.name || ""); const g = a?.gruppe || PRODUKT_INDEX[name]?.g || null;
  if (istBetriebsmittel(name)) return "reinigung";
  if (g === "verpackung") return "verpackung";
  if (RE_TK.test(name)) return "tiefkuehler";
  if (KUEHL_GRUPPEN.has(g)) return "kuehlhaus";
  return "trockenlager";
}

const viertel = (n) => Math.round(Number(n) * 4) / 4;
// Menge säubern: null bleibt null (= noch nicht gezählt), sonst ≥ 0 in Vierteln.
export function mengeSauber(m) {
  if (m === null || m === undefined || m === "") return null;
  const n = Number(m); return Number.isFinite(n) ? Math.max(0, viertel(n)) : null;
}
export const ganzTeil = (m) => { const v = mengeSauber(m) ?? 0; const g = Math.floor(v); return { ganz: g, teil: viertel(v - g) }; };
// ＋/− lässt den angebrochenen Teil stehen; „noch nicht gezählt" wird mit + zu 1, mit − zu 0.
export function mengeSchritt(alt, d) {
  if (alt === null || alt === undefined) return d > 0 ? 1 : 0;
  const { ganz, teil } = ganzTeil(alt); return Math.max(0, ganz + d) + teil;
}
// ¼ ½ ¾: setzt den angebrochenen Teil; derselbe Teil noch einmal nimmt ihn weg. t = 0 heißt „voll".
export function anbruchSetzen(alt, t) {
  const { ganz, teil } = ganzTeil(alt);
  if (alt !== null && alt !== undefined && t > 0 && Math.abs(teil - t) < 0.01) return ganz;
  return ganz + viertel(t);
}

export const inventurenAlle = (stand) => Array.isArray(stand.inventuren) ? stand.inventuren : [];
export const inventurOffen = (stand) => inventurenAlle(stand).find((i) => !i.abgeschlossen) || null;
export const inventurenFertig = (stand) => inventurenAlle(stand).filter((i) => i.abgeschlossen)
  .sort((a, b) => String(a.datum).localeCompare(String(b.datum)) || String(a.abgeschlossen).localeCompare(String(b.abgeschlossen)));
// Die fertige Inventur direkt vor `inv` (nach Datum und Abschlusszeit); für eine offene die letzte fertige.
export function inventurVorher(stand, inv) {
  const f = inventurenFertig(stand);
  if (!inv || !inv.abgeschlossen) return f[f.length - 1] || null;
  const i = f.findIndex((x) => x.id === inv.id); return i > 0 ? f[i - 1] : null;
}

export function inventurStarten(stand, { datum = heute(), jetzt = new Date().toISOString() } = {}) {
  const offen = inventurOffen(stand); if (offen) return offen;
  const vor = inventurVorher(stand, null);
  const inv = { id: uid(), datum, begonnen: jetzt, abgeschlossen: null, posten: {}, ausgeblendet: vor ? [...(vor.ausgeblendet || [])] : [] };
  stand.inventuren ??= []; stand.inventuren.push(inv); return inv;
}

// Welche Waren gezählt werden: Zutaten der Gerichte (bei selbst gemachten Teilen deren Rohstoffe), was über Belege eingekauft wurde,
// alle Verpackungen, was bei der letzten Inventur gezählt wurde und was der Wirt dazugeholt hat (Schlüssel in posten).
function namenFuerInventur(stand, inv) {
  const artikel = Object.fromEntries((stand.artikel || []).map((a) => [a.name, a]));
  const namen = new Set();
  const dazu = (n) => { if (typeof n !== "string" || !n) return; const a = artikel[n];
    if (a?.herkunft === "selbst") { for (const z of a.rezept?.zutaten || []) if (artikel[z.name]?.herkunft !== "selbst") namen.add(z.name); return; }
    namen.add(n); };
  for (const g of stand.gerichte || []) for (const z of g.zutaten || []) dazu(z.name);
  for (const l of stand.lieferungen || []) if (!l.storniert) for (const z of l.zeilen || []) dazu(z.artikel);
  for (const a of stand.artikel || []) if (a.gruppe === "verpackung") dazu(a.name);
  const vor = inventurVorher(stand, inv);
  if (vor) for (const [n, m] of Object.entries(vor.posten || {})) if (m !== null) dazu(n);
  for (const n of Object.keys(inv?.posten || {})) namen.add(n); // ausdrücklich dazugeholt oder schon gezählt
  return { namen, artikel };
}

// Liste für die Zählung, sortiert nach Lagerort und Name. Jede Zeile: Name, Lagerort, Gebinde, Packungspreis netto (oder null), Menge, letztes Mal.
export function artikelFuerInventur(stand, inv) {
  const { namen, artikel } = namenFuerInventur(stand, inv);
  const vor = inventurVorher(stand, inv); const weg = new Set(inv?.ausgeblendet || []);
  const preise = inv?.abgeschlossen && inv.preise ? inv.preise : null;
  const zeilen = [...namen].map((name) => {
    const a = artikel[name] || null; const gruppe = a?.gruppe || PRODUKT_INDEX[name]?.g || null;
    const preis = preise ? (typeof preise[name] === "number" ? preise[name] : null) : (a ? preisNettoGebinde(a) : null);
    const menge = mengeSauber(inv?.posten?.[name]);
    // Richtpreise (17.10.2026): Wert zu einem Richtpreis ist eine Schätzung (≈); abgeschlossene Inventur merkt sich, welche es waren
    const richtpreis = preise ? (Array.isArray(inv.richtpreise) && inv.richtpreise.includes(name)) : !!a && istRichtpreis(a);
    return { name, gruppe, richtpreis, lagerort: lagerortFuer({ name, gruppe }), artikel: a, gebinde: a?.gebinde?.art || "packung", packung: a?.packung || null,
      preis: typeof preis === "number" && Number.isFinite(preis) && preis >= 0 ? preis : null, menge, wert: menge !== null && typeof preis === "number" ? menge * preis : null,
      letztes: vor ? mengeSauber(vor.posten?.[name]) : null, ausgeblendet: weg.has(name) };
  });
  zeilen.sort((x, y) => LAGERORTE.indexOf(x.lagerort) - LAGERORTE.indexOf(y.lagerort) || x.name.localeCompare(y.name, "de"));
  return { liste: zeilen.filter((z) => !z.ausgeblendet), ausgeblendet: zeilen.filter((z) => z.ausgeblendet) };
}

// 17.10.2026 Fehler F2: Gibt es noch gar nichts zu zählen (keine Gerichte mit Rezept, keine Belege, keine Verpackung, nichts vom letzten Mal)?
// Dann führt die Übersicht zuerst zur Speisekarte statt in eine leere Liste.
export const inventurOhneWaren = (stand) => !inventurOffen(stand) && artikelFuerInventur(stand, null).liste.length === 0;

export function mengeSetzen(inv, name, menge) { if (!inv || inv.abgeschlossen) return false; inv.posten[name] = mengeSauber(menge); return true; }
export function ausblenden(inv, name) { if (!inv || inv.abgeschlossen) return false; if (!inv.ausgeblendet.includes(name)) inv.ausgeblendet.push(name); return true; }
export function einblenden(inv, name) { if (!inv || inv.abgeschlossen) return false; inv.ausgeblendet = inv.ausgeblendet.filter((n) => n !== name); return true; }
// Eine Ware dazuholen (aus der Suche). Ist sie dem Laden noch unbekannt, wird sie als Artikel ohne Preis angelegt (Preis später unter Einkaufspreise).
export function hinzufuegen(stand, inv, name) {
  if (!inv || inv.abgeschlossen || typeof name !== "string" || !name) return false;
  einblenden(inv, name);
  if (!(name in inv.posten)) inv.posten[name] = null;
  if (!(stand.artikel || []).some((a) => a.name === name)) {
    const k = PRODUKT_INDEX[name]; const e = k?.e || "stk";
    (stand.artikel ??= []).push({ name, gruppe: k?.g || "gewuerz", einheit: e, packung: { menge: null, einheit: e }, gebinde: { art: "packung", zwischen: null }, preis: null, preisBasis: "netto", preisHistorie: [], status: "offen", ausInventur: true });
  }
  return true;
}

// W2-D (Leistung Büro): abgeschlossene Inventur mit festgehaltenen Preisen – Summe, gezählt, ohne Preis allein aus der Inventur.
// Gleiches Ergebnis wie inventurWert(…).summe/.gezaehlt/.ohnePreis, ohne die Warenliste neu aufzubauen. Sonst: null.
export function inventurKurz(inv) {
  if (!inv?.abgeschlossen || !inv.preise || typeof inv.preise !== "object") return null;
  const weg = new Set(inv.ausgeblendet || []); let summe = 0, gezaehlt = 0; const ohnePreis = [];
  for (const [name, roh] of Object.entries(inv.posten || {})) {
    if (weg.has(name)) continue; const menge = mengeSauber(roh); if (menge === null) continue;
    gezaehlt += 1; const p = inv.preise[name]; const preis = typeof p === "number" && Number.isFinite(p) && p >= 0 ? p : null;
    if (preis === null) { if (menge > 0) ohnePreis.push(name); continue; }
    summe += menge * preis;
  }
  return { summe, gezaehlt, ohnePreis };
}
// Wert einer Inventur: Summe aller gezählten Zeilen mit Preis, je Lagerort, und was ohne Preis gezählt wurde.
export function inventurWert(stand, inv) { return inv?.abgeschlossen ? imTakt(stand, "invWert:" + inv.id, () => inventurWertRechnen(stand, inv)) : inventurWertRechnen(stand, inv); }
function inventurWertRechnen(stand, inv) {
  const { liste } = artikelFuerInventur(stand, inv);
  const jeLagerort = Object.fromEntries(LAGERORTE.map((o) => [o, { summe: 0, anzahl: 0, gezaehlt: 0 }]));
  let summe = 0, gezaehlt = 0; const ohnePreis = [], richtpreis = [];
  for (const z of liste) {
    const o = jeLagerort[z.lagerort]; o.anzahl += 1;
    if (z.menge === null) continue;
    gezaehlt += 1; o.gezaehlt += 1;
    if (z.preis === null) { if (z.menge > 0) ohnePreis.push(z.name); continue; }
    summe += z.wert; o.summe += z.wert;
    if (z.richtpreis && z.menge > 0) richtpreis.push(z.name);
  }
  return { summe, gezaehlt, anzahl: liste.length, offen: liste.length - gezaehlt, ohnePreis, richtpreis, jeLagerort };
}

// Abschließen: Datum des Zähltags, Preise festhalten, Wert merken. Danach ändert sich nichts mehr.
export function inventurAbschliessen(stand, inv, { datum = heute(), jetzt = new Date().toISOString() } = {}) {
  if (!inv || inv.abgeschlossen) return false;
  const { liste } = artikelFuerInventur(stand, inv);
  inv.preise = {};
  inv.inhalte = {}; // E7 (17.10.2026): Packungsinhalt in Grundeinheit beim Abschluss merken – für den Abgleich mit Verkäufen
  const art = Object.fromEntries((stand.artikel || []).map((a) => [a.name, a]));
  for (const z of liste) { if (!(z.name in inv.posten)) inv.posten[z.name] = null; if (z.menge !== null) { inv.preise[z.name] = z.preis; const p = art[z.name]?.packung; if (p?.menge > 0 && EINHEITEN[p.einheit]) inv.inhalte[z.name] = inBasis(p.menge, p.einheit); } }
  const rp = liste.filter((z) => z.menge !== null && z.richtpreis).map((z) => z.name); if (rp.length) inv.richtpreise = rp; // Richtpreise (17.10.2026)
  inv.datum = datum; inv.abgeschlossen = jetzt;
  inv.wert = inventurWert(stand, inv).summe;
  const v = inventurVergleich(stand, inv); if (v && typeof v.betriebsmittel.jeMonat === "number") inv.betriebsmittelJeMonat = v.betriebsmittel.jeMonat; // für die Zeile im Zähler (Stufe „aus Inventur“)
  return true;
}
// Verwerfen nur, solange die Inventur offen ist.
export function inventurVerwerfen(stand, inv) {
  if (!inv || inv.abgeschlossen) return false;
  const i = inventurenAlle(stand).indexOf(inv); if (i < 0) return false;
  stand.inventuren.splice(i, 1); return true;
}

// Einkauf aus Belegen (netto) in einem Zeitraum, stornierte zählen nicht – wie im Zähler (Stufe 3).
export function einkaufZeitraum(stand, { von, bis }) {
  let summe = 0, belege = 0; const lieferanten = new Set();
  for (const l of stand.lieferungen || []) {
    if (l.storniert || typeof l.datum !== "string" || l.datum < von || l.datum > bis) continue;
    summe += typeof l.summeNetto === "number" ? l.summeNetto : (l.zeilen || []).reduce((s, z) => s + (Number(z.netto) || 0), 0);
    belege += 1; if (l.lieferant) lieferanten.add(l.lieferant);
  }
  return { summe, belege, lieferanten: [...lieferanten] };
}
// Einkauf an Betriebsmitteln (Putzmittel, Müllbeutel, Handschuhe …) aus Belegzeilen im Zeitraum
export function betriebsmittelEinkauf(stand, { von, bis }) {
  let summe = 0;
  for (const l of stand.lieferungen || []) { if (l.storniert || typeof l.datum !== "string" || l.datum < von || l.datum > bis) continue;
    for (const z of l.zeilen || []) if (typeof z.netto === "number" && lagerortFuer({ name: z.artikel || z.name }) === "reinigung") summe += z.netto; }
  return summe;
}
const tageZwischen = (von, bis) => Math.round((Date.parse(bis + "T12:00:00Z") - Date.parse(von + "T12:00:00Z")) / 86400e3) + 1;

// Der Vergleich A–E. null, solange es keine vorige fertige Inventur gibt (erste Inventur).
export function inventurVergleich(stand, inv, vorher = inventurVorher(stand, inv)) {
  if (!inv || !vorher) return null;
  const anfang = inventurWert(stand, vorher); const ende = inventurWert(stand, inv);
  const von = tagPlus(vorher.datum, 1), bis = inv.datum;
  const tage = bis >= von ? tageZwischen(von, bis) : 0;
  const einkauf = tage > 0 ? einkaufZeitraum(stand, { von, bis }) : { summe: 0, belege: 0, lieferanten: [] };
  // Putzmittel & Co. sind kein Wareneinsatz: getrennt rechnen (Punkt 5, Zeile „Reinigung & Betriebsmittel“ im Zähler)
  const bmEinkauf = tage > 0 ? betriebsmittelEinkauf(stand, { von, bis }) : 0;
  const bmAnfang = anfang.jeLagerort.reinigung.summe, bmEnde = ende.jeLagerort.reinigung.summe;
  const bmVerbrauch = bmAnfang + bmEinkauf - bmEnde;
  const betriebsmittel = { verbrauch: bmVerbrauch, einkauf: bmEinkauf, jeMonat: tage >= 7 && bmVerbrauch >= 0 && anfang.jeLagerort.reinigung.gezaehlt > 0 && ende.jeLagerort.reinigung.gezaehlt > 0 ? bmVerbrauch * 30 / tage : null }; // nur wenn Putzmittel in beiden Inventuren gezählt wurden (Review 15.10.)
  const verbrauch = (anfang.summe - bmAnfang) + (einkauf.summe - bmEinkauf) - (ende.summe - bmEnde);
  const st = umsatzSteuerSatz(stand);
  const u = tage > 0 ? umsatzZeitraum(stand, { von, bis }) : { summe: 0, tage: 0 };
  const umsatzNetto = u.summe / (1 + st.satz);
  const q = warenQuote(stand); if (q.quelle === "richtwert") q.quote = null; // Paket 3 (16.10.2026): die Inventur vergleicht echte Zahlen, kein Branchen-Richtwert
  const echteQuote = umsatzNetto > 0 ? verbrauch / umsatzNetto : null;
  const sollWare = umsatzNetto > 0 && q.quote !== null ? umsatzNetto * q.quote : null;
  const luecke = sollWare !== null ? verbrauch - sollWare : null;
  const sw = tage > 0 ? schwundAuswertung(stand, { von, bis }) : { muellwert: 0, personal: { waren: 0, anzahl: 0 }, eigen: { waren: 0 }, ohneWert: 0 };
  const eingetragen = sw.muellwert + (sw.personal?.waren || 0) + (sw.eigen?.waren || 0);
  const erklaert = luecke !== null && luecke > 0 ? Math.min(luecke, eingetragen) : 0;
  const ohneErklaerung = luecke !== null && luecke > 0 ? Math.max(0, luecke - eingetragen) : 0;
  return {
    von, bis, tage, vorherDatum: vorher.datum, datum: inv.datum,
    anfang: anfang.summe, ende: ende.summe, einkauf: einkauf.summe, belege: einkauf.belege, lieferanten: einkauf.lieferanten,
    verbrauch, umsatzBrutto: u.summe, umsatzNetto, umsatzTage: u.tage, steuer: st.satz,
    echteQuote, appQuote: q.quote, quoteQuelle: q.quelle, sollWare, luecke,
    muell: sw.muellwert, personal: sw.personal?.waren || 0, eingetragen, erklaert, ohneErklaerung, muellOhneWert: sw.ohneWert || 0,
    ohnePreis: [...new Set([...anfang.ohnePreis, ...ende.ohnePreis])], unvollstaendig: anfang.ohnePreis.length + ende.ohnePreis.length > 0 || ende.offen > 0 || anfang.richtpreis.length + ende.richtpreis.length > 0,
    richtpreis: [...new Set([...anfang.richtpreis, ...ende.richtpreis])],
    verbrauchNegativ: verbrauch < 0, betriebsmittel,
  };
}
