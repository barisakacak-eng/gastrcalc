// Auswertung – EIN Weg vom Foto/PDF zum Text. Etappe 6a.
// Heute: „geraet" – Texterkennung auf dem Handy (tesseract, deutsch) und PDF-Text (pdf.js). Kostenlos, offline nach dem ersten Laden.
// Später: „ki" – derselbe Aufruf schickt die abgelegte Datei an den Server; zurück kommt derselbe Aufbau { text, quelle, … },
// optional schon mit fertigen Feldern (felder). Die fachlichen Leser (karteLesen, belegZerlegen, kostenbelegLesen) bleiben gleich.

import { istPdf, istBild } from "./ablage.js";
import { zeilenAusTsv } from "./ocr_layout.js";

// Speisekarte: beide Lesarten (Block / Spalten) weitergeben.
export function besteKartenLesart(text, tsv) {
  if (!tsv) return text;
  // beide Lesarten behalten (\f trennt sie): karte_lesen führt sie zusammen – jede findet Gerichte, die die andere verliert (Pilot 14.10.)
  return `${text}\n\f\n${zeilenAusTsv(tsv)}`;
}

let auswerter = "geraet";
export const auswerterName = () => auswerter;
export function auswerterSetzen(name) { if (!["geraet", "ki"].includes(name)) throw new Error("unbekannt"); auswerter = name; }

// ---------- Texterkennung im Arbeitsfaden ----------
let worker = null; let naechste = 1; const offen = new Map();
function ocrWorker() {
  if (worker) return worker;
  worker = new Worker(new URL("./ocr-worker.js", import.meta.url));
  worker.onmessage = (e) => { const p = offen.get(e.data.id); if (!p) return; offen.delete(e.data.id); if (e.data.fehler) p.rej(new Error(e.data.fehler)); else p.res(e.data); };
  worker.onerror = (e) => { e.preventDefault?.(); abbruch(Object.assign(new Error(e.message || "Texterkennung abgestürzt"), { grund: "laden" })); };
  return worker;
}
// Alle offenen Aufträge beenden und den Arbeitsfaden verwerfen (Absturz, Zeitgrenze, iOS hat ihn wegen Speicher beendet)
function abbruch(fehler) { for (const p of offen.values()) p.rej(fehler); offen.clear(); try { worker?.terminate(); } catch (_) {} worker = null; }
const ZEITGRENZE_MS = 180000; // Modell „best" ist genauer, aber langsamer
// Rückgabe: Text. modus "karte" liest zusätzlich spaltenweise und nimmt die bessere Lesart.
async function ocrAuftrag(bild, modus = "block") {
  const r = await new Promise((res, rej) => {
    const id = naechste++;
    const uhr = setTimeout(() => abbruch(Object.assign(new Error("Zeitgrenze"), { grund: "zeit" })), ZEITGRENZE_MS);
    offen.set(id, { res: (x) => { clearTimeout(uhr); res(x); }, rej: (f) => { clearTimeout(uhr); rej(/Sprachmodell|importScripts|NetworkError|Failed to fetch|Load failed/i.test(f.message) ? Object.assign(f, { grund: "laden" }) : f); } });
    ocrWorker().postMessage({ id, bild, modus }, [bild.buffer]);
  });
  return modus === "karte" ? besteKartenLesart(r.text || "", r.tsv) : (r.text || "");
}
// Beim Öffnen der Kamera schon laden (ca. 5 MB beim ersten Mal), damit nach dem Foto keine Wartezeit entsteht.
export function vorwaermen() { if (typeof Worker === "undefined") return; try { const w = ocrWorker(); offen.set("vorwaermen", { res() {}, rej() {} }); w.postMessage({ id: "vorwaermen" }); } catch (_) {} }

// Bild für die Erkennung vorbereiten: richtig drehen (EXIF), lange Seite 2400 px, Graustufen, leichter Kontrast. Ergebnis PNG-Bytes.
// Ältere iPhones (vor iOS 17) kennen die Option imageOrientation nicht: dann ohne, und notfalls über ein <img> (dreht laut EXIF).
async function bildLesen(datei) {
  try { return await createImageBitmap(datei, { imageOrientation: "from-image" }); } catch (_) {}
  try { return await createImageBitmap(datei); } catch (_) {}
  const url = URL.createObjectURL(datei);
  try { const img = new Image(); img.src = url; await img.decode(); return img; } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}
async function bildVorbereiten(quelle) {
  const bmp = quelle instanceof HTMLCanvasElement ? quelle : await bildLesen(quelle);
  const f = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas"); c.width = Math.round(bmp.width * f); c.height = Math.round(bmp.height * f);
  const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(bmp, 0, 0, c.width, c.height);
  const d = g.getImageData(0, 0, c.width, c.height); const p = d.data;
  for (let i = 0; i < p.length; i += 4) { const y = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]; const k = Math.max(0, Math.min(255, (y - 128) * 1.25 + 128)); p[i] = p[i + 1] = p[i + 2] = k; }
  g.putImageData(d, 0, 0);
  const blob = await new Promise((res) => c.toBlob(res, "image/png"));
  bmp.close?.(); c.width = 0; c.height = 0; // Speicher sofort freigeben (Safari hat eine enge Grenze für Canvas-Speicher)
  if (!blob) throw Object.assign(new Error("Bild zu groß"), { grund: "gross" });
  return new Uint8Array(await blob.arrayBuffer());
}

// ---------- PDF ----------
let pdfjs = null;
async function pdfLaden() {
  if (pdfjs) return pdfjs;
  await new Promise((res, rej) => { const s = document.createElement("script"); s.src = new URL("../vendor/pdfjs/pdf.min.js", import.meta.url).href; s.onload = res; s.onerror = () => rej(Object.assign(new Error("PDF-Leser nicht geladen"), { grund: "laden" })); document.head.appendChild(s); });
  pdfjs = window.pdfjsLib; pdfjs.GlobalWorkerOptions.workerSrc = new URL("../vendor/pdfjs/pdf.worker.min.js", import.meta.url).href;
  return pdfjs;
}
// Textschicht einer PDF-Seite in Zeilen: Stücke mit gleicher Höhe (y) zusammen, von links nach rechts.
export function zeilenAusTextStuecken(items) {
  const zeilen = [];
  for (const it of items) {
    const s = String(it.str || ""); if (!s.trim()) continue;
    const x = it.transform[4], y = it.transform[5];
    let z = zeilen.find((r) => Math.abs(r.y - y) < Math.max(2, (it.height || 8) * 0.5));
    if (!z) { z = { y, teile: [] }; zeilen.push(z); }
    z.teile.push({ x, s });
  }
  return zeilen.sort((a, b) => b.y - a.y).map((z) => z.teile.sort((a, b) => a.x - b.x).map((t) => t.s).join(" ").replace(/\s+/g, " ").trim()).join("\n");
}

async function pdfAuswerten(datei, fortschritt, modus) {
  const lib = await pdfLaden();
  const doc = await lib.getDocument({ data: new Uint8Array(await datei.arrayBuffer()), isEvalSupported: false }).promise;
  const n = Math.min(doc.numPages, 4); const texte = []; let art = "pdf-text";
  for (let i = 1; i <= n; i++) {
    fortschritt?.({ schritt: "seite", seite: i, von: n });
    const seite = await doc.getPage(i);
    const t = zeilenAusTextStuecken((await seite.getTextContent()).items);
    if (t.replace(/\s/g, "").length > 40) { texte.push(t); continue; }
    // eingescanntes PDF: Seite als Bild malen und erkennen
    art = "pdf-bild";
    const vp = seite.getViewport({ scale: 2 }); const c = document.createElement("canvas"); c.width = vp.width; c.height = vp.height;
    await seite.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
    texte.push(await ocrAuftrag(await bildVorbereiten(c), modus));
  }
  const gesamt = doc.numPages; doc.destroy?.();
  return { text: texte.join("\n"), art, seiten: n, nichtGelesen: Math.max(0, gesamt - n) };
}

// ---------- Der eine Aufruf ----------
// zweck: "speisekarte" | "rechnung" | "kosten"  ·  fortschritt({schritt}) für die Anzeige
export async function auswerten(datei, { zweck = "rechnung", fortschritt = null } = {}) {
  const t0 = Date.now();
  if (auswerter === "ki") throw Object.assign(new Error("KI-Auswertung ist noch nicht eingerichtet"), { grund: "ki" });
  let r;
  const modus = zweck === "speisekarte" ? "karte" : "block";
  if (istPdf(datei)) r = await pdfAuswerten(datei, fortschritt, modus);
  else if (istBild(datei)) {
    fortschritt?.({ schritt: "lesen" });
    r = { text: await ocrAuftrag(await bildVorbereiten(datei), modus), art: "bild", seiten: 1, nichtGelesen: 0 };
  } else throw Object.assign(new Error("Dateiart nicht unterstützt"), { grund: "art" });
  return { ...r, quelle: auswerter, dauerMs: Date.now() - t0, felder: null };
}
