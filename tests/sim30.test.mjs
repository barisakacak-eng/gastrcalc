// 30-Tage-Simulation (Tester-Schwadron 18.10.2026) als Regressionstest: ein Dönerladen, 30 Geschäftstage, Invarianten je Tag.
// Läuft in deutscher Zeit (wie der Laden) – unabhängig von der Zeitzone des Testrechners.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("30-Tage-Simulation: 0 Befunde, 0 Fehlmengen", { timeout: 120000 }, () => {
  const r = spawnSync(process.execPath, [fileURLToPath(new URL("./hilfe/sim30.mjs", import.meta.url)), "--leise"], { env: { ...process.env, TZ: "Europe/Berlin" }, encoding: "utf8" });
  const zus = (r.stdout || "").split("\n").filter((z) => /Zusammenfassung|^\[(hoch|mittel|niedrig)\]/.test(z)).join("\n");
  assert.equal(r.status, 0, zus || r.stderr);
});
