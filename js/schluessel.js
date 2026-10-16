// E5 (16.10.2026): Passwort für die Sicherungsdatei – reine Funktionen ohne Oberfläche, damit Node sie testen kann.
// Die fertige ZIP wird als Ganzes mit AES-GCM (256 Bit) verschlüsselt. Schlüssel aus dem Passwort über PBKDF2-SHA-256 mit
// denselben Runden wie der Büro-Code (modus.js). Aufbau der Datei sicherung.enc: 4 Byte Kennung „GCS1“, 16 Byte Salz, 12 Byte IV,
// dann der Chiffretext (mit GCM-Prüfanhang). Falsches Passwort → AES-GCM schlägt fehl → Fehler mit grund "passwort".
// Das Passwort wird nirgends gespeichert – es lebt nur im Aufruf.
import { PBKDF2_RUNDEN } from "./modus.js";

export const KENNUNG = "GCS1";
export const SICHERUNG_ENC = "sicherung.enc";
export const LIESMICH_NAME = "LIESMICH.txt";
export const PASSWORT_MIN = 6;
const SALZ_LAENGE = 16, IV_LAENGE = 12, KOPF = 4 + SALZ_LAENGE + IV_LAENGE;

// Dreisprachig, für den, der die ZIP außerhalb der App öffnet (DE/TR/EN – die drei Grundsprachen der App).
export const LIESMICH = [
  "Diese Sicherung ist mit einem Passwort verschlüsselt. Sie lässt sich nur in GastroCalc einlesen. Passwort nicht vergessen – ohne Passwort gibt es keinen Weg zurück.",
  "Bu yedek bir parola ile şifrelenmiştir. Sadece GastroCalc içinde okunabilir. Parolayı unutma – parola olmadan geri dönüş yok.",
  "This backup is encrypted with a password. It can only be read in GastroCalc. Do not forget the password – without it there is no way back.",
].join("\n\n") + "\n";

const fehler = (grund) => Object.assign(new Error(grund), { grund });
const subtle = () => globalThis.crypto?.subtle || null;
function zufall(n) {
  const b = new Uint8Array(n);
  if (!globalThis.crypto?.getRandomValues) throw fehler("keinCrypto"); // ohne echten Zufall kein Schlüssel
  globalThis.crypto.getRandomValues(b); return b;
}
export const passwortGueltig = (p) => typeof p === "string" && p.length >= PASSWORT_MIN;

// Schlüssel aus Passwort und Salz (PBKDF2-SHA-256, PBKDF2_RUNDEN aus modus.js). Dauert auf alten Handys spürbar – wie der Büro-Code.
async function schluessel(passwort, salz) {
  const s = subtle(); if (!s) throw fehler("keinCrypto");
  const roh = await s.importKey("raw", new TextEncoder().encode(String(passwort).normalize("NFC")), "PBKDF2", false, ["deriveKey"]);
  return s.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: salz, iterations: PBKDF2_RUNDEN }, roh, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

// Bytes (Uint8Array) → Bytes der sicherung.enc
export async function verschluesseln(bytes, passwort) {
  if (!passwortGueltig(passwort)) throw fehler("zuKurz");
  const salz = zufall(SALZ_LAENGE), iv = zufall(IV_LAENGE);
  const k = await schluessel(passwort, salz);
  const chiffre = new Uint8Array(await subtle().encrypt({ name: "AES-GCM", iv }, k, bytes));
  const out = new Uint8Array(KOPF + chiffre.length);
  out.set(new TextEncoder().encode(KENNUNG), 0); out.set(salz, 4); out.set(iv, 4 + SALZ_LAENGE); out.set(chiffre, KOPF);
  return out;
}

// Erkennt die Kennung am Anfang (Bytes oder Blob-Anfang)
export function istVerschluesselt(bytes) {
  return bytes instanceof Uint8Array && bytes.length > KOPF && new TextDecoder().decode(bytes.subarray(0, 4)) === KENNUNG;
}

// Bytes der sicherung.enc + Passwort → Klartext-Bytes. Fehler: grund "format" (keine GCS1-Datei), "passwort" (falsch), "keinCrypto".
export async function entschluesseln(bytes, passwort) {
  if (!istVerschluesselt(bytes)) throw fehler("format");
  if (typeof passwort !== "string" || !passwort) throw fehler("passwort");
  const salz = bytes.subarray(4, 4 + SALZ_LAENGE), iv = bytes.subarray(4 + SALZ_LAENGE, KOPF);
  const k = await schluessel(passwort, salz);
  try { return new Uint8Array(await subtle().decrypt({ name: "AES-GCM", iv }, k, bytes.subarray(KOPF))); }
  catch (_) { throw fehler("passwort"); } // AES-GCM meldet nur „geht nicht“ – bei intakter Datei heißt das: falsches Passwort
}
