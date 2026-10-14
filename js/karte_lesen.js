// Speisekarte lesen – aus erkanntem Text (Foto oder PDF) werden Gerichte mit Preis, und aus den Rezeptvorlagen die Zutaten.
// Daraus entsteht automatisch die Inventurliste (engine.artikelAusGerichten). Etappe 6a, Baris 14.10.2026:
// „Kamerafunktion für die Aufnahme der Speisekarte, auf der dann automatisch die Inventurliste entsteht."
// Grundsatz: Nichts wird still übernommen. Jede Zeile kommt als Vorschlag mit Sicherheit; der Wirt bestätigt oder ändert.

import { VORLAGEN, vorlagenFuer, PRODUKT_INDEX } from "./data/katalog.js";
import { klasseFuerBereich, steuersatzAusZutaten } from "./engine.js";
import { uid } from "./util.js";

const PREIS = /(\d{1,3})\s?[.,]\s?(\d{2})(?!\d)\s*(?:€|eur(?:o)?|e)?/gi;
const RAUSCHEN = /(preise?\s+inkl|inkl\.?\s*mwst|\bmwst\b|\btel\b\.?|telefon|\bfax\b|www\.|@|stra(ss|ß)e\b|\bstr\.|öffnungszeiten|offnungszeiten|ruhetag|mindestbestell|allergene|zusatzstoffe|^\s*seite\s+\d)/iu;
const GROESSEN = /(?<!\p{L})(klein|mittel|gro(?:ß|ss)|normal|maxi|mini|xl|jumbo|kids?|kinder)(?!\p{L})/giu;
const GETRAENK = /\b(\d[.,]\d{1,2}\s?l|\d{2,3}\s?ml|\d{2}\s?cl|cola|fanta|sprite|mezzo|spezi|ayran|wasser|sprudel|schorle|saft|limo|limonade|eistee|ice\s?tea|red\s?bull|energy|bier|pils|radler|weizen|tee|çay|cay|kaffee|espresso|cappuccino|latte|uluda[gğ]|capri|wein|sekt|fritz)\b/i;

export const normName = (s) => String(s || "").toLowerCase()
  .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
  .replace(/[ğ]/g, "g").replace(/[ş]/g, "s").replace(/[ç]/g, "c").replace(/[ı]/g, "i").replace(/[éè]/g, "e")
  .replace(/durum/g, "dueruem").replace(/\bd[eo]?o?ner/g, "doener")
  .replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

const preisZahl = (a, b) => Number(a) + Number(b) / 100;

// OCR-Eigenheiten glätten: "0,25 |" → "0,25 l", "€" zwischen Ziffern, Punkte-Leitern "......"
function zeileGlaetten(z) {
  // „Cola 0,33 1" → 0,33 l (Menge bis 1,99 l); „0,25 |" → 0,25 l; Punkte-Leitern weg
  return String(z).replace(/(?<![\d,.])([01][.,]\d{1,2})\s?1(?=\s|$)/g, "$1 l").replace(/\t/g, " ").replace(/(\d[.,]\d{1,2})\s?[|)!]\s/g, "$1 l ").replace(/(\d[.,]\d{1,2})\s?[|)!]$/g, "$1 l")
    .replace(/\.{3,}|…+|_{3,}|-{3,}/g, " ").replace(/\s+/g, " ").trim();
}

function nameSaeubern(n) {
  return nameAufbereiten(n).name;
}

// Echte Karten (Pilot 14.10.): Nummern mitten in der Zeile („u 34. Pide …" – Rest der Nachbarspalte davor),
// Fußnoten und Allergene („Weichkäse*® 2"), Beschreibungen nach dem Komma („Lahmacun mit Dönerfl., Weißkohl, …"),
// Anführungszeichen und Buchstabensalat („anEXa", „ReBBu"). Ergebnis: sauberer Name + Kennzeichen „bitte prüfen".
const KUERZEL = { "dönerfl": "Dönerfleisch", "doenerfl": "Dönerfleisch", "hähnchenfl": "Hähnchenfleisch", "hackfl": "Hackfleisch", "rindfl": "Rindfleisch", "kalbfl": "Kalbfleisch" };
export function nameAufbereiten(roh) {
  let n = String(roh || "");
  // Gerichtnummer mitten in der Zeile: alles davor gehört zur Nachbarspalte
  const nummern = [...n.matchAll(/(?:^|[^\p{L}\d])(\d{1,3})\s?[.)]\s+(?=\p{L})/gu)];
  if (nummern.length) { const m = nummern[nummern.length - 1]; n = n.slice(m.index + m[0].length); }
  n = n.replace(/^\s*(nr\.?\s*)?[A-Z]?\d{1,3}[a-z]?\s*[.):\-]\s*/i, "");
  // Getränkemenge („0,33 l") merken und am Ende wieder anhängen, damit sie nicht als Allergen-Nummer wegfällt
  const menge = n.match(/(\d[.,]\d{1,2}|\d{2,3})\s?(l|ml|cl)(?![\p{L}])/iu); if (menge) n = n.replace(menge[0], " ");
  n = n.replace(/[*®©™"“”„«»^°§#=!|_~<>[\]{}]+/g, " ");          // Fußnoten, Zeichenmüll
  n = n.split(/(?<!\d),(?!\d)|;|\s[-–—]\s|\(/)[0];                               // Beschreibung nach Komma / Gedankenstrich / Klammer weg
  n = n.replace(/\s\d{1,2}(\s?[.,]\s?\d{1,2})*\s*\.?\s*$/, "");  // Allergen-Nummern am Ende („2." „1,3")
  n = n.replace(/(\p{L}+)\.?(?=\s|$)/gu, (w, x) => KUERZEL[x.toLowerCase()] || w);
  n = n.replace(/^[^\p{L}]+/u, "").replace(/(\s+[^\p{L}\s]+|\s+\p{L}{1}|\s+\.)+\s*$/u, "").replace(/[\s.:\-–—|/]+$/, "").replace(/\s+/g, " ").trim();
  if (menge) n = `${n} ${menge[1]} ${menge[2].toLowerCase()}`;
  // Buchstabensalat: Wort mit Großbuchstaben mitten drin („anEXa", „ReBBu"), Wort ohne Vokal ab 4 Zeichen
  const pruefen = n.split(" ").filter((w) => !/\d/.test(w) && !/^(l|ml|cl)$/i.test(w)).some((w) => /\p{Ll}\p{Lu}|\p{Lu}{2,}\p{Ll}/u.test(w) && !/^[A-ZÄÖÜ]{2,5}$/.test(w) || (w.length >= 4 && !/[aeiouäöüyıAEIOUÄÖÜ]/.test(w)));
  return { name: n, pruefen };
}

// Text → Positionen [{ name, preis, groesse, roh }]
// Zutaten- oder Beschreibungszeile unter einem Gericht („mit Salat, Tomaten, Zwiebeln und Soße") – nie selbst ein Gericht-Name.
// Pilot 14.10.: „Gericht, darunter die Zutaten, der Preis auf Höhe des Gerichts."
export function istZutatenZeile(z) {
  let t = String(z || "");
  const nr = [...t.matchAll(/(?:^|[^\p{L}\d])(\d{1,3})\s?[.)]\s+(?=\p{L})/gu)]; // „u 34. Pide …": Nummerierung, davor Reste der Nachbarspalte
  if (nr.length) { const m = nr[nr.length - 1]; t = t.slice(m.index + m[0].length); }
  t = t.replace(/^[^\p{L}]+/u, "").trim();
  if (!t) return false;
  if (/^(mit|dazu|und|oder|serviert|wahlweise|inkl|inklusive|gefüllt|gefuellt|belegt|nach\s+wahl|auf\s+wunsch|aus|in|vom|von)\b/i.test(t) && !/^(vom|von)\s+\p{Lu}/iu.test(t)) return true;
  if (/^\p{Ll}/u.test(t)) return true;                     // beginnt klein: Fortsetzung, keine Überschrift
  if ((t.match(/,/g) || []).length >= 2) return true;      // Aufzählung
  return false;
}

export function positionenAusText(text) {
  const zeilen = String(text || "").split(/\r?\n/).map(zeileGlaetten).filter(Boolean);
  const out = []; let vorher = null;
  for (let i = 0; i < zeilen.length; i++) {
    const z = zeilen[i];
    if (RAUSCHEN.test(z)) { vorher = null; continue; }
    const preise = [...z.matchAll(PREIS)].map((m) => ({ wert: preisZahl(m[1], m[2]), index: m.index, laenge: m[0].length }))
      // Mengenangaben wie „0,33 l" sind keine Preise
      .filter((p) => !/^\s?(l|ml|cl|kg|g)\b/i.test(z.slice(p.index + p.laenge)) && p.wert >= 0.5 && p.wert < 100);
    // Zeile ohne Preis: als möglicher Name merken – aber Zutatenzeilen überschreiben das Gericht darüber nicht
    if (!preise.length) { if (!istZutatenZeile(z) || !vorher) vorher = istZutatenZeile(z) ? null : z.replace(/\s+/g, " ").trim(); continue; }
    // Abschnitte: Text bis zum Preis = Name. „Pizza Salami 9,50 Lasagne 10,90" → zwei Gerichte; Preise direkt hintereinander gehören zusammen
    const abschnitte = []; let start = 0;
    for (const p of preise) {
      const seg = z.slice(start, p.index);
      if (/\p{L}{2,}/u.test(seg) || !abschnitte.length) abschnitte.push({ seg, preise: [p] }); else abschnitte[abschnitte.length - 1].preise.push(p);
      start = p.index + p.laenge;
    }
    abschnitte.forEach((a, k) => {
      let aufb = nameAufbereiten(a.seg);
      // Name und Preis in zwei Zeilen (zweispaltige Karten) – oder der Preis ist auf die Zutatenzeile gerutscht: dann gilt das Gericht darüber
      if (k === 0 && vorher && (aufb.name.length < 2 || istZutatenZeile(a.seg))) aufb = nameAufbereiten(vorher);
      else if (k === 0 && istZutatenZeile(a.seg) && !/\p{Lu}/u.test(a.seg.slice(0, 3))) return;
      let name = aufb.name;
      if (name.length < 2 || name.length > 60) return;
      const groessen = [...name.matchAll(GROESSEN)].map((m) => m[0]);
      if (a.preise.length >= 2 && groessen.length >= 2) {
        // „Pommes klein / groß 3,50 4,50"
        const basis = name.replace(GROESSEN, "").replace(/[\s/|]+$/, "").replace(/\s+/g, " ").trim();
        a.preise.slice(0, groessen.length).forEach((p, j) => out.push({ name: `${basis} ${groessen[j]}`.trim(), preis: p.wert, groesse: groessen[j].toLowerCase(), roh: z }));
      } else out.push({ name, preis: a.preise[a.preise.length - 1].wert, groesse: groessen[0]?.toLowerCase() || null, roh: z, pruefen: aufb.pruefen });
    });
    vorher = null;
  }
  // gleiche Gerichte (OCR doppelt) nur einmal
  const gesehen = new Set();
  return out.filter((p) => { const k = normName(p.name) + "|" + p.preis; if (gesehen.has(k)) return false; gesehen.add(k); return true; });
}

// Passt ein Kartenname zu einer Rezeptvorlage? Wert 0..1 (≥ 0,5 = Vorschlag, ≥ 0,75 = sicher)
export function aehnlichkeit(kartenName, vorlageName) {
  const a = normName(kartenName), b = normName(vorlageName.replace(/\(.*?\)/g, ""));
  if (!a || !b) return 0;
  if (a === b) return 1;
  const a0 = a.replace(/ /g, ""), b0 = b.replace(/ /g, "");
  if (a0 === b0) return 0.98;
  const ta = new Set(a.split(" ").filter((w) => w.length > 1)), tb = b.split(" ").filter((w) => w.length > 1);
  // Vorlage steckt ganz im Kartennamen („Döner Teller mit Pommes" ⊃ „Dönerteller")
  if (b0.length >= 5 && a0.includes(b0)) return Math.min(0.95, 0.7 + 0.3 * (b0.length / a0.length));
  if (a0.length >= 5 && b0.includes(a0)) return Math.min(0.9, 0.6 + 0.3 * (a0.length / b0.length));
  const gemeinsam = tb.filter((w) => ta.has(w) || [...ta].some((x) => x.length > 3 && (x.startsWith(w) || w.startsWith(x)))).length;
  if (!gemeinsam) return 0;
  return 0.75 * (2 * gemeinsam) / (ta.size + tb.length);
}

function besteVorlage(name, stand) {
  const passend = vorlagenFuer(stand.betrieb.format, stand.betrieb.kuechen);
  const alle = [...passend, ...Object.entries(VORLAGEN).flatMap(([b, l]) => l.map((v) => ({ ...v, bereich: b })))];
  let best = null;
  for (const v of alle) {
    const s = aehnlichkeit(name, v.name) + (passend.some((p) => p.name === v.name) ? 0.03 : 0); // Küche des Ladens leicht bevorzugen
    if (!best || s > best.s) best = { v, s };
  }
  return best && best.s >= 0.5 ? best : null;
}

export const istGetraenk = (name) => GETRAENK.test(name);

// Positionen → Vorschläge für die Bestätigung. Jeder Vorschlag sagt, woher das Rezept kommt.
export function vorschlaegeAusText(text, stand) {
  const pos = positionenAusText(text);
  // Zeilen ohne lesbaren Preis, die klar ein bekanntes Gericht sind („Döner Kebab", Preis verwischt): trotzdem anbieten, Preis fehlt
  const schon = new Set(pos.map((p) => normName(p.name)));
  for (const z of String(text || "").split(/\r?\n/).map(zeileGlaetten)) {
    if (!z || RAUSCHEN.test(z) || PREIS.test(z)) { PREIS.lastIndex = 0; continue; }
    PREIS.lastIndex = 0;
    const name = nameSaeubern(z);
    if (name.length < 3 || schon.has(normName(name))) continue;
    const tr = besteVorlage(name, stand);
    // Name der Vorlage nehmen (der Rest der Zeile ist meist der verwischte Preis)
    if (tr && tr.s >= 0.85 && !schon.has(normName(tr.v.name))) { pos.push({ name: tr.v.name, preis: null, groesse: null, roh: z }); schon.add(normName(tr.v.name)); }
  }
  return pos.map((p) => {
    const treffer = besteVorlage(p.name, stand);
    const getraenk = istGetraenk(p.name);
    return {
      id: uid(), name: p.name, preis: p.preis, roh: p.roh, an: true, pruefen: !!p.pruefen,
      vorlage: treffer ? treffer.v.name : null, bereich: treffer ? treffer.v.bereich : null,
      sicher: treffer ? (treffer.s >= 0.75 ? "sicher" : "vorschlag") : getraenk ? "getraenk" : "ohne",
      getraenk,
    };
  });
}

// Bestätigte Vorschläge in die Karte übernehmen. Bestehende Gerichte gleichen Namens bekommen nur den neuen Preis.
// Rückgabe: { neu, aktualisiert, ohneRezept }
export function vorschlaegeUebernehmen(stand, vorschlaege) {
  let neu = 0, aktualisiert = 0, ohneRezept = 0;
  const alleVorlagen = Object.entries(VORLAGEN).flatMap(([b, l]) => l.map((v) => ({ ...v, bereich: b })));
  for (const v of vorschlaege) {
    if (!v.an || !String(v.name).trim()) continue;
    const name = String(v.name).trim().slice(0, 60);
    const vorhanden = stand.gerichte.find((g) => normName(g.name) === normName(name));
    if (vorhanden) { if (typeof v.preis === "number") vorhanden.preis = v.preis; aktualisiert += 1; continue; }
    const vl = v.vorlage ? alleVorlagen.find((x) => x.name === v.vorlage) : null;
    let zutaten, klasse, bereich = vl?.bereich || null, steuer;
    if (vl) { zutaten = vl.zutaten.map(([n, menge, einheit]) => ({ name: n, menge, einheit })); klasse = klasseFuerBereich(vl.bereich); steuer = steuersatzAusZutaten(zutaten); }
    else if (v.getraenk) {
      // Getränk ohne Vorlage: es wird 1:1 eingekauft und verkauft – Zutat ist das Getränk selbst
      zutaten = [{ name, menge: 1, einheit: "stk" }]; klasse = "getraenk"; steuer = 0.19;
      if (!stand.artikel.some((a) => a.name === name)) stand.artikel.push({ name, gruppe: "getraenk", einheit: "stk", packung: { menge: null, einheit: "stk" }, gebinde: { art: "kiste", zwischen: null }, preis: null, preisBasis: "netto", preisHistorie: [], status: "offen", benutzt: true });
    } else { zutaten = []; klasse = "haupt"; steuer = 0.07; ohneRezept += 1; }
    stand.gerichte.push({ id: uid(), name, vorlageName: vl?.name || null, bereich, klasse, zeit: vl?.zeit ?? 4, vorlage: !!vl, zutaten,
      preis: typeof v.preis === "number" ? v.preis : null, mengeTag: null, steuer, quelle: "foto" });
    neu += 1;
  }
  return { neu, aktualisiert, ohneRezept };
}

// Für die Anzeige „Daraus entsteht deine Inventurliste": Zutaten aller Gerichte, je Warengruppe gezählt.
export function inventurVorschau(stand) {
  const namen = new Set(); for (const g of stand.gerichte) for (const z of g.zutaten) namen.add(z.name);
  const gruppen = {}; for (const n of namen) { const g = PRODUKT_INDEX[n]?.g || stand.artikel.find((a) => a.name === n)?.gruppe || "gewuerz"; gruppen[g] = (gruppen[g] || 0) + 1; }
  return { anzahl: namen.size, gruppen, namen: [...namen] };
}
