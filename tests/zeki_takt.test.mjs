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
  for (let n = 0; n < 6; n++) assert.ok(["nachdenken", "nicken"].includes(zekiNaechsteBewegung("warnung", n)), "bei Warnung nur ernste Gesten");
  for (let n = 0; n < 8; n++) assert.notEqual(zekiNaechsteBewegung("hilfe", n), zekiNaechsteBewegung("hilfe", n + 1), "nie zweimal dieselbe");
});

test("Bildfolge: keine clip-path-Regel auf der inneren Bewegungs-SVG (27.10.2026: hob das Abschneiden auf, Nachbarbilder sichtbar)", async () => {
  const { readFileSync } = await import("node:fs");
  for (const f of ["css/zeki.css", "css/optik.css", "css/schnell.css"]) {
    const css = readFileSync(new URL("../" + f, import.meta.url), "utf8");
    assert.ok(!/\[data-zeki-teil="bewegung"\][^{]*\{[^}]*clip-path/.test(css), f);
  }
});

test("Zeki als Gliederpuppe (28.10.2026): jede Takt-Geste und jede alte Bildfolge hat eine Gelenk-Bewegung", async () => {
  const { BEWEGUNGEN, zekiPuppeName, GELENKE } = await import("../js/zeki-puppe.js");
  for (let n = 0; n < 10; n++) for (const z of ["hilfe", "warnung"]) assert.ok(zekiPuppeName(zekiNaechsteBewegung(z, n)), z + n);
  for (const alt of ["hand", "nicken", "kopfschuetteln", "pruefen", "preis", "grinsen", "zwinkern"]) assert.ok(zekiPuppeName(alt), alt);
  for (const b of ["auftreten", "abgehen", "zeigen-links", "zeigen-rechts", "zeigen-oben", "zeigen-unten", "winken", "nachdenken"]) assert.ok(BEWEGUNGEN[b], b);
  for (const [name, b] of Object.entries(BEWEGUNGEN)) {
    assert.ok(b.dauer > 0 && b.dauer <= 3000, name + " dauert höchstens 3 s");
    for (const id of Object.keys(b.teile)) assert.ok(GELENKE[id.replace(/-bild$/, "")], name + ": Gelenk für " + id);
  }
  assert.ok(!["freude"].includes(BEWEGUNGEN.kopfschuetteln.mimik), "Kopfschütteln nicht fröhlich");
});
