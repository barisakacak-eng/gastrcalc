import { test } from "node:test";
import assert from "node:assert/strict";
import { parseZahl, heute, esc } from "../js/util.js";

test("parseZahl: deutsche Schreibweisen", () => {
  assert.equal(parseZahl("1.234,50"), 1234.5);
  assert.equal(parseZahl("3.600"), 3600);
  assert.equal(parseZahl("12,5"), 12.5);
  assert.equal(parseZahl("12.5"), 12.5);
  assert.equal(parseZahl("1.234.567"), 1234567);
  assert.equal(parseZahl(" 6 000 € "), 6000);
  assert.equal(parseZahl("30 %"), 30);
  assert.equal(parseZahl("0"), 0);
});
test("parseZahl: Unsinn wird abgelehnt", () => {
  for (const x of ["", "abc", "-5", "1e5", "0x10", "1,2,3", "1.2.3", null, undefined]) assert.equal(parseZahl(x), null, String(x));
});
test("heute: Ortszeit, nicht UTC", () => {
  assert.equal(heute(new Date(2026, 9, 10, 0, 30)), "2026-10-10");
});
test("esc: Attribute und Text bleiben dicht", () => {
  assert.equal(esc(`a"b<c>&'`), "a&quot;b&lt;c&gt;&amp;&#39;");
});

test("parseZahl: englische Schreibweise und Obergrenze", async () => {
  const { parseZahl } = await import("../js/util.js");
  assert.equal(parseZahl("1,234.56"), 1234.56);
  assert.equal(parseZahl("1.234,56"), 1234.56);
  assert.equal(parseZahl("1,5"), 1.5);
  assert.equal(parseZahl("3.600"), 3600);
  assert.equal(parseZahl("12.5"), 12.5);
  assert.equal(parseZahl("99999999999"), null);
  assert.equal(parseZahl("12,34,5"), null);
});
