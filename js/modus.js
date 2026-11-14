// Drei Ebenen: LADEN (während der Arbeit), PERSONAL (Aushilfe, kein Euro), BÜRO (Rechnen, Einrichten, Abgeben).
// Der Modus gilt je Handy und steht auf der Wurzel (wurzel.modus), der Büro-Code nur als Prüfwert (wurzel.bueroPin = PBKDF2 mit Salz, nie die Ziffern).
// Reine Logik ohne Oberfläche – alle anderen Bausteine dürfen das hier importieren.

export const MODI = ["laden", "personal", "buero"];
export function modus(wurzel) { return MODI.includes(wurzel?.modus) ? wurzel.modus : "laden"; }

// Laden-Leiste unten: genau diese fünf Reiter, in dieser Reihenfolge.
export const LADEN_TABS = ["start", "muell", "kuehl", "putzplan", "karte"];
// Im Laden erreichbar: die Reiter plus das, was das Menü-Blatt öffnet.
export const LADEN_ANSICHTEN = [...LADEN_TABS, "abschluss", "kartefoto", "umsatzheute", "portion"]; // portion: Masterauftrag 2.1 // Laden-Umbau: „Umsatz heute“ im Laden // Laden wechseln geht im Blatt; „Alle Läden" mit Zahlen wohnt im Büro
// Personal: drei Kacheln, sonst nichts.
export const PERSONAL_ANSICHTEN = ["personal", "muell", "kuehl", "putzplan"];

// Spiegel im Browser-Speicher: nur noch der Modus. Der Büro-Code wohnt allein in der Wurzel (W2-S, Prüfgremium p07 M3);
// ein alter Code-Spiegel („gc-buero-pin") wird beim Start einmal übernommen und dann gelöscht.
const SCHLUESSEL = { modus: "gc-modus", pinAlt: "gc-buero-pin" };
import { merken, lesen } from "./adapter/geraet_speicher.js";
const merke = merken; // Gerätespeicher: js/adapter/geraet_speicher.js (ohne Speicher gilt nur die Wurzel)
const lies = lesen;

export function modusSetzen(wurzel, m) {
  if (!wurzel || !MODI.includes(m)) return false;
  const vorher = modus(wurzel);
  wurzel.modus = m; merke(SCHLUESSEL.modus, m);
  return vorher !== m;
}

// Beim Start: was die Wurzel nicht mehr kennt (ältere Speicherung), kommt aus dem Spiegel zurück.
// Büro bleibt nach einem Neustart nur offen, wenn kein Code gesetzt ist – sonst geht es zurück in den Laden.
// Personal gibt es nur mit Code (W2-S): ohne Code geht es in den Laden.
export function ebeneWiederherstellen(wurzel) {
  if (!wurzel) return;
  const alt = lies(SCHLUESSEL.pinAlt);
  if (alt !== null) { if (wurzel.bueroPin === undefined && pinWertGueltig(alt)) wurzel.bueroPin = alt; merke(SCHLUESSEL.pinAlt, null); }
  if (!MODI.includes(wurzel.modus)) { const m = lies(SCHLUESSEL.modus); if (MODI.includes(m)) wurzel.modus = m; }
  if (wurzel.modus === "buero" && codeAktiv(wurzel)) modusSetzen(wurzel, "laden");
  if (wurzel.modus === "personal" && !pinGesetzt(wurzel) && !testphaseOhneCode(wurzel)) modusSetzen(wurzel, "laden");
}
// Übungsmodus zurücknehmen: war vor der Übung kein Modus gesetzt, verschwinden Feld UND Spiegel – sonst stand nach dem
// nächsten Laden „laden“ im Stand, und die Sicherung war nicht mehr byte-gleich (Befund tests/durchlauf_mitmach.py).
export function modusVergessen(wurzel) { if (wurzel) delete wurzel.modus; merke(SCHLUESSEL.modus, null); }
// „Alles löschen": auch den Spiegel vergessen.
export function ebeneVergessen() { merke(SCHLUESSEL.modus, null); merke(SCHLUESSEL.pinAlt, null); }

// Personal-Modus als POSITIVLISTE (Lauf 6, E5, F – Audit P3 C2): ausgeführt wird nur, was hier ausdrücklich steht. Was neu dazukommt
// (ein neuer Knopf, eine neue Aktion), ist im Personal-Modus von selbst gesperrt, bis jemand es bewusst freigibt.
// Die Liste folgt dem, was Personal-Start, Müll, Kühlung und Putzplan (Laden-Ansicht) wirklich anbieten, dazu Schloss, Code-Blatt und Hilfe.
// tests/lauf6_e5_bedienung.test.mjs: jeder data-a-Name aus js/screens ist nur erlaubt, wenn er hier steht; hier steht nichts aus PERSONAL_NIE.
export const PERSONAL_ERLAUBT = new Set([
  // Schloss, Code-Blatt, Hilfe, Navigation (nav: nur mit Ziel aus PERSONAL_ANSICHTEN, siehe personalErlaubt)
  "schloss", "pin-taste", "pin-weg", "pin-bio", "rettung-start", "rettung-pruefen", "rettung-ok", "blatt-zu", "hilfe-auf", "hilfe-mehr",
  // Personal-Start: Person wählen, Kachel öffnen
  "personal-wer", "personal-wechseln", "personal-ziel",
  // Müll
  "muell-andere", "muell-auswahl", "muell-auswahl-zu", "muell-chip", "muell-d", "muell-detail", "muell-einheit", "muell-grund", "muell-kachel", "muell-personal",
  "muell-start", "muell-station-auf", "muell-station-zu", "muell-tipp", "muell-weg-damit", "muell1-zurueck", "muell-rueckgaengig",
  // Kühlung: messen, Maßnahmen, Ware weg, Rundgang abschließen – ohne Einrichtung, Grenzen, Personen, Verwerfen, Vortage
  "kuehl-rundgang-los", "kuehl-einzel", "kuehl-start", "rundgang-start", "rundgang-abschluss", "station", "station-zu", "station-minus", "station-plus-ok", "station-grund",
  "station-nicht-auf", "station-nk-auf", "station-speichern", "massnahme", "nachkontrolle", "weg-artikel", "weg-hinzu", "weg-alles", "weg-weg",
  // Putzplan: abhaken und „Warum?“
  "pp-haken", "pp-mehr",
]);
// Was im Personal-Modus NIE erlaubt sein darf: Einrichtung, Grenzen, Personen, Verwerfen, Nachtragen für Vortage, Putzplan einrichten, Sprache dauerhaft,
// Code, Laden löschen, Euro-Bildschirme, Büro, Einstellungen. Die Positivliste lässt davon nichts durch (Test); diese Liste ist die Gegenprobe.
export const PERSONAL_NIE = new Set(["kuehl-einrichtung", "kuehl-einrichtung-oeffnen", "kuehl-einrichtung-fertig", "kuehl-keine", "kuehl-takt", "kuehl-ruhetag", "kuehl-blatt", "kuehl-blatt-oeffnen", "kuehl-rundgang", "kuehl-rundgang-start",
  "person-neu", "person-weg", "rundgang-verwerfen", "start-datum", "start-von", "rg-von", "muell1-nachtragen",
  "pp-geraet", "pp-aufgabe", "pp-uebernehmen", "pp-spaeter", "pp-ansicht", "pp-wer",
  "sprache", "blatt-sprache", "pin-setzen", "pin-entfernen", "testphase-code", "laden-loeschen", "laden-neu", "laden-wechseln", "blatt-laeden", "beispiel-anlegen", "beispiel-loeschen", "einrichtung-fertig-ok", "bearbeiten", "export",
  "rettung-neu", "loeschen", "modus", "menue-auf", "menue-zurueck", "monat-blatt", "umsatz-speichern", "ul-speichern", "abschluss-fertig", "diagnose-kopieren", "fehler-melden", "aktualisieren", "home-installieren"]);
export const PERSONAL_NIE_VORSILBEN = /^stelle-|^kw-|^vk-|^tf-|^akt-|^gt-|^lf-|^eig-|^buero-|^ordner-|^ul-|^hm-|^g3-|^best-|^wa-|^pr-|^po-|^kl-/; // Eigentümer-Ebene (eig-), Lieferanten (lf-), Getränke (gt-), Menütafel (tf-), Aktionen (akt-), Verkauf (vk-), Kühl-Ware (kw-), Einrichtung (stelle-), Büro/Ordner, Umsatz, Hinweise, Geld, Bestand, Ware, Preise, Portion, Laden-Karte
// heute: Datum „heute" (JJJJ-MM-TT) – Müll und Kühlung dürfen im Personal-Modus nur für heute eingetragen werden.
export function personalErlaubt(name, wert, heute) {
  if (PERSONAL_NIE.has(name) || PERSONAL_NIE_VORSILBEN.test(name)) return false;
  if (name === "tag-datum") return wert === heute;
  if (name === "nav") return PERSONAL_ANSICHTEN.includes(wert);
  return PERSONAL_ERLAUBT.has(name);
}
export const personalGesperrt = (name, wert, heute) => !personalErlaubt(name, wert, heute);
// Eingabefelder im Personal-Modus ebenfalls als POSITIVLISTE: nur was die Personal-Ansichten (Müll, Kühl-Rundgang, Schloss/Rettung) wirklich anbieten.
// Alles andere (Einrichtung, Sprache, Euro-Nachträge, Fremdfelder) bleibt ohne Wirkung. tests/lauf6_e11_personal.test.mjs: Registertest gegen die gezeichneten Ansichten.
export const PERSONAL_FELDER = new Set(["muell-menge", "muell-suche", "muell-foto", "station-wert", "station-notiz", "weg-name", "weg-menge", "rettungscode"]);
export const personalFeldErlaubt = (feld) => PERSONAL_FELDER.has(String(feld ?? ""));
export const personalFeldGesperrt = (feld) => !personalFeldErlaubt(feld);
// Aufrufe, die im Personal-Modus gelten: Ziele der drei Kacheln und Hilfe-Einträge der Personal-Ansichten.
export const PERSONAL_ZIELE = ["muell", "kuehl", "putzplan"];
export const PERSONAL_HILFE = ["personal", "muell", "kuehl", "putzplan"];
export const personalZielErlaubt = (ziel) => PERSONAL_ZIELE.includes(ziel);
export const personalHilfeErlaubt = (ziel) => PERSONAL_HILFE.includes(ziel);

// Startbildschirm je Ebene
export function startAnsicht(wurzel) { const m = modus(wurzel); return m === "personal" ? "personal" : m === "buero" ? "buero" : "start"; }

// Wohin führt ein Tipp auf „nav" mit Ziel `ziel` in der aktuellen Ebene?
// { ansicht } = direkt hin; { ansicht, buero: true } = gehört ins Büro, erst die Ebene wechseln (mit Code, falls gesetzt).
export function navZiel(wurzel, ziel) {
  const m = modus(wurzel);
  if (m === "personal") return { ansicht: PERSONAL_ANSICHTEN.includes(ziel) ? ziel : "personal" };
  if (m === "buero") return { ansicht: ziel === "start" || ziel === "personal" ? "buero" : ziel };
  if (LADEN_ANSICHTEN.includes(ziel)) return { ansicht: ziel };
  if (ziel === "personal") return { ansicht: "start" }; // Personal nur über den Modus-Wechsel
  return { ansicht: ziel === "buero" ? "buero" : ziel, buero: true };
}
// Darf diese Ansicht in der Ebene stehen? (für den Start und nach einem Moduswechsel)
export function ansichtErlaubt(wurzel, ansicht) {
  const m = modus(wurzel);
  if (m === "personal") return PERSONAL_ANSICHTEN.includes(ansicht);
  if (m === "buero") return ansicht !== "personal" && ansicht !== "start";
  return LADEN_ANSICHTEN.includes(ansicht);
}

// ---------- Büro-Code ----------
// Gespeichert wird nur ein Prüfwert (W2-S, p07 M3 / p02 H5):
//   "pbkdf2$<runden>$<salz>$<hash>"  PBKDF2-SHA-256 über Web Crypto, zufälliges Salz (16 Byte) je Festlegen
//   "salz$<runden>$<salz>$<hash>"    ohne crypto.subtle (http im WLAN): SHA-256 von Hand, gesalzen und wiederholt
//   64 Hex-Zeichen                   alter Prüfwert (SHA-256 ohne Salz) – wird beim nächsten richtigen Code umgestellt
export const PBKDF2_RUNDEN = 600000;   // OWASP Password Storage Cheat Sheet: 600.000 Runden für PBKDF2-HMAC-SHA256 (Stand 2023); steht im Prüfwert, lässt sich später ändern
const ERSATZ_RUNDEN = 5000;     // von Hand gerechnet, damit ein altes Handy nicht hängt
const ALT = /^[0-9a-f]{64}$/;
const NEU = /^(pbkdf2|salz)\$([1-9][0-9]{0,7})\$([0-9a-f]{32})\$([0-9a-f]{64})$/;
export const pinWertGueltig = (v) => typeof v === "string" && (ALT.test(v) || NEU.test(v));
export const pinGesetzt = (wurzel) => pinWertGueltig(wurzel?.bueroPin);
// Testphase ohne Code: Bis der Pilot in größerer Zahl läuft, muss niemand ständig Codes eintippen.
// Der gespeicherte Büro-Code bleibt erhalten; der Schalter setzt ihn nur außer Kraft. Personal-Modus geht in der Testphase auch ohne Code.
export const testphaseOhneCode = (wurzel) => wurzel?.testphase?.ohneCode === true;
export const codeAktiv = (wurzel) => pinGesetzt(wurzel) && !testphaseOhneCode(wurzel);
export function testphaseSetzen(wurzel, an) { if (!wurzel) return false; const vorher = testphaseOhneCode(wurzel); wurzel.testphase = { ...(wurzel.testphase || {}), ohneCode: !!an }; return vorher !== !!an; }
export const pinGueltig = (pin) => /^[0-9]{4}$/.test(String(pin ?? ""));
const pinVeraltet = (wurzel) => typeof wurzel?.bueroPin === "string" && ALT.test(wurzel.bueroPin);

const hex = (bytes) => [...bytes].map((x) => x.toString(16).padStart(2, "0")).join("");
function zufallSalz() {
  const b = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(b); // gibt es auch ohne sichere Verbindung
  else for (let i = 0; i < b.length; i++) b[i] = Math.floor(Math.random() * 256);
  return hex(b);
}
async function pbkdf2(pin, salz, runden) {
  const fein = globalThis.crypto?.subtle; if (!fein) return null;
  try {
    const schluessel = await fein.importKey("raw", new TextEncoder().encode(String(pin)), "PBKDF2", false, ["deriveBits"]);
    const salzBytes = new Uint8Array(salz.match(/../g).map((x) => parseInt(x, 16)));
    const bits = await fein.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salzBytes, iterations: runden }, schluessel, 256);
    return hex(new Uint8Array(bits));
  } catch { return null; }
}
function ersatzHash(pin, salz, runden) { let h = sha256Hex(`gastrocalc-buero:${salz}:${pin}`); for (let i = 1; i < runden; i++) h = sha256Hex(salz + h); return h; }
const altHash = (pin) => sha256Hex("gastrocalc-buero:" + pin); // nur zum Prüfen alter Werte

// Neuer Prüfwert für einen Code (mit frischem Salz)
export async function pinHash(pin, salz = zufallSalz()) {
  const h = await pbkdf2(pin, salz, PBKDF2_RUNDEN);
  if (h) return `pbkdf2$${PBKDF2_RUNDEN}$${salz}$${h}`;
  return `salz$${ERSATZ_RUNDEN}$${salz}$${ersatzHash(pin, salz, ERSATZ_RUNDEN)}`;
}
export async function pinSetzen(wurzel, pin) {
  if (pin === null) { wurzel.bueroPin = null; delete wurzel.pinSperre; delete wurzel.rettungPin; return true; } // Rettung: ohne Büro-Code kein Rettungscode
  if (!pinGueltig(pin)) return false;
  wurzel.bueroPin = await pinHash(pin); delete wurzel.pinSperre; delete wurzel.rettungPin; return true; // Rettung: neuer Code = alter Rettungscode gilt nicht mehr (rettung.js legt gleich einen neuen an)
}
// Gleichlang vergleichen (kein früher Abbruch)
const gleich = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
async function pinStimmt(wert, pin) {
  if (ALT.test(wert)) return gleich(altHash(pin), wert);
  const m = NEU.exec(wert); if (!m) return false;
  const [, art, rundenText, salz, soll] = m; const runden = Number(rundenText);
  if (art === "pbkdf2") { const h = await pbkdf2(pin, salz, runden); return h !== null && gleich(h, soll); } // ohne crypto.subtle lässt sich ein PBKDF2-Wert nicht prüfen
  return gleich(ersatzHash(pin, salz, Math.min(runden, 200000)), soll);
}
// Rettung: derselbe Vergleich für den Rettungscode (rettung.js) – nur gesalzene Prüfwerte, nie alte ohne Salz
export const pruefwertStimmt = (wert, text) => (typeof wert === "string" && NEU.test(wert) ? pinStimmt(wert, String(text)) : Promise.resolve(false));
// Prüft den Code. Ein alter Prüfwert (ohne Salz) wird dabei gleich auf den neuen umgestellt – danach speichern.
export async function pinPruefen(wurzel, pin) {
  if (!pinGesetzt(wurzel) || !pinGueltig(pin)) return false;
  if (hartGesperrt(wurzel)) return false; // Lauf 6, E5 (G): nach 10 Fehlversuchen nur noch der Rettungscode
  const ok = await pinStimmt(wurzel.bueroPin, String(pin));
  if (ok && pinVeraltet(wurzel)) wurzel.bueroPin = await pinHash(pin);
  return ok;
}

// ---------- Wartezeit nach Fehlversuchen (W2-S, p07 M4 / p02 H5) ----------
// Zähler in der Wurzel (wurzel.pinSperre = { fehler, bis }), damit ein Neustart ihn nicht zurücksetzt.
// Ab dem 5. Fehlversuch: 30 s, dann je Fehlversuch doppelt so lang, höchstens 15 min. Ein richtiger Code setzt zurück.
export const SPERRE_AB = 5, SPERRE_START_MS = 30000, SPERRE_MAX_MS = 15 * 60000;
export const sperreDauer = (fehler) => (fehler < SPERRE_AB ? 0 : Math.min(SPERRE_MAX_MS, SPERRE_START_MS * 2 ** (fehler - SPERRE_AB)));
// Lauf 6, E5 (G – Audit P3 C1/B2): Die Wartezeit hängt an der Handy-Uhr; wer die Uhr vorstellt, umgeht sie. Darum zusätzlich ein Zähler:
// Nach 10 Fehlversuchen in Folge geht nur noch der Rettungscode (rettung.js), egal was die Uhr sagt. Ein richtiger Code oder der Rettungscode
// setzt den Zähler zurück (sperreLoesen). Gilt nur, wenn ein Rettungscode angelegt ist – sonst käme niemand mehr ins Büro (dann bleibt die Wartezeit).
// Der Büro-Code bleibt vierstellig (Entscheidung des Inhabers): „Schloss gegen neugierige Blicke, kein Tresor.“
const SPERRE_HART_AB = 10;
const rettungDa = (wurzel) => typeof wurzel?.rettungPin === "string" && NEU.test(wurzel.rettungPin);
export const hartGesperrt = (wurzel) => (Number(wurzel?.pinSperre?.fehler) || 0) >= SPERRE_HART_AB && rettungDa(wurzel);
// Nur die Uhr (Wartezeit nach 5+ Fehlversuchen) – so rechnet auch der Rettungscode, damit er bei der harten Sperre offen bleibt
export function sperreRestUhr(wurzel, jetzt = Date.now()) {
  sperreKappen(wurzel, jetzt);
  const bis = Number(wurzel?.pinSperre?.bis) || 0; if (bis <= jetzt) return 0;
  return bis - jetzt;
}
// Uhr zurückgestellt: liegt „bis“ weiter als die größte Wartezeit voraus, wird es auf jetzt + Höchstdauer gesetzt (und gespeichert, sobald ein Speicher-Haken da ist).
let nachKappen = null;
export function sperreKappenHaken(f) { nachKappen = typeof f === "function" ? f : null; }
export function sperreKappen(wurzel, jetzt = Date.now()) {
  const s = wurzel?.pinSperre; const bis = Number(s?.bis) || 0;
  if (!s || bis - jetzt <= SPERRE_MAX_MS) return false;
  s.bis = jetzt + SPERRE_MAX_MS;
  try { nachKappen?.(wurzel); } catch { /* Speichern ist Zugabe */ }
  return true;
}
// Rest der Sperre für den Büro-Code: hart gesperrt = immer die größte Wartezeit, unabhängig von der Uhr
export function sperreRest(wurzel, jetzt = Date.now()) { return hartGesperrt(wurzel) ? SPERRE_MAX_MS : sperreRestUhr(wurzel, jetzt); }
export function fehlversuch(wurzel, jetzt = Date.now()) {
  const fehler = Math.max(0, Number(wurzel.pinSperre?.fehler) || 0) + 1; const d = sperreDauer(fehler);
  wurzel.pinSperre = { fehler, bis: d ? jetzt + d : 0 };
  return d;
}
export function sperreLoesen(wurzel) { delete wurzel.pinSperre; }
// Für store.js: nur gültige Zählerstände übernehmen
export function sperreSauber(x) {
  if (!x || typeof x !== "object") return undefined;
  const fehler = Math.max(0, Math.min(1000, Math.floor(Number(x.fehler) || 0))); const bis = Math.max(0, Number(x.bis) || 0);
  return fehler ? { fehler, bis } : undefined;
}
export const restText = (ms) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

// SHA-256 von Hand (FIPS 180-4), nur für Text – kurz, ohne Abhängigkeiten.
const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
export function sha256Hex(text) {
  const daten = new TextEncoder().encode(text); const bits = daten.length * 8;
  const n = Math.ceil((daten.length + 9) / 64) * 64; const m = new Uint8Array(n); m.set(daten); m[daten.length] = 0x80;
  const dv = new DataView(m.buffer); dv.setUint32(n - 8, Math.floor(bits / 2 ** 32)); dv.setUint32(n - 4, bits >>> 0);
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]; const W = new Uint32Array(64);
  const r = (x, k) => (x >>> k) | (x << (32 - k));
  for (let o = 0; o < n; o += 64) {
    for (let i = 0; i < 16; i++) W[i] = dv.getUint32(o + i * 4);
    for (let i = 16; i < 64; i++) { const s0 = r(W[i - 15], 7) ^ r(W[i - 15], 18) ^ (W[i - 15] >>> 3); const s1 = r(W[i - 2], 17) ^ r(W[i - 2], 19) ^ (W[i - 2] >>> 10); W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0; }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + W[i]) >>> 0;
      const t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0; H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }
  return H.map((x) => x.toString(16).padStart(8, "0")).join("");
}

// Face ID: nur die Kennung des Geräte-Schlüssels in der Wurzel, kein Geheimnis.
export const bioKennung = (wurzel) => (typeof wurzel?.bio?.id === "string" ? wurzel.bio.id : null);
export function bioSetzen(wurzel, id) { if (!wurzel) return false; if (id) wurzel.bio = { id, seit: new Date().toISOString() }; else delete wurzel.bio; return true; }
// Büro bleibt nach dem Aufschließen eine Weile offen
export const BUERO_OFFEN_MS = 15 * 60 * 1000;
