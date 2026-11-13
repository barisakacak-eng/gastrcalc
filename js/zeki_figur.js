// Zeki neu (Salbei & Papier, 12.11.2026): ruhende Haltung für die Bühne, Mienen-Bilder, Bewegungs-Folgen und ein kleiner Abspieler.
// Reine Funktionen plus zekiSpielen(el, name): kein Zugriff auf document/window auf Modulebene, darum in Node importierbar und testbar.
// Quelle der Zahlen: assets/brand/zeki-buehne/zuordnung.json, assets/brand/zeki/ablauf.json, assets/brand/zeki-gelenke.json (tests/zeki_figur.test.mjs prüft Gleichheit).
// Die frühere Vektorfigur und ihre Gliederpuppe gibt es nicht mehr: Der neue Zeki besteht aus gemalten Flächen und wird nur als Bild und als Raster-Folge gezeigt.
import { esc } from "./util.js";
import { berlin } from "./zeit.js";

// ---------- Maße (assets/brand/zeki-gelenke.json, zuordnung.json, ablauf.json) ----------
export const FILMFENSTER = [-80, -45, 420, 521.71875]; // Ausschnitt der Figur-Koordinaten (viewBox 0 0 237 328), den jedes Bild der Folgen zeigt
export const ZELLE_KLEIN = [256, 318];                 // eine Zelle der Folgen in assets/brand/zeki-klein/ (Raster 5 × 5)
export const BUEHNE_MASSE = [512, 354];                // ein Bühnen-Bild: oberer Teil der Figur, oben links bündig mit der Zelle (bis schnitt_y)
export const SCHNITT_Y = 245;                          // Figur-Koordinate der unteren Bühnenkante: Hüfte aufwärts
export const DARSTELLUNG_BREITE = 116;                 // Breite der Figur in der Bühne (CSS-px, .gc-figur)
export const SPALTEN = 5, ZEILEN = 5, BILDER = 25;
export const ORDNER_BUEHNE = "assets/brand/zeki-buehne/", ORDNER_FOLGEN = "assets/brand/zeki-klein/", ORDNER_MIENEN = "assets/brand/zeki-mienen/";

// ---------- Bühnen-Bilder: Schlüssel → [Haltung, Miene] (aus assets/brand/zeki-buehne/zuordnung.json) ----------
const BUEHNE = {
  "start": ["hand", "hilfe"], "foto-auswahl": ["zeigen-unten", "neutral"], "zahl-eingeben": ["schreiben", "neutral"], "rundgang": ["schreiben", "import"],
  "abhak-liste": ["zeigen-unten", "hilfe"], "geschafft": ["jubeln", "freude"], "buero": ["warten", "hilfe"], "eintragsliste": ["suchen", "import"],
  "eintrag-aendern": ["schreiben", "hilfe"], "zahlen-verlauf": ["zahlen-zeigen", "hilfe"], "papier-aushang": ["papier-zeigen", "hilfe"], "blatt-sperre": ["warten", "warnung"],
  "intro": ["warten", "hilfe"], "sprache": ["hand", "hilfe"], "laden": ["zeigen-links", "hilfe"], "karte-fotografieren": ["foto", "neutral"],
  "kuehlgeraete": ["pruefen", "import"], "kosten": ["nachdenken", "frage"], "fertig": ["jubeln", "freude"], "fuehrung": ["zeigen-oben", "aufmerksam"],
  "heute-morgen": ["hand", "hilfe"], "heute-mittendrin": ["zeigen-unten", "neutral"], "heute-abend": ["daumen", "bestaetigt"], "menue-blatt": ["zeigen-links", "neutral"],
};
export const ZEKI_BUEHNE = Object.fromEntries(Object.entries(BUEHNE).map(([k, [haltung, miene]]) => [k, { datei: `${ORDNER_BUEHNE}${k}.webp`, haltung, miene }]));
export const BUEHNEN_SCHLUESSEL = Object.keys(ZEKI_BUEHNE);
const NOTFALL_BUEHNE = "intro"; // ruhigste Haltung, falls ein Schlüssel nicht stimmt: lieber Zeki ruhig als keine Figur

// Bühnen-Bild zu einem der 24 Schlüssel; unbekannt → null
export const buehnenBild = (schluessel) => (Object.hasOwn(ZEKI_BUEHNE, schluessel) ? { ...ZEKI_BUEHNE[schluessel] } : null);

// ---------- Mienen als ganze Figur (assets/brand/zeki-mienen/zeki-<zustand>.webp) ----------
export const MIENEN = ["neutral", "freude", "frage", "import", "preis", "hilfe", "warnung", "bestaetigt", "aufmerksam", "erleichtert", "fehler", "staunt"];
export const mienenBild = (zustand) => `${ORDNER_MIENEN}zeki-${MIENEN.includes(zustand) ? zustand : "neutral"}.webp`;

// ---------- Bewegungs-Folgen (aus assets/brand/zeki/ablauf.json): Name → [Dauer ms, Miene, beginnt in Ruhe, endet in Ruhe, Schleife] ----------
const FOLGEN = {
  "warten": [4200, "neutral", 1, 1, 1], "zwinkern": [720, "hilfe", 1, 1, 0], "grinsen": [720, "freude", 1, 1, 0], "hand": [1200, "hilfe", 1, 1, 0], "nicken": [1200, "hilfe", 1, 1, 0],
  "kopfschuetteln": [1200, "warnung", 1, 1, 0], "pruefen": [1200, "import", 1, 1, 0], "preis": [1200, "preis", 1, 1, 0], "zeigen-links": [1400, "neutral", 1, 1, 0], "zeigen-rechts": [1400, "neutral", 1, 1, 0],
  "zeigen-oben": [1400, "aufmerksam", 1, 1, 0], "zeigen-unten": [1400, "neutral", 1, 1, 0], "kopf-drehen": [1600, "neutral", 1, 1, 0], "auftreten": [2400, "hilfe", 0, 1, 0], "abgehen": [2400, "hilfe", 1, 0, 0],
  "schuerze": [1800, "neutral", 1, 1, 0], "daumen": [1400, "bestaetigt", 1, 1, 0], "nachdenken": [1800, "frage", 1, 1, 0], "schreiben": [1800, "neutral", 1, 1, 0], "suchen": [1800, "import", 1, 1, 0],
  "zahlen-zeigen": [1800, "hilfe", 1, 1, 0], "papier-zeigen": [1800, "hilfe", 1, 1, 0], "jubeln": [1400, "freude", 1, 1, 0], "foto": [1800, "neutral", 1, 1, 0], "muenze": [1600, "bestaetigt", 1, 1, 0],
};
export const ZEKI_FOLGEN = Object.fromEntries(Object.entries(FOLGEN).map(([name, [dauerMs, miene, anfang, ende, schleife]]) => [name, { name, miene, dauerMs, beginntInRuhe: !!anfang, endetInRuhe: !!ende, schleife: !!schleife }]));
export const FOLGEN_NAMEN = Object.keys(ZEKI_FOLGEN);

// Folge zu einem Namen; unbekannt → null
export function folge(name) {
  if (!Object.hasOwn(ZEKI_FOLGEN, name)) return null;
  const f = ZEKI_FOLGEN[name];
  return { datei: `${ORDNER_FOLGEN}${name}.webp`, bilder: BILDER, spalten: SPALTEN, zeilen: ZEILEN, dauerMs: f.dauerMs, schleife: f.schleife, beginntInRuhe: f.beginntInRuhe, endetInRuhe: f.endetInRuhe };
}

// ---------- Deckung von Bild und Folge ----------
// Das Bühnen-Bild ist der obere Teil der Zelle der großen Folgen (512 × 636) und liegt oben links bündig auf der Zelle: gleicher Maßstab (512 für 420 Figur-Einheiten).
// Die Folge wird darum mit derselben Breite gezeigt (Zelle = Darstellungsbreite) und oben links bündig auf das Bild gelegt; unten schneidet die Höhe des Bildes ab (Hüfte).
export function ausschnitt(breite = DARSTELLUNG_BREITE) {
  const zelleH = breite * ZELLE_KLEIN[1] / ZELLE_KLEIN[0];
  return {
    breite, hoehe: breite * BUEHNE_MASSE[1] / BUEHNE_MASSE[0], // sichtbarer Bereich = Größe des Bühnen-Bildes (116 × 80,2)
    zelleB: breite, zelleH, bildB: breite * SPALTEN, bildH: zelleH * ZEILEN, // Größe des ganzen Rasters als background-size
    position: (i) => [-(i % SPALTEN) * breite, -Math.floor(i / SPALTEN) * zelleH], // background-position für Bild Nummer i (0–24, zeilenweise)
  };
}
// Wo liegt die Figur-Koordinate (fx, fy) auf dem Bildschirm (relativ zur oberen linken Ecke der Figur)? – im ruhenden Bühnen-Bild …
export function bildPunkt(fx, fy, breite = DARSTELLUNG_BREITE) {
  const px = BUEHNE_MASSE[0] / FILMFENSTER[2]; // Bild-Pixel je Figur-Einheit
  return [(fx - FILMFENSTER[0]) * px * breite / BUEHNE_MASSE[0], (fy - FILMFENSTER[1]) * px * breite / BUEHNE_MASSE[0]];
}
// … und im Bild Nummer i der Folge mit dem Ausschnitt aus ausschnitt()
export function folgePunkt(fx, fy, breite = DARSTELLUNG_BREITE, i = 0) {
  const a = ausschnitt(breite), [px, py] = a.position(i);
  const zx = (fx - FILMFENSTER[0]) * ZELLE_KLEIN[0] / FILMFENSTER[2], zy = (fy - FILMFENSTER[1]) * ZELLE_KLEIN[1] / FILMFENSTER[3]; // Punkt in der Zelle (Pixel der Datei)
  const sx = a.bildB / (SPALTEN * ZELLE_KLEIN[0]), sy = a.bildH / (ZEILEN * ZELLE_KLEIN[1]); // Raster-Pixel der Datei → Bildschirm
  return [((i % SPALTEN) * ZELLE_KLEIN[0] + zx) * sx + px, (Math.floor(i / SPALTEN) * ZELLE_KLEIN[1] + zy) * sy + py];
}

// Das Bühnen-Bild einer Haltung ist die GEHALTENE Pose (Höhepunkt der Folge, z. B. Hand oben), nicht die Ruhe in Bild 0 der Folge. HALTEBILD nennt je Haltung das Bild der Folge,
// das dem Bühnen-Bild entspricht (gemessen mit tools/zeki_deckung.py, Überdeckung ≈ 0,998, Verschiebung 0/0; Datei assets/brand/zeki-buehne/haltebild.json).
// Darum wird eine Ankunft nur bis zu diesem Bild gespielt und dann unsichtbar gegen das Bühnen-Bild getauscht, und Ereignisse laufen als Kette: Pose → Ruhe, Ereignis, Ruhe → Pose.
const HALTE = { "daumen": 7, "foto": 9, "hand": 9, "jubeln": 8, "nachdenken": 5, "papier-zeigen": 12, "pruefen": 5, "schreiben": 5, "suchen": 6, "warten": 0, "zahlen-zeigen": 5, "zeigen-links": 6, "zeigen-oben": 6, "zeigen-unten": 6 };
export const HALTEBILD = Object.freeze({ ...HALTE });

// ---------- Ruhende Figur für die Bühne ----------
export function figurHtml({ schluessel, rtl = false } = {}) {
  const k = Object.hasOwn(ZEKI_BUEHNE, schluessel) ? schluessel : NOTFALL_BUEHNE, b = ZEKI_BUEHNE[k];
  const a = ausschnitt(DARSTELLUNG_BREITE);
  return `<div class="gc-figur"${rtl ? ' data-gespiegelt="1"' : ""} data-zeki-buehne="${esc(k)}"><img class="gc-zeki" src="${esc(b.datei)}" alt="" width="${DARSTELLUNG_BREITE}" height="${Math.round(a.hoehe)}" decoding="async"></div>`;
}

// ---------- Zeki vorn (Führung, Intro, Hinweis, Blatt von unten) ----------
// Er steht dann nicht in der Bühne, sondern vor dem Inhalt: die ganze Figur als Zelle der Folgen (256 × 318, die Figur selbst nimmt davon ≈ 47 % × 59 % ein), ohne Kreis, ohne Rahmen.
// Das Bild ist die passende Miene aus assets/brand/zeki-mienen/ (gleiche Zelle, deckungsgleich mit Bild 0 jeder Folge). Die Größe setzt das CSS (css/zeki.css), die Maße hier sind der Rückfall.
// start: Name einer Folge, die einmal läuft, sobald das Element erscheint (js/adapter/brand_start.js); leer = ruhendes Bild.
export const VORN_BREITE = 128, VORN_HOEHE = Math.round(VORN_BREITE * ZELLE_KLEIN[1] / ZELLE_KLEIN[0]);
export function vornHtml({ miene = "neutral", start = "", klasse = "" } = {}) {
  const k = klasse ? ` ${esc(klasse)}` : "", s = start && Object.hasOwn(ZEKI_FOLGEN, start) ? ` data-zeki-start="${esc(start)}"` : "";
  return `<span class="gc-zeki-vorn${k}" data-zeki-vorn="1"${s}><img class="gc-zeki" src="${esc(mienenBild(miene))}" alt="" width="${VORN_BREITE}" height="${VORN_HOEHE}" decoding="async"></span>`;
}

// ---------- Welche Folge zu welchem Ereignis (Übergabe Abschnitt 4) ----------
// Leerlauf ist immer „warten“ (atmen, einmal blinzeln) – nie „zwinkern“. Zwinkern gibt es nur bei Lob. Warnung und Fehler: nie grinsen oder jubeln.
export const LEERLAUF_FOLGE = "warten";
export const NIE_BEI_WARNUNG = ["grinsen", "jubeln", "zwinkern", "daumen", "nicken", "zeigen-oben"];
export function folgeFuer(ereignis) {
  const e = String(ereignis ?? "");
  if (e.startsWith("ankommen:")) { // Beim Ankommen auf einem Schirm: die Bewegung, die zur Haltung gehört; „warten“ heißt: nichts Besonderes
    const h = e.slice(9);
    return h && h !== "warten" && Object.hasOwn(ZEKI_FOLGEN, h) && h !== "zwinkern" && h !== "grinsen" ? h : null;
  }
  switch (e) {
    case "erfolg": return "nicken";
    case "lob": return "zwinkern";
    case "tagGeschafft": return "jubeln";
    case "warnung": return "kopfschuetteln";
    case "fehler": return "pruefen";
    default: return null;
  }
}
export const leerlaufErlaubt = (name) => name === LEERLAUF_FOLGE;

// ---------- Welche Haltung zu welcher Ansicht (Bauart 1–12, Übergabe Abschnitt 7) ----------
// Zeile: Schlüssel → [Bauart, Bühnen-Schlüssel]. Bauart „II“ = Bild aus Tafel II (Einrichtung, Führung, Menü), ohne eigene der zwölf Bauarten.
// Schlüssel mit Doppelpunkt sind Unterzustände einer Ansicht (zweites Argument „schritt“ von buehnenSchluessel); der Schlüssel ohne Doppelpunkt ist der Normalfall.
const ANSICHTEN = [
  // 1 Start – das Bild hängt an der Tageszeit (buehnenSchluessel); „start“ gilt, solange die Stunde nicht bekannt ist
  ["start", 1, "start"],
  // 2 Auswahl mit Fotos
  ["muell", 2, "foto-auswahl"], ["muell:station", 2, "foto-auswahl"], ["personal", 2, "foto-auswahl"],
  // 3 Eine Zahl eingeben
  ["muell:eingabe", 3, "zahl-eingeben"], ["kuehl", 3, "zahl-eingeben"], ["portion", 3, "zahl-eingeben"], ["ware:zaehlen", 3, "zahl-eingeben"], ["verkauf:hand", 3, "zahl-eingeben"],
  // 4 Rundgang Schritt für Schritt
  ["kuehl:rundgang", 4, "rundgang"], ["inventur", 4, "rundgang"], ["kuehl:einrichtung", 4, "kuehlgeraete"],
  // 5 Abhak-Liste, 6 Geschafft
  ["putzplan", 5, "abhak-liste"], ["abschluss", 5, "abhak-liste"], ["abschluss:bilanz", 6, "geschafft"],
  // 7 Büro-Übersicht
  ["buero", 7, "buero"],
  // 8 Liste mit Einträgen
  ["karte", 8, "eintragsliste"], ["kartebuero", 8, "eintragsliste"], ["getraenke", 8, "eintragsliste"], ["lieferanten", 8, "eintragsliste"], ["bestand", 8, "eintragsliste"],
  ["ware", 8, "eintragsliste"], ["kuehlware", 8, "eintragsliste"], ["laeden", 8, "eintragsliste"], ["listen", 8, "eintragsliste"], ["aktionen", 8, "eintragsliste"],
  // 9 Eintrag ansehen und ändern
  ["einstellungen", 9, "eintrag-aendern"], ["kartefoto", 9, "karte-fotografieren"],
  // 10 Zahlen und Verlauf
  ["umsatz", 10, "zahlen-verlauf"], ["umsatzheute", 10, "zahlen-verlauf"], ["vergleich", 10, "zahlen-verlauf"], ["verkauf", 10, "zahlen-verlauf"], ["preisrunde", 10, "zahlen-verlauf"], ["geld3", 10, "zahlen-verlauf"],
  // 11 Hinweis, Papier und Aushang
  ["hinweise", 11, "papier-aushang"], ["ordner-amt", 11, "papier-aushang"], ["ordner-steuer", 11, "papier-aushang"], ["ordner-buch", 11, "papier-aushang"], ["beleg", 11, "papier-aushang"], ["tafel", 11, "papier-aushang"],
  // 12 Blatt von unten und Sperre
  ["blatt", 12, "blatt-sperre"], ["sperre", 12, "blatt-sperre"], ["hilfe", 12, "blatt-sperre"], ["sprache-blatt", 12, "blatt-sperre"], ["schloss-personal", 12, "blatt-sperre"],
  // Tafel II: Intro, Führung, Menü-Blatt
  ["intro", "II", "intro"], ["fuehrung", "II", "fuehrung"], ["menue-blatt", "II", "menue-blatt"],
  // Einrichtung – ausführlicher Weg (js/screens/onboarding.js SCHRITTE)
  ["einrichtung:sprache", "II", "sprache"], ["einrichtung:format", "II", "laden"], ["einrichtung:kueche", "II", "laden"], ["einrichtung:betrieb", 9, "eintrag-aendern"],
  ["einrichtung:team", 3, "zahl-eingeben"], ["einrichtung:lohn", 3, "zahl-eingeben"], ["einrichtung:kosten-intro", "II", "kosten"],
  ...["miete", "energie", "versicherung", "vertraege", "kredite", "entsorgung", "gebuehren", "beratung", "werbung", "sonstiges"].map((k) => [`einrichtung:kosten-${k}`, "II", "kosten"]),
  ["einrichtung:reinigung", 9, "eintrag-aendern"], ["einrichtung:kanaele", 9, "eintrag-aendern"], ["einrichtung:kuehlstellen", "II", "kuehlgeraete"], ["einrichtung:karte", 2, "foto-auswahl"],
  ["einrichtung:rezepte", 9, "eintrag-aendern"], ["einrichtung:preise", 9, "eintrag-aendern"], ["einrichtung:verkauf", 9, "eintrag-aendern"], ["einrichtung:ergebnis", "II", "fertig"],
  // Einrichtung – Schnellweg (SCHNELL)
  ["einrichtung:schloss", 9, "eintrag-aendern"], ["einrichtung:laden-schnell", "II", "laden"], ["einrichtung:karte-foto", "II", "karte-fotografieren"],
  ["einrichtung:kuehl-schnell", "II", "kuehlgeraete"], ["einrichtung:geld", "II", "kosten"], ["einrichtung:fertig-schnell", "II", "fertig"],
];
export const ZEKI_ANSICHT = Object.fromEntries(ANSICHTEN.map(([k, , s]) => [k, s]));
export const ZEKI_BAUART = Object.fromEntries(ANSICHTEN.map(([k, b]) => [k, b]));
export const ANSICHT_TABELLE = ANSICHTEN.map(([ansicht, bauart, buehne]) => ({ ansicht, bauart, buehne }));

// Tageszeit-Bild für den Laden-Start: vor 11 Uhr Berliner Zeit morgen, ab 18 Uhr abend, dazwischen mittendrin. Stunde unbekannt → „start“.
export function startSchluessel(stunde) {
  if (typeof stunde !== "number" || !Number.isFinite(stunde)) return "start";
  return stunde < 11 ? "heute-morgen" : stunde >= 18 ? "heute-abend" : "heute-mittendrin";
}
export const berlinStunde = (d = new Date()) => berlin(d).stunde;
// Bühnen-Schlüssel zu einer Ansicht der App. schritt: Unterzustand („eingabe“, „rundgang“ …) oder Kennung eines Einrichtungs-Schritts bei ansicht = „einrichtung“.
// Unbekanntes fällt auf die ruhige Haltung zurück (nie keine Figur).
export function buehnenSchluessel(ansicht, { stunde, schritt } = {}) {
  if (ansicht === "start" && !schritt) return startSchluessel(stunde);
  if (schritt && Object.hasOwn(ZEKI_ANSICHT, `${ansicht}:${schritt}`)) return ZEKI_ANSICHT[`${ansicht}:${schritt}`];
  if (Object.hasOwn(ZEKI_ANSICHT, ansicht)) return ZEKI_ANSICHT[ansicht];
  return NOTFALL_BUEHNE;
}

// ---------- Abspieler ----------
// Spielt eine Folge über dem Element el (der Behälter .gc-figur aus figurHtml; muss positioniert sein) und zeigt danach wieder das ruhende Bild.
// „warten“ (Schleife) ist der Leerlauf: Pause 6–14 s, dann einmal atmen und blinzeln, unregelmäßig wiederholt – bis das Element aus dem Dokument verschwindet.
// Er läuft nur, wenn die Bühnen-Haltung die Ruhe ist (warten: Büro, Intro, Sperre); eine gehaltene Pose (Hand oben …) bleibt stehen, sonst gäbe es bei jedem Atemzug einen Sprung.
// Kein setInterval: ein requestAnimationFrame-Lauf mit Zeitmessung; Bild = floor(Zeit / Dauer × Bilder). Nur eine Folge gleichzeitig je Element (eine zweite wartet, höchstens eine wartet).
// Bei „Bewegung reduzieren“ (opt.reduziert, sonst matchMedia) bewegt sich nichts. Rückgabe: { name, fertig: Promise<"ende"|"abbruch"|"ersetzt"|"fehlt">, abbrechen() } oder null.
// Teilstücke: opt.ab / opt.bis (Bild 0–24) und opt.rueckwaerts spielen nur einen Abschnitt der Folge; zekiEreignis setzt daraus die Kette zusammen.
export const LEERLAUF_MIN_MS = 6000, LEERLAUF_MAX_MS = 14000;
export const leerlaufAbstand = (zufall = Math.random) => Math.round(LEERLAUF_MIN_MS + zufall() * (LEERLAUF_MAX_MS - LEERLAUF_MIN_MS));

const LAEUFE = new WeakMap();  // Element → laufender Lauf
const LADEND = new Map();      // Folge-Datei → Promise<boolean> (nur Erfolge bleiben)
const BEREIT = new Set();      // Folge-Dateien, die sicher geladen sind
export const folgeBereit = (name) => { const f = folge(name); return !!f && BEREIT.has(f.datei); };

function zeitVon(el, opt) {
  const win = el.ownerDocument?.defaultView;
  return {
    raf: opt.raf || ((f) => win.requestAnimationFrame(f)), caf: opt.caf || ((id) => win.cancelAnimationFrame(id)),
    jetzt: opt.jetzt || (() => (win?.performance?.now ? win.performance.now() : Date.now())),
    setTimeout: opt.setTimeout || ((f, ms) => win.setTimeout(f, ms)), clearTimeout: opt.clearTimeout || ((id) => win.clearTimeout(id)),
    zufall: opt.zufall || Math.random,
  };
}
function reduziertVon(el, opt) {
  if (typeof opt.reduziert === "boolean") return opt.reduziert;
  try { return !!el.ownerDocument?.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches; } catch { return false; }
}
function ladenVon(el, datei, opt) {
  if (opt.laden) return Promise.resolve(opt.laden(datei)).then((ok) => { if (ok) BEREIT.add(datei); return ok; });
  if (LADEND.has(datei)) return LADEND.get(datei);
  const win = el.ownerDocument?.defaultView;
  const p = new Promise((ok) => {
    try {
      const b = new win.Image(); const frist = win.setTimeout(() => ok(false), 3000); b.onerror = () => { win.clearTimeout(frist); ok(false); };
      b.onload = () => { win.clearTimeout(frist); ok(true); }; b.src = datei;
    } catch { ok(false); }
  }).then((ok) => { if (ok) BEREIT.add(datei); else LADEND.delete(datei); return ok; });
  LADEND.set(datei, p); return p;
}
// Folge im Voraus laden (z. B. beim Zeichnen der Bühne), damit die Ankunft später ohne Warten und ohne Sprung läuft
export function folgeVorladen(el, name, opt = {}) { const f = folge(name); return f && el ? ladenVon(el, f.datei, opt) : Promise.resolve(false); }

function ueberlagerung(el, f, breite, i0) {
  let o = el.querySelector?.(".gc-zeki-folge");
  if (!o) { o = el.ownerDocument.createElement("span"); o.className = "gc-zeki-folge"; o.setAttribute?.("aria-hidden", "true"); el.appendChild(o); }
  if (el.hasAttribute?.("data-zeki-vorn")) { // Zeki vorn (Führung, Intro, Blatt): die ganze Zelle über dem ganzen Bild, Größe in Prozent – gilt für jede Breite
    const [x, y] = rasterProzent(i0);
    Object.assign(o.style, { position: "absolute", top: "0px", left: "0px", width: "100%", height: "100%", pointerEvents: "none", display: "block",
      backgroundImage: `url("${f.datei}")`, backgroundRepeat: "no-repeat", backgroundSize: `${SPALTEN * 100}% ${ZEILEN * 100}%`, backgroundPosition: `${x}% ${y}%` });
    return { o, a: null };
  }
  const a = ausschnitt(breite), [x, y] = a.position(i0);
  Object.assign(o.style, { position: "absolute", top: "0px", left: "0px", width: `${a.breite}px`, height: `${a.hoehe}px`, pointerEvents: "none", display: "block",
    backgroundImage: `url("${f.datei}")`, backgroundRepeat: "no-repeat", backgroundSize: `${a.bildB}px ${a.bildH}px`, backgroundPosition: `${x}px ${y}px` });
  return { o, a };
}
// background-position in Prozent für Bild Nummer i (0–24) bei background-size 500 % × 500 %
const rasterProzent = (i) => [(i % SPALTEN) * 100 / (SPALTEN - 1), Math.floor(i / SPALTEN) * 100 / (ZEILEN - 1)];
function ruhe(el, wie) { // wie: "ruhe" = ruhendes Bild wieder zeigen, "weg" = Figur hat die Bühne verlassen
  const o = el.querySelector?.(".gc-zeki-folge"); if (o) o.style.display = "none";
  const bild = el.querySelector?.("img.gc-zeki"); if (bild) bild.style.visibility = wie === "weg" ? "hidden" : "";
}
function neuerLauf(el, name, opt, seg = {}) {
  const l = { name, f: folge(name), opt, el, ab: seg.ab ?? 0, bis: seg.bis ?? BILDER - 1, rueck: !!seg.rueck, fortsetzung: !!seg.fortsetzung, abbruch: false, laeuft: false, rafId: null, timerId: null, danach: null, z: null, erledigt: false };
  l.fertig = new Promise((ok) => { l.beenden = (g) => { if (l.erledigt) return; l.erledigt = true; ok(g); }; });
  l.abbrechen = () => stoppen(l, "abbruch");
  return l;
}
const schwanz = (l) => { let t = l; while (t.danach && t.danach.fortsetzung) t = t.danach; return t; };
const verwerfen = (l, g) => { for (let x = l; x; x = x.danach) { x.abbruch = true; x.beenden(g); } };
function vormerken(aktuell, l) { const t = schwanz(aktuell); if (t.danach) verwerfen(t.danach, "ersetzt"); t.danach = l; }

function stoppen(l, grund, aufraeumen = true) {
  l.abbruch = true;
  if (l.z) { if (l.rafId != null) l.z.caf(l.rafId); if (l.timerId != null) l.z.clearTimeout(l.timerId); }
  l.rafId = l.timerId = null;
  if (LAEUFE.get(l.el) === l) LAEUFE.delete(l.el);
  if (aufraeumen && (l.laeuft || l.z)) ruhe(l.el, "ruhe");
  l.laeuft = false; l.beenden(grund);
  const n = l.danach; l.danach = null;
  if (n && aufraeumen) { if (!n.fortsetzung && !n.abbruch && l.el.isConnected !== false) starten(n); else verwerfen(n, "abbruch"); }
  else if (n) verwerfen(n, "abbruch");
}

// Lauf anmelden: Leerlauf geht nie vor einer Bewegung; eine Bewegung unterbricht den Leerlauf (er läuft danach weiter); zwei Bewegungen laufen nacheinander
function anmelden(l) {
  const alt = LAEUFE.get(l.el);
  if (!alt) return starten(l);
  if (alt.f.schleife && !l.f.schleife) {
    const fort = neuerLauf(l.el, alt.name, alt.opt); stoppen(alt, "ersetzt", false); schwanz(l).danach = fort; return starten(l);
  }
  vormerken(alt, l);
}

function starten(l) {
  const { el, f, opt } = l;
  l.z = zeitVon(el, opt); LAEUFE.set(el, l);
  const n = Math.abs(l.bis - l.ab) + 1, dauer = f.dauerMs * n / BILDER;
  const aus = (grund) => { // Lauf zu Ende (oder Element weg)
    l.rafId = null; if (LAEUFE.get(el) === l) LAEUFE.delete(el);
    const weiter = l.danach && l.danach.fortsetzung && grund === "ende" && el.isConnected !== false; // Kette: keine Lücke zwischen den Teilstücken
    if (!weiter) ruhe(el, l.name === "abgehen" && grund === "ende" ? "weg" : "ruhe");
    l.laeuft = false; l.beenden(grund);
    const nx = l.danach; l.danach = null;
    if (nx) { if (grund === "ende" && !nx.abbruch && el.isConnected !== false) starten(nx); else verwerfen(nx, "abbruch"); }
  };
  const abspielen = async () => {
    if (l.abbruch) return;
    if (el.isConnected === false) return aus("abbruch");
    if (!(await ladenVon(el, f.datei, opt))) return aus("fehlt"); // Folge nicht da (offline, nicht geladen): Zeki bleibt in der Ruhe, nichts springt
    if (l.abbruch) return;
    if (el.isConnected === false) return aus("abbruch");
    const bild = el.querySelector?.("img.gc-zeki"); const breite = Number(opt.breite || bild?.getAttribute?.("width")) || DARSTELLUNG_BREITE;
    const { o, a } = ueberlagerung(el, f, breite, l.ab); if (bild) bild.style.visibility = "hidden"; l.laeuft = true;
    let t0 = null, zuletzt = -1;
    const schritt = (ts) => {
      l.rafId = null; if (l.abbruch) return;
      if (el.isConnected === false) return aus("abbruch");
      const jetzt = typeof ts === "number" ? ts : l.z.jetzt(); if (t0 === null) t0 = jetzt;
      const k = Math.min(n - 1, Math.floor((jetzt - t0) / dauer * n)), i = l.rueck ? l.ab - k : l.ab + k;
      if (i !== zuletzt) { zuletzt = i; if (a) { const [x, y] = a.position(i); o.style.backgroundPosition = `${x}px ${y}px`; } else { const [x, y] = rasterProzent(i); o.style.backgroundPosition = `${x}% ${y}%`; } }
      if (jetzt - t0 >= dauer) return nachLauf();
      l.rafId = l.z.raf(schritt);
    };
    const nachLauf = () => { if (!f.schleife) return aus("ende"); ruhe(el, "ruhe"); l.laeuft = false; pause(); };
    l.rafId = l.z.raf(schritt);
  };
  const pause = () => { // Leerlauf: unregelmäßiger Abstand, dann wieder spielen
    l.timerId = l.z.setTimeout(() => { l.timerId = null; if (l.abbruch) return; if (el.isConnected === false) return aus("abbruch"); abspielen(); }, leerlaufAbstand(l.z.zufall));
  };
  if (f.schleife) pause(); else abspielen();
}
const haltungVon = (el, opt) => { const k = opt.schluessel ?? el.getAttribute?.("data-zeki-buehne"); return k ? buehnenBild(k)?.haltung : undefined; };
const handleVon = (l, alle) => ({ name: l.name, fertig: alle[alle.length - 1].fertig, abbrechen: () => alle.forEach((x) => x.abbrechen()) });

export function zekiSpielen(el, name, opt = {}) {
  const f = folge(name);
  if (!f || !el || reduziertVon(el, opt)) return null;
  if (f.schleife) {
    const h = haltungVon(el, opt); if (h && h !== "warten") return null; // gehaltene Pose: kein Leerlauf (Sprung)
    const alt = LAEUFE.get(el); if (alt && alt.f.schleife) return { name, fertig: alt.fertig, abbrechen: alt.abbrechen };
  }
  const l = neuerLauf(el, name, opt, { ab: opt.ab, bis: opt.bis, rueck: opt.rueckwaerts });
  if (!f.beginntInRuhe && !opt.ab) { const bild = el.querySelector?.("img.gc-zeki"); if (bild) bild.style.visibility = "hidden"; } // „auftreten“ beginnt außerhalb des Bildes: Zeki ist erst da, wenn er hereinkommt (fehlt die Folge, zeigt ruhe() das Bild wieder)
  anmelden(l); return handleVon(l, [l]);
}

// Ereignis → Bewegung, passend zur Haltung des Bühnen-Bildes (opt.schluessel, sonst data-zeki-buehne am Behälter), ohne Sprung:
//  ankommen:<haltung>  Folge der Haltung von der Ruhe bis zur Pose (HALTEBILD) und dann unsichtbar das Bühnen-Bild. Das Bühnen-Bild wird sofort versteckt – darum nur, wenn die
//                      Folge schon geladen ist (folgeVorladen); sonst bleibt das Bild stehen und die Folge wird für das nächste Mal geladen.
//  lob, erfolg, …      erst zurück aus der Pose in die Ruhe (Folge der Haltung rückwärts), dann die Bewegung, dann wieder hinein in die Pose.
export function zekiEreignis(el, ereignis, opt = {}) {
  const name = folgeFuer(ereignis);
  if (!name || !el || reduziertVon(el, opt)) return null;
  const h = haltungVon(el, opt), halt = h ? HALTE[h] : undefined;
  if (String(ereignis).startsWith("ankommen:")) {
    if (!Object.hasOwn(HALTE, name) || HALTE[name] === 0) return null;
    if (!folgeBereit(name)) { folgeVorladen(el, name, opt); return null; }
    const l = neuerLauf(el, name, opt, { ab: 0, bis: HALTE[name] });
    const bild = el.querySelector?.("img.gc-zeki"); if (bild) bild.style.visibility = "hidden";
    anmelden(l); return handleVon(l, [l]);
  }
  const mitPose = h && h !== "warten" && halt > 0 && (folgeBereit(h) || opt.laden);
  if (!mitPose) { const l = neuerLauf(el, name, opt); anmelden(l); return handleVon(l, [l]); }
  const rein = neuerLauf(el, h, opt, { ab: halt, bis: 0, rueck: true }), mitte = neuerLauf(el, name, opt, { fortsetzung: true }), raus = neuerLauf(el, h, opt, { ab: 0, bis: halt, fortsetzung: true });
  rein.danach = mitte; mitte.danach = raus; anmelden(rein); return handleVon(rein, [rein, mitte, raus]);
}

// Zeki geht ab (Ende der Führung): Die Hülle mit der Figur verschwindet sofort, ein loser Nachlauf (div.rg-abgang, keine Dunkelfläche, fängt keine Tipps) zeigt die Folge „abgehen“ an derselben Stelle,
// danach ist er weg und die Bühne zeigt ihn wieder. Nur wenn die Folge schon geladen ist (folgeVorladen beim Start der Führung); sonst null und kein Abgang.
export function zekiAbgang(vornEl, opt = {}) {
  const doc = vornEl?.ownerDocument; if (!doc || vornEl.isConnected === false || reduziertVon(vornEl, opt) || !folgeBereit("abgehen")) return null;
  const r = vornEl.getBoundingClientRect(); if (!(r.width > 1)) return null;
  const w = doc.createElement("div"); w.setAttribute("class", "rg-abgang"); w.setAttribute("aria-hidden", "true");
  w.style.cssText = `left:${Math.round(r.left)}px;top:${Math.round(r.top)}px;width:${Math.round(r.width)}px;height:${Math.round(r.height)}px`;
  w.innerHTML = vornHtml({ miene: opt.miene || "hilfe" }); doc.body.appendChild(w);
  const lauf = zekiSpielen(w.querySelector("[data-zeki-vorn]"), "abgehen", opt);
  if (!lauf) { w.remove(); return null; }
  lauf.fertig.then(() => w.remove());
  return lauf;
}
