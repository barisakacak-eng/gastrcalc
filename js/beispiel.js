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
import { gerichtAusVorlage } from "./screens/karte.js";
import { fehlendeRezepteErgaenzen } from "./rezept_baukasten.js";
import { branchenwerteAnwenden } from "./rezept_quelle.js";
import { selbstAnwenden } from "./selbst.js";
import { richtpreiseEinsetzen } from "./richtpreise.js";
import { artikelAusGerichten, zwischenpreiseRechnen, steuersatzAusZutaten, grenzenVon, abweichung, tagPlus, wochentag, NACHKONTROLLE_STUNDEN, preisJeBasis } from "./engine.js";
import { preiseUebernehmen } from "./lieferung.js";
import { planVorschlag, planUebernehmen, aufgabenFuer } from "./putzplan.js";
import { gerichtWeg, rohwareWeg, personalessen } from "./muell.js";
import { inventurStarten, inventurAbschliessen, artikelFuerInventur, mengeSetzen } from "./inventur.js";

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
  s.betrieb = { ...s.betrieb, name: String(name).slice(0, 40), format: "imbiss", kuechen: ["doener"], tageProWoche: 6,
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
  fehlendeRezepteErgaenzen(s);
  selbstAnwenden(s, vorauswahlFuer("doener")); s.selbstAutoArt = "doener";
  s.artikel = artikelAusGerichten(s);
  if (BRANCHENWERTE.werte.length) branchenwerteAnwenden(s, BRANCHENWERTE.werte, { datum: start });
  s.branchenVersion = BRANCHENWERTE.version;
  const rp = richtpreiseEinsetzen(s, { datum: start }); zwischenpreiseRechnen(s);

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
  lieferTage.forEach((d, i) => {
    const zeilen = LIEFERUNG.filter(([n]) => s.artikel.some((a) => a.name === n && a.herkunft !== "selbst")).map(([n, menge, gebinde, inhalt, einheit, preis, satz]) => {
      const netto = rund2(menge * preis);
      return { name: n, artikel: n, menge, gebinde, inhaltMenge: inhalt, inhaltEinheit: einheit, inhaltAnzahl: einheit === "stk" ? inhalt : null, einzelpreis: preis, jeKg: false,
        gesamt: netto, netto, steuersatz: satz, jeEinheit: rund2(preis / inhalt * 10000) / 10000, jeEinheitEinheit: einheit, sicher: true };
    });
    const summeNetto = rund2(zeilen.reduce((x, z) => x + z.netto, 0)); const summeBrutto = rund2(zeilen.reduce((x, z) => x + z.netto * (1 + z.steuersatz), 0));
    const l = { id: `bsp-lief-${i + 1}`, datum: d, erfasst: zeit(d, 10, 15), geraet: null, lieferant: "Großhandel (Beispiel)", typ: "rechnung", basis: "netto", quelle: "text",
      rechnungNr: `BSP-${String(i + 1).padStart(4, "0")}`, summeNetto, summeBrutto, pfand: 0, zeilen, storniert: false, abdruck: "" };
    s.lieferungen.push(l); preiseUebernehmen(s, l);
  });
  zwischenpreiseRechnen(s);
  for (const a of s.artikel) if (a.herkunft === "selbst") a.preisHistorie = [];
  // erste Inventur am ersten Tag – erst hier gezählt, damit sie mit denselben Gebinden und Preisen rechnet wie die zweite (Beispiel)
  const inv1 = inventurStarten(s, { datum: start, jetzt: zeit(start, 15) }); inv1.id = "bsp-inv-1";
  zaehlen(inv1, 0); inventurAbschliessen(s, inv1, { datum: start, jetzt: zeit(start, 16) }); // errechnete Preise: kein Verlauf mit dem Tag der Erzeugung

  // Beispiel-Laden (17.10.2026): Tagesumsätze, Müll, Personalessen, Kühl-Rundgänge und Putz-Haken je Öffnungstag
  const g = (n) => s.gerichte.find((x) => x.name === n);
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

  // Beispiel-Laden (17.10.2026): zweite Inventur heute (Preise von heute)
  // nie in der Zukunft: wer zwischen 4 und 8:30 Uhr anlegt, bekommt die Inventur kurz vor „jetzt“ (Beispiel-Laden, 17.10.2026)
  const ende = jetzt && new Date(jetzt) < new Date(zeit(heute, 8, 30)) ? new Date(new Date(jetzt).getTime() - 60000) : new Date(zeit(heute, 8, 30));
  const inv2 = inventurStarten(s, { datum: heute, jetzt: new Date(ende.getTime() - 30 * 60000).toISOString() }); inv2.id = "bsp-inv-2";
  zaehlen(inv2, 1); inventurAbschliessen(s, inv2, { datum: heute, jetzt: ende.toISOString() });

  const fertig = migrierenBetrieb(s);
  // nur für den Bericht/Test, nicht gespeichert: welche Zutaten ohne Preis geblieben sind
  Object.defineProperty(fertig, "_ohnePreis", { value: s.artikel.filter((x) => x.benutzt !== false && preisJeBasis(x) === null).map((x) => x.name), enumerable: false });
  Object.defineProperty(fertig, "_ohneRichtpreis", { value: rp.ohneRichtpreis, enumerable: false });
  return fertig;
}
