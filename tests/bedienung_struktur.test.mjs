// Gestalt der Bedienschicht: js/app.js ist nur der Einstieg, js/bedienung/ hält die Bereiche. Messung in tools/bedienung_masse.mjs.
// Maße: app.js höchstens 300 Zeilen, keine Funktion über 80 Zeilen, keine Zeile über 400 Zeichen. Dazu die Liste der behandelten data-a-Namen
// vor der Zerlegung: keiner darf verloren gehen.
import test from "node:test";
import assert from "node:assert/strict";
import { messen } from "../tools/bedienung_masse.mjs";
import { klickNamen } from "../tools/klicknamen.mjs";

const m = messen();
test("Bedienschicht: app.js hat höchstens 300 Zeilen", () => {
  assert.ok(m.appZeilen <= 300, `app.js hat ${m.appZeilen} Zeilen`);
});
test("Bedienschicht: keine Funktion über 80 Zeilen", () => {
  const zulang = m.funktionen.filter((f) => f.laenge > 80);
  assert.deepEqual(zulang, [], "zu lang: " + zulang.map((f) => `${f.datei}:${f.zeile} ${f.name} (${f.laenge})`).join(", "));
});
test("Bedienschicht: keine Zeile über 400 Zeichen", () => {
  assert.deepEqual(m.langeZeilen, []);
});
test("Bedienschicht: jeder Bereich hat seine Klick-Tabelle, und ein Name steht in genau einer", async () => {
  const { zusammenfuehren } = await import("../js/bedienung/tabellen.js");
  assert.equal(typeof zusammenfuehren, "function");
  assert.throws(() => zusammenfuehren({ a: 1 }, { a: 2 }), /doppelt/);
});
test("Bedienschicht: die behandelten data-a-Namen sind vollständig (Stand vor der Zerlegung, 88 Namen)", () => {
  const namen = new Set(klickNamen().app);
  const vorher = [
    "^g3-", "^po-", "^pr-", "^wa-", "abgleich-ok", "aktualisieren", "bearbeiten", "beispiel-anlegen", "beispiel-loeschen", "best-wa",
    "bio-einrichten", "blatt-laeden", "blatt-sprache", "blatt-zu", "branchen-ok", "diagnose-kopieren", "einrichtung-fertig-ok", "export",
    "fehler-leeren", "fehler-melden", "foto-abbrechen", "fv-uebernehmen", "hilfe-auf", "hilfe-mehr", "hinweis-status", "hm-frage",
    "hm-status", "home-installieren", "home-weg", "kl-minus", "kl-plus", "kleinunternehmer", "kuehl-blatt-oeffnen",
    "kuehl-einrichtung-oeffnen", "kuehl-keine", "kuehl-rundgang-start", "laden-loeschen", "laden-neu", "laden-wechseln", "listen-zeitraum",
    "loeschen", "menue-auf", "menue-zurueck", "minus", "modus", "monat-blatt", "muell-rueckgaengig", "muell-tipp", "muell-weg-damit",
    "muell1-nachtragen", "muell1-zurueck", "nav", "passwort-zeigen", "pin-bio", "pin-entfernen", "pin-setzen", "pin-taste", "pin-weg",
    "plus", "pp-ansicht", "re:(^|-)zu$", "re:^kuehl-einrichtung|^pp-", "rechtsform", "rettung-neu", "rettung-ok", "rettung-pruefen",
    "rettung-start", "rezept-direkt", "s2-kuehl", "schloss", "schwund-storno", "sicherung-einlesen", "sicherung-fotos-schalter",
    "sicherung-ohne", "sicherung-ort", "sicherung-pw-schalter", "sicherung-teilen", "sicherung-zurueckholen", "sprache", "tag-datum",
    "testphase-code", "ul-team-plus", "vergleich-modus", "waage-vorschlag", "weiter", "zeki-erst-wieder", "zeki-log-loeschen", "zurueck",
  ];
  const fehlen = vorher.filter((n) => !namen.has(n));
  assert.deepEqual(fehlen, [], "diese Namen behandelt die Bedienschicht nicht mehr: " + fehlen.join(", "));
});
