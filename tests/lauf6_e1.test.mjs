// Lauf 6, Etappe 1: Aufräumen – vier Texte ohne Versprechen und mit richtiger Fundstelle
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

test("Midijob-Hinweis behauptet nicht mehr „meist teurer“", async () => {
  const { HM_HINWEISE: HM_REGELN } = await import("../js/hinweis_motor.js");
  const r = HM_REGELN.find((x) => x.id === "hm_midijob"); assert.ok(r); assert.doesNotMatch(r.genau, /teurer/); assert.match(r.genau, /Übergangsbereich/);
});
test("Zekis Hinweis-Satz verspricht kein Geld (de, tr, en, ar)", async () => {
  const { hmUi } = await import("../js/data/hm_texte.js");
  assert.equal(hmUi("de", "zekiGeld"), "Im Büro wartet ein Hinweis zu Geld und Pflichten.");
  for (const sp of ["de", "tr", "en", "ar", "fr"]) assert.doesNotMatch(hmUi(sp, "zekiGeld"), /bringen kann|bring you money|getirebilecek|يجلب/);
});
test("GWG-Hinweis ohne „abgesetzt“, Wächter kennt das Wort", async () => {
  const { HINWEISE, hinweisPruefen } = await import("../js/hinweis.js"); const { hinweisText } = await import("../js/data/hinweis_texte.js").catch(() => ({}));
  const g = HINWEISE.find((x) => x.id === "gwg"); assert.match(g.satz, /voll als Betriebsausgabe gelten/); assert.doesNotMatch(g.satz, /absetz|abgesetzt/);
  assert.ok(hinweisPruefen({ ...g, satz: g.satz.replace("als Betriebsausgabe gelten", "abgesetzt werden") }).length > 0, "Wächter muss „abgesetzt“ melden");
  for (const h of HINWEISE) assert.doesNotMatch(h.satz, /absetz|abgesetzt/, h.id);
});
test("Aufbewahrung nennt § 147 AO, nicht § 146a Abs. 1", async () => {
  const { HINWEISE } = await import("../js/hinweis.js"); const a = HINWEISE.find((x) => x.id === "aufbewahrung");
  assert.match(a.quelle, /§ 147 Abs\. 1 Nr\. 1, 4, 4a und Abs\. 3 AO/); assert.doesNotMatch(a.quelle, /146a/);
});
test("Arbeitsordner .claude ist nicht mehr eingecheckt", () => {
  assert.equal(execFileSync("git", ["ls-files", ".claude"], { encoding: "utf8" }).trim(), "");
});
