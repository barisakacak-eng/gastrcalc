import test from "node:test";
import assert from "node:assert/strict";
import { leererBetrieb } from "../js/store.js";
import { personalKontext } from "../js/screens/personal.js";
import { muellView, muellAktion, muellZuruecksetzen, muellZurueck, muellTipp, muellAnsicht } from "../js/screens/muell.js";
const laden = () => {
  const s = leererBetrieb(); s.phase = "app";
  s.gerichte = [{ id: "burger1", name: "Smash Burger", klasse: "haupt", preis: 9, zutaten: [] }];
  s.artikel = [{ name: "Burgerbrötchen", gruppe: "brot", einheit: "stk", packung: { menge: 10, einheit: "stk" }, preis: 3, benutzt: true }];
  return s;
};
test("Müll-Station ist wirklich Vollbild: weder Euro noch Laden-Navigation", () => {
  personalKontext({modus:"laden"}); muellZuruecksetzen();
  const s = laden();
  assert.match(muellView(s), /data-a="muell-station-auf"/);
  assert.equal(muellAktion("muell-station-auf",{},s),true);
  const h=muellView(s);
  assert.match(h, /class="inhalt muell-station"/);
  assert.match(h, /muell-station-hinweis/); // 24.10.2026: „Übrig geblieben“ statt Waage
  assert.match(h, /muell-station-raster/);
  assert.match(h, /data-a="muell-tipp"/);
  assert.doesNotMatch(h, /€|\bEUR\b/);
  assert.doesNotMatch(h, /data-a="nav"/);
  assert.ok(!h.includes('class="tableiste"'));
  assert.equal(muellAnsicht(),"station");
  assert.equal(muellAktion("muell-station-zu",{},s),true);
  assert.equal(muellAnsicht(),"start");
});
test("Station nutzt exakt dieselben Müll-Einträge und kehrt nach Mengenblatt zurück", () => {
  personalKontext({modus:"laden"}); muellZuruecksetzen();
  const s=laden(); muellAktion("muell-station-auf",{},s);
  const k = { dataset: { typ: "artikel", id: "", name: "Burgerbrötchen" } };
  const result=muellTipp(k,s);
  assert.ok(result?.eintrag && s.schwund.length===1);
  assert.match(muellView(s), /muelltoast/);
  assert.equal(muellAktion("muell-detail",k,s),true);
  assert.equal(muellAnsicht(),"eingabe");
  const detail=muellView(s);
  assert.match(detail, /muell-station-detail/);
  assert.doesNotMatch(detail, /€|\\bEUR\\b/);
  assert.doesNotMatch(detail, /class="tableiste"/);
  assert.equal(muellAktion("muell-start",{},s),true);
  assert.equal(muellAnsicht(),"station");
  assert.equal(muellZurueck(),true);
  assert.equal(muellAnsicht(),"start");
});

// Baris 24.10.2026: „Übrig geblieben“ ersetzt „Eimer wiegen“ – Tipp in der Station markiert den Eintrag, zählt einmal, Euro bleibt im Rechenwerk
import { muellTippEintragen } from "../js/muell.js";
test("Übrig geblieben: Eintrag aus der Station trägt uebrig: true, normaler Tipp nicht", () => {
  const s = laden(); const g = s.gerichte[0]; assert.ok(g, "Testladen hat ein Gericht");
  const a = muellTippEintragen(s, { typ: "gericht", id: g.id, name: g.name }, { datum: "2026-10-24", uebrig: true });
  const b = muellTippEintragen(s, { typ: "gericht", id: g.id, name: g.name }, { datum: "2026-10-24" });
  assert.equal(a.uebrig, true); assert.equal(b.uebrig, undefined);
  assert.equal(s.schwund.filter((e) => e.datum === "2026-10-24").length, 2, "keine Doppelzählung, zwei Tipps = zwei Einträge");
});
