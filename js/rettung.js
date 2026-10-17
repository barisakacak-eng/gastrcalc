// Rettung (17.10.2026): Rettungscode für den Büro-Code und „Sicherung ersetzt alles“ auf der Fehlerseite.
// Reine Logik ohne Oberfläche. Der Rettungscode wird einmal gezeigt (ebene.js) und nie im Klartext gespeichert:
// in der Wurzel steht nur sein Prüfwert (wurzel.rettungPin, gleiches Format wie wurzel.bueroPin: PBKDF2-SHA-256 mit Salz).
// Fehlversuche zählen in derselben Bremse wie der Büro-Code (wurzel.pinSperre) – zwei Wege, ein Zähler.
import { pinHash, pinGesetzt, pinWertGueltig, pruefwertStimmt, sperreRest, fehlversuch, sperreLoesen, MODI, modus } from "./modus.js";

// 31 Zeichen ohne die leicht verwechselbaren 0/O, 1/I/L (und ohne Kleinbuchstaben). 12 Zeichen ≈ 59 Bit Zufall.
export const RETTUNG_ZEICHEN = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const RETTUNG_LAENGE = 12, RETTUNG_BLOCK = 4;

// Zufall: crypto.getRandomValues, ohne Modulo-Schieflage (Werte ab 248 werden verworfen: 248 = 8 × 31)
function zufallsZeichen(n, zufall) {
  const out = []; const grenze = 256 - (256 % RETTUNG_ZEICHEN.length);
  while (out.length < n) {
    const b = zufall(n * 2);
    for (const x of b) { if (x < grenze && out.length < n) out.push(RETTUNG_ZEICHEN[x % RETTUNG_ZEICHEN.length]); }
  }
  return out.join("");
}
const geraeteZufall = (n) => { const b = new Uint8Array(n); globalThis.crypto.getRandomValues(b); return b; };

// Neuer Rettungscode (ohne Bindestriche). zufall nur für Tests.
export function rettungscodeErzeugen(zufall = geraeteZufall) { return zufallsZeichen(RETTUNG_LAENGE, zufall); }
// Eingabe säubern: Leerzeichen und Striche weg, groß geschrieben
export const rettungNormal = (text) => String(text ?? "").toUpperCase().replace(/[\s\-–—_.]/g, "");
export const rettungGueltig = (text) => { const n = rettungNormal(text); return n.length === RETTUNG_LAENGE && [...n].every((c) => RETTUNG_ZEICHEN.includes(c)); };
// Anzeige in drei Blöcken: „ABCD-EFGH-JKMN“
export const rettungBloecke = (code) => (rettungNormal(code).match(new RegExp(`.{1,${RETTUNG_BLOCK}}`, "g")) || []).join("-");

export const rettungGesetzt = (wurzel) => pinWertGueltig(wurzel?.rettungPin) && wurzel.rettungPin.includes("$"); // nur gesalzene Prüfwerte
// „Code vergessen?“ an einer Code-Abfrage mit diesem Zweck? Nur mit angelegtem Rettungscode, nie beim Festlegen.
// Im Personal-Modus nur am Schloss (zweck "personal" = Personal verlassen): wer den Rettungscode hat, ist der Chef (Entscheidung 17.10.2026).
export const rettungErlaubt = (wurzel, zweck) => rettungGesetzt(wurzel) && !!zweck && zweck !== "setzen" && (modus(wurzel) !== "personal" || zweck === "personal");
// Offen-Hinweis im Büro: Büro-Code da, Rettungscode fehlt (Läden aus der Zeit vor dem 17.10.2026)
export const rettungFehlt = (wurzel) => pinGesetzt(wurzel) && !rettungGesetzt(wurzel);

// Legt einen neuen Rettungscode an (der alte gilt danach nicht mehr). Rückgabe: der Code im Klartext – nur zum einmaligen Zeigen.
export async function rettungAnlegen(wurzel, { zufall } = {}) {
  if (!pinGesetzt(wurzel)) return null;
  const code = rettungscodeErzeugen(zufall);
  wurzel.rettungPin = await pinHash(code);
  return code;
}

// Ein Versuch mit dem Rettungscode. Rückgabe:
//   { ok: true }                    stimmt – Bremse gelöst; jetzt neuen Büro-Code festlegen
//   { gesperrt: ms }                Wartezeit läuft, nicht geprüft
//   { fehler: true, dauer: ms }     falsch – Zähler erhöht (dauer > 0: ab jetzt Wartezeit), bitte speichern
// Ein Text in falscher Form zählt auch als Fehlversuch (sonst ließe sich die Bremse mit Unsinn umgehen – kostet nichts, verrät nichts).
export async function rettungVersuch(wurzel, text, { jetzt = Date.now() } = {}) {
  const rest = sperreRest(wurzel, jetzt); if (rest) return { gesperrt: rest };
  const ok = rettungGesetzt(wurzel) && rettungGueltig(text) && (await pruefwertStimmt(wurzel.rettungPin, rettungNormal(text)));
  if (ok) { sperreLoesen(wurzel); return { ok: true }; }
  return { fehler: true, dauer: fehlversuch(wurzel, jetzt) };
}

// Fehlerseite: die Sicherung ERSETZT den Stand auf diesem Handy (statt Zusammenführen). Was zum Handy gehört, bleibt:
// Büro-Code, Rettungscode, Fehlversuche, Gerätekennung, laufende Nummer (nie kleiner – sonst doppelte Nummern), Speicher-Anfrage.
// Ohne Büro-Code öffnet sich so nichts Neues: Wer die Fehlerseite sieht, bekommt die Daten der Datei, nicht das Büro.
export function wurzelErsetzen(alt, importiert) {
  const neu = { ...importiert };
  for (const k of ["bueroPin", "pinSperre", "rettungPin", "ladeFehler"]) delete neu[k];
  if (alt && pinWertGueltig(alt.bueroPin)) neu.bueroPin = alt.bueroPin; else if (alt?.bueroPin === null) neu.bueroPin = null;
  if (alt?.pinSperre) neu.pinSperre = { ...alt.pinSperre };
  if (alt && rettungGesetzt(alt)) neu.rettungPin = alt.rettungPin;
  if (typeof alt?.geraet === "string" && alt.geraet) neu.geraet = alt.geraet;
  neu.lfd = Math.max(Number(alt?.lfd) || 0, Number(importiert?.lfd) || 0);
  if (alt?.persistGefragt) neu.persistGefragt = true;
  if (alt?.letzteSicherung) neu.letzteSicherung = alt.letzteSicherung;
  // Ebene: mit Code geht es in den Laden (das Büro braucht den Code), sonst bleibt die Ebene des Handys
  const m = MODI.includes(alt?.modus) ? alt.modus : "laden";
  neu.modus = pinWertGueltig(neu.bueroPin) ? (m === "personal" ? "personal" : "laden") : (m === "personal" ? "laden" : m);
  if (!neu.betriebe?.some((b) => b.id === neu.aktiv)) neu.aktiv = neu.betriebe?.[0]?.id ?? null;
  return neu;
}
