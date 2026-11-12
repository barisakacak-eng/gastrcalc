#!/usr/bin/env node
// Mutationsprobe (Lauf 6, Etappe 2): 20 absichtliche Rechenfehler. Jeder muss von den genannten Testdateien bemerkt werden.
// Aufruf: node tools/mutation.mjs            → alle 20, Ende mit „20/20“ oder Fehlercode 1
//         node tools/mutation.mjs M03 M14    → nur diese
// So geht es: js/ und tests/ werden in einen Temp-Ordner kopiert (der Arbeitsbaum bleibt unberührt), dort wird je Mutation
// genau eine Stelle ersetzt und die genannten Testdateien laufen in TZ=UTC. Rot heißt: Stelle nicht (genau einmal) gefunden
// ODER die Tests bleiben trotz Fehler grün. tests/fassung.test.mjs zählt nie als Entdecker.
import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const MUTATIONEN = [
  { id: "M01", datei: "js/zaehler.js",
    such: "const nenner = (1 - q) / brutto - pS;",
    ersatz: "const nenner = (1 - q) / brutto + pS;",
    verhalten: "Nullpunkt: Provision-Abzug − zu +",
    tests: ["zaehler.test.mjs"] },
  { id: "M02", datei: "js/zaehler.js",
    such: "const nennerZ = (1 - q - g) / brutto - pS;",
    ersatz: "const nennerZ = (1 - q + g) / brutto - pS;",
    verhalten: "Ziel: Zielgewinn − zu +",
    tests: ["goldwert.test.mjs","grenzen.test.mjs","zielbild.test.mjs"] },
  { id: "M03", datei: "js/zaehler.js",
    such: "summe < nullpunkt ? \"bisNull\"",
    ersatz: "summe <= nullpunkt ? \"bisNull\"",
    verhalten: "Stufe bis-null: < zu <=",
    tests: ["grenzen.test.mjs"] },
  { id: "M04", datei: "js/zaehler.js",
    such: "Math.round(betrag * (1 + satz) * 100) / 100 : betrag",
    ersatz: "betrag * (1 + satz) : betrag",
    verhalten: "Netto→Brutto Umsatz: Rundung weg",
    tests: ["grenzen.test.mjs"] },
  { id: "M05", datei: "js/preisrunde.js",
    such: "const dbAlt = pa / (1 + mwst) - w,",
    ersatz: "const dbAlt = pa / (1 + mwst) + w,",
    verhalten: "Preisrunde: DB alt Ware − zu +",
    tests: ["preisrunde.test.mjs"] },
  { id: "M06", datei: "js/steuertopf.js",
    such: "SATZ_19 = 0.19;",
    ersatz: "SATZ_19 = 0.18;",
    verhalten: "Steuertopf: Satz 19 % zu 18 %",
    tests: ["welle3_goldwerte.test.mjs"] },
  { id: "M07", datei: "js/steuertopf.js",
    such: "zahllast: rund2(ustGesamt - vorsteuer)",
    ersatz: "zahllast: rund2(ustGesamt + vorsteuer)",
    verhalten: "Zahllast: USt − Vorsteuer, − zu +",
    tests: ["welle3_goldwerte.test.mjs"] },
  { id: "M08", datei: "js/steuertopf.js",
    such: "rund2(rund2(ust7 + ust19) - bisher)",
    ersatz: "rund2(ust7 + ust19 - bisher)",
    verhalten: "Steuertopf-Tageszeile: kumulierte Rundung weg",
    tests: ["grenzen.test.mjs"] },
  { id: "M09", datei: "js/umsatz_pruefung.js",
    such: "b < m * UMSATZ_PRUEFUNG.unten",
    ersatz: "b <= m * UMSATZ_PRUEFUNG.unten",
    verhalten: "Umsatz-Rückfrage 10 %: < zu <=",
    tests: ["grenzen.test.mjs"] },
  { id: "M10", datei: "js/feiertage.js",
    such: "fronleichnam: plusTage(o, 60)",
    ersatz: "fronleichnam: plusTage(o, 61)",
    verhalten: "Fronleichnam Ostern+60 zu +61",
    tests: ["mindestlohn.test.mjs","pruef2_1810.test.mjs"] },
  { id: "M11", datei: "js/mindestlohn.js",
    such: "p.stunden * MONATSTAGE / 28",
    ersatz: "p.stunden * MONATSTAGE / 29",
    verhalten: "Mindestlohn-Vorschau: 28-Tage-Fenster /28 zu /29",
    tests: ["generalprobe.test.mjs","mindestlohn.test.mjs"] },
  { id: "M12", datei: "js/ware.js",
    such: "jahr: jePortion * monat * 12",
    ersatz: "jahr: jePortion * monat * 11",
    verhalten: "Portion in Euro: Jahr 12 zu 11 Monate",
    tests: ["portion_k2a2.test.mjs","ware.test.mjs"] },
  { id: "M13", datei: "js/engine.js",
    such: "export const VORSTEUER = 0.19;",
    ersatz: "export const VORSTEUER = 0.07;",
    verhalten: "Vorsteuer-Standard 0,19 zu 0,07",
    tests: ["engine.test.mjs","paket3.test.mjs","sicherung_rundreise.test.mjs","zaehler.test.mjs"] },
  { id: "M14", datei: "js/lieferung.js",
    such: "Math.round(Math.abs(prozent) * 10000) / 10000 > PREISSPRUNG_AB",
    ersatz: "Math.round(Math.abs(prozent) * 10000) / 10000 >= PREISSPRUNG_AB",
    verhalten: "Preissprung-Rückfrage 10 %: > zu >=",
    tests: ["grenzen.test.mjs"] },
  { id: "M15", datei: "js/schichten.js",
    such: "mt >= nachtAb || mt < nachtBis",
    ersatz: "mt >= nachtAb + 60 || mt < nachtBis",
    verhalten: "Nachtzuschlag-Beginn 20 Uhr zu 21 Uhr",
    tests: ["welle3_goldwerte.test.mjs"] },
  { id: "M16", datei: "js/engine.js",
    such: "(Number(betrag) || 0) / (1 + (Number(satz) || 0))",
    ersatz: "(Number(betrag) || 0) * (1 + (Number(satz) || 0))",
    verhalten: "nettoVonBrutto: / zu *",
    tests: ["engine.test.mjs","generalprobe.test.mjs","goldwert.test.mjs"] },
  { id: "M17", datei: "js/hebel.js",
    such: "euroMonat: cent / (1 + z.mwst)",
    ersatz: "euroMonat: cent * (1 + z.mwst)",
    verhalten: "Euro-Hebel: / zu *",
    tests: ["hebel.test.mjs"] },
  { id: "M18", datei: "js/liquiditaet.js",
    such: "reicht: tief.c >= 0",
    ersatz: "reicht: tief.c > 0",
    verhalten: "Liquidität reicht: >= zu >",
    tests: ["grenzen.test.mjs"] },
  { id: "M19", datei: "js/engine.js",
    such: "kuehl: { min: null, max: 7 }",
    ersatz: "kuehl: { min: null, max: 8 }",
    verhalten: "Kühlgrenze 7 °C zu 8 °C",
    tests: ["export.test.mjs","h.test.mjs","kuehl.test.mjs","kuehlgrenzen.test.mjs"] },
  { id: "M20", datei: "js/liquiditaet.js",
    such: "plus(eingabe.datum, NACHFRAGE_TAGE) <= heute",
    ersatz: "plus(eingabe.datum, NACHFRAGE_TAGE) < heute",
    verhalten: "Nachfrage-Frist: <= zu <",
    tests: ["grenzen.test.mjs"] },
];

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
function kopie() {
  const ziel = fs.mkdtempSync(path.join(os.tmpdir(), "mutation-"));
  for (const e of fs.readdirSync(wurzel)) {
    if (e === ".git" || e === "node_modules" || e === ".claude") continue;
    if (e === "js" || e === "tests") fs.cpSync(path.join(wurzel, e), path.join(ziel, e), { recursive: true });
    else fs.symlinkSync(path.join(wurzel, e), path.join(ziel, e));   // Bilder, CSS, index.html: nur gelesen
  }
  return ziel;
}
function pruefe(ziel, m) {
  const f = path.join(ziel, m.datei);
  if (!fs.existsSync(f)) return { ok: false, grund: "Datei fehlt: " + m.datei };
  const orig = fs.readFileSync(f, "utf8"); const n = orig.split(m.such).length - 1;
  if (n !== 1) return { ok: false, grund: `Stelle ${n}× gefunden (muss genau 1× sein)` };
  const tests = m.tests.filter((t) => t !== "fassung.test.mjs");
  if (!tests.length) return { ok: false, grund: "keine Testdatei genannt" };
  const fehlt = tests.filter((t) => !fs.existsSync(path.join(ziel, "tests", t)));
  if (fehlt.length) return { ok: false, grund: "Testdatei fehlt: " + fehlt.join(", ") };
  fs.writeFileSync(f, orig.replace(m.such, () => m.ersatz));
  try {
    const r = spawnSync(process.execPath, ["--test", ...tests.map((t) => "tests/" + t)], { cwd: ziel, env: { ...process.env, TZ: "UTC" }, encoding: "utf8", maxBuffer: 1 << 28 });
    return r.status === 0 ? { ok: false, grund: "Tests bleiben grün: " + tests.join(", ") } : { ok: true };
  } finally { fs.writeFileSync(f, orig); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const nur = process.argv.slice(2); const liste = nur.length ? MUTATIONEN.filter((m) => nur.includes(m.id)) : MUTATIONEN;
  const start = Date.now(); const ziel = kopie(); let gut = 0;
  try {
    for (const m of liste) {
      const r = pruefe(ziel, m); if (r.ok) gut++;
      console.log(`${r.ok ? "entdeckt " : "ROT      "} ${m.id}  ${m.verhalten}${r.ok ? "" : "  → " + r.grund}`);
    }
  } finally { fs.rmSync(ziel, { recursive: true, force: true }); }
  console.log(`${gut}/${liste.length} entdeckt · ${((Date.now() - start) / 1000).toFixed(1)} s`);
  process.exit(gut === liste.length ? 0 : 1);
}
