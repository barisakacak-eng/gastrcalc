// Lauf 4 (11.11.2026): offene C-Funde des Prüfungsausschusses 09.11.2026 – je Fund erst nachgestellt (Test rot), dann behoben.
import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { leererBetrieb } from "../js/store.js";

const text = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
function laden(extra = {}) { const s = leererBetrieb(); s.betrieb = { name: "T", format: "imbiss", ustRhythmus: "monat", rechtsform: "einzel", ...extra }; s.personen = [{ id: "p", kuerzel: "AB", aktiv: true }]; return s; }
async function geld3Text(s, jetzt) {
  mock.timers.enable({ apis: ["Date"], now: jetzt });
  try { const g = await import("../js/screens/geld3.js"); const html = g.geld3View(s); return text(html.match(/data-g3="termine"[\s\S]*?<\/details>/)[0]); } finally { mock.timers.reset(); }
}

// P3 C1: Termine-Karte zeigte nur 4 Zeilen – USt 10.02. und SV 24.02. fehlten (Uhr 01.01.2027, monatlich, mit Personal)
test("P3 C1: Termine-Karte zeigt alle Termine der nächsten 60 Tage, nicht nur 4", async () => {
  const t = await geld3Text(laden(), new Date(2027, 0, 1, 20, 0));
  for (const d of ["11.01.", "27.01.", "10.02.", "24.02."]) assert.ok(t.includes(d), `${d} fehlt: ${t.slice(0, 300)}`);
  assert.ok((t.match(/USt-Voranmeldung/g) || []).length >= 2, "USt Januar und Februar");
});

// P3 C2: Beitragsnachweis (Goldwert 25.01.2027) fehlte – nur „Sozialversicherung 27.01.“
test("P3 C2: SV-Zeile nennt den Beitragsnachweis zwei Bankarbeitstage vorher", async () => {
  const t = await geld3Text(laden(), new Date(2027, 0, 1, 20, 0));
  assert.match(t, /Beitragsnachweis 25\.01\./);
});

// P3 C3: Ohne Rhythmus fehlte die USt-Zeile ganz, ohne Hinweis
test("P3 C3: ohne Rhythmus steht die USt-Zeile mit „Rhythmus wählen“", async () => {
  const t = await geld3Text(laden({ ustRhythmus: null }), new Date(2027, 0, 1, 20, 0));
  assert.match(t, /USt-Voranmeldung Rhythmus wählen/);
});

// P3 C4 / P1 C5: „Arbeitszeiten“ stand nur in Vorschau/PDF, keine Zeile und keine CSV im Buchhalter-Ordner; „legst du selbst dazu“ nannte sie doppelt
test("P3 C4: Buchhalter-Ordner hat Teil „Arbeitszeiten“ mit Zeile und CSV, Beilagen nennen sie nicht mehr", async () => {
  const { monatsPaket } = await import("../js/export_steuer.js");
  const O = await import("../js/ordner_text.js");
  const s = laden(); s.schichten = [{ id: "x1", datum: "2026-12-20", person: "p", von: "16:00", bis: "02:00", erfasst: "2026-12-20T23:00:00.000Z" }];
  const p = monatsPaket(s, { von: "2026-12-01", bis: "2026-12-31" }, "buch");
  assert.ok(p.teile.includes("arbeitszeiten"));
  assert.match(O.paketUnter("arbeitszeiten", p), /1/);
  mock.timers.enable({ apis: ["Date"], now: new Date(2027, 0, 1, 20, 0) });
  try {
    const csv = O.csvDateien(s, "ordner-buch", "arbeitszeiten", {});
    assert.equal(csv.length, 1); assert.match(csv[0].text, /16:00/); assert.match(csv[0].text, /02:00/);
  } finally { mock.timers.reset(); }
  assert.ok(!O.BEILAGEN.buch.includes("arbeitszeiten"), "nicht doppelt bei „legst du selbst dazu“");
});

// P3 C5/C6: Versprechen und fehlende Vorbehalte in Texten
test("P3 C5/C6: kein „Daten bleiben sicher“, Belehrung „in der Regel“, Arbeitszeit-Hinweis mit Steuerberater-Satz, Pauschbetrag mit Quelle", async () => {
  const fs = await import("node:fs");
  for (const f of fs.readdirSync("js/lang")) { const s = fs.readFileSync("js/lang/" + f, "utf8");
    assert.doesNotMatch(s, /bleiben deine Daten sicher|data stays safe|verilerin güvende kalır|تبقى بياناتك آمنة/, f);
    assert.match(s, /pausch: \(p\) => `[^`]*\$\{p\} \(BMF 23\.12\.2025\)/, f); }
  const de = fs.readFileSync("js/lang/de.js", "utf8");
  assert.match(de, /az: \{ titel: "Arbeitszeiten", info: "[^"]*Mit deinem Steuerberater klären\."/);
  const { HINWEISE } = await import("../js/hinweis.js"); assert.match(HINWEISE.find((h) => h.id === "belehrung").satz, /in der Regel Betriebsausgaben/);
});
