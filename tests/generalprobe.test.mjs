// Generalprobe P5 (30.10.2026): 14 Geschäftstage (19.12.2026 bis 01.01.2027), zwei Läden auf einem Handy, Monats- und Jahreswechsel, Sicherung und zweites Profil.
// Läuft in deutscher Zeit (wie der Laden) – unabhängig von der Zeitzone des Testrechners. Details und Setzungen: tests/hilfe/generalprobe.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("Generalprobe: 14 Tage × 2 Läden, 0 Befunde der Klassen A–C (A falsche Zahl/Datenverlust, B Ablauf, C Lücke; D Schönheit wird nur gemeldet)", { timeout: 180000 }, () => {
  const r = spawnSync(process.execPath, [fileURLToPath(new URL("./hilfe/generalprobe.mjs", import.meta.url)), "--leise"], { env: { ...process.env, TZ: "Europe/Berlin" }, encoding: "utf8", timeout: 170000 });
  const zus = (r.stdout || "").split("\n").filter((z) => /Zusammenfassung|^Klasse|^\[(A|B|C|D)\]/.test(z)).join("\n");
  assert.equal(r.status, 0, zus || r.stderr);
});
