// Texterkennung auf dem Gerät, in einem eigenen Arbeitsfaden, damit die Oberfläche nicht einfriert.
// Baustein: tesseract.js-core (WebAssembly) mit dem deutschen Sprachmodell aus vendor/tesseract. Keine Verbindung nach außen.
// Nachricht rein: { id, bild: Uint8Array (PNG/JPEG), psm }  ·  raus: { id, text } oder { id, fehler }.
/* global TesseractCore, importScripts */

let bereit = null;

function simdDa() {
  // kleinstes gültiges WebAssembly-Modul mit einer SIMD-Anweisung
  try { return WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11])); } catch (_) { return false; }
}

// Kleines Probebild (eine Zeile Text) in beiden Lesarten erkennen. Fehler hier sind egal: dann läuft das erste Foto eben ohne Anwärmen.
async function probelauf(M, api) {
  try {
    const c = new OffscreenCanvas(360, 64); const g = c.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, 360, 64); g.fillStyle = "#000"; g.font = "bold 36px sans-serif"; g.fillText("Döner 7,50 €", 10, 46);
    M.FS.writeFile("/input", new Uint8Array(await (await c.convertToBlob({ type: "image/png" })).arrayBuffer()));
    for (const psm of [6, 3]) { api.SetVariable("tessedit_pageseg_mode", String(psm)); if (api.SetImageFile(1, 0) !== 1) { psm === 6 ? api.GetUTF8Text() : api.GetTSVText(0); } }
  } catch (_) {}
}

function starten() {
  if (bereit) return bereit;
  bereit = (async () => {
    importScripts(simdDa() ? "../vendor/tesseract/tesseract-core-simd-lstm.wasm.js" : "../vendor/tesseract/tesseract-core-lstm.wasm.js");
    const M = await TesseractCore({ print() {}, printErr() {} }); // interne Meldungen der Erkennung nicht in die Konsole
    const r = await fetch("../vendor/tesseract/deu.traineddata");
    if (!r.ok) throw new Error("Sprachmodell nicht geladen");
    M.FS.writeFile("deu.traineddata", new Uint8Array(await r.arrayBuffer()));
    const api = new M.TessBaseAPI();
    if (api.Init(null, "deu", 1) === -1) throw new Error("Texterkennung startet nicht");
    await probelauf(M, api); // F3: erster Lauf auf einem Mini-Bild jetzt, damit das erste echte Foto nicht die Anlaufzeit trägt
    return { M, api };
  })();
  bereit.catch(() => { bereit = null; });
  return bereit;
}

self.onmessage = async (e) => {
  const { id, bild, modus = "block" } = e.data || {};
  if (id === "vorwaermen") { try { await starten(); self.postMessage({ id, text: "" }); } catch (f) { self.postMessage({ id, fehler: String(f.message || f) }); } return; }
  try {
    const { M, api } = await starten();
    M.FS.writeFile("/input", bild);
    const lauf = (psm) => { api.SetVariable("tessedit_pageseg_mode", String(psm)); if (api.SetImageFile(1, 0) === 1) throw new Error("Bild nicht lesbar"); };
    // block: ein Textblock (Rechnung, Bon) – Zeilen bleiben zusammen (Modus 6).
    // karte: zusätzlich die automatische Aufteilung (Modus 3) mit Wort-Positionen, für zweispaltige Karten; die Seite wählt das bessere Ergebnis.
    lauf(6); const text = api.GetUTF8Text();
    let tsv = null; if (modus === "karte") { lauf(3); tsv = api.GetTSVText(0); }
    self.postMessage({ id, text, tsv });
  } catch (f) { self.postMessage({ id, fehler: String(f.message || f) }); }
};
