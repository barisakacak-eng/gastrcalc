// Beispiel-Laden (17.10.2026): ein vollständig gefüllter Dönerladen zum Ausprobieren und Vorführen.
// beispielLaden(heute) ist eine reine Funktion ohne Zufall: gleiches Datum (Geschäftstag, JJJJ-MM-TT) = gleicher Laden.
// ALLE Zahlen hier sind erfundene Beispiele – keine Branchenwerte, keine Quelle. Der Laden trägt beispiel: true; die App zeigt das im
// Laden-Kopf (Name), im Büro (Hinweis-Chip) und in jedem Export („BEISPIEL – keine echten Daten“). Einkaufspreise kommen aus den
// Richtpreisen (js/richtpreise.js, als Schätzung markiert) und aus vier Beispiel-Belegen; Zutaten ohne Richtpreis bleiben bewusst ohne Preis.
// Journale: eindeutige Kennungen „bsp-…“, erfasst am selben Tag wie das Datum, nacherfasst: false – die Amt-Exporte zeigen nichts als nachgetragen.
import { leererBetrieb, migrierenBetrieb } from "./store.js";
import { VORLAGEN } from "./data/katalog.js";
import { inBasis, EINHEITEN } from "./data/katalog.js";
import { KATEGORIEN } from "./data/kosten.js";
import { BRANCHENWERTE } from "./data/branchenwerte.js";
import { vorauswahlFuer } from "./data/zwischen.js";
import { gerichtAusVorlage } from "./karte_daten.js"; // Trennung (17.10.2026): vorher aus einem Bildschirm (screens/karte.js)
import { fehlendeRezepteErgaenzen } from "./rezept_baukasten.js";
import { branchenwerteAnwenden } from "./rezept_quelle.js";
import { selbstAnwenden } from "./selbst.js";
import { richtpreiseEinsetzen } from "./richtpreise.js";
import { artikelAusGerichten, zwischenpreiseRechnen, steuersatzAusZutaten, grenzenVon, abweichung, tagPlus, wochentag, NACHKONTROLLE_STUNDEN, preisJeBasis } from "./engine.js";
import { preiseUebernehmen } from "./lieferung.js";
import { planVorschlag, planUebernehmen, aufgabenFuer } from "./putzplan.js";
import { gerichtWeg, rohwareWeg, personalessen } from "./muell.js";
import { inventurStarten, inventurAbschliessen, artikelFuerInventur, mengeSetzen } from "./inventur.js";
import { bedarfGericht, sollVerbrauch, schwundVerbrauch, einkaufMengen } from "./verkauf.js"; // E7 (17.10.2026)
import { getraenkSetzen } from "./getraenk.js"; // Getränke (18.10.2026): Gebinde, Marke, Pfand, offener Ausschank im Beispiel
import { aktionVorschlag } from "./aktion_plan.js"; // Aktion planen (18.10.2026): Vorschlag mit Begründung an der Beispiel-Aktion

export const BEISPIEL_NAME = "Beispiel-Döner";
export const BEISPIEL_TAGE = 30;           // so viele Tage vor heute sind gefüllt (heute selbst ist noch offen)
const PERSON = { ab: "bsp-p-ab", cd: "bsp-p-cd" };

// Beispiel-Laden (17.10.2026): Ortszeit eines Tages als ISO-Zeitstempel
const zeit = (datum, h, m = 0) => { const [j, mo, d] = datum.split("-").map(Number); return new Date(j, mo - 1, d, h, m).toISOString(); };
const rund2 = (x) => Math.round(x * 100) / 100;

// Beispiel-Laden (17.10.2026): Karte – [Name, Verkaufspreis brutto (Beispiel), Portionen je Tag (Beispiel), eigenes Gericht?]
// Döner-Box, Pide und Ayran gibt es nicht als Vorlage: eigenes Gericht, Rezept aus dem Baukasten (Ayran: Getränk mit 1 Flasche).
const KARTE = [
  ["Döner Kebab", 8.0, 35], ["Dürüm Döner", 9.0, 18], ["Dönerteller", 14.5, 8], ["Hähnchendöner", 7.5, 8],
  ["Döner-Box", 7.0, 10, "eigen"], ["Lahmacun", 5.5, 6], ["Pide mit Käse", 9.5, 4, "eigen"], ["Falafel-Dürüm", 7.5, 4],
  ["Adana-Spieß", 13.5, 3], ["Pommes frites (Beilage)", 3.5, 12], ["Cola 0,33 l", 2.5, 14], ["Ayran 0,25 l", 2.0, 10, "getraenk"],
  ["Mineralwasser 0,25 l", 2.0, 6], ["Eistee 0,33 l", 2.5, 4],
];
// Beispiel-Laden (17.10.2026): Tagesumsatz brutto je Wochentag (1 = Montag … 6 = Samstag), Sonntag Ruhetag
const UMSATZ_TAG = { 1: 790, 2: 830, 3: 870, 4: 920, 5: 1180, 6: 1350 };
// Beispiel-Laden (17.10.2026): wöchentlicher Beleg vom Großhandel – [Artikel, Anzahl, Gebinde, Inhalt, Einheit, Preis je Gebinde netto, USt]
// E7 (17.10.2026): Die Anzahl je Beleg wird jetzt aus den Beispielverkäufen abgeleitet (damit Einkauf, Verkauf und Inventur zusammenpassen);
// die Anzahl hier gilt nur noch, wenn eine Ware in keinem Rezept steht.
const LIEFERUNG = [
  ["Dönerspieß Kalb/Pute", 6, "karton", 15, "kg", 156.0, 0.07], ["Hähnchenspieß", 2, "karton", 10, "kg", 79.0, 0.07],
  ["Pommes frites", 10, "karton", 2.5, "kg", 6.9, 0.07], ["Eisbergsalat", 15, "lose", 1, "kg", 1.9, 0.07],
  ["Tomaten", 3, "kiste", 5, "kg", 11.0, 0.07], ["Cola 0,33 l", 6, "kiste", 24, "stk", 13.9, 0.19],
  ["Ayran 0,25 l", 4, "kiste", 20, "stk", 9.0, 0.07], ["Dönertüte", 1, "karton", 1000, "stk", 29.0, 0.19],
  ["Weizenmehl Typ 550", 2, "sack", 25, "kg", 17.5, 0.07], ["Frischhefe", 1, "karton", 1, "kg", 3.2, 0.07], ["Salz", 1, "sack", 5, "kg", 2.4, 0.07],
  ["Joghurt natur", 2, "eimer", 10, "kg", 17.5, 0.07], ["Mayonnaise", 1, "eimer", 10, "kg", 26.0, 0.07], ["Knoblauch", 1, "sack", 2, "kg", 6.8, 0.07],
  ["Petersilie", 1, "kiste", 1, "kg", 4.5, 0.07], ["Lammhackfleisch", 1, "karton", 5, "kg", 44.0, 0.07], ["Pizzakäse gerieben", 1, "beutel", 2, "kg", 12.6, 0.07],
  ["Alufolie-Bogen", 1, "karton", 500, "stk", 15.9, 0.19], ["Pommesschale", 1, "karton", 500, "stk", 18.5, 0.19],
  ["Mineralwasser 0,25 l", 2, "kiste", 24, "stk", 7.2, 0.19], ["Eistee", 1, "kiste", 9, "l", 8.1, 0.19],
];
// E7 (17.10.2026): Waren, die bisher ohne Beleg blieben, kommen mit auf den Beleg – Preis je Gebinde = bisheriger (Richt-)Preis je Einheit × Inhalt,
// damit die Kalkulation gleich bleibt. [Artikel, Gebinde, Inhalt, Einheit, USt]. Adana-Spieß und Pide-Brot bleiben ohne Beleg (Ladenhüter, totes Lager).
const ZUKAUF = [
  ["Zwiebeln", "sack", 10, "kg", 0.07], ["Weißkohl", "kiste", 10, "kg", 0.07], ["Dürüm-Wrap", "karton", 100, "stk", 0.07], ["Hirtenkäse / Feta", "eimer", 2, "kg", 0.07],
  ["Menüschale", "karton", 250, "stk", 0.19], ["Joghurtsauce", "eimer", 5, "kg", 0.07], ["Dönergewürz", "packung", 1, "kg", 0.07], ["Sonnenblumenöl", "kanister", 10, "l", 0.07],
  ["Pizzakarton 30 cm", "karton", 100, "stk", 0.19], ["Falafelbällchen", "karton", 200, "stk", 0.07], ["Beilagenschale", "karton", 500, "stk", 0.19], ["Trinkbecher 0,3 l", "karton", 1000, "stk", 0.19],
];
// E7 (17.10.2026): Beispielverkäufe – Adana-Spieß verkauft sich im Beispiel nicht (Ladenhüter); Cola fehlt bei der zweiten Inventur (Schwund-Verdacht)
const VERKAUF_FEST = { "Adana-Spieß": 0 };
const SCHWUND_BEISPIEL = { name: "Cola 0,33 l", menge: 72 }; // Stück, die bei der zweiten Inventur fehlen (Beispiel)
// Bestand (17.10.2026): eine Ware ist bei der zweiten Inventur knapp (reicht ≈ 1–1,5 Öffnungstage) – der letzte Einkauf war kleiner (abgerundet statt
// aufgerundet), damit „Lager & Bestellen“ im Beispiel an jedem Wochentag einen dringenden Bestellvorschlag zeigt. Inventur, Einkauf und Verkauf passen weiter zusammen.
export const KNAPP_BEISPIEL = { name: "Dönerspieß Kalb/Pute", tage: 1.5 };
// Stufe 1 (17.10.2026): Haltbarkeit auf dem letzten Beleg – Hähnchenspieß mit Verbrauchsdatum morgen (Hinweis „nicht mehr verwenden ab …“,
// nie Abverkauf), Ayran mit MHD in 3 Tagen (es bleibt laut Verbrauch etwas übrig → Abverkaufs-Vorschlag). Beispielwerte, kein echtes Datum.
export const HALTBAR_BEISPIEL = [{ name: "Hähnchenspieß", art: "verbrauch", tage: 1 }, { name: "Ayran 0,25 l", art: "mhd", tage: 3 }];
const FEIN = ["Ayran 0,25 l", "Cola 0,33 l", "Pommes frites (Beilage)", "Lahmacun", "Döner Kebab"]; // damit die Tagessumme genau aufgeht
// Mengen je Gericht für einen Tag: Portionen der Karte, auf den Tagesumsatz skaliert, mit fester Schwankung, dann genau auf den Umsatz gebracht
export function beispielVerkaufTag(umsatz, i) {
  const preis = KARTE.map((k) => k[1]); const cent = preis.map((p) => Math.round(p * 100));
  const basis = KARTE.map(([n, , m]) => (n in VERKAUF_FEST ? VERKAUF_FEST[n] : m));
  const f = umsatz / basis.reduce((x, m, k) => x + m * preis[k], 0);
  const m = basis.map((b, k) => (b ? Math.max(0, Math.round(b * f + (((i * 7 + k * 5) % 5) - 2) * 0.3)) : 0));
  const d = KARTE.findIndex((k) => k[0] === "Döner Kebab");
  let r = Math.round(umsatz * 100) - m.reduce((x, q, k) => x + q * cent[k], 0);
  while (r >= 800) { m[d] += 1; r -= 800; } while (r <= -800 && m[d] > 0) { m[d] -= 1; r += 800; }
  const fi = FEIN.map((n) => KARTE.findIndex((k) => k[0] === n)); let best = null;
  const geh = (j, rest, adj, teuer) => {
    if (best && teuer >= best.teuer) return;
    if (j === fi.length) { if (rest === 0) best = { adj: adj.slice(), teuer }; return; }
    for (const a of [0, 1, -1, 2, -2, 3, -3]) { if (m[fi[j]] + a < 0) continue; adj[j] = a; geh(j + 1, rest - a * cent[fi[j]], adj, teuer + Math.abs(a)); }
  };
  geh(0, r, new Array(fi.length).fill(0), 0);
  if (best) best.adj.forEach((a, j) => { m[fi[j]] += a; });
  return m;
}
// Beispiel-Laden (17.10.2026): nicht auf dem Beleg; seit dem Richtpreis-Nachtrag (17.10.) kommen Adana-Spieß, Falafelbällchen und Pizzakarton 30 cm aus den Richtpreisen (≈)
// Beispiel-Laden (17.10.2026): Bestand bei den zwei Inventuren in Grundeinheit (g, ml, Stück); Rest nach Einheit
const BESTAND = {
  "Dönerspieß Kalb/Pute": [30000, 22500], "Hähnchenspieß": [10000, 7500], "Pommes frites": [15000, 12500], "Eisbergsalat": [4000, 3000],
  "Tomaten": [5000, 4000], "Cola 0,33 l": [72, 60], "Ayran 0,25 l": [40, 30], "Dönertüte": [600, 450], "Dürüm-Wrap": [60, 45],
};
const BESTAND_STANDARD = { g: [2000, 1500], ml: [3000, 2000], stk: [80, 60] };
// Beispiel-Laden (17.10.2026): Kühlstellen – Standardnamen (folgen in der Anzeige der Sprache), Grundwert in °C
const STELLEN = [
  { id: "bsp-k-1", name: "Kühlschrank", art: "kuehl", typ: "kuehlschrank", basis: 3.4 },
  { id: "bsp-k-2", name: "Kühlschrank 2", art: "kuehl", typ: "kuehlschrank", basis: 4.1 },
  { id: "bsp-k-3", name: "Tiefkühler", art: "tk", typ: "tiefkuehler", basis: -20.4 },
  { id: "bsp-k-4", name: "Saladette", art: "kuehl", typ: "saladette", basis: 4.6 },
];

export function beispielLaden(heute, { name = BEISPIEL_NAME, jetzt = null } = {}) {
  const start = tagPlus(heute, -BEISPIEL_TAGE);
  const tage = []; for (let i = BEISPIEL_TAGE; i >= 1; i--) tage.push(tagPlus(heute, -i)); // start … gestern
  const offen = (d) => wochentag(d) !== 0;
  const s = leererBetrieb();
  Object.assign(s, { id: "bsp-laden-" + heute, angelegt: zeit(start, 8), phase: "app", weg: "schnell", schritt: 5, schrittId: "fertig-schnell", beispiel: true, ladenArt: "doener" });
  s.betrieb = { ...s.betrieb, name: String(name).slice(0, 40), format: "imbiss", kuechen: ["doener"], rechtsform: "einzel", tageProWoche: 6,
    reinigung: { wer: "selbst", firmaBetrag: null, minutenTag: 45, durch: "team", mittelSchaetzung: 45, basis: "brutto" } };
  // Beispiel-Laden (17.10.2026): Kosten je Monat (Beispielbeträge)
  s.team = { personen: 2, stundenProPerson: 160, lohnkosten: 6200, eigenerLohn: 3000, eigenerLohnStatus: "eigen" };
  s.kosten = [
    { id: "bsp-kosten-miete", posten: "miete", kategorie: "miete", betrag: 2400, status: "bekannt", periode: "monat", basis: "netto", satz: 19 },
    { id: "bsp-kosten-strom", posten: "strom", kategorie: "energie", betrag: 520, status: "bekannt", periode: "monat", basis: "brutto", satz: 19, sammel: "strom-gas" },
    { id: "bsp-kosten-vers", posten: "versicherungen", kategorie: "versicherung", betrag: 140, status: "bekannt", periode: "monat", basis: "netto", satz: 19 },
  ];
  s.kostenKategorienGeprueft = [...KATEGORIEN];
  s.verkauf = { zielgewinn: 10, zielgewinnStatus: "vorschlag", bestellungenTag: KARTE.reduce((n, k) => n + k[2], 0), warenQuote: null };
  s.personen = [{ id: PERSON.ab, kuerzel: "AB", aktiv: true, entfernt: false }, { id: PERSON.cd, kuerzel: "CD", aktiv: true, entfernt: false }];
  s.belehrungen = [
    { id: "bsp-bel-ab", person: PERSON.ab, datum: tagPlus(heute, -400), art: "erst", erfasst: zeit(tagPlus(heute, -400), 15), storniert: false },
    { id: "bsp-bel-cd", person: PERSON.cd, datum: tagPlus(heute, -120), art: "erst", erfasst: zeit(tagPlus(heute, -120), 15), storniert: false },
  ];

  // Beispiel-Laden (17.10.2026): Karte aus den Vorlagen, Rezepte aus Vorlage bzw. Baukasten, Startwerte „selbst gemacht“ wie im Schnellstart
  const vorlage = (n) => { for (const [bereich, liste] of Object.entries(VORLAGEN)) { const v = liste.find((x) => x.name === n); if (v) return { ...v, bereich }; } return null; };
  s.gerichte = KARTE.map(([n, preis, mengeTag, art], i) => {
    const id = `bsp-g-${i + 1}`;
    if (art === "getraenk") { const zutaten = [{ name: n, menge: 1, einheit: "stk" }];
      return { id, name: n, bereich: "alkoholfrei", klasse: "getraenk", zeit: 1, vorlage: false, zutaten, preis, mengeTag, steuer: steuersatzAusZutaten(zutaten) }; }
    if (art === "eigen") return { id, name: n, bereich: null, klasse: "haupt", zeit: 5, vorlage: false, zutaten: [], preis, mengeTag, steuer: 0.07 };
    return { ...gerichtAusVorlage(vorlage(n)), id, preis, mengeTag };
  });
  s.gerichte.forEach((g, i) => { g.plu = String(101 + i); });
  // 27.10.2026 (Persona-Test Türkisch): Vorlagen-Gerichte tragen den Namen in der App-Sprache – im Beispiel immer über die Kartenzeile suchen, nie über den deutschen Namen
  const NACH_KARTE = new Map(KARTE.map(([n], i) => [n, s.gerichte[i]]));
  fehlendeRezepteErgaenzen(s);
  selbstAnwenden(s, vorauswahlFuer("doener").filter((k) => k !== "adana")); s.selbstAutoArt = "doener"; // 20.10.2026: Adana bleibt im Beispiel gekauft (Ladenhüter mit totem Lager)
  s.artikel = artikelAusGerichten(s);
  if (BRANCHENWERTE.werte.length) branchenwerteAnwenden(s, BRANCHENWERTE.werte, { datum: start });
  s.branchenVersion = BRANCHENWERTE.version;
  const rp = richtpreiseEinsetzen(s, { datum: start }); zwischenpreiseRechnen(s);
  // Getränke (18.10.2026): Beispielwerte, keine echten Daten – Cola als Markengetränk in der Glasflasche (Mehrweg-Kiste à 24, Pfand als Info),
  // Eistee offen im Becher aus der 1,5-l-PET-Flasche (Kiste 6 × 1,5 l = 9 l, Schankverlust 0 % = Standard), Ayran im fertigen Becher, Wasser in der Glasflasche.
  // Rezepte und Wareneinsatz bleiben dabei gleich (Eistee: 330 ml aus dem Großgebinde wie in der Vorlage).
  for (const [n, f] of [["Cola 0,33 l", { gebinde: "glas", marke: "Fritz-Kola", pfand: 0.08, einkauf: "glas" }], ["Eistee 0,33 l", { gebinde: "becher", quelle: "Eistee", flasche: 1.5, einkauf: "pet" }],
    ["Ayran 0,25 l", { gebinde: "becher", einkauf: "becher" }], ["Mineralwasser 0,25 l", { gebinde: "glas", einkauf: "glas" }]]) {
    const g = NACH_KARTE.get(n); if (g) getraenkSetzen(s, g.id, f);
  }

  // Beispiel-Laden (17.10.2026): Kühlung – 4 Stellen, morgens und abends, Sonntag Ruhetag
  s.kuehlstellen = STELLEN.map((k, i) => ({ id: k.id, name: k.name, art: k.art, typ: k.typ, min: null, max: null, reihe: i, archiviert: false }));
  s.kuehl = { takt: 2, ruhetage: [0], ruhetageVerlauf: [{ ab: "", tage: [0], erfasst: null }], eingerichtet: true, seit: start };

  // Beispiel-Laden (17.10.2026): Putzplan nach Laden-Art, gilt ab dem ersten Tag
  planUebernehmen(s, planVorschlag(s), start, zeit(start, 9));

  // Beispiel-Laden (17.10.2026): Zählhilfe für die zwei Inventuren (Menge in Gebinden des Artikels)
  const zaehlen = (inv, idx) => { for (const z of artikelFuerInventur(s, inv).liste) {
    const basis = EINHEITEN[z.packung?.einheit || z.artikel?.einheit]?.basis || "stk";
    const soll = (BESTAND[z.name] || BESTAND_STANDARD[basis] || BESTAND_STANDARD.stk)[idx];
    const je = z.packung?.menge > 0 ? inBasis(z.packung.menge, z.packung.einheit) : inBasis(1, z.artikel?.einheit || "stk");
    mengeSetzen(inv, z.name, Math.round((soll / (je || 1)) * 4) / 4);
  } };

  // Beispiel-Laden (17.10.2026): vier Belege vom Großhandel (jeden Montag, sonst nächster Öffnungstag); Preise gehen in die Artikel
  const lieferTage = [-28, -21, -14, -7].map((n) => { let d = tagPlus(heute, n); while (!offen(d)) d = tagPlus(d, 1); return d; });
  // E7 (17.10.2026): Beispielverkäufe je Öffnungstag (Summe Menge × Preis = Tagesumsatz) und daraus der Bedarf je Ware für die Belege
  const umsatzAm = (i, d) => UMSATZ_TAG[wochentag(d)] + ((i * 37) % 7 - 3) * 15;
  const verkauf = tage.map((d, i) => (offen(d) ? { d, i, mengen: beispielVerkaufTag(umsatzAm(i, d), i) } : null)).filter(Boolean);
  const idx0 = Object.fromEntries(s.artikel.map((x) => [x.name, x]));
  const bedarf = {}; for (const v of verkauf) v.mengen.forEach((q, k) => { if (q > 0) for (const x of bedarfGericht(s.gerichte[k], idx0).bedarf) bedarf[x.name] = (bedarf[x.name] || 0) + x.menge * q; });
  const bedarfSeit = {}; for (const v of verkauf) if (v.d > start) v.mengen.forEach((q, k) => { if (q > 0) for (const x of bedarfGericht(s.gerichte[k], idx0).bedarf) bedarfSeit[x.name] = (bedarfSeit[x.name] || 0) + x.menge * q; }); // Bestand (17.10.2026): nach der ersten Inventur
  bedarf[SCHWUND_BEISPIEL.name] = (bedarf[SCHWUND_BEISPIEL.name] || 0) + SCHWUND_BEISPIEL.menge; // was bei der Inventur fehlt, wurde vorher gekauft
  const ziel = (n, basisEinheit) => (BESTAND[n] || BESTAND_STANDARD[basisEinheit] || BESTAND_STANDARD.stk);
  const zukauf = ZUKAUF.map(([n, gebinde, inhalt, einheit, satz]) => { const x = idx0[n]; const pj = x ? preisJeBasis(x) : null;
    return pj === null ? null : [n, 0, gebinde, inhalt, einheit, rund2(pj * inBasis(inhalt, einheit)), satz]; }).filter(Boolean);
  const anzahlJeBeleg = (n, inhalt, einheit, alt) => { // Gebinde je Beleg: Bedarf + 5 % + Endbestand − Anfangsbestand, auf vier Belege verteilt (aufgerundet, Summe genau)
    const je = inBasis(inhalt, einheit); const b = EINHEITEN[einheit]?.basis || "stk"; const [anfang, ende] = ziel(n, b);
    if (!(bedarf[n] > 0)) return () => alt;
    if (n === KNAPP_BEISPIEL.name) { // Bestand (17.10.2026): Endbestand ≈ 1,5 Tage Verkauf, Gebinde abgerundet
      const nTage = verkauf.filter((v) => v.d > start).length; const b = bedarfSeit[n] || 0;
      const rest = Math.max(0, b + KNAPP_BEISPIEL.tage * b / Math.max(1, nTage) - anfang) / je;
      return (k) => Math.floor(rest * (k + 1) / 4 + 1e-9) - Math.floor(rest * k / 4 + 1e-9);
    }
    const gesamt = Math.max(0, bedarf[n] * 1.05 + ende - anfang) / je;
    return (k) => Math.ceil(gesamt * (k + 1) / 4 - 1e-9) - Math.ceil(gesamt * k / 4 - 1e-9);
  };
  const beleg = [...LIEFERUNG, ...zukauf].map(([n, menge, gebinde, inhalt, einheit, preis, satz]) => ({ n, gebinde, inhalt, einheit, preis, satz, anzahl: anzahlJeBeleg(n, inhalt, einheit, menge) }));
  lieferTage.forEach((d, i) => {
    const zeilen = beleg.filter((x) => s.artikel.some((a) => a.name === x.n && a.herkunft !== "selbst")).map((x) => ({ ...x, menge: x.anzahl(i) })).filter((x) => x.menge > 0).map(({ n, menge, gebinde, inhalt, einheit, preis, satz }) => {
      const netto = rund2(menge * preis);
      return { name: n, artikel: n, menge, gebinde, inhaltMenge: inhalt, inhaltEinheit: einheit, inhaltAnzahl: einheit === "stk" ? inhalt : null, einzelpreis: preis, jeKg: false,
        gesamt: netto, netto, steuersatz: satz, jeEinheit: rund2(preis / inhalt * 10000) / 10000, jeEinheitEinheit: einheit, sicher: true };
    });
    const summeNetto = rund2(zeilen.reduce((x, z) => x + z.netto, 0)); const summeBrutto = rund2(zeilen.reduce((x, z) => x + z.netto * (1 + z.steuersatz), 0));
    const l = { id: `bsp-lief-${i + 1}`, datum: d, erfasst: zeit(d, 10, 15), geraet: null, lieferant: "Großhandel (Beispiel)", typ: "rechnung", basis: "netto", quelle: "text",
      rechnungNr: `BSP-${String(i + 1).padStart(4, "0")}`, summeNetto, summeBrutto, pfand: 0, zeilen, storniert: false, abdruck: "" };
    if (i === lieferTage.length - 1) for (const hb of HALTBAR_BEISPIEL) { const z = zeilen.find((x) => x.artikel === hb.name); if (z) z.haltbar = { art: hb.art, datum: tagPlus(heute, hb.tage), erfasst: zeit(d, 10, 16) }; } // Stufe 1 (17.10.2026)
    s.lieferungen.push(l); preiseUebernehmen(s, l);
  });
  zwischenpreiseRechnen(s);
  for (const a of s.artikel) if (a.herkunft === "selbst") a.preisHistorie = [];
  // erste Inventur am ersten Tag – erst hier gezählt, damit sie mit denselben Gebinden und Preisen rechnet wie die zweite (Beispiel)
  const inv1 = inventurStarten(s, { datum: start, jetzt: zeit(start, 15) }); inv1.id = "bsp-inv-1";
  zaehlen(inv1, 0); inventurAbschliessen(s, inv1, { datum: start, jetzt: zeit(start, 16) }); // errechnete Preise: kein Verlauf mit dem Tag der Erzeugung

  // Beispiel-Laden (17.10.2026): Tagesumsätze, Müll, Personalessen, Kühl-Rundgänge und Putz-Haken je Öffnungstag
  const g = (n) => NACH_KARTE.get(n) || s.gerichte.find((x) => x.name === n);
  const a = (n) => s.artikel.find((x) => x.name === n);
  const fest = (e, d, h, m, n) => { e.id = `bsp-schwund-${d}-${n}`; e.erfasst = zeit(d, h, m); e.nacherfasst = false; return e; };
  let rundgangNr = 0;
  const abweichungTag = (() => { let d = tagPlus(heute, -12); while (!offen(d)) d = tagPlus(d, -1); return d; })();
  const putzLuecke = new Set([-16, -5].map((n) => { let d = tagPlus(heute, n); while (!offen(d)) d = tagPlus(d, 1); return d; }));
  tage.forEach((d, i) => {
    if (!offen(d)) return;
    const wt = wochentag(d);
    // Umsatz: Wochentag plus feste Schwankung (−45 … +45 €)
    const umsatz = UMSATZ_TAG[wt] + ((i * 37) % 7 - 3) * 15;
    s.tagesnotizen.push({ id: `bsp-umsatz-${d}`, datum: d, umsatz, erfasst: zeit(d, 22, 40), nacherfasst: false, geraet: null, storniert: false });
    // Müll an etwa jedem dritten Tag (10 Tage)
    if (i % 3 === 1) {
      fest(gerichtWeg(s, g("Döner Kebab"), { datum: d, anzahl: 1 }), d, 14, 10, 1);
      if (i % 2) fest(rohwareWeg(s, a("Tomaten"), { datum: d, menge: 500, einheit: "g" }), d, 17, 30, 2);
      else fest(rohwareWeg(s, a("Eisbergsalat"), { datum: d, menge: 800, einheit: "g" }), d, 17, 30, 2);
      if (wt === 6 || wt === 5) fest(gerichtWeg(s, g("Pommes frites (Beilage)"), { datum: d, anzahl: 2 }), d, 21, 50, 3);
    }
    // Personalessen an jedem vierten Tag
    if (i % 4 === 2) { const e = fest(personalessen(s, g(i % 8 === 2 ? "Dürüm Döner" : "Döner-Box"), { datum: d, mahlzeit: "mittag" }), d, 15, 0, 4); e.von = i % 8 === 2 ? PERSON.ab : PERSON.cd; }
    // Kühlung: Rundgang morgens (AB) und abends (CD); am Abweichungstag Kühlschrank 2 morgens zu warm, Maßnahme, Nachkontrolle nach 1 Stunde
    for (const [h, m, von, teil] of [[9, 40, PERSON.ab, 0], [21, 30, PERSON.cd, 1]]) {
      rundgangNr += 1; const rid = `bsp-rund-${rundgangNr}`;
      STELLEN.forEach((k, j) => {
        const stelle = s.kuehlstellen[j]; const gr = grenzenVon(stelle);
        const zu = abweichungTag === d && teil === 0 && k.id === "bsp-k-2";
        const wert = zu ? 9.4 : rund2(k.basis + (((i * 7 + j * 3 + teil * 2) % 5) - 2) * 0.4);
        const zt = zeit(d, h, m + j);
        s.messungen.push({ id: `${rid}-${j + 1}`, stelle: stelle.id, zeit: zt, wert, grund: null, min: gr.min, max: gr.max, grenzeStandard: gr.standard, abweichung: abweichung(stelle, wert),
          massnahmen: zu ? ["tuer", "eingestellt"] : [], notiz: "", nachkontrolle: zu ? { art: "h1", faellig: new Date(Date.parse(zt) + NACHKONTROLLE_STUNDEN.h1 * 3600e3).toISOString() } : null,
          lfd: null, geraet: null, rundgang: rid, datum: d, von, erfasst: zeit(d, h, m + 4), nacherfasst: false, quelle: null, storniert: false });
      });
      s.rundgaenge.push({ id: rid, datum: d, von, gestartet: zeit(d, h, m), abgeschlossen: zeit(d, h, m + 4), nacherfasst: false, quelle: null, einzel: null, messungen: [] });
      if (abweichungTag === d && teil === 0) { // Nachkontrolle: nur Kühlschrank 2, eine Stunde später, wieder in der Grenze
        const stelle = s.kuehlstellen[1]; const gr = grenzenVon(stelle); const nid = `bsp-rund-nk-${d}`; const zt = zeit(d, h + 1, m + 1);
        s.messungen.push({ id: `${nid}-1`, stelle: stelle.id, zeit: zt, wert: 5.2, grund: null, min: gr.min, max: gr.max, grenzeStandard: gr.standard, abweichung: false, massnahmen: [], notiz: "",
          nachkontrolle: null, lfd: null, geraet: null, rundgang: nid, datum: d, von, erfasst: zeit(d, h + 1, m + 2), nacherfasst: false, quelle: null, storniert: false });
        s.rundgaenge.push({ id: nid, datum: d, von, gestartet: zeit(d, h + 1, m), abgeschlossen: zeit(d, h + 1, m + 2), nacherfasst: false, quelle: null, einzel: stelle.id, messungen: [] });
      }
    }
    // Putzen: Tagesaufgaben jeden Öffnungstag (an zwei Tagen fehlt eine), Wochenaufgaben montags, Monatsaufgaben am ersten Öffnungstag
    const plan = s.putzplan; let n = 0;
    for (const auf of aufgabenFuer(plan)) {
      const faellig = auf.takt === "tag" || (auf.takt === "woche" && wt === 1) || (auf.takt === "monat" && i <= 1);
      if (!faellig) continue;
      n += 1; if (auf.takt === "tag" && putzLuecke.has(d) && n === 1) continue;
      const von = auf.takt === "tag" ? PERSON.cd : PERSON.ab; const mm = Math.min(59, 5 + n);
      s.putzlog.push({ id: `bsp-putz-${d}-${auf.id}`, aufgabe: auf.id, datum: d, zeit: `22:${String(mm).padStart(2, "0")}`, erfasst: zeit(d, 22, mm), von, storniert: false });
    }
  });

  // E7 (17.10.2026): Verkäufe ins Journal – fast alle Tage aus dem Kassen-Export (dsfinvk), zwei Tage von Hand vom Z-Bon abgelesen
  const handTage = new Set([verkauf[verkauf.length - 3]?.d, verkauf[verkauf.length - 10]?.d].filter(Boolean));
  for (const v of verkauf) {
    const hand = handTage.has(v.d); const imp = hand ? null : `bsp-imp-${v.d}`;
    v.mengen.forEach((q, k) => { if (!(q > 0)) return; const g = s.gerichte[k];
      s.verkaeufe.push({ id: `bsp-vk-${v.d}-${k + 1}`, datum: v.d, gericht: g.id, name: g.name, ...(hand ? {} : { text: g.name }), plu: g.plu, menge: q, umsatzBrutto: hand ? null : rund2(q * g.preis),
        herkunft: hand ? "hand" : "dsfinvk", importId: imp, erfasst: zeit(v.d, 23, 5), geraet: null, storniert: false }); });
  }

  // Beispiel-Laden (17.10.2026): zweite Inventur heute (Preise von heute)
  // nie in der Zukunft: wer zwischen 4 und 8:30 Uhr anlegt, bekommt die Inventur kurz vor „jetzt“ (Beispiel-Laden, 17.10.2026)
  const ende = jetzt && new Date(jetzt) < new Date(zeit(heute, 8, 30)) ? new Date(new Date(jetzt).getTime() - 60000) : new Date(zeit(heute, 8, 30));
  const inv2 = inventurStarten(s, { datum: heute, jetzt: new Date(ende.getTime() - 30 * 60000).toISOString() }); inv2.id = "bsp-inv-2";
  // E7 (17.10.2026): gezählt wird, was nach Einkauf, Verkauf, Müll und Personalessen übrig sein müsste (auf ¼ Gebinde gerundet) –
  // nur bei der Cola fehlt mehr (SCHWUND_BEISPIEL). Waren ohne Verbrauch bleiben, wie sie waren.
  { const von = tagPlus(start, 1); const idx = Object.fromEntries(s.artikel.map((x) => [x.name, x]));
    const mengen = {}; for (const e of s.verkaeufe) if (e.datum >= von && e.datum <= heute) mengen[e.gericht] = (mengen[e.gericht] || 0) + e.menge;
    const soll = sollVerbrauch(s, mengen, idx).artikel; const sw = schwundVerbrauch(s, { von, bis: heute }, idx); const ek = einkaufMengen(s, { von, bis: heute });
    for (const z of artikelFuerInventur(s, inv2).liste) {
      const x = idx[z.name]; const je = x?.packung?.menge > 0 ? inBasis(x.packung.menge, x.packung.einheit) : null; const vorher = inv1.posten[z.name];
      if (!je || typeof vorher !== "number") { mengeSetzen(inv2, z.name, vorher ?? 0); continue; }
      const weg = (soll[z.name]?.menge || 0) + (sw.muell[z.name]?.menge || 0) + (sw.personal[z.name]?.menge || 0) + (z.name === SCHWUND_BEISPIEL.name ? SCHWUND_BEISPIEL.menge : 0);
      mengeSetzen(inv2, z.name, Math.max(0, Math.round((vorher * je + (ek[z.name]?.menge || 0) - weg) / je * 4) / 4));
    } }
  inventurAbschliessen(s, inv2, { datum: heute, jetzt: ende.toISOString() });

  // Menütafel (18.10.2026): eine laufende Kombi-Aktion (Beispiel, wie aus „Aktionen & Haltbarkeit“ übernommen): Döner + Pommes + Cola,
  // 10 % unter der Summe der Kartenpreise, auf 50 Cent gerundet; seit gestern, noch 6 Tage – so zeigt die Tafel eine Aktion mit Laufzeit.
  { const ids = ["Döner Kebab", "Pommes frites (Beilage)", "Cola 0,33 l"].map((n) => NACH_KARTE.get(n)).filter(Boolean);
    const summe = rund2(ids.reduce((x, g) => x + g.preis, 0));
    if (ids.length === 3) s.aktionen = [{ id: "bsp-aktion-1", art: "kombi", gerichte: ids.map((g) => g.id), preis: Math.round(summe * 0.9 * 2) / 2, statt: summe,
      von: tagPlus(heute, -1), bis: tagPlus(heute, 6), ende: "datum", erfasst: zeit(tagPlus(heute, -1), 10), entfernt: false }];
    // Aktion planen (18.10.2026): der Vorschlag, den der Wirt gestern gesehen hat (Zeitraum, Begründung, erwartete Mehrmenge) – er hat einen Tag länger gewählt
    const a0 = s.aktionen[0]; const vs = a0 ? aktionVorschlag(s, a0, { heuteTag: tagPlus(heute, -1) }) : null;
    if (vs?.moeglich) a0.plan = { von: vs.von, bis: vs.bis, ende: vs.ende, satz: vs.satz, erwartung: Math.round(vs.erwartung.mehrAnteil * 10000) / 10000, quelle: vs.erwartung.quelle, erstellt: a0.erfasst }; }

  // Lieferanten (18.10.2026): zwei Beispiel-Lieferanten, keine echten Firmen, keine Nummern. Großhandel liefert Di und Fr, Bestellschluss am Vortag
  // 18 Uhr (Bestellweg Webshop); Getränkehändler liefert Mi, Bestellschluss am Vortag 12 Uhr, Mindestbestellwert 150 € (Bestellweg Telefon).
  // Die Getränke kommen vom Getränkehändler (Zweitlieferant: Großhandel) – so zeigt das Büro Bestellschluss, Liefertag und Mindestbestellwert.
  s.lieferanten = [
    { id: "bsp-lf-gross", name: "Großhandel (Beispiel)", namen: ["Großhandel (Beispiel)"], art: "grosshandel", modus: "lieferung", tage: [2, 5], schluss: { uhr: "18:00", tageVorher: 1 },
      lieferzeit: null, mindestwert: null, weg: "webshop", kontakt: "", kundennummer: "BSP-1001", notiz: "", erfasst: zeit(start, 9), geaendert: null, entfernt: false },
    { id: "bsp-lf-getraenke", name: "Getränkehändler (Beispiel)", namen: [], art: "getraenke", modus: "lieferung", tage: [3], schluss: { uhr: "12:00", tageVorher: 1 },
      lieferzeit: null, mindestwert: 150, weg: "telefon", kontakt: "", kundennummer: "", notiz: "Leergut mitgeben", erfasst: zeit(start, 9), geaendert: null, entfernt: false },
  ];
  for (const a of s.artikel) if (a.herkunft !== "selbst" && a.gruppe === "getraenk") { a.lieferantId = "bsp-lf-getraenke"; a.lieferant2Id = "bsp-lf-gross"; }

  const fertig = migrierenBetrieb(s);
  // nur für den Bericht/Test, nicht gespeichert: welche Zutaten ohne Preis geblieben sind
  Object.defineProperty(fertig, "_ohnePreis", { value: s.artikel.filter((x) => x.benutzt !== false && preisJeBasis(x) === null).map((x) => x.name), enumerable: false });
  Object.defineProperty(fertig, "_ohneRichtpreis", { value: rp.ohneRichtpreis, enumerable: false });
  return fertig;
}

// Trennung (17.10.2026): Der Beispiel-Laden heißt in jeder Sprache „Beispiel-…“ (name = t("beispiel.name") der aktiven Sprache).
// Vorher setzte app.js den Namen bei jedem Zeichnen; jetzt nur, wenn die Sprache gesetzt wird.
export function beispielNamenFolgen(wurzel, name) { for (const b of wurzel?.betriebe || []) if (b.beispiel && b.betrieb) b.betrieb.name = name; }
