// Ablage – EIN Weg für jedes Foto und jede Datei (Speisekarte, Rechnung, Kostenbeleg). Etappe 6a, Baris 14.10.2026:
// „Das Fundament des Speicherwegs heute schon richten, falls wir umschalten müssen."
//
// Die App kennt nur vier Aufrufe: ablegen, holen, entfernen, ablageOrt. Wo die Datei liegt, entscheidet der Ort:
//   lokal  – heute: auf diesem Gerät (IndexedDB "gastrocalc-dateien"), keine Kosten, nichts verlässt das Handy.
//   cloud  – später: gesicherte Cloud (Upload, Verschlüsselung, Löschfrist). Gleiche Schnittstelle, gleiche Kennungen.
// Zum Umschalten wird nur ORTE.cloud gefüllt und ablageOrtSetzen("cloud") gerufen; kein Bildschirm ändert sich.
// Ohne IndexedDB (Tests, privater Modus) liegt die Datei im Arbeitsspeicher und ist nach dem Neuladen weg – das sagt die App.

import { uid } from "./util.js";

const DB_NAME = "gastrocalc-dateien";
const DB_VERSION = 1;
const MAX_BYTES = 15 * 1024 * 1024;

function lokalOrt() {
  let db = null; const speicher = new Map(); let fluechtig = typeof indexedDB === "undefined";
  const oeffnen = () => new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains("dateien")) r.result.createObjectStore("dateien"); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); r.onblocked = () => rej(new Error("blockiert"));
  });
  const tx = async (mode, fn) => {
    if (!db) db = await oeffnen();
    return new Promise((res, rej) => { const t = db.transaction("dateien", mode); const out = fn(t.objectStore("dateien")); t.oncomplete = () => res(out?.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); });
  };
  return {
    name: "lokal",
    get fluechtig() { return fluechtig; },
    async schreiben(id, blob) {
      if (!fluechtig) {
        for (let versuch = 0; versuch < 2; versuch++) {
          try { await tx("readwrite", (s) => s.put(blob, id)); return; }
          catch (e) { db = null; if (versuch) { console.warn("Ablage auf dem Gerät nicht möglich, diese Datei nur in dieser Sitzung:", e); } } // iOS trennt die Verbindung manchmal: einmal neu öffnen
        }
      }
      speicher.set(id, blob);
    },
    async lesen(id) { if (speicher.has(id)) return speicher.get(id); if (typeof indexedDB === "undefined") return null; try { return (await tx("readonly", (s) => s.get(id))) || null; } catch (_) { return null; } },
    async loeschen(id) { speicher.delete(id); if (!fluechtig) { try { await tx("readwrite", (s) => s.delete(id)); } catch (_) {} } },
    async leeren() { speicher.clear(); if (typeof indexedDB === "undefined") return; try { await tx("readwrite", (s) => s.clear()); } catch (_) {} },
    // W2-D (Sicherung mit Fotos): alle Kennungen dieses Orts – die Dateien selbst werden einzeln geholt
    async schluessel() { const ids = new Set(speicher.keys()); if (typeof indexedDB !== "undefined") { try { for (const k of (await tx("readonly", (s) => s.getAllKeys())) || []) ids.add(String(k)); } catch (_) {} } return [...ids]; },
  };
}

// Platzhalter für die Cloud: absichtlich ohne Funktion, damit niemand versehentlich hochlädt (Kapitän 14.10.: Testphase lokal, ohne Kosten).
const cloudOrt = {
  name: "cloud",
  async leeren() {},
  fluechtig: false,
  async schreiben() { throw new Error("Cloud-Ablage ist noch nicht eingerichtet"); },
  async lesen() { return null; },
  async loeschen() {},
  async schluessel() { return []; },
};

const ORTE = { lokal: lokalOrt(), cloud: cloudOrt };
let aktiv = "lokal";
export const ablageOrt = () => aktiv;
export const ablageFluechtig = () => ORTE[aktiv].fluechtig;
export function ablageOrtSetzen(name) { if (!ORTE[name]) throw new Error("unbekannter Ablageort"); aktiv = name; }

export const ZWECKE = ["speisekarte", "rechnung", "kosten", "muell", "gericht", "zbon"]; // zbon (18.10.2026): Foto des Z-Bons, nachvollziehbar für Amt/Steuerberater

// Legt eine Datei ab und liefert die Beschreibung, die im Laden (stand.uploads) gespeichert wird – die Datei selbst steht nie im Laden.
export async function ablegen(blob, { name = "", zweck = "rechnung", laden = null } = {}) {
  if (!blob || !(blob.size > 0)) throw Object.assign(new Error("leer"), { grund: "leer" });
  if (blob.size > MAX_BYTES) throw Object.assign(new Error("zu groß"), { grund: "gross" });
  const id = "d-" + uid();
  await ORTE[aktiv].schreiben(id, blob);
  return { id, ort: aktiv, typ: blob.type || "application/octet-stream", groesse: blob.size, name: String(name).slice(0, 80), zweck: ZWECKE.includes(zweck) ? zweck : "rechnung", laden, erstellt: new Date().toISOString() };
}

export async function holen(meta) { const ort = ORTE[meta?.ort || aktiv]; return ort ? ort.lesen(meta.id || meta) : null; }
// „Alles löschen" in den Einstellungen: auch alle abgelegten Fotos und Dateien dieses Geräts weg (Review 6a)
export async function ablageLeeren() { for (const o of Object.values(ORTE)) await o.leeren(); }
// W2-D (Sicherung mit Fotos): alle abgelegten Dateien dieses Geräts (Kennung + Holen einzeln, damit nie alle Fotos gleichzeitig im Speicher liegen)
export async function ablageKennungen() { return ORTE.lokal.schluessel(); }
export async function ablageLesen(id) { return ORTE.lokal.lesen(id); }
// Einlesen einer Sicherung: Datei unter ihrer alten Kennung zurücklegen; schon vorhandene Dateien bleiben unberührt. Rückgabe: true = neu abgelegt.
export async function ablageZuruecklegen(id, blob) {
  if (typeof id !== "string" || !/^[\w.-]{1,80}$/.test(id) || !blob || !(blob.size > 0) || blob.size > MAX_BYTES) return false;
  if (await ORTE.lokal.lesen(id)) return false;
  await ORTE.lokal.schreiben(id, blob); return true;
}
export async function entfernen(meta) { const ort = ORTE[meta?.ort || aktiv]; if (ort) await ort.loeschen(meta.id || meta); }

export const istPdf = (datei) => datei?.type === "application/pdf" || /\.pdf$/i.test(datei?.name || "");
export const istBild = (datei) => /^image\//.test(datei?.type || "") || /\.(jpe?g|png|heic|heif|webp)$/i.test(datei?.name || "");

// Fotos vor dem Ablegen verkleinern (lange Seite höchstens 2000 Pixel, JPEG): spart Platz auf dem Handy und später Upload-Zeit.
// Gelingt das nicht (z. B. HEIC in einem Browser, der es nicht lesen kann), wird das Original abgelegt.
export async function bildFuerAblage(datei, maxSeite = 2000) {
  if (!istBild(datei) || typeof createImageBitmap !== "function" || typeof document === "undefined") return datei;
  try {
    const bmp = await createImageBitmap(datei, { imageOrientation: "from-image" });
    const f = Math.min(1, maxSeite / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * f); c.height = Math.round(bmp.height * f);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height); bmp.close?.();
    const blob = await new Promise((res) => c.toBlob(res, "image/jpeg", 0.85));
    return blob && blob.size < datei.size ? blob : datei;
  } catch (_) { return datei; }
}
