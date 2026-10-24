// Rechenwerk von GastroCalc. Reine Funktionen, keine Oberfläche, keine Speicherung.
// Jede Formel trägt ihre Quelle: "Prüfung" = GastroCalc Prüfung Oktober 2026, "C" = Dossier C.
// Die Oberfläche darf nichts rechnen, was hier nicht steht. So reden Rechnung und Gestaltung nicht aneinander vorbei.

// ---------- Feste Kosten (Etappe 1) ----------

// Mehrwertsteuer auf Eingangsrechnungen (Strom, Telefon, Entsorgung …): Regelsatz. Ein brutto eingetragener Posten wird netto verrechnet,
// weil der Betrieb die Vorsteuer zurückbekommt (Regelbesteuerung).
// Paket 3 (16.10.2026), M1: Steuersatz je Posten (Feld satz: 19, 7 oder 0 in Prozent), Standard 19; Wasser 7. Kleinunternehmer
// (betrieb.kleinunternehmer, Schalter im Büro) bekommen keine Vorsteuer zurück: dann zählt jeder Bruttobetrag, wie er ist (Satz 0).
export const VORSTEUER = 0.19;
export const nettoVonBrutto = (betrag, satz) => (Number(betrag) || 0) / (1 + (Number(satz) || 0));
export const VORSTEUER_SAETZE = [19, 7, 0];
// Vorsteuersatz eines Postens als Anteil (0.19 / 0.07 / 0): alte Daten ohne satz = 19 % (Fallback, keine Migration nötig).
export function vorsteuerSatz(posten, betrieb = null) {
  if (betrieb?.kleinunternehmer) return 0;
  const s = Number(posten?.satz);
  return VORSTEUER_SAETZE.includes(s) ? s / 100 : VORSTEUER;
}

// Betrag eines Postens je Monat, netto. periode "jahr" wird durch 12 geteilt, basis "brutto" durch (1 + Satz des Postens).
export function betragJeMonat(posten, betrieb = null) {
  if (posten.betrag === null || posten.betrag === undefined) return null;
  const b = posten.basis === "brutto" ? nettoVonBrutto(posten.betrag, vorsteuerSatz(posten, betrieb)) : posten.betrag;
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
    const b = betragJeMonat(p, stand.betrieb); // Paket 3, M1: Satz je Posten, Kleinunternehmer ohne Vorsteuer
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
  return { fix: fk, lohn, eigen, fixJeOffen, reinigung, gesamt: fixJeOffen + (lohn ?? 0) + (eigen.betrag ?? 0) + (reinigung?.betrag ?? 0), lohnOffen: lohn === null, offen: fk.offen + (lohn === null ? 1 : 0) + (eigen.betrag === null ? 1 : 0) + (reinigung?.firmaOffen ? 1 : 0) };
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
import { neuerTakt, imTakt } from "./takt.js";
import { EINHEITEN, inBasis, PRODUKT_INDEX, GARVERLUST_START, STEUER_JE_GRUPPE } from "./data/katalog.js";
import { schankAnteil, mitSchankverlust } from "./getraenk_feld.js"; // Getränke (18.10.2026): offene Getränke – Schankverlust auf das Großgebinde

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
// Paket 3 (16.10.2026), M3: Preis 0 ist kein Preis (sonst wird das Gericht grün statt grau) – gilt wie null als „fehlt“.
export function preisNettoGebinde(artikel) {
  if (artikel.preis === null || artikel.preis === undefined || !(Number(artikel.preis) > 0)) return null;
  return artikel.preisBasis === "brutto" ? nettoVonBrutto(artikel.preis, steuersatzArtikel(artikel)) : artikel.preis;
}
// Stück ↔ Gewicht (Baris 19.10.2026, Spezifikation „Selbstgemacht und Gebinde“): ein Artikel kann ein Stückgewicht haben
// (g bzw. ml je Stück) – eigenes Feld stueckGewicht, sonst bei selbst Gemachtem aus der Stück-Ausbeute („40 Ballen à 250 g“).
// Damit lassen sich Rezepte in Stück und Einkauf in Gramm (oder umgekehrt) verrechnen. Ohne Stückgewicht wird nie geraten.
export function stueckGewicht(a) {
  if (Number(a?.stueckGewicht) > 0) return Number(a.stueckGewicht);
  const s = a?.herkunft === "selbst" ? a.rezept?.stueck : null;
  return Number(s?.gewicht) > 0 ? Number(s.gewicht) : null;
}
// Menge (menge, einheit) in der Basis einer Ziel-Einheit, mit Stückgewicht sg als Brücke. null = nicht umrechenbar.
export function mengeInBasisVon(menge, einheit, zielEinheit, sg = null) {
  const von = EINHEITEN[einheit]?.basis, nach = EINHEITEN[zielEinheit]?.basis;
  if (!von || !nach) return null;
  const m = inBasis(menge, einheit);
  if (von === nach) return m;
  if (!(sg > 0)) return null;
  if (von === "stk" && nach !== "stk") return m * sg;
  if (nach === "stk" && von !== "stk") return m / sg;
  return null; // g gegen ml: nicht raten
}
// Menge einer Zutat in der Basis des Artikels (seiner Packung).
export const mengeInArtikelBasis = (menge, einheit, a) => mengeInBasisVon(menge, einheit, a?.packung?.einheit || a?.einheit, stueckGewicht(a));

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
// Richtpreise (17.10.2026): ein eingesetzter Richtpreis trägt am Artikel die Marke richtpreis {preis, menge, einheit, stand, …}.
// Er gilt nur, solange Preis, Packung und Basis genau so sind, wie sie eingesetzt wurden – ändert der Wirt etwas, ist es sein Preis.
export function istRichtpreis(a) {
  const r = a?.richtpreis;
  if (!r || typeof r !== "object" || typeof a.preis !== "number" || !(a.preis > 0)) return false;
  return a.preis === r.preis && a.packung?.menge === r.menge && a.packung?.einheit === r.einheit && (a.preisBasis || "netto") === "netto";
}
// Preis geschätzt: Richtpreis, oder selbst gemachtes Teil, dessen Rohstoffe Richtpreise haben (zwischenpreiseRechnen setzt zwischenRichtpreis).
export const preisGeschaetzt = (a) => istRichtpreis(a) || (a?.herkunft === "selbst" && !!a.zwischenRichtpreis);

// Einen alten Preis festhalten, bevor ein neuer gesetzt wird (Preisverlauf für „Preise gestiegen").
export function preisMerken(artikel, datum) {
  if (typeof artikel.preis !== "number" || !(artikel.packung?.menge > 0)) return;
  artikel.preisHistorie ??= [];
  const letzter = artikel.preisHistorie[artikel.preisHistorie.length - 1];
  if (letzter && letzter.preis === artikel.preis && letzter.menge === artikel.packung.menge && letzter.einheit === artikel.packung.einheit) return;
  artikel.preisHistorie.push({ datum, preis: artikel.preis, menge: artikel.packung.menge, einheit: artikel.packung.einheit, basis: artikel.preisBasis || "netto", ...(istRichtpreis(artikel) ? { herkunft: "richtpreis" } : {}) });
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
  let waren = 0; const fehlt = []; let geschaetzt = false, richtpreis = false;
  for (const z of gericht.zutaten) {
    const a = artikelIndex[z.name];
    const pj = a ? preisJeBasis(a) : null;
    if (pj === null) { fehlt.push(z.name); continue; }
    if (!(Number(z.menge) > 0)) { fehlt.push(z.name); continue; }                      // Menge fehlt: kein 0-€-Posten
    const mBasis = mengeInArtikelBasis(z.menge, z.einheit, a); // 19.10.2026: Stück ↔ Gramm über das Stückgewicht
    if (mBasis === null) { fehlt.push(z.name); continue; } // g gegen Stück ohne Stückgewicht: nicht rechnen
    const gv = a ? garverlustAnteil(a) : { wert: 0 };
    if (gv.status === "geschaetzt") geschaetzt = true;
    if (preisGeschaetzt(a)) { geschaetzt = true; richtpreis = true; } // Richtpreise (17.10.2026): Wareneinsatz mit Richtpreis = Schätzung (≈)
    const roh0 = rohmengeFuer(mBasis, gv.wert);
    if (roh0 === null) { fehlt.push(z.name); continue; }
    const roh = mitSchankverlust(roh0, schankAnteil(gericht, z.name)); // Getränke (18.10.2026): Ausschank / (1 − Schankverlust), Standard 0
    waren += roh * pj;
  }
  // Ein Gericht ohne Rezept hat keinen Wareneinsatz von 0 €, sondern keinen – bleibt grau.
  if (!gericht.zutaten.length) fehlt.push("rezept");
  return { waren, fehlt, geschaetzt, richtpreis, vollstaendig: fehlt.length === 0 };
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
  let material = 0; const fehlt = []; let richtpreis = false; const teile = [];
  for (const z of r.zutaten || []) {
    const a = artikelIndex[z.name];
    const pj = a && a.herkunft !== "selbst" ? preisJeBasis(a) : null;
    const mB = pj === null ? null : mengeInArtikelBasis(z.menge, z.einheit, a);
    if (pj === null || !(Number(z.menge) > 0) || mB === null) { fehlt.push(z.name); continue; }
    material += mB * pj; teile.push({ name: z.name, wert: mB * pj });
    if (istRichtpreis(a)) richtpreis = true; // Richtpreise (17.10.2026): das Teil erbt die Schätzung
  }
  const arbeitGeld = minutensatz === null ? null : (Number(r.arbeitMin) || 0) * minutensatz;
  return { preis: fehlt.length ? null : material, bisher: material, teile, arbeitGeld, fehlt, richtpreis };
}

// Warenwert eines selbst gemachten Teils (19.10.2026): je Ansatz, je kg/l, je Stück (Ballen, Fladen) und je 50 g (Soße auf dem Teller).
// Nur, was sich ohne Annahme rechnen lässt: je Stück braucht Stückzahl oder Stückgewicht, je 50 g eine Gewichtsausbeute.
export function selbstWerte(a) {
  const pj = preisJeBasis(a); if (pj === null) return null;
  const basis = EINHEITEN[a.packung?.einheit || a.einheit]?.basis; const sg = stueckGewicht(a);
  const anzahl = Number(a.rezept?.stueck?.anzahl) > 0 ? Number(a.rezept.stueck.anzahl) : null;
  const ansatz = Number(a.preis);
  return {
    ansatz, basis,
    jeKg: basis === "stk" ? (sg ? pj / sg * 1000 : null) : pj * 1000,
    jeStueck: basis === "stk" ? pj : sg ? pj * sg : anzahl ? ansatz / anzahl : null,
    je50: basis === "g" ? pj * 50 : basis === "stk" && sg ? pj / sg * 50 : null,
  };
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
    if (preis !== null && z.richtpreis) a.zwischenRichtpreis = true; else delete a.zwischenRichtpreis;
  }
}

// Zubereitungszeit eines Gerichts plus der anteiligen Arbeit an selbst gemachten Teilen (Pizza: 20 min je 1650 g Teig × 280 g ≈ 3,4 min).
export function zeitMitZwischen(gericht, artikelIndex) {
  let extra = 0;
  for (const z of gericht.zutaten || []) {
    const a = artikelIndex[z.name]; const r = a?.herkunft === "selbst" ? a.rezept : null;
    if (!r || !(r.ausbeute?.menge > 0) || !(Number(r.arbeitMin) > 0)) continue;
    const m = mengeInBasisVon(z.menge, z.einheit, r.ausbeute.einheit, stueckGewicht(a)); if (m === null) continue;
    extra += r.arbeitMin * m / inBasis(r.ausbeute.menge, r.ausbeute.einheit);
  }
  return (Number(gericht.zeit) || 0) + extra;
}

// Vollständige Kalkulation der Karte. Alle Formeln aus der Prüfung Oktober 2026:
//  SK_i = waren_i + k_i (Fixkostenanteil nach Äquivalenzziffern über Fix+Lohn) + Zeitzuschlag_i (mengengewichtet, Σ = 0)
//  netto_ziel = SK / (1 − g − p)   (p nur für den Portalpreis)
//  Ampel gegen den heutigen Preis: grün = Ziel erreicht, gelb = Kosten gedeckt, rot = unter Kosten, grau = Preise fehlen.
// Pro Zeichnen nur einmal rechnen (Stresstest 15.10.: kalkulation lief 3× je Cockpit). app.js zählt den Takt hoch.
// Gilt nur während des synchronen Zeichnens; danach (Mikrotask) wieder aus, damit Aktionen nach einer Änderung frisch rechnen.
let kalkTakt = 0, kalkAktiv = false; const kalkMemo = new WeakMap();
export const kalkulationNeuerTakt = () => { neuerTakt(); kalkTakt += 1; kalkAktiv = true; queueMicrotask(() => { kalkAktiv = false; }); };
export function kalkulation(stand, opts = {}) {
  if (kalkAktiv && opts.produktivAnteil === undefined) { const m = kalkMemo.get(stand); if (m && m.takt === kalkTakt) return m.wert; const wert = kalkulationRechnen(stand, opts); kalkMemo.set(stand, { takt: kalkTakt, wert }); return wert; }
  return kalkulationRechnen(stand, opts);
}
function kalkulationRechnen(stand, { produktivAnteil = 0.7 } = {}) {
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
    const { ampel, db, gewinn: ampelGewinn, quote: ampelQuote } = preisAmpel({ sk, zielNetto, mwst, waren: w.vollstaendig ? w.waren : null }, preisBrutto); // Gremium 2 (24.10.2026): eine Rechnung für Ampel und Anzeige
    return { id: x.id, name: x.name, klasse: x.klasse, menge: x.menge, waren: w.vollstaendig ? w.waren : null, warenFehlt: w.fehlt, warenGeschaetzt: w.geschaetzt, warenRichtpreis: w.richtpreis,
      fix, zeit, sk, mwst, preisBrutto, preisNetto, zielNetto, zielBrutto, zielAufschlag, zielStufe: ziel.stufe, portalBrutto, portalStufe, portalName: portal?.name || null, portalBasis: portal ? basisFuerRechnung(portal.basis) : null, portalBasisUnbekannt: portal ? portal.basis !== "netto" && portal.basis !== "brutto" : false, ampel, db,
      wareneinsatzAnteil: preisNetto > 0 && w.vollstaendig ? w.waren / preisNetto : null, ampelGewinn, ampelQuote };
  });
  const zaehl = { gruen: 0, gelb: 0, rot: 0, grau: 0 };
  for (const z of zeilen) zaehl[z.ampel] += 1;
  const geschaetzt = last.fix.geschaetzt > 0 || last.eigen.status === "geschaetzt" || mengenGeschaetzt || zeilen.some((z) => z.warenGeschaetzt);
  return { zeilen, zaehl, last, minutensatz, tQuer, mengenGeschaetzt, geschaetzt, zielStufe: nettoPreis(1, g, 0).stufe,
    unvollstaendig: last.offen > 0 || geschaetzt || zeilen.some((z) => z.ampel === "grau") };
}

// Ampel je Gericht (Baris 19.10.2026): gemessen am GEWINN NACH ALLEN KOSTEN in % vom Nettopreis – Ware, Personal (auch eigener Lohn),
// Miete, Nebenkosten und Zeit sind in den Selbstkosten (sk). Rot unter 10 %, Gelb 10 bis unter 19 %, Grün ab 19 %.
// Einordnung: BMF-Richtsatzsammlung 2024, Imbissstuben u. Ä. (Umsatz über 100.000 €): Reingewinn 8–39 %, Mittel 24 % vom Umsatz –
// dort OHNE Unternehmerlohn; unsere Rechnung zieht den eigenen Lohn ab und ist damit strenger.
// Quelle: https://www.ihk-muenchen.de/ihk/documents/Recht-Steuern/Steuerrecht/Einkommensteuer/2025-12-08-download-richtsatzsammlung-2024.pdf (geprüft 19.10.2026)
export const AMPEL_GRENZEN = { rot: 0.10, gruen: 0.19 };
// zeile braucht sk, mwst, waren (wie in kalkulation().zeilen). Ampel rechnet auf den Cent, so wie die Zahlen angezeigt werden.
export function preisAmpel(zeile, preisBrutto) {
  const { sk = null, mwst = 0, waren = null } = zeile || {};
  const brutto = typeof preisBrutto === "number" && Number.isFinite(preisBrutto) ? preisBrutto : null;
  const preisNetto = brutto === null ? null : brutto / (1 + mwst);
  const cent = (v) => Math.round(v * 100) / 100;
  const gewinn = sk === null || preisNetto === null ? null : cent(preisNetto) - cent(sk);
  const quote = gewinn === null || !(preisNetto > 0) ? null : gewinn / preisNetto;
  const ampel = quote === null ? "grau" : quote < AMPEL_GRENZEN.rot - 1e-9 ? "rot" : quote < AMPEL_GRENZEN.gruen - 1e-9 ? "gelb" : "gruen";
  const db = preisNetto === null || waren === null ? null : preisNetto - waren; // Deckungsbeitrag nach Ware (Rohgewinn) je Portion
  return { ampel, db, gewinn, quote, preisNetto };
}

// Wohin geht der Preis? (Baris 19.10.2026) Aufteilung eines Bruttopreises je Portion in Ware, Personal, Miete, Nebenkosten, Steuer, Gewinn.
// Der Fixanteil (fix) verteilt die Monatslast; er wird nach den Anteilen der Monatslast aufgeteilt (Lohn + eigener Lohn → Personal,
// Kategorie Miete/Standgebühr → Miete, Rest → Nebenkosten). Zeitzuschlag gehört zum Personal. Summe der Teile = Bruttopreis.
export function preisAufteilung(zeile, last, preisBrutto) {
  const a = preisAmpel(zeile, preisBrutto);
  if (a.preisNetto === null || zeile?.sk === null || zeile?.waren === null || !last) return null;
  const gesamt = last.gesamt || 0; const fix = Math.max(0, zeile.fix || 0); const zeit = zeile.zeit || 0;
  const personalMonat = (last.lohn ?? 0) + (last.eigen?.betrag ?? 0);
  const kat = last.fix?.jeKategorie || {}; const mieteMonat = ((kat.miete?.summe || 0) + (kat.standgebuehr?.summe || 0)) * (last.fix?.gesamt > 0 ? last.fixJeOffen / last.fix.gesamt : 1);
  const anteil = (x) => (gesamt > 0 ? x / gesamt : 0);
  const ware = zeile.waren;
  const personal = Math.max(0, fix * anteil(personalMonat) + zeit);
  const miete = fix * anteil(mieteMonat);
  const neben = Math.max(0, zeile.sk - ware - personal - miete);
  const steuer = preisBrutto - a.preisNetto;
  return { ware, personal, miete, neben, steuer, gewinn: a.preisNetto - zeile.sk, brutto: preisBrutto, quote: a.quote, ampel: a.ampel };
}

// Mischsatz der Umsatzsteuer auf den Tagesumsatz (Etappe 5): eigener Wert, sonst aus der Karte (Speisen 7 %, Getränke 19 %,
// gewichtet mit Preis × Menge), sonst 7 %. Der Tagesumsatz aus der Kasse ist brutto; der Zähler rechnet netto.
// Paket 3 (16.10.2026), M2: ohne echte Mengen (mengenJeMonat verteilt gleichmäßig, eine Cola zählt wie ein Döner) ist der Mischsatz
// eine Schätzung – geschaetzt: true wandert in Zähler und Monatsziel. Keine neue Mengenabfrage; eigener Satz = nicht geschätzt.
export function umsatzSteuerSatz(stand) {
  if (typeof stand.betrieb?.steuerSatz === "number") return { satz: stand.betrieb.steuerSatz, quelle: "eigen", geschaetzt: false };
  const mitPreis = (stand.gerichte || []).filter((g) => typeof g.preis === "number" && g.preis > 0);
  if (mitPreis.length) {
    const { mengen, geschaetzt } = mengenJeMonat(stand);
    let s = 0, n = 0;
    for (const g of mitPreis) { const w = g.preis * (mengen[g.id] || 1); s += w * steuersatzGericht(g); n += w; }
    if (n > 0) return { satz: Math.round(s / n * 10000) / 10000, quelle: "karte", geschaetzt };
  }
  return { satz: 0.07, quelle: "standard", geschaetzt: true };
}

// Paket 3 (16.10.2026), M4: eine Warnstufe für den Wareneinsatz-Anteil am Nettoumsatz, für Umsatz-Seite, Büro „Monat & Zähler“ und
// Gerichte im Vergleich. null = unauffällig; "hoch" ab 50 %, "sehrHoch" ab 65 %. Im Laden (home.js) wird sie bewusst NICHT gezeigt.
export const WARENEINSATZ_WARNUNG_AB = 0.5;
export function wareneinsatzWarnung(quote) {
  if (typeof quote !== "number" || !Number.isFinite(quote)) return null;
  if (quote >= 0.65 - 1e-9) return "sehrHoch";
  if (quote >= WARENEINSATZ_WARNUNG_AB - 1e-9) return "hoch";
  return null;
}

// Paket 3 (16.10.2026), M15/E2: Branchen-Richtwert Wareneinsatz, wenn weder Belege noch eine Karte mit Einkaufspreisen eine Quote liefern.
// Quelle (geprüft 16.10.2026): BMF-Richtsatzsammlung für das Kalenderjahr 2025, Gewerbeklasse „Imbissstuben u. Ä.“ (56103.0/56109.0),
// Rohgewinn I 59–68–77 % des wirtschaftlichen Umsatzes → Wareneinsatz 23–32–41 %, Mittel 32 %. Immer als Schätzung (≈) gekennzeichnet.
export const RICHTWERT_WARENEINSATZ = { quote: 0.32, min: 0.23, max: 0.41, quelle: "BMF-Richtsatzsammlung Kalenderjahr 2025, Imbissstuben u. Ä. (56103.0)", stand: "2026-10-16" };

// Einheit wechseln, Zahl mitnehmen: 180 g -> 0,18 kg, 10 kg -> 10000 g (Review Etappe 2, Punkt 5).
export function mengeUmrechnen(menge, von, nach) {
  if (menge === null || menge === undefined) return null;
  const fv = EINHEITEN[von]?.f, fn = EINHEITEN[nach]?.f;
  if (!fv || !fn || EINHEITEN[von].basis !== EINHEITEN[nach].basis) return menge;
  return Math.round(menge * fv / fn * 1000) / 1000;
}

// ======================= Etappe 3: Schwund, Tagesnotiz, Läden-Übersicht =======================
import { heute, heuteGeschaeft, uid, SITZUNG } from "./util.js";
import { reinigungMonat } from "./reinigung.js";

// Vorgangsarten nach Dossier C9 (drei Arten, nie vermischt):
//  1 = Verderb, Bruch, Zubereitungsfehler, nicht verkauft – bewertet zu Einkaufspreisen
//  2 = Personalverzehr – bewertet nach Sachbezugswerten (SvEV 2026)
//  3 = Eigenverzehr des Inhabers – BMF-Pauschbeträge oder Einzelaufzeichnung; hier Einzelaufzeichnung
// Etappe 5: drei Wege in zwei Tipps – gericht (Teller weg), rohware (Artikel weg), eimer (nur gewogen). Alte Arten bleiben lesbar.
export const SCHWUND_ARTEN = { verderb: 1, bruch: 1, fehler: 1, nichtverkauft: 1, gericht: 1, rohware: 1, eimer: 1, personal: 2, eigen: 3 };
export const FRAKTIONEN = ["bio", "rest", "verpackung", "glas", "papier", "fett"];
// Sachbezugswerte 2026 (SvEV): 345 € je Monat, kalendertäglich 11,50 €, Frühstück 2,37 €, Mittag und Abend je 4,57 € (Prüfung Teil 3).
// Pauschbetrag unentgeltliche Wertabgaben 2026, Gaststätten aller Art mit kalten und warmen Speisen, je Person und Jahr netto
// (3.173 € zu 7 % + 828 € zu 19 %): BMF-Schreiben vom 23.12.2025, IV D 3 - S 1547/00006/007/021 – gelesen bei steuerschroeder.de
// (Rechtsstand 02.07.2026) und steuertipps.de, Abruf 20.10.2026. Nur zum Vergleich im Steuer-Ordner, keine Buchung (Baris 20.10.2026: P1).
export const PAUSCHBETRAG_EIGEN_2026 = 4001;
export const SVEV_2026 = { fruehstueck: 2.37, mittag: 4.57, abend: 4.57, tag: 11.5, monat: 345 };
// Trennung 2 (17.10.2026): Sachbezug eines Personalessens = Menge × Satz der Mahlzeit (ohne Mahlzeit: Mittag). Vorher zweimal im Bildschirm.
export const sachbezugWert = (menge, mahlzeit) => (Number(menge) || 0) * (SVEV_2026[mahlzeit] ?? SVEV_2026.mittag);
// Trennung 2 (17.10.2026): Schwund-Liste eines Zeitraums, neueste zuerst (Büro „Listen“).
export const schwundEintraege = (stand, { von, bis }) => (stand.schwund || []).filter((e) => e.datum >= von && e.datum <= bis).slice().reverse();

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

// Paket 3 (16.10.2026), M6: EINE Bewertung für jeden Schwund-Eintrag – Momentaufnahme (Feld wert, auch null = kein Preis) bleibt;
// nur Alt-Einträge ohne das Feld werden zum heutigen Einkaufspreis nachbewertet. Genutzt von schwundAuswertung, Zähler (muellJeTag),
// muellHeute und den Listen, damit alle dieselbe Zahl zeigen.
export function eintragWert(e, stand) {
  if ("wert" in e) return typeof e.wert === "number" ? e.wert : null;
  return wertEintrag(e, stand);
}

// Deckungsbeitrag je Portion, mengengewichtet über die Karte (für das Abfall-Äquivalent, Prüfung Befund 2).
export function dbJePortion(stand) {
  if (!(stand.gerichte || []).length) return null;
  const k = kalkulation(stand);
  let s = 0, m = 0;
  for (const z of k.zeilen) if (z.db !== null && z.db > 0) { s += z.db * (z.menge || 1); m += (z.menge || 1); }
  return m > 0 ? s / m : null;
}

// Paket 3 (16.10.2026), M7: Schwund-Zeiträume enden am Geschäftstag (bis 4 Uhr zählt die Nacht zum Vortag).
const tagMinus = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return heuteGeschaeft(d); };
export const zeitraumTage = (n) => ({ von: tagMinus(n - 1), bis: heuteGeschaeft() });
export const monatsZeitraum = () => { const h = heuteGeschaeft(); return { von: h.slice(0, 8) + "01", bis: h }; };

// Auswertung der Schwund-Einträge in einem Zeitraum (Datum als "JJJJ-MM-TT", Grenzen einschließlich).
export function schwundAuswertung(stand, { von, bis }) {
  const out = { muellwert: 0, jeArt: {}, jeFraktion: {}, ohneWert: 0, anzahl: 0,
    personal: { anzahl: 0, svev: 0, waren: 0 }, eigen: { anzahl: 0, waren: 0 }, portionen: null, dbJePortion: null };
  for (const e of stand.schwund || []) {
    if (e.storniert || typeof e.datum !== "string" || e.datum < von || e.datum > bis) continue;
    out.anzahl += 1;
    const wert = eintragWert(e, stand); // Paket 3, M6: eine Bewertung für alle Stellen
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

// Tagesnotiz: Tagesumsatz (brutto) je Datum als Journal – eine Notiz des Wirts, kein Kassenbericht. // W2-T
// Intern rechnet der Zähler damit; in den Ordnern für Steuerberater und Buchhalter erscheint sie nur als Brutto-Notiz
// mit der Kennzeichnung „Notiz – kein Z-Bon, nicht für die Buchung“, nie mit errechneter Umsatzsteuer (js/export_steuer.js).
// Es gilt der jüngste nicht stornierte Eintrag je Datum.
// Nur anhängen (GoBD, Prüfung p04 Nr. 3): Solange das Feld getippt wird, ist der eigene Eintrag ein Entwurf (entwurf: true) und
// nimmt jede Taste auf. Beim Verlassen des Feldes wird er festgeschrieben (tagesnotizFestschreiben). Wer danach ändert, legt einen
// neuen Eintrag an; der alte bleibt stehen, mit storniert, storniertZeit und ersetzt: <id des neuen>. Leeren nimmt zurück, löscht nie.
export function umsatzEintrag(stand, datum) {
  let best = null;
  for (const n of stand.tagesnotizen || []) if (n.datum === datum && !n.storniert && typeof n.umsatz === "number" && (!best || String(n.erfasst || "") >= String(best.erfasst || ""))) best = n;
  return best;
}
// Der eigene, noch nicht festgeschriebene Eintrag dieses App-Starts für Datum und Gerät (auch leer, umsatz: null)
const tagesEntwurf = (stand, datum, geraet) => (stand.tagesnotizen || []).find((n) => n.entwurf && n.sitzung === SITZUNG && n.datum === datum && !n.storniert && (n.geraet || null) === geraet) || null;
function tagesEntwurfAnlegen(stand, datum, umsatz, { nacherfasst, geraet, jetzt }) {
  const n = { id: uid(), datum, umsatz, erfasst: jetzt, nacherfasst: !!nacherfasst, sitzung: SITZUNG, geraet, storniert: false, entwurf: true };
  // Korrektur: die bisher gültigen Einträge dieses Geräts (und alte ohne Gerät) für den Tag bleiben stehen und zeigen auf den neuen
  for (const x of stand.tagesnotizen) if (x.datum === datum && !x.storniert && (!x.geraet || x.geraet === geraet)) { x.storniert = true; x.storniertZeit = jetzt; x.ersetzt = n.id; }
  stand.tagesnotizen.push(n); return n;
}
export function tagesnotizSetzen(stand, datum, umsatz, { nacherfasst = false, geraet = null } = {}) {
  const jetzt = new Date().toISOString();
  const e = tagesEntwurf(stand, datum, geraet);
  if (e) { e.umsatz = umsatz; e.erfasst = jetzt; e.nacherfasst = !!nacherfasst; return e; }
  return tagesEntwurfAnlegen(stand, datum, umsatz, { nacherfasst, geraet, jetzt });
}
// Feld geleert: Entwurf wird leer (zählt nicht); ein festgeschriebener Wert bekommt einen leeren Entwurf als Nachfolger.
export function tagesnotizLoeschen(stand, datum, geraet = null) {
  const jetzt = new Date().toISOString();
  const e = tagesEntwurf(stand, datum, geraet);
  if (e) { e.umsatz = null; e.erfasst = jetzt; return e; }
  if (!(stand.tagesnotizen || []).some((x) => x.datum === datum && !x.storniert && (!x.geraet || x.geraet === geraet))) return null;
  return tagesEntwurfAnlegen(stand, datum, null, { nacherfasst: datum !== heuteGeschaeft(), geraet, jetzt }); // Paket 3, M7: Geschäftstag
}
// Feld verlassen: Entwurf festschreiben. Ein leerer Entwurf war nie ein Wert – er verschwindet, sein Vorgänger bleibt als Rücknahme stehen.
export function tagesnotizFestschreiben(stand, datum, geraet = null) {
  const e = tagesEntwurf(stand, datum, geraet); if (!e) return null;
  if (typeof e.umsatz === "number") { delete e.entwurf; return e; }
  stand.tagesnotizen.splice(stand.tagesnotizen.indexOf(e), 1);
  for (const x of stand.tagesnotizen) if (x.ersetzt === e.id) x.ersetzt = null;
  return null;
}
// Alle offenen Entwürfe dieses App-Starts festschreiben (z. B. beim Wechsel der Ansicht)
export function tagesnotizenFestschreiben(stand) {
  for (const n of (stand.tagesnotizen || []).filter((x) => x.entwurf && x.sitzung === SITZUNG)) tagesnotizFestschreiben(stand, n.datum, n.geraet || null);
} // W2-T Ende
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

// Etappe 5 (Baris 12.10.): keine Grenzwerte abfragen. Ohne eigene Grenze gilt ein Standard-Anhaltswert
// (Kühlung ≤ 7 °C, Tiefkühlung ≤ −18 °C, Warmhalten ≥ 65 °C) – kein Gesetzeswert für jede Ware (Welle 2, p03 H6 / p05 K1). Eigene Werte überschreiben ihn; das Blatt sagt, welcher galt.
export const GRENZEN_STANDARD = { kuehl: { min: null, max: 7 }, tk: { min: null, max: -18 }, warm: { min: 65, max: null } };
// W2-H: Grenze je Ware (k.ware, z. B. "hack", "fisch", "gefluegel") – nur die Datenstelle. Werte kommen erst hinein, wenn sie mit
// Fundstelle belegt und von Baris freigegeben sind (Bauvertrag Welle 2: keine Grenzwerte erfinden). Bis dahin: leer → Standard der Art,
// und grenzenVon meldet wareOhneGrenze, damit das Amt-Blatt „Grenze für die Ware nicht festgelegt“ schreiben kann.
export const GRENZEN_WARE = {}; // Form: { hack: { min: null, max: <belegt> }, … }
export function grenzenVon(k) {
  const wareG = k.ware && GRENZEN_WARE[k.ware] ? GRENZEN_WARE[k.ware] : null;
  const st = wareG || GRENZEN_STANDARD[k.art] || GRENZEN_STANDARD.kuehl;
  const minEigen = typeof k.min === "number", maxEigen = typeof k.max === "number";
  // je Feld: eigener Wert schlägt den Standard; ein leeres Feld behält seinen Standard (Review Etappe 5, Punkt 7)
  let min = minEigen ? k.min : st.min, max = maxEigen ? k.max : st.max;
  if (minEigen && maxEigen && min > max) [min, max] = [max, min]; // beide selbst vertauscht eingegeben (Prüfung 15.10.): als Bereich lesen; nie mit dem Standard mischen
  const g = { min, max, standard: !minEigen && !maxEigen && !wareG };
  if (k.ware && !wareG && !minEigen && !maxEigen) g.wareOhneGrenze = true;
  return g;
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
// W2-H (p01 K3): Abweichungen, die schon im offenen Rundgang stehen – Alarm sofort, nicht erst nach dem Abschluss.
export const rundgangAbweichungen = (stand) => (rundgangOffen(stand)?.messungen || []).filter((m) => m.abweichung && typeof m.wert === "number");
// Ist jede Stelle im Rundgang eingetragen? Dann schließt er sich selbst.
export const rundgangVollstaendig = (stand, r) => !!r && (r.einzel ? r.messungen.some((m) => m.stelle === r.einzel) : aktiveStellen(stand).every((k) => r.messungen.some((m) => m.stelle === k.id)));

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

// Trennung (17.10.2026): offenen Rundgang verwerfen (vorher in screens/kuehl.js) – er stand noch nicht im Journal der Messungen.
export function rundgangVerwerfen(stand, id) { const vorher = (stand.rundgaenge || []).length; stand.rundgaenge = (stand.rundgaenge || []).filter((x) => x.id !== id); return stand.rundgaenge.length < vorher; }

// Schwund-Eintrag für Ware, die nach einer Kühl-Abweichung weggeworfen wurde (Rundgang und Büro „Ware nach Kühl-Abweichung“ buchen gleich).
// w: { ref, menge, einheit, wert } – wert aus wertEintrag (Einkaufspreis) oder null = Wert offen.
function kuehlSchwund(w, { datum, jetzt, grund, messung, nacherfasst = false }) {
  return { id: uid(), datum, erfasst: jetzt, art: "verderb", vorgang: 1, ref: w.ref, menge: w.menge, einheit: w.einheit, fraktion: "bio",
    grund, wert: w.wert, wertOffen: w.wert === null, quelle: "kuehl", messung, nacherfasst, storniert: false };
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
    // W2-H (p03 K1): ein Nachtrag bekommt keine ausgedachte Messzeit. Uhrzeit leer (oder aus einer Eingabe: zeitEingabe); wann nachgetragen wurde, steht in erfasst.
    const zeit = r.nacherfasst ? (typeof m.zeitEingabe === "string" ? m.zeitEingabe : null) : rest.zeit;
    stand.messungen.push({ ...rest, zeit, lfd: lfdGeber ? lfdGeber() : null, geraet, rundgang: r.id, datum, von: r.von, erfasst: jetzt, nacherfasst: !!r.nacherfasst, quelle: r.quelle || null, nachkontrolle: nk, storniert: false });
    if (m.abweichung && (m.massnahmen || []).includes("weggeworfen")) {
      const stelle = (stand.kuehlstellen || []).find((k) => k.id === m.stelle);
      for (const w of weg || []) stand.schwund.push(kuehlSchwund(w, { datum, jetzt, grund: text(stelle?.name || ""), messung: m.id, nacherfasst: !!r.nacherfasst }));
    }
  }
  r.abgeschlossen = jetzt;
  return r;
}

const vgl = (a, b) => { a = String(a); b = String(b); return a < b ? -1 : a > b ? 1 : 0; }; // schneller als localeCompare, für ISO-Daten gleich
export const messungenDerStelle = (stand, stelleId) => imTakt(stand, "ms:" + stelleId, () => (stand.messungen || []).filter((m) => m.stelle === stelleId && !m.storniert).sort((a, b) => vgl(a.datum, b.datum) || vgl(a.zeit, b.zeit)));
// Welche spätere Messung hat eine Nachkontrolle erledigt?
// Erledigt ist eine Nachkontrolle erst durch eine spätere echte Messung INNERHALB der Grenze; ein weiterer Ausreißer zählt nicht (Nachtest Etappe 5, Punkt 7).
export function nachkontrolleErledigt(stand, m) {
  return (stand.messungen || []).filter((x) => x.id !== m.id && x.stelle === m.stelle && !x.storniert && typeof x.wert === "number" && !x.abweichung && !x.nacherfasst && x.datum >= m.datum && (!m.zeit || String(x.zeit) >= String(m.zeit))).sort((a, b) => String(a.zeit).localeCompare(String(b.zeit)))[0] || null;
}

// W2-H (p03 H2): Nachkontrolle mit Zeitfenster. Frist = fälliger Zeitpunkt + 1 Stunde Puffer; bei „nächste Messung“ (und ohne
// gewählte Nachkontrolle) das Ende des Tages der Abweichung. Eine spätere gute Messung nach der Frist heißt „verspätet“, nicht „erledigt“.
export const NACHKONTROLLE_PUFFER_MIN = 60;
const tagesEnde = (iso) => { const [j, mo, d] = iso.split("-").map(Number); return new Date(j, mo - 1, d, 23, 59, 59, 999).getTime(); };
export function nachkontrolleFrist(m) {
  const f = m?.nachkontrolle?.faellig ? Date.parse(m.nachkontrolle.faellig) : NaN;
  return Number.isFinite(f) ? f + NACHKONTROLLE_PUFFER_MIN * 60e3 : tagesEnde(m.datum);
}
// → { status: "erledigt" | "verspaetet" | "offen", messung, stunden (Abstand zur Abweichung, nur bei bekannter Uhrzeit) }
export function nachkontrolleStand(stand, m) {
  const x = nachkontrolleErledigt(stand, m);
  if (!x) return { status: "offen", messung: null, stunden: null };
  const tx = Date.parse(x.zeit); const tm = m.zeit ? Date.parse(m.zeit) : NaN;
  const stunden = Number.isFinite(tx) && Number.isFinite(tm) ? Math.max(1, Math.round((tx - tm) / 3600e3)) : null;
  return { status: Number.isFinite(tx) && tx > nachkontrolleFrist(m) ? "verspaetet" : "erledigt", messung: x, stunden };
}

// W2-H (p03 H1): Was ist mit der Ware? Nur Daten – die Knöpfe baut die Optik-Runde. „Ware weggeworfen“ als Maßnahme zählt schon heute.
export const WARE_ENTSCHEIDUNGEN = ["umgelagert", "weggeworfen", "behalten"]; // Trennung (17.10.2026), Punkt 4: „behalten“ mit Begründung (Büro)
export function wareEntscheidung(m) {
  if (m?.ware && WARE_ENTSCHEIDUNGEN.includes(m.ware.art)) return m.ware.art;
  if ((m?.massnahmen || []).includes("weggeworfen")) return "weggeworfen";
  return null;
}
// Einmal eintragen, mit Zeitstempel. Der Journal-Eintrag wird durch ein neues Objekt ersetzt, damit die Speicherung es sofort sieht.
// grund: Pflicht bei „behalten“ (mindestens 3 Zeichen, höchstens 200), sonst ohne.
export function wareEntscheiden(stand, messungId, art, { von = null, jetzt = new Date().toISOString(), grund = null } = {}) {
  const i = (stand.messungen || []).findIndex((x) => x.id === messungId && !x.storniert);
  const m = i >= 0 ? stand.messungen[i] : null;
  if (!m || !m.abweichung || m.ware || !WARE_ENTSCHEIDUNGEN.includes(art)) return null;
  const g = String(grund ?? "").trim().slice(0, 200);
  if (art === "behalten" && g.length < 3) return null;
  stand.messungen[i] = { ...m, ware: { art, erfasst: jetzt, von, ...(art === "behalten" ? { grund: g } : {}) } };
  return stand.messungen[i];
}
// Trennung (17.10.2026), Punkt 4 – Büro „Ware nach Kühl-Abweichung“: offene Abweichungen der letzten 30 Tage ohne Abschluss
// (dieselbe Auswahl wie der Büro-Hinweis „kuehlMassnahme“ in offen.js), neueste zuerst.
export function offeneWareEntscheidungen(stand, { heuteTag = heute() } = {}) {
  const ab = tagPlus(heuteTag, -30);
  return (stand.messungen || []).filter((m) => !m.storniert && m.abweichung && m.datum >= ab && ["massnahmeOffen", "verspaetet", "ohneMassnahme"].includes(abweichungStand(stand, m)))
    .sort((a, b) => vgl(b.datum, a.datum) || vgl(b.zeit, a.zeit));
}
// Wegwerfen: jede Zeile wird ein Schwund-Eintrag wie im Rundgang (Wert zum Einkaufspreis, sonst offen), danach die Ware-Entscheidung.
// weg: [{ ref: { typ: "artikel" | "frei", name }, menge, einheit }] – mindestens eine Zeile mit Menge > 0. Rückgabe: { messung, schwund } oder null.
export function wareWegwerfen(stand, messungId, weg, { von = null, jetzt = new Date().toISOString(), datum = heute(), grund = "" } = {}) {
  const m = (stand.messungen || []).find((x) => x.id === messungId && !x.storniert);
  const zeilen = (weg || []).filter((w) => w && w.ref && w.menge > 0);
  if (!m || !m.abweichung || m.ware || !zeilen.length) return null;
  const neu = zeilen.map((w) => kuehlSchwund({ ...w, wert: w.ref.typ === "artikel" ? wertEintrag({ ref: w.ref, menge: w.menge, einheit: w.einheit, art: "verderb" }, stand) : null },
    { datum, jetzt, grund, messung: m.id }));
  const messung = wareEntscheiden(stand, m.id, "weggeworfen", { von, jetzt }); if (!messung) return null;
  stand.schwund.push(...neu);
  return { messung, schwund: neu };
}
// Eine Zeile „weggeworfen“ aus Name und Menge: bekannte Ware (Artikel) mit ihrer Einheit, sonst frei in Stück; wert zum Einkaufspreis oder null.
export function wareWegZeile(stand, name, menge) {
  const n = String(name || "").trim(); if (!n || !(menge > 0)) return null;
  const a = (stand.artikel || []).find((x) => x.name === n);
  const einheit = a ? (a.packung?.einheit || a.einheit || "stk") : "stk";
  const ref = a ? { typ: "artikel", name: a.name } : { typ: "frei", name: n };
  return { name: n, ref, menge, einheit, wert: a ? wertEintrag({ ref, menge, einheit, art: "verderb" }, stand) : null };
}
export function wareBehalten(stand, messungId, grund, { von = null, jetzt = new Date().toISOString() } = {}) { return wareEntscheiden(stand, messungId, "behalten", { von, jetzt, grund }); }
// Stand einer Abweichung: behoben | verspaetet | massnahmeOffen | ohneMassnahme (null = keine Abweichung).
// „Chef angerufen“ allein reicht nicht: behoben erst durch eine pünktliche Nachkontrolle in der Grenze oder eine Ware-Entscheidung.
export function abweichungStand(stand, m) {
  if (!m?.abweichung) return null;
  const ware = wareEntscheidung(m);
  if (ware) return "behoben";
  if (!(m.massnahmen || []).length) return "ohneMassnahme";
  const nk = nachkontrolleStand(stand, m).status;
  return nk === "erledigt" ? "behoben" : nk === "verspaetet" ? "verspaetet" : "massnahmeOffen";
}
export const letzteMessung = (stand, stelleId) => messungenDerStelle(stand, stelleId).filter((m) => typeof m.wert === "number").pop() || null;
// Trennung (17.10.2026): aus js/screens/home.js (Laden-Kachel Kühlung) – die schlimmste Abweichung: letzter Wert je Stelle, offener
// Rundgang (W2-H, p01 K3) und heutige Messungen am Kalendertag K; sortiert nach Abstand zur Grenze. null = keine.
export function kuehlSchlimmsteAbweichung(stand, K = heute()) {
  const abw = (stand.messungen || []).filter((m) => m.datum === K && !m.storniert && m.abweichung && typeof m.wert === "number");
  const stellenAbw = [...aktiveStellen(stand).map((k) => letzteMessung(stand, k.id)).filter((m) => m && m.abweichung && typeof m.wert === "number"), ...rundgangAbweichungen(stand)];
  const aus = (m) => typeof m.max === "number" && m.wert > m.max ? m.wert - m.max : typeof m.min === "number" && m.wert < m.min ? m.min - m.wert : 0; // wie weit außerhalb der Grenze
  return [...stellenAbw, ...abw].sort((a, b) => aus(b) - aus(a))[0] || null;
}

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

// W2-H (p03 K2): Ruhetage mit Gültig-ab. stand.kuehl.ruhetageVerlauf = [{ ab: "JJJJ-MM-TT" | "", tage, erfasst }]; ab "" = von Anfang an.
// Eine Änderung gilt ab heute; frühere Lücken bleiben Lücken. Ohne Verlauf (alte Daten) gelten die heutigen Ruhetage wie bisher.
const verlaufVon = (v) => (Array.isArray(v) ? v : []).filter((e) => e && typeof e.ab === "string" && Array.isArray(e.tage)).slice().sort((a, b) => vgl(a.ab, b.ab));
export const ruhetageVerlauf = (stand) => verlaufVon(stand.kuehl?.ruhetageVerlauf);
export function ruhetageAm(stand, datum) {
  const v = verlaufVon(stand.kuehl?.ruhetageVerlauf);
  if (!v.length) return stand.kuehl?.ruhetage || [];
  let x = v[0]; for (const e of v) { if (e.ab <= datum) x = e; else break; }
  return x.tage;
}
export function ruhetageSetzen(stand, tage, datum = heute(), jetzt = new Date().toISOString()) {
  stand.kuehl ??= { takt: 1, ruhetage: [], eingerichtet: false, seit: null };
  const neu = [...new Set(tage)].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  const v = verlaufVon(stand.kuehl.ruhetageVerlauf);
  if (!v.length) v.push({ ab: "", tage: [...(stand.kuehl.ruhetage || [])], erfasst: null });
  const letzte = v[v.length - 1];
  if (letzte.ab === datum) { letzte.tage = neu; letzte.erfasst = jetzt; } else v.push({ ab: datum, tage: neu, erfasst: jetzt });
  const gleich = (a, b) => a.length === b.length && a.every((d) => b.includes(d));
  if (v.length > 1 && v[v.length - 1].ab === datum && gleich(v[v.length - 2].tage, v[v.length - 1].tage)) v.pop(); // am selben Tag zurückgestellt
  stand.kuehl.ruhetageVerlauf = v; stand.kuehl.ruhetage = neu;
  return neu;
}
export function ruhetagUmschalten(stand, tag, datum = heute()) {
  const alt = stand.kuehl?.ruhetage || [];
  if (alt.includes(tag)) { ruhetageSetzen(stand, alt.filter((d) => d !== tag), datum); return true; }
  if (alt.length >= 6) return false; // sieben Ruhetage gibt es nicht
  ruhetageSetzen(stand, [...alt, tag], datum); return true;
}

// Monatsblatt je Stelle: je Tag der Status – ruhetag | puenktlich | teilweise | nacherfasst | nichtGemessen | aus | fehlt | offen (heute, noch nicht gemessen).
// W2-H (p03 H5): „teilweise“ (weniger Messungen als der Takt) und „aus“ (Gerät aus, kein Ruhetag) sind eigene Lücken.
export function monatsblatt(stand, stelleId, { von, bis }) {
  const takt = stand.kuehl?.takt === 2 ? 2 : 1;
  const H = heute(); const liste = messungenDerStelle(stand, stelleId);
  const tage = [];
  const jeTag = new Map(); for (const m of liste) { if (m.datum < von || m.datum > bis) continue; const x = jeTag.get(m.datum); if (x) x.push(m); else jeTag.set(m.datum, [m]); }
  for (let d = von; d <= bis; d = tagPlus(d, 1)) {
    const ms = jeTag.get(d) || [];
    const gemessen = ms.filter((m) => typeof m.wert === "number");
    let status;
    if (stand.kuehl?.seit && d < stand.kuehl.seit && !ms.length) status = "vorher"; // vor der Einrichtung: keine Lücke
    else if (ruhetageAm(stand, d).includes(wochentag(d)) && !gemessen.length) status = "ruhetag";
    else if (!ms.length) status = d > H ? "zukunft" : d === H ? "offen" : "fehlt";
    else if (!gemessen.length) status = ms.some((m) => m.grund === "geraetAus") ? "aus" : "nichtGemessen";
    else if (gemessen.length < takt && d < H) status = "teilweise"; // eine Lücke wiegt mehr als „nachgetragen“; heute kann die zweite noch kommen
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
  // W2-H (p01 K3): eine Abweichung im offenen Rundgang zählt sofort mit
  const jetztAbw = new Set(rundgangAbweichungen(stand).map((m) => m.stelle));
  const letzteAbweichung = stellen.filter((k) => jetztAbw.has(k.id) || letzteMessung(stand, k.id)?.abweichung).length;
  return { eingerichtet: true, bereit: kuehlBereit(stand), stellen: stellen.length, heuteGemessen, fehlt7: fehlt, nachkontrollen: nk.length, ueberfaellig: nk.filter((x) => x.ueberfaellig).length, offenerRundgang: !!offen, letzteAbweichung, abweichungImRundgang: jetztAbw.size };
}

// Schwund-Einträge, die noch keinen Wert haben (aus der Kühlkontrolle „Ware weggeworfen" ohne Preis) – offener Punkt für den Chef.
export const schwundOhneWert = (stand) => (stand.schwund || []).filter((e) => !e.storniert && e.wert === null && e.wertOffen);
export function schwundWertSetzen(e, wert) { if (e.wert !== null && e.wert !== undefined) return false; e.wert = wert; e.wertOffen = false; e.wertGesetzt = new Date().toISOString(); return true; }
