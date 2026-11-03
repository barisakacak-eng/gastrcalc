// Vorab-Prüfung 03.11.2026, C3: Prüfdaten (tests/fixtures/pruefstand), Uhr 01.01.2027, Burger-Truck: Hauptzahl „bis null fehlen ≈ 7.369,85 €“,
// „Umsatz und Zähler“ zeigte „Null am 01.01.“ und einen grünen Kalender. Soll: Null-Tag und Kalender passen zur Hauptzahl.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const RealDate = Date; const JETZT = RealDate.parse("2027-01-01T22:59:00Z");
class FakeDate extends RealDate { constructor(...a) { if (a.length === 0) super(JETZT); else super(...a); } static now() { return JETZT; } }
globalThis.Date = FakeDate;
const ORT = new URL("./fixtures/pruefstand/", import.meta.url);
const datei = new Blob([fs.readFileSync(new URL("pruefstand_sicherung.zip", ORT))]);
const i18n = await import("../js/i18n.js"); i18n.setzeSprache("de");
const { idbAttrappe } = await import("./hilfe/idb_attrappe.mjs"); idbAttrappe();
const st = await import("../js/store.js"); const Z = await import("../js/zaehler.js"); const LZ = await import("../js/laden_zahlen.js");

test("C3: Burger-Truck 01.01.2027 – solange bis null etwas fehlt, ist kein Tag bis heute grün und „Null am“ liegt nicht heute", async () => {
  await st.laden(); const w = st.leereWurzel(); const imp = await st.importSicherung(datei); st.zusammenfuehren(w, imp.wurzel);
  for (const b of w.betriebe) {
    const H = "2027-01-01"; const z = Z.zaehler(b, { datum: H }); const hz = LZ.heuteZiel(b, z, H); const m = hz.m;
    if (hz.stufe !== "bisNull") continue;
    assert.ok(hz.zahl > 0, `${b.betrieb.name}: es fehlt etwas`);
    assert.notEqual(m.erreichtAm, H, `${b.betrieb.name}: „Null am“ ist nicht heute, wenn noch ${hz.zahl} € fehlen`);
    const heute = z.tage.find((x) => x.datum === H);
    assert.notEqual(Z.monatTagStatus(heute, z, m.nullAm ?? null), "ziel", `${b.betrieb.name}: heute nicht grün`);
    if (m.erreichtAm) assert.ok(m.erreichtAm > H);
    assert.equal(Z.monatTagStatus(heute, z), Z.monatTagStatus(heute, z), "alter Aufruf ohne nullAm bleibt möglich");
  }
});
