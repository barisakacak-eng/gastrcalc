// Welle 2, Entwickler H: Amt-Druck wird mit deutschen Texten gebaut (Nachtrag grau mit *, Rücknahmen, Müll, Seitenzahlen, ehrlicher Fußtext).
import test from "node:test";
import assert from "node:assert/strict";
import { leererBetrieb } from "../js/store.js";
import * as E from "../js/engine.js";
import * as A from "../js/export_amt.js";
import * as P from "../js/putzplan.js";

test("Amt-Dokument: Nachtrag, Maßnahme offen, verspätet, Rücknahmen, Müll, Ausgeschiedene", async () => {
  const i18n = await import("../js/i18n.js");
  if (i18n.spracheSetzen) await i18n.spracheSetzen("de"); else if (i18n.setzeSprache) await i18n.setzeSprache("de");
  const { amtDokument } = await import("../js/ordner_text.js"); // Trennung 2 (17.10.2026)
  const s = leererBetrieb(); s.phase = "app"; s.betrieb.name = "Döner Test";
  s.kuehl = { takt: 1, ruhetage: [], eingerichtet: true, seit: "2026-09-01" };
  s.kuehlstellen = [{ id: "k", name: "Theke", art: "kuehl", min: null, max: null, reihe: 0, archiviert: false }];
  s.personen = [{ id: "a", kuerzel: "AK", aktiv: true, entfernt: false }, { id: "b", kuerzel: "MZ", aktiv: false, entfernt: true, ausgeschieden: "2026-10-03" }];
  const m = (datum, uhr, wert, extra = {}) => s.messungen.push({ id: `m${datum}${uhr}`, stelle: "k", datum, zeit: uhr ? `${datum}T${uhr}:00` : null, wert, min: null, max: 7, abweichung: wert > 7, massnahmen: [], nachkontrolle: null, von: "a", nacherfasst: false, storniert: false, ...extra });
  m("2026-10-01", "09:00", 4, { von: "b" }); m("2026-10-02", "09:05", 11, { massnahmen: ["tuer"], nachkontrolle: { art: "h2", faellig: "2026-10-02T11:05:00" } });
  m("2026-10-03", "09:05", 4); m("2026-10-04", null, 4.5, { nacherfasst: true, erfasst: "2026-10-05T10:20:00" }); m("2026-10-05", "09:00", 9.5, { massnahmen: ["chef"] });
  s.putzplan = { aktiv: true, geraete: ["kuehlschrank"], aus: [], seit: "2026-10-01" };
  const id = P.aufgabenFuer(s.putzplan).find((a) => a.takt === "tag").id; P.abhaken(s, id, { datum: "2026-10-01", von: "a" }); P.zuruecknehmen(s, id, "2026-10-01", { von: "a" });
  s.schwund.push({ id: "w", datum: "2026-10-02", art: "verderb", vorgang: 1, ref: { typ: "frei", name: "Hack" }, menge: 2, einheit: "kg", grund: "Theke", wert: 12, quelle: "kuehl", storniert: false });
  const z = A.zeitraumFuer("monat", { datum: "2026-10-06" });
  const dok = amtDokument(s, A.ordnerAmt(s, z, { datum: "2026-10-06" }));
  const html = A.druckHtml(dok);
  for (const text of ["Nachgetragen am", "04.10.2026 *", "05.10.2026 10:20", "Maßnahme offen", "Nachkontrolle verspätet (nach 24 Std.)", "Zurückgenommen / geändert", "Weggeworfene Ware", "MZ (ausgeschieden am 03.10.2026)",
    "Geräte und Grenzen", "counter(pages)", "Diese Liste ersetzt kein HACCP-Konzept", 'class="nach"', 'class="spaet"'])
    assert.ok(html.includes(text), "fehlt: " + text);
  assert.ok(!html.includes("nie gelöscht"));
  assert.ok(!/12,00|12 €/.test(html.split("Weggeworfene Ware")[1].split("</section>")[0]), "kein Euro im Müll-Abschnitt");
  assert.ok(!E.GRENZEN_WARE.hack);
});
