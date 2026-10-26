import test from "node:test";
import assert from "node:assert/strict";
import { ZEKI_FRAGEN, zekiFragenFuer } from "../js/data/zeki_fragen.js";

const VERBOTEN = /revolution|disruptiv|marktführer|gobd|betriebsprüfungsfest|steuersicher|rechtssicher|zertifiziert|lückenlos|haccp-konform/i;
test("Frag Zeki: geprüfter Katalog DE/TR/EN, kurz, ohne verbotene Wörter, jeder Laden-Bildschirm hat Fragen (26.10.2026)", () => {
  assert.ok(ZEKI_FRAGEN.length >= 40);
  const ids = new Set();
  for (const q of ZEKI_FRAGEN) {
    assert.ok(!ids.has(q.id), q.id); ids.add(q.id);
    for (const l of ["de", "tr", "en"]) {
      assert.ok(q[l]?.f && q[l]?.a, q.id + " " + l);
      assert.ok(q[l].a.split(/\s+/).length <= 30, q.id + " zu lang " + l);
      assert.ok(!VERBOTEN.test(q[l].f + q[l].a), q.id);
    }
  }
  for (const s of ["start", "muell", "kuehl", "putzplan", "karte", "abschluss", "buero"]) assert.ok(ZEKI_FRAGEN.filter((q) => q.schirm.includes(s)).length >= 3, s);
  const tr = zekiFragenFuer("kuehl", "tr"); assert.ok(tr.length >= 3 && tr.length <= 6 && tr[0].f && tr[0].a);
  assert.equal(zekiFragenFuer("unbekannt", "de").length, ZEKI_FRAGEN.filter((q) => q.schirm.includes("alle")).slice(0, 6).length);
});
