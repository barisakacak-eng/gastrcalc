// Etappe 6a: echte Texterkennung (derselbe WebAssembly-Baustein wie im Handy) auf Testfotos – Speisekarte, zweispaltige Karte,
// Stromrechnung, Großhandelsbon. Die Fotos sind künstlich „verwackelt" (schräg, unscharf, Rauschen, JPEG), keine echten Betriebsdaten.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { vorschlaegeAusText } from "../js/karte_lesen.js";
import { stelleRaten, kostenbelegLesen } from "../js/kostenbeleg.js";
import { belegZerlegen } from "../js/beleg.js";
import { besteKartenLesart } from "../js/auswertung.js";

const require = createRequire(import.meta.url);
const pfad = (p) => new URL(p, import.meta.url);
let api, M;
// wie der Arbeitsfaden im Handy: "block" = Modus 6, "karte" = Modus 6 und 3 (Spalten), bessere Lesart gewinnt
// nacheinander: alle Tests teilen sich EINE Texterkennung und dieselbe Eingabedatei
let kette = Promise.resolve();
function lesen(datei, modus) { const p = kette.then(() => lesenJetzt(datei, modus)); kette = p.catch(() => {}); return p; }
async function lesenJetzt(datei, modus) {
  if (!api) {
    M = await require("../vendor/tesseract/tesseract-core-simd-lstm.wasm.js")();
    M.FS.writeFile("deu.traineddata", readFileSync(pfad("../vendor/tesseract/deu.traineddata")));
    api = new M.TessBaseAPI(); assert.equal(api.Init(null, "deu", 1), 0);
  }
  M.FS.writeFile("/input", readFileSync(pfad("./bilder/" + datei)));
  const lauf = (psm) => { api.SetVariable("tessedit_pageseg_mode", String(psm)); assert.notEqual(api.SetImageFile(1, 0), 1); };
  lauf(6); const text = api.GetUTF8Text();
  if (modus !== "karte") return text;
  lauf(3); return besteKartenLesart(text, api.GetTSVText(0));
}
const laden = (kuechen = ["doener"], format = "imbiss") => ({ betrieb: { format, kuechen }, gerichte: [], artikel: [] });

test("Döner-Karte vom Foto: alle 8 Gerichte, mindestens 7 Preise richtig, Rezepte gefunden", async () => {
  const v = vorschlaegeAusText(await lesen("karte_foto.jpg", "karte"), laden());
  const preise = Object.fromEntries(v.map((x) => [x.name, x.preis]));
  assert.equal(v.length, 8, JSON.stringify(v.map((x) => x.name)));
  // auf diesem absichtlich schlechten Foto ist ein Preis verwischt: das Gericht kommt trotzdem, mit „Preis fehlt"
  const soll = [2, 2.5, 3.5, 5.5, 6.5, 7.5, 8, 12.9];
  const gelesen = v.map((x) => x.preis).filter((p) => p !== null);
  assert.ok(gelesen.length >= 7 && gelesen.every((p) => soll.includes(p)), JSON.stringify(gelesen));
  assert.equal(v.find((x) => /Kebab/.test(x.name)).vorlage, "Döner Kebab");
  assert.equal(v.find((x) => /Teller/.test(x.name)).vorlage, "Dönerteller");
  assert.equal(v.find((x) => /Dürüm/.test(x.name)).vorlage, "Dürüm Döner");
  assert.ok(v.find((x) => /Ayran/.test(x.name)).getraenk);
  assert.ok(Object.keys(preise).length === 8);
});

test("Zweispaltige Pizza-Karte: 8 Gerichte, Telefon und Fußzeile ignoriert", async () => {
  const v = vorschlaegeAusText(await lesen("karte2_foto.jpg", "karte"), laden(["pizza"]));
  const namen = v.map((x) => x.name).join(" | ");
  assert.ok(v.length >= 7 && v.length <= 8, namen);
  assert.ok(!/Tel|Hauptstr|Preise/.test(namen), namen);
  assert.equal(v.find((x) => /Margherita/.test(x.name))?.preis, 8.5, namen);
  assert.equal(v.find((x) => /Margherita/.test(x.name))?.vorlage, "Pizza Margherita");
  assert.equal(v.find((x) => /Lasagne/.test(x.name))?.preis, 10.9, namen);
});

test("Stromrechnung vom Foto: Kostenstelle Strom, 310,92 netto, 370,00 brutto, Datum", async () => {
  const text = await lesen("strom_foto.jpg", "block");
  assert.equal(stelleRaten(text), "strom");
  const k = kostenbelegLesen(text);
  assert.equal(k.netto, 310.92); assert.equal(k.brutto, 370); assert.equal(k.datum, "2026-10-02"); assert.equal(k.satz, 0.19);
});

test("Großhandelsbon vom Foto: Ware erkannt, Summe netto 66,30", async () => {
  const text = await lesen("bon_foto.jpg", "block");
  assert.equal(stelleRaten(text), "ware");
  const b = belegZerlegen(text, { bekannt: ["Tomaten"] });
  assert.equal(b.summeNetto, 66.3);
  assert.ok(b.zeilen.length >= 4, String(b.zeilen.length));
});

// Pilot-Karte des Kapitäns (zwei echte Handyfotos, 14.10.). Die Fotos liegen nur lokal (tests/bilder/pilot, nicht im öffentlichen Repo):
// ohne sie wird der Test übersprungen. Maßstab: Name 1:1 und Preis richtig.
import { existsSync } from "node:fs";
const PILOT = new URL("./bilder/pilot/", import.meta.url);
test("Pilot-Karte (echte Fotos): mindestens 42 von 45 Gerichten mit Name 1:1 und Preis", { skip: !existsSync(new URL("karte_seite1_app.png", PILOT)) && "Pilotfotos nur lokal" }, async () => {
  const soll = JSON.parse(readFileSync(new URL("soll.json", PILOT)));
  const norm = (s) => s.toLowerCase().replace(/[^\p{L}\d&]+/gu, " ").trim();
  let treffer = 0, gesamt = 0; const fehlt = [];
  for (const seite of ["1", "2"]) {
    const roh = await lesen(`pilot/karte_seite${seite}_app.png`, "karte"); const v = vorschlaegeAusText(roh, laden());
    for (const [n, p] of soll[seite]) { gesamt++; const h = v.find((x) => norm(x.name) === norm(n)); if (h && h.preis === p) treffer++; else fehlt.push(`${n} ${h ? h.preis : "fehlt"}`); }
  }
  assert.ok(treffer >= 42, `${treffer}/${gesamt}: ${fehlt.join(" | ")}`);
});

test.after(() => { try { api?.End(); } catch (_) {} });
