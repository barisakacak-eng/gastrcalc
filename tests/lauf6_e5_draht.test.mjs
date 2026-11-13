// Lauf 6, Etappe 5 – Draht (13.11.2026): Verdrahtung der neuen Fähigkeiten des Rechenwerks in der Oberfläche. Ein Abschnitt je Punkt.
import { test } from "node:test";
import assert from "node:assert/strict";
import { idbAttrappe } from "./hilfe/idb_attrappe.mjs";
const st = await import("../js/store.js");
const af = await import("../js/abgleich_felder.js");
const stamm = await import("../js/stamm.js");
const w3 = await import("../js/welle3.js");
const { beispielLaden } = await import("../js/beispiel.js");
const l6y = await import("../js/data/l6y_texte.js");

const J = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
const laden = (id = "L1") => { const b = st.leererBetrieb(); b.id = id; b.phase = "app"; b.betrieb.name = "Nord"; return b; };
const wurzelMit = (...laeden) => { const w = st.leereWurzel(); w.betriebe = laeden; w.aktiv = laeden[0]?.id ?? null; return w; };

// ---------- 2: Kostenposten-Verlauf übersteht Laden, Sicherung, Einlesen ----------
test("Draht 2: Kostenposten-verlauf bleibt bei migrierenBetrieb, Sicherung und Einlesen erhalten (Rundreise), Ungültiges fliegt raus", async () => {
  idbAttrappe(); await st.laden();
  const b = laden(); const verlauf = [{ ab: "", wert: 900 }, { ab: "2026-09", wert: 1000 }];
  b.kosten.push({ id: "k1", kategorie: "fix", posten: "Miete", betrag: 1000, status: "bekannt", periode: "monat", basis: "netto", verlauf: J(verlauf) });
  assert.deepEqual(st.migrierenBetrieb(J(b)).kosten[0].verlauf, verlauf, "migrierenBetrieb");
  const w = wurzelMit(b);
  const { blob } = await st.exportDatei(w);
  const r = await st.importSicherung(blob);
  assert.deepEqual(r.wurzel.betriebe[0].kosten[0].verlauf, verlauf, "Sicherung → Einlesen");
  const z = st.zusammenfuehren(wurzelMit(laden("L2")), r.wurzel);
  assert.deepEqual(r.wurzel.betriebe[0].kosten[0].verlauf, verlauf);
  assert.ok(z, "zusammenführen");
  const c = laden(); c.kosten.push({ id: "k2", kategorie: "fix", posten: "Strom", betrag: 100, status: "bekannt", verlauf: [{ ab: "2026-09", wert: 90 }, { ab: "kaputt", wert: 1 }, { ab: "2026-10", wert: "x" }, null, { ab: "2026-10", wert: -5 }] },
    { id: "k3", kategorie: "fix", posten: "Gas", betrag: 100, status: "bekannt", verlauf: "nix" });
  const m = st.migrierenBetrieb(J(c));
  assert.deepEqual(m.kosten[0].verlauf, [{ ab: "2026-09", wert: 90 }], "nur gültige Einträge");
  assert.equal("verlauf" in m.kosten[1], false, "ungültiges Feld fällt weg");
});
