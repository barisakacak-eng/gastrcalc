// Welle 2 „Ware und Schwund“ (Masterauftrag „Gehirn“ 2.1–2.7, 28.10.2026). Reine Rechnungen, keine Oberfläche.
// Grundlage sind vorhandene Bausteine: Rezept-Bedarf (verkauf.bedarfGericht), Preise je Basis (engine.preisJeBasis), Mengen im Monat
// (engine.mengenJeMonat), Müll-Journal (stand.schwund), Belege (stand.lieferungen), Bestellvorschlag (bestand.bestellVorschlag).
// Euro-Zahlen sind Schätzungen (≈), sobald Mengen, Garverlust oder Preise geschätzt sind – jede Funktion liefert dafür „geschaetzt“.
import { mengenJeMonat, preisJeBasis, preisGeschaetzt, mengeInArtikelBasis, rohmengeFuer, garverlustAnteil, eintragWert, SCHWUND_ARTEN, zwischenpreis } from "./engine.js";
import { bedarfGericht, sollVerbrauch } from "./verkauf.js";
import { EINHEITEN, inBasis } from "./data/katalog.js";

const idxVon = (stand) => Object.fromEntries((stand.artikel || []).map((a) => [a.name, a]));
const minusTage = (datum, n) => new Date(Date.parse(datum + "T12:00:00Z") - n * 864e5).toISOString().slice(0, 10);
export const WOCHEN_JE_MONAT = 52 / 12;

// ---------- 2.1 Portion in Euro ----------
// Abweichung je Portion (gewogen − Rezept, in der Einheit des Rezepts) → Rohmenge (Garverlust) × Preis je Basis.
// Im Jahr = je Portion × Menge im Monat × 12. Positiv = du gibst mehr als im Rezept.
export function portionEuro(stand, gerichtId, zutatName, istMenge) {
  const g = (stand.gerichte || []).find((x) => x.id === gerichtId); if (!g) return null;
  const z = (g.zutaten || []).find((x) => x.name === zutatName); const a = idxVon(stand)[zutatName];
  if (!z || !a || !(Number(z.menge) > 0) || !(Number(istMenge) >= 0)) return null;
  const pj = preisJeBasis(a); if (pj === null) return null;
  const diff = Number(istMenge) - Number(z.menge);
  const mB = mengeInArtikelBasis(Math.abs(diff), z.einheit, a); if (mB === null) return null;
  const gv = garverlustAnteil(a); const roh = rohmengeFuer(mB, gv.wert); if (roh === null) return null;
  const jePortion = Math.sign(diff) * roh * pj;
  const { mengen, geschaetzt } = mengenJeMonat(stand); const monat = mengen[gerichtId] || 0;
  return { diff, einheit: z.einheit, jePortion, jahr: jePortion * monat * 12, mengeMonat: monat, geschaetzt: geschaetzt || gv.status === "geschaetzt" || preisGeschaetzt(a) };
}

// ---------- 2.2 Spieß-Bilanz ----------
// Eingaben je Spieß: Rohgewicht (kg), Preis je kg (netto), Rest am Ende (kg), verkaufte Portionen (≈).
// Kosten = Roh × Preis; je Portion = Kosten ÷ Portionen (der Rest ist darin enthalten: er wurde bezahlt, aber nicht verkauft);
// Rest in Euro = Rest × Preis je kg (Rohpreis, ≈ – gegart ist es mehr wert, das weiß die App nicht); Gramm je Portion = (Roh − Rest) ÷ Portionen (roh gerechnet).
// Garverlust wird nie fest vorgegeben, nur aus diesen eigenen Werten.
export function spiessBilanz({ rohKg, preisKg, restKg = 0, portionen }) {
  const r = Number(rohKg), p = Number(preisKg), rest = Math.max(0, Number(restKg) || 0), n = Number(portionen);
  if (!(r > 0) || !(p > 0) || !(n > 0) || rest >= r) return null;
  const kosten = r * p;
  return { kosten, jePortion: kosten / n, restEuro: rest * p, restAnteil: rest / r, grammJePortion: (r - rest) * 1000 / n, portionen: n };
}
// Vergleich zweier Spieße (oder Lieferanten): Unterschied je Portion und bei gleicher Portionszahl im Monat
export function spiessVergleich(a, b, portionenMonat = 0) {
  const x = spiessBilanz(a), y = spiessBilanz(b); if (!x || !y) return null;
  const d = y.jePortion - x.jePortion;
  return { a: x, b: y, jePortion: d, monat: d * (Number(portionenMonat) || 0), guenstiger: d > 0 ? "a" : d < 0 ? "b" : null };
}

// ---------- 2.3 A-Artikel für die Wochenzählung ----------
// Die 5–8 teuersten Zutaten nach Wert im Wochenverbrauch (Rezept × Menge). Setzung: höchstens 8, und so viele, bis ≈ 80 % des Wertes erfasst sind.
export const A_MIN = 5, A_MAX = 8, A_ANTEIL = 0.8; // Setzung 28.10.2026 (ABC-Analyse: wenige Artikel tragen den Großteil des Wertes)
export function aArtikel(stand) {
  const { mengen, geschaetzt } = mengenJeMonat(stand);
  const woche = Object.fromEntries(Object.entries(mengen).map(([k, v]) => [k, v / WOCHEN_JE_MONAT]));
  const liste = Object.values(sollVerbrauch(stand, woche).artikel).filter((x) => x.wert > 0).sort((a, b) => b.wert - a.wert);
  const summe = liste.reduce((s, x) => s + x.wert, 0); const out = []; let bisher = 0;
  for (const x of liste) { if (out.length >= A_MAX || (out.length >= A_MIN && bisher >= A_ANTEIL * summe)) break; out.push({ name: x.name, basis: x.basis, menge: x.menge, wert: x.wert, geschaetzt: geschaetzt || x.geschaetzt }); bisher += x.wert; }
  return { artikel: out, anteil: summe > 0 ? bisher / summe : 0, summe, geschaetzt };
}

// ---------- 2.4 Müll-Rangliste in Euro ----------
// Woche (7 Tage bis einschließlich datum) nach Gruppe. Gericht-Einträge werden nach dem Warenwert ihrer Zutaten auf die Gruppen verteilt.
export const MUELL_GRUPPEN = { fleisch: "fleisch", fisch: "fleisch", teig: "brot", gemuese: "salat", sauce: "sosse" }; // Rest → „sonstiges“
const gruppeVon = (a) => MUELL_GRUPPEN[a?.gruppe] || "sonstiges";
export function muellRangliste(stand, datum) {
  const von = minusTage(datum, 6); const idx = idxVon(stand); const gr = { fleisch: 0, brot: 0, salat: 0, sosse: 0, sonstiges: 0 }; let summe = 0, ohneWert = 0;
  for (const e of stand.schwund || []) {
    if (!e || e.storniert || (SCHWUND_ARTEN[e.art] || 1) !== 1 || typeof e.datum !== "string" || e.datum < von || e.datum > datum) continue;
    const w = eintragWert(e, stand); if (w === null) { ohneWert += 1; continue; }
    summe += w;
    if (e.ref?.typ === "artikel") { gr[gruppeVon(idx[e.ref.name])] += w; continue; }
    const g = e.ref?.typ === "gericht" ? (stand.gerichte || []).find((x) => x.id === e.ref.id) : null;
    const teile = g ? bedarfGericht(g, idx).bedarf.map((b) => ({ gr: gruppeVon(idx[b.name]), wert: (preisJeBasis(idx[b.name] || {}) || 0) * b.menge })) : [];
    const tsum = teile.reduce((s, x) => s + x.wert, 0);
    if (!(tsum > 0)) { gr.sonstiges += w; continue; }
    for (const x of teile) gr[x.gr] += w * x.wert / tsum;
  }
  const rang = Object.entries(gr).filter(([, v]) => v > 0.005).map(([gruppe, wert]) => ({ gruppe, wert })).sort((a, b) => b.wert - a.wert);
  return { von, bis: datum, summe, rang, groesste: rang[0] || null, ohneWert };
}
// Gericht mit regelmäßig viel „übrig“ (nicht verkauft): Anteil weggeworfen ÷ (verkauft/geschätzt + weggeworfen) über 14 Tage über UEBRIG_AB
export const UEBRIG_AB = 0.15, UEBRIG_TAGE = 14, UEBRIG_MIN_TAGE = 3; // Setzung (Masterauftrag 2.4: > 15 %), mindestens an 3 Tagen
export function zuVielVorbereitet(stand, datum) {
  const von = minusTage(datum, UEBRIG_TAGE - 1); const { mengen } = mengenJeMonat(stand); const tageMonat = (Number(stand.betrieb?.tageProWoche) || 6) * WOCHEN_JE_MONAT;
  const je = new Map();
  for (const e of stand.schwund || []) {
    if (!e || e.storniert || !["nichtverkauft", "gericht"].includes(e.art) || e.ref?.typ !== "gericht" || e.datum < von || e.datum > datum) continue;
    const x = je.get(e.ref.id) || { menge: 0, tage: new Set() }; x.menge += Number(e.menge) || 0; x.tage.add(e.datum); je.set(e.ref.id, x);
  }
  const out = [];
  for (const [id, x] of je) {
    if (x.tage.size < UEBRIG_MIN_TAGE) continue;
    const verkauft = (mengen[id] || 0) / tageMonat * x.tage.size; const anteil = x.menge / (verkauft + x.menge);
    if (anteil > UEBRIG_AB) out.push({ id, name: (stand.gerichte || []).find((g) => g.id === id)?.name || "", anteil, tage: x.tage.size });
  }
  return out.sort((a, b) => b.anteil - a.anteil);
}

// ---------- 2.5 Lieferantenvergleich aus eigenen Belegen ----------
// Je Ware und Lieferant der letzte Preis je Basiseinheit (netto ÷ (Menge × Inhalt)). Nur gleiche Basis (kg/l/Stück) und gleicher Packungsinhalt
// (± LIEFERANT_INHALT_TOLERANZ) werden verglichen, sonst kein Sieger. Ersparnis im Jahr = Preisunterschied × Jahresverbrauch laut Rezept.
export const LIEFERANT_INHALT_TOLERANZ = 0.1; // Setzung 28.10.2026: Packungsgröße darf um 10 % abweichen
export function lieferantenVergleich(stand) {
  const je = new Map(); // ware → lieferant → { preis, inhalt, basis, datum }
  for (const l of [...(stand.lieferungen || [])].filter((x) => !x.storniert).sort((a, b) => (a.datum < b.datum ? -1 : 1))) {
    if (!l.lieferant) continue;
    for (const z of l.zeilen || []) {
      const ware = z.artikel; if (!ware || !(z.netto > 0) || !(z.menge > 0) || !(z.inhaltMenge > 0) || !z.inhaltEinheit) continue;
      const inhalt = inBasis(z.inhaltMenge, z.inhaltEinheit); const basis = EINHEITEN[z.inhaltEinheit]?.basis; if (!(inhalt > 0) || !basis) continue;
      const m = je.get(ware) || new Map(); m.set(l.lieferant, { lieferant: l.lieferant, preis: z.netto / (z.menge * inhalt), inhalt, basis, datum: l.datum }); je.set(ware, m);
    }
  }
  const { mengen, geschaetzt } = mengenJeMonat(stand); const verbrauch = sollVerbrauch(stand, mengen).artikel;
  const out = [];
  for (const [ware, m] of je) {
    const ls = [...m.values()]; if (ls.length < 2) continue;
    ls.sort((a, b) => a.preis - b.preis); const g = ls[0], t = ls[ls.length - 1];
    const vergleichbar = g.basis === t.basis && Math.abs(g.inhalt - t.inhalt) <= LIEFERANT_INHALT_TOLERANZ * Math.max(g.inhalt, t.inhalt);
    const jahr = vergleichbar ? (t.preis - g.preis) * (verbrauch[ware]?.menge || 0) * 12 : null;
    out.push({ ware, guenstig: g, teuer: t, vergleichbar, jahr, geschaetzt });
  }
  return out.sort((a, b) => (b.jahr ?? -1) - (a.jahr ?? -1));
}

// ---------- 2.6 Selbst machen oder kaufen ----------
// Selbstgemachtes Teil (artikel.herkunft "selbst" mit Rezept): Material + Arbeit (Minuten × Minutensatz) je Basis gegen Zukaufpreis je Basis
// (artikel.rezept.zukaufPreis, netto je kg/l/Stück, vom Wirt eingetragen). Im Jahr = Unterschied × Jahresverbrauch laut Rezept.
export function selbstOderKaufen(stand, name, minutensatz) {
  const idx = idxVon(stand); const a = idx[name]; const zk = Number(a?.rezept?.zukaufPreis);
  if (!a || a.herkunft !== "selbst" || !(zk > 0)) return null;
  const zp = zwischenpreis(a, idx, typeof minutensatz === "number" ? minutensatz : null); if (zp.preis === null) return null;
  const aus = inBasis(a.rezept.ausbeute.menge, a.rezept.ausbeute.einheit); if (!(aus > 0)) return null;
  const selbstJe = (zp.preis + (zp.arbeitGeld || 0)) / aus;
  const zukaufJe = zk / (EINHEITEN[a.rezept.ausbeute.einheit]?.basis === "g" || EINHEITEN[a.rezept.ausbeute.einheit]?.basis === "ml" ? 1000 : 1); // Zukaufpreis je kg/l → je g/ml
  const { mengen, geschaetzt } = mengenJeMonat(stand);
  // Verbrauch des Teils selbst (sollVerbrauch löst Selbstgemachtes in Rohware auf): Σ Rezeptmenge × Portionen im Monat
  let v = 0; for (const g of stand.gerichte || []) for (const z of g.zutaten || []) if (z.name === name) { const m = mengeInArtikelBasis(z.menge, z.einheit, a); if (m > 0) v += m * (mengen[g.id] || 0); }
  return { selbstJe, zukaufJe, ohneArbeit: zp.arbeitGeld === null, jahr: (zukaufJe - selbstJe) * v * 12, besser: selbstJe <= zukaufJe ? "selbst" : "kaufen", geschaetzt: geschaetzt || !!zp.richtpreis };
}

// ---------- 2.7 Einkauf nächste Woche ----------
// Summe des Bestellvorschlags (bestand.bestellVorschlag) für Waren, die in den nächsten 7 Tagen zu bestellen sind.
export function einkaufNaechsteWoche(vorschlag) {
  if (!vorschlag?.zeilen) return null; const bis = minusTage(vorschlag.heute, -7);
  const z = vorschlag.zeilen.filter((x) => x.bestellenAm && x.bestellenAm <= bis);
  return { summe: z.reduce((s, x) => s + (x.wert || 0), 0), ohneWert: z.filter((x) => x.wert === null).length, anzahl: z.length, geschaetzt: z.some((x) => x.geschaetzt) };
}

// ---------- 2.3 Wochenzählung: Soll-Ist in Euro ----------
// Eine Wochenzählung ist eine kleine Zählung NUR der A-Artikel, vor Öffnung (zeitpunkt "vor"): { id, datum, zeitpunkt, posten: { name: Gebinde } }.
// Sie liegt in stand.wochenZaehlungen und zählt NICHT als Inventur (kein Einfluss auf Bestand, Wareneinsatz, Steuer).
// Soll-Ist wie die Inventur (verkauf.abgleichInventur): Ist = Anfang + Einkauf − Ende, erwartet = Rezept × Verkäufe + Müll + Personalessen.
// Abweichung in Prozentpunkten des erwarteten Verbrauchs: unter WOCHE_RUHIG ruhig, ab WOCHE_MELDEN melden (Setzung nach Anbieterwerten 2026, Recherchebericht).
export const WOCHE_RUHIG = 1.5, WOCHE_MELDEN = 3; // Setzung (Masterauftrag 2.3)
export function wochenSollIst(stand, jetzt, vorher, abgleich) {
  if (!jetzt || !vorher) return null;
  const r = abgleich(stand, { ...jetzt, abgeschlossen: jetzt.abgeschlossen || jetzt.datum + "T08:00:00" }, { ...vorher, abgeschlossen: vorher.abgeschlossen || vorher.datum + "T08:00:00" });
  if (!r || r.gleicherTag) return r;
  const namen = new Set(Object.keys(jetzt.posten || {}));
  const zeilen = r.zeilen.filter((z) => namen.has(z.name)).map((z) => {
    const punkte = z.diff !== null && z.erwartet > 0 ? z.diff / z.erwartet * 100 : null;
    const ampel = !r.verkaufTage ? "ohneVerkauf" : z.status === "nichtGezaehlt" || z.status === "unklar" ? z.status : punkte === null ? "unklar" : punkte >= WOCHE_MELDEN ? "melden" : punkte >= WOCHE_RUHIG ? "beobachten" : "ruhig";
    return { ...z, punkte, ampel };
  });
  const melden = zeilen.filter((z) => z.ampel === "melden");
  return { von: r.von, bis: r.bis, zeilen, melden, wert: melden.reduce((s, z) => s + (z.diffWert || 0), 0), verkaufTage: r.verkaufTage, geschaetzt: zeilen.some((z) => z.geschaetzt) };
}

// Hauptzutat eines Gerichts für den Portions-Check: die Zutat mit dem größten Warenwert (meist Fleisch)
export function hauptZutat(stand, g) {
  const idx = idxVon(stand); let best = null;
  for (const z of g?.zutaten || []) {
    const a = idx[z.name]; const pj = a ? preisJeBasis(a) : null; const m = a ? mengeInArtikelBasis(z.menge, z.einheit, a) : null;
    if (pj === null || !(m > 0) || !["g", "ml"].includes(z.einheit)) continue;
    const w = pj * m; if (!best || w > best.wert) best = { name: z.name, menge: Number(z.menge), einheit: z.einheit, wert: w };
  }
  return best;
}
export const wochenZaehlungen = (stand) => (stand.wochenZaehlungen || []).filter((w) => w && !w.verworfen).sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0));
