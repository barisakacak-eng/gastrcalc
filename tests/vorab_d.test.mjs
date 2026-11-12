// Vorab-Prüfung 03.11.2026, Klasse D (04.11.2026): Sprach- und Bildreste, die sich ohne Browser prüfen lassen.
import { test } from "node:test";
import assert from "node:assert/strict";
import { leererBetrieb } from "../js/store.js";
import { personalView, schichtPersonSetzen } from "../js/screens/personal.js";
import { einstellungenView } from "../js/screens/home.js";
const { wareBildQuelle } = await import("../js/bilder.js");
const { sym } = await import("../js/symbole.js");
const i18n = await import("../js/i18n.js");

test("D tr: kein Ketchup-Foto für Kräutersauce (Otlu sos) und Pizzasoße; andere Soßen wie bisher", () => {
  for (const name of ["Kräutersauce", "Pizzasoße", "Tomatensauce"]) assert.notEqual(wareBildQuelle({ name, gruppe: "ware" }).foto, "r-ketchup-mayo", name);
  assert.equal(wareBildQuelle({ name: "Cocktailsauce", gruppe: "ware" }).foto, "r-ketchup-mayo");
  assert.equal(wareBildQuelle({ name: "Knoblauchsauce", gruppe: "ware" }).foto, "r-knoblauchsauce");
});
test("D ar: Richtungs-Pfeile tragen die Klasse „richtung“ (in RTL gespiegelt), andere Symbole nicht", () => {
  for (const n of ["chevron-right", "chevron-left"]) assert.match(sym(n), /class="sym richtung/);
  assert.doesNotMatch(sym("x"), /richtung/);
  // Die Spiegel-Regel im Stylesheet prüft tests/quelltext_waechter_teil2.mjs (css-Ordner).
});
// alle Texte einer Sprachtabelle (Zeichenketten und Rückgaben der Textfunktionen)
const texte = (o) => Object.values(o).flatMap((v) => (typeof v === "string" ? [v] : typeof v === "function" ? (() => { try { return [String(v("Döner Kebab", 3, 2))]; } catch { return []; } })() : v && typeof v === "object" ? texte(v) : []));
test("D tr/ar: keine deutschen Anführungszeichen „…“ in Texten; tr “…”, ar «…»", async () => {
  await i18n.ladeSprache("tr"); await i18n.ladeSprache("ar");
  const tr = texte((await import("../js/lang/tr.js")).default); assert.ok(tr.length > 100);
  for (const x of tr) assert.doesNotMatch(x, /„/, x);
  const ar = texte((await import("../js/lang/ar.js")).default); assert.ok(ar.length > 100);
  for (const x of ar) assert.doesNotMatch(x, /„[^“\n]*[؀-ۿ$][^“\n]*“/, x);
});
test("D tr: Zeki-Blatt-Knopf kommt aus der Sprachdatei (tr „Tamam“)", async () => {
  await i18n.ladeSprache("tr"); i18n.setzeSprache("tr"); assert.equal(i18n.t("allgemein.ok"), "Tamam");
  assert.ok(i18n.t("teamTag.stdZusammen").includes(" "), "„sa. toplam“ bricht nicht um"); i18n.setzeSprache("de"); assert.equal(i18n.t("allgemein.ok"), "OK");
  // „kein festes OK im Zeki-Blatt (ebene.js)“: tests/quelltext_waechter_teil2.mjs
});
test("D: Personal-Kopf ohne Namen zeigt kein „?“-Rund; Fassung in der Versionszeile isoliert (bdi ltr)", () => {
  const s = leererBetrieb(); s.phase = "app";
  const ohne = personalView(s); assert.ok(ohne.includes("personalkopf") && !ohne.includes('class="avatar"') && !ohne.includes(">?<"), "ohne Namen kein Rund");
  s.personen = [{ id: "p1", kuerzel: "Ayşe", aktiv: true }]; schichtPersonSetzen(s, "p1");
  assert.ok(personalView(s).includes('<span class="avatar">A</span>'), "mit Namen der Anfangsbuchstabe");
  const w = { betriebe: [s], aktiv: s.id };
  assert.ok(einstellungenView(s, 0, w, { fassung: "1.2.3" }).includes('<bdi dir="ltr" class="fassung-nr">1.2.3</bdi>'));
});
