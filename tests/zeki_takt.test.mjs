import test from "node:test";
import assert from "node:assert/strict";
import { zekiNaechsteBewegung, ZEKI_ERSTES_ZEICHEN_MS, ZEKI_BLINZELN_MS, ZEKI_GESTE_MS } from "../js/screens/zeki_takt.js";

test("Zeki natürlich (Baris 26.10.2026 23:14): erstes Lebenszeichen nach ≈ 1 s, Blinzeln unregelmäßig, Gesten selten, nie Leerlauf-Zwinkern", () => {
  // Von Hand begründet: Baris wollte das erste Lebenszeichen „nach etwa einer Sekunde“ – das sind 1000 ms.
  assert.equal(ZEKI_ERSTES_ZEICHEN_MS, 1000);
  assert.equal(ZEKI_BLINZELN_MS.length, 2, "Blinzeln hat eine Spanne von … bis …");
  assert.ok(ZEKI_BLINZELN_MS[0] >= 2000 && ZEKI_BLINZELN_MS[1] <= 7000 && ZEKI_BLINZELN_MS[0] < ZEKI_BLINZELN_MS[1]);
  assert.ok(ZEKI_GESTE_MS[0] >= 10000);
  assert.ok(ZEKI_GESTE_MS[0] > ZEKI_BLINZELN_MS[1], "Gesten sind seltener als Blinzeln");

  const ruhig = [0, 1, 2, 3, 4, 5].map((n) => zekiNaechsteBewegung("hilfe", n));
  assert.ok(new Set(ruhig).size >= 3, "wechselt ab");
  assert.ok(!ruhig.includes("zwinkern"), "kein Zwinkern im Leerlauf");

  // Die Folge wiederholt sich (Länge = Zahl der verschiedenen Gesten), auch rückwärts gezählt: Schritt −1 ist der letzte der Folge.
  const lang = Array.from({ length: 30 }, (_, n) => zekiNaechsteBewegung("hilfe", n));
  const laenge = new Set(lang).size;
  assert.equal(zekiNaechsteBewegung("hilfe", laenge), zekiNaechsteBewegung("hilfe", 0), "Folge beginnt nach einem Durchlauf von vorn");
  assert.equal(zekiNaechsteBewegung("hilfe", -1), zekiNaechsteBewegung("hilfe", laenge - 1), "negative Schritte stürzen nicht ab");

  // Bei Warnung/Fehler nur ernste Gesten (Maskottchen-Regel 23.10.2026): genau diese zwei, beide kommen vor.
  for (const z of ["warnung", "fehler"]) {
    const ernst = Array.from({ length: 10 }, (_, n) => zekiNaechsteBewegung(z, n));
    assert.deepEqual([...new Set(ernst)].sort(), ["nachdenken", "nicken"], z);
  }
  for (let n = 0; n < 8; n++) assert.notEqual(zekiNaechsteBewegung("hilfe", n), zekiNaechsteBewegung("hilfe", n + 1), "nie zweimal dieselbe");
});
