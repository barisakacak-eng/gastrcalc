// Drei Ebenen (15.10.2026, Entwickler A): LADEN (während der Arbeit), PERSONAL (Aushilfe, kein Euro), BÜRO (Rechnen, Einrichten, Abgeben).
// Der Modus gilt je Handy und steht auf der Wurzel (wurzel.modus), der Büro-Code nur als Prüfwert (wurzel.bueroPin = PBKDF2 mit Salz, nie die Ziffern).
// Reine Logik ohne Oberfläche – alle anderen Bausteine dürfen das hier importieren.

export const MODI = ["laden", "personal", "buero"];
export function modus(wurzel) { return MODI.includes(wurzel?.modus) ? wurzel.modus : "laden"; }

// Laden-Leiste unten: genau diese fünf Reiter, in dieser Reihenfolge.
export const LADEN_TABS = ["start", "muell", "kuehl", "putzplan", "karte"];
// Im Laden erreichbar: die Reiter plus das, was das Menü-Blatt öffnet.
export const LADEN_ANSICHTEN = [...LADEN_TABS, "abschluss", "kartefoto"]; // Laden wechseln geht im Blatt; „Alle Läden" mit Zahlen wohnt im Büro
// Personal: drei Kacheln, sonst nichts.
export const PERSONAL_ANSICHTEN = ["personal", "muell", "kuehl", "putzplan"];

// Spiegel im Browser-Speicher: nur noch der Modus. Der Büro-Code wohnt allein in der Wurzel (W2-S, Prüfgremium p07 M3);
// ein alter Code-Spiegel („gc-buero-pin") wird beim Start einmal übernommen und dann gelöscht.
const SCHLUESSEL = { modus: "gc-modus", pinAlt: "gc-buero-pin" };
function merke(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* ohne Speicher gilt nur die Wurzel */ } }
function lies(k) { try { return localStorage.getItem(k); } catch { return null; } }

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
  if (wurzel.modus === "buero" && pinGesetzt(wurzel)) modusSetzen(wurzel, "laden");
  if (wurzel.modus === "personal" && !pinGesetzt(wurzel)) modusSetzen(wurzel, "laden");
}
// „Alles löschen": auch den Spiegel vergessen.
export function ebeneVergessen() { merke(SCHLUESSEL.modus, null); merke(SCHLUESSEL.pinAlt, null); }

// Personal-Modus (W2-S, p02 K2): diese Handlungen gibt es dort nicht – Einrichtung, Grenzen, Personen, Verwerfen,
// Nachtragen für Vortage, Putzplan einrichten, Sprache dauerhaft, Code, Laden löschen. („Alles löschen" auf der Fehlerseite geht mit Code.) Die Knöpfe fehlen dort, app.js weist sie zusätzlich ab.
const PERSONAL_GESPERRT = new Set(["kuehl-einrichtung", "kuehl-einrichtung-oeffnen", "kuehl-einrichtung-fertig", "kuehl-keine", "kuehl-takt", "kuehl-ruhetag",
  "person-neu", "person-weg", "rundgang-verwerfen", "start-datum", "muell1-nachtragen",
  "pp-geraet", "pp-aufgabe", "pp-uebernehmen", "pp-spaeter",
  "sprache", "blatt-sprache", "pin-setzen", "pin-entfernen", "laden-loeschen", "laden-neu", "beispiel-anlegen", "beispiel-loeschen", "einrichtung-fertig-ok", "bearbeiten", "export",
  "rettung-neu"]); // Rettung (17.10.2026): kein neuer Rettungscode; „Code vergessen?“ nur am Schloss (rettungErlaubt in rettung.js, app.js prüft)
// heute: Datum „heute" (JJJJ-MM-TT) – Müll und Kühlung dürfen im Personal-Modus nur für heute eingetragen werden.
export function personalGesperrt(name, wert, heute) {
  if (PERSONAL_GESPERRT.has(name) || /^stelle-|^kw-|^vk-|^tf-|^akt-|^gt-/.test(name)) return true; // Getränke (18.10.2026): gt- nur im Büro // Menütafel (18.10.2026): tf- (Menütafel) und akt- (Aktionen) nur im Büro // vk- (18.10.2026): Verkauf je Gericht und Z-Bon nur im Büro // Trennung (17.10.2026): kw- = Büro „Ware nach Kühl-Abweichung“
  if (name === "pp-ansicht" && wert === "einrichten") return true;
  if (name === "tag-datum" && wert !== heute) return true;
  return false;
}
// Eingabefelder der Einrichtung (Kühlstellen, Grenzen, Kürzel) – im Personal-Modus ohne Wirkung.
export const personalFeldGesperrt = (feld) => /^stelle-|^person-neu$/.test(String(feld || ""));

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
export const ERSATZ_RUNDEN = 5000;     // von Hand gerechnet, damit ein altes Handy nicht hängt
const ALT = /^[0-9a-f]{64}$/;
const NEU = /^(pbkdf2|salz)\$([1-9][0-9]{0,7})\$([0-9a-f]{32})\$([0-9a-f]{64})$/;
export const pinWertGueltig = (v) => typeof v === "string" && (ALT.test(v) || NEU.test(v));
export const pinGesetzt = (wurzel) => pinWertGueltig(wurzel?.bueroPin);
export const pinGueltig = (pin) => /^[0-9]{4}$/.test(String(pin ?? ""));
export const pinVeraltet = (wurzel) => typeof wurzel?.bueroPin === "string" && ALT.test(wurzel.bueroPin);

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
  if (pin === null) { wurzel.bueroPin = null; delete wurzel.pinSperre; delete wurzel.rettungPin; return true; } // Rettung (17.10.2026): ohne Büro-Code kein Rettungscode
  if (!pinGueltig(pin)) return false;
  wurzel.bueroPin = await pinHash(pin); delete wurzel.pinSperre; delete wurzel.rettungPin; return true; // Rettung (17.10.2026): neuer Code = alter Rettungscode gilt nicht mehr (rettung.js legt gleich einen neuen an)
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
// Rettung (17.10.2026): derselbe Vergleich für den Rettungscode (rettung.js) – nur gesalzene Prüfwerte, nie alte ohne Salz
export const pruefwertStimmt = (wert, text) => (typeof wert === "string" && NEU.test(wert) ? pinStimmt(wert, String(text)) : Promise.resolve(false));
// Prüft den Code. Ein alter Prüfwert (ohne Salz) wird dabei gleich auf den neuen umgestellt – danach speichern.
export async function pinPruefen(wurzel, pin) {
  if (!pinGesetzt(wurzel) || !pinGueltig(pin)) return false;
  const ok = await pinStimmt(wurzel.bueroPin, String(pin));
  if (ok && pinVeraltet(wurzel)) wurzel.bueroPin = await pinHash(pin);
  return ok;
}

// ---------- Wartezeit nach Fehlversuchen (W2-S, p07 M4 / p02 H5) ----------
// Zähler in der Wurzel (wurzel.pinSperre = { fehler, bis }), damit ein Neustart ihn nicht zurücksetzt.
// Ab dem 5. Fehlversuch: 30 s, dann je Fehlversuch doppelt so lang, höchstens 15 min. Ein richtiger Code setzt zurück.
export const SPERRE_AB = 5, SPERRE_START_MS = 30000, SPERRE_MAX_MS = 15 * 60000;
export const sperreDauer = (fehler) => (fehler < SPERRE_AB ? 0 : Math.min(SPERRE_MAX_MS, SPERRE_START_MS * 2 ** (fehler - SPERRE_AB)));
export function sperreRest(wurzel, jetzt = Date.now()) {
  const bis = Number(wurzel?.pinSperre?.bis) || 0; if (bis <= jetzt) return 0;
  return Math.min(bis - jetzt, SPERRE_MAX_MS); // Uhr zurückgestellt: nie länger als die größte Wartezeit
}
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
