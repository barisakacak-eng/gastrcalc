import test from "node:test";
import assert from "node:assert/strict";
import { zekiNaechsteBewegung, ZEKI_TAKT_MS } from "../js/screens/zeki_takt.js";

test("Zeki lebt: alle 3–4 s eine Bewegung, bei Warnung keine fröhliche Geste (26.10.2026)", () => {
  assert.ok(ZEKI_TAKT_MS >= 3000 && ZEKI_TAKT_MS <= 4000);
  const ruhig = new Set([0, 1, 2, 3, 4].map((n) => zekiNaechsteBewegung("hilfe", n)));
  assert.ok(ruhig.size >= 3, "wechselt ab");
  for (let n = 0; n < 6; n++) assert.ok(["pruefen", "nicken"].includes(zekiNaechsteBewegung("warnung", n)));
});
