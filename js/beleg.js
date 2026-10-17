// Belegzerleger für GastroCalc. Reines Modul: keine Oberfläche, kein Logging, keine Abhängigkeiten.
// Der Wirt fotografiert den Beleg, tippt „Text kopieren“ und fügt den Text ein. Dieses Modul zerlegt
// ihn in Warenzeilen. Grundlage sind die zehn Erkennungsregeln aus dem Dossier grosshandel_de.md,
// Abschnitt 5; jede Regel steht hier als benannte Funktion mit Hinweis, wo sie bricht.
// Es wird nie geraten: Jede Zeile trägt `sicher` und bei Unsicherheit eine Frage mit Antwortmöglichkeiten.
import { parseZahl } from "./util.js";

export const GEBINDE_KUERZEL = { KT: "karton", KAR: "karton", KA: "kanister", KAN: "kanister", KI: "kiste", KS: "kasten", ST: "stueck", STK: "stueck", PK: "packung", PCK: "packung", BTL: "beutel", BT: "beutel", FL: "flasche", SA: "sack", SCK: "sack", TR: "tray", DS: "dose", EI: "eimer", GL: "glas", NE: "netz", LA: "laib", PAL: "palette", DI: "display", KEG: "fass", FASS: "fass" };

// Ausgeschriebene Gebindewörter (Regel 5), Einzahl und Mehrzahl, klein verglichen.
const GEBINDE_WORT = { karton: "karton", kartons: "karton", kanister: "kanister", kiste: "kiste", kisten: "kiste", kasten: "kasten", kästen: "kasten", stück: "stueck", stck: "stueck", packung: "packung", packungen: "packung", pack: "packung", beutel: "beutel", flasche: "flasche", flaschen: "flasche", sack: "sack", säcke: "sack", tray: "tray", trays: "tray", dose: "dose", dosen: "dose", eimer: "eimer", glas: "glas", gläser: "glas", netz: "netz", netze: "netz", laib: "laib", laibe: "laib", palette: "palette", paletten: "palette", display: "display", fass: "fass", fässer: "fass", keg: "fass" };
const EINHEIT = { kg: "kg", g: "g", l: "l", L: "l", ml: "ml", cl: "cl" };
const RE_EINHEIT = /^(kg|g|l|L|ml|cl)$/;
const RE_ZAEHL = /^(stk|st|stck|stück|stueck|fl|fl\.)$/i;   // Zähleinheiten, die direkt an der Menge hängen („2 Stk“, „6 Fl.“)
const RE_X = /^[xX*]$/;
const RE_PREIS = /^(-?)(\d{1,3}(?:\.\d{3})+,\d{2}|\d+,\d{2}|\d+\.\d{2})(-?)(\/kg)?$/;
const RE_GANZ = /^-?\d{1,4}$/;                                 // Mengen haben höchstens vier Stellen; längere Zahlen sind Nummern
const RE_WORT = /^[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß.\-]*$/;

const r2 = (n) => Math.round(n * 100) / 100;
const r3 = (n) => Math.round(n * 1000) / 1000;
const gleich = (a, b, tol = 0.011) => a !== null && b !== null && Math.abs(a - b) <= tol;
const fmt = (n) => n === null || n === undefined ? "–" : n.toFixed(2).replace(".", ",") + " €";
const leer = () => ({ anzahl: null, groesse: null, einheit: null });

// Regel 2 (Zahlenform): Ein Preis hat genau zwei Nachkommastellen. Komma deutsch, Tausenderpunkt davor erlaubt,
// Punkt als Dezimalzeichen nur bei genau zwei Stellen. Minus vorn oder hinten (SAP-Stil), „/kg“ markiert den Kilopreis.
// Bricht bei Preisen ohne Komma („1290“) – dafür gibt es centFallback.
function preisWert(t) {
  const m = RE_PREIS.exec(t);
  if (!m) return null;
  const w = parseZahl(m[2]);
  if (w === null) return null;
  return { wert: (m[1] || m[3]) ? -w : w, jeKg: !!m[4] };
}

// OCR-Reparatur: O statt 0 und l/I statt 1 in Zahlen („4OO1234“, „1O“, „12,9O“). Nur, wenn der Token sonst nur aus
// Ziffern, Komma und Punkt besteht und mindestens eine Ziffer enthält. Ein l am Ende bleibt (könnte die Einheit sein, „1l“).
function ocrFix(t) {
  if (!/^[0-9OoIl.,]*-?$/.test(t) || !/\d/.test(t) || !/[OoIl]/.test(t)) return t;
  return t.replace(/[Oo]/g, "0").replace(/[Il](?=[0-9Oo])/g, "1");
}

// Regel 2 (Vorreinigung): Klammerzusätze wie „(7,08/kg)“ entfernen, Eurozeichen und „EUR“ streichen,
// „EUR/kg“ und „je kg“ zu „/kg“ am Preis, nachgestelltes Minus („1,78-“) nach vorn ziehen.
// Angeklebte Einheiten trennen („500g“ → „500 g“), damit Tokens einheitlich sind; „6x2,5kg“ bleibt als Muster ganz.
function tokensAus(text) {
  const s = text.replace(/\([^)]*\)/g, " ")
    .replace(/€/g, " ")
    .replace(/\bEUR\s*\/\s*kg\b/gi, "/kg").replace(/\bje\s+kg\b/gi, "/kg").replace(/\s+\/\s*kg\b/gi, "/kg")
    .replace(/\bEUR\b/g, " ")
    .replace(/(^|\s)(\d[\d.,]*)-(?=\s|$)/g, "$1-$2");
  const roh = s.split(/\s+/).filter(Boolean).flatMap((t) => {
    const m = /^(\d+(?:[,.]\d+)?)(kg|g|l|L|ml|cl)$/.exec(t);
    return m ? [m[1], m[2]] : [t];
  });
  const ocr = new Set();
  const tokens = roh.map((t, i) => { const f = ocrFix(t); if (f !== t) ocr.add(i); return f; });
  return { tokens, orig: roh, ocr };
}

// Regel 5: Gebindekürzel als eigenes Token aus der festen Liste, dazu ausgeschriebene Wörter. Kleingeschriebene Kürzel
// („ka“) zählen nur, wenn direkt eine Zahl folgt. Bricht bei Mehrdeutigkeit (KA Kanister/Karton, ST Stück/Gebinde);
// „MW“/„EW“/„PET“ sind absichtlich keine Gebinde.
function gebindeVon(t, naechster) {
  if (!t) return null;
  const k = t.replace(/\.$/, "");
  if (GEBINDE_KUERZEL[k]) return GEBINDE_KUERZEL[k];
  if (GEBINDE_WORT[t.toLowerCase()]) return GEBINDE_WORT[t.toLowerCase()];
  if (k.length >= 2 && GEBINDE_KUERZEL[k.toUpperCase()] && naechster && /^-?\d/.test(naechster)) return GEBINDE_KUERZEL[k.toUpperCase()];
  return null;
}

// Regel 3: Das letzte Token (A–C, 1–3, 7, 19, 7%, 19 %) ist das Steuerzeichen – aber nur, wenn direkt davor ein Preis
// steht (Schutz vor „Vitamin A“ und vor Mengen am Zeilenende). Bricht auf Lieferscheinen: ohne Preis bleibt das Zeichen im Namen.
function steuerAbtrennen(tokens) {
  let n = tokens.length, z = null;
  if (n >= 2 && tokens[n - 1] === "%" && /^(7|19)$/.test(tokens[n - 2])) { z = tokens[n - 2] + "%"; n -= 2; }
  else if (n >= 1 && /^([A-C]|[1-3]|7|19)%?$/.test(tokens[n - 1])) { z = tokens[n - 1]; n -= 1; }
  const centForm = n >= 2 && /^\d{3,7}$/.test(tokens[n - 1]) && /^\d{3,7}$/.test(tokens[n - 2]);   // „1290 1290 B“: Preis ohne Komma
  if (z === null || n === 0 || (!preisWert(tokens[n - 1]) && !centForm)) return { tokens, steuer: null };
  return { tokens: tokens.slice(0, n), steuer: z };
}
function steuersatzAus(zeichen, karte) {
  if (!zeichen) return null;
  if (/^7%?$/.test(zeichen)) return 0.07;
  if (/^19%?$/.test(zeichen)) return 0.19;
  return karte[zeichen] ?? null;
}

// Regel 1: Artikelnummer (4–13 Ziffern, auch mit Buchstabenpräfix „E123456“) am Zeilenanfang, davor optional eine
// Positionsnummer (unter 100) oder ein Etikett („Art“, Händlerkürzel). Bricht bei Hamberger-artigen Zeilen (Menge vorn,
// siehe hambergerMenge) und wenn das Foto Nummer und Preis auf verschiedene Zeilen gelegt hat.
function artikelKopf(tokens) {
  const istNr = (t) => /^[A-Z]?\d{4,13}$/.test(t);
  if (tokens.length && istNr(tokens[0])) return { nr: tokens[0], start: 1 };
  if (tokens.length > 2 && istNr(tokens[1]) && (/^\d{1,3}$/.test(tokens[0]) || RE_WORT.test(tokens[0])) && !/^\d/.test(tokens[2])) return { nr: tokens[1], start: 2 };
  return { nr: null, start: 0 };
}

// Regel 2 (Lesen von rechts): Der zusammenhängende Zahlenblock am Zeilenende sind die Preise – letzter ist der Gesamtpreis,
// davor der Einzelpreis, ein dritter deutet auf eine Rabattspalte (Regel 8). Bricht bei kg-Ware (kgWare) und Preisen ohne Komma.
function preiseVonRechts(tokens, start) {
  const preise = [];
  for (let i = tokens.length - 1; i >= start && preise.length < 3; i--) {
    const p = preisWert(tokens[i]);
    if (!p) break;
    preise.unshift({ idx: i, ...p });
  }
  return preise;
}

// Regel 2 (Menge): Links vom Einzelpreis stehen Zähleinheit oder Gebindekürzel („2 Stk“, „1 KT“), ein „x“ und davor die Menge.
// Zweistufig „3 x 6 Fl.“ (EDEKA-artig, Regel 4 bricht): dann wird die äußere Zahl ebenfalls gemerkt.
function mengeVonRechts(tokens, von, start) {
  let i = von, gebTok = null;
  while (i >= start && (RE_X.test(tokens[i]) || RE_ZAEHL.test(tokens[i]) || gebindeVon(tokens[i], tokens[i + 1]))) {
    gebTok = gebTok || gebindeVon(tokens[i], tokens[i + 1]);
    i--;
  }
  if (i < start || !RE_GANZ.test(tokens[i])) return null;
  const m = { idx: i, wert: Number(tokens[i]), gebTok, aussen: null };
  if (i - 2 >= start && RE_X.test(tokens[i - 1]) && RE_GANZ.test(tokens[i - 2]) && Number(tokens[i - 2]) > 0) m.aussen = { idx: i - 2, wert: Number(tokens[i - 2]) };
  return m;
}

// Regel 1 bricht (Hamberger-artig): Menge und Gebindekürzel stehen vor dem Namen („2 KT Hähnchenschenkel …“).
function hambergerMenge(tokens, start) {
  if (/^\d{1,4}$/.test(tokens[start] ?? "") && gebindeVon(tokens[start + 1], tokens[start + 2])) return { wert: Number(tokens[start]), gebinde: gebindeVon(tokens[start + 1], tokens[start + 2]) };
  return null;
}

// Regel 6a: kg-Ware als Zahlenblock „5,120 kg x 7,49 38,35“ am Zeilenende (meist zweite Zeile). Gewicht hat 1–3 Nachkommastellen.
// Bricht, wenn der Beleg die Bestellmenge statt des Liefergewichts zeigt (dann geht die Probe nicht auf und die Zeile wird normal gelesen).
function kgWare(tokens, start) {
  const n = tokens.length;
  if (n - start < 5) return null;
  const [g, kg, x, p, s] = tokens.slice(n - 5);
  if (!/^\d+[,.]\d{1,3}$/.test(g) || !/^kg$/i.test(kg) || !RE_X.test(x)) return null;
  const preis = preisWert(p), gesamt = preisWert(s);
  if (!preis || !gesamt) return null;
  return { idx: n - 5, gewicht: parseZahl(g), preis: Math.abs(preis.wert), gesamt: gesamt.wert };
}

// Regel 4: Inhalt je Gebinde aus dem Namensteil. „6x2,5kg“/„12 x 0,75 l“/„4/2,6kg“ → Anzahl × Größe; „30er“ → 30 Stück;
// „6 Stück“/„6 Fl.“ → Anzahl; „ca. 3 kg“ → Zirkagewicht (kg-Ware, Regel 6b); „10 l“ allein → ein Stück dieser Größe.
// Bricht, wenn die Packungsgröße zur Einzelware gehört („Spaghetti 500g ST 12“: hier stimmt es zufällig, weil ST das Gebinde ist)
// und wenn das Muster am Zeilenanfang steht (Fegro-artig, Menge oder Inhalt? → Frage).
function inhaltAusName(str) {
  let anzahl = null, groesse = null, einheit = null, ca = null, rest = str, amAnfang = false, treffer = null;
  let m = /(?<![\d,.])(\d+)\s*[xX*/]\s*(\d+(?:[,.]\d+)?)\s*(kg|g|l|L|ml|cl)(?![A-Za-z])/.exec(rest);
  if (m) { anzahl = Number(m[1]); groesse = parseZahl(m[2]); einheit = EINHEIT[m[3]]; amAnfang = m.index === 0; treffer = m[0]; rest = rest.replace(m[0], " "); }
  m = /(?<![\d,.])(\d+)er(?![A-Za-z])/.exec(rest);
  if (m && anzahl === null) { anzahl = Number(m[1]); rest = rest.replace(m[0], " "); }
  m = /(?<![\d,.])(\d+)\s*(Stück|Stck|Stk|ST|Fl\.?)(?=\s|$)/.exec(rest);
  if (m && anzahl === null) { anzahl = Number(m[1]); rest = rest.replace(m[0], " "); }
  m = /\bca\.?\s*(\d+(?:[,.]\d+)?)\s*(kg|g)(?![A-Za-z])/i.exec(rest);
  if (m) { ca = parseZahl(m[1]) / (m[2].toLowerCase() === "g" ? 1000 : 1); rest = rest.replace(m[0], " "); }
  if (groesse === null) {
    m = /(?<![\d,.xX/])(\d+(?:[,.]\d+)?)\s+(kg|g|l|L|ml|cl)(?![A-Za-z])/.exec(rest);
    if (m) { groesse = parseZahl(m[1]); einheit = EINHEIT[m[2]]; rest = rest.replace(m[0], " "); }
  }
  if (anzahl !== null && einheit === null) einheit = "stk";
  if (anzahl === null && groesse !== null) anzahl = 1;
  return { inhalt: { anzahl, groesse, einheit }, ca, rest, amAnfang, treffer };
}

// Namen bereinigen: Gebindekürzel, Zähleinheiten, „x“, MW/EW-Zusätze und Satzzeichen an den Rändern entfernen.
// Ein Gebindewort als erstes Wort bleibt – es ist Teil des Namens („Fass Pils“), das Gebinde steht dann weiter rechts („Keg“).
function nameBereinigen(str) {
  const w = str.split(/\s+/).filter((t, i) => t && (i === 0 ? !RE_X.test(t) : !gebindeVon(t, "1") && !RE_ZAEHL.test(t) && !RE_X.test(t) && !/^(MW|EW|kg-Ware|ca\.?)$/i.test(t)));
  return w.join(" ").replace(/^[\s\-,;:.]+|[\s\-,;:]+$/g, "").replace(/\s+/g, " ");
}

// Regel 7: Pfand und Leergut sind keine Ware. Schlüsselwörter, aber nicht „inkl./zzgl. Pfand“ im Artikelnamen.
function istPfand(text) {
  return /\b(pfand|leergut|leihgut|leergutrückgabe|leergutrueckgabe)\b/i.test(text.replace(/\b(inkl|incl|zzgl|ohne|mit)\.?\s*pfand\b/gi, ""))
    || /\w+pfand\b/i.test(text);
}
// Regel 8: Rabatt-, Aktions- und Gutschriftzeilen gehören zur vorherigen Zeile (oder zur genannten Artikelnummer).
const RE_RABATT = /\b(rabatt\w*|aktion\w*|sofortrabatt|nachlass|staffel\w*|preisvorteil|bonus|gutschrift|retoure\w*)\b/i;

// Regel 10: Kopfzeilen überspringen. Schlüsselwort zählt nur, wenn die Zeile keine Artikelnummer und keine zwei Preise hat.
const RE_KOPF = /\b(rechnung\w*|kunden-?(?:nr|nummer)|kd-?nr|datum|seite\s+\d|lieferanschrift|liefertag|lieferdatum|lieferschein\w*|tour|fahrer|telefon|tel\.|fax|www\.|http|@|danke|bediener|kasse|filiale|beleg-?nr|bon-?nr|gmbh|ag|e\.k\.|str\.|straße|strasse|art\.?-?nr\.?|artikel-?nr|bezeichnung|einzelpreis|gesamtpreis|menge|ust-?id\w*|steuer-?nr|iban|bic|bank\w*|zahlungsziel|zahlbar|skonto|übertrag|uebertrag|pos\.)/i;
// Regel 9/10: Fußzeilen überspringen, aber auswerten (Summen, Steuerzeichen).
const RE_FUSS = /\b(summe|zwischensumme|netto\w*|brutto\w*|mwst\.?|ust\.?|umsatzsteuer|steuer|gesamt\w*|rechnungsbetrag|endbetrag|zahlbetrag|zu zahlen|total|gegeben|rückgeld|bar|ec-?karte|kartenzahlung|skonto|zahlungsziel)\b/i;

function hatPreis(tokens) {
  return tokens.some((t, i) => preisWert(t) && !RE_EINHEIT.test(tokens[i + 1] ?? ""));
}
// Zahlenzeile: nur Zahlen, Einheiten, „x“, Steuerzeichen – die Fortsetzung einer Artikelzeile („5,120 kg x 7,49 38,35 B“).
function istZahlenzeile(tokens) {
  return tokens.length > 0 && tokens.some((t) => /\d/.test(t))
    && tokens.every((t) => preisWert(t) || /^-?\d+([,.]\d+)?$/.test(t) || RE_X.test(t) || RE_EINHEIT.test(t) || RE_ZAEHL.test(t) || /^(\/kg|%|[A-C]|7%|19%)$/.test(t));
}
// Schnelle Probe für die Kopf-/Fußentscheidung: sieht die Zeile wie Menge × Einzel = Gesamt aus?
function probeGeht(tokens) {
  const st = steuerAbtrennen(tokens), p = preiseVonRechts(st.tokens, 0);
  if (p.length < 2) return false;
  const m = mengeVonRechts(st.tokens, p[0].idx - 1, 0);
  return !!m && gleich(m.wert * p[p.length - 2].wert, p[p.length - 1].wert);
}
function zeilenArt(line) {
  const { tokens } = tokensAus(line);
  if (artikelKopf(tokens).nr) return "inhalt";
  const preise = tokens.filter((t) => preisWert(t)).length;
  if (RE_KOPF.test(line) && preise < 2 && !istPfand(line)) return "kopf";
  if (/^[A-C]\b.*%/.test(line) || /^\d{1,2}(?:[,.]\d{1,2})?\s*%/.test(line)) return "fuss";
  if (RE_FUSS.test(line) && !istPfand(line) && !RE_RABATT.test(line) && !probeGeht(tokens)) return "fuss";
  return "inhalt";
}

// Regel 9: Fußzeile auswerten – Steuerzeichen lernen („MwSt B 19 %“, „B = 19,00 %“, „19 % (B)“) und Summen lesen.
function fussAuswerten(line, f) {
  for (const m of line.matchAll(/\b([A-C])\b\s*[=:]?\s*(?:mwst|ust)?\.?\s*(7|19)(?:[,.]0{1,2})?\s*%/gi)) f.zeichen[m[1].toUpperCase()] = m[2] === "7" ? 0.07 : 0.19;
  for (const m of line.matchAll(/(?<![\d,.])(7|19)(?:[,.]0{1,2})?\s*%\s*\(?\s*(?:mwst|ust)?\.?\s*([A-C])\b/gi)) f.zeichen[m[2].toUpperCase()] = m[1] === "7" ? 0.07 : 0.19;
  const preisNach = (re) => {
    const m = re.exec(line);
    if (!m) return null;
    const p = /-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+\.\d{2}/.exec(line.slice(m.index + m[0].length));
    return p ? preisWert(p[0])?.wert ?? null : null;
  };
  if (/\b(inkl|enthalten\w*)\b/i.test(line)) f.inkl = true;
  if (/\b(zzgl|zuzüglich|zuzueglich)\b/i.test(line)) f.zzgl = true;
  if (/\bmwst|\bust\b|umsatzsteuer/i.test(line) && !/summe|netto|brutto|gesamt/i.test(line)) return;
  const netto = preisNach(/\b(?:summe\s+netto|nettosumme|nettobetrag|warenwert(?:\s+netto)?|netto)\b/i);
  const brutto = preisNach(/\b(?:summe\s+brutto|bruttosumme|bruttobetrag|brutto|gesamtbetrag|rechnungsbetrag|endbetrag|zahlbetrag|zu\s+zahlen|gesamtsumme|total)\b/i);
  const summe = preisNach(/\b(?:summe|zwischensumme|gesamt)\b(?!\s*(?:netto|brutto|betrag))/i);
  if (netto !== null) f.netto = netto;
  if (brutto !== null) f.brutto = brutto;
  if (summe !== null && netto === null && brutto === null) f.summe = summe;
}

// Trennstrich-Umbruch zusammenfügen („Palmöl-“ + „frei“ → „Palmölfrei“), sonst Zeilen mit Leerzeichen verbinden.
function zusammenfuegen(lines) {
  return lines.reduce((acc, l) => acc === null ? l : (/[A-Za-zÄÖÜäöüß]-$/.test(acc) && /^[a-zäöüß]/.test(l) ? acc.slice(0, -1) + l : acc + " " + l), null);
}

function frage(art, text, optionen) { return { art, text, optionen }; }

// Eine Zeilengruppe (eine Belegzeile, ggf. über mehrere Textzeilen) zerlegen. ctx: { hatPreise, zeichen }.
function gruppeZerlegen(lines, ctx) {
  const roh = lines.join("\n");
  const { tokens: alle, orig, ocr } = tokensAus(zusammenfuegen(lines));
  const st = steuerAbtrennen(alle);
  const tokens = st.tokens, steuer = st.steuer;
  const kopf = artikelKopf(tokens);
  let start = kopf.start;
  const text = tokens.slice(start).join(" ");
  const pfand = istPfand(text), rabattWort = RE_RABATT.test(text);

  let menge = null, einzel = null, gesamt = null, jeKg = false, gebinde = null, fr = null, inhalt = leer();
  let nameEnde = tokens.length, mengeInfo = null;

  const kg = kgWare(tokens, start);
  if (kg && gleich(r2(kg.gewicht * kg.preis), kg.gesamt)) {
    // Regel 6a: Menge 1, Inhalt = Liefergewicht, Einzelpreis je kg
    menge = 1; einzel = kg.preis; gesamt = kg.gesamt; jeKg = true; nameEnde = kg.idx;
    inhalt = { anzahl: 1, groesse: kg.gewicht, einheit: "kg" };
  } else {
    const preise = preiseVonRechts(tokens, start);
    const von = preise.length ? preise[0].idx - 1 : tokens.length - 1;
    mengeInfo = mengeVonRechts(tokens, von, start);
    const hb = mengeInfo ? null : hambergerMenge(tokens, start);
    if (hb) { menge = hb.wert; gebinde = hb.gebinde; start += 2; }
    else if (mengeInfo) menge = mengeInfo.wert;
    nameEnde = mengeInfo ? (mengeInfo.aussen ? mengeInfo.aussen.idx : mengeInfo.idx) : (preise.length ? preise[0].idx : tokens.length);

    // Regel 8 (einfache Rabattzeile): Schlüsselwort und nur ein Betrag → Betrag negativ, gehört zur vorherigen Zeile
    const reinesRabattWort = /\b(rabatt\w*|nachlass|gutschrift|preisvorteil|bonus|staffel\w*)\b/i.test(text);
    if (rabattWort && !pfand && preise.length === 1 && (preise[0].wert < 0 || (reinesRabattWort && mengeInfo === null))) {
      return { klasse: "rabatt", roh, betrag: -Math.abs(preise[0].wert), text: nameBereinigen(tokens.slice(start, preise[0].idx).join(" ")), referenz: tokens.find((t) => /^\d{4,13}$/.test(t)) ?? null, steuer };
    }

    if (preise.length >= 2) {
      gesamt = preise[preise.length - 1].wert; einzel = preise[preise.length - 2].wert; jeKg = preise[preise.length - 2].jeKg;
      // Regel 8 bricht: Rabattspalte in der Artikelzeile (drei Zahlen, Menge × Einzel + Rabatt = Gesamt)
      if (preise.length === 3 && menge !== null && preise[1].wert < 0 && gleich(menge * preise[0].wert + preise[1].wert, gesamt)) {
        einzel = preise[0].wert; jeKg = preise[0].jeKg;
        return fertig({ rabattSpalte: preise[1].wert });
      }
      if (mengeInfo?.aussen) {
        // EDEKA-artig „3 x 6 Fl. 1,19 21,42“: äußere × innere × Einzel = Gesamt → Preis je Einzelstück, Frage nach der Bezugsgröße
        const a = mengeInfo.aussen.wert, i = mengeInfo.wert;
        if (gleich(a * i * einzel, gesamt)) {
          menge = a; inhalt.anzahl = i;
          fr = frage("preis", `„${a} x ${i}“: ${a} Gebinde à ${i} Stück, Preis ${fmt(einzel)} je Stück – oder ${a * i} einzelne Stück?`, [
            { text: `${a} Gebinde à ${i}, ${fmt(r2(einzel * i))} je Gebinde`, wert: { menge: a, einzelpreis: r2(einzel * i) } },
            { text: `${a * i} Stück à ${fmt(einzel)}`, wert: { menge: a * i, einzelpreis: einzel } },
          ]);
          return fertig({ aussenInnen: true });
        }
        if (gleich(a * einzel, gesamt)) { menge = a; inhalt.anzahl = i; }
        else if (gleich(i * einzel, gesamt)) { menge = i; nameEnde = mengeInfo.idx; }
      }
      // Regel 1 bricht: Menge vorn ohne Kürzel („2 Brötchen 0,35 0,70“) – nur, wenn die Probe damit aufgeht
      if (menge === null && !kopf.nr && /^\d{1,4}$/.test(tokens[start] ?? "") && !RE_X.test(tokens[start + 1] ?? "") && gleich(Number(tokens[start]) * einzel, gesamt)) { menge = Number(tokens[start]); start += 1; }
      if (menge === null) {
        if (gleich(einzel, gesamt)) menge = 1;
        else if (einzel !== 0 && Number.isInteger(r2(gesamt / einzel)) && Math.abs(gesamt / einzel) <= 9999) {
          menge = Math.round(gesamt / einzel);
          fr = frage("menge", `„${fmt(einzel)} … ${fmt(gesamt)}“: Menge fehlt auf der Zeile – ${menge} Gebinde?`, [
            { text: `${menge} Gebinde à ${fmt(einzel)}`, wert: { menge } },
            { text: `1 Gebinde für ${fmt(gesamt)}`, wert: { menge: 1, einzelpreis: gesamt } },
          ]);
        }
      }
      // Regel 1 bricht: Positionsnummer ohne Artikelnummer („31 PFAND Kiste …“) – nur, wenn die Menge rechts schon feststeht
      if (!kopf.nr && mengeInfo !== null && /^\d{1,3}$/.test(tokens[start] ?? "") && RE_WORT.test(tokens[start + 1] ?? "") && (tokens[start + 1] ?? "").length >= 2 && start + 1 < nameEnde) start += 1;
    } else if (preise.length === 1) {
      const p = preise[0];
      if (menge === null) { menge = 1; einzel = gesamt = p.wert; jeKg = p.jeKg; }
      else {
        einzel = p.wert; gesamt = r2(menge * p.wert); jeKg = p.jeKg;
        fr = frage("preis", `„${menge} … ${fmt(p.wert)}“: ist ${fmt(p.wert)} der Preis je Gebinde oder der Zeilenwert?`, [
          { text: `je Gebinde (Zeile = ${fmt(r2(menge * p.wert))})`, wert: { einzelpreis: p.wert, gesamt: r2(menge * p.wert) } },
          { text: `Zeilenwert (je Gebinde = ${fmt(r2(p.wert / menge))})`, wert: { einzelpreis: r2(p.wert / menge), gesamt: p.wert } },
        ]);
      }
    } else {
      const cent = centFallback(tokens, start);
      if (cent) {
        // Regel 2 bricht: Preis ohne Komma („1290 1290“) – als Cent lesbar, aber nur mit Frage
        menge = cent.menge; einzel = cent.einzel; gesamt = cent.gesamt; nameEnde = cent.idx;
        fr = frage("preis", `„${cent.roh}“: Komma beim Foto verloren – ${fmt(cent.einzel)} oder ${cent.einzel * 100} €?`, [
          { text: `${fmt(cent.einzel)} je Gebinde`, wert: { einzelpreis: cent.einzel, gesamt: cent.gesamt } },
          { text: `${cent.einzel * 100} € je Gebinde`, wert: { einzelpreis: cent.einzel * 100, gesamt: cent.gesamt * 100 } },
        ]);
      }
    }
  }
  return fertig({});

  function centFallback(toks, s) {
    const n = toks.length;
    if (n - s < 2 || !/^\d{3,7}$/.test(toks[n - 1]) || !/^\d{3,7}$/.test(toks[n - 2])) return null;
    const ges = Number(toks[n - 1]) / 100, ein = Number(toks[n - 2]) / 100;
    const m = /^\d{1,4}$/.test(toks[n - 3] ?? "") ? Number(toks[n - 3]) : (gleich(ein, ges) ? 1 : null);
    if (m === null || !gleich(m * ein, ges)) return null;
    return { menge: m, einzel: ein, gesamt: ges, idx: m === 1 && !/^\d{1,4}$/.test(toks[n - 3] ?? "") ? n - 2 : n - 3, roh: toks[n - 2] + " " + toks[n - 1] };
  }

  function fertig({ rabattSpalte = 0, aussenInnen = false }) {
    const nameTokens = tokens.slice(start, nameEnde);
    if (gebinde === null) for (let i = nameTokens.length - 1; i >= 0 && !gebinde; i--) gebinde = gebindeVon(nameTokens[i], nameTokens[i + 1] ?? "1");
    if (gebinde === null && mengeInfo?.gebTok) gebinde = mengeInfo.gebTok;
    const ia = inhaltAusName(nameTokens.join(" "));
    // Regel 7 (Zusatz MW): Getränk in Mehrweg mit Flaschenmuster „12x0,7l“ ohne Kürzel steht im Kasten
    if (gebinde === null && !pfand && ia.inhalt.einheit === "l" && ia.inhalt.anzahl > 1 && nameTokens.some((t) => /^(MW|Mehrweg)$/i.test(t))) gebinde = "kasten";
    if (!jeKg || inhalt.groesse === null) {
      if (aussenInnen) inhalt = { anzahl: inhalt.anzahl, groesse: ia.inhalt.groesse, einheit: ia.inhalt.einheit ?? "stk" };
      else if (ia.inhalt.anzahl !== null || ia.inhalt.groesse !== null) inhalt = ia.inhalt;
    }
    // Regel 6b: Kilopreis in der Zeile („7,49/kg“) → Inhalt = geliefertes Gewicht aus Gesamt / Preis, „ca.“-Gewicht nur zur Bestätigung
    if (jeKg && einzel && gesamt !== null && inhalt.groesse === null) {
      const gew = ia.ca !== null && gleich(r2(ia.ca * einzel * (menge ?? 1)), gesamt) ? ia.ca : r3(gesamt / einzel / (menge ?? 1));
      inhalt = { anzahl: 1, groesse: gew, einheit: "kg" };
    }
    if (inhalt.anzahl === null && inhalt.groesse === null && gebinde === "stueck") inhalt = { anzahl: 1, groesse: null, einheit: "stk" };
    let name = nameBereinigen(ia.rest);
    if (!name) name = nameBereinigen(nameTokens.join(" ")) || nameBereinigen(tokens.slice(kopf.start).join(" "));

    // Rückgabe/Retoure: negativer Zeilenwert bei positiver Menge → Menge negativ, Einzelpreis positiv
    if (gesamt !== null && gesamt < 0 && menge !== null && menge > 0) { menge = -menge; einzel = Math.abs(einzel); }
    if (einzel !== null && einzel < 0 && menge !== null) { einzel = -einzel; if (menge > 0) menge = -menge; }

    // Gegenprobe Menge × Einzelpreis (+ Rabattspalte) = Gesamt
    let probe = null;
    if (menge !== null && einzel !== null && gesamt !== null) {
      const soll = jeKg ? menge * (inhalt.groesse ?? 0) * einzel : menge * einzel;
      probe = gleich(r2(soll + rabattSpalte), gesamt);
      if (!probe && !fr) {
        const opt = [{ text: `Gesamt ${fmt(r2(soll))}`, wert: { gesamt: r2(soll) } }, { text: `Einzelpreis ${fmt(r2(gesamt / menge))}`, wert: { einzelpreis: r2(gesamt / menge) } }];
        if (einzel !== 0 && Number.isInteger(r2(gesamt / einzel))) opt.push({ text: `Menge ${Math.round(gesamt / einzel)}`, wert: { menge: Math.round(gesamt / einzel) } });
        fr = frage("preis", `„${menge} × ${fmt(einzel)}“ ergibt ${fmt(r2(soll))}, auf dem Beleg steht ${fmt(gesamt)} – was stimmt?`, opt);
      }
    }
    if (!fr && gesamt === null && ctx.hatPreise && !pfand) {
      fr = frage("preis", `„${name}“: auf dieser Zeile steht kein Preis – was tun?`, [
        { text: "Preis später eintragen", wert: {} },
        { text: "Zeile ist keine Ware, weglassen", wert: { menge: 0, gesamt: 0 } },
      ]);
    }
    // Regel 4 bricht: Inhaltsmuster am Zeilenanfang („7 x 1 kg Rinderfilet …“) – Menge oder Inhalt?
    if (!fr && ia.amAnfang && inhalt.anzahl > 1 && menge !== null && einzel !== null) {
      fr = frage("inhalt", `„${ia.treffer}“ steht vor dem Namen: ${menge} Gebinde mit ${inhalt.anzahl} × ${inhalt.groesse} ${inhalt.einheit}, oder ${inhalt.anzahl * menge} einzelne Gebinde à ${inhalt.groesse} ${inhalt.einheit}?`, [
        { text: `${menge} Gebinde mit ${inhalt.anzahl} × ${inhalt.groesse} ${inhalt.einheit}`, wert: { menge, inhalt: { ...inhalt } } },
        { text: `${inhalt.anzahl * menge} Gebinde à ${inhalt.groesse} ${inhalt.einheit}`, wert: { menge: inhalt.anzahl * menge, inhalt: { anzahl: 1, groesse: inhalt.groesse, einheit: inhalt.einheit }, einzelpreis: r2(einzel / inhalt.anzahl) } },
      ]);
    }
    // OCR-Reparatur im Namensteil (z. B. „1O l“ → „10 l“) kann nicht gegengeprüft werden → Frage
    const ocrName = [...ocr].filter((i) => i >= start && i < nameEnde);
    if (!fr && ocrName.length && !pfand) {
      const o = ocrName.map((i) => orig[i]).join(" "), n = ocrName.map((i) => tokens[i]).join(" ");
      fr = frage("inhalt", `„${o}“ wurde als „${n}“ gelesen – stimmt das?`, [
        { text: `Ja, ${n}`, wert: { inhalt: { ...inhalt } } },
        { text: "Nein, Inhalt selbst eintragen", wert: { inhalt: leer() } },
      ]);
    }

    if (pfand) return { klasse: "pfand", roh, text: name, betrag: gesamt, anzahl: menge, steuer };
    if (menge === null && !kopf.nr && gesamt === null) return { klasse: "schmutz" };
    const sicher = !fr && !!name && menge !== null && (ctx.hatPreise ? probe === true : true);
    return {
      klasse: "ware",
      zeile: { roh, name, artikelnummer: kopf.nr, bekannt: null, gebinde, inhalt, menge, einzelpreis: einzel, jeKg, gesamt, rabatt: rabattSpalte, steuer, steuersatz: steuersatzAus(steuer, ctx.zeichen), sicher, frage: fr },
    };
  }
}

const LIEFERANTEN = [["metro", "Metro"], ["selgros", "Selgros"], ["transgourmet", "Transgourmet"], ["chefs culinar", "Chefs Culinar"], ["citti", "Citti"], ["hamberger", "Hamberger"], ["handelshof", "Handelshof"], ["edeka", "Edeka Foodservice"], ["lekkerland", "Lekkerland"], ["fegro", "Fegro"], ["famila", "Famila"], ["bartels", "Bartels-Langness"], ["kaufland", "Kaufland"], ["trinks", "Trinks"], ["gedig", "GEDIG"], ["rewe", "Rewe"], ["getränke", null]];
function lieferantAus(lines) {
  for (const l of lines) for (const [k, name] of LIEFERANTEN) if (l.toLowerCase().includes(k)) return name ?? l.trim().slice(0, 40);
  return null;
}
function datumAus(text) {
  for (const m of text.matchAll(/(?<!\d)(\d{1,2})\.(\d{1,2})\.(\d{4}|\d{2})(?!\d)/g)) {
    const t = Number(m[1]), mo = Number(m[2]), j = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    if (t >= 1 && t <= 31 && mo >= 1 && mo <= 12 && j >= 2000 && j <= 2099) return `${j}-${String(mo).padStart(2, "0")}-${String(t).padStart(2, "0")}`;
  }
  return null;
}
// Zuordnung zu bekannten Artikelnamen: Teilwort, case-insensitiv, nur bei genau einem Treffer.
function bekanntZuordnen(name, bekannt) {
  const n = name.toLowerCase();
  const treffer = bekannt.filter((b) => {
    const bl = String(b).toLowerCase().trim();
    if (!bl) return false;
    if (n.includes(bl) || bl.includes(n)) return true;
    const w = bl.split(/\s+/).filter((x) => x.length >= 3);
    return w.length > 0 && w.every((x) => n.includes(x));
  });
  return treffer.length === 1 ? String(treffer[0]) : null;
}

export function belegZerlegen(text, { bekannt = [] } = {}) {
  const lines = String(text ?? "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const fuss = { zeichen: {}, netto: null, brutto: null, summe: null, inkl: false, zzgl: false };
  const gruppen = [], uebrig = [];
  let g = null, uebersprungen = 0;
  const schliessen = () => { if (g) gruppen.push(g); g = null; };

  // Regel 10: erst Kopf, Fuß und Schmutz entfernen, dann Fortsetzungszeilen an die vorherige Zeile hängen
  for (const line of lines) {
    const art = zeilenArt(line);
    if (art !== "inhalt") { uebrig.push(line); uebersprungen++; if (art === "fuss") fussAuswerten(line, fuss); continue; }
    const { tokens } = tokensAus(line);
    const nummer = !!artikelKopf(tokens).nr, preis = hatPreis(tokens), zahlen = istZahlenzeile(tokens);
    if (zahlen && g) { g.lines.push(line); g.preis ||= preis; continue; }
    if (nummer) { schliessen(); g = { lines: [line], preis, schwach: false }; continue; }
    if (g && !g.preis) {
      if (g.schwach && preis && /[A-Za-zÄÖÜäöüß]{3,}/.test(line)) { uebrig.push(...g.lines); uebersprungen += g.lines.length; g = null; }
      else { g.lines.push(line); g.preis = preis; continue; }
    }
    schliessen();
    g = { lines: [line], preis, schwach: !preis && !/\d/.test(line) };
  }
  schliessen();

  const ctx = { hatPreise: gruppen.some((x) => x.preis), zeichen: fuss.zeichen };
  const zeilen = [], pfand = [];
  for (const gr of gruppen) {
    const e = gruppeZerlegen(gr.lines, ctx);
    if (e.klasse === "ware") { e.zeile.bekannt = bekanntZuordnen(e.zeile.name, bekannt); zeilen.push(e.zeile); continue; }
    if (e.klasse === "pfand") { pfand.push({ roh: e.roh, text: e.text, betrag: e.betrag, anzahl: e.anzahl }); continue; }
    if (e.klasse === "rabatt") {
      // Regel 8: zur referenzierten Artikelnummer, sonst zur vorherigen Warenzeile
      let ziel = e.referenz ? zeilen.find((z) => z.artikelnummer === e.referenz) : null;
      if (!ziel) ziel = zeilen[zeilen.length - 1] ?? null;
      if (ziel) {
        ziel.rabatt = r2(ziel.rabatt + e.betrag);
        if (ziel.gesamt !== null) ziel.gesamt = r2(ziel.gesamt + e.betrag);
        ziel.roh += "\n" + e.roh;
      } else {
        zeilen.push({ roh: e.roh, name: e.text, artikelnummer: null, bekannt: null, gebinde: null, inhalt: leer(), menge: 1, einzelpreis: e.betrag, jeKg: false, gesamt: e.betrag, rabatt: 0, steuer: e.steuer, steuersatz: steuersatzAus(e.steuer, fuss.zeichen), sicher: false,
          frage: frage("artikel", `„${e.text}“: Rabatt ohne Bezugszeile – zu welchem Artikel gehört er?`, [{ text: "Als eigene Minuszeile behalten", wert: {} }, { text: "Weglassen", wert: { menge: 0, gesamt: 0 } }]) });
      }
      continue;
    }
    uebrig.push(...gr.lines); uebersprungen += gr.lines.length;
  }

  // Regel 9: netto oder brutto nur über die Fußzeile, Zeilensumme ohne Pfand (Pfand zusätzlich erlaubt)
  const zeilenSumme = r2(zeilen.reduce((s, z) => s + (z.gesamt ?? 0), 0));
  const pfandSumme = r2(pfand.reduce((s, p) => s + (p.betrag ?? 0), 0));
  const passt = (s) => s !== null && (Math.abs(zeilenSumme - s) <= 0.05 || Math.abs(zeilenSumme + pfandSumme - s) <= 0.05);
  let basis = "unklar", summeStimmt = null;
  if (passt(fuss.netto)) { basis = "netto"; summeStimmt = true; }
  else if (passt(fuss.brutto)) { basis = "brutto"; summeStimmt = true; }
  else if (passt(fuss.summe)) { basis = fuss.inkl ? "brutto" : fuss.zzgl ? "netto" : "unklar"; summeStimmt = true; }
  else if (fuss.netto !== null || fuss.brutto !== null || fuss.summe !== null) summeStimmt = false;

  const hatPreise = zeilen.some((z) => z.gesamt !== null) || pfand.some((p) => p.betrag !== null);
  const typ = hatPreise ? "rechnung" : (zeilen.length ? "lieferschein" : "unklar");
  return {
    lieferant: lieferantAus(uebrig), datum: datumAus(lines.join("\n")), typ, basis,
    summeNetto: fuss.netto, summeBrutto: fuss.brutto, zeilenSumme, summeStimmt,
    steuerzeichen: { ...fuss.zeichen }, zeilen, pfand, uebersprungen,
  };
}

// Antwort des Wirts flach auf die Zeile setzen; Gesamt folgt, wenn Menge oder Einzelpreis neu sind und Gesamt nicht mitkommt.
export function zeileAnwenden(zeile, wert) {
  const z = { ...zeile, ...(wert ?? {}), sicher: true, frage: null };
  if (wert && wert.inhalt) z.inhalt = { ...leer(), ...wert.inhalt };
  if (wert && !("gesamt" in wert) && ("menge" in wert || "einzelpreis" in wert) && z.menge !== null && z.einzelpreis !== null && !z.jeKg) z.gesamt = r2(z.menge * z.einzelpreis + (z.rabatt ?? 0));
  return z;
}

// Nettopreis je Basis (kg, l oder Stück) des Gebindes: Gesamt / Menge / Inhalt. Bei Brutto-Belegen vorher durch (1 + Steuersatz).
export function preisJeEinheit(zeile, basis = zeile.basis ?? "netto") {
  const n = () => ({ preis: null, einheit: null });
  if (!zeile || zeile.gesamt === null || !zeile.menge) return n();
  let jeGebinde = zeile.gesamt / Math.abs(zeile.menge);
  if (basis === "brutto") { if (zeile.steuersatz === null || zeile.steuersatz === undefined) return n(); jeGebinde /= 1 + zeile.steuersatz; }
  else if (basis !== "netto") return n();
  const { anzahl, groesse, einheit } = zeile.inhalt ?? leer();
  const faktor = { kg: 1, g: 0.001, l: 1, ml: 0.001, cl: 0.01 };
  if (groesse !== null && einheit && faktor[einheit]) {
    const basisEinheit = einheit === "kg" || einheit === "g" ? "kg" : "l";
    return { preis: r2(jeGebinde / ((anzahl ?? 1) * groesse * faktor[einheit])), einheit: basisEinheit };
  }
  if (anzahl !== null) return { preis: r2(jeGebinde / anzahl), einheit: "stk" };
  if (zeile.gebinde === "stueck") return { preis: r2(jeGebinde), einheit: "stk" };
  return n();
}

// ---------- Trennung 2 (17.10.2026): Prüfen eines gelesenen Belegs (vorher in js/screens/beleg.js) ----------
// Vorschläge aus der Artikelliste für eine unbekannte Zeile: Wortüberlappung, bis zu vier Namen.
export function belegKandidaten(stand, name) {
  const w = name.toLowerCase().split(/[^a-zäöüß0-9]+/).filter((x) => x.length > 2);
  return (stand.artikel || []).map((a) => { const an = a.name.toLowerCase(); const s = w.filter((x) => an.includes(x)).length + (w.some((x) => an.startsWith(x)) ? 1 : 0); return { a, s }; })
    .filter((x) => x.s > 0).sort((x, y) => y.s - x.s).slice(0, 4).map((x) => x.a.name);
}
// Lieferschein = als Lieferschein erkannt oder keine Zeile mit Betrag.
export const belegIstLieferschein = (beleg, zeilen) => !!beleg && (beleg.typ === "lieferschein" || !zeilen.some((z) => z.gesamt !== null));
// Datum der Buchung: Belegdatum, außer „heute“ gewählt, Datum fehlt oder liegt in der Zukunft.
export const belegDatumVon = (beleg, datumWahl, H) => (datumWahl === "heute" || !beleg?.datum || beleg.datum > H ? H : beleg.datum);
// Stand der Prüfung: offene Fragen, ungeklärte und sichere Zeilen, Basis, Summen und ob übernommen werden kann.
// zuordnung: Zeile → Artikelname | "neu" | "weg"; basisWahl: "netto" | "brutto" | null (nur bei unklarer Basis).
export function belegPruefStand(beleg, zeilen, zuordnung, basisWahl) {
  const fragen = zeilen.map((z, i) => ({ z, i })).filter((x) => x.z.frage);
  const offen = zeilen.map((z, i) => ({ z, i })).filter((x) => !x.z.frage && !x.z.bekannt && zuordnung[x.i] === undefined);
  const sicher = zeilen.filter((z, i) => !z.frage && (z.bekannt || typeof zuordnung[i] === "string"));
  const ls = belegIstLieferschein(beleg, zeilen);
  const basis = ls ? "netto" : beleg.basis === "unklar" ? basisWahl : beleg.basis;
  const pfandSumme = (beleg.pfand || []).reduce((s, p) => s + (Number(p.betrag) || 0), 0);
  const summe = zeilen.reduce((s, z) => s + (z.gesamt || 0), 0) + pfandSumme;
  const sicherSumme = sicher.reduce((s, z) => s + (z.gesamt || 0), 0);
  const basisFrage = !ls && beleg.basis === "unklar";
  const nFragen = fragen.length + offen.length + (basisFrage && !basisWahl ? 1 : 0);
  const kannUebernehmen = nFragen === 0 && zeilen.some((z, i) => zuordnung[i] !== "weg");
  const summeBeleg = beleg.summeNetto !== null || beleg.summeBrutto !== null ? (basis === "brutto" && beleg.summeBrutto !== null ? beleg.summeBrutto : (beleg.summeNetto ?? beleg.summeBrutto)) : null;
  return { fragen, offen, sicher, ls, basis, basisFrage, pfandSumme, summe, sicherSumme, summeBeleg, nFragen, kannUebernehmen };
}
