import test from "node:test";
import assert from "node:assert/strict";
import { zekiNaechsteBewegung, ZEKI_ERSTES_ZEICHEN_MS, ZEKI_BLINZELN_MS, ZEKI_GESTE_MS } from "../js/screens/zeki_takt.js";

test("Zeki natürlich (Baris 26.10.2026 23:14): erstes Lebenszeichen nach ≈ 1 s, Blinzeln unregelmäßig, Gesten selten, nie Leerlauf-Zwinkern", () => {
  assert.ok(ZEKI_ERSTES_ZEICHEN_MS <= 1200);
  assert.ok(ZEKI_BLINZELN_MS[0] >= 2000 && ZEKI_BLINZELN_MS[1] <= 7000 && ZEKI_BLINZELN_MS[0] < ZEKI_BLINZELN_MS[1]);
  assert.ok(ZEKI_GESTE_MS[0] >= 10000);
  const ruhig = [0, 1, 2, 3, 4, 5].map((n) => zekiNaechsteBewegung("hilfe", n));
  assert.ok(new Set(ruhig).size >= 3, "wechselt ab");
  assert.ok(!ruhig.includes("zwinkern"), "kein Zwinkern im Leerlauf");
  for (let n = 0; n < 6; n++) assert.ok(["pruefen", "nicken"].includes(zekiNaechsteBewegung("warnung", n)));
});

test("Bildfolge: keine clip-path-Regel auf der inneren Bewegungs-SVG (27.10.2026: hob das Abschneiden auf, Nachbarbilder sichtbar)", async () => {
  const { readFileSync } = await import("node:fs");
  for (const f of ["css/zeki.css", "css/optik.css", "css/schnell.css"]) {
    const css = readFileSync(new URL("../" + f, import.meta.url), "utf8");
    assert.ok(!/\[data-zeki-teil="bewegung"\][^{]*\{[^}]*clip-path/.test(css), f);
  }
});
