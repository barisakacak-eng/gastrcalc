// Mitmach-Rundgang, Welle 0 (28.10.2026, Konzept 7.3 und 7.4): Rezept-Erinnerung auf Heute und entschlackte Laden-Karte.
import test from "node:test";
import assert from "node:assert/strict";
globalThis.document ??= { documentElement: {} };
import { leererBetrieb } from "../js/store.js";
import { rezeptFortschritt, naechstesRezept, hatEigenesRezept, familieAnpassen } from "../js/rezept_quelle.js";
import { startView } from "../js/screens/home.js";
import { karteLadenView, karteLadenAktion, karteLadenZuruecksetzen } from "../js/screens/karte_laden.js";
import { rezeptDirektOeffnen, rezepte, karteZuruecksetzen } from "../js/screens/karte.js";
import { navKontext } from "../js/screens/nav.js";
import { setzeSprache, t } from "../js/i18n.js";
setzeSprache("de");

const wurzelVon = (s) => ({ betriebe: [s], letzteSicherung: new Date().toISOString(), sicherungZaehler: 0 });
const text = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
function laden() {
  const s = leererBetrieb(); s.phase = "app"; s.betrieb.name = "Test";
  s.gerichte = [
    { id: "a", name: "Döner", klasse: "haupt", vorlage: true, preis: 7.5, steuer: 0.07, mengeTag: 40, zutaten: [{ name: "Dönerspieß Kalb/Pute", menge: 150, einheit: "g" }, { name: "Dönerbrot / Fladen", menge: 1, einheit: "stk" }] },
    { id: "b", name: "Dürüm", klasse: "haupt", vorlage: true, preis: 8, steuer: 0.07, mengeTag: 10, zutaten: [{ name: "Dönerspieß Kalb/Pute", menge: 140, einheit: "g" }] },
    { id: "c", name: "Ayran", klasse: "getraenk", preis: 2, steuer: 0.19, zutaten: [] },
  ];
  return s;
}

test("Fortschritt: Getränke zählen nicht, geschätzt ist kein eigenes Rezept, das meistverkaufte kommt zuerst", () => {
  const s = laden();
  assert.deepEqual(rezeptFortschritt(s), { mit: 0, gesamt: 2, rennerFertig: false });
  assert.equal(naechstesRezept(s).id, "a");
  familieAnpassen(s, { gerichtId: "a", zutat: "Dönerspieß Kalb/Pute", wert: 160 });
  assert.ok(hatEigenesRezept(s.gerichte[0]) && hatEigenesRezept(s.gerichte[1]), "die Familie lernt mit (abgeleitet zählt als eigen)");
  assert.deepEqual(rezeptFortschritt(s), { mit: 2, gesamt: 2, rennerFertig: true });
  assert.equal(naechstesRezept(s), null);
});

test("Heute: ohne eigenes Rezept steht Zekis feste Frage mit „Jetzt“ statt der Jetzt-dran-Karte, danach nicht mehr", () => {
  const s = laden(); const w = wurzelVon(s); navKontext(s, w);
  const html = startView(s, { wurzel: w });
  assert.ok(text(html).includes(t("heute.rezeptErinnerung.frage")));
  assert.equal((html.match(/data-a="rezept-direkt"/g) || []).length, 2, "Satz und Knopf führen direkt zur Mengenfrage");
  assert.match(html, /class="zeki-zeile h-rezept-text/, "steht als Zekis Satz oben (ersetzt das Logo, kommt nicht dazu)");
  assert.equal((html.match(/class="jetzt h-jetzt/g) || []).length, 1, "nur eine Haupthandlung");
  familieAnpassen(s, { gerichtId: "a", zutat: "Dönerspieß Kalb/Pute", wert: 160 });
  assert.ok(!startView(s, { wurzel: w }).includes("rezept-direkt"), "erstes eigenes Rezept: Erinnerung weg");
  // ohne Gerichte keine Erinnerung (dann fehlt erst die Karte)
  const leer = laden(); leer.gerichte = []; assert.ok(!startView(leer, { wurzel: wurzelVon(leer) }).includes("rezept-direkt"));
});

test("Heute: der Satz „x von y“ hat höchstens 15 Wörter, die Frage auch", () => {
  const w = (x) => x.split(/\s+/).filter((y) => /\p{L}/u.test(y)).length;
  assert.ok(w(t("heute.rezeptErinnerung.frage")) <= 15); assert.equal(t("heute.rezeptErinnerung.stand", 3, 12), "3 von 12 Gerichten haben dein Rezept.");
});

test("Laden-Karte: eine Zeile je Gericht, Punkt grün/kupfer, Tipp aufs Gericht öffnet die Mengenfrage", () => {
  const s = laden(); navKontext(s, wurzelVon(s)); karteLadenZuruecksetzen();
  let html = karteLadenView(s);
  assert.equal((html.match(/class="kl-gericht kl-zeile/g) || []).length, 3);
  assert.equal((html.match(/kl-quelle geschaetzt/g) || []).length, 2); assert.equal((html.match(/kl-quelle eigen/g) || []).length, 0);
  for (const weg of ["Wareneinsatz", "Rezept", "Selbstkosten", "Bei Zutaten"]) assert.ok(!text(html).includes(weg), weg);
  assert.deepEqual(karteLadenAktion("kl-rezept", { dataset: { id: "a" } }, s), { rezept: "a" });
  assert.equal(karteLadenAktion("kl-rezept", { dataset: { id: "c" } }, s), true, "Getränk: gleich das Preis-Blatt");
  karteLadenZuruecksetzen();
  familieAnpassen(s, { gerichtId: "a", zutat: "Dönerspieß Kalb/Pute", wert: 160 });
  html = karteLadenView(s); assert.equal((html.match(/kl-quelle eigen/g) || []).length, 2);
});

test("Laden-Karte: Rot aus geschätztem Rezept zeigt „≈ prüfen: abwiegen“, kein Minus und nicht „zu billig“", () => {
  const s = laden();
  s.kosten = [{ id: "k", kategorie: "miete", posten: "miete", betrag: 9000, status: "bekannt", periode: "monat", basis: "netto" }];
  s.team = { personen: 1, stundenProPerson: 160, lohnkosten: 9000, eigenerLohn: 0, eigenerLohnStatus: "eigen" };
  s.artikel = [{ name: "Dönerspieß Kalb/Pute", gruppe: "fleisch", einheit: "kg", packung: { menge: 1, einheit: "kg" }, preis: 12, preisBasis: "netto", benutzt: true },
    { name: "Dönerbrot / Fladen", gruppe: "teig", einheit: "stk", packung: { menge: 1, einheit: "stk" }, preis: 0.4, preisBasis: "netto", benutzt: true }];
  navKontext(s, wurzelVon(s)); karteLadenZuruecksetzen();
  const html = karteLadenView(s);
  assert.ok(html.includes(t("karte.kurz.pruefen")), "≈ prüfen: abwiegen");
  assert.ok(!/class="kl-gericht kl-zeile a-rot/.test(html), "keine rote Zeile");
  assert.ok(!/Minus|−\s?\d/.test(text(html)), "kein Minus");
  assert.ok(!html.includes('data-wert="billig"'), "nichts „zu billig“");
  assert.ok(text(html).includes(t("karte.kurz.zekiPruefen", "Döner")), "Zekis Karten-Satz sagt es auch");
});

test("Direkt zur Mengenfrage: eine Frage, danach zurück in die App mit Meldung", () => {
  const s = laden(); karteZuruecksetzen();
  assert.equal(rezeptDirektOeffnen(s, "a", { max: 1 }), true);
  assert.match(rezepte.view(s), /waage|Wie viel/);
  const ctx = { gemeldet: [], weiter: 0, meldung(x) { this.gemeldet.push(x); }, weiterGehen() {} };
  ctx.weiter = function () { this.weiterZahl = (this.weiterZahl || 0) + 1; };
  assert.equal(rezepte.aktion("waage-ok", { dataset: {} }, s, ctx), true);
  assert.equal(ctx.weiterZahl, 1, "zurück in die App"); assert.equal(ctx.gemeldet.length, 1);
  assert.ok(hatEigenesRezept(s.gerichte[0]));
  karteZuruecksetzen();
});
