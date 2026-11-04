// Welle 3 W3b (04.11.2026): Arbeitszeit-Liste, Sitz der Krankenkasse, Monat abschließen – Rechenteil (Oberfläche live nach Baris' Ja 04.11.2026).
import { test } from "node:test";
import assert from "node:assert/strict";
const i18n = await import("../js/i18n.js"); i18n.setzeSprache("de");
const S = await import("../js/store.js");
const { teamTagSetzen } = await import("../js/stamm.js");
const { arbeitszeitListe } = await import("../js/schichten.js");
const { svLandSetzen, termineLaden } = await import("../js/welle3.js");
const { paketDokument } = await import("../js/ordner_text.js");
const { monatsPaket } = await import("../js/export_steuer.js");

test("W3b Arbeitszeit-Liste: Zeile je Eintrag, ohne Zeiten und nach dem 7. Tag markiert", () => {
  const b = S.leererBetrieb(); b.personen = [{ id: "a", kuerzel: "AB", name: "AB" }];
  teamTagSetzen(b, "2026-12-27", [{ person: "a", name: "AB", stunden: 9, satz: 14, von: "18:00", bis: "03:00" }]);
  b.teamTage[0].erfasst = "2026-12-28T09:00:00.000Z";
  teamTagSetzen(b, "2026-12-01", [{ person: "a", name: "AB", stunden: 6, satz: 14 }]); b.teamTage[1].erfasst = "2026-12-10T09:00:00.000Z";
  const l = arbeitszeitListe(b, "2026-12-01", "2026-12-31");
  assert.equal(l.zeilen.length, 2); assert.deepEqual(l.zeilen[1], { datum: "2026-12-27", wer: "AB", von: "18:00", bis: "03:00", stunden: 9, erfasst: "2026-12-28", rechtzeitig: true, kompakt: false });
  assert.equal(l.zeilen[0].rechtzeitig, false, "01.12. erst am 10.12. erfasst (> 7 Tage)"); assert.equal(l.ohneZeiten, 1); assert.equal(l.spaet, 1); assert.equal(l.vollstaendig, false);
});
test("W3b Buchhalter-Ordner: Abschnitt Arbeitszeiten (Schalter seit Baris' Ja entfernt)", () => {
  const b = S.leererBetrieb(); b.personen = [{ id: "a", kuerzel: "AB" }]; teamTagSetzen(b, "2026-11-03", [{ person: "a", name: "AB", stunden: 8, satz: 14, von: "10:00", bis: "18:00" }]);
  const p = monatsPaket(b, { von: "2026-11-01", bis: "2026-11-30" }, "buch");
  const d = paketDokument(b, p);
  const a = d.abschnitte.find((x) => x.titel === i18n.t("w3b.az.titel")); assert.ok(a); assert.deepEqual(a.zeilen[0].zellen.slice(1, 4), ["AB", "10:00", "18:00"]);
});
test("W3b Sitz der Krankenkasse: SV-Termin Mai 2027 – NI 27.05., BW 26.05., unbekannt 26.05.", () => {
  const b = S.leererBetrieb(); b.personen = [{ id: "a", kuerzel: "AB" }]; b.betrieb.ustRhythmus = "monat";
  const mai = () => termineLaden(b, "2027-05-01", 40).find((x) => x.art === "sv" && x.zeitraum === "2027-05").datum;
  assert.equal(mai(), "2027-05-26"); svLandSetzen(b, "NI"); assert.equal(mai(), "2027-05-27"); svLandSetzen(b, "BW"); assert.equal(mai(), "2027-05-26");
  svLandSetzen(b, "XX"); assert.equal(b.betrieb.svLand, null);
});
test("W3b Schicht im Büro eintragen: eigenes Journal, gleiche Person/Tag ersetzt, ungültig → null, Liste vereint", async () => {
  const { schichtEintragen } = await import("../js/schichten.js");
  const b = S.leererBetrieb(); b.personen = [{ id: "a", kuerzel: "AB" }];
  assert.equal(schichtEintragen(b, { datum: "2026-11-03", person: "a", von: "10:00", bis: "" }), null);
  assert.equal(schichtEintragen(b, { datum: "2026-11-03", person: "zz", von: "10:00", bis: "18:00" }), null);
  const e1 = schichtEintragen(b, { datum: "2026-11-03", person: "a", von: "10:00", bis: "18:00", jetzt: "2026-11-03T19:00:00.000Z" }); assert.ok(e1);
  schichtEintragen(b, { datum: "2026-11-03", person: "a", von: "11:00", bis: "19:30", jetzt: "2026-11-03T20:00:00.000Z" });
  assert.equal(b.schichten.filter((x) => !x.storniert).length, 1); assert.equal(b.schichten.length, 2, "alter Eintrag bleibt storniert erhalten");
  const l = arbeitszeitListe(b, "2026-11-01", "2026-11-30"); assert.equal(l.zeilen.length, 1); assert.equal(l.zeilen[0].von, "11:00"); assert.equal(l.zeilen[0].stunden, 8.5);
  assert.equal((b.teamTage || []).length, 0, "Lohnkosten aus „Mitarbeiter heute“ bleiben unberührt");
});
