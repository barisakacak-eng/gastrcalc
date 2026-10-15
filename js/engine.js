// Rechenwerk von GastroCalc. Reine Funktionen, keine Oberfläche, keine Speicherung.
// Jede Formel trägt ihre Quelle: "Prüfung" = GastroCalc Prüfung Oktober 2026, "C" = Dossier C.
// Die Oberfläche darf nichts rechnen, was hier nicht steht. So reden Rechnung und Gestaltung nicht aneinander vorbei.

// ---------- Feste Kosten (Etappe 1) ----------

// Mehrwertsteuer auf Eingangsrechnungen (Strom, Telefon, Entsorgung …): Regelsatz. Ein brutto eingetragener Posten wird netto verrechnet,
// weil der Betrieb die Vorsteuer zurückbekommt (Regelbesteuerung). Kleinunternehmer: Schalter auf netto lassen, dann zählt der Betrag, wie er ist.
export const VORSTEUER = 0.19;
export const nettoVonBrutto = (betrag, satz) => (Number(betrag) || 0) / (1 + (Number(satz) || 0));

// Betrag eines Postens je Monat, netto. periode "jahr" wird durch 12 geteilt, basis "brutto" durch (1 + 19 %).
export function betragJeMonat(posten) {
  if (posten.betrag === null || posten.betrag === undefined) return null;
  const b = posten.basis === "brutto" ? nettoVonBrutto(posten.betrag, VORSTEUER) : posten.betrag;
  return posten.periode === "jahr" ? b / 12 : b;
}

// Eigener Lohn (Etappe 5, Wunsch Baris 12.10.): eigene Kostenzeile, damit der Zähler erst grün wird, wenn auch der Chef bezahlt ist.
// Richtwert: gesetzlicher Mindestlohn 2026 (13,90 €/Std) × 173 Std ≈ 2.400 € – als Schätzung gekennzeichnet, der Wirt überschreibt.
export const EIGENER_LOHN_RICHTWERT = 2400;
export function eigenerLohnJeMonat(team) {
  if (team.eigenerLohnStatus === "offen") return { betrag: null, status: "offen" };
  if (typeof team.eigenerLohn === "number") return { betrag: team.eigenerLohn, status: team.eigenerLohnStatus === "geschaetzt" ? "geschaetzt" : "eigen" };
  return { betrag: EIGENER_LOHN_RICHTWERT, status: "geschaetzt" };
}

// Summe der festen Kosten je Monat, getrennt nach Status.
// status: "bekannt" (echte Zahl), "geschaetzt" (Richtwert übernommen), "offen" (weiß ich nicht, kein Betrag).
export function fixkosten(stand) {
  const out = { gesamt: 0, bekannt: 0, geschaetzt: 0, offen: 0, jeKategorie: {} };
  for (const p of stand.kosten) {
    if (p.status === "aus") continue; // ausgeschaltet = gibt es in diesem Betrieb nicht, zählt nirgends
    const b = betragJeMonat(p);
    out.jeKategorie[p.kategorie] ??= { summe: 0, offen: 0, geschaetzt: 0 };
    if (p.status === "offen" || b === null) { out.offen += 1; out.jeKategorie[p.kategorie].offen += 1; continue; }
    out.gesamt += b;
    out.jeKategorie[p.kategorie].summe += b;
    if (p.status === "geschaetzt") { out.geschaetzt += b; out.jeKategorie[p.kategorie].geschaetzt += b; }
    else out.bekannt += b;
  }
  return out;
}

// Saison (Prüfung, Teil 4 Nr. 11): Feste Kosten laufen zwölf Monate, Umsatz nur in den offenen Monaten.
// Je offenen Monat müssen die Jahreskosten verdient werden: kostenJeMonat * 12 / monate.
export function fixkostenJeOffenenMonat(kostenJeMonat, monate) {
  const m = Math.min(12, Math.max(1, Number(monate) || 12));
  return kostenJeMonat * 12 / m;
}

// Lohnkosten je Monat inkl. Personal; eigener Lohn ist bewusst NICHT hier (C7.3: errechnet, nicht erfragt).
// null = offen (nicht eingetragen). Die Oberfläche zeigt dann "offen", nie "0 €".
export function lohnJeMonat(team) {
  const l = team.lohnkosten;
  return l === null || l === undefined ? null : Number(l) || 0;
}

// Was jeden Monat reinkommen muss (Etappe 1): feste Kosten auf die offenen Monate verteilt, plus Löhne.
// Löhne werden NICHT mit 12/monate hochgerechnet: In der Saison fallen sie nur in den offenen Monaten an (Prüfung Teil 4 Nr. 11,
// Lohnsplit saisonal/ganzjährig kommt später). Ergebnis-Objekt sagt, ob Teile offen sind.
export function monatsLast(stand) {
  const fk = fixkosten(stand);
  const lohn = lohnJeMonat(stand.team);
  const eigen = eigenerLohnJeMonat(stand.team);
  const fixJeOffen = fixkostenJeOffenenMonat(fk.gesamt, stand.betrieb.monate);
  const reinigung = reinigungMonat(stand); // Punkt 5: Firma + Putzmittel, eigene Zeile im Zähler (null, wenn nie gefragt)
  return { fix: fk, lohn, eigen, fixJeOffen, reinigung, gesamt: fixJeOffen + (lohn ?? 0) + (eigen.betrag ?? 0) + (reinigung?.betrag ?? 0), lohnOffen: lohn === null, offen: fk.offen + (lohn === null ? 1 : 0) + (eigen.betrag === null ? 1 : 0) };
}

// Minutensatz auf Leistungsstunden (Prüfung "Minutensatz, nebenbei"): bezahlte Stunden sind nicht produktive Stunden.
// produktivAnteil = Anteil der bezahlten Zeit, in der wirklich gekocht und verkauft wird (Schätzung, später Messung).
export function lohnMinutensatz(team, produktivAnteil = 0.7) {
  const personen = Number(team.personen) || 0;
  const std = Number(team.stundenProPerson) || 0;
  const lohn = Number(team.lohnkosten) || 0;
  const leistungsMinuten = personen * std * 60 * produktivAnteil;
  if (leistungsMinuten <= 0) return null;
  return lohn / leistungsMinuten;
}

// ---------- Rechenregeln für Etappe 2 (schon hier, damit Tests sie festnageln) ----------

// Zeitzuschlag je Gericht (Prüfung Befund 1): (t_i − t̄) × Minutensatz mit t̄ = Σ q_i·t_i / Σ q_i (mengengewichtet).
// Invariante: Σ q_i · zuschlag_i ≈ 0.
export function gewichteteZeit(gerichte) {
  let sq = 0, sqt = 0;
  for (const g of gerichte) { const q = Number(g.menge) || 0; sq += q; sqt += q * (Number(g.zeit) || 0); }
  return sq > 0 ? sqt / sq : null;
}
export function zeitzuschlag(gericht, tQuer, minutensatz) {
  if (tQuer === null || minutensatz === null) return 0;
  return ((Number(gericht.zeit) || 0) - tQuer) * minutensatz;
}

// Fixkostenanteil nach Äquivalenzziffern (Prüfung Befund 3): kB = K / Σ(m_i·äz_i), k_i = kB·äz_i.
// Vier Klassen in Küchensprache: Getränk 0,3 · Kleinigkeit 0,6 · Hauptgericht 1,0 · großes Gericht 1,5.
export const AEQUIVALENZ = { getraenk: 0.3, kleinigkeit: 0.6, haupt: 1.0, gross: 1.5 };
export function fixkostenJeGericht(gerichte, fixkostenGesamt) {
  let nenner = 0;
  for (const g of gerichte) nenner += (Number(g.menge) || 0) * (AEQUIVALENZ[g.klasse] ?? 1);
  if (nenner <= 0) return () => null;
  const kB = fixkostenGesamt / nenner;
  return (g) => kB * (AEQUIVALENZ[g.klasse] ?? 1);
}

// Wareneinsatz mit Schwund (Prüfung Befund 5): waren / (1 − q), q je Zutat auf die Einkaufsmenge, Sperre bei q ≥ 0,9.
export function mitSchwund(waren, q) {
  const s = Number(q) || 0;
  if (s >= 0.9) return null; // Sperre: unsinniger Wert
  return waren / (1 - s);
}

// Garverlust (C5): benötigte Rohware = Menge im fertigen Gericht / (1 − garverlust). Nur für garende Rohware, nie in die Schwundliste.
export function rohmengeFuer(fertigMenge, garverlust) {
  const v = Number(garverlust) || 0;
  if (v >= 0.9) return null;
  return fertigMenge / (1 - v);
}

// Preis mit Gewinnziel und Provision (Prüfung Befund 4), "im Hundert":
// Basis netto:  netto = SK / (1 − g − p)
// Basis brutto: netto = SK / (1 − g − p·(1+s))   (Portal rechnet die Provision auf den Bruttobestellwert)
// Warnung ab g+p ≥ 0,65, Sperre ab 0,85.
// basis "unbekannt" wird wie "brutto" gerechnet – das ist die vorsichtige Variante (höherer Preis), und die Oberfläche sagt das dazu.
export const basisFuerRechnung = (basis) => (basis === "netto" ? "netto" : "brutto");
export function nettoPreis(selbstkosten, g, p, { basis = "netto", mwst = 0.07 } = {}) {
  const gg = Number(g) || 0, pp = Number(p) || 0;
  const last = basisFuerRechnung(basis) === "brutto" ? gg + pp * (1 + mwst) : gg + pp;
  const EPS = 1e-9; // 0,35 + 0,30 ist im Rechner 0,6499999…, die Schwelle soll trotzdem greifen
  const stufe = last >= 0.85 - EPS ? "sperre" : last >= 0.65 - EPS ? "warnung" : "ok";
  if (stufe === "sperre") return { netto: null, stufe, last };
  return { netto: selbstkosten / (1 - last), stufe, last };
}

// Aufrundung auf 10 Cent wird ausgewiesen (Prüfung Befund 10): bis 4 %, im Mittel 2 % stiller Aufschlag – deshalb sichtbar.
export function aufrunden10Cent(brutto) {
  const r = Math.ceil(brutto * 10 - 1e-9) / 10;
  return { gerundet: r, aufschlag: r - brutto };
}

// Abfall-Äquivalent (Prüfung Befund 2): Müllwert / Deckungsbeitrag je Portion, NICHT / Gewinn je Portion.
// Deckungsbeitrag je Portion = Nettopreis − Wareneinsatz (variable Kosten). Müll wird zu Einkaufspreisen bewertet.
export function abfallAequivalent(muellwert, deckungsbeitragJePortion) {
  const db = Number(deckungsbeitragJePortion) || 0;
  if (db <= 0) return null;
  return muellwert / db;
}

// Verbrauchsrechnung (Prüfung Befund 6, C6): Verbrauch = Anfang + Einkauf − Ende − Müll − Personalessen;
// Portionen = Verbrauch der Leitzutat / Menge im Rezept. Flüchtig, wird nie gespeichert oder exportiert.
export function verbrauch({ anfang, einkauf, ende, muell = 0, personal = 0 }) {
  return (Number(anfang) || 0) + (Number(einkauf) || 0) - (Number(ende) || 0) - (Number(muell) || 0) - (Number(personal) || 0);
}
export function portionenAusVerbrauch(verbrauchLeitzutat, mengeImRezept) {
  const m = Number(mengeImRezept) || 0;
  return m > 0 ? verbrauchLeitzutat / m : null;
}

// Verpackung (C7.1): Stückpreis = Gebindepreis / Gebindemenge.
export function stueckpreis(gebindepreis, gebindemenge) {
  const m = Number(gebindemenge) || 0;
  return m > 0 ? (Number(gebindepreis) || 0) / m : null;
}

// Provision eines Portals aus der Kanalliste holen (Anteil 0..1).
export function provisionAnteil(portal) {
  return (Number(portal?.provision) || 0) / 100;
}

// ======================= Etappe 2: Karte, Artikel, Kalkulation =======================
import { EINHEITEN, inBasis, PRODUKT_INDEX, GARVERLUST_START, STEUER_JE_GRUPPE } from "./data/katalog.js";

// Klasse eines Gerichts aus dem Katalogbereich (Äquivalenzziffern, Prüfung Befund 3). Der Betrieb kann sie ändern.
const KLASSE_JE_BEREICH = {
  kaffee: "getraenk", bar: "getraenk", bier: "getraenk", alkoholfrei: "getraenk",
  beilagen: "kleinigkeit", fingerfood: "kleinigkeit", kuchen: "kleinigkeit", eis: "kleinigkeit", suppe: "kleinigkeit", fruehstueck: "kleinigkeit",
  doener: "haupt", pizza: "haupt", burger: "haupt", currywurst: "haupt", asia: "haupt", salat: "haupt",
  fleischgericht: "gross",
};
export const klasseFuerBereich = (b) => KLASSE_JE_BEREICH[b] || "haupt";

// Steuersatz eines Gerichts (Prüfung Befund 7): Getränke 19 %, Speisen 7 % (Stand Oktober 2026, dauerhaft 7 % seit 1.1.2026).
export function steuersatzGericht(gericht) {
  if (typeof gericht.steuer === "number") return gericht.steuer;
  return gericht.klasse === "getraenk" ? 0.19 : 0.07;
}
// Steuersatz beim Anlegen aus der ersten Zutat ableiten (Getränk 19 %, sonst 7 %) – bleibt am Gericht, auch wenn die Klasse wechselt.
export function steuersatzAusZutaten(zutaten) {
  const g = PRODUKT_INDEX[zutaten?.[0]?.name]?.g;
  return STEUER_JE_GRUPPE[g] ?? 0.07;
}

// Steuersatz eines Artikels beim Einkauf: Getränke 19 %, Lebensmittel 7 %. Verpackung 19 %.
export const steuersatzArtikel = (artikel) => STEUER_JE_GRUPPE[artikel?.gruppe] ?? (artikel?.gruppe === "verpackung" ? 0.19 : 0.07);
// Nettopreis je Gebinde: ein brutto eingetragener Preis (Supermarktbon) wird um die Steuer bereinigt.
export function preisNettoGebinde(artikel) {
  if (artikel.preis === null || artikel.preis === undefined) return null;
  return artikel.preisBasis === "brutto" ? nettoVonBrutto(artikel.preis, steuersatzArtikel(artikel)) : artikel.preis;
}
// Preis je Basiseinheit (g, ml, Stück) eines Artikels aus Gebindeinhalt und Gebindepreis, netto. null = Preis fehlt.
export function preisJeBasis(artikel) {
  const p = preisNettoGebinde(artikel);
  if (p === null) return null;
  const basisMenge = inBasis(artikel.packung?.menge, artikel.packung?.einheit);
  if (!(basisMenge > 0)) return null;
  return p / basisMenge;
}

// Gebinde (Etappe 5): Der Wirt kauft ein Gebinde (Karton, Kiste, Beutel …) mit einem Inhalt (packung.menge/einheit);
// optional eine Zwischengröße (Karton à 4 Beutel). Kette von groß nach klein, mit Inhalt je Stufe.
export const GEBINDE_ARTEN = ["karton", "kiste", "beutel", "packung", "kanister", "eimer", "sack", "flasche", "dose", "lose"];
export function gebindeKette(artikel) {
  const g = artikel.gebinde || { art: "packung", zwischen: null };
  const menge = Number(artikel.packung?.menge) || null; const einheit = artikel.packung?.einheit || artikel.einheit || "stk";
  const kette = [{ art: g.art, anzahl: 1, inhalt: menge, einheit }];
  if (g.zwischen && g.zwischen.anzahl > 0 && menge) kette.push({ art: g.zwischen.art, anzahl: g.zwischen.anzahl, inhalt: menge / g.zwischen.anzahl, einheit });
  return kette;
}
// Preis je Zwischengebinde (Beutel) und je Einheit, netto.
export function gebindePreise(artikel) {
  const p = preisNettoGebinde(artikel); const kette = gebindeKette(artikel);
  const z = kette[1] || null;
  return { gebinde: p, zwischen: p !== null && z ? p / z.anzahl : null, jeEinheit: p !== null && kette[0].inhalt ? p / kette[0].inhalt : null, einheit: kette[0].einheit };
}
// Einen alten Preis festhalten, bevor ein neuer gesetzt wird (Preisverlauf für „Preise gestiegen").
export function preisMerken(artikel, datum) {
  if (typeof artikel.preis !== "number" || !(artikel.packung?.menge > 0)) return;
  artikel.preisHistorie ??= [];
  const letzter = artikel.preisHistorie[artikel.preisHistorie.length - 1];
  if (letzter && letzter.preis === artikel.preis && letzter.menge === artikel.packung.menge && letzter.einheit === artikel.packung.einheit) return;
  artikel.preisHistorie.push({ datum, preis: artikel.preis, menge: artikel.packung.menge, einheit: artikel.packung.einheit, basis: artikel.preisBasis || "netto" });
  if (artikel.preisHistorie.length > 24) artikel.preisHistorie.splice(0, artikel.preisHistorie.length - 24);
}

// Garverlust eines Artikels: eigene Messung (roh, gar) vor Schätzung (Branchenwert) vor nichts (0).
export function garverlustAnteil(artikel) {
  const g = artikel.garverlust;
  if (!g) return { wert: 0, status: "keiner" };
  if (g.roh > 0 && g.gar > 0 && g.gar <= g.roh) return { wert: 1 - g.gar / g.roh, status: "gemessen" };
  if (typeof g.wert === "number") return { wert: g.wert, status: "geschaetzt" };
  return { wert: 0, status: "keiner" };
}

// Wareneinsatz eines Gerichts: Σ Menge × Preis je Basis, garende Rohware mit Garverlust (C5: Rohmenge = Menge / (1 − v)).
export function warenGericht(gericht, artikelIndex) {
  let waren = 0; const fehlt = []; let geschaetzt = false;
  for (const z of gericht.zutaten) {
    const a = artikelIndex[z.name];
    const pj = a ? preisJeBasis(a) : null;
    if (pj === null) { fehlt.push(z.name); continue; }
    if (!(Number(z.menge) > 0)) { fehlt.push(z.name); continue; }                      // Menge fehlt: kein 0-€-Posten
    if ((EINHEITEN[z.einheit]?.basis) !== (EINHEITEN[a.packung?.einheit]?.basis)) { fehlt.push(z.name); continue; } // g gegen Stück: nicht rechnen
    const gv = a ? garverlustAnteil(a) : { wert: 0 };
    if (gv.status === "geschaetzt") geschaetzt = true;
    const roh = rohmengeFuer(inBasis(z.menge, z.einheit), gv.wert);
    if (roh === null) { fehlt.push(z.name); continue; }
    waren += roh * pj;
  }
  // Ein Gericht ohne Rezept hat keinen Wareneinsatz von 0 €, sondern keinen – bleibt grau.
  if (!gericht.zutaten.length) fehlt.push("rezept");
  return { waren, fehlt, geschaetzt, vollstaendig: fehlt.length === 0 };
}

// Verkaufsmengen je Monat, grob (Prüfung: „drei meistverkaufte Gerichte" reichen für den Start):
// Bestseller mit eigener Tageszahl, der Rest teilt sich die übrigen Bestellungen des Tages gleichmäßig.
export function mengenJeMonat(stand) {
  const tage = (Number(stand.betrieb.tageProWoche) || 6) * 52 / 12;
  const gesamtTag = Number(stand.verkauf?.bestellungenTag) || 0;
  const out = {}; let bekannt = 0, nBest = 0;
  for (const g of stand.gerichte) if (g.mengeTag > 0) { out[g.id] = g.mengeTag * tage; bekannt += g.mengeTag; nBest += 1; }
  const rest = stand.gerichte.length - nBest;
  const restTag = Math.max(0, gesamtTag - bekannt);
  const jeRest = rest > 0 ? restTag / rest : 0;
  for (const g of stand.gerichte) if (!(g.mengeTag > 0)) out[g.id] = (jeRest > 0 ? jeRest : (gesamtTag > 0 ? 0 : 1)) * tage;
  // Ohne jede Mengenangabe: alle gleich (1 je Tag) – dann wirken nur die Äquivalenzziffern. Wird als Schätzung ausgewiesen.
  return { mengen: out, geschaetzt: gesamtTag === 0 || rest > 0 };
}

// Artikelverzeichnis aus den Zutaten aller Gerichte ableiten (ein Artikel je Name), vorhandene Preise behalten.
export function artikelAusGerichten(stand) {
  const alt = Object.fromEntries((stand.artikel || []).map((a) => [a.name, a]));
  const neu = {};
  const benutzt = new Set();
  for (const g of stand.gerichte) for (const z of g.zutaten) benutzt.add(z.name);
  // Reihenfolge bleibt, wie sie war (sonst springt die Liste beim Eintragen); eingetragene Preise bleiben, auch wenn das Gericht weg ist
  // Selbst gemachte Teile (Punkt 2): ihre Rohstoffe gehören auch ins Verzeichnis (Inventur, Einkaufspreise)
  for (const a of Object.values(alt)) if (a.herkunft === "selbst" && a.rezept && benutzt.has(a.name)) for (const z of a.rezept.zutaten) benutzt.add(z.name);
  for (const a of Object.values(alt)) if (preisJeBasis(a) !== null || benutzt.has(a.name) || a.herkunft === "selbst") neu[a.name] = a;
  const zutatenAlle = [...stand.gerichte.flatMap((g) => g.zutaten), ...Object.values(neu).filter((a) => a.herkunft === "selbst" && benutzt.has(a.name)).flatMap((a) => a.rezept?.zutaten || [])];
  for (const z of zutatenAlle) {
    if (neu[z.name]) continue;
    const kat = PRODUKT_INDEX[z.name];
    const gruppe = kat?.g || "gewuerz";
    const einheit = kat?.e || z.einheit || "stk";
    const a = alt[z.name] || { name: z.name, gruppe, einheit, packung: { menge: null, einheit }, preis: null, status: "offen" };
    if (GARVERLUST_START[gruppe] !== undefined && !a.garverlust) a.garverlust = { wert: GARVERLUST_START[gruppe] };
    neu[z.name] = a;
  }
  for (const a of Object.values(neu)) a.benutzt = benutzt.has(a.name);
  const liste = Object.values(neu);
  zwischenpreiseRechnen({ ...stand, artikel: liste });
  return liste;
}

// Preis eines selbst gemachten Teils (Punkt 2): Material / Ausbeute. Fehlt ein Rohstoffpreis, bleibt der Preis offen – nichts wird erfunden.
// Die Arbeitszeit steckt NICHT im Preis: Löhne sind schon in den Lohnkosten des Ladens. Sie wandert stattdessen als Minuten in die
// Zubereitungszeit der Gerichte (zeitMitZwischen) und verteilt sich so über den Zeitzuschlag – ohne doppelt zu zählen.
// arbeitGeld (Minuten × Minutensatz) dient nur dem Vergleich „selbst oder gekauft". Nur eine Stufe: Rohstoffe sind gekaufte Artikel.
export function zwischenpreis(artikel, artikelIndex, minutensatz = null) {
  const r = artikel.rezept; if (!r || !(r.ausbeute?.menge > 0)) return { preis: null, arbeitGeld: null, fehlt: ["rezept"] };
  let material = 0; const fehlt = [];
  for (const z of r.zutaten || []) {
    const a = artikelIndex[z.name];
    const pj = a && a.herkunft !== "selbst" ? preisJeBasis(a) : null;
    if (pj === null || !(Number(z.menge) > 0) || EINHEITEN[z.einheit]?.basis !== EINHEITEN[a.packung?.einheit]?.basis) { fehlt.push(z.name); continue; }
    material += inBasis(z.menge, z.einheit) * pj;
  }
  const arbeitGeld = minutensatz === null ? null : (Number(r.arbeitMin) || 0) * minutensatz;
  return { preis: fehlt.length ? null : material, arbeitGeld, fehlt };
}

// Rechnet die Preise aller selbst gemachten Artikel neu und schreibt sie wie einen Einkaufspreis (netto, je Ausbeute) an den Artikel.
// Ändert sich der Preis (Mehl teurer), kommt der alte in den Preisverlauf – so erscheint das Teil in „Preise, die sich geändert haben".
export function zwischenpreiseRechnen(stand) {
  const index = Object.fromEntries((stand.artikel || []).map((a) => [a.name, a]));
  for (const a of stand.artikel || []) {
    if (a.herkunft !== "selbst" || !a.rezept) continue;
    const z = zwischenpreis(a, index);
    const preis = z.preis === null ? null : Math.round(z.preis * 10000) / 10000;
    const menge = a.rezept.ausbeute.menge, einheit = a.rezept.ausbeute.einheit;
    if (preis !== a.preis || a.packung?.menge !== menge || a.packung?.einheit !== einheit) {
      if (typeof a.preis === "number" && preis !== null) preisMerken(a, heute());
      a.preis = preis; a.packung = { menge, einheit }; a.preisBasis = "netto";
    }
    a.status = preis === null ? "offen" : "errechnet"; a.zwischenFehlt = z.fehlt;
  }
}

// Zubereitungszeit eines Gerichts plus der anteiligen Arbeit an selbst gemachten Teilen (Pizza: 20 min je 1650 g Teig × 280 g ≈ 3,4 min).
export function zeitMitZwischen(gericht, artikelIndex) {
  let extra = 0;
  for (const z of gericht.zutaten || []) {
    const a = artikelIndex[z.name]; const r = a?.herkunft === "selbst" ? a.rezept : null;
    if (!r || !(r.ausbeute?.menge > 0) || !(Number(r.arbeitMin) > 0)) continue;
    if (EINHEITEN[z.einheit]?.basis !== EINHEITEN[r.ausbeute.einheit]?.basis) continue;
    extra += r.arbeitMin * inBasis(z.menge, z.einheit) / inBasis(r.ausbeute.menge, r.ausbeute.einheit);
  }
  return (Number(gericht.zeit) || 0) + extra;
}

// Vollständige Kalkulation der Karte. Alle Formeln aus der Prüfung Oktober 2026:
//  SK_i = waren_i + k_i (Fixkostenanteil nach Äquivalenzziffern über Fix+Lohn) + Zeitzuschlag_i (mengengewichtet, Σ = 0)
//  netto_ziel = SK / (1 − g − p)   (p nur für den Portalpreis)
//  Ampel gegen den heutigen Preis: grün = Ziel erreicht, gelb = Kosten gedeckt, rot = unter Kosten, grau = Preise fehlen.
export function kalkulation(stand, { produktivAnteil = 0.7 } = {}) {
  zwischenpreiseRechnen(stand); // selbst gemachte Teile folgen den Rohstoffpreisen (Mehl teurer → Pide teurer)
  const last = monatsLast(stand);
  const artikelIndex = Object.fromEntries((stand.artikel || []).map((a) => [a.name, a]));
  const { mengen, geschaetzt: mengenGeschaetzt } = mengenJeMonat(stand);
  const minutensatz = lohnMinutensatz(stand.team, produktivAnteil);
  const g = (Number(stand.verkauf?.zielgewinn) || 0) / 100;
  const gerichteMitMenge = stand.gerichte.map((x) => ({ ...x, zeit: zeitMitZwischen(x, artikelIndex), menge: mengen[x.id] || 0 }));
  const tQuer = gewichteteZeit(gerichteMitMenge);
  const kFix = fixkostenJeGericht(gerichteMitMenge, last.gesamt);
  const portal = (stand.kanaele?.portale || []).find((p) => p.provision > 0) || null;
  const zeilen = gerichteMitMenge.map((x) => {
    const w = warenGericht(x, artikelIndex);
    const fix = kFix(x) ?? 0;
    const zeit = minutensatz === null ? 0 : zeitzuschlag(x, tQuer, minutensatz);
    // Untergrenze (Prüfung Befund 1): Selbstkosten nie unter dem Wareneinsatz, auch wenn der Zeitzuschlag negativ ist.
    const sk = w.vollstaendig ? w.waren + Math.max(0, fix + zeit) : null;
    const mwst = steuersatzGericht(x);
    const ziel = sk === null ? { netto: null, stufe: "ok" } : nettoPreis(sk, g, 0);
    const zielNetto = ziel.netto;
    // Aufrundung auf 10 Cent wird ausgewiesen (Prüfung Befund 10).
    const zielRund = zielNetto === null ? null : aufrunden10Cent(zielNetto * (1 + mwst));
    const zielBrutto = zielRund ? zielRund.gerundet : null;
    const zielAufschlag = zielRund ? zielRund.aufschlag : 0;
    let portalBrutto = null, portalStufe = null;
    if (sk !== null && portal) {
      const r = nettoPreis(sk, g, provisionAnteil(portal), { basis: basisFuerRechnung(portal.basis), mwst });
      portalBrutto = r.netto === null ? null : r.netto * (1 + mwst); portalStufe = r.stufe;
    }
    const preisBrutto = typeof x.preis === "number" ? x.preis : null;
    const preisNetto = preisBrutto === null ? null : preisBrutto / (1 + mwst);
    // Ampel vergleicht auf den Cent, so wie die Zahlen angezeigt werden – wer den angezeigten Wert einträgt, bekommt Grün.
    const cent = (v) => Math.round(v * 100) / 100;
    let ampel = "grau";
    if (sk !== null && preisNetto !== null && zielNetto !== null) ampel = cent(preisBrutto) >= cent(zielNetto * (1 + mwst)) ? "gruen" : cent(preisNetto) >= cent(sk) ? "gelb" : "rot";
    const db = preisNetto === null || !w.vollstaendig ? null : preisNetto - w.waren; // Deckungsbeitrag je Portion (für Etappe 3)
    return { id: x.id, name: x.name, klasse: x.klasse, menge: x.menge, waren: w.vollstaendig ? w.waren : null, warenFehlt: w.fehlt, warenGeschaetzt: w.geschaetzt,
      fix, zeit, sk, mwst, preisBrutto, preisNetto, zielNetto, zielBrutto, zielAufschlag, zielStufe: ziel.stufe, portalBrutto, portalStufe, portalName: portal?.name || null, portalBasis: portal ? basisFuerRechnung(portal.basis) : null, portalBasisUnbekannt: portal ? portal.basis !== "netto" && portal.basis !== "brutto" : false, ampel, db,
      wareneinsatzAnteil: preisNetto > 0 && w.vollstaendig ? w.waren / preisNetto : null };
  });
  const zaehl = { gruen: 0, gelb: 0, rot: 0, grau: 0 };
  for (const z of zeilen) zaehl[z.ampel] += 1;
  const geschaetzt = last.fix.geschaetzt > 0 || last.eigen.status === "geschaetzt" || mengenGeschaetzt || zeilen.some((z) => z.warenGeschaetzt);
  return { zeilen, zaehl, last, minutensatz, tQuer, mengenGeschaetzt, geschaetzt, zielStufe: nettoPreis(1, g, 0).stufe,
    unvollstaendig: last.offen > 0 || geschaetzt || zeilen.some((z) => z.ampel === "grau") };
}

// Mischsatz der Umsatzsteuer auf den Tagesumsatz (Etappe 5): eigener Wert, sonst aus der Karte (Speisen 7 %, Getränke 19 %,
// gewichtet mit Preis × Menge), sonst 7 %. Der Tagesumsatz aus der Kasse ist brutto; der Zähler rechnet netto.
export function umsatzSteuerSatz(stand) {
  if (typeof stand.betrieb?.steuerSatz === "number") return { satz: stand.betrieb.steuerSatz, quelle: "eigen" };
  const mitPreis = (stand.gerichte || []).filter((g) => typeof g.preis === "number" && g.preis > 0);
  if (mitPreis.length) {
    const { mengen } = mengenJeMonat(stand);
    let s = 0, n = 0;
    for (const g of mitPreis) { const w = g.preis * (mengen[g.id] || 1); s += w * steuersatzGericht(g); n += w; }
    if (n > 0) return { satz: Math.round(s / n * 10000) / 10000, quelle: "karte" };
  }
  return { satz: 0.07, quelle: "standard" };
}

// Einheit wechseln, Zahl mitnehmen: 180 g -> 0,18 kg, 10 kg -> 10000 g (Review Etappe 2, Punkt 5).
export function mengeUmrechnen(menge, von, nach) {
  if (menge === null || menge === undefined) return null;
  const fv = EINHEITEN[von]?.f, fn = EINHEITEN[nach]?.f;
  if (!fv || !fn || EINHEITEN[von].basis !== EINHEITEN[nach].basis) return menge;
  return Math.round(menge * fv / fn * 1000) / 1000;
}

// ======================= Etappe 3: Schwund, Tagesnotiz, Läden-Übersicht =======================
import { heute, uid, SITZUNG } from "./util.js";
import { reinigungMonat } from "./reinigung.js";

// Vorgangsarten nach Dossier C9 (drei Arten, nie vermischt):
//  1 = Verderb, Bruch, Zubereitungsfehler, nicht verkauft – bewertet zu Einkaufspreisen
//  2 = Personalverzehr – bewertet nach Sachbezugswerten (SvEV 2026)
//  3 = Eigenverzehr des Inhabers – BMF-Pauschbeträge oder Einzelaufzeichnung; hier Einzelaufzeichnung
// Etappe 5: drei Wege in zwei Tipps – gericht (Teller weg), rohware (Artikel weg), eimer (nur gewogen). Alte Arten bleiben lesbar.
export const SCHWUND_ARTEN = { verderb: 1, bruch: 1, fehler: 1, nichtverkauft: 1, gericht: 1, rohware: 1, eimer: 1, personal: 2, eigen: 3 };
export const FRAKTIONEN = ["bio", "rest", "verpackung", "glas", "papier", "fett"];
// Sachbezugswerte 2026 (SvEV): 345 € je Monat, kalendertäglich 11,50 €, Frühstück 2,37 €, Mittag und Abend je 4,57 € (Prüfung Teil 3).
export const SVEV_2026 = { fruehstueck: 2.37, mittag: 4.57, abend: 4.57, tag: 11.5, monat: 345 };

// Wert eines Schwund-Eintrags zu Einkaufspreisen. Rohware nach Gewicht ohne Garverlust (weggeworfen wird roh gewogen);
// Gerichte über ihren Wareneinsatz. null = Preis fehlt, der Eintrag zählt dann in "ohne Wert".
export function wertEintrag(e, stand) {
  const idx = Object.fromEntries((stand.artikel || []).map((a) => [a.name, a]));
  if (e.ref?.typ === "artikel") {
    const a = idx[e.ref.name]; const pj = a ? preisJeBasis(a) : null;
    if (pj === null) return null;
    if ((EINHEITEN[e.einheit]?.basis) !== (EINHEITEN[a.packung?.einheit]?.basis)) return null;
    return pj * inBasis(e.menge, e.einheit);
  }
  if (e.ref?.typ === "gericht") {
    const g = (stand.gerichte || []).find((x) => x.id === e.ref.id); if (!g) return null;
    const w = warenGericht(g, idx); if (!w.vollstaendig) return null;
    return w.waren * (Number(e.menge) || 0);
  }
  return null;
}

// Deckungsbeitrag je Portion, mengengewichtet über die Karte (für das Abfall-Äquivalent, Prüfung Befund 2).
export function dbJePortion(stand) {
  if (!(stand.gerichte || []).length) return null;
  const k = kalkulation(stand);
  let s = 0, m = 0;
  for (const z of k.zeilen) if (z.db !== null && z.db > 0) { s += z.db * (z.menge || 1); m += (z.menge || 1); }
  return m > 0 ? s / m : null;
}

const tagMinus = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return heute(d); };
export const zeitraumTage = (n) => ({ von: tagMinus(n - 1), bis: heute() });
export const monatsZeitraum = () => { const h = heute(); return { von: h.slice(0, 8) + "01", bis: h }; };

// Auswertung der Schwund-Einträge in einem Zeitraum (Datum als "JJJJ-MM-TT", Grenzen einschließlich).
export function schwundAuswertung(stand, { von, bis }) {
  const out = { muellwert: 0, jeArt: {}, jeFraktion: {}, ohneWert: 0, anzahl: 0,
    personal: { anzahl: 0, svev: 0, waren: 0 }, eigen: { anzahl: 0, waren: 0 }, portionen: null, dbJePortion: null };
  for (const e of stand.schwund || []) {
    if (e.storniert || typeof e.datum !== "string" || e.datum < von || e.datum > bis) continue;
    out.anzahl += 1;
    // Momentaufnahme: der beim Eintragen ermittelte Wert bleibt – auch "kein Preis" (null). Nur Alt-Einträge ohne Feld werden nachbewertet.
    const wert = "wert" in e ? (typeof e.wert === "number" ? e.wert : null) : wertEintrag(e, stand);
    const vorgang = SCHWUND_ARTEN[e.art] || 1;
    if (vorgang === 1) {
      if (wert === null) out.ohneWert += 1; else { out.muellwert += wert; out.jeArt[e.art] = (out.jeArt[e.art] || 0) + wert; }
      if (e.fraktion) { out.jeFraktion[e.fraktion] ??= { anzahl: 0, wert: 0 }; out.jeFraktion[e.fraktion].anzahl += 1; out.jeFraktion[e.fraktion].wert += wert || 0; }
    } else if (vorgang === 2) {
      out.personal.anzahl += Number(e.menge) || 0;
      out.personal.svev += (Number(e.menge) || 0) * (SVEV_2026[e.mahlzeit] ?? SVEV_2026.mittag);
      if (wert !== null) out.personal.waren += wert;
    } else {
      out.eigen.anzahl += Number(e.menge) || 0;
      if (wert !== null) out.eigen.waren += wert;
    }
  }
  out.dbJePortion = dbJePortion(stand);
  out.portionen = out.dbJePortion ? abfallAequivalent(out.muellwert, out.dbJePortion) : null;
  return out;
}

// Tagesnotiz: Tagesumsatz (brutto) je Datum als Journal. Nur intern, nie in Ausgabedokumenten, nie neben errechneten Verkaufsmengen.
// Es gilt der jüngste nicht stornierte Eintrag je Datum. Tippen in derselben Sitzung ändert den eigenen frischen Eintrag,
// statt je Tastendruck einen neuen anzuhängen; alles andere ist ein neuer Eintrag.
export function umsatzEintrag(stand, datum) {
  let best = null;
  for (const n of stand.tagesnotizen || []) if (n.datum === datum && !n.storniert && typeof n.umsatz === "number" && (!best || String(n.erfasst || "") >= String(best.erfasst || ""))) best = n;
  return best;
}
export function tagesnotizSetzen(stand, datum, umsatz, { nacherfasst = false, geraet = null } = {}) {
  const jetzt = new Date().toISOString();
  const letzter = umsatzEintrag(stand, datum);
  if (letzter && letzter.sitzung === SITZUNG && !letzter.nacherfasst === !nacherfasst) { letzter.umsatz = umsatz; letzter.erfasst = jetzt; return letzter; }
  // Korrektur: frühere eigene Einträge dieses Tages werden storniert (ersetzt), damit keine zwei Werte nebeneinander stehen
  for (const n of stand.tagesnotizen) if (n.datum === datum && !n.storniert && (n.geraet || null) === geraet) { n.storniert = true; n.storniertZeit = jetzt; n.ersetzt = true; }
  const n = { id: uid(), datum, umsatz, erfasst: jetzt, nacherfasst: !!nacherfasst, sitzung: SITZUNG, geraet, storniert: false };
  stand.tagesnotizen.push(n); return n;
}
export function tagesnotizLoeschen(stand, datum, geraet = null) {
  const jetzt = new Date().toISOString();
  for (const n of stand.tagesnotizen.slice()) {
    if (n.datum !== datum || n.storniert || (n.geraet || null) !== geraet) continue;
    if (n.sitzung === SITZUNG) stand.tagesnotizen.splice(stand.tagesnotizen.indexOf(n), 1); // eigener frischer Eintrag: weg
    else { n.storniert = true; n.storniertZeit = jetzt; }
  }
}
export function umsatzZeitraum(stand, { von, bis }) {
  let s = 0, tage = 0;
  const tage_ = new Set((stand.tagesnotizen || []).filter((n) => n.datum >= von && n.datum <= bis && !n.storniert).map((n) => n.datum));
  for (const d of tage_) { const e = umsatzEintrag(stand, d); if (e) { s += e.umsatz; tage += 1; } }
  return { summe: s, tage };
}
// Zwei Handys, zwei verschiedene Werte für denselben Tag: wird nicht still entschieden, sondern als offener Punkt gezeigt.
export function umsatzKonflikte(stand) {
  const je = {};
  for (const n of stand.tagesnotizen || []) if (!n.storniert && typeof n.umsatz === "number") (je[n.datum] ??= new Map()).set(n.geraet || "?", n.umsatz);
  // Konflikt nur, wenn verschiedene Geräte verschiedene Werte halten
  return Object.keys(je).filter((d) => new Set(je[d].values()).size > 1).sort();
}

// Was eine Woche einbringen muss: Monatslast × 12 / 52 (die Monatslast ist je offenen Monat gerechnet).
export const wochenSoll = (stand) => monatsLast(stand).gesamt * 12 / 52;

// Eine Zeile der Läden-Übersicht: die fünf Zahlen je Laden für die letzten sieben Tage.
export function ladenUebersicht(stand) {
  const z = zeitraumTage(7);
  const last = monatsLast(stand);
  const u = umsatzZeitraum(stand, z);
  const s = schwundAuswertung(stand, z);
  const k = stand.gerichte.length ? kalkulation(stand) : null;
  const offen = stand.kosten.filter((x) => x.status === "offen").length + (last.lohnOffen ? 1 : 0);
  return { id: stand.id, name: stand.betrieb.name, format: stand.betrieb.format, kuechen: stand.betrieb.kuechen,
    umsatz7: u.summe, tageMitUmsatz: u.tage, soll7: wochenSoll(stand), last,
    abfall7: s.muellwert, portionen7: s.portionen, ohneWert7: s.ohneWert, eintraege7: s.anzahl,
    ampel: k ? k.zaehl : null, gerichte: stand.gerichte.length, offen, eingerichtet: stand.phase === "app" };
}

// ---------- Etappe 4: Kühlkontrolle ----------
// Grenzen legt der Betrieb fest (Art. 5 Abs. 2 c VO (EG) 852/2004); die App gibt nur Anhaltspunkte als Text. Ohne Grenze keine Kontrolle.
export const KUEHL_ARTEN = ["kuehl", "tk", "warm"];
export const MASSNAHMEN = ["tuer", "eingeraeumt", "eingestellt", "umgeraeumt", "stecker", "chef", "techniker", "weggeworfen"];
export const NICHT_GEMESSEN = ["geschlossen", "geraetAus", "leer"];
export const NACHKONTROLLE_STUNDEN = { h1: 1, h2: 2, naechste: null };
export const WOCHENTAGE = [0, 1, 2, 3, 4, 5, 6]; // 0 = Sonntag (JavaScript)

// Etappe 5 (Baris 12.10.): keine Grenzwerte abfragen. Ohne eigene Grenze gilt der gesetzliche Anhaltswert als Standard
// (Kühlung ≤ 7 °C, Tiefkühlung ≤ −18 °C, Warmhalten ≥ 65 °C). Eigene Werte (Fisch 2 °C) überschreiben ihn; das Blatt sagt, welcher galt.
export const GRENZEN_STANDARD = { kuehl: { min: null, max: 7 }, tk: { min: null, max: -18 }, warm: { min: 65, max: null } };
export function grenzenVon(k) {
  const st = GRENZEN_STANDARD[k.art] || GRENZEN_STANDARD.kuehl;
  const minEigen = typeof k.min === "number", maxEigen = typeof k.max === "number";
  // je Feld: eigener Wert schlägt den Standard; ein leeres Feld behält seinen Standard (Review Etappe 5, Punkt 7)
  let min = minEigen ? k.min : st.min, max = maxEigen ? k.max : st.max;
  if (typeof min === "number" && typeof max === "number" && min > max) [min, max] = [max, min]; // vertauscht eingegeben (Prüfung 15.10.): als Bereich lesen
  return { min, max, standard: !minEigen && !maxEigen };
}
export const stelleBereit = (k) => !k.archiviert && !!k.name;
export const aktiveStellen = (stand) => (stand.kuehlstellen || []).filter((k) => !k.archiviert).sort((a, b) => a.reihe - b.reihe);
export const kuehlBereit = (stand) => aktiveStellen(stand).length > 0 && aktiveStellen(stand).every(stelleBereit);

export function abweichung(stelle, wert) {
  if (typeof wert !== "number") return false;
  const g = grenzenVon(stelle);
  if (typeof g.min === "number" && wert < g.min - 1e-9) return true;
  if (typeof g.max === "number" && wert > g.max + 1e-9) return true;
  return false;
}

export const rundgangOffen = (stand) => (stand.rundgaenge || []).find((r) => !r.abgeschlossen) || null;

export function rundgangStarten(stand, { von = null, datum = heute(), nacherfasst = false, quelle = null, einzel = null } = {}) {
  if (rundgangOffen(stand)) return rundgangOffen(stand);
  const r = { id: uid(), datum, von, gestartet: new Date().toISOString(), abgeschlossen: null, nacherfasst: !!nacherfasst, quelle, einzel, messungen: [] }; // einzel: nur diese eine Stelle (Nachmessen)
  stand.rundgaenge.push(r); return r;
}

// Eine Station im offenen Rundgang eintragen oder ändern (bis zum Abschluss änderbar – vertippt heißt nicht angehängt).
export function stationEintragen(r, stelle, daten) {
  const i = r.messungen.findIndex((m) => m.stelle === stelle.id);
  const m = { id: i >= 0 ? r.messungen[i].id : uid(), stelle: stelle.id, zeit: new Date().toISOString(), weg: Array.isArray(daten.weg) ? daten.weg : [],
    wert: typeof daten.wert === "number" ? daten.wert : null, grund: daten.wert === null || daten.wert === undefined ? (daten.grund || null) : null,
    min: grenzenVon(stelle).min, max: grenzenVon(stelle).max, grenzeStandard: grenzenVon(stelle).standard, abweichung: abweichung(stelle, daten.wert),
    massnahmen: Array.isArray(daten.massnahmen) ? daten.massnahmen : [], notiz: (daten.notiz || "").slice(0, 200),
    nachkontrolle: daten.nachkontrolle || null };
  if (!m.abweichung) { m.massnahmen = []; m.nachkontrolle = null; m.weg = []; m.notiz = ""; } // eine korrigierte Zahl nimmt die alte Maßnahme mit
  if (i >= 0) r.messungen[i] = m; else r.messungen.push(m);
  return m;
}

// Abschluss: Messungen werden ins Journal übernommen (nur anhängen, mit laufender Nummer), der Rundgang geschlossen.
// „Ware weggeworfen" wird erst hier zu Schwund-Einträgen – ein wieder geöffnetes oder verworfenes Formular hinterlässt nichts.
export function rundgangAbschliessen(stand, r, lfdGeber, geraet = null, text = (k) => k) {
  const jetzt = new Date().toISOString();
  for (const m of r.messungen) {
    const { weg, ...rest } = m;
    // Nachkontrolle: bei Nacherfassung gibt es keine Fälligkeit „ab jetzt" – das Ereignis liegt zurück
    const nk = m.abweichung && m.nachkontrolle && !r.nacherfasst ? { art: m.nachkontrolle, faellig: m.nachkontrolle === "naechste" ? null : new Date(Date.parse(m.zeit) + NACHKONTROLLE_STUNDEN[m.nachkontrolle] * 3600e3).toISOString() } : null;
    // Datum: nacherfasst = gewählter Tag; sonst der Tag der Eingabe (ein über Nacht offener Rundgang bucht nicht auf gestern)
    const datum = r.nacherfasst ? r.datum : heute(new Date(m.zeit));
    stand.messungen.push({ ...rest, lfd: lfdGeber ? lfdGeber() : null, geraet, rundgang: r.id, datum, von: r.von, erfasst: jetzt, nacherfasst: !!r.nacherfasst, quelle: r.quelle || null, nachkontrolle: nk, storniert: false });
    if (m.abweichung && (m.massnahmen || []).includes("weggeworfen")) {
      const stelle = (stand.kuehlstellen || []).find((k) => k.id === m.stelle);
      for (const w of weg || []) stand.schwund.push({ id: uid(), datum, erfasst: jetzt, art: "verderb", vorgang: 1, ref: w.ref, menge: w.menge, einheit: w.einheit, fraktion: "bio",
        grund: text(stelle?.name || ""), wert: w.wert, wertOffen: w.wert === null, quelle: "kuehl", messung: m.id, nacherfasst: !!r.nacherfasst, storniert: false });
    }
  }
  r.abgeschlossen = jetzt;
  return r;
}

export const messungenDerStelle = (stand, stelleId) => (stand.messungen || []).filter((m) => m.stelle === stelleId && !m.storniert).sort((a, b) => String(a.datum).localeCompare(String(b.datum)) || String(a.zeit).localeCompare(String(b.zeit)));
// Welche spätere Messung hat eine Nachkontrolle erledigt?
// Erledigt ist eine Nachkontrolle erst durch eine spätere echte Messung INNERHALB der Grenze; ein weiterer Ausreißer zählt nicht (Nachtest Etappe 5, Punkt 7).
export function nachkontrolleErledigt(stand, m) {
  return (stand.messungen || []).filter((x) => x.id !== m.id && x.stelle === m.stelle && !x.storniert && typeof x.wert === "number" && !x.abweichung && !x.nacherfasst && x.datum >= m.datum && String(x.zeit) >= String(m.zeit)).sort((a, b) => String(a.zeit).localeCompare(String(b.zeit)))[0] || null;
}
export const letzteMessung = (stand, stelleId) => messungenDerStelle(stand, stelleId).filter((m) => typeof m.wert === "number").pop() || null;

// Offene Nachkontrollen: Abweichung mit Nachkontrolle, nach der noch keine spätere Messung derselben Stelle liegt.
export function offeneNachkontrollen(stand) {
  const out = [];
  for (const m of stand.messungen || []) {
    if (m.storniert || !m.abweichung || !m.nachkontrolle) continue;
    // nur eine echte, nicht nachgetragene Messung mit Wert am selben oder einem späteren Tag schließt die Nachkontrolle
    const spaeter = nachkontrolleErledigt(stand, m);
    if (!spaeter) out.push({ messung: m, faellig: m.nachkontrolle.faellig, ueberfaellig: m.nachkontrolle.faellig ? Date.parse(m.nachkontrolle.faellig) < Date.now() : false });
  }
  return out;
}

export const tagPlus = (iso, n) => { const [j, m, d] = iso.split("-").map(Number); const x = new Date(j, m - 1, d + n); return heute(x); };
export const wochentag = (iso) => { const [j, m, d] = iso.split("-").map(Number); return new Date(j, m - 1, d).getDay(); };

// Monatsblatt je Stelle: je Tag der Status – ruhetag | puenktlich | teilweise | nacherfasst | nichtGemessen | fehlt | offen (heute, noch nicht gemessen).
export function monatsblatt(stand, stelleId, { von, bis }) {
  const takt = stand.kuehl?.takt === 2 ? 2 : 1; const ruhetage = new Set(stand.kuehl?.ruhetage || []);
  const H = heute(); const liste = messungenDerStelle(stand, stelleId);
  const tage = [];
  for (let d = von; d <= bis; d = tagPlus(d, 1)) {
    const ms = liste.filter((m) => m.datum === d);
    const gemessen = ms.filter((m) => typeof m.wert === "number");
    let status;
    if (stand.kuehl?.seit && d < stand.kuehl.seit && !ms.length) status = "vorher"; // vor der Einrichtung: keine Lücke
    else if (ruhetage.has(wochentag(d)) && !ms.length) status = "ruhetag";
    else if (!ms.length) status = d > H ? "zukunft" : d === H ? "offen" : "fehlt";
    else if (!gemessen.length) status = "nichtGemessen";
    else if (ms.some((m) => m.nacherfasst)) status = "nacherfasst";
    else if (gemessen.length < takt) status = "teilweise";
    else status = "puenktlich";
    tage.push({ datum: d, status, messungen: ms });
  }
  const zaehl = {}; for (const t of tage) zaehl[t.status] = (zaehl[t.status] || 0) + 1;
  return { tage, zaehl, takt };
}

// Für Startseite und Heute: Stand der Kühlkontrolle heute und Lücken der letzten 7 Tage über alle Stellen.
export function kuehlStatus(stand) {
  const stellen = aktiveStellen(stand); const H = heute();
  if (!stellen.length) return { eingerichtet: false };
  const heuteGemessen = stellen.filter((k) => messungenDerStelle(stand, k.id).some((m) => m.datum === H)).length;
  const z = { von: tagPlus(H, -7), bis: tagPlus(H, -1) };
  // Tage der letzten Woche, an denen mindestens eine Stelle ohne Messung blieb (Ruhetage zählen nicht)
  const blaetter = stellen.map((k) => monatsblatt(stand, k.id, z).tage);
  let fehlt = 0; for (let i = 0; i < (blaetter[0] || []).length; i++) if (blaetter.some((t) => t[i].status === "fehlt")) fehlt += 1;
  const nk = offeneNachkontrollen(stand);
  const offen = rundgangOffen(stand);
  return { eingerichtet: true, bereit: kuehlBereit(stand), stellen: stellen.length, heuteGemessen, fehlt7: fehlt, nachkontrollen: nk.length, ueberfaellig: nk.filter((x) => x.ueberfaellig).length, offenerRundgang: !!offen, letzteAbweichung: stellen.map((k) => letzteMessung(stand, k.id)).filter((m) => m && m.abweichung).length };
}

// Schwund-Einträge, die noch keinen Wert haben (aus der Kühlkontrolle „Ware weggeworfen" ohne Preis) – offener Punkt für den Chef.
export const schwundOhneWert = (stand) => (stand.schwund || []).filter((e) => !e.storniert && e.wert === null && e.wertOffen);
export function schwundWertSetzen(e, wert) { if (e.wert !== null && e.wert !== undefined) return false; e.wert = wert; e.wertOffen = false; e.wertGesetzt = new Date().toISOString(); return true; }
