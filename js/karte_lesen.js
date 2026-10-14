// Speisekarte lesen – aus erkanntem Text (Foto oder PDF) werden Gerichte mit Preis, und aus den Rezeptvorlagen die Zutaten.
// Daraus entsteht automatisch die Inventurliste (engine.artikelAusGerichten). Etappe 6a, Baris 14.10.2026:
// „Kamerafunktion für die Aufnahme der Speisekarte, auf der dann automatisch die Inventurliste entsteht."
// Grundsatz: Nichts wird still übernommen. Jede Zeile kommt als Vorschlag mit Sicherheit; der Wirt bestätigt oder ändert.

import { VORLAGEN, PRODUKT_INDEX } from "./data/katalog.js";
import { profilFuer } from "./profil.js";
import { klasseFuerBereich, steuersatzAusZutaten } from "./engine.js";
import { uid } from "./util.js";
import { rezeptBauen, BEREICH_JE_FAMILIE } from "./rezept_baukasten.js";

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
  return String(z).replace(/(?<![\d,.])([01][.,]\d{1,2})\s?1(?=\s|$)/g, "$1 l").replace(/\t/g, " ").replace(/(?<![\d,.])([01][.,]\d{1,2})\s?[|)!]\s/g, "$1 l ").replace(/(?<![\d,.])([01][.,]\d{1,2})\s?[|)!]$/g, "$1 l")
    .replace(/(?:\s?[.·•:]){2,}\s?|…+|_{3,}|-{3,}/g, " ⋯ ").replace(/\s+/g, " ").trim();
}

function nameSaeubern(n) {
  return nameAufbereiten(n).name;
}

// Echte Karten (Pilot 14.10.): Nummern mitten in der Zeile („u 34. Pide …" – Rest der Nachbarspalte davor),
// Fußnoten und Allergene („Weichkäse*® 2"), Beschreibungen nach dem Komma („Lahmacun mit Dönerfl., Weißkohl, …"),
// Anführungszeichen und Buchstabensalat („anEXa", „ReBBu"). Ergebnis: sauberer Name + Kennzeichen „bitte prüfen".
// Pilot 14.10. (echte Karte, 45 Gerichte): Der Name wird 1:1 übernommen – mit Komma, Klammer und Beschreibung auf derselben Zeile
// („Pide mit Spinat, Weichkäse, Eiern" ≠ „Pide mit Spinat, Weichkäse"). Weg kommen nur Dinge, die nicht zum Namen gehören:
// Gerichtnummer, Reste der Nachbarspalte/Fotos links, Allergen-Hochzahlen, Punkte-Leiter und das, was die Erkennung aus ihr macht.
const LEITER_BUCHSTABEN = /^[unrsemaocvwiz]+$/;
const istLeiterRest = (w) => LEITER_BUCHSTABEN.test(w) && (w.length <= 5 || /(.)\1/.test(w));
export function nameAufbereiten(roh) {
  let n = String(roh || "");
  // Punkte-Leiter: der Name endet davor
  n = n.split("⋯").find((x) => /\p{L}{3,}/u.test(x)) ?? n.split("⋯")[0];
  // Gerichtnummer („01." „35," „47.") mitten in der Zeile: alles davor gehört zur Nachbarspalte
  const nummern = [...n.matchAll(/(?:^|[^\p{L}\d,])(\d{1,3})\s?[.),]\s+(?=\p{L})/gu)];
  let mitNummer = false;
  if (nummern.length) { const m = nummern[nummern.length - 1]; n = n.slice(m.index + m[0].length); mitNummer = true; }
  n = n.replace(/^\s*(nr\.?\s*)?[A-Z]?\d{1,3}[a-z]?\s*[.):\-]\s*/i, "");
  const menge = n.match(/(\d[.,]\d{1,2}|\d{2,3})\s?(l|ml|cl)(?![\p{L}])/iu); if (menge) n = n.replace(menge[0], " ");
  // Allergen-Hochzahlen am Wort („Soße4,7,A,F,G,K" „KäseA,G") und Zeichenmüll
  n = n.replace(/(\p{Ll})(?:\d{1,2}|[A-L])(?:\s?,\s?(?:\d{1,2}|[A-L]))+(?=[\s,.]|$)/gu, "$1");
  n = n.replace(/(\p{Ll}{3,})[il1|](mit|und)\b/gu, "$1 $2");
  n = n.replace(/[*®©™"“”„‟«»‘’‚´`^°§#=!|_~<>[\]{}%+]+/g, " ");
  let w = n.split(/\s+/).filter(Boolean);
  // Reste links (Fotos, Nachbarspalte): kurze Schnipsel vor dem ersten richtigen Wort weg
  if (!mitNummer && !/^(mit|und|dazu|im|in|aus|vom|von|zum|zur)$/i.test(w[0] || "")) { const k = w.findIndex((x) => /^[\p{L}-]{4,}[.,]?$/u.test(x) && !istLeiterRest(x.toLowerCase())); if (k > 0) w = w.slice(k); }
  else while (w.length > 1 && !/\p{L}{2,}/u.test(w[0])) w.shift();
  // Reste rechts: Leiter, die als Buchstaben gelesen wurde („unsnnnnr" „nen"), einzelne Zeichen, Ziffern
  while (w.length > 1) {
    const x = w[w.length - 1], l = x.replace(/[.,:;]+$/, "");
    if (!l || !/\p{L}/u.test(l) || /^\p{L}$/u.test(l) || istLeiterRest(l) || /^\p{Ll}{2}$/u.test(l)) w.pop(); else break;
  }
  n = w.join(" ").replace(/^[^\p{L}(]+/u, "").replace(/[\s,;:\-–—|/]+$/, "").replace(/\s+([,.)])/g, "$1").replace(/\(\s+/g, "(").trim();
  if (/\.$/.test(n) && !/\p{L}{2,}\.$/u.test(n.slice(-6))) n = n.replace(/\.+$/, "");
  if (menge) n = `${n} ${menge[1]} ${menge[2].toLowerCase()}`;
  // Buchstabensalat: Großbuchstabe mitten im Wort („anEXa", „ReBBu"), Wort ohne Vokal ab 4 Zeichen
  const pruefen = n.split(" ").map((x) => x.replace(/[(),.]/g, "")).filter((x) => x && !/\d/.test(x) && !/^(l|ml|cl)$/i.test(x)).some((x) => /\p{Ll}\p{Lu}|\p{Lu}{2,}\p{Ll}/u.test(x) && !/^[A-ZÄÖÜ]{2,5}$/.test(x) || (x.length >= 4 && !/[aeiouäöüyıAEIOUÄÖÜ]/.test(x)));
  // Zeichensalat im Namen: Ziffern (außer Menge/Klammer) oder mehrere Ein-/Zwei-Zeichen-Schnipsel („EBENE 5 7 3 re Fig BR", „Salat EU MN")
  const ohneKlammer = n.replace(/\([^)]*\)/g, " ").replace(/\d[.,]\d{1,2}\s?(l|ml|cl)\b/gi, " ");
  const kurz = ohneKlammer.split(/\s+/).filter((x) => x && x.replace(/[.,]/g, "").length <= 2 && !/^(&|zu|im|in|am|an|mit|und|xl|oder)$/i.test(x)).length;
  const salat = /\d/.test(ohneKlammer) || kurz >= 2;
  return { name: n, pruefen: pruefen || salat, nummer: mitNummer };
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
  if (/^\p{Ll}/u.test(t) && !/^(extra|zusätzlich|zusaetzlich|portion|kleine?|gro(ß|ss)e?|halbe?)\b/i.test(t)) return true;                     // beginnt klein: Fortsetzung, keine Überschrift
  if ((t.match(/,/g) || []).length >= 2 && !/\smit\s/i.test(t)) return true;      // Aufzählung („Tomaten, Zwiebeln, Mais") – „Pide mit Spinat, Weichkäse, Eiern" ist ein Gericht
  return false;
}

// Zwei Lesarten derselben Seite (Block und Spalten, getrennt durch \f): die mit mehr Gerichten ist die Hauptlesart,
// die andere ergänzt fehlende Gerichte und unlesbare Preise. Ähnliche Namen („Döner (kein) mit Sala" ~ „Döner (klein) mit Salat") zählen als dasselbe Gericht.
// Rubrik-Überschriften („Vegane Gerichte", „Pide aus dem Steinofen", „Nudeln") sind keine Gerichte, auch wenn ein Preis danebenrutscht
const RUBRIK = /^(?:[\p{L}-]+\s){0,2}(gerichte|speisen|getränke|getraenke|beilagen|desserts?|vorspeisen|hauptspeisen|nudeln|salate|menüs?|extras)$|\s(aus|qu\/?|au\/?|a\w{1,2})\s+dem\s+[\p{L}]+$/iu;
export const istRubrik = (n) => RUBRIK.test(String(n || "").trim());
const nameGuete = (p) => -(p.pruefen ? 5 : 0) - p.name.split(/\s+/).filter((x) => x.replace(/[.,()]/g, "").length <= 2 && !/^(&|zu|im|in|am|an|und|xl)$/i.test(x)).length * 2 - (p.name.match(/[^\p{L}\d\s,.()&\-]/gu) || []).length - (p.name.match(/ı/g) || []).length + Math.min(p.name.length, 40) / 100;
function aehnlichName(a, b) {
  const x = normName(a), y = normName(b); if (x === y) return true;
  // verschiedene Gerichte unterscheiden sich in ganzen Wörtern („Döner-Teller" ≠ „Falafel-Teller", „…, Weichkäse" ≠ „…, Weichkäse, Eiern")
  if (Math.abs(x.length - y.length) > 4 || x.slice(0, 3) !== y.slice(0, 3)) return false;
  const bi = (s) => { const m = new Map(); for (let i = 0; i < s.length - 1; i++) { const k = s.slice(i, i + 2); m.set(k, (m.get(k) || 0) + 1); } return m; };
  const A = bi(x), B = bi(y); let g = 0; for (const [k, n] of A) g += Math.min(n, B.get(k) || 0);
  return (2 * g) / (x.length + y.length - 2) >= 0.8;
}
export function positionenAusText(text) {
  const teile = String(text || "").split("\f");
  if (teile.length > 1) {
    const listen = teile.map(positionenEinerLesart).sort((a, b) => b.length - a.length);
    // Wort-Häufigkeit über die ganze Karte: richtig gelesene Wörter kommen öfter vor („Portion" 2×) als Lesefehler („Porlion" 1×)
    const haeufig = new Map(); for (const p of listen.flat()) for (const w of normName(p.name).split(" ")) haeufig.set(w, (haeufig.get(w) || 0) + 1);
    const guete = (p) => { const w = normName(p.name).split(" ").filter(Boolean); return nameGuete(p) + (w.length ? w.reduce((s, x) => s + Math.min(haeufig.get(x) || 0, 4), 0) / w.length : 0); };
    const aus = listen[0].map((p) => ({ ...p }));
    for (const l of listen.slice(1)) for (const p of l) {
      const h = aus.find((x) => aehnlichName(x.name, p.name));
      if (!h) { aus.push(p); continue; }
      if (guete(p) > guete(h)) { h.name = p.name; h.pruefen = p.pruefen; } // sauberere Schreibweise gewinnt („m Salat" < „mit Salat")
      if ((h.preis === null || h.preisPruefen) && p.preis !== null && !p.preisPruefen) { h.preis = p.preis; h.preisPruefen = false; }
      else if (h.preis !== null && p.preis !== null && !p.preisPruefen && !h.preisPruefen && h.preis !== p.preis) h.preisPruefen = true; // Lesarten widersprechen sich
    }
    return aus;
  }
  return positionenEinerLesart(text);
}
function positionenEinerLesart(text) {
  const zeilen = String(text || "").split(/\r?\n/).map(zeileGlaetten).filter(Boolean);
  const out = []; let vorher = null;
  for (let i = 0; i < zeilen.length; i++) {
    const z = zeilen[i];
    if (RAUSCHEN.test(z)) { vorher = null; continue; }
    let preise = [...z.matchAll(PREIS)].map((m) => ({ wert: preisZahl(m[1], m[2]), index: m.index, laenge: m[0].length }))
      // Mengenangaben wie „0,33 l" sind keine Preise
      .filter((p) => !/^\s?(l|ml|cl|kg|g)\b/i.test(z.slice(p.index + p.laenge)) && p.wert >= 0.5 && p.wert < 100);
    // Preis ohne Komma hinter der Punkte-Leiter („Schinken Seele ……… 850", „……7:00"): als Preis nehmen, aber zum Prüfen markieren
    if (!preise.length) {
      const m = z.match(/⋯[^\p{L}\d]{0,4}(?:\p{L}{1,2}\s)?[^\p{L}\d]{0,3}(\d{1,2})\s?[:;]?\s?(\d{2})(?!\d)/u);
      if (m && /\p{L}{3,}/u.test(z.slice(0, m.index))) { const wert = preisZahl(m[1], m[2]); if (wert >= 0.5 && wert < 100) preise = [{ wert, index: m.index, laenge: m[0].length, unsicher: true }]; }
    }
    // Zeile ohne Preis: als möglicher Name merken – aber Zutatenzeilen überschreiben das Gericht darüber nicht
    if (!preise.length && z.includes("⋯") && /⋯.*\d/.test(z)) {
      const aufb = nameAufbereiten(z.split("⋯")[0]);
      if (aufb.name.length >= 3 && /\p{Lu}\p{L}{3,}/u.test(aufb.name) && !istZutatenZeile(aufb.name) && !istRubrik(aufb.name)) { out.push({ name: aufb.name, preis: null, groesse: null, roh: z, pruefen: aufb.pruefen }); vorher = null; continue; }
    }
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
      const zutat = !aufb.nummer && istZutatenZeile(aufb.name);
      if (k === 0 && vorher && (aufb.name.length < 2 || zutat)) aufb = nameAufbereiten(vorher);
      else if (k === 0 && zutat) return;
      let name = aufb.name;
      if (name.length < 2 || name.length > 80 || !/\p{L}{3,}/u.test(name) || istRubrik(name)) return; // „Mr" ist kein Gericht, „Vegane Gerichte" eine Überschrift
      const groessen = [...name.matchAll(GROESSEN)].map((m) => m[0]);
      if (a.preise.length >= 2 && groessen.length >= 2) {
        // „Pommes klein / groß 3,50 4,50"
        const basis = name.replace(GROESSEN, "").replace(/[\s/|]+$/, "").replace(/\s+/g, " ").trim();
        a.preise.slice(0, groessen.length).forEach((p, j) => out.push({ name: `${basis} ${groessen[j]}`.trim(), preis: p.wert, groesse: groessen[j].toLowerCase(), roh: z }));
      } else { const pz = a.preise[a.preise.length - 1]; const cent = Math.round(pz.wert * 100) % 100;
        out.push({ name, preis: pz.wert, groesse: groessen[0]?.toLowerCase() || null, roh: z, pruefen: aufb.pruefen, preisPruefen: !!pz.unsicher || ![0, 5, 9].includes(cent % 10) });
      }
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

// Laden-Profil (Punkt 9): Vorlagen außerhalb von Kern und „Oft dabei“ brauchen einen deutlich besseren Treffer (0,15 Vorsprung).
// Der Vorsprung gilt nur für die Rangfolge; „sicher“ (≥ 0,75) misst weiter die echte Ähnlichkeit.
export const PROFIL_VORSPRUNG = 0.15;
function besteVorlage(name, stand) {
  const p = profilFuer(stand); const kern = new Set(p.kern), oft = new Set(p.oft);
  let best = null;
  for (const [b, liste] of Object.entries(VORLAGEN)) for (const v0 of liste) {
    const s = aehnlichkeit(name, v0.name); if (!s) continue;
    const rang = s + (kern.has(b) ? PROFIL_VORSPRUNG : oft.has(b) ? PROFIL_VORSPRUNG - 0.03 : 0); // Kern vor „Oft dabei“
    if (!best || rang > best.rang) best = { v: { ...v0, bereich: b }, s, rang };
  }
  return best && best.s >= 0.5 ? { v: best.v, s: best.s } : null;
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
    // Kein sicherer Vorlagen-Treffer: Rezept aus dem Baukasten (Grundrezept + Belag + Größe) – nie ein Gericht ohne Rezept
    const bau = !getraenk && !(treffer && treffer.s >= 0.75) ? rezeptBauen(p.name) : null;
    const v = {
      id: uid(), name: p.name, preis: p.preis, roh: p.roh, an: true, pruefen: !!p.pruefen, preisPruefen: !!p.preisPruefen,
      vorlage: treffer ? treffer.v.name : null, bereich: treffer ? treffer.v.bereich : null,
      sicher: treffer && treffer.s >= 0.75 ? "sicher" : bau ? "baukasten" : treffer ? "vorschlag" : getraenk ? "getraenk" : "ohne",
      getraenk,
    };
    if (bau) Object.assign(v, { vorlage: null, bereich: BEREICH_JE_FAMILIE[bau.familie] || null, bau });
    return v;
  });
}

// Bestätigte Vorschläge in die Karte übernehmen. Bestehende Gerichte gleichen Namens bekommen nur den neuen Preis.
// Rückgabe: { neu, aktualisiert, ohneRezept }
export function vorschlaegeUebernehmen(stand, vorschlaege) {
  let neu = 0, aktualisiert = 0, ohneRezept = 0;
  const alleVorlagen = Object.entries(VORLAGEN).flatMap(([b, l]) => l.map((v) => ({ ...v, bereich: b })));
  for (const v of vorschlaege) {
    if (!v.an || !String(v.name).trim()) continue;
    const name = String(v.name).trim().slice(0, 80);
    const vorhanden = stand.gerichte.find((g) => normName(g.name) === normName(name));
    if (vorhanden) { if (typeof v.preis === "number") vorhanden.preis = v.preis; aktualisiert += 1; continue; } // leere Rezepte füllt fehlendeRezepteErgaenzen
    const vl = v.vorlage ? alleVorlagen.find((x) => x.name === v.vorlage) : null;
    let zutaten, klasse, bereich = vl?.bereich || null, steuer, baukasten = null;
    if (vl) { zutaten = vl.zutaten.map(([n, menge, einheit]) => ({ name: n, menge, einheit })); klasse = klasseFuerBereich(vl.bereich); steuer = steuersatzAusZutaten(zutaten); }
    else if (v.bau || (!v.getraenk && rezeptBauen(name))) {
      // Rezept aus dem Baukasten: Startwerte, gekennzeichnet – der Wirt passt sie an
      const b = rezeptBauen(name) || v.bau; // Name evtl. vom Wirt geändert: neu bauen
      zutaten = b.zutaten.map((z) => ({ name: z.name, menge: z.menge, einheit: z.einheit })); bereich = BEREICH_JE_FAMILIE[b.familie] || null;
      klasse = klasseFuerBereich(bereich); steuer = steuersatzAusZutaten(zutaten);
      baukasten = b.familie;
    }
    else if (v.getraenk) {
      // Getränk ohne Vorlage: es wird 1:1 eingekauft und verkauft – Zutat ist das Getränk selbst
      zutaten = [{ name, menge: 1, einheit: "stk" }]; klasse = "getraenk"; steuer = 0.19;
      if (!stand.artikel.some((a) => a.name === name)) stand.artikel.push({ name, gruppe: "getraenk", einheit: "stk", packung: { menge: null, einheit: "stk" }, gebinde: { art: "kiste", zwischen: null }, preis: null, preisBasis: "netto", preisHistorie: [], status: "offen", benutzt: true });
    } else { zutaten = []; klasse = "haupt"; steuer = 0.07; ohneRezept += 1; }
    stand.gerichte.push({ id: uid(), name, vorlageName: vl?.name || null, bereich, klasse, zeit: vl?.zeit ?? (baukasten ? (rezeptBauen(name)?.zeit ?? 4) : 4), vorlage: !!vl, zutaten,
      ...(baukasten ? { rezeptQuelle: "baukasten", rezeptFamilie: baukasten } : {}),
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
