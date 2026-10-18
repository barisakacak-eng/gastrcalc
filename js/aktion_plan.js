// Aktion planen (18.10.2026): Zeitraum-Vorschlag, Fortschritt und Bilanz einer Aktion. Reine Funktionen, keine Oberfläche, kein Netz;
// geschrieben wird nur in aktionenAbschliessen (Bilanz nach dem Ende) – die Bildschirme zeigen nur an.
//
// Vorgabe des Eigentümers (18.10.2026): „Die Laufzeit einer Aktion muss immer variabel sein und mit dem Gastronomen besprochen werden.
// Dahinter gehören Aktionszeitraum, Warenbestand und Interesse.“ → Die App SCHLÄGT einen Zeitraum vor, begründet ihn in einem kurzen Satz
// und der Wirt bestätigt oder ändert ihn (nie automatisch, js/tafel.js aktionUebernehmen / aktionZeitraumSetzen).
//
// Drei Quellen, keine erfundenen Branchenzahlen:
//  (1) Interesse – Verkäufe der beteiligten Gerichte (js/verkauf.js) der letzten 28 Tage: Trend (letzte 14 Tage gegen die 14 davor, je Tag mit
//      Verkaufsdaten), starke Wochentage (Ø je Wochentag ab 2 Werten). Erwartete Mehrmenge = Break-even-Mehrmenge aus js/deal.js als Untergrenze
//      (so viel mehr muss die Aktion bringen, damit gleich viel Rohertrag bleibt); hat eine frühere Aktion mit denselben Gerichten mehr gebracht,
//      gilt deren Mehrmenge (Lernen: die letzte vergleichbare Bilanz).
//  (2) Warenbestand – laufender Bestand und Ø-Verbrauch (js/bestand.js) je Ware der Gerichte, dazu im Aktionszeitraum die erwartete Mehrmenge:
//      reicht die Ware, wann ist sie weg?
//  (3) Haltbarkeit (js/haltbar.js) – Abverkauf von MHD-Ware: spätestens bis zum letzten Öffnungstag vor Ablauf, „bis Ware weg“.
//      Verbrauchsdatum: NIE eine Aktion (nur der Hinweis „nicht mehr verwenden ab …“).
// Länge (Annahme der App, kein Branchenwert): 7 Tage – eine volle Woche, damit jeder Wochentag einmal vorkommt und der Vergleich „gleiche
// Wochentage vorher“ sauber ist; sinkt das Interesse (−10 % oder mehr), 14 Tage, damit sich zeigt, ob die Aktion den Rückgang dreht.
//
// Fortschritt und Bilanz vergleichen je Tag mit Verkaufsdaten seit Start den Ø desselben Wochentags in den 4 Wochen vor dem Start.
// Rohertrag = Umsatz netto (aus der Kasse; ohne Kassenumsatz: Kartenpreis, dann ≈) minus Wareneinsatz der beteiligten Gerichte.
import { kalkulation, tagPlus, wochentag } from "./engine.js";
import { bestandStand, bedarfAm } from "./bestand.js";
import { verkaeufeImZeitraum, teileVon, bedarfGericht } from "./verkauf.js";
import { haltbarStand, chargenStand, haltbarArtVon, letzterOffenTag, datumKurz, kurzName } from "./haltbar.js";
import { aktionBreakEven } from "./deal.js";
import { tagGewicht } from "./zaehler.js";
import { heuteGeschaeft, fmtEuro } from "./util.js";
import { t, artikelText } from "./i18n.js";

export const PLAN_TAGE = 7;             // Grundlänge (Annahme, s. oben)
export const PLAN_TAGE_SINKT = 14;      // bei sinkendem Interesse
export const RUECKBLICK_TAGE = 28;      // Interesse und Vergleich: 4 Wochen
export const TREND_SCHWELLE = 0.1;      // ±10 % zwischen den beiden 14-Tage-Hälften gilt als „steigt“/„sinkt“ (Annahme der App)
export const MIN_DATENTAGE = 3;         // so viele Tage mit Verkaufsdaten braucht ein Urteil (Trend je Hälfte, Fortschritt, Bilanz)
export const WT_MIN = 2;                // Ø je Wochentag ab 2 Werten
export const KNAPP_TAGE = 2;            // „reicht nur noch …“ ab 2 Öffnungstagen Rest
const HORIZONT = 90;
const EPS = 1e-9;
const r2 = (x) => Math.round(x * 100) / 100;
const artikelIndex = (stand) => Object.fromEntries((stand.artikel || []).map((a) => [a.name, a]));
const zeilenVon = (k) => new Map(k.zeilen.map((z) => [z.id, z]));
const tagVon = (iso) => heuteGeschaeft(new Date(iso));

// Gerichte einer Aktion (alle müssen da sein) und ihr Kurzname für Sätze: Kombi → „Kombi“, Abverkauf → Gerichtname
export const aktionGerichteVon = (stand, a) => (a?.gerichte || []).map((id) => (stand.gerichte || []).find((g) => g.id === id)).filter(Boolean);
export function aktionKurz(stand, a, { mehrereKombis = false } = {}) {
  const gs = aktionGerichteVon(stand, a);
  if (a.art === "kombi") return mehrereKombis && gs[0] ? t("plan.kombiMit", kurzName(gs[0].name)) : t("plan.kombi");
  return kurzName(gs[0]?.name || "");
}
const schluessel = (a) => `${a.art}|${[...(a.gerichte || [])].sort().join("|")}`;

// ---------- Verkaufsreihe ----------
// je Tag mit Verkaufsdaten (irgendein Verkauf an dem Tag): Portionen der beteiligten Gerichte, Umsatz netto, Wareneinsatz.
// Kassen-Menüs (teileVon) zählen je Bestandteil; ihr Umsatz wird wie in verkaufJeGericht nach Kartenpreis verteilt.
function reihe(stand, ids, { von, bis }, zeilen) {
  const set = new Set(ids); const tage = new Map();
  if (bis < von) return tage;
  for (const v of verkaeufeImZeitraum(stand, { von, bis }).eintraege) {
    const tag = tage.get(v.datum) || { menge: 0, netto: 0, ware: 0, ohneUmsatz: 0, wareFehlt: false, je: {} }; tage.set(v.datum, tag);
    const teile = teileVon(stand, v); if (!teile.length) continue;
    const gew = teile.map((x) => (zeilen.get(x.gericht)?.preisBrutto || 0) * x.menge); const gs = gew.reduce((s, x) => s + x, 0);
    teile.forEach((x, i) => {
      if (!set.has(x.gericht)) return;
      const z = zeilen.get(x.gericht); const n = v.menge * x.menge; tag.menge += n; tag.je[x.gericht] = (tag.je[x.gericht] || 0) + n;
      if (z && z.waren !== null) tag.ware += n * z.waren; else tag.wareFehlt = true;
      if (v.umsatzBrutto !== null && v.umsatzBrutto !== undefined) tag.netto += v.umsatzBrutto * (gs > 0 ? gew[i] / gs : 1 / teile.length) / (1 + (z?.mwst ?? 0));
      else { tag.ohneUmsatz += 1; tag.netto += n * (z?.preisNetto ?? 0); if (!(z?.preisNetto > 0)) tag.wareFehlt = true; }
    });
  }
  return tage;
}

// ---------- 1. Interesse ----------
// Rückgabe: { datenTage, schnitt (Aktions-Einheiten je Datentag), trend, aenderung, stark: [Wochentage], jeWochentag, basisAm(d) }
// Aktions-Einheit: Kombi = so viele komplette Sätze, wie das am wenigsten verkaufte Gericht hergibt (je Tag das Minimum); Abverkauf = Portionen.
export function aktionInteresse(stand, a, { heuteTag = heuteGeschaeft(), k = kalkulation(stand) } = {}) {
  const ids = a.gerichte || []; const bis = tagPlus(heuteTag, -1), von = tagPlus(heuteTag, -RUECKBLICK_TAGE);
  const r = reihe(stand, ids, { von, bis }, zeilenVon(k));
  const einheit = (tag) => (ids.length > 1 ? Math.min(...ids.map((id) => tag.je[id] || 0)) : tag.menge);
  const tage = [...r.keys()].sort(); const werte = tage.map((d) => einheit(r.get(d)));
  const schnitt = tage.length ? werte.reduce((s, x) => s + x, 0) / tage.length : null;
  const mitte = tagPlus(heuteTag, -RUECKBLICK_TAGE / 2);
  const alt = tage.filter((d) => d < mitte), neu = tage.filter((d) => d >= mitte);
  const oe = (liste) => liste.reduce((s, d) => s + einheit(r.get(d)), 0) / liste.length;
  let trend = "unbekannt", aenderung = null;
  if (alt.length >= MIN_DATENTAGE && neu.length >= MIN_DATENTAGE) {
    const x = oe(alt), y = oe(neu);
    if (x > EPS) { aenderung = y / x - 1; trend = aenderung >= TREND_SCHWELLE - EPS ? "steigt" : aenderung <= -TREND_SCHWELLE + EPS ? "sinkt" : "gleich"; }
    else if (y > EPS) { trend = "steigt"; }
    else trend = "gleich";
  }
  const jeWochentag = [0, 1, 2, 3, 4, 5, 6].map((w) => { const l = tage.filter((d) => wochentag(d) === w); return l.length >= WT_MIN ? oe(l) : null; });
  const stark = schnitt > EPS ? jeWochentag.map((x, w) => [x, w]).filter(([x]) => x !== null && x > schnitt * (1 + TREND_SCHWELLE)).sort((p, q) => q[0] - p[0]).slice(0, 2).map(([, w]) => w) : [];
  const basisAm = (d) => { if (schnitt === null) return 0; const w = jeWochentag[wochentag(d)]; return w !== null ? (tagGewicht(stand, d) > 0 ? w : 0) : schnitt * tagGewicht(stand, d); };
  return { datenTage: tage.length, schnitt, trend, aenderung, stark, jeWochentag, basisAm };
}

// ---------- 2. Ware ----------
// Waren der beteiligten Gerichte mit Menge je Aktions-Einheit (Kombi: ein Satz = je ein Gericht)
function warenJeEinheit(stand, a, idx = artikelIndex(stand)) {
  const out = new Map();
  for (const g of aktionGerichteVon(stand, a)) for (const x of bedarfGericht(g, idx).bedarf) out.set(x.name, (out.get(x.name) || 0) + x.menge);
  return out;
}
// Reichweite jeder Ware ab dem Rechenstart des Bestands mit Ø-Verbrauch plus der Mehrmenge im Zeitraum [von, bis]. Rückgabe je Ware
// { name, bestand, basis, leerAm (null = reicht über den Horizont), bekannt }, sortiert: zuerst leer.
export function aktionWare(stand, a, { heuteTag = heuteGeschaeft(), von, bis, mehr = 0, interesse, bs = bestandStand(stand, { heuteTag }) } = {}) {
  const jeEinheit = warenJeEinheit(stand, a); const out = [];
  const idx = artikelIndex(stand);
  for (const [name, q] of jeEinheit) {
    const art = idx[name]; if (!art || art.gruppe === "verpackung") continue; // Tüten und Becher entscheiden keine Aktion (Mindestbestand regelt sie)
    const w = bs.waren?.find((x) => x.name === name);
    if (!w || w.bestand === null) { out.push({ name, bestand: null, basis: w?.basis || null, leerAm: null, bekannt: false }); continue; }
    const s = { schnitt: w.schnitt || 0, jeWochentag: w.jeWochentag };
    let rest = w.bestand, leerAm = null; const start = bs.start || heuteTag;
    for (let d = start, n = 0; n < HORIZONT; d = tagPlus(d, 1), n++) {
      let bedarf = s.schnitt > 0 ? bedarfAm(stand, s, d).menge : 0;
      if (von && d >= von && (!bis || d <= bis) && interesse) bedarf += mehr * interesse.basisAm(d) * q;
      if (!(bedarf > 0)) continue;
      if (rest < bedarf - EPS) { leerAm = d; break; }
      rest -= bedarf;
    }
    out.push({ name, bestand: w.bestand, basis: w.basis, leerAm: w.bestand <= EPS ? (bs.start || heuteTag) : leerAm, bekannt: true, sicherheit: w.sicherheit, reichweite: w.reichweite });
  }
  out.sort((x, y) => (x.bekannt === y.bekannt ? 0 : x.bekannt ? -1 : 1) || String(x.leerAm || "9999").localeCompare(String(y.leerAm || "9999")) || x.name.localeCompare(y.name, "de"));
  return out;
}

// ---------- 3. Haltbarkeit ----------
// Verbrauchsdatum-Ware: die Aktion soll diese Ware loswerden (Abverkauf, oder Kombi mit Grund-Ware) → nie eine Aktion.
function verbrauchWare(stand, a, cs) {
  const idx = artikelIndex(stand);
  const namen = a.ware ? [a.ware] : a.art === "abverkauf" ? [...warenJeEinheit(stand, a).keys()] : [];
  for (const n of namen) {
    const w = cs.waren.find((x) => x.name === n);
    const mitDatum = w?.chargen.filter((c) => c.haltbar && (c.jetzt === null || c.jetzt > EPS)) || [];
    if (a.ware && idx[n] && haltbarArtVon(idx[n]) === "verbrauch" && !mitDatum.some((c) => c.haltbar.art === "mhd")) return n;
    if (mitDatum.some((c) => c.haltbar.art === "verbrauch")) return n;
  }
  return null;
}
// MHD-Grenze: die Ware, um die es geht (Abverkauf), mit dem frühesten Ablauf und Rest
function mhdGrenze(stand, a, hs) {
  const namen = a.ware ? [a.ware] : a.art === "abverkauf" ? [...warenJeEinheit(stand, a).keys()] : [];
  const k = hs.abverkauf.filter((x) => namen.includes(x.name)).sort((x, y) => x.ablauf.localeCompare(y.ablauf))[0];
  return k ? { ware: k.name, ablauf: k.ablauf, rest: k.rest, basis: k.basis } : null;
}

// ---------- Lernen ----------
// Mehrmenge der letzten vergleichbaren Aktion (gleiche Art, gleiche Gerichte, beendet, mit genug Daten) – gespeicherte Bilanz, sonst gerechnet
export function letzteBilanz(stand, a, { heuteTag = heuteGeschaeft(), k = kalkulation(stand) } = {}) {
  const sch = schluessel(a);
  const fertig = (stand.aktionen || []).filter((x) => x.id !== a.id && schluessel(x) === sch && aktionVorbei(x, heuteTag))
    .sort((x, y) => String(endeTag(y, heuteTag)).localeCompare(String(endeTag(x, heuteTag))));
  for (const x of fertig) { const b = x.bilanz || aktionBilanz(stand, x, { heuteTag, k }); if (b && b.vergleichbar >= MIN_DATENTAGE && b.mehrAnteil !== null) return { aktion: x.id, mehrAnteil: b.mehrAnteil, bis: b.bis }; }
  return null;
}
export const aktionVorbei = (a, heuteTag = heuteGeschaeft()) => !!a.entfernt || (!!a.bis && a.bis < heuteTag);
// letzter Tag der Aktion: beendet → Geschäftstag des Beendens (höchstens bis), sonst bis (bei „bis Ware weg“ ohne Datum: heute)
export function endeTag(a, heuteTag = heuteGeschaeft()) {
  const e = a.entfernt && a.entferntZeit ? tagVon(a.entferntZeit) : null;
  const b = a.bis || heuteTag;
  return e && e < b ? e : b;
}

// ---------- Vorschlag ----------
// aktion: { art, gerichte, preis, ware? } (Entwurf aus „Aktionen & Haltbarkeit“ oder eine gespeicherte Aktion).
// Rückgabe: { moeglich, grund?, von, bis, ende, tage, erwartung: { mehrAnteil, quelle, breakEven, gelernt }, interesse, ware, haltbar, gruende, satz }
export function aktionVorschlag(stand, aktion, { heuteTag = heuteGeschaeft(), k = kalkulation(stand), bs = bestandStand(stand, { heuteTag }), hs = haltbarStand(stand, { heuteTag }) } = {}) {
  const a = { art: aktion?.art === "abverkauf" ? "abverkauf" : "kombi", gerichte: aktion?.gerichte || [], preis: aktion?.preis, ware: aktion?.ware || null, id: aktion?.id };
  const nein = (grund, extra = {}) => ({ moeglich: false, grund, ...extra, satz: t("plan.nie." + grund, ...(extra.ware ? [artikelText(extra.ware)] : [])) });
  if (aktionGerichteVon(stand, a).length !== a.gerichte.length || !a.gerichte.length) return nein("gericht");
  const vw = verbrauchWare(stand, a, chargenStand(stand, { heuteTag, bs }));
  if (vw) return nein("verbrauch", { ware: vw });
  const be = aktionBreakEven(stand, a.gerichte, a.preis, { k });
  if (!be) return nein("gericht");
  if (be.lohntNie) return nein("lohnt");
  // Start: ab sofort (heute), an einem Ruhetag der nächste Öffnungstag
  let von = heuteTag; for (let i = 0; i < 7 && tagGewicht(stand, von) <= 0; i++) von = tagPlus(von, 1);
  const interesse = aktionInteresse(stand, a, { heuteTag, k });
  const gelernt = letzteBilanz(stand, a, { heuteTag, k });
  const mehr = Math.max(be.mehrAnteil, gelernt ? gelernt.mehrAnteil : 0);
  const erwartung = { mehrAnteil: mehr, quelle: gelernt && gelernt.mehrAnteil > be.mehrAnteil + EPS ? "gelernt" : "breakEven", breakEven: be.mehrAnteil, gelernt: gelernt ? gelernt.mehrAnteil : null };
  const tage = interesse.trend === "sinkt" ? PLAN_TAGE_SINKT : PLAN_TAGE;
  let bis = tagPlus(von, tage - 1), ende = "datum";
  const mhd = mhdGrenze(stand, a, hs); let haltbar = null;
  if (mhd) { const grenze = letzterOffenTag(stand, heuteTag, mhd.ablauf); haltbar = { ...mhd, bis: grenze }; if (a.art === "abverkauf") { bis = grenze; ende = "ware"; } else if (grenze < bis) bis = grenze; }
  if (bis < von) bis = von;
  const waren = aktionWare(stand, a, { heuteTag, von, bis, mehr, interesse, bs });
  const knapp = waren.find((w) => w.bekannt) || null; const unbekannt = !waren.some((w) => w.bekannt) && waren.length > 0;
  if (knapp && knapp.leerAm && knapp.leerAm <= heuteTag && knapp.bestand <= EPS) return nein("leer", { ware: knapp.name });
  const ware = knapp ? { name: knapp.name, leerAm: knapp.leerAm, reicht: !knapp.leerAm || knapp.leerAm > bis, bestand: knapp.bestand, basis: knapp.basis } : null;
  if (a.art === "abverkauf" && ware && ware.leerAm && ware.leerAm <= bis) bis = ware.leerAm < von ? von : ware.leerAm; // bis Ware weg: längstens bis zum erwarteten letzten Tag
  // Abverkauf: wird der Rest mit Datum (FIFO, js/haltbar.js) bei der erwarteten Mehrmenge bis zum Ablauf verkauft? An welchem Tag ist er weg?
  let rest = null;
  if (a.art === "abverkauf" && haltbar && haltbar.rest > EPS) {
    const q = warenJeEinheit(stand, a).get(haltbar.ware) || 0;
    if (q > EPS) { let kum = 0, weg = null; for (let d = von; d <= haltbar.bis; d = tagPlus(d, 1)) { kum += mehr * interesse.basisAm(d) * q; if (kum >= haltbar.rest - EPS) { weg = d; break; } }
      rest = { ware: haltbar.ware, weg, bleibt: weg ? 0 : Math.ceil((haltbar.rest - kum) / q - EPS) }; if (weg && weg < bis) bis = weg; }
  }
  // Begründung: ein kurzer Satz aus den drei Quellen
  const gruende = [];
  if (rest) gruende.push({ quelle: "ware", text: rest.weg ? t("plan.ware.restWeg", artikelText(rest.ware), datumKurz(rest.weg)) : t("plan.ware.restBleibt", artikelText(rest.ware), rest.bleibt) });
  else if (unbekannt) gruende.push({ quelle: "ware", text: t("plan.ware.unbekannt") });
  else if (ware) gruende.push({ quelle: "ware", text: !ware.leerAm ? t("plan.ware.genug", artikelText(ware.name)) : ware.reicht ? t("plan.ware.reicht", artikelText(ware.name), datumKurz(tagPlus(ware.leerAm, -1)))
    : a.art === "abverkauf" ? t("plan.ware.weg", artikelText(ware.name), datumKurz(ware.leerAm)) : t("plan.ware.knapp", artikelText(ware.name), datumKurz(ware.leerAm)) });
  if (haltbar) gruende.push({ quelle: "haltbar", text: t("plan.mhd", artikelText(haltbar.ware), datumKurz(haltbar.ablauf)) });
  const wt = t("aktionen.wt"); const stark = [...interesse.stark].sort((x, y) => ((x + 6) % 7) - ((y + 6) % 7)).map((w) => (Array.isArray(wt) ? wt[w] : String(w))).join(", ");
  gruende.push({ quelle: "interesse", text: interesse.trend === "unbekannt" ? t("plan.trend.unbekannt") : t("plan.trend." + interesse.trend) + (stark ? ", " + t("plan.stark", stark) : "") });
  const p = (x) => Math.round(x * 100);
  gruende.push({ quelle: "erwartung", text: erwartung.quelle === "gelernt" ? t("plan.gelernt", p(erwartung.gelernt)) : gelernt ? t("plan.gelerntWenig", p(gelernt.mehrAnteil), p(be.mehrAnteil)) : t("plan.mehr", p(be.mehrAnteil)) });
  const n = Math.round((Date.parse(bis + "T12:00:00Z") - Date.parse(von + "T12:00:00Z")) / 86400e3) + 1;
  const kopf = ende === "ware" ? t("plan.kopfWare", datumKurz(bis)) : t("plan.kopf", n);
  return { moeglich: true, von, bis, ende, tage: n, erwartung, breakEven: be, interesse: { datenTage: interesse.datenTage, schnitt: interesse.schnitt, trend: interesse.trend, aenderung: interesse.aenderung, stark: interesse.stark },
    ware, haltbar, rest, warenListe: waren, gruende, satz: `${kopf}: ${gruende.map((g) => g.text).join(" · ")}` };
}

// ---------- Vergleich (Fortschritt und Bilanz) ----------
// von..bis (Geschäftstage): je Tag mit Verkaufsdaten die beteiligten Gerichte gegen den Ø desselben Wochentags in den 4 Wochen vor `von`.
export function aktionVergleich(stand, a, { von = a.von, bis, k = kalkulation(stand) } = {}) {
  const ids = a.gerichte || []; const zeilen = zeilenVon(k);
  const akt = reihe(stand, ids, { von, bis }, zeilen);
  const vor = reihe(stand, ids, { von: tagPlus(von, -RUECKBLICK_TAGE), bis: tagPlus(von, -1) }, zeilen);
  const jeWt = new Map(); for (const [d, x] of vor) { const w = wochentag(d); const l = jeWt.get(w) || []; l.push(x); jeWt.set(w, l); }
  let verkauft = 0, vorher = 0, roh = 0, rohVor = 0, vergleichbar = 0, gesamt = 0, rohGesamt = 0, geschaetzt = false, fehlt = false;
  for (const d of [...akt.keys()].sort()) {
    const x = akt.get(d); gesamt += x.menge; rohGesamt += x.netto - x.ware; if (x.ohneUmsatz) geschaetzt = true; if (x.wareFehlt) fehlt = true;
    const l = jeWt.get(wochentag(d)); if (!l?.length) continue;
    vergleichbar += 1; verkauft += x.menge; roh += x.netto - x.ware;
    vorher += l.reduce((s, y) => s + y.menge, 0) / l.length; rohVor += l.reduce((s, y) => s + y.netto - y.ware, 0) / l.length;
    if (l.some((y) => y.ohneUmsatz)) geschaetzt = true; if (l.some((y) => y.wareFehlt)) fehlt = true;
  }
  if ([...ids].some((id) => zeilen.get(id)?.warenGeschaetzt)) geschaetzt = true;
  return { von, bis, tage: akt.size, vergleichbar, verkauft: r2(verkauft), vorher: r2(vorher), mehrAnteil: vorher > EPS ? verkauft / vorher - 1 : null,
    rohertrag: fehlt ? null : r2(roh), rohertragVorher: fehlt ? null : r2(rohVor), verkauftGesamt: r2(gesamt), rohertragGesamt: fehlt ? null : r2(rohGesamt), geschaetzt };
}

// Laufende Aktion: Vergleich seit Start, Restbestand und „reicht bis“ der knappsten Ware, Urteil (zuFrueh | gut | weniger | wareWeg).
// gut/weniger: mit Rohertrag – bleibt mindestens so viel wie vorher an gleichen Wochentagen; ohne rechenbaren Rohertrag – Mehrverkauf
// mindestens die Break-even-Mehrmenge.
export function aktionFortschritt(stand, a, { heuteTag = heuteGeschaeft(), k = kalkulation(stand), bs = bestandStand(stand, { heuteTag }) } = {}) {
  const bis = a.bis && a.bis < heuteTag ? a.bis : heuteTag;
  const v = a.von <= bis ? aktionVergleich(stand, a, { von: a.von, bis, k }) : null;
  const waren = aktionWare(stand, a, { heuteTag, bs });
  const knapp = waren.find((w) => w.bekannt) || null;
  const offeneTage = (leerAm) => { if (!leerAm) return null; let n = 0; for (let d = bs.start || heuteTag; d < leerAm; d = tagPlus(d, 1)) if (tagGewicht(stand, d) > 0) n += 1; return n; };
  const ware = knapp ? { name: knapp.name, bestand: knapp.bestand, basis: knapp.basis, leerAm: knapp.leerAm, tage: offeneTage(knapp.leerAm), reichtBis: knapp.leerAm ? tagPlus(knapp.leerAm, -1) : null } : null;
  const be = aktionBreakEven(stand, a.gerichte, a.preis, { k });
  let status = "zuFrueh";
  if (ware && ware.bestand !== null && ware.bestand <= EPS) status = "wareWeg";
  else if (v && v.vergleichbar >= MIN_DATENTAGE) {
    const gut = v.rohertrag !== null ? v.rohertrag >= v.rohertragVorher - EPS : be?.mehrAnteil !== null && be?.mehrAnteil !== undefined && v.mehrAnteil !== null && v.mehrAnteil >= be.mehrAnteil - EPS;
    status = gut ? "gut" : "weniger";
  }
  return { id: a.id, gestartet: a.von <= heuteTag, vergleich: v, ware, status, breakEven: be?.mehrAnteil ?? null };
}

// Bilanz nach dem Ende: Vergleich über den ganzen Zeitraum (gespeichert von aktionenAbschliessen, damit spätere Vorschläge lernen)
export function aktionBilanz(stand, a, { heuteTag = heuteGeschaeft(), k = kalkulation(stand), jetzt = null } = {}) {
  const bis = endeTag(a, heuteTag); if (bis < a.von) return { von: a.von, bis, tage: 0, vergleichbar: 0, verkauft: 0, vorher: 0, mehrAnteil: null, rohertrag: null, rohertragVorher: null, geschaetzt: false, erstellt: jetzt };
  const v = aktionVergleich(stand, a, { von: a.von, bis, k });
  return { von: a.von, bis, tage: v.tage, vergleichbar: v.vergleichbar, verkauft: v.verkauft, vorher: v.vorher, mehrAnteil: v.mehrAnteil === null ? null : Math.round(v.mehrAnteil * 10000) / 10000,
    rohertrag: v.rohertrag, rohertragVorher: v.rohertragVorher, geschaetzt: v.geschaetzt, erstellt: jetzt };
}
// Schreibt die Bilanz an jede beendete oder abgelaufene Aktion ohne Bilanz (als NEUES Objekt). Rückgabe: Zahl der neuen Bilanzen.
// Aufruf beim Betreten von „Aktionen & Haltbarkeit“ und „Menütafel“ (app.js) und beim Beenden (js/tafel.js) – nie beim Zeichnen.
export function aktionenAbschliessen(stand, { heuteTag = heuteGeschaeft(), jetzt = new Date().toISOString(), k = null } = {}) {
  let n = 0;
  stand.aktionen = (stand.aktionen || []).map((a) => {
    if (a.bilanz || !aktionVorbei(a, heuteTag)) return a;
    k ??= kalkulation(stand); n += 1;
    return { ...a, bilanz: aktionBilanz(stand, a, { heuteTag, k, jetzt }) };
  });
  return n;
}

// ---------- Texte ----------
const euro = (x, ca) => (ca ? "≈ " : "") + fmtEuro(x, { dezimal: 2 });
const zahl = (x) => String(Math.round(x));
// Zeilen für die Karte einer laufenden Aktion (Büro): verkauft vs. vorher, Rohertrag, Ware – kurz, in der Sprache der App
export function fortschrittZeilen(f) {
  const z = []; const v = f.vergleich;
  if (!f.gestartet) return [t("plan.fort.kommt")];
  if (!v || !v.tage) z.push(t("plan.fort.ohneDaten"));
  else if (v.vergleichbar < MIN_DATENTAGE) z.push(t("plan.fort.zuFrueh", v.tage));
  else z.push(t("plan.fort.verkauft", zahl(v.verkauft), zahl(v.vorher)));
  if (v && v.rohertragGesamt !== null && v.tage) z.push(t("plan.fort.rohertrag", euro(v.rohertragGesamt, v.geschaetzt), v.vergleichbar >= MIN_DATENTAGE && v.rohertragVorher !== null ? euro(v.rohertragVorher, true) : "–"));
  if (f.ware) z.push(f.status === "wareWeg" ? t("plan.fort.wareWeg", artikelText(f.ware.name)) : f.ware.leerAm ? t("plan.fort.ware", artikelText(f.ware.name), datumKurz(f.ware.reichtBis), f.ware.tage) : t("plan.fort.wareGenug", artikelText(f.ware.name)));
  return z;
}
// Zeitraum in Worten: „Mo 19.10. – So 25.10.“, „ab Mo 19.10., bis die Ware weg ist (, längstens …)“
export const aktionZeitraumText = (a) => (a.ende === "ware" ? (a.bis ? t("plan.zeitraumWareBis", datumKurz(a.von), datumKurz(a.bis)) : t("plan.zeitraumWare", datumKurz(a.von))) : t("plan.zeitraum", datumKurz(a.von), datumKurz(a.bis)));
export function bilanzText(b) {
  if (!b || b.vergleichbar < MIN_DATENTAGE || b.mehrAnteil === null) return t("plan.bilanzOhne");
  const p = Math.round(b.mehrAnteil * 100);
  return t("plan.bilanz", (p >= 0 ? "+" : "−") + Math.abs(p), b.rohertrag !== null ? euro(b.rohertrag, b.geschaetzt) : "–", b.rohertragVorher !== null ? euro(b.rohertragVorher, true) : "–");
}

// „Die Uhrzeit“: höchstens EIN Satz für den Büro-Hinweis zu laufenden Aktionen. Reihenfolge: Ware weg → bringt weniger → Ware knapp → läuft gut.
export function aktionUhrzeit(stand, { heuteTag = heuteGeschaeft() } = {}) {
  const laufend = (stand.aktionen || []).filter((a) => !a.entfernt && a.von <= heuteTag && (!a.bis || a.bis >= heuteTag) && aktionGerichteVon(stand, a).length === (a.gerichte || []).length && a.preis > 0);
  if (!laufend.length) return null;
  const k = kalkulation(stand); const bs = bestandStand(stand, { heuteTag });
  const kombis = laufend.filter((a) => a.art === "kombi").length;
  const liste = laufend.map((a) => ({ a, f: aktionFortschritt(stand, a, { heuteTag, k, bs }), name: aktionKurz(stand, a, { mehrereKombis: kombis > 1 }) }));
  const ziel = { aktion: "nav", wert: "aktionen" }; const knopf = t("plan.uhr.knopf");
  const satz = (ton, text, art, id) => ({ id: "aktion", art, ton, text, knopf, ziel, aktion: id });
  const weg = liste.find((x) => x.f.status === "wareWeg"); if (weg) return satz("rot", t("plan.uhr.wareWeg", weg.name, artikelText(weg.f.ware.name)), "wareWeg", weg.a.id);
  const wenig = liste.find((x) => x.f.status === "weniger"); if (wenig) return satz("gelb", t("plan.uhr.weniger", wenig.name), "weniger", wenig.a.id);
  const knapp = liste.find((x) => x.f.ware?.tage !== null && x.f.ware?.tage !== undefined && x.f.ware.tage <= KNAPP_TAGE && (!x.a.bis || x.f.ware.leerAm <= x.a.bis));
  if (knapp) return satz("gelb", t("plan.uhr.knapp", knapp.name, artikelText(knapp.f.ware.name), knapp.f.ware.tage), "knapp", knapp.a.id);
  const gut = liste.find((x) => x.f.status === "gut");
  if (gut) return satz("gelb", gut.f.ware?.tage ? t("plan.uhr.gut", gut.name, artikelText(gut.f.ware.name), gut.f.ware.tage) : t("plan.uhr.gutOhne", gut.name), "gut", gut.a.id);
  return null;
}
