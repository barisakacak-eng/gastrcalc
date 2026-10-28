// Rezepte: woher kommt jede Menge? (Etappe 6, Punkt 7 – Baris 14.10.2026, 17:41)
// Stufen je Zutatenmenge: schaetzung (gelb, ≈) · pilot (ein echter Betrieb) · branche (Beleg, mindestens 2 Gastro-Quellen) · eigen (grün, gewogen).
// „eigen-abgeleitet": vom Wirt an einem Gericht gewogen und auf die Familie übertragen (grün mit ~).
// Regeln: Geschätztes ist nie grün. Eigene Werte überschreibt die App nie. Nichts ändert sich still.
import { PRODUKT_INDEX } from "./data/katalog.js";
import { GRUNDREZEPTE } from "./rezept_baukasten.js";
import { preisJeBasis } from "./engine.js";
import { inBasis } from "./data/katalog.js";
import { heute } from "./util.js";

export const RANG = { schaetzung: 1, pilot: 2, branche: 3, "eigen-abgeleitet": 4, eigen: 5 };
const HAUPT_GRUPPEN = ["fleisch", "fisch", "kaese", "teig"];
const PRIO = { fleisch: 0, fisch: 0, kaese: 1, teig: 2 };

// Quelle einer Menge: eigener Eintrag an der Zutat, sonst aus dem Rezept (Baukasten/Vorlage = Schätzung, vom Wirt angelegt = eigen)
export function quelleVon(z, gericht) {
  if (z?.quelle && RANG[z.quelle]) return z.quelle;
  return gericht?.rezeptQuelle === "eigen" && !gericht.vorlage ? "eigen" : "schaetzung";
}
export const istHauptzutat = (name) => HAUPT_GRUPPEN.includes(PRODUKT_INDEX[name]?.g) || /teig|patty|spie(ß|ss)/i.test(name);

// Stempel des Rezepts: die schwächste Hauptzutat (Verpackung zählt nicht). Ohne Hauptzutat: schwächste Zutat überhaupt.
export function rezeptStempel(gericht) {
  const zut = (gericht?.zutaten || []).filter((z) => PRODUKT_INDEX[z.name]?.g !== "verpackung");
  if (!zut.length) return { stufe: null, datum: null };
  // Stückzahlen (1 Brot, 1 Patty) sind gezählt, nicht geschätzt – sie bestimmen den Stempel nicht, solange es Gewichte gibt
  const haupt = zut.filter((z) => istHauptzutat(z.name) && z.einheit !== "stk"); const gewogen = zut.filter((z) => z.einheit !== "stk");
  const basis = haupt.length ? haupt : gewogen.length ? gewogen : zut;
  let schwach = null;
  for (const z of basis) { const q = quelleVon(z, gericht); if (!schwach || RANG[q] < RANG[schwach.q]) schwach = { q, z }; }
  return { stufe: schwach.q, datum: schwach.z.quelleInfo?.datum || null, quellen: schwach.z.quelleInfo?.quellen || null };
}
// Für Zähler und Balken: eigen-abgeleitet zählt als eigen
export const stempelGruppe = (stufe) => (stufe === "eigen" || stufe === "eigen-abgeleitet" ? "eigen" : stufe === "branche" || stufe === "pilot" ? "branche" : stufe ? "schaetzung" : null);

// Waage-Check: höchstens 3 Fragen je Gericht – Hauptzutaten, die noch nicht selbst gewogen sind. Reihenfolge: nach Geldwert, wenn Preise da sind,
// sonst Fleisch, Käse, Teig; bei Gleichstand die Zutat, mit der die meisten Gerichte mitlernen.
export function waageFragen(stand, gericht, max = 3) {
  const index = Object.fromEntries((stand.artikel || []).map((a) => [a.name, a]));
  const mitlernen = (name) => (stand.gerichte || []).filter((g) => g.zutaten.some((z) => z.name === name)).length;
  return gericht.zutaten.map((z, i) => ({ z, i })).filter(({ z }) => istHauptzutat(z.name) && z.einheit !== "stk" && quelleVon(z, gericht) !== "eigen" && Number(z.menge) > 0)
    .map(({ z, i }) => { const pj = index[z.name] ? preisJeBasis(index[z.name]) : null; return { i, name: z.name, menge: z.menge, einheit: z.einheit, geld: pj === null ? null : pj * inBasis(z.menge, z.einheit), prio: PRIO[PRODUKT_INDEX[z.name]?.g] ?? 3, mit: mitlernen(z.name) }; })
    .sort((a, b) => (a.geld !== null && b.geld !== null ? b.geld - a.geld : a.prio - b.prio || b.mit - a.mit)).slice(0, max);
}

// Schnellwahl rund um den Startwert (4 Chips), gerundet auf übliche Schritte
export function schnellwahl(menge, einheit) {
  if (einheit === "stk") return [...new Set([Math.max(1, menge - 1), menge, menge + 1, menge + 2])];
  const schritt = menge >= 150 ? 25 : menge >= 50 ? 10 : 5;
  return [-2, -1, 1, 2].map((k) => Math.max(schritt, Math.round(menge / schritt) * schritt + k * schritt));
}

// Ein gewogener Wert gilt für die ganze Familie mit derselben Zutat (im Verhältnis zum bisherigen Wert dieses Gerichts).
// Liefert die geänderten Gerichte. Eigene Werte anderer Gerichte bleiben unberührt.
export function familieAnpassen(stand, { gerichtId, zutat, wert, datum = heute() }) {
  const g = stand.gerichte.find((x) => x.id === gerichtId); if (!g) return { geaendert: [], faktor: null };
  const z = g.zutaten.find((x) => x.name === zutat); if (!z || !(Number(z.menge) > 0) || !(wert > 0)) return { geaendert: [], faktor: null };
  const faktor = wert / z.menge;
  z.menge = wert; z.quelle = "eigen"; z.quelleInfo = { datum };
  const geaendert = [];
  for (const x of stand.gerichte) {
    if (x.id === g.id) continue;
    for (const y of x.zutaten) {
      if (y.name !== zutat || y.einheit !== z.einheit || !(Number(y.menge) > 0)) continue;
      const q = quelleVon(y, x); if (q === "eigen" || q === "eigen-abgeleitet") continue;
      y.menge = runde(y.menge * faktor); y.quelle = "eigen-abgeleitet"; y.quelleInfo = { datum, von: g.id };
      if (!geaendert.includes(x)) geaendert.push(x);
    }
  }
  return { geaendert, faktor };
}
const runde = (x) => (x >= 20 ? Math.round(x / 5) * 5 : Math.round(x * 10) / 10);

// Geld-Satz: nur mit echtem Einkaufspreis. Rückgabe € je Portion (positiv = mehr Gewinn) oder null.
export function geldSatz(stand, zutat, alt, neu, einheit) {
  const a = (stand.artikel || []).find((x) => x.name === zutat); const pj = a ? preisJeBasis(a) : null;
  if (pj === null) return null;
  return (inBasis(alt, einheit) - inBasis(neu, einheit)) * pj;
}

// Branchenwerte einspielen (7.4): nur Mengen mit Quelle „schaetzung" werden ersetzt; Ausreißer abgelehnt; Rückgängig 7 Tage.
// daten: [{ familie, zutat, menge, min, max, quellen[], stufe: "branche"|"pilot" }]
export const PLAUSI = { fleisch: [30, 400], fisch: [30, 300], kaese: [10, 200], teig: [50, 600], gemuese: [5, 300], sauce: [5, 150] };
export function branchenwertPruefen(w) {
  if (!w || !PRODUKT_INDEX[w.zutat] || !(w.menge > 0)) return "unbekannt";
  if (w.stufe === "branche" && !((w.quellen || []).length >= 2)) return "zuWenigQuellen";
  const g = PLAUSI[PRODUKT_INDEX[w.zutat].g]; if (g && PRODUKT_INDEX[w.zutat].e !== "stk" && (w.menge < g[0] || w.menge > g[1])) return "ausreisser";
  const basis = GRUNDREZEPTE.find((r) => r.id === w.familie)?.zutaten.find((z) => z.name === w.zutat)?.menge;
  if (basis && (w.menge < basis / 3 || w.menge > basis * 3)) return "ausreisser";
  return null;
}
export function branchenwerteAnwenden(stand, daten, { datum = heute() } = {}) {
  const geaendert = new Set(), abgelehnt = []; let uebersprungenEigen = 0; const undo = [];
  for (const w of daten || []) {
    const fehler = branchenwertPruefen(w); if (fehler) { abgelehnt.push({ ...w, grund: fehler }); continue; }
    const basis = GRUNDREZEPTE.find((r) => r.id === w.familie)?.zutaten.find((z) => z.name === w.zutat)?.menge || null;
    for (const g of stand.gerichte) {
      if (g.rezeptFamilie !== w.familie) continue;
      g.zutaten.forEach((z, i) => {
        if (z.name !== w.zutat) return;
        const q = quelleVon(z, g);
        if (q === "eigen" || q === "eigen-abgeleitet") { uebersprungenEigen += 1; return; }
        if (RANG[q] > RANG[w.stufe || "branche"]) return; // stärkere Quelle bleibt
        // Größe des Gerichts bleibt: das Verhältnis zum Grundrezept wird übertragen (Döner groß = 1,25 × Branchenwert)
        const neu = runde(basis ? w.menge * (z.menge / basis) : w.menge);
        undo.push({ gid: g.id, i, menge: z.menge, quelle: z.quelle || null, quelleInfo: z.quelleInfo || null });
        z.menge = neu; z.quelle = w.stufe || "branche"; z.quelleInfo = { datum, quellen: w.quellen || [], min: w.min ?? null, max: w.max ?? null };
        geaendert.add(g.id);
      });
    }
  }
  if (undo.length) stand.branchenUndo = { datum, bis: plusTage(datum, 7), aenderungen: undo };
  return { geaendert: geaendert.size, uebersprungenEigen, abgelehnt };
}
export function branchenwerteZuruecknehmen(stand, { datum = heute() } = {}) {
  const u = stand.branchenUndo; if (!u || datum > u.bis) return 0;
  let n = 0;
  for (const a of u.aenderungen) {
    const z = stand.gerichte.find((g) => g.id === a.gid)?.zutaten[a.i]; if (!z) continue;
    if (z.quelle === "eigen" || z.quelle === "eigen-abgeleitet") continue; // inzwischen selbst gewogen: bleibt
    z.menge = a.menge; z.quelle = a.quelle || undefined; z.quelleInfo = a.quelleInfo || undefined; if (!a.quelle) delete z.quelle; if (!a.quelleInfo) delete z.quelleInfo; n += 1;
  }
  delete stand.branchenUndo; return n;
}
const plusTage = (iso, n) => { const [j, m, d] = iso.split("-").map(Number); const x = new Date(j, m - 1, d + n); return heute(x); };

// Wie sicher ist der Wareneinsatz? Anteil des Umsatzes (Preis × Tagesmenge, sonst Preis) aus Gerichten mit geschätztem Stempel.
export function wareneinsatzSicherheit(stand) {
  let gesamt = 0, geschaetzt = 0; const zaehl = { eigen: 0, branche: 0, schaetzung: 0 };
  for (const g of stand.gerichte || []) {
    if (g.klasse === "getraenk") continue;
    const s = stempelGruppe(rezeptStempel(g).stufe); if (!s) continue;
    zaehl[s] += 1;
    const gewicht = (Number(g.preis) || 0) * (Number(g.mengeTag) > 0 ? g.mengeTag : 1);
    gesamt += gewicht; if (s === "schaetzung") geschaetzt += gewicht;
  }
  const anteil = gesamt > 0 ? geschaetzt / gesamt : (zaehl.schaetzung > 0 ? 1 : 0);
  // Fortschritt für die Einrichtungskarte (Punkt 6): geschätzt 1/3, Branchenwert 2/3, eigen ganz
  const n = zaehl.eigen + zaehl.branche + zaehl.schaetzung;
  const fortschritt = n ? (zaehl.eigen + zaehl.branche * 2 / 3 + zaehl.schaetzung / 3) / n : 0;
  return { anteilGeschaetzt: anteil, unsicher: anteil > 0.5, zaehl, fortschritt };
}

// Mitmach-Rundgang (28.10.2026, Konzept 7.3): Wie viele Gerichte haben schon ein eigenes Rezept? „Eigen“ heißt: der Stempel ist nicht
// mehr „schaetzung“ (gewogen, abgeleitet oder belegt). Getränke und Gerichte ohne Zutaten zählen nicht. Verkaufsrenner = Gerichte mit
// Tagesmenge; ist keine eingetragen, zählen alle Gerichte. rennerFertig: alle Verkaufsrenner haben ein eigenes Rezept.
const speise = (g) => !!g && g.klasse !== "getraenk" && !!rezeptStempel(g).stufe;
export const hatEigenesRezept = (g) => { const s = rezeptStempel(g).stufe; return !!s && s !== "schaetzung"; };
export function rezeptFortschritt(stand) {
  const alle = (stand?.gerichte || []).filter(speise);
  const renner = alle.some((g) => Number(g.mengeTag) > 0) ? alle.filter((g) => Number(g.mengeTag) > 0) : alle;
  return { mit: alle.filter(hatEigenesRezept).length, gesamt: alle.length, rennerFertig: renner.every(hatEigenesRezept) };
}
// Das nächste Gericht für „Jetzt abwiegen“: noch geschätzt, meistverkauft zuerst, dann eines mit Waage-Frage, sonst Reihenfolge der Karte.
export function naechstesRezept(stand) {
  const offen = (stand?.gerichte || []).filter((g) => speise(g) && !hatEigenesRezept(g));
  const frage = (g) => (waageFragen(stand, g, 1).length ? 1 : 0);
  return [...offen].sort((a, b) => (Number(b.mengeTag) || 0) - (Number(a.mengeTag) || 0) || frage(b) - frage(a))[0] || null;
}

// Kein rotes Minus aus Startwerten (Masterauftrag „Gehirn“ 0.1, 28.10.2026): Ist ein Gericht rot, aber das Rezept nur geschätzt
// (Vorlage, Baukasten) oder ein Preis nur Richtwert, ist das Minus nicht belegt. Die Oberfläche zeigt dann „≈ prüfen: abwiegen“ statt Rot.
export function minusUnsicher(zeile, gericht) {
  if (!zeile || zeile.ampel !== "rot") return false;
  return rezeptStempel(gericht).stufe === "schaetzung" || !!zeile.warenRichtpreis || !!zeile.warenGeschaetzt;
}
