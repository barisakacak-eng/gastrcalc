// Fehler-Rucksack (Pilotfest E3, 30.10.2026): die letzten 50 Fehler bleiben im Browser (localStorage), ohne Namen und ohne Zahlen.
// Der Chef teilt den Text im Büro über „Fehler melden“ (Oberfläche P6). Nichts geht von allein irgendwohin.
export const FEHLER_KEY = "gc-fehler";
export const FEHLER_MAX = 50; // Setzung Masterprompt Pilotfest

// Zahlen raus (Preise, Umsätze, Telefonnummern, Codes), lange Wörter mit Großbuchstaben (Namen) auf den Anfangsbuchstaben kürzen.
// Pfade und Fehlerklassen bleiben lesbar, damit die Ursache findbar ist.
export const anonym = (text) => String(text || "")
  .replace(/https?:\/\/[^\s)]+/g, (u) => { try { const x = new URL(u); return x.pathname.replace(/\/[^/]*\.(html?)$/, "/…"); } catch { return "…"; } })
  .replace(/\d[\d.,:/-]*/g, "#")
  .replace(/(^|[\s"'„“(,])([A-ZÄÖÜ][a-zäöüß]{2,})(?=[\s"'“),.;:!?]|$)/g, (m, vor, w) => {
    const bekannt = /^(Error|TypeError|RangeError|SyntaxError|ReferenceError|Promise|Uncaught|Cannot|Failed|Unexpected|Worker|Texterkennung|Speicher|Sicherung|Fehler|Abbruch|Zeile|Laden|Büro|Personal)$/;
    return bekannt.test(w) ? m : vor + w[0] + "."; })
  .slice(0, 400);

export const fehlerLesen = (speicher) => { try { const x = JSON.parse(speicher.getItem(FEHLER_KEY) || "[]"); return Array.isArray(x) ? x : []; } catch { return []; } };

// Ein Eintrag: Zeit (Minute), Fassung, Bildschirm, Text. Gleiche Texte hintereinander werden gezählt statt gestapelt.
// `ort` (Datei:Zeile aus dem Fehlerereignis) bleibt unverändert – Zeilennummern sind keine Kundendaten, aber die halbe Diagnose.
export function fehlerMerken(speicher, { text, fassung, ansicht, ort = "", zeit = Date.now() }) {
  const liste = fehlerLesen(speicher);
  const t = (anonym(text) + (ort ? ` @ ${String(ort).slice(0, 80)}` : "")).trim(); if (!t) return liste;
  const letzter = liste[liste.length - 1];
  if (letzter && letzter.text === t && letzter.ansicht === ansicht) { letzter.n = (letzter.n || 1) + 1; letzter.zeit = zeit; }
  else liste.push({ zeit, fassung, ansicht: String(ansicht || ""), text: t });
  while (liste.length > FEHLER_MAX) liste.shift();
  try { speicher.setItem(FEHLER_KEY, JSON.stringify(liste)); } catch { /* voller Speicher: dann eben ohne Rucksack */ }
  return liste;
}
export const fehlerLeeren = (speicher) => { try { speicher.removeItem(FEHLER_KEY); } catch { /* egal */ } };

// Text zum Teilen (Büro „Fehler melden“): Kopfzeile + eine Zeile je Fehler, neueste zuerst.
export function fehlerText(speicher, { fassung, geraet = "", sprache = "" } = {}) {
  const liste = fehlerLesen(speicher).slice().reverse();
  const kopf = `GastroCash ${fassung || ""} · ${sprache} · ${geraet}`.replace(/\s+·\s+$/, "").trim();
  if (!liste.length) return kopf + "\nKeine Fehler gespeichert.";
  const zeile = (f) => { const d = new Date(f.zeit); const hh = String(d.getHours()).padStart(2, "0"), mm = String(d.getMinutes()).padStart(2, "0");
    return `${d.toISOString().slice(0, 10)} ${hh}:${mm} · ${f.fassung || "?"} · ${f.ansicht || "?"}${f.n > 1 ? ` · ${f.n}×` : ""}\n  ${f.text}`; };
  return [kopf, ...liste.map(zeile)].join("\n");
}

// Sammler anhängen: window.onerror, unbehandelte Promises. `ansichtJetzt` liefert den aktuellen Bildschirm (Bedienschicht).
export function fehlerSammlerStarten(win, { fassung, ansichtJetzt = () => "" } = {}) {
  let sp = null; try { sp = win.localStorage; } catch { return () => {}; }
  if (!sp) return () => {};
  const merke = (text, ort = "") => { try { fehlerMerken(sp, { text, fassung, ansicht: ansichtJetzt(), ort }); } catch { /* der Rucksack darf nie selbst stören */ } };
  const aufFehler = (e) => { const err = e.error; const wo = e.filename ? `${e.filename.split("/").slice(-2).join("/")}:${e.lineno}` : "";
    merke((err && (err.stack || err.message)) || e.message || "Fehler", wo); };
  const aufPromise = (e) => { const r = e.reason; merke("Promise: " + ((r && (r.stack || r.message)) || String(r))); };
  win.addEventListener("error", aufFehler); win.addEventListener("unhandledrejection", aufPromise);
  return () => { win.removeEventListener("error", aufFehler); win.removeEventListener("unhandledrejection", aufPromise); };
}
